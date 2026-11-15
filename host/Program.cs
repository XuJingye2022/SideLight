using System;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program
{
    const string PIPE_NAME = "Sidelight.argv";
    const string APP_URL = "https://sidelight.local/index.html";
    const string DOC_KEY = "sidelight.doc.v1";

    static string baseDir = AppDomain.CurrentDomain.BaseDirectory;
    static string logPath = Path.Combine(baseDir, "host.log");
    static Form form;
    static WebView2 web;
    static Mutex heldMutex;
    static string scriptId;
    static string pendingFile;

    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Log("start args=" + string.Join(" | ", args));

        pendingFile = args.Length > 0 ? Resolve(args[0]) : null;

        // 单实例：优先全局命名对象，被拒绝时退回会话级。拿不到就把 argv 转给第一个实例。
        foreach (string candidate in new string[] { @"Global\Sidelight", @"Local\Sidelight" })
        {
            try
            {
                bool created;
                Mutex m = new Mutex(true, candidate, out created);
                if (created)
                {
                    heldMutex = m;
                    Log("primary mutex=" + candidate);
                    break;
                }
                m.Close();
                Log("secondary mutex=" + candidate);
                break;
            }
            catch (UnauthorizedAccessException)
            {
                Log("mutex denied " + candidate);
            }
            catch (Exception ex)
            {
                Log("mutex error " + candidate + " " + ex.Message);
            }
        }

        if (heldMutex == null)
        {
            Forward(pendingFile);
            Log("forwarded, exit");
            return;
        }

        form = new Form();
        form.Text = "Sidelight";
        form.Width = 1280;
        form.Height = 820;
        form.StartPosition = FormStartPosition.CenterScreen;
        form.BackColor = Color.White;

        web = new WebView2();
        web.Dock = DockStyle.Fill;
        form.Controls.Add(web);

        form.Load += delegate { InitWebView(); };
        form.Shown += delegate { StartPipeServer(); };
        form.FormClosed += delegate { Log("form closed"); };

        Application.Run(form);
        GC.KeepAlive(heldMutex);
        Log("exit");
    }

    static string Resolve(string arg)
    {
        try { return Path.GetFullPath(arg); }
        catch { return arg; }
    }

    static string ResolveUserDataDir()
    {
        try
        {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string dir = Path.Combine(Path.Combine(appData, "Sidelight"), "WebView2");
            Directory.CreateDirectory(dir);
            string probe = Path.Combine(dir, ".write-probe");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
            return dir;
        }
        catch (Exception ex)
        {
            Log("appdata unusable: " + ex.Message + " -> 退回 exe 同级 webview2-data");
            string fallback = Path.Combine(baseDir, "webview2-data");
            Directory.CreateDirectory(fallback);
            return fallback;
        }
    }

    static async void InitWebView()
    {
        try
        {
            string dataDir = ResolveUserDataDir();

            CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, dataDir, null);
            await web.EnsureCoreWebView2Async(env);
            Log("controller ready runtime=" + env.BrowserVersionString);

            CoreWebView2 core = web.CoreWebView2;
            core.PermissionRequested += OnPermissionRequested;
            core.NavigationCompleted += OnNavigationCompleted;
            core.ProcessFailed += delegate(object s, CoreWebView2ProcessFailedEventArgs e)
            {
                Log("process failed " + e.ProcessFailedKind);
            };

            string www = Path.Combine(baseDir, "www");
            if (!File.Exists(Path.Combine(www, "index.html")))
            {
                throw new FileNotFoundException("www/index.html 不存在，先用 host/build.ps1 复制 dist。", Path.Combine(www, "index.html"));
            }
            core.SetVirtualHostNameToFolderMapping(
                "sidelight.local", www, CoreWebView2HostResourceAccessKind.Allow);
            Log("mapping " + www);

            if (pendingFile != null && File.Exists(pendingFile))
            {
                string script = BuildArgvScript(pendingFile);
                scriptId = await core.AddScriptToExecuteOnDocumentCreatedAsync(script);
                Log("argv script added id=" + scriptId);
            }
            else if (pendingFile != null)
            {
                Log("argv file missing " + pendingFile);
            }

            core.Navigate(APP_URL);
            Log("navigate " + APP_URL);
        }
        catch (Exception ex)
        {
            Log("INIT-FAIL " + ex.ToString());
            MessageBox.Show("Sidelight 宿主启动失败：" + ex.Message, "Sidelight");
            form.Close();
        }
    }

    static void OnPermissionRequested(object sender, CoreWebView2PermissionRequestedEventArgs e)
    {
        Log("permission " + e.PermissionKind + " " + e.Uri);
        if (e.PermissionKind == CoreWebView2PermissionKind.FileReadWrite)
        {
            e.State = CoreWebView2PermissionState.Allow;
        }
    }

    static void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        Log("nav completed success=" + e.IsSuccess + " status=" + e.WebErrorStatus);
        // SDK 1.0.4314.35 的 .NET 投影只给了 AddScriptToExecuteOnDocumentCreatedAsync，
        // 没有 RemoveScriptToExecuteOnDocumentCreated 的 Async 包装（已查 dll 字符串表）。
        // 所以「只注入一次」靠注入脚本自己的 sessionStorage 守卫，验收用 sl:argv-runs 与导航次数证明。
    }

    // 只在首个顶层导航注入一次；重载后靠 sessionStorage 守卫直接返回，避免无限重载。
    static string BuildArgvScript(string path)
    {
        string text = File.ReadAllText(path, Encoding.UTF8);
        string b64text = Convert.ToBase64String(Encoding.UTF8.GetBytes(text));
        string b64name = Convert.ToBase64String(Encoding.UTF8.GetBytes(Path.GetFileName(path)));
        StringBuilder sb = new StringBuilder();
        sb.Append("(function(){try{");
        sb.Append("if(sessionStorage.getItem('sl:argv-done')==='1'){return;}");
        sb.Append("var n=parseInt(sessionStorage.getItem('sl:argv-runs')||'0',10)+1;");
        sb.Append("sessionStorage.setItem('sl:argv-runs',String(n));");
        sb.Append("function dec(b){var s=atob(b);var a=new Uint8Array(s.length);");
        sb.Append("for(var i=0;i<s.length;i++){a[i]=s.charCodeAt(i);}return new TextDecoder('utf-8').decode(a);}");
        sb.Append("localStorage.setItem('");
        sb.Append(DOC_KEY);
        sb.Append("',JSON.stringify({text:dec('");
        sb.Append(b64text);
        sb.Append("'),name:dec('");
        sb.Append(b64name);
        sb.Append("'),savedAt:0}));");
        sb.Append("sessionStorage.setItem('sl:argv-done','1');");
        sb.Append("location.reload();");
        sb.Append("}catch(e){}})();");
        return sb.ToString();
    }

    static void OpenFileIntoDoc(string path)
    {
        if (string.IsNullOrEmpty(path) || !File.Exists(path)) { Log("forward ignored " + path); return; }
        string text = File.ReadAllText(path, Encoding.UTF8);
        string b64text = Convert.ToBase64String(Encoding.UTF8.GetBytes(text));
        string b64name = Convert.ToBase64String(Encoding.UTF8.GetBytes(Path.GetFileName(path)));
        StringBuilder sb = new StringBuilder();
        sb.Append("(function(){try{function dec(b){var s=atob(b);var a=new Uint8Array(s.length);");
        sb.Append("for(var i=0;i<s.length;i++){a[i]=s.charCodeAt(i);}return new TextDecoder('utf-8').decode(a);}");
        sb.Append("localStorage.setItem('");
        sb.Append(DOC_KEY);
        sb.Append("',JSON.stringify({text:dec('");
        sb.Append(b64text);
        sb.Append("'),name:dec('");
        sb.Append(b64name);
        sb.Append("'),savedAt:0}));location.reload();}catch(e){}})();");
        web.CoreWebView2.ExecuteScriptAsync(sb.ToString());
        Log("forward applied " + path);
    }

    static void StartPipeServer()
    {
        Thread thread = new Thread(delegate()
        {
            while (true)
            {
                try
                {
                    using (NamedPipeServerStream server = new NamedPipeServerStream(
                        PIPE_NAME, PipeDirection.In, 1, PipeTransmissionMode.Byte, PipeOptions.None))
                    {
                        server.WaitForConnection();
                        StreamReader reader = new StreamReader(server, new UTF8Encoding(false));
                        string line = reader.ReadLine();
                        if (line != null && line.Trim().Length > 0)
                        {
                            string path = Encoding.UTF8.GetString(Convert.FromBase64String(line.Trim()));
                            Log("pipe received " + path);
                            if (form != null && !form.IsDisposed)
                            {
                                form.BeginInvoke((MethodInvoker)delegate { OpenFileIntoDoc(path); });
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log("pipe error " + ex.Message);
                    Thread.Sleep(500);
                }
            }
        });
        thread.IsBackground = true;
        thread.Start();
        Log("pipe server started");
    }

    static void Forward(string path)
    {
        string payload = path == null ? "" : path;
        try
        {
            for (int i = 0; i < 50; i++)
            {
                try
                {
                    using (NamedPipeClientStream client = new NamedPipeClientStream(".", PIPE_NAME, PipeDirection.Out))
                    {
                        client.Connect(100);
                        StreamWriter writer = new StreamWriter(client, new UTF8Encoding(false));
                        writer.WriteLine(Convert.ToBase64String(Encoding.UTF8.GetBytes(payload)));
                        writer.Flush();
                        Log("pipe sent " + payload);
                        return;
                    }
                }
                catch (TimeoutException) { Thread.Sleep(100); }
                catch (IOException) { Thread.Sleep(100); }
            }
            Log("pipe connect gave up");
        }
        catch (Exception ex)
        {
            Log("forward failed " + ex.Message);
        }
    }

    static void Log(string message)
    {
        try
        {
            File.AppendAllText(logPath, DateTime.Now.ToString("HH:mm:ss.fff") + " " + message + "\r\n", Encoding.UTF8);
        }
        catch
        {
            // 日志失败不影响宿主。
        }
    }
}

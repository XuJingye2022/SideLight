using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program
{
    const string PIPE_NAME = "Sidelight.argv";
    const int DEFAULT_PORT = 47821;
    const string DOC_KEY = "sidelight.doc.v1";

    static int port = DEFAULT_PORT;
    static string wwwRoot;
    static TcpListener listener;
    static string baseDir = AppDomain.CurrentDomain.BaseDirectory;
    static string logPath = Path.Combine(baseDir, "host.log");
    static Form form;
    static WebView2 web;
    static Mutex heldMutex;
    static string scriptId;
    static string pendingFile;

    // 转发队列：WebView2 没就绪或正在导航时收到的路径先排队，导航完成后重放。
    static readonly Queue<string> forwardQueue = new Queue<string>();
    static bool navReady;
    static bool portableDataDir;
    static string fatalInitError;

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

        string www = Path.Combine(baseDir, "www");
        if (!File.Exists(Path.Combine(www, "index.html")))
        {
            Log("startup failed reason=no-www path=" + Path.Combine(www, "index.html"));
            RunErrorForm("缺少运行文件 www/index.html。请重新解压完整的 zip。日志：" + logPath);
            return;
        }

        StartLoopback(www);

        string dataDir = ResolveUserDataDir();
        if (dataDir == null)
        {
            RunErrorForm("无法创建 WebView2 数据目录。请把程序放到可写目录，或检查 %LOCALAPPDATA% 与 %TEMP% 的权限。日志：" + logPath);
            return;
        }

        form = new Form();
        form.Text = portableDataDir ? "Sidelight（便携数据目录）" : "Sidelight";
        form.Width = 1280;
        form.Height = 820;
        form.StartPosition = FormStartPosition.CenterScreen;
        form.BackColor = Color.White;
        try
        {
            string iconFile = Path.Combine(baseDir, "sidelight.ico");
            if (File.Exists(iconFile)) form.Icon = new Icon(iconFile);
        }
        catch (Exception)
        {
            // 图标坏了不挡启动，退回默认图标。
        }

        web = new WebView2();
        web.Dock = DockStyle.Fill;
        form.Controls.Add(web);

        form.Load += delegate { InitWebView(www, dataDir); };
        form.Shown += delegate { StartPipeServer(); };
        form.FormClosed += delegate { Log("form closed"); };

        Application.Run(form);
        GC.KeepAlive(heldMutex);
        if (fatalInitError != null)
        {
            RunErrorForm(fatalInitError);
        }
        Log("exit");
    }

    // 长路径：已是 \\?\ 前缀原样返回；否则先求绝对路径，长度 ≥240 时加 \\?\ 前缀。
    // 依赖 Sidelight.exe.config 的 UseLegacyPathHandling=false / BlockLongPaths=false，
    // 以及 app.manifest 的 longPathAware=true（不带前缀的 300 字符路径也靠它）。
    static string Resolve(string arg)
    {
        if (arg.StartsWith(@"\\?\")) return arg;
        string full;
        try { full = Path.GetFullPath(arg); }
        catch { full = arg; }
        if (full.Length >= 240 && !full.StartsWith(@"\\?\")) return @"\\?\" + full;
        return full;
    }

    static readonly Dictionary<string, string> MimeMap = BuildMimeMap();

    static Dictionary<string, string> BuildMimeMap()
    {
        Dictionary<string, string> map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        map[".html"] = "text/html; charset=utf-8";
        map[".css"] = "text/css; charset=utf-8";
        map[".js"] = "text/javascript; charset=utf-8";
        map[".woff2"] = "font/woff2";
        map[".svg"] = "image/svg+xml";
        map[".png"] = "image/png";
        map[".ico"] = "image/x-icon";
        map[".json"] = "application/json; charset=utf-8";
        return map;
    }

    // 固定回环端口：origin 恒定，localStorage 才能跨启动保留；端口被占就失败，不换端口、不回退虚拟主机。
    static void StartLoopback(string wwwPath)
    {
        wwwRoot = wwwPath;
        string overridePort = Environment.GetEnvironmentVariable("SIDELIGHT_PORT");
        int parsed;
        if (!string.IsNullOrEmpty(overridePort) && int.TryParse(overridePort, out parsed) && parsed > 0 && parsed < 65536)
        {
            port = parsed;
            Log("loopback port override " + port);
        }
        try
        {
            listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
        }
        catch (Exception ex)
        {
            Log("loopback port busy " + port + " " + ex.Message);
            RunErrorForm("端口 " + port + " 被占用，请关闭占用它的程序后重开。日志：" + logPath);
            return;
        }
        Thread thread = new Thread(AcceptLoop);
        thread.IsBackground = true;
        thread.Start();
        Log("loopback listening http://127.0.0.1:" + port + "/ www=" + wwwRoot);
    }

    static void AcceptLoop()
    {
        while (true)
        {
            try
            {
                TcpClient client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(delegate(object state) { HandleClient((TcpClient)state); }, client);
            }
            catch (Exception ex)
            {
                Log("loopback accept failed " + ex.Message);
                Thread.Sleep(200);
            }
        }
    }

    static void HandleClient(TcpClient client)
    {
        try
        {
            using (client)
            using (NetworkStream stream = client.GetStream())
            {
                client.ReceiveTimeout = 5000;
                StreamReader reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true);
                string requestLine = reader.ReadLine();
                if (string.IsNullOrEmpty(requestLine)) return;
                int guard = 0;
                string headerLine;
                while (guard++ < 100 && !string.IsNullOrEmpty(headerLine = reader.ReadLine())) { }

                string[] parts = requestLine.Split(' ');
                if (parts.Length < 2)
                {
                    WriteResponse(stream, 400, null, null, false);
                    return;
                }
                string method = parts[0].ToUpperInvariant();
                string target = parts[1];
                bool head = method == "HEAD";
                if (method != "GET" && !head)
                {
                    Log("loopback refused path=" + target + " reason=method");
                    WriteResponse(stream, 405, null, null, head);
                    return;
                }

                int query = target.IndexOf('?');
                if (query >= 0) target = target.Substring(0, query);
                if (target.Length == 0 || target == "/") target = "/index.html";

                string decoded;
                try { decoded = Uri.UnescapeDataString(target); }
                catch (Exception)
                {
                    Log("loopback refused path=" + target + " reason=bad-escape");
                    WriteResponse(stream, 400, null, null, head);
                    return;
                }

                string reason = null;
                if (decoded.IndexOf('\\') >= 0) reason = "backslash";
                else if (decoded.IndexOf("..", StringComparison.Ordinal) >= 0) reason = "dotdot";
                else if (decoded.IndexOf(':') >= 0) reason = "drive-or-colon";
                else if (decoded.StartsWith("//")) reason = "unc";
                if (reason != null)
                {
                    Log("loopback refused path=" + target + " reason=" + reason);
                    WriteResponse(stream, 403, null, null, head);
                    return;
                }

                string rel = decoded.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                string full;
                try { full = Path.GetFullPath(Path.Combine(wwwRoot, rel)); }
                catch (Exception)
                {
                    Log("loopback refused path=" + target + " reason=bad-path");
                    WriteResponse(stream, 400, null, null, head);
                    return;
                }
                string rootFull = Path.GetFullPath(wwwRoot);
                string prefix = rootFull.EndsWith(Path.DirectorySeparatorChar.ToString())
                    ? rootFull
                    : rootFull + Path.DirectorySeparatorChar;
                if (!full.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    Log("loopback refused path=" + target + " reason=outside-root");
                    WriteResponse(stream, 403, null, null, head);
                    return;
                }

                string mime;
                if (!MimeMap.TryGetValue(Path.GetExtension(full), out mime))
                {
                    Log("loopback refused path=" + target + " reason=extension");
                    WriteResponse(stream, 404, null, null, head);
                    return;
                }
                if (!File.Exists(full))
                {
                    WriteResponse(stream, 404, null, null, head);
                    return;
                }

                byte[] body = File.ReadAllBytes(full);
                WriteResponse(stream, 200, mime, body, head);
            }
        }
        catch (Exception ex)
        {
            Log("loopback handler failed " + ex.Message);
        }
    }

    static void WriteResponse(NetworkStream stream, int status, string mime, byte[] body, bool headOnly)
    {
        string reason = "Error";
        if (status == 200) reason = "OK";
        else if (status == 400) reason = "Bad Request";
        else if (status == 403) reason = "Forbidden";
        else if (status == 404) reason = "Not Found";
        else if (status == 405) reason = "Method Not Allowed";
        StringBuilder sb = new StringBuilder();
        sb.Append("HTTP/1.1 " + status + " " + reason + "\r\n");
        if (mime != null) sb.Append("Content-Type: " + mime + "\r\n");
        sb.Append("Content-Length: " + (body == null ? 0 : body.Length) + "\r\n");
        sb.Append("Connection: close\r\n");
        sb.Append("Cache-Control: no-store\r\n");
        sb.Append("\r\n");
        byte[] head = Encoding.ASCII.GetBytes(sb.ToString());
        stream.Write(head, 0, head.Length);
        if (!headOnly && body != null && body.Length > 0) stream.Write(body, 0, body.Length);
        stream.Flush();
    }
    static string TryDataDir(string dir)
    {
        string probe = null;
        try
        {
            Directory.CreateDirectory(dir);
            probe = Path.Combine(dir, ".probe-" + Guid.NewGuid().ToString("N"));
            File.WriteAllText(probe, "ok");
            return dir;
        }
        catch (Exception ex)
        {
            Log("data dir candidate failed " + dir + " " + ex.Message);
            return null;
        }
        finally
        {
            if (probe != null)
            {
                try { File.Delete(probe); } catch { }
            }
        }
    }

    // 顺序：%LOCALAPPDATA% → %TEMP% → exe 同级（便携）。全失败返回 null，由调用方给错误窗。
    static string ResolveUserDataDir()
    {
        string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string temp = Path.GetTempPath();
        string[] candidates = new string[]
        {
            Path.Combine(Path.Combine(appData, "Sidelight"), "WebView2"),
            Path.Combine(Path.Combine(temp, "Sidelight"), "WebView2"),
            Path.Combine(baseDir, "webview2-data")
        };
        for (int i = 0; i < candidates.Length; i++)
        {
            string ok = TryDataDir(candidates[i]);
            if (ok != null)
            {
                string kind = i == 0 ? "localappdata" : (i == 1 ? "temp" : "portable");
                portableDataDir = i == 2;
                Log("data dir=" + ok + " kind=" + kind);
                return ok;
            }
        }
        Log("data dir FAILED tried=" + string.Join(" | ", candidates));
        return null;
    }

    static string SafeFileName(string path)
    {
        try
        {
            string name = Path.GetFileName(path);
            if (!string.IsNullOrEmpty(name)) return name;
        }
        catch { }
        int cut = path.LastIndexOfAny(new char[] { '\\', '/' });
        return cut >= 0 && cut + 1 < path.Length ? path.Substring(cut + 1) : path;
    }

    // 启动前置失败：不显示主窗，直接进错误窗。关闭或 8 s 看门狗到点都 exit 1。
    static void RunErrorForm(string message)
    {
        Log("error form: " + message);
        Form error = new Form();
        error.Text = "Sidelight 启动失败";
        error.Width = 640;
        error.Height = 260;
        error.StartPosition = FormStartPosition.CenterScreen;
        Label label = new Label();
        label.Text = message;
        label.Dock = DockStyle.Fill;
        label.Padding = new Padding(16);
        error.Controls.Add(label);
        System.Windows.Forms.Timer watchdog = new System.Windows.Forms.Timer();
        watchdog.Interval = 8000;
        watchdog.Tick += delegate
        {
            Log("error form watchdog fired");
            watchdog.Stop();
            error.Close();
        };
        error.Shown += delegate { watchdog.Start(); };
        error.FormClosed += delegate { watchdog.Stop(); Log("error form closed"); };
        Application.Run(error);
        Log("exit code 1 (error form)");
        Environment.Exit(1);
    }
    static async void InitWebView(string www, string dataDir)
    {
        try
        {

            CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, dataDir, null);
            await web.EnsureCoreWebView2Async(env);
            Log("controller ready runtime=" + env.BrowserVersionString);

            CoreWebView2 core = web.CoreWebView2;
            try
            {
                string dlDir = Environment.GetEnvironmentVariable("SIDELIGHT_DOWNLOAD_DIR");
                if (string.IsNullOrEmpty(dlDir)) dlDir = ResolveDownloadDir();
                core.Profile.DefaultDownloadFolderPath = dlDir;
                Log("default download dir=" + dlDir);
            }
            catch (Exception ex)
            {
                Log("default download dir failed " + ex.Message);
            }
            core.PermissionRequested += OnPermissionRequested;
            core.DownloadStarting += OnDownloadStarting;
            core.NavigationStarting += OnNavigationStarting;
            core.NavigationCompleted += OnNavigationCompleted;
            core.ProcessFailed += delegate(object s, CoreWebView2ProcessFailedEventArgs e)
            {
                Log("process failed " + e.ProcessFailedKind);
            };




            if (pendingFile != null && File.Exists(pendingFile))
            {
                string script = BuildApplyScript(File.ReadAllText(pendingFile, Encoding.UTF8), Path.GetFileName(pendingFile), true);
                scriptId = await core.AddScriptToExecuteOnDocumentCreatedAsync(script);
                Log("argv script added id=" + scriptId);
            }
            else if (pendingFile != null)
            {
                string reason = pendingFile.Length >= 240 ? "too-long" : "missing";
                Log("open failed path=" + pendingFile + " reason=" + reason);
                form.Text = "Sidelight — 打不开：" + SafeFileName(pendingFile);
            }

            string appUrl = "http://127.0.0.1:" + port + "/index.html";
            core.Navigate(appUrl);
            Log("navigate " + appUrl);
        }
        catch (Exception ex)
        {
            Log("INIT-FAIL " + ex.ToString());
            fatalInitError = "Sidelight 启动失败：无法创建 WebView2 环境。" + ex.Message + " 日志：" + logPath;
            try { form.Close(); } catch { }
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

    static string lastDownloadDir;

    static string ResolveDownloadDir()
    {
        if (!string.IsNullOrEmpty(lastDownloadDir) && Directory.Exists(lastDownloadDir)) return lastDownloadDir;
        try
        {
            string downloads = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
            if (Directory.Exists(downloads)) return downloads;
        }
        catch (Exception) { }
        return baseDir;
    }

    // 下载落点：测试用 SIDELIGHT_DOWNLOAD_DIR 指定目录；否则同步弹 SaveFileDialog（UI/STA 线程）。
    // 两条分支都必须 Handled = true，否则 WebView2 会再弹它自己的下载 UI。
    // 文件名取 GetFileName(SuggestedFileName)，避免页面给的名字带路径越界。
    static void OnDownloadStarting(object sender, CoreWebView2DownloadStartingEventArgs e)
    {
        try
        {
            // SDK 1.0.4314.35 的 DownloadStarting 没有 SuggestedFileName；默认 ResultFilePath
            // 就是「下载目录 + 建议文件名」，取它的 basename 同样能防路径越界。
            string suggested = e.ResultFilePath;
            string name = string.IsNullOrEmpty(suggested) ? "download.bin" : Path.GetFileName(suggested);
            if (string.IsNullOrEmpty(name)) name = "download.bin";

            string dir = Environment.GetEnvironmentVariable("SIDELIGHT_DOWNLOAD_DIR");
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
                lastDownloadDir = dir;
                e.ResultFilePath = Path.Combine(dir, name);
                e.Handled = true;
                Log("download starting name=" + name + " result=" + e.ResultFilePath + " handled=true mode=env");
                try
                {
                    CoreWebView2DownloadOperation op = e.DownloadOperation;
                    op.StateChanged += delegate(object s2, object e2)
                    {
                        Log("download state=" + op.State + " reason=" + op.InterruptReason + " bytes=" + op.BytesReceived + " path=" + op.ResultFilePath);
                    };
                }
                catch (Exception ex2)
                {
                    Log("download state hook failed " + ex2.Message);
                }
                return;
            }

            using (SaveFileDialog dialog = new SaveFileDialog())
            {
                dialog.FileName = name;
                dialog.InitialDirectory = ResolveDownloadDir();
                dialog.OverwritePrompt = true;
                DialogResult answer = dialog.ShowDialog(form);
                if (answer != DialogResult.OK)
                {
                    e.Handled = true;
                    e.Cancel = true;
                    Log("download cancelled name=" + name + " handled=true");
                    return;
                }
                lastDownloadDir = Path.GetDirectoryName(dialog.FileName);
                e.ResultFilePath = dialog.FileName;
                e.Handled = true;
                Log("download starting name=" + name + " result=" + dialog.FileName + " handled=true mode=dialog");
            }
        }
        catch (Exception ex)
        {
            Log("download failed " + ex.Message);
            try { e.Handled = true; e.Cancel = true; } catch (Exception) { }
        }
    }

    static void OnNavigationStarting(object sender, CoreWebView2NavigationStartingEventArgs e)
    {
        navReady = false;
        Log("navigation starting " + e.Uri);
    }

    static void OnNavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        Log("nav completed success=" + e.IsSuccess + " status=" + e.WebErrorStatus);
        if (!e.IsSuccess)
        {
            if (forwardQueue.Count > 0) Log("forward deferred count=" + forwardQueue.Count);
            return;
        }
        navReady = true;
        if (forwardQueue.Count == 0) return;
        // 只应用最后一个路径：reload 期间连续转发时，用户想要的是最后那一份。
        string next = null;
        while (forwardQueue.Count > 0) next = forwardQueue.Dequeue();
        Log("forward drained " + next);
        ApplyForwardAsync(next);
    }

    // 只在首个顶层导航注入一次；重载后靠 sessionStorage 守卫直接返回，避免无限重载。
    static string BuildApplyScript(string text, string name, bool oneShotGuard)
    {
        string b64text = Convert.ToBase64String(Encoding.UTF8.GetBytes(text));
        string b64name = Convert.ToBase64String(Encoding.UTF8.GetBytes(name));
        StringBuilder sb = new StringBuilder();
        sb.Append("(function(){try{");
        if (oneShotGuard)
        {
            sb.Append("if(sessionStorage.getItem('sl:argv-done')==='1'){return;}");
            sb.Append("var n=parseInt(sessionStorage.getItem('sl:argv-runs')||'0',10)+1;");
            sb.Append("sessionStorage.setItem('sl:argv-runs',String(n));");
        }
        sb.Append("function dec(b){var s=atob(b);var a=new Uint8Array(s.length);");
        sb.Append("for(var i=0;i<s.length;i++){a[i]=s.charCodeAt(i);}return new TextDecoder('utf-8').decode(a);}");
        sb.Append("localStorage.setItem('");
        sb.Append(DOC_KEY);
        sb.Append("',JSON.stringify({text:dec('");
        sb.Append(b64text);
        sb.Append("'),name:dec('");
        sb.Append(b64name);
        sb.Append("'),savedAt:0,readOnly:true}));");
        if (oneShotGuard) sb.Append("sessionStorage.setItem('sl:argv-done','1');");
        sb.Append("location.reload();");
        sb.Append("}catch(e){}})();");
        return sb.ToString();
    }

    static void EnqueueForward(string path)
    {
        if (form == null || form.IsDisposed) return;
        try
        {
            form.BeginInvoke((MethodInvoker)delegate { EnqueueForwardOnUi(path); });
        }
        catch (Exception ex)
        {
            Log("forward failed enqueue " + ex.Message);
        }
    }

    static void EnqueueForwardOnUi(string path)
    {
        if (string.IsNullOrEmpty(path) || !File.Exists(path)) { Log("forward ignored " + path); return; }
        if (!navReady)
        {
            if (forwardQueue.Contains(path)) { Log("forward duplicate queued " + path); return; }
            forwardQueue.Enqueue(path);
            Log("forward queued " + path);
            return;
        }
        ApplyForwardAsync(path);
    }

    // 页面的 __slState 由前端挂载后才存在；导航完成到 React 挂载之间有一个小窗口。
    static async Task<string> ReadDirtyAsync()
    {
        CoreWebView2 core = web == null ? null : web.CoreWebView2;
        if (core == null) { Log("forward dirty=unknown webview null"); return "unknown"; }
        for (int i = 0; i < 30; i++)
        {
            try
            {
                string type = await core.ExecuteScriptAsync("typeof window.__slState");
                if (type == "\"object\"") break;
            }
            catch (Exception)
            {
                // 页面还没加载完时会抛，继续等。
            }
            await Task.Delay(100);
        }
        try
        {
            string raw = await core.ExecuteScriptAsync("(window.__slState===undefined?-1:(window.__slState.dirty?1:0))");
            if (raw == "1") return "1";
            if (raw == "0") return "0";
            Log("forward dirty=unknown raw=" + raw);
            return "unknown";
        }
        catch (Exception ex)
        {
            Log("forward dirty=unknown " + ex.Message);
            return "unknown";
        }
    }

    #pragma warning disable 4014
    static async void ApplyForwardAsync(string path)
    {
        try
        {
            string dirty = await ReadDirtyAsync();
            if (dirty == "0")
            {
                Log("forward dirty=0 " + path);
            }
            else
            {
                Log("forward dirty=" + dirty + " " + path);
                string name = Path.GetFileName(path);
                DialogResult answer = MessageBox.Show(
                    "当前文档有未保存的改动。打开 " + name + " 会替换它。",
                    "Sidelight",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning,
                    MessageBoxDefaultButton.Button2);
                if (answer != DialogResult.Yes)
                {
                    Log("forward cancelled " + path);
                    return;
                }
                Log("forward confirmed " + path);
            }

            string text = File.ReadAllText(path, Encoding.UTF8);
            string script = BuildApplyScript(text, Path.GetFileName(path), false);
            Task exec = web.CoreWebView2.ExecuteScriptAsync(script);
            exec.ContinueWith(delegate(Task prev)
            {
                if (prev.IsFaulted) Log("forward failed exec " + prev.Exception.GetBaseException().Message);
            });
            Log("forward applied " + path);
        }
        catch (Exception ex)
        {
            Log("forward failed " + ex.Message);
        }
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
                            EnqueueForward(path);
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

#pragma warning restore 4014
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

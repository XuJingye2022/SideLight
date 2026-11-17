using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
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
    static bool argvOpened;
    static bool portableDataDir;
    static string fatalInitError;

    // 页面 requestFullscreen（F11）时 WebView2 只报告「里面有全屏元素」，窗口本身要宿主自己进全屏。
    static bool hostFullScreen;
    static FormWindowState savedWindowState = FormWindowState.Normal;
    static Rectangle savedWindowBounds = Rectangle.Empty;

    // /__doc 与写回：只认 argv / 单实例转发打开的这一个文件；页面永远拿不到路径。
    static string currentPath;
    static DocMeta currentMeta;
    static int currentDocErrorStatus;
    static string currentDocErrorCode;
    static readonly Dictionary<string, string> saveResults = new Dictionary<string, string>();
    static readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 64 * 1024 * 1024 };

    // 关窗三选一：await 页面 dirty 后问一次；closePending 防重入，5 s 无答案只保留窗口。
    static Form mainForm;
    static bool closeConfirmed;
    static bool closePending;
    static System.Windows.Forms.Timer closeTimer;
    static readonly System.Text.RegularExpressions.Regex UnsafeKey =
        new System.Text.RegularExpressions.Regex(@"[^a-zA-Z0-9\u4e00-\u9fa5_-]");

    // 最近打开：状态目录、recent.json、内存表；页面只拿哈希 id，不拿路径。
    class RecentItem
    {
        public string Id;
        public string Path;
        public string Name;
        public string Dir;
        public long Seq;
        public long OpenedAt;
        public long Size;
        public long Mtime;
    }

    static string stateDir;
    static string stateKind = "none";
    static string recentPath;
    static List<RecentItem> recentItems = new List<RecentItem>();
    static long recentSeq;
    static List<RecentItem> recentSnapshot;
    static string recentLastError;

    [STAThread]
    static void Main(string[] args)
    {
        if (args.Length == 1 && args[0] == "--version")
        {
            Version v = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version;
            Console.Out.WriteLine(v.Major + "." + v.Minor + "." + v.Build);
            return;
        }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        MigrateLog();
        InitState();
        Log("start args=" + string.Join(" | ", Array.ConvertAll(args, new Converter<string, string>(LogPath))));

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
                    if (pendingFile != null) SetCurrentDoc(pendingFile);
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
            Log("startup failed reason=no-www file=" + LogPath(Path.Combine(www, "index.html")));
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
        mainForm = form;
        form.FormClosing += OnFormClosing;
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
        // `/__asset` 要回源的位图（第 57 轮 B-004）：不补这几种，单文件打开的 jpg/webp 只能 404
        map[".jpg"] = "image/jpeg";
        map[".jpeg"] = "image/jpeg";
        map[".webp"] = "image/webp";
        map[".gif"] = "image/gif";
        map[".bmp"] = "image/bmp";
        return map;
    }

    // `/__asset` 只发这几种位图：SVG 能在宿主 origin 里跑脚本，不给它开口子
    static readonly HashSet<string> AssetImageExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp",
    };

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
        Log("loopback listening port=" + port);
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
                string host = null;
                while (guard++ < 100 && !string.IsNullOrEmpty(headerLine = reader.ReadLine()))
                {
                    if (headerLine.StartsWith("Host:", StringComparison.OrdinalIgnoreCase))
                    {
                        host = headerLine.Substring(5).Trim();
                    }
                }

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
                string rawTarget = target;
                if (query >= 0) target = target.Substring(0, query);
                if (target == "/__doc")
                {
                    HandleDocRequest(stream, method, host);
                    return;
                }
                if (target == "/__asset")
                {
                    // 要原始 target：`path` 里的 `/` 已经过百分号编码，截掉 query 就拿不到
                    HandleAssetRequest(stream, method, host, rawTarget);
                    return;
                }
                if (target == "/__draft")
                {
                    HandleDraftRequest(stream, method, host);
                    return;
                }
                if (target == "/__recent")
                {
                    HandleRecentRequest(stream, method, host);
                    return;
                }
                if (target == "/__annotations")
                {
                    HandleAnnotationsRequest(stream, method, host);
                    return;
                }
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

    class DocException : Exception
    {
        public int Status;
        public string Code;
        public DocException(int status, string code) : base(code) { Status = status; Code = code; }
    }

    class DocMeta
    {
        public string Encoding;
        public bool Bom;
        public string Eol;
        public bool EndsWithNewline;
        public int LineCount;
        public long Size;
        public long Mtime;
        public string Text;
        public string[] LineEols;
    }

    static readonly Encoding StrictUtf8 = new UTF8Encoding(false, true);
    static readonly Encoding StrictGbk = Encoding.GetEncoding(936, EncoderFallback.ExceptionFallback, DecoderFallback.ExceptionFallback);

    static byte[] BuildErrorJson(string code)
    {
        Dictionary<string, object> msg = new Dictionary<string, object>();
        msg["v"] = 1;
        msg["ok"] = false;
        msg["error"] = code;
        return Encoding.UTF8.GetBytes(json.Serialize(msg));
    }

    static string EncodeError(string id, string error)
    {
        Dictionary<string, object> msg = new Dictionary<string, object>();
        msg["v"] = 1;
        msg["type"] = "save-result";
        msg["id"] = id;
        msg["ok"] = false;
        msg["error"] = error;
        return json.Serialize(msg);
    }

    static string EncodeOk(string id, long bytes, long mtime)
    {
        Dictionary<string, object> msg = new Dictionary<string, object>();
        msg["v"] = 1;
        msg["type"] = "save-result";
        msg["id"] = id;
        msg["ok"] = true;
        msg["bytes"] = bytes;
        msg["mtime"] = mtime;
        return json.Serialize(msg);
    }

    // 打开（argv 或转发）时抓一份 LF 文本与元数据：写回时以它做「不改不写」与 EOL/mtime 基准。
    static void SetCurrentDoc(string path)
    {
        currentPath = path;
        currentMeta = null;
        currentDocErrorCode = null;
        currentDocErrorStatus = 0;
        saveResults.Clear();
        try
        {
            currentMeta = ReadDocMeta(path);
            Log("doc open file=" + SafeFileName(path) + " encoding=" + currentMeta.Encoding + " eol=" + currentMeta.Eol + " size=" + currentMeta.Size);
        }
        catch (DocException ex)
        {
            currentDocErrorStatus = ex.Status;
            currentDocErrorCode = ex.Code;
            Log("doc open failed file=" + SafeFileName(path) + " error=" + ex.Code);
        }
        catch (Exception ex)
        {
            currentDocErrorStatus = 500;
            currentDocErrorCode = "IO";
            Log("doc open failed " + ex.GetType().Name);
        }
    }

    static DocMeta ReadDocMeta(string path)
    {
        string resolved = Resolve(path);
        if (Directory.Exists(resolved)) throw new DocException(409, "FILE_GONE");
        byte[] bytes;
        try { bytes = File.ReadAllBytes(resolved); }
        catch (FileNotFoundException) { throw new DocException(409, "FILE_GONE"); }
        catch (DirectoryNotFoundException) { throw new DocException(409, "FILE_GONE"); }
        catch (UnauthorizedAccessException) { throw new DocException(409, "FILE_GONE"); }
        catch (IOException) { throw new DocException(409, "FILE_GONE"); }
        if (bytes.Length > 32L * 1024 * 1024) throw new DocException(413, "TOO_LARGE");

        DocMeta meta = new DocMeta();
        meta.Size = bytes.Length;
        meta.Bom = false;
        string text;
        if (bytes.Length >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF)
        {
            meta.Encoding = "utf-8";
            meta.Bom = true;
            text = DecodeStrict(StrictUtf8, bytes, 3);
        }
        else if (bytes.Length >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE)
        {
            meta.Encoding = "utf-16le";
            meta.Bom = true;
            text = DecodeStrict(new UnicodeEncoding(false, false, true), bytes, 2);
        }
        else if (bytes.Length >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF)
        {
            meta.Encoding = "utf-16be";
            meta.Bom = true;
            text = DecodeStrict(new UnicodeEncoding(true, false, true), bytes, 2);
        }
        else
        {
            try
            {
                text = StrictUtf8.GetString(bytes);
                meta.Encoding = "utf-8";
            }
            catch (DecoderFallbackException)
            {
                try
                {
                    text = StrictGbk.GetString(bytes);
                    meta.Encoding = "gbk";
                }
                catch (DecoderFallbackException)
                {
                    throw new DocException(409, "ENCODING");
                }
            }
        }
        if (text.IndexOf('\u0000') >= 0) throw new DocException(409, "ENCODING");

        List<string> lineEols = new List<string>();
        for (int index = 0; index < text.Length; index++)
        {
            if (text[index] != '\n') continue;
            lineEols.Add(index > 0 && text[index - 1] == '\r' ? "crlf" : "lf");
        }
        int crlfCount = 0;
        foreach (string eol in lineEols) if (eol == "crlf") crlfCount++;
        meta.LineEols = lineEols.ToArray();
        if (crlfCount > 0 && crlfCount < lineEols.Count) meta.Eol = "mixed";
        else if (crlfCount > 0) meta.Eol = "crlf";
        else meta.Eol = "lf";
        meta.EndsWithNewline = text.EndsWith("\n");
        meta.Text = text.Replace("\r\n", "\n");
        meta.LineCount = meta.Text.Split('\n').Length;
        meta.Mtime = File.GetLastWriteTimeUtc(resolved).Ticks;
        return meta;
    }

    static string DecodeStrict(Encoding encoding, byte[] bytes, int offset)
    {
        try { return encoding.GetString(bytes, offset, bytes.Length - offset); }
        catch (DecoderFallbackException) { throw new DocException(409, "ENCODING"); }
    }

    static byte[] BuildDocJson(DocMeta meta)
    {
        Dictionary<string, object> doc = new Dictionary<string, object>();
        doc["v"] = 1;
        doc["ok"] = true;
        doc["fileName"] = SafeFileName(currentPath);
        doc["encoding"] = meta.Encoding;
        doc["bom"] = meta.Bom;
        doc["eol"] = meta.Eol;
        doc["endsWithNewline"] = meta.EndsWithNewline;
        doc["lineCount"] = meta.LineCount;
        doc["size"] = meta.Size;
        doc["mtime"] = meta.Mtime;
        try { doc["readOnly"] = (File.GetAttributes(Resolve(currentPath)) & FileAttributes.ReadOnly) != 0; }
        catch (Exception) { doc["readOnly"] = true; }
        doc["text"] = meta.Text;
        return Encoding.UTF8.GetBytes(json.Serialize(doc));
    }

    // GET /__doc：只认 127.0.0.1:47821 的 Host；不返回完整路径，不加 CORS 头。
    static void HandleDocRequest(NetworkStream stream, string method, string host)
    {
        if (method != "GET")
        {
            WriteResponse(stream, 405, null, null, false);
            return;
        }
        if (!string.Equals(host, "127.0.0.1:" + port, StringComparison.OrdinalIgnoreCase))
        {
            Log("doc refused reason=host host=" + host);
            WriteResponse(stream, 403, null, null, false);
            return;
        }
        byte[] body;
        int status = 200;
        if (currentPath == null)
        {
            status = 404;
            body = BuildErrorJson("NO_DOC");
        }
        else if (currentDocErrorCode != null)
        {
            status = currentDocErrorStatus > 0 ? currentDocErrorStatus : 409;
            body = BuildErrorJson(currentDocErrorCode);
        }
        else
        {
            body = BuildDocJson(currentMeta);
        }
        WriteResponse(stream, status, "application/json; charset=utf-8", body, false);
    }

    // 从原始请求目标里取查询参数：不做解码，交给调用方统一 UnescapeDataString
    static string QueryParam(string target, string name)
    {
        int query = target.IndexOf('?');
        if (query < 0) return null;
        foreach (string pair in target.Substring(query + 1).Split('&'))
        {
            int eq = pair.IndexOf('=');
            if (eq <= 0) continue;
            if (!string.Equals(pair.Substring(0, eq), name, StringComparison.OrdinalIgnoreCase)) continue;
            return pair.Substring(eq + 1);
        }
        return null;
    }

    // GET /__asset?path=assets%2F%E5%9B%BE%201.jpg：宿主单文件打开时没有目录句柄，
    // 正文里的相对图由这里回源。只从「当前文档所在目录」往下取图，与 /__doc 同一套 Host 校验；
    // 不加 CORS 头、不回完整路径、不缓存（WriteResponse 统一 no-store）。
    static void HandleAssetRequest(NetworkStream stream, string method, string host, string rawTarget)
    {
        bool head = method == "HEAD";
        if (method != "GET" && !head)
        {
            WriteResponse(stream, 405, null, null, head);
            return;
        }
        if (!string.Equals(host, "127.0.0.1:" + port, StringComparison.OrdinalIgnoreCase))
        {
            Log("asset refused reason=host host=" + host);
            WriteResponse(stream, 403, null, null, head);
            return;
        }
        if (currentPath == null)
        {
            WriteResponse(stream, 404, null, null, head);
            return;
        }
        string raw = QueryParam(rawTarget, "path");
        if (raw == null)
        {
            Log("asset refused reason=no-path");
            WriteResponse(stream, 400, null, null, head);
            return;
        }
        string rel;
        try { rel = Uri.UnescapeDataString(raw); }
        catch (Exception)
        {
            Log("asset refused reason=bad-escape");
            WriteResponse(stream, 400, null, null, head);
            return;
        }
        string reason = null;
        if (rel.Length == 0) reason = "empty";
        else if (rel.StartsWith("/")) reason = "absolute";
        else if (rel.IndexOf('\\') >= 0) reason = "backslash";
        else if (rel.IndexOf("..", StringComparison.Ordinal) >= 0) reason = "dotdot";
        else if (rel.IndexOf(':') >= 0) reason = "colon";
        if (reason != null)
        {
            Log("asset refused path=" + raw + " reason=" + reason);
            WriteResponse(stream, 403, null, null, head);
            return;
        }

        string docDir;
        try { docDir = Path.GetDirectoryName(Resolve(currentPath)); }
        catch (Exception) { docDir = null; }
        if (string.IsNullOrEmpty(docDir))
        {
            WriteResponse(stream, 404, null, null, head);
            return;
        }
        string dirFull;
        string full;
        try
        {
            dirFull = Path.GetFullPath(docDir);
            string relOs = rel.Replace('/', Path.DirectorySeparatorChar);
            full = Path.GetFullPath(Path.Combine(dirFull, relOs));
        }
        catch (Exception)
        {
            Log("asset refused path=" + raw + " reason=bad-path");
            WriteResponse(stream, 400, null, null, head);
            return;
        }
        string prefix = dirFull.EndsWith(Path.DirectorySeparatorChar.ToString())
            ? dirFull
            : dirFull + Path.DirectorySeparatorChar;
        if (!full.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            Log("asset refused path=" + raw + " reason=outside-doc-dir");
            WriteResponse(stream, 403, null, null, head);
            return;
        }

        string extension = Path.GetExtension(full);
        string mime;
        if (!AssetImageExtensions.Contains(extension) || !MimeMap.TryGetValue(extension, out mime))
        {
            Log("asset refused path=" + raw + " reason=extension");
            WriteResponse(stream, 404, null, null, head);
            return;
        }
        byte[] body;
        try { body = File.ReadAllBytes(full); }
        catch (Exception ex)
        {
            Log("asset miss path=" + raw + " " + ex.GetType().Name);
            WriteResponse(stream, 404, null, null, head);
            return;
        }
        WriteResponse(stream, 200, mime, body, head);
    }

    static void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        CoreWebView2 senderCore = sender as CoreWebView2;
        try
        {
            string expected = "http://127.0.0.1:" + port + "/index.html";
            if (!string.Equals(e.Source, expected, StringComparison.OrdinalIgnoreCase))
            {
                Log("save rejected reason=source source=" + e.Source);
                return;
            }
            Dictionary<string, object> msg = json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson);
            if (msg == null || !msg.ContainsKey("v") || Convert.ToInt32(msg["v"]) != 1) return;
            string type = msg.ContainsKey("type") ? Convert.ToString(msg["type"]) : null;
            if (type == "forget")
            {
                currentPath = null;
                currentMeta = null;
                currentDocErrorCode = null;
                currentDocErrorStatus = 0;
                Log("doc forgotten");
                return;
            }
            if (type == "draft-save" || type == "draft-clear" || type == "close-answer")
            {
                HandleDraftMessage(senderCore, type, msg);
                return;
            }
            if (type == "annotations-save")
            {
                HandleAnnotationsMessage(senderCore, msg);
                return;
            }
            if (type == "open-recent" || type == "recent-remove" || type == "recent-clear" || type == "recent-restore")
            {
                HandleRecentMessage(senderCore, type, msg);
                return;
            }
            if (type != "save") return;

            string id = msg.ContainsKey("id") ? Convert.ToString(msg["id"]) : Guid.NewGuid().ToString("N");
            if (msg.ContainsKey("path") || msg.ContainsKey("fileName") || msg.ContainsKey("file"))
            {
                Log("save rejected error=BAD_REQUEST file=" + SafeFileName(currentPath));
                if (senderCore != null) senderCore.PostWebMessageAsJson(EncodeError(id, "BAD_REQUEST"));
                return;
            }
            if (saveResults.ContainsKey(id))
            {
                if (senderCore != null) senderCore.PostWebMessageAsJson(saveResults[id]);
                return;
            }
            string text = msg.ContainsKey("text") ? Convert.ToString(msg["text"]) : null;
            if (text == null)
            {
                if (senderCore != null) senderCore.PostWebMessageAsJson(EncodeError(id, "BAD_REQUEST"));
                return;
            }
            string result = SaveDocument(id, text);
            if (saveResults.Count > 50) saveResults.Clear();
            saveResults[id] = result;
            if (senderCore != null) senderCore.PostWebMessageAsJson(result);
        }
        catch (Exception ex)
        {
            Log("save message failed " + ex.GetType().Name);
        }
    }

    static string SaveDocument(string id, string text)
    {
        if (currentPath == null || currentMeta == null) return EncodeError(id, "FILE_GONE");
        if (text.Length > 32 * 1024 * 1024) return EncodeError(id, "TOO_LARGE");
        DocMeta meta = currentMeta;
        if (text == meta.Text) return EncodeOk(id, meta.Size, meta.Mtime);

        string resolved = Resolve(currentPath);
        string name = SafeFileName(resolved);
        try
        {
            if (!File.Exists(resolved)) return EncodeError(id, "FILE_GONE");
            if ((File.GetAttributes(resolved) & FileAttributes.ReadOnly) != 0)
            {
                Log("save rejected error=READONLY file=" + name);
                return EncodeError(id, "READONLY");
            }
            if (File.GetLastWriteTimeUtc(resolved).Ticks != meta.Mtime || new FileInfo(resolved).Length != meta.Size)
            {
                Log("save rejected error=PATH_CHANGED file=" + name);
                return EncodeError(id, "PATH_CHANGED");
            }

            string trimmed = text.TrimEnd('\n');
            string bodyLf = meta.EndsWithNewline ? trimmed + "\n" : trimmed;
            string body;
            if (meta.Eol == "mixed")
            {
                string[] lines = bodyLf.Split('\n');
                if (lines.Length != meta.LineCount || meta.LineEols == null || meta.LineEols.Length != lines.Length - 1)
                {
                    Log("save rejected error=EOL_MISMATCH file=" + name);
                    return EncodeError(id, "EOL_MISMATCH");
                }
                StringBuilder sb = new StringBuilder();
                for (int index = 0; index < lines.Length; index++)
                {
                    sb.Append(lines[index]);
                    if (index < lines.Length - 1) sb.Append(meta.LineEols[index] == "crlf" ? "\r\n" : "\n");
                }
                body = sb.ToString();
            }
            else if (meta.Eol == "crlf")
            {
                body = bodyLf.Replace("\n", "\r\n");
            }
            else
            {
                body = bodyLf;
            }

            byte[] payload;
            try { payload = EncodeText(meta, body); }
            catch (EncoderFallbackException)
            {
                Log("save rejected error=ENCODING file=" + name);
                return EncodeError(id, "ENCODING");
            }
            try { AtomicWrite(resolved, payload); }
            catch (UnauthorizedAccessException) { Log("save failed error=READONLY file=" + name); return EncodeError(id, "READONLY"); }
            catch (IOException) { Log("save failed error=FILE_LOCKED file=" + name); return EncodeError(id, "FILE_LOCKED"); }
            catch (Exception ex) { Log("save failed error=IO file=" + name + " " + ex.GetType().Name); return EncodeError(id, "IO"); }

            meta.Text = text;
            meta.Size = payload.Length;
            meta.Mtime = File.GetLastWriteTimeUtc(resolved).Ticks;
            Log("save ok file=" + name + " bytes=" + payload.Length);
            return EncodeOk(id, payload.Length, meta.Mtime);
        }
        catch (UnauthorizedAccessException) { return EncodeError(id, "READONLY"); }
        catch (IOException) { return EncodeError(id, "FILE_LOCKED"); }
        catch (Exception ex) { Log("save failed error=IO " + ex.GetType().Name); return EncodeError(id, "IO"); }
    }

    static byte[] EncodeText(DocMeta meta, string body)
    {
        byte[] content;
        if (meta.Encoding == "gbk") content = StrictGbk.GetBytes(body);
        else if (meta.Encoding == "utf-16le") content = new UnicodeEncoding(false, false, true).GetBytes(body);
        else if (meta.Encoding == "utf-16be") content = new UnicodeEncoding(true, false, true).GetBytes(body);
        else content = StrictUtf8.GetBytes(body);
        if (!meta.Bom) return content;
        byte[] preamble;
        if (meta.Encoding == "utf-16le") preamble = new byte[] { 0xFF, 0xFE };
        else if (meta.Encoding == "utf-16be") preamble = new byte[] { 0xFE, 0xFF };
        else preamble = new byte[] { 0xEF, 0xBB, 0xBF };
        byte[] result = new byte[preamble.Length + content.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(content, 0, result, preamble.Length, content.Length);
        return result;
    }

    // 原子替换：临时文件同目录 + File.Replace；失败退回 MoveFileEx(REPLACE_EXISTING|WRITE_THROUGH)。
    // 任何分支都不写目标文件本身，失败时删临时文件、原文件保持原样。
    static void AtomicWrite(string target, byte[] payload)
    {
        string dir = Path.GetDirectoryName(target);
        string temp = Path.Combine(dir, ".sidelight-tmp-" + Guid.NewGuid().ToString("N"));
        bool moved = false;
        try
        {
            using (FileStream fs = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                fs.Write(payload, 0, payload.Length);
                fs.Flush(true);
            }
            try
            {
                File.Replace(temp, target, null);
                moved = true;
            }
            catch (Exception ex)
            {
                Log("file replace failed " + ex.GetType().Name + ", trying MoveFileEx");
                if (!MoveFileEx(temp, target, 0x1 | 0x8))
                {
                    int code = Marshal.GetLastWin32Error();
                    throw new IOException("MoveFileEx failed " + code);
                }
                moved = true;
            }
        }
        finally
        {
            if (!moved && File.Exists(temp))
            {
                try { File.Delete(temp); } catch (Exception) { }
            }
        }
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern bool MoveFileEx(string existingFileName, string newFileName, uint flags);
    // 关窗：先取消关闭，再 await 页面 dirty；"0" 直接关，"1"/unknown 只发一次 close-request。
    static async void OnFormClosing(object sender, FormClosingEventArgs e)
    {
        if (closeConfirmed) return;
        e.Cancel = true;
        if (closePending)
        {
            Log("close ignored pending");
            return;
        }
        closePending = true;
        Log("close requested");
        string dirty = await ReadDirtyAsync();
        if (dirty == "0")
        {
            Log("close dirty=0");
            closeConfirmed = true;
            closePending = false;
            CloseMainForm();
            return;
        }
        Log("close dirty=" + dirty);
        SendCloseRequest();
    }

    static void SendCloseRequest()
    {
        CoreWebView2 core = web == null ? null : web.CoreWebView2;
        if (core == null)
        {
            Log("close-request skipped webview null");
            closePending = false;
            return;
        }
        Dictionary<string, object> msg = new Dictionary<string, object>();
        msg["v"] = 1;
        msg["type"] = "close-request";
        try { core.PostWebMessageAsJson(json.Serialize(msg)); }
        catch (Exception ex)
        {
            Log("close-request failed " + ex.GetType().Name);
            closePending = false;
            return;
        }
        if (closeTimer != null) { closeTimer.Stop(); closeTimer.Dispose(); }
        closeTimer = new System.Windows.Forms.Timer();
        closeTimer.Interval = 5000;
        closeTimer.Tick += delegate
        {
            closeTimer.Stop();
            Log("close-request timeout 5s");
        };
        closeTimer.Start();
    }

    static void CloseMainForm()
    {
        if (mainForm == null) return;
        try
        {
            mainForm.BeginInvoke(new Action(delegate
            {
                closeConfirmed = true;
                mainForm.Close();
            }));
        }
        catch (Exception ex)
        {
            Log("close failed " + ex.GetType().Name);
        }
    }

    static void HandleDraftMessage(CoreWebView2 senderCore, string type, Dictionary<string, object> msg)
    {
        string id = msg.ContainsKey("id") ? Convert.ToString(msg["id"]) : Guid.NewGuid().ToString("N");
        if (type == "close-answer")
        {
            string action = msg.ContainsKey("action") ? Convert.ToString(msg["action"]) : null;
            Log("close-answer action=" + action);
            if (closeTimer != null) { closeTimer.Stop(); closeTimer.Dispose(); closeTimer = null; }
            if (action == "cancel")
            {
                closePending = false;
                return;
            }
            if (action == "discard")
            {
                string clearError = ClearDraft();
                if (clearError != null) Log("draft clear failed error=" + clearError);
                closeConfirmed = true;
                closePending = false;
                CloseMainForm();
                return;
            }
            if (action == "save-draft")
            {
                string text = msg.ContainsKey("text") ? Convert.ToString(msg["text"]) : null;
                long bytes = 0;
                long mtime = 0;
                string error = text == null ? "BAD_REQUEST" : WriteDraft(text, out bytes, out mtime);
                if (error == null)
                {
                    closeConfirmed = true;
                    closePending = false;
                    CloseMainForm();
                }
                else
                {
                    closePending = false;
                    Log("close save-draft failed error=" + error);
                    try
                    {
                        MessageBox.Show(mainForm, "草稿写入失败（" + error + "）。\n窗口保持打开，请先「另存为」。", "Sidelight",
                            MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
                    catch (Exception) { }
                }
                return;
            }
            closePending = false;
            return;
        }

        if (type == "draft-save")
        {
            string text = msg.ContainsKey("text") ? Convert.ToString(msg["text"]) : null;
            long bytes = 0;
            long mtime = 0;
            string error = text == null ? "BAD_REQUEST" : WriteDraft(text, out bytes, out mtime);
            Dictionary<string, object> reply = new Dictionary<string, object>();
            reply["v"] = 1;
            reply["type"] = "draft-save-result";
            reply["id"] = id;
            reply["ok"] = error == null;
            if (error == null) { reply["bytes"] = bytes; reply["mtime"] = mtime; }
            else { reply["error"] = error; }
            if (senderCore != null) senderCore.PostWebMessageAsJson(json.Serialize(reply));
            return;
        }

        if (type == "draft-clear")
        {
            string error = ClearDraft();
            Dictionary<string, object> reply = new Dictionary<string, object>();
            reply["v"] = 1;
            reply["type"] = "draft-clear-result";
            reply["id"] = id;
            reply["ok"] = error == null;
            if (error != null) reply["error"] = error;
            if (senderCore != null) senderCore.PostWebMessageAsJson(json.Serialize(reply));
            return;
        }
    }

    // 与 src/lib/cache.ts 的 cacheKey() 同一套：去扩展名、非法字符换 -、合并 -、40 截断，超长加 4 位哈希。
    static string CacheKey(string fileName)
    {
        string name = Path.GetFileName(fileName == null ? "" : fileName);
        int dot = name.LastIndexOf('.');
        string body = dot > 0 ? name.Substring(0, dot) : name;
        string cleaned = UnsafeKey.Replace(body, "-");
        cleaned = System.Text.RegularExpressions.Regex.Replace(cleaned, "-{2,}", "-").Trim('-');
        if (cleaned.Length == 0) return "untitled";
        if (cleaned.Length <= 40) return cleaned;
        string head = cleaned.Substring(0, 36).TrimEnd('-');
        return head + "-" + Fnv1a4(cleaned);
    }

    static string Fnv1a4(string value)
    {
        uint hash = 2166136261;
        byte[] bytes = Encoding.UTF8.GetBytes(value);
        for (int index = 0; index < bytes.Length; index++)
        {
            hash ^= bytes[index];
            hash *= 16777619;
        }
        return (hash & 0xFFFF).ToString("x4");
    }

    static string DraftPath()
    {
        if (currentPath == null) return null;
        string resolved = Resolve(currentPath);
        string dir = Path.GetDirectoryName(resolved);
        string key = CacheKey(Path.GetFileName(resolved));
        return Path.Combine(Path.Combine(Path.Combine(dir, ".sidelight"), "drafts"), key + ".md");
    }

    static string WriteDraft(string text, out long bytes, out long mtime)
    {
        bytes = 0;
        mtime = 0;
        if (currentPath == null) return "NO_PATH";
        if (text.Length > 6 * 1024 * 1024) return "TOO_LARGE";
        string path = DraftPath();
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            byte[] payload = new UTF8Encoding(false).GetBytes(text);
            AtomicWrite(path, payload);
            FileInfo info = new FileInfo(path);
            bytes = info.Length;
            mtime = info.LastWriteTimeUtc.Ticks;
            Log("draft saved file=" + SafeFileName(path) + " bytes=" + payload.Length);
            return null;
        }
        catch (UnauthorizedAccessException) { return "NO_PATH"; }
        catch (IOException) { return "IO"; }
        catch (Exception) { return "IO"; }
    }

    static string ClearDraft()
    {
        if (currentPath == null) return "NO_PATH";
        string path = DraftPath();
        try
        {
            if (File.Exists(path)) File.Delete(path);
            Log("draft cleared file=" + SafeFileName(path));
            return null;
        }
        catch (UnauthorizedAccessException) { return "NO_PATH"; }
        catch (IOException) { return "IO"; }
        catch (Exception) { return "IO"; }
    }

    static void HandleDraftRequest(NetworkStream stream, string method, string host)
    {
        if (method != "GET")
        {
            WriteResponse(stream, 405, null, null, false);
            return;
        }
        if (!string.Equals(host, "127.0.0.1:" + port, StringComparison.OrdinalIgnoreCase))
        {
            Log("draft refused reason=host host=" + host);
            WriteResponse(stream, 403, null, null, false);
            return;
        }
        if (currentPath == null)
        {
            WriteResponse(stream, 404, "application/json; charset=utf-8", BuildErrorJson("NO_DOC"), false);
            return;
        }
        string path = DraftPath();
        if (path == null || !File.Exists(path))
        {
            Dictionary<string, object> none = new Dictionary<string, object>();
            none["v"] = 1;
            none["exists"] = false;
            WriteResponse(stream, 404, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(json.Serialize(none)), false);
            return;
        }
        FileInfo info = new FileInfo(path);
        if (info.Length > 6 * 1024 * 1024)
        {
            WriteResponse(stream, 413, "application/json; charset=utf-8", BuildErrorJson("TOO_LARGE"), false);
            return;
        }
        string text;
        try { text = StrictUtf8.GetString(File.ReadAllBytes(path)); }
        catch (DecoderFallbackException)
        {
            WriteResponse(stream, 409, "application/json; charset=utf-8", BuildErrorJson("ENCODING"), false);
            return;
        }
        catch (IOException)
        {
            WriteResponse(stream, 409, "application/json; charset=utf-8", BuildErrorJson("IO"), false);
            return;
        }
        Dictionary<string, object> draft = new Dictionary<string, object>();
        draft["v"] = 1;
        draft["exists"] = true;
        draft["mtime"] = info.LastWriteTimeUtc.Ticks;
        draft["size"] = info.Length;
        draft["text"] = text;
        WriteResponse(stream, 200, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(json.Serialize(draft)), false);
    }
    // 批注与草稿共用 CacheKey：<文档目录>/.sidelight/annotations/<key>.json
    static string AnnotationsPath()
    {
        if (currentPath == null) return null;
        string resolved = Resolve(currentPath);
        string dir = Path.GetDirectoryName(resolved);
        string key = CacheKey(Path.GetFileName(resolved));
        return Path.Combine(Path.Combine(Path.Combine(dir, ".sidelight"), "annotations"), key + ".json");
    }

    static string WriteAnnotations(string text, out long bytes, out long mtime)
    {
        bytes = 0;
        mtime = 0;
        if (currentPath == null) return "NO_PATH";
        if (text == null) return "BAD_REQUEST";
        byte[] payload = new UTF8Encoding(false).GetBytes(text);
        if (payload.Length > 512 * 1024) return "TOO_LARGE";
        string path = AnnotationsPath();
        try
        {
            if (File.Exists(path) && (File.GetAttributes(path) & FileAttributes.ReadOnly) != 0) return "READONLY";
            Directory.CreateDirectory(Path.GetDirectoryName(path));
            AtomicWrite(path, payload);
            FileInfo info = new FileInfo(path);
            bytes = info.Length;
            mtime = info.LastWriteTimeUtc.Ticks;
            Log("annotations saved file=" + SafeFileName(path) + " bytes=" + payload.Length);
            return null;
        }
        catch (UnauthorizedAccessException) { return "READONLY"; }
        catch (IOException) { return "IO"; }
        catch (Exception) { return "IO"; }
    }

    // GET /__annotations：只认当前文档；没有文件回 404；超过 512 KiB 回 413。
    static void HandleAnnotationsRequest(NetworkStream stream, string method, string host)
    {
        if (method != "GET")
        {
            WriteResponse(stream, 405, null, null, false);
            return;
        }
        if (!string.Equals(host, "127.0.0.1:" + port, StringComparison.OrdinalIgnoreCase))
        {
            Log("annotations refused reason=host host=" + host);
            WriteResponse(stream, 403, null, null, false);
            return;
        }
        // 没有当前文档或还没有缓存文件时回 200 + 空 v2 store，不回 404：
        // 页面加载时就会请求它，404 会在控制台留下错误并让 smoke 的「0 错误」断言失败。
        Dictionary<string, object> empty = new Dictionary<string, object>();
        empty["v"] = 2;
        empty["annotations"] = new List<object>();
        empty["notes"] = new List<object>();
        byte[] emptyBody = Encoding.UTF8.GetBytes(json.Serialize(empty));
        if (currentPath == null)
        {
            WriteResponse(stream, 200, "application/json; charset=utf-8", emptyBody, false);
            return;
        }
        string path = AnnotationsPath();
        if (path == null || !File.Exists(path))
        {
            WriteResponse(stream, 200, "application/json; charset=utf-8", emptyBody, false);
            return;
        }
        FileInfo info = new FileInfo(path);
        if (info.Length > 512 * 1024)
        {
            WriteResponse(stream, 413, "application/json; charset=utf-8", BuildErrorJson("TOO_LARGE"), false);
            return;
        }
        string text;
        try { text = StrictUtf8.GetString(File.ReadAllBytes(path)); }
        catch (DecoderFallbackException)
        {
            WriteResponse(stream, 409, "application/json; charset=utf-8", BuildErrorJson("ENCODING"), false);
            return;
        }
        catch (IOException)
        {
            WriteResponse(stream, 409, "application/json; charset=utf-8", BuildErrorJson("IO"), false);
            return;
        }
        Dictionary<string, object> body = new Dictionary<string, object>();
        body["v"] = 1;
        body["exists"] = true;
        body["mtime"] = info.LastWriteTimeUtc.Ticks;
        body["size"] = info.Length;
        body["text"] = text;
        WriteResponse(stream, 200, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(json.Serialize(body)), false);
    }

    static void HandleAnnotationsMessage(CoreWebView2 senderCore, Dictionary<string, object> msg)
    {
        string id = msg.ContainsKey("id") ? Convert.ToString(msg["id"]) : Guid.NewGuid().ToString("N");
        Dictionary<string, object> reply = new Dictionary<string, object>();
        reply["v"] = 1;
        reply["type"] = "annotations-save-result";
        reply["id"] = id;
        if (msg.ContainsKey("path") || msg.ContainsKey("fileName") || msg.ContainsKey("file"))
        {
            Log("annotations rejected error=BAD_REQUEST");
            reply["ok"] = false;
            reply["error"] = "BAD_REQUEST";
        }
        else
        {
            string text = msg.ContainsKey("text") ? Convert.ToString(msg["text"]) : null;
            long bytes = 0;
            long mtime = 0;
            string error = text == null ? "BAD_REQUEST" : WriteAnnotations(text, out bytes, out mtime);
            reply["ok"] = error == null;
            if (error == null) { reply["bytes"] = bytes; reply["mtime"] = mtime; }
            else reply["error"] = error;
        }
        if (senderCore != null) senderCore.PostWebMessageAsJson(json.Serialize(reply));
    }

    static void ReplyRecent(CoreWebView2 senderCore, string type, string id, bool ok, string error)
    {
        Dictionary<string, object> reply = new Dictionary<string, object>();
        reply["v"] = 1;
        reply["type"] = type + "-result";
        reply["id"] = id;
        reply["ok"] = ok;
        if (error != null) reply["error"] = error;
        if (senderCore != null) senderCore.PostWebMessageAsJson(json.Serialize(reply));
    }

    static void HandleRecentMessage(CoreWebView2 senderCore, string type, Dictionary<string, object> msg)
    {
        string id = msg.ContainsKey("id") ? Convert.ToString(msg["id"]) : Guid.NewGuid().ToString("N");
        if (msg.ContainsKey("path") || msg.ContainsKey("fileName") || msg.ContainsKey("file"))
        {
            Log("recent rejected error=BAD_REQUEST");
            ReplyRecent(senderCore, type, id, false, "BAD_REQUEST");
            return;
        }
        if (stateDir == null)
        {
            ReplyRecent(senderCore, type, id, false, "NO_STATE_DIR");
            return;
        }
        if (type == "open-recent")
        {
            long seq = msg.ContainsKey("seq") ? Convert.ToInt64(msg["seq"]) : -1;
            RecentItem item = recentItems.Find(delegate(RecentItem candidate) { return candidate.Id == id; });
            if (item == null || item.Seq != seq)
            {
                ReplyRecent(senderCore, type, id, false, "STALE");
                return;
            }
            HandleOpenRecent(senderCore, id, item.Path);
            return;
        }
        if (type == "recent-remove")
        {
            long seq = msg.ContainsKey("seq") ? Convert.ToInt64(msg["seq"]) : -1;
            RecentItem item = recentItems.Find(delegate(RecentItem candidate) { return candidate.Id == id; });
            if (item == null || item.Seq != seq)
            {
                ReplyRecent(senderCore, type, id, false, "STALE");
                return;
            }
            recentItems.Remove(item);
            string error = SaveRecent();
            ReplyRecent(senderCore, type, id, error == null, error);
            return;
        }
        if (type == "recent-clear")
        {
            recentSnapshot = new List<RecentItem>(recentItems);
            List<RecentItem> previous = new List<RecentItem>(recentItems);
            recentItems.Clear();
            string error = SaveRecent();
            if (error != null) recentItems = previous;
            ReplyRecent(senderCore, type, id, error == null, error);
            return;
        }
        if (type == "recent-restore")
        {
            if (recentSnapshot == null)
            {
                ReplyRecent(senderCore, type, id, false, "STALE");
                return;
            }
            recentItems = new List<RecentItem>(recentSnapshot);
            recentSnapshot = null;
            string error = SaveRecent();
            ReplyRecent(senderCore, type, id, error == null, error);
            return;
        }
        ReplyRecent(senderCore, type, id, false, "BAD_REQUEST");
    }

    static async void HandleOpenRecent(CoreWebView2 senderCore, string id, string path)
    {
        string error = await OpenByPath(path, "recent");
        ReplyRecent(senderCore, "open-recent", id, error == null, error);
    }

    // argv / 单实例转发 / 最近打开共用：脏确认 → 读元数据 → 注入 → 记录。
    static async Task<string> OpenByPath(string path, string source)
    {
        return await OpenByPath(path, source, true);
    }

    static async Task<string> OpenByPath(string path, string source, bool inject)
    {
        if (string.IsNullOrEmpty(path) || !File.Exists(path))
        {
            Log("open failed source=" + source + " reason=missing file=" + LogPath(path));
            return "FILE_GONE";
        }
        DocMeta meta = null;
        try { meta = ReadDocMeta(path); }
        catch (DocException ex)
        {
            Log("open failed source=" + source + " file=" + LogPath(path) + " error=" + ex.Code);
            return ex.Code;
        }
        catch (Exception)
        {
            Log("open failed source=" + source + " file=" + LogPath(path) + " error=IO");
            return "IO";
        }
        string dirty = await ReadDirtyAsync();
        if (dirty != "0")
        {
            Log("open dirty=" + dirty + " source=" + source + " file=" + LogPath(path));
            DialogResult answer = MessageBox.Show(
                "当前文档有未保存的改动。打开 " + Path.GetFileName(path) + " 会替换它。",
                "Sidelight",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Warning,
                MessageBoxDefaultButton.Button2);
            if (answer != DialogResult.Yes)
            {
                Log("open cancelled source=" + source + " file=" + LogPath(path));
                return "CANCELLED";
            }
        }
        SetCurrentDoc(path);
        if (currentDocErrorCode != null) return currentDocErrorCode;
        if (!inject)
        {
            // argv：正文已由 document-created 脚本注入过，这里只统一元数据与最近记录，避免多一次 reload。
            RecordOpen(path);
            Log("open applied source=" + source + " file=" + LogPath(path));
            return null;
        }
        try
        {
            string script = BuildApplyScript(meta.Text, Path.GetFileName(path), false);
            Task exec = web.CoreWebView2.ExecuteScriptAsync(script);
            exec.ContinueWith(delegate(Task prev)
            {
                if (prev.IsFaulted) Log("open exec failed " + prev.Exception.GetBaseException().Message);
            });
            RecordOpen(path);
            Log("open applied source=" + source + " file=" + LogPath(path));
            return null;
        }
        catch (Exception ex)
        {
            Log("open failed source=" + source + " " + ex.GetType().Name);
            return "IO";
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
            Log("data dir candidate failed name=" + LogPath(dir));
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
                Log("data dir kind=" + kind);
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
                Log("default download dir set");
            }
            catch (Exception ex)
            {
                Log("default download dir failed");
            }
            core.PermissionRequested += OnPermissionRequested;
            core.DownloadStarting += OnDownloadStarting;
            core.WebMessageReceived += OnWebMessageReceived;
            core.NavigationStarting += OnNavigationStarting;
            core.NavigationCompleted += OnNavigationCompleted;
            // WebView2 默认吞掉 Ctrl+P/F/K 等浏览器加速键，页面收不到 keydown。
            // 关掉它，快捷键交回页面；DevTools/下载/导航相关设置不动。
            try
            {
                core.Settings.AreBrowserAcceleratorKeysEnabled = false;
                Log("browser accelerator keys disabled");
            }
            catch (Exception)
            {
                Log("browser accelerator keys setting failed");
            }
            // WebView2 自带的 Ctrl+滚轮缩放与应用内「整页缩放」会成双轨：关掉原生那条。
            try
            {
                core.Settings.IsZoomControlEnabled = false;
                Log("native zoom control disabled");
            }
            catch (Exception)
            {
                Log("native zoom control setting failed");
            }
            // 页面里的 document.requestFullscreen 只让 WebView2 报告状态，窗口进出全屏由宿主做
            core.ContainsFullScreenElementChanged += OnContainsFullScreenElementChanged;
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
                Log("open failed file=" + LogPath(pendingFile) + " reason=" + reason);
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

    // 页面按 F11 → requestFullscreen/exitFullscreen：只切窗口边框与状态，不碰页面内容。
    // 事件可能在 WebView2 的线程上送达，统一切回 UI 线程再动 Form。
    static void OnContainsFullScreenElementChanged(object sender, object args)
    {
        try
        {
            CoreWebView2 core = web.CoreWebView2;
            bool full = core != null && core.ContainsFullScreenElement;
            if (form.IsHandleCreated && form.InvokeRequired)
            {
                form.BeginInvoke(new Action(delegate { ApplyHostFullScreen(full); }));
                return;
            }
            ApplyHostFullScreen(full);
        }
        catch (Exception ex)
        {
            Log("fullscreen toggle failed: " + ex.Message);
        }
    }

    static void ApplyHostFullScreen(bool full)
    {
        if (full == hostFullScreen) return;
        hostFullScreen = full;
        if (full)
        {
            savedWindowState = form.WindowState;
            savedWindowBounds = form.WindowState == FormWindowState.Normal ? form.Bounds : form.RestoreBounds;
            form.FormBorderStyle = FormBorderStyle.None;
            form.WindowState = FormWindowState.Maximized;
        }
        else
        {
            form.FormBorderStyle = FormBorderStyle.Sizable;
            form.WindowState = FormWindowState.Normal;
            if (savedWindowBounds.Width > 0 && savedWindowBounds.Height > 0) form.Bounds = savedWindowBounds;
            form.WindowState = savedWindowState;
        }
        Log("host fullscreen " + (full ? "on" : "off"));
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
                Log("download starting name=" + name + " result=" + LogPath(e.ResultFilePath) + " handled=true mode=env");
                try
                {
                    CoreWebView2DownloadOperation op = e.DownloadOperation;
                    op.StateChanged += delegate(object s2, object e2)
                    {
                        Log("download state=" + op.State + " reason=" + op.InterruptReason + " bytes=" + op.BytesReceived + " path=" + LogPath(op.ResultFilePath));
                    };
                }
                catch (Exception ex2)
                {
                    Log("download state hook failed " + ex2.GetType().Name);
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
                Log("download starting name=" + name + " result=" + LogPath(dialog.FileName) + " handled=true mode=dialog");
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
        if (!argvOpened && pendingFile != null)
        {
            argvOpened = true;
            ApplyArgvOpenAsync(pendingFile);
        }
        if (forwardQueue.Count == 0) return;
        // 只应用最后一个路径：reload 期间连续转发时，用户想要的是最后那一份。
        string next = null;
        while (forwardQueue.Count > 0) next = forwardQueue.Dequeue();
        Log("forward drained file=" + LogPath(next));
        ApplyForwardAsync(next);
    }

    // argv 的正文已由 document-created 脚本先注入；导航完成后统一走 OpenByPath，
    // 复用同一套元数据/注入/RecordOpen，保证最近列表与日志都有 source=argv。
    static async void ApplyArgvOpenAsync(string path)
    {
        string error = await OpenByPath(path, "argv", false);
        if (error != null && error != "CANCELLED") Log("argv open failed error=" + error + " file=" + LogPath(path));
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
        if (string.IsNullOrEmpty(path) || !File.Exists(path)) { Log("forward ignored file=" + LogPath(path)); return; }
        if (!navReady)
        {
            if (forwardQueue.Contains(path)) { Log("forward duplicate queued file=" + LogPath(path)); return; }
            forwardQueue.Enqueue(path);
            Log("forward queued file=" + LogPath(path));
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
        string error = await OpenByPath(path, "forward");
        if (error != null && error != "CANCELLED") Log("forward failed error=" + error + " file=" + LogPath(path));
    }
    static void RestoreAndForeground()
    {
        try
        {
            if (form == null) return;
            form.BeginInvoke((Action)delegate
            {
                try
                {
                    if (form.WindowState == FormWindowState.Minimized) form.WindowState = FormWindowState.Normal;
                    form.Show();
                    form.Activate();
                    ShowWindow(form.Handle, SW_RESTORE);
                    SetForegroundWindow(form.Handle);
                }
                catch (Exception ex) { Log("restore error " + ex.Message); }
            });
        }
        catch (Exception ex) { Log("restore invoke error " + ex.Message); }
    }

    const int SW_RESTORE = 9;
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);

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
                        if (line != null)
                        {
                            string path = Encoding.UTF8.GetString(Convert.FromBase64String(line.Trim()));
                            RestoreAndForeground();
                            if (path.Length > 0)
                            {
                                Log("pipe received file=" + LogPath(path));
                                EnqueueForward(path);
                            }
                            else
                            {
                                Log("pipe received empty payload (restore only)");
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
                        Log("pipe sent bytes=" + payload.Length);
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
            if (File.Exists(logPath) && new FileInfo(logPath).Length > 1024 * 1024)
            {
                string rotated = logPath + ".1";
                try { if (File.Exists(rotated)) File.Delete(rotated); File.Move(logPath, rotated); }
                catch (Exception) { }
            }
            File.AppendAllText(logPath, DateTime.Now.ToString("HH:mm:ss.fff") + " " + message + "\r\n", Encoding.UTF8);
        }
        catch
        {
            // 日志失败不影响宿主。
        }
    }

    // 日志只记 basename：完整路径会泄露用户名与目录结构。
    static string LogPath(string path)
    {
        if (string.IsNullOrEmpty(path)) return path;
        string name = Path.GetFileName(path);
        return string.IsNullOrEmpty(name) ? "<dir>" : name;
    }

    static void MigrateLog()
    {
        try
        {
            string marker = logPath + ".migrated";
            if (File.Exists(marker) || !File.Exists(logPath)) return;
            string bad = logPath + ".bad";
            try
            {
                if (File.Exists(bad)) File.Delete(bad);
                File.Move(logPath, bad);
            }
            catch (Exception)
            {
                try { File.Delete(logPath); } catch (Exception) { }
            }
            File.WriteAllText(marker, DateTime.UtcNow.Ticks.ToString());
            Log("log migrated");
        }
        catch (Exception) { }
    }

    static void InitState()
    {
        stateDir = ResolveStateDir(out stateKind);
        if (stateDir == null)
        {
            Log("state dir kind=none");
            return;
        }
        Log("state dir kind=" + stateKind);
        recentPath = Path.Combine(stateDir, "recent.json");
        LoadRecent();
    }

    static string ResolveStateDir(out string kind)
    {
        kind = "none";
        string overrideDir = Environment.GetEnvironmentVariable("SIDELIGHT_STATE_DIR");
        if (!string.IsNullOrEmpty(overrideDir))
        {
            kind = Environment.GetEnvironmentVariable("SIDELIGHT_STATE_KIND");
            if (string.IsNullOrEmpty(kind)) kind = "temp";
            if (TryWritable(overrideDir)) return overrideDir;
            return null;
        }
        string local = Environment.GetEnvironmentVariable("LOCALAPPDATA");
        if (!string.IsNullOrEmpty(local))
        {
            string dir = Path.Combine(local, "Sidelight");
            if (TryWritable(dir)) { kind = "localappdata"; return dir; }
        }
        string portable = Path.Combine(baseDir, "state");
        if (TryWritable(portable)) { kind = "portable"; return portable; }
        string temp = Environment.GetEnvironmentVariable("TEMP");
        if (!string.IsNullOrEmpty(temp))
        {
            string dir = Path.Combine(temp, "Sidelight");
            if (TryWritable(dir)) { kind = "temp"; return dir; }
        }
        return null;
    }

    static bool TryWritable(string dir)
    {
        try
        {
            Directory.CreateDirectory(dir);
            string probe = Path.Combine(dir, ".write-probe-" + Guid.NewGuid().ToString("N"));
            File.WriteAllText(probe, "1");
            File.Delete(probe);
            return true;
        }
        catch (Exception) { return false; }
    }

    static string NormalizePath(string path)
    {
        string full = Path.GetFullPath(path);
        if (full.StartsWith(@"\\?\", StringComparison.Ordinal)) full = full.Substring(4);
        return full;
    }

    static string IdFor(string normalized)
    {
        SHA256 sha = SHA256.Create();
        byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(normalized.ToLowerInvariant()));
        StringBuilder sb = new StringBuilder();
        for (int index = 0; index < 8; index++) sb.Append(hash[index].ToString("x2"));
        return sb.ToString();
    }

    static string Str(Dictionary<string, object> dict, string key)
    {
        return dict.ContainsKey(key) && dict[key] != null ? Convert.ToString(dict[key]) : "";
    }

    static long Long(Dictionary<string, object> dict, string key)
    {
        try { return dict.ContainsKey(key) && dict[key] != null ? Convert.ToInt64(dict[key]) : 0; }
        catch (Exception) { return 0; }
    }

    static void LoadRecent()
    {
        recentItems = new List<RecentItem>();
        recentSeq = 0;
        if (recentPath == null || !File.Exists(recentPath)) return;
        try
        {
            string raw = File.ReadAllText(recentPath, Encoding.UTF8);
            Dictionary<string, object> root = json.Deserialize<Dictionary<string, object>>(raw);
            if (root == null) throw new InvalidOperationException("empty");
            recentSeq = Long(root, "seq");
            object[] items = root.ContainsKey("items") ? root["items"] as object[] : null;
            if (items != null)
            {
                foreach (object entry in items)
                {
                    Dictionary<string, object> dict = entry as Dictionary<string, object>;
                    if (dict == null) continue;
                    string path = Str(dict, "path");
                    if (string.IsNullOrEmpty(path)) continue;
                    RecentItem item = new RecentItem();
                    item.Id = Str(dict, "id");
                    item.Path = NormalizePath(path);
                    item.Name = Str(dict, "name");
                    item.Dir = Str(dict, "dir");
                    item.Seq = Long(dict, "seq");
                    item.OpenedAt = Long(dict, "openedAt");
                    item.Size = Long(dict, "size");
                    item.Mtime = Long(dict, "mtime");
                    recentItems.Add(item);
                }
            }
            Log("recent loaded count=" + recentItems.Count);
        }
        catch (Exception)
        {
            try
            {
                string bad = recentPath + ".bad-" + DateTime.UtcNow.Ticks;
                File.Move(recentPath, bad);
                Log("recent corrupt file=recent.json backup=" + LogPath(bad));
            }
            catch (Exception)
            {
                try { File.Delete(recentPath); } catch (Exception) { }
                Log("recent corrupt file=recent.json deleted=true");
            }
            recentItems = new List<RecentItem>();
            recentSeq = 0;
        }
    }

    static string SaveRecent()
    {
        if (recentPath == null) return "NO_STATE_DIR";
        try
        {
            Dictionary<string, object> root = new Dictionary<string, object>();
            root["v"] = 1;
            root["seq"] = recentSeq;
            List<Dictionary<string, object>> list = new List<Dictionary<string, object>>();
            foreach (RecentItem item in recentItems)
            {
                Dictionary<string, object> dict = new Dictionary<string, object>();
                dict["id"] = item.Id;
                dict["path"] = item.Path;
                dict["name"] = item.Name;
                dict["dir"] = item.Dir;
                dict["seq"] = item.Seq;
                dict["openedAt"] = item.OpenedAt;
                dict["size"] = item.Size;
                dict["mtime"] = item.Mtime;
                list.Add(dict);
            }
            root["items"] = list;
            AtomicWrite(recentPath, new UTF8Encoding(false).GetBytes(json.Serialize(root)));
            return null;
        }
        catch (Exception ex)
        {
            Log("recent write failed " + ex.GetType().Name);
            return "IO";
        }
    }

    // 只在主实例、打开成功后调用：记录最近 8 篇，同路径去重并置顶。
    static void RecordOpen(string path)
    {
        if (stateDir == null || string.IsNullOrEmpty(path)) return;
        try
        {
            string normalized = NormalizePath(path);
            recentItems.RemoveAll(delegate(RecentItem item) { return string.Equals(item.Path, normalized, StringComparison.OrdinalIgnoreCase); });
            recentSeq += 1;
            RecentItem entry = new RecentItem();
            entry.Id = IdFor(normalized);
            entry.Path = normalized;
            entry.Name = Path.GetFileName(normalized);
            entry.OpenedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            entry.Seq = recentSeq;
            try
            {
                FileInfo info = new FileInfo(normalized);
                entry.Size = info.Exists ? info.Length : 0;
                entry.Mtime = info.Exists ? info.LastWriteTimeUtc.Ticks : 0;
            }
            catch (Exception) { }
            recentItems.Insert(0, entry);
            while (recentItems.Count > 8) recentItems.RemoveAt(recentItems.Count - 1);
            recentLastError = SaveRecent();
        }
        catch (Exception ex)
        {
            Log("recent record failed " + ex.GetType().Name);
        }
    }

    static string DirOf(string path, int take)
    {
        List<string> parts = new List<string>();
        string dir;
        try { dir = Path.GetDirectoryName(path); } catch (Exception) { return ""; }
        while (!string.IsNullOrEmpty(dir) && parts.Count < take)
        {
            string name = Path.GetFileName(dir);
            if (string.IsNullOrEmpty(name)) break;
            parts.Insert(0, name);
            DirectoryInfo parent = Directory.GetParent(dir);
            if (parent == null) break;
            dir = parent.FullName;
        }
        return string.Join("/", parts.ToArray());
    }

    // 响应里 dir 用 / 分隔、无盘符；同名同目录时扩到更多段。
    static List<Dictionary<string, object>> BuildRecentView()
    {
        Dictionary<string, int> depth = new Dictionary<string, int>();
        foreach (RecentItem item in recentItems) depth[item.Id] = 1;
        for (int round = 0; round < 8; round++)
        {
            Dictionary<string, string> dirs = new Dictionary<string, string>();
            Dictionary<string, List<RecentItem>> groups = new Dictionary<string, List<RecentItem>>();
            foreach (RecentItem item in recentItems)
            {
                string dir = DirOf(item.Path, depth[item.Id]);
                dirs[item.Id] = dir;
                string key = item.Name.ToLowerInvariant() + "|" + dir.ToLowerInvariant();
                if (!groups.ContainsKey(key)) groups[key] = new List<RecentItem>();
                groups[key].Add(item);
            }
            bool changed = false;
            foreach (KeyValuePair<string, List<RecentItem>> group in groups)
            {
                if (group.Value.Count < 2) continue;
                foreach (RecentItem item in group.Value)
                {
                    if (depth[item.Id] >= 8) continue;
                    depth[item.Id] += 1;
                    changed = true;
                }
            }
            if (!changed) break;
        }
        List<Dictionary<string, object>> list = new List<Dictionary<string, object>>();
        foreach (RecentItem item in recentItems)
        {
            Dictionary<string, object> dict = new Dictionary<string, object>();
            dict["id"] = item.Id;
            dict["seq"] = item.Seq;
            dict["name"] = item.Name;
            dict["dir"] = DirOf(item.Path, depth[item.Id]);
            list.Add(dict);
        }
        return list;
    }

    static void HandleRecentRequest(NetworkStream stream, string method, string host)
    {
        if (method != "GET")
        {
            WriteResponse(stream, 405, null, null, false);
            return;
        }
        if (!string.Equals(host, "127.0.0.1:" + port, StringComparison.OrdinalIgnoreCase))
        {
            Log("recent refused reason=host");
            WriteResponse(stream, 403, null, null, false);
            return;
        }
        Dictionary<string, object> body = new Dictionary<string, object>();
        body["v"] = 1;
        if (stateDir == null)
        {
            body["state"] = "disabled";
            body["items"] = new List<Dictionary<string, object>>();
            body["reason"] = "NO_STATE_DIR";
        }
        else
        {
            body["state"] = stateKind == "temp" ? "volatile" : "ok";
            body["items"] = BuildRecentView();
            if (recentLastError != null)
            {
                body["lastError"] = recentLastError;
                recentLastError = null;
            }
        }
        WriteResponse(stream, 200, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(json.Serialize(body)), false);
    }

}

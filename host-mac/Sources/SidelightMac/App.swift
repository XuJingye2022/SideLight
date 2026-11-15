import AppKit
import Darwin
import WebKit

final class DropWebView: WKWebView {
    var onOpen: ((String) -> Void)?

    override init(frame: CGRect, configuration: WKWebViewConfiguration) {
        super.init(frame: frame, configuration: configuration)
        registerForDraggedTypes([.fileURL])
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not used")
    }

    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        return .copy
    }

    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        guard let urls = sender.draggingPasteboard.readObjects(forClasses: [NSURL.self], options: nil) as? [URL],
              let url = urls.first else { return false }
        let ext = url.pathExtension.lowercased()
        guard ext == "md" || ext == "markdown" else { return false }
        onOpen?(url.path)
        return true
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler {
    private var window: NSWindow!
    private var webView: DropWebView!
    private var server: HTTPServer!
    private let store = HostStore.shared
    private var allowClose = false
    private var closePending = false
    private var closeTimer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let root = Bundle.main.resourceURL?.appendingPathComponent("www").path
            ?? (FileManager.default.currentDirectoryPath as NSString).appendingPathComponent("dist")
        let indexURL = ((root as NSString).appendingPathComponent("index.html"))
        if !FileManager.default.fileExists(atPath: indexURL) {
            let alert = NSAlert()
            alert.messageText = "Sidelight 启动失败"
            alert.informativeText = "缺少前端资源：\(indexURL)。请用 host-mac/build.sh 重新打包。"
            alert.alertStyle = .critical
            alert.addButton(withTitle: "退出")
            alert.runModal()
            exit(1)
        }

        server = HTTPServer(root: root)
        do {
            try server.start()
        } catch {
            showError("无法在 127.0.0.1:47821 启动本地服务：\(error)")
        }

        buildMenu()
        buildWindow()

        let args = CommandLine.arguments.dropFirst()
        if let path = args.first(where: { !$0.hasPrefix("-") }), FileManager.default.fileExists(atPath: path) {
            openPath(path)
        }
    }

    private func buildWindow() {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        controller.add(self, name: "sidelight")
        let script = "window.__sidelightReceive = function (p) { window.dispatchEvent(new CustomEvent('sidelight-host', { detail: p })); };"
        controller.addUserScript(WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = controller

        webView = DropWebView(frame: .zero, configuration: config)
        webView.onOpen = { [weak self] path in self?.openPath(path) }

        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1200, height: 800),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Sidelight"
        window.delegate = self
        window.contentView = webView
        webView.frame = window.contentView?.bounds ?? NSRect(x: 0, y: 0, width: 1200, height: 800)
        webView.autoresizingMask = [.width, .height]
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        if let url = URL(string: "http://127.0.0.1:47821/index.html") {
            webView.load(URLRequest(url: url))
        }
    }

    private func buildMenu() {
        let mainMenu = NSMenu()
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于 Sidelight", action: nil, keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "退出 Sidelight", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let fileItem = NSMenuItem()
        mainMenu.addItem(fileItem)
        let fileMenu = NSMenu(title: "File")
        fileMenu.addItem(withTitle: "打开…", action: #selector(openDocument(_:)), keyEquivalent: "o")

        let recentItem = NSMenuItem()
        recentItem.title = "打开最近"
        let recentMenu = NSMenu(title: "打开最近")
        for item in store.recentItems() {
            let entry = NSMenuItem(title: "\(item.name)  —  \(item.dir)", action: #selector(openRecent(_:)), keyEquivalent: "")
            entry.representedObject = item.path
            recentMenu.addItem(entry)
        }
        if recentMenu.items.isEmpty {
            recentMenu.addItem(withTitle: "没有最近打开", action: nil, keyEquivalent: "")
        }
        recentItem.submenu = recentMenu
        fileMenu.addItem(recentItem)
        fileMenu.addItem(NSMenuItem.separator())
        fileMenu.addItem(withTitle: "关闭窗口", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        fileItem.submenu = fileMenu

        let editItem = NSMenuItem()
        mainMenu.addItem(editItem)
        let editMenu = NSMenu(title: "Edit")
        // 全部 target = nil，走 first responder；undo:/redo: 由 WKWebView 的 undoManager 处理，
        // 不额外给网页发快捷键事件（否则 Cmd+C 会触发两次）。
        editMenu.addItem(makeMenuItem("撤销", "undo:", "z"))
        editMenu.addItem(makeMenuItem("重做", "redo:", "Z"))
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(makeMenuItem("剪切", "cut:", "x"))
        editMenu.addItem(makeMenuItem("拷贝", "copy:", "c"))
        editMenu.addItem(makeMenuItem("粘贴", "paste:", "v"))
        editMenu.addItem(makeMenuItem("全选", "selectAll:", "a"))
        editItem.submenu = editMenu

        NSApp.mainMenu = mainMenu
    }

    private func rebuildRecentMenu() {
        guard let fileMenu = NSApp.mainMenu?.items.compactMap({ $0.submenu }).first(where: { $0.title == "File" }) else { return }
        guard let recentItem = fileMenu.items.first(where: { $0.title == "打开最近" }) else { return }
        let recentMenu = NSMenu(title: "打开最近")
        for item in store.recentItems() {
            let entry = NSMenuItem(title: "\(item.name)  —  \(item.dir)", action: #selector(openRecent(_:)), keyEquivalent: "")
            entry.representedObject = item.path
            recentMenu.addItem(entry)
        }
        if recentMenu.items.isEmpty {
            recentMenu.addItem(withTitle: "没有最近打开", action: nil, keyEquivalent: "")
        }
        recentItem.submenu = recentMenu
    }

    private func makeMenuItem(_ title: String, _ action: String, _ key: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: Selector((action)), keyEquivalent: key)
        item.target = nil
        return item
    }

    @objc private func openDocument(_ sender: Any?) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.allowedFileTypes = ["md", "markdown"]
        if panel.runModal() == .OK, let url = panel.url {
            openPath(url.path)
        }
    }

    @objc private func openRecent(_ sender: NSMenuItem) {
        guard let path = sender.representedObject as? String else { return }
        openPath(path)
    }

    private func openPath(_ path: String) {
        do {
            try store.open(path: path)
            let docName = (store.docJSON()?["fileName"] as? String) ?? "Sidelight"
            window.title = "\(docName) — Sidelight"
            rebuildRecentMenu()
            webView.reload()
        } catch let error as HostError {
            showError("打不开这个文件（\(error.rawValue)）。")
        } catch {
            showError("打不开这个文件。")
        }
    }

    private func showError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Sidelight"
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "好")
        alert.runModal()
    }

    // MARK: WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "sidelight", let body = message.body as? [String: Any] else { return }
        guard let type = body["type"] as? String else { return }
        let id = body["id"] as? String ?? UUID().uuidString

        switch type {
        case "save":
            let text = body["text"] as? String ?? ""
            if let error = store.save(text: text) {
                send(["v": 1, "type": "save-result", "id": id, "ok": false, "error": error])
            } else if let meta = store.docJSON() {
                send(["v": 1, "type": "save-result", "id": id, "ok": true,
                      "bytes": meta["size"] as? Int ?? 0, "mtime": meta["mtime"] as? Int64 ?? 0])
            } else {
                send(["v": 1, "type": "save-result", "id": id, "ok": false, "error": "IO"])
            }

        case "draft-save":
            let text = body["text"] as? String ?? ""
            let (error, mtime, bytes) = store.saveDraft(text: text)
            if let error = error {
                send(["v": 1, "type": "draft-save-result", "id": id, "ok": false, "error": error])
            } else {
                send(["v": 1, "type": "draft-save-result", "id": id, "ok": true, "bytes": bytes, "mtime": mtime])
            }

        case "draft-clear":
            if let error = store.clearDraft() {
                send(["v": 1, "type": "draft-clear-result", "id": id, "ok": false, "error": error])
            } else {
                send(["v": 1, "type": "draft-clear-result", "id": id, "ok": true])
            }

        case "open-recent":
            let seq = (body["seq"] as? NSNumber)?.int64Value ?? -1
            guard let item = store.item(id: id), item.seq == seq else {
                send(["v": 1, "type": "open-recent-result", "id": id, "ok": false, "error": "STALE"])
                return
            }
            do {
                try store.open(path: item.path)
                webView.reload()
                send(["v": 1, "type": "open-recent-result", "id": id, "ok": true])
            } catch let error as HostError {
                send(["v": 1, "type": "open-recent-result", "id": id, "ok": false, "error": error.rawValue])
            } catch {
                send(["v": 1, "type": "open-recent-result", "id": id, "ok": false, "error": "IO"])
            }

        case "recent-remove":
            let seq = (body["seq"] as? NSNumber)?.int64Value ?? -1
            if let error = store.removeRecent(id: id, seq: seq) {
                send(["v": 1, "type": "recent-remove-result", "id": id, "ok": false, "error": error])
            } else {
                rebuildRecentMenu()
                send(["v": 1, "type": "recent-remove-result", "id": id, "ok": true])
            }

        case "recent-clear":
            if let error = store.clearRecent() {
                send(["v": 1, "type": "recent-clear-result", "id": id, "ok": false, "error": error])
            } else {
                rebuildRecentMenu()
                send(["v": 1, "type": "recent-clear-result", "id": id, "ok": true])
            }

        case "recent-restore":
            if let error = store.restoreRecent() {
                send(["v": 1, "type": "recent-restore-result", "id": id, "ok": false, "error": error])
            } else {
                rebuildRecentMenu()
                send(["v": 1, "type": "recent-restore-result", "id": id, "ok": true])
            }

        case "close-answer":
            handleCloseAnswer(body)

        case "forget":
            closePending = false

        default:
            break
        }
    }

    private func send(_ object: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: object),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("window.__sidelightReceive(\(json))", completionHandler: nil)
    }

    // MARK: close guard

    private func readDirty(_ completion: @escaping (String) -> Void) {
        guard let webView = webView else { completion("unknown"); return }
        webView.evaluateJavaScript("(window.__slState===undefined?-1:(window.__slState.dirty?1:0))") { value, _ in
            if let number = value as? NSNumber { completion(number.intValue == 0 ? "0" : "1") }
            else { completion("unknown") }
        }
    }

    private func sendCloseRequest() {
        guard !closePending else { return }
        closePending = true
        send(["v": 1, "type": "close-request"])
        closeTimer?.invalidate()
        closeTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: false) { [weak self] _ in
            self?.closePending = false
            self?.closeTimer = nil
        }
    }

    private func handleCloseAnswer(_ body: [String: Any]) {
        closeTimer?.invalidate()
        closeTimer = nil
        let action = body["action"] as? String ?? ""
        switch action {
        case "cancel":
            closePending = false
        case "discard":
            _ = store.clearDraft()
            allowClose = true
            closePending = false
            window.performClose(nil)
        case "save-draft":
            let text = body["text"] as? String ?? ""
            let (error, _, _) = store.saveDraft(text: text)
            if error == nil {
                allowClose = true
                closePending = false
                window.performClose(nil)
            } else {
                closePending = false
                showError("草稿写入失败（\(error ?? "IO")）。窗口保持打开，请先「另存为」。")
            }
        default:
            closePending = false
        }
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if allowClose { return true }
        if closePending { return false }
        readDirty { [weak self] dirty in
            guard let self = self else { return }
            if dirty == "0" {
                self.allowClose = true
                sender.close()
            } else {
                self.sendCloseRequest()
            }
        }
        return false
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if allowClose { return .terminateNow }
        if closePending { return .terminateCancel }
        readDirty { [weak self] dirty in
            guard let self = self else { return }
            if dirty == "0" {
                self.allowClose = true
                sender.terminate(nil)
            } else {
                self.sendCloseRequest()
            }
        }
        return .terminateCancel
    }
}

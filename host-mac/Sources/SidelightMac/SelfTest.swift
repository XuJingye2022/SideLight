import Foundation
import Network

enum SelfTest {
    private static var failures = 0

    private static func check(_ name: String, _ ok: Bool, _ detail: String = "") {
        print("\(ok ? "PASS" : "FAIL") \(name)\(detail.isEmpty ? "" : " — \(detail)")")
        if !ok { failures += 1 }
    }

    static func run() -> Int32 {
        let requireBundle = CommandLine.arguments.contains("--require-bundle")
        let appURL = Bundle.main.bundleURL
        let isBundle = appURL.pathExtension == "app"
        print("self-test: bundle=\(appURL.path) isBundle=\(isBundle) requireBundle=\(requireBundle)")

        if requireBundle && !isBundle {
            print("FAIL --require-bundle：不在 .app 内运行，禁止回退到当前目录")
            return 1
        }

        // self-test 只认 .app 内的 Resources/www；不回退当前目录，避免打包缺失被静默掩盖。
        guard isBundle else {
            print("FAIL self-test 必须在 .app 内运行")
            return 1
        }
        let root = appURL.appendingPathComponent("Contents/Resources/www").path
        print("self-test: root=\(root)")
        let indexURL = (root as NSString).appendingPathComponent("index.html")
        if !FileManager.default.fileExists(atPath: indexURL) {
            print("FAIL index.html 不存在：\(indexURL)")
            return 1
        }

        let server = HTTPServer(root: root)
        do {
            try server.start()
        } catch {
            print("FAIL listen：\(error)")
            return 1
        }
        defer { server.stop() }

        // 就绪等待：10 × 0.2 s 轮询 GET /
        var ready = false
        for _ in 0..<10 {
            if let (status, _, _) = get("/"), status == 200 {
                ready = true
                break
            }
            Thread.sleep(forTimeInterval: 0.2)
        }
        check("服务就绪（GET / 200）", ready)
        guard ready else { return 1 }

        let (status, contentType, body) = get("/")
        check("GET / 200 且 text/html", status == 200 && (contentType ?? "").contains("text/html"), "status=\(status) type=\(contentType ?? "-")")
        check("首页含 id=\"root\"", body.contains("id=\"root\""))

        // 抽 /assets/index-*.js 再取一次
        var assetPath: String? = nil
        if let match = body.range(of: "/assets/index-[A-Za-z0-9_-]+\\.js", options: .regularExpression) {
            assetPath = String(body[match])
        }
        if let assetPath = assetPath {
            let (assetStatus, assetType, assetBody) = get(assetPath)
            check("静态 JS \(assetPath) 200 + text/javascript + 非空", assetStatus == 200 && (assetType ?? "").contains("text/javascript") && !assetBody.isEmpty,
                  "status=\(assetStatus) type=\(assetType ?? "-") bytes=\(assetBody.utf8.count)")
        } else {
            check("首页引用 /assets/index-*.js", false, "没找到 script 引用")
        }

        let (docStatus, _, docBody) = get("/__doc")
        let docJSON = (try? JSONSerialization.jsonObject(with: Data(docBody.utf8))) as? [String: Any]
        check("GET /__doc 200/404 且是 v=1 的 JSON", (docStatus == 200 || docStatus == 404) && docJSON?["v"] != nil, "status=\(docStatus)")
        if docBody.contains("/Users/") {
            check("GET /__doc 不含完整路径", false)
        }

        let (recentStatus, _, recentBody) = get("/__recent")
        let recentJSON = (try? JSONSerialization.jsonObject(with: Data(recentBody.utf8))) as? [String: Any]
        check("GET /__recent 200 且 v=1、items 数组", recentStatus == 200 && recentJSON?["v"] != nil && recentJSON?["items"] is [Any], "status=\(recentStatus)")

        let (missingStatus, _, _) = get("/no-such-path-\(UUID().uuidString)")
        check("未知路径 404", missingStatus == 404, "status=\(missingStatus)")

        let evilStatus = rawStatus(host: "evil")
        check("Host: evil → 403（原始 socket）", evilStatus == 403, "status=\(evilStatus)")

        if failures == 0 {
            print("self-test: PASS")
            return 0
        }
        print("self-test: \(failures) FAIL")
        return 1
    }

    private static func get(_ path: String) -> (Int, String?, String) {
        var request = URLRequest(url: URL(string: "http://127.0.0.1:47821\(path)")!)
        request.timeoutInterval = 5
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let semaphore = DispatchSemaphore(value: 0)
        var status = 0
        var contentType: String?
        var body = ""
        URLSession.shared.dataTask(with: request) { data, response, _ in
            if let http = response as? HTTPURLResponse {
                status = http.statusCode
                contentType = http.value(forHTTPHeaderField: "Content-Type")
            }
            if let data = data { body = String(data: data, encoding: .utf8) ?? "" }
            semaphore.signal()
        }.resume()
        _ = semaphore.wait(timeout: .now() + 6)
        return (status, contentType, body)
    }

    // URLSession 不保证自定义 Host，这条用 NWConnection 直接发原始请求。
    private static func rawStatus(host: String) -> Int {
        let semaphore = DispatchSemaphore(value: 0)
        var status = 0
        let queue = DispatchQueue(label: "sidelight.selftest.raw")
        let connection = NWConnection(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: 47821)!, using: .tcp)
        connection.stateUpdateHandler = { state in
            if case .ready = state {
                let request = "GET /__doc HTTP/1.1\r\nHost: \(host)\r\nConnection: close\r\n\r\n"
                connection.send(content: Data(request.utf8), completion: .contentProcessed { _ in })
            }
        }
        connection.start(queue: queue)
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { data, _, _, _ in
            if let data = data, let text = String(data: data, encoding: .utf8),
               let first = text.components(separatedBy: "\r\n").first {
                let parts = first.components(separatedBy: " ")
                if parts.count >= 2 { status = Int(parts[1]) ?? 0 }
            }
            connection.cancel()
            semaphore.signal()
        }
        _ = semaphore.wait(timeout: .now() + 6)
        connection.cancel()
        return status
    }
}

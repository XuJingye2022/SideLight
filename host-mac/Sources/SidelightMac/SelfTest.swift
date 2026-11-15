import Foundation

enum SelfTest {
    static func run() -> Int32 {
        let root: String
        if let resource = Bundle.main.resourceURL?.appendingPathComponent("www").path,
           FileManager.default.fileExists(atPath: resource) {
            root = resource
        } else {
            root = (FileManager.default.currentDirectoryPath as NSString).appendingPathComponent("dist")
        }

        let server = HTTPServer(root: root)
        do {
            try server.start()
        } catch {
            print("self-test: listen failed: \(error)")
            return 1
        }
        Thread.sleep(forTimeInterval: 0.6)

        let semaphore = DispatchSemaphore(value: 0)
        var status = 0
        var body = ""
        var request = URLRequest(url: URL(string: "http://127.0.0.1:47821/__doc")!)
        request.timeoutInterval = 5
        request.cachePolicy = .reloadIgnoringLocalCacheData
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("self-test: request failed: \(error)")
            }
            if let http = response as? HTTPURLResponse { status = http.statusCode }
            if let data = data { body = String(data: data, encoding: .utf8) ?? "" }
            semaphore.signal()
        }
        task.resume()
        if semaphore.wait(timeout: .now() + 6) == .timedOut {
            print("self-test: timeout")
            server.stop()
            return 1
        }
        server.stop()

        print("self-test: status=\(status) body=\(body)")
        guard status == 200 || status == 404 else { return 1 }
        guard let data = body.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              json["v"] != nil else {
            print("self-test: /__doc is not a JSON object with v")
            return 1
        }
        if body.contains("/Users/") {
            print("self-test: unexpected path in /__doc")
            return 1
        }
        print("self-test: PASS")
        return 0
    }
}

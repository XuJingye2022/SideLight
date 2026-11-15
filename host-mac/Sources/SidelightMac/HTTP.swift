import Foundation
import Network

final class HTTPServer {
    private let queue = DispatchQueue(label: "sidelight.http")
    private var listener: NWListener?
    private let root: String
    private let store = HostStore.shared
    private let allowedHost = "127.0.0.1:47821"

    init(root: String) {
        self.root = root
    }

    func start() throws {
        let params = NWParameters.tcp
        params.allowLocalEndpointReuse = true
        params.requiredLocalEndpoint = NWEndpoint.hostPort(host: .ipv4(.loopback), port: NWEndpoint.Port(rawValue: 47821)!)
        let listener = try NWListener(using: params)
        listener.newConnectionHandler = { [weak self] connection in
            self?.handle(connection)
        }
        listener.stateUpdateHandler = { state in
            if case .failed(let error) = state {
                FileHandle.standardError.write(Data("listener failed: \(error)\n".utf8))
            }
        }
        listener.start(queue: queue)
        self.listener = listener
    }

    func stop() {
        listener?.cancel()
    }

    private func handle(_ connection: NWConnection) {
        connection.start(queue: queue)
        receive(connection, buffer: Data())
    }

    private func receive(_ connection: NWConnection, buffer: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { [weak self] data, _, isComplete, error in
            guard let self = self else { return }
            var buffer = buffer
            if let data = data { buffer.append(data) }
            if let range = buffer.range(of: Data("\r\n\r\n".utf8)) {
                let head = buffer.subdata(in: 0..<range.lowerBound)
                let response = self.route(head)
                connection.send(content: response, completion: .contentProcessed { _ in
                    connection.cancel()
                })
                return
            }
            if error != nil || isComplete {
                connection.cancel()
                return
            }
            if buffer.count > 64 * 1024 {
                connection.cancel()
                return
            }
            self.receive(connection, buffer: buffer)
        }
    }

    private func route(_ head: Data) -> Data {
        guard let text = String(data: head, encoding: .utf8) else { return Self.empty(400) }
        let lines = text.components(separatedBy: "\r\n")
        guard let first = lines.first else { return Self.empty(400) }
        let parts = first.components(separatedBy: " ")
        guard parts.count >= 2 else { return Self.empty(400) }
        let method = parts[0]
        var target = parts[1]
        var host = ""
        for line in lines.dropFirst() {
            let lower = line.lowercased()
            if lower.hasPrefix("host:") {
                host = String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces)
            }
        }
        if method != "GET" && method != "HEAD" { return Self.empty(405) }
        let headOnly = method == "HEAD"
        if let idx = target.firstIndex(of: "?") { target = String(target[..<idx]) }

        if host.caseInsensitiveCompare(allowedHost) != .orderedSame { return Self.empty(403) }

        if target == "/__doc" {
            if let body = store.docJSON() {
                return Self.json(200, body, headOnly: headOnly)
            }
            return Self.json(404, ["v": 1, "ok": false, "error": "NO_DOC"], headOnly: headOnly)
        }
        if target == "/__draft" {
            if let body = store.draftJSON() {
                return Self.json(200, body, headOnly: headOnly)
            }
            return Self.json(404, ["v": 1, "exists": false], headOnly: headOnly)
        }
        if target == "/__recent" {
            return Self.json(200, store.recentJSON(), headOnly: headOnly)
        }
        return staticFile(target, headOnly: headOnly)
    }

    private func staticFile(_ target: String, headOnly: Bool) -> Data {
        var path = target
        if path.isEmpty || path == "/" { path = "/index.html" }
        guard let decoded = path.removingPercentEncoding else { return Self.empty(400) }
        if decoded.contains("..") || decoded.contains("\\") || decoded.contains(":") { return Self.empty(403) }
        let relative = decoded.hasPrefix("/") ? String(decoded.dropFirst()) : decoded
        let file = (root as NSString).appendingPathComponent(relative)
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: file, isDirectory: &isDir), !isDir.boolValue,
              let data = FileManager.default.contents(atPath: file) else {
            return Self.empty(404)
        }
        let mime = Self.mimeType((file as NSString).pathExtension)
        return Self.response(200, body: data, contentType: mime, headOnly: headOnly)
    }

    static func mimeType(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "png": return "image/png"
        case "svg": return "image/svg+xml"
        case "ico": return "image/x-icon"
        case "map": return "application/json"
        default: return "application/octet-stream"
        }
    }

    static func empty(_ status: Int) -> Data {
        response(status, body: Data(), contentType: nil, headOnly: false)
    }

    static func json(_ status: Int, _ object: [String: Any], headOnly: Bool) -> Data {
        let data = (try? JSONSerialization.data(withJSONObject: object, options: [])) ?? Data("{}".utf8)
        return response(status, body: data, contentType: "application/json; charset=utf-8", headOnly: headOnly)
    }

    static func response(_ status: Int, body: Data, contentType: String?, headOnly: Bool) -> Data {
        let reason: String
        switch status {
        case 200: reason = "OK"
        case 400: reason = "Bad Request"
        case 403: reason = "Forbidden"
        case 404: reason = "Not Found"
        case 405: reason = "Method Not Allowed"
        default: reason = "Error"
        }
        var head = "HTTP/1.1 \(status) \(reason)\r\n"
        head += "Cache-Control: no-store\r\n"
        head += "Connection: close\r\n"
        if let contentType = contentType { head += "Content-Type: \(contentType)\r\n" }
        head += "Content-Length: \(body.count)\r\n\r\n"
        var data = Data(head.utf8)
        if !headOnly { data.append(body) }
        return data
    }
}

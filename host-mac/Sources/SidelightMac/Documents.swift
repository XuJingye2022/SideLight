import Foundation
import CryptoKit

enum HostError: String, Error {
    case badRequest = "BAD_REQUEST"
    case readonly = "READONLY"
    case fileLocked = "FILE_LOCKED"
    case pathChanged = "PATH_CHANGED"
    case fileGone = "FILE_GONE"
    case encoding = "ENCODING"
    case tooLarge = "TOO_LARGE"
    case eolMismatch = "EOL_MISMATCH"
    case io = "IO"
    case noPath = "NO_PATH"
    case stale = "STALE"
    case noStateDir = "NO_STATE_DIR"
    case noDoc = "NO_DOC"
}

let gb18030: String.Encoding = {
    let cf = CFStringConvertEncodingToNSStringEncoding(CFStringEncoding(CFStringEncodings.GB_18030_2000.rawValue))
    return String.Encoding(rawValue: cf)
}()

struct DocMeta {
    let path: String
    let fileName: String
    let encoding: String
    let bom: Bool
    let eol: String
    let endsWithNewline: Bool
    let lineCount: Int
    let size: Int
    let mtime: Int64
    let text: String
    let lineEols: [String]
}

enum DocCodec {
    static func mtime(_ path: String) -> Int64 {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: path),
              let date = attrs[.modificationDate] as? Date else { return 0 }
        return Int64(date.timeIntervalSince1970 * 1000)
    }

    static func size(_ path: String) -> Int {
        guard let attrs = try? FileManager.default.attributesOfItem(atPath: path) else { return -1 }
        return (attrs[.size] as? NSNumber)?.intValue ?? -1
    }

    static func decode(_ data: Data) throws -> (String, String, Bool) {
        if data.count >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF {
            guard let text = String(data: data.subdata(in: 3..<data.count), encoding: .utf8) else { throw HostError.encoding }
            return (text, "utf-8", true)
        }
        if data.count >= 2 && data[0] == 0xFF && data[1] == 0xFE {
            guard let text = String(data: data.subdata(in: 2..<data.count), encoding: .utf16LittleEndian) else { throw HostError.encoding }
            return (text, "utf-16le", true)
        }
        if data.count >= 2 && data[0] == 0xFE && data[1] == 0xFF {
            guard let text = String(data: data.subdata(in: 2..<data.count), encoding: .utf16BigEndian) else { throw HostError.encoding }
            return (text, "utf-16be", true)
        }
        if let text = String(data: data, encoding: .utf8) { return (text, "utf-8", false) }
        if let text = String(data: data, encoding: gb18030) { return (text, "gb18030", false) }
        throw HostError.encoding
    }

    static func readDoc(path: String) throws -> DocMeta {
        let fm = FileManager.default
        var isDir: ObjCBool = false
        guard fm.fileExists(atPath: path, isDirectory: &isDir), !isDir.boolValue else { throw HostError.fileGone }
        let size = DocCodec.size(path)
        if size > 32 * 1024 * 1024 { throw HostError.tooLarge }
        guard let data = fm.contents(atPath: path) else { throw HostError.fileGone }
        let (text, encoding, bom) = try DocCodec.decode(data)
        for scalar in text.unicodeScalars where scalar.value == 0 { throw HostError.encoding }

        let scalars = Array(text.unicodeScalars)
        var eols: [String] = []
        for idx in scalars.indices where scalars[idx] == "\n" {
            eols.append(idx > 0 && scalars[idx - 1] == "\r" ? "crlf" : "lf")
        }
        let crlf = eols.filter { $0 == "crlf" }.count
        let eol: String
        if crlf > 0 && crlf < eols.count { eol = "mixed" }
        else if crlf > 0 { eol = "crlf" }
        else { eol = "lf" }
        let normalized = text.replacingOccurrences(of: "\r\n", with: "\n")
        return DocMeta(
            path: path,
            fileName: (path as NSString).lastPathComponent,
            encoding: encoding,
            bom: bom,
            eol: eol,
            endsWithNewline: text.hasSuffix("\n"),
            lineCount: normalized.components(separatedBy: "\n").count,
            size: size,
            mtime: DocCodec.mtime(path),
            text: normalized,
            lineEols: eols
        )
    }

    static func encode(_ text: String, encoding: String) throws -> Data {
        switch encoding {
        case "gb18030":
            guard let data = text.data(using: gb18030, allowLossyConversion: false) else { throw HostError.encoding }
            return data
        case "utf-16le":
            guard let data = text.data(using: .utf16LittleEndian, allowLossyConversion: false) else { throw HostError.encoding }
            return data
        case "utf-16be":
            guard let data = text.data(using: .utf16BigEndian, allowLossyConversion: false) else { throw HostError.encoding }
            return data
        default:
            guard let data = text.data(using: .utf8, allowLossyConversion: false) else { throw HostError.encoding }
            return data
        }
    }

    static func bomBytes(encoding: String) -> Data {
        switch encoding {
        case "utf-16le": return Data([0xFF, 0xFE])
        case "utf-16be": return Data([0xFE, 0xFF])
        default: return Data([0xEF, 0xBB, 0xBF])
        }
    }

    static func makeBody(meta: DocMeta, text: String) throws -> String {
        let trimmed = text.hasSuffix("\n") ? String(text.dropLast(while: { $0 == "\n" })) : text
        let lf = meta.endsWithNewline ? trimmed + "\n" : trimmed
        if meta.eol == "mixed" {
            let lines = lf.components(separatedBy: "\n")
            if lines.count != meta.lineCount || meta.lineEols.count != lines.count - 1 { throw HostError.eolMismatch }
            var out = ""
            for (idx, line) in lines.enumerated() {
                out += line
                if idx < lines.count - 1 { out += meta.lineEols[idx] == "crlf" ? "\r\n" : "\n" }
            }
            return out
        }
        if meta.eol == "crlf" { return lf.replacingOccurrences(of: "\n", with: "\r\n") }
        return lf
    }

    static func save(meta: DocMeta, text: String) throws -> (bytes: Int, mtime: Int64) {
        if text == meta.text { return (meta.size, meta.mtime) }
        let fm = FileManager.default
        guard fm.fileExists(atPath: meta.path) else { throw HostError.fileGone }
        guard fm.isWritableFile(atPath: meta.path) else { throw HostError.readonly }
        if DocCodec.mtime(meta.path) != meta.mtime || DocCodec.size(meta.path) != meta.size { throw HostError.pathChanged }

        let body = try DocCodec.makeBody(meta: meta, text: text)
        var payload = try DocCodec.encode(body, encoding: meta.encoding)
        if meta.bom { payload = DocCodec.bomBytes(encoding: meta.encoding) + payload }

        let dir = (meta.path as NSString).deletingLastPathComponent
        let temp = (dir as NSString).appendingPathComponent(".sidelight-tmp-\(UUID().uuidString)")
        guard fm.createFile(atPath: temp, contents: payload) else { throw HostError.io }
        do {
            _ = try fm.replaceItemAt(URL(fileURLWithPath: meta.path), withItemAt: URL(fileURLWithPath: temp))
        } catch {
            try? fm.removeItem(atPath: temp)
            throw HostError.io
        }
        return (payload.count, DocCodec.mtime(meta.path))
    }
}

extension String {
    func dropLast(while predicate: (Character) -> Bool) -> Substring {
        var end = endIndex
        while end > startIndex {
            let prev = index(before: end)
            if !predicate(self[prev]) { break }
            end = prev
        }
        return self[startIndex..<end]
    }
}

enum CacheKey {
    static func of(_ fileName: String) -> String {
        var name = (fileName as NSString).lastPathComponent
        if let dot = name.lastIndex(of: "."), dot != name.startIndex {
            name = String(name[..<dot])
        }
        var cleaned = ""
        for scalar in name.unicodeScalars {
            let v = scalar.value
            let ok = (v >= 48 && v <= 57) || (v >= 65 && v <= 90) || (v >= 97 && v <= 122)
                || v == 95 || v == 45 || (v >= 0x4E00 && v <= 0x9FA5)
            cleaned.append(ok ? Character(scalar) : "-")
        }
        while cleaned.contains("--") { cleaned = cleaned.replacingOccurrences(of: "--", with: "-") }
        cleaned = cleaned.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        if cleaned.isEmpty { return "untitled" }
        if cleaned.count <= 40 { return cleaned }
        let head = String(cleaned.prefix(36)).trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return head + "-" + fnv1a4(cleaned)
    }

    private static func fnv1a4(_ value: String) -> String {
        var hash: UInt32 = 2166136261
        for byte in value.utf8 {
            hash ^= UInt32(byte)
            hash = hash &* 16777619
        }
        return String(format: "%04x", hash & 0xFFFF)
    }
}

struct RecentItem: Codable {
    var id: String
    var path: String
    var name: String
    var dir: String
    var seq: Int64
    var openedAt: Int64
    var size: Int64
    var mtime: Int64
}

struct RecentFile: Codable {
    var v: Int
    var seq: Int64
    var items: [RecentItem]
}

final class HostStore {
    static let shared = HostStore()

    private let lock = NSLock()
    private let fm = FileManager.default
    private(set) var meta: DocMeta?
    private(set) var currentPath: String?
    private var recent = RecentFile(v: 1, seq: 0, items: [])
    private var snapshot: [RecentItem]?
    private(set) var lastError: String?
    private var stateDir: String?
    private(set) var stateKind = "none"

    private init() {
        let resolved = HostStore.resolveStateDir()
        stateDir = resolved.dir
        stateKind = resolved.kind
        loadRecent()
    }

    // MARK: state dir

    private static func resolveStateDir() -> (dir: String?, kind: String) {
        let fm = FileManager.default
        if let base = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
            let dir = base.appendingPathComponent("Sidelight", isDirectory: true).path
            if makeWritable(dir) { return (dir, "localappdata") }
        }
        let temp = NSTemporaryDirectory() + "Sidelight"
        if makeWritable(temp) { return (temp, "temp") }
        return (nil, "none")
    }

    private static func makeWritable(_ dir: String) -> Bool {
        do {
            let fm = FileManager.default
            try fm.createDirectory(atPath: dir, withIntermediateDirectories: true)
            let probe = (dir as NSString).appendingPathComponent(".probe-\(UUID().uuidString)")
            try "1".write(toFile: probe, atomically: true, encoding: .utf8)
            try? fm.removeItem(atPath: probe)
            return true
        } catch { return false }
    }

    private var recentURL: String? {
        guard let dir = stateDir else { return nil }
        return (dir as NSString).appendingPathComponent("recent.json")
    }

    private func loadRecent() {
        guard let url = recentURL, fm.fileExists(atPath: url), let data = fm.contents(atPath: url) else { return }
        do {
            recent = try JSONDecoder().decode(RecentFile.self, from: data)
            recent.items = Array(recent.items.prefix(8))
        } catch {
            let bad = url + ".bad-\(Int(Date().timeIntervalSince1970 * 1000))"
            try? fm.moveItem(atPath: url, toPath: bad)
            recent = RecentFile(v: 1, seq: 0, items: [])
        }
    }

    private func saveRecent() -> String? {
        guard let url = recentURL else { return "NO_STATE_DIR" }
        do {
            let data = try JSONEncoder().encode(recent)
            try data.write(to: URL(fileURLWithPath: url), options: .atomic)
            return nil
        } catch {
            lastError = "IO"
            return "IO"
        }
    }

    // MARK: doc

    func open(path: String) throws {
        lock.lock(); defer { lock.unlock() }
        meta = try DocCodec.readDoc(path: path)
        currentPath = path
        recordOpen(path)
    }

    func docJSON() -> [String: Any]? {
        lock.lock(); defer { lock.unlock() }
        guard let meta = meta else { return nil }
        return [
            "v": 1,
            "ok": true,
            "fileName": meta.fileName,
            "encoding": meta.encoding,
            "bom": meta.bom,
            "eol": meta.eol,
            "endsWithNewline": meta.endsWithNewline,
            "lineCount": meta.lineCount,
            "size": meta.size,
            "mtime": meta.mtime,
            "readOnly": !fm.isWritableFile(atPath: meta.path),
            "text": meta.text,
        ]
    }

    var hasDoc: Bool {
        lock.lock(); defer { lock.unlock() }
        return meta != nil
    }

    func save(text: String) -> String? {
        lock.lock(); defer { lock.unlock() }
        guard let meta = meta else { return "FILE_GONE" }
        do {
            let result = try DocCodec.save(meta: meta, text: text)
            self.meta = DocMeta(
                path: meta.path, fileName: meta.fileName, encoding: meta.encoding, bom: meta.bom,
                eol: meta.eol, endsWithNewline: meta.endsWithNewline, lineCount: meta.lineCount,
                size: result.bytes, mtime: result.mtime, text: text, lineEols: meta.lineEols
            )
            return nil
        } catch let error as HostError {
            return error.rawValue
        } catch {
            return "IO"
        }
    }

    // MARK: drafts

    func draftPath() -> String? {
        guard let path = currentPath else { return nil }
        let dir = (path as NSString).deletingLastPathComponent
        let key = CacheKey.of((path as NSString).lastPathComponent)
        let drafts = (dir as NSString).appendingPathComponent(".sidelight/drafts")
        return (drafts as NSString).appendingPathComponent("\(key).md")
    }

    func saveDraft(text: String) -> (String?, Int64, Int) {
        lock.lock(); defer { lock.unlock() }
        guard let path = draftPath() else { return ("NO_PATH", 0, 0) }
        if text.utf8.count > 6 * 1024 * 1024 { return ("TOO_LARGE", 0, 0) }
        do {
            try fm.createDirectory(atPath: (path as NSString).deletingLastPathComponent, withIntermediateDirectories: true)
            try Data(text.utf8).write(to: URL(fileURLWithPath: path), options: .atomic)
            return (nil, DocCodec.mtime(path), DocCodec.size(path))
        } catch {
            return ("IO", 0, 0)
        }
    }

    func clearDraft() -> String? {
        lock.lock(); defer { lock.unlock() }
        guard let path = draftPath() else { return "NO_PATH" }
        try? fm.removeItem(atPath: path)
        return nil
    }

    func draftJSON() -> [String: Any]? {
        lock.lock(); defer { lock.unlock() }
        guard let path = draftPath(), let data = fm.contents(atPath: path) else { return ["v": 1, "exists": false] }
        guard let text = String(data: data, encoding: .utf8) else { return ["v": 1, "exists": false] }
        return ["v": 1, "exists": true, "mtime": DocCodec.mtime(path), "size": data.count, "text": text]
    }

    // MARK: recent

    private func recordOpen(_ path: String) {
        let normalized = (path as NSString).standardizingPath
        recent.items.removeAll { $0.path.caseInsensitiveCompare(normalized) == .orderedSame }
        recent.seq += 1
        let id = Self.id(for: normalized)
        let name = (normalized as NSString).lastPathComponent
        let item = RecentItem(id: id, path: normalized, name: name, dir: "",
                              seq: recent.seq, openedAt: Int64(Date().timeIntervalSince1970),
                              size: Int64(DocCodec.size(normalized)), mtime: DocCodec.mtime(normalized))
        recent.items.insert(item, at: 0)
        if recent.items.count > 8 { recent.items = Array(recent.items.prefix(8)) }
        _ = saveRecent()
    }

    static func id(for path: String) -> String {
        let digest = SHA256.hash(data: Data(path.lowercased().utf8))
        return digest.prefix(8).map { String(format: "%02x", $0) }.joined()
    }

    func recentJSON() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        if stateDir == nil {
            return ["v": 1, "state": "disabled", "items": [Any](), "reason": "NO_STATE_DIR"]
        }
        var items: [[String: Any]] = []
        let depths = recent.items.map { _ in 1 }
        for (idx, item) in recent.items.enumerated() {
            items.append(["id": item.id, "seq": item.seq, "name": item.name,
                          "dir": Self.dirOf(item.path, take: depths[idx])])
        }
        var body: [String: Any] = ["v": 1, "state": stateKind == "temp" ? "volatile" : "ok", "items": items]
        if let error = lastError { body["lastError"] = error; lastError = nil }
        return body
    }

    static func dirOf(_ path: String, take: Int) -> String {
        var parts: [String] = []
        var dir = (path as NSString).deletingLastPathComponent
        while !dir.isEmpty && parts.count < take {
            let name = (dir as NSString).lastPathComponent
            if name.isEmpty || name == "/" { break }
            parts.insert(name, at: 0)
            let parent = (dir as NSString).deletingLastPathComponent
            if parent == dir { break }
            dir = parent
        }
        return parts.joined(separator: "/")
    }

    func item(id: String) -> RecentItem? {
        lock.lock(); defer { lock.unlock() }
        return recent.items.first { $0.id == id }
    }

    func removeRecent(id: String, seq: Int64) -> String? {
        lock.lock(); defer { lock.unlock() }
        guard let idx = recent.items.firstIndex(where: { $0.id == id }), recent.items[idx].seq == seq else { return "STALE" }
        recent.items.remove(at: idx)
        return saveRecent()
    }

    func clearRecent() -> String? {
        lock.lock(); defer { lock.unlock() }
        snapshot = recent.items
        recent.items = []
        let error = saveRecent()
        if error != nil, let snapshot = snapshot { recent.items = snapshot }
        return error
    }

    func restoreRecent() -> String? {
        lock.lock(); defer { lock.unlock() }
        guard let snapshot = snapshot else { return "STALE" }
        recent.items = snapshot
        self.snapshot = nil
        return saveRecent()
    }

    func recentItems() -> [RecentItem] {
        lock.lock(); defer { lock.unlock() }
        return recent.items
    }
}

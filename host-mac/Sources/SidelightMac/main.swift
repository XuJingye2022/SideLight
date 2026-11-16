import AppKit
import Darwin

let arguments = CommandLine.arguments
if arguments.contains("--version") {
    let version = (Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String) ?? "unknown"
    print("Sidelight \(version)")
    exit(0)
}
if arguments.contains("--self-test") {
    exit(SelfTest.run())
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.regular)
application.run()

import AppKit
import Darwin

let arguments = CommandLine.arguments
if arguments.contains("--self-test") {
    exit(SelfTest.run())
}

let application = NSApplication.shared
let delegate = AppDelegate()
application.delegate = delegate
application.setActivationPolicy(.regular)
application.run()

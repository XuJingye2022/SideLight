// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SidelightMac",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "SidelightMac",
            path: "Sources/SidelightMac"
        )
    ]
)

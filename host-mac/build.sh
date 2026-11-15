#!/usr/bin/env bash
# 打 macOS 应用包：swift build -> Sidelight.app -> Resources/www -> icns -> ad-hoc codesign -> release/*.zip
# 只在 macOS 上跑（CI 的 macos-14）；本机（Windows）不编译。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$ROOT/host-mac"
VERSION="$(cd "$ROOT" && node -p "require('./package.json').version")"
APP="$ROOT/.tmp/mac/Sidelight.app"
ICONSET="$ROOT/.tmp/mac/Sidelight.iconset"

swift build -c release --package-path "$HOST"
BIN="$(swift build -c release --package-path "$HOST" --show-bin-path)/SidelightMac"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/SidelightMac"
sed "s/__VERSION__/$VERSION/g" "$HOST/Info.plist" > "$APP/Contents/Info.plist"

if [ ! -d "$ROOT/dist" ]; then
  echo "dist/ missing: run npm run build first" >&2
  exit 1
fi
cp -R "$ROOT/dist" "$APP/Contents/Resources/www"

# 图标：ico -> png -> iconset -> icns。任何一步失败都跳过，不影响出包。
ICON_SRC="$ROOT/packaging/sidelight.ico"
if [ -f "$ICON_SRC" ]; then
  rm -rf "$ICONSET"
  mkdir -p "$ICONSET"
  if sips -s format png "$ICON_SRC" --out "$ROOT/.tmp/mac/icon.png" >/dev/null 2>&1; then
    for size in 16 32 64 128 256 512; do
      sips -z "$size" "$size" "$ROOT/.tmp/mac/icon.png" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null 2>&1 || true
    done
    if [ -f "$ICONSET/icon_128x128.png" ]; then
      cp "$ICONSET/icon_128x128.png" "$ICONSET/icon_128x128@2x.png" 2>/dev/null || true
    fi
    if [ -f "$ICONSET/icon_256x256.png" ]; then
      cp "$ICONSET/icon_256x256.png" "$ICONSET/icon_256x256@2x.png" 2>/dev/null || true
    fi
    iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/Sidelight.icns" >/dev/null 2>&1 || true
  fi
fi

codesign --force --deep --sign - "$APP"

mkdir -p "$ROOT/release"
ARCH="$(uname -m)"
ZIP="$ROOT/release/Sidelight-${VERSION}-macos-${ARCH}.zip"
rm -f "$ZIP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
echo "app=$APP"
echo "zip=$ZIP bytes=$(stat -f%z "$ZIP")"

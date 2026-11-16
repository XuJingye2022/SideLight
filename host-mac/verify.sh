#!/usr/bin/env bash
# macOS 应用包静态断言：双架构、universal、minos 13.0、Info.plist、签名、zip 内容。
# 用法：bash host-mac/verify.sh <Sidelight.app> [zip]
set -euo pipefail

APP="${1:?usage: verify.sh <Sidelight.app> [zip]}"
ZIP="${2:-}"
BIN="$APP/Contents/MacOS/SidelightMac"

fail() {
  echo "::error::verify: $*" >&2
  exit 1
}

[ -d "$APP" ] || fail "app 不存在：$APP"
[ -f "$BIN" ] || fail "可执行文件不存在：$BIN"
[ -f "$APP/Contents/Resources/www/index.html" ] || fail "缺少 Resources/www/index.html"

ARCHS="$(lipo -archs "$BIN")"
echo "lipo -archs: $ARCHS"
for want in arm64 x86_64; do
  case " $ARCHS " in
    *" $want "*) : ;;
    *) fail "缺 $want 片（lipo -archs: $ARCHS）；单切片视为失败" ;;
  esac
done

if ! file "$BIN" | grep -q "universal binary"; then
  fail "不是 universal binary：$(file "$BIN")"
fi

for arch in arm64 x86_64; do
  minos="$(otool -arch "$arch" -l "$BIN" | grep -m1 "minos" | awk '{print $2}')"
  [ "$minos" = "13.0" ] || fail "$arch 的 minos=$minos，期望 13.0"
done

plutil -lint "$APP/Contents/Info.plist" >/dev/null || fail "Info.plist 格式不合法"
MINVER="$(plutil -extract LSMinimumSystemVersion raw "$APP/Contents/Info.plist")"
[ "$MINVER" = "13.0" ] || fail "LSMinimumSystemVersion=$MINVER，期望 13.0"

APP_VERSION="$(plutil -extract CFBundleShortVersionString raw "$APP/Contents/Info.plist")"
[ -n "$APP_VERSION" ] && [ "$APP_VERSION" != "__VERSION__" ] || fail "版本号未替换：$APP_VERSION"

codesign --verify --strict --all-architectures "$APP" || fail "codesign 校验失败"
echo "codesign: $(codesign -dv "$APP" 2>&1 | grep -m1 'Authority=' || echo 'adhoc')"

if [ -n "$ZIP" ]; then
  unzip -t "$ZIP" >/dev/null || fail "zip 损坏：$ZIP"
  unzip -l "$ZIP" | grep -q "README.txt" || fail "zip 内缺 README.txt"
fi

echo "verify: PASS ($ARCHS${ZIP:+, zip ok})"

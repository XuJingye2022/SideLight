#!/usr/bin/env bash
# 打 macOS Universal（arm64 + x86_64）应用包：
#   swift build --triple 两次 -> lipo 合并 -> .app -> Resources/www -> 图标 -> ad-hoc 签名
#   -> verify.sh 静态断言 -> release/Sidelight-<版本>-macos-universal.zip（根目录含 .app 与 README.txt）
# 只在 macOS 上跑（CI 的 macos-latest）；本机（Windows）不编译。
# 本地单架构调试：bash host-mac/build.sh --single-arch（CI/发布不传这个参数）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="$ROOT/host-mac"
VERSION="$(cd "$ROOT" && node -p "require('./package.json').version")"
SLICES="$ROOT/.tmp/mac/swift-build"
STAGE="$ROOT/.tmp/mac/stage"
APP="$STAGE/Sidelight.app"
ZIP="$ROOT/release/Sidelight-${VERSION}-macos-universal.zip"
UNIVERSAL="$ROOT/.tmp/mac/SidelightMac.universal"

SINGLE_ARCH=0
for arg in "$@"; do
  if [ "$arg" = "--single-arch" ]; then SINGLE_ARCH=1; fi
done

if [ ! -d "$ROOT/dist" ]; then
  echo "dist/ missing: run npm run build first" >&2
  exit 1
fi
if ! command -v swift >/dev/null 2>&1; then
  echo "swift not found: need macOS + Xcode Command Line Tools" >&2
  exit 1
fi

mkdir -p "$ROOT/.tmp/mac" "$ROOT/release" "$SLICES"

# 每片构建：--package-path / --triple / --scratch-path 三个参数在 BUILD 数组里只定义一处，
# --show-bin-path 用同一个数组，否则会取回默认 .build 目录、把 arm64 当成两片。
build_slice() {
  local arch="$1"
  local triple="$arch-apple-macosx13.0"
  local scratch="$SLICES/$arch"
  local -a BUILD=(swift build -c release --package-path "$HOST" --triple "$triple" --scratch-path "$scratch")
  echo "==> swift build $arch ($triple)" >&2
  "${BUILD[@]}" >&2
  local bin_dir
  bin_dir="$("${BUILD[@]}" --show-bin-path | tail -1)"
  if [ ! -d "$bin_dir" ] || [ ! -f "$bin_dir/SidelightMac" ]; then
    echo "::error::$arch 构建产物缺失：$bin_dir/SidelightMac" >&2
    return 1
  fi
  local out="$SLICES/$arch/SidelightMac-$arch"
  cp "$bin_dir/SidelightMac" "$out"
  local archs
  archs="$(lipo -archs "$out" | tr -d '\n')"
  if [ "$archs" != "$arch" ]; then
    echo "::error::$arch 片不是单一架构：$archs" >&2
    return 1
  fi
  echo "$out"
}

# 备选：--arch（--triple 交叉编译失败时用；日志里记录）
build_slice_arch() {
  local arch="$1"
  local scratch="$SLICES/$arch-alt"
  local -a BUILD=(swift build -c release --package-path "$HOST" --arch "$arch" --scratch-path "$scratch")
  echo "==> swift build --arch $arch（备选路径）" >&2
  "${BUILD[@]}" >&2
  local bin_dir
  bin_dir="$("${BUILD[@]}" --show-bin-path | tail -1)"
  if [ ! -d "$bin_dir" ] || [ ! -f "$bin_dir/SidelightMac" ]; then
    echo "::error::$arch --arch 构建产物缺失" >&2
    return 1
  fi
  local out="$SLICES/$arch/SidelightMac-$arch"
  cp "$bin_dir/SidelightMac" "$out"
  local archs
  archs="$(lipo -archs "$out" | tr -d '\n')"
  if [ "$archs" != "$arch" ]; then
    echo "::error::$arch --arch 片不是单一架构：$archs" >&2
    return 1
  fi
  echo "$out"
}

ARM_BIN="$(build_slice arm64)"
if [ "$SINGLE_ARCH" = "1" ]; then
  cp "$ARM_BIN" "$UNIVERSAL"
else
  if ! X86_BIN="$(build_slice x86_64)"; then
    echo "::warning::--triple x86_64 失败，尝试 --arch x86_64" >&2
    if ! X86_BIN="$(build_slice_arch x86_64)"; then
      echo "::error::x86_64 片未产出，Universal 未产出，禁止发布" >&2
      exit 1
    fi
  fi
  lipo -create -output "$UNIVERSAL" "$ARM_BIN" "$X86_BIN"
  MERGED="$(lipo -archs "$UNIVERSAL")"
  echo "lipo -archs: $MERGED" >&2
  for want in arm64 x86_64; do
    case " $MERGED " in
      *" $want "*) : ;;
      *) echo "::error::lipo 后缺少 $want 片：$MERGED" >&2; exit 1 ;;
    esac
  done
  if ! file "$UNIVERSAL" | grep -q "universal binary"; then
    echo "::error::不是 universal binary：$(file "$UNIVERSAL")" >&2
    exit 1
  fi
fi

rm -rf "$STAGE"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
# 顺序必须是 lipo 之后再进 .app，最后才签名；先签再 lipo 会毁签名。
cp "$UNIVERSAL" "$APP/Contents/MacOS/SidelightMac"
chmod +x "$APP/Contents/MacOS/SidelightMac"
sed "s/__VERSION__/$VERSION/g" "$HOST/Info.plist" > "$APP/Contents/Info.plist"
cp -R "$ROOT/dist" "$APP/Contents/Resources/www"

# 图标：ico -> png -> iconset -> icns。失败只警告，不挡出包。
ICON_SRC="$ROOT/packaging/sidelight.ico"
if [ -f "$ICON_SRC" ]; then
  ICONSET="$ROOT/.tmp/mac/Sidelight.iconset"
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
    if ! iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/Sidelight.icns" >/dev/null 2>&1; then
      echo "::warning::icns 生成失败，App 将没有自定义图标" >&2
    fi
  else
    echo "::warning::ico 转 png 失败，跳过图标" >&2
  fi
fi

cp "$ROOT/packaging/macos-README.txt" "$STAGE/README.txt"

# 默认 ad-hoc；有证书时由 sign.sh 覆盖成 Developer ID + 公证。
codesign --force --sign - "$APP"
bash "$HOST/verify.sh" "$APP"

rm -f "$ROOT"/release/Sidelight-*-macos-*.zip
ditto -c -k --sequesterRsrc "$STAGE" "$ZIP"
bash "$HOST/verify.sh" "$APP" "$ZIP"

echo "app=$APP"
echo "zip=$ZIP bytes=$(stat -f%z "$ZIP")"
echo "signing=adhoc"

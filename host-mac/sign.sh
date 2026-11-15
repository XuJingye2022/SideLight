#!/usr/bin/env bash
# macOS Developer ID 签名 + 公证 + staple + 重打发布 zip。
# 用法：bash host-mac/sign.sh <Sidelight.app> <STAGE_DIR> <ZIP>
# 需要的环境变量（由 release.yml 的 job env 注入）：
#   APPLE_CERT_P12_BASE64、APPLE_CERT_PASSWORD、APPLE_SIGN_IDENTITY、
#   APPLE_TEAM_ID、APPLE_ID、APPLE_APP_SPECIFIC_PASSWORD
# 没有这些变量时不要调用本脚本（由 workflow 的 HAS_APPLE_SIGNING 控制）；失败必须让 job 失败，不静默降级。
set -euo pipefail

APP="${1:?usage: sign.sh <Sidelight.app> <STAGE_DIR> <ZIP>}"
STAGE="${2:?usage: sign.sh <Sidelight.app> <STAGE_DIR> <ZIP>}"
ZIP="${3:?usage: sign.sh <Sidelight.app> <STAGE_DIR> <ZIP>}"

KEYCHAIN="build.keychain"
KEYCHAIN_PASSWORD="$(uuidgen)"
RUNNER_TEMP="${RUNNER_TEMP:-$(mktemp -d)}"
ORIGINAL_KEYCHAINS="$(security list-keychains -d user | tr -d '"' | tr '\n' ' ')"
NOTARY_ZIP="$RUNNER_TEMP/Sidelight-notarize.zip"

cleanup() {
  security list-keychains -d user -s $ORIGINAL_KEYCHAINS >/dev/null 2>&1 || true
  security delete-keychain "$KEYCHAIN" >/dev/null 2>&1 || true
}
trap cleanup EXIT

[ -n "${APPLE_CERT_P12_BASE64:-}" ] || { echo "::error::APPLE_CERT_P12_BASE64 为空" >&2; exit 1; }
[ -n "${APPLE_SIGN_IDENTITY:-}" ] || { echo "::error::APPLE_SIGN_IDENTITY 为空" >&2; exit 1; }
[ -f "$APP/Contents/MacOS/SidelightMac" ] || { echo "::error::app 不存在：$APP" >&2; exit 1; }

echo "==> 导入证书到临时 keychain"
echo "$APPLE_CERT_P12_BASE64" | base64 --decode > "$RUNNER_TEMP/cert.p12"
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
security import "$RUNNER_TEMP/cert.p12" -k "$KEYCHAIN" -P "$APPLE_CERT_PASSWORD" -T /usr/bin/codesign
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
security list-keychains -d user -s "$KEYCHAIN"
if ! security find-identity -v -p codesigning "$KEYCHAIN" | grep -q "Developer ID Application"; then
  echo "::error::keychain 里没有 Developer ID Application 身份" >&2
  security find-identity -v -p codesigning "$KEYCHAIN" >&2 || true
  exit 1
fi

echo "==> 签名（hardened runtime + timestamp，不加 --deep）"
codesign --force --options runtime --timestamp --keychain "$KEYCHAIN" --sign "$APPLE_SIGN_IDENTITY" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

echo "==> 公证（提交只含 .app 的 zip）"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$NOTARY_ZIP"
set +e
NOTARY_OUT="$(xcrun notarytool submit "$NOTARY_ZIP" \
  --apple-id "$APPLE_ID" \
  --password "$APPLE_APP_SPECIFIC_PASSWORD" \
  --team-id "$APPLE_TEAM_ID" \
  --wait --timeout 20m 2>&1)"
NOTARY_CODE=$?
set -e
echo "$NOTARY_OUT"
NOTARY_ID="$(echo "$NOTARY_OUT" | awk '/  id: /{print $2; exit}')"
if [ "$NOTARY_CODE" -ne 0 ] || ! echo "$NOTARY_OUT" | grep -q "status: Accepted"; then
  echo "::error::公证未通过（exit=$NOTARY_CODE）" >&2
  if [ -n "$NOTARY_ID" ]; then
    xcrun notarytool log "$NOTARY_ID" --apple-id "$APPLE_ID" --password "$APPLE_APP_SPECIFIC_PASSWORD" --team-id "$APPLE_TEAM_ID" >&2 || true
  fi
  exit 1
fi

echo "==> staple 与 Gatekeeper 评估"
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl --assess --type execute --verbose=2 "$APP"

echo "==> 用 STAGE_DIR 重打发布 zip（保住 README.txt）"
rm -f "$ZIP"
ditto -c -k --sequesterRsrc "$STAGE" "$ZIP"

echo "signing=developer-id-notarized"
echo "zip=$ZIP bytes=$(stat -f%z "$ZIP")"

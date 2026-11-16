// 生成 Release 正文：六节固定结构 + 签名状态（HTML 注释，不出现在可见正文里）。
// 用法：
//   node scripts/release-notes.mjs [--dir out] [--out out/RELEASE_NOTES.md] [--dry-run]
// 资产名：Sidelight-<版本>-win-x64-setup.exe、-win-x64-portable.zip、-macos-universal.zip
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const at = args.indexOf(name)
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback
}
const dryRun = args.includes('--dry-run')
const root = resolve('.')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const dir = resolve(readArg('--dir', 'out'))
const outFile = resolve(readArg('--out', join(dir, 'RELEASE_NOTES.md')))

function changelogSection() {
  const text = readFileSync(join(root, 'docs/CHANGELOG.md'), 'utf8')
  const start = text.indexOf('## ' + version + ' — ')
  if (start < 0) return []
  const rest = text.slice(start)
  const end = rest.indexOf('\n## ', 1)
  const section = end >= 0 ? rest.slice(0, end) : rest
  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('- '))
    .slice(0, 6)
    .map((line) => line.replace(/^- /, ''))
}

const assets = [
  { platform: 'Windows 安装包', file: 'Sidelight-' + version + '-win-x64-setup.exe' },
  { platform: 'Windows 便携 zip', file: 'Sidelight-' + version + '-win-x64-portable.zip' },
  { platform: 'macOS Universal zip', file: 'Sidelight-' + version + '-macos-universal.zip' },
]

function assetInfo(asset) {
  const path = join(dir, asset.file)
  if (!existsSync(path)) return { ...asset, bytes: '（待出包）', sha: '（待出包）' }
  const data = readFileSync(path)
  return { ...asset, bytes: String(data.length), sha: createHash('sha256').update(data).digest('hex') }
}

function signingStatus() {
  if (process.env.SIGNING) return process.env.SIGNING
  const file = join(dir, 'signing.txt')
  if (existsSync(file)) {
    const line = readFileSync(file, 'utf8').split(/\r?\n/).find((row) => row.startsWith('signing='))
    if (line) return line.slice('signing='.length).trim()
  }
  return 'adhoc'
}

const status = signingStatus()
const signed = status === 'developer-id-notarized'
const rows = assets.map(assetInfo)
const updates = changelogSection()
const hashRows = rows.map((row) => '| ' + row.platform + ' | ' + row.file + ' | ' + row.bytes + ' | ' + row.sha + ' |')
const noteLine = signed
  ? '**已签名并公证**（Developer ID）：首次打开通常不需要额外步骤。'
  : '**未签名、未公证**（ad-hoc 签名）：首次打开需要按下面的步骤操作。'
const updateLines = updates.length > 0
  ? updates.map((line) => '- ' + line)
  : ['- 见 [CHANGELOG](https://github.com/XuJingye2022/SideLight/blob/main/docs/CHANGELOG.md) 的 ' + version + ' 一节。']

const lines = [
  '<!-- signing=' + status + '（不要删这行；发布正文用 HTML 注释记录签名状态） -->',
  '# Sidelight ' + version,
  '',
  noteLine,
  '',
  '## 本次更新',
  '',
  ...updateLines,
  '',
  '## 下载',
  '',
  '| 平台 | 文件 | 字节 | SHA256 |',
  '| :--- | :--- | ---: | :--- |',
  ...hashRows,
  '',
  '## 安装',
  '',
  '### Windows',
  '',
  '1. 下载 `Sidelight-' + version + '-win-x64-setup.exe`，双击安装（per-user，无需管理员，装到 `%LOCALAPPDATA%\\Programs\\Sidelight`）。',
  '2. SmartScreen 可能提示「Windows 已保护你的电脑」：点「更多信息 → 仍要运行」。',
  '3. 需要 WebView2 运行时；Windows 11 一般自带，缺失时安装器会给下载指引。',
  '4. 不想安装就用便携 zip，解压即用。',
  '5. 卸载在「设置 → 应用」里；卸载不删 `%LOCALAPPDATA%\\Sidelight`。',
  '',
  '### macOS',
  '',
  '1. 下载 `Sidelight-' + version + '-macos-universal.zip`，解压后把 `Sidelight.app` 拖进「应用程序」。',
  '2. **macOS 15+**：先双击一次 App（提示里只有「完成」是正常的）→「系统设置 → 隐私与安全性」→「仍要打开」→ 再双击 →「打开」。',
  '3. **macOS 13–14**：右键（或按住 Control 点）App →「打开」→ 再点「打开」。',
  '4. 命令行去隔离：`xattr -dr com.apple.quarantine "/Applications/Sidelight.app"`（路径含空格要加引号）。',
  '5. 每次更新后都要重做一次首次打开步骤；提示「已损坏」时先核对 SHA256 再重试。',
  '',
  '## 校验',
  '',
  '```bash',
  'shasum -a 256 Sidelight-' + version + '-*',
  '```',
  '',
  'Windows 可用 `Get-FileHash -Algorithm SHA256`。结果应与上面的 SHA256 一致。',
  '',
  '## 数据与卸载',
  '',
  '- 最近记录与 WebView 配置：Windows `%LOCALAPPDATA%\\Sidelight`；macOS `~/Library/Application Support/Sidelight`。',
  '- 草稿、批注、trash：文档同目录 `.sidelight/`。',
  '- 卸载不删上面这些目录；要彻底清掉请手动删除。',
  '',
  '## 未验与已知限制',
  '',
  '- ' + (signed ? '已签名并公证，但仍无自动更新。' : '未签名、未公证；首次打开需要按步骤操作。'),
  '- 性能只测了载入：1 MB 载入 1284 ms（旧 5.8–9.3 s），10 KB p95 4.47 ms；**100 KB 与 1 MB 的逐键 p95 未测**，不作为验收依据。',
  '- 可访问性有 P2 延后项：骨架 `role="dialog"`/`aria-busy`、批注卡 Enter 跳句、正文开头 Tab 回环，本轮不做。',
  '- macOS 真机运行、真实签名/公证、Intel 实机（含 Rosetta）都未验证；`-macos-universal` 的架构断言只在 CI 跑过。',
  '- 0.30.1 保存成功后可能残留含正文的草稿：升级到 0.30.2 后，**打开该文档再保存一次**，或手动删 `.sidelight/drafts/`。',
  '- 没有自动更新；升级要手动下载新包（覆盖安装，数据保留）。',
  '- Windows 不关联 `.md` 默认程序（安装时可选加入「打开方式」）。',
  '- 公式渲染依赖 KaTeX，首次渲染时才加载；离线时可能加载失败。',
  '- 详见 [README 的「现在不能做什么」](https://github.com/XuJingye2022/SideLight#现在不能做什么)。',
  '',
]

const notes = lines.join('\n')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
if (!dryRun) {
  writeFileSync(outFile, notes)
  console.log('release notes: ' + outFile)
}
console.log(notes)

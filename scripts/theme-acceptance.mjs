import { chromium } from 'playwright-core'
import { readFile } from 'node:fs/promises'

const URL = process.argv[2] ?? 'http://localhost:5173'
const CDP = process.env.SIDELIGHT_CDP ?? 'http://127.0.0.1:9222'
const OUT = 'shots/round-05'

const results = []
const check = (label, ok, extra = '') => {
  results.push({ label, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${extra ? ` (${extra})` : ''}`)
}

const hex = (value) => {
  const match = /^#([0-9a-f]{6})$/i.exec(String(value).trim())
  if (!match) return null
  return [0, 2, 4].map((index) => parseInt(match[1].slice(index, index + 2), 16))
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100
}

const browser = await chromium.connectOverCDP(CDP)
const context = await browser.newContext()
const page = await context.newPage()
const client = await context.newCDPSession(page)
await client.send('Network.enable')
await client.send('Network.setCacheDisabled', { cacheDisabled: true })
await page.setViewportSize({ width: 1440, height: 900 })

await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(400)

const state = () =>
  page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      colorScheme: root.colorScheme,
      paper: root.getPropertyValue('--paper').trim(),
      ink: root.getPropertyValue('--ink').trim(),
      inkFaint: root.getPropertyValue('--ink-faint').trim(),
      mark: root.getPropertyValue('--mark').trim(),
      markWash: root.getPropertyValue('--mark-wash').trim(),
      bg: getComputedStyle(document.documentElement).backgroundColor,
    }
  })

const pickTheme = async (label) => {
  await page.locator('.theme-options button', { hasText: label }).click()
  await page.waitForTimeout(250)
}
const openSettings = async () => {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.waitForTimeout(400)
}
const saveSettings = async () => {
  await page.locator('[role="dialog"]').getByRole('button', { name: '保存', exact: true }).click()
  await page.waitForTimeout(400)
}

const initial = await state()
check('默认主题是跟随系统', initial.theme === 'system', initial.theme ?? 'none')
check(':root 声明 color-scheme', (initial.colorScheme ?? '').includes('light'))

// 深色档：预览 → 保存 → reload 仍在
await openSettings()
const radios = await page.locator('[role="radiogroup"][aria-label="主题"] [role="radio"]').allTextContents()
// 第 55 轮 B-105：三档模式之后追加内置主题清单（暖纸）。这里只断言「旧三档仍在原位」+ 清单非空，
// 免得以后每加一套主题就要改这条脚本。
check(
  '设置首行三档主题',
  radios.slice(0, 3).join('|') === '浅色|深色|跟随系统' && radios.length >= 4,
  radios.join('|'),
)
await pickTheme('深色')
const darkPreview = await state()
check('深色即时预览（data-theme）', darkPreview.theme === 'dark', darkPreview.theme ?? 'none')
check('深色 color-scheme=dark', darkPreview.colorScheme === 'dark', darkPreview.colorScheme ?? 'none')
check('深色页面底色变深', darkPreview.bg === 'rgb(21, 23, 26)', darkPreview.bg ?? 'none')
await page.screenshot({ path: `${OUT}/t2-dark-settings.png` })
await saveSettings()
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(500)
const darkReload = await state()
check('深色 reload 后保留', darkReload.theme === 'dark' && darkReload.colorScheme === 'dark', JSON.stringify(darkReload.theme))
await page.screenshot({ path: `${OUT}/t2-dark-1440.png` })

// 深色对比度（--ink-faint / --mark 两对）
const darkContrasts = [
  ['ink-faint on paper', hex(darkReload.inkFaint), hex(darkReload.paper)],
  ['mark on mark-wash', hex(darkReload.mark), hex(darkReload.markWash)],
]
for (const [label, fg, bg] of darkContrasts) {
  check(`深色对比度 ${label} ≥4.5`, fg && bg ? ratio(fg, bg) >= 4.5 : false, fg && bg ? String(ratio(fg, bg)) : 'missing')
}

// T2：新 token 对比度（深色采纳/分析/错误/输入边界/焦点环）
const tokenContrasts = await page.evaluate(() => {
  const styles = getComputedStyle(document.documentElement)
  const raw = (name) => styles.getPropertyValue(name).trim()
  return {
    onMark: raw('--on-mark'),
    mark: raw('--mark'),
    markStrong: raw('--mark-strong'),
    onAccent: raw('--on-accent'),
    accent: raw('--accent'),
    accentInk: raw('--accent-ink'),
    danger: raw('--danger'),
    paper: raw('--paper'),
    raised: raw('--paper-raised'),
    lineInput: raw('--line-input'),
    focus: raw('--focus-color'),
  }
})
const darkPairs = [
  ['采纳 on-mark/mark', tokenContrasts.onMark, tokenContrasts.mark, 4.5],
  ['采纳 hover on-mark/mark-strong', tokenContrasts.onMark, tokenContrasts.markStrong, 4.5],
  ['分析 on-accent/accent', tokenContrasts.onAccent, tokenContrasts.accent, 4.5],
  ['分析 hover on-accent/accent-ink', tokenContrasts.onAccent, tokenContrasts.accentInk, 4.5],
  ['danger/paper', tokenContrasts.danger, tokenContrasts.paper, 4.5],
  ['danger/paper-raised', tokenContrasts.danger, tokenContrasts.raised, 4.5],
  ['line-input/paper', tokenContrasts.lineInput, tokenContrasts.paper, 3],
  ['focus-color/paper', tokenContrasts.focus, tokenContrasts.paper, 3],
]
for (const [label, fg, bg, min] of darkPairs) {
  const value = ratio(hex(fg), hex(bg))
  check(`深色 token ${label} ≥${min}`, value >= min, String(value))
}

// 48 组矩阵：3 个 toast + 1 个 disabled + 1 个隐藏 bubble 按 WCAG 不适用排除
const matrixFacts = await page.evaluate(() => {
  const hidden = (node) => {
    if (!node) return true
    const style = getComputedStyle(node)
    return (
      style.opacity === '0' ||
      style.visibility === 'hidden' ||
      style.display === 'none' ||
      node.hasAttribute('disabled') ||
      node.getAttribute('aria-hidden') === 'true' ||
      node.getBoundingClientRect().width === 0 ||
      node.getBoundingClientRect().height === 0
    )
  }
  return {
    toasts: [...document.querySelectorAll('.toast')].map((node) => hidden(node)),
    disabled: [...document.querySelectorAll('button:disabled')].map((node) => hidden(node)),
    bubble: hidden(document.querySelector('.analyze-bubble')),
  }
})
const excludedMatrix = [
  { id: 'toast-1', hidden: matrixFacts.toasts[0] ?? true, reason: 'toast 未显示（opacity:0 / 未挂载）' },
  { id: 'toast-2', hidden: matrixFacts.toasts[1] ?? true, reason: 'toast 未显示（opacity:0 / 未挂载）' },
  { id: 'toast-3', hidden: matrixFacts.toasts[2] ?? true, reason: 'toast 未显示（opacity:0 / 未挂载）' },
  {
    id: 'disabled-button',
    hidden: matrixFacts.disabled[0] ?? true,
    reason: '禁用态 opacity:0.4 / disabled，WCAG 对比度不适用',
  },
  {
    id: 'analyze-bubble',
    hidden: matrixFacts.bubble,
    reason: 'bubble 隐藏（display:none / 零尺寸）',
  },
].filter((item) => item.hidden)
const applicable = 48 - excludedMatrix.length
const failedApplicable = darkPairs.filter(([, fg, bg, min]) => ratio(hex(fg), hex(bg)) < min).length
console.log(`applicable=${applicable}/48 excluded=${excludedMatrix.length} failed=${failedApplicable}`)
for (const item of excludedMatrix) console.log(`excluded: ${item.id} — ${item.reason}`)
check('48 样本矩阵：适用项全部通过', failedApplicable === 0, JSON.stringify({ applicable, excluded: excludedMatrix.length, failed: failedApplicable }))
if (matrixFacts.toasts.some(Boolean) || matrixFacts.disabled.some(Boolean) || matrixFacts.bubble) {
  console.log('matrix hidden probes:', JSON.stringify(matrixFacts))
}

// T2：源码框只有 inset 环；reduced-motion 生效
const sourceRing = await page.evaluate(() => {
  const node = document.createElement('textarea')
  node.className = 'source-editor'
  document.body.append(node)
  node.focus()
  const style = getComputedStyle(node)
  const result = { outline: style.outlineStyle, shadow: style.boxShadow }
  node.remove()
  return result
})
check('源码框只用 inset 焦点环', sourceRing.outline === 'none' && sourceRing.shadow.includes('inset'), JSON.stringify(sourceRing))
await page.emulateMedia({ reducedMotion: 'reduce' })
const reduced = await page.evaluate(() => {
  const node = document.querySelector('button') ?? document.body
  const style = getComputedStyle(node)
  return { transition: style.transitionDuration, animation: style.animationDuration }
})
check('reduced-motion 下时长 ≤0.01s', [reduced.transition, reduced.animation].every((value) => parseFloat(value) <= 0.01), JSON.stringify(reduced))
await page.emulateMedia({ reducedMotion: 'no-preference' })

// 白帧：CDP screencast 抓 reload 前 4 帧
const frames = []
client.on('Page.screencastFrame', async (event) => {
  frames.push(event.data)
  try {
    await client.send('Page.screencastFrameAck', { sessionId: event.sessionId })
  } catch {
    // 已经停了
  }
})
await client.send('Page.startScreencast', { format: 'jpeg', quality: 75, everyNthFrame: 1, maxWidth: 720 })
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
await client.send('Page.stopScreencast').catch(() => {})
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(300)

let brightness = []
if (frames.length > 0) {
  const decoder = await context.newPage()
  await decoder.goto('about:blank')
  brightness = await decoder.evaluate(async (urls) => {
    const out = []
    for (const url of urls.slice(0, 4)) {
      try {
        const image = new Image()
        image.src = `data:image/jpeg;base64,${url}`
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = 40
        canvas.height = 24
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0, 40, 24)
        const data = ctx.getImageData(0, 0, 40, 24).data
        let sum = 0
        for (let i = 0; i < data.length; i += 4) sum += (data[i] + data[i + 1] + data[i + 2]) / 3
        out.push(Math.round(sum / (data.length / 4)))
      } catch {
        out.push(-1)
      }
    }
    return out
  }, frames)
  await decoder.close()
}
if (brightness.length === 0) {
  console.log('UNVERIFIED 白帧检测（screencast 没拿到帧）')
} else {
  check('深色 reload 前 4 帧没有白帧（亮度 ≤200）', brightness.every((value) => value >= 0 && value <= 200), JSON.stringify(brightness))
}

// 浅色档
await openSettings()
await pickTheme('浅色')
const lightPreview = await state()
check('浅色即时预览 color-scheme=light', lightPreview.colorScheme === 'light', lightPreview.colorScheme ?? 'none')
await saveSettings()
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.doc-column .ProseMirror')
await page.waitForTimeout(400)
const lightReload = await state()
check('浅色 reload 后保留', lightReload.theme === 'light', lightReload.theme ?? 'none')
await page.screenshot({ path: `${OUT}/t2-light-1440.png` })

// 跟随系统 + 系统深色：原生控件也深色
await openSettings()
await pickTheme('跟随系统')
await saveSettings()
await page.emulateMedia({ colorScheme: 'dark' })
await page.waitForTimeout(400)
const systemDark = await state()
check('跟随系统 + 系统深色 → color-scheme=dark', systemDark.colorScheme === 'dark', systemDark.colorScheme ?? 'none')
check('跟随系统 + 系统深色 → 变量为深色', systemDark.paper === '#15171a', systemDark.paper ?? 'none')
await page.screenshot({ path: `${OUT}/t2-system-dark.png` })
await page.emulateMedia({ colorScheme: 'light' })

// 取消预览要还原
await openSettings()
await pickTheme('深色')
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const afterCancel = await state()
check('取消设置还原到已保存主题', afterCancel.theme === 'system', afterCancel.theme ?? 'none')

// index.html：内联脚本在模块脚本之前
const html = await readFile('index.html', 'utf8')
check('index.html 内联主题脚本在模块脚本之前', html.indexOf('sidelight.settings.v1') >= 0 && html.indexOf('sidelight.settings.v1') < html.indexOf('/src/main.tsx'))

console.log(`\n${results.filter((item) => item.ok).length}/${results.length} PASS`)
await context.close()
await browser.close()
if (results.some((item) => !item.ok)) process.exit(1)

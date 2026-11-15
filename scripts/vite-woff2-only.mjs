/**
 * 构建产物只留 woff2 字体。
 *
 * KaTeX 的 katex.min.css 给同一批 20 个 face 各写了 woff2 / woff / ttf 三个来源，
 * 发布包里三份都进，字体合计 1,072,948 B。WebView2 与 Chromium 都支持 woff2，
 * 这里在 generateBundle 里把每个 @font-face 的 src 收窄到 woff2 一项，并删掉 ttf / woff 资产。
 *
 * 自检不通过就让构建失败，不写坏产物（KaTeX_Size3 的 woff2 会被 Vite 内联成 data URI，
 * 所以「文件都在」与「每个 face 都有 woff2」必须分开查）。
 */

const EXPECTED_FACES = 16

// A 档裁剪：只删装饰族的粗/斜体 4 个 face（Font 名 + 字重 + 字形）。
// 它们只在 \mathbf{\mathfrak{…}} 一类嵌套里出现；Regular 全部保留。
// 删掉后 KaTeX 字体 256,168 B / 19 文件 -> 213,664 B / 15 文件（另有 1 个 face 内联成 data URI）。
const DROPPED_FACES = [
  { family: 'KaTeX_Caligraphic', weight: '700', style: 'normal' },
  { family: 'KaTeX_Fraktur', weight: '700', style: 'normal' },
  { family: 'KaTeX_SansSerif', weight: '700', style: 'normal' },
  { family: 'KaTeX_SansSerif', weight: '400', style: 'italic' },
]
const FONT_FACE = /@font-face\s*\{([^}]*)\}/g
const WOFF2_FORMAT = /format\("woff2"\)/
const TRUETYPE_FORMAT = /format\("truetype"\)/g
const WOFF_FORMAT = /format\("woff"\)/g
const WOFF2_FILE_REF = /\/assets\/([^)"'\s]+\.woff2)/g

/** 按分隔符切分，但不切开括号里的内容（data URI 的 base64 里含逗号，`data:font/woff2;base64` 里含分号） */
function splitTopLevel(value, delimiter) {
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '(') depth += 1
    else if (char === ')') depth -= 1
    else if (char === delimiter && depth === 0) {
      parts.push(value.slice(start, index))
      start = index + 1
    }
  }
  parts.push(value.slice(start))
  return parts
}

function srcItems(declarations) {
  const sources = []
  for (const declaration of declarations) {
    if (declaration.trim().startsWith('src:')) {
      sources.push(splitTopLevel(declaration.trim().slice(4), ','))
    }
  }
  return sources
}

function rewriteFace(body, faceIndex) {
  const declarations = splitTopLevel(body, ';')
  const sources = srcItems(declarations)
  if (sources.length !== 1) {
    throw new Error(`[woff2-only] 第 ${faceIndex + 1} 个 @font-face 的 src 声明数为 ${sources.length}，期望 1`)
  }
  const kept = sources[0].filter((item) => WOFF2_FORMAT.test(item))
  if (kept.length !== 1) {
    throw new Error(`[woff2-only] 第 ${faceIndex + 1} 个 @font-face 的 woff2 来源数为 ${kept.length}，期望 1`)
  }
  return declarations
    .map((declaration) => (declaration.trim().startsWith('src:') ? `src:${kept.join(',')}` : declaration))
    .join(';')
}

function faceDecl(body) {
  const read = (name, fallback) => {
    const match = new RegExp(`(?:^|;)${name}:([^;]+);`).exec(body)
    return match ? match[1].trim() : fallback
  }
  return { family: read('font-family', ''), weight: read('font-weight', '400'), style: read('font-style', 'normal') }
}

function isDroppedFace(body) {
  const decl = faceDecl(body)
  return DROPPED_FACES.some(
    (face) => face.family === decl.family && face.weight === decl.weight && face.style === decl.style,
  )
}

function checkFaces(css) {
  const faces = [...css.matchAll(FONT_FACE)]
  if (faces.length !== EXPECTED_FACES) {
    throw new Error(`[woff2-only] @font-face 数为 ${faces.length}，期望 ${EXPECTED_FACES}`)
  }
  faces.forEach((face) => {
    if (isDroppedFace(face[1])) {
      throw new Error(`[woff2-only] 被裁剪的 face 仍在 CSS 里：${faceDecl(face[1]).family}`)
    }
  })
  faces.forEach((face, index) => {
    const sources = srcItems(splitTopLevel(face[1], ';'))
    if (sources.length !== 1 || sources[0].length !== 1 || !WOFF2_FORMAT.test(sources[0][0])) {
      throw new Error(`[woff2-only] 第 ${index + 1} 个 @font-face 收窄后不是「恰好 1 个 woff2 来源」`)
    }
  })
  const truetype = (css.match(TRUETYPE_FORMAT) ?? []).length
  const woff = (css.match(WOFF_FORMAT) ?? []).length
  if (truetype !== 0 || woff !== 0) {
    throw new Error(`[woff2-only] CSS 里仍残留非 woff2 来源：truetype=${truetype} woff=${woff}`)
  }
}

export function woff2Only() {
  return {
    name: 'sidelight:woff2-only',
    apply: 'build',
    generateBundle(_options, bundle) {
      const cssNames = Object.keys(bundle).filter((name) => name.endsWith('.css'))
      if (cssNames.length !== 1) {
        throw new Error(`[woff2-only] CSS 资产数为 ${cssNames.length}，期望 1`)
      }
      const cssName = cssNames[0]
      const asset = bundle[cssName]
      if (asset.type !== 'asset') {
        throw new Error(`[woff2-only] ${cssName} 不是 asset`)
      }

      let css = typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
      let faceIndex = 0
      let droppedCount = 0
      const droppedRefs = new Set()
      // 顺序要紧：先删块并记下它们的 woff2 URL，再收窄剩下的 face，最后才 checkFaces。
      // 反过来（先 checkFaces 再删）会抛「20，期望 16」。
      css = css.replace(FONT_FACE, (_whole, body) => {
        if (isDroppedFace(body)) {
          for (const match of body.matchAll(WOFF2_FILE_REF)) droppedRefs.add(`assets/${match[1]}`)
          droppedCount += 1
          return ''
        }
        const rewritten = `@font-face{${rewriteFace(body, faceIndex)}}`
        faceIndex += 1
        return rewritten
      })
      if (droppedCount !== DROPPED_FACES.length) {
        throw new Error(`[woff2-only] 裁掉的 face 数为 ${droppedCount}，期望 ${DROPPED_FACES.length}`)
      }
      checkFaces(css)

      for (const [name] of Object.entries(bundle)) {
        if (/\.(ttf|woff)$/i.test(name)) delete bundle[name]
      }
      for (const ref of droppedRefs) delete bundle[ref]
      for (const ref of droppedRefs) {
        if (bundle[ref]) throw new Error(`[woff2-only] 被裁剪 face 的字体仍在产物里：${ref}`)
        if (css.includes(ref.replace('assets/', ''))) throw new Error(`[woff2-only] CSS 仍引用被裁剪字体：${ref}`)
      }
      for (const match of css.matchAll(WOFF2_FILE_REF)) {
        const fileName = `assets/${match[1]}`
        if (!bundle[fileName]) {
          throw new Error(`[woff2-only] CSS 引用的 ${fileName} 不在产物里`)
        }
      }

      asset.source = css
    },
  }
}

// 只被 katexLazy.ts 动态 import：CSS 与 KaTeX 本体一起进入惰性 chunk
import katex from 'katex/dist/katex.mjs'
import 'katex/dist/katex.min.css'

export default { katex }

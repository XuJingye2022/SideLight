declare module 'katex/dist/katex.mjs' {
  import type { KatexModule } from './katexLazy.ts'

  const katex: KatexModule
  export default katex
}

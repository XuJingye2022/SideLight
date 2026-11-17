declare module 'mermaid/dist/mermaid.core.mjs' {
  import type { MermaidModule } from './lib/mermaidLazy.ts'

  const mermaid: MermaidModule
  export default mermaid
}

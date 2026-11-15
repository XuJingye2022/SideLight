import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import './styles.css'
import 'katex/dist/katex.min.css'

const container = document.getElementById('root')
if (!container) throw new Error('找不到 #root 节点')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

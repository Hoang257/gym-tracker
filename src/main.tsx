import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Saira Condensed поддерживает только латиницу; кириллические заголовки берут
// системный конденсированный шрифт из фолбэка (--font-display). Грузим два начертания.
import '@fontsource/saira-condensed/latin-600.css'
import '@fontsource/saira-condensed/latin-700.css'
// Вариативные Inter и JetBrains Mono: только ось веса (wght), без оптического размера.
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/jetbrains-mono/wght.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

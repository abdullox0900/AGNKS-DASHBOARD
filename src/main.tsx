import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import App from './App.tsx'
import { initUi } from '@/shared/config/uiStore'

initUi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// the entry loader from index.html fades out once React has painted
const boot = document.getElementById('boot')
if (boot) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      boot.classList.add('boot-hide')
      window.setTimeout(() => boot.remove(), 400)
    }),
  )
}

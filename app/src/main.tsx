import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './app/App'
import '@/shared/styles/global.css'

// 以前のSPAリダイレクトクエリパラメータ（?redirect=...）がある場合はハッシュ形式へ引き継ぐ
const redirected = new URLSearchParams(window.location.search).get('redirect')
if (redirected?.startsWith('/')) {
  const cleanPath = redirected.replace(/^\/hojo-app(?=\/|$)/, '') || '/'
  window.history.replaceState(null, '', `${window.location.pathname}#${cleanPath}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import './styles/global.css'

const routerBase = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'
const redirected = new URLSearchParams(window.location.search).get('redirect')
if (redirected?.startsWith('/')) {
  const cleanPath = redirected.replace(/^\/hojo-app(?=\/|$)/, '') || '/'
  window.history.replaceState(null, '', `${routerBase === '/' ? '' : routerBase}${cleanPath}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={routerBase}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

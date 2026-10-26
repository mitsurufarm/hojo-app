import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthContext'

export function AppShell({ children }: { children: ReactNode }) {
  const { logout, userName } = useAuth()

  return (
    <div className="app-shell">
      <header>
        <Link className="brand" to="/">
          MITSURU FARM <small>圃場記録</small>
        </Link>
        <nav>
          <NavLink to="/">ホーム</NavLink>
          <NavLink to="/fields">圃場</NavLink>
          <NavLink to="/cultivations">栽培</NavLink>
          <NavLink to="/crops">作物</NavLink>
          <NavLink to="/export">データ出力</NavLink>
        </nav>
        <button className="text-button" onClick={() => void logout()}>
          {userName || 'ログアウト'}
        </button>
      </header>

      <main>{children}</main>

      <nav className="bottom-nav">
        <NavLink to="/">
          ⌂<span>ホーム</span>
        </NavLink>
        <NavLink to="/fields">
          ▦<span>圃場</span>
        </NavLink>
        <NavLink to="/cultivations">
          ♧<span>栽培</span>
        </NavLink>
        <NavLink to="/crops">
          ⚙<span>作物</span>
        </NavLink>
        <NavLink to="/export">
          ⇩<span>出力</span>
        </NavLink>
      </nav>
    </div>
  )
}


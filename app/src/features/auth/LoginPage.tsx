import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthContext'
import { authConfigured } from '@/shared/auth/cognito'
import { Notice } from '@/shared/components'

export function LoginPage() {
  const { authenticated, login } = useAuth()

  if (authenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="login">
      <div className="login-card">
        <p className="eyebrow">FIELD RECORD</p>
        <h1>MITSURU FARM</h1>
        <p>圃場・栽培・作業・収穫をまとめて記録します。</p>
        {authConfigured ? (
          <button className="primary" onClick={() => void login()}>
            Cognitoでログイン
          </button>
        ) : (
          <Notice>
            <strong>接続設定が未完了です。</strong>
            <br />
            `app/.env.local` にCognitoとAPI Gatewayの公開設定値を入力してください。
          </Notice>
        )}
        <a className="back-link" href="/">
          公開サイトへ戻る
        </a>
      </div>
    </main>
  )
}

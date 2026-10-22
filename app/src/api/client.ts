import { getAccessToken } from '../auth/cognito'
import { ApiError } from '../types'

const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}, isRetry = false): Promise<T> {
  if (!baseUrl) {
    throw new ApiError(0, 'APIの接続先が設定されていません。.env.local を設定してください。', 'CONFIGURATION_ERROR')
  }

  const token = await getAccessToken(isRetry)
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/v1${path}`, { ...init, headers })
  } catch (e) {
    throw new ApiError(0, 'ネットワークエラーが発生しました。インターネット接続を確認してください。', 'NETWORK_ERROR')
  }

  // 401（未認証/トークン期限切れ）の場合は1度だけトークン再取得を試行してリトライ
  if (response.status === 401 && !isRetry) {
    return request<T>(path, init, true)
  }

  if (response.status === 204) return undefined as T

  if (!response.ok) {
    const body = await response.json().catch(() => ({} as Record<string, unknown>))
    const serverMessage = (body as { error?: { message?: string }; message?: string }).error?.message || (body as { message?: string }).message
    const defaultMsg =
      response.status === 401
        ? 'ログインの有効期限が切れました。一度ログアウトして再ログインしてください。'
        : response.status === 403
          ? 'アクセス権限がありません（403 Forbidden）。'
          : response.status === 404
            ? `対象のリソースが見つかりませんでした（404 Not Found: ${path}）。`
            : response.status >= 500
              ? `サーバー側でエラーが発生しました（HTTP ${response.status}）。`
              : `通信に失敗しました（HTTP ${response.status}）。`

    throw new ApiError(
      response.status,
      serverMessage ? `${serverMessage}（HTTP ${response.status}）` : defaultMsg,
      (body as { error?: { code?: string } }).error?.code
    )
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}

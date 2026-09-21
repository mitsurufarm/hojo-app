import { Amplify } from 'aws-amplify'
import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut as amplifySignOut } from 'aws-amplify/auth'

const config = import.meta.env
export const authConfigured = Boolean(config.VITE_COGNITO_USER_POOL_ID && config.VITE_COGNITO_CLIENT_ID && config.VITE_COGNITO_DOMAIN && config.VITE_COGNITO_REDIRECT_URI)

export function configureAuth() {
  if (!authConfigured) return
  Amplify.configure({ Auth: { Cognito: { userPoolId: config.VITE_COGNITO_USER_POOL_ID, userPoolClientId: config.VITE_COGNITO_CLIENT_ID, loginWith: { oauth: { domain: config.VITE_COGNITO_DOMAIN, scopes: ['openid', 'email', 'profile'], redirectSignIn: [config.VITE_COGNITO_REDIRECT_URI], redirectSignOut: [config.VITE_COGNITO_REDIRECT_URI], responseType: 'code' } } } } })
}
export const signIn = () => signInWithRedirect()
export const signOut = () => amplifySignOut()
export async function getAccessToken() { const session = await fetchAuthSession(); return session.tokens?.accessToken?.toString() }
export async function getCurrentAuthState() { if (!authConfigured) return null; try { return await getCurrentUser() } catch { return null } }

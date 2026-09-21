import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { configureAuth, getCurrentAuthState, signIn, signOut } from './cognito'
type AuthState = { loading: boolean; authenticated: boolean; userName?: string; login: () => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthState | undefined>(undefined)
export function AuthProvider({ children }: { children: ReactNode }) { const [state, setState] = useState<Omit<AuthState, 'login' | 'logout'>>({ loading: true, authenticated: false }); useEffect(() => { configureAuth(); getCurrentAuthState().then(user => setState({ loading: false, authenticated: !!user, userName: user?.username })) }, []); return <AuthContext.Provider value={{ ...state, login: async () => signIn(), logout: async () => { await signOut(); setState({ loading: false, authenticated: false }) } }}>{children}</AuthContext.Provider> }
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider is required'); return value }

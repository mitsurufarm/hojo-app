import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/auth/AuthContext'
import { Loading } from '@/shared/components'
import { AppShell } from './AppShell'

export function Protected({ children }: { children: ReactNode }) {
  const { loading, authenticated } = useAuth()

  if (loading) {
    return <Loading />
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return <AppShell>{children}</AppShell>
}

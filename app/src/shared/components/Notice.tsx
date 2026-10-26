import type { ReactNode } from 'react'

export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice">{children}</div>
}


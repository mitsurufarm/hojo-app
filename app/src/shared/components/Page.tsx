import type { ReactNode } from 'react'

export function Page({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}


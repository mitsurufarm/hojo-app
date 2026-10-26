import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fields } from '@/shared/api/resources'
import { Empty, Notice, Page } from '@/shared/components'
import type { Field } from '@/shared/types'
import { errorMessage, formatArea, statusLabel } from '@/shared/utils/format'

export function FieldListPage() {
  const [items, setItems] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fields
      .list()
      .then(v => setItems(v.items))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Page
      title="圃場"
      action={
        <Link className="primary button-link" to="/fields/new">
          ＋ 圃場を追加
        </Link>
      }
    >
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Empty message="読み込み中…" />
      ) : (
        <>
          <div className="card-grid">
            {items.map(f => (
              <Link className="card" key={f.fieldId} to={`/fields/${f.fieldId}`}>
                <span className="badge">{statusLabel(f.status)}</span>
                <h3>{f.name}</h3>
                <p>{formatArea(f.area)}</p>
                <p>{f.location || '所在地未登録'}</p>
              </Link>
            ))}
          </div>
          {!items.length && !error && (
            <Empty message="圃場がありません。最初の圃場を追加してください。" />
          )}
        </>
      )}
    </Page>
  )
}


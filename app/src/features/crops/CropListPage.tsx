import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { crops } from '@/shared/api/resources'
import { Empty, Notice, Page } from '@/shared/components'
import type { Crop } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'

export function CropListPage() {
  const [items, setItems] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    crops
      .list()
      .then(v => setItems(v.items))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Page
      title="作物"
      action={
        <Link className="primary button-link" to="/crops/new">
          ＋ 作物を追加
        </Link>
      }
    >
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Empty message="読み込み中…" />
      ) : (
        <>
          <div className="list">
            {items.map(c => (
              <Link className="list-row" key={c.cropId} to={`/crops/${c.cropId}/edit`}>
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.category || '未分類'} ・ {c.active ? '利用中' : '利用停止'}
                  </small>
                </span>
                <span>›</span>
              </Link>
            ))}
          </div>
          {!items.length && !error && <Empty message="作物がありません。" />}
        </>
      )}
    </Page>
  )
}

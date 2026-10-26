import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { harvests } from '@/shared/api/resources'
import { Empty, Notice, Page } from '@/shared/components'
import type { Harvest } from '@/shared/types'
import { errorMessage, summarizeHarvests } from '@/shared/utils/format'

export function HarvestListPage() {
  const { cultivationId = '' } = useParams()
  const [items, setItems] = useState<Harvest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    harvests
      .list(cultivationId)
      .then(v => setItems(v.items))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [cultivationId])

  const harvestTotals = summarizeHarvests(items)

  return (
    <Page
      title="収穫"
      action={
        <Link
          className="primary button-link"
          to={`/cultivations/${cultivationId}/harvests/new`}
        >
          ＋ 収穫を追加
        </Link>
      }
    >
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Empty message="読み込み中…" />
      ) : (
        <>
          {harvestTotals.length > 0 && (
            <div className="harvest-summary-box">
              <span className="harvest-summary-label">収穫量合計（単位別）</span>
              <div className="harvest-summary-chips">
                {harvestTotals.map(t => (
                  <span key={t.unit} className="harvest-total-pill">
                    <b>{t.quantity.toLocaleString()}</b> {t.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="list">
            {items.map(item => (
              <Link
                className="list-row"
                key={item.harvestId}
                to={`/cultivations/${cultivationId}/harvests/${item.harvestId}/edit`}
              >
                <span>
                  <b>
                    {item.harvestDate}　{item.quantity} {item.unit}
                  </b>
                  <small>販売 {item.saleQuantity ?? 0} {item.unit}</small>
                </span>
                <span>›</span>
              </Link>
            ))}
          </div>
          {!items.length && !error && <Empty message="収穫記録がありません。" />}
        </>
      )}
    </Page>
  )
}


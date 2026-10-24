import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { workLogs } from '@/shared/api/resources'
import { Empty, Notice, Page } from '@/shared/components'
import type { WorkLog } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'

export function WorkLogListPage() {
  const { cultivationId = '' } = useParams()
  const [items, setItems] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    workLogs
      .list(cultivationId)
      .then(v => setItems(v.items))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [cultivationId])

  return (
    <Page
      title="作業"
      action={
        <Link
          className="primary button-link"
          to={`/cultivations/${cultivationId}/work-logs/new`}
        >
          ＋ 作業を追加
        </Link>
      }
    >
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Empty message="読み込み中…" />
      ) : (
        <>
          <div className="list">
            {items.map(item => (
              <Link
                className="list-row"
                key={item.workLogId}
                to={`/cultivations/${cultivationId}/work-logs/${item.workLogId}/edit`}
              >
                <span>
                  <b>
                    {item.date}　{item.workType}
                  </b>
                  <small>{item.description || '内容未入力'}</small>
                </span>
                <span>›</span>
              </Link>
            ))}
          </div>
          {!items.length && !error && <Empty message="作業記録がありません。" />}
        </>
      )}
    </Page>
  )
}

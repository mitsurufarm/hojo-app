import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { areas, fields } from '@/shared/api/resources'
import { Empty, Loading, Notice, Page } from '@/shared/components'
import type { Area, Field } from '@/shared/types'
import { errorMessage, formatArea, statusLabel } from '@/shared/utils/format'
import { FieldMapPicker } from './components/FieldMapPicker'

export function FieldDetailPage() {
  const { fieldId = '' } = useParams()
  const [field, setField] = useState<Field>()
  const [items, setItems] = useState<Area[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fields.get(fieldId), areas.list(fieldId)])
      .then(([f, a]) => {
        setField(f)
        setItems(a.items)
      })
      .catch(e => setError(errorMessage(e)))
  }, [fieldId])

  if (error) {
    return (
      <Page title="圃場">
        <Notice>{error}</Notice>
      </Page>
    )
  }

  if (!field) return <Loading />

  return (
    <Page
      title={field.name}
      action={
        <Link className="secondary button-link" to={`/fields/${fieldId}/edit`}>
          編集
        </Link>
      }
    >
      <div className="details">
        <p>
          <b>面積</b>
          {formatArea(field.area)}
        </p>
        <p>
          <b>所在地</b>
          {field.location || '—'}
        </p>
        <p>
          <b>緯度 / 経度</b>
          {field.latitude !== undefined && field.longitude !== undefined
            ? `${field.latitude}, ${field.longitude}`
            : '—'}
        </p>
        <p>
          <b>土質 / 排水性 / 日当たり</b>
          {[field.soilType, field.drainage, field.sunlight].filter(Boolean).join(' / ') || '—'}
        </p>
        <p>
          <b>備考</b>
          {field.note || '—'}
        </p>
      </div>

      {field.latitude !== undefined && field.longitude !== undefined && (
        <FieldMapPicker latitude={field.latitude} longitude={field.longitude} />
      )}

      <div className="section-head">
        <h2>エリア</h2>
        <Link to={`/fields/${fieldId}/areas/new`}>＋ 追加</Link>
      </div>

      <div className="list">
        {items.map(a => (
          <Link
            key={a.areaId}
            className="list-row"
            to={`/fields/${fieldId}/areas/${a.areaId}`}
          >
            <span>
              <b>{a.name}</b>
              <small>
                {formatArea(a.areaSize)} ・ {statusLabel(a.status)}
              </small>
            </span>
            <span>›</span>
          </Link>
        ))}
      </div>

      {!items.length && <Empty message="エリアがありません。" />}
    </Page>
  )
}


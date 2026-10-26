import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { areas, crops, fields } from '@/shared/api/resources'
import { Empty, Loading, Notice, Page } from '@/shared/components'
import type { Area, Crop, Cultivation, Field } from '@/shared/types'
import { errorMessage, formatArea, statusLabel } from '@/shared/utils/format'
import { CultivationCard } from '@/features/cultivations/components/CultivationCard'

export function AreaDetailPage() {
  const { fieldId = '', areaId = '' } = useParams()
  const [area, setArea] = useState<Area>()
  const [items, setItems] = useState<Cultivation[]>([])
  const [error, setError] = useState('')
  const [fieldItems, setFieldItems] = useState<Field[]>([])
  const [cropItems, setCropItems] = useState<Crop[]>([])

  useEffect(() => {
    Promise.all([
      areas.get(fieldId, areaId),
      areas.cultivations(fieldId, areaId),
      fields.list(),
      crops.list(),
    ])
      .then(([areaResult, cultivationResult, fieldResult, cropResult]) => {
        setArea(areaResult)
        setItems(cultivationResult.items)
        setFieldItems(fieldResult.items)
        setCropItems(cropResult.items)
      })
      .catch(e => setError(errorMessage(e)))
  }, [fieldId, areaId])

  if (error) {
    return (
      <Page title="エリア">
        <Notice>{error}</Notice>
      </Page>
    )
  }

  if (!area) return <Loading />

  const displayItems = items.map(item => ({
    ...item,
    cropName: cropItems.find(crop => crop.cropId === item.cropId)?.name,
    fieldName: fieldItems.find(field => field.fieldId === item.fieldId)?.name,
    areaName: item.areaId === area.areaId ? area.name : undefined,
  }))

  return (
    <Page
      title={area.name}
      action={
        <Link
          className="secondary button-link"
          to={`/fields/${fieldId}/areas/${areaId}/edit`}
        >
          編集
        </Link>
      }
    >
      <div className="details">
        <p>
          <b>面積</b>
          {formatArea(area.areaSize)}
        </p>
        <p>
          <b>位置</b>
          {area.position || '—'}
        </p>
        <p>
          <b>状態</b>
          {statusLabel(area.status)}
        </p>
        <p>
          <b>備考</b>
          {area.note || '—'}
        </p>
      </div>

      <div className="section-head">
        <h2>栽培履歴</h2>
        <Link to={`/cultivations/new?fieldId=${fieldId}&areaId=${areaId}`}>
          ＋ 栽培を追加
        </Link>
      </div>

      {displayItems.map(c => (
        <CultivationCard key={c.cultivationId} item={c} />
      ))}

      {!items.length && <Empty message="栽培履歴がありません。" />}
    </Page>
  )
}


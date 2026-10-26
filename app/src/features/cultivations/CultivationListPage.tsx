import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { areas, crops, cultivations, fields } from '@/shared/api/resources'
import { Empty, Notice, Page } from '@/shared/components'
import type { Area, Crop, Cultivation, Field } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'
import { CultivationCard } from './components/CultivationCard'

export function CultivationListPage() {
  const [items, setItems] = useState<Cultivation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldItems, setFieldItems] = useState<Field[]>([])
  const [areaItems, setAreaItems] = useState<Area[]>([])
  const [cropItems, setCropItems] = useState<Crop[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      cultivations.list(),
      fields.list(),
      crops.list(),
    ])
      .then(async ([cultivationResult, fieldResult, cropResult]) => {
        const areaResults = await Promise.all(
          fieldResult.items.map(field => areas.list(field.fieldId))
        )

        setItems(cultivationResult.items)
        setFieldItems(fieldResult.items)
        setCropItems(cropResult.items)
        setAreaItems(areaResults.flatMap(result => result.items))
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const displayItems = items.map(item => ({
    ...item,
    cropName: cropItems.find(crop => crop.cropId === item.cropId)?.name,
    fieldName: fieldItems.find(field => field.fieldId === item.fieldId)?.name,
    areaName: areaItems.find(area => area.areaId === item.areaId)?.name,
  }))

  return (
    <Page
      title="栽培"
      action={
        <Link className="primary button-link" to="/cultivations/new">
          ＋ 栽培を登録
        </Link>
      }
    >
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Empty message="読み込み中…" />
      ) : (
        <>
          <div className="card-grid">
            {displayItems.map(c => (
              <CultivationCard key={c.cultivationId} item={c} />
            ))}
          </div>
          {!items.length && !error && <Empty message="栽培記録がありません。" />}
        </>
      )}
    </Page>
  )
}


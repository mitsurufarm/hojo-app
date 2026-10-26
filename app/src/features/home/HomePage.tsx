import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { areas, crops, cultivations, fields } from '@/shared/api/resources'
import { Empty, Notice, Page } from '@/shared/components'
import type { Area, Crop, Cultivation, Field } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'
import { CultivationCard } from '@/features/cultivations/components/CultivationCard'

export function HomePage() {
  const [items, setItems] = useState<Cultivation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fieldItems, setFieldItems] = useState<Field[]>([])
  const [areaItems, setAreaItems] = useState<Area[]>([])
  const [cropItems, setCropItems] = useState<Crop[]>([])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      cultivations.current(),
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
      title="ホーム"
      action={
        <Link className="primary button-link" to="/cultivations/new">
          ＋ 栽培を登録
        </Link>
      }
    >
      {error && <Notice>{error}</Notice>}
      <h2>現在栽培中</h2>
      {loading ? (
        <Empty message="読み込み中…" />
      ) : items.length ? (
        <div className="card-grid">
          {displayItems.map(c => (
            <CultivationCard key={c.cultivationId} item={c} />
          ))}
        </div>
      ) : (
        <Empty message="現在栽培中の作物はありません。" />
      )}
      <section className="quick">
        <h2>クイック操作</h2>
        <div>
          <Link to="/cultivations">栽培を見る</Link>
          <Link to="/fields">圃場を管理</Link>
          <Link to="/crops">作物を管理</Link>
          <Link to="/export">データ一括出力（JSON）</Link>
        </div>
      </section>
    </Page>
  )
}


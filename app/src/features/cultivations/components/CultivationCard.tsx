import { Link } from 'react-router-dom'
import type { Cultivation } from '@/shared/types'
import { statusLabel } from '@/shared/utils/format'

type CultivationCardProps = {
  item: Cultivation
}

export function CultivationCard({ item }: CultivationCardProps) {
  return (
    <Link className="card" to={`/cultivations/${item.cultivationId}`}>
      <span className={`badge ${item.status}`}>{statusLabel(item.status)}</span>
      <h3>{item.cropName || item.cropId}</h3>
      <p>{item.year}年 {item.season && `・${item.season}`}</p>
      <p>{item.fieldName || item.fieldId} / {item.areaName || item.areaId}</p>
    </Link>
  )
}

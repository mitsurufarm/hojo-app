import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { areas, crops, cultivations, fields, harvests, workLogs } from '@/shared/api/resources'
import { Empty, Loading, Notice, Page } from '@/shared/components'
import type { Area, Crop, Cultivation, Field, Harvest, WorkLog } from '@/shared/types'
import { errorMessage, statusLabel, summarizeHarvests } from '@/shared/utils/format'

type TimelineRecord =
  | { kind: 'work'; date: string; id: string; work: WorkLog }
  | { kind: 'harvest'; date: string; id: string; harvest: Harvest }

export function CultivationDetailPage() {
  const { cultivationId = '' } = useParams()
  const [item, setItem] = useState<Cultivation>()
  const [error, setError] = useState('')
  const [fieldItems, setFieldItems] = useState<Field[]>([])
  const [areaItems, setAreaItems] = useState<Area[]>([])
  const [cropItems, setCropItems] = useState<Crop[]>([])
  const [workItems, setWorkItems] = useState<WorkLog[]>([])
  const [harvestItems, setHarvestItems] = useState<Harvest[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [recordFilter, setRecordFilter] = useState<'all' | 'work' | 'harvest'>('all')

  useEffect(() => {
    cultivations
      .get(cultivationId)
      .then(setItem)
      .catch(e => setError(errorMessage(e)))
  }, [cultivationId])

  useEffect(() => {
    setRecordsLoading(true)
    Promise.all([
      workLogs.list(cultivationId),
      harvests.list(cultivationId),
    ])
      .then(([workResult, harvestResult]) => {
        setWorkItems(workResult.items)
        setHarvestItems(harvestResult.items)
      })
      .catch(e => setError(errorMessage(e)))
      .finally(() => setRecordsLoading(false))
  }, [cultivationId])

  useEffect(() => {
    Promise.all([
      fields.list(),
      crops.list(),
    ])
      .then(([fieldResult, cropResult]) => {
        setFieldItems(fieldResult.items)
        setCropItems(cropResult.items)
      })
      .catch(e => setError(errorMessage(e)))
  }, [])

  useEffect(() => {
    if (!item?.fieldId) {
      setAreaItems([])
      return
    }

    areas
      .list(item.fieldId)
      .then(result => setAreaItems(result.items))
      .catch(e => setError(errorMessage(e)))
  }, [item?.fieldId])

  if (error) {
    return (
      <Page title="栽培">
        <Notice>{error}</Notice>
      </Page>
    )
  }

  if (!item) return <Loading />

  const displayItem = {
    ...item,
    cropName: cropItems.find(crop => crop.cropId === item.cropId)?.name,
    fieldName: fieldItems.find(field => field.fieldId === item.fieldId)?.name,
    areaName: areaItems.find(area => area.areaId === item.areaId)?.name,
  }

  const harvestTotals = summarizeHarvests(harvestItems)
  const harvestTotalsText = harvestTotals.length
    ? harvestTotals.map(t => `${t.quantity.toLocaleString()} ${t.unit}`).join(' / ')
    : '—'

  const timelineRecords: TimelineRecord[] = [
    ...(recordFilter !== 'harvest'
      ? workItems.map((w): TimelineRecord => ({ kind: 'work', date: w.date, id: w.workLogId, work: w }))
      : []),
    ...(recordFilter !== 'work'
      ? harvestItems.map((h): TimelineRecord => ({ kind: 'harvest', date: h.harvestDate, id: h.harvestId, harvest: h }))
      : []),
  ]

  const groupedByDate = Array.from(
    timelineRecords.reduce((map, rec) => {
      const list = map.get(rec.date) ?? []
      list.push(rec)
      map.set(rec.date, list)
      return map
    }, new Map<string, TimelineRecord[]>())
  ).sort(([a], [b]) => b.localeCompare(a))

  return (
    <Page
      title={displayItem.cropName || displayItem.cropId}
      action={
        <Link className="secondary button-link" to={`/cultivations/${cultivationId}/edit`}>
          編集
        </Link>
      }
    >
      <p className={`badge ${item.status}`}>{statusLabel(item.status)}</p>
      <div className="details">
        <p>
          <b>栽培ID</b>
          {item.cultivationId}
        </p>
        <p>
          <b>圃場 / エリア</b>
          {displayItem.fieldName || displayItem.fieldId} / {displayItem.areaName || displayItem.areaId}
        </p>
        <p>
          <b>年度 / 品種 / 季節</b>
          {item.year}年 / {item.variety || '—'} / {item.season || '—'}
        </p>
        <p>
          <b>播種 / 定植</b>
          {item.sowingDate || '—'} / {item.plantingDate || '—'}
        </p>
        <p>
          <b>収穫量合計</b>
          {recordsLoading ? '読み込み中…' : harvestTotalsText}
        </p>
        <p>
          <b>備考</b>
          {item.note || '—'}
        </p>
      </div>

      <div className="quick record-actions">
        <Link to={`/cultivations/${cultivationId}/work-logs/new`}>＋ 作業</Link>
        <Link to={`/cultivations/${cultivationId}/harvests/new`}>＋ 収穫</Link>
        <Link to={`/cultivations/${cultivationId}/photos/new`}>＋ 写真</Link>
        <Link to={`/cultivations/${cultivationId}/photos`}>写真一覧</Link>
      </div>

      <section className="cultivation-records">
        <div className="records-header">
          <h2>作業・収穫の記録</h2>
          <div className="filter-chips">
            <button
              type="button"
              className={`map-chip ${recordFilter === 'all' ? 'active' : ''}`}
              onClick={() => setRecordFilter('all')}
            >
              すべて（{workItems.length + harvestItems.length}）
            </button>
            <button
              type="button"
              className={`map-chip ${recordFilter === 'work' ? 'active' : ''}`}
              onClick={() => setRecordFilter('work')}
            >
              作業（{workItems.length}）
            </button>
            <button
              type="button"
              className={`map-chip ${recordFilter === 'harvest' ? 'active' : ''}`}
              onClick={() => setRecordFilter('harvest')}
            >
              収穫（{harvestItems.length}）
            </button>
          </div>
        </div>

        {!recordsLoading && harvestTotals.length > 0 && recordFilter !== 'work' && (
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

        {recordsLoading ? (
          <Empty message="読み込み中…" />
        ) : groupedByDate.length ? (
          <div className="date-groups">
            {groupedByDate.map(([date, records]) => (
              <div key={date} className="date-group">
                <h3 className="date-group-head">{date}</h3>
                <div className="list">
                  {records.map(rec =>
                    rec.kind === 'work' ? (
                      <Link
                        key={`work-${rec.id}`}
                        className="list-row"
                        to={`/cultivations/${cultivationId}/work-logs/${rec.id}/edit`}
                      >
                        <span>
                          <b>
                            <span className="record-type-badge work">作業</span>
                            {rec.work.workType}
                          </b>
                          <small>
                            {[
                              rec.work.description || '内容未入力',
                              rec.work.workMinutes !== undefined ? `${rec.work.workMinutes}分` : '',
                            ]
                              .filter(Boolean)
                              .join(' ・ ')}
                          </small>
                        </span>
                        <span>›</span>
                      </Link>
                    ) : (
                      <Link
                        key={`harvest-${rec.id}`}
                        className="list-row"
                        to={`/cultivations/${cultivationId}/harvests/${rec.id}/edit`}
                      >
                        <span>
                          <b>
                            <span className="record-type-badge harvest">収穫</span>
                            {rec.harvest.quantity.toLocaleString()} {rec.harvest.unit}
                          </b>
                          <small>
                            {[
                              rec.harvest.saleQuantity !== undefined
                                ? `販売 ${rec.harvest.saleQuantity.toLocaleString()} ${rec.harvest.unit}`
                                : '',
                              rec.harvest.selfConsumptionQuantity !== undefined
                                ? `自家消費 ${rec.harvest.selfConsumptionQuantity.toLocaleString()} ${rec.harvest.unit}`
                                : '',
                              rec.harvest.discardQuantity !== undefined
                                ? `廃棄 ${rec.harvest.discardQuantity.toLocaleString()} ${rec.harvest.unit}`
                                : '',
                              rec.harvest.note || '',
                            ]
                              .filter(Boolean)
                              .join(' ・ ') || '詳細未入力'}
                          </small>
                        </span>
                        <span>›</span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            message={
              recordFilter === 'work'
                ? '作業記録がありません。'
                : recordFilter === 'harvest'
                  ? '収穫記録がありません。'
                  : '作業・収穫記録がありません。'
            }
          />
        )}
      </section>
    </Page>
  )
}

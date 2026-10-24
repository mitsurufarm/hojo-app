import type { Harvest } from '@/shared/types'

export const workTypes = [
  '播種',
  '定植',
  '整地',
  '間引き',
  '除草',
  '施肥',
  '防除',
  '水やり',
  '収穫',
  '片付け',
  '観察',
  'その他',
]

export const formatArea = (area?: number) =>
  area === undefined ? '—' : `${area.toLocaleString()} m²（${area / 100}a）`

export const statusLabel = (status: string) =>
  ({
    planned: '予定',
    growing: '栽培中',
    completed: '完了',
    failed: '中止',
    active: '使用中',
    inactive: '休止',
  }[status] || status)

export const todayDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const summarizeHarvests = (items: Harvest[]): { unit: string; quantity: number }[] => {
  const totals = new Map<string, number>()
  for (const item of items) {
    const unit = (item.unit || '').trim()
    const prev = totals.get(unit) ?? 0
    totals.set(unit, Number((prev + (Number(item.quantity) || 0)).toFixed(4)))
  }
  return Array.from(totals.entries()).map(([unit, quantity]) => ({ unit, quantity }))
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : '予期しないエラーが発生しました。'

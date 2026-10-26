import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { harvests } from '@/shared/api/resources'
import { Empty, FormControl, Notice, Page } from '@/shared/components'
import type { Harvest } from '@/shared/types'
import { errorMessage, todayDate } from '@/shared/utils/format'

const harvestDefs: [string, string, string?][] = [
  ['harvestDate', '収穫日', 'date'],
  ['quantity', '収穫量', 'number'],
  ['unit', '単位', 'text'],
  ['saleQuantity', '販売量', 'number'],
  ['selfConsumptionQuantity', '自家消費量', 'number'],
  ['discardQuantity', '廃棄量', 'number'],
  ['sales', '売上（円）', 'number'],
  ['salesChannel', '販路', 'text'],
  ['note', '備考', 'textarea'],
]

const numberKeys = [
  'quantity',
  'saleQuantity',
  'selfConsumptionQuantity',
  'discardQuantity',
  'sales',
]

export function HarvestFormPage() {
  const { cultivationId = '', harvestId } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    harvestDate: todayDate(),
  }))
  const [loading, setLoading] = useState(Boolean(harvestId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!harvestId) {
      setValues({ harvestDate: todayDate() })
      setLoading(false)
      return
    }
    setLoading(true)
    harvests
      .get(cultivationId, harvestId)
      .then((data: Harvest) => setValues(data as unknown as Record<string, unknown>))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [cultivationId, harvestId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const data = Object.fromEntries(
        Object.entries(values)
          .filter(([k, v]) => !(numberKeys.includes(k) && v === ''))
          .map(([k, v]) => [k, numberKeys.includes(k) && v !== undefined && v !== null ? Number(v) : v])
      )
      if (harvestId) {
        await harvests.update(cultivationId, harvestId, data)
      } else {
        await harvests.create(cultivationId, data)
      }
      navigate(`/cultivations/${cultivationId}`)
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const title = `${harvestId ? '編集' : '登録'}：収穫`

  if (loading) {
    return (
      <Page title={title}>
        <Empty message="読み込み中…" />
      </Page>
    )
  }

  return (
    <Page title={title}>
      <form className="form" onSubmit={submit}>
        {harvestDefs.map(([key, label, type]) => (
          <div key={key} className="form-item">
            <FormControl
              label={label}
              name={key}
              type={type}
              value={values[key]}
              onChange={v => setValues(x => ({ ...x, [key]: v }))}
            />
          </div>
        ))}

        {error && <Notice>{error}</Notice>}
        <button className="primary" disabled={saving}>
          {saving ? '保存中…' : '保存する'}
        </button>
      </form>
    </Page>
  )
}


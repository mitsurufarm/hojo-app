import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { areas, crops, cultivations, fields } from '@/shared/api/resources'
import { Empty, FormControl, Notice, Page } from '@/shared/components'
import type { Area, Crop, Cultivation, Field } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'

const cultivationDefs: [string, string, string?][] = [
  ['year', '栽培年度', 'number'],
  ['variety', '品種', 'text'],
  ['season', '季節', 'text'],
  ['sowingDate', '播種日', 'date'],
  ['plantingDate', '定植日', 'date'],
  ['harvestStartDate', '収穫開始日', 'date'],
  ['harvestEndDate', '収穫終了日', 'date'],
  ['completedDate', '完了日', 'date'],
  ['status', '状態', 'cultivationStatus'],
  ['note', '備考', 'textarea'],
]

const numberKeys = ['year']

export function CultivationFormPage() {
  const { cultivationId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    year: new Date().getFullYear(),
    status: 'planned',
    fieldId: searchParams.get('fieldId') || '',
    areaId: searchParams.get('areaId') || '',
  }))
  const [loading, setLoading] = useState(Boolean(cultivationId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [fieldItems, setFieldItems] = useState<Field[]>([])
  const [areaItems, setAreaItems] = useState<Area[]>([])
  const [cropItems, setCropItems] = useState<Crop[]>([])

  useEffect(() => {
    if (!cultivationId) {
      setLoading(false)
      return
    }
    setLoading(true)
    cultivations
      .get(cultivationId)
      .then((data: Cultivation) => setValues(data as unknown as Record<string, unknown>))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [cultivationId])

  useEffect(() => {
    Promise.all([fields.list(), crops.list()])
      .then(([fieldResult, cropResult]) => {
        setFieldItems(fieldResult.items)
        setCropItems(cropResult.items)
      })
      .catch(e => setError(errorMessage(e)))
  }, [])

  useEffect(() => {
    const fieldId = String(values.fieldId ?? '')
    if (!fieldId) {
      setAreaItems([])
      return
    }
    areas
      .list(fieldId)
      .then(result => setAreaItems(result.items))
      .catch(e => setError(errorMessage(e)))
  }, [values.fieldId])

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
      if (cultivationId) {
        await cultivations.update(cultivationId, data)
      } else {
        await cultivations.create(data)
      }
      navigate('/cultivations')
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const title = `${cultivationId ? '編集' : '登録'}：栽培`

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
        <label>
          圃場
          <select
            value={String(values.fieldId ?? '')}
            onChange={e => setValues(x => ({ ...x, fieldId: e.target.value, areaId: '' }))}
            required
          >
            <option value="">圃場を選択してください</option>
            {fieldItems.map(field => (
              <option key={field.fieldId} value={field.fieldId}>
                {field.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          エリア
          <select
            value={String(values.areaId ?? '')}
            onChange={e => setValues(x => ({ ...x, areaId: e.target.value }))}
            disabled={!values.fieldId}
            required
          >
            <option value="">エリアを選択してください</option>
            {areaItems.map(area => (
              <option key={area.areaId} value={area.areaId}>
                {area.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          作物
          <select
            value={String(values.cropId ?? '')}
            onChange={e => setValues(x => ({ ...x, cropId: e.target.value }))}
            required
          >
            <option value="">作物を選択してください</option>
            {cropItems
              .filter(crop => crop.active)
              .map(crop => (
                <option key={crop.cropId} value={crop.cropId}>
                  {crop.name}
                </option>
              ))}
          </select>
        </label>

        {cultivationDefs.map(([key, label, type]) => (
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

import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fields } from '@/shared/api/resources'
import { Empty, FormControl, Notice, Page } from '@/shared/components'
import type { Field } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'
import { FieldMapPicker } from './components/FieldMapPicker'

const fieldDefs: [string, string, string?][] = [
  ['name', '圃場名', 'text'],
  ['area', '面積（m²）', 'number'],
  ['location', '所在地', 'text'],
  ['soilType', '土質', 'text'],
  ['drainage', '排水性', 'text'],
  ['sunlight', '日当たり', 'text'],
  ['status', '状態', 'select'],
  ['note', '備考', 'textarea'],
]

const numberKeys = ['area', 'latitude', 'longitude']

export function FieldFormPage() {
  const { fieldId } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, unknown>>({ status: 'active' })
  const [loading, setLoading] = useState(Boolean(fieldId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!fieldId) {
      setValues({ status: 'active' })
      setLoading(false)
      return
    }
    setLoading(true)
    fields
      .get(fieldId)
      .then((data: Field) => setValues(data as unknown as Record<string, unknown>))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [fieldId])

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
      if (fieldId) {
        await fields.update(fieldId, data)
      } else {
        await fields.create(data)
      }
      navigate('/fields')
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const title = `${fieldId ? '編集' : '登録'}：圃場`

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
        {fieldDefs.map(([key, label, type]) => (
          <div key={key} className="form-item">
            <FormControl
              label={label}
              name={key}
              type={type}
              value={values[key]}
              onChange={v => setValues(x => ({ ...x, [key]: v }))}
            />
            {key === 'location' && (
              <FieldMapPicker
                latitude={values.latitude}
                longitude={values.longitude}
                onChange={(lat, lon) => setValues(x => ({ ...x, latitude: lat, longitude: lon }))}
              />
            )}
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

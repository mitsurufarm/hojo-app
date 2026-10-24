import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { areas } from '@/shared/api/resources'
import { Empty, FormControl, Notice, Page } from '@/shared/components'
import type { Area } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'

const areaDefs: [string, string, string?][] = [
  ['name', 'エリア名', 'text'],
  ['areaSize', '面積（m²）', 'number'],
  ['position', '圃場内の位置', 'text'],
  ['status', '状態', 'select'],
  ['note', '備考', 'textarea'],
]

const numberKeys = ['areaSize']

export function AreaFormPage() {
  const { fieldId = '', areaId } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, unknown>>({ status: 'active' })
  const [loading, setLoading] = useState(Boolean(areaId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!areaId) {
      setValues({ status: 'active' })
      setLoading(false)
      return
    }
    setLoading(true)
    areas
      .get(fieldId, areaId)
      .then((data: Area) => setValues(data as unknown as Record<string, unknown>))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [fieldId, areaId])

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
      if (areaId) {
        await areas.update(fieldId, areaId, data)
      } else {
        await areas.create(fieldId, data)
      }
      navigate(`/fields/${fieldId}`)
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const title = `${areaId ? '編集' : '登録'}：エリア`

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
        {areaDefs.map(([key, label, type]) => (
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

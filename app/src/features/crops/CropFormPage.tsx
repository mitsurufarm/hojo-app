import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { crops } from '@/shared/api/resources'
import { Empty, FormControl, Notice, Page } from '@/shared/components'
import type { Crop } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'

const cropDefs: [string, string, string?][] = [
  ['name', '作物名', 'text'],
  ['category', 'カテゴリ', 'text'],
  ['active', '利用状態', 'boolean'],
  ['note', '備考', 'textarea'],
]

export function CropFormPage() {
  const { cropId } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, unknown>>({ active: true })
  const [loading, setLoading] = useState(Boolean(cropId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!cropId) {
      setValues({ active: true })
      setLoading(false)
      return
    }
    setLoading(true)
    crops
      .get(cropId)
      .then((data: Crop) => setValues(data as unknown as Record<string, unknown>))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [cropId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (cropId) {
        await crops.update(cropId, values)
      } else {
        await crops.create(values)
      }
      navigate('/crops')
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const title = `${cropId ? '編集' : '登録'}：作物`

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
        {cropDefs.map(([key, label, type]) => (
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


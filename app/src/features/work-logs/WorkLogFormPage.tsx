import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { workLogs } from '@/shared/api/resources'
import { Empty, FormControl, Notice, Page } from '@/shared/components'
import type { WorkLog } from '@/shared/types'
import { errorMessage, todayDate, workTypes } from '@/shared/utils/format'

const workDefs: [string, string, string?][] = [
  ['date', '作業日', 'date'],
  ['workType', '作業種別', 'workType'],
  ['description', '作業内容', 'textarea'],
  ['workMinutes', '作業時間（分）', 'number'],
  ['workerCount', '作業人数', 'number'],
  ['soilCondition', '土壌状態', 'text'],
  ['beforeCondition', '作業前の状態', 'text'],
  ['afterCondition', '作業後の状態', 'text'],
  ['note', '備考', 'textarea'],
]

const numberKeys = ['workMinutes', 'workerCount']

export function WorkLogFormPage() {
  const { cultivationId = '', workLogId } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    date: todayDate(),
    workType: workTypes[0],
  }))
  const [loading, setLoading] = useState(Boolean(workLogId))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!workLogId) {
      setValues({ date: todayDate(), workType: workTypes[0] })
      setLoading(false)
      return
    }
    setLoading(true)
    workLogs
      .get(cultivationId, workLogId)
      .then((data: WorkLog) => setValues(data as unknown as Record<string, unknown>))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [cultivationId, workLogId])

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
      if (workLogId) {
        await workLogs.update(cultivationId, workLogId, data)
      } else {
        await workLogs.create(cultivationId, data)
      }
      navigate(`/cultivations/${cultivationId}`)
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  const title = `${workLogId ? '編集' : '登録'}：作業`

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
        {workDefs.map(([key, label, type]) => (
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


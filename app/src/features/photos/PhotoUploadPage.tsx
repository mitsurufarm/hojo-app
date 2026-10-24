import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { photos } from '@/shared/api/resources'
import { Notice, Page } from '@/shared/components'
import { errorMessage } from '@/shared/utils/format'

export function PhotoUploadPage() {
  const { cultivationId = '' } = useParams()
  const navigate = useNavigate()
  const [file, setFile] = useState<File>()
  const [caption, setCaption] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) return setError('写真を選択してください。')
    if (file.size > 5 * 1024 * 1024) return setError('写真は5MB以下にしてください。')

    setSaving(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('caption', caption)
      await photos.upload(cultivationId, form)
      navigate(`/cultivations/${cultivationId}/photos`)
    } catch (e) {
      setError(errorMessage(e))
      setSaving(false)
    }
  }

  return (
    <Page title="写真を追加">
      <form className="form" onSubmit={submit}>
        <label>
          写真ファイル
          <input
            type="file"
            accept="image/*"
            onChange={e => setFile(e.target.files?.[0])}
          />
        </label>
        <label>
          キャプション
          <input value={caption} onChange={e => setCaption(e.target.value)} />
        </label>
        <p className="hint">
          最大5MB。写真はGoogle Driveに保存され、認証情報はブラウザには保存されません。
        </p>
        {error && <Notice>{error}</Notice>}
        <button className="primary" disabled={saving}>
          {saving ? 'アップロード中…' : 'アップロード'}
        </button>
      </form>
    </Page>
  )
}

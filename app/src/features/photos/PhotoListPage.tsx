import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { photos } from '@/shared/api/resources'
import { Empty, Notice, Page } from '@/shared/components'
import type { Photo } from '@/shared/types'
import { errorMessage } from '@/shared/utils/format'
import { PhotoModal } from './components/PhotoModal'

export function PhotoListPage() {
  const { cultivationId = '' } = useParams()
  const [items, setItems] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPhotos = () => {
    setLoading(true)
    photos
      .list(cultivationId)
      .then(v => setItems(v.items))
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPhotos()
  }, [cultivationId])

  const handleDelete = async (photo: Photo) => {
    if (!window.confirm('この写真を削除しますか？Google Driveからも完全に削除されます。')) return
    setDeleting(true)
    try {
      await photos.delete(cultivationId, photo.photoId)
      setSelectedPhoto(null)
      setItems(prev => prev.filter(p => p.photoId !== photo.photoId))
    } catch (e) {
      alert(`削除に失敗しました: ${errorMessage(e)}`)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Page
      title="写真"
      action={
        <Link
          className="primary button-link"
          to={`/cultivations/${cultivationId}/photos/new`}
        >
          ＋ 写真を追加
        </Link>
      }
    >
      {error && <Notice>{error}</Notice>}
      {loading ? (
        <Empty message="読み込み中…" />
      ) : (
        <>
          <div className="photo-grid">
            {items.map(p => (
              <figure
                key={p.photoId}
                className={p.url ? 'clickable-photo' : ''}
                onClick={() => p.url && setSelectedPhoto(p)}
                title={p.url ? 'クリックで拡大' : undefined}
              >
                {p.url ? (
                  <img src={p.url} alt={p.caption || '栽培写真'} />
                ) : (
                  <div className="photo-placeholder">表示準備中</div>
                )}
                <figcaption>{p.caption || '説明なし'}</figcaption>
              </figure>
            ))}
          </div>
          {!items.length && !error && <Empty message="写真がありません。" />}
        </>
      )}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          deleting={deleting}
          onClose={() => setSelectedPhoto(null)}
          onDelete={handleDelete}
        />
      )}
    </Page>
  )
}

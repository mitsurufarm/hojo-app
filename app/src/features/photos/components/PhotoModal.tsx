import type { Photo } from '@/shared/types'

type PhotoModalProps = {
  photo: Photo
  deleting: boolean
  onClose: () => void
  onDelete: (photo: Photo) => void
}

export function PhotoModal({ photo, deleting, onClose, onDelete }: PhotoModalProps) {
  return (
    <div className="photo-modal-backdrop" onClick={onClose}>
      <div className="photo-modal-content" onClick={e => e.stopPropagation()}>
        <button className="photo-modal-close" onClick={onClose} title="閉じる">
          ✕
        </button>
        <div className="photo-modal-image-wrap">
          <img src={photo.url!} alt={photo.caption || '拡大写真'} />
        </div>
        <div className="photo-modal-footer">
          <div className="photo-modal-caption">
            <b>{photo.caption || '説明なし'}</b>
            {photo.createdAt && <small>{photo.createdAt.slice(0, 10)} 登録</small>}
          </div>
          <button
            className="secondary delete-button"
            disabled={deleting}
            onClick={() => onDelete(photo)}
          >
            {deleting ? '削除中…' : '写真を削除'}
          </button>
        </div>
      </div>
    </div>
  )
}


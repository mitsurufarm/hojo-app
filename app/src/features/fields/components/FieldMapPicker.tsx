import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [35.7088, 138.4464] // 山梨県韮崎市
const DEFAULT_ZOOM = 15

const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  photo: {
    url: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
    maxZoom: 18,
  },
} as const

type LayerMode = keyof typeof TILE_LAYERS

const pinIcon = L.divIcon({
  className: 'field-map-pin',
  html: '<div class="field-map-pin-inner"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const parseCoord = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined
  const num = Number(v)
  return Number.isFinite(num) ? num : undefined
}

const formatCoord = (n: number) => String(Number(n.toFixed(6)))

export function FieldMapPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude?: unknown
  longitude?: unknown
  onChange?: (lat: string, lon: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [layerMode, setLayerMode] = useState<LayerMode>('photo')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')

  const latNum = parseCoord(latitude)
  const lonNum = parseCoord(longitude)
  const hasCoords = latNum !== undefined && lonNum !== undefined
  const readOnly = !onChange

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initialCenter: [number, number] = hasCoords ? [latNum, lonNum] : DEFAULT_CENTER
    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: hasCoords ? 17 : DEFAULT_ZOOM,
    })

    const cfg = TILE_LAYERS[layerMode]
    const tile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map)

    if (!readOnly) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        onChangeRef.current?.(formatCoord(e.latlng.lat), formatCoord(e.latlng.lng))
      })
    }

    mapRef.current = map
    tileRef.current = tile

    return () => {
      map.remove()
      mapRef.current = null
      tileRef.current = null
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (tileRef.current) {
      map.removeLayer(tileRef.current)
    }
    const cfg = TILE_LAYERS[layerMode]
    tileRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map)
  }, [layerMode])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!hasCoords) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current)
        markerRef.current = null
      }
      return
    }

    const pos: [number, number] = [latNum, lonNum]
    if (!markerRef.current) {
      const marker = L.marker(pos, {
        icon: pinIcon,
        draggable: !readOnly,
      }).addTo(map)
      if (!readOnly) {
        marker.on('dragend', () => {
          const p = marker.getLatLng()
          onChangeRef.current?.(formatCoord(p.lat), formatCoord(p.lng))
        })
      }
      markerRef.current = marker
    } else {
      markerRef.current.setLatLng(pos)
    }
    map.panTo(pos)
  }, [hasCoords, latNum, lonNum, readOnly])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('お使いのブラウザは現在地取得に対応していません。')
      return
    }
    setLocating(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocating(false)
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        onChange?.(formatCoord(lat), formatCoord(lon))
        mapRef.current?.setView([lat, lon], 17)
      },
      () => {
        setLocating(false)
        setGeoError('現在地を取得できませんでした。位置情報の許可設定を確認してください。')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="field-map-box">
      <div className="field-map-toolbar">
        <span className="field-map-title">
          {readOnly ? '圃場の位置' : '位置（地図をタップして選択）'}
        </span>
        <div className="field-map-actions">
          <button
            type="button"
            className={`map-chip ${layerMode === 'photo' ? 'active' : ''}`}
            onClick={() => setLayerMode('photo')}
          >
            航空写真
          </button>
          <button
            type="button"
            className={`map-chip ${layerMode === 'osm' ? 'active' : ''}`}
            onClick={() => setLayerMode('osm')}
          >
            標準地図
          </button>
          {!readOnly && (
            <button
              type="button"
              className="map-chip"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              {locating ? '取得中…' : '現在地を取得'}
            </button>
          )}
          {!readOnly && hasCoords && (
            <button
              type="button"
              className="map-chip"
              onClick={() => onChange?.('', '')}
            >
              クリア
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="field-map-canvas" />

      {geoError && <p className="hint">{geoError}</p>}

      {!readOnly && (
        <div className="field-coord-inputs">
          <label>
            緯度
            <input
              name="latitude"
              type="number"
              step="any"
              placeholder="例: 35.7088"
              value={String(latitude ?? '')}
              onChange={e => onChange?.(e.target.value, String(longitude ?? ''))}
            />
          </label>
          <label>
            経度
            <input
              name="longitude"
              type="number"
              step="any"
              placeholder="例: 138.4464"
              value={String(longitude ?? '')}
              onChange={e => onChange?.(String(latitude ?? ''), e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}

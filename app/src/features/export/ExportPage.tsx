import { useState, type FormEvent } from 'react'
import { areas, crops, cultivations, fields, harvests, workLogs } from '@/shared/api/resources'
import { useAuth } from '@/shared/auth/AuthContext'
import { Notice, Page } from '@/shared/components'
import type { Area, Harvest, WeatherRecord, WorkLog } from '@/shared/types'
import { errorMessage, summarizeHarvests, todayDate } from '@/shared/utils/format'

export function ExportPage() {
  const { login } = useAuth()
  const [startDate, setStartDate] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [endDate, setEndDate] = useState(() => todayDate())
  const [includeHourly, setIncludeHourly] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [lastSummary, setLastSummary] = useState<string>('')

  const handleExport = async (e: FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) {
      setError('開始日と終了日を指定してください。')
      return
    }
    if (startDate > endDate) {
      setError('開始日は終了日以前の日付を指定してください。')
      return
    }
    setExporting(true)
    setError('')
    setLastSummary('')

    try {
      const [fieldRes, cropRes, cultivationRes] = await Promise.all([
        fields.list(),
        crops.list(),
        cultivations.list(),
      ])

      const fieldList = fieldRes?.items || []
      const cropList = cropRes?.items || []
      const cultivationList = cultivationRes?.items || []

      const [areaResults, weatherResults] = await Promise.all([
        Promise.all(fieldList.map(f => areas.list(f.fieldId).catch(() => ({ items: [] as Area[] })))),
        Promise.all(
          fieldList.map(f =>
            fields
              .weather(f.fieldId, startDate, endDate, includeHourly)
              .then(res => ({ field: f, items: Array.isArray(res?.items) ? res.items : [] }))
              .catch(() => ({ field: f, items: [] as WeatherRecord[] }))
          )
        ),
      ])

      const areaList = areaResults.flatMap(r => r?.items || [])
      const fieldNameMap = new Map(fieldList.map(f => [f.fieldId, f.name]))
      const areaNameMap = new Map(areaList.map(a => [a.areaId, a.name]))
      const cropNameMap = new Map(cropList.map(c => [c.cropId, c.name]))

      const cultivationRecordResults = await Promise.all(
        cultivationList.map(async c => {
          const [wRes, hRes] = await Promise.all([
            workLogs.list(c.cultivationId).catch(() => ({ items: [] as WorkLog[] })),
            harvests.list(c.cultivationId).catch(() => ({ items: [] as Harvest[] })),
          ])
          const filteredWorkLogs = (wRes?.items || [])
            .filter(w => w.date >= startDate && w.date <= endDate)
            .sort((a, b) => a.date.localeCompare(b.date))
          const filteredHarvests = (hRes?.items || [])
            .filter(h => h.harvestDate >= startDate && h.harvestDate <= endDate)
            .sort((a, b) => a.harvestDate.localeCompare(b.harvestDate))
          return {
            cultivation: c,
            workLogs: filteredWorkLogs,
            harvests: filteredHarvests,
          }
        })
      )

      const enrichedCultivations = cultivationRecordResults.map(
        ({ cultivation: c, workLogs: wList, harvests: hList }) => ({
          ...c,
          fieldName: fieldNameMap.get(c.fieldId) ?? c.fieldName,
          areaName: areaNameMap.get(c.areaId) ?? c.areaName,
          cropName: cropNameMap.get(c.cropId) ?? c.cropName,
          harvestTotalsByUnit: summarizeHarvests(hList),
          workLogs: wList,
          harvests: hList,
        })
      )

      const allWorkLogs = cultivationRecordResults
        .flatMap(({ cultivation: c, workLogs: wList }) =>
          wList.map(w => ({
            ...w,
            fieldId: c.fieldId,
            fieldName: fieldNameMap.get(c.fieldId),
            areaId: c.areaId,
            areaName: areaNameMap.get(c.areaId),
            cropId: c.cropId,
            cropName: cropNameMap.get(c.cropId),
            variety: c.variety,
          }))
        )
        .sort((a, b) => a.date.localeCompare(b.date))

      const allHarvests = cultivationRecordResults
        .flatMap(({ cultivation: c, harvests: hList }) =>
          hList.map(h => ({
            ...h,
            fieldId: c.fieldId,
            fieldName: fieldNameMap.get(c.fieldId),
            areaId: c.areaId,
            areaName: areaNameMap.get(c.areaId),
            cropId: c.cropId,
            cropName: cropNameMap.get(c.cropId),
            variety: c.variety,
          }))
        )
        .sort((a, b) => a.harvestDate.localeCompare(b.harvestDate))

      const weatherByField = weatherResults.map(({ field: f, items }) => ({
        fieldId: f.fieldId,
        fieldName: f.name,
        location: f.location,
        latitude: f.latitude,
        longitude: f.longitude,
        days: (items || []).sort((a, b) => a.date.localeCompare(b.date)),
      }))

      const totalWeatherDays = weatherByField.reduce((sum, f) => sum + f.days.length, 0)

      const exportData = {
        exportedAt: new Date().toISOString(),
        period: { startDate, endDate },
        weatherGranularity: includeHourly ? 'daily_and_hourly' : 'daily_only',
        summary: {
          fieldCount: fieldList.length,
          areaCount: areaList.length,
          cropCount: cropList.length,
          cultivationCount: enrichedCultivations.length,
          workLogCount: allWorkLogs.length,
          harvestCount: allHarvests.length,
          weatherRecordCount: totalWeatherDays,
        },
        fields: fieldList,
        areas: areaList.map(a => ({ ...a, fieldName: fieldNameMap.get(a.fieldId) })),
        crops: cropList,
        cultivations: enrichedCultivations,
        workLogs: allWorkLogs,
        harvests: allHarvests,
        weatherByField,
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mitsurufarm-export-${startDate}_to_${endDate}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setLastSummary(
        `出力完了：圃場 ${fieldList.length}件 / エリア ${areaList.length}件 / 栽培 ${enrichedCultivations.length}件 / 作業 ${allWorkLogs.length}件 / 収穫 ${allHarvests.length}件 / 天気 ${totalWeatherDays}日分`
      )
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Page title="データ一括出力（JSON）">
      <form className="form" onSubmit={handleExport}>
        <p className="hint">
          指定した期間の作業記録・収穫記録・天気データと、圃場・エリア・作物・栽培の情報を1つのJSONファイルにまとめてダウンロードします（生成AIでの分析にそのまま利用できます）。
        </p>

        <div className="field-coord-inputs">
          <label>
            開始日
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              required
            />
          </label>
          <label>
            終了日
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          天気データの粒度
          <select
            value={includeHourly ? 'hourly' : 'daily'}
            onChange={e => setIncludeHourly(e.target.value === 'hourly')}
          >
            <option value="daily">日次サマリーのみ（生成AI分析向け・軽量でおすすめ）</option>
            <option value="hourly">1時間ごとの詳細天気も含める（フルデータ）</option>
          </select>
        </label>

        {error && (
          <Notice>
            {error}
            {error.includes('ログイン') && (
              <div style={{ marginTop: '12px' }}>
                <button type="button" className="primary" onClick={() => void login()}>
                  再度ログインする
                </button>
              </div>
            )}
          </Notice>
        )}
        {lastSummary && (
          <div className="harvest-summary-box">
            <span className="harvest-summary-label">{lastSummary}</span>
          </div>
        )}

        <button className="primary" disabled={exporting}>
          {exporting ? 'データ取得・作成中…' : 'JSONを一括ダウンロード'}
        </button>
      </form>
    </Page>
  )
}


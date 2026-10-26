import { Link, Route, Routes } from 'react-router-dom'
import { Page } from '@/shared/components'
import { Protected } from '@/app/components/Protected'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomePage } from '@/features/home/HomePage'
import { FieldListPage } from '@/features/fields/FieldListPage'
import { FieldDetailPage } from '@/features/fields/FieldDetailPage'
import { FieldFormPage } from '@/features/fields/FieldFormPage'
import { AreaDetailPage } from '@/features/areas/AreaDetailPage'
import { AreaFormPage } from '@/features/areas/AreaFormPage'
import { CropListPage } from '@/features/crops/CropListPage'
import { CropFormPage } from '@/features/crops/CropFormPage'
import { CultivationListPage } from '@/features/cultivations/CultivationListPage'
import { CultivationDetailPage } from '@/features/cultivations/CultivationDetailPage'
import { CultivationFormPage } from '@/features/cultivations/CultivationFormPage'
import { WorkLogListPage } from '@/features/work-logs/WorkLogListPage'
import { WorkLogFormPage } from '@/features/work-logs/WorkLogFormPage'
import { HarvestListPage } from '@/features/harvests/HarvestListPage'
import { HarvestFormPage } from '@/features/harvests/HarvestFormPage'
import { PhotoListPage } from '@/features/photos/PhotoListPage'
import { PhotoUploadPage } from '@/features/photos/PhotoUploadPage'
import { ExportPage } from '@/features/export/ExportPage'

function NotFoundPage() {
  return (
    <Page title="ページが見つかりません">
      <Link to="/">ホームへ戻る</Link>
    </Page>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="*"
        element={
          <Protected>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/fields" element={<FieldListPage />} />
              <Route path="/fields/new" element={<FieldFormPage />} />
              <Route path="/fields/:fieldId" element={<FieldDetailPage />} />
              <Route path="/fields/:fieldId/edit" element={<FieldFormPage />} />
              <Route path="/fields/:fieldId/areas/new" element={<AreaFormPage />} />
              <Route path="/fields/:fieldId/areas/:areaId" element={<AreaDetailPage />} />
              <Route path="/fields/:fieldId/areas/:areaId/edit" element={<AreaFormPage />} />
              <Route path="/cultivations" element={<CultivationListPage />} />
              <Route path="/cultivations/new" element={<CultivationFormPage />} />
              <Route path="/cultivations/:cultivationId" element={<CultivationDetailPage />} />
              <Route path="/cultivations/:cultivationId/edit" element={<CultivationFormPage />} />
              <Route path="/cultivations/:cultivationId/work-logs" element={<WorkLogListPage />} />
              <Route path="/cultivations/:cultivationId/work-logs/new" element={<WorkLogFormPage />} />
              <Route path="/cultivations/:cultivationId/work-logs/:workLogId/edit" element={<WorkLogFormPage />} />
              <Route path="/cultivations/:cultivationId/harvests" element={<HarvestListPage />} />
              <Route path="/cultivations/:cultivationId/harvests/new" element={<HarvestFormPage />} />
              <Route path="/cultivations/:cultivationId/harvests/:harvestId/edit" element={<HarvestFormPage />} />
              <Route path="/cultivations/:cultivationId/photos" element={<PhotoListPage />} />
              <Route path="/cultivations/:cultivationId/photos/new" element={<PhotoUploadPage />} />
              <Route path="/crops" element={<CropListPage />} />
              <Route path="/crops/new" element={<CropFormPage />} />
              <Route path="/crops/:cropId/edit" element={<CropFormPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Protected>
        }
      />
    </Routes>
  )
}


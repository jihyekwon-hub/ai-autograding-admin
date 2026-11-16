import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/DashboardPage'
import { OperationRulePage } from './pages/OperationRulePage'
import { PerformancePage } from './pages/PerformancePage'
import { ReviewerManagementPage } from './pages/ReviewerManagementPage'
import { ReviewStatusPage } from './pages/ReviewStatusPage'
import { ReviewerProvider } from './contexts/ReviewerProvider'
import { HistoryPage } from './pages/HistoryPage'
import { AdminDataProvider } from './contexts/AdminDataProvider'
import { ScreenSpecPage } from './pages/ScreenSpecPage'

export default function App() {
  return (
    <AdminDataProvider><ReviewerProvider>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="standards" element={<OperationRulePage />} />
          <Route path="reviewers" element={<ReviewerManagementPage />} />
          <Route path="review-status" element={<ReviewStatusPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="screen-spec" element={<ScreenSpecPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ReviewerProvider></AdminDataProvider>
  )
}

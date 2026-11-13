import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { RequirePermission } from './RequirePermission'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from '@/pages/login/LoginPage'
import { OverviewPage } from '@/pages/overview/OverviewPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { AutoReviewCard, ReviewPage } from '@/pages/review/ReviewPage'
import { DisputesPage } from '@/pages/disputes/DisputesPage'
import { CashiersPage } from '@/pages/cashiers/CashiersPage'
import { StationsPage } from '@/pages/stations/StationsPage'
import { BonusPage } from '@/pages/bonus/BonusPage'
import { BonusReportPage } from '@/pages/bonus-report/BonusReportPage'
import { DataFixPage } from '@/pages/data-fix/DataFixPage'
import { AdminsPage } from '@/pages/admins/AdminsPage'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { BroadcastsPage } from '@/pages/broadcasts/BroadcastsPage'
import { LargeReceiptsPage } from '@/pages/large-receipts/LargeReceiptsPage'
import { AuditPage } from '@/pages/audit/AuditPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { ChangelogPage } from '@/pages/changelog/ChangelogPage'
import { AttendantsPage } from '@/pages/attendants/AttendantsPage'
import { FaceIdLayout } from '@/pages/faceid/FaceIdLayout'
import { FaceOverviewPage } from '@/pages/faceid/OverviewPage'
import { EmployeesPage } from '@/pages/faceid/EmployeesPage'
import { FaceAnalyticsPage } from '@/pages/faceid/AnalyticsPage'
import { BranchesPage } from '@/pages/faceid/BranchesPage'
import { EmployeePage } from '@/pages/faceid/EmployeePage'
import { ChangelogPostPage } from '@/pages/changelog/ChangelogPostPage'
import { SettingsLayout, ToSettings } from '@/pages/settings/SettingsPage'
import { AppearancePage } from '@/pages/settings/AppearancePage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { path: '/', element: <OverviewPage /> },
      { path: '/analytics/*', element: <AnalyticsPage /> },
      { path: '/review', element: <ReviewPage /> },
      { path: '/disputes', element: <DisputesPage /> },
      { path: '/cashiers', element: <CashiersPage /> },
      { path: '/bonus', element: <BonusPage /> },
      { path: '/bonus-report', element: <BonusReportPage /> },
      {
        path: '/faceid',
        element: (
          <RequirePermission permission="faceid.view">
            <FaceIdLayout />
          </RequirePermission>
        ),
        children: [
          { index: true, element: <FaceOverviewPage /> },
          { path: 'employees', element: <EmployeesPage /> },
          { path: 'employees/:id', element: <EmployeePage /> },
          { path: 'branches', element: <BranchesPage /> },
          { path: 'analytics', element: <FaceAnalyticsPage /> },
        ],
      },
      {
        path: '/attendants',
        element: (
          <RequirePermission permission="attendants.view">
            <AttendantsPage />
          </RequirePermission>
        ),
      },
      { path: '/clients', element: <ClientsPage /> },
      {
        path: '/clients/:id',
        element: (
          <RequirePermission permission="clients.detail">
            <ClientDetailPage />
          </RequirePermission>
        ),
      },
      {
        path: '/large-receipts',
        element: (
          <RequirePermission permission="largeReceipts.view">
            <LargeReceiptsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'appearance', element: <AppearancePage /> },
          { path: 'stations', element: <RequirePermission permission="stations.view"><StationsPage /></RequirePermission> },
          { path: 'auto-review', element: <RequirePermission permission="review.view"><AutoReviewCard /></RequirePermission> },
          { path: 'admins', element: <RequirePermission permission="admins.manage"><AdminsPage /></RequirePermission> },
          { path: 'audit', element: <RequirePermission permission="audit.view"><AuditPage /></RequirePermission> },
          { path: 'data-fix', element: <RequirePermission permission="dataFix.manage"><DataFixPage /></RequirePermission> },
          { path: 'changelog', element: <RequirePermission permission="changelog.view"><ChangelogPage /></RequirePermission> },
          { path: 'changelog/:id', element: <RequirePermission permission="changelog.view"><ChangelogPostPage /></RequirePermission> },
          { path: 'broadcasts', element: <RequirePermission permission="broadcasts.view"><BroadcastsPage /></RequirePermission> },
        ],
      },
      // old addresses → their place in Sozlamalar
      { path: '/profile', element: <ToSettings to="profile" /> },
      { path: '/stations', element: <ToSettings to="stations" /> },
      { path: '/admins', element: <ToSettings to="admins" /> },
      { path: '/audit', element: <ToSettings to="audit" /> },
      { path: '/data-fix', element: <ToSettings to="data-fix" /> },
      { path: '/changelog', element: <ToSettings to="changelog" /> },
      { path: '/changelog/:id', element: <ToSettings to="changelog" /> },
      { path: '/broadcasts', element: <ToSettings to="broadcasts" /> },
    ],
  },
])

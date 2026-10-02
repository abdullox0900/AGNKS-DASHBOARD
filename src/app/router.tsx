import { createBrowserRouter } from 'react-router-dom'
import { AuthGuard } from './AuthGuard'
import { RequirePermission } from './RequirePermission'
import { AppLayout } from './layout/AppLayout'
import { LoginPage } from '@/pages/login/LoginPage'
import { OverviewPage } from '@/pages/overview/OverviewPage'
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage'
import { ReviewPage } from '@/pages/review/ReviewPage'
import { DisputesPage } from '@/pages/disputes/DisputesPage'
import { CashiersPage } from '@/pages/cashiers/CashiersPage'
import { StationsPage } from '@/pages/stations/StationsPage'
import { BonusPage } from '@/pages/bonus/BonusPage'
import { AdminsPage } from '@/pages/admins/AdminsPage'
import { ClientsPage } from '@/pages/clients/ClientsPage'
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage'
import { BroadcastsPage } from '@/pages/broadcasts/BroadcastsPage'
import { LargeReceiptsPage } from '@/pages/large-receipts/LargeReceiptsPage'
import { ComingSoonPage } from '@/pages/coming-soon/ComingSoonPage'

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
      {
        path: '/stations',
        element: (
          <RequirePermission permission="stations.view">
            <StationsPage />
          </RequirePermission>
        ),
      },
      { path: '/bonus', element: <BonusPage /> },
      {
        path: '/admins',
        element: (
          <RequirePermission permission="admins.manage">
            <AdminsPage />
          </RequirePermission>
        ),
      },
      { path: '/clients', element: <ClientsPage /> },
      { path: '/clients/:id', element: <ClientDetailPage /> },
      {
        path: '/large-receipts',
        element: (
          <RequirePermission permission="largeReceipts.view">
            <LargeReceiptsPage />
          </RequirePermission>
        ),
      },
      {
        path: '/broadcasts',
        element: (
          <RequirePermission permission="broadcasts.view">
            <BroadcastsPage />
          </RequirePermission>
        ),
      },
      { path: '/audit', element: <ComingSoonPage title="coming_soon.audit" /> },
      { path: '/settings', element: <ComingSoonPage title="nav.settings" /> },
    ],
  },
])

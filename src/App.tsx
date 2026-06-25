import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/lib/auth'
import { SupabaseGate } from '@/components/supabase-gate'
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from '@/components/protected-route'
import { AppLayout } from '@/components/layout/app-layout'
import { AdminLayout } from '@/components/layout/admin-layout'
import { Toaster } from '@/components/ui/sonner'

import LandingPage from '@/pages/landing'
import LoginPage from '@/pages/login'
import RegisterPage from '@/pages/register'
import DashboardPage from '@/pages/dashboard'
import HostelsPage from '@/pages/hostels'
import HostelDetailPage from '@/pages/hostel-detail'
import PaymentPage from '@/pages/payment'
import AllocationPage from '@/pages/allocation'
import ProfilePage from '@/pages/profile'
import NotificationsPage from '@/pages/notifications'
import GuidePage from '@/pages/guide'
import NotFoundPage from '@/pages/not-found'
import AdminApplicationsPage from '@/pages/admin-applications'

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SupabaseGate>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <LoginPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <PublicOnlyRoute>
                      <RegisterPage />
                    </PublicOnlyRoute>
                  }
                />
                <Route
                  path="/app"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="hostels" element={<HostelsPage />} />
                  <Route path="hostels/:hostelId" element={<HostelDetailPage />} />
                  <Route path="payment" element={<PaymentPage />} />
                  <Route path="allocation" element={<AllocationPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="guide" element={<GuidePage />} />
                </Route>
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminApplicationsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <Toaster />
            </BrowserRouter>
          </AuthProvider>
        </SupabaseGate>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

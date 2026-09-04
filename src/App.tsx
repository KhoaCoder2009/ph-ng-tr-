import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'

// Layouts
import { OwnerLayout }  from '@/components/layout/OwnerLayout'
import { TenantLayout } from '@/components/layout/TenantLayout'

// Common pages
import { SplashScreen } from '@/pages/SplashScreen'
import { LoginPage }    from '@/pages/LoginPage'

// Owner pages
import { OwnerDashboard }   from '@/pages/owner/OwnerDashboard'
import { RoomsPage }         from '@/pages/owner/RoomsPage'
import { TenantsPage }       from '@/pages/owner/TenantsPage'
import { ElectricityPage }   from '@/pages/owner/ElectricityPage'
import { InvoicesPage }      from '@/pages/owner/InvoicesPage'
import { PaymentsPage }      from '@/pages/owner/PaymentsPage'
import { RevenuePage }       from '@/pages/owner/RevenuePage'
import { OwnerProfilePage }  from '@/pages/owner/OwnerProfilePage'

// Tenant pages
import { TenantDashboard }     from '@/pages/tenant/TenantDashboard'
import { TenantInvoicesPage }  from '@/pages/tenant/TenantInvoicesPage'
import { TenantNotifications } from '@/pages/tenant/TenantNotifications'
import { TenantProfilePage }   from '@/pages/tenant/TenantProfilePage'

// Public invoice share
import { SharedInvoicePage } from '@/pages/SharedInvoicePage'

// Toast
import { ToastContainer } from '@/components/ui/Toast'

// Route guards
function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'owner' | 'tenant' }) {
  const { user, profile, initialized } = useAuthStore()
  if (!initialized) return null
  if (!user) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) {
    return <Navigate to={profile?.role === 'owner' ? '/owner' : '/tenant'} replace />
  }
  return <>{children}</>
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const { initialize, initialized } = useAuthStore()
  const { theme } = useUIStore()

  useEffect(() => {
    // Apply theme class on mount
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  useEffect(() => {
    initialize()
  }, [initialize])

  if (showSplash) {
    return (
      <>
        <SplashScreen onComplete={() => setShowSplash(false)} />
        <ToastContainer />
      </>
    )
  }

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB] dark:bg-dark-bg">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invoice/:token" element={<SharedInvoicePage />} />

        {/* Owner */}
        <Route path="/owner" element={<RequireAuth role="owner"><OwnerLayout /></RequireAuth>}>
          <Route index element={<OwnerDashboard />} />
          <Route path="rooms"       element={<RoomsPage />} />
          <Route path="tenants"     element={<TenantsPage />} />
          <Route path="electricity" element={<ElectricityPage />} />
          <Route path="invoices"    element={<InvoicesPage />} />
          <Route path="payments"    element={<PaymentsPage />} />
          <Route path="revenue"     element={<RevenuePage />} />
          <Route path="profile"     element={<OwnerProfilePage />} />
        </Route>

        {/* Tenant */}
        <Route path="/tenant" element={<RequireAuth role="tenant"><TenantLayout /></RequireAuth>}>
          <Route index element={<TenantDashboard />} />
          <Route path="invoices"      element={<TenantInvoicesPage />} />
          <Route path="notifications" element={<TenantNotifications />} />
          <Route path="profile"       element={<TenantProfilePage />} />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

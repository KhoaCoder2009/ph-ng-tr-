import { Outlet } from 'react-router-dom'
import { TenantBottomNav } from './BottomNav'

export function TenantLayout() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-dark-bg">
      <main className="pb-20 min-h-screen">
        <Outlet />
      </main>
      <TenantBottomNav />
    </div>
  )
}

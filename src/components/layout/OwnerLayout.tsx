import { Outlet } from 'react-router-dom'
import { OwnerBottomNav } from './BottomNav'
import { DesktopSidebar } from './DesktopSidebar'

export function OwnerLayout() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-dark-bg">
      {/* Desktop sidebar */}
      <DesktopSidebar role="owner" />

      {/* Main content */}
      <div className="md:ml-64">
        {/* Page content */}
        <main className="pb-20 md:pb-6 min-h-screen">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <OwnerBottomNav />
    </div>
  )
}

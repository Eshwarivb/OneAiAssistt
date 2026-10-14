import React from 'react';
import DashboardSidebar from '@/components/dashboard-sidebar';
import DashboardHeader from '@/components/dashboard-header';
import { SidebarProvider } from '@/lib/sidebar-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="h-screen w-screen overflow-hidden flex bg-[#f8fafc] text-gray-900">
        {/* Dynamic Role-Gated Sidebar (Desktop Fixed + Mobile Drawer) */}
        <DashboardSidebar />

        {/* Main Panel Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Top Header Bar */}
          <DashboardHeader />

          {/* Child Page Frame */}
          <main className="flex-1 min-h-0 overflow-y-auto flex flex-col bg-[#f8fafc]">
            <div className="w-full max-w-[1720px] mx-auto p-3 sm:p-4 lg:p-5 flex-1 flex flex-col min-h-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

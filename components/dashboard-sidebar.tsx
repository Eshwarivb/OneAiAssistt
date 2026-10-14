'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import { useSidebar } from '@/lib/sidebar-context';
import { cn } from '@/lib/utils';
import { motion, LayoutGroup } from 'framer-motion';
import {
  LayoutDashboard,
  Inbox,
  Users,
  UserCheck,
  Megaphone,
  Calendar,
  CalendarClock,
  TrendingUp,
  LineChart,
  BarChart3,
  Bot,
  FileText,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
  LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  roles?: string[];
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { data: info } = useTenantInfo();
  const { isMobileOpen, setIsMobileOpen, isCollapsed, toggleCollapsed } = useSidebar();

  const userRole = info?.role || '';

  // Close mobile drawer automatically when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

  const sections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          name: 'Inbox',
          href: '/dashboard/inbox',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER', 'AGENT'],
          icon: Inbox,
        },
        {
          name: 'Leads',
          href: '/dashboard/leads',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER', 'AGENT'],
          icon: UserCheck,
        },
        {
          name: 'Customers',
          href: '/dashboard/customers',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER', 'AGENT'],
          icon: Users,
        },
        {
          name: 'Campaigns',
          href: '/dashboard/campaigns',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER', 'AGENT'],
          icon: Megaphone,
        },
        {
          name: 'Sequences',
          href: '/dashboard/sequences',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER'],
          icon: Calendar,
        },
        {
          name: 'Marketing',
          href: '/dashboard/marketing',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER'],
          icon: TrendingUp,
        },
        {
          name: 'Analytics',
          href: '/dashboard/analytics',
          icon: BarChart3,
        },
      ],
    },
    {
      title: 'AI & CONTENT',
      items: [
        {
          name: 'AI & Bot',
          href: '/dashboard/ai-bot',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER', 'AGENT'],
          icon: Bot,
        },
        {
          name: 'Templates',
          href: '/dashboard/templates',
          roles: ['PLATFORM_OWNER', 'ADMIN', 'MANAGER', 'AGENT'],
          icon: FileText,
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          name: 'Settings',
          href: '/dashboard/settings',
          roles: ['PLATFORM_OWNER', 'ADMIN'],
          icon: Settings,
        },
        {
          name: 'Superadmin',
          href: '/superadmin',
          roles: ['PLATFORM_OWNER'],
          icon: ShieldCheck,
        },
      ],
    },
  ];

  const renderNavContent = (collapsed: boolean) => (
    <>
      {/* Brand Header */}
      <div className={cn(
        "py-3.5 border-b border-white/10 flex items-center shrink-0 transition-all",
        collapsed ? "px-3 justify-center" : "px-4 justify-between"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold tracking-tight text-white text-base truncate">
              OneAI Assist
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto overflow-x-hidden">
        <LayoutGroup id={collapsed ? "sidebar-collapsed" : "sidebar-expanded"}>
          {sections.map((section) => {
            const filteredItems = section.items.filter(
              (item) => !item.roles || !userRole || item.roles.includes(userRole)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {!collapsed && (
                  <h5 className="px-3 text-[10px] font-bold text-white/50 uppercase tracking-widest text-left truncate">
                    {section.title}
                  </h5>
                )}

                <div className="space-y-0.5">
                  {filteredItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const IconComponent = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        title={collapsed ? item.name : undefined}
                        className={cn(
                          'relative flex items-center rounded-xl text-xs font-medium transition-colors duration-150',
                          collapsed
                            ? 'justify-center p-2'
                            : 'gap-2.5 px-3 py-2',
                          isActive
                            ? 'text-white font-semibold bg-white/15 border border-white/20 shadow-xs'
                            : 'text-white/80 hover:text-white hover:bg-white/10 border border-transparent'
                        )}
                      >
                        <IconComponent className="shrink-0 z-10 w-4 h-4" />
                        {!collapsed && (
                          <span className="z-10 truncate text-xs">
                            {item.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </LayoutGroup>
      </nav>

      {/* Footer / System Status */}
      <div className={cn(
        "p-3 border-t border-white/10 text-xs text-white/70 flex items-center shrink-0",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 truncate">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-medium text-white/90 text-[11px] truncate">System Online</span>
            </div>
            <span className="text-[11px] font-semibold text-white/60">V1.0</span>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Slide-Over Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#1252d4] border-r border-white/10 text-white w-64 lg:hidden transition-transform duration-300 ease-in-out shadow-2xl h-full",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-base">OneAI Assist</span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {renderNavContent(false)}
        </div>
      </aside>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col h-screen shrink-0 bg-[#1252d4] border-r border-white/10 text-white transition-[width] duration-200 ease-in-out z-20 sticky top-0",
          isCollapsed ? "w-16" : "w-52"
        )}
      >
        {renderNavContent(isCollapsed)}
      </aside>
    </>
  );
}

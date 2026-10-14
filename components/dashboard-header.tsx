'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import { useSidebar } from '@/lib/sidebar-context';
import { getClientSocket } from '@/lib/socket-client';
import NotificationBell from '@/components/notification-bell';
import { signOut } from 'next-auth/react';
import { 
  Menu, 
  LogOut,
  Search,
  UserPlus,
  Send,
  BarChart3,
  Bot,
  PhoneCall,
  UserCheck,
  ArrowRight,
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: info, isLoading } = useTenantInfo();
  const { setIsMobileOpen, isCollapsed, toggleCollapsed } = useSidebar();
  const queryClient = useQueryClient();

  const tenantId = info?.tenantId;

  // Search Bar & Quick Actions State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    {
      id: 'new-lead',
      name: 'New Lead',
      description: 'Add or import prospective clients into pipeline',
      href: '/dashboard/leads',
      icon: UserPlus,
      category: 'CRM',
      keywords: ['lead', 'prospect', 'customer', 'new', 'add', 'pipeline'],
      color: 'text-blue-600 bg-blue-50',
    },
    {
      id: 'campaigns',
      name: 'Campaigns',
      description: 'Create & broadcast WhatsApp outreach campaigns',
      href: '/dashboard/campaigns',
      icon: Send,
      category: 'Marketing',
      keywords: ['campaign', 'broadcast', 'marketing', 'blast', 'outreach'],
      color: 'text-cyan-600 bg-cyan-50',
    },
    {
      id: 'marketing',
      name: 'Marketing Suite',
      description: 'Track ROI attribution & audience segments',
      href: '/dashboard/marketing',
      icon: BarChart3,
      category: 'Marketing',
      keywords: ['marketing', 'suite', 'roi', 'analytics', 'conversion'],
      color: 'text-amber-600 bg-amber-50',
    },
    {
      id: 'ai-bot',
      name: 'AI & Bot',
      description: 'Customize bot persona, guardrails & knowledge base',
      href: '/dashboard/ai-bot',
      icon: Bot,
      category: 'Automation',
      keywords: ['ai', 'bot', 'copilot', 'rag', 'persona', 'automation'],
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      id: 'whatsapp-channel',
      name: 'WhatsApp Channel',
      description: 'Manage Baileys connection socket & phone number',
      href: '/dashboard/settings?tab=channels',
      icon: PhoneCall,
      category: 'Channels',
      keywords: ['whatsapp', 'socket', 'baileys', 'qr', 'disconnect', 'channel', 'phone'],
      color: 'text-teal-600 bg-teal-50',
    },
    {
      id: 'invite-team',
      name: 'Invite Team',
      description: 'Add support agents and manage member roles',
      href: '/dashboard/settings?tab=workspace&sub=team',
      icon: UserCheck,
      category: 'Workspace',
      keywords: ['invite', 'team', 'user', 'member', 'agent', 'admin'],
      color: 'text-indigo-600 bg-indigo-50',
    },
  ];

  const filteredActions = quickActions.filter((action) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      action.name.toLowerCase().includes(q) ||
      action.description.toLowerCase().includes(q) ||
      action.keywords.some((k) => k.includes(q))
    );
  });

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (Cmd/Ctrl + K) & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsSearchOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredActions.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(filteredActions.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        const target = filteredActions[selectedIndex].href;
        setIsSearchOpen(false);
        router.push(target);
      }
    }
  };

  // Real-time WhatsApp status
  const { data: waStatus, isLoading: isWaLoading } = useQuery<{
    status: string;
    phoneNumber?: string | null;
  }>({
    queryKey: ['whatsappStatus', tenantId],
    queryFn: async () => {
      if (!tenantId) return { status: 'DISCONNECTED', phoneNumber: null };
      const res = await fetch(`/api/whatsapp/status?tenantId=${encodeURIComponent(tenantId)}`);
      if (!res.ok) return { status: 'DISCONNECTED', phoneNumber: null };
      return res.json();
    },
    enabled: !!tenantId,
    refetchInterval: 15000,
    staleTime: 5000,
  });

  useEffect(() => {
    if (!tenantId) return;

    const socket = getClientSocket(tenantId, { forceNew: true });

    const handleStatus = (data: { status: string; phoneNumber?: string }) => {
      queryClient.setQueryData(['whatsappStatus', tenantId], (old: any) => ({
        ...old,
        status: data.status,
        phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber : old?.phoneNumber,
      }));
    };

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['whatsappStatus', tenantId] });
    };

    socket.on('whatsapp_status', handleStatus);
    socket.on('whatsapp_status_update', handleUpdate);
    socket.on('connect', handleUpdate);

    return () => {
      socket.off('whatsapp_status', handleStatus);
      socket.off('whatsapp_status_update', handleUpdate);
      socket.off('connect', handleUpdate);
      socket.disconnect();
    };
  }, [tenantId, queryClient]);

  const isConnected = waStatus?.status === 'CONNECTED';

  // Descriptive page titles matching target design
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/dashboard/inbox')) return 'Inbox';
    if (pathname.startsWith('/dashboard/leads')) return 'Leads';
    if (pathname.startsWith('/dashboard/customers')) return 'Customers';
    if (pathname.startsWith('/dashboard/campaigns')) return 'Campaigns';
    if (pathname.startsWith('/dashboard/sequences')) return 'Sequences';
    if (pathname.startsWith('/dashboard/marketing')) return 'Marketing';
    if (pathname.startsWith('/dashboard/analytics')) return 'Analytics';
    if (pathname.startsWith('/dashboard/ai-bot')) return 'AI & Bot';
    if (pathname.startsWith('/dashboard/templates')) return 'Templates';
    if (pathname.startsWith('/dashboard/settings')) return 'Settings';
    if (pathname.startsWith('/superadmin')) return 'Superadmin Master Console';

    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const pageName = parts[1];
      return pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, ' ');
    }
    return 'Dashboard';
  };

  const userInitial = info?.email ? info.email.charAt(0).toUpperCase() : 'A';

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 font-sans text-gray-900 sticky top-0">
      {/* Left: Sidebar Toggle + Title + Search Bar */}
      <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setIsMobileOpen(true);
            } else {
              toggleCollapsed();
            }
          }}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Toggle menu"
          title="Toggle menu"
        >
          {isCollapsed ? (
            <ChevronsRight className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronsLeft className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {/* Page Title */}
        <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight shrink-0">
          {getPageTitle()}
        </h1>

        {/* Top Header Search Bar with Quick Actions Integration */}
        <div ref={searchRef} className="relative w-44 sm:w-64 md:w-80 lg:w-96 max-w-md ml-1 sm:ml-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
                setSelectedIndex(0);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={handleInputKeyDown}
              placeholder="Search here..."
              className="w-full bg-[#f8fafc] hover:bg-slate-100/70 focus:bg-white text-xs text-gray-900 placeholder:text-gray-400 pl-9 pr-8 py-1.5 sm:py-2 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedIndex(0);
                }}
                className="absolute right-2.5 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-gray-400 bg-white border border-gray-200 rounded absolute right-2.5 shadow-2xs pointer-events-none">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Quick Actions Dropdown Menu */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 min-w-[280px]">
              <div className="px-3 py-2 bg-slate-50/80 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Quick Actions & Operations
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {filteredActions.length} actions
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
                {filteredActions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    No actions found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  filteredActions.map((action, idx) => {
                    const isSelected = idx === selectedIndex;
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          setIsSearchOpen(false);
                          router.push(action.href);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg text-left transition-all",
                          isSelected ? "bg-blue-50/80 text-blue-900" : "hover:bg-gray-50 text-gray-800"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", action.color)}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                              <span>{action.name}</span>
                              <span className="text-[9px] font-semibold text-gray-400 uppercase px-1.5 py-0.5 bg-gray-100 rounded">
                                {action.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-400 truncate">
                              {action.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-transform",
                          isSelected ? "text-blue-600 translate-x-0.5" : "text-gray-300"
                        )} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: WhatsApp Status, Notifications, User Profile & Sign Out */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* WhatsApp Connection Real-Time Status Pill */}
        {isLoading || (tenantId && isWaLoading && !waStatus) ? (
          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full text-xs font-medium text-slate-400 animate-pulse">
            <span className="inline-flex rounded-full h-2 w-2 bg-slate-300 shrink-0" />
            <span>Checking...</span>
          </div>
        ) : isConnected ? (
          <Link
            href="/dashboard/settings?tab=channels"
            title={waStatus?.phoneNumber ? `WhatsApp Connected: ${waStatus.phoneNumber}` : 'WhatsApp Connected'}
            className="hidden md:flex items-center gap-1.5 bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/80 px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-700 transition-colors"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>WhatsApp Connected</span>
          </Link>
        ) : (
          <Link
            href="/dashboard/settings?tab=channels"
            title="WhatsApp Disconnected • Click to connect line"
            className="hidden md:flex items-center gap-1.5 bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 px-2.5 py-1 rounded-full text-xs font-medium text-rose-700 transition-colors"
          >
            <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 shrink-0" />
            <span>Disconnected</span>
          </Link>
        )}

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Info & Profile Matching Screenshot 1 */}
        {isLoading ? (
          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
        ) : (
          <div className="flex items-center gap-2 pl-1">
            {/* User Avatar Circle */}
            <div className="w-8 h-8 rounded-full bg-[#1252d4] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {userInitial}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-left">
              <span className="text-xs text-gray-900 font-semibold truncate max-w-[130px]">
                {info?.email || 'admin@agency.com'}
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gray-100 text-gray-600 rounded uppercase tracking-wider">
                {info?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        )}

        {/* Clean Sign Out Button matching Screenshot 1 */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 px-2 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-xs font-medium ml-1"
          title="Sign out of OneAIAssist"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}

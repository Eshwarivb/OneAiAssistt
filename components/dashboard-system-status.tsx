'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Bot, Database, Clock, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardSystemStatusProps {
  waStatus?: 'CONNECTED' | 'DISCONNECTED';
  waEngine?: string;
  aiActive?: boolean;
  aiMessage?: string;
  dbHealthy?: boolean;
  msgUsage?: number;
  msgLimit?: number;
  lastUpdated?: string;
}

export default function DashboardSystemStatus({
  waStatus = 'CONNECTED',
  waEngine = 'Baileys socket active',
  aiActive = true,
  aiMessage = 'Responding to queries',
  dbHealthy = true,
  msgUsage = 0,
  msgLimit = 1000,
  lastUpdated,
}: DashboardSystemStatusProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(
    lastUpdated ||
      `Today, ${new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })}`
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setCurrentTime(
        `Today, ${new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}`
      );
      setIsRefreshing(false);
    }, 600);
  };

  const isWaConnected = waStatus === 'CONNECTED';

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
        SYSTEM STATUS
      </span>

      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          {/* 1. WhatsApp Status */}
          <div className="flex items-center gap-3.5 pt-2 sm:pt-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 truncate">WhatsApp</span>
                <span className="text-gray-300">•</span>
                <span className={cn(
                  "text-xs font-semibold flex items-center gap-1 truncate",
                  isWaConnected ? "text-emerald-700" : "text-rose-600"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    isWaConnected ? "bg-emerald-500" : "bg-rose-500"
                  )} />
                  {isWaConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {waEngine}
              </p>
            </div>
          </div>

          {/* 2. AI Agent Status */}
          <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:pl-6">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 truncate">AI Agent</span>
                <span className="text-gray-300">•</span>
                <span className={cn(
                  "text-xs font-semibold flex items-center gap-1 truncate",
                  aiActive ? "text-blue-700" : "text-amber-600"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    aiActive ? "bg-blue-500" : "bg-amber-500"
                  )} />
                  {aiActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {aiMessage}
              </p>
            </div>
          </div>

          {/* 3. API & Database */}
          <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:pl-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-900 truncate">API & Database</span>
                <span className="text-gray-300">•</span>
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {dbHealthy ? 'Healthy' : 'Degraded'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {msgUsage.toLocaleString()} / {msgLimit.toLocaleString()} used
              </p>
            </div>
          </div>

          {/* 4. Last Updated */}
          <div className="flex items-center justify-between gap-3.5 pt-3 sm:pt-0 sm:pl-6">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-gray-900 block truncate">
                  Last Updated
                </span>
                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                  {currentTime}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
              title="Refresh status"
              aria-label="Refresh system status"
            >
              <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-blue-600")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

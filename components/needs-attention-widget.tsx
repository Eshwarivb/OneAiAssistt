'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, UserX, FileCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  id: string;
  type: 'UNASSIGNED' | 'ESCALATION' | 'FAILED_BROADCAST';
  title: string;
  subtitle: string;
  timeAgo: string;
  href: string;
  actionText?: string;
}

interface NeedsAttentionWidgetProps {
  items?: AttentionItem[];
}

export default function NeedsAttentionWidget({ items = [] }: NeedsAttentionWidgetProps) {
  const displayItems = items;

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
      {/* Header matching Screenshot 1 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            Needs Attention
          </h3>
          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs font-bold rounded-full border border-rose-100">
            {displayItems.length}
          </span>
        </div>
        <Link
          href="/dashboard/inbox"
          className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 group"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Attention Item Cards */}
      <div className="space-y-3">
        {displayItems.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
            No items currently need attention. All inquiries and leads are handled.
          </div>
        ) : (
          displayItems.map((item) => {
            const actionLabel = item.actionText || (
              item.type === 'UNASSIGNED' ? 'Assign →' :
              item.type === 'ESCALATION' ? 'Review →' : 'Check →'
            );

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/60 hover:bg-slate-100/70 border border-slate-100 transition group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    item.type === 'UNASSIGNED' && "bg-rose-50 text-rose-500",
                    item.type === 'ESCALATION' && "bg-amber-50 text-amber-500",
                    item.type === 'FAILED_BROADCAST' && "bg-purple-50 text-purple-500"
                  )}>
                    {item.type === 'UNASSIGNED' && <UserX className="w-4 h-4" />}
                    {item.type === 'ESCALATION' && <AlertTriangle className="w-4 h-4" />}
                    {item.type === 'FAILED_BROADCAST' && <FileCheck className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-gray-400">
                    {item.timeAgo}
                  </span>
                  <span className="text-xs font-semibold text-blue-600 group-hover:underline">
                    {actionLabel}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

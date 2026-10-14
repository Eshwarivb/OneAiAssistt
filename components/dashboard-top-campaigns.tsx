'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export interface CampaignItem {
  id?: string;
  name: string;
  count: number;
  percentage: number;
}

interface DashboardTopCampaignsProps {
  campaigns?: CampaignItem[];
}

export default function DashboardTopCampaigns({
  campaigns = [],
}: DashboardTopCampaignsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <h3 className="text-base font-bold text-gray-900 tracking-tight">
          Top Campaigns
        </h3>

        {/* Range Selector */}
        <div className="relative inline-block text-left">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="appearance-none bg-white border border-gray-200 text-xs font-semibold text-gray-700 py-1.5 pl-3 pr-7 rounded-lg shadow-2xs hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Campaign Rows */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p>No broadcast campaigns found for this workspace.</p>
            <Link href="/dashboard/campaigns" className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline">
              + Create first campaign
            </Link>
          </div>
        ) : (
          campaigns.map((camp) => (
            <Link
              key={camp.id || camp.name}
              href="/dashboard/campaigns"
              className="block group"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate pr-2">
                  {camp.name}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-gray-900">
                    {camp.count.toLocaleString()}
                  </span>
                  <span className="text-gray-400 font-medium w-8 text-right">
                    {camp.percentage}%
                  </span>
                </div>
              </div>

              {/* Blue Progress Bar matching Screenshot 1 */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#2563eb] h-full rounded-full transition-all duration-500"
                  style={{ width: `${camp.percentage}%` }}
                />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

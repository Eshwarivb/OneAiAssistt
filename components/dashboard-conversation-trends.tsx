'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrendDataPoint {
  date: string;
  userMessages: number;
  botResponses: number;
}

interface DashboardConversationTrendsProps {
  data?: TrendDataPoint[];
}

export default function DashboardConversationTrends({
  data = [],
}: DashboardConversationTrendsProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Slice data based on selected time range
  const sliceCount = timeRange === '30d' ? 30 : timeRange === '14d' ? 14 : 7;
  const displayedData = data.slice(-sliceCount);

  // Calculate dynamic maximum value for Y-axis scaling
  const maxInSeries = Math.max(...displayedData.map((d) => Math.max(d.userMessages, d.botResponses)), 0);
  const baseCeil = maxInSeries > 100 ? 50 : maxInSeries > 20 ? 10 : 5;
  const maxValue = maxInSeries === 0 ? 10 : Math.max(Math.ceil(maxInSeries / baseCeil) * baseCeil, 10);
  const yTicks = [
    maxValue,
    Math.round(maxValue * 0.66),
    Math.round(maxValue * 0.33),
    0,
  ];

  return (
    <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            Conversation Trends
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
              User Messages
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#14b8a6]" />
              Bot Responses
            </span>
          </div>
        </div>

        {/* Range Selector */}
        <div className="relative inline-block text-left self-start sm:self-auto">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="appearance-none bg-white border border-gray-200 text-xs font-semibold text-gray-700 py-1.5 pl-3 pr-7 rounded-lg shadow-2xs hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="7d">Last 7 days</option>
            <option value="14d">Last 14 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-2">
        <div className="flex">
          {/* Y-Axis Labels */}
          <div className="flex flex-col justify-between h-48 pr-3 text-[11px] font-medium text-gray-400 shrink-0 text-right select-none pb-6">
            {yTicks.map((tick) => (
              <span key={tick} className="leading-none">
                {tick}
              </span>
            ))}
          </div>

          {/* Grid + Bars */}
          <div className="flex-1 relative flex flex-col justify-between h-48 pb-6">
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 pb-6 flex flex-col justify-between pointer-events-none">
              {yTicks.map((tick) => (
                <div key={tick} className="w-full border-b border-gray-100" />
              ))}
            </div>

            {/* Bars Column Container */}
            <div className="relative h-full flex items-end justify-between px-2 sm:px-4 z-10">
              {displayedData.map((item, idx) => {
                const userPct = Math.min(Math.round((item.userMessages / maxValue) * 100), 100);
                const botPct = Math.min(Math.round((item.botResponses / maxValue) * 100), 100);
                const isHovered = hoveredIndex === idx;

                return (
                  <div
                    key={item.date}
                    className="relative flex flex-col items-center flex-1 h-full justify-end group px-1"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 bg-gray-900 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                        <div className="font-bold text-gray-200">{item.date}</div>
                        <div>User: {item.userMessages} • Bot: {item.botResponses}</div>
                      </div>
                    )}

                    {/* Dual Bars Side-by-Side */}
                    <div className="flex items-end gap-1 sm:gap-1.5 h-full w-full justify-center">
                      {/* User Messages Bar (Blue) */}
                      <div
                        className={cn(
                          "w-2 sm:w-2.5 bg-[#2563eb] rounded-t-sm transition-all duration-300",
                          isHovered ? "brightness-110 scale-y-[1.02]" : "hover:brightness-105"
                        )}
                        style={{ height: `${userPct}%` }}
                      />

                      {/* Bot Responses Bar (Teal) */}
                      <div
                        className={cn(
                          "w-2 sm:w-2.5 bg-[#14b8a6] rounded-t-sm transition-all duration-300",
                          isHovered ? "brightness-110 scale-y-[1.02]" : "hover:brightness-105"
                        )}
                        style={{ height: `${botPct}%` }}
                      />
                    </div>

                    {/* X-Axis Date Label */}
                    <span className="text-[10px] font-medium text-gray-400 mt-2 truncate text-center select-none">
                      {item.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import {
  BarChart3,
  Users,
  MessageSquare,
  Trophy,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Share2,
  Mail,
  TrendingUp,
  Sparkles,
  Clock,
  Bot,
  Timer,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Send,
  Smartphone,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AnalyticsTab =
  | 'overview'
  | 'funnel'
  | 'revenue'
  | 'channels'
  | 'agents'
  | 'bot'
  | 'whatsapp';

interface EscalationLogItem {
  id: string;
  userQuestion: string;
  reason: string;
  triggeredAt: string;
}

interface AnalyticsData {
  range: string;
  overview: {
    totalLeads: number;
    leadsGrowthPct: number;
    totalConversations: number;
    conversationsGrowthPct: number;
    totalConversions: number;
    conversionsGrowthPct: number;
    totalRevenueDollars: number;
    revenueGrowthPct: number;
    botResolutionRatePct: number;
    avgConversationLengthMsgs: number;
    avgTimeToFirstAgentReplyMins: number;
  };
  trends?: {
    leadsAndConversations: Array<{
      date: string;
      fullDate: string;
      leads: number;
      conversations: number;
      conversions: number;
      revenue: number;
    }>;
    revenueTrend: Array<{
      date: string;
      revenue: number;
    }>;
  };
  recentPerformance?: Array<{
    date: string;
    leads: number;
    conversations: number;
    conversions: number;
    revenueDollars: number;
  }>;
  funnel: Array<{
    stage: string;
    name: string;
    count: number;
    dropoffPct: number;
    avgDays: number;
  }>;
  revenue: {
    byProduct: Array<{
      id: string;
      name: string;
      insurerName: string;
      activePolicies: number;
      monthlyPremiumRange: string;
      totalRevenue: number;
    }>;
    bySource: Array<{
      source: string;
      count: number;
      revenue: number;
    }>;
    pipelineForecastDollars: number;
  };
  channelPerformance: {
    channels: Array<{
      channel: string;
      name: string;
      leadCount: number;
      conversionRatePct: number;
    }>;
    bestBroadcast: {
      name: string;
      totalAudience: number;
      sentCount: number;
      readCount: number;
      deliveryRatePct: number;
      readRatePct: number;
      conversions: number;
    };
  };
  agentPerformance: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    conversationsHandled: number;
    leadsConverted: number;
    conversionRatePct: number;
    avgResponseTimeMins: number;
  }>;
  botPerformance: {
    escalationRatePct: number;
    topEscalationQuestions: EscalationLogItem[];
  };
  whatsappHealth: {
    phoneNumber: string;
    qualityRating: string;
    qualityTier: string;
    deliveryRatePct: number;
    optOutRatePct: number;
    sessionWindowUsagePct: number;
    status: string;
  };
}

// Format currency matching the UI screenshot style ($1420.0k)
function formatRevenueString(dollars: number): string {
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
  }
  return `$${dollars.toLocaleString()}`;
}

// Responsive SVG Mini Sparkline
function Sparkline({
  data,
  stroke,
  fillGradientId,
  height = 30,
  width = 80,
}: {
  data: number[];
  stroke: string;
  fillGradientId?: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points: [number, number][] = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return [x, y];
  });

  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev[0] + curr[0]) / 2;
    d += ` C ${cpX} ${prev[1]}, ${cpX} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }

  const areaD = `${d} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0 select-none">
      <defs>
        {fillGradientId && (
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
          </linearGradient>
        )}
      </defs>
      {fillGradientId && <path d={areaD} fill={`url(#${fillGradientId})`} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Dual Line / Area Chart for Leads & Conversations Trend
function LeadsAndConversationsChart({
  points,
}: {
  points: Array<{ date: string; leads: number; conversations: number }>;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-gray-400">
        No trend data available for this range.
      </div>
    );
  }

  const svgWidth = 600;
  const svgHeight = 220;
  const marginLeft = 35;
  const marginRight = 15;
  const marginTop = 15;
  const marginBottom = 30;

  const chartW = svgWidth - marginLeft - marginRight;
  const chartH = svgHeight - marginTop - marginBottom;

  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.leads, p.conversations)),
    10
  );
  // Round up to nice even step
  const maxY = Math.max(80, Math.ceil(maxVal / 20) * 20);

  // Y-axis grid ticks (e.g. 0, 20, 40, 60, 80)
  const yTicks = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];

  // Coordinates
  const getX = (i: number) => points.length === 1 ? marginLeft + chartW / 2 : marginLeft + (i / Math.max(1, points.length - 1)) * chartW;
  const getY = (val: number) => marginTop + chartH - (val / maxY) * chartH;

  // Build Leads path
  const leadsCoords: [number, number][] = points.map((p, i) => [getX(i), getY(p.leads)]);
  let leadsD = `M ${leadsCoords[0][0]} ${leadsCoords[0][1]}`;
  for (let i = 1; i < leadsCoords.length; i++) {
    const prev = leadsCoords[i - 1];
    const curr = leadsCoords[i];
    const cpX = (prev[0] + curr[0]) / 2;
    leadsD += ` C ${cpX} ${prev[1]}, ${cpX} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }
  const leadsAreaD = `${leadsD} L ${leadsCoords[leadsCoords.length - 1][0]} ${marginTop + chartH} L ${leadsCoords[0][0]} ${marginTop + chartH} Z`;

  // Build Conversations path
  const convCoords: [number, number][] = points.map((p, i) => [getX(i), getY(p.conversations)]);
  let convD = `M ${convCoords[0][0]} ${convCoords[0][1]}`;
  for (let i = 1; i < convCoords.length; i++) {
    const prev = convCoords[i - 1];
    const curr = convCoords[i];
    const cpX = (prev[0] + curr[0]) / 2;
    convD += ` C ${cpX} ${prev[1]}, ${cpX} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }
  const convAreaD = `${convD} L ${convCoords[convCoords.length - 1][0]} ${marginTop + chartH} L ${convCoords[0][0]} ${marginTop + chartH} Z`;

  // Sample labels for X-axis (up to 7 labels)
  const step = Math.max(1, Math.floor((points.length - 1) / 6));
  const labeledIndices = new Set<number>();
  for (let i = 0; i < points.length; i += step) {
    labeledIndices.add(i);
  }
  labeledIndices.add(points.length - 1);

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;
  const activeX = hoverIndex !== null ? getX(hoverIndex) : 0;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="chart-leads-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="chart-conv-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines and Y labels */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={marginLeft}
                y1={y}
                x2={marginLeft + chartW}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={marginLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[10px] fill-gray-400 font-medium font-sans"
              >
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Areas */}
        <path d={leadsAreaD} fill="url(#chart-leads-grad)" />
        <path d={convAreaD} fill="url(#chart-conv-grad)" />

        {/* Lines */}
        <path
          d={leadsD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={convD}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots on points */}
        {points.map((p, i) => {
          const x = getX(i);
          const yLeads = getY(p.leads);
          const yConv = getY(p.conversations);
          return (
            <g key={i}>
              <circle cx={x} cy={yLeads} r="2.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx={x} cy={yConv} r="2.5" fill="#8b5cf6" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* Active hover indicator */}
        {hoverIndex !== null && (
          <line
            x1={activeX}
            y1={marginTop}
            x2={activeX}
            y2={marginTop + chartH}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Interactive capture columns */}
        {points.map((_, i) => {
          const colW = chartW / Math.max(1, points.length - 1);
          const x = getX(i) - colW / 2;
          return (
            <rect
              key={i}
              x={Math.max(marginLeft, x)}
              y={marginTop}
              width={colW}
              height={chartH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}

        {/* X-axis labels */}
        {points.map((p, i) => {
          if (!labeledIndices.has(i)) return null;
          const x = getX(i);
          return (
            <text
              key={i}
              x={x}
              y={marginTop + chartH + 18}
              textAnchor="middle"
              className="text-[10px] fill-gray-400 font-medium font-sans"
            >
              {p.date}
            </text>
          );
        })}
      </svg>

      {/* Tooltip on hover */}
      {hoverIndex !== null && activePoint && (
        <div
          className="absolute z-20 pointer-events-none bg-gray-900/90 text-white rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg transform -translate-x-1/2 -top-2"
          style={{
            left: `${(activeX / svgWidth) * 100}%`,
          }}
        >
          <div className="font-semibold text-[10px] text-gray-300 border-b border-gray-700/80 pb-0.5 mb-1">
            {activePoint.date}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Leads: <strong className="text-white">{activePoint.leads}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Conversations: <strong className="text-white">{activePoint.conversations}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}

// Vertical Bar Chart for Revenue Trend
function RevenueBarChart({
  points,
}: {
  points: Array<{ date: string; revenue: number }>;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-xs text-gray-400">
        No revenue trend data available.
      </div>
    );
  }

  const svgWidth = 600;
  const svgHeight = 220;
  const marginLeft = 35;
  const marginRight = 15;
  const marginTop = 15;
  const marginBottom = 30;

  const chartW = svgWidth - marginLeft - marginRight;
  const chartH = svgHeight - marginTop - marginBottom;

  const maxVal = Math.max(...points.map((p) => p.revenue), 1000);
  const maxY = Math.max(2000, Math.ceil(maxVal / 500) * 500);

  const yTicks = [0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY];

  const barSlotW = chartW / points.length;
  const barW = Math.max(4, Math.min(18, barSlotW * 0.6));

  const getY = (val: number) => marginTop + chartH - (val / maxY) * chartH;

  const step = Math.max(1, Math.floor((points.length - 1) / 6));
  const labeledIndices = new Set<number>();
  for (let i = 0; i < points.length; i += step) {
    labeledIndices.add(i);
  }
  labeledIndices.add(points.length - 1);

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal grid lines & Y labels */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          const label = tick === 0 ? '0' : tick >= 1000 ? `${(tick / 1000).toFixed(tick % 1000 === 0 ? 0 : 1)}K` : `${tick}`;
          return (
            <g key={tick}>
              <line
                x1={marginLeft}
                y1={y}
                x2={marginLeft + chartW}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={marginLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="text-[10px] fill-gray-400 font-medium font-sans"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {points.map((p, i) => {
          const x = marginLeft + i * barSlotW + (barSlotW - barW) / 2;
          const barH = Math.max(3, (p.revenue / maxY) * chartH);
          const y = marginTop + chartH - barH;
          const isHovered = hoverIndex === i;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="3"
                className="transition-colors cursor-pointer"
                fill={isHovered ? '#059669' : '#10b981'}
              />
              {/* Invisible touch column for easy hover */}
              <rect
                x={marginLeft + i * barSlotW}
                y={marginTop}
                width={barSlotW}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {points.map((p, i) => {
          if (!labeledIndices.has(i)) return null;
          const x = marginLeft + i * barSlotW + barSlotW / 2;
          return (
            <text
              key={i}
              x={x}
              y={marginTop + chartH + 18}
              textAnchor="middle"
              className="text-[10px] fill-gray-400 font-medium font-sans"
            >
              {p.date}
            </text>
          );
        })}
      </svg>

      {/* Tooltip on hover */}
      {hoverIndex !== null && activePoint && (
        <div
          className="absolute z-20 pointer-events-none bg-gray-900/90 text-white rounded-lg px-2.5 py-1.5 text-[11px] shadow-lg transform -translate-x-1/2 -top-2"
          style={{
            left: `${((marginLeft + hoverIndex * barSlotW + barSlotW / 2) / svgWidth) * 100}%`,
          }}
        >
          <div className="font-semibold text-[10px] text-gray-300">
            {activePoint.date}
          </div>
          <div className="text-emerald-400 font-bold mt-0.5">
            ${activePoint.revenue.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

type IntervalOption = 'Daily' | 'Weekly' | 'Monthly';

function aggregateTrendPoints(
  points: Array<{
    date: string;
    fullDate?: string;
    leads: number;
    conversations: number;
    conversions: number;
    revenue: number;
  }>,
  interval: IntervalOption
) {
  if (!points || points.length === 0 || interval === 'Daily') {
    return points;
  }
  const chunkSize = interval === 'Weekly' ? 7 : 30;
  const result: Array<{
    date: string;
    fullDate?: string;
    leads: number;
    conversations: number;
    conversions: number;
    revenue: number;
  }> = [];

  for (let i = 0; i < points.length; i += chunkSize) {
    const chunk = points.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const last = chunk[chunk.length - 1];

    let dateLabel = first.date;
    if (interval === 'Weekly') {
      const firstParts = first.date.split(' ');
      const lastParts = last.date.split(' ');
      dateLabel = chunk.length > 1
        ? `${firstParts[0]} ${firstParts[1] || ''}–${lastParts[1] || ''}`
        : first.date;
    } else if (interval === 'Monthly') {
      dateLabel = first.date.split(' ')[0] || `M${Math.floor(i / chunkSize) + 1}`;
    }

    const revSum = chunk.reduce((acc, p) => acc + (p.revenue || 0), 0);

    result.push({
      date: dateLabel,
      fullDate: last.fullDate || last.date,
      leads: last.leads,
      conversations: last.conversations,
      conversions: last.conversions,
      revenue: revSum,
    });
  }
  return result;
}

function aggregateRevenuePoints(
  points: Array<{ date: string; revenue: number }>,
  interval: IntervalOption
) {
  if (!points || points.length === 0 || interval === 'Daily') {
    return points;
  }
  const chunkSize = interval === 'Weekly' ? 7 : 30;
  const result: Array<{ date: string; revenue: number }> = [];

  for (let i = 0; i < points.length; i += chunkSize) {
    const chunk = points.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const first = chunk[0];
    const last = chunk[chunk.length - 1];

    let dateLabel = first.date;
    if (interval === 'Weekly') {
      const firstParts = first.date.split(' ');
      const lastParts = last.date.split(' ');
      dateLabel = chunk.length > 1
        ? `${firstParts[0]} ${firstParts[1] || ''}–${lastParts[1] || ''}`
        : first.date;
    } else if (interval === 'Monthly') {
      dateLabel = first.date.split(' ')[0] || `M${Math.floor(i / chunkSize) + 1}`;
    }

    const revSum = chunk.reduce((acc, p) => acc + (p.revenue || 0), 0);

    result.push({
      date: dateLabel,
      revenue: revSum,
    });
  }
  return result;
}

export default function AnalyticsDashboardPage() {
  const { data: tenantInfo } = useTenantInfo();
  const tenantId = tenantInfo?.tenantId || 'tenant_pme_ff9xl';

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [dateRange, setDateRange] = useState<string>('30d');
  const [showDateDropdown, setShowDateDropdown] = useState<boolean>(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);

  const [leadsInterval, setLeadsInterval] = useState<IntervalOption>('Daily');
  const [showLeadsIntervalDropdown, setShowLeadsIntervalDropdown] = useState<boolean>(false);

  const [revenueInterval, setRevenueInterval] = useState<IntervalOption>('Daily');
  const [showRevenueIntervalDropdown, setShowRevenueIntervalDropdown] = useState<boolean>(false);

  const [showSummaryDateDropdown, setShowSummaryDateDropdown] = useState<boolean>(false);

  const dateRangeRef = useRef<HTMLDivElement>(null);
  const summaryDateRef = useRef<HTMLDivElement>(null);
  const leadsIntervalRef = useRef<HTMLDivElement>(null);
  const revenueIntervalRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dateRangeRef.current && !dateRangeRef.current.contains(target)) {
        setShowDateDropdown(false);
      }
      if (summaryDateRef.current && !summaryDateRef.current.contains(target)) {
        setShowSummaryDateDropdown(false);
      }
      if (leadsIntervalRef.current && !leadsIntervalRef.current.contains(target)) {
        setShowLeadsIntervalDropdown(false);
      }
      if (revenueIntervalRef.current && !revenueIntervalRef.current.contains(target)) {
        setShowRevenueIntervalDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Date range options mapping
  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'this_month', label: 'This Month' },
  ];

  // TanStack Query for dynamic data fetching (polls every 15s to react to live changes)
  const { data, isLoading, isError, refetch } = useQuery<AnalyticsData>({
    queryKey: ['analyticsMetrics', tenantId, dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?range=${dateRange}`);
      if (!res.ok) throw new Error('Failed to load analytics metrics');
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Scheduled Email Report Mutation
  const sendReportMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch('/api/analytics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, tab: activeTab, range: dateRange }),
      });
      if (!res.ok) throw new Error('Failed to send email report');
      return res.json();
    },
    onSuccess: (resData) => {
      setShareMsg(resData.message || 'Report sent successfully!');
      setShowEmailModal(false);
      setTimeout(() => setShareMsg(null), 4000);
    },
    onError: () => {
      setShareMsg('Failed to send report. Please try again.');
      setTimeout(() => setShareMsg(null), 4000);
    },
  });

  const handleExportCSV = () => {
    window.open(`/api/analytics/export?tab=${activeTab}&range=${dateRange}`, '_blank');
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareMsg('Analytics dashboard link copied to clipboard!');
    setTimeout(() => setShareMsg(null), 3000);
  };

  const tabs: Array<{ id: AnalyticsTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'funnel', label: 'Lead Funnel' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'channels', label: 'Channel Performance' },
    { id: 'agents', label: 'Agent Performance' },
    { id: 'bot', label: 'Bot Performance' },
    { id: 'whatsapp', label: 'WhatsApp Health' },
  ];

  // Derived trend array from real data
  const trendPoints = data?.trends?.leadsAndConversations || [];
  const leadsSparkline = trendPoints.map((p) => p.leads);
  const convsSparkline = trendPoints.map((p) => p.conversations);
  const wonSparkline = trendPoints.map((p) => p.conversions);
  const revenueSparkline = trendPoints.map((p) => p.revenue);

  // Derived display points based on interval selections
  const displayTrendPoints = aggregateTrendPoints(trendPoints, leadsInterval);
  const revenuePoints = trendPoints.map((p) => ({ date: p.date, revenue: p.revenue }));
  const displayRevenuePoints = aggregateRevenuePoints(revenuePoints, revenueInterval);

  // Recent Performance table records (derived from real data)
  const recentRows = data?.recentPerformance || [];

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans text-gray-900 space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-[#004ac6] shrink-0 stroke-[2]" />
            <span>Analytics &amp; Reports</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Live performance metrics, revenue forecasts, lead funnel conversion rates, and bot SLA analytics.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {shareMsg && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-pulse">
              {shareMsg}
            </span>
          )}

          {/* Date Range Selector Dropdown */}
          <div className="relative" ref={dateRangeRef}>
            <button
              type="button"
              onClick={() => setShowDateDropdown((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{dateRangeOptions.find((o) => o.value === dateRange)?.label || 'Last 30 Days'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                {dateRangeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDateRange(opt.value);
                      setShowDateDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer",
                      dateRange === opt.value
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <span>{opt.label}</span>
                    {dateRange === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Share */}
          <button
            type="button"
            onClick={handleShareClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors bg-white shadow-2xs cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-gray-500" />
            <span>Share</span>
          </button>

          {/* Email Report */}
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-blue-600 hover:bg-blue-50/50 text-xs font-semibold transition-colors bg-white shadow-2xs cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>Email Report</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* PDF Print */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#111827] hover:bg-black text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF Print</span>
          </button>
        </div>
      </div>

      {/* 2. Secondary Navigation Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-6 sm:gap-8 min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-3 text-xs whitespace-nowrap transition border-b-2 cursor-pointer",
                  isActive
                    ? "border-[#004ac6] text-[#004ac6] font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-900 font-medium"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Loading State */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white border border-gray-200 rounded-2xl p-5 animate-pulse shadow-2xs" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-72 bg-white border border-gray-200 rounded-2xl animate-pulse shadow-2xs" />
            <div className="h-72 bg-white border border-gray-200 rounded-2xl animate-pulse shadow-2xs" />
          </div>
        </div>
      ) : isError || !data ? (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-gray-900">Failed to load analytics metrics</p>
          <p className="text-xs text-gray-500">There was an issue communicating with the analytics service.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Row 1: Top 4 KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* 1. Total Leads */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">Total Leads</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {data.overview.totalLeads.toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                          data.overview.leadsGrowthPct >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {data.overview.leadsGrowthPct >= 0 ? `↑ ${data.overview.leadsGrowthPct}%` : `↓ ${Math.abs(data.overview.leadsGrowthPct)}%`}
                      </span>
                    </div>
                  </div>
                  <Sparkline
                    data={leadsSparkline.length > 0 ? leadsSparkline : [4, 6, 8, 10, 14]}
                    stroke="#3b82f6"
                    fillGradientId="spark-leads"
                  />
                </div>

                {/* 2. Total Conversations */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">Total Conversations</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {data.overview.totalConversations.toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                          data.overview.conversationsGrowthPct >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {data.overview.conversationsGrowthPct >= 0 ? `↑ ${data.overview.conversationsGrowthPct}%` : `↓ ${Math.abs(data.overview.conversationsGrowthPct)}%`}
                      </span>
                    </div>
                  </div>
                  <Sparkline
                    data={convsSparkline.length > 0 ? convsSparkline : [12, 18, 22, 28, 33]}
                    stroke="#8b5cf6"
                    fillGradientId="spark-convs"
                  />
                </div>

                {/* 3. Total Conversions (Won) */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">Total Conversions (Won)</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {data.overview.totalConversions.toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                          data.overview.conversionsGrowthPct > 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {data.overview.conversionsGrowthPct > 0 ? `↑ ${data.overview.conversionsGrowthPct}%` : `- 0%`}
                      </span>
                    </div>
                  </div>
                  <Sparkline
                    data={wonSparkline.length > 0 ? wonSparkline : [1, 2, 2, 3, 4]}
                    stroke="#f59e0b"
                    fillGradientId="spark-won"
                  />
                </div>

                {/* 4. Total Revenue */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">Total Revenue</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                        {formatRevenueString(data.overview.totalRevenueDollars)}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                          data.overview.revenueGrowthPct >= 0
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {data.overview.revenueGrowthPct >= 0 ? `↑ ${data.overview.revenueGrowthPct}%` : `↓ ${Math.abs(data.overview.revenueGrowthPct)}%`}
                      </span>
                    </div>
                  </div>
                  <Sparkline
                    data={revenueSparkline.length > 0 ? revenueSparkline : [400, 650, 900, 1100, 1420]}
                    stroke="#0284c7"
                    fillGradientId="spark-revenue"
                  />
                </div>
              </div>

              {/* Row 2: Two Large Charts Side-by-Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Leads & Conversations Trend */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Leads &amp; Conversations Trend</h3>

                    <div className="flex items-center gap-4">
                      {/* Legend */}
                      <div className="flex items-center gap-3 text-xs font-medium text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
                          <span>Leads</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                          <span>Conversations</span>
                        </span>
                      </div>

                      {/* Leads Interval Dropdown */}
                      <div className="relative" ref={leadsIntervalRef}>
                        <button
                          type="button"
                          onClick={() => setShowLeadsIntervalDropdown((prev) => !prev)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 transition cursor-pointer"
                        >
                          <span>{leadsInterval}</span>
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                        {showLeadsIntervalDropdown && (
                          <div className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                            {(['Daily', 'Weekly', 'Monthly'] as const).map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setLeadsInterval(opt);
                                  setShowLeadsIntervalDropdown(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition cursor-pointer",
                                  leadsInterval === opt
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                )}
                              >
                                <span>{opt}</span>
                                {leadsInterval === opt && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <LeadsAndConversationsChart points={displayTrendPoints} />
                </div>

                {/* Revenue Trend */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Revenue Trend</h3>

                    {/* Revenue Interval Dropdown */}
                    <div className="relative" ref={revenueIntervalRef}>
                      <button
                        type="button"
                        onClick={() => setShowRevenueIntervalDropdown((prev) => !prev)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 transition cursor-pointer"
                      >
                        <span>{revenueInterval}</span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                      {showRevenueIntervalDropdown && (
                        <div className="absolute right-0 top-full mt-1.5 w-32 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                          {(['Daily', 'Weekly', 'Monthly'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setRevenueInterval(opt);
                                setShowRevenueIntervalDropdown(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition cursor-pointer",
                                revenueInterval === opt
                                  ? "bg-blue-50 text-blue-600"
                                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                              )}
                            >
                              <span>{opt}</span>
                              {revenueInterval === opt && <Check className="w-3.5 h-3.5 text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <RevenueBarChart points={displayRevenuePoints} />
                </div>
              </div>

              {/* Row 3: 3 Efficiency Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bot Resolution Rate */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">Bot Resolution Rate</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl font-bold text-gray-900">
                        {data.overview.botResolutionRatePct}%
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        ↑ 2.4%
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">Resolved without agent handoff</p>
                  </div>
                  <Sparkline
                    data={[7.2, 7.8, 8.4, 8.9, data.overview.botResolutionRatePct]}
                    stroke="#10b981"
                  />
                </div>

                {/* Avg Conversation Length */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">Avg Conversation Length</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl font-bold text-gray-900">
                        {data.overview.avgConversationLengthMsgs} msgs
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                        ↑ 1.2%
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">Average messages per chat</p>
                  </div>
                  <Sparkline
                    data={[16, 17.5, 18.2, 19.5, data.overview.avgConversationLengthMsgs]}
                    stroke="#8b5cf6"
                  />
                </div>

                {/* Avg Agent First Reply */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Timer className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium text-gray-500">Avg Agent First Reply</span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl font-bold text-gray-900">
                        {data.overview.avgTimeToFirstAgentReplyMins} mins
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        ↑ 18%
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">Response SLA time</p>
                  </div>
                  <Sparkline
                    data={[4.8, 4.2, 3.8, 3.5, data.overview.avgTimeToFirstAgentReplyMins]}
                    stroke="#14b8a6"
                  />
                </div>
              </div>

              {/* Row 4: Recent Performance Table & Performance Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Recent Performance Table (7 cols) */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Recent Performance</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('funnel')}
                      className="text-xs font-semibold text-[#004ac6] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 text-gray-400 font-medium">
                          <th className="pb-3 font-semibold">Date</th>
                          <th className="pb-3 font-semibold text-center">Leads</th>
                          <th className="pb-3 font-semibold text-center">Conversations</th>
                          <th className="pb-3 font-semibold text-center">Conversions (Won)</th>
                          <th className="pb-3 font-semibold text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-gray-700">
                        {recentRows.length > 0 ? (
                          recentRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-3 font-medium text-gray-900">{row.date}</td>
                              <td className="py-3 text-center font-medium">{row.leads}</td>
                              <td className="py-3 text-center font-medium">{row.conversations}</td>
                              <td className="py-3 text-center font-medium">{row.conversions}</td>
                              <td className="py-3 text-right font-bold text-gray-900">
                                {formatRevenueString(row.revenueDollars)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-gray-400">
                              No recent activity records for this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Performance Summary (5 cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-[#004ac6]" />
                        <h3 className="text-sm font-bold text-gray-900">Performance Summary</h3>
                      </div>
                      {/* Summary Date Range Dropdown */}
                      <div className="relative" ref={summaryDateRef}>
                        <button
                          type="button"
                          onClick={() => setShowSummaryDateDropdown((prev) => !prev)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 transition cursor-pointer"
                        >
                          <span>{dateRangeOptions.find((o) => o.value === dateRange)?.label || 'Last 30 Days'}</span>
                          <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                        {showSummaryDateDropdown && (
                          <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-gray-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                            {dateRangeOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setDateRange(opt.value);
                                  setShowSummaryDateDropdown(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-semibold rounded-lg text-left transition cursor-pointer",
                                  dateRange === opt.value
                                    ? "bg-blue-50 text-blue-600"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                )}
                              >
                                <span>{opt.label}</span>
                                {dateRange === opt.value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-1 text-xs text-gray-700">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Leads {data.overview.leadsGrowthPct >= 0 ? 'increased' : 'decreased'} by{' '}
                          <strong className="text-gray-900">{Math.abs(data.overview.leadsGrowthPct)}%</strong> compared to previous period.
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          Total revenue {data.overview.revenueGrowthPct >= 0 ? 'increased' : 'decreased'} by{' '}
                          <strong className="text-gray-900">{Math.abs(data.overview.revenueGrowthPct)}%</strong>.
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>
                          Bot resolution rate is{' '}
                          <strong className="text-gray-900">{data.overview.botResolutionRatePct}%</strong>.
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Average agent first reply time is{' '}
                          <strong className="text-gray-900">{data.overview.avgTimeToFirstAgentReplyMins} mins</strong>.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LEAD FUNNEL */}
          {activeTab === 'funnel' && (
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-gray-900">Lead Funnel Visualization</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Stage-by-stage customer pipeline progression from initial outreach to policy issuance.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                {data.funnel.map((step, index) => (
                  <div key={step.stage} className="bg-gray-50/60 border border-gray-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#004ac6] uppercase tracking-wider block">
                        Step {index + 1}
                      </span>
                      <h4 className="text-xs font-bold text-gray-900 mt-1 truncate">{step.name}</h4>
                    </div>
                    <div className="py-2 border-y border-gray-200 text-center">
                      <span className="text-2xl font-extrabold text-[#004ac6]">{step.count}</span>
                      <span className="text-[11px] text-gray-500 block">leads</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-gray-500">
                      <p className="flex justify-between">
                        <span>Drop-off:</span>
                        <strong className="text-red-600 font-semibold">{step.dropoffPct}%</strong>
                      </p>
                      <p className="flex justify-between">
                        <span>Avg Time:</span>
                        <strong className="text-gray-900 font-semibold">{step.avgDays}d</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REVENUE */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* Pipeline Forecast Banner */}
              <div className="bg-[#004ac6] text-white p-6 rounded-2xl shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-blue-200 block">
                    Pipeline Forecast (Open Deals)
                  </span>
                  <h3 className="text-3xl font-extrabold mt-1">
                    ${data.revenue.pipelineForecastDollars.toLocaleString()}
                  </h3>
                  <p className="text-xs text-blue-100 mt-1">
                    Sum of estimated policy deal values currently in New, Qualified &amp; Negotiation stages.
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Revenue by Product & Revenue by Source */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">Revenue by Policy Plan</h4>
                  <div className="space-y-2.5">
                    {data.revenue.byProduct.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-50/60 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-900">{item.name}</p>
                          <p className="text-gray-500 text-[11px]">{item.insurerName} • {item.monthlyPremiumRange}/mo</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-[#004ac6] text-sm">${item.totalRevenue.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">{item.activePolicies} active policies</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">Revenue by Lead Source</h4>
                  <div className="space-y-2.5">
                    {data.revenue.bySource.map((src) => (
                      <div key={src.source} className="p-3 bg-gray-50/60 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-900">{src.source}</p>
                          <p className="text-gray-500 text-[11px]">{src.count} converted sales</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-emerald-600 text-sm">${src.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHANNEL PERFORMANCE */}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <h4 className="text-sm font-bold text-gray-900">Inbound Lead Volume by Channel</h4>
                  <div className="space-y-2.5">
                    {data.channelPerformance.channels.map((ch) => (
                      <div key={ch.channel} className="p-3 bg-gray-50/60 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="w-4 h-4 text-[#004ac6]" />
                          <span className="font-bold text-gray-900">{ch.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <span><strong className="text-gray-900">{ch.leadCount}</strong> leads</span>
                          <span className="text-emerald-600 font-semibold">{ch.conversionRatePct}% conv</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#004ac6]">Top Campaign</span>
                  <h4 className="text-sm font-bold text-gray-900">{data.channelPerformance.bestBroadcast.name}</h4>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                      <span className="text-xs text-gray-600 block">Delivery Rate</span>
                      <span className="text-2xl font-extrabold text-[#004ac6] mt-1 block">
                        {data.channelPerformance.bestBroadcast.deliveryRatePct}%
                      </span>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                      <span className="text-xs text-gray-600 block">Read Rate</span>
                      <span className="text-2xl font-extrabold text-emerald-600 mt-1 block">
                        {data.channelPerformance.bestBroadcast.readRatePct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AGENT PERFORMANCE */}
          {activeTab === 'agents' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Agency Team Performance Leaderboard</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/60 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Agent Name</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-center">Chats Handled</th>
                      <th className="py-3 px-4 text-center">Leads Converted</th>
                      <th className="py-3 px-4 text-center">Conversion %</th>
                      <th className="py-3 px-4 text-right">Avg Response SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {data.agentPerformance.map((ag) => (
                      <tr key={ag.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {ag.name} <span className="font-normal text-gray-500">({ag.email})</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#004ac6] border border-blue-100 font-bold text-[10px]">
                            {ag.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">{ag.conversationsHandled}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{ag.leadsConverted}</td>
                        <td className="py-3.5 px-4 text-center font-bold">{ag.conversionRatePct}%</td>
                        <td className="py-3.5 px-4 text-right text-gray-600">{ag.avgResponseTimeMins} mins</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: BOT PERFORMANCE */}
          {activeTab === 'bot' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Bot Escalation Rate</h4>
                  <p className="text-xs text-gray-500 mt-1">Percentage of automated chats escalated to human agents</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold text-amber-600">{data.botPerformance.escalationRatePct}%</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900">Top Escalation-Triggering Inquiries</h4>
                <div className="space-y-2.5">
                  {data.botPerformance.topEscalationQuestions.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50/60 border border-gray-200 rounded-xl text-xs space-y-1">
                      <p className="font-bold text-gray-900">&quot;{log.userQuestion}&quot;</p>
                      <div className="flex items-center justify-between text-gray-500 text-[11px]">
                        <span>Reason: <strong className="text-amber-700 font-semibold">{log.reason}</strong></span>
                        <span>{new Date(log.triggeredAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: WHATSAPP HEALTH */}
          {activeTab === 'whatsapp' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900">WhatsApp Business Health Status</h4>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Phone Number:</span>
                    <strong className="text-gray-900">{data.whatsappHealth.phoneNumber}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Quality Rating:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                      {data.whatsappHealth.qualityRating}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Messaging Tier:</span>
                    <strong className="text-gray-900">{data.whatsappHealth.qualityTier}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">Connection Status:</span>
                    <strong className="text-emerald-600 uppercase font-bold">{data.whatsappHealth.status}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900">Messaging Quality SLAs</h4>
                <div className="grid grid-cols-2 gap-3 text-center text-xs pt-1">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-gray-600 block">Delivery Rate</span>
                    <span className="text-2xl font-extrabold text-emerald-700 mt-1 block">
                      {data.whatsappHealth.deliveryRatePct}%
                    </span>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-gray-600 block">24h Session Usage</span>
                    <span className="text-2xl font-extrabold text-[#004ac6] mt-1 block">
                      {data.whatsappHealth.sessionWindowUsagePct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email Report Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#004ac6]" />
              <span>Send Scheduled Email Report</span>
            </h3>
            <p className="text-xs text-gray-500">
              Enter recipient email address to send an executive PDF/CSV report for Prime Marketing Experts.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="admin@primemarketingexperts.com"
              className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-blue-100"
            />
            <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => sendReportMutation.mutate(emailInput || 'admin@primemarketingexperts.com')}
                disabled={sendReportMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {sendReportMutation.isPending ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

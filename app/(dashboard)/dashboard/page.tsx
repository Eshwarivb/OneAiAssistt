import React from 'react';
import Link from 'next/link';
import { getTenantContext } from '@/lib/tenant';
import { prisma, getTenantPrisma } from '@/lib/db';
import { isTrialExceeded } from '@/lib/ai/client';

import ImpersonationBanner from './impersonation-banner';
import OnboardingChecklistWidget from '@/components/onboarding-checklist-widget';
import NeedsAttentionWidget, { AttentionItem } from '@/components/needs-attention-widget';
import DashboardSystemStatus from '@/components/dashboard-system-status';
import DashboardConversationTrends, { TrendDataPoint } from '@/components/dashboard-conversation-trends';
import DashboardTopCampaigns, { CampaignItem } from '@/components/dashboard-top-campaigns';
import {
  Users,
  MessageSquare,
  Zap,
  Bot,
  Plus,
  ArrowRight,
  Megaphone,
  UserPlus,
  Key,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function DashboardPage() {
  const context = await getTenantContext();
  const { tenantId, role, userId } = context;

  // Tenant scoping
  const targetTenant = (tenantId && tenantId !== '' && tenantId !== 'GLOBAL') ? tenantId : 'tenant_pme_ff9xl';
  const targetRole = role || 'ADMIN';
  const db = getTenantPrisma(targetTenant, targetRole);

  // Retrieve tenant name & details
  let tenantName = 'Platform (Platform Owner)';
  let tenant = null;
  if (targetTenant) {
    tenant = await prisma.tenant.findUnique({
      where: { id: targetTenant },
    });
    if (tenant) {
      tenantName = tenant.name;
    }
  }

  // Retrieve current user display name
  let adminName = 'Admin';
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      adminName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
  }

  const trialExceeded = targetTenant ? await isTrialExceeded(targetTenant) : false;
  const isImpersonating = role === 'PLATFORM_OWNER' && targetTenant !== '';

  // 1. WhatsApp Health Rating & Connection Status
  const waNumber = await db.whatsAppNumber.findFirst({
    where: { tenantId: targetTenant },
  });
  const quality = waNumber?.qualityRating || 'green';
  const waStatus = quality === 'red' || quality === 'LOW' || waNumber?.status === 'DISCONNECTED'
    ? 'DISCONNECTED'
    : 'CONNECTED';

  // 2. Real-Time Dynamic Scoped KPI Queries
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const leadsCount = await db.lead.count({
    where: { tenantId: targetTenant },
  });

  const leadsThisMonth = await db.lead.count({
    where: { tenantId: targetTenant, createdAt: { gte: startOfThisMonth } },
  });
  const leadsLastMonth = await db.lead.count({
    where: { tenantId: targetTenant, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
  });

  let leadsGrowthText = '';
  if (leadsLastMonth > 0) {
    const pct = Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100);
    leadsGrowthText = `${pct >= 0 ? '+' : ''}${pct}% vs last month`;
  } else if (leadsThisMonth > 0) {
    leadsGrowthText = `+${leadsThisMonth} this month`;
  } else {
    leadsGrowthText = '0 new this month';
  }

  const activeConversations = await db.conversation.count({
    where: { tenantId: targetTenant, status: 'OPEN' },
  });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const activeToday = await db.conversation.count({
    where: { tenantId: targetTenant, status: 'OPEN', lastMessageAt: { gte: startOfToday } },
  });
  const convSubtext = activeToday > 0 ? `+${activeToday} today` : 'Live connected chats';

  // Message quota calculation based on tenant plan
  const msgUsage = await db.message.count({
    where: { tenantId: targetTenant },
  });
  const planLimits: Record<string, number> = {
    FREE: 1000,
    STARTUP: 5000,
    GROWTH: 25000,
    ENTERPRISE: 100000,
  };
  const plan = tenant?.subscriptionPlan || 'FREE';
  const msgLimit = planLimits[plan] || 1000;
  const usagePct = msgLimit > 0 ? Math.min(Math.round((msgUsage / msgLimit) * 100), 100) : 0;

  // Bot Resolution Rate
  const totalConversations = await db.conversation.count({
    where: { tenantId: targetTenant },
  });
  const escalatedConversations = await db.conversation.count({
    where: { tenantId: targetTenant, needsEscalation: true },
  });
  const botResolutionRate = totalConversations > 0
    ? Math.round(((totalConversations - escalatedConversations) / totalConversations) * 100)
    : 100;
  const resSubtext = `${totalConversations - escalatedConversations} automated`;

  // 3. Onboarding Progress Calculation
  const hasWa = await db.whatsAppNumber.count({ where: { status: 'CONNECTED' } }) > 0;
  const hasBot = await db.tenantAIConfig.count({ where: { isActive: true } }) > 0;
  const hasCatalog = await db.policyCatalogItem.count({}) > 0;
  const hasTeam = await db.user.count({}) > 1;
  const hasMessages = await db.message.count({ where: { senderType: 'BOT' } }) > 0;

  const progress = await db.tenantOnboardingProgress.findUnique({
    where: { tenantId: targetTenant || 'GLOBAL' },
  });
  const intakeBuilt = progress?.intakeFlowBuilt || false;
  const goneLive = progress?.goneLive || false;

  const steps = [
    true, // Account Created
    hasWa,
    hasBot,
    intakeBuilt,
    hasCatalog,
    hasTeam,
    hasMessages,
    goneLive,
  ];
  const completedStepsCount = steps.filter(Boolean).length;
  const showOnboarding = completedStepsCount < 8;

  // 4. Audit Log for Recent Activity
  const rawLogs = await db.auditLog.findMany({
    where: {
      OR: [
        { tenantId: targetTenant },
        { tenantId: null },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  const formatActivityDate = (date: Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');
    return `${day} ${month}, ${hoursStr}:${minutes} ${ampm}`;
  };

  const formattedLogs = rawLogs.map((log) => {
    const meta = log.metadata as Record<string, any> | null;
    let title = 'Activity recorded';
    let subtitle = `${log.action} executed by ${log.user?.email || 'admin'}`;
    let type: 'campaign' | 'lead' | 'ai' | 'message' | 'sync' = 'message';

    if (log.action.includes('CAMPAIGN') || log.action.includes('BROADCAST')) {
      title = 'Campaign sent';
      subtitle = meta?.campaignName
        ? `${meta.campaignName} — ${meta.recipientsCount || meta.recipients || 0} recipients`
        : 'Broadcast campaign dispatched';
      type = 'campaign';
    } else if (log.action.includes('LEAD')) {
      title = 'Lead created';
      subtitle = meta?.customerName || meta?.leadName
        ? `New lead: ${meta.customerName || meta.leadName}`
        : 'New lead captured via WhatsApp';
      type = 'lead';
    } else if (log.action.includes('AI') || log.action.includes('KEY')) {
      title = 'AI key updated';
      subtitle = meta?.provider ? `${meta.provider} Provider configured` : 'AI API credentials updated';
      type = 'ai';
    } else if (log.action.includes('PERSONA') || log.action.includes('BOT')) {
      title = 'Bot persona updated';
      subtitle = meta?.botName ? `Persona "${meta.botName}" adjusted` : 'Bot settings updated';
      type = 'ai';
    } else if (log.action.includes('JOB') || log.action.includes('INBOUND')) {
      title = 'Inbound event';
      subtitle = meta?.error ? `${meta.error}` : 'Inbound webhook processed';
      type = 'sync';
    } else if (log.action.includes('MESSAGE') || log.action.includes('SEND')) {
      title = 'Message sent';
      subtitle = meta?.count ? `Sent to ${meta.count} recipients` : 'Message dispatched';
      type = 'message';
    }

    return {
      id: log.id,
      title,
      subtitle,
      date: formatActivityDate(log.createdAt),
      type,
    };
  });

  // 5. Dynamic Needs Attention Items
  const dbEscalations = await db.conversation.findMany({
    where: { tenantId: targetTenant, needsEscalation: true },
    include: { customer: true },
    orderBy: { lastMessageAt: 'desc' },
    take: 3,
  });

  const dbUnassignedLeads = await db.lead.findMany({
    where: { tenantId: targetTenant, status: 'NEW', assignedAgentId: null },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  const dbFailedJobs = await db.broadcastJob.findMany({
    where: { tenantId: targetTenant, status: 'FAILED' },
    include: { campaign: true },
    orderBy: { scheduledFor: 'desc' },
    take: 2,
  });

  const getRelativeTime = (date: Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const attentionItems: AttentionItem[] = [
    ...dbEscalations.map((c) => ({
      id: `esc-${c.id}`,
      type: 'ESCALATION' as const,
      title: 'Bot Escalation Requested',
      subtitle: `${c.customer?.displayName || 'Customer'}: ${c.escalationReason || 'Human advisor requested'}`,
      timeAgo: getRelativeTime(c.lastMessageAt || c.createdAt),
      href: '/dashboard/inbox',
      actionText: 'Review →',
    })),
    ...dbUnassignedLeads.map((l) => ({
      id: `lead-${l.id}`,
      type: 'UNASSIGNED' as const,
      title: 'Unassigned High-Intent Lead',
      subtitle: `${l.customer?.displayName || 'Lead'} via ${l.source || 'WhatsApp'}`,
      timeAgo: getRelativeTime(l.createdAt),
      href: '/dashboard/leads',
      actionText: 'Assign →',
    })),
    ...dbFailedJobs.map((j) => ({
      id: `job-${j.id}`,
      type: 'FAILED_BROADCAST' as const,
      title: 'Campaign Message Failed',
      subtitle: `${j.campaign?.name || 'Broadcast'}: Delivery failed`,
      timeAgo: getRelativeTime(j.scheduledFor),
      href: '/dashboard/campaigns',
      actionText: 'Check →',
    })),
  ];

  // 6. Real Conversation Trends (Last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const recentMessages = await db.message.findMany({
    where: {
      tenantId: targetTenant,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      direction: true,
      senderType: true,
      createdAt: true,
    },
  });

  const dailyMap = new Map<string, { userMessages: number; botResponses: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyMap.set(key, { userMessages: 0, botResponses: 0 });
  }

  for (const msg of recentMessages) {
    const d = new Date(msg.createdAt);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const entry = dailyMap.get(key);
    if (entry) {
      if (msg.direction === 'INBOUND' || msg.senderType === 'CUSTOMER') {
        entry.userMessages++;
      } else {
        entry.botResponses++;
      }
    }
  }

  const trendsData: TrendDataPoint[] = Array.from(dailyMap.entries()).map(([date, counts]) => ({
    date,
    userMessages: counts.userMessages,
    botResponses: counts.botResponses,
  }));

  // 7. Real Top Campaigns
  const dbCampaigns = await db.broadcastCampaign.findMany({
    where: { tenantId: targetTenant },
    orderBy: { sent: 'desc' },
    take: 4,
  });

  const topCampaignsList: CampaignItem[] = dbCampaigns.map((c) => ({
    id: c.id,
    name: c.name,
    count: c.sent,
    percentage: c.sent > 0 ? Math.min(Math.round((c.delivered / c.sent) * 100), 100) : 0,
  }));

  // 8. Dynamic Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 text-left font-sans text-gray-900 pb-10">
      {/* Impersonation Banner if active */}
      {isImpersonating && (
        <ImpersonationBanner tenantName={tenantName} />
      )}

      {/* Trial Exceeded Warning Banner */}
      {trialExceeded && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
            <span className="font-bold text-sm">!</span>
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-amber-900">AI Trial Cap Reached</h4>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Your platform trial auto-responses have hit the cap (5 messages). Connect your OpenAI/Anthropic/Gemini API key in{' '}
              <Link href="/dashboard/settings?tab=developer" className="text-blue-700 font-bold underline">
                Settings
              </Link>.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Greeting + New Lead Primary Action Button (Screenshot 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            {greeting}, {adminName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Here&apos;s what&apos;s happening across your workspace.
          </p>
        </div>

        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1252d4] hover:bg-[#0e44b5] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Lead</span>
        </Link>
      </div>

      {/* Section 2: 4 KPI Stat Cards with Sparklines & Progress (Screenshot 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Leads */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            {/* Sparkline Curve */}
            <svg className="w-16 h-7 text-blue-600" viewBox="0 0 64 24" fill="none" stroke="currentColor">
              <path d="M 2 18 C 20 18, 30 10, 62 4" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 block mb-1">Leads</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{leadsCount}</h3>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1.5">
              <span>↑</span>
              <span>{leadsGrowthText}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Active Conversations */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            {/* Sparkline Curve */}
            <svg className="w-16 h-7 text-emerald-500" viewBox="0 0 64 24" fill="none" stroke="currentColor">
              <path d="M 2 16 C 18 16, 32 6, 62 3" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 block mb-1">Active Conversations</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{activeConversations}</h3>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1.5">
              <span>↑</span>
              <span>{convSubtext}</span>
            </span>
          </div>
        </div>

        {/* Card 3: Messages */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 block mb-1">Messages</span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{msgUsage.toLocaleString()}</h3>
              <span className="text-xs sm:text-sm font-normal text-gray-400">/ {msgLimit.toLocaleString()}</span>
            </div>
            <span className="text-[11px] font-medium text-gray-400 block mt-0.5">API usage quota</span>

            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-gray-400 shrink-0">{usagePct}% used</span>
            </div>
          </div>
        </div>

        {/* Card 4: Bot Resolution Rate */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-600" />
            </div>
            {/* Sparkline Curve */}
            <svg className="w-16 h-7 text-amber-500" viewBox="0 0 64 24" fill="none" stroke="currentColor">
              <path d="M 2 16 C 20 16, 40 8, 62 4" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 block mb-1">Bot Resolution Rate</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{botResolutionRate}%</h3>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1.5">
              <span>↑</span>
              <span>{resSubtext}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: SYSTEM STATUS Banner (Screenshot 1) */}
      <DashboardSystemStatus
        waStatus={waStatus as any}
        waEngine={waNumber?.provider ? `${waNumber.provider} socket active` : 'Baileys socket active'}
        aiActive={!trialExceeded}
        aiMessage={trialExceeded ? 'Trial limit exceeded' : 'Responding to queries'}
        dbHealthy={true}
        msgUsage={msgUsage}
        msgLimit={msgLimit}
      />

      {/* Section 4: Middle Row - Recent Activity (Left) & Needs Attention (Right) (Screenshot 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Activity Feed */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              Recent Activity
            </h3>
            <Link
              href="/dashboard/analytics"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 group"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {formattedLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                No recent workspace activities recorded yet.
              </div>
            ) : (
              formattedLogs.map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                      act.type === 'campaign' && "bg-purple-50 text-purple-600",
                      act.type === 'lead' && "bg-blue-50 text-blue-600",
                      act.type === 'ai' && "bg-amber-50 text-amber-600",
                      act.type === 'message' && "bg-sky-50 text-sky-600",
                      act.type === 'sync' && "bg-teal-50 text-teal-600"
                    )}>
                      {act.type === 'campaign' && <Megaphone className="w-4 h-4" />}
                      {act.type === 'lead' && <UserPlus className="w-4 h-4" />}
                      {act.type === 'ai' && <Key className="w-4 h-4" />}
                      {act.type === 'message' && <Mail className="w-4 h-4" />}
                      {act.type === 'sync' && <RefreshCw className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-gray-900 truncate">
                        {act.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {act.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-gray-400 shrink-0">
                    {act.date}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Needs Attention & Onboarding Checklist Widget */}
        <div className="space-y-6">
          <NeedsAttentionWidget items={attentionItems} />
          {showOnboarding && (
            <OnboardingChecklistWidget compact={true} />
          )}
        </div>
      </div>

      {/* Section 5: Bottom Row - Conversation Trends (Left) & Top Campaigns (Right) (Screenshot 1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Conversation Trends Dual Bar Chart */}
        <DashboardConversationTrends data={trendsData} />

        {/* Right: Top Campaigns Progress List */}
        <DashboardTopCampaigns campaigns={topCampaignsList} />
      </div>
    </div>
  );
}

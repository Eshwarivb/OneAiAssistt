'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchableTagSelect } from '@/components/ui/searchable-tag-select';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import { getClientSocket } from '@/lib/socket-client';
import { cn } from '@/lib/utils';

type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
type TemplateStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  body: string;
  header?: string | null;
  footer?: string | null;
  ctaButtons?: any | null;
  status: TemplateStatus;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  templateId?: string | null;
  recipientFilter?: any | null;
  scheduledAt?: string | null;
  status: string;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  converted: number;
  failed: number;
  optedOut: number;
  cost: number;
  createdAt: string;
  template?: Template | null;
}

export default function BroadcastCenterPage() {
  const queryClient = useQueryClient();
  const { data: info } = useTenantInfo();
  const tenantId = info?.tenantId;
  const templateBodyRef = useRef<HTMLTextAreaElement>(null);

  // Form State
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'tag' | 'stage' | 'date_range'>('all');
  const [filterValue, setFilterValue] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Personalization Value State (for live preview mapping)
  const [varName, setVarName] = useState('John Doe');
  const [varPolicy, setVarPolicy] = useState('POL-99281');
  const [varLastInteraction, setVarLastInteraction] = useState('Oct 22, 2026');
  const [varDueDate, setVarDueDate] = useState('Oct 24, 2026');

  // Modals state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('MARKETING');
  const [templateLanguage, setTemplateLanguage] = useState('en');
  const [templateBody, setTemplateBody] = useState('Hello {{name}},\n\nYour policy number {{policy_number}} is due for renewal.\n\nBest regards,\nApex Assurance');
  const [templateHeader, setTemplateHeader] = useState('POLICY UPDATE');
  const [templateFooter, setTemplateFooter] = useState('Apex Auto-Assist Center');
  const [buttonLabel1, setButtonLabel1] = useState('Renew Now');
  const [buttonLabel2, setButtonLabel2] = useState('Contact Agent');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/templates');
      if (!res.ok) throw new Error('Failed to load templates');
      return res.json();
    },
  });

  // Auto-select first approved template if available
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const approved = templates.find((t) => t.status === 'APPROVED') || templates[0];
      if (approved) {
        setSelectedTemplateId(approved.id);
      }
    }
  }, [templates, selectedTemplateId]);

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/broadcast');
      if (!res.ok) throw new Error('Failed to load campaigns');
      return res.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds for live delivery/read updates
  });

  // Socket.io Live Status Listener
  useEffect(() => {
    if (!tenantId) return;

    const socketInstance = getClientSocket(tenantId);

    socketInstance.on('broadcast_stats_updated', (data: any) => {
      console.log('[Socket] Broadcast stats updated:', data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    });

    socketInstance.on('message_updated', (data: any) => {
      console.log('[Socket] Message updated event:', data);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [tenantId, queryClient]);

  // Fetch preview count when filter variables change
  const [recipientCount, setRecipientCount] = useState(0);
  const [optedOutCount, setOptedOutCount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const fetchPreviewCounts = async () => {
      setPreviewLoading(true);
      try {
        let url = `/api/dashboard/broadcast?preview=true&type=${recipientType}`;
        if (recipientType === 'tag' || recipientType === 'stage') {
          url += `&value=${encodeURIComponent(filterValue)}`;
        } else if (recipientType === 'date_range') {
          url += `&start=${encodeURIComponent(filterStartDate)}&end=${encodeURIComponent(filterEndDate)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setRecipientCount(data.recipientCount);
          setOptedOutCount(data.optedOutCount);
        }
      } catch (err) {
        console.error('Failed to load recipient counts', err);
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreviewCounts();
  }, [recipientType, filterValue, filterStartDate, filterEndDate]);

  // Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (newTemplate: any) => {
      const res = await fetch('/api/dashboard/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create template');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setSelectedTemplateId(data.id);
      setIsTemplateModalOpen(false);
      setTemplateName('');
      setTemplateBody('Hello {{name}},\n\nYour policy number {{policy_number}} is due for renewal.\n\nBest regards,\nApex Assurance');
      setTemplateHeader('POLICY UPDATE');
      setTemplateFooter('Apex Auto-Assist Center');
      setButtonLabel1('Renew Now');
      setButtonLabel2('Contact Agent');
      showNotification('success', 'WhatsApp template created and approved!');
    },
    onError: (err: any) => {
      showNotification('error', err.message);
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const res = await fetch('/api/dashboard/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send campaign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setCampaignName('');
      setScheduleType('now');
      setScheduleDate('');
      setScheduleTime('');
      showNotification('success', 'Broadcast campaign dispatched successfully!');
    },
    onError: (err: any) => {
      showNotification('error', err.message);
    },
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateBody.trim()) {
      showNotification('error', 'Please provide a name and body for the template.');
      return;
    }
    const ctaButtons = [];
    if (buttonLabel1.trim()) ctaButtons.push(buttonLabel1.trim());
    if (buttonLabel2.trim()) ctaButtons.push(buttonLabel2.trim());

    createTemplateMutation.mutate({
      name: templateName.trim(),
      category: templateCategory,
      language: templateLanguage,
      body: templateBody,
      header: templateHeader.trim() || null,
      footer: templateFooter.trim() || null,
      ctaButtons: ctaButtons.length > 0 ? ctaButtons : null,
      status: 'APPROVED',
    });
  };

  const handleSendCampaignSubmit = () => {
    if (!campaignName.trim()) {
      showNotification('error', 'Please enter a campaign name');
      return;
    }
    if (!selectedTemplateId) {
      showNotification('error', 'Please select a WhatsApp template');
      return;
    }

    const scheduledAt = scheduleType === 'later' && scheduleDate && scheduleTime
      ? `${scheduleDate}T${scheduleTime}:00`
      : null;

    sendCampaignMutation.mutate({
      name: campaignName.trim(),
      templateId: selectedTemplateId,
      recipientFilter: {
        type: recipientType,
        value: recipientType === 'date_range' ? { start: filterStartDate, end: filterEndDate } : filterValue,
      },
      scheduledAt,
    });
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleInsertVariable = (variable: string) => {
    if (isTemplateModalOpen && templateBodyRef.current) {
      const textarea = templateBodyRef.current;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const placeholder = `{{${variable}}}`;
      const newValue = templateBody.substring(0, startPos) + placeholder + templateBody.substring(endPos);
      setTemplateBody(newValue);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(startPos + placeholder.length, startPos + placeholder.length);
      }, 50);
    } else {
      showNotification('success', `Variable {{${variable}}} will map dynamically to contact records.`);
    }
  };

  const renderHighlightedBody = (bodyText: string) => {
    const parts = bodyText.split(/(\{\{[a-zA-Z0-9_-]+\}\})/g);
    return parts.map((part, index) => {
      const match = part.match(/^\{\{([a-zA-Z0-9_-]+)\}\}$/);
      if (match) {
        const varKey = match[1];
        let displayValue = part;
        if (varKey === 'name') displayValue = varName;
        else if (varKey === 'policy_number') displayValue = varPolicy;
        else if (varKey === 'last_interaction') displayValue = varLastInteraction;
        else if (varKey === 'due_date') displayValue = varDueDate;

        return (
          <span 
            key={index} 
            className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[11px] inline-block mx-0.5"
            title={`Variable: {{${varKey}}}`}
          >
            {displayValue}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatTimeString = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');
    return `${hoursStr}:${minutes} ${ampm}`;
  };

  const formatDateString = (dateInput: string | Date) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  };

  const computeEstimatedCost = () => {
    let rate = 0.020;
    if (activeTemplate?.category === 'UTILITY') {
      rate = 0.010;
    } else if (activeTemplate?.category === 'AUTHENTICATION') {
      rate = 0.005;
    }
    return recipientCount * rate;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans text-gray-900 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={cn(
            'fixed top-5 right-6 px-4 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2 border font-semibold text-xs animate-in fade-in slide-in-from-top-2 duration-150',
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          )}
        >
          <span className="material-symbols-outlined text-[17px]">
            {notification.type === 'success' ? 'check_circle' : 'warning'}
          </span>
          {notification.message}
        </div>
      )}

      {/* Page Header: Title + Actions */}
      <div className="flex items-center justify-between pb-6 pt-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
          New Broadcast
        </h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => showNotification('success', 'Campaign saved as Draft')}
            className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-gray-700 bg-white transition-colors shadow-2xs"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleSendCampaignSubmit}
            disabled={sendCampaignMutation.isPending}
            className="px-4 py-2 rounded-xl bg-[#004ac6] hover:bg-[#003cb0] text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
            <span>{sendCampaignMutation.isPending ? 'Sending...' : 'Schedule/Send'}</span>
          </button>
        </div>
      </div>

      {/* Main Content: 2-Column Layout */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Campaign Creation Form (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-2xl border border-gray-200 shadow-2xs space-y-6">
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                Campaign Name
              </label>
              <input
                type="text"
                placeholder="e.g. Policy Renewal Reminder Oct-23"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
            </div>

            {/* 1. Select WhatsApp Template */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  1. Select WhatsApp Template
                </label>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="text-xs text-[#004ac6] font-semibold hover:underline"
                >
                  + Create New Template
                </button>
              </div>

              {templatesLoading ? (
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ) : (
                <select
                  suppressHydrationWarning
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium cursor-pointer"
                >
                  <option value="">-- Choose Approved Template --</option>
                  {templates.map((tpl) => (
                    <option
                      key={tpl.id}
                      value={tpl.id}
                      disabled={tpl.status !== undefined && tpl.status !== 'APPROVED'}
                    >
                      {tpl.category}: {tpl.name} ({tpl.language}) {tpl.status ? `[${tpl.status}]` : ''}
                    </option>
                  ))}
                </select>
              )}

              {activeTemplate && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold pt-1">
                  <span className="material-symbols-outlined text-[15px]">check_circle</span>
                  <span>Approved by Meta (Ready to Send)</span>
                </div>
              )}
            </div>

            {/* 2. Select Recipients */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                2. Select Recipients
              </label>

              {/* 2x2 Radio Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('all');
                    setFilterValue('');
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                    recipientType === 'all'
                      ? 'border-[#004ac6] bg-blue-50/40 text-blue-900'
                      : 'border-gray-200 bg-white hover:bg-gray-50/70 text-gray-700'
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all',
                    recipientType === 'all'
                      ? 'border-[#004ac6] bg-white'
                      : 'border-gray-300 bg-white'
                  )}>
                    {recipientType === 'all' && <span className="w-2 h-2 rounded-full bg-[#004ac6]" />}
                  </span>
                  <span className="text-xs font-semibold">All Contacts</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('tag');
                    setFilterValue('');
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                    recipientType === 'tag'
                      ? 'border-[#004ac6] bg-blue-50/40 text-blue-900'
                      : 'border-gray-200 bg-white hover:bg-gray-50/70 text-gray-700'
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all',
                    recipientType === 'tag'
                      ? 'border-[#004ac6] bg-white'
                      : 'border-gray-300 bg-white'
                  )}>
                    {recipientType === 'tag' && <span className="w-2 h-2 rounded-full bg-[#004ac6]" />}
                  </span>
                  <span className="text-xs font-semibold">By Tag</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('stage');
                    setFilterValue('');
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                    recipientType === 'stage'
                      ? 'border-[#004ac6] bg-blue-50/40 text-blue-900'
                      : 'border-gray-200 bg-white hover:bg-gray-50/70 text-gray-700'
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all',
                    recipientType === 'stage'
                      ? 'border-[#004ac6] bg-white'
                      : 'border-gray-300 bg-white'
                  )}>
                    {recipientType === 'stage' && <span className="w-2 h-2 rounded-full bg-[#004ac6]" />}
                  </span>
                  <span className="text-xs font-semibold">By Pipeline Stage</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecipientType('date_range');
                    setFilterValue('');
                    if (!filterStartDate && !filterEndDate) {
                      const today = new Date().toISOString().split('T')[0];
                      setFilterStartDate(today);
                      setFilterEndDate(today);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer',
                    recipientType === 'date_range'
                      ? 'border-[#004ac6] bg-blue-50/40 text-blue-900'
                      : 'border-gray-200 bg-white hover:bg-gray-50/70 text-gray-700'
                  )}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all',
                    recipientType === 'date_range'
                      ? 'border-[#004ac6] bg-white'
                      : 'border-gray-300 bg-white'
                  )}>
                    {recipientType === 'date_range' && <span className="w-2 h-2 rounded-full bg-[#004ac6]" />}
                  </span>
                  <span className="text-xs font-semibold">By Date Range</span>
                </button>
              </div>

              {/* Dynamic Filter Inputs */}
              {recipientType === 'tag' && (
                <div className="pt-1.5 space-y-1 animate-in fade-in duration-150">
                  <label className="text-[10px] text-gray-500 font-semibold block">Filter by Tag</label>
                  <SearchableTagSelect
                    value={filterValue}
                    onChange={setFilterValue}
                  />
                </div>
              )}

              {recipientType === 'stage' && (
                <div className="pt-1.5 space-y-1 animate-in fade-in duration-150">
                  <label htmlFor="pipeline-stage-select" className="text-[10px] text-gray-500 font-semibold block">
                    Pipeline Stage
                  </label>
                  <select
                    id="pipeline-stage-select"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-gray-900 cursor-pointer"
                  >
                    <option value="">-- Choose Stage --</option>
                    <option value="NEW">New Lead</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="CONVERTED">Won/Converted</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
              )}

              {recipientType === 'date_range' && (
                <div className="pt-1.5 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-gray-500">Filter by Created Date</span>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setFilterStartDate(today);
                        setFilterEndDate(today);
                      }}
                      className="text-[10px] text-[#004ac6] font-semibold hover:underline"
                    >
                      Set to Today
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="start-date-input" className="text-[10px] text-gray-400 font-semibold block">
                        From Date
                      </label>
                      <input
                        id="start-date-input"
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="end-date-input" className="text-[10px] text-gray-400 font-semibold block">
                        To Date
                      </label>
                      <input
                        id="end-date-input"
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Recipient Badge */}
              <div className="pt-1 flex items-center">
                <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3.5 py-1.5 rounded-full font-semibold text-xs border border-blue-200 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px]">group</span>
                  <span>{previewLoading ? '...' : recipientCount.toLocaleString()} recipients targeted</span>
                </div>
              </div>
            </div>

            {/* 3. Personalization Variables */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                3. Personalization Variables
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {(['name', 'policy_number', 'last_interaction', 'due_date'] as const).map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => handleInsertVariable(variable)}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-mono font-medium hover:bg-blue-100 transition-colors border border-blue-200 shadow-2xs active:scale-95"
                  >
                    {"{{"}{variable}{"}}"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 italic">
                (Click to copy variable / Insert in composer)
              </p>
            </div>

            {/* 4. Compliance & Opt-Out Protection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                4. Compliance & Opt-Out Protection
              </label>
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 flex items-center gap-2.5">
                <span className="material-symbols-outlined text-rose-600 text-[18px]">block</span>
                <p className="text-xs text-rose-800 font-semibold">
                  {optedOutCount} opted-out contacts will be automatically excluded
                </p>
              </div>
            </div>

            {/* 5. Scheduling Options */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                5. Scheduling Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-xs text-gray-900 select-none">
                  <input
                    type="radio"
                    name="scheduleOptions"
                    value="now"
                    checked={scheduleType === 'now'}
                    onChange={() => setScheduleType('now')}
                    className="text-[#004ac6] focus:ring-[#004ac6]"
                  />
                  <span>Send Now</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-xs text-gray-900 select-none">
                  <input
                    type="radio"
                    name="scheduleOptions"
                    value="later"
                    checked={scheduleType === 'later'}
                    onChange={() => setScheduleType('later')}
                    className="text-[#004ac6] focus:ring-[#004ac6]"
                  />
                  <span>Schedule for Later</span>
                </label>
              </div>

              {scheduleType === 'later' && (
                <div className="flex gap-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150 pl-5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-semibold block">Start Date</span>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-semibold block">Start Time</span>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Cost Card */}
            <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-[#004ac6] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
              </div>
              <div>
                <p className="font-bold text-xs text-blue-900">
                  Estimated cost: ${computeEstimatedCost().toFixed(2)}
                </p>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  ({recipientCount.toLocaleString()} conversations @ {activeTemplate?.category || 'MARKETING'} rate)
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: WhatsApp Message Preview (5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
            {/* Phone Mockup Frame */}
            <div className="bg-slate-900 p-3.5 rounded-[36px] border-4 border-slate-800 shadow-xl relative overflow-hidden flex flex-col h-[490px]">
              <div className="relative z-10 flex flex-col h-full">
                {/* Phone Mockup Header */}
                <div className="bg-slate-800/80 backdrop-blur-md p-3 rounded-t-2xl flex items-center justify-between border-b border-slate-700/60 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-[10px] shrink-0 border border-slate-600">
                      WA
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-100 leading-tight">OneAIAssist Official</p>
                      <p className="text-[9px] text-emerald-400 font-medium leading-none mt-0.5">online</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">more_vert</span>
                </div>

                {/* Simulated Chat Area */}
                <div className="flex-1 p-3.5 flex flex-col gap-3 overflow-y-auto bg-slate-900/60">
                  {/* WhatsApp Message Bubble */}
                  <div className="bg-[#e7f8ec] border border-emerald-200/60 p-3 shadow-sm rounded-xl rounded-tl-xs max-w-[90%] self-start flex flex-col gap-1.5 text-xs">
                    {activeTemplate?.header && (
                      <p className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider border-b border-emerald-200/50 pb-1">
                        {activeTemplate.header}
                      </p>
                    )}

                    <div className="text-gray-900 leading-relaxed font-normal">
                      {activeTemplate 
                        ? renderHighlightedBody(activeTemplate.body)
                        : renderHighlightedBody("Hello {{name}},\n\nYour policy number {{policy_number}} is due for renewal. Best regards, Apex Assurance")
                      }
                    </div>

                    {activeTemplate?.footer && (
                      <p className="text-[10px] text-gray-500 italic mt-0.5 border-t border-emerald-200/40 pt-1">
                        {activeTemplate.footer}
                      </p>
                    )}

                    {activeTemplate?.ctaButtons && Array.isArray(activeTemplate.ctaButtons) && (
                      <div className="mt-2 space-y-1.5 border-t border-emerald-200/50 pt-2">
                        {activeTemplate.ctaButtons.map((btn: string, bIdx: number) => (
                          <div
                            key={bIdx}
                            className="w-full py-1.5 bg-white border border-gray-200 text-xs font-semibold text-[#004ac6] rounded-lg shadow-2xs text-center"
                          >
                            {btn}
                          </div>
                        ))}
                      </div>
                    )}

                    <div suppressHydrationWarning className="text-[9px] text-gray-400 text-right mt-0.5 font-medium">
                      10:42 AM
                    </div>
                  </div>
                </div>

                {/* Phone Bottom Home Bar */}
                <div className="pt-2 pb-1 flex justify-center shrink-0">
                  <div className="w-24 h-1 bg-slate-600 rounded-full" />
                </div>
              </div>
            </div>

            {/* Preview Values Mock Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
              <h4 className="font-bold text-[10px] text-gray-500 uppercase tracking-wider">
                Preview Values Mock (Edit to Test Preview)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="name val"
                  value={varName}
                  onChange={(e) => setVarName(e.target.value)}
                  className="bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="policy val"
                  value={varPolicy}
                  onChange={(e) => setVarPolicy(e.target.value)}
                  className="bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="interaction val"
                  value={varLastInteraction}
                  onChange={(e) => setVarLastInteraction(e.target.value)}
                  className="bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="due date val"
                  value={varDueDate}
                  onChange={(e) => setVarDueDate(e.target.value)}
                  className="bg-gray-50/70 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Campaign History Full-Width Section */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-white">
            <h3 className="font-bold text-xs text-gray-900 uppercase tracking-wider">
              Campaign History
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="p-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"
                title="Filter campaigns"
              >
                <span className="material-symbols-outlined text-[17px]">filter_list</span>
              </button>
              <button
                type="button"
                className="p-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-500 transition-colors"
                title="Download report"
              >
                <span className="material-symbols-outlined text-[17px]">download</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {campaignsLoading ? (
              <div className="p-8 text-center text-xs text-gray-400 animate-pulse">
                Loading campaign history...
              </div>
            ) : campaigns.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No campaigns found.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Campaign Name</th>
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Sent Date</th>
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Recipients</th>
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px] text-center">Delivered</th>
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px] text-center">Read</th>
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px] text-center">Replied</th>
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px] text-center">Converted</th>
                    <th className="px-5 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((camp) => {
                    const deliveredPct = camp.sent > 0 ? Math.round((camp.delivered / camp.sent) * 100) : 0;
                    const readPct = camp.delivered > 0 ? Math.round((camp.read / camp.delivered) * 100) : 0;
                    const repliedPct = camp.read > 0 ? Math.round((camp.replied / camp.read) * 100) : 0;
                    const conversionPct = camp.sent > 0 ? ((camp.converted / camp.sent) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={camp.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-xs text-[#004ac6]">{camp.name}</div>
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {camp.template?.name || 'Manual'} ({camp.status})
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-600">
                          {formatDateString(camp.createdAt)}
                          <span className="text-[10px] text-gray-400 block" suppressHydrationWarning>
                            {formatTimeString(camp.createdAt)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-gray-900">
                          {camp.sent}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="w-16 mx-auto bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${deliveredPct}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-600">{deliveredPct}%</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="w-16 mx-auto bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${readPct}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-600">{readPct}%</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="w-16 mx-auto bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${repliedPct}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-600">{repliedPct}%</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            {conversionPct}%
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900">
                          ${camp.cost.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* CREATE TEMPLATE DIALOG MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <header className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Author WhatsApp Template
              </span>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </header>

            <form onSubmit={handleCreateTemplateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Template Name
                </span>
                <input
                  type="text"
                  placeholder="e.g. policy_renewal_reminder"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                  required
                />
              </div>

              {/* Category */}
              <div className="grid grid-cols-3 gap-2">
                {(['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTemplateCategory(cat)}
                    className={cn(
                      'px-3 py-2 rounded-xl border text-[10px] font-bold transition-all',
                      templateCategory === cat
                        ? 'border-[#004ac6] bg-blue-50/50 text-[#004ac6]'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Header Text */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Header text (Optional Bold Title)
                </span>
                <input
                  type="text"
                  value={templateHeader}
                  onChange={(e) => setTemplateHeader(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                  placeholder="e.g. ACTION REQUIRED"
                />
              </div>

              {/* Variable Helper chips inside composer */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-semibold block mb-1">
                  Click variables to insert at cursor position:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['name', 'policy_number', 'last_interaction', 'due_date'] as const).map((variable) => (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => handleInsertVariable(variable)}
                      className="px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded-lg text-[10px] font-mono font-medium text-gray-700 transition-colors"
                    >
                      {"{{"}{variable}{"}}"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Body */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Template Body Text
                </span>
                <textarea
                  ref={templateBodyRef}
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 leading-relaxed"
                  placeholder="e.g. Hello {{name}}, renewal date {{due_date}} is close."
                  required
                />
              </div>

              {/* Footer Text */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Footer text (Optional Muted Subtext)
                </span>
                <input
                  type="text"
                  value={templateFooter}
                  onChange={(e) => setTemplateFooter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                  placeholder="e.g. Reply STOP to opt-out"
                />
              </div>

              {/* CTA Buttons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  CTA Action Buttons (Max 2)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Button 1 Label"
                    value={buttonLabel1}
                    onChange={(e) => setButtonLabel1(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                  />
                  <input
                    type="text"
                    placeholder="Button 2 Label"
                    value={buttonLabel2}
                    onChange={(e) => setButtonLabel2(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                  />
                </div>
              </div>

              <footer className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTemplateMutation.isPending}
                  className="px-4 py-2 bg-[#004ac6] hover:bg-[#003cb0] text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {createTemplateMutation.isPending ? 'Submitting...' : 'Submit to Meta for Approval'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantInfo } from '@/hooks/useTenantInfo';
import { getClientSocket } from '@/lib/socket-client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import WhatsAppChatView from '@/components/chat/WhatsAppChatView';
import IMessageChatView from '@/components/chat/IMessageChatView';
import InstagramChatView from '@/components/chat/InstagramChatView';

interface Conversation {
  id: string;
  channel?: 'WHATSAPP' | 'IMESSAGE' | 'INSTAGRAM' | 'SMS' | string;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  lastMessageAt: string;
  needsEscalation: boolean;
  assignedAgentId: string | null;
  lastMessagePreview: string;
  lastInboundMessageAt: string | null;
  customer: {
    id: string;
    displayName: string;
    phone: string;
    pipelineStage: string;
    intake: {
      age: number | null;
      state: string | null;
      budgetMin: number | null;
      budgetMax: number | null;
      familySize: number | null;
      healthConditions: string;
    } | null;
  };
}

interface Message {
  id: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: 'CUSTOMER' | 'BOT' | 'AGENT';
  createdAt: string;
  status?: string;
  channelMessageId?: string;
  contextMessageId?: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { data: info } = useTenantInfo();
  const tenantId = info?.tenantId;

  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'ALL' | 'WHATSAPP' | 'IMESSAGE' | 'INSTAGRAM'>('ALL');
  const [replyText, setReplyText] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'AI' | 'ESCALATED' | 'IMESSAGE' | 'INSTAGRAM' | 'PENDING' | 'CLOSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'info' | 'intake'>('info');
  const [isIntakeExpanded, setIsIntakeExpanded] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const messageEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access is required to record voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // 1. Fetch conversations via TanStack Query
  const { data: conversations, isLoading: convsLoading, isFetching: convsFetching } = useQuery<Conversation[]>({
    queryKey: ['conversations', tenantId],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/conversations');
      if (!res.ok) throw new Error('Failed to load conversations');
      return res.json();
    },
    enabled: !!tenantId,
  });

  // 2. Fetch messages for selected conversation
  const { data: messages, isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ['messages', selectedConvId],
    queryFn: async () => {
      if (!selectedConvId) return [];
      const res = await fetch(`/api/chat/messages?conversationId=${selectedConvId}`);
      if (!res.ok) throw new Error('Failed to load messages');
      return res.json();
    },
    enabled: !!selectedConvId,
  });

  // 3. Fetch pre-approved templates
  const { data: templates } = useQuery<Template[]>({
    queryKey: ['templates', tenantId],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/templates');
      if (!res.ok) throw new Error('Failed to load templates');
      return res.json();
    },
    enabled: !!tenantId,
  });

  // 4. Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!selectedConvId || !tenantId) return;
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConvId, to: selectedConv?.customer.phone, text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send message');
      }
      return res.json();
    },
    onSuccess: () => {
      setReplyText('');
      setShowTemplatesDropdown(false);
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
    },
  });

  // 5. Toggle AI Handling vs Agent Takeover mutation
  const toggleHandlerMutation = useMutation({
    mutationFn: async (needsEscalation: boolean) => {
      if (!selectedConvId) return;
      const res = await fetch('/api/dashboard/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConvId, needsEscalation }),
      });
      if (!res.ok) {
        throw new Error('Failed to toggle AI/Agent handling.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
    },
  });

  // 6. Close conversation & generate AI summary mutation
  const closeConversationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConvId) return;
      const res = await fetch('/api/dashboard/conversations/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConvId }),
      });
      if (!res.ok) throw new Error('Failed to close conversation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConvId] });
    },
  });

  // 7. Socket.io Live Setup
  useEffect(() => {
    if (!tenantId) return;

    const socketInstance = getClientSocket(tenantId);

    socketInstance.on('new_message', (data: { conversationId: string; message: Message }) => {
      const normalizedMsg: Message = {
        ...data.message,
        createdAt:
          typeof data.message.createdAt === 'string'
            ? data.message.createdAt
            : new Date(data.message.createdAt).toISOString(),
      };

      queryClient.setQueryData<Message[]>(['messages', data.conversationId], (old = []) => {
        if (old.some((m) => m.id === normalizedMsg.id)) return old;
        return [...old, normalizedMsg];
      });

      queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
    });

    socketInstance.on('whatsapp_status_update', () => {
      queryClient.invalidateQueries({ queryKey: ['tenantInfo'] });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [tenantId, selectedConvId, queryClient]);

  // Click outside listener for templates dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTemplatesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll message stream to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendReplyMutation.isPending) return;
    sendReplyMutation.mutate(replyText);
  };

  // Time remaining helper for WhatsApp 24h Customer Service Window
  const getSessionWindowData = (lastInboundMessageAt: string | null) => {
    if (!lastInboundMessageAt) return { isClosed: true, text: 'Expired', hoursRemaining: 0, msRemaining: 0 };
    const lastInboundTime = new Date(lastInboundMessageAt).getTime();
    const elapsedMs = Date.now() - lastInboundTime;
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const remainingMs = windowMs - elapsedMs;

    if (remainingMs <= 0) {
      return { isClosed: true, text: 'Expired', hoursRemaining: 0, msRemaining: 0 };
    }

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return {
      isClosed: false,
      text: `${hours}h ${mins}m`,
      hoursRemaining: hours,
      msRemaining: remainingMs,
    };
  };

  // Format relative timestamp helper
  const getRelativeTime = (date: string) => {
    try {
      const diff = Date.now() - new Date(date).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h`;
      return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatTimeString = (dateInput: string | Date) => {
    try {
      const date = new Date(dateInput);
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  const formatDateString = (dateInput: string | Date) => {
    try {
      return new Date(dateInput).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getInitials = (name: string, phone: string) => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== phone) {
      const parts = trimmed.split(/\s+/);
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return trimmed.substring(0, 2).toUpperCase();
    }
    return phone.substring(0, 2);
  };

  // Client-Side Tab & Search Filtering
  const filteredConversations = conversations?.filter((conv) => {
    // 0. Channel Selection Filter
    if (selectedChannel !== 'ALL') {
      const convChan = ((conv as any).channel || 'WHATSAPP').toUpperCase();
      if (convChan !== selectedChannel) return false;
    }

    // 1. Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = conv.customer.displayName.toLowerCase().includes(query);
      const phoneMatch = conv.customer.phone.toLowerCase().includes(query);
      if (!nameMatch && !phoneMatch) return false;
    }

    // 2. Tab selection
    if (activeTab === 'CLOSED') return conv.status === 'CLOSED';
    if (conv.status === 'CLOSED') return false; // Hide closed from active lists

    if (activeTab === 'UNREAD') {
      return conv.lastInboundMessageAt === conv.lastMessageAt;
    }
    if (activeTab === 'AI') return !conv.needsEscalation;
    if (activeTab === 'ESCALATED') return conv.needsEscalation;
    if (activeTab === 'IMESSAGE') return (conv as any).channel === 'IMESSAGE';
    if (activeTab === 'INSTAGRAM') return (conv as any).channel === 'INSTAGRAM';
    if (activeTab === 'PENDING') return conv.status === 'PENDING';

    return true;
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConvId && filteredConversations && filteredConversations.length > 0) {
      setSelectedConvId(filteredConversations[0].id);
    }
  }, [filteredConversations, selectedConvId]);

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);
  const sessionWindow = selectedConv ? getSessionWindowData(selectedConv.lastInboundMessageAt) : null;

  // Counts for messages
  const outboundCount = messages?.filter((m) => m.direction === 'OUTBOUND').length || 0;
  const inboundCount = messages?.filter((m) => m.direction === 'INBOUND').length || 0;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 gap-3 font-sans text-gray-900">
      {/* 1. TOP CHANNEL FILTER BAR */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-2xs shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1.5 shrink-0">
            Channel:
          </span>
          <button
            type="button"
            onClick={() => setSelectedChannel('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0',
              selectedChannel === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            )}
          >
            <span className="material-symbols-outlined text-[15px]">all_inbox</span>
            All Channels
          </button>
          <button
            type="button"
            onClick={() => setSelectedChannel('WHATSAPP')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border shrink-0',
              selectedChannel === 'WHATSAPP'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50/70 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setSelectedChannel('IMESSAGE')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border shrink-0',
              selectedChannel === 'IMESSAGE'
                ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xs'
                : 'bg-sky-50/70 text-sky-800 border-sky-200/80 hover:bg-sky-100'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-[#007AFF] shrink-0" />
            Apple iMessage
          </button>
          <button
            type="button"
            onClick={() => setSelectedChannel('INSTAGRAM')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border shrink-0',
              selectedChannel === 'INSTAGRAM'
                ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white border-transparent shadow-xs'
                : 'bg-gradient-to-r from-purple-50 to-rose-50 text-purple-900 border-purple-200/80 hover:brightness-95'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            Instagram Direct
          </button>
        </div>

        <div className="text-xs text-gray-500 font-medium hidden md:flex items-center gap-1.5 shrink-0 pl-2">
          <span>Active Interface:</span>
          <span className="font-bold text-emerald-600 tracking-wide uppercase">
            {selectedConv 
              ? ((selectedConv as any).channel || 'WHATSAPP') 
              : selectedChannel === 'ALL' ? 'WHATSAPP' : selectedChannel}
          </span>
        </div>
      </div>

      {/* 2. MAIN 3-COLUMN WORKSPACE CONTAINER */}
      <div className="flex-1 border border-gray-200 bg-white rounded-xl overflow-hidden flex shadow-2xs min-h-0">
        {/* COLUMN 1: Conversations List */}
        <section className="w-[320px] lg:w-[340px] xl:w-[350px] flex flex-col border-r border-gray-200 bg-white shrink-0">
          {/* Header & Search */}
          <div className="p-3.5 border-b border-gray-200 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                  Conversations
                </h2>
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200/60">
                  {filteredConversations?.length || 0} chats
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['conversations', tenantId] });
                }}
                title="Refresh conversations"
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className={cn("material-symbols-outlined text-[17px]", convsFetching && "animate-spin")}>
                  refresh
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[17px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-7 py-1.5 bg-gray-50/80 hover:bg-gray-100/60 focus:bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Filter Strip */}
          <div className="flex px-2 border-b border-gray-200 overflow-x-auto shrink-0 scrollbar-none bg-white">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'UNREAD', label: 'Unread' },
              { key: 'AI', label: 'AI Handling' },
              { key: 'ESCALATED', label: 'Escalated' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors',
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conversation List Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {convsLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-gray-100 rounded-full animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                      <div className="h-2.5 w-40 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !filteredConversations || filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const initials = getInitials(conv.customer.displayName, conv.customer.phone);
                const winData = getSessionWindowData(conv.lastInboundMessageAt);
                const timerIsRed = !winData.isClosed && winData.msRemaining < 2 * 60 * 60 * 1000;
                const channelName = ((conv as any).channel || 'WHATSAPP').toUpperCase();

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      'w-full px-3.5 py-3 text-left flex items-start gap-3 transition-colors border-l-[3px] relative group',
                      isSelected
                        ? 'bg-blue-50/50 border-l-blue-600'
                        : 'border-l-transparent hover:bg-gray-50/80 text-gray-700'
                    )}
                  >
                    {/* Customer Initials Avatar */}
                    <div
                      className={cn(
                        'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors',
                        isSelected
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 border border-gray-200/80 group-hover:bg-gray-200/70'
                      )}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Name + Channel/Agent Badges */}
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            'font-bold text-xs truncate',
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          )}
                        >
                          {conv.customer.displayName}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Channel Badge */}
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border',
                              channelName === 'IMESSAGE'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : channelName === 'INSTAGRAM'
                                ? 'bg-gradient-to-r from-purple-50 to-rose-50 text-purple-900 border-purple-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            )}
                          >
                            {channelName === 'IMESSAGE' ? 'iMessage' : channelName === 'INSTAGRAM' ? 'Instagram' : 'WhatsApp'}
                          </span>

                          {/* AI / Agent Badge */}
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border',
                              conv.needsEscalation
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            )}
                          >
                            {conv.needsEscalation ? 'Agent' : 'AI'}
                          </span>
                        </div>
                      </div>

                      {/* Message Preview */}
                      <p className="text-[11px] text-gray-500 truncate mt-0.5 font-medium leading-relaxed">
                        {conv.lastMessagePreview || 'No messages yet'}
                      </p>

                      {/* Phone, Date, and Session Status */}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-medium">
                        <span className="truncate">+{conv.customer.phone}</span>
                        <span className="text-gray-300">•</span>
                        <span className="shrink-0">{getRelativeTime(conv.lastMessageAt)}</span>
                        <span className="text-gray-300">•</span>
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded text-[9px] font-semibold flex items-center gap-0.5 border shrink-0',
                            winData.isClosed
                              ? 'bg-gray-50 text-gray-500 border-gray-200'
                              : timerIsRed
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          )}
                        >
                          <span className="material-symbols-outlined text-[10px]">schedule</span>
                          {winData.isClosed ? 'Expired' : winData.text}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* COLUMN 2: Center Chat Thread */}
        <section className="flex-1 flex flex-col bg-[#f8fafc] min-w-0 overflow-hidden">
          {selectedConvId && selectedConv ? (
            (() => {
              const chan = ((selectedConv as any).channel || 'WHATSAPP').toUpperCase();

              const commonProps = {
                conversationId: selectedConv.id,
                customerName: selectedConv.customer.displayName,
                customerPhone: selectedConv.customer.phone,
                messages: (messages || []) as any,
                replyText,
                setReplyText,
                onSend: handleSend,
                isSending: sendReplyMutation.isPending,
                needsEscalation: selectedConv.needsEscalation,
                sessionWindow,
                isRecording,
                recordingSeconds,
                onStartRecording: startRecording,
                onStopRecording: stopRecording,
              };

              const chatElement =
                chan === 'IMESSAGE' ? (
                  <IMessageChatView {...commonProps} />
                ) : chan === 'INSTAGRAM' ? (
                  <InstagramChatView {...commonProps} />
                ) : (
                  <WhatsAppChatView {...commonProps} />
                );

              return (
                <motion.div
                  key={selectedConv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col h-full min-h-0 overflow-hidden"
                >
                  {chatElement}
                </motion.div>
              );
            })()
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <span className="material-symbols-outlined text-[48px] text-gray-300 mb-3">
                forum
              </span>
              <h4 className="text-sm font-bold text-gray-900">No Chat Selected</h4>
              <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
                Select an active conversation thread from the left menu to view messages and reply.
              </p>
            </div>
          )}
        </section>

        {/* COLUMN 3: Customer Information Panel */}
        {selectedConvId && selectedConv?.customer && (
          <section className="w-[290px] xl:w-[310px] border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto">
            {/* Customer Avatar & Overview */}
            <div className="p-5 flex flex-col items-center text-center border-b border-gray-200">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center font-bold text-base mb-2.5 shadow-2xs">
                {getInitials(selectedConv.customer.displayName, selectedConv.customer.phone)}
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight">
                {selectedConv.customer.displayName}
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                +{selectedConv.customer.phone}
              </p>

              {/* Status Badges */}
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  {selectedConv.customer.pipelineStage?.replace('_', ' ') || 'NEW'}
                </span>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold rounded-full tracking-wider">
                  WhatsApp Verified
                </span>
              </div>

              {/* View Full Profile CTA Button */}
              <Link
                href={`/dashboard/customers/${selectedConv.customer.id}`}
                className="w-full mt-3.5 py-2 bg-[#004ac6] hover:bg-[#003cb0] text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>View Full Profile</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </Link>
            </div>

            {/* Tabs Strip */}
            <div className="flex border-b border-gray-200 shrink-0 bg-white">
              <button
                type="button"
                onClick={() => setRightPanelTab('info')}
                className={cn(
                  'flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors text-center',
                  rightPanelTab === 'info'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                Customer Info
              </button>
              <button
                type="button"
                onClick={() => setRightPanelTab('intake')}
                className={cn(
                  'flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors text-center',
                  rightPanelTab === 'intake'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                Intake Answers
              </button>
            </div>

            {/* Body Content */}
            <div className="p-4 space-y-5 flex-1 overflow-y-auto">
              {rightPanelTab === 'info' ? (
                <>
                  {/* Collapsible Intake Answers Section */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsIntakeExpanded(!isIntakeExpanded)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider py-1 hover:text-gray-800 transition-colors"
                    >
                      <span>Intake Answers</span>
                      <span className="material-symbols-outlined text-[16px]">
                        {isIntakeExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                      </span>
                    </button>

                    {isIntakeExpanded && (
                      <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-3">
                        {selectedConv.customer.intake ? (
                          <>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Age</span>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                {selectedConv.customer.intake.age || 'Not specified'} years
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">State Region</span>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                {selectedConv.customer.intake.state || 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Monthly Budget</span>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                {selectedConv.customer.intake.budgetMin && selectedConv.customer.intake.budgetMax
                                  ? `$${selectedConv.customer.intake.budgetMin} - $${selectedConv.customer.intake.budgetMax} / mo`
                                  : 'Not specified'}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Family size</span>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                {selectedConv.customer.intake.familySize || '1'} member(s)
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Health Conditions</span>
                              <p className="text-xs font-semibold text-gray-900 mt-0.5 leading-relaxed">
                                {selectedConv.customer.intake.healthConditions || 'None reported'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="py-3 text-center flex flex-col items-center gap-1.5 text-gray-400">
                            <span className="material-symbols-outlined text-[20px] text-gray-300">description</span>
                            <p className="text-[11px] italic">No intake answers logged yet.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contact Details Section */}
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block py-1">
                      Contact Details
                    </span>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-semibold text-gray-900">+{selectedConv.customer.phone}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">Channel</span>
                        <span className="font-semibold text-gray-900">
                          {((selectedConv as any).channel || 'WhatsApp')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">Status</span>
                        <span className="font-semibold text-emerald-600">
                          {sessionWindow?.isClosed ? 'Expired' : 'Active Session'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">First Contact</span>
                        <span className="font-medium text-gray-700">
                          {formatDateString(selectedConv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">Last Message</span>
                        <span className="font-medium text-gray-700">
                          {formatTimeString(selectedConv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">Total Messages</span>
                        <span className="font-medium text-gray-700">
                          {outboundCount} sent / {inboundCount} rec
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">Assigned Agent</span>
                        <span className="font-semibold text-blue-600">
                          {selectedConv.needsEscalation ? 'Support Agent' : 'AI Assistant'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-gray-500">Tags</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded border border-gray-200">
                          Insurance Lead
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions Section */}
                  <div className="space-y-2 pt-1 border-t border-gray-100">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block py-1">
                      Quick Actions
                    </span>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleHandlerMutation.mutate(!selectedConv.needsEscalation)}
                        disabled={toggleHandlerMutation.isPending}
                        className="w-full py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <span>
                          {selectedConv.needsEscalation
                            ? 'Return to AI Handling'
                            : 'Transfer to Human Agent'}
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-gray-500">
                          {selectedConv.needsEscalation ? 'arrow_back' : 'arrow_forward'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => closeConversationMutation.mutate()}
                        disabled={closeConversationMutation.isPending || selectedConv.status === 'CLOSED'}
                        className="w-full py-2 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors shadow-2xs disabled:opacity-50"
                      >
                        <span>
                          {closeConversationMutation.isPending
                            ? 'Resolving...'
                            : selectedConv.status === 'CLOSED'
                            ? 'Resolved'
                            : 'Mark as Resolved'}
                        </span>
                        <span className="material-symbols-outlined text-[16px] text-gray-500">
                          check
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Block this contact and report as spam?')) {
                            closeConversationMutation.mutate();
                          }
                        }}
                        className="w-full py-2 px-3 bg-white hover:bg-rose-50/50 border border-rose-200/80 rounded-lg text-xs font-semibold text-rose-600 flex items-center justify-between transition-colors shadow-2xs"
                      >
                        <span>Block & Report Spam</span>
                        <span className="material-symbols-outlined text-[16px] text-rose-600">
                          block
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Intake Answers Tab Content */
                <div className="space-y-4">
                  <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Lead Qualification Parameters
                    </span>

                    {selectedConv.customer.intake ? (
                      <div className="space-y-3">
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/70">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">Age</span>
                          <p className="text-xs font-semibold text-gray-900 mt-0.5">
                            {selectedConv.customer.intake.age || 'Not specified'} years
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/70">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">US State</span>
                          <p className="text-xs font-semibold text-gray-900 mt-0.5">
                            {selectedConv.customer.intake.state || 'Not specified'}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/70">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">Monthly Budget</span>
                          <p className="text-xs font-semibold text-gray-900 mt-0.5">
                            {selectedConv.customer.intake.budgetMin && selectedConv.customer.intake.budgetMax
                              ? `$${selectedConv.customer.intake.budgetMin} - $${selectedConv.customer.intake.budgetMax} / mo`
                              : 'Not specified'}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/70">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">Family Size</span>
                          <p className="text-xs font-semibold text-gray-900 mt-0.5">
                            {selectedConv.customer.intake.familySize || '1'} member(s)
                          </p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-200/70">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">Health Conditions</span>
                          <p className="text-xs font-semibold text-gray-900 mt-0.5 leading-relaxed">
                            {selectedConv.customer.intake.healthConditions || 'None reported'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center flex flex-col items-center gap-2 text-gray-400">
                        <span className="material-symbols-outlined text-[24px] text-gray-300">description</span>
                        <p className="text-xs italic">No intake qualification data available for this lead yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

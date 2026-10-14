'use client';

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderType: 'CUSTOMER' | 'BOT' | 'AGENT';
  createdAt: string;
  status?: string;
  channel?: string;
}

export interface WhatsAppChatViewProps {
  conversationId: string;
  customerName: string;
  customerPhone: string;
  messages: ChatMessage[];
  replyText: string;
  setReplyText: (text: string) => void;
  onSend: (e: React.FormEvent) => void;
  isSending: boolean;
  needsEscalation: boolean;
  onTakeover?: () => void;
  onResolve?: () => void;
  sessionWindow?: {
    isClosed: boolean;
    text: string;
    hoursRemaining: number;
    msRemaining: number;
  } | null;
  isRecording?: boolean;
  recordingSeconds?: number;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export default function WhatsAppChatView({
  conversationId,
  customerName,
  customerPhone,
  messages,
  replyText,
  setReplyText,
  onSend,
  isSending,
  needsEscalation,
  onTakeover,
  onResolve,
  sessionWindow,
  isRecording,
  recordingSeconds = 0,
  onStartRecording,
  onStopRecording,
}: WhatsAppChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      let h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
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

  // Group messages or get date label
  const getDateLabel = () => {
    if (messages.length === 0) return 'TODAY';
    try {
      const firstDate = new Date(messages[0].createdAt);
      const isToday = new Date().toDateString() === firstDate.toDateString();
      if (isToday) {
        return `TODAY, ${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}`;
      }
      return firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    } catch {
      return 'TODAY';
    }
  };

  const initials = getInitials(customerName, customerPhone);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] relative overflow-hidden font-sans">
      {/* Compact Header Bar */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200/80 flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-gray-900 truncate leading-tight">
                {customerName}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                WHATSAPP
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 leading-tight mt-0.5">
              <span>+{customerPhone}</span>
              <span className="text-gray-300">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                online
              </span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 sm:gap-2 text-gray-500 shrink-0">
          {needsEscalation ? (
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">
              Escalated to Human
            </span>
          ) : (
            <span className="hidden sm:inline-flex bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">
              AI Handling
            </span>
          )}

          <button
            type="button"
            title="Search in chat"
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
          <button
            type="button"
            title="Attach file"
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">attach_file</span>
          </button>
          <button
            type="button"
            title="More options"
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>
      </header>

      {/* Message Stream Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 z-10">
        {/* Date Divider Capsule */}
        <div className="flex justify-center my-2">
          <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200/80 px-3 py-0.5 rounded-full shadow-2xs select-none uppercase tracking-wide">
            {getDateLabel()}
          </span>
        </div>

        {/* Messages */}
        {messages.map((msg) => {
          const isOutbound = msg.direction === 'OUTBOUND';
          const senderLabel =
            msg.senderType === 'BOT'
              ? 'AI Assistant'
              : msg.senderType === 'AGENT'
              ? 'SUPPORT AGENT'
              : 'SUPPORT AGENT';

          return (
            <div
              key={msg.id}
              className={cn(
                'flex w-full',
                isOutbound ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'relative max-w-[80%] sm:max-w-[70%] px-3.5 py-2 text-xs sm:text-[13px] leading-relaxed shadow-2xs transition-all',
                  isOutbound
                    ? 'bg-[#e7f8ec] text-gray-900 border border-emerald-200/70 rounded-2xl rounded-tr-xs'
                    : 'bg-white text-gray-900 border border-gray-200/80 rounded-2xl rounded-tl-xs'
                )}
              >
                {/* Outbound Sender Header */}
                {isOutbound && (
                  <div className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center justify-between gap-2">
                    <span>{senderLabel}</span>
                  </div>
                )}

                {/* Message Content */}
                <div className="break-words whitespace-pre-wrap font-normal text-gray-900">
                  {msg.content}
                </div>

                {/* Timestamp & Status ticks */}
                <div
                  className={cn(
                    'flex items-center justify-end gap-1 text-[10px] mt-1 select-none',
                    isOutbound ? 'text-emerald-800/75' : 'text-gray-400'
                  )}
                >
                  {isOutbound && (
                    <span className="text-[9px] font-semibold uppercase tracking-wider mr-1 opacity-80">
                      {senderLabel} •
                    </span>
                  )}
                  <span>{formatTime(msg.createdAt)}</span>
                  {isOutbound && (
                    <span className="text-[#008069] text-[12px] font-bold leading-none ml-0.5" title="Read">
                      ✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Session Timer Active Status Pill */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="bg-white border border-gray-200 text-gray-600 text-xs px-3.5 py-1 rounded-full shadow-2xs flex items-center gap-1.5 select-none">
            <span className="material-symbols-outlined text-[14px] text-blue-600">schedule</span>
            <span>
              {sessionWindow?.isClosed
                ? 'Session expired • 24h Customer Service Window closed'
                : `Awaiting customer response... Session timer active (${sessionWindow?.text || 'Active'})`}
            </span>
          </div>
        </div>

        <div ref={scrollRef} />
      </div>

      {/* Voice Recording In-Progress Banner */}
      {isRecording && (
        <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 flex items-center justify-between shrink-0 animate-pulse">
          <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Recording Voice Note... ({recordingSeconds}s)</span>
          </div>
          <button
            type="button"
            onClick={onStopRecording}
            className="px-2.5 py-1 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
          >
            Finish & Send
          </button>
        </div>
      )}

      {/* Modern Composer Dock */}
      <footer className="h-14 bg-white border-t border-gray-200 px-3.5 flex items-center gap-2 shrink-0 z-10">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
          title="Attach File"
        >
          <span className="material-symbols-outlined text-[20px]">attach_file</span>
        </button>

        <button
          type="button"
          className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
          title="Emoji"
        >
          <span className="material-symbols-outlined text-[20px]">mood</span>
        </button>

        {/* Input Field */}
        <form onSubmit={onSend} className="flex-1 flex items-center gap-2 min-w-0">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 hover:bg-gray-100/60 focus:bg-white text-gray-900 placeholder:text-gray-400 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />

          {replyText.trim() ? (
            <button
              type="submit"
              disabled={isSending}
              className="w-8 h-8 rounded-lg bg-[#004ac6] hover:bg-[#003cb0] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 disabled:opacity-50 shrink-0"
              title="Send Message"
            >
              <span className="material-symbols-outlined text-[17px]">send</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
                isRecording
                  ? "bg-rose-500 text-white animate-pulse"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              )}
              title={isRecording ? "Stop Recording" : "Voice Note"}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isRecording ? 'mic_off' : 'mic'}
              </span>
            </button>
          )}
        </form>
      </footer>
    </div>
  );
}


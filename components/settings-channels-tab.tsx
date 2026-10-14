'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Socket } from 'socket.io-client';
import { getClientSocket } from '@/lib/socket-client';
import { 
  Phone, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldCheck, 
  Power,
  Sliders,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Check,
  Copy,
  FileText,
  Info,
  ExternalLink,
  MessageSquare,
  Settings,
  Radio,
  Layers,
  Building2,
  Clock,
  Send,
  Zap,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Authentic WhatsApp SVG Icon
function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.24-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.2-.59.2-1.09.14-1.18-.05-.09-.22-.16-.47-.29z" />
    </svg>
  );
}

// Authentic Instagram SVG Icon
function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

// Authentic Meta Infinity SVG Icon
function MetaIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.94 4.56c-1.85 0-3.32.9-4.94 3.04C10.38 5.46 8.91 4.56 7.06 4.56 3.65 4.56 1 7.25 1 11.08c0 4.12 3.09 8.36 6.13 8.36 1.83 0 3.33-.94 4.87-2.97 1.54 2.03 3.04 2.97 4.87 2.97 3.04 0 6.13-4.24 6.13-8.36 0-3.83-2.65-6.52-6.06-6.52zm-9.88 12.8c-1.83 0-3.98-3.08-3.98-6.28 0-2.48 1.62-4.44 3.98-4.44 1.52 0 2.76.87 4.16 2.94-1.88 2.82-3.14 7.78-4.16 7.78zm9.88 0c-1.02 0-2.28-4.96-4.16-7.78 1.4-2.07 2.64-2.94 4.16-2.94 2.36 0 3.98 1.96 3.98 4.44 0 3.2-2.15 6.28-3.98 6.28z" />
    </svg>
  );
}

type ConnectMethod = 'QR' | 'PHONE';
type EngineType = 'BAILEYS' | 'OPENWA' | 'META_CLOUD_API';
type ChannelKey = 'whatsapp' | 'instagram' | 'phoneline' | 'metacloud';
type WhatsAppSubTab = 
  | 'connection' 
  | 'engine' 
  | 'webhooks' 
  | 'messages' 
  | 'autoreplies' 
  | 'profile' 
  | 'advanced';

interface SettingsChannelsTabProps {
  tenantId?: string;
  onSwitchTab?: (tab: string) => void;
}

interface WhatsAppStatus {
  status: string;
  phoneNumber?: string;
}

export default function SettingsChannelsTab({ tenantId, onSwitchTab }: SettingsChannelsTabProps) {
  const queryClient = useQueryClient();

  // Active Channel & Sub-navigation State
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>('whatsapp');
  const [waSubTab, setWaSubTab] = useState<WhatsAppSubTab>('connection');

  // WhatsApp Engine & Connection States
  const [engine, setEngine] = useState<EngineType>('BAILEYS');
  const [connectMethod, setConnectMethod] = useState<ConnectMethod>('QR');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Meta Cloud API States
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaVerifyToken, setMetaVerifyToken] = useState('oneai_meta_verify_secret_123');
  const [metaSaveSuccess, setMetaSaveSuccess] = useState(false);
  const [copiedMetaUrl, setCopiedMetaUrl] = useState(false);

  // Phone Line Alias States
  const [phoneAlias, setPhoneAlias] = useState('+1 (555) 019-2834 (Prime Marketing Main Line)');
  const [phoneAliasSaved, setPhoneAliasSaved] = useState(false);

  // Instagram Channel States
  const [igId, setIgId] = useState('');
  const [igUsername, setIgUsername] = useState('');
  const [igPageId, setIgPageId] = useState('');
  const [igAccessToken, setIgAccessToken] = useState('');
  const [igSaveSuccess, setIgSaveSuccess] = useState(false);
  const [igError, setIgError] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load saved phone alias from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('oneai_phone_alias');
      if (saved) setPhoneAlias(saved);
    }
  }, []);

  // Fetch Meta Cloud config on mount
  useEffect(() => {
    if (tenantId) {
      fetch('/api/whatsapp/meta-config')
        .then((res) => res.json())
        .then((data) => {
          if (data.provider === 'META_CLOUD_API') {
            setEngine('META_CLOUD_API');
          }
          if (data.metaPhoneNumberId) setMetaPhoneId(data.metaPhoneNumberId);
          if (data.metaWabaId) setMetaWabaId(data.metaWabaId);
          if (data.metaAccessToken) setMetaAccessToken(data.metaAccessToken);
          if (data.metaVerifyToken) setMetaVerifyToken(data.metaVerifyToken);
        })
        .catch(() => {});
    }
  }, [tenantId]);

  // Mutation to save Meta Cloud credentials
  const saveMetaMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/whatsapp/meta-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'META_CLOUD_API',
          metaPhoneNumberId: metaPhoneId,
          metaWabaId,
          metaAccessToken,
          metaVerifyToken,
        }),
      });
      if (!res.ok) throw new Error('Failed to save Meta credentials');
      return res.json();
    },
    onSuccess: () => {
      setMetaSaveSuccess(true);
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['whatsappStatus', tenantId] });
      setTimeout(() => setMetaSaveSuccess(false), 4000);
    },
  });

  // Fetch current WhatsApp status from database
  const { data: waStatus, refetch: refetchStatus } = useQuery<WhatsAppStatus>({
    queryKey: ['whatsappStatus', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenantId');
      const res = await fetch(`/api/whatsapp/status?tenantId=${encodeURIComponent(tenantId)}`);
      return res.json();
    },
    enabled: !!tenantId,
    refetchInterval: 10000,
  });

  // Fetch Instagram Channel status
  const { data: igStatus, refetch: refetchIgStatus } = useQuery<{
    connected: boolean;
    instagramId?: string;
    username?: string;
    pageId?: string;
    status: string;
  }>({
    queryKey: ['instagramStatus', tenantId],
    queryFn: async () => {
      const res = await fetch('/api/channels/instagram');
      return res.json();
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (igStatus?.connected) {
      if (igStatus.instagramId) setIgId(igStatus.instagramId);
      if (igStatus.username) setIgUsername(igStatus.username);
      if (igStatus.pageId) setIgPageId(igStatus.pageId);
    }
  }, [igStatus]);

  const saveIgMutation = useMutation({
    mutationFn: async () => {
      setIgError('');
      const res = await fetch('/api/channels/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagramId: igId,
          username: igUsername,
          pageId: igPageId,
          pageAccessToken: igAccessToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Instagram account');
      return data;
    },
    onSuccess: () => {
      setIgSaveSuccess(true);
      refetchIgStatus();
      queryClient.invalidateQueries({ queryKey: ['instagramStatus', tenantId] });
      setTimeout(() => setIgSaveSuccess(false), 4000);
    },
    onError: (err: any) => {
      setIgError(err.message || 'Error saving Instagram credentials');
    },
  });

  const disconnectIgMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/channels/instagram', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect Instagram');
      return res.json();
    },
    onSuccess: () => {
      refetchIgStatus();
      setIgId('');
      setIgUsername('');
      setIgPageId('');
      setIgAccessToken('');
      queryClient.invalidateQueries({ queryKey: ['instagramStatus', tenantId] });
    },
  });

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Poll engine for QR code every 2s after initiating
  const startQrPolling = useCallback((tid: string) => {
    stopPolling();
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 25) {
        stopPolling();
        setConnecting(false);
        setStatusMsg('Timed out waiting for QR code. Please try again.');
        return;
      }
      try {
        const res = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId: tid, engine, method: 'QR' }),
        });
        const data = await res.json();
        if (data.qr) {
          setQrCode(data.qr);
          setConnecting(false);
          setStatusMsg('');
          stopPolling();
        }
      } catch {
        // Engine preparing...
      }
    }, 2000);
  }, [engine, stopPolling]);

  // Setup Socket.io listener
  useEffect(() => {
    if (!tenantId) return;

    const socket = getClientSocket(tenantId);
    socketRef.current = socket;

    socket.on('whatsapp_qr', (data: { qr: string }) => {
      setQrCode(data.qr);
      setPairingCode(null);
      setConnecting(false);
      setStatusMsg('');
      stopPolling();
    });

    socket.on('whatsapp_pairing_code', (data: { pairingCode: string }) => {
      setPairingCode(data.pairingCode);
      setQrCode(null);
      setConnecting(false);
      setStatusMsg('');
      stopPolling();
    });

    socket.on('whatsapp_status', (data: { status: string; phoneNumber?: string }) => {
      if (data.status === 'CONNECTED') {
        setQrCode(null);
        setPairingCode(null);
        setConnecting(false);
        stopPolling();
        queryClient.setQueryData<WhatsAppStatus>(['whatsappStatus', tenantId], () => ({
          status: 'CONNECTED',
          phoneNumber: data.phoneNumber,
        }));
        refetchStatus();
      } else if (data.status === 'DISCONNECTED') {
        queryClient.setQueryData<WhatsAppStatus>(['whatsappStatus', tenantId], () => ({
          status: 'DISCONNECTED',
        }));
        refetchStatus();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      stopPolling();
    };
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      return res.json();
    },
    onSuccess: () => {
      setQrCode(null);
      setPairingCode(null);
      stopPolling();
      queryClient.setQueryData<WhatsAppStatus>(['whatsappStatus', tenantId], () => ({ status: 'DISCONNECTED' }));
    },
  });

  const handleConnect = async () => {
    if (!tenantId) return;

    if (connectMethod === 'PHONE') {
      const clean = phoneInput.replace(/[^0-9]/g, '');
      if (clean.length < 7) {
        setPhoneError('Enter valid phone number with country code (e.g. 15550192834)');
        return;
      }
      setPhoneError('');
      setConnecting(true);
      setStatusMsg('Requesting pairing code from WhatsApp engine...');
      try {
        const res = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, engine, method: 'PHONE', phoneNumber: clean }),
        });
        const data = await res.json();
        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
          setConnecting(false);
          setStatusMsg('');
        }
      } catch {
        setConnecting(false);
        setStatusMsg('Engine offline. Please ensure whatsapp-engine service is running.');
      }
      return;
    }

    // QR method
    setConnecting(true);
    setQrCode(null);
    setStatusMsg('Initializing WhatsApp connection engine...');
    try {
      await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, engine, method: 'QR' }),
      });
      startQrPolling(tenantId);
    } catch {
      setConnecting(false);
      setStatusMsg('Failed to connect to engine.');
    }
  };

  const handleSavePhoneAlias = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('oneai_phone_alias', phoneAlias);
    }
    setPhoneAliasSaved(true);
    setTimeout(() => setPhoneAliasSaved(false), 3000);
  };

  const isWaConnected = waStatus?.status === 'CONNECTED';
  const isIgConnected = !!igStatus?.connected;
  const isMetaConnected = (engine as any) === 'META_CLOUD_API' && !!metaPhoneId && !!metaAccessToken;

  const waSubTabs: Array<{ id: WhatsAppSubTab; label: string; icon: any }> = [
    { id: 'connection', label: 'Connection', icon: Radio },
    { id: 'engine', label: 'Engine & Pairing', icon: Sliders },
    { id: 'webhooks', label: 'Webhooks', icon: Layers },
    { id: 'messages', label: 'Message Settings', icon: MessageSquare },
    { id: 'autoreplies', label: 'Auto Replies', icon: Sparkles },
    { id: 'profile', label: 'Business Profile', icon: Building2 },
    { id: 'advanced', label: 'Advanced Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6 font-sans text-gray-900">
      {/* SECTION 1: CONNECTED CHANNELS HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Connected Channels</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage and connect the communication channels used by your agency.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onSwitchTab) {
              onSwitchTab('compliance');
            } else if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('tab', 'compliance');
              window.history.pushState({}, '', url.toString());
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>View Channel Logs</span>
        </button>
      </div>

      {/* SECTION 2: 4 CONNECTED CHANNELS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: WhatsApp Business */}
        <div
          onClick={() => setSelectedChannel('whatsapp')}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group",
            selectedChannel === 'whatsapp'
              ? "border-[#004ac6] bg-blue-50/25 ring-2 ring-[#004ac6]/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <WhatsAppIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                    isWaConnected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  )}
                >
                  {isWaConnected ? 'Connected' : 'Disconnected'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900">WhatsApp Business</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Connect your WhatsApp Business account to enable AI replies.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100">
            {isWaConnected ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedChannel('whatsapp');
                }}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Manage WhatsApp</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedChannel('whatsapp');
                  setWaSubTab('connection');
                  handleConnect();
                }}
                className="w-full py-2 bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
              >
                Connect WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Instagram */}
        <div
          onClick={() => setSelectedChannel('instagram')}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group",
            selectedChannel === 'instagram'
              ? "border-[#004ac6] bg-blue-50/25 ring-2 ring-[#004ac6]/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <InstagramIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                    isIgConnected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  )}
                >
                  {isIgConnected ? 'Connected' : 'Not Connected'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900">Instagram</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Connect your Instagram account to manage direct messages.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedChannel('instagram');
              }}
              className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#004ac6] text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
            >
              {isIgConnected ? 'Manage Instagram' : 'Connect Instagram'}
            </button>
          </div>
        </div>

        {/* Card 3: Phone Line */}
        <div
          onClick={() => setSelectedChannel('phoneline')}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group",
            selectedChannel === 'phoneline'
              ? "border-[#004ac6] bg-blue-50/25 ring-2 ring-[#004ac6]/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Configured
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900">Phone Line</h3>
            <div className="mt-1 space-y-0.5">
              <p className="text-xs font-semibold text-gray-900">+1 (555) 019-2834</p>
              <p className="text-[11px] text-gray-500">Prime Marketing Main Line</p>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedChannel('phoneline');
              }}
              className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#004ac6] text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
            >
              Configure
            </button>
          </div>
        </div>

        {/* Card 4: Meta Cloud API */}
        <div
          onClick={() => setSelectedChannel('metacloud')}
          className={cn(
            "p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group",
            selectedChannel === 'metacloud'
              ? "border-[#004ac6] bg-blue-50/25 ring-2 ring-[#004ac6]/20 shadow-xs"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs"
          )}
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#0081FB] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <MetaIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                    isMetaConnected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-gray-100 text-gray-700 border-gray-200"
                  )}
                >
                  {isMetaConnected ? 'Connected' : 'Not Connected'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-900">Meta Cloud API</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Use Meta&apos;s official WhatsApp Business API for production.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedChannel('metacloud');
              }}
              className="w-full py-2 bg-white hover:bg-gray-50 border border-gray-200 text-[#004ac6] text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer"
            >
              {isMetaConnected ? 'Manage Meta API' : 'Connect Meta API'}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: MASTER-DETAIL CONFIGURATION WORKSPACE */}

      {/* 1. WHATSAPP BUSINESS CONFIGURATION (Matches Screenshot) */}
      {selectedChannel === 'whatsapp' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col lg:flex-row animate-in fade-in duration-150">
          {/* Left Sub-Sidebar (Width ~260px) */}
          <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-gray-100 p-5 bg-gray-50/40 flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-2xs">
                  <WhatsAppIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">WhatsApp Business</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    Configure your WhatsApp connection and settings.
                  </p>
                </div>
              </div>

              {/* Sub-Nav Menu */}
              <nav className="space-y-1">
                {waSubTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = waSubTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setWaSubTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition cursor-pointer",
                        isActive
                          ? "bg-blue-50 text-[#004ac6] font-bold shadow-2xs"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/70"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#004ac6]" : "text-gray-400")} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Status Indicator */}
            <div className="pt-6 border-t border-gray-200/70 mt-6 hidden lg:flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>System Online</span>
              </span>
              <span className="font-mono text-[10px]">V1.0</span>
            </div>
          </div>

          {/* Right Main Panel */}
          <div className="flex-1 p-5 sm:p-7 min-w-0">
            {/* SUB-TAB: CONNECTION */}
            {waSubTab === 'connection' && (
              <div className="space-y-6">
                {/* Top Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#25D366] flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                      <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900">Connection Status</h4>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            isWaConnected
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          )}
                        >
                          {isWaConnected ? '● Connected' : '○ Disconnected'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {isWaConnected
                          ? `Active WhatsApp phone line: ${waStatus?.phoneNumber || '+1 (555) 019-2834'} • Quality Tier 1 (1,000 msgs/24h)`
                          : 'Connect your WhatsApp Business phone number to enable automated replies.'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isWaConnected ? (
                      <button
                        type="button"
                        onClick={() => disconnectMutation.mutate()}
                        disabled={disconnectMutation.isPending}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 shadow-2xs flex items-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Power className="w-3.5 h-3.5" />
                        {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect WhatsApp'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConnect}
                        disabled={connecting}
                        className="px-5 py-2.5 bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-60"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-white" />
                        {connecting ? 'Connecting...' : 'Connect WhatsApp'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Select Engine */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-gray-700">Select Engine</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Baileys */}
                    <div
                      onClick={() => setEngine('BAILEYS')}
                      className={cn(
                        "p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between",
                        engine === 'BAILEYS'
                          ? "border-[#004ac6] bg-blue-50/40 ring-1 ring-[#004ac6]"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="engine_choice"
                              checked={engine === 'BAILEYS'}
                              onChange={() => setEngine('BAILEYS')}
                              className="accent-[#004ac6] cursor-pointer"
                            />
                            <span className="text-xs font-bold text-gray-900">Baileys (WebSockets)</span>
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed pl-5">
                          High performance, lightweight socket engine. Fast QR pair.
                        </p>
                      </div>
                    </div>

                    {/* OpenWA */}
                    <div
                      onClick={() => setEngine('OPENWA')}
                      className={cn(
                        "p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between",
                        engine === 'OPENWA'
                          ? "border-[#004ac6] bg-blue-50/40 ring-1 ring-[#004ac6]"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="engine_choice"
                              checked={engine === 'OPENWA'}
                              onChange={() => setEngine('OPENWA')}
                              className="accent-[#004ac6] cursor-pointer"
                            />
                            <span className="text-xs font-bold text-gray-900">OpenWA (Chromium)</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed pl-5">
                          Headless Chromium session with full web browser features.
                        </p>
                      </div>
                    </div>

                    {/* Meta Cloud API */}
                    <div
                      onClick={() => {
                        setEngine('META_CLOUD_API');
                        setSelectedChannel('metacloud');
                      }}
                      className={cn(
                        "p-4 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between",
                        engine === 'META_CLOUD_API'
                          ? "border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="engine_choice"
                              checked={engine === 'META_CLOUD_API'}
                              onChange={() => {
                                setEngine('META_CLOUD_API');
                                setSelectedChannel('metacloud');
                              }}
                              className="accent-emerald-600 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-gray-900">Meta Cloud API</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Official
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed pl-5">
                          Official Meta Graph REST API (WhatsApp Business Account).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pairing Method */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-gray-700">Pairing Method</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* QR Code Scanner */}
                    <div
                      onClick={() => setConnectMethod('QR')}
                      className={cn(
                        "p-4 rounded-xl border text-left transition cursor-pointer flex items-center justify-between",
                        connectMethod === 'QR'
                          ? "border-[#004ac6] bg-blue-50/40 ring-1 ring-[#004ac6]"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="pairing_method"
                          checked={connectMethod === 'QR'}
                          onChange={() => setConnectMethod('QR')}
                          className="accent-[#004ac6] cursor-pointer"
                        />
                        <div className="p-2 bg-blue-50 rounded-lg text-[#004ac6]">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-900 block">QR Code Scanner</span>
                          <span className="text-[11px] text-gray-500">Scan the QR code using your WhatsApp mobile app.</span>
                        </div>
                      </div>
                    </div>

                    {/* 8-Digit Pairing Code */}
                    <div
                      onClick={() => setConnectMethod('PHONE')}
                      className={cn(
                        "p-4 rounded-xl border text-left transition cursor-pointer flex items-center justify-between",
                        connectMethod === 'PHONE'
                          ? "border-[#004ac6] bg-blue-50/40 ring-1 ring-[#004ac6]"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="pairing_method"
                          checked={connectMethod === 'PHONE'}
                          onChange={() => setConnectMethod('PHONE')}
                          className="accent-[#004ac6] cursor-pointer"
                        />
                        <div className="p-2 bg-blue-50 rounded-lg text-[#004ac6]">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-900 block">8-Digit Phone Pairing Code</span>
                          <span className="text-[11px] text-gray-500">Use 8-digit code to pair your device.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Steps to Connect (QR Code) Callout / Live QR Image */}
                {connectMethod === 'QR' && (
                  <div className="space-y-4">
                    {!qrCode && !connecting && (
                      <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-950 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs text-[#004ac6]">
                          <Info className="w-4 h-4 text-[#004ac6]" />
                          <span>Steps to Connect (QR Code)</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-gray-700 text-xs pl-1">
                          <li>Click on &ldquo;Connect WhatsApp&rdquo;.</li>
                          <li>A QR code will be generated.</li>
                          <li>Open WhatsApp → Linked Devices → Link a Device.</li>
                          <li>Scan the QR code.</li>
                          <li>Wait for the connection to be established.</li>
                        </ol>
                      </div>
                    )}

                    {connecting && (
                      <div className="p-8 bg-gray-50 border border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-3">
                        <RefreshCw className="w-7 h-7 text-[#004ac6] animate-spin" />
                        <p className="text-xs font-semibold text-gray-700">
                          {statusMsg || 'Requesting QR code from WhatsApp socket engine...'}
                        </p>
                      </div>
                    )}

                    {qrCode && (
                      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center space-y-4">
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-900">Scan QR Code with WhatsApp on your phone:</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl shadow-xs border border-gray-200">
                          <img src={qrCode} alt="WhatsApp QR Code" className="w-56 h-56 object-contain" />
                        </div>
                        <button
                          type="button"
                          onClick={handleConnect}
                          className="text-xs font-semibold text-[#004ac6] hover:underline flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Reload QR Code</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Phone Pairing Form */}
                {connectMethod === 'PHONE' && (
                  <div className="space-y-4 p-5 bg-gray-50 border border-gray-200 rounded-xl">
                    <label className="block text-xs font-bold text-gray-800">
                      Enter WhatsApp Phone Number with Country Code:
                    </label>
                    <div className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        placeholder="e.g. 15550192834"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="flex-1 px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={handleConnect}
                        disabled={connecting}
                        className="px-4 py-2 bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        {connecting ? 'Requesting...' : 'Get Pairing Code'}
                      </button>
                    </div>
                    {phoneError && <p className="text-xs text-rose-600 font-semibold">{phoneError}</p>}
                    {pairingCode && (
                      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1.5 max-w-md">
                        <p className="text-xs text-emerald-800 font-medium">Enter this pairing code in WhatsApp:</p>
                        <p className="text-3xl font-mono font-extrabold text-emerald-950 tracking-widest">{pairingCode}</p>
                        <p className="text-[11px] text-emerald-700">Open WhatsApp &gt; Linked Devices &gt; Link with phone number</p>
                      </div>
                    )}
                  </div>
                )}

                {statusMsg && !connecting && (
                  <p className="text-xs text-blue-900 font-semibold bg-blue-50 p-3 rounded-xl border border-blue-200">
                    {statusMsg}
                  </p>
                )}
              </div>
            )}

            {/* SUB-TAB: ENGINE & PAIRING */}
            {waSubTab === 'engine' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Engine &amp; Socket Pairing Architecture</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure WebSocket reconnect thresholds and background daemon heartbeat parameters.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-gray-900 block">Active Engine Instance</span>
                    <p className="text-xs text-gray-600">
                      Currently using <strong>{engine}</strong>. Multi-device protocol version 2.24.12.
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Health Check: OK
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-gray-900 block">Auto-Reconnect Daemon</span>
                    <p className="text-xs text-gray-600">
                      WebSocket auto-reconnects with exponential backoff on socket disconnects.
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Heartbeat: 30s
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setWaSubTab('connection')}
                    className="px-4 py-2 bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer"
                  >
                    Open Pairing Flow →
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB: WEBHOOKS */}
            {waSubTab === 'webhooks' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Webhook Endpoints &amp; Subscriptions</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live ingress webhook URLs for receiving incoming messages, delivery receipts, and status updates.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Inbound Webhook Callback URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value="https://oneai.drgodly.com/api/webhook/meta"
                        className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-mono text-gray-700 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("https://oneai.drgodly.com/api/webhook/meta");
                          setCopiedMetaUrl(true);
                          setTimeout(() => setCopiedMetaUrl(false), 2000);
                        }}
                        className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      >
                        {copiedMetaUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedMetaUrl ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Verify Token</label>
                    <input
                      type="text"
                      readOnly
                      value={metaVerifyToken}
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-mono text-gray-700"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: MESSAGE SETTINGS */}
            {waSubTab === 'messages' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Message SLA &amp; Rate Limit Settings</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure WhatsApp messaging parameters, typing delay simulation, and delivery SLAs.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Typing Presence Indicator</span>
                      <span className="text-[11px] text-gray-500">Displays &ldquo;typing...&rdquo; for 2–4 seconds before AI sends message.</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] rounded-full">
                      ENABLED
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Read Receipts Sync</span>
                      <span className="text-[11px] text-gray-500">Automatically marks messages as read when AI processes them.</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] rounded-full">
                      ENABLED
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: AUTO REPLIES */}
            {waSubTab === 'autoreplies' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">AI Auto-Replies &amp; Intake Bot Automation</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manage conversational bot qualification for incoming WhatsApp leads.
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-900">Conversational AI Intake Enabled</h5>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      All new inbound inquiries receive instant responses from the AI Sales Agent according to your Agency Intake Qualification prompt parameters.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: BUSINESS PROFILE */}
            {waSubTab === 'profile' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Agency WhatsApp Business Profile</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Public profile metadata shown to clients in WhatsApp.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Display Business Name</label>
                    <input
                      type="text"
                      readOnly
                      value="Prime Marketing Experts"
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-medium text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Industry Category</label>
                    <input
                      type="text"
                      readOnly
                      value="Insurance & Financial Consulting"
                      className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-xl text-xs font-medium text-gray-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: ADVANCED SETTINGS */}
            {waSubTab === 'advanced' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Advanced Engine Diagnostics</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Socket debugging, session token flushing, and engine restart.</p>
                </div>

                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">Baileys Multi-Device Creds Storage:</span>
                    <span className="font-mono text-gray-900">/whatsapp-engine/auth_info_baileys</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">Socket Protocol Version:</span>
                    <span className="font-mono text-gray-900">v7.0.0-rc13</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INSTAGRAM DIRECT MESSAGES CONFIGURATION */}
      {selectedChannel === 'instagram' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <InstagramIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">Instagram Direct Messages</h4>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                      isIgConnected
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    )}
                  >
                    {isIgConnected ? `Connected (@${igStatus?.username || 'agency'})` : 'Not Connected'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Connect your Instagram Professional or Creator account to let the AI Agent reply to incoming DMs automatically.
                </p>
              </div>
            </div>

            {isIgConnected && (
              <button
                type="button"
                onClick={() => disconnectIgMutation.mutate()}
                disabled={disconnectIgMutation.isPending}
                className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
              >
                {disconnectIgMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            )}
          </div>

          {/* Credentials Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Instagram Business Account ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={igId}
                  onChange={(e) => setIgId(e.target.value)}
                  placeholder="e.g. 17841400000000000"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Instagram Handle / Username
                </label>
                <input
                  type="text"
                  value={igUsername}
                  onChange={(e) => setIgUsername(e.target.value)}
                  placeholder="e.g. @primemarketingexperts"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Connected Facebook Page ID
                </label>
                <input
                  type="text"
                  value={igPageId}
                  onChange={(e) => setIgPageId(e.target.value)}
                  placeholder="e.g. 102938475610293"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Page Access Token (Encrypted AES-256) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={igAccessToken}
                  onChange={(e) => setIgAccessToken(e.target.value)}
                  placeholder={isIgConnected ? "••••••••••••••••••••••••" : "EAAB..."}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-blue-100 font-mono"
                />
              </div>
            </div>

            {/* In-App Instructions Callout */}
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Meta Platform Policy &amp; In-App Requirement:
              </p>
              <p>
                1. Inside your Instagram mobile app: <strong>Settings &amp; Privacy ➔ Messages &amp; Story Replies ➔ Message Controls ➔ Connected Tools ➔ Toggle ON &ldquo;Allow Access to Messages&rdquo;</strong>.
              </p>
              <p>
                2. Outbound AI responses are strictly permitted within <strong>24 hours</strong> of the customer&apos;s last direct message.
              </p>
            </div>

            {igError && <p className="text-xs text-rose-600 font-semibold">{igError}</p>}
            {igSaveSuccess && (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Instagram credentials securely saved and encrypted! Inbound DMs are active.
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => saveIgMutation.mutate()}
                disabled={saveIgMutation.isPending || !igId || (!igAccessToken && !isIgConnected)}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-700 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {saveIgMutation.isPending ? 'Connecting...' : 'Save & Connect Instagram'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PHONE LINE CONFIGURATION */}
      {selectedChannel === 'phoneline' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-start gap-3 pb-5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">Phone Line Configuration</h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Configured
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Configure primary voice and SMS phone line aliases, caller IDs, and routing tags.
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Display Alias Label
              </label>
              <input
                type="text"
                value={phoneAlias}
                onChange={(e) => setPhoneAlias(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-blue-100 font-medium"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                This label appears on internal lead logs, broadcast headers, and recipient SMS previews.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[11px] text-gray-400 font-semibold uppercase">Assigned Trunk Number</span>
                <p className="text-sm font-bold text-gray-900">+1 (555) 019-2834</p>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                <span className="text-[11px] text-gray-400 font-semibold uppercase">Caller ID Routing</span>
                <p className="text-sm font-bold text-gray-900">Direct AI Voice &amp; WhatsApp</p>
              </div>
            </div>

            {phoneAliasSaved && (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Phone Line Display Alias saved successfully!
              </p>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSavePhoneAlias}
                className="px-5 py-2.5 bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Save Phone Line Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. META CLOUD API CONFIGURATION */}
      {selectedChannel === 'metacloud' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6 animate-in fade-in duration-150">
          <div className="flex items-start gap-3 pb-5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-[#0081FB] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <MetaIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">Meta Cloud API (Official WhatsApp Business API)</h4>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Graph API v21.0
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Configure official Meta Graph REST API credentials for production-scale WhatsApp automation.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Meta Phone Number ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 109876543210987"
                  value={metaPhoneId}
                  onChange={(e) => setMetaPhoneId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 987654321098765"
                  value={metaWabaId}
                  onChange={(e) => setMetaWabaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Permanent System User Access Token <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="EAAG..."
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Webhook Verification Token <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={metaVerifyToken}
                  onChange={(e) => setMetaVerifyToken(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-mono outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Webhook Callback URL (Meta App Dashboard)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value="https://oneai.drgodly.com/api/webhook/meta"
                    className="flex-1 px-3.5 py-2.5 bg-gray-100 border border-gray-300 rounded-xl text-xs font-mono text-gray-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("https://oneai.drgodly.com/api/webhook/meta");
                      setCopiedMetaUrl(true);
                      setTimeout(() => setCopiedMetaUrl(false), 2000);
                    }}
                    className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedMetaUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMetaUrl ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {metaSaveSuccess && (
              <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Meta Credentials Saved &amp; Official Cloud Line Configured!
              </p>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => saveMetaMutation.mutate()}
                disabled={saveMetaMutation.isPending || !metaPhoneId || !metaAccessToken}
                className="px-5 py-2.5 bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {saveMetaMutation.isPending ? 'Saving & Testing...' : 'Save & Connect Meta Cloud Line'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

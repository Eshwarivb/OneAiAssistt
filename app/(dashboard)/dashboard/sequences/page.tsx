'use client';

import { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Clock, 
  Send, 
  CheckCircle2, 
  Users, 
  Layers, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SequenceStep {
  id: string;
  type: 'DELAY' | 'SEND_TEMPLATE' | 'WAIT_REPLY' | 'ASSIGN_TAG';
  delayDays?: number;
  templateName?: string;
  tagName?: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'ACTIVE' | 'PAUSED' | 'DRAFT';
  stepsCount: number;
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
  steps: SequenceStep[];
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSeqName, setNewSeqName] = useState('');
  const [newSeqDesc, setNewSeqDesc] = useState('');
  const [newSeqTrigger, setNewSeqTrigger] = useState('Lead Created');
  const [submitting, setSubmitting] = useState(false);
  const [selectedSeq, setSelectedSeq] = useState<Sequence | null>(null);

  const fetchSequences = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sequences');
      const data = await res.json();
      if (data.sequences) {
        setSequences(data.sequences);
      }
    } catch (err) {
      console.error('Failed to fetch sequences:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      // Optimistic update
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: nextStatus } : s))
      );
      await fetch('/api/sequences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
    } catch (err) {
      console.error('Failed to toggle status:', err);
      fetchSequences();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeqName.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSeqName,
          description: newSeqDesc,
          trigger: newSeqTrigger,
        }),
      });
      const data = await res.json();
      if (data.sequence) {
        setSequences((prev) => [data.sequence, ...prev]);
        setIsModalOpen(false);
        setNewSeqName('');
        setNewSeqDesc('');
      }
    } catch (err) {
      console.error('Failed to create sequence:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalEnrolled = sequences.reduce((acc, s) => acc + s.enrolledCount, 0);
  const totalCompleted = sequences.reduce((acc, s) => acc + s.completedCount, 0);
  const activeCount = sequences.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="flex-1 flex flex-col min-w-0 font-sans text-gray-900 space-y-6 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-emerald-500 shrink-0" />
            <span>WhatsApp Drip Sequences</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Automate multi-step lead nurture workflows, follow-ups, and policy welcome campaigns.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchSequences}
            className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Create Sequence</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Workflows */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Active Workflows
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {activeCount} / {sequences.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        {/* Leads Enrolled */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Leads Enrolled
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {totalEnrolled.toLocaleString()}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Completions */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Completions
            </span>
            <span className="text-2xl font-bold text-gray-900 mt-1 block">
              {totalCompleted.toLocaleString()}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* Engine Status */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
              Engine Status
            </span>
            <div className="text-base font-bold text-emerald-600 flex items-center gap-1.5 mt-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Operational</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 3. CONFIGURED AUTOMATION SEQUENCES CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <span>Configured Automation Sequences</span>
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            Showing {sequences.length} sequence{sequences.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs">Loading drip sequences...</p>
          </div>
        ) : sequences.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Zap className="h-10 w-10 text-gray-300 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-900">No active drip sequences</p>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Create your first automated WhatsApp sequence to engage incoming insurance leads instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Sequence</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sequences.map((seq) => (
              <div
                key={seq.id}
                className="p-5 sm:p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Side: Sequence Info + Steps */}
                <div className="space-y-2 flex-1 min-w-0">
                  {/* Sequence Name + Status + Trigger */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <h3 className="text-sm font-bold text-gray-900">
                      {seq.name}
                    </h3>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                        seq.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {seq.status === 'ACTIVE' ? (
                        <Play className="h-2.5 w-2.5 fill-current" />
                      ) : (
                        <Pause className="h-2.5 w-2.5 fill-current" />
                      )}
                      <span>{seq.status}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 font-semibold">
                      Trigger: {seq.trigger}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed font-normal">
                    {seq.description}
                  </p>

                  {/* Visual Flow Preview Steps */}
                  <div className="flex items-center gap-2 pt-1.5 overflow-x-auto scrollbar-none text-xs">
                    {seq.steps.map((step, idx) => (
                      <div key={step.id || idx} className="flex items-center gap-2 shrink-0">
                        {idx > 0 && <span className="text-gray-400 text-xs select-none">→</span>}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium shadow-2xs',
                            step.type === 'SEND_TEMPLATE'
                              ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-800'
                              : step.type === 'DELAY'
                              ? 'bg-amber-50/70 border-amber-200/80 text-amber-800'
                              : step.type === 'ASSIGN_TAG'
                              ? 'bg-sky-50/70 border-sky-200/80 text-sky-800'
                              : 'bg-gray-100 border-gray-200 text-gray-700'
                          )}
                        >
                          {step.type === 'SEND_TEMPLATE' && <Send className="h-3 w-3 text-emerald-600" />}
                          {step.type === 'DELAY' && <Clock className="h-3 w-3 text-amber-600" />}
                          {step.type === 'ASSIGN_TAG' && <Tag className="h-3 w-3 text-sky-600" />}
                          <span>
                            {step.type === 'SEND_TEMPLATE'
                              ? step.templateName
                              : step.type === 'DELAY'
                              ? `${step.delayDays}d Delay`
                              : step.tagName || step.type}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side: Enrolled / Done & Pause/Play Control */}
                <div className="flex items-center gap-5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 font-medium">Enrolled / Done</p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">
                      {seq.enrolledCount} / {seq.completedCount}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleStatus(seq.id, seq.status)}
                    className={cn(
                      'w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shadow-2xs cursor-pointer',
                      seq.status === 'ACTIVE'
                        ? 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 text-amber-600'
                        : 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-600'
                    )}
                    title={seq.status === 'ACTIVE' ? 'Pause Sequence' : 'Activate Sequence'}
                  >
                    {seq.status === 'ACTIVE' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE SEQUENCE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
            <header className="px-5 py-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500" />
                <span>Create Drip Sequence</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-gray-200/60 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
              >
                ✕
              </button>
            </header>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Sequence Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Medicare Lead Nurture"
                  value={newSeqName}
                  onChange={(e) => setNewSeqName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe the target audience and cadence..."
                  value={newSeqDesc}
                  onChange={(e) => setNewSeqDesc(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-normal focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Trigger Event
                </label>
                <select
                  value={newSeqTrigger}
                  onChange={(e) => setNewSeqTrigger(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100 cursor-pointer"
                >
                  <option value="Lead Created">Lead Created</option>
                  <option value="Quote Issued">Quote Issued</option>
                  <option value="Form Submitted">Form Submitted</option>
                  <option value="Checkout Completed">Checkout Completed</option>
                </select>
              </div>

              <footer className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save & Launch</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

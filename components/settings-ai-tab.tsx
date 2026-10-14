'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot,
  Sliders, 
  MessageSquareCode, 
  Shield, 
  RotateCcw, 
  Save, 
  Info, 
  CheckCircle2, 
  Sparkles,
  Lock,
  Ban,
  ChevronDown,
  Layers,
  Zap,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_CONFIG = {
  temperature: 0.7,
  maxTokens: 256,
  toneOfVoice: 'Professional & Helpful (Standard Business)',
  piiRedaction: true,
  blacklistedKeywords: 'spam, scam, wire transfer, cryptocurrency',
  systemPrompt: 'You are a licensed healthcare insurance assistant. Respond helpfully, clearly, and concisely.',
};

const TONE_OPTIONS = [
  { value: 'Professional & Helpful (Standard Business)', label: 'Professional & Helpful', sub: 'Standard Business' },
  { value: 'Empathetic & Care-focused (Healthcare/Advisory)', label: 'Empathetic & Care-focused', sub: 'Healthcare / Advisory' },
  { value: 'Persuasive & Sales-driven (Lead Generation)', label: 'Persuasive & Sales-driven', sub: 'Lead Generation' },
  { value: 'Friendly & Casual (Informal Support)', label: 'Friendly & Casual', sub: 'Informal Support' },
];

export default function SettingsAiTab() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Real Form State
  const [temperature, setTemperature] = useState<number>(DEFAULT_CONFIG.temperature);
  const [maxTokens, setMaxTokens] = useState<number>(DEFAULT_CONFIG.maxTokens);
  const [toneOfVoice, setToneOfVoice] = useState<string>(DEFAULT_CONFIG.toneOfVoice);
  const [piiRedaction, setPiiRedaction] = useState<boolean>(DEFAULT_CONFIG.piiRedaction);
  const [blacklistedKeywords, setBlacklistedKeywords] = useState<string>(DEFAULT_CONFIG.blacklistedKeywords);
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_CONFIG.systemPrompt);

  // Restore saved configuration on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('oneai_ai_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.temperature === 'number') setTemperature(parsed.temperature);
          if (typeof parsed.maxTokens === 'number') setMaxTokens(parsed.maxTokens);
          if (parsed.toneOfVoice) setToneOfVoice(parsed.toneOfVoice);
          if (typeof parsed.piiRedaction === 'boolean') setPiiRedaction(parsed.piiRedaction);
          if (parsed.blacklistedKeywords !== undefined) setBlacklistedKeywords(parsed.blacklistedKeywords);
          if (parsed.systemPrompt !== undefined) setSystemPrompt(parsed.systemPrompt);
        }
      } catch {
        // Fallback to default state
      }
    }
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        const config = {
          temperature,
          maxTokens,
          toneOfVoice,
          piiRedaction,
          blacklistedKeywords,
          systemPrompt,
        };
        localStorage.setItem('oneai_ai_config', JSON.stringify(config));
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setSystemPrompt(DEFAULT_CONFIG.systemPrompt);
    setResetNotice(true);
    setTimeout(() => setResetNotice(false), 3000);
  };

  // Helper labels for dynamic summary
  const selectedToneObj = TONE_OPTIONS.find((t) => t.value === toneOfVoice) || TONE_OPTIONS[0];

  const getCreativityLabel = (val: number) => {
    if (val <= 0.3) return 'Precise';
    if (val <= 0.7) return 'Balanced';
    return 'Creative';
  };

  const getTokenLengthLabel = (val: number) => {
    if (val <= 128) return 'Short Messages';
    if (val <= 512) return 'Medium Length';
    return 'Long Explanations';
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 font-sans text-gray-900 text-left">
      {/* 1. TOP AI AGENT SUMMARY ROW (4 Visual Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Card 1: AI Agent Status (lg: 5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Bot className="w-6 h-6 text-[#004ac6]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">AI Agent</h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Your AI agent is ready to respond to customer conversations.
            </p>
          </div>
        </div>

        {/* Card 2: Tone of Voice (lg: 3 cols) */}
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Volume2 className="w-5 h-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 font-medium block">Tone of Voice</span>
            <h4 className="text-xs font-bold text-gray-900 truncate mt-0.5">{selectedToneObj.label}</h4>
            <span className="text-[10px] text-gray-400 block truncate">{selectedToneObj.sub}</span>
          </div>
        </div>

        {/* Card 3: Creativity (lg: 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Sparkles className="w-5 h-5 text-[#004ac6]" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 font-medium block">Creativity</span>
            <h4 className="text-sm font-bold text-gray-900 mt-0.5">{temperature}</h4>
            <span className="text-[10px] text-gray-400 block truncate">{getCreativityLabel(temperature)}</span>
          </div>
        </div>

        {/* Card 4: Max Output Tokens (lg: 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Zap className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-gray-400 font-medium block">Max Output Tokens</span>
            <h4 className="text-sm font-bold text-gray-900 mt-0.5">{maxTokens} tokens</h4>
            <span className="text-[10px] text-gray-400 block truncate">{getTokenLengthLabel(maxTokens)}</span>
          </div>
        </div>
      </div>

      {/* 2. MIDDLE TWO PANELS: PARAMETERS & SAFETY GUARDRAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Model Generation Parameters (lg: 7 cols) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-2xs flex flex-col justify-between space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004ac6] shrink-0 mt-0.5">
              <Sliders className="w-4 h-4 text-[#004ac6]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Model Generation Parameters</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Adjust the creative temperature and output size limits for AI replies.
              </p>
            </div>
          </div>

          {/* Creativity Temperature */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[11px] font-bold text-gray-700 tracking-wider uppercase">
                Creativity Temperature
              </span>
              <span className="font-mono text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-lg">
                {temperature}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#004ac6]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
              <span>Precise &amp; Factual (0.0)</span>
              <span>Balanced (0.5)</span>
              <span>Creative &amp; Empathetic (1.0)</span>
            </div>
          </div>

          {/* Max Output Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[11px] font-bold text-gray-700 tracking-wider uppercase">
                Max Output Tokens
              </span>
              <span className="font-mono text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 px-2.5 py-0.5 rounded-lg">
                {maxTokens} tokens
              </span>
            </div>
            <input
              type="range"
              min="64"
              max="1024"
              step="64"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#004ac6]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
              <span>Short Messages (64)</span>
              <span>Medium Paragraphs (256)</span>
              <span>Long Explanations (1024)</span>
            </div>
          </div>

          {/* Tone of Voice Style */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-700 tracking-wider uppercase block">
              Tone of Voice Style
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#004ac6]">
                <Sparkles className="w-4 h-4 text-[#004ac6]" />
              </div>
              <select
                value={toneOfVoice}
                onChange={(e) => setToneOfVoice(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold text-gray-900 border border-gray-300 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#004ac6] focus:border-[#004ac6] appearance-none cursor-pointer"
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Safety Guardrails (lg: 5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004ac6] shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-[#004ac6]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Safety Guardrails</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Set safety and compliance rules for AI responses.
              </p>
            </div>
          </div>

          {/* PII Compliance Redaction Toggle */}
          <div className="flex items-start justify-between gap-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">PII Compliance Redaction</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Auto-redact emails, phones, SSN and credit cards.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPiiRedaction(!piiRedaction)}
              className={cn(
                "w-11 h-6 rounded-full p-0.5 transition-colors outline-none cursor-pointer shrink-0 mt-0.5",
                piiRedaction ? "bg-emerald-500" : "bg-gray-300"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded-full bg-white shadow-2xs transition-transform",
                  piiRedaction ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Automatic Redaction Callout */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-950">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-gray-600">
              <strong className="text-blue-900 font-semibold block mb-0.5">Automatically redacts:</strong>
              <span>Emails • Phone numbers • SSN • Credit cards</span>
            </div>
          </div>

          {/* Blocked Keywords */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-gray-700">
              <Ban className="w-3.5 h-3.5 text-blue-600" />
              <label className="text-[11px] font-bold text-gray-700 tracking-wider uppercase block">
                Blocked Keywords
              </label>
            </div>
            <textarea
              rows={2}
              value={blacklistedKeywords}
              onChange={(e) => setBlacklistedKeywords(e.target.value)}
              placeholder="Comma separated terms..."
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-medium outline-none focus:ring-1 focus:ring-[#004ac6] focus:border-[#004ac6] bg-white resize-none"
            />
            <p className="text-[10px] text-gray-400">
              Forces agent fallback to human when keywords are detected.
            </p>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM PANEL: CORE AI AGENT SYSTEM INSTRUCTIONS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004ac6] shrink-0 mt-0.5">
              <MessageSquareCode className="w-4 h-4 text-[#004ac6]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Core AI Agent System Instructions</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Define the core rules, behavioral guidelines, and system directives that shape the AI agent replies.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            <span>Reset to Default</span>
          </button>
        </div>

        {resetNotice && (
          <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-100">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>System instructions reset to default baseline! Click &ldquo;Save AI Settings&rdquo; to persist.</span>
          </div>
        )}

        <textarea
          rows={3}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full px-4 py-3.5 border border-gray-300 rounded-2xl text-xs font-mono font-medium outline-none focus:ring-1 focus:ring-[#004ac6] focus:border-[#004ac6] bg-white leading-relaxed resize-y min-h-[90px]"
        />

        {/* Action Row */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {saveSuccess && (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>AI Configuration saved successfully!</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#004ac6] hover:bg-[#003cb0] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 self-end disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save AI Settings'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}

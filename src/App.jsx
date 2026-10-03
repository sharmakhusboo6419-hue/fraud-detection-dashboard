import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldAlert, Activity, Search, ChevronRight,
  Database, Smartphone, Radio, WifiOff, RefreshCw, Zap,
  Brain, Target
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useLiveFraudData } from './hooks/useLiveFraudData';

const STATUS_STYLES = {
  Blocked: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Review: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Queued: 'bg-slate-800 text-slate-300 border-slate-700',
  Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

const money = (n = 0) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeAgo = (iso) => {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(diff)) return '—';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
};

const liveDot = (status) =>
  status === 'live'
    ? { color: 'bg-emerald-500', label: 'Live feed', icon: <Radio size={13} className="text-emerald-400" /> }
    : status === 'polling'
      ? { color: 'bg-amber-500', label: 'Polling', icon: <RefreshCw size={13} className="text-amber-400" /> }
      : status === 'reconnecting'
        ? { color: 'bg-amber-500', label: 'Reconnecting', icon: <RefreshCw size={13} className="text-amber-400" /> }
        : { color: 'bg-rose-500', label: 'Offline', icon: <WifiOff size={13} className="text-rose-400" /> };

const FALLBACK_SERIES = Array.from({ length: 10 }, (_, i) => ({ time: `${(8 + i).toString().padStart(2, '0')}:00`, volume: 0 }));

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toast, setToast] = useState(null);
  const [pulse, setPulse] = useState(null);

  const { transactions, stats, feed, status, error, model, simulate } = useLiveFraudData();
  const conn = liveDot(status);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!feed.length) return;
    const latest = feed[0];
    setPulse(latest.id);
    const t = setTimeout(() => setPulse(null), 1200);
    return () => clearTimeout(t);
  }, [feed]);

  const chartData = useMemo(() => {
    const s = stats.series?.length ? stats.series : FALLBACK_SERIES;
    if (timeRange === '1h') return s.slice(-2);
    if (timeRange === '24h') return s;
    if (timeRange === '7d') return s;
    return s;
  }, [stats.series, timeRange]);

  const chartTotal = useMemo(
    () => chartData.reduce((acc, p) => acc + p.volume, 0),
    [chartData]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = transactions;
    if (statusFilter !== 'ALL') {
      list = list.filter(t => t.status?.toUpperCase() === statusFilter);
    }
    if (q) {
      list = list.filter(t =>
        [t.customer_name, t.location, t.status, t.card_last_four, t.source]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      );
    }
    return list.slice(0, 12);
  }, [transactions, query, statusFilter]);

  const posture = useMemo(() => {
    const score = Math.round(stats.avg_risk_score || 0);
    const label = score >= 70 ? 'High Risk' : score >= 40 ? 'Moderate' : 'Low Risk';
    const tone =
      score >= 70
        ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
        : score >= 40
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return { score, label, tone };
  }, [stats.avg_risk_score]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 flex flex-col antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#111625] sticky top-0 z-50 px-5 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="h-9 w-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <ShieldAlert size={19} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-sm text-white tracking-tight">ShieldAI Platform</h1>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal">Enterprise Risk Screening & Fraud Monitoring</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 bg-[#090d16] p-1 rounded-lg border border-slate-800">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'model', label: 'Model', icon: Brain },
            { id: 'live', label: 'Live Feed', icon: Radio },
            { id: 'database', label: 'DB Schema', icon: Database },
            { id: 'app-convert', label: 'Mobile Setup', icon: Smartphone },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-slate-500'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-3">
          <span
            className="flex items-center space-x-2 text-xs px-2.5 py-1.5 rounded-md bg-[#090d16] border border-slate-800"
            title={error || conn.label}
          >
            <span className={`w-2 h-2 rounded-full ${conn.color} ${status === 'live' ? 'animate-pulse' : ''}`} />
            <span className="text-slate-300 font-medium text-[11px]">{conn.label}</span>
          </span>
          <button
            onClick={() => simulate(5).then(r => setToast({ title: `${r.created} transactions generated`, body: 'Pushed live to every connected dashboard.' })).catch(() => setToast({ title: 'Simulation failed', body: 'Is the backend running on the configured port?' }))}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition active:scale-95"
          >
            <Zap size={13} />
            <span>Simulate 5 txns</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-5 lg:px-8 py-6 space-y-6">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#111625] border border-slate-700 rounded-lg p-3.5 text-xs shadow-xl max-w-sm">
            <p className="font-semibold text-white">{toast.title}</p>
            {toast.body && <p className="text-slate-400 mt-0.5 text-[11px]">{toast.body}</p>}
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Live risk intelligence.</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time pipeline metrics and live screening decisions across active payment channels.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-400 bg-[#111625] border border-slate-800 px-3 py-1.5 rounded-md font-mono">
                <span>{new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>

            {/* Structured KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#111625] border border-slate-800/90 rounded-lg p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Transactions screened</span>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-white tracking-tight font-mono">
                    {stats.transactions_screened.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">live from database</span>
                </div>
              </div>

              <div className="bg-[#111625] border border-slate-800/90 rounded-lg p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Prevented loss</span>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-white tracking-tight font-mono">
                    {money(stats.prevented_loss)}
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">{stats.blocked} blocked</span>
                </div>
              </div>

              <div className="bg-[#111625] border border-slate-800/90 rounded-lg p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Flagged transactions</span>
                <div className="mt-2.5">
                  <div className="text-2xl font-bold text-white tracking-tight font-mono">
                    {stats.flagged.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">{stats.flagged_pct}% of volume</span>
                </div>
              </div>

              <div className="bg-[#111625] border border-slate-800/90 rounded-lg p-4 flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-medium">Avg risk score</span>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight font-mono">
                      {stats.avg_risk_score}
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">rolling 200 txns</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${posture.tone}`}>
                    {posture.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Operational Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Screening Activity Chart */}
              <div className="lg:col-span-2 bg-[#111625] border border-slate-800/90 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800/70">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Screening Activity</h3>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-base font-bold text-slate-200 font-mono">{chartTotal.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">transactions in window</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 bg-[#090d16] p-1 rounded-md border border-slate-800 self-start">
                      {['1h', '24h', '7d', '30d'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTimeRange(t)}
                          className={`px-2.5 py-1 text-xs rounded font-medium transition ${
                            timeRange === t ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-60 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '6px', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorVol)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Live Model Verdict & Risk Posture */}
              <div className="bg-[#111625] border border-slate-800/90 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800/70 mb-3">
                    <h3 className="text-sm font-semibold text-white">Live Risk Posture</h3>
                    <span className="text-[11px] text-slate-400">Feed: <strong className="text-slate-200 font-medium">{conn.label}</strong></span>
                  </div>

                  <div className="bg-[#090d16] border border-slate-800 rounded-md p-3.5 mb-4">
                    <p className="text-xs text-slate-400 mb-1">Average risk score</p>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-white font-mono">{posture.score}</span>
                      <span className="text-xs text-slate-500 font-mono">/ 100</span>
                      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded border ${posture.tone}`}>
                        {posture.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      Computed from rolling transactions. <span className="text-slate-200 font-medium font-mono">{stats.flagged}</span> items need review.
                    </p>
                  </div>

                  {/* Distribution breakdown */}
                  <div className="space-y-2 text-xs">
                    {[
                      { label: 'High risk (blocked)', pct: stats.transactions_screened ? (stats.blocked / stats.transactions_screened) * 100 : 0, value: stats.blocked, dot: 'bg-rose-500' },
                      { label: 'Watchlist (review)', pct: stats.flagged_pct, value: stats.review, dot: 'bg-amber-400' },
                      { label: 'Approved', pct: stats.approved_pct, value: stats.approved, dot: 'bg-emerald-400' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between text-slate-300">
                        <span className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${row.dot}`}></span>
                          <span className="text-slate-400">{row.label}</span>
                        </span>
                        <span className="font-medium font-mono text-slate-200">{row.value} · {row.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('live')}
                  className="mt-4 w-full text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 py-2 rounded-md bg-[#090d16] hover:bg-slate-800 border border-slate-800 transition"
                >
                  <span>View live feed</span>
                  <ChevronRight size={13} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Needs Attention & Detection Engine */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* High-Risk Transactions Table */}
              <div className="lg:col-span-2 bg-[#111625] border border-slate-800/90 rounded-lg p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/70">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Needs Attention</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Most recent evaluated payment records</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-[#090d16] border border-slate-800 rounded p-0.5">
                      {['ALL', 'BLOCKED', 'REVIEW'].map(f => (
                        <button
                          key={f}
                          onClick={() => setStatusFilter(f)}
                          className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                            statusFilter === f ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 text-slate-500" size={13} />
                      <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search name, city, status"
                        className="bg-[#090d16] border border-slate-800 text-xs text-slate-200 rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 w-48"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium text-[10px]">
                      <tr>
                        <th className="pb-2.5 pl-1">Customer</th>
                        <th className="pb-2.5">Amount</th>
                        <th className="pb-2.5">Risk score</th>
                        <th className="pb-2.5">Status</th>
                        <th className="pb-2.5 text-right pr-1">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            {error ? `Backend unreachable — ${error}` : 'No transactions yet. Hit "Simulate 5 txns".'}
                          </td>
                        </tr>
                      )}
                      {rows.map((txn) => (
                        <tr
                          key={txn.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            pulse === txn.id ? 'bg-indigo-950/30' : ''
                          } ${pulse === txn.id ? 'animate-pulse' : ''}`}
                        >
                          <td className="py-3 pl-1">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700/80 text-slate-300 font-semibold flex items-center justify-center text-[10px] font-mono">
                                {initials(txn.customer_name)}
                              </div>
                              <div>
                                <span className="font-medium text-slate-200 block">{txn.customer_name}</span>
                                <span className="text-[11px] text-slate-400">
                                  •••• {txn.card_last_four} · {txn.location} · {txn.source}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 font-semibold text-slate-100 font-mono">{money(txn.amount)}</td>
                          <td className="py-3">
                            <span className={`font-semibold font-mono ${
                              txn.risk_score >= 75 ? 'text-rose-400'
                                : txn.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {txn.risk_score}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${STATUS_STYLES[txn.status] || STATUS_STYLES.Queued}`}>
                              {txn.status}
                            </span>
                          </td>
                          <td className="py-3 text-right pr-1 text-slate-400 font-mono text-[11px]">{timeAgo(txn.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Showing {rows.length} of {transactions.length} loaded
                  </span>
                  <button
                    onClick={() => setActiveTab('live')}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1"
                  >
                    <span>Open live feed</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {/* Detection Engine Status */}
              <div className="bg-[#111625] border border-slate-800/90 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="pb-3 border-b border-slate-800/70 mb-4">
                    <span className="text-xs text-slate-400 font-medium">Detection Engine</span>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {model?.loaded ? 'Gradient Boosting classifier' : 'Rule engine (model not loaded)'}
                    </p>
                  </div>

                  {model?.loaded && model?.metrics?.test ? (
                    <div className="space-y-4">
                      <div className="bg-[#090d16] border border-slate-800 rounded-md p-3.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Fraud caught</span>
                          <span className="text-xs font-bold text-emerald-400 font-mono flex items-center space-x-1">
                            <Target size={13} />
                            <span>{(model.metrics.test.fraud_catch_rate * 100).toFixed(1)}%</span>
                          </span>
                        </div>
                        <div className="mt-2.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${model.metrics.test.fraud_catch_rate * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">PR-AUC (test)</span>
                          <span className="font-mono text-slate-200 font-semibold">{model.metrics.test.pr_auc?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">ROC-AUC (test)</span>
                          <span className="font-mono text-slate-200 font-semibold">{model.metrics.test.roc_auc?.toFixed(4)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Precision</span>
                          <span className="font-mono text-slate-200 font-semibold">{(model.metrics.test.precision * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">False positive rate</span>
                          <span className="font-mono text-slate-200 font-semibold">{(model.metrics.test.false_positive_rate * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Review budget</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {(model.metrics.review_budget * 100).toFixed(0)}% of traffic
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                        Measured on a held-out test set of {model.metrics.test_size?.toLocaleString()} transactions
                        that was never used for tuning. Base rate {(model.metrics.fraud_rate * 100).toFixed(2)}%.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="bg-[#090d16] border border-slate-800 rounded-md p-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Data freshness</span>
                          <span className="text-emerald-400 font-semibold">{conn.label}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        No trained model artifact found. Scoring currently uses the transparent rule engine.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('model')}
                  className="mt-5 w-full text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center space-x-1.5 py-2 rounded-md bg-[#090d16] hover:bg-slate-800 border border-slate-800 transition"
                >
                  <Brain size={14} className="text-indigo-400" />
                  <span>Full model report</span>
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'model' && (
          <div className="space-y-5">
            {!model?.loaded ? (
              <div className="bg-[#111625] border border-slate-800 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-sm text-slate-200">Model not loaded</h3>
                <p className="text-xs text-slate-400">
                  {model?.error || 'No trained artifact found. Run the training script to build one.'}
                </p>
                <code className="block text-indigo-300 font-mono text-xs bg-[#090d16] border border-slate-800 rounded p-3">
                  python backend/app/ml/train_model.py
                </code>
              </div>
            ) : (
              <>
                <div className="bg-[#111625] border border-slate-800 rounded-lg p-6 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="font-semibold text-base text-white">Held-out test performance</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {model.metrics?.test_size?.toLocaleString()} held-out transactions, never used for tuning
                        &middot; fraud base rate {((model.metrics?.fraud_rate || 0) * 100).toFixed(2)}%
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Trained: {model.trained_at ? new Date(model.trained_at).toLocaleDateString() : 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'PR-AUC', value: model.metrics?.test?.pr_auc?.toFixed(4), hint: 'primary metric' },
                      { label: 'ROC-AUC', value: model.metrics?.test?.roc_auc?.toFixed(4), hint: 'ranking quality' },
                      { label: 'Fraud caught', value: `${((model.metrics?.test?.fraud_catch_rate || 0) * 100).toFixed(1)}%`, hint: 'recall' },
                      { label: 'Precision', value: `${((model.metrics?.test?.precision || 0) * 100).toFixed(1)}%`, hint: 'of flags were fraud' },
                    ].map(k => (
                      <div key={k.label} className="bg-[#090d16] border border-slate-800 rounded-md p-3.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{k.label}</p>
                        <p className="text-xl font-bold text-white font-mono mt-1">{k.value}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{k.hint}</p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium text-[10px]">
                        <tr>
                          <th className="pb-2.5 pl-1">Metric</th>
                          <th className="pb-2.5">Held-out test</th>
                          <th className="pb-2.5">5-fold CV (train)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {[
                          ['PR-AUC', model.metrics?.test?.pr_auc, model.metrics?.cross_validation?.pr_auc],
                          ['ROC-AUC', model.metrics?.test?.roc_auc, model.metrics?.cross_validation?.roc_auc],
                        ].map(([name, test, cv]) => (
                          <tr key={name}>
                            <td className="py-3 pl-1 text-slate-300 font-medium">{name}</td>
                            <td className="py-3 font-mono text-slate-100">{test?.toFixed(4)}</td>
                            <td className="py-3 font-mono text-slate-400">{cv?.toFixed(4)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="py-3 pl-1 text-slate-300 font-medium">Confusion matrix</td>
                          <td className="py-3 font-mono text-slate-200" colSpan={2}>
                            TP {model.metrics?.test?.confusion_matrix?.tp} &middot;
                            {' '}FP {model.metrics?.test?.confusion_matrix?.fp} &middot;
                            {' '}FN {model.metrics?.test?.confusion_matrix?.fn} &middot;
                            {' '}TN {model.metrics?.test?.confusion_matrix?.tn}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-[#111625] border border-slate-800 rounded-lg p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Operating bands</h3>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Review cut</span>
                        <span className="font-mono text-slate-200">{model.review_cut}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Block cut</span>
                        <span className="font-mono text-slate-200">{model.block_cut}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Review FPR (legit traffic)</span>
                        <span className="font-mono text-slate-200">
                          {((model.reference_stats?.review_false_positive_rate || 0) * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Block FPR (legit traffic)</span>
                        <span className="font-mono text-slate-200">
                          {((model.reference_stats?.block_false_positive_rate || 0) * 100).toFixed(3)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                      Measured against {model.reference_stats?.n_reference?.toLocaleString()} simulated legitimate
                      transactions. The bands are quantiles of that reference population, not arbitrary multiples.
                    </p>
                  </div>

                  <div className="bg-[#111625] border border-slate-800 rounded-lg p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Model inputs</h3>
                    <ul className="space-y-2 text-xs">
                      {(model.features || []).map(f => (
                        <li key={f} className="flex items-center gap-2 text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="font-mono text-slate-200">{f}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-slate-400 mt-4 leading-relaxed font-mono">
                      {model.model_type}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'live' && (
          <div className="bg-[#111625] border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-semibold text-sm text-white">Real-time event stream</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every scored transaction arrives over WebSocket the instant it is processed.
                </p>
              </div>
              <button
                onClick={() => simulate(8).then(r => setToast({ title: `${r.created} transactions generated`, body: 'Streamed over the live WebSocket feed.' })).catch(() => setToast({ title: 'Simulation failed', body: 'Backend unreachable.' }))}
                className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition"
              >
                <Zap size={13} />
                <span>Generate traffic</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[30rem] overflow-y-auto pr-1">
              {feed.length === 0 && (
                <p className="text-xs text-slate-500 py-10 text-center font-mono">
                  Waiting for incoming events… press &quot;Generate traffic&quot;.
                </p>
              )}
              {feed.map((e) => (
                <div
                  key={e.id}
                  className="flex items-start justify-between gap-4 bg-[#090d16] border border-slate-800 rounded-md px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">
                      {e.name} <span className="text-slate-400 font-normal">· {money(e.amount)} · {e.location}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {e.reasons.length ? e.reasons.join(' · ') : 'No risk signals — routine activity'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs font-bold text-amber-400">{e.riskScore}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${STATUS_STYLES[e.status] || STATUS_STYLES.Queued}`}>
                      {e.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="bg-[#111625] border border-slate-800 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-sm text-white">Live SQLite Schema (shield.db)</h3>
            <p className="text-xs text-slate-400">
              Transactions data table schema — providing auditable risk scoring data.
            </p>
            <div className="bg-[#090d16] p-4 rounded-md border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed">
              <pre>{`CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    card_last_four TEXT NOT NULL,
    location TEXT NOT NULL,
    amount REAL NOT NULL,
    is_foreign INTEGER NOT NULL,
    failed_pin_attempts INTEGER NOT NULL,
    risk_score INTEGER NOT NULL,
    status TEXT NOT NULL,
    source TEXT DEFAULT 'Manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`}</pre>
            </div>
          </div>
        )}

        {activeTab === 'app-convert' && (
          <div className="bg-[#111625] border border-slate-800 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-sm text-white">Mobile Build Setup</h3>
            <p className="text-xs text-slate-400">Run <code className="text-indigo-400 font-mono">npx cap add android</code> to bundle this updated UI into an Android APK.</p>
          </div>
        )}
      </main>
    </div>
  );
}


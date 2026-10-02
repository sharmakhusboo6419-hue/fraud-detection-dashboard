import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert, ShieldCheck, Activity, BarChart3, Database,
  Sliders, Settings, Bell, RefreshCw, AlertTriangle, Play,
  Zap, ArrowUpRight, Cpu, Layers, Download, Search, CheckCircle,
  FileText, Globe, Smartphone, Code, Terminal, Server, X, Filter,
  Check, Pause
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

// --- Static Analytics Data ---
const MODEL_PERFORMANCE = [
  { model: 'XGBoost (Tuned)', precision: 0.94, recall: 0.89, f1: 0.91, roc_auc: 0.982, latency: '4ms' },
  { model: 'LightGBM + SMOTE', precision: 0.92, recall: 0.91, f1: 0.91, roc_auc: 0.979, latency: '3ms' },
  { model: 'Random Forest', precision: 0.89, recall: 0.84, f1: 0.86, roc_auc: 0.954, latency: '12ms' },
  { model: 'Neural Network (MLP)', precision: 0.87, recall: 0.88, f1: 0.87, roc_auc: 0.961, latency: '8ms' },
  { model: 'Isolation Forest', precision: 0.65, recall: 0.78, f1: 0.71, roc_auc: 0.823, latency: '2ms' },
  { model: 'Logistic Regression', precision: 0.58, recall: 0.82, f1: 0.68, roc_auc: 0.812, latency: '1ms' },
];

const INITIAL_TRANSACTIONS = [
  { id: 'TXN-9021', amount: 14500.00, user: 'usr_8829', channel: 'UPI Direct', geo: 'IN-KA (Bengaluru)', riskScore: 0.94, status: 'BLOCKED', reason: 'Geographic Velocity Anomaly', time: '10s ago', ip: '103.22.18.4', device: 'Android SM-G998B' },
  { id: 'TXN-9020', amount: 45.20, user: 'usr_1029', channel: 'Card Swipe', geo: 'IN-MH (Mumbai)', riskScore: 0.04, status: 'APPROVED', reason: 'Normal Spending Pattern', time: '18s ago', ip: '49.37.12.109', device: 'iOS iPhone 14 Pro' },
  { id: 'TXN-9019', amount: 28000.00, user: 'usr_4491', channel: 'Wire Transfer', geo: 'US-NY (New York)', riskScore: 0.88, status: 'FLAGGED', reason: 'High Amount + Unrecognized Device', time: '32s ago', ip: '198.51.100.42', device: 'Chrome / Windows 11' },
  { id: 'TXN-9018', amount: 120.00, user: 'usr_3302', channel: 'Mobile App', geo: 'IN-DL (Delhi)', riskScore: 0.12, status: 'APPROVED', reason: 'Known Merchant Token', time: '45s ago', ip: '157.33.221.9', device: 'iOS iPhone 13' },
  { id: 'TXN-9017', amount: 9500.00, user: 'usr_7712', channel: 'Crypto On-Ramp', geo: 'SG-SG (Singapore)', riskScore: 0.91, status: 'BLOCKED', reason: 'Blacklisted Wallet Association', time: '1m ago', ip: '103.253.14.88', device: 'Linux x86_64' },
];

const STREAM_CHART_DATA = [
  { time: '12:00', totalVolume: 120, fraudDetected: 4 },
  { time: '12:05', totalVolume: 185, fraudDetected: 7 },
  { time: '12:10', totalVolume: 240, fraudDetected: 12 },
  { time: '12:15', totalVolume: 310, fraudDetected: 9 },
  { time: '12:20', totalVolume: 290, fraudDetected: 18 },
  { time: '12:25', totalVolume: 420, fraudDetected: 15 },
  { time: '12:30', totalVolume: 380, fraudDetected: 11 },
];

export default function ShieldAIDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [isSimulating, setIsSimulating] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ML Tuning State
  const [threshold, setThreshold] = useState(0.70);
  const [smoteRatio, setSmoteRatio] = useState(0.5);
  const [treeDepth, setTreeDepth] = useState(6);

  // Predictor state
  const [predAmount, setPredAmount] = useState(15000);
  const [predHour, setPredHour] = useState(3);
  const [predDistance, setPredDistance] = useState(450);
  const [predNewDevice, setPredNewDevice] = useState(true);
  const [predRiskScore, setPredRiskScore] = useState(0.89);

  // Live transaction simulation engine
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      const isFraud = Math.random() > 0.72;
      const calculatedRisk = isFraud 
        ? parseFloat((0.72 + Math.random() * 0.27).toFixed(2)) 
        : parseFloat((Math.random() * 0.28).toFixed(2));
      
      const newTxn = {
        id: `TXN-${Math.floor(9022 + Math.random() * 9000)}`,
        amount: parseFloat((Math.random() * 35000 + 15).toFixed(2)),
        user: `usr_${Math.floor(1000 + Math.random() * 8999)}`,
        channel: ['UPI Direct', 'Card Swipe', 'Wire Transfer', 'Crypto On-Ramp'][Math.floor(Math.random() * 4)],
        geo: ['IN-KA (Bengaluru)', 'IN-MH (Mumbai)', 'US-NY (New York)', 'UK-LDN (London)', 'SG-SG (Singapore)'][Math.floor(Math.random() * 5)],
        riskScore: calculatedRisk,
        status: calculatedRisk >= threshold ? (calculatedRisk > 0.85 ? 'BLOCKED' : 'FLAGGED') : 'APPROVED',
        reason: calculatedRisk >= threshold ? 'Anomaly Score Threshold Exceeded' : 'Normal Behavioral Pattern',
        time: 'Just now',
        ip: `${Math.floor(Math.random()*200+10)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
        device: ['Android Device', 'iOS Device', 'Windows Desktop', 'macOS Station'][Math.floor(Math.random() * 4)]
      };
      setTransactions(prev => [newTxn, ...prev.slice(0, 11)]);
    }, 3500);
    return () => clearInterval(interval);
  }, [isSimulating, threshold]);

  // Handle status modification manually
  const updateTxnStatus = (id, newStatus) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTxn && selectedTxn.id === id) {
      setSelectedTxn(prev => ({ ...prev, status: newStatus }));
    }
  };

  // Filtered transactions calculation
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.channel.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.geo.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchQuery, statusFilter]);

  // Recalculate ML Risk Predictor
  const handleRecalculateRisk = () => {
    let baseScore = 0.08;
    if (predAmount > 10000) baseScore += 0.35;
    if (predHour >= 1 && predHour <= 4) baseScore += 0.25;
    if (predDistance > 200) baseScore += 0.20;
    if (predNewDevice) baseScore += 0.12;
    setPredRiskScore(Math.min(0.99, parseFloat(baseScore.toFixed(2))));
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-[#0c111d]/90 backdrop-blur sticky top-0 z-40 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight">ShieldAI Enterprise</h1>
            <p className="text-[11px] text-slate-400 font-medium">Real-Time Risk Intelligence Engine</p>
          </div>
        </div>

        <nav className="flex items-center space-x-1 bg-[#04060c] p-1 rounded-xl border border-slate-800/80">
          {[
            { id: 'overview', label: 'Live Monitor', icon: Activity },
            { id: 'ml-benchmarks', label: 'ML Workbench', icon: BarChart3 },
            { id: 'predictor', label: 'Risk Predictor', icon: Zap },
            { id: 'database', label: 'DB Schema', icon: Database },
            { id: 'app-convert', label: 'Mobile Setup', icon: Smartphone },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isSimulating
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span>{isSimulating ? 'Engine Streaming' : 'Engine Paused'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: LIVE MONITOR */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Transactions Scanned', value: '1,420,890', sub: '+12.4% vs last hour', icon: Activity, accent: 'border-t-indigo-500', color: 'text-indigo-400' },
                { title: 'Prevented Fraud Loss', value: '₹42,85,100', sub: 'Saved across 182 attacks', icon: ShieldCheck, accent: 'border-t-emerald-500', color: 'text-emerald-400' },
                { title: 'Detection Precision', value: '94.2%', sub: 'XGBoost + SMOTE Pipeline', icon: Cpu, accent: 'border-t-cyan-500', color: 'text-cyan-400' },
                { title: 'Inference Latency', value: '3.8 ms', sub: 'Sub-5ms SLA guarantee', icon: Zap, accent: 'border-t-amber-500', color: 'text-amber-400' },
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div key={idx} className={`bg-[#0d1322]/80 border border-slate-800/80 border-t-2 ${kpi.accent} rounded-2xl p-5 flex flex-col justify-between shadow-sm`}>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-slate-400">{kpi.title}</span>
                      <Icon className={kpi.color} size={18} />
                    </div>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-white tracking-tight font-mono">{kpi.value}</span>
                      <p className="text-[11px] text-slate-500 mt-1">{kpi.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Realtime Stream Graph */}
            <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-semibold text-sm text-slate-200">Real-Time Payment Volume vs Flagged Anomalies</h3>
                  <p className="text-xs text-slate-400">Monitoring card, UPI, wire, and crypto settlement rails</p>
                </div>
                <span className="text-xs text-indigo-400 flex items-center space-x-1.5 self-start">
                  <RefreshCw size={13} className={`text-indigo-400 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span className="font-mono text-[11px]">{isSimulating ? 'LIVE STREAMING' : 'PAUSED'}</span>
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={STREAM_CHART_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#070a12', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="totalVolume" name="Volume" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="fraudDetected" name="Anomalies" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interactive Live Stream Table */}
            <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction Stream</h3>
                  <p className="text-sm font-semibold text-slate-200">Live Risk Inference Stream</p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID, User, Channel, Geo"
                      className="bg-[#04060c] border border-slate-800 text-xs text-slate-200 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 w-52 transition"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#04060c] border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">All Decisions</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="FLAGGED">Flagged</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-800/80 font-semibold text-[10px]">
                    <tr>
                      <th className="pb-3 pl-2">Transaction ID</th>
                      <th className="pb-3">User ID</th>
                      <th className="pb-3 font-mono">Amount</th>
                      <th className="pb-3">Channel</th>
                      <th className="pb-3">Geo Origin</th>
                      <th className="pb-3 font-mono">Risk Score</th>
                      <th className="pb-3">Decision</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredTransactions.map((txn) => (
                      <tr 
                        key={txn.id} 
                        onClick={() => setSelectedTxn(txn)}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                      >
                        <td className="py-3 pl-2 font-mono font-medium text-slate-200">{txn.id}</td>
                        <td className="py-3 font-mono text-slate-400">{txn.user}</td>
                        <td className="py-3 font-semibold text-slate-100 font-mono">₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 text-slate-400">{txn.channel}</td>
                        <td className="py-3 text-slate-400">{txn.geo}</td>
                        <td className="py-3 font-mono font-bold">
                          <span className={txn.riskScore >= threshold ? 'text-red-400' : 'text-emerald-400'}>
                            {(txn.riskScore * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase ${
                            txn.status === 'BLOCKED' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                            txn.status === 'FLAGGED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                            'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2 space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => updateTxnStatus(txn.id, 'BLOCKED')}
                            className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-medium transition"
                          >
                            Block
                          </button>
                          <button
                            onClick={() => updateTxnStatus(txn.id, 'APPROVED')}
                            className="px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium transition"
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ML BENCHMARKS & WORKBENCH */}
        {activeTab === 'ml-benchmarks' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Retraining Hyperparameters */}
              <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-sm text-slate-200 flex items-center space-x-2">
                  <Sliders size={16} className="text-indigo-400" />
                  <span>Model Calibration & Tuning</span>
                </h3>
                <p className="text-xs text-slate-400">Adjust active inference thresholds and synthetic sampling parameters across the pipeline.</p>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Decision Risk Cutoff Threshold:</span>
                      <span className="font-mono text-indigo-400 font-bold">{(threshold * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.40"
                      max="0.95"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>SMOTE Oversampling Ratio:</span>
                      <span className="font-mono text-indigo-400 font-bold">{smoteRatio}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={smoteRatio}
                      onChange={(e) => setSmoteRatio(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Max Tree Depth (XGBoost):</span>
                      <span className="font-mono text-indigo-400 font-bold">{treeDepth}</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      value={treeDepth}
                      onChange={(e) => setTreeDepth(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="bg-[#04060c] p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <p className="text-slate-200 font-semibold">Active Pipeline State:</p>
                  <p>• Estimated False Positives: <strong className="text-emerald-400">{(1.2 - (threshold - 0.7) * 2).toFixed(2)}%</strong></p>
                  <p>• Target Recall: <strong className="text-indigo-400">{(89 + (0.7 - threshold) * 10).toFixed(1)}%</strong></p>
                </div>
              </div>

              {/* Evaluation Matrix Table */}
              <div className="lg:col-span-2 bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5">
                <h3 className="font-semibold text-sm text-slate-200 mb-1">Model Performance Benchmark Matrix</h3>
                <p className="text-xs text-slate-400 mb-4">Evaluated on 1,000,000 historical transactions addressing class imbalance.</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 uppercase tracking-wider border-b border-slate-800/80 font-semibold text-[10px]">
                      <tr>
                        <th className="pb-3 pl-2">Algorithm</th>
                        <th className="pb-3 font-mono">Precision</th>
                        <th className="pb-3 font-mono">Recall</th>
                        <th className="pb-3 font-mono">F1-Score</th>
                        <th className="pb-3 font-mono">ROC-AUC</th>
                        <th className="pb-3">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {MODEL_PERFORMANCE.map((m, idx) => (
                        <tr key={idx} className={idx === 0 ? 'bg-indigo-950/20 hover:bg-indigo-950/40' : 'hover:bg-slate-800/30'}>
                          <td className="py-3 pl-2 font-semibold text-slate-200 flex items-center space-x-2">
                            {idx === 0 && <span className="bg-indigo-600 text-[9px] px-1.5 py-0.5 rounded text-white font-bold uppercase">Active</span>}
                            <span>{m.model}</span>
                          </td>
                          <td className="py-3 font-mono text-slate-300">{(m.precision * 100).toFixed(1)}%</td>
                          <td className="py-3 font-mono text-slate-300">{(m.recall * 100).toFixed(1)}%</td>
                          <td className="py-3 font-mono font-bold text-indigo-400">{(m.f1 * 100).toFixed(1)}%</td>
                          <td className="py-3 font-mono text-emerald-400">{(m.roc_auc).toFixed(3)}</td>
                          <td className="py-3 font-mono text-slate-400">{m.latency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5">
              <h3 className="font-semibold text-sm text-slate-200 mb-4">Precision vs Recall Metric Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MODEL_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="model" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0.5, 1.0]} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#070a12', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend />
                    <Bar dataKey="precision" name="Precision" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recall" name="Recall" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="f1" name="F1 Score" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REALTIME PREDICTOR */}
        {activeTab === 'predictor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center space-x-2">
                <Sliders size={16} className="text-indigo-400" />
                <span>Custom Transaction Simulator</span>
              </h3>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Transaction Amount (₹)</label>
                <input
                  type="number"
                  value={predAmount}
                  onChange={(e) => setPredAmount(Number(e.target.value))}
                  className="w-full bg-[#04060c] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Time of Day (0 - 23 Hours)</label>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={predHour}
                  onChange={(e) => setPredHour(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <span className="text-xs text-slate-400 font-mono">{predHour}:00 HRS</span>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Distance from Primary Location (km)</label>
                <input
                  type="number"
                  value={predDistance}
                  onChange={(e) => setPredDistance(Number(e.target.value))}
                  className="w-full bg-[#04060c] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="newDevice"
                  checked={predNewDevice}
                  onChange={(e) => setPredNewDevice(e.target.checked)}
                  className="rounded border-slate-800 bg-[#04060c] text-indigo-600 focus:ring-0"
                />
                <label htmlFor="newDevice" className="text-xs text-slate-300 cursor-pointer">Transaction initiated from unrecognized device</label>
              </div>

              <button
                onClick={handleRecalculateRisk}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
              >
                <Zap size={14} />
                <span>Run ML Risk Inference</span>
              </button>
            </div>

            {/* Score Output & SHAP Explanation */}
            <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-200 mb-4">ML Model Risk Output</h3>

                <div className="flex flex-col items-center justify-center p-6 bg-[#04060c] rounded-2xl border border-slate-800/80">
                  <div className={`text-5xl font-black font-mono tracking-tight ${predRiskScore >= threshold ? 'text-red-400' : 'text-emerald-400'}`}>
                    {(predRiskScore * 100).toFixed(0)}%
                  </div>
                  <span className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-semibold">Calculated Fraud Probability</span>

                  <div className="mt-4">
                    {predRiskScore >= threshold ? (
                      <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-1 rounded-full font-bold uppercase flex items-center space-x-1">
                        <AlertTriangle size={14} />
                        <span>Action: BLOCK TRANSACTION</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full font-bold uppercase flex items-center space-x-1">
                        <CheckCircle size={14} />
                        <span>Action: APPROVE TRANSACTION</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">Feature Risk Contributors (SHAP Breakdown):</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>High Amount Trigger (&gt; ₹10k):</span>
                    <span className={predAmount > 10000 ? 'text-red-400 font-bold font-mono' : 'text-emerald-400 font-mono'}>{predAmount > 10000 ? '+35%' : '+0%'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Off-Peak Time Window (1 AM - 4 AM):</span>
                    <span className={predHour >= 1 && predHour <= 4 ? 'text-red-400 font-bold font-mono' : 'text-emerald-400 font-mono'}>{predHour >= 1 && predHour <= 4 ? '+25%' : '+0%'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Geographic Anomaly (&gt; 200 km):</span>
                    <span className={predDistance > 200 ? 'text-red-400 font-bold font-mono' : 'text-emerald-400 font-mono'}>{predDistance > 200 ? '+20%' : '+0%'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Unrecognized Device Fingerprint:</span>
                    <span className={predNewDevice ? 'text-red-400 font-bold font-mono' : 'text-emerald-400 font-mono'}>{predNewDevice ? '+12%' : '+0%'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DB SCHEMA */}
        {activeTab === 'database' && (
          <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm text-slate-200">Supabase / PostgreSQL Schema (DDL + RLS Policies)</h3>
                <p className="text-xs text-slate-400">Execute in your database SQL Editor to instantiate real-time tables & row-level permissions.</p>
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";...`)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-1.5 self-start"
              >
                <Code size={14} />
                <span>Copy SQL</span>
              </button>
            </div>

            <div className="bg-[#04060c] p-4 rounded-xl border border-slate-800/80 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed">
              <pre>{`-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Risk levels & Status Enums
CREATE TYPE risk_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE txn_status AS ENUM ('APPROVED', 'FLAGGED', 'BLOCKED');

-- Main Transactions Schema
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(64) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    geo_location VARCHAR(64),
    ip_address VARCHAR(45),
    device_fingerprint TEXT,
    risk_score NUMERIC(4, 3) NOT NULL,
    status txn_status DEFAULT 'APPROVED',
    primary_trigger TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fast Index for Dashboard Streaming Queries
CREATE INDEX idx_txn_risk_time ON public.transactions(risk_score DESC, created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated security analysts" 
ON public.transactions FOR SELECT TO authenticated USING (true);`}</pre>
            </div>
          </div>
        )}

        {/* TAB 5: APP CONVERSION GUIDE */}
        {activeTab === 'app-convert' && (
          <div className="bg-[#0d1322]/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-sm text-slate-200">Packaging for Mobile (Android APK / iOS)</h3>
            <p className="text-xs text-slate-400">Steps to compile this React dashboard into a mobile APK or deploy as a Progressive Web App.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#04060c] border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs">
                  <Smartphone size={16} />
                  <span>Option 1: Native Packaging via Capacitor</span>
                </div>
                <div className="bg-[#070a12] p-3 rounded-lg font-mono text-[11px] text-slate-300 space-y-1">
                  <p className="text-slate-500"># 1. Install Capacitor CLI</p>
                  <p className="text-indigo-300">npm install @capacitor/core @capacitor/cli</p>
                  <p className="text-slate-500"># 2. Initialize project</p>
                  <p className="text-indigo-300">npx cap init ShieldAI com.shieldai.app</p>
                  <p className="text-slate-500"># 3. Add Android platform & build</p>
                  <p className="text-indigo-300">npx cap add android</p>
                  <p className="text-indigo-300">npm run build && npx cap copy</p>
                </div>
              </div>

              <div className="bg-[#04060c] border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                  <Globe size={16} />
                  <span>Option 2: Progressive Web App (PWA)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Add a <code className="text-emerald-300 font-mono">public/manifest.json</code> file to enable instant "Add to Home Screen" installation on mobile devices:
                </p>
                <div className="bg-[#070a12] p-3 rounded-lg font-mono text-[11px] text-emerald-300 leading-relaxed">
                  <pre>{`{
  "short_name": "ShieldAI",
  "name": "ShieldAI Enterprise Risk",
  "start_url": "/",
  "background_color": "#070A12",
  "theme_color": "#6366f1",
  "display": "standalone"
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Transaction Audit Slide-Over Panel */}
      {selectedTxn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-[#0c111d] border-l border-slate-800/80 p-6 space-y-5 overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-sm text-white">Transaction Audit Drawer</h3>
                <p className="text-[11px] text-slate-400 font-mono">{selectedTxn.id}</p>
              </div>
              <button 
                onClick={() => setSelectedTxn(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">User ID</span>
                <span className="text-slate-200 font-mono">{selectedTxn.user}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Amount</span>
                <span className="text-slate-100 font-mono font-semibold">₹{selectedTxn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Channel</span>
                <span className="text-slate-200">{selectedTxn.channel}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">IP Address</span>
                <span className="text-slate-200 font-mono">{selectedTxn.ip}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Device Fingerprint</span>
                <span className="text-slate-200">{selectedTxn.device}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Risk Score</span>
                <span className={`font-mono font-bold ${selectedTxn.riskScore >= threshold ? 'text-red-400' : 'text-emerald-400'}`}>
                  {(selectedTxn.riskScore * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/50">
                <span className="text-slate-400">Primary Anomaly Trigger</span>
                <span className="text-amber-400 font-medium text-right">{selectedTxn.reason}</span>
              </div>
            </div>

            <div className="pt-4 flex space-x-2">
              <button
                onClick={() => updateTxnStatus(selectedTxn.id, 'BLOCKED')}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition"
              >
                Confirm Block
              </button>
              <button
                onClick={() => updateTxnStatus(selectedTxn.id, 'APPROVED')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
              >
                Approve & Whitelist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
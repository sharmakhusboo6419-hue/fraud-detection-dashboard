import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function FraudDashboard() {
  const [formData, setFormData] = useState({
    transaction_id: `tx_${Math.floor(100000 + Math.random() * 900000)}`,
    user_id: 'usr_101',
    amount: 1250.0,
    account_velocity_1h: 3,
    device_risk_score: 0.45,
    is_foreign_ip: 0,
    hour_of_day: new Date().getHours(),
  });

  const [transactions, setTransactions] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch initial transaction history from SQLite database on component load
  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  const fetchTransactionHistory = async () => {
    setFetchingHistory(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/transactions');
      if (!response.ok) throw new Error('Failed to load transaction history.');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleScreen = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          account_velocity_1h: parseInt(formData.account_velocity_1h, 10),
          device_risk_score: Number(formData.device_risk_score),
          is_foreign_ip: parseInt(formData.is_foreign_ip, 10),
          hour_of_day: parseInt(formData.hour_of_day, 10),
        }),
      });

      if (!response.ok) throw new Error('API server returned an error.');
      const data = await response.json();

      setCurrentResult(data);

      // 2. Refresh stored database transactions list
      await fetchTransactionHistory();

      // Reset transaction ID for next screening test
      setFormData((prev) => ({
        ...prev,
        transaction_id: `tx_${Math.floor(100000 + Math.random() * 900000)}`,
      }));
    } catch (err) {
      setError(err.message || 'Failed to communicate with FastAPI.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'BLOCKED':
        return <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full font-semibold text-xs">BLOCKED</span>;
      case 'REVIEW':
        return <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full font-semibold text-xs">REVIEW</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-semibold text-xs">APPROVED</span>;
    }
  };

  // Format historical chart data (reverse to chronological order for line plot)
  const chartData = [...transactions].reverse().map((t) => ({
    time: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : t.transaction_id,
    score: t.risk_score,
  }));

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">ShieldAI Risk Intelligence</h1>
          <p className="text-sm text-slate-400">Real-time XGBoost Screening & Database Audit Log</p>
        </div>
        <button 
          onClick={fetchTransactionHistory}
          className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/50 hover:bg-indigo-900/50 px-3 py-1.5 rounded-full border border-indigo-800 transition-colors"
        >
          🔄 Refresh DB Logs
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Screening Form */}
        <form onSubmit={handleScreen} className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Screen New Transaction</h2>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Transaction ID</label>
            <input
              type="text"
              name="transaction_id"
              value={formData.transaction_id}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Velocity (1h)</label>
              <input
                type="number"
                name="account_velocity_1h"
                value={formData.account_velocity_1h}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Device Risk (0-1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                name="device_risk_score"
                value={formData.device_risk_score}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Foreign IP</label>
              <select
                name="is_foreign_ip"
                value={formData.is_foreign_ip}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>No (0)</option>
                <option value={1}>Yes (1)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Evaluating & Saving...' : 'Screen Transaction'}
          </button>

          {error && <p className="text-xs text-red-400 pt-1">{error}</p>}
        </form>

        {/* Right Section: Status Badge & Trend Chart */}
        <div className="lg:col-span-7 space-y-6">
          {currentResult && (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Latest Assessment: {currentResult.transaction_id}</p>
                  <p className="text-2xl font-bold text-white mt-0.5">{currentResult.risk_score} <span className="text-sm font-normal text-slate-400">/ 100 Risk Score</span></p>
                </div>
                {getStatusBadge(currentResult.status)}
              </div>

              <div className="flex gap-2 flex-wrap pt-1">
                {currentResult.triggered_signals.length > 0 ? (
                  currentResult.triggered_signals.map((sig) => (
                    <span key={sig} className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                      {sig}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No anomalous signals detected</span>
                )}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Live Risk Score Trend (DB Records)</h2>
            <div className="h-48">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#scoreColor)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  {fetchingHistory ? 'Loading history from database...' : 'No historical data found in database.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Transaction History Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-200">Database Audit Log (Last 20 Screenings)</h2>
          <span className="text-xs text-slate-400">{transactions.length} records loaded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">User ID</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Velocity (1h)</th>
                <th className="py-2.5 px-3">Risk Score</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.map((tx) => (
                <tr key={tx.id || tx.transaction_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-indigo-300">{tx.transaction_id}</td>
                  <td className="py-2.5 px-3 text-slate-400">{tx.user_id}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-200">${tx.amount.toFixed(2)}</td>
                  <td className="py-2.5 px-3">{tx.account_velocity_1h}</td>
                  <td className="py-2.5 px-3 font-bold">{tx.risk_score} / 100</td>
                  <td className="py-2.5 px-3">{getStatusBadge(tx.status)}</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {tx.created_at ? new Date(tx.created_at).toLocaleString() : 'Just now'}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-500">
                    {fetchingHistory ? 'Loading database records...' : 'No transactions stored yet. Submit a test transaction above.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

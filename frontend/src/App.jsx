import React, { useState, useEffect, useCallback } from 'react';
import { TransactionEvaluator } from './components/TransactionEvaluator';

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHighRiskTransactions = useCallback(() => {
    fetch('http://localhost:8001/api/v1/transactions/high-risk')
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch transactions:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchHighRiskTransactions();
  }, [fetchHighRiskTransactions]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">ShieldAI Risk Intelligence Engine</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time Risk Scoring & SQLite Record Persistence</p>
        </header>

        {/* Interactive Evaluation Form */}
        <TransactionEvaluator onTransactionEvaluated={fetchHighRiskTransactions} />

        {/* Live SQLite High-Risk Records Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Live Risk Monitoring Feed (SQLite)</h2>
            <button
              onClick={fetchHighRiskTransactions}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded transition"
            >
              Refresh Table
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading database records...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4">No high-risk transactions recorded yet. Submit a high-risk evaluation above to populate!</p>
          ) : (
            <div className="divide-y divide-slate-800">
              {transactions.map((tx) => (
                <div key={tx.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-white">{tx.customer_name}</p>
                    <p className="text-xs text-slate-400">
                      •••• {tx.card_last_four} · {tx.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                        tx.status === 'Blocked'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : tx.status === 'Review'
                          ? 'bg-yellow-950 text-yellow-400 border border-yellow-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      Risk: {tx.risk_score} | {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

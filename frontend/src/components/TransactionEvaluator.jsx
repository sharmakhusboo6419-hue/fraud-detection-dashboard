import React, { useState } from 'react';

export function TransactionEvaluator({ onTransactionEvaluated }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    card_last_four: '',
    location: '',
    amount: '',
    is_foreign: false,
    failed_pin_attempts: 0,
    distance_from_home_km: 10,
    time_since_last_tx_sec: 3600
  });

  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8001/api/v1/transactions/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          failed_pin_attempts: parseInt(formData.failed_pin_attempts, 10),
          distance_from_home_km: parseFloat(formData.distance_from_home_km),
          time_since_last_tx_sec: parseFloat(formData.time_since_last_tx_sec)
        })
      });

      const data = await response.json();
      setLastResult(data.evaluation);
      setLoading(false);

      if (onTransactionEvaluated) {
        onTransactionEvaluated();
      }
    } catch (error) {
      console.error('Error evaluating transaction:', error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-6 shadow-xl mb-6">
      <h2 className="text-xl font-bold mb-1">Test Real-Time Fraud Evaluator</h2>
      <p className="text-sm text-slate-400 mb-6">
        Submit transaction parameters directly to the evaluation engine to compute risk scores and persist records in <code className="text-emerald-400">shield.db</code>.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Customer Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Alex M."
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Card Last 4 Digits</label>
          <input
            type="text"
            required
            maxLength={4}
            placeholder="e.g. 4819"
            value={formData.card_last_four}
            onChange={(e) => setFormData({ ...formData, card_last_four: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Location</label>
          <input
            type="text"
            required
            placeholder="e.g. London"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Amount ($ USD)</label>
          <input
            type="number"
            step="0.01"
            required
            placeholder="e.g. 2500.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Failed PIN Attempts</label>
          <input
            type="number"
            min="0"
            value={formData.failed_pin_attempts}
            onChange={(e) => setFormData({ ...formData, failed_pin_attempts: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center mt-6">
          <label className="flex items-center cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={formData.is_foreign}
              onChange={(e) => setFormData({ ...formData, is_foreign: e.target.checked })}
              className="mr-2 h-4 w-4 accent-emerald-500 rounded"
            />
            Foreign Transaction
          </label>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded transition duration-200"
          >
            {loading ? 'Evaluating Model Inference...' : 'Evaluate Transaction Risk'}
          </button>
        </div>
      </form>

      {lastResult && (
        <div className="mt-6 p-4 bg-slate-800 border border-slate-700 rounded-lg flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-400">ML Model Decision</p>
            <p className="text-lg font-bold text-white">
              Status: <span className={
                lastResult.status === 'Blocked' ? 'text-red-400' :
                lastResult.status === 'Review' ? 'text-yellow-400' : 'text-emerald-400'
              }>{lastResult.status}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Calculated Risk Score</p>
            <p className="text-2xl font-extrabold text-white">{lastResult.risk_score} / 100</p>
          </div>
        </div>
      )}
    </div>
  );
}

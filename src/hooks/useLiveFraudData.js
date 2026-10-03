import { useState, useEffect, useRef, useCallback } from 'react';
import { STATIC_MODEL_METRICS } from '../data/staticModelMetrics';
import { MOCK_SEED_TRANSACTIONS, MOCK_SEED_STATS } from '../data/mockTransactions';

// Resolution order for the API base:
//   1. REACT_APP_API_BASE  - set at build time (local dev)
//   2. window.__SHIELD_API__ - injected at runtime, so one deployed bundle can
//      be pointed at any backend without rebuilding (Vercel)
//   3. same origin        - backend and frontend served together
function resolveApiBase() {
  const injected =
    typeof window !== 'undefined' && window.__SHIELD_API__
      ? String(window.__SHIELD_API__)
      : null;
  const fromEnv = process.env.REACT_APP_API_BASE || null;
  if (injected) return injected.replace(/\/$/, '');
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return '';
}

const API = resolveApiBase();

// Derive the WebSocket endpoint from the same base so REST and the live feed
// can never drift apart.
function resolveWsUrl() {
  if (process.env.REACT_APP_WS_URL) return process.env.REACT_APP_WS_URL;
  if (API) {
    try {
      const u = new URL(API);
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      u.pathname = '/ws/live';
      u.search = '';
      return u.toString();
    } catch {
      /* fall through to same-origin */
    }
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/live`;
}

const WS_URL = resolveWsUrl();

async function getJson(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function getModelMetrics() {
  try {
    const res = await fetch(`${API}/api/v1/model/metrics`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.loaded) return data;
    }
  } catch {
    // Backend unreachable or returned error, try bundled static report fallback
  }

  // Fallback to static trained report bundled with app so frontend is never broken
  try {
    const staticRes = await fetch(`${process.env.PUBLIC_URL || ''}/static_model_metrics.json`);
    if (staticRes.ok) {
      const data = await staticRes.json();
      if (data && data.loaded) return data;
    }
  } catch {
    // ignore
  }

  // Reliable in-bundle fallback guaranteed to load under all static deployment scenarios
  return STATIC_MODEL_METRICS;
}

/**
 * Subscribes to the backend live feed (WebSocket) and falls back to polling
 * when the socket cannot be established, so the UI is never stuck on stale data.
 */
export function useLiveFraudData() {
  const [transactions, setTransactions] = useState(MOCK_SEED_TRANSACTIONS);
  const [stats, setStats] = useState(MOCK_SEED_STATS);
  const [feed, setFeed] = useState([]);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [model, setModel] = useState(STATIC_MODEL_METRICS);

  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const retryRef = useRef(null);
  const attemptRef = useRef(0);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const [rows, nextStats, modelInfo] = await Promise.all([
        getJson('/api/v1/transactions/high-risk?limit=50'),
        getJson('/api/v1/dashboard/stats'),
        getModelMetrics(),
      ]);
      if (!aliveRef.current) return;
      setTransactions(rows);
      setStats(nextStats);
      setModel(modelInfo);
      setError(null);
      // Never downgrade a healthy socket to "polling" just because a
      // REST call happens to finish after the WebSocket opened.
      setStatus(prev => (prev === 'live' ? prev : 'polling'));
    } catch (err) {
      if (!aliveRef.current) return;
      // In standalone frontend deployments (e.g. Vercel without a configured backend origin),
      // keep the preloaded seed data active and ensure the model metrics are rendered cleanly
      setModel(prev => prev || STATIC_MODEL_METRICS);
      setTransactions(prev => (prev && prev.length ? prev : MOCK_SEED_TRANSACTIONS));
      setStats(prev => (prev && prev.transactions_screened ? prev : MOCK_SEED_STATS));
      setError(err.message);
      setStatus(prev => (prev === 'live' ? prev : 'offline'));
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(load, 5000);
  }, [load]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!aliveRef.current) return;
    const url = WS_URL;

    let ws;
    try {
      ws = new WebSocket(url);
    } catch {
      startPolling();
      return;
    }
    wsRef.current = ws;

    let heartbeat = null;
    ws.onopen = () => {
      if (!aliveRef.current) return;
      attemptRef.current = 0;
      stopPolling();
      setStatus('live');
      setError(null);
      clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 25000);
    };

    ws.onmessage = (event) => {
      if (!aliveRef.current) return;
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'snapshot' || msg.type === 'reset') {
        setTransactions(msg.transactions || []);
        if (msg.stats) setStats(msg.stats);
        return;
      }

      if (msg.type === 'transaction' && msg.transaction) {
        // Prepend, de-dupe by id, cap the list
        setTransactions(prev => {
          const next = [msg.transaction, ...prev.filter(t => t.id !== msg.transaction.id)];
          return next.slice(0, 50);
        });
        setFeed(prev => [
          {
            id: msg.transaction.id,
            name: msg.transaction.customer_name,
            amount: msg.transaction.amount,
            location: msg.transaction.location,
            riskScore: msg.risk_score,
            status: msg.status,
            reasons: msg.reasons || [],
            at: msg.emitted_at,
          },
          ...prev,
        ].slice(0, 30));
        if (msg.stats) setStats(msg.stats);
      }
    };

    ws.onclose = () => {
      clearInterval(heartbeat);
      if (!aliveRef.current) return;
      setStatus('reconnecting');
      startPolling(); // keep data fresh while the socket retries
      const delay = Math.min(1000 * 2 ** attemptRef.current, 15000);
      attemptRef.current += 1;
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [startPolling, stopPolling]);

  useEffect(() => {
    aliveRef.current = true;
    load();
    connect();
    return () => {
      aliveRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      stopPolling();
      if (wsRef.current) wsRef.current.close(1000, 'unmount');
    };
  }, [load, connect, stopPolling]);

  const simulate = useCallback(async (count = 5) => {
    try {
      const res = await fetch(`${API}/api/v1/simulate?count=${count}`, { method: 'POST' });
      if (!res.ok) throw new Error(`simulate -> ${res.status}`);
      return await res.json();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const evaluate = useCallback(async (payload) => {
    const res = await fetch(`${API}/api/v1/transactions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`evaluate -> ${res.status}`);
    return res.json();
  }, []);

  return { transactions, stats, feed, status, error, model, reload: load, simulate, evaluate };
}

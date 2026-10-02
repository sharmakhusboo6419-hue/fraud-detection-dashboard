import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('ShieldAI dashboard', () => {
  beforeEach(() => {
    global.fetch = jest.fn((url) => {
      const body = url.includes('/stats')
        ? {
            transactions_screened: 42,
            prevented_loss: 1500.5,
            flagged: 7,
            approved: 35,
            blocked: 3,
            review: 4,
            gross_volume: 9000,
            avg_risk_score: 61.5,
            flagged_pct: 16.7,
            approved_pct: 83.3,
            series: [{ time: '10:00', volume: 5 }],
          }
        : url.includes('/model/metrics')
          ? {
              loaded: true,
              model_type: 'GradientBoostingClassifier + isotonic calibration',
              trained_at: '2026-10-02T18:23:46.756668+00:00',
              features: ['amount', 'is_foreign'],
              review_cut: 0.015546,
              block_cut: 0.023398,
              reference_stats: {
                n_reference: 200000,
                review_false_positive_rate: 0.02,
                block_false_positive_rate: 0.0025,
              },
              metrics: {
                fraud_rate: 0.00627,
                test_size: 12000,
                review_budget: 0.02,
                test: {
                  pr_auc: 0.09,
                  roc_auc: 0.7844,
                  precision: 0.0183,
                  recall: 0.6267,
                  fraud_catch_rate: 0.6267,
                  false_positive_rate: 0.211,
                  confusion_matrix: { tp: 47, fp: 2516, fn: 28, tn: 9409 },
                },
                cross_validation: { folds: 5, pr_auc: 0.1045, roc_auc: 0.7745 },
              },
            }
          : [
          {
            id: 1,
            customer_name: 'Maya K.',
            card_last_four: '4192',
            location: 'Amsterdam, NL',
            amount: 8420,
            risk_score: 94,
            status: 'Blocked',
            source: 'Stripe Webhook',
            created_at: new Date().toISOString(),
          },
        ];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the shell and all navigation tabs', () => {
    render(<App />);
    expect(screen.getByText('ShieldAI Platform')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Live Feed/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DB Schema/ })).toBeInTheDocument();
  });

  it('shows KPIs computed from the API instead of hardcoded values', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());
    expect(screen.getByText('$1,500.50')).toBeInTheDocument();
    expect(screen.getByText('61.5')).toBeInTheDocument();
  });

  it('renders a live transaction row from the API', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Maya K.')).toBeInTheDocument());
    // The card / location / source line is split across child spans.
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === '•••• 4192 · Amsterdam, NL · Stripe Webhook')
    ).toBeInTheDocument();
    expect(screen.getByText('$8,420.00')).toBeInTheDocument();
    expect(screen.getByText('94')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('never renders the old hardcoded greeting', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText('Live risk intelligence.')).toBeInTheDocument());
    expect(screen.queryByText(/Good morning, Sofia/)).not.toBeInTheDocument();
  });

  it('reports measured model metrics, not a fabricated accuracy figure', async () => {
    render(<App />);
    // 62.7% fraud catch rate comes from the held-out test set
    await waitFor(() => expect(screen.getByText('62.7%')).toBeInTheDocument());
    expect(screen.getByText('0.0900')).toBeInTheDocument();
    expect(screen.getByText('Gradient Boosting classifier')).toBeInTheDocument();
    // The old fake number must never reappear
    expect(screen.queryByText('98.6%')).not.toBeInTheDocument();
  });

  it('exposes a full model report tab', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Model/ })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Model/ })).toBeInTheDocument();
  });
});

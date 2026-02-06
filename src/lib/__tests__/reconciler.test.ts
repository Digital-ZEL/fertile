import { describe, it, expect } from 'vitest';
import { reconcile } from '@/lib/reconciler';
import type { Prediction } from '@/types';
import { generateId, getTimestamp } from '@/types';

const now = getTimestamp();

const makePrediction = (overrides: Partial<Prediction>): Prediction => ({
  id: generateId(),
  source: 'flo',
  fertileStart: '2024-01-10',
  fertileEnd: '2024-01-15',
  confidence: 80,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('reconciler', () => {
  it('reconciles overlapping predictions into a window', () => {
    const predictions = [
      makePrediction({ source: 'flo', fertileStart: '2024-01-10', fertileEnd: '2024-01-15' }),
      makePrediction({ source: 'clue', fertileStart: '2024-01-11', fertileEnd: '2024-01-16' }),
    ];

    const result = reconcile(predictions);

    expect(result).not.toBeNull();
    expect(result?.fertileStart.getTime()).toBeLessThanOrEqual(result!.fertileEnd.getTime());
    expect(result?.diagnostics.inputPredictions).toBe(2);
  });

  it('returns null when below min sources', () => {
    const predictions = [makePrediction({ source: 'flo' })];

    const result = reconcile(predictions, { minSources: 2 });

    expect(result).toBeNull();
  });

  it('falls back to weighted prediction when window is empty', () => {
    const predictions = [
      makePrediction({ source: 'flo', fertileStart: '2024-01-10', fertileEnd: '2024-01-11' }),
      makePrediction({ source: 'clue', fertileStart: '2024-02-10', fertileEnd: '2024-02-11' }),
    ];

    const result = reconcile(predictions, { minConfidenceThreshold: 0.99 });

    expect(result).not.toBeNull();
    expect(result?.explain[0]).toContain('Low confidence');
  });
});

'use client';

import { useMemo } from 'react';
import type { Prediction, PredictionSource, ISODateString } from '@/types';

/**
 * Agreement level between sources
 */
export type AgreementLevel = 'high' | 'medium' | 'low';

/**
 * Explanation of how reconciliation was done
 */
export interface ReconcileExplanation {
  factor: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

/**
 * Source contribution to final result
 */
export interface SourceContribution {
  source: PredictionSource;
  weight: number;
  agreesWithConsensus: boolean;
  deviation: number; // Days from consensus
}

/**
 * Reconciled unified fertile window
 */
export interface ReconciledWindow {
  fertileStart: ISODateString;
  fertileEnd: ISODateString;
  ovulationDate: ISODateString | null;
  confidence: number;
  agreementLevel: AgreementLevel;
  explain: ReconcileExplanation[];
  sources: SourceContribution[];
  peakDays: ISODateString[]; // Most likely conception days
}

export interface UseReconciledReturn {
  window: ReconciledWindow | null;
  isInWindow: boolean;
  daysUntilWindow: number | null;
  daysIntoWindow: number | null;
  hasMultipleSources: boolean;
}

/**
 * Source weights for reconciliation
 * Higher = more trusted
 */
const SOURCE_WEIGHTS: Record<PredictionSource, number> = {
  'natural-cycles': 1.2, // FDA-cleared, BBT-based
  'fertility-friend': 1.1, // Comprehensive charting
  clue: 1.0, // Research-backed
  flo: 0.9, // Popular but less precise
  ovia: 0.9,
  manual: 0.8,
  'fertile-algorithm': 1.0,
};

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
function formatDate(date: Date): ISODateString {
  return date.toISOString().split('T')[0];
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 */
function addDays(dateStr: string, days: number): ISODateString {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Calculate weighted median date from predictions
 */
function weightedMedianDate(
  dates: { date: string; weight: number }[]
): string {
  if (dates.length === 0) return formatDate(new Date());
  if (dates.length === 1) return dates[0].date;

  // Sort by date
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));

  // Calculate total weight
  const totalWeight = sorted.reduce((sum, d) => sum + d.weight, 0);
  const midWeight = totalWeight / 2;

  // Find median
  let cumWeight = 0;
  for (const item of sorted) {
    cumWeight += item.weight;
    if (cumWeight >= midWeight) {
      return item.date;
    }
  }

  return sorted[Math.floor(sorted.length / 2)].date;
}

/**
 * Calculate standard deviation of date differences
 */
function calculateSpread(dates: string[]): number {
  if (dates.length < 2) return 0;

  const timestamps = dates.map((d) => parseDate(d).getTime());
  const mean = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
  const variance = timestamps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timestamps.length;
  return Math.sqrt(variance) / (1000 * 60 * 60 * 24); // Convert to days
}

/**
 * Reconcile multiple predictions into one unified window
 */
function reconcilePredictions(predictions: Prediction[]): ReconciledWindow | null {
  if (predictions.length === 0) return null;

  const explain: ReconcileExplanation[] = [];

  // Single source case
  if (predictions.length === 1) {
    const p = predictions[0];
    explain.push({
      factor: 'Single Source',
      description: `Only one prediction from ${p.source}. Add more sources for higher confidence.`,
      impact: 'neutral',
    });

    const windowLength = daysBetween(p.fertileStart, p.fertileEnd);
    const midPoint = addDays(p.fertileStart, Math.floor(windowLength / 2));

    return {
      fertileStart: p.fertileStart,
      fertileEnd: p.fertileEnd,
      ovulationDate: p.ovulationDate || midPoint,
      confidence: Math.min(p.confidence * 0.8, 60), // Cap single source at 60%
      agreementLevel: 'low',
      explain,
      sources: [
        {
          source: p.source,
          weight: SOURCE_WEIGHTS[p.source],
          agreesWithConsensus: true,
          deviation: 0,
        },
      ],
      peakDays: [p.ovulationDate || midPoint],
    };
  }

  // Multiple sources - perform reconciliation
  const weights = predictions.map((p) => ({
    prediction: p,
    weight: SOURCE_WEIGHTS[p.source] * (p.confidence / 100),
  }));

  // Calculate weighted median for start date
  const startDates = weights.map((w) => ({
    date: w.prediction.fertileStart,
    weight: w.weight,
  }));
  const consensusStart = weightedMedianDate(startDates);

  // Calculate weighted median for end date
  const endDates = weights.map((w) => ({
    date: w.prediction.fertileEnd,
    weight: w.weight,
  }));
  const consensusEnd = weightedMedianDate(endDates);

  // Calculate ovulation date (if available)
  const ovulationDates = weights
    .filter((w) => w.prediction.ovulationDate)
    .map((w) => ({
      date: w.prediction.ovulationDate!,
      weight: w.weight,
    }));
  const consensusOvulation =
    ovulationDates.length > 0 ? weightedMedianDate(ovulationDates) : null;

  // Calculate agreement spread
  const startSpread = calculateSpread(predictions.map((p) => p.fertileStart));
  const endSpread = calculateSpread(predictions.map((p) => p.fertileEnd));
  const avgSpread = (startSpread + endSpread) / 2;

  // Determine agreement level
  let agreementLevel: AgreementLevel;
  if (avgSpread <= 1) {
    agreementLevel = 'high';
    explain.push({
      factor: 'Strong Agreement',
      description: `All ${predictions.length} sources agree within 1 day.`,
      impact: 'positive',
    });
  } else if (avgSpread <= 3) {
    agreementLevel = 'medium';
    explain.push({
      factor: 'Moderate Agreement',
      description: `Sources vary by ${avgSpread.toFixed(1)} days on average.`,
      impact: 'neutral',
    });
  } else {
    agreementLevel = 'low';
    explain.push({
      factor: 'Low Agreement',
      description: `Sources vary by ${avgSpread.toFixed(1)} days. Review individual predictions.`,
      impact: 'negative',
    });
  }

  // Calculate source contributions
  const sources: SourceContribution[] = weights.map((w) => {
    const startDev = Math.abs(daysBetween(w.prediction.fertileStart, consensusStart));
    const endDev = Math.abs(daysBetween(w.prediction.fertileEnd, consensusEnd));
    const avgDev = (startDev + endDev) / 2;

    return {
      source: w.prediction.source,
      weight: w.weight,
      agreesWithConsensus: avgDev <= 2,
      deviation: avgDev,
    };
  });

  // Calculate confidence based on multiple factors
  const agreementBonus = agreementLevel === 'high' ? 20 : agreementLevel === 'medium' ? 10 : 0;
  const sourceCountBonus = Math.min(predictions.length * 5, 20);
  const avgSourceConfidence =
    predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;
  const baseConfidence = avgSourceConfidence * 0.6 + agreementBonus + sourceCountBonus;
  const confidence = Math.min(Math.round(baseConfidence), 95);

  explain.push({
    factor: 'Source Count',
    description: `${predictions.length} sources increase reliability (+${sourceCountBonus}% confidence).`,
    impact: 'positive',
  });

  // Find peak fertility days (center of window, typically 2-3 days before ovulation)
  const windowMidpoint = addDays(
    consensusStart,
    Math.floor(daysBetween(consensusStart, consensusEnd) / 2)
  );
  const peakDays: ISODateString[] = [];
  if (consensusOvulation) {
    // Peak is 1-2 days before ovulation
    peakDays.push(addDays(consensusOvulation, -2));
    peakDays.push(addDays(consensusOvulation, -1));
    peakDays.push(consensusOvulation);
  } else {
    peakDays.push(windowMidpoint);
  }

  return {
    fertileStart: consensusStart,
    fertileEnd: consensusEnd,
    ovulationDate: consensusOvulation,
    confidence,
    agreementLevel,
    explain,
    sources,
    peakDays,
  };
}

/**
 * Hook to get reconciled fertile window from multiple predictions
 */
export function useReconciled(predictions: Prediction[]): UseReconciledReturn {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filter to active predictions (not in the past)
  const activePredictions = useMemo(
    () => predictions.filter((p) => p.fertileEnd >= today),
    [predictions, today]
  );

  // Reconcile predictions
  const window = useMemo(
    () => reconcilePredictions(activePredictions),
    [activePredictions]
  );

  // Calculate relationship to today
  const isInWindow = useMemo(() => {
    if (!window) return false;
    return today >= window.fertileStart && today <= window.fertileEnd;
  }, [window, today]);

  const daysUntilWindow = useMemo(() => {
    if (!window) return null;
    if (today >= window.fertileStart) return null;
    return daysBetween(today, window.fertileStart);
  }, [window, today]);

  const daysIntoWindow = useMemo(() => {
    if (!window || !isInWindow) return null;
    return daysBetween(window.fertileStart, today);
  }, [window, isInWindow, today]);

  const hasMultipleSources = activePredictions.length > 1;

  return {
    window,
    isInWindow,
    daysUntilWindow,
    daysIntoWindow,
    hasMultipleSources,
  };
}

export { reconcilePredictions };

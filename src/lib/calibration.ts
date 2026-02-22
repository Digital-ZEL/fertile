import type { PredictionSource } from '@/types';

export type SourceCalibration = Record<PredictionSource, number>;

const KEY = 'fertile:source-calibration';
const LAST_CHANGE_KEY = 'fertile:last-calibration-change';

export const DEFAULT_CALIBRATION: SourceCalibration = {
  'natural-cycles': 0,
  'fertility-friend': 0,
  'fertile-algorithm': 0,
  flo: 0,
  clue: 0,
  ovia: 0,
  manual: 0,
};

function hasStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getCalibration(): SourceCalibration {
  if (!hasStorage()) return DEFAULT_CALIBRATION;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CALIBRATION;
    return { ...DEFAULT_CALIBRATION, ...(JSON.parse(raw) as Partial<SourceCalibration>) };
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

export interface CalibrationChange {
  source: PredictionSource | 'all';
  previous: number;
  next: number;
  at: string;
}

export function setCalibration(next: SourceCalibration): void {
  if (!hasStorage()) return;
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function setLastCalibrationChange(change: CalibrationChange): void {
  if (!hasStorage()) return;
  localStorage.setItem(LAST_CHANGE_KEY, JSON.stringify(change));
}

export function getLastCalibrationChange(): CalibrationChange | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(LAST_CHANGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalibrationChange;
  } catch {
    return null;
  }
}

export function adjustSource(source: PredictionSource, delta: number): SourceCalibration {
  const current = getCalibration();
  const nextVal = Math.max(-0.3, Math.min(0.3, (current[source] ?? 0) + delta));
  const next = { ...current, [source]: Number(nextVal.toFixed(2)) };
  setCalibration(next);
  setLastCalibrationChange({
    source,
    previous: current[source] ?? 0,
    next: next[source],
    at: new Date().toISOString(),
  });
  return next;
}

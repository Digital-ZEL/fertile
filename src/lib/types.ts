/**
 * Fertility Friend Import types
 * These types are specific to the FF CSV import process
 */

import type { Observation, CervicalMucusType, OPKResult } from '@/types';

export type FFCervicalMucus = 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite' | 'unknown';

export type FFOPKResult = 'negative' | 'positive' | 'peak' | 'unknown';

/**
 * Raw observation data from FF CSV before transformation
 */
export interface FFRawObservation {
  date: string; // ISO date format YYYY-MM-DD
  temp?: number; // Basal body temperature in Fahrenheit
  cervicalMucus?: FFCervicalMucus;
  opk?: FFOPKResult;
  intercourse?: boolean;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  observations: FFRawObservation[];
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportWarning {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ParsedCSVRow {
  Date?: string;
  Temp?: string;
  'Cervical Fluid'?: string;
  CF?: string;
  OPK?: string;
  Intercourse?: string;
  Notes?: string;
  [key: string]: string | undefined;
}

/**
 * Map FF cervical mucus to app cervical mucus type
 */
export function mapFFCervicalMucus(ffCM: FFCervicalMucus): CervicalMucusType {
  const map: Record<FFCervicalMucus, CervicalMucusType> = {
    dry: 'dry',
    sticky: 'sticky',
    creamy: 'creamy',
    watery: 'watery',
    eggwhite: 'egg-white',
    unknown: 'dry', // default fallback
  };
  return map[ffCM];
}

/**
 * Map FF OPK result to app OPK result type
 */
export function mapFFOPKResult(ffOPK: FFOPKResult): OPKResult {
  const map: Record<FFOPKResult, OPKResult> = {
    negative: 'negative',
    positive: 'positive',
    peak: 'positive', // peak is still positive
    unknown: 'invalid',
  };
  return map[ffOPK];
}

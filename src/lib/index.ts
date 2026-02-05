/**
 * Fertile Library Exports
 *
 * Core algorithms and utilities for fertility prediction.
 */

// Reconciler Engine
export {
  reconcile,
  DEFAULT_WEIGHTS,
  type SourceWeights,
  type DayScore,
  type ReconciledPrediction,
  type ReconcilerOptions,
} from './reconciler';

// Predictors
export {
  predictFromCalendar,
  predictMultipleCycles,
  predictFromSymptoms,
  detectBBTShift,
  predictCombined,
  assessPredictionQuality,
  type CalendarPredictorOptions,
  type SymptomPredictorOptions,
  type CombinedPredictorOptions,
  type CombinedPredictionInput,
  type PredictionQuality,
} from './predictors';

// Database
export { FertileDB } from './db';

// FF Import
export {
  parseFFCSV as parseFFExport,
  convertToObservations as transformToObservations,
} from './ff-import';
export type { FFRawObservation, ImportResult, ImportError, ImportWarning } from './types';

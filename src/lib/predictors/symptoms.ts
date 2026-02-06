/**
 * Symptom-based Fertility Predictor
 *
 * Uses cervical mucus and OPK observations to predict fertility.
 * This is more accurate than calendar alone because it tracks
 * actual physiological changes.
 *
 * Key indicators:
 * - Cervical mucus progression: dry → sticky → creamy → watery → egg-white
 * - OPK: positive indicates LH surge, ovulation in 12-36 hours
 * - BBT: rise after ovulation confirms it happened (not predictive)
 */

import type {
  Prediction,
  ISODateString,
  Observation,
  CervicalMucusObservation,
  OPKObservation,
  BBTObservation,
  CervicalMucusType,
} from '@/types';
import { generateId, getTimestamp } from '@/types';

/**
 * Fertility score for cervical mucus types
 * Higher = more fertile
 */
const CM_FERTILITY_SCORES: Record<CervicalMucusType, number> = {
  dry: 0,
  sticky: 1,
  creamy: 2,
  watery: 4,
  'egg-white': 5,
  spotting: 1,
};

/**
 * Symptom predictor options
 */
export interface SymptomPredictorOptions {
  /**
   * Minimum CM score to consider fertile
   */
  minCMScore?: number;

  /**
   * Days before OPK positive to include in window
   */
  daysBeforeOPK?: number;

  /**
   * Days after OPK positive to include in window
   */
  daysAfterOPK?: number;

  /**
   * Weight for CM observations
   */
  cmWeight?: number;

  /**
   * Weight for OPK observations
   */
  opkWeight?: number;
}

const DEFAULT_OPTIONS: Required<SymptomPredictorOptions> = {
  minCMScore: 3, // watery or egg-white
  daysBeforeOPK: 2,
  daysAfterOPK: 2,
  cmWeight: 0.6,
  opkWeight: 0.9,
};

/**
 * Parse date string
 */
function parseDate(dateStr: ISODateString): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Format date to ISO string
 */
function formatDate(date: Date): ISODateString {
  return date.toISOString().split('T')[0];
}

/**
 * Add days to a date
 */
function addDays(dateStr: ISODateString, days: number): ISODateString {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Day fertility data
 */
interface DayFertilityData {
  date: ISODateString;
  cmScore: number;
  cmType?: CervicalMucusType;
  hasOPKPositive: boolean;
  bbt?: number;
  fertilityScore: number;
}

/**
 * Analyze observations and score each day's fertility
 */
function analyzeDays(
  observations: Observation[],
  options: Required<SymptomPredictorOptions>
): DayFertilityData[] {
  // Group observations by date
  const byDate = new Map<string, Observation[]>();

  for (const obs of observations) {
    const existing = byDate.get(obs.date) || [];
    existing.push(obs);
    byDate.set(obs.date, existing);
  }

  const dayData: DayFertilityData[] = [];

  for (const [date, obs] of byDate) {
    const cmObs = obs.find((o) => o.type === 'cervical-mucus') as
      | CervicalMucusObservation
      | undefined;
    const opkObs = obs.find((o) => o.type === 'opk') as OPKObservation | undefined;
    const bbtObs = obs.find((o) => o.type === 'bbt') as BBTObservation | undefined;

    const cmScore = cmObs ? CM_FERTILITY_SCORES[cmObs.value] : 0;
    const hasOPKPositive = opkObs?.value === 'positive';

    // Calculate fertility score for this day
    let fertilityScore = 0;

    // CM contribution
    fertilityScore += (cmScore / 5) * options.cmWeight;

    // OPK contribution
    if (hasOPKPositive) {
      fertilityScore += options.opkWeight;
    }

    dayData.push({
      date,
      cmScore,
      cmType: cmObs?.value,
      hasOPKPositive,
      bbt: bbtObs?.value,
      fertilityScore: Math.min(1, fertilityScore),
    });
  }

  // Sort by date
  dayData.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());

  return dayData;
}

/**
 * Find the fertile window from symptom data
 */
function findFertileWindow(
  dayData: DayFertilityData[],
  options: Required<SymptomPredictorOptions>
): { start: ISODateString | null; end: ISODateString | null; peak: ISODateString | null } {
  if (dayData.length === 0) {
    return { start: null, end: null, peak: null };
  }

  // Find OPK positive days (strongest indicator)
  const opkPositiveDays = dayData.filter((d) => d.hasOPKPositive);

  // Find high CM days
  const highCMDays = dayData.filter((d) => d.cmScore >= options.minCMScore);

  // If we have OPK positive, build window around it
  if (opkPositiveDays.length > 0) {
    // Use first OPK positive as the reference point
    const opkDay = opkPositiveDays[0];
    const start = addDays(opkDay.date, -options.daysBeforeOPK);
    const end = addDays(opkDay.date, options.daysAfterOPK);

    // Peak is the day after OPK positive (when ovulation likely occurs)
    const peak = addDays(opkDay.date, 1);

    return { start, end, peak };
  }

  // No OPK data - use CM progression
  if (highCMDays.length > 0) {
    // Find the peak CM day (egg-white or highest score)
    const peakDay = highCMDays.reduce(
      (best, day) => (day.cmScore > best.cmScore ? day : best),
      highCMDays[0]
    );

    // Build window around CM peak
    // Fertile window starts when CM gets watery/egg-white
    // and extends 2 days after peak
    const start = highCMDays[0].date;
    const end = addDays(peakDay.date, 2);
    const peak = addDays(peakDay.date, 1); // Ovulation likely day after peak CM

    return { start, end, peak };
  }

  return { start: null, end: null, peak: null };
}

/**
 * Calculate confidence based on data quality
 */
function calculateConfidence(dayData: DayFertilityData[], hasOPK: boolean, hasCM: boolean): number {
  let confidence = 40; // Base

  // OPK is highly accurate
  if (hasOPK) {
    confidence += 35;
  }

  // CM adds value
  if (hasCM) {
    confidence += 15;
  }

  // More data points = more confidence
  if (dayData.length >= 10) {
    confidence += 10;
  } else if (dayData.length >= 5) {
    confidence += 5;
  }

  // Both OPK and CM together are very reliable
  if (hasOPK && hasCM) {
    confidence += 10;
  }

  return Math.min(95, confidence);
}

/**
 * Generate a symptom-based prediction
 *
 * @param observations - Array of observations (CM, OPK, BBT)
 * @param cycleStartDate - Start of current cycle (optional, for context)
 * @param options - Prediction options
 */
export function predictFromSymptoms(
  observations: Observation[],
  cycleStartDate?: ISODateString,
  options: SymptomPredictorOptions = {}
): Prediction | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Filter to relevant observation types
  const relevantObs = observations.filter((o) => ['cervical-mucus', 'opk', 'bbt'].includes(o.type));

  if (relevantObs.length === 0) {
    return null;
  }

  // Analyze days
  const dayData = analyzeDays(relevantObs, opts);

  // Find fertile window
  const window = findFertileWindow(dayData, opts);

  if (!window.start || !window.end) {
    return null; // Not enough data to predict
  }

  // Check what data we have
  const hasOPK = dayData.some((d) => d.hasOPKPositive);
  const hasCM = dayData.some((d) => d.cmScore >= opts.minCMScore);

  // Calculate confidence
  const confidence = calculateConfidence(dayData, hasOPK, hasCM);

  const now = getTimestamp();

  // Build notes
  const notes: string[] = [];
  if (hasOPK) notes.push('OPK positive detected');
  if (hasCM) {
    const peakCM = dayData.reduce((best, d) => (d.cmScore > best.cmScore ? d : best), dayData[0]);
    notes.push(`Peak CM: ${peakCM.cmType}`);
  }

  return {
    id: generateId(),
    source: 'fertility-friend', // Symptom-based is similar to FF method
    fertileStart: window.start,
    fertileEnd: window.end,
    ovulationDate: window.peak ?? undefined,
    confidence,
    cycleId: undefined,
    notes: `Symptom-based: ${notes.join(', ')}`,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Detect BBT shift (confirms ovulation occurred)
 *
 * A sustained rise of 0.2°F or more for 3+ days indicates ovulation
 */
export function detectBBTShift(
  observations: BBTObservation[]
): { shiftDate: ISODateString; confirmed: boolean } | null {
  if (observations.length < 6) {
    return null; // Need enough data
  }

  // Sort by date
  const sorted = [...observations].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  );

  // Calculate baseline (first 6 temps average, excluding highest)
  const baseline = sorted.slice(0, 6);
  baseline.sort((a, b) => a.value - b.value);
  const baselineAvg = baseline.slice(0, 5).reduce((sum, o) => sum + o.value, 0) / 5;

  // Look for sustained rise
  for (let i = 6; i < sorted.length - 2; i++) {
    const day1 = sorted[i];
    const day2 = sorted[i + 1];
    const day3 = sorted[i + 2];

    // Check if all 3 days are elevated
    const threshold = baselineAvg + 0.2;
    if (day1.value >= threshold && day2.value >= threshold && day3.value >= threshold) {
      return {
        shiftDate: day1.date,
        confirmed: true,
      };
    }
  }

  return null;
}

const symptomPredictor = {
  predict: predictFromSymptoms,
  detectBBTShift,
};

export default symptomPredictor;

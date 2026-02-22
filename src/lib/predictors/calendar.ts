/**
 * Calendar-based Fertility Predictor
 *
 * Uses the standard calendar method:
 * - Ovulation typically occurs 14 days before the next period
 * - Fertile window is ovulation day ± 2-5 days
 *
 * This is the most basic method and least accurate alone,
 * but provides a good baseline when combined with other methods.
 */

import type { Cycle, Prediction, ISODateString } from '@/types';
import { generateId, getTimestamp } from '@/types';

/**
 * Calendar prediction options
 */
export interface CalendarPredictorOptions {
  /**
   * Days before ovulation that are considered fertile
   * Sperm can survive up to 5 days
   */
  daysBeforeOvulation?: number;

  /**
   * Days after ovulation that are considered fertile
   * Egg survives 12-24 hours, but we add buffer
   */
  daysAfterOvulation?: number;

  /**
   * Luteal phase length (days from ovulation to next period)
   * Standard is 14, but can range 10-16
   */
  lutealPhaseLength?: number;

  /**
   * Confidence adjustment based on cycle regularity
   */
  regularityBonus?: number;
}

const DEFAULT_OPTIONS: Required<CalendarPredictorOptions> = {
  daysBeforeOvulation: 5,
  daysAfterOvulation: 1,
  lutealPhaseLength: 14,
  regularityBonus: 10,
};

/**
 * Add days to a date string
 */
function addDays(dateStr: ISODateString, days: number): ISODateString {
  const date = new Date(dateStr + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate cycle length variability (standard deviation)
 */
function calculateCycleVariability(cycles: Cycle[]): number {
  if (cycles.length < 2) return 5; // High variability if not enough data

  const lengths = cycles.map((c) => c.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;

  return Math.sqrt(variance);
}

/**
 * Calculate average cycle length
 */
function calculateAverageCycleLength(cycles: Cycle[]): number {
  if (cycles.length === 0) return 28; // Default

  const totalLength = cycles.reduce((sum, c) => sum + c.length, 0);
  return Math.round(totalLength / cycles.length);
}

/**
 * Generate a calendar-based prediction
 *
 * @param currentCycleStart - Start date of current cycle (first day of period)
 * @param historicalCycles - Past cycles for calculating average length
 * @param options - Prediction options
 */
export function predictFromCalendar(
  currentCycleStart: ISODateString,
  historicalCycles: Cycle[] = [],
  options: CalendarPredictorOptions = {}
): Prediction {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Calculate expected cycle length
  const avgCycleLength = calculateAverageCycleLength(historicalCycles);
  const variability = calculateCycleVariability(historicalCycles);

  // Predict ovulation day (cycle length - luteal phase)
  const ovulationDay = avgCycleLength - opts.lutealPhaseLength;

  // Calculate fertile window
  const fertileStartDay = ovulationDay - opts.daysBeforeOvulation;
  const fertileEndDay = ovulationDay + opts.daysAfterOvulation;

  // Convert to dates
  const ovulationDate = addDays(currentCycleStart, ovulationDay);
  const fertileStart = addDays(currentCycleStart, fertileStartDay);
  const fertileEnd = addDays(currentCycleStart, fertileEndDay);

  // Calculate confidence
  // Base: 55% (calendar method alone is ~75-80% accurate at best)
  // Reduced by variability, increased by regularity
  let confidence = 55;

  // More historical data = more confidence
  if (historicalCycles.length >= 6) {
    confidence += 10;
  } else if (historicalCycles.length >= 3) {
    confidence += 5;
  }

  // Regular cycles = more confidence
  if (variability <= 2) {
    confidence += opts.regularityBonus;
  } else if (variability <= 4) {
    confidence += opts.regularityBonus / 2;
  } else if (variability > 6) {
    confidence -= 15; // Highly irregular cycles make calendar unreliable
  }

  // Clamp confidence
  confidence = Math.max(20, Math.min(80, confidence));

  const now = getTimestamp();

  return {
    id: generateId(),
    source: 'manual', // Calendar method is essentially "manual" calculation
    fertileStart,
    fertileEnd,
    ovulationDate,
    confidence,
    notes: `Calendar method: Based on ${historicalCycles.length} cycles, avg ${avgCycleLength} days, variability ±${variability.toFixed(1)} days`,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Predict for multiple upcoming cycles
 */
export function predictMultipleCycles(
  currentCycleStart: ISODateString,
  historicalCycles: Cycle[],
  numberOfCycles: number = 3,
  options: CalendarPredictorOptions = {}
): Prediction[] {
  const predictions: Prediction[] = [];
  const avgCycleLength = calculateAverageCycleLength(historicalCycles);

  let cycleStart = currentCycleStart;

  for (let i = 0; i < numberOfCycles; i++) {
    const prediction = predictFromCalendar(cycleStart, historicalCycles, options);

    // Reduce confidence for future cycles
    prediction.confidence = Math.max(20, prediction.confidence - i * 10);

    predictions.push(prediction);

    // Move to next cycle
    cycleStart = addDays(cycleStart, avgCycleLength);
  }

  return predictions;
}

const calendarPredictor = {
  predict: predictFromCalendar,
  predictMultiple: predictMultipleCycles,
};

export default calendarPredictor;

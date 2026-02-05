/**
 * Reconciler Engine
 *
 * The core algorithm that reconciles multiple fertility predictions
 * from different sources into ONE unified fertile window.
 *
 * Algorithm:
 * 1. Score each day by probability across all sources
 * 2. Weight sources by historical accuracy (configurable)
 * 3. Apply confidence penalties for disagreements
 * 4. Return unified window with explanations
 */

import type { Prediction, PredictionSource, ISODateString } from '@/types';

/**
 * Source weight configuration
 * Higher weight = more trusted source
 */
export interface SourceWeights {
  [source: string]: number;
}

/**
 * Default weights based on general accuracy
 */
export const DEFAULT_WEIGHTS: SourceWeights = {
  // Algorithm-based (most accurate when calibrated)
  'natural-cycles': 0.95,
  'fertility-friend': 0.90,
  'fertile-algorithm': 0.85,

  // App predictions (decent but variable)
  flo: 0.70,
  clue: 0.70,
  ovia: 0.65,

  // Manual/calendar (least accurate alone)
  manual: 0.60,
  calendar: 0.55,
  symptoms: 0.75,
};

/**
 * Day probability score
 */
export interface DayScore {
  date: ISODateString;
  probability: number; // 0..1 weighted probability
  sources: PredictionSource[];
  rawScores: { source: PredictionSource; score: number }[];
}

/**
 * Reconciled prediction output
 */
export interface ReconciledPrediction {
  fertileStart: Date;
  fertileEnd: Date;
  ovulationDate?: Date;
  confidence: number; // 0..1
  explain: string[];
  diagnostics: {
    sourceAgreement: number; // 0..1 how much sources agree
    outliers: PredictionSource[];
    weights: SourceWeights;
    dayScores: DayScore[];
    inputPredictions: number;
  };
}

/**
 * Reconciler options
 */
export interface ReconcilerOptions {
  weights?: SourceWeights;
  minConfidenceThreshold?: number; // Days below this are excluded
  disagreementPenalty?: number; // Multiplier when sources disagree
  minSources?: number; // Minimum sources required
}

const DEFAULT_OPTIONS: Required<ReconcilerOptions> = {
  weights: DEFAULT_WEIGHTS,
  minConfidenceThreshold: 0.3,
  disagreementPenalty: 0.15,
  minSources: 1,
};

/**
 * Parse ISO date string to Date object
 */
function parseDate(dateStr: ISODateString): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/**
 * Format Date to ISO date string
 */
function formatDate(date: Date): ISODateString {
  return date.toISOString().split('T')[0];
}

/**
 * Get all dates between two dates (inclusive)
 */
function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Calculate days between two dates
 */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(a.getTime() - b.getTime()) / msPerDay);
}

/**
 * Get the weight for a prediction source
 */
function getWeight(source: PredictionSource, weights: SourceWeights): number {
  return weights[source] ?? 0.5;
}

/**
 * Calculate source agreement score (0..1)
 * Higher = more agreement between sources
 */
function calculateSourceAgreement(predictions: Prediction[]): number {
  if (predictions.length <= 1) return 1;

  const starts = predictions.map((p) => parseDate(p.fertileStart).getTime());
  const ends = predictions.map((p) => parseDate(p.fertileEnd).getTime());

  const avgStart = starts.reduce((a, b) => a + b, 0) / starts.length;
  const avgEnd = ends.reduce((a, b) => a + b, 0) / ends.length;

  // Calculate variance in days
  const startVariance =
    starts.reduce((sum, s) => sum + Math.pow((s - avgStart) / (24 * 60 * 60 * 1000), 2), 0) /
    starts.length;
  const endVariance =
    ends.reduce((sum, e) => sum + Math.pow((e - avgEnd) / (24 * 60 * 60 * 1000), 2), 0) /
    ends.length;

  const avgVariance = (startVariance + endVariance) / 2;

  // Convert variance to agreement score (exponential decay)
  // 0 days variance = 1.0 agreement
  // 4 days variance = ~0.5 agreement
  // 9 days variance = ~0.25 agreement
  return Math.exp(-avgVariance / 8);
}

/**
 * Identify outlier predictions that disagree significantly
 */
function identifyOutliers(
  predictions: Prediction[],
  weights: SourceWeights
): PredictionSource[] {
  if (predictions.length <= 2) return [];

  // Calculate weighted centroid
  let totalWeight = 0;
  let weightedStartSum = 0;
  let weightedEndSum = 0;

  for (const p of predictions) {
    const weight = getWeight(p.source, weights);
    const startTime = parseDate(p.fertileStart).getTime();
    const endTime = parseDate(p.fertileEnd).getTime();

    weightedStartSum += startTime * weight;
    weightedEndSum += endTime * weight;
    totalWeight += weight;
  }

  const centroidStart = new Date(weightedStartSum / totalWeight);
  const centroidEnd = new Date(weightedEndSum / totalWeight);

  // Find predictions that deviate more than 3 days from centroid
  const outliers: PredictionSource[] = [];
  for (const p of predictions) {
    const pStart = parseDate(p.fertileStart);
    const pEnd = parseDate(p.fertileEnd);

    const startDiff = daysBetween(pStart, centroidStart);
    const endDiff = daysBetween(pEnd, centroidEnd);

    if (startDiff > 3 || endDiff > 3) {
      outliers.push(p.source);
    }
  }

  return outliers;
}

/**
 * Build day-by-day probability scores across all predictions
 */
function buildDayScores(
  predictions: Prediction[],
  weights: SourceWeights
): DayScore[] {
  if (predictions.length === 0) return [];

  // Find global date range
  let minDate = parseDate(predictions[0].fertileStart);
  let maxDate = parseDate(predictions[0].fertileEnd);

  for (const p of predictions) {
    const start = parseDate(p.fertileStart);
    const end = parseDate(p.fertileEnd);
    if (start < minDate) minDate = start;
    if (end > maxDate) maxDate = end;
  }

  // Extend range by 2 days on each side for edge detection
  const extendedMin = new Date(minDate);
  extendedMin.setDate(extendedMin.getDate() - 2);
  const extendedMax = new Date(maxDate);
  extendedMax.setDate(extendedMax.getDate() + 2);

  const allDates = getDateRange(extendedMin, extendedMax);
  const dayScores: DayScore[] = [];

  for (const date of allDates) {
    const dateStr = formatDate(date);
    const rawScores: { source: PredictionSource; score: number }[] = [];
    const sources: PredictionSource[] = [];

    for (const p of predictions) {
      const start = parseDate(p.fertileStart);
      const end = parseDate(p.fertileEnd);
      const weight = getWeight(p.source, weights);
      const sourceConfidence = (p.confidence ?? 50) / 100;

      // Check if this date is within the prediction window
      if (date >= start && date <= end) {
        // Full score within window, adjusted by source confidence
        rawScores.push({
          source: p.source,
          score: weight * sourceConfidence,
        });
        sources.push(p.source);
      } else {
        // Decay score for dates outside window (gaussian decay)
        const daysOutside = Math.min(
          daysBetween(date, start),
          daysBetween(date, end)
        );
        const decayScore = weight * sourceConfidence * Math.exp(-Math.pow(daysOutside, 2) / 2);
        if (decayScore > 0.1) {
          rawScores.push({
            source: p.source,
            score: decayScore,
          });
        }
      }
    }

    // Calculate weighted probability
    const totalWeight = predictions.reduce(
      (sum, p) => sum + getWeight(p.source, weights),
      0
    );
    const probability =
      totalWeight > 0
        ? rawScores.reduce((sum, s) => sum + s.score, 0) / totalWeight
        : 0;

    dayScores.push({
      date: dateStr,
      probability,
      sources,
      rawScores,
    });
  }

  return dayScores;
}

/**
 * Find the continuous fertile window from day scores
 */
function findFertileWindow(
  dayScores: DayScore[],
  threshold: number
): { start: Date | null; end: Date | null; peak: Date | null } {
  // Find days above threshold
  const fertileDays = dayScores.filter((d) => d.probability >= threshold);

  if (fertileDays.length === 0) {
    return { start: null, end: null, peak: null };
  }

  // Find the largest continuous window
  const sortedDays = [...fertileDays].sort(
    (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
  );

  let bestStart = 0;
  let bestLength = 1;
  let currentStart = 0;
  let currentLength = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prevDate = parseDate(sortedDays[i - 1].date);
    const currDate = parseDate(sortedDays[i].date);
    const gap = daysBetween(currDate, prevDate);

    if (gap === 1) {
      currentLength++;
    } else {
      if (currentLength > bestLength) {
        bestLength = currentLength;
        bestStart = currentStart;
      }
      currentStart = i;
      currentLength = 1;
    }
  }

  if (currentLength > bestLength) {
    bestLength = currentLength;
    bestStart = currentStart;
  }

  const windowDays = sortedDays.slice(bestStart, bestStart + bestLength);

  // Find peak (highest probability day)
  const peak = windowDays.reduce(
    (best, day) => (day.probability > best.probability ? day : best),
    windowDays[0]
  );

  return {
    start: parseDate(windowDays[0].date),
    end: parseDate(windowDays[windowDays.length - 1].date),
    peak: parseDate(peak.date),
  };
}

/**
 * Generate human-readable explanations
 */
function generateExplanations(
  predictions: Prediction[],
  dayScores: DayScore[],
  sourceAgreement: number,
  outliers: PredictionSource[],
  fertileStart: Date,
  fertileEnd: Date
): string[] {
  const explanations: string[] = [];

  // Source count
  const sourceCount = predictions.length;
  const uniqueSources = [...new Set(predictions.map((p) => p.source))];

  if (sourceCount === 1) {
    explanations.push(`Based on ${predictions[0].source} prediction only`);
  } else {
    explanations.push(
      `Reconciled from ${sourceCount} predictions (${uniqueSources.join(', ')})`
    );
  }

  // Agreement level
  if (sourceAgreement >= 0.9) {
    explanations.push('Strong agreement: All sources align closely');
  } else if (sourceAgreement >= 0.7) {
    explanations.push('Good agreement: Sources mostly align');
  } else if (sourceAgreement >= 0.5) {
    explanations.push('Moderate agreement: Some variation between sources');
  } else {
    explanations.push('Low agreement: Sources show significant variation');
  }

  // Window info
  const windowLength = daysBetween(fertileEnd, fertileStart) + 1;
  const formatDateReadable = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  explanations.push(
    `Fertile window: ${formatDateReadable(fertileStart)} - ${formatDateReadable(fertileEnd)} (${windowLength} days)`
  );

  // Outliers
  if (outliers.length > 0) {
    explanations.push(
      `Note: ${outliers.join(', ')} ${outliers.length === 1 ? 'differs' : 'differ'} significantly from consensus`
    );
  }

  // Peak fertility
  const peakDays = dayScores
    .filter((d) => d.probability >= 0.8)
    .sort((a, b) => b.probability - a.probability);
  if (peakDays.length > 0) {
    const peakDate = parseDate(peakDays[0].date);
    explanations.push(`Peak fertility: ${formatDateReadable(peakDate)}`);
  }

  return explanations;
}

/**
 * Main reconciler function
 *
 * Reconciles multiple fertility predictions into a single unified window.
 */
export function reconcile(
  predictions: Prediction[],
  options: ReconcilerOptions = {}
): ReconciledPrediction | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const weights = { ...DEFAULT_WEIGHTS, ...opts.weights };

  // Validate input
  if (predictions.length < opts.minSources) {
    return null;
  }

  // Filter out predictions with zero confidence
  const validPredictions = predictions.filter(
    (p) => (p.confidence ?? 50) > 0
  );

  if (validPredictions.length === 0) {
    return null;
  }

  // Calculate source agreement
  const sourceAgreement = calculateSourceAgreement(validPredictions);

  // Identify outliers
  const outliers = identifyOutliers(validPredictions, weights);

  // Build day scores
  const dayScores = buildDayScores(validPredictions, weights);

  // Apply disagreement penalty to threshold if sources disagree
  let effectiveThreshold = opts.minConfidenceThreshold;
  if (sourceAgreement < 0.7) {
    effectiveThreshold += opts.disagreementPenalty * (1 - sourceAgreement);
  }

  // Find fertile window
  const window = findFertileWindow(dayScores, effectiveThreshold);

  if (!window.start || !window.end) {
    // Fallback: use the most weighted prediction
    const sortedByWeight = [...validPredictions].sort(
      (a, b) => getWeight(b.source, weights) - getWeight(a.source, weights)
    );
    const best = sortedByWeight[0];
    return {
      fertileStart: parseDate(best.fertileStart),
      fertileEnd: parseDate(best.fertileEnd),
      ovulationDate: best.ovulationDate ? parseDate(best.ovulationDate) : undefined,
      confidence: Math.max(0.2, sourceAgreement * 0.5),
      explain: [
        'Low confidence: Could not reconcile predictions',
        `Falling back to ${best.source} prediction`,
      ],
      diagnostics: {
        sourceAgreement,
        outliers,
        weights,
        dayScores,
        inputPredictions: validPredictions.length,
      },
    };
  }

  // Calculate final confidence
  // Base: source agreement
  // Bonus: more sources
  // Penalty: outliers
  let confidence = sourceAgreement;
  confidence *= Math.min(1, 0.7 + validPredictions.length * 0.1); // More sources = slightly higher
  confidence *= Math.max(0.5, 1 - outliers.length * 0.1); // Outliers reduce confidence
  confidence = Math.min(1, Math.max(0, confidence));

  // Generate explanations
  const explanations = generateExplanations(
    validPredictions,
    dayScores,
    sourceAgreement,
    outliers,
    window.start,
    window.end
  );

  return {
    fertileStart: window.start,
    fertileEnd: window.end,
    ovulationDate: window.peak ?? undefined,
    confidence,
    explain: explanations,
    diagnostics: {
      sourceAgreement,
      outliers,
      weights,
      dayScores,
      inputPredictions: validPredictions.length,
    },
  };
}

export default reconcile;

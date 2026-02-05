/**
 * Combined Fertility Predictor
 *
 * Combines calendar and symptom-based predictions using
 * the reconciler engine for a unified prediction.
 *
 * This is the recommended approach for users who track
 * both cycle dates and daily symptoms.
 */

import type { Cycle, Observation, Prediction, ISODateString } from '@/types';
import { reconcile, type ReconciledPrediction, type SourceWeights } from '../reconciler';
import { predictFromCalendar } from './calendar';
import { predictFromSymptoms } from './symptoms';

/**
 * Combined predictor options
 */
export interface CombinedPredictorOptions {
  /**
   * Custom source weights
   */
  weights?: SourceWeights;

  /**
   * Whether to include calendar prediction even with good symptom data
   */
  alwaysIncludeCalendar?: boolean;

  /**
   * Minimum observations needed to use symptom predictor
   */
  minSymptomObservations?: number;
}

const DEFAULT_OPTIONS: Required<CombinedPredictorOptions> = {
  weights: {
    calendar: 0.55,
    symptoms: 0.80,
    manual: 0.60,
    'fertility-friend': 0.85,
  },
  alwaysIncludeCalendar: true,
  minSymptomObservations: 3,
};

/**
 * Combined prediction input
 */
export interface CombinedPredictionInput {
  /**
   * Current cycle start date (first day of period)
   */
  currentCycleStart: ISODateString;

  /**
   * Historical cycles for calendar calculation
   */
  historicalCycles?: Cycle[];

  /**
   * Observations for symptom-based prediction
   */
  observations?: Observation[];

  /**
   * Additional predictions from external apps
   */
  externalPredictions?: Prediction[];
}

/**
 * Generate a combined prediction using all available data
 */
export function predictCombined(
  input: CombinedPredictionInput,
  options: CombinedPredictorOptions = {}
): ReconciledPrediction | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const predictions: Prediction[] = [];

  // Generate calendar prediction
  const calendarPrediction = predictFromCalendar(
    input.currentCycleStart,
    input.historicalCycles || []
  );
  
  // Rename source for clarity
  calendarPrediction.source = 'manual'; // Calendar method is manual/basic

  if (opts.alwaysIncludeCalendar || !input.observations?.length) {
    predictions.push(calendarPrediction);
  }

  // Generate symptom prediction if we have enough data
  if (
    input.observations &&
    input.observations.length >= opts.minSymptomObservations
  ) {
    const symptomPrediction = predictFromSymptoms(
      input.observations,
      input.currentCycleStart
    );

    if (symptomPrediction) {
      predictions.push(symptomPrediction);
    }
  }

  // Add external predictions
  if (input.externalPredictions) {
    predictions.push(...input.externalPredictions);
  }

  // If we only have calendar, return it directly wrapped in reconciled format
  if (predictions.length === 1) {
    const p = predictions[0];
    return {
      fertileStart: new Date(p.fertileStart + 'T00:00:00Z'),
      fertileEnd: new Date(p.fertileEnd + 'T00:00:00Z'),
      ovulationDate: p.ovulationDate
        ? new Date(p.ovulationDate + 'T00:00:00Z')
        : undefined,
      confidence: p.confidence / 100,
      explain: [
        `Based on ${p.source} prediction only`,
        p.notes || '',
      ].filter(Boolean),
      diagnostics: {
        sourceAgreement: 1,
        outliers: [],
        weights: opts.weights,
        dayScores: [],
        inputPredictions: 1,
      },
    };
  }

  // Reconcile all predictions
  return reconcile(predictions, { weights: opts.weights });
}

/**
 * Get prediction quality assessment
 */
export interface PredictionQuality {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  recommendations: string[];
}

/**
 * Assess the quality of available data and predictions
 */
export function assessPredictionQuality(
  input: CombinedPredictionInput
): PredictionQuality {
  const factors: PredictionQuality['factors'] = [];
  const recommendations: string[] = [];
  let score = 50; // Base score

  // Assess historical cycle data
  const cycleCount = input.historicalCycles?.length || 0;
  if (cycleCount >= 6) {
    factors.push({
      name: 'Historical cycles',
      impact: 'positive',
      description: `${cycleCount} cycles tracked - excellent history`,
    });
    score += 15;
  } else if (cycleCount >= 3) {
    factors.push({
      name: 'Historical cycles',
      impact: 'positive',
      description: `${cycleCount} cycles tracked - good start`,
    });
    score += 8;
  } else {
    factors.push({
      name: 'Historical cycles',
      impact: 'negative',
      description: `Only ${cycleCount} cycles tracked`,
    });
    recommendations.push('Track more cycles for better calendar predictions');
    score -= 5;
  }

  // Assess cycle regularity
  if (input.historicalCycles && input.historicalCycles.length >= 3) {
    const lengths = input.historicalCycles.map((c) => c.length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 2) {
      factors.push({
        name: 'Cycle regularity',
        impact: 'positive',
        description: 'Very regular cycles (±2 days)',
      });
      score += 10;
    } else if (stdDev <= 4) {
      factors.push({
        name: 'Cycle regularity',
        impact: 'neutral',
        description: 'Moderately regular cycles',
      });
    } else {
      factors.push({
        name: 'Cycle regularity',
        impact: 'negative',
        description: 'Irregular cycles reduce prediction accuracy',
      });
      recommendations.push('Consider symptom tracking for irregular cycles');
      score -= 10;
    }
  }

  // Assess observation data
  const obsCount = input.observations?.length || 0;
  const cmObs =
    input.observations?.filter((o) => o.type === 'cervical-mucus').length || 0;
  const opkObs = input.observations?.filter((o) => o.type === 'opk').length || 0;

  if (opkObs > 0) {
    factors.push({
      name: 'OPK tracking',
      impact: 'positive',
      description: `${opkObs} OPK observations - high accuracy`,
    });
    score += 20;
  } else {
    recommendations.push('Consider using OPK tests for more accurate predictions');
  }

  if (cmObs >= 7) {
    factors.push({
      name: 'Cervical mucus tracking',
      impact: 'positive',
      description: `${cmObs} CM observations - good symptom tracking`,
    });
    score += 10;
  } else if (cmObs > 0) {
    factors.push({
      name: 'Cervical mucus tracking',
      impact: 'neutral',
      description: `${cmObs} CM observations - could track more`,
    });
    recommendations.push('Track cervical mucus daily for better symptom predictions');
    score += 3;
  } else {
    factors.push({
      name: 'Symptom tracking',
      impact: 'negative',
      description: 'No symptom observations',
    });
    recommendations.push('Start tracking cervical mucus for improved accuracy');
  }

  // Assess external predictions
  const externalCount = input.externalPredictions?.length || 0;
  if (externalCount > 0) {
    factors.push({
      name: 'External predictions',
      impact: 'positive',
      description: `${externalCount} app predictions for reconciliation`,
    });
    score += 5 * Math.min(externalCount, 3);
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine overall quality
  let overall: PredictionQuality['overall'];
  if (score >= 80) {
    overall = 'excellent';
  } else if (score >= 60) {
    overall = 'good';
  } else if (score >= 40) {
    overall = 'fair';
  } else {
    overall = 'poor';
  }

  return {
    overall,
    score,
    factors,
    recommendations,
  };
}

export default {
  predict: predictCombined,
  assessQuality: assessPredictionQuality,
};

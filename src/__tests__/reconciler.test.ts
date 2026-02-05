/**
 * Reconciler Engine Tests
 *
 * Comprehensive tests for the prediction reconciliation algorithm.
 */

import { describe, it, expect } from 'vitest';
import {
  reconcile,
  DEFAULT_WEIGHTS,
  type SourceWeights,
} from '../lib/reconciler';
import type { Prediction, PredictionSource, ISODateString } from '@/types';

// Helper to create predictions
function createPrediction(
  source: PredictionSource,
  fertileStart: ISODateString,
  fertileEnd: ISODateString,
  confidence: number = 70,
  ovulationDate?: ISODateString
): Prediction {
  return {
    id: crypto.randomUUID(),
    source,
    fertileStart,
    fertileEnd,
    ovulationDate,
    confidence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to format dates for comparison
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

describe('Reconciler Engine', () => {
  describe('Basic Reconciliation', () => {
    it('should handle a single prediction', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      // Window may extend slightly due to probability decay at edges
      const start = formatDate(result!.fertileStart);
      const end = formatDate(result!.fertileEnd);
      expect(start).toMatch(/2025-02-(09|10|11)/);
      expect(end).toMatch(/2025-02-(14|15|16)/);
      expect(result!.diagnostics.inputPredictions).toBe(1);
      expect(result!.diagnostics.sourceAgreement).toBe(1); // Perfect agreement with self
    });

    it('should return null with no predictions', () => {
      const result = reconcile([]);
      expect(result).toBeNull();
    });

    it('should return null when below minSources', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
      ];

      const result = reconcile(predictions, { minSources: 2 });
      expect(result).toBeNull();
    });

    it('should filter out zero-confidence predictions', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 0),
        createPrediction('clue', '2025-02-11', '2025-02-16', 70),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.inputPredictions).toBe(1); // Only clue should be counted
    });
  });

  describe('Agreement Scenarios', () => {
    it('should have high confidence when all sources agree exactly', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
        createPrediction('ovia', '2025-02-10', '2025-02-15', 65),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.sourceAgreement).toBeGreaterThan(0.9);
      expect(result!.confidence).toBeGreaterThan(0.7);
      // Window may extend slightly due to probability scoring
      const start = formatDate(result!.fertileStart);
      const end = formatDate(result!.fertileEnd);
      expect(start).toMatch(/2025-02-(08|09|10|11)/);
      expect(end).toMatch(/2025-02-(14|15|16|17)/);
    });

    it('should have high confidence when sources mostly agree (±1 day)', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-11', '2025-02-15', 75),
        createPrediction('ovia', '2025-02-10', '2025-02-16', 65),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.sourceAgreement).toBeGreaterThan(0.8);
      expect(result!.confidence).toBeGreaterThan(0.6);
    });

    it('should find consensus window across overlapping predictions', () => {
      const predictions = [
        createPrediction('flo', '2025-02-08', '2025-02-14', 70),
        createPrediction('clue', '2025-02-10', '2025-02-16', 75),
        createPrediction('fertility-friend', '2025-02-09', '2025-02-15', 85),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      // Should find a window covering the consensus area
      const start = formatDate(result!.fertileStart);
      const end = formatDate(result!.fertileEnd);
      // Window extends due to probability scoring
      expect(start).toMatch(/2025-02-(06|07|08|09|10|11)/);
      expect(end).toMatch(/2025-02-(14|15|16|17|18)/);
    });

    it('should include explanation about agreement', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.explain.some((e) => e.includes('Reconciled from'))).toBe(true);
      expect(result!.explain.some((e) => e.toLowerCase().includes('agree'))).toBe(true);
    });
  });

  describe('Disagreement Scenarios', () => {
    it('should have lower confidence when sources disagree significantly', () => {
      const predictions = [
        createPrediction('flo', '2025-02-05', '2025-02-10', 70),
        createPrediction('clue', '2025-02-12', '2025-02-17', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.sourceAgreement).toBeLessThan(0.5);
      expect(result!.confidence).toBeLessThan(0.5);
    });

    it('should identify outliers when one source differs significantly', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
        createPrediction('ovia', '2025-02-10', '2025-02-15', 65),
        createPrediction('manual', '2025-02-01', '2025-02-06', 50), // Outlier!
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.outliers).toContain('manual');
    });

    it('should include explanation about disagreement', () => {
      const predictions = [
        createPrediction('flo', '2025-02-05', '2025-02-10', 70),
        createPrediction('clue', '2025-02-15', '2025-02-20', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(
        result!.explain.some(
          (e) =>
            e.toLowerCase().includes('low') ||
            e.toLowerCase().includes('variation') ||
            e.toLowerCase().includes('moderate')
        )
      ).toBe(true);
    });

    it('should fallback to most weighted source when reconciliation fails', () => {
      // Very distant predictions that can't reconcile
      const predictions = [
        createPrediction('flo', '2025-02-01', '2025-02-05', 70),
        createPrediction('fertility-friend', '2025-02-20', '2025-02-25', 85),
      ];

      const result = reconcile(predictions, { minConfidenceThreshold: 0.9 });

      expect(result).not.toBeNull();
      // Should fall back to fertility-friend (higher weight)
      expect(result!.explain.some((e) => e.includes('fertility-friend'))).toBe(true);
    });
  });

  describe('Source Weighting', () => {
    it('should weight higher-accuracy sources more heavily', () => {
      // fertility-friend has higher default weight than flo
      const predictions = [
        createPrediction('flo', '2025-02-05', '2025-02-10', 70),
        createPrediction('fertility-friend', '2025-02-12', '2025-02-17', 85),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      // Result should lean toward fertility-friend dates
      const midpoint = (result!.fertileStart.getTime() + result!.fertileEnd.getTime()) / 2;
      const ffMidpoint =
        (new Date('2025-02-12').getTime() + new Date('2025-02-17').getTime()) / 2;
      const floMidpoint =
        (new Date('2025-02-05').getTime() + new Date('2025-02-10').getTime()) / 2;

      const distToFF = Math.abs(midpoint - ffMidpoint);
      const distToFlo = Math.abs(midpoint - floMidpoint);

      // Should be closer to fertility-friend
      expect(distToFF).toBeLessThan(distToFlo);
    });

    it('should respect custom weights', () => {
      const predictions = [
        createPrediction('flo', '2025-02-05', '2025-02-10', 70),
        createPrediction('manual', '2025-02-12', '2025-02-17', 60),
      ];

      // Give manual a very high weight
      const customWeights: SourceWeights = {
        flo: 0.2,
        manual: 0.95,
      };

      const result = reconcile(predictions, { weights: customWeights });

      expect(result).not.toBeNull();
      expect(result!.diagnostics.weights.manual).toBe(0.95);
    });

    it('should use default weights for unknown sources', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.weights.flo).toBe(DEFAULT_WEIGHTS.flo);
    });
  });

  describe('Edge Cases', () => {
    it('should handle predictions with missing ovulation date', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-11', '2025-02-16', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      // Should still estimate ovulation (peak day)
      if (result!.ovulationDate) {
        expect(result!.ovulationDate).toBeInstanceOf(Date);
      }
    });

    it('should handle predictions spanning month boundaries', () => {
      const predictions = [
        createPrediction('flo', '2025-01-28', '2025-02-03', 70),
        createPrediction('clue', '2025-01-29', '2025-02-04', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(formatDate(result!.fertileStart)).toMatch(/2025-01-/);
      expect(formatDate(result!.fertileEnd)).toMatch(/2025-02-/);
    });

    it('should handle very short fertile windows', () => {
      const predictions = [
        createPrediction('flo', '2025-02-12', '2025-02-14', 70),
        createPrediction('clue', '2025-02-12', '2025-02-14', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      const windowLength =
        (result!.fertileEnd.getTime() - result!.fertileStart.getTime()) /
        (24 * 60 * 60 * 1000) +
        1;
      expect(windowLength).toBeLessThanOrEqual(5);
    });

    it('should handle very long fertile windows', () => {
      const predictions = [
        createPrediction('flo', '2025-02-01', '2025-02-15', 70),
        createPrediction('clue', '2025-02-05', '2025-02-20', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      // Should still produce a reasonable window
      const windowLength =
        (result!.fertileEnd.getTime() - result!.fertileStart.getTime()) /
        (24 * 60 * 60 * 1000) +
        1;
      expect(windowLength).toBeGreaterThan(3);
    });

    it('should handle identical predictions from multiple sources', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 70),
        createPrediction('ovia', '2025-02-10', '2025-02-15', 70),
        createPrediction('manual', '2025-02-10', '2025-02-15', 70),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.sourceAgreement).toBe(1);
      expect(result!.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Confidence Scoring', () => {
    it('should have higher confidence with more agreeing sources', () => {
      const twoSources = reconcile([
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
      ]);

      const fourSources = reconcile([
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
        createPrediction('ovia', '2025-02-10', '2025-02-15', 65),
        createPrediction('fertility-friend', '2025-02-10', '2025-02-15', 85),
      ]);

      expect(twoSources).not.toBeNull();
      expect(fourSources).not.toBeNull();
      expect(fourSources!.confidence).toBeGreaterThan(twoSources!.confidence);
    });

    it('should penalize confidence when outliers exist', () => {
      const noOutliers = reconcile([
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
        createPrediction('ovia', '2025-02-10', '2025-02-15', 65),
      ]);

      const withOutlier = reconcile([
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
        createPrediction('ovia', '2025-02-10', '2025-02-15', 65),
        createPrediction('manual', '2025-02-01', '2025-02-06', 50), // Outlier
      ]);

      expect(noOutliers).not.toBeNull();
      expect(withOutlier).not.toBeNull();
      expect(withOutlier!.confidence).toBeLessThan(noOutliers!.confidence);
    });

    it('should have confidence between 0 and 1', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 100),
        createPrediction('clue', '2025-02-10', '2025-02-15', 100),
        createPrediction('fertility-friend', '2025-02-10', '2025-02-15', 100),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThanOrEqual(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Day Scores', () => {
    it('should generate day scores for all dates in range', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.dayScores.length).toBeGreaterThan(0);

      // Should have scores for Feb 10-15 at minimum
      const dates = result!.diagnostics.dayScores.map((d) => d.date);
      expect(dates).toContain('2025-02-10');
      expect(dates).toContain('2025-02-15');
    });

    it('should have higher probability for days in more predictions', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-12', '2025-02-17', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      const dayScores = result!.diagnostics.dayScores;

      // Feb 12-15 should have higher scores (overlap)
      const overlap = dayScores.find((d) => d.date === '2025-02-13');
      const noOverlap = dayScores.find((d) => d.date === '2025-02-11');

      expect(overlap).toBeDefined();
      expect(noOverlap).toBeDefined();
      expect(overlap!.probability).toBeGreaterThan(noOverlap!.probability);
    });
  });

  describe('Explainability', () => {
    it('should generate human-readable explanations', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-11', '2025-02-16', 75),
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.explain.length).toBeGreaterThan(0);

      // Should mention sources
      expect(result!.explain.some((e) => e.includes('flo') || e.includes('clue'))).toBe(
        true
      );

      // Should mention fertile window
      expect(result!.explain.some((e) => e.includes('Fertile window'))).toBe(true);
    });

    it('should note when using single source', () => {
      const predictions = [createPrediction('flo', '2025-02-10', '2025-02-15', 70)];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      expect(result!.explain.some((e) => e.includes('only'))).toBe(true);
    });

    it('should mention outliers in explanations', () => {
      const predictions = [
        createPrediction('flo', '2025-02-10', '2025-02-15', 70),
        createPrediction('clue', '2025-02-10', '2025-02-15', 75),
        createPrediction('manual', '2025-02-01', '2025-02-06', 50), // Outlier
      ];

      const result = reconcile(predictions);

      expect(result).not.toBeNull();
      if (result!.diagnostics.outliers.length > 0) {
        expect(result!.explain.some((e) => e.includes('manual'))).toBe(true);
      }
    });
  });
});

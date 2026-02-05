/**
 * Predictor Tests
 *
 * Tests for calendar, symptom, and combined predictors.
 */

import { describe, it, expect } from 'vitest';
import { predictFromCalendar, predictMultipleCycles } from '../lib/predictors/calendar';
import { predictFromSymptoms, detectBBTShift } from '../lib/predictors/symptoms';
import { predictCombined, assessPredictionQuality } from '../lib/predictors/combined';
import type {
  Cycle,
  Observation,
  CervicalMucusObservation,
  OPKObservation,
  BBTObservation,
  ISODateString,
} from '@/types';

// Helper to create cycles
function createCycle(startDate: ISODateString, length: number, periodLength: number = 5): Cycle {
  return {
    id: crypto.randomUUID(),
    startDate,
    length,
    periodLength,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create CM observation
function createCMObservation(
  date: ISODateString,
  value: CervicalMucusObservation['value']
): CervicalMucusObservation {
  return {
    id: crypto.randomUUID(),
    date,
    type: 'cervical-mucus',
    value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create OPK observation
function createOPKObservation(date: ISODateString, value: OPKObservation['value']): OPKObservation {
  return {
    id: crypto.randomUUID(),
    date,
    type: 'opk',
    value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper to create BBT observation
function createBBTObservation(date: ISODateString, value: number): BBTObservation {
  return {
    id: crypto.randomUUID(),
    date,
    type: 'bbt',
    value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('Calendar Predictor', () => {
  describe('Basic Predictions', () => {
    it('should predict fertile window based on cycle start', () => {
      const result = predictFromCalendar('2025-02-01');

      expect(result).toBeDefined();
      expect(result.fertileStart).toBeDefined();
      expect(result.fertileEnd).toBeDefined();
      expect(result.ovulationDate).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should use 28-day cycle as default', () => {
      const result = predictFromCalendar('2025-02-01');

      // Ovulation day 14 (28 - 14 = 14), add to cycle start
      // Feb 1 + 14 days = Feb 15
      expect(result.ovulationDate).toBe('2025-02-15');

      // Fertile window: ovulation -5 to +1
      // Feb 15 - 5 = Feb 10, Feb 15 + 1 = Feb 16
      expect(result.fertileStart).toBe('2025-02-10');
      expect(result.fertileEnd).toBe('2025-02-16');
    });

    it('should adjust for historical cycle length', () => {
      const cycles = [
        createCycle('2025-01-01', 32),
        createCycle('2024-12-01', 30),
        createCycle('2024-11-01', 31),
      ];

      const result = predictFromCalendar('2025-02-01', cycles);

      // Average cycle: 31 days, ovulation day 17 (31 - 14)
      expect(result.ovulationDate).toBe('2025-02-18');
    });

    it('should have higher confidence with more historical data', () => {
      const fewCycles = predictFromCalendar('2025-02-01', [createCycle('2025-01-01', 28)]);

      const manyCycles = predictFromCalendar('2025-02-01', [
        createCycle('2025-01-01', 28),
        createCycle('2024-12-01', 28),
        createCycle('2024-11-01', 28),
        createCycle('2024-10-01', 28),
        createCycle('2024-09-01', 28),
        createCycle('2024-08-01', 28),
      ]);

      expect(manyCycles.confidence).toBeGreaterThan(fewCycles.confidence);
    });

    it('should have lower confidence with irregular cycles', () => {
      const regularCycles = predictFromCalendar('2025-02-01', [
        createCycle('2025-01-01', 28),
        createCycle('2024-12-01', 28),
        createCycle('2024-11-01', 29),
      ]);

      const irregularCycles = predictFromCalendar('2025-02-01', [
        createCycle('2025-01-01', 25),
        createCycle('2024-12-01', 35),
        createCycle('2024-11-01', 28),
      ]);

      expect(regularCycles.confidence).toBeGreaterThan(irregularCycles.confidence);
    });
  });

  describe('Multiple Cycle Predictions', () => {
    it('should predict multiple upcoming cycles', () => {
      const cycles = [createCycle('2025-01-01', 28)];
      const predictions = predictMultipleCycles('2025-02-01', cycles, 3);

      expect(predictions.length).toBe(3);

      // Each cycle should be ~28 days apart
      // Dates depend on month lengths, so check relative spacing
      expect(predictions[0].fertileStart).toBe('2025-02-10');
      // Feb has 28 days, so March start varies
      expect(predictions[1].fertileStart).toBe('2025-03-09'); // Feb 1 + 28 = Mar 1, + 9 = Mar 10... but Feb has 28 days
      expect(predictions[2].fertileStart).toBe('2025-04-06');
    });

    it('should reduce confidence for future cycles', () => {
      const cycles = [createCycle('2025-01-01', 28)];
      const predictions = predictMultipleCycles('2025-02-01', cycles, 3);

      expect(predictions[0].confidence).toBeGreaterThan(predictions[1].confidence);
      expect(predictions[1].confidence).toBeGreaterThan(predictions[2].confidence);
    });
  });

  describe('Custom Options', () => {
    it('should respect custom luteal phase length', () => {
      const result = predictFromCalendar('2025-02-01', [], {
        lutealPhaseLength: 12, // Shorter luteal phase
      });

      // Ovulation day 16 (28 - 12 = 16)
      // Feb 1 + 16 = Feb 17
      expect(result.ovulationDate).toBe('2025-02-17');
    });

    it('should respect custom fertile window parameters', () => {
      const result = predictFromCalendar('2025-02-01', [], {
        daysBeforeOvulation: 3,
        daysAfterOvulation: 2,
      });

      // Ovulation Feb 15 (day 14 from Feb 1)
      // Window: Feb 15 - 3 = Feb 12, Feb 15 + 2 = Feb 17
      expect(result.fertileStart).toBe('2025-02-12');
      expect(result.fertileEnd).toBe('2025-02-17');
    });
  });
});

describe('Symptom Predictor', () => {
  describe('OPK-based Predictions', () => {
    it('should predict based on OPK positive', () => {
      const observations: Observation[] = [
        createOPKObservation('2025-02-10', 'negative'),
        createOPKObservation('2025-02-11', 'negative'),
        createOPKObservation('2025-02-12', 'positive'),
        createOPKObservation('2025-02-13', 'negative'),
      ];

      const result = predictFromSymptoms(observations);

      expect(result).not.toBeNull();
      // Window should be around OPK positive (Feb 12)
      expect(result!.fertileStart).toBe('2025-02-10'); // 2 days before
      expect(result!.fertileEnd).toBe('2025-02-14'); // 2 days after
    });

    it('should have high confidence with OPK data', () => {
      const observations: Observation[] = [createOPKObservation('2025-02-12', 'positive')];

      const result = predictFromSymptoms(observations);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(70);
    });
  });

  describe('CM-based Predictions', () => {
    it('should predict based on cervical mucus progression', () => {
      const observations: Observation[] = [
        createCMObservation('2025-02-08', 'dry'),
        createCMObservation('2025-02-09', 'sticky'),
        createCMObservation('2025-02-10', 'creamy'),
        createCMObservation('2025-02-11', 'watery'),
        createCMObservation('2025-02-12', 'egg-white'),
        createCMObservation('2025-02-13', 'creamy'),
        createCMObservation('2025-02-14', 'dry'),
      ];

      const result = predictFromSymptoms(observations);

      expect(result).not.toBeNull();
      // Should identify Feb 11-12 as peak (watery/egg-white)
      expect(result!.fertileStart).toBe('2025-02-11'); // First high CM day
    });

    it('should return null with only dry CM', () => {
      const observations: Observation[] = [
        createCMObservation('2025-02-08', 'dry'),
        createCMObservation('2025-02-09', 'dry'),
        createCMObservation('2025-02-10', 'dry'),
      ];

      const result = predictFromSymptoms(observations);

      expect(result).toBeNull();
    });
  });

  describe('Combined CM + OPK', () => {
    it('should have highest confidence with both CM and OPK', () => {
      const observations: Observation[] = [
        createCMObservation('2025-02-10', 'watery'),
        createCMObservation('2025-02-11', 'egg-white'),
        createCMObservation('2025-02-12', 'egg-white'),
        createOPKObservation('2025-02-11', 'positive'),
      ];

      const result = predictFromSymptoms(observations);

      expect(result).not.toBeNull();
      expect(result!.confidence).toBeGreaterThan(80);
    });
  });

  describe('BBT Shift Detection', () => {
    it('should detect temperature shift after ovulation', () => {
      const observations: BBTObservation[] = [
        createBBTObservation('2025-02-05', 97.2),
        createBBTObservation('2025-02-06', 97.3),
        createBBTObservation('2025-02-07', 97.1),
        createBBTObservation('2025-02-08', 97.2),
        createBBTObservation('2025-02-09', 97.3),
        createBBTObservation('2025-02-10', 97.2),
        // Shift starts
        createBBTObservation('2025-02-11', 97.6),
        createBBTObservation('2025-02-12', 97.7),
        createBBTObservation('2025-02-13', 97.5),
      ];

      const result = detectBBTShift(observations);

      expect(result).not.toBeNull();
      expect(result!.confirmed).toBe(true);
      expect(result!.shiftDate).toBe('2025-02-11');
    });

    it('should return null without enough data', () => {
      const observations: BBTObservation[] = [
        createBBTObservation('2025-02-05', 97.2),
        createBBTObservation('2025-02-06', 97.3),
      ];

      const result = detectBBTShift(observations);

      expect(result).toBeNull();
    });

    it('should return null without clear shift', () => {
      const observations: BBTObservation[] = [
        createBBTObservation('2025-02-05', 97.2),
        createBBTObservation('2025-02-06', 97.3),
        createBBTObservation('2025-02-07', 97.2),
        createBBTObservation('2025-02-08', 97.3),
        createBBTObservation('2025-02-09', 97.2),
        createBBTObservation('2025-02-10', 97.3),
        createBBTObservation('2025-02-11', 97.2),
        createBBTObservation('2025-02-12', 97.3),
        createBBTObservation('2025-02-13', 97.2),
      ];

      const result = detectBBTShift(observations);

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should return null with no observations', () => {
      const result = predictFromSymptoms([]);
      expect(result).toBeNull();
    });

    it('should handle observations with missing data', () => {
      const observations: Observation[] = [createCMObservation('2025-02-10', 'egg-white')];

      const result = predictFromSymptoms(observations);

      // Should still work with minimal data
      expect(result).not.toBeNull();
    });
  });
});

describe('Combined Predictor', () => {
  describe('Basic Predictions', () => {
    it('should combine calendar and symptom predictions', () => {
      const input = {
        currentCycleStart: '2025-02-01',
        historicalCycles: [createCycle('2025-01-01', 28), createCycle('2024-12-01', 28)],
        observations: [
          createCMObservation('2025-02-10', 'watery'),
          createCMObservation('2025-02-11', 'egg-white'),
          createCMObservation('2025-02-12', 'egg-white'),
          createOPKObservation('2025-02-11', 'positive'),
        ],
      };

      const result = predictCombined(input);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.inputPredictions).toBeGreaterThanOrEqual(2);
    });

    it('should work with only calendar data', () => {
      const input = {
        currentCycleStart: '2025-02-01',
        historicalCycles: [createCycle('2025-01-01', 28)],
      };

      const result = predictCombined(input);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.inputPredictions).toBe(1);
    });

    it('should include external predictions in reconciliation', () => {
      const input = {
        currentCycleStart: '2025-02-01',
        externalPredictions: [
          {
            id: crypto.randomUUID(),
            source: 'flo' as const,
            fertileStart: '2025-02-10',
            fertileEnd: '2025-02-15',
            confidence: 70,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            source: 'clue' as const,
            fertileStart: '2025-02-09',
            fertileEnd: '2025-02-14',
            confidence: 75,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      const result = predictCombined(input);

      expect(result).not.toBeNull();
      expect(result!.diagnostics.inputPredictions).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Quality Assessment', () => {
    it('should rate excellent quality with comprehensive data', () => {
      const input = {
        currentCycleStart: '2025-02-01',
        historicalCycles: Array(8)
          .fill(null)
          .map((_, i) => createCycle(`2024-0${6 + i}-01`, 28)),
        observations: [
          createCMObservation('2025-02-10', 'watery'),
          createCMObservation('2025-02-11', 'egg-white'),
          createCMObservation('2025-02-12', 'egg-white'),
          createCMObservation('2025-02-13', 'creamy'),
          createCMObservation('2025-02-14', 'sticky'),
          createCMObservation('2025-02-15', 'dry'),
          createCMObservation('2025-02-16', 'dry'),
          createOPKObservation('2025-02-11', 'positive'),
        ],
      };

      const quality = assessPredictionQuality(input);

      expect(quality.overall).toBe('excellent');
      expect(quality.score).toBeGreaterThan(80);
    });

    it('should rate poor quality with minimal data', () => {
      const input = {
        currentCycleStart: '2025-02-01',
      };

      const quality = assessPredictionQuality(input);

      expect(['poor', 'fair']).toContain(quality.overall);
      expect(quality.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide actionable recommendations', () => {
      const input = {
        currentCycleStart: '2025-02-01',
        historicalCycles: [createCycle('2025-01-01', 28)],
      };

      const quality = assessPredictionQuality(input);

      expect(quality.recommendations.length).toBeGreaterThan(0);
      expect(
        quality.recommendations.some(
          (r) =>
            r.toLowerCase().includes('track') ||
            r.toLowerCase().includes('opk') ||
            r.toLowerCase().includes('cycle')
        )
      ).toBe(true);
    });

    it('should identify positive factors', () => {
      const input = {
        currentCycleStart: '2025-02-01',
        observations: [createOPKObservation('2025-02-11', 'positive')],
      };

      const quality = assessPredictionQuality(input);

      const positiveFactors = quality.factors.filter((f) => f.impact === 'positive');
      expect(positiveFactors.length).toBeGreaterThan(0);
    });

    it('should identify negative factors', () => {
      const input = {
        currentCycleStart: '2025-02-01',
        historicalCycles: [
          createCycle('2025-01-01', 25),
          createCycle('2024-12-01', 35),
          createCycle('2024-11-01', 28),
        ],
      };

      const quality = assessPredictionQuality(input);

      const negativeFactors = quality.factors.filter((f) => f.impact === 'negative');
      expect(negativeFactors.length).toBeGreaterThan(0);
    });
  });
});

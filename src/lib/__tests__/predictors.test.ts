import { describe, it, expect } from 'vitest';
import { predictFromCalendar, predictMultipleCycles } from '@/lib/predictors/calendar';
import { predictFromSymptoms, detectBBTShift } from '@/lib/predictors/symptoms';
import { predictCombined, assessPredictionQuality } from '@/lib/predictors/combined';
import type { Cycle, Observation, BBTObservation, CervicalMucusObservation, OPKObservation } from '@/types';
import { generateId, getTimestamp } from '@/types';

const now = getTimestamp();

const makeCycle = (startDate: string, length: number): Cycle => ({
  id: generateId(),
  startDate,
  length,
  periodLength: 5,
  createdAt: now,
  updatedAt: now,
});

const makeCMObservation = (
  date: string,
  value: CervicalMucusObservation['value']
): CervicalMucusObservation => ({
  id: generateId(),
  date,
  type: 'cervical-mucus',
  value,
  createdAt: now,
  updatedAt: now,
});

const makeOPKObservation = (
  date: string,
  value: OPKObservation['value']
): OPKObservation => ({
  id: generateId(),
  date,
  type: 'opk',
  value,
  createdAt: now,
  updatedAt: now,
});

describe('calendar predictor', () => {
  it('calculates fertile window from average cycle length', () => {
    const prediction = predictFromCalendar('2024-01-01', [
      makeCycle('2023-11-01', 28),
      makeCycle('2023-12-01', 28),
    ]);

    expect(prediction.fertileStart).toBe('2024-01-10');
    expect(prediction.fertileEnd).toBe('2024-01-16');
    expect(prediction.ovulationDate).toBe('2024-01-15');
  });

  it('predicts multiple cycles with decreasing confidence', () => {
    const predictions = predictMultipleCycles('2024-01-01', [makeCycle('2023-12-01', 28)], 3);

    expect(predictions).toHaveLength(3);
    expect(predictions[1].confidence).toBeLessThan(predictions[0].confidence);
    expect(predictions[2].confidence).toBeLessThan(predictions[1].confidence);
  });
});

describe('symptom predictor', () => {
  it('builds fertile window around OPK positive', () => {
    const observations: Observation[] = [
      makeCMObservation('2024-01-08', 'watery'),
      makeOPKObservation('2024-01-10', 'positive'),
    ];

    const prediction = predictFromSymptoms(observations);

    expect(prediction).not.toBeNull();
    expect(prediction?.fertileStart).toBe('2024-01-08');
    expect(prediction?.fertileEnd).toBe('2024-01-12');
    expect(prediction?.ovulationDate).toBe('2024-01-11');
  });

  it('detects BBT shifts when temperatures rise', () => {
    const bbtObservations: BBTObservation[] = [
      97.1, 97.2, 97.0, 97.1, 97.2, 97.1, 97.4, 97.6, 97.7,
    ].map((value, index) => ({
      id: generateId(),
      date: `2024-01-${String(index + 1).padStart(2, '0')}`,
      type: 'bbt',
      value,
      createdAt: now,
      updatedAt: now,
    }));

    const shift = detectBBTShift(bbtObservations);

    expect(shift).not.toBeNull();
    expect(shift?.confirmed).toBe(true);
  });
});

describe('combined predictor', () => {
  it('returns calendar-only prediction when no symptom data', () => {
    const result = predictCombined({
      currentCycleStart: '2024-01-01',
      historicalCycles: [makeCycle('2023-12-01', 28)],
    });

    expect(result).not.toBeNull();
    expect(result?.diagnostics.inputPredictions).toBe(1);
  });

  it('assesses prediction quality with recommendations', () => {
    const result = assessPredictionQuality({
      currentCycleStart: '2024-01-01',
      historicalCycles: [makeCycle('2023-10-01', 28)],
      observations: [makeCMObservation('2024-01-05', 'watery')],
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

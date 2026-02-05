/**
 * Tests for FertileDB IndexedDB wrapper
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FertileDB } from '@/lib/db';
import type { Cycle, Prediction, Observation } from '@/types';
import { generateId, getTimestamp, getCurrentISODate } from '@/types';

describe('FertileDB', () => {
  let db: FertileDB;

  beforeEach(async () => {
    db = new FertileDB();
    await db.open();
  });

  afterEach(() => {
    db.close();
  });

  describe('open/close', () => {
    it('should open the database', async () => {
      const newDb = new FertileDB();
      const result = await newDb.open();
      expect(result).toBeDefined();
      expect(result.name).toBe('fertile-db');
      newDb.close();
    });

    it('should return same connection when opened multiple times', async () => {
      const conn1 = await db.open();
      const conn2 = await db.open();
      expect(conn1).toBe(conn2);
    });
  });

  describe('Cycles CRUD', () => {
    const createTestCycle = (): Cycle => ({
      id: generateId(),
      startDate: '2024-01-15',
      length: 28,
      periodLength: 5,
      notes: 'Test cycle',
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    });

    it('should add a cycle', async () => {
      const cycle = createTestCycle();
      const result = await db.addCycle(cycle);
      expect(result).toEqual(cycle);
    });

    it('should get a cycle by id', async () => {
      const cycle = createTestCycle();
      await db.addCycle(cycle);

      const result = await db.getCycle(cycle.id);
      expect(result).toEqual(cycle);
    });

    it('should return undefined for non-existent cycle', async () => {
      const result = await db.getCycle('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should get all cycles sorted by date descending', async () => {
      const cycle1: Cycle = {
        ...createTestCycle(),
        id: generateId(),
        startDate: '2024-01-01',
      };
      const cycle2: Cycle = {
        ...createTestCycle(),
        id: generateId(),
        startDate: '2024-02-01',
      };
      const cycle3: Cycle = {
        ...createTestCycle(),
        id: generateId(),
        startDate: '2024-01-15',
      };

      await db.addCycle(cycle1);
      await db.addCycle(cycle2);
      await db.addCycle(cycle3);

      const result = await db.getAllCycles();
      expect(result).toHaveLength(3);
      expect(result[0].startDate).toBe('2024-02-01');
      expect(result[1].startDate).toBe('2024-01-15');
      expect(result[2].startDate).toBe('2024-01-01');
    });

    it('should update a cycle', async () => {
      const cycle = createTestCycle();
      await db.addCycle(cycle);

      const updated = { ...cycle, length: 30, notes: 'Updated' };
      await db.updateCycle(updated);

      const result = await db.getCycle(cycle.id);
      expect(result?.length).toBe(30);
      expect(result?.notes).toBe('Updated');
    });

    it('should delete a cycle', async () => {
      const cycle = createTestCycle();
      await db.addCycle(cycle);

      await db.deleteCycle(cycle.id);

      const result = await db.getCycle(cycle.id);
      expect(result).toBeUndefined();
    });

    it('should get cycle by start date', async () => {
      const cycle = createTestCycle();
      await db.addCycle(cycle);

      const result = await db.getCycleByStartDate('2024-01-15');
      expect(result?.id).toBe(cycle.id);
    });
  });

  describe('Predictions CRUD', () => {
    const createTestPrediction = (): Prediction => ({
      id: generateId(),
      source: 'flo',
      fertileStart: '2024-01-10',
      fertileEnd: '2024-01-15',
      confidence: 85,
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    });

    it('should add a prediction', async () => {
      const prediction = createTestPrediction();
      const result = await db.addPrediction(prediction);
      expect(result).toEqual(prediction);
    });

    it('should get a prediction by id', async () => {
      const prediction = createTestPrediction();
      await db.addPrediction(prediction);

      const result = await db.getPrediction(prediction.id);
      expect(result).toEqual(prediction);
    });

    it('should get all predictions sorted by date', async () => {
      const pred1: Prediction = {
        ...createTestPrediction(),
        id: generateId(),
        fertileStart: '2024-01-10',
      };
      const pred2: Prediction = {
        ...createTestPrediction(),
        id: generateId(),
        fertileStart: '2024-02-10',
      };

      await db.addPrediction(pred1);
      await db.addPrediction(pred2);

      const result = await db.getAllPredictions();
      expect(result).toHaveLength(2);
      expect(result[0].fertileStart).toBe('2024-02-10');
    });

    it('should get predictions by source', async () => {
      const floPred = { ...createTestPrediction(), source: 'flo' as const };
      const cluePred = { ...createTestPrediction(), id: generateId(), source: 'clue' as const };

      await db.addPrediction(floPred);
      await db.addPrediction(cluePred);

      const result = await db.getPredictionsBySource('flo');
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('flo');
    });

    it('should update a prediction', async () => {
      const prediction = createTestPrediction();
      await db.addPrediction(prediction);

      const updated = { ...prediction, confidence: 95 };
      await db.updatePrediction(updated);

      const result = await db.getPrediction(prediction.id);
      expect(result?.confidence).toBe(95);
    });

    it('should delete a prediction', async () => {
      const prediction = createTestPrediction();
      await db.addPrediction(prediction);

      await db.deletePrediction(prediction.id);

      const result = await db.getPrediction(prediction.id);
      expect(result).toBeUndefined();
    });
  });

  describe('Observations CRUD', () => {
    const createTestObservation = (): Observation => ({
      id: generateId(),
      date: '2024-01-15',
      type: 'cervical-mucus',
      value: 'egg-white',
      notes: 'Test observation',
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    });

    it('should add an observation', async () => {
      const observation = createTestObservation();
      const result = await db.addObservation(observation);
      expect(result).toEqual(observation);
    });

    it('should get an observation by id', async () => {
      const observation = createTestObservation();
      await db.addObservation(observation);

      const result = await db.getObservation(observation.id);
      expect(result).toEqual(observation);
    });

    it('should get all observations sorted by date', async () => {
      const obs1: Observation = {
        ...createTestObservation(),
        id: generateId(),
        date: '2024-01-10',
      };
      const obs2: Observation = {
        ...createTestObservation(),
        id: generateId(),
        date: '2024-01-20',
      };

      await db.addObservation(obs1);
      await db.addObservation(obs2);

      const result = await db.getAllObservations();
      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2024-01-20');
    });

    it('should get observations by date', async () => {
      const obs1: Observation = { ...createTestObservation(), date: '2024-01-15' };
      const obs2: Observation = {
        ...createTestObservation(),
        id: generateId(),
        date: '2024-01-16',
      };

      await db.addObservation(obs1);
      await db.addObservation(obs2);

      const result = await db.getObservationsByDate('2024-01-15');
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('should get observations by type', async () => {
      const mucusObs: Observation = {
        id: generateId(),
        date: '2024-01-15',
        type: 'cervical-mucus',
        value: 'egg-white',
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      };
      const bbtObs: Observation = {
        id: generateId(),
        date: '2024-01-15',
        type: 'bbt',
        value: 97.8,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      };

      await db.addObservation(mucusObs);
      await db.addObservation(bbtObs);

      const result = await db.getObservationsByType('cervical-mucus');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('cervical-mucus');
    });

    it('should get observations in date range', async () => {
      const obs1: Observation = {
        ...createTestObservation(),
        id: generateId(),
        date: '2024-01-10',
      };
      const obs2: Observation = {
        ...createTestObservation(),
        id: generateId(),
        date: '2024-01-15',
      };
      const obs3: Observation = {
        ...createTestObservation(),
        id: generateId(),
        date: '2024-01-20',
      };

      await db.addObservation(obs1);
      await db.addObservation(obs2);
      await db.addObservation(obs3);

      const result = await db.getObservationsInRange('2024-01-12', '2024-01-18');
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('should update an observation', async () => {
      const observation = createTestObservation();
      await db.addObservation(observation);

      const updated: Observation = {
        ...observation,
        type: 'cervical-mucus',
        value: 'watery',
      };
      await db.updateObservation(updated);

      const result = await db.getObservation(observation.id);
      expect(result?.value).toBe('watery');
    });

    it('should delete an observation', async () => {
      const observation = createTestObservation();
      await db.addObservation(observation);

      await db.deleteObservation(observation.id);

      const result = await db.getObservation(observation.id);
      expect(result).toBeUndefined();
    });
  });

  describe('Utilities', () => {
    it('should clear all data', async () => {
      // Add data to all stores
      const cycle: Cycle = {
        id: generateId(),
        startDate: '2024-01-15',
        length: 28,
        periodLength: 5,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      };
      const prediction: Prediction = {
        id: generateId(),
        source: 'flo',
        fertileStart: '2024-01-10',
        fertileEnd: '2024-01-15',
        confidence: 85,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      };
      const observation: Observation = {
        id: generateId(),
        date: '2024-01-15',
        type: 'cervical-mucus',
        value: 'egg-white',
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      };

      await db.addCycle(cycle);
      await db.addPrediction(prediction);
      await db.addObservation(observation);

      // Verify data exists
      expect(await db.getAllCycles()).toHaveLength(1);
      expect(await db.getAllPredictions()).toHaveLength(1);
      expect(await db.getAllObservations()).toHaveLength(1);

      // Clear all
      await db.clearAll();

      // Verify all cleared
      expect(await db.getAllCycles()).toHaveLength(0);
      expect(await db.getAllPredictions()).toHaveLength(0);
      expect(await db.getAllObservations()).toHaveLength(0);
    });
  });

  describe('Type helpers', () => {
    it('generateId should return a valid UUID', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('getTimestamp should return ISO string', () => {
      const timestamp = getTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('getCurrentISODate should return YYYY-MM-DD format', () => {
      const date = getCurrentISODate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

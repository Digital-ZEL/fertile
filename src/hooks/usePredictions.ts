'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDB } from '@/lib/db';
import type { Prediction, PredictionSource, UUID } from '@/types';

export interface UsePredictionsReturn {
  predictions: Prediction[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addPrediction: (prediction: Prediction) => Promise<void>;
  updatePrediction: (prediction: Prediction) => Promise<void>;
  deletePrediction: (id: UUID) => Promise<void>;
  getBySource: (source: PredictionSource) => Prediction[];
  getActivePredictions: () => Prediction[];
  sources: PredictionSource[];
}

/**
 * Hook to manage prediction data from IndexedDB
 * Predictions come from various apps (Flo, Clue, etc.) and are reconciled
 */
export function usePredictions(): UsePredictionsReturn {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getDB();
      const allPredictions = await db.getAllPredictions();
      setPredictions(allPredictions);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch predictions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addPrediction = useCallback(
    async (prediction: Prediction) => {
      try {
        const db = getDB();
        await db.addPrediction(prediction);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add prediction'));
        throw err;
      }
    },
    [refresh]
  );

  const updatePrediction = useCallback(
    async (prediction: Prediction) => {
      try {
        const db = getDB();
        await db.updatePrediction(prediction);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update prediction'));
        throw err;
      }
    },
    [refresh]
  );

  const deletePrediction = useCallback(
    async (id: UUID) => {
      try {
        const db = getDB();
        await db.deletePrediction(id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete prediction'));
        throw err;
      }
    },
    [refresh]
  );

  // Get predictions by source
  const getBySource = useCallback(
    (source: PredictionSource) => {
      return predictions.filter((p) => p.source === source);
    },
    [predictions]
  );

  // Get predictions that are still active (fertile window hasn't passed)
  const getActivePredictions = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return predictions.filter((p) => p.fertileEnd >= today);
  }, [predictions]);

  // Unique sources present in predictions
  const sources = [...new Set(predictions.map((p) => p.source))];

  return {
    predictions,
    loading,
    error,
    refresh,
    addPrediction,
    updatePrediction,
    deletePrediction,
    getBySource,
    getActivePredictions,
    sources,
  };
}

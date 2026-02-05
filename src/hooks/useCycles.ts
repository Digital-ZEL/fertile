'use client';

import { useState, useEffect, useCallback } from 'react';
import { getDB } from '@/lib/db';
import type { Cycle, UUID } from '@/types';

export interface UseCyclesReturn {
  cycles: Cycle[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addCycle: (cycle: Cycle) => Promise<void>;
  updateCycle: (cycle: Cycle) => Promise<void>;
  deleteCycle: (id: UUID) => Promise<void>;
  currentCycle: Cycle | null;
  averageCycleLength: number;
}

/**
 * Hook to manage cycle data from IndexedDB
 * Provides CRUD operations and computed values
 */
export function useCycles(): UseCyclesReturn {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = getDB();
      const allCycles = await db.getAllCycles();
      setCycles(allCycles);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch cycles'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCycle = useCallback(
    async (cycle: Cycle) => {
      try {
        const db = getDB();
        await db.addCycle(cycle);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to add cycle'));
        throw err;
      }
    },
    [refresh]
  );

  const updateCycle = useCallback(
    async (cycle: Cycle) => {
      try {
        const db = getDB();
        await db.updateCycle(cycle);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update cycle'));
        throw err;
      }
    },
    [refresh]
  );

  const deleteCycle = useCallback(
    async (id: UUID) => {
      try {
        const db = getDB();
        await db.deleteCycle(id);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete cycle'));
        throw err;
      }
    },
    [refresh]
  );

  // Current cycle is the most recent one
  const currentCycle = cycles.length > 0 ? cycles[0] : null;

  // Calculate average cycle length from historical data
  const averageCycleLength =
    cycles.length > 0
      ? Math.round(cycles.reduce((sum, c) => sum + c.length, 0) / cycles.length)
      : 28; // Default to 28 days

  return {
    cycles,
    loading,
    error,
    refresh,
    addCycle,
    updateCycle,
    deleteCycle,
    currentCycle,
    averageCycleLength,
  };
}

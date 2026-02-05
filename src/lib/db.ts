/**
 * IndexedDB wrapper for Fertile app
 * Provides local persistence for cycles, predictions, and observations
 */

import type { Cycle, Prediction, Observation, UUID } from '@/types';

const DB_NAME = 'fertile-db';
const DB_VERSION = 1;

// Store names
const STORES = {
  CYCLES: 'cycles',
  PREDICTIONS: 'predictions',
  OBSERVATIONS: 'observations',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * FertileDB - IndexedDB wrapper with typed CRUD operations
 */
export class FertileDB {
  private db: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;

  /**
   * Open the database connection
   */
  async open(): Promise<IDBDatabase> {
    // Return existing connection
    if (this.db) {
      return this.db;
    }

    // Wait for in-progress open
    if (this.opening) {
      return this.opening;
    }

    this.opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.opening = null;
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.opening = null;

        // Handle unexpected close
        this.db.onclose = () => {
          this.db = null;
        };

        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create cycles store
        if (!db.objectStoreNames.contains(STORES.CYCLES)) {
          const cyclesStore = db.createObjectStore(STORES.CYCLES, { keyPath: 'id' });
          cyclesStore.createIndex('startDate', 'startDate', { unique: false });
        }

        // Create predictions store
        if (!db.objectStoreNames.contains(STORES.PREDICTIONS)) {
          const predictionsStore = db.createObjectStore(STORES.PREDICTIONS, { keyPath: 'id' });
          predictionsStore.createIndex('source', 'source', { unique: false });
          predictionsStore.createIndex('fertileStart', 'fertileStart', { unique: false });
          predictionsStore.createIndex('cycleId', 'cycleId', { unique: false });
        }

        // Create observations store
        if (!db.objectStoreNames.contains(STORES.OBSERVATIONS)) {
          const observationsStore = db.createObjectStore(STORES.OBSERVATIONS, { keyPath: 'id' });
          observationsStore.createIndex('date', 'date', { unique: false });
          observationsStore.createIndex('type', 'type', { unique: false });
          observationsStore.createIndex('date_type', ['date', 'type'], { unique: false });
        }
      };
    });

    return this.opening;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Get a transaction for the specified stores
   */
  private async getTransaction(
    storeNames: StoreName | StoreName[],
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBTransaction> {
    const db = await this.open();
    return db.transaction(storeNames, mode);
  }

  /**
   * Generic add operation
   */
  private async add<T>(storeName: StoreName, item: T): Promise<T> {
    const tx = await this.getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () =>
        reject(new Error(`Failed to add to ${storeName}: ${request.error?.message}`));
    });
  }

  /**
   * Generic get operation
   */
  private async get<T>(storeName: StoreName, id: UUID): Promise<T | undefined> {
    const tx = await this.getTransaction(storeName);
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () =>
        reject(new Error(`Failed to get from ${storeName}: ${request.error?.message}`));
    });
  }

  /**
   * Generic getAll operation
   */
  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    const tx = await this.getTransaction(storeName);
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () =>
        reject(new Error(`Failed to getAll from ${storeName}: ${request.error?.message}`));
    });
  }

  /**
   * Generic update operation
   */
  private async update<T>(storeName: StoreName, item: T): Promise<T> {
    const tx = await this.getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(item);
      request.onsuccess = () => resolve(item);
      request.onerror = () =>
        reject(new Error(`Failed to update in ${storeName}: ${request.error?.message}`));
    });
  }

  /**
   * Generic delete operation
   */
  private async delete(storeName: StoreName, id: UUID): Promise<void> {
    const tx = await this.getTransaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to delete from ${storeName}: ${request.error?.message}`));
    });
  }

  /**
   * Generic query by index
   */
  private async getByIndex<T>(
    storeName: StoreName,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    const tx = await this.getTransaction(storeName);
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);

    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () =>
        reject(
          new Error(`Failed to query ${storeName} by ${indexName}: ${request.error?.message}`)
        );
    });
  }

  // ==================== CYCLES ====================

  async addCycle(cycle: Cycle): Promise<Cycle> {
    return this.add(STORES.CYCLES, cycle);
  }

  async getCycle(id: UUID): Promise<Cycle | undefined> {
    return this.get(STORES.CYCLES, id);
  }

  async getAllCycles(): Promise<Cycle[]> {
    const cycles = await this.getAll<Cycle>(STORES.CYCLES);
    // Sort by start date descending (most recent first)
    return cycles.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async updateCycle(cycle: Cycle): Promise<Cycle> {
    return this.update(STORES.CYCLES, cycle);
  }

  async deleteCycle(id: UUID): Promise<void> {
    return this.delete(STORES.CYCLES, id);
  }

  async getCycleByStartDate(startDate: string): Promise<Cycle | undefined> {
    const cycles = await this.getByIndex<Cycle>(STORES.CYCLES, 'startDate', startDate);
    return cycles[0];
  }

  // ==================== PREDICTIONS ====================

  async addPrediction(prediction: Prediction): Promise<Prediction> {
    return this.add(STORES.PREDICTIONS, prediction);
  }

  async getPrediction(id: UUID): Promise<Prediction | undefined> {
    return this.get(STORES.PREDICTIONS, id);
  }

  async getAllPredictions(): Promise<Prediction[]> {
    const predictions = await this.getAll<Prediction>(STORES.PREDICTIONS);
    // Sort by fertile start date descending
    return predictions.sort((a, b) => b.fertileStart.localeCompare(a.fertileStart));
  }

  async updatePrediction(prediction: Prediction): Promise<Prediction> {
    return this.update(STORES.PREDICTIONS, prediction);
  }

  async deletePrediction(id: UUID): Promise<void> {
    return this.delete(STORES.PREDICTIONS, id);
  }

  async getPredictionsBySource(source: string): Promise<Prediction[]> {
    return this.getByIndex(STORES.PREDICTIONS, 'source', source);
  }

  async getPredictionsByCycle(cycleId: UUID): Promise<Prediction[]> {
    return this.getByIndex(STORES.PREDICTIONS, 'cycleId', cycleId);
  }

  // ==================== OBSERVATIONS ====================

  async addObservation(observation: Observation): Promise<Observation> {
    return this.add(STORES.OBSERVATIONS, observation);
  }

  async getObservation(id: UUID): Promise<Observation | undefined> {
    return this.get(STORES.OBSERVATIONS, id);
  }

  async getAllObservations(): Promise<Observation[]> {
    const observations = await this.getAll<Observation>(STORES.OBSERVATIONS);
    // Sort by date descending
    return observations.sort((a, b) => b.date.localeCompare(a.date));
  }

  async updateObservation(observation: Observation): Promise<Observation> {
    return this.update(STORES.OBSERVATIONS, observation);
  }

  async deleteObservation(id: UUID): Promise<void> {
    return this.delete(STORES.OBSERVATIONS, id);
  }

  async getObservationsByDate(date: string): Promise<Observation[]> {
    return this.getByIndex(STORES.OBSERVATIONS, 'date', date);
  }

  async getObservationsByType(type: string): Promise<Observation[]> {
    return this.getByIndex(STORES.OBSERVATIONS, 'type', type);
  }

  async getObservationsInRange(startDate: string, endDate: string): Promise<Observation[]> {
    const all = await this.getAllObservations();
    return all.filter((obs) => obs.date >= startDate && obs.date <= endDate);
  }

  // ==================== UTILITIES ====================

  /**
   * Clear all data (for testing or reset)
   */
  async clearAll(): Promise<void> {
    const tx = await this.getTransaction(
      [STORES.CYCLES, STORES.PREDICTIONS, STORES.OBSERVATIONS],
      'readwrite'
    );

    const clearStore = (storeName: StoreName): Promise<void> => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore(storeName).clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    };

    await Promise.all([
      clearStore(STORES.CYCLES),
      clearStore(STORES.PREDICTIONS),
      clearStore(STORES.OBSERVATIONS),
    ]);
  }

  /**
   * Delete the entire database
   */
  static async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete database'));
    });
  }
}

// Singleton instance for app-wide use
let dbInstance: FertileDB | null = null;

export function getDB(): FertileDB {
  if (!dbInstance) {
    dbInstance = new FertileDB();
  }
  return dbInstance;
}

// React hook for database access
export function useDB(): FertileDB {
  return getDB();
}

/**
 * Convenience function for batch adding observations
 * Used primarily by the import functionality
 */
export async function addObservations(observations: Observation[]): Promise<Observation[]> {
  const db = getDB();
  const results: Observation[] = [];

  for (const obs of observations) {
    const added = await db.addObservation(obs);
    results.push(added);
  }

  return results;
}

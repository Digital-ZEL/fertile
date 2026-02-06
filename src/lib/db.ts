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

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface FertileDBClient {
  addCycle: (cycle: Cycle) => Promise<Cycle>;
  getCycle: (id: UUID) => Promise<Cycle | undefined>;
  getAllCycles: () => Promise<Cycle[]>;
  updateCycle: (cycle: Cycle) => Promise<Cycle>;
  deleteCycle: (id: UUID) => Promise<void>;
  getCycleByStartDate: (startDate: string) => Promise<Cycle | undefined>;
  addPrediction: (prediction: Prediction) => Promise<Prediction>;
  getPrediction: (id: UUID) => Promise<Prediction | undefined>;
  getAllPredictions: () => Promise<Prediction[]>;
  updatePrediction: (prediction: Prediction) => Promise<Prediction>;
  deletePrediction: (id: UUID) => Promise<void>;
  getPredictionsBySource: (source: string) => Promise<Prediction[]>;
  getPredictionsByCycle: (cycleId: UUID) => Promise<Prediction[]>;
  addObservation: (observation: Observation) => Promise<Observation>;
  getObservation: (id: UUID) => Promise<Observation | undefined>;
  getAllObservations: () => Promise<Observation[]>;
  updateObservation: (observation: Observation) => Promise<Observation>;
  deleteObservation: (id: UUID) => Promise<void>;
  getObservationsByDate: (date: string) => Promise<Observation[]>;
  getObservationsByType: (type: string) => Promise<Observation[]>;
  getObservationsInRange: (startDate: string, endDate: string) => Promise<Observation[]>;
  clearAll: () => Promise<void>;
  close: () => void;
}

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false;
  }

  try {
    const testKey = '__fertile_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function createStorage(): StorageLike {
  return isStorageAvailable() ? window.localStorage : new MemoryStorage();
}

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

class LocalStorageFertileDB implements FertileDBClient {
  private storage: StorageLike;

  constructor() {
    this.storage = createStorage();
  }

  private getStoreKey(storeName: StoreName): string {
    return `${DB_NAME}:${storeName}`;
  }

  private readStore<T>(storeName: StoreName): T[] {
    const raw = this.storage.getItem(this.getStoreKey(storeName));
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private writeStore<T>(storeName: StoreName, items: T[]): void {
    this.storage.setItem(this.getStoreKey(storeName), JSON.stringify(items));
  }

  private upsertById<T extends { id: UUID }>(storeName: StoreName, item: T): T {
    const existing = this.readStore<T>(storeName);
    const index = existing.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      existing[index] = item;
    } else {
      existing.push(item);
    }
    this.writeStore(storeName, existing);
    return item;
  }

  async addCycle(cycle: Cycle): Promise<Cycle> {
    return this.upsertById(STORES.CYCLES, cycle);
  }

  async getCycle(id: UUID): Promise<Cycle | undefined> {
    return this.readStore<Cycle>(STORES.CYCLES).find((item) => item.id === id);
  }

  async getAllCycles(): Promise<Cycle[]> {
    const cycles = this.readStore<Cycle>(STORES.CYCLES);
    return cycles.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async updateCycle(cycle: Cycle): Promise<Cycle> {
    return this.upsertById(STORES.CYCLES, cycle);
  }

  async deleteCycle(id: UUID): Promise<void> {
    const remaining = this.readStore<Cycle>(STORES.CYCLES).filter((item) => item.id !== id);
    this.writeStore(STORES.CYCLES, remaining);
  }

  async getCycleByStartDate(startDate: string): Promise<Cycle | undefined> {
    return this.readStore<Cycle>(STORES.CYCLES).find((cycle) => cycle.startDate === startDate);
  }

  async addPrediction(prediction: Prediction): Promise<Prediction> {
    return this.upsertById(STORES.PREDICTIONS, prediction);
  }

  async getPrediction(id: UUID): Promise<Prediction | undefined> {
    return this.readStore<Prediction>(STORES.PREDICTIONS).find((item) => item.id === id);
  }

  async getAllPredictions(): Promise<Prediction[]> {
    const predictions = this.readStore<Prediction>(STORES.PREDICTIONS);
    return predictions.sort((a, b) => b.fertileStart.localeCompare(a.fertileStart));
  }

  async updatePrediction(prediction: Prediction): Promise<Prediction> {
    return this.upsertById(STORES.PREDICTIONS, prediction);
  }

  async deletePrediction(id: UUID): Promise<void> {
    const remaining = this.readStore<Prediction>(STORES.PREDICTIONS).filter((item) => item.id !== id);
    this.writeStore(STORES.PREDICTIONS, remaining);
  }

  async getPredictionsBySource(source: string): Promise<Prediction[]> {
    return this.readStore<Prediction>(STORES.PREDICTIONS).filter((item) => item.source === source);
  }

  async getPredictionsByCycle(cycleId: UUID): Promise<Prediction[]> {
    return this.readStore<Prediction>(STORES.PREDICTIONS).filter((item) => item.cycleId === cycleId);
  }

  async addObservation(observation: Observation): Promise<Observation> {
    return this.upsertById(STORES.OBSERVATIONS, observation);
  }

  async getObservation(id: UUID): Promise<Observation | undefined> {
    return this.readStore<Observation>(STORES.OBSERVATIONS).find((item) => item.id === id);
  }

  async getAllObservations(): Promise<Observation[]> {
    const observations = this.readStore<Observation>(STORES.OBSERVATIONS);
    return observations.sort((a, b) => b.date.localeCompare(a.date));
  }

  async updateObservation(observation: Observation): Promise<Observation> {
    return this.upsertById(STORES.OBSERVATIONS, observation);
  }

  async deleteObservation(id: UUID): Promise<void> {
    const remaining = this.readStore<Observation>(STORES.OBSERVATIONS).filter(
      (item) => item.id !== id
    );
    this.writeStore(STORES.OBSERVATIONS, remaining);
  }

  async getObservationsByDate(date: string): Promise<Observation[]> {
    return this.readStore<Observation>(STORES.OBSERVATIONS).filter((item) => item.date === date);
  }

  async getObservationsByType(type: string): Promise<Observation[]> {
    return this.readStore<Observation>(STORES.OBSERVATIONS).filter((item) => item.type === type);
  }

  async getObservationsInRange(startDate: string, endDate: string): Promise<Observation[]> {
    return this.readStore<Observation>(STORES.OBSERVATIONS).filter(
      (obs) => obs.date >= startDate && obs.date <= endDate
    );
  }

  async clearAll(): Promise<void> {
    for (const storeName of Object.values(STORES)) {
      this.storage.removeItem(this.getStoreKey(storeName));
    }
  }

  close(): void {
    // No-op for local storage fallback.
  }
}

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
    if (!isIndexedDBAvailable()) {
      this.opening = null;
      throw new Error('IndexedDB is not available in this environment.');
    }
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

class ResilientFertileDB implements FertileDBClient {
  private primary = new FertileDB();
  private fallback = new LocalStorageFertileDB();
  private useFallback = !isIndexedDBAvailable();

  private async run<T>(primaryAction: () => Promise<T>, fallbackAction: () => Promise<T>): Promise<T> {
    if (this.useFallback) {
      return fallbackAction();
    }

    try {
      return await primaryAction();
    } catch {
      this.useFallback = true;
      return fallbackAction();
    }
  }

  async addCycle(cycle: Cycle): Promise<Cycle> {
    return this.run(() => this.primary.addCycle(cycle), () => this.fallback.addCycle(cycle));
  }

  async getCycle(id: UUID): Promise<Cycle | undefined> {
    return this.run(() => this.primary.getCycle(id), () => this.fallback.getCycle(id));
  }

  async getAllCycles(): Promise<Cycle[]> {
    return this.run(() => this.primary.getAllCycles(), () => this.fallback.getAllCycles());
  }

  async updateCycle(cycle: Cycle): Promise<Cycle> {
    return this.run(() => this.primary.updateCycle(cycle), () => this.fallback.updateCycle(cycle));
  }

  async deleteCycle(id: UUID): Promise<void> {
    return this.run(() => this.primary.deleteCycle(id), () => this.fallback.deleteCycle(id));
  }

  async getCycleByStartDate(startDate: string): Promise<Cycle | undefined> {
    return this.run(
      () => this.primary.getCycleByStartDate(startDate),
      () => this.fallback.getCycleByStartDate(startDate)
    );
  }

  async addPrediction(prediction: Prediction): Promise<Prediction> {
    return this.run(
      () => this.primary.addPrediction(prediction),
      () => this.fallback.addPrediction(prediction)
    );
  }

  async getPrediction(id: UUID): Promise<Prediction | undefined> {
    return this.run(
      () => this.primary.getPrediction(id),
      () => this.fallback.getPrediction(id)
    );
  }

  async getAllPredictions(): Promise<Prediction[]> {
    return this.run(
      () => this.primary.getAllPredictions(),
      () => this.fallback.getAllPredictions()
    );
  }

  async updatePrediction(prediction: Prediction): Promise<Prediction> {
    return this.run(
      () => this.primary.updatePrediction(prediction),
      () => this.fallback.updatePrediction(prediction)
    );
  }

  async deletePrediction(id: UUID): Promise<void> {
    return this.run(
      () => this.primary.deletePrediction(id),
      () => this.fallback.deletePrediction(id)
    );
  }

  async getPredictionsBySource(source: string): Promise<Prediction[]> {
    return this.run(
      () => this.primary.getPredictionsBySource(source),
      () => this.fallback.getPredictionsBySource(source)
    );
  }

  async getPredictionsByCycle(cycleId: UUID): Promise<Prediction[]> {
    return this.run(
      () => this.primary.getPredictionsByCycle(cycleId),
      () => this.fallback.getPredictionsByCycle(cycleId)
    );
  }

  async addObservation(observation: Observation): Promise<Observation> {
    return this.run(
      () => this.primary.addObservation(observation),
      () => this.fallback.addObservation(observation)
    );
  }

  async getObservation(id: UUID): Promise<Observation | undefined> {
    return this.run(
      () => this.primary.getObservation(id),
      () => this.fallback.getObservation(id)
    );
  }

  async getAllObservations(): Promise<Observation[]> {
    return this.run(
      () => this.primary.getAllObservations(),
      () => this.fallback.getAllObservations()
    );
  }

  async updateObservation(observation: Observation): Promise<Observation> {
    return this.run(
      () => this.primary.updateObservation(observation),
      () => this.fallback.updateObservation(observation)
    );
  }

  async deleteObservation(id: UUID): Promise<void> {
    return this.run(
      () => this.primary.deleteObservation(id),
      () => this.fallback.deleteObservation(id)
    );
  }

  async getObservationsByDate(date: string): Promise<Observation[]> {
    return this.run(
      () => this.primary.getObservationsByDate(date),
      () => this.fallback.getObservationsByDate(date)
    );
  }

  async getObservationsByType(type: string): Promise<Observation[]> {
    return this.run(
      () => this.primary.getObservationsByType(type),
      () => this.fallback.getObservationsByType(type)
    );
  }

  async getObservationsInRange(startDate: string, endDate: string): Promise<Observation[]> {
    return this.run(
      () => this.primary.getObservationsInRange(startDate, endDate),
      () => this.fallback.getObservationsInRange(startDate, endDate)
    );
  }

  async clearAll(): Promise<void> {
    return this.run(() => this.primary.clearAll(), () => this.fallback.clearAll());
  }

  close(): void {
    if (this.useFallback) {
      this.fallback.close();
      return;
    }
    this.primary.close();
  }
}

// Singleton instance for app-wide use
let dbInstance: FertileDBClient | null = null;

export function getDB(): FertileDBClient {
  if (!dbInstance) {
    dbInstance = new ResilientFertileDB();
  }
  return dbInstance;
}

// React hook for database access
export function useDB(): FertileDBClient {
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

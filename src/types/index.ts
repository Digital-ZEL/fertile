/**
 * Core domain types for Fertile app
 */

// Unique identifier type
export type UUID = string;

// Date in ISO format (YYYY-MM-DD)
export type ISODateString = string;

/**
 * Menstrual cycle record
 */
export interface Cycle {
  id: UUID;
  startDate: ISODateString; // First day of period
  length: number; // Total cycle length in days (typically 21-35)
  periodLength: number; // Days of menstruation (typically 3-7)
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Prediction source identifiers
 */
export type PredictionSource =
  | 'flo'
  | 'clue'
  | 'ovia'
  | 'natural-cycles'
  | 'fertility-friend'
  | 'manual'
  | 'fertile-algorithm';

/**
 * Fertile window prediction from any source
 */
export interface Prediction {
  id: UUID;
  source: PredictionSource;
  fertileStart: ISODateString;
  fertileEnd: ISODateString;
  ovulationDate?: ISODateString; // Predicted ovulation day
  confidence: number; // 0-100 percentage
  cycleId?: UUID; // Associated cycle
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Cervical mucus types (following standard fertility awareness)
 */
export type CervicalMucusType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg-white' | 'spotting';

/**
 * OPK (Ovulation Predictor Kit) result
 */
export type OPKResult = 'negative' | 'almost-positive' | 'positive' | 'invalid';

/**
 * Common symptoms that can indicate fertility
 */
export type SymptomType =
  | 'cramps'
  | 'bloating'
  | 'breast-tenderness'
  | 'headache'
  | 'mood-changes'
  | 'fatigue'
  | 'increased-libido'
  | 'mittelschmerz' // ovulation pain
  | 'acne'
  | 'other';

/**
 * Observation types for daily tracking
 */
export type ObservationType = 'cervical-mucus' | 'bbt' | 'opk' | 'symptom';

/**
 * Base observation interface
 */
export interface BaseObservation {
  id: UUID;
  date: ISODateString;
  type: ObservationType;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * Cervical mucus observation
 */
export interface CervicalMucusObservation extends BaseObservation {
  type: 'cervical-mucus';
  value: CervicalMucusType;
}

/**
 * Basal Body Temperature observation
 */
export interface BBTObservation extends BaseObservation {
  type: 'bbt';
  value: number; // Temperature in Fahrenheit (e.g., 97.8)
  time?: string; // Time taken (HH:MM)
}

/**
 * OPK result observation
 */
export interface OPKObservation extends BaseObservation {
  type: 'opk';
  value: OPKResult;
  brand?: string;
}

/**
 * Symptom observation
 */
export interface SymptomObservation extends BaseObservation {
  type: 'symptom';
  value: SymptomType;
  severity?: 1 | 2 | 3; // 1=mild, 2=moderate, 3=severe
}

/**
 * Union type for all observation types
 */
export type Observation =
  | CervicalMucusObservation
  | BBTObservation
  | OPKObservation
  | SymptomObservation;

/**
 * Helper to create new entities with auto-generated fields
 */
export function generateId(): UUID {
  return crypto.randomUUID();
}

export function getCurrentISODate(): ISODateString {
  return new Date().toISOString().split('T')[0];
}

export function getTimestamp(): ISODateString {
  return new Date().toISOString();
}

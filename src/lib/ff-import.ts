/**
 * Fertility Friend CSV Import Parser
 *
 * Parses CSV exports from Fertility Friend app and converts them
 * to the Fertile Observation format.
 */

import Papa from 'papaparse';
import type {
  Observation,
  CervicalMucusObservation,
  BBTObservation,
  OPKObservation,
} from '@/types';
import { generateId, getTimestamp } from '@/types';
import {
  FFRawObservation,
  FFCervicalMucus,
  FFOPKResult,
  ImportResult,
  ImportError,
  ImportWarning,
  ParsedCSVRow,
  mapFFCervicalMucus,
  mapFFOPKResult,
} from './types';

// Fertility Friend cervical mucus mapping
const CM_MAP: Record<string, FFCervicalMucus> = {
  dry: 'dry',
  d: 'dry',
  none: 'dry',
  sticky: 'sticky',
  s: 'sticky',
  tacky: 'sticky',
  creamy: 'creamy',
  c: 'creamy',
  lotiony: 'creamy',
  watery: 'watery',
  w: 'watery',
  eggwhite: 'eggwhite',
  'egg white': 'eggwhite',
  ew: 'eggwhite',
  e: 'eggwhite',
  stretchy: 'eggwhite',
};

// OPK result mapping
const OPK_MAP: Record<string, FFOPKResult> = {
  negative: 'negative',
  neg: 'negative',
  n: 'negative',
  '-': 'negative',
  positive: 'positive',
  pos: 'positive',
  p: 'positive',
  '+': 'positive',
  peak: 'peak',
  high: 'positive',
  low: 'negative',
};

// Intercourse mapping
const INTERCOURSE_MAP: Record<string, boolean> = {
  yes: true,
  y: true,
  '1': true,
  true: true,
  x: true,
  no: false,
  n: false,
  '0': false,
  false: false,
  '': false,
};

/**
 * Parse a date string from various formats to YYYY-MM-DD
 */
function parseDate(dateStr: string, rowNum: number): { date: string | null; error?: ImportError } {
  if (!dateStr || dateStr.trim() === '') {
    return {
      date: null,
      error: {
        row: rowNum,
        field: 'Date',
        message: 'Date is required',
        value: dateStr,
      },
    };
  }

  const cleaned = dateStr.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return { date: cleaned };
  }

  // Try MM/DD/YYYY format (common in US Fertility Friend exports)
  const usMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return { date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
  }

  // Try DD/MM/YYYY format
  const euMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    return { date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` };
  }

  // Try to parse with Date object as fallback
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().split('T')[0] };
  }

  return {
    date: null,
    error: {
      row: rowNum,
      field: 'Date',
      message: `Invalid date format: ${cleaned}`,
      value: cleaned,
    },
  };
}

/**
 * Parse temperature value
 */
function parseTemp(
  tempStr: string | undefined,
  rowNum: number
): { temp: number | undefined; warning?: ImportWarning } {
  if (!tempStr || tempStr.trim() === '') {
    return { temp: undefined };
  }

  const cleaned = tempStr.trim().replace(/[°FfCc]/g, '');
  const temp = parseFloat(cleaned);

  if (isNaN(temp)) {
    return {
      temp: undefined,
      warning: {
        row: rowNum,
        field: 'Temp',
        message: `Could not parse temperature: ${tempStr}`,
        value: tempStr,
      },
    };
  }

  // Validate reasonable BBT range (96-100°F typical)
  if (temp < 95 || temp > 101) {
    return {
      temp,
      warning: {
        row: rowNum,
        field: 'Temp',
        message: `Temperature ${temp}°F is outside typical BBT range (96-100°F)`,
        value: tempStr,
      },
    };
  }

  return { temp };
}

/**
 * Parse cervical mucus value
 */
function parseCervicalMucus(cmStr: string | undefined): FFCervicalMucus | undefined {
  if (!cmStr || cmStr.trim() === '') {
    return undefined;
  }

  const normalized = cmStr.trim().toLowerCase();
  return CM_MAP[normalized] || 'unknown';
}

/**
 * Parse OPK result
 */
function parseOPK(opkStr: string | undefined): FFOPKResult | undefined {
  if (!opkStr || opkStr.trim() === '') {
    return undefined;
  }

  const normalized = opkStr.trim().toLowerCase();
  return OPK_MAP[normalized] || 'unknown';
}

/**
 * Parse intercourse indicator
 */
function parseIntercourse(intStr: string | undefined): boolean | undefined {
  if (!intStr || intStr.trim() === '') {
    return undefined;
  }

  const normalized = intStr.trim().toLowerCase();
  return INTERCOURSE_MAP[normalized];
}

/**
 * Find the column name for a field (handles variations)
 */
function findColumn(row: ParsedCSVRow, possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    if (row[name] !== undefined) {
      return row[name];
    }
    // Case-insensitive search
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lowerName) {
        return row[key];
      }
    }
  }
  return undefined;
}

/**
 * Parse a single CSV row into raw observation data
 */
function parseRow(
  row: ParsedCSVRow,
  rowNum: number
): { observation: FFRawObservation | null; errors: ImportError[]; warnings: ImportWarning[] } {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];

  // Parse date (required)
  const dateStr = findColumn(row, ['Date', 'date', 'DATE']);
  const { date, error: dateError } = parseDate(dateStr || '', rowNum);

  if (dateError) {
    errors.push(dateError);
    return { observation: null, errors, warnings };
  }

  // Parse temperature
  const tempStr = findColumn(row, ['Temp', 'Temperature', 'BBT', 'temp', 'temperature']);
  const { temp, warning: tempWarning } = parseTemp(tempStr, rowNum);
  if (tempWarning) {
    warnings.push(tempWarning);
  }

  // Parse cervical mucus
  const cmStr = findColumn(row, [
    'Cervical Fluid',
    'CF',
    'CM',
    'Cervical Mucus',
    'cervical fluid',
    'Fluid',
  ]);
  const cervicalMucus = parseCervicalMucus(cmStr);

  // Parse OPK
  const opkStr = findColumn(row, ['OPK', 'opk', 'LH Test', 'Ovulation Test']);
  const opk = parseOPK(opkStr);

  // Parse intercourse
  const intStr = findColumn(row, ['Intercourse', 'intercourse', 'BD', 'Sex']);
  const intercourse = parseIntercourse(intStr);

  // Parse notes
  const notes = findColumn(row, ['Notes', 'notes', 'Note', 'Comments', 'Memo']);

  const observation: FFRawObservation = {
    date: date!,
    ...(temp !== undefined && { temp }),
    ...(cervicalMucus && { cervicalMucus }),
    ...(opk && { opk }),
    ...(intercourse !== undefined && { intercourse }),
    ...(notes && notes.trim() !== '' && { notes: notes.trim() }),
  };

  return { observation, errors, warnings };
}

/**
 * Main function to parse Fertility Friend CSV export
 */
export function parseFFCSV(csvContent: string): ImportResult {
  const errors: ImportError[] = [];
  const warnings: ImportWarning[] = [];
  const observations: FFRawObservation[] = [];

  // Parse CSV with PapaParse
  const parsed = Papa.parse<ParsedCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  // Check for parse errors
  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push({
        row: err.row ?? 0,
        field: 'CSV',
        message: err.message,
      });
    }
  }

  // Process each row
  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2; // +2 because of header row and 1-based indexing

    const result = parseRow(row, rowNum);

    errors.push(...result.errors);
    warnings.push(...result.warnings);

    if (result.observation) {
      observations.push(result.observation);
    }
  }

  // Sort observations by date
  observations.sort((a, b) => a.date.localeCompare(b.date));

  // Check for duplicate dates in import
  const datesSeen = new Set<string>();
  for (const obs of observations) {
    if (datesSeen.has(obs.date)) {
      warnings.push({
        row: 0,
        field: 'Date',
        message: `Duplicate date found: ${obs.date}`,
        value: obs.date,
      });
    }
    datesSeen.add(obs.date);
  }

  return {
    success: errors.length === 0,
    observations,
    errors,
    warnings,
  };
}

/**
 * Convert raw FF observations to app Observation types
 * Creates separate observation records for each data type (BBT, CM, OPK)
 */
export function convertToObservations(rawObservations: FFRawObservation[]): Observation[] {
  const observations: Observation[] = [];
  const timestamp = getTimestamp();

  for (const raw of rawObservations) {
    // Create BBT observation if temp exists
    if (raw.temp !== undefined) {
      const bbt: BBTObservation = {
        id: generateId(),
        date: raw.date,
        type: 'bbt',
        value: raw.temp,
        notes: raw.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      observations.push(bbt);
    }

    // Create cervical mucus observation if CM exists
    if (raw.cervicalMucus && raw.cervicalMucus !== 'unknown') {
      const cm: CervicalMucusObservation = {
        id: generateId(),
        date: raw.date,
        type: 'cervical-mucus',
        value: mapFFCervicalMucus(raw.cervicalMucus),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      observations.push(cm);
    }

    // Create OPK observation if OPK exists
    if (raw.opk && raw.opk !== 'unknown') {
      const opk: OPKObservation = {
        id: generateId(),
        date: raw.date,
        type: 'opk',
        value: mapFFOPKResult(raw.opk),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      observations.push(opk);
    }
  }

  return observations;
}

/**
 * Get preview of CSV data (first N rows)
 */
export function getCSVPreview(csvContent: string, maxRows: number = 10): ParsedCSVRow[] {
  const parsed = Papa.parse<ParsedCSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    preview: maxRows,
    transformHeader: (header) => header.trim(),
  });

  return parsed.data;
}

/**
 * Validate that the CSV has required columns
 */
export function validateCSVStructure(csvContent: string): {
  valid: boolean;
  missingColumns: string[];
  foundColumns: string[];
} {
  const parsed = Papa.parse<ParsedCSVRow>(csvContent, {
    header: true,
    preview: 1,
    transformHeader: (header) => header.trim(),
  });

  const headers = parsed.meta.fields || [];
  const headersLower = headers.map((h) => h.toLowerCase());

  const requiredColumns = ['date'];

  const missingColumns: string[] = [];

  for (const required of requiredColumns) {
    const found = headersLower.some((h) => h.includes(required));
    if (!found) {
      missingColumns.push(required);
    }
  }

  return {
    valid: missingColumns.length === 0,
    missingColumns,
    foundColumns: headers,
  };
}

/**
 * POST /api/import
 *
 * Accepts Fertility Friend CSV data, returns parsed cycles and observations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, corsHeaders, handleCors } from '../_middleware/auth';
import { parseFFCSV, convertToObservations, validateCSVStructure } from '@/lib/ff-import';

export async function OPTIONS() {
  return handleCors();
}

interface ImportRequest {
  csv: string; // Raw CSV content
  format?: 'fertility-friend'; // Future: support other formats
}

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) return auth.error!;

  try {
    const body: ImportRequest = await request.json();

    if (!body.csv || typeof body.csv !== 'string') {
      return NextResponse.json(
        { error: 'csv field is required (string of CSV content)' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate CSV structure
    const structure = validateCSVStructure(body.csv);
    if (!structure.valid) {
      return NextResponse.json(
        {
          error: 'Invalid CSV structure',
          missingColumns: structure.missingColumns,
          foundColumns: structure.foundColumns,
        },
        { status: 422, headers: corsHeaders() }
      );
    }

    // Parse the CSV
    const result = parseFFCSV(body.csv);

    // Convert to app observations
    const observations = convertToObservations(result.observations);

    // Detect cycles from the data (group by gaps > 20 days)
    const cycles = detectCyclesFromObservations(result.observations);

    const response = {
      success: result.success,
      summary: {
        totalRows: result.observations.length,
        observationsCreated: observations.length,
        cyclesDetected: cycles.length,
        errors: result.errors.length,
        warnings: result.warnings.length,
      },
      cycles,
      observations: observations.map((obs) => ({
        id: obs.id,
        date: obs.date,
        type: obs.type,
        value: 'value' in obs ? obs.value : undefined,
        notes: obs.notes,
      })),
      errors: result.errors,
      warnings: result.warnings,
      meta: {
        format: body.format || 'fertility-friend',
        columnsFound: structure.foundColumns,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to import data: ${message}` },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * Detect cycle boundaries from raw observation data.
 * A new cycle starts when there's a gap of observation dates or
 * we see a pattern suggesting period start.
 */
function detectCyclesFromObservations(
  rawObs: Array<{ date: string; temp?: number; cervicalMucus?: string }>
): Array<{ startDate: string; endDate: string; length: number }> {
  if (rawObs.length === 0) return [];

  const sorted = [...rawObs].sort((a, b) => a.date.localeCompare(b.date));
  const dates = [...new Set(sorted.map((o) => o.date))].sort();

  if (dates.length < 2) return [];

  // Simple heuristic: a cycle is typically 21-35 days
  // Group dates into cycles by looking for gaps or using ~28 day windows
  const cycles: Array<{ startDate: string; endDate: string; length: number }> = [];
  let cycleStart = dates[0];

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T00:00:00Z');
    const curr = new Date(dates[i] + 'T00:00:00Z');
    const gap = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));

    // If gap > 7 days, likely a new tracking period
    if (gap > 7) {
      const start = new Date(cycleStart + 'T00:00:00Z');
      const end = prev;
      const length = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (length >= 14) {
        cycles.push({ startDate: cycleStart, endDate: dates[i - 1], length });
      }
      cycleStart = dates[i];
    }
  }

  // Add last cycle
  const start = new Date(cycleStart + 'T00:00:00Z');
  const end = new Date(dates[dates.length - 1] + 'T00:00:00Z');
  const length = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (length >= 14) {
    cycles.push({ startDate: cycleStart, endDate: dates[dates.length - 1], length });
  }

  return cycles;
}

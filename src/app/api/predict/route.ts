/**
 * POST /api/predict
 *
 * Accepts cycle history + optional symptoms, returns fertile window prediction.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, corsHeaders, handleCors } from '../_middleware/auth';
import { predictFromCalendar } from '@/lib/predictors/calendar';
import { predictFromSymptoms } from '@/lib/predictors/symptoms';
import { predictCombined, assessPredictionQuality } from '@/lib/predictors/combined';
import type { Cycle, Observation, CervicalMucusObservation, OPKObservation, BBTObservation } from '@/types';
import { generateId, getTimestamp } from '@/types';

export async function OPTIONS() {
  return handleCors();
}

interface PredictRequest {
  currentCycleStart: string; // YYYY-MM-DD
  cycles?: Array<{
    startDate: string;
    length: number;
    periodLength?: number;
  }>;
  symptoms?: {
    bbt?: Array<{ date: string; value: number }>;
    cervicalMucus?: Array<{ date: string; value: string }>;
    opk?: Array<{ date: string; value: string }>;
  };
}

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) return auth.error!;

  try {
    const body: PredictRequest = await request.json();

    // Validate required fields
    if (!body.currentCycleStart) {
      return NextResponse.json(
        { error: 'currentCycleStart is required (YYYY-MM-DD)' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.currentCycleStart)) {
      return NextResponse.json(
        { error: 'currentCycleStart must be YYYY-MM-DD format' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Build historical cycles
    const now = getTimestamp();
    const historicalCycles: Cycle[] = (body.cycles || []).map((c) => ({
      id: generateId(),
      startDate: c.startDate,
      length: c.length,
      periodLength: c.periodLength ?? 5,
      createdAt: now,
      updatedAt: now,
    }));

    // Build observations from symptoms
    const observations: Observation[] = [];

    if (body.symptoms?.bbt) {
      for (const entry of body.symptoms.bbt) {
        const obs: BBTObservation = {
          id: generateId(),
          date: entry.date,
          type: 'bbt',
          value: entry.value,
          createdAt: now,
          updatedAt: now,
        };
        observations.push(obs);
      }
    }

    if (body.symptoms?.cervicalMucus) {
      for (const entry of body.symptoms.cervicalMucus) {
        const validTypes = ['dry', 'sticky', 'creamy', 'watery', 'egg-white', 'spotting'];
        const value = validTypes.includes(entry.value) ? entry.value : 'dry';
        const obs: CervicalMucusObservation = {
          id: generateId(),
          date: entry.date,
          type: 'cervical-mucus',
          value: value as CervicalMucusObservation['value'],
          createdAt: now,
          updatedAt: now,
        };
        observations.push(obs);
      }
    }

    if (body.symptoms?.opk) {
      for (const entry of body.symptoms.opk) {
        const validResults = ['negative', 'almost-positive', 'positive', 'invalid'];
        const value = validResults.includes(entry.value) ? entry.value : 'invalid';
        const obs: OPKObservation = {
          id: generateId(),
          date: entry.date,
          type: 'opk',
          value: value as OPKObservation['value'],
          createdAt: now,
          updatedAt: now,
        };
        observations.push(obs);
      }
    }

    // Run combined prediction
    const prediction = predictCombined({
      currentCycleStart: body.currentCycleStart,
      historicalCycles,
      observations: observations.length > 0 ? observations : undefined,
    });

    // Assess quality
    const quality = assessPredictionQuality({
      currentCycleStart: body.currentCycleStart,
      historicalCycles,
      observations: observations.length > 0 ? observations : undefined,
    });

    if (!prediction) {
      return NextResponse.json(
        { error: 'Insufficient data for prediction' },
        { status: 422, headers: corsHeaders() }
      );
    }

    const response = {
      prediction: {
        fertileStart: prediction.fertileStart instanceof Date
          ? prediction.fertileStart.toISOString().split('T')[0]
          : prediction.fertileStart,
        fertileEnd: prediction.fertileEnd instanceof Date
          ? prediction.fertileEnd.toISOString().split('T')[0]
          : prediction.fertileEnd,
        ovulationDate: prediction.ovulationDate
          ? (prediction.ovulationDate instanceof Date
              ? prediction.ovulationDate.toISOString().split('T')[0]
              : prediction.ovulationDate)
          : null,
        confidence: Math.round(prediction.confidence * 100),
        explanations: prediction.explain,
      },
      quality: {
        overall: quality.overall,
        score: quality.score,
        factors: quality.factors,
        recommendations: quality.recommendations,
      },
      meta: {
        cyclesAnalyzed: historicalCycles.length,
        observationsUsed: observations.length,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to process prediction: ${message}` },
      { status: 500, headers: corsHeaders() }
    );
  }
}

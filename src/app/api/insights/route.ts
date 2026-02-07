/**
 * POST /api/insights
 *
 * Accepts cycle data, returns AI-generated insights including
 * cycle regularity, trend analysis, anomaly detection, and recommendations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, corsHeaders, handleCors } from '../_middleware/auth';

export async function OPTIONS() {
  return handleCors();
}

interface InsightsRequest {
  cycles: Array<{
    startDate: string;
    length: number;
    periodLength?: number;
  }>;
  observations?: Array<{
    date: string;
    type: string;
    value: string | number;
  }>;
}

interface Insight {
  category: 'regularity' | 'trend' | 'anomaly' | 'health';
  severity: 'info' | 'note' | 'warning';
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const auth = validateApiKey(request);
  if (!auth.authenticated) return auth.error!;

  try {
    const body: InsightsRequest = await request.json();

    if (!body.cycles || !Array.isArray(body.cycles) || body.cycles.length === 0) {
      return NextResponse.json(
        { error: 'cycles array is required with at least one entry' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const insights: Insight[] = [];
    const lengths = body.cycles.map((c) => c.length);
    const periodLengths = body.cycles.filter((c) => c.periodLength).map((c) => c.periodLength!);

    // === REGULARITY ANALYSIS ===
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((s, l) => s + Math.pow(l - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const shortest = Math.min(...lengths);
    const longest = Math.max(...lengths);

    insights.push({
      category: 'regularity',
      severity: 'info',
      title: 'Cycle Length Summary',
      description: `Average cycle: ${mean.toFixed(1)} days (range ${shortest}–${longest}). Standard deviation: ${stdDev.toFixed(1)} days.`,
      data: { mean: +mean.toFixed(1), stdDev: +stdDev.toFixed(1), shortest, longest, count: lengths.length },
    });

    if (stdDev <= 2) {
      insights.push({
        category: 'regularity',
        severity: 'info',
        title: 'Very Regular Cycles',
        description: 'Your cycles are highly regular (±2 days), which makes calendar-based predictions more reliable.',
      });
    } else if (stdDev <= 4) {
      insights.push({
        category: 'regularity',
        severity: 'note',
        title: 'Moderately Regular Cycles',
        description: 'Your cycles show moderate variation. Consider supplementing with OPK or cervical mucus tracking for better accuracy.',
      });
    } else {
      insights.push({
        category: 'regularity',
        severity: 'warning',
        title: 'Irregular Cycles Detected',
        description: `Your cycle length varies significantly (±${stdDev.toFixed(1)} days). Calendar-only predictions will be less reliable. Symptom-based tracking is strongly recommended.`,
      });
    }

    // === TREND ANALYSIS ===
    if (lengths.length >= 3) {
      const recentHalf = lengths.slice(-Math.ceil(lengths.length / 2));
      const olderHalf = lengths.slice(0, Math.floor(lengths.length / 2));
      const recentMean = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
      const olderMean = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
      const drift = recentMean - olderMean;

      if (Math.abs(drift) >= 2) {
        insights.push({
          category: 'trend',
          severity: drift > 3 ? 'warning' : 'note',
          title: drift > 0 ? 'Cycles Getting Longer' : 'Cycles Getting Shorter',
          description: `Recent cycles average ${recentMean.toFixed(1)} days vs ${olderMean.toFixed(1)} days earlier — a shift of ${drift > 0 ? '+' : ''}${drift.toFixed(1)} days.`,
          data: { recentMean: +recentMean.toFixed(1), olderMean: +olderMean.toFixed(1), drift: +drift.toFixed(1) },
        });
      } else {
        insights.push({
          category: 'trend',
          severity: 'info',
          title: 'Stable Cycle Length',
          description: 'No significant trend in cycle length over time.',
        });
      }
    }

    // === ANOMALY DETECTION ===
    if (lengths.length >= 3) {
      const anomalies: Array<{ index: number; length: number; zscore: number }> = [];
      for (let i = 0; i < lengths.length; i++) {
        const z = stdDev > 0 ? Math.abs(lengths[i] - mean) / stdDev : 0;
        if (z > 2) {
          anomalies.push({ index: i, length: lengths[i], zscore: +z.toFixed(2) });
        }
      }

      if (anomalies.length > 0) {
        insights.push({
          category: 'anomaly',
          severity: 'warning',
          title: `${anomalies.length} Unusual Cycle${anomalies.length > 1 ? 's' : ''} Detected`,
          description: `Cycle${anomalies.length > 1 ? 's' : ''} with lengths ${anomalies.map((a) => a.length).join(', ')} days deviate significantly from your average.`,
          data: { anomalies },
        });
      }

      // Check for very short or very long cycles
      const veryShort = lengths.filter((l) => l < 21);
      const veryLong = lengths.filter((l) => l > 35);

      if (veryShort.length > 0) {
        insights.push({
          category: 'anomaly',
          severity: 'warning',
          title: 'Short Cycles Detected',
          description: `${veryShort.length} cycle(s) under 21 days. Very short cycles may indicate anovulation or other factors worth discussing with a healthcare provider.`,
        });
      }

      if (veryLong.length > 0) {
        insights.push({
          category: 'anomaly',
          severity: 'warning',
          title: 'Long Cycles Detected',
          description: `${veryLong.length} cycle(s) over 35 days. Extended cycles can be normal but may also indicate PCOS or hormonal changes.`,
        });
      }
    }

    // === PERIOD LENGTH ANALYSIS ===
    if (periodLengths.length >= 2) {
      const avgPeriod = periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length;
      if (avgPeriod > 7) {
        insights.push({
          category: 'health',
          severity: 'note',
          title: 'Longer Than Average Periods',
          description: `Your average period length is ${avgPeriod.toFixed(1)} days. Periods over 7 days may be worth mentioning to your healthcare provider.`,
        });
      }
    }

    // === HEALTH RECOMMENDATIONS ===
    insights.push({
      category: 'health',
      severity: 'info',
      title: 'Data Quality Recommendation',
      description: lengths.length < 6
        ? `You have ${lengths.length} cycles logged. Tracking 6+ cycles significantly improves prediction accuracy.`
        : `With ${lengths.length} cycles tracked, you have a solid data foundation for predictions.`,
    });

    if (!body.observations || body.observations.length === 0) {
      insights.push({
        category: 'health',
        severity: 'note',
        title: 'Consider Symptom Tracking',
        description: 'Adding daily observations (cervical mucus, OPK, BBT) can improve prediction accuracy from ~60% to ~90%+.',
      });
    }

    // === BBT ANALYSIS ===
    if (body.observations) {
      const bbtObs = body.observations.filter((o) => o.type === 'bbt' && typeof o.value === 'number');
      if (bbtObs.length >= 10) {
        const temps = bbtObs.map((o) => o.value as number);
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
        const tempStdDev = Math.sqrt(temps.reduce((s, t) => s + Math.pow(t - avgTemp, 2), 0) / temps.length);

        insights.push({
          category: 'health',
          severity: 'info',
          title: 'BBT Summary',
          description: `Average BBT: ${avgTemp.toFixed(2)}°F, variation: ±${tempStdDev.toFixed(2)}°F across ${bbtObs.length} readings.`,
          data: { avgTemp: +avgTemp.toFixed(2), tempStdDev: +tempStdDev.toFixed(2), readings: bbtObs.length },
        });
      }
    }

    const response = {
      insights,
      summary: {
        totalInsights: insights.length,
        byCategory: {
          regularity: insights.filter((i) => i.category === 'regularity').length,
          trend: insights.filter((i) => i.category === 'trend').length,
          anomaly: insights.filter((i) => i.category === 'anomaly').length,
          health: insights.filter((i) => i.category === 'health').length,
        },
        bySeverity: {
          info: insights.filter((i) => i.severity === 'info').length,
          note: insights.filter((i) => i.severity === 'note').length,
          warning: insights.filter((i) => i.severity === 'warning').length,
        },
      },
      meta: {
        cyclesAnalyzed: body.cycles.length,
        observationsAnalyzed: body.observations?.length ?? 0,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { headers: corsHeaders() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate insights: ${message}` },
      { status: 500, headers: corsHeaders() }
    );
  }
}

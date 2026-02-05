'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePredictions, useReconciled } from '@/hooks';
import { ConfidenceBar } from '@/components';
import type { ISODateString } from '@/types';

/**
 * Format date for display
 */
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

interface TimelineDay {
  date: ISODateString;
  sources: {
    source: string;
    isFertile: boolean;
    isOvulation: boolean;
  }[];
  isConsensus: boolean;
  isConsensusOvulation: boolean;
}

/**
 * Compare page - Side-by-side source comparison with timeline
 */
export default function ComparePage() {
  const { predictions, loading } = usePredictions();
  const { window } = useReconciled(predictions);

  // Get active predictions (not in the past)
  const activePredictions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return predictions.filter((p) => p.fertileEnd >= today);
  }, [predictions]);

  // Build timeline data
  const timeline = useMemo((): TimelineDay[] => {
    if (activePredictions.length === 0) return [];

    // Find date range across all predictions
    const allStarts = activePredictions.map((p) => p.fertileStart);
    const allEnds = activePredictions.map((p) => p.fertileEnd);

    const minDate = allStarts.sort()[0];
    const maxDate = allEnds.sort().reverse()[0];

    // Add buffer days before and after
    const startDate = new Date(parseDate(minDate));
    startDate.setDate(startDate.getDate() - 2);
    const endDate = new Date(parseDate(maxDate));
    endDate.setDate(endDate.getDate() + 2);

    // Generate timeline
    const days: TimelineDay[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];

      const sources = activePredictions.map((p) => ({
        source: p.source,
        isFertile: dateStr >= p.fertileStart && dateStr <= p.fertileEnd,
        isOvulation: p.ovulationDate === dateStr,
      }));

      days.push({
        date: dateStr,
        sources,
        isConsensus: window
          ? dateStr >= window.fertileStart && dateStr <= window.fertileEnd
          : false,
        isConsensusOvulation: window?.ovulationDate === dateStr,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [activePredictions, window]);

  // Count agreements for each source
  const sourceStats = useMemo(() => {
    if (!window || activePredictions.length === 0) return [];

    return activePredictions.map((p) => {
      const startDiff = Math.abs(daysBetween(p.fertileStart, window.fertileStart));
      const endDiff = Math.abs(daysBetween(p.fertileEnd, window.fertileEnd));
      const avgDiff = (startDiff + endDiff) / 2;

      let agreement: 'agree' | 'partial' | 'disagree';
      if (avgDiff <= 1) {
        agreement = 'agree';
      } else if (avgDiff <= 3) {
        agreement = 'partial';
      } else {
        agreement = 'disagree';
      }

      return {
        prediction: p,
        startDiff,
        endDiff,
        agreement,
      };
    });
  }, [activePredictions, window]);

  // Unique sources for legend
  const sources = activePredictions.map((p) => p.source);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        </div>
      </div>
    );
  }

  if (activePredictions.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-4 text-6xl">📊</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">No predictions to compare</h1>
          <p className="mb-6 max-w-md text-center text-gray-500">
            Add predictions from multiple fertility apps to see how they compare.
          </p>
          <Link
            href="/import"
            className="rounded-lg bg-pink-500 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-600"
          >
            Import Predictions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Compare Predictions</h1>
          <p className="mt-1 text-gray-500">
            {activePredictions.length} source{activePredictions.length !== 1 ? 's' : ''} compared
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Visual Timeline */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Timeline Comparison</h2>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-6 rounded bg-pink-500" />
            <span>Consensus window</span>
          </div>
          {sources.map((source, index) => (
            <div key={source} className="flex items-center gap-2">
              <div
                className="h-3 w-6 rounded"
                style={{
                  backgroundColor: `hsl(${(index * 60 + 180) % 360}, 70%, 60%)`,
                }}
              />
              <span className="capitalize">{source.replace(/-/g, ' ')}</span>
            </div>
          ))}
        </div>

        {/* Timeline grid */}
        <div className="min-w-[600px]">
          {/* Date header */}
          <div className="mb-2 flex">
            <div className="w-28 flex-shrink-0" />
            <div className="flex flex-1 gap-px">
              {timeline.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 text-center text-xs text-gray-500"
                >
                  {formatDisplayDate(day.date)}
                </div>
              ))}
            </div>
          </div>

          {/* Consensus row */}
          <div className="mb-1 flex items-center">
            <div className="w-28 flex-shrink-0 pr-2 text-right text-sm font-medium text-gray-700">
              Consensus
            </div>
            <div className="flex flex-1 gap-px">
              {timeline.map((day) => (
                <div
                  key={day.date}
                  className={`flex h-8 flex-1 items-center justify-center rounded text-xs ${
                    day.isConsensusOvulation
                      ? 'bg-pink-600 text-white font-bold'
                      : day.isConsensus
                        ? 'bg-pink-200'
                        : 'bg-gray-100'
                  }`}
                >
                  {day.isConsensusOvulation && '⬤'}
                </div>
              ))}
            </div>
          </div>

          {/* Source rows */}
          {sources.map((source, sourceIndex) => (
            <div key={source} className="mb-1 flex items-center">
              <div className="w-28 flex-shrink-0 truncate pr-2 text-right text-sm text-gray-600 capitalize">
                {source.replace(/-/g, ' ')}
              </div>
              <div className="flex flex-1 gap-px">
                {timeline.map((day) => {
                  const sourceData = day.sources.find((s) => s.source === source);
                  const isFertile = sourceData?.isFertile || false;
                  const isOvulation = sourceData?.isOvulation || false;

                  // Agreement with consensus
                  const agreesWithConsensus = isFertile === day.isConsensus;

                  return (
                    <div
                      key={day.date}
                      className={`flex h-8 flex-1 items-center justify-center rounded text-xs ${
                        isOvulation
                          ? 'text-white font-bold'
                          : isFertile
                            ? ''
                            : 'bg-gray-50'
                      } ${
                        !isFertile && !day.isConsensus
                          ? '' // Both say not fertile - OK
                          : isFertile && day.isConsensus
                            ? agreesWithConsensus
                              ? '' // Agreement
                              : '' // Both fertile, agreement
                            : 'ring-2 ring-inset ring-orange-300' // Disagreement
                      }`}
                      style={{
                        backgroundColor: isFertile
                          ? isOvulation
                            ? `hsl(${(sourceIndex * 60 + 180) % 360}, 70%, 40%)`
                            : `hsl(${(sourceIndex * 60 + 180) % 360}, 70%, 80%)`
                          : undefined,
                      }}
                    >
                      {isOvulation && '⬤'}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Disagreement legend */}
        <div className="mt-4 text-xs text-gray-500">
          <span className="inline-block h-4 w-4 rounded ring-2 ring-inset ring-orange-300" /> = Source
          disagrees with consensus
        </div>
      </div>

      {/* Side-by-side Source Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sourceStats.map(({ prediction, startDiff, endDiff, agreement }) => (
          <div
            key={prediction.id}
            className={`rounded-2xl border bg-white p-6 shadow-sm ${
              agreement === 'agree'
                ? 'border-green-200'
                : agreement === 'partial'
                  ? 'border-yellow-200'
                  : 'border-red-200'
            }`}
          >
            {/* Source header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold capitalize text-gray-900">
                {prediction.source.replace(/-/g, ' ')}
              </h3>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  agreement === 'agree'
                    ? 'bg-green-100 text-green-700'
                    : agreement === 'partial'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {agreement === 'agree'
                  ? '✓ Agrees'
                  : agreement === 'partial'
                    ? '~ Close'
                    : '✗ Differs'}
              </span>
            </div>

            {/* Prediction details */}
            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fertile Start</span>
                <span className="font-medium text-gray-900">
                  {formatDisplayDate(prediction.fertileStart)}
                  {startDiff > 0 && (
                    <span className="ml-1 text-xs text-gray-400">
                      ({startDiff > 0 ? '+' : ''}{startDiff}d)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fertile End</span>
                <span className="font-medium text-gray-900">
                  {formatDisplayDate(prediction.fertileEnd)}
                  {endDiff > 0 && (
                    <span className="ml-1 text-xs text-gray-400">
                      ({endDiff > 0 ? '+' : ''}{endDiff}d)
                    </span>
                  )}
                </span>
              </div>
              {prediction.ovulationDate && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ovulation</span>
                  <span className="font-medium text-pink-600">
                    {formatDisplayDate(prediction.ovulationDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Confidence */}
            <div className="mb-4">
              <ConfidenceBar confidence={prediction.confidence} />
            </div>

            {/* Contribution to consensus */}
            {window && (
              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                {agreement === 'agree' ? (
                  <p>✓ This source strongly influenced the consensus window.</p>
                ) : agreement === 'partial' ? (
                  <p>~ This source partially influenced the consensus, with some deviation.</p>
                ) : (
                  <p>
                    ⚠ This source differs significantly from consensus. Consider reviewing the
                    underlying data.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add more sources CTA */}
      <div className="mt-8 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-8 text-center">
        <p className="mb-4 text-gray-600">
          More sources = higher confidence in your unified window
        </p>
        <Link
          href="/import"
          className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-600"
        >
          <span>+ Add Another Source</span>
        </Link>
      </div>
    </div>
  );
}

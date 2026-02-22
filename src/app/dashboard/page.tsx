'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePredictions, useReconciled } from '@/hooks';
import { Calendar, ConfidenceMeter, ConfidenceBar } from '@/components';
import type { ISODateString } from '@/types';
import { trackEvent } from '@/lib/analytics';

/**
 * Format date for display
 */
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Dashboard page - Main user view showing unified fertile window
 */
export default function Dashboard() {
  const { predictions, loading, refresh } = usePredictions();
  const { window, isInWindow, daysUntilWindow, daysIntoWindow } = useReconciled(predictions);

  const [selectedDate, setSelectedDate] = useState<ISODateString | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refresh]);

  // Day click handler
  const handleDayClick = useCallback((date: ISODateString) => {
    setSelectedDate((prev) => (prev === date ? null : date));
  }, []);

  // Swipe state for mobile sections
  const [activeSection, setActiveSection] = useState(0);
  const sections = ['overview', 'calendar', 'sources'];

  useEffect(() => {
    trackEvent('dashboard_view');
  }, []);

  useEffect(() => {
    trackEvent('prediction_generated', { sourceCount: predictions.length });
  }, [predictions.length]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-200 border-t-pink-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Pull-to-refresh indicator */}
      {isRefreshing && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2">
          <div className="rounded-full bg-pink-500 px-4 py-2 text-sm text-white shadow-lg">
            Refreshing...
          </div>
        </div>
      )}

      {/* Mobile section tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 sm:hidden">
        {sections.map((section, index) => (
          <button
            key={section}
            onClick={() => setActiveSection(index)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === index
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Desktop: Full layout / Mobile: Active section */}
      {predictions.length < 2 && (
        <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="font-medium">Increase prediction confidence</p>
          <p className="mt-1">
            Add at least one more source in <a className="underline" href="/import">Import</a>, then tune source weighting in <a className="underline" href="/settings">Settings</a>.
          </p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hero Card: Unified Fertile Window */}
        <div
          className={`rounded-2xl border border-pink-100 bg-white p-6 shadow-sm lg:col-span-2 ${
            activeSection !== 0 ? 'hidden sm:block' : ''
          }`}
        >
          {window ? (
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              {/* Window Info */}
              <div className="flex-1">
                <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-pink-600">
                  Unified Fertile Window
                </h2>

                {/* Date range */}
                <div className="mb-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatDisplayDate(window.fertileStart)} —{' '}
                    {formatDisplayDate(window.fertileEnd)}
                  </p>
                  {window.ovulationDate && (
                    <p className="mt-1 text-sm text-gray-600">
                      🎯 Ovulation: {formatDisplayDate(window.ovulationDate)}
                    </p>
                  )}
                </div>

                {/* Today indicator / Countdown */}
                {isInWindow ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-green-800">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
                    </span>
                    <span className="font-medium">
                      You&apos;re in your fertile window! (Day {(daysIntoWindow || 0) + 1})
                    </span>
                  </div>
                ) : daysUntilWindow !== null ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2 text-pink-700">
                    <span className="text-lg">⏳</span>
                    <span className="font-medium">
                      {daysUntilWindow === 0
                        ? 'Starts today!'
                        : daysUntilWindow === 1
                          ? '1 day until fertile window'
                          : `${daysUntilWindow} days until fertile window`}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-gray-600">
                    <span>Window has passed</span>
                  </div>
                )}

                {/* Agreement badge */}
                <div className="mt-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      window.agreementLevel === 'high'
                        ? 'bg-green-100 text-green-800'
                        : window.agreementLevel === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {window.agreementLevel === 'high'
                      ? '✓ Strong agreement'
                      : window.agreementLevel === 'medium'
                        ? '~ Moderate agreement'
                        : '⚠ Low agreement'}
                    {' · '}
                    {window.sources.length} source{window.sources.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="flex justify-center md:justify-end">
                <ConfidenceMeter confidence={window.confidence} size="lg" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 text-6xl">📊</div>
              <h2 className="mb-2 text-xl font-semibold text-gray-900">No predictions yet</h2>
              <p className="mb-6 max-w-md text-center text-gray-500">
                Add predictions from your fertility apps to see your unified fertile window.
              </p>
              <Link
                href="/import"
                className="rounded-lg bg-pink-500 px-6 py-3 font-medium text-white transition-colors hover:bg-pink-600"
              >
                Import Predictions
              </Link>
            </div>
          )}
        </div>

        {/* Explanations Card */}
        {window && window.explain.length > 0 && (
          <div
            className={`rounded-2xl border border-pink-100 bg-white p-6 shadow-sm ${
              activeSection !== 0 ? 'hidden sm:block' : ''
            }`}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900">How we calculated this</h3>
            <ul className="space-y-3">
              {window.explain.map((exp, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                      exp.impact === 'positive'
                        ? 'bg-green-100 text-green-600'
                        : exp.impact === 'negative'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {exp.impact === 'positive' ? '✓' : exp.impact === 'negative' ? '!' : '•'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{exp.factor}</p>
                    <p className="text-sm text-gray-600">{exp.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources Summary Card */}
        {window && window.sources.length > 0 && (
          <div
            className={`rounded-2xl border border-pink-100 bg-white p-6 shadow-sm ${
              activeSection !== 2 ? 'hidden sm:block' : ''
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Prediction Sources</h3>
              <Link
                href="/compare"
                className="text-sm font-medium text-pink-600 hover:text-pink-700"
              >
                Compare →
              </Link>
            </div>
            <ul className="space-y-3">
              {window.sources.map((source) => (
                <li
                  key={source.source}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                        source.agreesWithConsensus
                          ? 'bg-green-100 text-green-600'
                          : 'bg-orange-100 text-orange-600'
                      }`}
                    >
                      {source.agreesWithConsensus ? '✓' : '~'}
                    </span>
                    <div>
                      <p className="font-medium capitalize text-gray-900">
                        {source.source.replace(/-/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {source.agreesWithConsensus
                          ? 'Agrees with consensus'
                          : `${source.deviation.toFixed(1)} days off`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <ConfidenceBar confidence={source.weight * 100} showPercentage={false} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Link
                href="/import"
                className="block w-full rounded-lg border-2 border-dashed border-pink-200 py-3 text-center text-sm font-medium text-pink-600 transition-colors hover:border-pink-300 hover:bg-pink-50"
              >
                + Add Another Source
              </Link>
            </div>
          </div>
        )}

        {/* Calendar Card */}
        <div
          className={`rounded-2xl border border-pink-100 bg-white p-6 shadow-sm lg:col-span-2 ${
            activeSection !== 1 ? 'hidden sm:block' : ''
          }`}
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Cycle Calendar</h3>
          <Calendar window={window} onDayClick={handleDayClick} selectedDate={selectedDate} />

          {/* Selected day details */}
          {selectedDate && window && (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="font-medium text-gray-900">{formatDisplayDate(selectedDate)}</p>
              {selectedDate >= window.fertileStart && selectedDate <= window.fertileEnd ? (
                <div className="mt-1 text-sm text-gray-600">
                  {window.ovulationDate === selectedDate && (
                    <span className="font-medium text-pink-600">🎯 Predicted ovulation day</span>
                  )}
                  {window.peakDays.includes(selectedDate) &&
                    window.ovulationDate !== selectedDate && (
                      <span className="font-medium text-pink-600">🔥 Peak fertility day</span>
                    )}
                  {!window.peakDays.includes(selectedDate) &&
                    window.ovulationDate !== selectedDate && (
                      <span className="text-green-600">Fertile day</span>
                    )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-500">Not in fertile window</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Refresh button */}
      <div className="fixed bottom-20 right-4 sm:hidden">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          aria-label="Refresh predictions"
        >
          <svg
            className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

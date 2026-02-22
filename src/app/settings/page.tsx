'use client';

import { useEffect, useMemo, useState } from 'react';
import { getDB } from '@/lib/db';
import { getCalibration, setCalibration, type SourceCalibration } from '@/lib/calibration';
import { getEventSummary, trackEvent } from '@/lib/analytics';
import type { PredictionSource } from '@/types';

const SOURCES: PredictionSource[] = [
  'natural-cycles',
  'fertility-friend',
  'fertile-algorithm',
  'clue',
  'flo',
  'ovia',
  'manual',
];

export default function Settings() {
  const [calibration, setLocalCalibration] = useState<SourceCalibration>(getCalibration());
  const [events, setEvents] = useState<Record<string, number>>({});

  useEffect(() => {
    setEvents(getEventSummary(30));
  }, []);

  const sourceEntries = useMemo(() => SOURCES.map((s) => [s, calibration[s]] as const), [calibration]);

  const updateSource = (source: PredictionSource, value: number) => {
    const next = { ...calibration, [source]: Number(value.toFixed(2)) };
    setLocalCalibration(next);
    setCalibration(next);
    trackEvent('source_calibrated', { source, value: next[source] });
  };

  const exportPartnerPacket = async () => {
    const db = getDB();
    const [cycles, predictions, observations] = await Promise.all([
      db.getAllCycles(),
      db.getAllPredictions(),
      db.getAllObservations(),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'fertile',
      schemaVersion: 1,
      cycles,
      predictions,
      observations,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fertile-partner-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('settings_export');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>

      <div className="space-y-6">
        <section className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Source Calibration</h2>
          <p className="mb-4 text-sm text-gray-600">
            Tune source influence based on your personal outcomes. Positive values trust a source more, negative values trust less.
          </p>
          <div className="mb-3 rounded-lg bg-pink-50 p-3 text-xs text-pink-700">
            Tip: move a source up when its past predictions matched your actual ovulation, down when it consistently misses.
          </div>
          <div className="space-y-4">
            {sourceEntries.map(([source, value]) => (
              <div key={source}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize text-gray-700">{source.replace(/-/g, ' ')}</span>
                  <span className="font-medium text-gray-900">{value > 0 ? '+' : ''}{value.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={-0.3}
                  max={0.3}
                  step={0.01}
                  value={value}
                  onChange={(e) => updateSource(source, Number(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Growth Metrics (Last 30 days)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {['dashboard_view', 'prediction_generated', 'import_completed', 'source_calibrated', 'settings_export'].map((k) => (
              <div key={k} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">{k.replace(/_/g, ' ')}</p>
                <p className="text-xl font-semibold text-gray-900">{events[k] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Partner Share</h2>
          <p className="mb-4 text-sm text-gray-600">
            Export a privacy-first JSON packet you can send to your partner or clinician. No cloud required.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setLocalCalibration(getCalibration());
              }}
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Reload Calibration
            </button>
            <button
              onClick={() => {
                const cleared = {
                  'natural-cycles': 0,
                  'fertility-friend': 0,
                  'fertile-algorithm': 0,
                  clue: 0,
                  flo: 0,
                  ovia: 0,
                  manual: 0,
                } as SourceCalibration;
                setLocalCalibration(cleared);
                setCalibration(cleared);
              }}
              className="rounded-lg border border-red-200 bg-red-50 px-6 py-3 font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Reset Calibration
            </button>
            <button
              onClick={exportPartnerPacket}
              className="rounded-lg bg-pink-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-pink-700"
            >
              Export Partner Packet
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

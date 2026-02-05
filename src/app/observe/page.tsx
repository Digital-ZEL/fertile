'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useDB } from '@/lib/db';
import { generateId, getTimestamp, getCurrentISODate } from '@/types';
import type { Observation, CervicalMucusType, OPKResult, SymptomType } from '@/types';

// Options for each observation type
const CERVICAL_MUCUS_OPTIONS: { value: CervicalMucusType; label: string; emoji: string }[] = [
  { value: 'dry', label: 'Dry', emoji: '🏜️' },
  { value: 'sticky', label: 'Sticky', emoji: '🍯' },
  { value: 'creamy', label: 'Creamy', emoji: '🥛' },
  { value: 'watery', label: 'Watery', emoji: '💧' },
  { value: 'egg-white', label: 'Egg White', emoji: '🥚' },
  { value: 'spotting', label: 'Spotting', emoji: '🩸' },
];

const OPK_OPTIONS: { value: OPKResult; label: string; emoji: string }[] = [
  { value: 'negative', label: 'Negative', emoji: '➖' },
  { value: 'almost-positive', label: 'Almost Positive', emoji: '〰️' },
  { value: 'positive', label: 'Positive', emoji: '➕' },
  { value: 'invalid', label: 'Invalid', emoji: '❌' },
];

const SYMPTOM_OPTIONS: { value: SymptomType; label: string; emoji: string }[] = [
  { value: 'cramps', label: 'Cramps', emoji: '😣' },
  { value: 'bloating', label: 'Bloating', emoji: '🎈' },
  { value: 'breast-tenderness', label: 'Breast Tenderness', emoji: '🤱' },
  { value: 'headache', label: 'Headache', emoji: '🤕' },
  { value: 'mood-changes', label: 'Mood Changes', emoji: '🎭' },
  { value: 'fatigue', label: 'Fatigue', emoji: '😴' },
  { value: 'increased-libido', label: 'Increased Libido', emoji: '💕' },
  { value: 'mittelschmerz', label: 'Ovulation Pain', emoji: '⚡' },
  { value: 'acne', label: 'Acne', emoji: '😬' },
  { value: 'other', label: 'Other', emoji: '📝' },
];

type TabType = 'mucus' | 'bbt' | 'opk' | 'symptom';

export default function ObservePage() {
  const db = useDB();

  // Current tab
  const [activeTab, setActiveTab] = useState<TabType>('mucus');

  // Form state
  const [date, setDate] = useState(getCurrentISODate());
  const [mucusValue, setMucusValue] = useState<CervicalMucusType | ''>('');
  const [bbtValue, setBbtValue] = useState('');
  const [bbtTime, setBbtTime] = useState('');
  const [opkValue, setOpkValue] = useState<OPKResult | ''>('');
  const [symptomValues, setSymptomValues] = useState<SymptomType[]>([]);
  const [severity, setSeverity] = useState<1 | 2 | 3>(2);
  const [notes, setNotes] = useState('');

  // UI state
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadObservations = useCallback(async () => {
    try {
      setIsLoading(true);
      const dayObs = await db.getObservationsByDate(date);
      setObservations(dayObs);
    } catch (error) {
      console.error('Failed to load observations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [db, date]);

  // Load observations on mount and date change
  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  async function saveMucus() {
    if (!mucusValue) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const now = getTimestamp();
      const observation: Observation = {
        id: generateId(),
        date,
        type: 'cervical-mucus',
        value: mucusValue,
        notes: notes || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await db.addObservation(observation);
      setMessage({ type: 'success', text: 'Cervical mucus logged!' });
      setMucusValue('');
      setNotes('');
      await loadObservations();
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveBBT() {
    if (!bbtValue) return;
    const temp = parseFloat(bbtValue);
    if (isNaN(temp) || temp < 95 || temp > 101) {
      setMessage({ type: 'error', text: 'Temperature must be between 95-101°F' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const now = getTimestamp();
      const observation: Observation = {
        id: generateId(),
        date,
        type: 'bbt',
        value: temp,
        time: bbtTime || undefined,
        notes: notes || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await db.addObservation(observation);
      setMessage({ type: 'success', text: 'BBT logged!' });
      setBbtValue('');
      setBbtTime('');
      setNotes('');
      await loadObservations();
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveOPK() {
    if (!opkValue) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const now = getTimestamp();
      const observation: Observation = {
        id: generateId(),
        date,
        type: 'opk',
        value: opkValue,
        notes: notes || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await db.addObservation(observation);
      setMessage({ type: 'success', text: 'OPK result logged!' });
      setOpkValue('');
      setNotes('');
      await loadObservations();
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSymptoms() {
    if (symptomValues.length === 0) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const now = getTimestamp();

      // Save each symptom as separate observation
      for (const symptom of symptomValues) {
        const observation: Observation = {
          id: generateId(),
          date,
          type: 'symptom',
          value: symptom,
          severity,
          notes: notes || undefined,
          createdAt: now,
          updatedAt: now,
        };
        await db.addObservation(observation);
      }

      setMessage({ type: 'success', text: `${symptomValues.length} symptom(s) logged!` });
      setSymptomValues([]);
      setSeverity(2);
      setNotes('');
      await loadObservations();
    } catch (error) {
      console.error('Failed to save:', error);
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  }

  function toggleSymptom(symptom: SymptomType) {
    setSymptomValues((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  }

  async function deleteObservation(id: string) {
    try {
      await db.deleteObservation(id);
      await loadObservations();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function getObservationLabel(obs: Observation): string {
    switch (obs.type) {
      case 'cervical-mucus':
        const mucusOpt = CERVICAL_MUCUS_OPTIONS.find((o) => o.value === obs.value);
        return `${mucusOpt?.emoji || ''} ${mucusOpt?.label || obs.value}`;
      case 'bbt':
        return `🌡️ ${obs.value}°F${obs.time ? ` @ ${obs.time}` : ''}`;
      case 'opk':
        const opkOpt = OPK_OPTIONS.find((o) => o.value === obs.value);
        return `🧪 OPK: ${opkOpt?.label || obs.value}`;
      case 'symptom':
        const symptomOpt = SYMPTOM_OPTIONS.find((o) => o.value === obs.value);
        return `${symptomOpt?.emoji || ''} ${symptomOpt?.label || obs.value}`;
      default:
        return 'Unknown';
    }
  }

  const tabs: { id: TabType; label: string; emoji: string }[] = [
    { id: 'mucus', label: 'Mucus', emoji: '💧' },
    { id: 'bbt', label: 'BBT', emoji: '🌡️' },
    { id: 'opk', label: 'OPK', emoji: '🧪' },
    { id: 'symptom', label: 'Symptoms', emoji: '📋' },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-pink-600"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">📝 Daily Observations</h1>
        <p className="mt-1 text-gray-600">Track fertility signs to improve accuracy</p>
      </div>

      {/* Date Selector */}
      <div className="mb-6">
        <label htmlFor="obsDate" className="mb-2 block text-sm font-medium text-gray-700">
          Date
        </label>
        <input
          type="date"
          id="obsDate"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={getCurrentISODate()}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span className="mr-1">{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mb-8 rounded-xl bg-pink-50 p-6">
        {/* Cervical Mucus */}
        {activeTab === 'mucus' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Cervical Mucus</h3>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CERVICAL_MUCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMucusValue(opt.value)}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    mucusValue === opt.value
                      ? 'border-pink-500 bg-pink-100'
                      : 'border-gray-200 bg-white hover:border-pink-300'
                  }`}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div className="mt-1 text-sm font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pink-500 focus:outline-none"
            />
            <button
              onClick={saveMucus}
              disabled={!mucusValue || isSaving}
              className="w-full rounded-lg bg-pink-600 py-3 font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Log Cervical Mucus'}
            </button>
          </div>
        )}

        {/* BBT */}
        {activeTab === 'bbt' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Basal Body Temperature</h3>
            <div className="mb-4 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm text-gray-600">Temperature (°F)</label>
                <input
                  type="number"
                  value={bbtValue}
                  onChange={(e) => setBbtValue(e.target.value)}
                  placeholder="97.8"
                  step="0.1"
                  min="95"
                  max="101"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-sm text-gray-600">Time (optional)</label>
                <input
                  type="time"
                  value={bbtTime}
                  onChange={(e) => setBbtTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-pink-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-500">
              💡 Take your temperature first thing in the morning before getting out of bed
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pink-500 focus:outline-none"
            />
            <button
              onClick={saveBBT}
              disabled={!bbtValue || isSaving}
              className="w-full rounded-lg bg-pink-600 py-3 font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Log Temperature'}
            </button>
          </div>
        )}

        {/* OPK */}
        {activeTab === 'opk' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Ovulation Test (OPK)</h3>
            <div className="mb-4 grid grid-cols-2 gap-3">
              {OPK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setOpkValue(opt.value)}
                  className={`rounded-lg border-2 p-4 text-center transition-colors ${
                    opkValue === opt.value
                      ? 'border-pink-500 bg-pink-100'
                      : 'border-gray-200 bg-white hover:border-pink-300'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div className="mt-2 font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
            <p className="mb-4 text-sm text-gray-500">
              💡 A positive OPK means ovulation is likely in 12-36 hours
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pink-500 focus:outline-none"
            />
            <button
              onClick={saveOPK}
              disabled={!opkValue || isSaving}
              className="w-full rounded-lg bg-pink-600 py-3 font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Log OPK Result'}
            </button>
          </div>
        )}

        {/* Symptoms */}
        {activeTab === 'symptom' && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Symptoms</h3>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SYMPTOM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleSymptom(opt.value)}
                  className={`rounded-lg border-2 p-3 text-left transition-colors ${
                    symptomValues.includes(opt.value)
                      ? 'border-pink-500 bg-pink-100'
                      : 'border-gray-200 bg-white hover:border-pink-300'
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <div className="mt-1 text-sm font-medium">{opt.label}</div>
                </button>
              ))}
            </div>

            {symptomValues.length > 0 && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Severity: {severity === 1 ? 'Mild' : severity === 2 ? 'Moderate' : 'Severe'}
                </label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setSeverity(level)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors ${
                        severity === level
                          ? 'border-pink-500 bg-pink-100 text-pink-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-pink-300'
                      }`}
                    >
                      {level === 1 ? 'Mild' : level === 2 ? 'Moderate' : 'Severe'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={2}
              className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pink-500 focus:outline-none"
            />
            <button
              onClick={saveSymptoms}
              disabled={symptomValues.length === 0 || isSaving}
              className="w-full rounded-lg bg-pink-600 py-3 font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
            >
              {isSaving
                ? 'Saving...'
                : `Log ${symptomValues.length || ''} Symptom${symptomValues.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Today's Observations */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          📊 Observations for {formatDate(date)}
        </h2>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : observations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-500">No observations for this date</p>
          </div>
        ) : (
          <div className="space-y-2">
            {observations.map((obs) => (
              <div
                key={obs.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
              >
                <div>
                  <div className="font-medium text-gray-900">{getObservationLabel(obs)}</div>
                  {obs.notes && <div className="text-sm italic text-gray-500">{obs.notes}</div>}
                </div>
                <button
                  onClick={() => deleteObservation(obs.id)}
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  aria-label="Delete observation"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

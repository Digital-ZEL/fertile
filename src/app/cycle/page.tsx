'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useDB } from '@/lib/db';
import { generateId, getTimestamp, getCurrentISODate } from '@/types';
import type { Cycle } from '@/types';

export default function CyclePage() {
  const db = useDB();

  // Form state
  const [startDate, setStartDate] = useState(getCurrentISODate());
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [notes, setNotes] = useState('');

  // UI state
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadCycles = useCallback(
    async function loadCycles() {
      try {
        setIsLoading(true);
        const allCycles = await db.getAllCycles();
        setCycles(allCycles);
      } catch (error) {
        console.error('Failed to load cycles:', error);
        setMessage({ type: 'error', text: 'Failed to load cycles' });
      } finally {
        setIsLoading(false);
      }
    },
    [db]
  );

  // Load cycles on mount
  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const now = getTimestamp();

      if (editingId) {
        // Update existing cycle
        const cycle: Cycle = {
          id: editingId,
          startDate,
          length: cycleLength,
          periodLength,
          notes: notes || undefined,
          createdAt: cycles.find((c) => c.id === editingId)?.createdAt || now,
          updatedAt: now,
        };
        await db.updateCycle(cycle);
        setMessage({ type: 'success', text: 'Cycle updated!' });
        setEditingId(null);
      } else {
        // Create new cycle
        const cycle: Cycle = {
          id: generateId(),
          startDate,
          length: cycleLength,
          periodLength,
          notes: notes || undefined,
          createdAt: now,
          updatedAt: now,
        };
        await db.addCycle(cycle);
        setMessage({ type: 'success', text: 'Cycle saved!' });
      }

      // Reset form and reload
      resetForm();
      await loadCycles();
    } catch (error) {
      console.error('Failed to save cycle:', error);
      setMessage({ type: 'error', text: 'Failed to save cycle' });
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setStartDate(getCurrentISODate());
    setCycleLength(28);
    setPeriodLength(5);
    setNotes('');
    setEditingId(null);
  }

  function editCycle(cycle: Cycle) {
    setStartDate(cycle.startDate);
    setCycleLength(cycle.length);
    setPeriodLength(cycle.periodLength);
    setNotes(cycle.notes || '');
    setEditingId(cycle.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteCycle(id: string) {
    if (!confirm('Are you sure you want to delete this cycle?')) return;

    try {
      await db.deleteCycle(id);
      await loadCycles();
      setMessage({ type: 'success', text: 'Cycle deleted' });
    } catch (error) {
      console.error('Failed to delete cycle:', error);
      setMessage({ type: 'error', text: 'Failed to delete cycle' });
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-pink-600"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">🩸 Cycle Tracking</h1>
        <p className="mt-1 text-gray-600">Log your menstrual cycle to improve predictions</p>
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-10 rounded-xl bg-pink-50 p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">
          {editingId ? 'Edit Cycle' : 'Log New Cycle'}
        </h2>

        {/* Period Start Date */}
        <div className="mb-6">
          <label htmlFor="startDate" className="mb-2 block text-sm font-medium text-gray-700">
            First Day of Period
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={getCurrentISODate()}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
          <p className="mt-1 text-sm text-gray-500">When did your last period start?</p>
        </div>

        {/* Cycle Length */}
        <div className="mb-6">
          <label htmlFor="cycleLength" className="mb-2 block text-sm font-medium text-gray-700">
            Cycle Length: <span className="text-pink-600">{cycleLength} days</span>
          </label>
          <input
            type="range"
            id="cycleLength"
            value={cycleLength}
            onChange={(e) => setCycleLength(Number(e.target.value))}
            min={21}
            max={40}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-pink-200 accent-pink-600"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>21 days</span>
            <span>40 days</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Days from first day of one period to first day of next
          </p>
        </div>

        {/* Period Length */}
        <div className="mb-6">
          <label htmlFor="periodLength" className="mb-2 block text-sm font-medium text-gray-700">
            Period Length: <span className="text-pink-600">{periodLength} days</span>
          </label>
          <input
            type="range"
            id="periodLength"
            value={periodLength}
            onChange={(e) => setPeriodLength(Number(e.target.value))}
            min={2}
            max={10}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-pink-200 accent-pink-600"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>2 days</span>
            <span>10 days</span>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label htmlFor="notes" className="mb-2 block text-sm font-medium text-gray-700">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any notes about this cycle..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 rounded-lg bg-pink-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-pink-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : editingId ? 'Update Cycle' : 'Save Cycle'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* History */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">📅 Cycle History</h2>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : cycles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-500">No cycles logged yet</p>
            <p className="mt-1 text-sm text-gray-400">Start by logging your last period above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cycles.map((cycle) => (
              <div
                key={cycle.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
              >
                <div>
                  <div className="font-medium text-gray-900">{formatDate(cycle.startDate)}</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {cycle.length}-day cycle • {cycle.periodLength}-day period
                  </div>
                  {cycle.notes && (
                    <div className="mt-1 text-sm italic text-gray-400">{cycle.notes}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => editCycle(cycle)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-pink-600"
                    aria-label="Edit cycle"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteCycle(cycle.id)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                    aria-label="Delete cycle"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ISODateString } from '@/types';
import type { ReconciledWindow } from '@/hooks';

interface CalendarProps {
  window: ReconciledWindow | null;
  onDayClick?: (date: ISODateString) => void;
  selectedDate?: ISODateString | null;
}

interface DayInfo {
  date: ISODateString;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFertile: boolean;
  isPeak: boolean;
  isOvulation: boolean;
  confidence: number | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(date: Date): ISODateString {
  return date.toISOString().split('T')[0];
}

/**
 * Calendar component showing month view with fertile days highlighted
 */
export default function Calendar({ window, onDayClick, selectedDate }: CalendarProps) {
  const today = useMemo(() => formatDate(new Date()), []);
  const [viewDate, setViewDate] = useState(() => new Date());

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  // Navigate months
  const goToPreviousMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const goToToday = useCallback(() => {
    setViewDate(new Date());
  }, []);

  // Generate days for the calendar grid
  const days = useMemo((): DayInfo[] => {
    const result: DayInfo[] = [];

    // First day of the month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDay.getDay();

    // Last day of the month
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Days from previous month to fill the first week
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      const dateStr = formatDate(date);
      result.push({
        date: dateStr,
        dayOfMonth: prevMonthLastDay - i,
        isCurrentMonth: false,
        isToday: dateStr === today,
        isFertile: window ? dateStr >= window.fertileStart && dateStr <= window.fertileEnd : false,
        isPeak: window?.peakDays.includes(dateStr) || false,
        isOvulation: window?.ovulationDate === dateStr,
        confidence: window?.confidence || null,
      });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = formatDate(date);
      result.push({
        date: dateStr,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday: dateStr === today,
        isFertile: window ? dateStr >= window.fertileStart && dateStr <= window.fertileEnd : false,
        isPeak: window?.peakDays.includes(dateStr) || false,
        isOvulation: window?.ovulationDate === dateStr,
        confidence: window?.confidence || null,
      });
    }

    // Fill remaining days from next month
    const remainingDays = 42 - result.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(currentYear, currentMonth + 1, day);
      const dateStr = formatDate(date);
      result.push({
        date: dateStr,
        dayOfMonth: day,
        isCurrentMonth: false,
        isToday: dateStr === today,
        isFertile: window ? dateStr >= window.fertileStart && dateStr <= window.fertileEnd : false,
        isPeak: window?.peakDays.includes(dateStr) || false,
        isOvulation: window?.ovulationDate === dateStr,
        confidence: window?.confidence || null,
      });
    }

    return result;
  }, [currentMonth, currentYear, today, window]);

  // Get day styling based on fertility status
  const getDayClasses = (day: DayInfo): string => {
    const base = 'relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full text-sm font-medium transition-all';

    if (!day.isCurrentMonth) {
      return `${base} text-gray-300`;
    }

    if (day.isOvulation) {
      return `${base} bg-pink-600 text-white ring-2 ring-pink-300`;
    }

    if (day.isPeak) {
      return `${base} bg-pink-500 text-white`;
    }

    if (day.isFertile) {
      // Color based on confidence
      const confidence = day.confidence || 50;
      if (confidence >= 70) {
        return `${base} bg-green-100 text-green-800 ring-1 ring-green-300`;
      } else if (confidence >= 50) {
        return `${base} bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300`;
      } else {
        return `${base} bg-orange-100 text-orange-800 ring-1 ring-orange-300`;
      }
    }

    if (day.isToday) {
      return `${base} bg-gray-100 text-gray-900 ring-2 ring-gray-400`;
    }

    if (selectedDate === day.date) {
      return `${base} bg-pink-50 text-pink-700 ring-1 ring-pink-300`;
    }

    return `${base} text-gray-700 hover:bg-gray-50`;
  };

  return (
    <div className="w-full">
      {/* Header with navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          aria-label="Previous month"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={goToToday}
            className="text-xs text-pink-600 hover:text-pink-700"
          >
            Today
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          aria-label="Next month"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <button
            key={day.date}
            onClick={() => onDayClick?.(day.date)}
            className={getDayClasses(day)}
            aria-label={`${day.dayOfMonth}${day.isFertile ? ', fertile day' : ''}${day.isOvulation ? ', ovulation' : ''}`}
          >
            {day.dayOfMonth}
            {day.isToday && (
              <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-pink-600" />
          <span className="text-gray-600">Ovulation</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-pink-500" />
          <span className="text-gray-600">Peak</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-green-100 ring-1 ring-green-300" />
          <span className="text-gray-600">Fertile (high)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-yellow-100 ring-1 ring-yellow-300" />
          <span className="text-gray-600">Fertile (med)</span>
        </div>
      </div>
    </div>
  );
}

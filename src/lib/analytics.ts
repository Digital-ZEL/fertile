type EventName =
  | 'dashboard_view'
  | 'import_completed'
  | 'prediction_generated'
  | 'source_calibrated'
  | 'settings_export';

interface AnalyticsEvent {
  name: EventName;
  ts: string;
  meta?: Record<string, string | number | boolean>;
}

const KEY = 'fertile:analytics-events';

function hasStorage() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readAll(): AnalyticsEvent[] {
  if (!hasStorage()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function trackEvent(name: EventName, meta?: Record<string, string | number | boolean>) {
  if (!hasStorage()) return;
  const events = readAll();
  events.push({ name, ts: new Date().toISOString(), meta });
  localStorage.setItem(KEY, JSON.stringify(events.slice(-1000)));
}

export function getEventSummary(days = 30): Record<string, number> {
  const events = readAll();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return events
    .filter((e) => new Date(e.ts).getTime() >= since)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.name] = (acc[e.name] ?? 0) + 1;
      return acc;
    }, {});
}

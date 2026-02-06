'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Global error boundary caught:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-600">
          We hit an unexpected error. Your data is stored locally, so reloading should be safe.
        </p>
        {error.digest ? (
          <p className="text-xs text-slate-400">Error ID: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => reset()}
        >
          Try again
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => window.location.reload()}
        >
          Reload page
        </button>
      </div>
    </main>
  );
}

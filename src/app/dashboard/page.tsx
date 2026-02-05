export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Placeholder Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Unified Window Card */}
        <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Unified Fertile Window</h2>
          <div className="flex h-40 items-center justify-center rounded-lg bg-pink-50">
            <p className="text-gray-500">Add predictions to see your unified window</p>
          </div>
        </div>

        {/* Input Sources Card */}
        <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Prediction Sources</h2>
          <div className="flex h-40 items-center justify-center rounded-lg bg-gray-50">
            <button className="rounded-lg border-2 border-dashed border-pink-300 px-6 py-3 text-pink-600 transition-colors hover:border-pink-400 hover:bg-pink-50">
              + Add Prediction Source
            </button>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Cycle Calendar</h2>
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50">
            <p className="text-gray-500">Calendar view coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="py-12 text-center sm:py-20">
        <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
          <span className="block">One Unified</span>
          <span className="block text-pink-600">Fertile Window</span>
        </h1>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 sm:text-xl">
          Reconcile multiple fertility predictions from different apps into a single, accurate
          window with confidence scores.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-pink-600 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:bg-pink-700 hover:shadow-xl"
        >
          Get Started
          <span>→</span>
        </Link>
      </section>

      {/* Features Section */}
      <section className="py-12">
        <h2 className="mb-12 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
          How It Works
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-2xl">
              📊
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Input Predictions</h3>
            <p className="text-gray-600">
              Add fertile windows from multiple apps like Flo, Clue, Natural Cycles, and more.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-2xl">
              🧮
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Smart Reconciliation</h3>
            <p className="text-gray-600">
              Our algorithm weighs and combines predictions to find overlapping fertile days.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 text-2xl">
              🎯
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Confidence Scores</h3>
            <p className="text-gray-600">
              See exactly how confident you can be in each day of your unified fertile window.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

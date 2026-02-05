export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <input
                type="text"
                id="name"
                placeholder="Enter your name"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>
        </section>

        {/* Cycle Settings */}
        <section className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Cycle Settings</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="cycleLength" className="block text-sm font-medium text-gray-700">
                Average Cycle Length (days)
              </label>
              <input
                type="number"
                id="cycleLength"
                defaultValue={28}
                min={21}
                max={35}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
            <div>
              <label htmlFor="lutealLength" className="block text-sm font-medium text-gray-700">
                Luteal Phase Length (days)
              </label>
              <input
                type="number"
                id="lutealLength"
                defaultValue={14}
                min={10}
                max={16}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              />
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-2xl border border-pink-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Notifications</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-gray-700">Fertile window reminders</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-gray-700">Daily fertility score</span>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <button className="w-full rounded-lg bg-pink-600 py-3 font-semibold text-white transition-colors hover:bg-pink-700">
          Save Settings
        </button>
      </div>
    </div>
  );
}

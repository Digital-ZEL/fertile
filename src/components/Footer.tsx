export default function Footer() {
  return (
    <footer className="border-t border-pink-100 bg-pink-50/50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌸</span>
            <span className="font-semibold text-pink-600">Fertile</span>
          </div>
          <p className="text-center text-sm text-gray-500">Not medical advice. Estimates only.</p>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Fertile</p>
        </div>
      </div>
    </footer>
  );
}

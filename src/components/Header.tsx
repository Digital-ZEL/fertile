'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-pink-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🌸</span>
            <span className="text-xl font-bold text-pink-600">Fertile</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-gray-600 transition-colors hover:text-pink-600">
              Home
            </Link>
            <Link href="/dashboard" className="text-gray-600 transition-colors hover:text-pink-600">
              Dashboard
            </Link>
            <Link href="/settings" className="text-gray-600 transition-colors hover:text-pink-600">
              Settings
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="rounded-md p-2 text-gray-600 hover:bg-pink-50 md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="border-t border-pink-100 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md px-3 py-2 text-gray-600 hover:bg-pink-50 hover:text-pink-600"
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md px-3 py-2 text-gray-600 hover:bg-pink-50 hover:text-pink-600"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-md px-3 py-2 text-gray-600 hover:bg-pink-50 hover:text-pink-600"
              >
                Settings
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

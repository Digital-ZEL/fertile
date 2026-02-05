# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-02-05

### 🎉 Initial MVP Release

First public release of Fertile — Unified Fertility Intelligence.

### Added

#### Core Features
- **Unified Fertility Dashboard** — Single view of all fertility predictions with confidence scoring
- **Multi-Source Import** — Support for Flo, Clue, Natural Cycles, Glow, and Ovia CSV formats
- **Manual Entry** — Add predictions from any app manually
- **Interactive Calendar** — Color-coded cycle visualization with phase indicators
- **Side-by-Side Comparison** — Visual comparison of all app predictions
- **Confidence Meter** — Visual indicator of prediction agreement (0-100%)

#### Technical Foundation
- **Local-Only Storage** — All data stored in IndexedDB, never leaves device
- **Type-Safe** — Full TypeScript implementation
- **Responsive Design** — Mobile-first with Tailwind CSS
- **App Router** — Next.js 14 with modern routing

#### Pages
- `/` — Landing page with feature overview
- `/dashboard` — Main unified fertility dashboard
- `/import` — CSV and manual data import
- `/compare` — Side-by-side prediction comparison
- `/cycle` — Cycle tracking and history
- `/observe` — Daily observation logging
- `/settings` — App preferences

#### Components
- `Header` — Navigation with mobile menu
- `Footer` — Disclaimer and copyright
- `Calendar` — Interactive cycle calendar
- `ConfidenceMeter` — Visual confidence display

#### Data Layer
- IndexedDB schema for cycles, predictions, and observations
- CSV parsers for major fertility apps
- Unified window calculation algorithm
- Cycle phase detection (menstrual, follicular, fertile, ovulation, luteal)

#### Documentation
- `README.md` — Full project documentation
- `docs/PRIVACY.md` — Privacy policy and data handling
- `docs/PRD.md` — Product requirements
- `docs/ARCHITECTURE.md` — Technical architecture
- `docs/COMPETITORS.md` — Market analysis

### Security
- No external API calls with user data
- No analytics or tracking
- Security headers configured (X-Frame-Options, X-XSS-Protection, X-Content-Type-Options)

### Notes
- This is a calendar-method tool only
- Not intended as medical advice
- Not a replacement for professional fertility consultation

---

## [Unreleased]

### Planned
- PWA support with offline-first architecture
- BBT (Basal Body Temperature) tracking
- LH test result logging
- Cycle statistics and insights
- Data export functionality
- Symptom tracking expansion

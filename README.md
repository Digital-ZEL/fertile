# 🌸 Fertile

> **Unified Fertility Intelligence** — Reconcile multiple fertile-window predictions into ONE unified window with confidence scores.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Digital-ZEL/fertile)

**[🚀 Live Demo](https://fertile.vercel.app)** _(coming soon)_

---

## ⚠️ Medical Disclaimer

**Fertile is NOT medical advice.** This app provides estimates only based on calendar methods. It should NOT be used as a primary method of contraception or conception. Always consult with a healthcare provider for fertility-related decisions.

---

## ✨ Features

### 📊 Unified Fertility Dashboard

- Import predictions from **Flo**, **Clue**, **Natural Cycles**, and more
- See a **single unified fertile window** with confidence scores
- Visual confidence meter showing prediction agreement

### 📱 Multi-Source Import

- **CSV import** from major fertility apps
- **Manual entry** for any app predictions
- Smart date parsing with validation

### 📅 Interactive Calendar

- Color-coded fertility phases (menstrual, fertile, ovulation, luteal)
- Cycle-by-cycle view with navigation
- Today indicator and responsive design

### 🔍 Side-by-Side Comparison

- Compare all app predictions visually
- Identify agreement and divergence
- Understand prediction reliability

### 🏠 100% Private & Offline

- **All data stays on YOUR device** (IndexedDB)
- No accounts, no servers, no tracking
- Works offline after first load
- Export your data anytime

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Digital-ZEL/fertile.git
cd fertile

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build for Production

```bash
npm run build
npm start
```

---

## 📸 Screenshots

_Screenshots coming soon_

<!--
| Dashboard | Calendar | Compare |
|-----------|----------|---------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Calendar](docs/screenshots/calendar.png) | ![Compare](docs/screenshots/compare.png) |
-->

---

## 🔒 Privacy

**Your data never leaves your device.**

- ✅ All data stored locally in IndexedDB
- ✅ No user accounts required
- ✅ No server-side storage
- ✅ No analytics or tracking
- ✅ No third-party data sharing
- ✅ Export or delete your data anytime

Read our full [Privacy Policy](docs/PRIVACY.md).

---

## 🛠 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Storage:** IndexedDB (via idb)
- **Testing:** Vitest + Testing Library
- **Deployment:** Vercel

---

## 📁 Project Structure

```
fertile/
├── src/
│   ├── app/           # Next.js App Router pages
│   │   ├── compare/   # Side-by-side comparison
│   │   ├── cycle/     # Cycle tracking
│   │   ├── dashboard/ # Main dashboard
│   │   ├── import/    # Data import
│   │   ├── observe/   # Daily observations
│   │   └── settings/  # App settings
│   ├── components/    # Reusable UI components
│   ├── lib/           # Core logic & utilities
│   │   ├── db/        # IndexedDB operations
│   │   └── import/    # CSV parsers
│   └── types/         # TypeScript definitions
├── docs/              # Documentation
└── public/            # Static assets
```

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix lint errors
npm run typecheck    # TypeScript check
npm run test         # Run tests
npm run format       # Format with Prettier
```

---

## 📋 Roadmap

- [x] Multi-source CSV import
- [x] Unified fertile window calculation
- [x] Interactive calendar view
- [x] Confidence scoring
- [x] Side-by-side comparison
- [ ] PWA support (offline-first)
- [ ] BBT/LH integration
- [ ] Cycle statistics & insights
- [ ] Data export (JSON/CSV)
- [ ] Symptom tracking

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- Inspired by the need for a unified view across fertility apps
- Built with privacy as a first principle
- Thanks to the open-source community

---

<p align="center">
  <strong>🌸 Fertile</strong> — Your fertility data, unified and private.
</p>

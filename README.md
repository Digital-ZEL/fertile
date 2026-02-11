# 🌸 Fertile

**Unified Fertility Intelligence** — Stop guessing which app is right. Get one confident answer.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Digital-ZEL/fertile)

---

## The Problem

You track your cycle in 3 apps. You get 3 different fertile windows:
- **Fertility Friend:** Jan 7-10
- **Clue:** Jan 19-24  
- **Flo:** Jan 15-19

Which one do you trust? 🤷‍♀️

## The Solution

Fertile reconciles predictions from multiple apps and gives you **ONE unified prediction** with a confidence score.

```
Your Fertile Window: Jan 15-18
Confidence: 87%

Why: 2 of 3 apps agree on these dates. 
Your historical data shows Clue tends to predict 2 days early.
```

---

## Features

### MVP (v1)
- [x] Manual data entry (dates, temps, symptoms)
- [x] Import from Fertility Friend (CSV)
- [x] Reconciliation algorithm with confidence scoring
- [x] Mobile-responsive UI
- [x] Data stays local (privacy-first)

### Coming Soon
- [ ] Import from Clue, Flo, Premom
- [ ] Partner sync (iPhone ↔ Android)
- [ ] Wearable data integration (Tempdrop, Ava)
- [ ] AI-powered predictions

---

## Tech Stack

| Component | Choice |
|-----------|--------|
| Framework | Next.js 14 |
| Styling | Tailwind CSS |
| Storage | Local (localStorage) |
| Hosting | Vercel (free tier) |
| Database | None (MVP) |

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Digital-ZEL/fertile.git
cd fertile

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## How It Works

### The Algorithm

1. **Normalize** — Convert all dates to the same format
2. **Overlap Detection** — Find where predictions agree
3. **Weighting** — Factor in app reliability + your historical accuracy
4. **Confidence Score** — Calculate based on agreement level

```
Confidence = (overlap_days / total_range) × app_reliability × historical_accuracy
```

---

## Privacy

- **No accounts required**
- **No data sent to servers**
- **Everything stays on your device**
- **Export your data anytime**

We believe your fertility data is deeply personal. It never leaves your device.

---

## Contributing

PRs welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

---

## Disclaimer

⚠️ **Fertile is not medical advice.** It's a tool to help you understand your cycle data. Always consult a healthcare provider for fertility-related decisions.

---

## License

MIT © 2026 Digital-ZEL

---

*Built with ❤️ for the TTC community*

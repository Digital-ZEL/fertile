# Architecture: Fertile

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Pages     │  │ Components  │  │    Hooks    │     │
│  │  - Home     │  │ - Calendar  │  │ - useCycle  │     │
│  │  - Entry    │  │ - Dashboard │  │ - usePredict│     │
│  │  - Compare  │  │ - Chart     │  │ - useImport │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│           │              │               │              │
│           └──────────────┼───────────────┘              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │                    lib/                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐   │   │
│  │  │  parsers/ │  │reconciler/│  │  storage/ │   │   │
│  │  │  - ff.ts  │  │ - algo.ts │  │ - local.ts│   │   │
│  │  │  - clue.ts│  │ - score.ts│  │           │   │   │
│  │  └───────────┘  └───────────┘  └───────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              localStorage                        │   │
│  │  - cycles[]                                      │   │
│  │  - predictions[]                                 │   │
│  │  - settings{}                                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
fertile/
├── app/                    # Next.js 14 app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home/Dashboard
│   ├── entry/
│   │   └── page.tsx       # Data entry
│   ├── compare/
│   │   └── page.tsx       # Comparison view
│   └── globals.css        # Global styles
│
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   ├── Calendar.tsx      # Cycle calendar
│   ├── Dashboard.tsx     # Main dashboard
│   ├── EntryForm.tsx     # Data entry form
│   ├── Confidence.tsx    # Confidence display
│   └── CompareChart.tsx  # App comparison
│
├── lib/                   # Core logic
│   ├── parsers/          # Import parsers
│   │   ├── ff.ts         # Fertility Friend CSV
│   │   ├── clue.ts       # Clue export (future)
│   │   └── types.ts      # Parser types
│   │
│   ├── reconciler/       # The algorithm
│   │   ├── algorithm.ts  # Main reconciliation
│   │   ├── confidence.ts # Confidence scoring
│   │   ├── overlap.ts    # Overlap detection
│   │   └── weights.ts    # Reliability weights
│   │
│   ├── storage/          # Data persistence
│   │   ├── local.ts      # localStorage wrapper
│   │   └── export.ts     # Data export
│   │
│   └── utils/            # Utilities
│       ├── dates.ts      # Date helpers
│       └── constants.ts  # App constants
│
├── hooks/                 # Custom React hooks
│   ├── useCycle.ts       # Cycle state
│   ├── usePrediction.ts  # Prediction state
│   └── useImport.ts      # Import handling
│
├── types/                 # TypeScript types
│   └── index.ts          # All type definitions
│
├── docs/                  # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── COMPETITORS.md
│
└── tests/                 # Test files
    ├── reconciler.test.ts
    └── parsers.test.ts
```

## Data Models

### Cycle
```typescript
interface Cycle {
  id: string;
  startDate: Date;
  endDate?: Date;
  length?: number;
  entries: DailyEntry[];
  predictions: Prediction[];
}
```

### DailyEntry
```typescript
interface DailyEntry {
  date: Date;
  cycleDay: number;
  temperature?: number;
  cervicalMucus?: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
  opkResult?: 'negative' | 'positive';
  symptoms?: string[];
  notes?: string;
}
```

### Prediction
```typescript
interface Prediction {
  source: 'fertile' | 'ff' | 'clue' | 'flo' | 'manual';
  fertileStart: Date;
  fertileEnd: Date;
  ovulationDate?: Date;
  confidence?: number;
  method: 'algorithm' | 'import' | 'manual';
}
```

### UnifiedPrediction
```typescript
interface UnifiedPrediction {
  fertileStart: Date;
  fertileEnd: Date;
  ovulationDate: Date;
  confidence: number;
  confidenceExplanation: string;
  sourcePredictions: Prediction[];
  agreementLevel: 'high' | 'medium' | 'low';
}
```

## Reconciliation Algorithm

### Input
```typescript
function reconcile(predictions: Prediction[]): UnifiedPrediction
```

### Steps

1. **Normalize Dates**
   - Convert all dates to UTC midnight
   - Validate date ranges

2. **Calculate Overlap**
   - Find days that appear in multiple predictions
   - Weight by number of agreements

3. **Apply Reliability Weights**
   ```typescript
   const weights = {
     ff: 0.9,      // Fertility Friend - most data-rich
     clue: 0.7,    // Good for regulars
     flo: 0.5,     // Mainstream, less accurate
     manual: 0.8,  // User's own observation
   };
   ```

4. **Compute Confidence**
   ```typescript
   confidence = (
     overlapScore * 0.4 +
     reliabilityScore * 0.3 +
     dataQualityScore * 0.3
   ) * 100;
   ```

5. **Generate Explanation**
   - Human-readable reason for the prediction
   - Highlight agreements and disagreements

## Storage Strategy

### localStorage Schema
```typescript
interface StorageSchema {
  version: number;
  cycles: Cycle[];
  settings: {
    defaultCycleLength: number;
    temperatureUnit: 'fahrenheit' | 'celsius';
    theme: 'light' | 'dark' | 'system';
  };
  importHistory: {
    source: string;
    date: Date;
    recordCount: number;
  }[];
}
```

### Versioning
- Schema version tracked for migrations
- Backward compatible reads
- Migration scripts for upgrades

## Performance Considerations

1. **Bundle Size**
   - Target < 100KB gzipped
   - Dynamic imports for parsers
   - Tree-shake unused components

2. **Render Performance**
   - Memoize expensive calculations
   - Virtual scrolling for long lists
   - Debounce user input

3. **Offline Support**
   - Service worker for caching
   - All logic runs client-side
   - No network dependencies

## Security

1. **Data Privacy**
   - No server communication
   - No analytics tracking (MVP)
   - Clear data deletion option

2. **Input Validation**
   - Sanitize all user input
   - Validate imported files
   - Type-safe throughout

## Future Considerations

### Partner Sync (v2)
- WebRTC for direct device-to-device sync
- End-to-end encryption
- No server storage

### Wearable Integration (v2)
- Health Connect API (Android)
- HealthKit (iOS) via React Native
- Direct Tempdrop/Ava APIs if available

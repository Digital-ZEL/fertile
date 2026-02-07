# Fertile API Documentation

Base URL: `https://fertile-eight.vercel.app` (or `http://localhost:3000` for local dev)

## Authentication

All endpoints require an `X-API-Key` header. Set valid keys via the `FERTILE_API_KEYS` environment variable (comma-separated). If no keys are configured, authentication is disabled (dev mode).

```
X-API-Key: your-api-key-here
```

---

## POST /api/predict

Generate a fertile window prediction from cycle history and optional symptoms.

### Request

```bash
curl -X POST https://fertile-eight.vercel.app/api/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "currentCycleStart": "2026-01-15",
    "cycles": [
      { "startDate": "2025-12-18", "length": 28 },
      { "startDate": "2025-11-20", "length": 28 },
      { "startDate": "2025-10-23", "length": 28 },
      { "startDate": "2025-09-25", "length": 28 },
      { "startDate": "2025-08-28", "length": 28 },
      { "startDate": "2025-07-31", "length": 28 }
    ],
    "symptoms": {
      "cervicalMucus": [
        { "date": "2026-01-24", "value": "watery" },
        { "date": "2026-01-25", "value": "egg-white" },
        { "date": "2026-01-26", "value": "egg-white" },
        { "date": "2026-01-27", "value": "creamy" }
      ],
      "opk": [
        { "date": "2026-01-25", "value": "positive" }
      ],
      "bbt": [
        { "date": "2026-01-23", "value": 97.2 },
        { "date": "2026-01-24", "value": 97.3 },
        { "date": "2026-01-25", "value": 97.1 },
        { "date": "2026-01-26", "value": 97.4 },
        { "date": "2026-01-27", "value": 97.8 },
        { "date": "2026-01-28", "value": 97.9 }
      ]
    }
  }'
```

### Response

```json
{
  "prediction": {
    "fertileStart": "2026-01-23",
    "fertileEnd": "2026-01-27",
    "ovulationDate": "2026-01-26",
    "confidence": 72,
    "explanations": [
      "Reconciled from 2 predictions (manual, fertility-friend)",
      "Good agreement: Sources mostly align",
      "Fertile window: Jan 23 - Jan 27 (5 days)"
    ]
  },
  "quality": {
    "overall": "good",
    "score": 68,
    "factors": [...],
    "recommendations": [...]
  },
  "meta": {
    "cyclesAnalyzed": 6,
    "observationsUsed": 10,
    "timestamp": "2026-01-28T12:00:00.000Z"
  }
}
```

### Minimal Request (calendar only)

```bash
curl -X POST https://fertile-eight.vercel.app/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "currentCycleStart": "2026-01-15",
    "cycles": [
      { "startDate": "2025-12-18", "length": 28 },
      { "startDate": "2025-11-20", "length": 29 },
      { "startDate": "2025-10-22", "length": 29 }
    ]
  }'
```

---

## POST /api/import

Parse Fertility Friend CSV data into structured JSON.

### Request

```bash
curl -X POST https://fertile-eight.vercel.app/api/import \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "csv": "Date,Temp,Cervical Fluid,OPK,Intercourse\n01/15/2026,97.2,dry,negative,no\n01/16/2026,97.3,sticky,,yes\n01/17/2026,97.1,creamy,negative,\n01/18/2026,97.2,watery,positive,yes\n01/19/2026,97.0,egg white,positive,yes\n01/20/2026,97.5,creamy,negative,no\n01/21/2026,97.8,sticky,,\n01/22/2026,97.9,dry,negative,"
  }'
```

### Response

```json
{
  "success": true,
  "summary": {
    "totalRows": 8,
    "observationsCreated": 22,
    "cyclesDetected": 0,
    "errors": 0,
    "warnings": 0
  },
  "cycles": [],
  "observations": [
    { "id": "abc-123", "date": "2026-01-15", "type": "bbt", "value": 97.2 },
    { "id": "abc-124", "date": "2026-01-15", "type": "cervical-mucus", "value": "dry" },
    { "id": "abc-125", "date": "2026-01-15", "type": "opk", "value": "negative" }
  ],
  "errors": [],
  "warnings": [],
  "meta": {
    "format": "fertility-friend",
    "columnsFound": ["Date", "Temp", "Cervical Fluid", "OPK", "Intercourse"],
    "timestamp": "2026-01-28T12:00:00.000Z"
  }
}
```

---

## POST /api/insights

Analyze cycle data for patterns, trends, anomalies, and health recommendations.

### Request

```bash
curl -X POST https://fertile-eight.vercel.app/api/insights \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "cycles": [
      { "startDate": "2025-07-31", "length": 28, "periodLength": 5 },
      { "startDate": "2025-08-28", "length": 27, "periodLength": 4 },
      { "startDate": "2025-09-24", "length": 29, "periodLength": 5 },
      { "startDate": "2025-10-23", "length": 28, "periodLength": 5 },
      { "startDate": "2025-11-20", "length": 30, "periodLength": 6 },
      { "startDate": "2025-12-20", "length": 28, "periodLength": 5 }
    ],
    "observations": [
      { "date": "2026-01-01", "type": "bbt", "value": 97.3 },
      { "date": "2026-01-02", "type": "bbt", "value": 97.2 }
    ]
  }'
```

### Response

```json
{
  "insights": [
    {
      "category": "regularity",
      "severity": "info",
      "title": "Cycle Length Summary",
      "description": "Average cycle: 28.3 days (range 27–30). Standard deviation: 1.0 days.",
      "data": { "mean": 28.3, "stdDev": 1.0, "shortest": 27, "longest": 30, "count": 6 }
    },
    {
      "category": "regularity",
      "severity": "info",
      "title": "Very Regular Cycles",
      "description": "Your cycles are highly regular (±2 days), which makes calendar-based predictions more reliable."
    },
    {
      "category": "trend",
      "severity": "info",
      "title": "Stable Cycle Length",
      "description": "No significant trend in cycle length over time."
    },
    {
      "category": "health",
      "severity": "info",
      "title": "Data Quality Recommendation",
      "description": "With 6 cycles tracked, you have a solid data foundation for predictions."
    }
  ],
  "summary": {
    "totalInsights": 4,
    "byCategory": { "regularity": 2, "trend": 1, "anomaly": 0, "health": 1 },
    "bySeverity": { "info": 4, "note": 0, "warning": 0 }
  },
  "meta": {
    "cyclesAnalyzed": 6,
    "observationsAnalyzed": 2,
    "timestamp": "2026-01-28T12:00:00.000Z"
  }
}
```

---

## GET /api/health

Health check endpoint (no auth required).

```bash
curl https://fertile-eight.vercel.app/api/health
```

```json
{
  "status": "ok",
  "timestamp": "2026-01-28T12:00:00.000Z",
  "service": "fertile"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Description of what went wrong"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / missing required fields |
| 401 | Missing X-API-Key header |
| 403 | Invalid API key |
| 422 | Unprocessable — data insufficient or invalid structure |
| 500 | Server error |

---

## Symptom Value Reference

### Cervical Mucus
`dry`, `sticky`, `creamy`, `watery`, `egg-white`, `spotting`

### OPK Results
`negative`, `almost-positive`, `positive`, `invalid`

### BBT
Numeric value in Fahrenheit (e.g., `97.6`). Typical range: 96.0–100.0°F.

import { describe, it, expect } from 'vitest';
import {
  parseFFCSV,
  getCSVPreview,
  validateCSVStructure,
  convertToObservations,
} from '../ff-import';

const sampleCSV = `Date,Temp,Cervical Fluid,OPK,Intercourse,Notes
01/15/2024,97.2,dry,negative,no,Start of cycle
01/16/2024,97.1,dry,negative,no,
01/17/2024,97.3,sticky,negative,yes,
01/18/2024,97.0,sticky,negative,no,Light cramps
01/19/2024,97.2,creamy,negative,yes,
01/20/2024,97.1,creamy,negative,no,
01/21/2024,97.4,watery,negative,yes,
01/22/2024,97.2,watery,positive,yes,Positive OPK!
01/23/2024,97.3,eggwhite,positive,yes,Peak fertility
01/24/2024,97.5,eggwhite,peak,yes,
01/25/2024,97.8,creamy,negative,no,Temp rise
01/26/2024,98.0,sticky,negative,no,
01/27/2024,98.1,dry,negative,no,
01/28/2024,98.2,dry,negative,no,3 DPO`;

describe('parseFFCSV', () => {
  it('parses valid CSV correctly', () => {
    const result = parseFFCSV(sampleCSV);

    expect(result.success).toBe(true);
    expect(result.observations).toHaveLength(14);
    expect(result.errors).toHaveLength(0);
  });

  it('extracts dates in ISO format', () => {
    const result = parseFFCSV(sampleCSV);

    expect(result.observations[0].date).toBe('2024-01-15');
    expect(result.observations[13].date).toBe('2024-01-28');
  });

  it('parses temperatures correctly', () => {
    const result = parseFFCSV(sampleCSV);

    expect(result.observations[0].temp).toBe(97.2);
    expect(result.observations[10].temp).toBe(97.8);
  });

  it('maps cervical mucus values correctly', () => {
    const result = parseFFCSV(sampleCSV);

    expect(result.observations[0].cervicalMucus).toBe('dry');
    expect(result.observations[2].cervicalMucus).toBe('sticky');
    expect(result.observations[4].cervicalMucus).toBe('creamy');
    expect(result.observations[6].cervicalMucus).toBe('watery');
    expect(result.observations[8].cervicalMucus).toBe('eggwhite');
  });

  it('maps OPK values correctly', () => {
    const result = parseFFCSV(sampleCSV);

    expect(result.observations[0].opk).toBe('negative');
    expect(result.observations[7].opk).toBe('positive');
    expect(result.observations[9].opk).toBe('peak');
  });

  it('maps intercourse values correctly', () => {
    const result = parseFFCSV(sampleCSV);

    expect(result.observations[0].intercourse).toBe(false);
    expect(result.observations[2].intercourse).toBe(true);
  });

  it('preserves notes', () => {
    const result = parseFFCSV(sampleCSV);

    expect(result.observations[0].notes).toBe('Start of cycle');
    expect(result.observations[7].notes).toBe('Positive OPK!');
    expect(result.observations[1].notes).toBeUndefined();
  });

  it('sorts observations by date', () => {
    const result = parseFFCSV(sampleCSV);

    for (let i = 1; i < result.observations.length; i++) {
      expect(result.observations[i].date >= result.observations[i - 1].date).toBe(true);
    }
  });
});

describe('parseFFCSV with ISO dates', () => {
  const isoCSV = `Date,Temp,Cervical Fluid,OPK,Intercourse
2024-01-15,97.2,dry,negative,no
2024-01-16,97.1,sticky,positive,yes`;

  it('parses ISO date format', () => {
    const result = parseFFCSV(isoCSV);

    expect(result.success).toBe(true);
    expect(result.observations[0].date).toBe('2024-01-15');
  });
});

describe('parseFFCSV with alternate column names', () => {
  const altCSV = `Date,Temperature,CF,opk,BD,Notes
01/15/2024,97.2,dry,neg,y,Test note
01/16/2024,97.1,ew,pos,n,`;

  it('handles alternate column names', () => {
    const result = parseFFCSV(altCSV);

    expect(result.success).toBe(true);
    expect(result.observations[0].temp).toBe(97.2);
    expect(result.observations[0].cervicalMucus).toBe('dry');
    expect(result.observations[0].opk).toBe('negative');
    expect(result.observations[0].intercourse).toBe(true);
  });

  it('handles abbreviated values', () => {
    const result = parseFFCSV(altCSV);

    expect(result.observations[1].cervicalMucus).toBe('eggwhite');
    expect(result.observations[1].opk).toBe('positive');
  });
});

describe('parseFFCSV error handling', () => {
  const errorCSV = `Date,Temp,Cervical Fluid
,97.2,dry
invalid-date,97.1,sticky
01/17/2024,97.3,creamy`;

  it('reports missing date errors', () => {
    const result = parseFFCSV(errorCSV);

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field === 'Date' && e.row === 2)).toBe(true);
  });

  it('still parses valid rows', () => {
    const result = parseFFCSV(errorCSV);

    expect(result.observations.length).toBe(1);
    expect(result.observations[0].date).toBe('2024-01-17');
  });
});

describe('parseFFCSV warnings', () => {
  const warningCSV = `Date,Temp,Cervical Fluid
01/15/2024,93.0,dry
01/16/2024,abc,sticky
01/15/2024,97.2,creamy`;

  it('warns about out-of-range temperatures', () => {
    const result = parseFFCSV(warningCSV);

    expect(result.warnings.some((w) => w.field === 'Temp' && w.row === 2)).toBe(true);
  });

  it('warns about unparseable temperatures', () => {
    const result = parseFFCSV(warningCSV);

    expect(result.warnings.some((w) => w.field === 'Temp' && w.row === 3)).toBe(true);
  });

  it('warns about duplicate dates', () => {
    const result = parseFFCSV(warningCSV);

    expect(result.warnings.some((w) => w.message.includes('Duplicate date'))).toBe(true);
  });
});

describe('getCSVPreview', () => {
  it('returns first N rows', () => {
    const preview = getCSVPreview(sampleCSV, 5);

    expect(preview).toHaveLength(5);
    expect(preview[0].Date).toBe('01/15/2024');
  });

  it('includes all columns', () => {
    const preview = getCSVPreview(sampleCSV, 1);

    expect(preview[0]).toHaveProperty('Date');
    expect(preview[0]).toHaveProperty('Temp');
    expect(preview[0]).toHaveProperty('Cervical Fluid');
  });
});

describe('validateCSVStructure', () => {
  it('validates CSV with required columns', () => {
    const result = validateCSVStructure(sampleCSV);

    expect(result.valid).toBe(true);
    expect(result.missingColumns).toHaveLength(0);
  });

  it('reports missing required columns', () => {
    const badCSV = `Temp,Cervical Fluid
97.2,dry`;
    const result = validateCSVStructure(badCSV);

    expect(result.valid).toBe(false);
    expect(result.missingColumns).toContain('date');
  });

  it('returns found columns', () => {
    const result = validateCSVStructure(sampleCSV);

    expect(result.foundColumns).toContain('Date');
    expect(result.foundColumns).toContain('Temp');
  });
});

describe('parseFFCSV with empty optional fields', () => {
  const sparseCSV = `Date,Temp,Cervical Fluid,OPK,Intercourse
01/15/2024,,,, 
01/16/2024,97.1,dry,,`;

  it('handles empty optional fields gracefully', () => {
    const result = parseFFCSV(sparseCSV);

    expect(result.success).toBe(true);
    expect(result.observations).toHaveLength(2);

    expect(result.observations[0].temp).toBeUndefined();
    expect(result.observations[0].cervicalMucus).toBeUndefined();
    expect(result.observations[0].opk).toBeUndefined();
    expect(result.observations[0].intercourse).toBeUndefined();
  });
});

describe('convertToObservations', () => {
  it('creates separate observations for each data type', () => {
    const result = parseFFCSV(sampleCSV);
    const observations = convertToObservations(result.observations);

    // Each day has BBT, CM, and OPK = 3 observations per day
    // 14 days * 3 = 42 observations (some may be missing)
    expect(observations.length).toBeGreaterThan(0);
  });

  it('creates BBT observations with correct type', () => {
    const result = parseFFCSV(sampleCSV);
    const observations = convertToObservations(result.observations);

    const bbtObs = observations.filter((o) => o.type === 'bbt');
    expect(bbtObs.length).toBe(14);
    expect(bbtObs[0]).toHaveProperty('value');
  });

  it('creates cervical mucus observations with mapped values', () => {
    const result = parseFFCSV(sampleCSV);
    const observations = convertToObservations(result.observations);

    const cmObs = observations.filter((o) => o.type === 'cervical-mucus');
    expect(cmObs.length).toBeGreaterThan(0);

    // Check that eggwhite is mapped to egg-white
    const eggWhiteObs = cmObs.find((o) => 'value' in o && o.value === 'egg-white');
    expect(eggWhiteObs).toBeDefined();
  });

  it('creates OPK observations with mapped values', () => {
    const result = parseFFCSV(sampleCSV);
    const observations = convertToObservations(result.observations);

    const opkObs = observations.filter((o) => o.type === 'opk');
    expect(opkObs.length).toBeGreaterThan(0);
  });

  it('generates unique IDs for each observation', () => {
    const result = parseFFCSV(sampleCSV);
    const observations = convertToObservations(result.observations);

    const ids = observations.map((o) => o.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('sets timestamps on all observations', () => {
    const result = parseFFCSV(sampleCSV);
    const observations = convertToObservations(result.observations);

    for (const obs of observations) {
      expect(obs.createdAt).toBeDefined();
      expect(obs.updatedAt).toBeDefined();
    }
  });
});

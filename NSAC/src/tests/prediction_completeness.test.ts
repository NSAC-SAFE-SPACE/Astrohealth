import { describe, expect, it, vi } from 'vitest';
import { BODY_MEASURE_FIELDS } from '../engine/config/bodyMeasures';
import { getMissingBodyFields, getMissingMentalFields, isBodyComplete, isMentalComplete } from '../services/predictionCompleteness';
import { predictBody, predictMental, PredictionApiError } from '../services/predictionApi';

const bodyPayload = Object.fromEntries(BODY_MEASURE_FIELDS.map((field) => {
  const value = (field.plausibility.min + field.plausibility.max) / 2;
  return [({ Bone_ZScore: 'Z_Score', Muscle_Strength_Loss: 'muscle_strength_loss', Heart_Rate: 'heart_rate', Systolic_BP: 'systolic_pressure', Diastolic_BP: 'diastolic_pressure', SpO2: 'spo2', Radiation_Dose_Daily: 'daily_radiation_dose', Radiation_Dose_Cumulative: 'cumulative_radiation_dose', Intraocular_Pressure: 'intraocular_pressure', Body_Temperature: 'body_temperature', Urine_Specific_Gravity: 'urine_density', CO2_Partial_Pressure: 'cabin_co2', Fasting_Glucose: 'blood_glucose' } as Record<string, string>)[field.key], value];
}));

const mentalPayload = {
  Stress_Level: 'Medium', Happiness: 7, Mood_Score: 'positive', Sleep_Quality: 40,
  'Workload Perception': 'possible', Time_Perception: 'Normal', Food: 'Good', Communication_with_Earth_mins: 90
};

describe('prediction completeness guards', () => {
  it('blocks each missing body input and names the field', async () => {
    for (const key of Object.keys(bodyPayload)) {
      const missing = { ...bodyPayload };
      delete missing[key];
      expect(isBodyComplete(missing), key).toBe(false);
      expect(getMissingBodyFields(missing).map((field) => field.key), key).toContain(key);
      const fetcher = vi.fn();
      await expect(predictBody(missing, fetcher as unknown as typeof fetch)).rejects.toMatchObject({ code: 'incomplete' });
      expect(fetcher).not.toHaveBeenCalled();
    }
  });

  it.each([null, undefined, '', NaN, 999999])('blocks invalid body value %s', async (value) => {
    const invalid = { ...bodyPayload, heart_rate: value };
    expect(isBodyComplete(invalid)).toBe(false);
    expect(getMissingBodyFields(invalid).map((field) => field.key)).toContain('heart_rate');
    const fetcher = vi.fn();
    await expect(predictBody(invalid, fetcher as unknown as typeof fetch)).rejects.toMatchObject({ code: 'incomplete' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires exactly the 13 body API keys', () => {
    expect(isBodyComplete(bodyPayload)).toBe(true);
    expect(isBodyComplete({ ...bodyPayload, extra: 1 })).toBe(false);
  });

  it('blocks each missing mental input and names the field without network calls', async () => {
    for (const key of Object.keys(mentalPayload)) {
      const missing = { ...mentalPayload };
      delete missing[key];
      expect(isMentalComplete(missing), key).toBe(false);
      expect(getMissingMentalFields(missing).map((field) => field.key), key).toContain(key);
      const fetcher = vi.fn();
      await expect(predictMental(missing as never, fetcher as unknown as typeof fetch)).rejects.toMatchObject({ code: 'incomplete' });
      expect(fetcher).not.toHaveBeenCalled();
    }
  });

  it.each([
    ['Stress_Level', 'high'], ['Happiness', NaN], ['Happiness', 11], ['Mood_Score', 'Positive'],
    ['Sleep_Quality', 62.54], ['Workload Perception', 'hard'], ['Time_Perception', 'fast'],
    ['Food', 'good'], ['Communication_with_Earth_mins', -1]
  ])('rejects invalid mental value for %s', async (key, value) => {
    const invalid = { ...mentalPayload, [key]: value };
    expect(isMentalComplete(invalid)).toBe(false);
    expect(getMissingMentalFields(invalid).length).toBeGreaterThan(0);
    const fetcher = vi.fn();
    await expect(predictMental(invalid as never, fetcher as unknown as typeof fetch)).rejects.toBeInstanceOf(PredictionApiError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('accepts valid 13 and 8 field payloads', () => {
    expect(isBodyComplete(bodyPayload)).toBe(true);
    expect(isMentalComplete(mentalPayload)).toBe(true);
  });

  it('sends only validated model fields and returns the API response unchanged', async () => {
    const bodyFetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify({ label: 'stable', score: 0.73 }), { status: 200, headers: { 'X-API-Version': 'test-version' } }));
    const bodyResult = await predictBody(bodyPayload, bodyFetcher as unknown as typeof fetch);
    expect(bodyFetcher).toHaveBeenCalledOnce();
    expect(bodyFetcher.mock.calls[0][0]).toBe('/api/prediction/body');
    expect(JSON.parse(String(bodyFetcher.mock.calls[0][1]?.body))).toEqual(bodyPayload);
    expect(bodyResult.raw).toEqual({ label: 'stable', score: 0.73 });
    expect(bodyResult.apiVersion).toBe('test-version');

    const mentalFetcher = vi.fn(async () => new Response(JSON.stringify({ prediction: 'positive' }), { status: 200 }));
    await predictMental(mentalPayload, mentalFetcher as unknown as typeof fetch);
    expect(mentalFetcher.mock.calls[0][0]).toBe('/api/prediction/mental');
    expect(JSON.parse(String(mentalFetcher.mock.calls[0][1]?.body))).toEqual(mentalPayload);
  });
});

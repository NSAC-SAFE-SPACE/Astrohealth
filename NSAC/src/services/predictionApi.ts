import { isBodyComplete, isMentalComplete, type MentalPredictionPayload } from './predictionCompleteness';

export type PredictionKind = 'body' | 'mental';
export type PredictionApiResult = { kind: PredictionKind; raw: unknown; apiVersion: string };

export class PredictionApiError extends Error {
  constructor(message: string, readonly code: 'incomplete' | 'timeout' | 'network' | 'http' | 'invalid_response', readonly status?: number) {
    super(message); this.name = 'PredictionApiError';
  }
}

// Keep browser requests same-origin. The Vite dev proxy and production server
// relay these fixed routes to the upstream APIs, avoiding browser CORS blocks.
const BODY_URL = import.meta.env.VITE_BODY_PREDICTION_URL || '/api/prediction/body';
const MENTAL_URL = import.meta.env.VITE_MENTAL_PREDICTION_URL || '/api/prediction/mental';
const REQUEST_TIMEOUT_MS = 12_000;

export function predictBody(data: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<PredictionApiResult> {
  // Validate before any network call; an injected fetcher is used only by unit tests.
  if (!isBodyComplete(data)) return Promise.reject(new PredictionApiError('Les 13 mesures corporelles doivent être présentes et valides.', 'incomplete'));
  return postPrediction('body', BODY_URL, data, fetcher);
}

export function predictMental(data: MentalPredictionPayload, fetcher: typeof fetch = fetch): Promise<PredictionApiResult> {
  if (!isMentalComplete(data)) return Promise.reject(new PredictionApiError('Les huit paramètres mentaux doivent être présents et valides.', 'incomplete'));
  return postPrediction('mental', MENTAL_URL, data as unknown as Record<string, unknown>, fetcher);
}

async function postPrediction(kind: PredictionKind, url: string, payload: Record<string, unknown>, fetcher: typeof fetch): Promise<PredictionApiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    const text = await response.text();
    let raw: unknown;
    try { raw = text.length ? JSON.parse(text) : null; }
    catch { throw new PredictionApiError('La réponse de l’API n’est pas un JSON valide.', 'invalid_response', response.status); }
    if (!response.ok) {
      const detail = typeof raw === 'object' && raw !== null && 'detail' in raw ? String((raw as { detail: unknown }).detail) : `HTTP ${response.status}`;
      throw new PredictionApiError(`L’API a refusé la prédiction (${response.status}) : ${detail}`, 'http', response.status);
    }
    if (raw === null) throw new PredictionApiError('L’API a répondu sans résultat.', 'invalid_response', response.status);
    return { kind, raw, apiVersion: response.headers.get('X-API-Version') ?? (kind === 'body' ? '1.2.0' : '2.0.0') };
  } catch (error) {
    if (error instanceof PredictionApiError) throw error;
    if (controller.signal.aborted) throw new PredictionApiError('Délai dépassé : l’API de prédiction ne répond pas.', 'timeout');
    throw new PredictionApiError('API injoignable. Vérifiez la connexion puis réessayez.', 'network');
  } finally { clearTimeout(timer); }
}

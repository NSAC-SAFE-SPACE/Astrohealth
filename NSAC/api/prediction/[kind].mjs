const predictionApis = {
  body: process.env.ASTRO_BODY_PREDICTION_URL || 'https://api-259997c9.fastapicloud.dev/predict',
  mental: process.env.ASTRO_MENTAL_PREDICTION_URL || 'https://mental.fastapicloud.dev/predict'
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ detail: 'Method not allowed' });
    return;
  }

  const kind = Array.isArray(request.query?.kind) ? request.query.kind[0] : request.query?.kind;
  const upstreamUrl = predictionApis[kind];
  if (!upstreamUrl) {
    response.status(404).json({ detail: 'Unknown prediction model' });
    return;
  }

  const payload = request.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    response.status(400).json({ detail: 'Expected a JSON object' });
    return;
  }
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 64 * 1024) {
    response.status(413).json({ detail: 'Request body is too large' });
    return;
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000)
    });
    const result = await upstream.text();
    response.status(upstream.status);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    const version = upstream.headers.get('x-api-version');
    if (version) response.setHeader('X-API-Version', version);
    response.end(result);
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError';
    response.status(timedOut ? 504 : 502).json({ detail: timedOut ? 'Prediction API timed out' : 'Prediction API is unavailable' });
  }
}

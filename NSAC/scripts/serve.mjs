import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { request as httpsRequest } from 'node:https';

const bodyApi = new URL(process.env.ASTRO_BODY_PREDICTION_URL || 'https://api-259997c9.fastapicloud.dev/predict');
const mentalApi = new URL(process.env.ASTRO_MENTAL_PREDICTION_URL || 'https://mental.fastapicloud.dev/predict');
const routes = new Map([
  ['/api/prediction/body', bodyApi],
  ['/api/prediction/mental', mentalApi]
]);
const staticRoot = resolve(process.env.STATIC_DIR || 'dist');
const maxBodyBytes = 64 * 1024;
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp'], ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'], ['.ico', 'image/x-icon'], ['.webmanifest', 'application/manifest+json']
]);

function sendJson(response, status, detail) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify({ detail }));
}

async function readJsonBody(request) {
  if (!request.headers['content-type']?.toLowerCase().includes('application/json')) throw Object.assign(new Error('Content-Type must be application/json'), { status: 415 });
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) throw Object.assign(new Error('Request body is too large'), { status: 413 });
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  try {
    JSON.parse(body.toString('utf8'));
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON'), { status: 400 });
  }
  return body;
}

function proxyPrediction(request, response, upstreamUrl) {
  if (request.method !== 'POST') {
    response.setHeader('allow', 'POST');
    return sendJson(response, 405, 'Method not allowed');
  }
  readJsonBody(request).then((body) => {
    const upstream = httpsRequest(upstreamUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json', 'accept': 'application/json',
        'content-length': body.length
      },
      timeout: 15000
    }, (upstreamResponse) => {
      const headers = { 'cache-control': 'no-store' };
      for (const name of ['content-type', 'x-api-version']) {
        const value = upstreamResponse.headers[name];
        if (typeof value === 'string') headers[name] = value;
      }
      response.writeHead(upstreamResponse.statusCode || 502, headers);
      upstreamResponse.pipe(response);
    });
    upstream.on('timeout', () => upstream.destroy(new Error('Upstream timeout')));
    upstream.on('error', () => {
      if (!response.headersSent) sendJson(response, 502, 'Prediction API is unavailable');
      else response.destroy();
    });
    upstream.end(body);
  }).catch((error) => sendJson(response, error.status || 400, error.message || 'Invalid request'));
}

function serveStatic(request, response, pathname) {
  if (!['GET', 'HEAD'].includes(request.method || '')) return sendJson(response, 405, 'Method not allowed');
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return sendJson(response, 400, 'Invalid path'); }
  const requestedPath = resolve(staticRoot, `.${decoded}`);
  if (requestedPath !== staticRoot && !requestedPath.startsWith(`${staticRoot}${sep}`)) return sendJson(response, 403, 'Forbidden');
  const filePath = existsSync(requestedPath) && statSync(requestedPath).isFile() ? requestedPath : resolve(staticRoot, 'index.html');
  if (!existsSync(filePath)) return sendJson(response, 503, 'Application build is missing; run npm run build first');
  response.writeHead(200, { 'content-type': mimeTypes.get(filePath.slice(filePath.lastIndexOf('.'))) || 'application/octet-stream' });
  if (request.method === 'HEAD') return response.end();
  createReadStream(filePath).pipe(response);
}

if (!existsSync(resolve(staticRoot, 'index.html'))) {
  console.error(`No built application found in ${staticRoot}; run npm run build first.`);
  process.exit(1);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  const upstreamUrl = routes.get(pathname);
  if (upstreamUrl) return proxyPrediction(request, response, upstreamUrl);
  return serveStatic(request, response, pathname);
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => console.log(`Astrohealth listening on http://${host}:${port}`));

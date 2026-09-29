// Shared helpers for Wattlab serverless functions (Node 18+, no dependencies)
const buckets = new Map();

function json(status, body, extra = {}) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...extra },
    body: JSON.stringify(body),
  };
}

// Very small in-memory rate limiter (per warm instance): max N hits per window per IP
function rateLimited(event, max = 5, windowMs = 10 * 60 * 1000) {
  const ip = (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const hits = (buckets.get(ip) || []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(ip, hits);
  if (buckets.size > 2000) buckets.clear();
  return hits.length > max;
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function sameOrigin(event) {
  const origin = event.headers.origin || '';
  if (!origin) return true;
  const allowed = [process.env.URL, process.env.SITE_URL, 'http://localhost:8888'].filter(Boolean);
  return allowed.some((a) => origin === a) || /^https:\/\/[a-z0-9-]+--?[a-z0-9-]*\.netlify\.app$/.test(origin);
}

module.exports = { json, rateLimited, EMAIL_RE, clean, sameOrigin };

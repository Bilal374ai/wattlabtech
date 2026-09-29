// GET /.netlify/functions/media?q=keyword&type=video|image&format=landscape|portrait|square&page=1&random=1&
//
// Server-side search on Pexels. The API keys live ONLY in Netlify environment variables
// (never in the browser / never in the repo):
//   PEXELS_API_KEY
//
// What it returns
//  - items that closely match the keyword (all words matched first, partial matches after)
//  - a different, shuffled selection on every call (random page + shuffle inside relevance tiers)
//  - only the chosen format:   landscape 16:9 (YouTube / Facebook)
//                              portrait  9:16 (TikTok / Instagram Reels / Shorts)
//                              square    1:1  (Instagram / Facebook posts)
//  - every quality that really exists: 1080p, 2K, 4K (never upscaled / never fake)
const { json, rateLimited, clean, sameOrigin } = require('./_util');

// Keys: Netlify environment variables first; if the deploy method (e.g. drag & drop) does not pass them, use ./_keys.js
let FILE_KEYS = {};
try { FILE_KEYS = require('./_keys') || {}; } catch (e) { FILE_KEYS = {}; }
const KEY = (n) => process.env[n] || FILE_KEYS[n] || '';

const PER_PAGE = 20;
const TTL = 10 * 60 * 1000;
const RANDOM_PAGES = 4; // first search picks one of the first N pages (still relevant, but different each time)
const cache = new Map();

// Only ever hand the browser links that point at these hosts
const HOST_OK = /(^|\.)(pexels\.com|pixabay\.com|vimeocdn\.com)$/i;
const safeUrl = (u) => {
  try { const x = new URL(String(u || '')); return x.protocol === 'https:' && HOST_OK.test(x.hostname) ? x.href : ''; } catch { return ''; }
};

const FORMATS = ['landscape', 'portrait', 'square'];

// Short side of the file decides the quality bucket (works for 16:9, 9:16 and 1:1)
function bucketOf(w, h) {
  const short = Math.min(w || 0, h || 0);
  if (short >= 2100) return '4k';
  if (short >= 1400) return '2k';
  if (short >= 1060) return '1080p';
  if (short >= 700) return '720p';
  return null;
}
const RANK = { '720p': 1, '1080p': 2, '2k': 3, '4k': 4, original: 5 };
const fits = (w, h, format) => {
  if (!w || !h) return true;
  const r = w / h;
  return format === 'landscape' ? r > 1.15 : format === 'portrait' ? r < 0.87 : r >= 0.87 && r <= 1.15;
};

function addDownload(map, w, h, url, extra = 0) {
  const b = bucketOf(w, h);
  const u = safeUrl(url);
  if (!b || !u) return;
  // keep the smallest file that still qualifies for the bucket
  const area = (w || 0) * (h || 0) + extra;
  if (!map[b] || area < map[b].area) map[b] = { url: u, w, h, area };
}
const finish = (map) => Object.keys(map).sort((a, b) => RANK[a] - RANK[b]).reduce((o, k) => { o[k] = { url: map[k].url, w: map[k].w, h: map[k].h }; return o; }, {});

async function getJson(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error('HTTP ' + res.status + (t ? ' - ' + t.replace(/\s+/g, ' ').slice(0, 80) : ''));
  }
  return res.json();
}

// ---------------- keyword relevance ----------------
const STOP = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'is', 'are']);
const stem = (w) => (w.length > 4 ? w.replace(/ies$/, 'y').replace(/s$/, '') : w);
const words = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
const queryTokens = (q) => [...new Set(words(q).filter((w) => !STOP.has(w)).map(stem))];
const slugText = (u) => { try { const p = new URL(u).pathname.split('/').filter(Boolean); return (p[p.length - 1] || '').replace(/-\d+$/, '').replace(/-/g, ' '); } catch { return ''; } };

function score(tokens, text) {
  if (!tokens.length || !text) return -1; // unknown
  const have = new Set(words(text).map(stem));
  let hit = 0;
  tokens.forEach((t) => { if (have.has(t) || [...have].some((h) => h.length > 3 && t.length > 3 && (h.startsWith(t) || t.startsWith(h)))) hit++; });
  return hit / tokens.length;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------- Pexels ----------------
async function pexels(q, type, page, format) {
  const key = KEY('PEXELS_API_KEY');
  if (!key) throw new Error('no key');
  const base = type === 'video' ? 'https://api.pexels.com/videos/search' : 'https://api.pexels.com/v1/search';
  const url = `${base}?query=${encodeURIComponent(q)}&per_page=${PER_PAGE}&page=${page}&orientation=${format}`;
  const d = await getJson(url, { Authorization: key });
  const total = d.total_results || 0;

  if (type === 'video') {
    const items = (d.videos || []).map((v) => {
      const dl = {};
      let preview = '';
      let previewW = 1e9;
      (v.video_files || []).forEach((f) => {
        if (f.file_type && f.file_type !== 'video/mp4') return;
        addDownload(dl, f.width, f.height, f.link, (f.fps || 0) > 31 ? 1e6 : 0);
        const s = Math.min(f.width || 0, f.height || 0);
        if (s >= 300 && s < previewW && f.link) { preview = f.link; previewW = s; }
      });
      return {
        id: 'px-v-' + v.id, source: 'pexels', type: 'video',
        thumb: safeUrl(v.image), preview: safeUrl(preview),
        width: v.width, height: v.height, duration: v.duration || 0,
        user: (v.user && v.user.name) || 'Pexels', userUrl: safeUrl(v.user && v.user.url), pageUrl: safeUrl(v.url),
        alt: clean(slugText(v.url), 140),
        downloads: finish(dl),
      };
    });
    return { items, total };
  }

  const TARGETS = {
    landscape: { '1080p': [1920, 1080], '2k': [2560, 1440], '4k': [3840, 2160] },
    portrait: { '1080p': [1080, 1920], '2k': [1440, 2560], '4k': [2160, 3840] },
    square: { '1080p': [1080, 1080], '2k': [1440, 1440], '4k': [2160, 2160] },
  }[format];

  const items = (d.photos || []).map((p) => {
    const dl = {};
    const src = p.src || {};
    const orig = safeUrl(src.original);
    if (orig) {
      Object.keys(TARGETS).forEach((b) => {
        const [w, h] = TARGETS[b];
        if (p.width < w || p.height < h) return; // never upscale
        // Pexels image CDN crops server-side to the exact platform size
        dl[b] = { url: `${orig}?fit=crop&w=${w}&h=${h}`, w, h };
      });
      dl.original = { url: orig, w: p.width, h: p.height };
    }
    return {
      id: 'px-i-' + p.id, source: 'pexels', type: 'image',
      thumb: safeUrl(src.large || src.medium), preview: '',
      width: p.width, height: p.height, duration: 0,
      user: p.photographer || 'Pexels', userUrl: safeUrl(p.photographer_url), pageUrl: safeUrl(p.url),
      alt: clean((p.alt || '') + ' ' + slugText(p.url), 160),
      downloads: dl,
    };
  });
  return { items, total };
}

const NO_STORE = { 'Cache-Control': 'no-store' }; // results are shuffled per visitor -> never share via CDN

// one cached upstream page (raw, unshuffled)
async function rawPage(name, q, type, page, format) {
  const ck = [name, q.toLowerCase(), type, format, page].join('|');
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.t < TTL) return hit.data;
  const data = await pexels(q, type, page, format);
  cache.set(ck, { t: Date.now(), data });
  if (cache.size > 400) cache.clear();
  return data;
}

exports.handler = async (event) => {
  if (event.httpMethod && event.httpMethod !== 'GET') return json(405, { status: 'error', message: 'Method not allowed' });
  if (!sameOrigin(event)) return json(403, { status: 'error', message: 'Forbidden' });
  // /.netlify/functions/media?diag=1 -> shows only whether the keys are visible to the function (never the keys themselves)
  if ((event.queryStringParameters || {}).diag === '1') {
    return json(200, { pexelsKey: !!KEY('PEXELS_API_KEY'), from: { env: !!process.env.PEXELS_API_KEY, file: !!FILE_KEYS.PEXELS_API_KEY }, context: process.env.CONTEXT || null, deployId: process.env.DEPLOY_ID || null }, NO_STORE);
  }
  // ?diag=2 -> makes one tiny live request to each provider and reports the HTTP status / error text (keys never shown)
  if ((event.queryStringParameters || {}).diag === '2') {
    const out = {};
    const probe = async (name, url, headers) => {
      try {
        const r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
        const t = await r.text();
        out[name] = { status: r.status, ok: r.ok, body: r.ok ? 'ok' : t.replace(/\s+/g, ' ').slice(0, 160) };
      } catch (e) { out[name] = { error: String(e && e.message || e), cause: String(e && e.cause && (e.cause.code || e.cause.message) || '') }; }
    };
    const jobs = [];
    if (KEY('PEXELS_API_KEY')) jobs.push(probe('pexels', 'https://api.pexels.com/videos/search?query=car&per_page=1', { Authorization: KEY('PEXELS_API_KEY') }));
    await Promise.all(jobs);
    out.node = process.version;
    out.fetch = typeof fetch;
    return json(200, out, NO_STORE);
  }
  if (rateLimited(event, 60, 10 * 60 * 1000)) return json(429, { status: 'error', message: 'Too many searches, please wait a few minutes.' }, { 'Retry-After': '120' });

  const p = event.queryStringParameters || {};
  const q = clean(p.q, 100);
  const type = p.type === 'image' ? 'image' : 'video';
  const format = FORMATS.includes(p.format) ? p.format : 'landscape';
  let page = Math.min(Math.max(parseInt(p.page, 10) || 1, 1), 50);
  if (q.length < 2) return json(400, { status: 'error', message: 'Please enter a keyword.' });

  const names = [];
  if (KEY('PEXELS_API_KEY')) names.push('pexels');
  if (!names.length) return json(503, { status: 'error', message: 'Search is not configured yet (API keys missing).' }, NO_STORE);

  // random=1 -> first search of a visit: learn how many pages exist, then jump to a random one of the best pages
  let knownPages = 0;
  const fetchAll = (pg) => Promise.allSettled(names.map((n) => rawPage(n, q, type, pg, format)));
  let res;
  if (p.random === '1') {
    res = await fetchAll(1);
    const totals = res.map((r) => (r.status === 'fulfilled' ? r.value.total : 0));
    knownPages = Math.max(1, Math.ceil(Math.max(0, ...totals) / PER_PAGE));
    const pick = 1 + Math.floor(Math.random() * Math.min(knownPages, RANDOM_PAGES));
    if (pick !== 1) { page = pick; res = await fetchAll(pick); } else page = 1;
  } else {
    res = await fetchAll(page);
  }

  let items = [];
  let total = 0;
  const failed = [];
  const reasons = [];
  res.forEach((r, i) => {
    if (r.status === 'fulfilled') { items = items.concat(r.value.items); total = Math.max(total, r.value.total); }
    else { failed.push(names[i]); reasons.push(names[i] + ': ' + String((r.reason && (r.reason.message || r.reason)) || 'error') + (r.reason && r.reason.cause ? ' (' + (r.reason.cause.code || r.reason.cause.message) + ')' : '')); }
  });
  if (failed.length === names.length) return json(502, { status: 'error', message: 'Search service is temporarily unavailable. Please try again. [' + reasons.join(' | ').slice(0, 220) + ']' }, NO_STORE);

  // exact format only (Pexels filters natively) + must have a real download
  items = items.filter((it) => it.thumb && Object.keys(it.downloads).length && fits(it.width, it.height, format));

  // keyword closeness: every word matched > some words matched > unknown; nothing-matched is dropped when there are enough good ones
  const tokens = queryTokens(q);
  items.forEach((it) => { it._s = score(tokens, it.alt); });
  const good = items.filter((it) => it._s > 0 || it._s === -1);
  if (good.length >= 3) items = good;
  const tier = (s) => (s === 1 ? 3 : s > 0 ? 2 : s === -1 ? 1 : 0);
  const buckets = [[], [], [], []];
  items.forEach((it) => buckets[tier(it._s)].push(it));
  items = [].concat(shuffle(buckets[3]), shuffle(buckets[2]), shuffle(buckets[1]), shuffle(buckets[0]));
  items.forEach((it) => { delete it._s; });

  const totalPages = Math.max(knownPages || 1, Math.ceil(total / PER_PAGE), 1);
  return json(200, { status: 'ok', items, totalPages, page, failed }, NO_STORE);
};

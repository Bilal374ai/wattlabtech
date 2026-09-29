// GET /.netlify/functions/news?topic=ev|reviews|tech|videos
// Fetches Google News / YouTube RSS server-side (no third-party CORS proxies) and
// returns rss2json-compatible JSON so the front-end code stays simple.
const { json } = require('./_util');

const TOPICS = {
  ev:      'electric vehicle EV news 2026',
  reviews: 'new car review 2026 electric',
  tech:    'car technology autonomous AI driving 2026',
};
const YT_CHANNEL = 'UCBCGwx0N4YJwzqd4ly4hiRw';
const TTL = 15 * 60 * 1000;
const cache = new Map();

const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
const strip = (s) => decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (block, name) => { const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? m[1] : ''; };
const safeUrl = (u) => { try { const x = new URL(decode(u).trim()); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };

function parseNews(xml) {
  return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(0, 30).map((it) => ({
    title: strip(tag(it, 'title')),
    link: safeUrl(tag(it, 'link')),
    pubDate: strip(tag(it, 'pubDate')),
    author: strip(tag(it, 'source')),
    description: strip(tag(it, 'description')).slice(0, 200),
  })).filter((i) => i.title && i.link);
}

exports.handler = async (event) => {
  const topic = (event.queryStringParameters || {}).topic || 'ev';
  if (!TOPICS[topic] && topic !== 'videos') return json(400, { status: 'error', message: 'Unknown topic' });

  const hit = cache.get(topic);
  if (hit && Date.now() - hit.t < TTL) return json(200, hit.data, { 'Cache-Control': 'public, max-age=300, s-maxage=900' });

  try {
    const url = topic === 'videos'
      ? `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL}`
      : `https://news.google.com/rss/search?q=${encodeURIComponent(TOPICS[topic])}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'WattlabBot/1.0 (+https://wattlabtech.netlify.app)' } });
    if (!res.ok) throw new Error('upstream ' + res.status);
    const xml = await res.text();
    const data = topic === 'videos'
      ? { status: 'ok', contents: xml }
      : { status: 'ok', items: parseNews(xml) };
    if (topic !== 'videos' && !data.items.length) throw new Error('empty');
    cache.set(topic, { t: Date.now(), data });
    return json(200, data, { 'Cache-Control': 'public, max-age=300, s-maxage=900' });
  } catch (e) {
    if (hit) return json(200, hit.data, { 'Cache-Control': 'public, max-age=60' }); // serve stale
    return json(502, { status: 'error', message: 'Feed temporarily unavailable' }, { 'Cache-Control': 'no-store' });
  }
};

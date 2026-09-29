// POST /.netlify/functions/subscribe  (JSON: {email, website})
// Validates server-side, blocks bots (honeypot + rate limit) and only reports success
// when the upstream actually accepted the address.
//   Option A (recommended): set BUTTONDOWN_API_KEY in Netlify env -> real double-opt-in newsletter.
//   Option B (default):     no key -> stored in Netlify Forms ("newsletter") and emailed via Site > Forms > Notifications.
const { json, rateLimited, EMAIL_RE, clean, sameOrigin } = require('./_util');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { ok: false, message: 'Forbidden' });
  if (rateLimited(event, 5)) return json(429, { ok: false, message: 'Too many attempts. Please try again later.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, message: 'Invalid request' }); }
  if (body.website) return json(200, { ok: true }); // honeypot: silently drop bots

  const email = clean(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, message: 'Please enter a valid email address.' });

  try {
    if (process.env.BUTTONDOWN_API_KEY) {
      const r = await fetch('https://api.buttondown.email/v1/subscribers', {
        method: 'POST',
        headers: { Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_address: email, tags: ['wattlab-site'] }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.status === 409 || r.status === 422) return json(200, { ok: true, message: 'You are already on the list.' });
      if (!r.ok) throw new Error('buttondown ' + r.status);
      return json(200, { ok: true, message: 'Almost done! Check your inbox to confirm your subscription.' });
    }
    const site = process.env.URL || process.env.SITE_URL;
    if (!site) throw new Error('site url unknown');
    const r = await fetch(site + '/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'form-name': 'newsletter', email }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error('forms ' + r.status);
    return json(200, { ok: true, message: "You're subscribed. Thanks for joining Wattlab Weekly!" });
  } catch (e) {
    return json(502, { ok: false, message: 'Could not subscribe right now. Please try again later.' });
  }
};

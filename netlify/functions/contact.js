// POST /.netlify/functions/contact (JSON) -> validates, then stores the message in Netlify Forms ("contact" form).
// Read it in Netlify -> Forms -> contact, and get it by email via Forms -> Settings & usage -> Form notifications.
// Optional: set FORMSPREE_ENDPOINT in Netlify env to send to Formspree instead.
const { json, rateLimited, EMAIL_RE, clean, sameOrigin } = require('./_util');
const ENDPOINT = process.env.FORMSPREE_ENDPOINT || '';
const SUBJECTS = ['Sponsorship Inquiry', 'Press & Media', 'EV Question', 'Article Suggestion', 'Technical Issue', 'General Question'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, message: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(event)) return json(403, { ok: false, message: 'Forbidden' });
  if (rateLimited(event, 4)) return json(429, { ok: false, message: 'Too many messages. Please try again later.' });

  let b;
  try { b = JSON.parse(event.body || '{}'); } catch { return json(400, { ok: false, message: 'Invalid request' }); }
  if (b.website) return json(200, { ok: true }); // honeypot

  const name = clean(b.name, 100), email = clean(b.email, 254), subject = clean(b.subject, 60), message = clean(b.message, 4000);
  if (name.length < 2) return json(400, { ok: false, message: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, message: 'Please enter a valid email address.' });
  if (!SUBJECTS.includes(subject)) return json(400, { ok: false, message: 'Please choose a topic.' });
  if (message.length < 10) return json(400, { ok: false, message: 'Your message is too short.' });

  try {
    let r;
    if (ENDPOINT) {
      r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, subject, message, _replyto: email, _subject: `Wattlab: ${subject}` }),
        signal: AbortSignal.timeout(8000),
      });
    } else {
      const site = process.env.URL || process.env.SITE_URL;
      if (!site) throw new Error('site url unknown');
      r = await fetch(site + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 'form-name': 'contact', name, email, subject, message }).toString(),
        signal: AbortSignal.timeout(8000),
      });
    }
    if (!r.ok) throw new Error('upstream ' + r.status);
    return json(200, { ok: true, message: 'Message sent. We usually reply within 2 business days.' });
  } catch (e) {
    return json(502, { ok: false, message: 'Could not send your message. Please email us directly instead.' });
  }
};

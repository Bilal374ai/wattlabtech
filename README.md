# Wattlab – deploy & maintenance

## Deploy (Netlify)
1. Push this folder to GitHub (or drag-drop the folder into Netlify).
2. Netlify reads `netlify.toml` -> publishes the site root and deploys `netlify/functions/*` automatically.
3. Forms: Site -> Forms -> newsletter -> Notifications -> add your email (fallback storage for signups).

## Backend (Netlify Functions)
| Endpoint | What it does |
|---|---|
| `/.netlify/functions/news?topic=ev/reviews/tech/videos` | Fetches Google News / YouTube RSS server-side, 15-min cache, serves stale if upstream fails |
| `/.netlify/functions/media?q=&type=video\|image&format=landscape\|portrait\|square` | Video & Image Finder (videos.html): searches Pexels + Pixabay server-side, keyword-ranked, shuffled on every call, returns 1080p/2K/4K links |
| `/.netlify/functions/subscribe` | Validates email, honeypot + rate-limit, then Buttondown (if key set) or Netlify Forms. Reports success only if upstream accepted |
| `/.netlify/functions/contact` | Validates, honeypot + rate-limit, forwards to Formspree |

**Required for the Video & Image Finder** (Site settings -> Environment variables, then redeploy):
- `PEXELS_API_KEY` - keys are never placed in HTML/JS; without them the page shows "Search is not configured yet"

Optional environment variables (Site settings -> Environment variables):
- `BUTTONDOWN_API_KEY` - real double-opt-in newsletter (recommended)
- `FORMSPREE_ENDPOINT` - change contact destination (default: current form id)
- `SITE_URL` - your custom domain once you have one (e.g. https://wattlab.com)

## Tailwind CSS (no CDN)
Compiled files: `css/tw-site.css`, `css/tw-tools.css`. After adding new Tailwind classes run
`npm install && npm run build:css`. Bump `?v=3` in the HTML when you change css/js.

## Before applying to AdSense - checklist
- [ ] Custom domain (.com) connected; update URLs in sitemap.xml, robots.txt, canonicals
- [ ] AdSense -> Privacy & messaging -> create the EU/UK GDPR message (Google-certified CMP), then set USE_GOOGLE_CMP = true in js/consent.js
- [ ] Verify every claim in guides against official sources (IRS.gov, afdc.energy.gov)
- [ ] Replace "Wattlab Editorial Team" bylines on the 3 new articles with the real author after review
- [ ] Use ONE contact email everywhere (about / contact / privacy)
- [ ] Submit sitemap in Google Search Console; keep publishing original articles (aim 20+ quality pages)
- [ ] Ads are kept only on article/tool pages. To add ads elsewhere, add the AdSense script to that page's head.

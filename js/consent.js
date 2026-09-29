/* Wattlab consent manager (Google Consent Mode v2). Loads BEFORE gtag/AdSense.
   - Analytics & ad storage stay DENIED until the visitor accepts.
   - Ads are limited to non-personalised until accepted.
   If you enable Google's own "Privacy & messaging" CMP in AdSense (required for EEA/UK/CH
   certified consent), set USE_GOOGLE_CMP = true so this banner does not show twice. */
(function () {
  var USE_GOOGLE_CMP = false;
  var KEY = 'wl_consent_v1';
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  window.adsbygoogle = window.adsbygoogle || [];

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function apply(v) {
    var g = v === 'granted' ? 'granted' : 'denied';
    gtag('consent', 'update', { ad_storage: g, ad_user_data: g, ad_personalization: g, analytics_storage: g });
    window.adsbygoogle.requestNonPersonalizedAds = g === 'granted' ? 0 : 1;
  }

  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
  window.adsbygoogle.requestNonPersonalizedAds = 1;
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);

  var saved = read();
  if (saved) apply(saved);
  if (USE_GOOGLE_CMP) return;

  function build() {
    if (document.getElementById('wl-consent')) return;
    var css = document.createElement('style');
    css.textContent = '#wl-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:100000;max-width:720px;margin:0 auto;background:#0f1218;color:#e5e7eb;border:1px solid #1f2937;border-radius:14px;padding:16px 18px;box-shadow:0 10px 40px rgba(0,0,0,.45);font:14px/1.5 Inter,system-ui,sans-serif}#wl-consent p{margin:0 0 12px}#wl-consent a{color:#00E5FF;text-decoration:underline}#wl-consent .wl-row{display:flex;gap:10px;flex-wrap:wrap}#wl-consent button{cursor:pointer;border-radius:10px;padding:9px 16px;font-weight:600;font-size:14px;border:1px solid #374151;background:transparent;color:#e5e7eb}#wl-consent button.wl-yes{background:#00E5FF;color:#0A0A0F;border-color:#00E5FF}#wl-consent button:focus-visible{outline:2px solid #00E5FF;outline-offset:2px}';
    document.head.appendChild(css);
    var box = document.createElement('div');
    box.id = 'wl-consent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Cookie consent');
    box.innerHTML = '<p>We use cookies to measure traffic (Google Analytics) and to show ads (Google AdSense). You can accept all, or reject non-essential cookies and still use every tool. See our <a href="privacy-policy.html#cookies">Privacy Policy</a>.</p><div class="wl-row"><button class="wl-yes" type="button" data-c="granted">Accept all</button><button type="button" data-c="denied">Reject non-essential</button></div>';
    box.addEventListener('click', function (e) {
      var c = e.target && e.target.getAttribute && e.target.getAttribute('data-c');
      if (!c) return;
      write(c); apply(c); box.remove();
    });
    document.body.appendChild(box);
  }
  function addFooterLink() {
    var f = document.querySelector('footer'); if (!f || f.querySelector('[data-cookie-settings]')) return;
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-cookie-settings', '');
    b.textContent = 'Cookie settings';
    b.style.cssText = 'display:block;margin:10px auto 0;background:none;border:0;color:#9ca3af;text-decoration:underline;cursor:pointer;font-size:12px';
    b.onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} build(); };
    (f.lastElementChild || f).appendChild(b);
  }
  function init() { addFooterLink(); if (!read()) build(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

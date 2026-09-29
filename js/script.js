/* =============================================
   Wattlab — Main Script  (v2)
   ============================================= */
document.addEventListener('DOMContentLoaded', function () {

  /* ── Footer year ── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Dark / Light mode ── */
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const isDark = document.documentElement.classList.toggle('dark');
      try { localStorage.theme = isDark ? 'dark' : 'light'; } catch (e) {}
    });
  }

  /* ── Mobile menu ── */
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      mobileMenu.classList.toggle('hidden');
    });
  }

  /* ── FAQ Accordion (native, no lib) ── */
  document.querySelectorAll('.faq-question').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const item = btn.parentElement;
      const wasActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
      if (!wasActive) item.classList.add('active');
    });
  });

  /* ── Category filter buttons ── */
  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.textContent.trim();
      document.querySelectorAll('.blog-card').forEach(function (card) {
        if (category === 'All') {
          card.style.display = '';
        } else {
          const badge = card.querySelector('.badge');
          card.style.display = (badge && badge.textContent.trim() === category) ? '' : 'none';
        }
      });
    });
  });

  /* ── Navbar Search ── */
  const searchWrap  = document.getElementById('nav-search-wrap');
  const searchBtn   = document.getElementById('nav-search-btn');
  const searchInput = document.getElementById('nav-search-input');
  const searchResults = document.getElementById('search-results');

  const SEARCH_INDEX = [
    { title: 'Best Electric Cars 2026', url: 'best-electric-cars-2026.html', tag: 'EVs' },
    { title: 'AI Self-Driving Cars 2026', url: 'ai-self-driving-cars.html', tag: 'AI' },
    { title: 'Tesla vs Rivian 2026', url: 'tesla-vs-rivian.html', tag: 'Review' },
    { title: 'EV Charging Guide 2026', url: 'ev-charging-guide-2026.html', tag: 'Guide' },
    { title: 'EV News', url: 'ev-news.html', tag: 'News' },
    { title: 'Car Reviews', url: 'car-reviews.html', tag: 'Reviews' },
    { title: 'Tech Articles', url: 'tech-articles.html', tag: 'Tech' },
    { title: 'Videos', url: 'videos.html', tag: 'Video' },
    { title: 'Break-Even Calculator', url: 'break-even.html', tag: 'Tool' },
    { title: 'Charging Time Calculator', url: 'charging-time.html', tag: 'Tool' },
    { title: 'EV Savings Calculator', url: 'calculator.html', tag: 'Tool' },
    { title: 'EV Incentives Checker', url: 'tax-credit.html', tag: 'Tool' },
    { title: 'Total Cost of Ownership', url: 'tco.html', tag: 'Tool' },
    { title: 'About Wattlab', url: 'about.html', tag: 'About' },
    { title: 'Contact Us', url: 'contact.html', tag: 'Contact' },
    { title: 'Solid-State Batteries 2026', url: 'ev-battery-technology-2026.html', tag: 'Tech' },
    { title: 'True Cost of Owning an EV', url: 'ev-cost-of-ownership-2026.html', tag: 'Guide' },
    { title: 'Home EV Charging Setup', url: 'how-to-charge-ev-at-home-2026.html', tag: 'Guide' },
    { title: 'Editorial Policy', url: 'editorial-policy.html', tag: 'About' },
  ];

  function renderResults(query) {
    if (!searchResults) return;
    if (!query || query.length < 2) {
      searchResults.classList.remove('visible');
      return;
    }
    const q = query.toLowerCase();
    const hits = SEARCH_INDEX.filter(item =>
      item.title.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q)
    ).slice(0, 6);

    if (hits.length === 0) {
      searchResults.innerHTML = '<p class="search-no-results">No results found.</p>';
    } else {
      searchResults.innerHTML = hits.map(item =>
        `<a href="${item.url}" class="search-result-item">
          ${item.title}
          <span class="sri-tag">${item.tag}</span>
        </a>`
      ).join('');
    }
    searchResults.classList.add('visible');
  }

  if (searchBtn && searchWrap && searchInput) {
    searchBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = searchWrap.classList.toggle('open');
      if (isOpen) { searchInput.focus(); }
      else { searchResults && searchResults.classList.remove('visible'); searchInput.value = ''; }
    });

    searchInput.addEventListener('input', () => renderResults(searchInput.value.trim()));
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        searchWrap.classList.remove('open');
        searchResults && searchResults.classList.remove('visible');
        searchInput.value = '';
      }
    });

    document.addEventListener('click', function (e) {
      if (!searchWrap.contains(e.target)) {
        searchWrap.classList.remove('open');
        searchResults && searchResults.classList.remove('visible');
        searchInput.value = '';
      }
    });
  }

  /* ── Newsletter (POST /.netlify/functions/subscribe) ── */
  (function () {
    const form = document.getElementById('newsletter-form');
    const msg = document.getElementById('newsletter-msg');
    if (!form) return;
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const email = (form.querySelector('[name="email"]') || {}).value || '';
      const bot = form.querySelector('[name="bot-field"]');
      if (btn) btn.disabled = true;
      let ok = false, text = 'Something went wrong. Please try again.';
      try {
        const res = await fetch('/.netlify/functions/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), website: bot ? bot.value : '' })
        });
        const data = await res.json().catch(() => ({}));
        ok = res.ok && data.ok === true;
        if (data.message) text = data.message;
      } catch (err) { text = 'Network error. Please check your connection and try again.'; }
      if (msg) { msg.textContent = (ok ? '✅ ' : '⚠️ ') + text; msg.style.display = 'block'; }
      if (ok) form.reset();
      if (btn) btn.disabled = false;
    });
  })();

  /* ── Lazy image polyfill for older Safari ── */
  if ('loading' in HTMLImageElement.prototype === false) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.src = img.dataset.src || img.src;
    });
  }

  /* ── Service Worker ── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

});

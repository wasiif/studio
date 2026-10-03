/**
 * studio · visitor count
 *
 * Increments a shared counter once per browser session and displays
 * the value in the footer badge. Uses Abacus — a free, no-signup
 * counter service.
 *
 * Fails silently: if the service is down or blocked, the badge
 * stays hidden. No layout shift, no errors, page works fine.
 */
(function () {
    'use strict';
  
    const el       = document.getElementById('visits');
    const countEl  = document.getElementById('visitCount');
    if (!el || !countEl) return;
  
    // Namespace and key — change these to differentiate counters
    const NS  = 'wasiif';
    const KEY = 'studio';
  
    // Session flags — mark that THIS browser session has been counted
    const SESSION_FLAG  = 'studio.visit.counted';
    const SESSION_CACHE = 'studio.visit.cache';
    const CACHE_TTL     = 5 * 60 * 1000; // 5 min
  
    const ENDPOINT_GET = 'https://abacus.jasoncameron.dev/get/' + NS + '/' + KEY;
    const ENDPOINT_HIT = 'https://abacus.jasoncameron.dev/hit/' + NS + '/' + KEY;
  
    function display(n) {
      if (typeof n !== 'number' || !isFinite(n) || n < 0) return;
      countEl.textContent = n.toLocaleString();
      el.hidden = false;
    }
  
    // Show cached number instantly (avoid empty badge flash)
    try {
      const raw = sessionStorage.getItem(SESSION_CACHE);
      if (raw) {
        const c = JSON.parse(raw);
        if (c && Date.now() - c.t < CACHE_TTL) display(c.n);
      }
    } catch (e) { /* ignore */ }
  
    async function request(url) {
      const ctl = new AbortController();
      const timeout = setTimeout(function () { ctl.abort(); }, 4000);
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          signal: ctl.signal
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } finally {
        clearTimeout(timeout);
      }
    }
  
    (async function () {
      try {
        const alreadyCounted = sessionStorage.getItem(SESSION_FLAG) === '1';
        const data = await request(alreadyCounted ? ENDPOINT_GET : ENDPOINT_HIT);
  
        if (!alreadyCounted) {
          try { sessionStorage.setItem(SESSION_FLAG, '1'); } catch (e) {}
        }
  
        if (data && typeof data.value === 'number') {
          display(data.value);
          try {
            sessionStorage.setItem(SESSION_CACHE, JSON.stringify({
              n: data.value,
              t: Date.now()
            }));
          } catch (e) {}
        }
      } catch (e) {
        // Silent — counter is decorative, not essential
      }
    })();
  })();
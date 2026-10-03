/**
 * studio · hub
 *
 * Fetches data/apps.json, builds the filter chips, renders the app grid,
 * and wires up search + keyboard navigation.
 *
 * No dependencies. Runs on page load.
 */
(function () {
    'use strict';
  
    /* ─────────────────────────────────────────
       ELEMENTS
       ───────────────────────────────────────── */
    const gridEl    = document.getElementById('appGrid');
    const filtersEl = document.getElementById('filters');
    const searchEl  = document.getElementById('searchInput');
    const countEl   = document.getElementById('heroCount');
    const yearEl    = document.getElementById('year');
  
    if (!gridEl || !filtersEl || !searchEl) return;
  
    /* ─────────────────────────────────────────
       STATE
       ───────────────────────────────────────── */
    let apps = [];
    let activeFilter = 'all';
    let searchQuery = '';
  
    /* ─────────────────────────────────────────
       HELPERS
       ───────────────────────────────────────── */
    function esc(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  
    function setYear() {
      if (yearEl) yearEl.textContent = new Date().getFullYear();
    }
  
    /* ─────────────────────────────────────────
       LOAD
       ───────────────────────────────────────── */
    async function load() {
      try {
        const res = await fetch('data/apps.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
  
        const data = await res.json();
        if (!data || !Array.isArray(data.apps)) {
          throw new Error('Malformed apps.json');
        }
  
        // Sort: newest first (by `added`), stable fallback to id
        apps = data.apps.slice().sort(function (a, b) {
          const da = a.added || '';
          const db = b.added || '';
          if (da !== db) return db.localeCompare(da);
          return String(a.id).localeCompare(String(b.id));
        });
  
        updateHeroCount();
        buildFilters();
        render();
        gridEl.setAttribute('aria-busy', 'false');
      } catch (err) {
        showError(err);
      }
    }
  
    function updateHeroCount() {
      if (!countEl) return;
      const n = apps.length;
      countEl.textContent = n === 0
        ? 'A small, growing collection'
        : (n === 1 ? '1 app so far' : n + ' apps so far');
    }
  
    function showError(err) {
      gridEl.setAttribute('aria-busy', 'false');
      gridEl.innerHTML =
        '<div class="empty">' +
          '<div class="empty-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="12" cy="12" r="10"/>' +
              '<line x1="12" y1="8" x2="12" y2="12"/>' +
              '<line x1="12" y1="16" x2="12.01" y2="16"/>' +
            '</svg>' +
          '</div>' +
          '<div class="empty-title">Couldn\u2019t load the app list</div>' +
          '<div class="empty-hint">' + esc(err && err.message ? err.message : 'Unknown error') + '</div>' +
        '</div>';
    }
  
    /* ─────────────────────────────────────────
       FILTERS
       ───────────────────────────────────────── */
    function buildFilters() {
      // Count tags across all apps
      const counts = { all: apps.length };
      apps.forEach(function (a) {
        (a.tags || []).forEach(function (t) {
          counts[t] = (counts[t] || 0) + 1;
        });
      });
  
      // Sort tags: highest count first, tie-break alphabetically
      const tags = Object.keys(counts)
        .filter(function (k) { return k !== 'all'; })
        .sort(function (a, b) {
          if (counts[b] !== counts[a]) return counts[b] - counts[a];
          return a.localeCompare(b);
        });
  
      let html = '<button class="chip active" data-filter="all" role="tab" aria-selected="true">All</button>';
      tags.forEach(function (t) {
        html +=
          '<button class="chip" data-filter="' + esc(t) + '" role="tab" aria-selected="false">' +
            esc(t.charAt(0).toUpperCase() + t.slice(1)) +
          '</button>';
      });
  
      filtersEl.innerHTML = html;
  
      filtersEl.querySelectorAll('.chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activeFilter = btn.dataset.filter;
          filtersEl.querySelectorAll('.chip').forEach(function (b) {
            const on = b === btn;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', on ? 'true' : 'false');
          });
          render();
        });
      });
    }
  
    /* ─────────────────────────────────────────
       FILTER + SEARCH
       ───────────────────────────────────────── */
    function visibleApps() {
      const q = searchQuery.trim().toLowerCase();
      return apps.filter(function (a) {
        if (activeFilter !== 'all' && (a.tags || []).indexOf(activeFilter) === -1) {
          return false;
        }
        if (!q) return true;
        const hay = [
          a.name, a.tagline, a.description, (a.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
  
    /* ─────────────────────────────────────────
       RENDER
       ───────────────────────────────────────── */
    function render() {
      const list = visibleApps();
      let html = '';
  
      if (!list.length) {
        html = emptyState();
      } else {
        list.forEach(function (app, i) {
          html += buildCard(app, i);
        });
      }
  
      // Always append the "more coming" placeholder
      html += placeholderCard();
  
      gridEl.innerHTML = html;
    }
  
    function emptyState() {
      return '' +
        '<div class="empty">' +
          '<div class="empty-icon">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
              '<circle cx="11" cy="11" r="7"/>' +
              '<line x1="16.5" y1="16.5" x2="21" y2="21"/>' +
            '</svg>' +
          '</div>' +
          '<div class="empty-title">No apps found</div>' +
          '<div class="empty-hint">Try a different search or filter.</div>' +
        '</div>';
    }
  
    function buildCard(app, i) {
      const num = String(i + 1).padStart(2, '0');
  
      const statusBadge = (app.status && app.status !== 'stable')
        ? '<span class="card-status" data-status="' + esc(app.status) + '">' + esc(app.status) + '</span>'
        : '';
  
      const tagsHTML = (app.tags || [])
        .map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; })
        .join('');
  
      return '' +
        '<a class="app-card" href="' + esc(app.href) + '">' +
          '<div class="card-preview">' +
            '<span class="card-num">' + num + '</span>' +
            '<img src="' + esc(app.preview) + '" alt="" loading="lazy">' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="card-head">' +
              '<h3 class="card-title">' + esc(app.name) + '</h3>' +
              '<div class="card-badges">' +
                '<span class="card-version">v' + esc(app.version) + '</span>' +
                statusBadge +
              '</div>' +
            '</div>' +
            '<p class="card-desc">' + esc(app.description) + '</p>' +
            '<div class="card-foot">' +
              '<div class="card-tags">' + tagsHTML + '</div>' +
              '<span class="card-arrow" aria-hidden="true">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
                  '<line x1="5" y1="12" x2="19" y2="12"/>' +
                  '<polyline points="13 6 19 12 13 18"/>' +
                '</svg>' +
              '</span>' +
            '</div>' +
          '</div>' +
        '</a>';
    }
  
    function placeholderCard() {
      return '' +
        '<div class="app-card placeholder" aria-hidden="true">' +
          '<div class="placeholder-inner">' +
            '<div class="plus-ring">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                '<line x1="12" y1="6" x2="12" y2="18"/>' +
                '<line x1="6" y1="12" x2="18" y2="12"/>' +
              '</svg>' +
            '</div>' +
            '<div class="placeholder-title">More coming</div>' +
            '<div class="placeholder-sub">New tools ship here as they\u2019re ready.</div>' +
          '</div>' +
        '</div>';
    }
  
    /* ─────────────────────────────────────────
       SEARCH
       ───────────────────────────────────────── */
    let searchTimer = null;
    searchEl.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        searchQuery = searchEl.value;
        render();
      }, 90);
    });
  
    /* ─────────────────────────────────────────
       KEYBOARD
       ───────────────────────────────────────── */
    document.addEventListener('keydown', function (e) {
      const tag = (e.target && e.target.tagName) || '';
      const inField = tag === 'INPUT' || tag === 'TEXTAREA';
  
      // "/" focuses the search box (when not typing)
      if (!inField && e.key === '/') {
        e.preventDefault();
        searchEl.focus();
        searchEl.select();
        return;
      }
  
      // Escape clears search, then blurs
      if (e.key === 'Escape' && document.activeElement === searchEl) {
        if (searchEl.value) {
          searchEl.value = '';
          searchQuery = '';
          render();
        } else {
          searchEl.blur();
        }
      }
    });
  
    /* ─────────────────────────────────────────
       BOOT
       ───────────────────────────────────────── */
    setYear();
    load();
  })();
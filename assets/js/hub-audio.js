/**
 * studio · hub-audio
 *
 * Shared audio module for every app in this repo.
 * Loads WAV files from /assets/audio/. If a file is missing or fails,
 * falls back to Web Audio synthesis — the app still makes sound.
 *
 * Usage from any app:
 *   <script src="../../assets/js/hub-audio.js"></script>
 *   HubAudio.play('chime');
 */
(function () {
    'use strict';
  
    /* ─────────────────────────────────────────
       RESOLVE AUDIO BASE FROM THIS SCRIPT'S URL
       Works from any app folder depth.
       ───────────────────────────────────────── */
    let audioBase = 'assets/audio/';
    try {
      const src = (document.currentScript && document.currentScript.src) || '';
      const marker = '/assets/js/hub-audio.js';
      const idx = src.indexOf(marker);
      if (idx !== -1) {
        audioBase = src.substring(0, idx) + '/assets/audio/';
      }
    } catch (e) { /* keep default */ }
  
    /* ─────────────────────────────────────────
       SOUND REGISTRY
       Add new sounds here; both files and synthesis fallbacks.
       ───────────────────────────────────────── */
    const SOURCES = {
      'chime':     audioBase + 'chime.wav',
      'click':     audioBase + 'click.wav',
      'phase-end': audioBase + 'phase-end.wav'
    };
  
    /* ─────────────────────────────────────────
       STATE
       ───────────────────────────────────────── */
    const cache = {};       // name -> HTMLAudioElement | null
    let enabled = true;
    let ctx = null;
  
    function getCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }
      return ctx;
    }
  
    /* ─────────────────────────────────────────
       PRELOAD
       ───────────────────────────────────────── */
    function preload(name) {
      if (cache[name] !== undefined) return;
      const src = SOURCES[name];
      if (!src) { cache[name] = null; return; }
  
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
  
      a.addEventListener('canplaythrough', function () {
        cache[name] = a;
      }, { once: true });
  
      a.addEventListener('error', function () {
        cache[name] = null;   // mark as missing → synthesis fallback
      }, { once: true });
  
      // Safety: if loading hasn't resolved in 1.5s, assume we'll use the element
      setTimeout(function () {
        if (cache[name] === undefined) cache[name] = a;
      }, 1500);
    }
  
    /* ─────────────────────────────────────────
       SYNTHESIS FALLBACK
       Small, calm tones — nothing harsh.
       ───────────────────────────────────────── */
    function tone(c, freq, at, dur, vol) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start(at);
      o.stop(at + dur + 0.06);
    }
  
    function synthesize(name) {
      const c = getCtx();
      if (!c) return;
      const t = c.currentTime + 0.02;
  
      if (name === 'chime') {
        tone(c, 880,    t,        0.55, 0.16);
        tone(c, 1318.5, t + 0.13, 0.62, 0.12);
        tone(c, 1760,   t + 0.26, 0.75, 0.07);
      } else if (name === 'click') {
        tone(c, 1200, t, 0.07, 0.09);
      } else if (name === 'phase-end') {
        tone(c, 660, t,        0.45, 0.15);
        tone(c, 880, t + 0.16, 0.65, 0.13);
      }
    }
  
    /* ─────────────────────────────────────────
       PLAY
       ───────────────────────────────────────── */
    function play(name) {
      if (!enabled) return;
  
      // First call: start loading and play fallback immediately
      if (cache[name] === undefined) {
        preload(name);
        synthesize(name);
        return;
      }
  
      const a = cache[name];
      if (a) {
        try {
          a.currentTime = 0;
          const p = a.play();
          if (p && p.catch) {
            p.catch(function () { synthesize(name); });
          }
        } catch (e) {
          synthesize(name);
        }
      } else {
        synthesize(name);
      }
    }
  
    /* ─────────────────────────────────────────
       UNLOCK / WARM ON FIRST GESTURE
       Browsers block audio until the user interacts.
       ───────────────────────────────────────── */
    let kicked = false;
    function kick() {
      if (kicked) return;
      kicked = true;
  
      // Create and resume context within the gesture
      getCtx();
  
      // Preload every sound
      Object.keys(SOURCES).forEach(preload);
  
      document.removeEventListener('pointerdown', kick);
      document.removeEventListener('keydown', kick);
      document.removeEventListener('touchstart', kick);
    }
    document.addEventListener('pointerdown', kick, { once: true });
    document.addEventListener('keydown', kick, { once: true });
    document.addEventListener('touchstart', kick, { once: true });
  
    /* ─────────────────────────────────────────
       PUBLIC API
       ───────────────────────────────────────── */
    window.HubAudio = {
      play: play,
  
      /** Warm the cache without playing */
      preload: function () { Object.keys(SOURCES).forEach(preload); },
  
      /** Toggle sound globally (persists per call-site if you want) */
      setEnabled: function (v) { enabled = !!v; },
      isEnabled: function () { return enabled; },
  
      /** Expose the base path in case apps want it */
      basePath: audioBase
    };
  })();
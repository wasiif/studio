/**
 * studio · audio generator
 *
 * Run once from inside assets/audio/:
 *
 *   node generate.js
 *
 * Produces three small 16-bit mono WAV files used across all apps:
 *   chime.wav       — main completion sound (three soft bells)
 *   click.wav       — short UI feedback
 *   phase-end.wav   — softer transition tone
 *
 * No dependencies. Uses only Node's built-in fs and path.
 */
const fs = require('fs');
const path = require('path');

const SR = 44100;   // sample rate

function writeWav(filename, samples) {
  const len = samples.length;
  const buf = Buffer.alloc(44 + len * 2);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + len * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);     // byte rate
  buf.writeUInt16LE(2, 32);          // block align
  buf.writeUInt16LE(16, 34);         // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(len * 2, 40);

  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(__dirname, filename), buf);
  const kb = Math.round(buf.length / 1024);
  console.log('  \u2713 ' + filename + ' (' + kb + ' KB)');
}

function render(totalDuration, tones) {
  const len = Math.floor(SR * totalDuration);
  const out = new Float32Array(len);

  for (const t of tones) {
    const start = Math.floor((t.delay || 0) * SR);
    const end = Math.min(len,
      Math.floor(((t.delay || 0) + (t.dur || totalDuration)) * SR));
    const decay = t.decay || 0.3;

    for (let i = start; i < end; i++) {
      const local = (i - start) / SR;
      const env = Math.exp(-local / decay) * Math.min(1, local / 0.008);
      out[i] += Math.sin(2 * Math.PI * t.freq * local) * env * (t.vol || 0.3);
    }
  }

  // Gentle peak normalisation so nothing clips
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0.95) {
    const g = 0.95 / peak;
    for (let i = 0; i < len; i++) out[i] *= g;
  }

  return out;
}

console.log('Generating shared audio files\u2026');

writeWav('chime.wav', render(1.8, [
  { freq: 880,    delay: 0,    dur: 0.9, vol: 0.35, decay: 0.30 },
  { freq: 1318.5, delay: 0.13, dur: 1.0, vol: 0.28, decay: 0.32 },
  { freq: 1760,   delay: 0.26, dur: 1.2, vol: 0.18, decay: 0.36 }
]));

writeWav('click.wav', render(0.12, [
  { freq: 1200, delay: 0, dur: 0.09, vol: 0.4, decay: 0.02 }
]));

writeWav('phase-end.wav', render(1.1, [
  { freq: 660, delay: 0,    dur: 0.5, vol: 0.35, decay: 0.35 },
  { freq: 880, delay: 0.16, dur: 0.7, vol: 0.30, decay: 0.40 }
]));

console.log('Done.');
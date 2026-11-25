// ===================== AUDIO =====================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playNote(ctx, freq, startTime, duration, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.type = 'triangle';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, startTime);
  g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  o.start(startTime);
  o.stop(startTime + duration);
}

function playChordNotes(root, type) {
  try {
    const ctx = getAudioCtx();
    const notes = getChordNotes(root, type, 0);
    const now = ctx.currentTime + 0.05;
    notes.forEach(n => {
      const freq = NOTE_FREQS[n] || 440;
      playNote(ctx, freq, now, 1.5, 0.15);
    });
  } catch (e) {}
}

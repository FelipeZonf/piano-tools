// ===================== METRÔNOMO =====================
// Usa Web Audio API para agendamento preciso — imune a throttling de aba
// e não cria intervalos duplos.

let metroRunning   = false;
let metroBeat      = 0;
let metroSig       = 4;
let tapTimes       = [];
let progInterval   = null;
let progCurrentBPM = 60;

// --- Agendador por AudioContext (substitui setInterval) ---
let schedCtx        = null; // AudioContext dedicado ao metrônomo
let nextNoteTime    = 0;    // quando tocar o próximo click (em segundos do AudioContext)
let schedTimerID    = null; // setTimeout de agendamento (roda a cada 25ms)
let currentBPM      = 80;
let beatQueue       = []; // batidas agendadas aguardando o visual
let drawRAF         = null;

const SCHEDULE_AHEAD = 0.1;  // agenda 100ms à frente
const SCHEDULE_INTERVAL = 25; // verifica a cada 25ms

function getSchedCtx() {
  if (!schedCtx) schedCtx = new (window.AudioContext || window.webkitAudioContext)();
  return schedCtx;
}

function scheduleClick(time, accent) {
  const ctx = getSchedCtx();
  const o   = ctx.createOscillator();
  const g   = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);
  o.frequency.value = accent ? 1200 : 800;
  g.gain.setValueAtTime(accent ? 0.4 : 0.2, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  o.start(time);
  o.stop(time + 0.08);
}

function scheduler() {
  const ctx      = getSchedCtx();
  const interval = 60.0 / currentBPM;

  while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleClick(nextNoteTime, metroBeat === 0);

    // Enfileira a batida para o visual; o drawLoop acende no instante certo
    beatQueue.push({ beat: metroBeat, time: nextNoteTime });
    if (beatQueue.length > 64) beatQueue.shift(); // aba oculta: rAF pausa, não deixa crescer

    metroBeat    = (metroBeat + 1) % metroSig;
    nextNoteTime += interval;
  }

  schedTimerID = setTimeout(scheduler, SCHEDULE_INTERVAL);
}

// Acende a bolinha da batida cujo horário já chegou no relógio do áudio
function drawLoop() {
  if (!metroRunning) return;
  const ctx = getSchedCtx();
  let current = null;
  while (beatQueue.length && beatQueue[0].time <= ctx.currentTime) {
    current = beatQueue.shift();
  }
  if (current) {
    document.querySelectorAll('.metro-beat').forEach((b, i) => {
      b.classList.toggle('on', i === current.beat);
    });
  }
  drawRAF = requestAnimationFrame(drawLoop);
}

function startMetro() {
  if (metroRunning) return; // garante que nunca inicia duplo

  const ctx  = getSchedCtx();
  if (ctx.state === 'suspended') ctx.resume();

  metroSig     = parseInt(document.getElementById('metro-sig').value);
  currentBPM   = parseInt(document.getElementById('bpm-slider').value);
  metroBeat    = 0;
  nextNoteTime = ctx.currentTime + 0.05;

  updateMetroBeats();
  beatQueue = [];
  metroRunning = true;
  scheduler();
  drawLoop();
  document.getElementById('metro-btn').textContent = '⏸ Parar';
}

function stopMetro() {
  clearTimeout(schedTimerID);
  schedTimerID = null;
  cancelAnimationFrame(drawRAF);
  drawRAF = null;
  beatQueue = [];
  metroRunning = false;
  document.getElementById('metro-btn').textContent = '▶ Iniciar';
  document.querySelectorAll('.metro-beat').forEach(b => b.classList.remove('on'));
}

function restartMetro() {
  // Para e reinicia de forma segura — evita duplo intervalo
  if (metroRunning) {
    stopMetro();
    startMetro();
  }
}

function toggleMetro() {
  if (metroRunning) {
    if (progInterval) {
      clearInterval(progInterval);
      progInterval = null;
      document.getElementById('prog-status').textContent = '';
    }
    stopMetro();
  } else {
    startMetro();
  }
}

function updateMetroBeats() {
  const sig = parseInt(document.getElementById('metro-sig').value);
  document.getElementById('metro-beats').innerHTML =
    Array(sig).fill(0).map(() => '<span class="metro-beat"></span>').join('');
}

function setBPM(v) {
  let bpm = parseInt(v);
  if (isNaN(bpm)) bpm = currentBPM;          // valor inválido: volta ao BPM atual
  bpm = Math.max(30, Math.min(240, bpm));
  currentBPM = bpm;
  document.getElementById('metro-bpm').value  = bpm;
  document.getElementById('bpm-slider').value = bpm;
  // Não para/reinicia — o agendador já usa currentBPM atualizado
  // no próximo loop, aplicando o novo BPM suavemente
}

// ===================== TAP TEMPO =====================
function tapTempo() {
  const now = Date.now();
  tapTimes.push(now);
  if (tapTimes.length > 6) tapTimes.shift();
  if (tapTimes.length > 1) {
    const diffs = [];
    for (let i = 1; i < tapTimes.length; i++) diffs.push(tapTimes[i] - tapTimes[i - 1]);
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    let bpm = Math.round(60000 / avg);
    bpm = Math.max(30, Math.min(240, bpm));
    setBPM(bpm);
  }
}

// ===================== MODO PROGRESSIVO =====================
function startProg() {
  if (progInterval) {
    clearInterval(progInterval);
    progInterval = null;
    stopMetro();
    document.getElementById('prog-status').textContent = '';
    return;
  }

  const start    = parseInt(document.getElementById('prog-start').value);
  const end      = parseInt(document.getElementById('prog-end').value);
  const stepBars = parseInt(document.getElementById('prog-step-bars').value);
  const inc      = parseInt(document.getElementById('prog-inc').value);

  if (start >= end) {
    document.getElementById('prog-status').textContent = '⚠ BPM inicial deve ser menor que o final.';
    return;
  }

  progCurrentBPM = start;
  metroSig = parseInt(document.getElementById('metro-sig').value);
  setBPM(progCurrentBPM);

  if (!metroRunning) startMetro();

  let barCount = 0;

  function scheduleProgStep() {
    const msPerBar = (60000 / progCurrentBPM) * metroSig;
    progInterval = setInterval(() => {
      barCount++;
      if (barCount >= stepBars) {
        barCount = 0;
        progCurrentBPM = Math.min(end, progCurrentBPM + inc);
        setBPM(progCurrentBPM);
        document.getElementById('prog-status').textContent = `BPM atual: ${progCurrentBPM}`;

        if (progCurrentBPM >= end) {
          document.getElementById('prog-status').textContent = `✓ BPM final atingido: ${end} — metrônomo rodando`;
          clearInterval(progInterval);
          progInterval = null;
          return;
        }

        // Reagenda com novo intervalo
        clearInterval(progInterval);
        scheduleProgStep();
      }
    }, msPerBar);
  }

  scheduleProgStep();
}


// ===================== MENUS DO MODO PROGRESSIVO =====================
// Só existem valores válidos: o BPM final lista apenas valores acima do inicial.
function progRange(from, to, step) {
  const out = [];
  for (let v = from; v <= to; v += step) out.push(v);
  return out;
}

function progFill(id, values, selected) {
  document.getElementById(id).innerHTML = values.map(v =>
    `<option value="${v}"${v === selected ? ' selected' : ''}>${v}</option>`
  ).join('');
}

function progRefreshEnd(preferred) {
  const start  = parseInt(document.getElementById('prog-start').value);
  const prev   = preferred !== undefined ? preferred : parseInt(document.getElementById('prog-end').value);
  const wanted = prev > start ? prev : Math.min(240, start + 60);
  progFill('prog-end', progRange(start + 5, 240, 5), wanted);
}

function initProgSelects() {
  progFill('prog-start', progRange(30, 235, 5), 60);
  progRefreshEnd(120);
  progFill('prog-step-bars', [1, 2, 4, 8, 16, 32], 4);
  progFill('prog-inc', [1, 2, 3, 5, 10, 15, 20], 5);
  document.getElementById('prog-start').addEventListener('change', () => progRefreshEnd());
}

// ===================== LISTENERS =====================
document.getElementById('metro-sig').addEventListener('change', () => {
  metroSig = parseInt(document.getElementById('metro-sig').value);
  updateMetroBeats();
  restartMetro();
});

document.addEventListener('DOMContentLoaded', () => {
  initProgSelects();

  const bpmInput  = document.getElementById('metro-bpm');
  const bpmSlider = document.getElementById('bpm-slider');

  bpmInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { setBPM(bpmInput.value); bpmInput.blur(); }
  });

  bpmInput.addEventListener('blur', () => setBPM(bpmInput.value));

  bpmInput.addEventListener('input', () => {
    const v = parseInt(bpmInput.value);
    if (!isNaN(v) && v >= 30 && v <= 240) {
      currentBPM          = v;
      bpmSlider.value     = v;
    }
  });

  // Slider também atualiza BPM em tempo real via setBPM
  bpmSlider.addEventListener('input', () => setBPM(bpmSlider.value));
});

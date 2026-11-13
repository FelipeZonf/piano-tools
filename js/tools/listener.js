// ===================== IDENTIFICADOR DE ACORDES =====================
// Dois modos:
//   • Teclado clicável: as teclas são registradas pela POSIÇÃO (não só pelo nome da nota),
//     então a tecla mais grave é conhecida e a inversão pode ser informada.
//   • Microfone (experimental): procura as notas no espectro do som, descarta harmônicos
//     e só mostra o que se repete por alguns instantes.
//     LIMITE CONHECIDO: uma nota que cai exatamente na posição de harmônico de outra mais
//     grave (ex.: Dó3 + Sol4, quinta mais uma oitava) é tratada como harmônico e não aparece.

const INTERVAL_FULL = ['uníssono', '2ª menor', '2ª maior', '3ª menor', '3ª maior', '4ª justa',
                       'trítono', '5ª justa', '6ª menor', '6ª maior', '7ª menor', '7ª maior'];

// Nomes de acorde na notação de cifra (reaproveita a lista da página Cifra)
function chordSymbolFor(type) {
  if (typeof CIFRA_SUFFIXES !== 'undefined') {
    const s = CIFRA_SUFFIXES.find(x => x.type === type);
    if (s) return s.sym;
  }
  return type;
}

function inversionName(inv) {
  return inv === 0 ? 'Posição fundamental' : `${inv}ª inversão`;
}

// ===================== IDENTIFICAÇÃO DO ACORDE =====================
// noteNames: notas tocadas (nomes, sem repetir oitava). bassName: a nota mais grave.
// Regras (para não "adivinhar"):
//   • toda nota tocada precisa pertencer ao acorde;
//   • só pode faltar a 5ª, e só em acordes de 4+ notas (ex.: C E Bb = C7 sem a 5ª);
//   • notas iguais em ordem diferente dão o MESMO resultado; o baixo desempata
//     (A C E G com Lá no baixo = Am7; com Dó no baixo = C6).
// Retorna o melhor candidato com a lista de interpretações alternativas, ou null.
function identifyChord(noteNames, bassName) {
  const pcs = [...new Set((noteNames || []).map(n => noteIdx(n)))];
  if (pcs.length < 3) return null;
  const bassPc = bassName != null ? noteIdx(bassName) : null;

  const cands = [];
  Object.entries(CHORDS).forEach(([type, ivs], order) => {
    const tones = ivs.map(i => i % 12);
    for (const root of pcs) {
      const chordPcs = tones.map(t => (root + t) % 12);
      if (pcs.some(p => !chordPcs.includes(p))) continue;              // sobrou nota fora do acorde
      const missing = tones.filter((t, i) => !pcs.includes(chordPcs[i]));
      const omitted5 = missing.length === 1 && missing[0] === 7 && tones.length >= 4;
      if (missing.length > 0 && !omitted5) continue;                    // faltou mais que a 5ª

      const bassTone = bassPc == null ? 0 : (bassPc - root + 12) % 12;
      cands.push({
        root: NOTES[root], type, omitted5,
        inversion: Math.max(0, tones.indexOf(bassTone)),
        bassIsRoot: bassTone === 0, size: tones.length, order
      });
    }
  });
  if (!cands.length) return null;

  cands.sort((a, b) =>
    (a.omitted5 - b.omitted5) || (b.bassIsRoot - a.bassIsRoot) || (a.size - b.size) || (a.order - b.order));
  return Object.assign({}, cands[0], { alternatives: cands.slice(1) });
}

// ===================== MODO MICROFONE =====================
const MIC_FFT_SIZE         = 16384;  // ~2,7 Hz por faixa: separa semitons a partir do Dó3
const MIC_MIN_HZ           = 80;     // abaixo disso (≈ Mi2) os semitons não se separam
const MIC_MAX_HZ           = 2100;   // ≈ Dó7
const MIC_PEAK_MARGIN_DB   = 18;     // um pico precisa estar tantos dB acima do ruído de fundo
const MIC_DYNAMIC_RANGE_DB = 30;     // ignora picos bem mais fracos que o mais forte
const MIC_NOTE_RANGE_DB    = 22;     // idem, para as notas já separadas dos harmônicos
const MIC_MIN_SIGNAL_DB    = -80;    // pico mais forte abaixo disso = silêncio
const MIC_MAX_CENTS        = 35;     // pico entre duas notas (desafinado) é descartado
const MIC_HARMONIC_ALLOW_DB = 9;     // parcial até 9 dB acima da base/oitavas dela ainda é harmônico
                                     // (parciais se misturam e podem se cancelar; instrumentos reais variam)
const MIC_INTERVAL_MS      = 100;    // análises por segundo = 10
const MIC_HISTORY          = 6;      // quadros considerados
const MIC_MIN_VOTES        = 4;      // quadros em que a nota precisa aparecer

let listenerAudioCtx = null;
let analyserNode     = null;
let micStream        = null;
let micSpectrum      = null;
let micTimer         = null;
let listenerRunning  = false;
let micHistory       = [];

// Função pura (testável): espectro em dB -> notas tocadas, da mais grave para a mais aguda.
// db = Float32Array no formato de AnalyserNode.getFloatFrequencyData.
function detectNotesFromSpectrum(db, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  const lo = Math.max(2, Math.floor(MIC_MIN_HZ / binHz));
  const hi = Math.min(db.length - 3, Math.ceil(MIC_MAX_HZ / binHz));

  // ruído de fundo = mediana do espectro na faixa analisada
  const band  = Array.from(db.subarray(lo, hi)).sort((a, b) => a - b);
  const floor = band[band.length >> 1];
  if (!isFinite(floor)) return [];                                       // silêncio total

  // 1) picos locais, com frequência refinada por interpolação parabólica
  const peaks = [];
  for (let i = lo; i < hi; i++) {
    const a = db[i - 1], b = db[i], c = db[i + 1];
    if (!isFinite(b) || !(b > a && b >= c) || b < floor + MIC_PEAK_MARGIN_DB) continue;
    const denom = a - 2 * b + c;
    const delta = denom < 0 ? 0.5 * (a - c) / denom : 0;
    peaks.push({ f: (i + delta) * binHz, db: b - 0.25 * (a - c) * delta });
  }
  if (!peaks.length) return [];
  const strongest = Math.max(...peaks.map(p => p.db));
  if (strongest < MIC_MIN_SIGNAL_DB) return [];

  // 2) cada pico vira a nota mais próxima; o que cai entre duas notas é descartado
  const cand = [];
  for (const p of peaks) {
    if (p.db < strongest - MIC_DYNAMIC_RANGE_DB) continue;
    const m = 69 + 12 * Math.log2(p.f / 440), n = Math.round(m);
    if (Math.abs(m - n) * 100 > MIC_MAX_CENTS) continue;
    cand.push({ f: p.f, db: p.db, midi: n });
  }
  cand.sort((x, y) => x.f - y.f);

  // 3) harmônicos: um pico em múltiplo inteiro de uma nota mais grave NÃO é nota nova
  //    (é o que fazia um Dó sozinho aparecer como C + G + E).
  //    • 2º, 4º, 8º, 16º parcial caem na mesma nota: sempre pertencem à nota-base.
  //    • Os demais (3º, 5º, 6º…) só viram nota nova se SE DESTACAREM da nota-base e das
  //      oitavas dela. Num piano real o 3º parcial pode ser mais forte que a fundamental,
  //      mas dificilmente passa do parcial mais forte da própria nota.
  //    • A tolerância cresce com o número do parcial (cordas reais são levemente
  //      "esticadas": inarmonicidade).
  const fund = [];
  const harmonicOf = (p, F) => {
    const k = Math.round(p.f / F.f);
    if (k < 2 || k > 16) return 0;
    const tol = Math.min(0.09, 0.012 + 0.0011 * k * k);
    return Math.abs(p.f / (k * F.f) - 1) < tol ? k : 0;
  };
  const isOctave = k => (k & (k - 1)) === 0;
  for (const p of cand) {
    // Um pico pode ser, ao mesmo tempo, oitava de uma nota e parcial de outra (ex.: Mi5 é
    // o 2º parcial do Mi4 e o 3º do Lá3). Por isso o nível de referência de CADA nota é
    // atualizado por qualquer pico que seja oitava dela, não só pelo "dono" do pico.
    for (const F of fund) {
      const k = harmonicOf(p, F);
      if (k && isOctave(k)) F.ref = Math.max(F.ref, p.db);
    }
    const isHarmonic = fund.some(F => {
      const k = harmonicOf(p, F);
      return k && (isOctave(k) || p.db <= F.ref + MIC_HARMONIC_ALLOW_DB);
    });
    if (!isHarmonic) fund.push({ f: p.f, db: p.db, midi: p.midi, ref: p.db });
  }
  if (!fund.length) return [];

  const top = Math.max(...fund.map(p => p.db));
  return fund
    .filter(p => p.db >= top - MIC_NOTE_RANGE_DB)
    .map(p => ({ name: NOTES[((p.midi % 12) + 12) % 12], midi: p.midi, freq: p.f, db: p.db }));
}

// Só vale a nota que aparece em pelo menos MIC_MIN_VOTES dos últimos MIC_HISTORY quadros
function micVote(frameNotes) {
  micHistory.push(frameNotes);
  if (micHistory.length > MIC_HISTORY) micHistory.shift();

  const votes = {}, bassVotes = {};
  micHistory.forEach(fr => {
    new Set(fr.map(n => n.name)).forEach(n => { votes[n] = (votes[n] || 0) + 1; });
    if (fr.length) bassVotes[fr[0].name] = (bassVotes[fr[0].name] || 0) + 1;
  });

  const classes = Object.keys(votes).filter(n => votes[n] >= MIC_MIN_VOTES);
  let bass = null, best = 0;
  for (const n of classes) if ((bassVotes[n] || 0) > best) { best = bassVotes[n]; bass = n; }
  if (!bass && classes.length) bass = classes[0];
  return { classes, bass };
}

function orderFromBass(classes, bass) {
  if (!bass) return classes;
  const b = noteIdx(bass);
  return [...classes].sort((x, y) => ((noteIdx(x) - b + 12) % 12) - ((noteIdx(y) - b + 12) % 12));
}

async function startMicListener() {
  if (listenerRunning) { stopMicListener(); return; }
  const status = document.getElementById('listener-status');

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    status.textContent = '⚠ Microfone indisponível neste navegador (é preciso HTTPS ou localhost).';
    return;
  }
  try {
    // Sem cancelamento de eco / supressão de ruído / ganho automático: esses filtros
    // são feitos para voz e "apagam" notas sustentadas de instrumento.
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false
    });
  } catch (e) {
    status.textContent = '⚠ Permissão de microfone negada ou não disponível.';
    return;
  }

  if (!listenerAudioCtx) listenerAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (listenerAudioCtx.state === 'suspended') await listenerAudioCtx.resume();

  const source = listenerAudioCtx.createMediaStreamSource(micStream);
  analyserNode = listenerAudioCtx.createAnalyser();
  analyserNode.fftSize = MIC_FFT_SIZE;
  analyserNode.smoothingTimeConstant = 0.6;
  source.connect(analyserNode);                 // só analisa: não toca no alto-falante

  micSpectrum     = new Float32Array(analyserNode.frequencyBinCount);
  micHistory      = [];
  listenerRunning = true;
  document.getElementById('mic-btn').textContent = '⏹ Parar escuta';
  status.textContent = '🎤 Escutando…';
  clearClickedNotes();                          // o painel agora é do microfone: solta as teclas
  micTick();
}

function stopMicListener(msg) {
  listenerRunning = false;
  clearTimeout(micTimer);
  micTimer = null;
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  analyserNode = null;
  document.getElementById('mic-btn').textContent = '🎤 Iniciar escuta';
  document.getElementById('listener-status').textContent = msg || 'Microfone parado.';
  lastListenerSignature = null;
  updateFromClicks();                           // o painel volta a mostrar só o que está no teclado
}

function micTick() {
  if (!listenerRunning) return;

  // Sair da página desliga o microfone (privacidade e bateria)
  const page = document.getElementById('page-listener');
  if (page && !page.classList.contains('active')) {
    stopMicListener('Microfone desligado ao sair desta página.');
    return;
  }

  if (!document.hidden) {
    analyserNode.getFloatFrequencyData(micSpectrum);
    const frame = detectNotesFromSpectrum(micSpectrum, listenerAudioCtx.sampleRate, analyserNode.fftSize);
    const voted = micVote(frame);

    document.getElementById('listener-status').textContent =
      frame.length ? '🎤 Escutando…' : '🎤 Escutando… (nenhum som forte o bastante)';
    showListenerResult({ classes: orderFromBass(voted.classes, voted.bass), bass: voted.bass, positions: null });
  }
  micTimer = setTimeout(micTick, MIC_INTERVAL_MS);
}

// ===================== MODO TECLADO CLICÁVEL =====================
// Cada tecla é guardada pela posição (0 a 23, a partir do Dó mais grave).
let clickedPositions = new Set();

function renderClickablePiano() {
  const container = document.getElementById('listener-piano');
  if (!container) return;

  const whites     = ['C','D','E','F','G','A','B'];
  const whiteSemi  = [0, 2, 4, 5, 7, 9, 11];
  const blackAfter = { C: ['C#', 1], D: ['D#', 3], F: ['F#', 6], G: ['G#', 8], A: ['A#', 10] };
  const KEY_W = 40, GAP = 2, STEP = KEY_W + GAP;
  const totalW = whites.length * 2 * STEP - GAP;

  let whiteHTML = '', blackHTML = '';
  for (let oct = 0; oct < 2; oct++) {
    whites.forEach((n, wi) => {
      const x   = (oct * whites.length + wi) * STEP;
      const pos = oct * 12 + whiteSemi[wi];
      whiteHTML += `
        <div class="key-w ck-white" data-pos="${pos}"
          style="position:absolute; left:${x}px; top:0; width:${KEY_W}px; cursor:pointer;"
          onclick="toggleClickKey(${pos}, this)">
          <span style="pointer-events:none">${n}</span>
        </div>`;

      if (blackAfter[n]) {
        const [bn, semi] = blackAfter[n];
        const bpos = oct * 12 + semi;
        blackHTML += `
          <div class="ck-black" data-pos="${bpos}"
            style="position:absolute; left:${x + KEY_W - 13}px; top:0; width:24px; height:68px;
              background:var(--key-black); border-radius:0 0 4px 4px; border:1px solid #333;
              z-index:2; cursor:pointer; display:flex; align-items:flex-end;
              justify-content:center; padding-bottom:3px; font-size:0.5rem;
              color:#888; font-weight:600;"
            onclick="toggleClickKey(${bpos}, this)">
            <span style="pointer-events:none">${bn}</span>
          </div>`;
      }
    });
  }

  container.innerHTML = `
    <div style="position:relative; width:${totalW}px; height:120px; margin:0 auto; user-select:none;">
      ${whiteHTML}
      ${blackHTML}
    </div>`;
}

function paintClickKey(el, pos, on) {
  const isBlack = [1, 3, 6, 8, 10].includes(pos % 12);
  if (on) {
    el.style.background = 'var(--gold)';
    el.style.color = '#000';
  } else {
    el.style.background = isBlack ? 'var(--key-black)' : 'var(--key-white)';
    el.style.color = isBlack ? '#888' : '#666';
  }
}

function toggleClickKey(pos, el) {
  // Microfone e teclado nunca escrevem no mesmo painel ao mesmo tempo:
  // se o microfone estiver ligado, ele é desligado antes de registrar a tecla.
  if (listenerRunning) stopMicListener('Microfone parado: você está usando o teclado.');
  const on = !clickedPositions.has(pos);
  if (on) clickedPositions.add(pos); else clickedPositions.delete(pos);
  paintClickKey(el, pos, on);
  updateFromClicks();
}

function clearClickedNotes() {
  clickedPositions.clear();
  document.querySelectorAll('.ck-white, .ck-black').forEach(el => {
    paintClickKey(el, parseInt(el.getAttribute('data-pos')), false);
  });
  updateFromClicks();
}

function updateFromClicks() {
  const pos   = [...clickedPositions].sort((a, b) => a - b);
  const names = [];
  pos.forEach(p => { const n = NOTES[p % 12]; if (!names.includes(n)) names.push(n); });
  showListenerResult({ classes: names, bass: pos.length ? NOTES[pos[0] % 12] : null, positions: pos });
}

// ===================== RESULTADO =====================
// Só um modo escreve no painel por vez (ver toggleClickKey / startMicListener).
let lastListenerSignature = null;

// info.classes: notas (nomes) do grave para o agudo · info.bass: nota mais grave
// info.positions: posições exatas no teclado (modo clique) ou null (modo microfone)
function showListenerResult(info) {
  const sig = JSON.stringify([info.classes, info.bass, info.positions]);
  if (sig === lastListenerSignature) return;       // nada mudou: não redesenha (evita piscar)
  lastListenerSignature = sig;

  const notesEl = document.getElementById('listener-notes');
  const chordEl = document.getElementById('listener-chord-name');
  const descEl  = document.getElementById('listener-chord-desc');
  const pianoEl = document.getElementById('listener-result-piano');
  const names   = info.classes || [];

  const plainPills = () => names.map(n => `<div class="note-pill">${n}</div>`).join('');
  const drawPiano  = (root, pal) => {
    if (!pianoEl) return;
    if (info.positions) {
      const rootPos = root ? info.positions.find(p => NOTES[p % 12] === root) : undefined;
      renderPiano('listener-result-piano', names, root, { palette: pal, voicing: info.positions, rootPos });
    } else {
      renderPiano('listener-result-piano', names, root, { palette: pal });
    }
  };

  // nenhuma nota
  if (names.length === 0) {
    notesEl.innerHTML   = '<span style="color:var(--text-muted)">—</span>';
    chordEl.textContent = '—';
    descEl.textContent  = '';
    if (pianoEl) pianoEl.innerHTML = '';
    return;
  }

  // uma nota
  if (names.length === 1) {
    notesEl.innerHTML   = plainPills();
    chordEl.textContent = names[0];
    descEl.textContent  = 'Nota isolada';
    drawPiano(null);
    return;
  }

  // duas notas: é um intervalo, não um acorde
  if (names.length === 2) {
    const from = info.bass || names[0];
    const to   = names.find(n => n !== from);
    const semi = (noteIdx(to) - noteIdx(from) + 12) % 12;
    notesEl.innerHTML   = plainPills();
    chordEl.textContent = INTERVAL_FULL[semi];
    descEl.textContent  = `Duas notas formam um intervalo (${from} → ${to}), não um acorde`;
    drawPiano(null);
    return;
  }

  // três ou mais: tenta reconhecer o acorde
  const result = identifyChord(names, info.bass);

  if (!result) {
    notesEl.innerHTML   = plainPills();
    chordEl.textContent = '?';
    descEl.textContent  = 'Essas notas não formam nenhum dos acordes que o app conhece' +
                          (info.positions ? '' : ' (se alguma nota for ruído ou harmônico, tente tocar mais perto e mais forte)');
    drawPiano(null);
    return;
  }

  const pal  = INVERSION_COLORS[Math.min(result.inversion, 3)];
  const sym  = chordSymbolFor(result.type);
  const bass = info.bass || result.root;

  notesEl.innerHTML   = chordPillsHTML(names, result.root, pal);
  chordEl.textContent = `${result.root}${sym}` + (result.inversion > 0 ? `/${bass}` : '');

  const alts = result.alternatives.slice(0, 3).map(a =>
    `${a.root}${chordSymbolFor(a.type)}` + (a.inversion > 0 ? `/${bass}` : ''));
  descEl.textContent = [
    `${result.root} ${CHORD_NAMES[result.type] || result.type}`,
    inversionName(result.inversion) + (result.inversion > 0 ? ` (baixo: ${bass})` : ''),
    result.omitted5 ? 'sem a 5ª' : null,
    alts.length ? `mesmas notas também formam: ${alts.join(', ')}` : null
  ].filter(Boolean).join(' · ');

  drawPiano(result.root, pal);
}

document.addEventListener('DOMContentLoaded', () => {
  const st = document.getElementById('listener-status');
  if (st) st.textContent = 'Microfone inativo. Experimental: funciona melhor entre Dó3 e Dó6, em ambiente silencioso.';
});

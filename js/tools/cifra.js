// ===================== CIFRA → NOTAS =====================
// A cifra é montada por MENUS (fundamental + tipo): não existe texto livre,
// então não dá para pedir um acorde que o app não saiba desenhar.

const CIFRA_SUFFIXES = [
  { sym: '',     type: 'maj',  label: 'Maior' },
  { sym: 'm',    type: 'min',  label: 'Menor' },
  { sym: 'dim',  type: 'dim',  label: 'Diminuto' },
  { sym: 'aug',  type: 'aug',  label: 'Aumentado' },
  { sym: 'sus2', type: 'sus2', label: 'Sus2' },
  { sym: 'sus4', type: 'sus4', label: 'Sus4' },
  { sym: '6',    type: '6',    label: 'Sexta maior' },
  { sym: 'm6',   type: 'm6',   label: 'Sexta menor' },
  { sym: '7',    type: 'dom7', label: 'Dominante (7ª)' },
  { sym: 'maj7', type: 'maj7', label: 'Maior com 7ª maior' },
  { sym: 'm7',   type: 'min7', label: 'Menor com 7ª' },
  { sym: 'dim7', type: 'dim7', label: 'Diminuto com 7ª' },
  { sym: 'add9', type: 'add9', label: 'Maior com 9ª adicionada' },
  { sym: '9',    type: 'dom9', label: 'Dominante com 9ª' },
  { sym: 'maj9', type: 'maj9', label: 'Maior com 9ª' },
  { sym: 'm9',   type: 'min9', label: 'Menor com 9ª' },
];

// Mesma nota, outro nome (usado para mostrar "A#m7 (= Bbm7)")
const CIFRA_ENHARMONIC = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

let cifraCurrentRoot      = 'C';
let cifraCurrentType      = 'maj';
let cifraCurrentInversion = 0;

function initCifra() {
  const rootSel = document.getElementById('cifra-root');
  const sufSel  = document.getElementById('cifra-suffix');
  if (!rootSel || !sufSel) return;

  rootSel.innerHTML = NOTES.map(n =>
    `<option value="${n}">${CIFRA_ENHARMONIC[n] ? n + '/' + CIFRA_ENHARMONIC[n] : n}</option>`
  ).join('');

  sufSel.innerHTML = CIFRA_SUFFIXES.map((s, i) =>
    `<option value="${i}">${s.sym || 'sem sufixo'} — ${s.label}</option>`
  ).join('');

  rootSel.addEventListener('change', updateCifra);
  sufSel.addEventListener('change', updateCifra);
  updateCifra();
}

// Lê os menus e redesenha tudo (volta para a posição fundamental)
function updateCifra() {
  const root = document.getElementById('cifra-root').value;
  const suf  = CIFRA_SUFFIXES[parseInt(document.getElementById('cifra-suffix').value)];

  cifraCurrentRoot      = root;
  cifraCurrentType      = suf.type;
  cifraCurrentInversion = 0;

  const enh  = CIFRA_ENHARMONIC[root];
  document.getElementById('cifra-name').textContent =
    root + suf.sym + (enh ? `  (= ${enh}${suf.sym})` : '');
  document.getElementById('cifra-desc').textContent = CHORD_DESC[suf.type] || '';

  renderCifra();
}

// Desenha pílulas, botões e teclado para a inversão atual
function renderCifra() {
  const inv       = cifraCurrentInversion;
  const pal       = INVERSION_COLORS[inv] || INVERSION_COLORS[0];
  const v         = getVoicing(cifraCurrentRoot, cifraCurrentType, inv);
  const intervals = CHORDS[cifraCurrentType] || [0, 4, 7];

  document.getElementById('cifra-notes').innerHTML = chordPillsHTML(v.notes, cifraCurrentRoot, pal);
  document.getElementById('cifra-inv-btns').innerHTML =
    inversionButtonsHTML(Math.min(intervals.length, 4), inv, 'setCifraInversion');

  renderPiano('cifra-piano', v.notes, cifraCurrentRoot, {
    palette: pal, voicing: v.positions, rootPos: v.rootPos, folded: v.folded
  });
}

function setCifraInversion(n) {
  cifraCurrentInversion = n;
  renderCifra();
}

document.addEventListener('DOMContentLoaded', initCifra);

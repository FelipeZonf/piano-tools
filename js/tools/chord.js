// ===================== ACORDES (unificado) =====================
let currentChordRoot = 'C';
let currentChordType = 'maj';
let currentInversion = 0;

function buildChord() {
  currentChordRoot = document.getElementById('ch-root').value;
  currentChordType = document.getElementById('ch-type').value;
  currentInversion = 0;
  renderChord();
}

function renderChord() {
  const root = currentChordRoot;
  const type = currentChordType;
  const inv  = currentInversion;
  const pal  = INVERSION_COLORS[inv] || INVERSION_COLORS[0];
  const v    = getVoicing(root, type, inv);
  const intervals = CHORDS[type] || [0,4,7];

  // Cifra e enarmônico
  const suf = (typeof CIFRA_SUFFIXES !== 'undefined')
    ? CIFRA_SUFFIXES.find(s => s.type === type)
    : null;
  const sym = suf ? suf.sym : '';
  const enh = (typeof CIFRA_ENHARMONIC !== 'undefined') ? CIFRA_ENHARMONIC[root] : null;

  const nameEl = document.getElementById('ch-cifra-name');
  if (nameEl) nameEl.textContent = root + sym + (enh ? `  (= ${enh}${sym})` : '');

  const descEl = document.getElementById('ch-cifra-desc');
  if (descEl) descEl.textContent = (CHORD_DESC[type]) || '';

  document.getElementById('ch-info').textContent =
    `${root} ${CHORD_NAMES[type] || type} · ${v.notes.length} notas · ${pal.name}` +
    (inv > 0 ? ` · baixo: ${v.notes[0]}` : '');

  document.getElementById('ch-notes').innerHTML = chordPillsHTML(v.notes, root, pal);

  document.getElementById('ch-inv-btns').innerHTML =
    inversionButtonsHTML(Math.min(intervals.length, 4), inv, 'setInversion');

  renderPiano('ch-piano', v.notes, root, {
    palette: pal, voicing: v.positions, rootPos: v.rootPos, folded: v.folded
  });
}

function setInversion(n) {
  currentInversion = n;
  renderChord();
}

// Chamado pela página de Progressões — fix: passa o elemento ativo da sidebar
function showChordInBuilder(root, type) {
  const rootSel = document.getElementById('ch-root');
  const typeSel = document.getElementById('ch-type');
  if (Array.from(rootSel.options).some(o => o.value === root)) rootSel.value = root;
  if (Array.from(typeSel.options).some(o => o.value === type)) typeSel.value = type;
  currentChordRoot = root;
  currentChordType = type;
  currentInversion = 0;
  renderChord();
  // Fix: atualiza item ativo na sidebar
  const navItem = document.querySelector('.nav-item[onclick*="chord"]');
  if (navItem) showPage('chord', navItem);
  else showPage('chord');
}

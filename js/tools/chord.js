// ===================== CONSTRUTOR DE ACORDES =====================
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
  const inv       = currentInversion;
  const pal       = INVERSION_COLORS[inv] || INVERSION_COLORS[0];
  const v         = getVoicing(currentChordRoot, currentChordType, inv);
  const intervals = CHORDS[currentChordType] || [0, 4, 7];

  // Notas do grave para o agudo; a fundamental em destaque
  document.getElementById('ch-notes').innerHTML = chordPillsHTML(v.notes, currentChordRoot, pal);

  document.getElementById('ch-info').textContent =
    `${currentChordRoot} ${CHORD_NAMES[currentChordType]} · ${v.notes.length} notas · ${pal.name}` +
    (inv > 0 ? ` · baixo: ${v.notes[0]}` : '');

  // Um botão colorido por inversão
  document.getElementById('ch-inv-btns').innerHTML =
    inversionButtonsHTML(Math.min(intervals.length, 4), inv, 'setInversion');

  // Teclado com as notas nas posições reais da inversão
  renderPiano('ch-piano', v.notes, currentChordRoot, {
    palette: pal, voicing: v.positions, rootPos: v.rootPos, folded: v.folded
  });
}

function setInversion(n) {
  currentInversion = n;
  renderChord();
}

const PROG_TYPE_TO_SELECT = {
  maj:'maj', min:'min', dim:'dim', aug:'aug',
  sus2:'sus2', sus4:'sus4',
  maj7:'maj7', dom7:'dom7', min7:'min7', dim7:'dim7',
  maj9:'maj9', min9:'min9', dom9:'dom9', add9:'add9',
  '6':'6', m6:'m6',
};

function showChordInBuilder(root, type) {
  const selectType = PROG_TYPE_TO_SELECT[type] || 'maj';

  const rootSelect = document.getElementById('ch-root');
  if (Array.from(rootSelect.options).some(o => o.value === root)) rootSelect.value = root;

  const typeSelect = document.getElementById('ch-type');
  if (Array.from(typeSelect.options).some(o => o.value === selectType)) typeSelect.value = selectType;

  currentChordRoot = root;
  currentChordType = selectType;
  currentInversion = 0;
  renderChord();

  // FIX #7: usa showPage centralizado para atualizar o nav corretamente
  showPage('chord');
}

// ── Troca de aba Construtor / Cifra ──
function chordSetTab(tab) {
  const builder = document.getElementById('chord-panel-builder');
  const cifra   = document.getElementById('chord-panel-cifra');
  const btnB    = document.getElementById('chord-tab-builder');
  const btnC    = document.getElementById('chord-tab-cifra');
  if (tab === 'builder') {
    builder.style.display = 'block';
    cifra.style.display   = 'none';
    btnB.classList.add('active');
    btnC.classList.remove('active');
  } else {
    builder.style.display = 'none';
    cifra.style.display   = 'block';
    btnB.classList.remove('active');
    btnC.classList.add('active');
  }
}
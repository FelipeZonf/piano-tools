// ===================== ESCALAS & ARPEJOS =====================
// Arpejo = graus 1-3-5-7 da escala. Só forma um acorde de 7ª em escalas de 7 notas;
// em pentatônicas (5 notas) e blues (6) o resultado seria um conjunto de notas sem sentido.
function scaleAllowsArpeggio(type) {
  return SCALES[type].length === 7;
}

// Desativa a opção "Arpejo" quando a escala escolhida não permite
function updateScaleViewOptions() {
  const type    = document.getElementById('sc-type').value;
  const viewSel = document.getElementById('sc-view');
  const hint    = document.getElementById('sc-hint');
  const arpOpt  = Array.from(viewSel.options).find(o => o.value === 'arp');
  const ok      = scaleAllowsArpeggio(type);

  arpOpt.disabled = !ok;
  if (!ok && viewSel.value === 'arp') viewSel.value = 'scale';
  if (hint) hint.textContent = ok ? '' : 'Arpejo só existe em escalas de 7 notas.';
}

function buildScale() {
  updateScaleViewOptions();
  const root  = document.getElementById('sc-root').value;
  const type  = document.getElementById('sc-type').value;
  const view  = document.getElementById('sc-view').value;

  const intervals = SCALES[type];
  const rootIdx   = noteIdx(root);
  const notes     = intervals.map(i => NOTES[(rootIdx + i) % 12]);

  // Arpejo: graus 1-3-5 (e 7 se existir)
  const arpIdx       = [0, 2, 4, 6];
  const displayNotes = view === 'arp'
    ? arpIdx.map(i => notes[i]).filter(Boolean)
    : notes;

  renderPiano('sc-piano', displayNotes, root);

  // Graus
  const degNames  = DEGREE_NAMES[type] || intervals.map((_, i) => i + 1 + '');
  const container = document.getElementById('sc-degrees');

  container.innerHTML = displayNotes.map((n, i) => {
    const srcIdx = view === 'arp' ? arpIdx[i] : i;
    const intv   = intervals[srcIdx];
    return `<div class="scale-degree ${i === 0 ? 'tonic' : ''}">
      <span class="deg-num">${degNames[srcIdx] || ''}</span>
      <span class="deg-note">${n}</span>
      <span class="deg-interval">${intv !== undefined ? (INTERVAL_NAMES[intv] || '') : ''}</span>
    </div>`;
  }).join('');
}

function randomScale() {
  const roots = document.getElementById('sc-root');
  const types = document.getElementById('sc-type');
  roots.selectedIndex = Math.floor(Math.random() * 12);
  types.selectedIndex = Math.floor(Math.random() * types.options.length);
  buildScale();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sc-type').addEventListener('change', updateScaleViewOptions);
});

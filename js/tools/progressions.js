// ===================== PROGRESSÕES =====================
let lastProgIdx = -1;

function genProg(newOne) {
  const root  = document.getElementById('pg-root').value;
  const style = document.getElementById('pg-style').value;
  const progs = PROGRESSIONS[style];

  let idx;
  if (newOne) {
    // Garante que não repete a mesma progressão
    let next;
    do { next = Math.floor(Math.random() * progs.length); }
    while (next === lastProgIdx && progs.length > 1);
    idx = next;
  } else {
    // FIX #5: "Gerar" também sorteia aleatoriamente, não fixa índice 0
    idx = Math.floor(Math.random() * progs.length);
  }
  lastProgIdx = idx;

  const prog    = progs[idx];
  const rootIdx = noteIdx(root);

  document.getElementById('prog-chords').innerHTML = prog.chords.map(([semitones, type]) => {
    const chordRoot  = NOTES[(rootIdx + semitones) % 12];
    const roman      = ROMAN[semitones];
    const fn         = CHORD_FUNCTION[semitones] || '';
    const typeSuffix =
      type === 'maj'  ? '' :
      type === 'min'  ? 'm' :
      type === 'dom7' ? '7' :
      type === 'maj7' ? 'M7' :
      type === 'min7' ? 'm7' :
      type === 'dim7' ? 'dim7' : type;

    return `<div class="prog-chord" onclick="showChordInBuilder('${chordRoot}','${type}')">
      <span class="roman">${roman}</span>
      <span class="chord-name">${chordRoot}${typeSuffix}</span>
      <span class="chord-fn">${fn}</span>
    </div>`;
  }).join('');

  document.getElementById('prog-title').textContent = prog.name;
  document.getElementById('prog-desc').textContent  = prog.desc;
  document.getElementById('prog-result').style.display = 'block';
}

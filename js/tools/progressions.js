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

  const isBlues = prog.chords.length === 12;

  const chordCards = prog.chords.map(([semitones, type], i) => {
    const chordRoot  = NOTES[(rootIdx + semitones) % 12];
    const roman      = ROMAN[semitones];
    const fn         = CHORD_FUNCTION[semitones] || '';
    const typeSuffix =
      type === 'maj'   ? '' :
      type === 'min'   ? 'm' :
      type === 'dom7'  ? '7' :
      type === 'maj7'  ? 'M7' :
      type === 'min7'  ? 'm7' :
      type === 'mmaj7' ? 'mM7' :
      type === 'dim7'  ? '°7' : type;

    const card = `<div class="prog-chord" onclick="showChordInBuilder('${chordRoot}','${type}')">
      <span class="roman">${roman}</span>
      <span class="chord-name">${chordRoot}${typeSuffix}</span>
      <span class="chord-fn">${fn}</span>
    </div>`;
    return { card, i };
  });

  if (isBlues) {
    // Blues: 3 linhas de 4 compassos com label
    const lines = [
      { label: 'Compassos 1–4',  cards: chordCards.slice(0,4)  },
      { label: 'Compassos 5–8',  cards: chordCards.slice(4,8)  },
      { label: 'Compassos 9–12', cards: chordCards.slice(8,12) },
    ];
    document.getElementById('prog-chords').innerHTML = lines.map(line => `
      <div style="width:100%; margin-bottom:6px">
        <div style="font-size:0.68rem; color:var(--text-muted); margin-bottom:4px; letter-spacing:0.06em">${line.label}</div>
        <div style="display:flex; gap:8px; flex-wrap:wrap">${line.cards.map(c => c.card).join('')}</div>
      </div>`).join('');
  } else {
    document.getElementById('prog-chords').innerHTML = chordCards.map(c => c.card).join('');
  }

  document.getElementById('prog-title').textContent = prog.name;
  document.getElementById('prog-desc').textContent  = prog.desc;
  document.getElementById('prog-result').style.display = 'block';
}

// ===================== HARMONIZADOR =====================

let harMelody = [];

function harAddNote(note) {
  if (harMelody.length >= 16) return;
  harMelody.push(note);
  renderHarMelody();
}

function harRemoveLast() {
  harMelody.pop();
  renderHarMelody();
  if (harMelody.length === 0)
    document.getElementById('har-result').style.display = 'none';
}

function harClear() {
  harMelody = [];
  renderHarMelody();
  document.getElementById('har-result').style.display = 'none';
}

function renderHarMelody() {
  const display = document.getElementById('har-melody-display');
  display.innerHTML = harMelody.length === 0
    ? '<span class="har-melody-empty">Nenhuma nota adicionada</span>'
    : harMelody.map(n => `<span class="har-melody-note">${n}</span>`).join('');
}

// ── Graus diatônicos por modo ──
const DIATONIC = {
  //            I       ii      iii     IV      V       vi      vii°
  'Maior':   ['maj',  'min',  'min',  'maj',  'dom7', 'min',  'dim' ],
  'Maior Jazz':['maj7','min7','min7', 'maj7', 'dom7', 'min7', 'dim7'],
  'Menor':   ['min',  'dim',  'maj',  'min',  'dom7', 'maj',  'maj' ],
  'Menor Jazz':['min7','dim7','maj7', 'min7', 'dom7', 'maj7', 'dom7'],
  'Clássico':['maj',  'dim',  'min',  'maj',  'dom7', 'min',  'dim' ],
};

// Intervalos de cada modo (escala maior e menor natural)
const HAR_SCALES = {
  'Maior':     [0,2,4,5,7,9,11],
  'Maior Jazz':[0,2,4,5,7,9,11],
  'Menor':     [0,2,3,5,7,8,10],
  'Menor Jazz':[0,2,3,5,7,8,10],
  'Clássico':  [0,2,4,5,7,9,11],
};

// Nomes dos graus (romano) para cada modo
const HAR_DEGREES = {
  'Maior':     ['I','ii','iii','IV','V','vi','vii°'],
  'Maior Jazz':['Imaj7','iim7','iiim7','IVmaj7','V7','vim7','vii°7'],
  'Menor':     ['i','ii°','♭III','iv','V','♭VI','♭VII'],
  'Menor Jazz':['im7','ii°7','♭IIImaj7','ivm7','V7','♭VImaj7','♭VII7'],
  'Clássico':  ['I','ii°','iii','IV','V7','vi','vii°'],
};

function getDiatonicChords(key, style) {
  const rootIdx = noteIdx(NOTE_ALIASES[key] || key);
  const scale   = HAR_SCALES[style] || HAR_SCALES['Maior'];
  const types   = DIATONIC[style]   || DIATONIC['Maior'];
  const degrees = HAR_DEGREES[style] || HAR_DEGREES['Maior'];

  return scale.map((interval, i) => ({
    root:   NOTES[(rootIdx + interval) % 12],
    type:   types[i],
    degree: degrees[i],
  }));
}

function chordsContainingNote(note, diatonicChords) {
  const normalNote = NOTE_ALIASES[note] || note;
  return diatonicChords.filter(chord =>
    getChordNotes(chord.root, chord.type, 0).includes(normalNote)
  );
}

function harmonizeNote(note, idx, melody, diatonicChords, prevChord) {
  const normalNote = NOTE_ALIASES[note] || note;
  const candidates = chordsContainingNote(normalNote, diatonicChords);

  if (candidates.length === 0) {
    return {
      chord: diatonicChords[0], note,
      why:   `${note} está fora da tonalidade — usando tônica como âncora`,
      alts:  [],
    };
  }

  const scored = candidates.map(chord => {
    let score = 0;

    if (prevChord && chord.root === prevChord.root && chord.type === prevChord.type) score -= 2;
    if (idx === 0 && chord.degree.startsWith('I'))  score += 3;
    if (idx === melody.length - 1 && chord.degree.startsWith('I')) score += 3;
    if (idx === melody.length - 2 && chord.degree === 'V') score += 2;
    if (['vi','vim7','♭VI','iv','ivm7'].includes(chord.degree)) score += 1;
    if (chord.degree.includes('°')) score -= 1;

    const chordNotes = getChordNotes(chord.root, chord.type, 0);
    if (chordNotes[0] === normalNote) score += 2;  // fundamental
    if (chordNotes[1] === normalNote) score += 1;  // terça

    return { chord, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].chord;
  const alts = scored.slice(1, 3).map(s => {
    const sfx = chordSuffix(s.chord.type);
    return `${s.chord.root}${sfx} (${s.chord.degree})`;
  });

  const chordNotes = getChordNotes(best.root, best.type, 0);
  const normalNote2 = NOTE_ALIASES[note] || note;
  const noteRole =
    chordNotes[0] === normalNote2 ? 'fundamental' :
    chordNotes[1] === normalNote2 ? '3ª' :
    chordNotes[2] === normalNote2 ? '5ª' : 'extensão';

  // Exibir o nome da nota como o usuário digitou (preserva Bb, Eb, etc.)
  const displayNote = note;
  const displayRoot = best.root;

  return {
    chord: best, note,
    why:   `${displayNote} é a ${noteRole} de ${displayRoot}${chordSuffix(best.type)}`,
    alts,
  };
}

function chordSuffix(type) {
  const map = {
    maj:'', min:'m', dom7:'7', maj7:'maj7', min7:'m7',
    mmaj7:'mM7', dim:'°', dim7:'°7', aug:'+',
    min9:'m9', maj9:'maj9', dom9:'9', add9:'add9',
    '6':'6', m6:'m6', sus2:'sus2', sus4:'sus4',
  };
  return map[type] ?? type;
}

function harmonize() {
  if (harMelody.length === 0) return;

  const key   = document.getElementById('har-key').value;
  const style = document.getElementById('har-style').value;

  const diatonic = getDiatonicChords(key, style);
  const results  = [];
  let prevChord  = null;

  for (let i = 0; i < harMelody.length; i++) {
    const r = harmonizeNote(harMelody[i], i, harMelody, diatonic, prevChord);
    results.push(r);
    prevChord = r.chord;
  }

  const sequence = results.map(r => `${r.chord.root}${chordSuffix(r.chord.type)}`).join(' – ');

  const rows = results.map(r => {
    const sfx  = chordSuffix(r.chord.type);
    const alts = r.alts.length ? r.alts.join(', ') : '—';
    return `
      <tr>
        <td><span class="har-melody-note" style="animation:none">${r.note}</span></td>
        <td class="har-chord-cell">${r.chord.root}${sfx}
          <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400">(${r.chord.degree})</span>
        </td>
        <td class="har-why-cell">${r.why}</td>
        <td class="har-alt-cell">${alts}</td>
      </tr>`;
  }).join('');

  document.getElementById('har-output').innerHTML = `
    <div style="margin-bottom:16px;padding:12px 16px;background:var(--surface2);
      border-left:3px solid var(--gold);border-radius:0 6px 6px 0">
      <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:4px">SEQUÊNCIA</div>
      <div style="font-size:1rem;font-weight:600;color:var(--white);letter-spacing:0.03em">${sequence}</div>
      <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">
        Tonalidade: ${key} · Estilo: ${style}
      </div>
    </div>
    <table class="har-table">
      <thead>
        <tr><th>Nota</th><th>Acorde</th><th>Por quê</th><th>Alternativas</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  document.getElementById('har-result').style.display = 'block';
}

// ── Preencher selects ──
function initHarmony() {
  const keySel   = document.getElementById('har-key');
  const styleSel = document.getElementById('har-style');
  if (!keySel || !styleSel) return;

  const labels = {
    'C':'C (Dó)','C#':'C# / Db (Dó♯)','D':'D (Ré)','D#':'D# / Eb (Ré♯)',
    'E':'E (Mi)','F':'F (Fá)','F#':'F# / Gb (Fá♯)','G':'G (Sol)',
    'G#':'G# / Ab (Sol♯)','A':'A (Lá)','A#':'A# / Bb (Lá♯)','B':'B (Si)',
  };
  keySel.innerHTML = NOTES.map(n =>
    `<option value="${n}">${labels[n]}</option>`
  ).join('');

  const styles = ['Maior','Maior Jazz','Menor','Menor Jazz','Clássico'];
  styleSel.innerHTML = styles.map(s =>
    `<option value="${s}">${s}</option>`
  ).join('');
}

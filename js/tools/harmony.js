// ===================== HARMONIZADOR REAL =====================

let harMelody = []; // array de notas clicadas

// --- Adiciona nota à melodia ---
function harAddNote(note) {
  if (harMelody.length >= 16) return; // limite razoável
  harMelody.push(note);
  renderHarMelody();
}

// --- Remove última nota ---
function harRemoveLast() {
  harMelody.pop();
  renderHarMelody();
  // Limpa resultado se melodia ficou vazia
  if (harMelody.length === 0) {
    document.getElementById('har-result').style.display = 'none';
  }
}

// --- Limpa tudo ---
function harClear() {
  harMelody = [];
  renderHarMelody();
  document.getElementById('har-result').style.display = 'none';
}

// --- Renderiza as notas da melodia como pills ---
function renderHarMelody() {
  const display = document.getElementById('har-melody-display');
  if (harMelody.length === 0) {
    display.innerHTML = '<span class="har-melody-empty">Nenhuma nota adicionada</span>';
    return;
  }
  display.innerHTML = harMelody.map(n =>
    `<span class="har-melody-note">${n}</span>`
  ).join('');
}

// ===================== LÓGICA DE HARMONIZAÇÃO REAL =====================

// Graus da escala maior e seus acordes diatônicos
const DIATONIC_CHORDS = {
  //        I      ii     iii    IV     V      vi     vii°
  major: [
    { degree: 'I',    type: 'maj',  quality: 'maior'    },
    { degree: 'ii',   type: 'min',  quality: 'menor'    },
    { degree: 'iii',  type: 'min',  quality: 'menor'    },
    { degree: 'IV',   type: 'maj',  quality: 'maior'    },
    { degree: 'V',    type: 'dom7', quality: 'dominante'},
    { degree: 'vi',   type: 'min',  quality: 'menor'    },
    { degree: 'vii°', type: 'dim',  quality: 'diminuto' },
  ]
};

// Intervalos da escala maior
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

// Intervalos da escala jazz (adiciona IIm7, V7, Imaj7)
const JAZZ_CHORDS_TYPES = ['min7','min7','min7','maj7','dom7','min7','dim7'];
const POP_CHORDS_TYPES  = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
const CLASS_CHORDS_TYPES= ['maj', 'dim', 'min', 'maj', 'maj', 'min', 'dim'];

// Retorna os 7 acordes diatônicos de uma tonalidade e estilo
function getDiatonicChords(key, style) {
  const rootIdx = noteIdx(NOTE_ALIASES[key] || key);
  const types   =
    style === 'Jazz'    ? JAZZ_CHORDS_TYPES :
    style === 'Clássico'? CLASS_CHORDS_TYPES :
    POP_CHORDS_TYPES;

  return MAJOR_SCALE.map((interval, i) => {
    const chordRoot = NOTES[(rootIdx + interval) % 12];
    const type      = types[i];
    const degree    = DIATONIC_CHORDS.major[i].degree;
    return { root: chordRoot, type, degree };
  });
}

// Para cada nota da melodia, retorna quais acordes diatônicos a contêm
function chordsContainingNote(note, diatonicChords) {
  const normalNote = NOTE_ALIASES[note] || note;
  return diatonicChords.filter(chord => {
    const chordNotes = getChordNotes(chord.root, chord.type, 0);
    return chordNotes.includes(normalNote);
  });
}

// Monta a sugestão de acorde por nota levando em conta contexto (nota anterior e próxima)
function harmonizeNote(note, idx, melody, diatonicChords, prevChord) {
  const normalNote = NOTE_ALIASES[note] || note;
  const candidates = chordsContainingNote(normalNote, diatonicChords);

  if (candidates.length === 0) {
    // Nota fora da tonalidade — usa o acorde mais próximo cromaticamente
    return {
      chord:   diatonicChords[0],
      note,
      why:     'nota fora da tonalidade — acorde da tônica como âncora',
      alts:    []
    };
  }

  // Pontuação para cada candidato
  const scored = candidates.map(chord => {
    let score = 0;

    // Prefere não repetir o acorde anterior
    if (prevChord && chord.root === prevChord.root && chord.type === prevChord.type) score -= 2;

    // Prefere tônica no início e no fim
    if (idx === 0 && chord.degree === 'I') score += 3;
    if (idx === melody.length - 1 && chord.degree === 'I') score += 3;

    // Prefere dominante antes do fim (cadência)
    if (idx === melody.length - 2 && chord.degree === 'V') score += 2;

    // Prefere vi e IV no meio
    if (chord.degree === 'vi' || chord.degree === 'IV') score += 1;

    // Evita vii° (diminuto) salvo Jazz
    if (chord.degree === 'vii°') score -= 1;

    // A nota é a fundamental do acorde? Mais estável
    if (chord.root === normalNote) score += 2;

    // A nota é a terça? Cor harmônica boa
    const chordNotes = getChordNotes(chord.root, chord.type, 0);
    if (chordNotes[1] === normalNote) score += 1;

    return { chord, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0].chord;
  const alts = scored.slice(1, 3).map(s => {
    const sfx = chordSuffix(s.chord.type);
    return `${s.chord.root}${sfx} (${s.chord.degree})`;
  });

  // Explica a escolha
  const chordNotes = getChordNotes(best.root, best.type, 0);
  const noteRole   =
    chordNotes[0] === normalNote ? 'fundamental' :
    chordNotes[1] === normalNote ? 'terça' :
    chordNotes[2] === normalNote ? 'quinta' : 'extensão';

  const why = `${note} é a ${noteRole} de ${best.root}${chordSuffix(best.type)}`;

  return { chord: best, note, why, alts };
}

function chordSuffix(type) {
  return type === 'maj'  ? '' :
         type === 'min'  ? 'm' :
         type === 'dom7' ? '7' :
         type === 'maj7' ? 'maj7' :
         type === 'min7' ? 'm7' :
         type === 'dim'  ? '°' :
         type === 'dim7' ? '°7' :
         type === 'aug'  ? '+' : type;
}

// ===================== ENTRADA PRINCIPAL =====================
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

  // Monta tabela
  const rows = results.map(r => {
    const sfx   = chordSuffix(r.chord.type);
    const alts  = r.alts.length ? r.alts.join(', ') : '—';
    return `
      <tr>
        <td><span class="har-melody-note" style="animation:none">${r.note}</span></td>
        <td class="har-chord-cell">${r.chord.root}${sfx} <span style="font-size:0.72rem; color:var(--text-muted); font-weight:400">(${r.chord.degree})</span></td>
        <td class="har-why-cell">${r.why}</td>
        <td class="har-alt-cell">${alts}</td>
      </tr>`;
  }).join('');

  // Sequência resumida no topo
  const sequence = results.map(r => `${r.chord.root}${chordSuffix(r.chord.type)}`).join(' — ');

  document.getElementById('har-output').innerHTML = `
    <div style="margin-bottom:16px; padding:12px 16px; background:var(--surface2);
      border-left:3px solid var(--gold); border-radius:0 6px 6px 0">
      <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px">SEQUÊNCIA</div>
      <div style="font-size:1rem; font-weight:600; color:var(--white); letter-spacing:0.03em">${sequence}</div>
      <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px">
        Tonalidade: ${key} · Estilo: ${style}
      </div>
    </div>
    <table class="har-table">
      <thead>
        <tr>
          <th>Nota</th>
          <th>Acorde sugerido</th>
          <th>Por quê</th>
          <th>Alternativas</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  document.getElementById('har-result').style.display = 'block';
}

// ── Preenche o select de tonalidade com todas as 12 notas ──
function initHarmony() {
  const sel = document.getElementById('har-key');
  if (!sel) return;
  const allNotes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const labels   = {
    'C':'C (Dó)','C#':'C# / Db (Dó#)','D':'D (Ré)','D#':'D# / Eb (Ré#)',
    'E':'E (Mi)','F':'F (Fá)','F#':'F# / Gb (Fá#)','G':'G (Sol)',
    'G#':'G# / Ab (Sol#)','A':'A (Lá)','A#':'A# / Bb (Lá#)','B':'B (Si)'
  };
  sel.innerHTML = allNotes.map(n =>
    `<option value="${n}">${labels[n]}</option>`
  ).join('');
}
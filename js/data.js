// ===================== NOTAS =====================
const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_ALIASES = { 'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#' };

// ===================== ESCALAS =====================
const SCALES = {
  major:     [0,2,4,5,7,9,11],
  minor:     [0,2,3,5,7,8,10],
  harmonic:  [0,2,3,5,7,8,11],
  melodic:   [0,2,3,5,7,9,11],
  penta_maj: [0,2,4,7,9],
  penta_min: [0,3,5,7,10],
  blues:     [0,3,5,6,7,10],
  dorian:    [0,2,3,5,7,9,10],
  mixo:      [0,2,4,5,7,9,10],
};

const DEGREE_NAMES = {
  major:     ['I','II','III','IV','V','VI','VII'],
  minor:     ['I','II','IIIb','IV','V','VIb','VIIb'],
  harmonic:  ['I','II','IIIb','IV','V','VIb','VII'],
  melodic:   ['I','II','IIIb','IV','V','VI','VII'],
  penta_maj: ['I','II','III','V','VI'],
  penta_min: ['I','IIIb','IV','V','VIIb'],
  blues:     ['I','IIIb','IV','#IV','V','VIIb'],
  dorian:    ['I','II','IIIb','IV','V','VI','VIIb'],
  mixo:      ['I','II','III','IV','V','VI','VIIb'],
};

const INTERVAL_NAMES = ['T','2M','3m','3M','4J','Tri','5J','6m','6M','7m','7M','8'];

// ===================== ACORDES =====================
const CHORDS = {
  maj:   [0,4,7],
  min:   [0,3,7],
  dim:   [0,3,6],
  aug:   [0,4,8],
  sus2:  [0,2,7],
  sus4:  [0,5,7],
  maj7:  [0,4,7,11],
  dom7:  [0,4,7,10],
  min7:  [0,3,7,10],
  dim7:  [0,3,6,9],
  maj9:  [0,4,7,11,14],
  min9:  [0,3,7,10,14],
  dom9:  [0,4,7,10,14],
  add9:  [0,4,7,14],
  '6':   [0,4,7,9],
  m6:    [0,3,7,9],
};

const CHORD_NAMES = {
  maj:'Maior', min:'Menor', dim:'Diminuto', aug:'Aumentado',
  sus2:'Sus2', sus4:'Sus4', maj7:'Maior 7M', dom7:'Dominante 7',
  min7:'Menor 7', dim7:'Dim 7', maj9:'Maior 9', min9:'Menor 9',
  dom9:'Dominante 9', add9:'add9', '6':'Sexta maior', m6:'Sexta menor'
};

const CHORD_DESC = {
  maj:  'Acorde maior — tríade com 3ª maior e 5ª justa',
  min:  'Acorde menor — tríade com 3ª menor e 5ª justa',
  dim:  'Acorde diminuto — 3ª menor e 5ª diminuta',
  aug:  'Acorde aumentado — 3ª maior e 5ª aumentada',
  maj7: 'Maior com sétima maior — sonoridade jazística suave',
  dom7: 'Acorde dominante — cria tensão e resolve na tônica',
  min7: 'Menor com sétima menor — base do jazz e soul',
  dim7: 'Diminuto com sétima diminuta — máxima tensão',
  sus2: 'Suspensão da 2ª — a 3ª é substituída pela 2ª',
  sus4: 'Suspensão da 4ª — a 3ª é substituída pela 4ª',
  maj9: 'Maior com nona — rico e expansivo',
  min9: 'Menor com nona — melancólico e colorido',
  dom9: 'Dominante com nona — tensão ampliada',
  add9: 'Maior com nona adicionada — sem a sétima',
  '6':  'Sexta maior — sonoridade retrô e alegre',
  m6:   'Sexta menor — cor especial do jazz',
};

// ===================== PROGRESSÕES =====================
const PROGRESSIONS = {
  pop: [
    { name: 'I – V – vi – IV', desc: 'A progressão mais usada do pop moderno.', chords: [[0,'maj'],[7,'maj'],[9,'min'],[5,'maj']] },
    { name: 'I – IV – V – I', desc: 'Clássica e resolutiva.', chords: [[0,'maj'],[5,'maj'],[7,'maj'],[0,'maj']] },
    { name: 'vi – IV – I – V', desc: 'Começando pelo vi — tom mais introspectivo.', chords: [[9,'min'],[5,'maj'],[0,'maj'],[7,'maj']] },
    { name: 'I – vi – IV – V', desc: 'Anos 50/60, muito usada em baladas.', chords: [[0,'maj'],[9,'min'],[5,'maj'],[7,'maj']] },
  ],
  jazz: [
    { name: 'ii – V – I', desc: 'A progressão fundamental do jazz.', chords: [[2,'min7'],[7,'dom7'],[0,'maj7']] },
    { name: 'I – VI – II – V', desc: 'Turnaround clássico do jazz.', chords: [[0,'maj7'],[9,'dom7'],[2,'min7'],[7,'dom7']] },
    { name: 'I – IV – iii – VI – ii – V – I', desc: 'Progressão longa de big band.', chords: [[0,'maj7'],[5,'maj7'],[4,'min7'],[9,'dom7'],[2,'min7'],[7,'dom7'],[0,'maj7']] },
    { name: 'iii – VI – ii – V', desc: 'Ciclo de quintas jazístico.', chords: [[4,'min7'],[9,'dom7'],[2,'min7'],[7,'dom7']] },
  ],
  classico: [
    { name: 'I – IV – V – I', desc: 'Cadência perfeita autêntica.', chords: [[0,'maj'],[5,'maj'],[7,'maj'],[0,'maj']] },
    { name: 'I – V – vi – iii – IV – I – IV – V', desc: 'Canon de Pachelbel (variação).', chords: [[0,'maj'],[7,'maj'],[9,'min'],[4,'min'],[5,'maj'],[0,'maj'],[5,'maj'],[7,'maj']] },
    { name: 'i – VII – VI – VII', desc: 'Progressão barroca descendente.', chords: [[0,'min'],[10,'maj'],[8,'maj'],[10,'maj']] },
    { name: 'I – II – V – I', desc: 'Cadência italiana.', chords: [[0,'maj'],[2,'maj'],[7,'maj'],[0,'maj']] },
  ],
  gospel: [
    { name: 'I – IV – I – V', desc: 'Base do gospel tradicional.', chords: [[0,'maj'],[5,'maj'],[0,'maj'],[7,'dom7']] },
    { name: 'I – iii – IV – V', desc: 'Gospel moderno uplift.', chords: [[0,'maj7'],[4,'min7'],[5,'maj7'],[7,'dom7']] },
    { name: 'I – bVII – IV – I', desc: 'Com o acorde emprestado bVII.', chords: [[0,'maj'],[10,'maj'],[5,'maj'],[0,'maj']] },
    { name: 'ii – V – I – VI', desc: 'Gospel contemporâneo.', chords: [[2,'min7'],[7,'dom7'],[0,'maj7'],[9,'dom7']] },
  ],
  bossa: [
    { name: 'Imaj7 – IV7 – iii – VI7', desc: 'Sensação bossa nova clássica.', chords: [[0,'maj7'],[5,'dom7'],[4,'min7'],[9,'dom7']] },
    { name: 'ii – V – Imaj7', desc: 'ii–V–I com sabor bossa.', chords: [[2,'min7'],[7,'dom7'],[0,'maj7']] },
    { name: 'Imaj7 – bIII7 – ii – V', desc: 'Bossa com acorde cromaticamente descendente.', chords: [[0,'maj7'],[3,'dom7'],[2,'min7'],[7,'dom7']] },
  ],
  blues: [
    { name: 'Blues de 12 compassos', desc: 'A forma fundamental do blues.', chords: [[0,'dom7'],[5,'dom7'],[0,'dom7'],[0,'dom7'],[5,'dom7'],[5,'dom7'],[0,'dom7'],[0,'dom7'],[7,'dom7'],[5,'dom7'],[0,'dom7'],[7,'dom7']] },
    { name: 'Blues rápido (8 comp)', desc: 'Versão compacta com turnaround.', chords: [[0,'dom7'],[5,'dom7'],[0,'dom7'],[0,'dom7'],[5,'dom7'],[0,'dom7'],[7,'dom7'],[5,'dom7']] },
  ],
};

const ROMAN = ['I','bII','II','bIII','III','IV','bV','V','bVI','VI','bVII','VII'];
const CHORD_FUNCTION = {
  0:'Tônica', 2:'Subdominante rel.', 4:'Mediante', 5:'Subdominante',
  7:'Dominante', 9:'Relativa menor', 10:'Subtônica', 11:'Sensível'
};

// ===================== TREINO DE OUVIDO =====================
const EAR_BASIC   = ['C maj','G maj','F maj','A min','D min','E min','B dim'];
const EAR_SEVENTH = ['C maj7','G dom7','D min7','F maj7','A dom7','E min7','B dim7'];

// ===================== PARTITURA =====================
const TREBLE_NOTES = {
  basic:  ['E4','F4','G4','A4','B4','C5','D5','E5','F5','G5'],
  ledger: ['C4','D4','E4','F4','G4','A4','B4','C5','D5','E5','F5','G5','A5','B5']
};
const BASS_NOTES = {
  basic:  ['G2','A2','B2','C3','D3','E3','F3','G3','A3','B3'],
  ledger: ['E2','F2','G2','A2','B2','C3','D3','E3','F3','G3','A3','B3','C4','D4']
};

const TREBLE_Y = {
  'C4':110,'D4':100,'E4':90,'F4':85,'G4':75,'A4':70,'B4':60,
  'C5':55,'D5':45,'E5':40,'F5':30,'G5':25,'A5':15,'B5':10
};
const BASS_Y = {
  'E2':95,'F2':90,'G2':80,'A2':75,'B2':65,
  'C3':60,'D3':50,'E3':45,'F3':35,'G3':30,'A3':20,'B3':15,'C4':10,'D4':5
};

const NOTE_FREQS = {
  C:261.6,'C#':277.2,D:293.7,'D#':311.1,E:329.6,F:349.2,
  'F#':370.0,G:392.0,'G#':415.3,A:440.0,'A#':466.2,B:493.9
};

// ===================== HELPERS =====================
function noteIdx(n) { return NOTES.indexOf(NOTE_ALIASES[n] || n); }

function getChordNotes(root, type, inversion) {
  const intervals = [...(CHORDS[type] || CHORDS.maj)];
  const rootIdx   = noteIdx(root);

  // BUG FIX #7: usa i % 12 apenas para obter o nome da nota, sem perder
  // a informação de oitava — intervalos > 11 (nona, etc.) continuam sendo
  // mapeados à nota correta sem colidir com notas de oitavas anteriores
  let notes = intervals.map(i => NOTES[(rootIdx + i) % 12]);

  // Remove duplicatas causadas por intervalos ≥ 12 que caem na mesma nota
  // de um intervalo menor já presente (ex: add9 não deve ter "D" duas vezes)
  const seen = new Set();
  notes = notes.filter(n => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  if (inversion && inversion > 0) {
    const times = Math.min(inversion, notes.length - 1);
    for (let i = 0; i < times; i++) notes.push(notes.shift());
  }
  return notes;
}

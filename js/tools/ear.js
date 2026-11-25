// ===================== DITADO DE ACORDES =====================
// Usa pool de fundamentais variadas para evitar reconhecimento por timbre fixo

let earCurrentChord  = null;
let earCorrect       = 0;
let earTotal         = 0;

function newEarChord() {
  const level = document.getElementById('ear-level')?.value || 'basic';

  // Escolhe fundamental aleatória do pool (evita sempre Dó)
  const rootOffset = EAR_ROOTS_POOL[Math.floor(Math.random() * EAR_ROOTS_POOL.length)];
  const root       = NOTES[rootOffset];

  const pool = level === 'basic'   ? EAR_BASIC_TYPES :
               level === 'seventh' ? EAR_SEVENTH_TYPES :
               [...EAR_BASIC_TYPES, ...EAR_SEVENTH_TYPES];

  const type  = pool[Math.floor(Math.random() * pool.length)];
  earCurrentChord = { root, type };

  document.getElementById('ear-feedback').textContent = '';
  document.getElementById('ear-choices').innerHTML = '';

  // Gera opções: 1 certa + 3 erradas do mesmo pool
  const wrongPool = pool.filter(t => t !== type);
  const wrongs    = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);
  const options   = [type, ...wrongs].sort(() => Math.random() - 0.5);

  document.getElementById('ear-choices').innerHTML = options.map(t => {
    const label = CHORD_NAMES[t] || t;
    return `<button class="ear-choice-btn" onclick="checkEarAnswer('${t}')">${label}</button>`;
  }).join('');
}

function playEarChord() {
  if (!earCurrentChord) return;
  const { root, type } = earCurrentChord;
  const notes = getChordNotes(root, type, 0);
  if (typeof playChordNotes === 'function') playChordNotes(notes);
}

function checkEarAnswer(type) {
  if (!earCurrentChord) return;
  earTotal++;
  const correct = type === earCurrentChord.type;
  if (correct) earCorrect++;

  const fb = document.getElementById('ear-feedback');
  const correctName = CHORD_NAMES[earCurrentChord.type] || earCurrentChord.type;
  const rootName    = earCurrentChord.root;

  fb.textContent = correct
    ? `✓ Correto! Era ${rootName} ${correctName}.`
    : `✗ Errado. Era ${rootName} ${correctName}.`;
  fb.style.color = correct ? 'var(--green)' : 'var(--red)';

  document.getElementById('ear-score').textContent =
    `Acertos: ${earCorrect} / ${earTotal}`;

  // Próximo acorde após 1.2s
  setTimeout(newEarChord, 1200);
}

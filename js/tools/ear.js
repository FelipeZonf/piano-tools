// ===================== DITADO DE ACORDES =====================
let earCorrect      = 0;
let earTotal        = 0;
let earCurrentChord = null;

function getEarPool() {
  const level = document.getElementById('ear-level').value;
  if (level === 'basic')   return EAR_BASIC;
  if (level === 'seventh') return EAR_SEVENTH;
  return [...EAR_BASIC, ...EAR_SEVENTH];
}

function earTypeKey(type) {
  const map = {
    maj:'maj', min:'min', dom7:'dom7', maj7:'maj7',
    min7:'min7', dim:'dim', dim7:'dim7'
  };
  return map[type] || 'maj';
}

function earLabel(chordStr) {
  const [r, t] = chordStr.split(' ');
  const suffix =
    t === 'maj'  ? '' :
    t === 'min'  ? 'm' :
    t === 'dom7' ? '7' :
    t === 'maj7' ? 'M7' :
    t === 'min7' ? 'm7' :
    t === 'dim7' ? 'dim7' : 'dim';
  return r + suffix;
}

function newEarChord() {
  const pool      = getEarPool();
  earCurrentChord = pool[Math.floor(Math.random() * pool.length)];
  document.getElementById('ear-feedback').textContent = '';
  buildEarChoices(earCurrentChord, pool);

  const [root, type] = earCurrentChord.split(' ');
  playChordNotes(root, earTypeKey(type));
}

function buildEarChoices(correct, pool) {
  const choices  = [correct];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const c of shuffled) {
    if (!choices.includes(c) && choices.length < 8) choices.push(c);
  }
  choices.sort(() => Math.random() - 0.5);

  // BUG FIX #4: usa data-chord no botão em vez de comparar textContent
  // evita falso-positivo quando dois acordes têm o mesmo label (ex: "Cm" de pools diferentes)
  document.getElementById('ear-choices').innerHTML = choices.map(c =>
    `<button class="ear-btn" data-chord="${c}" onclick="checkEar('${c}',this)">${earLabel(c)}</button>`
  ).join('');
}

function playEarChord() {
  if (!earCurrentChord) { newEarChord(); return; }
  const [root, type] = earCurrentChord.split(' ');
  playChordNotes(root, earTypeKey(type));
}

function checkEar(chosen, btn) {
  earTotal++;
  const isCorrect = chosen === earCurrentChord;

  // BUG FIX #4: compara pelo data-chord, não pelo textContent
  document.querySelectorAll('#ear-choices .ear-btn').forEach(b => {
    const chordVal = b.getAttribute('data-chord');
    if (chordVal === earCurrentChord) {
      b.classList.add('correct');
    } else if (chordVal === chosen && !isCorrect) {
      b.classList.add('wrong');
    }
    b.disabled = true;
  });

  if (isCorrect) earCorrect++;

  const fb = document.getElementById('ear-feedback');
  fb.textContent = isCorrect ? '✓ Correto!' : `✗ Era ${earLabel(earCurrentChord)}`;
  fb.style.color = isCorrect ? 'var(--green)' : 'var(--red)';

  document.getElementById('ear-score').textContent = `Acertos: ${earCorrect} / ${earTotal}`;
  setTimeout(newEarChord, 1200);
}

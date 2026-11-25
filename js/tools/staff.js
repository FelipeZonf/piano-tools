// ===================== LEITURA DE PARTITURA =====================
let staffCorrect     = 0;
let staffTotal       = 0;
let staffCurrentNote = '';

function newStaffNote() {
  const clef  = document.getElementById('staff-clef').value;
  const range = document.getElementById('staff-range').value;
  const pool  = clef === 'treble' ? TREBLE_NOTES[range] : BASS_NOTES[range];

  staffCurrentNote = pool[Math.floor(Math.random() * pool.length)];
  drawStaff(staffCurrentNote, clef);
  buildStaffChoices(staffCurrentNote, pool);
  document.getElementById('staff-answer').textContent = '?';
}

function drawStaff(noteStr, clef) {
  const svg   = document.getElementById('staff-svg');
  const yMap  = clef === 'treble' ? TREBLE_Y : BASS_Y;
  const noteY = yMap[noteStr] || 60;

  svg.innerHTML = `
    ${[20, 32, 44, 56, 68].map(y =>
      `<line x1="30" y1="${y}" x2="270" y2="${y}" stroke="var(--text-muted)" stroke-width="1.2"/>`
    ).join('')}
    <text x="36" y="68" font-size="52" fill="var(--gold)" font-family="serif">
      ${clef === 'treble' ? '𝄞' : '𝄢'}
    </text>
    <ellipse cx="170" cy="${noteY}" rx="10" ry="7" fill="var(--white)"
      transform="rotate(-15,170,${noteY})"/>
    ${noteY > 44
      ? `<line x1="180" y1="${noteY}" x2="180" y2="${noteY - 35}" stroke="var(--white)" stroke-width="2"/>`
      : `<line x1="160" y1="${noteY}" x2="160" y2="${noteY + 35}" stroke="var(--white)" stroke-width="2"/>`
    }
    ${noteY >= 80 ? `<line x1="155" y1="80" x2="185" y2="80" stroke="var(--text-muted)" stroke-width="1.2"/>` : ''}
    ${noteY <= 10 ? `<line x1="155" y1="10" x2="185" y2="10" stroke="var(--text-muted)" stroke-width="1.2"/>` : ''}
    ${noteY >= 90 ? `<line x1="155" y1="90" x2="185" y2="90" stroke="var(--text-muted)" stroke-width="1.2"/>` : ''}
  `;
}

function buildStaffChoices(correct, pool) {
  const correctName = correct.replace(/\d/, '');
  const all         = [...new Set(pool.map(n => n.replace(/\d/, '')))];
  const choices     = [correctName];

  const fallback         = ['C','D','E','F','G','A','B'];
  const shuffledPool     = [...all].sort(() => Math.random() - 0.5);
  const shuffledFallback = [...fallback].sort(() => Math.random() - 0.5);
  const candidates       = [...new Set([...shuffledPool, ...shuffledFallback])];

  for (const c of candidates) {
    if (!choices.includes(c) && choices.length < 4) choices.push(c);
    if (choices.length === 4) break;
  }

  choices.sort(() => Math.random() - 0.5);

  document.getElementById('staff-choices').innerHTML = choices.map(n =>
    `<button class="ear-btn" onclick="checkStaff('${n}')">${n}</button>`
  ).join('');
}

function checkStaff(chosen) {
  const correct = staffCurrentNote.replace(/\d/, '');
  staffTotal++;
  document.getElementById('staff-answer').textContent = correct;

  document.querySelectorAll('#staff-choices .ear-btn').forEach(b => {
    if (b.textContent === correct) b.classList.add('correct');
    else if (b.textContent === chosen && chosen !== correct) b.classList.add('wrong');
    b.disabled = true;
  });

  if (chosen === correct) staffCorrect++;
  document.getElementById('staff-score').textContent = `Acertos: ${staffCorrect} / ${staffTotal}`;
  setTimeout(newStaffNote, 1200);
}

// FIX #4: troca de clave ou range gera nova nota imediatamente
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('staff-clef').addEventListener('change', newStaffNote);
  document.getElementById('staff-range').addEventListener('change', newStaffNote);
});

// ===================== DIÁRIO DE PRÁTICA =====================
let diaryEntries = JSON.parse(localStorage.getItem('pianotools_diary') || '[]');

function saveDiary() {
  localStorage.setItem('pianotools_diary', JSON.stringify(diaryEntries));
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderDiary() {
  const totalMin = diaryEntries.reduce((s, e) => s + e.min, 0);
  const n        = diaryEntries.length;

  document.getElementById('stat-total').textContent =
    totalMin >= 60 ? (totalMin / 60).toFixed(1) + 'h' : totalMin + 'min';
  document.getElementById('stat-sessions').textContent = n;
  document.getElementById('stat-avg').textContent =
    n ? Math.round(totalMin / n) + 'min' : '0min';

  const list = document.getElementById('diary-list');
  if (!diaryEntries.length) {
    list.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem">Nenhuma sessão registrada ainda.</p>';
    return;
  }

  // FIX #6: botão de deletar em cada entrada; índice real calculado pelo reverso
  list.innerHTML = [...diaryEntries].reverse().map((e, revIdx) => {
    const realIdx = diaryEntries.length - 1 - revIdx;
    return `
      <div class="diary-entry">
        <div class="diary-entry-info">
          <h4>${escapeHTML(e.what)}</h4>
          <p>${escapeHTML(e.date)}${e.bpm ? ' · BPM ' + escapeHTML(e.bpm) : ''}${e.notes ? ' · ' + escapeHTML(e.notes) : ''}</p>
        </div>
        <div style="display:flex; align-items:center; gap:12px">
          <div class="diary-entry-time">${escapeHTML(String(e.min))}min</div>
          <button onclick="deleteDiaryEntry(${realIdx})" title="Remover" style="
            background:transparent; border:none; cursor:pointer;
            color:var(--text-muted); font-size:1rem; padding:4px;
            transition:color 0.15s;
          " onmouseover="this.style.color='var(--red)'"
             onmouseout="this.style.color='var(--text-muted)'">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// FIX #6: remove entrada pelo índice real no array
function deleteDiaryEntry(idx) {
  diaryEntries.splice(idx, 1);
  saveDiary();
  renderDiary();
}

function addDiaryEntry() {
  const err = document.getElementById('diary-error');
  const fail = (msg, id) => { err.textContent = '⚠ ' + msg; document.getElementById(id).focus(); };

  // "O que praticou" e "Duração" vêm de menus; aqui só se confere que a escolha foi feita
  const what = document.getElementById('diary-what').value;
  if (!what) return fail('Escolha o que você praticou.', 'diary-what');

  const min = parseInt(document.getElementById('diary-min').value);
  if (!Number.isInteger(min) || min < 1) return fail('Escolha a duração.', 'diary-min');

  // BPM é opcional, mas se vier precisa ser um inteiro entre 30 e 240
  const bpmRaw = document.getElementById('diary-bpm').value.trim();
  let bpm = '';
  if (bpmRaw !== '') {
    const n = Number(bpmRaw);
    if (!Number.isInteger(n) || n < 30 || n > 240) {
      return fail('BPM deve ser um número inteiro entre 30 e 240.', 'diary-bpm');
    }
    bpm = String(n);
  }

  const notes = document.getElementById('diary-notes').value.trim().slice(0, 200);
  const date  = new Date().toLocaleDateString('pt-BR');

  err.textContent = '';
  diaryEntries.push({ what, min, bpm, notes, date });
  saveDiary();
  renderDiary();

  document.getElementById('diary-what').value  = '';   // volta para "Selecione…"
  document.getElementById('diary-min').value   = '30';
  document.getElementById('diary-notes').value = '';
  document.getElementById('diary-bpm').value   = '';
}

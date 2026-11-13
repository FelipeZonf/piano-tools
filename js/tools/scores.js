// ===================== PARTITURAS =====================
// Dois modos: VISUALIZADOR (importa MusicXML) e EDITOR (cria partitura)

// ───── Estado global ─────
const ScoreState = {
  mode: 'editor',
  editorNotes: [],
  editorClef: 'treble',
  editorTimeNum: 4,
  editorTimeDen: 4,
  editorKey: 0,
  editorTempo: 100,
  selectedDuration: 'q',
  selectedAccidental: '',
  isRest: false,
  editingIdx: null,
  sheetOpen: false,
  viewerScore: null,
};

// ───── Mapeamentos ─────
const DURATION_NAMES = { w:'Semibreve', h:'Mínima', q:'Semínima', e:'Colcheia', s:'Semicolcheia' };
const DURATION_BEATS = { w:4, h:2, q:1, e:0.5, s:0.25 };
const ACC_SYMBOLS    = { '#':'♯', 'b':'♭', 'n':'♮', '':'  ' };

function noteToStep(pitch, octave) {
  const steps = { C:0, D:1, E:2, F:3, G:4, A:5, B:6 };
  return (octave - 4) * 7 + steps[pitch];
}

// ───── Desenho de nota individual (reutilizado em editor e folha) ─────
function drawNoteSymbol(svg, x, y, note, staffTop, lineGap, lines, color, showLabel) {
  const noteColor = color || 'var(--white)';

  if (!note.rest) {
    // Linhas suplementares abaixo
    for (let ly = lines[4] + lineGap; ly <= y + 1; ly += lineGap)
      svg += `<line x1="${x-8}" y1="${ly}" x2="${x+8}" y2="${ly}" stroke="var(--text-muted)" stroke-width="1.2"/>`;
    // Linhas suplementares acima
    for (let ly = lines[0] - lineGap; ly >= y - 1; ly -= lineGap)
      svg += `<line x1="${x-8}" y1="${ly}" x2="${x+8}" y2="${ly}" stroke="var(--text-muted)" stroke-width="1.2"/>`;

    if (note.accidental)
      svg += `<text x="${x-16}" y="${y+5}" font-size="14" fill="${noteColor}" font-family="serif">${ACC_SYMBOLS[note.accidental]}</text>`;

    const filled = note.duration !== 'w' && note.duration !== 'h';
    svg += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5" fill="${filled ? noteColor : 'none'}" stroke="${noteColor}" stroke-width="1.5" transform="rotate(-15,${x},${y})"/>`;
    if (note.duration === 'h')
      svg += `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.5" fill="none" stroke="var(--bg)" stroke-width="1.5" transform="rotate(-15,${x},${y})"/>`;

    if (note.duration !== 'w') {
      const stemUp = y > staffTop + lineGap * 2;
      if (stemUp) {
        svg += `<line x1="${x+6}" y1="${y-2}" x2="${x+6}" y2="${y-30}" stroke="${noteColor}" stroke-width="1.5"/>`;
      } else {
        svg += `<line x1="${x-6}" y1="${y+2}" x2="${x-6}" y2="${y+30}" stroke="${noteColor}" stroke-width="1.5"/>`;
      }
      if (note.duration === 'e' || note.duration === 's') {
        if (stemUp) svg += `<path d="M${x+6} ${y-30} Q${x+22} ${y-18} ${x+8} ${y-12}" fill="none" stroke="${noteColor}" stroke-width="1.5"/>`;
        else        svg += `<path d="M${x-6} ${y+30} Q${x+10} ${y+18} ${x-4} ${y+12}" fill="none" stroke="${noteColor}" stroke-width="1.5"/>`;
      }
      if (note.duration === 's') {
        if (stemUp) svg += `<path d="M${x+6} ${y-24} Q${x+22} ${y-12} ${x+8} ${y-6}" fill="none" stroke="${noteColor}" stroke-width="1.5"/>`;
        else        svg += `<path d="M${x-6} ${y+24} Q${x+10} ${y+12} ${x-4} ${y+6}" fill="none" stroke="${noteColor}" stroke-width="1.5"/>`;
      }
    }

    if (showLabel)
      svg += `<text x="${x}" y="${lines[4]+22}" font-size="9" fill="${noteColor === 'var(--gold)' ? 'var(--gold)' : 'var(--text-muted)'}" text-anchor="middle" font-family="Inter">${note.pitch}${note.accidental ? ACC_SYMBOLS[note.accidental]:''}${note.octave}</text>`;
  }

  return svg;
}

function drawRest(x, lines, duration, color) {
  const mid = lines[2];
  switch(duration) {
    case 'w': return `<rect x="${x-10}" y="${mid-4}" width="20" height="8" fill="${color}"/>`;
    case 'h': return `<rect x="${x-10}" y="${mid}" width="20" height="6" fill="${color}"/>`;
    case 'q': return `<text x="${x}" y="${mid+8}" font-size="22" fill="${color}" text-anchor="middle" font-family="serif">𝄽</text>`;
    case 'e': return `<text x="${x}" y="${mid+8}" font-size="22" fill="${color}" text-anchor="middle" font-family="serif">𝄾</text>`;
    case 's': return `<text x="${x}" y="${mid+8}" font-size="22" fill="${color}" text-anchor="middle" font-family="serif">𝄿</text>`;
  }
  return '';
}

// ───── Renderiza o pentagrama do EDITOR em múltiplas linhas ─────
function renderEditorStaff() {
  const container = document.getElementById('score-editor-staff');
  if (!container) return;

  const notes      = ScoreState.editorNotes;
  const clef       = ScoreState.editorClef;
  const timeNum    = ScoreState.editorTimeNum;
  const lineGap    = 10;
  const staffTop   = 44;    // espaço acima para o ✕ de delete
  const lines      = [0,1,2,3,4].map(i => staffTop + i * lineGap);
  const clefW      = 50;
  const noteSpacing= 48;
  const marginLeft = clefW + 44;  // espaço para clave + fórmula de compasso
  const H          = 190;         // altura de cada sistema

  // Largura disponível: pega a largura real do container, descontando padding do card
  const availW = Math.max(400, container.offsetWidth || 600);
  const usableW = availW - 20; // margem de segurança
  // Quantas notas cabem por linha (considera barras de compasso ~8px cada)
  const beatsPerLine   = timeNum * Math.max(2, Math.floor((usableW - marginLeft - 40) / (noteSpacing * timeNum)));
  const beatsPerLineFinal = Math.max(timeNum * 2, Math.min(beatsPerLine, timeNum * 8));

  // Dividir notas em linhas respeitando compassos completos
  const lineGroups = [];   // [{notes: [], globalStartIdx}]
  let lineBuf = [], lineBufBeats = 0, lineStartIdx = 0, noteIdx = 0;

  for (const note of notes) {
    const b = DURATION_BEATS[note.duration];
    // Quebra de linha: só no fim de um compasso (beatCount múltiplo de timeNum)
    if (lineBufBeats > 0 && lineBufBeats + b > beatsPerLineFinal) {
      lineGroups.push({ notes: lineBuf, startIdx: lineStartIdx });
      lineBuf = [];
      lineBufBeats = 0;
      lineStartIdx = noteIdx;
    }
    lineBuf.push(note);
    lineBufBeats += b;
    noteIdx++;
  }
  if (lineBuf.length > 0) lineGroups.push({ notes: lineBuf, startIdx: lineStartIdx });

  // Se não há notas, renderiza um sistema vazio
  if (lineGroups.length === 0) lineGroups.push({ notes: [], startIdx: 0 });

  let html = '';

  for (let li = 0; li < lineGroups.length; li++) {
    const { notes: lineNotes, startIdx } = lineGroups[li];
    const isFirstLine = li === 0;
    const W = usableW;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block; width:100%">`;

    // Linhas do pentagrama
    for (const y of lines)
      svg += `<line x1="10" y1="${y}" x2="${W-10}" y2="${y}" stroke="var(--text-muted)" stroke-width="1.2"/>`;
    svg += `<line x1="10" y1="${lines[0]}" x2="10" y2="${lines[4]}" stroke="var(--text)" stroke-width="2"/>`;

    // Clave
    if (clef === 'treble')
      svg += `<text x="12" y="${lines[4]+14}" font-size="58" fill="var(--gold)" font-family="serif">𝄞</text>`;
    else
      svg += `<text x="12" y="${lines[1]+4}" font-size="38" fill="var(--gold)" font-family="serif">𝄢</text>`;

    // Fórmula de compasso só na primeira linha
    if (isFirstLine) {
      svg += `<text x="${clefW+2}" y="${lines[1]+3}" font-size="18" fill="var(--text)" font-weight="bold" font-family="Inter">${timeNum}</text>`;
      svg += `<text x="${clefW+2}" y="${lines[3]+3}" font-size="18" fill="var(--text)" font-weight="bold" font-family="Inter">${ScoreState.editorTimeDen}</text>`;
    }

    let x = marginLeft;
    let beatCount = 0;

    for (let i = 0; i < lineNotes.length; i++) {
      const note       = lineNotes[i];
      const globalIdx  = startIdx + i;
      const beat       = DURATION_BEATS[note.duration];
      const isSelected = ScoreState.editingIdx === globalIdx;
      const noteColor  = isSelected ? 'var(--gold)' : 'var(--white)';

      // Barra de compasso
      if (beatCount > 0 && beatCount % timeNum === 0) {
        svg += `<line x1="${x-7}" y1="${lines[0]}" x2="${x-7}" y2="${lines[4]}" stroke="var(--text-dim)" stroke-width="1.5"/>`;
        x += 8;
      }

      if (note.rest) {
        svg += drawRest(x, lines, note.duration, noteColor);
      } else {
        const step = noteToStep(note.pitch, note.octave);
        const y = clef === 'treble'
          ? staffTop + lineGap * 4 - (step + 2) * (lineGap / 2) + 2
          : staffTop + lineGap * 4 - (step + 16) * (lineGap / 2) + 2;
        svg = drawNoteSymbol(svg, x, y, note, staffTop, lineGap, lines, noteColor, true);
      }

      // Área clicável para selecionar
      svg += `<rect x="${x-18}" y="${lines[0]-14}" width="36" height="${lines[4]-lines[0]+28}" fill="transparent" style="cursor:pointer" onclick="scoreSelectNote(${globalIdx})" title="${note.rest ? 'Pausa' : (note.pitch+(note.accidental||'')+note.octave)}"/>`;

      // ✕ vermelho sobre nota selecionada
      if (isSelected) {
        svg += `<g onclick="scoreDeleteSelected()" style="cursor:pointer" title="Deletar">
          <circle cx="${x}" cy="${lines[0]-10}" r="8" fill="#c95c4c"/>
          <text x="${x}" y="${lines[0]-6}" font-size="11" fill="white" text-anchor="middle" font-family="sans-serif" font-weight="bold">✕</text>
        </g>`;
      }

      beatCount += beat;
      x += noteSpacing;
    }

    // Barra final do sistema
    if (lineNotes.length > 0) {
      const isLast = li === lineGroups.length - 1;
      svg += `<line x1="${x-7}" y1="${lines[0]}" x2="${x-7}" y2="${lines[4]}" stroke="var(--text-dim)" stroke-width="1.5"/>`;
      if (isLast) {
        svg += `<line x1="${x-4}" y1="${lines[0]}" x2="${x-4}" y2="${lines[4]}" stroke="var(--text-dim)" stroke-width="3"/>`;
      }
    }

    svg += '</svg>';
    html += svg;
  }

  container.innerHTML = html;
}

// ───── EDITOR: actions ─────
function scoreAddNote(pitch, octave) {
  if (ScoreState.isRest) { scoreAddRest(); return; }
  ScoreState.editorNotes.push({
    pitch, octave: parseInt(octave),
    duration: ScoreState.selectedDuration,
    accidental: ScoreState.selectedAccidental,
    rest: false,
  });
  ScoreState.editingIdx = null;
  renderEditorStaff();
  updateEditorStatus();
}

function scoreAddRest() {
  ScoreState.editorNotes.push({ rest: true, duration: ScoreState.selectedDuration, pitch: null, octave: null, accidental: '' });
  ScoreState.editingIdx = null;
  renderEditorStaff();
  updateEditorStatus();
}

function scoreSelectNote(idx) {
  ScoreState.editingIdx = (ScoreState.editingIdx === idx) ? null : idx;
  renderEditorStaff();
  updateEditorStatus();
}

function scoreDeleteSelected() {
  if (ScoreState.editingIdx !== null) {
    ScoreState.editorNotes.splice(ScoreState.editingIdx, 1);
    ScoreState.editingIdx = null;
  } else {
    ScoreState.editorNotes.pop();
  }
  renderEditorStaff();
  updateEditorStatus();
}

function scoreClear() {
  if (ScoreState.editorNotes.length === 0) return;
  if (!confirm('Limpar toda a partitura?')) return;
  ScoreState.editorNotes = [];
  ScoreState.editingIdx = null;
  renderEditorStaff();
  updateEditorStatus();
}

function scoreSetDuration(dur) {
  ScoreState.selectedDuration = dur;
  document.querySelectorAll('.score-dur-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('score-dur-' + dur)?.classList.add('active');
}

function scoreToggleRest() {
  ScoreState.isRest = !ScoreState.isRest;
  const btn = document.getElementById('score-rest-btn');
  if (btn) {
    btn.classList.toggle('active', ScoreState.isRest);
    btn.textContent = ScoreState.isRest ? '🎵 Nota' : '𝄽 Pausa';
  }
}

function scoreSetAccidental(acc) {
  ScoreState.selectedAccidental = (ScoreState.selectedAccidental === acc) ? '' : acc;
  document.querySelectorAll('.score-acc-btn').forEach(b => b.classList.remove('active'));
  if (ScoreState.selectedAccidental)
    document.getElementById('score-acc-' + ScoreState.selectedAccidental)?.classList.add('active');
}

function updateEditorStatus() {
  const el = document.getElementById('score-editor-status');
  if (!el) return;
  const n = ScoreState.editorNotes.length;
  if (ScoreState.editingIdx !== null) {
    const note = ScoreState.editorNotes[ScoreState.editingIdx];
    el.innerHTML = note.rest
      ? `<span style="color:var(--gold)">Selecionado: Pausa (${DURATION_NAMES[note.duration]})</span> — clique em <span style="color:var(--red)">✕</span> ou em ⌫ para deletar`
      : `<span style="color:var(--gold)">Selecionado: ${note.pitch}${note.accidental ? ACC_SYMBOLS[note.accidental]:''}${note.octave} — ${DURATION_NAMES[note.duration]}</span> — clique em <span style="color:var(--red)">✕</span> ou em ⌫ para deletar`;
  } else {
    el.textContent = n === 0 ? 'Nenhuma nota inserida.' : `${n} nota${n > 1 ? 's' : ''} inserida${n > 1 ? 's' : ''}. Clique em uma nota para selecioná-la.`;
  }
}

// ───── Teclado de entrada do editor ─────
function renderScoreInputPiano() {
  const wrap = document.getElementById('score-input-piano');
  if (!wrap) return;
  const octaves  = [3, 4, 5];
  const whites   = ['C','D','E','F','G','A','B'];
  const blackMap = { C:'C#', D:'D#', F:'F#', G:'G#', A:'A#' };

  let html = '<div class="score-piano-octaves">';
  for (const oct of octaves) {
    html += `<div class="score-piano-octave">`;
    html += `<div class="score-piano-label">Oct. ${oct}</div>`;
    html += `<div class="score-piano-keys">`;
    for (const p of whites) {
      const acc   = ScoreState.selectedAccidental;
      const label = acc ? `${p}${ACC_SYMBOLS[acc]}` : p;
      html += `<button class="score-key-w" onclick="scoreAddNote('${p}', ${oct})" title="${p}${oct}">${label}</button>`;
    }
    html += '</div><div class="score-piano-blacks">';
    for (const p of whites) {
      if (blackMap[p])
        html += `<button class="score-key-b" onclick="scoreAddBlack('${p}', ${oct})" title="${blackMap[p]}${oct}">${blackMap[p].replace('#','♯')}</button>`;
      else
        html += `<div class="score-key-gap"></div>`;
    }
    html += '</div></div>';
  }
  html += '</div>';
  wrap.innerHTML = html;
}

function scoreAddBlack(pitch, octave) {
  const saved = ScoreState.selectedAccidental;
  ScoreState.selectedAccidental = '#';
  scoreAddNote(pitch, octave);
  ScoreState.selectedAccidental = saved;
}

// ───── FOLHA: painel lateral com partitura em formato de página ─────
function scoreOpenSheet() {
  if (ScoreState.editorNotes.length === 0) {
    alert('A partitura está vazia.');
    return;
  }

  const title    = document.getElementById('score-title')?.value?.trim() || 'Sem título';
  const composer = document.getElementById('score-composer')?.value?.trim() || '';
  const clef     = ScoreState.editorClef;
  const timeNum  = ScoreState.editorTimeNum;
  const timeDen  = ScoreState.editorTimeDen;
  const tempo    = ScoreState.editorTempo;
  const notes    = ScoreState.editorNotes;

  // Parâmetros da página (em px, proporção A4 aprox.)
  const PAGE_W      = 560;
  const PAGE_PAD    = 36;
  const STAFF_W     = PAGE_W - PAGE_PAD * 2;
  const lineGap     = 10;
  const staffTop    = 50;
  const linesY      = [0,1,2,3,4].map(i => staffTop + i * lineGap);
  const clefW       = 48;
  const timeSigW    = 26;
  const marginLeft  = clefW + timeSigW + 12;
  const noteSpacing = 46;
  const STAFF_H     = 160;        // altura de cada sistema
  const SYSTEM_GAP  = 32;         // espaço entre sistemas
  const NOTES_PER_LINE_APPROX = Math.floor((STAFF_W - marginLeft) / noteSpacing);

  // Dividir notas em linhas respeitando compassos
  const lines = [];
  let currentLine = [];
  let currentBeats = 0;
  let lineBeats = 0;

  // Estima quantas batidas cabem por linha
  const beatsPerLine = Math.max(timeNum * 4, timeNum * Math.floor(NOTES_PER_LINE_APPROX / 2));

  for (const note of notes) {
    const b = DURATION_BEATS[note.duration];
    if (lineBeats + b > beatsPerLine && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [];
      lineBeats = 0;
    }
    currentLine.push(note);
    lineBeats += b;
  }
  if (currentLine.length > 0) lines.push(currentLine);

  // Altura total da página
  const headerH   = composer ? 80 : 60;
  const footerH   = 30;
  const totalH    = headerH + lines.length * (STAFF_H + SYSTEM_GAP) + footerH;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE_W}" height="${totalH}" viewBox="0 0 ${PAGE_W} ${totalH}">`;

  // Fundo branco (folha de papel)
  svg += `<rect width="${PAGE_W}" height="${totalH}" fill="#ffffff"/>`;

  // Título
  svg += `<text x="${PAGE_W/2}" y="34" font-size="18" fill="#1a1a1a" text-anchor="middle" font-family="'Playfair Display', serif" font-weight="600">${escapeXML(title)}</text>`;
  if (composer)
    svg += `<text x="${PAGE_W/2}" y="54" font-size="11" fill="#555" text-anchor="middle" font-family="Inter, sans-serif" font-style="italic">${escapeXML(composer)}</text>`;

  // Tempo
  const tempoY = composer ? 68 : 50;
  svg += `<text x="${PAGE_PAD}" y="${tempoY}" font-size="10" fill="#555" font-family="Inter, sans-serif">♩ = ${tempo}</text>`;

  // Sistemas (linhas de pentagrama)
  let systemY = headerH;
  let isFirst = true;

  for (const lineNotes of lines) {
    const absLines = linesY.map(y => systemY + y);

    // Linhas do pentagrama
    for (const y of absLines)
      svg += `<line x1="${PAGE_PAD}" y1="${y}" x2="${PAGE_PAD + STAFF_W}" y2="${y}" stroke="#333" stroke-width="1"/>`;

    // Barra de início
    svg += `<line x1="${PAGE_PAD}" y1="${absLines[0]}" x2="${PAGE_PAD}" y2="${absLines[4]}" stroke="#333" stroke-width="1.8"/>`;

    // Clave
    const clefX = PAGE_PAD + 4;
    if (clef === 'treble')
      svg += `<text x="${clefX}" y="${absLines[4]+14}" font-size="58" fill="#1a1a1a" font-family="serif">𝄞</text>`;
    else
      svg += `<text x="${clefX}" y="${absLines[1]+4}" font-size="38" fill="#1a1a1a" font-family="serif">𝄢</text>`;

    // Fórmula de compasso (só no primeiro sistema)
    if (isFirst) {
      svg += `<text x="${PAGE_PAD+clefW+2}" y="${absLines[1]+3}" font-size="18" fill="#1a1a1a" font-weight="bold" font-family="Inter, sans-serif">${timeNum}</text>`;
      svg += `<text x="${PAGE_PAD+clefW+2}" y="${absLines[3]+3}" font-size="18" fill="#1a1a1a" font-weight="bold" font-family="Inter, sans-serif">${timeDen}</text>`;
    }

    // Notas do sistema
    let x = PAGE_PAD + marginLeft;
    let beatCount = 0;
    const staffAbsTop = systemY + staffTop;

    for (const note of lineNotes) {
      const b = DURATION_BEATS[note.duration];

      if (beatCount >= timeNum && beatCount > 0) {
        svg += `<line x1="${x-7}" y1="${absLines[0]}" x2="${x-7}" y2="${absLines[4]}" stroke="#444" stroke-width="1.2"/>`;
        beatCount = 0;
        x += 8;
      }

      if (note.rest) {
        // Pausas: desenha em preto
        const mid = absLines[2];
        switch(note.duration) {
          case 'w': svg += `<rect x="${x-10}" y="${mid-4}" width="20" height="8" fill="#1a1a1a"/>`; break;
          case 'h': svg += `<rect x="${x-10}" y="${mid}" width="20" height="6" fill="#1a1a1a"/>`; break;
          case 'q': svg += `<text x="${x}" y="${mid+8}" font-size="22" fill="#1a1a1a" text-anchor="middle" font-family="serif">𝄽</text>`; break;
          case 'e': svg += `<text x="${x}" y="${mid+8}" font-size="22" fill="#1a1a1a" text-anchor="middle" font-family="serif">𝄾</text>`; break;
          case 's': svg += `<text x="${x}" y="${mid+8}" font-size="22" fill="#1a1a1a" text-anchor="middle" font-family="serif">𝄿</text>`; break;
        }
      } else {
        const step = noteToStep(note.pitch, note.octave);
        const y = clef === 'treble'
          ? staffAbsTop + lineGap * 4 - (step + 2) * (lineGap / 2) + 2
          : staffAbsTop + lineGap * 4 - (step + 16) * (lineGap / 2) + 2;

        // Linhas suplementares
        for (let ly = absLines[4] + lineGap; ly <= y + 1; ly += lineGap)
          svg += `<line x1="${x-8}" y1="${ly}" x2="${x+8}" y2="${ly}" stroke="#555" stroke-width="1"/>`;
        for (let ly = absLines[0] - lineGap; ly >= y - 1; ly -= lineGap)
          svg += `<line x1="${x-8}" y1="${ly}" x2="${x+8}" y2="${ly}" stroke="#555" stroke-width="1"/>`;

        if (note.accidental)
          svg += `<text x="${x-16}" y="${y+5}" font-size="13" fill="#1a1a1a" font-family="serif">${ACC_SYMBOLS[note.accidental]}</text>`;

        const filled = note.duration !== 'w' && note.duration !== 'h';
        svg += `<ellipse cx="${x}" cy="${y}" rx="7" ry="5" fill="${filled ? '#1a1a1a' : 'none'}" stroke="#1a1a1a" stroke-width="1.5" transform="rotate(-15,${x},${y})"/>`;
        if (note.duration === 'h')
          svg += `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.5" fill="none" stroke="white" stroke-width="1.5" transform="rotate(-15,${x},${y})"/>`;

        if (note.duration !== 'w') {
          const stemUp = y > staffAbsTop + lineGap * 2;
          if (stemUp) {
            svg += `<line x1="${x+6}" y1="${y-2}" x2="${x+6}" y2="${y-30}" stroke="#1a1a1a" stroke-width="1.5"/>`;
          } else {
            svg += `<line x1="${x-6}" y1="${y+2}" x2="${x-6}" y2="${y+30}" stroke="#1a1a1a" stroke-width="1.5"/>`;
          }
          if (note.duration === 'e' || note.duration === 's') {
            if (stemUp) svg += `<path d="M${x+6} ${y-30} Q${x+22} ${y-18} ${x+8} ${y-12}" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>`;
            else        svg += `<path d="M${x-6} ${y+30} Q${x+10} ${y+18} ${x-4} ${y+12}" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>`;
          }
          if (note.duration === 's') {
            if (stemUp) svg += `<path d="M${x+6} ${y-24} Q${x+22} ${y-12} ${x+8} ${y-6}" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>`;
            else        svg += `<path d="M${x-6} ${y+24} Q${x+10} ${y+12} ${x-4} ${y+6}" fill="none" stroke="#1a1a1a" stroke-width="1.5"/>`;
          }
        }
      }
      beatCount += b;
      x += noteSpacing;
    }

    // Barra final do sistema
    svg += `<line x1="${x-7}" y1="${absLines[0]}" x2="${x-7}" y2="${absLines[4]}" stroke="#444" stroke-width="1.2"/>`;
    if (isFirst || lineNotes === lines[lines.length - 1]) {
      svg += `<line x1="${x-4}" y1="${absLines[0]}" x2="${x-4}" y2="${absLines[4]}" stroke="#222" stroke-width="2.5"/>`;
    }

    systemY += STAFF_H + SYSTEM_GAP;
    isFirst = false;
  }

  svg += '</svg>';

  // Montar o painel lateral
  const panel = document.getElementById('score-sheet-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="score-sheet-header">
      <span class="score-sheet-title-label">Visualização da folha</span>
      <div style="display:flex; gap:8px">
        <button class="btn btn-gold" onclick="scoreDownloadSVG()" style="font-size:0.78rem; padding:7px 14px">⬇ Baixar SVG</button>
        <button class="btn btn-outline" onclick="scoreCloseSheet()" style="font-size:0.78rem; padding:7px 14px">✕ Fechar</button>
      </div>
    </div>
    <div class="score-sheet-body">
      <div class="score-sheet-page" id="score-sheet-svg-wrap">
        ${svg}
      </div>
    </div>`;

  ScoreState._lastSheetSVG = svg;
  panel.classList.add('open');
  document.getElementById('score-editor-panel').classList.add('sheet-pushed');
  ScoreState.sheetOpen = true;
}

function scoreCloseSheet() {
  const panel = document.getElementById('score-sheet-panel');
  if (panel) panel.classList.remove('open');
  document.getElementById('score-editor-panel')?.classList.remove('sheet-pushed');
  ScoreState.sheetOpen = false;
}

function scoreDownloadSVG() {
  if (!ScoreState._lastSheetSVG) return;
  const title = document.getElementById('score-title')?.value?.trim() || 'partitura';
  const blob = new Blob([ScoreState._lastSheetSVG], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = title.replace(/[^a-zA-Z0-9]/g,'_') + '.svg';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ───── EXPORTAR MusicXML ─────
function scoreExportMusicXML() {
  const notes = ScoreState.editorNotes;
  if (notes.length === 0) { alert('A partitura está vazia.'); return; }

  const title    = document.getElementById('score-title')?.value?.trim() || 'Partitura';
  const composer = document.getElementById('score-composer')?.value?.trim() || '';
  const clef     = ScoreState.editorClef;
  const beats    = ScoreState.editorTimeNum;
  const beatType = ScoreState.editorTimeDen;
  const tempo    = ScoreState.editorTempo;

  const DURATION_XML = { w:'whole', h:'half', q:'quarter', e:'eighth', s:'16th' };
  const DURATION_DIV = { w:16, h:8, q:4, e:2, s:1 };
  const ACC_XML      = { '#':'sharp', 'b':'flat', 'n':'natural' };

  let measuresXML = '';
  let measureNotes = [], measureBeats = 0, measureNum = 1, isFirst = true;

  function flushMeasure(notesList, num, addAttrs) {
    let content = '';
    if (addAttrs) {
      content += `
        <attributes>
          <divisions>4</divisions>
          <key><fifths>${ScoreState.editorKey}</fifths></key>
          <time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>
          <clef><sign>${clef === 'treble' ? 'G' : 'F'}</sign><line>${clef === 'treble' ? '2' : '4'}</line></clef>
        </attributes>
        <direction placement="above">
          <direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type>
          <sound tempo="${tempo}"/>
        </direction>`;
    }
    for (const n of notesList) {
      if (n.rest) {
        content += `\n        <note><rest/><duration>${DURATION_DIV[n.duration]}</duration><type>${DURATION_XML[n.duration]}</type></note>`;
      } else {
        const alter = n.accidental === '#' ? 1 : n.accidental === 'b' ? -1 : 0;
        content += `\n        <note>
          <pitch><step>${n.pitch}</step>${alter !== 0 ? `<alter>${alter}</alter>` : ''}<octave>${n.octave}</octave></pitch>
          <duration>${DURATION_DIV[n.duration]}</duration><type>${DURATION_XML[n.duration]}</type>
          ${n.accidental ? `<accidental>${ACC_XML[n.accidental]}</accidental>` : ''}
        </note>`;
      }
    }
    return `\n    <measure number="${num}">${content}\n    </measure>`;
  }

  for (const note of notes) {
    const b = DURATION_BEATS[note.duration];
    if (measureBeats + b > beats && measureBeats > 0) {
      measuresXML += flushMeasure(measureNotes, measureNum, isFirst);
      isFirst = false; measureNum++; measureNotes = []; measureBeats = 0;
    }
    measureNotes.push(note);
    measureBeats += b;
  }
  if (measureNotes.length > 0) measuresXML += flushMeasure(measureNotes, measureNum, isFirst);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXML(title)}</work-title></work>
  <identification>
    ${composer ? `<creator type="composer">${escapeXML(composer)}</creator>` : ''}
    <encoding><software>Piano Tools</software></encoding>
  </identification>
  <part-list><score-part id="P1"><part-name>${escapeXML(title)}</part-name></score-part></part-list>
  <part id="P1">${measuresXML}
  </part>
</score-partwise>`;

  const blob = new Blob([xml], { type: 'application/xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (title.replace(/[^a-zA-Z0-9]/g,'_') || 'partitura') + '.musicxml';
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeXML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ───── VIEWER: importar MusicXML (.xml / .musicxml / .mxl) ─────
function scoreImportMusicXML(file) {
  if (!file) return;
  const errEl = document.getElementById('score-viewer-error');
  errEl.textContent = '';

  const name = file.name.toLowerCase();

  if (name.endsWith('.mxl')) {
    // .mxl = ZIP contendo score.xml (ou outro .xml apontado pelo META-INF/container.xml)
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const xmlText = await extractMxl(e.target.result);
        parseXMLText(xmlText);
      } catch(ex) {
        errEl.textContent = 'Erro ao ler .mxl: ' + ex.message;
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // .xml / .musicxml — leitura direta como texto
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        parseXMLText(e.target.result);
      } catch(ex) {
        errEl.textContent = 'Erro ao ler o arquivo: ' + ex.message;
      }
    };
    reader.readAsText(file);
  }
}

function parseXMLText(text) {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('XML inválido');
  parseMusicXML(xml);
}

// ── Parser ZIP robusto para extrair o score.xml de dentro do .mxl ──
async function extractMxl(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const dec   = new TextDecoder('utf-8');

  // Lê uint16 little-endian
  const u16 = (off) => view.getUint16(off, true);
  // Lê uint32 little-endian (sem problema de sinal)
  const u32 = (off) => view.getUint32(off, true);

  const entries = [];
  let i = 0;

  while (i <= arrayBuffer.byteLength - 30) {
    // Assinatura do local file header: PK\x03\x04
    if (u32(i) !== 0x04034b50) { i++; continue; }

    const flags       = u16(i + 6);
    const compression = u16(i + 8);
    const compSize    = u32(i + 18);
    const nameLen     = u16(i + 26);
    const extraLen    = u16(i + 28);
    const name        = dec.decode(bytes.subarray(i + 30, i + 30 + nameLen));
    const dataStart   = i + 30 + nameLen + extraLen;

    // Se bit 3 (data descriptor) está set, os tamanhos estão zerados no header
    // e aparecem após os dados — precisamos buscar no central directory
    if ((flags & 0x0008) && compSize === 0) {
      // Pula: vai pegar do central directory depois
      entries.push({ name, compression, compSize: 0, dataStart, hasDataDesc: true });
      i = dataStart; // avança — não sabe onde termina
      break;
    }

    entries.push({ name, compression, compSize, dataStart, hasDataDesc: false });
    i = dataStart + compSize;
  }

  // Se alguma entrada tem data descriptor, lê o central directory no fim do arquivo
  if (entries.some(e => e.hasDataDesc) || entries.length === 0) {
    // Busca End of Central Directory (PK\x05\x06)
    let eocd = -1;
    for (let j = arrayBuffer.byteLength - 22; j >= 0; j--) {
      if (u32(j) === 0x06054b50) { eocd = j; break; }
    }
    if (eocd >= 0) {
      const cdOffset = u32(eocd + 16);
      const cdSize   = u32(eocd + 12);
      let j = cdOffset;
      entries.length = 0; // reinicia com dados corretos
      while (j < cdOffset + cdSize && j + 46 <= arrayBuffer.byteLength) {
        if (u32(j) !== 0x02014b50) break; // central dir file header
        const compression = u16(j + 10);
        const compSize    = u32(j + 20);
        const nameLen     = u16(j + 28);
        const extraLen    = u16(j + 30);
        const commentLen  = u16(j + 32);
        const localOffset = u32(j + 42);
        const name        = dec.decode(bytes.subarray(j + 46, j + 46 + nameLen));
        // Recalcula dataStart a partir do local header offset
        const lhNameLen  = u16(localOffset + 26);
        const lhExtraLen = u16(localOffset + 28);
        const dataStart  = localOffset + 30 + lhNameLen + lhExtraLen;
        entries.push({ name, compression, compSize, dataStart, hasDataDesc: false });
        j += 46 + nameLen + extraLen + commentLen;
      }
    }
  }

  if (entries.length === 0)
    throw new Error('Arquivo .mxl não contém entradas ZIP reconhecíveis.');

  // Descobrir arquivo raiz via META-INF/container.xml
  let rootPath = null;
  const containerEntry = entries.find(e => e.name === 'META-INF/container.xml');
  if (containerEntry && containerEntry.compSize > 0) {
    const txt = await readZipEntry(bytes, containerEntry, dec);
    const xml = new DOMParser().parseFromString(txt, 'application/xml');
    rootPath  = xml.querySelector('rootfile')?.getAttribute('full-path') || null;
  }

  if (!rootPath) {
    const c = entries.find(e =>
      (e.name.endsWith('.xml') || e.name.endsWith('.musicxml')) &&
      !e.name.startsWith('META-INF') && e.compSize > 0
    );
    if (c) rootPath = c.name;
  }

  if (!rootPath)
    throw new Error('Não foi possível encontrar a partitura dentro do .mxl.');

  const scoreEntry = entries.find(e => e.name === rootPath);
  if (!scoreEntry)
    throw new Error(`Arquivo "${rootPath}" não encontrado no .mxl.`);

  return readZipEntry(bytes, scoreEntry, dec);
}

async function readZipEntry(bytes, entry, dec) {
  const data = bytes.subarray(entry.dataStart, entry.dataStart + entry.compSize);

  if (entry.compression === 0) {
    return dec.decode(data);
  } else if (entry.compression === 8) {
    // Deflate-raw via DecompressionStream
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    // Escrever em chunks para evitar truncamento
    const CHUNK = 65536;
    for (let off = 0; off < data.length; off += CHUNK) {
      await writer.write(data.subarray(off, Math.min(off + CHUNK, data.length)));
    }
    await writer.close();

    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }

    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return dec.decode(out);
  } else {
    throw new Error(`Método de compressão ZIP ${entry.compression} não suportado.`);
  }
}
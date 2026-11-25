// ===================== PIANO KEYBOARD =====================

// Cores por inversão: [posição fundamental, 1ª, 2ª, 3ª]
//   solid = nota FUNDAMENTAL (cor forte)
//   soft  = demais notas nas teclas brancas
//   mid   = demais notas nas teclas pretas
//   ink   = cor do texto/ponto sobre a cor forte
const INVERSION_COLORS = [
  { name: 'Posição fundamental', solid: '#DC8F05', mid: '#C9A84C', soft: '#E8C97A', ink: '#1A1410' }, // dourado
  { name: '1ª inversão',         solid: '#0A7F75', mid: '#4FBFB0', soft: '#6FD0C3', ink: '#FFFFFF' }, // turquesa
  { name: '2ª inversão',         solid: '#D6402A', mid: '#EE8570', soft: '#F4A08E', ink: '#FFFFFF' }, // coral
  { name: '3ª inversão',         solid: '#6F49DB', mid: '#A28BF0', soft: '#B9A4F7', ink: '#FFFFFF' }, // violeta
];

// "#RRGGBB" -> "rgba(r, g, b, a)" (usado nos tons translúcidos da interface)
function colorAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Posições REAIS das notas de um acorde numa inversão.
// O teclado tem 24 teclas (2 oitavas, posições 0 a 23 a partir do Dó mais grave).
// Retorna as notas em ordem do grave para o agudo (a primeira é o baixo).
function getVoicing(root, type, inversion) {
  const intervals = CHORDS[type] || CHORDS.maj;
  const rootIdx   = noteIdx(root);

  let items = intervals.map((iv, i) => ({ iv, pos: rootIdx + iv, isRoot: i === 0 }));

  // Inversão n: a n-ésima nota do acorde vira o baixo;
  // as notas que estavam abaixo dela sobem uma oitava
  const n = Math.min(inversion || 0, items.length - 1);
  for (let i = 0; i < n; i++) items[i].pos += 12;
  // Se o baixo for a 9ª (add9, 3ª inversão), ela desce uma oitava para ficar de fato no grave
  if (n > 0 && items[n].iv >= 12) items[n].pos -= 12;

  // Se passar do fim do teclado, desce o acorde inteiro uma oitava
  const maxPos = () => Math.max(...items.map(x => x.pos));
  const minPos = () => Math.min(...items.map(x => x.pos));
  while (maxPos() > 23 && minPos() >= 12) items.forEach(x => { x.pos -= 12; });

  // Caso restante (acordes com 9ª muito agudos, ~2% das combinações): não cabem em 2 oitavas.
  // A nota que sobra é mostrada uma oitava abaixo e isso é avisado na legenda.
  let folded = false;
  items.forEach(x => { if (x.pos > 23) { x.pos -= 12; folded = true; } });

  items.sort((a, b) => a.pos - b.pos);

  return {
    positions: items.map(x => x.pos),
    notes:     items.map(x => NOTES[x.pos % 12]),
    rootPos:   items.find(x => x.isRoot).pos,
    folded
  };
}

// Desenha o teclado.
//   highlightedNotes: nomes das notas (ex.: escala) — destaca em todas as oitavas
//   rootNote:         nome da fundamental (ou null se não houver)
//   opts.palette:     cor (use INVERSION_COLORS[n]); padrão = dourado
//   opts.voicing/opts.rootPos: posições exatas (de getVoicing) — destaca só essas teclas
//   opts.folded:      avisa na legenda que uma nota foi mostrada uma oitava abaixo
function renderPiano(containerId, highlightedNotes, rootNote, opts) {
  const container = document.getElementById(containerId);
  if (!container) return;

  opts = opts || {};
  const pal     = opts.palette || INVERSION_COLORS[0];
  const voicing = opts.voicing || null;
  const rootPos = opts.rootPos;

  const whites     = ['C','D','E','F','G','A','B'];
  const whiteSemi  = [0, 2, 4, 5, 7, 9, 11];
  const blackAfter = { C: ['C#', 1], D: ['D#', 3], F: ['F#', 6], G: ['G#', 8], A: ['A#', 10] };
  const KEY_W = 36;
  const GAP   = 2;
  const STEP  = KEY_W + GAP;
  const totalWidth = whites.length * 2 * STEP - GAP;

  // 0 = apagada · 1 = nota do acorde/escala · 2 = fundamental
  function stateOf(name, absPos) {
    if (voicing) {
      if (!voicing.includes(absPos)) return 0;
      return absPos === rootPos ? 2 : 1;
    }
    if (!highlightedNotes || !highlightedNotes.includes(name)) return 0;
    return (rootNote && name === rootNote) ? 2 : 1;
  }

  let whiteHTML = '';
  let blackHTML = '';
  let hasRoot   = false;

  for (let oct = 0; oct < 2; oct++) {
    whites.forEach((n, wi) => {
      const x   = (oct * whites.length + wi) * STEP;
      const abs = oct * 12 + whiteSemi[wi];
      const st  = stateOf(n, abs);

      let style = `position:absolute; left:${x}px; top:0;`;
      let dot   = '';
      if (st === 1) {
        style += ` background:${pal.soft}; border-color:${pal.mid}; color:#1A1410; font-weight:700;`;
      } else if (st === 2) {
        hasRoot = true;
        style += ` background:${pal.solid}; border-color:${pal.solid}; color:${pal.ink}; font-weight:700;`;
        dot = `<i style="position:absolute; left:50%; bottom:24px; transform:translateX(-50%);
                 width:10px; height:10px; border-radius:50%; background:${pal.ink};"></i>`;
      }
      whiteHTML += `<div class="key-w" style="${style}">${dot}${n}</div>`;

      if (blackAfter[n]) {
        const [bn, semi] = blackAfter[n];
        const bst = stateOf(bn, oct * 12 + semi);
        const bx  = x + KEY_W - 11; // centraliza a tecla preta sobre a borda

        let bBg = 'var(--key-black)', bBorder = '#333', bColor = '#888', bDot = '';
        if (bst === 1) {
          bBg = pal.mid; bBorder = pal.mid; bColor = '#1A1410';
        } else if (bst === 2) {
          hasRoot = true;
          bBg = pal.solid; bBorder = pal.solid; bColor = pal.ink;
          bDot = `<i style="position:absolute; left:50%; bottom:20px; transform:translateX(-50%);
                    width:8px; height:8px; border-radius:50%; background:${pal.ink};"></i>`;
        }

        blackHTML += `<div style="
          position:absolute; left:${bx}px; top:0; width:22px; height:64px;
          background:${bBg}; border-radius:0 0 4px 4px; border:1px solid ${bBorder};
          z-index:2; display:flex; align-items:flex-end; justify-content:center;
          padding-bottom:3px; font-size:0.5rem; color:${bColor}; font-weight:700;
          pointer-events:none;">${bDot}${bst ? bn : ''}</div>`;
      }
    });
  }

  // Legenda: explica as cores (só aparece se há alguma nota destacada)
  const anyLit = voicing ? voicing.length > 0 : !!(highlightedNotes && highlightedNotes.length);
  let legend = '';
  if (anyLit && opts.legend !== false) {
    const swatch = (bg, inner) =>
      `<span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px;
        border-radius:4px; background:${bg};">${inner}</span>`;
    const rootItem = hasRoot
      ? `<span style="display:inline-flex; align-items:center; gap:6px;">
           ${swatch(pal.solid, `<i style="width:6px; height:6px; border-radius:50%; background:${pal.ink}; display:block;"></i>`)}
           Fundamental</span>`
      : '';
    legend = `
      <div style="display:flex; gap:18px; justify-content:center; flex-wrap:wrap; margin-top:14px;
                  font-size:0.72rem; color:var(--text-muted);">
        ${rootItem}
        <span style="display:inline-flex; align-items:center; gap:6px;">${swatch(pal.soft, '')} Demais notas</span>
        ${opts.folded ? '<span>· uma nota aparece uma oitava abaixo (não cabe no teclado)</span>' : ''}
      </div>`;
  }

  container.innerHTML = `
    <div style="position:relative; width:${totalWidth}px; height:110px; margin:0 auto;">
      ${whiteHTML}
      ${blackHTML}
    </div>
    ${legend}
  `;
}

// ===================== AUXILIARES DE INTERFACE (acordes) =====================

// Pílulas das notas do acorde, do grave para o agudo.
// A fundamental fica em cor forte com um ponto; as demais em tom translúcido.
function chordPillsHTML(notes, rootName, pal) {
  return notes.map(n => {
    const isRoot = n === rootName;
    const style = isRoot
      ? `background:${pal.solid}; border-color:${pal.solid}; color:${pal.ink}; font-weight:700;`
      : `background:${colorAlpha(pal.mid, 0.16)}; border-color:${pal.mid}; color:${pal.soft};`;
    const dot = isRoot
      ? `<i style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${pal.ink}; margin-right:7px;"></i>`
      : '';
    return `<div class="note-pill" style="${style}">${dot}${n}</div>`;
  }).join('');
}

// Botões de inversão: cada um com a sua cor (a ativa fica preenchida).
// fnName = nome da função global chamada ao clicar, ex.: 'setInversion'.
function inversionButtonsHTML(count, activeInv, fnName) {
  return Array.from({ length: count }, (_, i) => {
    const p      = INVERSION_COLORS[i];
    const active = i === activeInv;
    const style  = active
      ? `border-color:${p.mid}; background:${colorAlpha(p.mid, 0.22)}; color:${p.soft}; font-weight:600;`
      : `border-color:${colorAlpha(p.mid, 0.45)}; background:${colorAlpha(p.mid, 0.05)};`;
    return `<button class="inv-btn" style="${style}" onclick="${fnName}(${i})">
      <i style="display:inline-block; width:9px; height:9px; border-radius:50%; background:${p.mid}; margin-right:8px;"></i>${p.name}
    </button>`;
  }).join('');
}

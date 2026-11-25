// ===================== VERSÃO DO APP =====================
// Edite aqui para atualizar o número de versão exibido na sidebar
const APP_VERSION = '2.0.0';

// ===================== INICIALIZAÇÃO =====================
document.addEventListener('DOMContentLoaded', () => {

  // Exibir versão na sidebar
  const vEl = document.getElementById('version-tag');
  if (vEl) vEl.textContent = 'v' + APP_VERSION;

  buildScale();
  updateMetroBeats();
  newStaffNote();
  renderDiary();

  currentChordRoot = document.getElementById('ch-root').value;
  currentChordType = document.getElementById('ch-type').value;
  currentInversion = 0;
  renderChord();

  // Harmonizador: preencher todas as 12 tonalidades
  if (typeof initHarmony === 'function') initHarmony();

  // Cifra: preencher selects
  if (typeof initCifra === 'function') initCifra();

  newEarChord();

  // Identificador de acordes — teclado clicável
  renderClickablePiano();

});

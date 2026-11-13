// ===================== INICIALIZAÇÃO =====================
document.addEventListener('DOMContentLoaded', () => {

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
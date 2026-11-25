// ===================== NAVEGAÇÃO =====================

// FIX #7: função centralizada que aceita tanto o elemento clicado
// quanto uma string de id para navegação programática
function showPage(id, el) {
  document.querySelectorAll('.tool-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');

  if (el) {
    // Chamada via onclick no HTML — el é o elemento clicado
    el.classList.add('active');
  } else {
    // FIX #7: chamada programática — busca nav-item pelo id da página
    document.querySelectorAll('.nav-item').forEach(item => {
      const attr = item.getAttribute('onclick') || '';
      if (attr.includes(`'${id}'`)) item.classList.add('active');
    });
  }
}

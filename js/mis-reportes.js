// js/mis-reportes.js
// HU-014: el vecino consulta sus reportes y el estado de cada uno
// (Recibido → En atención → Resuelto).

document.addEventListener('DOMContentLoaded', () => {
  const lista = document.getElementById('lista-reportes');
  const e = EcoReportes.escapar;

  const iconoCamara = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;

  // Línea de tiempo de 3 pasos, igual que en la plantilla
  const lineaDeTiempo = (estado) => {
    const indiceActual = EcoReportes.ORDEN_ESTADOS.indexOf(estado);
    return EcoReportes.ORDEN_ESTADOS.map((clave, i) => {
      let clase = '';
      if (estado === 'resuelto' || i < indiceActual) clase = 'completed';
      else if (i === indiceActual) clase = `active estado-paso-${clave}`;
      return `
        <div class="timeline-step ${clase}">
          <span class="dot"></span>
          <span class="label">${EcoReportes.ESTADOS[clave].texto}</span>
        </div>`;
    }).join('');
  };

  const tarjeta = (r) => {
    const estado = EcoReportes.ESTADOS[r.estado];
    const foto = r.foto
      ? `<div class="reporte-foto"><img src="${e(r.foto)}" alt="Foto del reporte ${e(r.id)}"></div>`
      : `<div class="reporte-foto sin-foto" aria-label="Reporte sin foto">${iconoCamara}</div>`;
    const enMapa = (r.lat !== null && r.lat !== undefined)
      ? `<div class="reporte-acciones"><a href="mapa.html?id=${encodeURIComponent(r.id)}">Ver en el mapa →</a></div>`
      : '';

    return `
      <article class="tarjeta-reporte" aria-label="Reporte ${e(r.id)}: ${e(estado.texto)}">
        ${foto}
        <div class="reporte-info">
          <h3>${e(r.direccion)}</h3>
          <p class="reporte-categoria">${e(EcoReportes.CATEGORIAS[r.categoria] || r.categoria)}</p>
          <p class="reporte-meta">${e(r.id)} · ${e(EcoReportes.formatearFecha(r.fecha))} · Urgencia ${e(EcoReportes.URGENCIAS[r.urgencia] || '')}</p>
          <span class="etiqueta-estado ${estado.clase}">${estado.texto}</span>

          <!-- Línea de tiempo -->
          <div class="timeline">${lineaDeTiempo(r.estado)}</div>
          ${enMapa}
        </div>
      </article>`;
  };

  const mios = EcoReportes.obtenerMios();

  if (mios.length === 0) {
    lista.innerHTML = `
      <div class="lista-vacia">
        <h2>Aún no tienes reportes</h2>
        <p>Cuando reportes un punto de basura, aquí podrás ver si fue recibido, si está en atención o si ya fue resuelto.</p>
        <a href="reportar.html" class="boton">Hacer mi primer reporte</a>
      </div>`;
    return;
  }

  const pendientes = mios.filter((r) => r.estado !== 'resuelto').length;
  const resumen = `<p class="resumen-lista">${mios.length} reporte${mios.length === 1 ? '' : 's'} · ${pendientes} pendiente${pendientes === 1 ? '' : 's'} de solución</p>`;

  lista.innerHTML = resumen + mios.map(tarjeta).join('');
});

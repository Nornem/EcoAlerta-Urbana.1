// js/mapa.js
// HU-016: mapa comunitario con los focos de basura del distrito.
// Usa Leaflet + OpenStreetMap. Si el mapa no puede cargarse (sin internet),
// se mantiene la simulación de la plantilla con marcadores posicionados.

document.addEventListener('DOMContentLoaded', () => {
  const e = EcoReportes.escapar;
  const contenedor = document.getElementById('mapa-comunitario');
  const divLeaflet = document.getElementById('mapa-leaflet');
  const placeholder = contenedor.querySelector('.map-placeholder');
  const resumen = document.getElementById('resumen-mapa');
  const infoReporte = document.getElementById('info-reporte');

  const modalFiltros = document.getElementById('modal-filtros');
  const formFiltros = document.getElementById('form-filtros');
  const btnFiltros = document.getElementById('btn-filtros');

  const idDestacado = new URLSearchParams(window.location.search).get('id');

  // Solo se dibujan reportes con coordenadas
  const todos = () => EcoReportes.obtenerTodos().filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number');

  // ==========================================
  // 1. FILTROS
  // ==========================================
  const contCategorias = document.getElementById('filtro-categorias');
  Object.entries(EcoReportes.CATEGORIAS).forEach(([valor, texto]) => {
    contCategorias.insertAdjacentHTML('beforeend',
      `<label class="opcion-filtro"><input type="checkbox" name="categoria" value="${valor}" checked> ${texto}</label>`);
  });

  const leerFiltros = () => {
    const marcados = (nombre) => [...formFiltros.querySelectorAll(`input[name="${nombre}"]:checked`)].map((i) => i.value);
    return {
      estados: marcados('estado'),
      categorias: marcados('categoria'),
      soloMios: formFiltros.querySelector('input[name="mios"]').checked
    };
  };

  const aplicarFiltros = (lista, f) =>
    lista.filter((r) =>
      f.estados.includes(r.estado) &&
      f.categorias.includes(r.categoria) &&
      (!f.soloMios || r.mio));

  const contarFiltrosActivos = (f) => {
    let n = 0;
    if (f.estados.length < 3) n++;
    if (f.categorias.length < Object.keys(EcoReportes.CATEGORIAS).length) n++;
    if (f.soloMios) n++;
    return n;
  };

  const actualizarBotonFiltros = (f) => {
    const n = contarFiltrosActivos(f);
    const contador = btnFiltros.querySelector('.contador-filtros');
    if (contador) contador.remove();
    if (n > 0) btnFiltros.insertAdjacentHTML('beforeend', `<span class="contador-filtros" aria-label="${n} filtros activos">${n}</span>`);
  };

  const abrirModal = () => { modalFiltros.classList.add('active'); modalFiltros.setAttribute('aria-hidden', 'false'); };
  const cerrarModal = () => { modalFiltros.classList.remove('active'); modalFiltros.setAttribute('aria-hidden', 'true'); };

  btnFiltros.addEventListener('click', abrirModal);
  document.getElementById('btn-cerrar-filtros').addEventListener('click', cerrarModal);
  modalFiltros.addEventListener('click', (ev) => { if (ev.target === modalFiltros) cerrarModal(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') cerrarModal(); });

  document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
    formFiltros.querySelectorAll('input[name="estado"], input[name="categoria"]').forEach((i) => { i.checked = true; });
    formFiltros.querySelector('input[name="mios"]').checked = false;
  });

  // ==========================================
  // 2. CONTENIDO COMÚN
  // ==========================================
  const fichaHTML = (r) => {
    const estado = EcoReportes.ESTADOS[r.estado];
    return `
      <div class="popup-reporte">
        ${r.foto ? `<img src="${e(r.foto)}" alt="Foto del reporte ${e(r.id)}">` : ''}
        <h3>${e(r.direccion)}</h3>
        <p>${e(EcoReportes.CATEGORIAS[r.categoria] || r.categoria)} · Urgencia ${e(EcoReportes.URGENCIAS[r.urgencia] || '')}</p>
        <span class="etiqueta-estado ${estado.clase}">${estado.texto}</span>
        <p>${e(r.id)} · ${e(EcoReportes.formatearFecha(r.fecha))}${r.mio ? ' · <strong>Tu reporte</strong>' : ''}</p>
      </div>`;
  };

  const actualizarResumen = (visibles, total) => {
    const pendientes = visibles.filter((r) => r.estado !== 'resuelto').length;
    resumen.textContent = visibles.length === 0
      ? 'No hay reportes con estos filtros'
      : `${visibles.length} de ${total} puntos · ${pendientes} pendiente${pendientes === 1 ? '' : 's'}`;
  };

  // ==========================================
  // 3. MODO MAPA REAL (Leaflet)
  // ==========================================
  const iniciarLeaflet = () => {
    divLeaflet.hidden = false;
    placeholder.hidden = true;

    const mapa = L.map(divLeaflet, { zoomControl: false }).setView([EcoReportes.CENTRO_LIMA.lat, EcoReportes.CENTRO_LIMA.lng], 12);
    L.control.zoom({ position: 'topright' }).addTo(mapa);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    const capa = L.layerGroup().addTo(mapa);
    const marcadores = {};

    const icono = (r) => L.divIcon({
      className: '',
      html: `<div class="pin-eco${r.mio ? ' pin-mio' : ''}" style="background:${EcoReportes.ESTADOS[r.estado].color}"></div>`,
      iconSize: r.mio ? [26, 26] : [22, 22],
      iconAnchor: r.mio ? [13, 26] : [11, 22],
      popupAnchor: [0, -24]
    });

    const dibujar = (primeraVez = false) => {
      const lista = todos();
      const f = leerFiltros();
      const visibles = aplicarFiltros(lista, f);
      capa.clearLayers();
      Object.keys(marcadores).forEach((k) => delete marcadores[k]);

      visibles.forEach((r) => {
        const m = L.marker([r.lat, r.lng], {
          icon: icono(r),
          title: `${r.direccion} — ${EcoReportes.ESTADOS[r.estado].texto}`,
          keyboard: true
        }).bindPopup(fichaHTML(r));
        m.addTo(capa);
        marcadores[r.id] = m;
      });

      actualizarResumen(visibles, lista.length);
      actualizarBotonFiltros(f);

      if (primeraVez && idDestacado && marcadores[idDestacado]) {
        mapa.setView(marcadores[idDestacado].getLatLng(), 16);
        marcadores[idDestacado].openPopup();
      } else if (visibles.length) {
        mapa.fitBounds(L.latLngBounds(visibles.map((r) => [r.lat, r.lng])), { padding: [50, 50], maxZoom: 16 });
      }
    };

    dibujar(true);
    setTimeout(() => mapa.invalidateSize(), 200);
    window.addEventListener('resize', () => mapa.invalidateSize());

    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
      dibujar();
      cerrarModal();
    });
  };

  // ==========================================
  // 4. MODO SIMULACIÓN (sin internet)
  // ==========================================
  const iniciarSimulacion = () => {
    placeholder.querySelector('p').textContent = '[ Mapa sin conexión ]';
    placeholder.querySelector('span').textContent = 'Se muestran los puntos en su posición aproximada.';

    const mostrarFicha = (r) => {
      infoReporte.innerHTML = `<button type="button" class="btn-close" aria-label="Cerrar">&times;</button>${fichaHTML(r)}`;
      infoReporte.hidden = false;
      infoReporte.querySelector('.btn-close').addEventListener('click', () => { infoReporte.hidden = true; });
    };

    const dibujar = (primeraVez = false) => {
      contenedor.querySelectorAll('.map-marker').forEach((m) => m.remove());
      infoReporte.hidden = true;

      const lista = todos();
      const f = leerFiltros();
      const visibles = aplicarFiltros(lista, f);
      actualizarResumen(visibles, lista.length);
      actualizarBotonFiltros(f);
      if (!visibles.length) return;

      // Proyección simple de lat/lng al área del contenedor
      const lats = lista.map((r) => r.lat);
      const lngs = lista.map((r) => r.lng);
      const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
      const rango = (a, b) => (b - a) || 0.01;

      visibles.forEach((r) => {
        const top = 15 + ((maxLat - r.lat) / rango(minLat, maxLat)) * 65;
        const left = 10 + ((r.lng - minLng) / rango(minLng, maxLng)) * 80;
        const marcador = document.createElement('button');
        marcador.type = 'button';
        marcador.className = 'map-marker' + (r.mio ? ' mio' : '');
        marcador.style.cssText = `top:${top}%;left:${left}%;background:${EcoReportes.ESTADOS[r.estado].color};border:0;`;
        marcador.setAttribute('aria-label', `${r.direccion}: ${EcoReportes.ESTADOS[r.estado].texto}`);
        marcador.addEventListener('click', () => mostrarFicha(r));
        contenedor.appendChild(marcador);
        if (primeraVez && r.id === idDestacado) mostrarFicha(r);
      });
    };

    dibujar(true);
    document.getElementById('btn-aplicar-filtros').addEventListener('click', () => {
      dibujar();
      cerrarModal();
    });
  };

  if (typeof window.L !== 'undefined') {
    try {
      iniciarLeaflet();
    } catch (err) {
      console.warn('No se pudo iniciar el mapa real, se usa la simulación', err);
      divLeaflet.hidden = true;
      placeholder.hidden = false;
      iniciarSimulacion();
    }
  } else {
    iniciarSimulacion();
  }
});

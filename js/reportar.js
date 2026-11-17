// js/reportar.js
// Flujo de reporte del vecino en menos de un minuto:
// HU-007 foto · HU-008 GPS automático · HU-009 categoría · HU-010 envío rápido · HU-011 ajuste manual del pin

document.addEventListener('DOMContentLoaded', () => {
  const inicioFlujo = Date.now(); // para medir cuánto tarda el vecino (meta: < 1 minuto)

  // ==========================================
  // 1. ELEMENTOS DEL DOM
  // ==========================================
  const form = document.getElementById('form-reporte');
  const areaFoto = document.getElementById('area-foto');
  const inputFoto = document.getElementById('input-foto');
  const fotoPreview = document.getElementById('foto-preview');
  const fotoPlaceholder = document.getElementById('foto-placeholder');
  const fotoCambiar = document.getElementById('foto-cambiar');

  const inputUbicacion = document.getElementById('ubicacion');
  const campoUbicacion = document.getElementById('campo-ubicacion');
  const estadoUbicacion = document.getElementById('estado-ubicacion');
  const btnAjustar = document.getElementById('btn-ajustar-gps');

  const selectCategoria = document.getElementById('categoria');
  const btnCambiarCategoria = document.getElementById('btn-cambiar-categoria');
  const selectMagnitud = document.getElementById('magnitud');

  const alerta = document.getElementById('alerta-reporte');
  const btnEnviar = document.getElementById('btn-enviar-reporte');

  const modalUbicacion = document.getElementById('modal-ubicacion');
  const contMapaAjuste = document.getElementById('mapa-ajuste');
  const fallbackAjuste = document.getElementById('mapa-ajuste-fallback');
  const inputDireccionManual = document.getElementById('direccion-manual');
  const textoCoordenadas = document.getElementById('coordenadas-ajuste');

  const modalConfirmacion = document.getElementById('modal-confirmacion');

  // ==========================================
  // 2. ESTADO DEL REPORTE
  // ==========================================
  const reporte = {
    foto: null,        // dataURL comprimido
    lat: null,
    lng: null,
    direccion: '',
    precision: null,   // metros
    ubicacionManual: false
  };

  // ==========================================
  // 3. UTILIDADES
  // ==========================================
  const grupoDe = (el) => el.closest('.form-group-app');

  const marcarError = (el, mensaje) => {
    const grupo = grupoDe(el);
    grupo.classList.add('has-error');
    grupo.querySelector('.error-app').textContent = mensaje;
  };

  const limpiarError = (el) => {
    const grupo = grupoDe(el);
    grupo.classList.remove('has-error');
    grupo.querySelector('.error-app').textContent = '';
  };

  const ponerEstadoUbicacion = (texto, tipo = '') => {
    estadoUbicacion.textContent = texto;
    estadoUbicacion.className = 'ayuda-campo' + (tipo ? ' ' + tipo : '');
  };

  const textoCoords = (lat, lng) => `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;

  const abrirModal = (modal) => {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  };

  const cerrarModal = (modal) => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  const mapaDisponible = () => typeof window.L !== 'undefined';

  // Convierte coordenadas en una dirección legible (OpenStreetMap / Nominatim).
  // Si no hay internet o falla, se muestran las coordenadas.
  const obtenerDireccion = async (lat, lng) => {
    const controlador = new AbortController();
    const espera = setTimeout(() => controlador.abort(), 5000);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=es`;
      const respuesta = await fetch(url, { signal: controlador.signal });
      if (!respuesta.ok) throw new Error('Sin respuesta');
      const datos = await respuesta.json();
      const a = datos.address || {};
      const calle = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
      const zona = a.suburb || a.neighbourhood || a.city_district || a.town || a.city;
      const texto = [calle, zona].filter(Boolean).join(', ');
      return texto || textoCoords(lat, lng);
    } catch (e) {
      return textoCoords(lat, lng);
    } finally {
      clearTimeout(espera);
    }
  };

  const fijarUbicacion = async (lat, lng, { manual = false, precision = null } = {}) => {
    reporte.lat = lat;
    reporte.lng = lng;
    reporte.precision = precision;
    reporte.ubicacionManual = manual;
    inputUbicacion.value = textoCoords(lat, lng);
    limpiarError(inputUbicacion);
    ponerEstadoUbicacion(
      manual ? 'Ubicación ajustada por ti en el mapa ✔'
             : `Ubicación detectada por GPS ✔${precision ? ` (precisión ±${Math.round(precision)} m)` : ''}`,
      'ok'
    );
    const direccion = await obtenerDireccion(lat, lng);
    // Evita pisar una ubicación más nueva si el usuario la cambió mientras tanto
    if (reporte.lat === lat && reporte.lng === lng) {
      reporte.direccion = direccion;
      inputUbicacion.value = direccion;
    }
  };

  // Alternativa manual cuando falla la automatización (diseño inclusivo):
  // el vecino puede escribir la dirección o una referencia.
  const habilitarDireccionEscrita = (motivo) => {
    inputUbicacion.readOnly = false;
    campoUbicacion.classList.add('editable');
    inputUbicacion.placeholder = 'Escribe la dirección o una referencia';
    ponerEstadoUbicacion(`${motivo} Escribe la dirección o toca "Ajustar" para marcarla en el mapa.`, 'aviso');
  };

  // ==========================================
  // 4. HU-007: CAPTURA DE FOTO
  // ==========================================
  const comprimirImagen = (archivo, maxLado = 900, calidad = 0.72) =>
    new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
      lector.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Formato de imagen no válido'));
        img.onload = () => {
          const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', calidad));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });

  const abrirSelectorFoto = () => inputFoto.click();

  areaFoto.addEventListener('click', abrirSelectorFoto);
  areaFoto.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirSelectorFoto();
    }
  });

  inputFoto.addEventListener('change', async () => {
    const archivo = inputFoto.files[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      marcarError(areaFoto, 'El archivo debe ser una imagen (JPG o PNG).');
      return;
    }
    if (archivo.size > 15 * 1024 * 1024) {
      marcarError(areaFoto, 'La imagen pesa más de 15 MB. Prueba con otra foto.');
      return;
    }

    try {
      reporte.foto = await comprimirImagen(archivo);
      fotoPreview.src = reporte.foto;
      fotoPreview.hidden = false;
      fotoCambiar.hidden = false;
      fotoPlaceholder.hidden = true;
      areaFoto.classList.add('con-foto');
      areaFoto.setAttribute('aria-label', 'Foto adjuntada. Toca para cambiarla');
      limpiarError(areaFoto);
    } catch (e) {
      marcarError(areaFoto, 'No pudimos cargar la foto. Intenta tomarla de nuevo.');
    } finally {
      inputFoto.value = ''; // permite volver a elegir la misma foto
    }
  });

  // ==========================================
  // 5. HU-008: UBICACIÓN AUTOMÁTICA POR GPS
  // ==========================================
  const detectarGPS = () =>
    new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Tu dispositivo no permite obtener la ubicación.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => {
          const mensajes = {
            1: 'No diste permiso para usar tu ubicación.',
            2: 'No pudimos obtener tu ubicación.',
            3: 'El GPS tardó demasiado en responder.'
          };
          reject(new Error(mensajes[err.code] || 'No pudimos obtener tu ubicación.'));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });

  const iniciarGPS = async () => {
    ponerEstadoUbicacion('Buscando señal GPS…');
    try {
      const pos = await detectarGPS();
      await fijarUbicacion(pos.coords.latitude, pos.coords.longitude, { precision: pos.coords.accuracy });
    } catch (e) {
      if (reporte.lat === null && !inputUbicacion.value.trim()) {
        inputUbicacion.value = '';
        habilitarDireccionEscrita(e.message);
      }
    }
  };

  iniciarGPS();

  inputUbicacion.addEventListener('input', () => {
    // Si escribe a mano, se guarda como dirección escrita (sin coordenadas exactas)
    reporte.direccion = inputUbicacion.value.trim();
    reporte.ubicacionManual = true;
    if (reporte.direccion) limpiarError(inputUbicacion);
  });

  // ==========================================
  // 6. HU-011: AJUSTE MANUAL DEL PIN EN EL MAPA
  // ==========================================
  let mapaAjuste = null;
  let pinAjuste = null;
  let posicionTemporal = null;

  const iconoPin = () =>
    L.divIcon({
      className: '',
      html: '<div class="pin-eco pin-mio" style="background:#1B6B4A"></div>',
      iconSize: [26, 26],
      iconAnchor: [13, 26]
    });

  const moverPinTemporal = (lat, lng) => {
    posicionTemporal = { lat, lng };
    if (pinAjuste) pinAjuste.setLatLng([lat, lng]);
    textoCoordenadas.textContent = `Punto seleccionado: ${textoCoords(lat, lng)}`;
  };

  const prepararMapaAjuste = () => {
    const inicio = reporte.lat !== null
      ? { lat: reporte.lat, lng: reporte.lng }
      : EcoReportes.CENTRO_LIMA;

    if (!mapaDisponible()) {
      contMapaAjuste.hidden = true;
      document.getElementById('ayuda-mapa-ajuste').hidden = true;
      fallbackAjuste.hidden = false;
      inputDireccionManual.value = reporte.direccion || '';
      textoCoordenadas.textContent = '';
      document.getElementById('btn-usar-gps').hidden = true;
      return;
    }

    if (!mapaAjuste) {
      mapaAjuste = L.map(contMapaAjuste, { zoomControl: true }).setView([inicio.lat, inicio.lng], 17);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapaAjuste);
      pinAjuste = L.marker([inicio.lat, inicio.lng], { draggable: true, icon: iconoPin(), keyboard: true, title: 'Arrastra el pin' }).addTo(mapaAjuste);
      pinAjuste.on('dragend', () => {
        const p = pinAjuste.getLatLng();
        moverPinTemporal(p.lat, p.lng);
      });
      mapaAjuste.on('click', (e) => moverPinTemporal(e.latlng.lat, e.latlng.lng));
    } else {
      mapaAjuste.setView([inicio.lat, inicio.lng], 17);
    }
    moverPinTemporal(inicio.lat, inicio.lng);
    // El mapa se creó dentro de un modal oculto: recalcula su tamaño al mostrarse
    setTimeout(() => mapaAjuste.invalidateSize(), 320);
  };

  btnAjustar.addEventListener('click', () => {
    abrirModal(modalUbicacion);
    prepararMapaAjuste();
  });

  document.getElementById('btn-cerrar-ubicacion').addEventListener('click', () => cerrarModal(modalUbicacion));

  document.getElementById('btn-usar-gps').addEventListener('click', async () => {
    textoCoordenadas.textContent = 'Buscando tu ubicación…';
    try {
      const pos = await detectarGPS();
      moverPinTemporal(pos.coords.latitude, pos.coords.longitude);
      mapaAjuste.setView([pos.coords.latitude, pos.coords.longitude], 17);
    } catch (e) {
      textoCoordenadas.textContent = `${e.message} Marca el punto tocando el mapa.`;
    }
  });

  document.getElementById('btn-confirmar-ubicacion').addEventListener('click', () => {
    if (mapaDisponible() && posicionTemporal) {
      fijarUbicacion(posicionTemporal.lat, posicionTemporal.lng, { manual: true });
    } else {
      const texto = inputDireccionManual.value.trim();
      if (!texto) {
        inputDireccionManual.focus();
        return;
      }
      inputUbicacion.value = texto;
      reporte.direccion = texto;
      reporte.ubicacionManual = true;
      limpiarError(inputUbicacion);
      ponerEstadoUbicacion('Dirección escrita por ti ✔', 'ok');
    }
    cerrarModal(modalUbicacion);
    btnAjustar.focus();
  });

  // ==========================================
  // 7. HU-009: CATEGORÍA DEL RESIDUO
  // ==========================================
  btnCambiarCategoria.addEventListener('click', () => {
    selectCategoria.focus();
    if (typeof selectCategoria.showPicker === 'function') {
      try { selectCategoria.showPicker(); } catch (e) { /* algunos navegadores no lo permiten */ }
    }
  });

  selectCategoria.addEventListener('change', () => limpiarError(selectCategoria));

  // ==========================================
  // 8. HU-010: VALIDACIÓN Y ENVÍO RÁPIDO
  // ==========================================
  const validar = () => {
    const errores = [];
    if (!reporte.foto) {
      marcarError(areaFoto, 'Agrega una foto del punto de basura.');
      errores.push(areaFoto);
    }
    const hayUbicacion = reporte.lat !== null || inputUbicacion.value.trim() !== '';
    if (!hayUbicacion) {
      marcarError(inputUbicacion, 'Indica dónde está la basura: activa el GPS, toca "Ajustar" o escribe la dirección.');
      errores.push(inputUbicacion.readOnly ? btnAjustar : inputUbicacion);
    }
    if (!selectCategoria.value) {
      marcarError(selectCategoria, 'Elige el tipo de residuo.');
      errores.push(selectCategoria);
    }
    return errores;
  };

  const resumenHTML = (r) => {
    const e = EcoReportes.escapar;
    return `
      <span><strong>N.° de reporte:</strong> ${e(r.id)}</span>
      <span><strong>Lugar:</strong> ${e(r.direccion)}</span>
      <span><strong>Residuo:</strong> ${e(EcoReportes.CATEGORIAS[r.categoria])} · Urgencia ${e(EcoReportes.URGENCIAS[r.urgencia])}</span>
      <span><strong>Estado:</strong> <span class="etiqueta-estado estado-recibido">Recibido</span></span>`;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    alerta.hidden = true;

    const errores = validar();
    if (errores.length) {
      alerta.textContent = errores.length === 1
        ? 'Falta 1 dato para enviar tu reporte.'
        : `Faltan ${errores.length} datos para enviar tu reporte.`;
      alerta.hidden = false;
      errores[0].focus();
      return;
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando…';

    const datos = {
      foto: reporte.foto,
      lat: reporte.lat,
      lng: reporte.lng,
      direccion: reporte.direccion || inputUbicacion.value.trim(),
      ubicacionManual: reporte.ubicacionManual,
      categoria: selectCategoria.value,
      urgencia: form.querySelector('input[name="urgencia"]:checked').value,
      magnitud: selectMagnitud.value
    };

    // Pequeña pausa para simular el envío al servidor
    setTimeout(() => {
      const { reporte: guardado, sinFoto } = EcoReportes.guardar(datos);
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar reporte';

      if (!guardado) {
        alerta.textContent = 'No se pudo guardar el reporte. Inténtalo de nuevo.';
        alerta.hidden = false;
        return;
      }

      const segundos = Math.max(1, Math.round((Date.now() - inicioFlujo) / 1000));
      const tiempo = segundos < 60 ? `${segundos} segundos` : `${Math.floor(segundos / 60)} min ${segundos % 60} s`;
      document.getElementById('texto-confirmacion').textContent =
        `La municipalidad ya recibió tu reporte. Lo completaste en ${tiempo}.` +
        (sinFoto ? ' (La foto no se pudo guardar en este dispositivo.)' : '');
      document.getElementById('resumen-confirmacion').innerHTML = resumenHTML(guardado);
      document.getElementById('btn-ir-mapa').href = `mapa.html?id=${encodeURIComponent(guardado.id)}`;
      abrirModal(modalConfirmacion);
      document.getElementById('btn-ir-mis-reportes').focus();
    }, 600);
  });

  document.getElementById('btn-nuevo-reporte').addEventListener('click', () => {
    window.location.reload();
  });

  // Cerrar modales con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal(modalUbicacion);
  });
});

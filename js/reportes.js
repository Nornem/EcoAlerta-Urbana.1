// js/reportes.js
// Datos compartidos de EcoAlerta Urbana (simulación sin servidor).
// Los reportes se guardan en el localStorage del navegador, así el reporte
// que el vecino envía en "Reportar" aparece luego en "Mis reportes" y en el "Mapa".

const EcoReportes = (() => {
  const STORAGE_KEY = 'ecoalerta_reportes_v1';

  // Categorías de residuo (HU-009)
  const CATEGORIAS = {
    organico: 'Residuos orgánicos',
    plastico: 'Plástico',
    escombros: 'Escombros / Obra',
    toxico: 'Residuos tóxicos',
    domesticos: 'Residuos domésticos (mixtos)'
  };

  // Estados del seguimiento (Guía de estilos: Recibido / En atención / Resuelto)
  const ESTADOS = {
    recibido: { texto: 'Recibido', clase: 'estado-recibido', color: '#F2A900' },
    atencion: { texto: 'En atención', clase: 'estado-atencion', color: '#1F5FA8' },
    resuelto: { texto: 'Resuelto', clase: 'estado-resuelto', color: '#1B6B4A' }
  };
  const ORDEN_ESTADOS = ['recibido', 'atencion', 'resuelto'];

  const URGENCIAS = { baja: 'Baja', media: 'Media', alta: 'Alta' };
  const MAGNITUDES = { bolsa: 'Bolsa', contenedor: 'Contenedor', camion: 'Camión' };

  // Centro de referencia: Lima
  const CENTRO_LIMA = { lat: -12.0464, lng: -77.0428 };

  const haceDias = (dias, horas = 0) =>
    new Date(Date.now() - (dias * 24 + horas) * 3600 * 1000).toISOString();

  // Reportes de ejemplo para que el mapa y la lista no empiecen vacíos.
  // "mio: true" = reportes del vecino que está usando la app.
  const reportesEjemplo = () => [
    {
      id: 'EA-0101', mio: true, estado: 'atencion', categoria: 'escombros', urgencia: 'alta', magnitud: 'camion',
      direccion: 'Jr. Puno cdra. 2, Cercado de Lima', lat: -12.0497, lng: -77.0291, fecha: haceDias(1, 3),
      foto: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=70'
    },
    {
      id: 'EA-0098', mio: true, estado: 'resuelto', categoria: 'organico', urgencia: 'media', magnitud: 'contenedor',
      direccion: 'Parque Central, San Juan de Lurigancho', lat: -11.9985, lng: -77.0040, fecha: haceDias(6),
      foto: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=70'
    },
    {
      id: 'EA-0094', mio: false, estado: 'recibido', categoria: 'toxico', urgencia: 'alta', magnitud: 'bolsa',
      direccion: 'Av. Naranjal cdra. 4, Los Olivos', lat: -11.9752, lng: -77.0702, fecha: haceDias(0, 5), foto: null
    },
    {
      id: 'EA-0090', mio: false, estado: 'atencion', categoria: 'organico', urgencia: 'alta', magnitud: 'contenedor',
      direccion: 'Exteriores del mercado, Villa María del Triunfo', lat: -12.1631, lng: -76.9497, fecha: haceDias(2), foto: null
    },
    {
      id: 'EA-0087', mio: false, estado: 'resuelto', categoria: 'escombros', urgencia: 'media', magnitud: 'camion',
      direccion: 'Av. Universitaria cdra. 52, Los Olivos', lat: -11.9921, lng: -77.0829, fecha: haceDias(4), foto: null
    },
    {
      id: 'EA-0085', mio: false, estado: 'recibido', categoria: 'domesticos', urgencia: 'media', magnitud: 'bolsa',
      direccion: 'Av. Abancay cdra. 3, Cercado de Lima', lat: -12.0469, lng: -77.0266, fecha: haceDias(1), foto: null
    },
    {
      id: 'EA-0081', mio: false, estado: 'atencion', categoria: 'plastico', urgencia: 'baja', magnitud: 'bolsa',
      direccion: 'Malecón Cisneros, Miraflores', lat: -12.1265, lng: -77.0380, fecha: haceDias(3), foto: null
    },
    {
      id: 'EA-0079', mio: false, estado: 'recibido', categoria: 'plastico', urgencia: 'baja', magnitud: 'contenedor',
      direccion: 'Av. Próceres de la Independencia cdra. 15, SJL', lat: -11.9876, lng: -77.0091, fecha: haceDias(0, 9), foto: null
    }
  ];

  const leer = () => {
    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      if (datos) return JSON.parse(datos);
    } catch (e) {
      console.warn('No se pudieron leer los reportes guardados', e);
    }
    const ejemplo = reportesEjemplo();
    escribir(ejemplo);
    return ejemplo;
  };

  const escribir = (lista) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      return true;
    } catch (e) {
      console.warn('No se pudo guardar en localStorage', e);
      return false;
    }
  };

  const obtenerTodos = () =>
    leer().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const obtenerMios = () => obtenerTodos().filter((r) => r.mio);

  const buscar = (id) => leer().find((r) => r.id === id);

  const siguienteId = () => {
    const numeros = leer().map((r) => parseInt(String(r.id).replace(/\D/g, ''), 10) || 0);
    const siguiente = Math.max(100, ...numeros) + 1;
    return 'EA-' + String(siguiente).padStart(4, '0');
  };

  // Guarda un reporte nuevo. Si la foto no entra en el almacenamiento,
  // se guarda el reporte sin foto para no perder la denuncia.
  const guardar = (reporte) => {
    const lista = leer();
    const nuevo = { ...reporte, id: siguienteId(), mio: true, estado: 'recibido', fecha: new Date().toISOString() };
    lista.push(nuevo);
    if (escribir(lista)) return { reporte: nuevo, sinFoto: false };
    lista[lista.length - 1] = { ...nuevo, foto: null };
    if (escribir(lista)) return { reporte: lista[lista.length - 1], sinFoto: true };
    return { reporte: null, sinFoto: false };
  };

  const formatearFecha = (iso) => {
    const fecha = new Date(iso);
    const minutos = Math.round((Date.now() - fecha) / 60000);
    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Escapa texto antes de insertarlo como HTML
  const escapar = (texto) =>
    String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return {
    CATEGORIAS, ESTADOS, ORDEN_ESTADOS, URGENCIAS, MAGNITUDES, CENTRO_LIMA,
    obtenerTodos, obtenerMios, buscar, guardar, formatearFecha, escapar
  };
})();

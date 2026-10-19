/**
 * Registro QR · Señor de los Milagros 2026 — Backend (Google Apps Script, vinculado al Sheet)
 * Equipo Gestión Comercial y Micromedición (EGCM) · SEDAPAL
 * Desarrollado por Kilder Orlando Leyva Herrera – Ficha 24881 · Grupo Gestión de Servicios (GGSE) – ETIC
 * Versión 1.3.0 · 2026-10-19 (es DESAYUNO, no almuerzo; los nombres de columnas/claves conservan 'ALMUERZO' por compatibilidad con la hoja ya creada)
 *
 * Trazabilidad: ver docs/spec.md (RF-xx) y docs/diseno.md §6 (contrato de la API).
 *
 * Despliegue: Implementar → Nueva implementación → Aplicación web
 *   Ejecutar como: Yo · Acceso: Cualquier persona
 * Antes del primer uso: ejecutar setupInicial() una vez desde el editor (crea pestañas y CONFIG).
 *
 * Regla del evento (RF-15): solo tiene derecho a desayuno quien se registra ANTES del corte.
 * El corte lo fija el organizador desde el panel («Cerrar desayuno ahora») o por hora en CONFIG.
 * Quien se registra después queda como asistente sin desayuno (DERECHO_ALMUERZO = NO).
 */

// ============================================================================
// CONSTANTES
// ============================================================================
const VERSION = '1.3.0';
const TZ = 'America/Lima';
const FMT_FECHA = 'dd/MM/yyyy HH:mm:ss';
const PREFIJO_ID = 'SM26-';
const ALFABETO_ID = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para dictarlo sin confusión
const VENTANA_REPETIDO_SEG = 120; // reintento del mismo validador dentro de 2 min = misma entrega

const HOJAS = {
  ASISTENTES: ['ID', 'DNI', 'NOMBRES', 'TIPO', 'FICHA', 'AREA', 'FECHA_REGISTRO', 'DERECHO_ALMUERZO',
    'ALMUERZO_SOLICITADO', 'FECHA_SOLICITUD', 'ALMUERZO_ENTREGADO', 'FECHA_ENTREGA',
    'ENTREGADO_POR', 'ORIGEN'],
  PADRON: ['FICHA', 'DNI', 'NOMBRES', 'AREA'],
  CONFIG: ['CLAVE', 'VALOR'],
  LOG: ['FECHA', 'ACCION', 'ID', 'DNI', 'ACTOR', 'RESULTADO']
};

const CONFIG_DEFAULT = [
  ['EVENTO_NOMBRE', 'Señor de los Milagros 2026'],
  ['EVENTO_FECHA', 'Martes 20 de octubre de 2026'],
  ['EVENTO_LUGAR', ''],
  ['MENSAJE_BIENVENIDA', 'Bienvenido. Regístrate con tu ficha (o tu DNI si eres invitado) para confirmar tu asistencia y tu desayuno.'],
  ['PIN_VALIDADOR', '2026'],
  ['REGISTRO_ABIERTO', 'SI'],
  ['SOLICITUD_ABIERTA', 'SI'],
  ['CORTE_ALMUERZO', ''],   // vacío = sin corte · 'dd/MM/yyyy HH:mm' = desde esa hora no hay derecho a desayuno
  ['VERSION_DATOS', '2']
];

// Claves que el organizador puede cambiar desde el panel (con PIN)
const CONFIG_EDITABLE = ['REGISTRO_ABIERTO', 'SOLICITUD_ABIERTA', 'CORTE_ALMUERZO'];

// ============================================================================
// SETUP (ejecutar una sola vez desde el editor; es idempotente)
// ============================================================================
function setupInicial() {
  const ss = ss_();
  Object.keys(HOJAS).forEach(function (nombre) {
    const hoja = hoja_(nombre);
    // Todo como texto: conserva ceros a la izquierda en DNI/FICHA y evita que Sheets
    // convierta las fechas escritas como texto (RNF-09).
    hoja.getRange(1, 1, hoja.getMaxRows(), HOJAS[nombre].length).setNumberFormat('@');
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight('bold');
  });
  // CONFIG: agrega las claves que falten sin pisar las existentes
  const cfg = hoja_('CONFIG');
  const existentes = {};
  leerTabla_('CONFIG').forEach(function (r) { existentes[String(r.CLAVE).trim().toUpperCase()] = true; });
  CONFIG_DEFAULT.forEach(function (par) { if (!existentes[par[0]]) anexarFila_(cfg, [par[0], par[1]]); });
  // Repara valores que Sheets haya convertido (p. ej. la fecha del evento) reescribiéndolos como texto
  leerTabla_('CONFIG').forEach(function (r) { cfg.getRange(r._fila, 2).setNumberFormat('@').setValue(comoTexto_(r.VALOR)); });
  ss.setActiveSheet(hoja_('ASISTENTES'));
  Logger.log('setupInicial OK · hojas: ' + Object.keys(HOJAS).join(', ') + ' · versión ' + VERSION);
}

// ============================================================================
// ENTRADAS HTTP
// ============================================================================
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    switch (String(p.action || '')) {
      case 'ping': return responder_({ ok: true, version: VERSION, hora: ahora_() });
      case 'config': return responder_({ ok: true, config: configPublica_() });
      case 'buscar': return responder_(buscar_(p));
      case 'ticket': return responder_(ticket_(p));
      case 'pin': return responder_(conLock_(function () { return pinLogin_(p); }));
      case 'stats': return responder_(stats_(p));
      case 'lista': return responder_(lista_(p));
      default: return responder_(error_('ACCION_DESCONOCIDA', 'Acción no reconocida'));
    }
  } catch (err) {
    return responder_(error_('ERROR_SERVIDOR', String(err && err.message || err)));
  }
}

function doPost(e) {
  let p = {};
  try {
    if (e && e.postData && e.postData.contents) p = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder_(error_('JSON_INVALIDO', 'Cuerpo de la petición inválido'));
  }
  if (e && e.parameter) Object.keys(e.parameter).forEach(function (k) { if (p[k] === undefined) p[k] = e.parameter[k]; });
  try {
    switch (String(p.action || '')) {
      case 'registrar': return responder_(conLock_(function () { return registrar_(p); }));
      case 'solicitar': return responder_(conLock_(function () { return solicitar_(p); }));
      case 'entregar': return responder_(conLock_(function () { return entregar_(p); }));
      case 'config_set': return responder_(conLock_(function () { return configSet_(p); }));
      case 'rechazo': return responder_(conLock_(function () { return rechazo_(p); }));
      default: return responder_(error_('ACCION_DESCONOCIDA', 'Acción no reconocida'));
    }
  } catch (err) {
    return responder_(error_('ERROR_SERVIDOR', String(err && err.message || err)));
  }
}

// ============================================================================
// CASOS DE USO
// ============================================================================

/** RF-02 / RF-03: ¿está registrado? ¿está en el padrón? */
function buscar_(p) {
  const dni = normalizarDni_(p.dni);
  const ficha = normalizarFicha_(p.ficha);
  if (!dni && !ficha) return error_('DATOS_INVALIDOS', 'Indica DNI o ficha');

  const res = { ok: true, registrado: false, id: '', padron: null };

  const asistentes = leerTabla_('ASISTENTES');
  const fila = (dni && buscarPorDni_(asistentes, dni)) || (ficha && buscarPorFicha_(asistentes, ficha)) || null;
  if (fila) { res.registrado = true; res.id = fila.ID; }
  const padron = leerTabla_('PADRON');
  const enPadron = padron.find(function (r) {
    return (dni && normalizarDni_(r.DNI) === dni) || (ficha && normalizarFicha_(r.FICHA) === ficha);
  });
  if (enPadron) {
    res.padron = {
      dni: normalizarDni_(enPadron.DNI),
      ficha: String(enPadron.FICHA || '').trim(),
      nombres: normalizarTexto_(enPadron.NOMBRES),
      area: String(enPadron.AREA || '').trim()
    };
  }
  return res;
}

/** RF-04 / RF-06: ticket por ID (secreto) o por DNI (recuperación) */
function ticket_(p) {
  const filas = leerTabla_('ASISTENTES');
  let fila = null;
  if (p.id) fila = buscarPorId_(filas, p.id);
  else if (p.dni) fila = buscarPorDni_(filas, normalizarDni_(p.dni));
  else if (p.ficha) fila = buscarPorFicha_(filas, normalizarFicha_(p.ficha));
  else if (p.doc) { // «Recuperar mi ticket»: ficha (trabajador) o DNI (invitado)
    const doc = String(p.doc).trim();
    fila = buscarPorDni_(filas, normalizarDni_(doc)) || buscarPorFicha_(filas, normalizarFicha_(doc));
  }
  if (!fila) return error_('NO_ENCONTRADO', 'No existe un registro con ese dato');
  return { ok: true, ticket: ticketDesdeFila_(fila) };
}

/** RF-01 / RF-03 / RF-05 / RF-11 / RF-12 / RF-15: registro idempotente por DNI (se ejecuta bajo lock) */
function registrar_(p) {
  const cfg = config_();
  const dni = normalizarDni_(p.dni);
  const nombres = normalizarTexto_(p.nombres);
  const tipo = String(p.tipo || '').toUpperCase() === 'TRABAJADOR' ? 'TRABAJADOR' : 'INVITADO';
  const ficha = tipo === 'TRABAJADOR' ? normalizarFicha_(p.ficha) : '';
  const area = normalizarTexto_(p.area).slice(0, 60);
  const origen = String(p.origen || '').toUpperCase() === 'KIOSCO' ? 'KIOSCO' : 'CELULAR';
  const actor = origen === 'KIOSCO' ? 'KIOSCO' : 'ASISTENTE';

  if (tipo === 'TRABAJADOR') {
    if (!/^\d{3,6}$/.test(ficha)) return error_('DATOS_INVALIDOS', 'Ficha inválida (3 a 6 dígitos)');
    if (dni && !/^[A-Z0-9]{8,12}$/.test(dni)) return error_('DATOS_INVALIDOS', 'DNI inválido (8 dígitos)');
  } else if (!/^[A-Z0-9]{8,12}$/.test(dni)) {
    return error_('DATOS_INVALIDOS', 'DNI inválido (8 dígitos)');
  }

  const hoja = hoja_('ASISTENTES');
  const filas = leerTabla_('ASISTENTES');

  // RF-03: quien ya está registrado (por ficha si es trabajador, por DNI si es invitado) recupera su ticket,
  // aunque el resto de datos venga incompleto o el registro esté cerrado
  const existente = (tipo === 'TRABAJADOR' ? buscarPorFicha_(filas, ficha) : null) || (dni ? buscarPorDni_(filas, dni) : null);
  if (existente) {
    log_('REGISTRO_DUPLICADO', existente.ID, dni || ('F' + ficha), actor, 'Devuelve ticket existente');
    return { ok: true, duplicado: true, ticket: ticketDesdeFila_(existente) };
  }

  if (nombres.length < 5) return error_('DATOS_INVALIDOS', 'Escribe nombres y apellidos completos');

  if (!esSi_(cfg.REGISTRO_ABIERTO)) {
    log_('REGISTRO', '', dni, actor, 'RECHAZADO: registro cerrado');
    return error_('REGISTRO_CERRADO', 'El registro está cerrado');
  }

  // RF-15: el derecho a desayuno se fija en el momento del registro
  const derecho = almuerzoVigente_(cfg) ? 'SI' : 'NO';
  const almuerzo = derecho === 'SI' && esSi_(p.almuerzo) ? 'SI' : 'NO';

  const id = generarId_(filas);
  const ahora = ahora_();
  const nueva = {
    ID: id, DNI: dni, NOMBRES: nombres, TIPO: tipo, FICHA: ficha, AREA: area,
    FECHA_REGISTRO: ahora, DERECHO_ALMUERZO: derecho,
    ALMUERZO_SOLICITADO: almuerzo, FECHA_SOLICITUD: almuerzo === 'SI' ? ahora : '',
    ALMUERZO_ENTREGADO: 'NO', FECHA_ENTREGA: '', ENTREGADO_POR: '', ORIGEN: origen
  };
  anexarFila_(hoja, HOJAS.ASISTENTES.map(function (c) { return nueva[c]; }));
  log_('REGISTRO', id, dni || ('F' + ficha), actor, 'OK ' + tipo + (derecho === 'NO' ? ' DESPUES_DEL_CIERRE sin desayuno' : (almuerzo === 'SI' ? ' + desayuno' : ' sin solicitar')));
  return { ok: true, duplicado: false, ticket: ticketDesdeFila_(nueva) };
}

/** RF-05: solicitar desayuno desde el ticket (bajo lock) */
function solicitar_(p) {
  const cfg = config_();
  const filas = leerTabla_('ASISTENTES');
  const fila = buscarPorId_(filas, p.id);
  if (!fila) return error_('NO_ENCONTRADO', 'Ticket no encontrado');
  if (fila.ALMUERZO_SOLICITADO === 'SI') return { ok: true, ticket: ticketDesdeFila_(fila) };
  if (fila.DERECHO_ALMUERZO === 'NO') {
    log_('SOLICITUD', fila.ID, fila.DNI, 'ASISTENTE', 'RECHAZADA: registrado después del cierre');
    return conTicket_(error_('SIN_DERECHO', 'El registro de desayunos ya se cerró'), fila);
  }
  if (!esSi_(cfg.SOLICITUD_ABIERTA)) {
    log_('SOLICITUD', fila.ID, fila.DNI, 'ASISTENTE', 'RECHAZADA: solicitud cerrada');
    return error_('SOLICITUD_CERRADA', 'La solicitud de desayunos está cerrada');
  }
  const ahora = ahora_();
  escribir_('ASISTENTES', fila._fila, { ALMUERZO_SOLICITADO: 'SI', FECHA_SOLICITUD: ahora });
  fila.ALMUERZO_SOLICITADO = 'SI'; fila.FECHA_SOLICITUD = ahora;
  log_('SOLICITUD', fila.ID, fila.DNI, 'ASISTENTE', 'OK');
  return { ok: true, ticket: ticketDesdeFila_(fila) };
}

/** RF-06 / RF-07 / RF-15: entregar desayuno (bajo lock, con PIN) */
function entregar_(p) {
  const actor = normalizarTexto_(p.actor).slice(0, 40) || 'VALIDADOR';
  if (!verificarPin_(p.pin)) {
    log_('PIN_INVALIDO', String(p.id || ''), '', actor, 'entregar');
    return error_('PIN_INVALIDO', 'PIN incorrecto');
  }
  const filas = leerTabla_('ASISTENTES');
  const fila = buscarPorId_(filas, p.id);
  if (!fila) {
    log_('ENTREGA_RECHAZADA', String(p.id || ''), '', actor, 'NO_ENCONTRADO');
    return error_('NO_ENCONTRADO', 'Ticket no encontrado');
  }
  if (fila.DERECHO_ALMUERZO === 'NO') {
    log_('ENTREGA_RECHAZADA', fila.ID, fila.DNI, actor, 'SIN_DERECHO registrado después del cierre ' + fila.FECHA_REGISTRO);
    return conTicket_(error_('SIN_DERECHO', 'Registrado después del cierre de desayunos'), fila);
  }
  if (fila.ALMUERZO_ENTREGADO === 'SI') {
    // Reintento del mismo validador segundos después (respuesta perdida): misma entrega, no un rechazo
    if (fila.ENTREGADO_POR === actor && segundosDesde_(fila.FECHA_ENTREGA) <= VENTANA_REPETIDO_SEG) {
      return { ok: true, repetido: true, ticket: ticketDesdeFila_(fila) };
    }
    log_('ENTREGA_RECHAZADA', fila.ID, fila.DNI, actor, 'YA_ENTREGADO ' + fila.FECHA_ENTREGA + ' por ' + fila.ENTREGADO_POR);
    return conTicket_(error_('YA_ENTREGADO', 'Este desayuno ya fue entregado'), fila);
  }
  const ahora = ahora_();
  const cambios = { ALMUERZO_ENTREGADO: 'SI', FECHA_ENTREGA: ahora, ENTREGADO_POR: actor };
  if (fila.ALMUERZO_SOLICITADO !== 'SI') { cambios.ALMUERZO_SOLICITADO = 'SI'; cambios.FECHA_SOLICITUD = ahora; }
  escribir_('ASISTENTES', fila._fila, cambios);
  Object.keys(cambios).forEach(function (k) { fila[k] = cambios[k]; });
  log_('ENTREGA', fila.ID, fila.DNI, actor, 'OK');
  return { ok: true, repetido: false, ticket: ticketDesdeFila_(fila) };
}

/** RF-13: el cliente reporta un rechazo visto en pantalla (ya entregado, sin derecho o no encontrado) */
function rechazo_(p) {
  const actor = normalizarTexto_(p.actor).slice(0, 40) || 'VALIDADOR';
  if (!verificarPin_(p.pin)) return error_('PIN_INVALIDO', 'PIN incorrecto');
  log_('ENTREGA_RECHAZADA', String(p.id || ''), String(p.dni || ''), actor, String(p.motivo || 'RECHAZO').slice(0, 80));
  return { ok: true };
}

/** RF-12 / RF-15: el organizador cambia una clave de CONFIG desde el panel (bajo lock, con PIN) */
function configSet_(p) {
  const actor = normalizarTexto_(p.actor).slice(0, 40) || 'ORGANIZADOR';
  if (!verificarPin_(p.pin)) { log_('PIN_INVALIDO', '', '', actor, 'config_set'); return error_('PIN_INVALIDO', 'PIN incorrecto'); }
  const clave = String(p.clave || '').trim().toUpperCase();
  if (CONFIG_EDITABLE.indexOf(clave) < 0) return error_('CLAVE_NO_EDITABLE', 'Esa clave no se edita desde el panel');
  let valor = String(p.valor === undefined || p.valor === null ? '' : p.valor).trim();
  if (clave === 'CORTE_ALMUERZO') {
    if (valor.toUpperCase() === 'AHORA') valor = Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm');
    else if (valor !== '' && !parsearFecha_(valor)) return error_('DATOS_INVALIDOS', 'Formato esperado: dd/MM/yyyy HH:mm');
  } else {
    valor = esSi_(valor) ? 'SI' : 'NO';
  }
  const hoja = hoja_('CONFIG');
  const fila = leerTabla_('CONFIG').find(function (r) { return String(r.CLAVE).trim().toUpperCase() === clave; });
  if (fila) hoja.getRange(fila._fila, 2).setNumberFormat('@').setValue(comoTexto_(valor)); else anexarFila_(hoja, [clave, valor]);
  log_('CONFIG', '', '', actor, clave + ' = ' + (valor === '' ? '(vacío)' : valor));
  return { ok: true, config: configPublica_() };
}

/** Ingreso del staff: verifica el PIN y deja rastro de los intentos fallidos */
function pinLogin_(p) {
  if (verificarPin_(p.pin)) return { ok: true };
  log_('PIN_INVALIDO', '', '', normalizarTexto_(p.actor).slice(0, 40) || '?', 'login');
  return error_('PIN_INVALIDO', 'PIN incorrecto');
}

/** RF-08 */
function stats_(p) {
  if (!verificarPin_(p.pin)) return error_('PIN_INVALIDO', 'PIN incorrecto');
  const filas = leerTabla_('ASISTENTES');
  const s = { total: filas.length, trabajadores: 0, invitados: 0, conDerecho: 0, tardios: 0,
    solicitados: 0, entregados: 0, pendientes: 0, kiosco: 0, hora: ahora_() };
  filas.forEach(function (f) {
    if (f.TIPO === 'TRABAJADOR') s.trabajadores++; else s.invitados++;
    if (f.DERECHO_ALMUERZO === 'NO') s.tardios++; else s.conDerecho++;
    if (f.ALMUERZO_SOLICITADO === 'SI') s.solicitados++;
    if (f.ALMUERZO_ENTREGADO === 'SI') s.entregados++;
    if (f.ORIGEN === 'KIOSCO') s.kiosco++;
  });
  s.pendientes = s.solicitados - s.entregados;
  return { ok: true, stats: s, config: configPublica_() };
}

/** RF-07 / RF-09 */
function lista_(p) {
  if (!verificarPin_(p.pin)) return error_('PIN_INVALIDO', 'PIN incorrecto');
  return { ok: true, filas: leerTabla_('ASISTENTES').map(ticketDesdeFila_), hora: ahora_() };
}

// ============================================================================
// ACCESO A DATOS
// ============================================================================
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja_(nombre) {
  const ss = ss_();
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.getRange(1, 1, 1, HOJAS[nombre].length).setValues([HOJAS[nombre]]);
  } else if (hoja.getLastRow() === 0) {
    hoja.getRange(1, 1, 1, HOJAS[nombre].length).setValues([HOJAS[nombre]]);
  }
  return hoja;
}

/** Devuelve las filas como objetos {COLUMNA: valor}, más _fila (número de fila en la hoja) */
function leerTabla_(nombre) {
  const hoja = hoja_(nombre);
  const ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  const cols = HOJAS[nombre];
  const valores = hoja.getRange(2, 1, ultima - 1, cols.length).getValues();
  const filas = [];
  valores.forEach(function (v, i) {
    const obj = { _fila: i + 2 };
    let vacia = true;
    cols.forEach(function (c, j) { obj[c] = fmt_(v[j]); if (obj[c] !== '') vacia = false; });
    if (!vacia) filas.push(obj);
  });
  return filas;
}

/** Escribe solo las columnas indicadas de una fila existente */
function escribir_(nombre, fila, cambios) {
  const hoja = hoja_(nombre);
  const cols = HOJAS[nombre];
  Object.keys(cambios).forEach(function (c) {
    const idx = cols.indexOf(c);
    if (idx >= 0) hoja.getRange(fila, idx + 1).setNumberFormat('@').setValue(comoTexto_(cambios[c]));
  });
}

/**
 * Añade una fila escribiendo primero el formato texto en el rango destino.
 * appendRow() ignora el formato de columna y convierte '09746075' en 9746075 y las fechas en fechas (RNF-09).
 */
function anexarFila_(hoja, valores) {
  const fila = hoja.getLastRow() + 1;
  const rango = hoja.getRange(fila, 1, 1, valores.length);
  rango.setNumberFormat('@');
  rango.setValues([valores.map(comoTexto_)]);
}

/** Sheets interpreta lo que se escribe como si se tipeara; el apóstrofo inicial lo fuerza a texto y no se guarda */
function comoTexto_(v) {
  if (v === null || v === undefined) return '';
  const s = (v instanceof Date) ? Utilities.formatDate(v, TZ, FMT_FECHA) : String(v);
  return s === '' ? '' : "'" + s;
}

function log_(accion, id, dni, actor, resultado) {
  try {
    anexarFila_(hoja_('LOG'), [ahora_(), accion, id || '', dni || '', actor || '', resultado || '']);
  } catch (err) { /* la bitácora nunca debe tumbar la operación principal */ }
}

function config_() {
  const cfg = {};
  CONFIG_DEFAULT.forEach(function (par) { cfg[par[0]] = par[1]; });
  leerTabla_('CONFIG').forEach(function (r) {
    const k = String(r.CLAVE || '').trim().toUpperCase();
    if (k) cfg[k] = String(r.VALOR || '').trim();
    if (k === 'EVENTO_FECHA' && /^\d{2}\/\d{2}\/\d{4} 00:00:00$/.test(cfg[k])) cfg[k] = fechaLarga_(cfg[k]);
  });
  return cfg;
}

function configPublica_() {
  const c = config_();
  return {
    evento: c.EVENTO_NOMBRE, fecha: c.EVENTO_FECHA, lugar: c.EVENTO_LUGAR,
    mensaje: c.MENSAJE_BIENVENIDA,
    registroAbierto: esSi_(c.REGISTRO_ABIERTO), solicitudAbierta: esSi_(c.SOLICITUD_ABIERTA),
    corteAlmuerzo: c.CORTE_ALMUERZO || '', almuerzoVigente: almuerzoVigente_(c),
    version: VERSION, versionDatos: c.VERSION_DATOS, hora: ahora_()
  };
}

/** RF-15: ¿todavía hay derecho a desayuno para quien se registre ahora? */
function almuerzoVigente_(cfg) {
  const corte = parsearFecha_(cfg.CORTE_ALMUERZO);
  if (!corte) return true;                 // sin corte configurado
  return ahoraLima_().getTime() < corte.getTime();
}

function verificarPin_(pin) {
  const real = String(config_().PIN_VALIDADOR || '').trim();
  return real !== '' && String(pin || '').trim() === real;
}

// ============================================================================
// UTILIDADES
// ============================================================================
function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function error_(codigo, mensaje) { return { ok: false, error: codigo, mensaje: mensaje }; }
function conTicket_(err, fila) { err.ticket = ticketDesdeFila_(fila); return err; }

function conLock_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return error_('OCUPADO', 'Servidor ocupado, inténtalo de nuevo');
  }
  try { return fn(); } finally { lock.releaseLock(); }
}

function ahora_() { return Utilities.formatDate(new Date(), TZ, FMT_FECHA); }

/** Fecha/hora actual de Lima como Date "local" (misma convención que parsearFecha_) */
function ahoraLima_() {
  return new Date(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd\'T\'HH:mm:ss'));
}

/** 'dd/MM/yyyy HH:mm' o 'dd/MM/yyyy HH:mm:ss' → Date local; null si no se puede leer */
function parsearFecha_(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(texto || '').trim());
  if (!m) return null;
  const d = new Date(m[3] + '-' + m[2] + '-' + m[1] + 'T' + m[4] + ':' + m[5] + ':' + (m[6] || '00'));
  return isNaN(d.getTime()) ? null : d;
}

/** Segundos transcurridos desde una fecha 'dd/MM/yyyy HH:mm:ss' (Lima); Infinity si no se puede leer */
function segundosDesde_(texto) {
  const b = parsearFecha_(texto);
  if (!b) return Infinity;
  return Math.abs((ahoraLima_().getTime() - b.getTime()) / 1000);
}

function fmt_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, TZ, FMT_FECHA);
  return String(v).replace(/^'/, '').trim();
}

function esSi_(v) {
  const s = String(v === true ? 'SI' : (v || '')).trim().toUpperCase();
  return s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1' || s === 'S';
}

function normalizarDni_(v) {
  const s = String(v || '').replace(/[\s.\-]/g, '').toUpperCase();
  return /^\d{7}$/.test(s) ? '0' + s : s; // celda convertida a número por Sheets: recupera el cero inicial
}
function normalizarFicha_(v) { return String(v || '').replace(/\D/g, '').replace(/^0+/, ''); }
function normalizarTexto_(v) { return String(v || '').replace(/\s+/g, ' ').trim().toUpperCase(); }

function buscarPorDni_(filas, dni) {
  if (!dni) return null;
  return filas.find(function (f) { return normalizarDni_(f.DNI) === dni; }) || null;
}
function buscarPorFicha_(filas, ficha) {
  if (!ficha) return null;
  return filas.find(function (f) { return f.TIPO === 'TRABAJADOR' && normalizarFicha_(f.FICHA) === ficha; }) || null;
}
/** '20/10/2026 00:00:00' → 'Martes 20 de octubre de 2026' */
function fechaLarga_(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(texto);
  if (!m) return texto;
  const d = new Date(m[3] + '-' + m[2] + '-' + m[1] + 'T12:00:00');
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
  return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear();
}
function buscarPorId_(filas, id) {
  const buscado = String(id || '').trim().toUpperCase();
  if (!buscado) return null;
  return filas.find(function (f) { return String(f.ID).trim().toUpperCase() === buscado; }) || null;
}

function generarId_(filas) {
  const existentes = {};
  filas.forEach(function (f) { existentes[f.ID] = true; });
  for (let intento = 0; intento < 20; intento++) {
    let s = PREFIJO_ID;
    for (let i = 0; i < 6; i++) s += ALFABETO_ID.charAt(Math.floor(Math.random() * ALFABETO_ID.length));
    if (!existentes[s]) return s;
  }
  throw new Error('No se pudo generar un ID único');
}

function ticketDesdeFila_(f) {
  return {
    id: f.ID, dni: f.DNI, nombres: f.NOMBRES, tipo: f.TIPO, ficha: f.FICHA || '', area: f.AREA || '',
    fechaRegistro: f.FECHA_REGISTRO,
    derecho: f.DERECHO_ALMUERZO === 'NO' ? 'NO' : 'SI',
    solicitado: f.ALMUERZO_SOLICITADO === 'SI' ? 'SI' : 'NO', fechaSolicitud: f.FECHA_SOLICITUD || '',
    entregado: f.ALMUERZO_ENTREGADO === 'SI' ? 'SI' : 'NO', fechaEntrega: f.FECHA_ENTREGA || '',
    entregadoPor: f.ENTREGADO_POR || '', origen: f.ORIGEN || 'CELULAR'
  };
}

// ============================================================================
// PRUEBAS MANUALES DESDE EL EDITOR (no se exponen por HTTP)
// ============================================================================
function pruebaRegistroDesdeEditor() {
  const r = conLock_(function () {
    return registrar_({ dni: '00000001', nombres: 'Prueba Setup', tipo: 'INVITADO', almuerzo: 'SI', origen: 'KIOSCO' });
  });
  Logger.log(JSON.stringify(r));
}

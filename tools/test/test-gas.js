// Prueba de la lógica de Code.gs en Node con un Sheet en memoria (mock mínimo de Apps Script)
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync(process.argv[2], 'utf8');

class Range {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push((this.sheet.rows[this.r - 1 + i] || [])[this.c - 1 + j] ?? ''); out.push(row); } return out; }
  setValues(v) { v.forEach((row, i) => row.forEach((val, j) => this.sheet.set(this.r + i, this.c + j, val))); return this; }
  setValue(v) { this.sheet.set(this.r, this.c, v); return this; }
  setNumberFormat() { return this; } setFontWeight() { return this; }
}
class Sheet {
  constructor(name) { this.name = name; this.rows = []; }
  set(r, c, v) { while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  getLastRow() { return this.rows.length; } getMaxRows() { return 1000; }
  appendRow(v) { this.rows.push(v.slice()); return this; } setFrozenRows() {} getName() { return this.name; }
}
const sheets = {};
const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = new Sheet(n)), setActiveSheet() {} };
const fmtLima = (d, fmt) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  if (fmt === 'dd/MM/yyyy HH:mm:ss') return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
  if (fmt === 'dd/MM/yyyy HH:mm') return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
  if (fmt === "yyyy-MM-dd'T'HH:mm:ss") return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  throw new Error('formato no soportado en el mock: ' + fmt);
};
// reloj simulado (Lima): empieza 20/10/2026 08:30
let ahora = new Date('2026-10-20T13:30:00Z'); // 08:30 Lima
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
  Utilities: { formatDate: (d, tz, f) => fmtLima(d, f) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { createTextOutput: (t) => ({ setMimeType() { return { texto: t }; } }), MimeType: { JSON: 'json' } },
  Logger: { log: () => {} },
  Date: class extends Date { constructor(...a) { if (a.length === 0) super(ahora.getTime()); else super(...a); } static now() { return ahora.getTime(); } },
  Math, JSON, String, Number, Object, Array, RegExp, Error, isNaN, Infinity, parseInt, parseFloat
};
vm.createContext(ctx);
vm.runInContext(src, ctx);
const call = (fn, ...a) => vm.runInContext(fn, ctx)(...a);
const get = (p) => JSON.parse(call('doGet', { parameter: p }).texto);
const post = (p) => JSON.parse(call('doPost', { postData: { contents: JSON.stringify(p) }, parameter: {} }).texto);
const fallas = [];
const check = (c, m) => { if (c) console.log('  ✓ ' + m); else fallas.push(m); };

call('setupInicial');
check(sheets.CONFIG.rows.length === 10 && sheets.ASISTENTES.rows[0][7] === 'DERECHO_ALMUERZO', 'setupInicial crea pestañas y 9 claves CONFIG');
call('setupInicial');
check(sheets.CONFIG.rows.length === 10, 'setupInicial es idempotente');
sheets.PADRON.appendRow(['24881', '', 'KILDER ORLANDO LEYVA HERRERA', 'Equipo Tecnologías de la Información y Comunicaciones']);

let r = get({ action: 'config' });
check(r.ok && r.config.almuerzoVigente === true && r.config.fecha === 'Martes 20 de octubre de 2026', 'config pública con almuerzo vigente');
r = get({ action: 'buscar', ficha: '24881' });
check(r.ok && r.padron && r.padron.nombres === 'KILDER ORLANDO LEYVA HERRERA' && !r.registrado, 'buscar por ficha devuelve padrón');
r = post({ action: 'registrar', dni: '7000000-1', nombres: 'kilder  orlando leyva herrera', tipo: 'trabajador', ficha: '024881', area: 'ETIC', almuerzo: 'SI', origen: 'CELULAR' });
check(r.ok && !r.duplicado && r.ticket.id.startsWith('SM26-') && r.ticket.derecho === 'SI' && r.ticket.solicitado === 'SI' && r.ticket.dni === '70000001' && r.ticket.ficha === '24881' && r.ticket.nombres === 'KILDER ORLANDO LEYVA HERRERA', 'registrar normaliza DNI/ficha/nombres y da derecho');
const id1 = r.ticket.id;
r = post({ action: 'registrar', dni: '70000001', nombres: 'OTRO', tipo: 'INVITADO', almuerzo: 'SI' });
check(r.ok && r.duplicado && r.ticket.id === id1, 'registrar duplicado devuelve el mismo ticket');
r = post({ action: 'registrar', dni: '70000002', nombres: 'MARIA PEREZ', tipo: 'INVITADO', almuerzo: 'NO' });
check(r.ok && r.ticket.derecho === 'SI' && r.ticket.solicitado === 'NO', 'invitado con derecho pero sin solicitar');
const id2 = r.ticket.id;
r = post({ action: 'solicitar', id: id2 });
check(r.ok && r.ticket.solicitado === 'SI' && r.ticket.fechaSolicitud.endsWith('08:30:00'), 'solicitar desde el ticket');

// Corte: el organizador cierra el almuerzo a las 09:00
ahora = new Date('2026-10-20T14:00:00Z');
r = post({ action: 'config_set', clave: 'CORTE_ALMUERZO', valor: 'AHORA', pin: '1111', actor: 'CARLOS' });
check(!r.ok && r.error === 'PIN_INVALIDO', 'config_set exige PIN');
r = post({ action: 'config_set', clave: 'PIN_VALIDADOR', valor: '0000', pin: '2026', actor: 'CARLOS' });
check(!r.ok && r.error === 'CLAVE_NO_EDITABLE', 'config_set no permite cambiar el PIN');
r = post({ action: 'config_set', clave: 'CORTE_ALMUERZO', valor: 'AHORA', pin: '2026', actor: 'CARLOS' });
check(r.ok && r.config.corteAlmuerzo === '20/10/2026 09:00' && r.config.almuerzoVigente === false, 'cerrar almuerzo AHORA fija el corte 09:00');
ahora = new Date('2026-10-20T15:10:00Z'); // 10:10
r = post({ action: 'registrar', dni: '70000003', nombres: 'JUAN TARDIO', tipo: 'INVITADO', almuerzo: 'SI', origen: 'KIOSCO' });
check(r.ok && r.ticket.derecho === 'NO' && r.ticket.solicitado === 'NO' && r.ticket.origen === 'KIOSCO', 'registro tardío queda sin derecho aunque pida almuerzo');
const id3 = r.ticket.id;
r = post({ action: 'solicitar', id: id3 });
check(!r.ok && r.error === 'SIN_DERECHO' && r.ticket.id === id3, 'tardío no puede solicitar');
r = post({ action: 'config_set', clave: 'CORTE_ALMUERZO', valor: '20/10/2026 09:00', pin: '2026', actor: 'CARLOS' });
check(r.ok && r.config.almuerzoVigente === false, 'corte por hora en formato dd/MM/yyyy HH:mm');
r = post({ action: 'config_set', clave: 'CORTE_ALMUERZO', valor: '20-10-2026', pin: '2026', actor: 'CARLOS' });
check(!r.ok && r.error === 'DATOS_INVALIDOS', 'formato de corte inválido rechazado');
r = post({ action: 'config_set', clave: 'CORTE_ALMUERZO', valor: '20/10/2026 11:00', pin: '2026', actor: 'CARLOS' });
check(r.ok && r.config.almuerzoVigente === true, 'corte futuro (11:00) deja el almuerzo vigente a las 10:10');
r = post({ action: 'config_set', clave: 'CORTE_ALMUERZO', valor: '', pin: '2026', actor: 'CARLOS' });
check(r.ok && r.config.corteAlmuerzo === '' && r.config.almuerzoVigente === true, 'reabrir (vacío)');

// Entregas 13:05
ahora = new Date('2026-10-20T18:05:00Z');
r = post({ action: 'entregar', id: id3, pin: '2026', actor: 'ROSA' });
check(!r.ok && r.error === 'SIN_DERECHO' && r.ticket.derecho === 'NO', 'validador rechaza al tardío');
r = post({ action: 'entregar', id: id1, pin: '2026', actor: 'rosa' });
check(r.ok && !r.repetido && r.ticket.entregado === 'SI' && r.ticket.entregadoPor === 'ROSA' && r.ticket.fechaEntrega.endsWith('13:05:00'), 'entrega OK con actor normalizado');
ahora = new Date('2026-10-20T18:05:40Z');
r = post({ action: 'entregar', id: id1, pin: '2026', actor: 'ROSA' });
check(r.ok && r.repetido, 'reintento del mismo validador a los 40 s = misma entrega');
ahora = new Date('2026-10-20T18:20:00Z');
r = post({ action: 'entregar', id: id1, pin: '2026', actor: 'LUIS' });
check(!r.ok && r.error === 'YA_ENTREGADO' && r.ticket.entregadoPor === 'ROSA', 'segunda entrega por otro validador rechazada');
r = post({ action: 'entregar', id: id2, pin: '2026', actor: 'LUIS' });
check(r.ok && r.ticket.solicitado === 'SI', 'entrega de ticket que no solicitó lo marca como solicitado');
r = post({ action: 'entregar', id: 'SM26-NOEXIS', pin: '2026', actor: 'LUIS' });
check(!r.ok && r.error === 'NO_ENCONTRADO', 'ticket inexistente');
r = get({ action: 'stats', pin: '2026' });
check(r.ok && r.stats.total === 3 && r.stats.conDerecho === 2 && r.stats.tardios === 1 && r.stats.solicitados === 2 && r.stats.entregados === 2 && r.stats.pendientes === 0 && r.stats.kiosco === 1, 'stats correctos');
r = get({ action: 'lista', pin: '2026' });
check(r.ok && r.filas.length === 3 && r.filas[2].derecho === 'NO', 'lista con derecho por fila');
r = get({ action: 'ticket', dni: '70000002' });
check(r.ok && r.ticket.id === id2, 'ticket por DNI (recuperación)');
r = post({ action: 'config_set', clave: 'REGISTRO_ABIERTO', valor: 'no', pin: '2026', actor: 'CARLOS' });
r = post({ action: 'registrar', dni: '70000004', nombres: 'PEDRO CERRADO', tipo: 'INVITADO', almuerzo: 'SI' });
check(!r.ok && r.error === 'REGISTRO_CERRADO', 'registro cerrado rechaza nuevos');
r = post({ action: 'registrar', dni: '70000001', nombres: 'X', tipo: 'INVITADO' });
check(r.ok && r.duplicado, 'con registro cerrado, un registrado aún recupera su ticket');
const acciones = sheets.LOG.rows.slice(1).map((x) => x[1]);
check(acciones.includes('REGISTRO') && acciones.includes('REGISTRO_DUPLICADO') && acciones.includes('SOLICITUD') && acciones.includes('ENTREGA') && acciones.includes('ENTREGA_RECHAZADA') && acciones.includes('CONFIG') && acciones.includes('PIN_INVALIDO'), 'LOG cubre todas las acciones');
check(sheets.ASISTENTES.rows[1][1] === '70000001' && sheets.ASISTENTES.rows[1][7] === 'SI' && sheets.ASISTENTES.rows[3][7] === 'NO', 'columnas DNI y DERECHO en su sitio');

console.log(fallas.length ? '\nFALLAS:\n' + fallas.join('\n') : '\nTODO OK (Code.gs)');
process.exit(fallas.length ? 1 : 0);

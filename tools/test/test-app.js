// Prueba de humo sin navegador: carga index.html en jsdom, simula el backend (fetch) y recorre los flujos
// Registro → Ticket → Validador (consultar/entregar) → Panel (stats/config_set) → Kiosco.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = process.argv[2];
const html = fs.readFileSync(path, 'utf8')
  .replace(/<script src="https:[^"]+"><\/script>/g, ''); // sin CDN (QRCode/Html5Qrcode/XLSX no disponibles aquí)

const errores = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errores.push('jsdomError: ' + (e.detail && e.detail.message || e.message)));
vc.on('error', (m) => errores.push('console.error: ' + m));

// ---- Backend simulado (misma semántica que Code.gs) ----
const estado = { filas: [], cfg: { registroAbierto: true, solicitudAbierta: true, corteAlmuerzo: '', almuerzoVigente: true }, pin: '2026', log: [] };
let seq = 1;
function ticket(f) { return Object.assign({}, f); }
function backend(url, init) {
  const u = new URL(url);
  const p = Object.fromEntries(u.searchParams.entries());
  if (init && init.method === 'POST') Object.assign(p, JSON.parse(init.body));
  const ok = (o) => Object.assign({ ok: true }, o);
  const err = (c, extra) => Object.assign({ ok: false, error: c }, extra || {});
  const config = () => Object.assign({ evento: 'Señor de los Milagros 2026', fecha: 'Martes 20 de octubre de 2026', lugar: 'La Atarjea', mensaje: 'Bienvenido' }, estado.cfg);
  switch (p.action) {
    case 'config': return ok({ config: config() });
    case 'buscar': {
      const f = estado.filas.find((x) => x.dni === p.dni);
      const padron = p.ficha === '24881' || p.dni === '70000001' ? { dni: '', ficha: '24881', nombres: 'KILDER ORLANDO LEYVA HERRERA', area: 'Equipo Tecnologías de la Información y Comunicaciones' } : null;
      return ok({ registrado: !!f, id: f ? f.id : '', padron });
    }
    case 'ticket': {
      const f = estado.filas.find((x) => (p.id && x.id === p.id.toUpperCase()) || (p.dni && x.dni === p.dni));
      return f ? ok({ ticket: ticket(f) }) : err('NO_ENCONTRADO');
    }
    case 'pin': return p.pin === estado.pin ? ok({}) : err('PIN_INVALIDO');
    case 'stats': {
      if (p.pin !== estado.pin) return err('PIN_INVALIDO');
      const s = { total: estado.filas.length, trabajadores: 0, invitados: 0, conDerecho: 0, tardios: 0, solicitados: 0, entregados: 0, pendientes: 0, hora: '20/10/2026 09:00:00' };
      estado.filas.forEach((f) => { f.tipo === 'TRABAJADOR' ? s.trabajadores++ : s.invitados++; f.derecho === 'NO' ? s.tardios++ : s.conDerecho++; if (f.solicitado === 'SI') s.solicitados++; if (f.entregado === 'SI') s.entregados++; });
      s.pendientes = s.solicitados - s.entregados;
      return ok({ stats: s, config: config() });
    }
    case 'lista': return p.pin === estado.pin ? ok({ filas: estado.filas.map(ticket) }) : err('PIN_INVALIDO');
    case 'registrar': {
      const ex = estado.filas.find((x) => x.dni === p.dni);
      if (ex) return ok({ duplicado: true, ticket: ticket(ex) });
      if (!estado.cfg.registroAbierto) return err('REGISTRO_CERRADO');
      const derecho = estado.cfg.almuerzoVigente ? 'SI' : 'NO';
      const f = { id: 'SM26-' + String(seq++).padStart(6, 'A'), dni: p.dni, nombres: String(p.nombres).toUpperCase(), tipo: p.tipo, ficha: p.ficha || '', area: p.area || '',
        fechaRegistro: '20/10/2026 08:30:00', derecho, solicitado: derecho === 'SI' && p.almuerzo === 'SI' ? 'SI' : 'NO', fechaSolicitud: '', entregado: 'NO', fechaEntrega: '', entregadoPor: '', origen: p.origen };
      estado.filas.push(f); return ok({ duplicado: false, ticket: ticket(f) });
    }
    case 'solicitar': {
      const f = estado.filas.find((x) => x.id === p.id); if (!f) return err('NO_ENCONTRADO');
      if (f.derecho === 'NO') return err('SIN_DERECHO', { ticket: ticket(f) });
      f.solicitado = 'SI'; f.fechaSolicitud = '20/10/2026 08:31:00'; return ok({ ticket: ticket(f) });
    }
    case 'entregar': {
      if (p.pin !== estado.pin) return err('PIN_INVALIDO');
      const f = estado.filas.find((x) => x.id === p.id); if (!f) return err('NO_ENCONTRADO');
      if (f.derecho === 'NO') return err('SIN_DERECHO', { ticket: ticket(f) });
      if (f.entregado === 'SI') return err('YA_ENTREGADO', { ticket: ticket(f) });
      f.entregado = 'SI'; f.fechaEntrega = '20/10/2026 13:05:00'; f.entregadoPor = p.actor; f.solicitado = 'SI'; return ok({ ticket: ticket(f) });
    }
    case 'rechazo': estado.log.push(p.motivo); return ok({});
    case 'config_set': {
      if (p.pin !== estado.pin) return err('PIN_INVALIDO');
      if (p.clave === 'CORTE_ALMUERZO') { estado.cfg.corteAlmuerzo = p.valor === 'AHORA' ? '20/10/2026 09:00' : ''; estado.cfg.almuerzoVigente = !estado.cfg.corteAlmuerzo; }
      if (p.clave === 'REGISTRO_ABIERTO') estado.cfg.registroAbierto = p.valor === 'SI';
      return ok({ config: config() });
    }
    default: return err('ACCION_DESCONOCIDA');
  }
}

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://kilder16.github.io/smilagros-qr/', virtualConsole: vc, pretendToBeVisual: true });
const w = dom.window;
w.fetch = async (url, init) => ({ ok: true, status: 200, text: async () => JSON.stringify(backend(url, init)) });
w.confirm = () => true; w.prompt = () => '70000001'; w.scrollTo = () => {}; w.print = () => {};
w.Element.prototype.scrollIntoView = () => {};
w.HTMLCanvasElement.prototype.getContext = () => null;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (id) => w.document.getElementById(id);
const visible = (id) => !$(id).classList.contains('oculto');
const check = (cond, msg) => { if (!cond) errores.push('FALLA: ' + msg); else console.log('  ✓ ' + msg); };

(async () => {
  await esperar(50); // DOMContentLoaded + Router.render
  console.log('Vista inicial:', w.location.hash || '(sin hash → registro)');
  check(visible('view-registro'), 'arranca en #registro');
  check($('hdr-titulo').textContent === 'Señor de los Milagros 2026', 'título desde config');
  await esperar(20);
  check($('reg-fecha').textContent.includes('Martes 20 de octubre de 2026'), 'fecha del evento desde CONFIG');
  check(w.document.querySelector('img[data-logo="sedapal"]').src.startsWith('data:image/webp'), 'logo SEDAPAL embebido');

  // RF-02: autocompletar por ficha
  $('f-ficha').value = '24881'; $('f-ficha').dispatchEvent(new w.Event('blur')); await esperar(20);
  check($('f-nombres').value === 'KILDER ORLANDO LEYVA HERRERA', 'ficha 24881 autocompleta nombres desde PADRON');
  check($('f-area').value.startsWith('Equipo Tecnolog'), 'ficha autocompleta área');

  // RF-01 validación
  $('f-dni').value = '123'; $('form-registro').dispatchEvent(new w.Event('submit', { cancelable: true })); await esperar(20);
  check($('e-dni').textContent.length > 0 && estado.filas.length === 0, 'DNI corto bloquea el envío');

  // RF-01 registro OK
  $('f-dni').value = '70000001'; $('form-registro').dispatchEvent(new w.Event('submit', { cancelable: true })); await esperar(60);
  check(estado.filas.length === 1 && estado.filas[0].origen === 'CELULAR' && estado.filas[0].tipo === 'TRABAJADOR', 'registro creado (CELULAR, TRABAJADOR)');
  check(w.location.hash === '#ticket' && visible('view-ticket'), 'navega al ticket');
  check($('tk-id').textContent === estado.filas[0].id, 'ticket muestra el ID');
  check(JSON.parse(w.localStorage.getItem('smilagros26.ticket')).id === estado.filas[0].id, 'ticket guardado en localStorage');
  check($('chip-solicitado').textContent.includes('solicitado ✓'), 'almuerzo solicitado al registrarse');

  // RF-03 duplicado
  w.location.hash = '#registro'; await esperar(30);
  $('f-dni').value = '70000001'; $('f-nombres').value = 'OTRO NOMBRE'; $('form-registro').dispatchEvent(new w.Event('submit', { cancelable: true })); await esperar(60);
  check(estado.filas.length === 1 && $('tk-aviso').textContent.includes('Ya estabas registrado'), 'DNI duplicado devuelve ticket original');

  // Validador RF-06
  w.location.hash = '#validador'; await esperar(30);
  check(visible('val-login'), 'validador pide PIN');
  $('val-pin').value = '0000'; $('val-actor').value = 'ROSA'; $('btn-val-ingresar').click(); await esperar(40);
  check(visible('val-login-error') && $('val-login-error').textContent.includes('PIN'), 'PIN incorrecto rechazado');
  $('val-pin').value = '2026'; $('btn-val-ingresar').click(); await esperar(40);
  check(visible('val-ops') && $('val-actor-nombre').textContent === 'ROSA', 'PIN correcto ingresa');
  // Búsqueda manual RF-07
  w.document.querySelector('.tab[data-tab="buscar"]').click();
  $('val-q').value = '7000'; $('val-q').dispatchEvent(new w.Event('input')); await esperar(320);
  check($('val-resultados').querySelector('button[data-id]') !== null, 'búsqueda por DNI muestra botón Entregar');
  $('val-resultados').querySelector('button[data-id]').click(); await esperar(40);
  check(visible('val-result') && $('btn-entregar') !== null, 'consulta muestra tarjeta pendiente');
  $('btn-entregar').click(); await esperar(40);
  check(estado.filas[0].entregado === 'SI' && estado.filas[0].entregadoPor === 'ROSA', 'entrega registrada con actor');
  check($('val-result').classList.contains('ok'), 'tarjeta verde Entregado');
  // segunda entrega → rechazo
  await esperar(2600);
  $('val-q').dispatchEvent(new w.Event('input')); await esperar(320);
  check($('val-resultados').querySelector('button[data-id]') === null && $('val-resultados').textContent.includes('Entregado'), 'lista muestra Entregado sin botón');

  // Panel RF-08 / RF-15
  w.location.hash = '#panel'; await esperar(60);
  check(visible('pan-ops') && $('k-total').textContent === '1' && $('k-ent').textContent === '1', 'panel con sesión compartida y contadores');
  check($('est-almuerzo').textContent === 'ABIERTO', 'estado almuerzos ABIERTO');
  $('btn-cerrar-almuerzo').click(); await esperar(40);
  check($('est-almuerzo').textContent.startsWith('CERRADO'), 'Cerrar almuerzos → CERRADO');
  check(visible('btn-reabrir-almuerzo') && !visible('btn-cerrar-almuerzo'), 'botón cambia a Reabrir');

  // Registro tardío RF-15 (kiosco)
  w.location.hash = '#kiosco'; await esperar(40);
  check(visible('reg-kiosco-badge') && visible('reg-tardio') && !visible('check-almuerzo') && $('reg-tardio').textContent.includes('ya se cerró'), 'kiosco muestra aviso suave de cierre y oculta la casilla de almuerzo');
  w.document.querySelector('.seg[data-tipo="INVITADO"]').click();
  $('f-dni').value = '70000002'; $('f-nombres').value = 'MARIA PEREZ'; $('form-registro').dispatchEvent(new w.Event('submit', { cancelable: true })); await esperar(60);
  check(estado.filas.length === 2 && estado.filas[1].derecho === 'NO' && estado.filas[1].origen === 'KIOSCO' && estado.filas[1].tipo === 'INVITADO', 'registro tardío sin derecho, origen KIOSCO');
  check($('tk-banda').classList.contains('tardio') && $('chip-solicitado').textContent.startsWith('Asistencia registrada') && !visible('btn-solicitar') && $('tk-sub').textContent.startsWith('Constancia'), 'ticket posterior al cierre: constancia de asistencia, sin botón Solicitar');
  check(visible('btn-nuevo-registro') && w.localStorage.getItem('smilagros26.ticket').includes('70000001'), 'kiosco no pisa el ticket guardado del celular');
  $('btn-nuevo-registro').click(); await esperar(40);
  check(w.location.hash === '#kiosco' && $('f-dni').value === '' && $('f-nombres').value === '', 'Nuevo registro limpia el formulario');

  // Validador rechaza al tardío
  w.location.hash = '#validador'; await esperar(30);
  w.document.querySelector('.tab[data-tab="buscar"]').click();
  $('val-q').value = 'MARIA'; $('val-q').dispatchEvent(new w.Event('input')); await esperar(320);
  check($('val-resultados').textContent.includes('Después del cierre') && $('val-resultados').querySelector('button[data-id]') === null, 'búsqueda marca al registrado después del cierre, sin botón Entregar');

  // Recuperar ticket RF-04
  w.localStorage.clear(); w.location.hash = '#registro'; await esperar(30);
  $('btn-recuperar').click(); await esperar(60);
  check(w.location.hash === '#ticket' && $('tk-id').textContent === estado.filas[0].id, 'Recuperar mi ticket por DNI');

  // Acerca de RF-14
  $('lnk-acerca').click(); await esperar(10);
  check(visible('modal-acerca') && $('modal-acerca').textContent.includes('ETIC – SEDAPAL') && $('acerca-version').textContent === '1.1.0', 'Acerca de con versión y ETIC – SEDAPAL');

  console.log('\nRechazos reportados al LOG:', estado.log);
  if (errores.length) { console.log('\nERRORES:\n' + errores.join('\n')); process.exit(1); }
  console.log('\nTODO OK');
  process.exit(0);
})().catch((e) => { console.log('EXCEPCIÓN', e); process.exit(1); });

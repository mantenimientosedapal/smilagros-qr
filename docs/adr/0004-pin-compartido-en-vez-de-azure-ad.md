# ADR 0004 — PIN compartido (verificado en servidor) para validador y panel, en vez de Azure AD/MSAL
Estado: Aceptada
Fecha: 2026-10-18

## Contexto
El validador y el organizador son personal de Micromedición que operará desde sus celulares
personales el día del evento. ETIC tiene una App Registration en Azure AD (0c02dc65) compartida con
otras herramientas, pero su Redirect URI tipo SPA sigue pendiente de configurar con Luis Lazo, y los
invitados no tienen cuenta corporativa.

## Opciones consideradas
1. **MSAL.js / Azure AD** — pros: identidad corporativa real, auditoría por usuario. Contras: depende
   de un trámite externo abierto (Redirect URI), obliga a cuenta SEDAPAL en celulares personales, y
   no aporta nada al flujo del asistente, que es anónimo por diseño.
2. **Sin ninguna clave** — contras: cualquiera con la URL podría marcar entregas o descargar el listado.
3. **PIN único en CONFIG, enviado en cada escritura/lectura masiva y comparado en el servidor;
   el validador escribe su nombre para la bitácora** — pros: cero dependencias, se cambia desde la
   hoja, queda rastro de quién entregó. Contras: PIN compartido (si se filtra, se rota).

## Decisión
Opción 3. El PIN nunca viaja en la URL de las vistas (solo en la llamada a la API), se guarda en
`sessionStorage` (se borra al cerrar la pestaña) y se verifica en el servidor en `entregar`, `rechazo`,
`stats` y `lista`. El nombre del validador va en `ENTREGADO_POR` y en LOG (RF-13). Después del evento
el organizador cambia el PIN o pone `REGISTRO_ABIERTO = NO`.

## Consecuencias
- Se gana: operación inmediata con cualquier celular; auditoría suficiente para un evento de 150 personas.
- Se sacrifica: no hay identidad fuerte del validador (el nombre es declarativo).
- Si en el futuro la herramienta se institucionaliza para eventos mayores, se reemplaza por MSAL (ADR nuevo).

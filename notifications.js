/* ============================================================
   CONCRETA — NOTIFICACIONES POR CORREO
   Integración con EmailJS para alertas automáticas al jefe.

   Setup rápido (5 min):
   1. Crea cuenta gratuita en emailjs.com
   2. Add Email Service → conecta tu Gmail/Outlook
   3. Email Templates → crea plantilla nueva → pega el HTML del template
   4. Account → API Keys → copia tu Public Key
   5. Llena los campos en Configuración > Notificaciones dentro del sistema
   ============================================================ */

let _ejsReady = false;

function _ensureEJS(publicKey) {
  if (_ejsReady || !window.emailjs) return;
  emailjs.init({ publicKey });
  _ejsReady = true;
}

/* -------------------------------------------------------
   Template HTML de correo — pega esto en EmailJS
   Variables usadas: {{emoji}}, {{tipo_operacion}}, {{fecha}},
   {{fraccionamiento}}, {{manzana}}, {{lote}}, {{superficie}},
   {{precio}}, {{vendedor_nombre}}, {{cliente_nombre}},
   {{cliente_tel}}, {{cliente_email}}, {{forma_pago}},
   {{enganche_pct}}, {{platform_url}}, {{to_name}}
   ------------------------------------------------------- */

/* -------------------------------------------------------
   Envío principal — se llama desde lot.js tras una venta exitosa
   ------------------------------------------------------- */
function sendSaleNotification(saleData) {
  const cfg = getEmailConfig();
  if (!cfg.enabled) return;
  if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey || !cfg.bossEmail) {
    console.warn('[Concreta] Notificaciones: configuración incompleta en el panel Configuración.');
    return;
  }
  if (typeof emailjs === 'undefined') {
    console.warn('[Concreta] EmailJS no está cargado — verifica la conexión a internet.');
    return;
  }

  _ensureEJS(cfg.publicKey);

  const tipo  = saleData.tipo === 'vendido' ? 'VENTA CONFIRMADA' : 'SEPARACIÓN REGISTRADA';
  const emoji = saleData.tipo === 'vendido' ? '✅' : '📌';
  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  const fpago   = typeof formatFormaPago === 'function' ? formatFormaPago(saleData.formaPago) : (saleData.formaPago || '—');
  const baseUrl = window.location.href.replace(/[^/]*$/, '');

  emailjs.send(cfg.serviceId, cfg.templateId, {
    to_email:        cfg.bossEmail,
    to_name:         'Director',
    emoji,
    tipo_operacion:  tipo,
    fecha,
    fraccionamiento: saleData.fraccNombre    || '—',
    manzana:         saleData.manzanaNombre  || '—',
    lote:            `Lote ${String(saleData.loteNum).padStart(2, '0')}`,
    superficie:      `${saleData.m2} m²`,
    precio:          `$${saleData.precio.toLocaleString('es-MX')} MXN`,
    vendedor_nombre: saleData.vendedorNombre || '—',
    cliente_nombre:  saleData.compradorNombre || '—',
    cliente_tel:     saleData.compradorTel   || '—',
    cliente_email:   saleData.compradorEmail || '—',
    forma_pago:      fpago,
    enganche_pct:    saleData.enganchePct ? `${saleData.enganchePct}%` : 'N/A',
    platform_url:    `${baseUrl}boss.html`
  }).then(() => {
    console.log('[Concreta] ✅ Notificación enviada a', cfg.bossEmail);
  }).catch(err => {
    console.warn('[Concreta] ⚠️ Error al enviar notificación:', err);
  });
}

/* -------------------------------------------------------
   Template HTML sugerido para EmailJS
   Copia el contenido de EMAIL_TEMPLATE_HTML y pégalo
   en el campo "Content" de tu plantilla en emailjs.com
   ------------------------------------------------------- */
const EMAIL_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{emoji}} {{tipo_operacion}}</title>
</head>
<body style="margin:0;padding:0;background:#F4F7FC;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FC;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(28,32,53,0.10);">

        <!-- Header -->
        <tr>
          <td style="background:#1C2035;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Concreta Desarrollos</div>
                  <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Sistema de Gestión de Ventas</div>
                </td>
                <td align="right">
                  <span style="font-size:28px;">{{emoji}}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Alert band -->
        <tr>
          <td style="background:#2B6CB8;padding:14px 32px;">
            <div style="font-size:15px;font-weight:700;color:#fff;letter-spacing:0.04em;">{{tipo_operacion}}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.65);margin-top:3px;">{{fecha}}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">

            <!-- Greeting -->
            <p style="font-size:15px;color:#1C2035;margin:0 0 24px;font-weight:500;">Hola {{to_name}}, se ha registrado una nueva operación en la plataforma:</p>

            <!-- Property info -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7FC;border-radius:10px;padding:0;margin-bottom:20px;overflow:hidden;">
              <tr><td style="padding:16px 20px 8px;">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#64748B;margin-bottom:12px;">Propiedad</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#64748B;width:45%;">Fraccionamiento</td>
                    <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1C2035;">{{fraccionamiento}}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#64748B;">Manzana</td>
                    <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1C2035;">{{manzana}}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#64748B;">Lote</td>
                    <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1C2035;">{{lote}}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#64748B;">Superficie</td>
                    <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1C2035;">{{superficie}}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#64748B;">Precio</td>
                    <td style="padding:4px 0;font-size:16px;font-weight:800;color:#2B6CB8;">{{precio}}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#64748B;">Forma de pago</td>
                    <td style="padding:4px 0;font-size:13px;font-weight:600;color:#1C2035;">{{forma_pago}} · Enganche: {{enganche_pct}}</td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Vendor + Client info side by side -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td width="48%" style="background:#DCFCE7;border-radius:10px;padding:14px 16px;vertical-align:top;">
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#16A34A;margin-bottom:8px;">Asesor de ventas</div>
                  <div style="font-size:14px;font-weight:700;color:#1C2035;">{{vendedor_nombre}}</div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="background:#EBF4FF;border-radius:10px;padding:14px 16px;vertical-align:top;">
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#2B6CB8;margin-bottom:8px;">Cliente</div>
                  <div style="font-size:14px;font-weight:700;color:#1C2035;">{{cliente_nombre}}</div>
                  <div style="font-size:12px;color:#64748B;margin-top:4px;">{{cliente_tel}}</div>
                  <div style="font-size:12px;color:#64748B;">{{cliente_email}}</div>
                </td>
              </tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-top:8px;">
                  <a href="{{platform_url}}" style="display:inline-block;background:#2B6CB8;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.02em;">
                    Ver detalle en la plataforma →
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E2E8F0;">
            <p style="font-size:11px;color:#94A3B8;margin:0;text-align:center;">
              Este correo fue generado automáticamente por el Sistema de Gestión de Concreta Desarrollos.<br>
              No responder a este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

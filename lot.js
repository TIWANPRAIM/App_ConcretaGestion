/* ============================================================
   CONCRETA — LOT DETAIL LOGIC
   Loads selected lot details, updates states, and registers transactions.
   Boss-specific: release (liberar) lot back to disponible.
   ============================================================ */

let currentAuth = null;
let fraccId     = null;
let manzId      = null;
let loteNum     = null;
let lote        = null;
let fracc       = null;
let transactionType = ''; // 'vendido' | 'separado' | 'liberar'

document.addEventListener('DOMContentLoaded', () => {
  const sess = getSession();
  if (!sess) { window.location.href = 'index.html'; return; }

  currentAuth = { userId: sess.userId, role: sess.role, user: getUser(sess.userId) };
  if (!currentAuth.user) { clearSession(); window.location.href = 'index.html'; return; }

  // Top nav user info
  const navUserEl = document.getElementById('navUser');
  if (navUserEl) {
    navUserEl.textContent = `${currentAuth.user.name || currentAuth.user.id} (${currentAuth.role === 'boss' ? 'Jefe' : 'Vendedor'})`;
  }

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  fraccId = params.get('fracc');
  manzId  = params.get('manz');
  loteNum = params.get('lot');

  if (!fraccId || !manzId || !loteNum) {
    window.location.href = currentAuth.role === 'boss' ? 'boss.html' : 'employee.html';
    return;
  }

  // Fix breadcrumb hrefs based on role
  const backPage     = currentAuth.role === 'boss' ? 'boss.html' : 'employee.html';
  const bcHome       = document.getElementById('bcHome');
  const bcFraccLink  = document.getElementById('bcFraccLink');
  if (bcHome) bcHome.href = backPage;
  if (bcFraccLink) {
    bcFraccLink.href = backPage;
    if (currentAuth.role === 'boss') bcFraccLink.removeAttribute('onclick');
  }

  loadLoteData();
  setupFormHandler();
});

/* ----------------------------------------------------------
   LOAD & RENDER LOT DATA
   ---------------------------------------------------------- */
function loadLoteData() {
  fracc = getFracc(fraccId);
  lote  = getLote(fraccId, manzId, loteNum);

  if (!fracc || !lote) {
    alert('Lote o fraccionamiento no encontrado.');
    window.location.href = currentAuth.role === 'boss' ? 'boss.html' : 'employee.html';
    return;
  }

  const isBoss = currentAuth.role === 'boss';

  // Breadcrumbs
  const bcFracc = document.getElementById('bcFracc');
  const bcManz  = document.getElementById('bcManz');
  const bcLot   = document.getElementById('bcLot');
  if (bcFracc) bcFracc.textContent = fracc.nombre;
  if (bcManz)  bcManz.textContent  = `Manzana ${manzId.replace('manz_', '')}`;
  if (bcLot)   bcLot.textContent   = `Lote ${String(lote.numero).padStart(2, '0')}`;

  // Header info
  const infoFracc   = document.getElementById('infoFracc');
  const lotTitle    = document.getElementById('lotTitle');
  const lotVialidad = document.getElementById('lotVialidad');
  const lotPrice    = document.getElementById('lotPrice');
  const priceNote   = document.getElementById('priceNote');
  if (infoFracc)   infoFracc.textContent   = fracc.nombre;
  if (lotTitle)    lotTitle.textContent    = `Lote ${String(lote.numero).padStart(2, '0')}`;
  if (lotVialidad) lotVialidad.textContent = `${lote.vialidad} #${lote.numExterior}`;
  if (lotPrice)    lotPrice.textContent    = fmtPrice(lote.precio);
  if (priceNote)   priceNote.textContent   = `Superficie total: ${lote.m2} m²`;

  // Specs
  const specM2       = document.getElementById('specM2');
  const specManz     = document.getElementById('specManz');
  const specNumExt   = document.getElementById('specNumExt');
  const specVialidad = document.getElementById('specVialidad');
  if (specM2)       specM2.textContent       = `${lote.m2} m²`;
  if (specManz)     specManz.textContent     = manzId.replace('manz_', '');
  if (specNumExt)   specNumExt.textContent   = lote.numExterior;
  if (specVialidad) specVialidad.textContent = lote.vialidad;

  // Clear dynamic panels
  const badgeEl    = document.getElementById('lotStatusBadge');
  const alertEl    = document.getElementById('statusAlert');
  const actionEl   = document.getElementById('actionButtons');
  const notesEl    = document.getElementById('lotNotes');
  if (badgeEl)  badgeEl.innerHTML  = '';
  if (alertEl)  { alertEl.classList.add('hidden'); alertEl.innerHTML = ''; }
  if (actionEl) actionEl.innerHTML = '';
  if (notesEl)  notesEl.innerHTML  = '';

  // ---- DISPONIBLE ----
  if (lote.estado === 'disponible') {
    if (badgeEl) badgeEl.innerHTML = `<span class="badge badge-available">Disponible</span>`;
    if (actionEl) {
      actionEl.innerHTML = `
        <button class="action-btn-sell"    onclick="openTransactionModal('vendido')">Registrar Venta</button>
        <button class="action-btn-reserve" onclick="openTransactionModal('separado')">Separar Lote</button>
        <button class="action-btn-share"   onclick="shareViaWhatsApp()">Compartir por WhatsApp</button>
      `;
    }

  // ---- SEPARADO ----
  } else if (lote.estado === 'separado') {
    if (badgeEl) badgeEl.innerHTML = `<span class="badge badge-reserved">Separado</span>`;
    if (alertEl) {
      alertEl.className = 'alert alert-warning mb-3';
      alertEl.innerHTML = `Lote <strong>Separado</strong> por <strong>${lote.comprador}</strong>.`;
      alertEl.classList.remove('hidden');
    }
    if (actionEl) {
      let btns = `<button class="action-btn-sell" onclick="openTransactionModal('vendido')">Registrar Venta Definitiva</button>`;
      if (isBoss) btns += `<button class="action-btn-release" onclick="openTransactionModal('liberar')">Liberar Lote</button>`;
      btns += `<div style="display:flex;gap:0.5rem;">
        <button class="action-btn-share"   onclick="shareViaWhatsApp()" style="flex:1;">Compartir WhatsApp</button>
        <button class="action-btn-receipt" onclick="generateRecibo()" style="flex:1;">Generar Recibo</button>
      </div>`;
      actionEl.innerHTML = btns;
    }
    if (notesEl) {
      notesEl.innerHTML = `
        <div class="card mt-2">
          <h4 style="margin-bottom:0.5rem;font-size:0.9rem;">Detalles de la Separación</h4>
          <p style="font-size:0.8rem;margin-bottom:0.25rem;"><strong>Cliente:</strong> ${lote.comprador}</p>
          <p style="font-size:0.8rem;margin-bottom:0.25rem;"><strong>Contacto:</strong> ${lote.compradorTel} / ${lote.compradorEmail}</p>
          <p style="font-size:0.8rem;margin-bottom:0.25rem;"><strong>Forma de pago:</strong> ${formatFormaPago(lote.formaPago)}${lote.enganchePct ? ` · ${lote.enganchePct}% de enganche` : ''}</p>
          ${lote.notas ? `<p style="font-size:0.8rem;margin-bottom:0.25rem;font-style:italic;"><strong>Notas:</strong> "${lote.notas}"</p>` : ''}
          <p style="font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem;">Vendedor: ${lote.vendedor || '—'} · ${lote.fechaTransaccion ? new Date(lote.fechaTransaccion).toLocaleDateString('es-MX') : '—'}</p>
        </div>`;
    }

  // ---- VENDIDO ----
  } else if (lote.estado === 'vendido') {
    if (badgeEl) badgeEl.innerHTML = `<span class="badge badge-sold">Vendido</span>`;
    if (alertEl) {
      alertEl.className = 'alert alert-error mb-3';
      alertEl.innerHTML = `Lote <strong>Vendido</strong> a <strong>${lote.comprador}</strong>.`;
      alertEl.classList.remove('hidden');
    }
    if (actionEl) {
      let btns = '';
      if (isBoss) btns += `<button class="action-btn-release" onclick="openTransactionModal('liberar')">Cancelar Venta / Liberar</button>`;
      btns += `<div style="display:flex;gap:0.5rem;">
        <button class="action-btn-share"   onclick="shareViaWhatsApp()" style="flex:1;">Compartir WhatsApp</button>
        <button class="action-btn-receipt" onclick="generateRecibo()" style="flex:1;">Generar Recibo</button>
      </div>`;
      actionEl.innerHTML = btns;
    }
    if (notesEl) {
      notesEl.innerHTML = `
        <div class="card mt-2">
          <h4 style="margin-bottom:0.5rem;font-size:0.9rem;">Detalles de la Adquisición</h4>
          <p style="font-size:0.8rem;margin-bottom:0.25rem;"><strong>Cliente:</strong> ${lote.comprador}</p>
          <p style="font-size:0.8rem;margin-bottom:0.25rem;"><strong>Contacto:</strong> ${lote.compradorTel} / ${lote.compradorEmail}</p>
          <p style="font-size:0.8rem;margin-bottom:0.25rem;"><strong>Forma de pago:</strong> ${formatFormaPago(lote.formaPago)}${lote.enganchePct ? ` · ${lote.enganchePct}% de enganche` : ''}</p>
          ${lote.notas ? `<p style="font-size:0.8rem;margin-bottom:0.25rem;font-style:italic;"><strong>Notas:</strong> "${lote.notas}"</p>` : ''}
          <p style="font-size:0.7rem;color:var(--text-muted);margin-top:0.5rem;">Asesor: ${lote.vendedor || '—'} · ${lote.fechaTransaccion ? new Date(lote.fechaTransaccion).toLocaleDateString('es-MX') : '—'}</p>
        </div>`;
    }
  }
}

/* ----------------------------------------------------------
   MODAL: open / close
   ---------------------------------------------------------- */
window.openTransactionModal = openTransactionModal;
window.closeModal = closeModal;

window.toggleEnganche = function() {
  const method = document.getElementById('paymentMethod')?.value;
  const group  = document.getElementById('engancheGroup');
  if (!group) return;
  const show = method && method !== 'contado';
  group.classList.toggle('hidden', !show);
  if (!show) {
    const inp = document.getElementById('enganchePct');
    if (inp) inp.value = '';
  }
};

function openTransactionModal(type) {
  transactionType  = type;
  const modal      = document.getElementById('transModal');
  const title      = document.getElementById('modalTitle');
  const confirmBtn = document.getElementById('confirmBtn');
  const modalAlert = document.getElementById('modalAlert');
  const buyerSec   = document.getElementById('buyerFieldsSection');
  const notesGrp   = document.getElementById('notesGroup');

  if (modalAlert) { modalAlert.classList.add('hidden'); modalAlert.textContent = ''; }

  const form = document.getElementById('transForm');
  if (form) form.reset();

  const isRelease = type === 'liberar';

  // Show/hide buyer fields based on transaction type
  if (buyerSec) buyerSec.style.display = isRelease ? 'none' : '';
  if (notesGrp) notesGrp.style.display = isRelease ? 'none' : '';

  if (title) {
    title.textContent = type === 'vendido'  ? 'Registrar Venta de Lote'
                      : type === 'separado' ? 'Registrar Separación de Lote'
                      : '🔓 Liberar Lote — Cancelar Operación';
  }
  if (confirmBtn) {
    confirmBtn.textContent = type === 'vendido'  ? 'Confirmar Venta'
                           : type === 'separado' ? 'Confirmar Separación'
                           : 'Confirmar Liberación';
    confirmBtn.className   = type === 'vendido'  ? 'btn btn-primary'
                           : type === 'separado' ? 'btn btn-warning'
                           : 'btn btn-danger';
  }

  // Reset payment fields
  const pmEl = document.getElementById('paymentMethod');
  const epEl = document.getElementById('enganchePct');
  const egEl = document.getElementById('engancheGroup');
  if (pmEl) pmEl.value = '';
  if (epEl) epEl.value = '';
  if (egEl) egEl.classList.add('hidden');

  // Autocomplete buyer data when converting a separation to sale
  if (lote.estado === 'separado' && type === 'vendido') {
    const nameEl  = document.getElementById('buyerName');
    const phoneEl = document.getElementById('buyerPhone');
    const emailEl = document.getElementById('buyerEmail');
    const notesEl = document.getElementById('transNotes');
    if (nameEl)  nameEl.value  = lote.comprador      || '';
    if (phoneEl) phoneEl.value = lote.compradorTel   || '';
    if (emailEl) emailEl.value = lote.compradorEmail || '';
    if (notesEl) notesEl.value = lote.notas          || '';
  }

  if (modal) modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('transModal');
  if (modal) modal.classList.remove('active');
  const buyerSec = document.getElementById('buyerFieldsSection');
  const notesGrp = document.getElementById('notesGroup');
  if (buyerSec) buyerSec.style.display = '';
  if (notesGrp) notesGrp.style.display = '';
  const pmEl = document.getElementById('paymentMethod');
  const epEl = document.getElementById('enganchePct');
  const egEl = document.getElementById('engancheGroup');
  if (pmEl) pmEl.value = '';
  if (epEl) epEl.value = '';
  if (egEl) egEl.classList.add('hidden');
}

/* ----------------------------------------------------------
   FORM SUBMISSION: venta, separación, liberación
   ---------------------------------------------------------- */
function setupFormHandler() {
  const form = document.getElementById('transForm');
  if (!form) return;
  const modalAlert = document.getElementById('modalAlert');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const pin = document.getElementById('pinInput').value.trim();

    // ---- LIBERAR (boss only) ----
    if (transactionType === 'liberar') {
      if (!pin) {
        if (modalAlert) {
          modalAlert.className = 'alert alert-error';
          modalAlert.textContent = '⚠️ Ingresa tu usuario como PIN para autorizar la liberación.';
          modalAlert.classList.remove('hidden');
        }
        return;
      }
      if (!verifyPin(pin)) {
        if (modalAlert) {
          modalAlert.className = 'alert alert-error';
          modalAlert.textContent = '❌ PIN incorrecto. Ingresa tu nombre de usuario exacto.';
          modalAlert.classList.remove('hidden');
        }
        return;
      }

      if (modalAlert) modalAlert.classList.add('hidden');
      const confirmBtn = document.getElementById('confirmBtn');
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Procesando...'; }

      setTimeout(() => {
        updateLote(fraccId, manzId, loteNum, {
          estado: 'disponible',
          comprador: null,
          compradorTel: null,
          compradorEmail: null,
          vendedor: null,
          fechaTransaccion: null,
          notas: ''
        });

        closeModal();
        showToast('success', 'Lote Liberado', 'El lote ha sido devuelto al inventario disponible.');
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar Liberación'; }
        setTimeout(() => loadLoteData(), 600);
      }, 400);
      return;
    }

    // ---- VENTA / SEPARACIÓN ----
    const buyerName  = document.getElementById('buyerName').value.trim();
    const buyerPhone = document.getElementById('buyerPhone').value.trim();
    const buyerEmail = document.getElementById('buyerEmail').value.trim();
    const notes      = document.getElementById('transNotes').value.trim();
    const formaPago  = document.getElementById('paymentMethod')?.value || '';
    const epRaw      = document.getElementById('enganchePct')?.value;
    const enganchePct = epRaw && formaPago !== 'contado' ? parseInt(epRaw) : null;

    if (!buyerName || !buyerPhone || !buyerEmail || !pin || !formaPago) {
      if (modalAlert) {
        modalAlert.className = 'alert alert-error';
        modalAlert.textContent = '⚠️ Todos los campos marcados con asterisco (*) son obligatorios, incluyendo la forma de pago.';
        modalAlert.classList.remove('hidden');
      }
      return;
    }

    if (!verifyPin(pin)) {
      if (modalAlert) {
        modalAlert.className = 'alert alert-error';
        modalAlert.textContent = '❌ PIN incorrecto. Ingresa tu nombre de usuario actual para autorizar.';
        modalAlert.classList.remove('hidden');
      }
      return;
    }

    if (modalAlert) modalAlert.classList.add('hidden');
    const confirmBtn = document.getElementById('confirmBtn');
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Procesando...'; }

    setTimeout(() => {
      const success = updateLote(fraccId, manzId, loteNum, {
        estado:           transactionType,
        comprador:        buyerName,
        compradorTel:     buyerPhone,
        compradorEmail:   buyerEmail,
        vendedor:         currentAuth.user.name || currentAuth.userId,
        fechaTransaccion: new Date().toISOString(),
        formaPago,
        enganchePct,
        notas:            notes
      });

      if (!success) {
        if (modalAlert) {
          modalAlert.className = 'alert alert-error';
          modalAlert.textContent = '❌ Error al intentar actualizar los datos del lote.';
          modalAlert.classList.remove('hidden');
        }
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar'; }
        return;
      }

      const saleRecord = {
        fraccId,
        fraccNombre:     fracc.nombre,
        manzanaId:       manzId,
        manzanaNombre:   `Manzana ${manzId.replace('manz_', '')}`,
        loteNum:         parseInt(loteNum),
        m2:              lote.m2,
        precio:          lote.precio,
        tipo:            transactionType,
        compradorNombre: buyerName,
        compradorTel:    buyerPhone,
        compradorEmail:  buyerEmail,
        vendedorId:      currentAuth.userId,
        vendedorNombre:  currentAuth.user.name || currentAuth.userId,
        formaPago,
        enganchePct
      };

      addSale(saleRecord);

      // Email notification to boss
      sendSaleNotification(saleRecord);

      closeModal();
      const msg = transactionType === 'vendido' ? '¡Lote vendido con éxito!' : '¡Lote separado con éxito!';
      showToast('success', 'Operación Exitosa', msg);

      setTimeout(() => {
        window.location.href = currentAuth.role === 'boss' ? 'boss.html' : 'employee.html';
      }, 1000);
    }, 400);
  });
}

/* ----------------------------------------------------------
   COMPARTIR VÍA WHATSAPP
   ---------------------------------------------------------- */
window.shareViaWhatsApp = function() {
  if (!fracc || !lote) return;

  const estadoLabel = { disponible: 'Disponible', separado: 'Separado', vendido: 'Vendido' }[lote.estado] || lote.estado;
  const mzLabel = fracc.manzanas.find(m => m.id === manzId)?.nombre || `Manzana ${manzId.replace('manz_','')}`;

  const text = [
    `🏠 *CONCRETA DESARROLLOS*`,
    ``,
    `📍 *Fraccionamiento:* ${fracc.nombre}`,
    `🏙️ *Manzana:* ${mzLabel}`,
    `🔢 *Lote:* L-${String(lote.numero).padStart(2,'0')} — ${lote.m2} m²`,
    `🛣️ *Vialidad:* ${lote.vialidad} #${lote.numExterior}`,
    `💰 *Precio:* $${lote.precio.toLocaleString('es-MX')} MXN`,
    `📋 *Estado:* ${estadoLabel}`,
    ``,
    `🔑 Uso de suelo: Habitacional`,
    `💡 Servicios: Agua, Luz, Drenaje`,
    ``,
    `Para más información o agendar visita, contáctanos.`
  ].join('\n');

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

/* ----------------------------------------------------------
   GENERAR RECIBO (ventana de impresión)
   ---------------------------------------------------------- */
window.generateRecibo = function() {
  if (!fracc || !lote) return;

  const tipo       = lote.estado === 'vendido' ? 'CONTRATO DE VENTA' : 'NOTA DE SEPARACIÓN';
  const folio      = `CNT-${Date.now().toString().slice(-8)}`;
  const fecha      = new Date(lote.fechaTransaccion || Date.now()).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' });
  const mzLabel    = fracc.manzanas.find(m => m.id === manzId)?.nombre || `Manzana ${manzId.replace('manz_','')}`;
  const fpago      = typeof formatFormaPago === 'function' ? formatFormaPago(lote.formaPago) : (lote.formaPago || '—');

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo · ${folio}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:Arial,sans-serif;padding:2.5rem;color:#1C2035;font-size:14px;line-height:1.6;}
    .header{text-align:center;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:3px solid #1C2035;}
    .header h1{font-size:1.6rem;font-weight:900;letter-spacing:-0.5px;}
    .header .sub{font-size:0.8rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-top:0.2rem;}
    .tipo-badge{display:inline-block;background:#1C2035;color:#fff;padding:0.35rem 1.2rem;border-radius:99px;font-size:0.8rem;font-weight:700;letter-spacing:0.08em;margin-top:0.75rem;}
    .folio{font-size:0.75rem;color:#888;margin-top:0.5rem;}
    .section{margin:1.5rem 0;}
    .section h3{font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#2B6CB8;border-bottom:1px solid #E2E8F0;padding-bottom:0.4rem;margin-bottom:0.75rem;}
    table{width:100%;border-collapse:collapse;}
    td{padding:0.4rem 0;font-size:0.88rem;}
    td:first-child{color:#666;width:42%;}
    td:last-child{font-weight:600;}
    .price-row td:last-child{font-size:1.5rem;font-weight:900;color:#2B6CB8;}
    .divider{height:1px;background:#E2E8F0;margin:1.5rem 0;}
    .signatures{display:grid;grid-template-columns:1fr 1fr;gap:3rem;margin-top:3rem;}
    .sig-line{border-top:1px solid #1C2035;padding-top:0.4rem;text-align:center;font-size:0.75rem;color:#888;}
    .footer{text-align:center;margin-top:2.5rem;font-size:0.7rem;color:#aaa;border-top:1px solid #eee;padding-top:1rem;}
    @media print{button{display:none;}.no-print{display:none;}}
    .print-btn{background:#2B6CB8;color:#fff;border:none;padding:0.75rem 2rem;border-radius:8px;font-size:0.9rem;font-weight:700;cursor:pointer;margin-bottom:2rem;}
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:1.5rem;">
    <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>
  <div class="header">
    <h1>Concreta Desarrollos</h1>
    <p class="sub">Sistema de Gestión de Ventas</p>
    <div class="tipo-badge">${tipo}</div>
    <p class="folio">Folio: <strong>${folio}</strong> &nbsp;·&nbsp; Fecha: ${fecha}</p>
  </div>

  <div class="section">
    <h3>Propiedad</h3>
    <table>
      <tr><td>Fraccionamiento</td><td>${fracc.nombre}</td></tr>
      <tr><td>Manzana</td><td>${mzLabel}</td></tr>
      <tr><td>Lote</td><td>L-${String(lote.numero).padStart(2,'0')}</td></tr>
      <tr><td>Vialidad</td><td>${lote.vialidad} #${lote.numExterior}</td></tr>
      <tr><td>Superficie</td><td>${lote.m2} m²</td></tr>
      <tr><td>Uso de suelo</td><td>Habitacional</td></tr>
    </table>
  </div>

  <div class="section">
    <h3>Precio y Forma de Pago</h3>
    <table>
      <tr class="price-row"><td>Precio de venta</td><td>$${lote.precio.toLocaleString('es-MX')} MXN</td></tr>
      <tr><td>Forma de pago</td><td>${fpago}</td></tr>
      ${lote.enganchePct ? `<tr><td>Enganche inicial</td><td>${lote.enganchePct}% · $${Math.round(lote.precio * lote.enganchePct / 100).toLocaleString('es-MX')} MXN</td></tr>` : ''}
    </table>
  </div>

  <div class="section">
    <h3>Comprador</h3>
    <table>
      <tr><td>Nombre</td><td>${lote.comprador || '—'}</td></tr>
      <tr><td>Teléfono</td><td>${lote.compradorTel || '—'}</td></tr>
      <tr><td>Correo electrónico</td><td>${lote.compradorEmail || '—'}</td></tr>
    </table>
  </div>

  <div class="section">
    <h3>Asesor de Ventas</h3>
    <table>
      <tr><td>Nombre</td><td>${lote.vendedor || '—'}</td></tr>
      <tr><td>Empresa</td><td>Concreta Desarrollos</td></tr>
    </table>
  </div>

  ${lote.notas ? `<div class="section"><h3>Notas</h3><p style="font-size:0.85rem;font-style:italic;">${lote.notas}</p></div>` : ''}

  <div class="divider"></div>

  <div class="signatures">
    <div><div class="sig-line">Firma del Comprador<br><em style="font-size:0.8rem;">${lote.comprador || '_______________'}</em></div></div>
    <div><div class="sig-line">Asesor de Ventas<br><em style="font-size:0.8rem;">${lote.vendedor || '_______________'}</em></div></div>
  </div>

  <div class="footer">
    Este documento fue generado por el Sistema de Gestión de Concreta Desarrollos.<br>
    Folio ${folio} · ${fecha}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=900');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

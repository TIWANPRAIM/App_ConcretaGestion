/* ============================================================
   CONCRETA — EMPLOYEE DASHBOARD LOGIC
   ============================================================ */

let currentAuth = null;

document.addEventListener('DOMContentLoaded', () => {
  currentAuth = requireEmployee();
  if (!currentAuth) return;

  initUI();
  loadDashboard();
  document.getElementById('topDate').textContent = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
});

/* ----------------------------------------------------------
   UI INIT
   ---------------------------------------------------------- */
function initUI() {
  const user = currentAuth.user;

  /* Sidebar avatar */
  const avatarEl = document.getElementById('avatarEl');
  if (user.photo) {
    avatarEl.innerHTML = `<img src="${user.photo}" alt="${user.name}">`;
  } else {
    avatarEl.textContent = (user.name || user.id).charAt(0).toUpperCase();
  }
  document.getElementById('userNameEl').textContent = user.name || user.id;
}

/* ----------------------------------------------------------
   SECTION SWITCHING
   ---------------------------------------------------------- */
function showSection(name) {
  const NAV_MAP = {
    'dashboard':        'nav-dashboard',
    'fraccionamientos': 'nav-fracc',
    'mis-ventas':       'nav-ventas',
    'mi-perfil':        'nav-perfil',
    'prospectos':       'nav-prospectos',
    'calculadora':      'nav-calc'
  };
  const titles = {
    'dashboard':        ['Mi Dashboard',           'Resumen de tu actividad'],
    'fraccionamientos': ['Fraccionamientos',        'Selecciona un lote para ver detalles o registrar venta'],
    'mis-ventas':       ['Mis Ventas',              'Historial de todas tus transacciones'],
    'mi-perfil':        ['Mi Perfil',               'Tu información de vendedor'],
    'prospectos':       ['Mis Prospectos',          'Pipeline CRM personal — gestiona contactos y oportunidades'],
    'calculadora':      ['Calculadora de Crédito',  'Estima el pago mensual y viabilidad del crédito de tu cliente']
  };

  Object.keys(NAV_MAP).forEach(s => {
    const secEl = document.getElementById(`sec-${s}`);
    const navEl = document.getElementById(NAV_MAP[s]);
    if (secEl) secEl.classList.toggle('hidden', s !== name);
    if (navEl) navEl.classList.toggle('active', s === name);
  });

  const [title, sub] = titles[name] || ['', ''];
  document.getElementById('pageTitle').textContent    = title;
  document.getElementById('pageSubtitle').textContent = sub;

  if (name === 'fraccionamientos') loadFraccionamientos();
  if (name === 'mis-ventas')       loadFullSales();
  if (name === 'mi-perfil')        loadProfile();
  if (name === 'prospectos')       loadProspectosEmployee();
  if (name === 'calculadora')      loadCalculadora();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active', sidebar.classList.contains('open'));
}

/* ----------------------------------------------------------
   DASHBOARD
   ---------------------------------------------------------- */
function loadDashboard() {
  const stats = getEmployeeStats(currentAuth.userId);
  document.getElementById('statVentas').textContent  = stats.ventas;
  document.getElementById('statSep').textContent     = stats.separaciones;
  document.getElementById('statSemana').textContent  = stats.ventasSemana;
  document.getElementById('statMes').textContent     = stats.ventasMes;

  /* Goal (3 ventas/mes) */
  document.getElementById('goalSold').textContent    = stats.ventasMes;
  document.getElementById('goalReserved').textContent = stats.separaciones;
  const pct = Math.min(100, Math.round((stats.ventasMes / 3) * 100));
  document.getElementById('goalPct').textContent = pct + '%';
  document.getElementById('goalFill').style.width    = pct + '%';

  /* Recent sales */
  const sales = getSalesByEmployee(currentAuth.userId).slice(-5).reverse();
  const el    = document.getElementById('recentSalesList');
  if (!sales.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>Sin ventas registradas</h3><p>Cuando registres tu primera venta aparecerá aquí.</p></div>`;
    return;
  }
  el.innerHTML = `
    <table class="sales-table">
      <thead><tr>
        <th>Fecha</th><th>Fraccionamiento</th><th>Manzana</th><th>Lote</th><th>Tipo</th><th>Comprador</th>
      </tr></thead>
      <tbody>
        ${sales.map(s => `
          <tr>
            <td class="td-muted">${new Date(s.createdAt).toLocaleDateString('es-MX')}</td>
            <td class="td-bold">${s.fraccNombre}</td>
            <td>${s.manzanaNombre}</td>
            <td>${s.loteNum}</td>
            <td><span class="badge ${s.tipo === 'vendido' ? 'badge-sold' : 'badge-reserved'}">${s.tipo}</span></td>
            <td>${s.compradorNombre}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ----------------------------------------------------------
   FRACCIONAMIENTOS LIST
   ---------------------------------------------------------- */
function loadFraccionamientos() {
  const fraccs = getFraccionamientos();
  const el     = document.getElementById('fraccList');

  if (!fraccs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏗️</div><h3>Sin fraccionamientos disponibles</h3><p>El administrador aún no ha registrado fraccionamientos.</p></div>`;
    return;
  }

  el.innerHTML = fraccs.map(f => {
    const stats = getFraccStats(f);
    const pctVendido = Math.round((stats.vendidos / stats.total) * 100);
    return `
      <div class="card mb-3">
        <!-- [IMAGE: Fotografía aérea o render del fraccionamiento ${f.nombre} mostrando la distribución de calles y viviendas] -->
        <div class="img-placeholder mb-2" style="height:160px;border-radius:var(--radius);">
          <span class="ph-icon">🏘️</span>
          <span class="ph-label">${f.nombre}</span>
          <span class="ph-desc">Render o fotografía panorámica del fraccionamiento ${f.nombre} — ${f.sector}</span>
        </div>

        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
          <div>
            <span class="label-tag">${f.ubicacion}</span>
            <h2 style="font-size:1.25rem;margin-top:0.5rem;">${f.nombre}</h2>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-top:0.25rem;">${f.sector}</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.5rem;font-weight:900;color:var(--blue);">${stats.disponibles}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">lotes disponibles</div>
          </div>
        </div>

        <!-- Stats row -->
        <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;">
            <span style="width:10px;height:10px;border-radius:2px;background:var(--available);display:inline-block;"></span>
            <strong>${stats.disponibles}</strong> disponibles
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;">
            <span style="width:10px;height:10px;border-radius:2px;background:var(--reserved);display:inline-block;"></span>
            <strong>${stats.separados}</strong> separados
          </div>
          <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;">
            <span style="width:10px;height:10px;border-radius:2px;background:var(--sold);display:inline-block;"></span>
            <strong>${stats.vendidos}</strong> vendidos
          </div>
        </div>

        <!-- Progress -->
        <div class="mb-3">
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.35rem;">
            <span>Progreso de ventas</span><span>${pctVendido}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill red" style="width:${pctVendido}%"></div>
          </div>
        </div>

        <!-- Manzanas -->
        ${f.manzanas.map(m => renderManzana(f.id, m)).join('')}
      </div>`;
  }).join('');
}

function renderManzana(fraccId, manz) {
  const s = getManzanaStats(manz);
  return `
    <div class="manzana-section">
      <div class="manzana-header" onclick="toggleManzana('${manz.id}')">
        <h3>🏙️ ${manz.nombre}</h3>
        <div class="manzana-stats">
          <div class="manzana-stat"><span class="dot" style="background:var(--available)"></span> ${s.disponibles} disp.</div>
          <div class="manzana-stat"><span class="dot" style="background:var(--reserved)"></span> ${s.separados} sep.</div>
          <div class="manzana-stat"><span class="dot" style="background:var(--sold)"></span> ${s.vendidos} vend.</div>
          <span style="opacity:0.6;font-size:0.8rem;">▾</span>
        </div>
      </div>
      <div id="manz-${manz.id}" style="padding:0 0.5rem 0.5rem;">
        <div class="lot-legend mb-2">
          <div class="legend-item"><div class="legend-dot available"></div> Disponible</div>
          <div class="legend-item"><div class="legend-dot reserved"></div> Separado</div>
          <div class="legend-item"><div class="legend-dot sold"></div> Vendido</div>
        </div>
        <div class="lot-grid">
          ${manz.lotes.map(l => renderLotCard(fraccId, manz.id, l)).join('')}
        </div>
      </div>
    </div>`;
}

function renderLotCard(fraccId, manzId, lote) {
  const cls      = lote.estado;
  const canClick = lote.estado !== 'vendido';
  const onclick  = canClick
    ? `onclick="goToLot('${fraccId}','${manzId}','${lote.numero}')"`
    : '';
  const buyer = lote.comprador ? `<div class="lot-buyer" title="${lote.comprador}">${lote.comprador}</div>` : '';
  return `
    <div class="lot-card ${cls}" ${onclick} title="${canClick ? 'Ver detalles del lote' : 'Lote vendido'}">
      <div class="lot-status-dot"></div>
      <div class="lot-num">L-${String(lote.numero).padStart(2, '0')}</div>
      <div class="lot-m2">${lote.m2} m²</div>
      <div class="lot-price">${fmtPrice(lote.precio)}</div>
      ${buyer}
    </div>`;
}

function toggleManzana(manzId) {
  const el = document.getElementById(`manz-${manzId}`);
  if (el) el.style.display = el.style.display === 'none' ? '' : el.style.display === '' ? 'none' : '';
}

function goToLot(fraccId, manzId, loteNum) {
  window.location.href = `lot-detail.html?fracc=${fraccId}&manz=${manzId}&lot=${loteNum}`;
}

/* ----------------------------------------------------------
   FULL SALES LIST
   ---------------------------------------------------------- */
function loadFullSales() {
  const sales = getSalesByEmployee(currentAuth.userId).reverse();
  const el    = document.getElementById('fullSalesList');
  if (!sales.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><h3>Sin ventas registradas</h3><p>Aquí aparecerá el historial de todas tus ventas y separaciones.</p></div>`;
    return;
  }
  el.innerHTML = `
    <table class="sales-table" style="width:100%;">
      <thead><tr>
        <th>Fecha</th><th>Fraccionamiento</th><th>Manzana</th><th>Lote</th><th>m²</th><th>Precio</th><th>Tipo</th><th>Comprador</th><th>Tel.</th>
      </tr></thead>
      <tbody>
        ${sales.map(s => `
          <tr>
            <td class="td-muted" style="white-space:nowrap;">${new Date(s.createdAt).toLocaleDateString('es-MX')}</td>
            <td class="td-bold">${s.fraccNombre}</td>
            <td>${s.manzanaNombre}</td>
            <td>${s.loteNum}</td>
            <td>${s.m2} m²</td>
            <td style="font-weight:700;color:var(--blue);">${fmtPrice(s.precio)}</td>
            <td><span class="badge ${s.tipo === 'vendido' ? 'badge-sold' : 'badge-reserved'}">${s.tipo}</span></td>
            <td>${s.compradorNombre}</td>
            <td class="td-muted">${s.compradorTel || '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ----------------------------------------------------------
   PROSPECTOS (employee own CRM)
   ---------------------------------------------------------- */
function loadProspectosEmployee() {
  setupProspForm();
  const el = document.getElementById('empProspList');
  if (!el) return;

  const prospects = getProspectsByEmployee(currentAuth.userId);

  if (!prospects.length) {
    el.innerHTML = `<div class="empty-state" style="padding:3rem;"><div class="empty-icon" style="font-size:2.5rem;opacity:0.3;">👥</div><h3>Sin prospectos</h3><p>Registra tu primer prospecto para comenzar a llevar tu pipeline de ventas.</p></div>`;
    return;
  }

  el.innerHTML = `<div class="table-scroll"><table class="sales-table" style="width:100%;">
    <thead><tr>
      <th>Nombre</th><th>Teléfono</th><th>Etapa</th><th>Interés</th><th>Notas</th><th>Actualizado</th><th></th>
    </tr></thead>
    <tbody>
      ${prospects.map(p => `
        <tr>
          <td class="td-bold">${p.nombre}</td>
          <td class="td-muted">${p.telefono || '—'}</td>
          <td><span class="prosp-stage-badge stage-${(p.stage||'').toLowerCase().replace(/\s+/g,'-')}">${p.stage}</span></td>
          <td style="font-size:0.8rem;">${p.interes || '—'}</td>
          <td style="font-size:0.78rem;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.notas || '—'}</td>
          <td class="td-muted" style="white-space:nowrap;">${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-MX') : '—'}</td>
          <td style="white-space:nowrap;">
            <button class="btn btn-sm btn-ghost" onclick="openEditProspect('${p.id}')">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="deleteProspectById('${p.id}')">×</button>
          </td>
        </tr>`).join('')}
    </tbody>
  </table></div>`;
}

let _prospEditId = null;

window.openAddProspectModal = function() {
  _prospEditId = null;
  document.getElementById('prospModalTitle').textContent = 'Nuevo Prospecto';
  document.getElementById('prospEditId').value = '';
  document.getElementById('prospForm').reset();
  document.getElementById('prospModal').classList.add('active');
};

window.openEditProspect = function(id) {
  const p = getProspects().find(x => x.id === id);
  if (!p) return;
  _prospEditId = id;
  document.getElementById('prospModalTitle').textContent = 'Editar Prospecto';
  document.getElementById('prospEditId').value = id;
  document.getElementById('prospNombre').value  = p.nombre || '';
  document.getElementById('prospTel').value     = p.telefono || '';
  document.getElementById('prospEmail').value   = p.email || '';
  document.getElementById('prospStage').value   = p.stage || 'Nuevo contacto';
  document.getElementById('prospInteres').value = p.interes || '';
  document.getElementById('prospNotas').value   = p.notas || '';
  document.getElementById('prospModal').classList.add('active');
};

window.closeProspModal = function() {
  document.getElementById('prospModal').classList.remove('active');
};

window.deleteProspectById = function(id) {
  if (!confirm('¿Eliminar este prospecto?')) return;
  deleteProspect(id);
  loadProspectosEmployee();
};

// Setup prospect form (called once on DOMContentLoaded or lazily)
function setupProspForm() {
  const form = document.getElementById('prospForm');
  if (!form || form._initialized) return;
  form._initialized = true;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nombre = document.getElementById('prospNombre').value.trim();
    const tel    = document.getElementById('prospTel').value.trim();
    if (!nombre || !tel) return;

    const data = {
      nombre,
      telefono: tel,
      email:    document.getElementById('prospEmail').value.trim(),
      stage:    document.getElementById('prospStage').value,
      interes:  document.getElementById('prospInteres').value.trim(),
      notas:    document.getElementById('prospNotas').value.trim(),
      vendedorId: currentAuth.userId
    };

    if (_prospEditId) {
      updateProspect(_prospEditId, data);
      showToast('success', 'Prospecto actualizado', nombre);
    } else {
      addProspect(data);
      showToast('success', 'Prospecto guardado', nombre);
    }
    closeProspModal();
    loadProspectosEmployee();
  });
}

/* ----------------------------------------------------------
   CALCULADORA DE CRÉDITO
   ---------------------------------------------------------- */
function loadCalculadora() {
  setupProspForm();
  calcularCredito();
}

window.calcularCredito = function() {
  const el = document.getElementById('calcResult');
  if (!el) return;

  const precio    = parseFloat(document.getElementById('calcPrecio')?.value)    || 0;
  const enganchePct = parseFloat(document.getElementById('calcEnganche')?.value) || 20;
  const plazoAnios  = parseInt(document.getElementById('calcPlazo')?.value)      || 15;
  const tipo      = document.getElementById('calcTipoCredito')?.value || 'infonavit';
  const ingreso   = parseFloat(document.getElementById('calcIngreso')?.value)   || 0;

  if (!precio) {
    el.innerHTML = `<div class="alert alert-info" style="margin-top:1rem;">Ingresa el precio del inmueble para ver el cálculo.</div>`;
    return;
  }

  const tasaAnual = { infonavit: 10.45, fovissste: 6, bancario: 11, credito_directo: 14 }[tipo] || 10.45;
  const r    = tasaAnual / 100 / 12;
  const n    = plazoAnios * 12;
  const enganche   = precio * enganchePct / 100;
  const capital    = precio - enganche;

  let pagoMensual = 0;
  if (r === 0) {
    pagoMensual = capital / n;
  } else {
    pagoMensual = capital * r / (1 - Math.pow(1 + r, -n));
  }

  const totalPagado = pagoMensual * n + enganche;
  const interesTotal = totalPagado - precio;

  const capacidadPago = ingreso > 0 ? ingreso * 0.3 : null;
  const viable = capacidadPago ? pagoMensual <= capacidadPago : null;

  const tipoLabel = { infonavit: 'INFONAVIT', fovissste: 'FOVISSSTE', bancario: 'Crédito Bancario', credito_directo: 'Crédito Directo' }[tipo];

  el.innerHTML = `
    <div class="calc-result">
      <div class="calc-result-header">
        <div class="calc-result-title">${tipoLabel} · ${plazoAnios} años · ${tasaAnual}% anual</div>
      </div>
      <div class="calc-result-grid">
        <div class="calc-chip">
          <div class="calc-chip-label">Enganche</div>
          <div class="calc-chip-value">${fmtPrice(enganche)}</div>
          <div class="calc-chip-sub">${enganchePct}% del precio total</div>
        </div>
        <div class="calc-chip" style="border-color:var(--blue);background:#EBF4FF;">
          <div class="calc-chip-label" style="color:var(--blue);">Monto del crédito</div>
          <div class="calc-chip-value" style="color:var(--blue);">${fmtPrice(capital)}</div>
          <div class="calc-chip-sub">precio − enganche</div>
        </div>
        <div class="calc-chip" style="border-color:var(--available-bd);background:var(--available-bg);">
          <div class="calc-chip-label" style="color:var(--available);">Pago mensual estimado</div>
          <div class="calc-chip-value" style="font-size:1.35rem;color:var(--available);">${fmtPrice(pagoMensual)}</div>
          <div class="calc-chip-sub">durante ${n} meses</div>
        </div>
        <div class="calc-chip">
          <div class="calc-chip-label">Total pagado al final</div>
          <div class="calc-chip-value">${fmtPrice(totalPagado)}</div>
          <div class="calc-chip-sub">Intereses: ${fmtPrice(interesTotal)}</div>
        </div>
      </div>
      ${capacidadPago !== null ? `
      <div class="alert ${viable ? 'alert-success' : 'alert-error'}" style="margin-top:1rem;">
        ${viable
          ? `El cliente <strong>califica</strong> — el pago mensual (${fmtPrice(pagoMensual)}) representa el ${Math.round(pagoMensual/ingreso*100)}% del ingreso neto, dentro del límite recomendado del 30%.`
          : `El cliente <strong>podría no calificar</strong> — el pago mensual (${fmtPrice(pagoMensual)}) supera el 30% del ingreso neto (${fmtPrice(capacidadPago)}). Considera aumentar enganche o ampliar plazo.`}
      </div>` : ''}
    </div>`;
};

/* ----------------------------------------------------------
   PROFILE (editable)
   ---------------------------------------------------------- */
function loadProfile() {
  const user = currentAuth.user;

  const av = document.getElementById('profileAvatar');
  if (user.photo) {
    av.innerHTML = `<img src="${user.photo}" alt="${user.name}">`;
  } else {
    av.textContent = (user.name || user.id).charAt(0).toUpperCase();
  }
  document.getElementById('profileName').textContent = user.name || '—';
  document.getElementById('profileUser').textContent = '@' + user.id;

  const stats = getEmployeeStats(currentAuth.userId);

  document.getElementById('profileDetails').innerHTML = `
    <div class="lot-specs mb-3">
      <div class="lot-spec-item"><div class="spec-label">Ventas totales</div><div class="spec-value" style="color:var(--available);">${stats.ventas}</div></div>
      <div class="lot-spec-item"><div class="spec-label">Separaciones</div><div class="spec-value" style="color:var(--reserved);">${stats.separaciones}</div></div>
      <div class="lot-spec-item"><div class="spec-label">Esta semana</div><div class="spec-value">${stats.ventasSemana}</div></div>
      <div class="lot-spec-item"><div class="spec-label">Este mes</div><div class="spec-value">${stats.ventasMes}</div></div>
    </div>

    <div class="separator"></div>
    <h4 style="margin:1.25rem 0 1rem;font-size:0.95rem;">Actualizar mi información</h4>

    <div id="profileEditAlert" class="hidden"></div>

    <form id="profileEditForm" novalidate>
      <div class="form-row">
        <div class="form-group">
          <label for="editPhone">Teléfono</label>
          <input type="tel" id="editPhone" value="${user.phone || ''}" placeholder="81 1234 5678">
        </div>
        <div class="form-group">
          <label for="editEmail">Correo electrónico</label>
          <input type="email" id="editEmail" value="${user.email || ''}" placeholder="tu@correo.com">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="editZona">Zona de trabajo</label>
          <input type="text" id="editZona" value="${user.zona || ''}" placeholder="Ej. Zona Norte, Apodaca">
        </div>
        <div class="form-group">
          <label for="editExperiencia">Años de experiencia</label>
          <input type="number" id="editExperiencia" min="0" max="50" value="${user.experiencia || ''}" placeholder="Ej. 3">
        </div>
      </div>
      <div class="form-group">
        <label for="editBio">Especialidad / Nota personal</label>
        <textarea id="editBio" placeholder="Ej. Especialista en crédito INFONAVIT, zona norte...">${user.bio || ''}</textarea>
      </div>
      <div class="alert alert-warning" style="font-size:0.8rem;margin-bottom:1rem;">
        Para cambiar tu contraseña, contacta a tu supervisor.
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button type="submit" class="btn btn-primary">Guardar cambios</button>
      </div>
    </form>

    <div class="separator"></div>
    <p style="font-size:0.75rem;color:var(--text-light);margin-top:1rem;">
      Usuario: <strong>${user.id}</strong> · Miembro desde ${user.joinDate ? new Date(user.joinDate).toLocaleDateString('es-MX') : '—'}
    </p>`;

  document.getElementById('profileEditForm').addEventListener('submit', e => {
    e.preventDefault();
    const alertEl = document.getElementById('profileEditAlert');
    updateUser(currentAuth.userId, {
      phone:       document.getElementById('editPhone').value.trim(),
      email:       document.getElementById('editEmail').value.trim(),
      zona:        document.getElementById('editZona').value.trim(),
      experiencia: document.getElementById('editExperiencia').value ? parseInt(document.getElementById('editExperiencia').value) : null,
      bio:         document.getElementById('editBio').value.trim()
    });
    currentAuth.user = getUser(currentAuth.userId);
    alertEl.className = 'alert alert-success';
    alertEl.textContent = '✓ Información actualizada correctamente.';
    alertEl.classList.remove('hidden');
    initUI();
    setTimeout(() => alertEl.classList.add('hidden'), 3000);
  });
}

/* ============================================================
   CONCRETA — BOSS DASHBOARD LOGIC
   Handles statistics aggregation, Chart.js metrics, and housing builder
   ============================================================ */

let currentAuth      = null;
let employeesChart   = null;
let monthlyChart     = null;
let lotStatusChart   = null;
let financialChart   = null;
let chartPeriod      = 'mes';
let currentSalesMonth = null;

document.addEventListener('DOMContentLoaded', () => {
  // Validate boss authentication
  currentAuth = requireAuth('boss');
  if (!currentAuth) return;

  // Render dashboard values on load
  initUI();
  loadDashboard();
  
  // Set localized current date
  const dateEl = document.getElementById('topDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Setup form submission for adding development
  setupNewFraccForm();

  // Setup vendor management form
  setupGestionForm();
});

function initUI() {
  const user = currentAuth.user;
  const avatarEl = document.getElementById('avatarEl');
  const nameEl = document.getElementById('userNameEl');

  if (avatarEl) {
    if (user.photo) {
      avatarEl.innerHTML = `<img src="${user.photo}" alt="${user.name}">`;
    } else {
      avatarEl.textContent = (user.name || user.id).charAt(0).toUpperCase();
    }
  }
  if (nameEl) {
    nameEl.textContent = user.name || user.id;
  }
}

/* ----------------------------------------------------------
   SECTION NAVIGATION
   ---------------------------------------------------------- */
function showSection(name) {
  const NAV_MAP = {
    'dashboard':          'nav-dashboard',
    'vendedores':         'nav-vendedores',
    'ventas':             'nav-ventas',
    'fraccionamientos':   'nav-fracc',
    'nuevo-fracc':        'nav-nuevo-fracc',
    'gestion-vendedores': 'nav-gestion',
    'prospectos':         'nav-prospectos',
    'comisiones':         'nav-comisiones',
    'configuracion':      'nav-config'
  };
  const titles = {
    'dashboard':          ['Resumen General',               'Métricas globales y estadísticas de rendimiento'],
    'vendedores':         ['Asesores de Ventas',            'Listado y estadísticas individuales del equipo'],
    'ventas':             ['Registro General de Ventas',    'Listado completo de todas las transacciones'],
    'fraccionamientos':   ['Desarrollos y Lotes',           'Vista general del inventario y disponibilidad de lotes'],
    'nuevo-fracc':        ['Nuevo Desarrollo Habitacional', 'Configuración de un nuevo fraccionamiento'],
    'gestion-vendedores': ['Gestión de Vendedores',         'Crea, edita y administra el acceso del equipo de ventas'],
    'prospectos':         ['Prospectos CRM',                'Pipeline de contactos y oportunidades del equipo'],
    'comisiones':         ['Comisiones del Equipo',         'Configuración de tasas y resumen de ganancias'],
    'configuracion':      ['Configuración del Sistema',     'Notificaciones, alertas y ajustes generales']
  };

  Object.keys(NAV_MAP).forEach(s => {
    const secEl = document.getElementById(`sec-${s}`);
    const navEl = document.getElementById(NAV_MAP[s]);
    if (secEl) secEl.classList.toggle('hidden', s !== name);
    if (navEl) navEl.classList.toggle('active', s === name);
  });

  const [title, sub] = titles[name] || ['', ''];
  const titleEl = document.getElementById('pageTitle');
  const subEl   = document.getElementById('pageSubtitle');
  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;

  if (name === 'dashboard')          loadDashboard();
  if (name === 'vendedores')         loadEmployees();
  if (name === 'ventas')             loadSales();
  if (name === 'fraccionamientos')   loadFraccionamientos();
  if (name === 'gestion-vendedores') loadGestionVendedores();
  if (name === 'prospectos')         loadProspectosGlobal();
  if (name === 'comisiones')         loadComisiones();
  if (name === 'configuracion')      loadConfiguracion();
}

// Make globally accessible
window.showSection = showSection;

function setChartPeriod(period) {
  chartPeriod = period;
  ['semana', 'mes', 'año'].forEach(p => {
    document.getElementById(`period-${p}`)?.classList.toggle('active', p === period);
  });
  const titles = {
    semana: ['Rendimiento de Asesores · Últimos 7 días',    'Tendencia de Conversión · Últimos 7 días'],
    mes:    ['Rendimiento de Asesores · Últimos 6 meses',   'Tendencia de Conversión · Últimos 6 meses'],
    año:    ['Rendimiento de Asesores · Últimos 3 años',    'Tendencia de Conversión · Últimos 3 años']
  };
  const [empT, trendT] = titles[period];
  const empEl   = document.getElementById('empChartTitle');
  const trendEl = document.getElementById('trendChartTitle');
  if (empEl)   empEl.textContent   = empT;
  if (trendEl) trendEl.textContent = trendT;
  const employees = getAllEmployees();
  const sales     = getSales();
  renderCharts(employees, sales);
}
window.setChartPeriod = setChartPeriod;

function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active', sidebar && sidebar.classList.contains('open'));
}
window.toggleSidebar = toggleSidebar;

/* ----------------------------------------------------------
   DASHBOARD DATA & CHARTS
   ---------------------------------------------------------- */
function loadDashboard() {
  const sales = getSales();
  const employees = getAllEmployees();
  const fraccs = getFraccionamientos();

  // 1. Calculate Global Metrics
  let totalRevenue = 0;
  let soldCount = 0;
  let separatedCount = 0;

  // Calculate stats from lot statuses
  fraccs.forEach(f => {
    f.manzanas.forEach(m => {
      m.lotes.forEach(l => {
        if (l.estado === 'vendido') {
          soldCount++;
          totalRevenue += l.precio;
        } else if (l.estado === 'separado') {
          separatedCount++;
          totalRevenue += (l.precio * 0.1); // Estimate 10% separation revenue
        }
      });
    });
  });

  document.getElementById('statVentasGlobales').textContent = fmtPrice(totalRevenue);
  document.getElementById('statVendidosGlobal').textContent = soldCount;
  document.getElementById('statSeparadosGlobal').textContent = separatedCount;
  document.getElementById('statFraccsGlobal').textContent = fraccs.length;

  // 2. Weekly Leaderboard (Past 7 Days)
  loadWeeklyLeaderboard(employees, sales);

  // 3. Recent Transactions
  loadRecentTransactions(sales);

  // 4. Render all graphs
  renderCharts(employees, sales);
  renderLotStatusChart(fraccs);
  renderFinancialChart(fraccs);

  // 5. Separation timer alerts
  renderSepTimerAlerts();
}

function loadWeeklyLeaderboard(employees, sales) {
  const el = document.getElementById('weeklyLeaderboard');
  if (!el) return;

  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // Count sales per employee in the last 7 days
  const weeklyScores = employees.map(emp => {
    const weeklySales = sales.filter(s => 
      s.vendedorId === emp.id && 
      s.tipo === 'vendido' && 
      new Date(s.createdAt) >= weekAgo
    ).length;

    return { emp, score: weeklySales };
  });

  // Sort descending
  weeklyScores.sort((a, b) => b.score - a.score);

  if (weeklyScores.reduce((acc, curr) => acc + curr.score, 0) === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem 1rem;"><p class="text-muted">No se han registrado ventas en los últimos 7 días.</p></div>`;
    return;
  }

  const badges = ['gold', 'silver', 'bronze'];
  el.innerHTML = weeklyScores.map((item, idx) => {
    const medalClass = idx < 3 ? badges[idx] : 'other';
    const numDisplay = idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1;
    const photo = item.emp.photo 
      ? `<img src="${item.emp.photo}" alt="${item.emp.name}">` 
      : (item.emp.name || item.emp.id).charAt(0).toUpperCase();

    return `
      <div class="ranking-item">
        <div class="ranking-pos ${medalClass}">${numDisplay}</div>
        <div class="ranking-avatar">${photo}</div>
        <div class="ranking-name">${item.emp.name || item.emp.id}</div>
        <div class="ranking-score">${item.score} ${item.score === 1 ? 'venta' : 'ventas'}</div>
      </div>
    `;
  }).join('');
}

function loadRecentTransactions(sales) {
  const el = document.getElementById('recentTransactionsList');
  if (!el) return;

  const recent = sales.slice(-5).reverse();

  if (!recent.length) {
    el.innerHTML = `<div class="empty-state" style="padding:2rem 1rem;"><div class="empty-icon">📭</div><p class="text-muted">Aún no hay transacciones en el sistema.</p></div>`;
    return;
  }

  el.innerHTML = `
    <table class="sales-table" style="width:100%;">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Propiedad</th>
          <th>Asesor</th>
          <th>Tipo</th>
          <th>Cliente</th>
          <th>Precio</th>
        </tr>
      </thead>
      <tbody>
        ${recent.map(s => `
          <tr>
            <td class="td-muted">${new Date(s.createdAt).toLocaleDateString('es-MX')}</td>
            <td class="td-bold">${s.fraccNombre} · Mz ${s.manzanaNombre.replace('Manzana ', '')} · L-${s.loteNum}</td>
            <td>${s.vendedorNombre}</td>
            <td><span class="badge ${s.tipo === 'vendido' ? 'badge-sold' : 'badge-reserved'}">${s.tipo}</span></td>
            <td>${s.compradorNombre}</td>
            <td style="font-weight:700;color:var(--blue);">${fmtPrice(s.precio)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderCharts(employees, sales) {
  if (employeesChart) employeesChart.destroy();
  if (monthlyChart)   monthlyChart.destroy();

  const ctxEmp = document.getElementById('employeesChart');
  const ctxMon = document.getElementById('monthlyChart');
  if (!ctxEmp || !ctxMon) return;

  const now = new Date();

  // Cut-off date for employee chart based on current period
  let cutoff;
  if (chartPeriod === 'semana') {
    cutoff = new Date(now - 7 * 86400000);
  } else if (chartPeriod === 'mes') {
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    cutoff = new Date(now.getFullYear(), 0, 1);
  }
  const periodSales = sales.filter(s => new Date(s.createdAt) >= cutoff);

  // 1. Employee comparison bar chart
  employeesChart = new Chart(ctxEmp, {
    type: 'bar',
    data: {
      labels: employees.map(e => e.name || e.id),
      datasets: [
        { label: 'Ventas',       data: employees.map(e => periodSales.filter(s => s.vendedorId === e.id && s.tipo === 'vendido').length),   backgroundColor: '#16A34A', borderRadius: 6 },
        { label: 'Separaciones', data: employees.map(e => periodSales.filter(s => s.vendedorId === e.id && s.tipo === 'separado').length),  backgroundColor: '#D97706', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter' } } } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });

  // 2. Trend chart — X-axis granularity depends on period
  if (chartPeriod === 'semana') {
    const labels = [], sv = [], ss = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      labels.push(d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }));
      const yy = d.getFullYear(), mm = d.getMonth(), dd = d.getDate();
      sv.push(sales.filter(s => { const x = new Date(s.createdAt); return s.tipo === 'vendido'  && x.getFullYear()===yy && x.getMonth()===mm && x.getDate()===dd; }).length);
      ss.push(sales.filter(s => { const x = new Date(s.createdAt); return s.tipo === 'separado' && x.getFullYear()===yy && x.getMonth()===mm && x.getDate()===dd; }).length);
    }
    renderTrendChart(ctxMon, labels, sv, ss);

  } else if (chartPeriod === 'mes') {
    const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const buckets = [], sv = [], ss = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ label: `${mNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`, y: d.getFullYear(), m: d.getMonth() });
    }
    buckets.forEach(b => {
      sv.push(sales.filter(s => { const d = new Date(s.createdAt); return s.tipo === 'vendido'  && d.getFullYear()===b.y && d.getMonth()===b.m; }).length);
      ss.push(sales.filter(s => { const d = new Date(s.createdAt); return s.tipo === 'separado' && d.getFullYear()===b.y && d.getMonth()===b.m; }).length);
    });
    renderTrendChart(ctxMon, buckets.map(b => b.label), sv, ss);

  } else {
    const labels = [], sv = [], ss = [];
    for (let i = 2; i >= 0; i--) {
      const y = now.getFullYear() - i;
      labels.push(String(y));
      sv.push(sales.filter(s => s.tipo === 'vendido'  && new Date(s.createdAt).getFullYear() === y).length);
      ss.push(sales.filter(s => s.tipo === 'separado' && new Date(s.createdAt).getFullYear() === y).length);
    }
    renderTrendChart(ctxMon, labels, sv, ss);
  }
}

function renderTrendChart(ctx, labels, salesData, sepData) {
  monthlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Ventas',       data: salesData, borderColor: '#2B6CB8', backgroundColor: 'rgba(43,108,184,0.1)', fill: true,  tension: 0.3, borderWidth: 3 },
        { label: 'Separaciones', data: sepData,   borderColor: '#D97706', backgroundColor: 'transparent',          fill: false, tension: 0.3, borderWidth: 2, borderDash: [5,5] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter' } } } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
    }
  });
}

/* ----------------------------------------------------------
   LOT STATUS DONUT CHART
   ---------------------------------------------------------- */
function renderLotStatusChart(fraccs) {
  if (lotStatusChart) lotStatusChart.destroy();

  const ctx = document.getElementById('lotStatusChart');
  if (!ctx) return;

  let disponible = 0, separado = 0, vendido = 0;
  fraccs.forEach(f => {
    f.manzanas.forEach(m => {
      m.lotes.forEach(l => {
        if (l.estado === 'disponible') disponible++;
        else if (l.estado === 'separado') separado++;
        else if (l.estado === 'vendido') vendido++;
      });
    });
  });

  const total = disponible + separado + vendido;
  const totalEl = document.getElementById('lotTotalNum');
  if (totalEl) totalEl.textContent = total || '0';

  lotStatusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Disponible', 'Separado', 'Vendido'],
      datasets: [{
        data: [disponible, separado, vendido],
        backgroundColor: ['#16A34A', '#D97706', '#DC2626'],
        borderColor: '#fff',
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { family: 'Inter', size: 12 }, padding: 16 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.raw} lotes (${total ? Math.round(ctx.raw / total * 100) : 0}%)`
          }
        }
      }
    }
  });
}

/* ----------------------------------------------------------
   FINANCIAL RECOVERY BAR CHART
   ---------------------------------------------------------- */
function renderFinancialChart(fraccs) {
  if (financialChart) financialChart.destroy();

  const ctx       = document.getElementById('financialChart');
  const summaryEl = document.getElementById('financialSummary');
  if (!ctx) return;

  if (!fraccs.length) {
    if (summaryEl) summaryEl.innerHTML = '';
    ctx.parentElement.innerHTML = '<div class="empty-state" style="padding:2rem;"><p class="text-muted">No hay desarrollos registrados aún.</p></div>';
    return;
  }

  const M = 1_000_000;
  const fmt = n => `$${(n / M).toFixed(1)}M`;

  let totalInv = 0, totalRec = 0, totalDisp = 0, totalSep = 0;
  const labels = [], dataInv = [], dataRec = [], dataDisp = [];

  fraccs.forEach(f => {
    let valor = 0, rec = 0, disp = 0, sep = 0;
    f.manzanas.forEach(m => m.lotes.forEach(l => {
      valor += l.precio;
      if (l.estado === 'vendido')    rec  += l.precio;
      if (l.estado === 'disponible') disp += l.precio;
      if (l.estado === 'separado')   sep  += l.precio;
    }));
    const inv = valor * 0.62;
    totalInv  += inv;  totalRec  += rec;  totalDisp += disp; totalSep += sep;
    labels.push(f.nombre.length > 16 ? f.nombre.slice(0, 14) + '…' : f.nombre);
    dataInv.push(Math.round(inv  / M * 10) / 10);
    dataRec.push(Math.round(rec  / M * 10) / 10);
    dataDisp.push(Math.round(disp / M * 10) / 10);
  });

  const pctRec = totalInv > 0 ? Math.round((totalRec / totalInv) * 100) : 0;

  // Summary chips above chart
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="fin-chip">
        <div class="fin-chip-label">Inversión estimada</div>
        <div class="fin-chip-value">${fmt(totalInv)}</div>
        <div class="fin-chip-sub">62% del valor total del inventario</div>
      </div>
      <div class="fin-chip" style="border-color:var(--available-bd);background:var(--available-bg);">
        <div class="fin-chip-label" style="color:var(--available);">Recuperado · ventas</div>
        <div class="fin-chip-value" style="color:var(--available);">${fmt(totalRec)}</div>
        <div class="fin-chip-sub">${pctRec}% de la inversión estimada</div>
      </div>
      <div class="fin-chip" style="border-color:#BFDBFE;background:#EBF4FF;">
        <div class="fin-chip-label" style="color:var(--blue);">Inventario disponible</div>
        <div class="fin-chip-value" style="color:var(--blue);">${fmt(totalDisp)}</div>
        <div class="fin-chip-sub">Potencial pendiente de convertir</div>
      </div>
      ${totalSep > 0 ? `
      <div class="fin-chip" style="border-color:var(--reserved-bd);background:var(--reserved-bg);">
        <div class="fin-chip-label" style="color:var(--reserved);">En separación</div>
        <div class="fin-chip-value" style="color:var(--reserved);">${fmt(totalSep)}</div>
        <div class="fin-chip-sub">Compromisos pendientes de cierre</div>
      </div>` : ''}`;
  }

  financialChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Inversión estimada',    data: dataInv,  backgroundColor: '#CBD5E1', borderRadius: 5 },
        { label: 'Recuperado (ventas)',    data: dataRec,  backgroundColor: '#16A34A', borderRadius: 5 },
        { label: 'Disponible (potencial)', data: dataDisp, backgroundColor: '#2B6CB8', borderRadius: 5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 11 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: $${ctx.raw}M MXN` } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => `$${v}M`, font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

/* ----------------------------------------------------------
   VENDEDORES SECTION (EMPLOYEE DETAILS)
   ---------------------------------------------------------- */
function loadEmployees() {
  const el = document.getElementById('employeesCardGrid');
  if (!el) return;

  const employees = getAllEmployees();

  if (!employees.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><h3>Sin asesores</h3><p>No hay vendedores registrados en el sistema.</p></div>`;
    return;
  }

  el.innerHTML = employees.map(emp => {
    const stats = getEmployeeStats(emp.id);
    const photo = emp.photo 
      ? `<img src="${emp.photo}" alt="${emp.name}">` 
      : (emp.name || emp.id).charAt(0).toUpperCase();

    return `
      <div class="employee-card">
        <div class="employee-avatar">${photo}</div>
        <div class="emp-name">${emp.name || emp.id}</div>
        <div class="emp-user">@${emp.id}</div>
        <div class="emp-sales">${stats.ventas}</div>
        <div class="emp-sales-label">Lotes Vendidos</div>
        <div class="emp-phone">📞 ${emp.phone || 'Sin Teléfono'}</div>
        <div class="emp-stats">
          <div class="emp-stat-item">
            <div class="emp-stat-val">${stats.separaciones}</div>
            <div class="emp-stat-lbl">Separaciones</div>
          </div>
          <div class="emp-stat-item">
            <div class="emp-stat-val">${stats.ventasSemana}</div>
            <div class="emp-stat-lbl">Esta semana</div>
          </div>
          <div class="emp-stat-item">
            <div class="emp-stat-val">${stats.ventasMes}</div>
            <div class="emp-stat-lbl">Este mes</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ----------------------------------------------------------
   HISTORIAL DE VENTAS — mes a mes
   ---------------------------------------------------------- */
function loadSales() {
  const el = document.getElementById('globalSalesList');
  if (!el) return;

  const allSales = getSales();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Build unique sorted month list
  const monthSet = new Set([currentKey]);
  allSales.forEach(s => {
    const d = new Date(s.createdAt);
    monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  });
  const months = Array.from(monthSet).sort().reverse();

  if (!currentSalesMonth || !months.includes(currentSalesMonth)) {
    currentSalesMonth = months[0];
  }

  const mNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mNamesShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  const tabsHtml = months.map(mk => {
    const [y, m] = mk.split('-');
    const label = `${mNamesShort[parseInt(m) - 1]} ${y}`;
    return `<button class="month-tab${mk === currentSalesMonth ? ' active' : ''}" onclick="selectSalesMonth('${mk}')">${label}</button>`;
  }).join('');

  const filtered = allSales.filter(s => {
    const d = new Date(s.createdAt);
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return mk === currentSalesMonth;
  }).reverse();

  const [selY, selM] = currentSalesMonth.split('-');
  const monthLabel = `${mNames[parseInt(selM) - 1]} ${selY}`;

  const tableHtml = !filtered.length
    ? `<div class="empty-state" style="padding:3rem;"><div class="empty-icon" style="font-size:2.5rem;opacity:0.3;">📋</div><h3>Sin registros</h3><p>No hay operaciones registradas en ${monthLabel}.</p></div>`
    : `<div class="table-scroll"><table class="sales-table" style="width:100%;">
        <thead><tr>
          <th>Fecha</th><th>Desarrollo</th><th>Mz</th><th>Lote</th><th>Asesor</th><th>m²</th><th>Precio</th><th>Forma de pago</th><th>Operación</th><th>Cliente</th><th>Contacto</th>
        </tr></thead>
        <tbody>
          ${filtered.map(s => `
            <tr>
              <td class="td-muted" style="white-space:nowrap;">${new Date(s.createdAt).toLocaleDateString('es-MX')}</td>
              <td class="td-bold">${s.fraccNombre}</td>
              <td>${s.manzanaNombre.replace('Manzana ','')}</td>
              <td>L-${String(s.loteNum).padStart(2,'0')}</td>
              <td>${s.vendedorNombre}</td>
              <td>${s.m2} m²</td>
              <td style="font-weight:700;color:var(--blue);">${fmtPrice(s.precio)}</td>
              <td style="white-space:nowrap;">${formatFormaPago(s.formaPago)}${s.enganchePct ? `<span style="color:var(--text-muted);font-size:0.75rem;"> · ${s.enganchePct}% eng.</span>` : ''}</td>
              <td><span class="badge ${s.tipo === 'vendido' ? 'badge-sold' : 'badge-reserved'}">${s.tipo}</span></td>
              <td class="td-bold">${s.compradorNombre}</td>
              <td class="td-muted" style="font-size:0.78rem;">${s.compradorTel || '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

  el.innerHTML = `<div class="month-tabs-bar">${tabsHtml}</div>${tableHtml}`;
}

window.selectSalesMonth = function(mk) {
  currentSalesMonth = mk;
  loadSales();
};

// formatFormaPago is defined in data.js (loads before boss.js)

/* ----------------------------------------------------------
   DEVELOPMENTS LIST (FRACCIONAMIENTOS)
   ---------------------------------------------------------- */
function loadFraccionamientos() {
  const fraccs = getFraccionamientos();
  const el = document.getElementById('bossFraccList');

  if (!fraccs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🏗️</div><h3>Sin fraccionamientos</h3><p>Crea un fraccionamiento en la pestaña "Nuevo Desarrollo".</p></div>`;
    return;
  }

  el.innerHTML = fraccs.map(f => {
    const stats = getFraccStats(f);
    const pctVendido = Math.round((stats.vendidos / stats.total) * 100);
    return `
      <div class="card mb-3">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1rem;">
          <div>
            <span class="label-tag">${f.ubicacion}</span>
            <h2 style="font-size:1.25rem;margin-top:0.5rem;">${f.nombre}</h2>
            <p style="font-size:0.82rem;color:var(--text-muted);margin-top:0.25rem;">${f.sector}</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.5rem;font-weight:900;color:var(--blue);">${stats.disponibles}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">lotes disponibles de ${stats.total}</div>
          </div>
        </div>

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

        <div class="mb-3">
          <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--text-muted);margin-bottom:0.35rem;">
            <span>Avance de comercialización</span><span>${pctVendido}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill green" style="width:${pctVendido}%"></div>
          </div>
        </div>

        <!-- Render Manzanas recursively -->
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
  const cls = lote.estado;
  const onclick = `onclick="goToLot('${fraccId}','${manzId}','${lote.numero}')"`;
  const buyer = lote.comprador ? `<div class="lot-buyer" title="${lote.comprador}">${lote.comprador}</div>` : '';
  return `
    <div class="lot-card ${cls}" ${onclick} title="Ver detalles o editar estado">
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
window.toggleManzana = toggleManzana;

function goToLot(fraccId, manzId, loteNum) {
  window.location.href = `lot-detail.html?fracc=${fraccId}&manz=${manzId}&lot=${loteNum}`;
}
window.goToLot = goToLot;


/* ----------------------------------------------------------
   NUEVO FRACCIONAMIENTO SECTION (HOUSING BUILDER)
   ---------------------------------------------------------- */
function generateManzanaInputs() {
  const select = document.getElementById('numManzanas');
  const container = document.getElementById('manzanasSetupContainer');
  
  if (!select || !container) return;

  const count = parseInt(select.value);
  if (isNaN(count) || count <= 0) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  for (let i = 1; i <= count; i++) {
    html += `
      <div class="manz-setup-row card mb-2" style="padding:1rem;">
        <div class="grid-3 w-full" style="align-items:center;margin-bottom:0;">
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:0.75rem;">Nombre Manzana ${i}</label>
            <input type="text" id="manzName_${i}" value="Manzana ${250 + i}" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:0.75rem;">Vialidad / Calle Principal</label>
            <input type="text" id="manzStreet_${i}" placeholder="Ej. Calle de la Luna" required>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label style="font-size:0.75rem;">Cantidad de Lotes</label>
            <input type="number" id="manzLots_${i}" min="2" max="30" value="8" required>
          </div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}
window.generateManzanaInputs = generateManzanaInputs;

function setupNewFraccForm() {
  const form = document.getElementById('newFraccForm');
  if (!form) return;

  const alertEl = document.getElementById('formAlert');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('fraccNombre').value.trim();
    const ubicación = document.getElementById('fraccLocation').value.trim();
    const sector = document.getElementById('fraccSector').value.trim();
    const desc = document.getElementById('fraccDesc').value.trim();
    const numManz = parseInt(document.getElementById('numManzanas').value);

    if (!nombre || !ubicación || !sector || !desc || isNaN(numManz)) {
      alertEl.textContent = '⚠️ Por favor complete todos los datos generales del desarrollo.';
      alertEl.classList.remove('hidden');
      return;
    }

    // Process manzanas setup
    const manzanasList = [];
    let totalLotesCount = 0;

    for (let i = 1; i <= numManz; i++) {
      const mzNameEl = document.getElementById(`manzName_${i}`);
      const mzStreetEl = document.getElementById(`manzStreet_${i}`);
      const mzLotsEl = document.getElementById(`manzLots_${i}`);

      if (!mzNameEl || !mzStreetEl || !mzLotsEl) {
        alertEl.textContent = '⚠️ Faltan datos en la configuración de manzanas.';
        alertEl.classList.remove('hidden');
        return;
      }

      const mName = mzNameEl.value.trim();
      const mStreet = mzStreetEl.value.trim();
      const mLotsCount = parseInt(mzLotsEl.value);

      if (!mName || !mStreet || isNaN(mLotsCount) || mLotsCount <= 0) {
        alertEl.textContent = `⚠️ Ingrese valores válidos para la Manzana ${i}.`;
        alertEl.classList.remove('hidden');
        return;
      }

      // Generate Lots
      const lotesGenerated = [];
      for (let l = 1; l <= mLotsCount; l++) {
        // Vary surface m2 programmatically to make prices look dynamic
        const bases = [90, 95, 100, 105, 120, 135];
        const m2 = bases[(l + i) % bases.length] + Math.round((Math.random() * 4) * 100) / 100;
        
        // Exterior number increments
        const numExt = String(100 + l * 2);

        // Uses buildLote from data.js
        lotesGenerated.push(buildLote(l, mStreet, numExt, m2));
      }

      const manzId = `manz_${Date.now()}_${i}`;
      manzanasList.push({
        id: manzId,
        nombre: mName,
        numero: String(250 + i),
        lotes: lotesGenerated
      });

      totalLotesCount += mLotsCount;
    }

    alertEl.classList.add('hidden');
    const saveBtn = document.getElementById('saveFraccBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Inicializando Desarrollo...';

    setTimeout(() => {
      const fraccId = `fracc_${Date.now()}`;
      
      const newFracc = {
        id: fraccId,
        nombre,
        sector,
        ubicacion: ubicación,
        descripcion: desc,
        totalLotes: totalLotesCount,
        vendidos: 0,
        separados: 0,
        createdAt: new Date().toISOString(),
        manzanas: manzanasList
      };

      // Add to local storage using helper in data.js
      addFraccionamiento(newFracc);

      // Toast notification
      showToast('success', 'Desarrollo Creado', `El fraccionamiento "${nombre}" ha sido registrado con ${totalLotesCount} lotes.`);

      // Reset form
      form.reset();
      document.getElementById('manzanasSetupContainer').innerHTML = '';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Crear Fraccionamiento';

      // Switch view
      showSection('fraccionamientos');
    }, 800);
  });
}

/* ----------------------------------------------------------
   GESTIÓN DE VENDEDORES
   ---------------------------------------------------------- */
function loadGestionVendedores() {
  const employees = getAllEmployees();
  const el = document.getElementById('gestionEmpList');
  if (!el) return;

  if (!employees.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><h3>Sin vendedores</h3><p>Agrega el primer asesor usando el formulario de arriba.</p></div>`;
    return;
  }

  el.innerHTML = employees.map(emp => {
    const stats = getEmployeeStats(emp.id);
    const avatar = emp.photo
      ? `<img src="${emp.photo}" alt="${emp.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : (emp.name || emp.id).charAt(0).toUpperCase();

    return `
      <div class="emp-gestion-row" id="gRow_${emp.id}">
        <div class="emp-gestion-info">
          <div class="emp-gestion-avatar">${avatar}</div>
          <div>
            <div class="emp-gestion-name">${emp.name || emp.id}</div>
            <div class="emp-gestion-user">@${emp.id} &nbsp;·&nbsp; ${stats.ventas} ventas &nbsp;·&nbsp; ${stats.separaciones} sep.</div>
          </div>
        </div>
        <div class="emp-gestion-actions">
          <button class="btn btn-sm btn-ghost" onclick="toggleShowPass('${emp.id}')">Ver contraseña</button>
          <button class="btn btn-sm btn-ghost" onclick="showResetPass('${emp.id}')">Cambiar contraseña</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteEmployee('${emp.id}')">Eliminar</button>
        </div>
        <div id="passView_${emp.id}" class="pass-view-panel hidden">
          <span style="font-size:0.8rem;color:var(--text-muted);">Contraseña actual:</span>
          <span id="passMask_${emp.id}">••••••••</span>
          <code id="passText_${emp.id}" style="display:none;">${emp.password}</code>
          <button class="btn btn-sm btn-ghost" id="passToggleBtn_${emp.id}" onclick="revealPass('${emp.id}')">Mostrar</button>
        </div>
        <div id="resetPassPanel_${emp.id}" class="reset-pass-panel hidden">
          <input type="text" id="newPass_${emp.id}" placeholder="Nueva contraseña" autocomplete="off">
          <button class="btn btn-sm btn-primary" onclick="doResetPass('${emp.id}')">Guardar</button>
          <button class="btn btn-sm btn-ghost" onclick="hideResetPass('${emp.id}')">Cancelar</button>
        </div>
      </div>`;
  }).join('');
}

window.toggleShowPass = function(userId) {
  document.getElementById(`passView_${userId}`)?.classList.toggle('hidden');
};
window.revealPass = function(userId) {
  const code = document.getElementById(`passText_${userId}`);
  const mask = document.getElementById(`passMask_${userId}`);
  const btn  = document.getElementById(`passToggleBtn_${userId}`);
  if (!code) return;
  const showing = code.style.display !== 'none';
  code.style.display = showing ? 'none' : 'inline';
  if (mask) mask.style.display = showing ? 'inline' : 'none';
  if (btn)  btn.textContent    = showing ? 'Mostrar' : 'Ocultar';
};

window.showResetPass = function(userId) {
  document.getElementById(`resetPassPanel_${userId}`)?.classList.remove('hidden');
};
window.hideResetPass = function(userId) {
  document.getElementById(`resetPassPanel_${userId}`)?.classList.add('hidden');
};
window.doResetPass = function(userId) {
  const inp = document.getElementById(`newPass_${userId}`);
  const newPass = inp?.value.trim();
  if (!newPass) return;
  resetUserPassword(userId, newPass);
  hideResetPass(userId);
  if (inp) inp.value = '';
  showToast('success', 'Contraseña actualizada', `La contraseña de @${userId} ha sido cambiada.`);
};
window.confirmDeleteEmployee = function(userId) {
  const emp = getAllEmployees().find(e => e.id === userId);
  const name = emp?.name || userId;
  if (!confirm(`¿Eliminar al vendedor "${name}" (@${userId})?\n\nEsta acción no se puede deshacer.`)) return;
  const ok = deleteUser(userId);
  if (!ok) { showToast('error', 'Error', 'No se pudo eliminar el usuario.'); return; }
  showToast('info', 'Vendedor eliminado', `${name} ha sido removido del sistema.`);
  loadGestionVendedores();
};

/* ----------------------------------------------------------
   PROSPECTOS GLOBAL (boss view — all employees)
   ---------------------------------------------------------- */
function loadProspectosGlobal() {
  const el = document.getElementById('prospGlobalList');
  if (!el) return;

  const employees = getAllEmployees();
  const filterEmpSel   = document.getElementById('prospFilterEmp');
  const filterStageSel = document.getElementById('prospFilterStage');

  // Populate employee filter options on first load
  if (filterEmpSel && filterEmpSel.options.length <= 1) {
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.id;
      opt.textContent = emp.name || emp.id;
      filterEmpSel.appendChild(opt);
    });
  }

  const filterEmp   = filterEmpSel?.value   || '';
  const filterStage = filterStageSel?.value || '';

  let prospects = getProspects();
  if (filterEmp)   prospects = prospects.filter(p => p.vendedorId === filterEmp);
  if (filterStage) prospects = prospects.filter(p => p.stage === filterStage);

  if (!prospects.length) {
    el.innerHTML = `<div class="empty-state" style="padding:3rem;"><div class="empty-icon" style="font-size:2.5rem;opacity:0.3;">👥</div><h3>Sin prospectos</h3><p>Ningún asesor ha registrado prospectos todavía${filterEmp || filterStage ? ' con los filtros seleccionados' : ''}.</p></div>`;
    return;
  }

  const empMap = {};
  employees.forEach(e => { empMap[e.id] = e.name || e.id; });

  el.innerHTML = `<div class="table-scroll"><table class="sales-table" style="width:100%;">
    <thead><tr>
      <th>Nombre</th><th>Teléfono</th><th>Asesor</th><th>Etapa</th><th>Interés</th><th>Notas</th><th>Actualizado</th>
    </tr></thead>
    <tbody>
      ${prospects.map(p => `
        <tr>
          <td class="td-bold">${p.nombre}</td>
          <td class="td-muted">${p.telefono || '—'}</td>
          <td>${empMap[p.vendedorId] || p.vendedorId}</td>
          <td><span class="prosp-stage-badge stage-${(p.stage||'').toLowerCase().replace(/\s+/g,'-')}">${p.stage}</span></td>
          <td style="font-size:0.8rem;">${p.interes || '—'}</td>
          <td style="font-size:0.78rem;color:var(--text-muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.notas || '—'}</td>
          <td class="td-muted" style="white-space:nowrap;">${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('es-MX') : '—'}</td>
        </tr>`).join('')}
    </tbody>
  </table></div>`;
}
window.loadProspectosGlobal = loadProspectosGlobal;

/* ----------------------------------------------------------
   COMISIONES
   ---------------------------------------------------------- */
function loadComisiones() {
  const cfg = getCommissionConfig();

  // Prefill form
  const pctVentaEl = document.getElementById('commPctVenta');
  const pctSepEl   = document.getElementById('commPctSep');
  if (pctVentaEl) pctVentaEl.value = cfg.pctVenta;
  if (pctSepEl)   pctSepEl.value   = cfg.pctSeparacion;

  // Render team summary + per-employee table
  renderCommissionTable(cfg);

  // Setup config form
  const form = document.getElementById('commConfigForm');
  if (form && !form._initialized) {
    form._initialized = true;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const pv = parseFloat(document.getElementById('commPctVenta').value) || 0;
      const ps = parseFloat(document.getElementById('commPctSep').value)   || 0;
      saveCommissionConfig({ pctVenta: pv, pctSeparacion: ps });
      renderCommissionTable({ pctVenta: pv, pctSeparacion: ps });
      showToast('success', 'Comisiones guardadas', `Venta: ${pv}% · Separación: ${ps}%`);
    });
  }
}

function renderCommissionTable(cfg) {
  const employees = getAllEmployees();
  const sales     = getSales();
  const now       = new Date();
  const monthKey  = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  let teamTotal = 0;
  const rows = employees.map(emp => {
    const empSales = sales.filter(s => s.vendedorId === emp.id);
    const ventas   = empSales.filter(s => s.tipo === 'vendido');
    const seps     = empSales.filter(s => s.tipo === 'separado');
    const commV    = ventas.reduce((a, s) => a + s.precio * cfg.pctVenta / 100, 0);
    const commS    = seps.reduce(  (a, s) => a + s.precio * cfg.pctSeparacion / 100, 0);
    const total    = commV + commS;
    teamTotal     += total;

    // This month
    const monthComm = getCommissionForEmployee(emp.id, monthKey);

    return `<tr>
      <td class="td-bold">${emp.name || emp.id}</td>
      <td>@${emp.id}</td>
      <td style="text-align:center;">${ventas.length}</td>
      <td style="font-weight:600;color:var(--available);">${fmtPrice(commV)}</td>
      <td style="text-align:center;">${seps.length}</td>
      <td style="font-weight:600;color:var(--reserved);">${fmtPrice(commS)}</td>
      <td style="font-weight:800;color:var(--blue);">${fmtPrice(total)}</td>
      <td style="font-size:0.8rem;">${fmtPrice(monthComm.total)} <span style="color:var(--text-muted);font-size:0.7rem;">este mes</span></td>
    </tr>`;
  });

  const summaryEl = document.getElementById('commTeamSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="font-size:2rem;font-weight:900;color:var(--blue);">${fmtPrice(teamTotal)}</div>
      <div style="font-size:0.78rem;color:var(--text-muted);margin-top:0.2rem;">Comisiones totales acumuladas</div>
      <div class="separator"></div>
      <div style="font-size:0.82rem;color:var(--text-muted);">Tasa venta: <strong style="color:var(--text);">${cfg.pctVenta}%</strong> &nbsp;·&nbsp; Tasa separación: <strong style="color:var(--text);">${cfg.pctSeparacion}%</strong></div>`;
  }

  const tableEl = document.getElementById('commTableEl');
  if (!tableEl) return;
  if (!rows.length) {
    tableEl.innerHTML = `<div class="empty-state" style="padding:2rem;"><p>No hay vendedores registrados.</p></div>`;
    return;
  }
  tableEl.innerHTML = `<div class="table-scroll"><table class="sales-table" style="width:100%;">
    <thead><tr>
      <th>Vendedor</th><th>Usuario</th><th>Ventas</th><th>Comisión ventas</th><th>Seps.</th><th>Comisión seps.</th><th>Total acumulado</th><th>Mes actual</th>
    </tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>`;
}

/* ----------------------------------------------------------
   CONFIGURACIÓN DEL SISTEMA
   ---------------------------------------------------------- */
function loadConfiguracion() {
  const emailCfg  = getEmailConfig();
  const sepCfg    = getSepTimerConfig();

  // Email toggle + fields
  const enabledEl = document.getElementById('emailEnabled');
  if (enabledEl) {
    enabledEl.checked = !!emailCfg.enabled;
    document.getElementById('emailConfigFields')?.classList.toggle('hidden', !emailCfg.enabled);
  }
  const fields = ['serviceId','templateId','publicKey','bossEmail'];
  fields.forEach(f => {
    const el = document.getElementById(`cfg${f.charAt(0).toUpperCase()}${f.slice(1)}`);
    if (el) el.value = emailCfg[f] || '';
  });

  // Sep timer
  const warnEl   = document.getElementById('cfgWarnDays');
  const expireEl = document.getElementById('cfgExpireDays');
  if (warnEl)   warnEl.value   = sepCfg.warnDays;
  if (expireEl) expireEl.value = sepCfg.expireDays;

  // Email config form
  const emailForm = document.getElementById('emailConfigForm');
  if (emailForm && !emailForm._initialized) {
    emailForm._initialized = true;
    emailForm.addEventListener('submit', e => {
      e.preventDefault();
      const alertEl = document.getElementById('emailCfgAlert');
      const sId  = document.getElementById('cfgServiceId').value.trim();
      const tId  = document.getElementById('cfgTemplateId').value.trim();
      const pKey = document.getElementById('cfgPublicKey').value.trim();
      const mail = document.getElementById('cfgBossEmail').value.trim();
      if (!sId || !tId || !pKey || !mail) {
        if (alertEl) { alertEl.className = 'alert alert-error'; alertEl.textContent = '⚠️ Todos los campos son requeridos.'; alertEl.classList.remove('hidden'); }
        return;
      }
      saveEmailConfig({ enabled: true, serviceId: sId, templateId: tId, publicKey: pKey, bossEmail: mail });
      if (alertEl) { alertEl.className = 'alert alert-success'; alertEl.textContent = '✓ Configuración guardada. Las notificaciones están activas.'; alertEl.classList.remove('hidden'); }
      showToast('success', 'Notificaciones activas', `Se enviarán alertas a ${mail}`);
    });
  }

  // Sep timer form
  const sepForm = document.getElementById('sepTimerForm');
  if (sepForm && !sepForm._initialized) {
    sepForm._initialized = true;
    sepForm.addEventListener('submit', e => {
      e.preventDefault();
      const warn   = parseInt(document.getElementById('cfgWarnDays').value)   || 20;
      const expire = parseInt(document.getElementById('cfgExpireDays').value) || 30;
      saveSepTimerConfig({ warnDays: warn, expireDays: expire });
      showToast('success', 'Alertas guardadas', `Aviso a los ${warn} días · vence a los ${expire} días`);
    });
  }
}

window.toggleEmailFields = function() {
  const enabled = document.getElementById('emailEnabled')?.checked;
  document.getElementById('emailConfigFields')?.classList.toggle('hidden', !enabled);
  const cfg = getEmailConfig();
  saveEmailConfig({ ...cfg, enabled: !!enabled });
};

/* ----------------------------------------------------------
   SEPARATION TIMER ALERTS (shown in dashboard)
   ---------------------------------------------------------- */
function renderSepTimerAlerts() {
  const expiring = getExpiringSeparations();
  if (!expiring.length) return;

  const cfg = getSepTimerConfig();
  const now = Date.now();

  const items = expiring.map(s => {
    const daysSince = Math.floor((now - new Date(s.fechaTransaccion).getTime()) / 86400000);
    const isExpired = daysSince >= cfg.expireDays;
    const cls = isExpired ? 'sep-alert-expired' : 'sep-alert-warn';
    return `<div class="${cls}">
      <strong>${s.fraccNombre}</strong> · Mz ${s.manzanaNombre} · L-${String(s.loteNum).padStart(2,'0')}
      &nbsp;—&nbsp; <span>${s.comprador}</span>
      &nbsp;·&nbsp; <em>${daysSince} días separado${isExpired ? ' · <strong>VENCIDA</strong>' : ' · próximo a vencer'}</em>
    </div>`;
  }).join('');

  const statsGrid = document.querySelector('.stats-grid');
  if (statsGrid) {
    let alertBox = document.getElementById('sepTimerAlerts');
    if (!alertBox) {
      alertBox = document.createElement('div');
      alertBox.id = 'sepTimerAlerts';
      statsGrid.insertAdjacentElement('beforebegin', alertBox);
    }
    alertBox.innerHTML = `<div class="sep-timer-banner">
      <div style="font-size:0.8rem;font-weight:700;margin-bottom:0.5rem;">
        Separaciones próximas a vencer (${expiring.length})
      </div>
      ${items}
    </div>`;
  }
}

function setupGestionForm() {
  const form    = document.getElementById('addEmpForm');
  if (!form) return;
  const alertEl = document.getElementById('addEmpAlert');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name   = document.getElementById('empFullName').value.trim();
    const userId = document.getElementById('empUserId').value.trim().toLowerCase().replace(/\s+/g, '_');
    const pass   = document.getElementById('empPassword').value.trim();
    const phone  = document.getElementById('empPhone').value.trim();

    if (!name || !userId || !pass) {
      alertEl.className = 'alert alert-error';
      alertEl.textContent = '⚠️ Nombre, usuario y contraseña son obligatorios.';
      alertEl.classList.remove('hidden');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(userId)) {
      alertEl.className = 'alert alert-error';
      alertEl.textContent = '⚠️ El usuario solo puede contener letras minúsculas, números y guiones bajos (_).';
      alertEl.classList.remove('hidden');
      return;
    }

    const success = addUser({
      id:                userId,
      password:          pass,
      role:              'employee',
      name,
      phone,
      email:             '',
      zona:              '',
      profileCreated:    true,
      photo:             null,
      salesCount:        0,
      reservationsCount: 0,
      joinDate:          new Date().toISOString()
    });

    if (!success) {
      alertEl.className = 'alert alert-error';
      alertEl.textContent = `⚠️ El usuario "@${userId}" ya existe. Elige un ID diferente.`;
      alertEl.classList.remove('hidden');
      return;
    }

    alertEl.classList.add('hidden');
    form.reset();
    showToast('success', 'Vendedor creado', `${name} (@${userId}) ha sido agregado al sistema.`);
    loadGestionVendedores();
  });
}

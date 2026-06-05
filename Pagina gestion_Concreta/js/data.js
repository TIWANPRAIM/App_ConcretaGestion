/* ============================================================
   CONCRETA — DATA LAYER
   All data definitions and localStorage management
   ============================================================ */

const DB_KEY   = 'concreta_db';
const SESS_KEY = 'concreta_session';

/* ----------------------------------------------------------
   INITIAL USERS
   ---------------------------------------------------------- */
const INITIAL_USERS = {
  marco_gonzalez: {
    id: 'marco_gonzalez',
    password: '12345',
    role: 'boss',
    name: 'Marco González',
    phone: '',
    email: '',
    profileCreated: true,
    photo: null
  },
  juan_pablodlg: {
    id: 'juan_pablodlg',
    password: '12345',
    role: 'employee',
    name: '',
    phone: '',
    email: '',
    zona: '',
    profileCreated: false,
    photo: null,
    salesCount: 0,
    reservationsCount: 0,
    joinDate: new Date().toISOString()
  }
};

/* ----------------------------------------------------------
   PRICE HELPER
   ---------------------------------------------------------- */
function calcPrice(m2) {
  if (m2 < 91)   return 750000;
  if (m2 < 93)   return 770000;
  if (m2 < 94)   return 790000;
  if (m2 < 96)   return 810000;
  if (m2 < 99)   return 840000;
  if (m2 < 101)  return 870000;
  if (m2 < 104)  return 900000;
  if (m2 < 110)  return 950000;
  if (m2 < 116)  return 1050000;
  if (m2 < 126)  return 1130000;
  if (m2 < 135)  return 1200000;
  if (m2 < 140)  return 1260000;
  if (m2 < 145)  return 1300000;
  return 1390000;
}

function fmtPrice(n) {
  return '$' + n.toLocaleString('es-MX');
}

/* ----------------------------------------------------------
   INITIAL FRACCIONAMIENTO — Villas de Alcalá
   Data from official PDF: 74 viviendas
   ---------------------------------------------------------- */
function buildLote(loteNum, vialidad, numExt, m2) {
  return {
    id: `lote_${loteNum}`,
    numero: loteNum,
    vialidad,
    numExterior: numExt,
    m2,
    precio: calcPrice(m2),
    estado: 'disponible',
    comprador: null,
    compradorTel: null,
    compradorEmail: null,
    vendedor: null,
    fechaTransaccion: null,
    notas: ''
  };
}

const VILLAS_ALCALA = {
  id: 'fracc_001',
  nombre: 'Villas de Alcalá',
  sector: '2do. Sector — Etapa 28, 3ra Parte',
  ubicacion: 'Nuevo León, México',
  descripcion: 'Fraccionamiento privado con acceso controlado, áreas verdes y amenidades premium. 74 viviendas con acabados de calidad en una de las zonas con mayor plusvalía de Nuevo León.',
  totalLotes: 74,
  vendidos: 0,
  separados: 0,
  createdAt: new Date().toISOString(),
  manzanas: [
    {
      id: 'manz_252',
      nombre: 'Manzana 252',
      numero: '252',
      lotes: [
        buildLote(1,  'Lago Buenos Aires', '114', 97.41),
        buildLote(2,  'Lago Buenos Aires', '112', 90.00),
        buildLote(3,  'Lago Buenos Aires', '110', 90.00),
        buildLote(4,  'Lago Buenos Aires', '108', 90.00),
        buildLote(5,  'Lago Buenos Aires', '106', 90.00),
        buildLote(6,  'Lago Buenos Aires', '104', 90.00),
        buildLote(7,  'Lago Buenos Aires', '102', 90.00),
        buildLote(8,  'Lago Buenos Aires', '100', 100.64),
        buildLote(9,  'Lago de Atitlán',   '101', 95.82),
        buildLote(10, 'Lago Turkana',       '301', 103.86),
        buildLote(11, 'Lago Turkana',       '303', 90.00),
        buildLote(12, 'Lago Turkana',       '305', 90.00),
        buildLote(13, 'Lago Turkana',       '307', 90.00),
        buildLote(14, 'Lago Turkana',       '309', 92.47)
      ]
    },
    {
      id: 'manz_253',
      nombre: 'Manzana 253',
      numero: '253',
      lotes: [
        buildLote(1,  'Lago Superior',      '124', 132.21),
        buildLote(2,  'Lago Superior',      '122', 90.732),
        buildLote(3,  'Lago Superior',      '120', 90.732),
        buildLote(4,  'Lago Superior',      '118', 90.732),
        buildLote(5,  'Lago Superior',      '116', 90.732),
        buildLote(6,  'Lago Superior',      '114', 90.732),
        buildLote(7,  'Lago Superior',      '112', 90.732),
        buildLote(8,  'Lago Superior',      '110', 90.732),
        buildLote(9,  'Lago Superior',      '108', 90.732),
        buildLote(10, 'Lago Superior',      '106', 90.732),
        buildLote(11, 'Lago Superior',      '104', 90.732),
        buildLote(12, 'Lago Superior',      '102', 90.732),
        buildLote(13, 'Lago Superior',      '100', 99.92),
        buildLote(14, 'Lago Buenos Aires',  '101', 139.05),
        buildLote(15, 'Lago Buenos Aires',  '103', 90.732),
        buildLote(16, 'Lago Buenos Aires',  '105', 90.732),
        buildLote(17, 'Lago Buenos Aires',  '107', 90.732),
        buildLote(18, 'Lago Buenos Aires',  '109', 90.732),
        buildLote(19, 'Lago Buenos Aires',  '111', 90.732),
        buildLote(20, 'Lago Buenos Aires',  '113', 90.732),
        buildLote(21, 'Lago Buenos Aires',  '115', 90.732),
        buildLote(22, 'Lago Buenos Aires',  '117', 90.732),
        buildLote(23, 'Lago Buenos Aires',  '119', 90.732),
        buildLote(24, 'Lago Buenos Aires',  '121', 98.83)
      ]
    },
    {
      id: 'manz_254',
      nombre: 'Manzana 254',
      numero: '254',
      lotes: [
        buildLote(1,  'Lago de Texcoco',    '122', 154.32),
        buildLote(2,  'Lago de Texcoco',    '120', 93.06),
        buildLote(3,  'Lago de Texcoco',    '118', 93.06),
        buildLote(4,  'Lago de Texcoco',    '116', 93.06),
        buildLote(5,  'Lago de Texcoco',    '114', 93.06),
        buildLote(6,  'Lago de Texcoco',    '112', 93.06),
        buildLote(7,  'Lago de Texcoco',    '110', 93.06),
        buildLote(8,  'Lago de Texcoco',    '108', 93.06),
        buildLote(9,  'Lago de Texcoco',    '106', 93.06),
        buildLote(10, 'Lago de Texcoco',    '104', 93.06),
        buildLote(11, 'Lago de Texcoco',    '102', 93.06),
        buildLote(12, 'Lago de Texcoco',    '100', 130.93),
        buildLote(13, 'Lago Superior',      '101', 125.30),
        buildLote(14, 'Lago Superior',      '103', 93.06),
        buildLote(15, 'Lago Superior',      '105', 93.06),
        buildLote(16, 'Lago Superior',      '107', 93.06),
        buildLote(17, 'Lago Superior',      '109', 93.06),
        buildLote(18, 'Lago Superior',      '111', 93.06),
        buildLote(19, 'Lago Superior',      '113', 93.06),
        buildLote(20, 'Lago Superior',      '115', 93.06),
        buildLote(21, 'Lago Superior',      '117', 93.06),
        buildLote(22, 'Lago Superior',      '119', 93.06),
        buildLote(23, 'Lago Superior',      '121', 93.06),
        buildLote(24, 'Lago Superior',      '123', 93.06),
        buildLote(25, 'Lago Superior',      '125', 115.70)
      ]
    },
    {
      id: 'manz_255',
      nombre: 'Manzana 255',
      numero: '255',
      lotes: [
        buildLote(1,  'Lago de Atitlán',    '106', 144.45),
        buildLote(2,  'Lago de Atitlán',    '104', 95.67),
        buildLote(3,  'Lago de Atitlán',    '102', 91.45),
        buildLote(4,  'Lago de Atitlán',    '100', 89.49),
        buildLote(5,  'Lago de Texcoco',    '101', 94.43),
        buildLote(6,  'Lago de Texcoco',    '103', 101.38),
        buildLote(7,  'Lago de Texcoco',    '105', 101.38),
        buildLote(8,  'Lago de Texcoco',    '107', 101.38),
        buildLote(9,  'Lago de Texcoco',    '109', 101.38),
        buildLote(10, 'Lago de Texcoco',    '111', 101.38),
        buildLote(11, 'Lago de Texcoco',    '113', 124.88)
      ]
    }
  ]
};

/* ----------------------------------------------------------
   DB INIT
   ---------------------------------------------------------- */
function initDB() {
  const existing = localStorage.getItem(DB_KEY);
  if (!existing) {
    const db = {
      users: INITIAL_USERS,
      fraccionamientos: [VILLAS_ALCALA],
      sales: [],          // transaction log
      monthlyTargets: {}  // boss-set monthly goals
    };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
}

function getDB() {
  return JSON.parse(localStorage.getItem(DB_KEY));
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

/* ----------------------------------------------------------
   USER HELPERS
   ---------------------------------------------------------- */
function getUser(userId) {
  return getDB().users[userId] || null;
}

function updateUser(userId, fields) {
  const db = getDB();
  db.users[userId] = { ...db.users[userId], ...fields };
  saveDB(db);
}

function getAllEmployees() {
  const db = getDB();
  return Object.values(db.users).filter(u => u.role === 'employee');
}

/* ----------------------------------------------------------
   FRACCIONAMIENTO HELPERS
   ---------------------------------------------------------- */
function getFraccionamientos() {
  return getDB().fraccionamientos;
}

function getFracc(fraccId) {
  return getDB().fraccionamientos.find(f => f.id === fraccId) || null;
}

function getLote(fraccId, manzId, loteNum) {
  const fracc = getFracc(fraccId);
  if (!fracc) return null;
  const manz = fracc.manzanas.find(m => m.id === manzId);
  if (!manz) return null;
  return manz.lotes.find(l => l.numero === parseInt(loteNum)) || null;
}

function updateLote(fraccId, manzId, loteNum, fields) {
  const db = getDB();
  const fracc = db.fraccionamientos.find(f => f.id === fraccId);
  if (!fracc) return false;
  const manz = fracc.manzanas.find(m => m.id === manzId);
  if (!manz) return false;
  const idx = manz.lotes.findIndex(l => l.numero === parseInt(loteNum));
  if (idx === -1) return false;
  manz.lotes[idx] = { ...manz.lotes[idx], ...fields };

  // Recount fracc stats
  let vendidos = 0, separados = 0;
  fracc.manzanas.forEach(mz => mz.lotes.forEach(lt => {
    if (lt.estado === 'vendido')  vendidos++;
    if (lt.estado === 'separado') separados++;
  }));
  fracc.vendidos  = vendidos;
  fracc.separados = separados;

  saveDB(db);
  return true;
}

function addFraccionamiento(fracc) {
  const db = getDB();
  db.fraccionamientos.push(fracc);
  saveDB(db);
}

/* ----------------------------------------------------------
   SALES LOG
   ---------------------------------------------------------- */
function addSale(entry) {
  const db = getDB();
  db.sales.push({ ...entry, id: 'sale_' + Date.now(), createdAt: new Date().toISOString() });
  saveDB(db);
}

function getSales() {
  return getDB().sales;
}

function getSalesByEmployee(userId) {
  return getSales().filter(s => s.vendedorId === userId);
}

/* ----------------------------------------------------------
   STATS HELPERS
   ---------------------------------------------------------- */
function getManzanaStats(manzana) {
  const total      = manzana.lotes.length;
  const vendidos   = manzana.lotes.filter(l => l.estado === 'vendido').length;
  const separados  = manzana.lotes.filter(l => l.estado === 'separado').length;
  const disponibles = total - vendidos - separados;
  return { total, vendidos, separados, disponibles };
}

function getFraccStats(fracc) {
  let total = 0, vendidos = 0, separados = 0;
  fracc.manzanas.forEach(m => {
    total     += m.lotes.length;
    vendidos  += m.lotes.filter(l => l.estado === 'vendido').length;
    separados += m.lotes.filter(l => l.estado === 'separado').length;
  });
  return { total, vendidos, separados, disponibles: total - vendidos - separados };
}

function getEmployeeStats(userId) {
  const sales = getSalesByEmployee(userId);
  const ventas      = sales.filter(s => s.tipo === 'vendido').length;
  const separaciones = sales.filter(s => s.tipo === 'separado').length;

  const now  = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const ventasSemana = sales.filter(s => s.tipo === 'vendido' && new Date(s.createdAt) >= weekAgo).length;

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const ventasMes = sales.filter(s => {
    const d = new Date(s.createdAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return s.tipo === 'vendido' && k === monthKey;
  }).length;

  return { ventas, separaciones, ventasSemana, ventasMes };
}

/* ----------------------------------------------------------
   USER MANAGEMENT (boss actions)
   ---------------------------------------------------------- */
function addUser(userData) {
  const db = getDB();
  if (db.users[userData.id]) return false;
  db.users[userData.id] = { ...userData };
  saveDB(db);
  return true;
}

function deleteUser(userId) {
  const db = getDB();
  if (!db.users[userId] || db.users[userId].role === 'boss') return false;
  delete db.users[userId];
  saveDB(db);
  return true;
}

function formatFormaPago(fp) {
  const map = {
    contado: 'Contado', infonavit: 'INFONAVIT', fovissste: 'FOVISSSTE',
    bancario: 'Crédito bancario', credito_directo: 'Crédito directo'
  };
  return map[fp] || fp || '—';
}

function resetUserPassword(userId, newPass) {
  const db = getDB();
  if (!db.users[userId]) return false;
  db.users[userId].password = newPass;
  saveDB(db);
  return true;
}

/* Session helpers */
function setSession(userId, role) {
  sessionStorage.setItem(SESS_KEY, JSON.stringify({ userId, role }));
}
function getSession() {
  const s = sessionStorage.getItem(SESS_KEY);
  return s ? JSON.parse(s) : null;
}
function clearSession() {
  sessionStorage.removeItem(SESS_KEY);
}

/* ----------------------------------------------------------
   PROSPECTS CRM
   ---------------------------------------------------------- */
const PROSPECT_STAGES = ['Nuevo contacto', 'Visita agendada', 'Lote mostrado', 'En proceso', 'Cerrado', 'Descartado'];

function addProspect(entry) {
  const db = getDB();
  if (!db.prospects) db.prospects = [];
  db.prospects.push({ ...entry, id: 'prosp_' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  saveDB(db);
}
function getProspects() { return getDB().prospects || []; }
function getProspectsByEmployee(userId) { return getProspects().filter(p => p.vendedorId === userId); }
function updateProspect(id, fields) {
  const db = getDB();
  if (!db.prospects) return false;
  const idx = db.prospects.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.prospects[idx] = { ...db.prospects[idx], ...fields, updatedAt: new Date().toISOString() };
  saveDB(db); return true;
}
function deleteProspect(id) {
  const db = getDB();
  if (!db.prospects) return false;
  const before = db.prospects.length;
  db.prospects = db.prospects.filter(p => p.id !== id);
  saveDB(db); return db.prospects.length < before;
}

/* ----------------------------------------------------------
   COMMISSION CONFIG
   ---------------------------------------------------------- */
function saveCommissionConfig(config) {
  const db = getDB(); db.commissionConfig = config; saveDB(db);
}
function getCommissionConfig() {
  return getDB().commissionConfig || { pctVenta: 2, pctSeparacion: 0.5 };
}
function getCommissionForEmployee(userId, monthKey) {
  const cfg   = getCommissionConfig();
  const sales = getSalesByEmployee(userId);
  const filter = s => {
    const d = new Date(s.createdAt);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === monthKey;
  };
  const ventas     = sales.filter(s => s.tipo === 'vendido'  && filter(s));
  const seps       = sales.filter(s => s.tipo === 'separado' && filter(s));
  const montoVenta = ventas.reduce((acc, s) => acc + s.precio * (cfg.pctVenta / 100), 0);
  const montoSep   = seps.reduce((acc, s)   => acc + s.precio * (cfg.pctSeparacion / 100), 0);
  return { ventas: ventas.length, seps: seps.length, montoVenta, montoSep, total: montoVenta + montoSep };
}

/* ----------------------------------------------------------
   EMAIL NOTIFICATION CONFIG
   ---------------------------------------------------------- */
function saveEmailConfig(config) {
  const db = getDB(); db.emailConfig = config; saveDB(db);
}
function getEmailConfig() {
  return getDB().emailConfig || { enabled: false, bossEmail: '', serviceId: '', templateId: '', publicKey: '' };
}

/* ----------------------------------------------------------
   SEPARATION TIMER CONFIG
   ---------------------------------------------------------- */
function saveSepTimerConfig(config) {
  const db = getDB(); db.sepTimerConfig = config; saveDB(db);
}
function getSepTimerConfig() {
  return getDB().sepTimerConfig || { warnDays: 20, expireDays: 30 };
}
function getExpiringSeparations() {
  const { warnDays } = getSepTimerConfig();
  const results = [];
  getFraccionamientos().forEach(f => {
    f.manzanas.forEach(m => {
      m.lotes.forEach(l => {
        if (l.estado === 'separado' && l.fechaTransaccion) {
          const days = Math.floor((Date.now() - new Date(l.fechaTransaccion)) / 86400000);
          if (days >= warnDays) results.push({ fracc: f, manzana: m, lote: l, days });
        }
      });
    });
  });
  return results.sort((a, b) => b.days - a.days);
}

/* ----------------------------------------------------------
   MONTHLY SALES TARGET
   ---------------------------------------------------------- */
function saveMonthlyTarget(monthKey, target) {
  const db = getDB();
  if (!db.monthlyTargets) db.monthlyTargets = {};
  db.monthlyTargets[monthKey] = target;
  saveDB(db);
}
function getMonthlyTarget(monthKey) {
  const db = getDB();
  return (db.monthlyTargets || {})[monthKey] || 0;
}

/* Global init — runs on every page load */
initDB();

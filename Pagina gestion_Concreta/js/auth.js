/* ============================================================
   CONCRETA — AUTH
   Login validation, session management, redirects
   ============================================================ */

/* Called from login form */
function doLogin(userId, password) {
  const db   = getDB();
  const user = db.users[userId];
  if (!user || user.password !== password) return null;
  return user;
}

/* Require session — redirect to login if missing */
function requireAuth(expectedRole) {
  const sess = getSession();
  if (!sess) {
    window.location.href = 'index.html';
    return null;
  }
  if (expectedRole && sess.role !== expectedRole) {
    window.location.href = sess.role === 'boss' ? 'boss.html' : 'employee.html';
    return null;
  }
  const user = getUser(sess.userId);
  if (!user) {
    clearSession();
    window.location.href = 'index.html';
    return null;
  }
  return { ...sess, user };
}

/* Require employee — also check profile setup */
function requireEmployee() {
  const auth = requireAuth('employee');
  if (!auth) return null;
  if (!auth.user.profileCreated) {
    window.location.href = 'profile-setup.html';
    return null;
  }
  return auth;
}

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/* Toast utility — needs .toast-container div in page */
function showToast(type, title, msg, duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('removing');
    setTimeout(() => t.remove(), 280);
  }, duration);
}

/* Verify employee PIN (their username) */
function verifyPin(inputPin) {
  const sess = getSession();
  return sess && inputPin.trim() === sess.userId;
}

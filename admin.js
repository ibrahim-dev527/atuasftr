/* ============================================================
   admin.js — ATUAS Admin Dashboard
   Features: Login, Realtime data, Search, Filter,
             Delete, Export CSV
   Developed by Ibrahim Mohammed Lotsu | Ibratech
   ============================================================ */

'use strict';

/* ── Credentials (change before production) ─────────────── */
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'atuas123';
const SESSION_KEY = 'atuas_admin_auth';

/* ── State ───────────────────────────────────────────────── */
let allRegistrations = [];   // full dataset from Supabase
let filtered         = [];   // after search / filter
let pendingDeleteId  = null; // id queued for deletion
let realtimeChannel  = null;

/* ── DOM References ──────────────────────────────────────── */
const loginOverlay  = document.getElementById('loginOverlay');
const dashboard     = document.getElementById('dashboard');
const loginAlert    = document.getElementById('loginAlert');
const loginBtn      = document.getElementById('loginBtn');
const l_user        = document.getElementById('l_user');
const l_pass        = document.getElementById('l_pass');
const togglePw      = document.getElementById('togglePw');

const sidebar       = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const logoutBtn     = document.getElementById('logoutBtn');

const searchInput   = document.getElementById('searchInput');
const filterAvail   = document.getElementById('filterAvail');
const filterGender  = document.getElementById('filterGender');
const refreshBtn    = document.getElementById('refreshBtn');
const exportBtn     = document.getElementById('exportBtn');

const tableLoader   = document.getElementById('tableLoader');
const tableBody     = document.getElementById('tableBody');
const emptyState    = document.getElementById('emptyState');
const regTable      = document.getElementById('regTable');
const resultCount   = document.getElementById('resultCount');

const deleteModal   = document.getElementById('deleteModal');
const cancelDelete  = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');

const statTotal     = document.getElementById('statTotal');
const statAvail     = document.getElementById('statAvail');
const statNoAvail   = document.getElementById('statNoAvail');
const statLatest    = document.getElementById('statLatest');

/* ═══════════════════════════════════════════════════════════
   LOGIN LOGIC
   ═══════════════════════════════════════════════════════════ */

/** Check if already logged in via sessionStorage */
function checkSession() {
  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    showDashboard();
  }
}

function showLoginAlert(msg) {
  if (!loginAlert) return;
  loginAlert.textContent = msg;
  loginAlert.classList.remove('hidden');
}

function clearLoginAlert() {
  loginAlert && loginAlert.classList.add('hidden');
}

function setLoginLoading(loading) {
  const text = loginBtn.querySelector('.lb-text');
  const spin = loginBtn.querySelector('.lb-spin');
  loginBtn.disabled = loading;
  text.classList.toggle('hidden',  loading);
  spin.classList.toggle('hidden', !loading);
}

function showDashboard() {
  loginOverlay && loginOverlay.classList.add('gone');
  dashboard && dashboard.classList.remove('hidden');
  loadRegistrations();
  initRealtime();
}

/* Login button click */
loginBtn && loginBtn.addEventListener('click', () => {
  clearLoginAlert();
  const user = l_user.value.trim();
  const pass = l_pass.value;

  if (!user || !pass) {
    showLoginAlert('Please enter both username and password.');
    return;
  }

  setLoginLoading(true);

  // Simulate brief network check feel, then verify
  setTimeout(() => {
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      showDashboard();
    } else {
      showLoginAlert('Invalid username or password. Please try again.');
    }
    setLoginLoading(false);
  }, 800);
});

/* Enter key on login fields */
[l_user, l_pass].forEach(el => {
  el && el.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginBtn && loginBtn.click();
  });
});

/* Toggle password visibility */
togglePw && togglePw.addEventListener('click', () => {
  const isPassword = l_pass.type === 'password';
  l_pass.type = isPassword ? 'text' : 'password';
  togglePw.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

/* Logout */
logoutBtn && logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  if (realtimeChannel) {
    db.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  loginOverlay && loginOverlay.classList.remove('gone');
  dashboard && dashboard.classList.add('hidden');
  if (l_user) l_user.value = '';
  if (l_pass) l_pass.value = '';
});

/* ═══════════════════════════════════════════════════════════
   SIDEBAR TOGGLE (mobile)
   ═══════════════════════════════════════════════════════════ */
sidebarToggle && sidebarToggle.addEventListener('click', () => {
  sidebar && sidebar.classList.toggle('open');
});

/* Close sidebar when clicking outside on mobile */
document.addEventListener('click', e => {
  if (window.innerWidth <= 900
    && sidebar && sidebar.classList.contains('open')
    && !sidebar.contains(e.target)
    && !sidebarToggle.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

/* ═══════════════════════════════════════════════════════════
   DATA — LOAD FROM SUPABASE
   ═══════════════════════════════════════════════════════════ */
async function loadRegistrations() {
  setTableState('loading');

  try {
    const { data, error } = await db
      .from('trip_registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allRegistrations = data || [];
    applyFilters();

  } catch (err) {
    console.error('Supabase fetch error:', err);
    setTableState('error');
  }
}

/* Refresh button */
refreshBtn && refreshBtn.addEventListener('click', () => {
  const icon = refreshBtn.querySelector('svg');
  if (icon) icon.classList.add('spin');
  loadRegistrations().finally(() => {
    setTimeout(() => icon && icon.classList.remove('spin'), 600);
  });
});

/* ═══════════════════════════════════════════════════════════
   FILTER & SEARCH
   ═══════════════════════════════════════════════════════════ */
function applyFilters() {
  const query   = searchInput  ? searchInput.value.toLowerCase().trim()   : '';
  const avFilter= filterAvail  ? filterAvail.value   : '';
  const gFilter = filterGender ? filterGender.value  : '';

  filtered = allRegistrations.filter(row => {
    // Search across name, index, contact
    const matchSearch = !query || [
      row.full_name, row.index_number, row.contact_number
    ].some(v => v && v.toLowerCase().includes(query));

    // Availability filter
    const matchAvail =
      !avFilter ||
      (avFilter === 'yes' && row.availability && row.availability.toLowerCase().startsWith('yes')) ||
      (avFilter === 'no'  && row.availability && row.availability.toLowerCase().startsWith('no'));

    // Gender filter
    const matchGender = !gFilter || row.gender === gFilter;

    return matchSearch && matchAvail && matchGender;
  });

  renderTable();
  updateStats();
}

searchInput  && searchInput.addEventListener('input',  applyFilters);
filterAvail  && filterAvail.addEventListener('change', applyFilters);
filterGender && filterGender.addEventListener('change', applyFilters);

/* ═══════════════════════════════════════════════════════════
   RENDER TABLE
   ═══════════════════════════════════════════════════════════ */
function renderTable() {
  if (!tableBody) return;

  setTableState(filtered.length === 0 ? 'empty' : 'data');

  if (filtered.length === 0) return;

  tableBody.innerHTML = '';

  filtered.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.id = row.id;

    const isYes = row.availability && row.availability.toLowerCase().startsWith('yes');
    const isMale = row.gender === 'Male';

    tr.innerHTML = `
      <td>
        <div class="row-num">${idx + 1}</div>
      </td>
      <td>
        <strong>${escHtml(row.full_name || '—')}</strong>
      </td>
      <td>${escHtml(row.index_number || '—')}</td>
      <td class="col-contact">${escHtml(row.contact_number || '—')}</td>
      <td>
        <span class="badge ${isMale ? 'badge-m' : 'badge-f'}">
          ${isMale ? '♂' : '♀'} ${escHtml(row.gender || '—')}
        </span>
      </td>
      <td>
        <span class="badge ${isYes ? 'badge-yes' : 'badge-no'}">
          ${isYes ? '✅ Attending' : '❌ Not Attending'}
        </span>
      </td>
      <td>${formatDate(row.created_at)}</td>
      <td>
        <button class="del-btn" data-id="${row.id}" aria-label="Delete registration">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Delete
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  // Result count
  if (resultCount) {
    resultCount.textContent = `Showing ${filtered.length} of ${allRegistrations.length} registration${allRegistrations.length !== 1 ? 's' : ''}`;
  }
}

/* Escape HTML to prevent XSS */
function escHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* Format ISO date to readable string */
function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

/* Table State: loading | empty | data | error */
function setTableState(state) {
  tableLoader && tableLoader.classList.toggle('hidden', state !== 'loading');
  emptyState  && emptyState.classList.toggle( 'hidden', state !== 'empty');
  regTable    && regTable.classList.toggle(   'hidden', state === 'loading' || state === 'empty' || state === 'error');

  if (state === 'error' && emptyState) {
    emptyState.classList.remove('hidden');
    emptyState.innerHTML = `
      <span class="es-icon">⚠️</span>
      <h3>Failed to load data</h3>
      <p>Check your Supabase credentials or network connection.</p>
    `;
    regTable && regTable.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════
   STATS CARDS
   ═══════════════════════════════════════════════════════════ */
function updateStats() {
  const total    = allRegistrations.length;
  const attending = allRegistrations.filter(r =>
    r.availability && r.availability.toLowerCase().startsWith('yes')
  ).length;
  const notAtt = total - attending;

  // Latest registration date
  let latestStr = '—';
  if (allRegistrations.length) {
    const latest = allRegistrations.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b
    );
    if (latest.created_at) {
      latestStr = new Date(latest.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
  }

  // Animate count-up
  animateCount(statTotal,   total);
  animateCount(statAvail,   attending);
  animateCount(statNoAvail, notAtt);
  if (statLatest) statLatest.textContent = latestStr;
}

function animateCount(el, target) {
  if (!el) return;
  const duration = 600;
  const start = performance.now();
  const from = parseInt(el.textContent) || 0;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(from + (target - from) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ═══════════════════════════════════════════════════════════
   DELETE — via event delegation
   ═══════════════════════════════════════════════════════════ */
tableBody && tableBody.addEventListener('click', e => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  pendingDeleteId = btn.dataset.id;
  openDeleteModal();
});

function openDeleteModal() {
  deleteModal && deleteModal.classList.remove('hidden');
}
function closeDeleteModal() {
  deleteModal && deleteModal.classList.add('hidden');
  pendingDeleteId = null;
}

cancelDelete && cancelDelete.addEventListener('click', closeDeleteModal);
deleteModal  && deleteModal.addEventListener('click', e => {
  if (e.target === deleteModal) closeDeleteModal();
});

confirmDelete && confirmDelete.addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  confirmDelete.disabled = true;
  confirmDelete.textContent = 'Deleting…';

  try {
    const { error } = await db
      .from('trip_registrations')
      .delete()
      .eq('id', pendingDeleteId);

    if (error) throw error;

    // Remove from local state immediately for instant UI feedback
    allRegistrations = allRegistrations.filter(r => r.id !== pendingDeleteId);
    applyFilters();

  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to delete registration. Please try again.');
  } finally {
    confirmDelete.disabled = false;
    confirmDelete.textContent = 'Yes, Delete';
    closeDeleteModal();
  }
});

/* ═══════════════════════════════════════════════════════════
   EXPORT TO CSV
   ═══════════════════════════════════════════════════════════ */
exportBtn && exportBtn.addEventListener('click', () => {
  if (filtered.length === 0) {
    alert('No data to export.');
    return;
  }

  const headers = [
    'No.', 'Full Name', 'Index Number', 'Contact Number',
    'Gender', 'Availability', 'Date Submitted'
  ];

  const rows = filtered.map((row, idx) => [
    idx + 1,
    csvCell(row.full_name),
    csvCell(row.index_number),
    csvCell(row.contact_number),
    csvCell(row.gender),
    csvCell(row.availability),
    row.created_at ? new Date(row.created_at).toLocaleString('en-GB') : ''
  ]);

  const csvContent =
    [headers, ...rows]
      .map(r => r.join(','))
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');

  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `ATUAS_Trip_Registrations_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/** Wrap cell value in quotes and escape any internal quotes */
function csvCell(val) {
  if (val === undefined || val === null) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/* ═══════════════════════════════════════════════════════════
   REALTIME SUBSCRIPTION
   ═══════════════════════════════════════════════════════════ */
function initRealtime() {
  if (realtimeChannel) return; // already subscribed

  realtimeChannel = db
    .channel('trip_registrations_changes')
    .on(
      'postgres_changes',
      {
        event: '*',           // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'trip_registrations'
      },
      payload => {
        console.log('Realtime event:', payload.eventType, payload);

        if (payload.eventType === 'INSERT') {
          // Prepend new record to the top
          allRegistrations.unshift(payload.new);
          applyFilters();

        } else if (payload.eventType === 'DELETE') {
          allRegistrations = allRegistrations.filter(r => r.id !== payload.old.id);
          applyFilters();

        } else if (payload.eventType === 'UPDATE') {
          const idx = allRegistrations.findIndex(r => r.id === payload.new.id);
          if (idx !== -1) allRegistrations[idx] = payload.new;
          applyFilters();
        }
      }
    )
    .subscribe(status => {
      const badge = document.getElementById('realtimeBadge');
      if (badge) {
        if (status === 'SUBSCRIBED') {
          badge.textContent = '● Live';
          badge.style.color = '#15803d';
        } else {
          badge.textContent = '○ Offline';
          badge.style.color = '#94A3B8';
        }
      }
    });
}

/* ═══════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════ */
checkSession();
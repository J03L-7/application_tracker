/* ===== Data Layer ===== */
const STORAGE_KEY = 'job_applications_v1';

const STATUS_CONFIG = {
  'Applied':      { color: '#3b82f6', bg: '#dbeafe', label: 'Applied' },
  'Phone Screen': { color: '#8b5cf6', bg: '#ede9fe', label: 'Phone Screen' },
  'Interview':    { color: '#f59e0b', bg: '#fef3c7', label: 'Interview' },
  'Technical':    { color: '#ec4899', bg: '#fce7f3', label: 'Technical' },
  'Offer':        { color: '#10b981', bg: '#d1fae5', label: 'Offer' },
  'Rejected':     { color: '#ef4444', bg: '#fee2e2', label: 'Rejected' },
  'Withdrawn':    { color: '#6b7280', bg: '#f1f5f9', label: 'Withdrawn' },
};

const STATUS_ORDER = Object.keys(STATUS_CONFIG);

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch { return []; }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

let apps = loadData();

// Seed with demo data if empty
if (apps.length === 0) {
  const demo = [
    { company: 'Stripe', role: 'Senior Frontend Engineer', status: 'Interview', date: '2026-02-10', location: 'Remote', salary: '$160k–$200k', type: 'Full-time', source: 'LinkedIn', url: '', notes: 'Two rounds done, final round next week.' },
    { company: 'Notion', role: 'Product Engineer', status: 'Phone Screen', date: '2026-02-12', location: 'San Francisco, CA', salary: '$140k–$170k', type: 'Full-time', source: 'Referral', url: '', notes: 'Intro call with recruiter scheduled.' },
    { company: 'Vercel', role: 'Software Engineer', status: 'Applied', date: '2026-02-14', location: 'Remote', salary: '£80k–£100k', type: 'Full-time', source: 'Company Site', url: '', notes: '' },
    { company: 'Figma', role: 'Full-Stack Engineer', status: 'Rejected', date: '2026-01-28', location: 'San Francisco, CA', salary: '$150k–$190k', type: 'Full-time', source: 'LinkedIn', url: '', notes: 'Got to final round but didn\'t make it.' },
    { company: 'Linear', role: 'Frontend Engineer', status: 'Technical', date: '2026-02-08', location: 'Remote', salary: '$130k–$160k', type: 'Full-time', source: 'Twitter/X', url: '', notes: 'Coding challenge submitted.' },
    { company: 'Shopify', role: 'Staff Engineer', status: 'Offer', date: '2026-01-22', location: 'Remote', salary: 'CAD $180k–$220k', type: 'Full-time', source: 'LinkedIn', url: '', notes: 'Received offer! Evaluating.' },
    { company: 'Atlassian', role: 'React Developer', status: 'Applied', date: '2026-02-15', location: 'Sydney, AU', salary: 'AUD $120k–$150k', type: 'Full-time', source: 'Seek', url: '', notes: '' },
    { company: 'Airtable', role: 'Software Engineer II', status: 'Withdrawn', date: '2026-02-01', location: 'San Francisco, CA', salary: '$140k–$165k', type: 'Full-time', source: 'LinkedIn', url: '', notes: 'Withdrew — accepted another offer.' },
  ];
  apps = demo.map(d => ({ ...d, id: generateId() }));
  saveData(apps);
}

/* ===== State ===== */
let currentView = 'dashboard';
let sortKey = 'date';
let sortDir = 'desc';
let filterStatus = '';
let searchQuery = '';
let pendingDeleteId = null;

/* ===== Routing ===== */
function setView(view) {
  currentView = view;
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  const titles = { dashboard: 'Dashboard', applications: 'Applications', kanban: 'Pipeline' };
  document.getElementById('page-title').textContent = titles[view] || view;
  renderContent();
}

/* ===== Render Router ===== */
function renderContent() {
  const area = document.getElementById('content-area');
  if (currentView === 'dashboard') area.innerHTML = renderDashboard();
  else if (currentView === 'applications') area.innerHTML = renderApplicationsView();
  else if (currentView === 'kanban') area.innerHTML = renderKanban();
  attachContentListeners();
}

/* ===== Dashboard ===== */
function renderDashboard() {
  const total = apps.length;
  const active = apps.filter(a => !['Rejected','Withdrawn'].includes(a.status)).length;
  const interviews = apps.filter(a => ['Interview','Technical'].includes(a.status)).length;
  const offers = apps.filter(a => a.status === 'Offer').length;

  const statusCounts = {};
  STATUS_ORDER.forEach(s => statusCounts[s] = 0);
  apps.forEach(a => { statusCounts[a.status] = (statusCounts[a.status] || 0) + 1; });

  const recent = [...apps].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 6);

  // Monthly bar chart data
  const monthMap = {};
  apps.forEach(a => {
    const m = a.date.slice(0, 7);
    monthMap[m] = (monthMap[m] || 0) + 1;
  });
  const months = Object.keys(monthMap).sort().slice(-6);
  const maxCount = Math.max(...months.map(m => monthMap[m]), 1);

  const chartW = 500, chartH = 160, barGap = 8, padL = 30, padB = 30, padT = 10;
  const barW = months.length ? (chartW - padL - barGap * (months.length - 1)) / months.length - barGap : 0;
  const availH = chartH - padB - padT;

  const bars = months.map((m, i) => {
    const val = monthMap[m];
    const bh = (val / maxCount) * availH;
    const x = padL + i * (barW + barGap * 2);
    const y = padT + availH - bh;
    const label = new Date(m + '-01').toLocaleString('default', { month: 'short' });
    return `
      <rect class="chart-bar" x="${x}" y="${y}" width="${barW}" height="${bh}" rx="4" fill="#6366f1" opacity=".85"/>
      <text x="${x + barW/2}" y="${chartH - 10}" text-anchor="middle" font-size="10" fill="#94a3b8">${label}</text>
      <text x="${x + barW/2}" y="${y - 4}" text-anchor="middle" font-size="10" font-weight="600" fill="#6366f1">${val}</text>
    `;
  }).join('');

  // Y-axis labels
  const yLabels = [0, Math.round(maxCount/2), maxCount].map(v => {
    const y = padT + availH - (v / maxCount) * availH;
    return `<text x="${padL - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${v}</text>`;
  }).join('');

  return `
    <div class="stats-grid">
      ${statCard('📋', 'Total Applications', total, '#6366f1', '#e0e7ff')}
      ${statCard('✅', 'Active', active, '#10b981', '#d1fae5')}
      ${statCard('🎤', 'Interviews', interviews, '#f59e0b', '#fef3c7')}
      ${statCard('🎉', 'Offers', offers, '#ec4899', '#fce7f3')}
    </div>

    <div class="dashboard-grid">
      <div>
        <div class="card chart-card" style="margin-bottom:20px">
          <div class="section-title">Applications Over Time</div>
          ${months.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:40px 0">No data yet</p>' : `
          <div class="chart-container" style="overflow-x:auto">
            <svg viewBox="0 0 ${chartW} ${chartH}" width="100%" preserveAspectRatio="xMidYMid meet">
              <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${chartH - padB}" stroke="#e2e8f0" stroke-width="1"/>
              <line x1="${padL}" y1="${chartH - padB}" x2="${chartW}" y2="${chartH - padB}" stroke="#e2e8f0" stroke-width="1"/>
              ${yLabels}
              ${bars}
            </svg>
          </div>`}
        </div>

        <div class="card chart-card">
          <div class="section-title">Recent Applications</div>
          <div class="recent-list">
            ${recent.length === 0
              ? '<p style="color:var(--text-muted);text-align:center;padding:20px 0">No applications yet</p>'
              : recent.map(a => `
              <div class="app-row" data-id="${a.id}" data-action="edit">
                <div class="company-avatar">${a.company[0].toUpperCase()}</div>
                <div class="app-info">
                  <div class="app-company">${escHtml(a.company)}</div>
                  <div class="app-role">${escHtml(a.role)}</div>
                </div>
                <div class="app-meta">
                  <span class="badge badge-${escHtml(a.status)}">${escHtml(a.status)}</span>
                  <span style="font-size:11px;color:var(--text-muted)">${formatDate(a.date)}</span>
                </div>
              </div>`).join('')
            }
          </div>
          ${apps.length > 6 ? `<div style="text-align:center;margin-top:12px"><button class="btn btn-ghost btn-sm" data-action="view-all">View all ${apps.length} applications</button></div>` : ''}
        </div>
      </div>

      <div>
        <div class="card chart-card">
          <div class="section-title">Status Breakdown</div>
          <div style="margin-bottom:16px">${renderDonut(statusCounts)}</div>
          <div class="status-list">
            ${STATUS_ORDER.map(s => {
              const count = statusCounts[s] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const cfg = STATUS_CONFIG[s];
              return `
                <div class="status-row">
                  <div class="status-dot" style="background:${cfg.color}"></div>
                  <span class="status-name">${s}</span>
                  <div class="status-bar-wrap">
                    <div class="status-bar" style="width:${pct}%;background:${cfg.color}"></div>
                  </div>
                  <span class="status-count" style="color:${cfg.color}">${count}</span>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function statCard(icon, label, value, color, bg) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bg};color:${color}">${icon}</div>
      <div class="stat-info">
        <div class="stat-value" style="color:${color}">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    </div>`;
}

function renderDonut(statusCounts) {
  const total = Object.values(statusCounts).reduce((a,b) => a+b, 0);
  if (total === 0) return '<p style="color:var(--text-muted);text-align:center;padding:20px 0">No data</p>';

  const cx = 90, cy = 90, r = 70, stroke = 28;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  let segments = '';

  STATUS_ORDER.forEach(s => {
    const count = statusCounts[s] || 0;
    if (count === 0) return;
    const pct = count / total;
    const dash = pct * circ;
    const cfg = STATUS_CONFIG[s];
    segments += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${cfg.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${-offset}" style="transform-origin:center;transform:rotate(-90deg)"/>`;
    offset += dash;
  });

  return `
    <svg viewBox="0 0 180 180" width="160" height="160" style="display:block;margin:0 auto">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${stroke}"/>
      ${segments}
      <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="22" font-weight="800" fill="#0f172a">${total}</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="11" fill="#94a3b8">Total</text>
    </svg>`;
}

/* ===== Applications Table View ===== */
function renderApplicationsView() {
  let filtered = [...apps];

  if (filterStatus) filtered = filtered.filter(a => a.status === filterStatus);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(a =>
      a.company.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      (a.location || '').toLowerCase().includes(q) ||
      (a.notes || '').toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    let va = a[sortKey] || '', vb = b[sortKey] || '';
    if (sortKey === 'date') { va = va || ''; vb = vb || ''; }
    const cmp = va.toString().localeCompare(vb.toString());
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const sortIcon = dir => dir === 'asc' ? '↑' : '↓';

  const colHeader = (key, label) => {
    const active = sortKey === key;
    return `<th class="sortable${active ? ' sorted' : ''}" data-sort="${key}">${label} <span class="sort-indicator">${active ? sortIcon(sortDir) : '↕'}</span></th>`;
  };

  const statusOptions = STATUS_ORDER.map(s =>
    `<option value="${s}" ${filterStatus === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  const rows = filtered.length === 0
    ? `<tr><td colspan="7"><div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>No applications found</p>
        <span>${searchQuery || filterStatus ? 'Try adjusting your filters' : 'Add your first application to get started'}</span>
      </div></td></tr>`
    : filtered.map(a => `
      <tr>
        <td class="td-company">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="company-avatar" style="width:28px;height:28px;font-size:11px;flex-shrink:0">${a.company[0].toUpperCase()}</div>
            <span>${escHtml(a.company)}</span>
          </div>
        </td>
        <td class="td-role">${escHtml(a.role)}</td>
        <td><span class="badge badge-${escHtml(a.status)}">${escHtml(a.status)}</span></td>
        <td class="td-date">${formatDate(a.date)}</td>
        <td style="color:var(--text-secondary)">${escHtml(a.location || '—')}</td>
        <td style="color:var(--text-secondary)">${escHtml(a.salary || '—')}</td>
        <td>
          <div class="td-actions">
            ${a.url ? `<a href="${escHtml(a.url)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm btn-icon" title="Open job link">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>` : ''}
            <button class="btn btn-ghost btn-sm btn-icon" data-action="edit" data-id="${a.id}" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn btn-ghost btn-sm btn-icon" data-action="delete" data-id="${a.id}" title="Delete" style="color:#ef4444">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('');

  return `
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" type="text" placeholder="Search company, role, location..." value="${escHtml(searchQuery)}" id="search-input" />
      </div>
      <select class="filter-select" id="status-filter">
        <option value="">All Statuses</option>
        ${statusOptions}
      </select>
      <button class="btn btn-primary" id="add-app-btn-inline">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add
      </button>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${colHeader('company', 'Company')}
            ${colHeader('role', 'Role')}
            ${colHeader('status', 'Status')}
            ${colHeader('date', 'Date Applied')}
            <th>Location</th>
            <th>Salary</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:10px;color:var(--text-muted);font-size:12px">
      Showing ${filtered.length} of ${apps.length} application${apps.length !== 1 ? 's' : ''}
    </div>
  `;
}

/* ===== Kanban ===== */
function renderKanban() {
  const byStatus = {};
  STATUS_ORDER.forEach(s => byStatus[s] = []);
  apps.forEach(a => { if (byStatus[a.status]) byStatus[a.status].push(a); });

  const cols = STATUS_ORDER.map(status => {
    const list = byStatus[status];
    const cfg = STATUS_CONFIG[status];
    const cards = list.length === 0
      ? '<div style="padding:8px;text-align:center;color:var(--text-muted);font-size:12px">No applications</div>'
      : list.sort((a,b) => b.date.localeCompare(a.date)).map(a => `
          <div class="kanban-card" data-action="edit" data-id="${a.id}">
            <div class="kanban-card-company">${escHtml(a.company)}</div>
            <div class="kanban-card-role">${escHtml(a.role)}</div>
            <div class="kanban-card-footer">
              <span class="kanban-card-date">${formatDate(a.date)}</span>
              ${a.location ? `<span style="font-size:11px;color:var(--text-muted)">${escHtml(a.location)}</span>` : ''}
            </div>
          </div>`).join('');

    return `
      <div class="kanban-col">
        <div class="kanban-col-header">
          <div class="kanban-col-title">
            <div class="kanban-col-dot" style="background:${cfg.color}"></div>
            ${status}
          </div>
          <span class="kanban-count">${list.length}</span>
        </div>
        <div class="kanban-cards">${cards}</div>
      </div>`;
  }).join('');

  return `<div class="kanban-board">${cols}</div>`;
}

/* ===== Event listeners for rendered content ===== */
function attachContentListeners() {
  // Nav link clicks (view all)
  document.querySelectorAll('[data-action="view-all"]').forEach(el => {
    el.addEventListener('click', () => setView('applications'));
  });

  // Edit app rows
  document.querySelectorAll('[data-action="edit"]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id || el.closest('[data-id]')?.dataset.id;
      if (id) openModal(id);
    });
  });

  // Delete buttons
  document.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      pendingDeleteId = el.dataset.id;
      document.getElementById('delete-overlay').classList.add('open');
    });
  });

  // Sorting
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = key; sortDir = 'asc'; }
      renderContent();
    });
  });

  // Search
  const searchEl = document.getElementById('search-input');
  if (searchEl) {
    searchEl.addEventListener('input', e => {
      searchQuery = e.target.value;
      renderContent();
    });
  }

  // Status filter
  const filterEl = document.getElementById('status-filter');
  if (filterEl) {
    filterEl.addEventListener('change', e => {
      filterStatus = e.target.value;
      renderContent();
    });
  }

  // Inline add button
  const addInline = document.getElementById('add-app-btn-inline');
  if (addInline) addInline.addEventListener('click', () => openModal());
}

/* ===== Modal ===== */
function openModal(id = null) {
  const modal = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('app-form');

  form.reset();
  document.getElementById('form-id').value = '';

  if (id) {
    const app = apps.find(a => a.id === id);
    if (!app) return;
    title.textContent = 'Edit Application';
    document.getElementById('form-id').value = app.id;
    document.getElementById('form-company').value = app.company || '';
    document.getElementById('form-role').value = app.role || '';
    document.getElementById('form-status').value = app.status || 'Applied';
    document.getElementById('form-date').value = app.date || '';
    document.getElementById('form-location').value = app.location || '';
    document.getElementById('form-salary').value = app.salary || '';
    document.getElementById('form-type').value = app.type || '';
    document.getElementById('form-source').value = app.source || '';
    document.getElementById('form-url').value = app.url || '';
    document.getElementById('form-notes').value = app.notes || '';
  } else {
    title.textContent = 'Add Application';
    document.getElementById('form-date').value = today();
  }

  modal.classList.add('open');
  setTimeout(() => document.getElementById('form-company').focus(), 50);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

/* ===== Helpers ===== */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(str) {
  if (!str) return '—';
  try {
    const [y, m, d] = str.split('-');
    return new Date(y, m-1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return str; }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ===== App Initialization ===== */
function init() {
  // Date display
  document.getElementById('date-display').textContent =
    new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Sidebar nav
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      setView(link.dataset.view);
      // Close mobile sidebar
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Sidebar add button
  document.getElementById('add-app-btn').addEventListener('click', () => openModal());

  // Mobile menu toggle
  document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Delete modal
  document.getElementById('delete-close').addEventListener('click', () => {
    document.getElementById('delete-overlay').classList.remove('open');
    pendingDeleteId = null;
  });
  document.getElementById('delete-cancel').addEventListener('click', () => {
    document.getElementById('delete-overlay').classList.remove('open');
    pendingDeleteId = null;
  });
  document.getElementById('delete-confirm').addEventListener('click', () => {
    if (pendingDeleteId) {
      apps = apps.filter(a => a.id !== pendingDeleteId);
      saveData(apps);
      pendingDeleteId = null;
      document.getElementById('delete-overlay').classList.remove('open');
      renderContent();
    }
  });

  // Close delete overlay on background click
  document.getElementById('delete-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('delete-overlay')) {
      document.getElementById('delete-overlay').classList.remove('open');
      pendingDeleteId = null;
    }
  });

  // Form submit
  document.getElementById('app-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('form-id').value;
    const payload = {
      company: document.getElementById('form-company').value.trim(),
      role: document.getElementById('form-role').value.trim(),
      status: document.getElementById('form-status').value,
      date: document.getElementById('form-date').value,
      location: document.getElementById('form-location').value.trim(),
      salary: document.getElementById('form-salary').value.trim(),
      type: document.getElementById('form-type').value,
      source: document.getElementById('form-source').value.trim(),
      url: document.getElementById('form-url').value.trim(),
      notes: document.getElementById('form-notes').value.trim(),
    };

    if (id) {
      const idx = apps.findIndex(a => a.id === id);
      if (idx !== -1) apps[idx] = { ...apps[idx], ...payload };
    } else {
      apps.push({ id: generateId(), ...payload });
    }

    saveData(apps);
    closeModal();
    renderContent();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      document.getElementById('delete-overlay').classList.remove('open');
    }
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
      openModal();
    }
  });

  // Initial render
  renderContent();
}

document.addEventListener('DOMContentLoaded', init);

'use strict';

/* ── Constants ── */
const STORAGE_KEY = 'apptrackr_v2';

const STATUS = {
  'Applied':      { color: '#3b82f6', label: 'Applied' },
  'Phone Screen': { color: '#8b5cf6', label: 'Phone Screen' },
  'Interview':    { color: '#f59e0b', label: 'Interview' },
  'Technical':    { color: '#ec4899', label: 'Technical' },
  'Offer':        { color: '#10b981', label: 'Offer' },
  'Rejected':     { color: '#ef4444', label: 'Rejected' },
  'Withdrawn':    { color: '#64748b', label: 'Withdrawn' },
};
const STATUS_KEYS = Object.keys(STATUS);

/* ── Storage ── */
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* ── State ── */
let apps = load();
let view = 'dashboard';
let sortKey = 'date';
let sortDir = 'desc';
let filterStatus = '';
let searchQ = '';
let pendingDeleteId = null;

/* ── Seed demo data ── */
if (apps.length === 0) {
  const seed = [
    { company: 'Stripe',    domain: 'stripe.com',    role: 'Senior Frontend Engineer', status: 'Interview',    date: '2026-02-10', location: 'Remote',              salary: '$160k–$200k',    type: 'Full-time', source: 'LinkedIn',     url: '', cv: 'CV_Senior_FE_2026.pdf',   contactName: 'Emma Wilson',   contactEmail: 'emma@stripe.com',    contactPhone: '',              description: 'Build and maintain Stripe\'s dashboard products.', notes: 'Two rounds done, final round next week.' },
    { company: 'Stripe',    domain: 'stripe.com',    role: 'Staff Engineer',            status: 'Rejected',    date: '2025-11-04', location: 'San Francisco, CA',   salary: '$220k–$260k',    type: 'Full-time', source: 'Referral',     url: '', cv: 'CV_Staff_2025.pdf',       contactName: 'Emma Wilson',   contactEmail: 'emma@stripe.com',    contactPhone: '',              description: 'Lead engineering on payments infrastructure.',     notes: 'Didn\'t pass system design round.' },
    { company: 'Notion',    domain: 'notion.so',     role: 'Product Engineer',          status: 'Phone Screen', date: '2026-02-12', location: 'San Francisco, CA',   salary: '$140k–$170k',    type: 'Full-time', source: 'Referral',     url: '', cv: 'CV_Product_2026.pdf',     contactName: 'James Park',    contactEmail: 'james.park@notion.so', contactPhone: '+1 415 555 0192', description: 'Work on core editor and collaboration features.',   notes: 'Intro call with recruiter scheduled.' },
    { company: 'Vercel',    domain: 'vercel.com',    role: 'Software Engineer',         status: 'Applied',     date: '2026-02-14', location: 'Remote',              salary: '£80k–£100k',     type: 'Full-time', source: 'Company Site', url: '', cv: 'CV_Senior_FE_2026.pdf',   contactName: '',              contactEmail: '',                   contactPhone: '',              description: '',                                                 notes: '' },
    { company: 'Figma',     domain: 'figma.com',     role: 'Full-Stack Engineer',       status: 'Rejected',    date: '2026-01-28', location: 'San Francisco, CA',   salary: '$150k–$190k',    type: 'Full-time', source: 'LinkedIn',     url: '', cv: 'CV_Senior_FE_2026.pdf',   contactName: 'Priya Sharma',  contactEmail: 'priya@figma.com',    contactPhone: '',              description: 'Build features across Figma\'s design platform.',   notes: 'Got to final round but didn\'t make it.' },
    { company: 'Linear',    domain: 'linear.app',    role: 'Frontend Engineer',         status: 'Technical',   date: '2026-02-08', location: 'Remote',              salary: '$130k–$160k',    type: 'Full-time', source: 'Twitter/X',    url: '', cv: 'CV_Senior_FE_2026.pdf',   contactName: 'Karri Saarinen', contactEmail: 'karri@linear.app',  contactPhone: '',              description: 'Craft the fastest issue tracking experience.',     notes: 'Coding challenge submitted.' },
    { company: 'Shopify',   domain: 'shopify.com',   role: 'Staff Engineer',            status: 'Offer',       date: '2026-01-22', location: 'Remote',              salary: 'CAD $180k–$220k', type: 'Full-time', source: 'LinkedIn',     url: '', cv: 'CV_Staff_2025.pdf',       contactName: 'Tom Hughes',    contactEmail: 'tom.h@shopify.com',  contactPhone: '+1 613 555 0141', description: 'Lead platform infrastructure for Shopify Plus.',   notes: 'Received offer! Evaluating.' },
    { company: 'Atlassian', domain: 'atlassian.com', role: 'React Developer',           status: 'Applied',     date: '2026-02-15', location: 'Sydney, AU',          salary: 'AUD $120k–$150k', type: 'Full-time', source: 'Seek',         url: '', cv: 'CV_Senior_FE_2026.pdf',   contactName: '',              contactEmail: '',                   contactPhone: '',              description: 'Build Jira and Confluence frontend features.',     notes: '' },
  ];
  apps = seed.map(d => ({ id: uid(), ...d }));
  save(apps);
}

/* ── Routing ── */
function setView(v) {
  view = v;
  document.querySelectorAll('.nav-link').forEach(el =>
    el.classList.toggle('active', el.dataset.view === v)
  );
  const titles = { dashboard: 'Dashboard', companies: 'Companies', applications: 'All Applications' };
  document.getElementById('page-title').textContent = titles[v] || v;
  render();
}

function render() {
  const area = document.getElementById('content-area');
  if (view === 'dashboard')    area.innerHTML = renderDashboard();
  else if (view === 'companies')   area.innerHTML = renderCompanies();
  else if (view === 'applications') area.innerHTML = renderApplications();
  attachListeners();
}

/* ── Logo helper ── */
function logoHtml(company, domain, sizeClass = '') {
  const initial = (company || '?')[0].toUpperCase();
  if (domain) {
    return `<div class="co-logo ${sizeClass}">
      <img src="https://logo.clearbit.com/${escAttr(domain)}" alt="${escAttr(company)}" loading="lazy"
           onerror="this.classList.add('errored')"/>
      <span class="fallback">${initial}</span>
    </div>`;
  }
  return `<div class="co-logo ${sizeClass}">${initial}</div>`;
}

/* ── Badge helper ── */
function badge(status) {
  const cls = status.replace(/\s+/g, '-');
  return `<span class="badge badge-${cls}">${escHtml(status)}</span>`;
}

/* ─────────────────────────────
   DASHBOARD
───────────────────────────── */
function renderDashboard() {
  const total     = apps.length;
  const active    = apps.filter(a => !['Rejected','Withdrawn'].includes(a.status)).length;
  const interviews = apps.filter(a => ['Interview','Technical'].includes(a.status)).length;
  const offers    = apps.filter(a => a.status === 'Offer').length;

  const counts = {};
  STATUS_KEYS.forEach(s => counts[s] = 0);
  apps.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });

  const recent = [...apps].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 7);

  /* bar chart */
  const monthMap = {};
  apps.forEach(a => { const m = a.date.slice(0,7); monthMap[m] = (monthMap[m]||0)+1; });
  const months = Object.keys(monthMap).sort().slice(-6);
  const maxV = Math.max(...months.map(m => monthMap[m]), 1);
  const cW = 460, cH = 140, padL = 24, padB = 24, padT = 8, barArea = cW - padL;
  const barW = months.length ? (barArea / months.length) * 0.55 : 0;
  const gap  = months.length ? (barArea / months.length) : 0;
  const aH = cH - padB - padT;

  const bars = months.map((m, i) => {
    const v = monthMap[m];
    const bh = Math.max((v / maxV) * aH, 3);
    const x = padL + i * gap + (gap - barW) / 2;
    const y = padT + aH - bh;
    const lbl = new Date(m + '-02').toLocaleString('default', { month: 'short' });
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="3" fill="#6366f1" opacity=".8"/>
      <text x="${x + barW/2}" y="${cH - 6}" text-anchor="middle" font-size="10" fill="#9ca3af">${lbl}</text>
      ${v > 0 ? `<text x="${x + barW/2}" y="${y - 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#6366f1">${v}</text>` : ''}`;
  }).join('');

  const yLines = [0, Math.round(maxV/2), maxV].map(v => {
    const y = padT + aH - (v/maxV)*aH;
    return `
      <line x1="${padL}" y1="${y}" x2="${cW}" y2="${y}" stroke="#e8ecf0" stroke-width="1"/>
      <text x="${padL - 4}" y="${y + 4}" text-anchor="end" font-size="9" fill="#9ca3af">${v}</text>`;
  }).join('');

  /* donut */
  const cx = 70, cy = 70, r = 54, sw = 22, circ = 2 * Math.PI * r;
  let off = 0;
  const segs = STATUS_KEYS.map(s => {
    const cnt = counts[s];
    if (!cnt) return '';
    const pct = cnt / total;
    const d   = pct * circ;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${STATUS[s].color}"
      stroke-width="${sw}" stroke-dasharray="${d} ${circ}" stroke-dashoffset="${-off}"
      style="transform-origin:center;transform:rotate(-90deg)" data-action="filter-status" data-status="${s}" style="cursor:pointer"/>`;
    off += d;
    return seg;
  }).join('');

  return `
    <div class="stats-row">
      ${statCard('Total', total, '#6366f1', '#e0e7ff', iconList())}
      ${statCard('Active', active, '#10b981', '#d1fae5', iconCheck())}
      ${statCard('Interviews', interviews, '#f59e0b', '#fef3c7', iconUsers())}
      ${statCard('Offers', offers, '#ec4899', '#fce7f3', iconStar())}
    </div>

    <div class="dash-grid">
      <div style="display:flex;flex-direction:column;gap:16px">

        <div class="panel">
          <div class="panel-title">Applications over time</div>
          ${months.length === 0
            ? '<div class="empty"><span>No data yet</span></div>'
            : `<svg class="chart-svg" viewBox="0 0 ${cW} ${cH}" preserveAspectRatio="xMidYMid meet">
                ${yLines}${bars}
               </svg>`}
        </div>

        <div class="panel">
          <div class="panel-title">
            Recent applications
            <button class="btn btn-ghost btn-sm" data-action="goto-applications">View all</button>
          </div>
          <div class="activity-list">
            ${recent.length === 0
              ? '<div class="empty"><span>No applications yet</span></div>'
              : recent.map(a => `
                <div class="activity-item" data-action="edit" data-id="${a.id}">
                  <div class="activity-logo">${logoHtml(a.company, a.domain, 'sm')}</div>
                  <div class="activity-info">
                    <div class="activity-company">${escHtml(a.company)}</div>
                    <div class="activity-role">${escHtml(a.role)}</div>
                  </div>
                  <div class="activity-right">
                    ${badge(a.status)}
                    <span class="activity-date">${fmtDate(a.date)}</span>
                  </div>
                </div>`).join('')}
          </div>
        </div>

      </div>

      <div class="panel">
        <div class="panel-title">Status breakdown</div>
        <div class="donut-wrap">
          <svg viewBox="0 0 ${cx*2} ${cy*2}" width="140" height="140" style="flex-shrink:0">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="${sw}"/>
            ${total > 0 ? segs : ''}
            <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="20" font-weight="800" fill="#111827">${total}</text>
            <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="10" fill="#9ca3af">Total</text>
          </svg>
          <div class="donut-legend">
            ${STATUS_KEYS.map(s => {
              const cnt = counts[s];
              return `<div class="legend-row" data-action="filter-status" data-status="${s}">
                <div class="legend-dot" style="background:${STATUS[s].color}"></div>
                <span class="legend-name">${s}</span>
                <span class="legend-count" style="color:${STATUS[s].color}">${cnt}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

function statCard(label, value, color, bg, icon) {
  return `
    <div class="stat-card">
      <div class="stat-icon-wrap" style="background:${bg};color:${color}">${icon}</div>
      <div class="stat-value" style="color:${color}">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
}

/* ─────────────────────────────
   COMPANIES VIEW
───────────────────────────── */
function renderCompanies() {
  const companyMap = {};
  apps.forEach(a => {
    const key = a.company.trim().toLowerCase();
    if (!companyMap[key]) companyMap[key] = { name: a.company, domain: a.domain || '', apps: [] };
    if (a.domain && !companyMap[key].domain) companyMap[key].domain = a.domain;
    companyMap[key].apps.push(a);
  });

  const companies = Object.values(companyMap).sort((a, b) => {
    const aD = Math.max(...a.apps.map(x => new Date(x.date || 0).getTime()));
    const bD = Math.max(...b.apps.map(x => new Date(x.date || 0).getTime()));
    return bD - aD;
  });

  if (companies.length === 0) {
    return `<div class="empty">
      ${iconInbox()}
      <strong>No applications yet</strong>
      <span>Add your first application to get started</span>
    </div>`;
  }

  const cards = companies.map(co => {
    const latestStatus = co.apps.sort((a,b)=>b.date.localeCompare(a.date))[0].status;
    const locations = [...new Set(co.apps.map(a=>a.location).filter(Boolean))].join(', ');
    const appRows = co.apps
      .sort((a,b) => b.date.localeCompare(a.date))
      .map(a => `
        <div class="company-app-row" data-action="edit" data-id="${a.id}">
          <span class="car-role">${escHtml(a.role)}</span>
          <div class="car-meta">
            ${a.cv ? `<span class="car-cv" title="${escAttr(a.cv)}">${escHtml(a.cv)}</span>` : ''}
            <span class="car-date">${fmtDate(a.date)}</span>
            ${badge(a.status)}
            <div class="car-actions">
              <button class="icon-btn" data-action="edit" data-id="${a.id}" title="Edit">
                ${iconEdit()}
              </button>
              <button class="icon-btn danger" data-action="delete" data-id="${a.id}" title="Delete">
                ${iconTrash()}
              </button>
            </div>
          </div>
        </div>`).join('');

    return `
      <div class="company-card" id="co-${escAttr(co.name.replace(/\s+/g,'_'))}">
        <div class="company-card-header" data-action="toggle-company">
          ${logoHtml(co.name, co.domain, 'lg')}
          <div class="company-card-info">
            <div class="company-card-name">${escHtml(co.name)}</div>
            <div class="company-card-meta">${locations || 'No location'}</div>
          </div>
          <div class="company-card-right">
            ${badge(latestStatus)}
            <span class="count-pill">${co.apps.length} app${co.apps.length !== 1 ? 's' : ''}</span>
            <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>
        <div class="company-card-body">${appRows}</div>
      </div>`;
  }).join('');

  return `
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="search-input" type="text" placeholder="Search companies..." value="${escAttr(searchQ)}"/>
      </div>
      <button class="btn btn-primary" id="add-app-btn-inline">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New
      </button>
    </div>
    <div class="companies-grid">${cards}</div>`;
}

/* ─────────────────────────────
   APPLICATIONS TABLE
───────────────────────────── */
function renderApplications() {
  let filtered = [...apps];
  if (filterStatus) filtered = filtered.filter(a => a.status === filterStatus);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter(a =>
      a.company.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      (a.location||'').toLowerCase().includes(q) ||
      (a.cv||'').toLowerCase().includes(q)
    );
  }
  filtered.sort((a,b) => {
    const va = (a[sortKey]||'').toString(), vb = (b[sortKey]||'').toString();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const th = (key, label) => {
    const active = sortKey === key;
    const arrow = active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return `<th class="sortable${active?' sorted':''}" data-sort="${key}">${label}${arrow}</th>`;
  };

  const opts = STATUS_KEYS.map(s =>
    `<option value="${s}" ${filterStatus===s?'selected':''}>${s}</option>`
  ).join('');

  const rows = filtered.length === 0
    ? `<tr><td colspan="8"><div class="empty">
        ${iconInbox()}
        <strong>${searchQ||filterStatus ? 'No matches' : 'No applications yet'}</strong>
        <span>${searchQ||filterStatus ? 'Try adjusting your filters' : 'Click "New Application" to get started'}</span>
      </div></td></tr>`
    : filtered.map(a => `
      <tr>
        <td>
          <div class="td-company-cell">
            ${logoHtml(a.company, a.domain, 'sm')}
            <span class="td-company-name">${escHtml(a.company)}</span>
          </div>
        </td>
        <td class="td-role">${escHtml(a.role)}</td>
        <td>${badge(a.status)}</td>
        <td class="td-date">${fmtDate(a.date)}</td>
        <td style="font-size:12px;color:var(--text-3)">${escHtml(a.location||'—')}</td>
        <td style="font-size:12px;color:var(--text-3);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escAttr(a.cv||'')}">${escHtml(a.cv||'—')}</td>
        <td style="font-size:12px;color:var(--text-3)">${escHtml(a.contactName||'—')}</td>
        <td>
          <div class="td-actions">
            ${a.url ? `<a href="${escAttr(a.url)}" target="_blank" rel="noopener noreferrer" class="icon-btn" title="View job posting">${iconLink()}</a>` : ''}
            <button class="icon-btn" data-action="edit"   data-id="${a.id}" title="Edit">${iconEdit()}</button>
            <button class="icon-btn danger" data-action="delete" data-id="${a.id}" title="Delete">${iconTrash()}</button>
          </div>
        </td>
      </tr>`).join('');

  return `
    <div class="toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" id="search-input" type="text" placeholder="Search by company, role, location, CV..." value="${escAttr(searchQ)}"/>
      </div>
      <select class="filter-select" id="status-filter">
        <option value="">All statuses</option>${opts}
      </select>
      <button class="btn btn-primary" id="add-app-btn-inline">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New
      </button>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${th('company','Company')}
            ${th('role','Role')}
            ${th('status','Status')}
            ${th('date','Date')}
            <th>Location</th>
            <th>CV Used</th>
            <th>Contact</th>
            <th style="text-align:right">Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="result-count">Showing ${filtered.length} of ${apps.length} application${apps.length!==1?'s':''}</div>`;
}

/* ── Attach event listeners after each render ── */
function attachListeners() {
  // Edit
  document.querySelectorAll('[data-action="edit"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openModal(el.dataset.id || el.closest('[data-id]')?.dataset.id);
    });
  });

  // Delete
  document.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      pendingDeleteId = el.dataset.id;
      document.getElementById('delete-overlay').classList.add('open');
    });
  });

  // Toggle company cards
  document.querySelectorAll('[data-action="toggle-company"]').forEach(el => {
    el.addEventListener('click', () => el.closest('.company-card').classList.toggle('open'));
  });

  // Sorting
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = k; sortDir = 'asc'; }
      render();
    });
  });

  // Search
  const si = document.getElementById('search-input');
  if (si) si.addEventListener('input', e => { searchQ = e.target.value; render(); });

  // Status filter
  const sf = document.getElementById('status-filter');
  if (sf) sf.addEventListener('change', e => { filterStatus = e.target.value; render(); });

  // Inline add button
  const ai = document.getElementById('add-app-btn-inline');
  if (ai) ai.addEventListener('click', () => openModal());

  // Legend / donut filter
  document.querySelectorAll('[data-action="filter-status"]').forEach(el => {
    el.addEventListener('click', () => {
      filterStatus = el.dataset.status;
      setView('applications');
    });
  });

  // View all
  document.querySelectorAll('[data-action="goto-applications"]').forEach(el => {
    el.addEventListener('click', () => setView('applications'));
  });
}

/* ── Modal ── */
function openModal(id = null) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('app-form').reset();
  document.getElementById('form-id').value = '';
  document.getElementById('modal-subtitle').textContent = '';

  if (id) {
    const a = apps.find(x => x.id === id);
    if (!a) return;
    document.getElementById('modal-title').textContent = 'Edit Application';
    document.getElementById('modal-subtitle').textContent = `${a.company} · ${a.role}`;
    document.getElementById('form-id').value           = a.id;
    document.getElementById('form-company').value      = a.company || '';
    document.getElementById('form-role').value         = a.role || '';
    document.getElementById('form-status').value       = a.status || 'Applied';
    document.getElementById('form-date').value         = a.date || '';
    document.getElementById('form-location').value     = a.location || '';
    document.getElementById('form-salary').value       = a.salary || '';
    document.getElementById('form-type').value         = a.type || '';
    document.getElementById('form-source').value       = a.source || '';
    document.getElementById('form-domain').value       = a.domain || '';
    document.getElementById('form-url').value          = a.url || '';
    document.getElementById('form-cv').value           = a.cv || '';
    document.getElementById('form-description').value  = a.description || '';
    document.getElementById('form-contact-name').value  = a.contactName || '';
    document.getElementById('form-contact-email').value = a.contactEmail || '';
    document.getElementById('form-contact-phone').value = a.contactPhone || '';
    document.getElementById('form-notes').value        = a.notes || '';
  } else {
    document.getElementById('modal-title').textContent = 'New Application';
    document.getElementById('form-date').value = today();
  }

  overlay.classList.add('open');
  setTimeout(() => document.getElementById('form-company').focus(), 60);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

/* ── Helpers ── */
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function escAttr(s) { return escHtml(s); }

function fmtDate(str) {
  if (!str) return '—';
  try {
    const [y,m,d] = str.split('-').map(Number);
    return new Date(y, m-1, d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
  } catch { return str; }
}

function today() { return new Date().toISOString().slice(0,10); }

/* ── SVG icon helpers ── */
const iconList  = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="18" r="1"/></svg>`;
const iconCheck = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const iconUsers = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`;
const iconStar  = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const iconEdit  = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const iconTrash = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
const iconLink  = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const iconInbox = () => `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>`;

/* ── Init ── */
function init() {
  document.getElementById('date-display').textContent =
    new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  // Sidebar nav
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      setView(link.dataset.view);
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Sidebar new button
  document.getElementById('add-app-btn').addEventListener('click', () => openModal());

  // Mobile menu
  document.getElementById('menu-toggle').addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('open')
  );

  // Modal close
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Delete modal
  const delOverlay = document.getElementById('delete-overlay');
  document.getElementById('delete-close').addEventListener('click',  () => { delOverlay.classList.remove('open'); pendingDeleteId = null; });
  document.getElementById('delete-cancel').addEventListener('click', () => { delOverlay.classList.remove('open'); pendingDeleteId = null; });
  delOverlay.addEventListener('click', e => { if (e.target === delOverlay) { delOverlay.classList.remove('open'); pendingDeleteId = null; } });
  document.getElementById('delete-confirm').addEventListener('click', () => {
    if (!pendingDeleteId) return;
    apps = apps.filter(a => a.id !== pendingDeleteId);
    save(apps);
    pendingDeleteId = null;
    delOverlay.classList.remove('open');
    render();
  });

  // Form submit
  document.getElementById('app-form').addEventListener('submit', e => {
    e.preventDefault();
    const id = document.getElementById('form-id').value;
    const payload = {
      company:      document.getElementById('form-company').value.trim(),
      role:         document.getElementById('form-role').value.trim(),
      status:       document.getElementById('form-status').value,
      date:         document.getElementById('form-date').value,
      location:     document.getElementById('form-location').value.trim(),
      salary:       document.getElementById('form-salary').value.trim(),
      type:         document.getElementById('form-type').value,
      source:       document.getElementById('form-source').value.trim(),
      domain:       document.getElementById('form-domain').value.trim().replace(/^https?:\/\//,'').split('/')[0],
      url:          document.getElementById('form-url').value.trim(),
      cv:           document.getElementById('form-cv').value.trim(),
      description:  document.getElementById('form-description').value.trim(),
      contactName:  document.getElementById('form-contact-name').value.trim(),
      contactEmail: document.getElementById('form-contact-email').value.trim(),
      contactPhone: document.getElementById('form-contact-phone').value.trim(),
      notes:        document.getElementById('form-notes').value.trim(),
    };
    if (id) {
      const idx = apps.findIndex(a => a.id === id);
      if (idx !== -1) apps[idx] = { ...apps[idx], ...payload };
    } else {
      apps.push({ id: uid(), ...payload });
    }
    save(apps);
    closeModal();
    render();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      document.getElementById('delete-overlay').classList.remove('open');
    }
    if (e.key === 'n' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey) {
      openModal();
    }
  });

  render();
}

document.addEventListener('DOMContentLoaded', init);

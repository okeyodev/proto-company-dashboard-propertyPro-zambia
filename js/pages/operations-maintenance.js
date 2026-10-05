/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/operations-maintenance.js
 * ToR 8.7 — Maintenance & Facilities
 * ============================================================================
 * Handles: Reactive vs Preventive toggle, severity/status filters, SLA timer,
 * drawer (photo proof, contractor dropdown, SLA log, complete), CRUD + saveState,
 * CSV export, cost/m2 KPI, breadcrumbs clickable via Layout.js
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCommon === "function") initCommon("operations-maintenance");

  // Ensure global elements and breadcrumbs clickable
  setTimeout(() => {
    if (window.Layout && typeof window.Layout.init === "function") {
      // Layout already init via initCommon, ensure breadcrumbs clickable
      const bc = document.getElementById('app-breadcrumb');
      if (bc) {
        bc.querySelectorAll('a').forEach(a => {
          a.style.cursor = 'pointer';
          a.style.textDecoration = 'none';
        });
      }
    }
  }, 100);

  // ---------- State Helpers ----------
  const getState = () => window.state || {};
  const save = () => { if (window.saveState) window.saveState(); };

  function ensureOperationsData() {
    const st = getState();
    if (!st.maintenance || st.maintenance.length < 3 || !st.maintenance[0].contractorId) {
      if (typeof generateOperationsMockData === 'function' && st.properties && st.units) {
        const ops = generateOperationsMockData(st.properties, st.units);
        st.maintenance = ops.maintenance;
        if (!st.contractors) st.contractors = ops.contractors;
        if (!st.insurancePolicies) st.insurancePolicies = ops.insurancePolicies;
        if (!st.valuations) st.valuations = ops.valuations;
        if (!st.developmentProjects) st.developmentProjects = ops.developmentProjects;
        save();
      } else if (st.maintenance && st.maintenance.length === 2) {
        // Quick upgrade legacy 2-item mock to new schema
        st.maintenance = st.maintenance.map((m, i) => ({
          ...m,
          propertyId: m.propertyId || (st.properties[i % st.properties.length]?.id) || "P-001",
          unitId: m.unitId || `${m.propertyId || "P-001"}-U-001`,
          description: m.description || m.issue,
          category: m.category || "HVAC",
          severity: m.severity || m.priority || "High",
          slaDays: m.slaDays || parseInt(m.sla) || 2,
          slaHours: (m.slaDays || 2) * 24,
          reportedDate: m.reportedDate || new Date(Date.now() - 86400000*2).toISOString().slice(0,10),
          dueDate: m.dueDate || new Date(Date.now() + 86400000*1).toISOString().slice(0,10),
          contractorId: m.contractorId || "CTR-001",
          contractorName: m.contractorName || m.contractor || "ColdTech Zambia Ltd",
          costEstimated: m.costEstimated || m.cost || 5000,
          costActual: m.costActual || 0,
          maintenanceType: m.maintenanceType || "Reactive",
          city: m.city || "Lusaka"
        }));
        save();
      }
    }
    if (!st.contractors || st.contractors.length === 0) {
      st.contractors = [
        { id: "CTR-001", name: "ColdTech Zambia Ltd", specialty: "HVAC", rating: 4.5 },
        { id: "CTR-002", name: "Lusaka Plumbing Solutions", specialty: "Plumbing", rating: 4.2 },
        { id: "CTR-003", name: "Zambia Electrical & Power", specialty: "Electrical", rating: 4.7 },
        { id: "CTR-004", name: "BuildWell Construction", specialty: "Civil", rating: 4.4 },
        { id: "CTR-005", name: "SecureGuard Services", specialty: "Security", rating: 4.0 },
      ];
      save();
    }
  }
  ensureOperationsData();

  // ---------- DOM ----------
  const kpiGrid = document.getElementById('kpiGrid');
  const tbody = document.getElementById('maintenanceTbody');
  const countLabel = document.getElementById('countLabel');
  const totalCostLabel = document.getElementById('totalCostLabel');
  const avgCostLabel = document.getElementById('avgCostLabel');
  const tableInfo = document.getElementById('tableInfo');
  const slaBreachCount = document.getElementById('slaBreachCount');

  const searchInput = document.getElementById('searchInputLocal');
  const filterProperty = document.getElementById('filterProperty');
  const filterSeverity = document.getElementById('filterSeverity');
  const filterStatus = document.getElementById('filterStatus');
  const filterCategory = document.getElementById('filterCategory');
  const typeToggle = document.getElementById('typeToggle');
  const pageSizeSel = document.getElementById('pageSize');

  const drawer = document.getElementById('mntDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const ctxMenu = document.getElementById('ctxMenu');

  let currentType = 'all';
  let currentPage = 1;
  let pageSize = 50;
  let selectedTicketId = null;
  let editingTicketId = null;

  // ---------- Populate Property Filter ----------
  function populateFilters() {
    const st = getState();
    const props = st.properties || [];
    const propOptions = ['<option value="">All Properties</option>'].concat(
      props.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (${p.city})</option>`)
    );
    if (filterProperty) filterProperty.innerHTML = propOptions.join('');
    const mProp = document.getElementById('mProperty');
    if (mProp) mProp.innerHTML = '<option value="">Select Property</option>' + props.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    const contractors = st.contractors || [];
    const cSelect = document.getElementById('mContractor');
    if (cSelect) {
      cSelect.innerHTML = '<option value="">Internal Team / TBD</option>' +
        contractors.map(c => `<option value="${c.id}">${escapeHtml(c.name)} - ${c.specialty} (${c.rating}★)</option>`).join('');
    }
  }

  // ---------- SLA Logic ----------
  function getSLAStatus(ticket) {
    const now = new Date(); now.setHours(0,0,0,0);
    const due = ticket.dueDate ? new Date(ticket.dueDate) : null;
    if (!due) return { label: 'No SLA', cls: 'on-track', days: 0, breached: false };
    due.setHours(0,0,0,0);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000*60*60*24));
    const isClosed = ['Completed','Closed','Cancelled'].includes(ticket.status);

    if (isClosed) return { label: 'Completed', cls: 'completed', days: diffDays, breached: false };
    if (diffDays < 0) return { label: `Overdue ${Math.abs(diffDays)}d`, cls: 'overdue', days: diffDays, breached: true };
    if (diffDays === 0) return { label: 'Due Today', cls: 'due-today', days: diffDays, breached: false };
    if (diffDays <= 2) return { label: `Due in ${diffDays}d`, cls: 'due-soon', days: diffDays, breached: false };
    return { label: `Due in ${diffDays}d`, cls: 'on-track', days: diffDays, breached: false };
  }

  function renderSLABadge(ticket) {
    const s = getSLAStatus(ticket);
    return `<span class="sla-badge ${s.cls}">${escapeHtml(s.label)}</span>`;
  }

  function severityPill(sev) {
    const map = {
      'Critical': 'critical',
      'High': 'high',
      'Medium': 'medium',
      'Low': 'low'
    };
    const cls = map[sev] || 'gray';
    return `<span class="pill ${cls}">${escapeHtml(sev||'Medium')}</span>`;
  }

  function statusPill(st) {
    const map = {
      'Open': 'blue',
      'In Progress': 'amber',
      'Pending Parts': 'violet',
      'Completed': 'green',
      'Closed': 'gray',
      'Cancelled': 'slate'
    };
    const cls = map[st] || 'gray';
    return `<span class="pill ${cls}">${escapeHtml(st||'Open')}</span>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // ---------- KPIs ----------
  function renderKPIs(filtered) {
    const st = getState();
    const all = st.maintenance || [];
    const now = new Date();
    const thirtyDays = new Date(); thirtyDays.setDate(now.getDate()+30);

    const openWO = all.filter(t => ['Open','In Progress','Pending Parts'].includes(t.status)).length;
    const breaches = all.filter(t => getSLAStatus(t).breached).length;
    const total = all.length || 1;
    const compliance = ((total - breaches)/total*100).toFixed(1);

    const preventiveDue = all.filter(t => {
      const isPreventive = (t.maintenanceType || t.type) === 'Preventive' || (t.category && ['Lifts','Fire Safety','HVAC'].includes(t.category));
      const due = t.dueDate ? new Date(t.dueDate) : null;
      return isPreventive && due && due >= now && due <= thirtyDays && !['Completed','Closed','Cancelled'].includes(t.status);
    }).length;

    const totalCostActual = all.reduce((s,t) => s + (t.costActual || t.costEstimated || 0),0);
    // Estimate total GLA: 80m2 per unit average
    const totalUnits = (st.properties||[]).reduce((s,p)=> s + (p.units||0),0) || 1000;
    const avgGLAPerUnit = 80;
    const totalM2 = totalUnits * avgGLAPerUnit;
    const avgCostM2 = totalM2 ? (totalCostActual / totalM2).toFixed(2) : '0';

    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi accent-blue"><div class="kpi-top"><div class="kpi-label">Open Work Orders</div><div class="kpi-icon blue">🔧</div></div><div class="kpi-value">${openWO}</div><div class="kpi-meta">${breaches} SLA breached • ${all.length} total tickets</div></div>
        <div class="kpi accent-green"><div class="kpi-top"><div class="kpi-label">SLA Compliance Rate %</div><div class="kpi-icon green">✅</div></div><div class="kpi-value">${compliance}%</div><div class="kpi-meta"><span class="pill green">${total-breaches} compliant</span> ${breaches} overdue</div></div>
        <div class="kpi accent-amber"><div class="kpi-top"><div class="kpi-label">Preventive Tasks Due (30 Days)</div><div class="kpi-icon amber">📅</div></div><div class="kpi-value">${preventiveDue}</div><div class="kpi-meta">PPM auto-generates work orders • Lifts, Gens, HVAC, Fire</div></div>
        <div class="kpi accent-violet"><div class="kpi-top"><div class="kpi-label">Avg Maintenance Cost / m²</div><div class="kpi-icon violet">💰</div></div><div class="kpi-value">ZMW ${avgCostM2}</div><div class="kpi-meta">Total ZMW ${(totalCostActual/1000).toFixed(1)}k / ${totalM2.toLocaleString()} m² • ${totalUnits} units</div></div>
      `;
    }
    if (slaBreachCount) slaBreachCount.textContent = `${breaches} SLA Breaches`;
    if (totalCostLabel) totalCostLabel.textContent = `${(totalCostActual).toLocaleString()}`;
    if (avgCostLabel) avgCostLabel.textContent = `ZMW ${avgCostM2} /m²`;
  }

  // ---------- Filtering ----------
  function getFiltered() {
    const st = getState();
    let data = [...(st.maintenance || [])];
    const search = (searchInput?.value || '').toLowerCase().trim();
    const prop = filterProperty?.value || '';
    const sev = filterSeverity?.value || '';
    const status = filterStatus?.value || '';
    const cat = filterCategory?.value || '';

    if (currentType !== 'all') {
      data = data.filter(t => {
        const tType = t.maintenanceType || t.type || (['Lifts','Fire Safety','HVAC','Generators'].includes(t.category) ? 'Preventive' : 'Reactive');
        return tType === currentType;
      });
    }
    if (prop) data = data.filter(t => t.propertyId === prop || t.property === prop);
    if (sev) data = data.filter(t => (t.severity||'') === sev);
    if (status) data = data.filter(t => (t.status||'') === status);
    if (cat) data = data.filter(t => (t.category||'') === cat);
    if (search) {
      data = data.filter(t =>
        (t.id||'').toLowerCase().includes(search) ||
        (t.property||'').toLowerCase().includes(search) ||
        (t.unit||'').toLowerCase().includes(search) ||
        (t.issue||'').toLowerCase().includes(search) ||
        (t.contractorName||t.contractor||'').toLowerCase().includes(search) ||
        (t.category||'').toLowerCase().includes(search)
      );
    }
    // Sort: breached first, then due date asc
    data.sort((a,b) => {
      const sa = getSLAStatus(a);
      const sb = getSLAStatus(b);
      if (sa.breached && !sb.breached) return -1;
      if (!sa.breached && sb.breached) return 1;
      return new Date(a.dueDate||'2099') - new Date(b.dueDate||'2099');
    });
    return data;
  }

  // ---------- Table Render ----------
  function renderTable() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage-1)*pageSize;
    const pageData = filtered.slice(start, start+pageSize);

    if (countLabel) countLabel.textContent = filtered.length;
    if (tableInfo) tableInfo.textContent = `Showing ${pageData.length} of ${filtered.length} work orders • Page ${currentPage}/${totalPages}`;

    if (!tbody) return;
    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="ico">🔧</div><h3>No work orders found</h3><p>Try adjusting filters or log a new maintenance ticket</p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = pageData.map(t => {
      const sla = renderSLABadge(t);
      const type = t.maintenanceType || t.type || 'Reactive';
      const typePill = type === 'Preventive' ? '<span class="pill violet">Preventive</span>' : '<span class="pill blue">Reactive</span>';
      const cost = t.costActual || t.costEstimated || 0;
      return `
        <tr data-id="${t.id}" class="row-clickable" style="cursor:pointer">
          <td><span class="mono" style="font-family:monospace;font-weight:700">${escapeHtml(t.id)}</span></td>
          <td><div style="font-weight:600">${escapeHtml(t.property||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(t.unit||'Common')}</div></td>
          <td><div style="font-weight:600;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(t.issue)}">${escapeHtml(t.issue||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(t.category||'')}</div></td>
          <td>${typePill}</td>
          <td>${severityPill(t.severity||t.priority)}</td>
          <td>${sla}</td>
          <td><div style="font-weight:600">${escapeHtml(t.contractorName||t.contractor||'Internal')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(t.contractorId||'')}</div></td>
          <td><span style="font-weight:700">ZMW ${Number(cost).toLocaleString()}</span></td>
          <td>${statusPill(t.status)}</td>
          <td>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openDrawer('${t.id}')">Open</button>
            <button class="btn btn-sm" onclick="event.stopPropagation(); openContext(event,'${t.id}')">⋯</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind row clicks
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', () => openDrawer(tr.dataset.id));
    });

    renderKPIs(filtered);
  }

  // ---------- Drawer ----------
  function openDrawer(id) {
    const st = getState();
    const ticket = (st.maintenance||[]).find(t => t.id === id);
    if (!ticket) return;
    selectedTicketId = id;

    const sla = getSLAStatus(ticket);
    document.getElementById('drawerTitle').textContent = ticket.id;
    document.getElementById('drawerId').textContent = ticket.id;
    document.getElementById('drawerSeverity').textContent = ticket.severity || ticket.priority || 'Medium';
    document.getElementById('drawerSeverity').className = 'pill ' + (ticket.severity === 'Critical' ? 'critical' : ticket.severity === 'High' ? 'high' : ticket.severity === 'Medium' ? 'medium' : 'low');
    document.getElementById('drawerSLA').textContent = sla.label;
    document.getElementById('drawerSLA').className = 'sla-badge ' + sla.cls;
    document.getElementById('drawerSubtitle').textContent = `${ticket.property||''} • ${ticket.unit||'Common'} • ${ticket.category||''} • ${ticket.maintenanceType||'Reactive'}`;

    const summaryEl = document.getElementById('drawerSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="sum-item"><div class="l">Property</div><div class="v">${escapeHtml(ticket.property||'')}</div></div>
        <div class="sum-item"><div class="l">Contractor</div><div class="v">${escapeHtml(ticket.contractorName||ticket.contractor||'Internal')}</div></div>
        <div class="sum-item"><div class="l">Cost</div><div class="v">ZMW ${Number(ticket.costActual||ticket.costEstimated||0).toLocaleString()}</div></div>
      `;
    }

    renderDrawerTab('details');
    drawer.classList.add('open');
    drawerBackdrop.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    selectedTicketId = null;
  }

  function renderDrawerTab(tab) {
    const st = getState();
    const ticket = (st.maintenance||[]).find(t => t.id === selectedTicketId);
    if (!ticket) return;
    document.querySelectorAll('.drawer-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
    const body = document.getElementById('drawerBody');
    if (!body) return;

    const sla = getSLAStatus(ticket);
    const contractor = (st.contractors||[]).find(c => c.id === ticket.contractorId) || { name: ticket.contractorName || 'Internal', specialty: ticket.category, rating: 4.2 };

    if (tab === 'details') {
      body.innerHTML = `
        <div class="detail-grid">
          <div class="detail-card"><div class="label">Issue Title</div><div class="value">${escapeHtml(ticket.issue)}</div><div class="sub">${escapeHtml(ticket.description||'')}</div></div>
          <div class="detail-card"><div class="label">Category / Type</div><div class="value">${escapeHtml(ticket.category)} • ${escapeHtml(ticket.maintenanceType||'Reactive')}</div><div class="sub">Severity ${ticket.severity} • Status ${ticket.status}</div></div>
          <div class="detail-card"><div class="label">Reported</div><div class="value">${escapeHtml(ticket.reportedDate||'')}</div><div class="sub">Due ${escapeHtml(ticket.dueDate||'')} • ${sla.label}</div></div>
          <div class="detail-card"><div class="label">Assigned To</div><div class="value">${escapeHtml(ticket.assignedTo||'Unassigned')}</div><div class="sub">Property ${escapeHtml(ticket.property||'')}</div></div>
        </div>
        <div style="margin-top:12px;background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 10px">SLA Timeline</h4>
          <div class="sla-log">
            <div class="sla-log-item done"><div class="time">${ticket.reportedDate||''} • Logged</div><div class="desc">Ticket logged by ${escapeHtml(ticket.assignedTo||'System')}</div><div class="sub">Severity ${ticket.severity} • ${ticket.category}</div></div>
            <div class="sla-log-item ${ticket.status==='In Progress'||ticket.status==='Pending Parts'?'done':''}"><div class="time">Assigned • Contractor</div><div class="desc">${escapeHtml(contractor.name)} assigned</div><div class="sub">Rating ${contractor.rating}★ • ${contractor.specialty}</div></div>
            <div class="sla-log-item ${sla.breached?'breach':''} ${['Completed','Closed'].includes(ticket.status)?'done':''}"><div class="time">Due ${ticket.dueDate} • ${sla.label}</div><div class="desc">${sla.breached? 'SLA BREACHED' : 'SLA On Track'}</div><div class="sub">${sla.days<0? Math.abs(sla.days)+' days overdue' : sla.days+' days remaining'}</div></div>
            ${['Completed','Closed'].includes(ticket.status)? `<div class="sla-log-item done"><div class="time">Completed</div><div class="desc">Work completed - photo proof required</div><div class="sub">Cost ZMW ${Number(ticket.costActual||0).toLocaleString()}</div></div>`:''}
          </div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="document.querySelector('[data-tab=cost]').click()">View Costs</button>
          <button class="btn btn-sm" onclick="document.querySelector('[data-tab=photos]').click()">Photo Proof</button>
        </div>
      `;
    } else if (tab === 'contractor') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Contractor Assignment</h4>
          <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:13px">
            <div style="color:var(--muted)">Current</div><div style="font-weight:700">${escapeHtml(contractor.name)}</div>
            <div style="color:var(--muted)">Specialty</div><div>${escapeHtml(contractor.specialty)} • Rating ${contractor.rating}★</div>
            <div style="color:var(--muted)">Cost Estimate</div><div style="font-weight:700">ZMW ${Number(ticket.costEstimated||0).toLocaleString()}</div>
            <div style="color:var(--muted)">Cost Actual</div><div style="font-weight:700;color:#16A34A">ZMW ${Number(ticket.costActual||0).toLocaleString()}</div>
          </div>
          <div style="margin-top:14px">
            <label class="form-label">Reassign Contractor</label>
            <select id="drawerContractorSelect" class="form-select" style="width:100%;margin-top:6px">
              ${(getState().contractors||[]).map(c => `<option value="${c.id}" ${c.id===ticket.contractorId?'selected':''}>${escapeHtml(c.name)} - ${c.specialty} (${c.rating}★)</option>`).join('')}
              <option value="">Internal Team</option>
            </select>
            <div style="margin-top:10px;display:flex;gap:8px"><button class="btn btn-primary btn-sm" id="btnSaveContractor">Save Assignment</button></div>
          </div>
          <div style="margin-top:14px;background:#F8FAFC;border:1px solid #F1F5F9;border-radius:8px;padding:10px;font-size:12px;line-height:1.5">
            <b>ERP Procurement Link:</b> Contractor register synced with ERPNext. Ratings, active jobs, SLA history tracked. Auto-assignment based on specialty + lowest active jobs.
          </div>
        </div>
      `;
      const saveBtn = document.getElementById('btnSaveContractor');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const sel = document.getElementById('drawerContractorSelect').value;
          const ctr = (getState().contractors||[]).find(c=>c.id===sel);
          ticket.contractorId = sel;
          ticket.contractorName = ctr? ctr.name : 'Internal Team';
          ticket.contractor = ticket.contractorName;
          save();
          if (window.toast) toast('Contractor reassigned','success');
          renderTable();
          renderDrawerTab('contractor');
        });
      }
    } else if (tab === 'photos') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 10px">Photo Proof & Inspection</h4>
          <div class="photo-proof" id="drawerPhotoUpload">
            <div class="ico">📸</div>
            <div style="font-weight:600;color:#0F172A;font-size:13px">Mobile Inspection - Tap to capture</div>
            <div style="font-size:11px">Condition report, meter readings, key issue, completion evidence</div>
            <div style="margin-top:6px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap"><span class="pill blue">Offline Sync</span><span class="pill green">GPS Tagged</span><span class="pill violet">Checklist</span></div>
          </div>
          <div class="photo-grid">
            <div class="photo-item">Before<br/>📷</div>
            <div class="photo-item">During<br/>🔧</div>
            <div class="photo-item">After<br/>✅</div>
          </div>
          <div style="margin-top:12px;font-size:12px;color:#64748B;line-height:1.5">
            <b>Mobile App Features (ToR 8.7):</b> Checklist-driven inspection, photo capture with offline queue, meter reading entry, key/access control log, completion evidence. All photos stamped with GPS + timestamp for audit.
          </div>
          <div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-sm">Open Checklist</button><button class="btn btn-sm">Add Meter Reading</button></div>
        </div>
      `;
    } else if (tab === 'sla') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">SLA Compliance Log</h4>
          <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:13px;margin-bottom:14px">
            <div style="color:var(--muted)">Reported</div><div style="font-weight:600">${ticket.reportedDate}</div>
            <div style="color:var(--muted)">Due Date</div><div style="font-weight:600">${ticket.dueDate} • SLA ${ticket.slaDays||2} days (${ticket.slaHours||48}h)</div>
            <div style="color:var(--muted)">Status</div><div>${sla.label} • <span class="sla-badge ${sla.cls}">${sla.cls.toUpperCase()}</span></div>
            <div style="color:var(--muted)">Severity</div><div>${severityPill(ticket.severity)} • Priority ${ticket.priority||ticket.severity}</div>
          </div>
          <div class="sla-log">
            <div class="sla-log-item done"><div class="time">${ticket.reportedDate} 08:30 • System</div><div class="desc">Work order created</div><div class="sub">Auto-logged from tenant portal / inspection app</div></div>
            <div class="sla-log-item done"><div class="time">${ticket.reportedDate} 09:15 • Dispatcher</div><div class="desc">Assigned to ${escapeHtml(contractor.name)}</div><div class="sub">SLA timer started • ${ticket.slaDays} days</div></div>
            <div class="sla-log-item ${ticket.status==='In Progress'?'done':''}"><div class="time">${ticket.status==='In Progress'?'Today':''} • Technician</div><div class="desc">${ticket.status==='Open'?'Awaiting site visit': ticket.status==='In Progress'?'Work in progress': ticket.status}</div><div class="sub">Cost estimated ZMW ${Number(ticket.costEstimated||0).toLocaleString()}</div></div>
            <div class="sla-log-item ${sla.breached?'breach':''}"><div class="time">SLA ${sla.breached?'BREACH': sla.days<=0? 'Due Today':'Checkpoint'}</div><div class="desc">${sla.label}</div><div class="sub">${sla.breached? 'Escalation triggered - notify FM Manager' : 'On track for compliance'}</div></div>
          </div>
        </div>
      `;
    } else if (tab === 'cost') {
      const costPerM2 = (Number(ticket.costActual||ticket.costEstimated||0)/80).toFixed(2); // 80m2 avg unit
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          <div class="detail-card"><div class="label">Estimated Cost</div><div class="value">ZMW ${Number(ticket.costEstimated||0).toLocaleString()}</div><div class="sub">Initial quote</div></div>
          <div class="detail-card"><div class="label">Actual Cost</div><div class="value" style="color:#16A34A">ZMW ${Number(ticket.costActual||0).toLocaleString()}</div><div class="sub">Invoiced • ${ticket.costActual? 'Final' : 'Pending'}</div></div>
          <div class="detail-card"><div class="label">Cost / m²</div><div class="value">ZMW ${costPerM2} /m²</div><div class="sub">Benchmark: ZMW 12-45 /m² avg</div></div>
          <div class="detail-card"><div class="label">Variance</div><div class="value">${ticket.costActual && ticket.costEstimated ? (((ticket.costActual-ticket.costEstimated)/ticket.costEstimated*100).toFixed(1)+'%') : '-'}</div><div class="sub">Est vs Actual</div></div>
        </div>
        <div style="margin-top:12px;background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 10px">Cost Breakdown (ToR 8.7)</h4>
          <div style="font-size:12px;line-height:1.6;color:#475569">Tracks cost per property / unit / m². Labour, materials, contractor fees split. Linked to service charge budgeting (8.8) and investment NOI calculation. ERP procurement integration for contractor payments.</div>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><span class="pill gray">Labour: 40%</span><span class="pill gray">Materials: 45%</span><span class="pill gray">Fees: 15%</span></div>
        </div>
      `;
    }
  }

  // ---------- Context Menu ----------
  function openContext(e, id) {
    e.preventDefault(); e.stopPropagation();
    if (!ctxMenu) return;
    ctxMenu.innerHTML = `
      <div class="ctx-item" data-action="open">📋 Open Details</div>
      <div class="ctx-item" data-action="edit">✏️ Edit Ticket</div>
      <div class="ctx-item" data-action="complete">✅ Complete Ticket</div>
      <div class="ctx-item danger" data-action="delete">🗑️ Delete</div>
    `;
    ctxMenu.style.left = e.pageX + 'px';
    ctxMenu.style.top = e.pageY + 'px';
    ctxMenu.classList.add('open');
    ctxMenu.dataset.id = id;
  }

  // ---------- CRUD ----------
  function openNewModal(editId=null) {
    editingTicketId = editId;
    const modal = document.getElementById('ticketModalBackdrop');
    const title = document.getElementById('ticketModalTitle');
    if (title) title.textContent = editId ? 'Edit Work Order' : 'Log Maintenance Ticket';
    if (editId) {
      const st = getState();
      const t = (st.maintenance||[]).find(x=>x.id===editId);
      if (t) {
        document.getElementById('mProperty').value = t.propertyId || '';
        populateUnits(t.propertyId);
        setTimeout(()=>{ document.getElementById('mUnit').value = t.unitId || ''; }, 50);
        document.getElementById('mType').value = t.maintenanceType || 'Reactive';
        document.getElementById('mCategory').value = t.category || 'Electrical';
        document.getElementById('mIssue').value = t.issue || '';
        document.getElementById('mDescription').value = t.description || '';
        document.getElementById('mSeverity').value = t.severity || 'Medium';
        document.getElementById('mStatus').value = t.status || 'Open';
        document.getElementById('mSLA').value = t.slaDays || 2;
        document.getElementById('mDueDate').value = t.dueDate || '';
        document.getElementById('mContractor').value = t.contractorId || '';
        document.getElementById('mCostEst').value = t.costEstimated || 0;
      }
    } else {
      document.getElementById('mProperty').value = '';
      document.getElementById('mUnit').innerHTML = '<option value="">Common Area / No Unit</option>';
      document.getElementById('mIssue').value = '';
      document.getElementById('mDescription').value = '';
      document.getElementById('mSeverity').value = 'Medium';
      document.getElementById('mStatus').value = 'Open';
      document.getElementById('mSLA').value = '2';
      document.getElementById('mDueDate').value = new Date(Date.now()+2*86400000).toISOString().slice(0,10);
      document.getElementById('mContractor').value = '';
      document.getElementById('mCostEst').value = '';
      document.getElementById('mType').value = 'Reactive';
      document.getElementById('mCategory').value = 'Electrical';
    }
    if (modal) modal.classList.add('open');
  }

  function closeTicketModal() {
    const modal = document.getElementById('ticketModalBackdrop');
    if (modal) modal.classList.remove('open');
    editingTicketId = null;
  }

  function populateUnits(propertyId) {
    const st = getState();
    const units = (st.units||[]).filter(u=>u.propertyId===propertyId).slice(0,30);
    const mUnit = document.getElementById('mUnit');
    if (!mUnit) return;
    mUnit.innerHTML = '<option value="">Common Area / No Unit</option>' + units.map(u=>`<option value="${u.id}">${escapeHtml(u.code)} - ${u.type||''} (${u.status||''})</option>`).join('');
  }

  function saveTicket() {
    const st = getState();
    const propertyId = document.getElementById('mProperty').value;
    if (!propertyId) { if(window.toast) toast('Select property','error'); return; }
    const property = (st.properties||[]).find(p=>p.id===propertyId);
    const unitId = document.getElementById('mUnit').value;
    const unit = (st.units||[]).find(u=>u.id===unitId);
    const issue = document.getElementById('mIssue').value.trim();
    if (!issue) { if(window.toast) toast('Enter issue title','error'); return; }
    const slaDays = parseInt(document.getElementById('mSLA').value) || 2;
    let dueDate = document.getElementById('mDueDate').value;
    if (!dueDate) {
      const d = new Date(); d.setDate(d.getDate()+slaDays);
      dueDate = d.toISOString().slice(0,10);
    }
    const contractorId = document.getElementById('mContractor').value;
    const contractor = (st.contractors||[]).find(c=>c.id===contractorId);

    const base = {
      propertyId,
      property: property? property.name : propertyId,
      propertyName: property? property.name : propertyId,
      unitId: unitId || '',
      unit: unit? unit.code : 'Common Area',
      unitCode: unit? unit.code : 'Common',
      issue,
      description: document.getElementById('mDescription').value.trim(),
      category: document.getElementById('mCategory').value,
      maintenanceType: document.getElementById('mType').value,
      type: document.getElementById('mType').value,
      severity: document.getElementById('mSeverity').value,
      priority: document.getElementById('mSeverity').value,
      status: document.getElementById('mStatus').value,
      slaDays,
      slaHours: slaDays*24,
      sla: `${slaDays} days`,
      reportedDate: new Date().toISOString().slice(0,10),
      dueDate,
      contractorId,
      contractorName: contractor? contractor.name : (contractorId? contractorId : 'Internal Team'),
      contractor: contractor? contractor.name : 'Internal Team',
      costEstimated: parseFloat(document.getElementById('mCostEst').value) || 0,
      costActual: 0,
      cost: parseFloat(document.getElementById('mCostEst').value) || 0,
      city: property? property.city : 'Lusaka'
    };

    if (editingTicketId) {
      const idx = (st.maintenance||[]).findIndex(t=>t.id===editingTicketId);
      if (idx>=0) {
        st.maintenance[idx] = { ...st.maintenance[idx], ...base };
        if (window.toast) toast('Work order updated','success');
        if (typeof addAuditEvent === 'function') addAuditEvent('UPDATE','maintenance',editingTicketId,`Updated ticket ${editingTicketId}`);
      }
    } else {
      const newId = `MNT-${String((st.maintenance||[]).length+1).padStart(4,'0')}-${Date.now().toString().slice(-3)}`;
      const newTicket = { id: newId, ...base };
      if (!st.maintenance) st.maintenance = [];
      st.maintenance.unshift(newTicket);
      if (window.toast) toast('Work order logged','success');
      if (typeof addAuditEvent === 'function') addAuditEvent('CREATE','maintenance',newId,`Created ticket ${newId} ${issue}`);
    }
    save();
    closeTicketModal();
    renderTable();
  }

  function completeTicket(id) {
    const st = getState();
    const t = (st.maintenance||[]).find(x=>x.id===id);
    if (!t) return;
    if (t.status === 'Completed' || t.status === 'Closed') {
      if(window.toast) toast('Already completed','info'); return;
    }
    t.status = 'Completed';
    t.completedDate = new Date().toISOString().slice(0,10);
    t.costActual = t.costActual || t.costEstimated || 0;
    if (typeof addAuditEvent === 'function') addAuditEvent('UPDATE','maintenance',id,`Completed ticket ${id}`);
    save();
    renderTable();
    if (selectedTicketId===id) renderDrawerTab('details');
    if(window.toast) toast('Ticket marked completed - photo proof required','success');
  }

  function deleteTicket(id) {
    if (!confirm(`Delete work order ${id}? This cannot be undone.`)) return;
    const st = getState();
    st.maintenance = (st.maintenance||[]).filter(t=>t.id!==id);
    save();
    renderTable();
    closeDrawer();
    if(window.toast) toast('Work order deleted','success');
  }

  // ---------- CSV Export ----------
  function exportCSV() {
    const data = getFiltered();
    if (data.length===0) { if(window.toast) toast('No data to export','error'); return; }
    const headers = ['Ticket ID','Property','Unit','Title','Type','Category','Severity','SLA Days','Due Date','Contractor','Cost Estimated','Cost Actual','Status','Reported Date'];
    const rows = data.map(t => [
      t.id, t.property||'', t.unit||'', `"${(t.issue||'').replace(/"/g,'""')}"`, t.maintenanceType||'Reactive', t.category||'', t.severity||'', t.slaDays||'', t.dueDate||'', t.contractorName||t.contractor||'', t.costEstimated||0, t.costActual||0, t.status||'', t.reportedDate||''
    ]);
    const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance_work_orders_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if(window.toast) toast('CSV exported','success');
  }

  // ---------- Events ----------
  function bindEvents() {
    // Type toggle
    if (typeToggle) {
      typeToggle.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          typeToggle.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          currentType = btn.dataset.type;
          currentPage = 1;
          renderTable();
        });
      });
    }

    [searchInput, filterProperty, filterSeverity, filterStatus, filterCategory].forEach(el => {
      if (!el) return;
      const evt = el.tagName === 'INPUT' ? 'input' : 'change';
      el.addEventListener(evt, () => { currentPage = 1; renderTable(); });
    });

    if (filterProperty) {
      filterProperty.addEventListener('change', () => {
        // for new modal, not needed
      });
    }

    const mPropertySel = document.getElementById('mProperty');
    if (mPropertySel) {
      mPropertySel.addEventListener('change', (e) => populateUnits(e.target.value));
    }

    if (pageSizeSel) {
      pageSizeSel.addEventListener('change', () => { pageSize = parseInt(pageSizeSel.value)||50; currentPage=1; renderTable(); });
    }

    document.getElementById('prevPage')?.addEventListener('click', () => { if (currentPage>1) { currentPage--; renderTable(); }});
    document.getElementById('nextPage')?.addEventListener('click', () => { currentPage++; renderTable(); });

    document.getElementById('btnResetFilters')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (filterProperty) filterProperty.value = '';
      if (filterSeverity) filterSeverity.value = '';
      if (filterStatus) filterStatus.value = '';
      if (filterCategory) filterCategory.value = '';
      currentType = 'all';
      typeToggle?.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b.dataset.type==='all'));
      currentPage = 1;
      renderTable();
    });

    document.getElementById('btnNewTicket')?.addEventListener('click', () => openNewModal());
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    drawerBackdrop?.addEventListener('click', closeDrawer);

    // Drawer tabs
    document.querySelectorAll('.drawer-tab').forEach(tab => {
      tab.addEventListener('click', () => renderDrawerTab(tab.dataset.tab));
    });

    // Modal
    document.getElementById('btnCloseTicketModal')?.addEventListener('click', closeTicketModal);
    document.getElementById('btnCancelTicket')?.addEventListener('click', closeTicketModal);
    document.getElementById('ticketModalBackdrop')?.addEventListener('click', (e) => { if (e.target.id==='ticketModalBackdrop') closeTicketModal(); });
    document.getElementById('btnSaveTicket')?.addEventListener('click', saveTicket);

    document.getElementById('btnCompleteTicket')?.addEventListener('click', () => { if (selectedTicketId) completeTicket(selectedTicketId); });
    document.getElementById('btnEditTicket')?.addEventListener('click', () => { if (selectedTicketId) openNewModal(selectedTicketId); });

    // Preventive
    document.getElementById('btnPreventiveSchedule')?.addEventListener('click', () => {
      document.getElementById('preventiveModalBackdrop')?.classList.add('open');
    });
    document.getElementById('btnClosePreventiveModal')?.addEventListener('click', () => document.getElementById('preventiveModalBackdrop')?.classList.remove('open'));
    document.getElementById('btnCancelPreventive')?.addEventListener('click', () => document.getElementById('preventiveModalBackdrop')?.classList.remove('open'));
    document.getElementById('preventiveModalBackdrop')?.addEventListener('click', (e)=> { if(e.target.id==='preventiveModalBackdrop') e.currentTarget.classList.remove('open'); });
    document.getElementById('btnGeneratePPM')?.addEventListener('click', () => {
      const st = getState();
      const now = new Date();
      const assets = [
        { category: 'Lifts', sla: 7, cost: 3500, property: st.properties[0] },
        { category: 'Generators', sla: 3, cost: 2500, property: st.properties[1] },
        { category: 'HVAC', sla: 14, cost: 8500, property: st.properties[0] },
        { category: 'Fire Safety', sla: 14, cost: 4500, property: st.properties[2] },
      ];
      assets.forEach((a,i)=>{
        const prop = a.property || st.properties[i % st.properties.length];
        const due = new Date(); due.setDate(now.getDate()+Math.floor(Math.random()*20));
        st.maintenance.unshift({
          id: `MNT-PPM-${Date.now().toString().slice(-6)}-${i}`,
          propertyId: prop.id,
          property: prop.name,
          propertyName: prop.name,
          unitId: '',
          unit: 'Common Area',
          unitCode: 'Common',
          issue: `PPM: ${a.category} - Scheduled Service`,
          description: `Preventive maintenance scheduled for ${a.category} at ${prop.name}. Auto-generated from PPM calendar.`,
          category: a.category,
          maintenanceType: 'Preventive',
          type: 'Preventive',
          severity: 'Medium',
          priority: 'Medium',
          status: 'Open',
          slaDays: a.sla,
          slaHours: a.sla*24,
          sla: `${a.sla} days`,
          reportedDate: now.toISOString().slice(0,10),
          dueDate: due.toISOString().slice(0,10),
          contractorId: 'CTR-001',
          contractorName: 'ColdTech Zambia Ltd',
          contractor: 'ColdTech Zambia Ltd',
          costEstimated: a.cost,
          costActual: 0,
          cost: a.cost,
          city: prop.city
        });
      });
      save();
      renderTable();
      document.getElementById('preventiveModalBackdrop')?.classList.remove('open');
      if(window.toast) toast('4 PPM tasks generated','success');
    });

    // Context menu
    document.addEventListener('click', () => { if (ctxMenu) ctxMenu.classList.remove('open'); });
    if (ctxMenu) {
      ctxMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.ctx-item');
        if (!item) return;
        const action = item.dataset.action;
        const id = ctxMenu.dataset.id;
        ctxMenu.classList.remove('open');
        if (action==='open') openDrawer(id);
        if (action==='edit') openNewModal(id);
        if (action==='complete') completeTicket(id);
        if (action==='delete') deleteTicket(id);
      });
    }

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key==='Escape') {
        closeDrawer();
        closeTicketModal();
        document.getElementById('preventiveModalBackdrop')?.classList.remove('open');
      }
    });
  }

  // Expose for inline handlers
  window.openDrawer = openDrawer;
  window.openContext = openContext;

  // ---------- Init ----------
  populateFilters();
  bindEvents();
  renderTable();

  // Auto-refresh SLA badges every 60s
  setInterval(() => { renderTable(); }, 60000);

  console.log('[Operations Maintenance] ToR 8.7 module loaded -', (getState().maintenance||[]).length, 'tickets');
});

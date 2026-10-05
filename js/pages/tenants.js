/**
 * Tenants Page - PropertyPro Zambia Ltd v3
 * Operational tenant register - Individuals and Companies
 */

(function(){
  let filtered = [];
  let currentPage = 1;
  let pageSize = 50;
  let selectedId = null;
  let currentTab = 'overview';
  let editingId = null;

  const OFFICERS = ['Mutale Phiri','Grace Banda','John Mwila','Chanda Mwanza','Peter Zulu','Mary Lungu'];
  const TYPES = ['Individual','Company','Anchor','Corporate','Retail'];
  const STATUSES = ['Active','Inactive','Blacklisted','Archived'];
  const RISKS = ['Low','Medium','High','Critical'];
  const ID_TYPES = ['NRC','Passport','TPIN','Business Registration'];

  function getState(){ return window.state || {}; }
  function getTenants(){ return getState().tenants || []; }
  function getProps(){ return getState().properties || []; }
  function getUnits(){ return getState().units || []; }
  function getLeases(){ return getState().leases || []; }
  function getApps(){ return getState().applications || []; }

  function fmtMoney(v){ return 'ZMW ' + Number(v||0).toLocaleString('en-ZM'); }
  function fmtDate(d){ if(!d) return '—'; try{ const dt=new Date(d); return isNaN(dt)?d:dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return d} }

  document.addEventListener('DOMContentLoaded', ()=>{
    window.initCommon && window.initCommon('tenants');
    populateFilters();
    bindEvents();
    applyFilters();
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const prop = params.get('property');
    if(prop) document.getElementById('filterProperty').value = prop;
    if(id) setTimeout(()=>openDrawer(id), 400);
    if(prop && !id) applyFilters();
  });

  function populateFilters(){
    const propSelect = document.getElementById('filterProperty');
    const props = getProps();
    propSelect.innerHTML = '<option value="">All Properties</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  }

  function bindEvents(){
    document.getElementById('searchInputLocal')?.addEventListener('input', debounce(applyFilters, 300));
    ['filterProperty','filterType','filterStatus','filterRisk','filterLeaseStatus','filterArrears','filterCity'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('btnResetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('btnExportTenants')?.addEventListener('click', exportTenants);
    document.getElementById('btnAddTenant')?.addEventListener('click', ()=>openTenantModal());
    document.getElementById('pageSize')?.addEventListener('change', e=>{ pageSize=parseInt(e.target.value); currentPage=1; renderTable(); });
    document.getElementById('prevPage')?.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; renderTable(); }});
    document.getElementById('nextPage')?.addEventListener('click', ()=>{ const max=Math.ceil(filtered.length/pageSize); if(currentPage<max){ currentPage++; renderTable(); }});
    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        document.querySelectorAll('.drawer-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        if(selectedId) renderDrawerBody(selectedId);
      });
    });
    document.getElementById('btnCloseTenantModal')?.addEventListener('click', closeTenantModal);
    document.getElementById('btnCancelTenantModal')?.addEventListener('click', closeTenantModal);
    document.getElementById('tenantModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='tenantModalBackdrop') closeTenantModal(); });
    document.getElementById('btnSaveTenant')?.addEventListener('click', saveTenantModal);
    document.getElementById('confirmCancel')?.addEventListener('click', closeConfirm);
    document.getElementById('confirmBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='confirmBackdrop') closeConfirm(); });
    document.addEventListener('click', e=>{
      const menu = document.getElementById('ctxMenu');
      if(menu && !menu.contains(e.target) && !e.target.closest('.dots-btn')) menu.classList.remove('open');
    });
  }

  function debounce(fn, delay){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

  function applyFilters(){
    const q = (document.getElementById('searchInputLocal')?.value||'').toLowerCase();
    const prop = document.getElementById('filterProperty')?.value||'';
    const type = document.getElementById('filterType')?.value||'';
    const status = document.getElementById('filterStatus')?.value||'';
    const risk = document.getElementById('filterRisk')?.value||'';
    const leaseStatus = document.getElementById('filterLeaseStatus')?.value||'';
    const arrears = document.getElementById('filterArrears')?.value||'';
    const city = document.getElementById('filterCity')?.value||'';

    filtered = getTenants().filter(t=>{
      if(q){
        const hay = `${t.id} ${t.name} ${t.property} ${t.unit} ${(t.unitCodes||[]).join(' ')} ${t.city} ${t.email} ${t.phone}`.toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(prop && !(t.propertyIds||[]).includes(prop) && t.property!==getProps().find(p=>p.id===prop)?.name) {
        // also check propertyNames
        if(!t.propertyIds?.includes(prop)) {
          const propName = getProps().find(p=>p.id===prop)?.name;
          if(t.property!==propName && !(t.propertyNames||[]).includes(propName)) return false;
        }
      }
      if(type && t.type!==type) return false;
      if(status && t.status!==status) return false;
      if(risk && (t.riskRating!==risk && t.risk!==risk)) return false;
      if(city && t.city!==city) return false;
      if(leaseStatus){
        const leases = getLeases().filter(l=>l.tenantId===t.id || l.tenant===t.name);
        const active = leases.filter(l=>l.status==='Active' || l.status==='Expiring Soon');
        if(leaseStatus==='With Active Lease' && active.length===0) return false;
        if(leaseStatus==='Without Lease' && active.length>0) return false;
        if(leaseStatus==='Expiring Soon' && !leases.some(l=>l.status==='Expiring Soon')) return false;
      }
      if(arrears){
        const hasArrears = (t.balance||t.total||0) > 0;
        if(arrears==='With Arrears' && !hasArrears) return false;
        if(arrears==='No Arrears' && hasArrears) return false;
      }
      return true;
    }).sort((a,b)=> (b.monthlyRent||b.rent||0) - (a.monthlyRent||a.rent||0));

    currentPage=1;
    renderKPIs();
    renderTable();
  }

  function resetFilters(){
    document.getElementById('searchInputLocal').value='';
    ['filterProperty','filterType','filterStatus','filterRisk','filterLeaseStatus','filterArrears','filterCity'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    applyFilters();
  }

  function renderKPIs(){
    const tenants = getTenants();
    const now = new Date();
    const thisMonth = now.getMonth();
    const total = tenants.length;
    const active = tenants.filter(t=>t.status==='Active').length;
    const newThisMonth = tenants.filter(t=>{
      const d = new Date(t.createdAt);
      return d.getMonth()===thisMonth && d.getFullYear()===now.getFullYear();
    }).length;
    const withActiveLease = tenants.filter(t=>{
      const leases = getLeases().filter(l=> (l.tenantId===t.id || l.tenant===t.name) && (l.status==='Active' || l.status==='Expiring Soon'));
      return leases.length>0;
    }).length;
    const withArrears = tenants.filter(t=> (t.balance||0)>0 ).length;
    const highRisk = tenants.filter(t=> (t.riskRating==='High' || t.risk==='High' || t.riskRating==='Critical')).length;
    const expiring = tenants.filter(t=>{
      const leases = getLeases().filter(l=> (l.tenantId===t.id || l.tenant===t.name) && l.status==='Expiring Soon');
      return leases.length>0;
    }).length;

    const grid = document.getElementById('kpiGrid');
    if(!grid) return;
    grid.innerHTML = `
      <div class="kpi"><div class="kpi-top"><span class="kpi-label">Total Tenants</span><span class="pill blue">${total}</span></div><div class="kpi-value">${total}</div><div class="kpi-meta">Across ${getProps().length} properties • 1,842 units</div></div>
      <div class="kpi kpi-green"><div class="kpi-top"><span class="kpi-label">Active Tenants</span><span class="pill green">${active}</span></div><div class="kpi-value">${active}</div><div class="kpi-meta">${Math.round(active/Math.max(1,total)*100)}% of register active</div></div>
      <div class="kpi kpi-violet"><div class="kpi-top"><span class="kpi-label">New This Month</span><span class="pill blue">${newThisMonth}</span></div><div class="kpi-value">${newThisMonth}</div><div class="kpi-meta">Onboarded ${now.toLocaleString('default',{month:'short'})} ${now.getFullYear()}</div></div>
      <div class="kpi kpi-green"><div class="kpi-top"><span class="kpi-label">With Active Lease</span><span class="pill green">${withActiveLease}</span></div><div class="kpi-value">${withActiveLease}</div><div class="kpi-meta">Lease → Rental Income → NOI</div></div>
      <div class="kpi kpi-red"><div class="kpi-top"><span class="kpi-label">With Arrears</span><span class="pill red">${withArrears}</span></div><div class="kpi-value">${withArrears}</div><div class="kpi-meta">${fmtMoney(tenants.reduce((s,t)=>s+(t.balance||0),0))} outstanding</div></div>
      <div class="kpi kpi-red"><div class="kpi-top"><span class="kpi-label">High Risk</span><span class="pill red">${highRisk}</span></div><div class="kpi-value">${highRisk}</div><div class="kpi-meta">Requires monitoring</div></div>
      <div class="kpi kpi-amber"><div class="kpi-top"><span class="kpi-label">Expiring Leases</span><span class="pill amber">${expiring}</span></div><div class="kpi-value">${expiring}</div><div class="kpi-meta">Expiring < 90 days • Renewal due</div></div>
    `;
    const rentLabel = document.getElementById('rentLabel');
    if(rentLabel) rentLabel.textContent = fmtMoney(tenants.reduce((s,t)=>s+(t.monthlyRent||t.rent||0),0));
  }

  function renderTable(){
    const tbody = document.getElementById('tenantsTbody');
    const countLabel = document.getElementById('countLabel');
    const info = document.getElementById('tableInfo');
    if(!tbody) return;
    const start = (currentPage-1)*pageSize;
    const pageData = filtered.slice(start, start+pageSize);
    if(countLabel) countLabel.textContent = filtered.length;
    if(info) info.textContent = `Showing ${filtered.length ? start+1 : 0}-${Math.min(start+pageSize, filtered.length)} of ${filtered.length}`;

    if(pageData.length===0){
      tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><div class="ico">👥</div><h3>No tenants found</h3><p>Try changing filters or add a new tenant. Tenants are created from approved applications or directly.</p><button class="btn btn-primary btn-sm" onclick="document.getElementById('btnAddTenant').click()" style="margin-top:10px">+ Add Tenant</button></div></td></tr>`;
      return;
    }

    tbody.innerHTML = pageData.map(t=>{
      const leases = getLeases().filter(l=> l.tenantId===t.id || l.tenant===t.name);
      const activeLease = leases.find(l=> l.status==='Active' || l.status==='Expiring Soon') || leases[0];
      const initials = t.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const isCompany = t.type==='Company' || t.type==='Anchor' || t.type==='Corporate';
      const balance = t.balance||t.total||0;
      const risk = t.riskRating||t.risk||'Medium';
      const riskMap = {Low:'low',Medium:'medium',High:'high',Critical:'critical'};
      const expiryDays = activeLease ? Math.floor((new Date(activeLease.endDate||activeLease.end) - new Date())/(24*3600*1000)) : null;
      let expiryBadge = '<span class="lease-expiry-badge ok">No lease</span>';
      if(activeLease){
        if(expiryDays!==null && expiryDays<0) expiryBadge = `<span class="lease-expiry-badge expired">Expired ${Math.abs(expiryDays)}d ago</span>`;
        else if(expiryDays!==null && expiryDays<90) expiryBadge = `<span class="lease-expiry-badge expiring">${expiryDays}d left</span>`;
        else expiryBadge = `<span class="lease-expiry-badge ok">${fmtDate(activeLease.endDate||activeLease.end)}</span>`;
      }
      return `<tr data-id="${t.id}" style="cursor:pointer">
        <td><span class="mono">${t.id}</span></td>
        <td><div class="tenant-cell"><div class="tenant-avatar ${isCompany?'company':'individual'}">${initials}</div><div class="tenant-meta"><span class="name">${escapeHtml(t.name)}</span><span class="sub">${escapeHtml(t.city)} • ${escapeHtml(t.email||'')}</span></div></div></td>
        <td><span class="tenant-type-pill ${isCompany?'company':t.type==='Individual'?'':'company'}">${t.type}</span></td>
        <td><div style="font-weight:600;font-size:13px">${escapeHtml(t.property||(t.propertyNames||[])[0]||'—')}</div><div style="font-size:11px;color:var(--muted)">${(t.propertyIds||[]).length} properties</div></td>
        <td><div class="unit-chips" style="max-width:140px">${(t.unitCodes||[]).slice(0,2).map(u=>`<span class="unit-chip-mini">${escapeHtml(u)}</span>`).join('')}${(t.unitCodes||[]).length>2?`<span class="unit-chip-mini more">+${t.unitCodes.length-2}</span>`:''}</div></td>
        <td>${activeLease ? `<span class="mono" style="font-size:11px">${activeLease.id}</span>` : '<span class="pill gray">No lease</span>'}</td>
        <td><div style="font-weight:700">${fmtMoney(t.monthlyRent||t.rent)}</div></td>
        <td><div class="balance-cell"><span class="amt ${balance>0?'negative':''}">${balance>0?fmtMoney(balance):'—'}</span><span class="sub">${balance>0?'Outstanding':'Clear'}</span></div></td>
        <td><span class="risk-pill ${riskMap[risk]||'medium'}">${risk}</span></td>
        <td><span class="pill ${t.status==='Active'?'green':t.status==='Blacklisted'?'red':t.status==='Archived'?'gray':'amber'}">${t.status}</span></td>
        <td>${expiryBadge}</td>
        <td><button class="dots-btn" data-id="${t.id}">⋮</button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click', e=>{
        if(e.target.closest('.dots-btn')) return;
        openDrawer(tr.dataset.id);
      });
    });
    tbody.querySelectorAll('.dots-btn').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        openCtxMenu(btn, btn.dataset.id);
      });
    });
  }

  function openCtxMenu(anchor, tenantId){
    const t = getTenants().find(x=>x.id===tenantId);
    if(!t) return;
    const menu = document.getElementById('ctxMenu');
    const rect = anchor.getBoundingClientRect();
    const leases = getLeases().filter(l=>l.tenantId===tenantId || l.tenant===t.name);
    const activeLease = leases.find(l=>l.status==='Active' || l.status==='Expiring Soon');
    menu.innerHTML = `
      <div class="ctx-item" data-act="view">👁️ View Tenant</div>
      <div class="ctx-item" data-act="edit">✏️ Edit Tenant</div>
      <div class="ctx-item" data-act="create-lease">📄 Create Lease</div>
      ${activeLease ? `<div class="ctx-item" data-act="view-lease">📄 View Lease ${activeLease.id}</div>` : ''}
      <div class="ctx-item" data-act="view-property">🏢 View Property</div>
      <div class="ctx-item" data-act="view-unit">🏠 View Units</div>
      <div class="ctx-item" data-act="documents">📁 Documents</div>
      <div class="ctx-item" data-act="deactivate">⏸️ Deactivate</div>
      <div class="ctx-item danger" data-act="archive">📦 Archive</div>
      <div class="ctx-item danger" data-act="delete">🗑️ Delete</div>
    `;
    menu.style.left = (rect.left - 180 + rect.width) + 'px';
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.classList.add('open');
    menu.querySelectorAll('.ctx-item').forEach(item=>{
      item.addEventListener('click', ()=>{
        handleAction(item.dataset.act, tenantId);
        menu.classList.remove('open');
      });
    });
  }

  function handleAction(act, tenantId){
    const t = getTenants().find(x=>x.id===tenantId);
    if(!t) return;
    switch(act){
      case 'view': openDrawer(tenantId); break;
      case 'edit': openTenantModal(tenantId); break;
      case 'create-lease': goToPage(`leases.html?tenant=${tenantId}&property=${t.propertyIds?.[0]||''}`); break;
      case 'view-lease': {
        const leases = getLeases().filter(l=>l.tenantId===tenantId || l.tenant===t.name);
        const active = leases.find(l=>l.status==='Active' || l.status==='Expiring Soon') || leases[0];
        if(active) goToPage(`leases.html?id=${active.id}`);
        break;
      }
      case 'view-property': if(t.propertyIds?.[0]) goToPage(`property-register.html?id=${t.propertyIds[0]}`); else goToPage(`property-register.html`); break;
      case 'view-unit': goToPage(`units.html?property=${t.propertyIds?.[0]||''}`); break;
      case 'documents': openDrawer(tenantId); setTimeout(()=>{ document.querySelector('.drawer-tab[data-tab="documents"]')?.click(); }, 100); break;
      case 'deactivate': updateTenantStatus(tenantId,'Inactive'); break;
      case 'archive': updateTenantStatus(tenantId,'Archived'); break;
      case 'delete': confirmDeleteTenant(tenantId); break;
    }
  }

  function updateTenantStatus(id, newStatus){
    const tenants = getTenants();
    const idx = tenants.findIndex(t=>t.id===id);
    if(idx<0) return;
    const before = {...tenants[idx]};
    const leases = getLeases().filter(l=> (l.tenantId===id || l.tenant===tenants[idx].name) && (l.status==='Active' || l.status==='Expiring Soon'));
    if(newStatus!=='Active' && leases.length>0){
      toast(`Tenant has ${leases.length} active lease(s). Deactivate leases first or archive instead of delete.`,'error');
      // Allow inactive but warn
    }
    tenants[idx].status = newStatus;
    tenants[idx].updatedAt = new Date().toISOString();
    saveState();
    addAuditEvent('UPDATE','tenant',id,`Tenant status changed to ${newStatus}`, before, tenants[idx]);
    toast(`Tenant ${id} → ${newStatus}`,'success');
    applyFilters();
    if(selectedId===id) renderDrawerBody(id);
  }

  function confirmDeleteTenant(id){
    const t = getTenants().find(x=>x.id===id);
    if(!t) return;
    const leases = getLeases().filter(l=> (l.tenantId===id || l.tenant===t.name) && (l.status==='Active' || l.status==='Expiring Soon' || l.status==='Pending Approval'));
    if(leases.length>0){
      showConfirm(`Tenant ${t.name} has ${leases.length} active lease(s): ${leases.map(l=>l.id).join(', ')}. Permanent deletion is blocked. The tenant should be deactivated or blacklisted instead. Do you want to archive this tenant?`, ()=>{
        updateTenantStatus(id,'Archived');
      });
      return;
    }
    const balance = t.balance||0;
    if(balance>0){
      showConfirm(`Tenant ${t.name} has outstanding balance ${fmtMoney(balance)}. Archiving will preserve financial history. Continue to archive?`, ()=>{
        updateTenantStatus(id,'Archived');
      });
      return;
    }
    showConfirm(`Delete tenant ${t.name} (${id})? This will remove the tenant record but preserve lease history. Applications linked to this tenant will remain.`, ()=>{
      const tenants = getTenants();
      const idx = tenants.findIndex(x=>x.id===id);
      if(idx>=0){
        tenants.splice(idx,1);
        saveState();
        addAuditEvent('DELETE','tenant',id,`Tenant ${id} deleted`);
        toast(`Tenant ${id} deleted`,'success');
        applyFilters();
        closeDrawer();
      }
    }, true);
  }

  function openDrawer(id){
    const t = getTenants().find(x=>x.id===id);
    if(!t) return;
    selectedId = id;
    document.getElementById('drawerTitle').textContent = t.name;
    document.getElementById('drawerId').textContent = t.id;
    document.getElementById('drawerStatus').textContent = t.status;
    document.getElementById('drawerStatus').className = `pill ${t.status==='Active'?'green':t.status==='Blacklisted'?'red':t.status==='Archived'?'gray':'amber'}`;
    const prop = t.propertyNames?.[0] || t.property || '—';
    const unit = (t.unitCodes||[]).join(', ') || t.unit || '—';
    document.getElementById('drawerSubtitle').textContent = `${prop} — ${unit} • ${fmtMoney(t.monthlyRent||t.rent)} • ${t.city}`;

    const leases = getLeases().filter(l=> l.tenantId===id || l.tenant===t.name);
    const activeLease = leases.find(l=> l.status==='Active' || l.status==='Expiring Soon');

    const summary = document.getElementById('drawerSummary');
    summary.innerHTML = `
      <div class="info-box"><div class="label">Monthly Rent</div><div class="value" style="font-size:14px">${fmtMoney(t.monthlyRent||t.rent)}</div></div>
      <div class="info-box"><div class="label">Balance</div><div class="value" style="font-size:14px" class="${(t.balance||0)>0?'color:var(--red-600)':''}">${fmtMoney(t.balance||0)}</div></div>
      <div class="info-box"><div class="label">Risk</div><div class="value"><span class="risk-pill ${(t.riskRating||t.risk||'Medium').toLowerCase()}">${t.riskRating||t.risk}</span></div></div>
      <div class="info-box"><div class="label">Leases</div><div class="value" style="font-size:14px">${leases.length} leases • ${activeLease?activeLease.status:'No active'}</div></div>
    `;

    renderDrawerBody(id);
    renderDrawerActions(id);

    document.getElementById('detailDrawer').classList.add('open');
    document.getElementById('drawerBackdrop').classList.add('open');
    document.body.style.overflow='hidden';
  }

  function renderDrawerBody(id){
    const t = getTenants().find(x=>x.id===id);
    if(!t) return;
    const body = document.getElementById('drawerBody');
    const leases = getLeases().filter(l=> l.tenantId===id || l.tenant===t.name);
    const apps = getApps().filter(a=> a.tenantId===id || a.applicantName===t.name);

    if(currentTab==='overview'){
      body.innerHTML = `
        <div class="drawer-section tenant-overview">
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div class="tenant-avatar-lg">${t.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
            <div style="flex:1">
              <h4 style="margin:0 0 4px">${escapeHtml(t.name)} <span class="tenant-type-pill ${t.type==='Company'?'company':''}">${t.type}</span></h4>
              <div style="font-size:12px;color:var(--muted)">${escapeHtml(t.city)} • ${t.tenure||'—'} tenure • ${t.id}</div>
              <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                <span class="pill ${t.status==='Active'?'green':'gray'}">${t.status}</span>
                <span class="risk-pill ${(t.riskRating||'Medium').toLowerCase()}">${t.riskRating||t.risk}</span>
                <span class="mono">${t.tpin||''}</span>
              </div>
            </div>
          </div>
          <div class="kvs" style="margin-top:14px">
            <div class="k">Tenant ID</div><div class="v mono">${t.id}</div>
            <div class="k">Type</div><div class="v">${t.type}</div>
            <div class="k">Phone</div><div class="v">${escapeHtml(t.phone)}</div>
            <div class="k">Email</div><div class="v">${escapeHtml(t.email)}</div>
            <div class="k">Address</div><div class="v">${escapeHtml(t.address)}</div>
            <div class="k">ID Type</div><div class="v">${t.idType||'—'}</div>
            <div class="k">ID Number</div><div class="v mono">${escapeHtml(t.idNumber||'—')}</div>
            ${t.companyRegistration ? `<div class="k">Registration</div><div class="v mono">${escapeHtml(t.companyRegistration)}</div>` : ''}
            <div class="k">City</div><div class="v">${escapeHtml(t.city)}</div>
            <div class="k">Created</div><div class="v">${fmtDate(t.createdAt)}</div>
            <div class="k">Updated</div><div class="v">${fmtDate(t.updatedAt)}</div>
          </div>
        </div>
        <div class="drawer-section"><h4>Chain: Application → Tenant → Lease → Property → Investment</h4>
          <div style="padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)">
            <div style="font-size:12px;line-height:1.6">
              ${apps.length ? `<div>📋 APPLICATION ${apps[0].id} • ${escapeHtml(apps[0].applicantName)} → ${apps[0].status}</div>` : '<div>📋 No application linked</div>'}
              <div style="margin-left:12px">↓</div>
              <div>👤 TENANT ${t.id} • ${escapeHtml(t.name)} • ${t.type} • ${t.city}</div>
              <div style="margin-left:12px">↓</div>
              ${leases.length ? leases.map(l=>`<div>📄 LEASE ${l.id} • ${escapeHtml(l.propertyName||l.property)} — ${(l.unitCodes||[]).join(', ')} • ${fmtMoney(l.monthlyRent||l.rent)} • ${l.status}</div>`).join('') : '<div>📄 No active lease — Create lease to activate rental income</div>'}
              <div style="margin-left:12px">↓</div>
              <div>🏢 PROPERTY ${t.propertyIds?.[0]||'P-XXX'} • ${escapeHtml(t.propertyNames?.[0]||t.property||'')} • Occupied → NOI</div>
              <div style="margin-left:12px">↓</div>
              <div>📊 INVESTMENT INV-${t.propertyIds?.[0]||'P-001'} • Portfolio • Fund • Yield ${(Math.random()*3+6).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      `;
    } else if(currentTab==='properties'){
      body.innerHTML = `
        <div class="drawer-section"><h4>Properties & Units • ${t.propertyIds?.length||1} properties • ${(t.unitCodes||[]).length||1} units</h4>
          <div class="prop-unit-list">
            ${(t.propertyIds||[t.property]).map((pid,i)=>{
              const pname = t.propertyNames?.[i] || t.property || getProps().find(p=>p.id===pid)?.name || pid;
              const ucode = t.unitCodes?.[i] || t.unit || '—';
              return `<div class="prop-unit-card"><div class="left"><span class="title">${escapeHtml(pname)} (${pid})</span><span class="sub">Unit: ${escapeHtml(ucode)} • ${t.city} • ${fmtMoney(t.monthlyRent||t.rent)} / month</span></div><button class="btn btn-sm" onclick="goToPage('property-register.html?id=${pid}')">View</button></div>`;
            }).join('') || '<div class="empty-state"><div class="ico">🏢</div><h3>No properties</h3><p>Tenant not linked to any property yet.</p></div>'}
          </div>
        </div>
        <div class="drawer-section"><h4>Units Detail</h4><div class="prop-unit-list">
          ${getUnits().filter(u=> (t.unitIds||[]).includes(u.id) || (t.unitCodes||[]).includes(u.code)).map(u=>`
            <div class="prop-unit-card"><div class="left"><span class="title">${escapeHtml(u.code)} • ${u.type}</span><span class="sub">${escapeHtml(u.property)} • Floor ${u.floor} • ${u.area}m² • ${u.status}</span></div><div style="display:flex;gap:6px"><span class="pill ${u.status==='Occupied'?'green':'amber'}">${u.status}</span><button class="btn btn-sm btn-ghost" onclick="goToPage('units.html?property=${u.propertyId}')">View</button></div></div>
          `).join('') || '<div class="small muted">No unit details found</div>'}
        </div></div>
      `;
    } else if(currentTab==='leases'){
      body.innerHTML = `
        <div class="drawer-section"><h4>Leases • ${leases.length} leases • ${fmtMoney(leases.reduce((s,l)=>s+(l.monthlyRent||l.rent||0),0))} total rent</h4>
          <div class="lease-list">${leases.length ? leases.map(l=>`
            <div class="lease-card"><div><span class="lease-id">${l.id}</span><div class="lease-main">${escapeHtml(l.propertyName||l.property)} — ${(l.unitCodes||[]).join(', ')||l.unit||''}</div><div class="lease-sub">${fmtDate(l.startDate||l.start)} → ${fmtDate(l.endDate||l.end)} • ${fmtMoney(l.monthlyRent||l.rent)} / month • ${l.leaseType} • ${l.status}</div></div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="lease-status ${l.status.toLowerCase().replace(' ','-')}">${l.status}</span><button class="btn btn-sm" onclick="goToPage('leases.html?id=${l.id}')">View</button></div></div>
          `).join('') : '<div class="empty-state"><div class="ico">📄</div><h3>No leases</h3><p>Create a lease to activate rental income flow to investment reporting.</p><button class="btn btn-primary btn-sm" onclick="goToPage(\'leases.html?tenant=${t.id}\')" style="margin-top:10px">+ Create Lease</button></div>'}
          </div>
        </div>
      `;
    } else if(currentTab==='financial'){
      const balance = t.balance||0;
      body.innerHTML = `
        <div class="drawer-section"><h4>Financial Summary</h4>
          <div class="financial-summary">
            <div class="financial-box"><div class="label">Monthly Rent</div><div class="value">${fmtMoney(t.monthlyRent||t.rent)}</div><div class="sub">Across ${(t.unitCodes||[]).length||1} units</div></div>
            <div class="financial-box"><div class="label">Outstanding Balance</div><div class="value ${balance>0?'red':''}">${fmtMoney(balance)}</div><div class="sub">${balance>0?'Arrears present':'Clear'}</div></div>
            <div class="financial-box"><div class="label">Deposit Held</div><div class="value">${fmtMoney(t.deposit|| (t.monthlyRent||t.rent||0)*2)}</div><div class="sub">Refundable at exit</div></div>
          </div>
          <div class="kvs" style="margin-top:12px">
            <div class="k">Current</div><div class="v">${fmtMoney(t.current||0)}</div>
            <div class="k">31-60 days</div><div class="v">${fmtMoney(t['31-60']||0)}</div>
            <div class="k">61-90 days</div><div class="v">${fmtMoney(t['61-90']||0)}</div>
            <div class="k">90+ days</div><div class="v">${fmtMoney(t['90+']||0)}</div>
            <div class="k">Total Arrears</div><div class="v" style="font-weight:800;color:${balance>0?'var(--red-600)':''}">${fmtMoney(balance)}</div>
          </div>
        </div>
        <div class="drawer-section"><h4>Invoices & Payments</h4><div class="small muted">Last payment: ${fmtDate(new Date(Date.now()-Math.floor(Math.random()*30)*24*3600*1000).toISOString().slice(0,10))} • Next invoice: ${fmtDate(new Date(Date.now()+5*24*3600*1000).toISOString().slice(0,10))}</div><button class="btn btn-sm" style="margin-top:8px">View Billing</button></div>
      `;
    } else if(currentTab==='documents'){
      body.innerHTML = `
        <div class="drawer-section"><h4>Documents • ${t.documents?.length||0}</h4>
          <div class="doc-grid">${(t.documents||[]).map(d=>`
            <div class="doc-card"><div class="ico">📄</div><div><div class="doc-name">${escapeHtml(d.name)}</div><div class="doc-meta">${d.type} • ${d.id}</div></div></div>
          `).join('') || '<div class="empty-state"><div class="ico">📁</div><h3>No documents</h3><p>Upload ID, registration, compliance, guarantor documents.</p></div>'}
          </div>
        </div>
      `;
    } else if(currentTab==='activity'){
      const audit = (getState().auditTrail||[]).filter(a=> a.entityId===t.id || a.description.includes(t.id)).slice(0,30);
      body.innerHTML = `<div class="drawer-section"><h4>Activity • ${audit.length} events</h4><div class="activity-timeline">${audit.length ? audit.map(a=>`
        <div class="activity-item"><div class="act-title">${escapeHtml(a.action)} • ${escapeHtml(a.description)}</div><div class="act-desc">${escapeHtml(a.user)} • ${a.entityType} ${a.entityId}</div><div class="act-time">${new Date(a.timestamp).toLocaleString()}</div></div>
      `).join('') : (t.activity||[]).map(a=>`
        <div class="activity-item"><div class="act-title">${escapeHtml(a.action)}</div><div class="act-desc">${escapeHtml(a.description)}</div><div class="act-time">${new Date(a.timestamp).toLocaleString()}</div></div>
      `).join('') || '<div class="empty-state"><div class="ico">🕒</div><h3>No activity</h3></div>'}</div></div>`;
    }
  }

  function renderDrawerActions(id){
    const t = getTenants().find(x=>x.id===id);
    const container = document.getElementById('drawerActions');
    if(!t || !container) return;
    const leases = getLeases().filter(l=> l.tenantId===id || l.tenant===t.name);
    const active = leases.find(l=> l.status==='Active' || l.status==='Expiring Soon');
    container.innerHTML = `
      <button class="btn" onclick="window.TenantsPage.openModal('${id}')">✏️ Edit</button>
      <button class="btn btn-primary" onclick="goToPage('leases.html?tenant=${id}')">+ Create Lease</button>
      ${active ? `<button class="btn" onclick="goToPage('leases.html?id=${active.id}')">📄 View Lease ${active.id}</button>` : ''}
      <button class="btn" onclick="goToPage('property-register.html?id=${t.propertyIds?.[0]||''}')">🏢 Property</button>
      <button class="btn btn-ghost" onclick="window.TenantsPage.closeDrawer()">Close</button>
    `;
  }

  function closeDrawer(){
    document.getElementById('detailDrawer')?.classList.remove('open');
    document.getElementById('drawerBackdrop')?.classList.remove('open');
    document.body.style.overflow='';
    selectedId=null;
  }

  function openTenantModal(id=null){
    editingId = id;
    const t = id ? getTenants().find(x=>x.id===id) : null;
    const isEdit = !!t;
    document.getElementById('tenantModalTitle').textContent = isEdit ? `Edit Tenant ${t.id}` : 'Add Tenant';
    const props = getProps();
    const body = document.getElementById('tenantModalBody');
    body.innerHTML = `
      <div class="form-grid">
        <div><label class="form-label req">Tenant Name</label><input class="form-input" id="f_name" value="${escapeHtml(t?.name||'')}"/></div>
        <div><label class="form-label req">Type</label><select class="form-select" id="f_type">${TYPES.map(tp=>`<option ${t?.type===tp?'selected':''}>${tp}</option>`).join('')}</select></div>
        <div><label class="form-label req">Phone</label><input class="form-input" id="f_phone" value="${escapeHtml(t?.phone||'')}"/></div>
        <div><label class="form-label req">Email</label><input class="form-input" id="f_email" value="${escapeHtml(t?.email||'')}"/></div>
        <div class="f-group full"><label class="form-label">Address</label><input class="form-input" id="f_address" value="${escapeHtml(t?.address||'')}"/></div>
        <div><label class="form-label">ID Type</label><select class="form-select" id="f_idType">${ID_TYPES.map(it=>`<option ${t?.idType===it?'selected':''}>${it}</option>`).join('')}</select></div>
        <div><label class="form-label">ID Number</label><input class="form-input" id="f_idNumber" value="${escapeHtml(t?.idNumber||'')}"/></div>
        <div><label class="form-label">Company Registration</label><input class="form-input" id="f_companyReg" value="${escapeHtml(t?.companyRegistration||'')}"/></div>
        <div><label class="form-label">TPIN</label><input class="form-input" id="f_tpin" value="${escapeHtml(t?.tpin||'')}"/></div>
        <div><label class="form-label">City</label><select class="form-select" id="f_city"><option ${t?.city==='Lusaka'?'selected':''}>Lusaka</option><option ${t?.city==='Ndola'?'selected':''}>Ndola</option><option ${t?.city==='Kabwe'?'selected':''}>Kabwe</option><option ${t?.city==='Chipata'?'selected':''}>Chipata</option></select></div>
        <div><label class="form-label">Risk Rating</label><select class="form-select" id="f_risk">${RISKS.map(r=>`<option ${ (t?.riskRating||t?.risk)===r?'selected':''}>${r}</option>`).join('')}</select></div>
        <div><label class="form-label">Status</label><select class="form-select" id="f_status">${STATUSES.map(s=>`<option ${t?.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        <div><label class="form-label">Property</label><select class="form-select" id="f_propertyId"><option value="">Select property</option>${props.map(p=>`<option value="${p.id}" ${(t?.propertyIds||[]).includes(p.id)?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>
        <div><label class="form-label">Monthly Rent</label><input type="number" class="form-input" id="f_rent" value="${t?.monthlyRent||t?.rent||''}"/></div>
        <div><label class="form-label">Balance</label><input type="number" class="form-input" id="f_balance" value="${t?.balance||0}"/></div>
        <div><label class="form-label">Lease Expiry</label><input type="date" class="form-input" id="f_expiry" value="${t?.leaseExpiry||''}"/></div>
      </div>
    `;
    document.getElementById('tenantModalBackdrop').classList.add('open');
  }

  function closeTenantModal(){ document.getElementById('tenantModalBackdrop').classList.remove('open'); editingId=null; }

  function saveTenantModal(){
    const getVal = id=> document.getElementById(id)?.value?.trim()||'';
    const name = getVal('f_name');
    if(!name){ toast('Name required','error'); return; }
    const propId = getVal('f_propertyId');
    const prop = getProps().find(p=>p.id===propId);

    if(editingId){
      const tenants = getTenants();
      const idx = tenants.findIndex(t=>t.id===editingId);
      if(idx>=0){
        const before = {...tenants[idx]};
        const t = tenants[idx];
        t.name = name;
        t.type = getVal('f_type');
        t.phone = getVal('f_phone');
        t.email = getVal('f_email');
        t.address = getVal('f_address');
        t.idType = getVal('f_idType');
        t.idNumber = getVal('f_idNumber');
        t.companyRegistration = getVal('f_companyReg');
        t.tpin = getVal('f_tpin');
        t.city = getVal('f_city');
        t.riskRating = getVal('f_risk'); t.risk = getVal('f_risk');
        t.status = getVal('f_status');
        t.propertyIds = propId ? [propId] : t.propertyIds;
        t.propertyNames = prop ? [prop.name] : t.propertyNames;
        t.property = prop ? prop.name : t.property;
        t.monthlyRent = parseFloat(getVal('f_rent'))||t.monthlyRent||0;
        t.rent = t.monthlyRent;
        t.balance = parseFloat(getVal('f_balance'))||0;
        t.total = t.balance;
        t.leaseExpiry = getVal('f_expiry') || t.leaseExpiry;
        t.updatedAt = new Date().toISOString().slice(0,10);
        saveState();
        addAuditEvent('UPDATE','tenant',t.id,'Tenant updated', before, t);
        toast(`Tenant ${t.id} updated`,'success');
      }
    } else {
      const newId = `T-${1043 + getTenants().length}`;
      const tenant = {
        id: newId,
        name: name,
        type: getVal('f_type'),
        phone: getVal('f_phone'),
        email: getVal('f_email'),
        address: getVal('f_address'),
        idType: getVal('f_idType'),
        idNumber: getVal('f_idNumber'),
        companyRegistration: getVal('f_companyReg'),
        tpin: getVal('f_tpin'),
        propertyIds: propId ? [propId] : [],
        propertyNames: prop ? [prop.name] : [],
        property: prop ? prop.name : '',
        unitIds: [],
        unitCodes: [],
        unit: '',
        leaseIds: [],
        applicationIds: [],
        riskRating: getVal('f_risk'),
        risk: getVal('f_risk'),
        status: getVal('f_status') || 'Active',
        balance: parseFloat(getVal('f_balance'))||0,
        monthlyRent: parseFloat(getVal('f_rent'))||0,
        rent: parseFloat(getVal('f_rent'))||0,
        deposit: (parseFloat(getVal('f_rent'))||0)*2,
        leaseExpiry: getVal('f_expiry') || new Date(Date.now()+365*24*3600*1000).toISOString().slice(0,10),
        city: getVal('f_city'),
        tenure: '0.0y',
        current:0, "31-60":0, "61-90":0, "90+":0, total: parseFloat(getVal('f_balance'))||0,
        createdAt: new Date().toISOString().slice(0,10),
        updatedAt: new Date().toISOString().slice(0,10),
        documents: [],
        activity: [{id:`ACT-${newId}-1`, timestamp:new Date().toISOString(), user:'Chanda Mwanza', action:'Tenant created', description:`Tenant ${name} created`}]
      };
      getState().tenants.push(tenant);
      saveState();
      addAuditEvent('CREATE','tenant',newId,`Tenant ${name} created`);
      toast(`Tenant ${newId} created`,'success');
    }
    closeTenantModal();
    applyFilters();
  }

  function exportTenants(){
    const rows = filtered.length ? filtered : getTenants();
    const csv = [
      ['Tenant ID','Name','Type','Property','Units','Monthly Rent','Balance','Risk','Status','Lease Expiry','City'].join(','),
      ...rows.map(t=>[t.id, `"${t.name}"`, t.type, `"${t.property||(t.propertyNames||[])[0]||''}"`, `"${(t.unitCodes||[]).join(';')}"`, t.monthlyRent||t.rent||0, t.balance||0, t.riskRating||t.risk||'', t.status, t.leaseExpiry||'', t.city||''].join(','))
    ].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='Tenants.csv'; a.click(); URL.revokeObjectURL(url);
    toast('Tenants exported','success');
  }

  function showConfirm(msg, onOk, isDanger=false){
    const backdrop = document.getElementById('confirmBackdrop');
    document.getElementById('confirmBody').textContent = msg;
    document.getElementById('confirmTitle').textContent = isDanger ? 'Confirm Delete' : 'Confirm Action';
    backdrop.classList.add('open');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newCancel.addEventListener('click', closeConfirm);
    newOk.addEventListener('click', ()=>{ closeConfirm(); onOk(); });
  }
  function closeConfirm(){ document.getElementById('confirmBackdrop').classList.remove('open'); }
  function escapeHtml(str){ return window.escapeHtml ? window.escapeHtml(str) : String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function goToPage(p){ window.goToPage ? window.goToPage(p) : location.href = p; }

  window.TenantsPage = { openModal: openTenantModal, closeDrawer };
})();

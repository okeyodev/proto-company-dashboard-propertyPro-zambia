/**
 * Applications Page - PropertyPro Zambia Ltd v3
 * Enterprise leasing lifecycle: Draft → Submitted → Under Review → KYC Pending → KYC Passed → Committee Review → Approved → Tenant → Lease
 */

(function(){
  const STORAGE_KEY = 'propertypro_v3';
  let filteredApps = [];
  let currentPage = 1;
  let pageSize = 50;
  let selectedAppId = null;
  let currentTab = 'overview';
  let editingAppId = null;
  let ctxAppId = null;

  const STATUS_FLOW = ['Draft','Submitted','Under Review','KYC Pending','KYC Passed','KYC Failed','Committee Review','Approved','Rejected','Withdrawn'];
  const KYC_STATUSES = ['Not Started','Pending','Passed','Failed'];
  const RISK_RATINGS = ['Low','Medium','High','Critical'];
  const APPLICANT_TYPES = ['Individual','Company','NGO','Government'];
  const ID_TYPES = ['NRC','Passport','TPIN','Business Registration'];
  const LEASE_TYPES = ['Retail','Commercial','Residential','Industrial','Mixed-Use','Fixed','Periodic'];
  const OFFICERS = ['Mutale Phiri','Grace Banda','John Mwila','Chanda Mwanza','Peter Zulu','Mary Lungu'];

  function getState(){ return window.state || {}; }
  function getApps(){ return getState().applications || []; }
  function getProps(){ return getState().properties || []; }
  function getUnits(){ return getState().units || []; }
  function getTenants(){ return getState().tenants || []; }
  function getLeases(){ return getState().leases || []; }

  function fmtMoney(v){
    if(v==null) return 'ZMW 0';
    return 'ZMW ' + Number(v).toLocaleString('en-ZM');
  }
  function fmtDate(d){
    if(!d) return '—';
    try{
      const dt = new Date(d);
      if(isNaN(dt)) return d;
      return dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    }catch{return d}
  }
  function statusPill(status){
    const map = {
      'Draft':'gray','Submitted':'blue','Under Review':'amber','KYC Pending':'amber','KYC Passed':'green','KYC Failed':'red','Committee Review':'amber','Approved':'green','Rejected':'red','Withdrawn':'gray'
    };
    const c = map[status]||'gray';
    return `<span class="pill ${c}">${status}</span>`;
  }
  function riskPill(risk){
    const m = {Low:'low',Medium:'medium',High:'high',Critical:'critical'};
    return `<span class="risk-pill ${m[risk]||'medium'}">${risk}</span>`;
  }
  function kycPill(kyc){
    const m = {Passed:'green',Failed:'red',Pending:'amber','Not Started':'gray',Verified:'green'};
    const c = m[kyc]||'gray';
    return `<span class="pill ${c}">${kyc}</span>`;
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    window.initCommon && window.initCommon('applications');
    populateFilters();
    bindEvents();
    handleQueryParams();
    renderKPIs();
    applyFilters();
    // Deep link
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if(id){ setTimeout(()=>openDrawer(id), 300); }
  });

  function populateFilters(){
    const propSelect = document.getElementById('filterProperty');
    const officerSelect = document.getElementById('filterOfficer');
    const props = getProps();
    propSelect.innerHTML = '<option value="">All Properties</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    officerSelect.innerHTML = '<option value="">All Officers</option>' + OFFICERS.map(o=>`<option value="${o}">${o}</option>`).join('');
  }

  function bindEvents(){
    document.getElementById('searchInputLocal')?.addEventListener('input', debounce(applyFilters, 300));
    ['filterProperty','filterStatus','filterApplicantType','filterRisk','filterOfficer','filterDate'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('btnResetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('btnExportApps')?.addEventListener('click', exportApps);
    document.getElementById('btnNewApplication')?.addEventListener('click', ()=>openAppModal());
    document.getElementById('pageSize')?.addEventListener('change', (e)=>{ pageSize=parseInt(e.target.value); currentPage=1; renderTable(); });
    document.getElementById('prevPage')?.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; renderTable(); }});
    document.getElementById('nextPage')?.addEventListener('click', ()=>{ const max=Math.ceil(filteredApps.length/pageSize); if(currentPage<max){ currentPage++; renderTable(); }});
    // Drawer
    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        document.querySelectorAll('.drawer-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        if(selectedAppId) renderDrawerBody(selectedAppId);
      });
    });
    // App modal
    document.getElementById('btnCloseAppModal')?.addEventListener('click', closeAppModal);
    document.getElementById('btnCancelAppModal')?.addEventListener('click', closeAppModal);
    document.getElementById('appModalBackdrop')?.addEventListener('click', (e)=>{ if(e.target.id==='appModalBackdrop') closeAppModal(); });
    document.getElementById('btnSaveApp')?.addEventListener('click', saveAppModal);
    // Confirm
    document.getElementById('confirmCancel')?.addEventListener('click', closeConfirm);
    document.getElementById('confirmBackdrop')?.addEventListener('click', (e)=>{ if(e.target.id==='confirmBackdrop') closeConfirm(); });
    // Context menu close
    document.addEventListener('click', (e)=>{
      const menu = document.getElementById('ctxMenu');
      if(menu && !menu.contains(e.target) && !e.target.closest('.dots-btn')) menu.classList.remove('open');
    });
  }

  function handleQueryParams(){
    const params = new URLSearchParams(location.search);
    const prop = params.get('property');
    const unit = params.get('unit');
    if(prop){ document.getElementById('filterProperty').value = prop; }
    if(unit){ /* will filter by unit in applyFilters if needed */ }
  }

  function debounce(fn, delay){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

  function applyFilters(){
    const q = (document.getElementById('searchInputLocal')?.value||'').toLowerCase();
    const prop = document.getElementById('filterProperty')?.value||'';
    const status = document.getElementById('filterStatus')?.value||'';
    const type = document.getElementById('filterApplicantType')?.value||'';
    const risk = document.getElementById('filterRisk')?.value||'';
    const officer = document.getElementById('filterOfficer')?.value||'';
    const date = document.getElementById('filterDate')?.value||'';

    filteredApps = getApps().filter(a=>{
      if(q){
        const hay = `${a.id} ${a.applicantName} ${a.propertyName} ${a.assignedOfficer} ${a.phone} ${a.email}`.toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(prop && a.propertyId!==prop) return false;
      if(status && a.status!==status) return false;
      if(type && a.applicantType!==type) return false;
      if(risk && a.riskRating!==risk) return false;
      if(officer && a.assignedOfficer!==officer) return false;
      if(date && a.submittedAt!==date) return false;
      return true;
    }).sort((a,b)=> new Date(b.submittedAt) - new Date(a.submittedAt));

    currentPage = 1;
    renderKPIs();
    renderTable();
  }

  function resetFilters(){
    document.getElementById('searchInputLocal').value='';
    ['filterProperty','filterStatus','filterApplicantType','filterRisk','filterOfficer','filterDate'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.value='';
    });
    applyFilters();
  }

  function renderKPIs(){
    const apps = filteredApps.length ? filteredApps : getApps();
    const total = apps.length;
    const newApps = apps.filter(a=> a.status==='Submitted').length;
    const underReview = apps.filter(a=> a.status==='Under Review').length;
    const kycPending = apps.filter(a=> a.status==='KYC Pending' || a.kycStatus==='Pending').length;
    const committee = apps.filter(a=> a.status==='Committee Review').length;
    const approved = apps.filter(a=> a.status==='Approved').length;
    const rejected = apps.filter(a=> a.status==='Rejected').length;

    const kpiGrid = document.getElementById('kpiGrid');
    if(!kpiGrid) return;
    kpiGrid.innerHTML = `
      <div class="kpi"><div class="kpi-top"><span class="kpi-label">Total Applications</span><span class="pill blue">${total}</span></div><div class="kpi-value">${total}</div><div class="kpi-meta"><span>${getApps().length} overall • ${fmtMoney(apps.reduce((s,a)=>s+(a.proposedRent||0),0))} proposed</span></div></div>
      <div class="kpi kpi-violet"><div class="kpi-top"><span class="kpi-label">New Applications</span><span class="pill blue">${newApps}</span></div><div class="kpi-value">${newApps}</div><div class="kpi-meta"><span>Submitted last 30 days</span></div></div>
      <div class="kpi kpi-amber"><div class="kpi-top"><span class="kpi-label">Under Review</span><span class="pill amber">${underReview}</span></div><div class="kpi-value">${underReview}</div><div class="kpi-meta"><span>Requires officer action</span></div></div>
      <div class="kpi kpi-amber"><div class="kpi-top"><span class="kpi-label">KYC Pending</span><span class="pill amber">${kycPending}</span></div><div class="kpi-value">${kycPending}</div><div class="kpi-meta"><span>Identity & income checks</span></div></div>
      <div class="kpi kpi-amber"><div class="kpi-top"><span class="kpi-label">Committee Review</span><span class="pill amber">${committee}</span></div><div class="kpi-value">${committee}</div><div class="kpi-meta"><span>Awaiting decision</span></div></div>
      <div class="kpi kpi-green"><div class="kpi-top"><span class="kpi-label">Approved</span><span class="pill green">${approved}</span></div><div class="kpi-value">${approved}</div><div class="kpi-meta"><span>Ready for tenant creation</span></div></div>
      <div class="kpi kpi-red"><div class="kpi-top"><span class="kpi-label">Rejected</span><span class="pill red">${rejected}</span></div><div class="kpi-value">${rejected}</div><div class="kpi-meta"><span>Failed criteria</span></div></div>
    `;
    // Also update rent label
    const rentLabel = document.getElementById('rentLabel');
    if(rentLabel) rentLabel.textContent = fmtMoney(apps.reduce((s,a)=>s+(a.proposedRent||0),0));
  }

  function renderTable(){
    const tbody = document.getElementById('appsTbody');
    const countLabel = document.getElementById('countLabel');
    const tableInfo = document.getElementById('tableInfo');
    if(!tbody) return;

    const start = (currentPage-1)*pageSize;
    const pageData = filteredApps.slice(start, start+pageSize);

    if(countLabel) countLabel.textContent = filteredApps.length;
    if(tableInfo) tableInfo.textContent = `Showing ${filteredApps.length ? start+1 : 0}-${Math.min(start+pageSize, filteredApps.length)} of ${filteredApps.length}`;

    if(pageData.length===0){
      tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><div class="ico">📋</div><h3>No applications found</h3><p>Try changing your filters or create a new application. Applications bridge Marketing/Vacancies → Tenants → Leases.</p><button class="btn btn-primary btn-sm" onclick="document.getElementById('btnNewApplication').click()" style="margin-top:10px">+ New Application</button></div></td></tr>`;
      return;
    }

    tbody.innerHTML = pageData.map(a=>{
      const initials = (a.applicantName||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      return `<tr data-id="${a.id}" style="cursor:pointer">
        <td><span class="mono">${a.id}</span></td>
        <td><div class="applicant-cell"><div class="applicant-avatar">${initials}</div><div class="applicant-meta"><span class="name">${escapeHtml(a.applicantName)}</span><span class="sub">${escapeHtml(a.email||'')}</span></div></div></td>
        <td><span class="pill gray">${a.applicantType}</span></td>
        <td><div style="font-weight:600;font-size:13px">${escapeHtml(a.propertyName)}</div><div style="font-size:11px;color:var(--muted)">${a.propertyId}</div></td>
        <td><div class="unit-chips">${(a.unitCodes||a.unitIds||[]).slice(0,2).map(u=>`<span class="unit-chip-mini">${escapeHtml(u)}</span>`).join('')}${(a.unitCodes||[]).length>2?`<span class="unit-chip-mini more">+${a.unitCodes.length-2}</span>`:''}</div></td>
        <td><div style="font-weight:700">${fmtMoney(a.proposedRent)}</div><div style="font-size:11px;color:var(--muted)">${a.proposedTermMonths}m term</div></td>
        <td>${fmtDate(a.submittedAt)}</td>
        <td><div class="kyc-indicators" title="KYC: ${a.kycStatus}">${kycPill(a.kycStatus)}</div></td>
        <td>${riskPill(a.riskRating)}</td>
        <td>${statusPill(a.status)}</td>
        <td><div style="font-size:12px;font-weight:600">${escapeHtml(a.assignedOfficer)}</div></td>
        <td><button class="dots-btn" data-action="menu" data-id="${a.id}">⋮</button></td>
      </tr>`;
    }).join('');

    // Row click opens drawer
    tbody.querySelectorAll('tr[data-id]').forEach(tr=>{
      tr.addEventListener('click', (e)=>{
        if(e.target.closest('.dots-btn')) return;
        openDrawer(tr.dataset.id);
      });
    });
    tbody.querySelectorAll('.dots-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        openCtxMenu(btn, btn.dataset.id);
      });
    });
  }

  function openCtxMenu(anchor, appId){
    const app = getApps().find(a=>a.id===appId);
    if(!app) return;
    ctxAppId = appId;
    const menu = document.getElementById('ctxMenu');
    const rect = anchor.getBoundingClientRect();
    menu.innerHTML = `
      <div class="ctx-item" data-act="view">👁️ View Details</div>
      <div class="ctx-item" data-act="edit">✏️ Edit Application</div>
      <div class="ctx-item" data-act="status">🔄 Update Status</div>
      <div class="ctx-item" data-act="kyc">🛡️ Submit for KYC</div>
      ${app.status==='KYC Pending' ? `<div class="ctx-item" data-act="kyc-pass">✅ Mark KYC Passed</div><div class="ctx-item" data-act="kyc-fail">❌ Mark KYC Failed</div>` : ''}
      ${['KYC Passed','Under Review'].includes(app.status) ? `<div class="ctx-item" data-act="committee">👥 Send to Committee</div>` : ''}
      ${app.status==='Committee Review' ? `<div class="ctx-item" data-act="approve">✅ Approve</div><div class="ctx-item" data-act="reject">❌ Reject</div>` : ''}
      ${app.status==='Approved' ? `<div class="ctx-item" data-act="create-tenant">👤 Create Tenant</div>` : ''}
      <div class="ctx-item" data-act="view-property">🏢 View Property</div>
      <div class="ctx-item" data-act="view-unit">🏠 View Unit</div>
      ${app.tenantId ? `<div class="ctx-item" data-act="view-tenant">👤 View Tenant ${app.tenantId}</div>` : ''}
      <div class="ctx-item danger" data-act="withdraw">↩️ Withdraw</div>
      <div class="ctx-item danger" data-act="delete">🗑️ Delete</div>
    `;
    menu.style.left = (rect.left - 180 + rect.width) + 'px';
    menu.style.top = (rect.bottom + 6) + 'px';
    menu.classList.add('open');
    menu.querySelectorAll('.ctx-item').forEach(item=>{
      item.addEventListener('click', ()=>{
        handleAction(item.dataset.act, appId);
        menu.classList.remove('open');
      });
    });
  }

  function handleAction(act, appId){
    const app = getApps().find(a=>a.id===appId);
    if(!app) return;
    switch(act){
      case 'view': openDrawer(appId); break;
      case 'edit': openAppModal(appId); break;
      case 'status': openStatusModal(appId); break;
      case 'kyc': updateAppStatus(appId,'KYC Pending','Submitted for KYC verification'); break;
      case 'kyc-pass': updateAppStatus(appId,'KYC Passed','KYC verification passed', {kycStatus:'Passed'}); break;
      case 'kyc-fail': updateAppStatus(appId,'KYC Failed','KYC verification failed', {kycStatus:'Failed'}); break;
      case 'committee': updateAppStatus(appId,'Committee Review','Sent to committee for review', {committeeStatus:'Pending'}); break;
      case 'approve': approveApplication(appId); break;
      case 'reject': rejectApplication(appId); break;
      case 'create-tenant': createTenantFromApp(appId); break;
      case 'view-property': goToPage(`property-register.html?id=${app.propertyId}`); break;
      case 'view-unit': if(app.unitIds && app.unitIds[0]) goToPage(`units.html?property=${app.propertyId}&unit=${app.unitIds[0]}`); else goToPage(`units.html?property=${app.propertyId}`); break;
      case 'view-tenant': if(app.tenantId) goToPage(`tenants.html?id=${app.tenantId}`); break;
      case 'withdraw': updateAppStatus(appId,'Withdrawn','Application withdrawn by applicant'); break;
      case 'delete': confirmDeleteApp(appId); break;
    }
  }

  function updateAppStatus(appId, newStatus, description, extra={}){
    const apps = getApps();
    const idx = apps.findIndex(a=>a.id===appId);
    if(idx<0) return;
    const before = {...apps[idx]};
    apps[idx].status = newStatus;
    if(extra.kycStatus) apps[idx].kycStatus = extra.kycStatus;
    if(extra.committeeStatus) apps[idx].committeeStatus = extra.committeeStatus;
    if(newStatus==='Approved'){
      apps[idx].committeeStatus='Approved';
      apps[idx].committeeDecision='Approved';
      apps[idx].decisionDate=new Date().toISOString().slice(0,10);
      apps[idx].decisionMaker='Chanda Mwanza';
    }
    if(newStatus==='Rejected'){
      apps[idx].committeeStatus='Rejected';
      apps[idx].committeeDecision='Rejected';
      apps[idx].decisionDate=new Date().toISOString().slice(0,10);
      apps[idx].decisionMaker='Chanda Mwanza';
    }
    apps[idx].updatedAt = new Date().toISOString();
    saveState();
    window.addAuditEvent && addAuditEvent('UPDATE','application',appId, description || `Application status changed to ${newStatus}`, before, apps[idx]);
    toast(`Application ${appId} → ${newStatus}`,'success');
    applyFilters();
    if(selectedAppId===appId) renderDrawerBody(appId);
  }

  function approveApplication(appId){
    showConfirm(`Approve application ${appId}? This will mark KYC as passed and move to Approved. You can then create a tenant.`, ()=>{
      updateAppStatus(appId,'Approved','Application approved by committee', {kycStatus:'Passed', committeeStatus:'Approved'});
    });
  }
  function rejectApplication(appId){
    const reason = prompt('Reason for rejection?') || 'Did not meet criteria';
    showConfirm(`Reject application ${appId}? Reason: ${reason}`, ()=>{
      const apps = getApps();
      const idx = apps.findIndex(a=>a.id===appId);
      if(idx>=0){
        apps[idx].status='Rejected';
        apps[idx].kycStatus=apps[idx].kycStatus||'Failed';
        apps[idx].committeeStatus='Rejected';
        apps[idx].committeeDecision='Rejected';
        apps[idx].comments=reason;
        apps[idx].decisionDate=new Date().toISOString().slice(0,10);
        apps[idx].decisionMaker='Chanda Mwanza';
        saveState();
        addAuditEvent('UPDATE','application',appId,`Application rejected: ${reason}`);
        toast(`Application ${appId} rejected`,'error');
        applyFilters();
        if(selectedAppId===appId) renderDrawerBody(appId);
      }
    });
  }

  function confirmDeleteApp(appId){
    showConfirm(`Delete application ${appId}? This action cannot be undone. If the application has a linked tenant, the tenant will remain but the link will be removed.`, ()=>{
      const apps = getApps();
      const idx = apps.findIndex(a=>a.id===appId);
      if(idx>=0){
        const removed = apps.splice(idx,1)[0];
        saveState();
        addAuditEvent('DELETE','application',appId,`Application ${appId} deleted`);
        toast(`Application ${appId} deleted`,'success');
        applyFilters();
        closeDrawer();
      }
    }, true);
  }

  function createTenantFromApp(appId){
    const app = getApps().find(a=>a.id===appId);
    if(!app){ toast('Application not found','error'); return; }
    if(app.status!=='Approved'){ toast('Only approved applications can create tenants','error'); return; }
    if(app.tenantId){ toast(`Tenant ${app.tenantId} already exists for this application`,'info'); goToPage(`tenants.html?id=${app.tenantId}`); return; }

    // Check if tenant already exists by name
    const existingTenant = getTenants().find(t=>t.name===app.applicantName);
    let tenantId;
    if(existingTenant){
      tenantId = existingTenant.id;
      // Link
      app.tenantId = tenantId;
      if(!existingTenant.applicationIds.includes(app.id)) existingTenant.applicationIds.push(app.id);
      saveState();
      toast(`Linked to existing tenant ${tenantId}`,'success');
      goToPage(`tenants.html?id=${tenantId}`);
      return;
    }

    const newId = `T-${1043 + getTenants().length}`;
    const prop = getProps().find(p=>p.id===app.propertyId) || {name:app.propertyName, id:app.propertyId};
    const tenant = {
      id: newId,
      name: app.applicantName,
      type: app.applicantType==='Company' ? 'Company' : app.applicantType==='Individual' ? 'Individual' : 'Company',
      phone: app.phone,
      email: app.email,
      address: app.address,
      idType: app.idType,
      idNumber: app.idNumber,
      companyRegistration: app.companyRegistration||'',
      tpin: `${Math.floor(1000000000+Math.random()*9000000000)}`,
      propertyIds: [app.propertyId],
      propertyNames: [app.propertyName],
      property: app.propertyName,
      unitIds: app.unitIds||[],
      unitCodes: app.unitCodes||[],
      unit: (app.unitCodes||[])[0]||'',
      leaseIds: [],
      applicationIds: [app.id],
      riskRating: app.riskRating||'Medium',
      risk: app.riskRating||'Medium',
      status: 'Active',
      balance: 0,
      monthlyRent: app.proposedRent,
      rent: app.proposedRent,
      deposit: app.deposit,
      leaseExpiry: new Date(Date.now()+ 365*24*3600*1000).toISOString().slice(0,10),
      city: prop.city||'Lusaka',
      tenure: '0.0y',
      current:0, "31-60":0, "61-90":0, "90+":0, total:0,
      createdAt: new Date().toISOString().slice(0,10),
      updatedAt: new Date().toISOString().slice(0,10),
      documents: app.documents||[],
      activity: [{id:`ACT-${newId}-1`, timestamp:new Date().toISOString(), user:'Chanda Mwanza', action:'Tenant created from application', description:`Created from ${app.id} - ${app.applicantName}`}]
    };
    getState().tenants.push(tenant);
    app.tenantId = newId;
    saveState();
    addAuditEvent('CREATE','tenant',newId,`Tenant created from application ${app.id}`);
    addAuditEvent('UPDATE','application',app.id,`Tenant ${newId} linked to application`);
    toast(`Tenant ${newId} created from ${app.id}`,'success');
    applyFilters();
    if(selectedAppId===appId) renderDrawerBody(appId);
    // Offer to create lease
    setTimeout(()=>{
      if(confirm(`Tenant ${newId} created. Create lease now?`)){
        goToPage(`leases.html?tenant=${newId}&property=${app.propertyId}&application=${app.id}`);
      } else {
        goToPage(`tenants.html?id=${newId}`);
      }
    }, 400);
  }

  function openDrawer(appId){
    const app = getApps().find(a=>a.id===appId);
    if(!app) return;
    selectedAppId = appId;
    document.getElementById('drawerTitle').textContent = app.applicantName;
    document.getElementById('drawerId').textContent = app.id;
    document.getElementById('drawerStatus').textContent = app.status;
    document.getElementById('drawerStatus').className = 'pill ' + ({Draft:'gray',Submitted:'blue','Under Review':'amber','KYC Pending':'amber','KYC Passed':'green','KYC Failed':'red','Committee Review':'amber',Approved:'green',Rejected:'red',Withdrawn:'gray'}[app.status]||'gray');
    document.getElementById('drawerSubtitle').textContent = `${app.propertyName} — ${(app.unitCodes||[]).join(', ')} • ${fmtMoney(app.proposedRent)} / month • ${app.assignedOfficer}`;

    // Summary
    const summary = document.getElementById('drawerSummary');
    summary.innerHTML = `
      <div class="info-box"><div class="label">Property</div><div class="value" style="font-size:13px">${escapeHtml(app.propertyName)}</div></div>
      <div class="info-box"><div class="label">Proposed Rent</div><div class="value">${fmtMoney(app.proposedRent)}</div></div>
      <div class="info-box"><div class="label">Risk</div><div class="value">${riskPill(app.riskRating)}</div></div>
      <div class="info-box"><div class="label">KYC</div><div class="value">${kycPill(app.kycStatus)}</div></div>
    `;

    renderDrawerBody(appId);
    renderDrawerActions(appId);

    document.getElementById('detailDrawer').classList.add('open');
    document.getElementById('drawerBackdrop').classList.add('open');
    document.getElementById('drawerBackdrop').classList.add('open');
    document.body.style.overflow='hidden';
  }

  function renderDrawerBody(appId){
    const app = getApps().find(a=>a.id===appId);
    if(!app) return;
    const body = document.getElementById('drawerBody');
    if(!body) return;

    if(currentTab==='overview'){
      body.innerHTML = `
        <div class="drawer-section applicant-info">
          <h4>Applicant Information</h4>
          <div class="kvs">
            <div class="k">Full Name</div><div class="v">${escapeHtml(app.applicantName)}</div>
            <div class="k">Applicant Type</div><div class="v"><span class="pill gray">${app.applicantType}</span></div>
            <div class="k">Phone</div><div class="v">${escapeHtml(app.phone)}</div>
            <div class="k">Email</div><div class="v">${escapeHtml(app.email)}</div>
            <div class="k">Address</div><div class="v">${escapeHtml(app.address)}</div>
            <div class="k">ID Type</div><div class="v">${app.idType}</div>
            <div class="k">ID Number</div><div class="v mono">${escapeHtml(app.idNumber)}</div>
            ${app.companyName ? `<div class="k">Company</div><div class="v">${escapeHtml(app.companyName)}<br><span class="mono">${escapeHtml(app.companyRegistration)}</span></div>` : ''}
          </div>
        </div>
        <div class="drawer-section">
          <h4>Application Information</h4>
          <div class="kvs">
            <div class="k">Property</div><div class="v"><a href="#" onclick="event.preventDefault(); goToPage('property-register.html?id=${app.propertyId}')">${escapeHtml(app.propertyName)} (${app.propertyId})</a></div>
            <div class="k">Unit(s)</div><div class="v">${(app.unitCodes||[]).map(u=>`<span class="unit-chip-mini">${escapeHtml(u)}</span>`).join(' ')} <a href="#" onclick="event.preventDefault(); goToPage('units.html?property=${app.propertyId}')" style="margin-left:8px;font-size:11px">View Units</a></div>
            <div class="k">Lease Type</div><div class="v"><span class="pill gray">${app.leaseType}</span></div>
            <div class="k">Proposed Rent</div><div class="v" style="font-weight:700">${fmtMoney(app.proposedRent)}</div>
            <div class="k">Deposit</div><div class="v">${fmtMoney(app.deposit)}</div>
            <div class="k">Service Charge</div><div class="v">${fmtMoney(app.serviceCharge)}</div>
            <div class="k">Start Date</div><div class="v">${fmtDate(app.proposedStartDate)}</div>
            <div class="k">Term</div><div class="v">${app.proposedTermMonths} months</div>
            <div class="k">Submitted</div><div class="v">${fmtDate(app.submittedAt)}</div>
            <div class="k">Assigned Officer</div><div class="v">${escapeHtml(app.assignedOfficer)}</div>
            <div class="k">Vacancy</div><div class="v"><span class="mono">${app.vacancyId}</span> <a href="#" onclick="event.preventDefault(); goToPage('marketing.html')" style="margin-left:6px">View Vacancy</a></div>
            ${app.tenantId ? `<div class="k">Linked Tenant</div><div class="v"><span class="mono">${app.tenantId}</span> <a href="#" onclick="event.preventDefault(); goToPage('tenants.html?id=${app.tenantId}')">View Tenant</a></div>` : ''}
          </div>
        </div>
        <div class="drawer-section">
          <h4>Property → Investment Chain</h4>
          <div class="timeline">
            <div class="timeline-item done"><div class="t">APPLICATION ${app.id} • ${app.applicantName}</div><div class="d">${app.propertyName} — ${(app.unitCodes||[]).join(', ')} • ${fmtMoney(app.proposedRent)}</div></div>
            <div class="timeline-item ${app.tenantId ? 'done' : ''}"><div class="t">${app.tenantId ? `TENANT ${app.tenantId}` : 'TENANT (Pending)'} • ${app.applicantName}</div><div class="d">${app.tenantId ? 'Linked tenant' : 'Create tenant after approval'}</div></div>
            <div class="timeline-item"><div class="t">LEASE (Next) • ${app.propertyName}</div><div class="d">Will control ${(app.unitCodes||[]).join(', ')} • ZMW ${app.proposedRent} / month → Rental Income → NOI → Investment Asset INV-${app.propertyId}</div></div>
            <div class="timeline-item"><div class="t">PROPERTY ${app.propertyId} • ${app.propertyName}</div><div class="d">Operational property linked to investment asset • Occupancy & rent flow to portfolio</div></div>
          </div>
        </div>
      `;
    } else if(currentTab==='kyc'){
      body.innerHTML = `
        <div class="drawer-section"><h4>KYC Verification • ${kycPill(app.kycStatus)}</h4>
          <div class="kyc-grid">
            ${Object.entries(app.kycChecks||{}).map(([key, check])=>`
              <div class="kyc-card">
                <div class="kyc-head"><span class="kyc-name">${key.replace('_',' ')}</span><span class="pill ${check.status==='Verified'?'green':check.status==='Failed'?'red':'amber'}" style="font-size:10px">${check.status}</span></div>
                <div style="font-size:11px;color:var(--muted)">Verified by ${escapeHtml(check.verifiedBy||'—')} • ${fmtDate(check.date)}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:12px;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--surface-2)">
            <div style="font-size:12px;font-weight:700;margin-bottom:6px">Risk Assessment</div>
            <div style="display:flex;align-items:center;gap:8px"><span>Risk Rating:</span> ${riskPill(app.riskRating)} <span style="margin-left:auto;font-size:11px;color:var(--muted)">ID Verified • Income Verified</span></div>
          </div>
        </div>
        <div class="drawer-section"><h4>Actions</h4><div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="window.ApplicationsPage.updateStatus('${app.id}','KYC Pending')">Submit for KYC</button>
          <button class="btn btn-sm btn-primary" onclick="window.ApplicationsPage.updateStatus('${app.id}','KYC Passed',null,{kycStatus:'Passed'})">Mark KYC Passed</button>
          <button class="btn btn-sm btn-danger" onclick="window.ApplicationsPage.updateStatus('${app.id}','KYC Failed',null,{kycStatus:'Failed'})">Mark KYC Failed</button>
        </div></div>
      `;
    } else if(currentTab==='committee'){
      body.innerHTML = `
        <div class="drawer-section"><h4>Committee Review</h4>
          <div class="kvs">
            <div class="k">Committee Status</div><div class="v">${statusPill(app.committeeStatus||'Not Started')}</div>
            <div class="k">Decision</div><div class="v">${app.committeeDecision ? `<span class="pill ${app.committeeDecision==='Approved'?'green':'red'}">${app.committeeDecision}</span>` : '—'}</div>
            <div class="k">Decision Date</div><div class="v">${fmtDate(app.decisionDate)}</div>
            <div class="k">Decision Maker</div><div class="v">${escapeHtml(app.decisionMaker||'—')}</div>
            <div class="k">Comments</div><div class="v">${escapeHtml(app.comments||'—')}</div>
          </div>
        </div>
        <div class="drawer-section"><h4>Workflow</h4><div class="timeline">
          <div class="timeline-item ${['Submitted','Under Review','KYC Pending','KYC Passed','Committee Review','Approved','Rejected'].includes(app.status) ? 'done' : ''}"><div class="t">Application Submitted</div><div class="d">${fmtDate(app.submittedAt)} • ${escapeHtml(app.assignedOfficer)}</div></div>
          <div class="timeline-item ${['KYC Passed','Committee Review','Approved','Rejected'].includes(app.status) ? 'done' : ''}"><div class="t">KYC ${app.kycStatus}</div><div class="d">Identity, Income, Employment, Reference, Document verification</div></div>
          <div class="timeline-item ${['Committee Review','Approved','Rejected'].includes(app.status) ? 'done' : ''}"><div class="t">Committee Review</div><div class="d">${app.committeeStatus||'Pending'} • Risk: ${app.riskRating}</div></div>
          <div class="timeline-item ${['Approved'].includes(app.status) ? 'done' : ''}"><div class="t">Decision: ${app.committeeDecision||'Pending'}</div><div class="d">${app.decisionDate ? fmtDate(app.decisionDate) + ' by ' + escapeHtml(app.decisionMaker) : 'Awaiting committee'}</div></div>
        </div></div>
        <div class="drawer-section"><h4>Actions</h4><div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="window.ApplicationsPage.updateStatus('${app.id}','Committee Review',null,{committeeStatus:'Pending'})">Send to Committee</button>
          <button class="btn btn-sm btn-primary" onclick="window.ApplicationsPage.approve('${app.id}')">Approve</button>
          <button class="btn btn-sm btn-danger" onclick="window.ApplicationsPage.reject('${app.id}')">Reject</button>
        </div></div>
      `;
    } else if(currentTab==='documents'){
      body.innerHTML = `
        <div class="drawer-section"><h4>Documents • ${app.documents?.length||0}</h4>
          <div class="doc-list">${(app.documents||[]).map(d=>`
            <div class="doc-item"><div class="doc-ico">📄</div><div style="flex:1"><div style="font-weight:600">${escapeHtml(d.name)}</div><div style="font-size:11px;color:var(--muted)">${d.type} • ${d.id}</div></div><button class="btn btn-sm btn-ghost">View</button></div>
          `).join('') || '<div class="empty-state"><div class="ico">📁</div><h3>No documents</h3><p>Upload KYC documents, ID, proof of income, business registration, references.</p></div>'}
          </div>
        </div>
        <div class="drawer-section"><h4>Upload</h4><button class="btn btn-sm">+ Add Document</button></div>
      `;
    } else if(currentTab==='activity'){
      const audit = (getState().auditTrail||[]).filter(a=>a.entityId===app.id || a.entityType==='application' && a.description.includes(app.id)).slice(0,20);
      body.innerHTML = `<div class="drawer-section"><h4>Audit Trail</h4><div class="activity-timeline">${audit.length ? audit.map(a=>`
        <div class="activity-item"><div class="act-title">${escapeHtml(a.action)} • ${escapeHtml(a.description)}</div><div class="act-desc">${escapeHtml(a.user)} • ${a.entityType} ${a.entityId}</div><div class="act-time">${new Date(a.timestamp).toLocaleString()}</div></div>
      `).join('') : '<div class="empty-state"><div class="ico">🕒</div><h3>No activity yet</h3><p>Application lifecycle events will appear here.</p></div>'}</div></div>`;
    }
  }

  function renderDrawerActions(appId){
    const app = getApps().find(a=>a.id===appId);
    const container = document.getElementById('drawerActions');
    if(!app || !container) return;
    const canCreateTenant = app.status==='Approved' && !app.tenantId;
    container.innerHTML = `
      <button class="btn" onclick="window.ApplicationsPage.openModal('${appId}')">✏️ Edit</button>
      <button class="btn" onclick="window.ApplicationsPage.updateStatusPrompt('${appId}')">🔄 Status</button>
      ${app.status==='Submitted' ? `<button class="btn btn-primary" onclick="window.ApplicationsPage.updateStatus('${appId}','Under Review')">Start Review</button>` : ''}
      ${app.status==='Under Review' ? `<button class="btn btn-primary" onclick="window.ApplicationsPage.updateStatus('${appId}','KYC Pending',null,{kycStatus:'Pending'})">Submit KYC</button>` : ''}
      ${canCreateTenant ? `<button class="btn btn-primary" onclick="window.ApplicationsPage.createTenant('${appId}')">👤 Create Tenant</button>` : ''}
      ${app.tenantId ? `<button class="btn btn-primary" onclick="goToPage('tenants.html?id=${app.tenantId}')">View Tenant ${app.tenantId}</button><button class="btn" onclick="goToPage('leases.html?tenant=${app.tenantId}&property=${app.propertyId}')">+ Create Lease</button>` : ''}
      <button class="btn" onclick="goToPage('property-register.html?id=${app.propertyId}')">🏢 Property</button>
      <button class="btn" onclick="goToPage('units.html?property=${app.propertyId}')">🏠 Unit</button>
      <button class="btn btn-ghost" onclick="window.ApplicationsPage.closeDrawer()">Close</button>
    `;
  }

  function closeDrawer(){
    document.getElementById('detailDrawer')?.classList.remove('open');
    document.getElementById('drawerBackdrop')?.classList.remove('open');
    document.body.style.overflow='';
    selectedAppId=null;
  }

  function openAppModal(appId=null){
    editingAppId = appId;
    const app = appId ? getApps().find(a=>a.id===appId) : null;
    const isEdit = !!app;
    document.getElementById('appModalTitle').textContent = isEdit ? `Edit Application ${app.id}` : 'New Application';
    const props = getProps();
    const units = getUnits();
    const modalBody = document.getElementById('appModalBody');
    modalBody.innerHTML = `
      <div class="app-form-section"><h4><span class="form-num">1</span> Applicant Information</h4>
        <div class="app-form-grid">
          <div><label class="form-label req">Applicant Name</label><input class="form-input" id="f_applicantName" value="${escapeHtml(app?.applicantName||'')}"/></div>
          <div><label class="form-label req">Applicant Type</label><select class="form-select" id="f_applicantType">${APPLICANT_TYPES.map(t=>`<option ${app?.applicantType===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div><label class="form-label req">Phone</label><input class="form-input" id="f_phone" value="${escapeHtml(app?.phone||'')}"/></div>
          <div><label class="form-label req">Email</label><input class="form-input" id="f_email" value="${escapeHtml(app?.email||'')}"/></div>
          <div class="f-group full"><label class="form-label">Address</label><input class="form-input" id="f_address" value="${escapeHtml(app?.address||'')}"/></div>
          <div><label class="form-label">ID Type</label><select class="form-select" id="f_idType">${ID_TYPES.map(t=>`<option ${app?.idType===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div><label class="form-label">ID Number</label><input class="form-input" id="f_idNumber" value="${escapeHtml(app?.idNumber||'')}"/></div>
          <div><label class="form-label">Company / Organization</label><input class="form-input" id="f_companyName" value="${escapeHtml(app?.companyName||'')}"/></div>
          <div><label class="form-label">Company Registration</label><input class="form-input" id="f_companyReg" value="${escapeHtml(app?.companyRegistration||'')}"/></div>
        </div>
      </div>
      <div class="app-form-section"><h4><span class="form-num">2</span> Application Details</h4>
        <div class="app-form-grid">
          <div><label class="form-label req">Property</label><select class="form-select" id="f_propertyId">${props.map(p=>`<option value="${p.id}" ${app?.propertyId===p.id?'selected':''}>${escapeHtml(p.name)} (${p.id})</option>`).join('')}</select></div>
          <div><label class="form-label req">Lease Type</label><select class="form-select" id="f_leaseType">${LEASE_TYPES.map(t=>`<option ${app?.leaseType===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="f-group full"><label class="form-label">Unit(s) - Multi-select</label><div class="unit-picker" id="unitPicker"></div><div style="font-size:11px;color:var(--muted);margin-top:6px">Select one or more vacant units. For multi-unit leases use multiple units.</div></div>
          <div><label class="form-label req">Proposed Rent (ZMW)</label><input type="number" class="form-input" id="f_proposedRent" value="${app?.proposedRent||''}"/></div>
          <div><label class="form-label">Deposit (ZMW)</label><input type="number" class="form-input" id="f_deposit" value="${app?.deposit||''}"/></div>
          <div><label class="form-label">Service Charge</label><input type="number" class="form-input" id="f_serviceCharge" value="${app?.serviceCharge||''}"/></div>
          <div><label class="form-label">Proposed Start Date</label><input type="date" class="form-input" id="f_startDate" value="${app?.proposedStartDate||''}"/></div>
          <div><label class="form-label">Term (months)</label><select class="form-select" id="f_term"><option value="12" ${app?.proposedTermMonths==12?'selected':''}>12 months</option><option value="24" ${app?.proposedTermMonths==24?'selected':''}>24 months</option><option value="36" ${app?.proposedTermMonths==36?'selected':''}>36 months</option><option value="60" ${app?.proposedTermMonths==60?'selected':''}>60 months</option></select></div>
          <div><label class="form-label">Risk Rating</label><select class="form-select" id="f_risk">${RISK_RATINGS.map(r=>`<option ${app?.riskRating===r?'selected':''}>${r}</option>`).join('')}</select></div>
          <div><label class="form-label">Assigned Officer</label><select class="form-select" id="f_officer">${OFFICERS.map(o=>`<option ${app?.assignedOfficer===o?'selected':''}>${o}</option>`).join('')}</select></div>
          <div><label class="form-label">Status</label><select class="form-select" id="f_status">${STATUS_FLOW.map(s=>`<option ${app?.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="f-group full"><label class="form-label">Comments</label><textarea class="form-textarea" id="f_comments">${escapeHtml(app?.comments||'')}</textarea></div>
        </div>
      </div>
    `;
    // Render unit picker
    const propId = app?.propertyId || props[0]?.id;
    renderUnitPicker(propId, app?.unitIds||[]);
    document.getElementById('f_propertyId').addEventListener('change', (e)=> renderUnitPicker(e.target.value, []));
    document.getElementById('appModalBackdrop').classList.add('open');
  }

  function renderUnitPicker(propertyId, selectedIds){
    const container = document.getElementById('unitPicker');
    if(!container) return;
    const units = getUnits().filter(u=>u.propertyId===propertyId).slice(0,40);
    container.innerHTML = units.map(u=>{
      const isSelected = selectedIds.includes(u.id);
      const isVacant = u.status==='Vacant';
      return `<div class="unit-chip ${isSelected?'selected':''} ${isVacant?'vacant':''}" data-unit="${u.id}" onclick="this.classList.toggle('selected')"><span>${escapeHtml(u.code)}</span><span style="font-size:10px;color:var(--muted)">${u.type} • ${u.area}m² • ${isVacant?'Vacant':'Occupied'}</span></div>`;
    }).join('') || '<div class="small muted">No units found for property</div>';
  }

  function closeAppModal(){
    document.getElementById('appModalBackdrop').classList.remove('open');
    editingAppId=null;
  }

  function saveAppModal(){
    const getVal = id=> document.getElementById(id)?.value?.trim()||'';
    const applicantName = getVal('f_applicantName');
    if(!applicantName){ toast('Applicant name required','error'); return; }
    const propertyId = getVal('f_propertyId');
    const prop = getProps().find(p=>p.id===propertyId);
    const selectedUnitEls = document.querySelectorAll('#unitPicker .unit-chip.selected');
    const unitIds = [...selectedUnitEls].map(el=>el.dataset.unit);
    const units = getUnits();
    const unitCodes = unitIds.map(id=> units.find(u=>u.id===id)?.code || id);

    const proposedRent = parseFloat(getVal('f_proposedRent'))||0;
    if(!proposedRent){ toast('Proposed rent required','error'); return; }

    if(editingAppId){
      const idx = getApps().findIndex(a=>a.id===editingAppId);
      if(idx>=0){
        const before = {...getApps()[idx]};
        const a = getApps()[idx];
        a.applicantName = applicantName;
        a.applicantType = getVal('f_applicantType');
        a.phone = getVal('f_phone');
        a.email = getVal('f_email');
        a.address = getVal('f_address');
        a.idType = getVal('f_idType');
        a.idNumber = getVal('f_idNumber');
        a.companyName = getVal('f_companyName');
        a.companyRegistration = getVal('f_companyReg');
        a.propertyId = propertyId;
        a.propertyName = prop?.name || a.propertyName;
        a.unitIds = unitIds.length ? unitIds : a.unitIds;
        a.unitCodes = unitCodes.length ? unitCodes : a.unitCodes;
        a.leaseType = getVal('f_leaseType');
        a.proposedRent = proposedRent;
        a.deposit = parseFloat(getVal('f_deposit'))||proposedRent*2;
        a.serviceCharge = parseFloat(getVal('f_serviceCharge'))||Math.floor(proposedRent*0.15);
        a.proposedStartDate = getVal('f_startDate') || a.proposedStartDate;
        a.proposedTermMonths = parseInt(getVal('f_term'))||a.proposedTermMonths;
        a.riskRating = getVal('f_risk');
        a.assignedOfficer = getVal('f_officer');
        a.status = getVal('f_status');
        a.comments = getVal('f_comments');
        a.updatedAt = new Date().toISOString();
        saveState();
        addAuditEvent('UPDATE','application',a.id,'Application updated', before, a);
        toast(`Application ${a.id} updated`,'success');
      }
    } else {
      const newId = `APP-${1001 + getApps().length}`;
      const newApp = {
        id: newId,
        applicantName: applicantName,
        applicantType: getVal('f_applicantType'),
        phone: getVal('f_phone'),
        email: getVal('f_email'),
        address: getVal('f_address'),
        idType: getVal('f_idType'),
        idNumber: getVal('f_idNumber'),
        companyName: getVal('f_companyName'),
        companyRegistration: getVal('f_companyReg'),
        propertyId: propertyId,
        propertyName: prop?.name || 'Unknown',
        unitIds: unitIds,
        unitCodes: unitCodes,
        proposedRent: proposedRent,
        deposit: parseFloat(getVal('f_deposit'))||proposedRent*2,
        serviceCharge: parseFloat(getVal('f_serviceCharge'))||Math.floor(proposedRent*0.15),
        leaseType: getVal('f_leaseType'),
        proposedStartDate: getVal('f_startDate') || new Date().toISOString().slice(0,10),
        proposedTermMonths: parseInt(getVal('f_term'))||12,
        submittedAt: new Date().toISOString().slice(0,10),
        applicationDate: new Date().toISOString().slice(0,10),
        assignedOfficer: getVal('f_officer'),
        status: getVal('f_status') || 'Draft',
        kycStatus: 'Not Started',
        kycChecks: {
          identity:{status:'Pending', verifiedBy:getVal('f_officer'), date:new Date().toISOString().slice(0,10)},
          income:{status:'Pending', verifiedBy:getVal('f_officer'), date:new Date().toISOString().slice(0,10)},
          employment:{status:'Pending', verifiedBy:getVal('f_officer'), date:new Date().toISOString().slice(0,10)},
          reference:{status:'Pending', verifiedBy:getVal('f_officer'), date:new Date().toISOString().slice(0,10)},
          document:{status:'Pending', verifiedBy:getVal('f_officer'), date:new Date().toISOString().slice(0,10)}
        },
        riskRating: getVal('f_risk'),
        committeeStatus: 'Not Started',
        committeeDecision: '',
        decisionDate: '',
        decisionMaker: '',
        comments: getVal('f_comments'),
        tenantId: null,
        vacancyId: `V-${String(Math.floor(Math.random()*50)+1).padStart(3,'0')}`,
        documents: [{id:`DOC-${newId}-1`, name:'NRC Copy', type:'ID', url:'#'}]
      };
      getState().applications.unshift(newApp);
      saveState();
      addAuditEvent('CREATE','application',newId,`Application ${newId} created for ${applicantName}`);
      toast(`Application ${newId} created`,'success');
    }
    closeAppModal();
    applyFilters();
  }

  function openStatusModal(appId){
    const app = getApps().find(a=>a.id===appId);
    if(!app) return;
    const newStatus = prompt(`Update status for ${appId}. Current: ${app.status}\nEnter new status:\n${STATUS_FLOW.join(', ')}`, app.status);
    if(newStatus && STATUS_FLOW.includes(newStatus)){
      updateAppStatus(appId, newStatus, `Status manually changed to ${newStatus}`);
    } else if(newStatus){
      toast('Invalid status','error');
    }
  }

  function exportApps(){
    const rows = filteredApps.length ? filteredApps : getApps();
    const csv = [
      ['Application ID','Applicant','Type','Property','Unit','Proposed Rent','Submitted','KYC','Risk','Status','Officer','Tenant ID'].join(','),
      ...rows.map(a=>[
        a.id, `"${a.applicantName}"`, a.applicantType, `"${a.propertyName}"`, `"${(a.unitCodes||[]).join(';')}"`, a.proposedRent, a.submittedAt, a.kycStatus, a.riskRating, a.status, `"${a.assignedOfficer}"`, a.tenantId||''
      ].join(','))
    ].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='Applications.csv'; a.click(); URL.revokeObjectURL(url);
    toast('Applications exported','success');
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

  // Expose for inline handlers
  window.ApplicationsPage = {
    openModal: openAppModal,
    closeDrawer,
    updateStatus: updateAppStatus,
    updateStatusPrompt: openStatusModal,
    approve: approveApplication,
    reject: rejectApplication,
    createTenant: createTenantFromApp,
    delete: confirmDeleteApp
  };
})();

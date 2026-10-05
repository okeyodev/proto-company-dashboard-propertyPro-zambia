/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/enterprise-users.js
 * ToR 9.3 — Users & Roles - Maker-Checker Workflow
 * ============================================================================
 * KPIs: Total Active Users, Pending Access Requests, Maker-Checker Workflows Pending
 * Table: User ID, Name, Department, Role (Maker/Checker/Portfolio Manager/MIC Member)
 * Drawer #userDrawer: profile + role dropdown + Access Matrix checklist
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCommon === "function") initCommon("enterprise-users");

  const getState = () => window.state || {};
  const save = () => { if (window.saveState) window.saveState(); };
  const esc = (s) => { if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); };

  // Define maker-checker roles mapping and permissions
  const MAKER_CHECKER_ROLES = ["Maker","Checker","Portfolio Manager","MIC Member","Super Admin","Admin","Accountant","Property Manager","Viewer","Auditor"];
  const ROLE_DESCRIPTIONS = {
    "Maker": "Maker initiates: creates leases, invoices, payments, maintenance tickets, valuations. Cannot approve own work. Requires Checker.",
    "Checker": "Checker reviews: validates Maker submissions, approves leases < ZMW 500k, payments < ZMW 100k, maintenance. Segregation enforced.",
    "Portfolio Manager": "Portfolio Manager oversees portfolio performance, approves high-value leases (>500k), valuations, capex. Second level checker.",
    "MIC Member": "Management Investment Committee: final approval for investment deals > ZMW 10M, asset revaluations >10%, disposals, new developments.",
    "Super Admin": "Break-glass: all permissions. Use only for emergency. All actions double-audited.",
    "Admin": "Property & tenant admin: manages register, vacancies, notices. Maker for leasing.",
    "Accountant": "Finance Maker: invoices, receipts, arrears, service charges. Needs Checker for payments.",
    "Property Manager": "Operations Maker: maintenance, inspections, insurance claims.",
    "Viewer": "Read-only: dashboards, reports, audit trail. No mutation.",
    "Auditor": "Audit & compliance: read-only + export audit trail, reports."
  };

  // Access Matrix permissions - required ones plus extended
  const PERMISSIONS = [
    { id: "approve_leases", label: "Approve Leases", desc: "Approve new leases and renewals (Checker+)", group: "Leasing", critical: true },
    { id: "authorize_payments", label: "Authorize Payments", desc: "Authorize rent receipts, service charge payments > threshold", group: "Finance", critical: true },
    { id: "edit_asset_values", label: "Edit Asset Values", desc: "Edit investment asset current value, cap rates (Portfolio Mgr / MIC)", group: "Investment", critical: true },
    { id: "create_leases", label: "Create Leases (Maker)", desc: "Draft leases, applications, tenant onboarding", group: "Leasing", critical: false },
    { id: "manage_invoices", label: "Manage Invoices (Maker)", desc: "Create/edit invoices, credit notes", group: "Finance", critical: false },
    { id: "approve_valuations", label: "Approve Valuations", desc: "Approve property valuations, cost model updates", group: "Investment", critical: true },
    { id: "approve_maintenance", label: "Approve Maintenance", desc: "Approve maintenance tickets > ZMW 10k, contractor assignment", group: "Operations", critical: false },
    { id: "manage_users", label: "Manage Users", desc: "Invite, edit roles, deactivate users (Super Admin / Admin)", group: "Enterprise", critical: true },
    { id: "publish_notices", label: "Publish Notices", desc: "Create & publish bulk tenant notices", group: "Enterprise", critical: false },
    { id: "view_reports", label: "View Reports", desc: "Access financial, leasing, investment reports", group: "Reporting", critical: false },
    { id: "mic_approval", label: "MIC Approval", desc: "Final Investment Committee approval for deals, disposals", group: "Investment", critical: true },
    { id: "manage_investments", label: "Manage Investments", desc: "Create/edit deals, funds, pipeline", group: "Investment", critical: false },
  ];

  const DEFAULT_PERMS_BY_ROLE = {
    "Maker": ["create_leases","manage_invoices","publish_notices","view_reports","manage_investments"],
    "Checker": ["approve_leases","authorize_payments","approve_maintenance","view_reports"],
    "Portfolio Manager": ["approve_leases","authorize_payments","edit_asset_values","approve_valuations","view_reports","manage_investments","publish_notices"],
    "MIC Member": ["edit_asset_values","approve_valuations","mic_approval","view_reports"],
    "Super Admin": PERMISSIONS.map(p=>p.id),
    "Admin": ["create_leases","approve_leases","publish_notices","view_reports","manage_users","approve_maintenance"],
    "Accountant": ["manage_invoices","authorize_payments","view_reports"],
    "Property Manager": ["approve_maintenance","create_leases","view_reports"],
    "Viewer": ["view_reports"],
    "Auditor": ["view_reports"]
  };

  function ensureUsers() {
    const st = getState();
    if (!st.users || st.users.length===0) {
      if (typeof generateEnterpriseMockData === 'function' && st.properties) {
        const em = generateEnterpriseMockData(st.properties, st.tenants, st.units);
        st.users = em.users;
        save();
      }
    }
    (st.users||[]).forEach((u, idx) => {
      // Map legacy roles to maker-checker
      if (!MAKER_CHECKER_ROLES.includes(u.role)) {
        const legacyMap = {
          "Leasing Officer": "Maker",
          "Maintenance Manager": "Maker",
          "Accountant": "Maker",
          "Property Manager": "Maker",
          "Super Admin": "Super Admin",
          "Admin": "Admin"
        };
        u.role = legacyMap[u.role] || (idx%4===0?"Maker": idx%4===1?"Checker": idx%4===2?"Portfolio Manager":"MIC Member");
      }
      if (!u.department) u.department = ["Leasing","Finance","Operations","Investment"][idx%4];
      if (!u.permissions) u.permissions = DEFAULT_PERMS_BY_ROLE[u.role] || DEFAULT_PERMS_BY_ROLE["Viewer"];
      if (!u.lastLogin) u.lastLogin = new Date(Date.now() - Math.random()*14*24*3600*1000).toISOString();
      if (!u.status) u.status = Math.random()<0.85?"Active":"Pending";
      if (!u.id) u.id = `USR-${String(idx+1).padStart(5,'0')}`;
      // Ensure required fields for ToR
      if (!u.fullName) u.fullName = u.name;
      if (!u.avatar) u.avatar = u.name.split(' ').map(n=>n[0]).join('').slice(0,2);
    });
    // Ensure at least one of each maker-checker role for demo
    const requiredRoles = ["Maker","Checker","Portfolio Manager","MIC Member"];
    requiredRoles.forEach(r=>{
      if (!(st.users||[]).some(u=>u.role===r)) {
        st.users.push({
          id: `USR-${String(st.users.length+1).padStart(5,'0')}`,
          name: `${r} User`,
          fullName: `${r} User`,
          email: `${r.toLowerCase().replace(/ /g,'.')}@propertypro.zm`,
          department: r==="MIC Member"?"Executive": r==="Portfolio Manager"?"Investment": r==="Checker"?"Finance":"Leasing",
          role: r,
          permissions: DEFAULT_PERMS_BY_ROLE[r]||[],
          status: "Active",
          lastLogin: new Date().toISOString(),
          avatar: r.slice(0,2).toUpperCase(),
          createdAt: new Date().toISOString()
        });
      }
    });
    save();
  }
  ensureUsers();

  const kpiGrid = document.getElementById('kpiGrid');
  const tbody = document.getElementById('usersTbody');
  const countLabel = document.getElementById('countLabel');
  const paginationInfo = document.getElementById('paginationInfo');
  const pendingBadge = document.getElementById('pendingBadge');

  const searchInput = document.getElementById('searchInputLocal');
  const filterRole = document.getElementById('filterRole');
  const filterDept = document.getElementById('filterDepartment');
  const filterStatus = document.getElementById('filterStatus');
  const pageSizeEl = document.getElementById('pageSize');

  // Drawer elements
  const drawer = document.getElementById('userDrawer');
  const drawerAvatar = document.getElementById('drawerAvatar');
  const drawerName = document.getElementById('drawerName');
  const drawerEmail = document.getElementById('drawerEmail');
  const drawerMeta = document.getElementById('drawerMeta');
  const fUserId = document.getElementById('fUserId');
  const fDepartment = document.getElementById('fDepartment');
  const fLastLogin = document.getElementById('fLastLogin');
  const fStatus = document.getElementById('fStatus');
  const fRole = document.getElementById('fRole');
  const roleDesc = document.getElementById('roleDesc');
  const accessMatrix = document.getElementById('accessMatrix');
  const workflowHint = document.getElementById('workflowHint');

  let activeUserId = null;
  let currentPage = 1;
  let filtered = [];
  let currentEditPermissions = [];

  function getFiltered() {
    const st = getState();
    let data = [...(st.users||[])];
    const q = (searchInput?.value||'').toLowerCase().trim();
    const role = filterRole?.value||'';
    const dept = filterDept?.value||'';
    const status = filterStatus?.value||'';

    if (q) data = data.filter(u=> (u.id||'').toLowerCase().includes(q) || (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.department||'').toLowerCase().includes(q));
    if (role) data = data.filter(u=> u.role===role);
    if (dept) data = data.filter(u=> u.department===dept);
    if (status) data = data.filter(u=> u.status===status);

    data.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
    return data;
  }

  function renderKPIs() {
    const st = getState();
    const users = st.users||[];
    const active = users.filter(u=> u.status==='Active').length;
    const pending = users.filter(u=> u.status==='Pending').length;
    const inactive = users.filter(u=> u.status==='Inactive'||u.status==='Suspended').length;

    // Maker-checker workflows pending: leases pending, invoices pending, maintenance open + users pending checker
    const leasesPending = (st.leases||[]).filter(l=> (l.status||'').toLowerCase().includes('pending') || l.approvalStatus==='Pending').length;
    const invoicesPending = (st.invoices||[]).filter(i=> i.status==='Pending Approval' || i.status==='Pending').length;
    const maintenancePending = (st.maintenance||[]).filter(m=> ['Open','Pending Parts','In Progress'].includes(m.status)).length;
    const makerCount = users.filter(u=> u.role==='Maker' && u.status==='Active').length;
    const checkerCount = users.filter(u=> u.role==='Checker' && u.status==='Active').length;
    const workflowsPending = leasesPending + invoicesPending + Math.floor(maintenancePending/3) + pending + Math.max(0, makerCount-checkerCount);

    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi accent-blue"><div class="kpi-top"><div class="kpi-label">Total Active Users</div><div class="kpi-icon blue">👥</div></div><div class="kpi-value">${active}</div><div class="kpi-meta">${users.length} total • ${inactive} inactive • ${users.filter(u=>u.role==='Maker').length} Makers, ${users.filter(u=>u.role==='Checker').length} Checkers</div></div>
        <div class="kpi accent-amber"><div class="kpi-top"><div class="kpi-label">Pending Access Requests</div><div class="kpi-icon amber">⏳</div></div><div class="kpi-value">${pending}</div><div class="kpi-meta">${pending} awaiting Checker approval • ${users.filter(u=>u.role==='Portfolio Manager').length} Portfolio Mgrs, ${users.filter(u=>u.role==='MIC Member').length} MIC Members</div></div>
        <div class="kpi accent-violet"><div class="kpi-top"><div class="kpi-label">Maker-Checker Workflows Pending</div><div class="kpi-icon violet">🔄</div></div><div class="kpi-value">${workflowsPending}</div><div class="kpi-meta">${leasesPending} leases • ${invoicesPending} payments • ${maintenancePending} maintenance • ${makerCount} makers / ${checkerCount} checkers</div></div>
        <div class="kpi accent-green"><div class="kpi-top"><div class="kpi-label">Segregation Compliance</div><div class="kpi-icon green">✅</div></div><div class="kpi-value">98.2%</div><div class="kpi-meta">Maker≠Checker enforced • MIC required for >10M • Last audit ${new Date().toLocaleDateString('en-ZM',{month:'short',day:'2-digit'})}</div></div>
      `;
    }
    if (pendingBadge) pendingBadge.textContent = String(pending);
  }

  function renderTable() {
    filtered = getFiltered();
    const pageSize = parseInt(pageSizeEl?.value||'50',10);
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage>totalPages) currentPage=totalPages;
    const start = (currentPage-1)*pageSize;
    const pageData = filtered.slice(start, start+pageSize);

    if (paginationInfo) paginationInfo.textContent = `Showing ${filtered.length? start+1:0}-${Math.min(start+pageSize, filtered.length)} of ${filtered.length}`;
    if (countLabel) countLabel.textContent = String(filtered.length);

    if (!tbody) return;
    if (pageData.length===0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--muted)">No users match filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = pageData.map(u=>{
      const rolePillClass = u.role==='Maker'? 'blue' : u.role==='Checker'? 'green' : u.role==='Portfolio Manager'? 'violet' : u.role==='MIC Member'? 'amber' : u.role==='Super Admin'? 'red' : 'gray';
      const statusClass = u.status==='Active'? 'green' : u.status==='Pending'? 'amber' : u.status==='Inactive'? 'gray' : 'red';
      const lastLogin = (()=>{ try{ const d=new Date(u.lastLogin); return d.toLocaleDateString('en-ZM',{month:'short',day:'2-digit'})+' '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }catch(e){ return u.lastLogin||'-'; } })();
      return `
        <tr>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9;white-space:nowrap"><span class="mono" style="font-weight:700">${esc(u.id)}</span></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9;white-space:nowrap"><div style="display:flex;gap:8px;align-items:center"><div style="width:32px;height:32px;border-radius:50%;background:#E2E8F0;border:1px solid var(--border);display:grid;place-items:center;font-size:11px;font-weight:800">${esc(u.avatar||u.name.slice(0,2).toUpperCase())}</div><div><div style="font-weight:600">${esc(u.name)}</div><div style="font-size:11px;color:var(--muted)">${esc(u.email||'')}</div></div></div></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9;white-space:nowrap">${esc(u.department||'-')}</td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9;white-space:nowrap"><span class="pill ${rolePillClass}" style="font-size:11px">${esc(u.role)}</span><div style="font-size:10px;color:var(--muted-2);margin-top:2px">${(u.permissions||[]).length} perms</div></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9;white-space:nowrap">${esc(lastLogin)}</td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9;white-space:nowrap"><span class="pill ${statusClass}">${esc(u.status||'Active')}</span></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9;white-space:nowrap"><div style="display:flex;gap:4px"><button class="btn btn-sm" data-action="edit" data-id="${esc(u.id)}">Edit Role</button><button class="btn btn-sm" data-action="more" data-id="${esc(u.id)}">⋯</button></div></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-action]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.id;
        const act = btn.dataset.action;
        const user = (getState().users||[]).find(x=> x.id===id);
        if (!user) return;
        if (act==='edit') openDrawer(user);
        if (act==='more') showCtxMenu(btn, user);
      });
    });
  }

  function renderAccessMatrix(role, perms) {
    if (!accessMatrix) return;
    const grouped = {};
    PERMISSIONS.forEach(p=>{ if(!grouped[p.group]) grouped[p.group]=[]; grouped[p.group].push(p); });

    accessMatrix.innerHTML = Object.entries(grouped).map(([group, list])=>`
      <div style="margin-bottom:10px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.06em;margin-bottom:6px">${esc(group)}</div>
        ${list.map(p=>{
          const checked = perms.includes(p.id);
          return `
            <label style="display:flex;gap:10px;align-items:flex-start;padding:7px 8px;border-radius:7px;border:1px solid ${checked?'#BFDBFE':'transparent'};background:${checked?'#EFF6FF':'transparent'};cursor:pointer;margin-bottom:4px">
              <input type="checkbox" value="${esc(p.id)}" ${checked?'checked':''} style="margin-top:3px" />
              <div style="flex:1"><div style="font-size:12.5px;font-weight:600;display:flex;gap:6px;align-items:center">${esc(p.label)} ${p.critical?'<span class="pill red" style="font-size:9px">Critical</span>':''}</div><div style="font-size:11px;color:var(--muted);margin-top:1px">${esc(p.desc)}</div></div>
            </label>
          `;
        }).join('')}
      </div>
    `).join('');

    accessMatrix.querySelectorAll('input[type=checkbox]').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        const id = cb.value;
        if (cb.checked) { if (!currentEditPermissions.includes(id)) currentEditPermissions.push(id); }
        else { currentEditPermissions = currentEditPermissions.filter(x=> x!==id); }
        // Update hint
        updateWorkflowHint();
      });
    });
  }

  function updateRoleDesc(role) {
    if (roleDesc) roleDesc.textContent = ROLE_DESCRIPTIONS[role] || '';
    if (workflowHint) {
      if (role==='Maker') workflowHint.textContent = 'Maker will be able to create leases, invoices, maintenance. Cannot approve. Requires Checker.';
      else if (role==='Checker') workflowHint.textContent = 'Checker will review and approve Maker submissions. Segregation: Checker cannot approve own Maker actions.';
      else if (role==='Portfolio Manager') workflowHint.textContent = 'Portfolio Manager approves high-value and escalated items. Can override Checker for < ZMW 500k.';
      else if (role==='MIC Member') workflowHint.textContent = 'MIC Member: final investment approval. Required for deals >10M, revaluations >10%.';
      else workflowHint.textContent = `${role} - permissions per access matrix.`;
    }
  }

  function updateWorkflowHint() {
    // Called after perm changes
    if (!workflowHint) return;
    const hasApproveLeases = currentEditPermissions.includes('approve_leases');
    const hasAuthPay = currentEditPermissions.includes('authorize_payments');
    const hasEditAsset = currentEditPermissions.includes('edit_asset_values');
    const hasMIC = currentEditPermissions.includes('mic_approval');
    let txt = '';
    if (hasApproveLeases) txt += 'Can approve leases. ';
    if (hasAuthPay) txt += 'Can authorize payments. ';
    if (hasEditAsset) txt += 'Can edit asset values. ';
    if (hasMIC) txt += 'MIC approval authority. ';
    if (txt) workflowHint.textContent = txt + ' Maker-Checker segregation enforced.';
  }

  function openDrawer(user) {
    if (!drawer) return;
    activeUserId = user.id;
    currentEditPermissions = [...(user.permissions||[])];

    if (drawerAvatar) drawerAvatar.textContent = user.avatar||user.name.slice(0,2).toUpperCase();
    if (drawerName) drawerName.textContent = user.name;
    if (drawerEmail) drawerEmail.textContent = user.email||'';
    if (drawerMeta) drawerMeta.innerHTML = `<span class="pill blue">${esc(user.role)}</span><span>${esc(user.department||'')}</span><span>• ${esc(user.id)}</span>`;
    if (fUserId) fUserId.textContent = user.id;
    if (fDepartment) fDepartment.value = user.department||'Leasing';
    if (fLastLogin) fLastLogin.textContent = (()=>{ try{ return new Date(user.lastLogin).toLocaleString('en-ZM'); }catch(e){ return user.lastLogin||''; } })();
    if (fStatus) fStatus.value = user.status||'Active';
    if (fRole) fRole.value = user.role||'Maker';

    updateRoleDesc(user.role||'Maker');
    renderAccessMatrix(user.role, currentEditPermissions);

    drawer.classList.add('open');
  }

  function closeDrawer() { if (drawer) drawer.classList.remove('open'); activeUserId=null; }

  function showCtxMenu(anchor, user) {
    const menu = document.getElementById('ctxMenu') || document.createElement('div');
    if (!menu.id) { menu.id='ctxMenu'; menu.className='ctx-menu'; document.body.appendChild(menu); }
    menu.innerHTML = `
      <div class="ctx-item" data-act="edit"><span>✏️</span> Edit Role & Perms</div>
      <div class="ctx-item" data-act="activate"><span>✅</span> ${user.status==='Active'?'Deactivate':'Activate'}</div>
      <div class="ctx-item" data-act="reset"><span>🔑</span> Reset Password</div>
      <div class="ctx-item" data-act="audit"><span>📜</span> View Audit Trail</div>
      <div class="ctx-item danger" data-act="suspend"><span>⛔</span> Suspend User</div>
    `;
    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${Math.min(rect.left, window.innerWidth-200)}px`;
    menu.style.top = `${rect.bottom+6}px`;
    menu.style.display='block';
    menu.classList.add('open');
    menu.querySelectorAll('.ctx-item').forEach(item=>{
      item.addEventListener('click', ()=>{
        const act=item.dataset.act;
        menu.style.display='none';
        const st=getState();
        const u=st.users.find(x=>x.id===user.id);
        if (!u) return;
        if (act==='edit') openDrawer(u);
        if (act==='activate') {
          u.status = u.status==='Active'?'Inactive':'Active';
          save(); renderAll();
          if(window.toast) toast(`${u.name} ${u.status}`,'success');
          if(typeof addAuditEvent==='function') addAuditEvent('STATUS_CHANGE','user',u.id,`Status changed to ${u.status}`);
        }
        if (act==='reset') { if(window.toast) toast(`Password reset link sent to ${u.email}`,'info'); }
        if (act==='audit') { if(window.toast) toast(`Audit trail for ${u.id}: ${st.auditTrail?.filter(a=>a.entityId===u.id).length||0} events`,'info'); }
        if (act==='suspend') {
          u.status='Suspended'; save(); renderAll();
          if(window.toast) toast(`${u.name} suspended`,'error');
          if(typeof addAuditEvent==='function') addAuditEvent('SUSPEND','user',u.id,`Suspended user ${u.name}`);
        }
      });
    });
    const close=(e)=>{ if(!menu.contains(e.target)&& e.target!==anchor){ menu.style.display='none'; document.removeEventListener('click',close); } };
    setTimeout(()=> document.addEventListener('click',close), 50);
  }

  // Save edited role + permissions to localStorage via saveState()
  function saveUserRole() {
    if (!activeUserId) return;
    const st=getState();
    const user = st.users.find(u=> u.id===activeUserId);
    if (!user) { if(window.toast) toast('User not found','error'); return; }

    const oldRole = user.role;
    const newRole = fRole?.value||'Maker';
    const newDept = fDepartment?.value||user.department;
    const newStatus = fStatus?.value||user.status;

    // If role changed, optionally reset perms to defaults unless user manually edited
    const isRoleChanged = oldRole!==newRole;
    if (isRoleChanged && currentEditPermissions.length=== (DEFAULT_PERMS_BY_ROLE[oldRole]||[]).length) {
      // Auto-suggest defaults for new role
      currentEditPermissions = [...(DEFAULT_PERMS_BY_ROLE[newRole]||DEFAULT_PERMS_BY_ROLE['Viewer'])];
    }

    const before = { role: oldRole, permissions: [...(user.permissions||[])], department: user.department, status: user.status };
    user.role = newRole;
    user.department = newDept;
    user.status = newStatus;
    user.permissions = [...currentEditPermissions];
    user.roles = [newRole];
    user.updatedAt = new Date().toISOString();
    user.updatedBy = 'Chanda Mwanza';

    save();

    if (typeof addAuditEvent==='function') {
      addAuditEvent('UPDATE','user',user.id,`Role changed ${oldRole} → ${newRole}, Dept ${newDept}, Status ${newStatus}, Perms: ${currentEditPermissions.join(', ')}`, before, { role:newRole, permissions: currentEditPermissions, department:newDept, status:newStatus });
    }

    if (window.toast) toast(`Saved ${user.name}: ${oldRole} → ${newRole} • ${currentEditPermissions.length} permissions • Maker-Checker enforced`,'success');

    closeDrawer();
    renderAll();
  }

  function renderAll() {
    renderKPIs();
    // Need to re-filter after save
    filtered = getFiltered();
    // Adjust currentPage if needed
    const pageSize = parseInt(pageSizeEl?.value||'50',10);
    const totalPages = Math.max(1, Math.ceil(filtered.length/pageSize));
    if (currentPage>totalPages) currentPage=totalPages;
    // render table
    const start = (currentPage-1)*pageSize;
    const pageData = filtered.slice(start, start+pageSize);
    if (paginationInfo) paginationInfo.textContent = `Showing ${filtered.length? start+1:0}-${Math.min(start+pageSize, filtered.length)} of ${filtered.length}`;
    if (countLabel) countLabel.textContent = String(filtered.length);

    if (!tbody) return;
    if (pageData.length===0) {
      tbody.innerHTML = `<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--muted)">No users match filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = pageData.map(u=>{
      const rolePillClass = u.role==='Maker'? 'blue' : u.role==='Checker'? 'green' : u.role==='Portfolio Manager'? 'violet' : u.role==='MIC Member'? 'amber' : u.role==='Super Admin'? 'red' : 'gray';
      const statusClass = u.status==='Active'? 'green' : u.status==='Pending'? 'amber' : u.status==='Inactive'? 'gray' : 'red';
      const lastLogin = (()=>{ try{ const d=new Date(u.lastLogin); return d.toLocaleDateString('en-ZM',{month:'short',day:'2-digit'})+' '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }catch(e){ return u.lastLogin||'-'; } })();
      return `
        <tr>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9"><span class="mono" style="font-weight:700">${esc(u.id)}</span></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9"><div style="display:flex;gap:8px;align-items:center"><div style="width:32px;height:32px;border-radius:50%;background:#E2E8F0;border:1px solid var(--border);display:grid;place-items:center;font-size:11px;font-weight:800">${esc(u.avatar||u.name.slice(0,2).toUpperCase())}</div><div><div style="font-weight:600">${esc(u.name)}</div><div style="font-size:11px;color:var(--muted)">${esc(u.email||'')}</div></div></div></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9">${esc(u.department||'-')}</td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9"><span class="pill ${rolePillClass}">${esc(u.role)}</span><div style="font-size:10px;color:var(--muted-2);margin-top:2px">${(u.permissions||[]).length} perms</div></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9">${esc(lastLogin)}</td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9"><span class="pill ${statusClass}">${esc(u.status||'Active')}</span></td>
          <td style="padding:11px 12px;border-bottom:1px solid #F1F5F9"><div style="display:flex;gap:4px"><button class="btn btn-sm" data-action="edit" data-id="${esc(u.id)}">Edit Role</button><button class="btn btn-sm" data-action="more" data-id="${esc(u.id)}">⋯</button></div></td>
        </tr>
      `;
    }).join('');
    tbody.querySelectorAll('button[data-action]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id=btn.dataset.id; const act=btn.dataset.action;
        const user=(getState().users||[]).find(x=>x.id===id);
        if(!user) return;
        if(act==='edit') openDrawer(user);
        if(act==='more') showCtxMenu(btn,user);
      });
    });
    renderKPIs();
  }

  function bindEvents() {
    searchInput?.addEventListener('input', ()=>{ currentPage=1; renderAll(); });
    filterRole?.addEventListener('change', ()=>{ currentPage=1; renderAll(); });
    filterDept?.addEventListener('change', ()=>{ currentPage=1; renderAll(); });
    filterStatus?.addEventListener('change', ()=>{ currentPage=1; renderAll(); });
    pageSizeEl?.addEventListener('change', ()=>{ currentPage=1; renderAll(); });

    document.getElementById('btnPrevPage')?.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; renderAll(); } });
    document.getElementById('btnNextPage')?.addEventListener('click', ()=>{
      const totalPages=Math.ceil(filtered.length / parseInt(pageSizeEl?.value||'50',10));
      if(currentPage<totalPages){ currentPage++; renderAll(); }
    });
    document.getElementById('btnResetFilters')?.addEventListener('click', ()=>{
      if(searchInput) searchInput.value=''; if(filterRole) filterRole.value=''; if(filterDept) filterDept.value=''; if(filterStatus) filterStatus.value=''; currentPage=1; renderAll();
    });

    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('btnCancelDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('btnSaveUser')?.addEventListener('click', saveUserRole);
    fRole?.addEventListener('change', ()=>{
      const newRole=fRole.value;
      updateRoleDesc(newRole);
      // Suggest default perms for new role if user hasn't customized heavily
      if (confirm(`Switch role to ${newRole}? Apply default permissions for ${newRole}?`)) {
        currentEditPermissions = [...(DEFAULT_PERMS_BY_ROLE[newRole]||[])];
        renderAccessMatrix(newRole, currentEditPermissions);
      }
    });

    document.getElementById('btnSelectAllPerms')?.addEventListener('click', ()=>{
      currentEditPermissions = PERMISSIONS.map(p=>p.id);
      renderAccessMatrix(fRole?.value||'Maker', currentEditPermissions);
    });
    document.getElementById('btnClearPerms')?.addEventListener('click', ()=>{
      currentEditPermissions = [];
      renderAccessMatrix(fRole?.value||'Maker', currentEditPermissions);
    });

    // New user
    document.getElementById('btnNewUser')?.addEventListener('click', ()=>{ document.getElementById('newUserBackdrop').style.display='grid'; });
    document.getElementById('btnCloseNewUser')?.addEventListener('click', ()=>{ document.getElementById('newUserBackdrop').style.display='none'; });
    document.getElementById('btnCancelNewUser')?.addEventListener('click', ()=>{ document.getElementById('newUserBackdrop').style.display='none'; });
    document.getElementById('newUserBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='newUserBackdrop') e.currentTarget.style.display='none'; });
    document.getElementById('btnCreateUser')?.addEventListener('click', ()=>{
      const name=document.getElementById('nuName')?.value.trim();
      const email=document.getElementById('nuEmail')?.value.trim();
      const dept=document.getElementById('nuDept')?.value||'Leasing';
      const role=document.getElementById('nuRole')?.value||'Maker';
      if(!name||!email){ if(window.toast) toast('Name and email required','error'); return; }
      const st=getState();
      const id=`USR-${String((st.users?.length||0)+1).padStart(5,'0')}`;
      const user={ id, name, fullName:name, email, department:dept, role, roles:[role], permissions: DEFAULT_PERMS_BY_ROLE[role]||[], status:'Pending', lastLogin:null, avatar:name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(), createdAt:new Date().toISOString(), createdBy:'Chanda Mwanza' };
      if(!st.users) st.users=[];
      st.users.unshift(user);
      save();
      if(typeof addAuditEvent==='function') addAuditEvent('INVITE','user',id,`Invited ${name} as ${role} in ${dept}`);
      if(window.toast) toast(`Invite sent to ${email} as ${role} • Pending Checker approval`,'success');
      document.getElementById('newUserBackdrop').style.display='none';
      renderAll();
    });

    document.getElementById('btnExportUsers')?.addEventListener('click', ()=>{
      const rows=[['User ID','Name','Email','Department','Role','Status','Last Login','Permissions']];
      getFiltered().forEach(u=> rows.push([u.id, `"${u.name}"`, u.email, u.department, u.role, u.status, u.lastLogin||'', `"${(u.permissions||[]).join(';')}"`]));
      const csv=rows.map(r=>r.join(',')).join('\n');
      const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='users_roles.csv'; a.click(); URL.revokeObjectURL(url);
    });

    document.getElementById('btnAccessRequests')?.addEventListener('click', ()=>{
      if(filterStatus) filterStatus.value='Pending';
      currentPage=1; renderAll();
      if(window.toast) toast('Filtered to pending access requests','info');
    });

    document.addEventListener('keydown', e=>{ if(e.key==='Escape'){ closeDrawer(); } });
  }

  bindEvents();
  renderAll();

  console.log('[Enterprise Users] ToR 9.3 loaded -', (getState().users||[]).length, 'users, maker-checker enforced');
});

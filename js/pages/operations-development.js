/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/operations-development.js
 * ToR 8.10 — Development Projects (CAPEX, Retention, Payment Certs)
 * ============================================================================
 * KPIs: Total Active Budget, Capital Spent MTD, Retention Held, Active Count
 * Table: Project ID, Name, Property, Stage, Approved Budget, Spent, Retention, Contractor, Target Date, Actions
 * Drawer: Budget vs Actual variance bar, Payment Certificate history, Variation Orders, Issue Cert button
 * Full search/filter, cert creation updating window.state + saveState()
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCommon === "function") initCommon("operations-development");

  const getState = () => window.state || {};
  const save = () => { if (window.saveState) window.saveState(); };

  function ensureOps() {
    const st = getState();
    if (!st.developmentProjects || st.developmentProjects.length === 0) {
      if (typeof generateOperationsMockData === 'function' && st.properties) {
        const ops = generateOperationsMockData(st.properties, st.units||[]);
        st.developmentProjects = ops.developmentProjects;
        if (!st.contractors) st.contractors = ops.contractors;
        save();
      }
    }
    if (!st.variationOrders) st.variationOrders = [];
  }
  ensureOps();

  const kpiGrid = document.getElementById('kpiGrid');
  const tbody = document.getElementById('projectsTbody');
  const countLabel = document.getElementById('countLabel');
  const budgetLabel = document.getElementById('budgetLabel');
  const spentLabel = document.getElementById('spentLabel');
  const varianceLabel = document.getElementById('varianceLabel');
  const tableInfo = document.getElementById('tableInfo');
  const certSummary = document.getElementById('certSummary');

  const searchInput = document.getElementById('searchInputLocal');
  const filterProperty = document.getElementById('filterProperty');
  const filterStage = document.getElementById('filterStage');
  const filterStatus = document.getElementById('filterStatus');
  const filterContractor = document.getElementById('filterContractor');
  const pageSizeSel = document.getElementById('pageSize');

  const drawer = document.getElementById('devDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const ctxMenu = document.getElementById('ctxMenu');

  let currentPage = 1;
  let pageSize = 50;
  let selectedId = null;
  let editingId = null;

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function populateFilters() {
    const st = getState();
    const props = st.properties || [];
    if (filterProperty) filterProperty.innerHTML = '<option value="">All Properties</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    const dProp = document.getElementById('dProperty');
    if (dProp) dProp.innerHTML = '<option value="">Select Property</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    const contractors = st.contractors || [
      { id:"CTR-004", name:"BuildWell Construction" },
      { id:"CTR-001", name:"ColdTech Zambia Ltd" }
    ];
    const contractorOptions = ['<option value="">All Contractors</option>'].concat(contractors.map(c=>`<option value="${c.id||c.name}">${escapeHtml(c.name)}</option>`));
    if (filterContractor) filterContractor.innerHTML = contractorOptions.join('');
    const dContractor = document.getElementById('dContractor');
    if (dContractor) dContractor.innerHTML = '<option value="">Select Contractor</option>' + contractors.map(c=>`<option value="${c.id}">${escapeHtml(c.name)} - ${c.specialty||''}</option>`).join('') + '<option value="TBD">TBD - To Be Procured</option>';

    const cProject = document.getElementById('cProject');
    if (cProject) {
      const projs = st.developmentProjects||[];
      cProject.innerHTML = '<option value="">Select Project</option>' + projs.map(p=>`<option value="${p.id}">${escapeHtml(p.id)} - ${escapeHtml(p.name)}</option>`).join('');
    }
  }

  function stagePill(stage) {
    const map = {
      'Feasibility': 'gray',
      'Design': 'blue',
      'Procurement': 'violet',
      'Execution': 'amber',
      'Practical Completion': 'green',
      'Defects Liability': 'blue',
      'Closed': 'slate'
    };
    return `<span class="pill ${map[stage]||'gray'}">${escapeHtml(stage||'Feasibility')}</span>`;
  }

  function statusPill(status) {
    const map = {
      'In Progress': 'blue',
      'Pending Approval': 'amber',
      'On Hold': 'red',
      'Completed': 'green'
    };
    return `<span class="pill ${map[status]||'gray'}">${escapeHtml(status||'')}</span>`;
  }

  function calculateKPIs(filtered) {
    const st = getState();
    const projects = st.developmentProjects||[];
    const now = new Date();
    const curMonth = now.toISOString().slice(0,7); // YYYY-MM

    const activeProjects = projects.filter(p=> ['Feasibility','Design','Procurement','Execution'].includes(p.stage||p.lifecycleStage||'') || p.status==='In Progress');
    const totalActiveBudget = activeProjects.reduce((s,p)=> s + (p.approvedBudget||p.budget||0),0);
    const totalRetention = projects.reduce((s,p)=> s + (p.retentionAmount||0),0);

    // Capital Spent MTD: sum of certs in current month
    let spentMTD = 0;
    projects.forEach(p=>{
      (p.paymentCertificates||[]).forEach(c=>{
        if ((c.date||'').startsWith(curMonth)) spentMTD += c.amount||0;
      });
    });
    // Fallback: if no certs in current month, use 15% of total spent as MTD estimate
    if (spentMTD===0) {
      const totalSpent = projects.reduce((s,p)=> s + (p.spent||0),0);
      spentMTD = Math.round(totalSpent * 0.15);
    }
    const totalSpent = projects.reduce((s,p)=> s + (p.spent||0),0);
    const totalBudget = projects.reduce((s,p)=> s + (p.approvedBudget||p.budget||0),0);

    return { totalActiveBudget, spentMTD, totalRetention, activeCount: activeProjects.length, totalBudget, totalSpent };
  }

  function renderKPIs(filtered) {
    const kpis = calculateKPIs(filtered);
    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi accent-blue"><div class="kpi-top"><div class="kpi-label">Total Active Development Budget</div><div class="kpi-icon blue">🏗️</div></div><div class="kpi-value">ZMW ${(kpis.totalActiveBudget/1000000).toFixed(1)}M</div><div class="kpi-meta">${kpis.activeCount} active projects • Total portfolio ZMW ${(kpis.totalBudget/1000000).toFixed(1)}M</div></div>
        <div class="kpi accent-amber"><div class="kpi-top"><div class="kpi-label">Capital Spent MTD</div><div class="kpi-icon amber">💸</div></div><div class="kpi-value">ZMW ${(kpis.spentMTD/1000000).toFixed(2)}M</div><div class="kpi-meta">Total spent ZMW ${(kpis.totalSpent/1000000).toFixed(1)}M • ${kpis.totalBudget? ((kpis.totalSpent/kpis.totalBudget)*100).toFixed(1):0}% of budget</div></div>
        <div class="kpi accent-violet"><div class="kpi-top"><div class="kpi-label">Retention Funds Held</div><div class="kpi-icon violet">🔒</div></div><div class="kpi-value">ZMW ${(kpis.totalRetention/1000000).toFixed(2)}M</div><div class="kpi-meta">10% Execution • 5% Defects • 50/50 release schedule</div></div>
        <div class="kpi accent-green"><div class="kpi-top"><div class="kpi-label">Active Projects Count</div><div class="kpi-icon green">📋</div></div><div class="kpi-value">${kpis.activeCount}</div><div class="kpi-meta"><span class="pill blue">${kpis.activeCount} in progress</span> • ${(getState().developmentProjects||[]).length} total</div></div>
      `;
    }
    if (budgetLabel) budgetLabel.textContent = `${(kpis.totalActiveBudget/1000000).toFixed(1)}M`;
    if (spentLabel) spentLabel.textContent = `${(kpis.totalSpent/1000000).toFixed(1)}M`;
    if (varianceLabel) {
      const variance = kpis.totalBudget - kpis.totalSpent;
      varianceLabel.textContent = `${(variance/1000000).toFixed(1)}M`;
    }
    const activeCountEl = document.getElementById('activeCount');
    if (activeCountEl) activeCountEl.textContent = `${kpis.activeCount} Active`;
    const retentionCountEl = document.getElementById('retentionCount');
    if (retentionCountEl) retentionCountEl.textContent = `Retention ZMW ${(kpis.totalRetention/1000).toFixed(0)}k`;

    // Cert summary
    if (certSummary) {
      const st = getState();
      const allCerts = [];
      (st.developmentProjects||[]).forEach(p=> (p.paymentCertificates||[]).forEach(c=> allCerts.push({ ...c, projectName:p.name, projectId:p.id })));
      const byStatus = {};
      allCerts.forEach(c=>{ const s=c.status||'Draft'; byStatus[s]=(byStatus[s]||0)+(c.amount||0); });
      certSummary.innerHTML = `
        <div class="detail-card"><div class="label">Paid Certificates</div><div class="value">ZMW ${((byStatus['Paid']||0)/1000000).toFixed(2)}M</div><div class="sub">${allCerts.filter(c=>c.status==='Paid').length} certs • ERP synced</div></div>
        <div class="detail-card"><div class="label">Approved / Submitted</div><div class="value">ZMW ${(((byStatus['Approved']||0)+(byStatus['Submitted']||0))/1000000).toFixed(2)}M</div><div class="sub">${allCerts.filter(c=>['Approved','Submitted'].includes(c.status)).length} pending payment</div></div>
        <div class="detail-card"><div class="label">Total Certificates</div><div class="value">${allCerts.length} IPCs • ZMW ${(allCerts.reduce((s,c)=>s+(c.amount||0),0)/1000000).toFixed(1)}M</div><div class="sub">MTD ZMW ${(calculateKPIs(filtered).spentMTD/1000000).toFixed(2)}M</div></div>
      `;
    }
  }

  function getFiltered() {
    const st = getState();
    let data = [...(st.developmentProjects||[])];
    const search = (searchInput?.value||'').toLowerCase().trim();
    const prop = filterProperty?.value||'';
    const stage = filterStage?.value||'';
    const status = filterStatus?.value||'';
    const contractor = filterContractor?.value||'';

    if (prop) data = data.filter(p=> p.propertyId===prop);
    if (stage) data = data.filter(p=> (p.stage||p.lifecycleStage||'')===stage);
    if (status) data = data.filter(p=> (p.status||'')===status);
    if (contractor) data = data.filter(p=> (p.contractorId||p.contractor||'')===contractor || (p.contractor||'').includes(contractor));
    if (search) {
      data = data.filter(p=>
        (p.id||'').toLowerCase().includes(search) ||
        (p.name||'').toLowerCase().includes(search) ||
        (p.propertyName||p.property||'').toLowerCase().includes(search) ||
        (p.contractor||'').toLowerCase().includes(search)
      );
    }
    data.sort((a,b)=> new Date(a.expectedCompletion||a.targetCompletion||'2099') - new Date(b.expectedCompletion||b.targetCompletion||'2099'));
    return data;
  }

  function renderTable() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage>totalPages) currentPage=totalPages;
    const pageData = filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);

    if (countLabel) countLabel.textContent = filtered.length;
    if (tableInfo) tableInfo.textContent = `Showing ${pageData.length} of ${filtered.length} projects • Page ${currentPage}/${totalPages}`;

    if (!tbody) return;
    if (pageData.length===0) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="ico">🏗️</div><h3>No development projects found</h3><p>Adjust filters or create a new project</p></div></td></tr>`;
    } else {
      tbody.innerHTML = pageData.map(p=>{
        const budget = p.approvedBudget||p.budget||0;
        const spent = p.spent||0;
        const retention = p.retentionAmount||0;
        const pctSpent = budget? (spent/budget*100) : 0;
        return `
          <tr data-id="${p.id}" style="cursor:pointer">
            <td><span style="font-family:monospace;font-weight:700">${escapeHtml(p.id)}</span></td>
            <td><div style="font-weight:700;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div><div style="font-size:11px;color:#64748B">${escapeHtml(p.projectManager||'')} • ${p.paymentCertificates? p.paymentCertificates.length+' IPCs' : ''}</div></td>
            <td><div style="font-weight:600">${escapeHtml(p.propertyName||p.property||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(p.propertyId||'')}</div></td>
            <td>${stagePill(p.stage||p.lifecycleStage||'Feasibility')}</td>
            <td><span style="font-weight:700">ZMW ${(budget/1000000).toFixed(2)}M</span></td>
            <td><div style="font-weight:700">ZMW ${(spent/1000000).toFixed(2)}M</div><div style="margin-top:4px;height:4px;background:#F1F5F9;border-radius:10px;overflow:hidden"><div style="height:100%;width:${Math.min(100,pctSpent)}%;background:${pctSpent>90?'#DC2626': pctSpent>70?'#D97706':'#2563EB'}"></div></div><div style="font-size:11px;color:#64748B">${pctSpent.toFixed(1)}% spent</div></td>
            <td><span style="font-weight:700">ZMW ${(retention/1000).toFixed(0)}k</span><div style="font-size:11px;color:#64748B">${p.retentionPct||10}% • ${(p.stage==='Defects Liability')?'5% retained':'10% retained'}</div></td>
            <td><div style="font-weight:600">${escapeHtml(p.contractor||'TBD')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(p.contractorId||'')}</div></td>
            <td><span style="font-weight:600">${escapeHtml(p.expectedCompletion||p.targetCompletion||'')}</span><div style="font-size:11px;color:#64748B">${statusPill(p.status||'')}</div></td>
            <td><button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openDrawer('${p.id}')">Open</button><button class="btn btn-sm" onclick="event.stopPropagation(); openContext(event,'${p.id}')">⋯</button></td>
          </tr>
        `;
      }).join('');
      tbody.querySelectorAll('tr[data-id]').forEach(tr=> tr.addEventListener('click', ()=> openDrawer(tr.dataset.id)));
    }
    renderKPIs(filtered);
  }

  // Drawer
  function openDrawer(id) {
    const st = getState();
    const project = (st.developmentProjects||[]).find(p=>p.id===id);
    if (!project) return;
    selectedId = id;
    document.getElementById('drawerTitle').textContent = project.id;
    document.getElementById('drawerId').textContent = project.name?.slice(0,30)||'';
    document.getElementById('drawerStage').textContent = project.stage||project.lifecycleStage||'Feasibility';
    document.getElementById('drawerStage').className = 'pill ' + (project.stage==='Execution'?'amber': project.stage==='Defects Liability'?'blue':'gray');
    document.getElementById('drawerStatus').textContent = project.status||'';
    document.getElementById('drawerSubtitle').textContent = `${project.propertyName||project.property||''} • ${project.contractor||''} • PM ${project.projectManager||''}`;

    const summary = document.getElementById('drawerSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="sum-item"><div class="l">Budget</div><div class="v">ZMW ${((project.approvedBudget||project.budget||0)/1000000).toFixed(2)}M</div></div>
        <div class="sum-item"><div class="l">Spent</div><div class="v">ZMW ${((project.spent||0)/1000000).toFixed(2)}M</div></div>
        <div class="sum-item"><div class="l">Retention</div><div class="v">ZMW ${((project.retentionAmount||0)/1000).toFixed(0)}k</div></div>
      `;
    }
    renderDrawerTab('budget');
    drawer.classList.add('open');
    drawerBackdrop.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    selectedId = null;
  }

  function renderDrawerTab(tab) {
    const st = getState();
    const project = (st.developmentProjects||[]).find(p=>p.id===selectedId);
    if (!project) return;
    document.querySelectorAll('.drawer-tab').forEach(el=> el.classList.toggle('active', el.dataset.tab===tab));
    const body = document.getElementById('drawerBody');
    if (!body) return;

    const budget = project.approvedBudget||project.budget||0;
    const spent = project.spent||0;
    const variance = budget - spent;
    const pctSpent = budget? (spent/budget*100) : 0;
    const retention = project.retentionAmount||0;

    if (tab==='budget') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Budget vs Actual Variance (ToR 8.10)</h4>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
            <div class="detail-card"><div class="label">Approved Budget</div><div class="value">ZMW ${(budget/1000000).toFixed(2)}M</div><div class="sub">Original + variations</div></div>
            <div class="detail-card"><div class="label">Spent to Date</div><div class="value">ZMW ${(spent/1000000).toFixed(2)}M</div><div class="sub">${pctSpent.toFixed(1)}% of budget</div></div>
            <div class="detail-card"><div class="label">Variance</div><div class="value" style="color:${variance>=0?'#16A34A':'#DC2626'}">ZMW ${(variance/1000000).toFixed(2)}M ${variance>=0?'under':'over'}</div><div class="sub">${variance>=0?'Within budget':'Budget overrun'}</div></div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12px;font-weight:600">Budget Utilization</span><span style="font-size:12px;font-weight:700">${pctSpent.toFixed(1)}% spent</span></div>
            <div style="height:10px;background:#E2E8F0;border-radius:10px;overflow:hidden;display:flex"><div style="height:100%;width:${Math.min(100,pctSpent)}%;background:${pctSpent>90?'#DC2626': pctSpent>70?'#D97706':'#2563EB'}"></div></div>
            <div style="margin-top:8px;display:flex;justify-content:space-between;font-size:11px;color:#64748B"><span>ZMW 0</span><span>ZMW ${(budget/1000000).toFixed(1)}M budget</span></div>
          </div>
          <div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
            <div class="detail-card"><div class="label">Committed (Certs + LPOs)</div><div class="value">ZMW ${((project.committed||spent*1.1)/1000000).toFixed(2)}M</div><div class="sub">Includes pending certs</div></div>
            <div class="detail-card"><div class="label">Forecast Final Cost</div><div class="value">ZMW ${((project.committed||spent*1.1)/1000000).toFixed(2)}M</div><div class="sub">Est. at completion</div></div>
          </div>
          <div style="margin-top:12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px;font-size:12px">CAPEX tracking linked to Investment module asset under construction. Variance >10% requires Investment Committee approval.</div>
        </div>
      `;
    } else if (tab==='certs') {
      const certs = project.paymentCertificates||[];
      const totalCerts = certs.reduce((s,c)=>s+(c.amount||0),0);
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Payment Certificate Approval History (IPC) • ${certs.length} certs • ZMW ${(totalCerts/1000000).toFixed(2)}M</h4>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${certs.length===0? '<div style="padding:20px;text-align:center;color:#64748B">No payment certificates issued yet</div>' : certs.map(c=>`
              <div style="padding:10px;border:1px solid ${c.status==='Paid'?'#BBF7D0': c.status==='Approved'?'#BFDBFE':'#E2E8F0'};border-radius:8px;background:${c.status==='Paid'?'#F0FDF4': c.status==='Approved'?'#EFF6FF':'#FFF'};display:flex;justify-content:space-between;align-items:center">
                <div><div style="font-weight:700;font-family:monospace">${escapeHtml(c.certificateNo||c.id)} • ZMW ${Number(c.amount||0).toLocaleString()}</div><div style="font-size:11px;color:#64748B">${c.date||''} • ${escapeHtml(c.description||'Work valuation')}</div></div>
                <div style="display:flex;gap:6px;align-items:center"><span class="pill ${c.status==='Paid'?'green': c.status==='Approved'?'blue': c.status==='Submitted'?'amber':'gray'}">${escapeHtml(c.status||'Draft')}</span><button class="btn btn-sm" onclick="updateCertStatus('${project.id}','${c.id}','Paid')">Mark Paid</button></div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="openCertModal('${project.id}')">Issue New Payment Certificate</button><button class="btn btn-sm" onclick="if(window.toast) toast('BOQ valuation: measured works','info')">View BOQ Valuation</button></div>
        </div>
      `;
    } else if (tab==='variations') {
      const variations = (st.variationOrders||[]).filter(v=> v.projectId===project.id);
      // Mock variations if none
      const mockVariations = variations.length? variations : [
        { id:'VO-001', projectId:project.id, number:'VO-01', description:'Additional piling depth due to soil conditions', amount:1250000, status:'Approved', date:'2026-06-15', impact:'+14 days' },
        { id:'VO-002', projectId:project.id, number:'VO-02', description:'Extra electrical points in retail units', amount:450000, status:'Pending Approval', date:'2026-08-20', impact:'+3 days' },
      ];
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Variation Orders Log • Budget Impact</h4>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${mockVariations.map(vo=>`
              <div style="padding:10px;border:1px solid #E2E8F0;border-radius:8px;background:#FFF">
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;font-family:monospace">${escapeHtml(vo.number)} • ${escapeHtml(vo.id)}</span><span class="pill ${vo.status==='Approved'?'green': vo.status==='Pending Approval'?'amber':'gray'}">${escapeHtml(vo.status)}</span></div>
                <div style="font-size:12px;margin-top:4px">${escapeHtml(vo.description)}</div>
                <div style="font-size:11px;color:#64748B;margin-top:4px">ZMW ${Number(vo.amount).toLocaleString()} • ${vo.date||''} • Impact ${vo.impact||''}</div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px;font-size:12px">Variation > ZMW 500k or >5% budget requires IC approval per ToR 8.10. Cumulative variations ZMW ${(mockVariations.reduce((s,v)=>s+v.amount,0)/1000000).toFixed(2)}M (${(mockVariations.reduce((s,v)=>s+v.amount,0)/budget*100).toFixed(1)}% of budget)</div>
          <div style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="openVariationModal('${project.id}')">Add Variation Order</button></div>
        </div>
      `;
    } else if (tab==='retention') {
      const release50 = retention * 0.5;
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Retention Funds Management (ToR 8.10)</h4>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
            <div class="detail-card"><div class="label">Retention %</div><div class="value">${project.retentionPct||10}%</div><div class="sub">${project.stage==='Defects Liability'?'5% defects stage':'10% execution'}</div></div>
            <div class="detail-card"><div class="label">Retention Held</div><div class="value">ZMW ${(retention/1000).toFixed(0)}k</div><div class="sub">ZMW ${Number(retention).toLocaleString()} total</div></div>
            <div class="detail-card"><div class="label">Release Schedule</div><div class="value">50/50</div><div class="sub">50% at Practical Completion • 50% after Defects Liability (12mo)</div></div>
            <div class="detail-card"><div class="label">Next Release</div><div class="value">ZMW ${(release50/1000).toFixed(0)}k</div><div class="sub">${project.expectedCompletion? new Date(new Date(project.expectedCompletion).getTime() + 30*86400000).toISOString().slice(0,10) : 'At PC'}</div></div>
          </div>
          <div style="margin-top:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px;font-size:12px;line-height:1.6">
            <b>ERP Procurement Link:</b> Retention automatically deducted from each IPC at ${project.retentionPct||10}%. Held in retention payable account. Release triggers: Practical Completion certificate → 50% release, Defects Liability expiry → final 50%. Interest not applicable.
          </div>
          <div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-sm" onclick="if(window.toast) toast('Retention release initiated - requires QS sign-off','info')">Release 50% Retention</button><button class="btn btn-sm" onclick="if(window.toast) toast('Retention statement exported','success')">Export Retention Statement</button></div>
        </div>
      `;
    }
  }

  // Context menu
  function openContext(e, id) {
    e.preventDefault(); e.stopPropagation();
    if (!ctxMenu) return;
    ctxMenu.innerHTML = `
      <div class="ctx-item" data-action="open">🏗️ Open Project</div>
      <div class="ctx-item" data-action="edit">✏️ Edit Project</div>
      <div class="ctx-item" data-action="cert">💰 Issue Payment Cert</div>
      <div class="ctx-item" data-action="variation">📝 Variation Order</div>
      <div class="ctx-item danger" data-action="delete">🗑️ Delete</div>
    `;
    ctxMenu.style.left = e.pageX+'px';
    ctxMenu.style.top = e.pageY+'px';
    ctxMenu.classList.add('open');
    ctxMenu.dataset.id = id;
  }

  // CRUD Project
  function openProjectModal(editId=null) {
    editingId = editId;
    const modal = document.getElementById('projectModalBackdrop');
    const title = document.getElementById('projectModalTitle');
    if (title) title.textContent = editId? 'Edit Development Project' : 'New Development Project';
    if (editId) {
      const p = (getState().developmentProjects||[]).find(x=>x.id===editId);
      if (p) {
        document.getElementById('dProperty').value = p.propertyId||'';
        document.getElementById('dName').value = p.name||'';
        document.getElementById('dStage').value = p.stage||p.lifecycleStage||'Execution';
        document.getElementById('dStatus').value = p.status||'In Progress';
        document.getElementById('dBudget').value = p.approvedBudget||p.budget||0;
        document.getElementById('dSpent').value = p.spent||0;
        document.getElementById('dContractor').value = p.contractorId||'';
        document.getElementById('dPM').value = p.projectManager||'';
        document.getElementById('dStart').value = p.startDate||'';
        document.getElementById('dTarget').value = p.expectedCompletion||p.targetCompletion||'';
        document.getElementById('dRetentionPct').value = p.retentionPct||10;
        document.getElementById('dDesc').value = p.description||'';
      }
    } else {
      document.getElementById('dProperty').value = '';
      document.getElementById('dName').value = '';
      document.getElementById('dStage').value = 'Execution';
      document.getElementById('dStatus').value = 'In Progress';
      document.getElementById('dBudget').value = '';
      document.getElementById('dSpent').value = '';
      document.getElementById('dContractor').value = '';
      document.getElementById('dPM').value = '';
      document.getElementById('dStart').value = new Date().toISOString().slice(0,10);
      document.getElementById('dTarget').value = new Date(Date.now()+180*86400000).toISOString().slice(0,10);
      document.getElementById('dRetentionPct').value = '10';
      document.getElementById('dDesc').value = '';
    }
    if (modal) modal.classList.add('open');
  }

  function closeProjectModal() {
    document.getElementById('projectModalBackdrop')?.classList.remove('open');
    editingId = null;
  }

  function saveProject() {
    const st = getState();
    const propId = document.getElementById('dProperty').value;
    if (!propId) { if(window.toast) toast('Select property','error'); return; }
    const prop = (st.properties||[]).find(p=>p.id===propId);
    const budget = parseFloat(document.getElementById('dBudget').value)||0;
    if (!budget) { if(window.toast) toast('Enter approved budget','error'); return; }
    const spent = parseFloat(document.getElementById('dSpent').value)||0;
    const contractorId = document.getElementById('dContractor').value;
    const contractor = (st.contractors||[]).find(c=>c.id===contractorId);
    const retentionPct = parseInt(document.getElementById('dRetentionPct').value)||10;

    const base = {
      propertyId: propId,
      propertyName: prop? prop.name : propId,
      property: prop? prop.name : propId,
      name: document.getElementById('dName').value.trim() || `Development at ${prop? prop.name : propId}`,
      stage: document.getElementById('dStage').value,
      lifecycleStage: document.getElementById('dStage').value,
      status: document.getElementById('dStatus').value,
      budget: budget,
      approvedBudget: budget,
      spent: spent,
      committed: Math.round(spent*1.1),
      variance: budget - spent,
      retentionPct: retentionPct,
      retentionAmount: Math.round(spent * retentionPct /100),
      startDate: document.getElementById('dStart').value,
      expectedCompletion: document.getElementById('dTarget').value,
      targetCompletion: document.getElementById('dTarget').value,
      contractor: contractor? contractor.name : (contractorId? contractorId : 'TBD'),
      contractorId: contractorId||'',
      projectManager: document.getElementById('dPM').value.trim() || 'Unassigned',
      description: document.getElementById('dDesc').value.trim(),
      city: prop? prop.city : 'Lusaka',
      paymentCertificates: []
    };

    if (editingId) {
      const idx = (st.developmentProjects||[]).findIndex(p=>p.id===editingId);
      if (idx>=0) {
        const existingCerts = st.developmentProjects[idx].paymentCertificates||[];
        st.developmentProjects[idx] = { ...st.developmentProjects[idx], ...base, paymentCertificates: existingCerts };
        // Recalc retention
        st.developmentProjects[idx].retentionAmount = Math.round(st.developmentProjects[idx].spent * retentionPct /100);
      }
      if(window.toast) toast('Project updated','success');
    } else {
      const newId = `DEV-${String((st.developmentProjects||[]).length+1).padStart(4,'0')}-${Date.now().toString().slice(-3)}`;
      st.developmentProjects.unshift({ id:newId, ...base });
      if(window.toast) toast('Project created','success');
      if (typeof addAuditEvent==='function') addAuditEvent('CREATE','development',newId,`Created project ${newId} ${base.name}`);
    }
    save();
    closeProjectModal();
    renderTable();
  }

  function deleteProject(id) {
    if (!confirm(`Delete project ${id}? All payment certificates will be removed.`)) return;
    const st = getState();
    st.developmentProjects = (st.developmentProjects||[]).filter(p=>p.id!==id);
    save();
    renderTable();
    closeDrawer();
    if(window.toast) toast('Project deleted','success');
  }

  // Payment Certificate creation handler - updates project spending in window.state
  function openCertModal(projectId=null) {
    const modal = document.getElementById('certModalBackdrop');
    const cProject = document.getElementById('cProject');
    if (projectId && cProject) cProject.value = projectId;
    else if (cProject) cProject.value = '';

    const st = getState();
    const proj = (st.developmentProjects||[]).find(p=>p.id=== (projectId||cProject?.value));
    const nextNo = proj? `IPC-${String((proj.paymentCertificates||[]).length+1).padStart(2,'0')}` : `IPC-${String(Math.floor(1+Math.random()*20)).padStart(2,'0')}`;
    document.getElementById('cNumber').value = nextNo;
    document.getElementById('cAmount').value = '';
    document.getElementById('cDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('cStatus').value = 'Approved';
    document.getElementById('cRetention').value = '';
    document.getElementById('cDesc').value = '';

    if (modal) modal.classList.add('open');
  }

  function closeCertModal() {
    document.getElementById('certModalBackdrop')?.classList.remove('open');
  }

  function saveCert() {
    const st = getState();
    const projectId = document.getElementById('cProject').value;
    if (!projectId) { if(window.toast) toast('Select project','error'); return; }
    const project = (st.developmentProjects||[]).find(p=>p.id===projectId);
    if (!project) { if(window.toast) toast('Project not found','error'); return; }

    const amount = parseFloat(document.getElementById('cAmount').value)||0;
    if (!amount) { if(window.toast) toast('Enter amount','error'); return; }
    const date = document.getElementById('cDate').value || new Date().toISOString().slice(0,10);
    let retention = parseFloat(document.getElementById('cRetention').value);
    if (isNaN(retention)) retention = Math.round(amount * (project.retentionPct||10) /100);

    const cert = {
      id: `CERT-${projectId}-${Date.now().toString().slice(-6)}`,
      projectId: projectId,
      certificateNo: document.getElementById('cNumber').value.trim() || `IPC-${String((project.paymentCertificates||[]).length+1).padStart(2,'0')}`,
      amount: amount,
      date: date,
      status: document.getElementById('cStatus').value,
      retentionDeducted: retention,
      description: document.getElementById('cDesc').value.trim() || 'Valuation of works executed',
      createdAt: new Date().toISOString()
    };

    if (!project.paymentCertificates) project.paymentCertificates = [];
    project.paymentCertificates.push(cert);

    // Update project spending in window.state per spec
    project.spent = (project.spent||0) + amount;
    project.committed = (project.committed||0) + amount;
    project.variance = (project.approvedBudget||project.budget||0) - project.spent;
    project.retentionAmount = (project.retentionAmount||0) + retention;

    save();
    closeCertModal();
    renderTable();
    if (selectedId===projectId) renderDrawerTab('certs');
    if(window.toast) toast(`Payment Certificate ${cert.certificateNo} issued - ZMW ${amount.toLocaleString()} - spent updated`,'success');
    if (typeof addAuditEvent==='function') addAuditEvent('CREATE','paymentCertificate',cert.id,`Issued cert ${cert.certificateNo} for ${projectId} ZMW ${amount}`);
  }

  function updateCertStatus(projectId, certId, newStatus) {
    const st = getState();
    const project = (st.developmentProjects||[]).find(p=>p.id===projectId);
    if (!project) return;
    const cert = (project.paymentCertificates||[]).find(c=>c.id===certId);
    if (!cert) return;
    cert.status = newStatus;
    save();
    renderTable();
    if (selectedId===projectId) renderDrawerTab('certs');
    if(window.toast) toast(`Certificate ${cert.certificateNo} marked ${newStatus}`,'success');
  }

  // Variation Orders
  function openVariationModal(projectId) {
    const st = getState();
    const project = (st.developmentProjects||[]).find(p=>p.id===projectId);
    const body = document.getElementById('variationBody');
    if (!body) return;
    const variations = (st.variationOrders||[]).filter(v=>v.projectId===projectId);
    const mock = variations.length? variations : [
      { id:'VO-001', number:'VO-01', description:'Additional piling depth', amount:1250000, status:'Approved', date:'2026-06-15' },
      { id:'VO-002', number:'VO-02', description:'Extra electrical points', amount:450000, status:'Pending Approval', date:'2026-08-20' },
    ];
    body.innerHTML = `
      <div style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="detail-card"><div class="label">Project</div><div class="value">${escapeHtml(project? project.name : projectId)}</div></div>
        <div class="detail-card"><div class="label">Budget Impact</div><div class="value">ZMW ${(mock.reduce((s,v)=>s+v.amount,0)/1000000).toFixed(2)}M</div><div class="sub">${mock.length} variations</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:260px;overflow:auto">
        ${mock.map(vo=>`
          <div style="padding:10px;border:1px solid #E2E8F0;border-radius:8px">
            <div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-family:monospace">${escapeHtml(vo.number||vo.id)}</span><span class="pill ${vo.status==='Approved'?'green':'amber'}">${escapeHtml(vo.status)}</span></div>
            <div style="font-size:12px;margin-top:4px">${escapeHtml(vo.description)}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px">ZMW ${Number(vo.amount).toLocaleString()} • ${vo.date||''}</div>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label class="form-label">VO Description *</label><input id="voDesc" class="form-input" placeholder="e.g. Additional works" /></div>
        <div class="form-group"><label class="form-label">Amount ZMW *</label><input type="number" id="voAmount" class="form-input" placeholder="e.g. 500000" /></div>
      </div>
    `;
    document.getElementById('variationModalBackdrop').dataset.projectId = projectId;
    document.getElementById('variationModalBackdrop').classList.add('open');
  }

  function closeVariationModal() {
    document.getElementById('variationModalBackdrop')?.classList.remove('open');
  }

  function addVariation() {
    const modal = document.getElementById('variationModalBackdrop');
    const projectId = modal.dataset.projectId;
    const desc = document.getElementById('voDesc')?.value.trim();
    const amount = parseFloat(document.getElementById('voAmount')?.value)||0;
    if (!desc || !amount) { if(window.toast) toast('Enter description and amount','error'); return; }
    const st = getState();
    if (!st.variationOrders) st.variationOrders = [];
    const vo = {
      id: `VO-${Date.now().toString().slice(-6)}`,
      projectId: projectId,
      number: `VO-${String(st.variationOrders.length+1).padStart(2,'0')}`,
      description: desc,
      amount: amount,
      status: 'Pending Approval',
      date: new Date().toISOString().slice(0,10)
    };
    st.variationOrders.push(vo);
    // Update project budget variance
    const project = (st.developmentProjects||[]).find(p=>p.id===projectId);
    if (project) {
      project.approvedBudget = (project.approvedBudget||project.budget||0) + amount;
      project.variance = project.approvedBudget - (project.spent||0);
    }
    save();
    closeVariationModal();
    renderTable();
    if (selectedId===projectId) renderDrawerTab('variations');
    if(window.toast) toast(`Variation ${vo.number} logged - ZMW ${amount.toLocaleString()}`,'success');
  }

  function exportCSV() {
    const data = getFiltered();
    if (data.length===0) { if(window.toast) toast('No data','error'); return; }
    const headers = ['Project ID','Project Name','Property','Stage','Status','Approved Budget','Spent to Date','Variance','Retention Held','Retention %','Contractor','Target Completion','Certs Count','Total Certs Value'];
    const rows = data.map(p=>{
      const totalCerts = (p.paymentCertificates||[]).reduce((s,c)=>s+(c.amount||0),0);
      return [p.id,p.name||'',p.propertyName||p.property||'',p.stage||p.lifecycleStage||'',p.status||'',p.approvedBudget||p.budget||0,p.spent||0,p.variance||0,p.retentionAmount||0,p.retentionPct||10,p.contractor||'',p.expectedCompletion||p.targetCompletion||'',(p.paymentCertificates||[]).length,totalCerts];
    });
    const csv = [headers.join(','), ...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`development_projects_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    if(window.toast) toast('CSV exported','success');
  }

  function bindEvents() {
    [searchInput, filterProperty, filterStage, filterStatus, filterContractor].forEach(el=>{
      if(!el) return;
      el.addEventListener(el.tagName==='INPUT'?'input':'change', ()=>{ currentPage=1; renderTable(); });
    });

    pageSizeSel?.addEventListener('change', e=>{ pageSize=parseInt(e.target.value)||50; currentPage=1; renderTable(); });
    document.getElementById('prevPage')?.addEventListener('click', ()=>{ if(currentPage>1){currentPage--; renderTable();} });
    document.getElementById('nextPage')?.addEventListener('click', ()=>{currentPage++; renderTable();});
    document.getElementById('btnResetFilters')?.addEventListener('click', ()=>{
      if(searchInput) searchInput.value='';
      if(filterProperty) filterProperty.value='';
      if(filterStage) filterStage.value='';
      if(filterStatus) filterStatus.value='';
      if(filterContractor) filterContractor.value='';
      currentPage=1; renderTable();
    });

    document.getElementById('btnNewProject')?.addEventListener('click', ()=> openProjectModal());
    document.getElementById('btnIssueCert')?.addEventListener('click', ()=> openCertModal());
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);
    document.getElementById('btnVariationLog')?.addEventListener('click', ()=>{ if(selectedId) openVariationModal(selectedId); else if(window.toast) toast('Open a project first to view variations','info'); });

    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    drawerBackdrop?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=> tab.addEventListener('click', ()=> renderDrawerTab(tab.dataset.tab)));

    // Project modal
    document.getElementById('btnCloseProjectModal')?.addEventListener('click', closeProjectModal);
    document.getElementById('btnCancelProject')?.addEventListener('click', closeProjectModal);
    document.getElementById('projectModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='projectModalBackdrop') closeProjectModal(); });
    document.getElementById('btnSaveProject')?.addEventListener('click', saveProject);

    // Cert modal
    document.getElementById('btnCloseCertModal')?.addEventListener('click', closeCertModal);
    document.getElementById('btnCancelCert')?.addEventListener('click', closeCertModal);
    document.getElementById('certModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='certModalBackdrop') closeCertModal(); });
    document.getElementById('btnSaveCert')?.addEventListener('click', saveCert);

    // Drawer actions
    document.getElementById('btnDrawerIssueCert')?.addEventListener('click', ()=>{ if(selectedId) openCertModal(selectedId); });
    document.getElementById('btnVariationOrder')?.addEventListener('click', ()=>{ if(selectedId) openVariationModal(selectedId); });
    document.getElementById('btnEditProject')?.addEventListener('click', ()=>{ if(selectedId) openProjectModal(selectedId); });
    document.getElementById('btnViewBOQ')?.addEventListener('click', ()=>{ if(window.toast) toast('BOQ: Bill of Quantities - 450 line items - ZMW 45M','info'); });

    // Variation modal
    document.getElementById('btnCloseVariationModal')?.addEventListener('click', closeVariationModal);
    document.getElementById('btnCancelVariation')?.addEventListener('click', closeVariationModal);
    document.getElementById('variationModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='variationModalBackdrop') closeVariationModal(); });
    document.getElementById('btnAddVariation')?.addEventListener('click', addVariation);

    // Context menu
    document.addEventListener('click', ()=>{ if(ctxMenu) ctxMenu.classList.remove('open'); });
    if (ctxMenu) {
      ctxMenu.addEventListener('click', e=>{
        const item = e.target.closest('.ctx-item');
        if(!item) return;
        const action=item.dataset.action;
        const id=ctxMenu.dataset.id;
        ctxMenu.classList.remove('open');
        if(action==='open') openDrawer(id);
        if(action==='edit') openProjectModal(id);
        if(action==='cert') openCertModal(id);
        if(action==='variation') openVariationModal(id);
        if(action==='delete') deleteProject(id);
      });
    }

    document.addEventListener('keydown', e=>{
      if(e.key==='Escape'){ closeDrawer(); closeProjectModal(); closeCertModal(); closeVariationModal(); }
    });
  }

  window.openDrawer = openDrawer;
  window.openContext = openContext;
  window.openCertModal = openCertModal;
  window.openVariationModal = openVariationModal;
  window.updateCertStatus = updateCertStatus;

  populateFilters();
  bindEvents();
  renderTable();

  console.log('[Operations Development] ToR 8.10 loaded -', (getState().developmentProjects||[]).length, 'projects');
});

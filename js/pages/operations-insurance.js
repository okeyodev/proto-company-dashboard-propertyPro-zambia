/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/operations-insurance.js
 * ToR 8.8 — Insurance Administration
 * ============================================================================
 * Handles: Policy register, renewal flags, claims lifecycle, risk survey checklist,
 * coverage gap analysis, document view, state persistence via saveState()
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCommon === "function") initCommon("operations-insurance");

  const getState = () => window.state || {};
  const save = () => { if (window.saveState) window.saveState(); };

  function ensureOperationsData() {
    const st = getState();
    if (!st.insurancePolicies || st.insurancePolicies.length === 0 || !st.insuranceClaims) {
      if (typeof generateOperationsMockData === 'function' && st.properties && st.units) {
        const ops = generateOperationsMockData(st.properties, st.units);
        if (!st.insurancePolicies || st.insurancePolicies.length === 0) st.insurancePolicies = ops.insurancePolicies;
        if (!st.insuranceClaims) st.insuranceClaims = ops.insuranceClaims;
        if (!st.valuations) st.valuations = ops.valuations;
        if (!st.maintenance) st.maintenance = ops.maintenance;
        save();
      }
    }
  }
  ensureOperationsData();

  // DOM
  const kpiGrid = document.getElementById('kpiGrid');
  const policiesTbody = document.getElementById('policiesTbody');
  const claimsTbody = document.getElementById('claimsTbody');
  const policyCountEl = document.getElementById('policyCount');
  const sumInsuredLabel = document.getElementById('sumInsuredLabel');
  const premiumLabel = document.getElementById('premiumLabel');
  const claimCountEl = document.getElementById('claimCount');
  const activeClaimsValueLabel = document.getElementById('activeClaimsValueLabel');
  const settlementRatioLabel = document.getElementById('settlementRatioLabel');
  const renewalAlertCount = document.getElementById('renewalAlertCount');
  const activeClaimsCountEl = document.getElementById('activeClaimsCount');

  const searchInput = document.getElementById('searchInputLocal');
  const filterProperty = document.getElementById('filterProperty');
  const filterInsurer = document.getElementById('filterInsurer');
  const filterRenewal = document.getElementById('filterRenewal');
  const filterType = document.getElementById('filterType');
  const claimStatusToggle = document.getElementById('claimStatusToggle');

  const drawer = document.getElementById('insuranceDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const ctxMenu = document.getElementById('ctxMenu');

  let policyPage = 1, claimPage = 1;
  let policyPageSize = 50, claimPageSize = 50;
  let currentClaimStatus = 'all';
  let selectedPolicyId = null;
  let editingPolicyId = null;
  let editingClaimId = null;

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // Populate filters
  function populateFilters() {
    const st = getState();
    const props = st.properties || [];
    const propOptions = ['<option value="">All Properties</option>'].concat(props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (${p.city})</option>`));
    if (filterProperty) filterProperty.innerHTML = propOptions.join('');
    const cProp = document.getElementById('cProperty');
    if (cProp) cProp.innerHTML = '<option value="">Select Property</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    const pProp = document.getElementById('pProperty');
    if (pProp) pProp.innerHTML = '<option value="">Select Property</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');

    const insurers = [...new Set((st.insurancePolicies||[]).map(p=>p.insurer).filter(Boolean))];
    const defaultInsurers = ["ZSIC General","Sanlam General Zambia","Professional Insurance","Madison General","Hollard Zambia"];
    const allInsurers = [...new Set([...defaultInsurers, ...insurers])];
    const insOptions = ['<option value="">All Insurers</option>'].concat(allInsurers.map(i=>`<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`));
    if (filterInsurer) filterInsurer.innerHTML = insOptions.join('');

    const policies = st.insurancePolicies || [];
    const cPolicy = document.getElementById('cPolicy');
    if (cPolicy) {
      cPolicy.innerHTML = '<option value="">Select Policy</option>' + policies.map(p=>`<option value="${p.id}">${escapeHtml(p.policyNumber||p.id)} - ${escapeHtml(p.propertyName||p.property||'')}</option>`).join('');
    }
  }

  // Renewal status logic
  function getRenewalStatus(policy) {
    const now = new Date(); now.setHours(0,0,0,0);
    const expiry = policy.expiryDate ? new Date(policy.expiryDate) : null;
    if (!expiry) return { label: 'No Date', cls: 'gray', days: 999, category: 'Active' };
    expiry.setHours(0,0,0,0);
    const diff = Math.ceil((expiry - now) / (1000*60*60*24));
    if (diff < 0) return { label: `Expired ${Math.abs(diff)}d ago`, cls: 'red', days: diff, category: 'Expired' };
    if (diff <= 30) return { label: `Expiring in ${diff}d`, cls: 'red', days: diff, category: 'Expiring <60d' };
    if (diff <= 60) return { label: `Due in ${diff}d`, cls: 'amber', days: diff, category: 'Expiring <60d' };
    if (diff <= 90) return { label: `Renewal in ${diff}d`, cls: 'blue', days: diff, category: 'Due Renewal' };
    return { label: `Active • ${diff}d left`, cls: 'green', days: diff, category: 'Active' };
  }

  function renewalBadge(policy) {
    const s = getRenewalStatus(policy);
    const clsMap = { green:'green', blue:'blue', amber:'amber', red:'red', gray:'gray' };
    return `<span class="pill ${clsMap[s.cls]||'gray'}">${escapeHtml(s.label)}</span>`;
  }

  function claimStatusPill(status) {
    const map = {
      'Pending': 'amber',
      'Under Assessment': 'blue',
      'Partially Paid': 'violet',
      'Settled': 'green',
      'Paid': 'green',
      'Rejected': 'red'
    };
    return `<span class="pill ${map[status]||'gray'}">${escapeHtml(status||'Pending')}</span>`;
  }

  // KPIs
  function renderKPIs(filteredPolicies, filteredClaims) {
    const st = getState();
    const allPolicies = st.insurancePolicies || [];
    const allClaims = st.insuranceClaims || [];

    const totalSum = allPolicies.reduce((s,p)=> s + (p.sumInsured||p.sumInsuredZMW||0),0);
    const totalPremium = allPolicies.reduce((s,p)=> s + (p.premium||p.premiumZMW||0),0);
    const expiring60 = allPolicies.filter(p=> {
      const r = getRenewalStatus(p);
      return r.days >=0 && r.days <=60;
    }).length;
    const activeClaimsValue = allClaims.filter(c=> !['Settled','Paid','Rejected'].includes(c.status)).reduce((s,c)=> s + (c.amountClaimed||0),0);
    const settled = allClaims.filter(c=> ['Settled','Paid'].includes(c.status)).length;
    const settlementRatio = allClaims.length ? ((settled / allClaims.length)*100).toFixed(0) : 0;

    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi accent-blue"><div class="kpi-top"><div class="kpi-label">Total Portfolio Sum Insured</div><div class="kpi-icon blue">🛡️</div></div><div class="kpi-value">ZMW ${(totalSum/1000000).toFixed(1)}M</div><div class="kpi-meta">${allPolicies.length} policies • Avg ZMW ${(totalSum/allPolicies.length/1000000||0).toFixed(1)}M / property</div></div>
        <div class="kpi accent-green"><div class="kpi-top"><div class="kpi-label">Total Annual Premium</div><div class="kpi-icon green">💰</div></div><div class="kpi-value">ZMW ${(totalPremium/1000).toFixed(1)}k</div><div class="kpi-meta">Rate ${(totalPremium/totalSum*100||0).toFixed(3)}% of sum insured • ${(totalPremium/12/1000).toFixed(1)}k / month</div></div>
        <div class="kpi accent-amber"><div class="kpi-top"><div class="kpi-label">Policies Expiring &lt;60 Days</div><div class="kpi-icon amber">⏰</div></div><div class="kpi-value">${expiring60}</div><div class="kpi-meta"><span class="pill amber">${expiring60} need renewal</span> • 30d trigger</div></div>
        <div class="kpi accent-violet"><div class="kpi-top"><div class="kpi-label">Active Claims Value</div><div class="kpi-icon violet">📋</div></div><div class="kpi-value">ZMW ${(activeClaimsValue/1000).toFixed(0)}k</div><div class="kpi-meta">${allClaims.filter(c=>!['Settled','Paid','Rejected'].includes(c.status)).length} active • Settlement ${settlementRatio}%</div></div>
      `;
    }
    if (renewalAlertCount) renewalAlertCount.textContent = `${expiring60} Renewals <60d`;
    if (activeClaimsCountEl) activeClaimsCountEl.textContent = `${allClaims.filter(c=>!['Settled','Paid','Rejected'].includes(c.status)).length} Active Claims`;
    if (sumInsuredLabel) sumInsuredLabel.textContent = `${(filteredPolicies.reduce((s,p)=>s+(p.sumInsured||0),0)/1000000).toFixed(1)}M`;
    if (premiumLabel) premiumLabel.textContent = `ZMW ${(filteredPolicies.reduce((s,p)=>s+(p.premium||0),0)/1000).toFixed(0)}k`;
    if (activeClaimsValueLabel) activeClaimsValueLabel.textContent = `ZMW ${(filteredClaims.filter(c=>!['Settled','Paid','Rejected'].includes(c.status)).reduce((s,c)=>s+(c.amountClaimed||0),0)/1000).toFixed(0)}k`;
    if (settlementRatioLabel) settlementRatioLabel.textContent = `${settlementRatio}%`;
  }

  // Filtering
  function getFilteredPolicies() {
    const st = getState();
    let data = [...(st.insurancePolicies||[])];
    const search = (searchInput?.value||'').toLowerCase().trim();
    const prop = filterProperty?.value||'';
    const insurer = filterInsurer?.value||'';
    const renewal = filterRenewal?.value||'';
    const type = filterType?.value||'';

    if (prop) data = data.filter(p=> p.propertyId===prop || p.property===prop);
    if (insurer) data = data.filter(p=> (p.insurer||'')===insurer);
    if (type) data = data.filter(p=> (p.type||p.policyType||'')===type);
    if (renewal) {
      if (renewal==='Expiring <60d') data = data.filter(p=>{ const r=getRenewalStatus(p); return r.days>=0 && r.days<=60; });
      else data = data.filter(p=> getRenewalStatus(p).category===renewal || p.status===renewal);
    }
    if (search) {
      data = data.filter(p=>
        (p.id||'').toLowerCase().includes(search) ||
        (p.policyNumber||'').toLowerCase().includes(search) ||
        (p.propertyName||p.property||'').toLowerCase().includes(search) ||
        (p.insurer||'').toLowerCase().includes(search) ||
        (p.type||'').toLowerCase().includes(search)
      );
    }
    data.sort((a,b)=> new Date(a.expiryDate||'2099') - new Date(b.expiryDate||'2099'));
    return data;
  }

  function getFilteredClaims() {
    const st = getState();
    let data = [...(st.insuranceClaims||[])];
    const search = (searchInput?.value||'').toLowerCase().trim();
    const prop = filterProperty?.value||'';

    if (prop) data = data.filter(c=> c.propertyId===prop || c.propertyName===prop || c.property===prop);
    if (currentClaimStatus!=='all') data = data.filter(c=> c.status===currentClaimStatus);
    if (search) {
      data = data.filter(c=>
        (c.id||'').toLowerCase().includes(search) ||
        (c.claimNumber||'').toLowerCase().includes(search) ||
        (c.propertyName||c.property||'').toLowerCase().includes(search) ||
        (c.description||'').toLowerCase().includes(search)
      );
    }
    data.sort((a,b)=> new Date(b.incidentDate||b.reportedDate||'2020') - new Date(a.incidentDate||a.reportedDate||'2020'));
    return data;
  }

  // Table renders
  function renderPolicies() {
    const filtered = getFilteredPolicies();
    const totalPages = Math.max(1, Math.ceil(filtered.length / policyPageSize));
    if (policyPage>totalPages) policyPage=totalPages;
    const pageData = filtered.slice((policyPage-1)*policyPageSize, policyPage*policyPageSize);

    if (policyCountEl) policyCountEl.textContent = filtered.length;
    const info = document.getElementById('policyTableInfo');
    if (info) info.textContent = `Showing ${pageData.length} of ${filtered.length} policies • Page ${policyPage}/${totalPages}`;

    if (!policiesTbody) return;
    if (pageData.length===0) {
      policiesTbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="ico">🛡️</div><h3>No policies found</h3><p>Adjust filters or create a new policy</p></div></td></tr>`;
    } else {
      policiesTbody.innerHTML = pageData.map(p=>{
        const renewal = renewalBadge(p);
        const sumM = (p.sumInsured||0)/1000000;
        const premium = p.premium||0;
        return `
          <tr data-id="${p.id}" style="cursor:pointer">
            <td><span style="font-family:monospace;font-weight:700">${escapeHtml(p.id)}</span><div style="font-size:11px;color:#64748B">${escapeHtml(p.policyNumber||'')}</div></td>
            <td><div style="font-weight:600">${escapeHtml(p.propertyName||p.property||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(p.propertyId||'')}</div></td>
            <td><div style="font-weight:600">${escapeHtml(p.insurer||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(p.type||p.policyType||'')}</div></td>
            <td><span style="font-weight:700">ZMW ${sumM.toFixed(1)}M</span></td>
            <td><span style="font-weight:700">ZMW ${Number(premium).toLocaleString()}</span><div style="font-size:11px;color:#64748B">${((premium/(p.sumInsured||1))*100).toFixed(3)}%</div></td>
            <td><span style="font-weight:600">${escapeHtml(p.expiryDate||'')}</span><div style="font-size:11px;color:#64748B">${escapeHtml(p.renewalDate||'')}</div></td>
            <td>${renewal}</td>
            <td><button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openDrawer('${p.id}')">Open</button><button class="btn btn-sm" onclick="event.stopPropagation(); openContext(event,'${p.id}','policy')">⋯</button></td>
          </tr>
        `;
      }).join('');
      policiesTbody.querySelectorAll('tr[data-id]').forEach(tr=> tr.addEventListener('click', ()=> openDrawer(tr.dataset.id)));
    }
    renderKPIs(filtered, getFilteredClaims());
  }

  function renderClaims() {
    const filtered = getFilteredClaims();
    const totalPages = Math.max(1, Math.ceil(filtered.length / claimPageSize));
    if (claimPage>totalPages) claimPage=totalPages;
    const pageData = filtered.slice((claimPage-1)*claimPageSize, claimPage*claimPageSize);

    if (claimCountEl) claimCountEl.textContent = filtered.length;
    const info = document.getElementById('claimTableInfo');
    if (info) info.textContent = `Showing ${pageData.length} of ${filtered.length} claims • Page ${claimPage}/${totalPages}`;

    if (!claimsTbody) return;
    if (pageData.length===0) {
      claimsTbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="ico">📋</div><h3>No claims found</h3><p>Log a new claim for an incident</p></div></td></tr>`;
    } else {
      claimsTbody.innerHTML = pageData.map(c=>{
        return `
          <tr data-id="${c.id}" style="cursor:pointer">
            <td><span style="font-family:monospace;font-weight:700">${escapeHtml(c.claimNumber||c.id)}</span><div style="font-size:11px;color:#64748B">${escapeHtml(c.id)}</div></td>
            <td><div style="font-weight:600">${escapeHtml(c.propertyName||c.property||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(c.insurer||'')}</div></td>
            <td><div style="font-weight:600">${escapeHtml(c.incidentDate||'')}</div><div style="font-size:11px;color:#64748B">Reported ${escapeHtml(c.reportedDate||'')}</div></td>
            <td><span style="font-weight:700">ZMW ${Number(c.amountClaimed||0).toLocaleString()}</span></td>
            <td><span style="font-weight:700;color:#7C3AED">ZMW ${Number(c.amountPaid||c.payout||0).toLocaleString()}</span><div style="font-size:11px;color:#64748B">${c.amountClaimed? ((c.amountPaid||0)/c.amountClaimed*100).toFixed(0)+'% offered' : ''}</div></td>
            <td>${claimStatusPill(c.status)}</td>
            <td><button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openClaim('${c.id}')">View</button><button class="btn btn-sm" onclick="event.stopPropagation(); openContext(event,'${c.id}','claim')">⋯</button></td>
          </tr>
        `;
      }).join('');
    }
    renderKPIs(getFilteredPolicies(), filtered);
  }

  function renderAll() {
    renderPolicies();
    renderClaims();
  }

  // Drawer
  function openDrawer(policyId) {
    const st = getState();
    const policy = (st.insurancePolicies||[]).find(p=>p.id===policyId);
    if (!policy) return;
    selectedPolicyId = policyId;
    const renewal = getRenewalStatus(policy);
    document.getElementById('drawerTitle').textContent = policy.id;
    document.getElementById('drawerId').textContent = policy.policyNumber||policy.id;
    document.getElementById('drawerStatus').textContent = policy.status||'Active';
    document.getElementById('drawerStatus').className = 'pill ' + (renewal.cls==='red'?'red': renewal.cls==='amber'?'amber': renewal.cls==='blue'?'blue':'green');
    document.getElementById('drawerRenewal').textContent = renewal.label;
    document.getElementById('drawerRenewal').className = 'pill ' + renewal.cls;
    document.getElementById('drawerSubtitle').textContent = `${policy.propertyName||policy.property||''} • ${policy.insurer||''} • ${policy.type||''}`;

    const summary = document.getElementById('drawerSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="sum-item"><div class="l">Sum Insured</div><div class="v">ZMW ${(policy.sumInsured/1000000).toFixed(1)}M</div></div>
        <div class="sum-item"><div class="l">Premium</div><div class="v">ZMW ${Number(policy.premium).toLocaleString()}</div></div>
        <div class="sum-item"><div class="l">Expiry</div><div class="v">${policy.expiryDate||''}</div></div>
      `;
    }
    renderDrawerTab('policy');
    drawer.classList.add('open');
    drawerBackdrop.classList.add('open');
  }

  function openClaim(claimId) {
    const st = getState();
    const claim = (st.insuranceClaims||[]).find(c=>c.id===claimId);
    if (!claim) return;
    const policy = (st.insurancePolicies||[]).find(p=>p.id===claim.policyId) || {};
    // Reuse drawer but show claim context
    selectedPolicyId = claim.policyId || policy.id || null;
    document.getElementById('drawerTitle').textContent = claim.claimNumber||claim.id;
    document.getElementById('drawerId').textContent = claim.id;
    document.getElementById('drawerStatus').textContent = claim.status||'Pending';
    document.getElementById('drawerStatus').className = 'pill ' + (claim.status==='Rejected'?'red': claim.status==='Settled'?'green':'amber');
    document.getElementById('drawerRenewal').textContent = `ZMW ${Number(claim.amountClaimed).toLocaleString()} claimed`;
    document.getElementById('drawerRenewal').className = 'pill violet';
    document.getElementById('drawerSubtitle').textContent = `${claim.propertyName||''} • ${claim.incidentDate||''} • Policy ${policy.policyNumber||''}`;

    const summary = document.getElementById('drawerSummary');
    if (summary) {
      summary.innerHTML = `
        <div class="sum-item"><div class="l">Claimed</div><div class="v">ZMW ${Number(claim.amountClaimed).toLocaleString()}</div></div>
        <div class="sum-item"><div class="l">Offer / Paid</div><div class="v">ZMW ${Number(claim.amountPaid||0).toLocaleString()}</div></div>
        <div class="sum-item"><div class="l">Status</div><div class="v">${claim.status||''}</div></div>
      `;
    }
    const body = document.getElementById('drawerBody');
    if (body) {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 8px">Claim Details</h4>
          <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:13px">
            <div style="color:#64748B">Incident</div><div style="font-weight:600">${escapeHtml(claim.description||'')}</div>
            <div style="color:#64748B">Incident Date</div><div>${escapeHtml(claim.incidentDate||'')} • Reported ${escapeHtml(claim.reportedDate||'')}</div>
            <div style="color:#64748B">Insurer</div><div>${escapeHtml(claim.insurer||policy.insurer||'')}</div>
            <div style="color:#64748B">Offer Ratio</div><div>${claim.amountClaimed? ((claim.amountPaid||0)/claim.amountClaimed*100).toFixed(1)+'%' : '-'}</div>
          </div>
          <div style="margin-top:12px" class="photo-proof"><div class="ico">📸</div><div style="font-weight:600;font-size:13px">Evidence photos • GPS tagged • Linked to WO if applicable</div></div>
          <div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-sm" onclick="updateClaimStatus('${claim.id}','Under Assessment')">Mark Assessing</button><button class="btn btn-sm" onclick="updateClaimStatus('${claim.id}','Settled')">Mark Settled</button><button class="btn btn-sm btn-danger" onclick="updateClaimStatus('${claim.id}','Rejected')">Reject</button></div>
        </div>
      `;
    }
    drawer.classList.add('open');
    drawerBackdrop.classList.add('open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawerBackdrop.classList.remove('open');
    selectedPolicyId = null;
  }

  function renderDrawerTab(tab) {
    const st = getState();
    const policy = (st.insurancePolicies||[]).find(p=>p.id===selectedPolicyId);
    if (!policy) return;
    document.querySelectorAll('.drawer-tab').forEach(el=> el.classList.toggle('active', el.dataset.tab===tab));
    const body = document.getElementById('drawerBody');
    if (!body) return;

    const claimsForPolicy = (st.insuranceClaims||[]).filter(c=> c.policyId===policy.id || c.propertyId===policy.propertyId);
    const valuation = (st.valuations||[]).find(v=> v.propertyId===policy.propertyId);
    const renewal = getRenewalStatus(policy);

    if (tab==='policy') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Policy Document View (DMS 9.3.1)</h4>
          <div style="background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px;padding:24px;text-align:center">
            <div style="font-size:28px">📄</div>
            <div style="font-weight:700;margin-top:6px">${escapeHtml(policy.policyNumber||policy.id)}.pdf</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px">Version 2 • OCR indexed • ${policy.insurer||''} • Full-text search</div>
            <div style="margin-top:10px;display:flex;gap:6px;justify-content:center"><span class="pill blue">Version Control</span><span class="pill green">OCR</span><span class="pill violet">Linked to Valuation</span></div>
            <div style="margin-top:12px"><button class="btn btn-sm">Preview PDF</button> <button class="btn btn-sm">Download</button> <button class="btn btn-sm">History</button></div>
          </div>
          <div style="margin-top:14px;display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:13px">
            <div style="color:#64748B">Policy No</div><div style="font-weight:600">${escapeHtml(policy.policyNumber||'')}</div>
            <div style="color:#64748B">Type</div><div>${escapeHtml(policy.type||'')}</div>
            <div style="color:#64748B">Insurer</div><div style="font-weight:600">${escapeHtml(policy.insurer||'')}</div>
            <div style="color:#64748B">Sum Insured</div><div style="font-weight:700">ZMW ${Number(policy.sumInsured).toLocaleString()} • ZMW ${(policy.sumInsured/1000000).toFixed(1)}M</div>
            <div style="color:#64748B">Premium</div><div>ZMW ${Number(policy.premium).toLocaleString()} • Rate ${((policy.premium/policy.sumInsured)*100).toFixed(3)}%</div>
            <div style="color:#64748B">Period</div><div>${policy.startDate||''} → ${policy.expiryDate||''} • Renewal ${policy.renewalDate||''}</div>
            <div style="color:#64748B">Status</div><div>${renewalBadge(policy)} ${renewal.label}</div>
          </div>
        </div>
        <div style="margin-top:12px;background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 8px">Coverage Linkage</h4>
          <div style="font-size:12.5px;line-height:1.5;color:#475569">Insurance value auto-syncs from valuation module (ToR 8.9). Current market value ZMW ${valuation? (valuation.marketValue/1000000).toFixed(1)+'M' : 'N/A'} vs sum insured ZMW ${(policy.sumInsured/1000000).toFixed(1)}M. Gap analysis runs monthly.</div>
        </div>
      `;
    } else if (tab==='risk') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Risk Survey Findings Checklist (ToR 8.8)</h4>
          <div style="display:grid;gap:10px">
            ${[
              { item:'Fire Extinguishers Serviced', status:'Pass', date:'2026-09-15', notes:'All 12 extinguishers serviced' },
              { item:'Emergency Exits Clear', status:'Pass', date:'2026-09-15', notes:'3 exits inspected, clear' },
              { item:'CCTV Operational', status:'Fail', date:'2026-09-15', notes:'Camera 2 offline - maintenance logged MNT-0012' },
              { item:'Security Guards Present', status:'Pass', date:'2026-09-15', notes:'24/7 coverage confirmed' },
              { item:'Electrical Wiring Compliant', status:'Pending', date:'2026-09-10', notes:'Report due from ZEP' },
              { item:'Hydrants Pressure OK', status:'Pass', date:'2026-09-15', notes:'Pressure 4.2 bar, within spec' },
              { item:'Lightning Protection', status:'Pass', date:'2026-08-20', notes:'Cert valid till 2027-08-20' },
            ].map(r=>`
              <div style="display:flex;gap:12px;align-items:flex-start;padding:10px;border:1px solid ${r.status==='Pass'?'#BBF7D0': r.status==='Fail'?'#FECACA':'#E2E8F0'};border-radius:8px;background:${r.status==='Pass'?'#F0FDF4': r.status==='Fail'?'#FEF2F2':'#F8FAFC'}">
                <div style="width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#FFF;border:1px solid #E2E8F0;font-size:14px">${r.status==='Pass'?'✅': r.status==='Fail'?'❌':'⏳'}</div>
                <div style="flex:1"><div style="font-weight:600;font-size:13px">${r.item} • <span class="pill ${r.status==='Pass'?'green': r.status==='Fail'?'red':'amber'}">${r.status}</span></div><div style="font-size:11px;color:#64748B;margin-top:2px">${r.date} • ${r.notes}</div></div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px;font-size:12px">Risk survey by ${policy.insurer||'Insurer'} • Last survey ${policy.riskSurveyDate||'2026-09-15'} • Next due ${policy.renewalDate||''} minus 30d • Non-compliance affects premium loading</div>
        </div>
      `;
    } else if (tab==='claims') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 10px">Claims History for ${escapeHtml(policy.propertyName||'')} • ${claimsForPolicy.length} claims</h4>
          ${claimsForPolicy.length===0? '<div style="padding:20px;text-align:center;color:#64748B">No claims for this policy/property</div>' : claimsForPolicy.map(c=>`
            <div style="padding:10px;border:1px solid #E2E8F0;border-radius:8px;margin-bottom:8px;background:#FFF">
              <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;font-family:monospace">${escapeHtml(c.claimNumber||c.id)}</span>${claimStatusPill(c.status)}</div>
              <div style="font-size:12px;margin-top:4px">${escapeHtml(c.description||'')} • Incident ${c.incidentDate||''}</div>
              <div style="font-size:11px;color:#64748B;margin-top:4px">Claimed ZMW ${Number(c.amountClaimed).toLocaleString()} • Paid ZMW ${Number(c.amountPaid||0).toLocaleString()} • ${c.amountClaimed? ((c.amountPaid||0)/c.amountClaimed*100).toFixed(0)+'% settled':''}</div>
            </div>
          `).join('')}
          <button class="btn btn-primary btn-sm" style="background:#7C3AED;border-color:#7C3AED;margin-top:8px" onclick="openClaimModal('${policy.id}')">Log New Claim for this Policy</button>
        </div>
      `;
    } else if (tab==='coverage') {
      const marketVal = valuation ? valuation.marketValue : policy.sumInsured;
      const gap = marketVal - policy.sumInsured;
      const gapPct = marketVal ? (gap/marketVal*100).toFixed(1) : 0;
      const isUnder = gap > 0;
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Coverage Gap Analysis (ToR 8.8)</h4>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
            <div class="detail-card"><div class="label">Market Value (Valuation)</div><div class="value">ZMW ${(marketVal/1000000).toFixed(2)}M</div><div class="sub">${valuation? valuation.valuer+' • '+valuation.date : 'No valuation linked'}</div></div>
            <div class="detail-card"><div class="label">Sum Insured</div><div class="value">ZMW ${(policy.sumInsured/1000000).toFixed(2)}M</div><div class="sub">Policy ${policy.policyNumber||''}</div></div>
            <div class="detail-card"><div class="label">Gap</div><div class="value" style="color:${isUnder?'#DC2626':'#16A34A'}">${isUnder? '-' : '+'}ZMW ${Math.abs(gap/1000000).toFixed(2)}M (${Math.abs(gapPct)}%)</div><div class="sub">${isUnder? 'Underinsured - risk' : 'Overinsured - premium efficiency'}</div></div>
            <div class="detail-card"><div class="label">Recommended Action</div><div class="value" style="font-size:13px">${isUnder? 'Increase sum to market value' : 'Retain or reduce'}</div><div class="sub">Auto-alert at 15% gap</div></div>
          </div>
          <div style="margin-top:12px;padding:10px;background:${isUnder?'#FEF2F2':'#F0FDF4'};border:1px solid ${isUnder?'#FECACA':'#BBF7D0'};border-radius:8px;font-size:12px">${isUnder? '⚠️ Underinsurance detected - claim may be subject to average clause. Recommend endorsement to increase sum insured.' : '✅ Adequate coverage'}</div>
        </div>
      `;
    }
  }

  // Context menu
  function openContext(e, id, type) {
    e.preventDefault(); e.stopPropagation();
    if (!ctxMenu) return;
    if (type==='policy') {
      ctxMenu.innerHTML = `
        <div class="ctx-item" data-action="open">📄 Open Policy</div>
        <div class="ctx-item" data-action="edit">✏️ Edit Policy</div>
        <div class="ctx-item" data-action="claim">➕ Log Claim</div>
        <div class="ctx-item" data-action="renew">🔄 Renew Policy</div>
        <div class="ctx-item danger" data-action="delete">🗑️ Delete</div>
      `;
    } else {
      ctxMenu.innerHTML = `
        <div class="ctx-item" data-action="viewClaim">👁️ View Claim</div>
        <div class="ctx-item" data-action="editClaim">✏️ Edit Claim</div>
        <div class="ctx-item" data-action="settle">✅ Mark Settled</div>
        <div class="ctx-item danger" data-action="deleteClaim">🗑️ Delete Claim</div>
      `;
    }
    ctxMenu.style.left = e.pageX+'px';
    ctxMenu.style.top = e.pageY+'px';
    ctxMenu.classList.add('open');
    ctxMenu.dataset.id = id;
    ctxMenu.dataset.type = type;
  }

  // CRUD Policy
  function openPolicyModal(editId=null) {
    editingPolicyId = editId;
    const modal = document.getElementById('policyModalBackdrop');
    const title = document.getElementById('policyModalTitle');
    if (title) title.textContent = editId? 'Edit Insurance Policy' : 'New Insurance Policy';
    if (editId) {
      const p = (getState().insurancePolicies||[]).find(x=>x.id===editId);
      if (p) {
        document.getElementById('pProperty').value = p.propertyId||'';
        document.getElementById('pInsurer').value = p.insurer||'ZSIC General';
        document.getElementById('pType').value = p.type||p.policyType||'Property All Risk';
        document.getElementById('pNumber').value = p.policyNumber||'';
        document.getElementById('pSum').value = p.sumInsured||'';
        document.getElementById('pPremium').value = p.premium||'';
        document.getElementById('pStart').value = p.startDate||'';
        document.getElementById('pExpiry').value = p.expiryDate||'';
      }
    } else {
      document.getElementById('pProperty').value = '';
      document.getElementById('pNumber').value = `POL/${new Date().getFullYear()}/${String(Math.floor(1000+Math.random()*9000))}`;
      document.getElementById('pSum').value = '';
      document.getElementById('pPremium').value = '';
      const now = new Date();
      const exp = new Date(); exp.setFullYear(now.getFullYear()+1);
      document.getElementById('pStart').value = now.toISOString().slice(0,10);
      document.getElementById('pExpiry').value = exp.toISOString().slice(0,10);
    }
    if (modal) modal.classList.add('open');
  }

  function closePolicyModal() {
    document.getElementById('policyModalBackdrop')?.classList.remove('open');
    editingPolicyId = null;
  }

  function savePolicy() {
    const st = getState();
    const propId = document.getElementById('pProperty').value;
    if (!propId) { if(window.toast) toast('Select property','error'); return; }
    const prop = (st.properties||[]).find(p=>p.id===propId);
    const sum = parseFloat(document.getElementById('pSum').value)||0;
    const premium = parseFloat(document.getElementById('pPremium').value)||0;
    if (!sum || !premium) { if(window.toast) toast('Enter sum and premium','error'); return; }
    const start = document.getElementById('pStart').value;
    const expiry = document.getElementById('pExpiry').value;
    if (!start || !expiry) { if(window.toast) toast('Enter dates','error'); return; }
    const renewal = new Date(expiry); renewal.setDate(renewal.getDate()-30);

    const base = {
      propertyId: propId,
      propertyName: prop? prop.name : propId,
      property: prop? prop.name : propId,
      insurer: document.getElementById('pInsurer').value,
      type: document.getElementById('pType').value,
      policyType: document.getElementById('pType').value,
      policyNumber: document.getElementById('pNumber').value.trim(),
      sumInsured: sum,
      sumInsuredZMW: sum,
      premium: premium,
      premiumZMW: premium,
      startDate: start,
      expiryDate: expiry,
      renewalDate: renewal.toISOString().slice(0,10),
      status: getRenewalStatus({expiryDate:expiry}).category,
      city: prop? prop.city : 'Lusaka'
    };

    if (editingPolicyId) {
      const idx = (st.insurancePolicies||[]).findIndex(p=>p.id===editingPolicyId);
      if (idx>=0) st.insurancePolicies[idx] = { ...st.insurancePolicies[idx], ...base };
      if(window.toast) toast('Policy updated','success');
    } else {
      const newId = `INS-POL-${String((st.insurancePolicies||[]).length+1).padStart(4,'0')}-${Date.now().toString().slice(-3)}`;
      st.insurancePolicies.unshift({ id:newId, ...base });
      if(window.toast) toast('Policy created','success');
      if (typeof addAuditEvent==='function') addAuditEvent('CREATE','insurance',newId,`Created policy ${newId} ${base.policyNumber}`);
    }
    save();
    closePolicyModal();
    renderAll();
  }

  function deletePolicy(id) {
    if (!confirm(`Delete policy ${id}?`)) return;
    const st = getState();
    st.insurancePolicies = (st.insurancePolicies||[]).filter(p=>p.id!==id);
    save();
    renderAll();
    closeDrawer();
    if(window.toast) toast('Policy deleted','success');
  }

  // CRUD Claim
  function openClaimModal(policyId=null) {
    const modal = document.getElementById('claimModalBackdrop');
    if (policyId) {
      document.getElementById('cPolicy').value = policyId;
      const st = getState();
      const pol = (st.insurancePolicies||[]).find(p=>p.id===policyId);
      if (pol) document.getElementById('cProperty').value = pol.propertyId||'';
    } else {
      document.getElementById('cPolicy').value = '';
      document.getElementById('cProperty').value = '';
    }
    document.getElementById('cIncident').value = new Date().toISOString().slice(0,10);
    document.getElementById('cNumber').value = `CLM/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*900))}`;
    document.getElementById('cDescription').value = '';
    document.getElementById('cAmount').value = '';
    document.getElementById('cStatus').value = 'Pending';
    editingClaimId = null;
    if (modal) modal.classList.add('open');
  }

  function closeClaimModal() {
    document.getElementById('claimModalBackdrop')?.classList.remove('open');
    editingClaimId = null;
  }

  function saveClaim() {
    const st = getState();
    const policyId = document.getElementById('cPolicy').value;
    const propId = document.getElementById('cProperty').value;
    if (!policyId || !propId) { if(window.toast) toast('Select policy and property','error'); return; }
    const policy = (st.insurancePolicies||[]).find(p=>p.id===policyId);
    const prop = (st.properties||[]).find(p=>p.id===propId);
    const incident = document.getElementById('cIncident').value;
    const amount = parseFloat(document.getElementById('cAmount').value)||0;
    if (!incident || !amount) { if(window.toast) toast('Enter incident date and amount','error'); return; }

    const base = {
      policyId,
      propertyId: propId,
      propertyName: prop? prop.name : propId,
      property: prop? prop.name : propId,
      insurer: policy? policy.insurer : '',
      incidentDate: incident,
      reportedDate: new Date().toISOString().slice(0,10),
      claimNumber: document.getElementById('cNumber').value.trim() || `CLM/${new Date().getFullYear()}/${String(Math.floor(100+Math.random()*900))}`,
      description: document.getElementById('cDescription').value.trim() || 'Incident reported',
      amountClaimed: amount,
      amountPaid: 0,
      payout: 0,
      status: document.getElementById('cStatus').value
    };

    if (editingClaimId) {
      const idx = (st.insuranceClaims||[]).findIndex(c=>c.id===editingClaimId);
      if (idx>=0) st.insuranceClaims[idx] = { ...st.insuranceClaims[idx], ...base };
      if(window.toast) toast('Claim updated','success');
    } else {
      const newId = `CLM-${String((st.insuranceClaims||[]).length+1).padStart(4,'0')}-${Date.now().toString().slice(-3)}`;
      st.insuranceClaims.unshift({ id:newId, ...base });
      if(window.toast) toast('Claim logged','success');
      if (typeof addAuditEvent==='function') addAuditEvent('CREATE','insuranceClaim',newId,`Logged claim ${newId} ${base.claimNumber}`);
    }
    save();
    closeClaimModal();
    renderAll();
  }

  function updateClaimStatus(id, status) {
    const st = getState();
    const claim = (st.insuranceClaims||[]).find(c=>c.id===id);
    if (!claim) return;
    claim.status = status;
    if (status==='Settled' || status==='Paid') {
      claim.amountPaid = claim.amountPaid || claim.amountClaimed * 0.85;
      claim.payout = claim.amountPaid;
    }
    save();
    renderAll();
    if(window.toast) toast(`Claim marked ${status}`,'success');
  }

  function deleteClaim(id) {
    if (!confirm(`Delete claim ${id}?`)) return;
    const st = getState();
    st.insuranceClaims = (st.insuranceClaims||[]).filter(c=>c.id!==id);
    save();
    renderAll();
    if(window.toast) toast('Claim deleted','success');
  }

  // Coverage Gap
  function showCoverageGap() {
    const st = getState();
    const policies = st.insurancePolicies||[];
    const valuations = st.valuations||[];
    const gaps = policies.map(p=>{
      const val = valuations.find(v=> v.propertyId===p.propertyId);
      const market = val? val.marketValue : p.sumInsured;
      const gap = market - p.sumInsured;
      const pct = market? (gap/market*100) : 0;
      return { policy:p, valuation:val, market, gap, pct };
    }).sort((a,b)=> b.pct - a.pct);

    const body = document.getElementById('coverageBody');
    if (body) {
      const underinsured = gaps.filter(g=> g.gap>0).length;
      body.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
          <div class="detail-card"><div class="label">Total Market Value</div><div class="value">ZMW ${(gaps.reduce((s,g)=>s+g.market,0)/1000000).toFixed(1)}M</div></div>
          <div class="detail-card"><div class="label">Total Sum Insured</div><div class="value">ZMW ${(gaps.reduce((s,g)=>s+g.policy.sumInsured,0)/1000000).toFixed(1)}M</div></div>
          <div class="detail-card"><div class="label">Underinsured Properties</div><div class="value" style="color:${underinsured?'#DC2626':'#16A34A'}">${underinsured}</div><div class="sub">${underinsured? 'Require endorsement' : 'All covered'}</div></div>
        </div>
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <div style="max-height:320px;overflow:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th style="padding:8px 10px;background:#F8FAFC;text-align:left">Property</th><th style="padding:8px 10px;background:#F8FAFC;text-align:right">Market</th><th style="padding:8px 10px;background:#F8FAFC;text-align:right">Sum Insured</th><th style="padding:8px 10px;background:#F8FAFC;text-align:right">Gap</th></tr></thead>
            <tbody>${gaps.map(g=>`<tr><td style="padding:8px 10px;border-top:1px solid #F1F5F9"><div style="font-weight:600">${escapeHtml(g.policy.propertyName||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(g.policy.policyNumber||'')}</div></td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right">ZMW ${(g.market/1000000).toFixed(2)}M</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right">ZMW ${(g.policy.sumInsured/1000000).toFixed(2)}M</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right;color:${g.gap>0?'#DC2626':'#16A34A'}">${g.gap>0?'-':'+'}${Math.abs(g.gap/1000000).toFixed(2)}M (${Math.abs(g.pct).toFixed(1)}%)</td></tr>`).join('')}</tbody>
            </table>
          </div>
        </div>
        <div style="margin-top:10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px;font-size:12px">Valuation sync: Insurance values from ToR 8.9 valuations module. Average clause applies if underinsured >15%. Recommend 90% co-insurance review quarterly.</div>
      `;
    }
    document.getElementById('coverageModalBackdrop')?.classList.add('open');
  }

  // Export
  function exportPoliciesCSV() {
    const data = getFilteredPolicies();
    if (data.length===0) { if(window.toast) toast('No policies to export','error'); return; }
    const headers = ['Policy ID','Policy Number','Property','Insurer','Type','Sum Insured','Premium','Start Date','Expiry Date','Renewal Date','Status'];
    const rows = data.map(p=>[p.id,p.policyNumber||'',p.propertyName||p.property||'',p.insurer||'',p.type||'',p.sumInsured||0,p.premium||0,p.startDate||'',p.expiryDate||'',p.renewalDate||'',getRenewalStatus(p).label]);
    const csv = [headers.join(','), ...rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`insurance_policies_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    if(window.toast) toast('Policies exported','success');
  }

  // Events
  function bindEvents() {
    [searchInput, filterProperty, filterInsurer, filterRenewal, filterType].forEach(el=>{
      if (!el) return;
      el.addEventListener(el.tagName==='INPUT'?'input':'change', ()=>{ policyPage=1; claimPage=1; renderAll(); });
    });

    if (claimStatusToggle) {
      claimStatusToggle.querySelectorAll('button').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          claimStatusToggle.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          currentClaimStatus = btn.dataset.status;
          claimPage=1;
          renderClaims();
        });
      });
    }

    document.getElementById('policyPageSize')?.addEventListener('change', e=>{ policyPageSize=parseInt(e.target.value)||50; policyPage=1; renderPolicies(); });
    document.getElementById('claimPageSize')?.addEventListener('change', e=>{ claimPageSize=parseInt(e.target.value)||50; claimPage=1; renderClaims(); });
    document.getElementById('policyPrevPage')?.addEventListener('click', ()=>{ if(policyPage>1){policyPage--; renderPolicies();} });
    document.getElementById('policyNextPage')?.addEventListener('click', ()=>{policyPage++; renderPolicies();});
    document.getElementById('claimPrevPage')?.addEventListener('click', ()=>{ if(claimPage>1){claimPage--; renderClaims();} });
    document.getElementById('claimNextPage')?.addEventListener('click', ()=>{claimPage++; renderClaims();});

    document.getElementById('btnResetFilters')?.addEventListener('click', ()=>{
      if(searchInput) searchInput.value='';
      if(filterProperty) filterProperty.value='';
      if(filterInsurer) filterInsurer.value='';
      if(filterRenewal) filterRenewal.value='';
      if(filterType) filterType.value='';
      currentClaimStatus='all';
      claimStatusToggle?.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b.dataset.status==='all'));
      policyPage=1; claimPage=1; renderAll();
    });

    document.getElementById('btnNewPolicy')?.addEventListener('click', ()=> openPolicyModal());
    document.getElementById('btnLogClaim')?.addEventListener('click', ()=> openClaimModal());
    document.getElementById('btnExportPolicies')?.addEventListener('click', exportPoliciesCSV);
    document.getElementById('btnCoverageGap')?.addEventListener('click', showCoverageGap);

    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    drawerBackdrop?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=> tab.addEventListener('click', ()=> renderDrawerTab(tab.dataset.tab)));

    // Policy modal
    document.getElementById('btnClosePolicyModal')?.addEventListener('click', closePolicyModal);
    document.getElementById('btnCancelPolicy')?.addEventListener('click', closePolicyModal);
    document.getElementById('policyModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='policyModalBackdrop') closePolicyModal(); });
    document.getElementById('btnSavePolicy')?.addEventListener('click', savePolicy);

    // Claim modal
    document.getElementById('btnCloseClaimModal')?.addEventListener('click', closeClaimModal);
    document.getElementById('btnCancelClaim')?.addEventListener('click', closeClaimModal);
    document.getElementById('claimModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='claimModalBackdrop') closeClaimModal(); });
    document.getElementById('btnSaveClaim')?.addEventListener('click', saveClaim);

    // Drawer actions
    document.getElementById('btnDrawerLogClaim')?.addEventListener('click', ()=>{ if(selectedPolicyId) openClaimModal(selectedPolicyId); });
    document.getElementById('btnRenewPolicy')?.addEventListener('click', ()=>{
      if(!selectedPolicyId) return;
      const st=getState();
      const pol=(st.insurancePolicies||[]).find(p=>p.id===selectedPolicyId);
      if(!pol) return;
      const newExpiry = new Date(pol.expiryDate); newExpiry.setFullYear(newExpiry.getFullYear()+1);
      const newRenewal = new Date(newExpiry); newRenewal.setDate(newRenewal.getDate()-30);
      pol.startDate = pol.expiryDate;
      pol.expiryDate = newExpiry.toISOString().slice(0,10);
      pol.renewalDate = newRenewal.toISOString().slice(0,10);
      pol.status='Active';
      save();
      renderAll();
      if(window.toast) toast('Policy renewed for 1 year','success');
      closeDrawer();
    });

    document.getElementById('btnViewDoc')?.addEventListener('click', ()=>{ if(window.toast) toast('Opening policy PDF from DMS...','info'); });
    document.getElementById('btnRiskChecklist')?.addEventListener('click', ()=>{ document.querySelector('[data-tab=risk]')?.click(); });

    // Coverage modal
    document.getElementById('btnCloseCoverageModal')?.addEventListener('click', ()=> document.getElementById('coverageModalBackdrop')?.classList.remove('open'));
    document.getElementById('btnCancelCoverage')?.addEventListener('click', ()=> document.getElementById('coverageModalBackdrop')?.classList.remove('open'));
    document.getElementById('coverageModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='coverageModalBackdrop') e.currentTarget.classList.remove('open'); });
    document.getElementById('btnExportCoverage')?.addEventListener('click', ()=>{ if(window.toast) toast('Coverage gap analysis exported','success'); });

    // Context menu
    document.addEventListener('click', ()=>{ if(ctxMenu) ctxMenu.classList.remove('open'); });
    if (ctxMenu) {
      ctxMenu.addEventListener('click', e=>{
        const item = e.target.closest('.ctx-item');
        if(!item) return;
        const action = item.dataset.action;
        const id = ctxMenu.dataset.id;
        const type = ctxMenu.dataset.type;
        ctxMenu.classList.remove('open');
        if (type==='policy') {
          if(action==='open') openDrawer(id);
          if(action==='edit') openPolicyModal(id);
          if(action==='claim') openClaimModal(id);
          if(action==='renew') { selectedPolicyId=id; document.getElementById('btnRenewPolicy')?.click(); }
          if(action==='delete') deletePolicy(id);
        } else {
          if(action==='viewClaim') openClaim(id);
          if(action==='editClaim') { editingClaimId=id; const st=getState(); const c=(st.insuranceClaims||[]).find(x=>x.id===id); if(c){ openClaimModal(c.policyId); setTimeout(()=>{ document.getElementById('cProperty').value=c.propertyId||''; document.getElementById('cIncident').value=c.incidentDate||''; document.getElementById('cNumber').value=c.claimNumber||''; document.getElementById('cDescription').value=c.description||''; document.getElementById('cAmount').value=c.amountClaimed||''; document.getElementById('cStatus').value=c.status||'Pending'; editingClaimId=id; }, 100); } }
          if(action==='settle') updateClaimStatus(id,'Settled');
          if(action==='deleteClaim') deleteClaim(id);
        }
      });
    }

    document.addEventListener('keydown', e=>{
      if(e.key==='Escape'){ closeDrawer(); closePolicyModal(); closeClaimModal(); document.getElementById('coverageModalBackdrop')?.classList.remove('open'); }
    });
  }

  // Expose
  window.openDrawer = openDrawer;
  window.openClaim = openClaim;
  window.openContext = openContext;
  window.openClaimModal = openClaimModal;
  window.updateClaimStatus = updateClaimStatus;

  populateFilters();
  bindEvents();
  renderAll();

  console.log('[Operations Insurance] ToR 8.8 module loaded -', (getState().insurancePolicies||[]).length, 'policies,', (getState().insuranceClaims||[]).length, 'claims');
});

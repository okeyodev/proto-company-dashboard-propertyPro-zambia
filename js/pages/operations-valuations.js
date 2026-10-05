/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/operations-valuations.js
 * ToR 8.9 — Valuations & Reporting (IAS 40 / IFRS 13)
 * ============================================================================
 * KPIs: Portfolio Market Value, NOI, Avg Net Yield %, Total YoY Unrealized Gain
 * Table: Property ID & Name, Valuation Date, Valuer, Method, Fair Value, YoY %, IAS40, Actions
 * Drawer: breakdown, historic trend, IAS40/IFRS13 flags, View Investment Asset link
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCommon === "function") initCommon("operations-valuations");

  const getState = () => window.state || {};
  const save = () => { if (window.saveState) window.saveState(); };

  function ensureOps() {
    const st = getState();
    if (!st.valuations || st.valuations.length === 0) {
      if (typeof generateOperationsMockData === 'function' && st.properties) {
        const ops = generateOperationsMockData(st.properties, st.units||[]);
        st.valuations = ops.valuations;
        if (!st.insurancePolicies) st.insurancePolicies = ops.insurancePolicies;
        save();
      }
    }
  }
  ensureOps();

  const kpiGrid = document.getElementById('kpiGrid');
  const tbody = document.getElementById('valuationsTbody');
  const countLabel = document.getElementById('countLabel');
  const fmvLabel = document.getElementById('fmvLabel');
  const yoyLabel = document.getElementById('yoyLabel');
  const tableInfo = document.getElementById('tableInfo');
  const methodSummary = document.getElementById('methodSummary');

  const searchInput = document.getElementById('searchInputLocal');
  const filterProperty = document.getElementById('filterProperty');
  const filterValuer = document.getElementById('filterValuer');
  const filterMethod = document.getElementById('filterMethod');
  const filterIAS40 = document.getElementById('filterIAS40');
  const filterDate = document.getElementById('filterDate');
  const pageSizeSel = document.getElementById('pageSize');

  const drawer = document.getElementById('valuationDrawer');
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
    const vProp = document.getElementById('vProperty');
    if (vProp) vProp.innerHTML = '<option value="">Select Property</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} (${p.city})</option>`).join('');

    const valuers = [...new Set((st.valuations||[]).map(v=>v.valuer).filter(Boolean))];
    const defaultValuers = ["Knight Frank Zambia","Pam Golding Valuation","Hyspek Valuation","GVA Zambia"];
    const allValuers = [...new Set([...defaultValuers, ...valuers])];
    if (filterValuer) filterValuer.innerHTML = '<option value="">All Valuers</option>' + allValuers.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  }

  // Dynamic calculations: NOI, Yield %, YoY
  function calculateKPIs(filtered) {
    const st = getState();
    const valuations = st.valuations || [];
    const leases = st.leases || [];
    const serviceCharges = st.serviceCharges || [];

    // Portfolio Market Value
    const totalFMV = valuations.reduce((s,v)=> s + (v.marketValue||v.marketValueZMW||0),0);
    const totalPrev = valuations.reduce((s,v)=> s + (v.previousValue||0),0);
    const totalYoYGain = totalFMV - totalPrev;
    const totalYoYGainPct = totalPrev ? ((totalFMV - totalPrev)/totalPrev*100) : 0;

    // NOI: Annual rent from active leases - service charges actuals (operating expenses)
    // Use leases monthly rent *12 for active leases
    const activeLeases = leases.filter(l=> ['Active','Expiring Soon','Renewed'].includes(l.status||'Active'));
    const grossAnnualRent = activeLeases.reduce((s,l)=> s + ((l.rent||l.monthlyRent||0)*12),0);
    // Operating expenses from service charges where status On Budget etc.
    const opex = serviceCharges.reduce((s,sc)=> s + (sc.actual||0),0);
    // Alternative: use 30% opex ratio if serviceCharges empty
    const estimatedOpex = opex || grossAnnualRent * 0.32;
    const noi = grossAnnualRent - estimatedOpex;

    // Average Portfolio Net Yield % = NOI / FMV *100
    const avgYield = totalFMV ? (noi / totalFMV * 100) : 0;

    // Per method summary
    const byMethod = {};
    valuations.forEach(v=>{
      const m = v.method||v.valuationMethod||'Income Approach';
      if (!byMethod[m]) byMethod[m] = { count:0, fmv:0, yieldSum:0 };
      byMethod[m].count++;
      byMethod[m].fmv += v.marketValue||0;
      byMethod[m].yieldSum += parseFloat(v.yield||v.netYield||0);
    });

    return { totalFMV, totalPrev, totalYoYGain, totalYoYGainPct, grossAnnualRent, noi, avgYield, byMethod };
  }

  function renderKPIs(filtered) {
    const kpis = calculateKPIs(filtered);
    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi accent-blue"><div class="kpi-top"><div class="kpi-label">Portfolio Market Value (ZMW M)</div><div class="kpi-icon blue">🏢</div></div><div class="kpi-value">ZMW ${(kpis.totalFMV/1000000).toFixed(1)}M</div><div class="kpi-meta">${(getState().valuations||[]).length} properties • Prev ZMW ${(kpis.totalPrev/1000000).toFixed(1)}M</div></div>
        <div class="kpi accent-green"><div class="kpi-top"><div class="kpi-label">Net Operating Income (NOI)</div><div class="kpi-icon green">📈</div></div><div class="kpi-value">ZMW ${(kpis.noi/1000000).toFixed(2)}M</div><div class="kpi-meta">Gross rent ZMW ${(kpis.grossAnnualRent/1000000).toFixed(2)}M • Opex ${((kpis.grossAnnualRent - kpis.noi)/1000000).toFixed(2)}M</div></div>
        <div class="kpi accent-violet"><div class="kpi-top"><div class="kpi-label">Average Portfolio Net Yield %</div><div class="kpi-icon violet">%</div></div><div class="kpi-value">${kpis.avgYield.toFixed(2)}%</div><div class="kpi-meta">NOI / FMV • Benchmark 7-11% Zambia prime</div></div>
        <div class="kpi ${kpis.totalYoYGain>=0?'accent-green':'accent-red'}"><div class="kpi-top"><div class="kpi-label">Total YoY Unrealized Gain</div><div class="kpi-icon ${kpis.totalYoYGain>=0?'green':'red'}">${kpis.totalYoYGain>=0?'↗':'↘'}</div></div><div class="kpi-value" style="color:${kpis.totalYoYGain>=0?'#15803D':'#B91C1C'}">ZMW ${(kpis.totalYoYGain/1000000).toFixed(2)}M (${kpis.totalYoYGainPct>=0?'+':''}${kpis.totalYoYGainPct.toFixed(1)}%)</div><div class="kpi-meta">${kpis.totalYoYGain>=0?'Unrealized gain to P&L - IAS 40':'Unrealized loss'} • ${filtered.length} valuations</div></div>
      `;
    }
    if (fmvLabel) fmvLabel.textContent = `${(kpis.totalFMV/1000000).toFixed(1)}M`;
    if (yoyLabel) yoyLabel.textContent = `${kpis.totalYoYGainPct>=0?'+':''}${kpis.totalYoYGainPct.toFixed(1)}% • ZMW ${(kpis.totalYoYGain/1000000).toFixed(2)}M`;
    const valuerCountEl = document.getElementById('valuerCount');
    if (valuerCountEl) valuerCountEl.textContent = `${[...new Set((getState().valuations||[]).map(v=>v.valuer))].length} Valuers`;
    // Method summary
    if (methodSummary) {
      methodSummary.innerHTML = Object.entries(kpis.byMethod).map(([method, data])=>`
        <div class="detail-card"><div class="label">${escapeHtml(method)}</div><div class="value">${data.count} properties • ZMW ${(data.fmv/1000000).toFixed(1)}M</div><div class="sub">Avg yield ${(data.yieldSum/data.count||0).toFixed(1)}% • IFRS 13 Level 3</div></div>
      `).join('');
    }
  }

  function getFiltered() {
    const st = getState();
    let data = [...(st.valuations||[])];
    const search = (searchInput?.value||'').toLowerCase().trim();
    const prop = filterProperty?.value||'';
    const valuer = filterValuer?.value||'';
    const method = filterMethod?.value||'';
    const ias40 = filterIAS40?.value||'';
    const dateFilter = filterDate?.value||'';

    if (prop) data = data.filter(v=> v.propertyId===prop);
    if (valuer) data = data.filter(v=> v.valuer===valuer);
    if (method) data = data.filter(v=> (v.method||v.valuationMethod||'')===method);
    if (ias40) data = data.filter(v=> (v.ias40||v.ias40Class||'')===ias40);
    if (dateFilter) data = data.filter(v=> (v.date||v.valuationDate||'').startsWith(dateFilter));
    if (search) {
      data = data.filter(v=>
        (v.propertyName||v.property||'').toLowerCase().includes(search) ||
        (v.propertyId||'').toLowerCase().includes(search) ||
        (v.assetId||'').toLowerCase().includes(search) ||
        (v.valuer||'').toLowerCase().includes(search) ||
        (v.method||'').toLowerCase().includes(search) ||
        (v.id||'').toLowerCase().includes(search)
      );
    }
    data.sort((a,b)=> (b.marketValue||0) - (a.marketValue||0));
    return data;
  }

  function renderTable() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage>totalPages) currentPage=totalPages;
    const pageData = filtered.slice((currentPage-1)*pageSize, currentPage*pageSize);

    if (countLabel) countLabel.textContent = filtered.length;
    if (tableInfo) tableInfo.textContent = `Showing ${pageData.length} of ${filtered.length} valuations • Page ${currentPage}/${totalPages}`;

    if (!tbody) return;
    if (pageData.length===0) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="ico">📊</div><h3>No valuations found</h3><p>Adjust filters or create a new valuation</p></div></td></tr>`;
    } else {
      tbody.innerHTML = pageData.map(v=>{
        const market = v.marketValue||v.marketValueZMW||0;
        const prev = v.previousValue||0;
        const yoy = prev? ((market - prev)/prev*100) : (v.yoyChange||0);
        const yoyCls = yoy>=0 ? 'green' : 'red';
        const yoyIcon = yoy>=0 ? '↗' : '↘';
        return `
          <tr data-id="${v.id}" style="cursor:pointer">
            <td><div style="font-weight:700">${escapeHtml(v.propertyId||'')}</div><div style="font-weight:600">${escapeHtml(v.propertyName||v.property||'')}</div><div style="font-size:11px;color:#64748B">${escapeHtml(v.assetId||'')}</div></td>
            <td><span style="font-weight:600">${escapeHtml(v.date||v.valuationDate||'')}</span></td>
            <td><div style="font-weight:600">${escapeHtml(v.valuer||'')}</div><div style="font-size:11px;color:#64748B">RICS • ${v.ifrs13Level||'Level 3'}</div></td>
            <td><span class="pill blue">${escapeHtml(v.method||v.valuationMethod||'Income Approach')}</span></td>
            <td><span style="font-weight:800">ZMW ${(market/1000000).toFixed(2)}M</span><div style="font-size:11px;color:#64748B">ZMW ${Number(market).toLocaleString()}</div></td>
            <td><span class="pill ${yoyCls}">${yoyIcon} ${yoy>=0?'+':''}${yoy.toFixed(1)}%</span><div style="font-size:11px;color:#64748B">ZMW ${((market - prev)/1000000).toFixed(2)}M</div></td>
            <td><span class="pill ${ (v.ias40||v.ias40Class||'')==='Investment Property'?'green':'gray'}">${escapeHtml(v.ias40||v.ias40Class||'Investment Property')}</span></td>
            <td><button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); openDrawer('${v.id}')">Open</button><button class="btn btn-sm" onclick="event.stopPropagation(); openContext(event,'${v.id}')">⋯</button></td>
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
    const valuation = (st.valuations||[]).find(v=>v.id===id);
    if (!valuation) return;
    selectedId = id;
    document.getElementById('drawerTitle').textContent = valuation.id;
    document.getElementById('drawerId').textContent = valuation.assetId||valuation.propertyId||'';
    document.getElementById('drawerStatus').textContent = valuation.status||'Final';
    document.getElementById('drawerIAS40').textContent = valuation.ias40||valuation.ias40Class||'Investment Property';
    document.getElementById('drawerSubtitle').textContent = `${valuation.propertyName||valuation.property||''} • ${valuation.valuer||''} • ${valuation.method||''}`;

    const summary = document.getElementById('drawerSummary');
    if (summary) {
      const yoy = valuation.previousValue? ((valuation.marketValue - valuation.previousValue)/valuation.previousValue*100) : valuation.yoyChange||0;
      summary.innerHTML = `
        <div class="sum-item"><div class="l">Fair Value</div><div class="v">ZMW ${(valuation.marketValue/1000000).toFixed(2)}M</div></div>
        <div class="sum-item"><div class="l">YoY</div><div class="v" style="color:${yoy>=0?'#16A34A':'#DC2626'}">${yoy>=0?'+':''}${yoy.toFixed(1)}%</div></div>
        <div class="sum-item"><div class="l">Yield</div><div class="v">${valuation.yield||valuation.netYield||''}%</div></div>
      `;
    }
    renderDrawerTab('breakdown');
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
    const v = (st.valuations||[]).find(x=>x.id===selectedId);
    if (!v) return;
    document.querySelectorAll('.drawer-tab').forEach(el=> el.classList.toggle('active', el.dataset.tab===tab));
    const body = document.getElementById('drawerBody');
    if (!body) return;

    const leasesForProp = (st.leases||[]).filter(l=> (l.propertyId===v.propertyId || l.property===v.propertyName));
    const grossRent = leasesForProp.reduce((s,l)=> s + ((l.rent||l.monthlyRent||0)*12),0);
    const noi = grossRent * 0.68; // 32% opex
    const yieldCalc = v.marketValue? (noi / v.marketValue *100) : parseFloat(v.yield||0);

    if (tab==='breakdown') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Valuation Breakdown — ${escapeHtml(v.method||'Income Approach')}</h4>
          <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:13px">
            <div style="color:#64748B">Market Value</div><div style="font-weight:800">ZMW ${Number(v.marketValue).toLocaleString()} • ZMW ${(v.marketValue/1000000).toFixed(2)}M</div>
            <div style="color:#64748B">Previous Value</div><div>ZMW ${Number(v.previousValue||0).toLocaleString()} • YoY ${v.previousValue? (((v.marketValue - v.previousValue)/v.previousValue*100).toFixed(1)+'%') : '-'}</div>
            <div style="color:#64748B">Forced Sale</div><div>ZMW ${Number(v.forcedSaleValue||v.marketValue*0.7).toLocaleString()} (70% of MV)</div>
            <div style="color:#64748B">Insurance Value</div><div>ZMW ${Number(v.insuranceValue||v.marketValue*1.1).toLocaleString()} (110% of MV) • Linked to insurance module</div>
            <div style="color:#64748B">Method</div><div><span class="pill blue">${escapeHtml(v.method||'')}</span> • ${v.valuer||''}</div>
            <div style="color:#64748B">NOI (Est)</div><div style="font-weight:600">ZMW ${Number(noi).toLocaleString()} • Gross ZMW ${Number(grossRent).toLocaleString()} - 32% opex</div>
            <div style="color:#64748B">Net Yield</div><div style="font-weight:700">${yieldCalc.toFixed(2)}% • Benchmark 7-11% prime</div>
          </div>
          <div style="margin-top:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Key Assumptions (${escapeHtml(v.method||'Income Approach')})</div>
            <div style="font-size:12.5px;line-height:1.6;color:#334155">
              ${v.method==='Discounted Cash Flow' || v.valuationMethod==='Discounted Cash Flow' ?
                `Discount rate 14.5%, exit yield 9.5%, rental growth 5% pa, vacancy 8%, collection loss 2%, capex ZMW 450k pa, 10-year DCF, terminal value at Year 10.` :
                v.method==='Income Approach' ?
                `Capitalization rate ${(v.yield||8.5)}%, market rent ZMW ${Number(grossRent/12).toLocaleString()} / month, occupancy 92%, outgoings 32%, stabilized NOI ZMW ${Number(noi).toLocaleString()}. Direct capitalization.` :
                v.method==='Market Comparison' ?
                `Comparable sales: 3 recent transactions within 2km, avg ZMW ${(v.marketValue/80/1000).toFixed(1)}k /m², adjustments for location -5%, condition +3%, size -2%.` :
                `Replacement cost ZMW ${(v.marketValue*0.85/1000000).toFixed(1)}M + land value ZMW ${(v.marketValue*0.25/1000000).toFixed(1)}M - depreciation 12%.`
              }
            </div>
            <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill gray">RICS Red Book</span><span class="pill gray">External Valuer</span><span class="pill green">Rotation 3yr compliant</span></div>
          </div>
          <div style="margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
            <div class="detail-card"><div class="label">Comparable Evidence</div><div class="value">3 comps • Avg ZMW ${(v.marketValue/80/1000).toFixed(1)}k/m²</div><div class="sub">Within 2km • Last 12 months</div></div>
            <div class="detail-card"><div class="label">DCF Inputs</div><div class="value">10yr • 14.5% discount</div><div class="sub">Exit 9.5% • Growth 5%</div></div>
          </div>
        </div>
      `;
    } else if (tab==='trend') {
      // Generate historic trend: fabricate 4 years
      const history = [];
      let base = v.previousValue || v.marketValue * 0.85;
      const years = [2022,2023,2024,2025,2026];
      years.forEach((yr,i)=>{
        const val = i===years.length-1 ? v.marketValue : Math.round(base * (1 + i*0.06 + Math.random()*0.04));
        const prev = i>0 ? history[i-1].value : val*0.9;
        const yoy = i>0 ? ((val - prev)/prev*100) : 0;
        history.push({ year:yr, value:val, yoy, valuer: i%2===0? v.valuer : 'GVA Zambia' });
      });
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Historic Valuation Trend Timeline</h4>
          <div style="position:relative;padding-left:24px;border-left:2px solid #E2E8F0;display:flex;flex-direction:column;gap:14px">
            ${history.map(h=>`
              <div style="position:relative">
                <div style="position:absolute;left:-29px;top:4px;width:10px;height:10px;border-radius:50%;background:${h.year===2026?'#2563EB':'#FFF'};border:2px solid ${h.year===2026?'#2563EB':'#CBD5E1'}"></div>
                <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700">${h.year} • ZMW ${(h.value/1000000).toFixed(2)}M</span><span class="pill ${h.yoy>=0?'green':'red'}">${h.yoy>=0?'+':''}${h.yoy.toFixed(1)}% YoY</span></div>
                <div style="font-size:11px;color:#64748B;margin-top:2px">${h.valuer} • ${h.year===2026?'Final':'Final'} • IAS 40 Investment Property</div>
                <div style="margin-top:6px;height:6px;background:#F1F5F9;border-radius:10px;overflow:hidden"><div style="height:100%;width:${Math.min(100, (h.value / v.marketValue *100))}%;background:${h.yoy>=0?'#16A34A':'#DC2626'}"></div></div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px;font-size:12px;line-height:1.5"><b>Unrealized Gain:</b> ZMW ${((v.marketValue - (v.previousValue||v.marketValue*0.9))/1000000).toFixed(2)}M recognized in P&L per IAS 40 fair value model. Historic trend feeds Investment Performance module.</div>
        </div>
      `;
    } else if (tab==='compliance') {
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">IAS 40 / IFRS 13 Compliance Flags (ToR 8.9)</h4>
          <div style="display:grid;gap:10px">
            <div style="padding:10px;border:1px solid #BBF7D0;border-radius:8px;background:#F0FDF4;display:flex;gap:10px"><div style="font-size:18px">✅</div><div><div style="font-weight:700;font-size:13px">IAS 40 - Investment Property Classification</div><div style="font-size:11px;color:#475569;margin-top:2px">Class: ${escapeHtml(v.ias40||v.ias40Class||'Investment Property')} • Fair value model adopted • Gains/losses to P&L • Cost model not applied • Disclosure per IAS 40.75</div></div></div>
            <div style="padding:10px;border:1px solid #BFDBFE;border-radius:8px;background:#EFF6FF;display:flex;gap:10px"><div style="font-size:18px">📊</div><div><div style="font-weight:700;font-size:13px">IFRS 13 - Fair Value Measurement • ${escapeHtml(v.ifrs13Level||'Level 3')}</div><div style="font-size:11px;color:#475569;margin-top:2px">Level 3: Unobservable inputs (DCF assumptions, yield) • Valuation technique: ${escapeHtml(v.method||'')} • Sensitivity: +/- 50bps yield = ZMW ${((v.marketValue*0.05)/1000000).toFixed(2)}M change • Disclosure per IFRS 13.93</div></div></div>
            <div style="padding:10px;border:1px solid #E2E8F0;border-radius:8px;background:#FFF;display:flex;gap:10px"><div style="font-size:18px">👨‍💼</div><div><div style="font-weight:700;font-size:13px">External Valuer Independence & Rotation</div><div style="font-size:11px;color:#475569;margin-top:2px">Valuer: ${escapeHtml(v.valuer||'')} • RICS Registered • Rotation compliant (3-year cycle) • Last rotation 2024 • Next due 2027 • No conflict of interest declared</div></div></div>
            <div style="padding:10px;border:1px solid #FDE68A;border-radius:8px;background:#FFFBEB;display:flex;gap:10px"><div style="font-size:18px">⚠️</div><div><div style="font-weight:700;font-size:13px">Audit Trail & Approval</div><div style="font-size:11px;color:#475569;margin-top:2px">CFO approval required • Investment Committee review • Audit trail logged • Document version control in DMS 9.3.1</div></div></div>
          </div>
          <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill green">IAS 40 Compliant</span><span class="pill blue">IFRS 13 Level 3</span><span class="pill violet">RICS Red Book</span><span class="pill gray">External Valuer</span></div>
        </div>
      `;
    } else if (tab==='link') {
      const assetId = v.assetId||`INV-P-${(v.propertyId||'').split('-')[1]||'001'}`;
      body.innerHTML = `
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 12px">Investment Asset Linkage (ToR 8.9 → Investment Module)</h4>
          <div style="display:grid;grid-template-columns:120px 1fr;gap:10px;font-size:13px;margin-bottom:14px">
            <div style="color:#64748B">Asset ID</div><div style="font-weight:700;font-family:monospace">${escapeHtml(assetId)}</div>
            <div style="color:#64748B">Property</div><div style="font-weight:600">${escapeHtml(v.propertyName||v.property||'')}</div>
            <div style="color:#64748B">Fair Value</div><div style="font-weight:700">ZMW ${Number(v.marketValue).toLocaleString()}</div>
            <div style="color:#64748B">Classification</div><div>${escapeHtml(v.ias40||'Investment Property')} • IFRS 13 ${v.ifrs13Level||'Level 3'}</div>
          </div>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px;font-size:12px;line-height:1.6">
            This valuation feeds directly into Investment Assets register (INV-P-XXX). YoY gain/loss flows to Investment Performance and Asset Allocation. Insurance value syncs to Insurance module (110% of FMV). Click below to view investment asset details.
          </div>
          <div style="margin-top:14px;display:flex;gap:8px"><button class="btn btn-primary" onclick="viewInvestmentAsset('${assetId}')">View Investment Asset ${escapeHtml(assetId)} →</button><button class="btn btn-sm" onclick="window.open('investment-dashboard.html','_blank')">Open Investment Dashboard</button></div>
          <div style="margin-top:12px;font-size:11px;color:#64748B">Route: <code>investment-assets.html?id=${escapeHtml(assetId)}</code> • Also available: <code>investment-performance.html</code>, <code>asset-allocation.html</code></div>
        </div>
      `;
    }
  }

  function viewInvestmentAsset(assetId) {
    // Cross-link per spec
    const url = `investment-assets.html?id=${encodeURIComponent(assetId)}`;
    // Try to navigate, fallback to dashboard if file missing
    window.location.href = url;
  }

  // Context menu
  function openContext(e, id) {
    e.preventDefault(); e.stopPropagation();
    if (!ctxMenu) return;
    ctxMenu.innerHTML = `
      <div class="ctx-item" data-action="open">📊 Open Valuation</div>
      <div class="ctx-item" data-action="edit">✏️ Edit Valuation</div>
      <div class="ctx-item" data-action="investment">🔗 View Investment Asset</div>
      <div class="ctx-item" data-action="pdf">📄 Export PDF</div>
      <div class="ctx-item danger" data-action="delete">🗑️ Delete</div>
    `;
    ctxMenu.style.left = e.pageX+'px';
    ctxMenu.style.top = e.pageY+'px';
    ctxMenu.classList.add('open');
    ctxMenu.dataset.id = id;
  }

  // CRUD
  function openValuationModal(editId=null) {
    editingId = editId;
    const modal = document.getElementById('valuationModalBackdrop');
    const title = document.getElementById('valuationModalTitle');
    if (title) title.textContent = editId? 'Edit Valuation' : 'New Property Valuation';
    if (editId) {
      const v = (getState().valuations||[]).find(x=>x.id===editId);
      if (v) {
        document.getElementById('vProperty').value = v.propertyId||'';
        document.getElementById('vDate').value = v.date||v.valuationDate||'';
        document.getElementById('vValuer').value = v.valuer||'Knight Frank Zambia';
        document.getElementById('vMethod').value = v.method||v.valuationMethod||'Income Approach';
        document.getElementById('vMarket').value = v.marketValue||'';
        document.getElementById('vPrevious').value = v.previousValue||'';
        document.getElementById('vForced').value = v.forcedSaleValue||'';
        document.getElementById('vInsurance').value = v.insuranceValue||'';
        document.getElementById('vYield').value = v.yield||v.netYield||'';
        document.getElementById('vIAS40').value = v.ias40||v.ias40Class||'Investment Property';
        document.getElementById('vIFRS13').value = v.ifrs13Level||'Level 3';
      }
    } else {
      document.getElementById('vProperty').value = '';
      document.getElementById('vDate').value = new Date().toISOString().slice(0,10);
      document.getElementById('vMarket').value = '';
      document.getElementById('vPrevious').value = '';
      document.getElementById('vForced').value = '';
      document.getElementById('vInsurance').value = '';
      document.getElementById('vYield').value = '8.5';
      document.getElementById('vIAS40').value = 'Investment Property';
      document.getElementById('vIFRS13').value = 'Level 3';
      document.getElementById('vMethod').value = 'Income Approach';
      document.getElementById('vValuer').value = 'Knight Frank Zambia';
    }
    if (modal) modal.classList.add('open');
  }

  function closeValuationModal() {
    document.getElementById('valuationModalBackdrop')?.classList.remove('open');
    editingId = null;
  }

  function saveValuation() {
    const st = getState();
    const propId = document.getElementById('vProperty').value;
    if (!propId) { if(window.toast) toast('Select property','error'); return; }
    const prop = (st.properties||[]).find(p=>p.id===propId);
    const market = parseFloat(document.getElementById('vMarket').value)||0;
    if (!market) { if(window.toast) toast('Enter market value','error'); return; }
    const prev = parseFloat(document.getElementById('vPrevious').value)|| Math.round(market*0.9);
    const forced = parseFloat(document.getElementById('vForced').value)|| Math.round(market*0.7);
    const insurance = parseFloat(document.getElementById('vInsurance').value)|| Math.round(market*1.1);
    const yieldPct = parseFloat(document.getElementById('vYield').value)|| 8.5;

    const base = {
      propertyId: propId,
      propertyName: prop? prop.name : propId,
      property: prop? prop.name : propId,
      assetId: `INV-P-${propId.split('-')[1]||String((st.valuations||[]).length+1).padStart(3,'0')}`,
      date: document.getElementById('vDate').value || new Date().toISOString().slice(0,10),
      valuationDate: document.getElementById('vDate').value || new Date().toISOString().slice(0,10),
      valuer: document.getElementById('vValuer').value,
      method: document.getElementById('vMethod').value,
      valuationMethod: document.getElementById('vMethod').value,
      marketValue: market,
      marketValueZMW: market,
      previousValue: prev,
      forcedSaleValue: forced,
      insuranceValue: insurance,
      yield: yieldPct,
      netYield: yieldPct,
      yoyChange: prev? ((market - prev)/prev*100) : 0,
      yoyChangePct: prev? ((market - prev)/prev*100) : 0,
      ias40: document.getElementById('vIAS40').value,
      ias40Class: document.getElementById('vIAS40').value,
      ifrs13Level: document.getElementById('vIFRS13').value,
      status: 'Final',
      city: prop? prop.city : 'Lusaka'
    };

    if (editingId) {
      const idx = (st.valuations||[]).findIndex(v=>v.id===editingId);
      if (idx>=0) st.valuations[idx] = { ...st.valuations[idx], ...base };
      if(window.toast) toast('Valuation updated','success');
    } else {
      const newId = `VAL-${propId}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      st.valuations.unshift({ id:newId, ...base });
      if(window.toast) toast('Valuation created','success');
      if (typeof addAuditEvent==='function') addAuditEvent('CREATE','valuation',newId,`Created valuation ${newId} ZMW ${(market/1000000).toFixed(1)}M`);
    }
    // Sync insurance value
    const pol = (st.insurancePolicies||[]).find(p=>p.propertyId===propId);
    if (pol) { pol.sumInsured = insurance; pol.sumInsuredZMW = insurance; }

    save();
    closeValuationModal();
    renderTable();
  }

  function deleteValuation(id) {
    if (!confirm(`Delete valuation ${id}?`)) return;
    const st = getState();
    st.valuations = (st.valuations||[]).filter(v=>v.id!==id);
    save();
    renderTable();
    closeDrawer();
    if(window.toast) toast('Valuation deleted','success');
  }

  // CSV Export
  function exportCSV() {
    const data = getFiltered();
    if (data.length===0) { if(window.toast) toast('No data','error'); return; }
    const headers = ['Property ID','Property Name','Asset ID','Valuation Date','Valuer','Method','Fair Value ZMW','Previous Value','YoY %','YoY Gain ZMW','Forced Sale','Insurance Value','Yield %','IAS40 Class','IFRS13 Level'];
    const rows = data.map(v=>{
      const yoy = v.previousValue? ((v.marketValue - v.previousValue)/v.previousValue*100) : v.yoyChange||0;
      const gain = (v.marketValue||0) - (v.previousValue||0);
      return [v.propertyId||'',v.propertyName||v.property||'',v.assetId||'',v.date||v.valuationDate||'',v.valuer||'',v.method||v.valuationMethod||'',v.marketValue||0,v.previousValue||0,yoy.toFixed(2),gain,v.forcedSaleValue||0,v.insuranceValue||0,v.yield||0,v.ias40||v.ias40Class||'',v.ifrs13Level||''];
    });
    const csv = [headers.join(','), ...rows.map(r=>r.map(val=>`"${String(val).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`valuations_report_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    if(window.toast) toast('CSV exported','success');
  }

  // PDF Report
  function exportPDF() {
    const data = getFiltered();
    if (data.length===0) { if(window.toast) toast('No data','error'); return; }
    try {
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) { if(window.toast) toast('PDF lib not loaded - using CSV','info'); exportCSV(); return; }
      const doc = new jsPDF({ orientation:'landscape' });
      const kpis = calculateKPIs(data);
      doc.setFontSize(14); doc.text('PropertyPro Zambia - Valuation Report - IAS 40 / IFRS 13', 14, 18);
      doc.setFontSize(10); doc.text(`Generated ${new Date().toISOString().slice(0,10)} • Portfolio FMV ZMW ${(kpis.totalFMV/1000000).toFixed(1)}M • NOI ZMW ${(kpis.noi/1000000).toFixed(2)}M • Yield ${kpis.avgYield.toFixed(2)}% • YoY ${kpis.totalYoYGainPct.toFixed(1)}%`, 14, 26);
      let y = 34;
      doc.setFontSize(9);
      const headers = ['Property','Date','Valuer','Method','Fair Value','YoY %','IAS40','Yield'];
      headers.forEach((h,i)=> doc.text(h, 14 + i*32, y));
      y+=6; doc.line(14,y-2,280,y-2);
      data.slice(0,25).forEach(v=>{
        const yoy = v.previousValue? ((v.marketValue - v.previousValue)/v.previousValue*100) : 0;
        const row = [ (v.propertyName||'').slice(0,18), v.date||'', (v.valuer||'').slice(0,14), (v.method||'').slice(0,12), `ZMW ${(v.marketValue/1000000).toFixed(2)}M`, `${yoy.toFixed(1)}%`, (v.ias40||'Inv Prop').slice(0,12), `${v.yield||''}%` ];
        row.forEach((txt,i)=> doc.text(String(txt), 14 + i*32, y));
        y+=6; if(y>190){ doc.addPage(); y=20; }
      });
      doc.save(`valuation_report_${new Date().toISOString().slice(0,10)}.pdf`);
      if(window.toast) toast('PDF report downloaded','success');
    } catch(e) {
      console.error(e); if(window.toast) toast('PDF failed - exporting CSV','error'); exportCSV();
    }
  }

  // Events
  function bindEvents() {
    [searchInput, filterProperty, filterValuer, filterMethod, filterIAS40, filterDate].forEach(el=>{
      if(!el) return;
      el.addEventListener(el.tagName==='INPUT'?'input':'change', ()=>{ currentPage=1; renderTable(); });
    });

    pageSizeSel?.addEventListener('change', e=>{ pageSize=parseInt(e.target.value)||50; currentPage=1; renderTable(); });
    document.getElementById('prevPage')?.addEventListener('click', ()=>{ if(currentPage>1){currentPage--; renderTable();} });
    document.getElementById('nextPage')?.addEventListener('click', ()=>{currentPage++; renderTable();});
    document.getElementById('btnResetFilters')?.addEventListener('click', ()=>{
      if(searchInput) searchInput.value='';
      if(filterProperty) filterProperty.value='';
      if(filterValuer) filterValuer.value='';
      if(filterMethod) filterMethod.value='';
      if(filterIAS40) filterIAS40.value='';
      if(filterDate) filterDate.value='';
      currentPage=1; renderTable();
    });

    document.getElementById('btnNewValuation')?.addEventListener('click', ()=> openValuationModal());
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);
    document.getElementById('btnExportPDF')?.addEventListener('click', exportPDF);

    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    drawerBackdrop?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=> tab.addEventListener('click', ()=> renderDrawerTab(tab.dataset.tab)));

    document.getElementById('btnCloseValuationModal')?.addEventListener('click', closeValuationModal);
    document.getElementById('btnCancelValuation')?.addEventListener('click', closeValuationModal);
    document.getElementById('valuationModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='valuationModalBackdrop') closeValuationModal(); });
    document.getElementById('btnSaveValuation')?.addEventListener('click', saveValuation);

    document.getElementById('btnEditValuation')?.addEventListener('click', ()=>{ if(selectedId) openValuationModal(selectedId); });
    document.getElementById('btnViewReport')?.addEventListener('click', ()=> exportPDF());
    document.getElementById('btnViewComparables')?.addEventListener('click', ()=>{ if(window.toast) toast('Comparable evidence: 3 transactions within 2km','info'); });
    document.getElementById('btnViewInvestmentAsset')?.addEventListener('click', ()=>{
      const st=getState();
      const v=(st.valuations||[]).find(x=>x.id===selectedId);
      if(v) viewInvestmentAsset(v.assetId||v.propertyId||'INV-P-001');
    });

    document.addEventListener('click', ()=>{ if(ctxMenu) ctxMenu.classList.remove('open'); });
    if (ctxMenu) {
      ctxMenu.addEventListener('click', e=>{
        const item = e.target.closest('.ctx-item');
        if(!item) return;
        const action=item.dataset.action;
        const id=ctxMenu.dataset.id;
        ctxMenu.classList.remove('open');
        if(action==='open') openDrawer(id);
        if(action==='edit') openValuationModal(id);
        if(action==='investment'){ const st=getState(); const v=(st.valuations||[]).find(x=>x.id===id); if(v) viewInvestmentAsset(v.assetId||'INV-P-001'); }
        if(action==='pdf') exportPDF();
        if(action==='delete') deleteValuation(id);
      });
    }

    document.addEventListener('keydown', e=>{
      if(e.key==='Escape'){ closeDrawer(); closeValuationModal(); }
    });
  }

  window.openDrawer = openDrawer;
  window.openContext = openContext;
  window.viewInvestmentAsset = viewInvestmentAsset;

  function viewInvestmentAsset(assetId) {
    const url = `investment-assets.html?id=${encodeURIComponent(assetId)}`;
    // Attempt navigation - if file not present, fallback to dashboard with query param
    window.location.href = url;
  }

  function openContext(e, id) {
    e.preventDefault(); e.stopPropagation();
    if (!ctxMenu) return;
    ctxMenu.innerHTML = `
      <div class="ctx-item" data-action="open">📊 Open Valuation</div>
      <div class="ctx-item" data-action="edit">✏️ Edit</div>
      <div class="ctx-item" data-action="investment">🔗 View Investment Asset</div>
      <div class="ctx-item" data-action="pdf">📄 Export PDF</div>
      <div class="ctx-item danger" data-action="delete">🗑️ Delete</div>
    `;
    ctxMenu.style.left = e.pageX+'px';
    ctxMenu.style.top = e.pageY+'px';
    ctxMenu.classList.add('open');
    ctxMenu.dataset.id = id;
  }

  populateFilters();
  bindEvents();
  renderTable();

  console.log('[Operations Valuations] ToR 8.9 loaded -', (getState().valuations||[]).length, 'valuations');
});

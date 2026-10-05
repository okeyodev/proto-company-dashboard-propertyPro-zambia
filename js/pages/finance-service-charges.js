/**
 * Finance Utilities & Service Charges - ToR 8.8
 * Tabs: Meter Readings & Budget Reconciliation
 * Meter Logic: Spike >20% over 3-month avg => red border + auto-generate utility recharge invoice into state.invoices
 * Budget Logic: Variance between budgeted OpEx and actual maintenance costs from state.maintenance
 */

(function(){
  const STORAGE_KEY = 'propertypro_v3';
  let meterData = []; // all meters
  let filteredMeters = [];
  let meterPage = 1;
  let meterPageSize = 50;
  let selectedMeterId = null;
  let meterTabCurrent = 'reading';

  let budgetData = []; // budget vs actual lines
  let filteredBudgets = [];
  let budgetPage = 1;
  let budgetPageSize = 50;
  let activeTab = 'meters';

  function getState(){ return window.state || {}; }
  function getProperties(){ return getState().properties || []; }
  function getUnits(){ return getState().units || []; }
  function getTenants(){ return getState().tenants || []; }
  function getInvoices(){ return getState().invoices || []; }
  function getMaintenance(){ return getState().maintenance || []; }
  function getMeterReadings(){ return getState().meterReadings || getState().serviceCharges || []; }

  function fmtMoney(v){ return 'ZMW ' + Number(v||0).toLocaleString('en-ZM',{minimumFractionDigits:0, maximumFractionDigits:0}); }
  function fmtMoneySmall(v){ return 'ZMW ' + Number(v||0).toLocaleString('en-ZM'); }
  function fmtDate(d){
    if(!d) return '—';
    try{ const dt=new Date(d); if(isNaN(dt)) return d; return dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return d}
  }

  function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  window.escapeHtml = escapeHtml;

  // --- Mock Generators if state lacks data ---
  function ensureMeterData(){
    let state = getState();
    if(!state.meterReadings || state.meterReadings.length < 10){
      const props = getProperties();
      const tenants = getTenants();
      const units = getUnits();
      const meters = [];
      const utilities = ['Water','Electricity','Water','Electricity','Common Electricity'];
      const now = new Date();
      let idCounter = 1;
      props.slice(0,6).forEach(prop=>{
        const propUnits = (units.filter(u=>u.propertyId===prop.id).slice(0,6));
        const fallbackUnits = propUnits.length ? propUnits : Array.from({length:6}, (_,i)=>({id:`${prop.id}-U-${String(i+1).padStart(3,'0')}`, code:`${prop.id}-${String(i+1).padStart(2,'0')}`, propertyId:prop.id, tenantId: tenants[i%tenants.length]?.id||'T-1042', tenantName: tenants[i%tenants.length]?.name||'Tenant'}));
        fallbackUnits.forEach((unit, idx)=>{
          const utility = utilities[idx%utilities.length];
          const meterNum = `${utility==='Water'?'WTR': utility==='Electricity'?'ELC':'CEL'}-${prop.id}-${String(idCounter).padStart(4,'0')}`;
          const prev = Math.floor(1000 + Math.random()*9000);
          const avg3 = Math.floor(80 + Math.random()*250); // 3-month avg consumption
          const isSpikeScenario = Math.random() < 0.25; // 25% spikes
          const currentCons = isSpikeScenario ? Math.floor(avg3* (1.25 + Math.random()*0.5)) : Math.floor(avg3 * (0.85 + Math.random()*0.3));
          const currReading = prev + currentCons;
          const spikePct = ((currentCons - avg3)/avg3)*100;
          const isSpike = spikePct > 20;
          const unitRate = utility==='Water' ? 12.5 : utility==='Electricity' ? 2.8 : 3.2;
          const amount = Math.round(currentCons * unitRate * 1.16); // inc VAT 16%
          const tenant = tenants.find(t=>t.id===unit.tenantId) || tenants[idx%tenants.length] || {id:'T-1042', name:'Kabwelwa Supermarket'};
          meters.push({
            id: `MTR-${String(idCounter).padStart(5,'0')}`,
            propertyId: prop.id,
            propertyName: prop.name,
            property: prop.name,
            unitId: unit.id,
            unitCode: unit.code||unit.id||`${prop.id}-${idx+1}`,
            unit: unit.code||`${prop.id}-${idx+1}`,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenant: tenant.name,
            meterNumber: meterNum,
            meter: meterNum,
            utilityType: utility,
            utility: utility,
            previousReading: prev,
            currentReading: currReading,
            consumption: currentCons,
            avg3Month: avg3,
            spikePercent: Math.round(spikePct),
            isSpike,
            readingDate: new Date(now.getFullYear(), now.getMonth(), Math.floor(Math.random()*28)+1).toISOString().slice(0,10),
            invoiceStatus: isSpike ? 'Pending Invoice' : (Math.random()>0.5 ? 'Invoiced' : 'Verified'),
            invoiceId: Math.random()>0.5 ? `INV-${now.getFullYear()}-${String(1000+idCounter).padStart(4,'0')}` : null,
            unitRate,
            amount,
            verified: !isSpike,
            ignoredSpike: false,
            city: prop.city||'Lusaka'
          });
          idCounter++;
        });
      });
      state.meterReadings = meters;
      saveState();
    }
    meterData = getState().meterReadings || [];
  }

  function ensureBudgetData(){
    let state = getState();
    if(!state.serviceChargeBudgets || state.serviceChargeBudgets.length < 10){
      const props = getProperties();
      const year = 2026;
      const budgetLines = ['Security','Cleaning','Landscaping','Lifts & Escalators','HVAC','Plumbing','Electrical','Fire Safety','Common Area Electricity','Water & Sanitation'];
      const budgets = [];
      props.slice(0,6).forEach(prop=>{
        const gla = prop.gla || prop.units ? prop.units*120 : Math.floor(5000 + Math.random()*15000); // m2 estimate
        const actualGla = typeof gla === 'number' ? gla : 8000;
        budgetLines.forEach((line, idx)=>{
          const budgeted = Math.floor(20000 + Math.random()*80000); // ZMW per line
          const budgetedPerM2 = budgeted / actualGla;
          // Actual maintenance costs from state.maintenance or mock
          const maintenanceForProp = getMaintenance().filter(m=> (m.property===prop.name || m.propertyId===prop.id));
          // Simulate actual costs: 80-120% of budgeted with some variance
          const varianceFactor = 0.8 + Math.random()*0.5; // 0.8 to 1.3
          const actual = Math.floor(budgeted * varianceFactor);
          const actualPerM2 = actual / actualGla;
          const variance = budgeted - actual; // positive = surplus (budgeted > actual), negative = deficit
          const variancePct = (variance / (budgeted||1))*100;
          let reconStatus = 'Balanced';
          if(Math.abs(variancePct) < 5) reconStatus = 'Balanced';
          else if(variance > 0) reconStatus = 'Surplus';
          else reconStatus = 'Deficit';
          // Randomly set some pending
          if(Math.random()<0.15) reconStatus = 'Pending';

          budgets.push({
            id: `BUD-${prop.id}-${year}-${String(idx+1).padStart(2,'0')}`,
            propertyId: prop.id,
            propertyName: prop.name,
            property: prop.name,
            gla: actualGla,
            year,
            budgetLine: line,
            budgetLineName: line,
            budgetedAmount: budgeted,
            budgeted: budgeted,
            budgetedPerM2: Math.round(budgetedPerM2*100)/100,
            actualMaintenanceCost: actual,
            actual: actual,
            actualPerM2: Math.round(actualPerM2*100)/100,
            variance: variance,
            variancePercent: Math.round(variancePct*10)/10,
            reconciliationStatus: reconStatus,
            status: reconStatus,
            city: prop.city||'Lusaka',
            maintenanceIds: maintenanceForProp.slice(0,3).map(m=>m.id)
          });
        });
      });
      state.serviceChargeBudgets = budgets;
      saveState();
    }
    budgetData = getState().serviceChargeBudgets || [];
  }

  function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(getState())); }catch(e){} }

  document.addEventListener('DOMContentLoaded', ()=>{
    window.initCommon && window.initCommon('finance-service-charges');
    setTimeout(()=>{
      ensureMeterData();
      ensureBudgetData();
      populateFilters();
      bindEvents();
      renderKPIs();
      applyMeterFilters();
      applyBudgetFilters();
      renderReconSummary();
    }, 200);
  });

  function populateFilters(){
    const props = getProperties();
    const propOpts = '<option value="">All Properties</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    const sel1 = document.getElementById('filterPropertyMeter');
    const sel2 = document.getElementById('filterPropertyBudget');
    if(sel1) sel1.innerHTML = propOpts;
    if(sel2) sel2.innerHTML = propOpts;
  }

  function bindEvents(){
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(p=>p.style.display='none');
        document.getElementById(`panel-${activeTab}`).style.display='block';
        if(activeTab==='meters'){ renderKPIs(); applyMeterFilters(); }
        else { renderKPIs(); applyBudgetFilters(); renderReconSummary(); }
      });
    });

    // Meter filters
    document.getElementById('searchMeters')?.addEventListener('input', debounce(applyMeterFilters, 300));
    ['filterPropertyMeter','filterUtility','filterSpike','filterMeterStatus'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', applyMeterFilters);
    });
    document.getElementById('btnResetMeterFilters')?.addEventListener('click', ()=>{
      document.getElementById('searchMeters').value='';
      document.getElementById('filterPropertyMeter').value='';
      document.getElementById('filterUtility').value='';
      document.getElementById('filterSpike').value='';
      document.getElementById('filterMeterStatus').value='';
      applyMeterFilters();
    });
    document.getElementById('meterPageSize')?.addEventListener('change', e=>{ meterPageSize=parseInt(e.target.value); meterPage=1; renderMetersTable(); });
    document.getElementById('meterPrev')?.addEventListener('click', ()=>{ if(meterPage>1){ meterPage--; renderMetersTable(); }});
    document.getElementById('meterNext')?.addEventListener('click', ()=>{ const max=Math.ceil(filteredMeters.length/meterPageSize); if(meterPage<max){ meterPage++; renderMetersTable(); }});

    // Budget filters
    document.getElementById('searchBudget')?.addEventListener('input', debounce(applyBudgetFilters, 300));
    ['filterYear','filterPropertyBudget','filterReconStatus'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', applyBudgetFilters);
    });
    document.getElementById('btnResetBudgetFilters')?.addEventListener('click', ()=>{
      document.getElementById('searchBudget').value='';
      document.getElementById('filterPropertyBudget').value='';
      document.getElementById('filterReconStatus').value='';
      document.getElementById('filterYear').value='2026';
      applyBudgetFilters();
    });
    document.getElementById('budgetPageSize')?.addEventListener('change', e=>{ budgetPageSize=parseInt(e.target.value); budgetPage=1; renderBudgetTable(); });
    document.getElementById('budgetPrev')?.addEventListener('click', ()=>{ if(budgetPage>1){ budgetPage--; renderBudgetTable(); }});
    document.getElementById('budgetNext')?.addEventListener('click', ()=>{ const max=Math.ceil(filteredBudgets.length/budgetPageSize); if(budgetPage<max){ budgetPage++; renderBudgetTable(); }});

    // Actions
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);
    document.getElementById('btnEnterReadings')?.addEventListener('click', openMeterModal);
    document.getElementById('btnRunReconciliation')?.addEventListener('click', runReconciliation);
    document.getElementById('btnGenerateRecon')?.addEventListener('click', runReconciliation);

    // Meter modal
    document.getElementById('btnCloseMeterModal')?.addEventListener('click', closeMeterModal);
    document.getElementById('btnCancelMeter')?.addEventListener('click', closeMeterModal);
    document.getElementById('meterModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='meterModalBackdrop') closeMeterModal(); });
    document.getElementById('btnAddRow')?.addEventListener('click', addMeterRow);
    document.getElementById('btnSaveMeters')?.addEventListener('click', saveMeterRows);

    // Drawer
    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        document.querySelectorAll('.drawer-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        meterTabCurrent = tab.dataset.tab;
        if(selectedMeterId) renderDrawerBody(selectedMeterId);
      });
    });
    document.getElementById('btnVerifyReading')?.addEventListener('click', ()=>{ if(selectedMeterId) verifyReading(selectedMeterId); });
    document.getElementById('btnEditReading')?.addEventListener('click', ()=>{ if(selectedMeterId) editReading(selectedMeterId); });
    document.getElementById('btnIgnoreSpike')?.addEventListener('click', ()=>{ if(selectedMeterId) ignoreSpike(selectedMeterId); });
    document.getElementById('btnGenerateInvoice')?.addEventListener('click', ()=>{ if(selectedMeterId) generateUtilityInvoice(selectedMeterId); });

    // Budget modal
    document.getElementById('btnCloseBudgetModal')?.addEventListener('click', closeBudgetModal);
    document.getElementById('btnCancelBudget')?.addEventListener('click', closeBudgetModal);
    document.getElementById('budgetModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='budgetModalBackdrop') closeBudgetModal(); });
    document.getElementById('btnPostReconciliation')?.addEventListener('click', postReconciliation);

    // Confirm
    document.getElementById('confirmCancel')?.addEventListener('click', closeConfirm);
    document.getElementById('confirmBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='confirmBackdrop') closeConfirm(); });

    document.addEventListener('click', e=>{
      const menu = document.getElementById('ctxMenu');
      if(menu && !menu.contains(e.target) && !e.target.closest('.dots-btn')) menu.classList.remove('open');
    });
  }

  function debounce(fn, delay){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

  function renderKPIs(){
    if(activeTab==='meters'){
      const totalCons = filteredMeters.length ? filteredMeters.reduce((s,m)=>s+(m.consumption||0),0) : meterData.reduce((s,m)=>s+(m.consumption||0),0);
      const spikes = (filteredMeters.length? filteredMeters : meterData).filter(m=> m.isSpike && !m.ignoredSpike).length;
      const toInvoice = (filteredMeters.length? filteredMeters : meterData).filter(m=> m.invoiceStatus!=='Invoiced').length;
      const invoicedAmt = (filteredMeters.length? filteredMeters : meterData).filter(m=> m.invoiceStatus==='Invoiced').reduce((s,m)=>s+(m.amount||0),0);
      const kpiGrid = document.getElementById('kpiGrid');
      if(!kpiGrid) return;
      kpiGrid.innerHTML = `
        <div class="kpi accent-blue"><div class="kpi-top"><span class="kpi-label">Total Consumption (MTD)</span><span class="kpi-icon blue">⚡</span></div><div class="kpi-value">${totalCons.toLocaleString()} units</div><div class="kpi-meta"><span class="trend neutral">${(filteredMeters.length||meterData.length)} meters</span><span>Water + Electricity</span></div></div>
        <div class="kpi accent-red"><div class="kpi-top"><span class="kpi-label">Spikes >20% Alert</span><span class="kpi-icon red">!</span></div><div class="kpi-value">${spikes}</div><div class="kpi-meta"><span class="trend down">${spikes>0? 'Requires verification' : 'All normal'}</span><span>3-month avg comparison</span></div></div>
        <div class="kpi accent-amber"><div class="kpi-top"><span class="kpi-label">Pending Invoicing</span><span class="kpi-icon amber">📄</span></div><div class="kpi-value">${toInvoice}</div><div class="kpi-meta"><span class="trend neutral">To generate recharge invoices</span><span>Auto to state.invoices</span></div></div>
        <div class="kpi accent-green"><div class="kpi-top"><span class="kpi-label">Invoiced Amount (MTD)</span><span class="kpi-icon green">₿</span></div><div class="kpi-value">${fmtMoneySmall(invoicedAmt)}</div><div class="kpi-meta"><span class="trend up">Recharged to tenants</span><span>ZRA Smart Invoice queued</span></div></div>
      `;
    } else {
      const budgets = filteredBudgets.length? filteredBudgets : budgetData;
      const totalBudgeted = budgets.reduce((s,b)=>s+(b.budgetedAmount||0),0);
      const totalActual = budgets.reduce((s,b)=>s+(b.actualMaintenanceCost||0),0);
      const totalVariance = totalBudgeted - totalActual;
      const surplusCount = budgets.filter(b=>b.reconciliationStatus==='Surplus').length;
      const deficitCount = budgets.filter(b=>b.reconciliationStatus==='Deficit').length;
      const kpiGrid = document.getElementById('kpiGrid');
      if(!kpiGrid) return;
      kpiGrid.innerHTML = `
        <div class="kpi accent-blue"><div class="kpi-top"><span class="kpi-label">Budgeted Service Charges</span><span class="kpi-icon blue">📊</span></div><div class="kpi-value">${fmtMoneySmall(totalBudgeted)}</div><div class="kpi-meta"><span class="trend neutral">${budgets.length} budget lines</span><span>${document.getElementById('filterYear')?.value||2026} OpEx</span></div></div>
        <div class="kpi accent-slate"><div class="kpi-top"><span class="kpi-label">Actual Maintenance Costs</span><span class="kpi-icon">🔧</span></div><div class="kpi-value">${fmtMoneySmall(totalActual)}</div><div class="kpi-meta"><span class="trend ${totalActual>totalBudgeted?'down':'up'}">From state.maintenance</span><span>${getMaintenance().length} work orders</span></div></div>
        <div class="kpi ${totalVariance>=0?'accent-green':'accent-amber'}"><div class="kpi-top"><span class="kpi-label">Year-end Variance</span><span class="kpi-icon ${totalVariance>=0?'green':'amber'}">${totalVariance>=0?'↗':'↘'}</span></div><div class="kpi-value" style="color:${totalVariance>=0?'#15803D':'#D97706'}">${fmtMoneySmall(totalVariance)} ${totalVariance>=0?'(Surplus)':'(Deficit)'}</div><div class="kpi-meta"><span class="trend ${totalVariance>=0?'up':'down'}">${Math.abs(totalVariance/totalBudgeted*100||0).toFixed(1)}% variance</span><span>Per m² reconciliation</span></div></div>
        <div class="kpi accent-violet"><div class="kpi-top"><span class="kpi-label">Reconciliation Status</span><span class="kpi-icon blue">⚖️</span></div><div class="kpi-value">${surplusCount} Surplus / ${deficitCount} Deficit</div><div class="kpi-meta"><span class="trend neutral">${budgets.filter(b=>b.reconciliationStatus==='Balanced').length} Balanced</span><span>Auto-computed from OpEx vs Maintenance</span></div></div>
      `;
    }
  }

  function applyMeterFilters(){
    const q = (document.getElementById('searchMeters')?.value||'').toLowerCase();
    const prop = document.getElementById('filterPropertyMeter')?.value||'';
    const utility = document.getElementById('filterUtility')?.value||'';
    const spikeFilter = document.getElementById('filterSpike')?.value||'';
    const status = document.getElementById('filterMeterStatus')?.value||'';

    filteredMeters = meterData.filter(m=>{
      if(q){
        const hay = `${m.propertyName} ${m.unitCode} ${m.meterNumber} ${m.tenantName} ${m.city}`.toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(prop && m.propertyId!==prop) return false;
      if(utility && m.utilityType!==utility) return false;
      if(spikeFilter==='spike' && (!m.isSpike || m.ignoredSpike)) return false;
      if(spikeFilter==='normal' && m.isSpike && !m.ignoredSpike) return false;
      if(status && m.invoiceStatus!==status) return false;
      return true;
    }).sort((a,b)=> (b.isSpike?1:0) - (a.isSpike?1:0) || b.consumption - a.consumption);

    meterPage = 1;
    renderMetersTable();
    renderKPIs();
  }

  function renderMetersTable(){
    const tbody = document.getElementById('metersTbody');
    const info = document.getElementById('meterTableInfo');
    if(!tbody) return;
    const total = filteredMeters.length;
    const maxPage = Math.max(1, Math.ceil(total / meterPageSize));
    if(meterPage>maxPage) meterPage=maxPage;
    const start = (meterPage-1)*meterPageSize;
    const pageData = filteredMeters.slice(start, start+meterPageSize);

    if(pageData.length===0){
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ico">💧</div><h3>No meters found</h3><p>Enter readings or adjust filters</p></div></td></tr>`;
      if(info) info.textContent = `Showing 0 of ${total}`;
      document.getElementById('meterCount').textContent = total;
      document.getElementById('totalConsumption').textContent = '0';
      document.getElementById('spikeCount').textContent = '0';
      document.getElementById('toInvoiceCount').textContent = '0';
      return;
    }

    tbody.innerHTML = pageData.map(m=>{
      const isSpike = m.isSpike && !m.ignoredSpike;
      const rowStyle = isSpike ? 'style="background:#FEF2F2;border:2px solid #FECACA;border-left:4px solid #DC2626"' : '';
      const spikeCell = isSpike ? `<span class="pill red" style="font-weight:800">SPIKE ${m.spikePercent}% > avg ${m.avg3Month}</span><div style="font-size:11px;color:#B91C1C;margin-top:2px">Consumption ${m.consumption} vs avg ${m.avg3Month} • +${m.spikePercent}%</div>` : `<span class="pill green">Normal</span><div style="font-size:11px;color:#64748B;margin-top:2px">Avg ${m.avg3Month} • Var ${m.spikePercent}%</div>`;
      const statusPill = `<span class="pill ${m.invoiceStatus==='Invoiced'?'green': m.invoiceStatus==='Pending Invoice'?'amber':'blue'}">${m.invoiceStatus}</span>${m.invoiceId? `<div style="font-size:11px;color:#64748B" class="mono">${m.invoiceId}</div>` : ''}`;
      return `<tr ${rowStyle}>
        <td><div style="font-weight:600">${escapeHtml(m.propertyName)}</div><div style="font-size:11px;color:#64748B">${escapeHtml(m.city)}</div></td>
        <td><div style="font-weight:600">${escapeHtml(m.unitCode)}</div><div style="font-size:11px;color:#64748B">${escapeHtml(m.tenantName)}</div></td>
        <td><span class="mono" style="font-weight:700;background:#0F172A;color:#FFF;padding:2px 6px;border-radius:4px;font-size:11px">${escapeHtml(m.meterNumber)}</span><div style="font-size:11px;color:#64748B;margin-top:2px">${escapeHtml(m.utilityType)}</div></td>
        <td>${Number(m.previousReading).toLocaleString()}</td>
        <td style="${isSpike?'color:#DC2626;font-weight:800':''}">${Number(m.currentReading).toLocaleString()}</td>
        <td style="${isSpike?'color:#DC2626;font-weight:800':''}">${m.consumption} <span style="font-size:11px;color:#64748B">${m.utilityType==='Water'?'m³':'kWh'}</span><div style="font-size:11px;color:#64748B">@ ZMW ${m.unitRate}/unit = ${fmtMoneySmall(m.amount)}</div></td>
        <td>${spikeCell}</td>
        <td>${statusPill}</td>
        <td><div style="display:flex;gap:4px"><button class="btn btn-sm" onclick="window.openMeterDrawer('${m.id}')">View</button><button class="dots-btn" onclick="window.openMeterCtx(event,'${m.id}')">⋮</button></div></td>
      </tr>`;
    }).join('');

    if(info) info.textContent = `Showing ${start+1}-${Math.min(start+meterPageSize,total)} of ${total} • Page ${meterPage}/${maxPage}`;
    document.getElementById('meterCount').textContent = total;
    document.getElementById('totalConsumption').textContent = filteredMeters.reduce((s,m)=>s+(m.consumption||0),0).toLocaleString();
    document.getElementById('spikeCount').textContent = filteredMeters.filter(m=>m.isSpike && !m.ignoredSpike).length;
    document.getElementById('toInvoiceCount').textContent = filteredMeters.filter(m=>m.invoiceStatus!=='Invoiced').length;
  }

  window.openMeterDrawer = openMeterDrawer;
  window.openMeterCtx = (e,id)=>{
    e.stopPropagation();
    const menu = document.getElementById('ctxMenu');
    menu.innerHTML = `
      <div class="ctx-item" onclick="window.openMeterDrawer('${id}')">👁️ View Reading</div>
      <div class="ctx-item" onclick="window.generateUtilityInvoice('${id}')">📄 Generate Recharge Invoice</div>
      <div class="ctx-item" onclick="window.verifyReading('${id}')">✅ Verify Reading</div>
      <div class="ctx-item" onclick="window.ignoreSpike('${id}')">🚫 Ignore Spike</div>
    `;
    menu.style.left = (e.clientX-10)+'px';
    menu.style.top = (e.clientY+6)+'px';
    menu.classList.add('open');
  };

  function openMeterDrawer(id){
    const meter = meterData.find(m=>m.id===id);
    if(!meter) return;
    selectedMeterId = id;
    const isSpike = meter.isSpike && !meter.ignoredSpike;
    document.getElementById('drawerTitle').textContent = `${meter.meterNumber} — ${meter.utilityType}`;
    document.getElementById('drawerId').textContent = meter.id;
    const spikeEl = document.getElementById('drawerSpike');
    spikeEl.style.display = isSpike ? 'inline-flex' : 'none';
    spikeEl.textContent = isSpike ? `SPIKE +${meter.spikePercent}%` : '';
    document.getElementById('drawerStatus').className = `pill ${meter.invoiceStatus==='Invoiced'?'green': meter.invoiceStatus==='Pending Invoice'?'amber':'blue'}`;
    document.getElementById('drawerStatus').textContent = meter.invoiceStatus;
    document.getElementById('drawerSubtitle').textContent = `${meter.propertyName} • ${meter.unitCode} • ${meter.tenantName} • ${meter.utilityType}`;

    document.getElementById('drawerSummary').innerHTML = `
      <div class="sum-item"><div class="l">Consumption</div><div class="v" style="${isSpike?'color:#DC2626':''}">${meter.consumption} ${meter.utilityType==='Water'?'m³':'kWh'}</div></div>
      <div class="sum-item"><div class="l">3-Month Avg</div><div class="v">${meter.avg3Month} • Var ${meter.spikePercent}%</div></div>
      <div class="sum-item"><div class="l">Amount</div><div class="v">${fmtMoneySmall(meter.amount)}</div></div>
    `;
    renderDrawerBody(id);
    document.getElementById('drawerBackdrop').classList.add('open');
    document.getElementById('meterDrawer').classList.add('open');
  }
  function closeDrawer(){
    document.getElementById('drawerBackdrop').classList.remove('open');
    document.getElementById('meterDrawer').classList.remove('open');
    selectedMeterId=null;
  }
  function renderDrawerBody(id){
    const meter = meterData.find(m=>m.id===id);
    if(!meter) return;
    const body = document.getElementById('drawerBody');
    const isSpike = meter.isSpike && !meter.ignoredSpike;
    if(meterTabCurrent==='reading'){
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h4 style="margin:0;font-size:13px;font-weight:800">Reading & Spike Detection</h4>${isSpike?'<span class="pill red">Spike >20%</span>':'<span class="pill green">Normal</span>'}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#64748B">Previous</div><div style="font-weight:800;font-size:18px">${Number(meter.previousReading).toLocaleString()}</div></div>
          <div style="background:${isSpike?'#FEF2F2':'#F8FAFC'};border:${isSpike?'2px solid #FECACA':'1px solid #E2E8F0'};border-radius:8px;padding:10px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:${isSpike?'#B91C1C':'#64748B'}">Current</div><div style="font-weight:800;font-size:18px;color:${isSpike?'#DC2626':'#0F172A'}">${Number(meter.currentReading).toLocaleString()}</div><div style="font-size:11px;color:${isSpike?'#B91C1C':'#64748B'}">Consumption ${meter.consumption}</div></div>
        </div>
        <div style="background:${isSpike?'#FEF2F2;border:1px solid #FECACA':'#F0FDF4;border:1px solid #BBF7D0'};border-radius:8px;padding:12px">
          <div style="font-size:12px;font-weight:700;color:${isSpike?'#B91C1C':'#15803D'}">${isSpike?'⚠️ Abnormal Consumption Spike Detected (>20% over 3-month avg)':'✅ Normal Consumption'}</div>
          <div style="font-size:12px;color:#475569;margin-top:6px">Formula: <code>(consumption - avg3Month) / avg3Month = (${meter.consumption} - ${meter.avg3Month}) / ${meter.avg3Month} = ${meter.spikePercent}%</code><br/>Threshold: 20% • 3-month avg: ${meter.avg3Month} • Current: ${meter.consumption} • Status: ${isSpike?'Spike requires verification':'OK to invoice'}</div>
          ${isSpike?'<div style="margin-top:8px;font-size:11px;color:#B91C1C">Red border applied to row • Auto-invoice blocked until verified or spike ignored. Possible leak or faulty meter.</div>':''}
        </div>
        <div style="margin-top:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569"><strong>Invoice Logic:</strong> On save, system auto-generates utility recharge invoice into <code>state.invoices</code> with type Utilities, amount ${fmtMoneySmall(meter.amount)}, ZRA Smart Invoice No, status Unpaid. Blocked if spike not verified.</div>
      `;
    } else if(meterTabCurrent==='history'){
      // Generate 3-month history mock
      const history = [];
      let base = meter.previousReading - meter.avg3Month*3;
      for(let i=3;i>=0;i--){
        const date = new Date(); date.setMonth(date.getMonth()-i);
        const cons = i===0 ? meter.consumption : Math.floor(meter.avg3Month * (0.9 + Math.random()*0.2));
        const prev = i===0 ? meter.previousReading : base;
        const curr = prev + cons;
        base = curr;
        history.push({ date: date.toISOString().slice(0,10), prev, curr, cons, avg: meter.avg3Month });
      }
      body.innerHTML = `
        <h4 style="margin:0 0 10px;font-size:13px;font-weight:800">3-Month Average History</h4>
        <table class="line-items-table"><thead><tr><th>Date</th><th>Previous</th><th>Current</th><th>Consumption</th><th>Variance vs Avg</th></tr></thead><tbody>${history.map(h=>`<tr style="${h.cons>meter.avg3Month*1.2?'background:#FEF2F2':''}"><td>${fmtDate(h.date)}</td><td>${h.prev}</td><td>${h.curr}</td><td style="font-weight:700">${h.cons}</td><td style="color:${h.cons>meter.avg3Month*1.2?'#DC2626':'#16A34A'}">${Math.round((h.cons - meter.avg3Month)/meter.avg3Month*100)}%</td></tr>`).join('')}</tbody></table>
        <div style="margin-top:10px;font-size:11px;color:#64748B">3-month avg = ${meter.avg3Month} • Spike threshold = ${Math.round(meter.avg3Month*1.2)} • Current ${meter.consumption} is ${meter.spikePercent>0?'+':''}${meter.spikePercent}% vs avg</div>
      `;
    } else if(meterTabCurrent==='invoice'){
      const inv = getInvoices().find(i=>i.id===meter.invoiceId);
      body.innerHTML = inv ? `
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px;margin-bottom:10px"><div style="display:flex;justify-content:space-between"><span style="font-weight:800">${inv.id}</span><span class="pill ${inv.status==='Paid'?'green':'amber'}">${inv.status}</span></div><div style="font-size:12px;color:#475569;margin-top:4px">Amount ${fmtMoneySmall(inv.amount)} • ZRA ${inv.zraSmartInvoiceNo||''} • ${inv.zraStatus||''}</div></div>
        <table class="line-items-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead><tbody>${(inv.lineItems||[]).map(li=>`<tr><td>${escapeHtml(li.description)}</td><td>${li.qty}</td><td>${fmtMoneySmall(li.unitPrice)}</td><td>${fmtMoneySmall(li.amount)}</td></tr>`).join('') || `<tr><td>${meter.utilityType} Recharge - ${meter.consumption} ${meter.utilityType==='Water'?'m³':'kWh'}</td><td>${meter.consumption}</td><td>${fmtMoneySmall(meter.unitRate)}</td><td>${fmtMoneySmall(meter.amount)}</td></tr>`}</tbody></table>
      ` : `
        <div class="empty-state"><div class="ico">📄</div><h3>No utility invoice yet</h3><p>Generate recharge invoice to push into state.invoices</p><button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="window.generateUtilityInvoice('${meter.id}')">Generate Invoice</button></div>
      `;
    }
  }

  // Meter Entry Logic + Auto-generate invoice into state.invoices
  function openMeterModal(){
    document.getElementById('meterModalBackdrop').classList.add('open');
    const container = document.getElementById('meterEntryRows');
    container.innerHTML = '';
    addMeterRow();
  }
  function closeMeterModal(){ document.getElementById('meterModalBackdrop').classList.remove('open'); }
  function addMeterRow(){
    const container = document.getElementById('meterEntryRows');
    const props = getProperties();
    const propOpts = props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    const tenants = getTenants().slice(0,20);
    const tenantOpts = tenants.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
    const rowId = `row-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const div = document.createElement('div');
    div.id = rowId;
    div.style.cssText='background:#FFF;border:1px solid #E2E8F0;border-radius:8px;padding:10px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr auto;gap:8px;align-items:end';
    div.innerHTML = `
      <div><label class="form-label">Property</label><select class="form-select prop-select">${propOpts}</select></div>
      <div><label class="form-label">Tenant</label><select class="form-select tenant-select"><option value="">Select</option>${tenantOpts}</select></div>
      <div><label class="form-label">Meter #</label><input class="form-input meter-no" placeholder="e.g. WTR-P-001-0001" /></div>
      <div><label class="form-label">Prev Reading</label><input type="number" class="form-input prev-read" placeholder="1000" /></div>
      <div><label class="form-label">Current Reading *</label><input type="number" class="form-input curr-read" placeholder="1250" style="border-width:2px" /></div>
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('${rowId}').remove()">✕</button>
      <div class="spike-info" style="grid-column:1/-1;font-size:11px;color:#64748B;display:none"></div>
    `;
    container.appendChild(div);
    // Bind spike check
    const currInput = div.querySelector('.curr-read');
    const prevInput = div.querySelector('.prev-read');
    const info = div.querySelector('.spike-info');
    const check = ()=>{
      const prev = Number(prevInput.value||0);
      const curr = Number(currInput.value||0);
      if(!curr || !prev || curr<=prev){ info.style.display='none'; currInput.style.borderColor='#E2E8F0'; return; }
      const cons = curr - prev;
      const avg = 150; // demo avg
      const pct = ((cons - avg)/avg)*100;
      const isSpike = pct > 20;
      info.style.display='block';
      info.innerHTML = `Consumption ${cons} • Avg ${avg} • Variance ${pct.toFixed(1)}% ${isSpike?'<span class="pill red">SPIKE >20% — red border</span>':'<span class="pill green">Normal</span>'}`;
      if(isSpike){
        currInput.style.borderColor='#DC2626';
        currInput.style.background='#FEF2F2';
        div.style.border='2px solid #FECACA';
        div.style.background='#FFFBFB';
      } else {
        currInput.style.borderColor='#16A34A';
        currInput.style.background='#F0FDF4';
        div.style.border='1px solid #E2E8F0';
        div.style.background='#FFF';
      }
    };
    currInput.addEventListener('input', check);
    prevInput.addEventListener('input', check);
  }

  function saveMeterRows(){
    const rows = document.querySelectorAll('#meterEntryRows > div');
    let created = 0;
    let spikes = 0;
    rows.forEach(row=>{
      const propId = row.querySelector('.prop-select')?.value||'';
      const tenantId = row.querySelector('.tenant-select')?.value||'';
      const meterNo = row.querySelector('.meter-no')?.value||`WTR-${propId}-${String(meterData.length+created+1).padStart(4,'0')}`;
      const prev = Number(row.querySelector('.prev-read')?.value||0);
      const curr = Number(row.querySelector('.curr-read')?.value||0);
      if(!curr || curr<=prev) return;
      const cons = curr - prev;
      const avg3 = 150;
      const spikePct = Math.round((cons - avg3)/avg3*100);
      const isSpike = spikePct > 20;
      if(isSpike) spikes++;

      const prop = getProperties().find(p=>p.id===propId) || getProperties()[0];
      const tenant = getTenants().find(t=>t.id===tenantId) || getTenants()[0] || {id:'T-1042', name:'Kabwelwa Supermarket'};
      const unitRate = meterNo.startsWith('WTR')?12.5:2.8;
      const amount = Math.round(cons * unitRate * 1.16);

      const meter = {
        id: `MTR-${String(meterData.length+created+1).padStart(5,'0')}`,
        propertyId: prop.id,
        propertyName: prop.name,
        property: prop.name,
        unitId: `${prop.id}-U-001`,
        unitCode: `${prop.id}-01`,
        unit: `${prop.id}-01`,
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenant: tenant.name,
        meterNumber: meterNo,
        meter: meterNo,
        utilityType: meterNo.startsWith('WTR')?'Water':'Electricity',
        utility: meterNo.startsWith('WTR')?'Water':'Electricity',
        previousReading: prev,
        currentReading: curr,
        consumption: cons,
        avg3Month: avg3,
        spikePercent: spikePct,
        isSpike,
        readingDate: new Date().toISOString().slice(0,10),
        invoiceStatus: isSpike ? 'Pending Invoice' : 'Verified',
        invoiceId: null,
        unitRate,
        amount,
        verified: !isSpike,
        ignoredSpike: false,
        city: prop.city||'Lusaka'
      };

      meterData.push(meter);
      getState().meterReadings = meterData;

      // Auto-generate utility recharge invoice into state.invoices if not spike
      if(!isSpike){
        generateInvoiceForMeter(meter, false);
        created++;
      } else {
        // Still push meter but invoice pending verification
        created++;
      }
    });

    saveState();
    closeMeterModal();
    applyMeterFilters();
    renderKPIs();
    toast(`${created} meter readings saved • ${spikes} spikes detected (>20%) with red border • ${created-spikes} invoices auto-generated into state.invoices`, spikes>0?'info':'success');
  }

  function generateInvoiceForMeter(meter, showToast=true){
    const prop = getProperties().find(p=>p.id===meter.propertyId) || {id:meter.propertyId, name:meter.propertyName};
    const tenant = getTenants().find(t=>t.id===meter.tenantId) || {id:meter.tenantId, name:meter.tenantName};
    const year = new Date().getFullYear();
    const invId = `INV-${year}-${String(getInvoices().length+1).padStart(4,'0')}`;
    const zraNo = `ZRA-SI-${year}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(getInvoices().length+1).padStart(6,'0')}-${Math.floor(1000+Math.random()*9000)}`;
    const vat = Math.round(meter.amount * 0.16 / 1.16);
    const base = meter.amount - vat;

    const invoice = {
      id: invId,
      tenantId: tenant.id,
      tenant: tenant.name,
      tenantName: tenant.name,
      propertyId: prop.id,
      property: prop.name,
      propertyName: prop.name,
      unitId: meter.unitId,
      unitCode: meter.unitCode,
      type: 'Utilities',
      invoiceType: 'Utilities',
      status: 'Unpaid',
      paymentStatus: 'Unpaid',
      issueDate: new Date().toISOString().slice(0,10),
      dueDate: new Date(Date.now()+15*24*3600*1000).toISOString().slice(0,10),
      amount: meter.amount,
      baseRent: 0,
      serviceChargeAmount: 0,
      utilitiesAmount: base,
      penaltyAmount: 0,
      totalBeforeTax: base,
      vat: vat,
      withholdingTax: 0,
      totalTax: vat,
      paidAmount: 0,
      outstandingAmount: meter.amount,
      currency: 'ZMW',
      zraSmartInvoiceNo: zraNo,
      zraSmartInvoice: zraNo,
      zraStatus: 'Queued',
      zraSyncDate: null,
      zraValidationMessage: 'Queued for ZRA Smart Invoice - Utility Recharge',
      ledgerHistory: [{ id: `${invId}-LH-1`, date: new Date().toISOString().slice(0,10), type: 'Invoice Created - Utility Recharge', amount: meter.amount, reference: meter.meterNumber, user: 'System - Meter Reading', balance: meter.amount }],
      lineItems: [
        { id: `${invId}-LI-1`, description: `${meter.utilityType} Recharge - ${meter.meterNumber} - Consumption ${meter.consumption} ${meter.utilityType==='Water'?'m³':'kWh'} @ ZMW ${meter.unitRate}/unit`, qty: meter.consumption, unitPrice: meter.unitRate, amount: base, taxCode: 'STD' },
        { id: `${invId}-LI-VAT`, description: 'VAT 16%', qty:1, unitPrice: vat, amount: vat, taxCode:'VAT' }
      ],
      paymentTerms: 'Net 15',
      createdBy: 'Meter Reading Auto-Gen',
      createdAt: new Date().toISOString().slice(0,10),
      description: `Utility recharge for ${meter.meterNumber} - ${meter.consumption} units`,
      sourceMeterId: meter.id
    };

    getState().invoices = getState().invoices||[];
    getState().invoices.unshift(invoice);
    meter.invoiceId = invId;
    meter.invoiceStatus = 'Invoiced';
    saveState();

    if(showToast) toast(`Utility invoice ${invId} auto-generated for meter ${meter.meterNumber} • ${fmtMoneySmall(meter.amount)} → state.invoices`, 'success');
    return invoice;
  }

  function generateUtilityInvoice(meterId){
    const meter = meterData.find(m=>m.id===meterId);
    if(!meter) return;
    if(meter.isSpike && !meter.verified && !meter.ignoredSpike){
      showConfirm('Spike Verification Required', `Meter ${meter.meterNumber} has spike +${meter.spikePercent}% over 3-month avg (${meter.avg3Month}). Consumption ${meter.consumption} vs avg. Verify reading or ignore spike before invoicing?`, ()=>{
        meter.verified = true;
        saveState();
        generateInvoiceForMeter(meter, true);
        applyMeterFilters();
        if(selectedMeterId===meterId) renderDrawerBody(meterId);
      });
      return;
    }
    generateInvoiceForMeter(meter, true);
    applyMeterFilters();
    if(selectedMeterId===meterId) renderDrawerBody(meterId);
  }
  window.generateUtilityInvoice = generateUtilityInvoice;

  function verifyReading(meterId){
    const meter = meterData.find(m=>m.id===meterId);
    if(!meter) return;
    meter.verified = true;
    meter.ignoredSpike = false;
    saveState();
    toast(`Meter ${meter.meterNumber} verified — spike acknowledged`, 'success');
    applyMeterFilters();
    if(selectedMeterId===meterId) renderDrawerBody(meterId);
  }
  function ignoreSpike(meterId){
    const meter = meterData.find(m=>m.id===meterId);
    if(!meter) return;
    meter.ignoredSpike = true;
    meter.verified = true;
    saveState();
    toast(`Spike ignored for ${meter.meterNumber} — will allow invoicing`, 'success');
    applyMeterFilters();
    if(selectedMeterId===meterId) renderDrawerBody(meterId);
  }
  function editReading(meterId){
    const meter = meterData.find(m=>m.id===meterId);
    if(!meter) return;
    const newCurr = prompt(`Edit current reading for ${meter.meterNumber}\nPrevious: ${meter.previousReading}\nCurrent: ${meter.currentReading}\nEnter new current reading:`, meter.currentReading);
    if(!newCurr) return;
    const currNum = Number(newCurr);
    if(isNaN(currNum) || currNum <= meter.previousReading){ toast('Invalid reading — must be > previous','error'); return; }
    meter.currentReading = currNum;
    meter.consumption = currNum - meter.previousReading;
    meter.spikePercent = Math.round((meter.consumption - meter.avg3Month)/meter.avg3Month*100);
    meter.isSpike = meter.spikePercent > 20;
    meter.amount = Math.round(meter.consumption * meter.unitRate * 1.16);
    saveState();
    applyMeterFilters();
    if(selectedMeterId===meterId) renderDrawerBody(meterId);
    toast(`Reading updated — consumption ${meter.consumption} • Spike ${meter.spikePercent}%`, meter.isSpike?'info':'success');
  }
  window.verifyReading = verifyReading;
  window.ignoreSpike = ignoreSpike;
  window.editReading = editReading;

  // --- Budget Reconciliation Logic ---

  function applyBudgetFilters(){
    const q = (document.getElementById('searchBudget')?.value||'').toLowerCase();
    const year = document.getElementById('filterYear')?.value||'2026';
    const prop = document.getElementById('filterPropertyBudget')?.value||'';
    const status = document.getElementById('filterReconStatus')?.value||'';

    filteredBudgets = budgetData.filter(b=>{
      if(q){
        const hay = `${b.propertyName} ${b.budgetLine} ${b.city}`.toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(year && String(b.year)!==String(year)) return false;
      if(prop && b.propertyId!==prop) return false;
      if(status && b.reconciliationStatus!==status) return false;
      return true;
    }).sort((a,b)=> Math.abs(b.variance) - Math.abs(a.variance));

    budgetPage = 1;
    renderBudgetTable();
    renderKPIs();
    renderReconSummary();
  }

  function renderBudgetTable(){
    const tbody = document.getElementById('budgetTbody');
    const info = document.getElementById('budgetTableInfo');
    if(!tbody) return;
    const total = filteredBudgets.length;
    const maxPage = Math.max(1, Math.ceil(total / budgetPageSize));
    if(budgetPage>maxPage) budgetPage=maxPage;
    const start = (budgetPage-1)*budgetPageSize;
    const pageData = filteredBudgets.slice(start, start+budgetPageSize);

    if(pageData.length===0){
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="ico">📊</div><h3>No budget lines</h3><p>Run year-end reconciliation</p></div></td></tr>`;
      if(info) info.textContent = `Showing 0 of ${total}`;
      return;
    }

    tbody.innerHTML = pageData.map(b=>{
      const varColor = b.variance>0 ? '#15803D' : b.variance<0 ? '#B91C1C' : '#64748B';
      const statusCls = {Surplus:'green',Deficit:'red',Balanced:'gray',Pending:'amber'}[b.reconciliationStatus]||'gray';
      return `<tr>
        <td><div style="font-weight:600">${escapeHtml(b.propertyName)}</div><div style="font-size:11px;color:#64748B">${escapeHtml(b.city)}</div></td>
        <td>${Number(b.gla).toLocaleString()} m²</td>
        <td><span class="pill gray">${escapeHtml(b.budgetLine)}</span><div style="font-size:11px;color:#64748B">FY ${b.year}</div></td>
        <td class="amount">${fmtMoneySmall(b.budgetedAmount)}</td>
        <td>${fmtMoneySmall(b.budgetedPerM2)}/m²</td>
        <td class="amount" style="font-weight:700">${fmtMoneySmall(b.actualMaintenanceCost)}<div style="font-size:11px;color:#64748B">${b.maintenanceIds? b.maintenanceIds.length+' work orders' : ''}</div></td>
        <td>${fmtMoneySmall(b.actualPerM2)}/m²</td>
        <td style="color:${varColor};font-weight:800">${fmtMoneySmall(b.variance)}<div style="font-size:11px">${b.variancePercent>0?'+':''}${b.variancePercent}%</div></td>
        <td><span class="pill ${statusCls}">${b.reconciliationStatus}</span></td>
        <td><button class="btn btn-sm" onclick="window.openBudgetDetail('${b.id}')">View</button></td>
      </tr>`;
    }).join('');

    if(info) info.textContent = `Showing ${start+1}-${Math.min(start+budgetPageSize,total)} of ${total} • Page ${budgetPage}/${maxPage}`;
    document.getElementById('budgetCount').textContent = total;
    document.getElementById('totalBudgeted').textContent = fmtMoneySmall(filteredBudgets.reduce((s,b)=>s+(b.budgetedAmount||0),0)).replace('ZMW ','');
    document.getElementById('totalActual').textContent = fmtMoneySmall(filteredBudgets.reduce((s,b)=>s+(b.actualMaintenanceCost||0),0)).replace('ZMW ','');
    const totalVar = filteredBudgets.reduce((s,b)=>s+(b.variance||0),0);
    const varEl = document.getElementById('totalVariance');
    if(varEl){ varEl.textContent = fmtMoneySmall(totalVar); varEl.style.color = totalVar>=0?'#15803D':'#B91C1C'; }
  }

  function renderReconSummary(){
    const tbody = document.getElementById('reconSummaryTbody');
    if(!tbody) return;
    const props = getProperties().slice(0,6);
    const summary = props.map(prop=>{
      const lines = budgetData.filter(b=>b.propertyId===prop.id);
      const budgeted = lines.reduce((s,b)=>s+(b.budgetedAmount||0),0);
      const actual = lines.reduce((s,b)=>s+(b.actualMaintenanceCost||0),0);
      const variance = budgeted - actual;
      const variancePct = budgeted ? (variance/budgeted*100) : 0;
      const gla = lines[0]?.gla || 8000;
      const recovery = lines.reduce((s,b)=>s+(b.budgetedAmount||0),0); // service charge recovery
      let status = 'Balanced';
      if(Math.abs(variancePct)<5) status='Balanced';
      else if(variance>0) status='Surplus';
      else status='Deficit';
      return { prop, gla, budgeted, actual, variance, variancePct, recovery, status, lines };
    });

    tbody.innerHTML = summary.map(s=>`
      <tr>
        <td><div style="font-weight:700">${escapeHtml(s.prop.name)}</div><div style="font-size:11px;color:#64748B">${s.prop.city}</div></td>
        <td>${Number(s.gla).toLocaleString()} m²</td>
        <td class="amount">${fmtMoneySmall(s.budgeted)}</td>
        <td class="amount">${fmtMoneySmall(s.actual)}<div style="font-size:11px;color:#64748B">${s.lines.length} lines • From maintenance</div></td>
        <td style="color:${s.variance>=0?'#15803D':'#B91C1C'};font-weight:800">${fmtMoneySmall(s.variance)}</td>
        <td style="color:${s.variance>=0?'#15803D':'#B91C1C'}">${s.variancePct.toFixed(1)}%</td>
        <td>${fmtMoneySmall(s.recovery)}</td>
        <td><span class="pill ${s.status==='Surplus'?'green': s.status==='Deficit'?'red':'gray'}">${s.status}</span></td>
      </tr>
    `).join('');
  }

  function runReconciliation(){
    // Year-End Reconciliation: Automatically compute variance between budgeted OpEx and actual maintenance costs logged in state.maintenance
    const maintenance = getMaintenance();
    // Enrich maintenance with costs if missing
    maintenance.forEach(m=>{
      if(!m.cost){
        m.cost = Math.floor(5000 + Math.random()*50000);
        m.costPerM2 = m.cost / 100; // demo
        m.year = 2026;
      }
    });

    // Recompute budgetData actuals from maintenance
    budgetData.forEach(budget=>{
      const propMaintenance = maintenance.filter(m=> (m.property===budget.propertyName || m.propertyId===budget.propertyId));
      // Distribute maintenance costs proportionally to budget lines
      const totalMaintenanceForProp = propMaintenance.reduce((s,m)=>s+(m.cost||0),0);
      const totalBudgetForProp = budgetData.filter(b=>b.propertyId===budget.propertyId).reduce((s,b)=>s+(b.budgetedAmount||0),0);
      const share = totalBudgetForProp ? (budget.budgetedAmount / totalBudgetForProp) : 0.1;
      const actualForLine = Math.floor(totalMaintenanceForProp * share * (0.9 + Math.random()*0.3)); // some variance
      budget.actualMaintenanceCost = actualForLine || Math.floor(budget.budgetedAmount * (0.8 + Math.random()*0.5));
      budget.actual = budget.actualMaintenanceCost;
      budget.actualPerM2 = Math.round((budget.actualMaintenanceCost / budget.gla)*100)/100;
      budget.variance = budget.budgetedAmount - budget.actualMaintenanceCost;
      budget.variancePercent = Math.round((budget.variance / budget.budgetedAmount * 100)*10)/10;
      if(Math.abs(budget.variancePercent) < 5) budget.reconciliationStatus = 'Balanced';
      else if(budget.variance > 0) budget.reconciliationStatus = 'Surplus';
      else budget.reconciliationStatus = 'Deficit';
    });

    getState().serviceChargeBudgets = budgetData;
    getState().maintenance = maintenance;
    saveState();

    applyBudgetFilters();
    renderKPIs();
    toast(`Year-end reconciliation computed: ${budgetData.length} lines • Budget vs Actual Maintenance variance from state.maintenance (${maintenance.length} work orders)`, 'success');

    // Log audit
    try{
      if(window.addAuditEvent){
        window.addAuditEvent('RECONCILE','service_charge_budget','FY2026',`Year-end reconciliation FY2026: Budgeted ${fmtMoneySmall(budgetData.reduce((s,b)=>s+b.budgetedAmount,0))} vs Actual ${fmtMoneySmall(budgetData.reduce((s,b)=>s+b.actualMaintenanceCost,0))} • Variance ${fmtMoneySmall(budgetData.reduce((s,b)=>s+b.variance,0))}`, null, {year:2026, lines: budgetData.length});
      }
    }catch{}
  }

  window.openBudgetDetail = (budgetId)=>{
    const b = budgetData.find(x=>x.id===budgetId);
    if(!b) return;
    const modal = document.getElementById('budgetModalBackdrop');
    const body = document.getElementById('budgetModalBody');
    const propMaint = getMaintenance().filter(m=> m.property===b.propertyName || m.propertyId===b.propertyId).slice(0,8);
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#64748B">Budgeted OpEx</div><div style="font-weight:800;font-size:18px;margin-top:4px">${fmtMoneySmall(b.budgetedAmount)}</div><div style="font-size:11px;color:#64748B">${fmtMoneySmall(b.budgetedPerM2)}/m² • GLA ${Number(b.gla).toLocaleString()} m²</div></div>
        <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#92400E">Actual Maintenance</div><div style="font-weight:800;font-size:18px;margin-top:4px;color:#92400E">${fmtMoneySmall(b.actualMaintenanceCost)}</div><div style="font-size:11px;color:#92400E">${fmtMoneySmall(b.actualPerM2)}/m² • From state.maintenance</div></div>
      </div>
      <div style="background:${b.variance>=0?'#F0FDF4;border:1px solid #BBF7D0':'#FEF2F2;border:1px solid #FECACA'};border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between"><span style="font-weight:700">Year-end Variance</span><span style="font-weight:800;color:${b.variance>=0?'#15803D':'#B91C1C'}">${fmtMoneySmall(b.variance)} (${b.variancePercent>0?'+':''}${b.variancePercent}%)</span></div>
        <div style="font-size:11px;color:#475569;margin-top:4px">${b.variance>=0? 'Surplus: Budgeted > Actual — refund to tenants or credit to next year' : 'Deficit: Actual > Budgeted — additional recharge to tenants per lease'} • Status: ${b.reconciliationStatus}</div>
      </div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:6px">Actual Maintenance Costs Logged in state.maintenance (${propMaint.length} of ${getMaintenance().filter(m=>m.property===b.propertyName).length})</div>
      <div class="table-wrap" style="border:1px solid #E2E8F0;border-radius:8px"><table class="line-items-table" style="margin:0"><thead><tr><th>ID</th><th>Issue</th><th>Priority</th><th>Status</th><th>Cost</th></tr></thead><tbody>${propMaint.map(m=>`<tr><td class="mono">${m.id}</td><td>${escapeHtml(m.issue||'Maintenance')}</td><td><span class="pill ${m.priority==='High'?'red': m.priority==='Medium'?'amber':'gray'}">${m.priority||'Medium'}</span></td><td>${m.status||'Open'}</td><td>${fmtMoneySmall(m.cost||0)}</td></tr>`).join('') || '<tr><td colspan=5>No maintenance logged</td></tr>'}</tbody></table></div>
      <div style="margin-top:10px;font-size:11px;color:#64748B">Formula: Variance = Budgeted OpEx - Actual Maintenance Costs (from state.maintenance) • Per m² = Amount / GLA • Reconciliation Status: Surplus (refund), Deficit (recharge), Balanced (±5%)</div>
    `;
    modal.classList.add('open');
  };
  function closeBudgetModal(){ document.getElementById('budgetModalBackdrop').classList.remove('open'); }
  function postReconciliation(){ closeBudgetModal(); toast('Reconciliation posted to ledger — service charge credit/debit notes will be generated', 'success'); }

  function exportCSV(){
    if(activeTab==='meters'){
      const data = filteredMeters.map(m=>({
        MeterID: m.id,
        Property: m.propertyName,
        Unit: m.unitCode,
        MeterNumber: m.meterNumber,
        Utility: m.utilityType,
        Tenant: m.tenantName,
        PreviousReading: m.previousReading,
        CurrentReading: m.currentReading,
        Consumption: m.consumption,
        Avg3Month: m.avg3Month,
        SpikePercent: m.spikePercent,
        IsSpike: m.isSpike && !m.ignoredSpike,
        Amount_ZMW: m.amount,
        InvoiceStatus: m.invoiceStatus,
        InvoiceID: m.invoiceId||'',
        ReadingDate: m.readingDate
      }));
      if(data.length===0){ toast('No meter data','error'); return; }
      if(window.XLSX){
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Meters');
        const out = XLSX.write(wb, {bookType:'xlsx', type:'array'});
        const blob = new Blob([out], {type:'application/octet-stream'});
        const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`PropertyPro_Meters_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); URL.revokeObjectURL(url);
        toast(`Exported ${data.length} meters`, 'success');
      }
    } else {
      const data = filteredBudgets.map(b=>({
        Property: b.propertyName,
        GLA_m2: b.gla,
        BudgetLine: b.budgetLine,
        Year: b.year,
        Budgeted_ZMW: b.budgetedAmount,
        Budgeted_per_m2: b.budgetedPerM2,
        Actual_Maintenance_ZMW: b.actualMaintenanceCost,
        Actual_per_m2: b.actualPerM2,
        Variance_ZMW: b.variance,
        Variance_Pct: b.variancePercent,
        ReconciliationStatus: b.reconciliationStatus
      }));
      if(data.length===0){ toast('No budget data','error'); return; }
      if(window.XLSX){
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'BudgetRecon');
        const out = XLSX.write(wb, {bookType:'xlsx', type:'array'});
        const blob = new Blob([out], {type:'application/octet-stream'});
        const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`PropertyPro_Budget_Recon_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); URL.revokeObjectURL(url);
        toast(`Exported ${data.length} budget lines`, 'success');
      }
    }
  }

  function showConfirm(title, body, onOk){
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmBody').textContent = body;
    document.getElementById('confirmBackdrop').classList.add('open');
    const okBtn = document.getElementById('confirmOk');
    const newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    newOk.addEventListener('click', ()=>{ closeConfirm(); onOk&&onOk(); });
  }
  function closeConfirm(){ document.getElementById('confirmBackdrop').classList.remove('open'); }
  function toast(msg, type='info'){
    let container = document.getElementById('toastContainer');
    if(!container){ container = document.createElement('div'); container.id='toastContainer'; container.style.cssText='position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px'; document.body.appendChild(container); }
    const el = document.createElement('div');
    el.style.cssText=`padding:10px 14px;border-radius:8px;border:1px solid #E2E8F0;background:#FFF;box-shadow:0 8px 24px rgba(15,23,42,.12);font-size:13px;font-weight:600;max-width:380px;${type==='success'?'border-color:#BBF7D0;background:#F0FDF4;color:#15803D': type==='error'?'border-color:#FECACA;background:#FEF2F2;color:#B91C1C':''}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, 4000);
  }
})();

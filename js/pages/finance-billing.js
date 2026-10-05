/**
 * Finance Billing & Invoices - PropertyPro Zambia Ltd v3
 * Page: finance-billing.html
 * Features: KPI (Total Invoiced, Collected MTD, Outstanding, ZRA Sync %), Filters, Table, Drawer (line-items, ZRA, ledger), CSV Export, Batch Billing
 */

(function(){
  const STORAGE_KEY = 'propertypro_v3';
  let filteredInvoices = [];
  let currentPage = 1;
  let pageSize = 50;
  let selectedInvoiceId = null;
  let currentTab = 'lineitems';
  let ctxInvoiceId = null;

  function getState(){ return window.state || {}; }
  function getInvoices(){ return getState().invoices || []; }
  function getProperties(){ return getState().properties || []; }
  function getTenants(){ return getState().tenants || []; }
  function getPayments(){ return getState().payments || []; }
  function getLeases(){ return getState().leases || []; }

  function openTenantContext(tenantId, propertyName, invoiceId){
    const tenant = getTenants().find(t=> t.id===tenantId);
    const propName = propertyName || tenant?.property || '';
    const lease = getLeases().find(l=> (l.tenantId===tenantId || l.tenant===tenant?.name) && l.status==='Active');
    if(lease && window.goToPage){
      window.goToPage('leases.html?id='+lease.id);
    } else if(tenantId && window.goToPage){
      // Fallback: open tenant then property units
      window.goToPage('tenants.html?id='+tenantId);
    } else if(propName && window.goToPage){
      window.goToPage('units.html?property='+encodeURIComponent(propName));
    }
  }
  function openPropertyUnits(propertyName){
    if(propertyName && window.goToPage){
      window.goToPage('units.html?property='+encodeURIComponent(propertyName));
    }
  }
  window.openTenantContext = openTenantContext;
  window.openPropertyUnits = openPropertyUnits;


  function fmtMoney(v){
    if(v==null) return 'ZMW 0';
    const num = Number(v);
    return 'ZMW ' + num.toLocaleString('en-ZM', {minimumFractionDigits:0, maximumFractionDigits:0});
  }
  function fmtMoneySmall(v){
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
  function fmtDateISO(d){ return d ? new Date(d).toISOString().slice(0,10) : ''; }

  function statusPill(status){
    const map = { Paid:'green', Unpaid:'amber', Partial:'blue', Overdue:'red', Draft:'gray' };
    const c = map[status]||'gray';
    return `<span class="pill ${c}">${status}</span>`;
  }
  function zraPill(status){
    const cls = {
      Validated:'zra-validated', Synced:'zra-synced', Pending:'zra-pending', Failed:'zra-failed', Queued:'zra-queued'
    }[status]||'zra-queued';
    const icon = status==='Validated' ? '✓' : status==='Failed' ? '✕' : '↻';
    return `<span class="pill ${cls}" title="${status}">${icon} ${status}</span>`;
  }
  function typePill(type){
    const map = { Rent:'blue', 'Service Charge':'violet', Utilities:'amber', Penalties:'red', VAT:'gray', Deposit:'gray' };
    return `<span class="pill ${map[type]||'gray'}">${type}</span>`;
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    window.initCommon && window.initCommon('finance-billing');
    // Ensure Layout loads
    setTimeout(()=>{
      populateFilters();
      bindEvents();
      renderKPIs();
      applyFilters();
      handleDeepLink();
    }, 150);
  });

  function handleDeepLink(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if(id){ setTimeout(()=>openDrawer(id), 400); }
  }

  function populateFilters(){
    const propSelect = document.getElementById('filterProperty');
    const batchProp = document.getElementById('batchProperty');
    const props = getProperties();
    const opts = '<option value="">All Properties</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if(propSelect) propSelect.innerHTML = opts;
    if(batchProp) batchProp.innerHTML = opts;
    updateBatchPreview();
  }

  function bindEvents(){
    document.getElementById('searchInputLocal')?.addEventListener('input', debounce(applyFilters, 300));
    ['filterProperty','filterType','filterStatus','filterZRA','filterFrom','filterTo'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('btnResetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('pageSize')?.addEventListener('change', e=>{ pageSize=parseInt(e.target.value); currentPage=1; renderTable(); });
    document.getElementById('prevPage')?.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; renderTable(); }});
    document.getElementById('nextPage')?.addEventListener('click', ()=>{ const max=Math.ceil(filteredInvoices.length/pageSize); if(currentPage<max){ currentPage++; renderTable(); }});
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);
    document.getElementById('btnBatchBilling')?.addEventListener('click', openBatchModal);
    document.getElementById('btnCloseBatchModal')?.addEventListener('click', closeBatchModal);
    document.getElementById('btnCancelBatch')?.addEventListener('click', closeBatchModal);
    document.getElementById('batchModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='batchModalBackdrop') closeBatchModal(); });
    document.getElementById('btnConfirmBatch')?.addEventListener('click', confirmBatchBilling);
    ['batchProperty','batchMonth','batchType','batchVAT','batchZRA'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', updateBatchPreview);
    });

    // Drawer
    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        document.querySelectorAll('.drawer-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        if(selectedInvoiceId) renderDrawerBody(selectedInvoiceId);
      });
    });
    document.getElementById('btnPrintInvoice')?.addEventListener('click', ()=>{ if(selectedInvoiceId) printInvoice(selectedInvoiceId); });
    document.getElementById('btnResyncZRA')?.addEventListener('click', ()=>{ if(selectedInvoiceId) resyncZRA(selectedInvoiceId); });
    document.getElementById('btnSendNotice')?.addEventListener('click', ()=>{ if(selectedInvoiceId) sendNotice(selectedInvoiceId); });
    document.getElementById('btnRecordPayment')?.addEventListener('click', ()=>{ if(selectedInvoiceId) recordPaymentPrompt(selectedInvoiceId); });

    // Confirm modal
    document.getElementById('confirmCancel')?.addEventListener('click', closeConfirm);
    document.getElementById('confirmBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='confirmBackdrop') closeConfirm(); });

    // Context menu
    document.addEventListener('click', e=>{
      const menu = document.getElementById('ctxMenu');
      if(menu && !menu.contains(e.target) && !e.target.closest('.dots-btn')) menu.classList.remove('open');
    });
  }

  function debounce(fn, delay){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

  function resetFilters(){
    document.getElementById('searchInputLocal').value='';
    document.getElementById('filterProperty').value='';
    document.getElementById('filterType').value='';
    document.getElementById('filterStatus').value='';
    document.getElementById('filterZRA').value='';
    document.getElementById('filterFrom').value='';
    document.getElementById('filterTo').value='';
    applyFilters();
  }

  function applyFilters(){
    const q = (document.getElementById('searchInputLocal')?.value||'').toLowerCase();
    const prop = document.getElementById('filterProperty')?.value||'';
    const type = document.getElementById('filterType')?.value||'';
    const status = document.getElementById('filterStatus')?.value||'';
    const zra = document.getElementById('filterZRA')?.value||'';
    const from = document.getElementById('filterFrom')?.value||'';
    const to = document.getElementById('filterTo')?.value||'';

    filteredInvoices = getInvoices().filter(inv=>{
      if(q){
        const hay = `${inv.id} ${inv.tenantName||inv.tenant} ${inv.propertyName||inv.property} ${inv.zraSmartInvoiceNo||''} ${inv.type} ${inv.status}`.toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(prop && inv.propertyId!==prop) return false;
      if(type && inv.type!==type && inv.invoiceType!==type) return false;
      if(status && inv.status!==status && inv.paymentStatus!==status) return false;
      if(zra && inv.zraStatus!==zra) return false;
      if(from && inv.issueDate < from) return false;
      if(to && inv.issueDate > to) return false;
      return true;
    }).sort((a,b)=> new Date(b.issueDate) - new Date(a.issueDate));

    currentPage = 1;
    renderTable();
    renderKPIs();
  }

  function renderKPIs(){
    const invoices = filteredInvoices.length ? filteredInvoices : getInvoices();
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);

    const totalInvoiced = invoices.reduce((s,i)=>s+(i.amount||0),0);
    const mtdInvoices = getInvoices().filter(i=> i.issueDate >= mtdStart);
    const collectedMTD = getPayments().filter(p=> p.date >= mtdStart && (p.status==='Confirmed'||p.status==='Reconciled')).reduce((s,p)=>s+(p.amount||0),0);
    const outstanding = invoices.reduce((s,i)=>s+(i.outstandingAmount||0),0);
    const zraTotal = invoices.length;
    const zraSynced = invoices.filter(i=> i.zraStatus==='Validated'||i.zraStatus==='Synced').length;
    const zraRate = zraTotal ? Math.round((zraSynced / zraTotal)*100) : 0;

    const totalPaid = getInvoices().filter(i=>i.status==='Paid').reduce((s,i)=>s+(i.amount||0),0);
    const overdue = invoices.filter(i=>i.status==='Overdue').length;

    const kpiGrid = document.getElementById('kpiGrid');
    if(!kpiGrid) return;
    kpiGrid.innerHTML = `
      <div class="kpi accent-blue">
        <div class="kpi-top"><span class="kpi-label">Total Invoiced</span><span class="kpi-icon blue">₿</span></div>
        <div class="kpi-value">${fmtMoneySmall(totalInvoiced)}</div>
        <div class="kpi-meta"><span class="trend neutral">${invoices.length} invoices</span><span>${fmtMoneySmall(totalPaid)} paid • ${overdue} overdue</span></div>
      </div>
      <div class="kpi accent-green">
        <div class="kpi-top"><span class="kpi-label">Collected (MTD)</span><span class="kpi-icon green">↑</span></div>
        <div class="kpi-value">${fmtMoneySmall(collectedMTD)}</div>
        <div class="kpi-meta"><span class="trend up">↗ ${mtdInvoices.length} issued MTD</span><span>Bank & Mobile Money</span></div>
      </div>
      <div class="kpi accent-amber">
        <div class="kpi-top"><span class="kpi-label">Outstanding Balance</span><span class="kpi-icon amber">!</span></div>
        <div class="kpi-value">${fmtMoneySmall(outstanding)}</div>
        <div class="kpi-meta"><span class="trend down">${invoices.filter(i=>i.outstandingAmount>0).length} open</span><span>Aged 0-90+ days</span></div>
      </div>
      <div class="kpi accent-slate">
        <div class="kpi-top"><span class="kpi-label">ZRA Sync Success Rate</span><span class="kpi-icon blue">ZRA</span></div>
        <div class="kpi-value">${zraRate}%</div>
        <div class="kpi-meta"><span class="trend ${zraRate>=90?'up': zraRate>=70 ? 'neutral' : 'down'}">${zraSynced}/${zraTotal} validated</span><span>Smart Invoice compliance</span></div>
      </div>
    `;

    // Also update header totals
    document.getElementById('countLabel').textContent = filteredInvoices.length;
    document.getElementById('totalLabel').textContent = fmtMoneySmall(filteredInvoices.reduce((s,i)=>s+(i.amount||0),0)).replace('ZMW ','');
    const outEl = document.getElementById('outstandingLabel');
    if(outEl) outEl.textContent = fmtMoneySmall(outstanding);
  }

  function renderTable(){
    const tbody = document.getElementById('invoicesTbody');
    const tableInfo = document.getElementById('tableInfo');
    if(!tbody) return;
    const total = filteredInvoices.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if(currentPage > maxPage) currentPage = maxPage;
    const start = (currentPage-1)*pageSize;
    const pageData = filteredInvoices.slice(start, start+pageSize);

    if(pageData.length===0){
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="ico">📄</div><h3>No invoices found</h3><p>Adjust filters or generate batch billing</p></div></td></tr>`;
      if(tableInfo) tableInfo.textContent = `Showing 0 of ${total}`;
      return;
    }

    tbody.innerHTML = pageData.map(inv=>{
      const dueClass = new Date(inv.dueDate) < new Date() && inv.status!=='Paid' ? 'style="color:#B91C1C;font-weight:700"' : '';
      return `<tr>
        <td><span class="mono" style="font-weight:700">${escapeHtml(inv.id)}</span></td>
        <td><div style="font-weight:600"><a href="#" style="color:#0F172A;font-weight:600;text-decoration:none" onclick="event.preventDefault(); window.openTenantContext(inv.tenantId, inv.propertyName||inv.property, inv.id); return false;">${escapeHtml(inv.tenantName||inv.tenant)} ↗</a></div><div style="font-size:11px;color:#64748B"><a href="#" style="color:#64748B;text-decoration:none" onclick="event.preventDefault(); window.openPropertyUnits(inv.propertyName||inv.property); return false;">${escapeHtml(inv.unitCode||'')} • ${escapeHtml((inv.propertyName||inv.property||'').slice(0,20))}</a></div></td>
        <td>${escapeHtml(inv.propertyName||inv.property)}</td>
        <td>${typePill(inv.type||inv.invoiceType)}</td>
        <td>${fmtDate(inv.issueDate)}</td>
        <td ${dueClass}>${fmtDate(inv.dueDate)}</td>
        <td class="amount">${fmtMoneySmall(inv.amount)}</td>
        <td><div style="display:flex;flex-direction:column;gap:2px"><span class="mono" style="font-size:11px;background:#0F172A;color:#FFF;padding:2px 6px;border-radius:4px;display:inline-block;width:fit-content">${escapeHtml((inv.zraSmartInvoiceNo||'').slice(0,18))}</span>${zraPill(inv.zraStatus)}</div></td>
        <td>${statusPill(inv.status)}<div style="font-size:11px;color:#64748B;margin-top:2px">${inv.outstandingAmount>0 ? fmtMoneySmall(inv.outstandingAmount)+' due' : 'Paid '+fmtMoneySmall(inv.paidAmount)}</div></td>
        <td><div style="display:flex;gap:4px"><button class="btn btn-sm" onclick="window.openInvoiceDrawer('${inv.id}')">View</button><button class="dots-btn" onclick="window.openInvoiceCtx(event,'${inv.id}')">⋮</button></div></td>
      </tr>`;
    }).join('');

    if(tableInfo) tableInfo.textContent = `Showing ${start+1}-${Math.min(start+pageSize, total)} of ${total} • Page ${currentPage}/${maxPage}`;
  }

  // Global helpers for inline onclick
  window.openInvoiceDrawer = openDrawer;
  window.openInvoiceCtx = (e,id)=>{
    e.stopPropagation();
    ctxInvoiceId = id;
    const menu = document.getElementById('ctxMenu');
    menu.innerHTML = `
      <div class="ctx-item" onclick="window.openInvoiceDrawer('${id}')">👁️ View Details</div>
      <div class="ctx-item" onclick="window.cloneInvoice('${id}')">📋 Duplicate</div>
      <div class="ctx-item" onclick="window.resyncZRAInline('${id}')">🔄 Resync ZRA</div>
      <div class="ctx-item" onclick="window.sendNoticeInline('${id}')">✉️ Send Notice</div>
      <div class="ctx-item danger" onclick="window.deleteInvoice('${id}')">🗑️ Void Invoice</div>
    `;
    menu.style.left = (e.clientX-10)+'px';
    menu.style.top = (e.clientY+6)+'px';
    menu.classList.add('open');
  };
  window.cloneInvoice = (id)=>{
    const inv = getInvoices().find(i=>i.id===id);
    if(!inv) return;
    const newId = `INV-${new Date().getFullYear()}-${String(getInvoices().length+1).padStart(4,'0')}`;
    const clone = {...inv, id:newId, status:'Draft', paymentStatus:'Draft', paidAmount:0, outstandingAmount:inv.amount, issueDate:new Date().toISOString().slice(0,10), dueDate:new Date(Date.now()+15*24*3600*1000).toISOString().slice(0,10), zraStatus:'Queued', zraSmartInvoiceNo:`ZRA-SI-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(getInvoices().length+1).padStart(6,'0')}-${Math.floor(1000+Math.random()*9000)}`};
    getState().invoices.unshift(clone);
    saveState();
    applyFilters();
    toast('Invoice duplicated as '+newId, 'success');
    document.getElementById('ctxMenu').classList.remove('open');
  };
  window.resyncZRAInline = (id)=>{ resyncZRA(id); document.getElementById('ctxMenu').classList.remove('open'); };
  window.sendNoticeInline = (id)=>{ sendNotice(id); document.getElementById('ctxMenu').classList.remove('open'); };
  window.deleteInvoice = (id)=>{
    document.getElementById('ctxMenu').classList.remove('open');
    showConfirm('Void Invoice', `Void invoice ${id}? This will mark as cancelled and keep audit trail.`, ()=>{ 
      const inv = getInvoices().find(i=>i.id===id);
      if(inv){ inv.status='Draft'; inv.paymentStatus='Draft'; inv.voided=true; inv.zraStatus='Failed'; saveState(); applyFilters(); closeDrawer(); toast('Invoice voided','success'); }
    });
  };

  function openDrawer(id){
    const inv = getInvoices().find(i=>i.id===id);
    if(!inv) return;
    selectedInvoiceId = id;
    document.getElementById('drawerTitle').textContent = inv.id;
    document.getElementById('drawerId').textContent = inv.id;
    document.getElementById('drawerStatus').className = `pill ${ ({Paid:'green',Unpaid:'amber',Partial:'blue',Overdue:'red',Draft:'gray'}[inv.status]||'gray') }`;
    document.getElementById('drawerStatus').textContent = inv.status;
    const zraEl = document.getElementById('drawerZRA');
    zraEl.className = `pill zra-${(inv.zraStatus||'queued').toLowerCase()}`;
    zraEl.textContent = inv.zraStatus;
    document.getElementById('drawerSubtitle').textContent = `${inv.tenantName||inv.tenant} • ${inv.propertyName||inv.property} • ${inv.type} • Due ${fmtDate(inv.dueDate)}`;

    document.getElementById('drawerSummary').innerHTML = `
      <div class="sum-item"><div class="l">Amount</div><div class="v">${fmtMoneySmall(inv.amount)}</div></div>
      <div class="sum-item"><div class="l">Paid / Outstanding</div><div class="v">${fmtMoneySmall(inv.paidAmount)} / <span style="color:#D97706">${fmtMoneySmall(inv.outstandingAmount)}</span></div></div>
      <div class="sum-item"><div class="l">Due</div><div class="v">${fmtDate(inv.dueDate)} • ${Math.floor((new Date(inv.dueDate)-new Date())/ (24*3600*1000))} days</div></div>
    `;

    renderDrawerBody(id);
    document.getElementById('drawerBackdrop').classList.add('open');
    document.getElementById('invoiceDrawer').classList.add('open');
  }

  function closeDrawer(){
    document.getElementById('drawerBackdrop').classList.remove('open');
    document.getElementById('invoiceDrawer').classList.remove('open');
    selectedInvoiceId = null;
  }

  function renderDrawerBody(id){
    const inv = getInvoices().find(i=>i.id===id);
    if(!inv) return;
    const body = document.getElementById('drawerBody');
    if(currentTab==='lineitems'){
      const totalBeforeTax = inv.totalBeforeTax || inv.baseRent || inv.amount;
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="margin:0;font-size:13px;font-weight:800">Line-item Breakdown</h4><span class="pill gray">${inv.paymentTerms||'Net 15'}</span></div>
        <table class="line-items-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            ${(inv.lineItems||[]).map(li=>`<tr><td>${escapeHtml(li.description)}</td><td>${li.qty}</td><td>${fmtMoneySmall(li.unitPrice)}</td><td><span class="pill gray" style="font-size:10px">${li.taxCode}</span></td><td style="text-align:right;font-weight:600">${fmtMoneySmall(li.amount)}</td></tr>`).join('')}
          </tbody>
          <tfoot>
            <tr><td colspan="4" style="text-align:right">Base Rent</td><td style="text-align:right">${fmtMoneySmall(inv.baseRent)}</td></tr>
            ${inv.proRata? `<tr><td colspan="4" style="text-align:right">Pro-rata</td><td style="text-align:right">${fmtMoneySmall(inv.proRata)}</td></tr>`:''}
            <tr><td colspan="4" style="text-align:right">Service Charge (15%)</td><td style="text-align:right">${fmtMoneySmall(inv.serviceChargeAmount)}</td></tr>
            ${inv.utilitiesAmount? `<tr><td colspan="4" style="text-align:right">Utilities</td><td style="text-align:right">${fmtMoneySmall(inv.utilitiesAmount)}</td></tr>`:''}
            ${inv.penaltyAmount? `<tr><td colspan="4" style="text-align:right">Penalties</td><td style="text-align:right;color:#B91C1C">${fmtMoneySmall(inv.penaltyAmount)}</td></tr>`:''}
            <tr><td colspan="4" style="text-align:right">VAT 16%</td><td style="text-align:right">${fmtMoneySmall(inv.vat)}</td></tr>
            <tr><td colspan="4" style="text-align:right">WHT 10% (deductible)</td><td style="text-align:right;color:#64748B">-${fmtMoneySmall(inv.withholdingTax).replace('ZMW ','')}</td></tr>
            <tr><td colspan="4" style="text-align:right;font-weight:800;font-size:14px">Total Payable</td><td style="text-align:right;font-weight:800;font-size:14px">${fmtMoneySmall(inv.amount)}</td></tr>
            <tr><td colspan="4" style="text-align:right">Outstanding</td><td style="text-align:right;color:#D97706;font-weight:800">${fmtMoneySmall(inv.outstandingAmount)}</td></tr>
          </tfoot>
        </table>
        <div style="margin-top:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569">
          <strong>Created by:</strong> ${escapeHtml(inv.createdBy||'System')} • ${fmtDate(inv.createdAt||inv.issueDate)}<br/>
          <strong>Tenant:</strong> <a href="#" style="color:#2563EB;font-weight:700;text-decoration:none" onclick="event.preventDefault(); const tId='${inv.tenantId||''}'; const prop='${(inv.propertyName||inv.property||'').replace(/'/g, "\\'")}'; const lease = (getLeases().find(l=> (l.tenantId===tId || l.tenant===inv.tenantName || l.tenant===inv.tenant) && l.status==='Active') ); if(window.goToPage){ if(lease){ window.goToPage('leases.html?id='+lease.id); } else if(tId){ window.goToPage('tenants.html?id='+tId); } else { window.goToPage('units.html?property='+encodeURIComponent(prop)); } } else { window.location.href='tenants.html?id='+tId; } return false;">${escapeHtml(inv.tenantName||inv.tenant)} (${escapeHtml(inv.tenantId||'')}) ↗</a>
          <span style="margin-left:8px;display:inline-flex;gap:6px">
            <button class="btn btn-ghost btn-sm" style="height:22px;padding:0 6px;font-size:11px" onclick="event.preventDefault(); const prop='${(inv.propertyName||inv.property||'').replace(/'/g, "\\'")}'; if(window.goToPage){ window.goToPage('units.html?property='+encodeURIComponent(prop)); }">View Unit</button>
            <button class="btn btn-ghost btn-sm" style="height:22px;padding:0 6px;font-size:11px" onclick="event.preventDefault(); const tId='${inv.tenantId||''}'; const lease = (getLeases().find(l=> (l.tenantId===tId) && l.status==='Active') ); if(lease && window.goToPage){ window.goToPage('leases.html?id='+lease.id); } else if(tId && window.goToPage){ window.goToPage('tenants.html?id='+tId); }">Active Lease</button>
          </span><br/>
          <strong>Property / Unit:</strong> <a href="#" style="color:#2563EB;text-decoration:none" onclick="event.preventDefault(); const prop='${(inv.propertyName||inv.property||'').replace(/'/g, "\\'")}'; if(window.goToPage){ window.goToPage('units.html?property='+encodeURIComponent(prop)); } return false;">${escapeHtml(inv.propertyName||inv.property)} / ${escapeHtml(inv.unitCode||'')} ↗</a>
        </div>
      `;
    } else if(currentTab==='zra'){
      body.innerHTML = `
        <div class="zra-card">
          <div class="zra-head"><span style="font-weight:800;font-size:13px">ZRA Smart Invoice</span>${zraPill(inv.zraStatus)}</div>
          <div class="zra-no">${escapeHtml(inv.zraSmartInvoiceNo||'')}</div>
          <div class="zra-meta" style="margin-top:10px">
            <dt>Status</dt><dd>${escapeHtml(inv.zraStatus)} ${inv.zraStatus==='Validated'?'✓ Verified by ZRA':''}</dd>
            <dt>Sync Date</dt><dd>${inv.zraSyncDate? fmtDate(inv.zraSyncDate): 'Not yet synced'}</dd>
            <dt>Validation</dt><dd style="color:${inv.zraStatus==='Failed'?'#B91C1C':'#15803D'}">${escapeHtml(inv.zraValidationMessage||'')}</dd>
            <dt>Invoice ID</dt><dd class="mono">${escapeHtml(inv.id)}</dd>
            <dt>Amount</dt><dd>${fmtMoneySmall(inv.amount)} • VAT ${fmtMoneySmall(inv.vat)}</dd>
            <dt>TPIN</dt><dd>${Math.floor(1000000000+Math.random()*9000000000)} (demo)</dd>
          </div>
        </div>
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px 12px;font-size:12px;color:#1E40AF">
          <strong>ZRA Compliance:</strong> This invoice ${inv.zraStatus==='Validated'||inv.zraStatus==='Synced' ? 'has been validated and synced to ZRA Smart Invoice system' : 'is pending validation'}. Hash and QR code would be embedded in printed invoice. ZRA API endpoint: https://eservices.zra.org.zm/smart-invoice
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-sm" onclick="window.printZRA('${inv.id}')">Download ZRA PDF</button>
          <button class="btn btn-primary btn-sm" onclick="window.resyncZRAInline('${inv.id}')">Force Resync</button>
        </div>
      `;
    } else if(currentTab==='ledger'){
      body.innerHTML = `
        <h4 style="margin:0 0 8px;font-size:13px;font-weight:800">Ledger History</h4>
        <div class="timeline">
          ${(inv.ledgerHistory||[]).map((lh, idx)=>`<div class="tl ${idx===0?'done':'active'}"><div style="display:flex;justify-content:space-between"><span style="font-weight:600;font-size:12.5px">${escapeHtml(lh.type)}</span><span style="font-size:11px;color:#64748B">${fmtDate(lh.date)}</span></div><div style="font-size:12px;color:#475569;margin-top:2px">Ref: ${escapeHtml(lh.reference)} • ${lh.amount<0? 'Credit':'Debit'} ${fmtMoneySmall(Math.abs(lh.amount))} • By ${escapeHtml(lh.user)}</div><div style="font-size:11px;color:#64748B">Balance: ${fmtMoneySmall(lh.balance)}</div></div>`).join('')}
          <div class="tl active"><div style="display:flex;justify-content:space-between"><span style="font-weight:600;font-size:12.5px">Current Outstanding</span><span style="font-size:11px;color:#D97706;font-weight:700">${fmtMoneySmall(inv.outstandingAmount)}</span></div><div style="font-size:12px;color:#475569;margin-top:2px">Next action: ${inv.status==='Overdue'?'Demand letter':'Payment reminder'} • Due ${fmtDate(inv.dueDate)}</div></div>
        </div>
      `;
    } else if(currentTab==='payments'){
      const relatedPays = getPayments().filter(p=> (p.invoiceIds||[]).includes(inv.id) || p.invoiceId===inv.id);
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h4 style="margin:0;font-size:13px;font-weight:800">Allocated Payments (${relatedPays.length})</h4><button class="btn btn-sm" onclick="window.recordPayment('${inv.id}')">+ Payment</button></div>
        ${relatedPays.length? `<table class="line-items-table"><thead><tr><th>ID</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>${relatedPays.map(p=>`<tr><td class="mono">${p.id}</td><td>${fmtDate(p.date||p.transactionDate)}</td><td><span class="pill ${p.type==='Mobile Money'?'violet':'blue'}">${escapeHtml(p.method||p.paymentMethod)}</span><div style="font-size:11px;color:#64748B">${escapeHtml(p.bankName||'')}</div></td><td class="amount">${fmtMoneySmall(p.amount)}</td><td>${statusPill(p.status)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty-state"><div class="ico">💳</div><h3>No payments yet</h3><p>Record a payment from Bank or Mobile Money</p></div>'}
      `;
    } else {
      body.innerHTML = `
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Tenant</label><div class="form-input" style="display:flex;align-items:center;background:#F8FAFC">${escapeHtml(inv.tenantName||inv.tenant)}</div></div>
          <div class="form-group"><label class="form-label">Property</label><div class="form-input" style="display:flex;align-items:center;background:#F8FAFC">${escapeHtml(inv.propertyName||inv.property)}</div></div>
          <div class="form-group"><label class="form-label">Type</label><div class="form-input" style="display:flex;align-items:center;background:#F8FAFC">${escapeHtml(inv.type)}</div></div>
          <div class="form-group"><label class="form-label">Status</label><div class="form-input" style="display:flex;align-items:center;background:#F8FAFC">${escapeHtml(inv.status)}</div></div>
          <div class="form-group"><label class="form-label">Issue Date</label><div class="form-input" style="display:flex;align-items:center;background:#F8FAFC">${fmtDate(inv.issueDate)}</div></div>
          <div class="form-group"><label class="form-label">Due Date</label><div class="form-input" style="display:flex;align-items:center;background:#F8FAFC">${fmtDate(inv.dueDate)}</div></div>
          <div class="form-group full"><label class="form-label">Description</label><div class="form-textarea" style="background:#F8FAFC">${escapeHtml(inv.description||'')}</div></div>
        </div>
      `;
    }
  }

  // Actions
  function resyncZRA(id){
    const inv = getInvoices().find(i=>i.id===id);
    if(!inv) return;
    inv.zraStatus = 'Synced';
    inv.zraSyncDate = new Date().toISOString().slice(0,10);
    inv.zraValidationMessage = 'Validated by ZRA Smart Invoice - Hash: '+Math.random().toString(36).slice(2,10).toUpperCase()+' - Synced at '+new Date().toLocaleString();
    inv.ledgerHistory = inv.ledgerHistory||[];
    inv.ledgerHistory.push({ id: `${inv.id}-LH-${Date.now()}`, date: new Date().toISOString().slice(0,10), type: 'ZRA Resync', amount: 0, reference: inv.zraSmartInvoiceNo, user: 'System', balance: inv.outstandingAmount });
    saveState();
    renderTable();
    if(selectedInvoiceId===id) renderDrawerBody(id);
    toast('ZRA resync successful - Validated', 'success');
  }
  function sendNotice(id){
    const inv = getInvoices().find(i=>i.id===id);
    if(!inv) return;
    inv.ledgerHistory = inv.ledgerHistory||[];
    inv.ledgerHistory.push({ id: `${inv.id}-LH-${Date.now()}`, date: new Date().toISOString().slice(0,10), type: 'Notice Sent', amount: 0, reference: 'Email/SMS to '+inv.tenantName, user: 'Chanda Mwanza', balance: inv.outstandingAmount });
    saveState();
    if(selectedInvoiceId===id) renderDrawerBody(id);
    toast(`Notice sent to ${inv.tenantName} for ${inv.id}`, 'success');
  }
  function recordPaymentPrompt(id){
    const inv = getInvoices().find(i=>i.id===id);
    if(!inv) return;
    const amount = prompt(`Record payment for ${inv.id}\nOutstanding: ${fmtMoneySmall(inv.outstandingAmount)}\nEnter amount:`, String(inv.outstandingAmount));
    if(!amount) return;
    const num = Number(amount.replace(/[^0-9.-]/g,''));
    if(isNaN(num)||num<=0){ toast('Invalid amount','error'); return; }
    const method = prompt('Payment method (Bank Transfer / MTN Mobile Money / Airtel Money / Cheque):', 'Bank Transfer')||'Bank Transfer';
    const isMobile = method.toLowerCase().includes('momo') || method.toLowerCase().includes('mobile') || method.toLowerCase().includes('airtel') || method.toLowerCase().includes('mtn');
    const pay = {
      id: `PAY-${new Date().getFullYear()}-${String(getPayments().length+1).padStart(4,'0')}`,
      tenantId: inv.tenantId,
      tenantName: inv.tenantName,
      tenant: inv.tenantName,
      propertyId: inv.propertyId,
      propertyName: inv.propertyName,
      invoiceIds: [inv.id],
      invoiceId: inv.id,
      allocatedInvoices: [inv.id],
      amount: num,
      allocatedAmount: num,
      method: method,
      paymentMethod: method,
      bankName: isMobile ? (method.includes('Airtel')?'Airtel Money':'MTN MoMo') : 'ZANACO',
      bank: isMobile ? 'Mobile Money' : 'ZANACO',
      type: isMobile ? 'Mobile Money' : 'Bank',
      channel: isMobile ? 'Mobile Money' : 'Bank',
      reference: `${isMobile?'MOMO':'BANK'}-${Math.floor(100000+Math.random()*900000)}`,
      transactionDate: new Date().toISOString().slice(0,10),
      date: new Date().toISOString().slice(0,10),
      status: 'Confirmed',
      reconciledBy: null,
      accountNumber: !isMobile ? '**** **** '+Math.floor(1000+Math.random()*9000) : null,
      mobileNumber: isMobile ? '+2609'+Math.floor(70000000+Math.random()*29999999) : null,
      createdAt: new Date().toISOString().slice(0,10)
    };
    getState().payments.unshift(pay);
    inv.paidAmount = (inv.paidAmount||0)+num;
    inv.outstandingAmount = Math.max(0, (inv.amount||0) - inv.paidAmount);
    if(inv.outstandingAmount===0){ inv.status='Paid'; inv.paymentStatus='Paid'; } else if(inv.paidAmount>0){ inv.status='Partial'; inv.paymentStatus='Partial'; }
    inv.ledgerHistory = inv.ledgerHistory||[];
    inv.ledgerHistory.push({ id: `${inv.id}-LH-${Date.now()}`, date: pay.date, type: 'Payment Received', amount: -num, reference: pay.id, user: 'Finance', balance: inv.outstandingAmount });
    saveState();
    renderTable();
    renderKPIs();
    if(selectedInvoiceId===id) renderDrawerBody(id);
    toast(`Payment of ${fmtMoneySmall(num)} recorded for ${inv.id}`, 'success');
  }
  window.recordPayment = recordPaymentPrompt;
  window.printZRA = (id)=>{ toast('Downloading ZRA Smart Invoice PDF for '+id+' (demo)', 'success'); };
  window.printInvoice = printInvoice;
  function printInvoice(id){
    const inv = getInvoices().find(i=>i.id===id);
    if(!inv) return;
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>${inv.id}</title><style>body{font-family:sans-serif;padding:24px;color:#0F172A} table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #E2E8F0;padding:8px;text-align:left} th{background:#F8FAFC;font-size:11px;text-transform:uppercase}</style></head><body><h2>${inv.id} - ${inv.tenantName}</h2><p>${inv.propertyName} • ${inv.type} • ${inv.status}</p><p>ZRA Smart Invoice: ${inv.zraSmartInvoiceNo} - ${inv.zraStatus}</p><table><tr><th>Description</th><th>Amount</th></tr>${(inv.lineItems||[]).map(li=>`<tr><td>${li.description}</td><td>ZMW ${li.amount}</td></tr>`).join('')}<tr><td><strong>Total</strong></td><td><strong>ZMW ${inv.amount}</strong></td></tr></table><p style="margin-top:24px;font-size:11px;color:#64748B">Generated by PropertyPro Zambia Ltd • ZRA Smart Invoice Compliant</p></body></html>`);
    w.document.close();
    w.print();
  }

  // Batch Billing
  function openBatchModal(){
    document.getElementById('batchModalBackdrop').classList.add('open');
    updateBatchPreview();
  }
  function closeBatchModal(){ document.getElementById('batchModalBackdrop').classList.remove('open'); }
  function updateBatchPreview(){
    const propId = document.getElementById('batchProperty')?.value||'';
    const month = document.getElementById('batchMonth')?.value||'2026-10';
    const type = document.getElementById('batchType')?.value||'Rent';
    const props = propId ? getProperties().filter(p=>p.id===propId) : getProperties();
    const tenantsCount = getTenants().filter(t=> !propId || (t.propertyIds||[]).includes(propId) || t.property===props[0]?.name ).length || Math.min(12, props.reduce((s,p)=>s+(p.occupied||0),0));
    const avgRent = 35000;
    const est = tenantsCount * avgRent;
    const preview = document.getElementById('batchPreview');
    if(preview) preview.textContent = `Will generate ${tenantsCount} invoices for ${propId? props[0]?.name : 'All Properties'} for ${month} • Type: ${type} • Total est. ${fmtMoneySmall(est)} • VAT 16% inclusive`;
    const btn = document.getElementById('btnConfirmBatch');
    if(btn) btn.textContent = `Generate ${tenantsCount} Invoices`;
  }
  function confirmBatchBilling(){
    const propId = document.getElementById('batchProperty').value||'';
    const monthStr = document.getElementById('batchMonth').value||'2026-10';
    const type = document.getElementById('batchType').value||'Rent';
    const dueDay = document.getElementById('batchDueDay').value||'5';
    const vatApplicable = document.getElementById('batchVAT').value==='yes';
    const autoZRA = document.getElementById('batchZRA').value==='yes';

    const [year, month] = monthStr.split('-').map(Number);
    const issueDate = new Date(year, month-1, 1);
    const dueDate = dueDay==='30' ? new Date(year, month-1, 30) : new Date(year, month, parseInt(dueDay)-1);

    const props = propId ? getProperties().filter(p=>p.id===propId) : getProperties().slice(0,6);
    const targetTenants = getTenants().filter(t=>{
      if(propId) return (t.propertyIds||[]).includes(propId) || t.property===props[0]?.name;
      return true;
    }).slice(0, 24);

    const tenantsToBill = targetTenants.length ? targetTenants : getProperties().slice(0,12).map((p,i)=>({ id:`T-BATCH-${i}`, name:`Tenant ${i+1} for ${p.name}`, property:p.name, propertyId:p.id }));

    let created = 0;
    tenantsToBill.forEach(tenant=>{
      const prop = getProperties().find(p=>p.id===tenant.propertyId) || props[Math.floor(Math.random()*props.length)] || getProperties()[0];
      const baseRent = tenant.monthlyRent || tenant.rent || Math.floor(15000+Math.random()*80000);
      const serviceCharge = Math.floor(baseRent*0.15);
      const vat = vatApplicable ? Math.round((baseRent+serviceCharge)*0.16) : 0;
      const amount = baseRent+serviceCharge+vat;
      const invId = `INV-${year}-${String(getInvoices().length+created+1).padStart(4,'0')}`;
      const zraNo = `ZRA-SI-${year}${String(month).padStart(2,'0')}-${String(getInvoices().length+created+1).padStart(6,'0')}-${Math.floor(1000+Math.random()*9000)}`;
      const invoice = {
        id: invId,
        tenantId: tenant.id,
        tenant: tenant.name,
        tenantName: tenant.name,
        propertyId: prop.id,
        property: prop.name,
        propertyName: prop.name,
        unitId: prop.id+'-U-001',
        unitCode: prop.id+'-1',
        type: type==='All'?'Rent':type,
        invoiceType: type==='All'?'Rent':type,
        status: 'Unpaid',
        paymentStatus: 'Unpaid',
        issueDate: issueDate.toISOString().slice(0,10),
        dueDate: dueDate.toISOString().slice(0,10),
        due: dueDate.toISOString().slice(0,10),
        amount: amount,
        baseRent: baseRent,
        proRata: 0,
        serviceChargeAmount: serviceCharge,
        utilitiesAmount: 0,
        penaltyAmount: 0,
        totalBeforeTax: baseRent+serviceCharge,
        vat: vat,
        withholdingTax: Math.round(baseRent*0.10),
        totalTax: vat,
        paidAmount: 0,
        outstandingAmount: amount,
        currency: 'ZMW',
        zraSmartInvoiceNo: zraNo,
        zraSmartInvoice: zraNo,
        zraStatus: autoZRA ? 'Queued' : 'Pending',
        zraSyncDate: null,
        zraValidationMessage: autoZRA ? 'Queued for ZRA Smart Invoice submission' : 'Manual ZRA submission required',
        ledgerHistory: [{ id: `${invId}-LH-1`, date: issueDate.toISOString().slice(0,10), type: 'Invoice Created', amount: amount, reference: invId, user: 'System', balance: amount }],
        lineItems: [
          { id: `${invId}-LI-1`, description: 'Base Rent - '+monthStr, qty:1, unitPrice:baseRent, amount:baseRent, taxCode:'STD' },
          { id: `${invId}-LI-2`, description: 'Service Charge (15%)', qty:1, unitPrice:serviceCharge, amount:serviceCharge, taxCode:'STD' },
          ...(vatApplicable? [{ id: `${invId}-LI-VAT`, description:'VAT 16%', qty:1, unitPrice:vat, amount:vat, taxCode:'VAT' }] : []),
        ],
        paymentTerms: `Net ${dueDay}`,
        createdBy: 'Chanda Mwanza',
        createdAt: issueDate.toISOString().slice(0,10),
        description: `${type} billing for ${monthStr}`
      };
      getState().invoices.unshift(invoice);
      created++;
    });

    saveState();
    closeBatchModal();
    applyFilters();
    toast(`${created} invoices generated for ${monthStr} • ZRA ${autoZRA?'queued':'pending'}`, 'success');
  }

  // CSV Export
  function exportCSV(){
    const data = filteredInvoices.map(inv=>({
      InvoiceID: inv.id,
      Tenant: inv.tenantName||inv.tenant,
      TenantID: inv.tenantId,
      Property: inv.propertyName||inv.property,
      PropertyID: inv.propertyId,
      Type: inv.type||inv.invoiceType,
      IssueDate: inv.issueDate,
      DueDate: inv.dueDate,
      Amount_ZMW: inv.amount,
      BaseRent: inv.baseRent,
      ServiceCharge: inv.serviceChargeAmount,
      VAT: inv.vat,
      WHT: inv.withholdingTax,
      PaidAmount: inv.paidAmount,
      Outstanding: inv.outstandingAmount,
      PaymentStatus: inv.status,
      ZRA_SmartInvoiceNo: inv.zraSmartInvoiceNo,
      ZRA_Status: inv.zraStatus,
      ZRA_SyncDate: inv.zraSyncDate||'',
      Currency: inv.currency||'ZMW'
    }));
    if(data.length===0){ toast('No data to export','error'); return; }

    // Try XLSX if available, else CSV blob
    if(window.XLSX){
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
      const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
      const blob = new Blob([wbout], {type:'application/octet-stream'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PropertyPro_Invoices_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${data.length} invoices to Excel`, 'success');
    } else {
      const headers = Object.keys(data[0]);
      const csv = [headers.join(','), ...data.map(row=> headers.map(h=> JSON.stringify(row[h]??'')).join(','))].join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PropertyPro_Invoices_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${data.length} invoices to CSV`, 'success');
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
    el.style.cssText=`padding:10px 14px;border-radius:8px;border:1px solid #E2E8F0;background:#FFF;box-shadow:0 8px 24px rgba(15,23,42,.12);font-size:13px;font-weight:600;max-width:360px;${type==='success'?'border-color:#BBF7D0;background:#F0FDF4;color:#15803D': type==='error'?'border-color:#FECACA;background:#FEF2F2;color:#B91C1C':''}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, 3000);
  }
  function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  window.escapeHtml = escapeHtml;
  function saveState(){
    try{
      const s = getState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      try{
        window.state = s;
        window.dispatchEvent(new CustomEvent('propertypro:stateUpdated', { detail: s }));
      }catch(e){}
    }catch(e){}
  }
})();

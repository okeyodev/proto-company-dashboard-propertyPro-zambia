/**
 * Finance Payments & Receipts - PropertyPro Zambia Ltd v3
 * Page: finance-payments.html
 * KPIs: Total Received MTD, Mobile Money, Bank Transfers, Unallocated
 * Filters: Receipt #, Tenant, Channel, Status
 * Features: Log Manual Payment + Auto-Reconcile Ledger (FIFO oldest open invoices)
 */

(function(){
  const STORAGE_KEY = 'propertypro_v3';
  let filteredPayments = [];
  let currentPage = 1;
  let pageSize = 50;
  let selectedPaymentId = null;
  let currentTab = 'allocation';
  let ctxPaymentId = null;

  function getState(){ return window.state || {}; }
  function getPayments(){ return getState().payments || []; }
  function getInvoices(){ return getState().invoices || []; }
  function getProperties(){ return getState().properties || []; }
  function getTenants(){ return getState().tenants || []; }

  function fmtMoney(v){
    if(v==null) return 'ZMW 0';
    return 'ZMW ' + Number(v).toLocaleString('en-ZM', {minimumFractionDigits:0, maximumFractionDigits:0});
  }
  function fmtMoneySmall(v){ return 'ZMW ' + Number(v||0).toLocaleString('en-ZM'); }
  function fmtDate(d){
    if(!d) return '—';
    try{
      const dt = new Date(d);
      if(isNaN(dt)) return d;
      return dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    }catch{return d}
  }

  function statusPill(status){
    const map = { Allocated:'blue', Unallocated:'amber', Reconciled:'green', Confirmed:'green', Pending:'gray', Failed:'red', Partial:'blue' };
    return `<span class="pill ${map[status]||'gray'}">${status}</span>`;
  }
  function channelPill(channel, type){
    const isMomo = (channel||'').toLowerCase().includes('mtn') || (channel||'').toLowerCase().includes('airtel') || (type==='Mobile Money') || channel==='MTN MoMo';
    const cls = isMomo ? 'violet' : channel?.includes('Stanbic') || channel?.includes('ZANACO') || channel?.includes('Bank') ? 'blue' : 'gray';
    const icon = isMomo ? '📱' : '🏦';
    return `<span class="pill ${cls}">${icon} ${escapeHtml(channel||type||'Bank')}</span>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.initCommon && window.initCommon('finance-payments');
    setTimeout(()=>{
      populateFilters();
      bindEvents();
      renderKPIs();
      applyFilters();
      handleDeepLink();
      // Set default date to today
      const today = new Date().toISOString().slice(0,10);
      const dateEl = document.getElementById('payDate');
      if(dateEl && !dateEl.value) dateEl.value = today;
    }, 180);
  });

  function handleDeepLink(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if(id){ setTimeout(()=>openDrawer(id), 450); }
  }

  function populateFilters(){
    const propSelect = document.getElementById('filterProperty');
    const payProp = document.getElementById('payProperty');
    const tenantSelect = document.getElementById('payTenant');
    const props = getProperties();
    const tenants = getTenants();
    const propOpts = '<option value="">All Properties</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if(propSelect) propSelect.innerHTML = propOpts;
    if(payProp) payProp.innerHTML = '<option value="">Auto from tenant</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if(tenantSelect){
      tenantSelect.innerHTML = '<option value="">Select Tenant</option>' + tenants.slice(0,200).map(t=>`<option value="${t.id}" data-prop="${(t.propertyIds||[])[0]||''}">${escapeHtml(t.name)} — ${escapeHtml(t.property||t.city||'')}</option>`).join('');
    }
  }

  function bindEvents(){
    document.getElementById('searchInputLocal')?.addEventListener('input', debounce(applyFilters, 300));
    ['filterChannel','filterStatus','filterProperty','filterFrom','filterTo'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('btnResetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('pageSize')?.addEventListener('change', e=>{ pageSize=parseInt(e.target.value); currentPage=1; renderTable(); });
    document.getElementById('prevPage')?.addEventListener('click', ()=>{ if(currentPage>1){ currentPage--; renderTable(); }});
    document.getElementById('nextPage')?.addEventListener('click', ()=>{ const max=Math.ceil(filteredPayments.length/pageSize); if(currentPage<max){ currentPage++; renderTable(); }});
    document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);
    document.getElementById('btnLogPayment')?.addEventListener('click', openPaymentModal);
    document.getElementById('btnAutoReconcile')?.addEventListener('click', openReconcileModal);

    // Payment modal
    document.getElementById('btnClosePaymentModal')?.addEventListener('click', closePaymentModal);
    document.getElementById('btnCancelPayment')?.addEventListener('click', closePaymentModal);
    document.getElementById('paymentModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='paymentModalBackdrop') closePaymentModal(); });
    document.getElementById('btnConfirmPayment')?.addEventListener('click', confirmPayment);
    document.getElementById('payTenant')?.addEventListener('change', onTenantChange);
    document.getElementById('payAmount')?.addEventListener('input', updatePayPreview);
    document.getElementById('payChannel')?.addEventListener('change', updatePayPreview);

    // Reconcile modal
    document.getElementById('btnCloseReconcileModal')?.addEventListener('click', closeReconcileModal);
    document.getElementById('btnCancelReconcile')?.addEventListener('click', closeReconcileModal);
    document.getElementById('reconcileModalBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='reconcileModalBackdrop') closeReconcileModal(); });
    document.getElementById('btnConfirmReconcile')?.addEventListener('click', confirmReconcileAll);

    // Drawer
    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeDrawer);
    document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);
    document.querySelectorAll('.drawer-tab').forEach(tab=>{
      tab.addEventListener('click', ()=>{
        document.querySelectorAll('.drawer-tab').forEach(t=>t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        if(selectedPaymentId) renderDrawerBody(selectedPaymentId);
      });
    });
    document.getElementById('btnPrintReceipt')?.addEventListener('click', ()=>{ if(selectedPaymentId) printReceipt(selectedPaymentId); });
    document.getElementById('btnViewTenant')?.addEventListener('click', ()=>{ 
      const pay = getPayments().find(p=>p.id===selectedPaymentId);
      if(pay) window.location.href = `../pages/tenants.html?id=${pay.tenantId}`;
    });
    document.getElementById('btnUnallocate')?.addEventListener('click', ()=>{ if(selectedPaymentId) unallocatePayment(selectedPaymentId); });
    document.getElementById('btnReconcileOne')?.addEventListener('click', ()=>{ if(selectedPaymentId) reconcileSinglePayment(selectedPaymentId); });

    // Confirm
    document.getElementById('confirmCancel')?.addEventListener('click', closeConfirm);
    document.getElementById('confirmBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='confirmBackdrop') closeConfirm(); });

    document.addEventListener('click', e=>{
      const menu = document.getElementById('ctxMenu');
      if(menu && !menu.contains(e.target) && !e.target.closest('.dots-btn')) menu.classList.remove('open');
    });
  }

  function debounce(fn, delay){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); }; }

  function resetFilters(){
    document.getElementById('searchInputLocal').value='';
    document.getElementById('filterChannel').value='';
    document.getElementById('filterStatus').value='';
    document.getElementById('filterProperty').value='';
    document.getElementById('filterFrom').value='';
    document.getElementById('filterTo').value='';
    applyFilters();
  }

  function getAllocationStatus(payment){
    if(payment.status==='Failed') return 'Failed';
    if(payment.status==='Reconciled') return 'Reconciled';
    if(payment.status==='Pending') return 'Pending';
    const alloc = payment.allocatedAmount || 0;
    const total = payment.amount || 0;
    const hasInvoices = (payment.invoiceIds && payment.invoiceIds.length>0) || (payment.allocatedInvoices && payment.allocatedInvoices.length>0);
    if(!hasInvoices || alloc===0) return 'Unallocated';
    if(alloc >= total) return 'Allocated';
    return 'Allocated'; // partial still counts as allocated but with remainder
  }

  function applyFilters(){
    const q = (document.getElementById('searchInputLocal')?.value||'').toLowerCase();
    const channel = document.getElementById('filterChannel')?.value||'';
    const status = document.getElementById('filterStatus')?.value||'';
    const prop = document.getElementById('filterProperty')?.value||'';
    const from = document.getElementById('filterFrom')?.value||'';
    const to = document.getElementById('filterTo')?.value||'';

    filteredPayments = getPayments().filter(pay=>{
      if(q){
        const hay = `${pay.id} ${pay.tenantName||pay.tenant} ${pay.reference||''} ${pay.bankName||''} ${pay.method||''}`.toLowerCase();
        if(!hay.includes(q)) return false;
      }
      if(channel){
        const ch = (pay.method||pay.paymentMethod||pay.bankName||'').toLowerCase();
        const bank = (pay.bankName||'').toLowerCase();
        const target = channel.toLowerCase();
        if(!ch.includes(target) && !bank.includes(target) && !(pay.channel||'').toLowerCase().includes(target)){
          // special handling for MTN MoMo vs MTN Mobile Money
          if(target==='mtn mobile money' && !(ch.includes('mtn')||bank.includes('mtn'))) return false;
          else if(target!=='mtn mobile money' && !ch.includes(target) && !bank.includes(target)) return false;
        }
      }
      if(status){
        const allocStatus = getAllocationStatus(pay);
        if(allocStatus!==status && pay.status!==status) return false;
      }
      if(prop && pay.propertyId!==prop) return false;
      if(from && (pay.date||pay.transactionDate) < from) return false;
      if(to && (pay.date||pay.transactionDate) > to) return false;
      return true;
    }).sort((a,b)=> new Date(b.date||b.transactionDate) - new Date(a.date||a.transactionDate));

    currentPage = 1;
    renderTable();
    renderKPIs();
  }

  function renderKPIs(){
    const payments = filteredPayments.length ? filteredPayments : getPayments();
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);

    const mtdPayments = getPayments().filter(p=> (p.date||p.transactionDate) >= mtdStart && (p.status==='Confirmed'||p.status==='Reconciled'||p.status==='Allocated'));
    const totalReceivedMTD = mtdPayments.reduce((s,p)=>s+(p.amount||0),0);
    const momoMTD = mtdPayments.filter(p=> (p.type==='Mobile Money') || (p.channel==='Mobile Money') || (p.method||'').toLowerCase().includes('mtn') || (p.method||'').toLowerCase().includes('airtel') || (p.bankName||'').includes('MoMo') || (p.bankName||'').includes('Airtel')).reduce((s,p)=>s+(p.amount||0),0);
    const bankMTD = mtdPayments.filter(p=> (p.type==='Bank') || (p.channel==='Bank') || (p.method||'').includes('Bank Transfer')).reduce((s,p)=>s+(p.amount||0),0);
    
    const unallocatedFunds = getPayments().filter(p=> getAllocationStatus(p)==='Unallocated').reduce((s,p)=>s+(p.amount - (p.allocatedAmount||0)),0);
    const unallocatedCount = getPayments().filter(p=> getAllocationStatus(p)==='Unallocated').length;
    const reconciledCount = getPayments().filter(p=> getAllocationStatus(p)==='Reconciled').length;

    const kpiGrid = document.getElementById('kpiGrid');
    if(!kpiGrid) return;
    kpiGrid.innerHTML = `
      <div class="kpi accent-green">
        <div class="kpi-top"><span class="kpi-label">Total Received (MTD)</span><span class="kpi-icon green">₿</span></div>
        <div class="kpi-value">${fmtMoneySmall(totalReceivedMTD)}</div>
        <div class="kpi-meta"><span class="trend up">↗ ${mtdPayments.length} receipts</span><span>${fmtDate(mtdStart)} → today</span></div>
      </div>
      <div class="kpi accent-blue">
        <div class="kpi-top"><span class="kpi-label">Mobile Money Collections</span><span class="kpi-icon blue">📱</span></div>
        <div class="kpi-value">${fmtMoneySmall(momoMTD)}</div>
        <div class="kpi-meta"><span class="trend neutral">Airtel • MTN</span><span>${mtdPayments.filter(p=> (p.type==='Mobile Money')).length} txn MTD</span></div>
      </div>
      <div class="kpi accent-slate">
        <div class="kpi-top"><span class="kpi-label">Direct Bank Transfers</span><span class="kpi-icon">🏦</span></div>
        <div class="kpi-value">${fmtMoneySmall(bankMTD)}</div>
        <div class="kpi-meta"><span class="trend up">Stanbic • ZANACO • FNB</span><span>Reconciled ${reconciledCount}</span></div>
      </div>
      <div class="kpi accent-amber">
        <div class="kpi-top"><span class="kpi-label">Unallocated Funds</span><span class="kpi-icon amber">!</span></div>
        <div class="kpi-value">${fmtMoneySmall(unallocatedFunds)}</div>
        <div class="kpi-meta"><span class="trend down">${unallocatedCount} unallocated</span><span>Requires matching</span></div>
      </div>
    `;

    document.getElementById('countLabel').textContent = filteredPayments.length;
    document.getElementById('totalLabel').textContent = fmtMoneySmall(filteredPayments.reduce((s,p)=>s+(p.amount||0),0)).replace('ZMW ','');
    const unallocEl = document.getElementById('unallocLabel');
    if(unallocEl) unallocEl.textContent = fmtMoneySmall(unallocatedFunds);
  }

  function renderTable(){
    const tbody = document.getElementById('paymentsTbody');
    const tableInfo = document.getElementById('tableInfo');
    if(!tbody) return;
    const total = filteredPayments.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if(currentPage > maxPage) currentPage = maxPage;
    const start = (currentPage-1)*pageSize;
    const pageData = filteredPayments.slice(start, start+pageSize);

    if(pageData.length===0){
      tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="ico">💳</div><h3>No receipts found</h3><p>Log a manual payment or adjust filters</p></div></td></tr>`;
      if(tableInfo) tableInfo.textContent = `Showing 0 of ${total}`;
      return;
    }

    tbody.innerHTML = pageData.map(pay=>{
      const allocStatus = getAllocationStatus(pay);
      const unallocAmt = (pay.amount||0) - (pay.allocatedAmount||0);
      return `<tr>
        <td><span class="mono" style="font-weight:700">${escapeHtml(pay.id)}</span></td>
        <td>${fmtDate(pay.date||pay.transactionDate)}</td>
        <td><div style="font-weight:600">${escapeHtml(pay.tenantName||pay.tenant)}</div><div style="font-size:11px;color:#64748B">${escapeHtml(pay.tenantId||'')}</div></td>
        <td>${escapeHtml(pay.propertyName||pay.property||'—')}</td>
        <td>${channelPill(pay.method||pay.paymentMethod, pay.type||pay.channel)}<div style="font-size:11px;color:#64748B;margin-top:2px">${escapeHtml(pay.bankName||pay.bank||'')}</div></td>
        <td><span class="mono" style="background:#0F172A;color:#FFF;padding:2px 6px;border-radius:4px;font-size:11px">${escapeHtml(pay.reference||'')}</span><div style="font-size:11px;color:#64748B;margin-top:2px">${pay.accountNumber? escapeHtml(pay.accountNumber) : pay.mobileNumber? escapeHtml(pay.mobileNumber) : ''}</div></td>
        <td class="amount">${fmtMoneySmall(pay.amount)}${unallocAmt>0 && allocStatus!=='Unallocated' ? `<div style="font-size:11px;color:#D97706">Unalloc ${fmtMoneySmall(unallocAmt)}</div>` : ''}</td>
        <td>${statusPill(allocStatus)}<div style="font-size:11px;color:#64748B;margin-top:2px">${pay.invoiceIds && pay.invoiceIds.length? pay.invoiceIds.length+' invoices' : 'No match'}</div></td>
        <td><div style="display:flex;gap:4px"><button class="btn btn-sm" onclick="window.openPaymentDrawer('${pay.id}')">View</button><button class="dots-btn" onclick="window.openPaymentCtx(event,'${pay.id}')">⋮</button></div></td>
      </tr>`;
    }).join('');

    if(tableInfo) tableInfo.textContent = `Showing ${start+1}-${Math.min(start+pageSize, total)} of ${total} • Page ${currentPage}/${maxPage}`;
  }

  window.openPaymentDrawer = openDrawer;
  window.openPaymentCtx = (e,id)=>{
    e.stopPropagation();
    ctxPaymentId = id;
    const pay = getPayments().find(p=>p.id===id);
    const allocStatus = pay ? getAllocationStatus(pay) : 'Unknown';
    const menu = document.getElementById('ctxMenu');
    menu.innerHTML = `
      <div class="ctx-item" onclick="window.openPaymentDrawer('${id}')">👁️ View Receipt</div>
      <div class="ctx-item" onclick="window.reconcileSinglePayment('${id}')">🔄 Auto-Reconcile</div>
      <div class="ctx-item" onclick="window.printReceipt('${id}')">🖨️ Print Receipt</div>
      <div class="ctx-item" onclick="window.duplicatePayment('${id}')">📋 Duplicate</div>
      <div class="ctx-item danger" onclick="window.voidPayment('${id}')">🗑️ Void Payment</div>
    `;
    menu.style.left = (e.clientX-10)+'px';
    menu.style.top = (e.clientY+6)+'px';
    menu.classList.add('open');
  };
  window.duplicatePayment = (id)=>{
    const pay = getPayments().find(p=>p.id===id);
    if(!pay) return;
    const newId = `PAY-${new Date().getFullYear()}-${String(getPayments().length+1).padStart(4,'0')}`;
    const clone = {...pay, id:newId, status:'Unallocated', allocatedAmount:0, allocatedInvoices:[], invoiceIds:[], unallocatedAmount:pay.amount, date:new Date().toISOString().slice(0,10), transactionDate:new Date().toISOString().slice(0,10), reference: `DUP-${pay.reference}`};
    getState().payments.unshift(clone);
    saveState();
    applyFilters();
    toast('Payment duplicated as '+newId, 'success');
    document.getElementById('ctxMenu').classList.remove('open');
  };
  window.voidPayment = (id)=>{
    document.getElementById('ctxMenu').classList.remove('open');
    showConfirm('Void Payment', `Void payment ${id}? This will reverse allocations.`, ()=>{
      const pay = getPayments().find(p=>p.id===id);
      if(!pay) return;
      // Reverse allocations if any
      if(pay.invoiceIds && pay.invoiceIds.length){
        pay.invoiceIds.forEach(invId=>{
          const inv = getInvoices().find(i=>i.id===invId);
          if(inv && pay.allocatedAmount){
            // Simplified reverse: add back proportional? For demo, just add back allocatedAmount / count
            const reversePerInvoice = (pay.allocatedAmount||0) / pay.invoiceIds.length;
            inv.paidAmount = Math.max(0, (inv.paidAmount||0) - reversePerInvoice);
            inv.outstandingAmount = (inv.amount||0) - inv.paidAmount;
            inv.status = inv.outstandingAmount===0 ? 'Paid' : inv.paidAmount>0 ? 'Partial' : 'Unpaid';
          }
        });
      }
      pay.status='Failed';
      pay.voided=true;
      saveState();
      applyFilters();
      closeDrawer();
      toast('Payment voided and allocations reversed','success');
    });
  };

  function openDrawer(id){
    const pay = getPayments().find(p=>p.id===id);
    if(!pay) return;
    selectedPaymentId = id;
    const allocStatus = getAllocationStatus(pay);
    document.getElementById('drawerTitle').textContent = pay.id;
    document.getElementById('drawerId').textContent = pay.id;
    document.getElementById('drawerStatus').className = `pill ${ ({Allocated:'blue',Unallocated:'amber',Reconciled:'green',Confirmed:'green',Pending:'gray',Failed:'red'}[allocStatus]||'gray') }`;
    document.getElementById('drawerStatus').textContent = allocStatus;
    document.getElementById('drawerSubtitle').textContent = `${pay.tenantName||pay.tenant} • ${pay.propertyName||pay.property||'—'} • ${pay.method||pay.paymentMethod} • ${fmtDate(pay.date||pay.transactionDate)}`;

    const unallocAmt = (pay.amount||0) - (pay.allocatedAmount||0);
    document.getElementById('drawerSummary').innerHTML = `
      <div class="sum-item"><div class="l">Amount</div><div class="v">${fmtMoneySmall(pay.amount)}</div></div>
      <div class="sum-item"><div class="l">Allocated / Unallocated</div><div class="v">${fmtMoneySmall(pay.allocatedAmount||0)} / <span style="color:#D97706">${fmtMoneySmall(unallocAmt)}</span></div></div>
      <div class="sum-item"><div class="l">Reference</div><div class="v mono" style="font-size:12px">${escapeHtml(pay.reference||'')}</div></div>
    `;
    renderDrawerBody(id);
    document.getElementById('drawerBackdrop').classList.add('open');
    document.getElementById('paymentDrawer').classList.add('open');
  }

  function closeDrawer(){
    document.getElementById('drawerBackdrop').classList.remove('open');
    document.getElementById('paymentDrawer').classList.remove('open');
    selectedPaymentId = null;
  }

  function renderDrawerBody(id){
    const pay = getPayments().find(p=>p.id===id);
    if(!pay) return;
    const body = document.getElementById('drawerBody');
    const allocStatus = getAllocationStatus(pay);
    if(currentTab==='allocation'){
      const matchedInvoices = (pay.invoiceIds||[]).map(invId=> getInvoices().find(i=>i.id===invId)).filter(Boolean);
      const tenantOpen = getInvoices().filter(inv=> inv.tenantId===pay.tenantId && inv.outstandingAmount>0).sort((a,b)=> new Date(a.dueDate)-new Date(b.dueDate)).slice(0,6);
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="margin:0;font-size:13px;font-weight:800">Allocation Panel</h4>${statusPill(allocStatus)}</div>
        ${matchedInvoices.length? `<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:6px">Matched Invoices (${matchedInvoices.length})</div><table class="line-items-table"><thead><tr><th>Invoice ID</th><th>Due Date</th><th>Original</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>${matchedInvoices.map(inv=>`<tr><td class="mono">${inv.id}</td><td>${fmtDate(inv.dueDate)}</td><td>${fmtMoneySmall(inv.amount)}</td><td>${fmtMoneySmall(inv.paidAmount)}</td><td style="color:${inv.outstandingAmount>0?'#D97706':'#16A34A'};font-weight:700">${fmtMoneySmall(inv.outstandingAmount)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><div class="ico">🔗</div><h3>Not yet allocated</h3><p>This receipt has not been matched to any invoice. Use Auto-Reconcile to match against oldest open invoices.</p></div>'}
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:8px">Tenant Ledger — Oldest Open Invoices (FIFO)</div>
          ${tenantOpen.length? `<table class="line-items-table"><thead><tr><th>Invoice</th><th>Due</th><th>Outstanding</th><th>Type</th></tr></thead><tbody>${tenantOpen.map(inv=>`<tr><td class="mono">${inv.id}</td><td>${fmtDate(inv.dueDate)} • ${Math.floor((new Date()-new Date(inv.dueDate))/(24*3600*1000))}d overdue</td><td style="font-weight:700;color:#D97706">${fmtMoneySmall(inv.outstandingAmount)}</td><td><span class="pill gray">${inv.type}</span></td></tr>`).join('')}</tbody></table>` : '<div style="font-size:12px;color:#64748B">No open invoices for this tenant — fully paid.</div>'}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-sm" onclick="window.reconcileSinglePayment('${pay.id}')">🔄 Run Auto-Reconcile (FIFO)</button><button class="btn btn-ghost btn-sm" onclick="window.showLedgerForTenant('${pay.tenantId}')">View Full Ledger</button></div>
      `;
    } else if(currentTab==='ledger'){
      const tenantInvoices = getInvoices().filter(inv=> inv.tenantId===pay.tenantId).sort((a,b)=> new Date(a.dueDate)-new Date(b.dueDate));
      body.innerHTML = `
        <h4 style="margin:0 0 10px;font-size:13px;font-weight:800">Tenant Ledger — ${escapeHtml(pay.tenantName||pay.tenant)}</h4>
        <div class="timeline">
          ${tenantInvoices.map(inv=>`<div class="tl ${inv.status==='Paid'?'done': inv.status==='Overdue'?'active':''}"><div style="display:flex;justify-content:space-between"><span style="font-weight:600;font-size:12.5px" class="mono">${inv.id} • ${inv.type}</span><span style="font-size:11px;color:${inv.outstandingAmount>0?'#D97706':'#16A34A'};font-weight:700">${inv.status} • ${fmtMoneySmall(inv.outstandingAmount)} due</span></div><div style="font-size:12px;color:#475569;margin-top:2px">Due ${fmtDate(inv.dueDate)} • ${fmtMoneySmall(inv.amount)} • Paid ${fmtMoneySmall(inv.paidAmount)} • ZRA ${inv.zraStatus}</div></div>`).join('')}
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="form-grid">
          <div class="form-group"><label class="form-label">Receipt ID</label><div class="form-input" style="background:#F8FAFC">${escapeHtml(pay.id)}</div></div>
          <div class="form-group"><label class="form-label">Date</label><div class="form-input" style="background:#F8FAFC">${fmtDate(pay.date||pay.transactionDate)}</div></div>
          <div class="form-group"><label class="form-label">Tenant</label><div class="form-input" style="background:#F8FAFC">${escapeHtml(pay.tenantName||pay.tenant)}</div></div>
          <div class="form-group"><label class="form-label">Property</label><div class="form-input" style="background:#F8FAFC">${escapeHtml(pay.propertyName||pay.property||'—')}</div></div>
          <div class="form-group"><label class="form-label">Channel</label><div class="form-input" style="background:#F8FAFC">${escapeHtml(pay.method||pay.paymentMethod)} • ${escapeHtml(pay.bankName||'')}</div></div>
          <div class="form-group"><label class="form-label">Reference</label><div class="form-input mono" style="background:#0F172A;color:#FFF">${escapeHtml(pay.reference||'')}</div></div>
          <div class="form-group"><label class="form-label">Amount</label><div class="form-input" style="background:#F8FAFC;font-weight:800">${fmtMoneySmall(pay.amount)}</div></div>
          <div class="form-group"><label class="form-label">Allocated</label><div class="form-input" style="background:#F8FAFC">${fmtMoneySmall(pay.allocatedAmount||0)} / Unalloc ${fmtMoneySmall((pay.amount||0)-(pay.allocatedAmount||0))}</div></div>
          <div class="form-group full"><label class="form-label">Account / Mobile</label><div class="form-input" style="background:#F8FAFC">${escapeHtml(pay.accountNumber||pay.mobileNumber||'—')}</div></div>
        </div>
      `;
    }
  }

  // Manual Payment Modal
  function openPaymentModal(){
    document.getElementById('paymentModalBackdrop').classList.add('open');
    populateFilters();
    updatePayPreview();
  }
  function closePaymentModal(){ document.getElementById('paymentModalBackdrop').classList.remove('open'); clearPaymentForm(); }
  function clearPaymentForm(){
    document.getElementById('payTenant').value='';
    document.getElementById('payAmount').value='';
    document.getElementById('payReference').value='';
    document.getElementById('payAccount').value='';
    document.getElementById('payNotes').value='';
    document.getElementById('payPreview').style.display='none';
  }
  function onTenantChange(){
    const tenantId = document.getElementById('payTenant').value;
    const tenant = getTenants().find(t=>t.id===tenantId);
    const propSelect = document.getElementById('payProperty');
    if(tenant && tenant.propertyIds && tenant.propertyIds.length && propSelect){
      const propId = tenant.propertyIds[0];
      propSelect.value = propId;
    }
    updatePayPreview();
  }
  function updatePayPreview(){
    const tenantId = document.getElementById('payTenant')?.value||'';
    const amount = Number(document.getElementById('payAmount')?.value||0);
    const channel = document.getElementById('payChannel')?.value||'';
    const preview = document.getElementById('payPreview');
    if(!tenantId || !amount){ if(preview) preview.style.display='none'; return; }
    const openInvoices = getInvoices().filter(inv=> inv.tenantId===tenantId && inv.outstandingAmount>0).sort((a,b)=> new Date(a.dueDate)-new Date(b.dueDate));
    const totalOpen = openInvoices.reduce((s,i)=>s+(i.outstandingAmount||0),0);
    if(preview){
      preview.style.display='block';
      preview.innerHTML = `<strong>Preview:</strong> Tenant has ${openInvoices.length} open invoices • Total outstanding ${fmtMoneySmall(totalOpen)} • This payment ${fmtMoneySmall(amount)} will ${amount>=totalOpen? 'fully settle and leave ' + fmtMoneySmall(amount-totalOpen) + ' unallocated' : 'partially settle oldest invoice '+ (openInvoices[0]?.id||'') } • Channel: ${escapeHtml(channel)}`;
    }
  }

  function confirmPayment(){
    const tenantId = document.getElementById('payTenant').value;
    const propertyId = document.getElementById('payProperty').value||'';
    const channel = document.getElementById('payChannel').value;
    const bank = document.getElementById('payBank').value;
    const amount = Number(document.getElementById('payAmount').value);
    const date = document.getElementById('payDate').value;
    const reference = document.getElementById('payReference').value.trim();
    const account = document.getElementById('payAccount').value.trim();
    const autoAllocate = document.getElementById('payAutoAllocate').checked;

    if(!tenantId){ toast('Select tenant','error'); return; }
    if(!amount || amount<=0){ toast('Enter valid amount','error'); return; }
    if(!date){ toast('Select date','error'); return; }
    if(!reference){ toast('Enter reference code','error'); return; }

    const tenant = getTenants().find(t=>t.id===tenantId) || { id:tenantId, name:'Unknown Tenant' };
    const prop = getProperties().find(p=>p.id===propertyId) || getProperties().find(p=> (tenant.propertyIds||[])[0]===p.id) || { id:propertyId||'P-001', name:'Unknown Property' };
    const isMomo = channel.toLowerCase().includes('mtn') || channel.toLowerCase().includes('airtel') || bank.toLowerCase().includes('momo') || bank.toLowerCase().includes('airtel');

    const newId = `PAY-${new Date().getFullYear()}-${String(getPayments().length+1).padStart(4,'0')}`;
    const payment = {
      id: newId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenant: tenant.name,
      propertyId: prop.id,
      propertyName: prop.name,
      property: prop.name,
      invoiceIds: [],
      allocatedInvoices: [],
      invoiceId: null,
      amount: amount,
      allocatedAmount: 0,
      unallocatedAmount: amount,
      method: channel,
      paymentMethod: channel,
      bankName: bank,
      bank: bank,
      type: isMomo ? 'Mobile Money' : 'Bank',
      channel: isMomo ? 'Mobile Money' : 'Bank',
      reference: reference,
      transactionDate: date,
      date: date,
      status: 'Unallocated',
      reconciledBy: null,
      accountNumber: !isMomo ? (account || '**** **** '+Math.floor(1000+Math.random()*9000)) : null,
      mobileNumber: isMomo ? (account || '+2609'+Math.floor(70000000+Math.random()*90000000)) : null,
      createdAt: date,
      notes: document.getElementById('payNotes').value||''
    };

    getState().payments.unshift(payment);
    
    if(autoAllocate){
      const result = reconcilePaymentLogic(payment, false);
      // result handled inside
    }

    saveState();
    closePaymentModal();
    applyFilters();
    if(autoAllocate){
      toast(`Payment ${newId} logged and auto-reconciled • ${fmtMoneySmall(amount)}`, 'success');
    } else {
      toast(`Payment ${newId} logged as unallocated • ${fmtMoneySmall(amount)}`, 'success');
    }
  }

  // Core Auto-Reconciliation Algorithm
  function reconcilePaymentLogic(payment, showToast=true){
    const tenantId = payment.tenantId;
    const openInvoices = getInvoices().filter(inv=> inv.tenantId===tenantId && inv.outstandingAmount>0 && inv.status!=='Paid').sort((a,b)=> {
      const da = new Date(a.dueDate) - new Date(b.dueDate);
      if(da!==0) return da;
      return new Date(a.issueDate) - new Date(b.issueDate);
    });

    if(openInvoices.length===0){
      if(showToast) toast(`No open invoices for ${payment.tenantName||payment.tenant} — left as unallocated`, 'info');
      return { matched: [], remaining: payment.amount };
    }

    let remaining = payment.amount - (payment.allocatedAmount||0);
    if(remaining<=0) remaining = payment.amount; // for unallocated re-run

    const matched = [];
    const beforeState = openInvoices.map(inv=> ({id:inv.id, outstanding:inv.outstandingAmount, paid:inv.paidAmount}));

    for(const inv of openInvoices){
      if(remaining<=0) break;
      const alloc = Math.min(inv.outstandingAmount, remaining);
      if(alloc<=0) continue;
      inv.paidAmount = (inv.paidAmount||0) + alloc;
      inv.outstandingAmount = Math.max(0, (inv.amount||0) - inv.paidAmount);
      if(inv.outstandingAmount===0){
        inv.status = 'Paid';
        inv.paymentStatus = 'Paid';
      } else if(inv.paidAmount>0){
        inv.status = 'Partial';
        inv.paymentStatus = 'Partial';
      }
      inv.ledgerHistory = inv.ledgerHistory||[];
      inv.ledgerHistory.push({
        id: `${inv.id}-LH-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        date: payment.date||payment.transactionDate,
        type: 'Payment Allocated',
        amount: -alloc,
        reference: payment.id,
        user: 'Auto-Reconcile',
        balance: inv.outstandingAmount
      });
      remaining -= alloc;
      matched.push({ invoiceId: inv.id, allocated: alloc, outstandingBefore: beforeState.find(b=>b.id===inv.id)?.outstanding||0, outstandingAfter: inv.outstandingAmount });
      if(!payment.invoiceIds.includes(inv.id)) payment.invoiceIds.push(inv.id);
      if(!payment.allocatedInvoices.includes(inv.id)) payment.allocatedInvoices.push(inv.id);
    }

    payment.allocatedAmount = payment.amount - remaining;
    payment.unallocatedAmount = remaining;
    if(remaining===0){
      payment.status = 'Allocated';
      payment.reconciledBy = 'System Auto-Reconcile';
    } else if(payment.allocatedAmount>0){
      payment.status = 'Allocated'; // partial still allocated
    } else {
      payment.status = 'Unallocated';
    }

    // Log audit event if available
    try{
      if(window.addAuditEvent){
        window.addAuditEvent('ALLOCATE', 'payment', payment.id, `Auto-reconciled ${payment.id} (${fmtMoneySmall(payment.amount)}) against ${matched.length} invoices for tenant ${payment.tenantName} — Remaining unallocated ${fmtMoneySmall(remaining)}`, null, { matched, remaining, tenantId });
      } else if(getState().auditTrail){
        getState().auditTrail.unshift({
          id: `AUD-${String((getState().auditTrail.length||0)+1).padStart(6,'0')}`,
          timestamp: new Date().toISOString(),
          user: 'System Auto-Reconcile',
          action: 'ALLOCATE',
          entityType: 'payment',
          entityId: payment.id,
          description: `Auto-reconciled ${payment.id} against ${matched.length} invoices`,
          before: { status: 'Unallocated' },
          after: { status: payment.status, matched, remaining }
        });
      }
    }catch(e){ console.warn('audit log failed', e); }

    saveState();

    if(showToast){
      toast(`Reconciled ${payment.id}: ${matched.length} invoices matched • ${fmtMoneySmall(payment.allocatedAmount)} allocated • ${fmtMoneySmall(remaining)} unallocated`, 'success');
    }

    return { matched, remaining, allocated: payment.allocatedAmount };
  }

  function reconcileSinglePayment(paymentId){
    const pay = getPayments().find(p=>p.id===paymentId);
    if(!pay) return;
    if(getAllocationStatus(pay)==='Reconciled' && pay.unallocatedAmount===0){
      toast('Payment already fully reconciled','info');
      return;
    }
    const result = reconcilePaymentLogic(pay, true);
    renderTable();
    renderKPIs();
    if(selectedPaymentId===paymentId) renderDrawerBody(paymentId);
    closeReconcileModal();
  }

  window.reconcileSinglePayment = reconcileSinglePayment;
  window.showLedgerForTenant = (tenantId)=>{ window.location.href = `../pages/finance-billing.html?tenant=${tenantId}`; };

  function openReconcileModal(){
    const unallocated = getPayments().filter(p=> getAllocationStatus(p)==='Unallocated');
    if(unallocated.length===0){
      toast('No unallocated payments to reconcile','info');
      return;
    }
    document.getElementById('reconcileModalBackdrop').classList.add('open');
    const body = document.getElementById('reconcileBody');
    // Build preview
    let totalUnalloc = unallocated.reduce((s,p)=>s+(p.amount - (p.allocatedAmount||0)),0);
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#92400E">Unallocated Payments</div><div style="font-weight:800;font-size:18px;margin-top:4px">${unallocated.length}</div><div style="font-size:11px;color:#92400E">${fmtMoneySmall(totalUnalloc)} to allocate</div></div>
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:10px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#15803D">Will Match</div><div style="font-weight:800;font-size:18px;margin-top:4px">FIFO</div><div style="font-size:11px;color:#15803D">Oldest due first per tenant</div></div>
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#1D4ED8">Impact</div><div style="font-weight:800;font-size:18px;margin-top:4px">Auto</div><div style="font-size:11px;color:#1D4ED8">Updates window.state + audit + saveState()</div></div>
      </div>
      <div class="table-wrap" style="max-height:320px;overflow:auto;border:1px solid #E2E8F0;border-radius:8px">
        <table class="line-items-table" style="margin:0">
          <thead><tr><th>Receipt ID</th><th>Tenant</th><th>Amount</th><th>Channel</th><th>Oldest Open Invoice</th><th>Will Allocate</th></tr></thead>
          <tbody>
            ${unallocated.slice(0,15).map(pay=>{
              const open = getInvoices().filter(inv=> inv.tenantId===pay.tenantId && inv.outstandingAmount>0).sort((a,b)=> new Date(a.dueDate)-new Date(b.dueDate))[0];
              return `<tr><td class="mono">${pay.id}</td><td>${escapeHtml(pay.tenantName||pay.tenant)}</td><td>${fmtMoneySmall(pay.amount)}</td><td>${escapeHtml(pay.bankName||pay.method)}</td><td>${open? open.id+' • '+fmtMoneySmall(open.outstandingAmount)+' due '+fmtDate(open.dueDate) : '<span style="color:#16A34A">No open invoices</span>'}</td><td>${open? fmtMoneySmall(Math.min(open.outstandingAmount, pay.amount)) : '—'}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${unallocated.length>15? `<div style="font-size:11px;color:#64748B;margin-top:8px">Showing 15 of ${unallocated.length} unallocated receipts. All will be processed.</div>` : ''}
      <div style="margin-top:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569">
        <strong>Algorithm:</strong> For each unallocated payment, fetch tenant's open invoices sorted by <code>dueDate ASC</code>, allocate <code>min(outstanding, remaining)</code>, update <code>invoice.paidAmount / outstandingAmount / status</code>, push ledger entry <code>Payment Allocated</code>, push <code>invoiceId</code> to <code>payment.invoiceIds</code>, set <code>payment.allocatedAmount</code> and <code>unallocatedAmount</code>, log audit via <code>addAuditEvent()</code>, then <code>saveState()</code>.
      </div>
    `;
  }
  function closeReconcileModal(){ document.getElementById('reconcileModalBackdrop').classList.remove('open'); }
  function confirmReconcileAll(){
    const unallocated = getPayments().filter(p=> getAllocationStatus(p)==='Unallocated');
    let totalMatched = 0;
    let totalAllocated = 0;
    unallocated.forEach(pay=>{
      const res = reconcilePaymentLogic(pay, false);
      totalMatched += res.matched.length;
      totalAllocated += res.allocated;
    });
    closeReconcileModal();
    applyFilters();
    toast(`Auto-reconciled ${unallocated.length} payments • ${totalMatched} invoices matched • ${fmtMoneySmall(totalAllocated)} allocated • saveState() executed`, 'success');
  }

  function unallocatePayment(paymentId){
    const pay = getPayments().find(p=>p.id===paymentId);
    if(!pay) return;
    showConfirm('Unallocate Payment', `Unallocate ${paymentId}? This will reverse invoice updates.`, ()=>{
      if(pay.invoiceIds && pay.invoiceIds.length){
        const allocPerInvoice = (pay.allocatedAmount||pay.amount) / pay.invoiceIds.length;
        pay.invoiceIds.forEach(invId=>{
          const inv = getInvoices().find(i=>i.id===invId);
          if(inv){
            inv.paidAmount = Math.max(0, (inv.paidAmount||0) - allocPerInvoice);
            inv.outstandingAmount = (inv.amount||0) - inv.paidAmount;
            inv.status = inv.outstandingAmount===0 ? 'Paid' : inv.paidAmount>0 ? 'Partial' : 'Unpaid';
            inv.ledgerHistory = inv.ledgerHistory||[];
            inv.ledgerHistory.push({ id: `${inv.id}-LH-${Date.now()}`, date: new Date().toISOString().slice(0,10), type: 'Payment Unallocated', amount: allocPerInvoice, reference: pay.id, user: 'Finance', balance: inv.outstandingAmount });
          }
        });
      }
      pay.invoiceIds = [];
      pay.allocatedInvoices = [];
      pay.allocatedAmount = 0;
      pay.unallocatedAmount = pay.amount;
      pay.status = 'Unallocated';
      pay.reconciledBy = null;
      saveState();
      applyFilters();
      if(selectedPaymentId===paymentId) renderDrawerBody(paymentId);
      toast('Payment unallocated and invoices reversed','success');
    });
  }

  function printReceipt(id){
    const pay = getPayments().find(p=>p.id===id);
    if(!pay) return;
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>${pay.id}</title><style>body{font-family:sans-serif;padding:24px} .receipt{max-width:600px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;padding:24px} .mono{font-family:monospace}</style></head><body><div class="receipt"><h2>Payment Receipt ${pay.id}</h2><p><strong>Tenant:</strong> ${pay.tenantName} • <strong>Property:</strong> ${pay.propertyName||''}</p><p><strong>Date:</strong> ${pay.date} • <strong>Channel:</strong> ${pay.method} • ${pay.bankName}</p><p><strong>Reference:</strong> <span class="mono" style="background:#0F172A;color:#FFF;padding:2px 6px;border-radius:4px">${pay.reference}</span></p><p><strong>Amount:</strong> ZMW ${pay.amount}</p><p><strong>Allocated:</strong> ZMW ${pay.allocatedAmount||0} to ${pay.invoiceIds? pay.invoiceIds.join(', ') : 'Unallocated'}</p><p style="font-size:11px;color:#64748B">Generated by PropertyPro Zambia Ltd • Audit trail logged</p></div></body></html>`);
    w.document.close();
    w.print();
  }
  window.printReceipt = printReceipt;

  function exportCSV(){
    const data = filteredPayments.map(p=>({
      ReceiptID: p.id,
      Date: p.date||p.transactionDate,
      Tenant: p.tenantName||p.tenant,
      TenantID: p.tenantId,
      Property: p.propertyName||p.property,
      PropertyID: p.propertyId,
      Channel: p.method||p.paymentMethod,
      Bank_Provider: p.bankName||p.bank,
      Type: p.type||p.channel,
      ReferenceCode: p.reference,
      Amount_ZMW: p.amount,
      AllocatedAmount: p.allocatedAmount||0,
      UnallocatedAmount: (p.amount||0)-(p.allocatedAmount||0),
      AllocationStatus: getAllocationStatus(p),
      InvoiceIDs: (p.invoiceIds||[]).join(';'),
      Account_Mobile: p.accountNumber||p.mobileNumber||'',
      Status: p.status
    }));
    if(data.length===0){ toast('No data to export','error'); return; }
    if(window.XLSX){
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Payments');
      const wbout = XLSX.write(wb, {bookType:'xlsx', type:'array'});
      const blob = new Blob([wbout], {type:'application/octet-stream'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`PropertyPro_Payments_${new Date().toISOString().slice(0,10)}.xlsx`; a.click(); URL.revokeObjectURL(url);
      toast(`Exported ${data.length} receipts to Excel`, 'success');
    } else {
      const headers = Object.keys(data[0]);
      const csv = [headers.join(','), ...data.map(row=> headers.map(h=> JSON.stringify(row[h]??'')).join(','))].join('\n');
      const blob = new Blob([csv], {type:'text/csv'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`PropertyPro_Payments_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
      toast(`Exported ${data.length} receipts to CSV`, 'success');
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
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; el.style.transition='.3s'; setTimeout(()=>el.remove(),300); }, 3500);
  }
  function escapeHtml(str){ if(!str) return ''; return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  window.escapeHtml = escapeHtml;
  function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(getState())); }catch(e){} }
})();

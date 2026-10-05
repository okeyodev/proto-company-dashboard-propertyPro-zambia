
document.addEventListener('DOMContentLoaded',()=>{
  initCommon('unlisted-investments');
  const mapping={
    'investment-appraisals':{dataKey:'appraisals'},
    'approvals':{dataKey:'approvals'},
    'conditions-precedent':{dataKey:'conditionsPrecedent'},
    'fixed-income':{dataKey:'investmentAssets',filter:a=>a.assetClass==='Fixed Income'},
    'listed-equities':{dataKey:'investmentAssets',filter:a=>a.assetClass==='Listed Equity'},
    'unlisted-investments':{dataKey:'investmentAssets',filter:a=>a.assetClass==='Unlisted Equity'},
    'collective-investments':{dataKey:'investmentAssets',filter:a=>a.assetClass==='Collective Investments'},
    'investment-cash':{dataKey:'cashAccounts'},
    'investment-risk':{dataKey:'riskRecords'},
    'investment-compliance':{dataKey:'complianceBreaches'},
    'investment-performance':{dataKey:'performanceRecords'},
    'investment-reports':{dataKey:'investmentAssets'},
    'audit-trail':{dataKey:'auditTrail'}
  };
  const cfg=mapping['unlisted-investments']||{dataKey:'investmentAssets'};
  let filtered=[], currentPage=1, pageSize=20;
  const searchEl=document.getElementById('unlisted-investmentsSearch');
  const fundFilter=document.getElementById('unlisted-investmentsFundFilter');
  const statusFilter=document.getElementById('unlisted-investmentsStatusFilter');
  function getSource(){ let src=state[cfg.dataKey]||[]; if(cfg.filter) src=src.filter(cfg.filter); return src; }
  function populateFilters(){
    const funds=state.funds||[];
    fundFilter.innerHTML='<option value="All">All Funds</option>'+funds.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');
    const src=getSource();
    const statuses=[...new Set(src.map(s=> s.status||s.investmentStatus||s.stage||'Active').filter(Boolean))];
    statusFilter.innerHTML='<option value="All">All Status</option>'+statuses.map(s=>`<option value="${s}">${s}</option>`).join('');
  }
  function getFiltered(){
    let src=getSource();
    const q=(searchEl.value||'').toLowerCase();
    if(q) src=src.filter(s=> JSON.stringify(s).toLowerCase().includes(q));
    if(fundFilter.value!=='All') src=src.filter(s=> s.fundId===fundFilter.value);
    if(statusFilter.value!=='All') src=src.filter(s=> (s.status===statusFilter.value)||(s.investmentStatus===statusFilter.value)||(s.stage===statusFilter.value));
    return src;
  }
  function renderKpis(){
    const src=getFiltered();
    const total=src.length;
    const totalVal=src.reduce((s,a)=> s + (a.currentValue||a.amount||a.value||0),0);
    document.getElementById('unlisted-investmentsKpiGrid').innerHTML=`<div class="pr-kpi"><div class="label">Total Records</div><div class="value">${total}</div></div><div class="pr-kpi"><div class="label">Total Value</div><div class="value">ZMW ${(totalVal/1_000_000).toFixed(1)}M</div></div><div class="pr-kpi"><div class="label">Active</div><div class="value">${src.filter(s=> s.status==='Active'||s.status==='Open'||s.stage).length}</div></div><div class="pr-kpi"><div class="label">Fund</div><div class="value">${fundFilter.value}</div></div>`;
  }
  function renderTable(){
    filtered=getFiltered();
    const start=(currentPage-1)*pageSize, page=filtered.slice(start,start+pageSize);
    const tbody=document.querySelector('#unlisted-investmentsTable tbody');
    tbody.innerHTML=page.map(item=>{
      const id=item.id||'-';
      const name=item.name||item.title||item.description||item.company||id;
      const type=item.assetClass||item.type||item.rule||item.stage||'-';
      const val=item.currentValue||item.amount||item.value||item.nav||0;
      const status=item.status||item.investmentStatus||item.stage||'Active';
      const owner=item.owner||item.responsible||item.analyst||item.user||'-';
      return `<tr data-id="${id}" style="cursor:pointer"><td><b>${id}</b></td><td><b>${escapeHtml(String(name).slice(0,60))}</b></td><td><span class="pill blue">${escapeHtml(String(type).slice(0,30))}</span></td><td>${val?'ZMW '+(val/1_000_000).toFixed(2)+'M':'-'} </td><td><span class="pill ${status==='Active'||status==='Approved'||status==='Verified'?'green':status==='Pending'||status==='BREACH'?'red':'amber'}">${status}</span></td><td>${escapeHtml(String(owner).slice(0,30))}</td><td><button class="pr-btn" onclick="event.stopPropagation();openDrawer('${id}')">View</button></td></tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No records</td></tr>';
    document.getElementById('unlisted-investmentsCount').textContent=`${filtered.length} records • Page ${currentPage} of ${Math.ceil(filtered.length/pageSize)||1}`;
    tbody.querySelectorAll('tr[data-id]').forEach(tr=> tr.addEventListener('click',()=> openDrawer(tr.dataset.id)));
  }
  window.openDrawer=(id)=>{
    const item=getSource().find(s=>s.id===id);
    if(!item) return;
    document.getElementById('unlisted-investmentsDrawerTitle').textContent=item.name||item.title||item.id;
    document.getElementById('unlisted-investmentsDrawerMeta').textContent=`${item.id} • ${item.assetClass||item.type||''}`;
    const body=document.getElementById('unlisted-investmentsBody');
    body.innerHTML=`<div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px"><h4>Record</h4><pre style="white-space:pre-wrap;font-size:12px;background:#F8FAFC;padding:12px;border-radius:8px;border:1px solid var(--border)">${escapeHtml(JSON.stringify(item,null,2))}</pre></div>`;
    document.getElementById('unlisted-investmentsDrawer').classList.add('open');
  };
  document.getElementById('unlisted-investmentsBackdrop')?.addEventListener('click',()=> document.getElementById('unlisted-investmentsDrawer').classList.remove('open'));
  document.getElementById('unlisted-investmentsClose')?.addEventListener('click',()=> document.getElementById('unlisted-investmentsDrawer').classList.remove('open'));
  [searchEl,fundFilter,statusFilter].forEach(el=> el?.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{currentPage=1; renderKpis(); renderTable();}));
  document.getElementById('unlisted-investmentsClear')?.addEventListener('click',()=>{ searchEl.value=''; fundFilter.value='All'; statusFilter.value='All'; currentPage=1; renderKpis(); renderTable(); });
  document.getElementById('unlisted-investmentsPrev')?.addEventListener('click',()=>{ if(currentPage>1){currentPage--; renderTable();}});
  document.getElementById('unlisted-investmentsNext')?.addEventListener('click',()=>{ const max=Math.ceil(filtered.length/pageSize); if(currentPage<max){currentPage++; renderTable();}});
  populateFilters(); renderKpis(); renderTable();
  const qp=new URLSearchParams(location.search); if(qp.get('id')) setTimeout(()=> openDrawer(qp.get('id')),400);
});

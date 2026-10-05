
document.addEventListener('DOMContentLoaded',()=>{
  initCommon('investment-pipeline');
  const STAGES=['Origination','Screening','Appraisal','MIC','FIC','Conditions Precedent','Closing','Monitoring'];
  const COLORS={Origination:'#64748B',Screening:'#2563EB',Appraisal:'#D97706',MIC:'#7C3AED',FIC:'#0E7490','Conditions Precedent':'#DC2626',Closing:'#16A34A',Monitoring:'#0F172A'};
  let q='', classFilter='All', stageFilter='All';

  function filteredDeals(){
    let deals=[...(state.investmentDeals||[])];
    if(q) deals=deals.filter(d=> (d.name||'').toLowerCase().includes(q) || (d.id||'').toLowerCase().includes(q) || (d.assetClass||'').toLowerCase().includes(q) || (d.owner||'').toLowerCase().includes(q));
    if(classFilter!=='All') deals=deals.filter(d=> d.assetClass===classFilter);
    if(stageFilter!=='All') deals=deals.filter(d=> d.stage===stageFilter);
    return deals;
  }

  function renderStrip(){
    const strip=document.getElementById('pipelineStrip');
    strip.innerHTML=STAGES.map((s,i)=>`<div class="pipe-step ${i===0?'active':''}"><b>${s}</b><span class="small muted" style="margin-left:6px">${filteredDeals().filter(d=>d.stage===s).length}</span></div>${i<STAGES.length-1?'<span class="pipe-arrow">→</span>':''}`).join('');
  }

  function renderKanban(){
    const deals=filteredDeals();
    const scroll=document.getElementById('kanbanScroll');
    scroll.innerHTML=STAGES.map(stage=>{
      const stageDeals=deals.filter(d=>d.stage===stage);
      const total=stageDeals.reduce((s,d)=>s+d.amount,0);
      return `<div class="kanban-col" data-stage="${stage}"><div class="col-head"><div class="title"><i style="width:8px;height:8px;border-radius:50%;background:${COLORS[stage]||'#64748B'};display:inline-block"></i>${stage}</div><div class="count">${stageDeals.length}</div></div><div class="col-body" style="padding:10px;flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px"><div style="font-size:11px;color:var(--muted);margin-bottom:6px">ZMW ${(total/1_000_000).toFixed(1)}M total</div>${stageDeals.map(d=>`
        <div class="v-card" draggable="true" data-id="${d.id}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start"><b style="font-size:13px">${escapeHtml(d.name)}</b><span class="pill ${d.riskRating==='High'?'red':d.riskRating==='Medium'?'amber':'green'}" style="font-size:10px">${d.riskRating}</span></div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">${d.id} • ${d.assetClass}</div>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill blue">ZMW ${(d.amount/1_000_000).toFixed(1)}M</span><span class="pill gray">${d.expectedReturn}% IRR</span></div>
          <div style="margin-top:8px;background:#F8FAFC;border:1px solid #F1F5F9;border-radius:8px;padding:6px 8px;display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center;gap:6px"><div style="width:22px;height:22px;border-radius:50%;background:#0F172A;color:#FFF;display:grid;place-items:center;font-size:10px;font-weight:700">${d.owner.charAt(0)}</div><div><b style="font-size:11px">${d.owner}</b><div style="font-size:10px;color:var(--muted)">${d.daysInStage}d in stage</div></div></div><div style="font-size:10px;color:var(--muted)">${d.approvalStatus}</div></div>
          <div style="margin-top:8px;font-size:11px;color:var(--muted)">Next: ${d.nextAction}</div>
        </div>
      `).join('') || '<div class="small muted" style="padding:12px;text-align:center">No deals</div>'}</div></div>`;
    }).join('');
    // drag handlers
    scroll.querySelectorAll('.v-card').forEach(card=>{
      card.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', card.dataset.id); });
      card.addEventListener('click', ()=> openDrawer(card.dataset.id));
    });
    scroll.querySelectorAll('.kanban-col').forEach(col=>{
      col.addEventListener('dragover', e=>{ e.preventDefault(); col.style.borderColor='#93C5FD'; });
      col.addEventListener('dragleave', ()=>{ col.style.borderColor=''; });
      col.addEventListener('drop', e=>{
        e.preventDefault(); col.style.borderColor='';
        const id=e.dataTransfer.getData('text/plain');
        const newStage=col.dataset.stage;
        const deal=state.investmentDeals.find(d=>d.id===id);
        if(deal){ const before={...deal}; deal.stage=newStage; deal.daysInStage=1; saveState(); InvestmentCalc.addAuditEvent('UPDATE','investment',id,`Deal moved to ${newStage}`,before,deal); renderKanban(); renderTable(); renderStrip(); toast(`${id} moved to ${newStage}`,'success'); }
      });
    });
    document.getElementById('pipelineStats').textContent=`${deals.length} deals • ZMW ${(deals.reduce((s,d)=>s+d.amount,0)/1_000_000).toFixed(1)}M`;
  }

  function renderTable(){
    const deals=filteredDeals();
    const tbody=document.querySelector('#dealTable tbody');
    tbody.innerHTML=deals.map(d=>`<tr data-id="${d.id}" style="cursor:pointer"><td><b>${d.id}</b></td><td><b>${escapeHtml(d.name)}</b><div class="small muted">${d.fundId}</div></td><td><span class="pill blue">${d.assetClass}</span></td><td>ZMW ${(d.amount/1_000_000).toFixed(1)}M</td><td>${d.expectedReturn}%</td><td><span class="pill ${d.riskRating==='High'?'red':d.riskRating==='Medium'?'amber':'green'}">${d.riskRating}</span></td><td><span class="pill gray">${d.stage}</span></td><td>${d.owner}</td><td>${d.daysInStage}d</td><td><span class="pill ${d.approvalStatus==='Approved'?'green':d.approvalStatus==='Pending'?'amber':'blue'}">${d.approvalStatus}</span></td></tr>`).join('');
    tbody.querySelectorAll('tr').forEach(tr=> tr.addEventListener('click',()=> openDrawer(tr.dataset.id)));
  }

  function openDrawer(id){
    const deal=state.investmentDeals.find(d=>d.id===id);
    if(!deal) return;
    document.getElementById('dealDrawerTitle').textContent=`${deal.name} • ${deal.id}`;
    document.getElementById('dealDrawerBody').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:12px"><div class="small muted">Amount</div><div style="font-size:18px;font-weight:800">ZMW ${(deal.amount/1_000_000).toFixed(1)}M</div><div class="small muted">Expected ${deal.expectedReturn}% • ${deal.assetClass}</div></div>
        <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:12px"><div class="small muted">Stage</div><div style="font-size:16px;font-weight:700">${deal.stage}</div><div class="small muted">${deal.daysInStage} days • Owner ${deal.owner}</div></div>
      </div>
      <div style="margin-top:14px"><h4 style="margin:0 0 8px">Details</h4><div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13px"><div style="color:var(--muted)">Fund</div><div style="font-weight:600">${deal.fundId}</div><div style="color:var(--muted)">Risk</div><div><span class="pill ${deal.riskRating==='High'?'red':deal.riskRating==='Medium'?'amber':'green'}">${deal.riskRating}</span></div><div style="color:var(--muted)">Approval</div><div style="font-weight:600">${deal.approvalStatus}</div><div style="color:var(--muted)">Next Action</div><div style="font-weight:600">${deal.nextAction}</div></div></div>
      <div style="margin-top:14px"><h4 style="margin:0 0 8px">Conditions Precedent</h4>${(state.conditionsPrecedent||[]).filter(cp=>cp.dealId===deal.id).map(cp=>`<div style="padding:8px;border:1px solid var(--border);border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between"><div><b style="font-size:12px">${cp.requirement}</b><div class="small muted">${cp.responsible} • Due ${cp.dueDate}</div></div><span class="pill ${cp.status==='Verified'?'green':cp.status==='Pending'?'amber':'blue'}">${cp.status}</span></div>`).join('') || '<div class="small muted">No CPs</div>'}</div>
    `;
    document.getElementById('dealDrawerBackdrop').classList.add('open');
    document.getElementById('btnOpenAppraisal').onclick=()=> goToPage(`investment-appraisals.html?id=${deal.id}`);
  }

  document.getElementById('dealSearch').addEventListener('input', e=>{ q=e.target.value.toLowerCase(); renderKanban(); renderTable(); renderStrip(); });
  document.querySelectorAll('#dealFilters .chip').forEach(ch=> ch.addEventListener('click',()=>{ document.querySelectorAll('#dealFilters .chip').forEach(c=>c.classList.remove('active')); ch.classList.add('active'); classFilter=ch.dataset.filter; renderKanban(); renderTable(); renderStrip(); }));
  document.getElementById('fStage').addEventListener('change', e=>{ stageFilter=e.target.value; renderKanban(); renderTable(); renderStrip(); });
  document.getElementById('btnExportPipeline').addEventListener('click',()=>{
    let csv='ID,Name,AssetClass,Amount,ExpectedReturn,Risk,Stage,Owner,Days,Approval\n';
    filteredDeals().forEach(d=>{ csv+=`${d.id},"${d.name}",${d.assetClass},${d.amount},${d.expectedReturn},${d.riskRating},${d.stage},${d.owner},${d.daysInStage},${d.approvalStatus}\n`; });
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='InvestmentPipeline.csv'; a.click(); URL.revokeObjectURL(url); toast('Exported','success');
  });

  renderStrip(); renderKanban(); renderTable();
  const qp=new URLSearchParams(location.search); if(qp.get('id')) setTimeout(()=> openDrawer(qp.get('id')),400);
});

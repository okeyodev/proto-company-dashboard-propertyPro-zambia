
document.addEventListener('DOMContentLoaded',()=>{
  initCommon('investment-assets');
  let filtered=[], currentPage=1, pageSize=20, selectedId=null;
  const searchEl=document.getElementById('assetSearch');
  const fFund=document.getElementById('fFund'), fPortfolio=document.getElementById('fPortfolio'), fClass=document.getElementById('fClass'), fRisk=document.getElementById('fRisk'), fStatus=document.getElementById('fStatus');

  function populateFilters(){
    const funds=state.funds||[];
    fFund.innerHTML='<option value="All">All Funds</option>'+funds.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');
    const portfolios=state.portfolios||[];
    fPortfolio.innerHTML='<option value="All">All Portfolios</option>'+portfolios.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    const params=new URLSearchParams(location.search);
    if(params.get('fund')) fFund.value=params.get('fund');
    if(params.get('assetClass')) fClass.value=params.get('assetClass');
  }

  function getFiltered(){
    let assets=[...(state.investmentAssets||[])];
    const q=(searchEl.value||'').toLowerCase();
    if(q) assets=assets.filter(a=> (a.name||'').toLowerCase().includes(q) || (a.id||'').toLowerCase().includes(q) || (a.propertyName||'').toLowerCase().includes(q) || (a.ticker||'').toLowerCase().includes(q));
    if(fFund.value!=='All') assets=assets.filter(a=>a.fundId===fFund.value);
    if(fPortfolio.value!=='All') assets=assets.filter(a=>a.portfolioId===fPortfolio.value);
    if(fClass.value!=='All') assets=assets.filter(a=>a.assetClass===fClass.value);
    if(fRisk.value!=='All') assets=assets.filter(a=>a.riskRating===fRisk.value);
    if(fStatus.value!=='All') assets=assets.filter(a=>a.investmentStatus===fStatus.value);
    return assets;
  }

  function renderKpis(){
    const assets=getFiltered();
    const total=assets.reduce((s,a)=>s+(a.currentValue||0),0);
    const prop=assets.filter(a=>a.assetClass==='Property');
    const fi=assets.filter(a=>a.assetClass==='Fixed Income');
    const eq=assets.filter(a=>a.assetClass==='Listed Equity');
    const gain=assets.reduce((s,a)=>s+(a.unrealizedGain||0),0);
    const el=document.getElementById('assetKpiGrid');
    el.innerHTML=`
      <div class="pr-kpi"><div class="label">Total Assets</div><div class="value">${assets.length}</div><div class="meta">ZMW ${(total/1_000_000).toFixed(1)}M value</div></div>
      <div class="pr-kpi"><div class="label">Property</div><div class="value">${prop.length}</div><div class="meta">ZMW ${(prop.reduce((s,a)=>s+(a.currentValue||0),0)/1_000_000).toFixed(1)}M • linked to ops</div></div>
      <div class="pr-kpi"><div class="label">Fixed Income</div><div class="value">${fi.length}</div><div class="meta">ZMW ${(fi.reduce((s,a)=>s+(a.currentValue||0),0)/1_000_000).toFixed(1)}M</div></div>
      <div class="pr-kpi"><div class="label">Listed Equity</div><div class="value">${eq.length}</div><div class="meta">ZMW ${(eq.reduce((s,a)=>s+(a.currentValue||0),0)/1_000_000).toFixed(1)}M</div></div>
      <div class="pr-kpi"><div class="label">Unrealized P/L</div><div class="value" style="color:${gain>=0?'#16A34A':'#DC2626'}">ZMW ${(gain/1_000_000).toFixed(2)}M</div><div class="meta">${gain>=0?'Gain':'Loss'} • ${(gain/(total||1)*100).toFixed(2)}%</div></div>
    `;
  }

  function renderTable(){
    filtered=getFiltered();
    const start=(currentPage-1)*pageSize, page=filtered.slice(start,start+pageSize);
    const tbody=document.querySelector('#assetTable tbody');
    tbody.innerHTML=page.map(a=>{
      const gain=a.unrealizedGain||0;
      const gainClass=gain>=0?'green':'red';
      return `<tr data-id="${a.id}" style="cursor:pointer"><td><b>${a.id}</b></td><td><b>${escapeHtml(a.name)}</b>${a.propertyId?`<div class="small muted">↔ ${a.propertyName} • ${a.propertyId} <span class="pill blue" style="margin-left:6px">Linked</span></div>`:''}${a.ticker?`<div class="small muted">${a.ticker} • ${a.exchange}</div>`:''}</td><td><span class="pill ${a.assetClass==='Property'?'blue':a.assetClass==='Fixed Income'?'gray':a.assetClass==='Listed Equity'?'amber':'green'}">${a.assetClass}</span></td><td>${a.fundId}<div class="small muted">${a.portfolioId}</div></td><td>ZMW ${(a.acquisitionCost/1_000_000).toFixed(2)}M</td><td><b>ZMW ${(a.currentValue/1_000_000).toFixed(2)}M</b></td><td><span class="pill ${gainClass}">${gain>=0?'+':''}ZMW ${(gain/1_000_000).toFixed(2)}M</span></td><td>${a.yield||a.coupon||'-'}${a.yield||a.coupon?'%':''}</td><td><span class="pill ${a.riskRating==='High'?'red':a.riskRating==='Medium'?'amber':'green'}">${a.riskRating}</span></td><td><button class="pr-btn" onclick="event.stopPropagation();openDrawer('${a.id}')">View</button></td></tr>`;
    }).join('') || '<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--muted)">No assets found</td></tr>';
    document.getElementById('assetCount').textContent=`${filtered.length} assets • Page ${currentPage} of ${Math.ceil(filtered.length/pageSize)||1}`;
    tbody.querySelectorAll('tr[data-id]').forEach(tr=> tr.addEventListener('click',()=> openDrawer(tr.dataset.id)));
  }

  window.openDrawer=(id)=>{
    selectedId=id;
    const asset=(state.investmentAssets||[]).find(a=>a.id===id);
    if(!asset) return;
    document.getElementById('drawerAssetName').textContent=asset.name;
    document.getElementById('drawerAssetMeta').textContent=`${asset.id} • ${asset.assetClass} • ${asset.fundId} • ${asset.portfolioId}`;
    renderDrawerTab('overview');
    document.getElementById('assetDrawer').classList.add('open');
  };

  function renderDrawerTab(tab){
    const asset=(state.investmentAssets||[]).find(a=>a.id===selectedId);
    if(!asset) return;
    const body=document.getElementById('assetDrawerBody');
    document.querySelectorAll('#assetDrawerTabs .tab').forEach(t=> t.classList.toggle('active', t.dataset.tab===tab));
    if(tab==='overview'){
      body.innerHTML=`
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
          <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:12px"><div class="small muted">Current Value</div><div style="font-size:20px;font-weight:800">ZMW ${(asset.currentValue/1_000_000).toFixed(2)}M</div><div class="small muted">Cost ZMW ${(asset.acquisitionCost/1_000_000).toFixed(2)}M • Gain ${(asset.unrealizedGainPct||0).toFixed(2)}%</div></div>
          <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:12px"><div class="small muted">Fund / Portfolio</div><div style="font-weight:700">${asset.fundId} • ${asset.portfolioId}</div><div class="small muted">${asset.currency} • ${asset.investmentStatus}</div></div>
        </div>
        <div style="margin-top:16px;background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
          <h4 style="margin:0 0 10px">Key Terms</h4>
          <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13px">
            <div style="color:var(--muted)">Issuer</div><div style="font-weight:600">${asset.issuer||asset.propertyName||'-'}</div>
            <div style="color:var(--muted)">Instrument</div><div style="font-weight:600">${asset.instrument||asset.name}</div>
            <div style="color:var(--muted)">Acquisition</div><div style="font-weight:600">${asset.acquisitionDate||'-'} • ZMW ${(asset.acquisitionCost/1_000_000).toFixed(2)}M</div>
            <div style="color:var(--muted)">Yield / Coupon</div><div style="font-weight:600">${asset.yield||asset.coupon||'-'}%</div>
            <div style="color:var(--muted)">Ownership</div><div style="font-weight:600">${asset.ownershipPct||100}%</div>
            <div style="color:var(--muted)">Risk</div><div><span class="pill ${asset.riskRating==='High'?'red':asset.riskRating==='Medium'?'amber':'green'}">${asset.riskRating}</span></div>
          </div>
        </div>
        ${asset.assetClass==='Property'?`<div style="margin-top:16px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px"><h4 style="margin:0 0 8px">Property Investment Performance</h4><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:13px"><div><div class="small muted">Rental Income</div><div style="font-weight:700">ZMW ${(asset.rentalIncome/1_000_000).toFixed(2)}M</div></div><div><div class="small muted">Operating Costs</div><div style="font-weight:700">ZMW ${(asset.operatingCosts/1_000_000).toFixed(2)}M</div></div><div><div class="small muted">NOI</div><div style="font-weight:800">ZMW ${(asset.noi/1_000_000).toFixed(2)}M</div></div><div><div class="small muted">Net Yield</div><div style="font-weight:800;color:#1D4ED8">${asset.yield}%</div></div></div><button class="pr-btn pr-btn-primary" style="margin-top:10px" onclick="goToPage('property-register.html?id=${asset.propertyId}')">Open Operational Property →</button></div>`:''}
      `;
    } else if(tab==='financials'){
      body.innerHTML=`<div class="pr-kpi-grid" style="grid-template-columns:repeat(2,1fr)"><div class="pr-kpi"><div class="label">Cost</div><div class="value">ZMW ${(asset.acquisitionCost/1_000_000).toFixed(2)}M</div></div><div class="pr-kpi"><div class="label">Current Value</div><div class="value">ZMW ${(asset.currentValue/1_000_000).toFixed(2)}M</div></div><div class="pr-kpi"><div class="label">Unrealized P/L</div><div class="value" style="color:${(asset.unrealizedGain||0)>=0?'#16A34A':'#DC2626'}">ZMW ${((asset.unrealizedGain||0)/1_000_000).toFixed(2)}M</div></div><div class="pr-kpi"><div class="label">Yield</div><div class="value">${asset.yield||asset.coupon||0}%</div></div></div>`;
    } else if(tab==='property'){
      const prop=state.properties.find(p=>p.id===asset.propertyId);
      if(!prop) body.innerHTML='<div class="small muted">Not a property asset</div>';
      else body.innerHTML=`<div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px"><h4>${prop.name}</h4><div class="small muted">${prop.city} • ${prop.type} • ${prop.units} units • ${prop.occupied} occupied • ZMW ${prop.value}M</div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="pr-btn" onclick="goToPage('property-register.html?id=${prop.id}')">View Property</button><button class="pr-btn" onclick="goToPage('units.html?property=${prop.id}')">View Units</button><button class="pr-btn" onclick="goToPage('leases.html?property=${prop.id}')">View Leases</button></div><div style="margin-top:12px;font-size:13px;line-height:1.6">Operational data: rent ZMW ${prop.rent}M monthly, occupancy ${Math.round(prop.occupied/prop.units*100)}%, status ${prop.status}. Investment NOI calculated from operational rent minus opex flows upward to fund performance.</div></div>`;
    } else if(tab==='documents'){
      const docs=(state.documents||[]).filter(d=> d.entityId===asset.id || d.entityId===asset.propertyId);
      body.innerHTML=docs.map(d=>`<div style="background:#FFF;border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px"><b>${d.title}</b><div class="small muted">${d.type} • v${d.version} • ${d.uploadedDate} • ${d.status}</div></div>`).join('') || '<div class="small muted">No documents</div>';
    } else if(tab==='audit'){
      const audits=(state.auditTrail||[]).filter(a=> a.entityId===asset.id);
      body.innerHTML=audits.map(a=>`<div style="border-left:2px solid #E2E8F0;padding-left:12px;margin-bottom:12px"><div style="font-size:12px;font-weight:700">${a.action} • ${a.user} • ${new Date(a.timestamp).toLocaleString()}</div><div style="font-size:12px;color:var(--muted)">${a.description}</div></div>`).join('') || '<div class="small muted">No audit events</div>';
    }
  }

  document.querySelectorAll('#assetDrawerTabs .tab').forEach(t=> t.addEventListener('click',()=> renderDrawerTab(t.dataset.tab)));
  document.getElementById('assetDrawerBackdrop').addEventListener('click',()=> document.getElementById('assetDrawer').classList.remove('open'));
  document.getElementById('btnCloseAssetDrawer').addEventListener('click',()=> document.getElementById('assetDrawer').classList.remove('open'));
  document.getElementById('btnViewProperty').addEventListener('click',()=>{ const a=state.investmentAssets.find(x=>x.id===selectedId); if(a?.propertyId) goToPage(`property-register.html?id=${a.propertyId}`); });
  document.getElementById('btnViewUnits').addEventListener('click',()=>{ const a=state.investmentAssets.find(x=>x.id===selectedId); if(a?.propertyId) goToPage(`units.html?property=${a.propertyId}`); });

  [searchEl,fFund,fPortfolio,fClass,fRisk,fStatus].forEach(el=> el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{ currentPage=1; renderKpis(); renderTable(); }));
  document.getElementById('btnClearAssetFilters').addEventListener('click',()=>{ searchEl.value=''; fFund.value='All'; fPortfolio.value='All'; fClass.value='All'; fRisk.value='All'; fStatus.value='All'; currentPage=1; renderKpis(); renderTable(); });
  document.getElementById('prevAssetPage').addEventListener('click',()=>{ if(currentPage>1){currentPage--; renderTable();}});
  document.getElementById('nextAssetPage').addEventListener('click',()=>{ const max=Math.ceil(filtered.length/pageSize); if(currentPage<max){currentPage++; renderTable();}});
  document.getElementById('btnExportAssets').addEventListener('click',()=>{
    let csv='ID,Name,Class,Fund,Portfolio,Cost,Value,Gain,Yield,Risk,Property\n';
    filtered.forEach(a=>{ csv+=`${a.id},"${a.name}",${a.assetClass},${a.fundId},${a.portfolioId},${a.acquisitionCost},${a.currentValue},${a.unrealizedGain||0},${a.yield||''},${a.riskRating},${a.propertyId||''}\n`; });
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const an=document.createElement('a'); an.href=url; an.download='InvestmentAssets.csv'; an.click(); URL.revokeObjectURL(url); toast('Exported','success');
  });

  populateFilters(); renderKpis(); renderTable();
  const qp=new URLSearchParams(location.search); const id=qp.get('id'); if(id){ setTimeout(()=> openDrawer(id), 400); }
});

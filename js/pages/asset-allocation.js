
document.addEventListener('DOMContentLoaded',()=>{
  initCommon('asset-allocation');
  const fundSelect=document.getElementById('allocFundSelect');
  const funds=state.funds||[];
  fundSelect.innerHTML=funds.map(f=>`<option value="${f.id}">${f.name}</option>`).join('');
  let currentFund=funds[0]?.id;
  fundSelect.addEventListener('change', e=>{ currentFund=e.target.value; renderAll(); });

  function renderAll(){
    const allocs=InvestmentCalc.calculateAssetAllocation(currentFund);
    const total=allocs.reduce((s,a)=>s+a.currentValue,0);
    // KPI
    const breaches=allocs.filter(a=>a.status==='BREACH').length;
    const approaching=allocs.filter(a=>a.status==='Approaching Limit').length;
    const maxDrift=Math.max(...allocs.map(a=>Math.abs(a.drift)),0);
    document.getElementById('allocKpiGrid').innerHTML=`
      <div class="pr-kpi"><div class="label">Fund Value</div><div class="value">ZMW ${(total/1_000_000).toFixed(1)}M</div><div class="meta" style="font-size:12px;color:var(--muted)">${currentFund}</div></div>
      <div class="pr-kpi"><div class="label">Breaches</div><div class="value" style="color:${breaches?'#DC2626':'#16A34A'}">${breaches}</div><div class="meta">Asset classes out of range</div></div>
      <div class="pr-kpi"><div class="label">Approaching Limit</div><div class="value">${approaching}</div><div class="meta">Within 3% of limit</div></div>
      <div class="pr-kpi"><div class="label">Max Drift</div><div class="value">${maxDrift.toFixed(2)}%</div><div class="meta">Largest deviation</div></div>
    `;
    // Visual bars
    const visual=document.getElementById('allocVisual');
    const colors={Property:'#2563EB','Fixed Income':'#0E7490','Listed Equity':'#7C3AED','Unlisted Equity':'#D97706','Collective Investments':'#16A34A','Cash':'#64748B'};
    visual.innerHTML=allocs.map(a=>`
      <div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600"><span>${a.assetClass}</span><span>${a.currentPct.toFixed(1)}% vs target ${a.target}%</span></div><div class="bar-track" style="margin-top:4px"><div class="bar-fill" style="width:${Math.min(a.currentPct,100)}%;background:${colors[a.assetClass]||'#94A3B8'}"></div><div class="bar-target" style="left:${a.target}%"></div><div class="bar-target" style="left:${a.minimum}%;background:#FBBF24"></div><div class="bar-target" style="left:${a.maximum}%;background:#FBBF24"></div></div><div style="font-size:10px;color:var(--muted);display:flex;justify-content:space-between"><span>Min ${a.minimum}%</span><span>Max ${a.maximum}%</span></div></div>
    `).join('');
    document.getElementById('allocLegend').innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px"><span style="display:flex;align-items:center;gap:4px"><i style="width:8px;height:8px;background:#0F172A;display:inline-block"></i>Target</span><span style="display:flex;align-items:center;gap:4px"><i style="width:8px;height:8px;background:#FBBF24;display:inline-block"></i>Range</span></div>`;

    // Drift analysis
    const driftEl=document.getElementById('driftAnalysis');
    driftEl.innerHTML=allocs.map(a=>{
      const sev=a.status==='BREACH'?'red':a.status==='Approaching Limit'?'amber':'green';
      return `<div style="display:flex;justify-content:space-between;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:#FFF"><div><b style="font-size:13px">${a.assetClass}</b><div style="font-size:11px;color:var(--muted)">Target ${a.target}% • Current ${a.currentPct.toFixed(2)}%</div></div><div style="text-align:right"><div style="font-weight:800;color:${a.drift>0?'#16A34A':'#DC2626'}">${a.drift>0?'+':''}${a.drift.toFixed(2)}%</div><span class="pill ${sev}" style="margin-top:4px">${a.status}</span></div></div>`;
    }).join('');

    // Table
    const tbody=document.querySelector('#allocTable tbody');
    tbody.innerHTML=allocs.map(a=>{
      const rebalance=a.drift>3 ? `Reduce ZMW ${((a.drift/100)*total/1_000_000).toFixed(1)}M` : a.drift<-3 ? `Increase ZMW ${(Math.abs(a.drift)/100*total/1_000_000).toFixed(1)}M` : 'Hold';
      const sev=a.status==='BREACH'?'red':a.status==='Approaching Limit'?'amber':'green';
      return `<tr><td><b>${a.assetClass}</b></td><td>${a.target}%</td><td>${a.minimum}%</td><td>${a.maximum}%</td><td><b>${a.currentPct.toFixed(2)}%</b></td><td>ZMW ${(a.currentValue/1_000_000).toFixed(1)}M</td><td style="color:${a.drift>0?'#16A34A':'#DC2626'}">${a.drift>0?'+':''}${a.drift.toFixed(2)}%</td><td><span class="pill ${sev}">${a.status}</span></td><td>${rebalance}</td></tr>`;
    }).join('');

    // Rebalance rec
    const recEl=document.getElementById('rebalanceRec');
    const breachAllocs=allocs.filter(a=>a.status!=='Within Range');
    if(breachAllocs.length===0) recEl.innerHTML='<div style="padding:12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;color:#15803D">✅ All allocations within permitted ranges. No rebalancing required.</div>';
    else recEl.innerHTML=breachAllocs.map(a=>`<div style="padding:10px;border:1px solid ${a.status==='BREACH'?'#FECACA':'#FDE68A'};background:${a.status==='BREACH'?'#FEF2F2':'#FFFBEB'};border-radius:8px;margin-bottom:8px"><b>${a.assetClass} — ${a.status}</b><div style="font-size:12px;margin-top:4px">Current ${a.currentPct.toFixed(2)}% vs target ${a.target}% (range ${a.minimum}-${a.maximum}%). Drift ${a.drift.toFixed(2)}%. ${a.drift>0?`Reduce by ZMW ${((a.drift/100)*total/1_000_000).toFixed(1)}M`:`Increase by ZMW ${(Math.abs(a.drift)/100*total/1_000_000).toFixed(1)}M`} to return to target.</div></div>`).join('');
  }

  document.getElementById('btnRebalance').addEventListener('click',()=>{ toast('Rebalancing check completed','success'); renderAll(); });
  document.getElementById('btnEditAlloc').addEventListener('click',()=> toast('Edit allocation targets — implement form',''));

  renderAll();
});

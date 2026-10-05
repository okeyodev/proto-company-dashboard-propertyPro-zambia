
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

  function openTargetEditor(){
    const allocations=state.assetAllocations||[];
    const targets=allocations.filter(allocation=>allocation.fundId===currentFund);
    if(!targets.length){
      toast('No allocation targets exist for this fund yet','error');
      return;
    }
    let backdrop=document.getElementById('allocationTargetsBackdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.id='allocationTargetsBackdrop';
      backdrop.className='modal-backdrop';
      document.body.appendChild(backdrop);
    }
    backdrop.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="allocationTargetsTitle"><form>
      <div class="modal-head"><h3 id="allocationTargetsTitle" style="margin:0">Edit Allocation Targets</h3><button type="button" class="btn btn-ghost" data-close>✕</button></div>
      <div class="modal-body"><div class="small muted" style="margin-bottom:10px">${escapeHtml(currentFund)} • target percentages must total 100%.</div>
        <div style="display:grid;grid-template-columns:minmax(150px,1.4fr) repeat(3,minmax(90px,1fr));gap:8px;align-items:center;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:8px"><span>Asset class</span><span>Target %</span><span>Minimum %</span><span>Maximum %</span></div>
        ${targets.map((allocation,index)=>`<div style="display:grid;grid-template-columns:minmax(150px,1.4fr) repeat(3,minmax(90px,1fr));gap:8px;align-items:center;margin-bottom:8px">
          <b style="font-size:12px">${escapeHtml(allocation.assetClass)}</b>
          ${[['target',allocation.target],['minimum',allocation.minimum],['maximum',allocation.maximum]].map(([key,value])=>`<input aria-label="${escapeHtml(allocation.assetClass)} ${key}" name="${key}-${index}" type="number" min="0" max="100" step="0.1" value="${Number(value)}" required style="width:100%;height:34px;border:1px solid var(--border);border-radius:8px;padding:0 8px">`).join('')}
        </div>`).join('')}
        <div role="alert" class="small muted" style="margin-top:10px;color:#B91C1C"></div>
      </div><div class="modal-foot" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn-primary">Save Targets</button></div>
    </form></div>`;
    backdrop.classList.add('open');
    const close=()=>backdrop.classList.remove('open');
    backdrop.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',close));
    backdrop.onclick=event=>{if(event.target===backdrop) close();};
    backdrop.querySelector('form').addEventListener('submit',event=>{
      event.preventDefault();
      const values=new FormData(event.currentTarget);
      const next=targets.map((allocation,index)=>({
        allocation,
        target:Number(values.get(`target-${index}`)),
        minimum:Number(values.get(`minimum-${index}`)),
        maximum:Number(values.get(`maximum-${index}`))
      }));
      const totalTarget=next.reduce((sum,item)=>sum+item.target,0);
      const invalid=next.some(item=>!Number.isFinite(item.target)||!Number.isFinite(item.minimum)||!Number.isFinite(item.maximum)||item.minimum<0||item.minimum>100||item.target<0||item.target>100||item.maximum<0||item.maximum>100||item.minimum>item.target||item.target>item.maximum);
      const error=backdrop.querySelector('[role="alert"]');
      if(invalid){
        error.textContent='Each range must satisfy 0 ≤ minimum ≤ target ≤ maximum ≤ 100.';
        return;
      }
      if(Math.abs(totalTarget-100)>0.01){
        error.textContent=`Targets must total 100% (currently ${totalTarget.toFixed(1)}%).`;
        return;
      }
      next.forEach(item=>Object.assign(item.allocation,{target:item.target,minimum:item.minimum,maximum:item.maximum}));
      saveState();
      close();
      renderAll();
      toast('Allocation targets saved','success');
    });
  }

  document.getElementById('btnRebalance').addEventListener('click',()=>{
    const allocs=InvestmentCalc.calculateAssetAllocation(currentFund);
    const breaches=allocs.filter(allocation=>allocation.status==='BREACH').length;
    const approaching=allocs.filter(allocation=>allocation.status==='Approaching Limit').length;
    renderAll();
    toast(breaches||approaching
      ? `Rebalance check complete: ${breaches} breach${breaches===1?'':'es'}, ${approaching} approaching limit. Review recommendations below.`
      : 'Rebalance check complete: all allocations are within range.','success');
  });
  document.getElementById('btnEditAlloc').addEventListener('click',openTargetEditor);

  renderAll();
});

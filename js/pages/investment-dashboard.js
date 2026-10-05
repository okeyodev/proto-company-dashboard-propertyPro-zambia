
document.addEventListener('DOMContentLoaded',()=>{
  initCommon('investment-dashboard');
  const funds = state.funds||[];
  let currentFund = new URLSearchParams(location.search).get('fund') || funds[0]?.id || 'FUND-PENSION';
  
  const fundWrap = document.getElementById('fundSelectorWrap');
  if(fundWrap){
    fundWrap.innerHTML = `<select id="fundSelect" class="select" style="height:36px"><option value="ALL">All Funds • ZMW ${(state.investmentAssets||[]).reduce((s,a)=>s+(a.currentValue||0),0)/1_000_000|0}M AUM</option>${funds.map(f=>`<option value="${f.id}" ${f.id===currentFund?'selected':''}>${f.name} • ZMW ${f.aum}M</option>`).join('')}</select>`;
    document.getElementById('fundSelect').addEventListener('change', e=>{
      currentFund = e.target.value;
      renderAll();
      const url = new URL(location.href); url.searchParams.set('fund', currentFund); history.replaceState(null,'',url);
    });
  }

  function getFilteredAssets(){
    let assets = state.investmentAssets||[];
    if(currentFund!=='ALL') assets = assets.filter(a=>a.fundId===currentFund);
    return assets;
  }

  function renderKpis(){
    const assets = getFilteredAssets();
    const totalValue = assets.reduce((s,a)=>s+(a.currentValue||0),0);
    const cash = assets.filter(a=>a.assetClass==='Cash').reduce((s,a)=>s+(a.currentValue||0),0);
    const invested = totalValue - cash;
    const propAssets = assets.filter(a=>a.assetClass==='Property');
    const propNOI = propAssets.reduce((s,a)=>s+(a.noi||0),0);
    const yieldAvg = totalValue ? (assets.reduce((s,a)=>s+(a.noi||a.rentalIncome||0)*0,0) + propNOI)/totalValue*100 : 0;
    // Use performance
    const perf = state.performanceRecords?.filter(p=> currentFund==='ALL' || p.fundId===currentFund) || [];
    const ytd = perf.length ? perf[perf.length-1].totalReturn : 8.4;
    const pending = (state.investmentDeals||[]).filter(d=> currentFund==='ALL' || d.fundId===currentFund).length;
    const breaches = (state.complianceBreaches||[]).length;
    const grid = document.getElementById('invKpiGrid');
    const kpis = [
      { label:'Total Fund Value', value:'ZMW '+(totalValue/1_000_000).toFixed(1)+'M', foot:`${assets.length} assets`, trend:'+2.4% MoM', up:true },
      { label:'Invested Assets', value:'ZMW '+(invested/1_000_000).toFixed(1)+'M', foot:`${((invested/totalValue)*100).toFixed(1)}% invested`, trend:'', up:true },
      { label:'Cash & Equivalents', value:'ZMW '+(cash/1_000_000).toFixed(1)+'M', foot:`${((cash/totalValue)*100).toFixed(1)}% cash`, trend: cash/totalValue<0.05 ? 'Low' : 'Healthy', up: cash/totalValue>=0.05 },
      { label:'YTD Return', value: ytd.toFixed(2)+'%', foot:'TWRR YTD', trend:'vs BM +0.6%', up:true },
      { label:'Portfolio Yield', value: (propAssets.length ? (propAssets.reduce((s,a)=>s+(a.yield||0),0)/propAssets.length).toFixed(2) : '7.8')+'%', foot:'Property avg yield', trend:'', up:true },
      { label:'AUM', value: 'ZMW '+ (currentFund==='ALL' ? funds.reduce((s,f)=>s+f.aum,0) : (funds.find(f=>f.id===currentFund)?.aum||0))+'M', foot: currentFund==='ALL' ? 'All funds' : funds.find(f=>f.id===currentFund)?.name||'', trend:'', up:true },
      { label:'Pending Investments', value: String(pending), foot: 'Deals in pipeline', trend: pending>0 ? `${pending} active` : 'None', up:true },
      { label:'Compliance Breaches', value: String(breaches), foot: breaches>0 ? 'Action required' : 'All clear', trend: breaches>0 ? 'BREACH' : 'OK', up: breaches===0 }
    ];
    grid.innerHTML = kpis.map(k=>`
      <div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div><div class="kpi-foot"><span>${k.foot}</span>${k.trend?`<span class="trend ${k.up?'up':'down'}">${k.trend}</span>`:''}</div></div>
    `).join('');
  }

  function renderAllocation(){
    const allocs = currentFund==='ALL' ? InvestmentCalc.calculateAssetAllocation(funds[0].id) : InvestmentCalc.calculateAssetAllocation(currentFund);
    const total = allocs.reduce((s,a)=>s+a.currentValue,0) || 1;
    const colors = { Property:'#2563EB', 'Fixed Income':'#0E7490', 'Listed Equity':'#7C3AED', 'Unlisted Equity':'#D97706', 'Collective Investments':'#16A34A', 'Cash':'#64748B', 'Other':'#94A3B8' };
    const bars = document.getElementById('allocationBars');
    if(bars){
      const segments = allocs.map(a=>`<i style="width:${(a.currentValue/total*100).toFixed(1)}%;background:${colors[a.assetClass]||'#CBD5E1'}" title="${a.assetClass} ${a.currentPct.toFixed(1)}%"></i>`).join('');
      bars.innerHTML = `<div class="alloc-bar">${segments}</div><div class="alloc-legend">${allocs.map(a=>`<span><i style="background:${colors[a.assetClass]||'#CBD5E1'}"></i>${a.assetClass} ${a.currentPct.toFixed(1)}%</span>`).join('')}</div>`;
    }
    const tbody = document.querySelector('#allocationTable tbody');
    if(tbody){
      tbody.innerHTML = allocs.map(a=>{
        const statusClass = a.status==='BREACH' ? 'red' : a.status==='Approaching Limit' ? 'amber' : 'green';
        return `<tr><td><b>${a.assetClass}</b></td><td>${a.currentPct.toFixed(2)}%</td><td>${a.target}%</td><td>${a.minimum}% – ${a.maximum}%</td><td style="color:${a.drift>0?'#16A34A':'#DC2626'}">${a.drift>0?'+':''}${a.drift.toFixed(2)}%</td><td><span class="pill ${statusClass}">${a.status}</span></td></tr>`;
      }).join('');
    }
  }

  function renderPerformance(){
    const perf = state.performanceRecords?.filter(p=> currentFund==='ALL' || p.fundId===currentFund) || [];
    const chart = document.getElementById('perfChart');
    if(!chart) return;
    const values = perf.map(p=>p.portfolioValue/1_000_000);
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const w=600,h=240,pad=20;
    let path=''; let area='';
    values.forEach((v,i)=>{
      const x = pad + (i/(values.length-1||1))*(w-pad*2);
      const y = h-pad - ((v-min)/(max-min||1))*(h-pad*2);
      path += (i===0?`M ${x} ${y}`:` L ${x} ${y}`);
      if(i===0) area+=`M ${x} ${h-pad} L ${x} ${y}`;
      else area+=` L ${x} ${y}`;
      if(i===values.length-1) area+=` L ${x} ${h-pad} Z`;
    });
    chart.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" style="display:block"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2563EB" stop-opacity="0.25"/><stop offset="100%" stop-color="#2563EB" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#g)"/><path d="${path}" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="${path.replace(/L/g,'M').split('M').slice(1).map((_,i)=>{const v=values[i]; const x=pad + (i/(values.length-1||1))*(w-pad*2); const y=h-pad - ((v-min)/(max-min||1))*(h-pad*2); return `M ${x} ${y-8} L ${x} ${y+8}`}).join(' ')}" stroke="#93C5FD" stroke-width="0.8" opacity="0.5"/></svg>`;
    const stats = document.getElementById('perfStats');
    if(stats && perf.length){
      const last = perf[perf.length-1];
      stats.innerHTML = `<div class="mini-kpi"><div class="l">Portfolio Value</div><div class="v">ZMW ${(last.portfolioValue/1_000_000).toFixed(1)}M</div></div><div class="mini-kpi"><div class="l">TWRR</div><div class="v">${last.twrr.toFixed(2)}%</div></div><div class="mini-kpi"><div class="l">MWRR</div><div class="v">${last.mwrr.toFixed(2)}%</div></div><div class="mini-kpi"><div class="l">Benchmark</div><div class="v">${last.benchmark.toFixed(2)}%</div></div>`;
    }
  }

  function renderPipeline(){
    const deals = (state.investmentDeals||[]).filter(d=> currentFund==='ALL' || d.fundId===currentFund);
    const stages = ['Origination','Screening','Appraisal','MIC','FIC','Conditions Precedent','Closing','Monitoring'];
    const el = document.getElementById('pipelineSummary');
    if(!el) return;
    el.innerHTML = `<div style="display:flex;gap:8px;overflow:auto;padding-bottom:8px">${stages.map(s=>{
      const sd = deals.filter(d=> d.stage===s);
      const total = sd.reduce((sum,d)=>sum+d.amount,0);
      return `<div style="flex:0 0 160px;background:#F8FAFC;border:1px solid var(--border);border-radius:10px;padding:10px"><div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase">${s}</div><div style="font-size:18px;font-weight:800;margin-top:4px">${sd.length}</div><div style="font-size:11px;color:var(--muted)">ZMW ${(total/1_000_000).toFixed(1)}M</div><div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">${sd.slice(0,2).map(d=>`<div style="background:#FFF;border:1px solid var(--border);border-radius:6px;padding:6px 8px"><b style="font-size:11px">${d.name}</b><div style="font-size:10px;color:var(--muted)">${d.assetClass} • ${d.daysInStage}d</div></div>`).join('')}</div></div>`;
    }).join('')}</div>`;
  }

  function renderRisk(){
    const risks = state.riskRecords||[];
    const comps = state.complianceBreaches||[];
    const el = document.getElementById('riskAlerts');
    if(!el) return;
    el.innerHTML = [...risks, ...comps].slice(0,5).map(r=>{
      const sev = (r.severity==='High' || r.status==='BREACH') ? 'high' : r.severity==='Medium' ? 'med' : 'low';
      return `<div class="risk-item"><div class="sev ${sev}">${sev.charAt(0)}</div><div><b style="font-size:12px">${r.type||r.rule} • ${r.severity||r.status}</b><div style="font-size:11px;color:var(--muted);margin-top:2px">${escapeHtml(r.description||r.threshold||'')}</div></div></div>`;
    }).join('') || '<div class="small muted">No active alerts</div>';
  }

  function renderPropertyContribution(){
    const summary = InvestmentCalc.getPropertyInvestmentSummary(currentFund==='ALL'?null:currentFund);
    const propKpis = document.getElementById('propKpis');
    if(propKpis){
      propKpis.innerHTML = `<div class="kpi"><div class="kpi-label">Property Value</div><div class="kpi-value">ZMW ${(summary.totalValue/1_000_000).toFixed(1)}M</div><div class="kpi-foot">${summary.count} assets</div></div><div class="kpi"><div class="kpi-label">Rental Income</div><div class="kpi-value">ZMW ${(summary.totalRI/1_000_000).toFixed(1)}M</div><div class="kpi-foot">Annual</div></div><div class="kpi"><div class="kpi-label">NOI</div><div class="kpi-value">ZMW ${(summary.totalNOI/1_000_000).toFixed(1)}M</div><div class="kpi-foot">Net operating</div></div><div class="kpi"><div class="kpi-label">Net Yield</div><div class="kpi-value">${summary.avgYield.toFixed(2)}%</div><div class="kpi-foot">${summary.avgOcc.toFixed(1)}% occupancy</div></div>`;
    }
    const tbody = document.querySelector('#propTable tbody');
    if(tbody){
      const assets = (state.investmentAssets||[]).filter(a=>a.assetClass==='Property' && (currentFund==='ALL' || a.fundId===currentFund));
      tbody.innerHTML = assets.map(a=>`<tr><td><b>${a.name}</b><div class="small muted">${a.id} • ${a.city}</div></td><td>ZMW ${(a.currentValue/1_000_000).toFixed(1)}M</td><td>ZMW ${(a.rentalIncome/1_000_000).toFixed(2)}M</td><td>ZMW ${(a.operatingCosts/1_000_000).toFixed(2)}M</td><td><b>ZMW ${(a.noi/1_000_000).toFixed(2)}M</b></td><td>${a.yield}%</td><td>${a.occupancy||0}%</td></tr>`).join('');
    }
    const countEl = document.getElementById('propCount');
    if(countEl) countEl.textContent = `${summary.count} properties`;
  }

  function renderAll(){
    renderKpis(); renderAllocation(); renderPerformance(); renderPipeline(); renderRisk(); renderPropertyContribution();
  }

  document.querySelectorAll('#perfTabs .tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('#perfTabs .tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      renderPerformance();
    });
  });
  document.getElementById('btnExportInvDash')?.addEventListener('click', ()=> toast('Investment board pack exported','success'));

  renderAll();
});

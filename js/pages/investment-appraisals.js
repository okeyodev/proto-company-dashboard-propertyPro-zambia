
document.addEventListener('DOMContentLoaded',()=>{
  initCommon('investment-appraisals');
  const select=document.getElementById('appraisalSelect');
  const appraisals=state.appraisals||[];
  select.innerHTML=appraisals.map(a=>`<option value="${a.id}">${a.id} • ${a.company} • ${a.status}</option>`).join('');
  let current=appraisals[0]?.id;
  if(new URLSearchParams(location.search).get('id')){
    const dealId=new URLSearchParams(location.search).get('id');
    const found=appraisals.find(a=>a.dealId===dealId);
    if(found) current=found.id;
  }
  select.value=current;
  select.addEventListener('change', e=>{ current=e.target.value; renderAll(); });

  function getCurrent(){ return state.appraisals.find(a=>a.id===current); }

  function renderAll(){
    const app=getCurrent(); if(!app) return;
    const deal=state.investmentDeals.find(d=>d.id===app.dealId);
    document.getElementById('dealContext').innerHTML= deal ? `<b>${deal.name}</b><div>${deal.id} • ${deal.assetClass} • ZMW ${(deal.amount/1_000_000).toFixed(1)}M • ${deal.stage}</div><div style="margin-top:6px"><span class="pill blue">${deal.expectedReturn}% IRR</span> <span class="pill gray">${deal.riskRating}</span></div>` : 'No deal linked';
    document.getElementById('companyProfile').innerHTML=`<b>${app.company}</b><div class="small muted" style="margin-top:4px">Deal ${app.dealId} • Appraisal ${app.id}</div><div style="margin-top:8px;font-size:12px">Revenue ZMW ${(app.revenue/1_000_000).toFixed(1)}M • EBITDA ZMW ${(app.ebitda/1_000_000).toFixed(1)}M • Net ZMW ${(app.netIncome/1_000_000).toFixed(1)}M</div><div style="margin-top:8px;font-size:11px;color:var(--muted)">Assets ZMW ${(app.assets/1_000_000).toFixed(1)}M • Liabilities ZMW ${(app.liabilities/1_000_000).toFixed(1)}M • Equity ZMW ${(app.equity/1_000_000).toFixed(1)}M</div>`;
    document.getElementById('analystInfo').innerHTML=`<b>${app.analyst||'Grace Banda'}</b><div class="small muted">Equity Research • Lusaka</div><div style="margin-top:6px"><span class="pill ${app.status==='Approved'?'green':app.status==='Under Review'?'amber':'blue'}">${app.status}</span></div>`;

    // Financials editor
    const finEl=document.getElementById('financialsEditor');
    finEl.innerHTML=`
      <div><h4 style="margin:0 0 8px;font-size:12px">Income Statement</h4>
        <div class="ratio-row"><span>Revenue</span><b>ZMW ${(app.revenue/1_000_000).toFixed(2)}M</b></div>
        <div class="ratio-row"><span>EBITDA</span><b>ZMW ${(app.ebitda/1_000_000).toFixed(2)}M</b></div>
        <div class="ratio-row"><span>EBIT</span><b>ZMW ${(app.ebit/1_000_000).toFixed(2)}M</b></div>
        <div class="ratio-row"><span>Net Income</span><b>ZMW ${(app.netIncome/1_000_000).toFixed(2)}M</b></div>
      </div>
      <div><h4 style="margin:0 0 8px;font-size:12px">Balance Sheet</h4>
        <div class="ratio-row"><span>Total Assets</span><b>ZMW ${(app.assets/1_000_000).toFixed(2)}M</b></div>
        <div class="ratio-row"><span>Total Liabilities</span><b>ZMW ${(app.liabilities/1_000_000).toFixed(2)}M</b></div>
        <div class="ratio-row"><span>Equity</span><b>ZMW ${(app.equity/1_000_000).toFixed(2)}M</b></div>
        <div class="ratio-row"><span>Cash (est.)</span><b>ZMW ${(app.assets*0.15/1_000_000).toFixed(2)}M</b></div>
      </div>
    `;

    // Ratios calculations
    const currentRatio = (app.assets*0.3) / (app.liabilities*0.4 || 1);
    const quickRatio = (app.assets*0.2) / (app.liabilities*0.4 || 1);
    const debtEquity = app.liabilities / (app.equity||1);
    const debtEbitda = app.liabilities / (app.ebitda||1);
    const interestCov = app.ebit / (app.liabilities*0.08 || 1);
    const grossMargin = (app.ebitda / (app.revenue||1))*100;
    const ebitdaMargin = grossMargin;
    const netMargin = (app.netIncome / (app.revenue||1))*100;
    const roa = (app.netIncome / (app.assets||1))*100;
    const roe = (app.netIncome / (app.equity||1))*100;
    const assetTurnover = app.revenue / (app.assets||1);

    document.getElementById('liquidityRatios').innerHTML=`
      <div class="ratio-row"><span>Current Ratio</span><b>${currentRatio.toFixed(2)} <span class="pill ${currentRatio>1.5?'green':currentRatio>1?'amber':'red'}" style="margin-left:6px">${currentRatio>1.5?'Healthy':currentRatio>1?'Watch':'Low'}</span></b></div>
      <div class="ratio-row"><span>Quick Ratio</span><b>${quickRatio.toFixed(2)}</b></div>
      <div class="ratio-row"><span>Debt / Equity</span><b>${debtEquity.toFixed(2)}x</b></div>
      <div class="ratio-row"><span>Debt / EBITDA</span><b>${debtEbitda.toFixed(2)}x</b></div>
      <div class="ratio-row"><span>Interest Coverage</span><b>${interestCov.toFixed(2)}x</b></div>
    `;
    document.getElementById('profitRatios').innerHTML=`
      <div class="ratio-row"><span>EBITDA Margin</span><b>${ebitdaMargin.toFixed(1)}%</b></div>
      <div class="ratio-row"><span>Net Margin</span><b>${netMargin.toFixed(1)}%</b></div>
      <div class="ratio-row"><span>ROA</span><b>${roa.toFixed(1)}%</b></div>
      <div class="ratio-row"><span>ROE</span><b>${roe.toFixed(1)}%</b></div>
      <div class="ratio-row"><span>Asset Turnover</span><b>${assetTurnover.toFixed(2)}x</b></div>
      <div class="ratio-row"><span>Receivable Days (est.)</span><b>45d</b></div>
    `;
    document.getElementById('valuationRatios').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        <div class="ratio-row"><span>P/E (est.)</span><b>${(app.equity / (app.netIncome||1)).toFixed(1)}x</b></div>
        <div class="ratio-row"><span>P/B</span><b>${(app.equity / (app.equity||1)).toFixed(1)}x</b></div>
        <div class="ratio-row"><span>EV/EBITDA</span><b>${((app.assets) / (app.ebitda||1)).toFixed(1)}x</b></div>
      </div>
    `;

    // Calculator inputs
    const inputsEl=document.getElementById('calcInputs');
    inputsEl.innerHTML=`
      <div class="calc-input"><label>Initial Investment (ZMW)</label><input id="calcInitial" type="number" value="${deal?.amount||50000000}"></div>
      <div class="calc-input"><label>Annual Cash Flow Y1</label><input id="calcCF1" type="number" value="${Math.round(app.ebitda*0.6)}"></div>
      <div class="calc-input"><label>Growth Rate %</label><input id="calcGrowth" type="number" value="5" step="0.5"></div>
      <div class="calc-input"><label>Discount Rate %</label><input id="calcDiscount" type="number" value="12" step="0.5"></div>
      <div class="calc-input"><label>Terminal Growth %</label><input id="calcTermGrowth" type="number" value="2" step="0.5"></div>
      <div class="calc-input"><label>Years</label><input id="calcYears" type="number" value="5" min="1" max="20"></div>
    `;
    renderCalc();
  }

  function renderCalc(){
    const initial = parseFloat(document.getElementById('calcInitial')?.value||50000000);
    const cf1 = parseFloat(document.getElementById('calcCF1')?.value||5000000);
    const growth = parseFloat(document.getElementById('calcGrowth')?.value||5)/100;
    const discount = parseFloat(document.getElementById('calcDiscount')?.value||12)/100;
    const termGrowth = parseFloat(document.getElementById('calcTermGrowth')?.value||2)/100;
    const years = parseInt(document.getElementById('calcYears')?.value||5);
    const scenario=document.getElementById('scenarioSelect')?.value||'Base';
    const mult = scenario==='Upside'?1.2:scenario==='Downside'?0.8:1;
    const cashFlows=[-initial];
    for(let i=0;i<years;i++){ cashFlows.push(cf1 * Math.pow(1+growth,i) * mult); }
    const fcf = cashFlows.slice(1);
    const npv = InvestmentCalc.calculateNPV(cashFlows, discount);
    const irr = InvestmentCalc.calculateIRR(cashFlows);
    const dcf = InvestmentCalc.calculateDCF(fcf, discount, termGrowth);
    document.getElementById('calcResults').innerHTML=`
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:11px;color:var(--muted);font-weight:700">NPV (${scenario})</div><div style="font-size:18px;font-weight:800;color:${npv>=0?'#16A34A':'#DC2626'}">ZMW ${(npv/1_000_000).toFixed(2)}M</div></div>
        <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:11px;color:var(--muted);font-weight:700">IRR</div><div style="font-size:18px;font-weight:800">${irr.toFixed(2)}%</div></div>
        <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:12px"><div style="font-size:11px;color:var(--muted);font-weight:700">Enterprise Value (DCF)</div><div style="font-size:18px;font-weight:800">ZMW ${(dcf.enterpriseValue/1_000_000).toFixed(2)}M</div></div>
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px"><div style="font-size:11px;color:#1D4ED8;font-weight:700">Decision</div><div style="font-size:14px;font-weight:800">${npv>0?'✅ Invest - NPV positive':'⚠️ Reject - NPV negative'} • ${irr>discount*100?'IRR > WACC':''}</div></div>
      </div>
      <div style="margin-top:12px;font-size:12px;color:var(--muted)">Cash flows: ${cashFlows.map((cf,i)=> i===0?`Y0 ZMW ${(cf/1_000_000).toFixed(1)}M`:`Y${i} ZMW ${(cf/1_000_000).toFixed(1)}M`).join(' → ')}</div>
    `;
    const sens=InvestmentCalc.sensitivityTable(fcf, discount, termGrowth, [0.08,0.10,0.12,0.14], [0.01,0.02,0.03]);
    document.getElementById('sensitivityTable').innerHTML=`
      <h4 style="margin:12px 0 8px;font-size:12px">Sensitivity: Enterprise Value vs Discount & Terminal Growth</h4>
      <div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="padding:8px;border:1px solid var(--border);background:#F8FAFC">Discount ↓ / Growth →</th><th style="padding:8px;border:1px solid var(--border)">1%</th><th style="padding:8px;border:1px solid var(--border)">2%</th><th style="padding:8px;border:1px solid var(--border)">3%</th></tr></thead><tbody>
      ${sens.map(r=>`<tr><td style="padding:8px;border:1px solid var(--border);font-weight:700">${(r.discount*100).toFixed(0)}%</td>${Object.values(r.values).map(v=>`<td style="padding:8px;border:1px solid var(--border)">ZMW ${(v/1_000_000).toFixed(1)}M</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
    `;
  }

  document.getElementById('btnCalc').addEventListener('click', renderCalc);
  document.getElementById('scenarioSelect').addEventListener('change', renderCalc);
  document.getElementById('btnNewAppraisal').addEventListener('click',()=> toast('New appraisal — form coming soon',''));
  document.getElementById('btnEditFinancials').addEventListener('click',()=> toast('Edit financials',''));
  document.getElementById('btnSaveFinancials').addEventListener('click',()=>{ toast('Saved','success'); renderAll(); });

  renderAll();
});

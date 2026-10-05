
/**
 * PropertyPro Zambia - Investment Calculations Layer
 * Reusable helpers for Property -> Investment flow
 * Framework-free, pure JS, testable
 */

(function(global){

  function getCurrency(currency){
    const configured = currency ||
      global.state?.settings?.finance?.defaultCurrency ||
      global.state?.settings?.finance?.currency ||
      'ZMW';
    return /^[A-Z]{3}$/.test(configured) ? configured : 'ZMW';
  }

  function formatCurrency(value, opts={}){
    const currency = getCurrency(opts.currency);
    if(value==null || !Number.isFinite(Number(value))) return opts.compact ? '0' : `${currency} 0`;
    value = Number(value);
    const abs = Math.abs(value);
    let formatted;
    if(abs >= 1_000_000_000) formatted = (value/1_000_000_000).toFixed(2)+'B';
    else if(abs >= 1_000_000) formatted = (value/1_000_000).toFixed(2)+'M';
    else if(abs >= 1000) formatted = (value/1000).toFixed(1)+'k';
    else formatted = value.toLocaleString();
    return (opts.compact ? '' : `${currency} `) + formatted;
  }

  function formatCurrencyZMW(value, opts={}){
    return formatCurrency(value, opts);
  }

  function formatCurrencyFull(value, currency){
    const code = getCurrency(currency);
    if(value==null || !Number.isFinite(Number(value))) return `${code} 0`;
    const locale = code === 'NGN' ? 'en-NG' : code === 'ZMW' ? 'en-ZM' : undefined;
    return `${code} ` + Number(value).toLocaleString(locale, {maximumFractionDigits:0});
  }

  function formatPercent(v, dec=2){
    if(v==null || isNaN(v)) return '0%';
    return Number(v).toFixed(dec)+'%';
  }

  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // Property NOI = Rental Income - Operating Costs
  function calculatePropertyNOI(propertyId){
    const st = global.state || {};
    const asset = (st.investmentAssets||[]).find(a=> a.propertyId===propertyId || a.linkedPropertyId===propertyId);
    if(asset){
      const ri = asset.rentalIncome || 0;
      const oc = asset.operatingCosts || 0;
      return ri - oc;
    }
    // fallback from property rent (monthly rent in M *12)
    const prop = (st.properties||[]).find(p=>p.id===propertyId);
    if(!prop) return 0;
    const annualRent = (prop.rent||0)*12*1_000_000;
    const opex = annualRent*0.28; // assume 28% opex if not in investment asset
    return annualRent - opex;
  }

  function calculatePropertyYield(propertyId){
    const st = global.state || {};
    const asset = (st.investmentAssets||[]).find(a=> a.propertyId===propertyId || a.linkedPropertyId===propertyId);
    const noi = calculatePropertyNOI(propertyId);
    const val = asset ? asset.currentValue : ((st.properties||[]).find(p=>p.id===propertyId)?.value||0)*1_000_000;
    if(!val) return 0;
    return (noi/val)*100;
  }

  function calculatePortfolioValue(portfolioId){
    const st = global.state || {};
    const assets = (st.investmentAssets||[]).filter(a=> a.portfolioId===portfolioId);
    return assets.reduce((s,a)=> s + (a.currentValue||0),0);
  }

  function calculateFundValue(fundId){
    const st = global.state || {};
    const assets = (st.investmentAssets||[]).filter(a=> a.fundId===fundId);
    return assets.reduce((s,a)=> s + (a.currentValue||0),0) + ((st.cashAccounts||[]).filter(c=>c.fundId===fundId).reduce((s,c)=>s+(c.currentBalance||0),0));
  }

  function calculateAssetAllocation(fundId){
    const st = global.state || {};
    const fundAssets = (st.investmentAssets||[]).filter(a=> a.fundId===fundId);
    const total = fundAssets.reduce((s,a)=> s + (a.currentValue||0),0) || 1;
    const classes = [...new Set(fundAssets.map(a=>a.assetClass))];
    const allocations = st.assetAllocations?.filter(a=>a.fundId===fundId) || [];
    return classes.map(cls=>{
      const clsAssets = fundAssets.filter(a=>a.assetClass===cls);
      const currentVal = clsAssets.reduce((s,a)=>s+(a.currentValue||0),0);
      const currentPct = (currentVal/total)*100;
      const alloc = allocations.find(a=>a.assetClass===cls) || {target:0, minimum:0, maximum:100};
      const drift = currentPct - (alloc.target||0);
      let status = 'Within Range';
      if(currentPct < alloc.minimum || currentPct > alloc.maximum) status='BREACH';
      else if(Math.abs(drift) > 3) status='Approaching Limit';
      return {
        assetClass: cls,
        currentValue: currentVal,
        currentPct,
        target: alloc.target||0,
        minimum: alloc.minimum||0,
        maximum: alloc.maximum||0,
        drift,
        status
      };
    });
  }

  function calculateAllocationDrift(fundId, assetClass){
    const allocs = calculateAssetAllocation(fundId);
    const found = allocs.find(a=>a.assetClass===assetClass);
    return found ? found.drift : 0;
  }

  // Financial maths
  function calculateNPV(cashFlows, discountRate){
    // cashFlows[0] = initial (negative), rest annual
    // discountRate as decimal e.g. 0.12
    let npv = 0;
    cashFlows.forEach((cf,i)=>{
      npv += cf / Math.pow(1+discountRate, i);
    });
    return npv;
  }

  function calculateIRR(cashFlows, guess=0.1){
    // Newton-Raphson
    let r = guess;
    for(let iter=0; iter<100; iter++){
      let npv = 0, dnpv=0;
      cashFlows.forEach((cf,i)=>{
        npv += cf / Math.pow(1+r, i);
        if(i>0) dnpv -= i*cf / Math.pow(1+r, i+1);
      });
      if(Math.abs(npv) < 0.01) break;
      if(dnpv===0) break;
      r = r - npv/dnpv;
      if(r < -0.9) r = -0.9;
    }
    return r*100; // percent
  }

  function calculateDCF(fcfArray, discountRate, terminalGrowth, terminalValueExplicit=null){
    // fcfArray = forecast free cash flows
    let pv = 0;
    fcfArray.forEach((fcf,i)=>{
      pv += fcf / Math.pow(1+discountRate, i+1);
    });
    let terminal = terminalValueExplicit;
    if(terminal===null && fcfArray.length>0){
      const last = fcfArray[fcfArray.length-1];
      terminal = (last * (1+terminalGrowth)) / (discountRate - terminalGrowth);
    }
    const pvTerminal = terminal / Math.pow(1+discountRate, fcfArray.length);
    return { enterpriseValue: pv + pvTerminal, pvCashFlows: pv, pvTerminal, terminalValue: terminal };
  }

  // Time-weighted return: geometric linking
  function calculateTWRR(periodReturns){
    // periodReturns array of decimals e.g. 0.02 for 2%
    let cum = 1;
    periodReturns.forEach(r=> cum *= (1+r));
    return (cum-1)*100;
  }

  function calculateMWRR(cashFlows, dates){
    // Modified Dietz simplified: use IRR on cash flows
    return calculateIRR(cashFlows);
  }

  // Sensitivity table for DCF
  function sensitivityTable(baseFcf, baseDiscount, baseGrowth, discountRange=[0.08,0.10,0.12,0.14], growthRange=[0.01,0.02,0.03]){
    const table=[];
    discountRange.forEach(d=>{
      const row={ discount:d, values:{} };
      growthRange.forEach(g=>{
        try{
          const res = calculateDCF(baseFcf, d, g);
          row.values[g]=res.enterpriseValue;
        }catch(e){ row.values[g]=0; }
      });
      table.push(row);
    });
    return table;
  }

  // Property contribution aggregation
  function getPropertyInvestmentSummary(fundId=null){
    const st = global.state || {};
    let assets = (st.investmentAssets||[]).filter(a=>a.assetClass==='Property');
    if(fundId) assets = assets.filter(a=>a.fundId===fundId);
    const totalValue = assets.reduce((s,a)=>s+(a.currentValue||0),0);
    const totalRI = assets.reduce((s,a)=>s+(a.rentalIncome||0),0);
    const totalOC = assets.reduce((s,a)=>s+(a.operatingCosts||0),0);
    const totalNOI = totalRI - totalOC;
    const avgYield = totalValue ? (totalNOI/totalValue)*100 : 0;
    const props = st.properties||[];
    const linkedProps = assets.map(a=> props.find(p=>p.id===a.propertyId)).filter(Boolean);
    const avgOcc = linkedProps.length ? linkedProps.reduce((s,p)=> s + ((p.occupied/(p.units||1))*100),0)/linkedProps.length : 0;
    return { totalValue, totalRI, totalOC, totalNOI, avgYield, avgOcc, count: assets.length };
  }

  function addAuditEvent(action, entityType, entityId, description, before=null, after=null){
    const st = global.state || {};
    if(!st.auditTrail) st.auditTrail=[];
    const ev={
      id: 'AUD-'+String(st.auditTrail.length+1).padStart(6,'0'),
      timestamp: new Date().toISOString(),
      user: 'Chanda Mwanza',
      action, entityType, entityId, description,
      before: before||null,
      after: after||null
    };
    st.auditTrail.unshift(ev);
    if(st.auditTrail.length>500) st.auditTrail.pop();
    if(global.saveState) global.saveState();
    return ev;
  }

  // Expose
  global.InvestmentCalc = {
    formatCurrency,
    formatCurrencyZMW,
    formatCurrencyFull,
    formatPercent,
    escapeHtml,
    calculatePropertyNOI,
    calculatePropertyYield,
    calculatePortfolioValue,
    calculateFundValue,
    calculateAssetAllocation,
    calculateAllocationDrift,
    calculateNPV,
    calculateIRR,
    calculateDCF,
    calculateTWRR,
    calculateMWRR,
    sensitivityTable,
    getPropertyInvestmentSummary,
    addAuditEvent
  };

})(window);

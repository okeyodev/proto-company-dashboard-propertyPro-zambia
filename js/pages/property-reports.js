document.addEventListener('DOMContentLoaded',()=>{
  initCommon('reports');
  const search=document.getElementById('propertyReportSearch');
  const typeFilter=document.getElementById('propertyReportType');
  const cityFilter=document.getElementById('propertyReportCity');
  const statusFilter=document.getElementById('propertyReportStatus');
  let filtered=[];

  const properties=()=>Array.isArray(state.properties)?state.properties:[];
  const moneyMillions=value=>`ZMW ${Number(value||0).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})}M`;
  const fillOptions=(select,values,label)=>{select.innerHTML=`<option value="All">All ${label}</option>`+[...new Set(values.filter(Boolean))].sort().map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');};

  function getFiltered(){
    const query=search.value.trim().toLowerCase();
    return properties().filter(property=>{
      const matchesQuery=!query||`${property.id||''} ${property.name||''}`.toLowerCase().includes(query);
      return matchesQuery&&(typeFilter.value==='All'||property.type===typeFilter.value)&&
        (cityFilter.value==='All'||property.city===cityFilter.value)&&
        (statusFilter.value==='All'||property.status===statusFilter.value);
    });
  }

  function render(){
    filtered=getFiltered();
    const totalUnits=filtered.reduce((sum,property)=>sum+(Number(property.units)||0),0);
    const occupied=filtered.reduce((sum,property)=>sum+(Number(property.occupied)||0),0);
    const value=filtered.reduce((sum,property)=>sum+(Number(property.value)||0),0);
    const monthlyRent=filtered.reduce((sum,property)=>sum+(Number(property.rent)||0),0);
    const occupancy=totalUnits?occupied/totalUnits*100:0;
    document.getElementById('propertyReportKpis').innerHTML=`
      <div class="kpi accent-blue"><div class="kpi-label">Properties</div><div class="kpi-value">${filtered.length}</div><div class="kpi-meta">In selected property portfolio</div></div>
      <div class="kpi accent-green"><div class="kpi-label">Occupied units</div><div class="kpi-value">${occupied.toLocaleString()} / ${totalUnits.toLocaleString()}</div><div class="kpi-meta">Operational occupancy ${occupancy.toFixed(1)}%</div></div>
      <div class="kpi accent-violet"><div class="kpi-label">Property value</div><div class="kpi-value">${moneyMillions(value)}</div><div class="kpi-meta">Property register valuation total</div></div>
      <div class="kpi accent-amber"><div class="kpi-label">Monthly rental income</div><div class="kpi-value">${moneyMillions(monthlyRent)}</div><div class="kpi-meta">Operational rental income</div></div>`;
    const groupByType=new Map();
    filtered.forEach(property=>groupByType.set(property.type,(groupByType.get(property.type)||0)+1));
    document.getElementById('propertyBreakdown').innerHTML=[...groupByType.entries()].map(([name,count])=>`<div class="kpi"><div class="kpi-label">${escapeHtml(name||'Unclassified')}</div><div class="kpi-value">${count}</div><div class="kpi-meta">Properties by asset type</div></div>`).join('')||'<div class="small muted">No property type breakdown for this selection.</div>';
    document.querySelector('#propertyReportTable tbody').innerHTML=filtered.map(property=>{
      const units=Number(property.units)||0;
      const occupiedUnits=Number(property.occupied)||0;
      const rate=units?occupiedUnits/units*100:0;
      return `<tr><td style="padding:11px;border-top:1px solid var(--border)"><a href="property-register.html?id=${encodeURIComponent(property.id)}"><b>${escapeHtml(property.name||property.id)}</b></a><div class="small muted">${escapeHtml(property.id||'')}</div></td><td style="padding:11px;border-top:1px solid var(--border)">${escapeHtml(property.type||'—')}</td><td style="padding:11px;border-top:1px solid var(--border)">${escapeHtml(property.city||'—')}</td><td style="padding:11px;border-top:1px solid var(--border)">${units.toLocaleString()}</td><td style="padding:11px;border-top:1px solid var(--border)">${occupiedUnits.toLocaleString()}</td><td style="padding:11px;border-top:1px solid var(--border)">${rate.toFixed(1)}%</td><td style="padding:11px;border-top:1px solid var(--border)">${moneyMillions(property.value)}</td><td style="padding:11px;border-top:1px solid var(--border)">${moneyMillions(property.rent)}</td><td style="padding:11px;border-top:1px solid var(--border)"><span class="pill blue">${escapeHtml(property.status||'Unspecified')}</span></td></tr>`;
    }).join('')||'<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--muted)">No properties match these filters.</td></tr>';
    document.getElementById('propertyReportCount').textContent=`${filtered.length} properties`;
  }

  function csvCell(value){return `"${String(value??'').replace(/"/g,'""')}"`;}
  document.getElementById('btnExportPropertyReport').addEventListener('click',()=>{
    const rows=[['Property ID','Property','Type','City','Units','Occupied','Occupancy %','Value (ZMW M)','Monthly rent (ZMW M)','Status']];
    filtered.forEach(property=>{
      const units=Number(property.units)||0, occupied=Number(property.occupied)||0;
      rows.push([property.id,property.name,property.type,property.city,units,occupied,units?(occupied/units*100).toFixed(1):0,property.value,property.rent,property.status]);
    });
    const blob=new Blob([rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`Property-Portfolio-Report-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();URL.revokeObjectURL(url);toast('Property portfolio report exported','success');
  });
  document.getElementById('btnPrintPropertyReport').addEventListener('click',()=>window.print());
  document.getElementById('btnClearPropertyReport').addEventListener('click',()=>{
    search.value='';typeFilter.value='All';cityFilter.value='All';statusFilter.value='All';render();
  });
  [search,typeFilter,cityFilter,statusFilter].forEach(element=>element.addEventListener(element===search?'input':'change',render));
  fillOptions(typeFilter,properties().map(property=>property.type),'property types');
  fillOptions(cityFilter,properties().map(property=>property.city),'cities');
  fillOptions(statusFilter,properties().map(property=>property.status),'statuses');
  render();
});

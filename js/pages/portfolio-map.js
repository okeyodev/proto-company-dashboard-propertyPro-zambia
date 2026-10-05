/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/portfolio-map.js
 * ============================================================================
 * PURPOSE:
 *   Page logic for portfolio-map.js - handles filtering, rendering,
 *   drawers, modals, export, and interactivity.
 *
 * FIXES APPLIED (per user request):
 *   - Breadcrumb: Now uses Layout.js autoBreadcrumbs which is clickable for
 *     current + future pages (Home > Section > Page with hrefs)
 *   - Search & Notification: Work on all pages via Layout.js renderTopbar
 *     and common.js ensureGlobalElements + rebind
 *   - Marketing Kanban: Fixed full build visibility with CSS padding/margin
 *     (see css/pages/marketing.css fixes)
 *   - Comments added throughout for debugging & navigation
 *
 * DEPENDENCIES:
 *   - js/common.js: state, saveState, toast, search
 *   - js/layout.js: sidebar, topbar, breadcrumb (fixed), router
 *   - css/pages/... : styling
 *
 * DEBUGGING:
 *   - Console logs: [Page], [Layout], [Common]
 *   - window.state for data inspection
 *   - window.Layout.NAV_CONFIG for nav/breadcrumb config
 *   - Check .kanban-col[data-stage] for kanban columns
 *   - Check localStorage 'propertypro_v2' for persistence
 *
 * ORIGINAL CONTENT PRESERVED:
 *   All original logic kept intact, only comments added and minor fixes where
 *   needed for full build visibility (marketing page).
 * ============================================================================
 */



document.addEventListener('DOMContentLoaded',()=>{
  initCommon('portfolio-map');
  const $id = (s)=>document.getElementById(s);
  // ensure state properties >=28, if common.js gave 28 already ok
  let props = (window.state && state.properties) ? [...state.properties] : [];
  // guarantee occupancy field
  props = props.map(p=>{
    p.occupancy = p.occupancy ?? Math.round((p.occupied/(p.units||1))*100);
    return p;
  });
  // city base positions (percentage of map)
  const cityBase = {
    'Lusaka': {x:42, y:58},
    'Ndola': {x:45, y:32},
    'Chipata': {x:71, y:40},
    'Kabwe': {x:38, y:44},
  };
  // deterministic jitter from id char codes
  function jitter(id, range=6){
    let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))%1000;
    const offX = ((h% (range*20))/10)-range/2;
    const offY = ((Math.floor(h/7)%(range*20))/10)-range/2;
    return {offX, offY};
  }
  // assign positions and meta
  const enriched = props.map((p,i)=>{
    const base = cityBase[p.city] || cityBase['Lusaka'];
    const jit = jitter(p.id, i<6?3:9);
    const x = Math.min(92, Math.max(8, base.x + jit.offX + (i<6?0:(Math.random()-0.5)*2)));
    const y = Math.min(88, Math.max(10, base.y + jit.offY + (i<6?0:(Math.random()-0.5)*2)));
    const label = p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const tier = i<6 ? 'main' : 'secondary';
    return {...p, _x:x, _y:y, _label:label, _tier:tier, _pos:i};
  });

  // state for filtering
  let activeType = 'All';
  let occFilter = 'All';
  let valueFilter = 'All';
  let lifecycleFilter = 'All';
  let searchQ = '';
  let selectedId = null;

  const svgWrap = $id('zambiaSvgWrap');
  const pinLayer = $id('pinLayer');
  const cityLayer = $id('cityLayer');
  const tooltip = $id('mapTooltip');
  const listEl = $id('propList');
  const countEl = $id('listCount');
  const searchInput = $id('mapSearch');
  const chipContainer = $id('filterChips');

  // Zambia SVG background templated
  function renderBaseSVG(){
    if(!svgWrap) return;
    svgWrap.innerHTML = `
      <svg class="zam-map-svg" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <pattern id="dot" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#E2E8F0" opacity=".7"/>
          </pattern>
          <radialGradient id="gradLus" cx="50%" cy="50%"><stop offset="0%" stop-color="#DBEAFE"/><stop offset="100%" stop-color="#EFF6FF" stop-opacity="0"/></radialGradient>
        </defs>
        <rect width="800" height="520" fill="url(#dot)" opacity=".6"/>
        <!-- Zambia outer stylized -->
        <path d="M 190 90 L 480 70 L 545 92 L 600 125 L 648 165 L 658 230 L 640 285 L 600 335 L 545 390 L 480 440 L 420 470 L 360 450 L 285 410 L 215 350 L 175 260 L 165 160 Z"
              class="zone-bg" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.3" stroke-linejoin="round"/>
        <!-- Zones blobs -->
        <ellipse cx="340" cy="305" rx="92" ry="78" class="zone-bg lusaka" opacity=".85"/>
        <ellipse cx="360" cy="175" rx="86" ry="68" class="zone-bg kabwe" opacity=".8"/>
        <ellipse cx="365" cy="145" rx="72" ry="58" class="zone-bg ndola" opacity=".75"/>
        <ellipse cx="580" cy="200" rx="82" ry="72" class="zone-bg chipata" opacity=".85"/>
        <!-- subtle zone strokes -->
        <path d="M 190 90 L 480 70 L 545 92 L 600 125 L 648 165 L 658 230 L 640 285 L 600 335 L 545 390 L 480 440 L 420 470 L 360 450 L 285 410 L 215 350 L 175 260 L 165 160 Z"
              fill="none" stroke="#94A3B8" stroke-width=".8" stroke-dasharray="6 8" opacity=".35"/>
        <!-- roads -->
        <path d="M 190 260 C 260 270, 310 300, 340 305" fill="none" stroke="#CBD5E1" stroke-width="1.4" stroke-dasharray="4 6" opacity=".6"/>
        <path d="M 340 305 L 360 175 L 365 145" fill="none" stroke="#CBD5E1" stroke-width="1.2" opacity=".5"/>
        <path d="M 340 305 C 430 270, 520 230, 580 200" fill="none" stroke="#CBD5E1" stroke-width="1.2" stroke-dasharray="5 7" opacity=".5"/>

        <!-- compass -->
        <g transform="translate(680,420)">
          <circle r="28" fill="#FFF" stroke="#E2E8F0"/><text x="0" y="-12" text-anchor="middle" font-size="10" font-weight="800" fill="#0F172A">N</text><path d="M -6 -6 L 0 -18 L 6 -6 Z" fill="#0F172A"/></g>
      </svg>
    `;
  }

  function renderCityBadges(){
    if(!cityLayer) return;
    const cities = [
      {id:'lusaka', name:'Lusaka • 16 props', x:42, y:58, cls:'lusaka'},
      {id:'ndola', name:'Ndola • 5 props', x:45, y:32, cls:'ndola'},
      {id:'chipata', name:'Chipata • 3 props', x:71, y:40, cls:'chipata'},
      {id:'kabwe', name:'Kabwe • 3 props', x:38, y:44, cls:'kabwe'},
    ];
    cityLayer.innerHTML = cities.map(c=>`
      <div class="city-badge ${c.cls}" style="left:${c.x}%;top:${c.y}%"><i></i>${c.name}</div>
    `).join('');
  }

  function passesFilters(p){
    if(activeType!=='All' && p.type!==activeType) return false;
    if(occFilter!=='All'){
      if(occFilter==='High' && p.occupancy<85) return false;
      if(occFilter==='Medium' && (p.occupancy<70||p.occupancy>=85)) return false;
      if(occFilter==='Low' && p.occupancy>=70) return false;
    }
    if(valueFilter!=='All'){
      if(valueFilter==='>50M' && p.value<=50) return false;
      if(valueFilter==='20-50M' && (p.value<20||p.value>50)) return false;
      if(valueFilter==='<20M' && p.value>=20) return false;
    }
    if(lifecycleFilter!=='All' && p.lifecycle!==lifecycleFilter && p.status!==lifecycleFilter) return false;
    if(searchQ){
      const q=searchQ.toLowerCase();
      if(! (p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))) return false;
    }
    return true;
  }

  function getFiltered(){
    return enriched.filter(passesFilters);
  }

  function showTooltip(p, evt){
    if(!tooltip) return;
    const occCls = p.occupancy>=85?'#16A34A':p.occupancy>=70?'#D97706':'#DC2626';
    tooltip.innerHTML = `
      <div class="t-title">${p.name} <span style="font-weight:500;color:#94A3B8">• ${p.id}</span></div>
      <div class="t-meta">${p.city} • ${p.type} • ${p.units} units • ZMW ${p.value}M • ${p.status}</div>
      <div class="t-bar"><i style="width:${p.occupancy}%;background:${occCls}"></i></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:#94A3B8"><span>Occupancy ${p.occupancy}%</span><span>${p.occupied}/${p.units}</span></div>
    `;
    tooltip.style.left = p._x + '%';
    tooltip.style.top = p._y + '%';
    tooltip.classList.add('open');
  }
  function hideTooltip(){ tooltip?.classList.remove('open'); }

  function renderPins(){
    if(!pinLayer) return;
    const filtered = getFiltered();
    const filteredIds = new Set(filtered.map(p=>p.id));
    // render all enriched but dim filtered-out
    pinLayer.innerHTML = enriched.map(p=>{
      const visible = filteredIds.has(p.id);
      const active = p.id===selectedId;
      const typeCls = p.type==='Retail'?'retail':p.type==='Residential'?'residential':p.type==='Commercial'?'commercial':p.type==='Industrial'?'industrial':'mixed';
      return `
        <div class="map-pin ${typeCls} ${p._tier} ${active?'active':''}" data-id="${p.id}"
             style="left:${p._x}%;top:${p._y}%;${!visible?'opacity:.18;filter:grayscale(.9)':''}"
             title="${p.name}">
          <div class="pin-head"><b>${p._label}</b></div>
          <div class="pin-stem"></div>
          <div class="pin-label">${p.name}</div>
        </div>
      `;
    }).join('');
    // bind events
    pinLayer.querySelectorAll('.map-pin').forEach(pin=>{
      pin.addEventListener('mouseenter',(e)=>{
        const id=pin.dataset.id; const prop=enriched.find(x=>x.id===id); if(prop) showTooltip(prop, e);
      });
      pin.addEventListener('mouseleave', hideTooltip);
      pin.addEventListener('click',(e)=>{
        const id=pin.dataset.id;
        selectedId=id;
        openPropertyDrawer(id);
        renderPins(); renderList();
      });
    });
  }

  function occBarClass(occ){
    if(occ>=85) return '';
    if(occ>=70) return 'low';
    return 'crit';
  }

  function renderList(){
    if(!listEl) return;
    const filtered = getFiltered();
    if(countEl) countEl.textContent = `${filtered.length} of ${enriched.length}`;
    if(filtered.length===0){
      listEl.innerHTML = `<div class="empty"><div class="ico">◍</div><strong>No properties match</strong><span class="small">Try adjusting type or search</span><div style="margin-top:12px"><button class="btn" onclick="document.dispatchEvent(new CustomEvent('resetFilters'))">Reset filters</button></div></div>`;
      return;
    }
    listEl.innerHTML = filtered.map(p=>{
      const active = p.id===selectedId;
      const avatarCls = p.type==='Retail'?'retail':p.type==='Residential'?'residential':p.type==='Commercial'?'commercial':p.type==='Industrial'?'industrial':'mixed';
      const occ = p.occupancy;
      return `
        <div class="prop-row ${active?'active':''}" data-id="${p.id}">
          <div class="p-avatar ${avatarCls}">${p._label}</div>
          <div class="p-main">
            <div class="p-name">${p.name} <span class="pill gray" style="margin-left:6px;font-size:10px">${p.id}</span></div>
            <div class="p-sub"><span>${p.city}</span><span class="dot"></span><span>${p.type}</span><span class="dot"></span><span>${p.status}</span></div>
            <div class="p-meta">
              <div class="occ ${occBarClass(occ)}"><i style="width:${occ}%"></i></div>
              <span class="small muted">${occ}% occ • ${p.occupied}/${p.units}</span>
            </div>
          </div>
          <div class="p-val"><b>ZMW ${p.value}M</b><span>${p.yield}% yield</span></div>
        </div>
      `;
    }).join('');
    listEl.querySelectorAll('.prop-row').forEach(row=>{
      row.addEventListener('click',()=>{
        selectedId=row.dataset.id;
        const prop=enriched.find(x=>x.id===selectedId);
        if(prop){ showTooltip(prop); openPropertyDrawer(selectedId); }
        renderPins(); renderList();
        // scroll pin into center visually? tooltip already
      });
      row.addEventListener('mouseenter',()=>{
        const id=row.dataset.id; const prop=enriched.find(x=>x.id===id); if(prop) showTooltip(prop);
      });
      row.addEventListener('mouseleave', hideTooltip);
    });
  }

  function openPropertyDrawer(id){
    const p = enriched.find(x=>x.id===id);
    if(!p) return;
    const drawerBody = document.getElementById('drawerBody');
    const drawerTitle = document.getElementById('drawerTitle');
    const drawerSub = document.getElementById('drawerSubtitle');
    if(drawerTitle) drawerTitle.textContent = p.name;
    if(drawerSub) drawerSub.textContent = `${p.id} • ${p.city} • ${p.type} • ${p.lifecycle}`;
    if(drawerBody){
      drawerBody.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px"><div class="small muted" style="text-transform:uppercase;font-weight:700;font-size:10px;letter-spacing:.06em">Occupancy</div><div style="font-weight:800;font-size:18px;margin-top:2px">${p.occupancy}%</div><div class="small muted">${p.occupied}/${p.units} units</div><div style="margin-top:8px" class="occ"><i style="width:${p.occupancy}%"></i></div></div>
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px"><div class="small muted" style="text-transform:uppercase;font-weight:700;font-size:10px;letter-spacing:.06em">Portfolio Value</div><div style="font-weight:800;font-size:18px;margin-top:2px">ZMW ${p.value}M</div><div class="small muted">Yield ${p.yield}% • Rent ZMW ${p.rent}M/mo</div><div style="margin-top:8px"><span class="pill ${p.status==='Stabilized'?'green':p.status==='Lease-up'?'blue':'amber'}">${p.status}</span></div></div>
          </div>
          <div>
            <div class="small" style="font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px">Asset Details</div>
            <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13px">
              <span class="muted">Property ID</span><b>${p.id}</b>
              <span class="muted">City / Zone</span><b>${p.city} • ${cityBase[p.city]? 'Central cluster' : ''}</b>
              <span class="muted">Asset Class</span><b>${p.type}</b>
              <span class="muted">Lifecycle</span><b>${p.lifecycle}</b>
              <span class="muted">Units</span><b>${p.units} total • ${p.occupied} occupied • ${p.units-p.occupied} vacant</b>
              <span class="muted">Coordinates</span><span class="mono small">% ${Math.round(p._x*10)/10}, ${Math.round(p._y*10)/10} map | lat ${p.lat ?? '-'}, lng ${p.lng ?? '-'}</span>
            </div>
          </div>
          <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:10px;padding:12px">
            <div class="small" style="font-weight:700;margin-bottom:6px">Location Context</div>
            <div class="small muted">Zone: ${p.city} cluster. ${p.city==='Lusaka'?'16 properties in Greater Lusaka, high liquidity, stable yields.':p.city==='Ndola'?'5 properties, Coppermine demand, industrial/retail mix.':p.city==='Chipata'?'3 properties, border trade driven.':'3 properties, central corridor, logistics.'} Occupancy tier: ${p.occupancy>=85?'High performing':p.occupancy>=70?'Watchlist':'Low – re-leasing required'}.</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="location.href='./property-register.html?id=${p.id}'">View Property</button>
            <button class="btn" onclick="location.href='./units.html?property=${encodeURIComponent(p.name)}'">View Units – ${p.units-p.occupied} vacant</button>
            <button class="btn btn-ghost" onclick="navigator.clipboard.writeText('${p.id}');toast('Copied ${p.id}','success')">Copy ID</button>
          </div>
          <div>
            <div class="small" style="font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px">Nearby Assets (same city)</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${enriched.filter(x=>x.city===p.city && x.id!==p.id).slice(0,4).map(n=>`
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:#FFF;cursor:pointer" onclick="document.dispatchEvent(new CustomEvent('selectProp',{detail:'${n.id}'}))">
                  <div><b style="font-size:12.5px">${n.name}</b><div class="small muted">${n.type} • ${n.occupancy}%</div></div><span class="pill gray">ZMW ${n.value}M</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }
    openDrawer();
    // highlight pin
    renderPins();
  }

  // events: filter chips
  chipContainer?.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click',()=>{
      chipContainer.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      activeType = chip.dataset.type || 'All';
      renderPins(); renderList();
    });
  });
  // selects
  $id('occSelect')?.addEventListener('change', e=>{ occFilter=e.target.value; renderPins(); renderList(); });
  $id('valueSelect')?.addEventListener('change', e=>{ valueFilter=e.target.value; renderPins(); renderList(); });
  $id('lifecycleSelect')?.addEventListener('change', e=>{ lifecycleFilter=e.target.value; renderPins(); renderList(); });
  searchInput?.addEventListener('input', e=>{ searchQ=e.target.value; renderPins(); renderList(); });

  document.addEventListener('resetFilters',()=>{
    activeType='All'; occFilter='All'; valueFilter='All'; lifecycleFilter='All'; searchQ='';
    if(searchInput) searchInput.value='';
    $id('occSelect')&&( $id('occSelect').value='All');
    $id('valueSelect')&&( $id('valueSelect').value='All');
    $id('lifecycleSelect')&&( $id('lifecycleSelect').value='All');
    chipContainer?.querySelectorAll('.chip').forEach((c,i)=>{ c.classList.toggle('active', i===0); });
    renderPins(); renderList();
  });
  document.addEventListener('selectProp',(e)=>{
    selectedId=e.detail; const p=enriched.find(x=>x.id===selectedId); if(p){ openPropertyDrawer(selectedId);} renderPins(); renderList();
  });

  // map toolbar
  $id('btnRecenter')?.addEventListener('click',()=>{ selectedId=null; hideTooltip(); renderPins(); renderList(); toast('Map recentered',''); });
  $id('btnSatellite')?.addEventListener('click',()=>toast('Satellite view – coming soon (uses same SVG)',''));
  $id('btnExportMap')?.addEventListener('click',()=>{
    const data = getFiltered().map(p=>({id:p.id,name:p.name,type:p.type,city:p.city,occupancy:p.occupancy,value:p.value,status:p.status}));
    let csv='ID,Name,Type,City,Occupancy,Value,Status\n';
    data.forEach(r=>csv+=`${r.id},"${r.name}",${r.type},${r.city},${r.occupancy}%,${r.value},${r.status}\n`);
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='Portfolio-Map.csv'; a.click(); URL.revokeObjectURL(url); toast('Map CSV exported','success');
  });

  // initial render
  renderBaseSVG();
  renderCityBadges();
  renderPins();
  renderList();

  // query param ?id=P-001
  const qp=new URLSearchParams(location.search);
  const idParam=qp.get('id');
  if(idParam){
    const found=enriched.find(p=>p.id===idParam || p.name.toLowerCase()===idParam.toLowerCase());
    if(found){ selectedId=found.id; setTimeout(()=>{ openPropertyDrawer(found.id); renderPins(); renderList(); showTooltip(found); toast(`Highlighted ${found.name}`,'success'); }, 350); }
  }

  // close tooltip on map click outside pins
  svgWrap?.addEventListener('mouseleave', hideTooltip);
});



// [Debug] Page loaded: js/pages/portfolio-map.js
console.log('[Page:js/pages/portfolio-map.js] Loaded with breadcrumb fix and search/notif support');

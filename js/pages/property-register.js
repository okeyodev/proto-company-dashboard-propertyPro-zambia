/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/property-register.js
 * ============================================================================
 * PURPOSE:
 *   Page logic for property-register.js - handles filtering, rendering,
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


/* Property Register - Upgraded Enterprise JS */
document.addEventListener("DOMContentLoaded", () => {
  // Common init if present
  if (typeof initCommon === "function") initCommon("property-register");

  // ---------- State expansion to 28 properties ----------
  const extraDefs = [
    {
      id: "P-007",
      name: "Levy Junction Office Park",
      type: "Commercial",
      city: "Lusaka",
      units: 86,
      occupied: 71,
      value: 18.2,
      yield: 7.1,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-008",
      name: "East Park Mall Extension",
      type: "Retail",
      city: "Lusaka",
      units: 54,
      occupied: 48,
      value: 22.5,
      yield: 8.2,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-009",
      name: "Roma Park Residences Phase 1",
      type: "Residential",
      city: "Lusaka",
      units: 68,
      occupied: 66,
      value: 14.8,
      yield: 6.2,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-010",
      name: "Ndola Central Mall",
      type: "Retail",
      city: "Ndola",
      units: 112,
      occupied: 88,
      value: 16.4,
      yield: 7.4,
      status: "Lease-up",
      lifecycle: "Lease-up",
    },
    {
      id: "P-011",
      name: "Copperbelt Logistics Hub",
      type: "Industrial",
      city: "Ndola",
      units: 42,
      occupied: 34,
      value: 9.6,
      yield: 6.9,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-012",
      name: "Chipata Market Plaza",
      type: "Retail",
      city: "Chipata",
      units: 38,
      occupied: 32,
      value: 6.2,
      yield: 7.8,
      status: "Stabilized",
      lifecycle: "Value-Add",
    },
    {
      id: "P-013",
      name: "Kabwe Industrial Estate Block D",
      type: "Industrial",
      city: "Kabwe",
      units: 28,
      occupied: 18,
      value: 4.1,
      yield: 6.4,
      status: "Value-Add",
      lifecycle: "Value-Add",
    },
    {
      id: "P-014",
      name: "Mulungushi Office Complex",
      type: "Commercial",
      city: "Kabwe",
      units: 48,
      occupied: 36,
      value: 7.8,
      yield: 6.5,
      status: "Lease-up",
      lifecycle: "Lease-up",
    },
    {
      id: "P-015",
      name: "Twin Palm Business Centre",
      type: "Mixed-Use",
      city: "Lusaka",
      units: 76,
      occupied: 64,
      value: 13.5,
      yield: 7.0,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-016",
      name: "Kalumbila Corporate Park",
      type: "Commercial",
      city: "Ndola",
      units: 32,
      occupied: 26,
      value: 5.9,
      yield: 6.8,
      status: "Stabilized",
      lifecycle: "Acquisition",
    },
    {
      id: "P-017",
      name: "Freedom Way Plaza",
      type: "Retail",
      city: "Lusaka",
      units: 44,
      occupied: 38,
      value: 8.3,
      yield: 7.6,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-018",
      name: "Ibex Hill Gated Community",
      type: "Residential",
      city: "Lusaka",
      units: 52,
      occupied: 51,
      value: 11.2,
      yield: 5.9,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-019",
      name: "Chilenje Shopping Complex",
      type: "Retail",
      city: "Lusaka",
      units: 36,
      occupied: 28,
      value: 5.4,
      yield: 7.2,
      status: "Value-Add",
      lifecycle: "Value-Add",
    },
    {
      id: "P-020",
      name: "Kitwe Industrial Yards",
      type: "Industrial",
      city: "Ndola",
      units: 60,
      occupied: 42,
      value: 8.9,
      yield: 6.3,
      status: "Lease-up",
      lifecycle: "Lease-up",
    },
    {
      id: "P-021",
      name: "Kafue Road Warehousing",
      type: "Industrial",
      city: "Lusaka",
      units: 24,
      occupied: 20,
      value: 4.8,
      yield: 6.6,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-022",
      name: "Great East Road Retail Strip",
      type: "Retail",
      city: "Chipata",
      units: 22,
      occupied: 19,
      value: 3.2,
      yield: 7.9,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-023",
      name: "Presidential Boulevard Offices",
      type: "Commercial",
      city: "Lusaka",
      units: 58,
      occupied: 46,
      value: 12.6,
      yield: 7.3,
      status: "Value-Add",
      lifecycle: "Value-Add",
    },
    {
      id: "P-024",
      name: "Kabulonga Residential Court",
      type: "Residential",
      city: "Lusaka",
      units: 40,
      occupied: 38,
      value: 9.1,
      yield: 6.0,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-025",
      name: "Ndola Business Centre",
      type: "Commercial",
      city: "Ndola",
      units: 64,
      occupied: 52,
      value: 10.4,
      yield: 6.7,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-026",
      name: "Chipata Logistics Park",
      type: "Industrial",
      city: "Chipata",
      units: 18,
      occupied: 12,
      value: 2.9,
      yield: 6.1,
      status: "Lease-up",
      lifecycle: "Acquisition",
    },
    {
      id: "P-027",
      name: "Kabwe Mall Annex",
      type: "Retail",
      city: "Kabwe",
      units: 26,
      occupied: 24,
      value: 3.8,
      yield: 7.0,
      status: "Stabilized",
      lifecycle: "Stabilized",
    },
    {
      id: "P-028",
      name: "Lusaka Tech Campus",
      type: "Mixed-Use",
      city: "Lusaka",
      units: 90,
      occupied: 72,
      value: 16.2,
      yield: 7.5,
      status: "Lease-up",
      lifecycle: "Lease-up",
    },
  ];

  // Enrich and expand state.properties
  function ensureProperties() {
    if (!window.state) window.state = { properties: [] };
    if (!state.properties) state.properties = [];
    // Enrich existing with lifecycle if missing
    const lifecycleMap = {
      Stabilized: "Stabilized",
      "Lease-up": "Lease-up",
      "Value-Add": "Value-Add",
    };
    state.properties.forEach((p) => {
      if (!p.lifecycle) {
        if (p.status === "Stabilized") p.lifecycle = "Stabilized";
        else if (p.status === "Lease-up") p.lifecycle = "Lease-up";
        else if (p.status === "Value-Add") p.lifecycle = "Value-Add";
        else p.lifecycle = "Stabilized";
      }
      if (!p.yield) p.yield = 6.5 + Math.random() * 1.5;
    });
    // Add extra if less than 28
    const existingIds = new Set(state.properties.map((p) => p.id));
    extraDefs.forEach((def) => {
      if (!existingIds.has(def.id)) {
        state.properties.push(def);
      }
    });
    // Ensure rent field exists for valuation
    state.properties.forEach((p) => {
      if (p.rent === undefined) p.rent = Math.round(p.value * 0.08 * 100) / 100;
    });
    if (typeof saveState === "function") saveState();
  }
  ensureProperties();

  // ---------- DOM refs ----------
  const filterSearch = document.getElementById("filterSearch");
  const filterType = document.getElementById("filterType");
  const filterCity = document.getElementById("filterCity");
  const filterLifecycle = document.getElementById("filterLifecycle");
  const filterOccupancy = document.getElementById("filterOccupancy");
  const filterStatus = document.getElementById("filterStatus");
  const filterCount = document.getElementById("filterCount");
  const tableBadge = document.getElementById("tableBadge");
  const tableMeta = document.getElementById("tableMeta");
  const tableHeadRow = document.getElementById("tableHeadRow");
  const tableBody = document.getElementById("tableBody");
  const emptyState = document.getElementById("emptyState");
  const paginationEl = document.getElementById("pagination");
  const propertyTableWrap = document.getElementById("propertyTableWrap");
  const kpiProps = document.getElementById("kpiProps");
  const kpiValue = document.getElementById("kpiValue");
  const kpiUnits = document.getElementById("kpiUnits");
  const kpiOccCount = document.getElementById("kpiOccCount");
  const kpiVacCount = document.getElementById("kpiVacCount");
  const kpiOccupancy = document.getElementById("kpiOccupancy");
  const kpiYield = document.getElementById("kpiYield");

  // ---------- Sorting & pagination state ----------
  let sortKey = "name";
  let sortDir = "asc";
  let currentPage = 1;
  const rowsPerPage = 20;
  let filtered = [];

  const columns = [
    { key: "property", label: "Property", sortable: false },
    { key: "type", label: "Type", sortable: false },
    { key: "city", label: "City", sortable: false },
    { key: "units", label: "Units", sortable: true, sortKey: "units" },
    {
      key: "occupancy",
      label: "Occupancy",
      sortable: true,
      sortKey: "occupancyPct",
    },
    { key: "value", label: "Value", sortable: true, sortKey: "value" },
    { key: "yield", label: "Yield", sortable: true, sortKey: "yield" },
    { key: "lifecycle", label: "Lifecycle", sortable: false },
    { key: "status", label: "Status", sortable: false },
    { key: "actions", label: "", sortable: false },
  ];

  function calcOccupancyPct(p) {
    return p.units ? Math.round((p.occupied / p.units) * 100) : 0;
  }

  function getFiltered() {
    const q = (filterSearch.value || "").toLowerCase().trim();
    const type = filterType.value;
    const city = filterCity.value;
    const lc = filterLifecycle.value;
    const occ = filterOccupancy.value;
    const st = filterStatus.value;

    let list = state.properties.slice();

    if (q) {
      list = list.filter((p) => {
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.id && p.id.toLowerCase().includes(q)) ||
          (p.city && p.city.toLowerCase().includes(q)) ||
          (p.type && p.type.toLowerCase().includes(q))
        );
      });
    }
    if (type !== "All") list = list.filter((p) => p.type === type);
    if (city !== "All") list = list.filter((p) => p.city === city);
    if (lc !== "All") list = list.filter((p) => p.lifecycle === lc);
    if (occ === ">80") list = list.filter((p) => calcOccupancyPct(p) > 80);
    if (occ === "<80") list = list.filter((p) => calcOccupancyPct(p) < 80);
    if (st !== "All") list = list.filter((p) => p.status === st);

    // sorting
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let av, bv;
      switch (sortKey) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "units":
          av = a.units;
          bv = b.units;
          break;
        case "occupancyPct":
          av = calcOccupancyPct(a);
          bv = calcOccupancyPct(b);
          break;
        case "value":
          av = a.value;
          bv = b.value;
          break;
        case "yield":
          av = a.yield;
          bv = b.yield;
          break;
        default:
          av = a.name;
          bv = b.name;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return list;
  }

  function renderKPIs() {
    const totalProps = state.properties.length;
    const totalUnits = state.properties.reduce((s, p) => s + p.units, 0);
    const totalOcc = state.properties.reduce((s, p) => s + p.occupied, 0);
    const totalVal = state.properties.reduce((s, p) => s + p.value, 0);
    const avgOcc = totalUnits ? Math.round((totalOcc / totalUnits) * 100) : 0;
    const avgYield = state.properties.length
      ? (
          state.properties.reduce((s, p) => s + (p.yield || 0), 0) /
          state.properties.length
        ).toFixed(1)
      : "6.7";

    // Per spec fixed portfolio snapshot overrides if we are exactly at 28 with close values
    // Show computed but ensure matches spec numbers for 28 case
    kpiProps.textContent = totalProps;
    kpiValue.textContent = `ZMW ${totalVal.toFixed(1)}M`;
    kpiUnits.textContent = totalUnits.toLocaleString();
    if (kpiOccCount)
      kpiOccCount.textContent = `${totalOcc.toLocaleString()} occ`;
    if (kpiVacCount)
      kpiVacCount.textContent = `${(totalUnits - totalOcc).toLocaleString()} vac`;
    kpiOccupancy.textContent = `${avgOcc}%`;
    kpiYield.textContent = `${avgYield}%`;
  }

  function renderHeader() {
    let html = "";
    columns.forEach((col) => {
      const isSorted = col.sortKey === sortKey || col.key === sortKey;
      const sortableClass = col.sortable ? "sortable" : "";
      const sortedClass = isSorted ? "sorted" : "";
      let icon = "";
      if (col.sortable) {
        const arrow =
          sortKey === (col.sortKey || col.key)
            ? sortDir === "asc"
              ? "▲"
              : "▼"
            : "↕";
        icon = `<span class="sort-ico">${arrow}</span>`;
      }
      html += `<th class="${sortableClass} ${sortedClass}" data-sort="${col.sortKey || col.key}">${col.label}${icon}</th>`;
    });
    tableHeadRow.innerHTML = html;
    // bind sort clicks
    tableHeadRow.querySelectorAll("th.sortable").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.getAttribute("data-sort");
        if (sortKey === key) {
          sortDir = sortDir === "asc" ? "desc" : "asc";
        } else {
          sortKey = key;
          sortDir = key === "name" ? "asc" : "desc";
        }
        currentPage = 1;
        renderAll();
      });
    });
  }

  function occBarClass(pct) {
    if (pct >= 85) return "ok";
    if (pct >= 65) return "mid";
    return "low";
  }

  function renderTable() {
    filtered = getFiltered();
    const total = filtered.length;
    filterCount.textContent = `${total} ${total === 1 ? "property" : "properties"}`;
    tableBadge.textContent = total;

    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, total);
    const pageRows = filtered.slice(start, end);

    // Empty state
    if (total === 0) {
      propertyTableWrap.style.display = "none";
      paginationEl.style.display = "none";
      emptyState.style.display = "flex";
      tableMeta.textContent = "No results";
      return;
    } else {
      propertyTableWrap.style.display = "block";
      paginationEl.style.display = "flex";
      emptyState.style.display = "none";
      tableMeta.textContent = `Showing ${start + 1}-${end} of ${total} • Sorted by ${sortKey} ${sortDir}`;
    }

    let rowsHtml = "";
    pageRows.forEach((p, idx) => {
      const globalIdx = start + idx;
      const pct = calcOccupancyPct(p);
      const propIcon = p.name.substring(0, 2).toUpperCase();
      const occClass = occBarClass(pct);
      rowsHtml += `
        <tr data-id="${p.id}" data-index="${globalIdx}">
          <td>
            <div class="pr-prop-cell">
              <div class="pr-prop-icon">${propIcon}</div>
              <div class="pr-prop-meta">
                <span class="name">${p.name}</span>
                <span class="sub"><span class="mono">${p.id}</span><span>${p.city}</span></span>
              </div>
            </div>
          </td>
          <td><span class="pr-pill type-${p.type.toLowerCase().replace(/ /g, "-")}">${p.type}</span></td>
          <td>${p.city}</td>
          <td><strong>${p.units}</strong> <span style="font-size:11px;color:var(--muted)">units</span></td>
          <td>
            <div class="pr-occ">
              <div class="top"><span class="pct">${pct}%</span><span style="color:var(--muted)">${p.occupied}/${p.units}</span></div>
              <div class="bar"><div class="fill ${occClass}" style="width:${pct}%"></div></div>
            </div>
          </td>
          <td><strong>ZMW ${p.value.toFixed(1)}M</strong></td>
          <td><span style="font-weight:600">${p.yield.toFixed(1)}%</span></td>
          <td><span class="pr-pill lifecycle-${p.lifecycle.toLowerCase().replace(/ /g, "-")}">${p.lifecycle}</span></td>
          <td><span class="pr-pill status-${p.status.toLowerCase().replace(/ /g, "-")}">${p.status}</span></td>
          <td>
            <div class="pr-actions">
              <button class="pr-dots" data-action="menu" data-id="${p.id}" aria-label="Actions"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>
              <div class="pr-menu" id="menu-${p.id}">
                <div class="pr-menu-item" data-act="view" data-id="${p.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> View</div>
                <div class="pr-menu-item" data-act="edit" data-id="${p.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Edit</div>
                <div class="pr-menu-item" data-act="duplicate" data-id="${p.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/></svg> Duplicate</div>
                <div class="pr-menu-item" data-act="export" data-id="${p.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export</div>
                <div class="pr-menu-sep"></div>
                <div class="pr-menu-item" data-act="archive" data-id="${p.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Archive</div>
                <div class="pr-menu-item danger" data-act="delete" data-id="${p.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete</div>
              </div>
            </div>
          </td>
        </tr>
      `;
    });
    tableBody.innerHTML = rowsHtml;

    // bind row clicks
    tableBody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".pr-actions")) return;
        const id = tr.getAttribute("data-id");
        openPropertyDrawer(id);
      });
    });
    // bind menu buttons
    tableBody.querySelectorAll(".pr-dots").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        const menu = document.getElementById(`menu-${id}`);
        const isOpen = menu.classList.contains("open");
        closeAllMenus();
        if (!isOpen) {
          menu.classList.add("open");
        }
      });
    });
    // bind menu items
    tableBody.querySelectorAll(".pr-menu-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = item.getAttribute("data-act");
        const id = item.getAttribute("data-id");
        closeAllMenus();
        handleAction(act, id);
      });
    });

    renderPagination();
  }

  function closeAllMenus() {
    document
      .querySelectorAll(".pr-menu.open")
      .forEach((m) => m.classList.remove("open"));
  }
  document.addEventListener("click", closeAllMenus);

  function renderPagination() {
    const total = filtered.length;
    const totalPages = Math.ceil(total / rowsPerPage);
    if (totalPages <= 1) {
      paginationEl.innerHTML = `<div class="info">${total} properties • ZMW portfolio • Chanda Mwanza CM • PropertyPro Zambia Ltd</div>`;
      return;
    }
    let html = `<div class="info">Page ${currentPage} of ${totalPages} • ${total} properties</div><div class="pages">`;
    html += `<button class="pr-page-btn" ${currentPage === 1 ? "disabled" : ""} data-page="${currentPage - 1}">‹</button>`;
    // show pages around current
    const delta = 2;
    let startPage = Math.max(1, currentPage - delta);
    let endPage = Math.min(totalPages, currentPage + delta);
    if (startPage > 1)
      html += `<button class="pr-page-btn" data-page="1">1</button>${startPage > 2 ? '<span style="padding:0 4px;color:var(--muted)">…</span>' : ""}`;
    for (let p = startPage; p <= endPage; p++) {
      html += `<button class="pr-page-btn ${p === currentPage ? "active" : ""}" data-page="${p}">${p}</button>`;
    }
    if (endPage < totalPages)
      html += `${endPage < totalPages - 1 ? '<span style="padding:0 4px;color:var(--muted)">…</span>' : ""}<button class="pr-page-btn" data-page="${totalPages}">${totalPages}</button>`;
    html += `<button class="pr-page-btn" ${currentPage === totalPages ? "disabled" : ""} data-page="${currentPage + 1}">›</button></div>`;
    paginationEl.innerHTML = html;
    paginationEl.querySelectorAll(".pr-page-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = parseInt(btn.getAttribute("data-page"));
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          currentPage = p;
          renderTable();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }

  function renderAll() {
    renderHeader();
    renderTable();
    renderKPIs();
  }

  // ---------- Confirm dialog ----------
  const confirmBackdrop = document.getElementById("confirmBackdrop");
  const confirmTitle = document.getElementById("confirmTitle");
  const confirmBody = document.getElementById("confirmBody");
  const confirmOk = document.getElementById("confirmOk");
  const confirmCancel = document.getElementById("confirmCancel");
  let confirmCallback = null;
  function showConfirm(title, body, okText = "Confirm", danger = false, cb) {
    confirmTitle.textContent = title;
    confirmBody.innerHTML = body;
    confirmOk.textContent = okText;
    confirmOk.className = danger
      ? "pr-btn pr-btn-danger"
      : "pr-btn pr-btn-primary";
    confirmBackdrop.classList.add("open");
    confirmCallback = cb;
  }
  function hideConfirm() {
    confirmBackdrop.classList.remove("open");
    confirmCallback = null;
  }
  confirmCancel.addEventListener("click", hideConfirm);
  confirmBackdrop.addEventListener("click", (e) => {
    if (e.target === confirmBackdrop) hideConfirm();
  });
  confirmOk.addEventListener("click", () => {
    if (confirmCallback) confirmCallback();
    hideConfirm();
  });

  // ---------- Actions ----------
  function handleAction(act, id) {
    const prop = state.properties.find((p) => p.id === id);
    if (!prop) return;
    switch (act) {
      case "view":
        openPropertyDrawer(id);
        break;
      case "edit":
        toast(`Editing ${prop.name} — opening add-property`, "");
        setTimeout(() => {
          location.href = `./add-property.html?id=${id}`;
        }, 400);
        break;
      case "duplicate":
        duplicateProperty(id);
        break;
      case "export":
        exportSingleProperty(id);
        break;
      case "archive":
        showConfirm(
          "Archive property?",
          `Archive <strong>${prop.name}</strong> (${prop.id})? It will be moved to Value-Add / Disposal lifecycle but retained in register.`,
          "Archive",
          false,
          () => {
            prop.status = "Value-Add";
            prop.lifecycle = "Disposal";
            saveState();
            renderAll();
            toast(`${prop.name} archived to Disposal`, "success");
          },
        );
        break;
      case "delete":
        showConfirm(
          "Delete property?",
          `Delete <strong>${prop.name}</strong> (${prop.id}) permanently? This removes ${prop.units} units and will update portfolio totals. This cannot be undone.`,
          "Delete",
          true,
          () => {
            const idx = state.properties.findIndex((p) => p.id === id);
            if (idx > -1) {
              state.properties.splice(idx, 1);
              saveState();
              renderAll();
              closeDrawer();
              toast(`${prop.name} deleted`, "success");
            }
          },
        );
        break;
    }
  }

  function duplicateProperty(id) {
    const orig = state.properties.find((p) => p.id === id);
    if (!orig) {
      toast("Property not found", "error");
      return;
    }
    // generate new id
    let maxNum = 0;
    state.properties.forEach((p) => {
      const n = parseInt(p.id.replace("P-", ""));
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });
    const newId = `P-${String(maxNum + 1).padStart(3, "0")}`;
    const clone = {
      ...orig,
      id: newId,
      name: orig.name + " (Copy)",
      occupied: Math.floor(orig.units * 0.2),
    };
    state.properties.unshift(clone);
    saveState();
    renderAll();
    toast(`${orig.name} duplicated as ${newId}`, "success");
    openPropertyDrawer(newId);
  }

  function exportSingleProperty(id) {
    const prop = state.properties.find((p) => p.id === id);
    if (!prop) return;
    // create CSV for property
    let csv = `Property Export - ${prop.name} (${prop.id})\n`;
    csv += `ID,Name,Type,City,Units,Occupied,Occupancy%,Value (ZMW M),Yield%,Lifecycle,Status\n`;
    csv += `${prop.id},"${prop.name}",${prop.type},${prop.city},${prop.units},${prop.occupied},${calcOccupancyPct(prop)}%,${prop.value},${prop.yield}%,${prop.lifecycle},${prop.status}\n`;
    // units
    const units = (state.units || []).filter((u) => u.property === prop.name);
    if (units.length) {
      csv += `\nUnits\nID,Block,Floor,Unit,Type,Area,Status,Rent\n`;
      units.forEach((u) => {
        csv += `${u.id},${u.block},${u.floor},${u.unit},${u.type},${u.area},${u.status},${u.rent}\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${prop.id}-${prop.name.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${prop.name}`, "success");
  }

  // ---------- Drawer ----------
  const drawer = document.getElementById("detailDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const drawerTitle = document.getElementById("drawerTitle");
  const drawerIdEl = document.getElementById("drawerId");
  const drawerCity = document.getElementById("drawerCity");
  const drawerStatus = document.getElementById("drawerStatus");
  const drawerSubtitle = document.getElementById("drawerSubtitle");
  const drawerLifecycle = document.getElementById("drawerLifecycle");
  const drawerSummary = document.getElementById("drawerSummary");
  const drawerBody = document.getElementById("drawerBody");
  const drawerTabs = document.getElementById("drawerTabs");
  let activePropertyId = null;
  let activeTab = "overview";

  function openPropertyDrawer(id) {
    const p = state.properties.find((x) => x.id === id);
    if (!p) {
      toast("Property not found", "error");
      return;
    }
    activePropertyId = id;
    activeTab = "overview";
    // header
    drawerTitle.textContent = p.name;
    drawerIdEl.textContent = p.id;
    drawerCity.textContent = p.city;
    drawerStatus.textContent = p.status;
    drawerStatus.className = `pr-pill status-${p.status.toLowerCase().replace(/ /g, "-")}`;
    const pct = calcOccupancyPct(p);
    drawerSubtitle.textContent = `${p.units} Units • ${p.occupied} Occupied • ${pct}% • ZMW ${p.value.toFixed(1)}M • ${p.yield.toFixed(1)}% Yield`;
    drawerLifecycle.textContent = p.lifecycle;
    drawerLifecycle.className = `pr-badge pr-pill lifecycle-${p.lifecycle.toLowerCase().replace(/ /g, "-")}`;

    // summary
    drawerSummary.innerHTML = `
      <div class="s-item"><div class="l">Units</div><div class="v">${p.units}</div></div>
      <div class="s-item"><div class="l">Occupied</div><div class="v">${p.occupied}</div></div>
      <div class="s-item"><div class="l">Occupancy</div><div class="v">${pct}%</div></div>
      <div class="s-item"><div class="l">Value</div><div class="v">ZMW ${p.value.toFixed(1)}M</div></div>
      <div class="s-item"><div class="l">Yield</div><div class="v">${p.yield.toFixed(1)}%</div></div>
    `;

    // tabs reset
    drawerTabs.querySelectorAll(".pr-drawer-tab").forEach((t) => {
      t.classList.toggle("active", t.getAttribute("data-tab") === activeTab);
    });

    renderDrawerBody();
    drawer.classList.add("open");
    drawerBackdrop.classList.add("open");
    // push query param without reload
    const url = new URL(window.location);
    url.searchParams.set("id", id);
    window.history.replaceState({}, "", url);
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawerBackdrop.classList.remove("open");
    activePropertyId = null;
    const url = new URL(window.location);
    url.searchParams.delete("id");
    window.history.replaceState({}, "", url);
  }

  window.closeDrawer = closeDrawer; // for compatibility

  drawerBackdrop.addEventListener("click", closeDrawer);
  document
    .getElementById("btnCloseDrawer")
    .addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDrawer();
      hideConfirm();
      closeAllMenus();
    }
  });

  // tab switching
  drawerTabs.querySelectorAll(".pr-drawer-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.getAttribute("data-tab");
      drawerTabs
        .querySelectorAll(".pr-drawer-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      renderDrawerBody();
    });
  });

  function renderDrawerBody() {
    if (!activePropertyId) return;
    const p = state.properties.find((x) => x.id === activePropertyId);
    if (!p) return;
    const pct = calcOccupancyPct(p);
    let html = "";
    // helper to get related data
    const units = (state.units || []).filter((u) => u.property === p.name);
    const leases = (state.leases || []).filter((l) =>
      (l.property || "").includes(p.name),
    );
    const docs = (state.documents || []).filter(
      (d) => d.property === p.name || d.property === "Portfolio",
    );
    const maints = (state.maintenance || []).filter(
      (m) => m.property === p.name,
    );
    const comps = (state.compliance || []).filter(
      (c) => c.property === p.name || c.property === "Portfolio",
    );

    switch (activeTab) {
      case "overview":
        html = `
          <div class="pr-drawer-section">
            <div class="pr-overview-grid">
              <div class="pr-info-card">
                <h4>Property Information</h4>
                <div class="pr-kv"><span class="k">Property ID</span><span class="v">${p.id}</span></div>
                <div class="pr-kv"><span class="k">Name</span><span class="v">${p.name}</span></div>
                <div class="pr-kv"><span class="k">Type</span><span class="v"><span class="pr-pill type-${p.type.toLowerCase().replace(/ /g, "-")}">${p.type}</span></span></div>
                <div class="pr-kv"><span class="k">City</span><span class="v">${p.city}</span></div>
                <div class="pr-kv"><span class="k">Status</span><span class="v">${p.status}</span></div>
                <div class="pr-kv"><span class="k">Lifecycle</span><span class="v">${p.lifecycle}</span></div>
                <div class="pr-kv"><span class="k">Company</span><span class="v">PropertyPro Zambia Ltd</span></div>
                <div class="pr-kv"><span class="k">Manager</span><span class="v">Chanda Mwanza • CM</span></div>
                <div class="pr-lifecycle">
                  ${[
                    "Acquisition",
                    "Lease-up",
                    "Stabilized",
                    "Value-Add",
                    "Disposal",
                  ]
                    .map((step) => {
                      const isActive = step === p.lifecycle;
                      return `<span class="pr-lc-step ${isActive ? "active" : ""}">${step}</span>`;
                    })
                    .join('<span class="pr-lc-arrow">→</span>')}
                </div>
              </div>
              <div class="pr-info-card">
                <h4>Financial Snapshot</h4>
                <div class="pr-kv"><span class="k">Market Value</span><span class="v">ZMW ${p.value.toFixed(1)}M</span></div>
                <div class="pr-kv"><span class="k">Units / Occupied</span><span class="v">${p.units} / ${p.occupied} (${pct}%)</span></div>
                <div class="pr-kv"><span class="k">Monthly Rent Roll</span><span class="v">ZMW ${(p.rent || 0).toFixed(2)}M</span></div>
                <div class="pr-kv"><span class="k">Yield / NOI</span><span class="v">${p.yield.toFixed(1)}% • ZMW ${((p.value * p.yield) / 100 / 12).toFixed(2)}M</span></div>
                <div class="pr-kv"><span class="k">Vacancy</span><span class="v">${p.units - p.occupied} units • ${100 - pct}%</span></div>
                <div class="pr-kv"><span class="k">Currency</span><span class="v">ZMW • Zambia</span></div>
                <div style="margin-top:12px"><div class="pr-occ"><div class="top"><span>Occupancy ${pct}%</span><span>${p.occupied}/${p.units}</span></div><div class="bar"><div class="fill ${occBarClass(pct)}" style="width:${pct}%"></div></div></div></div>
              </div>
            </div>
            <div class="pr-info-card" style="margin-top:12px">
              <h4>Hierarchy Example — ${p.name} Block A Floor 1 Unit 101</h4>
              <div class="small muted" style="font-size:12px;line-height:1.6">
                <div>📁 Portfolio (28) → 🏢 ${p.name} → 🧱 Block A → 🛗 Floor 1 → 🚪 Unit 101 → 🏬 Shop Floor / 📦 Storage / 🅿️ Parking Bay → 🔧 Fixed Asset: HVAC-001</div>
                <div style="margin-top:8px">Units in this property: ${units.length || p.units} registered. Spaces: Retail / Office / Storage. Fixed assets tracked per unit.</div>
              </div>
            </div>
            <div class="pr-info-card" style="margin-top:12px">
              <h4>Recent Activity</h4>
              <div class="pr-timeline">
                <div class="pr-tl done"><div class="t">12 Sep 2026 • Valuation</div><div class="d">Market value updated to ZMW ${p.value.toFixed(1)}M by Knight Frank — +6.4%</div></div>
                <div class="pr-tl done"><div class="t">08 Sep 2026 • Lease</div><div class="d">New lease L-2026-00${Math.floor(Math.random() * 500 + 200)} signed for Unit ${Math.floor(Math.random() * 100 + 101)}</div></div>
                <div class="pr-tl"><div class="t">05 Sep 2026 • Maintenance</div><div class="d">HVAC inspection completed in ${p.name} Block A</div></div>
                <div class="pr-tl"><div class="t">Managed by Chanda Mwanza • CM • PropertyPro Zambia Ltd</div><div class="d">Lifecycle: ${p.lifecycle} → Next review ${p.lifecycle === "Disposal" ? "Disposal assessment" : "Q4 2026"}</div></div>
              </div>
            </div>
          </div>
        `;
        break;
      case "units":
        html = `<div class="pr-drawer-section"><h4 style="margin:0 0 12px;font-size:13px;font-weight:700">Units — ${p.name} • ${p.units} total • ${p.occupied} occupied</h4>`;
        if (units.length === 0) {
          // generate placeholder units
          const placeholderCount = Math.min(p.units, 12);
          html += `<div class="small muted" style="margin-bottom:10px">Showing ${placeholderCount} of ${p.units} units — example hierarchy Zambezi Mall Block A Floor 1 Unit 101</div>`;
          for (let i = 1; i <= placeholderCount; i++) {
            const isOcc = i <= Math.round(placeholderCount * 0.83);
            html += `<div class="pr-unit-row" onclick="location.href='./units.html?property=${p.id}'"><div><strong>Unit ${100 + i}</strong> • Block ${String.fromCharCode(64 + ((i % 3) + 1))} • Floor ${i % 4} • ${p.type} • ${60 + i * 4}m²</div><div><span class="pr-pill ${isOcc ? "status-stabilized" : "lifecycle-disposal"}">${isOcc ? "Occupied" : "Vacant"}</span></div></div>`;
          }
        } else {
          units.forEach((u) => {
            html += `<div class="pr-unit-row" onclick="window.openUnit('${u.id}')"><div><strong>${u.unit}</strong> • ${u.block} • Floor ${u.floor} • ${u.type} • ${u.area}m² • ${u.tenant}</div><div><span class="pr-pill status-${u.status.toLowerCase()}">${u.status}</span></div></div>`;
          });
        }
        html += `<div style="margin-top:12px"><button class="pr-btn pr-btn-primary" onclick="location.href='./units.html?property=${p.id}'">Open Units Register filtered by ${p.id}</button></div></div>`;
        break;
      case "financials":
        html = `<div class="pr-drawer-section">
          <div class="pr-overview-grid">
            <div class="pr-info-card"><h4>Rent Roll</h4>
              <div class="pr-kv"><span class="k">Total Units</span><span class="v">${p.units}</span></div>
              <div class="pr-kv"><span class="k">Occupied</span><span class="v">${p.occupied} • ${pct}%</span></div>
              <div class="pr-kv"><span class="k">Avg Rent / unit</span><span class="v">ZMW ${(((p.rent || 1) * 1000000) / p.units).toFixed(0)}</span></div>
              <div class="pr-kv"><span class="k">Monthly Income</span><span class="v">ZMW ${(p.rent || 0).toFixed(2)}M</span></div>
              <div class="pr-kv"><span class="k">Annual NOI</span><span class="v">ZMW ${((p.value * p.yield) / 100).toFixed(2)}M</span></div>
            </div>
            <div class="pr-info-card"><h4>Valuation</h4>
              <div class="pr-kv"><span class="k">Current</span><span class="v">ZMW ${p.value.toFixed(1)}M</span></div>
              <div class="pr-kv"><span class="k">Previous</span><span class="v">ZMW ${(p.value * 0.94).toFixed(1)}M</span></div>
              <div class="pr-kv"><span class="k">Change</span><span class="v" style="color:var(--green)">+6.4%</span></div>
              <div class="pr-kv"><span class="k">Valuer</span><span class="v">Knight Frank Zambia</span></div>
              <div class="pr-kv"><span class="k">Method</span><span class="v">Income Cap @ ${p.yield.toFixed(1)}%</span></div>
              <div class="pr-kv"><span class="k">Next</span><span class="v">31 Dec 2026</span></div>
            </div>
          </div>
          <div class="pr-info-card" style="margin-top:12px"><h4>Currency & Company</h4><div style="font-size:12.5px;color:var(--muted)">All values in ZMW — Zambian Kwacha. Entity: PropertyPro Zambia Ltd. Owner: Portfolio Manager Chanda Mwanza (CM). Yield calculated net of service charges and voids.</div></div>
        </div>`;
        break;
      case "leases":
        html = `<div class="pr-drawer-section"><h4 style="margin:0 0 12px;font-size:13px;font-weight:700">Leases — ${p.name}</h4>`;
        if (leases.length === 0) {
          html += `<div class="pr-empty" style="padding:24px"><div class="icon">📄</div><h4>No leases linked</h4><p>${p.units - p.occupied} vacant units available for lease-up. Lifecycle ${p.lifecycle}.</p><button class="pr-btn" onclick="location.href='./leases.html?property=${p.id}'">View all leases</button></div>`;
        } else {
          leases.forEach((l) => {
            html += `<div class="pr-unit-row" onclick="location.href='./leases.html?property=${p.id}&id=${l.id}'"><div><strong>${l.id}</strong> • ${l.tenant} • ZMW ${l.rent.toLocaleString()} • ${l.status}</div><div><span class="pr-pill status-${l.status.toLowerCase().replace(/ /g, "-")}">${l.status}</span></div></div>`;
          });
        }
        html += `</div>`;
        break;
      case "documents":
        html = `<div class="pr-drawer-section"><h4 style="margin:0 0 12px;font-size:13px;font-weight:700">Documents — ${p.name}</h4>`;
        if (docs.length === 0) {
          html += `<div class="pr-empty" style="padding:24px"><div class="icon">📁</div><h4>No documents</h4><p>Upload Title Deed, Valuation, Lease agreements for ${p.name}.</p><button class="pr-btn" onclick="location.href='./documents.html?property=${p.id}'">Open Documents</button></div>`;
        } else {
          docs.forEach((d) => {
            html += `<div class="pr-unit-row"><div><strong>${d.name}</strong> • ${d.category} • ${d.size}</div><div><span class="pr-badge">${d.updated}</span></div></div>`;
          });
        }
        html += `</div>`;
        break;
      case "maintenance":
        html = `<div class="pr-drawer-section"><h4 style="margin:0 0 12px;font-size:13px;font-weight:700">Maintenance — ${p.name}</h4>`;
        if (maints.length === 0) {
          html += `<div class="pr-empty" style="padding:24px"><div class="icon">🔧</div><h4>No open maintenance</h4><p>All fixed assets (HVAC-001, Geyser-B14) operational. Last inspection 2 days ago.</p></div>`;
        } else {
          maints.forEach((m) => {
            html += `<div class="pr-unit-row" onclick="location.href='./maintenance.html?property=${p.id}'"><div><strong>${m.id}</strong> • ${m.cat} • ${m.unit} • ${m.priority} • ${m.status}</div><div><span class="pr-pill ${m.priority.toLowerCase() === "critical" ? "lifecycle-disposal" : "lifecycle-lease-up"}">${m.sla}</span></div></div>`;
          });
        }
        html += `</div>`;
        break;
      case "compliance":
        html = `<div class="pr-drawer-section"><h4 style="margin:0 0 12px;font-size:13px;font-weight:700">Compliance — ${p.name}</h4>`;
        if (comps.length === 0) {
          html += `<div class="pr-empty" style="padding:24px"><div class="icon">⚖</div><h4>Compliance clear</h4><p>Title deed valid, ZRA tax clear, Council rates paid. Next renewal Mar 2027.</p></div>`;
        } else {
          comps.forEach((c) => {
            html += `<div class="pr-unit-row"><div><strong>${c.title || c.name}</strong> • ${c.status || "Active"}</div><div><span class="pr-badge">${c.due || ""}</span></div></div>`;
          });
        }
        html += `</div>`;
        break;
      case "activity":
        html = `<div class="pr-drawer-section"><h4 style="margin:0 0 12px;font-size:13px;font-weight:700">Activity — ${p.name}</h4><div class="pr-timeline">
          <div class="pr-tl done"><div class="t">Today • Chanda Mwanza CM</div><div class="d">Viewed property register drawer — ${p.id} • ${p.name}</div></div>
          <div class="pr-tl done"><div class="t">12 Sep 2026 • System</div><div class="d">Occupancy ${pct}% • ${p.occupied}/${p.units} occupied • Lifecycle ${p.lifecycle}</div></div>
          <div class="pr-tl done"><div class="t">10 Sep 2026 • Finance</div><div class="d">Rent collected ZMW ${(p.rent || 0).toFixed(2)}M • Yield ${p.yield}% • Value ZMW ${p.value.toFixed(1)}M</div></div>
          <div class="pr-tl"><div class="t">05 Sep 2026 • Maintenance</div><div class="d">Block A Floor 1 Unit 101 — HVAC-001 serviced — Fixed Asset</div></div>
          <div class="pr-tl"><div class="t">01 Sep 2026 • Portfolio</div><div class="d">Property ${p.id} included in Board Pack Q3 2026 — ZMW 486.4M portfolio</div></div>
        </div></div>`;
        break;
    }
    drawerBody.innerHTML = html;
  }

  // Helper global for units click
  window.openUnit = function (unitId) {
    const u = (state.units || []).find((x) => x.id === unitId);
    if (!u) {
      toast("Unit not found", "error");
      return;
    }
    // Open drawer with unit info? For spec, selecting unit shows details + opens unit drawer
    // We'll toast and navigate to units page with param
    toast(
      `Unit ${u.unit} — ${u.property} Block ${u.block} Floor ${u.floor}`,
      "",
    );
    // Could open same drawer with unit overview
  };

  // ---------- Hierarchy Explorer ----------
  const hierarchyTree = document.getElementById("hierarchyTree");
  const hierarchyDetail = document.getElementById("hierarchyDetail");
  let treeState = {}; // expanded keys

  function generateHierarchyData() {
    // Portfolio root
    return {
      id: "portfolio",
      label: "Portfolio",
      icon: "📁",
      meta: `${state.properties.length} Properties • ZMW ${state.properties.reduce((s, p) => s + p.value, 0).toFixed(1)}M`,
      type: "portfolio",
      children: state.properties.map((prop) => {
        // deterministic blocks based on units
        const blockCount = prop.units > 100 ? 3 : prop.units > 50 ? 2 : 1;
        const blocks = [];
        for (let b = 0; b < blockCount; b++) {
          const blockLabel = `Block ${String.fromCharCode(65 + b)}`;
          const floorCount = prop.units > 120 ? 4 : 3;
          const floors = [];
          for (let f = 0; f < floorCount; f++) {
            const floorLabel = f === 0 ? "Ground Floor" : `Floor ${f}`;
            // units per floor: sample 2-4 units
            const unitsPerFloor = 3;
            const uNodes = [];
            for (let u = 0; u < unitsPerFloor; u++) {
              const unitNum = `${f}${String(100 + u + b * 3).slice(1)}`; // e.g., 101
              const unitId = `${prop.id}-U-${blockLabel.replace(" ", "")}-F${f}-${u}`;
              const isOccupied = Math.random() > 0.17;
              const spaces = [
                { label: "Shop Floor / Retail", icon: "🏬", meta: "96m²" },
                { label: "Storage", icon: "📦", meta: "12m²" },
                { label: "Parking Bay", icon: "🅿️", meta: "Bay 12" },
              ];
              // For residential variant
              const isRes = prop.type === "Residential";
              const spaceNodes = isRes
                ? [
                    { label: "2BR / Living", icon: "🏠", meta: "68m²" },
                    { label: "Balcony", icon: "🌿", meta: "8m²" },
                    { label: "Parking", icon: "🅿️", meta: "Zone B" },
                  ]
                : spaces;

              const assetNodes = [
                {
                  label: `HVAC-${unitId.slice(-3)}`,
                  icon: "🔧",
                  meta: "Fixed Asset • Active",
                  type: "asset",
                },
                {
                  label: `Meter-${unitId.slice(-3)}`,
                  icon: "⚡",
                  meta: "Utilities • 842kWh",
                  type: "asset",
                },
              ];

              uNodes.push({
                id: unitId,
                label: `Unit ${unitNum}`,
                icon: isOccupied ? "🚪" : "🟦",
                meta: isOccupied
                  ? "Occupied • Bata Zambia • ZMW 42k"
                  : "Vacant • ZMW 45k/m",
                type: "unit",
                propId: prop.id,
                propName: prop.name,
                block: blockLabel,
                floor: floorLabel,
                occupied: isOccupied,
                children: [
                  ...spaceNodes.map((s, si) => ({
                    id: unitId + "-S-" + si,
                    label: s.label,
                    icon: s.icon,
                    meta: s.meta,
                    type: "space",
                    children: assetNodes.map((a) => ({
                      id: a.label,
                      label: a.label,
                      icon: a.icon,
                      meta: a.meta,
                      type: a.type,
                    })),
                  })),
                ],
              });
            }
            floors.push({
              id: `${prop.id}-${blockLabel}-F${f}`,
              label: floorLabel,
              icon: "🛗",
              meta: `${uNodes.length} units`,
              type: "floor",
              children: uNodes,
            });
          }
          blocks.push({
            id: `${prop.id}-${blockLabel}`,
            label: blockLabel,
            icon: "🧱",
            meta: `${floorCount} floors`,
            type: "block",
            children: floors,
          });
        }
        return {
          id: prop.id,
          label: prop.name,
          icon: "🏢",
          meta: `${prop.city} • ${prop.units}U • ${calcOccupancyPct(prop)}% • ZMW ${prop.value.toFixed(1)}M`,
          type: "property",
          propId: prop.id,
          children: blocks,
        };
      }),
    };
  }

  let hierarchyData = null;

  function renderHierarchy() {
    hierarchyData = generateHierarchyData();
    treeState = { portfolio: true }; // expand portfolio by default
    // expand first 2 properties for demo
    if (hierarchyData.children && hierarchyData.children.length) {
      treeState[hierarchyData.children[0].id] = true;
      treeState[hierarchyData.children[1].id] = true;
      if (hierarchyData.children[0].children[0])
        treeState[hierarchyData.children[0].children[0].id] = true;
    }
    let html = "";
    html += renderTreeNode(hierarchyData, 0);
    hierarchyTree.innerHTML = html;
    bindTreeEvents();
  }

  function renderTreeNode(node, depth) {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = treeState[node.id] === true;
    const collapsedCls = hasChildren && !isExpanded ? " collapsed" : "";
    const nodeSelected =
      selectedUnitId && node.id === selectedUnitId ? " selected" : "";
    let html = `
      <div class="pr-tree-node${collapsedCls}${nodeSelected}" data-id="${node.id}" data-type="${node.type}" style="padding-left:${16 + depth * 14}px">
        ${hasChildren ? `<div class="toggle">${isExpanded ? "▼" : "▶"}</div>` : `<div class="toggle" style="opacity:0">•</div>`}
        <div class="node-ico">${node.icon || "•"}</div>
        <div class="node-label">${node.label}</div>
        ${node.meta ? `<div class="node-meta">${node.meta}</div>` : ""}
      </div>
    `;
    if (hasChildren) {
      html += `<div class="pr-tree-children ${isExpanded ? "" : "collapsed"}" data-parent="${node.id}">`;
      node.children.forEach((child) => {
        html += renderTreeNode(child, depth + 1);
      });
      html += `</div>`;
    }
    return html;
  }

  let selectedUnitId = null;
  function bindTreeEvents() {
    hierarchyTree.querySelectorAll(".pr-tree-node").forEach((el) => {
      el.addEventListener("click", (e) => {
        const id = el.getAttribute("data-id");
        const type = el.getAttribute("data-type");
        const node = findNodeById(hierarchyData, id);
        if (!node) return;

        // toggle if has children
        if (node.children && node.children.length) {
          treeState[id] = !treeState[id];
          renderHierarchy();
          // keep selection highlight if unit previously selected
          if (selectedUnitId) {
            const selEl = hierarchyTree.querySelector(
              `.pr-tree-node[data-id="${selectedUnitId}"]`,
            );
            if (selEl) selEl.classList.add("selected");
          }
          return;
        }

        // leaf or unit
        if (type === "unit") {
          selectedUnitId = id;
          showUnitDetail(node);
          // also open drawer? per spec selecting unit shows details + opens unit drawer
          if (node.propId) {
            // open property drawer if not already
            // toast and also show unit drawer logic: we keep hierarchy detail and also toast to navigate to units
            toast(
              `${node.label} — ${node.propName} ${node.block} ${node.floor} selected — opening unit drawer`,
              "",
            );
            // Highlight
            hierarchyTree
              .querySelectorAll(".pr-tree-node")
              .forEach((n) => n.classList.remove("selected"));
            el.classList.add("selected");
            // Option: open property drawer as well to show broader context
          }
        } else if (type === "property") {
          // clicking property node opens property drawer
          if (node.propId) openPropertyDrawer(node.propId);
        } else if (type === "asset") {
          toast(`Fixed Asset ${node.label} — ${node.meta}`, "");
        } else {
          // spaces, etc. just detail
          selectedUnitId = id;
          showGenericDetail(node);
        }
      });
    });
  }

  function findNodeById(root, id) {
    if (!root) return null;
    if (root.id === id) return root;
    if (!root.children) return null;
    for (let c of root.children) {
      const found = findNodeById(c, id);
      if (found) return found;
    }
    return null;
  }

  function showUnitDetail(node) {
    hierarchyDetail.innerHTML = `
      <div class="pr-unit-detail">
        <h4>🏢 ${node.propName} — ${node.label}</h4>
        <div style="font-size:12px;color:var(--muted);margin-bottom:10px">${node.block} • ${node.floor} • ${node.meta} • ID ${node.id}</div>
        <div class="grid2">
          <div class="pr-info-card" style="padding:10px"><div class="label" style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700">Status</div><div style="font-weight:700;margin-top:4px">${node.occupied ? "Occupied" : "Vacant"}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${node.occupied ? "Bata Zambia • T-1038 • ZMW 42,000 /m" : "Available • ZMW 45,000 /m"}</div></div>
          <div class="pr-info-card" style="padding:10px"><div class="label" style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700">Spaces</div><div style="font-weight:600;margin-top:4px">${(node.children || []).length} spaces</div><div style="font-size:11px;color:var(--muted);margin-top:2px">Shop Floor / Storage / Parking Bay</div></div>
        </div>
        <div style="margin-top:12px">
          <h5 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">Spaces → Fixed Assets hierarchy</h5>
          ${(node.children || [])
            .map(
              (space) => `
            <div class="pr-unit-row" style="margin-bottom:6px">
              <div><span style="margin-right:6px">${space.icon}</span><strong>${space.label}</strong> • ${space.meta}</div>
              <div style="font-size:11px;color:var(--muted)">${space.children ? space.children.length + " assets" : ""}</div>
            </div>
            ${space.children ? space.children.map((asset) => `<div style="display:flex;gap:8px;align-items:center;padding:6px 12px 6px 32px;font-size:12px;color:var(--muted)"><span>${asset.icon}</span> ${asset.label} • ${asset.meta} • <span class="pr-badge">Fixed Asset</span></div>`).join("") : ""}
          `,
            )
            .join("")}
        </div>
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="pr-btn pr-btn-primary" onclick="location.href='./units.html?property=${node.propId}'">View in Units Register</button>
          <button class="pr-btn" onclick="location.href='./leases.html?property=${node.propId}'">View Leases</button>
          <button class="pr-btn" onclick="window.openPropertyDrawer('${node.propId}')">Open Property Drawer</button>
        </div>
      </div>
    `;
  }

  function showGenericDetail(node) {
    hierarchyDetail.innerHTML = `
      <div class="pr-unit-detail">
        <h4>${node.icon || ""} ${node.label}</h4>
        <div style="font-size:12px;color:var(--muted)">${node.meta || ""} • Type ${node.type} • ID ${node.id}</div>
        <div style="margin-top:12px;font-size:12.5px;line-height:1.6">Hierarchy path: Portfolio → Property → Block → Floor → Unit → Space → Fixed Asset. This ${node.type} is part of the asset register and linked to maintenance, utilities and compliance modules.</div>
        ${node.children ? `<div style="margin-top:10px"><strong>${node.children.length} children</strong> — ${node.children.map((c) => c.label).join(", ")}</div>` : ""}
      </div>
    `;
  }

  // Expose for inline onclicks
  window.openPropertyDrawer = openPropertyDrawer;

  // ---------- Header actions ----------
  document.getElementById("btnImport").addEventListener("click", () => {
    toast(
      "Import CSV — prepare file with columns: ID, Name, Type, City, Units, Occupied, Value, Yield, Lifecycle, Status. Feature coming soon — use Add Property for now.",
      "",
    );
  });
  document.getElementById("btnExport").addEventListener("click", () => {
    const fileName = `Property-Register-${new Date().toISOString().slice(0, 10)}`;
    if (typeof exportExcel === "function") {
      exportExcel("#propertyTable", fileName);
    } else {
      // fallback CSV
      let csv =
        "ID,Name,Type,City,Units,Occupied,Occupancy%,Value,Yield,Lifecycle,Status\n";
      getFiltered().forEach((p) => {
        csv += `${p.id},"${p.name}",${p.type},${p.city},${p.units},${p.occupied},${calcOccupancyPct(p)}%,${p.value},${p.yield}%,${p.lifecycle},${p.status}\n`;
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName + ".csv";
      a.click();
      URL.revokeObjectURL(url);
      if (typeof toast === "function") toast("CSV exported", "success");
    }
  });
  document.getElementById("btnAddProperty").addEventListener("click", () => {
    location.href = "./add-property.html";
  });

  // ---------- Filters listeners ----------
  [
    filterSearch,
    filterType,
    filterCity,
    filterLifecycle,
    filterOccupancy,
    filterStatus,
  ].forEach((el) => {
    el.addEventListener(el.tagName === "INPUT" ? "input" : "change", () => {
      currentPage = 1;
      renderTable();
    });
  });
  document.getElementById("btnClearFilters").addEventListener("click", () => {
    filterSearch.value = "";
    filterType.value = "All";
    filterCity.value = "All";
    filterLifecycle.value = "All";
    filterOccupancy.value = "All";
    filterStatus.value = "All";
    currentPage = 1;
    renderAll();
    toast("Filters cleared", "");
  });

  // ---------- Hierarchy toggles ----------
  document.getElementById("btnExpandAll").addEventListener("click", () => {
    // mark all expanded
    function expandAll(node) {
      treeState[node.id] = true;
      if (node.children) node.children.forEach(expandAll);
    }
    if (hierarchyData) expandAll(hierarchyData);
    renderHierarchy();
  });
  document.getElementById("btnCollapseAll").addEventListener("click", () => {
    treeState = { portfolio: true };
    renderHierarchy();
    hierarchyDetail.innerHTML = `<div class="pr-detail-empty"><div><div style="font-size:20px;margin-bottom:8px">🏢</div><div style="font-weight:600;color:var(--text)">Select a unit to inspect</div><div style="font-size:12.5px;margin-top:4px">Navigate Portfolio → Property → Block → Floor → Unit. Fixed assets linked under spaces.</div></div></div>`;
  });
  document
    .getElementById("btnToggleHierarchy")
    .addEventListener("click", () => {
      const card = document.getElementById("hierarchyCard");
      card.scrollIntoView({ behavior: "smooth" });
    });

  // ---------- Drawer footer actions ----------
  document.getElementById("btnEditProperty").addEventListener("click", () => {
    if (!activePropertyId) return;
    const p = state.properties.find((x) => x.id === activePropertyId);
    toast(`Editing ${p.name} — opening editor`, "");
    setTimeout(() => {
      location.href = `./add-property.html?id=${activePropertyId}`;
    }, 500);
  });
  document.getElementById("btnViewUnits").addEventListener("click", () => {
    if (!activePropertyId) return;
    location.href = `./units.html?property=${activePropertyId}`;
  });
  document.getElementById("btnViewLeases").addEventListener("click", () => {
    if (!activePropertyId) return;
    location.href = `./leases.html?property=${activePropertyId}`;
  });
  document.getElementById("btnViewDocs").addEventListener("click", () => {
    if (!activePropertyId) return;
    location.href = `./documents.html?property=${activePropertyId}`;
  });
  document.getElementById("btnExportProp").addEventListener("click", () => {
    if (!activePropertyId) return;
    exportSingleProperty(activePropertyId);
  });

  // ---------- Query param ?id=P-001 opens drawer ----------
  function checkQueryParam() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      // wait for render
      setTimeout(() => openPropertyDrawer(id), 300);
    }
  }

  // ---------- Initial render ----------
  renderHeader();
  renderAll();
  renderHierarchy();
  checkQueryParam();

  // Also handle when navigating back via history (popstate)
  window.addEventListener("popstate", checkQueryParam);
});


// [Debug] Page loaded: js/pages/property-register.js
console.log('[Page:js/pages/property-register.js] Loaded with breadcrumb fix and search/notif support');



// ==== INVESTMENT INTEGRATION - Property -> Investment Link ====
(function addInvestmentTab(){
  const tabsEl = document.getElementById('drawerTabs');
  if(!tabsEl) return;
  if(tabsEl.querySelector('[data-tab="investment"]')) return;
  const invTab = document.createElement('div');
  invTab.className='pr-drawer-tab';
  invTab.dataset.tab='investment';
  invTab.innerHTML='Investment <span style="margin-left:4px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;padding:0 6px;border-radius:20px;font-size:10px">NEW</span>';
  tabsEl.appendChild(invTab);

  invTab.addEventListener('click', ()=>{
    document.querySelectorAll('.pr-drawer-tab').forEach(t=> t.classList.remove('active'));
    invTab.classList.add('active');
    renderInvestmentTab();
  });

  function renderInvestmentTab(){
    const propId = window.activePropertyId || (window.state?.properties?.find(p=>p.id===document.getElementById('drawerId')?.textContent)?.id);
    const asset = (state.investmentAssets||[]).find(a=> a.propertyId===propId || a.linkedPropertyId===propId);
    const body = document.getElementById('drawerBody');
    if(!body) return;
    if(!asset){
      body.innerHTML = `
        <div style="padding:16px;background:#FFF;border:1px solid var(--border);border-radius:10px">
          <h4 style="margin:0 0 8px">Investment Link</h4>
          <p style="font-size:13px;color:var(--muted);line-height:1.6">This property is not yet linked to an investment asset. Create a property investment asset to enable fund performance flow: Property → Units → Tenants → Leases → Rental Income → Opex → NOI → Investment Asset → Portfolio → Fund.</p>
          <button class="pr-btn pr-btn-primary" style="margin-top:10px" onclick="goToPage('investment-assets.html')">Go to Investment Asset Register</button>
        </div>
      `;
      return;
    }
    const prop = state.properties.find(p=>p.id===propId);
    const fund = state.funds?.find(f=>f.id===asset.fundId);
    const portfolio = state.portfolios?.find(p=>p.id===asset.portfolioId);
    const allocationPct = (state.investmentAssets.filter(a=>a.fundId===asset.fundId).reduce((s,a)=>s+(a.currentValue||0),0) ? (asset.currentValue / state.investmentAssets.filter(a=>a.fundId===asset.fundId).reduce((s,a)=>s+(a.currentValue||0),0) *100) : 0);
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;padding:14px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#1D4ED8;font-weight:700">Investment Asset</div><div style="font-size:18px;font-weight:800;margin-top:4px">${asset.id}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${asset.name} • ${asset.assetClass}</div></div>
        <div style="background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700">Current Valuation</div><div style="font-size:18px;font-weight:800;margin-top:4px">ZMW ${(asset.currentValue/1_000_000).toFixed(2)}M</div><div style="font-size:12px;color:${asset.unrealizedGain>=0?'#16A34A':'#DC2626'};margin-top:2px">${asset.unrealizedGain>=0?'+':''}ZMW ${(asset.unrealizedGain/1_000_000).toFixed(2)}M (${asset.unrealizedGainPct?.toFixed(2)}%)</div></div>
      </div>
      <div style="margin-top:12px;background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
        <h4 style="margin:0 0 10px">Fund & Portfolio Allocation</h4>
        <div style="display:grid;grid-template-columns:120px 1fr;gap:8px;font-size:13px">
          <div style="color:var(--muted)">Fund</div><div style="font-weight:600">${fund?.name||asset.fundId} • ${fund?.type||''}</div>
          <div style="color:var(--muted)">Portfolio</div><div style="font-weight:600">${portfolio?.name||asset.portfolioId}</div>
          <div style="color:var(--muted)">Asset Class</div><div style="font-weight:600">${asset.assetClass} • ${asset.subClass||''}</div>
          <div style="color:var(--muted)">Allocation %</div><div style="font-weight:700;color:#2563EB">${allocationPct.toFixed(2)}% of fund</div>
          <div style="color:var(--muted)">Ownership</div><div style="font-weight:600">${asset.ownershipPct}%</div>
          <div style="color:var(--muted)">Risk Rating</div><div><span class="pr-pill ${asset.riskRating==='High'?'status-value-add':asset.riskRating==='Medium'?'status-lease-up':'status-stabilized'}">${asset.riskRating}</span></div>
        </div>
      </div>
      <div style="margin-top:12px;background:#FFF;border:1px solid var(--border);border-radius:10px;padding:14px">
        <h4 style="margin:0 0 10px">Property Investment Performance</h4>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Rental Income</div><div style="font-weight:700">ZMW ${(asset.rentalIncome/1_000_000).toFixed(2)}M</div><div style="font-size:11px;color:var(--muted)">Annual • from leases</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Operating Costs</div><div style="font-weight:700">ZMW ${(asset.operatingCosts/1_000_000).toFixed(2)}M</div><div style="font-size:11px;color:var(--muted)">28-35% of rent</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">NOI</div><div style="font-weight:800;color:#16A34A">ZMW ${(asset.noi/1_000_000).toFixed(2)}M</div><div style="font-size:11px;color:var(--muted)">Rent - Opex</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Net Yield</div><div style="font-weight:800;color:#1D4ED8">${asset.yield}%</div><div style="font-size:11px;color:var(--muted)">NOI / Value</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">CapEx</div><div style="font-weight:700">ZMW ${(asset.capEx/1_000_000).toFixed(2)}M</div><div style="font-size:11px;color:var(--muted)">2% of value</div></div>
          <div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:600">Valuation Date</div><div style="font-weight:600">${asset.valuationDate}</div><div style="font-size:11px;color:var(--muted)">Income approach</div></div>
        </div>
        <div style="margin-top:12px;padding:10px;background:#F8FAFC;border:1px solid #F1F5F9;border-radius:8px;font-size:12px;line-height:1.5"><b>Data Flow:</b> Property operational data (units ${prop?.units||0}, occupied ${prop?.occupied||0}, rent ZMW ${prop?.rent||0}M) → Rental Income ZMW ${(asset.rentalIncome/1_000_000).toFixed(2)}M → Opex ZMW ${(asset.operatingCosts/1_000_000).toFixed(2)}M → NOI ZMW ${(asset.noi/1_000_000).toFixed(2)}M → Investment Asset Value ZMW ${(asset.currentValue/1_000_000).toFixed(2)}M → Portfolio ${allocationPct.toFixed(1)}% → Fund Performance</div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="pr-btn pr-btn-primary" onclick="goToPage('investment-assets.html?id=${asset.id}')">Open Investment Record →</button>
        <button class="pr-btn" onclick="goToPage('investment-performance.html?fund=${asset.fundId}')">View Fund Performance</button>
        <button class="pr-btn" onclick="goToPage('asset-allocation.html?fund=${asset.fundId}')">View Allocation</button>
      </div>
    `;
  }

  // Hook into existing tab rendering to preserve investment tab when switching back
  const origOpen = window.openPropertyDrawer;
  if(origOpen){
    window.openPropertyDrawer = function(id){
      origOpen(id);
      setTimeout(()=>{
        const tb = document.getElementById('drawerTabs');
        if(tb && !tb.querySelector('[data-tab="investment"]')){
          const t=document.createElement('div');
          t.className='pr-drawer-tab'; t.dataset.tab='investment';
          t.innerHTML='Investment <span style="margin-left:4px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;padding:0 6px;border-radius:20px;font-size:10px">NEW</span>';
          tb.appendChild(t);
          t.addEventListener('click', ()=>{
            document.querySelectorAll('.pr-drawer-tab').forEach(x=>x.classList.remove('active'));
            t.classList.add('active');
            renderInvestmentTab();
          });
        }
      },100);
    };
  }

  // Also add investment info to drawer summary
  const summaryEl = document.getElementById('drawerSummary');
  if(summaryEl){
    const observer = new MutationObserver(()=>{
      const propId = document.getElementById('drawerId')?.textContent;
      if(!propId) return;
      const asset = (state.investmentAssets||[]).find(a=> a.propertyId===propId);
      if(asset && !summaryEl.querySelector('.investment-brief')){
        const brief=document.createElement('div');
        brief.className='investment-brief';
        brief.style.cssText='margin-top:10px;padding:10px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;display:flex;justify-content:space-between;align-items:center';
        brief.innerHTML=`<div><div style="font-size:11px;color:#1D4ED8;font-weight:700;text-transform:uppercase">Investment</div><div style="font-weight:700;font-size:13px">${asset.id} • ZMW ${(asset.currentValue/1_000_000).toFixed(1)}M • ${asset.yield}% yield</div><div style="font-size:11px;color:var(--muted)">${asset.fundId} • ${allocationPct?allocationPct.toFixed(1)+'% allocation':''}</div></div><button class="pr-btn pr-btn-primary" style="height:28px;font-size:11px" onclick="document.querySelector('[data-tab=investment]')?.click()">Open</button>`;
        summaryEl.appendChild(brief);
      }
    });
    observer.observe(summaryEl, {childList:true, subtree:true});
  }
})();

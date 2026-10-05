/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/marketing.js
 * ============================================================================
 * PURPOSE:
 *   Page logic for marketing.js - handles filtering, rendering,
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


document.addEventListener("DOMContentLoaded", () => {
  initCommon("marketing");
  const STAGES = [
    { key: "VACANT", label: "VACANT", color: "vacant", dot: "#64748B" },
    {
      key: "PUBLISHED",
      label: "PUBLISHED",
      color: "published",
      dot: "#2563EB",
    },
    { key: "ENQUIRY", label: "ENQUIRY", color: "enquiry", dot: "#D97706" },
    { key: "VIEWING", label: "VIEWING", color: "viewing", dot: "#7C3AED" },
    {
      key: "APPLICATION",
      label: "APPLICATION",
      color: "application",
      dot: "#0E7490",
    },
    { key: "KYC", label: "KYC / REVIEW", color: "kyc", dot: "#DC2626" },
    { key: "APPROVED", label: "APPROVED", color: "approved", dot: "#16A34A" },
  ];
  const STAGE_ORDER = STAGES.map((s) => s.key);
  const COUNTS = {
    VACANT: 14,
    PUBLISHED: 8,
    ENQUIRY: 12,
    VIEWING: 6,
    APPLICATION: 5,
    KYC: 3,
    APPROVED: 2,
  };

  // Generate mock vacancies if not persisted
  function genVacancies() {
    const properties = state.properties || [];
    const tenantsPool = [
      "Shoprite enquiry",
      "MTN Mobile",
      "Bata Zambia",
      "Woolworths",
      "Hungry Lion",
      "PEP Stores",
      "Bank of Zambia branch",
      "Spar Zambia",
      "Zambeef",
      "Airtel",
      "Liquid Telecom",
      "Stanbic Bank",
      "Shoprite",
      "Game Stores",
      "Pick n Pay",
    ];
    const agents = [
      "Mutale Phiri",
      "Grace Banda",
      "John Mwila",
      "Chanda Mwanza",
      "Peter Zulu",
      "Mary Lungu",
    ];
    const types = [
      "Retail",
      "Residential",
      "Commercial",
      "Industrial",
      "Mixed-Use",
    ];
    const cities = ["Lusaka", "Ndola", "Chipata", "Kabwe"];
    let items = [];
    let idCounter = 1;
    STAGES.forEach((stage) => {
      const c = COUNTS[stage.key] || 6;
      for (let i = 0; i < c; i++) {
        const prop = properties[
          Math.floor(Math.random() * properties.length)
        ] || { name: "Zambezi Mall", city: "Lusaka", type: "Retail" };
        const unitNum = [
          "Unit 12",
          "Unit 203",
          "G-04",
          "B-14",
          "12-04",
          "A1",
          "2-12",
          "Shop 4",
          "Block B-3",
          "Unit 88",
          "Suite 5",
          "W-03",
        ][Math.floor(Math.random() * 12)];
        const area = 45 + Math.floor(Math.random() * 280);
        const rent = 18 + Math.floor(Math.random() * 102); // k
        const daysInStage = 1 + Math.floor(Math.random() * 42);
        const daysVacant =
          stage.key === "VACANT"
            ? daysInStage
            : 5 + Math.floor(Math.random() * 80);
        const views = Math.floor(Math.random() * 920) + 12;
        const lead =
          tenantsPool[Math.floor(Math.random() * tenantsPool.length)];
        const agent = agents[Math.floor(Math.random() * agents.length)];
        items.push({
          id: `V-${String(idCounter).padStart(3, "0")}`,
          unit: unitNum,
          unitId: `${prop.name.replace(/\s/g, "").slice(0, 3).toUpperCase()}-${unitNum.replace(/\W/g, "")}`,
          property: prop.name,
          city: prop.city || cities[Math.floor(Math.random() * cities.length)],
          type: prop.type || types[Math.floor(Math.random() * types.length)],
          area,
          rent, // in k ZMW
          rentRaw: rent * 1000,
          stage: stage.key,
          lead,
          leadType:
            stage.key === "ENQUIRY" || stage.key === "VIEWING"
              ? "Enquiry"
              : stage.key === "VACANT"
                ? "Vacant"
                : "Tenant",
          daysInStage,
          daysVacant,
          views,
          enquiries:
            stage.key === "ENQUIRY"
              ? Math.floor(Math.random() * 18) + 1
              : Math.floor(Math.random() * 5),
          agent,
          assigned: agent,
          applicationId:
            stage.key !== "VACANT" && stage.key !== "PUBLISHED"
              ? `APP-${1000 + idCounter}`
              : null,
          createdAt: new Date(Date.now() - daysVacant * 24 * 3600 * 1000)
            .toISOString()
            .slice(0, 10),
          priority: rent > 80 ? "High" : rent > 40 ? "Medium" : "Low",
        });
        idCounter++;
      }
    });
    return items;
  }

  let vacancies = [];
  const savedVac = (() => {
    try {
      const j = JSON.parse(localStorage.getItem("propertypro_v2"));
      if (j && j.vacancies && j.vacancies.length >= 30) return j.vacancies;
    } catch (e) {}
    return null;
  })();
  if (savedVac) {
    vacancies = savedVac;
  } else {
    vacancies = genVacancies();
    state.vacancies = vacancies;
    saveState();
  }

  // DOM refs
  const $id = (s) => document.getElementById(s);
  const kanbanScroll = $id("kanbanScroll");
  const vacancyTableWrap = $id("vacancyTable");
  const searchMain = $id("mkSearch");
  const propFilter = $id("fProperty");
  const cityFilter = $id("fCity");
  const stageFilter = $id("fStage");
  const rentFilter = $id("fRent");
  const daysFilter = $id("fDays");
  const pipeTotal = $id("pipelineTotal");

  let q = "";
  let filters = {
    property: "All",
    city: "All",
    stage: "All",
    rent: "All",
    days: "All",
  };

  function passesFilters(v) {
    if (filters.property !== "All" && v.property !== filters.property)
      return false;
    if (filters.city !== "All" && v.city !== filters.city) return false;
    if (filters.stage !== "All" && v.stage !== filters.stage) return false;
    if (filters.rent !== "All") {
      if (filters.rent === "<30k" && v.rent >= 30) return false;
      if (filters.rent === "30-60k" && (v.rent < 30 || v.rent > 60))
        return false;
      if (filters.rent === "60-90k" && (v.rent < 60 || v.rent > 90))
        return false;
      if (filters.rent === ">90k" && v.rent <= 90) return false;
    }
    if (filters.days !== "All") {
      if (filters.days === "<7d" && v.daysVacant >= 7) return false;
      if (filters.days === "7-30d" && (v.daysVacant < 7 || v.daysVacant > 30))
        return false;
      if (filters.days === ">30d" && v.daysVacant <= 30) return false;
    }
    if (q) {
      const low = q.toLowerCase();
      if (
        !(
          v.unit.toLowerCase().includes(low) ||
          v.property.toLowerCase().includes(low) ||
          v.lead.toLowerCase().includes(low) ||
          v.id.toLowerCase().includes(low) ||
          v.city.toLowerCase().includes(low)
        )
      )
        return false;
    }
    return true;
  }
  function filteredVacancies() {
    return vacancies.filter(passesFilters);
  }

  /* FIX: Kanban render - ensures full build visible with proper grouping and card rendering */
  function renderKanban() {
    if (!kanbanScroll) return;
    const filtered = filteredVacancies();
    // group by stage
    const byStage = {};
    STAGES.forEach((s) => (byStage[s.key] = []));
    filtered.forEach((v) => {
      if (byStage[v.stage]) byStage[v.stage].push(v);
      else byStage[v.stage] = [v];
    });
    kanbanScroll.innerHTML = STAGES.map((s) => {
      const items = byStage[s.key] || [];
      const count = items.length;
      return `
        <div class="kanban-col" data-stage="${s.key}">
          <div class="col-head">
            <div class="title"><i style="background:${s.dot}"></i>${s.label}</div>
            <div class="count ${s.color}">${count}</div>
          </div>
          <div class="col-body" data-stage="${s.key}">
            ${
              count
                ? items.map((v) => cardHTML(v)).join("")
                : `
              <div class="empty"><div class="big">∅</div><b>No ${s.label}</b><div class="small">Drag cards here or publish new vacancy</div></div>
            `
            }
          </div>
        </div>
      `;
    }).join("");
    // attach drag listeners
    attachDrag();
    // card clicks
    kanbanScroll.querySelectorAll(".v-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // ignore if clicking action inside? but we only have card
        const id = card.dataset.id;
        openVacancyDrawer(id);
      });
    });
    if (pipeTotal)
      pipeTotal.textContent = `${filtered.length} in pipeline • ${vacancies.length} total`;
  }

  /* Card HTML - vacancy card template with meta tags, lead, progress */
  function cardHTML(v) {
    const prioCol =
      v.priority === "High"
        ? "#DC2626"
        : v.priority === "Medium"
          ? "#D97706"
          : "#64748B";
    return `
      <div class="v-card" draggable="true" data-id="${v.id}" data-stage="${v.stage}">
        <div class="v-card-top">
          <div>
            <div class="v-card-title">${v.property} • ${v.unit}</div>
            <div class="v-card-sub">${v.type} • ${v.city} • ${v.id}</div>
          </div>
          <span class="pill gray" style="font-size:10px;border-left:3px solid ${prioCol}">${v.priority}</span>
        </div>
        <div class="v-card-meta">
          <span class="meta-tag area">${v.area}m²</span>
          <span class="meta-tag rent">ZMW ${v.rent}k</span>
          <span class="meta-tag days">${v.daysInStage} days in ${v.stage.toLowerCase()}</span>
          ${v.stage === "PUBLISHED" ? `<span class="meta-tag views">👁 ${v.views} views</span>` : ""}
          ${v.stage === "ENQUIRY" ? `<span class="meta-tag" style="background:#FFFBEB;color:#D97706;border-color:#FDE68A">✉ ${v.enquiries} enquiries</span>` : ""}
        </div>
        <div class="lead-row">
          <div class="lead-avatar">${v.lead.slice(0, 1).toUpperCase()}</div>
          <div class="lead-info"><b>${v.lead}</b><span>${v.leadType} • Agent ${v.assigned.split(" ")[0]}</span></div>
          <span class="small muted" style="font-size:10px">›</span>
        </div>
        <div class="progress-mini"><i style="width:${Math.min(100, ((STAGE_ORDER.indexOf(v.stage) + 1) / STAGE_ORDER.length) * 100)}%"></i></div>
        <div class="v-card-foot"><span class="agent">⏱ ${v.daysVacant}d vacant</span><span class="small muted">${v.createdAt}</span></div>
      </div>
    `;
  }

  /* FIX: Drag & Drop - enables moving cards between stages, updates localStorage */
  function attachDrag() {
    const cards = kanbanScroll.querySelectorAll(".v-card");
    const cols = kanbanScroll.querySelectorAll(".col-body");
    let dragId = null;
    cards.forEach((c) => {
      c.addEventListener("dragstart", (e) => {
        dragId = c.dataset.id;
        c.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      c.addEventListener("dragend", (e) => {
        c.classList.remove("dragging");
        dragId = null;
        cols.forEach((col) => col.classList.remove("drag-over"));
      });
    });
    cols.forEach((col) => {
      col.addEventListener("dragover", (e) => {
        e.preventDefault();
        col.classList.add("drag-over");
        e.dataTransfer.dropEffect = "move";
      });
      col.addEventListener("dragleave", (e) => {
        if (!col.contains(e.relatedTarget)) col.classList.remove("drag-over");
      });
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("drag-over");
        const targetStage = col.dataset.stage;
        if (!dragId) return;
        const v = vacancies.find((x) => x.id === dragId);
        if (!v) return;
        if (v.stage !== targetStage) {
          v.stage = targetStage;
          v.daysInStage = 1;
          // if moving to PUBLISHED, bump views
          if (targetStage === "PUBLISHED")
            v.views += Math.floor(Math.random() * 40);
          state.vacancies = vacancies;
          saveState();
          renderKanban();
          renderTable();
          toast(`Moved ${v.unit} → ${targetStage}`, "success");
        }
      });
    });
  }

  // Drawer
  function openVacancyDrawer(id) {
    const v = vacancies.find((x) => x.id === id);
    if (!v) return;
    const body = $id("drawerBody"),
      title = $id("drawerTitle"),
      sub = $id("drawerSubtitle");
    if (title) title.textContent = `${v.property} • ${v.unit}`;
    if (sub)
      sub.textContent = `${v.id} • ${v.city} • ${v.type} • ${v.area}m² • ZMW ${v.rent}k`;
    if (body) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:0">
          <div class="drawer-section" style="display:flex;gap:10px;align-items:center;background:#F8FAFC;border-radius:10px;padding:10px;margin:0 0 12px;border:1px solid var(--border)">
            <div style="width:44px;height:44px;border-radius:10px;background:var(--text);color:#FFF;display:grid;place-items:center;font-weight:800">${v.unit.slice(0, 2).toUpperCase()}</div>
            <div style="flex:1"><b>${v.property}</b><div class="small muted">${v.city} • ${v.type} • ${v.area}m² • Listed ${v.createdAt}</div></div>
            <span class="pill ${v.stage === "VACANT" ? "gray" : v.stage === "PUBLISHED" ? "blue" : v.stage === "APPROVED" ? "green" : "amber"}">${v.stage}</span>
          </div>

          <div class="drawer-section">
            <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">Vacancy Details</div>
            <dl class="drawer-kvs">
              <dt>Unit / Block</dt><dd>${v.unit} • ${v.unitId} – ${v.property}</dd>
              <dt>Area / Type</dt><dd>${v.area}m² • ${v.type} • ${v.city}</dd>
              <dt>Asking Rent</dt><dd>ZMW ${v.rent}k / month • ZMW ${v.rentRaw.toLocaleString()} (raw)</dd>
              <dt>Days Vacant</dt><dd>${v.daysVacant} days • In ${v.stage} for ${v.daysInStage} days</dd>
              <dt>Agent</dt><dd>${v.assigned} • ${v.priority} priority</dd>
              <dt>Pipeline</dt><dd>${STAGE_ORDER.join(" → ")}</dd>
              <dt>Metrics</dt><dd>👁 ${v.views} views • ✉ ${v.enquiries} enquiries • Lead ${v.lead}</dd>
            </dl>
          </div>

          <div class="drawer-section">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="location.href='./units.html?unit=${encodeURIComponent(v.unitId)}'">View Unit</button>
              ${v.applicationId ? `<button class="btn" onclick="location.href='./applications.html?id=${v.applicationId}'">View Applicant ${v.applicationId}</button>` : ""}
              <button class="btn" onclick="document.getElementById('moveStageSelect').focus()">Move Stage ▾</button>
              <button class="btn" onclick="createApplicationFrom('${v.id}')">+ Create Application</button>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
              <label class="small" style="font-weight:600">Move to stage</label>
              <select id="moveStageSelect" class="select" style="min-width:160px">
                ${STAGES.map((s) => `<option value="${s.key}" ${s.key === v.stage ? "selected" : ""}>${s.label}</option>`).join("")}
              </select>
              <button class="btn" id="btnDoMove">Apply</button>
            </div>
          </div>

          <div class="drawer-section">
            <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Stage Timeline</div>
            <div class="timeline">
              ${STAGES.map((s, i) => {
                const idx = STAGE_ORDER.indexOf(v.stage);
                const cur = i === idx;
                const done = i < idx;
                return `<div class="tl ${done ? "done" : ""} ${cur ? "active" : ""}"><div style="display:flex;justify-content:space-between"><b style="font-size:12px">${s.label}</b><span class="small muted">${cur ? v.daysInStage + " days here" : done ? "Done" : ""}</span></div><div class="small muted">${s.key === "VACANT" ? "Unit vacated – marketing prep" : s.key === "PUBLISHED" ? "Listed on portals – " + v.views + " views" : s.key === "ENQUIRY" ? "Active interest from " + v.lead : s.key === "VIEWING" ? "Viewing scheduled / conducted" : s.key === "APPLICATION" ? "Application paperwork received" : s.key === "KYC" ? "KYC / Committee review" : "Ready for offer / lease"}</div></div>`;
              }).join("")}
            </div>
          </div>

          <div class="drawer-section">
            <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Lead / Tenant</div>
            <div style="display:flex;gap:10px;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px;background:#FFF">
              <div style="width:36px;height:36px;border-radius:50%;background:#0F172A;color:#FFF;display:grid;place-items:center;font-weight:700">${v.lead[0]}</div>
              <div style="flex:1"><b style="font-size:13px">${v.lead}</b><div class="small muted">${v.leadType} • ${v.enquiries} enquiries • ${v.views} portal views</div></div>
              <button class="btn" onclick="toast('Contacting ${v.lead}...','')">Message</button>
            </div>
          </div>

          <div class="drawer-section">
            <div class="small muted">ID ${v.id} • Created ${v.createdAt} • PropertyPro Zambia Ltd • ZMW currency • User Chanda Mwanza – CM</div>
          </div>
        </div>
      `;
      $id("btnDoMove")?.addEventListener("click", () => {
        const newStage = $id("moveStageSelect").value;
        if (newStage && newStage !== v.stage) {
          v.stage = newStage;
          v.daysInStage = 1;
          state.vacancies = vacancies;
          saveState();
          renderKanban();
          renderTable();
          openVacancyDrawer(v.id);
          toast(`Moved to ${newStage}`, "success");
        }
      });
    }
    openDrawer();
  }
  window.createApplicationFrom = (vacId) => {
    const v = vacancies.find((x) => x.id === vacId);
    if (!v) return;
    const appId = "APP-" + Date.now().toString().slice(-5);
    // push to applications in state
    if (!state.applications) state.applications = [];
    state.applications.unshift({
      id: appId,
      tenant: v.lead,
      property: v.property,
      unit: v.unit,
      rent: v.rentRaw,
      status: "New",
      kyc: "1/5",
      stage: "New",
      applicant: v.lead,
    });
    saveState();
    toast(`Application ${appId} created for ${v.lead}`, "success");
    setTimeout(() => (location.href = `./applications.html?id=${appId}`), 700);
  };

  // Table rendering
  function renderTable() {
    if (!vacancyTableWrap) return;
    const rows = filteredVacancies();
    if (rows.length === 0) {
      vacancyTableWrap.innerHTML = `<div class="empty"><div class="big">∅</div><b>No vacancies match</b><div class="small">Try search or reset filters</div></div>`;
      return;
    }
    const cols = [
      "id",
      "unit",
      "property",
      "type",
      "area",
      "rent",
      "daysVacant",
      "stage",
      "assigned",
      "action",
    ];
    // Build table manual for rich cells
    let html = `<div class="table-wrap"><table><thead><tr>
      <th>Unit</th><th>Property</th><th>Type</th><th>Area</th><th>Asking Rent</th><th>Days Vacant</th><th>Stage</th><th>Assigned Agent</th><th>Action</th>
    </tr></thead><tbody>`;
    rows.forEach((v, i) => {
      html += `<tr data-id="${v.id}" style="cursor:pointer">
        <td><b>${v.unit}</b><div class="small muted">${v.id}</div></td>
        <td>${v.property}<div class="small muted">${v.city}</div></td>
        <td><span class="pill gray">${v.type}</span></td>
        <td>${v.area}m²</td>
        <td>ZMW ${v.rent}k</td>
        <td><span class="pill ${v.daysVacant > 30 ? "red" : v.daysVacant > 7 ? "amber" : "green"}">${v.daysVacant}d</span></td>
        <td><span class="pill ${v.stage === "VACANT" ? "gray" : v.stage === "PUBLISHED" ? "blue" : v.stage === "APPROVED" ? "green" : "amber"}">${v.stage}</span></td>
        <td>${v.assigned}</td>
        <td><button class="btn" data-act="view" data-id="${v.id}" style="height:28px">View</button></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    vacancyTableWrap.innerHTML = html;
    vacancyTableWrap.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => openVacancyDrawer(tr.dataset.id));
    });
    vacancyTableWrap
      .querySelectorAll('button[data-act="view"]')
      .forEach((b) => {
        b.addEventListener("click", (e) => {
          e.stopPropagation();
          openVacancyDrawer(b.dataset.id);
        });
      });
  }

  // Fill filter dropdowns options
  function populateFilterOptions() {
    const propSet = [...new Set(vacancies.map((v) => v.property))].sort();
    if (propFilter) {
      propFilter.innerHTML =
        `<option value="All">All Properties</option>` +
        propSet.map((p) => `<option value="${p}">${p}</option>`).join("");
    }
    const citySet = [...new Set(vacancies.map((v) => v.city))];
    if (cityFilter) {
      cityFilter.innerHTML =
        `<option value="All">All Cities</option>` +
        citySet.map((c) => `<option value="${c}">${c}</option>`).join("");
    }
  }

  // events
  searchMain?.addEventListener("input", (e) => {
    q = e.target.value;
    renderKanban();
    renderTable();
  });
  $id("fProperty")?.addEventListener("change", (e) => {
    filters.property = e.target.value;
    renderKanban();
    renderTable();
  });
  $id("fCity")?.addEventListener("change", (e) => {
    filters.city = e.target.value;
    renderKanban();
    renderTable();
  });
  $id("fStage")?.addEventListener("change", (e) => {
    filters.stage = e.target.value;
    renderKanban();
    renderTable();
  });
  $id("fRent")?.addEventListener("change", (e) => {
    filters.rent = e.target.value;
    renderKanban();
    renderTable();
  });
  $id("fDays")?.addEventListener("change", (e) => {
    filters.days = e.target.value;
    renderKanban();
    renderTable();
  });
  $id("btnResetFilters")?.addEventListener("click", () => {
    filters = {
      property: "All",
      city: "All",
      stage: "All",
      rent: "All",
      days: "All",
    };
    q = "";
    if (searchMain) searchMain.value = "";
    ["fProperty", "fCity", "fStage", "fRent", "fDays"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "All";
    });
    renderKanban();
    renderTable();
    toast("Filters reset", "");
  });

  // Publish modal
  const pubBackdrop = $id("publishBackdrop");
  $id("btnPublishVacancy")?.addEventListener("click", () => {
    pubBackdrop?.classList.add("open");
  });
  $id("btnClosePublish")?.addEventListener("click", () =>
    pubBackdrop?.classList.remove("open"),
  );
  pubBackdrop?.addEventListener("click", (e) => {
    if (e.target === pubBackdrop) pubBackdrop.classList.remove("open");
  });
  $id("publishForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const prop = $id("pubProperty").value;
    const unit = $id("pubUnit").value.trim() || "Unit New";
    const area = parseInt($id("pubArea").value) || 80;
    const rent = parseInt($id("pubRent").value) || 50;
    const city = $id("pubCity").value || "Lusaka";
    const type = $id("pubType").value || "Retail";
    const agent = $id("pubAgent").value || "Mutale Phiri";
    const newVac = {
      id: `V-${String(vacancies.length + 1).padStart(3, "0")}`,
      unit,
      unitId: unit.replace(/\W/g, ""),
      property: prop || state.properties[0]?.name || "Zambezi Mall",
      city,
      type,
      area,
      rent,
      rentRaw: rent * 1000,
      stage: "VACANT",
      lead: "To be marketed",
      leadType: "Vacant",
      daysInStage: 1,
      daysVacant: 1,
      views: 0,
      enquiries: 0,
      agent,
      assigned: agent,
      applicationId: null,
      createdAt: new Date().toISOString().slice(0, 10),
      priority: rent > 80 ? "High" : "Medium",
    };
    vacancies.unshift(newVac);
    state.vacancies = vacancies;
    saveState();
    populateFilterOptions();
    renderKanban();
    renderTable();
    pubBackdrop?.classList.remove("open");
    toast(
      `Vacancy ${newVac.id} published – ${newVac.property} • ${newVac.unit}`,
      "success",
    );
    e.target.reset();
  });

  $id("btnExportVacancies")?.addEventListener("click", () => {
    const rows = filteredVacancies();
    let csv =
      "ID,Unit,Property,City,Type,Area,Rent_k,DaysVacant,Stage,Agent,Lead,Views\n";
    rows.forEach((r) => {
      csv += `${r.id},${r.unit},"${r.property}",${r.city},${r.type},${r.area},${r.rent},${r.daysVacant},${r.stage},${r.assigned},"${r.lead}",${r.views}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Vacancies.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Vacancies exported", "success");
  });

  // init
  populateFilterOptions();
  renderKanban();
  renderTable();

  // query param ?id=V-001 open drawer ?unit etc handled by table but add
  const qp = new URLSearchParams(location.search);
  const vid = qp.get("id") || qp.get("vacancy");
  if (vid) {
    const f = vacancies.find((v) => v.id === vid || v.unitId === vid);
    if (f) setTimeout(() => openVacancyDrawer(f.id), 400);
  }
});


// [Debug] Page loaded: js/pages/marketing.js
console.log('[Page:js/pages/marketing.js] Loaded with breadcrumb fix and search/notif support');

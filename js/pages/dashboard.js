/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/dashboard.js
 * ============================================================================
 * PURPOSE:
 *   Page logic for dashboard.js - handles filtering, rendering,
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
  initCommon("dashboard");
  const stateRef = window.state;

  // Greeting logic
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const greetEl = document.getElementById("greetingText");
  if (greetEl) greetEl.textContent = `${greet}, Chanda`;

  // Chart data
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
  ];
  const datasets = {
    occupancy: {
      label: "Occupancy %",
      data: [71, 74, 77, 79, 81, 83, 82, 84, 83],
      unit: "%",
      color: "#2563EB",
      fill: "rgba(37,99,235,.18)",
    },
    noi: {
      label: "NOI (ZMW M)",
      data: [6.2, 6.8, 7.1, 7.4, 7.8, 8.1, 8.0, 8.23, 8.23],
      unit: "M",
      color: "#16A34A",
      fill: "rgba(22,163,74,.16)",
    },
    rental: {
      label: "Rental Income (ZMW M)",
      data: [10.2, 10.8, 11.3, 11.9, 12.1, 12.35, 12.28, 12.48, 12.48],
      unit: "M",
      color: "#D97706",
      fill: "rgba(217,119,6,.14)",
    },
    value: {
      label: "Portfolio Value (ZMW M)",
      data: [452, 462, 468, 474, 480, 483, 485, 486.4, 486.4],
      unit: "M",
      color: "#0F172A",
      fill: "rgba(15,23,42,.08)",
    },
  };
  let activeMetric = "occupancy";

  function renderLineChart(containerId, metricKey) {
    const ds = datasets[metricKey];
    const W = 640,
      H = 280,
      P = { t: 24, r: 16, b: 36, l: 48 };
    const w = W - P.l - P.r,
      h = H - P.t - P.b;
    const data = ds.data;
    const min = Math.min(...data) * 0.92;
    const max = Math.max(...data) * 1.06;
    const x = (i) => P.l + (i / (data.length - 1)) * w;
    const y = (v) => P.t + (1 - (v - min) / (max - min)) * h;
    const path = data
      .map(
        (v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(v).toFixed(2)}`,
      )
      .join(" ");
    const area = `M${x(0)},${y(data[0])} ${data.map((v, i) => `L${x(i)},${y(v)}`).join(" ")} L${x(data.length - 1)},${P.t + h} L${x(0)},${P.t + h} Z`;
    const gridLines = [0, 0.25, 0.5, 0.75, 1]
      .map((t) => {
        const yy = P.t + h * t;
        return `<line x1="${P.l}" x2="${P.l + w}" y1="${yy}" y2="${yy}" stroke="#EEF2F7" stroke-width="1" stroke-dasharray="${t === 0 || t === 1 ? "0" : "0"}"/>`;
      })
      .join("");
    const yLabels = [0, 0.5, 1]
      .map((t) => {
        const val = max - t * (max - min);
        const yy = P.t + h * t;
        let lab = val.toFixed(metricKey === "occupancy" ? 0 : 1);
        if (metricKey !== "occupancy") lab = "ZMW " + lab + "M";
        else lab = lab + "%";
        return `<text x="${P.l - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#94A3B8" font-weight="600">${lab}</text>`;
      })
      .join("");
    const dots = data
      .map(
        (v, i) =>
          `<circle class="chart-dot" data-idx="${i}" data-val="${v}" cx="${x(i)}" cy="${y(v)}" r="4.2" fill="#FFF" stroke="${ds.color}" stroke-width="2.4" style="cursor:pointer;transition:r .15s"/>`,
      )
      .join("");
    const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${ds.label} trend Jan to Sep"><defs><linearGradient id="grad-${metricKey}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${ds.color}" stop-opacity=".28"/><stop offset="100%" stop-color="${ds.color}" stop-opacity="0"/></linearGradient></defs>${gridLines}<path d="${area}" fill="url(#grad-${metricKey})" class="area-fade"/><path d="${path}" fill="none" stroke="${ds.color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" class="path-draw"/><g>${dots}</g><g font-size="11" font-weight="600" fill="#64748B">${months.map((m, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${m}</text>`).join("")}</g><g>${yLabels}</g></svg>`;
    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = svg;
      // tooltip handling
      const tooltip = document.getElementById("chartTooltip");
      const wrap = el;
      wrap.querySelectorAll(".chart-dot").forEach((dot) => {
        dot.addEventListener("mouseenter", (e) => {
          const idx = dot.getAttribute("data-idx");
          const val = dot.getAttribute("data-val");
          const month = months[idx];
          dot.setAttribute("r", "6");
          if (tooltip) {
            tooltip.innerHTML = `<div class="tt-lbl">${month} • ${ds.label}</div><div class="tt-val">${metricKey === "occupancy" ? val + "%" : "ZMW " + val + "M"}</div>`;
            const rect = wrap.getBoundingClientRect();
            const cx = parseFloat(dot.getAttribute("cx"));
            // convert svg coords to pixel approx
            const px = (cx / W) * wrap.clientWidth;
            const py = (parseFloat(dot.getAttribute("cy")) / H) * H;
            tooltip.style.left = px + "px";
            tooltip.style.top = py - 10 + "px";
            tooltip.classList.add("show");
          }
        });
        dot.addEventListener("mouseleave", () => {
          dot.setAttribute("r", "4.2");
          const tooltip = document.getElementById("chartTooltip");
          if (tooltip) tooltip.classList.remove("show");
        });
      });
    }
  }

  function switchMetric(key) {
    activeMetric = key;
    document.querySelectorAll(".chart-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.metric === key);
    });
    renderLineChart("portfolioPerformanceChart", key);
  }

  // initial render
  renderLineChart("portfolioPerformanceChart", activeMetric);
  document.querySelectorAll(".chart-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchMetric(tab.dataset.metric));
  });

  // Donut composition
  function renderDonut() {
    const items = [
      { label: "Retail", value: 38, color: "#2563EB" },
      { label: "Residential", value: 22, color: "#16A34A" },
      { label: "Commercial", value: 20, color: "#0F172A" },
      { label: "Industrial", value: 14, color: "#D97706" },
      { label: "Mixed-Use", value: 6, color: "#94A3B8" },
    ];
    const total = items.reduce((s, i) => s + i.value, 0);
    let acc = 0;
    const R = 72,
      r = 48,
      cx = 86,
      cy = 86;
    const arcs = items
      .map((it) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += it.value;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const large = end - start > Math.PI ? 1 : 0;
        const x1 = cx + R * Math.cos(start),
          y1 = cy + R * Math.sin(start);
        const x2 = cx + R * Math.cos(end),
          y2 = cy + R * Math.sin(end);
        const x3 = cx + r * Math.cos(end),
          y3 = cy + r * Math.sin(end);
        const x4 = cx + r * Math.cos(start),
          y4 = cy + r * Math.sin(start);
        return `<path class="donut-seg" data-type="${it.label}" d="M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4} Z" fill="${it.color}" style="cursor:pointer;transition:opacity .15s, transform .15s;transform-origin:${cx}px ${cy}px" onmouseover="this.style.opacity=.9; this.style.transform='scale(1.04)'" onmouseout="this.style.opacity=1; this.style.transform='scale(1)'" onclick="location.href='pages/property-register.html?type=${it.label}'"/>`;
      })
      .join("");
    const legend = items
      .map(
        (it) =>
          `<div class="legend-row" onclick="location.href='pages/property-register.html?type=${it.label}'"><i style="background:${it.color}"></i><span class="l">${it.label}</span><span class="v">${it.value}%</span></div>`,
      )
      .join("");
    const el = document.getElementById("portfolioComposition");
    if (el)
      el.innerHTML = `<div class="donut-wrap"><svg class="donut-svg" viewBox="0 0 172 172"><g>${arcs}</g><circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="#FFF"/><text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="20" font-weight="800" fill="#0F172A">28</text><text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="10" font-weight="700" letter-spacing=".06em" fill="#64748B">PROPERTIES</text></svg><div class="donut-legend">${legend}<div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);font-size:11px;color:var(--muted)">Click category to filter register →</div></div></div>`;
  }
  renderDonut();

  // Map pins - 6 pins for Lusaka Ndola Chipata Kabwe
  function renderMap() {
    const pins = [
      {
        x: 44,
        y: 58,
        label: "ZM • Lusaka",
        name: "Zambezi Mall",
        city: "Lusaka",
        type: "Retail",
        active: true,
      },
      {
        x: 56,
        y: 48,
        label: "RA • Lusaka",
        name: "Riverside Apartments",
        city: "Lusaka",
        type: "Residential",
      },
      {
        x: 32,
        y: 70,
        label: "KA • Kabwe",
        name: "Kabwe Retail Centre",
        city: "Kabwe",
        type: "Retail",
      },
      {
        x: 72,
        y: 32,
        label: "AT • Lusaka",
        name: "Arcades Office Tower",
        city: "Lusaka",
        type: "Commercial",
      },
      {
        x: 64,
        y: 62,
        label: "MB • Ndola",
        name: "Mukuba Business Park",
        city: "Ndola",
        type: "Mixed-Use",
      },
      {
        x: 84,
        y: 40,
        label: "CI • Chipata",
        name: "Chipata Industrial Park",
        city: "Chipata",
        type: "Industrial",
      },
    ];
    const el = document.getElementById("portfolioMap");
    if (!el) return;
    el.innerHTML = `
      <div class="map-bg">
        <svg viewBox="0 0 400 320" width="100%" height="100%" preserveAspectRatio="none" style="opacity:.18">
          <path d="M120 60 L 280 70 L 300 160 L 260 240 L 140 220 L 100 140 Z" fill="#EFF6FF" stroke="#CBD5E1" stroke-width="1.2" stroke-dasharray="6 6"/>
          <circle cx="180" cy="110" r="2" fill="#94A3B8"/><circle cx="220" cy="140" r="2" fill="#94A3B8"/><circle cx="160" cy="170" r="2" fill="#94A3B8"/>
        </svg>
      </div>
      <div class="map-gridlines"></div>
      ${pins.map((p) => `<div class="map-pin ${p.active ? "active" : ""}" style="left:${p.x}%;top:${p.y}%" data-prop="${p.name}" onclick="openProperty('${p.name}')"><span class="pin-dot"></span>${p.label}</div>`).join("")}
      <div class="map-overlay"><strong>Portfolio Map • 28 properties</strong><br><span class="muted">Lusaka (16) • Ndola (5) • Kabwe (3) • Chipata (4) • <a href="pages/portfolio-map.html" style="color:var(--blue);font-weight:700">Expand map →</a></span></div>
    `;
  }
  renderMap();

  // Attention Required
  function renderAttention() {
    const el = document.getElementById("attentionList");
    if (!el) return;
    const colorMap = { amber: "amber", red: "red", blue: "blue", gray: "gray" };
    el.innerHTML =
      stateRef.attention
        .map(
          (a) => `
      <div class="attention-item" onclick="goToPage('${a.page}')">
        <div class="count ${a.dot}">${a.count}</div>
        <div class="main"><div class="title">${a.label}</div><div class="desc">${a.desc}</div><div class="link">${a.action} →</div></div>
        <div style="color:var(--muted-2)">›</div>
      </div>
    `,
        )
        .join("") +
      `<div style="padding:10px 16px;border-top:1px solid var(--border);background:var(--surface-2);display:flex;justify-content:space-between;align-items:center"><span class="small muted">${stateRef.attention.reduce((s, i) => s + i.count, 0)} items require action</span><button class="btn" style="height:30px" onclick="goToPage('reports')">View Reports</button></div>`;
    const countEl = document.querySelector("[data-attention-count]");
    if (countEl) countEl.textContent = `${stateRef.attention.length} critical`;
  }
  renderAttention();

  // Recent Activity
  function renderActivity() {
    const el = document.getElementById("recentActivity");
    if (!el) return;
    el.innerHTML = stateRef.activity
      .map(
        (a) => `
      <div class="tl-item ${a.type}">
        <div class="time">${a.time}</div>
        <div class="content"><div class="ttl">${a.title}</div><div class="det">${a.desc}</div></div>
      </div>
    `,
      )
      .join("");
  }
  renderActivity();

  // Tables
  const leaseCols = [
    "Tenant",
    "Property",
    "Lease",
    "Status",
    "Expiry",
    "Rent",
    "Action",
  ];
  const leaseRows = stateRef.leases.map((l) => ({
    Tenant: l.tenant,
    Property: l.property.split(" / ")[0],
    Lease: l.id,
    Status: l.status,
    Expiry: l.expiry || l.end,
    Rent: l.rent,
    Action: "View →",
    _raw: l,
  }));
  renderTable("#leaseActivityTable", leaseRows, leaseCols, {
    money: ["Rent"],
    onClick: (row) => {
      openLease(row._raw);
    },
    custom: {
      Action: (v) =>
        `<span style="color:var(--blue);font-weight:700">${v}</span>`,
    },
  });

  // Arrears Aging
  const arrearsCols = [
    "Tenant",
    "Current",
    "31-60",
    "61-90",
    "90+",
    "Total",
    "Risk",
  ];
  const arrearsRows = stateRef.tenants
    .filter((t) => t.total > 0)
    .map((t) => ({
      Tenant: t.name,
      Current: t.current,
      "31-60": t["31-60"],
      "61-90": t["61-90"],
      "90+": t["90+"],
      Total: t.total,
      Risk: t.risk,
      _raw: t,
    }));
  renderTable("#arrearsAgingTable", arrearsRows, arrearsCols, {
    money: ["Current", "31-60", "61-90", "90+", "Total"],
    onClick: (row) => openTenant(row._raw),
  });

  // Maintenance SLA
  const maintCols = [
    "Request",
    "Property",
    "Priority",
    "Assigned",
    "SLA",
    "Status",
  ];
  const maintRows = stateRef.maintenance.map((m) => ({
    Request: m.id,
    Property: m.property,
    Priority: m.priority,
    Assigned: m.assigned,
    SLA: m.sla,
    Status: m.status,
    _raw: m,
  }));
  renderTable("#maintenanceSLATable", maintRows, maintCols, {
    onClick: (row) => {
      const r = row._raw;
      openDrawer(
        r.id,
        `${r.property} • ${r.cat} • SLA ${r.sla}`,
        `
        <div class="tabs"><div class="tab active">Overview</div><div class="tab">Timeline</div><div class="tab">Contractor</div></div>
        <div style="margin-top:12px" class="stat-grid"><div class="mini-kpi"><div class="l">Priority</div><div class="v">${r.priority}</div></div><div class="mini-kpi"><div class="l">SLA</div><div class="v">${r.sla}</div></div><div class="mini-kpi"><div class="l">Contractor</div><div class="v">${r.contractor}</div></div></div>
        <div style="margin-top:16px;display:flex;gap:8px"><button class="btn btn-primary" onclick="goToPage('maintenance')">Open Work Order</button><button class="btn" onclick="toast('Assigned to ${r.contractor}','success')">Reassign</button></div>
      `,
      );
    },
  });

  // Quick Actions handlers
  window.handleQuickAction = (action) => {
    switch (action) {
      case "add-property":
        location.href = "pages/add-property.html";
        break;
      case "create-lease":
        location.href = "pages/leases.html?create=1";
        break;
      case "record-payment":
        location.href = "pages/payments.html?record=1";
        break;
      case "create-maintenance":
        openDrawer("New Maintenance Request", "Create work order", {
          body: `
          <form id="quickMaintForm" class="stack" style="gap:12px">
            <div class="form-group"><label class="form-label">Property</label><select class="form-input select" required><option>Zambezi Mall</option><option>Arcades Office Tower</option><option>Riverside Apartments</option><option>Kabwe Retail Centre</option></select></div>
            <div class="form-group"><label class="form-label">Category</label><select class="form-input select"><option>HVAC</option><option>Plumbing</option><option>Electrical</option><option>Access Control</option></select></div>
            <div class="form-group"><label class="form-label">Priority</label><select class="form-input select"><option>Normal</option><option>High</option><option>Critical</option></select></div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" placeholder="Describe issue..."></textarea></div>
            <button class="btn btn-primary" type="submit">Create Request</button>
          </form>`,
        });
        setTimeout(() => {
          const f = document.getElementById("quickMaintForm");
          if (f)
            f.addEventListener("submit", (e) => {
              e.preventDefault();
              closeDrawer();
              toast(
                "Maintenance MNT-00" +
                  (383 + Math.floor(Math.random() * 10)) +
                  " created",
                "success",
              );
              stateRef.maintenance.unshift({
                id: "MNT-00" + Math.floor(Math.random() * 1000),
                property: "Zambezi Mall",
                priority: "High",
                assigned: "Unassigned",
                sla: "12h left",
                status: "Reported",
              });
              saveState();
            });
        }, 100);
        break;
      case "generate-report":
        location.href = "pages/reports.html";
        break;
      case "create-notice":
        openDrawer("Create Notice", "Notice to tenants", {
          body: `
          <form id="quickNoticeForm" class="stack" style="gap:12px">
            <div class="form-group"><label class="form-label">Notice Type</label><select class="form-input select"><option>Rent Escalation</option><option>Maintenance</option><option>Lease Renewal</option><option>Eviction</option></select></div>
            <div class="form-group"><label class="form-label">Property</label><select class="form-input select"><option>Zambezi Mall</option><option>All Properties</option></select></div>
            <div class="form-group"><label class="form-label">Message</label><textarea class="form-textarea" placeholder="Notice body...">Dear tenant, This is to notify...</textarea></div>
            <button class="btn btn-primary" type="submit">Send Notice</button>
          </form>`,
        });
        setTimeout(() => {
          const f = document.getElementById("quickNoticeForm");
          if (f)
            f.addEventListener("submit", (e) => {
              e.preventDefault();
              closeDrawer();
              toast("Notice queued for delivery", "success");
            });
        }, 100);
        break;
    }
  };

  // Override openDrawer to support html string body for quick actions
  const _openDrawer = window.openDrawer;
  window.openDrawer = function (title, subtitle, body) {
    if (typeof body === "object" && body.body) {
      body = body.body;
    }
    _openDrawer(title, subtitle, body);
  };

  // Fix drawer close on overlay? Already handled

  // KPIs clickable already handled via onclick in HTML? we'll add listeners
  document.querySelectorAll("[data-kpi-target]").forEach((el) => {
    el.addEventListener("click", () => goToPage(el.dataset.kpiTarget));
  });

  // Export & Reports buttons handled in HTML inline

  // Notifications rendering
  function renderNotifications() {
    const notifPanelBody = document.getElementById("notifBody");
    if (!notifPanelBody) return;
    const notifs = [
      {
        type: "arrears",
        title: "12 leases expiring in 30 days",
        sub: "Bata Zambia • 15 Oct • Action required",
        icon: "📄",
      },
      {
        type: "maintenance",
        title: "7 SLA breaches",
        sub: "MNT-00381 Breached 1d ago",
        icon: "🔧",
      },
      {
        type: "payment",
        title: "Payment overdue Kabwelwa",
        sub: "ZMW 85k • 14 days overdue",
        icon: "💳",
      },
      {
        type: "insurance",
        title: "Insurance POL-042 expiring",
        sub: "Arcades Office Tower • 15 Oct",
        icon: "🛡",
      },
    ];
    notifPanelBody.innerHTML = notifs
      .map(
        (n) =>
          `<div class="notif-item"><div class="ico">${n.icon}</div><div class="txt"><div class="t">${n.title}</div><div class="s">${n.sub}</div></div></div>`,
      )
      .join("");
  }
  renderNotifications();

  // Make all buttons work - prevent dead UI
  document.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    // if button has no handler and is not submit, toast
    // avoid double toast for known buttons
    if (
      t.id === "btnNotif" ||
      t.id === "btnToggleSidebar" ||
      t.id === "btnSearchOpen"
    )
      return;
  });

  const searchBtn = document.getElementById("btnSearchOpen");
  if (searchBtn) searchBtn.addEventListener("click", () => openSearch());
});

// helpers for drawer html override
function html(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (vals[i] || ""), "");
}

// ==== INVESTMENT INTEGRATION - Property Dashboard Investment Snapshot ====
(function addInvestmentSnapshot() {
  function ensureInvestmentSection() {
    const content = document.querySelector(".content");
    if (!content) return;
    if (document.getElementById("portfolioInvestmentSnapshot")) return;
    const existingSplit = document.querySelector(".section-split");
    const card = document.createElement("div");
    card.className = "card";
    card.id = "portfolioInvestmentSnapshot";
    card.style.cssText = "margin-top:16px";
    card.innerHTML = `
      <div class="card-head"><h3>Portfolio Investment Snapshot</h3><div style="display:flex;gap:8px"><span class="pill blue">Property ↔ Investment</span><button class="btn" onclick="goToPage('investment-dashboard')">View Investment Dashboard →</button></div></div>
      <div class="card-body">
        <div class="kpi-grid secondary" id="investmentSnapshotKpis" style="grid-template-columns:repeat(4,1fr)"></div>
        <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><h4 style="margin:0 0 8px;font-size:12px">Property Contribution to Fund</h4><div id="propContributionList"></div></div>
          <div><h4 style="margin:0 0 8px;font-size:12px">Linked Assets</h4><div id="linkedAssetsList"></div></div>
        </div>
        <div style="margin-top:12px;padding:10px;background:#F8FAFC;border:1px solid #F1F5F9;border-radius:8px;font-size:12px;line-height:1.5"><b>Integrated Flow:</b> Property Management (rent ZMW ${(state.properties || []).reduce((s, p) => s + (p.rent || 0), 0).toFixed(1)}M/mo, occupancy ${Math.round(((state.properties || []).reduce((s, p) => s + (p.occupied || 0), 0) / (state.properties || []).reduce((s, p) => s + (p.units || 0), 0)) * 100) || 83}%) → Investment Assets → Portfolio Performance → Fund Reporting. Click any property to see its investment tab.</div>
      </div>
    `;
    // Insert after first section-split or at end of page
    const page = document.getElementById("view-dashboard");
    if (page) {
      const after = page.querySelector(".section-split");
      if (after && after.parentNode) {
        after.parentNode.insertBefore(card, after.nextSibling);
      } else {
        page.appendChild(card);
      }
    }
    renderInvestmentSnapshot();
  }

  function renderInvestmentSnapshot() {
    const kpiEl = document.getElementById("investmentSnapshotKpis");
    if (!kpiEl) return;
    const propAssets = (state.investmentAssets || []).filter(
      (a) => a.assetClass === "Property",
    );
    const totalPropVal = propAssets.reduce(
      (s, a) => s + (a.currentValue || 0),
      0,
    );
    const totalNOI = propAssets.reduce((s, a) => s + (a.noi || 0), 0);
    const avgYield = totalPropVal ? (totalNOI / totalPropVal) * 100 : 0;
    const totalAlloc = propAssets.length
      ? (totalPropVal /
          (state.investmentAssets || []).reduce(
            (s, a) => s + (a.currentValue || 0),
            0,
          )) *
        100
      : 0;
    const valuationChange = propAssets.reduce(
      (s, a) => s + (a.unrealizedGain || 0),
      0,
    );
    const fm = state.financeMetrics || {};
    const invoices = state.invoices || [];
    const payments = state.payments || [];
    const totalInvoicedLive =
      fm.totalInvoiced || invoices.reduce((s, i) => s + (i.amount || 0), 0);
    const totalCollectedLive =
      fm.totalCollected ||
      invoices
        .filter((i) => i.status === "Paid")
        .reduce((s, i) => s + (i.amount || 0), 0) +
        payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalOutstandingLive =
      fm.totalOutstanding ||
      invoices
        .filter((i) => i.status !== "Paid")
        .reduce((s, i) => s + (i.outstandingAmount || 0), 0);
    const collectionRateLive =
      fm.collectionRate ||
      (totalInvoicedLive ? (totalCollectedLive / totalInvoicedLive) * 100 : 0);
    kpiEl.innerHTML = `
      <div class="kpi" style="background:#EFF6FF;border-color:#BFDBFE"><div class="kpi-label" style="color:#1D4ED8">Total Property Investment Value</div><div class="kpi-value">ZMW ${(totalPropVal / 1_000_000).toFixed(1)}M</div><div class="kpi-foot">${propAssets.length} assets • ${totalAlloc.toFixed(1)}% of total</div></div>
      <div class="kpi"><div class="kpi-label">Property Allocation</div><div class="kpi-value">${totalAlloc.toFixed(1)}%</div><div class="kpi-foot">Target 20% • ${totalAlloc > 25 ? "BREACH" : totalAlloc > 22 ? "Approaching" : "Within range"}</div></div>
      <div class="kpi"><div class="kpi-label">Property Yield</div><div class="kpi-value">${avgYield.toFixed(2)}%</div><div class="kpi-foot">NOI ZMW ${(totalNOI / 1_000_000).toFixed(1)}M</div></div>
      <div class="kpi"><div class="kpi-label">Valuation Change</div><div class="kpi-value" style="color:${valuationChange >= 0 ? "#16A34A" : "#DC2626"}">${valuationChange >= 0 ? "+" : ""}ZMW ${(valuationChange / 1_000_000).toFixed(1)}M</div><div class="kpi-foot">Unrealized gain/loss</div></div>
      <div class="kpi" style="background:#F0FDF4;border-color:#BBF7D0"><div class="kpi-label" style="color:#15803D">Total Invoiced (Finance)</div><div class="kpi-value">ZMW ${(totalInvoicedLive / 1_000_000).toFixed(2)}M</div><div class="kpi-foot">${invoices.length} invoices • Auto-synced from Billing</div></div>
      <div class="kpi" style="background:#F0FDF4;border-color:#BBF7D0"><div class="kpi-label" style="color:#15803D">Collections & Receipts</div><div class="kpi-value">ZMW ${(totalCollectedLive / 1_000_000).toFixed(2)}M</div><div class="kpi-foot">${collectionRateLive.toFixed(1)}% collection rate • ${payments.length} receipts</div></div>
      <div class="kpi" style="background:#FEF2F2;border-color:#FECACA"><div class="kpi-label" style="color:#B91C1C">Outstanding Arrears</div><div class="kpi-value">ZMW ${(totalOutstandingLive / 1_000_000).toFixed(2)}M</div><div class="kpi-foot">From ${invoices.filter((i) => i.outstandingAmount > 0).length} open invoices • Updates on saveState</div></div>
      <div class="kpi"><div class="kpi-label">Last Finance Sync</div><div class="kpi-value" style="font-size:14px">${fm.lastUpdated ? new Date(fm.lastUpdated).toLocaleString("en-GB") : "Just now"}</div><div class="kpi-foot">propertypro_v3 • ${window.goToPage ? '<a href="#" onclick="event.preventDefault(); goToPage(\'finance-billing\')" style="color:#2563EB">Billing</a> • <a href="#" onclick="event.preventDefault(); goToPage(\'finance-arrears\')" style="color:#2563EB">Arrears</a>' : ""}</div></div>
    `;
    const contribEl = document.getElementById("propContributionList");
    if (contribEl) {
      const funds = state.funds || [];
      contribEl.innerHTML = funds
        .map((f) => {
          const fPropAssets = propAssets.filter((a) => a.fundId === f.id);
          const fVal = fPropAssets.reduce(
            (s, a) => s + (a.currentValue || 0),
            0,
          );
          const fNOI = fPropAssets.reduce((s, a) => s + (a.noi || 0), 0);
          return `<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between"><div><b style="font-size:12px">${f.name}</b><div style="font-size:11px;color:var(--muted)">${fPropAssets.length} properties • ZMW ${(fVal / 1_000_000).toFixed(1)}M</div></div><div style="text-align:right"><div style="font-weight:700;font-size:12px">ZMW ${(fNOI / 1_000_000).toFixed(2)}M NOI</div><div style="font-size:11px;color:#1D4ED8">${fVal ? ((fNOI / fVal) * 100).toFixed(2) + "% yield" : ""}</div></div></div>`;
        })
        .join("");
    }
    const linkedEl = document.getElementById("linkedAssetsList");
    if (linkedEl) {
      linkedEl.innerHTML =
        propAssets
          .slice(0, 5)
          .map(
            (a) =>
              `<div style="padding:8px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;cursor:pointer" onclick="goToPage('investment-assets.html?id=${a.id}')"><div><b style="font-size:12px">${a.name}</b><div style="font-size:11px;color:var(--muted)">${a.id} • ${a.fundId}</div></div><div style="font-size:11px;font-weight:700">ZMW ${(a.currentValue / 1_000_000).toFixed(1)}M<br><span style="color:#16A34A">${a.yield}%</span></div></div>`,
          )
          .join("") +
        `<div style="margin-top:8px"><button class="btn" style="width:100%" onclick="goToPage('investment-assets.html?assetClass=Property')">View all ${propAssets.length} property assets →</button></div>`;
    }
  }

  // Run after DOM ready and after common init
  setTimeout(ensureInvestmentSection, 600);
  setTimeout(renderInvestmentSnapshot, 800);

  // Listen to cross-tab and same-tab finance updates
  window.addEventListener("storage", function (e) {
    if (e.key === "propertypro_v3" || e.key === "propertypro_v2") {
      try {
        const newState = JSON.parse(e.newValue || "{}");
        window.state = newState;
        setTimeout(renderInvestmentSnapshot, 100);
      } catch (err) {}
    }
  });
  window.addEventListener("propertypro:stateUpdated", function (e) {
    try {
      if (e.detail) {
        window.state = e.detail;
        // Merge finance metrics into state
        if (e.detail.financeMetrics) {
          window.state.financeMetrics = e.detail.financeMetrics;
        }
      }
      setTimeout(renderInvestmentSnapshot, 100);
    } catch (err) {}
  });

  // Re-render on state change
  const origSave = window.saveState;
  if (origSave) {
    window.saveState = function () {
      origSave();
      setTimeout(renderInvestmentSnapshot, 200);
    };
  }
})();

// [Debug] Page loaded: js/pages/dashboard.js
console.log(
  "[Page:js/pages/dashboard.js] Loaded with breadcrumb fix and search/notif support",
);

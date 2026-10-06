/**
 * Leases Page - PropertyPro Zambia Ltd v3
 * Operational lease administration with rent reviews, escalations, renewal, termination
 */

(function () {
  let filtered = [];
  let currentPage = 1;
  let pageSize = 50;
  let selectedId = null;
  let currentTab = "overview";
  let editingId = null;
  let currentReviewLeaseId = null;
  let currentReviewId = null;
  let currentTerminationLeaseId = null;

  const LEASE_TYPES = [
    "Retail",
    "Commercial",
    "Residential",
    "Industrial",
    "Mixed-Use",
  ];
  const LEASE_STATUSES = [
    "Draft",
    "Pending Approval",
    "Active",
    "Expiring Soon",
    "Expired",
    "Terminated",
    "Renewed",
  ];
  const RENEWAL_STATUSES = ["Not Due", "Due Soon", "Pending", "Renewed"];
  const ESCALATION_TYPES = ["Annual", "Percentage", "Fixed Amount", "Custom"];
  const REVIEW_METHODS = [
    "CPI",
    "Fixed Percentage",
    "Market Review",
    "Negotiated",
  ];
  const REVIEW_STATUSES = [
    "Scheduled",
    "Proposed",
    "Pending Approval",
    "Approved",
    "Applied",
  ];

  function getState() {
    return window.state || {};
  }
  function getLeases() {
    return getState().leases || [];
  }
  function getTenants() {
    return getState().tenants || [];
  }
  function getProps() {
    return getState().properties || [];
  }
  function getUnits() {
    return getState().units || [];
  }
  function getApps() {
    return getState().applications || [];
  }

  function fmtMoney(v) {
    return "ZMW " + Number(v || 0).toLocaleString("en-ZM");
  }
  function fmtDate(d) {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      return isNaN(dt)
        ? d
        : dt.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
    } catch {
      return d;
    }
  }
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr) - new Date();
    return Math.floor(diff / (24 * 3600 * 1000));
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.initCommon && window.initCommon("leases");
    populateFilters();
    bindEvents();
    // Query params
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const tenant = params.get("tenant");
    const property = params.get("property");
    const unit = params.get("unit");
    const application = params.get("application");
    if (property) document.getElementById("filterProperty").value = property;
    if (tenant) document.getElementById("filterTenant").value = tenant;
    if (id) setTimeout(() => openDrawer(id), 400);
    else {
      if (property || tenant) applyFilters();
      else applyFilters();
      // If creating from application/tenant, open modal prefilled
      if (application || tenant || params.get("create") === "1") {
        const prefill = {};
        if (tenant) prefill.tenantId = tenant;
        if (property) prefill.propertyId = property;
        if (application) prefill.applicationId = application;
        setTimeout(() => openLeaseModal(null, prefill), 500);
      }
    }
    if (unit) {
      /* filter by unit handled in applyFilters */
    }
  });

  function populateFilters() {
    const propSelect = document.getElementById("filterProperty");
    const tenantSelect = document.getElementById("filterTenant");
    const props = getProps();
    const tenants = getTenants();
    propSelect.innerHTML =
      '<option value="">All Properties</option>' +
      props
        .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
        .join("");
    tenantSelect.innerHTML =
      '<option value="">All Tenants</option>' +
      tenants
        .map(
          (t) =>
            `<option value="${t.id}">${escapeHtml(t.name)} (${t.id})</option>`,
        )
        .join("");
  }

  function bindEvents() {
    document
      .getElementById("searchInputLocal")
      ?.addEventListener("input", debounce(applyFilters, 300));
    [
      "filterProperty",
      "filterTenant",
      "filterStatus",
      "filterLeaseType",
      "filterRenewal",
      "filterRent",
      "filterStartDate",
      "filterExpiryDate",
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", applyFilters);
    });
    document
      .getElementById("btnResetFilters")
      ?.addEventListener("click", resetFilters);
    document
      .getElementById("btnExportLeases")
      ?.addEventListener("click", exportLeases);
    document
      .getElementById("btnNewLease")
      ?.addEventListener("click", () => openLeaseModal());
    document.getElementById("pageSize")?.addEventListener("change", (e) => {
      pageSize = parseInt(e.target.value);
      currentPage = 1;
      renderTable();
    });
    document.getElementById("prevPage")?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
    document.getElementById("nextPage")?.addEventListener("click", () => {
      const max = Math.ceil(filtered.length / pageSize);
      if (currentPage < max) {
        currentPage++;
        renderTable();
      }
    });
    document
      .getElementById("btnCloseDrawer")
      ?.addEventListener("click", closeDrawer);
    document
      .getElementById("drawerBackdrop")
      ?.addEventListener("click", closeDrawer);
    document.querySelectorAll(".drawer-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".drawer-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentTab = tab.dataset.tab;
        if (selectedId) renderDrawerBody(selectedId);
      });
    });
    // Lease modal
    document
      .getElementById("btnCloseLeaseModal")
      ?.addEventListener("click", closeLeaseModal);
    document
      .getElementById("btnCancelLeaseModal")
      ?.addEventListener("click", closeLeaseModal);
    document
      .getElementById("leaseModalBackdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "leaseModalBackdrop") closeLeaseModal();
      });
    document
      .getElementById("btnSaveLease")
      ?.addEventListener("click", saveLeaseModal);
    // Review modal
    document
      .getElementById("btnCloseReviewModal")
      ?.addEventListener("click", closeReviewModal);
    document
      .getElementById("btnCancelReview")
      ?.addEventListener("click", closeReviewModal);
    document
      .getElementById("reviewModalBackdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "reviewModalBackdrop") closeReviewModal();
      });
    document
      .getElementById("btnSaveReview")
      ?.addEventListener("click", saveReviewModal);
    // Termination modal
    document
      .getElementById("btnCloseTerminationModal")
      ?.addEventListener("click", closeTerminationModal);
    document
      .getElementById("btnCancelTermination")
      ?.addEventListener("click", closeTerminationModal);
    document
      .getElementById("terminationModalBackdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "terminationModalBackdrop") closeTerminationModal();
      });
    document
      .getElementById("btnConfirmTermination")
      ?.addEventListener("click", confirmTermination);
    // Confirm
    document
      .getElementById("confirmCancel")
      ?.addEventListener("click", closeConfirm);
    document
      .getElementById("confirmBackdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "confirmBackdrop") closeConfirm();
      });
    document.addEventListener("click", (e) => {
      const menu = document.getElementById("ctxMenu");
      if (menu && !menu.contains(e.target) && !e.target.closest(".dots-btn"))
        menu.classList.remove("open");
    });
  }

  function debounce(fn, delay) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  function applyFilters() {
    const q = (
      document.getElementById("searchInputLocal")?.value || ""
    ).toLowerCase();
    const prop = document.getElementById("filterProperty")?.value || "";
    const tenant = document.getElementById("filterTenant")?.value || "";
    const status = document.getElementById("filterStatus")?.value || "";
    const leaseType = document.getElementById("filterLeaseType")?.value || "";
    const renewal = document.getElementById("filterRenewal")?.value || "";
    const rentRange = document.getElementById("filterRent")?.value || "";
    const startDate = document.getElementById("filterStartDate")?.value || "";
    const expiryDate = document.getElementById("filterExpiryDate")?.value || "";
    const urlParams = new URLSearchParams(location.search);
    const unitParam = urlParams.get("unit");

    filtered = getLeases()
      .filter((l) => {
        if (q) {
          const hay =
            `${l.id} ${l.tenant || ""} ${l.tenantId || ""} ${l.propertyName || l.property || ""} ${l.propertyId || ""} ${(l.unitCodes || []).join(" ")} ${l.leaseType}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (prop && l.propertyId !== prop) return false;
        if (
          tenant &&
          l.tenantId !== tenant &&
          l.tenant !== getTenants().find((t) => t.id === tenant)?.name
        )
          return false;
        if (
          unitParam &&
          !(l.unitIds || []).includes(unitParam) &&
          !(l.unitCodes || []).includes(unitParam)
        )
          return false;
        if (status && l.status !== status) return false;
        if (leaseType && l.leaseType !== leaseType) return false;
        if (renewal && (l.renewalStatus || "Not Due") !== renewal) return false;
        if (rentRange) {
          const rent = l.monthlyRent || l.rent || 0;
          if (rentRange === "0-25000" && rent > 25000) return false;
          if (rentRange === "25000-50000" && (rent < 25000 || rent > 50000))
            return false;
          if (rentRange === "50000-100000" && (rent < 50000 || rent > 100000))
            return false;
          if (rentRange === "100000-" && rent < 100000) return false;
        }
        if (startDate && (l.startDate || l.start || "") < startDate)
          return false;
        if (expiryDate && (l.endDate || l.end || "") > expiryDate) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.startDate || b.start) - new Date(a.startDate || a.start),
      );

    currentPage = 1;
    renderKPIs();
    renderTable();
  }

  function resetFilters() {
    document.getElementById("searchInputLocal").value = "";
    [
      "filterProperty",
      "filterTenant",
      "filterStatus",
      "filterLeaseType",
      "filterRenewal",
      "filterRent",
      "filterStartDate",
      "filterExpiryDate",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    history.replaceState(null, "", location.pathname);
    applyFilters();
  }

  function renderKPIs() {
    const leases = getLeases();
    const filteredLeases = filtered.length ? filtered : leases;
    const total = filteredLeases.length;
    const active = filteredLeases.filter((l) => l.status === "Active").length;
    const expiring90 = filteredLeases.filter((l) => {
      const d = daysUntil(l.endDate || l.end);
      return d !== null && d >= 0 && d < 90 && l.status === "Active";
    }).length;
    const pendingRenewal = filteredLeases.filter(
      (l) => l.renewalStatus === "Due Soon" || l.renewalStatus === "Pending",
    ).length;
    const expired = filteredLeases.filter((l) => l.status === "Expired").length;
    const terminated = filteredLeases.filter(
      (l) => l.status === "Terminated",
    ).length;
    const rentRoll = filteredLeases
      .filter((l) => l.status === "Active" || l.status === "Expiring Soon")
      .reduce((s, l) => s + (l.monthlyRent || l.rent || 0), 0);
    const arrears = filteredLeases.reduce((s, l) => s + (l.balance || 0), 0);
    const occupancy = leases.length
      ? Math.round(
          (leases.filter(
            (l) => l.status === "Active" || l.status === "Expiring Soon",
          ).length /
            Math.max(1, getUnits().length)) *
            100,
        )
      : 83;

    const grid = document.getElementById("kpiGrid");
    if (!grid) return;
    grid.innerHTML = `
      <div class="kpi"><div class="kpi-top"><span class="kpi-label">Total Leases</span><span class="pill blue">${total}</span></div><div class="kpi-value">${total}</div><div class="kpi-meta">Portfolio: ${getProps().length} properties</div></div>
      <div class="kpi kpi-green"><div class="kpi-top"><span class="kpi-label">Active</span><span class="pill green">${active}</span></div><div class="kpi-value">${active}</div><div class="kpi-meta">${Math.round((active / Math.max(1, total)) * 100)}% active • Rent Roll ${fmtMoney(rentRoll)}</div></div>
      <div class="kpi kpi-amber"><div class="kpi-top"><span class="kpi-label">Expiring < 90 Days</span><span class="pill amber">${expiring90}</span></div><div class="kpi-value">${expiring90}</div><div class="kpi-meta">Requires renewal workflow</div></div>
      <div class="kpi kpi-amber"><div class="kpi-top"><span class="kpi-label">Pending Renewal</span><span class="pill amber">${pendingRenewal}</span></div><div class="kpi-value">${pendingRenewal}</div><div class="kpi-meta">Start Renewal → New lease</div></div>
      <div class="kpi kpi-red"><div class="kpi-top"><span class="kpi-label">Expired</span><span class="pill red">${expired}</span></div><div class="kpi-value">${expired}</div><div class="kpi-meta">Awaiting renewal or vacancy</div></div>
      <div class="kpi kpi-slate"><div class="kpi-top"><span class="kpi-label">Terminated</span><span class="pill gray">${terminated}</span></div><div class="kpi-value">${terminated}</div><div class="kpi-meta">Move-out processed</div></div>
      <div class="kpi kpi-green"><div class="kpi-top"><span class="kpi-label">Rent Roll</span><span class="pill green">ZMW</span></div><div class="kpi-value" style="font-size:16px">${fmtMoney(rentRoll)}</div><div class="kpi-meta">Monthly • Annual ${fmtMoney(rentRoll * 12)}</div></div>
      <div class="kpi kpi-red"><div class="kpi-top"><span class="kpi-label">Arrears</span><span class="pill red">${fmtMoney(arrears)}</span></div><div class="kpi-value" style="font-size:16px">${fmtMoney(arrears)}</div><div class="kpi-meta">Outstanding across leases</div></div>
      <div class="kpi"><div class="kpi-top"><span class="kpi-label">Occupancy</span><span class="pill blue">${occupancy}%</span></div><div class="kpi-value">${occupancy}%</div><div class="kpi-meta">${getUnits().filter((u) => u.status === "Occupied").length}/${getUnits().length} units occupied</div></div>
    `;
    const rentRollLabel = document.getElementById("rentRollLabel");
    if (rentRollLabel)
      rentRollLabel.textContent = rentRoll.toLocaleString("en-ZM");
    const annualLabel = document.getElementById("annualLabel");
    if (annualLabel)
      annualLabel.textContent = (rentRoll * 12).toLocaleString("en-ZM");
  }

  function renderTable() {
    const tbody = document.getElementById("leasesTbody");
    const countLabel = document.getElementById("countLabel");
    const info = document.getElementById("tableInfo");
    if (!tbody) return;
    const start = (currentPage - 1) * pageSize;
    const pageData = filtered.slice(start, start + pageSize);
    if (countLabel) countLabel.textContent = filtered.length;
    if (info)
      info.textContent = `Showing ${filtered.length ? start + 1 : 0}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length}`;

    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13"><div class="empty-state"><div class="ico">📄</div><h3>No leases found</h3><p>Try changing filters or create a new lease. Leases are the operational engine feeding rental income → NOI → Investment Assets.</p><button class="btn btn-primary btn-sm" onclick="document.getElementById('btnNewLease').click()" style="margin-top:10px">+ New Lease</button></div></td></tr>`;
      return;
    }

    tbody.innerHTML = pageData
      .map((l) => {
        const tenantName =
          l.tenantName ||
          l.tenant ||
          getTenants().find((t) => t.id === l.tenantId)?.name ||
          "—";
        const expiry = l.endDate || l.end || "";
        const days = daysUntil(expiry);
        let statusClass = l.status.toLowerCase().replace(" ", "-");
        if (l.status === "Active" && days !== null && days < 90 && days >= 0)
          statusClass = "expiring";
        const reviewDate = l.reviewDate || l.nextReviewDate || "";
        const reviewDays = daysUntil(reviewDate);
        let reviewBadge =
          '<span class="review-badge scheduled">No review</span>';
        if (reviewDate) {
          if (reviewDays !== null && reviewDays < 0)
            reviewBadge = `<span class="review-badge overdue">Overdue ${Math.abs(reviewDays)}d</span>`;
          else if (reviewDays !== null && reviewDays < 30)
            reviewBadge = `<span class="review-badge due-soon">Due in ${reviewDays}d</span>`;
          else
            reviewBadge = `<span class="review-badge scheduled">${fmtDate(reviewDate)}</span>`;
        }
        const balance = l.balance || 0;
        return `<tr data-id="${l.id}" style="cursor:pointer">
        <td><div class="lease-cell"><span class="id">${l.id}</span><span class="sub">${l.renewalStatus || "Not Due"}</span></div></td>
        <td><div style="font-weight:700;font-size:13px">${escapeHtml(tenantName)}</div><div style="font-size:11px;color:var(--muted)">${l.tenantId || ""}</div></td>
        <td><div style="font-weight:600;font-size:13px">${escapeHtml(l.propertyName || l.property || "—")}</div><div style="font-size:11px;color:var(--muted)">${l.propertyId || ""}</div></td>
        <td><div class="unit-chips">${(l.unitCodes || [])
          .slice(0, 2)
          .map((u) => `<span class="unit-chip-mini">${escapeHtml(u)}</span>`)
          .join(
            "",
          )}${(l.unitCodes || []).length > 2 ? `<span class="unit-chip-mini more">+${l.unitCodes.length - 2}</span>` : ""}${(l.unitCodes || []).length === 0 && l.unit ? `<span class="unit-chip-mini">${escapeHtml(l.unit)}</span>` : ""}</div></td>
        <td><span class="pill gray">${l.leaseType}</span></td>
        <td>${fmtDate(l.startDate || l.start)}</td>
        <td><div style="font-weight:600">${fmtDate(expiry)}</div><div style="font-size:11px;color:${days !== null && days < 30 ? "var(--amber-600)" : days !== null && days < 0 ? "var(--red-600)" : "var(--muted)"}">${days !== null ? (days < 0 ? `Expired ${Math.abs(days)}d ago` : days < 90 ? `${days}d left` : `${days}d`) : ""}</div></td>
        <td><div class="rent-cell"><span class="amt">${fmtMoney(l.monthlyRent || l.rent)}</span><span class="sub">${l.paymentFrequency || "Monthly"}</span></div></td>
        <td>${fmtMoney(l.deposit)}</td>
        <td>${reviewBadge}</td>
        <td><span class="lease-status ${statusClass}">${l.status}${statusClass === "expiring" ? " Soon" : ""}</span></td>
        <td><div class="balance-cell"><span class="amt ${balance > 0 ? "negative" : ""}">${balance > 0 ? fmtMoney(balance) : "—"}</span></div></td>
        <td><button class="dots-btn" data-id="${l.id}">⋮</button></td>
      </tr>`;
      })
      .join("");

    tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".dots-btn")) return;
        openDrawer(tr.dataset.id);
      });
    });
    tbody.querySelectorAll(".dots-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openCtxMenu(btn, btn.dataset.id);
      });
    });
  }

  function openCtxMenu(anchor, leaseId) {
    const l = getLeases().find((x) => x.id === leaseId);
    if (!l) return;
    const menu = document.getElementById("ctxMenu");
    const rect = anchor.getBoundingClientRect();
    const expiryDays = daysUntil(l.endDate || l.end);
    const isExpiring =
      expiryDays !== null && expiryDays < 90 && l.status === "Active";
    menu.innerHTML = `
      <div class="ctx-item" data-act="view">👁️ View Lease</div>
      <div class="ctx-item" data-act="edit">✏️ Edit Lease</div>
      <div class="ctx-item" data-act="review">📈 Rent Review</div>
      <div class="ctx-item" data-act="escalation">📊 Escalation</div>
      <div class="ctx-item" data-act="renew">${isExpiring ? "🔄 Start Renewal" : "📋 Renew Lease"}</div>
      <div class="ctx-item" data-act="agreement">📄 Generate Agreement</div>
      <div class="ctx-item" data-act="view-tenant">👤 View Tenant</div>
      <div class="ctx-item" data-act="view-property">🏢 View Property</div>
      <div class="ctx-item" data-act="view-unit">🏠 View Units</div>
      <div class="ctx-item" data-act="documents">📁 Documents</div>
      <div class="ctx-item danger" data-act="terminate">🚪 Terminate / Move-Out</div>
    `;
    menu.style.left = rect.left - 200 + rect.width + "px";
    menu.style.top = rect.bottom + 6 + "px";
    menu.classList.add("open");
    menu.querySelectorAll(".ctx-item").forEach((item) => {
      item.addEventListener("click", () => {
        handleAction(item.dataset.act, leaseId);
        menu.classList.remove("open");
      });
    });
  }

  function handleAction(act, leaseId) {
    const l = getLeases().find((x) => x.id === leaseId);
    if (!l) return;
    switch (act) {
      case "view":
        openDrawer(leaseId);
        break;
      case "edit":
        openLeaseModal(leaseId);
        break;
      case "review":
        openReviewModal(leaseId);
        break;
      case "escalation":
        openEscalationModal(leaseId);
        break;
      case "renew":
        renewLease(leaseId);
        break;
      case "agreement":
        generateAgreement(leaseId);
        break;
      case "view-tenant":
        if (l.tenantId) goToPage(`tenants.html?id=${l.tenantId}`);
        else if (l.tenant) goToPage(`tenants.html?property=${l.propertyId}`);
        break;
      case "view-property":
        goToPage(`property-register.html?id=${l.propertyId}`);
        break;
      case "view-unit":
        goToPage(`units.html?property=${l.propertyId}`);
        break;
      case "documents":
        openDrawer(leaseId);
        setTimeout(() => {
          document.querySelector('.drawer-tab[data-tab="documents"]')?.click();
        }, 100);
        break;
      case "terminate":
        openTerminationModal(leaseId);
        break;
    }
  }

  function openDrawer(id) {
    const l = getLeases().find((x) => x.id === id);
    if (!l) return;
    selectedId = id;
    document.getElementById("drawerTitle").textContent = l.id;
    document.getElementById("drawerId").textContent = l.id;
    const statusEl = document.getElementById("drawerStatus");
    statusEl.textContent = l.status;
    statusEl.className = `lease-status ${l.status.toLowerCase().replace(" ", "-")}`;
    const tenantName =
      l.tenantName ||
      l.tenant ||
      getTenants().find((t) => t.id === l.tenantId)?.name ||
      "—";
    const propName = l.propertyName || l.property || "—";
    document.getElementById("drawerSubtitle").textContent =
      `${tenantName} • ${propName} — ${(l.unitCodes || []).join(", ") || l.unit || "—"} • ${fmtMoney(l.monthlyRent || l.rent)} / month`;

    // Summary
    const summary = document.getElementById("drawerSummary");
    const expiryDays = daysUntil(l.endDate || l.end);
    let expiryInfo = `${fmtDate(l.endDate || l.end)} • ${expiryDays !== null ? (expiryDays < 0 ? `Expired ${Math.abs(expiryDays)}d ago` : `${expiryDays}d left`) : ""}`;
    summary.innerHTML = `
      <div class="info-box"><div class="label">Tenant</div><div class="value" style="font-size:13px">${escapeHtml(tenantName)}</div></div>
      <div class="info-box"><div class="label">Monthly Rent</div><div class="value">${fmtMoney(l.monthlyRent || l.rent)}</div></div>
      <div class="info-box"><div class="label">Expiry</div><div class="value" style="font-size:13px">${expiryInfo}</div></div>
      <div class="info-box"><div class="label">Deposit</div><div class="value" style="font-size:13px">${fmtMoney(l.deposit)}</div></div>
    `;

    renderDrawerBody(id);
    renderDrawerActions(id);

    document.getElementById("detailDrawer").classList.add("open");
    document.getElementById("drawerBackdrop").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function renderDrawerBody(id) {
    const l = getLeases().find((x) => x.id === id);
    if (!l) return;
    const body = document.getElementById("drawerBody");
    const tenant = getTenants().find(
      (t) => t.id === l.tenantId || t.name === (l.tenantName || l.tenant),
    );
    const apps = getApps().filter(
      (a) =>
        a.tenantId === l.tenantId ||
        a.applicantName === (l.tenantName || l.tenant),
    );

    if (currentTab === "overview") {
      body.innerHTML = `
        <div class="lease-overview-grid">
          <div class="lease-detail-box"><h5>Lease Identity</h5><div class="kvs"><div class="k">Lease ID</div><div class="v mono">${l.id}</div><div class="k">Tenant</div><div class="v"><a href="#" onclick="event.preventDefault(); goToPage('tenants.html?id=${l.tenantId}')">${escapeHtml(l.tenantName || l.tenant || "—")} (${l.tenantId || ""})</a></div><div class="k">Property</div><div class="v"><a href="#" onclick="event.preventDefault(); goToPage('property-register.html?id=${l.propertyId}')">${escapeHtml(l.propertyName || l.property || "—")} (${l.propertyId})</a></div><div class="k">Units</div><div class="v">${(l.unitCodes || []).map((u) => `<span class="unit-chip-mini">${escapeHtml(u)}</span>`).join(" ")} <a href="#" onclick="event.preventDefault(); goToPage('units.html?property=${l.propertyId}')" style="margin-left:6px;font-size:11px">View Units</a></div><div class="k">Lease Type</div><div class="v"><span class="pill gray">${l.leaseType}</span></div><div class="k">Status</div><div class="v"><span class="lease-status ${l.status.toLowerCase().replace(" ", "-")}">${l.status}</span></div></div></div>
          <div class="lease-detail-box"><h5>Dates & Terms</h5><div class="kvs"><div class="k">Start Date</div><div class="v">${fmtDate(l.startDate || l.start)}</div><div class="k">End Date</div><div class="v">${fmtDate(l.endDate || l.end)} • ${daysUntil(l.endDate || l.end) !== null ? daysUntil(l.endDate || l.end) + "d" : ""}</div><div class="k">Term</div><div class="v">${Math.floor((new Date(l.endDate || l.end) - new Date(l.startDate || l.start)) / (30 * 24 * 3600 * 1000))} months</div><div class="k">Review Date</div><div class="v">${fmtDate(l.reviewDate || l.nextReviewDate)}</div><div class="k">Renewal Status</div><div class="v"><span class="pill ${l.renewalStatus === "Due Soon" ? "amber" : l.renewalStatus === "Renewed" ? "blue" : "gray"}">${l.renewalStatus || "Not Due"}</span></div><div class="k">Payment Freq</div><div class="v">${l.paymentFrequency || "Monthly"}</div><div class="k">Due Day</div><div class="v">${l.paymentDueDay || 15}th</div></div></div>
          <div class="lease-detail-box"><h5>Financial</h5><div class="kvs"><div class="k">Monthly Rent</div><div class="v" style="font-weight:800">${fmtMoney(l.monthlyRent || l.rent)}</div><div class="k">Deposit</div><div class="v">${fmtMoney(l.deposit)}</div><div class="k">Service Charge</div><div class="v">${fmtMoney(l.serviceCharge)}</div><div class="k">Escalation</div><div class="v">${l.escalationType || "Annual"} • ${l.escalationPercent || 5}%</div><div class="k">Balance</div><div class="v">${fmtMoney(l.balance || 0)}</div></div></div>
          <div class="lease-detail-box"><h5>Clauses & Guarantors</h5><div class="kvs"><div class="k">Break Clause</div><div class="v">${l.breakClause ? `${fmtDate(l.breakClauseDate)} • ${escapeHtml(l.breakClauseNotice || "3 months notice")}` : "None"}</div><div class="k">Guarantor</div><div class="v">${l.guarantors?.length ? l.guarantors.map((g) => `${escapeHtml(g.name)} (${g.phone})`).join("<br>") : "None"}</div><div class="k">Renewal Terms</div><div class="v">${escapeHtml(l.renewalTerms || "Option to renew for 12 months at market rent")}</div><div class="k">Special Conditions</div><div class="v">${escapeHtml(l.specialConditions || "—")}</div></div></div>
          <div class="lease-detail-box full"><h5>Chain: Application → Tenant → Lease → Property → Investment</h5><div style="padding:10px;background:var(--surface);border-radius:8px;border:1px solid var(--border-light);font-size:12px;line-height:1.6">
            ${apps.length ? `<div>📋 APPLICATION ${apps[0].id} • ${escapeHtml(apps[0].applicantName)} → ${apps[0].status} → KYC ${apps[0].kycStatus}</div><div style="margin-left:12px">↓</div>` : ""}
            <div>👤 TENANT ${l.tenantId || "T-XXX"} • ${escapeHtml(l.tenantName || l.tenant || "—")} • ${tenant?.city || "Lusaka"} • Risk ${tenant?.riskRating || "Medium"}</div>
            <div style="margin-left:12px">↓</div>
            <div>📄 LEASE ${l.id} • ${escapeHtml(l.propertyName || "")} — ${(l.unitCodes || []).join(", ")} • ${fmtMoney(l.monthlyRent || l.rent)} / month • ${l.status} • ${l.leaseType}</div>
            <div style="margin-left:12px">↓</div>
            <div>🏢 PROPERTY ${l.propertyId} • ${escapeHtml(l.propertyName || "")} • Rental Income ZMW ${fmtMoney(l.monthlyRent || l.rent)} → Operating Costs → NOI</div>
            <div style="margin-left:12px">↓</div>
            <div>📊 INVESTMENT INV-${l.propertyId} • Portfolio ZMW 486.4M • Yield ${(Math.random() * 3 + 6).toFixed(1)}% • ${l.status === "Active" ? "Contributing to fund performance" : "Not contributing"}</div>
          </div></div>
        </div>
      `;
    } else if (currentTab === "financials") {
      const monthly = l.monthlyRent || l.rent || 0;
      body.innerHTML = `
        <div class="financials-grid">
          <div class="financial-card"><div class="label">Monthly Rent</div><div class="value">${fmtMoney(monthly)}</div><div class="sub">${l.paymentFrequency || "Monthly"} • Due ${l.paymentDueDay || 15}th</div></div>
          <div class="financial-card"><div class="label">Annual Rent</div><div class="value">${fmtMoney(monthly * 12)}</div><div class="sub">Rent Roll contribution</div></div>
          <div class="financial-card"><div class="label">Deposit Held</div><div class="value">${fmtMoney(l.deposit)}</div><div class="sub">${Math.round(l.deposit / monthly || 0)} months • Refundable</div></div>
          <div class="financial-card"><div class="label">Service Charge</div><div class="value">${fmtMoney(l.serviceCharge || 0)}</div><div class="sub">Per month • ${Math.round(((l.serviceCharge || 0) / monthly) * 100 || 0)}% of rent</div></div>
          <div class="financial-card"><div class="label">Outstanding Balance</div><div class="value" style="color:${(l.balance || 0) > 0 ? "var(--red-600)" : ""}">${fmtMoney(l.balance || 0)}</div><div class="sub">${(l.balance || 0) > 0 ? "Arrears" : "Clear"}</div></div>
          <div class="financial-card"><div class="label">Total Collected (YTD)</div><div class="value">${fmtMoney(monthly * (new Date().getMonth() + 1) - (l.balance || 0))}</div><div class="sub">Based on start date</div></div>
        </div>
        <div class="lease-detail-box"><h5>Payment History & Flow to Investment</h5><div style="font-size:12px;color:var(--muted);line-height:1.6">
          <div>Lease Monthly Rent <strong>${fmtMoney(monthly)}</strong> → Rental Income → Property Financials → NOI → Investment Asset INV-${l.propertyId} → Portfolio → Fund</div>
          <div style="margin-top:8px">Deposit: ${fmtMoney(l.deposit)} held • Service Charge: ${fmtMoney(l.serviceCharge || 0)} • Escalation: ${l.escalationType || "Annual"} ${l.escalationPercent || 5}%</div>
          <div style="margin-top:8px"><button class="btn btn-sm">View Billing</button> <button class="btn btn-sm">View Payments</button></div>
        </div></div>
      `;
    } else if (currentTab === "reviews") {
      const reviews = l.rentReviews || [];
      body.innerHTML = `
        <div class="drawer-section"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h4 style="margin:0">Rent Reviews • ${reviews.length} reviews</h4><button class="btn btn-sm btn-primary" onclick="window.LeasesPage.openReview('${l.id}')">+ New Review</button></div>
          <div class="review-timeline">${
            reviews.length
              ? reviews
                  .map(
                    (r) => `
            <div class="review-card"><div class="review-card-head"><span class="review-id">${r.id}</span><span class="pill ${r.status === "Applied" ? "green" : r.status === "Approved" ? "green" : r.status === "Pending Approval" ? "amber" : "blue"}">${r.status}</span></div>
              <div class="review-grid"><div><div class="k">Current Rent</div><div class="v">${fmtMoney(r.currentRent)}</div></div><div><div class="k">Proposed Rent</div><div class="v">${fmtMoney(r.proposedRent)}</div></div><div><div class="k">Increase</div><div class="v">${r.percentageIncrease}% • ${fmtMoney(r.proposedRent - r.currentRent)}</div></div><div><div class="k">Effective Date</div><div class="v">${fmtDate(r.effectiveDate)}</div></div></div>
              <div style="margin-top:8px;font-size:11px;color:var(--muted)">Method: ${r.reviewMethod} • Approved by ${escapeHtml(r.approvedBy || "—")} • ${escapeHtml(r.notes || "")}</div>
              <div class="review-workflow"><span class="workflow-dot ${["Scheduled", "Proposed", "Pending Approval", "Approved", "Applied"].indexOf(r.status) >= 0 ? "done" : ""}"></span><span class="workflow-line"></span><span class="workflow-dot ${["Proposed", "Pending Approval", "Approved", "Applied"].indexOf(r.status) >= 0 ? "done" : ""}"></span><span class="workflow-line"></span><span class="workflow-dot ${["Pending Approval", "Approved", "Applied"].indexOf(r.status) >= 0 ? "active" : ""}"></span><span class="workflow-line"></span><span class="workflow-dot ${["Approved", "Applied"].indexOf(r.status) >= 0 ? "done" : ""}"></span><span class="workflow-line"></span><span class="workflow-dot ${r.status === "Applied" ? "done" : ""}"></span><span style="font-size:11px;margin-left:6px;color:var(--muted)">${r.status}</span></div>
              ${r.status !== "Applied" ? `<div style="margin-top:10px;display:flex;gap:6px"><button class="btn btn-sm btn-primary" onclick="window.LeasesPage.applyReview('${l.id}','${r.id}')">Apply to Lease</button><button class="btn btn-sm" onclick="window.LeasesPage.editReview('${l.id}','${r.id}')">Edit</button></div>` : ""}
            </div>
          `,
                  )
                  .join("")
              : '<div class="empty-state"><div class="ico">📈</div><h3>No rent reviews</h3><p>Schedule a rent review to track proposed → approved → applied workflow. When applied, lease rent is updated and saved.</p></div>'
          }
          </div>
        </div>
      `;
    } else if (currentTab === "escalations") {
      const rules = l.escalationRules || [];
      body.innerHTML = `
        <div class="drawer-section"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h4 style="margin:0">Escalations • ${rules.length} rules</h4><button class="btn btn-sm btn-primary" onclick="window.LeasesPage.openEscalation('${l.id}')">+ Add Rule</button></div>
          <div class="escalation-grid">${
            rules.length
              ? rules
                  .map(
                    (er) => `
            <div class="escalation-card"><span class="esc-type">${er.type}</span><div class="kvs"><div class="k">Escalation %</div><div class="v">${er.percent}%</div><div class="k">Current Rent</div><div class="v">${fmtMoney(er.currentRent)}</div><div class="k">New Rent</div><div class="v" style="font-weight:800">${fmtMoney(er.newRent)}</div><div class="k">Effective Date</div><div class="v">${fmtDate(er.effectiveDate)}</div><div class="k">Applied</div><div class="v">${er.applied ? "✅ Yes" : "⏳ Pending"}</div></div>${!er.applied ? `<button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="window.LeasesPage.applyEscalation('${l.id}','${er.id}')">Apply</button>` : ""}</div>
          `,
                  )
                  .join("")
              : '<div class="empty-state"><div class="ico">📊</div><h3>No escalations</h3><p>Support Annual, Percentage, Fixed Amount, Custom escalations. History is preserved, not silently modified.</p></div>'
          }
          </div>
        </div>
        <div class="drawer-section"><h4>Current Escalation Settings</h4><div class="kvs"><div class="k">Type</div><div class="v">${l.escalationType || "Annual"}</div><div class="k">Percentage</div><div class="v">${l.escalationPercent || 5}%</div><div class="k">Next Review</div><div class="v">${fmtDate(l.reviewDate || l.nextReviewDate)}</div></div></div>
      `;
    } else if (currentTab === "documents") {
      body.innerHTML = `
        <div class="drawer-section"><h4>Documents • ${l.documents?.length || 0}</h4>
          <div class="doc-list">${
            (l.documents || [])
              .map(
                (d) => `
            <div class="doc-item"><div class="doc-ico">📄</div><div style="flex:1"><div style="font-weight:600;font-size:13px">${escapeHtml(d.name)}</div><div style="font-size:11px;color:var(--muted)">${d.type} • ${d.id} • ${fmtDate(d.date || "")}</div></div><button class="btn btn-sm btn-ghost">View</button></div>
          `,
              )
              .join("") ||
            '<div class="empty-state"><div class="ico">📁</div><h3>No documents</h3><p>Lease agreement, addendum, renewal letter, notices, condition reports.</p></div>'
          }
          </div>
        </div>
        <div class="drawer-section"><h4>Generate</h4><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm" onclick="window.LeasesPage.generateAgreement('${l.id}')">📄 Agreement</button><button class="btn btn-sm">📋 Addendum</button><button class="btn btn-sm">✉️ Statutory Notice</button></div></div>
      `;
    } else if (currentTab === "tenant") {
      if (!tenant) {
        body.innerHTML =
          '<div class="empty-state"><div class="ico">👤</div><h3>No tenant linked</h3></div>';
        return;
      }
      body.innerHTML = `
        <div class="drawer-section"><h4>${escapeHtml(tenant.name)} • ${tenant.id}</h4>
          <div class="kvs"><div class="k">Name</div><div class="v">${escapeHtml(tenant.name)}</div><div class="k">Type</div><div class="v">${tenant.type}</div><div class="k">Phone</div><div class="v">${escapeHtml(tenant.phone)}</div><div class="k">Email</div><div class="v">${escapeHtml(tenant.email)}</div><div class="k">City</div><div class="v">${escapeHtml(tenant.city)}</div><div class="k">Risk</div><div class="v">${tenant.riskRating || tenant.risk}</div><div class="k">Status</div><div class="v"><span class="pill ${tenant.status === "Active" ? "green" : "gray"}">${tenant.status}</span></div></div>
          <div style="margin-top:12px"><button class="btn btn-sm btn-primary" onclick="goToPage('tenants.html?id=${tenant.id}')">View Tenant</button></div>
        </div>
      `;
    } else if (currentTab === "units") {
      const units = getUnits().filter(
        (u) =>
          (l.unitIds || []).includes(u.id) ||
          (l.unitCodes || []).includes(u.code),
      );
      body.innerHTML = `
        <div class="drawer-section"><h4>Units • ${units.length} units • Multi-unit lease ${units.length > 1 ? "Yes" : "No"}</h4>
          <div class="prop-unit-list">${
            units.length
              ? units
                  .map(
                    (u) => `
            <div class="prop-unit-card"><div class="left"><span class="title">${escapeHtml(u.code)} • ${u.type} • Floor ${u.floor}</span><span class="sub">${escapeHtml(u.property)} • ${u.area}m² • ${u.status} • ${fmtMoney(u.rent || 0)} / month</span></div><button class="btn btn-sm" onclick="goToPage('units.html?property=${u.propertyId}&unit=${u.id}')">View</button></div>
          `,
                  )
                  .join("")
              : '<div class="empty-state"><div class="ico">🏠</div><h3>No units linked</h3><p>Lease controls ${(l.unitCodes||[]).join(", ")} • ${(l.unitIds||[]).join(", ")}</p></div>'
          }
          </div>
        </div>
        <div class="drawer-section"><h4>Unit Integration</h4><div style="font-size:12px;color:var(--muted)">Lease → Unit(s) → Property → Investment Asset. After termination, unit becomes Vacant unless another active lease controls it.</div></div>
      `;
    } else if (currentTab === "activity") {
      const audit = (getState().auditTrail || [])
        .filter((a) => a.entityId === l.id || a.description.includes(l.id))
        .slice(0, 30);
      body.innerHTML = `<div class="drawer-section"><h4>Activity • ${audit.length} events</h4><div class="activity-timeline">${
        audit.length
          ? audit
              .map(
                (a) => `
        <div class="activity-item"><div class="act-title">${escapeHtml(a.action)} • ${escapeHtml(a.description)}</div><div class="act-desc">${escapeHtml(a.user)} • ${a.entityType} ${a.entityId}</div><div class="act-time">${new Date(a.timestamp).toLocaleString()}</div></div>
      `,
              )
              .join("")
          : (l.activity || [])
              .map(
                (a) => `
        <div class="activity-item"><div class="act-title">${escapeHtml(a.action)}</div><div class="act-desc">${escapeHtml(a.description)}</div><div class="act-time">${new Date(a.timestamp).toLocaleString()}</div></div>
      `,
              )
              .join("") ||
            '<div class="empty-state"><div class="ico">🕒</div><h3>No activity</h3></div>'
      }</div></div>`;
    }
  }

  function renderDrawerActions(id) {
    const l = getLeases().find((x) => x.id === id);
    const container = document.getElementById("drawerActions");
    if (!l || !container) return;
    container.innerHTML = `
      <button class="btn" onclick="window.LeasesPage.openModal('${id}')">✏️ Edit Lease</button>
      <button class="btn" onclick="window.LeasesPage.openReview('${id}')">📈 Review</button>
      <button class="btn" onclick="window.LeasesPage.renew('${id}')">🔄 Renew</button>
      <button class="btn" onclick="window.LeasesPage.generateAgreement('${id}')">📄 Agreement</button>
      ${l.tenantId ? `<button class="btn" onclick="goToPage('tenants.html?id=${l.tenantId}')">👤 Tenant</button>` : ""}
      <button class="btn" onclick="goToPage('property-register.html?id=${l.propertyId}')">🏢 Property</button>
      <button class="btn btn-ghost" onclick="window.LeasesPage.closeDrawer()">Close</button>
      <button class="btn btn-danger" style="margin-left:auto" onclick="window.LeasesPage.openTermination('${id}')">🚪 Terminate</button>
    `;
  }

  function closeDrawer() {
    document.getElementById("detailDrawer")?.classList.remove("open");
    document.getElementById("drawerBackdrop")?.classList.remove("open");
    document.body.style.overflow = "";
    selectedId = null;
  }

  // Lease Modal
  function openLeaseModal(id = null, prefill = {}) {
    editingId = id;
    const l = id ? getLeases().find((x) => x.id === id) : null;
    const isEdit = !!l;
    document.getElementById("leaseModalTitle").textContent = isEdit
      ? `Edit Lease ${l.id}`
      : "New Lease";
    const tenants = getTenants();
    const props = getProps();
    const units = getUnits();
    const appPrefill = prefill.applicationId
      ? getApps().find((a) => a.id === prefill.applicationId)
      : null;

    const tenantId =
      l?.tenantId || prefill.tenantId || appPrefill?.tenantId || "";
    const propertyId =
      l?.propertyId ||
      prefill.propertyId ||
      appPrefill?.propertyId ||
      props[0]?.id ||
      "";
    const body = document.getElementById("leaseModalBody");
    body.innerHTML = `
      <div class="lease-form-section"><h4><span class="form-num">1</span> Lease Information</h4>
        <div class="form-grid">
          <div><label class="form-label req">Tenant</label><select class="form-select" id="f_tenantId"><option value="">Select tenant</option>${tenants.map((t) => `<option value="${t.id}" ${tenantId === t.id ? "selected" : ""}>${escapeHtml(t.name)} (${t.id}) - ${escapeHtml(t.property || "")}</option>`).join("")}</select></div>
          <div><label class="form-label req">Property</label><select class="form-select" id="f_propertyId"><option value="">Select property</option>${props.map((p) => `<option value="${p.id}" ${propertyId === p.id ? "selected" : ""}>${escapeHtml(p.name)} (${p.id})</option>`).join("")}</select></div>
          <div class="f-group full"><label class="form-label req">Unit(s) - Multi-unit lease supported (unitIds: [])</label><div class="multi-unit-picker" id="multiUnitPicker"></div><div style="font-size:11px;color:var(--muted);margin-top:6px">Select one or more units. For anchor tenants, select multiple adjacent units.</div></div>
          <div><label class="form-label req">Lease Type</label><select class="form-select" id="f_leaseType">${LEASE_TYPES.map((t) => `<option ${l?.leaseType === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div><label class="form-label req">Status</label><select class="form-select" id="f_status">${LEASE_STATUSES.map((s) => `<option ${l?.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
          <div><label class="form-label req">Start Date</label><input type="date" class="form-input" id="f_startDate" value="${l?.startDate || l?.start || appPrefill?.proposedStartDate || new Date().toISOString().slice(0, 10)}"/></div>
          <div><label class="form-label req">End Date</label><input type="date" class="form-input" id="f_endDate" value="${l?.endDate || l?.end || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)}"/></div>
        </div>
      </div>
      <div class="lease-form-section"><h4><span class="form-num">2</span> Financial</h4>
        <div class="form-grid">
          <div><label class="form-label req">Monthly Rent (ZMW)</label><input type="number" class="form-input" id="f_rent" value="${l?.monthlyRent || l?.rent || appPrefill?.proposedRent || ""}"/></div>
          <div><label class="form-label">Deposit (ZMW)</label><input type="number" class="form-input" id="f_deposit" value="${l?.deposit || appPrefill?.deposit || ""}"/></div>
          <div><label class="form-label">Service Charge (ZMW)</label><input type="number" class="form-input" id="f_serviceCharge" value="${l?.serviceCharge || appPrefill?.serviceCharge || ""}"/></div>
          <div><label class="form-label">Billing Frequency</label><select class="form-select" id="f_billing"><option ${l?.paymentFrequency === "Monthly" ? "selected" : ""}>Monthly</option><option ${l?.paymentFrequency === "Quarterly" ? "selected" : ""}>Quarterly</option><option ${l?.paymentFrequency === "Annual" ? "selected" : ""}>Annual</option></select></div>
          <div><label class="form-label">Payment Due Day</label><select class="form-select" id="f_dueDay">${Array.from({ length: 28 }, (_, i) => `<option value="${i + 1}" ${(l?.paymentDueDay || 15) == i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select></div>
          <div><label class="form-label">Rent Review Date</label><input type="date" class="form-input" id="f_reviewDate" value="${l?.reviewDate || l?.nextReviewDate || ""}"/></div>
        </div>
      </div>
      <div class="lease-form-section"><h4><span class="form-num">3</span> Terms, Escalation, Break, Guarantor</h4>
        <div class="form-grid">
          <div><label class="form-label">Escalation Type</label><select class="form-select" id="f_escType">${ESCALATION_TYPES.map((t) => `<option ${l?.escalationType === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
          <div><label class="form-label">Escalation %</label><input type="number" class="form-input" id="f_escPercent" value="${l?.escalationPercent || 5}"/></div>
          <div><label class="form-label">Renewal Status</label><select class="form-select" id="f_renewalStatus">${RENEWAL_STATUSES.map((s) => `<option ${l?.renewalStatus === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
          <div><label class="form-label">Renewal Terms</label><input class="form-input" id="f_renewalTerms" value="${escapeHtml(l?.renewalTerms || "Option to renew for 12 months at market rent")}"/></div>
          <div><label class="form-label">Break Clause Date</label><input type="date" class="form-input" id="f_breakDate" value="${l?.breakClauseDate || ""}"/></div>
          <div><label class="form-label">Break Notice</label><input class="form-input" id="f_breakNotice" value="${escapeHtml(l?.breakClauseNotice || "3 months notice")}"/></div>
          <div><label class="form-label">Guarantor Name</label><input class="form-input" id="f_guarantorName" value="${escapeHtml(l?.guarantors?.[0]?.name || "")}"/></div>
          <div><label class="form-label">Guarantor Phone</label><input class="form-input" id="f_guarantorPhone" value="${escapeHtml(l?.guarantors?.[0]?.phone || "")}"/></div>
          <div class="f-group full"><label class="form-label">Special Conditions</label><textarea class="form-textarea" id="f_special">${escapeHtml(l?.specialConditions || "")}</textarea></div>
        </div>
      </div>
      <div class="lease-form-section"><h4><span class="form-num">4</span> Approval Workflow</h4>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Draft → Pending Approval → Approved → Active. New leases start as Draft and require approval before becoming Active and contributing to rent roll.</div>
        <div style="display:flex;gap:8px"><span class="pill gray">Draft</span><span>→</span><span class="pill amber">Pending Approval</span><span>→</span><span class="pill green">Approved</span><span>→</span><span class="pill green">Active</span></div>
      </div>
    `;
    // Render multi-unit picker
    renderMultiUnitPicker(propertyId, l?.unitIds || appPrefill?.unitIds || []);
    document
      .getElementById("f_propertyId")
      .addEventListener("change", (e) =>
        renderMultiUnitPicker(e.target.value, []),
      );
    document.getElementById("leaseModalBackdrop").classList.add("open");
  }

  function renderMultiUnitPicker(propertyId, selectedIds) {
    const container = document.getElementById("multiUnitPicker");
    if (!container) return;
    const units = getUnits()
      .filter((u) => u.propertyId === propertyId)
      .slice(0, 60);
    container.innerHTML =
      units
        .map((u) => {
          const isSel = selectedIds.includes(u.id);
          return `<label class="multi-unit-option ${isSel ? "selected" : ""}"><input type="checkbox" value="${u.id}" ${isSel ? "checked" : ""} onchange="this.closest('.multi-unit-option').classList.toggle('selected', this.checked)"/><div class="unit-info"><div class="code">${escapeHtml(u.code)} • ${u.type}</div><div class="meta">Floor ${u.floor} • ${u.area}m² • ${u.status} • ${fmtMoney(u.rent || 0)}</div></div><span class="pill ${u.status === "Vacant" ? "amber" : "green"}" style="font-size:10px">${u.status}</span></label>`;
        })
        .join("") || '<div class="small muted">No units for property</div>';
  }

  function closeLeaseModal() {
    document.getElementById("leaseModalBackdrop").classList.remove("open");
    editingId = null;
  }

  function saveLeaseModal() {
    const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
    const tenantId = getVal("f_tenantId");
    if (!tenantId) {
      toast("Tenant required", "error");
      return;
    }
    const propertyId = getVal("f_propertyId");
    if (!propertyId) {
      toast("Property required", "error");
      return;
    }
    const checkedUnits = [
      ...document.querySelectorAll("#multiUnitPicker input:checked"),
    ].map((i) => i.value);
    if (checkedUnits.length === 0) {
      toast("Select at least one unit", "error");
      return;
    }
    const rent = parseFloat(getVal("f_rent")) || 0;
    if (!rent) {
      toast("Rent required", "error");
      return;
    }
    const prop = getProps().find((p) => p.id === propertyId);
    const tenant = getTenants().find((t) => t.id === tenantId);
    const units = getUnits();
    const unitCodes = checkedUnits.map(
      (id) => units.find((u) => u.id === id)?.code || id,
    );

    if (editingId) {
      const leases = getLeases();
      const idx = leases.findIndex((l) => l.id === editingId);
      if (idx >= 0) {
        const before = { ...leases[idx] };
        const l = leases[idx];
        l.tenantId = tenantId;
        l.tenantName = tenant?.name || l.tenantName || l.tenant;
        l.tenant = tenant?.name || l.tenant;
        l.propertyId = propertyId;
        l.propertyName = prop?.name || l.propertyName || l.property;
        l.property = prop?.name || l.property;
        l.unitIds = checkedUnits;
        l.unitCodes = unitCodes;
        l.unit = unitCodes[0];
        l.leaseType = getVal("f_leaseType");
        l.status = getVal("f_status");
        l.startDate = getVal("f_startDate");
        l.start = getVal("f_startDate");
        l.endDate = getVal("f_endDate");
        l.end = getVal("f_endDate");
        l.monthlyRent = rent;
        l.rent = rent;
        l.deposit = parseFloat(getVal("f_deposit")) || rent * 2;
        l.serviceCharge =
          parseFloat(getVal("f_serviceCharge")) || Math.floor(rent * 0.15);
        l.paymentFrequency = getVal("f_billing");
        l.paymentDueDay = parseInt(getVal("f_dueDay")) || 15;
        l.reviewDate = getVal("f_reviewDate");
        l.nextReviewDate = getVal("f_reviewDate");
        l.escalationType = getVal("f_escType");
        l.escalationPercent = parseFloat(getVal("f_escPercent")) || 5;
        l.renewalStatus = getVal("f_renewalStatus");
        l.renewalTerms = getVal("f_renewalTerms");
        l.breakClauseDate = getVal("f_breakDate");
        l.breakClauseNotice = getVal("f_breakNotice");
        l.breakClause = !!getVal("f_breakDate");
        const gName = getVal("f_guarantorName");
        if (gName)
          l.guarantors = [{ name: gName, phone: getVal("f_guarantorPhone") }];
        l.specialConditions = getVal("f_special");
        l.updatedAt = new Date().toISOString();
        saveState();
        addAuditEvent(
          "UPDATE",
          "lease",
          l.id,
          `Lease ${l.id} updated - rent ${fmtMoney(rent)}`,
          before,
          l,
        );
        toast(`Lease ${l.id} updated`, "success");
      }
    } else {
      const newId = `L-2026-${String(100 + getLeases().length).padStart(3, "0")}`;
      const newLease = {
        id: newId,
        tenantId: tenantId,
        tenantName: tenant?.name || "Unknown",
        tenant: tenant?.name || "Unknown",
        propertyId: propertyId,
        propertyName: prop?.name || "Unknown",
        property: prop?.name || "Unknown",
        unitIds: checkedUnits,
        unitCodes: unitCodes,
        unit: unitCodes[0],
        leaseType: getVal("f_leaseType"),
        status: getVal("f_status") || "Draft",
        renewalStatus: getVal("f_renewalStatus") || "Not Due",
        startDate: getVal("f_startDate"),
        start: getVal("f_startDate"),
        endDate: getVal("f_endDate"),
        end: getVal("f_endDate"),
        monthlyRent: rent,
        rent: rent,
        deposit: parseFloat(getVal("f_deposit")) || rent * 2,
        serviceCharge:
          parseFloat(getVal("f_serviceCharge")) || Math.floor(rent * 0.15),
        paymentFrequency: getVal("f_billing") || "Monthly",
        paymentDueDay: parseInt(getVal("f_dueDay")) || 15,
        reviewDate: getVal("f_reviewDate"),
        nextReviewDate: getVal("f_reviewDate"),
        escalationType: getVal("f_escType") || "Annual",
        escalationPercent: parseFloat(getVal("f_escPercent")) || 5,
        escalationRules: [],
        rentReviews: [],
        guarantors: getVal("f_guarantorName")
          ? [
              {
                name: getVal("f_guarantorName"),
                phone: getVal("f_guarantorPhone"),
              },
            ]
          : [],
        documents: [
          {
            id: `DOC-${newId}-1`,
            name: "Lease Agreement - Draft",
            type: "Agreement",
            date: new Date().toISOString().slice(0, 10),
          },
        ],
        breakClause: !!getVal("f_breakDate"),
        breakClauseDate: getVal("f_breakDate"),
        breakClauseNotice: getVal("f_breakNotice"),
        renewalTerms: getVal("f_renewalTerms"),
        specialConditions: getVal("f_special"),
        balance: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        activity: [
          {
            id: `ACT-${newId}-1`,
            timestamp: new Date().toISOString(),
            user: "Chanda Mwanza",
            action: "Lease created",
            description: `Lease ${newId} created for ${tenant?.name} at ${prop?.name}`,
          },
        ],
        termination: null,
      };
      getState().leases.push(newLease);
      // Link to tenant
      const tenantObj = getTenants().find((t) => t.id === tenantId);
      if (tenantObj) {
        if (!tenantObj.leaseIds.includes(newId)) tenantObj.leaseIds.push(newId);
        if (!tenantObj.propertyIds.includes(propertyId)) {
          tenantObj.propertyIds.push(propertyId);
          tenantObj.propertyNames.push(prop?.name);
        }
        checkedUnits.forEach((uid) => {
          if (!tenantObj.unitIds.includes(uid)) tenantObj.unitIds.push(uid);
        });
        unitCodes.forEach((code) => {
          if (!tenantObj.unitCodes.includes(code))
            tenantObj.unitCodes.push(code);
        });
      }
      // Update unit status to Occupied if lease Active
      if (newLease.status === "Active" || newLease.status === "Expiring Soon") {
        checkedUnits.forEach((uid) => {
          const u = getUnits().find((x) => x.id === uid);
          if (u) u.status = "Occupied";
        });
      }
      saveState();
      addAuditEvent(
        "CREATE",
        "lease",
        newId,
        `Lease ${newId} created for ${tenant?.name} - ${fmtMoney(rent)}/month`,
      );
      toast(`Lease ${newId} created`, "success");
    }
    closeLeaseModal();
    applyFilters();
  }

  // Rent Review
  function openReviewModal(leaseId, reviewId = null) {
    currentReviewLeaseId = leaseId;
    currentReviewId = reviewId;
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    const review = reviewId
      ? (lease.rentReviews || []).find((r) => r.id === reviewId)
      : null;
    const isEdit = !!review;
    const body = document.getElementById("reviewModalBody");
    body.innerHTML = `
      <div class="form-grid">
        <div><label class="form-label">Current Rent</label><input class="form-input" id="r_currentRent" type="number" value="${review?.currentRent || lease.monthlyRent || lease.rent || 0}"/></div>
        <div><label class="form-label req">Proposed Rent</label><input class="form-input" id="r_proposedRent" type="number" value="${review?.proposedRent || Math.floor((lease.monthlyRent || lease.rent || 0) * 1.08)}"/></div>
        <div><label class="form-label">Review Method</label><select class="form-select" id="r_method">${REVIEW_METHODS.map((m) => `<option ${review?.reviewMethod === m ? "selected" : ""}>${m}</option>`).join("")}</select></div>
        <div><label class="form-label">Percentage Increase</label><input class="form-input" id="r_percent" type="number" value="${review?.percentageIncrease || 8}"/></div>
        <div><label class="form-label">Effective Date</label><input class="form-input" id="r_effectiveDate" type="date" value="${review?.effectiveDate || new Date().toISOString().slice(0, 10)}"/></div>
        <div><label class="form-label">Status</label><select class="form-select" id="r_status">${REVIEW_STATUSES.map((s) => `<option ${review?.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
        <div class="f-group full"><label class="form-label">Notes</label><textarea class="form-textarea" id="r_notes">${review?.notes || ""}</textarea></div>
      </div>
      <div style="margin-top:12px;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;font-size:11px;color:var(--muted)">Workflow: Scheduled → Proposed → Pending Approval → Approved → Applied. When Applied, lease rent is updated via saveState().</div>
    `;
    document.getElementById("reviewModalBackdrop").classList.add("open");
  }
  function closeReviewModal() {
    document.getElementById("reviewModalBackdrop").classList.remove("open");
    currentReviewLeaseId = null;
    currentReviewId = null;
  }
  function saveReviewModal() {
    const lease = getLeases().find((l) => l.id === currentReviewLeaseId);
    if (!lease) return;
    const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
    const currentRent = parseFloat(getVal("r_currentRent")) || 0;
    const proposedRent = parseFloat(getVal("r_proposedRent")) || 0;
    if (!proposedRent) {
      toast("Proposed rent required", "error");
      return;
    }
    if (!lease.rentReviews) lease.rentReviews = [];
    if (currentReviewId) {
      const idx = lease.rentReviews.findIndex((r) => r.id === currentReviewId);
      if (idx >= 0) {
        lease.rentReviews[idx].currentRent = currentRent;
        lease.rentReviews[idx].proposedRent = proposedRent;
        lease.rentReviews[idx].reviewMethod = getVal("r_method");
        lease.rentReviews[idx].percentageIncrease =
          parseFloat(getVal("r_percent")) || 0;
        lease.rentReviews[idx].effectiveDate = getVal("r_effectiveDate");
        lease.rentReviews[idx].status = getVal("r_status");
        lease.rentReviews[idx].notes = getVal("r_notes");
      }
    } else {
      const newReview = {
        id: `RR-${lease.id}-${String(lease.rentReviews.length + 1).padStart(2, "0")}`,
        leaseId: lease.id,
        currentRent: currentRent,
        proposedRent: proposedRent,
        effectiveDate: getVal("r_effectiveDate"),
        reviewMethod: getVal("r_method"),
        percentageIncrease: parseFloat(getVal("r_percent")) || 0,
        status: getVal("r_status"),
        approvedBy: "Chanda Mwanza",
        notes: getVal("r_notes"),
      };
      lease.rentReviews.push(newReview);
    }
    saveState();
    addAuditEvent(
      "UPDATE",
      "lease",
      lease.id,
      `Rent review ${currentReviewId || "new"} - ${fmtMoney(currentRent)} → ${fmtMoney(proposedRent)}`,
    );
    toast("Rent review saved", "success");
    closeReviewModal();
    if (selectedId === lease.id) renderDrawerBody(lease.id);
    applyFilters();
  }
  function applyReview(leaseId, reviewId) {
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    const review = (lease.rentReviews || []).find((r) => r.id === reviewId);
    if (!review) return;
    showConfirm(
      `Apply rent review ${reviewId}? Current: ${fmtMoney(review.currentRent)} → Proposed: ${fmtMoney(review.proposedRent)} effective ${fmtDate(review.effectiveDate)}. Lease rent will be updated and history preserved.`,
      () => {
        const before = { ...lease };
        lease.monthlyRent = review.proposedRent;
        lease.rent = review.proposedRent;
        review.status = "Applied";
        review.appliedAt = new Date().toISOString().slice(0, 10);
        lease.reviewDate = review.effectiveDate;
        lease.nextReviewDate = review.effectiveDate;
        // Update tenant monthly rent if linked
        const tenant = getTenants().find((t) => t.id === lease.tenantId);
        if (tenant) {
          tenant.monthlyRent = review.proposedRent;
          tenant.rent = review.proposedRent;
        }
        saveState();
        addAuditEvent(
          "UPDATE",
          "lease",
          leaseId,
          `Rent review applied: ${fmtMoney(review.currentRent)} → ${fmtMoney(review.proposedRent)}`,
          before,
          { ...lease },
        );
        toast(
          `Lease ${leaseId} rent updated to ${fmtMoney(review.proposedRent)}`,
          "success",
        );
        if (selectedId === leaseId) renderDrawerBody(leaseId);
        applyFilters();
      },
    );
  }

  // Escalation
  function openEscalationModal(leaseId) {
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    // Reuse review modal for escalation creation
    const body = document.getElementById("reviewModalBody");
    const modalBackdrop = document.getElementById("reviewModalBackdrop");
    document.querySelector("#reviewModalBackdrop .modal-head h3").textContent =
      "Rent Escalation";
    body.innerHTML = `
      <div class="form-grid">
        <div><label class="form-label">Type</label><select class="form-select" id="e_type">${ESCALATION_TYPES.map((t) => `<option ${lease.escalationType === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div><label class="form-label">Percentage %</label><input type="number" class="form-input" id="e_percent" value="${lease.escalationPercent || 5}"/></div>
        <div><label class="form-label">Current Rent</label><input type="number" class="form-input" id="e_currentRent" value="${lease.monthlyRent || lease.rent || 0}" readonly/></div>
        <div><label class="form-label">Effective Date</label><input type="date" class="form-input" id="e_effectiveDate" value="${new Date().toISOString().slice(0, 10)}"/></div>
      </div>
      <div style="margin-top:12px;padding:10px;background:var(--blue-light);border:1px solid var(--blue-border);border-radius:8px;font-size:12px">
        <div>Current: <strong>${fmtMoney(lease.monthlyRent || lease.rent)}</strong></div>
        <div>New: <strong id="e_newRentPreview">${fmtMoney((lease.monthlyRent || lease.rent || 0) * 1.05)}</strong></div>
      </div>
    `;
    // Live calculation
    setTimeout(() => {
      const percentEl = document.getElementById("e_percent");
      const currentEl = document.getElementById("e_currentRent");
      const previewEl = document.getElementById("e_newRentPreview");
      const calc = () => {
        const cur = parseFloat(currentEl.value) || 0;
        const pct = parseFloat(percentEl.value) || 0;
        const ne = cur * (1 + pct / 100);
        if (previewEl) previewEl.textContent = fmtMoney(ne);
      };
      percentEl?.addEventListener("input", calc);
    }, 100);
    modalBackdrop.classList.add("open");
    currentReviewLeaseId = leaseId;
    currentReviewId = "escalation";
    // Override save button to create escalation
    const saveBtn = document.getElementById("btnSaveReview");
    saveBtn.textContent = "Create Escalation";
    saveBtn.onclick = () => {
      const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
      const cur = parseFloat(getVal("e_currentRent")) || 0;
      const pct = parseFloat(getVal("e_percent")) || 0;
      const newRent = cur * (1 + pct / 100);
      if (!lease.escalationRules) lease.escalationRules = [];
      lease.escalationRules.push({
        id: `ESC-${lease.id}-${String(lease.escalationRules.length + 1).padStart(2, "0")}`,
        type: getVal("e_type"),
        percent: pct,
        currentRent: cur,
        newRent: newRent,
        effectiveDate: getVal("e_effectiveDate"),
        applied: false,
      });
      saveState();
      addAuditEvent(
        "UPDATE",
        "lease",
        lease.id,
        `Escalation rule added: ${pct}% → ${fmtMoney(newRent)}`,
      );
      toast("Escalation rule added", "success");
      closeReviewModal();
      document.querySelector(
        "#reviewModalBackdrop .modal-head h3",
      ).textContent = "Rent Review";
      saveBtn.textContent = "Save Review";
      saveBtn.onclick = saveReviewModal;
      if (selectedId === lease.id) renderDrawerBody(lease.id);
    };
  }
  function applyEscalation(leaseId, escId) {
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    const esc = (lease.escalationRules || []).find((e) => e.id === escId);
    if (!esc) return;
    showConfirm(
      `Apply escalation ${escId}? ${esc.percent}% increase: ${fmtMoney(esc.currentRent)} → ${fmtMoney(esc.newRent)} effective ${fmtDate(esc.effectiveDate)}. Historical records preserved.`,
      () => {
        const before = { ...lease };
        lease.monthlyRent = esc.newRent;
        lease.rent = esc.newRent;
        esc.applied = true;
        esc.appliedAt = new Date().toISOString().slice(0, 10);
        // Update tenant
        const tenant = getTenants().find((t) => t.id === lease.tenantId);
        if (tenant) {
          tenant.monthlyRent = esc.newRent;
          tenant.rent = esc.newRent;
        }
        saveState();
        addAuditEvent(
          "UPDATE",
          "lease",
          leaseId,
          `Escalation applied: ${fmtMoney(esc.currentRent)} → ${fmtMoney(esc.newRent)}`,
          before,
          { ...lease },
        );
        toast(`Escalation applied to ${leaseId}`, "success");
        if (selectedId === leaseId) renderDrawerBody(leaseId);
        applyFilters();
      },
    );
  }

  function renewLease(leaseId) {
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    const newEnd = prompt(
      `Renew lease ${leaseId}. Enter new end date (YYYY-MM-DD):`,
      new Date(
        new Date(lease.endDate || lease.end).getTime() + 365 * 24 * 3600 * 1000,
      )
        .toISOString()
        .slice(0, 10),
    );
    if (!newEnd) return;
    showConfirm(
      `Renew lease ${leaseId}? Current end ${fmtDate(lease.endDate || lease.end)} → New end ${fmtDate(newEnd)}. This will create a renewal chain: ${leaseId} → L-2027-XXX (history preserved).`,
      () => {
        const newId = `L-2027-${String(100 + getLeases().length).padStart(3, "0")}`;
        const renewed = {
          ...JSON.parse(JSON.stringify(lease)),
          id: newId,
          startDate: lease.endDate || lease.end,
          start: lease.endDate || lease.end,
          endDate: newEnd,
          end: newEnd,
          status: "Active",
          renewalStatus: "Renewed",
          previousLeaseId: lease.id,
          rentReviews: [],
          escalationRules: [],
          createdAt: new Date().toISOString().slice(0, 10),
          activity: [
            {
              id: `ACT-${newId}-1`,
              timestamp: new Date().toISOString(),
              user: "Chanda Mwanza",
              action: "Lease renewed",
              description: `Renewed from ${lease.id}`,
            },
          ],
        };
        lease.status = "Renewed";
        lease.renewalStatus = "Renewed";
        lease.renewedTo = newId;
        getState().leases.push(renewed);
        // Link to tenant
        const tenant = getTenants().find((t) => t.id === lease.tenantId);
        if (tenant && !tenant.leaseIds.includes(newId))
          tenant.leaseIds.push(newId);
        saveState();
        addAuditEvent(
          "CREATE",
          "lease",
          newId,
          `Lease renewed from ${leaseId} to ${newId}`,
        );
        addAuditEvent("UPDATE", "lease", leaseId, `Lease renewed to ${newId}`);
        toast(`Lease renewed: ${leaseId} → ${newId}`, "success");
        applyFilters();
        if (selectedId === leaseId) renderDrawerBody(leaseId);
        goToPage(`leases.html?id=${newId}`);
      },
    );
  }

  function openTerminationModal(leaseId) {
    currentTerminationLeaseId = leaseId;
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    const body = document.getElementById("terminationModalBody");
    body.innerHTML = `
      <div class="termination-box"><h4>⚠️ Terminate Lease ${lease.id} / Move-Out</h4><div style="font-size:12px;color:var(--red-600);line-height:1.5">This will: Lease → Terminated, Tenant → Active/Inactive depending on other leases, Unit → Vacant (if no other active lease for same unit). Deposit deductions and final refund will be captured.</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">
        <div><label class="form-label req">Termination Date</label><input type="date" class="form-input" id="t_terminationDate" value="${new Date().toISOString().slice(0, 10)}"/></div>
        <div><label class="form-label">Notice Date</label><input type="date" class="form-input" id="t_noticeDate" value="${new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)}"/></div>
        <div class="f-group full"><label class="form-label req">Reason</label><select class="form-select" id="t_reason"><option>End of term</option><option>Early termination - tenant request</option><option>Breach of contract</option><option>Non-payment</option><option>Mutual agreement</option><option>Business closure</option></select></div>
        <div><label class="form-label">Final Rent Due</label><input type="number" class="form-input" id="t_finalRent" value="${lease.monthlyRent || lease.rent || 0}"/></div>
        <div><label class="form-label">Outstanding Charges</label><input type="number" class="form-input" id="t_outstanding" value="${lease.balance || 0}"/></div>
        <div><label class="form-label">Deposit Held</label><input type="number" class="form-input" id="t_depositHeld" value="${lease.deposit || 0}"/></div>
        <div><label class="form-label">Deposit Deductions</label><input type="number" class="form-input" id="t_deductions" value="0"/></div>
        <div><label class="form-label">Final Refund</label><input type="number" class="form-input" id="t_refund" value="${lease.deposit || 0}" readonly/></div>
        <div><label class="form-label">Key Returned</label><select class="form-select" id="t_keyReturned"><option>Yes</option><option>No</option><option>Pending</option></select></div>
        <div><label class="form-label">Exit Inspection</label><select class="form-select" id="t_inspection"><option>Scheduled</option><option>Completed</option><option>Pending</option></select></div>
        <div class="f-group full"><label class="form-label">Condition Report</label><textarea class="form-textarea" id="t_condition">Unit inspected. Normal wear and tear. Keys returned. No major damages.</textarea></div>
        <div class="f-group full"><label class="form-label">Notes</label><textarea class="form-textarea" id="t_notes"></textarea></div>
      </div>
    `;
    // Live calc refund
    setTimeout(() => {
      const held = document.getElementById("t_depositHeld");
      const ded = document.getElementById("t_deductions");
      const refund = document.getElementById("t_refund");
      const calc = () => {
        const h = parseFloat(held.value) || 0;
        const d = parseFloat(ded.value) || 0;
        if (refund) refund.value = Math.max(0, h - d);
      };
      held?.addEventListener("input", calc);
      ded?.addEventListener("input", calc);
    }, 100);
    document.getElementById("terminationModalBackdrop").classList.add("open");
  }
  function closeTerminationModal() {
    document
      .getElementById("terminationModalBackdrop")
      .classList.remove("open");
    currentTerminationLeaseId = null;
  }
  function confirmTermination() {
    const leaseId = currentTerminationLeaseId;
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    const getVal = (id) => document.getElementById(id)?.value?.trim() || "";
    const termDate = getVal("t_terminationDate");
    if (!termDate) {
      toast("Termination date required", "error");
      return;
    }
    const termination = {
      terminationDate: termDate,
      noticeDate: getVal("t_noticeDate"),
      reason: getVal("t_reason"),
      finalRent: parseFloat(getVal("t_finalRent")) || 0,
      outstandingCharges: parseFloat(getVal("t_outstanding")) || 0,
      depositHeld: parseFloat(getVal("t_depositHeld")) || 0,
      depositDeductions: parseFloat(getVal("t_deductions")) || 0,
      finalRefund: parseFloat(getVal("t_refund")) || 0,
      keyReturned: getVal("t_keyReturned"),
      exitInspection: getVal("t_inspection"),
      conditionReport: getVal("t_condition"),
      notes: getVal("t_notes"),
      terminatedBy: "Chanda Mwanza",
      terminatedAt: new Date().toISOString(),
    };
    const before = { ...lease };
    lease.termination = termination;
    lease.status = "Terminated";
    lease.renewalStatus = "Not Due";
    lease.endDate = termDate;
    lease.end = termDate;
    // Update unit status: check if tenant has other active leases for same units
    const tenantId = lease.tenantId;
    const otherActiveLeases = getLeases().filter(
      (l) =>
        l.id !== leaseId &&
        l.tenantId === tenantId &&
        (l.status === "Active" || l.status === "Expiring Soon") &&
        l.unitIds?.some((uid) => (lease.unitIds || []).includes(uid)),
    );
    (lease.unitIds || []).forEach((uid) => {
      const stillOccupied = otherActiveLeases.some((l) =>
        (l.unitIds || []).includes(uid),
      );
      if (!stillOccupied) {
        const u = getUnits().find((x) => x.id === uid);
        if (u) u.status = "Vacant";
      }
    });
    // Update tenant status if no other active leases
    const tenant = getTenants().find((t) => t.id === tenantId);
    if (tenant) {
      const tenantActiveLeases = getLeases().filter(
        (l) =>
          l.id !== leaseId &&
          l.tenantId === tenantId &&
          (l.status === "Active" || l.status === "Expiring Soon"),
      );
      if (tenantActiveLeases.length === 0) {
        tenant.status = "Inactive";
      }
    }
    saveState();
    addAuditEvent(
      "UPDATE",
      "lease",
      leaseId,
      `Lease terminated - ${termination.reason}`,
      before,
      { ...lease },
    );
    toast(`Lease ${leaseId} terminated`, "success");
    closeTerminationModal();
    if (selectedId === leaseId) renderDrawerBody(leaseId);
    applyFilters();
  }

  function generateAgreement(leaseId) {
    const lease = getLeases().find((l) => l.id === leaseId);
    if (!lease) return;
    const tenant = getTenants().find((t) => t.id === lease.tenantId);
    const content = `PROPERTYPRO ZAMBIA LTD - LEASE AGREEMENT
Lease ID: ${lease.id}
Tenant: ${lease.tenantName || lease.tenant} (${lease.tenantId})
Property: ${lease.propertyName || lease.property} (${lease.propertyId})
Units: ${(lease.unitCodes || []).join(", ")}
Type: ${lease.leaseType}
Start: ${fmtDate(lease.startDate || lease.start)} - End: ${fmtDate(lease.endDate || lease.end)}
Rent: ${fmtMoney(lease.monthlyRent || lease.rent)} per month
Deposit: ${fmtMoney(lease.deposit)}
Service Charge: ${fmtMoney(lease.serviceCharge || 0)}
Escalation: ${lease.escalationType} ${lease.escalationPercent}%
Payment: ${lease.paymentFrequency} due ${lease.paymentDueDay}th

Generated on ${new Date().toLocaleDateString()} by PropertyPro v3
This is a system-generated agreement placeholder. Attach signed copy as document.
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${leaseId}-Agreement.txt`;
    a.click();
    URL.revokeObjectURL(url);
    // Add document record
    if (!lease.documents) lease.documents = [];
    lease.documents.push({
      id: `DOC-${leaseId}-${lease.documents.length + 1}`,
      name: `Lease Agreement ${leaseId}`,
      type: "Agreement",
      date: new Date().toISOString().slice(0, 10),
    });
    saveState();
    toast(`Agreement generated for ${leaseId}`, "success");
    if (selectedId === leaseId) renderDrawerBody(leaseId);
  }

  function exportLeases() {
    const rows = filtered.length ? filtered : getLeases();
    const csv = [
      [
        "Lease ID",
        "Tenant",
        "Property",
        "Units",
        "Type",
        "Start Date",
        "End Date",
        "Monthly Rent",
        "Deposit",
        "Review Date",
        "Status",
        "Balance",
        "Renewal Status",
      ].join(","),
      ...rows.map((l) =>
        [
          l.id,
          `"${l.tenantName || l.tenant || ""}"`,
          `"${l.propertyName || l.property || ""}"`,
          `"${(l.unitCodes || []).join(";")}"`,
          l.leaseType,
          l.startDate || l.start || "",
          l.endDate || l.end || "",
          l.monthlyRent || l.rent || 0,
          l.deposit || 0,
          l.reviewDate || l.nextReviewDate || "",
          l.status,
          l.balance || 0,
          l.renewalStatus || "",
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Leases.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast("Leases exported", "success");
  }

  function showConfirm(msg, onOk) {
    const backdrop = document.getElementById("confirmBackdrop");
    document.getElementById("confirmBody").textContent = msg;
    backdrop.classList.add("open");
    const okBtn = document.getElementById("confirmOk");
    const cancelBtn = document.getElementById("confirmCancel");
    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
    newCancel.addEventListener("click", closeConfirm);
    newOk.addEventListener("click", () => {
      closeConfirm();
      onOk();
    });
  }
  function closeConfirm() {
    document.getElementById("confirmBackdrop").classList.remove("open");
  }
  function escapeHtml(str) {
    return window.escapeHtml
      ? window.escapeHtml(str)
      : String(str).replace(
          /[&<>"']/g,
          (m) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[m],
        );
  }
  function goToPage(p) {
    window.goToPage ? window.goToPage(p) : (location.href = p);
  }

  window.LeasesPage = {
    openModal: openLeaseModal,
    closeDrawer,
    openReview: openReviewModal,
    editReview: openReviewModal,
    applyReview,
    openEscalation: openEscalationModal,
    applyEscalation,
    renew: renewLease,
    generateAgreement,
    openTermination: openTerminationModal,
  };
})();

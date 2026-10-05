/**
 * Finance Arrears Management - ToR 8.5 - PropertyPro Zambia Ltd v3
 * Auto-calculate aging buckets dynamically from state.invoices
 * KPIs: Total Portfolio, 90+ Critical, Active Payment Plans, Legal Escalations
 * Actions: Trigger Demand Notice (SMS/Email mock + logs), Create Payment Plan, Export Legal Handover Pack
 */

(function () {
  const STORAGE_KEY = "propertypro_v3";
  let calculatedArrears = []; // derived from invoices
  let filteredArrears = [];
  let currentPage = 1;
  let pageSize = 50;
  let selectedTenantId = null;
  let currentTab = "buckets";
  let ctxTenantId = null;

  function getState() {
    return window.state || {};
  }
  function getInvoices() {
    return getState().invoices || [];
  }
  function getProperties() {
    return getState().properties || [];
  }
  function getTenants() {
    return getState().tenants || [];
  }
  function getPaymentPlans() {
    return getState().paymentPlans || [];
  }
  function getAudit() {
    return getState().auditTrail || [];
  }

  function openTenantContext(tenantId, propertyName) {
    const tenant = getTenants().find((t) => t.id === tenantId);
    const propName = propertyName || tenant?.property || "";
    const activeLease = (getState().leases || []).find(
      (l) =>
        (l.tenantId === tenantId || l.tenant === tenant?.name) &&
        l.status === "Active",
    );
    if (activeLease && window.goToPage) {
      window.goToPage("leases.html?id=" + activeLease.id);
    } else if (tenantId && window.goToPage) {
      window.goToPage("tenants.html?id=" + tenantId);
    } else if (propName && window.goToPage) {
      window.goToPage("units.html?property=" + encodeURIComponent(propName));
    }
  }
  function openPropertyUnits(propertyName) {
    if (propertyName && window.goToPage) {
      window.goToPage(
        "units.html?property=" + encodeURIComponent(propertyName),
      );
    }
  }
  window.openTenantContext = openTenantContext;
  window.openPropertyUnits = openPropertyUnits;

  function fmtMoney(v) {
    return (
      "ZMW " +
      Number(v || 0).toLocaleString("en-ZM", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }
  function fmtMoneySmall(v) {
    return "ZMW " + Number(v || 0).toLocaleString("en-ZM");
  }
  function fmtDate(d) {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      if (isNaN(dt)) return d;
      return dt.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  }

  function riskPill(risk) {
    const map = { Low: "gray", Medium: "blue", High: "amber", Critical: "red" };
    return `<span class="pill ${map[risk] || "gray"}" style="font-weight:800">${risk}</span>`;
  }
  function stagePill(stage) {
    const map = {
      Reminder: "gray",
      "Demand Letter": "blue",
      "Final Notice": "amber",
      "Legal Notice": "red",
      Litigation: "red",
      "Payment Plan": "violet",
      Active: "gray",
    };
    return `<span class="pill ${map[stage] || "gray"}">${stage}</span>`;
  }

  // --- Core: Auto-calculate aging buckets dynamically from state.invoices ---
  function calculateArrearsFromInvoices() {
    const invoices = getInvoices().filter(
      (inv) => (inv.outstandingAmount || 0) > 0 && inv.status !== "Paid",
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const grouped = {};

    invoices.forEach((inv) => {
      const tenantId = inv.tenantId || inv.tenant || "UNKNOWN";
      if (!grouped[tenantId]) {
        grouped[tenantId] = {
          tenantId,
          tenantName: inv.tenantName || inv.tenant || tenantId,
          propertyId: inv.propertyId,
          propertyName: inv.propertyName || inv.property || "—",
          property: inv.propertyName || inv.property || "—",
          city:
            getProperties().find((p) => p.id === inv.propertyId)?.city ||
            "Lusaka",
          totalDue: 0,
          current: 0, // 0-30
          d31_60: 0,
          d61_90: 0,
          d90: 0,
          buckets: { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
          maxDaysOverdue: 0,
          earliestDue: inv.dueDate,
          latestDue: inv.dueDate,
          invoiceIds: [],
          invoices: [],
          invoiceCount: 0,
        };
      }
      const g = grouped[tenantId];
      const dueDate = new Date(inv.dueDate || inv.due);
      const daysOverdue = Math.floor((today - dueDate) / (24 * 3600 * 1000));
      const effectiveOverdue = Math.max(0, daysOverdue);
      const amt = inv.outstandingAmount || 0;

      g.totalDue += amt;
      g.invoiceIds.push(inv.id);
      g.invoices.push(inv);
      g.invoiceCount++;

      if (daysOverdue <= 30) {
        g.current += amt;
        g.buckets["0-30"] += amt;
      } else if (daysOverdue <= 60) {
        g.d31_60 += amt;
        g.buckets["31-60"] += amt;
      } else if (daysOverdue <= 90) {
        g.d61_90 += amt;
        g.buckets["61-90"] += amt;
      } else {
        g.d90 += amt;
        g.buckets["90+"] += amt;
      }

      if (effectiveOverdue > g.maxDaysOverdue)
        g.maxDaysOverdue = effectiveOverdue;
      if (new Date(inv.dueDate) < new Date(g.earliestDue))
        g.earliestDue = inv.dueDate;
      if (new Date(inv.dueDate) > new Date(g.latestDue))
        g.latestDue = inv.dueDate;
    });

    // Convert to array and compute escalation + risk
    calculatedArrears = Object.values(grouped)
      .map((g) => {
        // Escalation Stage logic ToR 8.5
        let escalationStage = "Reminder";
        if (g.maxDaysOverdue >= 120) escalationStage = "Litigation";
        else if (g.maxDaysOverdue >= 90) escalationStage = "Legal Notice";
        else if (g.maxDaysOverdue >= 61) escalationStage = "Final Notice";
        else if (g.maxDaysOverdue >= 31) escalationStage = "Demand Letter";
        else escalationStage = "Reminder";

        // Check if payment plan active overrides stage
        const activePlan = getPaymentPlans().find(
          (p) => p.tenantId === g.tenantId && p.status === "Active",
        );
        if (activePlan) escalationStage = "Payment Plan";

        // Risk Score calculation: weighted by total + 90+ proportion + days
        const total = g.totalDue;
        const p90Ratio = g.buckets["90+"] / (total || 1);
        let riskScore = "Low";
        let riskPoints = 0;
        if (total > 250000 || g.maxDaysOverdue >= 90 || p90Ratio >= 0.5)
          riskPoints += 3;
        if (total > 100000 || g.maxDaysOverdue >= 61) riskPoints += 2;
        if (total > 30000 || g.maxDaysOverdue >= 31) riskPoints += 1;
        if (g.buckets["90+"] > 0) riskPoints += 1;
        if (riskPoints >= 4) riskScore = "Critical";
        else if (riskPoints >= 3) riskScore = "High";
        else if (riskPoints >= 1) riskScore = "Medium";
        else riskScore = "Low";

        // Next action
        let nextAction = "Reminder Call";
        if (escalationStage === "Demand Letter") nextAction = "Demand Letter";
        else if (escalationStage === "Final Notice")
          nextAction = "Final Notice + Call";
        else if (escalationStage === "Legal Notice")
          nextAction = "Legal Notice";
        else if (escalationStage === "Litigation")
          nextAction = "Litigation / Handover Pack";
        else if (escalationStage === "Payment Plan")
          nextAction = "Monitor Plan";

        return {
          ...g,
          escalationStage,
          riskScore,
          risk: riskScore,
          nextAction,
          // Compatibility fields for table
          "0-30": g.buckets["0-30"],
          "31-60": g.buckets["31-60"],
          "61-90": g.buckets["61-90"],
          "90+": g.buckets["90+"],
          total: g.totalDue,
          balance: g.totalDue,
          totalOutstanding: g.totalDue,
          current: g.buckets["0-30"],
        };
      })
      .sort((a, b) => b.totalDue - a.totalDue);

    return calculatedArrears;
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.initCommon && window.initCommon("finance-arrears");
    setTimeout(() => {
      // Ensure paymentPlans array exists in state
      if (!getState().paymentPlans) {
        getState().paymentPlans = [];
        saveState();
      }
      if (!getState().legalPacks) {
        getState().legalPacks = [];
        saveState();
      }
      populateFilters();
      bindEvents();
      recalcAndRender();
      handleDeepLink();
    }, 180);
  });

  function handleDeepLink() {
    const params = new URLSearchParams(location.search);
    const id = params.get("tenant") || params.get("id");
    if (id) {
      setTimeout(() => openDrawer(id), 500);
    }
  }

  function populateFilters() {
    const propSelect = document.getElementById("filterProperty");
    const props = getProperties();
    if (propSelect)
      propSelect.innerHTML =
        '<option value="">All Properties</option>' +
        props
          .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
          .join("");
  }

  function bindEvents() {
    document
      .getElementById("searchInputLocal")
      ?.addEventListener("input", debounce(applyFilters, 300));
    [
      "filterProperty",
      "filterRisk",
      "filterStage",
      "filterMinDue",
      "filterFrom",
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", applyFilters);
      document
        .getElementById(id)
        ?.addEventListener("input", debounce(applyFilters, 300));
    });
    document
      .getElementById("btnResetFilters")
      ?.addEventListener("click", resetFilters);
    document
      .getElementById("btnRecalc")
      ?.addEventListener("click", recalcAndRender);
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
      const max = Math.ceil(filteredArrears.length / pageSize);
      if (currentPage < max) {
        currentPage++;
        renderTable();
      }
    });
    document
      .getElementById("btnExportCSV")
      ?.addEventListener("click", exportCSV);
    document
      .getElementById("btnBulkDemand")
      ?.addEventListener("click", bulkDemandNotices);
    document.getElementById("btnLegalQueue")?.addEventListener("click", () => {
      document.getElementById("filterStage").value = "Legal Notice";
      applyFilters();
    });

    // Drawer
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
        if (selectedTenantId) renderDrawerBody(selectedTenantId);
      });
    });
    document
      .getElementById("btnPrintArrears")
      ?.addEventListener("click", () => {
        if (selectedTenantId) printArrears(selectedTenantId);
      });
    document.getElementById("btnViewTenant")?.addEventListener("click", () => {
      if (!selectedTenantId) return;
      const arrears = calculatedArrears.find(
        (a) => a.tenantId === selectedTenantId,
      );
      const propName = arrears?.propertyName || arrears?.property || "";
      const lease = (getState().leases || []).find(
        (l) => l.tenantId === selectedTenantId && l.status === "Active",
      );
      if (lease && window.goToPage) {
        window.goToPage("leases.html?id=" + lease.id);
      } else if (window.goToPage) {
        window.goToPage("tenants.html?id=" + selectedTenantId);
      } else {
        window.location.href = `../pages/tenants.html?id=${selectedTenantId}`;
      }
    });
    document.getElementById("btnViewUnits")?.addEventListener("click", () => {
      if (!selectedTenantId) return;
      const arrears = calculatedArrears.find(
        (a) => a.tenantId === selectedTenantId,
      );
      const propName = arrears?.propertyName || arrears?.property || "";
      if (propName && window.goToPage) {
        window.goToPage("units.html?property=" + encodeURIComponent(propName));
      }
    });
    document
      .getElementById("btnDemandNotice")
      ?.addEventListener("click", () => {
        if (selectedTenantId) openDemandModal(selectedTenantId);
      });
    document.getElementById("btnCreatePlan")?.addEventListener("click", () => {
      if (selectedTenantId) openPlanModal(selectedTenantId);
    });
    document.getElementById("btnLegalPack")?.addEventListener("click", () => {
      if (selectedTenantId) openLegalModal(selectedTenantId);
    });

    // Demand modal
    document
      .getElementById("btnCloseDemandModal")
      ?.addEventListener("click", closeDemandModal);
    document
      .getElementById("btnCancelDemand")
      ?.addEventListener("click", closeDemandModal);
    document
      .getElementById("demandModalBackdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "demandModalBackdrop") closeDemandModal();
      });
    document
      .getElementById("btnConfirmDemand")
      ?.addEventListener("click", confirmDemandNotice);
    document
      .getElementById("demandTemplate")
      ?.addEventListener("change", updateDemandPreview);

    // Plan modal
    document
      .getElementById("btnClosePlanModal")
      ?.addEventListener("click", closePlanModal);
    document
      .getElementById("btnCancelPlan")
      ?.addEventListener("click", closePlanModal);
    document
      .getElementById("planModalBackdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "planModalBackdrop") closePlanModal();
      });
    document
      .getElementById("btnConfirmPlan")
      ?.addEventListener("click", confirmPaymentPlan);
    document
      .getElementById("planInstallments")
      ?.addEventListener("change", updatePlanPreview);
    document
      .getElementById("planTotal")
      ?.addEventListener("input", updatePlanPreview);

    // Legal modal
    document
      .getElementById("btnCloseLegalModal")
      ?.addEventListener("click", closeLegalModal);
    document
      .getElementById("btnCancelLegal")
      ?.addEventListener("click", closeLegalModal);
    document
      .getElementById("legalModalBackdrop")
      ?.addEventListener("click", (e) => {
        if (e.target.id === "legalModalBackdrop") closeLegalModal();
      });
    document
      .getElementById("btnDownloadJson")
      ?.addEventListener("click", downloadLegalJson);
    document
      .getElementById("btnDownloadPdf")
      ?.addEventListener("click", downloadLegalPdf);

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

  function recalcAndRender() {
    calculateArrearsFromInvoices();
    renderKPIs();
    applyFilters();
  }

  function resetFilters() {
    document.getElementById("searchInputLocal").value = "";
    document.getElementById("filterProperty").value = "";
    document.getElementById("filterRisk").value = "";
    document.getElementById("filterStage").value = "";
    document.getElementById("filterMinDue").value = "";
    document.getElementById("filterFrom").value = "";
    applyFilters();
  }

  function applyFilters() {
    const q = (
      document.getElementById("searchInputLocal")?.value || ""
    ).toLowerCase();
    const prop = document.getElementById("filterProperty")?.value || "";
    const risk = document.getElementById("filterRisk")?.value || "";
    const stage = document.getElementById("filterStage")?.value || "";
    const minDue = Number(document.getElementById("filterMinDue")?.value || 0);
    const from = document.getElementById("filterFrom")?.value || "";

    filteredArrears = calculatedArrears.filter((a) => {
      if (q) {
        const hay =
          `${a.tenantName} ${a.propertyName} ${a.tenantId} ${a.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (prop && a.propertyId !== prop) return false;
      if (risk && a.riskScore !== risk) return false;
      if (stage && a.escalationStage !== stage) return false;
      if (minDue && a.totalDue < minDue) return false;
      if (from && a.earliestDue < from) return false;
      return true;
    });

    currentPage = 1;
    renderTable();
    renderKPIs();
  }

  function renderKPIs() {
    const totalPortfolio = calculatedArrears.reduce(
      (s, a) => s + (a.totalDue || 0),
      0,
    );
    const critical90 = calculatedArrears.reduce(
      (s, a) => s + (a.buckets["90+"] || 0),
      0,
    );
    const activePlans = getPaymentPlans().filter(
      (p) => p.status === "Active",
    ).length;
    const legalCount = calculatedArrears.filter(
      (a) =>
        a.escalationStage === "Legal Notice" ||
        a.escalationStage === "Litigation",
    ).length;
    const totalTenants = calculatedArrears.length;

    const kpiGrid = document.getElementById("kpiGrid");
    if (!kpiGrid) return;
    kpiGrid.innerHTML = `
      <div class="kpi accent-red">
        <div class="kpi-top"><span class="kpi-label">Total Portfolio Arrears</span><span class="kpi-icon red">₿</span></div>
        <div class="kpi-value">${fmtMoneySmall(totalPortfolio)}</div>
        <div class="kpi-meta"><span class="trend down">${totalTenants} tenants</span><span>Dynamic from state.invoices</span></div>
      </div>
      <div class="kpi accent-amber">
        <div class="kpi-top"><span class="kpi-label">90+ Days Critical Arrears</span><span class="kpi-icon amber">!</span></div>
        <div class="kpi-value">${fmtMoneySmall(critical90)}</div>
        <div class="kpi-meta"><span class="trend down">${((critical90 / totalPortfolio) * 100 || 0).toFixed(1)}% of portfolio</span><span>${calculatedArrears.filter((a) => a.buckets["90+"] > 0).length} tenants in 90+</span></div>
      </div>
      <div class="kpi accent-blue">
        <div class="kpi-top"><span class="kpi-label">Active Payment Plans</span><span class="kpi-icon blue">📋</span></div>
        <div class="kpi-value">${activePlans}</div>
        <div class="kpi-meta"><span class="trend up">Monitored</span><span>Updates tenant status to Payment Plan</span></div>
      </div>
      <div class="kpi accent-slate">
        <div class="kpi-top"><span class="kpi-label">Legal Escalations Count</span><span class="kpi-icon">⚖️</span></div>
        <div class="kpi-value">${legalCount}</div>
        <div class="kpi-meta"><span class="trend down">Legal Notice + Litigation</span><span>Handover Packs ready</span></div>
      </div>
    `;

    document.getElementById("countLabel").textContent = filteredArrears.length;
    document.getElementById("totalLabel").textContent = fmtMoneySmall(
      filteredArrears.reduce((s, a) => s + (a.totalDue || 0), 0),
    ).replace("ZMW ", "");
    document.getElementById("criticalLabel").textContent = fmtMoneySmall(
      filteredArrears.reduce((s, a) => s + (a.buckets["90+"] || 0), 0),
    );
  }

  function renderTable() {
    const tbody = document.getElementById("arrearsTbody");
    const tableInfo = document.getElementById("tableInfo");
    if (!tbody) return;
    const total = filteredArrears.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > maxPage) currentPage = maxPage;
    const start = (currentPage - 1) * pageSize;
    const pageData = filteredArrears.slice(start, start + pageSize);

    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="ico">📊</div><h3>No arrears found</h3><p>All tenants up to date or adjust filters • Aging auto-calculated from state.invoices</p></div></td></tr>`;
      if (tableInfo) tableInfo.textContent = `Showing 0 of ${total}`;
      return;
    }

    tbody.innerHTML = pageData
      .map(
        (a) => `
      <tr>
        <td><div style="font-weight:700"><a href="#" style="color:#0F172A;font-weight:700;text-decoration:none" onclick="event.preventDefault(); window.openTenantContext(a.tenantId, a.propertyName); return false;">${escapeHtml(a.tenantName)} ↗</a></div><div style="font-size:11px;color:#64748B" class="mono">${escapeHtml(a.tenantId)} • ${a.invoiceCount} inv • <a href="#" style="color:#2563EB;text-decoration:none" onclick="event.preventDefault(); const lease=(window.state.leases||[]).find(l=> l.tenantId===a.tenantId && l.status==='Active'); if(lease && window.goToPage){ window.goToPage('leases.html?id='+lease.id); } else { window.openTenantContext(a.tenantId, a.propertyName); } return false;">Active Lease</a></div></td>
        <td><div><a href="#" style="color:#0F172A;text-decoration:none" onclick="event.preventDefault(); window.openPropertyUnits(a.propertyName); return false;">${escapeHtml(a.propertyName)} ↗</a></div><div style="font-size:11px;color:#64748B">${escapeHtml(a.city)} • <a href="#" style="color:#64748B;text-decoration:none" onclick="event.preventDefault(); window.openPropertyUnits(a.propertyName); return false;">View Units</a></div></td>
        <td class="amount" style="font-weight:800">${fmtMoneySmall(a.totalDue)}</td>
        <td><span class="${a.buckets["0-30"] > 0 ? "amount" : ""}">${fmtMoneySmall(a.buckets["0-30"])}</span></td>
        <td><span style="${a.buckets["31-60"] > 0 ? "color:#1D4ED8;font-weight:700" : ""}">${fmtMoneySmall(a.buckets["31-60"])}</span></td>
        <td><span style="${a.buckets["61-90"] > 0 ? "color:#D97706;font-weight:700" : ""}">${fmtMoneySmall(a.buckets["61-90"])}</span></td>
        <td><span style="${a.buckets["90+"] > 0 ? "color:#DC2626;font-weight:800" : ""}">${fmtMoneySmall(a.buckets["90+"])}</span></td>
        <td>${stagePill(a.escalationStage)}<div style="font-size:11px;color:#64748B;margin-top:2px">${escapeHtml(a.nextAction)}</div></td>
        <td>${riskPill(a.riskScore)}<div style="font-size:11px;color:#64748B;margin-top:2px">${a.maxDaysOverdue}d overdue</div></td>
        <td><div style="display:flex;gap:4px"><button class="btn btn-sm" onclick="window.openArrearsDrawer('${a.tenantId}')">View</button><button class="dots-btn" onclick="window.openArrearsCtx(event,'${a.tenantId}')">⋮</button></div></td>
      </tr>
    `,
      )
      .join("");

    if (tableInfo)
      tableInfo.textContent = `Showing ${start + 1}-${Math.min(start + pageSize, total)} of ${total} • Page ${currentPage}/${maxPage} • Auto-calculated from ${getInvoices().filter((i) => i.outstandingAmount > 0).length} open invoices`;
  }

  window.openArrearsDrawer = openDrawer;
  window.openArrearsCtx = (e, tenantId) => {
    e.stopPropagation();
    ctxTenantId = tenantId;
    const menu = document.getElementById("ctxMenu");
    menu.innerHTML = `
      <div class="ctx-item" onclick="window.openArrearsDrawer('${tenantId}')">👁️ View Aging</div>
      <div class="ctx-item" onclick="window.triggerDemandNotice('${tenantId}')">✉️ Trigger Demand Notice</div>
      <div class="ctx-item" onclick="window.createPaymentPlan('${tenantId}')">📋 Create Payment Plan</div>
      <div class="ctx-item" onclick="window.exportLegalPack('${tenantId}')">⚖️ Export Legal Handover Pack</div>
    `;
    menu.style.left = e.clientX - 10 + "px";
    menu.style.top = e.clientY + 6 + "px";
    menu.classList.add("open");
  };

  function openDrawer(tenantId) {
    const arrears = calculatedArrears.find((a) => a.tenantId === tenantId);
    if (!arrears) return;
    selectedTenantId = tenantId;
    const titleEl = document.getElementById("drawerTitle");
    titleEl.innerHTML =
      '<a href="#" style="color:#0F172A;font-weight:800;text-decoration:none" onclick="event.preventDefault(); window.openTenantContext(\'' +
      tenantId +
      "', '" +
      (arrears.propertyName || "").replace(/\'/g, "\\'") +
      "'); return false;\">" +
      escapeHtml(arrears.tenantName) +
      " ↗</a>";
    document.getElementById("drawerId").textContent = tenantId;
    document.getElementById("drawerId").textContent = tenantId;
    document.getElementById("drawerRisk").className =
      `pill ${{ Low: "gray", Medium: "blue", High: "amber", Critical: "red" }[arrears.riskScore] || "gray"}`;
    document.getElementById("drawerRisk").textContent = arrears.riskScore;
    document.getElementById("drawerStage").className =
      `pill ${{ Reminder: "gray", "Demand Letter": "blue", "Final Notice": "amber", "Legal Notice": "red", Litigation: "red", "Payment Plan": "violet" }[arrears.escalationStage] || "gray"}`;
    document.getElementById("drawerStage").textContent =
      arrears.escalationStage;
    document.getElementById("drawerSubtitle").textContent =
      `${arrears.propertyName} • Total Due ${fmtMoneySmall(arrears.totalDue)} • ${arrears.maxDaysOverdue}d max overdue • ${arrears.invoiceCount} invoices`;

    document.getElementById("drawerSummary").innerHTML = `
      <div class="sum-item"><div class="l">Total Due</div><div class="v">${fmtMoneySmall(arrears.totalDue)}</div></div>
      <div class="sum-item"><div class="l">90+ Critical</div><div class="v" style="color:#DC2626">${fmtMoneySmall(arrears.buckets["90+"])}</div></div>
      <div class="sum-item"><div class="l">Next Action</div><div class="v" style="font-size:11px">${escapeHtml(arrears.nextAction)}</div></div>
    `;

    renderDrawerBody(tenantId);
    document.getElementById("drawerBackdrop").classList.add("open");
    document.getElementById("arrearsDrawer").classList.add("open");
  }

  function closeDrawer() {
    document.getElementById("drawerBackdrop").classList.remove("open");
    document.getElementById("arrearsDrawer").classList.remove("open");
    selectedTenantId = null;
  }

  function renderDrawerBody(tenantId) {
    const arrears = calculatedArrears.find((a) => a.tenantId === tenantId);
    if (!arrears) return;
    const body = document.getElementById("drawerBody");
    const activePlan = getPaymentPlans().find(
      (p) => p.tenantId === tenantId && p.status === "Active",
    );

    if (currentTab === "buckets") {
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h4 style="margin:0;font-size:13px;font-weight:800">Aged Buckets — Auto-calculated from state.invoices</h4>${riskPill(arrears.riskScore)}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#64748B">Current 0-30</div><div style="font-weight:800;margin-top:4px">${fmtMoneySmall(arrears.buckets["0-30"])}</div><div style="font-size:11px;color:#64748B">${
            arrears.invoices.filter((i) => {
              const days = Math.floor(
                (new Date() - new Date(i.dueDate)) / (24 * 3600 * 1000),
              );
              return days <= 30;
            }).length
          } invoices</div></div>
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:10px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#1D4ED8">31-60 Days</div><div style="font-weight:800;margin-top:4px;color:#1D4ED8">${fmtMoneySmall(arrears.buckets["31-60"])}</div><div style="font-size:11px;color:#1D4ED8">${
            arrears.invoices.filter((i) => {
              const days = Math.floor(
                (new Date() - new Date(i.dueDate)) / (24 * 3600 * 1000),
              );
              return days > 30 && days <= 60;
            }).length
          } invoices</div></div>
          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#92400E">61-90 Days</div><div style="font-weight:800;margin-top:4px;color:#92400E">${fmtMoneySmall(arrears.buckets["61-90"])}</div><div style="font-size:11px;color:#92400E">${
            arrears.invoices.filter((i) => {
              const days = Math.floor(
                (new Date() - new Date(i.dueDate)) / (24 * 3600 * 1000),
              );
              return days > 60 && days <= 90;
            }).length
          } invoices</div></div>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:10px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#B91C1C">90+ Days</div><div style="font-weight:800;margin-top:4px;color:#B91C1C">${fmtMoneySmall(arrears.buckets["90+"])}</div><div style="font-size:11px;color:#B91C1C">${
            arrears.invoices.filter((i) => {
              const days = Math.floor(
                (new Date() - new Date(i.dueDate)) / (24 * 3600 * 1000),
              );
              return days > 90;
            }).length
          } invoices</div></div>
        </div>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;font-size:12px;color:#475569">
          <strong>Escalation:</strong> ${escapeHtml(arrears.escalationStage)} • <strong>Max Overdue:</strong> ${arrears.maxDaysOverdue} days • <strong>Earliest Due:</strong> ${fmtDate(arrears.earliestDue)} • <strong>Latest Due:</strong> ${fmtDate(arrears.latestDue)}<br/>
          <strong>Formula:</strong> Group invoices by tenantId where outstanding>0, daysOverdue = today - dueDate, bucket allocation min(outstanding, bucket), totalDue = sum(outstanding)
        </div>
      `;
    } else if (currentTab === "invoices") {
      body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h4 style="margin:0;font-size:13px;font-weight:800">Open Invoices — ${arrears.invoiceCount}</h4><span class="pill gray">${fmtMoneySmall(arrears.totalDue)} total</span></div>
        <table class="line-items-table"><thead><tr><th>Invoice ID</th><th>Due Date</th><th>Days Overdue</th><th>Amount</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>${arrears.invoices
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
          .map((inv) => {
            const days = Math.floor(
              (new Date() - new Date(inv.dueDate)) / (24 * 3600 * 1000),
            );
            return `<tr><td class="mono">${inv.id}</td><td>${fmtDate(inv.dueDate)}</td><td style="color:${days > 90 ? "#DC2626" : days > 60 ? "#D97706" : "#64748B"};font-weight:700">${days}d</td><td>${fmtMoneySmall(inv.amount)}</td><td style="font-weight:800;color:#D97706">${fmtMoneySmall(inv.outstandingAmount)}</td><td><span class="pill ${inv.status === "Overdue" ? "red" : inv.status === "Partial" ? "blue" : "amber"}">${inv.status}</span></td></tr>`;
          })
          .join("")}</tbody></table>
      `;
    } else if (currentTab === "notices") {
      const tenantAudits = getAudit()
        .filter(
          (a) =>
            (a.entityId === arrears.tenantId ||
              a.description
                ?.toLowerCase()
                .includes(arrears.tenantName.toLowerCase())) &&
            (a.action === "NOTICE" ||
              a.description?.toLowerCase().includes("notice") ||
              a.description?.toLowerCase().includes("demand")),
        )
        .slice(0, 20);
      body.innerHTML = `
        <h4 style="margin:0 0 10px;font-size:13px;font-weight:800">Notices & Activity Log</h4>
        <div class="timeline">
          ${tenantAudits.length ? tenantAudits.map((a) => `<div class="tl done"><div style="display:flex;justify-content:space-between"><span style="font-weight:600;font-size:12.5px">${escapeHtml(a.action)} • ${escapeHtml(a.description?.slice(0, 80) || "Demand Notice")}</span><span style="font-size:11px;color:#64748B">${fmtDate(a.timestamp)}</span></div><div style="font-size:12px;color:#475569;margin-top:2px">By ${escapeHtml(a.user || "System")} • ${escapeHtml(a.entityType || "")} ${escapeHtml(a.entityId || "")}</div></div>`).join("") : '<div style="font-size:12px;color:#64748B">No notices yet. Trigger a demand notice to log SMS/Email mock + activity.</div>'}
          <div class="tl active"><div style="display:flex;justify-content:space-between"><span style="font-weight:600;font-size:12.5px">Current Arrears State</span><span style="font-size:11px;color:#D97706;font-weight:700">${fmtMoneySmall(arrears.totalDue)} due • ${arrears.maxDaysOverdue}d overdue</span></div><div style="font-size:12px;color:#475569;margin-top:2px">Next: ${escapeHtml(arrears.nextAction)} • Risk: ${escapeHtml(arrears.riskScore)}</div></div>
        </div>
      `;
    } else if (currentTab === "plan") {
      body.innerHTML = activePlan
        ? `
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between"><h4 style="margin:0;font-size:13px;font-weight:800">Active Payment Plan — ${activePlan.id}</h4><span class="pill green">Active</span></div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;font-size:12px">
            <div><div style="color:#64748B;text-transform:uppercase;font-size:10px;font-weight:700">Total Due</div><div style="font-weight:800">${fmtMoneySmall(activePlan.totalDue)}</div></div>
            <div><div style="color:#64748B;text-transform:uppercase;font-size:10px;font-weight:700">Monthly</div><div style="font-weight:800">${fmtMoneySmall(activePlan.monthlyAmount)} x ${activePlan.installments}</div></div>
            <div><div style="color:#64748B;text-transform:uppercase;font-size:10px;font-weight:700">Start</div><div style="font-weight:700">${fmtDate(activePlan.startDate)}</div></div>
          </div>
          <div style="margin-top:10px;font-size:12px;color:#475569">${escapeHtml(activePlan.terms || "")}</div>
          <div style="margin-top:10px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#15803D;margin-bottom:6px">Schedule</div><div style="display:flex;gap:6px;flex-wrap:wrap">${(activePlan.schedule || []).map((s, i) => `<span class="pill ${s.paid ? "green" : "gray"}" style="font-size:11px">${i + 1}. ${fmtDate(s.date)} • ${fmtMoneySmall(s.amount)} ${s.paid ? "✓" : ""}</span>`).join("")}</div></div>
        </div>
        <button class="btn btn-sm" onclick="window.markPlanInstallment('${activePlan.id}')">Mark Next Installment Paid</button>
      `
        : `
        <div class="empty-state"><div class="ico">📋</div><h3>No active payment plan</h3><p>Create a plan to restructure ${fmtMoneySmall(arrears.totalDue)} over 3-12 months. Updates tenant status to Payment Plan.</p><button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="window.createPaymentPlan('${arrears.tenantId}')">Create Payment Plan</button></div>
      `;
    } else if (currentTab === "legal") {
      body.innerHTML = `
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center"><h4 style="margin:0;font-size:13px;font-weight:800">Legal Handover Pack Preview</h4>${stagePill(arrears.escalationStage)}</div>
          <div style="font-size:12px;color:#475569;margin-top:8px">This pack consolidates tenant ledger, demand history, lease, KYC, and aging for litigation. ToR 8.5 compliant.</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:12px;font-size:12px">
            <div style="background:#FFF;border:1px solid #FECACA;border-radius:6px;padding:8px"><strong>Tenant:</strong> ${escapeHtml(arrears.tenantName)}<br/><strong>ID:</strong> ${escapeHtml(arrears.tenantId)}<br/><strong>Property:</strong> ${escapeHtml(arrears.propertyName)}</div>
            <div style="background:#FFF;border:1px solid #FECACA;border-radius:6px;padding:8px"><strong>Total Due:</strong> ${fmtMoneySmall(arrears.totalDue)}<br/><strong>90+:</strong> ${fmtMoneySmall(arrears.buckets["90+"])}<br/><strong>Max Overdue:</strong> ${arrears.maxDaysOverdue} days</div>
          </div>
        </div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:6px">Included Documents (PDF-ready)</div>
        <div style="display:flex;flex-direction:column;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px"><span>1. Tenant KYC & Lease Agreement</span><span class="pill gray">Included</span></div>
          <div style="display:flex;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px"><span>2. Aged Invoices (${arrears.invoiceCount}) with ZRA Smart Invoice Nos</span><span class="pill gray">${fmtMoneySmall(arrears.totalDue)}</span></div>
          <div style="display:flex;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px"><span>3. Demand Notices & Activity Log (${getAudit().filter((a) => a.entityId === arrears.tenantId).length})</span><span class="pill gray">SMS/Email mock logs</span></div>
          <div style="display:flex;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px"><span>4. Payment Plan History (if any)</span><span class="pill ${getPaymentPlans().find((p) => p.tenantId === arrears.tenantId) ? "green" : "gray"}">${getPaymentPlans().find((p) => p.tenantId === arrears.tenantId) ? "Active" : "None"}</span></div>
          <div style="display:flex;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px"><span>5. Arrears Aging Calculation Sheet</span><span class="pill gray">FIFO from state.invoices</span></div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="window.exportLegalPack('${arrears.tenantId}')">Download Legal Handover Pack (JSON)</button>
      `;
    }
  }

  // --- Actions ToR 8.5 ---

  // 1. Trigger Demand Notice (SMS/Email mock + logs activity)
  let demandTenantId = null;
  function openDemandModal(tenantId) {
    demandTenantId = tenantId;
    const arrears = calculatedArrears.find((a) => a.tenantId === tenantId);
    if (!arrears) return;
    const templateDefault =
      arrears.maxDaysOverdue >= 90
        ? "Legal Notice"
        : arrears.maxDaysOverdue >= 61
          ? "Final Notice"
          : arrears.maxDaysOverdue >= 31
            ? "Demand Letter"
            : "Reminder";
    document.getElementById("demandTemplate").value = templateDefault;
    document.getElementById("demandPreview").innerHTML =
      `<strong>${escapeHtml(arrears.tenantName)}</strong> • ${fmtMoneySmall(arrears.totalDue)} due • ${arrears.maxDaysOverdue}d overdue • ${arrears.invoiceCount} invoices • Risk ${arrears.riskScore} • Stage ${arrears.escalationStage}`;
    updateDemandPreview();
    document.getElementById("demandModalBackdrop").classList.add("open");
  }
  function closeDemandModal() {
    document.getElementById("demandModalBackdrop").classList.remove("open");
    demandTenantId = null;
  }
  function updateDemandPreview() {
    if (!demandTenantId) return;
    const arrears = calculatedArrears.find(
      (a) => a.tenantId === demandTenantId,
    );
    const template = document.getElementById("demandTemplate").value;
    const msgEl = document.getElementById("demandMessage");
    const total = fmtMoneySmall(arrears.totalDue);
    const critical = fmtMoneySmall(arrears.buckets["90+"]);
    const messages = {
      Reminder: `Dear ${arrears.tenantName},\n\nFriendly reminder: Your account with PropertyPro Zambia has outstanding balance of ${total} (0-30 days: ${fmtMoneySmall(arrears.buckets["0-30"])}). Please settle by ${fmtDate(new Date(Date.now() + 7 * 24 * 3600 * 1000))} to avoid penalties.\n\nInvoices: ${arrears.invoiceIds.slice(0, 3).join(", ")}${arrears.invoiceIds.length > 3 ? "..." : ""}\n\nThank you.`,
      "Demand Letter": `DEMAND LETTER - ${arrears.tenantName}\n\nWe demand immediate payment of ${total} overdue ${arrears.maxDaysOverdue} days. 31-60 bucket: ${fmtMoneySmall(arrears.buckets["31-60"])}. Failure to pay within 7 days will result in final notice and legal escalation.\n\nProperty: ${arrears.propertyName}\nTenant ID: ${arrears.tenantId}\n\nPropertyPro Zambia Ltd - Credit Control`,
      "Final Notice": `FINAL NOTICE - ${arrears.tenantName}\n\nFinal notice for ${total} (61-90: ${fmtMoneySmall(arrears.buckets["61-90"])}, 90+: ${critical}). You have 48 hours to clear arrears or enter payment plan. Legal action will commence thereafter.\n\nContact: creditcontrol@propertypro.zm`,
      "Legal Notice": `LEGAL NOTICE - ${arrears.tenantName} - TO BE SERVED\n\nTake notice that you owe ${total} with ${critical} in 90+ days critical arrears, max ${arrears.maxDaysOverdue} days overdue. Demand immediate settlement. This letter will form part of legal handover pack for litigation.\n\nInvoices attached. ZRA Smart Invoice compliant.\n\nIssued: ${new Date().toLocaleDateString()}`,
    };
    if (msgEl) msgEl.value = messages[template] || messages["Demand Letter"];
  }

  function confirmDemandNotice() {
    if (!demandTenantId) return;
    const arrears = calculatedArrears.find(
      (a) => a.tenantId === demandTenantId,
    );
    const channel = document.getElementById("demandChannel").value;
    const template = document.getElementById("demandTemplate").value;
    const message = document.getElementById("demandMessage").value;

    // Mock SMS/Email send + log activity
    const tenant = getTenants().find((t) => t.id === demandTenantId);
    const contactInfo = tenant
      ? `${tenant.phone || "No phone"} / ${tenant.email || "No email"}`
      : "No contact";

    // Log audit event
    try {
      if (window.addAuditEvent) {
        window.addAuditEvent(
          "NOTICE",
          "tenant",
          demandTenantId,
          `${template} sent via ${channel} to ${arrears.tenantName} for ${fmtMoneySmall(arrears.totalDue)} — ${contactInfo}`,
          null,
          {
            channel,
            template,
            messagePreview: message.slice(0, 120),
            totalDue: arrears.totalDue,
            maxOverdue: arrears.maxDaysOverdue,
          },
        );
      } else {
        getState().auditTrail = getState().auditTrail || [];
        getState().auditTrail.unshift({
          id: `AUD-${String(getState().auditTrail.length + 1).padStart(6, "0")}`,
          timestamp: new Date().toISOString(),
          user: "Credit Control",
          action: "NOTICE",
          entityType: "tenant",
          entityId: demandTenantId,
          description: `${template} via ${channel} to ${arrears.tenantName} — ${fmtMoneySmall(arrears.totalDue)}`,
          before: { escalationStage: arrears.escalationStage },
          after: { channel, template, contactInfo },
        });
      }
    } catch (e) {
      console.warn(e);
    }

    // Also push to tenant activity if tenant has activities array
    if (tenant) {
      tenant.activities = tenant.activities || [];
      tenant.activities.unshift({
        id: `ACT-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type: "Demand Notice",
        description: `${template} via ${channel}: ${message.slice(0, 80)}...`,
        user: "Credit Control",
      });
    }

    // Update arrears nextAction to reflect notice sent
    arrears.lastNoticeDate = new Date().toISOString().slice(0, 10);
    arrears.lastNoticeType = template;
    arrears.lastNoticeChannel = channel;

    saveState();
    closeDemandModal();
    if (selectedTenantId === demandTenantId) renderDrawerBody(demandTenantId);
    toast(
      `Demand Notice (${template}) sent via ${channel} to ${arrears.tenantName} — SMS/Email mock logged`,
      "success",
    );
  }

  window.triggerDemandNotice = openDemandModal;
  window.openDemandModal = openDemandModal;

  // 2. Create Payment Plan (opens plan modal, updates tenant status)
  let planTenantId = null;
  function openPlanModal(tenantId) {
    planTenantId = tenantId;
    const arrears = calculatedArrears.find((a) => a.tenantId === tenantId);
    if (!arrears) return;
    document.getElementById("planTotal").value = arrears.totalDue;
    document.getElementById("planStart").value = new Date()
      .toISOString()
      .slice(0, 10);
    document.getElementById("planSummary").innerHTML =
      `<strong>${escapeHtml(arrears.tenantName)}</strong> owes <strong>${fmtMoneySmall(arrears.totalDue)}</strong> across ${arrears.invoiceCount} invoices • 90+ ${fmtMoneySmall(arrears.buckets["90+"])} • Max ${arrears.maxDaysOverdue}d overdue • Risk ${arrears.riskScore}`;
    updatePlanPreview();
    document.getElementById("planModalBackdrop").classList.add("open");
  }
  function closePlanModal() {
    document.getElementById("planModalBackdrop").classList.remove("open");
    planTenantId = null;
  }
  function updatePlanPreview() {
    if (!planTenantId) return;
    const total = Number(document.getElementById("planTotal").value || 0);
    const installments = Number(
      document.getElementById("planInstallments").value || 3,
    );
    const monthly = installments ? Math.ceil(total / installments) : total;
    document.getElementById("planMonthly").value = monthly;
    const startStr =
      document.getElementById("planStart").value ||
      new Date().toISOString().slice(0, 10);
    const start = new Date(startStr);
    const scheduleEl = document.getElementById("planSchedule");
    if (scheduleEl) {
      let html = `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748B;margin-bottom:6px">Schedule — ${installments} x ${fmtMoneySmall(monthly)}</div><div style="display:flex;gap:6px;flex-wrap:wrap">`;
      for (let i = 0; i < installments; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 5);
        const amt =
          i === installments - 1
            ? total - monthly * (installments - 1)
            : monthly;
        html += `<span class="pill gray" style="font-size:11px">${i + 1}. ${fmtDate(d.toISOString().slice(0, 10))} • ${fmtMoneySmall(amt)}</span>`;
      }
      html += `</div>`;
      scheduleEl.innerHTML = html;
    }
  }

  function confirmPaymentPlan() {
    if (!planTenantId) return;
    const arrears = calculatedArrears.find((a) => a.tenantId === planTenantId);
    const total = Number(document.getElementById("planTotal").value || 0);
    const installments = Number(
      document.getElementById("planInstallments").value || 3,
    );
    const monthly = Number(document.getElementById("planMonthly").value || 0);
    const startDate = document.getElementById("planStart").value;
    const terms = document.getElementById("planTerms").value;
    if (!total || !installments || !startDate) {
      toast("Fill all required fields", "error");
      return;
    }

    const planId = `PLAN-${new Date().getFullYear()}-${String(getPaymentPlans().length + 1).padStart(4, "0")}`;
    const schedule = [];
    const start = new Date(startDate);
    for (let i = 0; i < installments; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 5);
      const amt =
        i === installments - 1 ? total - monthly * (installments - 1) : monthly;
      schedule.push({
        date: d.toISOString().slice(0, 10),
        amount: amt,
        paid: false,
        paidDate: null,
      });
    }

    const plan = {
      id: planId,
      tenantId: planTenantId,
      tenantName: arrears.tenantName,
      propertyId: arrears.propertyId,
      propertyName: arrears.propertyName,
      totalDue: total,
      monthlyAmount: monthly,
      installments,
      startDate,
      schedule,
      terms,
      status: "Active",
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: "Credit Control",
      arrearsSnapshot: { ...arrears },
    };

    getState().paymentPlans = getState().paymentPlans || [];
    getState().paymentPlans.unshift(plan);

    // Update tenant status
    const tenant = getTenants().find((t) => t.id === planTenantId);
    if (tenant) {
      tenant.status = "On Payment Plan";
      tenant.paymentPlanId = planId;
      tenant.riskRating = "Medium"; // downgrade risk once plan active
    }

    // Log audit
    try {
      if (window.addAuditEvent) {
        window.addAuditEvent(
          "CREATE",
          "payment_plan",
          planId,
          `Payment Plan ${planId} created for ${arrears.tenantName} — ${fmtMoneySmall(total)} over ${installments} months`,
          null,
          plan,
        );
      }
    } catch {}

    saveState();
    closePlanModal();
    recalcAndRender();
    if (selectedTenantId === planTenantId) {
      currentTab = "plan";
      document
        .querySelectorAll(".drawer-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelector('.drawer-tab[data-tab="plan"]')
        .classList.add("active");
      renderDrawerBody(planTenantId);
    }
    toast(
      `Payment Plan ${planId} created for ${arrears.tenantName} — ${installments} x ${fmtMoneySmall(monthly)} — Tenant status updated to Payment Plan`,
      "success",
    );
  }

  window.createPaymentPlan = openPlanModal;
  window.markPlanInstallment = (planId) => {
    const plan = getPaymentPlans().find((p) => p.id === planId);
    if (!plan) return;
    const next = plan.schedule.find((s) => !s.paid);
    if (!next) {
      toast("All installments paid — plan completed", "success");
      plan.status = "Completed";
      saveState();
      recalcAndRender();
      if (selectedTenantId) renderDrawerBody(selectedTenantId);
      return;
    }
    next.paid = true;
    next.paidDate = new Date().toISOString().slice(0, 10);
    if (plan.schedule.every((s) => s.paid)) plan.status = "Completed";
    saveState();
    recalcAndRender();
    if (selectedTenantId) renderDrawerBody(selectedTenantId);
    toast(
      `Installment ${plan.schedule.indexOf(next) + 1} marked paid — ${fmtMoneySmall(next.amount)}`,
      "success",
    );
  };

  // 3. Export Legal Handover Pack (JSON/PDF-ready bundle)
  let legalTenantId = null;
  function openLegalModal(tenantId) {
    legalTenantId = tenantId;
    const arrears = calculatedArrears.find((a) => a.tenantId === tenantId);
    if (!arrears) return;
    const tenant = getTenants().find((t) => t.id === tenantId);
    const invoices = arrears.invoices;
    const auditLogs = getAudit()
      .filter(
        (a) =>
          a.entityId === tenantId ||
          a.description
            ?.toLowerCase()
            .includes(arrears.tenantName.toLowerCase()),
      )
      .slice(0, 50);
    const paymentPlan = getPaymentPlans().find((p) => p.tenantId === tenantId);
    const payments = (getState().payments || []).filter(
      (p) => p.tenantId === tenantId,
    );

    const body = document.getElementById("legalBody");
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#B91C1C">Tenant & Arrears</div><div style="font-weight:800;margin-top:4px">${escapeHtml(arrears.tenantName)} • ${fmtMoneySmall(arrears.totalDue)} • ${arrears.maxDaysOverdue}d</div><div style="font-size:11px;color:#475569;margin-top:4px">ID: ${escapeHtml(tenantId)}<br/>Property: ${escapeHtml(arrears.propertyName)}<br/>City: ${escapeHtml(arrears.city)}</div></div>
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px"><div style="font-size:10px;text-transform:uppercase;font-weight:700;color:#64748B">Bundle Contents</div><div style="font-size:12px;margin-top:4px">• ${invoices.length} invoices with ZRA Smart Invoice Nos<br/>• ${auditLogs.length} demand notices / audit logs<br/>• ${payments.length} payments / receipts<br/>• ${paymentPlan ? "1 payment plan" : "No payment plan"}<br/>• Lease, KYC, aging calc sheet</div></div>
      </div>
      <div style="background:#0F172A;color:#FFF;border-radius:8px;padding:12px;font-family:monospace;font-size:11px;max-height:260px;overflow:auto">
        <div style="color:#94A3B8">Legal Handover Pack — ${arrears.tenantName} — ${new Date().toISOString().slice(0, 10)}</div>
        <pre style="margin:8px 0 0;white-space:pre-wrap;color:#E2E8F0">${escapeHtml(
          JSON.stringify(
            {
              packType: "Legal Handover Pack",
              generatedAt: new Date().toISOString(),
              tenant: {
                id: tenantId,
                name: arrears.tenantName,
                property: arrears.propertyName,
                city: arrears.city,
                contact: tenant
                  ? { phone: tenant.phone, email: tenant.email }
                  : {},
              },
              arrears: {
                totalDue: arrears.totalDue,
                buckets: arrears.buckets,
                maxDaysOverdue: arrears.maxDaysOverdue,
                escalationStage: arrears.escalationStage,
                riskScore: arrears.riskScore,
                invoiceIds: arrears.invoiceIds,
              },
              invoices: invoices
                .slice(0, 5)
                .map((i) => ({
                  id: i.id,
                  dueDate: i.dueDate,
                  amount: i.amount,
                  outstanding: i.outstandingAmount,
                  zraSmartInvoiceNo: i.zraSmartInvoiceNo,
                  zraStatus: i.zraStatus,
                })),
              auditPreview: auditLogs
                .slice(0, 3)
                .map((a) => ({
                  date: a.timestamp,
                  action: a.action,
                  desc: a.description,
                })),
              paymentPlan: paymentPlan
                ? {
                    id: paymentPlan.id,
                    status: paymentPlan.status,
                    total: paymentPlan.totalDue,
                  }
                : null,
            },
            null,
            2,
          ).slice(0, 2000),
        )}... (truncated preview)</pre>
      </div>
      <div style="margin-top:10px;font-size:11px;color:#64748B">Full JSON bundle includes all invoices, full audit trail, tenant KYC, lease, payment receipts, demand notice history, and aging calculation. PDF-ready format for legal counsel.</div>
    `;
    document.getElementById("legalModalBackdrop").classList.add("open");
  }
  function closeLegalModal() {
    document.getElementById("legalModalBackdrop").classList.remove("open");
    legalTenantId = null;
  }

  function buildLegalPack(tenantId) {
    const arrears = calculatedArrears.find((a) => a.tenantId === tenantId);
    const tenant = getTenants().find((t) => t.id === tenantId);
    const invoices = arrears
      ? arrears.invoices
      : getInvoices().filter((i) => i.tenantId === tenantId);
    const auditLogs = getAudit().filter(
      (a) =>
        a.entityId === tenantId ||
        (arrears &&
          a.description
            ?.toLowerCase()
            .includes(arrears.tenantName.toLowerCase())),
    );
    const payments = (getState().payments || []).filter(
      (p) => p.tenantId === tenantId,
    );
    const plans = getPaymentPlans().filter((p) => p.tenantId === tenantId);
    const property = getProperties().find((p) => p.id === arrears?.propertyId);

    return {
      packType: "PropertyPro Zambia Ltd — Legal Handover Pack — ToR 8.5",
      generatedAt: new Date().toISOString(),
      generatedBy: "Credit Control / Finance Module",
      version: getState().version || "propertypro_v3",
      tenant: {
        id: tenantId,
        name: arrears?.tenantName || tenant?.name || tenantId,
        propertyId: arrears?.propertyId,
        propertyName: arrears?.propertyName,
        city: arrears?.city || property?.city,
        contact: tenant
          ? {
              phone: tenant.phone,
              email: tenant.email,
              nrc: tenant.nrc,
              tpin: tenant.tpin,
            }
          : {},
        lease: tenant
          ? {
              leaseId: tenant.currentLeaseId,
              startDate: tenant.leaseStart,
              endDate: tenant.leaseEnd,
              monthlyRent: tenant.monthlyRent,
            }
          : {},
        kyc: tenant
          ? { status: tenant.kycStatus, riskRating: tenant.riskRating }
          : {},
      },
      arrearsSummary: {
        totalDue: arrears?.totalDue || 0,
        buckets: arrears?.buckets || {},
        maxDaysOverdue: arrears?.maxDaysOverdue || 0,
        earliestDue: arrears?.earliestDue,
        latestDue: arrears?.latestDue,
        escalationStage: arrears?.escalationStage,
        riskScore: arrears?.riskScore,
        nextAction: arrears?.nextAction,
        invoiceCount: arrears?.invoiceCount || invoices.length,
      },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        type: inv.type || inv.invoiceType,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        amount: inv.amount,
        baseRent: inv.baseRent,
        vat: inv.vat,
        withholdingTax: inv.withholdingTax,
        paidAmount: inv.paidAmount,
        outstandingAmount: inv.outstandingAmount,
        status: inv.status,
        zraSmartInvoiceNo: inv.zraSmartInvoiceNo,
        zraStatus: inv.zraStatus,
        zraSyncDate: inv.zraSyncDate,
        lineItems: inv.lineItems || [],
        ledgerHistory: inv.ledgerHistory || [],
      })),
      payments: payments.map((p) => ({
        id: p.id,
        date: p.date || p.transactionDate,
        amount: p.amount,
        method: p.method || p.paymentMethod,
        bankName: p.bankName,
        reference: p.reference,
        allocatedAmount: p.allocatedAmount,
        invoiceIds: p.invoiceIds || [],
      })),
      demandNotices: auditLogs
        .filter((a) => a.action === "NOTICE")
        .map((a) => ({
          date: a.timestamp,
          user: a.user,
          action: a.action,
          description: a.description,
          channel: a.after?.channel,
          template: a.after?.template,
        })),
      fullAuditTrail: auditLogs,
      paymentPlans: plans,
      agingCalculation: {
        method:
          "Group invoices by tenantId where outstanding>0, daysOverdue = today - dueDate, bucket = 0-30 / 31-60 / 61-90 / 90+",
        calculatedAt: new Date().toISOString(),
        totalOpenInvoices: getInvoices().filter((i) => i.outstandingAmount > 0)
          .length,
        formula:
          "totalDue = sum(outstandingAmount), bucket allocation by daysOverdue",
      },
      legalStatement: `This pack constitutes formal handover for legal escalation under PropertyPro Zambia Ltd Credit Policy. Tenant ${arrears?.tenantName} owes ${fmtMoneySmall(arrears?.totalDue || 0)} with ${fmtMoneySmall(arrears?.buckets["90+"] || 0)} in 90+ days critical arrears. Demand notices have been issued via SMS/Email mock and logged. Payment plan status: ${plans.find((p) => p.status === "Active") ? "Active plan " + plans.find((p) => p.status === "Active").id : "No active plan"}. Recommended action: Litigation.`,
    };
  }

  function downloadLegalJson() {
    if (!legalTenantId) return;
    const pack = buildLegalPack(legalTenantId);
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Legal_Handover_Pack_${pack.tenant.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Log export
    try {
      if (window.addAuditEvent) {
        window.addAuditEvent(
          "EXPORT",
          "legal_pack",
          legalTenantId,
          `Legal Handover Pack JSON exported for ${pack.tenant.name} — ${fmtMoneySmall(pack.arrearsSummary.totalDue)}`,
          null,
          { packId: `LEGAL-${legalTenantId}` },
        );
      }
    } catch {}
    toast(
      `Legal Handover Pack JSON exported for ${pack.tenant.name}`,
      "success",
    );
  }

  function downloadLegalPdf() {
    if (!legalTenantId) return;
    const pack = buildLegalPack(legalTenantId);
    // For PDF-ready, we create an HTML printable bundle
    const w = window.open("", "_blank");
    const invoicesRows = pack.invoices
      .map(
        (inv) =>
          `<tr><td>${inv.id}</td><td>${inv.dueDate}</td><td>${inv.type}</td><td>ZMW ${inv.amount}</td><td>ZMW ${inv.outstandingAmount}</td><td>${inv.zraSmartInvoiceNo || ""}</td></tr>`,
      )
      .join("");
    w.document.write(`
      <html><head><title>Legal Handover Pack - ${pack.tenant.name}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#0F172A;font-size:12px} h1{font-size:18px} h2{font-size:14px;margin-top:20px;border-bottom:1px solid #E2E8F0;padding-bottom:6px} table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #E2E8F0;padding:6px;text-align:left;font-size:11px} th{background:#F8FAFC;text-transform:uppercase;font-size:10px} .header{background:#0F172A;color:#FFF;padding:16px;border-radius:8px;margin-bottom:16px} .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700}.red{background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}.amber{background:#FFFBEB;color:#92400E;border:1px solid #FDE68A}</style>
      </head><body>
      <div class="header"><h1 style="margin:0">PropertyPro Zambia Ltd — Legal Handover Pack — ToR 8.5</h1><div style="font-size:11px;color:#94A3B8;margin-top:4px">Generated ${new Date().toLocaleString()} • Tenant ${pack.tenant.name} • ${fmtMoneySmall(pack.arrearsSummary.totalDue)} Total Due</div></div>
      <h2>1. Tenant & Arrears Summary</h2>
      <p><strong>Tenant:</strong> ${pack.tenant.name} (${pack.tenant.id})<br/><strong>Property:</strong> ${pack.tenant.propertyName} • ${pack.tenant.city}<br/><strong>Total Due:</strong> ZMW ${pack.arrearsSummary.totalDue} • <strong>90+:</strong> ZMW ${pack.arrearsSummary.buckets["90+"] || 0}<br/><strong>Max Overdue:</strong> ${pack.arrearsSummary.maxDaysOverdue} days • <strong>Risk:</strong> <span class="badge red">${pack.arrearsSummary.riskScore}</span> • <strong>Stage:</strong> <span class="badge amber">${pack.arrearsSummary.escalationStage}</span></p>
      <h2>2. Aged Invoices (${pack.invoices.length})</h2>
      <table><thead><tr><th>Invoice ID</th><th>Due Date</th><th>Type</th><th>Amount</th><th>Outstanding</th><th>ZRA Smart Invoice</th></tr></thead><tbody>${invoicesRows}</tbody></table>
      <h2>3. Demand Notices (${pack.demandNotices.length})</h2>
      <table><thead><tr><th>Date</th><th>Channel</th><th>Template</th><th>Description</th></tr></thead><tbody>${pack.demandNotices.map((n) => `<tr><td>${n.date?.slice(0, 10) || ""}</td><td>${n.channel || ""}</td><td>${n.template || ""}</td><td>${n.description || ""}</td></tr>`).join("") || "<tr><td colspan=4>No notices logged</td></tr>"}</tbody></table>
      <h2>4. Payment Plans</h2>
      <p>${pack.paymentPlans.length ? pack.paymentPlans.map((p) => `${p.id} — ${p.status} — ZMW ${p.totalDue} over ${p.installments} months`).join("<br/>") : "No active payment plans"}</p>
      <h2>5. Legal Statement</h2>
      <p>${pack.legalStatement}</p>
      <p style="margin-top:24px;font-size:10px;color:#64748B">This document is PDF-ready and generated from window.state (propertypro_v3). All amounts in ZMW. ZRA Smart Invoice compliant. For litigation use.</p>
      </body></html>
    `);
    w.document.close();
    w.print();
    toast(
      `Legal Handover Pack PDF-ready opened for ${pack.tenant.name}`,
      "success",
    );
  }

  window.exportLegalPack = (tenantId) => {
    legalTenantId = tenantId;
    openLegalModal(tenantId);
  };
  window.openLegalModal = openLegalModal;

  function bulkDemandNotices() {
    const critical = filteredArrears
      .filter((a) => a.buckets["90+"] > 0 || a.riskScore === "Critical")
      .slice(0, 10);
    if (critical.length === 0) {
      toast("No critical arrears selected for bulk demand", "info");
      return;
    }
    showConfirm(
      "Bulk Demand Notices",
      `Send demand notices to ${critical.length} tenants in 90+ / Critical bucket? Mock SMS/Email will be logged.`,
      () => {
        critical.forEach((a) => {
          // Simulate demand without modal
          try {
            if (window.addAuditEvent) {
              window.addAuditEvent(
                "NOTICE",
                "tenant",
                a.tenantId,
                `Bulk ${a.escalationStage} via SMS & Email to ${a.tenantName} for ${fmtMoneySmall(a.totalDue)}`,
                null,
                { channel: "SMS & Email", template: a.escalationStage },
              );
            }
          } catch {}
        });
        saveState();
        toast(
          `Bulk demand notices sent to ${critical.length} tenants (mock SMS/Email logged)`,
          "success",
        );
      },
    );
  }

  function exportCSV() {
    const data = filteredArrears.map((a) => ({
      TenantID: a.tenantId,
      TenantName: a.tenantName,
      Property: a.propertyName,
      PropertyID: a.propertyId,
      City: a.city,
      TotalDue_ZMW: a.totalDue,
      Current_0_30: a.buckets["0-30"],
      Days_31_60: a.buckets["31-60"],
      Days_61_90: a.buckets["61-90"],
      Days_90_plus: a.buckets["90+"],
      MaxDaysOverdue: a.maxDaysOverdue,
      EscalationStage: a.escalationStage,
      RiskScore: a.riskScore,
      InvoiceCount: a.invoiceCount,
      InvoiceIDs: a.invoiceIds.join(";"),
      NextAction: a.nextAction,
      EarliestDue: a.earliestDue,
      LatestDue: a.latestDue,
    }));
    if (data.length === 0) {
      toast("No data to export", "error");
      return;
    }
    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Arrears");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PropertyPro_Arrears_Aged_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${data.length} arrears to Excel`, "success");
    } else {
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PropertyPro_Arrears_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(`Exported ${data.length} arrears to CSV`, "success");
    }
  }

  function printArrears(tenantId) {
    const a = calculatedArrears.find((x) => x.tenantId === tenantId);
    if (!a) return;
    const w = window.open("", "_blank");
    w.document.write(
      `<html><head><title>Arrears Statement ${a.tenantName}</title><style>body{font-family:sans-serif;padding:24px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #E2E8F0;padding:6px;font-size:12px} th{background:#F8FAFC}</style></head><body><h2>Arrears Statement - ${a.tenantName}</h2><p>Property: ${a.propertyName} • Total Due: ZMW ${a.totalDue}</p><table><tr><th>Bucket</th><th>Amount</th></tr><tr><td>Current 0-30</td><td>ZMW ${a.buckets["0-30"]}</td></tr><tr><td>31-60</td><td>ZMW ${a.buckets["31-60"]}</td></tr><tr><td>61-90</td><td>ZMW ${a.buckets["61-90"]}</td></tr><tr><td>90+</td><td>ZMW ${a.buckets["90+"]}</td></tr></table><p>Generated ${new Date().toLocaleString()}</p></body></html>`,
    );
    w.document.close();
    w.print();
  }

  function showConfirm(title, body, onOk) {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmBody").textContent = body;
    document.getElementById("confirmBackdrop").classList.add("open");
    const okBtn = document.getElementById("confirmOk");
    const newOk = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    newOk.addEventListener("click", () => {
      closeConfirm();
      onOk && onOk();
    });
  }
  function closeConfirm() {
    document.getElementById("confirmBackdrop").classList.remove("open");
  }
  function toast(msg, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.style.cssText =
        "position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px";
      document.body.appendChild(container);
    }
    const el = document.createElement("div");
    el.style.cssText = `padding:10px 14px;border-radius:8px;border:1px solid #E2E8F0;background:#FFF;box-shadow:0 8px 24px rgba(15,23,42,.12);font-size:13px;font-weight:600;max-width:380px;${type === "success" ? "border-color:#BBF7D0;background:#F0FDF4;color:#15803D" : type === "error" ? "border-color:#FECACA;background:#FEF2F2;color:#B91C1C" : ""}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = ".3s";
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(
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
  window.escapeHtml = escapeHtml;
  function saveState() {
    try {
      const s = getState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      try {
        window.state = s;
        window.dispatchEvent(
          new CustomEvent("propertypro:stateUpdated", { detail: s }),
        );
      } catch (e) {}
    } catch (e) {}
  }
})();

/**
 * ============================================================================
 * PropertyPro Zambia Ltd - Reusable Layout Engine
 * File: js/layout.js - FIXED VERSION
 * ============================================================================
 * Single source of truth for sidebar, topbar, breadcrumb, search & notifications
 * Fix: Removed duplicate dashboard ID, cleaned NAV_CONFIG, hardened localStorage,
 *      ensured unique IDs, added safe guards for missing DOM, restored Finance ToR modules
 */

(function (global) {
  const STORAGE_KEYS = {
    collapsed: "propertypro_sidebar_collapsed",
    customPages: "propertypro_custom_pages",
    navScrollTop: "propertypro_sidebar_nav_scroll_top",
  };

  const ICONS = {
    home: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-5H9v5H4a1 1 0 0 1-1-1V9.5z"/></svg>`,
    grid: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/></svg>`,
    units: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg>`,
    map: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>`,
    megaphone: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11 13a3 3 0 0 1-6 0 3 3 0 0 1 6 0z"/></svg>`,
    doc: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>`,
    clipboard: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>`,
    users: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>`,
    lease: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    fileText: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13H8M16 13h-2M10 17H8M16 17h-2"/></svg>`,
    billing: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    payments: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>`,
    arrears: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10.3 3.1L3.1 15.4a1 1 0 0 0 .9 1.5h14a1 1 0 0 0 .9-1.5L11.7 3.1a1 1 0 0 0-1.4 0z"/></svg>`,
    charges: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/><circle cx="12" cy="12" r="3"/></svg>`,
    maintenance: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.8 3.8z"/><path d="M3 6l4 4"/><path d="M3 10l4 4"/></svg>`,
    utilities: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    insurance: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    valuations: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    development: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="7" width="20" height="14"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
    documents: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>`,
    compliance: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    reports: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M9 17V9"/><path d="M13 17V11"/><path d="M17 17V13"/></svg>`,
    messages: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    notices: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8A6 6 0 0 0 6 8c0 7-6 9-6 9h18s-6-2-6-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
    settings: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 16l4-4 3 3 5-6"/></svg>`,
    allocation: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><path d="M12 12 L12 2 A10 10 0 0 1 22 12 Z"/><path d="M12 12 L22 12 A10 10 0 0 1 16 20 Z"/></svg>`,
    pipeline: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M10 6.5h4M10 17.5h4M6.5 10v4M17.5 10v4"/></svg>`,
    appraisal: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    fixedIncome: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h4M6 14h4M14 10h4M14 14h4"/></svg>`,
    equity: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>`,
    building: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="2" width="6" height="20"/><rect x="14" y="8" width="6" height="14"/><path d="M6 6h2M6 10h2M6 14h2M16 12h2M16 16h2"/></svg>`,
    collective: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/><circle cx="20" cy="9" r="2"/><path d="M18 21a4 4 0 0 1 4-4"/></svg>`,
    cash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    risk: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10.3 3.1L3.1 15.4a1 1 0 0 0 .9 1.5h14a1 1 0 0 0 .9-1.5L11.7 3.1a1 1 0 0 0-1.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
    performance: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    approval: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M9 11l3 3L22 4"/><circle cx="12" cy="12" r="10"/></svg>`,
    conditions: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6M9 18h6M9 12h2"/></svg>`,
    audit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M10 13H8M16 13h-2M10 17H8M16 17h-2"/></svg>`,
  };

  let NAV_CONFIG = [
    {
      id: "s-overview",
      section: "Overview",
      label: "Section:Overview",
      isSection: true,
    },
    {
      id: "dashboard",
      section: "Overview",
      label: "Property Dashboard",
      file: "index.html",
      icon: ICONS.home,
    },
    {
      id: "investment-dashboard",
      section: "Overview",
      label: "Investment Dashboard",
      file: "investment-dashboard.html",
      icon: ICONS.chart,
      badge: "NEW",
    },

    {
      id: "s-investment",
      section: "Investment",
      label: "Section:Investment",
      isSection: true,
    },
    {
      id: "investment-assets",
      section: "Investment",
      label: "Portfolio & Asset Register",
      file: "investment-assets.html",
      icon: ICONS.building,
      badge: "28",
    },
    {
      id: "asset-allocation",
      section: "Investment",
      label: "Asset Allocation",
      file: "asset-allocation.html",
      icon: ICONS.allocation,
    },
    {
      id: "investment-pipeline",
      section: "Investment",
      label: "Investment Pipeline",
      file: "investment-pipeline.html",
      icon: ICONS.pipeline,
    },
    {
      id: "investment-appraisals",
      section: "Investment",
      label: "Appraisals",
      file: "investment-appraisals.html",
      icon: ICONS.appraisal,
    },
    {
      id: "fixed-income",
      section: "Investment",
      label: "Fixed Income",
      file: "fixed-income.html",
      icon: ICONS.fixedIncome,
    },
    {
      id: "listed-equities",
      section: "Investment",
      label: "Listed Equities",
      file: "listed-equities.html",
      icon: ICONS.equity,
    },
    {
      id: "unlisted-investments",
      section: "Investment",
      label: "Unlisted Investments",
      file: "unlisted-investments.html",
      icon: ICONS.building,
    },
    {
      id: "collective-investments",
      section: "Investment",
      label: "Collective Investments",
      file: "collective-investments.html",
      icon: ICONS.collective,
    },
    {
      id: "investment-cash",
      section: "Investment",
      label: "Cash Management",
      file: "investment-cash.html",
      icon: ICONS.cash,
    },
    {
      id: "investment-risk",
      section: "Investment",
      label: "Risk",
      file: "investment-risk.html",
      icon: ICONS.risk,
    },
    {
      id: "investment-compliance",
      section: "Investment",
      label: "Compliance",
      file: "investment-compliance.html",
      icon: ICONS.compliance,
    },
    {
      id: "investment-performance",
      section: "Investment",
      label: "Performance",
      file: "investment-performance.html",
      icon: ICONS.performance,
    },
    {
      id: "investment-reports",
      section: "Investment",
      label: "Reports",
      file: "investment-reports.html",
      icon: ICONS.reports,
    },

    {
      id: "s-portfolio",
      section: "Portfolio",
      label: "Section:Portfolio",
      isSection: true,
    },
    {
      id: "property-register",
      section: "Portfolio",
      label: "Property Register",
      file: "property-register.html",
      icon: ICONS.building,
    },
    {
      id: "units",
      section: "Portfolio",
      label: "Units & Spaces",
      file: "units.html",
      icon: ICONS.units,
    },
    {
      id: "portfolio-map",
      section: "Portfolio",
      label: "Portfolio Map",
      file: "portfolio-map.html",
      icon: ICONS.map,
    },
    {
      id: "marketing",
      section: "Portfolio",
      label: "Marketing & Vacancies",
      file: "marketing.html",
      icon: ICONS.megaphone,
    },
    {
      id: "add-property",
      section: "Portfolio",
      label: "Add Property",
      file: "add-property.html",
      icon: ICONS.doc,
    },

    {
      id: "s-leasing",
      section: "Leasing",
      label: "Section:Leasing",
      isSection: true,
    },
    {
      id: "applications",
      section: "Leasing",
      label: "Applications",
      file: "applications.html",
      icon: ICONS.clipboard,
    },
    {
      id: "tenants",
      section: "Leasing",
      label: "Tenants",
      file: "tenants.html",
      icon: ICONS.users,
    },
    {
      id: "leases",
      section: "Leasing",
      label: "Leases",
      file: "leases.html",
      icon: ICONS.lease,
    },

    {
      id: "s-finance",
      section: "Finance",
      label: "Section:Finance",
      isSection: true,
    },
    {
      id: "finance-billing",
      section: "Finance",
      label: "Billing & Invoices",
      file: "finance-billing.html",
      icon: ICONS.billing,
      badge: "24",
    },
    {
      id: "finance-payments",
      section: "Finance",
      label: "Payments",
      file: "finance-payments.html",
      icon: ICONS.payments,
    },
    {
      id: "finance-arrears",
      section: "Finance",
      label: "Arrears",
      file: "finance-arrears.html",
      icon: ICONS.arrears,
    },
    {
      id: "finance-service-charges",
      section: "Finance",
      label: "Service Charges",
      file: "finance-service-charges.html",
      icon: ICONS.charges,
    },

    {
      id: "s-operations",
      section: "Operations",
      label: "Section:Operations",
      isSection: true,
    },
    {
      id: "operations-maintenance",
      section: "Operations",
      label: "Maintenance & Facilities",
      file: "operations-maintenance.html",
      icon: ICONS.maintenance,
      badge: "7",
    },
    {
      id: "operations-insurance",
      section: "Operations",
      label: "Insurance Administration",
      file: "operations-insurance.html",
      icon: ICONS.insurance,
    },
    {
      id: "operations-valuations",
      section: "Operations",
      label: "Valuations & Reporting",
      file: "operations-valuations.html",
      icon: ICONS.valuations,
    },
    {
      id: "operations-development",
      section: "Operations",
      label: "Development Projects",
      file: "operations-development.html",
      icon: ICONS.development,
    },
    // Legacy aliases for backward compatibility
    {
      id: "maintenance",
      section: "Operations",
      label: "Maintenance (Legacy)",
      file: "operations-maintenance.html",
      icon: ICONS.maintenance,
      hidden: true,
    },
    {
      id: "insurance",
      section: "Operations",
      label: "Insurance (Legacy)",
      file: "operations-insurance.html",
      icon: ICONS.insurance,
      hidden: true,
    },
    {
      id: "valuations",
      section: "Operations",
      label: "Valuations (Legacy)",
      file: "operations-valuations.html",
      icon: ICONS.valuations,
      hidden: true,
    },
    {
      id: "development",
      section: "Operations",
      label: "Development (Legacy)",
      file: "operations-development.html",
      icon: ICONS.development,
      hidden: true,
    },

    {
      id: "s-enterprise",
      section: "Enterprise",
      label: "Section:Enterprise",
      isSection: true,
    },
    {
      id: "approvals",
      section: "Enterprise",
      label: "Approvals",
      file: "approvals.html",
      icon: ICONS.approval,
      badge: "3",
    },
    {
      id: "conditions-precedent",
      section: "Enterprise",
      label: "Conditions Precedent",
      file: "conditions-precedent.html",
      icon: ICONS.conditions,
    },
    {
      id: "documents",
      section: "Enterprise",
      label: "Documents",
      file: "documents.html",
      icon: ICONS.documents,
    },
    {
      id: "audit-trail",
      section: "Enterprise",
      label: "Audit Trail",
      file: "audit-trail.html",
      icon: ICONS.audit,
    },
    {
      id: "reports",
      section: "Enterprise",
      label: "Property Portfolio Reports",
      file: "reports.html",
      icon: ICONS.reports,
    },
    // --- Enterprise v3.2 - Messaging & Administration (ToR 9.x) - 4 new pages ---
    {
      id: "enterprise-messages",
      section: "Enterprise",
      label: "Messages & Inbox",
      file: "enterprise-messages.html",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H8l-4 4V6c0-1.1.9-2 2-2z"/><path d="M8 10h8M8 14h5"/></svg>`,
      badge: "12",
    },
    {
      id: "enterprise-notices",
      section: "Enterprise",
      label: "Bulk Notices",
      file: "enterprise-notices.html",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-6 9-6 9h18s-6-2-6-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M2 8c0 0 1.5-2 6-2M22 8c0 0-1.5-2-6-2"/></svg>`,
    },
    {
      id: "enterprise-users",
      section: "Enterprise",
      label: "Users & Roles",
      file: "enterprise-users.html",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    },
    {
      id: "enterprise-settings",
      section: "Enterprise",
      label: "System Settings",
      file: "enterprise-settings.html",
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    },
    // Legacy aliases for backward compatibility
    {
      id: "messages",
      section: "Enterprise",
      label: "Messages (Legacy)",
      file: "enterprise-messages.html",
      icon: ICONS.messages,
      hidden: true,
    },
    {
      id: "notices",
      section: "Enterprise",
      label: "Notices (Legacy)",
      file: "enterprise-notices.html",
      icon: ICONS.notices,
      hidden: true,
    },
    {
      id: "users",
      section: "Enterprise",
      label: "Users & Roles (Legacy)",
      file: "enterprise-users.html",
      icon: ICONS.users,
      hidden: true,
    },
    {
      id: "settings",
      section: "Enterprise",
      label: "Settings (Legacy)",
      file: "enterprise-settings.html",
      icon: ICONS.settings,
      hidden: true,
    },
  ];

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customPages);
    const custom = raw ? JSON.parse(raw) : [];
    if (Array.isArray(custom) && custom.length) {
      NAV_CONFIG = NAV_CONFIG.concat(custom);
    }
  } catch (e) {
    console.warn("[Layout] customPages parse failed", e);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m];
    });
  }

  function getPageMeta(pageId) {
    if (!pageId) return null;
    const cleanId = String(pageId).replace(".html", "").trim();
    let meta = NAV_CONFIG.find(function (p) {
      return !p.isSection && p.id === cleanId;
    });
    if (meta) return meta;
    meta = NAV_CONFIG.find(function (p) {
      return !p.isSection && (p.file || "").replace(".html", "") === cleanId;
    });
    return meta || null;
  }

  function guessMeta(pageId) {
    if (!pageId) return null;
    const clean = String(pageId).replace(".html", "");
    const label = clean.replace(/[-_]/g, " ").replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
    const sectionMap = {
      "investment-dashboard": "Overview",
      "investment-assets": "Investment",
      "asset-allocation": "Investment",
      "investment-pipeline": "Investment",
      "investment-appraisals": "Investment",
      "fixed-income": "Investment",
      "listed-equities": "Investment",
      "unlisted-investments": "Investment",
      "collective-investments": "Investment",
      "investment-cash": "Investment",
      "investment-risk": "Investment",
      "investment-compliance": "Investment",
      "investment-performance": "Investment",
      "investment-reports": "Investment",
      approvals: "Enterprise",
      "conditions-precedent": "Enterprise",
      "audit-trail": "Enterprise",
      "add-property": "Portfolio",
      applications: "Leasing",
      tenants: "Leasing",
      leases: "Leasing",
      "finance-billing": "Finance",
      "finance-payments": "Finance",
      "finance-arrears": "Finance",
      "finance-service-charges": "Finance",
      billing: "Finance",
      payments: "Finance",
      arrears: "Finance",
      "service-charges": "Finance",
      maintenance: "Operations",
      utilities: "Operations",
      insurance: "Operations",
      valuations: "Operations",
      development: "Operations",
      "operations-maintenance": "Operations",
      "operations-insurance": "Operations",
      "operations-valuations": "Operations",
      "operations-development": "Operations",
      documents: "Enterprise",
      compliance: "Enterprise",
      reports: "Enterprise",
      messages: "Enterprise",
      notices: "Enterprise",
      users: "Enterprise",
      settings: "Enterprise",
    };
    const section = sectionMap[clean] || "Portfolio";
    const file = clean.includes(".html") ? clean : clean + ".html";
    return { id: clean, label: label, section: section, file: file };
  }

  function getGroupedNav() {
    const groups = [];
    let current = null;
    NAV_CONFIG.forEach(function (item) {
      if (item.isSection) {
        current = { title: item.section, items: [] };
        groups.push(current);
        return;
      }
      if (item.hidden) return;
      if (!current || current.title !== (item.section || "General")) {
        let g = groups.find(function (x) {
          return x.title === (item.section || "General");
        });
        if (!g) {
          g = { title: item.section || "General", items: [] };
          groups.push(g);
        }
        current = g;
      }
      current.items.push(item);
    });
    return groups;
  }

  function resolvePath(file) {
    if (!file) return "#";
    const isIndex = file === "index.html";
    const path = window.location.pathname || "";
    const inPagesFolder =
      path.includes("/pages/") || path.includes("\\pages\\");
    if (isIndex) {
      return inPagesFolder ? "../index.html" : "./index.html";
    }
    return inPagesFolder ? "./" + file : "./pages/" + file;
  }

  function detectCurrentPage() {
    try {
      const path = window.location.pathname.split("/").pop() || "index.html";
      const id = path.replace(".html", "") || "dashboard";
      if (id === "index") return "dashboard";
      return id;
    } catch (e) {
      return "dashboard";
    }
  }

  function renderSidebar(container, currentPageId) {
    const el =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!el) return;
    const grouped = getGroupedNav();
    let isCollapsed = false;
    try {
      isCollapsed = localStorage.getItem(STORAGE_KEYS.collapsed) === "1";
    } catch (e) {}
    let html = "";
    html +=
      '<aside class="sidebar ' +
      (isCollapsed ? "collapsed" : "") +
      '" id="sidebar">';
    html += '<div class="sidebar-header">';
    html += '<div class="brand-mark">PP</div>';
    html +=
      '<div class="brand-text"><strong>PROPERTYPRO</strong><span>Zambia Ltd</span></div>';
    html +=
      '<button class="icon-btn collapse-btn" id="btnCollapseSidebar" aria-label="Collapse" style="margin-left:auto;width:28px;height:28px;background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.08);color:#7B92B2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>';
    html += "</div>";
    html += '<div class="nav" id="navContainer">';

    grouped.forEach(function (group) {
      if (!group.title) return;
      html +=
        '<div class="nav-group"><div class="nav-section-title">' +
        escapeHtml(group.title) +
        "</div>";
      group.items.forEach(function (item) {
        if (item.isSection) return;
        const active = item.id === currentPageId ? "active" : "";
        const badge = item.badge
          ? '<span class="badge">' + escapeHtml(item.badge) + "</span>"
          : "";
        html +=
          '<div class="nav-item ' +
          active +
          '" data-page="' +
          escapeHtml(item.id) +
          '" data-file="' +
          escapeHtml(item.file || "") +
          '"><span class="ico">' +
          (item.icon || "") +
          '</span><span class="nav-label">' +
          escapeHtml(item.label) +
          "</span>" +
          badge +
          "</div>";
      });
      html += "</div>";
    });

    html += "</div>";
    html += '<div class="sidebar-footer">';
    html +=
      '<div class="portfolio-summary"><div class="label">Portfolio Summary</div><div class="vals"><div><strong id="sbPropCount">28</strong><span>Properties</span></div><div><strong id="sbUnitCount">1,842</strong><span>Units</span></div><div><strong id="sbOcc">83%</strong><span>Occupied</span></div></div><div style="margin-top:10px;display:flex;gap:6px"><div style="flex:1;height:4px;background:#1C3A5F;border-radius:20px;overflow:hidden"><i style="display:block;width:83%;height:100%;background:#2563EB;border-radius:20px"></i></div><span style="font-size:10px;color:#7B92B2">ZMW 486.4M</span></div></div>';
    html +=
      '</div></aside><div class="sidebar-overlay" id="sidebarOverlay"></div>';

    el.innerHTML = html;
    const navContainer = el.querySelector("#navContainer");
    if (navContainer) {
      try {
        navContainer.scrollTop = Number(
          sessionStorage.getItem(STORAGE_KEYS.navScrollTop) || 0,
        );
      } catch (e) {
        console.warn("[Layout] sidebar scroll position could not be restored", e);
      }
    }

    el.querySelectorAll(".nav-item[data-page]").forEach(function (node) {
      node.addEventListener("click", function () {
        try {
          sessionStorage.setItem(
            STORAGE_KEYS.navScrollTop,
            String(navContainer ? navContainer.scrollTop : 0),
          );
        } catch (e) {
          console.warn("[Layout] sidebar scroll position could not be saved", e);
        }
        const pageId = node.getAttribute("data-page");
        const meta = getPageMeta(pageId);
        if (meta && meta.file) {
          goToPage(pageId);
        }
      });
    });

    try {
      const s =
        global.state ||
        JSON.parse(
          localStorage.getItem("propertypro_v3") ||
            localStorage.getItem("propertypro_v2") ||
            "{}",
        );
      if (s && s.properties) {
        const propEl = el.querySelector("#sbPropCount");
        const unitEl = el.querySelector("#sbUnitCount");
        const occEl = el.querySelector("#sbOcc");
        if (propEl) propEl.textContent = s.properties.length;
        if (unitEl && s.units)
          unitEl.textContent = (s.units.length || 0).toLocaleString();
        if (occEl && s.properties) {
          const total = s.properties.reduce(function (a, b) {
            return a + (b.units || 0);
          }, 0);
          const occ = s.properties.reduce(function (a, b) {
            return a + (b.occupied || 0);
          }, 0);
          occEl.textContent = total
            ? Math.round((occ / total) * 100) + "%"
            : "83%";
        }
      }
    } catch (e) {}
  }

  function renderTopbar(container, options) {
    options = options || {};
    const el =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!el) return;
    const title = options.title || "";
    el.innerHTML = `
      <header class="topbar">
        <button class="icon-btn" id="btnToggleSidebar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
        <div class="search-wrap" id="topSearchWrap"><span class="search-ico"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></svg></span><input id="searchInput" placeholder="Search properties, tenants, leases, applications..." /><kbd>Ctrl K</kbd></div>
        <div class="topbar-right">
          <button class="icon-btn" id="btnSearchOpen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></svg></button>
          <div style="position:relative">
            <button class="icon-btn" id="btnNotif"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 9a6 6 0 0 1 12 0c0 7 6 7 6 9H0s6-2 6-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg></button>
            <span style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#DC2626;border-radius:50%;border:2px solid #fff"></span>
            <div class="notif-panel" id="notifPanel"><div class="notif-head"><h4>Notifications</h4><button class="btn btn-ghost btn-sm" id="btnCloseNotif">Close</button></div><div class="notif-body" id="notifBody"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;padding-left:10px;border-left:1px solid var(--border)"><div style="text-align:right;line-height:1.1"><div style="font-weight:600;font-size:13px">Chanda Mwanza</div><div style="font-size:11px;color:var(--muted)">Portfolio Manager</div></div><div class="avatar">CM</div></div>
        </div>
      </header>
    `;
    // Bind notif close without inline onclick
    const closeNotifBtn = el.querySelector("#btnCloseNotif");
    if (closeNotifBtn) {
      closeNotifBtn.addEventListener("click", function () {
        const np = document.getElementById("notifPanel");
        if (np) np.classList.remove("open");
      });
    }
  }

  function renderBreadcrumb(container, crumbs) {
    const el =
      typeof container === "string"
        ? document.querySelector(container)
        : container;
    if (!el) return;
    if (!crumbs || !crumbs.length) return;
    let out = "";
    crumbs.forEach(function (c, i) {
      const isLast = i === crumbs.length - 1;
      const sep = i > 0 ? '<span class="sep">›</span>' : "";
      if (isLast) {
        out += sep + "<b>" + escapeHtml(c.label) + "</b>";
      } else {
        const href = c.href
          ? 'href="' + escapeHtml(c.href) + '"'
          : 'href="#" data-page="' + escapeHtml(c.id || c.label) + '"';
        out +=
          sep +
          "<a " +
          href +
          ' data-breadcrumb="true">' +
          escapeHtml(c.label) +
          "</a>";
      }
    });
    el.innerHTML = out;
    el.className = "breadcrumb";
    // Attach click handlers without inline JS to avoid quote escaping issues
    el.querySelectorAll("a[data-breadcrumb]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (this.dataset.page) {
          goToPage(this.dataset.page);
        } else {
          const h = this.getAttribute("href");
          if (h && h !== "#") {
            window.location.href = h;
          }
        }
      });
    });
  }

  function autoBreadcrumbs(currentPageId, extra) {
    extra = extra || [];
    const meta = getPageMeta(currentPageId) || guessMeta(currentPageId);
    if (!meta)
      return [
        { label: "Home", href: resolvePath("index.html") },
        { label: currentPageId, href: "#" },
      ];
    const home = { label: "Home", href: resolvePath("index.html") };
    let sectionFile = "index.html";
    try {
      const secItem = NAV_CONFIG.find(function (p) {
        return p.section === meta.section && !p.isSection;
      });
      if (secItem && secItem.file) sectionFile = secItem.file;
    } catch (e) {}
    const section = meta.section
      ? { label: meta.section, href: resolvePath(sectionFile) }
      : null;
    const current = {
      label: meta.label,
      href: resolvePath(meta.file),
      id: meta.id,
    };
    const crumbs = [home];
    if (section) crumbs.push(section);
    crumbs.push(current);
    return crumbs.concat(extra);
  }

  function goToPage(pageId) {
    const meta = getPageMeta(pageId);
    if (!meta || !meta.file) {
      console.warn("[Layout] goToPage: no meta for", pageId);
      return;
    }
    const target = resolvePath(meta.file);
    window.location.href = target;
  }

  function openSearchFallback() {
    const bd = document.getElementById("globalSearchBackdrop");
    if (bd) bd.classList.add("open");
  }
  function closeSearch() {
    const bd = document.getElementById("globalSearchBackdrop");
    if (bd) bd.classList.remove("open");
  }

  function ensureGlobalElements() {
    if (!document.getElementById("toastContainer")) {
      const tc = document.createElement("div");
      tc.id = "toastContainer";
      tc.className = "toast-container";
      document.body.appendChild(tc);
    }
    if (!document.getElementById("globalSearchBackdrop")) {
      const backdrop = document.createElement("div");
      backdrop.id = "globalSearchBackdrop";
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `
        <div class="modal">
          <div class="modal-head">
            <div style="display:flex;align-items:center;gap:10px;flex:1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></svg>
              <input id="globalSearchInput" placeholder="Search properties, tenants, leases, applications..." style="flex:1;border:0;outline:0;font-size:14px" autofocus />
            </div>
            <button class="btn btn-ghost" id="btnCloseGlobalSearch">Esc</button>
          </div>
          <div class="modal-body">
            <div class="small muted" style="margin-bottom:8px">Try: Zambezi, T-1042, L-2026, APP-, INV-P-001, DEAL-001</div>
            <div id="globalSearchResults"></div>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) {
          backdrop.classList.remove("open");
        }
      });
      const closeBtn = backdrop.querySelector("#btnCloseGlobalSearch");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          backdrop.classList.remove("open");
        });
      }
      const input = backdrop.querySelector("#globalSearchInput");
      if (input && global.handleSearchInputGlobal) {
        input.addEventListener("input", global.handleSearchInputGlobal);
      }
    }
  }

  function init(options) {
    options = options || {};
    const currentPage = options.currentPage || detectCurrentPage();
    let sidebarContainer = document.getElementById("app-sidebar");
    let topbarContainer = document.getElementById("app-topbar");
    let breadcrumbContainer = document.getElementById("app-breadcrumb");

    if (!sidebarContainer) {
      const d = document.createElement("div");
      d.id = "app-sidebar";
      const app = document.querySelector(".app") || document.body;
      if (app) app.prepend(d);
      sidebarContainer = d;
    }
    if (!topbarContainer) {
      const main =
        document.querySelector(".main") || document.querySelector(".app");
      const d = document.createElement("div");
      d.id = "app-topbar";
      if (main) main.prepend(d);
      topbarContainer = d;
    }
    if (!breadcrumbContainer) {
      const main = document.querySelector(".main");
      const content = document.querySelector(".content") || main;
      const d = document.createElement("div");
      d.id = "app-breadcrumb";
      d.className = "breadcrumb";
      d.style.margin = "0 0 12px 0";
      d.style.padding = "0 2px";
      if (content) content.prepend(d);
      breadcrumbContainer = d;
    }

    renderSidebar("#app-sidebar", currentPage);
    renderTopbar("#app-topbar", {
      title:
        options.title ||
        (getPageMeta(currentPage) && getPageMeta(currentPage).label) ||
        (guessMeta(currentPage) && guessMeta(currentPage).label) ||
        "",
      showSearch: options.showSearch,
    });
    ensureGlobalElements();

    if (breadcrumbContainer) {
      const breadcrumbs = options.breadcrumbs || autoBreadcrumbs(currentPage);
      renderBreadcrumb(breadcrumbContainer, breadcrumbs);
      document
        .querySelectorAll(
          ".content > .breadcrumb, .content .pr-breadcrumb, .content > .pr-breadcrumb, .page > .breadcrumb, .pm-page > .breadcrumb",
        )
        .forEach(function (b) {
          if (b.id !== "app-breadcrumb") {
            b.style.display = "none";
            b.setAttribute("data-legacy-hidden", "true");
          }
        });
    }

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearchFallback();
      }
      if (e.key === "Escape") {
        closeSearch();
        const np = document.getElementById("notifPanel");
        if (np) np.classList.remove("open");
      }
    });

    global.goToPage = goToPage;
    global.Layout = {
      init: init,
      goToPage: goToPage,
      renderSidebar: renderSidebar,
      renderTopbar: renderTopbar,
      renderBreadcrumb: renderBreadcrumb,
      autoBreadcrumbs: autoBreadcrumbs,
      NAV_CONFIG: NAV_CONFIG,
      getPageMeta: getPageMeta,
      guessMeta: guessMeta,
      resolvePath: resolvePath,
    };
  }

  if (!global.initCommon) {
    global.initCommon = function (pageId) {
      init({ currentPage: pageId });
      if (global.bindNav) {
        try {
          global.bindNav(pageId);
        } catch (e) {}
      }
    };
  } else {
    const originalInitCommon = global.initCommon;
    global.initCommon = function (pageId) {
      try {
        originalInitCommon(pageId);
      } catch (e) {
        console.warn("[Layout] original initCommon error", e);
      }
      init({ currentPage: pageId });
      try {
        if (global.bindNav) global.bindNav(pageId);
        ensureGlobalElements();
      } catch (e) {
        console.warn("[Layout] post-bind error", e);
      }
    };
  }

  global.Layout = {
    init: init,
    goToPage: goToPage,
    renderSidebar: renderSidebar,
    renderTopbar: renderTopbar,
    renderBreadcrumb: renderBreadcrumb,
    autoBreadcrumbs: autoBreadcrumbs,
    NAV_CONFIG: NAV_CONFIG,
    getPageMeta: getPageMeta,
    guessMeta: guessMeta,
    resolvePath: resolvePath,
    STORAGE_KEYS: STORAGE_KEYS,
  };

  function bindGlobalSidebarControls() {
    if (window._sidebarControlsBound) return;
    window._sidebarControlsBound = true;

    function getSidebar() {
      return (
        document.getElementById("sidebar") || document.querySelector(".sidebar")
      );
    }
    function getOverlay() {
      return (
        document.getElementById("sidebarOverlay") ||
        document.querySelector(".sidebar-overlay")
      );
    }

    function openMobile() {
      const sidebar = getSidebar();
      const overlay = getOverlay();
      if (!sidebar) return;
      sidebar.classList.add("mobile-open");
      if (overlay) overlay.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function closeMobile() {
      const sidebar = getSidebar();
      const overlay = getOverlay();
      if (sidebar) sidebar.classList.remove("mobile-open");
      if (overlay) overlay.classList.remove("open");
      document.body.style.overflow = "";
    }
    function toggleMobile() {
      const sidebar = getSidebar();
      if (!sidebar) return;
      if (sidebar.classList.contains("mobile-open")) closeMobile();
      else openMobile();
    }

    document.addEventListener("click", function (e) {
      const collapseBtn = e.target.closest("#btnCollapseSidebar");
      if (collapseBtn) {
        if (window.innerWidth <= 1024) return;
        e.preventDefault();
        e.stopPropagation();
        const sidebar = getSidebar();
        if (sidebar) {
          sidebar.classList.toggle("collapsed");
          try {
            localStorage.setItem(
              STORAGE_KEYS.collapsed,
              sidebar.classList.contains("collapsed") ? "1" : "0",
            );
          } catch (err) {}
        }
        return;
      }

      const toggleBtn = e.target.closest("#btnToggleSidebar");
      if (toggleBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleMobile();
        return;
      }

      const overlay = e.target.closest("#sidebarOverlay");
      if (overlay && overlay.classList.contains("open")) {
        closeMobile();
        return;
      }

      const navItem = e.target.closest(".nav-item[data-page]");
      if (navItem && window.innerWidth <= 1024) {
        setTimeout(closeMobile, 150);
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeMobile();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "b" &&
        window.innerWidth > 1024
      ) {
        e.preventDefault();
        const sidebar = getSidebar();
        if (sidebar) {
          sidebar.classList.toggle("collapsed");
          try {
            localStorage.setItem(
              STORAGE_KEYS.collapsed,
              sidebar.classList.contains("collapsed") ? "1" : "0",
            );
          } catch (err) {}
        }
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) {
        const overlay = getOverlay();
        if (overlay) overlay.classList.remove("open");
        document.body.style.overflow = "";
        const sidebar = getSidebar();
        if (sidebar) sidebar.classList.remove("mobile-open");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindGlobalSidebarControls);
  } else {
    bindGlobalSidebarControls();
  }

  console.log("[Layout] Loaded FIXED - NAV_CONFIG", NAV_CONFIG.length, "pages");
})(window);

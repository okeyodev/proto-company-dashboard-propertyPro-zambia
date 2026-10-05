/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/units.js
 * ============================================================================
 * PURPOSE:
 *   Page logic for units.js - handles filtering, rendering,
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


/* Units & Spaces - Upgraded - PropertyPro Zambia Ltd */
document.addEventListener("DOMContentLoaded", () => {
  initCommon("units");
  ensureExpandedDataset();
  bindUnitsPage();
  handleQueryParams();
});

const STATUS_META = {
  Occupied: {
    pill: "green",
    short: "OCC",
    bg: "#F0FDF4",
    border: "#BBF7D0",
    color: "#166534",
  },
  Vacant: {
    pill: "amber",
    short: "VAC",
    bg: "#FFFBEB",
    border: "#FDE68A",
    color: "#92400E",
  },
  Reserved: {
    pill: "blue",
    short: "RES",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    color: "#1E40AF",
  },
  Maintenance: {
    pill: "red",
    short: "MAINT",
    bg: "#FEF2F2",
    border: "#FECACA",
    color: "#991B1B",
  },
  Litigation: {
    pill: "gray",
    short: "LIT",
    bg: "#F8FAFC",
    border: "#E2E8F0",
    color: "#475569",
  },
};

let filteredUnits = [];
let currentPage = 1;
let rowsPerPage = 50;
let selectedUnitId = null;
let editingUnitId = null;
let assignSelectedTenantId = null;
let fpZoom = 1;

function ensureExpandedDataset() {
  // Ensure 28 properties exist
  const desiredProps = [
    {
      id: "P-001",
      name: "Zambezi Mall",
      type: "Retail",
      units: 184,
      occupied: 156,
      city: "Lusaka",
      value: 86.4,
      rent: 2.8,
      status: "Stabilized",
      yield: 8.4,
    },
    {
      id: "P-002",
      name: "Riverside Apartments",
      type: "Residential",
      units: 320,
      occupied: 294,
      city: "Lusaka",
      value: 72.1,
      rent: 1.9,
      status: "Stabilized",
      yield: 7.2,
    },
    {
      id: "P-003",
      name: "Chipata Industrial Park",
      type: "Industrial",
      units: 120,
      occupied: 84,
      city: "Chipata",
      value: 54.3,
      rent: 1.2,
      status: "Lease-up",
      yield: 6.8,
    },
    {
      id: "P-004",
      name: "Arcades Office Tower",
      type: "Commercial",
      units: 210,
      occupied: 178,
      city: "Lusaka",
      value: 94.2,
      rent: 2.4,
      status: "Stabilized",
      yield: 8.1,
    },
    {
      id: "P-005",
      name: "Kabwe Retail Centre",
      type: "Retail",
      units: 96,
      occupied: 72,
      city: "Kabwe",
      value: 31.2,
      rent: 0.7,
      status: "Value-Add",
      yield: 7.9,
    },
    {
      id: "P-006",
      name: "Mukuba Business Park",
      type: "Mixed-Use",
      units: 142,
      occupied: 118,
      city: "Ndola",
      value: 44.5,
      rent: 1.1,
      status: "Stabilized",
      yield: 7.5,
    },
    {
      id: "P-007",
      name: "Levy Junction Annex",
      type: "Retail",
      units: 68,
      city: "Lusaka",
      value: 38.2,
      rent: 1.0,
      status: "Stabilized",
      yield: 7.8,
      occupied: 58,
    },
    {
      id: "P-008",
      name: "Woodlands Business Hub",
      type: "Commercial",
      units: 54,
      city: "Lusaka",
      value: 29.5,
      rent: 0.9,
      status: "Stabilized",
      yield: 7.4,
      occupied: 46,
    },
    {
      id: "P-009",
      name: "East Park Mall Extension",
      type: "Retail",
      units: 72,
      city: "Lusaka",
      value: 41.0,
      rent: 1.3,
      status: "Lease-up",
      yield: 7.1,
      occupied: 51,
    },
    {
      id: "P-010",
      name: "Kabulonga Retail Strip",
      type: "Retail",
      units: 36,
      city: "Lusaka",
      value: 18.7,
      rent: 0.5,
      status: "Stabilized",
      yield: 8.0,
      occupied: 33,
    },
    {
      id: "P-011",
      name: "Makumbi Industrial Zone",
      type: "Industrial",
      units: 48,
      city: "Lusaka",
      value: 22.3,
      rent: 0.6,
      status: "Value-Add",
      yield: 6.9,
      occupied: 38,
    },
    {
      id: "P-012",
      name: "Chilenje Market Shops",
      type: "Retail",
      units: 42,
      city: "Lusaka",
      value: 12.4,
      rent: 0.4,
      status: "Stabilized",
      yield: 8.2,
      occupied: 39,
    },
    {
      id: "P-013",
      name: "Manda Hill Central",
      type: "Retail",
      units: 88,
      city: "Lusaka",
      value: 52.1,
      rent: 1.5,
      status: "Stabilized",
      yield: 8.3,
      occupied: 79,
    },
    {
      id: "P-014",
      name: "Ndola Central Mall",
      type: "Retail",
      units: 64,
      city: "Ndola",
      value: 34.6,
      rent: 0.9,
      status: "Stabilized",
      yield: 7.6,
      occupied: 57,
    },
    {
      id: "P-015",
      name: "Kitwe Copper Retail",
      type: "Retail",
      units: 58,
      city: "Kitwe",
      value: 28.9,
      rent: 0.8,
      status: "Lease-up",
      yield: 7.0,
      occupied: 44,
    },
    {
      id: "P-016",
      name: "Livingstone Tourist Market",
      type: "Retail",
      units: 44,
      city: "Livingstone",
      value: 19.5,
      rent: 0.6,
      status: "Stabilized",
      yield: 7.9,
      occupied: 40,
    },
    {
      id: "P-017",
      name: "Chipata Business Square",
      type: "Commercial",
      units: 38,
      city: "Chipata",
      value: 16.2,
      rent: 0.5,
      status: "Value-Add",
      yield: 7.2,
      occupied: 29,
    },
    {
      id: "P-018",
      name: "Kasama Trade Centre",
      type: "Retail",
      units: 32,
      city: "Kasama",
      value: 11.8,
      rent: 0.3,
      status: "Stabilized",
      yield: 7.7,
      occupied: 28,
    },
    {
      id: "P-019",
      name: "Solwezi Mining Supply Hub",
      type: "Industrial",
      units: 52,
      city: "Solwezi",
      value: 26.4,
      rent: 0.7,
      status: "Stabilized",
      yield: 7.3,
      occupied: 47,
    },
    {
      id: "P-020",
      name: "Lusaka East Shopping Mall",
      type: "Retail",
      units: 92,
      city: "Lusaka",
      value: 48.3,
      rent: 1.4,
      status: "Stabilized",
      yield: 8.0,
      occupied: 84,
    },
    {
      id: "P-021",
      name: "Arcades Mall Phase II",
      type: "Retail",
      units: 76,
      city: "Lusaka",
      value: 39.7,
      rent: 1.1,
      status: "Lease-up",
      yield: 7.5,
      occupied: 62,
    },
    {
      id: "P-022",
      name: "Riverside Villas",
      type: "Residential",
      units: 48,
      city: "Lusaka",
      value: 32.5,
      rent: 0.9,
      status: "Stabilized",
      yield: 7.1,
      occupied: 46,
    },
    {
      id: "P-023",
      name: "Ndola Industrial Park North",
      type: "Industrial",
      units: 66,
      city: "Ndola",
      value: 30.1,
      rent: 0.8,
      status: "Value-Add",
      yield: 6.7,
      occupied: 51,
    },
    {
      id: "P-024",
      name: "Copperbelt Logistics Hub",
      type: "Industrial",
      units: 40,
      city: "Kitwe",
      value: 24.2,
      rent: 0.6,
      status: "Stabilized",
      yield: 7.0,
      occupied: 36,
    },
    {
      id: "P-025",
      name: "Lusaka Central Business Tower",
      type: "Commercial",
      units: 112,
      city: "Lusaka",
      value: 68.5,
      rent: 1.8,
      status: "Stabilized",
      yield: 8.2,
      occupied: 98,
    },
    {
      id: "P-026",
      name: "Kabwe Civic Centre Shops",
      type: "Retail",
      units: 28,
      city: "Kabwe",
      value: 9.8,
      rent: 0.3,
      status: "Stabilized",
      yield: 7.8,
      occupied: 25,
    },
    {
      id: "P-027",
      name: "Chingola Market Place",
      type: "Retail",
      units: 34,
      city: "Chingola",
      value: 13.2,
      rent: 0.4,
      status: "Lease-up",
      yield: 7.3,
      occupied: 26,
    },
    {
      id: "P-028",
      name: "Livingstone Airport Retail",
      type: "Retail",
      units: 22,
      city: "Livingstone",
      value: 10.5,
      rent: 0.4,
      status: "Stabilized",
      yield: 8.1,
      occupied: 20,
    },
  ];

  if (!state.properties || state.properties.length < 20) {
    state.properties = desiredProps;
  } else if (state.properties.length < 28) {
    // merge missing
    const existingIds = new Set(state.properties.map((p) => p.id));
    desiredProps.forEach((p) => {
      if (!existingIds.has(p.id)) state.properties.push(p);
    });
  }

  // Ensure tenants expanded for Zambia context
  if (!state.tenants) state.tenants = [];
  const extraTenants = [
    {
      id: "T-1043",
      name: "Pep Stores Zambia",
      property: "Zambezi Mall",
      unit: "A-205",
      rent: 38000,
      balance: 0,
      risk: "Low",
      status: "Active",
      type: "Retail",
      tenure: "2.4y",
    },
    {
      id: "T-1044",
      name: "Hungry Lion",
      property: "Zambezi Mall",
      unit: "A-208",
      rent: 55000,
      balance: 0,
      risk: "Low",
      status: "Active",
      type: "Retail",
      tenure: "1.9y",
    },
    {
      id: "T-1045",
      name: "Liquid Telecom Zambia",
      property: "Arcades Office Tower",
      unit: "2-04",
      rent: 78000,
      balance: 0,
      risk: "Low",
      status: "Active",
      type: "Corporate",
      tenure: "3.3y",
    },
    {
      id: "T-1046",
      name: "ZESCO Ltd",
      property: "Arcades Office Tower",
      unit: "3-02",
      rent: 95000,
      balance: 0,
      risk: "Low",
      status: "Active",
      type: "Corporate",
      tenure: "5.0y",
    },
    {
      id: "T-1047",
      name: "AirTel Zambia",
      property: "Mukuba Business Park",
      unit: "1-08",
      rent: 62000,
      balance: 62000,
      risk: "Medium",
      status: "Active",
      type: "Corporate",
      tenure: "2.1y",
    },
  ];
  extraTenants.forEach((t) => {
    if (!state.tenants.find((x) => x.id === t.id)) state.tenants.push(t);
  });

  // Generate units if too few (<100)
  if (!state.units || state.units.length < 100) {
    state.units = generateFullUnitSet(1842);
  } else {
    // Ensure we have enough floor 2 Zambezi Mall
    const zam2 = state.units.filter(
      (u) => u.property === "Zambezi Mall" && String(u.floor) === "2",
    );
    if (zam2.length < 16) {
      const extraFloor2 = generateZambeziFloor2();
      state.units.push(...extraFloor2);
    }
  }

  // Ensure meters
  if (!state.meters) state.meters = [];
  if (state.meters.length < 5) {
    state.units.slice(0, 50).forEach((u, i) => {
      if (
        !state.meters.find(
          (m) => m.unit === u.unit && m.property === u.property,
        )
      ) {
        state.meters.push({
          id: `MTR-${8800 + i}`,
          property: u.property,
          unit: u.unit,
          type: i % 2 === 0 ? "Electricity" : "Water",
          reading: Math.floor(Math.random() * 900) + 50,
          status: "Active",
          anomaly: "-",
        });
      }
    });
  }

  saveState();
}

function generateFullUnitSet(total) {
  const props = state.properties;
  const tenantsPool = [
    "Bata Zambia",
    "Kabwelwa Supermarket",
    "Shoprite",
    "MTN Zambia",
    "Zambeef Products",
    "Pep Stores Zambia",
    "Hungry Lion",
    "Liquid Telecom Zambia",
    "ZESCO Ltd",
    "AirTel Zambia",
    "Spar Zambia",
    "Game Stores",
    "Woolworths",
    "Jet",
    "FNB Zambia",
    "Zanaco",
    "Standard Chartered",
    "PicknPay",
    "Choppies",
    "Steers",
    "Debonairs",
    "KFC Zambia",
    "Airtel Money",
    "Zamtel",
    "CEC",
    "Dangote Cement",
    "Africell",
    "Toyota Zambia",
    "Madison Finance",
    "-",
  ];
  const statusCounts = {
    Occupied: 1534,
    Vacant: 240,
    Reserved: 42,
    Maintenance: 19,
    Litigation: 7,
  };
  let statusPool = [];
  Object.entries(statusCounts).forEach(([s, c]) => {
    for (let i = 0; i < c; i++) statusPool.push(s);
  });
  // shuffle
  for (let i = statusPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [statusPool[i], statusPool[j]] = [statusPool[j], statusPool[i]];
  }
  let units = [];
  let gIndex = 0;
  const blocks = ["A", "B", "C", "D"];
  const floors = ["G", "1", "2", "3", "4"];
  const types = ["Shop", "Office", "Apartment", "Warehouse"];
  // distribute units per property based on its units field
  props.forEach((p) => {
    const count = p.units || 60;
    for (let i = 0; i < count; i++) {
      if (gIndex >= total) break;
      const block = blocks[Math.floor(Math.random() * blocks.length)];
      const floor = floors[Math.floor(Math.random() * floors.length)];
      // bias Zambezi Mall to have more floors 2
      let finalFloor = floor;
      if (p.id === "P-001" && i < 48) {
        finalFloor = String(
          Math.floor(i / 12) + 1 === 0 ? "G" : Math.floor(i / 12) + 1,
        );
        if (finalFloor === "1" && i >= 24) finalFloor = "2";
        if (i >= 0 && i < 12) finalFloor = "G";
        else if (i < 24) finalFloor = "1";
        else if (i < 48) finalFloor = "2";
        else if (i < 64) finalFloor = "3";
      }
      const seq = String(Math.floor(i % 24) + 1).padStart(2, "0");
      const unitCode = `${finalFloor === "G" ? "G" : finalFloor}${seq}`;
      const fullUnitCode = `${block}-${unitCode}`;
      const type =
        p.type === "Retail"
          ? "Shop"
          : p.type === "Commercial"
            ? "Office"
            : p.type === "Residential"
              ? "Apartment"
              : p.type === "Industrial"
                ? "Warehouse"
                : types[Math.floor(Math.random() * types.length)];
      const area =
        type === "Shop"
          ? Math.floor(Math.random() * 120) + 40
          : type === "Office"
            ? Math.floor(Math.random() * 180) + 45
            : type === "Apartment"
              ? Math.floor(Math.random() * 90) + 35
              : Math.floor(Math.random() * 300) + 80;
      const status = statusPool[gIndex] || "Occupied";
      const tenant =
        status === "Occupied"
          ? tenantsPool[Math.floor(Math.random() * (tenantsPool.length - 1))]
          : "-";
      const rent =
        status === "Maintenance" || status === "Litigation"
          ? 0
          : status === "Vacant"
            ? Math.floor(
                area *
                  (p.type === "Retail"
                    ? 620
                    : p.type === "Commercial"
                      ? 450
                      : 250),
              )
            : Math.floor(
                area *
                  (p.type === "Retail"
                    ? 580
                    : p.type === "Commercial"
                      ? 420
                      : 300),
              ) + Math.floor(Math.random() * 5000);
      const idNum = String(gIndex + 1).padStart(4, "0");
      const unitId = `U-${idNum}`;
      const leaseId =
        status === "Occupied"
          ? `L-2026-${String(400 + Math.floor(Math.random() * 300)).padStart(5, "0")}`
          : "-";
      const meterId = `MTR-${8800 + gIndex}`;
      const service = Math.floor(rent * 0.15);
      units.push({
        id: unitId,
        property: p.name,
        propertyId: p.id,
        block: block,
        floor: finalFloor,
        unit: fullUnitCode,
        unitCode: unitCode,
        type: type,
        area: area,
        status: status,
        tenant: tenant,
        rent: rent,
        leaseId: leaseId,
        meterId: meterId,
        serviceCharge: service,
        yield: p.yield,
      });
      gIndex++;
    }
  });
  // If still less than total, fill random
  while (units.length < total) {
    const p = props[Math.floor(Math.random() * props.length)];
    const block = blocks[Math.floor(Math.random() * blocks.length)];
    const floor = floors[Math.floor(Math.random() * floors.length)];
    const unitCode = `${floor}${String(Math.floor(Math.random() * 24) + 1).padStart(2, "0")}`;
    const fullUnitCode = `${block}-${unitCode}`;
    const type = types[Math.floor(Math.random() * types.length)];
    const area = Math.floor(Math.random() * 180) + 40;
    const status = statusPool[units.length] || "Occupied";
    const tenant =
      status === "Occupied"
        ? tenantsPool[Math.floor(Math.random() * (tenantsPool.length - 1))]
        : "-";
    const rent = status === "Maintenance" ? 0 : Math.floor(area * 350);
    units.push({
      id: `U-${String(units.length + 1).padStart(4, "0")}`,
      property: p.name,
      propertyId: p.id,
      block,
      floor,
      unit: fullUnitCode,
      unitCode,
      type,
      area,
      status,
      tenant,
      rent,
      leaseId:
        status === "Occupied"
          ? `L-2026-${String((400 + Math.random() * 300) | 0).padStart(5, "0")}`
          : "-",
      meterId: `MTR-${8800 + units.length}`,
      serviceCharge: Math.floor(rent * 0.15),
      yield: p.yield,
    });
  }
  // Ensure specific seeded units for demo consistency: overwrite first few to match spec example
  const demo = [
    {
      id: "U-0201",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "A",
      floor: "2",
      unit: "A-201",
      unitCode: "201",
      type: "Shop",
      area: 96,
      status: "Occupied",
      tenant: "Bata Zambia",
      rent: 42000,
      leaseId: "L-2026-00471",
      meterId: "MTR-8821",
      serviceCharge: 6300,
      yield: 8.4,
    },
    {
      id: "U-0202",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "A",
      floor: "2",
      unit: "A-202",
      unitCode: "202",
      type: "Shop",
      area: 120,
      status: "Occupied",
      tenant: "Kabwelwa Supermarket",
      rent: 85000,
      leaseId: "L-2026-00482",
      meterId: "MTR-8822",
      serviceCharge: 12750,
      yield: 8.4,
    },
    {
      id: "U-0203",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "A",
      floor: "2",
      unit: "A-203",
      unitCode: "203",
      type: "Shop",
      area: 110,
      status: "Vacant",
      tenant: "-",
      rent: 75000,
      leaseId: "-",
      meterId: "MTR-8823",
      serviceCharge: 0,
      yield: 8.4,
    },
    {
      id: "U-0204",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "A",
      floor: "2",
      unit: "A-204",
      unitCode: "204",
      type: "Shop",
      area: 88,
      status: "Occupied",
      tenant: "Pep Stores Zambia",
      rent: 38000,
      leaseId: "L-2026-00488",
      meterId: "MTR-8824",
      serviceCharge: 5700,
      yield: 8.4,
    },
    {
      id: "U-0205",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "A",
      floor: "2",
      unit: "A-205",
      unitCode: "205",
      type: "Shop",
      area: 92,
      status: "Occupied",
      tenant: "Hungry Lion",
      rent: 55000,
      leaseId: "L-2026-00490",
      meterId: "MTR-8825",
      serviceCharge: 8250,
      yield: 8.4,
    },
    {
      id: "U-0206",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "B",
      floor: "2",
      unit: "B-206",
      unitCode: "206",
      type: "Shop",
      area: 88,
      status: "Maintenance",
      tenant: "-",
      rent: 0,
      leaseId: "-",
      meterId: "MTR-8826",
      serviceCharge: 0,
      yield: 8.4,
    },
    {
      id: "U-0207",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "B",
      floor: "2",
      unit: "B-207",
      unitCode: "207",
      type: "Shop",
      area: 76,
      status: "Vacant",
      tenant: "-",
      rent: 48000,
      leaseId: "-",
      meterId: "MTR-8827",
      serviceCharge: 0,
      yield: 8.4,
    },
    {
      id: "U-0208",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "B",
      floor: "2",
      unit: "B-208",
      unitCode: "208",
      type: "Shop",
      area: 102,
      status: "Occupied",
      tenant: "Spar Zambia",
      rent: 62000,
      leaseId: "L-2026-00495",
      meterId: "MTR-8828",
      serviceCharge: 9300,
      yield: 8.4,
    },
  ];
  demo.forEach((d) => {
    const idx = units.findIndex(
      (u) => u.property === "Zambezi Mall" && u.unit === d.unit,
    );
    if (idx >= 0) units[idx] = d;
    else units.unshift(d);
  });
  return units;
}

function generateZambeziFloor2() {
  return [
    {
      id: "U-0201",
      property: "Zambezi Mall",
      propertyId: "P-001",
      block: "A",
      floor: "2",
      unit: "A-201",
      unitCode: "201",
      type: "Shop",
      area: 96,
      status: "Occupied",
      tenant: "Bata Zambia",
      rent: 42000,
      leaseId: "L-2026-00471",
      meterId: "MTR-8821",
      serviceCharge: 6300,
      yield: 8.4,
    },
  ];
}

function bindUnitsPage() {
  populatePropertyDropdowns();
  populateTenantDropdowns();
  renderAll();
  bindEvents();
}

function populatePropertyDropdowns() {
  const sel = document.getElementById("filterProperty");
  const fpSel = document.getElementById("fpProperty");
  const auSel = document.getElementById("auProperty");
  if (!sel) return;
  const props = state.properties
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const options = props
    .map(
      (p) =>
        `<option value="${p.name}" data-id="${p.id}">${p.name} (${p.id})</option>`,
    )
    .join("");
  sel.innerHTML = `<option value="all">All Properties (28)</option>` + options;
  if (fpSel) fpSel.innerHTML = options;
  if (auSel) auSel.innerHTML = options;
  // Default floor plan to Zambezi Mall
  if (fpSel) fpSel.value = "Zambezi Mall";
}

function populateTenantDropdowns() {
  const auTenant = document.getElementById("auTenant");
  if (!auTenant) return;
  const tenants = state.tenants || [];
  auTenant.innerHTML =
    `<option value="-">- No tenant / Vacant -</option>` +
    tenants
      .map(
        (t) =>
          `<option value="${t.name}">${t.name} • ${t.property} • ZMW ${Number(t.rent).toLocaleString()}</option>`,
      )
      .join("");
}

function renderAll() {
  applyFilters();
  renderKPIs();
  renderFloorPlan();
}

function applyFilters() {
  const prop = document.getElementById("filterProperty")?.value || "all";
  const status = document.getElementById("filterStatus")?.value || "all";
  const type = document.getElementById("filterType")?.value || "all";
  const floor = document.getElementById("filterFloor")?.value || "all";
  const q =
    document.getElementById("unitSearch")?.value.trim().toLowerCase() || "";
  let units = state.units.slice();
  if (prop !== "all") units = units.filter((u) => u.property === prop);
  if (status !== "all") units = units.filter((u) => u.status === status);
  if (type !== "all") units = units.filter((u) => u.type === type);
  if (floor !== "all")
    units = units.filter((u) => String(u.floor) === String(floor));
  if (q) {
    units = units.filter(
      (u) =>
        u.id.toLowerCase().includes(q) ||
        u.unit.toLowerCase().includes(q) ||
        u.tenant.toLowerCase().includes(q) ||
        u.property.toLowerCase().includes(q) ||
        u.block.toLowerCase().includes(q) ||
        u.leaseId.toLowerCase().includes(q),
    );
  }
  filteredUnits = units;
  currentPage = 1;
  renderTable();
  renderActiveTags();
}

function renderActiveTags() {
  const container = document.getElementById("activeTags");
  if (!container) return;
  const tags = [];
  const prop = document.getElementById("filterProperty")?.value;
  const status = document.getElementById("filterStatus")?.value;
  const type = document.getElementById("filterType")?.value;
  const floor = document.getElementById("filterFloor")?.value;
  if (prop && prop !== "all") tags.push({ k: "Property", v: prop });
  if (status && status !== "all") tags.push({ k: "Status", v: status });
  if (type && type !== "all") tags.push({ k: "Type", v: type });
  if (floor && floor !== "all") tags.push({ k: "Floor", v: floor });
  container.innerHTML =
    tags
      .map(
        (t) =>
          `<span class="f-tag">${t.k}: ${t.v} <button onclick="clearFilter('${t.k}')">✕</button></span>`,
      )
      .join("") +
    (tags.length
      ? `<span class="f-tag" style="background:#F8FAFC;border-color:var(--border)"><button onclick="clearAllFilters()">Clear all</button></span>`
      : "");
}

window.clearFilter = (key) => {
  if (key === "Property")
    document.getElementById("filterProperty").value = "all";
  if (key === "Status") document.getElementById("filterStatus").value = "all";
  if (key === "Type") document.getElementById("filterType").value = "all";
  if (key === "Floor") document.getElementById("filterFloor").value = "all";
  applyFilters();
};
window.clearAllFilters = () => {
  document.getElementById("filterProperty").value = "all";
  document.getElementById("filterStatus").value = "all";
  document.getElementById("filterType").value = "all";
  document.getElementById("filterFloor").value = "all";
  document.getElementById("unitSearch").value = "";
  applyFilters();
};

function renderKPIs() {
  const total = state.units.length;
  const occ = state.units.filter((u) => u.status === "Occupied").length;
  const vacPure = state.units.filter((u) => u.status === "Vacant").length;
  const res = state.units.filter((u) => u.status === "Reserved").length;
  const maint = state.units.filter((u) => u.status === "Maintenance").length;
  const lit = state.units.filter((u) => u.status === "Litigation").length;
  const vacTotal = vacPure + res + maint + lit;
  const kpis = document.querySelectorAll(".units-kpi .kpi .value");
  if (kpis.length >= 6) {
    kpis[0].textContent = total.toLocaleString();
    kpis[1].textContent = occ.toLocaleString();
    kpis[2].textContent = vacTotal.toLocaleString();
    kpis[3].textContent = res.toLocaleString();
    kpis[4].textContent = maint.toLocaleString();
    kpis[5].textContent = lit.toLocaleString();
  }
  const headerStats = document.getElementById("headerStats");
  if (headerStats)
    headerStats.textContent = `${total.toLocaleString()} total • Occupied ${occ.toLocaleString()} • Vacant ${vacTotal.toLocaleString()} • Reserved ${res} • Maintenance ${maint} • Litigation ${lit}`;
}

function renderTable() {
  const tbody = document.getElementById("unitsTbody");
  if (!tbody) return;
  const start = (currentPage - 1) * rowsPerPage;
  const paged = filteredUnits.slice(start, start + rowsPerPage);
  tbody.innerHTML =
    paged
      .map((u) => {
        const meta = STATUS_META[u.status] || STATUS_META["Vacant"];
        const rentFmt = u.rent ? `ZMW ${Number(u.rent).toLocaleString()}` : "-";
        const tenantDisplay =
          u.tenant && u.tenant !== "-"
            ? u.tenant
            : '<span class="muted">-</span>';
        return `<tr data-unit="${u.id}">
      <td><div class="unit-cell"><strong>${u.unit}</strong><span>${u.id}</span></div></td>
      <td><span title="${u.propertyId}">${u.property}</span></td>
      <td>${u.block}</td>
      <td><span class="pill gray" style="padding:2px 6px">${u.floor}</span></td>
      <td>${u.type}</td>
      <td>${u.area} m²</td>
      <td>${tenantDisplay}</td>
      <td class="rent">${rentFmt}</td>
      <td><span class="pill ${meta.pill}">${meta.short}</span></td>
      <td><button class="dots-btn" data-unit="${u.id}" aria-label="Actions">⋮</button></td>
    </tr>`;
      })
      .join("") ||
    `<tr><td colspan="10" style="text-align:center;padding:32px" class="muted">No units match filters</td></tr>`;

  document.getElementById("tableCount").textContent =
    `${filteredUnits.length.toLocaleString()} units`;
  document.getElementById("paginationInfo").textContent =
    `Showing ${filteredUnits.length ? start + 1 : 0}-${Math.min(start + rowsPerPage, filteredUnits.length)} of ${filteredUnits.length.toLocaleString()}`;
  document.getElementById("pageIndicator").textContent =
    `Page ${currentPage} of ${Math.max(1, Math.ceil(filteredUnits.length / rowsPerPage))}`;

  // bind dots
  tbody.querySelectorAll(".dots-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openContextMenu(e, btn.dataset.unit);
    });
  });
  tbody.querySelectorAll("tr[data-unit]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const uid = tr.dataset.unit;
      openUnitDrawer(uid);
    });
  });
}

/* Floor Plan */
function renderFloorPlan() {
  const prop = document.getElementById("fpProperty")?.value || "Zambezi Mall";
  const floor = document.getElementById("fpFloor")?.value || "2";
  const block = document.getElementById("fpBlock")?.value || "all";
  const grid = document.getElementById("floorPlanGrid");
  if (!grid) return;
  let units = state.units.filter(
    (u) => u.property === prop && String(u.floor) === String(floor),
  );
  if (block !== "all") units = units.filter((u) => u.block === block);
  units.sort((a, b) => a.unit.localeCompare(b.unit));
  if (units.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px" class="muted">No units for ${prop} • Floor ${floor}${block !== "all" ? " Block " + block : ""} — create units to populate</div>`;
    return;
  }
  // limit visual to 32 for clarity but show all
  document.getElementById("fpCount").textContent = `${units.length} units`;
  document.getElementById("fpTitle").textContent =
    `${prop} — Floor ${floor}${block !== "all" ? " Block " + block : ""}`;
  document.getElementById("fpMeta").textContent =
    `${prop} • ${block === "all" ? "Block A-D" : "Block " + block} • Floor ${floor} • ${units.length} units on this floor`;
  const occ = units.filter((u) => u.status === "Occupied").length;
  const occPct = units.length ? Math.round((occ / units.length) * 100) : 0;
  document.getElementById("fpOccupancy").textContent =
    `Occupancy ${occPct}% on this floor • ${occ} occupied`;
  grid.style.transform = `scale(${fpZoom})`;
  grid.style.transformOrigin = "top left";
  grid.innerHTML = units
    .map((u) => {
      const meta = STATUS_META[u.status] || STATUS_META["Vacant"];
      const statusClass = u.status.toLowerCase();
      const tenantShort =
        u.tenant === "-"
          ? ""
          : u.tenant.length > 14
            ? u.tenant.slice(0, 14) + "…"
            : u.tenant;
      const isEmpty = u.tenant === "-";
      return `<div class="fp-unit ${statusClass}" data-unit="${u.id}" data-property="${u.property}" data-block="${u.block}" data-floor="${u.floor}" data-tenant="${u.tenant}" data-rent="${u.rent}" data-area="${u.area}" data-status="${u.status}" data-lease="${u.leaseId}" data-meter="${u.meterId}">
      <div class="fp-unit-top"><span class="fp-unit-code">${u.unit}</span><span class="fp-unit-id">${u.id}</span></div>
      <div><span class="fp-status-pill ${meta.pill === "green" ? "occ" : meta.pill === "amber" ? "vac" : meta.pill === "red" ? "maint" : meta.pill === "blue" ? "res" : "lit"}">${meta.short}</span></div>
      <div class="fp-tenant ${isEmpty ? "empty" : ""}">${isEmpty ? "Vacant" : tenantShort}</div>
      <div class="fp-meta-small">${u.area}m² • ZMW ${u.rent ? (u.rent / 1000).toFixed(0) + "k" : "-"}</div>
    </div>`;
    })
    .join("");

  // bind hover and click
  grid.querySelectorAll(".fp-unit").forEach((el) => {
    el.addEventListener("click", () => openUnitDrawer(el.dataset.unit));
    el.addEventListener("mouseenter", (e) => showTooltip(e, el));
    el.addEventListener("mousemove", (e) => moveTooltip(e));
    el.addEventListener("mouseleave", hideTooltip);
  });
}

function showTooltip(e, el) {
  const tip = document.getElementById("fpTooltip");
  const data = el.dataset;
  const meta = STATUS_META[data.status] || STATUS_META["Vacant"];
  tip.innerHTML = `<strong>${data.unit} • ${data.id}</strong><br/>${el.dataset.property} • Block ${data.block} • Floor ${data.floor}<br/>Status: <span style="color:${meta.color};background:${meta.bg};padding:1px 6px;border-radius:10px;border:1px solid ${meta.border}">${data.status}</span><br/>Area: ${data.area}m² • Rent: ZMW ${Number(data.rent).toLocaleString()}<br/>Tenant: ${data.tenant}<br/>Lease: ${data.lease} • Meter: ${data.meter}`;
  tip.style.display = "block";
  moveTooltip(e);
}
function moveTooltip(e) {
  const tip = document.getElementById("fpTooltip");
  const x = e.clientX,
    y = e.clientY;
  tip.style.left = x + 12 + "px";
  tip.style.top = y - tip.offsetHeight - 12 + "px";
  // keep in viewport
  const rect = tip.getBoundingClientRect();
  if (rect.right > window.innerWidth)
    tip.style.left = window.innerWidth - rect.width - 12 + "px";
  if (rect.top < 0) tip.style.top = y + 16 + "px";
}
function hideTooltip() {
  document.getElementById("fpTooltip").style.display = "none";
}

/* Drawer */
function openUnitDrawer(unitId) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return;
  selectedUnitId = unitId;
  const drawer = document.getElementById("unitDrawer");
  document.getElementById("drawerUnitId").textContent = unit.id;
  const meta = STATUS_META[unit.status] || STATUS_META["Vacant"];
  document.getElementById("drawerStatus").textContent = meta.short;
  document.getElementById("drawerStatus").className = `pill ${meta.pill}`;
  document.getElementById("drawerLeaseId").textContent = unit.leaseId;
  document.getElementById("drawerTitle").textContent =
    `Unit ${unit.unit} — ${unit.property}`;
  document.getElementById("drawerSubtitle").textContent =
    `${unit.property} • Block ${unit.block} • Floor ${unit.floor} • ${unit.area}m² • ${unit.type} • ${unit.tenant}`;
  document.getElementById("dArea").textContent = `${unit.area} m²`;
  document.getElementById("dType").textContent = unit.type;
  document.getElementById("dBlockFloor").textContent =
    `${unit.block} / ${unit.floor}`;
  document.getElementById("dTenant").textContent = unit.tenant;
  document.getElementById("dRent").textContent = unit.rent
    ? `ZMW ${Number(unit.rent).toLocaleString()}`
    : "-";
  document.getElementById("dService").textContent = unit.serviceCharge
    ? `ZMW ${Number(unit.serviceCharge).toLocaleString()}`
    : "-";
  document.getElementById("dLease").textContent = unit.leaseId;
  document.getElementById("dMeter").textContent = unit.meterId;
  document.getElementById("dStatus").textContent = unit.status;
  document.getElementById("dYield").textContent =
    `${unit.yield || 7.5}% • ${state.properties.find((p) => p.name === unit.property)?.status || "Stabilized"}`;

  // populate tabs
  renderDrawerTabs(unit);

  drawer.classList.add("open");
  document.body.style.overflow = "hidden";
}

function renderDrawerTabs(unit) {
  // Lease
  const lease = state.leases?.find((l) => l.id === unit.leaseId) || null;
  document.getElementById("drawerLeaseContent").innerHTML = lease
    ? `<div class="card inner"><div class="card-head"><h4>${lease.id} • ${lease.status}</h4><span class="pill blue">${lease.status}</span></div><div class="card-body"><div class="stack"><div><b>Tenant:</b> ${lease.tenant}</div><div><b>Property:</b> ${lease.property}</div><div><b>Period:</b> ${lease.start} → ${lease.end}</div><div><b>Rent:</b> ZMW ${Number(lease.rent).toLocaleString()} • Esc: ${lease.esc}</div><div><b>Deposit:</b> ZMW ${Number(lease.deposit).toLocaleString()}</div><div style="margin-top:8px;display:flex;gap:8px"><button class="btn btn-primary sm" onclick="goToPage('leases?lease=${lease.id}')">Open Lease Admin</button></div></div></div></div>`
    : `<div class="muted small" style="padding:12px">${unit.status === "Occupied" ? "Lease " + unit.leaseId + " • Active • Tenant " + unit.tenant + " • Rent ZMW " + unit.rent : "No active lease • Unit vacant • Ready for marketing"}</div>`;

  // Payments
  const invoices = (state.invoices || [])
    .filter((inv) => inv.tenant === unit.tenant)
    .slice(0, 6);
  document.getElementById("drawerPaymentsContent").innerHTML = invoices.length
    ? `<div class="table-wrap"><table style="width:100%;font-size:12.5px"><thead><tr><th>Invoice</th><th>Period</th><th>Amount</th><th>Status</th></tr></thead><tbody>${invoices.map((i) => `<tr><td>${i.id}</td><td>${i.period}</td><td>ZMW ${Number(i.amount).toLocaleString()}</td><td><span class="pill ${i.status === "Paid" ? "green" : "red"}">${i.status}</span></td></tr>`).join("")}</tbody></table></div>`
    : `<div class="muted small" style="padding:12px">No payments for ${unit.tenant}</div>`;

  // Maintenance
  const maint = (state.maintenance || [])
    .filter(
      (m) =>
        m.property === unit.property &&
        (m.unit === unit.unit || m.unit === unit.unitCode),
    )
    .slice(0, 6);
  document.getElementById("drawerMaintContent").innerHTML = maint.length
    ? maint
        .map(
          (m) =>
            `<div style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between"><div><strong>${m.id}</strong> • ${m.cat} • ${m.priority}<br/><span class="small muted">${m.status} • ${m.sla} • ${m.age}</span></div><span class="pill ${m.status === "In Progress" ? "blue" : m.status === "Reported" ? "amber" : "green"}">${m.status}</span></div>`,
        )
        .join("") +
      `<button class="btn btn-primary sm" onclick="createMaintenanceForCurrent()">+ New Request</button>`
    : `<div class="muted small" style="padding:12px">No maintenance tickets • <button class="btn sm" onclick="createMaintenanceForCurrent()">Create Request</button></div>`;

  // Utilities
  const meter = (state.meters || []).find(
    (m) =>
      m.id === unit.meterId ||
      (m.property === unit.property && m.unit === unit.unit),
  );
  document.getElementById("drawerUtilContent").innerHTML = meter
    ? `<div class="card inner"><div class="card-head"><h4>${meter.id} • ${meter.type}</h4><span class="pill ${meter.anomaly !== "-" ? "amber" : "green"}">${meter.status}</span></div><div class="card-body"><div>Reading: <b>${meter.reading}</b> • Anomaly: ${meter.anomaly}</div><div style="margin-top:8px"><button class="btn sm" onclick="goToPage('utilities?meter=${meter.id}')">View Meter ${meter.id}</button></div></div></div>`
    : `<div class="muted small">Meter ${unit.meterId} • No readings • <button class="btn sm" onclick="goToPage('utilities')">Open Utilities</button></div>`;

  // Documents
  const docs = (state.documents || [])
    .filter((d) => d.property === unit.property)
    .slice(0, 6);
  document.getElementById("drawerDocsContent").innerHTML = docs.length
    ? docs
        .map(
          (d) =>
            `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><div><b>${d.name}</b><br/><span class="small muted">${d.category} • ${d.version} • ${d.size}</span></div><span class="small muted">${d.updated}</span></div>`,
        )
        .join("")
    : `<div class="muted small" style="padding:12px">No documents for ${unit.property}</div>`;
}

function closeUnitDrawer() {
  document.getElementById("unitDrawer").classList.remove("open");
  document.body.style.overflow = "";
  selectedUnitId = null;
}

/* Context Menu */
function openContextMenu(e, unitId) {
  const menu = document.getElementById("ctxMenu");
  menu.dataset.unit = unitId;
  menu.style.left = e.clientX + "px";
  menu.style.top = e.clientY + "px";
  menu.classList.add("open");
  // adjust if offscreen
  setTimeout(() => {
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth)
      menu.style.left = window.innerWidth - rect.width - 8 + "px";
    if (rect.bottom > window.innerHeight)
      menu.style.top = window.innerHeight - rect.height - 8 + "px";
  }, 0);
}
function closeContextMenu() {
  document.getElementById("ctxMenu").classList.remove("open");
}

/* Add Unit */
function openAddUnitModal(editId = null) {
  editingUnitId = editId;
  const modal = document.getElementById("addUnitModal");
  const title = document.getElementById("addUnitTitle");
  if (editId) {
    const u = state.units.find((x) => x.id === editId);
    if (!u) return;
    title.textContent = `Edit Unit ${u.unit}`;
    document.getElementById("auProperty").value = u.property;
    document.getElementById("auBlock").value = u.block;
    document.getElementById("auFloor").value = u.floor;
    document.getElementById("auUnitCode").value =
      u.unitCode || u.unit.split("-").pop();
    document.getElementById("auType").value = u.type;
    document.getElementById("auArea").value = u.area;
    document.getElementById("auRent").value = u.rent;
    document.getElementById("auStatus").value = u.status;
    document.getElementById("auTenant").value = u.tenant;
  } else {
    title.textContent = "Add Unit";
    document.getElementById("addUnitForm").reset();
    document.getElementById("auProperty").value =
      document.getElementById("fpProperty")?.value ||
      state.properties[0]?.name ||
      "Zambezi Mall";
    document.getElementById("auFloor").value =
      document.getElementById("fpFloor")?.value || "2";
    document.getElementById("auBlock").value = "A";
  }
  modal.classList.add("open");
}
function closeAddUnitModal() {
  document.getElementById("addUnitModal").classList.remove("open");
  editingUnitId = null;
}

function handleAddUnitSubmit(e) {
  e.preventDefault();
  const property = document.getElementById("auProperty").value;
  const block = document.getElementById("auBlock").value.trim().toUpperCase();
  const floor = document.getElementById("auFloor").value;
  const unitCodeRaw = document.getElementById("auUnitCode").value.trim();
  const type = document.getElementById("auType").value;
  const area = parseFloat(document.getElementById("auArea").value);
  const rent = parseFloat(document.getElementById("auRent").value);
  const status = document.getElementById("auStatus").value;
  const tenant = document.getElementById("auTenant").value;
  if (
    !property ||
    !block ||
    !floor ||
    !unitCodeRaw ||
    !type ||
    isNaN(area) ||
    isNaN(rent)
  ) {
    toast("Please fill all required fields", "error");
    return;
  }
  if (area <= 0) {
    toast("Area must be >0", "error");
    return;
  }
  if (rent < 0) {
    toast("Rent cannot be negative", "error");
    return;
  }
  const propObj = state.properties.find((p) => p.name === property);
  const unitCode = unitCodeRaw.includes("-")
    ? unitCodeRaw
    : `${block}-${floor === "G" ? "G" : ""}${unitCodeRaw}`;
  const finalUnitCode = unitCodeRaw;
  if (editingUnitId) {
    const idx = state.units.findIndex((u) => u.id === editingUnitId);
    if (idx >= 0) {
      const prevStatus = state.units[idx].status;
      state.units[idx] = {
        ...state.units[idx],
        property,
        propertyId: propObj?.id || "P-001",
        block,
        floor,
        unit: unitCode.includes("-") ? unitCode : `${block}-${finalUnitCode}`,
        unitCode: finalUnitCode,
        type,
        area,
        rent: status === "Maintenance" || status === "Litigation" ? 0 : rent,
        status,
        tenant: status === "Occupied" ? tenant : "-",
        leaseId:
          status === "Occupied" && tenant !== "-"
            ? `L-2026-${String(400 + Math.floor(Math.random() * 300)).padStart(5, "0")}`
            : "-",
        serviceCharge: Math.floor(rent * 0.15),
      };
      // adjust property occupied if status changed
      if (prevStatus !== status && propObj) {
        if (prevStatus === "Occupied" && status !== "Occupied")
          propObj.occupied = Math.max(0, (propObj.occupied || 0) - 1);
        if (prevStatus !== "Occupied" && status === "Occupied")
          propObj.occupied = (propObj.occupied || 0) + 1;
      }
      saveState();
      toast(`Unit ${state.units[idx].unit} updated`, "success");
    }
  } else {
    const exists = state.units.find(
      (u) => u.property === property && u.unit === unitCode,
    );
    if (exists) {
      toast("Unit code already exists for this property", "error");
      return;
    }
    const newId = `U-${String(state.units.length + 1).padStart(4, "0")}`;
    const newUnit = {
      id: newId,
      property,
      propertyId: propObj?.id || "P-001",
      block,
      floor,
      unit: unitCode.includes("-") ? unitCode : `${block}-${finalUnitCode}`,
      unitCode: finalUnitCode,
      type,
      area,
      rent: status === "Maintenance" || status === "Litigation" ? 0 : rent,
      status,
      tenant: status === "Occupied" ? tenant : "-",
      leaseId:
        status === "Occupied" && tenant !== "-"
          ? `L-2026-${String(400 + Math.floor(Math.random() * 300)).padStart(5, "0")}`
          : "-",
      meterId: `MTR-${8800 + state.units.length}`,
      serviceCharge: Math.floor(rent * 0.15),
      yield: propObj?.yield || 7.5,
    };
    state.units.unshift(newUnit);
    if (propObj) {
      propObj.units = (propObj.units || 0) + 1;
      if (status === "Occupied") propObj.occupied = (propObj.occupied || 0) + 1;
    }
    saveState();
    toast(`Unit ${newUnit.unit} added to ${property}`, "success");
  }
  closeAddUnitModal();
  renderAll();
}

/* Assign Tenant */
function openAssignModal(unitId) {
  const unit = state.units.find((u) => u.id === unitId);
  if (!unit) return;
  selectedUnitId = unitId;
  document.getElementById("assignUnitLabel").textContent =
    `Unit ${unit.unit} • ${unit.property} • ${unit.block} / Floor ${unit.floor} • ${unit.area}m²`;
  document.getElementById("assignTenantModal").classList.add("open");
  renderAssignList("");
}
function closeAssignModal() {
  document.getElementById("assignTenantModal").classList.remove("open");
  assignSelectedTenantId = null;
}
function renderAssignList(q) {
  const list = document.getElementById("assignTenantList");
  let tenants = state.tenants || [];
  if (q)
    tenants = tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(q.toLowerCase()) ||
        t.property.toLowerCase().includes(q.toLowerCase()),
    );
  list.innerHTML =
    tenants
      .slice(0, 20)
      .map(
        (t) =>
          `<div class="result-item ${assignSelectedTenantId === t.id ? "active" : ""}" data-id="${t.id}"><div><strong>${t.name}</strong><div class="small muted">${t.property} • ${t.type} • ZMW ${Number(t.rent).toLocaleString()}</div></div><span class="pill ${t.risk === "High" ? "red" : t.risk === "Critical" ? "red" : t.risk === "Medium" ? "amber" : "green"}">${t.risk}</span></div>`,
      )
      .join("") ||
    `<div class="muted small" style="padding:12px">No tenants found</div>`;
  list.querySelectorAll(".result-item").forEach((el) => {
    el.addEventListener("click", () => {
      assignSelectedTenantId = el.dataset.id;
      renderAssignList(q);
    });
  });
}
function confirmAssign() {
  if (!assignSelectedTenantId) {
    toast("Select a tenant", "error");
    return;
  }
  const tenant = state.tenants.find((t) => t.id === assignSelectedTenantId);
  const unit = state.units.find((u) => u.id === selectedUnitId);
  if (!unit || !tenant) return;
  unit.tenant = tenant.name;
  unit.status = "Occupied";
  unit.rent = tenant.rent;
  unit.leaseId = `L-2026-${String(400 + Math.floor(Math.random() * 300)).padStart(5, "0")}`;
  unit.serviceCharge = Math.floor(unit.rent * 0.15);
  const prop = state.properties.find((p) => p.name === unit.property);
  if (prop) prop.occupied = (prop.occupied || 0) + 1;
  saveState();
  toast(`${tenant.name} assigned to ${unit.unit}`, "success");
  closeAssignModal();
  renderAll();
  if (selectedUnitId) openUnitDrawer(selectedUnitId);
}

/* Maintenance */
function createMaintenanceForCurrent() {
  if (!selectedUnitId) return;
  const unit = state.units.find((u) => u.id === selectedUnitId);
  if (!unit) return;
  const newId = `MNT-${String((state.maintenance?.length || 0) + 382).padStart(5, "0")}`;
  if (!state.maintenance) state.maintenance = [];
  state.maintenance.unshift({
    id: newId,
    property: unit.property,
    unit: unit.unit,
    cat: "General",
    priority: "Normal",
    status: "Reported",
    sla: "12h left",
    age: "now",
    contractor: "-",
  });
  unit.status = "Maintenance";
  saveState();
  toast(`Maintenance ${newId} created for ${unit.unit}`, "success");
  renderAll();
  renderDrawerTabs(unit);
}
window.createMaintenanceForCurrent = createMaintenanceForCurrent;

/* Export */
function exportUnits() {
  try {
    const data = filteredUnits.map((u) => ({
      ID: u.id,
      Unit: u.unit,
      Property: u.property,
      Block: u.block,
      Floor: u.floor,
      Type: u.type,
      Area: u.area,
      Tenant: u.tenant,
      Rent: u.rent,
      Status: u.status,
      Lease: u.leaseId,
      Meter: u.meterId,
    }));
    if (window.XLSX) {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Units");
      XLSX.writeFile(
        wb,
        `PropertyPro_Units_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast("Excel exported", "success");
    } else {
      let csv = Object.keys(data[0] || {}).join(",") + "\n";
      data.forEach((r) => {
        csv +=
          Object.values(r)
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",") + "\n";
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Units_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("CSV exported", "success");
    }
  } catch (e) {
    toast("Export failed: " + e.message, "error");
  }
}

/* Query params */
function handleQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const propId = params.get("property");
  const unitId = params.get("unit");
  if (propId) {
    const prop = state.properties.find((p) => p.id === propId);
    if (prop) {
      document.getElementById("filterProperty").value = prop.name;
      document.getElementById("fpProperty").value = prop.name;
      applyFilters();
      renderFloorPlan();
      toast(`Filtered to ${prop.name}`, "");
    }
  }
  if (unitId) {
    const u = state.units.find((x) => x.id === unitId || x.unit === unitId);
    if (u) {
      setTimeout(() => openUnitDrawer(u.id), 300);
    }
  }
}

/* Events */
function bindEvents() {
  document
    .getElementById("filterProperty")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("filterStatus")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("filterType")
    ?.addEventListener("change", applyFilters);
  document
    .getElementById("filterFloor")
    ?.addEventListener("change", applyFilters);
  document.getElementById("unitSearch")?.addEventListener("input", () => {
    applyFilters();
  });
  document.getElementById("clearSearch")?.addEventListener("click", () => {
    document.getElementById("unitSearch").value = "";
    applyFilters();
  });

  document
    .getElementById("fpProperty")
    ?.addEventListener("change", renderFloorPlan);
  document
    .getElementById("fpFloor")
    ?.addEventListener("change", renderFloorPlan);
  document
    .getElementById("fpBlock")
    ?.addEventListener("change", renderFloorPlan);

  document.getElementById("btnFpZoomIn")?.addEventListener("click", () => {
    fpZoom = Math.min(1.6, fpZoom + 0.1);
    renderFloorPlan();
  });
  document.getElementById("btnFpZoomOut")?.addEventListener("click", () => {
    fpZoom = Math.max(0.6, fpZoom - 0.1);
    renderFloorPlan();
  });
  document
    .getElementById("btnFpPrint")
    ?.addEventListener("click", () => window.print());

  document
    .getElementById("btnAddUnit")
    ?.addEventListener("click", () => openAddUnitModal());
  document
    .getElementById("btnCloseAddUnit")
    ?.addEventListener("click", closeAddUnitModal);
  document
    .getElementById("btnCancelAddUnit")
    ?.addEventListener("click", closeAddUnitModal);
  document.getElementById("addUnitModal")?.addEventListener("click", (e) => {
    if (e.target.id === "addUnitModal") closeAddUnitModal();
  });
  document
    .getElementById("addUnitForm")
    ?.addEventListener("submit", handleAddUnitSubmit);

  document.getElementById("btnExport")?.addEventListener("click", exportUnits);
  document
    .getElementById("btnExportTop")
    ?.addEventListener("click", exportUnits);

  document
    .getElementById("btnCloseDrawer")
    ?.addEventListener("click", closeUnitDrawer);
  document.getElementById("unitDrawer")?.addEventListener("click", (e) => {
    if (e.target.id === "unitDrawer") closeUnitDrawer();
  });

  document
    .getElementById("drawerTabs")
    ?.querySelectorAll(".tab")
    .forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll("#drawerTabs .tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document
          .querySelectorAll(".tab-pane")
          .forEach((p) => p.classList.remove("active"));
        document
          .getElementById(`tab-${tab.dataset.tab}`)
          ?.classList.add("active");
      });
    });

  document.getElementById("btnDrawerEdit")?.addEventListener("click", () => {
    if (selectedUnitId) openAddUnitModal(selectedUnitId);
  });
  document.getElementById("btnDrawerAssign")?.addEventListener("click", () => {
    if (selectedUnitId) openAssignModal(selectedUnitId);
  });
  document
    .getElementById("btnDrawerMaint")
    ?.addEventListener("click", () => createMaintenanceForCurrent());
  document.getElementById("btnDrawerLease")?.addEventListener("click", () => {
    const unit = state.units.find((u) => u.id === selectedUnitId);
    if (unit) goToPage("leases?lease=" + unit.leaseId);
  });
  document.getElementById("btnDrawerMeter")?.addEventListener("click", () => {
    const unit = state.units.find((u) => u.id === selectedUnitId);
    if (unit) goToPage("utilities?meter=" + unit.meterId);
  });

  // Assign modal
  document
    .getElementById("btnCloseAssign")
    ?.addEventListener("click", closeAssignModal);
  document
    .getElementById("btnCancelAssign")
    ?.addEventListener("click", closeAssignModal);
  document
    .getElementById("assignTenantModal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "assignTenantModal") closeAssignModal();
    });
  document
    .getElementById("assignSearch")
    ?.addEventListener("input", (e) => renderAssignList(e.target.value));
  document
    .getElementById("btnConfirmAssign")
    ?.addEventListener("click", confirmAssign);

  // Context menu actions
  document
    .getElementById("ctxMenu")
    ?.querySelectorAll(".ctx-item")
    .forEach((item) => {
      item.addEventListener("click", () => {
        const unitId = document.getElementById("ctxMenu").dataset.unit;
        const action = item.dataset.action;
        closeContextMenu();
        if (action === "view") openUnitDrawer(unitId);
        if (action === "edit") openAddUnitModal(unitId);
        if (action === "assign") openAssignModal(unitId);
        if (action === "maint") {
          selectedUnitId = unitId;
          createMaintenanceForCurrent();
        }
        if (action === "lease") {
          const u = state.units.find((x) => x.id === unitId);
          if (u) goToPage("leases?lease=" + u.leaseId);
        }
        if (action === "meter") {
          const u = state.units.find((x) => x.id === unitId);
          if (u) goToPage("utilities?meter=" + u.meterId);
        }
      });
    });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#ctxMenu") && !e.target.closest(".dots-btn"))
      closeContextMenu();
  });

  // Pagination
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  document.getElementById("nextPage")?.addEventListener("click", () => {
    const max = Math.ceil(filteredUnits.length / rowsPerPage);
    if (currentPage < max) {
      currentPage++;
      renderTable();
    }
  });
  document.getElementById("rowsPerPage")?.addEventListener("change", (e) => {
    rowsPerPage = parseInt(e.target.value);
    currentPage = 1;
    renderTable();
  });

  // Global search already bound in common.js

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeUnitDrawer();
      closeAddUnitModal();
      closeAssignModal();
      closeContextMenu();
    }
  });
}

/* Helpers for common.js goToPage wrapper */
function goToPage(page) {
  if (typeof window.goToPage === "function") {
    window.goToPage(page);
  } else {
    // fallback routing
    if (page.includes("leases"))
      location.href = "./leases.html?lease=" + (page.split("lease=")[1] || "");
    else if (page.includes("utilities"))
      location.href =
        "./utilities.html?meter=" + (page.split("meter=")[1] || "");
    else location.href = `./${page}.html`;
  }
}


// [Debug] Page loaded: js/pages/units.js
console.log('[Page:js/pages/units.js] Loaded with breadcrumb fix and search/notif support');

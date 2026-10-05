/**
 * PropertyPro Zambia Ltd - Common Core Logic - EXPANDED FOR INVESTMENT + LEASING MANAGEMENT
 * Version 3 - preserves property management + investment layer + leasing section (Applications, Tenants, Leases)
 * Storage: propertypro_v3 with migration from propertypro_v2
 */

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORAGE_KEY_V2 = "propertypro_v2";
const STORAGE_KEY = "propertypro_v3";
const STORAGE_VERSION = 3;

const mock = {
  properties: [
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
      lat: -15.4067,
      lng: 28.2871,
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
      lat: -15.417,
      lng: 28.305,
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
      lat: -13.6468,
      lng: 32.65,
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
      lat: -15.4,
      lng: 28.32,
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
      lat: -14.4389,
      lng: 28.444,
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
      lat: -12.9587,
      lng: 28.636,
    },
    {
      id: "P-007",
      name: "Levy Business Park",
      type: "Commercial",
      units: 88,
      occupied: 74,
      city: "Lusaka",
      value: 38.2,
      rent: 1.3,
      status: "Stabilized",
      yield: 7.8,
      lat: -15.392,
      lng: 28.32,
    },
    {
      id: "P-008",
      name: "East Park Mall",
      type: "Retail",
      units: 110,
      occupied: 98,
      city: "Lusaka",
      value: 42.5,
      rent: 1.5,
      status: "Stabilized",
      yield: 8.0,
      lat: -15.43,
      lng: 28.35,
    },
  ],
  tenants: [
    {
      id: "T-1042",
      name: "Kabwelwa Supermarket",
      property: "Zambezi Mall",
      unit: "12",
      rent: 85000,
      balance: 85000,
      risk: "High",
      status: "Active",
      type: "Anchor",
      tenure: "1.2y",
      city: "Lusaka",
      current: 20000,
      "31-60": 15000,
      "61-90": 25000,
      "90+": 25000,
      total: 85000,
    },
    {
      id: "T-1038",
      name: "Bata Zambia",
      property: "Arcades Office Tower",
      unit: "G-04",
      rent: 42000,
      balance: 0,
      risk: "Low",
      status: "Active",
      type: "Retail",
      tenure: "3.1y",
      city: "Lusaka",
      current: 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
      total: 0,
    },
    {
      id: "T-1031",
      name: "MTN Zambia",
      property: "Mukuba Business Park",
      unit: "2-12",
      rent: 120000,
      balance: 240000,
      risk: "Critical",
      status: "Active",
      type: "Corporate",
      tenure: "2.8y",
      city: "Ndola",
      current: 50000,
      "31-60": 40000,
      "61-90": 60000,
      "90+": 90000,
      total: 240000,
    },
    {
      id: "T-1029",
      name: "Shoprite",
      property: "Kabwe Retail Centre",
      unit: "A1",
      rent: 95000,
      balance: 15000,
      risk: "Medium",
      status: "Active",
      type: "Anchor",
      tenure: "4.2y",
      city: "Kabwe",
      current: 15000,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
      total: 15000,
    },
  ],
  leases: [
    {
      id: "L-2026-001",
      tenant: "Kabwelwa Supermarket",
      property: "Zambezi Mall",
      unit: "12",
      start: "2024-01-01",
      end: "2026-12-31",
      rent: 85000,
      status: "Active",
    },
    {
      id: "L-2026-002",
      tenant: "Bata Zambia",
      property: "Arcades Office Tower",
      unit: "G-04",
      start: "2023-06-01",
      end: "2026-05-31",
      rent: 42000,
      status: "Active",
    },
  ],
  invoices: [
    {
      id: "INV-001",
      tenant: "Kabwelwa Supermarket",
      property: "Zambezi Mall",
      amount: 85000,
      due: "2026-09-01",
      status: "Overdue",
    },
  ],
  maintenance: [
    {
      id: "MNT-001",
      property: "Zambezi Mall",
      unit: "12",
      issue: "AC not cooling",
      priority: "High",
      status: "Open",
      sla: "2 days",
    },
    {
      id: "MNT-002",
      property: "Riverside Apartments",
      unit: "203",
      issue: "Water leak",
      priority: "Medium",
      status: "In Progress",
      sla: "5 days",
    },
  ],
  units: [],
  vacancies: [],
  applications: [],
};

function generateInvestmentMockData(properties) {
  const funds = [
    {
      id: "FUND-PENSION",
      name: "Pension Fund",
      type: "Pension",
      aum: 486.4,
      currency: "ZMW",
      inception: "2018-01-01",
      manager: "PropertyPro Asset Mgmt",
      benchmark: "ZMW Composite",
      status: "Active",
      description:
        "Long-term pension fund focused on stable yield and capital preservation",
    },
    {
      id: "FUND-ACCIDENT",
      name: "Accident Fund",
      type: "Accident Compensation",
      aum: 320.2,
      currency: "ZMW",
      inception: "2019-06-01",
      manager: "PropertyPro Asset Mgmt",
      benchmark: "BOZ Policy + 2%",
      status: "Active",
      description: "Short-term liquidity focused accident compensation fund",
    },
  ];
  const portfolios = [
    {
      id: "PORT-001",
      fundId: "FUND-PENSION",
      name: "Pension Growth Portfolio",
      type: "Growth",
      aum: 320.5,
      benchmark: "Equity 60 / Bonds 40",
      status: "Active",
    },
    {
      id: "PORT-002",
      fundId: "FUND-PENSION",
      name: "Pension Income Portfolio",
      type: "Income",
      aum: 165.9,
      benchmark: "Fixed Income 70 / Property 30",
      status: "Active",
    },
    {
      id: "PORT-003",
      fundId: "FUND-ACCIDENT",
      name: "Accident Liquidity Portfolio",
      type: "Conservative",
      aum: 320.2,
      benchmark: "T-Bills 80 / Cash 20",
      status: "Active",
    },
  ];
  const subPortfolios = [
    {
      id: "SUB-001",
      portfolioId: "PORT-001",
      name: "Property Sub-Portfolio",
      assetClass: "Property",
    },
    {
      id: "SUB-002",
      portfolioId: "PORT-001",
      name: "Equity Sub-Portfolio",
      assetClass: "Listed Equity",
    },
    {
      id: "SUB-003",
      portfolioId: "PORT-002",
      name: "Fixed Income Sub",
      assetClass: "Fixed Income",
    },
  ];
  const assetAllocations = [
    {
      fundId: "FUND-PENSION",
      assetClass: "Property",
      target: 20,
      minimum: 15,
      maximum: 25,
    },
    {
      fundId: "FUND-PENSION",
      assetClass: "Fixed Income",
      target: 35,
      minimum: 30,
      maximum: 45,
    },
    {
      fundId: "FUND-PENSION",
      assetClass: "Listed Equity",
      target: 25,
      minimum: 15,
      maximum: 30,
    },
    {
      fundId: "FUND-PENSION",
      assetClass: "Unlisted Equity",
      target: 10,
      minimum: 5,
      maximum: 15,
    },
    {
      fundId: "FUND-PENSION",
      assetClass: "Collective Investments",
      target: 5,
      minimum: 0,
      maximum: 10,
    },
    {
      fundId: "FUND-PENSION",
      assetClass: "Cash",
      target: 5,
      minimum: 2,
      maximum: 10,
    },
    {
      fundId: "FUND-ACCIDENT",
      assetClass: "Fixed Income",
      target: 60,
      minimum: 50,
      maximum: 70,
    },
    {
      fundId: "FUND-ACCIDENT",
      assetClass: "Cash",
      target: 25,
      minimum: 15,
      maximum: 35,
    },
    {
      fundId: "FUND-ACCIDENT",
      assetClass: "Property",
      target: 10,
      minimum: 5,
      maximum: 15,
    },
    {
      fundId: "FUND-ACCIDENT",
      assetClass: "Listed Equity",
      target: 5,
      minimum: 0,
      maximum: 10,
    },
  ];

  const investmentAssets = [];
  properties.slice(0, 8).forEach((prop, idx) => {
    const currentValue = prop.value * 1_000_000 * (0.95 + Math.random() * 0.15);
    const acquisitionCost = currentValue * (0.85 + Math.random() * 0.1);
    const rentalIncome =
      (prop.rent || 1) * 12 * 1_000_000 * (0.9 + Math.random() * 0.2);
    const operatingCosts = rentalIncome * (0.28 + Math.random() * 0.07);
    const noi = rentalIncome - operatingCosts;
    investmentAssets.push({
      id: `INV-P-${String(idx + 1).padStart(3, "0")}`,
      propertyId: prop.id,
      name: `${prop.name} Investment`,
      assetClass: "Property",
      subClass: prop.type,
      fundId: idx % 2 === 0 ? "FUND-PENSION" : "FUND-ACCIDENT",
      portfolioId:
        idx % 3 === 0 ? "PORT-001" : idx % 3 === 1 ? "PORT-002" : "PORT-003",
      acquisitionCost: Math.round(acquisitionCost),
      currentValue: Math.round(currentValue),
      rentalIncome: Math.round(rentalIncome),
      operatingCosts: Math.round(operatingCosts),
      noi: Math.round(noi),
      yield: parseFloat(((noi / currentValue) * 100).toFixed(2)),
      occupancy: Math.round((prop.occupied / prop.units) * 100),
      capEx: Math.round(currentValue * 0.02),
      valuationDate: "2026-09-30",
      acquisitionDate: "2020-01-15",
      ownershipPct: 100,
      riskRating: ["Low", "Medium"][idx % 2],
      investmentStatus: "Active",
      currency: "ZMW",
      unrealizedGain: Math.round(currentValue - acquisitionCost),
      allocationPct: parseFloat((Math.random() * 5 + 2).toFixed(2)),
    });
  });

  const fixedIncomeMock = [
    {
      name: "GRZ 10Y Bond 15% 2034",
      issuer: "Government of Zambia",
      coupon: 15,
      maturity: "2034-06-15",
      face: 50000000,
      price: 98.5,
    },
    {
      name: "T-Bill 364D",
      issuer: "Government of Zambia",
      coupon: 0,
      maturity: "2027-02-15",
      face: 30000000,
      price: 92.3,
    },
    {
      name: "ZANACO Bond 12% 2028",
      issuer: "ZANACO PLC",
      coupon: 12,
      maturity: "2028-09-30",
      face: 20000000,
      price: 101.2,
    },
    {
      name: "CEC Bond 11% 2029",
      issuer: "Copperbelt Energy Corp",
      coupon: 11,
      maturity: "2029-03-31",
      face: 15000000,
      price: 99.8,
    },
  ];
  fixedIncomeMock.forEach((fi, i) => {
    const currentValue = (fi.face * fi.price) / 100;
    investmentAssets.push({
      id: `INV-FI-${String(i + 1).padStart(3, "0")}`,
      name: fi.name,
      assetClass: "Fixed Income",
      subClass: fi.coupon === 0 ? "Treasury Bill" : "Corporate Bond",
      fundId: i % 2 === 0 ? "FUND-PENSION" : "FUND-ACCIDENT",
      portfolioId: "PORT-002",
      issuer: fi.issuer,
      coupon: fi.coupon,
      maturity: fi.maturity,
      faceValue: fi.face,
      price: fi.price,
      acquisitionCost: Math.round(fi.face * 0.98),
      currentValue: Math.round(currentValue),
      currency: "ZMW",
      riskRating: "Low",
      investmentStatus: "Active",
      yield: fi.coupon || 11,
    });
  });

  const equities = [
    {
      ticker: "ZANACO",
      name: "ZANACO PLC",
      price: 4.2,
      qty: 500000,
      avgCost: 3.8,
    },
    {
      ticker: "CEC",
      name: "Copperbelt Energy Corp",
      price: 2.8,
      qty: 800000,
      avgCost: 2.5,
    },
    {
      ticker: "ZAMBREW",
      name: "Zambian Breweries",
      price: 12.5,
      qty: 100000,
      avgCost: 11.2,
    },
    {
      ticker: "BATZ",
      name: "British American Tobacco Zambia",
      price: 25.0,
      qty: 50000,
      avgCost: 22.0,
    },
  ];
  equities.forEach((eq, i) => {
    investmentAssets.push({
      id: `INV-EQ-${String(i + 1).padStart(3, "0")}`,
      name: eq.name,
      ticker: eq.ticker,
      assetClass: "Listed Equity",
      fundId: "FUND-PENSION",
      portfolioId: "PORT-001",
      qty: eq.qty,
      avgCost: eq.avgCost,
      currentPrice: eq.price,
      marketValue: eq.qty * eq.price,
      acquisitionCost: Math.round(eq.qty * eq.avgCost),
      currentValue: Math.round(eq.qty * eq.price),
      currency: "ZMW",
      riskRating: "Medium",
      investmentStatus: "Active",
      yield: parseFloat((Math.random() * 5 + 2).toFixed(2)),
    });
  });

  const unlisted = [
    {
      name: "Lusaka Logistics SPV",
      project: "Logistics hub",
      valuation: 45000000,
      ownership: 60,
      status: "Operational",
    },
    {
      name: "Ndola Industrial SPV",
      project: "Industrial warehousing",
      valuation: 30000000,
      ownership: 75,
      status: "Development",
    },
    {
      name: "Kabwe Retail PPP",
      project: "Public-private retail",
      valuation: 20000000,
      ownership: 40,
      status: "Planning",
    },
  ];
  unlisted.forEach((ul, i) => {
    investmentAssets.push({
      id: `INV-UN-${String(i + 1).padStart(3, "0")}`,
      name: ul.name,
      assetClass: "Unlisted Equity",
      subClass: "SPV",
      fundId: "FUND-PENSION",
      portfolioId: "PORT-001",
      issuer: ul.name,
      ownershipPct: ul.ownership,
      acquisitionCost: Math.round(ul.valuation * 0.8),
      currentValue: ul.valuation,
      valuation: ul.valuation,
      valuationDate: "2026-09-30",
      currency: "ZMW",
      projectStatus: ul.status,
      investmentThesis: ul.project,
      riskRating: "High",
      investmentStatus: "Active",
    });
  });

  const collectives = [
    {
      name: "African Real Estate Fund",
      manager: "Sanlam",
      nav: 12000000,
      units: 100000,
      unitPrice: 120,
    },
    {
      name: "Zambia Balanced Fund",
      manager: "Aflife",
      nav: 8000000,
      units: 80000,
      unitPrice: 100,
    },
  ];
  collectives.forEach((col, i) => {
    investmentAssets.push({
      id: `INV-CI-${String(i + 1).padStart(3, "0")}`,
      name: col.name,
      assetClass: "Collective Investments",
      fundId: "FUND-PENSION",
      portfolioId: "PORT-001",
      issuer: col.manager,
      fundManager: col.manager,
      nav: col.nav,
      units: col.units,
      unitPrice: col.unitPrice,
      acquisitionCost: Math.round(col.nav * 0.95),
      currentValue: col.nav,
      currency: "ZMW",
      fees: 1.5,
      riskRating: "Medium",
      investmentStatus: "Active",
    });
  });

  const cashAccounts = [
    {
      id: "CASH-001",
      fundId: "FUND-PENSION",
      name: "Pension ZMW Operating",
      bank: "Stanbic Bank",
      currency: "ZMW",
      openingBalance: 15000000,
      currentBalance: 18500000,
    },
    {
      id: "CASH-002",
      fundId: "FUND-PENSION",
      name: "Pension USD Account",
      bank: "Stanbic Bank",
      currency: "USD",
      openingBalance: 500000,
      currentBalance: 420000,
    },
    {
      id: "CASH-003",
      fundId: "FUND-ACCIDENT",
      name: "Accident Fund ZMW",
      bank: "ZANACO",
      currency: "ZMW",
      openingBalance: 25000000,
      currentBalance: 28500000,
    },
    {
      id: "CASH-004",
      fundId: "FUND-ACCIDENT",
      name: "Accident Liquidity Buffer",
      bank: "BOZ",
      currency: "ZMW",
      openingBalance: 10000000,
      currentBalance: 12000000,
    },
  ];
  cashAccounts.forEach((c) => {
    investmentAssets.push({
      id: c.id,
      name: c.name,
      assetClass: "Cash",
      fundId: c.fundId,
      portfolioId: c.fundId === "FUND-PENSION" ? "PORT-002" : "PORT-003",
      issuer: c.bank,
      bank: c.bank,
      currency: c.currency,
      acquisitionCost: c.currentBalance,
      currentValue: c.currentBalance,
      currentBalance: c.currentBalance,
      riskRating: "Low",
      investmentStatus: "Active",
    });
  });

  const investmentDeals = [
    {
      id: "DEAL-001",
      name: "Lusaka Mall Extension",
      assetClass: "Property",
      amount: 45000000,
      expectedReturn: 11.5,
      riskRating: "Medium",
      stage: "Origination",
      owner: "Chanda Mwanza",
      daysInStage: 5,
      nextAction: "Site visit",
      approvalStatus: "Pending",
      fundId: "FUND-PENSION",
    },
    {
      id: "DEAL-002",
      name: "GRZ 5Y Bond",
      assetClass: "Fixed Income",
      amount: 20000000,
      expectedReturn: 13.0,
      riskRating: "Low",
      stage: "Screening",
      owner: "Mutale Phiri",
      daysInStage: 12,
      nextAction: "Credit review",
      approvalStatus: "Pending",
      fundId: "FUND-ACCIDENT",
    },
    {
      id: "DEAL-003",
      name: "ZANACO Equity Increase",
      assetClass: "Listed Equity",
      amount: 5000000,
      expectedReturn: 14.2,
      riskRating: "Medium",
      stage: "Appraisal",
      owner: "Grace Banda",
      daysInStage: 8,
      nextAction: "Valuation model",
      approvalStatus: "Under Review",
      fundId: "FUND-PENSION",
    },
    {
      id: "DEAL-004",
      name: "Ndola Warehousing SPV",
      assetClass: "Unlisted Equity",
      amount: 30000000,
      expectedReturn: 16.0,
      riskRating: "High",
      stage: "MIC",
      owner: "John Mwila",
      daysInStage: 22,
      nextAction: "MIC presentation",
      approvalStatus: "MIC Review",
      fundId: "FUND-PENSION",
    },
    {
      id: "DEAL-005",
      name: "CEC Bond Placement",
      assetClass: "Fixed Income",
      amount: 15000000,
      expectedReturn: 11.8,
      riskRating: "Low",
      stage: "FIC",
      owner: "Chanda Mwanza",
      daysInStage: 3,
      nextAction: "FIC memo",
      approvalStatus: "FIC Review",
      fundId: "FUND-ACCIDENT",
    },
    {
      id: "DEAL-006",
      name: "Affordable Housing PPP",
      assetClass: "Property",
      amount: 80000000,
      expectedReturn: 12.0,
      riskRating: "High",
      stage: "Conditions Precedent",
      owner: "Peter Zulu",
      daysInStage: 45,
      nextAction: "Verify land title",
      approvalStatus: "Approved",
      fundId: "FUND-PENSION",
    },
    {
      id: "DEAL-007",
      name: "T-Bill Rollover Q4",
      assetClass: "Fixed Income",
      amount: 30000000,
      expectedReturn: 11.0,
      riskRating: "Low",
      stage: "Closing",
      owner: "Mary Lungu",
      daysInStage: 2,
      nextAction: "Settlement",
      approvalStatus: "Approved",
      fundId: "FUND-ACCIDENT",
    },
    {
      id: "DEAL-008",
      name: "Lusaka Logistics SPV",
      assetClass: "Unlisted Equity",
      amount: 25000000,
      expectedReturn: 18.5,
      riskRating: "High",
      stage: "Monitoring",
      owner: "Chanda Mwanza",
      daysInStage: 120,
      nextAction: "Quarterly review",
      approvalStatus: "Closed",
      fundId: "FUND-PENSION",
    },
  ];

  const appraisals = [
    {
      id: "APP-001",
      dealId: "DEAL-001",
      company: "Lusaka Mall Extension Ltd",
      revenue: 45000000,
      ebitda: 12000000,
      ebit: 9000000,
      netIncome: 6000000,
      assets: 120000000,
      liabilities: 70000000,
      equity: 50000000,
      status: "Draft",
      analyst: "Grace Banda",
    },
    {
      id: "APP-002",
      dealId: "DEAL-003",
      company: "ZANACO PLC",
      revenue: 280000000,
      ebitda: 95000000,
      ebit: 75000000,
      netIncome: 45000000,
      assets: 800000000,
      liabilities: 500000000,
      equity: 300000000,
      status: "Under Review",
      analyst: "Mutale Phiri",
    },
    {
      id: "APP-003",
      dealId: "DEAL-004",
      company: "Ndola Warehousing SPV",
      revenue: 15000000,
      ebitda: 5000000,
      ebit: 3000000,
      netIncome: 1800000,
      assets: 60000000,
      liabilities: 35000000,
      equity: 25000000,
      status: "Approved",
      analyst: "John Mwila",
    },
  ];

  const approvals = [
    {
      id: "APR-001",
      entityType: "investment",
      entityId: "DEAL-004",
      stage: "MIC",
      status: "pending",
      maker: "John Mwila",
      checker: "Grace Banda",
      submittedAt: "2026-09-28",
      decisions: [
        {
          stage: "Maker",
          user: "John Mwila",
          decision: "Submitted",
          date: "2026-09-28",
        },
      ],
    },
    {
      id: "APR-002",
      entityType: "investment",
      entityId: "DEAL-005",
      stage: "FIC",
      status: "pending",
      maker: "Chanda Mwanza",
      checker: "Mutale Phiri",
      submittedAt: "2026-09-29",
      decisions: [
        {
          stage: "Maker",
          user: "Chanda Mwanza",
          decision: "Submitted",
          date: "2026-09-29",
        },
        {
          stage: "Checker",
          user: "Mutale Phiri",
          decision: "Approved",
          date: "2026-09-30",
        },
      ],
    },
    {
      id: "APR-003",
      entityType: "property",
      entityId: "P-001",
      stage: "Checker",
      status: "approved",
      maker: "Chanda Mwanza",
      checker: "Mutale Phiri",
      submittedAt: "2026-09-15",
      decisions: [],
    },
    {
      id: "APR-004",
      entityType: "investment",
      entityId: "DEAL-006",
      stage: "Board",
      status: "approved",
      maker: "Peter Zulu",
      checker: "Chanda Mwanza",
      submittedAt: "2026-08-20",
      decisions: [],
    },
  ];

  const conditionsPrecedent = [
    {
      id: "CP-001",
      dealId: "DEAL-006",
      requirement: "Land title verification",
      responsible: "Legal Team",
      dueDate: "2026-10-15",
      status: "Pending",
      document: null,
      verification: "Title deed",
      completedDate: null,
      mandatory: true,
    },
    {
      id: "CP-002",
      dealId: "DEAL-006",
      requirement: "Environmental Impact Assessment",
      responsible: "Peter Zulu",
      dueDate: "2026-10-20",
      status: "Submitted",
      document: "EIA Report v1",
      verification: "ZEMA Approval",
      completedDate: null,
      mandatory: true,
    },
    {
      id: "CP-003",
      dealId: "DEAL-006",
      requirement: "Council approval",
      responsible: "Planning",
      dueDate: "2026-10-25",
      status: "Under Review",
      document: "Council Letter",
      verification: "Council Stamp",
      completedDate: null,
      mandatory: true,
    },
    {
      id: "CP-004",
      dealId: "DEAL-004",
      requirement: "Shareholder agreement",
      responsible: "Legal",
      dueDate: "2026-09-30",
      status: "Verified",
      document: "SHA signed",
      verification: "Board resolution",
      completedDate: "2026-09-28",
      mandatory: true,
    },
  ];

  const riskRecords = [
    {
      id: "RISK-001",
      type: "Concentration",
      description: "Property allocation 27% exceeds max 25% in Pension Fund",
      severity: "High",
      status: "Open",
      owner: "Risk Officer",
      date: "2026-09-30",
    },
    {
      id: "RISK-002",
      type: "Liquidity",
      description: "Cash below 2% minimum in Accident Fund",
      severity: "Medium",
      status: "Monitoring",
      owner: "Treasury",
      date: "2026-09-29",
    },
    {
      id: "RISK-003",
      type: "Credit",
      description: "ZAMBREW downgrade to BB+",
      severity: "Medium",
      status: "Open",
      owner: "Credit Analyst",
      date: "2026-09-28",
    },
  ];
  const complianceBreaches = [
    {
      id: "COMP-001",
      rule: "Asset Allocation",
      threshold: "Property max 25%",
      currentValue: "27%",
      status: "BREACH",
      breachDate: "2026-09-30",
      severity: "High",
      responsible: "CIO",
      resolution: "Rebalance within 30 days",
      auditHistory: [],
    },
    {
      id: "COMP-002",
      rule: "Single Issuer Limit",
      threshold: "10% max",
      currentValue: "12% ZANACO",
      status: "BREACH",
      breachDate: "2026-09-28",
      severity: "Medium",
      responsible: "Portfolio Manager",
      resolution: "Reduce exposure",
      auditHistory: [],
    },
  ];

  const performanceRecords = [];
  const months = [
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
  ];
  months.forEach((m, i) => {
    performanceRecords.push({
      id: `PERF-${m}-PENSION`,
      fundId: "FUND-PENSION",
      portfolioId: "PORT-001",
      period: m,
      portfolioValue: 300000000 + i * 5000000,
      income: 2000000 + i * 100000,
      capitalGain: 3000000 + i * 200000,
      totalReturn: 1.2 + i * 0.1,
      twrr: 1.1 + i * 0.1,
      mwrr: 1.0 + i * 0.1,
      benchmark: 0.9 + i * 0.08,
    });
  });

  const transactions = [
    {
      id: "TXN-001",
      accountId: "CASH-001",
      type: "Inflow",
      amount: 2500000,
      date: "2026-09-30",
      description: "Rental collection Zambezi Mall",
      fundId: "FUND-PENSION",
    },
    {
      id: "TXN-002",
      accountId: "CASH-001",
      type: "Outflow",
      amount: 800000,
      date: "2026-09-29",
      description: "Maintenance opex",
      fundId: "FUND-PENSION",
    },
  ];
  const valuations = investmentAssets
    .filter((a) => a.assetClass === "Property")
    .map((a) => ({
      id: `VAL-${a.id}`,
      assetId: a.id,
      date: "2026-09-30",
      value: a.currentValue,
      valuer: "Knight Frank Zambia",
      method: "Income Approach",
      status: "Final",
    }));
  const documents = [
    {
      id: "DOC-001",
      title: "Zambezi Mall Title Deed",
      type: "Title",
      entityType: "property",
      entityId: "P-001",
      version: 1,
      uploadedDate: "2020-03-15",
      uploadedBy: "Chanda Mwanza",
      status: "Verified",
    },
    {
      id: "DOC-002",
      title: "GRZ Bond Prospectus",
      type: "Prospectus",
      entityType: "investment",
      entityId: "INV-FI-001",
      version: 1,
      uploadedDate: "2025-01-10",
      uploadedBy: "Treasury",
      status: "Final",
    },
    {
      id: "DOC-003",
      title: "ZANACO Annual Report 2025",
      type: "Financial",
      entityType: "issuer",
      entityId: "ZANACO",
      version: 1,
      uploadedDate: "2026-03-20",
      uploadedBy: "Research",
      status: "Final",
    },
  ];
  const auditTrail = [
    {
      id: "AUD-000001",
      timestamp: "2026-09-30T10:30:00Z",
      user: "Chanda Mwanza",
      action: "UPDATE",
      entityType: "investment",
      entityId: "INV-P-001",
      description: "Valuation updated to ZMW 92.5M",
      before: { value: 86400000 },
      after: { value: 92500000 },
    },
    {
      id: "AUD-000002",
      timestamp: "2026-09-29T14:15:00Z",
      user: "Mutale Phiri",
      action: "CREATE",
      entityType: "investment",
      entityId: "DEAL-004",
      description: "Deal created: Ndola Warehousing SPV",
      before: null,
      after: { stage: "Origination" },
    },
  ];
  const issuers = [
    {
      id: "ISS-001",
      name: "Government of Zambia",
      type: "Sovereign",
      rating: "B",
      sector: "Government",
      country: "Zambia",
    },
    {
      id: "ISS-002",
      name: "ZANACO PLC",
      type: "Corporate",
      rating: "A-",
      sector: "Banking",
      country: "Zambia",
    },
    {
      id: "ISS-003",
      name: "Copperbelt Energy Corp",
      type: "Corporate",
      rating: "A",
      sector: "Energy",
      country: "Zambia",
    },
  ];
  const counterparties = [
    { id: "CP-01", name: "Stanbic Bank Zambia", type: "Bank", rating: "AA" },
    { id: "CP-02", name: "ZANACO", type: "Bank", rating: "A" },
  ];

  return {
    funds,
    portfolios,
    subPortfolios,
    assetAllocations,
    investmentAssets,
    investmentDeals,
    appraisals,
    approvals,
    conditionsPrecedent,
    riskRecords,
    complianceBreaches,
    performanceRecords,
    transactions,
    valuations,
    documents,
    auditTrail,
    issuers,
    counterparties,
    cashAccounts,
    instruments: [],
    orders: [],
    fixedIncome: [],
    listedEquities: [],
    unlistedInvestments: [],
    collectiveInvestments: [],
  };
}

function generateLeasingMockData(
  properties,
  units,
  existingTenants,
  existingLeases,
) {
  // Expanded realistic Zambian tenants
  const tenantPool = [
    {
      name: "Shoprite Zambia Ltd",
      type: "Company",
      city: "Lusaka",
      risk: "Low",
    },
    { name: "MTN Zambia", type: "Company", city: "Lusaka", risk: "Low" },
    { name: "Zanaco Bank", type: "Company", city: "Lusaka", risk: "Low" },
    { name: "Bata Zambia", type: "Company", city: "Lusaka", risk: "Low" },
    { name: "Hungry Lion", type: "Company", city: "Ndola", risk: "Medium" },
    {
      name: "PEP Stores Zambia",
      type: "Company",
      city: "Kabwe",
      risk: "Medium",
    },
    {
      name: "Choppies Supermarket",
      type: "Company",
      city: "Lusaka",
      risk: "Medium",
    },
    { name: "Airtel Zambia", type: "Company", city: "Lusaka", risk: "Low" },
    { name: "Liquid Telecom", type: "Company", city: "Ndola", risk: "Medium" },
    {
      name: "Stanbic Bank Zambia",
      type: "Company",
      city: "Lusaka",
      risk: "Low",
    },
    {
      name: "Mutale Trading Ltd",
      type: "Company",
      city: "Ndola",
      risk: "Medium",
    },
    {
      name: "Mwansa Properties Ltd",
      type: "Company",
      city: "Lusaka",
      risk: "High",
    },
    {
      name: "Kabwelwa Supermarket",
      type: "Company",
      city: "Lusaka",
      risk: "High",
    },
    {
      name: "Chanda Phiri",
      type: "Individual",
      city: "Lusaka",
      risk: "Medium",
    },
    { name: "Grace Banda", type: "Individual", city: "Chipata", risk: "Low" },
    { name: "John Mwila", type: "Individual", city: "Ndola", risk: "Medium" },
    { name: "Peter Zulu", type: "Individual", city: "Kabwe", risk: "High" },
    { name: "Mary Lungu", type: "Individual", city: "Lusaka", risk: "Low" },
  ];

  const officers = [
    "Mutale Phiri",
    "Grace Banda",
    "John Mwila",
    "Chanda Mwanza",
    "Peter Zulu",
    "Mary Lungu",
  ];
  const applicantTypes = ["Individual", "Company", "NGO", "Government"];
  const riskRatings = ["Low", "Medium", "High", "Critical"];
  const appStatuses = [
    "Draft",
    "Submitted",
    "Under Review",
    "KYC Pending",
    "KYC Passed",
    "KYC Failed",
    "Committee Review",
    "Approved",
    "Rejected",
    "Withdrawn",
  ];
  const kycStatuses = ["Not Started", "Pending", "Passed", "Failed"];

  const applications = [];
  const now = new Date();
  let appIdCounter = 1001;

  // Generate 22 realistic applications
  for (let i = 0; i < 22; i++) {
    const prop = properties[Math.floor(Math.random() * properties.length)];
    const propUnits = units.filter((u) => u.propertyId === prop.id);
    const vacantUnits = propUnits.filter((u) => u.status === "Vacant");
    const selectedUnits =
      vacantUnits.length > 0
        ? [vacantUnits[Math.floor(Math.random() * vacantUnits.length)]]
        : propUnits.slice(0, 1);
    const unitIds = selectedUnits.map((u) => u.id);
    const unitCodes = selectedUnits.map((u) => u.code);
    const tenantInfo =
      tenantPool[Math.floor(Math.random() * tenantPool.length)];
    const status = appStatuses[Math.floor(Math.random() * appStatuses.length)];
    const kycStatus =
      status === "KYC Pending"
        ? "Pending"
        : status === "KYC Passed"
          ? "Passed"
          : status === "KYC Failed"
            ? "Failed"
            : status === "Committee Review" || status === "Approved"
              ? "Passed"
              : kycStatuses[Math.floor(Math.random() * kycStatuses.length)];
    const risk = riskRatings[Math.floor(Math.random() * riskRatings.length)];
    const submittedAt = new Date(
      now - Math.floor(Math.random() * 60) * 24 * 3600 * 1000,
    )
      .toISOString()
      .slice(0, 10);
    const proposedRent = 15000 + Math.floor(Math.random() * 120000);
    const deposit = proposedRent * 2;
    const serviceCharge = Math.floor(proposedRent * 0.15);

    const app = {
      id: `APP-${appIdCounter++}`,
      applicantName: tenantInfo.name,
      applicantType:
        Math.random() > 0.3
          ? tenantInfo.type
          : applicantTypes[Math.floor(Math.random() * applicantTypes.length)],
      phone: `+2609${Math.floor(70000000 + Math.random() * 29999999)}`,
      email: `${tenantInfo.name.toLowerCase().replace(/\s+/g, ".")}${Math.floor(Math.random() * 100)}@example.com`,
      address: `${Math.floor(Math.random() * 1000)} Cairo Road, ${prop.city}`,
      idType: Math.random() > 0.5 ? "NRC" : "TPIN",
      idNumber: `${Math.floor(100000 + Math.random() * 900000)}/12/1`,
      companyName: tenantInfo.type === "Company" ? tenantInfo.name : "",
      companyRegistration:
        tenantInfo.type === "Company"
          ? `REG-${Math.floor(10000 + Math.random() * 90000)}`
          : "",
      propertyId: prop.id,
      propertyName: prop.name,
      unitIds: unitIds,
      unitCodes: unitCodes,
      proposedRent: proposedRent,
      deposit: deposit,
      serviceCharge: serviceCharge,
      leaseType: [
        "Retail",
        "Commercial",
        "Residential",
        "Industrial",
        "Mixed-Use",
      ][Math.floor(Math.random() * 5)],
      proposedStartDate: new Date(
        now.getTime() + Math.floor(Math.random() * 90) * 24 * 3600 * 1000,
      )
        .toISOString()
        .slice(0, 10),
      proposedTermMonths: [12, 24, 36, 60][Math.floor(Math.random() * 4)],
      submittedAt: submittedAt,
      applicationDate: submittedAt,
      assignedOfficer: officers[Math.floor(Math.random() * officers.length)],
      status: status,
      kycStatus: kycStatus,
      kycChecks: {
        identity: {
          status:
            kycStatus === "Passed"
              ? "Verified"
              : kycStatus === "Failed"
                ? "Failed"
                : Math.random() > 0.5
                  ? "Verified"
                  : "Pending",
          verifiedBy: officers[Math.floor(Math.random() * officers.length)],
          date: submittedAt,
        },
        income: {
          status: Math.random() > 0.4 ? "Verified" : "Pending",
          verifiedBy: officers[Math.floor(Math.random() * officers.length)],
          date: submittedAt,
        },
        employment: {
          status: Math.random() > 0.4 ? "Verified" : "Pending",
          verifiedBy: officers[Math.floor(Math.random() * officers.length)],
          date: submittedAt,
        },
        reference: {
          status: Math.random() > 0.5 ? "Verified" : "Pending",
          verifiedBy: officers[Math.floor(Math.random() * officers.length)],
          date: submittedAt,
        },
        document: {
          status: Math.random() > 0.3 ? "Verified" : "Pending",
          verifiedBy: officers[Math.floor(Math.random() * officers.length)],
          date: submittedAt,
        },
      },
      riskRating: risk,
      committeeStatus:
        status === "Committee Review"
          ? "Pending"
          : status === "Approved"
            ? "Approved"
            : status === "Rejected"
              ? "Rejected"
              : "Not Started",
      committeeDecision:
        status === "Approved"
          ? "Approved"
          : status === "Rejected"
            ? "Rejected"
            : "",
      decisionDate:
        status === "Approved" || status === "Rejected"
          ? new Date(now - Math.floor(Math.random() * 10) * 24 * 3600 * 1000)
              .toISOString()
              .slice(0, 10)
          : "",
      decisionMaker:
        status === "Approved" || status === "Rejected"
          ? officers[Math.floor(Math.random() * officers.length)]
          : "",
      comments:
        status === "Rejected"
          ? "Failed to meet minimum income requirement"
          : status === "Approved"
            ? "Meets all criteria, approved for tenancy"
            : "Under review",
      tenantId: null,
      vacancyId: `V-${String(Math.floor(Math.random() * 50) + 1).padStart(3, "0")}`,
      documents: [
        {
          id: `DOC-APP-${appIdCounter}-1`,
          name: "NRC Copy",
          type: "ID",
          url: "#",
        },
        {
          id: `DOC-APP-${appIdCounter}-2`,
          name: "Proof of Income",
          type: "KYC",
          url: "#",
        },
      ],
    };
    applications.push(app);
  }

  // Ensure some approved without tenantId for workflow testing
  applications.slice(0, 3).forEach((a) => {
    if (a.status === "Approved") {
      a.tenantId = null;
    }
  });

  return { applications };
}


function generateFinanceMockData(properties, tenants, units, existingInvoices) {
  const invoiceTypes = ["Rent", "Service Charge", "Utilities", "Penalties", "VAT", "Deposit"];
  const invoiceStatuses = ["Paid", "Unpaid", "Partial", "Overdue", "Draft"];
  const zraStatuses = ["Validated", "Pending", "Failed", "Synced", "Queued"];
  const propertiesList = properties || [];
  const tenantsList = tenants || [];
  const unitsList = units || [];
  const now = new Date();

  // --- Invoices: min 36 records ---
  const invoices = [];
  const baseDate = new Date("2026-01-01");
  let invCounter = 1;

  // If existingInvoices has rich data, migrate, else generate fresh 36
  const needsFresh = !existingInvoices || existingInvoices.length < 20 || !existingInvoices[0].zraSmartInvoiceNo;

  if (needsFresh) {
    for (let i = 0; i < 36; i++) {
      const prop = propertiesList[Math.floor(Math.random() * propertiesList.length)] || { id: "P-001", name: "Zambezi Mall" };
      const tenant = tenantsList[Math.floor(Math.random() * tenantsList.length)] || { id: "T-1042", name: "Kabwelwa Supermarket" };
      const propUnits = unitsList.filter(u => u.propertyId === prop.id);
      const unit = propUnits[Math.floor(Math.random() * propUnits.length)] || { id: prop.id+"-U-001", code: prop.id+"-1" };
      const type = invoiceTypes[Math.floor(Math.random() * invoiceTypes.length)];
      let status = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
      // Make distribution realistic
      const rand = Math.random();
      if (rand < 0.45) status = "Paid";
      else if (rand < 0.65) status = "Unpaid";
      else if (rand < 0.8) status = "Partial";
      else if (rand < 0.95) status = "Overdue";
      else status = "Draft";

      const issueOffset = Math.floor(Math.random() * 270); // last 9 months
      const issueDate = new Date(baseDate.getTime() + issueOffset * 24*3600*1000);
      const dueDate = new Date(issueDate.getTime() + (7 + Math.floor(Math.random()*23)) * 24*3600*1000);
      const baseRent = 15000 + Math.floor(Math.random()*135000);
      const proRata = Math.random() > 0.7 ? Math.floor(baseRent * (0.2 + Math.random()*0.8)) : 0;
      const serviceChargeAmount = Math.floor(baseRent * 0.15);
      const utilitiesAmount = type === "Utilities" ? Math.floor(500 + Math.random()*8000) : Math.floor(Math.random()*2000);
      const penaltyAmount = type === "Penalties" ? Math.floor(baseRent * 0.05) : (status === "Overdue" ? Math.floor(baseRent * 0.02) : 0);
      const totalBeforeTax = baseRent + proRata + serviceChargeAmount + utilitiesAmount + penaltyAmount;
      const vat = Math.round(totalBeforeTax * 0.16);
      const withholdingTax = Math.round(baseRent * 0.10);
      const amount = totalBeforeTax + vat;

      const paidRatio = status === "Paid" ? 1 : status === "Partial" ? 0.4 + Math.random()*0.5 : status === "Unpaid" || status === "Overdue" ? 0 : Math.random()*0.3;
      const paidAmount = Math.round(amount * paidRatio);
      const outstandingAmount = amount - paidAmount;

      const zraNo = `ZRA-SI-${issueDate.getFullYear()}${String(issueDate.getMonth()+1).padStart(2,'0')}-${String(invCounter).padStart(6,'0')}-${Math.floor(1000+Math.random()*9000)}`;
      let zraStatus = zraStatuses[Math.floor(Math.random()*zraStatuses.length)];
      if (Math.random() < 0.6) zraStatus = "Validated";
      else if (Math.random() < 0.8) zraStatus = "Synced";
      const zraSyncDate = zraStatus === "Validated" || zraStatus === "Synced" ? new Date(issueDate.getTime()+ 1*24*3600*1000).toISOString().slice(0,10) : null;

      const id = `INV-${issueDate.getFullYear()}-${String(invCounter).padStart(4,'0')}`;
      invCounter++;

      const lineItems = [
        { id: `${id}-LI-1`, description: "Base Rent", qty: 1, unitPrice: baseRent, amount: baseRent, taxCode: "STD" },
        ...(proRata ? [{ id: `${id}-LI-2`, description: "Pro-rata Adjustment", qty: 1, unitPrice: proRata, amount: proRata, taxCode: "STD" }] : []),
        { id: `${id}-LI-3`, description: "Service Charge (15%)", qty: 1, unitPrice: serviceChargeAmount, amount: serviceChargeAmount, taxCode: "STD" },
        ...(utilitiesAmount ? [{ id: `${id}-LI-4`, description: type === "Utilities" ? "Electricity & Water" : "Utilities", qty: 1, unitPrice: utilitiesAmount, amount: utilitiesAmount, taxCode: "STD" }] : []),
        ...(penaltyAmount ? [{ id: `${id}-LI-5`, description: "Late Payment Penalty", qty: 1, unitPrice: penaltyAmount, amount: penaltyAmount, taxCode: "EXM" }] : []),
        { id: `${id}-LI-VAT`, description: "VAT 16%", qty: 1, unitPrice: vat, amount: vat, taxCode: "VAT" },
        { id: `${id}-LI-WHT`, description: "Withholding Tax 10% (Deductible)", qty: 1, unitPrice: -withholdingTax, amount: -withholdingTax, taxCode: "WHT" },
      ];

      const ledgerHistory = [
        { id: `${id}-LH-1`, date: issueDate.toISOString().slice(0,10), type: "Invoice Created", amount: amount, reference: id, user: "System", balance: amount },
        ...(paidAmount ? [{ id: `${id}-LH-2`, date: new Date(issueDate.getTime()+3*24*3600*1000).toISOString().slice(0,10), type: "Payment Received", amount: -paidAmount, reference: `PAY-${String(invCounter).padStart(4,'0')}`, user: "Finance", balance: outstandingAmount }] : []),
      ];

      invoices.push({
        id,
        tenantId: tenant.id,
        tenant: tenant.name,
        tenantName: tenant.name,
        propertyId: prop.id,
        property: prop.name,
        propertyName: prop.name,
        unitId: unit.id,
        unitCode: unit.code,
        type,
        invoiceType: type,
        status,
        paymentStatus: status,
        issueDate: issueDate.toISOString().slice(0,10),
        dueDate: dueDate.toISOString().slice(0,10),
        due: dueDate.toISOString().slice(0,10),
        amount,
        baseRent,
        proRata,
        serviceChargeAmount,
        utilitiesAmount,
        penaltyAmount,
        totalBeforeTax,
        vat,
        withholdingTax,
        totalTax: vat,
        paidAmount,
        outstandingAmount,
        currency: "ZMW",
        zraSmartInvoiceNo: zraNo,
        zraSmartInvoice: zraNo,
        zraStatus,
        zraSyncDate,
        zraValidationMessage: zraStatus === "Failed" ? "TPIN mismatch - retry" : zraStatus === "Validated" ? "Validated by ZRA Smart Invoice - Hash: "+Math.random().toString(36).slice(2,10).toUpperCase() : "Pending ZRA queue",
        ledgerHistory,
        lineItems,
        paymentTerms: ["Net 7","Net 15","Net 30"][Math.floor(Math.random()*3)],
        createdBy: ["Chanda Mwanza","Mutale Phiri","Mary Lungu"][Math.floor(Math.random()*3)],
        createdAt: issueDate.toISOString().slice(0,10),
        description: `${type} invoice for ${tenant.name} - ${prop.name}`
      });
    }
  } else {
    // migrate existing
    existingInvoices.forEach((inv, idx) => {
      const prop = propertiesList.find(p => p.name === inv.property || p.id === inv.propertyId) || propertiesList[0];
      const tenant = tenantsList.find(t => t.name === inv.tenant || t.id === inv.tenantId) || tenantsList[0];
      const issueDate = new Date(inv.issueDate || inv.due || "2026-03-15");
      invoices.push({
        id: inv.id || `INV-2026-${String(idx+1).padStart(4,'0')}`,
        tenantId: inv.tenantId || tenant.id,
        tenant: inv.tenant || tenant.name,
        tenantName: inv.tenantName || inv.tenant || tenant.name,
        propertyId: inv.propertyId || prop.id,
        property: inv.property || prop.name,
        propertyName: inv.propertyName || inv.property || prop.name,
        unitId: inv.unitId || prop.id+"-U-001",
        unitCode: inv.unitCode || inv.unit || prop.id+"-1",
        type: inv.type || inv.invoiceType || "Rent",
        invoiceType: inv.invoiceType || inv.type || "Rent",
        status: inv.status || "Unpaid",
        paymentStatus: inv.paymentStatus || inv.status || "Unpaid",
        issueDate: inv.issueDate || "2026-03-15",
        dueDate: inv.dueDate || inv.due || "2026-04-01",
        due: inv.due || inv.dueDate || "2026-04-01",
        amount: inv.amount || 85000,
        baseRent: inv.baseRent || inv.amount || 85000,
        proRata: inv.proRata || 0,
        serviceChargeAmount: inv.serviceChargeAmount || Math.floor((inv.amount||85000)*0.15),
        utilitiesAmount: inv.utilitiesAmount || 0,
        penaltyAmount: inv.penaltyAmount || 0,
        totalBeforeTax: inv.totalBeforeTax || inv.amount || 85000,
        vat: inv.vat || Math.round((inv.amount||85000)*0.16),
        withholdingTax: inv.withholdingTax || Math.round((inv.amount||85000)*0.10),
        totalTax: inv.totalTax || inv.vat || Math.round((inv.amount||85000)*0.16),
        paidAmount: inv.paidAmount || 0,
        outstandingAmount: inv.outstandingAmount || inv.amount || 85000,
        currency: "ZMW",
        zraSmartInvoiceNo: inv.zraSmartInvoiceNo || `ZRA-SI-202603-${String(idx+1).padStart(6,'0')}-${Math.floor(1000+Math.random()*9000)}`,
        zraSmartInvoice: inv.zraSmartInvoice || inv.zraSmartInvoiceNo || `ZRA-SI-202603-${String(idx+1).padStart(6,'0')}`,
        zraStatus: inv.zraStatus || "Validated",
        zraSyncDate: inv.zraSyncDate || "2026-03-16",
        zraValidationMessage: inv.zraValidationMessage || "Validated by ZRA",
        ledgerHistory: inv.ledgerHistory || [{ id: `${inv.id}-LH-1`, date: inv.issueDate || "2026-03-15", type: "Invoice Created", amount: inv.amount||85000, reference: inv.id, user: "System", balance: inv.amount||85000 }],
        lineItems: inv.lineItems || [{ id: `${inv.id}-LI-1`, description: "Base Rent", qty: 1, unitPrice: inv.amount||85000, amount: inv.amount||85000, taxCode: "STD" }],
        paymentTerms: inv.paymentTerms || "Net 15",
        createdBy: inv.createdBy || "System",
        createdAt: inv.createdAt || inv.issueDate || "2026-03-15",
        description: inv.description || `${inv.type||'Rent'} invoice`
      });
    });
  }

  // --- Payments: bank vs mobile money ---
  const payments = [];
  const paymentMethods = [
    { method: "Bank Transfer", bank: "ZANACO", type: "Bank" },
    { method: "Bank Transfer", bank: "Stanbic Bank", type: "Bank" },
    { method: "MTN Mobile Money", bank: "MTN MoMo", type: "Mobile Money" },
    { method: "Airtel Money", bank: "Airtel", type: "Mobile Money" },
    { method: "Cheque", bank: "ZANACO", type: "Bank" },
    { method: "Bank Transfer", bank: "FNB Zambia", type: "Bank" },
  ];
  const paymentStatuses = ["Confirmed", "Pending", "Failed", "Reconciled"];
  let payCounter = 1;
  for (let i = 0; i < 28; i++) {
    const inv = invoices[Math.floor(Math.random()*invoices.length)];
    const pm = paymentMethods[Math.floor(Math.random()*paymentMethods.length)];
    const txnDate = new Date(new Date(inv.issueDate).getTime() + Math.floor(Math.random()*40)*24*3600*1000);
    const amount = inv.status === "Paid" ? inv.amount : inv.status === "Partial" ? Math.round(inv.amount* (0.3+Math.random()*0.6)) : Math.round(inv.amount* (0.5+Math.random()*0.5));
    const status = Math.random() < 0.75 ? "Confirmed" : paymentStatuses[Math.floor(Math.random()*paymentStatuses.length)];
    payments.push({
      id: `PAY-2026-${String(payCounter).padStart(4,'0')}`,
      tenantId: inv.tenantId,
      tenantName: inv.tenantName,
      tenant: inv.tenantName,
      propertyId: inv.propertyId,
      propertyName: inv.propertyName,
      invoiceIds: [inv.id],
      invoiceId: inv.id,
      allocatedInvoices: [inv.id],
      amount,
      allocatedAmount: amount,
      method: pm.method,
      paymentMethod: pm.method,
      bankName: pm.bank,
      bank: pm.bank,
      type: pm.type,
      channel: pm.type,
      reference: `${pm.bank.slice(0,3).toUpperCase()}-${Math.floor(100000+Math.random()*900000)}-${txnDate.getFullYear()}`,
      transactionDate: txnDate.toISOString().slice(0,10),
      date: txnDate.toISOString().slice(0,10),
      status,
      reconciledBy: status === "Reconciled" ? "Mary Lungu" : null,
      accountNumber: pm.type === "Bank" ? `**** **** ${Math.floor(1000+Math.random()*9000)}` : null,
      mobileNumber: pm.type === "Mobile Money" ? `+2609${Math.floor(70000000+Math.random()*29999999)}` : null,
      createdAt: txnDate.toISOString().slice(0,10)
    });
    payCounter++;
  }

  // --- Arrears: aged buckets 0-30,31-60,61-90,90+ ---
  const arrears = [];
  const riskRatings = ["Low","Medium","High","Critical"];
  const arrearsTenants = tenantsList.length ? tenantsList : [{ id: "T-1042", name: "Kabwelwa Supermarket", property: "Zambezi Mall", city: "Lusaka" }];
  // Group invoices by tenant that are unpaid/overdue/partial
  const tenantsWithBalance = {};
  invoices.filter(inv => inv.status !== "Paid" && inv.outstandingAmount > 0).forEach(inv => {
    if (!tenantsWithBalance[inv.tenantId]) tenantsWithBalance[inv.tenantId] = { tenant: inv, total:0, buckets:{ current:0, d31:0, d61:0, d90:0 }, invoices: [] };
    tenantsWithBalance[inv.tenantId].total += inv.outstandingAmount;
    tenantsWithBalance[inv.tenantId].invoices.push(inv.id);
    // age calculation
    const daysOverdue = Math.floor((now - new Date(inv.dueDate))/ (24*3600*1000));
    if (daysOverdue <= 30) tenantsWithBalance[inv.tenantId].buckets.current += inv.outstandingAmount;
    else if (daysOverdue <= 60) tenantsWithBalance[inv.tenantId].buckets.d31 += inv.outstandingAmount;
    else if (daysOverdue <= 90) tenantsWithBalance[inv.tenantId].buckets.d61 += inv.outstandingAmount;
    else tenantsWithBalance[inv.tenantId].buckets.d90 += inv.outstandingAmount;
  });

  let arrCounter = 1;
  Object.values(tenantsWithBalance).forEach((entry, idx) => {
    const t = entry.tenant;
    const total = entry.total;
    const daysOverdue = Math.floor(Math.random()*180);
    const risk = total > 200000 ? "Critical" : total > 100000 ? "High" : total > 30000 ? "Medium" : "Low";
    arrears.push({
      id: `ARR-${String(arrCounter).padStart(4,'0')}`,
      tenantId: t.tenantId,
      tenantName: t.tenantName,
      tenant: t.tenantName,
      propertyId: t.propertyId,
      propertyName: t.propertyName,
      property: t.propertyName,
      totalOutstanding: total,
      total: total,
      balance: total,
      current: entry.buckets.current,
      "0-30": entry.buckets.current,
      "31-60": entry.buckets.d31,
      "61-90": entry.buckets.d61,
      "90+": entry.buckets.d90,
      daysOverdue,
      days_90_plus: entry.buckets.d90,
      riskRating: risk,
      risk,
      lastPaymentDate: new Date(now.getTime() - Math.floor(Math.random()*60)*24*3600*1000).toISOString().slice(0,10),
      nextAction: daysOverdue > 90 ? "Legal Notice" : daysOverdue > 60 ? "Demand Letter" : "Reminder Call",
      status: daysOverdue > 120 ? "Legal" : "Active",
      city: propertiesList.find(p=>p.id===t.propertyId)?.city || "Lusaka",
      invoices: entry.invoices
    });
    arrCounter++;
  });

  // Fill to min 20 arrears if needed with random tenants
  while (arrears.length < 20) {
    const tenant = tenantsList[Math.floor(Math.random()*tenantsList.length)] || { id: `T-${1000+arrears.length}`, name: `Tenant ${arrears.length}` };
    const prop = propertiesList[Math.floor(Math.random()*propertiesList.length)] || { id: "P-001", name: "Zambezi Mall", city: "Lusaka" };
    const total = Math.floor(5000 + Math.random()*250000);
    const b0 = Math.floor(total * Math.random()*0.4);
    const b1 = Math.floor(total * Math.random()*0.3);
    const b2 = Math.floor(total * Math.random()*0.2);
    const b3 = total - b0 - b1 - b2;
    arrears.push({
      id: `ARR-${String(arrCounter).padStart(4,'0')}`,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenant: tenant.name,
      propertyId: prop.id,
      propertyName: prop.name,
      property: prop.name,
      totalOutstanding: total,
      total: total,
      balance: total,
      current: b0,
      "0-30": b0,
      "31-60": b1,
      "61-90": b2,
      "90+": b3,
      daysOverdue: Math.floor(Math.random()*150),
      days_90_plus: b3,
      riskRating: riskRatings[Math.floor(Math.random()*riskRatings.length)],
      risk: riskRatings[Math.floor(Math.random()*riskRatings.length)],
      lastPaymentDate: new Date(now.getTime() - Math.floor(Math.random()*90)*24*3600*1000).toISOString().slice(0,10),
      nextAction: ["Reminder Call","Demand Letter","Legal Notice"][Math.floor(Math.random()*3)],
      status: "Active",
      city: prop.city || "Lusaka",
      invoices: []
    });
    arrCounter++;
  }

  // --- Service Charges: budgeted vs actuals, meter readings ---
  const serviceCharges = [];
  const scTypes = ["Cleaning", "Security", "Maintenance", "Electricity Common", "Water Common", "Gardening", "Elevator", "Waste Management", "HVAC", "Insurance Service"];
  const meterTypes = ["Water", "Electricity", "None"];
  let scCounter = 1;
  const periods = ["2026-07","2026-08","2026-09","2026-10"];
  propertiesList.slice(0, Math.min(8, propertiesList.length)).forEach(prop => {
    periods.forEach(period => {
      const type = scTypes[Math.floor(Math.random()*scTypes.length)];
      const meterType = Math.random() > 0.4 ? meterTypes[Math.floor(Math.random()*2)] : "None";
      const budgeted = Math.floor(8000 + Math.random()*45000);
      const varianceFactor = 0.85 + Math.random()*0.35;
      const actual = Math.round(budgeted * varianceFactor);
      const variance = actual - budgeted;
      const variancePct = parseFloat(((variance / budgeted)*100).toFixed(1));
      const prevReading = meterType !== "None" ? Math.floor(1000 + Math.random()*5000) : null;
      const consumption = meterType !== "None" ? Math.floor(100 + Math.random()*1500) : null;
      const currReading = prevReading !== null ? prevReading + consumption : null;
      const unitRate = meterType === "Electricity" ? 2.15 : meterType === "Water" ? 12.5 : null;
      serviceCharges.push({
        id: `SC-${period}-${String(scCounter).padStart(4,'0')}`,
        propertyId: prop.id,
        propertyName: prop.name,
        property: prop.name,
        period,
        type,
        chargeType: type,
        budgeted,
        budget: budgeted,
        actual,
        actuals: actual,
        variance,
        variancePct,
        meterType,
        meterReadingPrevious: prevReading,
        meterReadingCurrent: currReading,
        previousReading: prevReading,
        currentReading: currReading,
        consumption,
        unitRate,
        total: actual,
        status: variancePct > 10 ? "Over Budget" : variancePct < -10 ? "Under Budget" : "On Budget",
        allocatedTo: Math.random() > 0.5 ? "All Tenants" : "Common Area",
        invoicesGenerated: Math.floor(Math.random()*prop.units || 10),
        city: prop.city,
        createdAt: period+"-01"
      });
      scCounter++;
    });
  });

  // Ensure min 24
  while (serviceCharges.length < 24) {
    const prop = propertiesList[Math.floor(Math.random()*propertiesList.length)] || { id: "P-001", name: "Zambezi Mall", city: "Lusaka" };
    const period = periods[Math.floor(Math.random()*periods.length)];
    const budgeted = Math.floor(8000 + Math.random()*45000);
    const actual = Math.round(budgeted * (0.85 + Math.random()*0.35));
    serviceCharges.push({
      id: `SC-${period}-${String(scCounter).padStart(4,'0')}`,
      propertyId: prop.id,
      propertyName: prop.name,
      property: prop.name,
      period,
      type: scTypes[Math.floor(Math.random()*scTypes.length)],
      chargeType: scTypes[Math.floor(Math.random()*scTypes.length)],
      budgeted,
      budget: budgeted,
      actual,
      actuals: actual,
      variance: actual - budgeted,
      variancePct: parseFloat((((actual - budgeted)/budgeted)*100).toFixed(1)),
      meterType: "None",
      meterReadingPrevious: null,
      meterReadingCurrent: null,
      previousReading: null,
      currentReading: null,
      consumption: null,
      unitRate: null,
      total: actual,
      status: "On Budget",
      allocatedTo: "All Tenants",
      invoicesGenerated: Math.floor(Math.random()*10),
      city: prop.city,
      createdAt: period+"-01"
    });
    scCounter++;
  }

  return { invoices, payments, arrears, serviceCharges };
}

function generateOperationsMockData(properties, units) {
  const now = new Date();
  const contractors = [
    { id: "CTR-001", name: "ColdTech Zambia Ltd", specialty: "HVAC", rating: 4.5, phone: "+260 211 123456", email: "info@coldtech.zm", activeJobs: 2 },
    { id: "CTR-002", name: "Lusaka Plumbing Solutions", specialty: "Plumbing", rating: 4.2, phone: "+260 211 654321", email: "ops@lpz.zm", activeJobs: 3 },
    { id: "CTR-003", name: "Zambia Electrical & Power", specialty: "Electrical", rating: 4.7, phone: "+260 211 111222", email: "service@zep.co.zm", activeJobs: 1 },
    { id: "CTR-004", name: "BuildWell Construction", specialty: "Civil/Structural", rating: 4.4, phone: "+260 211 333444", email: "projects@buildwell.zm", activeJobs: 4 },
    { id: "CTR-005", name: "SecureGuard Services", specialty: "Security Systems", rating: 4.0, phone: "+260 211 555666", email: "ops@secureguard.zm", activeJobs: 2 },
  ];
  const categories = ["Electrical","Plumbing","HVAC","Civil","Landscaping","Security","Lifts","Fire Safety","Cleaning"];
  const priorities = ["Critical","High","Medium","Low"];
  const statuses = ["Open","In Progress","Pending Parts","Completed","Closed","Cancelled"];
  const maintenance = [];
  let mntId = 1;
  properties.slice(0,8).forEach(prop => {
    const propUnits = units.filter(u => u.propertyId === prop.id).slice(0,3);
    (propUnits.length ? propUnits : [{id: prop.id+"-U-001", code: "G-01"}]).forEach(u => {
      if (maintenance.length >= 24) return;
      const cat = categories[Math.floor(Math.random()*categories.length)];
      const pri = priorities[Math.floor(Math.random()*priorities.length)];
      const ctr = contractors[Math.floor(Math.random()*contractors.length)];
      const slaDays = pri === "Critical" ? 1 : pri === "High" ? 2 : pri === "Medium" ? 5 : 7;
      const reported = new Date(now - Math.floor(Math.random()*20)*86400000);
      const due = new Date(reported.getTime() + slaDays*86400000);
      const costEst = Math.floor(1500 + Math.random()*45000);
      maintenance.push({
        id: `MNT-${String(mntId++).padStart(4,'0')}`,
        propertyId: prop.id,
        property: prop.name,
        propertyName: prop.name,
        unitId: u.id,
        unit: u.code,
        unitCode: u.code,
        issue: `${cat} - ${["Failure","Leak","Not working","Routine check","Breakdown"][Math.floor(Math.random()*5)]}`,
        description: `${cat} maintenance request at ${prop.name} ${u.code}`,
        category: cat,
        maintenanceType: Math.random() > 0.7 ? "Preventive" : "Reactive",
        type: Math.random() > 0.7 ? "Preventive" : "Reactive",
        priority: pri,
        severity: pri,
        status: statuses[Math.floor(Math.random()*statuses.length)],
        slaDays, slaHours: slaDays*24, sla: `${slaDays} days`,
        reportedDate: reported.toISOString().slice(0,10),
        dueDate: due.toISOString().slice(0,10),
        assignedTo: ["Chanda Mwanza","Mutale Phiri","Grace Banda"][Math.floor(Math.random()*3)],
        contractorId: ctr.id,
        contractorName: ctr.name,
        contractor: ctr.name,
        costEstimated: costEst,
        costActual: Math.random() > 0.5 ? Math.floor(costEst* (0.8 + Math.random()*0.4)) : 0,
        cost: costEst,
        city: prop.city
      });
    });
  });
  const insurers = ["ZSIC General","Sanlam General Zambia","Professional Insurance","Madison General"];
  const policyTypes = ["Property All Risk","Public Liability","Machinery Breakdown","Business Interruption","Fire & Perils"];
  const insurancePolicies = properties.slice(0,8).map((prop, i) => {
    const sumInsured = Math.round((prop.value || 10) * 1000000 * 1.1);
    const premium = Math.round(sumInsured * 0.0035);
    const start = new Date(2026, 0, 1 + Math.floor(Math.random()*60));
    const expiry = new Date(start); expiry.setFullYear(expiry.getFullYear()+1);
    const renewal = new Date(expiry); renewal.setDate(renewal.getDate()-30);
    return {
      id: `INS-POL-${String(i+1).padStart(4,'0')}`,
      policyNumber: `POL/${2026}/${String(1000+i).padStart(4,'0')}`,
      propertyId: prop.id,
      propertyName: prop.name,
      property: prop.name,
      insurer: insurers[i % insurers.length],
      type: policyTypes[i % policyTypes.length],
      policyType: policyTypes[i % policyTypes.length],
      sumInsured,
      sumInsuredZMW: sumInsured,
      premium,
      premiumZMW: premium,
      startDate: start.toISOString().slice(0,10),
      renewalDate: renewal.toISOString().slice(0,10),
      expiryDate: expiry.toISOString().slice(0,10),
      status: renewal < now ? "Due Renewal" : "Active",
      city: prop.city
    };
  });
  const insuranceClaims = [
    {
      id: "CLM-0001", claimNumber: "CLM/ZSIC/2026/001", policyId: insurancePolicies[0]?.id, propertyId: "P-001", propertyName: "Zambezi Mall",
      incidentDate: "2026-08-12", reportedDate: "2026-08-13", description: "Storm damage to roof sheeting", amountClaimed: 125000, amountPaid: 110000, payout: 110000, status: "Settled", insurer: insurers[0]
    },
    {
      id: "CLM-0002", claimNumber: "CLM/SAN/2026/002", policyId: insurancePolicies[1]?.id, propertyId: "P-002", propertyName: "Riverside Apartments",
      incidentDate: "2026-09-02", reportedDate: "2026-09-03", description: "Burst water pipe flood 3 units", amountClaimed: 45000, amountPaid: 0, payout: 0, status: "Under Assessment", insurer: insurers[1]
    },
    {
      id: "CLM-0003", claimNumber: "CLM/PROF/2026/003", policyId: insurancePolicies[2]?.id, propertyId: "P-004", propertyName: "Arcades Office Tower",
      incidentDate: "2026-07-20", reportedDate: "2026-07-21", description: "Lift motor breakdown", amountClaimed: 85000, amountPaid: 60000, payout: 60000, status: "Partially Paid", insurer: insurers[2]
    },
  ];
  const valuers = ["Knight Frank Zambia","Pam Golding Valuation","Hyspek Valuation","GVA Zambia"];
  const methods = ["Income Approach","Market Comparison","Discounted Cash Flow","Cost Approach"];
  const valuations = properties.map((prop, i) => {
    const marketVal = Math.round((prop.value || 20) * 1000000 * (0.95 + Math.random()*0.15));
    const prevVal = Math.round(marketVal * (0.88 + Math.random()*0.1));
    const yoy = ((marketVal - prevVal)/prevVal*100).toFixed(1);
    return {
      id: `VAL-${prop.id}-${2026}`,
      assetId: `INV-P-${String(i+1).padStart(3,'0')}`,
      propertyId: prop.id,
      propertyName: prop.name,
      property: prop.name,
      date: "2026-09-30",
      valuationDate: "2026-09-30",
      valuer: valuers[i % valuers.length],
      method: methods[i % methods.length],
      valuationMethod: methods[i % methods.length],
      ias40Class: "Investment Property",
      ias40: "Investment Property",
      marketValue: marketVal,
      marketValueZMW: marketVal,
      previousValue: prevVal,
      forcedSaleValue: Math.round(marketVal * 0.7),
      insuranceValue: Math.round(marketVal * 1.1),
      yield: prop.yield || (6 + Math.random()*3).toFixed(1),
      netYield: prop.yield || (6 + Math.random()*3).toFixed(1),
      yoyChange: parseFloat(yoy),
      status: "Final",
      ifrs13Level: "Level 3",
      city: prop.city
    };
  });
  const developmentProjects = [
    {
      id: "DEV-0001", name: "Zambezi Mall Extension - Phase 2", propertyId: "P-001", propertyName: "Zambezi Mall",
      stage: "Construction", status: "In Progress", budget: 45000000, approvedBudget: 45000000, spent: 28500000, committed: 32000000,
      variance: 45000000-28500000, retentionPct: 10, retentionAmount: 2850000, startDate: "2026-01-15", expectedCompletion: "2026-12-30",
      contractor: "BuildWell Construction", contractorId: "CTR-004", projectManager: "Peter Zulu",
      paymentCertificates: [
        { id: "CERT-001-01", projectId: "DEV-0001", amount: 8500000, status: "Paid", date: "2026-03-01", certificateNo: "IPC-01" },
        { id: "CERT-001-02", projectId: "DEV-0001", amount: 12000000, status: "Paid", date: "2026-06-15", certificateNo: "IPC-02" },
        { id: "CERT-001-03", projectId: "DEV-0001", amount: 8000000, status: "Approved", date: "2026-09-20", certificateNo: "IPC-03" },
      ]
    },
    {
      id: "DEV-0002", name: "Riverside Apartments - Block D", propertyId: "P-002", propertyName: "Riverside Apartments",
      stage: "Design", status: "Pending Approval", budget: 28000000, approvedBudget: 28000000, spent: 2500000, committed: 4000000,
      variance: 24000000, retentionPct: 5, retentionAmount: 125000, startDate: "2026-04-01", expectedCompletion: "2027-06-30",
      contractor: "TBD", contractorId: null, projectManager: "Chanda Mwanza",
      paymentCertificates: [
        { id: "CERT-002-01", projectId: "DEV-0002", amount: 2500000, status: "Paid", date: "2026-05-10", certificateNo: "IPC-01" },
      ]
    },
  ];
  return { maintenance, insurancePolicies, insuranceClaims, valuations, developmentProjects, contractors };
}

function generateEnterpriseMockData(properties, tenants, units) {
  const now = new Date();
  const propertiesList = properties || [];
  const tenantsList = tenants || [];
  const channels = ["In-App", "Email", "SMS"];
  const msgTypes = ["Inquiry", "Complaint", "Maintenance Request", "Lease Query", "Payment Confirmation", "General"];
  const messages = [];
  for (let i = 0; i < 24; i++) {
    const prop = propertiesList[i % propertiesList.length] || { id: "P-001", name: "Zambezi Mall" };
    const tenant = tenantsList[i % tenantsList.length] || { id: `T-${1042+i}`, name: `Tenant ${i+1}` };
    const daysAgo = Math.floor(Math.random()*60);
    const date = new Date(now.getTime() - daysAgo*24*3600*1000);
    const isUnread = i < 12;
    messages.push({
      id: `MSG-${String(i+1).padStart(5,'0')}`,
      propertyId: prop.id,
      propertyName: prop.name,
      property: prop.name,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenant: tenant.name,
      sender: i % 2 === 0 ? tenant.name : "PropertyPro Support",
      senderType: i % 2 === 0 ? "Tenant" : "System",
      recipient: i % 2 === 0 ? "PropertyPro Support" : tenant.name,
      recipientType: i % 2 === 0 ? "System" : "Tenant",
      subject: `${msgTypes[i % msgTypes.length]} - ${prop.name} ${tenant.name}`,
      body: `${msgTypes[i % msgTypes.length]} regarding unit ${prop.id}-${i+1}. ${i%3===0?'Urgent follow-up required.':''} Please advise on next steps.`,
      preview: `${msgTypes[i % msgTypes.length]} - ${prop.name}...`,
      type: msgTypes[i % msgTypes.length],
      channel: channels[i % channels.length],
      status: isUnread ? "Unread" : "Read",
      isStarred: Math.random() < 0.2,
      isArchived: false,
      threadId: `THREAD-${String(Math.floor(i/3)+1).padStart(4,'0')}`,
      attachmentCount: Math.random()<0.3 ? Math.floor(1+Math.random()*2) : 0,
      createdAt: date.toISOString(),
      date: date.toISOString().slice(0,10),
      timestamp: date.toISOString()
    });
  }

  const noticeTypes = ["Rent Reminder", "Lease Expiry", "Arrears Notice", "Maintenance Schedule", "General Announcement", "Service Charge", "Inspection"];
  const noticeStatuses = ["Draft", "Scheduled", "Sent", "Failed"];
  const notices = [];
  for (let i = 0; i < 18; i++) {
    const prop = propertiesList[i % propertiesList.length] || { id: "P-001", name: "Zambezi Mall" };
    const type = noticeTypes[i % noticeTypes.length];
    const status = noticeStatuses[Math.floor(Math.random()*noticeStatuses.length)];
    const schedDate = new Date(now.getTime() + (Math.floor(Math.random()*30)-10)*24*3600*1000);
    const audience = i % 3 === 0 ? "All Tenants" : i % 3 === 1 ? `Property: ${prop.name}` : "Selected Tenants";
    notices.push({
      id: `NOTICE-${String(i+1).padStart(5,'0')}`,
      title: `${type} - ${prop.name} - ${schedDate.toISOString().slice(0,7)}`,
      subject: `${type} Notice for ${prop.name}`,
      body: `Dear Tenant, This is a ${type.toLowerCase()} notice regarding ${prop.name}. Please take necessary action. Amount due: ZMW ${(5000+Math.random()*80000).toFixed(0)}. Due date: ${schedDate.toISOString().slice(0,10)}.`,
      type: type,
      noticeType: type,
      propertyId: prop.id,
      propertyName: prop.name,
      property: prop.name,
      audience: audience,
      audienceType: audience.startsWith("All") ? "All" : audience.startsWith("Property") ? "Property" : "Selected",
      recipientCount: audience === "All Tenants" ? tenantsList.length : Math.floor(2+Math.random()*8),
      status: status,
      channel: i % 2 === 0 ? "Email+SMS" : "In-App+Email",
      channels: i % 2 === 0 ? ["Email","SMS"] : ["In-App","Email"],
      scheduledDate: schedDate.toISOString().slice(0,10),
      sentDate: status === "Sent" ? new Date(schedDate.getTime() - 1*24*3600*1000).toISOString().slice(0,10) : null,
      sentCount: status === "Sent" ? Math.floor(5+Math.random()*20) : 0,
      openRate: status === "Sent" ? Math.floor(60+Math.random()*35) : 0,
      createdBy: "Chanda Mwanza",
      createdAt: new Date(now.getTime() - Math.floor(Math.random()*30)*24*3600*1000).toISOString(),
      isBulk: true
    });
  }

  const roles = ["Super Admin", "Admin", "Property Manager", "Accountant", "Leasing Officer", "Maintenance Manager", "Viewer", "Auditor"];
  const rolePermissions = {
    "Super Admin": ["all"],
    "Admin": ["properties","tenants","leases","finance","operations","enterprise"],
    "Property Manager": ["properties","tenants","leases","maintenance"],
    "Accountant": ["finance","invoices","payments","serviceCharges"],
    "Leasing Officer": ["applications","tenants","leases","marketing"],
    "Maintenance Manager": ["maintenance","units","tenants"],
    "Viewer": ["view"],
    "Auditor": ["auditTrail","reports","view"]
  };
  const users = [];
  const baseUsers = [
    { name: "Chanda Mwanza", email: "chanda.mwanza@propertypro.zm", role: "Super Admin" },
    { name: "Mary Lungu", email: "mary.lungu@propertypro.zm", role: "Admin" },
    { name: "Peter Zulu", email: "peter.zulu@propertypro.zm", role: "Property Manager" },
    { name: "Grace Banda", email: "grace.banda@propertypro.zm", role: "Accountant" },
    { name: "John Mwila", email: "john.mwila@propertypro.zm", role: "Leasing Officer" },
    { name: "Mutale Phiri", email: "mutale.phiri@propertypro.zm", role: "Maintenance Manager" },
    { name: "Kelvin Soko", email: "kelvin.soko@propertypro.zm", role: "Viewer" },
  ];
  baseUsers.forEach((u, idx) => {
    users.push({
      id: `USR-${String(idx+1).padStart(5,'0')}`,
      name: u.name,
      fullName: u.name,
      email: u.email,
      phone: `+26097${String(7000000+idx*12345).padStart(7,'0')}`,
      role: u.role,
      roles: [u.role],
      permissions: rolePermissions[u.role] || ["view"],
      status: "Active",
      isActive: true,
      department: u.role === "Accountant" ? "Finance" : u.role.includes("Maintenance") ? "Operations" : "Leasing",
      avatar: u.name.split(" ").map(n=>n[0]).join(""),
      lastLogin: new Date(now.getTime() - Math.floor(Math.random()*7)*24*3600*1000).toISOString(),
      createdAt: new Date(now.getTime() - Math.floor(30+Math.random()*400)*24*3600*1000).toISOString(),
      createdBy: "System"
    });
  });
  // Add extra random users
  for (let i = baseUsers.length; i < 14; i++) {
    const role = roles[Math.floor(Math.random()*roles.length)];
    users.push({
      id: `USR-${String(i+1).padStart(5,'0')}`,
      name: `User ${i+1}`,
      fullName: `User ${i+1}`,
      email: `user${i+1}@propertypro.zm`,
      phone: `+26097${String(7000000+i*11111).padStart(7,'0')}`,
      role: role,
      roles: [role],
      permissions: rolePermissions[role] || ["view"],
      status: Math.random()<0.85 ? "Active" : "Inactive",
      isActive: Math.random()<0.85,
      department: role === "Accountant" ? "Finance" : "Operations",
      avatar: `U${i+1}`,
      lastLogin: new Date(now.getTime() - Math.floor(Math.random()*30)*24*3600*1000).toISOString(),
      createdAt: new Date(now.getTime() - Math.floor(Math.random()*200)*24*3600*1000).toISOString(),
      createdBy: "Chanda Mwanza"
    });
  }

  const settings = {
    company: {
      name: "PropertyPro Zambia Ltd",
      tradingName: "PropertyPro Zambia",
      registrationNo: "120190012345",
      tpin: "1234567890",
      vatNo: "VAT-001234",
      address: "Plot 1234, Cairo Road, Lusaka, Zambia",
      phone: "+260 211 123456",
      email: "info@propertypro.zm",
      website: "https://propertypro.zm",
      logo: "/assets/logo.png"
    },
    finance: {
      currency: "ZMW",
      defaultCurrency: "ZMW",
      fiscalYearStart: "01-01",
      vatRate: 16,
      withholdingTax: 10,
      lateFeeRate: 2.5,
      penaltyGraceDays: 5,
      paymentTerms: "Net 15",
      zraIntegration: true,
      zraEnv: "Production",
      autoReconciliation: true,
      retentionDefault: 10
    },
    leasing: {
      defaultLeaseTerm: 12,
      renewalNoticeDays: 90,
      escalationDefault: 8,
      depositMonths: 2,
      applicationFee: 500,
      autoListing: true
    },
    operations: {
      slaDefaults: { Critical: 4, High: 24, Medium: 72, Low: 168 },
      maintenanceAutoAssign: true,
      insuranceReminderDays: 60,
      valuationCycleMonths: 12,
      retentionRelease: "50/50",
      contractorRating: true
    },
    enterprise: {
      approvalsRequired: true,
      approvalThreshold: 50000,
      auditRetentionDays: 365,
      sessionTimeoutMinutes: 30,
      maxLoginAttempts: 5,
      passwordExpiryDays: 90,
      twoFactorEnabled: false
    },
    notifications: {
      channels: ["In-App", "Email", "SMS"],
      emailFrom: "noreply@propertypro.zm",
      smsSenderId: "PropertyPro",
      rentReminderDays: [7,3,1],
      arrearsEscalation: [30,60,90],
      maintenanceAlerts: true,
      leaseExpiryAlerts: true
    },
    system: {
      version: "3.2",
      build: "2026.10.04",
      environment: "Production",
      timezone: "Africa/Lusaka",
      dateFormat: "YYYY-MM-DD",
      language: "en-ZM",
      backupEnabled: true,
      backupFrequency: "Daily",
      lastBackup: new Date(now.getTime() - 1*24*3600*1000).toISOString()
    }
  };

  return { messages, notices, users, settings };
}

function migrateTenants(tenants, properties, units, leases, applications) {
  const cities = ["Lusaka", "Ndola", "Kabwe", "Chipata"];
  const statuses = ["Active", "Inactive", "Blacklisted", "Archived"];
  const riskRatings = ["Low", "Medium", "High", "Critical"];
  const types = ["Individual", "Company", "Anchor", "Corporate", "Retail"];

  // Expand to at least 15 tenants if less
  if (tenants.length < 10) {
    const extraNames = [
      "Shoprite Zambia Ltd",
      "Choppies Supermarket",
      "Hungry Lion",
      "PEP Stores Zambia",
      "Airtel Zambia",
      "Liquid Telecom",
      "Stanbic Bank Zambia",
      "Mutale Trading Ltd",
      "Mwansa Properties Ltd",
      "Chanda Phiri",
      "Grace Banda",
      "John Mwila",
    ];
    extraNames.forEach((name, idx) => {
      if (tenants.find((t) => t.name === name)) return;
      const prop = properties[idx % properties.length];
      tenants.push({
        id: `T-${1043 + idx}`,
        name: name,
        property: prop.name,
        unit: `${prop.id}-${idx + 1}`,
        rent: 20000 + Math.floor(Math.random() * 100000),
        balance: Math.random() > 0.6 ? Math.floor(Math.random() * 50000) : 0,
        risk: riskRatings[Math.floor(Math.random() * riskRatings.length)],
        status: "Active",
        type: types[Math.floor(Math.random() * types.length)],
        tenure: `${(Math.random() * 4 + 0.5).toFixed(1)}y`,
        city: prop.city,
        current: 0,
        "31-60": 0,
        "61-90": 0,
        "90+": 0,
        total: 0,
      });
    });
  }

  return tenants.map((t) => {
    const prop = properties.find((p) => p.name === t.property) || properties[0];
    const propUnits = units.filter((u) => u.propertyId === prop.id);
    const unit =
      propUnits.find((u) => u.code === t.unit || u.id === t.unit) ||
      propUnits[0];
    const tenantLeases = leases.filter(
      (l) => l.tenant === t.name || l.tenantId === t.id,
    );
    const tenantApps = applications
      ? applications.filter((a) => a.applicantName === t.name)
      : [];
    const monthlyRent =
      t.rent ||
      tenantLeases.reduce((s, l) => s + (l.rent || l.monthlyRent || 0), 0) ||
      30000;
    const balance = t.balance || t.total || 0;
    const leaseExpiry =
      tenantLeases.length > 0
        ? tenantLeases[0].end || tenantLeases[0].endDate
        : new Date(
            Date.now() + Math.floor(Math.random() * 400) * 24 * 3600 * 1000,
          )
            .toISOString()
            .slice(0, 10);

    return {
      id: t.id,
      name: t.name,
      type:
        t.type ||
        (t.name.includes("Ltd") || t.name.includes("Zambia")
          ? "Company"
          : "Individual"),
      phone:
        t.phone || `+2609${Math.floor(70000000 + Math.random() * 29999999)}`,
      email:
        t.email || `${t.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      address:
        t.address ||
        `${Math.floor(Math.random() * 1000)} Cairo Road, ${t.city || prop.city}`,
      idType: t.idType || "NRC",
      idNumber:
        t.idNumber || `${Math.floor(100000 + Math.random() * 900000)}/12/1`,
      companyRegistration:
        t.companyRegistration ||
        (t.type === "Company"
          ? `REG-${Math.floor(10000 + Math.random() * 90000)}`
          : ""),
      tpin: t.tpin || `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      propertyIds: t.propertyIds || (prop ? [prop.id] : []),
      propertyNames: t.propertyNames || [t.property || prop.name],
      property: t.property || prop.name,
      unitIds: t.unitIds || (unit ? [unit.id] : []),
      unitCodes: t.unitCodes || [t.unit || (unit ? unit.code : "")],
      unit: t.unit || (unit ? unit.code : ""),
      leaseIds: t.leaseIds || tenantLeases.map((l) => l.id),
      applicationIds: t.applicationIds || tenantApps.map((a) => a.id),
      riskRating: t.riskRating || t.risk || "Medium",
      risk: t.risk || t.riskRating || "Medium",
      status: statuses.includes(t.status) ? t.status : "Active",
      balance: balance,
      monthlyRent: monthlyRent,
      rent: t.rent || monthlyRent,
      deposit: t.deposit || monthlyRent * 2,
      leaseExpiry: leaseExpiry,
      city:
        t.city ||
        prop.city ||
        cities[Math.floor(Math.random() * cities.length)],
      tenure: t.tenure || `${(Math.random() * 4 + 0.5).toFixed(1)}y`,
      current: t.current || 0,
      "31-60": t["31-60"] || 0,
      "61-90": t["61-90"] || 0,
      "90+": t["90+"] || 0,
      total: t.total || balance,
      createdAt:
        t.createdAt ||
        new Date(
          Date.now() - Math.floor(Math.random() * 500) * 24 * 3600 * 1000,
        )
          .toISOString()
          .slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      documents: t.documents || [
        { id: `DOC-T-${t.id}-1`, name: "NRC/Passport", type: "ID", url: "#" },
        {
          id: `DOC-T-${t.id}-2`,
          name: "Lease Agreement",
          type: "Lease",
          url: "#",
        },
      ],
      activity: t.activity || [
        {
          id: `ACT-${t.id}-1`,
          timestamp: new Date().toISOString(),
          user: "Chanda Mwanza",
          action: "Tenant created",
          description: `Tenant ${t.name} onboarded`,
        },
      ],
    };
  });
}

function migrateLeases(leases, tenants, properties, units) {
  const leaseTypes = [
    "Retail",
    "Commercial",
    "Residential",
    "Industrial",
    "Mixed-Use",
    "Fixed",
    "Periodic",
  ];
  const statuses = [
    "Draft",
    "Pending Approval",
    "Active",
    "Expiring Soon",
    "Expired",
    "Terminated",
    "Renewed",
  ];
  const renewalStatuses = ["Not Due", "Due Soon", "Pending", "Renewed"];

  // Ensure at least 12 leases
  if (leases.length < 8) {
    const existingIds = new Set(leases.map((l) => l.id));
    for (let i = leases.length + 1; i <= 12; i++) {
      const id = `L-2026-${String(i).padStart(3, "0")}`;
      if (existingIds.has(id)) continue;
      const prop = properties[Math.floor(Math.random() * properties.length)];
      const propUnits = units.filter((u) => u.propertyId === prop.id);
      const unit = propUnits[Math.floor(Math.random() * propUnits.length)] || {
        id: `${prop.id}-U-001`,
        code: `${prop.id}-1`,
      };
      const tenant = tenants[Math.floor(Math.random() * tenants.length)];
      const start = new Date(
        Date.now() - Math.floor(Math.random() * 400) * 24 * 3600 * 1000,
      );
      const end = new Date(
        start.getTime() +
          (12 + Math.floor(Math.random() * 4) * 12) * 30 * 24 * 3600 * 1000,
      );
      leases.push({
        id: id,
        tenant: tenant.name,
        property: prop.name,
        unit: unit.code,
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
        rent: tenant.rent || tenant.monthlyRent || 35000,
        status: "Active",
      });
    }
  }

  return leases.map((l, idx) => {
    const tenant =
      tenants.find((t) => t.name === l.tenant || t.id === l.tenantId) ||
      tenants[0];
    const prop =
      properties.find((p) => p.name === l.property || p.id === l.propertyId) ||
      properties[0];
    const unit = units.find((u) => u.code === l.unit || u.id === l.unitId) ||
      units.find((u) => u.propertyId === prop.id) || {
        id: `${prop.id}-U-001`,
        code: `${prop.id}-1`,
        propertyId: prop.id,
      };
    const unitIds =
      l.unitIds || (l.unitId ? [l.unitId] : unit ? [unit.id] : []);
    const unitCodes =
      l.unitCodes || (l.unit ? [l.unit] : unit ? [unit.code] : []);
    const startDate = l.startDate || l.start || "2024-01-01";
    const endDate = l.endDate || l.end || "2026-12-31";
    const monthlyRent = l.monthlyRent || l.rent || 35000;
    const deposit = l.deposit || monthlyRent * 2;
    const serviceCharge = l.serviceCharge || Math.floor(monthlyRent * 0.15);
    const daysToExpiry = Math.floor(
      (new Date(endDate) - new Date()) / (24 * 3600 * 1000),
    );
    let status = l.status;
    if (!statuses.includes(status)) {
      if (daysToExpiry < 0) status = "Expired";
      else if (daysToExpiry < 90) status = "Expiring Soon";
      else status = "Active";
    } else {
      // Auto adjust expiring
      if (status === "Active" && daysToExpiry >= 0 && daysToExpiry < 90)
        status = "Expiring Soon";
      if (status === "Active" && daysToExpiry < 0) status = "Expired";
    }
    const renewalStatus =
      l.renewalStatus ||
      (daysToExpiry < 90 && daysToExpiry >= 0
        ? "Due Soon"
        : daysToExpiry < 0
          ? "Not Due"
          : "Not Due");

    return {
      id: l.id,
      tenantId: l.tenantId || tenant.id,
      tenantName: l.tenantName || l.tenant || tenant.name,
      tenant: l.tenant || tenant.name,
      propertyId: l.propertyId || prop.id,
      propertyName: l.propertyName || l.property || prop.name,
      property: l.property || prop.name,
      unitIds: unitIds,
      unitCodes: unitCodes,
      unitId: l.unitId || unitIds[0] || "",
      unit: l.unit || unitCodes[0] || "",
      leaseType:
        l.leaseType ||
        leaseTypes[Math.floor(Math.random() * leaseTypes.length)],
      startDate: startDate,
      start: startDate,
      endDate: endDate,
      end: endDate,
      monthlyRent: monthlyRent,
      rent: monthlyRent,
      deposit: deposit,
      serviceCharge: serviceCharge,
      billingFrequency: l.billingFrequency || "Monthly",
      paymentDueDay: l.paymentDueDay || 5,
      status: status,
      renewalStatus: renewalStatus,
      reviewDate:
        l.reviewDate ||
        new Date(new Date(startDate).getTime() + 365 * 24 * 3600 * 1000)
          .toISOString()
          .slice(0, 10),
      escalationRules: l.escalationRules || [
        {
          id: `ESC-${l.id}-1`,
          type: "Annual",
          percentage: 8,
          fixedAmount: 0,
          effectiveDate: new Date(
            new Date(startDate).getTime() + 365 * 24 * 3600 * 1000,
          )
            .toISOString()
            .slice(0, 10),
          applied: false,
        },
      ],
      rentReviews: l.rentReviews || [
        {
          id: `RR-${l.id}-1`,
          leaseId: l.id,
          currentRent: monthlyRent,
          proposedRent: Math.round(monthlyRent * 1.08),
          effectiveDate: new Date(
            new Date(startDate).getTime() + 365 * 24 * 3600 * 1000,
          )
            .toISOString()
            .slice(0, 10),
          reviewMethod: "Percentage",
          percentageIncrease: 8,
          status: daysToExpiry < 30 ? "Proposed" : "Scheduled",
          approvedBy: "",
          notes: "Annual review",
          createdAt: startDate,
        },
      ],
      guarantors:
        l.guarantors ||
        (Math.random() > 0.6
          ? [
              {
                name: "Mutale Phiri",
                phone: "+260977123456",
                idNumber: "123456/12/1",
                relationship: "Business Partner",
              },
            ]
          : []),
      documents: l.documents || [
        {
          id: `DOC-L-${l.id}-1`,
          name: "Lease Agreement",
          type: "Agreement",
          url: "#",
        },
        {
          id: `DOC-L-${l.id}-2`,
          name: "Condition Report",
          type: "Report",
          url: "#",
        },
      ],
      termination: l.termination || null,
      previousLeaseId: l.previousLeaseId || null,
      nextLeaseId: l.nextLeaseId || null,
      renewalHistory: l.renewalHistory || [],
      balance: l.balance || tenant.balance || 0,
      createdAt: l.createdAt || startDate,
      updatedAt: l.updatedAt || new Date().toISOString().slice(0, 10),
      approvedBy: l.approvedBy || "Chanda Mwanza",
    };
  });
}

// Load state with migration
let state;
try {
  const v3 = localStorage.getItem(STORAGE_KEY);
  if (v3) {
    state = JSON.parse(v3);
    console.log("[Common] Loaded v3 state");
  } else {
    const v2 = localStorage.getItem(STORAGE_KEY_V2);
    if (v2) {
      state = JSON.parse(v2);
      console.log("[Common] Migrating from v2 to v3");
      const inv = generateInvestmentMockData(
        state.properties || mock.properties,
      );
      Object.keys(inv).forEach((k) => {
        if (!state[k]) state[k] = inv[k];
      });
      state.version = STORAGE_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.log("[Common] Migration complete");
    } else {
      state = JSON.parse(JSON.stringify(mock));
      const inv = generateInvestmentMockData(state.properties);
      Object.assign(state, inv);
      const financeMock = generateFinanceMockData(state.properties, state.tenants, state.units, state.invoices);
      state.invoices = financeMock.invoices;
      state.payments = financeMock.payments;
      state.arrears = financeMock.arrears;
      state.serviceCharges = financeMock.serviceCharges;
      state.version = STORAGE_VERSION;
      console.log("[Common] Created fresh v3 mock with Finance");
    }
  }
  // Ensure all investment collections exist (backward compat)
  if (!state.funds) {
    const inv = generateInvestmentMockData(state.properties);
    Object.keys(inv).forEach((k) => {
      if (!state[k]) state[k] = inv[k];
    });
  }
  // Ensure units exist
  if (!state.units || state.units.length === 0) {
    state.units = [];
    state.properties.forEach((p) => {
      const count = Math.min(p.units, 20);
      for (let i = 1; i <= count; i++) {
        state.units.push({
          id: `${p.id}-U-${String(i).padStart(3, "0")}`,
          propertyId: p.id,
          property: p.name,
          code: `${p.id}-${i}`,
          type: i % 3 === 0 ? "Retail" : i % 3 === 1 ? "Office" : "Residential",
          floor: Math.floor(i / 5) + 1,
          area: 40 + Math.floor(Math.random() * 200),
          rent: 20 + Math.floor(Math.random() * 80),
          status: i <= p.occupied ? "Occupied" : "Vacant",
          tenantId: i <= p.occupied ? `T-${1000 + i}` : null,
        });
      }
    });
  }
  // Ensure applications exist
  if (!state.applications || state.applications.length === 0) {
    const leasingMock = generateLeasingMockData(
      state.properties,
      state.units,
      state.tenants,
      state.leases,
    );
    state.applications = leasingMock.applications;
    console.log(
      "[Common] Generated applications mock",
      state.applications.length,
    );
  }
  // Migrate tenants and leases to extended structure
  if (state.tenants) {
    state.tenants = migrateTenants(
      state.tenants,
      state.properties,
      state.units,
      state.leases || [],
      state.applications || [],
    );
  }
  if (state.leases) {
    state.leases = migrateLeases(
      state.leases,
      state.tenants,
      state.properties,
      state.units,
    );
  }
  // Ensure auditTrail exists
  if (!state.auditTrail) state.auditTrail = [];

  // Ensure Finance data exists (invoices, payments, arrears, serviceCharges)
  if (!state.invoices || state.invoices.length < 20 || !state.invoices[0].zraSmartInvoiceNo || !state.payments || !state.arrears || !state.serviceCharges) {
    console.log("[Common] Generating Finance mock data - invoices/payments/arrears/serviceCharges");
    const financeMock = generateFinanceMockData(state.properties, state.tenants, state.units, state.invoices);
    if (!state.invoices || state.invoices.length < 20 || !state.invoices[0].zraSmartInvoiceNo) {
      state.invoices = financeMock.invoices;
    }
    if (!state.payments || state.payments.length === 0) {
      state.payments = financeMock.payments;
    }
    if (!state.arrears || state.arrears.length === 0) {
      state.arrears = financeMock.arrears;
    }
    if (!state.serviceCharges || state.serviceCharges.length === 0) {
      state.serviceCharges = financeMock.serviceCharges;
    }
    // Also ensure finance keys persist even if they exist but are old format
    if (state.invoices && !state.invoices[0].lineItems) {
      state.invoices = financeMock.invoices;
    }
    if (state.payments && !state.payments[0].channel) {
      state.payments = financeMock.payments;
    }
    saveState();
    console.log("[Common] Finance mock generated:", {
      invoices: state.invoices.length,
      payments: state.payments.length,
      arrears: state.arrears.length,
      serviceCharges: state.serviceCharges.length
    });
  }

  // Ensure finance collections exist (backward compat for v3)
  if (!state.invoices) state.invoices = [];
  if (!state.payments) state.payments = [];
  if (!state.arrears) state.arrears = [];
  if (!state.serviceCharges) state.serviceCharges = [];
  if (!state.serviceChargeBudgets) state.serviceChargeBudgets = [];

  // Ensure Operations data exists - ToR 8.7, 8.8, 8.9, 8.10 - Enterprise v3.1
  if (!state.maintenance || state.maintenance.length < 8 || !state.maintenance[0].contractorId ||
     !state.insurancePolicies || !state.insuranceClaims || !state.valuations || !state.developmentProjects) {
    console.log("[Common] Generating Operations mock data - maintenance/insurance/valuations/development");
    const opsMock = generateOperationsMockData(state.properties, state.units);
    if (!state.maintenance || state.maintenance.length < 8 || !state.maintenance[0].contractorId) state.maintenance = opsMock.maintenance;
    if (!state.insurancePolicies || state.insurancePolicies.length === 0) state.insurancePolicies = opsMock.insurancePolicies;
    if (!state.insuranceClaims || state.insuranceClaims.length === 0) state.insuranceClaims = opsMock.insuranceClaims;
    if (!state.valuations || state.valuations.length < 8) state.valuations = opsMock.valuations;
    if (!state.developmentProjects || state.developmentProjects.length === 0) state.developmentProjects = opsMock.developmentProjects;
    if (!state.contractors || state.contractors.length === 0) state.contractors = opsMock.contractors;
    saveState();
    console.log("[Common] Operations mock generated:", {
      maintenance: state.maintenance.length,
      insurancePolicies: state.insurancePolicies.length,
      insuranceClaims: state.insuranceClaims.length,
      valuations: state.valuations.length,
      developmentProjects: state.developmentProjects.length
    });
  }
  if (!state.maintenance) state.maintenance = [];
  if (!state.insurancePolicies) state.insurancePolicies = [];
  if (!state.insuranceClaims) state.insuranceClaims = [];
  if (!state.valuations) state.valuations = [];
  if (!state.developmentProjects) state.developmentProjects = [];
  if (!state.contractors) state.contractors = [];

  // Ensure Enterprise data exists - ToR 9.x Enterprise v3.2 - messages, notices, users, settings
  if (!state.messages || !state.notices || !state.users || !state.settings) {
    console.log("[Common] Generating Enterprise mock data - messages/notices/users/settings");
    const enterpriseMock = generateEnterpriseMockData(state.properties, state.tenants, state.units);
    if (!state.messages || state.messages.length === 0) state.messages = enterpriseMock.messages;
    if (!state.notices || state.notices.length === 0) state.notices = enterpriseMock.notices;
    if (!state.users || state.users.length === 0) state.users = enterpriseMock.users;
    if (!state.settings || Object.keys(state.settings).length === 0) state.settings = enterpriseMock.settings;
    saveState();
    console.log("[Common] Enterprise mock generated:", {
      messages: state.messages.length,
      notices: state.notices.length,
      users: state.users.length,
      settings: Object.keys(state.settings).length + " sections"
    });
  }
  if (!state.messages) state.messages = [];
  if (!state.notices) state.notices = [];
  if (!state.users) state.users = [];
  if (!state.settings) state.settings = {};
  if (!state.settings.company) {
    const enterpriseMock = generateEnterpriseMockData(state.properties, state.tenants, state.units);
    state.settings = enterpriseMock.settings;
    saveState();
  }
} catch (e) {
  console.error("State load error, using mock", e);
  state = JSON.parse(JSON.stringify(mock));
  const inv = generateInvestmentMockData(state.properties);
  Object.assign(state, inv);
  const leasingMock = generateLeasingMockData(
    state.properties,
    state.units,
    state.tenants,
    state.leases,
  );
  state.applications = leasingMock.applications;
  state.tenants = migrateTenants(
    state.tenants,
    state.properties,
    state.units,
    state.leases,
    state.applications,
  );
  state.leases = migrateLeases(
    state.leases,
    state.tenants,
    state.properties,
    state.units,
  );
  const financeMock = generateFinanceMockData(state.properties, state.tenants, state.units, state.invoices);
  state.invoices = financeMock.invoices;
  state.payments = financeMock.payments;
  state.arrears = financeMock.arrears;
  state.serviceCharges = financeMock.serviceCharges;
  const opsMock = generateOperationsMockData(state.properties, state.units);
  state.maintenance = opsMock.maintenance;
  state.insurancePolicies = opsMock.insurancePolicies;
  state.insuranceClaims = opsMock.insuranceClaims;
  state.valuations = opsMock.valuations;
  state.developmentProjects = opsMock.developmentProjects;
  state.contractors = opsMock.contractors;
  const enterpriseMock = generateEnterpriseMockData(state.properties, state.tenants, state.units);
  state.messages = enterpriseMock.messages;
  state.notices = enterpriseMock.notices;
  state.users = enterpriseMock.users;
  state.settings = enterpriseMock.settings;
}

function saveState() {
  try {
    // Guarantee finance + operations + enterprise keys persist under propertypro_v3 schema
    const financeKeys = ["invoices", "payments", "arrears", "serviceCharges", "serviceChargeBudgets", "paymentPlans", "financeMetrics"];
    const operationsKeys = ["maintenance", "insurancePolicies", "insuranceClaims", "valuations", "developmentProjects", "contractors"];
    const enterpriseKeys = ["messages", "notices", "users"];
    [...financeKeys, ...operationsKeys, ...enterpriseKeys].forEach(k => {
      if (!state[k]) state[k] = [];
    });
    if (!state.settings || typeof state.settings !== 'object' || Array.isArray(state.settings)) {
      // Preserve existing if valid object, else init from generator
      if (typeof generateEnterpriseMockData === 'function' && (!state.settings || Array.isArray(state.settings) || Object.keys(state.settings).length === 0)) {
        try {
          const em = generateEnterpriseMockData(state.properties, state.tenants, state.units);
          state.settings = em.settings;
        } catch(e) {
          state.settings = state.settings && typeof state.settings === 'object' && !Array.isArray(state.settings) ? state.settings : {};
        }
      } else if (!state.settings) {
        state.settings = {};
      }
    }
    if (typeof state.financeMetrics === 'undefined' || Array.isArray(state.financeMetrics)) {
      if (Array.isArray(state.financeMetrics)) state.financeMetrics = {};
    }
    if (!state.version) state.version = STORAGE_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
    try {
      window.dispatchEvent(new CustomEvent('propertypro:stateUpdated', { detail: state }));
      window.dispatchEvent(new Event('storage'));
    } catch(e){}
  } catch (e) {
    console.warn('[Common] saveState failed', e);
  }
}

function loadState() {
  try {
    const v3 = localStorage.getItem(STORAGE_KEY);
    if (v3) {
      state = JSON.parse(v3);
    }
    // Ensure enterprise keys retained after parse
    const enterpriseKeys = ["messages", "notices", "users"];
    enterpriseKeys.forEach(k => { if (!state[k]) state[k] = []; });
    if (!state.settings || typeof state.settings !== 'object') {
      if (typeof generateEnterpriseMockData === 'function') {
        const em = generateEnterpriseMockData(state.properties, state.tenants, state.units);
        state.settings = em.settings;
      } else {
        state.settings = {};
      }
    }
    saveState();
    return state;
  } catch (e) {
    console.warn('[Common] loadState failed', e);
    return state;
  }
}

// Explicit loadState helper to ensure finance schema (called on init)
function ensureFinanceSchema() {
  if (!state) return;
  if (!state.invoices) state.invoices = [];
  if (!state.payments) state.payments = [];
  if (!state.arrears) state.arrears = [];
  if (!state.serviceCharges) state.serviceCharges = [];
  if (!state.serviceChargeBudgets) state.serviceChargeBudgets = [];
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

function addAuditEvent(
  action,
  entityType,
  entityId,
  description,
  before = null,
  after = null,
) {
  if (!state.auditTrail) state.auditTrail = [];
  const ev = {
    id: `AUD-${String(state.auditTrail.length + 1).padStart(6, "0")}`,
    timestamp: new Date().toISOString(),
    user: "Chanda Mwanza",
    action: action,
    entityType: entityType,
    entityId: entityId,
    description: description,
    before: before,
    after: after,
  };
  state.auditTrail.unshift(ev);
  // Keep only last 500
  if (state.auditTrail.length > 500)
    state.auditTrail = state.auditTrail.slice(0, 500);
  return ev;
}

function updatePropertyOccupancy(propertyId) {
  const prop = state.properties.find((p) => p.id === propertyId);
  if (!prop) return;
  const propUnits = state.units.filter((u) => u.propertyId === propertyId);
  const occupied = propUnits.filter((u) => u.status === "Occupied").length;
  prop.occupied = occupied;
  prop.units = propUnits.length;
  // Also update investment asset if linked
  const invAsset = state.investmentAssets
    ? state.investmentAssets.find((a) => a.propertyId === propertyId)
    : null;
  if (invAsset) {
    invAsset.occupancy = propUnits.length
      ? Math.round((occupied / propUnits.length) * 100)
      : 0;
  }
}

function toast(msg, type = "") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function goToPage(pageId) {
  const base = pageId.split("?")[0];
  const query = pageId.includes("?") ? "?" + pageId.split("?")[1] : "";
  const inPages = window.location.pathname.includes("/pages/");
  const meta =
    window.Layout && window.Layout.NAV_CONFIG
      ? window.Layout.NAV_CONFIG.find((p) => p.id === base)
      : null;
  let file = meta ? meta.file : base.includes(".html") ? base : base + ".html";
  if (!file) file = base + ".html";
  let target;
  if (file === "index.html") {
    target = inPages ? "../index.html" : "./index.html";
  } else {
    target = inPages ? "./" + file : "./pages/" + file;
  }
  window.location.href = target + query;
}

function openSearch() {
  const bd = document.getElementById("globalSearchBackdrop");
  if (bd) {
    bd.classList.add("open");
    const inp = document.getElementById("globalSearchInput");
    if (inp) inp.focus();
  }
}
function closeSearch() {
  const bd = document.getElementById("globalSearchBackdrop");
  if (bd) bd.classList.remove("open");
}

function handleSearchInput(e) {
  const q = (e.target.value || "").toLowerCase();
  if (q.length < 2) return;
  if (window.handleSearchInputGlobal) window.handleSearchInputGlobal();
  else openSearch();
}

function handleSearchInputGlobal() {
  const inp = document.getElementById("globalSearchInput");
  const resEl = document.getElementById("globalSearchResults");
  if (!inp || !resEl) return;
  const q = (inp.value || "").toLowerCase();
  if (q.length < 1) {
    resEl.innerHTML =
      '<div class="small muted">Type to search properties, investments, deals, invoices, receipts...</div>';
    return;
  }
  const results = [];
  (state.properties || [])
    .filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    )
    .slice(0, 5)
    .forEach((p) => {
      results.push({
        type: "Property",
        id: p.id,
        name: p.name,
        sub: `${p.city} • ${p.type} • ZMW ${p.value}M`,
        action: `property-register.html?id=${p.id}`,
      });
    });
  (state.units || [])
    .filter(
      (u) =>
        (u.code || "").toLowerCase().includes(q) ||
        (u.property || "").toLowerCase().includes(q),
    )
    .slice(0, 3)
    .forEach((u) => {
      results.push({
        type: "Unit",
        id: u.id || u.code,
        name: u.code,
        sub: u.property,
        action: `units.html?property=${encodeURIComponent(u.property || "")}`,
      });
    });
  (state.investmentAssets || [])
    .filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.ticker || "").toLowerCase().includes(q),
    )
    .slice(0, 6)
    .forEach((a) => {
      results.push({
        type: "Investment Asset",
        id: a.id,
        name: a.name,
        sub: `${a.assetClass} • ${a.fundId} • ZMW ${(a.currentValue / 1_000_000).toFixed(1)}M`,
        action: `investment-assets.html?id=${a.id}`,
      });
    });
  (state.investmentDeals || [])
    .filter(
      (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q),
    )
    .slice(0, 4)
    .forEach((d) => {
      results.push({
        type: "Deal",
        id: d.id,
        name: d.name,
        sub: `${d.assetClass} • ${d.stage} • ZMW ${(d.amount / 1_000_000).toFixed(1)}M`,
        action: `investment-pipeline.html?id=${d.id}`,
      });
    });
  (state.funds || [])
    .filter(
      (f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q),
    )
    .slice(0, 3)
    .forEach((f) => {
      results.push({
        type: "Fund",
        id: f.id,
        name: f.name,
        sub: `${f.type} • AUM ZMW ${f.aum}M`,
        action: `investment-dashboard.html?fund=${f.id}`,
      });
    });
  (state.tenants || [])
    .filter(
      (t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
    )
    .slice(0, 4)
    .forEach((t) => {
      results.push({
        type: "Tenant",
        id: t.id,
        name: t.name,
        sub: `${t.property} • ${t.unitCodes ? t.unitCodes.join(",") : t.unit} • ${t.city}`,
        action: `tenants.html?id=${t.id}`,
      });
    });
  (state.leases || [])
    .filter(
      (l) =>
        (l.id || "").toLowerCase().includes(q) ||
        (l.tenantName || l.tenant || "").toLowerCase().includes(q),
    )
    .slice(0, 4)
    .forEach((l) => {
      results.push({
        type: "Lease",
        id: l.id,
        name: l.id,
        sub: `${l.tenantName || l.tenant} • ${l.propertyName || l.property} • ZMW ${(l.monthlyRent || l.rent || 0) / 1000}k`,
        action: `leases.html?id=${l.id}`,
      });
    });
  (state.applications || [])
    .filter(
      (a) =>
        (a.id || "").toLowerCase().includes(q) ||
        (a.applicantName || "").toLowerCase().includes(q),
    )
    .slice(0, 4)
    .forEach((a) => {
      results.push({
        type: "Application",
        id: a.id,
        name: a.applicantName,
        sub: `${a.propertyName} • ${a.unitCodes ? a.unitCodes.join(",") : ""} • ${a.status}`,
        action: `applications.html?id=${a.id}`,
      });
    });
  // --- NEW: Invoices (Billing) ---
  (state.invoices || [])
    .filter(
      (inv) =>
        (inv.id || "").toLowerCase().includes(q) ||
        (inv.tenantName || inv.tenant || "").toLowerCase().includes(q) ||
        (inv.propertyName || inv.property || "").toLowerCase().includes(q) ||
        (inv.zraSmartInvoiceNo || "").toLowerCase().includes(q) ||
        (inv.type || "").toLowerCase().includes(q),
    )
    .slice(0, 6)
    .forEach((inv) => {
      results.push({
        type: "Invoice",
        id: inv.id,
        name: inv.id,
        sub: `${inv.tenantName || inv.tenant} • ${inv.propertyName || inv.property} • ZMW ${(inv.amount||0).toLocaleString()} • ${inv.status} • ZRA ${inv.zraStatus||''}`,
        action: `finance-billing.html?id=${inv.id}`,
      });
    });
  // --- NEW: Payments / Receipts ---
  (state.payments || [])
    .filter(
      (pay) =>
        (pay.id || "").toLowerCase().includes(q) ||
        (pay.receiptNo || "").toLowerCase().includes(q) ||
        (pay.tenantName || pay.tenant || "").toLowerCase().includes(q) ||
        (pay.propertyName || pay.property || "").toLowerCase().includes(q) ||
        (pay.method || "").toLowerCase().includes(q),
    )
    .slice(0, 6)
    .forEach((pay) => {
      results.push({
        type: "Receipt",
        id: pay.id || pay.receiptNo,
        name: pay.receiptNo || pay.id,
        sub: `${pay.tenantName || pay.tenant} • ZMW ${(pay.amount||0).toLocaleString()} • ${pay.method||''} • ${pay.status||''}`,
        action: `finance-payments.html?id=${pay.id}`,
      });
    });
  if (results.length === 0) {
    resEl.innerHTML =
      '<div class="small muted" style="padding:12px">No results found</div>';
  } else {
    resEl.innerHTML = results
      .map(
        (r) => `
      <div class="result-row" onclick="location.href='${r.action.includes("?") ? (location.pathname.includes("/pages/") ? "./" + r.action : "./pages/" + r.action) : location.pathname.includes("/pages/") ? "./" + r.action : "./pages/" + r.action}'; document.getElementById('globalSearchBackdrop').classList.remove('open')">
        <div style="width:36px;height:36px;border-radius:8px;background:#F1F5F9;border:1px solid #E2E8F0;display:grid;place-items:center;font-size:11px;font-weight:700;color:#64748B">${r.type.charAt(0)}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.name)} <span style="color:#94A3B8;font-weight:400">${escapeHtml(r.id)}</span></div><div style="font-size:11px;color:#64748B">${escapeHtml(r.sub)}</div></div>
        <div style="font-size:11px;color:#2563EB;font-weight:600">${r.type}</div>
      </div>
    `,
      )
      .join("");
  }
}

function initCommon(pageId) {
  console.log("[Common] initCommon", pageId, "v" + STORAGE_VERSION);
  if (state.properties.length < 20) {
    const cities = ["Lusaka", "Ndola", "Kabwe", "Chipata"];
    const types = [
      "Retail",
      "Residential",
      "Commercial",
      "Industrial",
      "Mixed-Use",
    ];
    while (state.properties.length < 28) {
      const idx = state.properties.length + 1;
      state.properties.push({
        id: `P-${String(idx).padStart(3, "0")}`,
        name: `Property ${idx}`,
        type: types[idx % types.length],
        units: Math.floor(40 + Math.random() * 120),
        occupied: Math.floor(30 + Math.random() * 100),
        city: cities[idx % cities.length],
        value: parseFloat((10 + Math.random() * 60).toFixed(1)),
        rent: parseFloat((0.5 + Math.random() * 2).toFixed(1)),
        status: ["Stabilized", "Lease-up", "Value-Add"][idx % 3],
        yield: parseFloat((6 + Math.random() * 3).toFixed(1)),
      });
    }
    saveState();
  }
  if (!state.units || state.units.length === 0) {
    state.units = [];
    state.properties.forEach((p) => {
      const count = Math.min(p.units, 20);
      for (let i = 1; i <= count; i++) {
        state.units.push({
          id: `${p.id}-U-${String(i).padStart(3, "0")}`,
          propertyId: p.id,
          property: p.name,
          code: `${p.id}-${i}`,
          type: i % 3 === 0 ? "Retail" : i % 3 === 1 ? "Office" : "Residential",
          floor: Math.floor(i / 5) + 1,
          area: 40 + Math.floor(Math.random() * 200),
          rent: 20 + Math.floor(Math.random() * 80),
          status: i <= p.occupied ? "Occupied" : "Vacant",
          tenantId: i <= p.occupied ? `T-${1000 + i}` : null,
        });
      }
    });
    saveState();
  }
  if (!state.applications || state.applications.length === 0) {
    const leasingMock = generateLeasingMockData(
      state.properties,
      state.units,
      state.tenants || [],
      state.leases || [],
    );
    state.applications = leasingMock.applications;
    saveState();
  }
  // Ensure tenants and leases migrated (in case state updated without reload)
  if (state.tenants) {
    const migrated = migrateTenants(
      state.tenants,
      state.properties,
      state.units,
      state.leases || [],
      state.applications || [],
    );
    if (JSON.stringify(migrated) !== JSON.stringify(state.tenants)) {
      state.tenants = migrated;
      saveState();
    }
  }
  if (state.leases) {
    const migrated = migrateLeases(
      state.leases,
      state.tenants,
      state.properties,
      state.units,
    );
    if (JSON.stringify(migrated) !== JSON.stringify(state.leases)) {
      state.leases = migrated;
      saveState();
    }
  }
  bindNav(pageId);
  const fmt = new Intl.DateTimeFormat("en-ZM", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
  document
    .querySelectorAll("[data-today]")
    .forEach((el) => (el.textContent = fmt));
}

function bindNav(pageId) {
  // Nav items - use delegation-safe binding (avoid duplicates)
  document.querySelectorAll(".nav-item[data-page]").forEach((el) => {
    if (el._boundNav) return;
    el._boundNav = true;
    el.addEventListener("click", () => {
      const p = el.dataset.page;
      goToPage(p);
    });
  });
  // NOTE: Collapse and hamburger are now handled ONLY by layout.js global delegated controls
  // to avoid double-toggle issues on dashboard vs leasing pages
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("focus", () => openSearch());
    searchInput.addEventListener("input", handleSearchInput);
  }
  const btnSearchOpen = document.getElementById("btnSearchOpen");
  if (btnSearchOpen)
    btnSearchOpen.addEventListener("click", () => openSearch());
  const globalInput = document.getElementById("globalSearchInput");
  if (globalInput)
    globalInput.addEventListener("input", handleSearchInputGlobal);
  const btnNotif = document.getElementById("btnNotif");
  const notifPanel = document.getElementById("notifPanel");
  if (btnNotif && notifPanel) {
    btnNotif.addEventListener("click", (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle("open");
      renderNotifications();
    });
  }
  document.addEventListener("click", (e) => {
    const p = document.getElementById("notifPanel");
    const b = document.getElementById("btnNotif");
    if (p && b && !p.contains(e.target) && !b.contains(e.target))
      p.classList.remove("open");
  });
  const backdrop = document.getElementById("globalSearchBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeSearch();
    });
  }
}

function renderNotifications() {
  const body = document.getElementById("notifBody");
  if (!body) return;
  const notifs = [
    {
      icon: "⚠️",
      title: "Allocation Breach: Property 27% vs max 25%",
      sub: "Pension Fund • High severity • Today",
      type: "investment",
    },
    {
      icon: "📅",
      title: "Lease expiry: Bata Zambia in 30 days",
      sub: "Arcades Office Tower • G-04",
      type: "property",
    },
    {
      icon: "💰",
      title: "Coupon date: GRZ Bond ZMW 50M",
      sub: "Due 2026-10-15 • Fixed Income",
      type: "investment",
    },
    {
      icon: "🔧",
      title: "Maintenance SLA breach: MNT-001",
      sub: "Zambezi Mall • 2 days overdue",
      type: "property",
    },
    {
      icon: "✅",
      title: "Approval pending: DEAL-004 MIC",
      sub: "Ndola Warehousing SPV • John Mwila",
      type: "investment",
    },
  ];
  body.innerHTML = notifs
    .map(
      (n) => `
    <div class="notif-item"><div class="ico">${n.icon}</div><div class="txt"><div class="t">${n.title}</div><div class="s">${n.sub} • ${n.type}</div></div></div>
  `,
    )
    .join("");
}

function exportExcel(selector, filename) {
  const table = document.querySelector(selector);
  if (!table) {
    toast("Table not found", "error");
    return;
  }
  const wb = XLSX.utils.table_to_book(table);
  XLSX.writeFile(wb, filename + ".xlsx");
  toast("Excel exported", "success");
}

function renderTable(data, containerId, columns) {}

window.$ = $;
window.$$ = $$;
window.toast = toast;
window.openSearch = openSearch;
window.closeSearch = closeSearch;
window.goToPage = goToPage;
window.initCommon = initCommon;
window.state = state;
window.saveState = saveState;
window.escapeHtml = escapeHtml;
window.handleSearchInput = handleSearchInput;
window.handleSearchInputGlobal = handleSearchInputGlobal;
window.generateInvestmentMockData = generateInvestmentMockData;
window.generateLeasingMockData = generateLeasingMockData;
window.generateFinanceMockData = generateFinanceMockData;
window.generateOperationsMockData = generateOperationsMockData;
window.migrateTenants = migrateTenants;
window.migrateLeases = migrateLeases;
window.addAuditEvent = addAuditEvent;
window.updatePropertyOccupancy = updatePropertyOccupancy;

(function ensureGlobalElements() {
  function ensure() {
    if (!document.getElementById("toastContainer")) {
      const tc = document.createElement("div");
      tc.id = "toastContainer";
      tc.className = "toast-container";
      document.body.appendChild(tc);
    }
    if (!document.getElementById("globalSearchBackdrop")) {
      const bd = document.createElement("div");
      bd.id = "globalSearchBackdrop";
      bd.className = "modal-backdrop";
      bd.innerHTML = `<div class="modal"><div class="modal-head"><div style="display:flex;align-items:center;gap:10px;flex:1"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8"><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></svg><input id="globalSearchInput" placeholder="Search properties, tenants, leases, applications..." style="flex:1;border:0;outline:0;font-size:14px" autofocus /></div><button class="btn btn-ghost" onclick="document.getElementById('globalSearchBackdrop').classList.remove('open')">Esc</button></div><div class="modal-body"><div class="small muted" style="margin-bottom:8px">Try: Zambezi, T-1042, L-2026, APP-, INV-P-001, DEAL-001</div><div id="globalSearchResults"></div></div></div>`;
      document.body.appendChild(bd);
    }
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ensure);
  else ensure();
  setTimeout(ensure, 500);
})();

console.log(
  "[Common] v3 loaded with Investment + Leasing layer - Applications, Tenants, Leases",
);


# PropertyPro Zambia — Enterprise Portfolio Management System
## Investment Management + Property Management Integration (v3)

### Overview
One enterprise system with two operational lenses:
- **Property Management**: Properties, Units, Tenants, Leases, Rent, Arrears, Maintenance, Occupancy, Marketing
- **Investment Management**: Funds, Portfolios, Asset Allocation, Investment Assets, Deals, Appraisals, Risk, Compliance, Performance, Cash

Critical: A property is NOT two unrelated records. For directly held investment properties, Property Management record + Investment Asset record are LINKED via `propertyId` / `linkedPropertyId`.

Example: Zambezi Mall (P-001) ↔ INV-P-001 (Property Investment Asset)

### Data Flow
Property → Units → Tenants → Leases → Rental Income → Operating Costs → NOI → Property Investment Asset → Portfolio Performance → Fund Performance

- If rental income changes in Property Management, investment reporting recalculates property contribution automatically via shared state.
- If valuation changes, investment asset currentValue reflects it.

### Storage
- `localStorage → propertypro_v3` (with migration from v2)
- `STORAGE_VERSION = 3`
- Backward compatible: existing property data preserved, investment collections added if missing.

### New State Structure
```
properties, units, tenants, leases, invoices, maintenance, vacancies,
funds, portfolios, subPortfolios,
investmentAssets, instruments, issuers, counterparties,
investmentDeals, appraisals, approvals, conditionsPrecedent,
assetAllocations, orders, fixedIncome, listedEquities, unlistedInvestments, collectiveInvestments,
cashAccounts, transactions, valuations, performanceRecords, riskRecords, complianceBreaches,
documents, notifications, auditTrail
```

### Navigation (NAV_CONFIG single source of truth)
Sections: Overview, Investment, Property, Enterprise
- Overview: Property Dashboard, Investment Dashboard
- Investment: Portfolio & Asset Register, Asset Allocation, Pipeline, Appraisals, Fixed Income, Listed Equities, Unlisted, Collective, Cash, Risk, Compliance, Performance, Reports
- Property: Register, Units, Map, Marketing, Add Property, Leasing, Finance, Operations
- Enterprise: Approvals, Conditions Precedent, Documents, Audit Trail, Property Portfolio Reports, Messages, Notices, Users, Settings
- Investment: Investment Reports (kept separate from operational property reports)

### Key Integration Points
1. **Property Register → Investment**: Each property drawer has Investment tab showing Investment Asset ID, Fund, Portfolio, Acquisition Cost, Current Valuation, NOI, Yield, Allocation %, with button Open Investment Record → investment-assets.html?id=INV-P-001
2. **Investment Asset → Property**: Investment drawer shows Operational Property section with buttons View Property, View Units, View Tenants, View Leases, using URL params `property-register.html?id=P-001`
3. **Dashboard Cross-linking**: Property Dashboard shows Portfolio Investment Snapshot (Total Property Investment Value, Allocation, Yield, Valuation Change). Investment Dashboard shows Property Contribution card (Property Value, Rental Income, NOI, Occupancy, Net Yield) with link View Property Assets filtered to assetClass=Property.

### Pages Created
- investment-dashboard.html + css + js — KPIs, allocation bars, performance SVG, pipeline summary, risk alerts, property contribution
- investment-assets.html — investment equivalent of Property Register, with property link, fund/portfolio filters, drawer with Overview/Financials/Operational Property/Documents/Audit
- asset-allocation.html — target/min/max/current/drift/status, bar visualization, rebalancing recommendations
- investment-pipeline.html — Kanban drag-drop across 8 stages (Origination → Monitoring), cards with amount/return/risk/owner
- investment-appraisals.html — company profile, financial statements, liquidity/leverage/profitability/efficiency/valuation ratios auto-calculated, NPV/IRR/DCF calculator with scenarios Base/Upside/Downside, sensitivity table
- reports.html — operational property portfolio report for property count, units, occupancy, valuation, rent, and status; does not include investment assets
- documents.html — searchable enterprise document register with metadata edits, file uploads/downloads, and property/investment/lease/tenant links
- approvals.html, conditions-precedent.html, fixed-income.html, listed-equities.html, unlisted-investments.html, collective-investments.html, investment-cash.html, investment-risk.html, investment-compliance.html, investment-performance.html, investment-reports.html, audit-trail.html — generic functional foundation with filters, KPIs, drawer, export.

### Calculation Layer
`js/investment-calculations.js` reusable helpers:
- calculatePropertyNOI(propertyId), calculatePropertyYield(propertyId)
- calculatePortfolioValue(portfolioId), calculateFundValue(fundId)
- calculateAssetAllocation(fundId), calculateAllocationDrift
- calculateNPV, calculateIRR (Newton-Raphson), calculateDCF, calculateTWRR, calculateMWRR, sensitivityTable, getPropertyInvestmentSummary, addAuditEvent, formatCurrency, formatCurrencyZMW

The default currency is configurable in Enterprise → System Settings. Supported defaults include ZMW, NGN, USD, EUR, GBP, ZAR, KES, GHS, and TZS. Currency selection controls default currency formatting; it does not perform foreign-exchange conversion on existing amounts.

### Mock Data
- Funds: Accident Fund, Pension Fund
- Property assets: 8 linked to existing properties (Zambezi Mall etc.) with acquisitionCost, currentValue, rentalIncome, operatingCosts, noi, yield, occupancy, capEx
- Fixed Income: GRZ Bonds, T-Bills, ZANACO, CEC
- Listed Equities: ZANACO, CEC, ZAMBREW, BATZ with qty, avgCost, currentPrice, marketValue
- Unlisted/SPV: Lusaka Logistics, Ndola Industrial, Kabwe PPP
- Collective: African Real Estate Fund, Zambia Balanced Fund
- Cash: 4 accounts across funds
- Deals: 8 deals across pipeline stages
- Appraisals: 3 with revenue/EBITDA/EBIT/NetIncome/Assets/Liabilities/Equity
- Approvals: Maker→Checker→MIC→FIC→Board workflow
- Conditions Precedent, Risk, Compliance, Performance, Transactions, Valuations, Documents, Audit Trail

### How to Add New Pages
1. Add entry to NAV_CONFIG in js/layout.js: {id, section, label, file, icon, badge}
2. Create pages/page.html following existing structure:
```
<div class="app"><div id="app-sidebar"></div><div class="main"><div id="app-topbar"></div><div id="app-breadcrumb"></div><main class="content">...</main></div></div>
<script src="../js/common.js"></script><script src="../js/investment-calculations.js"></script><script src="../js/layout.js"></script><script src="../js/pages/page.js"></script><script>Layout.init({currentPage:'page-id'})</script>
```
3. Create css/pages/page.css and js/pages/page.js using existing patterns.

### Testing Checklist (per spec)
- Navigation: sidebar opens page, active item works, breadcrumb works, back links work
- Data: mock data renders, localStorage works, empty state works, filters work, search works
- Interaction: buttons, drawers, modals, tabs, forms validate, save updates state
- Integration: Property→Investment, Investment→Property, financial data feeds calculations, investment references correct property
- Responsive: desktop, tablet, mobile (tables scroll, KPIs stack, kanban scrolls, drawers full-screen)

### Run
Open index.html (Property Dashboard) and investment-dashboard.html — no build system required.

### Design System
Uses existing CSS variables: --bg, --surface, --surface-2, --border, --text, --muted, --blue, --green, --red, --amber. Existing sidebar/topbar/cards/tables/pills/drawers/modals responsive behavior preserved.

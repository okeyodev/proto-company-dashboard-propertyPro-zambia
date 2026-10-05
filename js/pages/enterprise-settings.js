/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/enterprise-settings.js
 * ToR 9.4 — System Settings
 * ============================================================================
 * - Side-tabbed interface: General, Integrations, Notifications, Security
 * - General: Company Name, Default Currency, Timezone
 * - Integrations: Status cards ZRA Smart Invoice API, ERPNext Accounting, USSD Gateway + Connect/Disconnect
 * - Security: Toggle Enable AI Arrears Prediction (On-Premise)
 * - Form handlers update state.settings, toast, saveState()
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCommon === "function") initCommon("enterprise-settings");

  const getState = () => window.state || {};
  const save = () => { if (window.saveState) window.saveState(); };
  const esc = (s) => { if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); };

  function ensureSettings() {
    const st = getState();
    if (!st.settings) {
      if (typeof generateEnterpriseMockData === 'function' && st.properties) {
        const em = generateEnterpriseMockData(st.properties, st.tenants, st.units);
        st.settings = em.settings;
        save();
      } else {
        st.settings = {
          company: { name: "PropertyPro Zambia Ltd", tradingName: "PropertyPro Zambia", tpin: "1234567890", vatNo: "VAT-001234", address: "Plot 1234, Cairo Road, Lusaka, Zambia", phone: "+260 211 123456", email: "info@propertypro.zm" },
          finance: { currency: "ZMW", defaultCurrency: "ZMW", fiscalYearStart: "01-01", vatRate: 16, withholdingTax: 10 },
          system: { timezone: "Africa/Lusaka", dateFormat: "YYYY-MM-DD", version: "3.2", build: "2026.10.04", environment: "Production", lastBackup: new Date().toISOString() },
          enterprise: { approvalsRequired: true, sessionTimeoutMinutes: 30, maxLoginAttempts: 5, passwordExpiryDays: 90, auditRetentionDays: 365, twoFactorEnabled: false },
          notifications: { channels: ["In-App","Email","SMS"], emailFrom: "noreply@propertypro.zm", smsSenderId: "PropertyPro", rentReminderDays: [7,3,1], arrearsEscalation: [30,60,90], maintenanceAlerts: true, leaseExpiryAlerts: true },
          integrations: {
            zra: { name: "ZRA Smart Invoice API", status: "Connected", connected: true, lastSync: new Date().toISOString(), env: "Production", endpoint: "https://api.zra.gov.zm/smart-invoice/v2" },
            erpnext: { name: "ERPNext Accounting", status: "Connected", connected: true, lastSync: new Date(Date.now()-2*3600*1000).toISOString(), endpoint: "https://erp.propertypro.zm/api" },
            ussd: { name: "USSD Gateway", status: "Disconnected", connected: false, lastSync: null, endpoint: "*123# - Zamtel / MTN / Airtel" }
          },
          ai: { arrearsPrediction: true, arrearsModel: "v2.3-ZM", arrearsOnPremise: true, valuationAssist: false }
        };
      }
    }
    // Ensure nested objects exist
    if (!st.settings.company) st.settings.company = {};
    if (!st.settings.finance) st.settings.finance = {};
    if (!st.settings.system) st.settings.system = {};
    if (!st.settings.enterprise) st.settings.enterprise = {};
    if (!st.settings.notifications) st.settings.notifications = {};
    if (!st.settings.integrations) st.settings.integrations = {};
    if (!st.settings.ai) st.settings.ai = { arrearsPrediction: true };

    // Ensure integrations have required keys
    if (!st.settings.integrations.zra) st.settings.integrations.zra = { name: "ZRA Smart Invoice API", status: "Disconnected", connected: false, endpoint: "https://api.zra.gov.zm/smart-invoice/v2" };
    if (!st.settings.integrations.erpnext) st.settings.integrations.erpnext = { name: "ERPNext Accounting", status: "Disconnected", connected: false, endpoint: "https://erp.propertypro.zm/api" };
    if (!st.settings.integrations.ussd) st.settings.integrations.ussd = { name: "USSD Gateway", status: "Disconnected", connected: false, endpoint: "*123# - Zamtel / MTN / Airtel" };

    // Ensure defaults
    if (!st.settings.finance.defaultCurrency) st.settings.finance.defaultCurrency = st.settings.finance.currency || "ZMW";
    if (!st.settings.finance.currency) st.settings.finance.currency = "ZMW";
    if (!st.settings.system.timezone) st.settings.system.timezone = "Africa/Lusaka";
  }
  ensureSettings();

  const tabs = document.querySelectorAll('.settings-tab');
  const panels = document.querySelectorAll('.tab-panel');

  const gCompanyName = document.getElementById('gCompanyName');
  const gTradingName = document.getElementById('gTradingName');
  const gTPIN = document.getElementById('gTPIN');
  const gVAT = document.getElementById('gVAT');
  const gAddress = document.getElementById('gAddress');
  const gPhone = document.getElementById('gPhone');
  const gEmail = document.getElementById('gEmail');
  const gCurrency = document.getElementById('gCurrency');
  const gTimezone = document.getElementById('gTimezone');
  const gDateFormat = document.getElementById('gDateFormat');
  const gFiscalYear = document.getElementById('gFiscalYear');
  const gVATRate = document.getElementById('gVATRate');
  const gWHT = document.getElementById('gWHT');

  const nRentReminders = document.getElementById('nRentReminders');
  const nArrearsEsc = document.getElementById('nArrearsEsc');
  const nEmailFrom = document.getElementById('nEmailFrom');
  const nSMSSender = document.getElementById('nSMSSender');

  const secAIArrears = document.getElementById('secAIArrears');
  const secTimeout = document.getElementById('secTimeout');
  const secMaxAttempts = document.getElementById('secMaxAttempts');
  const secPwdExpiry = document.getElementById('secPwdExpiry');
  const secAuditRetention = document.getElementById('secAuditRetention');

  const buildInfo = document.getElementById('buildInfo');
  const lastBackup = document.getElementById('lastBackup');
  const integrationGrid = document.getElementById('integrationGrid');
  const integrationLogs = document.getElementById('integrationLogs');
  const notificationChannels = document.getElementById('notificationChannels');
  const securityToggles = document.getElementById('securityToggles');

  function switchTab(tabId) {
    tabs.forEach(t=> { t.classList.toggle('active', t.dataset.tab===tabId); });
    panels.forEach(p=> { p.classList.toggle('active', p.id===`panel-${tabId}`); });
  }

  function bindTabSwitching() {
    tabs.forEach(tab=>{
      tab.addEventListener('click', ()=> switchTab(tab.dataset.tab));
    });
  }

  function loadSettingsToForm() {
    const s = getState().settings;
    if (gCompanyName) gCompanyName.value = s.company?.name || '';
    if (gTradingName) gTradingName.value = s.company?.tradingName || '';
    if (gTPIN) gTPIN.value = s.company?.tpin || '';
    if (gVAT) gVAT.value = s.company?.vatNo || s.company?.vat || '';
    if (gAddress) gAddress.value = s.company?.address || '';
    if (gPhone) gPhone.value = s.company?.phone || '';
    if (gEmail) gEmail.value = s.company?.email || '';
    if (gCurrency) gCurrency.value = s.finance?.defaultCurrency || s.finance?.currency || 'ZMW';
    if (gTimezone) gTimezone.value = s.system?.timezone || 'Africa/Lusaka';
    if (gDateFormat) gDateFormat.value = s.system?.dateFormat || 'YYYY-MM-DD';
    if (gFiscalYear) gFiscalYear.value = s.finance?.fiscalYearStart || '01-01';
    if (gVATRate) gVATRate.value = s.finance?.vatRate ?? 16;
    if (gWHT) gWHT.value = s.finance?.withholdingTax ?? 10;

    if (nRentReminders) nRentReminders.value = (s.notifications?.rentReminderDays||[7,3,1]).join(',');
    if (nArrearsEsc) nArrearsEsc.value = (s.notifications?.arrearsEscalation||[30,60,90]).join(',');
    if (nEmailFrom) nEmailFrom.value = s.notifications?.emailFrom || 'noreply@propertypro.zm';
    if (nSMSSender) nSMSSender.value = s.notifications?.smsSenderId || 'PropertyPro';

    if (secAIArrears) secAIArrears.checked = !!(s.ai?.arrearsPrediction ?? s.enterprise?.aiArrearsPrediction ?? true);
    if (secTimeout) secTimeout.value = s.enterprise?.sessionTimeoutMinutes || 30;
    if (secMaxAttempts) secMaxAttempts.value = s.enterprise?.maxLoginAttempts || 5;
    if (secPwdExpiry) secPwdExpiry.value = s.enterprise?.passwordExpiryDays || 90;
    if (secAuditRetention) secAuditRetention.value = s.enterprise?.auditRetentionDays || 365;

    if (buildInfo) buildInfo.textContent = s.system?.build || '2026.10.04';
    if (lastBackup) {
      try{ lastBackup.textContent = new Date(s.system?.lastBackup||Date.now()).toLocaleString('en-ZM'); }catch(e){ lastBackup.textContent = s.system?.lastBackup||'-'; }
    }
  }

  function renderIntegrations() {
    const s = getState().settings;
    const ints = [
      { key: 'zra', icon: '🧾', title: 'ZRA Smart Invoice API', desc: 'Zambia Revenue Authority Smart Invoice v2 — compliant fiscal invoicing, TPIN validation, VAT reporting. Required for all rent invoices.', meta: s.integrations?.zra },
      { key: 'erpnext', icon: '📊', title: 'ERPNext Accounting', desc: 'Accounting sync for chart of accounts, GL postings, bank reconciliation, financial reports. Bi-directional sync.', meta: s.integrations?.erpnext },
      { key: 'ussd', icon: '📱', title: 'USSD Gateway', desc: 'USSD *123# tenant self-service: balance inquiry, payment confirmation, maintenance logging via Zamtel/MTN/Airtel.', meta: s.integrations?.ussd }
    ];

    if (!integrationGrid) return;
    integrationGrid.innerHTML = ints.map(it=>{
      const m = it.meta||{};
      const connected = !!m.connected;
      const status = m.status || (connected?'Connected':'Disconnected');
      const dotClass = connected? 'green' : 'red';
      const cardClass = connected? 'connected' : 'disconnected';
      const lastSync = m.lastSync ? (()=>{ try{ return new Date(m.lastSync).toLocaleString('en-ZM'); }catch(e){ return m.lastSync; } })() : 'Never';
      return `
        <div class="integration-card ${cardClass}" data-key="${it.key}">
          <div class="integration-head">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="width:36px;height:36px;border-radius:9px;background:var(--surface-2);border:1px solid var(--border);display:grid;place-items:center;font-size:18px">${it.icon}</div>
              <div><div style="font-weight:700;font-size:13px">${esc(it.title)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(it.desc)}</div></div>
            </div>
            <div class="integration-status"><span class="status-dot ${dotClass}"></span>${esc(status)}</div>
          </div>
          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:8px;font-size:11.5px;line-height:1.4">
            <div><strong>Endpoint:</strong> ${esc(m.endpoint||'—')}</div>
            <div><strong>Env:</strong> ${esc(m.env|| m.environment || 'Production')}</div>
            <div><strong>Last Sync:</strong> ${esc(lastSync)}</div>
            ${it.key==='zra'? `<div style="margin-top:6px;display:flex;gap:4px"><span class="pill" style="background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0;font-size:10px">ZRA Compliant</span><span class="pill" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;font-size:10px">Fiscal</span></div>` : ''}
            ${it.key==='ussd'? `<div style="margin-top:6px;display:flex;gap:4px"><span class="pill" style="background:#FFFBEB;color:#92400E;border:1px solid #FDE68A;font-size:10px">*123#</span><span class="pill" style="background:#F5F3FF;color:#6D28D9;border:1px solid #DDD6FE;font-size:10px">Multi-telco</span></div>` : ''}
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm ${connected?'':'btn-primary'}" data-action="${connected?'disconnect':'connect'}" data-key="${it.key}" style="flex:1">${connected?'Disconnect':'Connect'}</button>
            <button class="btn btn-sm" data-action="test" data-key="${it.key}">Test</button>
            <button class="btn btn-sm btn-ghost" data-action="logs" data-key="${it.key}">Logs</button>
          </div>
        </div>
      `;
    }).join('');

    integrationGrid.querySelectorAll('button[data-action]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.key;
        const action = btn.dataset.action;
        handleIntegrationAction(key, action);
      });
    });

    renderIntegrationLogs();
  }

  function renderIntegrationLogs() {
    if (!integrationLogs) return;
    const s = getState().settings;
    const logs = [
      `[${new Date().toISOString()}] ZRA Smart Invoice API — ${s.integrations?.zra?.connected?'200 OK — Invoice INV-P-001 submitted, QR generated':'DISCONNECTED — awaiting credentials'}`,
      `[${new Date(Date.now()-3600*1000).toISOString()}] ERPNext — Sync ${s.integrations?.erpnext?.connected?'completed: 24 GL entries, 3 payments reconciled':'failed: auth timeout'}`,
      `[${new Date(Date.now()-7200*1000).toISOString()}] USSD Gateway — ${s.integrations?.ussd?.connected?'Session USSD-12345: balance inquiry T-1042 OK':'No active sessions — gateway disconnected'}`,
      `[${new Date(Date.now()-10800*1000).toISOString()}] System — Backup completed to Lusaka DC`,
      `[${new Date(Date.now()-86400*1000).toISOString()}] Audit — Settings updated by Chanda Mwanza`
    ];
    integrationLogs.innerHTML = logs.map(l=> `<div>${esc(l)}</div>`).join('');
  }

  function handleIntegrationAction(key, action) {
    const s = getState().settings;
    const integration = s.integrations[key];
    if (!integration) return;

    if (action==='connect') {
      integration.connected = true;
      integration.status = 'Connected';
      integration.lastSync = new Date().toISOString();
      save();
      if (window.toast) toast(`${integration.name} connected successfully`,'success');
      if (typeof addAuditEvent==='function') addAuditEvent('CONNECT','integration',key,`Connected ${integration.name}`);
      renderIntegrations();
    } else if (action==='disconnect') {
      if (!confirm(`Disconnect ${integration.name}? This will pause invoice sync / USSD services.`)) return;
      integration.connected = false;
      integration.status = 'Disconnected';
      save();
      if (window.toast) toast(`${integration.name} disconnected`,'error');
      if (typeof addAuditEvent==='function') addAuditEvent('DISCONNECT','integration',key,`Disconnected ${integration.name}`);
      renderIntegrations();
    } else if (action==='test') {
      if (window.toast) toast(`Testing ${integration.name}...`,'info');
      setTimeout(()=>{
        const ok = integration.connected || Math.random()>0.3;
        if (window.toast) toast(`${integration.name} test ${ok?'PASSED — 120ms latency':'FAILED — check endpoint / credentials'}`, ok?'success':'error');
        const logLine = `[${new Date().toISOString()}] TEST ${integration.name} — ${ok?'OK':'FAIL'}`;
        if (integrationLogs) integrationLogs.innerHTML = `<div>${esc(logLine)}</div>` + integrationLogs.innerHTML;
      }, 800);
    } else if (action==='logs') {
      switchTab('integrations');
      document.getElementById('integrationLogs')?.scrollIntoView({behavior:'smooth'});
    }
  }

  function renderNotificationToggles() {
    const s = getState().settings;
    if (!notificationChannels) return;
    const channels = [
      { id: 'inapp', label: 'In-App Portal Notifications', desc: 'Browser & portal bell alerts for leases, payments, maintenance' },
      { id: 'email', label: 'Email Notifications', desc: `From ${s.notifications?.emailFrom||'noreply@propertypro.zm'} — rent reminders, arrears, approvals` },
      { id: 'sms', label: 'SMS Notifications', desc: `Sender ID ${s.notifications?.smsSenderId||'PropertyPro'} — USSD fallback, OTP, critical alerts` }
    ];
    const enabledChannels = s.notifications?.channels||["In-App","Email","SMS"];
    notificationChannels.innerHTML = channels.map(ch=>{
      const enabled = enabledChannels.some(c=> c.toLowerCase().includes(ch.id) || (ch.id==='inapp'&&c.toLowerCase().includes('in-app')) );
      return `
        <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F1F5F9;gap:16px">
          <div><div style="font-weight:600;font-size:13px">${esc(ch.label)}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(ch.desc)}</div></div>
          <label class="toggle"><input type="checkbox" data-channel="${ch.id}" ${enabled?'checked':''} /><span class="toggle-slider"></span></label>
        </div>
      `;
    }).join('') + `
      <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:16px">
        <div><div style="font-weight:600;font-size:13px">Maintenance Alerts</div><div style="font-size:12px;color:var(--muted);margin-top:2px">Auto-notify tenants & contractors on SLA breach, work order updates</div></div>
        <label class="toggle"><input type="checkbox" id="nMaintAlerts" ${s.notifications?.maintenanceAlerts?'checked':''} /><span class="toggle-slider"></span></label>
      </div>
      <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;gap:16px">
        <div><div style="font-weight:600;font-size:13px">Lease Expiry Alerts</div><div style="font-size:12px;color:var(--muted);margin-top:2px">90/60/30 days before expiry — Maker-Checker escalation</div></div>
        <label class="toggle"><input type="checkbox" id="nLeaseExpiry" ${s.notifications?.leaseExpiryAlerts?'checked':''} /><span class="toggle-slider"></span></label>
      </div>
    `;

    notificationChannels.querySelectorAll('input[data-channel]').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        const chId = cb.dataset.channel;
        let chans = getState().settings.notifications.channels||[];
        const map = { inapp:'In-App', email:'Email', sms:'SMS' };
        const name = map[chId]||chId;
        if (cb.checked) { if (!chans.includes(name)) chans.push(name); }
        else { chans = chans.filter(c=> c!==name); }
        getState().settings.notifications.channels = chans;
        save();
        if (window.toast) toast(`${name} ${cb.checked?'enabled':'disabled'}`,'success');
      });
    });
    document.getElementById('nMaintAlerts')?.addEventListener('change', e=>{ getState().settings.notifications.maintenanceAlerts = e.target.checked; save(); if(window.toast) toast(`Maintenance alerts ${e.target.checked?'enabled':'disabled'}`,'success'); });
    document.getElementById('nLeaseExpiry')?.addEventListener('change', e=>{ getState().settings.notifications.leaseExpiryAlerts = e.target.checked; save(); if(window.toast) toast(`Lease expiry alerts ${e.target.checked?'enabled':'disabled'}`,'success'); });
  }

  function renderSecurityExtras() {
    const s = getState().settings;
    const container = document.getElementById('securityToggles');
    if (!container) return;
    // Already has AI Arrears row in HTML, append others after it
    const existing = container.innerHTML; // contains AI row
    const extras = [
      { id: 'sec2FA', label: 'Enable Two-Factor Authentication (2FA)', desc: 'Require TOTP for Admin, Portfolio Manager, MIC Member. SMS fallback via USSD Gateway.', checked: !!s.enterprise?.twoFactorEnabled },
      { id: 'secApprovals', label: 'Enforce Maker-Checker Approvals', desc: 'All financial transactions > threshold require Checker. Maker cannot approve own work.', checked: !!s.enterprise?.approvalsRequired },
      { id: 'secAudit', label: 'Extended Audit Retention', desc: `Retain audit logs for ${s.enterprise?.auditRetentionDays||365} days. ZRA requires min 365 days.`, checked: (s.enterprise?.auditRetentionDays||0)>=365 },
      { id: 'secValAssist', label: 'AI Valuation Assist (On-Premise)', desc: 'Assistive cap rate suggestions from on-prem model. Requires MIC approval to apply.', checked: !!s.ai?.valuationAssist }
    ];
    // Append after first row
    const extraHTML = extras.map(ex=>`
      <div class="settings-row" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F1F5F9;gap:16px">
        <div><div style="font-weight:600;font-size:13px">${esc(ex.label)}</div><div style="font-size:12px;color:var(--muted);margin-top:2px">${esc(ex.desc)}</div></div>
        <label class="toggle"><input type="checkbox" id="${ex.id}" ${ex.checked?'checked':''} /><span class="toggle-slider"></span></label>
      </div>
    `).join('');
    container.innerHTML = existing + extraHTML;

    document.getElementById('sec2FA')?.addEventListener('change', e=>{
      s.enterprise.twoFactorEnabled = e.target.checked;
      save();
      if(window.toast) toast(`2FA ${e.target.checked?'enabled':'disabled'} — Maker-Checker enforced`,'success');
      if(typeof addAuditEvent==='function') addAuditEvent('SECURITY_UPDATE','settings','2FA',`2FA ${e.target.checked?'enabled':'disabled'}`);
    });
    document.getElementById('secApprovals')?.addEventListener('change', e=>{
      s.enterprise.approvalsRequired = e.target.checked;
      save();
      if(window.toast) toast(`Maker-Checker ${e.target.checked?'enforced':'relaxed'}`,'success');
    });
    document.getElementById('secAudit')?.addEventListener('change', e=>{
      if(e.target.checked) s.enterprise.auditRetentionDays = Math.max(s.enterprise.auditRetentionDays||365,365);
      save();
    });
    document.getElementById('secValAssist')?.addEventListener('change', e=>{
      s.ai.valuationAssist = e.target.checked;
      save();
      if(window.toast) toast(`AI Valuation Assist ${e.target.checked?'enabled (on-premise)':'disabled'}`,'success');
    });
  }

  // Form handlers to update state.settings, toast, persist via saveState()
  function handleSaveGeneral() {
    const s = getState().settings;
    const before = JSON.parse(JSON.stringify(s.company));
    s.company.name = gCompanyName?.value.trim() || s.company.name;
    s.company.tradingName = gTradingName?.value.trim() || s.company.tradingName;
    s.company.tpin = gTPIN?.value.trim() || s.company.tpin;
    s.company.vatNo = gVAT?.value.trim() || s.company.vatNo;
    s.company.address = gAddress?.value.trim() || s.company.address;
    s.company.phone = gPhone?.value.trim() || s.company.phone;
    s.company.email = gEmail?.value.trim() || s.company.email;

    s.finance.defaultCurrency = gCurrency?.value || 'ZMW';
    s.finance.currency = gCurrency?.value || 'ZMW';
    s.system.timezone = gTimezone?.value || 'Africa/Lusaka';
    s.system.dateFormat = gDateFormat?.value || 'YYYY-MM-DD';
    s.finance.fiscalYearStart = gFiscalYear?.value || '01-01';
    s.finance.vatRate = parseFloat(gVATRate?.value) || 16;
    s.finance.withholdingTax = parseFloat(gWHT?.value) || 10;

    save();
    if (typeof addAuditEvent==='function') addAuditEvent('UPDATE','settings','company',`General settings updated: Company ${s.company.name}, Currency ${s.finance.currency}, TZ ${s.system.timezone}`, before, s.company);
    if (window.toast) toast(`General settings saved • Company, Currency ${s.finance.currency}, Timezone updated`,'success');
  }

  function handleSaveNotifications() {
    const s = getState().settings;
    const rentDays = (nRentReminders?.value||'7,3,1').split(',').map(v=> parseInt(v.trim(),10)).filter(n=>!isNaN(n));
    const escDays = (nArrearsEsc?.value||'30,60,90').split(',').map(v=> parseInt(v.trim(),10)).filter(n=>!isNaN(n));
    s.notifications.rentReminderDays = rentDays.length? rentDays : [7,3,1];
    s.notifications.arrearsEscalation = escDays.length? escDays : [30,60,90];
    s.notifications.emailFrom = nEmailFrom?.value.trim() || 'noreply@propertypro.zm';
    s.notifications.smsSenderId = nSMSSender?.value.trim() || 'PropertyPro';
    save();
    if (typeof addAuditEvent==='function') addAuditEvent('UPDATE','settings','notifications',`Notifications updated: Rent ${rentDays.join(',')}, Arrears ${escDays.join(',')}`);
    if (window.toast) toast('Notification settings saved','success');
  }

  function handleSaveSecurity() {
    const s = getState().settings;
    s.ai = s.ai||{};
    s.ai.arrearsPrediction = !!secAIArrears?.checked;
    s.ai.arrearsOnPremise = true;
    s.ai.arrearsModel = 'v2.3-ZM';
    s.enterprise.sessionTimeoutMinutes = parseInt(secTimeout?.value,10) || 30;
    s.enterprise.maxLoginAttempts = parseInt(secMaxAttempts?.value,10) || 5;
    s.enterprise.passwordExpiryDays = parseInt(secPwdExpiry?.value,10) || 90;
    s.enterprise.auditRetentionDays = parseInt(secAuditRetention?.value,10) || 365;

    // Also sync enterprise.aiArrearsPrediction for legacy
    s.enterprise.aiArrearsPrediction = s.ai.arrearsPrediction;

    save();
    if (typeof addAuditEvent==='function') addAuditEvent('SECURITY_UPDATE','settings','security',`Security updated: AI Arrears ${s.ai.arrearsPrediction?'ON':'OFF'} (On-Premise), Timeout ${s.enterprise.sessionTimeoutMinutes}m`);
    if (window.toast) toast(`Security settings saved • AI Arrears Prediction ${s.ai.arrearsPrediction?'Enabled (On-Premise)':'Disabled'} • Maker-Checker enforced`,'success');
  }

  function handleSaveIntegrations() {
    save();
    if (window.toast) toast('Integration settings saved • ZRA / ERPNext / USSD Gateway status persisted','success');
    if (typeof addAuditEvent==='function') addAuditEvent('UPDATE','settings','integrations','Integrations saved');
  }

  function handleSaveAll() {
    handleSaveGeneral();
    handleSaveNotifications();
    handleSaveSecurity();
    handleSaveIntegrations();
    if (window.toast) toast('All settings saved • Company, Currency, Timezone, Integrations, Security (AI On-Premise)','success');
  }

  function bindFormHandlers() {
    document.getElementById('btnSaveGeneral')?.addEventListener('click', handleSaveGeneral);
    document.getElementById('btnCancelGeneral')?.addEventListener('click', loadSettingsToForm);
    document.getElementById('btnSaveNotifications')?.addEventListener('click', handleSaveNotifications);
    document.getElementById('btnCancelNotifications')?.addEventListener('click', loadSettingsToForm);
    document.getElementById('btnSaveSecurity')?.addEventListener('click', handleSaveSecurity);
    document.getElementById('btnCancelSecurity')?.addEventListener('click', loadSettingsToForm);
    document.getElementById('btnSaveIntegrations')?.addEventListener('click', handleSaveIntegrations);
    document.getElementById('btnSaveAll')?.addEventListener('click', handleSaveAll);
    document.getElementById('btnResetSettings')?.addEventListener('click', ()=>{
      if (!confirm('Reset all settings to defaults? This will clear custom company name, currency, timezone, and integration status.')) return;
      localStorage.removeItem('propertypro_v3');
      location.reload();
    });
    document.getElementById('btnTestAllIntegrations')?.addEventListener('click', ()=>{
      if (window.toast) toast('Testing all integrations...','info');
      ['zra','erpnext','ussd'].forEach((k,i)=>{
        setTimeout(()=> handleIntegrationAction(k,'test'), i*600);
      });
    });

    // Security toggle direct handler for AI Arrears Prediction (On-Premise)
    secAIArrears?.addEventListener('change', (e)=>{
      const s = getState().settings;
      s.ai = s.ai||{};
      s.ai.arrearsPrediction = e.target.checked;
      s.ai.arrearsOnPremise = true;
      save();
      if (window.toast) toast(`AI Arrears Prediction ${e.target.checked?'Enabled (On-Premise) • Model v2.3-ZM':'Disabled'} • Data residency Lusaka DC`,'success');
      if (typeof addAuditEvent==='function') addAuditEvent('SECURITY_UPDATE','settings','ai_arrears',`AI Arrears Prediction ${e.target.checked?'enabled':'disabled'} on-premise`);
    });

    // Auto-save on currency/timezone change with toast
    gCurrency?.addEventListener('change', ()=>{
      getState().settings.finance.defaultCurrency = gCurrency.value;
      getState().settings.finance.currency = gCurrency.value;
      save();
      if (window.toast) toast(`Default Currency set to ${gCurrency.value}`,'success');
    });
    gTimezone?.addEventListener('change', ()=>{
      getState().settings.system.timezone = gTimezone.value;
      save();
      if (window.toast) toast(`Timezone set to ${gTimezone.value}`,'success');
    });
  }

  bindTabSwitching();
  loadSettingsToForm();
  renderIntegrations();
  renderNotificationToggles();
  renderSecurityExtras();
  bindFormHandlers();

  console.log('[Enterprise Settings] ToR 9.4 loaded - Currency', getState().settings.finance.currency, 'TZ', getState().settings.system.timezone, 'AI Arrears', getState().settings.ai?.arrearsPrediction);
});

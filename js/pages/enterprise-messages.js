/**
 * ============================================================================
 * PropertyPro Zambia Ltd - js/pages/enterprise-messages.js
 * ToR 9.1 — Messages & Inbox (Enterprise v3.2)
 * ============================================================================
 * Features:
 * - Split-pane inbox: left thread list, right reading pane + reply
 * - Channel pills: Portal / USSD / Email / SMS (inline SVG mapping)
 * - Unread dot, sender (tenant/contractor), snippet
 * - Thread grouping by threadId, latest-first rendering
 * - Send Reply handler pushing to window.state.messages and saveState()
 */

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCommon === "function") initCommon("enterprise-messages");

  const getState = () => window.state || {};
  const save = () => { if (window.saveState) window.saveState(); };

  function ensureMessages() {
    const st = getState();
    if (!st.messages || st.messages.length === 0) {
      if (typeof generateEnterpriseMockData === 'function' && st.properties) {
        const em = generateEnterpriseMockData(st.properties, st.tenants, st.units);
        st.messages = em.messages;
        if (!st.notices) st.notices = em.notices;
        if (!st.users) st.users = em.users;
        if (!st.settings) st.settings = em.settings;
        save();
      }
    }
    // Normalize channel names to required Portal/USSD/Email/SMS
    (st.messages||[]).forEach(m => {
      const ch = (m.channel||'').toLowerCase();
      if (ch.includes('in-app') || ch.includes('portal') || ch.includes('inapp')) m.channel = 'Portal';
      else if (ch.includes('ussd')) m.channel = 'USSD';
      else if (ch.includes('email')) m.channel = 'Email';
      else if (ch.includes('sms') || ch.includes('momo') || ch.includes('mobile')) m.channel = 'SMS';
      else if (!['Portal','USSD','Email','SMS'].includes(m.channel)) {
        // Map legacy: keep Portal as default
        const map = ['Portal','Email','USSD','SMS'];
        m.channel = map[Math.floor(Math.random()*map.length)];
      }
      // Ensure snippet
      if (!m.snippet && m.body) m.snippet = m.body.slice(0,80);
      // Ensure contractor vs tenant labeling
      if (!m.senderType) m.senderType = Math.random()>0.2 ? 'Tenant' : 'Contractor';
    });
  }
  ensureMessages();

  const threadListEl = document.getElementById('threadList');
  const readingEmpty = document.getElementById('readingEmpty');
  const readingActive = document.getElementById('readingActive');
  const threadHistory = document.getElementById('threadHistory');
  const readingSubject = document.getElementById('readingSubject');
  const readingSubtitle = document.getElementById('readingSubtitle');
  const searchInput = document.getElementById('searchInputLocal');
  const sortSelect = document.getElementById('sortSelect');
  const threadCount = document.getElementById('threadCount');
  const kpiGrid = document.getElementById('kpiGrid');

  const replyText = document.getElementById('replyText');
  const replyChannel = document.getElementById('replyChannel');
  const replyChannelPill = document.getElementById('replyChannelPill');
  const btnSendReply = document.getElementById('btnSendReply');

  let activeThreadId = null;
  let activeFilter = 'all';
  let searchQuery = '';

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function groupThreads() {
    const st = getState();
    const msgs = st.messages||[];
    const groups = {};
    msgs.forEach(m => {
      const tid = m.threadId || m.id;
      if (!groups[tid]) groups[tid] = [];
      groups[tid].push(m);
    });
    // Sort each thread by date asc
    Object.values(groups).forEach(arr => arr.sort((a,b)=> new Date(a.createdAt||a.timestamp||a.date) - new Date(b.createdAt||b.timestamp||b.date)));
    return groups;
  }

  function getThreadSummary(groups) {
    const summaries = [];
    Object.entries(groups).forEach(([tid, msgs]) => {
      const latest = msgs[msgs.length-1];
      const unreadCount = msgs.filter(m=> (m.status||'').toLowerCase()==='unread').length;
      summaries.push({
        threadId: tid,
        latest: latest,
        messages: msgs,
        unreadCount,
        participants: [...new Set(msgs.map(m=> m.sender))],
        propertyName: latest.propertyName||latest.property||'',
        sender: latest.sender||latest.tenantName||'Unknown',
        senderType: latest.senderType||'Tenant',
        channel: latest.channel||'Portal',
        date: latest.createdAt||latest.timestamp||latest.date,
        subject: latest.subject||msgs[0].subject||'No subject',
        snippet: latest.body? latest.body.slice(0,90) : latest.preview||'',
        isUnread: unreadCount>0
      });
    });
    return summaries;
  }

  function renderKPIs(summaries) {
    if (!kpiGrid) return;
    const totalThreads = summaries.length;
    const unreadThreads = summaries.filter(s=> s.isUnread).length;
    const portal = summaries.filter(s=> s.channel==='Portal').length;
    const ussd = summaries.filter(s=> s.channel==='USSD').length;
    const email = summaries.filter(s=> s.channel==='Email').length;
    const sms = summaries.filter(s=> s.channel==='SMS').length;
    const totalMsgs = (getState().messages||[]).length;

    kpiGrid.innerHTML = `
      <div class="kpi accent-blue"><div class="kpi-top"><div class="kpi-label">Total Threads</div><div class="kpi-icon blue">✉️</div></div><div class="kpi-value">${totalThreads}</div><div class="kpi-meta">${totalMsgs} messages • ${unreadThreads} unread</div></div>
      <div class="kpi accent-amber"><div class="kpi-top"><div class="kpi-label">Unread Inbox</div><div class="kpi-icon amber">🔔</div></div><div class="kpi-value">${unreadThreads}</div><div class="kpi-meta"><span class="pill portal">${portal} Portal</span> <span class="pill ussd">${ussd} USSD</span></div></div>
      <div class="kpi accent-green"><div class="kpi-top"><div class="kpi-label">Channels Mix</div><div class="kpi-icon green">📡</div></div><div class="kpi-value">Portal ${totalThreads? Math.round(portal/totalThreads*100):0}%</div><div class="kpi-meta"><span class="pill email">${email} Email</span> <span class="pill sms">${sms} SMS</span> • ${ussd} USSD</div></div>
      <div class="kpi accent-violet"><div class="kpi-top"><div class="kpi-label">Response SLA</div><div class="kpi-icon violet">⏱️</div></div><div class="kpi-value">&lt; 4h</div><div class="kpi-meta">Avg first response • Enterprise ToR 9.1</div></div>
    `;
  }

  function renderThreads() {
    const groups = groupThreads();
    let summaries = getThreadSummary(groups);

    // Filter by channel / unread
    if (activeFilter==='unread') summaries = summaries.filter(s=> s.isUnread);
    else if (['Portal','USSD','Email','SMS'].includes(activeFilter)) summaries = summaries.filter(s=> s.channel===activeFilter);

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      summaries = summaries.filter(s=>
        (s.sender||'').toLowerCase().includes(q) ||
        (s.subject||'').toLowerCase().includes(q) ||
        (s.snippet||'').toLowerCase().includes(q) ||
        (s.propertyName||'').toLowerCase().includes(q) ||
        (s.threadId||'').toLowerCase().includes(q)
      );
    }

    // Sort
    const sort = sortSelect?.value||'newest';
    if (sort==='newest') summaries.sort((a,b)=> new Date(b.date) - new Date(a.date));
    else if (sort==='oldest') summaries.sort((a,b)=> new Date(a.date) - new Date(b.date));
    else if (sort==='unread') summaries.sort((a,b)=> b.unreadCount - a.unreadCount);

    if (threadCount) threadCount.textContent = `${summaries.length} thread${summaries.length!==1?'s':''}`;
    renderKPIs(summaries);

    if (!threadListEl) return;
    if (summaries.length===0) {
      threadListEl.innerHTML = `<div class="reading-empty"><div><div style="font-size:24px;margin-bottom:8px">📭</div><div style="font-weight:700;color:var(--text)">No threads found</div><div style="font-size:12px">Try different filter or search</div></div></div>`;
      return;
    }

    threadListEl.innerHTML = summaries.map(s=>{
      const ch = s.channel||'Portal';
      const chClass = ch.toLowerCase(); // portal, ussd, email, sms
      const avatar = (s.sender||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const time = (()=>{ try{ const d=new Date(s.date); return d.toLocaleDateString('en-ZM',{month:'short',day:'2-digit'})+' '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }catch(e){ return s.date||''; } })();
      return `
        <div class="thread-item ${s.threadId===activeThreadId?'active':''} ${s.isUnread?'unread':''}" data-thread="${escapeHtml(s.threadId)}">
          <div class="thread-avatar">${escapeHtml(avatar)}</div>
          <div class="thread-main">
            <div class="thread-top">
              <div class="thread-sender">${escapeHtml(s.sender)} <span style="font-weight:400;color:var(--muted);font-size:11px">• ${escapeHtml(s.senderType||'Tenant')}</span></div>
              <div class="thread-time">${escapeHtml(time)}</div>
            </div>
            <div class="thread-subject">${s.isUnread?`<span class="unread-dot" style="display:inline-block;margin-right:6px;vertical-align:middle"></span>`:''}${escapeHtml(s.subject)}</div>
            <div class="thread-snippet">${escapeHtml(s.snippet)}</div>
            <div class="thread-meta">
              <span class="pill ${chClass}">${escapeHtml(ch)}</span>
              <span style="font-size:11px;color:var(--muted)">${escapeHtml(s.propertyName)}</span>
              ${s.unreadCount>1? `<span class="pill inapp">${s.unreadCount} unread</span>` : ''}
              ${s.isUnread? `<span class="unread-dot"></span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    threadListEl.querySelectorAll('.thread-item').forEach(el=>{
      el.addEventListener('click', ()=> openThread(el.dataset.thread));
    });
  }

  function openThread(threadId) {
    const groups = groupThreads();
    const msgs = groups[threadId];
    if (!msgs) return;
    activeThreadId = threadId;

    // Mark thread as read (mark all unread in thread as read)
    const st = getState();
    let changed=false;
    st.messages.forEach(m=>{
      if ((m.threadId||m.id)===threadId && (m.status||'').toLowerCase()==='unread') { m.status='Read'; changed=true; }
    });
    if (changed) save();

    // UI switch
    if (readingEmpty) readingEmpty.style.display='none';
    if (readingActive) { readingActive.style.display='flex'; }

    const latest = msgs[msgs.length-1];
    if (readingSubject) readingSubject.textContent = latest.subject||msgs[0].subject||'Thread';
    if (readingSubtitle) {
      const prop = latest.propertyName||latest.property||'';
      const ch = latest.channel||'Portal';
      const date = (()=>{ try{ return new Date(latest.createdAt||latest.date).toLocaleString('en-ZM'); }catch(e){ return latest.date||''; } })();
      readingSubtitle.innerHTML = `
        <span style="font-weight:600">${escapeHtml(latest.sender||'')}</span>
        <span>• ${escapeHtml(prop)}</span>
        <span class="pill ${ch.toLowerCase()}">${escapeHtml(ch)}</span>
        <span>${escapeHtml(date)}</span>
        <span>• ${msgs.length} messages</span>
      `;
    }

    if (threadHistory) {
      threadHistory.innerHTML = msgs.map(m=>{
        const isSystem = (m.senderType||'').toLowerCase().includes('system') || m.sender==='PropertyPro Support' || m.sender==='Chanda Mwanza';
        const bubbleClass = isSystem? 'system' : 'tenant';
        const ch = m.channel||'Portal';
        const meta = `${escapeHtml(m.sender||'')} • ${escapeHtml(ch)} • ${(()=>{ try{ return new Date(m.createdAt||m.date).toLocaleString('en-ZM',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }catch(e){ return m.date||''; } })()}`;
        return `
          <div class="msg-bubble ${bubbleClass}">
            <div class="msg-meta"><span>${meta}</span><span class="pill ${ch.toLowerCase()}" style="font-size:10px">${escapeHtml(ch)}</span></div>
            <div class="msg-body">${escapeHtml(m.body||m.preview||'')}</div>
          </div>
        `;
      }).join('');
      threadHistory.scrollTop = threadHistory.scrollHeight;
    }

    renderThreads();
  }

  function closeThread() {
    activeThreadId=null;
    if (readingEmpty) readingEmpty.style.display='grid';
    if (readingActive) readingActive.style.display='none';
    renderThreads();
  }

  // Send Reply handler - pushes new message to thread in window.state and saves
  function sendReply() {
    const text = (replyText?.value||'').trim();
    if (!text) { if(window.toast) toast('Type a reply first','error'); return; }
    if (!activeThreadId) { if(window.toast) toast('Select a thread first','error'); return; }

    const st = getState();
    const groups = groupThreads();
    const threadMsgs = groups[activeThreadId]||[];
    const context = threadMsgs.length? threadMsgs[threadMsgs.length-1] : { propertyId:'P-001', propertyName:'Zambezi Mall', tenantId:'T-1042', tenantName:'Tenant', subject:'Re: ' };
    const channel = replyChannel?.value||'Portal';

    const newMsg = {
      id: `MSG-${Date.now().toString().slice(-6)}-${String(st.messages.length+1).padStart(5,'0')}`,
      threadId: activeThreadId,
      propertyId: context.propertyId||'P-001',
      propertyName: context.propertyName||context.property||'Zambezi Mall',
      property: context.propertyName||context.property||'Zambezi Mall',
      tenantId: context.tenantId||'T-1042',
      tenantName: context.tenantName||context.tenant||'Tenant',
      tenant: context.tenantName||context.tenant||'Tenant',
      sender: 'Chanda Mwanza',
      senderType: 'System',
      recipient: context.tenantName||context.sender||'Tenant',
      recipientType: 'Tenant',
      subject: context.subject||`Re: ${activeThreadId}`,
      body: text,
      preview: text.slice(0,80),
      type: 'Reply',
      channel: channel,
      status: 'Read',
      isStarred: false,
      isArchived: false,
      attachmentCount: 0,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0,10),
      timestamp: new Date().toISOString()
    };

    st.messages.push(newMsg);
    save();

    if (replyText) replyText.value='';
    if (window.toast) toast(`Reply sent via ${channel} • Thread ${activeThreadId}`,'success');
    if (typeof addAuditEvent==='function') addAuditEvent('REPLY','message',newMsg.id,`Replied via ${channel} to ${activeThreadId}`);

    // Re-render active thread with new message
    openThread(activeThreadId);
  }

  // New Message Modal logic
  function populateNewMessageFilters() {
    const st = getState();
    const props = st.properties||[];
    const tenants = st.tenants||[];
    const nmProp = document.getElementById('nmProperty');
    const nmRec = document.getElementById('nmRecipient');
    if (nmProp) nmProp.innerHTML = '<option value="">Select Property</option>' + props.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if (nmRec) nmRec.innerHTML = '<option value="">Select Tenant / Contractor</option>' + tenants.map(t=>`<option value="${t.id}">${escapeHtml(t.name)} • ${escapeHtml(t.property||'')}</option>`).join('') + '<option value="CTR-001">ColdTech Zambia Ltd • Contractor</option><option value="CTR-004">BuildWell Construction • Contractor</option>';
  }

  function openNewMessage() {
    populateNewMessageFilters();
    document.getElementById('newMessageBackdrop')?.classList.add('open');
  }
  function closeNewMessage() { document.getElementById('newMessageBackdrop')?.classList.remove('open'); }

  function sendNewMessage() {
    const st = getState();
    const propId = document.getElementById('nmProperty')?.value||'';
    const recipientId = document.getElementById('nmRecipient')?.value||'';
    const channel = document.getElementById('nmChannel')?.value||'Portal';
    const subject = document.getElementById('nmSubject')?.value.trim()||'New Message';
    const body = document.getElementById('nmBody')?.value.trim();
    if (!propId || !recipientId || !body) { if(window.toast) toast('Property, recipient and message required','error'); return; }

    const prop = (st.properties||[]).find(p=>p.id===propId);
    const tenant = (st.tenants||[]).find(t=>t.id===recipientId) || { id: recipientId, name: recipientId };
    const threadId = `THREAD-${Date.now().toString().slice(-6)}`;

    const msg = {
      id: `MSG-${String((st.messages||[]).length+1).padStart(5,'0')}-${Date.now().toString().slice(-3)}`,
      threadId: threadId,
      propertyId: propId,
      propertyName: prop? prop.name : propId,
      property: prop? prop.name : propId,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenant: tenant.name,
      sender: 'Chanda Mwanza',
      senderType: 'System',
      recipient: tenant.name,
      recipientType: tenant.name.includes('Ltd')||tenant.name.includes('Construction')? 'Contractor' : 'Tenant',
      subject: subject,
      body: body,
      preview: body.slice(0,80),
      type: 'Outbound',
      channel: channel,
      status: 'Read',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0,10),
      timestamp: new Date().toISOString()
    };
    st.messages.unshift(msg);
    save();
    closeNewMessage();
    renderThreads();
    openThread(threadId);
    if(window.toast) toast(`Message sent to ${tenant.name} via ${channel}`,'success');
  }

  function bindEvents() {
    searchInput?.addEventListener('input', e=>{ searchQuery=e.target.value; renderThreads(); });
    sortSelect?.addEventListener('change', renderThreads);
    document.querySelectorAll('.filter-chip').forEach(chip=>{
      chip.addEventListener('click', ()=>{
        document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter||'all';
        renderThreads();
      });
    });

    btnSendReply?.addEventListener('click', sendReply);
    replyText?.addEventListener('keydown', e=>{
      if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); sendReply(); }
    });
    replyChannel?.addEventListener('change', ()=>{
      const val = replyChannel.value||'Portal';
      if (replyChannelPill) { replyChannelPill.textContent=val; replyChannelPill.className='pill '+val.toLowerCase(); }
    });

    document.getElementById('btnCloseThread')?.addEventListener('click', closeThread);
    document.getElementById('btnDiscard')?.addEventListener('click', ()=>{ if(replyText) replyText.value=''; });
    document.getElementById('btnMarkAllRead')?.addEventListener('click', ()=>{
      const st=getState();
      (st.messages||[]).forEach(m=> m.status='Read');
      save(); renderThreads();
      if(window.toast) toast('All messages marked as read','success');
    });
    document.getElementById('btnArchive')?.addEventListener('click', ()=>{
      if(!activeThreadId){ if(window.toast) toast('Select a thread to archive','info'); return; }
      if(window.toast) toast(`Thread ${activeThreadId} archived`,'success');
      closeThread();
    });
    document.getElementById('btnNewMessage')?.addEventListener('click', openNewMessage);
    document.getElementById('btnCloseNewMsg')?.addEventListener('click', closeNewMessage);
    document.getElementById('btnCancelNewMsg')?.addEventListener('click', closeNewMessage);
    document.getElementById('newMessageBackdrop')?.addEventListener('click', e=>{ if(e.target.id==='newMessageBackdrop') closeNewMessage(); });
    document.getElementById('btnSendNewMsg')?.addEventListener('click', sendNewMessage);

    document.getElementById('btnAttach')?.addEventListener('click', ()=>{ if(window.toast) toast('Attachment picker: 2 files (lease, invoice)','info'); });
    document.getElementById('btnCanned')?.addEventListener('click', ()=>{
      const canned = [
        "Dear tenant, your rent is due on 5th. Kindly remit ZMW amount to avoid penalties.",
        "We acknowledge receipt of your complaint. Maintenance team dispatched - ETA 24h.",
        "Your lease renewal is due in 90 days. Please confirm intent to renew.",
        "Thank you for payment confirmation. Receipt attached."
      ];
      if (replyText) replyText.value = canned[Math.floor(Math.random()*canned.length)];
    });
    document.getElementById('btnReplyTemplate')?.addEventListener('click', ()=>{
      document.getElementById('btnCanned')?.click();
    });
  }

  bindEvents();
  renderThreads();

  console.log('[Enterprise Messages] ToR 9.1 loaded -', (getState().messages||[]).length, 'messages, threads:', Object.keys(groupThreads()).length);
});

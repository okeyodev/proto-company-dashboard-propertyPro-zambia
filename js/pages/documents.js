document.addEventListener('DOMContentLoaded',()=>{
  initCommon('documents');
  state.documents=Array.isArray(state.documents)?state.documents:[];
  const search=document.getElementById('documentSearch');
  const typeFilter=document.getElementById('documentTypeFilter');
  const statusFilter=document.getElementById('documentStatusFilter');
  const entityFilter=document.getElementById('documentEntityFilter');
  let filtered=[];

  const text=value=>escapeHtml(String(value??''));
  const titleOf=document=>document.title||document.name||document.fileName||document.id||'Untitled document';
  const entityLabel=document=>{
    const entityType=document.entityType||document.typeEntity||'portfolio';
    const entityId=document.entityId||document.propertyId||'';
    if(entityType==='property'){
      const property=(state.properties||[]).find(item=>item.id===entityId);
      return `${property?.name||entityId||'Property portfolio'}${entityId?` (${entityId})`:''}`;
    }
    const collection=entityType==='investment'?'investmentAssets':entityType==='lease'?'leases':entityType==='tenant'?'tenants':null;
    const linked=collection&&(state[collection]||[]).find(item=>item.id===entityId);
    return linked?`${linked.name||linked.title||entityId} (${entityId})`:entityId||'Portfolio-wide';
  };
  const relatedOptions=()=>{
    const options=[['portfolio::','Portfolio-wide']];
    (state.properties||[]).forEach(item=>options.push([`property::${item.id}`,`Property: ${item.name} (${item.id})`]));
    (state.investmentAssets||[]).forEach(item=>options.push([`investment::${item.id}`,`Investment: ${item.name} (${item.id})`]));
    (state.leases||[]).forEach(item=>options.push([`lease::${item.id}`,`Lease: ${item.id}`]));
    (state.tenants||[]).forEach(item=>options.push([`tenant::${item.id}`,`Tenant: ${item.name||item.id} (${item.id})`]));
    return options;
  };
  function getFiltered(){
    const query=search.value.trim().toLowerCase();
    return state.documents.filter(document=>{
      const linkedType=document.entityType||(document.entityId&&String(document.entityId).startsWith('P-')?'property':'portfolio');
      return (!query||`${titleOf(document)} ${document.id||''} ${document.type||''} ${entityLabel(document)}`.toLowerCase().includes(query))&&
        (typeFilter.value==='All'||(document.type||'Other')===typeFilter.value)&&
        (statusFilter.value==='All'||(document.status||'Draft')===statusFilter.value)&&
        (entityFilter.value==='All'||linkedType===entityFilter.value);
    });
  }
  function fillFilters(){
    const types=[...new Set(state.documents.map(document=>document.type||'Other'))].sort();
    const statuses=[...new Set(state.documents.map(document=>document.status||'Draft'))].sort();
    typeFilter.innerHTML='<option value="All">All document types</option>'+types.map(value=>`<option value="${text(value)}">${text(value)}</option>`).join('');
    statusFilter.innerHTML='<option value="All">All statuses</option>'+statuses.map(value=>`<option value="${text(value)}">${text(value)}</option>`).join('');
  }
  function render(){
    filtered=getFiltered();
    const now=new Date().toISOString().slice(0,10);
    const verified=filtered.filter(document=>['Verified','Final'].includes(document.status)).length;
    const expired=filtered.filter(document=>document.expiryDate&&document.expiryDate<now).length;
    document.getElementById('documentKpis').innerHTML=`
      <div class="kpi accent-blue"><div class="kpi-label">Documents</div><div class="kpi-value">${filtered.length}</div><div class="kpi-meta">Matching current filters</div></div>
      <div class="kpi accent-green"><div class="kpi-label">Verified / final</div><div class="kpi-value">${verified}</div><div class="kpi-meta">Approved records</div></div>
      <div class="kpi accent-amber"><div class="kpi-label">Expired documents</div><div class="kpi-value">${expired}</div><div class="kpi-meta">Past expiry date</div></div>
      <div class="kpi accent-violet"><div class="kpi-label">With stored file</div><div class="kpi-value">${filtered.filter(document=>document.dataUrl).length}</div><div class="kpi-meta">Available to download here</div></div>`;
    document.querySelector('#documentTable tbody').innerHTML=filtered.map(document=>{
      const id=text(document.id);
      const status=document.status||'Draft';
      const statusTone=['Verified','Final'].includes(status)?'green':['Expired','Rejected'].includes(status)?'red':'amber';
      return `<tr data-id="${id}">
        <td style="padding:11px;border-top:1px solid var(--border)"><b>${text(titleOf(document))}</b><div class="small muted">${id}${document.fileName?` • ${text(document.fileName)}`:''}</div></td>
        <td style="padding:11px;border-top:1px solid var(--border)">${text(document.type||'Other')}</td>
        <td style="padding:11px;border-top:1px solid var(--border)">${text(entityLabel(document))}</td>
        <td style="padding:11px;border-top:1px solid var(--border)">${text(document.uploadedDate||'—')}</td>
        <td style="padding:11px;border-top:1px solid var(--border)">v${text(document.version||1)}</td>
        <td style="padding:11px;border-top:1px solid var(--border)"><span class="pill ${statusTone}">${text(status)}</span></td>
        <td style="padding:11px;border-top:1px solid var(--border);white-space:nowrap"><button class="btn btn-sm" data-action="download">Download</button> <button class="btn btn-sm" data-action="edit">Edit</button> <button class="btn btn-sm" data-action="delete">Delete</button></td>
      </tr>`;
    }).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">No documents match these filters.</td></tr>';
    document.getElementById('documentCount').textContent=`${filtered.length} documents`;
    document.querySelectorAll('#documentTable [data-action]').forEach(button=>button.addEventListener('click',()=>{
      const document=state.documents.find(item=>item.id===button.closest('tr').dataset.id);
      if(!document)return;
      if(button.dataset.action==='download')downloadDocument(document);
      if(button.dataset.action==='edit')openEditor(document);
      if(button.dataset.action==='delete')deleteDocument(document);
    }));
  }
  function downloadDocument(document){
    if(document.url&&document.url!=='#'){
      const link=window.document.createElement('a');
      link.href=document.url;link.target='_blank';link.rel='noopener noreferrer';
      link.click();
      return;
    }
    if(!document.dataUrl){
      toast('This record has no file attached. Edit it to attach a file.','error');
      return;
    }
    const link=window.document.createElement('a');
    link.href=document.dataUrl;link.download=document.fileName||`${titleOf(document)}.file`;
    window.document.body.appendChild(link);link.click();link.remove();
  }
  function openEditor(document=null){
    let backdrop=window.document.getElementById('documentEditorBackdrop');
    if(!backdrop){
      backdrop=window.document.createElement('div');
      backdrop.id='documentEditorBackdrop';backdrop.className='modal-backdrop';window.document.body.appendChild(backdrop);
    }
    const linkedValue=document?.entityId?`${document.entityType||'property'}::${document.entityId}`:'portfolio::';
    const related=relatedOptions();
    if(document?.entityId&&!related.some(([value])=>value===linkedValue)){
      related.push([linkedValue,`${document.entityType||'Record'}: ${document.entityId}`]);
    }
    const option=(value,label,selected)=>`<option value="${text(value)}" ${selected?'selected':''}>${text(label)}</option>`;
    const field=(label,name,value,type='text',required=true)=>`<label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600">${label}<input name="${name}" type="${type}" value="${text(value??'')}" ${required?'required':''} style="height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px"></label>`;
    backdrop.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="documentEditorTitle">
      <form id="documentEditorForm">
        <div class="modal-head"><h3 id="documentEditorTitle" style="margin:0">${document?'Edit document':'Upload document'}</h3><button class="btn btn-ghost" type="button" data-close>✕</button></div>
        <div class="modal-body"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
          ${field('Document title','title',document?.title||document?.name)}
          <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600">Document type<select name="type" required style="height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px">${['Title','Valuation','Lease','Prospectus','Financial','Compliance','Insurance','Other'].map(value=>option(value,value,(document?.type||'Other')===value)).join('')}</select></label>
          <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600">Link to<select name="entity" style="height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px">${related.map(([value,label])=>option(value,label,linkedValue===value)).join('')}</select></label>
          <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600">Status<select name="status" style="height:36px;border:1px solid var(--border);border-radius:8px;padding:0 10px">${['Draft','Under Review','Verified','Final','Expired','Archived'].map(value=>option(value,value,(document?.status||'Draft')===value)).join('')}</select></label>
          ${field('Expiry date','expiryDate',document?.expiryDate||'','date',false)}
          <label style="display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;grid-column:1/-1">File (max 512 KB)<input name="file" type="file" ${document?'':'required'} style="padding:8px;border:1px solid var(--border);border-radius:8px"></label>
        </div><div id="documentEditorError" role="alert" style="margin-top:10px;color:#B91C1C;font-size:12px"></div></div>
        <div class="modal-foot" style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px"><button class="btn" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save Document</button></div>
      </form></div>`;
    backdrop.classList.add('open');
    backdrop.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>backdrop.classList.remove('open')));
    backdrop.onclick=event=>{if(event.target===backdrop)backdrop.classList.remove('open');};
    backdrop.querySelector('#documentEditorForm').addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget,values=Object.fromEntries(new FormData(form).entries());
      const file=form.elements.file.files[0]||null,error=backdrop.querySelector('#documentEditorError');
      if(!values.title.trim()||(!document&&!file)){error.textContent='Enter a title and choose a file.';return;}
      if(file&&file.size>512*1024){error.textContent='This file is larger than 512 KB. Choose a smaller file.';return;}
      const [entityType,entityId]=values.entity.split('::');
      let dataUrl=document?.dataUrl||null;
      if(file){
        try{dataUrl=await readFile(file);}
        catch(readError){error.textContent=`Could not read the selected file: ${readError.message||'unknown file error'}`;return;}
      }
      const today=new Date().toISOString().slice(0,10);
      const previous=document?{...document}:null;
      let id=document?.id;
      if(!id){
        let sequence=1;
        do{id=`DOC-MAN-${String(sequence++).padStart(4,'0')}`;}
        while(state.documents.some(item=>item.id===id));
      }
      const record={
        ...(document||{}),id,
        title:values.title.trim(),name:values.title.trim(),type:values.type,entityType,entityId:entityId||null,
        uploadedDate:document?.uploadedDate||today,uploadedBy:document?.uploadedBy||'Chanda Mwanza',
        version:document?(file?(document.version||1)+1:(document.version||1)):1,status:values.status,expiryDate:values.expiryDate||null,
        dataUrl,fileName:file?.name||document?.fileName||null,mimeType:file?.type||document?.mimeType||null,fileSize:file?.size||document?.fileSize||0
      };
      if(document)Object.assign(document,record);else state.documents.push(record);
      const auditCopy=value=>{if(!value)return null;const copy={...value};delete copy.dataUrl;return copy;};
      addAuditEvent(document?'UPDATE':'CREATE','document',record.id,document?'Document record updated':'Document uploaded',auditCopy(previous),auditCopy(record));
      saveState();fillFilters();render();backdrop.classList.remove('open');
      toast(document?'Document updated':'Document uploaded','success');
    });
  }
  function readFile(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(reader.error||new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }
  function deleteDocument(document){
    if(!confirm(`Delete document ${titleOf(document)}? This cannot be undone.`))return;
    state.documents=state.documents.filter(item=>item.id!==document.id);
    const auditRecord={...document};delete auditRecord.dataUrl;
    addAuditEvent('DELETE','document',document.id,'Document deleted',auditRecord,null);
    saveState();fillFilters();render();toast('Document deleted','success');
  }
  function csvCell(value){return `"${String(value??'').replace(/"/g,'""')}"`;}
  document.getElementById('btnAddDocument').addEventListener('click',()=>openEditor());
  document.getElementById('btnExportDocuments').addEventListener('click',()=>{
    const rows=[['ID','Title','Type','Linked record','Uploaded date','Version','Status','File name']];
    filtered.forEach(document=>rows.push([document.id,titleOf(document),document.type,entityLabel(document),document.uploadedDate,document.version,document.status,document.fileName]));
    const blob=new Blob([rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`PropertyPro-Documents-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(url);
    toast('Document register exported','success');
  });
  document.getElementById('btnClearDocumentFilters').addEventListener('click',()=>{
    search.value='';typeFilter.value='All';statusFilter.value='All';entityFilter.value='All';render();
  });
  [search,typeFilter,statusFilter,entityFilter].forEach(element=>element.addEventListener(element===search?'input':'change',render));
  fillFilters();render();
  const propertyId=new URLSearchParams(location.search).get('property');
  if(propertyId){entityFilter.value='property';search.value=propertyId;render();}
});

/* One checked snapshot supplies all article panels. */
(() => {
  'use strict';
  const keys = ['thor_liquidity','thor_affiliate','metamask','chainflip','cow','oneinch'];
  const linkTypes = ['fee_return','direct_transfer','shared_principal_destination'];
  function cents(value) {
    if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) throw Error('Invalid monetary amount');
    const amount = Number(value.replace('.',''));
    if (!Number.isSafeInteger(amount)) throw Error('Amount exceeds precision');
    return amount;
  }
  const sum = rows => rows.reduce((total,row) => total + cents(row.usd),0);
  const unique = (rows,field) => new Set(rows.map(row=>row[field])).size === rows.length;
  const safeUrl = url => { try { const u=new URL(url); return u.protocol==='https:' && !u.username && !u.password; } catch { return false; } };
  function validate(data) {
    const schedule=data.schedule;
    const validSchedule=schedule && (schedule.mode==='manual'?
      schedule.interval_hours===null && schedule.next_attempt_utc===null:
      schedule.mode===undefined && Number.isFinite(Number(schedule.interval_hours)) && Number(schedule.interval_hours)>0);
    if (data.view_schema!==3 || !Number.isFinite(Date.parse(data.cutoff_utc)) ||
        !Number.isFinite(Date.parse(data.published_utc)) || !Number.isFinite(Date.parse(data.evidence_checked_utc)) || !data.snapshot_id || !data.registry_version ||
        !validSchedule) throw Error('Invalid snapshot metadata');
    const t=data.totals, mechanisms=data.mechanisms, recipients=data.recipients, linked=data.linked;
    const strings=items=>Array.isArray(items) && items.every(item=>typeof item==='string');
    const expectedKeys=mechanisms.some(row=>row.key==='oneinch')?keys:keys.filter(key=>key!=='oneinch');
    if (mechanisms.length!==expectedKeys.length || !unique(mechanisms,'key') || mechanisms.some(row=>!expectedKeys.includes(row.key))) throw Error('Unexpected fee categories');
    Object.values(t).forEach(cents);
    if (sum(mechanisms)!==cents(t.all_fees_usd) ||
        sum(mechanisms.filter(row=>row.key!=='thor_affiliate'))!==cents(t.protocols_services_usd) ||
        cents(mechanisms.find(row=>row.key==='thor_affiliate').usd)!==cents(t.affiliate_usd) ||
        cents(t.linked_affiliates_usd)+cents(t.unresolved_affiliates_usd)!==cents(t.affiliate_usd)) throw Error('Fee categories do not reconcile');
    if (!unique(recipients,'id') || !unique(linked,'id') || !unique(data.unassigned,'key') ||
        sum(recipients)!==cents(t.known_recipients_usd) || sum(data.unassigned)!==cents(t.unassigned_recipients_usd) ||
        sum(recipients)+sum(data.unassigned)!==cents(t.all_fees_usd) || sum(linked)!==cents(t.linked_affiliates_usd)) throw Error('Recipient amounts do not reconcile');
    for (const row of recipients) {
      if (!row.address || row.id!==row.chain+':'+row.address || !row.link_status.length ||
          !unique(row.link_status.map(status=>({status})),'status') ||
          row.link_status.some(status=>!['linked','unresolved','not_assessed'].includes(status)) ||
          (row.explorer && !safeUrl(row.explorer)) || (row.collector && row.link_status.includes('linked'))) throw Error('Invalid recipient classification');
      if (!strings(row.aliases) || !strings(row.accounting) || typeof row.role!=='string') throw Error('Invalid recipient details');
    }
    for (const row of linked) {
      const recipient=recipients.find(item=>item.id===row.id);
      if (!recipient || row.address!==recipient.address || !recipient.link_status.includes('linked') ||
          cents(row.usd)>cents(recipient.usd) || !row.evidence.length || row.chain!=='THORChain') throw Error('Linked addresses must be a reviewed subset');
      for (const evidence of row.evidence) {
        if (!evidence.types.length || evidence.types.some(type=>!linkTypes.includes(type)) ||
            !evidence.checked_utc || !evidence.summary || !evidence.urls.length || !evidence.urls.every(safeUrl)) throw Error('Missing reviewed connection evidence');
        if (!strings(evidence.labels)) throw Error('Invalid connection descriptions');
      }
    }
    if (recipients.some(row=>row.link_status.includes('linked') && !linked.some(item=>item.id===row.id))) throw Error('Linked recipient omitted from the subset');
    if (!unique(data.unlinked,'id') || sum(data.unlinked)!==cents(t.unlinked_recipients_usd) ||
        sum(data.unlinked)+sum(linked)!==sum(recipients)) throw Error('Address connection groups do not reconcile');
    for (const row of data.unlinked) {
      const original=recipients.find(item=>item.id===row.id);
      if (!original || row.address!==original.address || cents(row.usd)>cents(original.usd) ||
          !cents(row.usd) || typeof row.partial_allocation!=='boolean' ||
          row.partial_allocation!==(cents(linked.find(item=>item.id===row.id)?.usd||'0.00')>0) ||
          ['role','chain','explorer','collector'].some(field=>row[field]!==original[field]) ||
          ['aliases','accounting','link_status'].some(field=>JSON.stringify(row[field])!==JSON.stringify(original[field]))) throw Error('Invalid unreviewed allocation');
    }
    for (const row of recipients) {
      const remaining=data.unlinked.find(item=>item.id===row.id), reviewed=linked.find(item=>item.id===row.id);
      if (cents(remaining?.usd||'0.00')+cents(reviewed?.usd||'0.00')!==cents(row.usd)) throw Error('Address allocation is duplicated or missing');
    }
    const matches=(rows,expected,key,fields)=>Array.isArray(rows) && rows.length===expected.length && unique(rows,key) &&
      rows.every(row=>{const original=expected.find(item=>item[key]===row[key]);return original && fields.every(field=>JSON.stringify(row[field])===JSON.stringify(original[field]));});
    const details=['id','chain','address','role','usd','aliases','accounting','link_status','collector','explorer'];
    const protocolUnassigned=data.unassigned.filter(row=>['thor_liquidity','cow'].includes(row.key));
    const affiliateUnassigned=data.unassigned.filter(row=>!['thor_liquidity','cow'].includes(row.key));
    if (!matches(data.protocol_mechanisms,mechanisms.filter(row=>row.key!=='thor_affiliate'),'key',['key','label','description','usd','source']) ||
        !matches(data.protocol_recipients,recipients.filter(row=>row.chain!=='THORChain'),'id',details) ||
        !matches(data.other_affiliates,data.unlinked.filter(row=>row.chain==='THORChain'),'id',[...details,'partial_allocation']) ||
        !matches(data.protocol_unassigned,protocolUnassigned,'key',['key','label','usd','reason','destinations']) ||
        !matches(data.affiliate_unassigned,affiliateUnassigned,'key',['key','label','usd','reason','destinations'])) throw Error('Article fee groups do not match the checked allocations');
    if (sum(data.protocol_recipients)!==cents(t.protocol_recipients_usd) || sum(data.protocol_unassigned)!==cents(t.protocol_unassigned_usd) ||
        sum(data.protocol_recipients)+sum(data.protocol_unassigned)!==cents(t.protocols_services_usd) ||
        sum(data.other_affiliates)!==cents(t.other_affiliate_recipients_usd) || sum(data.affiliate_unassigned)!==cents(t.affiliate_unassigned_usd) ||
        sum(data.other_affiliates)+sum(data.affiliate_unassigned)!==cents(t.unresolved_affiliates_usd)) throw Error('Separated fee groups do not reconcile');
    return data;
  }
  if (typeof module!=='undefined' && module.exports) module.exports={validate,cents};
  if (typeof document==='undefined') return;
  const seed=document.getElementById('article-fees-seed');
  if (!seed) return;
  const $=id=>document.getElementById(id), all=selector=>document.querySelectorAll(selector);
  const money=value=>Number(value)>0 && Number(value)<1 ? '<$1' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(value));
  const short=address=>address.slice(0,10)+'…'+address.slice(-5);
  const compact=value=>value<1000 ? money(String(value)) : '$'+(value/1000).toLocaleString('en-US',{maximumFractionDigits:0})+'k';
  const date=value=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'UTC'}).format(new Date(value))+ ' UTC';
  const statusNames={linked:'Documented link',unresolved:'No additional link established',not_assessed:'Not assessed'};
  let current, charts={}, expanded=null, expandedView=null, previousFocus=null;
  function status(text,error=false) { all('[data-article-status]').forEach(node=>{node.textContent=text;node.hidden=!text;node.classList.toggle('error',error);}); }
  function node(tag,text='',className='') { const element=document.createElement(tag);element.textContent=text;if(className) element.className=className;return element; }
  function anchor(text,url) { const element=node('a',text);element.href=url;
    if (url.startsWith('https:') || url.startsWith('/embed/linked-wallets')) { element.target='_blank';element.rel='noopener noreferrer'; }
    return element; }
  function replace(id,rows) { const target=$(id);if(target) target.replaceChildren(...rows); }
  function put(id,text) { if($(id)) $(id).textContent=text; }
  function openEvidence(event) {
    const link=event.target.closest('a[href^="#wallet-"]');
    if (!link) return;
    const target=$(link.getAttribute('href').slice(1));
    if (target) { event.preventDefault();if(expandedView) close();(target.matches('details')?target:target.querySelector('details'))?.setAttribute('open','');target.scrollIntoView({behavior:'smooth',block:'start'}); }
  }
  document.addEventListener('click',openEvidence);
  function recipientElements(view,rows) {
    return rows.map(row=>{
      const tr=node('tr'),name=node('th');name.scope='row';
      const code=node('code',row.address,'full-address');
      if (row.explorer) { const link=anchor('',row.explorer);link.append(code);name.append(link); } else name.append(code);
      if(view==='recipients') name.append(node('small',row.role+' · '+row.chain));
      else if(row.collector) name.append(node('small','THORChain holding account'));
      const shownAliases=row.aliases.filter(alias=>alias!==row.address);
      if (shownAliases.length) name.append(node('small',(view==='other'?(shownAliases.length===1?'Name used in swaps: ':'Names used in swaps: '):'Name: ')+shownAliases.join(', ')));
      if(row.partial_allocation) name.append(node('small','Unreviewed portion only'));
      const text=view==='recipients'?row.accounting.join(', '):row.link_status.length>1?'Partly reviewed':statusNames[row.link_status[0]], connection=node('td','','route-status review-cell');
      if (row.link_status.includes('linked')) connection.append(anchor(text,($('linked-rows')?'':'/embed/linked-wallets')+'#wallet-'+row.address)); else connection.textContent=text;
      tr.append(name,feeCell(row.usd));if(view==='recipients') tr.append(connection);return tr;
    });
  }
  function recipientRows(view='recipients') {
    const prefix=view==='recipients'?'recipient':'other';if (!$(prefix+'-rows')) return;
    const query=($(prefix+'-search')?.value || '').trim().toLowerCase(), source=rowsFor(view);
    const rows=source.filter(row=>[row.address,row.chain,row.role,...row.aliases].join(' ').toLowerCase().includes(query));
    replace(prefix+'-rows',recipientElements(view,rows));
    put(prefix+'-count',(query ? `${rows.length} of ${source.length} addresses in this group` : `${source.length} addresses in this group`)+
      (view==='other'?' · mapped allocations '+money(current.totals.other_affiliate_recipients_usd):''));
    $(prefix+'-count').hidden=!query && !(view==='other' && cents(current.totals.affiliate_unassigned_usd)>0);
    $(prefix+'-empty').hidden=rows.length>0;
  }
  const feeMaximum=()=>Math.max(0,...current.recipients.map(row=>Number(row.usd)));
  function feeCell(value) {
    const td=node('td','','fee-value'),track=node('div','','fee-track'),bar=node('span','','fee-bar');
    track.setAttribute('aria-hidden','true');bar.style.width=(feeMaximum()?Number(value)/feeMaximum()*100:0)+'%';
    track.append(bar);td.append(node('span',money(value),'fee-number'),track);return td;
  }
  function tables() {
    replace('overview-rows',current.protocol_mechanisms.map(row=>{
      const tr=node('tr'),name=node('th',row.label);name.scope='row';name.append(node('small',row.description));
      tr.append(name,node('td',money(row.usd)),node('td',(Number(current.totals.protocols_services_usd)?Number(row.usd)/Number(current.totals.protocols_services_usd)*100:0).toFixed(1)+'%'));return tr;
    }));
    recipientRows();recipientRows('other');
    const remaining=row=>{const li=node('li',row.label+': '+money(row.usd));li.append(node('small',row.reason));return li;};
    replace('unassigned-rows',current.protocol_unassigned.map(remaining));
    replace('other-unassigned-rows',current.affiliate_unassigned.map(remaining));
    if (!$('linked-rows')) return;
    const open=new Set([...$('linked-rows').querySelectorAll('details[open]')].map(item=>item.closest('tr').id));
    replace('linked-rows',linkedElements(current.linked,open));
  }
  function linkedElements(rows,open=new Set()) {
    return rows.map(row=>{
      const tr=node('tr');tr.id='wallet-'+row.address;
      const name=node('th');name.scope='row';name.append(node('code',row.address,'full-address'));
      const labels=[...new Set(row.evidence.flatMap(evidence=>evidence.labels))].join('; '),connection=node('td',labels,'review-cell');
      const details=node('details','','evidence-detail');details.open=open.has(tr.id);
      const summary=node('summary','Evidence'),body=node('div','','connection-body');
      for (const evidence of row.evidence) {
        const list=node('ul','','connection-sources');
        for (const url of evidence.urls) { const u=new URL(url),code=u.searchParams.get('txid')||u.pathname.split('/').filter(Boolean).at(-1)||u.hostname;
          const li=node('li');li.append(anchor(u.hostname+' · '+(code.length>22?short(code):code),url));list.append(li); }
        body.append(node('p',evidence.summary),node('p','Reviewed '+evidence.checked_utc,'chart-note'),list);
      }
      details.append(summary,body);connection.append(details);tr.append(name,feeCell(row.usd),connection);return tr;
    });
  }
  const endLabels={id:'articleEndLabels',afterDatasetsDraw(chart) {
    const ctx=chart.ctx;ctx.save();ctx.font='12px Arial';ctx.fillStyle='#202122';ctx.textBaseline='middle';
    chart.getDatasetMeta(0).data.forEach((bar,index)=>{ctx.fillText(money(String(chart.data.datasets[0].data[index])),bar.x+7,bar.y);});ctx.restore();
  }};
  function rowsFor(view) { return current[{overview:'protocol_mechanisms',recipients:'protocol_recipients',linked:'linked',other:'other_affiliates'}[view]]; }
  function chartConfig(view) {
    const rows=rowsFor(view);
    const largest=Math.max(1,...rows.map(row=>Number(row.usd))),step=10**Math.floor(Math.log10(largest));
    const maximum=Math.ceil(largest/step)*step;
    return {type:'bar',data:{labels:rows.map(row=>view==='overview'?(row.key.startsWith('thor_')?['THORChain',row.key==='thor_liquidity'?'liquidity':'affiliate']:row.label):row.address),
      datasets:[{data:rows.map(row=>Number(row.usd)),backgroundColor:'#007bff',barThickness:view==='linked'?20:24,borderRadius:0}]},
      plugins:[endLabels],options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,animation:false,
        layout:{padding:{right:80,top:8,bottom:4}},plugins:{legend:{display:false},tooltip:{callbacks:{
          title:items=>{const row=rows[items[0].dataIndex];return view==='overview'?row.label:row.address;},
          label:context=>money(rows[context.dataIndex].usd),afterLabel:()=> 'Data through '+date(current.cutoff_utc)}}},
        scales:{x:{beginAtZero:true,max:maximum,grid:{color:'#eaecf0'},border:{display:false},ticks:{maxTicksLimit:4,font:{size:11},color:'#747b80',callback:value=>value===0?'$0':compact(value)}},
          y:{grid:{display:false},border:{display:false},ticks:{color:'#333',font:{size:view==='linked'?10:12,family:view==='linked'?'monospace':'Arial'}}}}}};
  }
  function draw(view) { const canvas=$(view+'-chart');if(!canvas || typeof Chart==='undefined') return;
    charts[view]?.destroy();charts[view]=new Chart(canvas,chartConfig(view)); }
  function render() {
    const t=current.totals;
    put('overview-total',money(t.protocols_services_usd));put('recipients-total',money(t.protocol_recipients_usd));put('linked-total',money(t.linked_affiliates_usd));put('other-total',money(t.unresolved_affiliates_usd));
    put('protocol-unassigned-total',money(t.protocol_unassigned_usd));
    put('other-unassigned-label',money(t.affiliate_unassigned_usd)+' in affiliate allocations has no known split between recipient addresses');
    if($('other-unassigned')) $('other-unassigned').hidden=cents(t.affiliate_unassigned_usd)===0;
    all('[data-table-scale]').forEach(element=>{element.textContent='All address tables use the same linear fee scale: $0–'+money(String(feeMaximum()))+'.';});
    all('[data-article-cutoff]').forEach(element=>{element.textContent=date(current.cutoff_utc);element.dateTime=current.cutoff_utc;});
    tables();draw('overview');
    openHash();
    if (expandedView) updateExpanded();
    status('');
    if (typeof Chart==='undefined') { all('[data-article-png="overview"], [data-article-expand="overview"]').forEach(button=>button.disabled=true);
      for(const view of ['overview']) { if($(view+'-data-panel')) {$(view+'-data-panel').hidden=false;$(view+'-chart-panel').hidden=true;} }
      status('Chart unavailable; checked values remain in the tables.',true); }
  }
  function openHash() { const target=$(location.hash.slice(1));if(target) (target.matches('details')?target:target.querySelector('details'))?.setAttribute('open',''); }
  const csvCell=value=>'"'+String(value).replaceAll('"','""')+'"';
  function csv(view) {
    const headings=['snapshot_id','cutoff_utc','valuation','registry_version','evidence_checked_utc','scope'];
    const metadata=[current.snapshot_id,current.cutoff_utc,'historical USD',current.registry_version,current.evidence_checked_utc,
      view==='overview'?'Protocol and service fees; affiliate fees excluded':view==='recipients'?'Identified address allocations within protocol and service fees':view==='other'?'Other affiliate allocations; additional connection not established':'Linked affiliate allocations; separate from protocol and service fees'];
    let records;
    if (view==='overview') records=[['category','description','usd',...headings],...rowsFor(view).map(row=>[row.label,row.description,row.usd,...metadata])];
    else if (view==='recipients' || view==='other') records=[['chain','address','role','aliases','accounting','route_connection','partial_allocation','usd',...headings],
      ...rowsFor(view).map(row=>[row.chain,row.address,row.role,row.aliases.join('; '),row.accounting.join('; '),row.link_status.join('; '),Boolean(row.partial_allocation),row.usd,...metadata])];
    else records=[['chain','address','affiliate_fee_usd','connection_types','reviewed_utc','evidence_urls',...headings],
      ...current.linked.map(row=>[row.chain,row.address,row.usd,[...new Set(row.evidence.flatMap(e=>e.types))].join('; '),
        [...new Set(row.evidence.map(e=>e.checked_utc))].join('; '),[...new Set(row.evidence.flatMap(e=>e.urls))].join('; '),...metadata])];
    download(new Blob(['\ufeff'+records.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),view+'.csv');
  }
  function download(blob,suffix) { const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='bitget-fees-'+current.cutoff_utc.slice(0,10)+'-'+suffix;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000); }
  // PNG and Expand reuse the article's HTML and row builders rather than a second drawing template.
  const panelIds={overview:'overview-fees',recipients:'known-recipients',linked:'linked-wallets',other:'other-affiliates'};
  function panelCopy(view,image=false) {
    const source=$(panelIds[view]);
    if(!source) throw Error('Panel unavailable');
    const copy=source.cloneNode(true);
    copy.querySelectorAll('.chart-actions,.recipient-search,.view-toggle,.chart-status,[id$="-count"],[id$="-empty"]').forEach(element=>element.remove());
    const footer=copy.querySelector('.chart-footer');
    if(footer) footer.replaceWith(...footer.childNodes);
    const table=copy.querySelector('.address-chart-table');
    if(table) {
      table.classList.remove('data-only');
      table.querySelector('tbody').replaceChildren(...(view==='linked'?linkedElements(rowsFor(view)):recipientElements(view,rowsFor(view))));
    }
    if(view==='overview' && image) {
      copy.querySelector('#overview-chart-panel').hidden=false;
      copy.querySelector('#overview-data-panel').hidden=true;
    }
    if(image) {
      copy.querySelectorAll('.evidence-detail').forEach(element=>element.remove());
      copy.querySelectorAll('.recipient-unassigned').forEach(element=>element.open=true);
      // Publication images reuse chart content without adding article-navigation notes.
      if(view==='recipients') {
        copy.querySelector('.metric-label').textContent='Total fees with identified recipients';
        copy.querySelector('.recipient-unassigned')?.remove();
      }
    }
    [copy,...copy.querySelectorAll('[id]')].forEach(element=>element.removeAttribute('id'));
    copy.removeAttribute('aria-labelledby');
    copy.querySelector('h3').id=image?'article-export-title':'article-modal-title';
    copy.setAttribute('aria-labelledby',copy.querySelector('h3').id);
    return copy;
  }
  async function png(view,button) {
    button.disabled=true;
    let host,chart;
    try {
      if(typeof htmlToImage==='undefined') throw Error('Image renderer unavailable');
      host=node('div','','chart-export-host');host.setAttribute('aria-hidden','true');host.inert=true;
      const copy=panelCopy(view,true);copy.classList.add('chart-export');host.append(copy);document.body.append(host);
      await document.fonts.ready;
      if(view==='overview') {
        const config=chartConfig(view);
        chart=new Chart(copy.querySelector('canvas'),{...config,options:{...config.options,devicePixelRatio:3}});
      }
      const blob=await htmlToImage.toBlob(copy,{pixelRatio:3,backgroundColor:'#fff',fontEmbedCSS:'',
        filter:element=>!element.classList?.contains('sr-only')});
      if(!blob) throw Error('Export unavailable');
      download(blob,view+'.png');status('');
    } catch { status('PNG export unavailable. Try again or use Data / CSV.',true); }
    finally { chart?.destroy();host?.remove();button.disabled=false; }
  }
  function close() {
    if(!$('article-overlay')) return;
    $('article-overlay').hidden=true;document.body.style.overflow='';expanded?.destroy();expanded=null;expandedView=null;
    $('article-modal-content').replaceChildren();previousFocus?.focus();
  }
  function updateExpanded() {
    expanded?.destroy();expanded=null;
    const copy=panelCopy(expandedView);$('article-modal-content').replaceChildren(copy);
    if(expandedView==='overview' && !copy.querySelector('canvas').closest('[hidden]')) expanded=new Chart(copy.querySelector('canvas'),chartConfig('overview'));
  }
  function expand(view) {
    previousFocus=document.activeElement;expandedView=view;
    $('article-overlay').hidden=false;document.body.style.overflow='hidden';updateExpanded();
    $('article-overlay').querySelector('.chart-modal').scrollTop=0;$('article-close').focus();
  }
  try { current=validate(JSON.parse(seed.textContent));render(); }
  catch { for(const view of ['overview','linked']) { if($(view+'-data-panel')) {$(view+'-data-panel').hidden=false;$(view+'-chart-panel').hidden=true;} }
    status('Interactive view unavailable. The saved values remain in the tables.',true);return; }
  all('[data-article-view]').forEach(button=>button.addEventListener('click',()=>{
    const view=button.dataset.articleView,isData=button.dataset.mode==='data';$(view+'-chart-panel').hidden=isData;$(view+'-data-panel').hidden=!isData;
    all(`[data-article-view="${view}"]`).forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    if(!isData) charts[view]?.resize();
  }));
  all('[data-table-view]').forEach(button=>button.addEventListener('click',()=>{
    const view=button.dataset.tableView,isData=button.dataset.mode==='data';$(view+'-table').classList.toggle('data-only',isData);
    all(`[data-table-scale="${view}"]`).forEach(element=>element.hidden=isData);
    all(`[data-table-view="${view}"]`).forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  }));
  $('recipient-search')?.addEventListener('input',()=>recipientRows());
  $('other-search')?.addEventListener('input',()=>recipientRows('other'));
  all('[data-article-csv]').forEach(button=>button.addEventListener('click',()=>csv(button.dataset.articleCsv)));
  all('[data-article-png]').forEach(button=>button.addEventListener('click',()=>png(button.dataset.articlePng,button)));
  all('[data-article-expand]').forEach(button=>button.addEventListener('click',()=>expand(button.dataset.articleExpand)));
  $('article-close')?.addEventListener('click',close);
  $('article-overlay')?.addEventListener('click',event=>{if(event.target===$('article-overlay')) close();});
  document.addEventListener('keydown',event=>{
    if(expandedView && event.key==='Escape') close();
    if(expandedView && event.key==='Tab') {
      const focusable=[...$('article-overlay').querySelectorAll('button,a,summary,input,[tabindex]')].filter(element=>!element.disabled && element.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
    }
  });
  window.addEventListener('hashchange',openHash);
})();

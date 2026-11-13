/* Historical trade explorer: separate source datasets, lazy annual shards, exact-year values. */
(()=>{
'use strict';
const ns='http://www.w3.org/2000/svg', state={active:false,selected:null,datasetId:null,datasetAuto:true,focus:null,referenceCountry:null,focusWarning:null,requestKey:null,status:'idle',error:null,rows:null,browsing:false,search:'',page:1};
const cache=new Map(),inflight=new Map();let model=null,modelKey=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currentYear=()=>years[idx];
function censusDataset(){
 const records=window.TradeFlows?.records||[],entities={};
 for(const r of records)for(const id of [r.originISO,r.destinationISO]){const c=D.countries.find(c=>c.id===id);if(c)entities[id]={id,name:c.name,lon:c.lon,lat:c.lat,mapLinks:[{kind:'reference',id,from:2024,to:2024}]};}
 return {id:'census-2024',title:'U.S. Census · selected partners',years:[2024],unit:records[0]?.unit||'billion current US dollars',currency:'USD',scale:1e9,measure:'Goods trade',basis:records[0]?.basis,source:records[0]?.source,entities,inline:true,coverageNote:'Five selected U.S. partners, not the complete U.S. network or a top-five ranking.'};
}
function datasets(){const x=window.TradeManifest?.datasets;return Array.isArray(x)&&x.length?x:[censusDataset()];}
function dataset(){const list=datasets();if(state.datasetAuto){const next=(list.find(d=>d.years.includes(currentYear()))||list.filter(d=>d.years.some(y=>y<currentYear())).sort((a,b)=>Math.max(...b.years.filter(y=>y<currentYear()))-Math.max(...a.years.filter(y=>y<currentYear())))[0]||list[0]).id;if(state.datasetId&&state.datasetId!==next){state.focus=null;state.selected=null;state.browsing=false;}state.datasetId=next;}else if(!state.datasetId)state.datasetId=list[0].id;return list.find(d=>d.id===state.datasetId)||list[0];}
function sourceRows(ds){return (window.TradeFlows?.records||[]).map(r=>({...r,origin:r.originISO,destination:r.destinationISO}));}
function resetYear(){state.requestKey=null;state.rows=null;state.status='idle';state.error=null;model=null;modelKey=null;}
// Published annual files are losslessly gzip-compressed; raw JSON remains supported locally.
async function fetchJSON(url){
 let compressedError;
 try{
  const response=await fetch(url+'.gz');
  if(!response.ok)throw Error('Compressed data unavailable ('+response.status+')');
  const bytes=await response.arrayBuffer(),magic=new Uint8Array(bytes,0,Math.min(2,bytes.byteLength));
  // Some hosts transparently decode Content-Encoding:gzip before returning the body.
  if(magic[0]!==0x1f||magic[1]!==0x8b)return JSON.parse(new TextDecoder().decode(bytes));
  if(typeof DecompressionStream==='undefined')throw Error('This browser cannot decompress the published data. Use an updated browser.');
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).json();
 }catch(error){compressedError=error;}
 const response=await fetch(url);
 if(!response.ok)throw compressedError||Error('Data unavailable ('+response.status+')');
 return response.json();
}
function ensureYear(){
 const ds=dataset(),year=currentYear(),key=ds.id+':'+year;
 if(state.requestKey===key)return;
 state.requestKey=key;state.rows=null;state.error=null;model=null;modelKey=null;
 if(!ds.years.includes(year)){state.status='unavailable';return;}
 if(ds.inline){state.rows={year,datasetId:ds.id,records:sourceRows(ds).filter(r=>r.year===year)};state.status='ready';return;}
 if(cache.has(key)){state.rows=cache.get(key);state.status='ready';return;}
 state.status='loading';
 let pending=inflight.get(key);
 if(!pending){
  const url=(ds.path||'trade/{id}/{year}.json').replaceAll('{id}',ds.id).replaceAll('{year}',String(year));
  pending=fetchJSON(url).then(data=>{
   if(data.year!==year||data.datasetId&&data.datasetId!==ds.id||!Array.isArray(data.records))throw Error('The annual file has an unexpected format.');
   cache.set(key,data);while(cache.size>8)cache.delete(cache.keys().next().value);return data;
  });inflight.set(key,pending);pending.finally(()=>inflight.delete(key)).catch(()=>{});
 }
 pending.then(data=>{if(state.requestKey!==key)return;state.rows=data;state.status='ready';model=null;render();}).catch(()=>{if(state.requestKey!==key)return;state.status='error';state.error='This year’s data could not be loaded. Check your connection or retry. Other years may still be available.';render();});
}
const entityMap=ds=>Array.isArray(ds.entities)?Object.fromEntries(ds.entities.map(e=>[String(e.id),e])):(ds.entities||{});
function pairsAtYear(year=currentYear()){
 const ds=dataset();
 const shard=year===currentYear()?state.rows:cache.get(ds.id+':'+year);
 if(!shard)return {pairs:[],excluded:0,unlocated:0,records:0};
 const key=ds.id+':'+year;if(modelKey===key&&model)return model;
 const entities=entityMap(ds),pairs=new Map();let excluded=0;
 for(const row of shard.records){
  const origin=String(row.origin??row.originISO??''),destination=String(row.destination??row.destinationISO??'');
  if(!origin||!destination||origin===destination){excluded++;continue;}
  // The normalized shard's common unit/basis is authoritative. Any per-row conflict is withheld.
  if(row.year!=null&&row.year!==year||row.unit!=null&&ds.unit!=null&&row.unit!==ds.unit||row.basis!=null&&ds.basis!=null&&row.basis!==ds.basis){excluded++;continue;}
  const ids=[origin,destination].sort(),id=ids.join('::');
  if(!pairs.has(id))pairs.set(id,{id,year,a:{id:ids[0],...(entities[ids[0]]||{name:ids[0]})},b:{id:ids[1],...(entities[ids[1]]||{name:ids[1]})},records:[],value:0,known:0});
  const p=pairs.get(id);
  if(p.records.some(r=>r.origin===origin&&r.destination===destination)){excluded++;continue;}
  const valid=Number.isFinite(row.value)&&row.value>=0;
  p.records.push({...row,origin,destination,value:valid?row.value:null});if(valid){p.value+=row.value;p.known++;}
 }
 const all=[...pairs.values()].map(p=>({...p,complete:p.known===2,located:[p.a.lon,p.a.lat,p.b.lon,p.b.lat].every(Number.isFinite)})).sort((a,b)=>b.value-a.value);
 const result={pairs:all,excluded,unlocated:all.filter(p=>!p.located).length,records:shard.records.length};
 if(year===currentYear()){modelKey=key;model=result;}return result;
}
function currencyInfo(v,ds=dataset(),y=currentYear()){return ['GBP','USD'].includes(ds.currency)&&window.AtlasCurrency?AtlasCurrency.convert(v,ds.currency,y,{scale:ds.scale||1,basis:'nominal'}):null;}
function displayUnit(ds=dataset(),y=currentYear()){const fx=currencyInfo(1,ds,y);return fx?AtlasCurrency.unit(fx):ds.unit+' · nominal';}
function amount(v,ds=dataset(),y=currentYear()){if(v==null)return 'Not reported';const fx=currencyInfo(v,ds,y);return (fx?fx.value:Number(v)).toLocaleString('en-US',{notation:fx?'compact':'standard',maximumSignificantDigits:4});}
function conversionNote(v,ds,y){const fx=currencyInfo(v,ds,y);if(!fx)return '';return `<p>${escape(AtlasCurrency.describe(fx))}</p>${fx.cpiBaseSource?.url&&fx.cpiBaseSource.url!==fx.cpiSource?.url?`<p><a href="${escape(fx.cpiBaseSource.url)}" target="_blank" rel="noopener">Base-year US CPI source ↗</a></p>`:''}${fx.cpiSource?.url?`<p><a href="${escape(fx.cpiSource.url)}" target="_blank" rel="noopener">US CPI source ↗</a></p>`:''}${fx.source?.url?`<p><a href="${escape(fx.source.url)}" target="_blank" rel="noopener">Exchange-rate source ↗</a></p>`:''}`;}

function endpointName(id,p){return id===String(p.a.id)?p.a.name:p.b.name;}
function linePath(a,b,globe){
 const interpolate=d3.geoInterpolate([a.lon,a.lat],[b.lon,b.lat]);let path='',previous=null;
 for(let i=0;i<=120;i++){const ll=interpolate(i/120),p=globe?AtlasGlobe.project(...ll):[(ll[0]+180)*3,(90-ll[1])*3];if(!p){previous=null;continue;}path+=(!previous||!globe&&Math.abs(previous[0]-p[0])>540?'M':'L')+p[0].toFixed(2)+','+p[1].toFixed(2);previous=p;}return path;
}
function scopePairs(){const all=pairsAtYear().pairs;return state.focus?all.filter(p=>String(p.a.id)===state.focus||String(p.b.id)===state.focus):all;}
function focusName(){return state.focus?(entityMap(dataset())[state.focus]?.name||state.focus):'World';}
function showDetail(p){
 const ds=dataset(),panel=$('detail'),src=p.records.find(r=>r.source)?.source||ds.source||{};panel.hidden=false;
 const rows=[...p.records];for(const [a,b]of [[p.a,p.b],[p.b,p.a]])if(!rows.some(r=>r.origin===String(a.id)&&r.destination===String(b.id)))rows.push({origin:String(a.id),destination:String(b.id),value:null});
 panel.innerHTML=`<button id="closeTrade" aria-label="Close trade details">×</button><span class="eyebrow">${escape(ds.title)} · ${p.year}</span><h2>${escape(p.a.name)} ↔ ${escape(p.b.name)}</h2><strong class="evidence-value">${amount(p.known?p.value:null)}</strong><p>${escape(displayUnit(ds))} · ${p.complete?'two-way reported value':'incomplete: known direction only'}</p><p>${p.complete?'Sum of both directions, not net trade.':'The opposite direction is missing or unreported. This is not a complete bilateral total.'}</p>${rows.map(r=>`<div class="stat"><b>${escape(endpointName(r.origin,p))} → ${escape(endpointName(r.destination,p))}</b><strong class="trade-direction-value">${amount(r.value)}</strong><small>${escape(displayUnit(ds))}${r.reporterISO?' · reporter '+escape(r.reporterISO):''}${r.flag!=null?' · source '+escape(r.flag):''}</small>${r.flag?`<small>${escape((ds.sourceFlags?.[r.flag]||ds.sourceFlags?.[String(r.flag).replace(/_(IP|XP)$/,'')])?.reference||'See source-code documentation')}${String(r.flag).endsWith('_IP')?' · importer-reported':String(r.flag).endsWith('_XP')?' · exporter-reported':''}</small>`:''}${r.source?.locator?`<small>${escape(r.source.locator)}</small>`:''}</div>`).join('')}<div class="evidence-caveat"><b>Time, place and measurement</b><p>Exact source year only. ISO-based names are reference labels, not necessarily the official name at that date. Country reference connections are not shipping routes, ports, or transport modes. ${p.located?'Endpoints use documented reference locations; they do not imply exact historical territorial equivalence.':'This pair has no verified map endpoints and is therefore available in the evidence browser only.'}</p><p>${escape(ds.basis||'See source methodology.')}</p><p>${escape(ds.measure||'Trade value')}; not physical shipment volume. ${escape(ds.coverageNote||'Missing records mean unavailable evidence, not zero trade.')}</p></div><details><summary>Exact stored figures</summary><p>Headlines are rounded for readability; this does not imply measured precision.</p>${rows.map(r=>`<p>${escape(endpointName(r.origin,p))} → ${escape(endpointName(r.destination,p))}: ${r.value==null?'Not reported':Number(r.value).toLocaleString('en-US',{maximumFractionDigits:12})} ${escape(ds.unit)}</p>`).join('')}</details><h3>Source and attribution</h3>${src.url?`<p><a href="${escape(src.url)}" target="_blank" rel="noopener">${escape(src.title||ds.title)} ↗</a><br><small>${escape(src.author||'')}</small></p>`:''}<p class="muted">${escape(ds.caveats||'Source definitions, reporting and reconstruction methods can change over time. These values are not made comparable across datasets or currencies.')}</p>${ds.license?`<p class="muted"><a href="${escape(ds.license.url)}" target="_blank" rel="noopener">${escape(ds.license.name)}</a> · Downloaded ${escape(ds.retrieved||'')}</p>`:''}<button id="tradeBackList">Browse all links in this view</button>`;
 $('closeTrade').onclick=()=>{state.selected=null;panel.hidden=true;};$('tradeBackList').onclick=()=>{state.selected=null;state.browsing=true;showBrowse();};
}
function select(p){window.AtlasTradeProducts?.close();for(const svg of [map,window.AtlasGlobe?.svg])svg?.querySelector('#tradeInlineBrowser')?.remove();state.selected=p.id;state.browsing=false;if(window.AtlasEvidence)AtlasEvidence.state.selected=null;showMapDetail(p);}
function tradePanel(id,label){
 const globe=window.AtlasGlobe?.isActive(),svg=globe?AtlasGlobe.svg:map,k=globe?1:innerWidth/svg.viewBox.baseVal.width,v=svg.viewBox.baseVal;
 svg.querySelector('#'+id)?.remove();const w=Math.min(430,innerWidth-40),h=Math.max(120,Math.min(470,innerHeight-350));
 const node=svgNode('foreignObject',{id,x:v.x+20/k,y:v.y+220/k,width:w/k,height:h/k});
 const panel=document.createElement('div');panel.setAttribute('xmlns','http://www.w3.org/1999/xhtml');panel.setAttribute('role','region');panel.setAttribute('aria-label',label);
 panel.style.cssText=`box-sizing:border-box;width:${w}px;height:${h}px;transform:scale(${1/k});transform-origin:top left;background:#102a33;color:#e6f1ec;border:1px solid #88b7b3;border-radius:12px;padding:16px;overflow:auto;font:14px/1.5 system-ui;pointer-events:auto`;
 for(const event of ['pointerdown','click','wheel','dblclick'])panel.addEventListener(event,e=>e.stopPropagation());node.append(panel);svg.append(node);return panel;
}
function showBrowse(){
 const panel=tradePanel('tradeInlineBrowser','All trade partners');const list=scopePairs(),q=state.search.toLowerCase().trim(),filtered=list.filter(p=>!q||`${p.a.name} ${p.b.name}`.toLowerCase().includes(q)),shown=filtered.slice(0,state.page*100),ds=dataset();
 panel.innerHTML=`<button id="closeTradeBrowse" aria-label="Close trade browser">×</button><span class="eyebrow">${escape(ds.title)} · ${currentYear()}</span><h2>${escape(focusName())} trade evidence</h2><p>${list.length.toLocaleString()} pairs available in this view. Map line limits do not limit this list.</p>${state.focus?'<button id="countryTradeProducts">Products across all partners</button>':''}<label>Search every loaded partner<input id="tradeSearch" type="search" value="${escape(state.search)}" placeholder="Country or historical entity"></label><p id="tradeSearchCount">${filtered.length.toLocaleString()} matching pairs · ${escape(displayUnit(ds))}</p><div class="evidence-list">${shown.map((p,i)=>`<button data-trade-pair="${i}">${escape(p.a.name)} ↔ ${escape(p.b.name)}<small>${amount(p.known?p.value:null)} · ${p.complete?'both directions':'incomplete'}${p.located?'':' · location unavailable'}</small></button>`).join('')}</div>${shown.length<filtered.length?'<button id="tradeMore">Show next 100</button>':''}<p class="muted">Zero is shown only when reported. Missing directions stay unavailable. Entity names and definitions follow this dataset.</p>`;
 panel.querySelectorAll('[data-trade-pair]').forEach(b=>b.onclick=()=>select(shown[+b.dataset.tradePair]));
 const products=panel.querySelector('#countryTradeProducts');if(products)products.onclick=()=>window.AtlasTradeProducts?.showCountry(window.AtlasTradeProducts.referenceId(entityMap(dataset())[state.focus],currentYear()));
 $('closeTradeBrowse').onclick=()=>{state.browsing=false;panel.parentNode.remove();};
 $('tradeSearch').oninput=e=>{const input=e.target,start=input.selectionStart;state.search=input.value;state.page=1;showBrowse();$('tradeSearch').focus();$('tradeSearch').setSelectionRange(start,start);};
 if($('tradeMore'))$('tradeMore').onclick=()=>{state.page++;showBrowse();};
}
function svgNode(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;}
function jumpYear(year){if(!years.includes(year)){$('geography').value='auto';changeGeography();}setBoundaryDate(year+'-01-01');const id=window.AtlasCountryCanvas?.getCountryId();if(id)focusReferenceCountry(id);}
function activate(){state.active=true;if(historicalActive()&&!historicalReference&&historicalSelection)linkSelection('hist:'+historicalSelection);else if(selected)linkSelection('ref:'+selected);state.selected=null;state.browsing=false;if(window.AtlasEvidence){AtlasEvidence.state.layer='tradeflows';AtlasEvidence.state.selected=null;}layerBar.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw();}
function nearestNavigation(ds){
 const ys=ds.years.slice().sort((a,b)=>a-b),y=currentYear(),before=ys.filter(v=>v<y).at(-1),after=ys.find(v=>v>y);
 return `<div class="trade-year-nav">${before!=null?`<button data-trade-year="${before}">← ${before}</button>`:''}${after!=null?`<button data-trade-year="${after}">${after} →</button>`:''}</div>`;
}
function render(){
 for(const svg of [map,window.AtlasGlobe?.svg]){svg?.querySelector('#tradeFlowLines')?.remove();svg?.querySelector('#tradeInlineLabel')?.remove();svg?.querySelector('#tradeInlineStatus')?.remove();svg?.querySelector('#tradeInlineBrowser')?.remove();}tradeNote.hidden=!state.active;mapCard.hidden=!state.active||!state.selected;if(!state.active){window.AtlasTradeProducts?.close();return;}
 ensureYear();const ds=dataset(),globe=window.AtlasGlobe?.isActive(),svg=globe?AtlasGlobe.svg:map;svg.querySelector('#economicMarkers')?.remove();
 const data=pairsAtYear(),pairs=scopePairs(),cap=state.focus?((globe?AtlasGlobe.getZoom():z)>2?Infinity:50):30,located=pairs.filter(p=>p.located&&p.value>0),visible=located.slice(0,cap),max=data.pairs.reduce((m,p)=>Math.max(m,p.value),0),k=globe?1:innerWidth/svg.viewBox.baseVal.width;
 const group=svgNode('g',{id:'tradeFlowLines'});
 for(const p of visible){const route=linePath(p.a,p.b,globe);if(!route)continue;const width=max?12*p.value/max:0;
  const node=svgNode('g',{class:'trade-flow',role:'button',tabindex:'0','aria-label':`${p.a.name} and ${p.b.name}: ${amount(p.value)} ${displayUnit(ds)}, ${p.complete?'both directions':'incomplete'}, ${p.year}`});
  node.append(svgNode('path',{d:route,fill:'none',stroke:p.complete?'#86d6de':'#e5bd86','stroke-width':width/k,'stroke-opacity':'.85','stroke-linecap':'round','stroke-dasharray':p.complete?'none':`${5/k} ${3/k}`,class:'trade-value-line'}));
  node.append(svgNode('path',{d:route,fill:'none',stroke:'transparent','stroke-width':16/k,'pointer-events':'stroke'}));node.append(svgNode('title',{},`${p.a.name} ↔ ${p.b.name} · ${amount(p.value)} ${displayUnit(ds)} · ${p.complete?'two-way':'incomplete'}`));
  node.addEventListener('pointerdown',e=>e.stopPropagation());node.addEventListener('click',e=>{e.stopPropagation();select(p);});node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();select(p);}});group.append(node);
 }
 const endpoints=new Map(visible.flatMap(p=>[[p.a.id,p.a],[p.b.id,p.b]]));
 for(const c of endpoints.values()){const p=globe?AtlasGlobe.project(c.lon,c.lat):[(c.lon+180)*3,(90-c.lat)*3];if(!p)continue;
  const point=svgNode('g',{class:'trade-endpoint',role:'button',tabindex:'0','aria-label':`Show all loaded trade partners of ${c.name}`});
  point.append(svgNode('circle',{cx:p[0],cy:p[1],r:5/k,fill:'#d5f2ee',stroke:'#142e3a','stroke-width':1/k}));
  if(visible.length<=12||String(c.id)===state.focus||(globe?AtlasGlobe.getZoom():z)>2.5)point.append(svgNode('text',{x:p[0]+8/k,y:p[1]-7/k,'font-size':11/k,style:`stroke-width:${3/k}px`,class:'trade-country-label','pointer-events':'none'},c.name));
  point.addEventListener('pointerdown',e=>e.stopPropagation());const focus=()=>{window.AtlasTradeProducts?.close();state.focus=String(c.id);state.focusWarning=null;state.selected=null;state.browsing=false;render();};point.addEventListener('click',e=>{e.stopPropagation();focus();});point.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();focus();}});group.append(point);
 }
 svg.append(group);
 const note=$('evidenceCoverage');
 if(state.status==='loading')note.textContent=`Loading ${ds.title} for ${currentYear()}…`;
 else if(state.status==='error')note.textContent=state.error;
 else if(state.status==='unavailable')note.textContent=`${ds.title} has no loaded year ${currentYear()}. Choose an available year below; no values are carried between years.`;
 else note.textContent=`${focusName()}: ${pairs.length.toLocaleString()} pairs at ${currentYear()}. Map selects ${visible.length} largest located positive-value links${located.length>cap?` of ${located.length.toLocaleString()} (map limit ${cap})`:''}. Rotate or pan to see their locations. All pairs remain searchable.`;
 const vb=svg.viewBox.baseVal,statusGroup=svgNode('g',{id:'tradeInlineStatus'}),sx=vb.x+24/k,sy=vb.y+115/k;
 const statusText=state.status==='ready'?`${focusName()} · ${pairs.length} partner pairs · ${currentYear()} · ${displayUnit(ds)}`:state.status==='unavailable'?`No trade observations at ${currentYear()}`:state.status==='loading'?'Loading trade observations…':state.error||'Trade unavailable';
 statusGroup.append(svgNode('text',{x:sx,y:sy,'font-size':14/k,fill:'#e1f2ec',stroke:'#122c36','stroke-width':4/k,'paint-order':'stroke'},statusText));
 statusGroup.append(svgNode('text',{x:sx,y:sy+20/k,'font-size':11/k,fill:'#bcd7d5',stroke:'#122c36','stroke-width':4/k,'paint-order':'stroke'},'Click a connection for values and source; country endpoints reveal partners.'));
 const back=svgNode('g',{role:'button',tabindex:'0','aria-label':'Return to country indicators',style:'cursor:pointer'});back.append(svgNode('text',{x:sx,y:sy+43/k,'font-size':13/k,fill:'#f5db9e',stroke:'#122c36','stroke-width':4/k,'paint-order':'stroke'},'← Country indicators'));const goBack=()=>{deactivate();window.AtlasCountryCanvas?.focusCountry(window.AtlasCountryCanvas?.getCountry()?.id||selected,{fit:true});draw();};back.addEventListener('pointerdown',ev=>ev.stopPropagation());back.addEventListener('click',goBack);back.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.stopPropagation();goBack();}});statusGroup.append(back);
 const productCountry=(state.focus?window.AtlasTradeProducts?.referenceId(entityMap(ds)[state.focus],currentYear()):null)||state.referenceCountry;if(productCountry){const products=svgNode('g',{role:'button',tabindex:'0','aria-label':'Explore traded products for this country',style:'cursor:pointer'});products.append(svgNode('text',{x:sx,y:sy+90/k,'font-size':13/k,fill:'#f5db9e',stroke:'#122c36','stroke-width':4/k,'paint-order':'stroke'},'Products · all recorded partners →'));const openProducts=()=>window.AtlasTradeProducts?.showCountry(productCountry);products.addEventListener('pointerdown',e=>e.stopPropagation());products.addEventListener('click',e=>{e.stopPropagation();openProducts();});products.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openProducts();}});statusGroup.append(products);}
 if(state.status==='unavailable'){const previous=ds.years.filter(y=>y<currentYear()).at(-1);if(previous){const b=svgNode('g',{role:'button',tabindex:'0','aria-label':`Show last available trade year ${previous}`,style:'cursor:pointer'});b.append(svgNode('text',{x:sx,y:sy+65/k,'font-size':12/k,fill:'#d5e4dc',stroke:'#122c36','stroke-width':4/k,'paint-order':'stroke'},`Last record: ${previous} · show its dated connections →`));const jump=()=>jumpYear(previous);b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',jump);b.addEventListener('keydown',e=>{if(e.key==='Enter')jump();});statusGroup.append(b);}}
 if(state.status==='ready'){const browse=svgNode('g',{role:'button',tabindex:'0','aria-label':'Browse all trade partners',style:'cursor:pointer'});browse.append(svgNode('text',{x:sx,y:sy+66/k,'font-size':13/k,fill:'#f5db9e',stroke:'#122c36','stroke-width':4/k,'paint-order':'stroke'},`All ${pairs.length} partner pairs →`));const open=()=>{state.selected=null;state.browsing=true;state.page=1;showBrowse();};browse.addEventListener('pointerdown',e=>e.stopPropagation());browse.addEventListener('click',open);browse.addEventListener('keydown',e=>{if(e.key==='Enter'){e.stopPropagation();open();}});statusGroup.append(browse);}
 svg.append(statusGroup);
 tradeNote.innerHTML=`<p><a href="trade-sources.html" target="_blank" rel="noopener">Coverage, units & full data ↗</a></p><label class="trade-dataset-label">TRADE DATASET<select id="tradeDataset"><option value="auto" ${state.datasetAuto?'selected':''}>Automatic by year · ${escape(ds.title)}</option>${datasets().map(d=>`<option value="${escape(d.id)}" ${!state.datasetAuto&&d.id===ds.id?'selected':''}>${escape(d.title)}</option>`).join('')}</select></label><p class="trade-basis">${escape(displayUnit(ds))} · ${escape(ds.basis||'Source basis retained')}</p><p>Monetary display: ${window.AtlasCurrency?.state.mode==='constant'?'constant 2024 USD where FX and CPI exist':'nominal USD'}. Missing conversions are explicitly labeled; source definitions still differ across years.</p>${state.focusWarning?`<p>${escape(state.focusWarning)}</p>`:''}${state.status==='ready'?`<div class="trade-scale"><i style="border-top-width:3px"></i><span>${amount(max/4)}</span><i style="border-top-width:12px"></i><span>${amount(max)}</span></div><p>Width is linear in reported value, using one scale for this dataset and year. Solid: both directions. Dashed: incomplete. These connections are not shipping routes.</p><p>Across this dataset/year, ${data.unlocated.toLocaleString()} pairs lack verified endpoints; ${data.excluded.toLocaleString()} conflicting or duplicate records withheld. Click a country endpoint to focus its partners.</p><button type="button" id="tradeBrowse">Search all ${pairs.length.toLocaleString()} pairs</button>`:''}${state.focus?'<button type="button" id="tradeWorld">World links</button>':''}${state.status==='error'?'<button type="button" id="tradeRetry">Retry year</button>':''}${nearestNavigation(ds)}`;
 $('tradeDataset').onchange=e=>{state.datasetAuto=e.target.value==='auto';state.datasetId=state.datasetAuto?null:e.target.value;state.focus=null;state.focusWarning=null;state.selected=null;state.browsing=false;resetYear();render();};
 tradeNote.querySelectorAll('[data-trade-year]').forEach(b=>b.onclick=()=>jumpYear(+b.dataset.tradeYear));
 if($('tradeBrowse'))$('tradeBrowse').onclick=()=>{state.selected=null;state.browsing=true;state.page=1;showBrowse();};
 if($('tradeWorld'))$('tradeWorld').onclick=()=>{state.focus=null;state.focusWarning=null;state.selected=null;state.browsing=false;render();};
 if($('tradeRetry'))$('tradeRetry').onclick=()=>{resetYear();render();};
 if(state.selected){const p=pairs.find(p=>p.id===state.selected);if(p)showMapDetail(p);else if(state.status!=='loading'){state.selected=null;}}
 if(state.browsing&&state.status==='ready')showBrowse();
 window.AtlasTradeProducts?.render();
}
function linkSelection(id){
 state.referenceCountry=id.startsWith('ref:')?id.slice(4):null;
 const ds=dataset(),y=currentYear();let kind='reference',selectionId=id.replace(/^ref:/,'');
 if(id.startsWith('hist:')){kind=globalBorders()?'world':cliopatria()?'cliopatria':'europe';selectionId=id.slice(5);}
 const matches=Object.entries(entityMap(ds)).filter(([key,entity])=>(entity.mapLinks||[]).some(link=>link.kind===kind&&String(link.id)===selectionId&&(link.from==null||link.from<=y)&&(link.to==null||y<=link.to)));
 state.focus=matches.length===1?matches[0][0]:null;state.focusWarning=matches.length===1?null:'No unique dated trade-entity match for this territory in this dataset. Showing world links; select a trade endpoint or search the evidence.';state.selected=null;state.browsing=false;
}
const mapCard={hidden:true}; // Legacy visibility state only; no floating window is created.
function deactivate(){window.AtlasTradeProducts?.close();state.active=false;state.selected=null;state.browsing=false;mapCard.hidden=true;tradeNote.hidden=true;button.setAttribute('aria-pressed','false');for(const svg of [map,window.AtlasGlobe?.svg]){svg?.querySelector('#tradeFlowLines')?.remove();svg?.querySelector('#tradeInlineLabel')?.remove();svg?.querySelector('#tradeInlineStatus')?.remove();svg?.querySelector('#tradeInlineBrowser')?.remove();}}
function focusReferenceCountry(id){window.AtlasTradeProducts?.close();state.active=true;state.selected=null;state.browsing=false;state.datasetAuto=true;dataset();linkSelection('ref:'+id);if(state.focus)state.focusWarning='National merchandise trade context only; these values do not identify a particular industry’s customers or sales.';if(window.AtlasEvidence){AtlasEvidence.state.layer='tradeflows';AtlasEvidence.state.selected=null;}layerBar.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('detail').hidden=true;draw();return !!state.focus;}
function showMapDetail(p){
 const ds=dataset(),panel=tradePanel('tradeInlineLabel','Trade connection details');
 const rows=[[p.a,p.b],[p.b,p.a]].map(([a,b])=>{const r=p.records.find(r=>r.origin===String(a.id)&&r.destination===String(b.id));return `<p>${escape(a.name)} → ${escape(b.name)}<br><strong>${amount(r?.value??null,ds,p.year)} ${escape(displayUnit(ds,p.year))}</strong></p>${conversionNote(r?.value??null,ds,p.year)}`;}).join('');
 panel.innerHTML=`<button id="closeTradeMap" aria-label="Close trade explanation">×</button><h3>${escape(p.a.name)} ↔ ${escape(p.b.name)}</h3><p><strong>${amount(p.known?p.value:null,ds,p.year)} ${escape(displayUnit(ds,p.year))} · ${p.year}</strong><br>${p.complete?'Both directions reported; sum, not net trade.':'Incomplete: known direction only.'}</p>${conversionNote(p.known?p.value:null,ds,p.year)}${rows}<p>Annual national merchandise trade, not factory income, profit, or a sailed route. Source values are nominal; display applies the selected FX/CPI conversion where supported. Inflation adjustment does not harmonize changing trade definitions. ${p.located?'':'Map location unavailable; this record remains accessible here.'}</p><a href="${escape(ds.source?.url||'trade-sources.html')}" target="_blank" rel="noopener">Source ↗</a><p><button id="openTradeProducts">Traded products · both directions</button><button id="backTradeMap">All trade partners</button></p>`;
 window.AtlasCurrency?.control(panel);
 $('openTradeProducts').onclick=()=>window.AtlasTradeProducts?.showPair(p);
 $('closeTradeMap').onclick=()=>{state.selected=null;panel.parentNode.remove();};$('backTradeMap').onclick=()=>{state.selected=null;panel.parentNode.remove();state.browsing=true;showBrowse();};
}
const layerBar=document.querySelector('.economic-layers');if(!layerBar)return;
const button=document.createElement('button');button.type='button';button.dataset.layer='tradeflows';button.textContent='Trade flows';button.setAttribute('aria-pressed','false');layerBar.append(button);
const tradeNote=document.createElement('div');tradeNote.id='tradeLayerNote';tradeNote.hidden=true;$('evidenceCoverage').after(tradeNote);
button.onclick=activate;
layerBar.addEventListener('click',e=>{const other=e.target.closest('[data-layer]');if(other&&other!==button){state.active=false;state.selected=null;state.browsing=false;button.setAttribute('aria-pressed','false');tradeNote.hidden=true;}},true);
const originalChoose=choose;choose=function(id){if(state.active)linkSelection(String(id));return originalChoose(id);};
const originalDraw=draw;draw=function(){originalDraw();render();};
window.addEventListener('atlas:globe-render',render);window.addEventListener('atlas:view-change',render);
// Leave the trade layer with a deliberate background click, never a drag or a control click.
let backgroundPress=null;
const tradeControl=target=>target?.closest?.('#tradeFlowLines,#tradeInlineLabel,#tradeInlineBrowser,#tradeInlineStatus,#tradeProductExplorer,button,a,input,select,textarea,[role="button"]');
for(const svg of [map,window.AtlasGlobe?.svg].filter(Boolean)){
 svg.addEventListener('pointerdown',e=>{backgroundPress=state.active&&e.isPrimary!==false&&e.button===0&&!tradeControl(e.target)?{svg,x:e.clientX,y:e.clientY,moved:false}:null;},true);
 svg.addEventListener('pointerup',e=>{const press=backgroundPress;if(!state.active||!press||press.svg!==svg||press.moved||Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)return;backgroundPress=null;deactivate();draw();},true);
 svg.addEventListener('click',e=>{const press=backgroundPress;backgroundPress=null;if(!state.active||!press||press.svg!==svg||press.moved||tradeControl(e.target)||Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)return;e.preventDefault();e.stopImmediatePropagation();deactivate();draw();},true);
}
window.addEventListener('pointermove',e=>{if(backgroundPress&&Math.hypot(e.clientX-backgroundPress.x,e.clientY-backgroundPress.y)>6)backgroundPress.moved=true;},true);
window.addEventListener('pointercancel',()=>{backgroundPress=null;},true);
window.addEventListener('wheel',()=>{backgroundPress=null;},true);
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!state.active||e.defaultPrevented)return;e.preventDefault();if(window.AtlasTradeProducts?.state.open){AtlasTradeProducts.close();return;}if(state.selected||state.browsing){state.selected=null;state.browsing=false;render();return;}deactivate();draw();});
window.AtlasTrade={state,fetchJSON,panel:tradePanel,render,pairsAtYear,linePath,datasets,activate,deactivate,focusReferenceCountry,browse:()=>{state.browsing=true;state.page=1;showBrowse();}};
})();

/* Source-backed economic features. Load after global.js, before globe.js. */
(function(){
 const state={layer:'all',selected:null,menu:null,spider:null};
 const layers=[['all','Explore'],['production','Production'],['livelihoods','Livelihoods'],['trade','Trade'],['transport','Transport'],['gdp','GDP/person'],['pop','Population'],['life','Life expectancy'],['exports','Exports'],['development','Development'],['happiness','Happiness'],['hdi','HDI'],['school_mean','Schooling'],['water','Drinking water'],['sanitation','Sanitation'],['electricity','Electricity'],['infant_mortality','Infant mortality'],['poverty','Poverty'],['gini','Inequality'],['under5_mortality','Child mortality'],['poverty_lower_middle','Poverty · $4.20'],['poverty_upper_middle','Poverty · $8.30'],['events','Wars & crises']];
 const colors={production:'#e8b971',livelihoods:'#a2d6b2',trade:'#91cbe8',transport:'#d5b3eb',events:'#f3a18b',stat:'#f2d88e'};
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const numeric=()=>['gdp','pop'].includes(state.layer)||!!ExtendedData.indicators[state.layer];
 const development=()=>state.layer==='development';
 const developmentData=()=>window.HistoricalDevelopment;
 function developmentRecords(){return (developmentData()?.series||[]).flatMap(s=>{const v=s.values.filter(v=>v.year<=year()).sort((a,b)=>b.year-a.year)[0],m=s.mapReference;return v&&m?[{id:'development:'+s.sourcePlaceName,title:s.sourcePlaceName,place:s.sourcePlaceName,lon:m.lon,lat:m.lat,category:'stat',value:v.value,development:v,reference:m,observation:{status:v.year===year()?'exact':'last',sourceYear:v.year}}]:[];});}
 const records=()=>[...(window.EconomicEvidence?.records||[]),...(window.AtlasEvents?.mapRecords()||[])];
 const year=()=>years[idx];
 function activeRecords(){const all=records(),active=all.filter(r=>r.startYear<=year()&&year()<=r.endYear&&(state.layer==='all'||r.category===state.layer)&&Number.isFinite(r.lon)&&Number.isFinite(r.lat));if(state.layer==='all'||state.layer==='livelihoods'){const baskets=all.filter(r=>r.id.startsWith('uga-basket-')&&r.endYear<=year()).sort((a,b)=>b.endYear-a.endYear);if(baskets.length&&!active.some(r=>r.id.startsWith('uga-basket-'))){const r=baskets[0];active.push({...r,title:r.title+' · last available',observation:{status:'last',sourceYear:r.endYear,periodStart:r.endYear,periodEnd:r.endYear,targetYear:year()}});}}return active;}
 function numericRecords(){return D.countries.filter(c=>Number.isFinite(c.lon)&&Number.isFinite(c.lat)).flatMap(c=>{let o=window.AtlasObservations.resolve(c,state.layer,year());return o.value==null?[]:[{id:'series:'+c.id,title:c.name,place:c.name,lon:c.lon,lat:c.lat,category:'stat',value:state.layer==='pop'?o.value*1000:o.value,country:c,observation:o}];});}
 const units=()=>development()?'AHDI (0–1)':({gdp:'2011 international dollars',pop:'people'})[state.layer]||ExtendedData.indicators[state.layer]?.unit||'';
 function recordTiming(r){if(r.development)return r.development.year===year()?`Benchmark ${r.development.year}`:`Last available benchmark: ${r.development.year}; not a ${year()} observation`;return r.observation?window.AtlasObservations.describe(r.observation):'';}
 const controls=document.querySelector('.controls');
 const advanced=document.createElement('details');advanced.className='atlas-settings';advanced.innerHTML='<summary>Place search & boundary settings</summary>';
 while(controls.firstChild)advanced.appendChild(controls.firstChild);
 controls.appendChild(advanced);
 const panel=document.createElement('div');panel.className='economic-tools';panel.innerHTML='<span class="eyebrow">EXPLORE THE ECONOMY</span><div class="economic-layers" aria-label="Economic map layers">'+layers.map(([id,name])=>`<button data-layer="${id}" aria-pressed="${id===state.layer}">${name}</button>`).join('')+'</div><p id="evidenceCoverage" aria-live="polite"></p><p class="map-hint">Read country values on the map. Select a point for nearby actions; select a cluster to zoom into it. Full evidence is optional.</p><details><summary>About the evidence</summary><p>Research is growing. No marker means no loaded evidence, not no economic activity. Historical accounts, attributed estimates and numerical series remain distinct. Broad periods are contextual windows, not annual observations.</p><a href="economic-evidence.json" target="_blank">Download local evidence ↗</a><br><a href="wellbeing-sources.html">Wellbeing sources, dates & interpolation ↗</a></details>';
 controls.prepend(panel);
 const benchmarkTools=document.createElement('div');benchmarkTools.className='development-benchmarks';panel.appendChild(benchmarkTools);
 const eventTools=document.createElement('div');eventTools.className='event-tools';panel.appendChild(eventTools);eventTools.addEventListener('click',ev=>{const b=ev.target.closest('[data-event-jump]');if(b)setBoundaryDate(b.dataset.eventJump+'-01-01');});
 benchmarkTools.addEventListener('click',ev=>{const b=ev.target.closest('[data-development-year]');if(!b)return;const y=+b.dataset.developmentYear;if(!years.includes(y)){$('geography').value='auto';changeGeography();}setBoundaryDate(y+'-01-01');});
 $('exploreIberia').hidden=true;
 panel.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>selectLayer(b.dataset.layer));
 function renderDetail(r){
   if(!r)return;
   const p=$('detail');p.hidden=false;
   if(r.development){const d=developmentData();p.innerHTML=`<button id="closeDevelopment" aria-label="Close development detail">×</button><span class="eyebrow">PUBLISHED HISTORICAL RECONSTRUCTION · ${r.development.year}</span><h2>${e(r.title)}</h2><strong class="evidence-value">${r.value.toFixed(3)}</strong><h3>Augmented Human Development Index</h3><p>Four dimensions: health, education, income and freedom (liberal democracy). This is AHDI, not official UNDP HDI or an occupational living-conditions score.</p>${Object.entries(r.development.components).map(([key,c])=>`<div class="stat development-component"><b>${e(({income:"Income",longevity:"Health",schooling:"Education",freedom:"Freedom"})[key])}</b><strong>${c.value.toLocaleString('en-US',{maximumFractionDigits:2})}</strong><small>${e(c.unit)}</small></div>`).join('')}<div class="evidence-caveat"><b>${e(recordTiming(r))}</b><p>Published national reconstruction. No annual interpolation. Source decimals are not uncertainty bounds.</p><p>Point locates a statistical series; it is not a measurement of this town or a match to the historical territory beneath it.</p></div><p><a href="${e(d.sourceUrl)}" target="_blank" rel="noopener">Source, methodology and original workbooks ↗</a></p><p>${e(d.citation)}</p><p>Source cell: ${e(r.development.sourceCell)}. Reuse: CC BY 4.0; map extraction and display adapted for this atlas.</p><a href="development-data.json" download>Download all 162 source series, including unmapped units</a>`;$('closeDevelopment').onclick=()=>{state.selected=null;p.hidden=true;};return;}
   if(r.country){p.querySelector('.evidence-focus')?.remove();p.insertAdjacentHTML('afterbegin',`<section class="evidence-focus"><span class="eyebrow">STATISTICAL REFERENCE POINT · ${year()}</span><h2>${e(r.country.name)}</h2><strong class="evidence-value">${r.value.toLocaleString('en-US',{maximumFractionDigits:2})}</strong><p>${e(layers.find(x=>x[0]===state.layer)?.[1])} · ${e(units())}</p><p class="evidence-timing">${e(recordTiming(r))}</p><p><a href="${e(r.observation.sourceUrl)}" target="_blank" rel="noopener">Source and original data ↗</a></p><p class="muted">Point locates a statistical series. It is not a local measurement or a match to the historical territory beneath it.</p></section>`);return;}
   const sources=[...(Array.isArray(r.sources)?r.sources:r.source?[r.source]:[]),...(r.additionalSources||[])];
   p.innerHTML=`<button id="closeEvidence" aria-label="Close evidence">×</button><span class="eyebrow">${e(r.category)} · ${e(r.evidenceType||'Descriptive account')}</span><h2>${e(r.title)}</h2>${r.observation?`<p class="evidence-timing">${e(recordTiming(r))}</p>`:''}<p>${e(r.place)} · ${r.startYear===r.endYear?r.startYear:r.startYear+'–'+r.endYear}</p><p class="evidence-summary">${e(r.summary)}</p>${r.displaySummary?`<strong class="evidence-value">${e(r.displaySummary.label)}</strong><p class="muted">${e(r.displaySummary.method||'Rounded summary of comparable source figures; not a confidence interval.')}</p><details><summary>Exact source figures</summary>`:''}${(r.measurements||[]).map(m=>`<div class="stat"><b>${e(m.name)}</b><strong class="evidence-value">${e(m.value)}</strong><small>${e(m.unit)} · ${e(m.definition||'Source-reported figure')}</small></div>`).join('')}${r.displaySummary?'</details>':''}${r.value!=null?`<strong class="evidence-value">${e(r.value)}</strong><p>${e(r.unit||'')}</p>`:''}<div class="evidence-caveat"><b>Time and place</b><p>${e(r.timeCaveat||'Source-supported historical context; not an annual measurement.')}</p><p>${e(r.spatialCaveat||'Representative location; not a boundary or measured area.')}</p></div><h3>Evidence and attribution</h3>${sources.map(s=>`<p><a href="${e(s.url)}" target="_blank" rel="noopener">${e(s.title||s.author||'Source')} ↗</a><br><small>${e(s.locator||s.page||'See source description')}${s.author?' · '+e(s.author):''}</small></p>`).join('')}<p class="muted">${e([r.uncertainty,r.additionalCaveat,r.caveats].filter(Boolean).join(' ')||'This initial research batch is selective. It does not represent the full economy of this place.')}</p><details><summary>Review and reuse</summary><p>${e(r.reviewStatus||'Initial source review')}</p><p>${e(r.reuse?.status||r.license?.name||'See source reuse terms')}</p>${(r.reuse?.licenseUrl||r.license?.url)?`<a href="${e(r.reuse?.licenseUrl||r.license?.url)}" target="_blank" rel="noopener">Source license ↗</a>`:''}</details>${r.referenceCountryId?`<button id="eventGdp">Compare GDP for ${e(r.place.split(' · ')[0])}</button>`:''}<button id="backToTerritory">Return to territory details</button>`;
   if($('eventGdp'))$('eventGdp').onclick=()=>{state.layer='gdp';metric='gdp';state.selected=null;panel.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.layer==='gdp'?'true':'false'));choose(r.referenceCountryId);const point=numericRecords().find(p=>p.country.id===r.referenceCountryId);if(point){state.selected=point.id;renderDetail(point);}};
   $('closeEvidence').onclick=()=>{state.selected=null;p.hidden=true;};$('backToTerritory').onclick=()=>{state.selected=null;draw();};
 }
 function inspect(r){
   closeMenu();if(r.country){state.selected=null;choose(r.country.id);}state.selected=r.id;renderDetail(r);
 }
 function allRows(){return development()?developmentRecords():numeric()?numericRecords():activeRecords();}
 function closeMenu(){state.menu=null;mapMenu.hidden=true;}
 function selectLayer(key,options={}){
   if(!layers.some(([id])=>id===key))return;
   window.AtlasTrade?.deactivate?.();state.layer=key;state.selected=null;state.spider=null;closeMenu();if(numeric())metric=key;
   panel.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layer===key)));
   $('detail').hidden=true;if(typeof historicalPanelHidden!=='undefined')historicalPanelHidden=true;
   draw();if(options.countryId){const r=allRows().find(r=>r.country?.id===options.countryId||r.referenceCountryId===options.countryId);if(r)select(r);}
 }
 const mapMenu=document.createElement('div');mapMenu.id='economicMapMenu';mapMenu.className='economic-map-menu glass';mapMenu.hidden=true;mapMenu.tabIndex=-1;mapMenu.setAttribute('role','dialog');mapMenu.setAttribute('aria-modal','false');mapMenu.setAttribute('aria-label','Map feature actions');document.body.append(mapMenu);
 mapMenu.addEventListener('pointerdown',ev=>ev.stopPropagation());mapMenu.addEventListener('wheel',ev=>ev.stopPropagation());mapMenu.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Escape'){closeMenu();(window.AtlasGlobe?.isActive()?AtlasGlobe.svg:map).focus();}});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&state.menu)closeMenu();});
 const icons={production:'▥',livelihoods:'⌂',trade:'⇄',transport:'➝',events:'!'};
 function compactValue(r){
   if(r.value==null)return '';
   let value=r.value.toLocaleString('en-US',{maximumFractionDigits:development()||state.layer==='hdi'?3:['gdp','pop'].includes(state.layer)?0:1,notation:state.layer==='pop'?'compact':'standard'});
   const unit=({gdp:'int.$ / person',pop:'people',happiness:'/ 10',hdi:'HDI',development:'AHDI',life:'years',school_mean:'school years',school_expected:'school years',exports:'% GDP',imports:'% GDP',water:'% people',sanitation:'% people',electricity:'% people',internet:'% people',poverty:'% people',poverty_lower_middle:'% people',poverty_upper_middle:'% people',gini:'Gini',birth_rate:'/ 1,000 people',death_rate:'/ 1,000 people',infant_mortality:'/ 1,000 births',under5_mortality:'/ 1,000 births'})[state.layer]||units();
   return (r.observation?.status==='interpolated'?'≈ ':'')+value+' '+unit;
 }
 function shortTiming(r){
   const o=r.observation;if(r.development)return `${r.development.year}${o?.status==='last'?' · last available':''}`;
   if(o?.status==='interpolated')return `${o.targetYear??year()} estimate · ${o.from}–${o.to}`;
   if(o?.status==='last')return `${o.periodStart!=null&&o.periodStart!==o.periodEnd?o.periodStart+'–'+o.periodEnd:o.sourceYear} · last, not ${year()}`;
   if(o)return o.periodStart!==o.periodEnd?`${o.periodStart}–${o.periodEnd} survey`:`${o.sourceYear??year()} source`;
   return r.startYear===r.endYear?String(r.startYear):`${r.startYear}–${r.endYear}`;
 }
 function countryId(r){return r.country?.id||r.referenceCountryId||null;}
 function select(r){
   state.selected=null;state.menu={id:r.id,record:r};$('detail').hidden=true;if(typeof historicalPanelHidden!=='undefined')historicalPanelHidden=true;
   render();mapMenu.focus({preventScroll:true});
 }
 function screenPoint(p,svg,globe){if(globe)return p;const v=svg.viewBox.baseVal,k=innerWidth/v.width;return [(p[0]-v.x)*k,(p[1]-v.y)*k];}
 function centerOf(items){let x=0,y=0,z=0;for(const {r}of items){const a=r.lon*Math.PI/180,b=r.lat*Math.PI/180;x+=Math.cos(b)*Math.cos(a);y+=Math.cos(b)*Math.sin(a);z+=Math.sin(b);}return [Math.atan2(y,x)*180/Math.PI,Math.atan2(z,Math.hypot(x,y))*180/Math.PI];}
 function zoomCluster(items,globe){
   closeMenu();const [lon,lat]=centerOf(items),zoom=globe?AtlasGlobe.getZoom():z;
   const coincident=items.every(i=>Math.hypot(i.r.lon-items[0].r.lon,i.r.lat-items[0].r.lat)<.025);
   if(coincident||zoom>=(globe?18:80)){
     if(items.length>18){state.menu={choices:items.map(i=>i.r),lon,lat,year:year()};render();mapMenu.focus({preventScroll:true});return;}
     state.spider=items.map(i=>i.r.id).sort().join('|');render();(globe?AtlasGlobe.svg:map).focus({preventScroll:true});return;
   }
   state.spider=null;if(globe)AtlasGlobe.focus(lon,lat,Math.min(20,zoom*1.9));else{cx=(lon+180)*3;cy=(90-lat)*3;z=Math.min(512,z*2);draw();}(globe?AtlasGlobe.svg:map).focus({preventScroll:true});
 }
 function menuMarkup(r,retained){
   const id=countryId(r),numericRecord=!!r.country||!!r.development,sourceUrl=r.observation?.sourceUrl||r.sources?.[0]?.url||r.source?.url;
   return `<button data-map-action="close" class="map-menu-close" aria-label="Close map actions">×</button><span class="eyebrow">${e(numericRecord?'COUNTRY REFERENCE':r.category||'ECONOMIC EVIDENCE')}</span><h2>${e(r.country?.name||r.place||r.title)}</h2>${numericRecord?`<strong class="map-menu-value">${e(compactValue(r))}</strong><p class="map-menu-timing">${e(recordTiming(r)||shortTiming(r))}</p>`:`<p class="map-menu-title">${e(r.title)}</p><p class="map-menu-timing">${e(shortTiming(r))}</p>`}${retained?`<p class="map-menu-warning">Retained dated evidence; it does not cover selected year ${year()}. No new value is inferred.</p>`:''}<div class="map-menu-actions"><button data-map-action="inspect">Inspect sources & details</button>${id?'<button data-map-action="life">Life expectancy</button><button data-map-action="happiness">Happiness</button><button data-map-action="gdp">GDP per person</button>':''}${id&&window.AtlasTrade?.focusReferenceCountry?'<button data-map-action="national-trade">Country trade context</button>':''}${r.marketLinks?.some(link=>(link.fromYear??-Infinity)<=year()&&year()<=(link.toYear??Infinity))&&window.AtlasIndustryMarkets?.show?'<button data-map-action="markets">Documented connections</button>':''}</div>${id&&!numericRecord?'<p class="map-menu-note">Country trade is national context, not this industry’s buyers or shipping routes.</p>':''}${numericRecord?'<p class="map-menu-note">National series at a reference point, not a local measurement.</p>':''}${sourceUrl?`<a href="${e(sourceUrl)}" target="_blank" rel="noopener">Original source ↗</a>`:''}`;
 }
 function renderMenu(rows,svg,globe){
   if(!state.menu){mapMenu.hidden=true;return;}
   let r,retained=false,lon,lat,markup;
   if(state.menu.choices){lon=state.menu.lon;lat=state.menu.lat;markup=`<button data-map-action="close" class="map-menu-close" aria-label="Close map choices">×</button><h2>${state.menu.choices.length} records at this location</h2><p>Choose a map feature.${state.menu.year!==year()?` These records were selected at ${state.menu.year}; dates remain attached.`:''}</p><div class="map-menu-choices">${state.menu.choices.map((r,i)=>`<button data-map-choice="${i}">${e(r.title)}<small>${e(compactValue(r)||shortTiming(r))}</small></button>`).join('')}</div>`;}
   else{r=rows.find(r=>r.id===state.menu.id);retained=!r;r=r||state.menu.record;state.menu.record=r;lon=r.lon;lat=r.lat;markup=menuMarkup(r,retained);}
   const p=globe?AtlasGlobe.project(lon,lat):[(lon+180)*3,(90-lat)*3];
   if(!p){mapMenu.hidden=true;return;}const screen=screenPoint(p,svg,globe);
   if(screen[0]<0||screen[0]>innerWidth||screen[1]<0||screen[1]>innerHeight){mapMenu.hidden=true;return;}
   if(mapMenu.innerHTML!==markup)mapMenu.innerHTML=markup;mapMenu.hidden=false;
   const width=Math.min(300,innerWidth-24),h=Math.min(mapMenu.offsetHeight||280,innerHeight*.55),top=Math.max(74,Math.min(innerHeight-h-135,screen[1]-24));
   mapMenu.style.width=width+'px';mapMenu.style.left=Math.max(12,Math.min(innerWidth-width-12,screen[0]+16))+'px';mapMenu.style.top=top+'px';
   mapMenu.onclick=ev=>{const choice=ev.target.closest('[data-map-choice]');if(choice){select(state.menu.choices[+choice.dataset.mapChoice]);return;}const action=ev.target.closest('[data-map-action]')?.dataset.mapAction;if(!action)return;if(action==='close'){closeMenu();return;}if(!r)return;
     if(action==='inspect'){inspect(r);return;}
     if(action==='markets'){closeMenu();window.AtlasIndustryMarkets.show(r);return;}
     const id=countryId(r);if(!id)return;if(action==='national-trade'){closeMenu();window.AtlasTrade.focusReferenceCountry(id);return;}selectLayer(action,{countryId:id});
   };
 }
 function render(){
   const globe=window.AtlasGlobe?.isActive();const svg=globe?window.AtlasGlobe.svg:map;if(!svg)return;
   svg.querySelector('#economicMarkers')?.remove();if(window.AtlasCountryCanvas?.active()){closeMenu();return;}if(state.layer==='tradeflows')closeMenu();document.body.classList.toggle('atlas-numeric-labels',numeric()||development());const rows=allRows();
   const width=innerWidth,height=innerHeight,vb=svg.viewBox.baseVal,k=globe?1:width/vb.width,zoom=globe?AtlasGlobe.getZoom():z;
   const project=r=>globe?AtlasGlobe.project(r.lon,r.lat):[(r.lon+180)*3,(90-r.lat)*3];
   let points=rows.map(r=>({r,p:project(r)})).filter(x=>x.p&&x.p.every(Number.isFinite)).filter(({p})=>{const q=screenPoint(p,svg,globe);return q[0]>=0&&q[0]<=width&&q[1]>=0&&q[1]<=height;});
   const cell=(numeric()||development()?34:42)/k,groups=[];
   for(const point of points){let cluster=groups.find(items=>{const x=items.reduce((v,i)=>v+i.p[0],0)/items.length,y=items.reduce((v,i)=>v+i.p[1],0)/items.length;return Math.hypot(x-point.p[0],y-point.p[1])<cell;});if(cluster)cluster.push(point);else groups.push([point]);}
   const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.id='economicMarkers';
   const occupied=[];for(const element of document.querySelectorAll('header,.controls,footer,#detail:not([hidden]),.atlas-view-toggle')){const b=element.getBoundingClientRect();if(b.width&&b.height)occupied.push({x:b.left,y:b.top,w:b.width,h:b.height});}
   // Reserve every marker before placing any label, including markers drawn later.
   for(const items of groups){const center=[items.reduce((v,i)=>v+i.p[0],0)/items.length,items.reduce((v,i)=>v+i.p[1],0)/items.length],key=items.map(i=>i.r.id).sort().join('|');
     const positions=items.length>1&&state.spider===key?items.map((item,i)=>{const ring=Math.floor(i/9)+1,angle=(i%9)/Math.min(9,items.length)*Math.PI*2-Math.PI/2,radius=(46+26*ring)/k;return [center[0]+Math.cos(angle)*radius,center[1]+Math.sin(angle)*radius];}):[center];
     for(const position of positions){const p=screenPoint(position,svg,globe),radius=items.length>1&&state.spider!==key?18:13;occupied.push({x:p[0]-radius,y:p[1]-radius,w:radius*2,h:radius*2});}
   }
   let labelCount=0;const budget=zoom<1.5?12:zoom<3?28:zoom<6?60:160;
   function label(node,r,p){
     if(labelCount>=budget)return;const numericRecord=!!r.country||!!r.development;if(!numericRecord&&zoom<1.6)return;
     const name=numericRecord?r.country?.name||r.title:r.title,lines=[name.length>31?name.slice(0,29)+'…':name,numericRecord?compactValue(r):shortTiming(r),...(numericRecord?[shortTiming(r)]:[])];
     const screen=screenPoint(p,svg,globe),w=Math.min(224,Math.max(...lines.map(s=>s.length))*6.1+14),h=lines.length*15+8;
     let box;for(const side of [1,-1]){const candidate={x:side===1?screen[0]+19:screen[0]-w-19,y:screen[1]-h/2,w,h};if(candidate.x<4||candidate.x+w>width-4||candidate.y<72||candidate.y+h>height-120)continue;if(!occupied.some(b=>candidate.x<b.x+b.w+4&&candidate.x+candidate.w+4>b.x&&candidate.y<b.y+b.h+3&&candidate.y+candidate.h+3>b.y)){box=candidate;break;}}
     if(!box)return;occupied.push(box);labelCount++;const dx=(box.x-screen[0])/k,dy=(box.y-screen[1])/k;
     node.insertAdjacentHTML('beforeend',`<g class="economic-map-label"><rect x="${dx}" y="${dy}" width="${w/k}" height="${h/k}" rx="${5/k}" fill="#102b35" fill-opacity=".93" stroke="#45666b" stroke-width="${.7/k}"/>${lines.map((line,i)=>`<text x="${dx+7/k}" y="${dy+(15+i*15)/k}" style="font-size:${(i===1&&numericRecord?12:10.5)/k}px;fill:${i===1&&numericRecord?'#f2db9a':'#cde3df'};stroke:none;font-weight:${i===1&&numericRecord?650:450};pointer-events:all">${e(line)}</text>`).join('')}</g>`);
   }
   function addPoint(r,p,items=null){
     const cluster=!!items,node=document.createElementNS('http://www.w3.org/2000/svg','g'),isNumeric=!!r.country||!!r.development,rad=(cluster?14:isNumeric?6:10)/k;
     node.setAttribute('transform',`translate(${p[0]} ${p[1]})`);node.setAttribute('class','economic-marker');node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',cluster?`${items.length} records; zoom in to reveal map features`:`${r.title}${isNumeric?' · '+compactValue(r):''} · ${recordTiming(r)||shortTiming(r)}. Open map actions.`);
     node.innerHTML=`<circle r="${rad}" fill="${!cluster&&r.observation?.status==='last'?'#738f96':!cluster&&r.observation?.status==='interpolated'?'#ee9c79':colors[r.category]||colors.stat}" stroke="#102a33" stroke-width="${2/k}"/>${cluster||!isNumeric?`<text text-anchor="middle" dy="${4/k}" style="font-size:${11/k}px;fill:#102a33;stroke:none;font-weight:700">${cluster?items.length:icons[r.category]||'•'}</text>`:''}<title>${e(cluster?items.map(i=>i.r.title).join(' · '):r.title+' · '+recordTiming(r))}</title>`;
     const activate=()=>cluster?zoomCluster(items,globe):select(r);node.addEventListener('pointerdown',ev=>ev.stopPropagation());node.addEventListener('click',ev=>{ev.stopPropagation();activate();});node.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();activate();}});group.appendChild(node);if(!cluster)label(node,r,p);
   }
   groups.sort((a,b)=>Number(b.some(x=>x.r.id===state.menu?.id))-Number(a.some(x=>x.r.id===state.menu?.id))||a.length-b.length);
   for(const items of groups){const p=[items.reduce((v,i)=>v+i.p[0],0)/items.length,items.reduce((v,i)=>v+i.p[1],0)/items.length],key=items.map(i=>i.r.id).sort().join('|');
     if(items.length>1&&state.spider===key){items.forEach((item,i)=>{const ring=Math.floor(i/9)+1,angle=(i%9)/Math.min(9,items.length)*Math.PI*2-Math.PI/2,radius=(46+26*ring)/k,q=[p[0]+Math.cos(angle)*radius,p[1]+Math.sin(angle)*radius];group.insertAdjacentHTML('beforeend',`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#b5cfc9" stroke-width="${1/k}" stroke-dasharray="${2/k} ${3/k}" pointer-events="none"/>`);addPoint(item.r,q);});}
     else addPoint(items[0].r,p,items.length>1?items:null);
   }
   svg.appendChild(group);renderMenu(rows,svg,globe);
   eventTools.hidden=state.layer!=='events';if(state.layer==='events'){const ys=[...new Set((window.AtlasEvents?.records()||[]).filter(r=>r.startYear>=1820).map(r=>r.startYear))].sort((a,b)=>a-b),before=ys.filter(y=>y<year()).at(-1),after=ys.find(y=>y>year());eventTools.innerHTML='<p>Country reference points, not battle sites or measured impact areas.</p>'+[before,after].filter(y=>y!=null).map(y=>`<button data-event-jump="${y}">Events in ${y}</button>`).join(' ')+'<p><a href="economic-events-data.json" download>All events and sources ↗</a></p>'; }
   benchmarkTools.hidden=!development();
   if(development()){const d=developmentData(),ys=d?.years||[],before=ys.filter(y=>y<year()).at(-1),after=ys.find(y=>y>year());benchmarkTools.innerHTML='<p>Published AHDI · health, education, income and freedom. Published benchmarks; gray points retain the last available benchmark, labeled with its date.</p>'+[before,after].filter(y=>y!=null).map(y=>`<button data-development-year="${y}">Go to ${y}</button>`).join(' ')+'<p><a href="development-data.json" download>Download all source series ↗</a></p>'; }
   $('evidenceCoverage').textContent=development()?(rows.length?`${rows.length} mapped AHDI series for ${year()}; ${rows.filter(r=>r.observation.status==='last').length} show earlier benchmarks. Reference points, not local values.`:`No published AHDI benchmark at ${year()}. Choose a benchmark year below; no interpolation.`):numeric()?`${rows.length} series for ${year()} · ${units()}. Gold: source record. Coral: interpolation (${rows.filter(r=>r.observation.status==='interpolated').length}). Gray: last available (${rows.filter(r=>r.observation.status==='last').length}). Map labels show value and source date; select a point for actions.`:`${rows.length} dated records at ${year()} · ${records().length} in this initial research batch. ${points.length} records in view.`;
   if(state.selected){const r=rows.find(x=>x.id===state.selected);if(r)renderDetail(r);else{const prior=records().find(r=>r.id===state.selected);if(prior){renderDetail(prior);$('detail').insertAdjacentHTML('afterbegin','<p class="evidence-timing">Previously selected evidence retained for reference. Its dated period does not cover '+year()+'.</p>');}else{state.selected=null;$('detail').hidden=false;$('detail').innerHTML='<h2>No earlier source record</h2><p>There is no supported value at or before this year. Source links remain in the country details.</p>';}}}
 }
 const originalChoose=choose;choose=function(id){state.selected=null;closeMenu();return originalChoose(id);};
 const originalDraw=draw;draw=function(){originalDraw();render();};
 window.addEventListener('atlas:globe-render',render);
 window.AtlasEvidence={render,activeRecords,state,selectLayer,select,inspect,closeMenu,screenPoint};
 draw();
})();

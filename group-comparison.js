/* Up to five named country groups, three independently scaled measures, and
   dated source and explicitly calculated year/interval charts synchronized with the shared timeline. */
(()=>{'use strict';
 const model=AtlasGroupComparisonModel.create({countries:D.countries,indicators:ExtendedData.indicators,units:D.units,series:AtlasObservations.series,source:AtlasObservations.source,convert:AtlasCurrency.convert,cpi:AtlasCPI,wars:window.AtlasWarData?.records||[]});
 const countries=[...model.countries.values()].filter(c=>!['SUN','YUG','CSK'].includes(c.id)).sort((a,b)=>a.name.localeCompare(b.name));
 const colors=['#7ce1c4','#ffc879','#98baff','#ed9dd0','#c4db78'],storage='atlas-country-groups-v1';
 const defaultName=i=>'Group '+String.fromCharCode(65+i);
 const nextName=()=>{const preferred=defaultName(groups.length);return !groups.some(g=>g.name===preferred)?preferred:Array.from({length:5},(_,i)=>defaultName(i)).find(name=>!groups.some(g=>g.name===name))||preferred;};
 let groups=[{name:'Group A',ids:[]}],properties=['gdp','pop',''],active=0,mode='year',open=false,picking=false,chartsMode=false,frame=0,highlightFrame=0,cache=null,inFlight=null,evidence=null,graphFocus=null,serial=0;
 try{const saved=JSON.parse(localStorage.getItem(storage));if(saved){
  groups=saved.groups.slice(0,5).map((g,i)=>({name:String(!g.name||/^Group [1-5]$/.test(g.name)?defaultName(i):g.name).slice(0,40),ids:[...new Set(g.ids.filter(id=>countries.some(c=>c.id===id))) ]}));
  if(!groups.length)groups=[{name:'Group A',ids:[]}];
  properties=[...new Set(saved.properties.filter(k=>model.metrics.has(k)))].slice(0,3);while(properties.length<3)properties.push('');
  mode=saved.mode==='interval'?'interval':'year';
 }}catch(_){}
 let availability=null,availabilityPending=null,availabilityToken=0,focusedCountry=null;
 const el=(tag,attrs={},text)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else n.setAttribute(k,v);}if(text!=null)n.textContent=text;return n;};
 const button=(text,fn,attrs={})=>{const b=el('button',{type:'button',...attrs},text);b.addEventListener('click',fn);return b;};
 const svg=(tag,attrs={},text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!=null)n.textContent=text;return n;};
 const entry=button('',()=>show(!open),{id:'atlasGroupsButton','aria-label':'Compare groups','aria-expanded':'false','aria-controls':'atlasGroupPanel'});entry.append(el('span',{class:'gc-full-label'},'Compare groups'),el('span',{class:'gc-short-label'},'Groups'));document.querySelector('header').append(entry);
 const panel=el('section',{id:'atlasGroupPanel','aria-label':'Country group comparisons',hidden:''});document.body.append(panel);
 const picker=el('div',{id:'atlasGroupPicker',hidden:'',role:'status'});document.body.append(picker);
 const outlines=svg('svg',{id:'atlasGroupOutlines','aria-hidden':'true'});document.body.append(outlines);
 const heading=el('div',{class:'gc-heading'}),chartView=button('View graphs',()=>setChartsMode(!chartsMode));heading.append(el('h2',{},'Compare country groups'),chartView,button('×',()=>show(false),{'aria-label':'Close group comparisons'}));panel.append(heading);
 const intro=el('p',{class:'gc-muted'},'Build up to 5 groups of any size. Choose up to 3 measures. Each country can belong to more than one group.');panel.append(intro);
 const tabs=el('div',{class:'gc-group-list','aria-label':'Comparison groups'});panel.append(tabs);
 const editor=el('details',{open:''});editor.append(el('summary',{},'Edit countries & group name'));const editBody=el('div');editor.append(editBody);panel.append(editor);
 const measures=el('div',{class:'gc-measures'}),measureNotice=el('p',{class:'gc-muted',role:'status'});panel.append(measures,measureNotice);
 const modeRow=el('div',{class:'gc-row'}),yearButton=button('Selected year',()=>setMode('year')),intervalButton=button('Timeline interval',()=>setMode('interval'));modeRow.append(yearButton,intervalButton);panel.append(modeRow);
 const intervalRow=el('div',{class:'gc-row'});const start=el('input',{type:'number','aria-label':'Comparison from year',min:years[0],max:years.at(-1),step:1}),end=el('input',{type:'number','aria-label':'Comparison to year',min:years[0],max:years.at(-1),step:1});
 for(const [title,input]of [['From',start],['To',end]]){const label=el('label',{},title);label.append(input);intervalRow.append(label);}
 const play=button('▶ Play',()=>document.getElementById('timelinePlay').click(),{'aria-label':'Play this interval'});intervalRow.append(play);panel.append(intervalRow);
 const focusNotice=el('div',{class:'gc-focus-notice',hidden:''}),focusText=el('span',{role:'status'});focusNotice.append(focusText,button('Show all countries',()=>setCountryFocus(null)));panel.append(focusNotice);
 const status=el('p',{class:'gc-notice',role:'status'}),charts=el('div',{id:'atlasGroupCharts'});panel.append(status,charts);
 const method=el('details');method.append(el('summary',{},'How group values and coverage work'));
 for(const text of [
  'Available compatible countries are shown even when other members are missing. Partial totals and averages are labeled with the number included; they are not full-group values. Changes in the contributing countries can also change the trend. Evidence identifies excluded countries and missing weights or conversions. Missing values are never zero, carried forward, or interpolated here. Incompatible records are shown individually instead of combined.',
  'Population and annual GDP totals are summed. GDP/person is total annual GDP divided by total population, using matching GDP and population records. Original GDP measures use 2011 PPP international dollars; defence spending uses source-year exchange rates and US CPI to express 2024 US dollars. These units are not interchangeable.',
  'Other eligible indicators show unweighted means of national values: each country has equal influence. These are comparisons of countries, not pooled population statistics or a newly calculated HDI, life expectancy, mortality rate or poverty rate. National definitions can differ; inspect the evidence.',
  'Gini, wealth-distribution shares and country-specific historical sector indexes are shown as individual country values within each group. Computing a combined distribution needs underlying household data. National Ginis or top-wealth shares cannot simply be averaged.',
  'GDP · population allocation is a separate calculated series in 1990 PPP units. It divides a complete regional total using same-year population shares; group selection sums those fixed shares without reallocating the rest. It assumes equal GDP per person and is not the original country GDP series.',
  'A source estimate or reconstruction is not necessarily a direct measurement. Source reporting windows, including three-year happiness averages, are included only in interval mode when the full window fits inside your selected interval. They are plotted at the window end and remain labeled; they are never relabeled as annual observations.',
  'Interval graphs show annual records and eligible source windows, not a sum or average across time. Dashed connectors span missing years or changes in contributing countries; they are visual guides, not interpolated values. Reporting windows and incompatible source changes are also flagged with dashed connectors. Countries use the atlas’s statistical reference areas; a group is not a reconstruction of an empire or historical alliance. Groups may overlap, so their totals must not be added together.',
 ])method.append(el('p',{},text));panel.append(method);
 function save(){try{localStorage.setItem(storage,JSON.stringify({groups,properties,mode}));}catch(_){}}
 function changed(){cache=null;evidence=null;serial++;save();renderTabs();renderEditor();refresh();scheduleOutlines();}
 function renderTabs(){tabs.replaceChildren();groups.forEach((g,i)=>{const b=button(g.name,()=>{active=i;setChartsMode(false);editor.open=true;renderTabs();renderEditor();},{class:'gc-group-tab','aria-pressed':String(active===i)});b.style.setProperty('--group-color',colors[i]);b.append(el('small',{},`${g.ids.length} ${g.ids.length===1?'country':'countries'}`));tabs.append(b);});const add=button('+ Group',()=>{if(groups.length>=5)return;groups.push({name:nextName(),ids:[]});active=groups.length-1;setChartsMode(false);editor.open=true;changed();});add.disabled=groups.length>=5;tabs.append(add);}
 function renderEditor(){
  const previousSearch=editBody.querySelector('input[type=search]')?.value||'',scroll=editBody.querySelector('.gc-country-list')?.scrollTop||0,focused=document.activeElement?.matches('input[type=checkbox]')?document.activeElement.getAttribute('aria-label'):null;editBody.replaceChildren();const g=groups[active];
  const row=el('div',{class:'gc-row'}),name=el('input',{type:'text',maxlength:'40','aria-label':'Group name'});name.value=g.name;name.addEventListener('input',()=>{g.name=name.value.trim()||defaultName(active);save();renderTabs();refresh();});
  row.append(name,button('Pick on map',()=>setPicking(true)),button('Remove group',()=>{groups.splice(active,1);if(!groups.length)groups.push({name:'Group A',ids:[]});active=Math.min(active,groups.length-1);changed();}));editBody.append(row);
  const members=el('div',{class:'gc-members','aria-label':'Selected countries'});for(const id of g.ids){const c=model.countries.get(id);members.append(button(c.name+' ×',()=>toggleCountry(id),{'aria-label':'Remove '+c.name+' from '+g.name}));}editBody.append(members);
  const search=el('input',{type:'search',class:'gc-country-search',placeholder:'Find countries to add','aria-label':'Find countries for group'});search.value=previousSearch;editBody.append(search);
  const actions=el('div',{class:'gc-row'}),list=el('div',{class:'gc-country-list'});let matches=[];
  actions.append(button('Add all matching',()=>{g.ids=[...new Set([...g.ids,...matches.map(c=>c.id)])];changed();}),button('Clear countries',()=>{g.ids=[];changed();}));editBody.append(actions,list);
  const populate=()=>{const q=search.value.trim().toLowerCase();matches=countries.filter(c=>(c.name+' '+c.id).toLowerCase().includes(q));list.replaceChildren();for(const c of matches){const label=el('label'),input=el('input',{type:'checkbox','aria-label':c.name});input.checked=g.ids.includes(c.id);input.addEventListener('change',()=>toggleCountry(c.id));label.append(input,document.createTextNode(c.name));list.append(label);}};
  search.addEventListener('input',populate);populate();list.scrollTop=scroll;if(focused)[...list.querySelectorAll('input')].find(n=>n.getAttribute('aria-label')===focused)?.focus({preventScroll:true});
 }
 function toggleCountry(id){if(!model.countries.has(id))return;const g=groups[active];g.ids=g.ids.includes(id)?g.ids.filter(x=>x!==id):[...g.ids,id];changed();if(picking)renderPicker();}
 function availabilityContext(){const span=interval(),y=years[idx],ids=[...new Set(groups.flatMap(g=>g.ids))].sort();return {ids,start:mode==='interval'?span?.start:y,end:mode==='interval'?span?.end:y,intervalMode:mode==='interval'};}
 function ensureAvailability(){
  const context=availabilityContext(),signature=JSON.stringify(context);
  if(availability?.signature===signature)return true;
  if(availabilityPending===signature)return false;
  availability=null;availabilityPending=signature;const token=++availabilityToken;renderMeasures();
  (async()=>{const available=new Map();
   for(const metric of model.catalogue){
    const ids=new Set();for(const id of context.ids)if(model.hasData(id,metric.key,context.start,context.end,context.intervalMode))ids.add(id);
    available.set(metric.key,ids);
    await new Promise(resolve=>setTimeout(resolve,0));if(token!==availabilityToken)return;
   }
   availability={signature,available};availabilityPending=null;renderMeasures();refresh();
  })();return false;
 }
 function renderMeasures(){
  const focus=document.activeElement?.getAttribute('aria-label');measures.replaceChildren();
  for(let i=0;i<3;i++){
   const label=el('label',{},'Measure '+(i+1)),select=el('select',{'aria-label':'Comparison measure '+(i+1)});select.append(el('option',{value:''},'None'));
   for(const m of model.catalogue){const available=!!availability?.available.get(m.key)?.size,current=properties[i]===m.key;if(!available&&!current)continue;
    const o=el('option',{value:m.key},m.name+(m.kind==='single'?' · individual countries':'')+(!available?(availability?' · unavailable for these dates':' · checking availability…'):''));
    o.disabled=!available||(properties.includes(m.key)&&!current);select.append(o);
   }select.value=properties[i];select.disabled=!availability;
   select.addEventListener('change',()=>{properties[i]=select.value;renderMeasures();changed();});label.append(select);measures.append(label);
  }
  const count=availability?[...availability.available.values()].filter(ids=>ids.size).length:0;
  measureNotice.textContent=!groups.some(g=>g.ids.length)?'Add countries to see available properties.':!availability?'Checking properties for the selected countries and dates…':count?`${count} properties available in at least one selected country for these dates. Unavailable properties cannot be selected. Existing selections remain labeled when unavailable.`:'No properties have usable source data for these countries and dates. Change the year, interval or countries.';
  if(focus?.startsWith('Comparison measure '))measures.querySelector(`[aria-label="${focus}"]`)?.focus({preventScroll:true});
 }
 function setMode(value){mode=value;if(mode==='interval')keepYearInInterval();changed();}
 function setChartsMode(value){chartsMode=value;panel.classList.toggle('gc-chart-view',value);editor.hidden=value;measures.hidden=value;chartView.textContent=value?'Edit comparison':'View graphs';panel.scrollTop=0;refresh();AtlasCountryCanvas.schedule();}
 function interval(){const a=document.getElementById('timelineStart'),b=document.getElementById('timelineEnd'),lo=Number(a.value),hi=Number(b.value);return a.value&&b.value&&Number.isInteger(lo)&&Number.isInteger(hi)&&lo>=years[0]&&hi<=years.at(-1)&&lo<=hi?{start:lo,end:hi}:null;}
 function keepYearInInterval(){const span=interval();if(span&&(years[idx]<span.start||years[idx]>span.end))goYear(span.start);}
 for(const [local,id]of [[start,'timelineStart'],[end,'timelineEnd']])local.addEventListener('input',()=>{const target=document.getElementById(id);target.value=local.value;target.dispatchEvent(new Event('input',{bubbles:true}));keepYearInInterval();});
 function show(value){if(value)window.AtlasTerritoryUI?.reference();closePopup();open=value;picking=false;panel.hidden=!open;picker.hidden=true;entry.setAttribute('aria-expanded',String(open));
  if(open){if(groups.length===1&&!groups[0].ids.length){const id=AtlasCountryCanvas.getCountryId();if(id){groups[0].ids=[id];save();}}renderTabs();renderEditor();renderMeasures();refresh();}
  else{serial++;outlines.replaceChildren();entry.focus();}AtlasCountryCanvas.schedule();scheduleOutlines();}
 function renderPicker(){picker.replaceChildren(el('span',{},`Adding to ${groups[active].name} · ${groups[active].ids.length} selected. Tap countries to add/remove; drag to pan.`),button('Done',()=>setPicking(false)));}
 function setPicking(value){picking=value;panel.hidden=value;picker.hidden=!value;if(value){AtlasCountryCanvas.compareMetric(null);AtlasWars?.deactivate();AtlasTrade?.deactivate();AtlasIndustryMarkets?.clear();renderPicker();}else{refresh();}AtlasCountryCanvas.schedule();scheduleOutlines();}
 function goYear(year){const i=years.indexOf(year);if(i<0)return;document.getElementById('timelinePlay').getAttribute('aria-pressed')==='true'&&document.getElementById('timelinePlay').click();const slider=document.getElementById('time');slider.value=i;slider.dispatchEvent(new Event('input',{bubbles:true}));}
 function fmt(value,compact=true){return value==null?'No usable value':value.toLocaleString('en-US',{notation:compact&&Math.abs(value)>=10000?'compact':'standard',maximumSignificantDigits:compact?4:9});}
 function refresh(){if(!open)return;if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}
 function render(){
  closePopup();frame=0;const ready=ensureAvailability(),y=years[idx],span=interval();start.value=document.getElementById('timelineStart').value;end.value=document.getElementById('timelineEnd').value;
  yearButton.setAttribute('aria-pressed',String(mode==='year'));intervalButton.setAttribute('aria-pressed',String(mode==='interval'));intervalRow.hidden=mode!=='interval';const playing=document.getElementById('timelinePlay').getAttribute('aria-pressed')==='true';play.textContent=playing?'Ⅱ Pause':'▶ Play';play.setAttribute('aria-label',playing?'Pause interval':'Play this interval');play.disabled=!span;
  intro.textContent=chartsMode?`${groups.length} groups · ${properties.filter(Boolean).length} measures · Select a group value for evidence.`:'Build up to 5 groups of any size. Choose up to 3 measures. Each country can belong to more than one group.';
  const keys=properties.filter(Boolean);if(document.activeElement?.matches('.gc-chart svg'))graphFocus=document.activeElement.closest('.gc-chart').dataset.comparisonProperty;charts.replaceChildren();
  if(mode==='interval'&&!span){status.textContent='Choose a valid interval within '+years[0]+'–'+years.at(-1)+'.';return;}
  if(!ready){status.textContent='Checking available properties…';return;}
  if(!keys.length){status.textContent='Choose up to three measures to compare.';return;}
  if(!groups.some(g=>g.ids.length)){status.textContent='Add countries to a group using the map or the country list.';return;}
  status.textContent=mode==='year'?`Selected year: ${y}. Available source-year values shown; partial groups are labeled.`:`Timeline interval: ${span.start}–${span.end}. Selected year: ${y}${y<span.start||y>span.end?' (outside this interval)':''}. Partial coverage is labeled; dashed connections do not fill missing years.`;
  const signature=JSON.stringify({groups:groups.map(g=>g.ids),keys,mode,span:mode==='interval'?span:y});
  if(cache?.signature===signature){paintCharts(cache.data,keys,span,y);return;}
  if(inFlight?.signature===signature&&inFlight.token===serial){status.textContent+=' Preparing graphs…';return;}
  const token=++serial;status.textContent+=' Preparing graphs…';
  inFlight={signature,token};
  (async()=>{
   const data={};for(const key of keys){data[key]=[];for(const g of groups){
    if(mode==='interval')data[key].push(model.series(g.ids,key,span.start,span.end));else data[key].push([model.aggregate(g.ids,key,y)]);
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));if(token!==serial||!open)return;
   }}
   cache={signature,data};inFlight=null;refresh();
  })();
 }
 function focusAttrs(ids){return {'data-focus-countries':[...new Set(ids)].join(' ')};}
 function pointMembers(i,o){return o?.id?[o.id]:o?.includedIds||groups[i].ids;}
 function setCountryFocus(id){focusedCountry=focusedCountry===id?null:id;applyCountryFocus();}
 function countryToggle(id,label){const name=model.countries.get(id)?.name||id;return button(label,()=>{if(!popup.hidden)popupPinned=true;setCountryFocus(id);},{'data-country-toggle':id,'aria-label':'Highlight '+name,'aria-pressed':String(focusedCountry===id),title:'Highlight '+name+' across graphs'});}
 function applyCountryFocus(){
  for(const root of [panel,popup]){
   root.querySelectorAll('[data-focus-countries]').forEach(n=>{const ids=n.dataset.focusCountries.split(' '),match=!!focusedCountry&&ids.includes(focusedCountry);n.classList.toggle('gc-focus-dim',!!focusedCountry&&!match);n.classList.toggle('gc-focus-active',match&&ids.length===1);});
   root.querySelectorAll('[data-country-toggle]').forEach(n=>{n.setAttribute('aria-pressed',String(n.dataset.countryToggle===focusedCountry));n.classList.toggle('gc-key-dim',!!focusedCountry&&n.dataset.countryToggle!==focusedCountry&&!n.parentElement.closest('[data-focus-countries]'));});
  }
  focusNotice.hidden=!focusedCountry;if(focusedCountry)focusText.textContent=`Following ${model.countries.get(focusedCountry)?.name||focusedCountry}. Combined lines containing it remain group totals; highlighting does not change values.`;
 }
 function pointCountry(i,point){return point?.id||(groups[i].ids.length===1?groups[i].ids[0]:null);}
 function pointColor(i,point){const id=pointCountry(i,point);return id?countryColor(id):colors[i];}
 function paintCharts(data,keys,span,y){const conflictRange=mode==='interval'?span:{start:y,end:y},conflicts=model.conflictPeriods(groups.flatMap(g=>g.ids),conflictRange.start,conflictRange.end);for(const key of keys){
  const meta=model.metrics.get(key),card=el('article',{class:'gc-chart','data-comparison-property':key});card.append(el('h3',{},meta.name),el('small',{},meta.unit+' · '+meta.method));
  const graph=svg('svg',{viewBox:'0 0 600 225',role:'group','aria-label':meta.name+' comparison graph',tabindex:'0'});
  const all=data[key].flatMap(series=>series.flatMap(o=>o.value!=null?[o]:o.fallback||[])),low=all.length?all.reduce((v,o)=>Math.min(v,o.value),Infinity):0,high=all.length?all.reduce((v,o)=>Math.max(v,o.value),-Infinity):1,pad=(high-low||Math.abs(high)||1)*.05;
  const min=mode==='interval'?low-pad:Math.min(0,low),max=mode==='interval'?high+pad:Math.max(0,high),range=max-min||1;
  const py=v=>180-(v-min)/range*145,x=year=>94+(year-span.start)/Math.max(1,span.end-span.start)*490;
  addConflictBands(graph,conflicts,conflictRange,mode==='interval');
  for(let i=0;all.length&&i<=3;i++){const v=min+range*i/3,yy=py(v);graph.append(svg('line',{x1:94,x2:584,y1:yy,y2:yy,stroke:'#38565e'}),svg('text',{x:88,y:yy+4,'text-anchor':'end'},fmt(v)));}
  const legend=el('div',{class:'gc-plot-legend','aria-label':meta.name+' group coverage'});
  data[key].forEach((series,i)=>{const plotted=series.filter(o=>o.value!=null||o.fallback?.length);if(!plotted.length)return;const partial=series.filter(o=>o.value!=null&&o.partial),individual=series.filter(o=>o.fallback?.length);const item=el('div',focusAttrs(plotted.flatMap(o=>pointMembers(i,o))));item.style.setProperty('--group-color',pointColor(i));item.append(el('strong',{},groups[i].name),el('small',{},plotted.length?`${plotted.length}/${series.length} dates shown${partial.length?' · '+partial.length+' partial':''}${individual.length?' · individual country values included':''}`:'No usable data in this selection — see evidence below'));legend.append(item);});card.append(legend);
  const countryIds=[...new Set(data[key].flatMap((series,i)=>series.flatMap(o=>o.value!=null?pointMembers(i,o):(o.fallback||[]).map(m=>m.id))))].sort();
  if(countryIds.length){const countryKey=el('div',{class:'gc-country-key','aria-label':'Country color key'});for(const [j,id] of countryIds.entries()){const item=countryToggle(id,''),swatch=el('i');swatch.style.background=countryColor(id);item.append(swatch,document.createTextNode(countryCode(id,j)));countryKey.append(item);}card.append(countryKey,el('small',{},'Click a country code to highlight it everywhere; click again to show all. Combined lines use group colors.'));}

  function dot(o,i,xx,label){
   const pointYear=o.year??y,pointLabel=`Breakdown for ${label}, ${meta.name}, ${pointYear}`;
   const mark=svg('g',{role:'button',tabindex:'0','aria-label':pointLabel,'aria-haspopup':'dialog',class:'gc-point',...focusAttrs(pointMembers(i,o)),...(pointCountry(i,o)?{'data-country-id':pointCountry(i,o)}:{})});
   mark.append(svg('circle',{cx:xx,cy:py(o.value),r:9+i,fill:'transparent'}),svg('circle',{cx:xx,cy:py(o.value),r:4+i*1.1,fill:'none',stroke:pointColor(i,o),'stroke-width':2,'stroke-dasharray':o.partial?'2 2':'','pointer-events':'none'}));
   const show=pin=>showBreakdown(mark,{key,i,year:pointYear,span:mode==='interval'?span:null,individualId:o.id},pin);
   mark.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&!popupPinned)show(false);});
   mark.addEventListener('pointerleave',queuePopupClose);
   mark.addEventListener('focus',()=>{if(!popupPinned)show(false);});mark.addEventListener('blur',queuePopupClose);
   mark.addEventListener('click',e=>{e.stopPropagation();show(true);});
   mark.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();show(true);}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePopup();}});
   graph.append(mark);
  }
  if(mode==='interval'){
   graph.append(svg('text',{x:94,y:207},span.start),svg('text',{x:584,y:207,'text-anchor':'end'},span.end));
   data[key].forEach((series,i)=>{
    function trace(points,label){let previous=null;const valid=points.filter(o=>o.value!=null);for(const o of valid){
     if(previous){const continuous=o.year===previous.year+1&&o.source===previous.source&&o.unit===previous.unit&&o.periodStart===o.periodEnd&&previous.periodStart===previous.periodEnd&&JSON.stringify(o.includedIds)===JSON.stringify(previous.includedIds);
      const segment=svg('line',{...focusAttrs([...pointMembers(i,previous),...pointMembers(i,o)]),x1:x(previous.year),y1:py(previous.value),x2:x(o.year),y2:py(o.value),stroke:pointColor(i,o),'stroke-width':2,'stroke-dasharray':continuous?(i?'10 2':''):'4 5','stroke-dashoffset':i*2});segment.append(svg('title',{},continuous?'Consecutive records with the same coverage':'Visual connection only: missing years, changed coverage or reporting basis; no values inferred'));graph.append(segment);
     }else if(valid.length===1)graph.append(svg('line',{...focusAttrs(pointMembers(i,o)),x1:x(o.year),x2:x(o.year),y1:py(o.value)-7,y2:py(o.value)+7,stroke:pointColor(i,o)}));
     previous=o;
    }for(const o of valid)dot(o,i,x(o.year),label);}
    trace(series,groups[i].name);
    const ids=[...new Set(series.flatMap(o=>(o.fallback||[]).map(m=>m.id)))];for(const id of ids)trace(series.flatMap(o=>{const m=o.fallback?.find(m=>m.id===id);return m?[{...m,year:o.year}]:[];}),groups[i].name+' / '+(model.countries.get(id)?.name||id)+' (individual, not combined)');
   });
   if(y>=span.start&&y<=span.end)graph.append(svg('line',{x1:x(y),x2:x(y),y1:20,y2:187,stroke:'#fff0be','stroke-dasharray':'4 4'}));
   graph.addEventListener('click',e=>{const rect=graph.getBoundingClientRect(),sx=(e.clientX-rect.left)*600/rect.width;if(sx<94||sx>584)return;goYear(Math.round(span.start+(sx-94)/490*(span.end-span.start)));});
   graph.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();goYear(e.key==='Home'?span.start:e.key==='End'?span.end:Math.max(span.start,Math.min(span.end,y+(e.key==='ArrowRight'?1:-1))));}});
  }else{
   const width=490/groups.length;data[key].forEach((series,i)=>{const o=series[0],xx=94+(i+.5)*width,points=o.value!=null?[o]:o.fallback||[];
    for(const point of points){graph.append(svg('line',{...focusAttrs(pointMembers(i,point)),x1:xx,x2:xx,y1:py(0),y2:py(point.value),stroke:pointColor(i,point),'stroke-width':2,'stroke-dasharray':point.partial?'4 4':''}));dot(point,i,xx,groups[i].name+(point.id?' / '+model.countries.get(point.id)?.name:''));}
    if(points.length)graph.append(svg('text',{x:xx,y:207,'text-anchor':'middle'},String.fromCharCode(65+i)));
   });
  }
  if(all.length||conflicts.length)card.append(graph);
  addConflictKey(card,conflicts,conflictRange);
  if(!all.length)card.append(el('p',{class:'gc-muted'},'No usable records for this selection. See the exclusions below; missing data is not zero.'));
  if(all.length&&mode==='interval')card.append(el('p',{class:'gc-muted'},'Hover or tap a dot for its country breakdown. Dots are available records. Dashed connections span missing years or changed coverage/basis; they do not create values. Dotted rings indicate partial groups. Click the graph to move the shared year.'));
  if(meta.kind==='mean')card.append(el('p',{class:'gc-muted'},'Equal weight per country — not a pooled population measure.'));
  if(all.length&&meta.kind==='single')card.append(el('p',{class:'gc-muted'},'Country values are shown individually within each group; no combined distribution is invented.'));
  const values=el('div',{class:'gc-values'});data[key].forEach((series,i)=>{
   const o=series.find(o=>o.year===y),count=series.filter(o=>o.value!=null||o.fallback?.length).length;if(!count)return;
   const b=button('',()=>{evidence=evidence?.key===key&&evidence.i===i&&evidence.year===y?null:{key,i,year:y};refresh();},{class:'gc-value',...focusAttrs(series.flatMap(o=>pointMembers(i,o))),'aria-label':`Evidence for ${groups[i].name}, ${meta.name}, ${y}`});b.style.setProperty('--group-color',pointColor(i));
   b.append(el('strong',{},`${String.fromCharCode(65+i)} · ${groups[i].name}`));const text=el('span',{},o?.value!=null?(o.partial?'PARTIAL · ':'')+fmt(o.value):o?.reason||'Selected year is outside the interval');text.append(el('small',{},`${o?(o.fallback?.length?o.fallback.length+'/'+groups[i].ids.length+' countries shown individually':o.covered+'/'+groups[i].ids.length+' contributing countries'):'Outside interval'}${mode==='interval'?` · ${count}/${span.end-span.start+1} plotted years`:''}${o?.value!=null&&o.periodStart!==o.periodEnd?` · source window ${o.periodStart}–${o.periodEnd}`:''}`));b.append(text);values.append(b);
  });card.append(values);
  if(evidence?.key===key)renderEvidence(card,evidence,span);
  const excluded=el('div',{class:'gc-exclusions'}),availableIds=availability.available.get(key)||new Set();
  groups.forEach(g=>{const missing=g.ids.filter(id=>!availableIds.has(id));if(missing.length)excluded.append(el('p',{},`${g.name} — excluded from this graph: ${missing.map(id=>model.countries.get(id)?.name||id).join(', ')}. No usable source data for ${mode==='interval'?span.start+'–'+span.end:y}.`));});
  if(excluded.childElementCount){excluded.prepend(el('strong',{},'Countries without data'));excluded.append(el('small',{},'Saved group membership is unchanged. These countries return automatically when data is available for your selection. Partial-coverage counts still refer to the full selected group.'));card.append(excluded);}
  charts.append(card);
 }applyCountryFocus();if(graphFocus&&document.activeElement===document.body)charts.querySelector('[data-comparison-property="'+graphFocus+'"] svg')?.focus({preventScroll:true});graphFocus=null;}
 function renderEvidence(card,which,span){
  const g=groups[which.i];if(!g)return;const o=model.aggregate(g.ids,which.key,which.year,mode==='interval'?span:null),box=el('div',{class:'gc-evidence'});
  box.append(el('h3',{},`${g.name} · ${which.year}`),el('p',{},o.value==null?o.reason:`${fmt(o.value,false)} ${o.unit} · ${o.method}`));
  const list=el('ul');for(const m of o.members){const li=el('li'),name=model.countries.get(m.id)?.name||m.id;li.append(el('strong',{},name+': '),document.createTextNode(m.value==null?m.reason:`${fmt(m.value,false)} ${m.unit} · ${m.periodStart===m.periodEnd?m.periodEnd:m.periodStart+'–'+m.periodEnd} · ${m.sourceStatus||'Derived from source records'}`));
   if(m.url){const a=el('a',{href:m.url,target:'_blank',rel:'noopener'},' Source ↗');li.append(a);}if(m.row!=null)li.append(document.createTextNode(' · source row '+m.row));
   const weight=o.weights?.find(w=>w.id===m.id);if(weight)li.append(el('small',{},' · Population weight: '+(weight.value==null?weight.reason:fmt(weight.value,false)+' people')));
   if(m.conversion)li.append(el('small',{},` · Original: ${fmt(m.conversion.original,false)} EUR; exchange rate: ${m.conversion.rate} USD/EUR; US CPI basis ${AtlasCPI.baseYear}.`));
   if(m.derived)li.append(el('small',{},' · '+m.method+': '+m.components.map(c=>fmt(c.value,false)+' '+c.unit+' (row '+(c.row??'not supplied')+')').join(' × ')));if(m.exclusionReason)li.append(el('small',{},' · '+m.exclusionReason));if(m.sourceNote)li.append(el('small',{},' · '+m.sourceNote));list.append(li);
  }box.append(list);const meta=model.metrics.get(which.key);if(meta.definition)box.append(el('p',{},meta.definition));if(meta.caveat)box.append(el('p',{},meta.caveat));card.append(box);
 }
 // A point is computed on demand; do not retain every country's evidence for
 // every year. Stable colors and country codes avoid names on the mini chart.
 const popup=el('div',{id:'atlasGroupBreakdown',role:'dialog','aria-label':'Country contributions',hidden:''});document.body.append(popup);
 let popupPinned=false,popupTimer=0;
 // Two-letter economy codes from the bundled World Bank country reference.
 const countryCodes={"ABW":"AW","AFG":"AF","AGO":"AO","ALB":"AL","AND":"AD","ARE":"AE","ARG":"AR","ARM":"AM","ASM":"AS","ATG":"AG","AUS":"AU","AUT":"AT","AZE":"AZ","BDI":"BI","BEL":"BE","BEN":"BJ","BFA":"BF","BGD":"BD","BGR":"BG","BHR":"BH","BHS":"BS","BIH":"BA","BLR":"BY","BLZ":"BZ","BMU":"BM","BOL":"BO","BRA":"BR","BRB":"BB","BRN":"BN","BTN":"BT","BWA":"BW","CAF":"CF","CAN":"CA","CHE":"CH","CHI":"JG","CHL":"CL","CHN":"CN","CIV":"CI","CMR":"CM","COD":"CD","COG":"CG","COL":"CO","COM":"KM","CPV":"CV","CRI":"CR","CUB":"CU","CUW":"CW","CYM":"KY","CYP":"CY","CZE":"CZ","DEU":"DE","DJI":"DJ","DMA":"DM","DNK":"DK","DOM":"DO","DZA":"DZ","ECU":"EC","EGY":"EG","ERI":"ER","ESP":"ES","EST":"EE","ETH":"ET","FIN":"FI","FJI":"FJ","FRA":"FR","FRO":"FO","FSM":"FM","GAB":"GA","GBR":"GB","GEO":"GE","GHA":"GH","GIB":"GI","GIN":"GN","GMB":"GM","GNB":"GW","GNQ":"GQ","GRC":"GR","GRD":"GD","GRL":"GL","GTM":"GT","GUM":"GU","GUY":"GY","HKG":"HK","HND":"HN","HRV":"HR","HTI":"HT","HUN":"HU","IDN":"ID","IMN":"IM","IND":"IN","IRL":"IE","IRN":"IR","IRQ":"IQ","ISL":"IS","ISR":"IL","ITA":"IT","JAM":"JM","JOR":"JO","JPN":"JP","KAZ":"KZ","KEN":"KE","KGZ":"KG","KHM":"KH","KIR":"KI","KNA":"KN","KOR":"KR","KWT":"KW","LAO":"LA","LBN":"LB","LBR":"LR","LBY":"LY","LCA":"LC","LIE":"LI","LKA":"LK","LSO":"LS","LTU":"LT","LUX":"LU","LVA":"LV","MAC":"MO","MAF":"MF","MAR":"MA","MCO":"MC","MDA":"MD","MDG":"MG","MDV":"MV","MEX":"MX","MHL":"MH","MKD":"MK","MLI":"ML","MLT":"MT","MMR":"MM","MNE":"ME","MNG":"MN","MNP":"MP","MOZ":"MZ","MRT":"MR","MUS":"MU","MWI":"MW","MYS":"MY","NAM":"NA","NCL":"NC","NER":"NE","NGA":"NG","NIC":"NI","NLD":"NL","NOR":"NO","NPL":"NP","NRU":"NR","NZL":"NZ","OMN":"OM","PAK":"PK","PAN":"PA","PER":"PE","PHL":"PH","PLW":"PW","PNG":"PG","POL":"PL","PRI":"PR","PRK":"KP","PRT":"PT","PRY":"PY","PSE":"PS","PYF":"PF","QAT":"QA","ROU":"RO","RUS":"RU","RWA":"RW","SAU":"SA","SDN":"SD","SEN":"SN","SGP":"SG","SLB":"SB","SLE":"SL","SLV":"SV","SMR":"SM","SOM":"SO","SRB":"RS","SSD":"SS","STP":"ST","SUR":"SR","SVK":"SK","SVN":"SI","SWE":"SE","SWZ":"SZ","SXM":"SX","SYC":"SC","SYR":"SY","TCA":"TC","TCD":"TD","TGO":"TG","THA":"TH","TJK":"TJ","TKM":"TM","TLS":"TL","TON":"TO","TTO":"TT","TUN":"TN","TUR":"TR","TUV":"TV","TZA":"TZ","UGA":"UG","UKR":"UA","URY":"UY","USA":"US","UZB":"UZ","VCT":"VC","VEN":"VE","VGB":"VG","VIR":"VI","VNM":"VN","VUT":"VU","WSM":"WS","XKX":"XK","YEM":"YE","ZAF":"ZA","ZMB":"ZM","ZWE":"ZW"};
 const countryCode=(id,index)=>countryCodes[id]||String(index+1);
 // Deterministic country identity: independent of group, metric, year and ordering.
 const countryColor=id=>{let n=0;for(const ch of id)n=(n*31+ch.charCodeAt(0))>>>0;return `hsl(${n*137.508%360} 65% 67%)`;};
 function closePopup(){clearTimeout(popupTimer);popup.hidden=true;popupPinned=false;}
 function queuePopupClose(){clearTimeout(popupTimer);if(!popupPinned)popupTimer=setTimeout(closePopup,220);}
 popup.addEventListener('pointerenter',()=>clearTimeout(popupTimer));popup.addEventListener('pointerleave',queuePopupClose);
 popup.addEventListener('focusin',()=>clearTimeout(popupTimer));popup.addEventListener('focusout',e=>{if(!popup.contains(e.relatedTarget))queuePopupClose();});
 document.addEventListener('pointerdown',e=>{if(!popup.hidden&&!popup.contains(e.target)&&!e.target.closest('.gc-point,.gc-war-band,.gc-war-label,[data-country-toggle]'))closePopup();});
 panel.addEventListener('scroll',closePopup,{passive:true});window.addEventListener('resize',closePopup);
 function showBreakdown(anchor,selection,pin){
  clearTimeout(popupTimer);popup.setAttribute('aria-label','Country contributions');popupPinned=pin;const g=groups[selection.i],meta=model.metrics.get(selection.key);
  const detail=model.breakdown(g.ids,selection.key,selection.year,selection.span),parts=detail.parts.slice().sort((a,b)=>(model.countries.get(a.id)?.name||a.id).localeCompare(model.countries.get(b.id)?.name||b.id));
  popup.replaceChildren();const head=el('div',{class:'gc-mini-heading'});head.append(el('strong',{},`${g.name} · ${selection.year}`),button('×',()=>{closePopup();anchor.focus({preventScroll:true});closePopup();},{'aria-label':'Close country contributions'}));popup.append(head,el('strong',{},meta.name));
  popup.append(el('p',{},detail.kind==='total'?'Country shares of the plotted total':detail.kind==='average'?'Each country’s contribution to the plotted average':'Individual country values — no combined group value'));
  const total=parts.reduce((sum,p)=>sum+p.contribution,0),pie=detail.kind==='total'&&parts.length<=6&&parts.length>0&&total>0&&parts.every(p=>p.contribution>=0);
  const chart=svg('svg',{viewBox:pie?'0 0 300 150':`0 0 300 ${Math.max(64,parts.length*24+12)}`,role:'img','aria-label':pie?'Country contribution pie chart':'Country contribution bar chart'}),chartBox=el('div',{class:'gc-mini-chart'});
  if(pie){let angle=-Math.PI/2;for(const [j,p] of parts.entries()){const end=angle+p.contribution/total*Math.PI*2,color=countryColor(p.id),part=svg('g',focusAttrs([p.id]));chart.append(part);if(p.contribution===total)part.append(svg('circle',{cx:150,cy:75,r:68,fill:color}));else if(p.contribution>0)part.append(svg('path',{d:`M150 75 L${150+68*Math.cos(angle)} ${75+68*Math.sin(angle)} A68 68 0 ${end-angle>Math.PI?1:0} 1 ${150+68*Math.cos(end)} ${75+68*Math.sin(end)} Z`,fill:color,stroke:'#102b34','stroke-width':1}));if(p.contribution/total>=.05){const mid=(angle+end)/2,radius=p.contribution===total?0:44;part.append(svg('text',{x:150+radius*Math.cos(mid),y:79+radius*Math.sin(mid),'text-anchor':'middle',fill:'#102b34','font-size':12,'font-weight':700},countryCode(p.id,j)));}angle=end;}}
  else{const low=parts.reduce((n,p)=>Math.min(n,p.contribution),0),high=parts.reduce((n,p)=>Math.max(n,p.contribution),0),scale=v=>32+(v-low)/(high-low||1)*256,zero=scale(0);
   chart.append(svg('line',{x1:zero,x2:zero,y1:2,y2:parts.length*24+6,stroke:'#759398'}));parts.forEach((p,j)=>{const x=scale(p.contribution),part=svg('g',focusAttrs([p.id]));chart.append(part);part.append(svg('text',{x:3,y:j*24+19,fill:'#d7e9e6','font-size':10},countryCode(p.id,j)),svg('rect',{x:Math.min(zero,x),y:j*24+5,width:Math.max(1,Math.abs(x-zero)),height:15,fill:countryColor(p.id)}));});}
  chartBox.append(chart);popup.append(chartBox,el('small',{},meta.unit));
  const key=el('ol',{class:'gc-mini-key'});parts.forEach((p,j)=>{const row=el('li',focusAttrs([p.id])),swatch=el('span',{class:'gc-mini-swatch'});swatch.style.background=countryColor(p.id);row.append(swatch,countryToggle(p.id,`${countryCode(p.id,j)} · ${model.countries.get(p.id)?.name||p.id}${selection.individualId===p.id?' (selected)':''}`));
   row.append(el('strong',{},fmt(p.value)),el('small',{},detail.kind==='total'&&total>0&&parts.every(p=>p.contribution>=0)?`${(p.contribution/total*100).toFixed(1)}% of shown total`:detail.kind==='average'?`${(p.weight*100).toFixed(1)}% weight · ${fmt(p.contribution)} contribution`:'Individual source value'));key.append(row);});popup.append(key);
  if(detail.result.partial)popup.append(el('p',{},`Partial coverage: ${detail.result.covered}/${detail.result.total} countries contribute.`));
  if(detail.excluded.length){const missing=el('details');missing.append(el('summary',{},`${detail.excluded.length} ${detail.excluded.length===1?'country':'countries'} excluded at this date`),el('p',{},detail.excluded.map(m=>`${model.countries.get(m.id)?.name||m.id}: ${m.exclusionReason||m.reason||'not combined'}`).join('; ')));popup.append(missing);}
  popup.append(el('small',{},pin?'Click outside or × to close.':'Click a point to keep this breakdown open.'));
  applyCountryFocus();placePopup(anchor);
 }
 function placePopup(anchor){
  popup.hidden=false;popup.style.maxHeight='';popup.style.left='8px';popup.style.top='8px';const r=anchor.getBoundingClientRect(),box=popup.getBoundingClientRect();let left=r.right+12;if(left+box.width>innerWidth-8)left=r.left-box.width-12;popup.style.left=Math.max(8,Math.min(left,innerWidth-box.width-8))+'px';const top=Math.max(8,Math.min(r.top-30,innerHeight-box.height-8));popup.style.top=top+'px';popup.style.maxHeight=Math.min(560,innerHeight-top-8)+'px';
 }
 function conflictAction(node,event,range){
  node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',`${event.name} · ${event.startYear}–${event.endYear} · conflict evidence`);
  node.addEventListener('click',e=>{e.stopPropagation();showConflict(node,event,range,true);});
  node.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&!popupPinned)showConflict(node,event,range,false);});node.addEventListener('pointerleave',queuePopupClose);
  node.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();showConflict(node,event,range,true);}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePopup();}});return node;
 }
 function addConflictBands(graph,events,range,isInterval){
  isInterval=isInterval&&range.end>range.start;
  const px=year=>94+(year-range.start)/Math.max(1,range.end-range.start)*490,half=isInterval?Math.min(10,245/Math.max(1,range.end-range.start)):0;
  // Merge background coverage so overlapping wars do not become darker.
  const spans=[];for(const event of events){const left=isInterval?Math.max(94,px(event.visibleStart)-half):94,right=isInterval?Math.min(584,px(event.visibleEnd)+half):584;const last=spans.at(-1);if(last&&left<=last.right)last.right=Math.max(last.right,right);else spans.push({left,right});}
  for(const band of spans)graph.append(svg('rect',{x:band.left,y:20,width:Math.max(2,band.right-band.left),height:165,fill:'#e4a08d','fill-opacity':'.1','pointer-events':'none',class:'gc-conflict-shade'}));
  const lanes=[-Infinity,-Infinity,-Infinity];events.forEach((event,i)=>{const left=isInterval?Math.max(94,px(event.visibleStart)-half):94,right=isInterval?Math.min(584,px(event.visibleEnd)+half):584;
   const lane=lanes.findIndex(end=>left>end+5);if(lane<0)return;lanes[lane]=Math.max(right,left+24);
   const mark=svg('g',{class:'gc-war-band'});mark.append(svg('line',{x1:left,x2:Math.max(left+3,right),y1:24+lane*13,y2:24+lane*13,stroke:'#daa18f','stroke-width':2}),svg('rect',{x:left,y:16+lane*13,width:25,height:13,rx:3,fill:'#463e3b'}),svg('text',{x:left+3,y:26+lane*13,'font-size':9},'W'+(i+1)));graph.append(conflictAction(mark,event,range));});
 }
 function addConflictKey(card,events,range){
  const box=el('div',{class:'gc-war-key'});box.append(el('small',{},events.length?'Shaded periods: documented conflicts involving selected countries. Context does not establish that a war caused a change in this measure.':'No conflict record loaded for these countries and dates. This is not evidence of peace.'));
  for(const [i,event] of events.entries()){const label=button(`W${i+1} · ${event.name} · ${event.visibleStart}–${event.visibleEnd}`,()=>{},{class:'gc-war-label'});conflictAction(label,event,range);box.append(label);}
  box.append(el('small',{},'Coverage is selective before 1946; the modern source covers interstate armed conflicts, including lower-intensity fighting. Other conflicts may be missing.'));card.append(box);
 }
 function yearRuns(values){const ys=[...new Set(values)].sort((a,b)=>a-b),runs=[];for(const y of ys){const r=runs.at(-1);if(r&&r[1]===y-1)r[1]=y;else runs.push([y,y]);}return runs.map(([a,b])=>a===b?String(a):a+'–'+b).join(', ');}
 function showConflict(anchor,event,range,pin){
  clearTimeout(popupTimer);popupPinned=pin;popup.setAttribute('aria-label','Conflict context');popup.replaceChildren();const head=el('div',{class:'gc-mini-heading'});head.append(el('strong',{},event.name),button('×',()=>{closePopup();anchor.focus({preventScroll:true});closePopup();},{'aria-label':'Close conflict context'}));popup.append(head);
  popup.append(el('p',{},`Recorded participation: ${event.startYear}–${event.endYear}. Shown in this selection: ${event.visibleStart}–${event.visibleEnd}.`),el('p',{},'Selected countries: '+event.countryIds.map(id=>model.countries.get(id)?.name||id).join(', ')));
  const sides=new Map();for(const r of event.records)for(const side of r.sides||[]){const name=side.name||(side.countryIds||[]).join(', ');if(!sides.has(name))sides.set(name,[]);for(let y=r.startYear;y<=r.endYear;y++)sides.get(name).push(y);}
  const list=el('ul');for(const [name,years]of sides)list.append(el('li',{},`${name} · ${yearRuns(years)}`));popup.append(el('strong',{},'Participants in the loaded records'),list);
  const opposing=el('details'),pairs=new Map();opposing.append(el('summary',{},'Recorded opposing sides'));
  for(const r of event.records){const pair=(r.sides||[]).map(side=>side.name||(side.countryIds||[]).join(', ')).join(' ↔ ');if(!pairs.has(pair))pairs.set(pair,[]);for(let y=r.startYear;y<=r.endYear;y++)pairs.get(pair).push(y);}
  for(const [pair,ys]of pairs)opposing.append(el('p',{},pair+' · '+yearRuns(ys)));opposing.append(el('small',{},'Source sides may include coalitions or historical reference identities; no additional bilateral combat ties are inferred.'));popup.append(opposing);
  for(const text of [...new Set(event.records.map(r=>r.intensityLabel||r.type.replaceAll('_',' ')))])popup.append(el('small',{},text));
  const countryDeaths=window.AtlasWarDeaths?.html(event.records,event.countryIds)||'';if(countryDeaths){const block=el('div');block.innerHTML=countryDeaths;popup.append(block);}
  const deathRecords=event.records.filter(r=>r.deaths?.length);if(deathRecords.length&&window.AtlasWars?.deathsHTML){for(const r of deathRecords){const block=el('div');block.innerHTML=AtlasWars.deathsHTML(r);popup.append(block);}}else if(!countryDeaths)popup.append(el('p',{},'Deaths by side: not recorded in the loaded evidence.'));
  popup.append(el('strong',{},'Spending'),el('p',{},'Cost of this war: not recorded. Annual national defence spending below is not a war-specific cost.'));
  for(const id of event.countryIds){const sourceYears=new Set();for(const r of event.records){const belongs=[...(r.affectedCountryIds||[]),...(r.referenceCountryIds||[]),...(r.sides||[]).flatMap(s=>[...(s.countryIds||[]),...(s.referenceCountryIds||[])])].includes(id);if(belongs)for(let y=Math.max(range.start,r.startYear);y<=Math.min(range.end,r.endYear);y++)sourceYears.add(y);}
   const rows=[...sourceYears].sort((a,b)=>a-b).map(y=>model.read(id,'defence_spending_eur',y)).filter(r=>r.value!=null),name=model.countries.get(id)?.name||id;
   if(!rows.length)popup.append(el('p',{},name+': national defence spending not recorded for these conflict years.'));
   else{const d=el('details');d.append(el('summary',{},`${name} · annual defence spending · ${AtlasCPI.baseYear} USD`));for(const r of rows){const line=el('p',{},`${r.year}: ${fmt(r.value)} ${r.unit}.`);if(r.url)line.append(el('a',{href:r.url,target:'_blank',rel:'noopener'},' Source ↗'));d.append(line);}d.append(el('small',{},'Converted using each record’s own-year exchange rate and US CPI; no missing years are filled.'));popup.append(d);}}
  const sources=new Map(event.records.filter(r=>r.source?.url).map(r=>[r.source.url,r.source]));for(const source of sources.values())popup.append(el('a',{href:source.url,target:'_blank',rel:'noopener',class:'gc-war-source'},(source.title||'Conflict source')+' ↗'));
  const caveats=el('details');caveats.append(el('summary',{},'Dates, scope and limitations'));for(const note of [...new Set(event.records.map(r=>r.caveat).filter(Boolean))])caveats.append(el('p',{},note));caveats.append(el('p',{},'Shading marks recorded active years, not continuous daily fighting or battle locations. Whole-war deaths are not annual deaths. Reference-country matches do not establish historical sovereignty. Gaps in these selective records do not establish peace.'));popup.append(caveats);placePopup(anchor);
 }
 // Group colors are geographic outlines, not a value choropleth. Multiple
 // memberships get alternating colored strokes rather than overwriting one.
 function scheduleOutlines(){if(highlightFrame)return;highlightFrame=requestAnimationFrame(paintOutlines);}
 function paintOutlines(){highlightFrame=0;outlines.replaceChildren();if(!open)return;
  const isGlobe=AtlasGlobe.isActive(),surface=isGlobe?AtlasGlobe.svg:map;outlines.setAttribute('viewBox',isGlobe?`0 0 ${innerWidth} ${innerHeight}`:map.getAttribute('viewBox'));
  const membership=new Map();groups.forEach((g,i)=>g.ids.forEach(id=>{if(!membership.has(id))membership.set(id,[]);membership.get(id).push(i);}));
  for(const[id,list]of membership){const path=surface.querySelector(`path[data-id="ref:${id}"],path[data-id="${id}"]`);if(!path)continue;list.forEach((i,j)=>outlines.append(svg('path',{d:path.getAttribute('d'),fill:'none',stroke:colors[i],'stroke-width':3,'vector-effect':'non-scaling-stroke','stroke-dasharray':list.length>1?`6 ${6*(list.length-1)}`:'','stroke-dashoffset':j*6})));}
 }
 let press=null,canceling=false,lastPick=0;const touches=new Set();
 const surfaceFor=e=>!e.target.closest('foreignObject,.country-hover-explanation')&&e.target.closest('#world,#atlasGlobe,#countrySemanticCanvas');
 document.addEventListener('pointerdown',e=>{if(!picking||canceling||!surfaceFor(e))return;touches.add(e.pointerId);press={x:e.clientX,y:e.clientY,moved:touches.size>1,surface:surfaceFor(e)};},true);
 document.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>6)press.moved=true;},true);
 document.addEventListener('pointercancel',e=>{if(canceling)return;touches.delete(e.pointerId);press=null;},true);
 document.addEventListener('pointerup',e=>{touches.delete(e.pointerId);const p=press;if(!picking||!p||p.moved||touches.size)return;press=null;
  const id=AtlasCountryCanvas.hitTest(e.clientX,e.clientY);if(!id)return;
  e.preventDefault();e.stopImmediatePropagation();canceling=true;p.surface.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:e.pointerId}));canceling=false;lastPick=Date.now();toggleCountry(id);
 },true);
 document.addEventListener('click',e=>{if(!picking||!surfaceFor(e))return;e.preventDefault();e.stopImmediatePropagation();if(e.detail!==0||Date.now()-lastPick<500)return;const id=e.target.closest('[data-country-id]')?.dataset.countryId;if(id)toggleCountry(id);},true);
 document.addEventListener('dblclick',e=>{if(picking&&surfaceFor(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
 document.addEventListener('keydown',e=>{if(picking&&['Enter',' '].includes(e.key)&&surfaceFor(e)){const id=e.target.closest('[data-country-id]')?.dataset.countryId;if(id){e.preventDefault();e.stopImmediatePropagation();toggleCountry(id);}}},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){e.preventDefault();if(picking)setPicking(false);else if(!popup.hidden)closePopup();else show(false);}});
 const oldDraw=draw;draw=function(){oldDraw();refresh();scheduleOutlines();};
 for(const id of ['timelineStart','timelineEnd'])document.getElementById(id).addEventListener('input',()=>{cache=null;serial++;evidence=null;refresh();});
 document.getElementById('timelinePlay').addEventListener('click',refresh);
 window.addEventListener('atlas:globe-render',scheduleOutlines);window.addEventListener('atlas:view-change',scheduleOutlines);window.addEventListener('resize',()=>{refresh();scheduleOutlines();});
 const footer=document.querySelector('footer'),position=()=>{panel.style.setProperty('--group-bottom',(innerHeight-footer.getBoundingClientRect().top+10)+'px');};if(window.ResizeObserver)new ResizeObserver(position).observe(footer);position();
 window.AtlasGroups={show};
})();

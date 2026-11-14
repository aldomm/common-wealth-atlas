/* Up to five named country groups, three independently scaled measures, and
   source-only year/interval charts synchronized with the shared timeline. */
(()=>{'use strict';
 const model=AtlasGroupComparisonModel.create({countries:D.countries,indicators:ExtendedData.indicators,units:D.units,series:AtlasObservations.series,source:AtlasObservations.source,convert:AtlasCurrency.convert,cpi:AtlasCPI});
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
 const measures=el('div',{class:'gc-measures'});panel.append(measures);
 const modeRow=el('div',{class:'gc-row'}),yearButton=button('Selected year',()=>setMode('year')),intervalButton=button('Timeline interval',()=>setMode('interval'));modeRow.append(yearButton,intervalButton);panel.append(modeRow);
 const intervalRow=el('div',{class:'gc-row'});const start=el('input',{type:'number','aria-label':'Comparison from year',min:years[0],max:years.at(-1),step:1}),end=el('input',{type:'number','aria-label':'Comparison to year',min:years[0],max:years.at(-1),step:1});
 for(const [title,input]of [['From',start],['To',end]]){const label=el('label',{},title);label.append(input);intervalRow.append(label);}
 const play=button('▶ Play',()=>document.getElementById('timelinePlay').click(),{'aria-label':'Play this interval'});intervalRow.append(play);panel.append(intervalRow);
 const status=el('p',{class:'gc-notice',role:'status'}),charts=el('div',{id:'atlasGroupCharts'});panel.append(status,charts);
 const method=el('details');method.append(el('summary',{},'How group values and coverage work'));
 for(const text of [
  'Available compatible countries are shown even when other members are missing. Partial totals and averages are labeled with the number included; they are not full-group values. Changes in the contributing countries can also change the trend. Evidence identifies excluded countries and missing weights or conversions. Missing values are never zero, carried forward, or interpolated here. Incompatible records are shown individually instead of combined.',
  'Population and annual GDP totals are summed. GDP/person is total annual GDP divided by total population, using matching GDP and population records. GDP uses 2011 PPP international dollars; defence spending uses source-year exchange rates and US CPI to express 2024 US dollars. These units are not interchangeable.',
  'Other eligible indicators show unweighted means of national values: each country has equal influence. These are comparisons of countries, not pooled population statistics or a newly calculated HDI, life expectancy, mortality rate or poverty rate. National definitions can differ; inspect the evidence.',
  'Gini, wealth-distribution shares and country-specific historical sector indexes are shown as individual country values within each group. Computing a combined distribution needs underlying household data. National Ginis or top-wealth shares cannot simply be averaged.',
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
 function renderMeasures(){measures.replaceChildren();for(let i=0;i<3;i++){
  const label=el('label',{},'Measure '+(i+1)),select=el('select',{'aria-label':'Comparison measure '+(i+1)});select.append(el('option',{value:''},'None'));
  for(const m of model.catalogue){const o=el('option',{value:m.key},m.name+(m.kind==='single'?' · individual countries':''));o.disabled=properties.includes(m.key)&&properties[i]!==m.key;select.append(o);}select.value=properties[i];
  select.addEventListener('change',()=>{properties[i]=select.value;renderMeasures();changed();});label.append(select);measures.append(label);
 }}
 function setMode(value){mode=value;if(mode==='interval')keepYearInInterval();changed();}
 function setChartsMode(value){chartsMode=value;panel.classList.toggle('gc-chart-view',value);editor.hidden=value;measures.hidden=value;chartView.textContent=value?'Edit comparison':'View graphs';panel.scrollTop=0;refresh();AtlasCountryCanvas.schedule();}
 function interval(){const a=document.getElementById('timelineStart'),b=document.getElementById('timelineEnd'),lo=Number(a.value),hi=Number(b.value);return a.value&&b.value&&Number.isInteger(lo)&&Number.isInteger(hi)&&lo>=years[0]&&hi<=years.at(-1)&&lo<=hi?{start:lo,end:hi}:null;}
 function keepYearInInterval(){const span=interval();if(span&&(years[idx]<span.start||years[idx]>span.end))goYear(span.start);}
 for(const [local,id]of [[start,'timelineStart'],[end,'timelineEnd']])local.addEventListener('input',()=>{const target=document.getElementById(id);target.value=local.value;target.dispatchEvent(new Event('input',{bubbles:true}));keepYearInInterval();});
 function show(value){open=value;picking=false;panel.hidden=!open;picker.hidden=true;entry.setAttribute('aria-expanded',String(open));
  if(open){if(groups.length===1&&!groups[0].ids.length){const id=AtlasCountryCanvas.getCountryId();if(id){groups[0].ids=[id];save();}}renderTabs();renderEditor();renderMeasures();refresh();}
  else{serial++;outlines.replaceChildren();entry.focus();}AtlasCountryCanvas.schedule();scheduleOutlines();}
 function renderPicker(){picker.replaceChildren(el('span',{},`Adding to ${groups[active].name} · ${groups[active].ids.length} selected. Tap countries to add/remove; drag to pan.`),button('Done',()=>setPicking(false)));}
 function setPicking(value){picking=value;panel.hidden=value;picker.hidden=!value;if(value){AtlasCountryCanvas.compareMetric(null);AtlasWars?.deactivate();AtlasTrade?.deactivate();AtlasIndustryMarkets?.clear();renderPicker();}else{refresh();}AtlasCountryCanvas.schedule();scheduleOutlines();}
 function goYear(year){const i=years.indexOf(year);if(i<0)return;document.getElementById('timelinePlay').getAttribute('aria-pressed')==='true'&&document.getElementById('timelinePlay').click();const slider=document.getElementById('time');slider.value=i;slider.dispatchEvent(new Event('input',{bubbles:true}));}
 function fmt(value,compact=true){return value==null?'No usable value':value.toLocaleString('en-US',{notation:compact&&Math.abs(value)>=10000?'compact':'standard',maximumSignificantDigits:compact?4:9});}
 function refresh(){if(!open)return;if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}
 function render(){
  frame=0;const y=years[idx],span=interval();start.value=document.getElementById('timelineStart').value;end.value=document.getElementById('timelineEnd').value;
  yearButton.setAttribute('aria-pressed',String(mode==='year'));intervalButton.setAttribute('aria-pressed',String(mode==='interval'));intervalRow.hidden=mode!=='interval';const playing=document.getElementById('timelinePlay').getAttribute('aria-pressed')==='true';play.textContent=playing?'Ⅱ Pause':'▶ Play';play.setAttribute('aria-label',playing?'Pause interval':'Play this interval');play.disabled=!span;
  intro.textContent=chartsMode?`${groups.length} groups · ${properties.filter(Boolean).length} measures · Select a group value for evidence.`:'Build up to 5 groups of any size. Choose up to 3 measures. Each country can belong to more than one group.';
  const keys=properties.filter(Boolean);if(document.activeElement?.matches('.gc-chart svg'))graphFocus=document.activeElement.closest('.gc-chart').dataset.comparisonProperty;charts.replaceChildren();
  if(mode==='interval'&&!span){status.textContent='Choose a valid interval within '+years[0]+'–'+years.at(-1)+'.';return;}
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
 function paintCharts(data,keys,span,y){for(const key of keys){
  const meta=model.metrics.get(key),card=el('article',{class:'gc-chart','data-comparison-property':key});card.append(el('h3',{},meta.name),el('small',{},meta.unit+' · '+meta.method));
  const graph=svg('svg',{viewBox:'0 0 600 225',role:'img','aria-label':meta.name+' comparison graph',tabindex:'0'});
  const all=data[key].flatMap(series=>series.flatMap(o=>o.value!=null?[o]:o.fallback||[])),low=all.length?all.reduce((v,o)=>Math.min(v,o.value),Infinity):0,high=all.length?all.reduce((v,o)=>Math.max(v,o.value),-Infinity):1,pad=(high-low||Math.abs(high)||1)*.05;
  const min=mode==='interval'?low-pad:Math.min(0,low),max=mode==='interval'?high+pad:Math.max(0,high),range=max-min||1;
  const py=v=>180-(v-min)/range*145,x=year=>94+(year-span.start)/Math.max(1,span.end-span.start)*490;
  for(let i=0;i<=3;i++){const v=min+range*i/3,yy=py(v);graph.append(svg('line',{x1:94,x2:584,y1:yy,y2:yy,stroke:'#38565e'}),svg('text',{x:88,y:yy+4,'text-anchor':'end'},fmt(v)));}
  const legend=el('div',{class:'gc-plot-legend','aria-label':meta.name+' group coverage'});
  data[key].forEach((series,i)=>{const plotted=series.filter(o=>o.value!=null||o.fallback?.length),partial=series.filter(o=>o.value!=null&&o.partial),individual=series.filter(o=>o.fallback?.length);const item=el('div');item.style.setProperty('--group-color',colors[i]);item.append(el('strong',{},groups[i].name),el('small',{},plotted.length?`${plotted.length}/${series.length} dates shown${partial.length?' · '+partial.length+' partial':''}${individual.length?' · individual country values included':''}`:'No usable data in this selection — see evidence below'));legend.append(item);});card.append(legend);
  function dot(o,i,xx,label){
   const mark=svg('circle',{cx:xx,cy:py(o.value),r:4+i*1.1,fill:'none',stroke:colors[i],'stroke-width':2,'stroke-dasharray':o.partial?'2 2':''});
   mark.append(svg('title',{},`${label}: ${fmt(o.value,false)} · ${o.periodStart}–${o.periodEnd}${o.partial?' · PARTIAL '+o.covered+'/'+o.total+' countries':''}`));graph.append(mark);
  }
  if(mode==='interval'){
   graph.append(svg('text',{x:94,y:207},span.start),svg('text',{x:584,y:207,'text-anchor':'end'},span.end));
   data[key].forEach((series,i)=>{
    function trace(points,label){let previous=null;const valid=points.filter(o=>o.value!=null);for(const o of valid){
     if(previous){const continuous=o.year===previous.year+1&&o.source===previous.source&&o.unit===previous.unit&&o.periodStart===o.periodEnd&&previous.periodStart===previous.periodEnd&&JSON.stringify(o.includedIds)===JSON.stringify(previous.includedIds);
      const segment=svg('line',{x1:x(previous.year),y1:py(previous.value),x2:x(o.year),y2:py(o.value),stroke:colors[i],'stroke-width':2,'stroke-dasharray':continuous?(i?'10 2':''):'4 5','stroke-dashoffset':i*2});segment.append(svg('title',{},continuous?'Consecutive records with the same coverage':'Visual connection only: missing years, changed coverage or reporting basis; no values inferred'));graph.append(segment);
     }else if(valid.length===1)graph.append(svg('line',{x1:x(o.year),x2:x(o.year),y1:py(o.value)-7,y2:py(o.value)+7,stroke:colors[i]}));
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
    for(const point of points){graph.append(svg('line',{x1:xx,x2:xx,y1:py(0),y2:py(point.value),stroke:colors[i],'stroke-width':2,'stroke-dasharray':point.partial?'4 4':''}));dot(point,i,xx,groups[i].name+(point.id?' / '+model.countries.get(point.id)?.name:''));}
    if(!points.length)graph.append(svg('text',{x:xx,y:110,'text-anchor':'middle'},'No data'));graph.append(svg('text',{x:xx,y:207,'text-anchor':'middle'},String.fromCharCode(65+i)));
   });
  }
  card.append(graph);
  if(!all.length)card.append(el('p',{class:'gc-muted'},'No usable records for this selection. Every group remains listed; missing data is not zero.'));
  if(mode==='interval')card.append(el('p',{class:'gc-muted'},'Dots are available records. Dashed connections span missing years or changed coverage/basis; they do not create values. Dotted rings indicate partial groups. Click the graph to move the shared year.'));
  if(meta.kind==='mean')card.append(el('p',{class:'gc-muted'},'Equal weight per country — not a pooled population measure.'));
  if(meta.kind==='single')card.append(el('p',{class:'gc-muted'},'Country values are shown individually within each group; no combined distribution is invented.'));
  const values=el('div',{class:'gc-values'});data[key].forEach((series,i)=>{
   const o=series.find(o=>o.year===y),count=series.filter(o=>o.value!=null||o.fallback?.length).length;
   const b=button('',()=>{evidence=evidence?.key===key&&evidence.i===i&&evidence.year===y?null:{key,i,year:y};refresh();},{class:'gc-value','aria-label':`Evidence for ${groups[i].name}, ${meta.name}, ${y}`});b.style.setProperty('--group-color',colors[i]);
   b.append(el('strong',{},`${String.fromCharCode(65+i)} · ${groups[i].name}`));const text=el('span',{},o?.value!=null?(o.partial?'PARTIAL · ':'')+fmt(o.value):o?.reason||'Selected year is outside the interval');text.append(el('small',{},`${o?(o.fallback?.length?o.fallback.length+'/'+groups[i].ids.length+' countries shown individually':o.covered+'/'+groups[i].ids.length+' contributing countries'):'Outside interval'}${mode==='interval'?` · ${count}/${span.end-span.start+1} plotted years`:''}${o?.value!=null&&o.periodStart!==o.periodEnd?` · source window ${o.periodStart}–${o.periodEnd}`:''}`));b.append(text);values.append(b);
  });card.append(values);
  if(evidence?.key===key)renderEvidence(card,evidence,span);
  charts.append(card);
 }if(graphFocus&&document.activeElement===document.body)charts.querySelector('[data-comparison-property="'+graphFocus+'"] svg')?.focus({preventScroll:true});graphFocus=null;}
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
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){e.preventDefault();if(picking)setPicking(false);else show(false);}});
 const oldDraw=draw;draw=function(){oldDraw();refresh();scheduleOutlines();};
 for(const id of ['timelineStart','timelineEnd'])document.getElementById(id).addEventListener('input',()=>{cache=null;serial++;evidence=null;refresh();});
 document.getElementById('timelinePlay').addEventListener('click',refresh);
 window.addEventListener('atlas:globe-render',scheduleOutlines);window.addEventListener('atlas:view-change',scheduleOutlines);window.addEventListener('resize',()=>{refresh();scheduleOutlines();});
 const footer=document.querySelector('footer'),position=()=>{panel.style.setProperty('--group-bottom',(innerHeight-footer.getBoundingClientRect().top+10)+'px');};if(window.ResizeObserver)new ResizeObserver(position).observe(footer);position();
 window.AtlasGroups={show};
})();

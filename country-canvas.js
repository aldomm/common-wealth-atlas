/* National evidence labels contained inside projected present-day reference polygons. */
(()=>{'use strict';
const ns='http://www.w3.org/2000/svg',countries=D.countries.filter(c=>Number.isFinite(c.lon)&&Number.isFinite(c.lat)&&!['SUN','CSK','YUG'].includes(c.id));
const state={country:null,hover:null,metric:null,contentFocus:null,jump:null,frame:0,lock:false};
const geometry=new Map(),maskCache=new Map(),hitCanvas=document.createElement('canvas'),hit=hitCanvas.getContext('2d');
const overlay=document.createElementNS(ns,'svg');overlay.id='countrySemanticCanvas';overlay.setAttribute('aria-label','National data inside present-day reference countries');document.body.append(overlay);
document.body.classList.add('atlas-semantic-canvas','atlas-contained-labels');window.AtlasEvidence?.closeMenu();
const year=()=>years[idx],globe=()=>!!window.AtlasGlobe?.isActive(),getZoom=()=>globe()?AtlasGlobe.getZoom():z;
const paths={
 school:'M3 10 12 4l9 6-9 6-9-6M6 12v6l6 3 6-3v-6M21 10v8',
 water:'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13M8 15a4 4 0 0 0 4 4',
 power:'M13 2 5 14h6l-1 8 9-13h-7l1-7',
 health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3',
 people:'M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6M16 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2 21v-5a6 6 0 0 1 12 0v5M14 13a5 5 0 0 1 8 4v4',
 income:'M3 6h18v13H3V6M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M5 9h1M18 16h1',
 wars:'M3 3l18 18M21 3 3 21M3 3v6M3 3h6M21 3v6M21 3h-6',
 trade:'M3 7h16l-4-4M21 17H5l4 4M19 7l-4 4M5 17l4-4',
 events:'M4 22V3h15l-4 5 4 5H4M9 6v3M9 11h.1',
 infant:'M7 9a5 5 0 1 0 10 0 5 5 0 0 0-10 0M5 21v-2a7 7 0 0 1 14 0v2M9 8h.1M15 8h.1M10 11q2 2 4 0',
 sanitation:'M5 3h8v7H5V3M5 10h14v4a7 7 0 0 1-7 7H8v-5M8 21h8M8 6h2',
 happiness:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M7 9h.1M17 9h.1M7 14q5 7 10 0',
 network:'M12 12 4 4M12 12l8-8M12 12l-8 8M12 12l8 8M10 10h4v4h-4v-4M2 2h4v4H2V2M18 2h4v4h-4V2M2 18h4v4H2v-4M18 18h4v4h-4v-4',
 inequality:'M3 21h18M6 17V9h4v8M14 17V3h4v14',
 development:'M3 21V3M3 21h18M6 17l5-6 4 2 6-9',
 factory:'M3 22V9l6 4V8l6 5V3h4v19H3M6 17h2M11 17h2M16 17h2'
};
function glyph(key){return ({gdp:'income',pop:'people',life:'health',happiness:'happiness',hdi:'development',school_mean:'school',school_expected:'school',water:'water',sanitation:'sanitation',electricity:'power',internet:'network',poverty:'income',poverty_lower_middle:'income',poverty_upper_middle:'income',gini:'inequality',infant_mortality:'infant',under5_mortality:'infant',birth_rate:'infant',death_rate:'health',exports:'trade',imports:'trade',trade:'trade',wars:'wars',events:'events',production:'factory',distribution:'inequality',all_indicators:'network'})[key]||'development';}
function node(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!=null)n.textContent=text;return n;}
function text(group,x,y,value,cls='country-label-text'){group.append(node('text',{x,y,class:cls},value));}
function shape(c){
 if(geometry.has(c.id))return geometry.get(c.id);
 const b=D.boundaries.find(b=>b.id===c.id);let result={path:b?new Path2D(b.path):null,bounds:null,lon:c.lon,lat:c.lat};
 if(b){const rings=(b.path.match(/M[^Zz]+[Zz]/g)||[]).map(s=>{const a=s.match(/-?\d+(?:\.\d+)?/g).map(Number),xs=[],ys=[];for(let i=0;i<a.length;i+=2){xs.push(a[i]);ys.push(a[i+1]);}return {s,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};});
  const x=(c.lon+180)*3,y=(90-c.lat)*3;
  const containing=rings.filter(r=>hit.isPointInPath(new Path2D(r.s),x,y,'evenodd'));
  const ranked=(containing.length?containing:rings).sort((a,b)=>containing.length?((b.maxX-b.minX)*(b.maxY-b.minY)-(a.maxX-a.minX)*(a.maxY-a.minY)):(Math.hypot((a.minX+a.maxX)/2-x,(a.minY+a.maxY)/2-y)-Math.hypot((b.minX+b.maxX)/2-x,(b.minY+b.maxY)/2-y)));
  if(ranked[0]){result.bounds=ranked[0];result.lon=(ranked[0].minX+ranked[0].maxX)/6-180;result.lat=90-(ranked[0].minY+ranked[0].maxY)/6;}
 }
 geometry.set(c.id,result);return result;
}
function fitZoom(c){const s=shape(c),b=s.bounds;if(!b)return getZoom();const spanX=b?Math.max(.008,(b.maxX-b.minX)/3):3,spanY=b?Math.max(.008,(b.maxY-b.minY)/3):3;
 if(globe()){const view=AtlasGlobe.getView(),base=view.scale/view.zoom;return Math.max(.7,Math.min(5000,Math.min(innerWidth*.78/(base*Math.max(.0001,spanX*Math.PI/180*Math.cos(s.lat*Math.PI/180))),innerHeight*.64/(base*spanY*Math.PI/180))));}
 const base=Math.min(innerWidth/1140,innerHeight/660);return Math.max(.03,Math.min(5000,Math.min(innerWidth*.78/(spanX*3),innerHeight*.64/(spanY*3))/base));
}
function pointFor(c){const s=shape(c);if(globe())return AtlasGlobe.project(s.lon,s.lat);const vb=map.viewBox.baseVal,k=innerWidth/vb.width;return [((s.lon+180)*3-vb.x)*k,((90-s.lat)*3-vb.y)*k];}
function getCountry(){return state.country?countries.find(c=>c.id===state.country):null;}
function focusCountry(id,options={}){const c=countries.find(c=>c.id===id);if(!c)return false;state.country=id;state.hover=id;state.metric=null;state.contentFocus=null;state.lock=true;const s=shape(c);window.AtlasEvidence?.closeMenu();if(options.fit!==false){if(globe())AtlasGlobe.focus(s.lon,s.lat,fitZoom(c));else{cx=(s.lon+180)*3;cy=(90-s.lat)*3;z=fitZoom(c);draw();}}render();return true;}
function eventsFor(c,current){return (window.AtlasEvents?.records()||[]).filter(r=>(r.referenceCountryId===c.id||r.countryIds?.includes(c.id))&&(!current||r.startYear<=year()&&year()<=r.endYear));}
function developmentFor(c){return window.HistoricalDevelopment?.series.find(s=>s.mapReference?.id===c.id)?.values.filter(v=>v.year<=year()).sort((a,b)=>b.year-a.year)[0];}
function government(c){const m=resolveGovernment(null,year(),c),o=m.observation,types=['Closed autocracy','Electoral autocracy','Electoral democracy','Liberal democracy'];return {match:m,o,type:GovernmentTypes.countries[m.id]?.[year()]?.type||(o?.v2x_regime!=null?types[+o.v2x_regime]:'Not recorded')};}
const names={gdp:'GDP/person',pop:'Population',total_gdp:'Total GDP*',hdi:'HDI',life:'Life expectancy',happiness:'Happiness',school_mean:'Schooling',school_expected:'Expected school',water:'Drinking water',sanitation:'Sanitation',electricity:'Electricity',internet:'Internet',poverty:'Extreme poverty',poverty_lower_middle:'Poverty · $4.20',poverty_upper_middle:'Poverty · $8.30',gini:'Inequality',infant_mortality:'Infant mortality',under5_mortality:'Child mortality',birth_rate:'Birth rate',death_rate:'Death rate',exports:'Exports',imports:'Imports',government:'Government',trade:'Trade links',wars:'War & opponents',events:'Wars & crises',development:'Historical AHDI',production:'Production & sectors',distribution:'Wealth & income',all_indicators:'All indicators',agriculture_share:'Agriculture',industry_share:'Industry',manufacturing_share:'Manufacturing',services_share:'Services'};
names.defence_spending_eur='Defence spending';names.defence_spending_gdp='Defence / GDP';
const compactUnits={defence_spending_eur:' EUR',defence_spending_gdp:'% GDP',agriculture_share:'% GDP',industry_share:'% GDP',manufacturing_share:'% GDP',services_share:'% GDP',gdp:' int.$',total_gdp:' int.$',life:' y',school_mean:' y',school_expected:' y',water:'%',sanitation:'%',electricity:'%',internet:'%',poverty:'%',poverty_lower_middle:'%',poverty_upper_middle:'%',exports:'% GDP',imports:'% GDP',infant_mortality:'/1k',under5_mortality:'/1k',birth_rate:'/1k',death_rate:'/1k'};
for(const [key,meta] of Object.entries(ExtendedData.indicators)){names[key]??=meta.compactName||meta.name;compactUnits[key]??=meta.compactUnit||(key.startsWith('wealth_')?'%':'');}
const categoryKeys=['production','distribution','all_indicators'];
const primary=['gdp','pop','total_gdp','hdi','life'];
function observationFor(c,key){return key==='total_gdp'?totalGDP(c):AtlasObservations.resolve(c,key,year());}
function metricKeys(c){return [...new Set([...primary,...Object.keys(ExtendedData.indicators)])].filter(key=>!c||!ExtendedData.indicators[key]?.applicableCountries||ExtendedData.indicators[key].applicableCountries.includes(c.id));}
function totalGDP(c){
 const a=AtlasObservations.resolve(c,'gdp',year()),b=AtlasObservations.resolve(c,'pop',year());
 const ay=a.status==='last'?a.sourceYear:year(),by=b.status==='last'?b.sourceYear:year();
 if(a.value==null||b.value==null||ay!==by||a.sourceUrl!==b.sourceUrl||a.unit!==WorldData.units.gdp||b.unit!==WorldData.units.pop)return {value:null,status:'unavailable',targetYear:year(),method:'Total GDP requires GDP/person and population from the same compatible source year and series.',sourceUrl:WorldData.source};
 const estimated=a.status==='interpolated'||b.status==='interpolated',last=ay!==year();
 return {value:a.value*b.value*1000,status:last?'last':estimated?'interpolated':'exact',targetYear:year(),sourceYear:ay,periodStart:ay,periodEnd:ay,derived:true,estimateKind:a.estimateKind==='extrapolated'||b.estimateKind==='extrapolated'?'extrapolated':estimated?'interpolated':null,from:estimated?Math.min(a.from??year(),b.from??year()):null,to:estimated?Math.max(a.to??year(),b.to??year()):null,sourceUrl:a.sourceUrl,sourceRows:[...a.sourceRows,...b.sourceRows],method:`Derived: GDP/person × population in thousands × 1,000, both for ${ay}. Not an independently reported national total.`,components:[a,b],unit:'2011 international dollars'};
}
function observations(c){return metricKeys(c).map(key=>({key,o:observationFor(c,key)}));}
function shortValue(key,o){
 if(o.value==null)return 'Not recorded';let value=key==='pop'?o.value*1000:o.value;
 const fx=window.AtlasCurrency?.observation(o,key,year());
 const compact=['gdp','total_gdp','pop','defence_spending_eur'].includes(key),v=value.toLocaleString('en-US',{notation:compact?'compact':'standard',maximumFractionDigits:['hdi','development'].includes(key)?3:1});
 const period=o.periodStart!=null&&o.periodStart!==o.periodEnd?`${o.periodStart}–${o.periodEnd}`:o.sourceYear;
 return (o.status==='interpolated'?'≈ ':'')+(fx?AtlasCurrency.format(fx):v+(compactUnits[key]||''))+(o.status==='interpolated'?(o.estimateKind==='extrapolated'?' · extrapolated':' · interpolated'):(o.derived||o.raw?.status?.startsWith('calculated'))?' · calculated':'')+(o.status==='last'?` · ${period}`:o.periodStart!=null&&o.periodStart!==o.periodEnd?` · ${period}`:'');
}
function textWidth(value,font){hit.font=font;return hit.measureText(value).width;}
function collision(a,b,pad=16){return a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;}
function contained(mask,rect){
 const x=Math.floor(rect.x-mask.x-2),y=Math.floor(rect.y-mask.y-2),r=Math.ceil(rect.x+rect.w-mask.x+2),b=Math.ceil(rect.y+rect.h-mask.y+2);
 if(x<0||y<0||r>mask.w||b>mask.h)return false;
 const stride=mask.w+1,s=mask.sum,total=s[b*stride+r]-s[y*stride+r]-s[b*stride+x]+s[y*stride+x];return total===(r-x)*(b-y);
}
function projectedMask(c){
 const surface=globe()?AtlasGlobe.svg:map,el=surface.querySelector(`path[data-id="ref:${c.id}"],path[data-id="${c.id}"]`);if(!el)return null;
 const d=el.getAttribute('d');if(!d)return null;const b=el.getBBox(),v=surface.viewBox.baseVal,k=globe()?1:innerWidth/v.width;
 const bx=globe()?b.x:(b.x-v.x)*k,by=globe()?b.y:(b.y-v.y)*k;
 const x=Math.max(4,Math.floor(bx)),y=Math.max(65,Math.floor(by)),right=Math.min(innerWidth-4,Math.ceil(bx+b.width*k)),bottom=Math.min(innerHeight-112,Math.ceil(by+b.height*k));
 const w=right-x,h=bottom-y;if(w<28||h<16||w*h<600)return null;
 const signature=d+'|'+[x,y,w,h,k,v.x,v.y].join(',');const cached=maskCache.get(c.id);if(cached?.signature===signature)return cached.mask;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.translate(-x,-y);if(!globe()){ctx.scale(k,k);ctx.translate(-v.x,-v.y);}ctx.fillStyle='#fff';ctx.fill(new Path2D(d),'evenodd');
 const data=ctx.getImageData(0,0,w,h).data,stride=w+1,sum=new Uint32Array((w+1)*(h+1));let area=0,mx=0,my=0;
 for(let yy=0;yy<h;yy++){let row=0;for(let xx=0;xx<w;xx++){const inside=data[(yy*w+xx)*4+3]>=250?1:0;row+=inside;sum[(yy+1)*stride+xx+1]=sum[yy*stride+xx+1]+row;if(inside){area++;mx+=xx;my+=yy;}}}
 const mask={x,y,w,h,sum,area,center:area?[x+mx/area,y+my/area]:[x+w/2,y+h/2],signature};maskCache.set(c.id,{signature,mask});return mask;
}
function candidates(mask){const list=[],step=18;for(let y=mask.y+9;y<mask.y+mask.h;y+=step)for(let x=mask.x+9;x<mask.x+mask.w;x+=step)if(contained(mask,{x:x-1,y:y-1,w:2,h:2}))list.push([x,y]);return list.sort((a,b)=>Math.hypot(a[0]-mask.center[0],a[1]-mask.center[1])-Math.hypot(b[0]-mask.center[0],b[1]-mask.center[1]));}
function place(mask,points,w,h,occupied){for(const p of points){const rect={x:Math.round(p[0]-w/2),y:Math.round(p[1]-h/2),w,h};if(contained(mask,rect)&&!occupied.some(b=>collision(rect,b)))return rect;}return null;}
function budget(area,ratio=1){if(area<4500)return 0;const cap=ratio>3?26:ratio>2?17:12;return Math.min(cap,Math.max(1,Math.floor(area/18000)));}
let currentLabels=[],localLabels=[],hoverNode=null;const countryTitles=new Map();
function dispatch(c,action,evidenceId){state.country=c.id;window.dispatchEvent(new CustomEvent('atlas:country-action',{detail:{countryId:c.id,action,...(evidenceId?{evidenceId}:{})}}));}
const phoneLayout=()=>innerWidth<=600;
function makeLabel(c,key,o,rect){
 const special=['government','trade','wars','events','development','reference',...categoryKeys].includes(key),label={c,key,o,rect};
 const g=node('g',{transform:`translate(${rect.x} ${rect.y})`,class:'contained-country-label '+(o?.value==null&&firstRecord(c,key)!=null?'country-missing-action ':'')+(o?.status==='last'?'country-last':o?.status==='interpolated'?'country-estimate':''),tabindex:'0',role:'button','data-country-id':c.id,'data-country-metric':key,'aria-label':c.name+' · '+(names[key]||key)+' · '+(o?shortValue(key,o):'Explore evidence')});
 g.append(node('rect',{x:0,y:0,width:rect.w,height:rect.h,fill:'transparent',stroke:'none'}));
 const icon=node('g',{transform:phoneLayout()?'translate(5 13) scale(.7)':'translate(1 5) scale(.56)'});icon.append(node('path',{d:paths[glyph(key==='total_gdp'?'gdp':key)],fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}));g.append(icon);
 text(g,phoneLayout()?27:19,phoneLayout()?17:10,names[key]||ExtendedData.indicators[key]?.name||key,'contained-metric-name');
 const value=categoryKeys.includes(key)?categorySubtitle(key):key==='wars'?((window.AtlasWars?.records(c.id,year()).length||0)+' source records →'):key==='trade'?(tradeCoverage(c)?'coverage →':'check sources →'):o?shortValue(key,o):key==='trade'?'coverage →':key==='events'?`${eventsFor(c,false).length} documented`:key==='government'?government(c).type:'source context';
 text(g,phoneLayout()?27:19,phoneLayout()?37:25,value.length>31?value.slice(0,29)+'…':value,'contained-metric-value');
 const hover=()=>{state.hover={countryId:c.id,key};showHover(label);};
 
 g.addEventListener('click',()=>{if(o?.value==null&&firstRecord(c,key)!=null)jumpToFirst(c,key);else if(key==='trade'||key==='wars')dispatch(c,key);else hover();});
 g.addEventListener('keydown',ev=>{if(ev.key==='Escape'){hideHover();g.blur();}if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();if(o?.value==null&&firstRecord(c,key)!=null)jumpToFirst(c,key);else if(key==='trade'||key==='wars')dispatch(c,key);else hover();}});
 overlay.append(g);currentLabels.push(label);return label;
}
const coverageCache=new Map();
function tradeCoverage(c){
 const key=year();if(!coverageCache.has(key)){const ids=new Set();for(const ds of window.TradeManifest?.datasets||[]){const sourceYear=(ds.years||[]).reduce((last,y)=>y<=key&&y>last?y:last,-Infinity);if(!Number.isFinite(sourceYear))continue;for(const entity of Object.values(ds.entities||{}))for(const link of entity.mapLinks||[])if(link.kind==='reference'&&(link.from==null||link.from<=sourceYear)&&(link.to==null||sourceYear<=link.to))ids.add(link.id);}for(const r of window.TradeFlows?.records||[])if(r.year<=key){ids.add(r.originISO);ids.add(r.destinationISO);}coverageCache.set(key,ids);}return coverageCache.get(key).has(c.id);
}
function categorySubtitle(key){return ({production:'value-added shares →',distribution:'distribution evidence →',all_indicators:'every loaded series →'})[key];}
function orderedRows(c,available,missing,extras,missingSpecial,count,area,ratio){
 const headlines=available.filter(r=>primary.includes(r.key)),others=available.filter(r=>!primary.includes(r.key));
 const lead=Math.min(headlines.length,Math.max(1,Math.min(3,count-4)));
 return [...headlines.slice(0,lead),{key:'trade',o:null},{key:'wars',o:null},...categoryKeys.map(key=>({key,o:null})),...headlines.slice(lead),...others,...extras,...(area>140000&&ratio>2.3?[...missing,...missingSpecial]:[])];
}
function categoryInfo(c,key){
 const sectors=[...['agriculture_share','industry_share','manufacturing_share','services_share'].filter(k=>ExtendedData.indicators[k]),...metricKeys(c).filter(k=>k.startsWith('hna_'))],wealth=metricKeys(c).filter(k=>/wealth|networth|asset/i.test(k));
 const income=['gini','poverty','poverty_lower_middle','poverty_upper_middle'].filter(k=>ExtendedData.indicators[k]);
 if(key==='production')return {title:c.name+' · production & sectors',lines:['Modern WDI value-added shares and separately labeled historical reconstructions. Historical volume indexes measure sector growth (1913 = 100), not GDP shares. Each value retains its own source year.','Manufacturing is already a subset of industry. Do not add it again to agriculture + industry + services. The broad sectors need not sum to 100% because of taxes, subsidies and other accounting differences.','Do not multiply these shares by the atlas’s reconstructed PPP GDP total without reconciling source definitions and years.',sectors.length?'Choose a sector below for its definition, date and source.':'Sector shares are not loaded in this build. No composition has been inferred.'],catalog:sectors,actions:['all_indicators','trade'],source:{url:'global-sources.html',title:'Indicator sources'}};
 if(key==='distribution')return {title:c.name+' · wealth & income distribution',lines:['Income inequality, poverty and wealth ownership are different measurements. GDP/person is an average output measure and says nothing by itself about how income or assets are distributed.',wealth.length?'Wealth measures below use their own source population, units and dates; they are not income shares.':'Wealth shares are not yet published in this atlas. Income Gini and poverty below must not be presented as wealth distribution.','Gini may describe income or consumption according to the survey. Poverty measures report population below the stated PPP poverty line. Select each series to inspect its definition and source.'],catalog:[...income,...wealth],actions:['all_indicators','production'],source:{url:'wealth-sources.html',title:'OECD wealth sources & coverage'}};
 return {title:c.name+' · all indicators',lines:[`Every loaded numeric series is accessible here for ${year()}, including those omitted from the map for space.`,`Values marked last are dated earlier references. Calculated estimates remain labeled. A missing series can move the entire timeline to its next available loaded value; it does not alter only that indicator.`],catalog:metricKeys(c),actions:['trade','wars','production','distribution','government','events','development'],source:{url:'sources.html#'+c.id,title:'Country bibliography'}};
}
function appendCategoryActions(body,label,keys){
 const actions=document.createElement('div');actions.className='country-category-actions';
 for(const key of keys){const b=document.createElement('button');b.type='button';b.textContent=names[key]||key;b.addEventListener('click',()=>{if(key==='trade'||key==='wars'){hideHover();dispatch(label.c,key);}else showHover({c:label.c,key,o:null,rect:label.rect});});actions.append(b);}body.append(actions);
}
function appendCatalog(body,label,keys){
 const search=document.createElement('input');search.type='search';search.className='country-catalog-search';search.placeholder='Find an indicator';search.setAttribute('aria-label','Find a loaded indicator');body.append(search);
 const list=document.createElement('div');list.className='country-indicator-catalog';body.append(list);
 for(const key of [...keys].sort((a,b)=>Number(observationFor(label.c,a).value==null)-Number(observationFor(label.c,b).value==null))){const o=observationFor(label.c,key),row=document.createElement('div');row.className='country-catalog-row';row.dataset.search=(names[key]||ExtendedData.indicators[key]?.name||key).toLowerCase();
  const inspect=document.createElement('button');inspect.type='button';inspect.className='country-catalog-inspect';const title=document.createElement('span');title.textContent=names[key]||ExtendedData.indicators[key]?.name||key;inspect.append(title);const value=document.createElement('small');value.textContent=shortValue(key,o);inspect.append(value);inspect.addEventListener('click',()=>showHover({c:label.c,key,o,rect:label.rect}));row.append(inspect);
  if(o.value==null){const first=firstRecord(label.c,key);const availability=document.createElement(first==null?'small':'button');availability.textContent=first==null?'No value loaded':'Show next available: '+first;availability.className='country-catalog-first';if(first!=null){availability.type='button';availability.addEventListener('click',()=>{jumpToFirst(label.c,key);const updated=observationFor(label.c,key);showHover({c:label.c,key,o:updated,rect:label.rect});});}row.append(availability);}
  list.append(row);
 }
 search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();list.querySelectorAll('.country-catalog-row').forEach(row=>row.hidden=!row.dataset.search.includes(q));});
}
function drawCountry(c,mask,occupied){
 const points=candidates(mask);if(!points.length)return;
 hit.font=phoneLayout()?'650 16px system-ui':'650 12px system-ui';const nameW=Math.ceil(hit.measureText(c.name).width+(phoneLayout()?16:6)),title=place(mask,points,nameW,phoneLayout()?44:16,occupied);
 if(title){const label={c,key:'all_indicators',o:null,rect:title},name=node('g',{class:'country-name-access',tabindex:'0',role:'button','aria-label':c.name+' · open all indicators'});name.append(node('rect',{x:title.x,y:title.y,width:title.w,height:title.h,fill:'transparent'}));text(name,title.x+(phoneLayout()?8:0),title.y+(phoneLayout()?28:13),c.name,'contained-country-name');name.addEventListener('click',()=>showHover(label));name.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();showHover(label);}});overlay.append(name);countryTitles.set(c.id,title);occupied.push(title);}
 const ratio=getZoom()/fitZoom(c),count=budget(mask.area,ratio);if(!count)return;
 const rows=observations(c),available=rows.filter(r=>r.o.value!=null),missing=rows.filter(r=>r.o.value==null);
 const extras=[],missingSpecial=[];
 const gov=government(c);(gov.type!=='Not recorded'?extras:missingSpecial).push({key:'government',o:gov.type!=='Not recorded'?null:{value:null,status:'unavailable'}});
 const activeEvents=eventsFor(c,true);(activeEvents.length?extras:missingSpecial).push({key:'events',o:activeEvents.length?null:{value:null,status:'unavailable'}});
 const tradeKnown=tradeCoverage(c);

 const dev=developmentFor(c);if(dev)extras.unshift({key:'development',o:{value:dev.value,status:dev.year===year()?'exact':'last',sourceYear:dev.year,periodStart:dev.year,periodEnd:dev.year,sourceUrl:HistoricalDevelopment.sourceUrl}});else missingSpecial.push({key:'development',o:{value:null,status:'unavailable'}});
 const ordered=orderedRows(c,available,missing,extras,missingSpecial,count,mask.area,ratio);let placed=0;
 for(const {key,o}of ordered){if(placed>=count)break;const val=categoryKeys.includes(key)?categorySubtitle(key):key==='wars'?((window.AtlasWars?.records(c.id,year()).length||0)+' source records →'):key==='trade'?(tradeCoverage(c)?'coverage →':'check sources →'):o?shortValue(key,o):key==='government'?government(c).type:key==='trade'?'coverage →':`${eventsFor(c,false).length} documented`;
  const mobile=phoneLayout(),w=Math.max(76,Math.min(mobile?290:190,Math.max(textWidth(names[key]||ExtendedData.indicators[key]?.name||key,mobile?'13px system-ui':'10px system-ui'),textWidth(val.length>31?val.slice(0,29)+'…':val,mobile?'550 15px system-ui':'550 12px system-ui'))+(mobile?36:24))),rect=place(mask,points,w,mobile?48:29,occupied);if(!rect)continue;
  occupied.push(rect);makeLabel(c,key,o,rect);placed++;
 }
}
function localPoints(visible,occupied){
 const allowed=new Set(visible.filter(({c,mask})=>mask.area>50000&&getZoom()/fitZoom(c)>1.5).map(({c})=>c.id)),points=[];
 for(const r of window.EconomicEvidence?.records||[]){if(!allowed.has(r.referenceCountryId)||r.startYear>year()||r.endYear<year()||!Number.isFinite(r.lon)||!Number.isFinite(r.lat))continue;
  let p;if(globe())p=AtlasGlobe.project(r.lon,r.lat);else{const v=map.viewBox.baseVal,k=innerWidth/v.width;p=[((r.lon+180)*3-v.x)*k,((90-r.lat)*3-v.y)*k];}if(!p||p[0]<12||p[0]>innerWidth-12||p[1]<77||p[1]>innerHeight-125)continue;
  const nearby=points.find(point=>Math.hypot(point.p[0]-p[0],point.p[1]-p[1])<10);if(nearby){nearby.records.push(r);continue;}
  const rect={x:p[0]-9,y:p[1]-9,w:18,h:18};if(occupied.some(b=>collision(rect,b,2)))continue;const c=countries.find(c=>c.id===r.referenceCountryId);if(!c)continue;points.push({c,p,rect,records:[r]});occupied.push(rect);
 }
 return points;
}
function drawLocalPoints(points){
 for(const point of points){const {c,p,rect,records}=point,key='local:'+records[0].id,label={c,key,rect,records};const g=node('g',{transform:`translate(${p[0]-7} ${p[1]-7})`,class:'country-local-geographic-point',tabindex:'0',role:'button','aria-label':records.map(r=>r.title).join('; ')+'; documented geographic point'});
  g.append(node('circle',{cx:7,cy:7,r:9,fill:'#17343b',stroke:'#d8b879','stroke-width':'.8'}));const icon=node('g',{transform:'scale(.58)'});icon.append(node('path',{d:paths[records[0].category==='production'?'factory':records[0].category==='livelihoods'?'people':records[0].category==='transport'?'trade':'income'],fill:'none',stroke:'#efd29a','stroke-width':'1.7'}));g.append(icon);
  const hover=()=>showHover(label),activate=()=>{const linked=records.find(r=>r.marketLinks?.some(l=>(l.fromYear??-Infinity)<=year()&&year()<=(l.toYear??Infinity)));if(linked)dispatch(c,'industry-markets',linked.id);else hover();};
  g.addEventListener('click',activate);g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();activate();}});overlay.append(g);localLabels.push(label);
 }
}
function missingOutlinePoints(occupied){
 for(const c of countries){if(D.boundaries.some(b=>b.id===c.id))continue;const p=pointFor(c);if(!p||p[0]<10||p[0]>innerWidth-10||p[1]<70||p[1]>innerHeight-115)continue;
  const g=node('g',{transform:`translate(${p[0]} ${p[1]})`,class:'country-reference-point',tabindex:'0',role:'button','aria-label':c.name+' reference point; outline unavailable'});g.append(node('path',{d:'M0-4 4 0 0 4-4 0Z',fill:'#9eb9be',stroke:'#e0eeee','stroke-width':'.6'}));
  const rect={x:p[0]+7,y:p[1]-8,w:c.name.length*6+8,h:17};if(getZoom()>2&&!occupied.some(r=>collision(rect,r))){text(g,7,4,c.name+' ◇','contained-reference-name');occupied.push(rect);}
  const label={c,key:'reference',o:null,rect:{x:p[0],y:p[1],w:8,h:8}};const hover=()=>showHover(label);g.addEventListener('click',hover);overlay.append(g);
 }
}
function firstRecord(c,key){
 if(['government','trade','wars','events','development','reference',...categoryKeys].includes(key))return null;
 if(key==='total_gdp'){const a=AtlasObservations.availableYears(c,'gdp'),b=new Set(AtlasObservations.availableYears(c,'pop'));return a.filter(y=>y>year()).find(y=>b.has(y))??null;}
 return AtlasObservations.availableYears(c,key).find(y=>y>year())??null;
}
function jumpToFirst(c,key){
 const target=firstRecord(c,key);if(target==null)return;
 const requested=year(),saved={cx,cy,z,globeView:globe()?AtlasGlobe.getView():null};state.jump={countryId:c.id,key,requestedYear:requested,jumpedYear:target};state.country=c.id;
 // Canonical timeline change updates borders, politics, trade and every numeric series.
 if(!years.includes(target)){$('geography').value='auto';changeGeography();}
 setBoundaryDate(target+'-01-01');cx=saved.cx;cy=saved.cy;z=saved.z;if(saved.globeView&&globe())AtlasGlobe.focus(saved.globeView.longitude,saved.globeView.latitude,saved.globeView.zoom);else draw();
 render();
}
function drawJumpFlag(){
 if(!state.jump)return;if(year()!==state.jump.jumpedYear){state.jump=null;return;}
 const j=state.jump,label=currentLabels.find(l=>l.c.id===j.countryId&&l.key===j.key),kind=label?.o?.estimateKind==='extrapolated'?'extrapolated value':label?.o?.status==='interpolated'?'interpolated value':label?.o?.derived?'calculated value':'data',message=`Requested ${j.requestedYear} · showing ${j.jumpedYear} ${kind}`,width=Math.ceil(textWidth(message,'600 10px system-ui')+4);let p=null;
 if(label){const mask=projectedMask(label.c);for(const candidate of [{x:label.rect.x,y:label.rect.y+label.rect.h+6,w:width,h:15},{x:label.rect.x,y:label.rect.y-19,w:width,h:15}])if(contained(mask,candidate)&&!currentLabels.some(l=>l!==label&&collision(candidate,l.rect,2))){p=candidate;break;}}
 if(!p)p={x:12,y:innerHeight-130};text(overlay,p.x,p.y+11,message,'country-jump-flag');
}
function detailFor(label){
 if(label.records){const records=label.records,source=records[0].sources?.[0]||records[0].source;return {title:records.length>1?records.length+' documented records here':records[0].title,lines:records.flatMap(r=>[`${r.startYear}–${r.endYear}: ${r.title}.`,r.summary||'',r.marketLinks?.some(l=>(l.fromYear??-Infinity)<=year()&&year()<=(l.toYear??Infinity))?'Activate this point to trace its documented connections.':'']).filter(Boolean).concat(['Point uses the source-linked locality, not a national indicator position.']),source};}
 const {c,key,o}=label;
 if(categoryKeys.includes(key))return categoryInfo(c,key);
 const ref='National series placed in present-day reference geography, not the historical polity or local economy beneath it.';
 if(key==='reference')return {title:c.name+' · reference point',lines:['No country outline is loaded here. No bounded country area or contained placement is inferred.',ref],actions:['all_indicators','trade','production','distribution'],source:{url:'sources.html#'+c.id,title:'Country sources'}};
 if(key==='government'){const {o:g,type}=government(c);return {title:c.name+' · '+type,lines:[`${year()} annual records; leaders may postdate the selected map day.`,g?`Head of state: ${g.v2exnamhos||'not recorded'}; party ${g.v2exparhos||'not recorded'}.`:'No executive record.',g?`Head of government: ${g.v2exhoshog==='1.0'?g.v2exnamhos:g.v2exnamhog||'not recorded'}; party ${g.v2exhoshog==='1.0'?g.v2exparhos:g.v2expothog||'not recorded'}.`:'No later leader substituted.',ref],source:{url:'political-sources.html',title:'Government sources'}};}
 if(key==='events'){const all=eventsFor(c,false).sort((a,b)=>Math.abs(a.startYear-year())-Math.abs(b.startYear-year()));return {title:c.name+' · wars & crises',lines:all.slice(0,3).map(r=>`${r.startYear}–${r.endYear}: ${r.title}. ${r.summary}`).concat(['Dated context, not a measured causal effect.']),source:{url:'economic-events-data.json',title:'All event sources'}};}
 if(key==='trade')return {title:c.name+' · trade connections',lines:[(tradeCoverage(c)?'Mapped trade-source coverage exists at or before this year; individual flows load on demand. ':'No mapped coverage is loaded for this year; available source years can be explored. ')+'Activate this symbol to trace documented national trade partners. Values retain their source year and currency.','These are country connections, not observed shipping routes or industry buyers.'],source:{url:'trade-sources.html',title:'Trade sources'}};
 if(key==='development'){const d=developmentFor(c);return {title:c.name+' · historical AHDI',lines:[`${d?.year}: ${d?.value.toFixed(3)}. Published augmented human development benchmark; distinct from UNDP HDI.`,...Object.entries(d?.components||{}).map(([k,v])=>`${k}: ${v.value.toLocaleString('en-US',{maximumFractionDigits:2})} ${v.unit}.`),ref],source:{url:HistoricalDevelopment.sourceUrl,title:'Published reconstruction'}};}
 const source=key==='total_gdp'?{url:WorldData.source,title:'GDP and population source'}:AtlasObservations.source(c,key);
 const fx=window.AtlasCurrency?.observation(o,key,year());
 const outputYear=o.status==='last'?o.sourceYear:year();
 const definition=['gdp','total_gdp'].includes(key)?`Annual economic output for ${outputYear}${key==='gdp'?' per person':''}, expressed in 2011 purchasing-power-parity international dollars. 2011 is the price/comparison benchmark, not the year the output occurred. This is neither a wage, household income nor a stock of wealth.${o.status==='last'?` The displayed value is a dated ${outputYear} reference, not output measured in ${year()}.`:''}${key==='total_gdp'?' '+o.method:''}`:ExtendedData.indicators[key]?.definition||'National population series; source territorial coverage may change.';
 return {title:c.name+' · '+(names[key]||key),lines:[`${shortValue(key,o)} ${key==='total_gdp'?'2011 international dollars':key==='pop'?'people':fx?'':source.unit||''}.`,o.status==='unavailable'?(firstRecord(c,key)!=null?`No record for ${year()}. Next available value (recorded or calculated) in this dataset: ${firstRecord(c,key)}. Click or press Enter to move the whole timeline to that year.`:'No record loaded for this indicator; no year is available to jump to.'):o.derived?`${o.status==='last'?'Last source year '+o.sourceYear+', not '+year()+'. ':''}${o.method}`:AtlasObservations.describe(o),definition,...(fx?[AtlasCurrency.describe(fx)]:[]),...[ExtendedData.indicators[key]?.caveat,o.raw?.spatialCaveat,o.raw?.qualityDescription,o.raw?.qualityNote,o.raw?.sourceNote].filter(Boolean),ref],source,fxSource:fx?.source,cpiSource:fx?.cpiSource,currencyDisplay:!!fx};
}
function wrap(s,max){const out=[];let line='';for(const word of String(s).split(/\s+/)){if((line+' '+word).trim().length>max&&line){out.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)out.push(line);return out;}
let hoverTimer;
function hideHover(){clearTimeout(hoverTimer);hoverNode?.remove();hoverNode=null;state.hover=null;state.openLabel=null;}
function scheduleHoverClose(){}
function showHover(label){
 clearTimeout(hoverTimer);hoverNode?.remove();const info=detailFor(label),width=Math.min(380,innerWidth-40),maxHeight=Math.max(100,innerHeight-230);
 const estimatedLines=info.lines.reduce((n,line)=>n+Math.ceil(String(line).length/Math.max(20,(width-32)/7)),0);
 const height=info.catalog||info.actions?maxHeight:Math.min(maxHeight,94+estimatedLines*19+info.lines.length*8);
 let x=label.rect.x+label.rect.w+18;if(x+width>innerWidth-16)x=label.rect.x-width-18;x=Math.max(16,Math.min(innerWidth-width-16,x));const y=Math.max(70,Math.min(innerHeight-125-height,label.rect.y));
 const g=node('g',{class:'country-hover-explanation',transform:`translate(${x} ${y})`,role:'note','aria-label':info.title});
 g.append(node('rect',{x:0,y:0,width,height,rx:10,fill:'#102a33',stroke:'#68878b','stroke-width':1}));
 const foreign=node('foreignObject',{x:0,y:0,width,height});
 const body=document.createElementNS('http://www.w3.org/1999/xhtml','div');body.className='country-readable-explanation';body.setAttribute('tabindex','0');
 const close=document.createElement('button');close.className='country-explanation-close';close.type='button';close.setAttribute('aria-label','Close explanation');close.textContent='×';close.addEventListener('click',hideHover);body.append(close);const title=document.createElement('strong');title.textContent=info.title;body.append(title);
 for(const line of info.lines){const p=document.createElement('p');p.textContent=line;body.append(p);}
 if(info.actions)appendCategoryActions(body,label,info.actions);
 if(info.catalog)appendCatalog(body,label,info.catalog);
 if(info.currencyDisplay)window.AtlasCurrency?.control(body);
 if(info.cpiSource?.url){const a=document.createElement('a');a.href=info.cpiSource.url;a.target='_blank';a.rel='noopener';a.textContent='US CPI adjustment source ↗';body.append(a);}
 if(info.fxSource?.url){const a=document.createElement('a');a.href=info.fxSource.url;a.target='_blank';a.rel='noopener';a.textContent='Exchange-rate source ↗';body.append(a);}
 if(info.source?.url){const a=document.createElement('a');a.href=info.source.url;a.target='_blank';a.rel='noopener';a.textContent=(info.source.title||'Original source')+' ↗';body.append(a);}
 foreign.append(body);g.append(foreign);
 g.addEventListener('keydown',e=>{if(e.key==='Escape')hideHover();});overlay.append(g);hoverNode=g;state.hover={countryId:label.c.id,key:label.key};state.openLabel=label;
}
function render(){
 state.frame=0;const previous=state.hover;hoverNode=null;overlay.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);overlay.replaceChildren();currentLabels=[];localLabels=[];countryTitles.clear();
 if(window.AtlasWars?.state.active||window.AtlasTrade?.state.active||window.AtlasIndustryMarkets?.isActive?.())return;
 const occupied=[...document.querySelectorAll('header,footer,.atlas-view-toggle,.zoom')].map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};}).filter(b=>b.w&&b.h);
 const visible=countries.map(c=>({c,mask:projectedMask(c)})).filter(x=>x.mask?.area>500).sort((a,b)=>b.mask.area-a.mask.area);
 const locals=localPoints(visible,occupied);
 for(const {c,mask}of visible)drawCountry(c,mask,occupied);
 drawLocalPoints(locals);
 missingOutlinePoints(occupied);drawJumpFlag();
 text(overlay,innerWidth/2,innerHeight-(phoneLayout()?155:106),'National values · present-day reference areas · ≈ estimate · dated values remain dated · * derived','country-reference-caption');
 if(previous){let label=[...currentLabels,...localLabels].find(l=>l.c.id===previous.countryId&&l.key===previous.key);const saved=state.openLabel,anchor=countryTitles.get(previous.countryId)||currentLabels.find(l=>l.c.id===previous.countryId)?.rect;if(!label&&saved&&anchor)label={...saved,rect:anchor,o:metricKeys().includes(saved.key)?observationFor(saved.c,saved.key):saved.o};if(label)showHover(label);else{state.hover=null;state.openLabel=null;}}
}
function schedule(){if(!state.frame)state.frame=requestAnimationFrame(render);}
function countryAt(ev){const ll=globe()?AtlasGlobe.invert(ev.clientX,ev.clientY):(()=>{const v=map.viewBox.baseVal,k=innerWidth/v.width;return [(v.x+ev.clientX/k)/3-180,90-(v.y+ev.clientY/k)/3];})();if(!ll)return null;const x=(ll[0]+180)*3,y=(90-ll[1])*3;return countries.find(c=>shape(c).path&&hit.isPointInPath(shape(c).path,x,y,'evenodd'))||null;}
function dblClick(ev){const c=countryAt(ev);if(c){ev.preventDefault();focusCountry(c.id);}}
let lastTap=null,tapStart=null;
for(const surface of [map,window.AtlasGlobe?.svg].filter(Boolean)){surface.addEventListener('dblclick',dblClick);surface.addEventListener('pointerdown',ev=>{tapStart={x:ev.clientX,y:ev.clientY};},true);surface.addEventListener('pointerup',ev=>{if(!tapStart||Math.hypot(ev.clientX-tapStart.x,ev.clientY-tapStart.y)>6){lastTap=null;return;}const now=Date.now();if(lastTap&&now-lastTap.time<380&&Math.hypot(ev.clientX-lastTap.x,ev.clientY-lastTap.y)<9){dblClick(ev);lastTap=null;}else lastTap={time:now,x:ev.clientX,y:ev.clientY};});}
let pan=null,dragged=false;
overlay.addEventListener('pointerdown',ev=>{if(ev.target.closest('.country-hover-explanation'))return;pan={x:ev.clientX,y:ev.clientY,cx,cy,view:globe()?AtlasGlobe.getView():null};dragged=false;},true);
overlay.addEventListener('pointermove',ev=>{if(!pan)return;const dx=ev.clientX-pan.x,dy=ev.clientY-pan.y;if(Math.abs(dx)+Math.abs(dy)<4)return;dragged=true;overlay.setPointerCapture(ev.pointerId);hideHover();if(globe())AtlasGlobe.focus(pan.view.longitude-dx*.28/pan.view.zoom,pan.view.latitude+dy*.28/pan.view.zoom);else{const k=Math.min(innerWidth/1140,innerHeight/660)*z;cx=pan.cx-dx/k;cy=pan.cy-dy/k;draw();}});
overlay.addEventListener('pointerup',()=>{pan=null;});overlay.addEventListener('pointercancel',()=>{pan=null;});overlay.addEventListener('click',ev=>{if(dragged){ev.preventDefault();ev.stopImmediatePropagation();dragged=false;}},true);
overlay.addEventListener('wheel',ev=>{if(ev.target.closest('.country-hover-explanation'))return;ev.preventDefault();hideHover();const factor=Math.exp(-ev.deltaY*.0015);if(globe())AtlasGlobe.setZoom(Math.max(.7,Math.min(5000,getZoom()*factor)));else{const base=Math.min(innerWidth/1140,innerHeight/660),old=base*z;z=Math.max(.03,Math.min(5000,z*factor));const px=ev.clientX-innerWidth/2,py=ev.clientY-innerHeight/2;cx+=px/old-px/(base*z);cy+=py/old-py/(base*z);draw();}},{passive:false});
const oldDraw=draw;draw=function(){oldDraw();schedule();};window.addEventListener('atlas:globe-render',schedule);window.addEventListener('atlas:view-change',()=>{if(state.lock&&state.country&&!window.AtlasWars?.state.active&&!window.AtlasTrade?.state.active&&!window.AtlasIndustryMarkets?.isActive?.())focusCountry(state.country);else schedule();});window.addEventListener('resize',schedule);
window.AtlasCountryCanvas={active:()=>true,getCountry,getCountryId:()=>state.country,getZoom,focusCountry,render,schedule,state,metricKeys,categoryInfo,orderedRows,firstRecord,jumpToFirst,hitTest:(x,y)=>countryAt({clientX:x,clientY:y})?.id,totalGDP,contained,budget,getLabels:()=>currentLabels.map(l=>({countryId:l.c.id,key:l.key,rect:l.rect})),verifyContainment:()=>currentLabels.every(l=>contained(projectedMask(l.c),l.rect))};
for(const id of ['time','boundaryDate','prev','next']){$(id)?.addEventListener(id==='time'?'input':id==='boundaryDate'?'change':'click',()=>{state.jump=null;schedule();});}
document.addEventListener('pointerdown',ev=>{if(!ev.target.closest('.country-hover-explanation'))hideHover();},true);
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')hideHover();});
render();
})();

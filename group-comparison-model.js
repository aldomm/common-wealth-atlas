/* Source-year comparisons with explicit partial coverage. Missing is never zero;
   incompatible group records remain visible as individual country observations. */
(()=>{'use strict';
function create(env){
 const countries=new Map(env.countries.map(c=>[c.id,c])),recordCache=new Map();
 const catalogue=[
  {key:'gdp',name:'GDP per person',unit:'2011 international dollars / person / year',kind:'weighted',method:'Population-weighted GDP per person'},
  {key:'pop',name:'Population',unit:'people',kind:'sum',method:'Combined population'},
  {key:'total_gdp',name:'Total GDP',unit:'2011 international dollars / year',kind:'sum',method:'Combined annual GDP (derived)'},
  ...Object.entries(env.indicators).map(([key,m])=>({key,name:key==='gini'?'Gini index':m.name,unit:key==='defence_spending_eur'?`${env.cpi?.baseYear||2024} USD`:m.unit,
   kind:key==='defence_spending_eur'?'sum':/^(gini|wealth_|hna_)/.test(key)?'single':'mean',
   method:key==='defence_spending_eur'?'Combined defence spending':/^(gini|wealth_|hna_)/.test(key)?'Individual-country value':'Unweighted mean of country values',definition:m.definition,caveat:m.caveat})),
 ];
 const metrics=new Map(catalogue.map(m=>[m.key,m]));
 function records(c,key){const id=c.id+'|'+key;if(!recordCache.has(id))recordCache.set(id,new Map(env.series(c,key).map(r=>[r.year,r])));return recordCache.get(id);}
 function read(id,key,year,interval){
  const c=countries.get(id),meta=metrics.get(key);if(!c||!meta)return {id,value:null,reason:'Unknown country or measure'};
  if(key==='total_gdp'){
   const a=read(id,'gdp',year,interval),b=read(id,'pop',year,interval);
   if(a.value==null||b.value==null||a.source!==b.source||a.periodStart!==b.periodStart||a.periodEnd!==b.periodEnd)return {id,value:null,reason:'GDP and population both need compatible records for this year',components:[a,b]};
   return {...a,key,value:a.value*b.value,unit:meta.unit,derived:true,components:[a,b],method:'GDP per person × population for the same source year'};
  }
  const r=records(c,key).get(year),src=env.source(c,key);
  if(!r)return {id,value:null,reason:'No source record for '+year};
  if(!Number.isFinite(r.value)||r.estimate||/interpolat|extrapolat|backcast/i.test(r.raw?.status||'')||r.raw?.comparable===false)return {id,value:null,reason:'No comparable source observation (project estimates excluded)'};
  const from=r.raw?.periodStart??year,to=r.raw?.periodEnd??year;
  if(from!==to&&(!interval||from<interval.start||to>interval.end||to!==year))return {id,value:null,reason:`Source window ${from}–${to}; select an interval containing the whole window`};
  if(from===to&&from!==year)return {id,value:null,reason:'Record refers to a different source year'};
  if(env.indicators[key]?.applicableCountries&&!env.indicators[key].applicableCountries.includes(id))return {id,value:null,reason:'Series is not defined for this country'};
  if((key==='gdp'||key==='pop')&&r.unit!==env.units[key])return {id,value:null,reason:'Source units do not match the GDP/population series'};
  if(!['gdp','pop','defence_spending_eur'].includes(key)&&r.unit&&r.unit!==meta.unit)return {id,value:null,reason:'Source units differ from the selected measure'};
  let value=key==='pop'?r.value*1000:r.value,conversion=null;
  if(key==='defence_spending_eur'){
   if(!['current EUR','EUR'].includes(r.unit))return {id,value:null,reason:'Unsupported money units'};
   conversion=env.convert(r.value,'EUR',year,{basis:'nominal'});
   const index=env.cpi?.index?.[year],base=env.cpi?.index?.[env.cpi.baseYear];
   if(conversion.currency!=='USD'||!Number.isFinite(conversion.value)||!(index>0&&base>0))return {id,value:null,reason:'No supported same-year exchange rate and inflation conversion'};
   value=(conversion.nominalValue??conversion.value)*base/index;
  }
  return {id,key,year,value,unit:key==='pop'||key==='defence_spending_eur'?meta.unit:r.unit||src.unit,source:r.source||src.id,url:src.url,row:r.row,
   periodStart:from,periodEnd:to,sourceStatus:r.raw?.status||'Source estimate',sourceNote:r.raw?.qualityDescription||r.raw?.qualityNote||r.raw?.sourceNote||'',conversion};
 }
 function aggregate(ids,key,year,interval){
  ids=[...new Set(ids)];const meta=metrics.get(key),result={key,year,value:null,total:ids.length,covered:0,members:[],missing:[],unit:meta?.unit||'',method:meta?.method||'',reason:''};
  if(!ids.length)return {...result,reason:'Choose countries for this group'};
  if(!meta)return {...result,reason:'Unknown measure'};
  const members=ids.map(id=>read(id,key,year,interval));result.members=members;
  let usable=members.filter(m=>m.value!=null);
  const finish=(extra={})=>{const used=new Set(usable.map(m=>m.id));return {...result,covered:usable.length,missing:members.filter(m=>!used.has(m.id)),includedIds:[...used].sort(),partial:usable.length<ids.length,...extra};};
  const fallback=reason=>finish({value:null,reason:members.some(m=>m.value!=null)?reason:'No usable source data for '+year,fallback:members.filter(m=>m.value!=null).map(({id,value,source,unit,periodStart,periodEnd})=>({id,value,source,unit,periodStart,periodEnd}))});
  if(meta.kind==='single'&&ids.length>1)return fallback('Individual country values shown; this measure cannot be safely combined');
  if(meta.kind==='weighted'&&ids.length>1){
   result.weights=usable.map(m=>read(m.id,'pop',year,interval));
   usable=usable.filter(m=>{const w=result.weights.find(w=>w.id===m.id),valid=w.value!=null&&w.value>0&&w.source===m.source&&w.periodStart===m.periodStart&&w.periodEnd===m.periodEnd;if(!valid)m.exclusionReason='Excluded from group calculation: no compatible same-year population weight';return valid;});
  }
  if(!usable.length)return fallback('No usable group value for '+year+'; available individual records are listed separately');
  const a=usable[0];
  if(usable.some(b=>a.source!==b.source||a.unit!==b.unit||a.periodStart!==b.periodStart||a.periodEnd!==b.periodEnd))return fallback('Individual country values shown: incompatible sources, units or reporting windows');
  let value;
  if(meta.kind==='weighted'&&ids.length>1){
   const weights=usable.map(m=>result.weights.find(w=>w.id===m.id));
   value=usable.reduce((sum,m,i)=>sum+m.value*weights[i].value,0)/weights.reduce((sum,w)=>sum+w.value,0);
  }else value=usable.reduce((sum,m)=>sum+m.value,0)/(meta.kind==='mean'?usable.length:1);
  if(!Number.isFinite(value))return fallback('The combined value is not finite');
  const partial=usable.length<ids.length;
  return finish({value,source:a.source,periodStart:a.periodStart,periodEnd:a.periodEnd,reason:partial?'Partial coverage: '+usable.length+'/'+ids.length+' countries; not the full group':'',method:(partial?'PARTIAL · available countries only · ':'')+(ids.length===1&&key!=='total_gdp'?'Individual-country source value':meta.method)});
 }
 function series(ids,key,start,end){const out=[];for(let year=start;year<=end;year++){const {members,weights,missing,...summary}=aggregate(ids,key,year,{start,end});out.push(summary);}return out;}
 return {catalogue,metrics,countries,read,aggregate,series};
}
window.AtlasGroupComparisonModel={create};
})();

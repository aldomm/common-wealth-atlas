/* Strict, source-year comparisons. No carry-forward, project interpolation,
   partial membership totals, or averaging of incompatible distributions. */
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
  const members=ids.map(id=>read(id,key,year,interval));result.members=members;result.covered=members.filter(m=>m.value!=null).length;result.missing=members.filter(m=>m.value==null);
  if(meta.kind==='single'&&ids.length>1)return {...result,reason:'Individual countries only: a valid combined measure needs underlying distributions or compatible sector accounts'};
  if(result.missing.length)return {...result,reason:`Incomplete coverage: ${result.covered}/${ids.length} countries have a source record`};
  const a=members[0];
  if(members.some(b=>a.source!==b.source||a.unit!==b.unit||a.periodStart!==b.periodStart||a.periodEnd!==b.periodEnd))return {...result,reason:'Incompatible sources, units or reporting windows'};
  let value;
  if(meta.kind==='weighted'&&ids.length>1){
   const weights=ids.map(id=>read(id,'pop',year,interval));result.weights=weights;
   if(weights.some(w=>w.value==null||w.value<=0||w.periodStart!==a.periodStart||w.periodEnd!==a.periodEnd||w.source!==a.source))return {...result,reason:'Every country also needs compatible same-year population for weighting'};
   value=members.reduce((sum,m,i)=>sum+m.value*weights[i].value,0)/weights.reduce((sum,w)=>sum+w.value,0);
  }else value=members.reduce((sum,m)=>sum+m.value,0)/(meta.kind==='mean'?members.length:1);
  if(!Number.isFinite(value))return {...result,reason:'The combined value is not finite'};
  return {...result,value,source:a.source,periodStart:a.periodStart,periodEnd:a.periodEnd,method:ids.length===1&&key!=='total_gdp'?'Individual-country source value':meta.method};
 }
 function series(ids,key,start,end){const out=[];for(let year=start;year<=end;year++){const {members,weights,missing,...summary}=aggregate(ids,key,year,{start,end});out.push(summary);}return out;}
 return {catalogue,metrics,countries,read,aggregate,series};
}
window.AtlasGroupComparisonModel={create};
})();

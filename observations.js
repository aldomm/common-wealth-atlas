/* Display-time numeric resolution. Raw source arrays are never modified. */
(()=>{
'use strict';
const cache=new WeakMap();
const continuous=new Set(['gdp','pop','hdi','life','school_mean','school_expected','electricity','water','sanitation','internet','birth_rate','death_rate','exports','imports']);
function source(c,key){
 if(key==='gdp'||key==='pop')return {url:WorldData.source,title:WorldData.release,unit:WorldData.units[key],id:'MPD2023',provenanceUrl:'sources.html#'+(c?.id||'')};
 const m=window.ExtendedData?.indicators?.[key],s=m?ExtendedData.sources[m.source]:null;
 return {url:s?.url||m?.url||'global-sources.html',title:m?.name||key,unit:m?.unit||'',id:m?.source,provenanceUrl:'global-sources.html#'+key};
}
function permitted(key){const m=window.ExtendedData?.indicators?.[key];return continuous.has(key)&&m?.interpolation!==false&&!/poverty|gini|happiness/i.test(key);}
function limit(key){return Number.isFinite(window.ExtendedData?.indicators?.[key]?.interpolationMaxGap)?ExtendedData.indicators[key].interpolationMaxGap:(key==='gdp'||key==='pop'?20:10);}
function records(c,key){
 let keys=cache.get(c);if(!keys){keys=new Map();cache.set(c,keys);}if(keys.has(key))return keys.get(key);
 const base=key==='gdp'||key==='pop',rows=new Map(),exact=new Map(),src=source(c,key);
 if(base){for(const [year,raw]of Object.entries(c.values||{})){
  const y=+year,value=raw[key];if(!Number.isFinite(y)||!Number.isFinite(value))continue;
  const estimate=raw.estimates?.[key],record={year:y,value,row:raw.row,raw,source:src.id,sourceLabel:c.id,unit:src.unit,estimate};exact.set(y,record);
  if(!estimate)rows.set(y,record);
  else for(const [which,rowField,valueField]of [['from','fromRow','fromValue'],['to','toRow','toValue']]){
   const yr=estimate[which],v=estimate[valueField];if(Number.isFinite(yr)&&Number.isFinite(v)&&!rows.has(yr))rows.set(yr,{year:yr,value:v,row:estimate[rowField],raw:null,source:src.id,sourceLabel:c.id,unit:src.unit,metadataEndpoint:true});
  }
 }}else for(const [year,raw]of Object.entries(window.ExtendedData?.observations?.[c.id]?.[key]||{})){
  if(!Number.isFinite(raw.value)||!Number.isFinite(+year))continue;
  const record={year:+year,value:raw.value,row:raw.row,raw,source:raw.source||src.id,sourceLabel:raw.sourceLabel||c.id,unit:raw.unit||src.unit};exact.set(+year,record);rows.set(+year,record);
 }
 const result={exact,series:[...rows.values()].sort((a,b)=>a.year-b.year)};keys.set(key,result);return result;
}
function compatible(a,b){return a.source===b.source&&a.sourceLabel===b.sourceLabel&&a.unit===b.unit&&!(a.raw?.periodStart!=null&&a.raw.periodStart!==a.raw.periodEnd)&&!(b.raw?.periodStart!=null&&b.raw.periodStart!==b.raw.periodEnd)&&a.raw?.comparable!==false&&b.raw?.comparable!==false;}
function resolve(c,key,year){
 const src=source(c,key),base={value:null,status:'unavailable',targetYear:year,sourceYear:null,from:null,to:null,periodStart:null,periodEnd:null,method:'No earlier supported source record; no backward extrapolation.',sourceUrl:src.url,sourceRows:[],unit:src.unit,raw:null,existingEstimate:false};
 if(!c||!Number.isFinite(year))return base;
 const data=records(c,key),exact=data.exact.get(year)||data.series.find(r=>r.year===year);
 if(exact){const e=exact.estimate;if(e)return {...base,value:exact.value,status:'interpolated',from:e.from,to:e.to,fromValue:e.fromValue,toValue:e.toValue,sourceRows:[e.fromRow,e.toRow],raw:exact.raw,existingEstimate:true,estimateKind:year<Math.min(e.from,e.to)||year>Math.max(e.from,e.to)?'extrapolated':'interpolated',method:year<Math.min(e.from,e.to)||year>Math.max(e.from,e.to)?'Previously compiled extrapolated estimate outside source endpoints; not an observation.':'Previously compiled project linear interpolation; not an observation. Smooths unknown volatility.'};return {...base,value:exact.value,status:'exact',sourceYear:year,periodStart:exact.raw?.periodStart??year,periodEnd:exact.raw?.periodEnd??year,sourceRows:[exact.row],raw:exact.raw,method:exact.raw?.status||'Source compiled/reconstructed estimate'};}
 let earlier=null,later=null;for(const r of data.series){if(r.year<year)earlier=r;else if(r.year>year){later=r;break;}}
 if(earlier&&later&&permitted(key)&&later.year-earlier.year<=limit(key)&&compatible(earlier,later))return {...base,value:earlier.value+(later.value-earlier.value)*(year-earlier.year)/(later.year-earlier.year),status:'interpolated',from:earlier.year,to:later.year,fromValue:earlier.value,toValue:later.value,sourceRows:[earlier.row,later.row],method:`Project linear interpolation within the same source series (maximum gap ${limit(key)} years). Not a measurement; smooths unknown volatility.`};
 if(earlier)return {...base,value:earlier.value,status:'last',sourceYear:earlier.year,periodStart:earlier.raw?.periodStart??earlier.year,periodEnd:earlier.raw?.periodEnd??earlier.year,sourceRows:[earlier.row],raw:earlier.raw,method:'Last available earlier source record; dated reference only, not an estimate for the selected year.'};return base;
}
function describe(o){
 if(!o||o.status==='unavailable')return 'Unavailable: no earlier supported source record. No backward extrapolation.';
 if(o.estimateKind==='extrapolated')return `COMPILED EXTRAPOLATED ESTIMATE for ${o.targetYear} · source endpoints ${o.from} and ${o.to}. Outside the observed interval; not an observation.`;
 if(o.status==='interpolated')return `PROJECT ESTIMATE for ${o.targetYear} · linear interpolation between ${o.from} and ${o.to}. Not observed; smooths unknown volatility.`;
 const period=o.periodStart!==o.periodEnd?`survey window ${o.periodStart}–${o.periodEnd}`:`source year ${o.sourceYear}`;
 return o.status==='last'?`LAST AVAILABLE · ${period}, not ${o.targetYear}. Dated reference, not a current-year estimate.`:`${period[0].toUpperCase()+period.slice(1)} · ${o.method.replaceAll('_',' ')}.`;
}
function availableYears(c,key){const r=records(c,key);return [...new Set([...r.exact.keys(),...r.series.map(x=>x.year)])].sort((a,b)=>a-b);}
window.AtlasObservations={availableYears,resolve,describe,source,series:(c,key)=>records(c,key).series,canInterpolate:permitted,maxGap:limit,compatible};
})();

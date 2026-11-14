/* Territorial statistics are independent of modern-country IDs and political aliases. */
(()=>{'use strict';
function create(data){
 const rows=data.observations.filter(o=>o.verification==='verified_value');
 const scopeRows=new Map();for(const o of rows){if(!scopeRows.has(o.scopeId))scopeRows.set(o.scopeId,[]);scopeRows.get(o.scopeId).push(o);}
 const dateOf=x=>typeof x==='number'?`${x}-01-01`:String(x),yearOf=x=>+dateOf(x).slice(0,4);
 const rank=(a,b)=>(a.priority??100)-(b.priority??100)||String(a.id||'').localeCompare(String(b.id||''));
 function boundary(key,date){const r=data.boundaries[key],d=dateOf(date);return r&&r.start<=d&&d<=r.end?r:null;}
 function matched(r,date){const d=dateOf(date);return !!r?.scopeId&&r.matchStatus==='compatible_generalized'&&r.matchStart<=d&&d<=r.matchEnd;}
 function related(r,key){const ids=new Set([r?.scopeId,...r?.relatedScopes||[]].filter(Boolean));return rows.filter(o=>ids.has(o.scopeId)&&(!key||o.property===key));}
 function compatible(a,b){return a.scopeId===b.scopeId&&a.property===b.property&&a.seriesId===b.seriesId&&a.unit===b.unit&&a.priceBasis===b.priceBasis&&a.timingBasis===b.timingBasis&&a.denominator===b.denominator&&a.interpolation===true&&b.interpolation===true;}
 function resolve(key,property,date,options={}){
  const y=yearOf(date),r=boundary(key,date),base={value:null,property,targetYear:y,boundaryKey:key,scopeId:r?.scopeId??null,geographicStatus:!r?'selection_outside_boundary_interval':matched(r,date)?'compatible_generalized':'unmatched',temporalStatus:'missing',evidenceClass:null,alternatives:[],related:related(r,property),method:!r?'The selected boundary record does not cover this date. No successor was substituted.':matched(r,date)?'No compatible observation at this date.':'No audited geographic match; related and modern-reference data are not assigned to this territory.'};
  if(!r||!matched(r,date))return base;
  const candidates=(scopeRows.get(r.scopeId)||[]).filter(o=>o.property===property);
  const exact=candidates.filter(o=>o.year===y&&!o.periodStart).sort(rank);
  if(exact.length){const chosen=exact[0];return {...base,...chosen,value:chosen.value,scopeId:r.scopeId,targetYear:y,boundaryKey:key,geographicStatus:'compatible_generalized',temporalStatus:chosen.referenceDate?'dated_within_year':'source_year',alternatives:exact.slice(1),related:base.related.filter(o=>!exact.includes(o)),selectionRationale:'A verified value for this reviewed territory and source year; curated priority reflects definition/method, not official status. Alternatives remain separate.',method:chosen.method};}
  const periods=candidates.filter(o=>Number.isInteger(o.periodStart)&&o.periodStart<=y&&y<=o.periodEnd&&o.aggregation==='decade mean'&&matched(r,o.periodStart)&&matched(r,o.periodEnd)&&boundary(key,o.periodStart)&&boundary(key,o.periodEnd)).sort(rank);
  if(periods.length){const o=periods[0];return {...base,...o,targetYear:y,temporalStatus:'period_constant',evidenceClass:'published decade estimate · held constant',alternatives:periods.slice(1),method:o.method+' Same value displayed throughout '+o.periodStart+'–'+o.periodEnd+'.'};}
  if(property==='gdp_per_person'){
   const totals=(scopeRows.get(r.scopeId)||[]).filter(o=>o.year===y&&o.property==='total_gdp').sort(rank);
   for(const a of totals){const p=(scopeRows.get(r.scopeId)||[]).find(o=>o.year===y&&o.property==='population'&&o.unit==='people'&&o.value>0&&o.alignmentId&&o.alignmentId===a.alignmentId);
    if(p)return {...base,value:a.value/p.value,unit:a.unit+' per person per year',priceBasis:a.priceBasis,evidenceClass:'app-derived estimate',temporalStatus:'calculated',sourceId:a.sourceId,locator:a.locator,sourceRows:[a.id,p.id],method:'App calculation: aligned annual total GDP ÷ source mid-year population. Same territory, source accounting basis, and year. Not a separately published historian estimate.',uncertainty:'Uncertainty inherited from both reconstructions; no invented confidence interval.'};
   }
  }
  if(options.interpolate!==false){
   const series=new Map();for(const o of candidates.filter(o=>o.interpolation===true)){if(!series.has(o.seriesId))series.set(o.seriesId,[]);series.get(o.seriesId).push(o);}
   const estimates=[];for(const rr of series.values()){
    rr.sort((a,b)=>a.year-b.year);const a=rr.filter(o=>(o.periodEnd??o.year)<y).at(-1),b=rr.find(o=>(o.periodStart??o.year)>y);const ay=a?.periodEnd??a?.year,by=b?.periodStart??b?.year;
    if(!a||!b||!compatible(a,b)||by-ay>Math.min(a.maxGap||0,b.maxGap||0))continue;
    // Both brackets must fall within THIS reviewed boundary interval. No bridging split/merger or source switch.
    if(!matched(r,a.year)||!matched(r,b.year)||!boundary(key,a.year)||!boundary(key,b.year)||!matched(r,a.periodEnd??a.year)||!matched(r,b.periodEnd??b.year)||!boundary(key,b.periodEnd??b.year))continue;
    estimates.push({...a,id:undefined,year:y,value:a.value+(b.value-a.value)*(y-ay)/(by-ay),evidenceClass:'app-derived estimate',temporalStatus:'interpolated',from:ay,to:by,periodStart:null,periodEnd:null,sourceRows:[a.id,b.id],referenceDate:null,method:`App linear interpolation between ${ay} and ${by} within the same reviewed territory, definition and source series. Period means, where present, anchor at their edges. Not observed; ignores unknown annual variation.`});
   }
   if(estimates.length){estimates.sort(rank);return {...base,...estimates[0],geographicStatus:'compatible_generalized',alternatives:[],related:base.related};}
  }
  const past=candidates.filter(o=>o.year<y).sort((a,b)=>b.year-a.year||rank(a,b));
  return {...base,lastRecord:past[0]||null,nextYear:candidates.map(o=>o.year).filter(a=>a>y).sort((a,b)=>a-b)[0]??null};
 }
 function ancestors(id){const out=new Set();for(let p=id;p&&!out.has(p);p=data.scopes[p]?.parent)out.add(p);return out;}
 function aggregate(parts,{scopeId,property,year,components,coverageReviewed=false}={}){
  const fail=reason=>({value:null,status:'unavailable',reason});
  if(!coverageReviewed||!Array.isArray(components)||!components.length)return fail('A documented exhaustive component partition is required, including rural coverage.');
  if(!['population','total_gdp'].includes(property))return fail('Only compatible additive totals can be summed; per-person values and rates cannot.');
  const partition=(data.partitions||[]).find(p=>p.scopeId===scopeId&&p.year===year&&p.property===property&&p.components.length===components.length&&p.components.every(c=>components.includes(c)));
  if(!partition)return fail('No reviewed non-overlapping exhaustive partition in the registry.');
  if(parts.length!==components.length||new Set(components).size!==components.length||parts.some(o=>!components.includes(o.scopeId)))return fail('Missing or duplicate components.');
  const seen=new Set();for(const a of parts){if(seen.has(a.scopeId))return fail('Duplicate component.');seen.add(a.scopeId);if(a.year!==year||a.property!==property||!Number.isFinite(a.value)||a.verification!=='verified_value')return fail('Unverified, missing or temporally incompatible component.');}
  for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++)if(ancestors(parts[i].scopeId).has(parts[j].scopeId)||ancestors(parts[j].scopeId).has(parts[i].scopeId))return fail('Overlapping parent/component territories; would double count.');
  const first=parts[0];if(parts.some(o=>o.unit!==first.unit||o.priceBasis!==first.priceBasis||o.timingBasis!==first.timingBasis||!o.alignmentId||o.alignmentId!==first.alignmentId))return fail('Incompatible unit, price basis, date convention or source accounting.');
  return {value:parts.reduce((n,o)=>n+o.value,0),scopeId,property,year,unit:first.unit,priceBasis:first.priceBasis,status:'calculated',evidenceClass:'app-derived estimate',sourceRows:parts.map(o=>o.id),method:'Sum of documented disjoint exhaustive components. No area weighting.'};
 }
 return {data,boundary,matched,resolve,related,compatible,aggregate,scopeRows,availableYears:(key,property)=>related(data.boundaries[key],property).map(o=>o.year).filter((y,i,a)=>a.indexOf(y)===i).sort((a,b)=>a-b)};
}
window.createTerritoryResolver=create;window.AtlasTerritories=create(window.TerritoryData);
})();

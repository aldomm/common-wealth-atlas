/* Population-weighted allocations are an explicit model, never published country GDP. */
(()=>{'use strict';
const key='regional_gdp',data=window.RegionalTotalsData;
function allocate(r){
 const fail=reason=>({status:'unavailable',reason,values:[]});
 if(!r||r.property!=='total_gdp'||r.measureType!=='annual_additive_total'||!Number.isFinite(r.value)||r.value<0||!Number.isInteger(r.year)||!r.unit||!r.priceBasis||!r.sourceId||!r.locator)return fail('A dated, sourced additive GDP total with its price basis is required.');
 const p=r.partition,mm=r.members;
 if(!p?.reviewed||!p.exhaustive||!p.disjoint||!p.basis||!Array.isArray(p.members)||!p.members.length||new Set(p.members).size!==p.members.length||!Array.isArray(mm)||mm.length!==p.members.length)return fail('A reviewed, exhaustive and non-overlapping source partition is required.');
 if(new Set(mm.map(m=>m.id)).size!==mm.length||mm.some(m=>!p.members.includes(m.id)))return fail('Missing, duplicate or extra country population inputs.');
 if(mm.some(m=>!Number.isFinite(m.population)||m.population<0||m.populationUnit!=='people'||m.year!==r.year||m.partitionId!==p.id||m.sourceId!==r.sourceId||!m.locator||!m.scope))return fail('Population inputs must have compatible units, source, year and territorial partition.');
 const denominator=mm.reduce((n,m)=>n+m.population,0),rounding=r.populationRounding;
 if(!Number.isFinite(denominator)||denominator<=0||!Number.isFinite(r.populationTotal)||r.populationTotal<=0||!Number.isFinite(rounding)||rounding<0)return fail('A positive complete regional population and documented rounding precision are required.');
 const difference=denominator-r.populationTotal,tolerance=(mm.length+1)*rounding/2;
 if(Math.abs(difference)>tolerance)return fail('Member populations do not reconcile to the published regional population.');
 const values=mm.map(m=>({id:m.id,value:r.value*(m.population/denominator),weight:m.population/denominator,population:m.population,denominator,regionalTotal:r.value,unit:r.unit,priceBasis:r.priceBasis,year:r.year,status:'calculated estimate',scope:m.scope,sourceId:r.sourceId,totalId:r.id,partitionId:p.id,locator:r.locator,populationLocator:m.locator}));
 if(values.some(x=>!Number.isFinite(x.value)))return fail('Allocation exceeds numeric limits.');
 return {status:'calculated',values,denominator,populationRoundingDifference:difference,total:r.value,allocatedTotal:values.reduce((n,v)=>n+v.value,0)};
}
const results=data.records.map(r=>({record:r,result:allocate(r)}));
window.AtlasAllocations={key,allocate,results,at:(id,y)=>results.find(x=>x.record.year===y)?.result.values.find(x=>x.id===id)||null};
const E=window.ExtendedData;if(!E)return;
const sourceId='MADDISON_POPULATION_ALLOCATION',ids=[...new Set(results.flatMap(x=>x.result.values.map(v=>v.id)))];
E.sources[sourceId]={name:'Maddison inputs; AMM Tec Lab population allocation',url:'regional-allocation-sources.html',license:data.source.rights,retrieved:data.compiled};
E.indicators[key]={name:'GDP · population allocation (calculated)',compactName:'GDP · population allocation',compactUnit:' int.$ 1990',unit:'1990 international dollars / year',source:sourceId,provider:'AMM Tec Lab calculation from Angus Maddison (2001)',interpolation:false,applicableCountries:ids,comparisonKind:'sum',definition:'CALCULATED ESTIMATE: regional annual GDP × country population ÷ population of all source-region members. Assumes equal output per person throughout the region; not published country GDP.',caveat:'Separate 1990 PPP reference-territory model. Do not mix with 2011 PPP GDP or add the regional parent total. Missing years are not silently filled. Direct country figures remain in the original GDP measure.'};
for(const {record:r,result:a}of results){if(a.status!=='calculated')continue;
 for(const v of a.values){
  E.observations[v.id]??={};E.observations[v.id][key]??={};
  const f=n=>n.toLocaleString('en-US',{maximumFractionDigits:3});
  E.observations[v.id][key][r.year]={value:v.value,unit:r.unit,source:sourceId,sourceLabel:v.id,row:r.id+':'+v.id,status:'calculated estimate — population-weighted regional GDP',allocationModel:true,allocationId:r.id,periodStart:r.year,periodEnd:r.year,
   qualityDescription:`CALCULATED ESTIMATE for ${r.year}. ${r.region}: ${f(r.value)} ${r.unit} × ${f(v.population)} people ÷ ${f(a.denominator)} people = ${f(v.value)} ${r.unit}. Population share: ${(v.weight*100).toFixed(4)}%. Equal GDP per person is assumed; no country productivity differences are estimated.`,
   qualityNote:`All ${r.members.length} members are retained in the denominator, regardless of map or group selection. Published region population: ${f(r.populationTotal)}; sum of rounded member inputs: ${f(a.denominator)}. Allocations sum to the regional GDP total. Published country GDP remains a separate series.`,
   spatialCaveat:v.scope+' Statistical reference territory; not an automatic historical-border match.',sourceNote:`${data.source.author} (${data.source.year}), ${data.source.title}. GDP input: ${r.locator}. Population input: ${v.populationLocator}. Geography: p.177. The allocation is our calculation, not Maddison’s country GDP estimate.`};
 }
}
})();

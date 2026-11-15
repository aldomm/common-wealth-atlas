/* Keep annual adult and family baskets distinct; no inferred national affordability. */
(()=>{'use strict';
const A=AtlasObservations,describe=A.describe;
A.describe=function(o){
 if(o?.raw?.measurementKind!=='matched_basket')return describe(o);
 const r=o.raw,n=v=>v.toLocaleString('en-US',{maximumFractionDigits:3});
 return `CALCULATED LOCAL / REGIONAL BASKET ESTIMATE · ${r.regionLabel} · source ${o.sourceYear}. ${o.status==='last'?`Earlier reference, not an estimate for ${o.targetYear}. `:''}${r.sourceInterpolated?'Source-interpolated wage. ':''}${r.workdays?`${n(r.dailyWage)} ${r.currency}/paid day × ${r.workdays} days = `:''}${n(r.annualIncome)} ${r.currency} annual ${r.cashAnnualWage!=null?'compensation including modeled in-kind pay':'wage under the stated workday assumption'} ÷ ${n(r.annualBasketCost)} ${r.currency} annual ${r.adultEquivalents===1?'ADULT':'FAMILY'} basket cost = ${n(r.value)}×. ${r.workdays?`${r.workdays} assumed paid workdays; `:''}${r.adultEquivalents} adult equivalent${r.adultEquivalents===1?'':'s'} and 5% housing allowance. No Atlas interpolation.`;
};
const B=AtlasBaskets,oldSeries=B.series,oldSummary=B.summary,oldDetail=B.detail;
const country=id=>WorldData.countries.find(c=>c.id===id)||ExtendedData.countries.find(c=>c.id===id);
const keys=id=>Object.keys(ExtendedData.observations[id]||{}).filter(k=>ExtendedData.indicators[k]?.basketAffordability);
const cache=new Map();
B.series=function(id){
 const original=oldSeries.call(this,id);if(original)return original;
 if(!cache.has(id)){
  const ks=keys(id),ys=[...new Set(ks.flatMap(k=>Object.keys(ExtendedData.observations[id][k]).map(Number)))].sort((a,b)=>a-b);
  cache.set(id,ys.length?{matched:true,label:country(id)?.name||id,records:ys.map(year=>({year,key:ks.find(k=>ExtendedData.observations[id][k][year])}))}:null);
 }return cache.get(id);
};
B.summary=function(id,year){
 if(!this.series(id)?.matched)return oldSummary.call(this,id,year);
 const r=this.record(id,year);if(!r)return 'Not recorded';const o=A.resolve(country(id),r.key,year),unit=o.raw.adultEquivalents===1?'adult':'family';
 return `${o.value.toFixed(2)}× ${unit}/year · regional estimate${r.year!==year?' · '+r.year:''}`;
};
B.detail=function(id,year){
 if(!this.series(id)?.matched)return oldDetail.call(this,id,year);
 const s=this.series(id),r=this.record(id,year);
 return {title:s.label+' · basic-needs baskets',lines:[
  r?`Matched source record ${r.year}${r.year!==year?' · earlier reference, not '+year:''}. Select a locality and occupation below for the calculation and evidence.`:'No matched record at or before '+year+'. This means a coverage gap, not zero affordability.',
  '1× covers one full year of the stated essentials basket. Each measure explicitly identifies an adult or family budget. Different basket definitions and worker samples are not interchangeable.',
  'These are calculated local or regional estimates from matched source wages and prices. They are not national averages. Imputed prices, in-kind pay and assumed paid workdays are disclosed.',
  'GDP/person measures average annual economic output. Basket affordability measures what a particular wage could buy locally; neither wages nor these ratios are GDP or 2011 international dollars.'
 ],catalog:keys(id),actions:['all_indicators','distribution'],source:{url:'research-sources.html',title:'Matched basket sources and methods'}};
};
})();

/* Local historical benchmarks supplement primary series without changing reference geography. */
(()=>{'use strict';
const A=AtlasObservations,resolve=A.resolve,years=A.availableYears,describe=A.describe;
const fallback={pop:'historical_population',life:'historical_life'};
A.resolve=function(c,key,y){
 const o=resolve(c,key,y),alternative=fallback[key];
 if(!alternative||o.value!=null&&o.status!=='last'&&!o.regional)return o;
 const h=resolve(c,alternative,y);
 if(h.value==null||h.status==='last')return o;
 const m=ExtendedData.indicators[alternative];
 // The core population contract is thousands; the separate historical measure is people.
 return {...h,value:key==='pop'?h.value/1000:h.value,unit:key==='pop'?WorldData.units.pop:h.unit,
  publicationEstimate:true,historicalFallback:true,publicationTitle:m.name,method:m.definition+' '+h.method,
  alternativeKey:alternative};
};
A.availableYears=function(c,key){
 const found=years(c,key);if(fallback[key])found.push(...years(c,fallback[key]));
 return [...new Set(found)].sort((a,b)=>a-b);
};
A.describe=function(o){
 if(o?.status==='interpolated'&&(o.historicalFallback||/\/(TotalPopulation|LifeExpectancyatBirthTotal)\.html/.test(o.sourceUrl||'')))return `PROJECT INTERPOLATION for ${o.targetYear}, between ${o.from} and ${o.to}. ${o.historicalFallback?'Endpoints are published historical estimates. ':''}Not an observation; smooths unknown volatility.`;
 if(o?.raw?.temporalBasis==='birth cohort')return `PUBLISHED COHORT ESTIMATE · people born ${o.periodStart}–${o.periodEnd}. Adult male-equivalent height, not residents’ height in ${o.targetYear}. ${o.status==='last'?'Earlier cohort reference only. ':''}Repeated only within its stated birth decade.`;
 return describe(o);
};
})();

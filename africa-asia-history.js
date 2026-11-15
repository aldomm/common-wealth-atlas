/* Attributed African and Asian history; preserve source scale, scope and periods. */
(()=>{'use strict';
const A=AtlasObservations,resolve=A.resolve,years=A.availableYears,describe=A.describe;
const alternatives={JPN:{birth_rate:'historical_japan_birth',death_rate:'historical_japan_death',infant_mortality:'historical_japan_infant'},CPV:{birth_rate:'historical_cv_birth',death_rate:'historical_cv_death',infant_mortality:'historical_cv_infant'},CHN:{death_rate:'historical_china_death'}};
function scoped(o){return o?.raw?.regional?{...o,regional:true,regionLabel:o.raw.regionLabel}:o;}
A.resolve=function(c,key,y){
 const o=scoped(resolve(c,key,y)),alternative=alternatives[c?.id]?.[key];
 if(!alternative)return o;
 const h=resolve(c,alternative,y);
 if(h.value==null||h.status!=='exact')return o;
 // An annual source may replace a decade proxy, but never a current annual observation.
 if(o.value!=null&&o.status!=='last'&&!o.regional&&!(o.periodStart<o.periodEnd))return o;
 const m=ExtendedData.indicators[alternative];
 return {...h,sourceOverride:true,publicationTitle:m.name,definition:m.definition,alternativeKey:alternative};
};
A.availableYears=function(c,key){return [...new Set([...years(c,key),...(alternatives[c?.id]?.[key]?years(c,alternatives[c.id][key]):[])])].sort((a,b)=>a-b);};
A.describe=function(o){
 if(o?.raw?.source==='GAP3_NUMERACYTOTAL')return `PUBLISHED NUMERACY COHORT ESTIMATE · people born ${o.periodStart}–${o.periodEnd}. Inferred from age heaping, not a literacy rate or current-year school measurement. ${o.status==='last'?'Earlier cohort reference only. ':''}Held constant only within its stated birth decade.`;
 if(o?.raw?.regional)return `REGIONAL PUBLISHED ESTIMATE · ${o.raw.regionLabel}, source year ${o.sourceYear}. ${o.status==='last'?`Dated reference, not an estimate for ${o.targetYear}. `:''}Not a national total; no allocation to other territories.`;
 if(o?.raw?.localSeries)return `LOCAL / OCCUPATIONAL PUBLISHED ESTIMATE · source year ${o.sourceYear}. ${o.status==='last'?`Dated reference, not an estimate for ${o.targetYear}. `:''}Daily male unskilled labourer wage in daily subsistence baskets; not annual family affordability or representative national income.`;
 if(o?.raw?.status==='official_historical_statistics')return `OFFICIAL HISTORICAL STATISTICS · source year ${o.sourceYear}. ${o.status==='last'?`Dated reference, not an estimate for ${o.targetYear}. `:''}Original reporting scope and gaps retained.`;
 return describe(o);
};
})();

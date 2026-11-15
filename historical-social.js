/* Prefer an attributed local-period estimate to a stale value; never splice age groups. */
(()=>{'use strict';
const A=AtlasObservations,base=A.resolve,baseYears=A.availableYears,describe=A.describe;
A.resolve=function(c,key,y){
 const o=base(c,key,y);
 if(key!=='infant_mortality'||o.value!=null&&o.status!=='last')return o;
 const h=base(c,'historical_infant_mortality',y);
 if(h.value==null||h.status==='last')return o;
 const meta=ExtendedData.indicators.historical_infant_mortality;
 return {...h,publicationEstimate:true,publicationTitle:meta.name,method:meta.definition,estimateKind:'period_constant',status:'period_constant'};
};
A.availableYears=function(c,key){
 const ys=baseYears(c,key);
 if(key==='infant_mortality')ys.push(...baseYears(c,'historical_infant_mortality'));
 if(key==='life'&&c){for(let y=1820;y<=2025;y++){const o=A.resolve(c,key,y);if(o.publicationEstimate&&o.value!=null&&o.status!=='last')ys.push(y);}}
 return [...new Set(ys)].sort((a,b)=>a-b);
};
A.describe=function(o){
 if(o?.raw?.evidenceClass==='published estimate')return `PUBLISHED HISTORICAL ESTIMATE · ${o.periodStart!==o.periodEnd?o.periodStart+'–'+o.periodEnd+' period average':o.sourceYear+' benchmark'}. ${o.status==='last'?'Earlier reference, not an estimate for '+o.targetYear+'. ':''}Source-defined historical reconstruction; see the source row and geographic notes below.`;
 return describe(o);
};
})();

/* Wages are occupational evidence, not national purchasing-power averages. */
(()=>{'use strict';
const A=AtlasObservations,resolve=A.resolve,describe=A.describe,source=A.source;
A.source=function(c,key){
 const s=key.startsWith('aaowd_')?ExtendedData.sources['AAOWD_'+c?.id]:null;
 return s?{...source(c,key),id:'AAOWD_'+c.id,url:s.url,title:s.title}:source(c,key);
};
A.resolve=function(c,key,y){
 const o=resolve(c,key,y);if(!o.raw?.measurementKind)return o;
 const s=ExtendedData.sources[o.raw.source],m=ExtendedData.indicators[key];
 return {...o,regional:!!o.raw.regional,regionLabel:o.raw.regionLabel,sourceUrl:s?.url||o.sourceUrl,sourceOverride:true,publicationTitle:s?.title||m.name,definition:m.definition};
};
A.describe=function(o){
 if(!o?.raw?.measurementKind)return describe(o);
 const r=o.raw,period=o.periodStart===o.periodEnd?o.sourceYear:`${o.periodStart}–${o.periodEnd}`;
 const label=r.measurementKind==='occupational_ratio'?'CALCULATED OCCUPATIONAL PAY RATIO':r.regional?'REGIONAL / LOCAL PUBLISHED ESTIMATE':'OCCUPATIONAL PUBLISHED ESTIMATE';
 return `${label} · ${r.regionLabel?r.regionLabel+' · ':''}source ${period}. ${o.status==='last'?`Earlier reference, not an estimate for ${o.targetYear}. `:''}${r.sourceInterpolated?'SOURCE-INTERPOLATED: the authors identify this decade as interpolated. ':''}${o.periodStart!==o.periodEnd?'Held constant within the source decade only; not separate annual measurements. ':''}${r.measurementKind==='nominal_wage'?'Original nominal currency per paid day; not inflation-adjusted or converted to US dollars. ':''}${r.measurementKind==='occupational_ratio'?`Skilled wage ${r.numerator.value.toLocaleString('en-US',{maximumFractionDigits:4})} ÷ labourer wage ${r.denominator.value.toLocaleString('en-US',{maximumFractionDigits:4})}, both ${r.numerator.currency}/day. Not a basic-needs-basket ratio. `:''}Scope and method remain specific to this source.`;
};
})();

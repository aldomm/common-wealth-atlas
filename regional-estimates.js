/* Explicit regional proxy fallback. Raw country records and region totals are unchanged. */
(()=>{'use strict';
const P=window.PublicationEvidenceData,T=window.AtlasTerritories;
const regional=P.records.filter(r=>r.regionId);
const namesToCode={'United Kingdom':'GBR','Netherlands':'NLD','France':'FRA','Germany (Prussia)':'DEU','German Federal Republic':'DEU','Sweden':'SWE','Italy/Sardinia':'ITA','Italy':'ITA','Spain':'ESP','Poland':'POL','Russia':'RUS','Australia':'AUS','Canada':'CAN','United States of America':'USA','United States':'USA','Mexico':'MEX','Brazil':'BRA','Argentina':'ARG','China':'CHN','Japan':'JPN','India':'IND','Indonesia':'IDN','Thailand':'THA','Egypt':'EGY','Turkey (Ottoman Empire)':'TUR','Turkey':'TUR','Kenya':'KEN','Nigeria':'NGA','South Africa':'ZAF','Portugal':'PRT','Libya':'LBY','Algeria':'DZA','Tunisia':'TUN','Morocco':'MAR','New Zealand':'NZL','Belgium':'BEL','Switzerland':'CHE','Austria':'AUT','Finland':'FIN','Norway':'NOR','Denmark':'DNK','Greece':'GRC','Ireland':'IRL','Hungary':'HUN','Romania':'ROU','Bulgaria':'BGR','Czechoslovakia':'CZE','Soviet Union':'RUS','Korea, Republic of':'KOR','Korea, People’s Republic of':'PRK','Vietnam':'VNM','Philippines':'PHL','Pakistan':'PAK','Bangladesh':'BGD','Ethiopia':'ETH','Sudan':'SDN','Angola':'AGO','Mozambique':'MOZ','Peru':'PER','Chile':'CHL','Colombia':'COL'};
function regionFor(id){return Object.keys(P.regionMembers).find(k=>P.regionMembers[k].includes(id))||'WORLD';}
function resolveRegion(regionId,property,year){
 const rr=regional.filter(r=>r.regionId===regionId&&r.property===property).sort((a,b)=>a.start-b.start);
 const exact=rr.find(r=>r.start<=year&&year<=r.end);
 if(exact)return {...exact,temporalStatus:'period_constant',periodStart:exact.start,periodEnd:exact.end,sourceRows:[exact.id]};
 const a=rr.filter(r=>r.end<year).at(-1),b=rr.find(r=>r.start>year);
 if(!a||!b||!a.interpolation||!b.interpolation||a.unit!==b.unit||a.sourceId!==b.sourceId||b.start-a.end>Math.min(a.maxGap,b.maxGap))return null;
 return {...a,value:a.value+(b.value-a.value)*(year-a.end)/(b.start-a.end),temporalStatus:'interpolated',periodStart:null,periodEnd:null,from:a.end,to:b.start,sourceRows:[a.id,b.id],method:`App linear interpolation between compatible ${P.regionNames[regionId]} period edges ${a.end} and ${b.start}; not annual observations.`};
}
function proxy(id,property,year){return resolveRegion(regionFor(id),property,year)||resolveRegion('WORLD',property,year);}
function allocateTotal(total,weights,{exhaustive=false,compatible=false}={}){
 if(!Number.isFinite(total)||total<0||!exhaustive||!compatible||!weights?.length||new Set(weights.map(w=>w.id)).size!==weights.length||weights.some(w=>!Number.isFinite(w.population)||w.population<0))return null;
 const sum=weights.reduce((n,w)=>n+w.population,0);if(!(sum>0))return null;
 return weights.map(w=>({id:w.id,value:total*w.population/sum,status:'population-weighted regional allocation',weight:w.population/sum}));
}
const baseTerritory=T.resolve;
T.resolve=function(key,property,date,options={}){
 const o=baseTerritory(key,property,date,options);if(o.value!=null||options.regional===false||property!=='life_expectancy')return o;
 const r=T.boundary(key,date);if(!r)return o;const y=typeof date==='number'?date:+String(date).slice(0,4);
 // Only explicitly listed metropolitan/source names get a sub-global region; composite empires use world context.
 const p=proxy(namesToCode[r.name],property,y);if(!p||options.interpolate===false&&p.temporalStatus==='interpolated')return o;
 return {...o,...p,targetYear:y,year:y,scopeId:'regional:'+p.regionId,geographicScope:p.scope,geographicStatus:'regional_proxy',evidenceClass:'regional estimate applied locally',regional:true,selectionRationale:'Fallback requested by the user: regional average applied locally, not a country observation or a verified historical-border match.',alternatives:[],related:o.related,periodStart:p.periodStart,periodEnd:p.periodEnd,method:p.method+' Applied unchanged to this territory as a regional proxy, not a measured territorial figure.',locator:p.locator};
};
if(window.AtlasObservations){
 const base=AtlasObservations.resolve,describe=AtlasObservations.describe;
 AtlasObservations.resolve=function(c,key,y){const o=base(c,key,y);if(!c||!Number.isFinite(y))return o;if(key!=='life'||o.value!=null&&o.status!=='last')return o;
 const local=P.records.find(r=>!r.regionId&&r.property==='life_expectancy'&&r.places.includes(c?.id)&&r.start<=y&&y<=r.end);
 const p=local?{...local,temporalStatus:'period_constant',periodStart:local.start,periodEnd:local.end,sourceRows:[local.id]}:proxy(c?.id,'life_expectancy',y);if(!p)return o;
 return {...o,value:p.value,regional:!local,publicationEstimate:true,publicationTitle:P.sources[p.sourceId].title,sourceUrl:P.sources[p.sourceId].url,sourceRows:p.sourceRows,unit:p.unit,existingEstimate:true,estimateKind:p.temporalStatus==='interpolated'?'interpolated':'period_constant',status:p.temporalStatus==='interpolated'?'interpolated':'period_constant',sourceYear:null,periodStart:p.periodStart,periodEnd:p.periodEnd,from:p.from??null,to:p.to??null,method:(local?'Country-reference decade estimate; historical border match unreviewed. ':P.regionNames[p.regionId]+' regional estimate applied locally; not a country observation. ')+p.method,raw:{sourceNote:p.locator,spatialCaveat:local?'Source-defined national series; geographic coverage requires review.':'Regional average applied locally. Within-region differences are unknown.'}};
 };
 AtlasObservations.describe=o=>o?.publicationEstimate?`${o.regional?'REGIONAL ESTIMATE APPLIED LOCALLY':'PUBLISHED PERIOD ESTIMATE'} · ${o.status==='interpolated'?'interpolated '+o.from+'–'+o.to:'held constant '+o.periodStart+'–'+o.periodEnd}. ${o.method}`:describe(o);
}
window.AtlasRegional={regionFor,resolveRegion,proxy,allocateTotal};
})();

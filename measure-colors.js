/* Explicit display direction; colors describe this measure, never overall country worth. */
(()=>{'use strict';
const higher=new Set(['gdp','historical_gdp_1990','life','historical_life','hdi','happiness','school_mean','school_expected','historical_schooling','historical_numeracy','water','sanitation','electricity','internet','historical_daily_baskets']);
const lower=new Set(['gini','historical_gini_gross','poverty','poverty_lower_middle','poverty_upper_middle','infant_mortality','historical_infant_mortality','under5_mortality','historical_illiteracy_15_br','historical_illiteracy_15_mx','historical_illiteracy_10_mx','historical_illiteracy_6_mx']);
function policy(key){return {direction:higher.has(key)||/^matched_baskets_/.test(key)?'higher':lower.has(key)?'lower':'neutral',density:key==='population_density'};}
const ranges=new Map();let rangeYear=null,rangeCurrency=null;
function value(c,key,targetYear){const o=key==='total_gdp'?window.AtlasCountryCanvas?.totalGDP(c,targetYear):AtlasObservations.resolve(c,key,targetYear);if(!o||!Number.isFinite(o.value)||o.status==='last')return null;let v=key==='pop'?o.value*1000:o.value;const fx=window.AtlasCurrency?.observation(o,key,targetYear);if(fx){if(fx.currency!=='USD'||AtlasCurrency.state.mode==='constant'&&fx.inflationStatus!=='adjusted')return null;v=fx.value;}return v;}
function bounds(key,targetYear){const currency=window.AtlasCurrency?.state.mode;if(rangeYear!==targetYear||rangeCurrency!==currency){ranges.clear();rangeYear=targetYear;rangeCurrency=currency;}if(ranges.has(key))return ranges.get(key);let min=Infinity,max=-Infinity,count=0;
 for(const c of (WorldData.countries||[]).filter(c=>Number.isFinite(c.lon)&&Number.isFinite(c.lat)&&!['SUN','CSK','YUG'].includes(c.id))){const v=value(c,key,targetYear);if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v);count++;}}
 const b={min:Number.isFinite(min)?min:null,max:Number.isFinite(max)?max:null,key,year:targetYear,count};ranges.set(key,b);return b;
}
function color(value,scale,key=scale.key){if(!Number.isFinite(value)||scale.min==null)return '#637078';const p=policy(key);let t=scale.max===scale.min?.5:Math.max(0,Math.min(1,(value-scale.min)/(scale.max-scale.min)));
 // Density varies by orders of magnitude; fixed logarithmic spacing remains comparable over time.
 if(p.density&&scale.max>scale.min)t=Math.max(0,Math.min(1,(Math.log1p(value)-Math.log1p(Math.max(0,scale.min)))/(Math.log1p(scale.max)-Math.log1p(Math.max(0,scale.min)))));
 if(p.direction==='lower')t=1-t;
 const stops=p.direction==='neutral'?[[101,177,239],[204,196,220],[238,115,103]]:[[238,115,103],[239,207,129],[94,206,166]],pos=t*2,i=Math.min(1,Math.floor(pos)),f=pos-i;
 return 'rgb('+stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*f)).join(',')+')';}
function description(key){const p=policy(key);return p.direction==='higher'?'Lower = worse on this measure; higher = better':p.direction==='lower'?'Higher = worse on this measure; lower = better':p.density?'Low density → high density; neither is inherently better':'Lower → higher; no better/worse judgement';}
function label(c,key,o,y){let k=key,v=o?.value,note='';if(key==='pop'){k='population_density';const d=AtlasObservations.resolve(c,k,y);v=d.status==='last'?null:d.value;note=v==null?(d.status==='last'?'Density record from '+d.sourceYear+'; not ranked against current-year values':'Density not recorded; population total is not density'):`Density ${v.toLocaleString('en-US',{maximumFractionDigits:1})} people/km² · ${d.status==='last'?'last record '+d.sourceYear:y}`;}
 else if(key==='total_gdp')v=o?.value;
 if(o?.status==='last'&&key!=='pop'){v=null;note='Earlier record '+o.sourceYear+'; not ranked against current-year values';}const scale=bounds(k,y);if(key!=='pop'&&v!=null)v=value(c,k,y);return {color:v==null?'#9ba6ae':color(v,scale,k),key:k,note:(note?note+'. ':'')+description(k)+'. Worldwide range for '+y+' ('+scale.count+' countries with compatible values)' +(scale.min==null?'':': '+scale.min.toLocaleString('en-US',{maximumSignificantDigits:3})+' to '+scale.max.toLocaleString('en-US',{maximumSignificantDigits:3}))+'. Estimates retain their labels.'};}
window.AtlasMeasureColors={policy,bounds,color,description,label,value};
})();

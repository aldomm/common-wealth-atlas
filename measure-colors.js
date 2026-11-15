/* Measure-specific comparison colors. Red is unfavorable, never merely high. */
(()=>{'use strict';
const higher=new Set(['gdp','total_gdp','regional_gdp','historical_gdp_1990','life','historical_life','hdi','happiness','school_mean','school_expected','historical_schooling','historical_numeracy','water','sanitation','electricity','internet','historical_daily_baskets','wages_japan_real_index','wages_dakar_single_real','wages_dakar_couple_real','wages_dakar_one_child_real','wages_dakar_two_child_real']);
const lower=new Set(['gini','historical_gini_gross','poverty','poverty_lower_middle','poverty_upper_middle','infant_mortality','historical_infant_mortality','under5_mortality','historical_illiteracy_15_br','historical_illiteracy_15_mx','historical_illiteracy_10_mx','historical_illiteracy_6_mx','historical_japan_infant','historical_japan_neonatal','historical_cv_infant','fiscal_inflation']);
const palettes={favorable:[[238,115,103],[239,207,129],[94,206,166]],neutral:[[101,177,239],[124,145,224],[147,114,208]]};
const gray='rgb(155,166,174)',deflation='rgb(90,160,235)';
const colorKey=key=>key==='pop'?'population_density':key;
function policy(key){return {direction:higher.has(key)||/^matched_baskets_/.test(key)?'higher':lower.has(key)?'lower':'neutral',logarithmic:['gdp','total_gdp','regional_gdp','historical_gdp_1990'].includes(key),density:key==='population_density',inflation:key==='fiscal_inflation',output:['total_gdp','regional_gdp'].includes(key)};}
const ranges=new Map();let rangeYear=null,rangeCurrency=null;
function record(c,key,targetYear){
 const o=key==='total_gdp'?window.AtlasCountryCanvas?.totalGDP(c,targetYear):AtlasObservations.resolve(c,key,targetYear);
 if(!o||!Number.isFinite(o.value)||o.status==='last'||o.comparable===false)return null;
 let v=key==='pop'?o.value*1000:o.value,unit=o.unit||window.ExtendedData?.indicators[key]?.unit||'';
 const fx=window.AtlasCurrency?.observation(o,key,targetYear);
 if(fx){if(fx.currency!=='USD'||AtlasCurrency.state.mode==='constant'&&fx.inflationStatus!=='adjusted')return null;v=fx.value;unit=AtlasCurrency.state.mode==='constant'?'2024 USD':'nominal USD';}
 return Number.isFinite(v)&&(!policy(key).logarithmic||v>0)?{value:v,unit}:null;
}
function value(c,key,y){return record(c,key,y)?.value??null;}
function scaleFor(countries,key,y){
 key=colorKey(key);const rows=[],units=new Map();
 for(const c of countries){if(!Number.isFinite(c.lon)||!Number.isFinite(c.lat)||['SUN','CSK','YUG'].includes(c.id))continue;const r=record(c,key,y);if(r){rows.push([c.id,r]);units.set(r.unit,(units.get(r.unit)||0)+1);}}
 const preferred=window.ExtendedData?.indicators[key]?.unit;
 const unit=units.has(preferred)?preferred:[...units.keys()].sort((a,b)=>units.get(b)-units.get(a)||a.localeCompare(b))[0]||'';
 const entries=new Map(rows.filter(([,r])=>r.unit===unit).map(([id,r])=>[id,r.value]));
 const values=[...entries.values()],ranked=policy(key).inflation?values.filter(v=>v>=0):values;
 return {key,year:y,unit,entries,count:entries.size,min:ranked.length?Math.min(...ranked):null,max:ranked.length?Math.max(...ranked):null,deflationCount:policy(key).inflation?values.filter(v=>v<0).length:0};
}
function bounds(key,y){
 key=colorKey(key);const currency=window.AtlasCurrency?.state.mode;
 if(rangeYear!==y||rangeCurrency!==currency){ranges.clear();rangeYear=y;rangeCurrency=currency;}
 if(!ranges.has(key))ranges.set(key,scaleFor(WorldData.countries||[],key,y));return ranges.get(key);
}
function color(value,scale,key=scale.key){
 if(!Number.isFinite(value))return gray;const p=policy(key);
 if(p.inflation&&value<0)return deflation;
 if(scale.min==null||scale.max==null)return gray;
 if(p.logarithmic&&(value<=0||scale.min<=0||scale.max<=0))return gray;
 let t=scale.max===scale.min?.5:Math.max(0,Math.min(1,(value-scale.min)/(scale.max-scale.min)));
 if(p.density&&scale.max>scale.min&&value>=0&&scale.min>=0)t=Math.max(0,Math.min(1,(Math.log1p(value)-Math.log1p(scale.min))/(Math.log1p(scale.max)-Math.log1p(scale.min))));
 if(p.logarithmic&&scale.max>scale.min)t=Math.max(0,Math.min(1,(Math.log(value)-Math.log(scale.min))/(Math.log(scale.max)-Math.log(scale.min))));
 if(p.direction==='lower')t=1-t;
 const stops=p.direction==='neutral'?palettes.neutral:palettes.favorable,pos=t*2,i=Math.min(1,Math.floor(pos)),f=pos-i;
 return 'rgb('+stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*f)).join(',')+')';
}
function description(key){const p=policy(key);
 if(p.inflation)return 'Lower nonnegative inflation is green; higher inflation is red. Blue means deflation, not automatically better. Relative to this year, not a universal healthy inflation target';
 if(p.output)return 'Logarithmic colors: equal ratios use equal color steps. Lower output is red; higher output is green. Total GDP measures economic output, not overall wellbeing or income per person';
 if(p.logarithmic)return 'Logarithmic colors: equal ratios use equal color steps. Lower = unfavorable on this measure; higher = favorable';
 return p.direction==='higher'?'Lower = unfavorable on this measure; higher = favorable':p.direction==='lower'?'Higher = unfavorable on this measure; lower = favorable':p.density?'Low density → high density, in blue–purple; neither is inherently better':'Lower → higher in blue–purple; no better/worse judgement';
}
function endpoints(key){const p=policy(key);return p.inflation?['Lower nonnegative inflation','Higher inflation']:p.output?['Lower output','Higher output']:p.direction==='lower'?['Better / lower','Worse / higher']:p.direction==='higher'?['Worse / lower','Better / higher']:['Low','High'];}
function label(c,key,o,y){
 const k=colorKey(key),scale=bounds(k,y);let v=scale.entries.get(c.id),note='';
 if(key==='pop'){const d=AtlasObservations.resolve(c,k,y);note=d?.status==='last'?'Density record from '+d.sourceYear+'; not ranked against current-year values':v==null?'Density not recorded; population total is not density':`Density ${v.toLocaleString('en-US',{maximumFractionDigits:1})} people/km² · ${y}`;}
 if(!Number.isFinite(o?.value)||o?.status==='last'||o?.comparable===false){v=null;note=o?.status==='last'?'Earlier record '+o.sourceYear+'; not ranked against current-year values':'Not comparable across countries';}
 return {color:color(v,scale,k),key:k,note:(note?note+'. ':'')+description(k)+'. Worldwide range for '+y+' ('+scale.count+' countries with compatible values)'+(scale.min==null?'':': '+scale.min.toLocaleString('en-US',{maximumSignificantDigits:3})+' to '+scale.max.toLocaleString('en-US',{maximumSignificantDigits:3}))+(scale.deflationCount?' · '+scale.deflationCount+' deflation observations shown separately in blue':'')+'. Estimates retain their labels.'};
}
window.AtlasMeasureColors={policy,bounds,color,description,label,value,scaleFor,colorKey,endpoints,palettes,gray,deflation};
})();

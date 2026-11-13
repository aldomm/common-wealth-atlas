/* Ratios use matched wage and price rows, never GDP or a different year's cost. */
window.AtlasBaskets={
 series(id){return window.AtlasBasketData?.series[id]||null;},
 record(id,year){return this.series(id)?.records.filter(r=>r.year<=year).sort((a,b)=>b.year-a.year)[0]||null;},
 next(id,year){return this.series(id)?.records.find(r=>r.year>year)?.year??null;},
 summary(id,year){const r=this.record(id,year);if(!r)return 'Not recorded';const v=r.variants[0];return v.staple+' '+v.value.toFixed(2)+'×'+(r.year!==year?' · '+r.year:'')+' · estimate';},
 detail(id,year){
  const s=this.series(id),r=this.record(id,year),data=window.AtlasBasketData;
  const common=[
   'Baskets affordable = daily wage × 312 paid workdays ÷ annual family basket cost, using matching source place, year and currency. The study assumes a family needing three adult baskets (two adults and two to three children). This is an employment assumption, not observed annual earnings for every worker.',
   '1× means the assumed annual wage covers one year of the defined family essentials. 0.5× covers half that cost; 2× covers twice that cost. It does not count actual families supported or prove that every basic need was met.',
   'Unlike GDP/person, which measures average annual output in 2011 purchasing-power international dollars, this ratio measures a specified wage against a local essentials basket. It is dimensionless: neither US dollars nor 2011 dollars. No GDP, trade or government-revenue value is used.',
   'Alternative staples define different baskets, not an uncertainty range; the map previews the first source-listed basket. No averaging or cross-country ranking is implied. Food, clothing, soap, fuel/light and rent allowances follow the source basket conventions.',
   'These are published calculated estimates, not direct observations of every price and wage. Source interpolation, extrapolation, proxies, changing occupations and price locations remain in the original series. The atlas adds no interpolation. Missing matched rows remain missing.'
  ];
  const lines=r?[
   (r.year===year?'Source year '+r.year:'Last available matched record: '+r.year+', not '+year())+'. '+s.label+' · source urban unskilled male wage series. Not a country average.',
   ...r.variants.map(v=>`${v.staple} basket: ${v.value.toFixed(2)} annual family baskets affordable. Daily wage ${v.dailyWage.toFixed(2)} source pence × 312 = ${v.annualWage.toFixed(2)} source pence/year; family basket ${v.familyBasketCost.toFixed(2)} source pence/year. Published calculated estimate; welfare ratio sheet, row ${v.sourceRow}.`),
   ...common,s.scope,'Available matched years: '+s.records.map(r=>r.year).join(', '),
   
   data.attribution+' Reuse: '+data.license+'.'
  ]:['No matched wage-and-basket record loaded '+(s?'at or before '+year():'for this reference country')+'. This is a coverage gap, not zero purchasing power.',...(s?['Available matched years: '+s.records.map(r=>r.year).join(', ')]:[]),...common];
  return {title:(s?.label||id)+' · basic-needs baskets',lines,auditNotes:s?.sourceNotes||[],actions:['all_indicators','distribution'],source:{url:s?.sourceUrl||data.sourceUrl,title:'Original wages, prices and welfare-ratio workbook'},additionalSources:[{url:data.methodUrl,title:'Published method and household assumptions'},{url:data.sourceUrl,title:'IISH collection · attribution and license'}]};
 }
};

window.addEventListener('atlas:country-action',event=>{
 const {countryId,action,evidenceId}=event.detail;
 if(action==='wars'){
  window.AtlasWars?.focus(countryId,{fit:true});
 }else if(action==='trade'){
  window.AtlasWars?.deactivate();
  AtlasIndustryMarkets.clear();AtlasTrade.focusReferenceCountry(countryId);
  const c=D.countries.find(c=>c.id===countryId);
  if(AtlasGlobe.isActive())AtlasGlobe.focus(c?.lon||0,c?.lat||0,1.1);
  else{cx=540;cy=270;z=1;draw();}
 }else if(action==='industry-markets'){
  window.AtlasWars?.deactivate();
  const r=EconomicEvidence.records.find(r=>r.id===evidenceId);
  if(r){AtlasTrade.deactivate();AtlasIndustryMarkets.show(r);AtlasCountryCanvas.render();}
 }
});
document.getElementById('exploreIberia').addEventListener('click',()=>{window.AtlasWars?.deactivate();AtlasTrade.deactivate();AtlasIndustryMarkets.clear();AtlasCountryCanvas.focusCountry('PRT',{fit:true});});
document.getElementById('home').addEventListener('click',()=>{window.AtlasWars?.deactivate();AtlasTrade.deactivate();AtlasIndustryMarkets.clear();AtlasCountryCanvas.state.country=null;AtlasCountryCanvas.state.lock=false;AtlasCountryCanvas.render();});
const canvasHint=document.querySelector('.atlas-globe-hint');if(canvasHint)canvasHint.textContent='Point at a country and scroll closer · double-click to fit · drag to explore';

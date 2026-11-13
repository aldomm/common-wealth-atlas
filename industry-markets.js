/* Documented industry connections: independent of national trade values. */
(()=>{
 let current=null,chosen=null,sourceLayer=null;
 const ns='http://www.w3.org/2000/svg',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const card={hidden:true}; // No floating window; annotations are SVG text.
 function node(tag,attrs,text){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;}
 function clear(){current=null;chosen=null;card.hidden=true;for(const svg of [map,window.AtlasGlobe?.svg]){svg?.querySelector('#industryMarketLinks')?.remove();svg?.querySelector('#industryInlineLabel')?.remove();}}
 function show(r){current=r;chosen=null;sourceLayer=AtlasEvidence.state.layer;$('detail').hidden=true;const points=[r,...(r.marketLinks||[]).filter(l=>l.fromYear<=years[idx]&&years[idx]<=l.toYear)],lon=Math.atan2(points.reduce((s,p)=>s+Math.sin(p.lon*Math.PI/180),0),points.reduce((s,p)=>s+Math.cos(p.lon*Math.PI/180),0))*180/Math.PI,lat=points.reduce((s,p)=>s+p.lat,0)/points.length;if(AtlasGlobe.isActive())AtlasGlobe.focus(lon,lat,1.8);else{cx=(lon+180)*3;cy=(90-lat)*3;z=2;draw();}render();}
 function render(){
  for(const svg of [map,window.AtlasGlobe?.svg]){svg?.querySelector('#industryMarketLinks')?.remove();svg?.querySelector('#industryInlineLabel')?.remove();}
  if(!current)return;if(window.AtlasEvidence?.state.layer!==sourceLayer||(AtlasEvidence.state.menu?.id&&AtlasEvidence.state.menu.id!==current.id)){clear();return;}
  const y=years[idx],links=(current.marketLinks||[]).filter(l=>l.fromYear<=y&&y<=l.toYear),globe=window.AtlasGlobe?.isActive(),svg=globe?AtlasGlobe.svg:map,k=globe?1:innerWidth/svg.viewBox.baseVal.width,g=node('g',{id:'industryMarketLinks'});
  if(!links.length){clear();window.AtlasCountryCanvas?.schedule();return;}
  for(const l of links){const d=AtlasTrade.linePath(current,l,globe),q=globe?AtlasGlobe.project(l.lon,l.lat):[(l.lon+180)*3,(90-l.lat)*3];
   g.append(node('path',{d,fill:'none',stroke:'#d8adf2','stroke-width':2/k,'stroke-dasharray':`${6/k} ${5/k}`,'pointer-events':'none'}));
   if(!q||!q.every(Number.isFinite))continue;const b=node('g',{role:'button',tabindex:'0',class:'industry-market-endpoint','aria-label':'Documented connection: '+l.destinationLabel});b.append(node('circle',{cx:q[0],cy:q[1],r:7/k,fill:'#d8adf2',stroke:'#162d36','stroke-width':2/k}));b.append(node('text',{x:q[0]+10/k,y:q[1]-10/k,'font-size':12/k,fill:'#f0d8ff',stroke:'#122830','stroke-width':3/k,'paint-order':'stroke','pointer-events':'none'},l.destinationLabel));const choose=()=>{chosen=l;renderCard(l,q,svg);};b.addEventListener('pointerenter',choose);b.addEventListener('focus',choose);b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',e=>{e.stopPropagation();choose();});b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();choose();}});g.append(b);
  }
  svg.append(g);const l=chosen&&links.includes(chosen)?chosen:links[0],q=globe?AtlasGlobe.project(l.lon,l.lat):[(l.lon+180)*3,(90-l.lat)*3];renderCard(l,q,svg);
 }
 function renderCard(l,q,svg){
  svg.querySelector('#industryInlineLabel')?.remove();const k=window.AtlasGlobe?.isActive()?1:innerWidth/svg.viewBox.baseVal.width,v=svg.viewBox.baseVal;
  if(!q||!q.every(Number.isFinite))return;const x=Math.max(v.x+20/k,Math.min(v.x+v.width-380/k,q[0]+14/k)),y=Math.max(v.y+110/k,Math.min(v.y+v.height-300/k,q[1]+18/k)),g=node('g',{id:'industryInlineLabel'});
  const text=l.summary+' '+(l.status||'')+' Reference endpoints, not routes or volumes.',lines=[`${current.place} → ${l.destinationLabel} · ${l.fromYear}`,l.kind==='documented-passenger-service'?'Passenger voyage — not merchandise trade':'Documented export-market evidence'];let row='';for(const word of text.split(/\s+/)){if((row+' '+word).length>53){lines.push(row);row=word;}else row+=(row?' ':'')+word;}if(row)lines.push(row);
  lines.forEach((line,i)=>g.append(node('text',{x,y:y+i*17/k,'font-size':(i?11:13)/k,fill:'#efd8ff',stroke:'#142c35','stroke-width':4/k,'paint-order':'stroke'},line)));
  const a=node('a',{href:l.source.url,target:'_blank',rel:'noopener'});a.append(node('text',{x,y:y+(lines.length+1)*17/k,'font-size':12/k,fill:'#d6e9e2',stroke:'#142c35','stroke-width':4/k,'paint-order':'stroke'},'Original evidence ↗'));g.append(a);
  const back=node('g',{role:'button',tabindex:'0','aria-label':'Return from documented connection',style:'cursor:pointer'});back.append(node('text',{x,y:y+(lines.length+2)*17/k,'font-size':12/k,fill:'#f4dfac',stroke:'#142c35','stroke-width':4/k,'paint-order':'stroke'},'← Country indicators'));const go=()=>{const id=current.referenceCountryId;clear();window.AtlasCountryCanvas?.focusCountry(id,{fit:true});draw();};back.addEventListener('click',go);back.addEventListener('keydown',e=>{if(e.key==='Enter')go();});g.append(back);svg.append(g);
 }
 const oldDraw=draw;draw=function(){oldDraw();render();};window.addEventListener('atlas:globe-render',render);window.addEventListener('atlas:view-change',render);window.AtlasIndustryMarkets={show,clear,render,isActive:()=>!!current};
})();

/* Small, independent reference map. It remains usable while the historical
   datasets initialize, then hands its camera, country and year to the atlas. */
(()=>{'use strict';
 if(!window.WorldData)return;
 const ns='http://www.w3.org/2000/svg',events=new AbortController();
 const state={x:540,y:260,zoom:1,year:1820,country:null,touched:false};
 const root=document.createElement('section');root.id='atlasEarlyMap';
 root.setAttribute('aria-label','Atlas map — additional data loading');
 root.innerHTML=`<div class="early-heading"><strong>✳ COMMON WEALTH</strong><span>Explore now · data loads in the background</span></div>
 <svg id="atlasEarlySurface" tabindex="0" role="group" aria-label="Reference world map. Drag to pan, scroll or pinch to zoom, and select a country."></svg>
 <div class="early-note"><strong id="earlyPlace">Choose a country</strong><span id="earlyProgress" role="status">Loading historical borders and country indicators…</span><small>Modern reference outlines while historical data loads.</small><button id="earlyRetry" hidden>Retry loading</button></div>
 <div class="early-zoom" aria-label="Map navigation"><button id="earlyHome">Fit world</button><button id="earlyMinus" aria-label="Zoom out">−</button><button id="earlyPlus" aria-label="Zoom in">+</button></div>
 <div class="early-time"><label for="earlyYear">Year <output id="earlyYearValue">1820</output></label><input id="earlyYear" aria-label="Year" type="range" min="1820" max="2025" value="1820"><small>1820 <span>2025</span></small></div>`;
 const sheet=document.createElement('style');sheet.textContent=`
 body.atlas-booting > :not(#atlasEarlyMap):not(#atlasStartup):not(script):not(style):not(link){visibility:hidden!important;pointer-events:none!important}
 #atlasEarlyMap{position:fixed;inset:0;z-index:100000;background:#0b2028;color:#e7e9df;font:15px/1.45 system-ui;isolation:isolate}
 #atlasEarlyMap *{box-sizing:border-box}
 #atlasEarlySurface{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab}
 #atlasEarlySurface path{fill:#25464d;stroke:#77928b;vector-effect:non-scaling-stroke;stroke-width:.6}
 #atlasEarlySurface path[data-country]:hover,#atlasEarlySurface path:focus{fill:#45676a;outline:none}
 #atlasEarlySurface path[aria-pressed=true]{fill:#537777;stroke:#ffe6a1;stroke-width:2}
 #atlasEarlySurface text{fill:#fff1d5;paint-order:stroke;stroke:#10272e;stroke-linejoin:round;pointer-events:none;text-anchor:middle}
 #atlasEarlyMap .early-heading{position:absolute;z-index:1;background:#0b2028e8;border-radius:8px;padding:8px 12px;top:max(16px,env(safe-area-inset-top));left:20px;pointer-events:none;display:grid;text-shadow:0 1px 5px #07191e}
 #atlasEarlyMap .early-heading strong{font-size:18px;letter-spacing:.08em}
 #atlasEarlyMap .early-heading span{font-size:13px;margin-top:4px}
 #atlasEarlyMap button{min-width:46px;min-height:46px;border:1px solid #729087;border-radius:10px;background:#17343c;color:#f7f1df;font:inherit;padding:8px 12px;cursor:pointer}
 #atlasEarlyMap button:focus-visible,#atlasEarlySurface:focus-visible{outline:2px solid #ffe6a1;outline-offset:2px}
 #atlasEarlyMap [hidden]{display:none!important}
 #atlasEarlyMap .early-note{position:absolute;left:20px;bottom:130px;max-width:min(390px,calc(100% - 110px));padding:12px 16px;background:#102a32f5;border:1px solid #49656b;border-radius:12px;display:grid;gap:5px;pointer-events:none}
 #atlasEarlyMap .early-note button{pointer-events:auto}
 #atlasEarlyMap .early-note small{color:#b5c9c6;font-size:12px}
 #atlasEarlyMap .early-zoom{position:absolute;right:16px;bottom:130px;display:grid;gap:8px}
 #atlasEarlyMap .early-time{position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:20px;right:20px;max-width:760px;margin:auto;padding:10px 16px;border:1px solid #49656b;background:#102a32f5;border-radius:12px}
 #atlasEarlyMap .early-time label{display:block;font-size:14px}#earlyYearValue{font-size:20px;font-weight:650;margin-left:6px}
 #atlasEarlyMap input{display:block;width:100%;height:32px;accent-color:#dcc18c;touch-action:pan-x}
 #atlasEarlyMap .early-time small{display:block;font-size:12px;color:#b5c9c6}#atlasEarlyMap .early-time small span{float:right}
 @media(max-width:600px){#atlasEarlyMap .early-heading{left:12px;right:12px}#atlasEarlyMap .early-heading strong{font-size:16px}#atlasEarlyMap .early-note{left:12px;padding:10px;max-width:calc(100% - 106px);font-size:13px}#atlasEarlyMap .early-zoom{right:12px}#atlasEarlyMap .early-zoom button:first-child{font-size:12px;padding:4px}#atlasEarlyMap .early-time{left:12px;right:12px}}
 `;
 document.head.append(sheet);document.body.append(root);document.body.classList.add('atlas-booting');
 const q=id=>root.querySelector('#'+id),surface=q('atlasEarlySurface'),label=document.createElementNS(ns,'text');
 const countries=new Map(WorldData.countries.map(c=>[c.id,c])),paths=new Map();
 for(const b of WorldData.boundaries){
  const path=document.createElementNS(ns,'path');path.setAttribute('d',b.path);path.setAttribute('fill-rule','evenodd');
  path.dataset.country=b.id;path.setAttribute('aria-label',b.name);path.setAttribute('role','button');path.setAttribute('tabindex','0');path.setAttribute('aria-pressed','false');
  surface.append(path);paths.set(b.id,path);
 }
 surface.append(label);
 const on=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:events.signal});
 const base=()=>Math.min(innerWidth/1140,innerHeight/660),scale=()=>base()*state.zoom;
 let frame=0,ready=false,finished=false,gesture=null;
 const pointers=new Map(),held=new Set();
 function paint(){
  frame=0;const k=scale();surface.setAttribute('viewBox',`${state.x-innerWidth/k/2} ${state.y-innerHeight/k/2} ${innerWidth/k} ${innerHeight/k}`);
  root.dataset.year=state.year;root.dataset.country=state.country||'';root.dataset.zoom=state.zoom.toFixed(3);
  const c=countries.get(state.country);
  label.textContent=c?.name||'';
  if(c){label.setAttribute('x',(c.lon+180)*3);label.setAttribute('y',(90-c.lat)*3);label.setAttribute('font-size',15/k);label.setAttribute('stroke-width',4/k);}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 function select(id){
  paths.get(state.country)?.setAttribute('aria-pressed','false');state.country=id;state.touched=true;
  paths.get(id)?.setAttribute('aria-pressed','true');q('earlyPlace').textContent=countries.get(id)?.name||paths.get(id)?.getAttribute('aria-label')||'Selected region';schedule();
 }
 function zoom(factor,x=innerWidth/2,y=innerHeight/2){
  const old=scale();state.zoom=Math.max(.7,Math.min(512,state.zoom*factor));const k=scale();
  state.x+=(x-innerWidth/2)/old-(x-innerWidth/2)/k;state.y+=(y-innerHeight/2)/old-(y-innerHeight/2)/k;state.touched=true;schedule();
 }
 const point=e=>({x:e.clientX,y:e.clientY});
 function snapshot(){const p=[...pointers.values()];return p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:{...p[0],d:0};}
 on(surface,'pointerdown',e=>{if(e.button!==0)return;surface.setPointerCapture(e.pointerId);pointers.set(e.pointerId,point(e));gesture={...snapshot(),moved:pointers.size>1,id:e.target.closest('[data-country]')?.dataset.country};});
 on(surface,'pointermove',e=>{
  if(!pointers.has(e.pointerId)||!gesture)return;
  pointers.set(e.pointerId,point(e));const next=snapshot(),dx=next.x-gesture.x,dy=next.y-gesture.y;
  if(!gesture.moved&&Math.hypot(dx,dy)<4)return;
  state.x-=dx/scale();state.y-=dy/scale();
  if(next.d&&gesture.d)zoom(next.d/gesture.d,next.x,next.y);
  gesture={...next,id:gesture.id,moved:true};state.touched=true;schedule();
 });
 function pointerEnd(e){
  if(!pointers.has(e.pointerId))return;
  if(e.type==='pointerup'&&pointers.size===1&&!gesture?.moved&&gesture?.id)select(gesture.id);
  pointers.delete(e.pointerId);gesture=pointers.size?{...snapshot(),moved:true}:null;
 }
 on(surface,'pointerup',pointerEnd);on(surface,'pointercancel',pointerEnd);on(surface,'lostpointercapture',pointerEnd);
 on(surface,'wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
 on(surface,'keydown',e=>{
  if((e.key==='Enter'||e.key===' ')&&e.target.dataset.country){e.preventDefault();select(e.target.dataset.country);}
  else if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){
   e.preventDefault();state.touched=true;
   if(e.key==='+'||e.key==='=')zoom(1.4);else if(e.key==='-')zoom(1/1.4);else if(e.key==='Home')home();
   else{state.x+=({'ArrowLeft':-60,'ArrowRight':60}[e.key]||0)/scale();state.y+=({'ArrowUp':-60,'ArrowDown':60}[e.key]||0)/scale();schedule();}
  }
 });
 function home(){state.x=540;state.y=260;state.zoom=1;state.touched=true;schedule();}
 on(q('earlyHome'),'click',home);on(q('earlyPlus'),'click',()=>zoom(1.4));on(q('earlyMinus'),'click',()=>zoom(1/1.4));
 on(q('earlyYear'),'input',e=>{state.year=+e.target.value;state.touched=true;q('earlyYearValue').textContent=state.year;schedule();});
 on(q('earlyRetry'),'click',()=>location.reload());on(window,'resize',schedule);
 // Never swap the surface during a pinch, drag or timeline gesture.
 on(root,'pointerdown',e=>held.add(e.pointerId),{capture:true});
 const release=e=>{held.delete(e.pointerId);if(ready&&!held.size)requestAnimationFrame(finish);};
 on(window,'pointerup',release);on(window,'pointercancel',release);
 on(root,'keydown',e=>e.stopPropagation());
 function finish(){
  ready=true;if(held.size||finished)return;
  // These lexical bindings belong to the full atlas and exist only once all
  // ordered scripts have executed. Do not invoke this on a partial load.
  const hadFocus=root.contains(document.activeElement);
  if(state.touched){
   idx=years.indexOf(state.year);if(idx<0)idx=0;historicalDate=years[idx]+'-01-01';
   cx=state.x;cy=state.y;z=state.zoom;
   AtlasGlobe.setView('map');
   if(countries.has(state.country)){selected=state.country;document.getElementById('country').value=state.country;AtlasCountryCanvas.focusCountry(state.country,{fit:false});}
   draw();AtlasCountryCanvas.render();
  }
  finished=true;events.abort();if(frame)cancelAnimationFrame(frame);
  root.remove();sheet.remove();document.body.classList.remove('atlas-booting');
  if(hadFocus)document.getElementById('world').focus({preventScroll:true});
  window.AtlasEarlyMap=null;
  window.dispatchEvent(new CustomEvent('atlas:ready',{detail:{explored:state.touched}}));
 }
 window.AtlasEarlyMap={
  finish,
  progress:()=>{q('earlyProgress').textContent='Historical borders and country indicators are loading…';},
  fail:()=>{q('earlyProgress').textContent='The map is available, but the other data could not finish loading.';q('earlyRetry').hidden=false;},
 };
 paint();document.getElementById('atlasStartup')?.remove();
 console.info('Atlas reference map interactive',Math.round(performance.now()));
})();

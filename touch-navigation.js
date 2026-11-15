/* Shared two-finger navigation. Ordinary taps and one-finger drags retain their
   existing handlers; a pinch cancels those handlers until both fingers lift. */
(() => {
  const touches = new Map();
  const surfaces = '#world,#atlasGlobe,#countrySemanticCanvas';
  const excluded = '.country-hover-explanation,foreignObject,dialog';
  let pinching = false, previous = null, canceling = false, suppressClick = 0;
  const geometry = () => {
    const [a,b] = [...touches.values()];
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  };
  function stop(e) { if(e.cancelable)e.preventDefault(); e.stopImmediatePropagation(); }
  function cancelDrags() {
    // Cancel the existing single-pointer controllers without selecting a country.
    canceling = true;
    for(const [id,p] of touches) {
      p.surface.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:id,pointerType:'touch'}));
      if(p.surface.hasPointerCapture?.(id))p.surface.releasePointerCapture(id);
    }
    canceling = false;
  }
  document.addEventListener('pointerdown', e => {
    if(e.pointerType !== 'touch' || e.target.closest(excluded))return;
    const surface=e.target.closest(surfaces);
    if(!surface)return;
    if(!touches.size)suppressClick=0;
    touches.set(e.pointerId,{x:e.clientX,y:e.clientY,surface});
    if(touches.size>=2) {
      if(!pinching)cancelDrags();
      pinching=true;suppressClick=Infinity;previous=geometry();
      // Country labels are redrawn during zoom; capture on their stable SVG root.
      for(const [id,p] of touches)p.surface.setPointerCapture?.(id);
      stop(e);
    } else if(pinching)stop(e);
  },true);
  document.addEventListener('pointermove', e => {
    const p=touches.get(e.pointerId);
    if(!p)return;
    p.x=e.clientX;p.y=e.clientY;
    if(!pinching)return;
    stop(e);
    if(touches.size<2)return;
    const current=geometry(),ratio=current.d/previous.d;
    if(window.AtlasGlobe?.isActive()) {
      const v=AtlasGlobe.getView();
      AtlasGlobe.zoomAt(v.zoom*ratio,current.x,current.y,previous.x,previous.y);
    } else {
      const base=Math.min(innerWidth/1140,innerHeight/660),old=base*z;
      const next=Math.max(.03,Math.min(512,z*ratio));
      // Keep the geography under the fingers anchored while zooming and panning.
      cx+=(previous.x-innerWidth/2)/old-(current.x-innerWidth/2)/(base*next);
      cy+=(previous.y-innerHeight/2)/old-(current.y-innerHeight/2)/(base*next);
      z=next;draw();
    }
    previous=current;
  },{capture:true,passive:false});
  function end(e) {
    if(canceling || !touches.has(e.pointerId))return;
    touches.delete(e.pointerId);
    if(!pinching)return;
    stop(e);
    previous=touches.size>=2?geometry():null;
    if(!touches.size){pinching=false;suppressClick=Date.now()+500;}
  }
  document.addEventListener('pointerup',end,true);
  document.addEventListener('pointercancel',end,true);
  document.addEventListener('click',e=>{
    if(Date.now()<suppressClick && e.target.closest(surfaces))stop(e);
  },true);
  window.addEventListener('blur',()=>{cancelDrags();touches.clear();pinching=false;previous=null;suppressClick=0;});
})();

/* The hosted compressed loader owns its readiness and error state. For the
   direct-script local build, reveal only after the final script and render. */
if(!document.getElementById('atlas-scripts')){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    window.AtlasEarlyMap?.finish();
    document.getElementById('atlasStartup')?.remove();
  }));
}

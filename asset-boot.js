/* Load the same ordered classic scripts from losslessly compressed static assets. */
(async()=>{
 const manifest=document.getElementById('atlas-scripts');
 const notice=document.createElement('div');notice.setAttribute('role','status');notice.textContent='Loading atlas…';notice.style.cssText='position:fixed;top:70px;left:24px;color:#e7e9df;background:#10272e;padding:12px;z-index:9999';document.body.append(notice);
 try {
  const files=JSON.parse(manifest.textContent);
  const sources=await Promise.all(files.map(async file=>{
   const r=await fetch(file);if(!r.ok)throw Error('Could not load '+file);
   const bytes=new Uint8Array(await r.arrayBuffer());
   if(bytes[0]===31&&bytes[1]===139)return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
   return new TextDecoder().decode(bytes);
  }));
  for(let i=0;i<files.length;i++){
   let failure=null;const capture=e=>{failure=e.error||Error(e.message);};window.addEventListener('error',capture);
   const script=document.createElement('script');script.textContent=sources[i]+'\n//# sourceURL='+files[i];document.body.append(script);window.removeEventListener('error',capture);
   if(failure)throw failure;
  }
  notice.remove();manifest.remove();
 }catch(error){console.error('Atlas loading failed',error);notice.textContent='The atlas could not finish loading. ';const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>location.reload();notice.append(retry);}
})();

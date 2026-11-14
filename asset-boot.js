/* Download ahead within a small byte budget; always unpack and execute scripts
   serially. Device hints are optional, never a reason to skip required data. */
(async()=>{
 const manifest=document.getElementById('atlas-scripts');
 const notice=document.getElementById('atlasStartup');
 const started=performance.now(),MiB=1024*1024;
 const connection=navigator.connection||{},memory=navigator.deviceMemory;
 const constrained=connection.saveData||['slow-2g','2g'].includes(connection.effectiveType)||(memory&&memory<4);
 const touch=!!window.matchMedia?.('(pointer: coarse)').matches;
 const capacity=constrained?1:(!touch&&memory>=8&&navigator.hardwareConcurrency>=4?4:2);
 const budget=(capacity===4?8:3)*MiB;
 let concurrency=capacity,fastSamples=0,currentFile='page manifest',next=0,reserved=0;
 const pending=new Map(),controller=new AbortController();
 let files=[];
 const stats={mode:capacity>1?'adaptive':'low-memory',files:0,bytes:0,maxBufferedBytes:0,maxRequests:0};
 function status(){
  if(window.AtlasEarlyMap){window.AtlasEarlyMap.progress();return;}
  notice.textContent='Opening atlas…';
  const detail=document.createElement('small');
  detail.style.cssText='font-size:13px;opacity:.8;text-align:center;padding:0 20px';
  detail.textContent=`${concurrency>1?'Fast loading':'Memory-safe loading'} · preparing ${stats.files} of ${files.length} files`;
  notice.append(detail);
 }
 async function fetchAsset(file){
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetch(file,{cache:attempt?'reload':'default',signal:controller.signal});
    if(!response.ok)throw Error('HTTP '+response.status+' while loading '+file);
    return new Uint8Array(await response.arrayBuffer());
   }catch(error){
    if(attempt===2||controller.signal.aborted)throw error;
    await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
   }
  }
 }
 function fill(){
  while(next<files.length&&pending.size<concurrency){
   const asset=files[next],size=asset.bytes||budget+1;
   // An oversized or unknown-size asset runs alone. Keep compressed buffers,
   // never multiple decompressed source strings, in this bounded queue.
   if(pending.size&&(reserved+size>budget))break;
   reserved+=size;
   pending.set(next++,{size,result:fetchAsset(asset.url).then(bytes=>({bytes}),error=>({error}))});
   stats.maxBufferedBytes=Math.max(stats.maxBufferedBytes,reserved);
   stats.maxRequests=Math.max(stats.maxRequests,pending.size);
  }
 }
 async function execute(file,bytes){
  let source;
  if(bytes[0]===31&&bytes[1]===139){
   if(typeof DecompressionStream==='undefined')throw Error('This browser does not support the compressed atlas data. Please update your browser, or open this link in a current Safari, Chrome, Edge or Firefox browser.');
   source=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }else source=new TextDecoder().decode(bytes);
  bytes=null;
  let failure=null;
  const capture=e=>{failure=e.error||Error(e.message);};
  window.addEventListener('error',capture);
  const script=document.createElement('script');
  try{
   script.textContent=source+'\n//# sourceURL='+file;
   source=null;
   document.body.append(script);
   if(failure)throw failure;
  }finally{
   window.removeEventListener('error',capture);
   script.remove();script.textContent='';
  }
 }
 try{
  files=JSON.parse(manifest.textContent).map(asset=>typeof asset==='string'?{url:asset}:asset);
  if(!files.length||files.some(a=>typeof a.url!=='string'))throw Error('Invalid atlas asset manifest');
  status();fill();
  for(let i=0;i<files.length;i++){
   currentFile=files[i].url;
   const entry=pending.get(i);
   let result=await entry.result;
   entry.result=null;
   if(result.error)throw result.error;
   stats.bytes+=result.bytes.byteLength;
   const before=performance.now();
   await execute(currentFile,result.bytes);
   result=null;pending.delete(i);reserved-=entry.size;
   const elapsed=performance.now()-before;
   // Actual processing time can override optimistic hardware hints. A slow
   // dataset reduces look-ahead until several light scripts finish quickly.
   if(elapsed>120){concurrency=1;fastSamples=0;}
   else if(elapsed<30&&++fastSamples>=3)concurrency=capacity;
   stats.files=i+1;status();fill();
   // Give navigation and painting a turn between dataset evaluations. Large
   // source strings still unpack one at a time on memory-constrained phones.
   if(window.AtlasEarlyMap)await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  }
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  window.AtlasEarlyMap?.finish();
  notice.remove();manifest.remove();
  console.info('Atlas startup complete',JSON.stringify({...stats,milliseconds:Math.round(performance.now()-started)}));
 }catch(error){
  controller.abort();pending.clear();
  console.error('Atlas loading failed',currentFile,error);
  if(window.AtlasEarlyMap){window.AtlasEarlyMap.fail();return;}
  notice.textContent='The atlas could not finish loading.';
  const detail=document.createElement('p');detail.style.cssText='max-width:36em;padding:0 20px;text-align:center;overflow-wrap:anywhere';
  detail.textContent=(error?.message||String(error))+' (File: '+currentFile+')';notice.append(detail);
  const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>location.reload();notice.append(retry);
 }
})();

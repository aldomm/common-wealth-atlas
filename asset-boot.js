/* Execute one dataset at a time so startup does not retain every decompressed
   source string alongside its parsed objects. Keep classic-script ordering. */
(async()=>{
 const manifest=document.getElementById('atlas-scripts');
 const notice=document.getElementById('atlasStartup');
 let currentFile='page manifest';
 async function fetchAsset(file){
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await fetch(file,{cache:attempt?'reload':'default'});
    if(!response.ok)throw Error('HTTP '+response.status+' while loading '+file);
    return new Uint8Array(await response.arrayBuffer());
   }catch(error){
    if(attempt===2)throw error;
    await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
   }
  }
 }
 async function execute(file){
  let bytes=await fetchAsset(file),source;
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
   // Definitions remain available after removing their classic script element.
   script.remove();script.textContent='';
  }
 }
 try{
  const files=JSON.parse(manifest.textContent);
  for(let i=0;i<files.length;i++){
   currentFile=files[i];notice.textContent='Loading atlas… '+Math.round(i/files.length*100)+'%';
   await execute(currentFile);
  }
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  notice.remove();manifest.remove();
 }catch(error){
  console.error('Atlas loading failed',currentFile,error);
  notice.textContent='The atlas could not finish loading.';
  const detail=document.createElement('p');detail.style.cssText='max-width:36em;padding:0 20px;text-align:center;overflow-wrap:anywhere';
  detail.textContent=(error?.message||String(error))+' (File: '+currentFile+')';notice.append(detail);
  const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=()=>location.reload();notice.append(retry);
 }
})();

(()=>{
/* Source-preserving timeline adapter. Inputs remain unchanged; no causal effects inferred. */
function normalizeEvents(globalRecords=[],economicRecords=[],warRecords=[],supplementaryRecords=[]) {
 const aliases={
  'context-wwi-western':'global-ww1','context-wwii-europe':'global-ww2',
  'historical-crimean-GBR':'context-crimea-allied-1854','historical-crimean-FRA':'context-crimea-allied-1854','historical-crimean-TUR':'context-crimea-allied-1854',
  'historical-second-sino-japanese':'context-china-japan-war'
 };
 const alias=id=>aliases[id]||(id.startsWith('historical-wwii-')?'global-ww2':id.startsWith('historical-wwi-')?'global-ww1':id);
 const valid=r=>Number.isInteger(r.startYear)&&Number.isInteger(r.endYear)&&r.startYear<=r.endYear&&r.endYear>=1820&&r.startYear<=2025;
 const unique=xs=>[...new Set(xs.filter(Boolean))];
 const clean=r=>({...r,countryIds:unique(r.countryIds||[]),reach:r.reach||'',summary:r.summary||'',datePrecision:r.datePrecision||'year',causalityCaveat:r.causalityCaveat||'No causal economic effect inferred.',timeCaveat:r.timeCaveat||'',economicRelevance:r.economicRelevance||'',sources:(r.sources||[]).filter(s=>s?.url)});
 const map=new Map();
 function merge(r){if(!valid(r))return;const originalID=r.id,id=alias(r.id),existing=map.get(id);r=clean({...r,id});if(!existing){map.set(id,r);return;}
  if(originalID!==id&&(r.startYear<existing.startYear||r.endYear>existing.endYear)){
   // A broader/earlier source phase remains independently accessible; never extend a main war's dates.
   const phaseID='phase-'+originalID;
   map.set(phaseID,clean({...r,id:phaseID,title:r.title+' · source period',timeCaveat:r.timeCaveat+' This source period extends outside the main event dates; it is retained separately.'}));return;
  }
  existing.countryIds=unique([...existing.countryIds,...r.countryIds]);
  const sourceKeys=new Set(existing.sources.map(s=>s.url+'|'+s.title));for(const s of r.sources){const k=s.url+'|'+s.title;if(!sourceKeys.has(k)){existing.sources.push(s);sourceKeys.add(k);}}
  if(r.summary&&!existing.reach.includes(r.summary))existing.reach+='\n'+r.summary;
  if(r.reach&&!existing.reach.includes(r.reach))existing.reach+='\n'+r.reach;
  if(r.timeCaveat&&!existing.timeCaveat.includes(r.timeCaveat))existing.timeCaveat+='\n'+r.timeCaveat;
  // Keep the curated anchor's dates/scope; each merged participant phase retains its own dates below.
 }
 for(const r of globalRecords)merge(r);
 for(const r of economicRecords)merge({...r,id:'context-'+r.id,eventType:r.eventType||(/war|wwi|crimea|waterloo|boer|prussian/.test(r.id)?'war':'crisis'),scope:'local',reach:r.spatialCaveat||'',sources:r.sources||[r.source]});
 for(const r of warRecords){
  const countryIds=unique([...(r.affectedCountryIds||[]),...(r.referenceCountryIds||[]),...(r.sides||[]).flatMap(s=>[...(s.countryIds||[]),...(s.referenceCountryIds||[])])]);
  const sides=(r.sides||[]).map(s=>s.name+((s.referenceCountryIds||[]).length?' (historical-territory reference links)':'')).join(' ↔ ');
  const phase=`${r.startYear===r.endYear?r.startYear:r.startYear+'–'+r.endYear}: ${r.name}. ${sides}.`;
  const sourceDetail=r.source?`Source record ${r.id}; ${r.source.row!=null?'row '+r.source.row+'; ':''}${r.source.dyadId!=null?'dyad '+r.source.dyadId+'; ':''}${r.source.conflictId!=null?'conflict '+r.source.conflictId+'; ':''}`:'';
  merge({id:r.id,title:r.name,startYear:r.startYear,endYear:r.endYear,eventType:r.type==='annexation'?'government':'war',scope:'local',countryIds,summary:phase,reach:[r.intensityLabel,sourceDetail,r.affectedCountryIds?.length?'Affected-location references: '+r.affectedCountryIds.join(', ')+'. These are not automatically combatants.':'',r.caveat].filter(Boolean).join('\n'),datePrecision:r.temporalPrecision||'year',timeCaveat:'Annual or historical source coverage; absence of a record is not evidence of peace. Participant phases retain their own dates and do not imply continuous daily fighting.',sources:[r.source].filter(Boolean)});
 }
 for(const r of supplementaryRecords)merge(r);
 return [...map.values()].sort((a,b)=>a.startYear-b.startYear||a.endYear-b.endYear||a.id.localeCompare(b.id));
}
window.AtlasContextCatalogue={normalizeEvents};

})();

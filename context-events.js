(()=>{'use strict';
 const types={war:'Wars',pandemic:'Pandemics',crisis:'Economic crises',technology:'Technology & infrastructure',health:'Public health',policy:'Policies & treaties',government:'Government changes'},key='atlas-event-overlays-v1';
 let settings={enabled:true,global:true,local:true,types:Object.keys(types),excluded:[]};try{const s=JSON.parse(localStorage.getItem(key));if(s)settings={...settings,...s,types:Array.isArray(s.types)?s.types.filter(t=>types[t]):settings.types,excluded:Array.isArray(s.excluded)?s.excluded:[]};}catch(_){}
 const existing=(window.EconomicEvents?.records||[]).map(r=>({...r,id:'context-'+r.id,eventType:/war|wwi|crimea|waterloo|boer|prussian/.test(r.id)?'war':'crisis',scope:'local',reach:r.spatialCaveat||'',sources:r.sources||[r.source]}));
 const model=AtlasContextModel.create([...(window.AtlasGlobalContext?.records||[]),...existing],window.PoliticsData);
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
 const btn=(text,fn)=>{const n=el('button',text);n.type='button';n.onclick=fn;return n;};
 const period=r=>r.startYear===r.endYear?String(r.startYear):r.startYear+'–'+r.endYear;
 const query=(ids,start,end)=>model.query(ids,start,end,settings);
 const launcher=btn('Events',()=>open());launcher.id='atlasContextButton';launcher.setAttribute('aria-label','Global event overlays');document.querySelector('header').append(launcher);
 const dialog=el('dialog');dialog.id='atlasContextDialog';dialog.setAttribute('aria-label','Global event overlays');document.body.append(dialog);
 const details=el('dialog');details.id='atlasContextEvidence';details.setAttribute('aria-label','Event evidence');document.body.append(details);
 for(const d of [dialog,details]){d.addEventListener('click',e=>{if(e.target===d)d.close();});d.addEventListener('keydown',e=>{if(e.key==='Escape')e.stopPropagation();});}
 function save(){try{localStorage.setItem(key,JSON.stringify(settings));}catch(_){}window.dispatchEvent(new Event('atlas:context-change'));window.AtlasCountryCanvas?.schedule();updateStrip();}
 function control(parent,label,checked,change){const l=el('label'),c=el('input');c.type='checkbox';c.checked=checked;c.onchange=()=>{change(c.checked);save();};l.append(c,document.createTextNode(label));parent.append(l);return c;}
 function open(ids){dialog.replaceChildren();const close=btn('Close',()=>dialog.close());dialog.append(close,el('h2','Events across the atlas'),el('p','These settings apply to every country and graph and are saved on this device. Global milestones do not establish local adoption or equal effects.'));
  control(dialog,'Show event overlays',settings.enabled,v=>settings.enabled=v);control(dialog,'Global context in every country',settings.global,v=>settings.global=v);control(dialog,'Country-linked events & annual leadership changes',settings.local,v=>settings.local=v);
  const cats=el('div');cats.className='context-categories';for(const[t,name]of Object.entries(types))control(cats,name,settings.types.includes(t),v=>settings.types=v?[...new Set([...settings.types,t])]:settings.types.filter(x=>x!==t));dialog.append(cats);
  dialog.append(el('p','Choose individual events below. Country-specific records follow the selected place; global choices persist when you move elsewhere. Blank means not documented here.'));
  const search=el('input');search.type='search';search.placeholder='Find events or years';search.setAttribute('aria-label','Find context events');const list=el('div');list.className='context-list';const id=window.AtlasCountryCanvas?.getCountryId();const selectedIds=Array.isArray(ids)?ids:(id?[id]:[]);const rows=model.catalogue(selectedIds).filter(r=>r.scope==='global'||r.countryIds?.some(c=>selectedIds.includes(c)));
  const render=()=>{list.replaceChildren();const q=search.value.toLowerCase();for(const r of rows.filter(r=>(r.title+' '+period(r)+' '+r.summary).toLowerCase().includes(q))){const item=el('div');control(item,period(r)+' · '+r.title, !settings.excluded.includes(r.id),v=>settings.excluded=v?settings.excluded.filter(x=>x!==r.id):[...new Set([...settings.excluded,r.id])]);item.append(btn('Evidence',()=>showEvidence(r)));list.append(item);}};
  search.oninput=render;dialog.append(search,list,btn('Restore all event selections',()=>{settings={enabled:true,global:true,local:true,types:Object.keys(types),excluded:[]};save();open(ids);}));render();if(!dialog.open)dialog.showModal();
 }
 function showEvidence(r){details.replaceChildren(btn('Close',()=>details.close()),el('h2',r.title),el('p',period(r)+' · '+(r.scope==='global'?'Global context':'Country-linked context')+' · '+(r.datePrecision||'year')+' precision'),el('p',r.summary));
  for(const text of [r.reach,r.timeCaveat,r.economicRelevance,r.causalityCaveat])if(text)details.append(el('p',text));
  for(const s of r.sources||[]){if(!s?.url||!/^https?:/.test(s.url))continue;const a=el('a',s.title||'Source');a.href=s.url;a.target='_blank';a.rel='noopener';details.append(a,el('br'));}if(!details.open)details.showModal();
 }
 const strip=el('div');strip.id='atlasContextStrip';strip.setAttribute('aria-label','Global events in selected year');document.body.append(strip);
 let lastYear=null;function updateStrip(){const y=years[idx];lastYear=y;const rows=query([],y,y);strip.replaceChildren();strip.hidden=!rows.length;if(rows.length){strip.append(btn(y+' · '+rows.length+' global '+(rows.length===1?'event':'events'),()=>{details.replaceChildren(btn('Close',()=>details.close()),el('h2','Global context · '+y),el('p','Available for every country; local participation and adoption differ.'));for(const r of rows)details.append(btn(r.title,()=>showEvidence(r)));details.showModal();}));}}
 let timer;const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(years[idx]!==lastYear)updateStrip();},0);};const original=draw;draw=function(){original();changed();};
 window.AtlasContext={query,catalogue:model.catalogue,open,showEvidence,period,settings:()=>settings,warEnabled:()=>settings.enabled&&settings.local&&settings.types.includes('war')};
 updateStrip();
})();

/* Clickable definitions in prose. Source links, controls and SVG are left intact. */
(()=>{'use strict';
let entries=[],lookup=new Map(),pattern,previousFocus;
const dialog=document.createElement('dialog');dialog.id='atlasGlossary';dialog.setAttribute('aria-labelledby','atlasGlossaryTitle');
dialog.innerHTML='<div class="glossary-heading"><h2 id="atlasGlossaryTitle">Quick definitions</h2><button type="button" aria-label="Close definitions">×</button></div><div class="glossary-content"></div>';
document.body.append(dialog);const content=dialog.querySelector('.glossary-content');
function close(){dialog.close();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
dialog.querySelector('button').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('click',e=>{e.stopPropagation();if(e.target===dialog)close();});
function show(term){if(lookup.has(term)){quick(term,document.activeElement);return;}previousFocus=document.activeElement;content.replaceChildren();
 const selected=lookup.get(term);const list=selected?[selected]:entries;
 if(!list.length){const p=document.createElement('p');p.textContent='Definitions are not loaded yet. Please try again shortly.';content.append(p);}
 for(const item of list){const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p'),a=document.createElement('a');h.textContent=item.term+' · '+item.name;a.href=item.source;a.textContent='More information ↗';a.target='_blank';a.rel='noopener';section.append(h,a);content.append(section);}
 if(selected){const all=document.createElement('button');all.type='button';all.textContent='All definitions';all.onclick=()=>show();content.append(all);}
 if(!dialog.open)dialog.showModal();dialog.querySelector('button').focus({preventScroll:true});
}
const launcher=document.createElement('button');launcher.type='button';launcher.textContent='Terms';launcher.title='Quick definitions: PPP, CPI, GDP and more';launcher.onclick=()=>show();document.querySelector('header')?.append(launcher);
const excluded='script,style,svg,canvas,button,a,input,textarea,select,code,pre,[contenteditable], [role="button"],#atlasGlossary,.atlas-term-tip';
function scan(root){if(!pattern||!root?.isConnected)return;const nodes=[];
 function accept(node){return !!node.parentElement&&!node.parentElement.closest(excluded)&&pattern.test(node.nodeValue||'');}
 if(root.nodeType===Node.TEXT_NODE){if(accept(root))nodes.push(root);}else if(root.nodeType===Node.ELEMENT_NODE&&!root.closest(excluded)){const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>accept(n)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});while(walk.nextNode())nodes.push(walk.currentNode);}
 for(const node of nodes){const text=node.nodeValue;const parts=text.split(new RegExp('\\b('+entries.map(e=>e.term).join('|')+')\\b','g'));if(parts.length<2)continue;const fragment=document.createDocumentFragment();for(const part of parts){const item=lookup.get(part);if(!item){fragment.append(document.createTextNode(part));continue;}const b=document.createElement('button');b.type='button';b.className='atlas-term';b.textContent=part;b.setAttribute('aria-label',part+': '+item.name);b.onclick=e=>{e.stopPropagation();show(part);};fragment.append(b);}node.replaceWith(fragment);}
}
fetch('atlas-glossary.json?v=terms-1').then(r=>{if(!r.ok)throw Error('Glossary unavailable');return r.json();}).then(data=>{entries=data;lookup=new Map(entries.map(e=>[e.term,e]));pattern=new RegExp('\\b('+entries.map(e=>e.term).join('|')+')\\b');scan(document.body);new MutationObserver(changes=>{for(const m of changes){if(m.type==='characterData')scan(m.target);else for(const n of m.addedNodes)scan(n);}}).observe(document.body,{childList:true,subtree:true,characterData:true});}).catch(()=>{launcher.title='Definitions could not load; reload to retry';});
const tip=document.createElement('div');tip.className='atlas-term-tip';tip.hidden=true;tip.setAttribute('role','dialog');document.body.append(tip);
function dismissTip(){tip.hidden=true;}
function quick(term,anchor){const item=lookup.get(term);tip.replaceChildren();const title=document.createElement('strong'),more=document.createElement('a'),close=document.createElement('button');title.textContent=item.term+' — '+item.name;more.href=item.source;more.target='_blank';more.rel='noopener';more.textContent='More ↗';close.type='button';close.textContent='×';close.setAttribute('aria-label','Close acronym label');close.onclick=dismissTip;tip.append(title,more,close);tip.hidden=false;tip.setAttribute('aria-label',item.term+' expanded');const r=anchor?.getBoundingClientRect?.()||{left:20,bottom:80,top:80};tip.style.left=Math.max(12,Math.min(r.left,innerWidth-tip.offsetWidth-12))+'px';tip.style.top=Math.max(12,Math.min(r.bottom+8,innerHeight-tip.offsetHeight-12))+'px';if(r.bottom+tip.offsetHeight+8>innerHeight-12)tip.style.top=Math.max(12,r.top-tip.offsetHeight-8)+'px';}
document.addEventListener('click',e=>{if(!tip.contains(e.target)&&!e.target.closest('.atlas-term'))dismissTip();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!tip.hidden){dismissTip();e.stopImmediatePropagation();e.preventDefault();}},true);
window.addEventListener('resize',dismissTip);
window.AtlasGlossary={show};
})();

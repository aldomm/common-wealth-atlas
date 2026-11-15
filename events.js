/* Historical context is separate from measured GDP and does not estimate causes. */
(function(){
 const records=()=>window.EconomicEvents?.records||[];
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const period=r=>r.startYear===r.endYear?String(r.startYear):r.startYear+'–'+r.endYear;
 function mapRecords(){return records().flatMap(r=>(r.anchors?.length?r.anchors:[{countryId:r.countryIds[0],name:r.place,lon:r.lon,lat:r.lat}]).map(a=>({...r,id:'event:'+r.id+':'+a.countryId,category:'events',referenceCountryId:a.countryId,place:a.name+' · country reference point',lon:a.lon,lat:a.lat,summary:r.summary+' '+r.economicRelevance,caveats:r.causalityCaveat,timeCaveat:period(r)+' ('+r.datePrecision+' precision). '+r.timeCaveat})));}
 function card(r){return `<article class="context-event"><strong>${esc(period(r))}</strong><h4>${esc(r.title)}</h4><p>${esc(r.summary)}</p><p>${esc(r.economicRelevance)}</p><small>${esc(r.causalityCaveat)}</small><p>${(r.sources||[r.source]).map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>`).join('<br>')}</p>${r.startYear>=1820?`<button data-event-year="${r.startYear}">View ${r.startYear} on map</button>`:''}</article>`;}
 function appendContext(c,y){
  if(!c)return;const rows=window.AtlasContext?AtlasContext.query([c.id],1820,2025):records().filter(r=>r.countryIds.includes(c.id));
  const panel=document.getElementById('detail');panel.querySelector('.historical-context')?.remove();
  const near=rows.filter(r=>r.startYear<=y+10&&r.endYear>=y-10);
  const section=document.createElement('section');section.className='historical-context';section.innerHTML=`<h3>Events & historical context</h3><p>Documented events near ${y} (within 10 years). These are context, not estimates of an event’s effect on GDP. Country links are selective reference-series associations.</p>${near.length?near.map(card).join(''):'<p>No event in this initial batch near the selected year.</p>'}<details><summary>All ${rows.length} documented events linked to ${esc(c.name)}</summary>${rows.map(card).join('')||'<p>No linked event yet.</p>'}</details><p><a href="economic-events-data.json" download>Download all events and sources ↗</a></p>`;
  const heading=[...panel.querySelectorAll('h3')].find(h=>h.textContent.includes('LEADERSHIP EVENTS'));if(heading)heading.before(section);else panel.appendChild(section);
  section.querySelectorAll('[data-event-year]').forEach(b=>b.onclick=()=>setBoundaryDate(b.dataset.eventYear+'-01-01'));
  for(const svg of panel.querySelectorAll('svg.chart')){
   svg.querySelector('.event-bands')?.remove();const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('class','event-bands');
   g.innerHTML=rows.filter(r=>r.endYear>=1820&&r.startYear<=2025).map(r=>{const x=8+(Math.max(1820,r.startYear)-1820)/205*264,w=Math.max(1,(Math.min(2025,r.endYear)-Math.max(1820,r.startYear))/205*264);return `<rect x="${x}" y="14" width="${w}" height="74" fill="#f3a18b" opacity=".16"><title>${esc(r.title+' · '+period(r)+' · context only')}</title></rect>`;}).join('');svg.prepend(g);
   const note=document.createElement('p');note.className='muted';note.textContent='Shaded periods: selected global and country-linked context. Overlap does not establish causation.';svg.after(note);
  }
 }
 const originalDetail=detail;detail=function(){originalDetail();appendContext(D.countries.find(c=>c.id===selected),years[idx]);};
 window.AtlasEvents={mapRecords,records,card};
})();

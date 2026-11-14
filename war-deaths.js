/* Whole-war country evidence shared by map and comparison popups. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function keyFor(record){return record.id?.startsWith('historical-wwii-')?'ww2':record.id?.startsWith('historical-wwi-')?'ww1':null;}
function format(d){if(!d)return 'Not recorded';const n=x=>x.toLocaleString('en-US');return d.min!=null&&d.max!=null?'Estimated range: '+n(d.min)+'–'+n(d.max):'Estimate: '+n(d.value);}
function html(records,preferred=[]){
 const keys=[...new Set(records.map(keyFor).filter(Boolean))];
 return keys.map(key=>{
  const data=window.AtlasWarDeathsData?.[key];if(!data)return '';
  const ids=new Set([...preferred,...records.filter(r=>keyFor(r)===key).flatMap(r=>(r.sides||[]).flatMap(s=>[...(s.countryIds||[]),...(s.referenceCountryIds||[])]))]);
  const matches=row=>row.referenceCountryIds.some(id=>ids.has(id));
  const rowHTML=row=>`<div class="war-country-deaths"><h5>${esc(row.name)}</h5><p><strong>Military deaths:</strong> ${esc(format(row.military))}</p><p><strong>Civilian + military deaths:</strong> ${esc(format(row.combined))}</p><small>Civilian-only deaths: not separately recorded in this table.</small></div>`;
  const relevant=data.rows.filter(matches),others=data.rows.filter(r=>!matches(r));
  return `<section class="war-country-totals"><h4>${esc(data.title)} · deaths by country</h4><p><strong>${esc(data.period)}</strong></p><p>These are whole-war losses, not deaths in the selected year or deaths caused by a particular opponent. Missing is not zero.</p><a href="${esc(data.source.url)}" target="_blank" rel="noopener">${esc(data.source.title)} ↗</a>${relevant.map(rowHTML).join('')}${others.length?`<details><summary>Other countries and historical territories (${others.length})</summary>${others.map(rowHTML).join('')}</details>`:''}<details><summary>Death estimates: scope and limitations</summary><p>${esc(data.note)}</p></details><p class="war-death-scope">${data.rows.length} sourced country / historical-territory entries. Coverage is incomplete. Combined totals already include military deaths; do not add the columns or overlapping historical territories. These death totals do not create new opponent lines or establish participation in every year.</p></section>`;
 }).join('');
}
window.AtlasWarDeaths={keyFor,format,html};
})();

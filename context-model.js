/* Context is independent of numeric series: no outcome or causal magnitude is inferred. */
(()=>{'use strict';
function create(records,politics){
 const cache=new Map();
 function leadership(id){if(cache.has(id))return cache.get(id);const out=[],rows=politics?.countries?.[id]?.years||{};
  for(const[y,row]of Object.entries(rows)){const prev=rows[+y-1];if(!prev||+y<1820||+y>2025)continue;
   for(const[field,title]of [['v2exnamhos','head of state'],['v2exnamhog','head of government']]){const a=prev[field],b=row[field];if(!a||!b||a===b||String(a).trim()===''||String(b).trim()===''||['NA','N/A','Not applicable'].includes(a)||['NA','N/A','Not applicable'].includes(b))continue;
    out.push({id:'leadership-'+id+'-'+y+'-'+field,title:(politics.countries[id].name||id)+' · Annual '+title+' record changes',startYear:+y,endYear:+y,eventType:'government',scope:'local',countryIds:[id],summary:String(a)+' → '+String(b)+'.',reach:'V-Dem last recorded executive within each year. This is a comparison of consecutive annual records, not an exact inauguration date or a complete list of within-year changes. Colonial/state coverage can differ from the map borders.',datePrecision:'year',sources:[{title:'V-Dem annual executive records',url:politics.source||'https://github.com/vdeminstitute/vdemdata'}],causalityCaveat:'No causal economic effect inferred.'});
   }
  }cache.set(id,out);return out;
 }
 function catalogue(ids=[]){const all=[...records,...[...new Set(ids)].flatMap(leadership)];return [...new Map(all.map(r=>[r.id,r])).values()].filter(r=>r.endYear>=1820&&r.startYear<=2025).sort((a,b)=>a.startYear-b.startYear||a.id.localeCompare(b.id));}
 function query(ids,start,end,s){if(!s.enabled)return [];const set=new Set(ids),excluded=new Set(s.excluded||[]);return catalogue(ids).filter(r=>r.startYear<=end&&r.endYear>=start&&!excluded.has(r.id)&&s.types.includes(r.eventType||'crisis')&&(s.allPlaces||(r.scope==='global'?s.global:s.local&&(r.countryIds||[]).some(id=>set.has(id)))));}
 return {catalogue,query,leadership};
}
window.AtlasContextModel={create};
})();

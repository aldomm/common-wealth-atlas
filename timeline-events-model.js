(()=>{'use strict';
function layout(records,start,end,width,minHit=28){const lanes=[],out=[],x=y=>(y-start)/Math.max(1,end-start)*width;
 for(const record of records.filter(r=>r.startYear<=end&&r.endYear>=start).sort((a,b)=>a.startYear-b.startYear||a.id.localeCompare(b.id))){const left=Math.max(0,Math.min(width-2,x(Math.max(start,record.startYear)))),span=Math.max(2,x(Math.min(end,record.endYear))-left),hit=Math.min(width-left,Math.max(minHit,span,Math.min(140,record.title.length*5.5))),actualLeft=Math.min(left,Math.max(0,width-Math.max(minHit,hit))),actualWidth=Math.max(minHit,hit);let lane=lanes.findIndex(right=>right+6<=actualLeft);if(lane<0)lane=lanes.length;lanes[lane]=actualLeft+actualWidth;out.push({record,left:actualLeft,width:actualWidth,span,lane,markOffset:left-actualLeft});}return out;
}
// Dense timelines group nearby starts by category; the full records remain in each group.
function cluster(records,start,end,width){
 if(records.length<=120)return records;
 const bins=new Map(),span=Math.max(1,end-start),n=Math.max(1,Math.floor(width/36));
 for(const r of records){const bin=Math.min(n-1,Math.max(0,Math.floor((Math.max(start,r.startYear)-start)/span*n))),key=(r.eventType||'crisis')+'-'+bin;const group=bins.get(key)||[];group.push(r);bins.set(key,group);}
 return [...bins.entries()].map(([key,rs])=>rs.length===1?rs[0]:{id:'event-cluster-'+key,title:rs.length+' '+(rs[0].eventType||'context')+' events',startYear:Math.max(start,Math.min(...rs.map(r=>r.startYear))),endYear:Math.max(start,Math.min(...rs.map(r=>r.startYear))),eventType:rs[0].eventType,events:rs});
}
window.AtlasTimelineEventsModel={layout,cluster};
})();

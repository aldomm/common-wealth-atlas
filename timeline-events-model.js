(()=>{'use strict';
function layout(records,start,end,width,minHit=28){const lanes=[],out=[],x=y=>(y-start)/Math.max(1,end-start)*width;
 for(const record of records.filter(r=>r.startYear<=end&&r.endYear>=start).sort((a,b)=>a.startYear-b.startYear||a.id.localeCompare(b.id))){const left=Math.max(0,Math.min(width-2,x(Math.max(start,record.startYear)))),span=Math.max(2,x(Math.min(end,record.endYear))-left),hit=Math.min(width-left,Math.max(minHit,span,Math.min(140,record.title.length*5.5))),actualLeft=Math.min(left,Math.max(0,width-Math.max(minHit,hit))),actualWidth=Math.max(minHit,hit);let lane=lanes.findIndex(right=>right+6<=actualLeft);if(lane<0)lane=lanes.length;lanes[lane]=actualLeft+actualWidth;out.push({record,left:actualLeft,width:actualWidth,span,lane,markOffset:left-actualLeft});}return out;
}
window.AtlasTimelineEventsModel={layout};
})();

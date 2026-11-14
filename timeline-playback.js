/* User-controlled playback through the shared atlas timeline. */
(()=>{'use strict';
const slider=document.getElementById('time'),row=slider.previousElementSibling;
const play=document.createElement('button'),speed=document.createElement('button');
play.id='timelinePlay';play.type='button';speed.id='timelineSpeed';speed.type='button';
row.append(play,speed);
const range=document.createElement('details'),summary=document.createElement('summary'),fields=document.createElement('div');
range.id='timelineInterval';fields.className='timeline-interval-fields';
const start=document.createElement('input'),end=document.createElement('input');
for(const [input,id,title,value] of [[start,'timelineStart','From',years[0]],[end,'timelineEnd','To',years[years.length-1]]]){
 input.id=id;input.type='number';input.min=String(years[0]);input.max=String(years[years.length-1]);input.step='1';input.value=String(value);input.required=true;input.setAttribute('aria-label',title+' year');
 const label=document.createElement('label');label.textContent=title;label.append(input);fields.append(label);
}
const hint=document.createElement('span');hint.textContent='Set the years, then press Play. Playback stops at the end year. Your valid interval is remembered on this browser.';fields.append(hint);
range.append(summary,fields);row.after(range);
function bounds(){
 const first=Number(start.value),last=Number(end.value);
 start.setCustomValidity('');end.setCustomValidity('');
 if(!start.value||!end.value||!Number.isInteger(first)||!Number.isInteger(last)||first<years[0]||last>years[years.length-1]||first>last){
  end.setCustomValidity('Choose whole years from '+years[0]+' to '+years[years.length-1]+', with From no later than To.');return null;
 }
 const lo=years.findIndex(y=>y>=first),hi=years.findLastIndex(y=>y<=last);
 if(lo<0||hi<lo){end.setCustomValidity('No selectable year falls within this interval.');return null;}
 return {lo,hi};
}
const storageKey='atlas-timeline-interval-v1';
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&Number.isInteger(saved.start)&&Number.isInteger(saved.end)){start.value=String(saved.start);end.value=String(saved.end);if(!bounds()){start.value=String(years[0]);end.value=String(years.at(-1));bounds();}}}catch{}
function saveInterval(){if(bounds())try{localStorage.setItem(storageKey,JSON.stringify({start:Number(start.value),end:Number(end.value)}));}catch{}}
function rangeLabel(){summary.textContent='Interval: '+start.value+'–'+end.value;}
for(const input of [start,end])input.addEventListener('input',()=>{pause();saveInterval();rangeLabel();});
rangeLabel();
// Keep navigation reachable when the interval editor expands or wraps on phones.
if(window.ResizeObserver){
 const footer=slider.parentElement,placeZoom=()=>{const zoom=document.querySelector('.zoom');if(zoom)zoom.style.bottom=Math.max(0,window.innerHeight-footer.getBoundingClientRect().top+12)+'px';};
 new ResizeObserver(placeZoom).observe(footer);window.addEventListener('resize',placeZoom);
}
let playing=false,timer=null,speedIndex=0;
const speeds=[1,2,5];
function paint(){
 play.textContent=playing?'Ⅱ Pause':'▶ Play';play.setAttribute('aria-label',playing?'Pause timeline':'Play timeline');play.setAttribute('aria-pressed',String(playing));
 play.title='Advance the whole atlas through time; stops at your interval’s end year. Manual timeline changes pause playback.';
 speed.textContent=speeds[speedIndex]+'×';speed.setAttribute('aria-label','Timeline speed: '+speeds[speedIndex]+(speeds[speedIndex]===1?' year per second':' years per second'));speed.title='Change playback speed: 1, 2 or 5 years per second';
}
function pause(){playing=false;clearTimeout(timer);timer=null;paint();}
function move(index){slider.value=String(index);slider.dispatchEvent(new Event('input',{bubbles:true}));}
function queue(){clearTimeout(timer);timer=setTimeout(tick,1000/speeds[speedIndex]);}
function tick(){
 timer=null;if(!playing)return;if(document.hidden){pause();return;}
 const interval=bounds();if(!interval){pause();return;}
 const current=Number(slider.value);if(current<interval.lo||current>=interval.hi){pause();return;}
 const next=current+1,last=interval.hi;
 if(next>last){pause();return;}
 move(next);if(next===last)pause();else queue();
}
play.addEventListener('click',()=>{
 if(playing){pause();return;}
 const interval=bounds();if(!interval){range.open=true;end.reportValidity();return;}
 const current=Number(slider.value);if(current<interval.lo||current>=interval.hi)move(interval.lo);
 if(interval.lo===interval.hi){pause();return;}
 playing=true;paint();queue();
});
speed.addEventListener('click',()=>{speedIndex=(speedIndex+1)%speeds.length;paint();if(playing)queue();});
// Programmatic playback input follows the same handlers as dragging the slider.
slider.addEventListener('input',e=>{if(e.isTrusted)pause();});
for(const id of ['prev','next','boundaryDate'])document.getElementById(id)?.addEventListener(id==='boundaryDate'?'change':'click',pause);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&playing)pause();});
window.addEventListener('pagehide',pause);
paint();
})();

/* User-controlled playback through the shared atlas timeline. */
(()=>{'use strict';
const slider=document.getElementById('time'),row=slider.previousElementSibling;
const play=document.createElement('button'),speed=document.createElement('button');
play.id='timelinePlay';play.type='button';speed.id='timelineSpeed';speed.type='button';
row.append(play,speed);
let playing=false,timer=null,speedIndex=0;
const speeds=[1,2,5];
function paint(){
 play.textContent=playing?'Ⅱ Pause':'▶ Play';play.setAttribute('aria-label',playing?'Pause timeline':'Play timeline');play.setAttribute('aria-pressed',String(playing));
 play.title='Advance the whole atlas through time; stops at the last year. Manual timeline changes pause playback.';
 speed.textContent=speeds[speedIndex]+'×';speed.setAttribute('aria-label','Timeline speed: '+speeds[speedIndex]+(speeds[speedIndex]===1?' year per second':' years per second'));speed.title='Change playback speed: 1, 2 or 5 years per second';
}
function pause(){playing=false;clearTimeout(timer);timer=null;paint();}
function move(index){slider.value=String(index);slider.dispatchEvent(new Event('input',{bubbles:true}));}
function queue(){clearTimeout(timer);timer=setTimeout(tick,1000/speeds[speedIndex]);}
function tick(){
 timer=null;if(!playing)return;if(document.hidden){pause();return;}
 const next=Number(slider.value)+1,last=Number(slider.max);
 if(next>last){pause();return;}
 move(next);if(next===last)pause();else queue();
}
play.addEventListener('click',()=>{
 if(playing){pause();return;}
 if(Number(slider.value)>=Number(slider.max))move(Number(slider.min));
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

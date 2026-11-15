/* Keep a geographic point beneath the pointer on an orthographic globe.
   A minimal 3D camera rotation avoids singular north-up corrections near poles. */
(()=>{'use strict';
 const rad=Math.PI/180,deg=180/Math.PI,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const multiply=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
 function rotation([lambda,phi,gamma=0]){lambda*=rad;phi*=rad;gamma*=rad;const c=Math.cos,s=Math.sin;
  return multiply([[1,0,0],[0,c(gamma),-s(gamma)],[0,s(gamma),c(gamma)]],multiply([[c(phi),0,-s(phi)],[0,1,0],[s(phi),0,c(phi)]],[[c(lambda),-s(lambda),0],[s(lambda),c(lambda),0],[0,0,1]]));
 }
 function spherePoint(point,center,scale,limit){let x=(point[0]-center[0])/scale,y=(center[1]-point[1])/scale,r=Math.hypot(x,y);if(r>1){if(!limit)return null;x*=.999999/r;y*=.999999/r;}return [Math.sqrt(Math.max(0,1-x*x-y*y)),x,y];}
 function anchoredRotation(angles,center,oldScale,newScale,from,to=from){
  if(!(oldScale>0&&newScale>0)||![...angles,...center,...from,...to].every(Number.isFinite))return angles.slice();
  const a=spherePoint(from,center,oldScale,false),b=spherePoint(to,center,newScale,true);if(!a)return angles.slice();
  const v=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=clamp(a.reduce((s,x,i)=>s+x*b[i],0),-1,1);
  if(dot>1-1e-15)return angles.slice();
  const K=[[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]],K2=multiply(K,K),delta=K.map((row,i)=>row.map((x,j)=>(i===j?1:0)+x+K2[i][j]/Math.max(1e-12,1+dot))),m=multiply(delta,rotation(angles));
  const phi=Math.asin(clamp(-m[0][2],-1,1)),lambda=Math.atan2(-m[0][1],m[0][0]),gamma=Math.atan2(-m[1][2],m[2][2]);
  return [lambda*deg,phi*deg,gamma*deg];
 }
 window.AtlasZoomAnchor={anchoredRotation};
})();

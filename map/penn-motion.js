// One polyline drives the route band, 2D dot and 3D figure. Local frame is x/up/z.
export function segmentPoints(steps,index,connectors,surfaceY){
 const a=steps[Math.min(index,steps.length-1)],b=steps[Math.min(index+1,steps.length-1)];
 const point=s=>s.p.length===3?[s.p[0],s.p[1]+.16,s.p[2]]:[s.p[0],surfaceY(s.floor)+.12,s.p[1]];
 const p=point(a),q=point(b),c=connectors.find(c=>c.id===b.connector);
 if(!c?.midLanding)return[p,q];
 const length=Math.abs(c.to[1]-c.from[1]),f=(length-c.midLanding)/2/length;
 const lerp=t=>p.map((v,j)=>j===1?(p[1]+q[1])/2:v+(q[j]-v)*t);
 return[p,lerp(f),lerp(1-f),q];
}
export function samplePath(points,f){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(...p.map((v,j)=>v-points[i][j])));
 let d=Math.max(0,Math.min(1,f))*lengths.reduce((a,b)=>a+b,0),k=0;
 while(k<lengths.length-1&&d>lengths[k])d-=lengths[k++];
 const a=points[k],b=points[k+1]||a,t=lengths[k]?d/lengths[k]:0;
 return{point:a.map((v,j)=>v+(b[j]-v)*t),tangent:a.map((v,j)=>b[j]-v)};
}

// Connector IDs belong to the arriving waypoint, so reversal moves each ID
// to the other endpoint of its edge.
export function reversePennSteps(steps, {destination, connectors, fareIndex, boarding, escalatorOffset=0}) {
 const reverse=steps.slice().reverse().map((s,i)=>({
  ...s, name:undefined, connector:steps[steps.length-i]?.connector,
  action:'Follow the passage toward '+destination+'.'
 }));
 for(let i=1;i<reverse.length;i++){
  const c=connectors.find(c=>c.id===reverse[i].connector);
  if(!c)continue;
  const from=reverse[i-1],to=reverse[i];
  if(c.kind==='escalator' && escalatorOffset){
   for(const j of [i-2,i-1,i,i+1]){
    if(reverse[j]?.p.length===2)reverse[j].p=[reverse[j].p[0]+escalatorOffset,reverse[j].p[1]];
   }
  }
  const up=from.floor===c.a;
  from.action=c.kind==='elevator'?'Take the elevator to the next level.':
   c.kind==='escalator'?(up?'Take the up escalator.':'Take the down escalator.'):
   (up?'Go up the stairs.':'Go down the stairs.');
  to.action='Clear the landing before continuing.';
 }
 if(fareIndex!==undefined)reverse[steps.length-1-fareIndex].action=boarding?
  'Enter fare control with a valid fare payment.':'Exit fare control toward Penn.';
 reverse.at(-1).action='You have arrived at '+destination+'.';
 return reverse;
}

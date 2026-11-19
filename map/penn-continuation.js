import {entrances, entranceJourney} from './penn-station/entrance-data.js';
import {journeys,makeSteps} from './penn-station/journeys.js';
import {stationStairs} from './penn-station/circulation-layout.js';
import {upperPassageRects} from './penn-station/upper-corridors.js';
import {abAnchors,calibratedAB} from './penn-station/anchors.js';
import {floorCuts} from './penn-station/connection-layout.js';
import {segmentPoints} from './penn-motion.js';

const FLOOR_LABELS={street:'Street',A:'Lower concourse',B:'Upper concourse',irtM:'1 2 3 lower passage',indM:'A C E lower passage',irtP:'1 2 3 platforms',indP:'A C E platforms'};
const FLOOR_SHORT={street:'G',A:'A',B:'B',irtM:'IRT',indM:'IND',irtP:'1 2 3',indP:'A C E'};
const HEIGHT={street:.3,A:-11.3,B:-5.3,irtM:-11,indM:-11,irtP:-5,indP:-5};
const inside=(r,x,z)=>x>=r[0]&&x<=r[2]&&z>=r[1]&&z<=r[3];
const toPlan=([x,z])=>[x,-z];
let modelPromise;
const model=()=>modelPromise??=fetch('penn-station/model.json').then(r=>r.json());
export function pennProjection(reg){
 const [a,b]=[reg.mercator_x,reg.mercator_y];
 return ([x,y,z])=>{
  const m=a[0]*x+a[1]*z+a[2],n=b[0]*x+b[1]*z+b[2];
  return [m*360-180,Math.atan(Math.sinh(Math.PI*(1-2*n)))*180/Math.PI];
 };
}
async function hallPath(floor,start,end){
 const data=await model(), f=data.floors.find(f=>f.id===floor);
 if(!f)return null;
 const extra=floor==='B'?upperPassageRects:[];
 const cuts=[...(floor==='B'?abAnchors.map(c=>c.opening):[]),...calibratedAB.map(c=>floorCuts(c,floor==='A'?'a':'b'))];
 const holes=cuts.map(([x,z,w,d])=>[x-w/2,-z-d/2,x+w/2,-z+d/2]);
 const clear=(x,z)=>{
  if(!f.rects.some(r=>inside(r,x,z))&&!extra.some(r=>inside(r,x,z)))return false;
  if(holes.some(r=>inside(r,x,z)))return false;
  return extra.some(r=>inside(r,x,z))||!f.walls.some(r=>inside(r,x,z));
 };
 const a=toPlan(start),b=toPlan(end);
 const line=(p,q)=>{
  const count=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/.35);
  for(let i=1;i<count;i++){const t=i/count;if(!clear(p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t))return false;}
  return true;
 };
 if(line(a,b))return [start,end];
 const key=([x,z])=>x+','+z;
 const candidates=p=>{
  const out=[];
  for(let x=Math.floor(p[0])-2;x<=Math.ceil(p[0])+2;x++)
   for(let z=Math.floor(p[1])-2;z<=Math.ceil(p[1])+2;z++)if(clear(x,z)&&line(p,[x,z]))out.push([x,z]);
  return out;
 };
 const targets=new Set(candidates(b).map(key)),q=candidates(a),prev=new Map(q.map(p=>[key(p),null]));
 for(let i=0;i<q.length;i++){
  const p=q[i], k=key(p);
  if(targets.has(k)){
   const path=[b,p];
   for(let t=prev.get(k);t;t=prev.get(key(t)))path.push(t);
   path.push(a);path.reverse();
   const reduced=[a];
   for(let j=0;j<path.length-1;){let n=path.length-1;while(n>j+1&&!line(path[j],path[n]))n--;reduced.push(path[n]);j=n;}
   return reduced.map(toPlan);
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=[p[0]+dx,p[1]+dz],id=key(next);
   if(!prev.has(id)&&clear(...next)&&line(p,next)){prev.set(id,p);q.push(next);}
  }
 }
 return null;
}
function entranceSteps(entry,method,reverse){
 const raw=entranceJourney(entry,method);
 const seq=reverse?raw.slice().reverse():raw;
 return seq.map((s,i)=>({p:s.p,transport:method,pennEntrance:entry.id,floor:s.p[1]>=0?'street':entry.floor,
  action:reverse?(i===0?'Follow the entrance passage toward the street.':i===3?(method==='elevator'?'Take the elevator up.':'Take the stairs up.'):'Continue toward the street.'):s.text}));
}
const xz=s=>s.p.length===3?[s.p[0],s.p[2]]:s.p;
const hallSteps=(path,floor)=>path.map(p=>({p,floor,action:'Follow the concourse passage.'}));
export async function pennIngress(platform,stepFree){
 if(platform==='rail'||(platform==='irtP'&&stepFree))return null;
 const entry=entrances.find(e=>e.id===(platform?'gateway':'penn32'));
 const incoming=entranceSteps(entry,stepFree?'elevator':'stairs',false);
 if(!platform)return incoming;
 const id=platform==='irtP'?'boardIrt':stepFree?'elevator':'boardInd';
 if(id==='elevator'){
  const c=stationStairs.find(c=>c.id==='ind-1-L');
  const path=await hallPath('A',xz(incoming.at(-1)),[-110,-96]);
  if(!path)return null;
  const approach=makeSteps(journeys.elevator,stationStairs).slice(0,8).reverse().map((s,i,all)=>({
   ...s,connector:i?all[i-1].connector:undefined,action:'Follow the passage to the elevator.'
  }));
  approach.find((s,i)=>approach[i+1]?.connector===c.id).action='Take the elevator up to the A C E platforms.';
  return [...incoming,...hallSteps(path.slice(1,-1),'A'),...approach];
 }
 const boarding=makeSteps(journeys[id],stationStairs);
 const path=await hallPath('A',xz(incoming.at(-1)),xz(boarding[0]));
 return path?[...incoming,...hallSteps(path.slice(1,-1),'A'),...boarding]:null;
}
export async function pennEgress(steps,stepFree){
 const end=steps.at(-1);
 if(end.floor==='street')return [end];
 let prefix=[end];
 if(end.floor==='irtP'||end.floor==='indP'){
  const source=steps.findIndex(s=>s.floor==='A');
  if(source<0)return null;
  prefix=steps.slice(source).reverse().map((s,i,all)=>({...s,
   connector:i?all[i-1].connector:undefined,action:'Return to the concourse toward the street.'
  }));
  for(let i=1;i<prefix.length;i++){
   const c=stationStairs.find(c=>c.id===prefix[i].connector);
   if(c?.kind==='escalator')for(const j of [i-2,i-1,i,i+1])if(prefix[j]?.p.length===2){
    const shift=prefix[i-1].floor===c.a?2.7:-2.7;
    prefix[j]={...prefix[j],p:[prefix[j].p[0]+shift,prefix[j].p[1]]};
   }
  }
 }
 const start=prefix.at(-1),entry=entrances.find(e=>e.floor===start.floor);
 if(!entry)return null;
 const path=await hallPath(start.floor,xz(start),[entry.door[0],entry.door[2]]);
 if(!path)return null;
 return [...prefix,...hallSteps(path.slice(1,-1),start.floor),...entranceSteps(entry,stepFree?'elevator':'stairs',true)];
}
export function pennRouteLeg(waypoints,registration){
 const project=pennProjection(registration);
 const endpoint=w=>{
  const p=w.p.length===3?w.p:[w.p[0],HEIGHT[w.floor],w.p[1]];
  return {lonlat:project(p),elev:p[1]+registration.street_altitude_m,level:'penn:'+w.floor,name:'Penn Station · '+FLOOR_LABELS[w.floor],short:FLOOR_SHORT[w.floor]};
 };
 const steps=waypoints.slice(1).map((next,i)=>{
  const current=waypoints[i];
  const points=segmentPoints(waypoints,i,stationStairs,f=>HEIGHT[f]-.12);
  const path=points.map((p,j)=>j===0?endpoint(current):j===points.length-1?endpoint(next):
   {...endpoint(next),lonlat:project(p),elev:p[1]+registration.street_altitude_m});
  return {text:current.action||'Continue through Penn Station.',
   kind:stationStairs.find(c=>c.id===next.connector)?.kind||(current.p[1]!==next.p[1]&&current.p.length===3&&next.p.length===3?(current.transport||next.transport||'walk'):'walk'),points:path};
 });
 return {steps,start:endpoint(waypoints[0]),end:endpoint(waypoints.at(-1))};
}

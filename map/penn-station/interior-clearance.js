import {clearOfUpperPassages} from './upper-corridors.js';
import {journeys} from './journeys.js';
import {calibratedAB} from './anchors.js';
export function publicAt(f,x,z){return f.rects.some(r=>x>=r[0]&&x<=r[2]&&-z>=r[1]&&-z<=r[3]);}
export function furnitureClear(f,x,z,w,d){if(f.id==='B'&&!clearOfUpperPassages(x,z,w,d))return false;for(const dx of[-w/2,0,w/2])for(const dz of[-d/2,0,d/2]){if(!publicAt(f,x+dx,z+dz))return false;if(f.walls.some(r=>x+dx>=r[0]-1&&x+dx<=r[2]+1&&-(z+dz)>=r[1]-1&&-(z+dz)<=r[3]+1))return false;}
 for(const j of Object.values(journeys))for(let i=1;i<j.points.length;i++){const a=j.points[i-1],b=j.points[i];if(a[0]!==f.id||b[0]!==f.id)continue;const dx=b[1]-a[1],dz=b[2]-a[2],u=Math.max(0,Math.min(1,((x-a[1])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1)));if(Math.hypot(x-a[1]-u*dx,z-a[2]-u*dz)<Math.hypot(w,d)/2+3)return false;}for(const c of calibratedAB){const v=f.id==='A'?c.from:c.to;if(Math.hypot(x-v[0],z-v[1])<10)return false;}return true;}

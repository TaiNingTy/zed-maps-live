// FEIS 14-9 / 14-10a,b morphology reference, adapted around the design circulation.
// These are NOT surveyed polygon vertices. Boarding edges stay straight;
// street-related side halls, setbacks and end tapers express each station's character.
export function platformRings(p){const x=p.x,h=p.w/2;
 if(p.i===1){const n=p.t==='ind'?-253:-257,s=p.t==='ind'?-29:-24;return[[[x-h+2,n],[x+h-2,n],[x+h,n+9],[x+h,s-9],[x+h-1.7,s],[x-h+1.7,s],[x-h,s-9],[x-h,n+9]]];}
 const side=p.i===0?-1:1,outer=x+side*h,inner=x-side*h;
 const profiles=p.t==='ind'?(p.i===0?[[-266,0],[-249,0],[-242,8],[-218,8],[-218,2],[-170,2],[-170,11],[-146,11],[-140,4],[-122,4],[-122,0],[-74,0],[-74,9],[-48,9],[-48,3],[-25,3],[-18,0]]:[[-261,0],[-246,0],[-246,12],[-224,12],[-216,5],[-176,5],[-176,0],[-166,0],[-166,13],[-139,13],[-134,3],[-78,3],[-78,10],[-48,10],[-43,2],[-22,0]]):(p.i===0?[[-262,0],[-246,0],[-246,7],[-225,7],[-225,1],[-162,1],[-162,6],[-141,6],[-141,0],[-79,0],[-79,12],[-49,12],[-43,2],[-19,0]]:[[-265,0],[-246,0],[-246,12],[-214,12],[-207,4],[-174,4],[-174,0],[-162,0],[-162,15],[-134,15],[-128,4],[-80,4],[-80,9],[-47,9],[-47,2],[-21,0]]);
 return[[[inner,profiles[0][0]],...profiles.map(([z,d])=>[outer+side*d,z]),[inner,profiles.at(-1)[0]]]];
}
export function mezzanineRings(t){const cx=t==='ind'?-174:170,inner=t==='ind'?cx+23:cx-23;const rect=(x0,z0,x1,z1)=>[[x0,z0],[x1,z0],[x1,z1],[x0,z1]];return[
 rect(inner-4,-220,inner+4,-48),rect(cx-4,-216,cx+4,-49),
 ...[[-216,-201],[-182,-157],[-132,-109],[-100,-92],[-74,-49]].map(([z0,z1],i)=>rect(cx-27-(t==='irt'&&i===1?3:0),z0,cx+27+(t==='ind'&&i===2?5:0),z1))];}
// Polygon scanlines, merging overlaps so halls do not create coplanar duplicate slabs.
export function polygonRects(rings,step=.4){const all=rings.flat(),min=Math.min(...all.map(p=>p[1])),max=Math.max(...all.map(p=>p[1]));const out=[];for(let z=min;z<max;z+=step){const end=Math.min(z+step,max),mid=(z+end)/2,spans=[];for(const r of rings){const xs=[];for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[j],b=r[i];if((a[1]>mid)!==(b[1]>mid))xs.push(a[0]+(mid-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)spans.push([xs[i],xs[i+1]]);}spans.sort((a,b)=>a[0]-b[0]);const merged=[];for(const q of spans){const last=merged.at(-1);if(last&&q[0]<=last[1]+1e-6)last[1]=Math.max(last[1],q[1]);else merged.push([...q]);}for(const [a,b]of merged)out.push([a,-end,b,-z]);}return out;}
export function contains(rings,x,z){return rings.some(r=>{let yes=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;});}

import {entranceHoles} from './entrance-data.js';
// Exterior-only assembly. All coordinates fit the frozen interior registration.
// Dimensions / portal coordinates remain schematic except explicitly cited anchors.
import * as T from 'three';
export const exteriorFacts={msgDiameter:425*.3048,bustleLength:430*.3048,msgHeight:46,penn2Height:125,frame:'Frozen interior pixel frame, not geodetic survey'};
export const portals=[
{id:'penn32',name:'Penn · 7 Av / 32 St',p:[147,0],kind:'station',note:'2023 Amtrak：Glass canopy, three escalators, wide stairs and accessible elevator. Entrance identity confirmed; model thresholds and underground connections unverified.',source:'https://media.amtrak.com/2023/11/amtrak-and-vornado-realty-trust-transform-7th-avenue-and-32nd-street-new-york-penn-station-ada-entrance/'},
{id:'gateway',name:'East End Gateway · 33 St',p:[148,-104],kind:'station',note:'SOMProject description: glass-and-steel East End Gateway on Seventh Avenue. Simplified form; precise landing unverified.',source:'https://www.som.com/projects/long-island-rail-road-penn-station-east-end-gateway/'},
{id:'west33',name:'Penn · 8 Av / 33 St',p:[-137,-84],kind:'station',note:'Approximate west street interface; no claim that either concourse has a verified entrance route here.',source:'https://moynihantrainhall.nyc/visit/getting-here/'},
{id:'west31',name:'Penn · 8 Av / 31 St',p:[-137,84],kind:'station',note:'West entrance area is schematic; door count, exact position and interior landing unverified.',source:'https://moynihantrainhall.nyc/visit/getting-here/'},
{id:'moy33',name:'Moynihan · 8 Av / 33 St',p:[-196,-84],kind:'moy',note:'The operator confirms the Eighth Avenue / 33rd Street corner entrance. Model coordinates are approximate.',source:'https://moynihantrainhall.nyc/about/faq/'},
{id:'moy31',name:'Moynihan · 8 Av / 31 St',p:[-196,84],kind:'moy',note:'The operator confirms the Eighth Avenue / 31st Street corner entrance.',source:'https://moynihantrainhall.nyc/about/faq/'},
{id:'moymid33',name:'Moynihan · 33 St',p:[-300,-96],kind:'moy',note:'33Street midblock entrance; not the Farley Eighth Avenue monumental stairs.',source:'https://moynihantrainhall.nyc/visit/getting-here/'},
{id:'moymid31',name:'Moynihan · 31 St',p:[-300,96],kind:'moy',note:'31Street midblock entrance recommended by the operator for Amtrak passengers and taxis.',source:'https://moynihantrainhall.nyc/visit/getting-here/'}
];
export function createExterior(){
 const root=new T.Group(),shell=new T.Group(),ground=new T.Group(),markers=new T.Group();root.add(ground,shell,markers);const labels=[];const mats=new Map();
 const material=(c)=>{if(!mats.has(c))mats.set(c,new T.MeshStandardMaterial({color:c,roughness:.74,metalness:c==='#7897a8'?.24:.05}));return mats.get(c)};
 function box(g,x,y,z,w,h,d,c,split=true){if(g===ground&&y+h<1&&split){let rects=[[x-w/2,z-d/2,x+w/2,z+d/2]];for(const q of entranceHoles)rects=rects.flatMap(r=>{const a=Math.max(r[0],q[0]),b=Math.max(r[1],q[1]),c=Math.min(r[2],q[2]),d=Math.min(r[3],q[3]);return a>=c||b>=d?[r]:[[r[0],r[1],a,r[3]],[c,r[1],r[2],r[3]],[a,r[1],c,b],[a,d,c,r[3]]].filter(r=>r[2]>r[0]&&r[3]>r[1]);});for(const r of rects)box(g,(r[0]+r[2])/2,y,(r[1]+r[3])/2,r[2]-r[0],h,r[3]-r[1],c,false);return;}const m=new T.Mesh(new T.BoxGeometry(w,h,d),material(c));m.position.set(x,y+h/2,z);g.add(m);return m;}
 function cylinder(g,x,y,z,r,h,c,segments=64){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,segments),material(c));m.position.set(x,y+h/2,z);g.add(m);return m;}
 function beam(g,a,b,r,c){const av=new T.Vector3(...a),bv=new T.Vector3(...b);const m=new T.Mesh(new T.CylinderGeometry(r,r,av.distanceTo(bv),6),material(c));m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());g.add(m);}
 const tag=(text,p,portal=null)=>labels.push({text,p,portal});
 // Ground occupies an independent layer. None of the frozen slabs are edited.
 box(ground,-125,-.6,-40,690,.5,430,'#292d30');
 box(ground,-166,-.09,-50,35,.06,410,'#40464b');box(ground,173,-.09,-50,36,.06,410,'#40464b');
 for(const z of[-120,120,-215])box(ground,-125,-.09,z,690,.06,20,'#40464b');
 box(ground,265,-.09,0,145,.06,18,'#40464b');
 box(ground,0,0,0,280,.3,200,'#a9a8a1');box(ground,-300,0,0,230,.3,200,'#a9a8a1');
 box(ground,-10,.04,-113,290,.3,18,'#b5b1a4'); // pedestrian plaza, not vehicular cross-street
 for(const x of[-166,173])for(const z of[-120,120])for(let k=-5;k<=5;k++)box(ground,x+k*2.7,.04,z,1.3,.04,9,'#bbc0be');
 for(const x of[-166,173])for(let z=-245;z<155;z+=14){if(Math.abs(Math.abs(z)-120)>12)box(ground,x,.015,z,.35,.03,6,'#c5bb91');}
 for(let x=-110;x<110;x+=25){box(ground,x,.35,-113,7,.7,3,'#757a72');cylinder(ground,x,1.05,-113,2.3,3.7,'#64856b',8);box(ground,x+8,.35,-113,4,.5,1.3,'#8f7758');}
 tag('Plaza33 · Pedestrian space',[-20,2,-116]);tag('8th Avenue',[-166,1,135]);tag('7th Avenue',[173,1,135]);tag('W 31st Street',[-25,1,125]);
 // MSG: sourced diameter; elevation and stepped podium are morphology assumptions.
 const r=exteriorFacts.msgDiameter/2,cx=-55;
 box(shell,cx,.3,0,168,8,174,'#565c62');box(shell,cx,8.3,0,150,4,156,'#70767c');
 cylinder(shell,cx,12.3,0,r,31,'#c3b8a5');cylinder(shell,cx,43.3,0,r+.8,2.2,'#ded8c9');cylinder(shell,cx,45.5,0,r-1.4,.8,'#838b90');
 for(let i=0;i<96;i++){const a=i*Math.PI/48;const m=box(shell,cx+Math.cos(a)*(r+.15),13,Math.sin(a)*(r+.15),.65,29,1.2,'#e0d8c7');m.rotation.y=-a;}
 for(let i=0;i<32;i++){const a=i*Math.PI/16;beam(shell,[cx,46.35,0],[cx+(r-2)*Math.cos(a),46.35,(r-2)*Math.sin(a)],.12,'#b8bec1');}
 for(const z of[-81,81])for(const x of[-110,-15]){box(shell,x,.3,z,19,8.5,8,'#7897a8');box(shell,x,8.8,z,21,.45,10,'#b9b7ac');}
 tag('Madison Square Garden',[-55,52,0]);
 // PENN 2 tower and the suspended two-storey Bustle. No tenant interiors invented.
 box(shell,87,.3,0,61,15,118,'#607883');box(shell,87,15.3,0,61,109.7,118,'#7897a8');
 for(let y=18;y<125;y+=3.7){box(shell,87,y,0,62,.24,119,'#c5d5db');}
 for(let z=-58;z<=58;z+=5.8)for(const x of[56.3,117.7])box(shell,x,16,z,.35,109,.35,'#b7cbd3');
 for(let x=58;x<117;x+=5.8)for(const z of[-59.6,59.6])box(shell,x,16,z,.35,109,.35,'#b7cbd3');
 const L=exteriorFacts.bustleLength;
 box(shell,130,15.24,0,30,14,L,'#7897a8');for(const y of[15.24,22.2,29.24])box(shell,130,y,0,31,.5,L+1,'#d2d9d9');
 for(let z=-L/2+4;z<L/2;z+=10){beam(shell,[147,.3,z-4],[143,15.24,z],.55,'#d6d4c9');beam(shell,[139,.3,z+4],[143,15.24,z],.55,'#d6d4c9');box(shell,145.3,15.7,z,.3,13,.4,'#c7d4d8');}
 box(shell,130,29.8,0,28,.4,L-2,'#6d8d73');for(let z=-55;z<60;z+=12)cylinder(shell,138,30.2,z,1.8,2.8,'#78966d',8);
 box(shell,87,125.2,0,59,.5,116,'#7b9375');box(shell,87,125.7,-30,36,5,30,'#8a959a');
 for(let z=-56;z<=56;z+=7)for(const x of[57,117])box(shell,x,125.7,z,.45,6,.45,'#d2d9d9');
 tag('PENN 2',[87,137,0]);
 // Farley / Moynihan context: limestone perimeter, colonnade and four vaulted skylights.
 const stone='#c9bea8';box(shell,-300,.3,-79,220,25,26,stone);box(shell,-300,.3,79,220,25,26,stone);box(shell,-397,.3,0,26,25,132,stone);box(shell,-203,.3,0,26,25,132,stone);
 for(let z=-59;z<=59;z+=5.4){cylinder(shell,-185,4,z,.75,14,'#e0d6bf',10);box(shell,-185,18,z,2,1,2,'#e0d6bf');}
 box(shell,-187,19.1,0,11,3,130,'#d7cbb1');
 for(let i=0;i<9;i++)box(shell,-179-i*.9,.3+i*.38,0,1.1,.38,124,'#bfb59f');
 for(const z of[-93,93])for(let x=-400;x<=-200;x+=10)box(shell,x,7,z,3,8,.3,'#697c83');
 for(const z of[-78,78])box(shell,-300,25.3,z,222,1.2,27,'#9b9d8b');
 box(shell,-300,22,0,172,.5,125,'#697b80');
 for(const x of[-363,-321,-279,-237]){
  const points=[],indices=[];for(let j=0;j<=20;j++){const a=j*Math.PI/20;for(const z of[-57,57])points.push(x+17*Math.cos(a),25+8*Math.sin(a),z);}for(let j=0;j<20;j++){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();const m=new T.Mesh(g,material('#8eafba'));m.material.side=T.DoubleSide;shell.add(m);for(let z=-57;z<=57;z+=19)for(let j=1;j<=20;j++){const a=(j-1)*Math.PI/20,b=j*Math.PI/20;beam(shell,[x+17*Math.cos(a),25+8*Math.sin(a),z],[x+17*Math.cos(b),25+8*Math.sin(b),z],.12,'#c7d4d7');}}
 tag('Farley / Moynihan',[-300,41,0]);
 // A glass fan canopy at 32nd; triangulation is a shape reconstruction, not fabrication geometry.
 const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute([134,5,-12,158,5,-12,158,5,12,134,5,12,143,10,0],3));canopy.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);canopy.computeVertexNormals();const cm=new T.Mesh(canopy,material('#9fc2d0'));cm.material.side=T.DoubleSide;shell.add(cm);for(const v of[[134,5,-12],[158,5,-12],[158,5,12],[134,5,12]])beam(shell,v,[143,10,0],.18,'#e1e7e5');
 for(const z of[-12,12])beam(shell,[149,.3,z],[149,5,z],.22,'#d5dbd8');
 // East End Gateway inclined glass headhouse.
 const gateway=box(shell,144,7,-102,18,.5,22,'#9fc2d0');gateway.rotation.x=-.35;for(const x of[136,152]){beam(shell,[x,.3,-111],[x,10.8,-91],.2,'#d9e5e6');beam(shell,[x,.3,-113],[x,3.2,-113],.2,'#d9e5e6');}beam(shell,[135,10.8,-91],[153,10.8,-91],.2,'#d9e5e6');
 for(const p of portals){cylinder(markers,p.p[0],.35,p.p[1],2.1,.25,p.kind==='moy'?'#63b3a8':'#f0bc70',16);tag(p.name,[p.p[0],4,p.p[1]],p.id);}
 // Consolidate repeated boxes by material into instanced draws; curved meshes remain separate.
 for(const group of[shell,ground,markers]){const bins=new Map();for(const m of [...group.children])if(m.isMesh&&m.geometry.type==='BoxGeometry'){m.updateMatrix();const key=m.material; if(!bins.has(key))bins.set(key,[]);bins.get(key).push(m);}for(const [material,items]of bins){const inst=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material,items.length);items.forEach((m,i)=>{const p=m.geometry.parameters;inst.setMatrixAt(i,m.matrix.clone().multiply(new T.Matrix4().makeScale(p.width,p.height,p.depth)));group.remove(m);m.geometry.dispose();});group.add(inst);}}
 root.visible=false;
 function setMode(mode,evidence=false){root.visible=mode!=='off';ground.visible=mode==='solid';markers.visible=mode!=='off';root.traverse(o=>{if(!o.isMesh)return;if(!o.userData.originalMaterial)o.userData.originalMaterial=o.material;const base=o.userData.originalMaterial;if(!o.userData.displayMaterial)o.userData.displayMaterial=base.clone();o.material=o.userData.displayMaterial;o.material.color.set(evidence?'#f0a457':base.color);o.material.transparent=mode==='xray';o.material.opacity=mode==='xray'?.12:1;o.material.depthWrite=mode!=='xray';o.material.needsUpdate=true;});}
 return{root,labels,setMode};
}

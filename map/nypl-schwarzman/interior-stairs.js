import { floorY, floorHeights, gallerySpine } from "./datums.js";
import * as T from "three";

export function historicStairs(first,second,third,box,floor,{stone,trim,publicFloor}){
  const bronze=new T.MeshStandardMaterial({color:0x694a32,roughness:.62});
  const marble=new T.MeshStandardMaterial({color:0xd2c5b3,roughness:.78,side:T.DoubleSide});
  function beam(parent,material,a,b,width,depth){
    const from=new T.Vector3(...a), to=new T.Vector3(...b);
    const mesh=new T.Mesh(new T.BoxGeometry(width,from.distanceTo(to),depth),material);
    mesh.position.copy(from).lerp(to,.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());
    parent.add(mesh);
  }
  function guard(parent,length,rise){
    const panel=new T.Shape();
    panel.moveTo(0,.10);panel.lineTo(length,rise+.10);
    panel.lineTo(length,rise+.89);panel.lineTo(0,.89);panel.closePath();
    const count=Math.floor(length/.38);
    for(let i=0;i<count;i++){
      const u=(i+.5)*length/count, y=u*rise/length;
      const hole=new T.Path();
      hole.absellipse(u,y+.51,.085,.25,0,Math.PI*2,true);
      panel.holes.push(hole);
    }
    return new T.Mesh(new T.ExtrudeGeometry(panel,{depth:.14,bevelEnabled:false,curveSegments:10}),marble);
  }
  function rail(parent,x,z,y,length,rise,rotation){
    const railGroup=new T.Group();
    railGroup.position.set(x,y,z);
    railGroup.rotation.y=rotation;
    parent.add(railGroup);
    railGroup.add(guard(railGroup,length,rise));
    beam(railGroup,trim,[0,.95,.07],[length,rise+.95,.07],.15,.26);
    for(const [u,h] of [[0,0],[length,rise]]) box(railGroup,stone,u,h+.49,.07,.18,.98,.24);
  }
  function flight(parent,name,x,z,y,dx,dz,rise,span,flying=false){
    const length=Math.hypot(dx,dz), rotation=Math.atan2(-dz,dx);
    const group=new T.Group();
    group.name=name;
    group.position.set(x,y,z);
    group.rotation.y=rotation;
    parent.add(group);
    const count=Math.ceil(rise/.17), tread=length/count;
    for(let i=0;i<count;i++){
      const top=rise*(i+1)/count, riser=rise/count;
      box(group,marble,(i+.5)*tread,top-(riser+.12)/2,0,tread+.006,riser+.12,span);
      box(group,trim,i*tread+.02,top-.035,0,.055,.07,span+.025);
    }
    // The curved soffit leaves a clear opening beneath the flying flight.
    const soffit=new T.Shape();
    soffit.moveTo(0,-.26);soffit.lineTo(length,rise-.12);
    for(let i=24;i>=0;i--){
      const t=i/24;
      soffit.lineTo(t*length,t*rise-(flying?.91:.40)+(flying?.59:.08)*Math.sin(Math.PI*t));
    }
    soffit.closePath();
    const support=new T.Mesh(new T.ExtrudeGeometry(soffit,{depth:span-.03,bevelEnabled:false}),marble);
    support.position.z=-span/2+.015;
    group.add(support);
    for(const side of [-1,1]) rail(group,0,side*(span/2-.13),0,length,rise,0);
    beam(group,bronze,[0,.91,0],[length,rise+.91,0],.068,.075);
    for(let i=0;i<=Math.ceil(length/1.15);i++){
      const t=i/Math.ceil(length/1.15);
      box(group,bronze,length*t,rise*t+.45,0,.042,.91,.042);
    }
  }

  for(const side of [-1,1]){
    const name=side===1?"South":"North";
    // A low landing turns west. At the next story the approach continues
    // over a short rise before turning back toward the Rotunda.
    flight(first,name+" stair · Astor Hall approach",36,side*11,0,0,side*5.4,1.8,3.4);
    floor(first,publicFloor,35.95,side*18.1,3.9,3.4,1.8);
    flight(first,name+" stair · flying flight",34,side*18.1,1.8,-7,0,floorY.second-floorY.first-1.8,3.4,true);
    floor(second,publicFloor,25.7,side*18.1,2.6,3.4);
    floor(second,publicFloor,27,side*21.1,3,2.6);

    floor(second,publicFloor,23.9,side*18.1,1,3.4);
    flight(second,name+" stair · corridor rise",23.4,side*18.1,0,-2.4,0,.9,3.4);
    floor(second,publicFloor,19.3,side*18.1,3.4,3.4,.9);
    flight(second,name+" stair · Rotunda flight",19.3,side*16.4,.9,0,-side*5.4,floorY.third-floorY.second-.9,3.4,true);

    rail(first,34,side*19.73,1.8,3.9,0,0);
    rail(second,24.4,side*16.46,0,2.6,0,0);
    rail(second,20.9,side*19.73,.9,3.2,0,Math.PI);
    rail(second,17.68,side*19.73,.9,3.24,0,side*Math.PI/2);

    // Shallow stone reveals and a suspended lantern articulate the stair bay.
    box(first,stone,38.05,2.65,side*18.1,.36,5.3,3.6);
    const bracket=new T.Mesh(new T.RingGeometry(1.36,1.58,24,1,0,Math.PI),marble);
    bracket.rotation.y=Math.PI/2;
    bracket.position.set(37.85,3.5,side*18.1);
    first.add(bracket);
    box(first,bronze,35.8,6.33,side*18.1,.05,2.12,.05);
    const cage=new T.Mesh(new T.CylinderGeometry(.37,.43,.76,10,1,true),bronze);
    cage.position.set(35.8,5.0,side*18.1);
    // The lantern reads as an open cage rather than a solid drum.
    const rings=new T.EdgesGeometry(cage.geometry);
    const frame=new T.LineSegments(rings,new T.LineBasicMaterial({color:0x705136}));
    frame.position.copy(cage.position);
    first.add(frame);
  }
}

// Mecanoo / BBB floor plans, callout 3, and their built stair photograph.
export function southCore(ground,first,second,third,box,floor,{stone,trim,publicFloor}){
  const bronze=new T.MeshStandardMaterial({color:0x58433a,roughness:.55});
  const handrail=new T.MeshStandardMaterial({color:0xa48050,roughness:.45});
  const terrazzo=new T.MeshStandardMaterial({color:0xd8d3c8,roughness:.88});
  const marble=new T.MeshStandardMaterial({color:0x526d60,roughness:.68});
  const decks=[ground,first,second,third], heights=floorHeights;
  const west=11.8,east=16.1,z=42.7,outer=1.62;
  function panel(group,a,b,z0,low,high){
    const length=Math.abs(b-a), rise=high-low;
    const profile=new T.Shape();
    profile.moveTo(0,-.21); profile.lineTo(length,rise-.21);
    profile.lineTo(length,rise+1.03); profile.lineTo(0,1.03); profile.closePath();
    const panel=new T.Mesh(new T.ExtrudeGeometry(profile,{depth:.085,bevelEnabled:false}),bronze);
    panel.position.set(a,low,z0+(b<a?.085:0));
    if(b<a) panel.rotation.y=Math.PI;
    group.add(panel);
    const rail=new T.Mesh(new T.BoxGeometry(Math.hypot(length,rise),.046,.048),handrail);
    rail.position.set((a+b)/2,(low+high)/2+.93,z0+.042);
    rail.rotation.z=Math.atan2(rise,b-a);
    group.add(rail);
  }
  for(let i=0;i<3;i++){
    const half=(heights[i+1]-heights[i])/2;
    const count=Math.ceil(half/.173);
    const group=new T.Group();
    group.name="40th Street stair · "+["G–1","1–2","2–3"][i];
    decks[i].add(group);
    for(const [a,b,lane,base] of [[west,east,-.79,0],[east,west,.79,half]]){
      for(let step=0;step<count;step++){
        const top=base+half*(step+1)/count;
        box(group,terrazzo,a+(b-a)*(step+.5)/count,top-.15,z+lane,Math.abs(b-a)/count+.004,.30,1.55);
      }
      panel(group,a,b,z+lane-.78,base,base+half);
      panel(group,a,b,z+lane+.72,base,base+half);
    }
    floor(group,terrazzo,east+.75,z,1.5,2*outer,half);
    panel(group,east,east+1.5,z-outer,half,half);
    panel(group,east,east+1.5,z+outer-.085,half,half);
    box(group,bronze,east+1.46,half+.42,z,.085,1.22,2*outer);
  }
  for(let i=0;i<4;i++){
    const deck=decks[i];
    if(i) floor(deck,terrazzo,10.5,z,2.6,2*outer).name="South core · stair and elevator landing";
    const turn=i===3?-1:1;
    const corridorEdge=[0,21,gallerySpine.west,gallerySpine.west][i];
    if(i){
      floor(deck,publicFloor,10.5,z+turn*2.36,2.6,1.48);
      floor(deck,publicFloor,(west+corridorEdge)/2,z+turn*2.36,corridorEdge-west,1.48);
      panel(deck,west,17.6,z+turn*outer-.04,0,0);
      box(deck,bronze,17.56,.5,z,.08,1,2*outer);

    }
    // Pair of lift doors in a continuous green marble lobby wall.
    box(deck,marble,9.16,1.5,z-1.55,.18,3,.24);
    box(deck,marble,9.16,1.5,z,.18,3,.46);
    box(deck,marble,9.16,1.5,z+1.55,.18,3,.24);
    box(deck,marble,9.16,2.65,z,.18,.7,3.34);
    for(const offset of [-.88,.88]) box(deck,bronze,9.19,1.15,z+offset,.12,2.3,1.28);
  }
  // Ground-floor connector between the 40th Street lobby and the core.
  box(ground,terrazzo,10.5,.012,50.87,2.6,.024,13.1);
}

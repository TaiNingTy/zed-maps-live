import { clockCrest, stoneRail } from "./architectural-details.js";
import * as T from "three";
import { plateGeo } from "../floorkit.js";

// NYC Building Footprints, BIN 1035381, projected into the terminal study's metre frame.
const outline = [
  [82.36,-56.53],[82.19,10.02],[79.8,10.02],[79.74,30.29],
  [-6,30],[-5.94,10.01],[-9.04,10],[-8.84,-56.84]
];
const [eastFront, westFront] = outline.slice(3,5);
const width = Math.hypot(eastFront[0]-westFront[0],eastFront[1]-westFront[1]);
const angle = Math.atan2(eastFront[1]-westFront[1],eastFront[0]-westFront[0]);
export const terminalBearing = -29.035*Math.PI/180;
export const entrance = {
  x:(eastFront[0]+westFront[0])/2,
  z:(eastFront[1]+westFront[1])/2,
  y:1.2,
  width:7
};
const limestone=0xc9b99e, trim=0xdfd0b5, recess=0x514f48, glass=0x6d8890, copper=0x587264;

export function buildExterior({facade:group,roof,viaduct}, {box, mesh, material, eastPassages, westBiltmoreOpening}) {
  function archWindow(parent, x, z, base, width, upright, color, endWall = false) {
    const shape = new T.Shape();
    shape.moveTo(-width/2,0);
    shape.lineTo(width/2,0);
    shape.lineTo(width/2,upright);
    shape.absarc(0,upright,width/2,0,Math.PI,false);
    shape.closePath();
    const pane = mesh(parent,new T.ShapeGeometry(shape),color,x,base,z);
    if (endWall) pane.rotation.y=Math.PI/2;
    for (let i=-3;i<=3;i++) {
      const offset=i*width/8;
      const height=upright+Math.sqrt((width/2)**2-offset**2);
      box(parent,x+(endWall?0:offset),base+height/2,z+(endWall?offset:0),endWall?.22:.12,height,endWall?.12:.22,0x54534e);
    }
    for (let y=2;y<upright;y+=2) box(parent,x,base+y,z,endWall?.23:width,.09,endWall?width:.23,0x54534e);
  }
  const front=new T.Group();
  front.position.set(entrance.x,entrance.y,entrance.z);
  front.rotation.y=-angle;
  group.add(front);
  const localBox=(x,y,z,w,h,d,color)=>box(front,x,y,z,w,h,d,color);
  const doorHalf=entrance.width/2;
  for(const side of [-1,1]) {
    const wing=(width-entrance.width)/2;
    localBox(side*(doorHalf+wing/2),2.6,-.46,wing,5.2,.92,limestone);
  }
  localBox(0,5.66,-.46,width,.94,.92,trim);
  const wall=new T.Shape([[-18.2,6.15],[18.2,6.15],[18.2,24],[-18.2,24]].map(([x,y])=>new T.Vector2(x,y)));
  const arch={radius:4.05, spring:18.5, base:8.1, trimWidth:.32};
  const {radius,spring,base,trimWidth}=arch;
  const band=new T.Shape();
  band.absarc(0,spring,radius+trimWidth,0,Math.PI,false);
  band.lineTo(-radius,spring);
  band.absarc(0,spring,radius,Math.PI,0,true);
  band.closePath();
  const archRing=new T.ExtrudeGeometry(band,{depth:.52,curveSegments:24,bevelEnabled:false});
  for(const x of [-12.25,0,12.25]) {
    const opening=new T.Path();
    opening.moveTo(x-radius,base);
    opening.lineTo(x+radius,base);
    opening.lineTo(x+radius,spring);
    opening.absarc(x,spring,radius,0,Math.PI,false);
    opening.closePath();
    wall.holes.push(opening);
    archWindow(front,x,-.66,base,2*radius,spring-base,glass);
    localBox(x,base-.12,.12,2*(radius+trimWidth),.24,.78,trim);
    for(const side of [-1,1]) {
      localBox(x+side*(radius+trimWidth/2),(base+spring)/2,.06,trimWidth,spring-base,.52,trim);
    }
    mesh(front,archRing,trim,x,0,-.20);
    localBox(x,spring+radius+trimWidth/2,.24,.46,.53,.44,trim);
  }
  mesh(front,new T.ExtrudeGeometry(wall,{depth:.82,bevelEnabled:false}),limestone,0,0,-.92);
  const shaftProfile=Array.from({length:96},(_,i)=>{
    const angle=2*Math.PI*i/96, radius=i%6===0?.51:i%6===1||i%6===5?.565:.61;
    return new T.Vector2(radius*Math.cos(angle),radius*Math.sin(angle));
  });
  const shaft=new T.ExtrudeGeometry(new T.Shape(shaftProfile),{depth:14.8,bevelEnabled:false});
  shaft.rotateX(-Math.PI/2);
  for(const x of [-17.3,-7.3,-4.95,4.95,7.3,17.3]) {
    localBox(x,6.58,.32,1.38,.55,1.55,trim);
    localBox(x,6.98,.38,1.34,.3,1.28,limestone);
    mesh(front,shaft,limestone,x,7.08,.42);
    localBox(x,21.95,.41,1.22,.33,1.35,trim);
    localBox(x,22.3,.41,1.39,.38,1.55,trim);
    localBox(x,22.77,.41,1.48,.56,1.68,trim);
  }
  // Solid facade between wings, cornices and the lower roof edge.
  const wingWidth=width/2-18.2;
  for(const side of [-1,1]) {
    const cx=side*(18.2+wingWidth/2);
    const wing=new T.Shape([[-wingWidth/2,6],[wingWidth/2,6],[wingWidth/2,23.98],[-wingWidth/2,23.98]]
      .map(([x,y])=>new T.Vector2(x,y)));
    for(let i=0;i<4;i++) for(const y of [9,14,19]) {
      const x=side*(21.8+i*5.1);
      const u=x-cx;
      wing.holes.push(new T.Path([[u-1.13,y-1.38],[u-1.13,y+1.38],[u+1.13,y+1.38],[u+1.13,y-1.38]]
        .map(([a,b])=>new T.Vector2(a,b))));
      localBox(x,y,-.73,2.28,2.79,.07,glass);
      localBox(x,y,-.58,.08,2.74,.11,recess);
      localBox(x,y-.02,-.58,2.24,.075,.11,recess);
      localBox(x,y-1.49,.16,2.8,.21,.76,trim);
      localBox(x,y+1.49,.14,2.66,.22,.63,trim);
      for(const sign of [-1,1]) localBox(x+sign*1.23,y,.08,.2,2.78,.54,trim);
    }
    mesh(front,new T.ExtrudeGeometry(wing,{depth:1.02,bevelEnabled:false}),limestone,cx,0,-1.02);
  }
  localBox(0,24.87,-.46,width,1.9,.92,limestone);
  localBox(0,26.05,-.58,width,.42,1.16,trim);
  for(const x of [-34.4,34.4]) {
    const pediment=new T.Shape();
    pediment.moveTo(-2.8,0);
    pediment.quadraticCurveTo(0,3.5,2.8,0);
    pediment.closePath();
    mesh(front,new T.ExtrudeGeometry(pediment,{depth:.55,bevelEnabled:false}),limestone,x,26,-.69);
  }
  for(const x of [-6.125,6.125]) {
    const oval=mesh(front,new T.CylinderGeometry(1,1,.11,24),recess,x,17.8,.09);
    oval.rotation.x=Math.PI/2;
    oval.scale.set(.54,1,1.27);
    const pane=mesh(front,new T.CylinderGeometry(1,1,.075,24),glass,x,17.8,.17);
    pane.rotation.x=Math.PI/2;
    pane.scale.set(.47,1,1.05);
    localBox(x,17.8,.25,.08,2.06,.09,recess);
    localBox(x,17.8,.25,.91,.07,.09,recess);
  }
  for(const y of [6.35,23.3,24]) localBox(0,y,.04,width+(y===24?.45:0),.52,1.48,trim);
  localBox(0,25.1,-.25,39,1.8,1.65,limestone);
  localBox(0,26.26,-.04,40,.54,1.9,trim);
  const clock=(radius,depth,color,y,z)=>{
    const face=mesh(front,new T.CylinderGeometry(radius,radius,depth,36),color,0,y,z);
    face.rotation.x=Math.PI/2;
  };
  clock(2.15,.72,limestone,27.65,.08);
  clock(1.5,.13,0xdac6a0,27.65,.52);
  clock(1.26,.08,0xe8dfcd,27.65,.62);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    localBox(Math.sin(a)*1.05,27.65+Math.cos(a)*1.05,.676,.065,.065,.045,recess);
  }
  const hand=localBox(.22,27.9,.68,.06,.74,.055,recess);
  hand.rotation.z=-.76;
  localBox(0,27.42,.68,.085,.68,.055,recess);
  clockCrest(front,material,trim);
  // Layered coping and recessed panels flank the clock crest.
  for(const side of [-1,1]) {
    localBox(side*13.9,25.4,.32,7.8,.84,.38,trim);
    localBox(side*13.9,25.4,.527,6.95,.4,.08,limestone);
    localBox(side*13.9,26.04,.34,8,.18,.55,trim);
  }
  const dentils = new T.InstancedMesh(new T.BoxGeometry(.34,.28,.33),material(trim),68);
  for(let i=0;i<68;i++) dentils.setMatrixAt(i,new T.Matrix4().makeTranslation((i-33.5)*1.21,23.02,.64));
  front.add(dentils);
  const ring = outline.map(([x,z])=>[x,-z]);
  const roofOpening = [[-2.98,-37.98],[81.98,-37.98],[81.98,.98],[-2.98,.98]];
  const roofRing=roofOpening.map(([x,z])=>[x,-z]);
  mesh(group,plateGeo([ring],.55,[roofRing]),limestone,0,25.2,0);
  for(let i=0;i<outline.length;i++) {
    if(i===3) continue;
    const [x0,z0]=outline[i], [x1,z1]=outline[(i+1)%outline.length];
    const length=Math.hypot(x1-x0,z1-z0);
    const side=new T.Group();
    side.position.set((x0+x1)/2,0,(z0+z1)/2);
    side.rotation.y=-Math.atan2(z1-z0,x1-x0);
    group.add(side);
    const sideWall=new T.Shape([[-length/2,4.59],[length/2,4.59],[length/2,25.23],[-length/2,25.23]]
      .map(([x,y])=>new T.Vector2(x,y)));
    // Cut the thresholds from the interior plan in the same coordinate frame.
    const openings=i===0?eastPassages.map(p=>p.opening):i===6?[westBiltmoreOpening]:[];
    const portals=openings.map(opening=>opening.map(z=>
      (z-(z0+z1)/2)*length/(z1-z0)).sort((a,b)=>a-b));
    let left=-length/2;
    for(const [right,next] of [...portals,[length/2,length/2]]) {
      if(right>left) box(side,(right+left)/2,2.295,0,right-left,4.59,.72,limestone);
      left=next;
    }
    for(const y of [5.4,21.8,24.9]) box(side,0,y,0,length+.05,.42,1.05,trim);
    const bays=Math.floor(length/7);
    for(let j=0;j<bays;j++) {
      const x=((j+.5)/bays-.5)*length;
      for(const y of [9.3,14,18.65]) {
        sideWall.holes.push(new T.Path([[x-1.04,y-1.4],[x-1.04,y+1.4],[x+1.04,y+1.4],[x+1.04,y-1.4]]
          .map(([a,b])=>new T.Vector2(a,b))));
        box(side,x,y,0,2.11,2.83,.07,glass);
        box(side,x,y,-.09,.075,2.8,.1,recess);
        box(side,x,y-.02,-.09,2.08,.075,.1,recess);
        box(side,x,y-1.52,-.38,2.48,.24,.59,trim);
        box(side,x,y+1.53,-.39,2.34,.22,.44,trim);
        for(const sign of [-1,1]) box(side,x+sign*1.15,y,-.41,.23,2.82,.36,trim);
      }
    }
    mesh(side,new T.ExtrudeGeometry(sideWall,{depth:.72,bevelEnabled:false}),limestone,0,0,-.36);
  }
  // Stone corner returns cover the wall joints at changes of bearing.
  for(const [x,z] of outline) {
    box(group,x,13.05,z,.82,25.4,.82,limestone);
    for(const y of [5.4,21.8,24.9]) box(group,x,y,z,1.12,.42,1.12,trim);
  }
  // Terminal design guidelines, p. 11: pitched roof above the independent sky ceiling.
  const eave=36, ridge=entrance.y+45.8, middle=-18.5;
  const roofVertices=[
    -3,eave,1,82,eave,1, -3,ridge,middle,82,ridge,middle,
    -3,eave,-38,82,eave,-38
  ];
  const roofGeometry=new T.BufferGeometry();
  roofGeometry.setAttribute("position",new T.Float32BufferAttribute(roofVertices,3));
  roofGeometry.setIndex([0,1,2,1,3,2,2,3,4,3,5,4]);
  roofGeometry.computeVertexNormals();
  mesh(roof,roofGeometry,copper);
  for(const z of [1,-38]) {
    box(roof,39.5,(25.75+eave)/2,z,85,eave-25.75,.65,limestone);
    box(roof,39.5,eave-.4,z,85,.48,1.1,trim);
    for(const x of [12,26,40,54,68]) archWindow(roof,x,z+(z===1?.35:-.35),28.4,6.2,2.5,glass);
  }
  const gable=new T.Shape([[-19.5,0],[19.5,0],[19.5,eave-25.75],[0,ridge-25.75],[-19.5,eave-25.75]]
    .map(([x,y])=>new T.Vector2(x,y)));
  for(const x of [-3,82]) mesh(roof,new T.ShapeGeometry(gable),limestone,x,25.75,middle).rotation.y=Math.PI/2;
  box(roof,39.5,ridge-.3,middle,45,.65,1.2,0x69838a);
  // Copper seams follow the roof pitch from ridge to eave.
  for(let x=-2;x<82;x+=2.1) for(const z of [1,-38]) {
    const a=new T.Vector3(x,eave+.035,z),b=new T.Vector3(x,ridge+.035,middle);
    const mid=a.clone().lerp(b,.5),delta=b.clone().sub(a);
    const seam=box(roof,mid.x,mid.y,mid.z,.055,.045,delta.length(),0x678477);
    seam.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());
  }

  // The central roadway crosses above the entrance. These are local approach segments.
  const deckY=7.95, cx=entrance.x, cz=entrance.z;
  for(const [x,z,w,d] of [[cx,cz+20,13,37],[37,cz+2.5,102,6],[-10.5,-13,6,86],[85,-13,6,86]]) {
    box(viaduct,x,deckY,z,w,1.25,d,0x8a8277);
    box(viaduct,x,deckY+.65,z,w-.35,.08,d-.1,0x555455);
  }
  for(const x of [cx-6.3,cx+6.3]) {
    stoneRail(viaduct,box,material,[x,cz+5.25],[x,cz+38.5],deckY+.67,limestone);
    box(viaduct,x,4.1,cz+26,1.25,6.4,1.6,limestone);
  }
  for(const x of [-13.25,87.75]) stoneRail(viaduct,box,material,[x,-56],[x,cz+5.25],deckY+.67,limestone);
  for(const [a,b] of [[-13.25,cx-6.3],[cx+6.3,87.75]]) {
    stoneRail(viaduct,box,material,[a,cz+5.25],[b,cz+5.25],deckY+.67,limestone);
  }
}


// Register the same local terminal shell in the map landmark's metre frame.
export function createMapTerminal(plan) {
  const root = new T.Group();
  const parts = { facade: new T.Group(), roof: new T.Group(), viaduct: new T.Group() };
  root.add(...Object.values(parts));
  root.rotation.y = terminalBearing;
  root.position.set(6,0,-30).applyAxisAngle(new T.Vector3(0,1,0),terminalBearing);
  const palette = new Map();
  function material(color) {
    if (!palette.has(color)) palette.set(color,new T.MeshStandardMaterial({
      color,roughness:.83,side:T.DoubleSide
    }));
    return palette.get(color);
  }
  const roofGlazing = material(glass).clone();
  roofGlazing.userData.seeThroughOpacity = .62;
  const roofSurface = material(copper).clone();
  roofSurface.userData.seeThroughOpacity = .9;
  function mesh(parent,geometry,color,x=0,y=0,z=0) {
    let surface = material(color);
    if (parent === parts.roof && color === glass) surface = roofGlazing;
    if (parent === parts.roof && color === copper) surface = roofSurface;
    const object = new T.Mesh(geometry,surface);
    object.position.set(x,y,z);
    parent.add(object);
    return object;
  }
  function box(parent,x,y,z,w,h,d,color) {
    return mesh(parent,new T.BoxGeometry(w,h,d),color,x,y,z);
  }
  buildExterior(parts,{box,mesh,material,eastPassages:plan.eastPassages,
    westBiltmoreOpening:plan.westBiltmoreOpening});
  return root;
}

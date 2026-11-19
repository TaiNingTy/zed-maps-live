import { floorY, roseWindow, exteriorWallThickness } from "./datums.js";
import { interiorArches } from "./interior-arches.js";
import { libraryInterior } from "./interior.js";
import { libraryRoof } from "./roof.js";
import * as T from "three";
import { sculpt, atticFigure, libraryLion } from "./statuary.js";
import { entranceOrnaments } from "./facade-ornaments.js";
import { portico } from "./portico.js";

export function createLibraryModel({interior = true} = {}) {
  const material = color => new T.MeshStandardMaterial({color, roughness:.83});
  const stone = material(0xd1c0a4), trim = material(0xe0cdb0), glass = material(0x445963);
  const publicFloor = material(0xe1c89d), reading = material(0xc8a974), service = material(0x89867e);
  const approach = material(0x96938a);
  const width = 82.296, length = 118.872;
  const facadeThickness=exteriorWallThickness;
  const east = width / 2, north = -length / 2;
  const shell = new T.Group();
  const levels = [
    {name:"Historic stacks", y:-4, note:"Historic stacks shown as context. Stack tiers are not individually reconstructed."},
    {name:"G · Street entrances", y:floorY.ground, note:"NYPL documents the 42nd Street entry, security and elevator sequence. South entry and thresholds are approximate."},
    {name:"1 · Astor Hall and Visitor Center", y:floorY.first, note:"Fifth Avenue opens into Astor Hall. Room 115 is toward the northeast. Room and door outlines are approximate."},
    {name:"2 · Corridor and historic stairs", y:floorY.second, note:"LPC documents the north–south corridor and stairs. Research rooms are arranged around the corridor. The Fifth Avenue entrance hall remains open above. Gallery edges, side-core stair positions and dimensions are reconstructed."},
    {name:"3 · McGraw Rotunda and Rose Main Reading Room", y:floorY.third, note:"The Rose Reading Room floor reaches the modeled exterior walls. Its depth is reconstructed from the envelope. The Catalog Room uses the published 81 × 77 ft dimensions. Absolute elevations are approximate."}
  ];
  for (const level of levels) {
    level.group = new T.Group();
  }

  function box(group, color, x,y,z,w,h,d) {
    const mesh = new T.Mesh(new T.BoxGeometry(w,h,d),color);
    mesh.position.set(x,y,z);
    group.add(mesh);
    return mesh;
  }
  function floor(group,color,x,z,w,d,y=0) {
    return box(group,color,x,y-.23,z,w,.46,d);
  }
  function stairs(group,x,z,y,width,run,rise,count,rotation) {
    const flight = new T.Group();
    flight.position.set(x,y,z);
    flight.rotation.y = rotation;
    group.add(flight);
    for(let i=0;i<count;i++){
      const top=(i+1)*rise/count;
      box(flight,trim,0,top/2,(i+.5)*run/count,width,top,run/count);
    }
  }
  function arch(path, x, y, w, h) {
    const r=w/2, spring=y+h-r;
    path.moveTo(x-r,y);
    path.lineTo(x+r,y);
    path.lineTo(x+r,spring);
    path.absarc(x,spring,r,0,Math.PI,false);
    path.lineTo(x-r,y);
  }
  function rectangle(path,x,y,w,h) {
    path.moveTo(x-w/2,y); path.lineTo(x+w/2,y); path.lineTo(x+w/2,y+h);
    path.lineTo(x-w/2,y+h); path.closePath();
  }
  function facade(span,x,z,rotation,openings) {
    const face = new T.Group();
    face.position.set(x,0,z);
    face.rotation.y=rotation;
    shell.add(face);
    const wall=new T.Shape();
    wall.moveTo(-span/2,0); wall.lineTo(span/2,0); wall.lineTo(span/2,24);
    if(rotation===-Math.PI/2){
      const northEnd=length/2-(791-355)/494*length;
      const southEnd=length/2-(411-355)/494*length;
      wall.lineTo(southEnd,24); wall.lineTo(southEnd,30.9);
      wall.lineTo(northEnd,30.9); wall.lineTo(northEnd,24);
    }
    wall.lineTo(-span/2,24); wall.closePath();
    for(const [u,y,w,h,door,rect] of openings){
      const opening=new T.Path();
      if(rect) rectangle(opening,u,y,w,h);
      else arch(opening,u,y,w,h);
      wall.holes.push(opening);
      if (!door) {
        const pane = new T.Shape();
        if(rect) rectangle(pane,u,y,w,h);
        else arch(pane,u,y,w,h);
        const mesh = new T.Mesh(new T.ShapeGeometry(pane,12),glass);
        mesh.position.z=.11;
        face.add(mesh);
        box(face,trim,u,y-.12, .67,w+.6,.23,.64);
      }
    }
    face.add(new T.Mesh(new T.ExtrudeGeometry(wall,{depth:facadeThickness,bevelEnabled:false,curveSegments:12}),stone));
    if(rotation===-Math.PI/2){
      const centralSpan=(791-411)/494*length;
      for(const [y,h,d] of [[19.1,.65,1.22],[30.54,.55,1.46]])
        box(face,trim,0,y,.62,centralSpan,h,d);
    }else{
      for(const [y,w,h,d] of [[3.6,span,.42,1.05],[20.6,span,.55,1.2],[23.5,span,1,1.65]]){
        if(y!==3.6 || !openings.some(o=>o[4]&&o[1]<y)) box(face,trim,0,y,.62,w,h,d);
      }
    }
    return face;
  }
  const sideWindows = Array.from({length:8},(_,i)=>[(i-3.5)*9,10,3.6,7]);
  const eastFace=facade(length,east-.8,0,Math.PI/2,[
    ...[-7.2,0,7.2].map(x=>[x,4,4.25,11.4,true]),
    ...[-17.7,17.7].map(x=>[x,4.55,3.5,5.85,true]),
    ...[-48,-41,-34,-27,-22,22,27,34,41,48].flatMap(x=>[[x,5,3.25,6.4],[x,13,2.9,3.6,false,true]])
  ]);
  const rearSlots=Array.from({length:25},(_,index)=>(index-12)*2.93);
  facade(length,-east+facadeThickness,0,-Math.PI/2,[
    ...roseWindow.bays.map(z=>[z,roseWindow.sill,roseWindow.width,roseWindow.height]),
    ...rearSlots.map(z=>[z,3.2,.98,15.3,false,true]),
    ...roseWindow.bays.slice(0,-1).map(z=>[z+4.225,19.74,.82,1.27,false,true])
  ]);
  facade(width,0,north+.8,Math.PI,[...sideWindows,[-4,.08,4,5,true]]);
  facade(width,0,-north-.8,0,[...sideWindows,[23.5,.08,4,5,true]]);
  libraryRoof(shell,levels[3].group,box,stone,width,length);
  portico(eastFace,stone,trim,box,arch);

  function sculpture(parent,x,y,z,parts,spacing=.075) {
    const mesh=new T.Mesh(sculpt(parts,spacing),trim);
    mesh.position.set(x,y,z);
    parent.add(mesh);
  }
  for(const [i,u] of [11.55,5.05,3.27,-3.12,-5.07,-11.61].entries()){
    box(eastFace,stone,u,23.01,4.87,1.42,.19,1.22);
    sculpture(eastFace,u,23.1,4.84,atticFigure(i));
  }
  function pediment(u, side) {
    const shape = new T.Shape();
    shape.moveTo(-10,0); shape.lineTo(10,0); shape.lineTo(0,4.8); shape.closePath();
    const frame = new T.Mesh(new T.ExtrudeGeometry(shape,{depth:1.2,bevelEnabled:false}),trim);
    frame.position.set(u,23.7,.4);
    eastFace.add(frame);
    const figures = side===1 ? [[-5.9,.58,-.54],[-3.35,1.05,.4],[-.55,1.52,-.4],[2.7,1.17,.48],[5.9,.55,-.65]]
      : [[-6,.58,.52],[-3.25,1.18,-.34],[.6,1.55,.48],[3.7,.89,-.53],[6.25,.48,.59]];
    const parts = figures.flatMap(([x,y,lean])=>[
      [x,y,0,1.18,Math.min(y*.88,.87),.42,lean],
      [x+lean,y+.58,.16,.30,.35,.35],
      [x-lean,y-.1,.23,.57,.30,.29,lean*.5]
    ]);
    sculpture(eastFace,u,23.81,1.51,parts,.085);
  }
  pediment(-41,-1);
  pediment(41,1);
  entranceOrnaments(eastFace,stone,trim,box,arch);
  const wingFrame=material(0x504c45);
  for(const x of [-48,-41,-34,-27,-22,22,27,34,41,48]){
    for(const dx of [-.77,0,.77]) {
      box(eastFace,wingFrame,x+dx,7.65,.18,.065,5.3,.09);
      box(eastFace,wingFrame,x+dx,14.8,.18,.07,3.6,.09);
    }
    for(const y of [6.4,8,9.5]) box(eastFace,wingFrame,x,y,.18,3.19,.07,.09);
    box(eastFace,wingFrame,x,14.65,.18,2.88,.08,.09);
    // Returns seat in the opening and meet the glass and projecting stone surround.
    for(const dx of [-1.43,1.43]) box(eastFace,trim,x+dx,14.8,.47,.19,3.6,.70);
    for(const y of [13.08,16.52]) box(eastFace,trim,x,y,.47,2.88,.16,.70);
    for(const dx of [-1.49,1.49]) box(eastFace,trim,x+dx,14.8,.73,.17,3.85,.37);
    box(eastFace,trim,x,16.68,.75,3.29,.2,.46);
    box(eastFace,trim,x,12.96,.68,3.25,.16,.61);
  }
  const lionMarble = material(0xd8c5bb);
  for(const z of [-19,19]){
    const isPatience=z>0;
    // Visible pedestal height above the terrace is estimated from the frontage photo.
    const base=box(shell,stone,53,1.17,z,3.44,2.34,1.53);
    base.name=isPatience?"Patience pedestal":"Fortitude pedestal";
    box(shell,stone,53,.18,z,3.61,.36,1.67);
    box(shell,trim,53,2.41,z,3.54,.14,1.61);
    box(shell,trim,53,2.57,z,3.45,.18,1.56);
    const geometry=libraryLion(isPatience);
    geometry.computeBoundingBox();
    const bounds=geometry.boundingBox;
    const size=bounds.getSize(new T.Vector3());
    geometry.translate(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,0);
    geometry.scale(3.4544/size.x,1.9304/size.y,1.3716/size.z);
    const lion=new T.Mesh(geometry,lionMarble);
    lion.position.set(53,2.66,z);
    lion.name=isPatience?"Patience":"Fortitude";
    shell.add(lion);
  }
  stairs(shell,56,0,0,27,10,4,23,-Math.PI/2);
  floor(shell,trim,43.4,0,5.2,27,4);
  floor(shell,trim,59.1,0,6.2,32);
  stairs(shell,65.2,0,-.66,38,3,.66,4,-Math.PI/2);

  if (interior) {
  libraryInterior(levels.map(level=>level.group),box,floor,stairs,
    {stone,trim,publicFloor,reading,service,approach,glass},width,length);
  interiorArches(levels[2].group,levels[4].group,box,stone,trim,arch,width);
  }
  return {shell, levels, east, north};
}

export function createMapLibrary() {
  const {shell, levels} = createLibraryModel({interior:false});
  const courtLevel = levels[3];
  const skylight = courtLevel.group.getObjectByName("North Court · glass skylight");
  skylight.position.y = courtLevel.y;
  shell.add(skylight);
  // Registered to the existing map footprint center and Fifth Avenue bearing.
  shell.position.set(64.526,0,-33.507);
  shell.rotation.y = T.MathUtils.degToRad(-29);
  return shell;
}

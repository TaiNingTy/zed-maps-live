import { floorY, bryantParkWingEast, courtWallThickness, exteriorWallThickness } from "./datums.js";
import * as T from "three";

function pitched(parent, material, eaves, ridge, ends=true, secondSlope=true) {
  const vertices=[...eaves,...ridge];
  const indices=[0,4,5,0,5,1];
  if(secondSlope) indices.push(2,5,4,2,4,3);
  if(ends) indices.push(3,4,0,1,5,2);
  const geometry=new T.BufferGeometry();
  geometry.setAttribute("position",new T.Float32BufferAttribute(vertices.flat(),3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  parent.add(new T.Mesh(geometry,material));
}

// North bearing line of the central roof wing, registered to the roof plan.
export const northRoofWingEdge = length => length/2-(656-355)/494*length;
export const centralRoofWingFront = width => (473-203)/343*width-width/2;

export function libraryRoof(shell, secondFloor, box, stone, width, length) {
  const x=width/2,z=length/2;
  const roof=new T.MeshStandardMaterial({color:0x858176,roughness:.92,side:T.DoubleSide,flatShading:true});
  function hip(x0,x1,z0,z1,eave,rise) {
    const middle=(x0+x1)/2;
    const inset=Math.min((x1-x0)/2,(z1-z0)/2);
    pitched(shell,roof,[[x0,eave,z0],[x0,eave,z1],[x1,eave,z1],[x1,eave,z0]],
      [[middle,eave+rise,z0+inset],[middle,eave+rise,z1-inset]]);
  }
  function wing(x0,x1,z0,z1,eave,rise) {
    const center=(z0+z1)/2;
    const inset=Math.min((x1-x0)/2,(z1-z0)/2);
    pitched(shell,roof,[[x0,eave,z0],[x1,eave,z0],[x1,eave,z1],[x0,eave,z1]],
      [[x0+inset,eave+rise,center],[x1-inset,eave+rise,center]]);
  }
  // Control points traced from LPC "Areas of Site Alterations", printed p. 7.
  // Image axes run from 40th to 42nd Street and Bryant Park to Fifth Avenue.
  const planX=v=>(v-203)/343*width-x;
  const planZ=u=>z-(u-355)/494*length;
  const rearWest=-x+exteriorWallThickness, rearEast=bryantParkWingEast, rearRidge=(rearWest+rearEast)/2;
  const south=planZ(411), north=planZ(791);
  const ridgeSouth=planZ(465), ridgeNorth=planZ(737);
  const middle=planZ(601), southValley=planZ(546), northValley=northRoofWingEdge(length);
  const front=centralRoofWingFront(width), eave=30.9, ridge=35.5;
  function surface(points,material,parent=shell){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(points.flat(),3));
    const indices=[];
    for(let i=1;i<points.length-1;i++) indices.push(0,i,i+1);
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    parent.add(new T.Mesh(geometry,material));
  }
  const westSouth=[rearWest,eave,south], westNorth=[rearWest,eave,north];
  const eastSouth=[rearEast,eave,south], eastNorth=[rearEast,eave,north];
  const ridgeStart=[rearRidge,ridge,ridgeSouth], ridgeStop=[rearRidge,ridge,ridgeNorth];
  const junction=[rearRidge,ridge,middle];
  const valleySouth=[rearEast,eave,southValley], valleyNorth=[rearEast,eave,northValley];
  const gableTop=[front,ridge,middle], frontSouth=[front,eave,southValley], frontNorth=[front,eave,northValley];
  surface([westSouth,westNorth,ridgeStop,ridgeStart],roof);
  surface([westSouth,ridgeStart,eastSouth],roof);
  surface([westNorth,eastNorth,ridgeStop],roof);
  surface([eastSouth,ridgeStart,junction,valleySouth],roof);
  surface([valleyNorth,junction,ridgeStop,eastNorth],roof);
  surface([valleySouth,junction,gableTop,frontSouth],roof);
  surface([junction,valleyNorth,frontNorth,gableTop],roof);
  const wall=stone.clone();
  wall.side=T.DoubleSide;
  surface([frontSouth,gableTop,frontNorth],wall);
  const windowWallY=23.95;
  const terraceY=22.25;
  const darkGlass=new T.MeshStandardMaterial({color:0x46575b,roughness:.48,side:T.DoubleSide});
  const carvedStone=stone.clone();
  carvedStone.color.offsetHSL(0,-.025,.065);
  carvedStone.side=T.DoubleSide;
  const iron=new T.MeshStandardMaterial({color:0x30302c,roughness:.8});
  function raisedArch(group,u,bottom,spring,r){
    const band=.27;
    for(let i=0;i<17;i++){
      const start=Math.PI*i/17+.012, end=Math.PI*(i+1)/17-.012;
      const block=new T.Shape();
      block.absarc(u,spring,r+band,start,end,false);
      block.absarc(u,spring,r,end,start,true);
      block.closePath();
      const mesh=new T.Mesh(new T.ExtrudeGeometry(block,{depth:.105,bevelEnabled:false,curveSegments:4}),carvedStone);
      mesh.position.z=-.105;
      group.add(mesh);
    }
    const courses=9, step=(spring-bottom)/courses;
    for(const side of [-1,1]) for(let i=0;i<courses;i++)
      box(group,carvedStone,u+side*(r+band/2),bottom+(i+.5)*step,-.049,band,step-.022,.104);
  }
  const rearBayPitch=Math.min(northValley-north,south-southValley)/4;
  const crossBayPitch=(front-rearEast)/5;
  const rearBays=[1,2,3].map(index=>index*rearBayPitch);
  const crossBays=[1,2,3,4].map(index=>index*crossBayPitch);
  function clerestory(a,b,bays=[],fromEnd=false){
    const run=Math.hypot(b[0]-a[0],b[2]-a[2]), h=eave-windowWallY;
    const section=new T.Shape();
    const wallBase=terraceY-windowWallY;
    section.moveTo(0,wallBase); section.lineTo(run,wallBase);
    section.lineTo(run,h); section.lineTo(0,h); section.closePath();
    const group=new T.Group();
    group.position.set(a[0],windowWallY,a[2]);
    group.rotation.y=Math.atan2(a[2]-b[2],b[0]-a[0]);
    shell.add(group);
    for(const offset of bays){
      const center=fromEnd?run-offset:offset;
      const radius=1.86;
      const bottom=.54, spring=5.55-radius;
      const opening=new T.Shape();
      opening.moveTo(center-radius,bottom); opening.lineTo(center+radius,bottom);
      opening.lineTo(center+radius,spring); opening.absarc(center,spring,radius,0,Math.PI,false);
      opening.closePath();
      section.holes.push(opening);
      const pane=new T.Mesh(new T.ShapeGeometry(opening,12),darkGlass);
      // All court-facing walls use the negative local Z face. Keep glazing
      // just inside that face and ahead of any separate interior window.
      pane.position.z=.012;
      group.add(pane);
      raisedArch(group,center,bottom,spring,radius);
      box(group,carvedStone,center,bottom-.07,-.12,2*radius+.58,.14,.29);
      for(const offset of [-1.05,0,1.05])
        box(group,carvedStone,center+offset,bottom-.32,-.06,.79,.31,.16);
      for(const offset of [-.93,-.46,0,.46,.93]){
        const top=spring+Math.sqrt(radius*radius-offset*offset);
        box(group,iron,center+offset,(bottom+top)/2,-.012,.036,top-bottom,.034);
      }
      box(group,iron,center,bottom+.17,-.025,2*radius,.038,.06);
    }
    group.add(new T.Mesh(new T.ExtrudeGeometry(section,{depth:courtWallThickness,bevelEnabled:false,curveSegments:12}),wall));
    box(group,stone,run/2,h-.08,.15,run,.16,.51);
  }
  for(const [a,b,bays,fromEnd] of [
    [westNorth,eastNorth], [eastNorth,valleyNorth,rearBays,true],
    [valleyNorth,frontNorth,crossBays], [frontNorth,frontSouth],
    [frontSouth,valleySouth,crossBays,true], [valleySouth,eastSouth,rearBays],
    [eastSouth,westSouth]
  ]) clerestory(a,b,bays,fromEnd);

  // The aerial views show low flat returns framing open court wells.
  const deck=new T.MeshStandardMaterial({color:0xaaa599,roughness:.96});
  const terraceEast=planX(501);
  function flat(x0,x1,z0,z1){
    box(shell,deck,(x0+x1)/2,terraceY-.14,(z0+z1)/2,x1-x0,.28,z1-z0);
  }
  flat(rearEast,terraceEast,southValley,south);
  const wellEast=10.4, wellNorth=-36.5, wellSouth=northValley;
  flat(rearEast,terraceEast,north,wellNorth);
  flat(wellEast,terraceEast,wellNorth,wellSouth);
  // The deep well meets the tall wing faces at the inside corner.
  const wellFloor=14.25;
  const wellDepth=terraceY-wellFloor;
  function wellFace(x,z,run,rotation,style){
    const group=new T.Group();
    group.position.set(x,terraceY-wellDepth,z);
    group.rotation.y=rotation;
    shell.add(group);
    const profile=new T.Shape();
    profile.moveTo(0,0); profile.lineTo(run,0); profile.lineTo(run,wellDepth);
    profile.lineTo(0,wellDepth); profile.closePath();
    function aperture(u,w,y,h,arched=false){
      const slot=new T.Shape();
      slot.moveTo(u-w/2,y); slot.lineTo(u+w/2,y);
      if(arched){
        const spring=y+h-.46;
        slot.lineTo(u+w/2,spring);
        slot.absellipse(u,spring,w/2,.46,0,Math.PI,false);
      }else{
        slot.lineTo(u+w/2,y+h); slot.lineTo(u-w/2,y+h);
      }
      slot.closePath();
      profile.holes.push(slot);
      const pane=new T.Mesh(new T.ShapeGeometry(slot,12),darkGlass);
      pane.position.z=rotation===0?.27:.012;
      group.add(pane);
    }
    if(style==="tall"){
      for(let i=1;i<=7;i++) aperture(i*run/8,.84,.46,7.05);
    }
    if(style==="stacked"){
      for(let i=1;i<=4;i++) aperture(i*run/5,1.18,5.22,1.35);
      for(const fraction of [.30,.76]) aperture(run*fraction,1.85,.56,3.50,true);
      for(const fraction of [.13,.53]) aperture(run*fraction,.89,.75,1.38);
    }
    group.add(new T.Mesh(new T.ExtrudeGeometry(profile,{depth:.28,bevelEnabled:false,curveSegments:12}),wall));
  }
  wellFace(rearEast,wellNorth,wellSouth-wellNorth,-Math.PI/2,"tall");
  wellFace(rearEast,wellSouth,wellEast-rearEast,0,"stacked");
  wellFace(wellEast,wellNorth,wellSouth-wellNorth,-Math.PI/2);
  wellFace(rearEast,wellNorth,wellEast-rearEast,0);
  // The lower well steps back at the second-floor research rooms.
  const lowerSouth=-17;
  const lowerHeight=wellFloor-floorY.second;
  const lowerWallY=floorY.second+lowerHeight/2;
  for(const edge of [rearEast,wellEast])
    box(shell,stone,edge-.14,lowerWallY,(wellNorth+lowerSouth)/2,.28,lowerHeight,lowerSouth-wellNorth);
  for(const edge of [wellNorth,lowerSouth])
    box(shell,stone,(rearEast+wellEast)/2,lowerWallY,edge+(edge===wellNorth?.14:-.14),wellEast-rearEast,lowerHeight,.28);
  box(shell,stone,(rearEast+wellEast)/2,wellFloor-.14,(lowerSouth+wellSouth)/2,
    wellEast-rearEast,.28,wellSouth-lowerSouth);

  box(shell,stone,wellEast,terraceY+.26,(wellNorth+wellSouth)/2,.22,.52,wellSouth-wellNorth);
  box(shell,stone,(rearEast+wellEast)/2,terraceY+.26,wellNorth,wellEast-rearEast,.52,.22);

  const stepHeight=24-terraceY, stepY=terraceY+stepHeight/2;
  for(const [z0,z1] of [[north,northValley],[southValley,south]])
    box(shell,stone,terraceEast,stepY,(z0+z1)/2,.28,stepHeight,z1-z0);
  for(const z0 of [north,south])
    box(shell,stone,(rearEast+terraceEast)/2,stepY,z0,terraceEast-rearEast,stepHeight,.28);
  hip(-x,rearWest,-z,z,24,1.5);
  hip(terraceEast,x,-z,z,24,1.6);
  wing(rearWest,terraceEast,-z,north,24,1.8);
  wing(rearWest,terraceEast,south,z,24,1.8);
  box(shell,stone,(planX(473)+x)/2,25.97,(planZ(681)+planZ(521))/2,x-planX(473),3.95,planZ(521)-planZ(681));
  wing(planX(473),x,planZ(681),planZ(521),27.95,2.2);
  hip(planX(432),planX(498),planZ(516),planZ(409),terraceY,1.75);
  // The second-floor deck frames the opening without crossing the glazing.
  const skylight=new T.Group();
  skylight.name="North Court · glass skylight";
  secondFloor.add(skylight);
  const glass=new T.MeshStandardMaterial({color:0x829fa6,roughness:.24,side:T.DoubleSide,transparent:true,opacity:.76,depthWrite:false});
  const frame=new T.MeshStandardMaterial({color:0x555955,roughness:.65});
  glass.userData.outsideOpacity=.76;
  glass.userData.seeThroughOpacity=.72;
  frame.userData.seeThroughOpacity=.65;
  const openingWest=-8, openingEast=8, openingNorth=wellNorth+1.2, openingSouth=lowerSouth-1.2;
  function deckStrip(x0,x1,z0,z1){
    box(skylight,deck,(x0+x1)/2,-.14,(z0+z1)/2,x1-x0,.28,z1-z0);
  }
  deckStrip(rearEast,openingWest,wellNorth,lowerSouth);
  deckStrip(openingEast,wellEast,wellNorth,lowerSouth);
  deckStrip(openingWest,openingEast,wellNorth,openingNorth);
  deckStrip(openingWest,openingEast,openingSouth,lowerSouth);
  const curb=.24;
  const cx=(openingWest+openingEast)/2, cz=(openingNorth+openingSouth)/2;
  const corners=[
    [openingWest,curb,openingNorth],
    [openingEast,curb,openingNorth],
    [openingEast,curb,openingSouth],
    [openingWest,curb,openingSouth]
  ].map(p=>new T.Vector3(...p));
  const peak=new T.Vector3(cx,curb+1.6,cz);
  function glazingBar(a,b){
    const center=a.clone().lerp(b,.5);
    const bar=box(skylight,frame,center.x,center.y,center.z,.065,a.distanceTo(b),.065);
    bar.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());
  }
  for(let i=0;i<4;i++){
    const a=corners[i], b=corners[(i+1)%4];
    surface([a.toArray(),b.toArray(),peak.toArray()],glass,skylight);
    glazingBar(a,b);
    glazingBar(a,peak);
    for(const t of [.25,.5,.75]){
      glazingBar(a.clone().lerp(b,t),peak);
      glazingBar(a.clone().lerp(peak,t),b.clone().lerp(peak,t));
    }
  }
  for(const edge of [openingWest,openingEast])
    box(skylight,stone,edge,curb/2,cz,.15,curb,openingSouth-openingNorth+.15);
  for(const edge of [openingNorth,openingSouth])
    box(skylight,stone,cx,curb/2,edge,openingEast-openingWest-.15,curb,.15);
}

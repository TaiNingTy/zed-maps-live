import { floorY, floorHeights, readingRoomBounds, gallerySpine } from "./datums.js";
import * as T from "three";
import { historicStairs, southCore } from "./interior-stairs.js";

// Local coordinates follow the envelope. +X is Fifth Avenue and +Z is 40th Street.
// Room footprints are reconstructed from the visitor plan. Rose and Catalog
// dimensions come from LPC LP-2592.
export function libraryInterior(groups, box, floor, stairs, materials, width, length){
  const [stacks,ground,first,second,third]=groups;
  const {stone,trim,publicFloor,reading,service,approach,glass}=materials;
  const north=-length/2;
  const {west:spineWest,east:spineEast}=gallerySpine;
  const wallInset=.94;
  const storeyHeight=new Map([[ground,floorY.first-floorY.ground],[first,floorY.second-floorY.first],[second,floorY.third-floorY.second],[third,9]]);
  const plaster=new T.MeshStandardMaterial({color:0xe5d9bc,roughness:.84,side:T.DoubleSide});
  const oak=new T.MeshStandardMaterial({color:0x8b6844,roughness:.8});
  function ceiling(group,name,x,z,w,d,y,style){
    const lid=new T.Group();
    lid.name=name+" · ceiling";
    lid.userData.ceiling=true;
    group.add(lid);
    if(style==="vault"){
      const vertices=[];
      for(let i=0;i<=20;i++){
        const angle=Math.PI*i/20, offset=-Math.cos(angle)*d/2;
        const h=y-2.05+2.05*Math.sin(angle);
        vertices.push(x-w/2,h,z+offset,x+w/2,h,z+offset);
      }
      const indices=[];
      for(let i=0;i<40;i+=2) indices.push(i,i+1,i+2,i+1,i+3,i+2);
      const geometry=new T.BufferGeometry();
      geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      lid.add(new T.Mesh(geometry,plaster));
      const bottom=group===first?4.35:4.55;
      const spring=y-2.05, band=spring-bottom;
      if(band>0) for(const side of [-1,1])
        box(lid,plaster,x,bottom+band/2,z+side*d/2,w,band,.22);
      return;
    }
    box(lid,style==="oak"?oak:plaster,x,y+.085,z,w,.17,d);
    if(style==="oak"||style==="coffer"){
      const pitch=style==="oak"?2.8:4.6;
      const rows=Math.ceil(d/pitch), columns=Math.ceil(w/pitch);
      for(let i=0;i<=rows;i++) box(lid,trim,x,y-.12,z-d/2+i*d/rows,w,.24,.20);
      for(let i=0;i<=columns;i++) box(lid,trim,x-w/2+i*w/columns,y-.12,z,.20,.24,d);
    }
  }
  function room(group,name,x,z,w,d,color,doors={}){
    const boundsX=width/2-wallInset, boundsZ=length/2-wallInset;
    const left=Math.max(-boundsX,x-w/2), right=Math.min(boundsX,x+w/2);
    const near=Math.max(-boundsZ,z-d/2), far=Math.min(boundsZ,z+d/2);
    x=(left+right)/2; z=(near+far)/2; w=right-left; d=far-near;
    const plate=floor(group,color,x,z,w,d);
    plate.name=name;
    const wall=.23;
    const height=name.startsWith("Bill Blass")?15.8496:
      Math.min(storeyHeight.get(group)-.52,group===third?4.55:4.35);
    const vault=name==="Astor Hall" || name.startsWith("McGraw Rotunda");
    const coffer=name.startsWith("Rose Main") || name.startsWith("Bill Blass");
    const carved=name==="Gottesman Hall";
    const lidY=name==="Astor Hall"?10.36:vault?8.65:coffer?15.8496:height;
    if(name!=="Bartos Forum")
      ceiling(group,name,x,z,w,d,lidY,vault?"vault":coffer?"coffer":carved?"oak":"flat");
    for(const [side,span,edge,alongX] of [
      ["north",w,z-d/2,true],["south",w,z+d/2,true],
      ["west",d,x-w/2,false],["east",d,x+w/2,false]
    ]){
      if(doors[side]===null) continue;
      const cuts=(doors[side]||[]).slice().sort((a,b)=>a[0]-b[0]);
      for(const [center,gap] of cuts){
        const lintel=height-2.25;
        if(alongX) box(group,trim,x+center,2.25+lintel/2,edge,gap,lintel,wall);
        else box(group,trim,edge,2.25+lintel/2,z+center,wall,lintel,gap);
      }
      let start=-span/2;
      for(const [center,gap] of [...cuts,[span/2,0]]){
        const end=center-gap/2;
        if(end>start){
          const run=end-start, at=(end+start)/2;
          const segment=alongX
            ?box(group,trim,x+at,height/2,edge,run,height,wall)
            :box(group,trim,edge,height/2,z+at,wall,height,run);
          segment.name=name+" · "+side+" partition";
        }
        start=center+gap/2;
      }
    }
  }
  floor(stacks,service,-23,0,25,89);
  for(const z of [-36,-24,-12,0,12,24,36]) box(stacks,service,-23,1.1,z,19,2.2,.7);

  // The handout supplies room order, access and door relationships. Its
  // public-area schematic is registered to the exterior and historic stairs.
  function plate(level,name,x0,x1,z0,z1,material=publicFloor){
    if(name!=="42nd Street · ramp landing"){
      x0=Math.max(x0,-width/2+wallInset); x1=Math.min(x1,width/2-wallInset);
      z0=Math.max(z0,north+wallInset); z1=Math.min(z1,-north-wallInset);
    }
    floor(level,material,(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0).name=name;
  }
  function area(level,name,x0,x1,z0,z1,material,doors){
    room(level,name,(x0+x1)/2,(z0+z1)/2,x1-x0,z1-z0,material,doors);
  }

  plate(ground,"Ground · building datum",-width/2,width/2,north,-north,approach);
  plate(ground,"42nd Street · ramp landing",1,7,north-5,north,approach);
  floor(ground,approach,4,north+wallInset/2,3.85,wallInset).name="42nd Street · door threshold";
  floor(ground,approach,23.5,-north-wallInset/2,3.85,wallInset).name="40th Street · door threshold";
  area(ground,"Bartos Forum",-12,12,-38.5,-14.5,publicFloor,{north:[[0,3.2]]});
  area(ground,"Celeste Auditorium · lower level",-5,10,13,43,reading,{east:[[9,3]]});
  plate(ground,"42nd Street · entrance lobby",-6,12,north,-38.5);
  area(ground,"42nd Street · coat check",-12,-6,north,-48,publicFloor,{east:[[0,2.2]]});
  plate(ground,"North stair and elevator approach",12,21,-49,-37);
  plate(ground,"Ground · staff access only",21,26,-49,25,service);
  plate(ground,"40th Street · entrance and south core",21,26,25,-north);
  box(ground,service,7,.53,-53,2,1.06,1);

  room(first,"Astor Hall",29.7,0,21,22,publicFloor,{east:null,west:[[0,6]],north:[[6.3,3.6]],south:[[6.3,3.6]]});
  area(first,"Gottesman Hall",-12,13,-12,12,publicFloor,{east:[[0,4]],south:[[0,3]]});
  area(first,"Library Shop & Café",-12,13,12,37,publicFloor,{north:[[0,3]],east:[[-5,3]]});
  plate(first,"First floor · north–south corridor",21,28,north,-11);
  plate(first,"First floor · north–south corridor",21,28,11,-north);
  plate(first,"Astor Hall · west passage",13,19.2,-3,3);
  area(first,"Visitor Center · 115",28,41,-41,-17,publicFloor,{west:[[6,3]],north:[[0,2.4]]});
  area(first,"Map Division · 117",28,41,north,-41,reading,{west:[[0,2.6]],south:[[0,2.4]]});
  area(first,"Picture Collection · 119",5,21,north,-48,reading,{south:[[0,2.4]]});
  area(first,"Irma Milstein Study · 120",-7,5,north,-48,reading,{south:[[0,2.2]]});
  area(first,"Milstein Division · 121",-41,-7,north,-43,reading,{east:[[0,3]]});
  plate(first,"42nd Street · research-room approach",-7,-5.6,-48,-43);
  plate(first,"42nd Street · research-room approach",-3.4,21,-48,-43);
  area(first,"DeWitt Wallace Periodical Room · 108",28,41,41,-north,reading,{west:[[0,2.7]],north:[[0,2.7]]});
  area(first,"Dorot Jewish Division · 111",28,41,17,41,reading,{west:[[0,2.7]],south:[[0,2.7]]});
  area(first,"Wachenheim Gallery",13,21,17,30,publicFloor,{south:[[0,2.7]],east:[[0,3]]});
  // Trace the paired published plans around the north court.
  const courtZ=-26.5;
  // The upper court elevations belong to the surrounding wings. The
  // centre is a low rooflight over the hall, with circulation around it.
  const northCourtWall=-38.5;
  const frame=new T.MeshStandardMaterial({color:0x594e3c,roughness:.68});
  const courtGlass=new T.MeshStandardMaterial({color:0x627986,roughness:.3,side:T.DoubleSide});
  function courtWall(level,height,z,openings){
    const wall=new T.Shape();
    wall.moveTo(-12,0); wall.lineTo(12,0); wall.lineTo(12,height);
    wall.lineTo(-12,height); wall.closePath();
    for(const [x,bottom,w,h,arched,door] of openings){
      const left=x-w/2,right=x+w/2;
      const opening=new T.Shape();
      opening.moveTo(left,bottom); opening.lineTo(right,bottom);
      if(arched){
        opening.lineTo(right,bottom+h-w/2);
        opening.absarc(x,bottom+h-w/2,w/2,0,Math.PI,false);
      }else{
        opening.lineTo(right,bottom+h); opening.lineTo(left,bottom+h);
      }
      opening.closePath();
      wall.holes.push(opening);
      if(door) continue;
      const pane=new T.Mesh(new T.ShapeGeometry(opening,12),courtGlass);
      pane.position.set(0,0,z+.15);
      level.add(pane);
      box(level,trim,x,bottom-.06,z+.21,w+.28,.13,.36);
      box(level,frame,x,bottom+h*.47,z+.17,.045,h*.94,.045);
      box(level,frame,x,bottom+h*.58,z+.17,w,.045,.045);
    }
    const mesh=new T.Mesh(new T.ExtrudeGeometry(wall,{depth:.30,bevelEnabled:false,curveSegments:12}),stone);
    mesh.position.z=z;
    level.add(mesh);
  }
  const bays=[-9.4,-4.8,0,7.4];

  courtWall(first,5.5,northCourtWall,bays.map((x,i)=>[x,i===3?1.1:.36,1.85,i===3?3.8:3.3,true,false]));


  box(first,trim,0,4.3,northCourtWall+.28,24,.20,.44);
  floor(first,publicFloor,-10,courtZ,4,24).name="North Court · west gallery";
  floor(first,publicFloor,10,courtZ,4,24).name="North Court · east gallery";
  for(const z of [-37.5,-15.5])
    floor(first,publicFloor,0,z,16,2).name="North Court · return gallery";
  room(first,"Ispahani–Bartos Gallery",16.5,courtZ,7,19,publicFloor,{west:[[0,3]],east:[[0,3]]});
  floor(first,publicFloor,12.5,courtZ,1,3).name="North Court · gallery threshold";
  floor(first,publicFloor,20.5,courtZ,1,3).name="Bartos Gallery · east threshold";
  for(const x of [13,20]){
    for(const z of [courtZ-1.5,courtZ+1.5]) box(first,trim,x,1.15,z,.29,2.3,.15);
    box(first,frame,x,2.22,courtZ,.28,.16,3);
  }
  floor(first,publicFloor,19,21,10,4);
  for(const z of [-8.4,8.4]) for(const x of [22,29,36]) box(first,stone,x,4.2,z,.76,8.4,.76);
  historicStairs(first,second,third,box,floor,{stone,trim,publicFloor});

  // Level 2: west research wing branches off corridor 201. The north
  // and south sides of the main hall remain separate from its central void.
  southCore(ground,first,second,third,box,floor,{publicFloor});
  plate(second,"201 · north–south corridor",spineWest,spineEast,north,-20);
  plate(second,"201 · north–south corridor",spineWest,spineEast,20,-north);
  plate(second,"201 · connection behind historic stairs",24.4,spineEast,-16.4,16.4);
  for(const side of [-1,1])
    plate(second,"201 · stair approach",27,spineEast,Math.min(side*16.4,side*20),Math.max(side*16.4,side*20));
  plate(second,"Vartan Gregorian Center · central aisle",-14,24.4,-2.4,2.4);
  area(second,"Scholars Reading Room · 217",-14,4,2.4,17,reading,{north:[[0,2.5]]});
  area(second,"Lenox and Astor Room · 216",4,17,2.4,17,reading,{north:[[0,2.5]]});
  area(second,"Research Room · 215",17,24,2.4,11,reading,{north:[[0,2.2]]});
  const researchRooms=[["Shoichi Noma Reading Room · 219",-14,-5],["220",-5,0],["221",0,5],["222",5,10],["223",10,17]];
  for(const [name,x0,x1] of researchRooms)
    area(second,name,x0,x1,-17,-2.4,reading,{south:[[0,2.1]]});
  area(second,"Cullman Center · 225",29,41,-42,-17,reading,{west:[[0,2.7]]});
  area(second,"Berger Forum · 227",29,41,north,-42,reading,{west:[[0,2.7]]});
  area(second,"Wachenheim Trustees Room · 206",29,41,43,-north,reading,{west:[[0,2.7]]});
  area(second,"Wertheim Study · 228W",0,12,north,-48,reading,{south:[[0,2.5]]});
  area(second,"Allen Room · 228E",12,25,north,-48,reading,{east:[[0,2.5]]});
  plate(second,"42nd Street · study approach",-3.4,25,-48,-44);

  // Level 3: the Rose room and its two end rooms face Bryant Park.
  area(third,"McGraw Rotunda · 301",13.77,spineEast,-11,11,publicFloor,{west:[[0,5]],east:[[0,4]],north:null,south:null});
  room(third,"Bill Blass Public Catalog Room",2.04,0,23.4696,24.6888,reading,{east:[[0,5]],west:[[0,5]]});
  const rose=readingRoomBounds(width);
  const roseCenter=(rose.west+rose.east)/2;
  const catalogWest=2.04-23.4696/2;
  floor(third,publicFloor,(rose.east+catalogWest)/2,0,catalogWest-rose.east,5);
  room(third,"Rose Main Reading Room · 315",roseCenter,0,rose.east-rose.west,rose.south-rose.north,reading,
    {east:null,west:null,north:null,south:null});
  area(third,"Art & Architecture · 300",rose.west,rose.east,rose.south,-north,reading,{east:[[0,2.7]],north:null});
  area(third,"Brooke Russell Astor Reading Room · 328",rose.west,rose.east,north,rose.north,reading,{east:[[0,2.7]],south:null});
  const shelves=new T.MeshStandardMaterial({color:0x614128,roughness:.82});
  for(const z of [-37,-29,-21,-13,-5,5,13,21,29,37]){
    for(const x of [rose.west+.5,rose.east-.5]){
      box(third,shelves,x,1.48,z,.71,2.96,5.1);
      for(const y of [.62,1.23,1.84,2.45])
        box(third,trim,x+(x<roseCenter?.37:-.37),y,z,.055,.07,4.92);
    }
  }
  area(third,"Prints & Photographs · 308",spineEast,41,43,-north,reading,{west:[[0,2.8]]});
  area(third,"Berg Collection · 320",spineEast,41,-48,-34,reading,{west:[[0,2.7]]});
  area(third,"Pforzheimer Collection · 319",14,spineWest,-33,-19,reading,{east:[[0,2.7]]});
  area(third,"Salomon Room · 316",spineEast,41,-18.5,18.5,reading,{west:[[0,4]]});
  plate(third,"Print Gallery",spineWest,spineEast,11,-north);
  plate(third,"Rayner Special Collections Wing · Stokes Gallery",spineWest,spineEast,-48,-11);
  plate(third,"40th Street · west return",rose.east,spineWest,48,52);
  plate(third,"42nd Street · west return",rose.east,spineWest,-54,-49);
  plate(third,"Stokes Gallery · north junction",spineWest,spineEast,-54,-48);
  for(const z of [-40,-35,-30,-25,-20,-15,-10,-5,5,10,15,20,25,30,35,40]){
    for(const x of [roseCenter-7.3,roseCenter+7.3]){
      box(third,service,x,.74,z,7,.15,1.5);
      for(const dx of [-2.8,2.8]) box(third,service,x+dx,.35,z,.22,.7,1.12);
    }
  }
  // The north stair symbol repeats from Ground through 3 on the handout.
  // Its reconstructed stairwell stays outside the rooflight footprint.
  const northLevels=[ground,first,second,third], northDatums=floorHeights;
  for(let i=0;i<3;i++){
    const level=northLevels[i], rise=(northDatums[i+1]-northDatums[i])/2;
    const flight=new T.Group();
    flight.name="42nd Street stair · "+["G–1","1–2","2–3"][i];
    level.add(flight);
    stairs(flight,-3.4,-42.05,0,1.5,5.2,rise,Math.ceil(rise/.17),Math.PI/2);
    stairs(flight,1.8,-40.45,rise,1.5,5.2,rise,Math.ceil(rise/.17),-Math.PI/2);
    floor(flight,publicFloor,2.55,-41.25,1.5,3.2,rise);
  }
  for(const level of northLevels.slice(1)){
    plate(level,"42nd Street · north stair landing",-5.6,-3.4,-43,-39.5);
    plate(level,"42nd Street · landing return",-5.6,-3.4,-49,-43);
  }
  plate(first,"42nd Street · north elevator lobby",13,21,-43,-38.5);
  plate(second,"42nd Street · north elevator lobby",13,spineWest,-44,-38.5);
  plate(third,"42nd Street · north elevator lobby",13,spineWest,-49,-38.5);
  for(const level of northLevels){
    box(level,glass,15,1.18,-41.45,2.2,2.36,.14);
    box(level,trim,15,2.45,-40.2,2.5,.22,.24);
  }
  box(first,service,35,.56,-29,1.2,1.12,2.2);
}

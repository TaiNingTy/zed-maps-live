// Stack labels are marketing floor numbers. Podium service decks are modeled
// as four physical decks, with placeholder IDs and interpolated elevations.
export const towerColors = {
  lobby:0xcdd2d9, office:0x7db6dd, amenity:0x3fa596, systems:0x565b63,
  observation:0xec8d97, core:0x939aa4, elevators:0xcf3a31, circulation:0xd3b284
};
const floor = (id,label,y,use,tier="scenario") => ({id,label,y,use,tier});
export const towerStack = [
  floor("lobby","L1 · Public lobby",0,"lobby"),
  ...[17,27,37,47].map((y,i)=>floor("podium"+i,"Podium · Service deck "+(i+1),y,"systems")),
  ...Array.from({length:71},(_,i)=>{
    const number=20+i;
    const y=58+i*(13+4/12)*.3048;
    return number===64
      ? floor("sky64","64 · Sky lobby / tenant amenity",y,"amenity","rebuilt")
      : floor("tower"+number,number+" · Office",y,"office",[59,73].includes(number)?"rebuilt":"scenario");
  }),
  ...Array.from({length:9},(_,i)=>floor("tower"+(91+i),(91+i)+" · Upper service level",
    346+i*(386.5-346)/9,"systems")),
  floor("obs100","100 · Main observatory",386.5,"observation","rebuilt"),
  floor("obs101","101 · Dining / observatory",390.4,"observation","rebuilt"),
  floor("obs102","102 · SkyPod arrival",394.3,"observation","rebuilt"),
  floor("tower103","103 · Crown level",402,"systems"),
  floor("tower104","104 · Upper crown",411,"systems")
];

const cx=-208, cz=-68;
export const towerRect=(x0,z0,x1,z1)=>[[cx+x0,cz+z0],[cx+x1,cz+z0],[cx+x1,cz+z1],[cx+x0,cz+z1]];
export function towerOutline(y,{keepCorners=false}={}){
  const podiumHalf=204*.3048/2;
  const roofAxis=150*.3048/Math.sqrt(2);
  const t=Math.max(0,Math.min(1,(y-186*.3048)/((1368-186)*.3048)));
  const axis=podiumHalf+(roofAxis-podiumHalf)*t;
  const corner=podiumHalf*(1-t);
  return [[-corner,-axis],[corner,-axis],[axis,-corner],[axis,corner],
    [corner,axis],[-corner,axis],[-axis,corner],[-axis,-corner]]
    .filter(([x,z],i,points)=>{
      const [previousX,previousZ]=points[(i+points.length-1)%points.length];
      return keepCorners || x!==previousX || z!==previousZ;
    })
    .map(([x,z])=>[cx+x,cz+z]);
}

// Block extents read from the two Durst plans, with Midtown at the top.
const officePlans = {
  tower59: {
    center: [591.5,736], half: 201,
    core: [[478,623,547,728],[569,630,635,725],[696,650,722,728],
      [508,747,528,844],[549,747,604,842],[635,747,704,847]],
    lifts: [[548,628,567,724],[637,628,654,719],[673,625,693,721],
      [489,750,507,841],[529,750,547,841],[607,750,633,841]],
    aisle: [476,729,725,746],
  },
  tower73: {
    center: [592.5,740.5], half: 200,
    core: [[639,631,697,732],[509,628,527,659],[491,752,526,849],
      [548,754,574,848],[636,753,698,849]],
    lifts: [[488,673,508,731],[529,634,549,731],[551,634,572,731],
      [574,634,593,731],[609,637,634,730],[529,755,547,847],
      [575,755,596,847],[608,755,634,847]],
    aisle: [480,733,706,751],
  },
};

export const towerFloorNotes = {
  tower59: "Durst as-built plan. Core and elevator banks reconstructed as blocks. Floor height is modeled.",
  sky64: "Well& tenant amenity and sky lobby are documented. Café, meeting and lounge locations shown here are illustrative.",
  tower73: "Durst suggested layout. Core, elevator banks and cross aisle reconstructed as blocks. Tenant fit-out and elevator service are unverified.",
};

export function addTowerInterior({groups, slab, box}){
  for(const f of towerStack){
    const g=groups[f.id];
    if(f.id.startsWith("obs")){
      // Slabs with fitted lift openings are supplied by the route model.
      box(g,cx+3,1.05,cz-9,10,2.1,3.5,towerColors.core);
      box(g,cx+9,.55,cz-4,4.2,1.1,1.7,f.id==="obs101"?0xb68c61:0x617885);
      continue;
    }
    const lobby=f.id==="lobby";
    // The engineering case study reports a roughly 110 ft square core at the base.
    const core=lobby?110*.3048/2:Math.max(8,14.5-(f.y/417)*6);
    const coreHeight=lobby?5:2.65;
    slab(f.id,towerOutline(f.y),towerColors[f.use],[],.42);
    const detail=(x,y,z,w,h,d,color)=>box(g,cx+x,y,cz+z,w,h,d,color);
    const elevator=towerColors.elevators, structure=towerColors.core;
    const plan=officePlans[f.id];
    if(plan){
      const axis=Math.max(...towerOutline(f.y).map(([x])=>x-cx));
      const scale=axis/plan.half;
      const [px,pz]=plan.center;
      const bounds=([left,top,right,bottom])=>[
        (left-px)*scale,(top-pz)*scale,(right-px)*scale,(bottom-pz)*scale,
      ];
      const block=(rect,height,color)=>{
        const [x0,z0,x1,z1]=bounds(rect);
        detail((x0+x1)/2,height/2,(z0+z1)/2,x1-x0,height,z1-z0,color);
      };
      for(const rect of plan.core)block(rect,2.65,structure);
      for(const rect of plan.lifts)block(rect,1.8,elevator);
      slab(f.id,towerRect(...bounds(plan.aisle)),towerColors.circulation,[],.04).position.y=.015;
      continue;
    }

    // Repeated public-facing core diagram. Car counts and partitions are schematic.
    for(const side of [-1,1]){
      detail(side*core,coreHeight/2,0,.36,coreHeight,core*2,structure);
      const wallSpan=core-2.1;
      for(const wing of [-1,1])
        detail(wing*(2.1+wallSpan/2),coreHeight/2,side*core,wallSpan,coreHeight,.36,structure);
      for(const bank of [-1,1])for(const bay of [-1,1]){
        detail(side*(core-2.6)+bay*1.1,.9,bank*(core-2.5),1.65,1.8,2.0,elevator);
      }
    }
    // Core approaches are kept outside the wall footprint.
    slab(f.id,towerRect(-core-4,-core-4,core+4,-core),towerColors.circulation,[],.04).position.y=.015;
    slab(f.id,towerRect(-core-4,core,core+4,core+4),towerColors.circulation,[],.04).position.y=.015;
    if(f.id==="sky64"){
      // Amenity programs are documented. Their placement here is illustrative.
      for(const [x,z,w,d] of [[0,-22,22,6],[-21,0,6,14],[20,0,6,14]]){
        detail(x,.06,z,w,.12,d,0x81c3b8);
        detail(x,.46,z,w*.7,.8,Math.min(1.5,d*.25),towerColors.circulation);
      }
    }else if(f.use==="office"){
      // Open office bays and a pair of shared meeting suites, kept clear of the core approaches.
      for(const side of [-1,1]){
        detail(side*(core+4.8),.025,0,3.8,.04,core*1.5,0x6598bb);
        detail(side*(core+7.9),1.05,-3,5.6,2.1,.14,0xa4c1d1);
        detail(side*(core+7.9),1.05,3,5.6,2.1,.14,0xa4c1d1);
        detail(side*(core+10.7),1.05,0,.14,2.1,6,0xa4c1d1);
      }
    }
    if(lobby){
      detail(-21,.58,9,6.3,1.16,1.7,0x2f6387);
      for(const x of [-7,-3,1,5])detail(x,.5,22,.48,1,1.6,0x737981);
      for(const x of [-23,23])for(const z of [-25,25])detail(x,1.8,z,.8,3.6,.8,structure);
      for(const side of [-1,1])for(const x of [-8,8])detail(x,1.55,side*29.8,3.5,3.1,.12,0xa9c9d2);
    }
  }
}

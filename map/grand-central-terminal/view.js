import { installViewerToolbar } from "../viewer-toolbar.js";
import { buildTerminalRamp } from "./terminal-ramp.js";
import { buildConcourseEscalator } from "./concourse-escalator.js";
import { buildGrandStair, GRAND_RAIL_INSET, GRAND_POST_WIDTH } from "./grand-stair.js";
import { interiorColumns, stoneRail } from "./architectural-details.js";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { plateGeo } from "../floorkit.js";
import { buildExterior, entrance, terminalBearing } from "./exterior.js";
import { facility, fareGates, landingPortal, openingGuards } from "../station-fixtures.js";

const $ = id => document.getElementById(id);
const viewerParams = new URLSearchParams(location.search);
if(window.parent!==window) {
  const close = () => window.parent.postMessage({type:"close-floors"},location.origin);
  $("back").hidden=false;
  $("back").onclick=close;
  window.addEventListener("keydown",event=>{
    if(event.key==="Escape") close();
  });
}
const scene = new T.Scene();
scene.background = new T.Color(0x151514);
const renderer = new T.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
$("stage").prepend(renderer.domElement);
const camera = new T.OrthographicCamera(-65, 65, 65, -65, .1, 1800);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.zoomToCursor = true;
scene.add(new T.HemisphereLight(0xffffff, 0x8b8692, 2.25));
const sun = new T.DirectionalLight(0xffedda, 2);
sun.position.set(30, 85, 65);
scene.add(sun);

const stone = 0xc9b99e, marble = 0xe1d5c3, bronze = 0xa88850;
const dining = 0xc7a875, subway = 0xa08bd6, lirr = 0x439f98, rail = 0x484950;
const levels = new Map();
const markers = [];
function level(id, title, elevation, order, color, note) {
  const group = new T.Group();
  group.userData.level = id;
  group.userData.physicalElevation = elevation;
  scene.add(group);
  levels.set(id, { title, elevation, order, color, note, group });
  return group;
}
const street = level("street", "42nd Street entrance", entrance.y, 1, stone,
  "The directory signs a ramp up to 42nd Street. Paving and handrails are illustrative. The model uses an assumed 1.2 m threshold difference.");
const main = level("main", "Main Concourse and Vanderbilt Hall", 0, 0, marble,
  "The main hall is approximately 84 × 37 m in this model, using NYC Planning's 275 × 120 ft. LPC gives a different length. Passage and wall positions are reconstructed.");
const balcony = level("balcony", "East, West and North Balconies", 5, 2, stone,
  "The architectural balcony plan shows the East, West and North balconies and side returns. The center opening is the escalator bank toward MetLife / 45th Street, shown at the balcony datum in this model. Public circulation between the escalator landing and tenant areas is unverified. The East and West grand stairs use a central upper flight, a shared landing and two lower wings. Dimensions and tread counts are reconstructed. Apple Grand Central occupies the East Balcony and northeast return; table positions and tenant limits are reconstructed, and enclosed retail rooms are not mapped.");
const lower = level("dining", "Dining Concourse", -6, -1, dining,
  "The directory locates the lower hall and Oyster Bar ramp. The paired Oyster Bar approaches use a reconstructed red-tile finish and wall-side metal handrails. Tile specification, brackets, gradients and lower floor elevation are estimates.");
const metro = level("metro", "Metro-North · upper platforms", 0, 0, bronze,
  "Gibbs page 2: upper islands have staggered lengths and a shared concourse approach. Track pairs and termini follow the plan. Model dimensions are registered estimates.");
const metroLower = level("metro-lower", "Metro-North · lower platforms", -10, -2, bronze,
  "Gibbs pages 3–4: the lower islands share a southern headhouse with two links to Dining. The platform level sits below Dining in the 2010 section. Stair widths, runs, the 4 m modeled drop and track beds remain reconstructed.");
const exterior=new T.Group();
scene.add(exterior);
const shellParts={facade:new T.Group(),roof:new T.Group(),viaduct:new T.Group()};
exterior.add(...Object.values(shellParts));
const shellModes=["Solid","Transparent","Hidden"];
const ghostMaterials=new Map();
let shellMode = "Solid", showContext = false, selected = null, plan = false, spread = 0;
const materials = new Map();
function material(color) {
  if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .83, side: T.DoubleSide }));
  return materials.get(color);
}
function mesh(group, geometry, color, x = 0, y = 0, z = 0) {
  const object = new T.Mesh(geometry, material(color));
  object.position.set(x, y, z);
  group.add(object);
  return object;
}
function box(group, x, y, z, width, height, depth, color) {
  return mesh(group, new T.BoxGeometry(width, height, depth), color, x, y, z);
}
const rect = (x0, x1, z0, z1) => [[x0,z0],[x1,z0],[x1,z1],[x0,z1]];
function slab(group, ring, color, holes = [], thickness = .45) {
  const invert = points => points.map(([x,z]) => [x,-z]);
  mesh(group, plateGeo([invert(ring)], thickness, holes.map(invert)), color, 0,-thickness,0);
}
function label(id, x, z, title) {
  const element = document.createElement("span");
  element.className = "pin";
  element.textContent = title;
  $("labels").append(element);
  markers.push({ id, x, z, element });
}

const sidewalk = new T.Group();
street.add(sidewalk);
sidewalk.position.set(entrance.x,0,entrance.z);
sidewalk.rotation.y=-Math.atan2(.29,85.74);
slab(sidewalk, rect(-42,42,0,5.5), stone);
slab(sidewalk, rect(-42,42,5.5,23), 0x4f5051);
slab(sidewalk, rect(-42,42,23,28), stone);
for(const offset of [-19,19]) {
  for(let i=0;i<8;i++) box(sidewalk,offset,.012,6.5+i*2.15,3,.022,.38,0xd7d5ca);
}
const interiorPlan=await loadModel("./interior-plan.json");
const market=level("market","Grand Central Market",2.4,1.3,dining,
  "The architectural plan and terminal directory show a separate middle passage reached by stairs. The modeled rise is approximate.");

const {escalatorBanks:banks,lift,appleGrandCentral:apple}=interiorPlan;
const liftOpening=rect(lift.x-lift.width/2,lift.x+lift.width/2,
  lift.z-lift.width/2,lift.z+lift.width/2);

for(const zone of interiorPlan.main) {
  if(!zone.annotationOnly) {
    const holes=zone.name==="Main Concourse"?[liftOpening]:[];
    slab(main,rect(...zone.box),marble,holes);
  }
  if(zone.label) label("main",...zone.label,zone.name);
}
for(const zone of interiorPlan.balcony) {
  slab(balcony,zone.ring??rect(...zone.box),stone);
  if(zone.label) label("balcony",...zone.label,zone.name);
}
// Open retail on the terminal’s existing stone deck. The east stair throat stays clear.
label("balcony",...apple.label,apple.name);
for (const [x,z,w,d] of apple.tables) {
  const maple=0xc89e6b, screen=0x435365, metal=0xb7b9b8;
  const across=w>d;
  box(balcony,x,.89,z,w,.08,d,maple);
  for (const side of [-1,1]) {
    const dx=across?side*(w/2-.11):0, dz=across?0:side*(d/2-.11);
    box(balcony,x+dx,.425,z+dz,across?.10:w-.10,.85,across?d-.10:.10,maple);
  }
  for (const offset of [-.77,0,.77]) {
    const px=x+(across?offset:0), pz=z+(across?0:offset);
    box(balcony,px,.941,pz,.30,.022,.23,metal);
    box(balcony,px,.997,pz,.27,.108,.026,screen);
  }
}
slab(market,rect(...interiorPlan.market.box),dining);
label("market",...interiorPlan.market.label,interiorPlan.market.name);

// Gibbs pp. 2 and 4, on the shared sheet grid. Model scale and datum are approximate.
const planScale=.69;
const planX=x=>42+(x-343)*planScale;
const planZ=y=>-37+(y-918)*planScale;
const diningFlights=[[326,339],[360,347]].map(pair=>pair.map(planX));
const diningMouthZ=planZ(989), diningStairWidth=2.8;
const diningLandingLeft=diningFlights[0][1], diningLandingRight=diningFlights[1][1];
const diningMouthNorth=diningMouthZ-diningStairWidth/2;
const diningMouthSouth=diningMouthZ+diningStairWidth/2;
slab(lower,interiorPlan.dining.ring,dining,[rect(33.35,34,5,10),rect(50,50.65,5,10),liftOpening]);
slab(lower,rect(diningLandingLeft,diningLandingRight,10.25,diningMouthSouth),dining);
guard(lower,[[diningLandingLeft,10.25],[diningLandingLeft,diningMouthNorth]]);
guard(lower,[[diningLandingRight,10.25],[diningLandingRight,diningMouthNorth]]);
guard(lower,[[diningLandingLeft,diningMouthSouth],[diningLandingRight,diningMouthSouth]],true);
for(const bank of banks) {
  const [left,right]=bank.side;
  const lip=bank.top+(bank.bottom>bank.top?.65:-.65);
  const x0=Math.min(lip,bank.bottom),x1=Math.max(lip,bank.bottom);
  slab(main,rect(left,right,bank.name==="East escalators"?-20.5:-24,-11),marble,[rect(x0,x1,bank.z-2.05,bank.z+2.05)]);
  // Add only the portions outside the existing Dining Concourse deck.
  if(bank.bottom < -4) slab(lower,rect(bank.bottom,-4,-24,-11),dining);
  if(bank.bottom>87) slab(lower,rect(87,bank.bottom,-24,-11),dining);
  guard(main,[[lip,bank.z-2.05],[bank.bottom,bank.z-2.05],[bank.bottom,bank.z+2.05],[lip,bank.z+2.05]]);
}

function guard(group, points, sharedEndPosts=false) {
  group.add(openingGuards(points.map(([x,z]) => new T.Vector3(x,0,z)), [], 1, false, false, sharedEndPosts));
}
for(const stair of interiorPlan.monumentalStairs) {
  const {edge,z,upperHalf,inward}=stair;
  const inner=inward>0?-2:82;
  stoneRail(balcony,box,material,[edge,-37],[edge,z-upperHalf+GRAND_RAIL_INSET],0,stone,GRAND_POST_WIDTH);
  stoneRail(balcony,box,material,[edge,z+upperHalf-GRAND_RAIL_INSET],[edge,13],0,stone,GRAND_POST_WIDTH);
  guard(balcony,[[edge,13],[inner,13],[inner,-46]]);
  buildGrandStair(balcony,stair,{box,material,stoneRail,stone});
}
guard(balcony, [[11,-37],[39,-37],[39,-42]]);
guard(balcony, [[45,-42],[45,-37],[73,-37]]);
guard(balcony, [[-2,-46],[38.95,-46]]);
guard(balcony, [[45.05,-46],[82,-46]]);
guard(main, [[35,0],[35,10]]);
guard(main, [[49,0],[49,10]]);
label("dining",42,7.5,"Whispering Gallery");
for(const passage of interiorPlan.eastPassages) {
  const marketPassage=passage.name==="Grand Central Market";
  const group=marketPassage?market:main;
  const start=marketPassage?95:passage.start;
  for(const z of passage.edges) {
    const base=marketPassage&&z===-25?.4:0;
    box(group,(start+passage.end)/2,(2.8+base)/2,z,passage.end-start,2.8-base,.24,stone);
  }
  // Keep the reconstructed jamb piers on the solid wall strips, outside the opening.
  if(!marketPassage) for(const z of passage.edges) {
    box(main,passage.start+.57,1.7,z,.42,3.4,.38,stone);
  }
}

const links = [];
const point = (id,x,z) => ({id,x,z});
function connector(kind, width, from, to) { links.push({kind,width,from,to,group:null}); }
const streetTop = point("street",entrance.x,entrance.z), streetBottom = point("main",entrance.x,24);
const westRamp=interiorPlan.links.find(link=>link.kind==="ramp");
const [rampTop,rampBottom]=[westRamp.from,westRamp.to].map(end=>point(...end));
connector("ramp", 5, streetTop, streetBottom);
for(const link of interiorPlan.links) {
  if(link.bank==="metlife") {
    const pitch=link.width/4;
    for(let index=0;index<4;index++) {
      const offset=(index-1.5)*pitch;
      const [from,x,z]=link.from, [to,upperX,upperZ]=link.to;
      connector("escalator",pitch,point(from,x+offset,z),point(to,upperX+offset,upperZ));
      links.at(-1).concourseBank=true;
      links.at(-1).metlife=true;
    }
  } else {
    connector(link.kind,link.width,point(...link.from),point(...link.to));
  }
}
label("balcony",42,-44,"To MetLife / 45th Street");
for(const bank of banks) {
  for(const offset of [-.94,.94]) {
    connector("escalator",1.82,point("main",bank.top,bank.z+offset),point("dining",bank.bottom,bank.z+offset));
    links.at(-1).concourseBank=true;
  }
  label("main",bank.top,bank.z-2.6,bank.name);
}
connector("elevator",lift.width,point("dining",lift.x,lift.z),point("main",lift.x,lift.z));
label("main",lift.x,lift.z-2.3,"Elevator · reconstructed");

for (const [x,z,id] of [[42,-18,"main"],[43,-12,"dining"]]) {
  const parent = levels.get(id).group;
  mesh(parent, new T.CylinderGeometry(2,2.15,1.25,12), bronze,x,.625,z);
  if (id === "main") {
    mesh(parent,new T.SphereGeometry(.48,16,10),0xe4bb65,x,2.05,z);
    mesh(parent,new T.CylinderGeometry(.16,.24,.42,12),bronze,x,1.55,z);
  }
}
for (const x of [26.35,62.65]) box(main,x,1.4,16,.55,2.8,8,stone);
for (const x of [7,17,27,37,47,57,67,77]) {
  for (const z of [-34,-1]) box(main,x,2.1,z,.65,4.2,.65,stone);
}
for (const x of [9,24,61,76]) for (const z of [-31,-4]) box(lower,x,1.95,z,.65,3.9,.65,stone);
// Leave the dining-level approach from each escalator bank open across the retail strip.
const diningShops=[[23,-35,11,4],[62,-35,11,4],[68,6,13,4]];
for(const [x,bank] of [[4,banks[0]],[81,banks[1]]]) {
  const halfAisle=2.3;
  const depth=10-halfAisle;
  for(const side of [-1,1]) diningShops.push([x,bank.z+side*(halfAisle+depth/2),5,depth]);
}
for (const [x,z,w,d] of diningShops) {
  box(lower,x,1.2,z,w,2.4,d,0xb48652);
}
box(lower,57,.035,12,8,.07,4,0xc6914b);


function platformBank(parent,id,rows,threshold,color) {
  for(const [index,[x,north,width,tracks,bend=0]] of rows.entries()) {
    const cx=planX(x), end=planZ(north), w=width*planScale, gate=planZ(threshold);
    const tip=planX(x+bend);
    const shoulder=end+Math.min(40,(gate-end)/3);
    slab(parent,[[tip-w*.36,end],[tip+w*.36,end],[cx+w/2,shoulder],
      [cx+w/2,gate],[cx-w/2,gate],[cx-w/2,shoulder]],color);
    for(const [i,track] of tracks.entries()) {
      const side=i===0?-1:1;
      const adjacent=rows[index+side];
      const gap=adjacent?(Math.abs(adjacent[0]-x)-(adjacent[2]+width)/2)*planScale:6;
      const bedWidth=Math.min(3,gap/2-.12);
      if(bedWidth<=0) continue;
      const center=cx+side*(w/2+bedWidth/2+.08);
      const trackEnd=shoulder, length=gate-trackEnd;
      box(parent,center,-1.16,trackEnd+length/2,bedWidth,.26,length,rail);
      const gauge=Math.min(.72,bedWidth*.34);
      for(const dx of [-gauge,gauge]) box(parent,center+dx,-.96,trackEnd+length/2,.08,.12,length,0x8c8d93);
    }
    label(id,cx,gate-9,"Track "+tracks.join(" / "));
  }
}
// Pairs, north termini, and representative platform widths read in PDF points.
const upperRows=[
  [204,423,6,[42,41]],[221,423,6,[40,39]],[237,388,9,[38]],
  [251,388,7,[37,36]],[270,388,7,[35,34]],[290,490,7,[33,32],4],
  [318,404,7,[30,29],2],[335,371,7,[28,27]],
  [353,375,7,[26,25]],[370,510,7,[24,23]],[399,404,8,[21,20]],
  [418,423,8,[19,18]],[436,423,8,[17,16]],[454,441,6,[15,14],-3],
  [474,468,6,[13,11],-3]
];
// The terminal's north gate band joins the concourse at z = -37.
// Split the apron around the Biltmore slabs, which share this elevation.
const apronNorth=planZ(902);
for(const [x0,x1,z0,z1] of [[planX(199),-29,apronNorth,-37],
  [-10,2,apronNorth,-42],[2,planX(478),apronNorth,-37]]) {
  slab(metro,rect(x0,x1,z0,z1),marble);
}
platformBank(metro,"metro",upperRows,902,marble);
const lowerRows=[
  [279,641,7,[115],4],[291,584,7,[114,113],11],[318,556,7,[112,111]],
  [335,557,7,[110,109]],[353,557,7,[108,107]],[370,558,7,[106,105],-3],
  [399,594,7,[104,103],-19],[410,669,7,["103A","102A"],-2],
  [423,710,7,[102,101],-5],[437,704,8,[100]]
];
// The lower islands terminate at the common southern apron, below Dining.
const lowerApronSouth=planZ(984);
slab(metroLower,rect(planX(274),planX(442),planZ(969),lowerApronSouth),dining);
platformBank(metroLower,"metro-lower",lowerRows,969,dining);
for(const [i,[foot,top]] of diningFlights.entries()) {
  const outer=foot+(i===0?-1.55:1.55);
  const inner=foot+(i===0?1.55:-1.55);
  slab(metroLower,rect(Math.min(outer,inner),Math.max(outer,inner),lowerApronSouth,diningMouthSouth),dining);
  guard(metroLower,[[outer,lowerApronSouth],[outer,diningMouthSouth],[foot,diningMouthSouth]]);
  guard(metroLower,[[inner,lowerApronSouth],[inner,diningMouthNorth],[foot,diningMouthNorth]]);
  connector("stairs",diningStairWidth,point("dining",top,diningMouthZ),point("metro-lower",foot,diningMouthZ));
}

buildExterior(shellParts, { box, mesh, material, eastPassages:interiorPlan.eastPassages,
  westBiltmoreOpening:interiorPlan.westBiltmoreOpening });
interiorColumns({main,lower,material,stone});

label("street",entrance.x,entrance.z+2.5,"42nd Street");
label("dining",41,-18,"Dining Concourse");
label("dining",56,12,"Oyster Bar");
label("dining",30,-18,"To Madison Concourse · approximate portal");
label("metro-lower",planX(318),planZ(941),"Track 112 · Madison access documented");

const underground = new Set();
async function loadModel(url) {
  const response=await fetch(url);
  if(!response.ok) throw new Error("Failed to load "+url);
  return response.json();
}
const [station,routeGraph,routeData,{decks:subwayDecks,exitEdges}]=await Promise.all([
  loadModel("../data/stations/grand-central.json"),
  loadModel("../data/venues/grand-central/graph.json"),
  loadModel("../data/venues/grand-central/routes.json"),
  loadModel("./subway-decks.json")
]);
const earthRadius = 6378137, origin = [-73.97792995148,40.752572405877], bearing = terminalBearing;
function local([lon,lat]) {
  const east=(lon-origin[0])*Math.PI/180*earthRadius*Math.cos(origin[1]*Math.PI/180);
  const north=(lat-origin[1])*Math.PI/180*earthRadius;
  return [east*Math.cos(bearing)+north*Math.sin(bearing)-6,30-(north*Math.cos(bearing)-east*Math.sin(bearing))];
}
const stationPoint = ([x,z]) => local([
  station.frame.origin[0]+x/station.frame.m_per_deg_lon,
  station.frame.origin[1]-z/station.frame.m_per_deg_lat
]);
const streetDatum=station.levels.find(f=>f.id==="b1").depth_m;
const stationIds=new Map();
for (const floor of station.levels) {
  if(floor.id==="street") continue;
  const id="rail-"+floor.id, elevation=streetDatum-floor.depth_m;
  stationIds.set(floor.id,id);
  underground.add(id);
  level(id,floor.name,elevation,elevation/5,floor.operator?lirr:subway,
    floor.note+" Evidence for position: "+floor.evidence.place+".");
}

const stationLinks=station.items.filter(it=>stationIds.has(it.from.level)&&stationIds.has(it.to.level));
const toPoint = (endpoint,id=stationIds.get(endpoint.level)) => point(id,...stationPoint(endpoint.xz));
const terminalStairs=new Map([
  ["gct-sw-stair","Shuttle Passage"],["gct-se-stair","42nd Street Passage"]
]);
const terminalApproaches=new Map();
for(const it of stationLinks) {
  const passage=terminalStairs.get(it.id);
  if(passage) {
    const id=it.id+"-landing";
    level(id,passage+" · subway approach",-1.85,-.55,marble,
      "The terminal directory confirms this connection. The approach grades and change in rise are section-based reconstructions; original equipment and plan positions are retained.");
    underground.add(id);
    const top=toPoint(it.from,id), foot=toPoint(it.to);
    const north=it.id==="gct-sw-stair"?7:13;
    const gradeStart=point("main",top.x,north), gradeEnd=point(id,top.x,28);
    const width=it.width_m??2.4;
    const group=levels.get(id).group, half=width/2;
    // Use the stair's actual transverse axis at the threshold.
    const length=Math.hypot(top.x-foot.x,top.z-foot.z);
    const dx=(top.z-foot.z)/length*half, dz=(foot.x-top.x)/length*half;
    const stairEdge=[[top.x-dx,top.z-dz],[top.x+dx,top.z+dz]].sort((a,b)=>a[0]-b[0]);
    const ring=[[top.x-half,28],[top.x+half,28],stairEdge[1],stairEdge[0]];
    slab(group,ring,marble);
    const inset=(half-.06)/half;
    // Tie the landing rails to the fixture posts without doubling the posts.
    for(const [a,b] of [[0,3],[1,2]]) {
      const edge=[top.x+(ring[a][0]-top.x)*inset,gradeEnd.z];
      const mouth=[top.x+(ring[b][0]-top.x)*inset,top.z+(ring[b][1]-top.z)*inset];
      guard(group,[edge,mouth],true);
    }
    connector("ramp",width,gradeStart,gradeEnd);
    links.push({kind:"stairs",width,from:top,to:foot,railContext:true});
    terminalApproaches.set(it.id,{top,foot,gradeStart,gradeEnd});
    label(id,top.x,top.z-2,passage+" · to subway");
    continue;
  }
  const ends=[it.from,it.to].map(p=>toPoint(p));
  const access=({level})=>it.access?.[level]&&stationPoint(it.access[level]);
  links.push({kind:it.kind,width:it.width_m,from:ends[0],to:ends[1],
    rise:it.rise_m,accessA:access(it.from),accessB:access(it.to),railContext:true});
}

// Gibbs pp. 3 and 5 show separate street exits at the ends of these branches.
for(const [id,title,drop,machines] of [
  ["exit-chrysler","Chrysler Building · street exit",7,["chrysler-stair"]],
  ["exit-lex","42nd Street / Lexington · south exit",5,["south42-stair"]],
  ["exit-third","42nd Street / Third Avenue · east exit",8,["ES203","ES204"]]
]) {
  const elevation=streetDatum-drop;
  const group=level(id,title,elevation,elevation/5,stone,
    "Street connection shown in the plan. The local street grade, 2.4 m modeled stair turning depth and street threshold are reconstructed.");
  underground.add(id);
  const pairs=machines.map(machine=>{
    const item=station.items.find(candidate=>candidate.id===machine);
    return {item,top:toPoint(item.from,id),foot:toPoint(item.to)};
  });
  const {top,foot}=pairs[0];
  const outward=new T.Vector2(top.x-foot.x,top.z-foot.z).normalize();
  const across=new T.Vector2(-outward.y,outward.x);
  const edges=pairs.flatMap(({item,top:landing})=>{
    const offset=(landing.x-top.x)*across.x+(landing.z-top.z)*across.y;
    const half=(item.width_m??(item.kind==="stairs"?2.4:1.25))/2;
    return [offset-half,offset+half];
  });
  const left=Math.min(...edges), right=Math.max(...edges);
  const xy=(side,run)=>[top.x+across.x*side+outward.x*run,top.z+across.y*side+outward.y*run];
  const ring=[xy(left,0),xy(right,0),xy(right,3.4),xy(left,3.4)];
  slab(group,ring,stone);
  for(const side of [left+.06,right-.06]) guard(group,[xy(side,0),xy(side,3.4)]);
  label(id,...xy((left+right)/2,3),title);
  for(const {item,top:upper,foot:lower} of pairs) {
    const landingGroup=levels.get(lower.id).group;
    for(const path of exitEdges[item.id]??[]) guard(landingGroup,path.map(stationPoint));
    links.push({kind:item.kind,width:item.width_m,from:upper,to:lower,railContext:true});
  }
}

const directionLabels=new Map([
  ["s-platform","S · Times Sq"],["lex-a","4 5 6 · Downtown"],
  ["lex-b","4 5 6 · Uptown"],["plat7","7 · Hudson Yards / Queens"],
  ["madison-concourse","Madison Concourse · LIRR"],
  ["lirr-upper-west","LIRR · 201 / 202"],["lirr-upper-east","LIRR · 203 / 204"],
  ["lirr-lower-west","LIRR · 301 / 302"],["lirr-lower-east","LIRR · 303 / 304"]
]);
// The B1 and B2 render decks weld the source polygons in the station frame.
for(const [stationLevel,rings] of Object.entries(subwayDecks)) {
  const floor=levels.get(stationIds.get(stationLevel));
  for(const {outer,holes} of rings) {
    slab(floor.group,outer.map(stationPoint),floor.color,holes.map(r=>r.map(stationPoint)),.32);
  }
}
const stationGuards=new Map();
const stationVector = (xz,y=0)=>{const [x,z]=stationPoint(xz);return new T.Vector3(x,y,z);};
for(const zone of station.zones) {
  const id=stationIds.get(zone.level);
  if(!id) continue;
  const floor=levels.get(id);
  const deck=new T.Group();
  deck.position.y=-(zone.drop_m||0);
  floor.group.add(deck);
  const color=zone.kind==="track"?rail:floor.color;
  if(!stationGuards.has(id)) stationGuards.set(id,{posts:[],beams:[]});
  const portals=stationLinks.flatMap(it=>[[it.from,it.to],[it.to,it.from]]
    .filter(([end])=>end.level===zone.level)
    .map(([end,other])=>landingPortal(stationVector(end.xz),stationVector(other.xz),
      it.kind,it.width_m,undefined,floor.elevation<=levels.get(stationIds.get(other.level)).elevation)));
  const addGuard=(ring,closed,rectangular=false)=>deck.add(openingGuards(ring.map(p=>stationVector(p)),portals,
    1,closed,rectangular,false,stationGuards.get(id)));
  for(const {outer,holes=[]} of zone.shape) {
    if(zone.kind==="track"||!subwayDecks[zone.level]) {
      slab(deck,outer.map(stationPoint),color,holes.map(r=>r.map(stationPoint)),.32);
    }
    for(const hole of holes) addGuard(hole,true);
  }
  for(const path of zone.guard_paths||[]) addGuard(path,false,!!zone.circulation_landing);
  if(directionLabels.has(zone.id)) {
    const ring=zone.shape[0].outer.map(stationPoint);
    label(id,...[0,1].map(i=>ring.reduce((sum,p)=>sum+p[i],0)/ring.length),directionLabels.get(zone.id));
  }
}
for(const gate of station.fare_lines) {
  const floor=levels.get(stationIds.get(gate.level));
  floor?.group.add(fareGates(stationVector(gate.a),stationVector(gate.b),0x774761));
}

const terminalWalk = [
  point("street",entrance.x,entrance.z+4),streetTop,streetBottom,point("main",42,15),
  point("main",42,7.5),point("main",42,-9),point("main",46,-18),point("main",46,-9),
  point("main",12,-9),point("main",12,7.5),rampTop,rampBottom,
  point("dining",42,7.5),point("dining",48,6),point("dining",48,-17)
];
const arrival=point("main",46,-18);
const routeChoices=new Map([["terminal",{
  title:"42nd Street → Dining Concourse",destination:"Dining Concourse",points:terminalWalk
}]]);
const graphNodes=new Map(routeGraph.nodes.map(node=>[node.id,node]));
const routeLevels={B2:"b2",LX:"lex",M7:"west7",C7:"central7",P7:"plat7",
  LC:"madison",LU:"lirr_upper",LZ:"lirr_mezz",LL:"lirr_lower"};
for(const [id,title] of [
  ["st-s","Shuttle platform"],["st-lx-a","4 5 6 · Downtown island"],
  ["st-lx-b","4 5 6 · Uptown island"],["st-p7","7 platform"],
  ["st-lu","LIRR · upper platform"],["st-ll","LIRR · lower platform"]
]) {
  const {path}=routeData.routes[id+"|gct-info|0|0|0"];
  const metroLink=path.indexOf("mta-gct-sw")>=0?"gct-sw-stair":"gct-se-stair";
  const approach=terminalApproaches.get(metroLink);
  const lirrRoute=id==="st-lu"||id==="st-ll";
  const last=path.indexOf(lirrRoute?"st-lc-s":metroLink==="gct-sw-stair"?"mta-gct-sw":"mta-gct-se");
  const points=path.slice(0,last+(lirrRoute?1:0)).map(nodeId=>{
    const node=graphNodes.get(nodeId);
    return point(stationIds.get(routeLevels[node.level]),...local(node.lonlat));
  });
  if(!lirrRoute) {
    // Use the same upper landing as the stair mesh, then follow the terminal's own slabs.
    const {top,foot,gradeStart,gradeEnd}=approach;
    points[points.length-1]=foot;
    const west=metroLink==="gct-sw-stair";
    points.push(top,gradeEnd,gradeStart,...(west?[point("main",top.x,4),point("main",6,4),
      point("main",6,-18)]:[point("main",top.x,-18)]),arrival);
  }
  const destination=lirrRoute?"Madison Concourse":"Main Concourse";
  routeChoices.set(id,{title:title+" → "+destination,destination,points,railContext:true});
}
const upperTrackX=planX(353), lowerTrackX=planX(318), [diningFootX,diningTopX]=diningFlights[0];
const diningLandingCenter=(diningLandingLeft+diningLandingRight)/2;
routeChoices.set("metro-upper",{title:"Metro-North · Tracks 25 / 26 → Main Concourse",
  destination:"Main Concourse",points:[point("metro",upperTrackX,planZ(860)),
    point("metro",upperTrackX,-37),point("main",upperTrackX,-18)]});
routeChoices.set("metro-lower",{title:"Metro-North · Tracks 111 / 112 → Dining Concourse",
  destination:"Dining Concourse",points:[point("metro-lower",lowerTrackX,planZ(931)),
    point("metro-lower",lowerTrackX,lowerApronSouth-.65),point("metro-lower",diningFootX,lowerApronSouth-.65),
    point("metro-lower",diningFootX,diningMouthZ),point("dining",diningTopX,diningMouthZ),
    point("dining",diningLandingCenter,diningMouthZ),point("dining",diningLandingCenter,7),
    point("dining",35,7),point("dining",35,-18)]});
let activeRoute=routeChoices.get("terminal");
for(const [id,route] of routeChoices) $("journey").add(new Option(route.title,id));
const route = new T.Group();
scene.add(route);
const marker=mesh(route,new T.SphereGeometry(.53,14,10),0xbeeaff);
let routeOn=false, playing=false, started=0, distance=0, samples=[], total=0, routeLine;
const lineMaterial=new T.LineBasicMaterial({color:0x83baff,depthTest:false});
const routeStatus="Reconstructed public route. Approach grades, stair profiles and elevations are approximate.";
const world = ({id,x,z}) => new T.Vector3(x,levels.get(id).group.position.y,z);
function rebuildRoute() {
  const waypoints=activeRoute.points;
  const points=waypoints.flatMap((p,i) => {
    const a=world(p), next=waypoints[i+1];
    if (!next || a.y===world(next).y) return [a];
    const b=world(next), landing=Math.min(.65,Math.hypot(b.x-a.x,b.z-a.z)*.12);
    const fraction=landing/(Math.hypot(b.x-a.x,b.z-a.z)||1);
    const lead=a.clone().lerp(b,fraction), tail=b.clone().lerp(a,fraction);
    lead.y=a.y;tail.y=b.y;
    return [a,lead,tail];
  }).map(p=>p.add(new T.Vector3(0,.16,0)));
  if(routeLine) { route.remove(routeLine); routeLine.geometry.dispose(); }
  routeLine=new T.Line(new T.BufferGeometry().setFromPoints(points),lineMaterial);
  routeLine.renderOrder=8;
  route.add(routeLine);
  total=0;
  samples=points.map((p,i)=>({ p,d: total+=i?p.distanceTo(points[i-1]):0 }));
}
let floorStack = false;
function refresh() {
  const siblings=[...levels.keys()].filter(id=>underground.has(id)===underground.has(selected))
    .sort((a,b)=>levels.get(a).elevation-levels.get(b).elevation);
  const index=siblings.indexOf(selected);
  const focused=selected?levels.get(selected):null;
  for(const [id,floor] of levels) {
    floor.group.position.y=floor.elevation+floor.order*spread;
    const neighbor=focused && siblings.includes(id) && Math.abs(siblings.indexOf(id)-index)<=1;
    floor.group.visible=(!underground.has(id)||showContext) && (!focused||id===selected||neighbor);
    floor.group.traverse(object=>{
      if(!object.isMesh) return;
      object.userData.baseMaterial ??= object.material;
      if(focused && id!==selected) {
        if(!object.userData.faded) {
          object.userData.faded=object.material.clone();
          Object.assign(object.userData.faded,{transparent:true,opacity:.25,depthWrite:false});
        }
        object.material=object.userData.faded;
      } else object.material=object.userData.baseMaterial;
    });
    floor.button?.setAttribute("aria-pressed",id===selected);
    if(floor.button) floor.button.hidden=underground.has(id)&&!showContext;
  }
  shellParts.facade.position.y=3*spread;
  shellParts.roof.position.y=4*spread;
  shellParts.viaduct.position.y=1.5*spread;
  const ghost=shellMode==="Transparent";
  exterior.visible=!floorStack&&shellMode!=="Hidden"&&!plan&&(!selected||ghost);
  $("shell").textContent="Envelope · "+(floorStack?"Hidden":shellMode);
  $("shell").disabled=plan;
  exterior.traverse(object=>{
    if(!object.isMesh) return;
    const base=object.userData.shellMaterial??=object.material;
    if(ghost&&!ghostMaterials.has(base)) {
      const mat=base.clone();
      Object.assign(mat,{transparent:true,opacity:.17,depthWrite:false});
      ghostMaterials.set(base,mat);
    }
    object.material=ghost?ghostMaterials.get(base):base;
  });
  for(const link of links) {
    if(link.group) {
      scene.remove(link.group);
      link.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
    }
    link.group=null;
    const fromFloor=levels.get(link.from.id), toFloor=levels.get(link.to.id);
    const metlifeBank=link.metlife;
    if(!toFloor.group.visible || (link.railContext&&!showContext) ||
      (!metlifeBank&&(spread||!fromFloor.group.visible))) continue;
    const a=world(link.from),b=world(link.to);
    // Carry the complete flight with its upper landing, keeping its physical rise.
    if(metlifeBank) a.y=b.y-(toFloor.elevation-fromFloor.elevation);
    const color={stairs:0x8f2f6b,escalator:0xae6c4c,elevator:0xc7453a,ramp:0xc19660}[link.kind];
    const access=(xz,y)=>xz&&new T.Vector3(xz[0],y,xz[1]);
    link.group=link.concourseBank?buildConcourseEscalator(a,b,link.width,{upperComb:link.metlife}):
      link.kind==="ramp"&&!link.railContext?buildTerminalRamp(a,b,link.width,link.to.id==="dining"):facility({a,b,kind:link.kind,width:link.width,color,rise:link.rise,
      accessA:access(link.accessA,a.y),accessB:access(link.accessB,b.y)});
    scene.add(link.group);
  }
  $("locate").disabled=!focused;
  $("level-note").textContent=focused?.note??"Select a floor to see its geometry and evidence.";
  rebuildRoute();
  route.visible=routeOn&&!selected&&!spread;
}
function frame(target,zoom) {
  controls.target.copy(target);
  camera.position.copy(target).add(plan?new T.Vector3(0,205,.001):new T.Vector3(105,110,130));
  camera.zoom=zoom;
  camera.updateProjectionMatrix();
  controls.update();
}
const terminalTarget=new T.Vector3(39,9,-8);
for(const [id,floor] of levels) {
  const button=document.createElement("button");
  button.textContent=floor.title;
  button.style.borderLeft="4px solid #"+floor.color.toString(16).padStart(6,"0");
  button.onclick=()=>{ selected=selected===id?null:id;refresh(); };
  floor.button=button;
  $("levels").append(button);
}
$("terminal").onclick=()=>{selected=null;refresh();frame(terminalTarget,1.03);};
$("context").onclick=()=>{
  showContext=!showContext;
  if(!showContext&&underground.has(selected)) selected=null;
  if(!showContext&&activeRoute.railContext) {
    routeOn=playing=false;
    $("route").setAttribute("aria-pressed",false);
    $("play").textContent="Play";
    $("status").textContent=routeStatus;
  }
  if(showContext) {
    if(shellMode==="Solid") shellMode="Transparent";
    frame(new T.Vector3(7,-10,-185),.26);
  } else frame(terminalTarget,1.03);
  $("context").setAttribute("aria-pressed",showContext);
  refresh();
};
$("locate").onclick=()=>{
  const group=levels.get(selected).group;
  frame(new T.Box3().setFromObject(group).getCenter(new T.Vector3()),underground.has(selected)?.5:1.6);
};
$("shell").onclick=()=>{
  shellMode=shellModes[(shellModes.indexOf(shellMode)+1)%shellModes.length];
  refresh();
};
$("view").onclick=()=>{
  plan=!plan;
  controls.enableRotate=!plan;controls.mouseButtons.LEFT=controls.enableRotate?T.MOUSE.ROTATE:T.MOUSE.PAN;
  $("view").textContent=plan?"3D view":"Plan view";
  $("view").setAttribute("aria-pressed",plan);
  frame(controls.target.clone(),camera.zoom);
  refresh();
};
$("spread").oninput=e=>{
  spread=Number(e.target.value);
  playing=false;
  $("play").textContent="Play";
  refresh();
};
$("journey").onchange=()=>{
  activeRoute=routeChoices.get($("journey").value);
  distance=0;
  playing=false;
  $("play").textContent="Play";
  $("status").textContent=routeStatus;
  if(routeOn) {
    showRoute();
    locateRoute();
  } else refresh();
};
function showRoute() {
  if(activeRoute.railContext&&!showContext) $("context").click();
  const frameRoute=!routeOn||selected!==null||spread>0;
  selected=null;spread=0;routeOn=true;
  if(shellMode==="Solid") shellMode="Transparent";
  $("spread").value=0;
  $("route").setAttribute("aria-pressed",true);
  refresh();
  if(frameRoute) locateRoute();
}
function locateRoute() {
  const bounds=new T.Box3().setFromPoints(activeRoute.points.map(world));
  const span=bounds.getSize(new T.Vector3());
  frame(bounds.getCenter(new T.Vector3()),Math.min(1.35,105/Math.max(span.x,span.z,1)));
}
$("route").onclick=()=>{
  if(!routeOn) {showRoute();return;}
  routeOn=playing=false;
  $("route").setAttribute("aria-pressed",false);
  $("play").textContent="Play";
  $("status").textContent=routeStatus;
  refresh();
};
$("play").onclick=()=>{
  if(playing){playing=false;$("play").textContent="Resume";return;}
  showRoute();
  if(distance>=total) distance=0;
  started=performance.now()-distance/4*1000;
  playing=true;
  $("play").textContent="Pause";
};
const pointer=new T.Vector2(), ray=new T.Raycaster();
let press;
renderer.domElement.addEventListener("pointerdown",e=>{press=[e.clientX,e.clientY];});
renderer.domElement.addEventListener("pointerup",e=>{
  if(!press||Math.hypot(e.clientX-press[0],e.clientY-press[1])>4) return;
  const bounds=renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-bounds.left)/bounds.width*2-1,1-(e.clientY-bounds.top)/bounds.height*2);
  ray.setFromCamera(pointer,camera);
  const hit=ray.intersectObjects([...levels.values()].filter(f=>f.group.visible).map(f=>f.group),true)[0];
  let parent=hit?.object;
  while(parent&&!parent.userData.level) parent=parent.parent;
  const id=parent?.userData.level;
  if(id) {selected=selected===id?null:id;refresh();}
});
new ResizeObserver(()=>{
  const {clientWidth:w,clientHeight:h}=$("stage");
  if(!w||!h) return;
  renderer.setSize(w,h);
  const half=65*Math.max(1,h/w);
  camera.left=-half*w/h;camera.right=-camera.left;camera.top=half;camera.bottom=-half;
  camera.updateProjectionMatrix();
}).observe($("stage"));
const initialFloor=viewerParams.get("floor");
if(levels.has(initialFloor)) {
  selected=initialFloor;
  showContext=underground.has(initialFloor);
  $("context").setAttribute("aria-pressed",showContext);
}
if(viewerParams.get("view")==="plan") $("view").click();
else refresh();
if(selected) $("locate").click();
else frame(terminalTarget,1.03);
renderer.setAnimationLoop(now=>{
  if(playing) {
    distance=Math.min(total,(now-started)*.004);
    if(distance>=total) {
      playing=false;
      $("play").textContent="Replay";
      $("status").textContent="Arrived · "+activeRoute.destination;
    } else $("status").textContent="Walking · "+Math.floor(distance)+" / "+Math.round(total)+" m";
  }
  if(route.visible) {
    const i=samples.findIndex(sample=>sample.d>=distance);
    const a=samples[Math.max(0,i-1)], b=samples[Math.max(0,i)];
    marker.position.copy(a.p).lerp(b.p,(distance-a.d)/(b.d-a.d||1)).add(new T.Vector3(0,.42,0));
  }
  controls.update();
  renderer.render(scene,camera);
  for(const {id,x,z,element} of markers) {
    const floor=levels.get(id);
    const position=new T.Vector3(x,floor.group.position.y+1.4,z).project(camera);
    const trackLabel=(id==="metro"||id==="metro-lower")&&selected===null&&camera.zoom<.55;
    element.hidden=trackLabel||(exterior.visible&&shellMode==="Solid"&&!spread&&id!=="street")||!floor.group.visible||(selected!==null&&selected!==id)||Math.abs(position.x)>1||Math.abs(position.y)>1;
    element.style.left=(position.x*.5+.5)*100+"%";
    element.style.top=(.5-position.y*.5)*100+"%";
  }
});

installViewerToolbar({
  planButton: $("view"), spread: $("spread"), envelope: $("shell"),
  renderMode(mode) { floorStack = mode === "stack"; refresh(); },
});

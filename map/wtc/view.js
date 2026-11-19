import { installViewerToolbar } from "../viewer-toolbar.js";
import { createTowerExterior } from "./tower-exterior.js";
import { createOculusExterior } from "./oculus-exterior.js";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { plateGeo } from "../floorkit.js";
import { facility, fareGates, openingGuards, landingPortal } from "../station-fixtures.js";
import { fitRetailPassages, retailCirculation, retailCirculationLabels } from "./retail-circulation.js";
import { addOculusRetail, appleStair } from "./retail.js";
import { addTowerInterior, towerColors, towerFloorNotes } from "./tower.js";
import { levels, areas, points, journeys, appleJourneys, pathDestinations, subwayOculus, sources } from "./model.js";

const response = await fetch("./geometry.json");
if(!response.ok)throw new Error("WTC geometry is unavailable");
const layout = await response.json();
const $ = id => document.getElementById(id);
const stage = $("stage");
if(window.parent!==window){
  $("back").hidden=false;
  $("back").onclick=()=>window.parent.postMessage({type:"close-floors"},location.origin);
}
const scene = new T.Scene();
scene.background = new T.Color("#151514");
const renderer = new T.WebGLRenderer({antialias: true});
renderer.localClippingEnabled = true;
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
stage.prepend(renderer.domElement);
const camera = new T.OrthographicCamera(-100, 100, 100, -100, .1, 2200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.zoomToCursor = true;
controls.minZoom = .3;
controls.maxZoom = 30;
scene.add(new T.HemisphereLight(0xffffff, 0x6f717e, 2.1));
const sun = new T.DirectionalLight(0xffffff, 2.0);
sun.position.set(-110, 260, 180);
scene.add(sun);

const colors = {oculus: 0xdedcd6, one: 0xa08bd6, path: 0x439f98, east: 0xa08bd6, tower: 0x83b7d5,
  track: 0x414650, gate: 0x883a65, stair: 0x8f2f6b, escalator: 0xae6c4c, lift: 0xc7453a, observatory: 0xec8d97};
const mats = new Map();
function material(color) {
  if (!mats.has(color)) mats.set(color, new T.MeshStandardMaterial({color, roughness: .82}));
  return mats.get(color);
}

const model = new T.Group();
scene.add(model);
const groups = Object.fromEntries(Object.entries(levels).map(([id, [,y]]) => {
  const group = new T.Group();
  group.position.y = y;
  model.add(group);
  return [id, group];
}));
const {shell, facadePanels, skylight} = createOculusExterior();
model.add(shell);
function slab(id, ring, color = colors[levels[id][2]], holes = [], thickness = .45) {
  const invert = vertices => vertices.map(([x,z]) => [x,-z]);
  const mesh = new T.Mesh(plateGeo([invert(ring)], thickness, holes.map(invert)), material(color));
  mesh.position.y = -thickness;
  groups[id].add(mesh);
  return mesh;
}
function box(parent, x,y,z,w,h,d,color) {
  const mesh = new T.Mesh(new T.BoxGeometry(w,h,d), material(color));
  mesh.position.set(x,y,z);
  parent.add(mesh);
  return mesh;
}
function guard(id, vertices, links = layout.links) {
  const portals=links.flatMap(({a,b,kind,width})=>[[a,b],[b,a]]
    .filter(([endpoint])=>endpoint[0]===id && kind!=="elevator")
    .map(([endpoint,other])=>landingPortal(new T.Vector3(endpoint[1],0,endpoint[2]),
      new T.Vector3(other[1],0,other[2]),kind,width,undefined,levels[id][1]<levels[other[0]][1])));
  groups[id].add(openingGuards(vertices.map(([x,z])=>new T.Vector3(x,0,z)),portals,1,false));
}

const retailPassages = fitRetailPassages(layout.floors);
for(const {id,ring,holes,color,thickness} of retailPassages.floors)
  if(!["lobby","sky64"].includes(id))slab(id,ring,color,holes,thickness);
addTowerInterior({groups,slab,box});
addOculusRetail({T, groups, floors: layout.floors, slab, box, guard});
for(const [id,x,z,width,depth] of retailPassages.walls)
  box(groups[id],x,1.5,z,width,3,depth,0xdedcd6);
for(const path of retailPassages.guards)guard("balcony",path);
for(const {id,path} of layout.guards)guard(id,path);
for (const z of [40,68]) box(groups.street,-117,.03,z,29,.08,22,0x373c41);

function rails(id,x,z0,z1) {
  for(const side of [-.72,.72])box(groups[id],x+side,-.86,(z0+z1)/2,.12,.16,z1-z0,colors.track);
}
const stationTrackCenters = {
  one: [-60.15, -55.85],
  pathPlatforms: [-117, -103.5, -100.5, -90, -78],
};
for (const [id, centers] of Object.entries(stationTrackCenters)) {
  const end = id === "one" ? 92 : 90;
  for (const x of centers) {
    box(groups[id], x, -1.03, (end-100)/2, id === "pathPlatforms" ? 3 : 3.6, .16, end+100, 0x333841);
    rails(id,x,-100,end);
  }
}

const warning = 0xd7ae55;
function platformEdge(id, x, start, end, inside) {
  box(groups[id],x+inside*.27,.018,(start+end)/2,.46,.036,end-start,warning);
}
platformEdge("one",-62.2,-100,92,-1);
platformEdge("one",-53.8,-100,92,1);
for (const x of [-120,-108,-96,-84]) {
  if (x !== -120) platformEdge("pathPlatforms",x-3,-100,90,1);
  platformEdge("pathPlatforms",x+3,-100,90,-1);
}

// Leave the northbound Oculus approach open in the station-side wall.
for (const [x,start,end] of [[-68.1,-100,92],[-48,-100,-14.2],[-48,-7.8,92]]) {
  box(groups.one,x,1.3,(start+end)/2,.22,2.6,end-start,0xd5d2ca);
}
for (const z of [-80,-58,-36,33,55,77]) {
  for (const x of [-67.25,-48.75]) box(groups.one,x,1.32,z,.21,2.64,.24,0x7f8589);
}
for (const x of [-120,-108,-96,-84]) {
  for (const z of x === -96 ? [-64] : [-64,51]) {
    box(groups.pathPlatforms,x,.43,z,1.05,.12,2.1,0x9ba5aa);
    box(groups.pathPlatforms,x,.22,z,1.05,.44,.18,0x656d73);
  }
}

rails("e",52,-139,-16);
rails("rw",69.5,-33,108);
rails("fulton45",174,-55,86);
rails("fulton23",236,-40,93);
rails("fultonJZ",217,-52,88);
for(const z of [14,30])box(groups.fultonAC,211,-.85,z,112,.15,.15,colors.track);

const towerCrown = new T.Group();
towerCrown.position.set(-208,0,-68);
model.add(towerCrown);
const crownMaterial = new T.MeshStandardMaterial({
  color:0xb9ccdc, transparent:true, opacity:.48, depthWrite:false,
  clippingPlanes:[new T.Plane(new T.Vector3(0,1,0),-levels.tower103[1])],
});
const crownExterior=createTowerExterior();
crownExterior.traverse(object=>{
  if(!object.isMesh) return;
  object.material=Array.isArray(object.material)
    ? object.material.map(()=>crownMaterial)
    : crownMaterial;
});
towerCrown.add(crownExterior);

const towerEnvelope = createTowerExterior();
towerEnvelope.position.copy(towerCrown.position);
model.add(towerEnvelope);
const towerEnvelopeMaterials = new Set();
towerEnvelope.traverse(object => {
  if (object.isMesh) for (const material of [object.material].flat()) towerEnvelopeMaterials.add(material);
});
let floorStack = false;
let towerShellMode = 0;

const verticals = [];
function addGate(id,x,z,axis="z",span=5) {
  const a = new T.Vector3(x,0,z), b = new T.Vector3(x+(axis==="x"?span:0),0,z+(axis==="z"?span:0));
  groups[id].add(fareGates(a,b,colors.gate));
}
// Close the sides of the same-level opening without crossing the gate lanes.
for (const z of [-14,-8]) {
  box(groups.one,-47.5,1.3,z,1,2.6,.22,0xd5d2ca);
  box(groups.one,-47,1.3,z+(z===-14?.2:-.2),.22,2.6,.4,0xd5d2ca);
}
addGate("one",-47,-13.6,"z",5.2);
for(const {gate:[x,z,span],walls} of layout.fareBoundaries){
  addGate("main",x,z,"x",span);
  for(const [[ax,az],[bx,bz]] of walls){
    const wall=box(groups.main,(ax+bx)/2,1.14,(az+bz)/2,Math.hypot(bx-ax,bz-az),2.28,.13,0xc1c0b8);
    wall.rotation.y=-Math.atan2(bz-az,bx-ax);
  }
}
addGate("pathHall",-82.35,11,"z",6);
addGate("east",170,14,"z",6);
addGate("e",54,-27,"x",6);
for(const [id,xs] of [["one",[-65,-51]],["pathPlatforms",[-120,-108,-96,-84]],["rw",[64,75]],["fulton45",[169,179]]]){
  for(const x of xs)for(const z of id === "pathPlatforms" && x === -96 ? [-67] : [-67,48]){
    box(groups[id],x,.37,z,1.3,.7,.42,0xc4c4bc);
    box(groups[id],x,.67,z,.07,1.3,.07,colors.track);
  }
}
verticals.push(...layout.links, appleStair, ...retailCirculation);

const routeObjects = new T.Group();
model.add(routeObjects);
const marker = new T.Mesh(new T.SphereGeometry(1.45,16,10),new T.MeshBasicMaterial({color:0xffffff,depthTest:false}));
marker.renderOrder = 10;
let area = "all", selected = null, isolate = false, plan = false, evidence = false, showRoute = false, playback = null;
const areaViews = new Map();
let half = 220;
let playbackFloor = null;
function currentJourney() {
  const from = $("journey").value;
  if (subwayOculus[from] && $("destination").value === "oculus") return subwayOculus[from];
  return from === "path" ? pathDestinations[$("destination").value] ?? journeys.path : journeys[from];
}
function appleRoute() {
  return $("journey").value === "path" && Boolean(appleJourneys[$("destination").value]);
}
const southRetailRoute = () => $("journey").value === "southRetail";
const pathOculusRoute = () => $("journey").value === "path" && $("destination").value.startsWith("pathOculus");
const subwayOculusRoute = () => currentJourney() === subwayOculus[$("journey").value];
const westHeadhouseRoute = () => $("journey").value === "westHeadhouse";
const retailRoute = () => westHeadhouseRoute() || appleRoute() || southRetailRoute() || pathOculusRoute() || subwayOculusRoute();
const cameraAngle = new T.Vector3(.65,.64,.77).normalize();
const labels = [
  ...retailCirculationLabels,
  ["Reception","lobby",-229,-59],["Central core","lobby",-208,-68],
  ["Elevator lobby","lobby",-208,-87],["Visitor turnstiles","lobby",-208,-46],
  ["Apple Store · C1","balcony",-18,-23],["Apple Store · C2","main",-18,-23],
  ["Northbound · 1","one",-51,-47],["Southbound · 1","one",-65,43],
  ["PATH fare control","pathHall",-82.35,14],
  ["A · Tracks 1 / 2","pathPlatforms",-84,-34],
  ["B · Tracks 2 / 3","pathPlatforms",-96,32],
  ["C · Tracks 4 / 5","pathPlatforms",-111,-34],
  ["D · Track 5","pathPlatforms",-123,32],
  ["Oculus","main",4,0],["WTC Cortlandt · 1","one",-59,-44],["PATH Hall","pathHall",-105,12],
  ["PATH platforms","pathPlatforms",-105,46],["Dey Street","east",116,17],["Fulton Center","fulton45",174,-20],
  ["E","e",56,-48],["R/W","rw",70,59],["One World Observatory","obs100",-208,-68],
].map(([name,id,x,z])=>{
  const node=document.createElement("span");
  node.className="pin";
  node.textContent=name;
  $("labels").append(node);
  return {node,id,x,z};
});
const areaColors = {all:colors.oculus,oculus:colors.oculus,one:colors.one,path:colors.path,east:colors.east,tower:colors.tower};
const elevations = [...new Set(Object.values(levels).map(([,y])=>y))].sort((a,b)=>a-b);
const groundIndex = elevations.indexOf(0);

function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;
  if(!w||!h)return;
  const aspect=w/h;
  renderer.setSize(w,h);
  Object.assign(camera,{left:-half*aspect,right:half*aspect,top:half,bottom:-half});
  camera.updateProjectionMatrix();
}
function position([id,x,z]){return new T.Vector3(x,groups[id].position.y,z);}
function frame(target, span){
  const centre=new T.Vector3(...target);
  controls.target.copy(centre);
  camera.position.copy(centre).addScaledVector(plan?new T.Vector3(0,1,.001):cameraAngle,750);
  camera.zoom=1;
  half=span/2;
  resize();
  controls.update();
}
function clear(group){
  for(const object of [...group.children]){
    object.traverse(o=>{
      if(o.isLine||o.isInstancedMesh){o.geometry.dispose();o.material.dispose();}
    });
    group.remove(object);
  }
}
function displayed(id){
  if(area==="all")return true;
  if(levels[id][2]===area)return true;
  return {oculus:["one","east","entry"],one:["main","balcony","street"],path:["main"],east:["main","balcony"],tower:[]}[area]?.includes(id)??false;
}
function displayLevels(){
  const showTowerEnvelope = area === "tower" && !selected && !plan && !floorStack && towerShellMode !== 2;
  towerEnvelope.visible = showTowerEnvelope;
  $("shell-mode").textContent = "Envelope · " + ["Solid", "Transparent", "Hidden"][floorStack ? 2 : towerShellMode];
  $("shell-mode").hidden = area !== "tower" || plan;
  for (const material of towerEnvelopeMaterials) {
    material.opacity = towerShellMode === 1 ? .14 : 1;
    material.transparent = towerShellMode === 1;
    material.depthWrite = towerShellMode !== 1;
  }
  const selectedHeight=selected ? levels[selected][1] : null;
  const visibleHeights=selected
    ? elevations.filter(y=>Object.keys(levels).some(id=>displayed(id)&&levels[id][1]===y))
    : [];
  const rank=visibleHeights.indexOf(selectedHeight);
  const adjacentHeights=[visibleHeights[rank-1],visibleHeights[rank+1]];
  const retailPlayback = !selected && showRoute && retailRoute() && area === "all";
  for(const [id,group] of Object.entries(groups)){
    const towerFloor=levels[id][2]==="tower";
    const routeContext = !retailPlayback || !towerFloor && (!plan || !playbackFloor || id === playbackFloor);
    group.visible=displayed(id) && routeContext && !(towerFloor && showTowerEnvelope && towerShellMode === 0)
      && (!selected || id===selected || !isolate && adjacentHeights.includes(levels[id][1]));
    group.traverse(o=>{
      if(!group.visible||!o.isMesh)return;
      if(!o.userData.originalMaterial)o.userData.originalMaterial=o.material;
      if(selected&&id!==selected || retailPlayback&&playbackFloor&&levels[id][1]>levels[playbackFloor][1]){
        if(!o.userData.contextMaterial){
          o.userData.contextMaterial=o.material.clone();
          Object.assign(o.userData.contextMaterial,{transparent:true,opacity:Math.min(.24,o.userData.originalMaterial.opacity),depthWrite:false});
        }
        o.material=o.userData.contextMaterial;
      }else o.material=o.userData.originalMaterial;
    });
  }
  shell.visible=!floorStack&&!(showRoute && retailRoute())&&!plan&&!isolate&&["all","oculus","one"].includes(area)&&(!selected||selected==="street");
  towerCrown.visible=!showTowerEnvelope&&!selected&&!plan&&Number($("spread").value)===0
    && (!showRoute||!retailRoute()) && (area==="all"||area==="tower");
}
function stairTreadRun(item){
  if (item.kind!=="stairs" && item.kind!=="escalator") return undefined;
  const rise=Math.abs(levels[item.a[0]][1]-levels[item.b[0]][1]);
  return Math.max(.32,rise*1.85);
}
// Fit the shared fixture's two landing instances to the WTC floor cuts.
function fitWtcLandings(group, a, b, treadRun) {
  const run=Math.hypot(b.x-a.x,b.z-a.z);
  const upperLength=Math.min(.65,run*.12);
  const lowerLength=run-upperLength-Math.min(treadRun,run-2*upperLength);
  const plates=group.children[0];
  if (!plates?.isInstancedMesh || plates.count<2 || lowerLength<=0) return;
  const matrix=new T.Matrix4(), center=new T.Vector3(), rotation=new T.Quaternion(), size=new T.Vector3();
  for(const index of [0,1]){
    plates.getMatrixAt(index,matrix);
    matrix.decompose(center,rotation,size);
    if (Math.abs(size.y-.18)>.001 || Math.abs(size.z-lowerLength)>.001) continue;
    if (index===0) center.y+=.006;
    else size.z=upperLength;
    plates.setMatrixAt(index,matrix.compose(center,rotation,size));
  }
  plates.instanceMatrix.needsUpdate=true;
  plates.computeBoundingSphere();
}
function drawFixtures(){
  for(const item of verticals){
    if(item.mesh){model.remove(item.mesh);item.mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
    const [from]=item.a,[to]=item.b;
    const retailFixture=retailCirculation.includes(item);
    const onPlaybackFloor = playbackFloor === from || playbackFloor === to;
    const retailPlan = retailFixture && (area === "oculus" && (selected === from || selected === to)
      || southRetailRoute() && onPlaybackFloor);
    const pathPlan = [from, to].includes("pathHall") && (
      pathOculusRoute() && onPlaybackFloor || area === "path" && [from, to].includes(selected)
    );
    const subwayPlan = [from, to].includes("one") &&
      (area === "one" && selected === "one" || subwayOculusRoute() && onPlaybackFloor);
    const headhousePlan = westHeadhouseRoute() && onPlaybackFloor &&
      [from,to].includes("street") && [from,to].includes("balcony") && item.a[1]<0;
    const isVisible = groups[from].visible && groups[to].visible || !selected && plan && (retailPlan || pathPlan || subwayPlan || headhousePlan);
    if(!isVisible){item.mesh=null;continue;}
    const a=position(item.a), b=position(item.b);
    const physicalRise=levels[to][1]-levels[from][1];
    if (physicalRise>0) a.y=b.y-physicalRise;
    else b.y=a.y+physicalRise;
    const treadRun=stairTreadRun(item);
    item.mesh=facility({a,b,kind:item.kind,width:item.width,treadRun,
      accessA:item.accessA&&position(item.accessA),accessB:item.accessB&&position(item.accessB),
      rise:Math.abs(levels[from][1]-levels[to][1]),color:item===appleStair?0xc6c0b6:colors[item.kind==="elevator"?"lift":item.kind==="escalator"?"escalator":"stair"]});
    if (treadRun!==undefined) fitWtcLandings(item.mesh,a,b,treadRun);
    if(selected && selected!==from && selected!==to) item.mesh.traverse(object=>{
      if(object.isMesh)Object.assign(object.material,{transparent:true,opacity:.24,depthWrite:false});
    });
    model.add(item.mesh);
  }
}
function routePositions(){return currentJourney()[1].map(name=>position(points[name]).add(new T.Vector3(0,.45,0)));}
function routeSegment(start,end,a,b){
  if (Number($("spread").value)>0) return [a,b];
  const same=(p,q)=>p.every((v,i)=>v===q[i]);
  const item=verticals.find(({a,b})=>same(a,start)&&same(b,end)||same(a,end)&&same(b,start));
  const treadRun=item&&stairTreadRun(item);
  const run=Math.hypot(b.x-a.x,b.z-a.z);
  if(treadRun===undefined||run===0) return [a,b];
  const low=a.y<b.y?a:b, high=low===a?b:a;
  const upper=Math.min(.65,run*.12);
  const travel=Math.min(treadRun,run-2*upper);
  const lower=low.clone().lerp(high,(run-upper-travel)/run);
  const upperPoint=low.clone().lerp(high,(run-upper)/run);
  lower.y=low.y;
  upperPoint.y=high.y;
  return low===a?[a,lower,upperPoint,b]:[a,upperPoint,lower,b];
}
function drawRoute(){
  clear(routeObjects);
  if(!showRoute)return;
  const names=currentJourney()[1], coords=routePositions();
  for(let i=1;i<coords.length;i++){
    const start=$("journey").value;
    const assumed=westHeadhouseRoute() || southRetailRoute() || pathOculusRoute() || subwayOculusRoute() || start==="north" || (appleRoute()
      ? i <= names.indexOf("pathTop") || i >= names.indexOf("appleDoor")
      : names.indexOf("towerDoor")<i||start==="path"&&i<=names.indexOf("pathTop")||(start==="e"&&i<=names.indexOf("eastHallWest")||start==="fulton"&&i<6));
    if (selected && [points[names[i-1]][0],points[names[i]][0]].some(id=>!groups[id].visible)) continue;
    if (plan && playbackFloor && retailRoute() && [points[names[i-1]][0],points[names[i]][0]].every(id=>id!==playbackFloor)) continue;
    const mat=assumed?new T.LineDashedMaterial({color:0xffa875,dashSize:1.5,gapSize:.9}):new T.LineBasicMaterial({color:0x80b6ff});
    mat.depthTest=false;
    const line=new T.Line(new T.BufferGeometry().setFromPoints(routeSegment(points[names[i-1]],points[names[i]],coords[i-1],coords[i])),mat);
    line.computeLineDistances();
    line.renderOrder=8;
    routeObjects.add(line);
  }
  if(playback)routeObjects.add(marker);
}
function refresh(){
  const spread=Number($("spread").value);
  // The steel stays on its street datum. Cladding peels outward and the crown lifts.
  for (const {group,x,z} of facadePanels) group.position.set(x*spread*.8,0,z*spread*.85);
  skylight.position.y=spread*1.1;
  $("layer-key").textContent=spread>0 && !plan && ["all","oculus","one"].includes(area) && !isolate && (!selected || selected==="street")
    ? "Skylight above · Glazing outside · Steel fixed at street level · Floors below"
    : "Oculus · Retail (amber) · Subway · PATH · Tower floors";
  if(area==="tower"){
    const key=$("layer-key");
    key.replaceChildren(...Object.entries({
      lobby:"Lobby",office:"Office",amenity:"Tenant amenity",systems:"Building systems",
      observation:"Observatory",core:"Core",elevators:"Elevator banks",circulation:"Circulation",
    }).map(([use,label])=>{
      const item=document.createElement("span");
      const swatch=document.createElement("i");
      swatch.style.backgroundColor="#"+new T.Color(towerColors[use]).getHexString();
      item.append(swatch,label);
      return item;
    }));
  }

  for(const [id,[,y]] of Object.entries(levels)){
    const rank = elevations.indexOf(y)-groundIndex;
    const offset=y<=0 ? rank*spread*.55
      : levels[id][2]==="tower" ? rank*spread*.23 : 0;
    groups[id].position.y=y+offset;
  }
  displayLevels();
  drawFixtures();
  drawRoute();
}
function button(label,fn){
  const b=document.createElement("button");
  b.type="button";b.textContent=label;b.onclick=fn;return b;
}
function updateControls(){
  for(const b of $("districts").children)b.setAttribute("aria-pressed",String(b.dataset.area===area));
  const list=$("levels");
  const scroll=list.scrollTop;
  list.replaceChildren();
  const floorEntries=Object.entries(levels).sort(([,a],[,b])=>area==="tower"?b[1]-a[1]:0);
  for(const [id,[label,y,section,tier,use]] of floorEntries){
    if(area==="all"&&section==="tower"&&!["lobby","entry","sky64","obs100","obs101","obs102"].includes(id))continue;
    if(area!=="all"&&area!==section)continue;
    const b=button(label+(evidence?" · "+tier:""),()=>{
      selectFloor(id);
      list.querySelector(`[data-floor="${id}"]`)?.focus({preventScroll:true});
    });
    b.dataset.floor=id;
    b.style.borderLeft="4px solid #"+new T.Color(towerColors[use]??areaColors[section]).getHexString();
    b.setAttribute("aria-pressed",String(id===selected));
    list.append(b);
  }
  list.scrollTop=scroll;
  $("locate").disabled=$("isolate").disabled=!selected;
  $("isolate").setAttribute("aria-pressed",String(isolate));
  $("level-note").textContent=selected
    ? `${groups[selected].position.y.toFixed(1)} m displayed · ${levels[selected][3]} · plan outline, partitions and fixture positions are approximate.`
      + (levels[selected][2] === "path" ? " Stair and escalator landing orientations are modeled assumptions. See Evidence for the platform-by-platform record." : "")
    : "Select a floor to see its evidence.";
  if(towerFloorNotes[selected]) $("level-note").textContent+=" "+towerFloorNotes[selected];
}
function openArea(id){
  areaViews.set(area,{position:camera.position.clone(),target:controls.target.clone(),zoom:camera.zoom,half,plan});
  area=id;selected=null;isolate=false;
  const saved=areaViews.get(id);
  if(saved&&saved.plan===plan&&id!=="all"){
    camera.position.copy(saved.position);controls.target.copy(saved.target);camera.zoom=saved.zoom;half=saved.half;
    resize();controls.update();
  }else frame(areas[id][1],areas[id][2]);
  refresh();updateControls();
}
for(const [id,[title]] of Object.entries(areas)){
  const b=button(title,()=>openArea(id));b.dataset.area=id;$("districts").append(b);
}
for(const [id,[title]] of Object.entries(journeys))$("journey").add(new Option(title,id));
function updateDestinations(){
  const from=$("journey").value, destination=$("destination");
  const previous=destination.value;
  const options=[new Option("One World Observatory","observatory")];
  if(from==="path") for(const [id,[title]] of Object.entries(pathDestinations))options.push(new Option(title,id));
  if(subwayOculus[from]) options.push(new Option(subwayOculus[from][0],"oculus"));
  destination.replaceChildren(...options);
  if(options.some(option=>option.value===previous)) destination.value=previous;
  $("path-destination").hidden=options.length===1;
}
updateDestinations();
for(const [title,url] of sources){
  const li=document.createElement("li"),a=document.createElement("a");
  a.href=url;a.textContent=title;a.target="_blank";a.rel="noreferrer";li.append(a);$("sources").append(li);
}
function stop(){
  playback=null;
  playbackFloor=null;
  $("play").textContent="Play";
  marker.removeFromParent();
}
function updateRoute(){
  $("show-route").setAttribute("aria-pressed",String(showRoute));
  if (subwayOculusRoute()) {
    $("route-note").textContent=$("journey").value==="north"
      ? "Northbound platform → exit fare control → Oculus C1 balcony. Exact gate lane is approximate."
      : "Southbound platform → stairs → exit fare control → West Concourse C2. Exact stair and gate landings are approximate.";
    displayLevels();drawFixtures();drawRoute();
    return;
  }
  if (pathOculusRoute()) {
    const accessNotes = {
      pathOculus: "Lift landings and the fare lane are approximate.",
      pathOculusStairs: "Scenario. The modeled north stair’s public access and landing orientation are unverified.",
      pathOculusEscalator: "Scenario. The specific escalator’s landings, orientation and operating direction are unverified.",
    };
    const destination = $("destination").value;
    const access = {pathOculus: "lift", pathOculusStairs: "stairs", pathOculusEscalator: "escalator"}[destination];
    $("route-note").textContent=`Platform B → ${access} → PATH fare control → stair → Oculus C2. ${accessNotes[destination]}`;
    displayLevels();drawFixtures();drawRoute();
    return;
  }
  if (westHeadhouseRoute()) {
    $("route-note").textContent="Greenwich Street → west headhouse stairs → Oculus C1. Landings are reconstructed.";
    displayLevels();drawFixtures();drawRoute();
    return;
  }
  if (southRetailRoute()) {
    $("route-note").textContent="C1 balcony → center aisle → outer stairs → C2 main hall. Dashed amber marks reconstructed geometry.";
    displayLevels();drawFixtures();drawRoute();
    return;
  }
  if (appleRoute()) {
    $("route-note").textContent=showRoute
      ? "PATH lift → exit fare control → Oculus C2 → Apple. The C1 option uses the store stair and reaches the balcony entrance. Dashed amber marks approximate geometry."
      : "Destination · " + currentJourney()[0] + ".";
    displayLevels();drawFixtures();drawRoute();
    return;
  }
  displayLevels();drawFixtures();
  $("route-note").textContent=showRoute
    ?"Blue marks the reconstructed public approach. Dashed amber marks assumed geometry, including the route beyond the Observatory door."
    :"Destination · One World Observatory, floor 100.";
  drawRoute();
}
$("show-route").onclick=()=>{stop();showRoute=!showRoute;updateRoute();};
$("journey").onchange=()=>{stop();updateDestinations();updateRoute();};
$("destination").onchange=()=>{stop();updateRoute();};
$("play").onclick=()=>{
  if(playback){stop();updateRoute();return;}
  $("spread").value=0;
  showRoute=true;selected=null;isolate=false;area="all";
  const start=points[currentJourney()[1][0]];
  frame([start[1],levels[start[0]][1],start[2]],southRetailRoute() || westHeadhouseRoute()?45:110);
  playback={index:0,start:performance.now()};
  playbackFloor=retailRoute()?start[0]:null;
  $("play").textContent="Stop";
  refresh();updateControls();updateRoute();
};
$("spread").oninput=()=>{stop();refresh();updateControls();};
$("isolate").onclick=()=>{isolate=!isolate;refresh();updateControls();};
function locateFloor(id, fit=false){
  model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(groups[id]);
  if(bounds.isEmpty())return;
  const target=bounds.getCenter(new T.Vector3());
  camera.position.add(target.clone().sub(controls.target));
  controls.target.copy(target);
  if(fit){
    const size=bounds.getSize(new T.Vector3());
    const span=Math.hypot(size.x,size.y,size.z)*1.2;
    const viewSpan=Math.min(camera.right-camera.left,camera.top-camera.bottom);
    camera.zoom=Math.max(camera.zoom,Math.min(controls.maxZoom,viewSpan/Math.max(span,1)));
    camera.updateProjectionMatrix();
  }
  controls.update();
}
function selectFloor(id){
  const firstSelection=!selected;
  selected=selected===id && !isolate ? null : id;
  isolate=false;
  stop();
  refresh();
  if(selected)locateFloor(selected,firstSelection);
  updateControls();
}
$("locate").onclick=()=>{if(selected)locateFloor(selected);};

const floorRaycaster=new T.Raycaster();
const canvas=renderer.domElement;
let floorPointer=null;
canvas.addEventListener("pointerdown",event=>{
  floorPointer=event.isPrimary && event.button===0 ? [event.clientX,event.clientY] : null;
});
canvas.addEventListener("pointercancel",()=>{floorPointer=null;});
canvas.addEventListener("pointerup",event=>{
  const start=floorPointer;
  floorPointer=null;
  if(!start || !event.isPrimary || Math.hypot(event.clientX-start[0],event.clientY-start[1])>5)return;
  const rect=canvas.getBoundingClientRect();
  const pointer=new T.Vector2(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height);
  floorRaycaster.setFromCamera(pointer,camera);
  const visibleFloors=Object.entries(groups).filter(([,group])=>group.visible);
  const floorRoots=new Map(visibleFloors.map(([id,group])=>[group,id]));
  const hits=floorRaycaster.intersectObjects([...floorRoots.keys()],true);
  for(const {object} of hits){
    let root=object;
    while(root && !floorRoots.has(root))root=root.parent;
    const id=floorRoots.get(root);
    if(id){selectFloor(id);break;}
  }
});
$("view").onclick=()=>{
  plan=!plan;$("view").setAttribute("aria-pressed",String(plan));$("view").textContent=plan?"3D view":"Plan view";
  const target=controls.target.clone(),distance=camera.position.distanceTo(target);
  camera.position.copy(target).addScaledVector(plan?new T.Vector3(0,1,.001):cameraAngle,distance);
  controls.enableRotate=!plan;controls.mouseButtons.LEFT=controls.enableRotate?T.MOUSE.ROTATE:T.MOUSE.PAN;controls.update();refresh();updateControls();
};
$("evidence").onclick=()=>{
  evidence=!evidence;
  $("evidence").setAttribute("aria-pressed",String(evidence));
  updateControls();
};
new ResizeObserver(resize).observe(stage);
const query=new URLSearchParams(location.search);
const initialFloor=query.get("floor");
if(initialFloor&&levels[initialFloor]?.[2]==="tower"){
  area="tower";selected=initialFloor;
  frame([-208,levels[selected][1],-68],94);
}else if(["one","pathHall","pathPlatforms"].includes(initialFloor)){
  selected=initialFloor;
  area=levels[selected][2];
  frame(areas[area][1],areas[area][2]);
}else if(initialFloor==="balcony"||initialFloor==="main"){
  area="oculus";selected=initialFloor;
  frame([0,levels[selected][1],0],115);
}else if(query.get("area")==="oculus"){
  area="oculus";frame(areas.oculus[1],areas.oculus[2]);
}else if(query.has("tower")){
  area="tower";frame(areas.tower[1],areas.tower[2]);
}else frame(areas.all[1],areas.all[2]);
refresh();updateControls();updateRoute();
if(initialFloor&&selected)$("levels").querySelector(`[data-floor="${selected}"]`)?.scrollIntoView({block:"nearest"});

renderer.setAnimationLoop(now=>{
  if(playback){
    const coords=routePositions(),i=playback.index;
    const duration=Math.max(850,Math.min(4800,coords[i].distanceTo(coords[i+1])*35));
    const t=Math.min(1,(now-playback.start)/duration);
    const names=currentJourney()[1];
    const segment=routeSegment(points[names[i]],points[names[i+1]],coords[i],coords[i+1]);
    const curve=new T.CurvePath();
    for(let j=1;j<segment.length;j++)curve.add(new T.LineCurve3(segment[j-1],segment[j]));
    marker.position.copy(curve.getPoint(Math.max(0,t)));
    const delta=marker.position.clone().sub(controls.target).multiplyScalar(.075);
    controls.target.add(delta);camera.position.add(delta);
    const name=names[i+1];
    if (retailRoute()) {
      const nextFloor=points[names[t<.5?i:i+1]][0];
      if (nextFloor!==playbackFloor) {
        playbackFloor=nextFloor;
        displayLevels();drawFixtures();drawRoute();
      }
    }
    const note="Next · "+levels[points[name][0]][0];
    if($("route-note").textContent!==note)$("route-note").textContent=note;
    if(t===1){
      playback.index++;playback.start=now;
      if(playback.index===coords.length-1){
        const arrival=westHeadhouseRoute() ? "Oculus C1 west entrance." : subwayOculusRoute() ? currentJourney()[0]+"." : southRetailRoute() || pathOculusRoute() ? "Oculus C2 main hall." : appleRoute()
          ? ($("destination").value==="appleC1"?"Apple Store, C1 balcony entrance.":"Apple Store, C2 main hall entrance.")
          : "One World Observatory, floor 100.";
        const finalFloor=playbackFloor;
        stop();
        if (retailRoute()) playbackFloor=finalFloor;
        $("route-note").textContent="Arrived · "+arrival;
      }
    }
  }
  controls.update();
  const w=stage.clientWidth,h=stage.clientHeight;
  for(const {node,id,x,z} of labels){
    const p=position([id,x,z]);p.y+=1;p.project(camera);
    const retailPin=/retail passage|^Lift /.test(node.textContent);
    const stationPin=/^(Northbound · 1|Southbound · 1|PATH fare control)$/.test(node.textContent) || /^[A-D] · Track/.test(node.textContent);
    node.hidden=(stationPin&&area!==levels[id][2])||(retailPin&&(area!=="oculus"||!evidence||id!==(selected||"balcony")))||(node.textContent.startsWith("Apple Store")&&(!(area==="oculus"||showRoute&&appleRoute())||id!==(selected||playbackFloor||"balcony")))||(id==="lobby"&&selected!=="lobby")||!groups[id].visible||p.z>1||Math.abs(p.x)>.95||Math.abs(p.y)>.94;
    if(!node.hidden){node.style.left=`${(p.x+1)*w/2}px`;node.style.top=`${(1-p.y)*h/2}px`;}
  }
  renderer.render(scene,camera);
});

$("shell-mode").onclick = () => {
  towerShellMode = (towerShellMode + 1) % 3;
  refresh();
};
installViewerToolbar({
  planButton: $("view"), spread: $("spread"), envelope: $("shell-mode"),
  renderMode(mode) { floorStack = mode === "stack"; refresh(); },
});

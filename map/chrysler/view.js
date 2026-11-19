import * as T from "three";
import { buildEnvelope } from "./envelope.js";
import { plateGeo } from "../floorkit.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

document.querySelector("#back-to-map").addEventListener("click", () => {
  if (window.parent !== window) {
    window.parent.postMessage({type:"close-floors"}, location.origin);
  } else {
    location.assign("../#chrysler");
  }
});

const stage = document.querySelector("#stage");
const status = document.querySelector("#status");
const routeButton = document.querySelector("#route");
const playButton = document.querySelector("#play");
const envelopeButton = document.querySelector("#envelope");
const spreadInput = document.querySelector("#spread");
const facadeLift = {value: 0};
const envelopeModes = ["Solid", "Transparent", "Hidden"];
let envelopeMode = 0;
const labels = document.querySelector("#labels");
const buttons = [...document.querySelectorAll("[data-view]")];
const scene = new T.Scene();
scene.background = new T.Color(0x191a1d);
const renderer = new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
stage.prepend(renderer.domElement);
const camera = new T.OrthographicCamera(-1,1,1,-1,.1,2000);
const orbit = new OrbitControls(camera,renderer.domElement);
orbit.enableDamping = true;
scene.add(new T.HemisphereLight(0xf4f0e9,0x767482,2.6));
const sun = new T.DirectionalLight(0xfff1dd,2.25);
sun.position.set(-100,220,130);
scene.add(sun);
const context = new T.Group();
const interior = new T.Group();
const station = new T.Group();
const stationLayers = new Map();
const highCoreButton = document.querySelector("#high-core");
const highCore = new T.Group();
scene.add(highCore);
const crownButton = document.querySelector("#crown-core");
let showCrown = false;
let showHighCore = false;
let coreOverlaps = [];
const floorPicker = document.querySelector("#floor");
const floorNote = document.querySelector("#floor-note");
const floorLayers = new Map();
const floorPickables = [];
const ghostMaterials = new WeakMap();
const spreadStep = .55;
const floorStack = new T.Group();
scene.add(floorStack);
const coreColors = {
  elevators: 0xcf3a31, stairs: 0x8f2f6b, service: 0x565b63,
  restrooms: 0xb4bcc8, corridor: 0xfbe3bd
};
const plateEdges = new T.LineBasicMaterial({color: 0x23343e, transparent: true, opacity: .55});
const floorMaterials = {
  traced: materialForFloor(0x668ca7), inferred: materialForFloor(0x485764)
};

function materialForFloor(color) {
  return new T.MeshStandardMaterial({color, roughness: .85});
}

function addFloorMesh(group, polygon, height, surface, y = 0) {
  const [outline, ...holes] = polygon;
  const mesh = new T.Mesh(plateGeo([outline], height, holes), surface);
  mesh.position.y = y;
  group.add(mesh);
  if (y < 0) {
    const edges = new T.LineSegments(mesh.geometry.userData.edges, plateEdges);
    edges.position.y = y;
    group.add(edges);
  }
  return mesh;
}

function addShaftWalls(group, ring, height, material) {
  const center = ring.reduce(([x,y], [u,v]) => [x + u / ring.length, y + v / ring.length], [0,0]);
  const inset = distance => ring.map(([u,v]) => [
    u - Math.sign(u - center[0]) * distance,
    v - Math.sign(v - center[1]) * distance
  ]);
  addFloorMesh(group, [inset(.02), inset(.14)], height, material);
}

function addStairStudy(group, ring, material) {
  // One solid profile avoids coplanar faces between individual tread blocks.
  const xs = ring.map(([x]) => x), ys = ring.map(([,y]) => y);
  const x = Math.min(...xs), y = Math.min(...ys);
  const width = Math.max(...xs) - x, length = Math.max(...ys) - y;
  const alongX = width > length;
  const run = alongX ? width : length;
  const cross = alongX ? length : width;
  const profile = new T.Shape();
  profile.moveTo(.01 * run, -.24);
  profile.lineTo(.01 * run, 0);
  profile.lineTo(.2 * run, 0);
  for (let step = 1; step <= 7; step++) {
    const rise = step * .17;
    profile.lineTo((.2 + (step-1) * .085) * run, rise);
    profile.lineTo((.2 + step * .085) * run, rise);
  }
  profile.lineTo(.99 * run, 1.19);
  profile.lineTo(.99 * run, -.24);
  profile.closePath();
  const mesh = new T.Mesh(new T.ExtrudeGeometry(profile, {
    depth: cross * .92, bevelEnabled: false
  }), material);
  if (alongX) {
    mesh.position.set(x, 0, -y - length * .96);
  } else {
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(x + width * .04, 0, -y);
  }
  group.add(mesh);
}

function insideRing([x,y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax,ay] = ring[i], [bx,by] = ring[j];
    if ((ay > y) !== (by > y) && x < ax + (bx-ax) * (y-ay) / (by-ay)) inside = !inside;
  }
  return inside;
}

function buildFloorStack(data, footprint) {
  const coreMaterials = Object.fromEntries(Object.entries(coreColors).map(([key, color]) => [key, materialForFloor(color)]));
  for (const [index, floor] of data.floors.entries()) {
    const group = new T.Group();
    const layout = data.layouts[floor.layout];
    const rings = floor.rings ?? layout?.rings ?? [[footprint]];
    const components = layout?.components ?? floor.inferredCore ?? {};
    const shafts = layout?.components.elevators ?? [];
    const stairs = layout?.stairs ?? [];
    const coreHeight = Math.min(2.35, (data.floors[index + 1]?.elev ?? floor.elev + 3) - floor.elev - .3);
    const surface = floor.layout ? floorMaterials.traced : floorMaterials.inferred;
    for (const [outline, ...holes] of rings) {
      const openings = [...shafts, ...stairs].filter(ring => insideRing(ring[0], outline));
      const slab = addFloorMesh(group, [outline, ...holes, ...openings], .24, surface, -.24);
      slab.userData.floorId = floor.id;
      floorPickables.push(slab);
    }
    for (const [kind, polygons] of Object.entries(components)) {
      for (const polygon of polygons) {
        if (kind === "elevators" && layout) {
          const floorToFloor = (data.floors[index + 1]?.elev ?? floor.elev + 3) - floor.elev;
          addShaftWalls(group, polygon, floorToFloor - .28, coreMaterials.elevators);
        } else if (kind === "stairs" && layout) {
          if (stairs.includes(polygon)) addStairStudy(group, polygon, coreMaterials.stairs);
        } else {
          addFloorMesh(group, [polygon], kind === "corridor" ? .025 : coreHeight,
            layout ? coreMaterials[kind] : floorMaterials.inferred);
        }
      }
    }
    for (const [kind, polygon] of Object.entries(floor.program ?? {})) {
      const color = {gallery: 0xd0a96f, machinery: 0x565b63, tank: 0x327994}[kind];
      if (kind === "gallery") {
        const outer = rings[0][0].map(([u,v]) => [33.05 + (u - 33.05) * .93, 28.55 + (v - 28.55) * .93]);
        addFloorMesh(group, [outer, polygon], .04, materialForFloor(color));
        addFloorMesh(group, [polygon], 1.2, materialForFloor(coreColors.service));
      } else {
        addFloorMesh(group, [polygon], kind === "tank" ? 2.2 : 1.4, materialForFloor(color));
      }
    }
    for (const {kind, ring} of floor.equipment ?? []) {
      addFloorMesh(group, [ring], kind === "tank" ? 2 : .8,
        materialForFloor(kind === "tank" ? 0x327994 : 0x565b63));
    }
    group.traverse(object => {
      if (!object.material) return;
      object.userData.normalMaterial = object.material;
      if (!ghostMaterials.has(object.material)) {
        const ghost = object.material.clone();
        ghost.transparent = true;
        ghost.opacity *= .28;
        ghost.depthWrite = false;
        ghostMaterials.set(object.material, ghost);
      }
    });
    floorStack.add(group);
    floorLayers.set(floor.id, {floor, index, group});
    const label = floor.label ? floor.id + " · " + floor.label : floor.id === "Lower" ? "Lower level" : "Floor " + floor.id;
    floorPicker.add(new Option(label + (floor.label ? "" : floor.layout ? " · historic plan" : " · massing"), floor.id));
  }
  floorPicker.disabled = false;
  highCoreButton.disabled = false;
  crownButton.disabled = false;
  coreOverlaps = data.overlaps.map(link => {
    const color = coreColors[link.kind];
    const geometry = new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(new Float32Array(6), 3));
    const line = new T.Line(geometry, new T.LineDashedMaterial({color, dashSize: .24, gapSize: .13}));
    line.frustumCulled = false;
    highCore.add(line);
    return {...link, line};
  });
}

const route = new T.Group();
scene.add(context,station,interior,route);
route.visible = false;
let glazing;
let tower, mode, frameHeight, distance = 0, playing = false, path, marker;
const pins = [];
const palette = {
  stone: 0xdbc5a7, marble: 0x753b39, bronze: 0xa57e4a,
  door: 0xc3a36b, floor: 0xc3a780, station: 0x786da2,
  track: 0x454253, walk: 0x7eb8ff, inferred: 0xe7ab64
};
const material = color => new T.MeshStandardMaterial({color,roughness:.85});
function box(parent,name,x,y,z,w,h,d,color) {
  const mesh = new T.Mesh(new T.BoxGeometry(w,h,d),material(color));
  mesh.name = name;
  mesh.position.set(x,y,z);
  parent.add(mesh);
  return mesh;
}
function slab(parent,name,[outline,...holes],y,color) {
  const ring = points => points.map(([u,v]) => new T.Vector2(u,v));
  const shape = new T.Shape(ring(outline));
  shape.holes = holes.map(points => new T.Path(ring(points)));
  const mesh = new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false}),material(color));
  mesh.rotation.x = -Math.PI/2;
  mesh.position.y = y-.16;
  mesh.name = name;
  parent.add(mesh);
}
function wall(name,[u,v],[x,z]) {
  const mesh = box(interior,name,(u+x)/2,2.7,-(v+z)/2,Math.hypot(x-u,z-v),5.4,.32,palette.marble);
  mesh.rotation.y = Math.atan2(z-v,x-u);
}
function pin(text,x,y,z,views) {
  const el = document.createElement("span");
  el.className = "pin";
  el.textContent = text;
  labels.append(el);
  pins.push({el,position:new T.Vector3(x,y,z),views});
}
async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Data unavailable: ${url}`);
  return response.json();
}

function buildLobby({rooms, openings, footprint, booth}) {
  const openingById = new Map(openings.map(opening => [opening.id, opening]));
  const halls = rooms.filter(room => room.category === "elevator-lobby");
  for (const room of rooms) {
    if (room.category === "core") {
      const pier = new T.Shape(room.polygon[0].map(([u, v]) => new T.Vector2(u, v)));
      const mesh = new T.Mesh(new T.ExtrudeGeometry(pier, {depth: 5.4, bevelEnabled: false}), material(palette.marble));
      mesh.name = room.id;
      mesh.rotation.x = -Math.PI / 2;
      interior.add(mesh);
      continue;
    }
    slab(interior, room.id, room.polygon, 0, palette.floor);
    const outline = room.polygon[0];
    for (let i = 1; i < outline.length; i++) {
      const [a, b] = [outline[i - 1], outline[i]];
      if (room.id === "l-lobby" && [[0, 0], [1, 0], [1, 60.5]].some(([axis, value]) =>
        a[axis] === value && b[axis] === value)) continue;
      if (room.id === "l-lobby" && i === 1) {
        // Leave the four hall mouths open along the concourse's east partition.
        const onPartition = v => [a[0] + (b[0]-a[0]) * (v-a[1]) / (b[1]-a[1]), v];
        let edge = a;
        for (const hall of halls) {
          const [, , south, north] = hall.polygon[0];
          wall(room.id, edge, onPartition(north[1]));
          edge = onPartition(south[1]);
          slab(interior, hall.id + " approach", [[north, south, edge, onPartition(north[1])]], 0, palette.floor);
        }
        wall(room.id, edge, b);
        continue;
      }
      if (room.category === "elevator-lobby" && i === 3) continue;
      wall(room.id, a, b);
    }
  }
  for (const opening of openings) {
    const [[a, b], [c, d]] = opening.segment;
    const beam = box(interior, opening.id, (a+c)/2, 3.7, -(b+d)/2, Math.hypot(c-a,d-b), .35, .38, palette.door);
    beam.rotation.y = Math.atan2(d-b,c-a);
    for (const [u,v] of opening.segment) box(interior, opening.id, u, 1.85, -v, .38, 3.7, .38, palette.door);
  }
  const [u,v] = booth;
  box(interior,"Information booth",u,.7,-v,1.2,1.4,2.4,palette.marble);
  const ring = footprint.map(([u,v]) => new T.Vector3(u,-.015,-v));
  interior.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(ring),new T.LineBasicMaterial({color:0xa2998a})));
  for (const [id,label] of [["op-lex","Lexington Avenue"],["op-42","E 42nd St"],["op-43","E 43rd St"]]) {
    const [[a,b],[c,d]] = openingById.get(id).segment;
    pin(label,(a+c)/2,0,-(b+d)/2,["lobby","plan"]);
  }
  pin("Information booth",u,1.65,-v,["lobby","plan","section"]);
}

function resize() {
  const {clientWidth:w,clientHeight:h} = stage;
  const half = frameHeight/2;
  camera.left=-half*w/h;
  camera.right=half*w/h;
  camera.top=half;
  camera.bottom=-half;
  camera.updateProjectionMatrix();
  renderer.setSize(w,h);
}
const views = {
  "podium-shell": {target:[31,31,-29],offset:[-85,32,68],height:85,
    note:"Street entrances and storefronts follow the 1930 plan. Upper openings follow the historic typical floor and setback sheets."},
  "crown-shell": {target:[33,252,-29],offset:[-92,24,61],height:138,
    note:"Nirosta crown study. Four matching faces. A radial row of inset triangular windows follows each modeled arch ledge."},
  stack:{target:[31,105,-30],offset:[-180,105,155],height:255,note:"Blue plates use historic drawings. Gray plates are inferred from exterior massing. Crown and spire are shown in the envelope."},
  tower:{target:[26,153,-30],offset:[-370,145,340],height:375,note:"The envelope shows the podium, setback shaft, silver crown and spire. Window openings follow historic plan traces and registered typical bays. Unresolved levels remain blank."},
  lobby:{target:[24,1,-30],offset:[-62,70,55],height:82,note:"Cutaway view of the historic lobby topology. Openings, piers and halls follow the 1930 plan. Heights are schematic."},
  plan:{target:[24,0,-30],offset:[0,130,0],height:79,note:"Street grid up. Choose a floor to inspect its plate and documented core components."},
  section:{target:[22,2,-30],offset:[0,0,120],height:49,note:"Working section along the Lexington entrance axis. Street and lobby are shown at the same provisional model datum."}
};
function setView(name, { keepCamera = false } = {}) {
  mode=name;
  const arrival=route.visible && (name==="lobby" || name==="plan");
  const spread = Number(spreadInput.value);
  const spreading = spread > 0;
  const visibleEnvelope = spreading ? 2 : envelopeMode;
  const selected = floorLayers.get(floorPicker.value);
  const crown = (name === "stack" || name === "section") && showCrown && !selected;
  const upper = name === "stack" && showHighCore && !selected;
  const inspect = selected && (name === "stack" || name === "plan" || name === "section");
  const floorHeight = (floor, index) => floor.elev + (index - 1) * spread * spreadStep;
  let preset = arrival ? {target:[-52,-3,-7],offset:name==="plan"?[0,170,0]:[-105,155,135],height:165} : views[name];
  if (inspect) {
    preset = {...views[name], target:[31, floorHeight(selected.floor, selected.index), -30],
      height: 91, offset: name === "stack" ? [-78, 67, 61] : views[name].offset};
  } else if (name === "stack") {
    preset = {...preset, target:[31,126 + spread * 19,-30], height:300 + spread * 37};
  }
  if (crown) preset = {target:[33,236 + spread * 37,-28.55],
    offset:name === "section" ? [0,0,120] : [-75,46,65],height:69 + spread * 5};
  if (upper) preset = {target:[33,202 + spread * 33.55,-29],offset:[-64,32,58],height:53 + spread * 4};
  if (!keepCamera) {
    orbit.target.set(...preset.target);
    camera.position.copy(orbit.target).add(new T.Vector3(...preset.offset));
    camera.up.set(0,name==="plan"?0:1,name==="plan"?-1:0);
    camera.zoom=1;
    orbit.enabled=name!=="section" && name!=="plan";
    camera.lookAt(orbit.target);
    if (orbit.enabled) orbit.update();
    frameHeight=preset.height;
  }
  renderer.domElement.style.cursor = name === "plan" ? "grab" : "";
  renderer.clippingPlanes=name==="section"?[new T.Plane(new T.Vector3(0,0,-1),crown ? -28.55 : -30)]:[];
  if (tower) {
    tower.visible = visibleEnvelope !== 2 && (name === "tower" || name === "crown-shell" || name === "podium-shell" || name === "lobby" || name === "stack");
    tower.position.y = 0;
    if (glazing) {
      glazing.visible = tower.visible;
      for (const mesh of glazing.children) {
        mesh.material.transparent = visibleEnvelope === 1;
        mesh.material.opacity = visibleEnvelope === 1 ? .28 : 1;
        mesh.material.depthWrite = visibleEnvelope !== 1;
      }
    }
    facadeLift.value = tower.position.y;
    tower.traverse(object => {
      if (!object.isMesh) return;
      const translucent = visibleEnvelope === 1;
      object.material.transparent = translucent;
      object.material.opacity = translucent ? 0.16 : 1;
      object.material.depthWrite = !translucent;
    });
  }
  floorStack.visible = Boolean(inspect) || (visibleEnvelope !== 0 &&
    (name === "stack" || name === "tower" || crown));
  for (const {floor, index, group} of floorLayers.values()) {
    group.position.y = floorHeight(floor, index);
    const neighbor = inspect && name === "stack" && Math.abs(index - selected.index) === 1;
    group.visible = crown ? floor.crown === true : upper ? Number(floor.id) >= 59 && Number(floor.id) <= 65
      : !inspect || floor.id === selected.floor.id || neighbor;
    group.traverse(object => {
      const original = object.userData.normalMaterial;
      if (original) object.material = neighbor ? ghostMaterials.get(original) : original;
    });
  }
  interior.visible = inspect ? selected.floor.id === "01" : !["tower", "podium-shell", "crown-shell"].includes(name) || envelopeMode !== 0;
  if (crown || (name === "stack" && !inspect)) interior.visible = visibleEnvelope !== 0 && !upper && !crown;
  highCore.visible = upper;
  for (const {from,to,point,line} of coreOverlaps) {
    const lower = floorLayers.get(from);
    const higher = floorLayers.get(to);
    const position = line.geometry.getAttribute("position");
    position.setXYZ(0, point[0], lower.group.position.y, -point[1]);
    position.setXYZ(1, point[0], higher.group.position.y, -point[1]);
    position.needsUpdate = true;
    line.computeLineDistances();
  }
  floorNote.textContent = crown
    ? "Crown study · historic 71st-floor gallery and reported 73½ equipment deck. The 1930 account calls the tank level 74. Elevations and equipment sizes are schematic."
    : upper
    ? "Dashed lines show plan overlap between adjacent floors. Lift service and stair continuity are unverified. The 1930 schedule places tower shuttle service across 60–61; individual shafts are unidentified. Van Alen describes a central fire tower. Its plan trace aligns at 60–61; the side stair and cross-floor landings remain unresolved. Local treads and landings are schematic."
    : inspect
    ? (selected.floor.label ? selected.floor.label + " · schematic geometry" + (selected.floor.id === "M" ? " · reported 15,000 US gal tank north, two lift motors south" : "") : selected.floor.layout ? "Historic plan trace" : "Exterior-derived plate with schematic core") +
      " · model elevation " + selected.floor.elev + " m"
    : "Lower level, floors 01–65, and schematic crown levels. All elevations are provisional.";
  station.visible = arrival;
  for (const [level, group] of stationLayers) {
    group.position.y = -spread * (level === "LX" ? 2 : 1);
  }
  envelopeButton.textContent = "Envelope · " + envelopeModes[visibleEnvelope];
  envelopeButton.disabled = spreading || name === "plan" || name === "section";
  for (const button of buttons) button.setAttribute("aria-pressed",String(button.dataset.view===name));
  document.querySelector("#view-note").textContent = crown
    ? "Crown interior · schematic section through the historic program. Floor and equipment dimensions are provisional."
    : views[name].note;
  resize();
}

async function load() {
  const [study, model, floors] = await Promise.all([
    json("./model.json"), new GLTFLoader().loadAsync("../data/landmarks/chrysler.glb"), json("./floors.json")
  ]);
  // The GLB uses east/up/south; the study uses the venue's street grid.
  const bearing = T.MathUtils.degToRad(study.frame.u_bearing_deg);
  const [lon0, lat0] = study.frame.origin_lonlat;
  function local([lon,lat]) {
    const east=(lon-lon0)*111320*Math.cos(T.MathUtils.degToRad(lat0));
    const north=(lat-lat0)*110540;
    return [east*Math.cos(bearing)+north*Math.sin(bearing),-east*Math.sin(bearing)+north*Math.cos(bearing)];
  }
  tower=model.scene;
  glazing = buildEnvelope(tower, study, floors, {facadeLift});
  scene.add(tower);
  scene.add(glazing);
  const levels = new Map(study.levels.map(level => [level.id, level]));
  buildLobby(study);
  buildFloorStack(floors, study.footprint);
  const street = levels.get("L").elev_m;
  for (const feature of study.station) {
    const {id,level,category}=feature.properties;
    if (!["B2","LX"].includes(level) || !["transit-hall","concourse","platform","track"].includes(category)) continue;
    const polygons=feature.geometry.type==="Polygon"?[feature.geometry.coordinates]:
      feature.geometry.type==="MultiPolygon"?feature.geometry.coordinates:[];
    if (!stationLayers.has(level)) {
      const layer = new T.Group();
      stationLayers.set(level, layer);
      station.add(layer);
    }
    for(const polygon of polygons) slab(stationLayers.get(level),id,polygon.map(ring=>ring.map(local)),
      levels.get(level).elev_m-street-(category==="track"?.3:0),palette[category==="track"?"track":"station"]);
  }

  const nodes=new Map(study.nodes.map(node=>[node.id,node]));
  const journey = study.arrival;
  const points=journey.map(id=>{
    const {uv:[u,v],level}=nodes.get(id);
    return new T.Vector3(u,levels.get(level).elev_m-street+.22,-v);
  });
  if(journey.at(-1)!=="lex-front" || points.some(p=>!p.toArray().every(Number.isFinite))) {
    throw new Error("Arrival route does not terminate at its modeled exterior node.");
  }
  path=new T.CurvePath();
  for(let i=1;i<points.length;i++){
    const line=new T.LineCurve3(points[i-1],points[i]);
    if(line.getLength()<.01) continue;
    path.add(line);
    const mesh=new T.Mesh(new T.TubeGeometry(line,1,.26,8,false),material(
      journey[i]==="mta-gc-42s" || nodes.get(journey[i]).level!=="L"?palette.inferred:palette.walk
    ));
    route.add(mesh);
  }
  for(const [point,color] of [[points[0],palette.walk],[points.at(-1),palette.door]]) {
    const dot=new T.Mesh(new T.SphereGeometry(.78,16,12),material(color));
    dot.position.copy(point);
    route.add(dot);
  }
  marker=new T.Mesh(new T.SphereGeometry(.58,16,12),new T.MeshBasicMaterial({color:0xffffff}));
  marker.position.copy(points[0]);
  route.add(marker);
  routeButton.disabled=playButton.disabled=false;
  status.textContent="Ready · Arrival ends outside the Lexington Avenue doors.";
  setView(mode);
}
function showRoute(show) {
  route.visible=show;
  if (show) {
    showHighCore = false;
  showCrown = false;
    spreadInput.value = 0;
    floorPicker.value = "";
    envelopeMode = 2;
  }
  routeButton.setAttribute("aria-pressed",String(show));
  routeButton.textContent=show?"Hide route":"Show route";
  if (!show) {
    playing=false;
    playButton.textContent="Play";
    status.textContent="Route hidden.";
  }
  setView(show && (mode==="tower" || mode==="crown-shell" || mode==="podium-shell" || mode==="section" || mode==="stack")?"lobby":mode);
}
for (const button of buttons) button.onclick=()=>{
  if (route.visible && ["tower","podium-shell","crown-shell","section","stack"].includes(button.dataset.view)) showRoute(false);
  showHighCore = false;
  if (["tower", "podium-shell", "crown-shell", "lobby"].includes(button.dataset.view)) spreadInput.value = 0;
  if (button.dataset.view !== "section" && button.dataset.view !== "stack") showCrown = false;
  if (["tower", "podium-shell", "crown-shell"].includes(button.dataset.view) && envelopeMode === 2) envelopeMode = 0;
  if (button.dataset.view === "stack" && envelopeMode === 0) envelopeMode = 1;
  if (button.dataset.view === "lobby" && envelopeMode === 0) envelopeMode = 2;
  setView(button.dataset.view);
};
envelopeButton.onclick = () => {
  envelopeMode = (envelopeMode + 1) % envelopeModes.length;
  if (envelopeMode === 2) {
    showHighCore = false;
    showCrown = false;
    floorPicker.value = "";
    setView("stack");
  } else if (envelopeMode === 1 && (mode === "lobby" || mode === "crown-shell" || mode === "podium-shell")) {
    if (route.visible) showRoute(false);
    floorPicker.value = "";
    setView("stack");
  } else {
    setView(mode);
  }
};
highCoreButton.onclick = () => {
  if (route.visible) showRoute(false);
  showCrown = false;
  showHighCore = true;
  floorPicker.value = "";
  envelopeMode = 2;
  setView("stack");
};
crownButton.onclick = () => {
  if (route.visible) showRoute(false);
  showHighCore = false;
  showCrown = true;
  floorPicker.value = "";
  envelopeMode = 1;
  setView("stack");
};
floorPicker.onchange = () => {
  showHighCore = false;
  showCrown = false;
  if (route.visible) showRoute(false);
  envelopeMode = 2;
  setView(mode === "plan" ? "plan" : "stack");
};
spreadInput.oninput = () => {
  if (route.visible) showRoute(false);
  if (Number(spreadInput.value) > 0) {
    setView("stack");
  } else {
    setView(mode);
  }
};
routeButton.onclick=()=>showRoute(!route.visible);
playButton.onclick=()=>{
  if(playing) {
    playing=false;
    playButton.textContent="Resume";
    status.textContent="Paused.";
    return;
  }
  if(!route.visible) showRoute(true);
  if(distance>=path.getLength()) distance=0;
  playing=true;
  playButton.textContent="Pause";
  status.textContent="Playing modeled arrival…";
};
const ray = new T.Raycaster();
const canvas = renderer.domElement;
let pointerDown;
let planDrag;
canvas.addEventListener("pointerdown", event => {
  if (mode !== "plan" || !event.isPrimary || event.button !== 0 || event.pointerType !== "mouse") return;
  planDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
});
canvas.addEventListener("pointermove", event => {
  if (mode !== "plan" || event.pointerId !== planDrag?.id || !(event.buttons & 1)) return;
  const dx = event.clientX - planDrag.x, dy = event.clientY - planDrag.y;
  if (!planDrag.moved) {
    if (Math.hypot(dx, dy) < 5) return;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
    planDrag.moved = true;
    pointerDown = undefined;
  }
  const rect = canvas.getBoundingClientRect();
  const offset = new T.Vector3(
    -dx * (camera.right - camera.left) / (rect.width * camera.zoom),
    dy * (camera.top - camera.bottom) / (rect.height * camera.zoom), 0
  ).applyQuaternion(camera.quaternion);
  camera.position.add(offset);
  orbit.target.add(offset);
  planDrag.x = event.clientX;
  planDrag.y = event.clientY;
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  canvas.addEventListener(type, event => {
    if (event.pointerId !== planDrag?.id) return;
    planDrag = undefined;
    canvas.style.cursor = mode === "plan" ? "grab" : "";
  });
}
canvas.addEventListener("pointerdown", event => {
  if (event.isPrimary && event.button === 0) pointerDown = [event.clientX, event.clientY];
});
canvas.addEventListener("pointercancel", () => { pointerDown = undefined; });
canvas.addEventListener("pointerup", event => {
  const start = pointerDown;
  pointerDown = undefined;
  if (!start || !event.isPrimary || Math.hypot(event.clientX - start[0], event.clientY - start[1]) >= 5 ||
      !floorStack.visible || route.visible) return;
  const rect = canvas.getBoundingClientRect();
  ray.setFromCamera(new T.Vector2(
    2 * (event.clientX - rect.left) / rect.width - 1,
    1 - 2 * (event.clientY - rect.top) / rect.height
  ), camera);
  const hit = ray.intersectObjects(floorPickables.filter(mesh => mesh.parent.visible), false)[0];
  if (!hit) return;
  const id = hit.object.userData.floorId;
  floorPicker.value = floorPicker.value === id ? "" : id;
  showHighCore = false;
  showCrown = false;
  if (floorPicker.value) envelopeMode = 2;
  setView(mode === "plan" ? "plan" : "stack", {keepCamera: Boolean(floorPicker.value)});
});
new ResizeObserver(resize).observe(stage);
setView("tower");
load().catch(error=>{status.textContent=error.message; console.error(error);});
let previous=performance.now();
renderer.setAnimationLoop(now=>{
  if (orbit.enabled) orbit.update();
  if(playing){
    const total=path.getLength();
    distance=Math.min(total,distance+Math.min((now-previous)/1000,.1)*22);
    path.getPoint(distance/total,marker.position);
    if(distance===total){
      playing=false;
      playButton.textContent="Replay";
      status.textContent="Arrived outside the Lexington Avenue entrance.";
    }
  }
  previous=now;
  for(const {el,position,views:visibleIn} of pins){
    const p=position.clone().project(camera);
    el.hidden=!interior.visible || !visibleIn.includes(mode) || Math.abs(p.x)>1 || Math.abs(p.y)>1;
    if(!el.hidden){
      el.style.left=`${(p.x+1)*50}%`;
      el.style.top=`${(1-p.y)*50}%`;
    }
  }
  renderer.render(scene,camera);
});

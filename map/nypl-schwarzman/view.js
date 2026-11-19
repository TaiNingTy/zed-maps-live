import { installViewerToolbar } from "../viewer-toolbar.js";
import { floorY } from "./datums.js";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { createLibraryModel } from "./model.js";

const el = id => document.getElementById(id);
el("back-to-map").onclick=()=>{
  if (window.parent !== window) window.parent.postMessage({type:"close-floors"},location.origin);
  else location.assign("../#nypl-schwarzman");
};
const stage = el("stage");
const scene = new T.Scene();
scene.background = new T.Color(0x171716);
const renderer = new T.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
stage.append(renderer.domElement);
const camera = new T.PerspectiveCamera(39, 1, .1, 1000);
camera.position.set(174, 114, 125);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 12, 0);
const courtView=new URLSearchParams(location.search).get("court");
if(courtView==="north" || courtView==="south"){
  const side=courtView==="north"?-1:1;
  controls.target.set(-1,24,side*22);
  camera.position.set(52,63,side*73);
}

controls.update();
scene.add(new T.HemisphereLight(0xfff8eb, 0x847f76, 2));
const sun = new T.DirectionalLight(0xfff2dd, 2);
sun.position.set(100, 160, -30);
scene.add(sun);

const {shell, levels, east, north} = createLibraryModel();
scene.add(shell, ...levels.map(level=>level.group));
const blue = new T.MeshBasicMaterial({color:0x7facff,depthTest:false});

const path = [
  [4,1,north-5],[4,1,-53],[10,1,-47],[15,floorY.ground+1,-40.2],[15,floorY.first+1,-40.2],
  ...[ [18,-40.2],[24,-43],[24,-23],[29,-23],[35,-29] ].map(([x,z])=>[x,floorY.first+1,z])
];
const line=new T.Group();
scene.add(line);
const marker=new T.Mesh(new T.SphereGeometry(.7,16,12),blue);
marker.renderOrder=11;
scene.add(marker);
marker.visible=false;
let selected=-1, shellMode=0, plan=false, routeVisible=false, animation=null;
const buttons=[];
function opacity(group,value){
  group.traverse(o=>{
    if(!o.isMesh)return;
    if(o.userData.baseOpacity===undefined) o.userData.baseOpacity=o.material.opacity;
    o.material=o.userData.original??(o.userData.original=o.material.clone());
    const opacity=value*o.userData.baseOpacity;
    o.material.opacity=opacity;
    if(o.material.transparent!==(opacity<1)){
      o.material.transparent=opacity<1;
      o.material.needsUpdate=true;
    }
    o.material.depthWrite=opacity===1;
  });
}
let floorStack = false;
function update(){
  const spread=Number(el("spread").value);
  levels.forEach((l,i)=>{
    l.group.position.y=l.y+i*spread;
    l.group.visible=selected<0||Math.abs(selected-i)<=1;
    opacity(l.group,selected<0||selected===i?1:.22);
    for(const child of l.group.children){
      if(child.userData.ceiling) child.visible=!plan && !floorStack && shellMode===0;
    }
    // A flight is anchored to its lower floor but serves both endpoints.
    if(selected===i+1 && i>=1){
      for(const child of l.group.children){
        if(child.name.includes(" stair · ")) opacity(child,1);
      }
    }
  });
  shell.position.y=levels.length*spread;
  shell.visible=!floorStack&&!plan&&shellMode!==2;
  opacity(shell,shellMode===1?.09:1);
  el("shell").textContent="Envelope · "+(floorStack?"Hidden":["Solid","Transparent","Hidden"][shellMode]);
}
for(const [i,l] of levels.entries()){
  const button=document.createElement("button");
  button.textContent=l.name;
  button.setAttribute("aria-pressed","false");
  button.onclick=()=>{
    selected=selected===i?-1:i;
    if(selected>=0 && shellMode===0) shellMode=1;
    buttons.forEach((b,j)=>b.setAttribute("aria-pressed",String(j===selected)));
    el("note").textContent=selected<0?"All floors visible.":l.note;
    setRoute(false);
    update();
  };
  el("levels").append(button);
  buttons.push(button);
}
el("shell").onclick=()=>{
  shellMode=(shellMode+1)%3;
  update();
};
let perspective;
el("view").onclick=()=>{
  plan=!plan;
  update();
  if(plan){
    perspective=camera.position.clone().sub(controls.target);
    camera.position.copy(controls.target).add(new T.Vector3(0,perspective.length(),.01));
  } else camera.position.copy(controls.target).add(perspective);
  controls.enableRotate=!plan;controls.mouseButtons.LEFT=controls.enableRotate?T.MOUSE.ROTATE:T.MOUSE.PAN;
  controls.update();
  el("view").textContent=plan?"3D view":"Plan view";
  el("view").setAttribute("aria-pressed",String(plan));
};
el("portico").onclick=()=>{
  if(plan) el("view").click();
  if(selected>=0) buttons[selected].click();
  setRoute(false);
  el("spread").value=0;
  shellMode=0;
  controls.target.set(east+2,15,0);
  camera.position.set(east+55,17,1);
  controls.update();
  update();
};
el("spread").oninput=()=>{setRoute(false);update()};
const points=path.map(p=>new T.Vector3(...p));
const distance=[0];
for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  distance.push(distance.at(-1)+a.distanceTo(b));
  const mesh=new T.Mesh(new T.CylinderGeometry(.23,.23,a.distanceTo(b),8),blue);
  mesh.position.copy(a).lerp(b,.5);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());
  mesh.renderOrder=10;
  line.add(mesh);
}
function setRoute(show){
  routeVisible=show;
  line.visible=show;
  marker.visible=false;
  animation=null;
  el("route").setAttribute("aria-pressed",String(show));
  el("status").textContent="The library documents this sequence. The route geometry is approximate.";
  if(show){
    if(selected>=0) buttons[selected].click();
    routeVisible=true;
    line.visible=true;
    el("route").setAttribute("aria-pressed","true");
    shellMode=2;
    el("spread").value=0;
    update();
  }
}
el("route").onclick=()=>setRoute(!routeVisible);
el("play").onclick=()=>{
  setRoute(true);
  marker.visible=true;
  animation=performance.now();
};
const resize = new ResizeObserver(()=>{
  camera.aspect=stage.clientWidth/Math.max(1,stage.clientHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth,stage.clientHeight);
});
resize.observe(stage);
setRoute(false);
update();
renderer.setAnimationLoop(now=>{
  if(animation!==null){
    const travelled=Math.min(distance.at(-1),(now-animation)*.005);
    const i=Math.max(1,distance.findIndex(d=>d>=travelled));
    marker.position.copy(points[i-1]).lerp(points[i],(travelled-distance[i-1])/(distance[i]-distance[i-1]));
    if(travelled===distance.at(-1)){
      animation=null;
      el("status").textContent="Arrived at the modeled Room 115 visitor desk.";
    }
  }
  renderer.render(scene,camera);
});

installViewerToolbar({
  planButton: el("view"), spread: el("spread"), envelope: el("shell"),
  renderMode(mode) { floorStack = mode === "stack"; update(); },
});

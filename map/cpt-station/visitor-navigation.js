import * as THREE from "three";

export function visitorNavigation({stage,scene,camera,controls,floors,journey,planSvg,prepare,select,close}) {
  const bar=document.createElement("section");
  bar.style.cssText="position:absolute;top:78px;left:16px;right:16px;z-index:12;max-width:550px;padding:10px;border-radius:12px;background:var(--card);color:var(--ink);box-shadow:0 3px 16px #0003";
  bar.innerHTML=`<div class="seg" style="display:flex;flex-wrap:wrap;gap:4px" aria-label="Penthouse visitor demo">
    <button>Start</button><button>Play</button><button>Next</button>
    <button aria-pressed="false">2D</button><button aria-pressed="true">3D</button><button>Close</button>
  </div><p role="status" style="margin:8px 2px 0"></p>`;
  stage.append(bar);
  const [start,play,next,plan,model,exit]=bar.querySelectorAll("button");
  start.title="Start the penthouse visitor route";
  const status=bar.querySelector("[role=status]");
  const overlay=document.createElement("div");
  overlay.style.cssText="position:absolute;inset:0;z-index:7;background:var(--bg,#171719);display:none;align-items:center;justify-content:center;padding:120px 12px 68px";
  stage.append(overlay);
  const marker=new THREE.Group();
  const blue=new THREE.MeshBasicMaterial({color:0x58aaff,depthTest:false});
  const add=(geometry,x,y)=>{const mesh=new THREE.Mesh(geometry,blue);mesh.position.set(x,y,0);mesh.renderOrder=30;marker.add(mesh);};
  add(new THREE.SphereGeometry(.16,12,8),0,1.51);
  add(new THREE.BoxGeometry(.34,.55,.22),0,1.06);
  for (const x of [-.10,.10]) add(new THREE.BoxGeometry(.12,.75,.14),x,.4);
  const cone=new THREE.Mesh(new THREE.CircleGeometry(1.65,20,-Math.PI/2-.45,.9).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x58aaff,transparent:true,opacity:.35,depthTest:false,side:THREE.DoubleSide}));
  cone.rotation.y=Math.PI;cone.position.y=.06;cone.renderOrder=29;marker.add(cone);
  scene.add(marker);
  const routeLine=new THREE.LineSegments(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({color:0x58aaff,depthTest:false}));
  routeLine.renderOrder=28;scene.add(routeLine);
  let active=false, playing=false, mode="3D", step=0, elapsed=0, last=0, floorId="", card=false, cleared=false, arrived=false;
  const elevation=f=>floors[f].elev_m;
  const position=q=>new THREE.Vector3(q.p[0],elevation(q.floor),-q.p[1]);
  const legs=journey.map(leg=>{
    const lengths=leg.path.slice(1).map((q,i)=>position(q).distanceTo(position(leg.path[i])));
    const length=lengths.reduce((a,b)=>a+b,0);
    const duration=leg.kind==="elevator"?3.5:leg.kind==="walk"?Math.max(.6,length/18):1.8;
    return {...leg,lengths,length,duration};
  });
  function draw(){
    const leg=legs[step];
    let remaining=leg.length*Math.min(1,elapsed/leg.duration),i=0;
    while(i<leg.lengths.length-1 && remaining>=leg.lengths[i]) remaining-=leg.lengths[i++];
    const a=leg.path[i],b=leg.path[i+1]||a,t=leg.lengths[i]?Math.min(1,remaining/leg.lengths[i]):0;
    const pos=position(a).lerp(position(b),t);
    const id=t>=1?b.floor:a.floor;
    if (id!==floorId) {
      floorId=id; select(id);
      overlay.innerHTML=planSvg(floors[id]);
      const svg=overlay.firstElementChild;
      svg.style.cssText="width:100%;height:100%;max-width:none;max-height:none;background:none";
      svg.removeAttribute("id");
      const [originX,originY]=svg.dataset.origin.split(",").map(Number);
      const segments=legs.flatMap(({path})=>path.slice(1).flatMap((q,i)=>
        q.floor===id&&path[i].floor===id?[[path[i],q]]:[]));
      const lines=segments.map(pair=>pair.map(({p})=>`${p[0]-originX},${originY-p[1]}`).join("L"));
      svg.insertAdjacentHTML("beforeend",`<path d="${lines.map(line=>"M"+line).join("")}" fill="none" stroke="#58aaff" stroke-width=".55" stroke-linecap="round"/>`);
      routeLine.geometry.dispose();
      routeLine.geometry=new THREE.BufferGeometry().setFromPoints(segments.flatMap(pair=>pair.map(q=>position(q).setY(elevation(id)+.1))));
      svg.insertAdjacentHTML("beforeend",`<g class="visitor-mark"><path d="M0 0 L-2.6 -4.6 A5.3 5.3 0 0 1 2.6 -4.6 Z" fill="#58aaff" opacity=".4"/><circle r="1.5" fill="#58aaff" stroke="white" stroke-width=".35"/></g>`);
    }
    const svg=overlay.firstElementChild, [x0,y1]=svg.dataset.origin.split(",").map(Number);
    const dx=b.p[0]-a.p[0], dy=b.p[1]-a.p[1];
    const angle=Math.atan2(dx,dy)*180/Math.PI;
    svg.querySelector(".visitor-mark").setAttribute("transform",`translate(${pos.x-x0} ${y1+pos.z}) rotate(${angle})`);
    marker.position.copy(pos); marker.rotation.y=-angle*Math.PI/180;
    if(mode==="3D"){
      const target=pos.clone().add(new THREE.Vector3(0,1,0));
      const shift=target.clone().sub(controls.target);
      controls.target.copy(target); camera.position.add(shift);
      if (camera.top-camera.bottom>95) {
        const ratio=95/(camera.top-camera.bottom);
        camera.top*=ratio;camera.bottom*=ratio;camera.left*=ratio;camera.right*=ratio;camera.updateProjectionMatrix();
      }
    }
    const message=arrived?"Arrived · Penthouse elevator foyer":`${step+1}/${legs.length} · ${leg.name}${leg.assumed?" · Assumed":""}${card?" · Credential issued":""}${cleared?" · Access cleared":""}`;
    if(status.textContent!==message) status.textContent=message;
    next.disabled=arrived;play.disabled=arrived;play.textContent=playing?"Pause":"Play";
  }
  function advance(){
    const kind=legs[step].kind;
    if(kind==="register") card=true;
    if(kind==="tap") {
      if(!card) throw new Error("Temporary credential required");
      cleared=true;
    }
    if(kind==="elevator" && step>legs.length/2 && !cleared) throw new Error("Residential access required");
    if(step===legs.length-1){arrived=true;playing=false;elapsed=legs[step].duration;}
    else {step++;elapsed=0;}
  }
  function show(){
    next.hidden=exit.hidden=plan.hidden=model.hidden=!active;
    overlay.style.display=active&&mode==="2D"?"flex":"none";
    routeLine.visible=marker.visible=active&&mode==="3D";
    plan.setAttribute("aria-pressed",String(mode==="2D"));
    model.setAttribute("aria-pressed",String(mode==="3D"));
    if(active) draw();
  }
  function begin(auto){
    prepare();active=true;playing=auto;step=0;elapsed=0;floorId="";card=cleared=arrived=false;show();
  }
  status.textContent="Penthouse visitor demo · W 57th St residential entrance";
  start.onclick=()=>begin(false);
  play.onclick=()=>{if(!active||arrived) begin(true);else{playing=!playing;draw();}};
  next.onclick=()=>{playing=false;advance();draw();};
  plan.onclick=()=>{mode="2D";show();};
  model.onclick=()=>{mode="3D";show();};
  exit.onclick=()=>{active=playing=false;close();status.textContent="Penthouse visitor demo · W 57th St residential entrance";play.disabled=false;play.textContent="Play";show();};
  show();
  return {update(now){
    const delta=last?Math.min(.1,(now-last)/1000):0;last=now;
    if(!active||!playing)return;
    elapsed+=delta;
    if(elapsed>=legs[step].duration)advance();
    draw();
  }};
}

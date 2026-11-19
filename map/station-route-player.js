import * as THREE from 'three';

// Flight surface follows the fixture's horizontal end plates and discrete stair treads.
export function surfacePoint(segment, t, elevations) {
  const a=segment.a,b=segment.b, run=Math.hypot(b.p[0]-a.p[0],b.p[1]-a.p[1]);
  const ya=elevations[a.floor],yb=elevations[b.floor];let u=t;
  if(ya!==yb && run>.01) {
    const land=Math.min(.65,run*.12), q=Math.max(0,Math.min(1,(t*run-land)/(run-2*land)));
    u=q;
    if(segment.kind==='stairs' && q>0 && q<1){const n=Math.max(2,Math.min(240,Math.ceil(Math.abs(yb-ya)/.17)));u=yb>ya?Math.ceil(q*n)/n:1-Math.ceil((1-q)*n)/n;}
  }
  return [a.p[0]+(b.p[0]-a.p[0])*t,ya+(yb-ya)*u,-a.p[1]-(b.p[1]-a.p[1])*t];
}

export function stationRoutePlayer({journeys,elevations,scene,camera,controls,stage,activate,scenarioLabels=false,pilot=null}) {
  const group=new THREE.Group();scene.add(group);group.visible=false;
  const panel=document.createElement('div');panel.style.cssText='position:absolute;left:16px;bottom:76px;max-width:calc(100% - 32px);padding:12px;border-radius:16px;background:var(--panel,#202124);color:var(--text,#fff);z-index:8;box-shadow:0 4px 24px #0003;font:13px system-ui';panel.hidden=true;
  panel.innerHTML=`<div style="display:flex;gap:8px;flex-wrap:wrap"><select aria-label="Station journey"></select><button data-action="play">Play</button><button data-action="restart">Restart</button><button data-action="reverse">Reverse</button><select aria-label="Playback speed"><option value="1">1×</option><option value="4">4×</option></select><button data-action="follow">Follow: on</button>${pilot ? '<button data-action="eye" aria-pressed="false">Eye level</button>' : ''}<button data-action="close">Close</button></div><input type="range" aria-label="Journey progress" min="0" max="1000" value="0" style="width:100%;margin:10px 0"><div role="status"></div><small>${pilot ? "Scenario · Train position, stairs and fare control are illustrative" : `Spread 0 · All levels retained · Dimensions assumed · ${scenarioLabels ? "Fare control unverified" : "Not step-free"}`}</small>`;
  stage.append(panel);for(const e of panel.querySelectorAll('button,select')) e.style.cssText='font:inherit;border:1px solid #8886;border-radius:8px;padding:6px;background:inherit;color:inherit';
  const choose=panel.querySelector('select'),speed=panel.querySelectorAll('select')[1],slider=panel.querySelector('input'),status=panel.querySelector('[role=status]');
  journeys.forEach((j,i)=>choose.add(new Option(j.name,i)));
  let eye=false;
  let route=[],duration=0,time=0,last=0,playing=false,reversed=false,follow=true,active=false;
  const blue=new THREE.MeshStandardMaterial({color:0x2379e8}),person=new THREE.Group();
  const limb=(w,h,x,y)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),blue);m.position.set(x,y,0);person.add(m);return m;};
  limb(.34,.55,0,1.05);const head=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),blue);head.position.y=1.52;person.add(head);
  const left=limb(.12,.65,-.11,.38),right=limb(.12,.65,.11,.38);limb(.1,.5,-.24,1);limb(.1,.5,.24,1);
  const beam=new THREE.Mesh(new THREE.CircleGeometry(2.4,24,Math.PI/2-Math.PI/6,Math.PI/3).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x2379e8,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));beam.position.y=.06;person.add(beam);
  const lineGroup=new THREE.Group();group.add(lineGroup,person);
  const doorPreview=pilot?.create(group);
  function select(){
    const journey=journeys[+choose.value];
    route=journey.segments.map(s=>({...s}));if(reversed)route=route.reverse().map(s=>({...s,a:s.b,b:s.a}));
    duration=0;for(const s of route){s.start=duration;s.duration=Math.hypot(...s.a.p.map((x,i)=>x-s.b.p[i]),elevations[s.a.floor]-elevations[s.b.floor])/(s.kind==='stairs'?.65:1.2);duration+=s.duration;}
    time=0;lineGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});lineGroup.clear();
    const points=[];for(const s of route){const n=Math.max(2,Math.ceil(s.duration*5));for(let i=0;i<=n;i++){const p=surfacePoint(s,i/n,elevations);p[1]+=.08;points.push(new THREE.Vector3(...p));}}
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x2379e8,transparent:true,opacity:.9}));lineGroup.add(line);
    if (doorPreview) {
      const door=journey.segments.at(-1);
      const position=new THREE.Vector3(...surfacePoint(door,1,elevations));
      const toward=new THREE.Vector3(...surfacePoint(door,0,elevations)).sub(position);
      doorPreview.reset(journey,position,toward,reversed);
      line.visible=false;
    }
    panel.querySelector('[data-action=reverse]').textContent=reversed?'Direction: up':'Direction: down';draw();
  }
  function draw(){
    const s=route.find(s=>time<s.start+s.duration)||route.at(-1);if(!s)return;
    const t=Math.max(0,Math.min(1,(time-s.start)/Math.max(.01,s.duration))),p=new THREE.Vector3(...surfacePoint(s,t,elevations));
    if (doorPreview) {
      const start=new THREE.Vector3(...surfacePoint(s,0,elevations));
      const end=new THREE.Vector3(...surfacePoint(s,1,elevations));
      const run=Math.hypot(end.x-start.x,end.z-start.z);
      doorPreview.draw(s,start,end,t,run,u=>new THREE.Vector3(...surfacePoint(s,u,elevations)));
      if (eye) {
        const heading=end.clone().sub(start);
        heading.y=0;
        heading.normalize();
        const eyeCamera=doorPreview.camera;
        const aspect=stage.clientWidth / Math.max(1,stage.clientHeight);
        if (eyeCamera.aspect!==aspect) {eyeCamera.aspect=aspect;eyeCamera.updateProjectionMatrix();}
        eyeCamera.position.copy(p).add(new THREE.Vector3(0,1.62,0));
        if (time===0 && reversed) eyeCamera.position.addScaledVector(heading,-.24);
        const look=eyeCamera.position.clone().addScaledVector(heading,3);
        look.y+=s.kind==='stairs'?(end.y-start.y)*3/Math.max(1,run):-.32;
        eyeCamera.lookAt(look);
      }
    }
    person.visible=!eye;
    person.position.copy(p);person.rotation.y=Math.atan2(-(s.b.p[0]-s.a.p[0]),s.b.p[1]-s.a.p[1]);
    left.rotation.x=playing?Math.sin(time*7)*.35:0;right.rotation.x=-left.rotation.x;
    slider.value=Math.round(time/duration*1000);status.textContent=`${time>=duration?'Arrived · ':''}${s.a.floor.replace('station:','')} → ${s.b.floor.replace('station:','')} · ${s.kind} · ${scenarioLabels ? s.name : s.facility_id==='upper-stair'?'Short stair':s.facility_id==='bridge-2'?'Downtown platform stairs':s.kind==='ramp'?'Connecting ramp':s.a.floor==='station:IP'?'Downtown platform':'Bridge / landing turn'} · ${Math.round(time)} / ${Math.round(duration)} s`;
    if(follow){const target=p.clone().add(new THREE.Vector3(0,1,0));const shift=target.clone().sub(controls.target);controls.target.copy(target);camera.position.add(shift);}
    panel.querySelector('[data-action=play]').textContent=playing?'Pause':'Play';
  }
  function open(){active=true;if(pilot)reversed=true;activate(true);panel.hidden=false;group.visible=true;follow=true;playing=false;select();const p=person.position;controls.target.copy(p);camera.position.copy(p).add(new THREE.Vector3(-55,32,48));const aspect=stage.clientWidth/stage.clientHeight;camera.left=-27*aspect;camera.right=27*aspect;camera.top=27;camera.bottom=-27;camera.zoom=1;camera.updateProjectionMatrix();controls.update();}
  choose.onchange=()=>{reversed=Boolean(pilot);select();};slider.oninput=()=>{playing=false;time=duration*slider.value/1000;draw();};
  panel.onclick=e=>{const action=e.target.dataset.action;if(action==='play'){if(time>=duration)time=0;playing=!playing;}if(action==='restart'){time=0;playing=false;}if(action==='reverse'){reversed=!reversed;select();}if(action==='follow')follow=!follow;if(action==='eye'){eye=!eye;e.target.setAttribute('aria-pressed',String(eye));e.target.textContent=eye?'Overview':'Eye level';}if(action==='close'){eye=false;const button=panel.querySelector('[data-action=eye]');if(button){button.setAttribute('aria-pressed','false');button.textContent='Eye level';}active=false;playing=false;panel.hidden=true;group.visible=false;activate(false);}panel.querySelector('[data-action=follow]').textContent='Follow: '+(follow?'on':'off');draw();};
  controls.addEventListener('start',()=>{if(active){follow=false;panel.querySelector('[data-action=follow]').textContent='Follow: off';}});
  return {open,get viewCamera(){return active && eye ? doorPreview.camera : null;},update(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(!active)return;if(playing){time=Math.min(duration,time+dt*+speed.value);if(time>=duration)playing=false;}draw();}};
}

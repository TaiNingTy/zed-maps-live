import * as THREE from 'three';
import {createWalkerLayer} from './walker3d.js';
import {segmentPoints, samplePath, reversePennSteps} from './penn-motion.js';
import {pennEgress, pennRouteLeg} from './penn-continuation.js';
import {createPennScene} from './penn-station/scene.js';

const FLOOR_NAMES={street:'Street',B:'Upper concourse',A:'Lower concourse',irtP:'1 2 3 platforms',irtM:'1 2 3 lower passage',indP:'A C E platforms',indM:'A C E lower passage',rail:'Rail platforms'};
const TRIPS={stairs:['1 platform','Penn upper concourse','Stairs'],escalator:['A platform','Penn upper concourse','Escalators + stairs'],elevator:['A platform','Penn upper concourse','Elevators'],boardInd:['Penn lower concourse','A platform','Escalator up'],boardIrt:['Penn lower concourse','1 platform','Stairs up'],penn32:['7 Av / 32 St','Penn upper concourse','Entrance'],gateway:['East End Gateway','Penn lower concourse','Entrance']};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>document.getElementById(id);

export async function createPennMap({map,maplibregl,getMapMode,onExit,onSuspend,onResume,thirdPlaceControl,buildContinuation,clearDestination}){
 let active=false,phase='landmark',trip='stairs',reversed=false,step=0,inside=false,spread=false,is3d=true,playing=false,timer=null,speed=1;
 let session=false,overview3d=true,backgroundBuilding=true,backgroundPlatform=null,backgroundFloor=null,walkFrame=0,fraction=0,lastHeading=0,followPaused=false;
 let onward=[],onwardPending=false,combinedSteps=null,onwardDestination="";
 let runtime,ready,layer,priorHash='',priorCamera,hiddenLayers=[],oldCityFilter;
 const reg=await fetch(new URL('./penn-station/registration.json',import.meta.url)).then(r=>r.json());
 const a=reg.mercator_x,b=reg.mercator_y,s=reg.metre_scale;
 const modelMatrix=new THREE.Matrix4().set(a[0],0,a[1],a[2],b[0],0,b[1],b[2],0,s,0,reg.street_altitude_m*s,0,0,0,1);
 const lonlat=(x,z)=>new maplibregl.MercatorCoordinate(a[0]*x+a[1]*z+a[2],b[0]*x+b[1]*z+b[2],0).toLngLat();
 const center=lonlat(-90,-55);
 const ink=getComputedStyle(document.documentElement).getPropertyValue('--route').trim()||'#1d4ed8';
 const walker=createWalkerLayer(maplibregl,{id:'penn-walker-3d',color:ink,rim:'#ffffff'});
 const routeVisual=new THREE.Group();
 const routeBlue=new THREE.Color('#9ed2f5'), travelledBlue=new THREE.Color('#426286'), leadBlue=new THREE.Color('#27a9ff');
 let routeSegments=[],stepDistances=[],routeMesh=null,lastPaint=null;
 const empty={type:'FeatureCollection',features:[]};
 let renderedCamera;
 const panel=document.createElement('aside');panel.id='penn-native-panel';panel.className='panel';panel.hidden=true;panel.setAttribute('aria-label','Penn Station directions');document.body.append(panel);
 const key=document.createElement('div');key.id='penn-map-key';key.hidden=true;key.innerHTML='<span class="penn-key-dot"></span>Georeferenced reconstruction · heights and equipment positions are scenarios';document.body.append(key);
 const more=document.createElement('section');more.id='penn-native-details';more.className='panel';more.hidden=true;document.body.append(more);
 const markerButton=document.createElement('button');markerButton.className='penn-map-marker';markerButton.textContent='Penn Station';markerButton.title='Explore Penn Station, its entrances and both subway stations';
 const marker=new maplibregl.Marker({element:markerButton}).setLngLat(center).addTo(map);markerButton.onclick=e=>{e.stopPropagation();e.stopImmediatePropagation();active?setInside(!inside):activate();};

 async function ensure(){if(ready)return ready;ready=(async()=>{
  const html=await fetch(new URL('./penn-station/index.html',import.meta.url)).then(r=>r.text());
  const doc=new DOMParser().parseFromString(html,'text/html');
  const host=document.createElement('div');host.hidden=true;host.id='penn-scene-host';host.append(document.importNode(doc.querySelector('main'),true));document.body.append(host);
  runtime=await createPennScene(host,()=>{if(active)map.triggerRepaint();});
  // This is the original full scene: no vertex decimation or connector replacement.
  const camera=new THREE.Camera();let renderer;
  layer={id:'penn-complete-3d',type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;renderer.localClippingEnabled=true;},render(gl,matrix){if(!active&&!(backgroundFloor||backgroundPlatform||backgroundBuilding&&overview3d))return;camera.projectionMatrix.fromArray(matrix).multiply(modelMatrix);renderedCamera=camera;renderer.resetState();if(active)renderer.clearDepth();renderer.render(runtime.scene,camera);renderer.resetState();}};
  map.addLayer(layer);runtime.scene.add(routeVisual);
  map.addSource('penn-walker',{type:'geojson',data:empty});
  map.addSource('penn-route',{type:'geojson',data:empty});
  map.addLayer({id:'penn-route-casing',type:'line',source:'penn-route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#101a2c','line-width':4,'line-opacity':.35}});
  map.addLayer({id:'penn-route-line',type:'line',source:'penn-route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':['get','color'],'line-width':['get','width']}});
  map.addLayer({id:'penn-walker-dot',type:'symbol',source:'penn-walker',layout:{'icon-image':'me','icon-rotate':['get','heading'],'icon-rotation-alignment':'map','icon-pitch-alignment':'map','icon-allow-overlap':true,'icon-ignore-placement':true,'icon-size':['interpolate',['linear'],['zoom'],15,.75,19,1.15]}});
  map.addLayer(walker.layer);
  oldCityFilter=map.getFilter('buildings-3d');map.setFilter('buildings-3d',['all',oldCityFilter||true,['!', ['in',['to-string',['get','bin']],['literal',['1082908','1083026','1084820']]]]]);

  runtime.exterior.root.children[0].visible=false; // the geographic basemap supplies the streets; geometry remains in the scene
 })();return ready;}
 function padding(){return innerWidth<768?{left:20,right:64,top:20,bottom:Math.min(panel.offsetHeight+18,innerHeight*.5)}:{left:412,right:80,top:35,bottom:45};}
 function frameAll(duration=750){map.easeTo({center:lonlat(-100,-65),padding:padding(),pitch:is3d?55:0,bearing:29,zoom:innerWidth<768?15.8:16.4,duration});}
 function focusStep(){const st=steps()[step];if(!st)return;const p=st.p.length===3?[st.p[0],st.p[2]]:st.p;map.easeTo({center:lonlat(...p),zoom:19.2,bearing:29,pitch:is3d?58:0,padding:padding(),duration:playing?0:650});}
 function setHash(){
  const stage=phase==='route'?'/route':phase==='step'?'/step-'+(step+1):'';
  const options=stage&&(reversed||trip!=='stairs')?'/'+[trip,reversed?'reverse':'forward',entryMethod].join('~'):'';
  history.replaceState(null,'','#penn-station'+stage+options);
 }
 function isEntry(){return trip==='penn32'||trip==='gateway';}
 let entryMethod='escalator';
 const endpoints=()=>reversed?[TRIPS[trip][1],TRIPS[trip][0]]:TRIPS[trip];
 const hasStepFreeAlternative=()=>trip==='elevator'||trip==='escalator';
 function baseSteps(){
  const route=isEntry()?runtime.entranceJourney(runtime.entrances.find(e=>e.id===trip),entryMethod).map(q=>({...q,floor:q.p[1]<-2?(trip==='penn32'?'B':'A'):'street',name:q.text,action:q.text})):
   runtime.steps.map((q,i,all)=>({...q,action:i===all.length-1?'You have arrived at '+TRIPS[trip][1]+'.':q.action}));
  if(!reversed)return route;
  const boarding=trip.startsWith('board');
  const result=reversePennSteps(route,{destination:endpoints()[1],connectors:runtime.connectors,
   fareIndex:isEntry()?undefined:boarding?3:7,boarding:!boarding,
   escalatorOffset:trip==='escalator'?2.7:trip==='boardInd'?-2.7:0});
  if(isEntry()){
   const index=3;
   result[index].action=entryMethod==='elevator'?'Take the elevator up to street level.':
    entryMethod==='stairs'?'Go up the stairs to street level.':'Take the escalator up in this scenario. Operating direction is unverified.';
  }
  return result;
 }
 function steps(){
  const base=baseSteps();
  if(!onward.length)return base;
  if(combinedSteps)return combinedSteps;
  const last=base.at(-1),tail=[];
  const local=point=>{
   const ll=point.lonlat,mc=maplibregl.MercatorCoordinate.fromLngLat(ll,0);
   const x=mc.x-a[2],z=mc.y-b[2],det=a[0]*b[1]-a[1]*b[0];
   return [(x*b[1]-z*a[1])/det,point.elev-reg.street_altitude_m,(z*a[0]-x*b[0])/det];
  };
  for(const leg of onward){
   const begin=tail.length?tail.at(-1):{...last};
   begin.action=leg.text;begin.name=leg.points[0].name;
   if(!tail.length)tail.push(begin);
   leg.points.slice(1).forEach(point=>tail.push({p:local(point),floor:point.level,name:point.name,action:leg.text}));
  }
  tail.at(-1).action='Arrive at '+onwardDestination+'.';
  combinedSteps=[...base.slice(0,-1),...tail];
  return combinedSteps;
 }
 async function continueTo(id){
  const waypoints=await pennEgress(baseSteps(),stepFree());
  return waypoints?buildContinuation(pennRouteLeg(waypoints,reg),id,stepFree()):null;
 }
 function stepFree(){return isEntry()?entryMethod==='elevator':trip==='elevator';}
 function setContinuation(value,destination=""){
  stop();combinedSteps=null;onwardDestination=destination;onward=value||[];onwardPending=value===null;
  step=0;fraction=0;session=false;refreshGeometry();render();
 }
 function refreshGeometry(){runtime.exterior.root.children[0].visible=false;runtime.routeGroup.visible=false;runtime.entranceModel.root.children[0].visible=false;drawRoute();syncWalker();map.triggerRepaint();}
 function points(i){return segmentPoints(steps(),i,runtime.connectors,f=>runtime.surfaceY(f));}
 function drawRoute(){
  if(routeMesh){routeMesh.geometry.dispose();routeMesh.material.dispose();routeMesh.dispose();}
  routeVisual.clear();routeSegments=[];stepDistances=[];routeMesh=null;lastPaint=null;
  let distance=0;
  if(active&&(!is3d||phase!=='landmark'))for(let i=0;i<steps().length-1;i++){
   const pts=points(i);stepDistances[i]=distance;
   for(let k=1;k<pts.length;k++){
    const start=new THREE.Vector3(...pts[k-1]),end=new THREE.Vector3(...pts[k]);
    const length=start.distanceTo(end);
    if(length<.001)continue;
    const count=Math.ceil(length/1.2);
    for(let j=0;j<count;j++){
     const from=start.clone().lerp(end,j/count),to=start.clone().lerp(end,(j+1)/count);
     const coords=[from,to].map(p=>{const ll=lonlat(p.x,p.z);return[ll.lng,ll.lat];});
     routeSegments.push({from,to,coords,distance:distance+length*(j+.5)/count});
    }
    distance+=length;
   }
  }
  stepDistances.push(distance);
  if(routeSegments.length){
   routeMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.11,1,6),new THREE.MeshBasicMaterial(),routeSegments.length);
   const up=new THREE.Vector3(0,1,0),matrix=new THREE.Matrix4();
   routeSegments.forEach(({from,to},i)=>{
    const delta=to.clone().sub(from),length=delta.length();
    matrix.compose(from.clone().lerp(to,.5).addScaledVector(up,.08),new THREE.Quaternion().setFromUnitVectors(up,delta.normalize()),new THREE.Vector3(1,length+.025,1));
    routeMesh.setMatrixAt(i,matrix);
   });
   routeVisual.add(routeMesh);
  }
  routeVisual.visible=active&&is3d&&inside;
  for(const id of ['penn-route-line','penn-route-casing'])map.setLayoutProperty(id,'visibility',active&&!is3d?'visible':'none');
  paintRoute(fraction);
 }
 function paintRoute(f){
  const start=stepDistances[step]??0,end=stepDistances[step+1]??start;
  const cursor=phase==='step'?start+(end-start)*f:null;
  const key=cursor===null?'overview':Math.round(cursor*2);
  if(key===lastPaint)return;
  lastPaint=key;
  const color=new THREE.Color(),features=[];
  routeSegments.forEach((segment,i)=>{
   const ahead=cursor===null?Infinity:segment.distance-cursor;
   color.copy(routeBlue);
   const lead=ahead>=0&&ahead<12?1-ahead/12:0;
   if(ahead<0)color.lerp(travelledBlue,Math.min(1,-ahead/3)*.9);
   else if(lead)color.lerp(leadBlue,lead);
   if(is3d)routeMesh.setColorAt(i,color);
   else if(segment.coords[0].some((v,j)=>v!==segment.coords[1][j]))
    features.push({type:'Feature',properties:{color:'#'+color.getHexString(),width:2.5+lead*1.5},geometry:{type:'LineString',coordinates:segment.coords}});
  });
  if(is3d&&routeMesh?.instanceColor)routeMesh.instanceColor.needsUpdate=true;
  if(!is3d||!routeSegments.length)map.getSource('penn-route')?.setData({type:'FeatureCollection',features});
 }
 function syncWalker(){if(!runtime)return;const show=active&&phase==='step';walker.setVisible(show&&is3d&&inside);map.setLayoutProperty('penn-walker-dot','visibility',show&&!is3d?'visible':'none');if(!show){walker.clear();map.getSource('penn-walker').setData(empty);return;}place(fraction);}
 function place(f){paintRoute(f);const pth=points(step),pose=samplePath(pth,f);const ll=lonlat(pose.point[0],pose.point[2]),t=pose.tangent;const dx=a[0]*t[0]+a[1]*t[2],dy=b[0]*t[0]+b[1]*t[2];if(Math.hypot(dx,dy)>1e-12)lastHeading=Math.atan2(dx,-dy);const p={lonlat:[ll.lng,ll.lat],alt:reg.street_altitude_m+pose.point[1]+.6,heading:lastHeading,walking:playing&&Math.hypot(t[0],t[2])>.01,phase:performance.now()*.012*speed,maxM:3.6};walker.setPose(p);map.getSource('penn-walker').setData({type:'Feature',properties:{heading:lastHeading*180/Math.PI},geometry:{type:'Point',coordinates:p.lonlat}});if(playing&&!is3d&&!followPaused)map.jumpTo({center:p.lonlat});}
 function handleClick(point){if(walker.hit(point)&&active){play();return true;}if(!runtime||!renderedCamera||(!active&&(!backgroundBuilding||!overview3d)))return false;const c=map.getCanvas(),inv=renderedCamera.projectionMatrix.clone().invert(),x=point.x/c.clientWidth*2-1,y=1-point.y/c.clientHeight*2,near=new THREE.Vector3(x,y,-1).applyMatrix4(inv),far=new THREE.Vector3(x,y,1).applyMatrix4(inv);runtime.scene.updateMatrixWorld(true);const hit=new THREE.Raycaster(near,far.sub(near).normalize()).intersectObjects(runtime.exterior.root.children.slice(1),true).some(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return true;});if(!hit)return false;if(active)setInside(!inside);else activate();return true;}
 function setMapVisibility(building,in3d,platform,routeFloor){
  overview3d=in3d;
  markerButton.hidden=!active&&!building;
  if(!active&&(backgroundBuilding!==building||backgroundPlatform!==platform||backgroundFloor!==routeFloor)){
   if((platform&&!building)||routeFloor){
    const visible=routeFloor==="all"?new Set(platform?["A",platform,platform.replace(/P$/,"M")]:["B"]):new Set([routeFloor||platform]);
    runtime.configure({exterior:building?'xray':'off',assembly:false,walking:false,route:false,floor:null,tab:'all',spread:0});
    runtime.groups.forEach((group,id)=>{group.visible=visible.has(id);});
    runtime.links.visible=Boolean(routeFloor);
    for(const link of runtime.links.children){
     const c=link.userData.connector;
     link.visible=Boolean(routeFloor&&(visible.has(c.a)||visible.has(c.b)));
    }
    runtime.entranceModel.setVisible(false);
   }else runtime.showExterior('solid');
   refreshGeometry();
  }
  backgroundBuilding=building;
  backgroundPlatform=platform;
  backgroundFloor=routeFloor;
  map.triggerRepaint();
 }
 for(const ev of ['dragstart','rotatestart'])map.on(ev,e=>{if(e.originalEvent)followPaused=true;});

 function setInside(v){inside=v;if(!v){spread=false;runtime.showExterior('solid');}else runtime.configure({exterior:'xray',spread:0,assembly:true});if(v){runtime.groups.forEach(g=>{g.visible=true;});runtime.state.interiors=true;}refreshGeometry();syncControls();}
 function setSpread(v){spread=v;runtime.configure({spread:v?1:0,exterior:'xray',assembly:true});inside=true;refreshGeometry();syncControls();frameAll();}
 function mode(v){is3d=v;drawRoute();syncWalker();map.easeTo({pitch:v?55:0,duration:650});syncControls();}
 function syncControls(){if(!active)return;document.body.classList.add('penn-active');byId('btn2d').setAttribute('aria-pressed',!is3d);byId('btn3d').setAttribute('aria-pressed',is3d);
  byId('xray').hidden=!is3d;byId('xray').textContent=inside?'Show outside':'See inside';byId('xray').setAttribute('aria-pressed',inside);byId('explode').hidden=true;byId('explode').setAttribute('aria-pressed',spread);byId('floors-btn').hidden=false;byId('floors-btn').textContent='Explore station';byId('heading').hidden=true;byId('levels').hidden=false;
  byId('levels').innerHTML=[...runtime.levels].sort((a,b)=>b.y-a.y).map(f=>`<button type="button" data-penn-floor="${f.id}" aria-pressed="${runtime.state.floor===f.id}" title="${FLOOR_NAMES[f.id]} · scenario ${f.y} m">${({street:'G',irtP:'1 2 3',indP:'A C E',irtM:'IRT',indM:'IND',rail:'Rail'})[f.id]||f.id}</button>`).join('');
  const local=new Set(runtime.levels.map(f=>f.id));
  const extra=new Map(steps().filter(s=>s.name&&!local.has(s.floor)&&!s.floor.startsWith('penn:')).map(s=>[s.floor,s]));
  for(const [id,s] of extra){
   const button=document.createElement('button');button.type='button';button.dataset.pennRemote=id;
   button.textContent=s.name;button.title=s.name;button.setAttribute('aria-pressed',String(steps()[step]?.floor===id));
   byId('levels').append(button);
  }
 }
 function render(){if(!active)return;const t=endpoints(),st=steps()[step];panel.innerHTML=`<div class="head"><button class="icon" data-penn="back" aria-label="${phase==='landmark'?'All landmarks':'Back'}">←</button><h1>${phase==='landmark'?'Penn Station':phase==='route'?'Your route':'Penn Station'}</h1><button class="icon info" data-penn="evidence" aria-label="About Penn Station">i</button></div>
 ${phase==='landmark'?`<p class="sub">MSG · PENN 2 · Moynihan · 1 2 3 / A C E</p><p class="eyebrow">Where inside?</p><div class="penn-destinations">${Object.entries(TRIPS).map(([id,t])=>`<button class="penn-destination" data-trip="${id}" aria-pressed="${trip===id}"><b>${esc(t[1])}</b><small>From ${esc(t[0])} · ${t[2]}</small></button>`).join('')}</div><p class="fine">Complete detailed model, positioned on the map using public street and building data. Indoor routes remain scenarios.</p><button class="primary" data-penn="route">Show route</button>`:
 `<div class="trip penn-trip-controls" aria-label="Trip"><div class="ends">
 <button type="button" class="end" data-penn="choose"><span class="o" aria-hidden="true"></span><span class="lbl">From</span><span>${esc(t[0])}</span></button>
 <button type="button" class="end" data-penn="choose"><span class="d" aria-hidden="true"></span><span class="lbl">To</span><span>${esc(t[1])}</span></button>
 <div id="penn-stop-slot" class="trip-stop" hidden></div>
 </div><div class="trip-tools"><button type="button" class="icon swap-direction" data-penn="swap" aria-pressed="${reversed}" aria-label="Swap From and To">${byId('swap').innerHTML}</button><button type="button" class="icon add-stop" id="penn-add-stop" aria-label="Add another stop" aria-expanded="false" aria-controls="penn-stop-slot" hidden>${byId('add-stop').innerHTML}</button></div></div>
 ${phase==='route'?`${isEntry()?`<label class="fine">Transport <select id="penn-method" aria-label="Entrance transport">${['escalator','stairs','elevator'].map(x=>`<option value="${x}" ${entryMethod===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label>`:`<label class="penn-option"><input type="checkbox" id="penn-stepfree" ${trip==='elevator'?'checked':''} ${!hasStepFreeAlternative()?'disabled':''}> Step-free${!hasStepFreeAlternative()?' · no alternative modelled':''}</label>`}<p class="eyebrow">${steps().length} steps · scenario route</p><p class="fine">Landings and passage positions are design assumptions. No live service or travel-time estimate.</p><button class="link" data-penn="evidence">How this route is known →</button><div class="actions"><button class="primary" data-penn="start" ${onwardPending?'disabled':''}>Start</button><button class="secondary" data-penn="play" ${onwardPending?'disabled':''}>Play</button></div>`:
 `${session?`<div class="penn-playbar"><span>${playing?'PLAYING':'PAUSED'} ${speed}×</span><button class="link" data-penn="restart">Restart</button><button class="link" data-penn="end">End preview</button></div>`:''}<div class="penn-progress"><b>${FLOOR_NAMES[st?.floor]||st?.name||'Entrance'}</b><span>${step+1} / ${steps().length}</span><button class="link" data-penn="speed" aria-label="Playback speed">${speed}×</button></div><progress max="${steps().length}" value="${step+1}"></progress><h2 class="penn-instruction">${esc(st?.action||st?.name)}</h2>${st?.name&&st.name!==st.action?`<p class="fine">${esc(st?.name)}</p>`:''}<button class="link" data-penn="evidence">Scenario · view evidence</button><div class="actions"><button class="secondary square" data-penn="prev" aria-label="Previous step" ${step===0?'disabled':''}>←</button><button class="secondary square" data-penn="play" aria-pressed="${playing}" aria-label="${playing?'Pause':'Play'}">${playing?'Ⅱ':'▶'}</button><button class="primary" data-penn="next">${step===steps().length-1?'Done':'Next'}</button></div><button class="link" data-penn="steps">All steps</button>`}`}`;if(phase!=='landmark'&&thirdPlaceControl)thirdPlaceControl(byId('penn-stop-slot'),byId('penn-add-stop'),phase==='route');syncControls();setHash();}
 function replanOnward(){combinedSteps=null;const select=panel.querySelector('.third-place');if(select?.value)select.onchange();}
 function choose(id){stop();clearDestination?.();onward=[];onwardPending=false;reversed=false;trip=id;if(!isEntry())runtime.chooseRoute(id);phase='landmark';step=0;runtime.configure({route:false,walking:false});render();}
 function showRoute(){stop();session=false;phase='route';step=0;inside=true;if(isEntry()){runtime.command('entry-choice',trip);runtime.command('entry-method',entryMethod);runtime.walkEntrance(0);}else{runtime.chooseRoute(trip);runtime.configure({route:true,exterior:'xray',floor:null,tab:'all',walking:false,assembly:true,interiors:true});}refreshGeometry();render();frameAll();}
 function go(i){if(onwardPending)return;fraction=0;spread=false;phase='step';step=Math.max(0,Math.min(steps().length-1,i));inside=true;const originalCount=baseSteps().length;
 if(step>=originalCount){runtime.configure({walking:false,route:false,floor:null,tab:'all',assembly:true,exterior:'xray'});}
 else if(isEntry()){runtime.command('entry-choice',trip);runtime.command('entry-method',entryMethod);runtime.walkEntrance(reversed?originalCount-1-step:step);}
 else runtime.go(reversed?originalCount-1-step:step);refreshGeometry();render();focusStep();}
 function stop(){playing=false;cancelAnimationFrame(walkFrame);clearTimeout(timer);timer=null;if(active&&phase==='step')place(fraction);}
 function play(){if(onwardPending)return;if(playing){stop();render();return;}if(phase!=='step'||step===steps().length-1)go(0);playing=true;session=true;followPaused=false;if(!is3d)map.jumpTo({zoom:19.2,pitch:0,padding:padding()});render();let previous=performance.now();
  const tick=now=>{if(!playing)return;const path=points(step),length=path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...p.map((v,j)=>v-path[i][j])),0),ms=Math.min(3600,Math.max(1100,700+length*30));fraction=Math.min(1,fraction+(now-previous)*speed/ms);previous=now;place(fraction);if(fraction>=1){if(step>=steps().length-2){go(steps().length-1);stop();render();return;}go(step+1);}walkFrame=requestAnimationFrame(tick);};walkFrame=requestAnimationFrame(tick);}
 function details(kind){more.hidden=false;more.innerHTML=`<div class="head"><h2>${kind==='steps'?'All steps':'Evidence and model'}</h2><button class="icon" data-close aria-label="Close details">×</button></div>`+(kind==='steps'?steps().map((q,i)=>`<button class="penn-destination" data-step="${i}"><b>${i+1}. ${FLOOR_NAMES[q.floor]||'Entrance'}</b><small>${esc(q.action||q.name)}</small></button>`).join(''):
 `<p><b>Map registration: rebuilt.</b> Four controls from OSM intersections and NYC building footprints. Fit residual: ${reg.rms_m.toFixed(2)} m RMS at those controls; this is not a measure of indoor accuracy.</p><p><b>Vertical positions: scenario.</b> Original heights are retained. Local street zero is placed at the host map’s 4.5 m street datum.</p><p><b>Geometry retained.</b> The complete interior, stairs, escalators, landings, guardrails, elevators and exterior buildings use the existing Penn scene builders.</p><p>Original local coordinates are transformed together. Source-plan scale, exact equipment positions and current access remain unverified.</p><p class="links"><a href="penn-station/registration.json" target="_blank">Control points and residuals →</a></p><button class="secondary" data-penn="floors">All floors & source plans</button><h3>Inspect a connection</h3><div class="penn-connections">${runtime.connectors.map(c=>`<button class="penn-destination" data-connection="${esc(c.id)}"><b>${esc(c.id)} · ${c.kind}</b><small>${FLOOR_NAMES[c.a]} ↔ ${FLOOR_NAMES[c.b]}</small></button>`).join('')}</div>`);}
 function allFloors(){stop();const frame=document.createElement('iframe');frame.title='Explore Penn Station';frame.src='penn-station/index.html';byId('floors-view').replaceChildren(frame);byId('floors-view').hidden=false;}
 function back(){stop();if(phase==='step'){showRoute();return;}if(phase==='route'){phase='landmark';clearDestination?.();onward=[];onwardPending=false;runtime.configure({route:false,walking:false});refreshGeometry();render();frameAll();return;}deactivate();onExit?.();}
 const actions={restart:()=>{stop();fraction=0;go(0);play();},end:showRoute,back,choose:()=>{if(phase==='step')showRoute();back();},swap:()=>{stop();reversed=!reversed;more.hidden=true;showRoute();replanOnward();panel.querySelector('[data-penn=swap]').focus();},route:showRoute,start:()=>go(0),next:()=>{stop();step===steps().length-1?showRoute():go(step+1);},prev:()=>{stop();go(step-1);},play,speed:()=>{speed=speed===4?1:speed*2;render();},evidence:()=>details('evidence'),steps:()=>details('steps'),floors:allFloors};
 for(const el of [panel,more])el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-close'))more.hidden=true;else if(b.dataset.trip)choose(b.dataset.trip);else if(b.dataset.step!==undefined){more.hidden=true;stop();go(+b.dataset.step);}else if(b.dataset.connection){inside=true;runtime.inspectConnection(b.dataset.connection);refreshGeometry();const c=runtime.connectors.find(c=>c.id===b.dataset.connection);map.easeTo({center:lonlat((c.from[0]+c.to[0])/2,(c.from[1]+c.to[1])/2),zoom:20,pitch:is3d?60:0,duration:700});syncControls();}else actions[b.dataset.penn]?.();});
 panel.addEventListener('change',e=>{if(e.target.id==='penn-stepfree'){trip=e.target.checked?'elevator':'escalator';showRoute();replanOnward();}if(e.target.id==='penn-method'){entryMethod=e.target.value;showRoute();replanOnward();}});
 // Shared controls retain their existing actions for every other landmark.
 for(const [id,fn]of Object.entries({btn2d:()=>mode(false),btn3d:()=>mode(true),xray:()=>setInside(!inside),explode:()=>setSpread(!spread),'floors-btn':allFloors,heading:()=>map.easeTo({bearing:29})})){
  const el=byId(id),old=el.onclick;el.onclick=e=>active?fn():old?.(e);
 }
 byId('levels').addEventListener('click',e=>{const remote=e.target.closest('[data-penn-remote]');
 if(active&&remote){e.stopImmediatePropagation();stop();const i=steps().findIndex(s=>s.floor===remote.dataset.pennRemote);if(i>=0)go(i);return;}
 const b=e.target.closest('[data-penn-floor]');if(!active||!b)return;e.stopImmediatePropagation();stop();runtime.focus(b.dataset.pennFloor);inside=true;refreshGeometry();syncControls();const f=runtime.levels.find(f=>f.id===b.dataset.pennFloor);map.easeTo({center:lonlat(f.id.startsWith('ind')?-174:f.id.startsWith('irt')?170:0,f.id.startsWith('i')?-130:-25),zoom:18.4,pitch:is3d?55:0,duration:650});},true);
 document.addEventListener('keydown',e=>{if(!active||e.target.closest('input,select'))return;if(e.key==='Escape'){e.stopImmediatePropagation();if(!byId('floors-view').hidden){byId('floors-view').hidden=true;byId('floors-view').replaceChildren();}else if(!more.hidden)more.hidden=true;else back();}else if(phase==='step'&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.stopImmediatePropagation();stop();go(step+(e.key==='ArrowRight'?1:-1));}},true);
 async function activate(routeState, routeOptions){if(active){setInside(!inside);return;}await ensure();if(active)return;priorHash=location.hash;priorCamera={center:map.getCenter(),zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),padding:map.getPadding()};active=true;onSuspend?.();panel.hidden=false;key.hidden=false;markerButton.hidden=false;hiddenLayers=[];
  for(const id of ['indoor-fill','indoor-outline','indoor-walls','indoor-openings','indoor-turnstiles','indoor-labels','indoor-pois','indoor-slabs','route-line','route-casing','route-points','route-solids','walker','target-3d'])if(map.getLayer(id)){hiddenLayers.push([id,map.getLayoutProperty(id,'visibility')||'visible']);map.setLayoutProperty(id,'visibility','none');}
  phase='landmark';onward=[];onwardPending=false;if(!isEntry())runtime.chooseRoute(trip);is3d=getMapMode?.() ?? priorCamera.pitch > 0;inside=!is3d;spread=false;runtime.showExterior(is3d?'solid':'xray');refreshGeometry();render();map.moveLayer('penn-complete-3d');for(const id of ['penn-route-casing','penn-route-line','penn-walker-dot','penn-walker-3d'])map.moveLayer(id);frameAll(0);
  const direct=typeof routeState==='string'&&routeState.match(/^(route|step-(\d+))$/);
  if(direct){
   const [savedTrip,direction,method]=(routeOptions||'').split('~');
   if(Object.hasOwn(TRIPS,savedTrip))trip=savedTrip;
   if(['stairs','escalator','elevator'].includes(method))entryMethod=method;
   reversed=direction==='reverse';
   showRoute();if(direct[2])go(Number(direct[2])-1);
  }
 }
 function deactivate(){if(!active)return;stop();active=false;panel.hidden=true;key.hidden=true;more.hidden=true;markerButton.hidden=false;document.body.classList.remove('penn-active');byId('floors-btn').textContent='All floors';for(const [id,v]of hiddenLayers)map.setLayoutProperty(id,'visibility',v);runtime.showExterior('solid');runtime.configure({route:false,walking:false});refreshGeometry();onResume?.();map.triggerRepaint();}
 await ensure();refreshGeometry();
 return {activate,deactivate,handleClick,setMapVisibility,continueTo,setContinuation,get stepFree(){return stepFree();},get destinationName(){return endpoints()[1];},get active(){return active;},get runtime(){return runtime;},registration:reg,lonlat,frameAll,allFloors,showRoute,go};
}

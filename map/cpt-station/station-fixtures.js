// Shared construction detail. Positions inherit source data; dimensions, door faces,
// rail profiles and gate cabinet arrangement are illustrative, not surveyed equipment.
import * as THREE from "three";
export const FIXTURE_NOTE = "Facility detail is illustrative: rail profiles, door faces and gate cabinet spacing are not surveyed.";
const UP = new THREE.Vector3(0, 1, 0);
function kit(color, opacity) {
  const group = new THREE.Group();
  group.userData.detailEvidence = "scenario";
  const batches = new Map();
  let frame=new THREE.Matrix4();
  function box(x, y, z, w, h, d, tone = color, rotation = null, alpha = opacity) {
    if (Math.min(w,h,d) <= 0) return;
    const key = String(tone instanceof THREE.Color ? tone.getHex() : tone) + "|" + alpha;
    if (!batches.has(key)) batches.set(key, { tone, alpha, transforms: [] });
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x,y,z), rotation || new THREE.Quaternion(), new THREE.Vector3(w,h,d));
    batches.get(key).transforms.push(frame.clone().multiply(m));
  }
  function beam(a,b,w=.055,tone=0xb8bfc0) {
    const delta = b.clone().sub(a), mid = a.clone().add(b).multiplyScalar(.5);
    if (delta.length()<.001) return;
    box(mid.x,mid.y,mid.z,w,delta.length(),w,tone,new THREE.Quaternion().setFromUnitVectors(UP,delta.normalize()));
  }
  function finish() {
    for (const {tone,alpha,transforms} of batches.values()) {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:tone,roughness:.75,opacity:alpha,transparent:alpha<1,depthWrite:alpha>=1}),transforms.length);
      transforms.forEach((m,i)=>mesh.setMatrixAt(i,m)); mesh.computeBoundingSphere(); group.add(mesh);
    }
    return group;
  }
  return {group,box,beam,finish,setYaw:y=>{frame.makeRotationY(y);}};
}
// Only the identified Herald joints use these details. Side signs are in
// the fixture frame, looking from the low landing toward the high landing.
export function heraldRailDetail(id) {
  const outerSide={"ramp-1":1,"ramp-2":-1,"ramp-3":1,"ramp-4":-1}[id];
  return outerSide ? {outerSide} : undefined;
}
export function facility({a,b,kind,color=0x875a76,opacity=1,rise,accessA,accessB,width:customWidth,railDetail,flushUpperLanding=false}) {
  const k=kit(color,opacity), lo=a.y<=b.y?a:b, hi=a.y<=b.y?b:a;
  k.group.name=kind;
  k.group.userData.endpoints=[a.toArray(),b.toArray()];
  const run=Math.hypot(hi.x-lo.x,hi.z-lo.z), height=hi.y-lo.y;
  const yaw=Math.atan2(hi.x-lo.x,hi.z-lo.z);
  k.group.position.copy(lo); k.group.rotation.y=yaw;
  if(kind==="elevator") {
    // Open landing fronts, paired door leaves retracted into side pockets. Door face
    // is a display convention; source records do not establish its real orientation.
    const lowAccess=lo===a?accessA:accessB;
    const shaftYaw=lowAccess?Math.atan2(lowAccess.x-lo.x,lowAccess.z-lo.z):0;
    k.group.rotation.y=shaftYaw;
    for(const x of [-1.4,1.4]) for(const z of [-1.4,1.4]) k.box(x,(height+2.4)/2,z,.12,height+2.4,.12);
    for(const y of [0,height]) {
      const endpoint=y===0?lo:hi, target=endpoint===a?accessA:accessB;
      const doorYaw=target?Math.atan2(target.x-endpoint.x,target.z-endpoint.z):shaftYaw;
      k.setYaw(Math.round((doorYaw-shaftYaw)/(Math.PI/2))*Math.PI/2);
      k.box(0,y-.1,0,2.8,.2,2.8);
      k.box(0,y+2.3,0,2.8,.16,2.8);
      for(const x of [-.83,.83]) k.box(x,y+1.1,1.4,.12,2.2,.14,0xb8bfc0);
      k.box(0,y+2.18,1.4,1.8,.12,.14,0xb8bfc0);
      for(const x of [-1.1,1.1]) k.box(x,y+1.05,1.36,.4,2.1,.08,0x636b70);
      // Bridge the 1.6 m square floor void even when the door faces diagonally.
      // This threshold is illustrative; its outer end rests on the hall slab.
      k.box(0,y+.012,1.9,1.5,.024,1.2,0xb8bfc0);
      // Back and sides distinguish the shaft from a staircase guard.
      for(const x of [-1.4,1.4]) k.box(x,y+1.1,0,.07,2.2,2.8,0x7c8990);
      k.box(0,y+1.1,-1.4,2.8,2.2,.07,0x7c8990);
    }
    k.setYaw(0);
    k.beam(new THREE.Vector3(0,0,-1.3),new THREE.Vector3(0,height,-1.3),.1,0x636b70);
    return k.finish();
  }
  if(run<.01) return k.finish();
  const width=customWidth ?? (kind==="stairs"?2.4:kind==="ramp"?3.4:kind==="inclined-elevator"?3:1.25);
  const landing=Math.min(.65,run*.12), travel=run-2*landing;
  const at=(z)=>z<=landing?0:z>=run-landing?height:(z-landing)/travel*height;
  const point=(x,z,h=0)=>new THREE.Vector3(x,at(z)+h,z);
  k.box(0,-.09,landing/2,width,.18,landing);
  if(!flushUpperLanding) k.box(0,height-.09,run-landing/2,width,.18,landing);
  if(kind==="inclined-elevator") {
    for(const x of [-1,1]) k.beam(point(x,landing),point(x,run-landing),.14,0x636b70);
    const z=run/2,y=at(z);
    k.box(0,y+.12,z,2.5,.24,2.2);
    for(const x of [-1.2,1.2]) for(const dz of [-1,1]) k.box(x,y+1.2,z+dz,.08,2.2,.08,0xb8bfc0);
    k.box(0,y+2.3,z,2.5,.12,2.2);
    // Dattner's photographs show enclosed, level cabins on inclined guideways.
    // Envelope and glazing dimensions remain illustrative; the cabin is shown mid-trip.
    for(const x of [-1.2,1.2]) k.box(x,y+1.2,z,.035,2.05,1.95,0xadc5cc,null,Math.min(opacity,.32));
    for(const dz of [-1,1]) k.box(0,y+1.2,z+dz,2.3,2.05,.035,0xadc5cc,null,Math.min(opacity,.32));
    for(const dz of [-1,1]) k.box(0,y+1.2,z+dz,.055,2.1,.055,0xb8bfc0);

  } else if(kind==="ramp") {
    const p=point(0,landing),q=point(0,run-landing),d=q.clone().sub(p),mid=p.clone().add(q).multiplyScalar(.5); mid.y-=.1;
    k.box(mid.x,mid.y,mid.z,width,.2,d.length(),color,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize()));
  } else {
    // Instance all treads per material. Count follows physical rise, not exploded spacing.
    const n=Math.max(2,Math.min(240,Math.ceil((Math.abs(rise??height))/.17))), dz=travel/n, dy=height/n;
    for(let i=0;i<n;i++) {
      const y=(i+1)*dy,z=landing+(i+.5)*dz;
      k.box(0,y-(dy+.12)/2,z,width-.16,dy+.12,dz+.002);
      k.box(0,y+.008,z-dz/2+.025,width-.2,.016,Math.min(.05,dz*.3),0xb8bfc0);
    }
    for(const z of [landing*.5,run-landing*.5]) k.box(0,at(z)+.014,z,width-.16,.028,.12,0xbca16b);
  }
  // Side rails follow horizontal approaches; travel mouths remain unobstructed.
  for(const side of [-1,1]) {
    const x=side*(width/2-(side===railDetail?.outerSide?0:.06));
    const zs=flushUpperLanding?[0,landing,run-landing]:[0,landing,run-landing,run];
    for(let i=1;i<zs.length;i++) {
      k.beam(point(x,zs[i-1],1.05),point(x,zs[i],1.05),kind==="escalator"?.095:.065,kind==="escalator"?0x292e33:0xb8bfc0);
      k.beam(point(x,zs[i-1],.52),point(x,zs[i],.52),kind==="escalator"?.12:.04,0x8b979b);
      if(kind==="escalator") {
        // Continuous balustrade/skirt, unlike an open stair railing. Keep the
        // existing travel width and horizontal comb-plate approaches unchanged.
        const p=point(x,zs[i-1],.49),q=point(x,zs[i],.49),d=q.clone().sub(p),mid=p.clone().add(q).multiplyScalar(.5);
        k.box(mid.x,mid.y,mid.z,.065,.88,d.length()+.025,0x8b979b,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),d.normalize()));
        continue;
      }
      const count=Math.max(1,Math.ceil((zs[i]-zs[i-1])/1.3));
      for(let j=0;j<count;j++) { const z=zs[i-1]+(zs[i]-zs[i-1])*j/count; k.beam(point(x,z),point(x,z,1.05),.045); }
    }
    const end=zs.at(-1);
    k.beam(point(x,end),point(x,end,1.05),.045);
  }
  return k.finish();
}
export function fareGates(a,b,color,opacity=1) {
  const k=kit(color,opacity), length=a.distanceTo(b);
  k.group.position.copy(a); k.group.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
  const raw=Math.max(1,Math.floor((length-.28)/1.25)), n=raw%2?raw:Math.max(1,raw-1), pitch=(length-.28)/n;
  k.group.userData.clearLaneWidth=pitch-.28;
  for(let i=0;i<=n;i++) {
    const z=.14+i*pitch;
    k.box(0,.48,z,1.15,.96,.28);
    k.box(0,.985,z,1.18,.05,.3,0x454e55);
    k.box(.35,1.02,z,.16,.02,.16,0x6faaa4);
  }
  return k.finish();
}
// Landing rail terminals use the same width and inset as facility(), in world space.
export function landingPortal(point, other, kind,customWidth,railDetail,isLow) {
  const width=customWidth ?? (kind==="stairs"?2.4:kind==="ramp"?3.4:kind==="inclined-elevator"?3:1.25);
  const along=other.clone().sub(point); along.y=0; along.normalize();
  const side=new THREE.Vector3(along.z,0,-along.x);
  return {point,along,side,railDetail,isLow,kind,landing:Math.min(.65,Math.hypot(other.x-point.x,other.z-point.z)*.12),radius:kind==="elevator"?2.3:width/2+.45,
    rails:kind==="elevator"?null:[1,-1].map(sign=>point.clone().addScaledVector(side,sign*(width/2-(sign===railDetail?.outerSide*(isLow?1:-1)?0:.06))))};
}
// Guard existing floor voids only. Never fence a platform edge or close a landing mouth.
export function openingGuards(ring,portals,opacity=1,closed=true,rectangular=false,sharedEndPosts=false,level={posts:[],beams:[]}) {
  const k=kit(0xb8bfc0,opacity);
  const joints=[], posts=[], segments=[];
  if(rectangular) {
    // Boolean floor cuts and centimetre rounding can leave tiny steps on an
    // otherwise straight boundary. They are not separate railing corners.
    ring=ring.filter((p,i)=>!i || p.distanceTo(ring[i-1])>.025);
    const loop=ring.length>2 && ring[0].distanceTo(ring.at(-1))<.025;
    if(loop)ring.pop();
    let changed=true;
    while(changed && ring.length>2) {
      changed=false;
      for(let i=loop?0:1;i<(loop?ring.length:ring.length-1);i++) {
        const a=ring[(i+ring.length-1)%ring.length],b=ring[i],c=ring[(i+1)%ring.length];
        const ac=c.clone().sub(a),t=b.clone().sub(a).dot(ac)/ac.lengthSq();
        if(t>=0 && t<=1 && b.distanceTo(a.clone().addScaledVector(ac,t))<.025) {ring.splice(i,1);changed=true;break;}
      }
    }
    if(loop)ring.push(ring[0].clone());
  }
  // Platform perimeters need a narrow rectangular mouth, not a circular bite
  // that removes adjacent corners and generates multiple triangular returns.
  const upperMouth=t=>!rectangular && t.isLow===false && t.kind==="stairs";
  const onMouth=(p,t)=>{
    if(upperMouth(t)) {
      const offset=p.clone().sub(t.point), across=Math.abs(offset.dot(t.side));
      return Math.abs(offset.dot(t.along))<.025 && t.rails.some(r=>Math.abs(across-r.distanceTo(t.point))<.26);
    }
    if(!rectangular || !t.rails) return Math.abs(p.distanceTo(t.point)-t.radius)<.015;
    const d=p.clone().sub(t.point),u=d.dot(t.along),v=Math.abs(d.dot(t.side)),end=(t.landing??.65)+.02;
    return u>=-.17 && u<=end+.02 && v<=t.rails[0].distanceTo(t.point)+.095 && (Math.abs(u+.15)<.02 || Math.abs(u-end)<.02 || Math.abs(v-(t.rails[0].distanceTo(t.point)+.08))<.02);
  };
  function terminalAt(p) {
    const portal=portals.filter(t=>t.rails && onMouth(p,t))
      .sort((a,b)=>p.distanceTo(a.point)-p.distanceTo(b.point))[0];
    if(!portal)return;
    const along=rectangular?Math.max(0,Math.min(portal.landing??.65,p.clone().sub(portal.point).dot(portal.along))):0;
    return portal.rails.map(r=>r.clone().addScaledVector(portal.along,along)).reduce((a,b)=>p.distanceTo(a)<p.distanceTo(b)?a:b);
  }
  function guardBars(a,b) {
    const near=(p,q)=>p.distanceToSquared(q)<.0004;
    if(level.beams.some(([p,q])=>near(a,p)&&near(b,q)||near(a,q)&&near(b,p)))return false;
    level.beams.push([a,b]);
    const end=b.clone().sub(a).normalize().multiplyScalar(.025);
    for(const h of [.52,1.05]) {
      const lift=UP.clone().multiplyScalar(h);
      k.beam(a.clone().sub(end).add(lift),b.clone().add(end).add(lift),.065);
    }
    return true;
  }
  function returnToLanding(p) {
    const target=terminalAt(p);
    if(!target) return;
    if(p.distanceTo(target)<.001) return;
    // Each side returns to its own stair rail. Nothing crosses the walking mouth.
    if(!guardBars(p,target))return;
    // The facility owns its terminal post; adding a second one here makes a thick seam.
    joints.push({from:p.toArray(),to:target.toArray()});
  }
  for(let i=0;i<ring.length-(closed?0:1);i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],delta=b.clone().sub(a),len=delta.length();
    if(len<.01) continue;
    const dir=delta.clone().normalize(); let intervals=[[0,len]];
    for(const portal of portals) {
      const {point,radius}=portal;
      if(upperMouth(portal)) {
        // Only trim the threshold across the stair. The parallel edges are
        // exposed floor, including the first part alongside the descent.
        const start=a.clone().sub(point), end=b.clone().sub(point);
        if(Math.max(Math.abs(start.dot(portal.along)),Math.abs(end.dot(portal.along)))>.025)continue;
        const speed=dir.dot(portal.side);
        if(Math.abs(speed)<.99)continue;
        const x=start.dot(portal.side);
        const ends=portal.rails.map(r=>(r.clone().sub(point).dot(portal.side)-x)/speed);
        const lo=Math.min(...ends),hi=Math.max(...ends);
        intervals=intervals.flatMap(([s,e])=>hi<=s||lo>=e?[[s,e]]:[[s,lo],[hi,e]].filter(([l,r])=>r-l>.001));
        continue;
      }
      if(rectangular && portal.rails) {
        let lo=0,hi=len;
        for(const [axis,half,shift] of [[portal.along,((portal.landing??.65)+.17)/2,((portal.landing??.65)-.13)/2],[portal.side,portal.rails[0].distanceTo(point)+.08,0]]) {
          const base=a.clone().sub(point).dot(axis)-shift,speed=dir.dot(axis);
          if(Math.abs(speed)<1e-9) {if(Math.abs(base)>half) {lo=1;hi=0;break;}}
          else {const t0=(-half-base)/speed,t1=(half-base)/speed;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));}
        }
        if(hi>lo) intervals=intervals.flatMap(([s,e])=>hi<=s||lo>=e?[[s,e]]:[[s,Math.max(s,lo)],[Math.min(e,hi),e]].filter(([l,r])=>r-l>.05));
        continue;
      }
      const t=point.clone().sub(a).dot(dir),dist=point.distanceTo(a.clone().addScaledVector(dir,t));
      if(dist>=radius) continue;
      const h=Math.sqrt(radius*radius-dist*dist);
      intervals=intervals.flatMap(([s,e])=>t+h<=s||t-h>=e?[[s,e]]:[[s,Math.max(s,t-h)],[Math.min(e,t+h),e]].filter(([l,r])=>r-l>.05));
    }
    for(const [s,e] of intervals) {
      let p=a.clone().addScaledVector(dir,s),q=a.clone().addScaledVector(dir,e);
      const pt=terminalAt(p),qt=terminalAt(q);
      // A tiny perimeter fragment returning to the same rail at both ends is
      // a redundant triangular loop, not a protective boundary.
      if(rectangular && pt && qt && pt.distanceTo(qt)<.001) continue;
      // Preserve the floor boundary. Moving these endpoints to a stair rail
      // rotates long perimeter runs and can remove valid enclosure.
      if(rectangular) {
        // A nearly collinear continuation is one rail, not a short return
        // with its own post. Preserve all other perimeter corners.
        const axis=q.clone().sub(p).normalize();
        const joins=(end,target,outward)=>{
          if(!target || !portals.some(portal=>portal.railDetail && portal.rails.some(r=>r.distanceTo(target)<.025)))return false;
          const delta=target.clone().sub(end),length=delta.dot(outward);
          return length>0 && delta.addScaledVector(outward,-length).length()<.022;
        };
        if(joins(p,pt,axis.clone().negate()))p=pt;
        if(joins(q,qt,axis))q=qt;
      }
      const railDir=q.clone().sub(p).normalize();
      // Overlap rail ends inside the corner post, avoiding bevel-shaped cracks.
      if(guardBars(p,q))segments.push([p.toArray(),q.toArray()]);
      if(!portals.some(t=>upperMouth(t) && onMouth(p,t) && Math.abs(railDir.dot(t.side))>.99))returnToLanding(p);
      if(!portals.some(t=>upperMouth(t) && onMouth(q,t) && Math.abs(railDir.dot(t.side))>.99))returnToLanding(q);
      const n=Math.max(1,Math.ceil((e-s)/1.3));
      for(let j=0;j<=n;j++){
        // Facility rails already own their terminal posts. Shared perimeter
        // vertices own one post, not one per adjacent segment.
        const t=p.clone().lerp(q,j/n);
        if(rectangular && portals.some(portal=>portal.railDetail && portal.rails.some(r=>r.distanceTo(t)<.025)))continue;
        if(sharedEndPosts && (t.distanceTo(ring[0])<.001 || t.distanceTo(ring.at(-1))<.001))continue;
        if(portals.some(p=>upperMouth(p) && p.rails.some(r=>r.distanceTo(t)<.025)))continue;
        if(level.posts.some(v=>v.distanceTo(t)<.08))continue;
        level.posts.push(t);posts.push(t);k.beam(t,t.clone().addScaledVector(UP,1.05),.045);
      }
    }
  }
  k.group.userData.landingJoints=joints;
  k.group.userData.guardPosts=posts.map(p=>p.toArray());
  k.group.userData.guardSegments=segments;
  return k.finish();
}

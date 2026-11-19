import * as T from "three";

export function buildTerminalRamp(a,b,width,oysterBar) {
  const group=new T.Group();
  const span=b.clone().sub(a);
  const run=Math.hypot(span.x,span.z);
  const rise=span.y;
  group.position.copy(a);
  group.rotation.y=Math.atan2(span.x,span.z);
  // Neutral stone for unverified paving. Historic red tile is an inference
  // from LPC's description of the circulation system, not a finish schedule.
  const paving=new T.MeshStandardMaterial({color:oysterBar?0xa66e5c:0xc9c2b2});
  const metal=new T.MeshStandardMaterial({color:oysterBar?0x8c714c:0x81868a,metalness:.45,roughness:.42});
  const shape=new T.Shape([new T.Vector2(0,0),new T.Vector2(run,rise),
    new T.Vector2(run,rise-.22),new T.Vector2(0,-.22)]);
  const geometry=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false});
  geometry.translate(0,0,-width/2);
  const slab=new T.Mesh(geometry,paving);
  slab.rotation.y=-Math.PI/2;
  group.add(slab);
  function tube(start,end,radius) {
    const delta=end.clone().sub(start);
    const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,delta.length(),10),metal);
    mesh.position.copy(start).lerp(end,.5);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
    group.add(mesh);
  }
  const sidewall=oysterBar?new T.MeshStandardMaterial({color:0xc9b99e}):null;
  for(const sign of [-1,1]) {
    if(sidewall) {
      const section=new T.Shape([new T.Vector2(0,-.22),new T.Vector2(run,rise-.22),
        new T.Vector2(run,rise+.83),new T.Vector2(0,.83)]);
      const geometry=new T.ExtrudeGeometry(section,{depth:.16,bevelEnabled:false});
      const wall=new T.Mesh(geometry,sidewall);
      wall.rotation.y=-Math.PI/2;
      wall.position.x=sign*width/2+(sign>0?.16:0);
      group.add(wall);
    }
    const x=sign*(width/2-.12);
    tube(new T.Vector3(x,.9,0),new T.Vector3(x,rise+.9,run),.027);
    const count=Math.ceil(run/1.6);
    for(let index=0;index<count;index++) {
      const t=(index+.5)/count, y=rise*t, z=run*t;
      if(oysterBar) {
        tube(new T.Vector3(sign*width/2,y+.79,z),new T.Vector3(x,y+.9,z),.018);
      } else {
        tube(new T.Vector3(x,y,z),new T.Vector3(x,y+.9,z),.022);
      }
    }
  }
  return group;
}

import * as T from "three";

// Concourse banks use the modeled floor cut and a short horizontal comb at
// either end. The exposed casing and finish are reconstructed, not surveyed.
export function buildConcourseEscalator(a,b,width,{upperComb=false}={}) {
  const low=a.y<b.y?a:b, high=low===a?b:a;
  const run=Math.hypot(high.x-low.x,high.z-low.z), rise=high.y-low.y;
  const group=new T.Group();
  group.position.copy(low);
  group.rotation.y=Math.atan2(high.x-low.x,high.z-low.z);
  const casing=new T.MeshStandardMaterial({color:0x56616a});
  const rubber=new T.MeshStandardMaterial({color:0x252729});
  const tread=new T.MeshStandardMaterial({color:0x83888c});
  const landing=.65;
  const profile=[[0,0],[landing,0],[run-landing,rise],[run,rise]];

  function strip(x,depth,top,bottom,material) {
    const points=[...profile.map(([z,y])=>[z,y+top]),
      ...profile.toReversed().map(([z,y])=>[z,y+bottom])];
    const shape=new T.Shape(points.map(([z,y])=>new T.Vector2(z,y)));
    const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});
    geometry.translate(0,0,-depth/2);
    const mesh=new T.Mesh(geometry,material);
    mesh.rotation.y=-Math.PI/2;
    mesh.position.x=x;
    group.add(mesh);
  }
  strip(0,width-.08,-.12,-.38,casing);
  for(const side of [-1,1]) {
    const x=side*(width/2-.075);
    strip(x,.11,.88,-.13,casing);
    strip(x,.13,.94,.88,rubber);
  }
  const count=Math.ceil(rise/.18), pitch=(run-2*landing)/count;
  const steps=new T.InstancedMesh(new T.BoxGeometry(width-.28,.11,pitch),tread,count);
  for(let i=0;i<count;i++) {
    steps.setMatrixAt(i,new T.Matrix4().makeTranslation(
      0,rise*(i+1)/count-.055,landing+(i+.5)*pitch));
  }
  group.add(steps);
  // The high comb meets the slab at the edge of the opening.
  const comb=new T.Mesh(new T.BoxGeometry(width-.22,.12,landing),tread);
  comb.position.set(0,-.06,landing/2);
  group.add(comb);
  if(upperComb) {
    const top=comb.clone();
    top.position.set(0,rise-.06,run-landing/2);
    group.add(top);
  }
  return group;
}

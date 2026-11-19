import * as T from "three";
import { towerOutline, towerStack } from "./tower.js";

// The shell and the floor study use the same podium and taper.
export function createTowerExterior() {
  const group = new T.Group();
  const podiumTop = 186 * .3048;
  const roof = 1368 * .3048;
  const finish = (color, roughness=.48) => new T.MeshStandardMaterial({color,roughness,side:T.DoubleSide});
  const podium = finish(0x748994);
  const fins = finish(0xa8bac4);
  const glass = [0x789bab,0x9eb8c5,0x7b9aab,0xa8c1cb].map(color=>finish(color));
  const metal = finish(0xbcc4c8);
  const origin = [-208,-68];

  function ring(y) {
    // Sample just below the tip to keep matching octagonal indices through the taper.
    return towerOutline(Math.min(y,roof-.001),{keepCorners:true}).map(([x,z])=>new T.Vector3(x-origin[0],y,z-origin[1]));
  }
  const batches=new Map();
  function belt(bottom,top,materials,cap=false) {
    const low=ring(bottom), high=ring(top);
    for(let i=0;i<low.length;i++) {
      const next=(i+1)%low.length;
      const material=materials[i%materials.length];
      if(!batches.has(material)) batches.set(material,{points:[],indices:[]});
      const {points,indices}=batches.get(material);
      const offset=points.length/3;
      points.push(...low[i].toArray(),...low[next].toArray(),...high[next].toArray(),...high[i].toArray());
      indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
    }
    if(cap) {
      const shape=new T.Shape(high.map(p=>new T.Vector2(p.x,-p.z)));
      const roofMesh=new T.Mesh(new T.ShapeGeometry(shape),metal);
      roofMesh.rotation.x=-Math.PI/2;
      roofMesh.position.y=top;
      group.add(roofMesh);
    }
  }
  belt(0,podiumTop,[podium]);
  const divisions=[podiumTop,...towerStack.map(f=>f.y).filter(y=>y>podiumTop&&y<roof),roof];
  for(let i=1;i<divisions.length;i++) {
    const low=divisions[i-1], high=divisions[i];
    if(high-low<.17) {belt(low,high,glass,high===roof);continue;}
    belt(low,high-.13,glass);
    belt(high-.13,high,[fins],high===roof);
  }

  for(const [material,{points,indices}] of batches) {
    const geometry=new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(points,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    group.add(new T.Mesh(geometry,material));
  }

  const half=204*.3048/2, count=29;
  const blades=new T.InstancedMesh(new T.BoxGeometry(.12,podiumTop-.5,.36),fins,count*4);
  const matrix=new T.Matrix4();
  for(let side=0;side<4;side++) {
    const angle=side*Math.PI/2;
    for(let i=0;i<count;i++) {
      const x=(i/(count-1)-.5)*(2*half-1.3);
      const p=new T.Vector3(x,podiumTop/2,half).applyAxisAngle(new T.Vector3(0,1,0),angle);
      matrix.makeRotationY(angle).setPosition(p);
      blades.setMatrixAt(side*count+i,matrix);
    }
  }
  group.add(blades);
  for(const [bottom,top,radiusTop,radiusBottom] of [[roof,429,3.4,5.2],[429,478,1.8,3.4],[478,541.3,.24,1.8]]) {
    const mast=new T.Mesh(new T.CylinderGeometry(radiusTop,radiusBottom,top-bottom,12),metal);
    mast.position.y=(bottom+top)/2;
    group.add(mast);
  }
  return group;
}

import * as T from "three";
import { sculpt } from "./statuary.js";

export function portico(face, stone, trim, box, arch) {
  const axes=[-7.2,0,7.2];
  const wall=new T.Shape();
  wall.moveTo(-15.4,4); wall.lineTo(15.4,4); wall.lineTo(15.4,21);
  wall.lineTo(-15.4,21); wall.closePath();
  for(const x of axes){
    const hole=new T.Path();
    arch(hole,x,4.02,5.7,14.5);
    wall.holes.push(hole);
  }
  const vault=new T.Mesh(new T.ExtrudeGeometry(wall,{depth:3.6,bevelEnabled:false,curveSegments:24}),stone);
  vault.position.z=.77;
  face.add(vault);
  const bronze=new T.MeshStandardMaterial({color:0x514239,roughness:.7});
  const glazing=new T.MeshStandardMaterial({color:0x656d65,roughness:.43});
  const wood=new T.MeshStandardMaterial({color:0x3e3027,roughness:.75});
  for(const [index,x] of axes.entries()){
    // The photograph shows a large arch at the portico and a smaller door
    // and glazed transom at the recessed end of the barrel.
    const window=new T.Shape();
    arch(window,x,8.2,4.25,7.2);
    const pane=new T.Mesh(new T.ShapeGeometry(window,24),glazing);
    pane.position.z=.9;
    face.add(pane);
    for(const dx of [-1.05,0,1.05]) box(face,bronze,x+dx,11.25,.96,.08,6.1,.08);
    for(const y of [9.2,10.5,11.8,13.1]) box(face,bronze,x,y,.96,4.16,.08,.08);
    for(const dx of [-1.34,1.34]) box(face,trim,x+dx,6.1,1.12,.42,4.2,.6);
    // The center opening shows a door leaf on either side of the passage.
    const doorZ=1.09;
    const openingWidth=2.22;
    for(const side of [-1,1]){
      const leaf=new T.Group();
      leaf.position.set(x+side*openingWidth/2,4.02,doorZ);
      leaf.rotation.y=index===1?side*1.37:0;
      face.add(leaf);
      const leafX=-side*.54;
      box(leaf,wood,leafX,.76,0,1.08,1.52,.14);
      box(leaf,glazing,leafX,2.39,.03,1.04,1.8,.09);
      for(const edge of [-.52,0,.52]) box(leaf,wood,leafX+edge,2.42,.10,.075,1.88,.12);
      for(const level of [1.51,2.40,3.32]) box(leaf,wood,leafX,level,.10,1.1,.09,.12);
      box(leaf,bronze,leafX-side*.37,1.39,.15,.045,.22,.08);
    }
    box(face,wood,x,7.54,doorZ,2.24,.14,.17);
    box(face,glazing,x,7.87,doorZ,2.12,.52,.10);
    for(const dx of [-1.06,0,1.06]) box(face,wood,x+dx,7.87,doorZ+.06,.09,.58,.13);
    for(const side of [-1,1]) {
      const dx=side*1.76;
      box(face,stone,x+dx,6.06,.89,.63,4.12,.36);
      box(face,trim,x+dx,5.93,1.09,.39,3.32,.13);
    }
    box(face,trim,x,8.18,1.15,3.1,.3,.67);
    const pediment=new T.Shape();
    pediment.moveTo(-1.65,0);pediment.lineTo(1.65,0);pediment.lineTo(0,.82);pediment.closePath();
    const hood=new T.Mesh(new T.ExtrudeGeometry(pediment,{depth:.55,bevelEnabled:false}),trim);
    hood.position.set(x,8.32,.84);
    face.add(hood);
    for(const [r,band,offset] of [[2.86,.31,4.38],[3.17,.16,4.48]]){
      const ring=new T.RingGeometry(r,r+band,32,1,0,Math.PI);
      const archTrim=new T.Mesh(ring,trim);
      archTrim.position.set(x,15.67,offset);
      face.add(archTrim);
    }
    for(let i=1;i<24;i++){
      const theta=i*Math.PI/24;
      const bead=box(face,stone,x+3.24*Math.cos(theta),15.67+3.24*Math.sin(theta),4.50,.095,.16,.09);
      bead.rotation.z=theta-Math.PI/2;
    }
    box(face,trim,x,18.98,4.46,.66,.88,.29);
    const head=new T.Mesh(sculpt([
      [0,.035,0,.20,.31,.12],[-.09,-.05,.095,.08,.14,.08],[.09,-.05,.095,.08,.14,.08],
      [0,-.055,.15,.056,.11,.07],[0,-.21,.055,.12,.09,.085],
      [0,.22,-.005,index===1?.225:.20,.13,.13],
      [-.16,.13,.02,.065,.15,.09],[.16,.13,.02,.065,.15,.09]
    ],.026),trim);
    head.position.set(x,18.96,4.58);
    face.add(head);
    box(face,bronze,x,15.7,2.7,.065,1.8,.065);
    const lamp=new T.Mesh(new T.SphereGeometry(.44,16,10),bronze);
    lamp.position.set(x,14.6,2.7);
    face.add(lamp);
  }
  const shaft = new T.CylinderGeometry(.58,.71,14.9,120,5);
  const p=shaft.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i);
    if(Math.hypot(x,z)<.1) continue;
    const flute=1-.072*Math.pow(.5+.5*Math.cos(24*Math.atan2(z,x)),2);
    p.setX(i,x*flute); p.setZ(i,z*flute);
  }
  shaft.computeVertexNormals();
  for(const x of [-11.15,-4.6,-2.95,2.95,4.6,11.15]){
    const col=new T.Mesh(shaft,trim);
    col.position.set(x,12.23,4.8);
    face.add(col);
    box(face,stone,x,4.39,4.8,1.56,.78,1.62);
    box(face,trim,x,4.82,4.8,1.45,.14,1.48);
    const capital=new T.Mesh(new T.CylinderGeometry(.81,.56,.86,16),trim);
    capital.position.set(x,20.03,4.8);
    face.add(capital);
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      const leaf=new T.Mesh(new T.SphereGeometry(1,8,6),trim);
      leaf.scale.set(.15,.40,.12);
      leaf.position.set(x+.66*Math.cos(a),20.04,4.8+.66*Math.sin(a));
      leaf.rotation.z=-.32*Math.cos(a);
      face.add(leaf);
    }
    box(face,trim,x,20.54,4.8,1.68,.23,1.66);
  }
  for(const x of [-14,14]) box(face,stone,x,12.4,3.23,2.75,16.8,2.7);
  for(const [y,h,w,d] of [[21,.54,30.8,5.5],[21.68,.83,31.5,5.9],[22.29,.27,32.4,6.6],[22.68,.51,33,6.8],[28.1,.3,30.3,5.5],[28.52,.43,31,5.8]]){
    box(face,trim,0,y,2.65,w,h,d);
  }
  for(let i=-29;i<=29;i++) box(face,stone,i*.51,22.12,5.88,.26,.19,.27);
  box(face,stone,0,25.45,2.13,30,5.08,4.7);
  for(const x of [-8.2,0,8.2]) {
    box(face,trim,x,25.23,4.53,6.55,2.4,.13);
    box(face,stone,x,25.23,4.62,6.22,2.11,.08);
  }
}

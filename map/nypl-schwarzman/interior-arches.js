import { readingRoomBounds } from "./datums.js";
import * as T from "three";

export function interiorArches(first,third,box,stone,trim,arch,width){
  const iron=new T.MeshStandardMaterial({color:0x393731,roughness:.7});
  const glass=new T.MeshStandardMaterial({color:0x7599b3,roughness:.32,side:T.DoubleSide});
  function wall(parent,x,z,rotation,span,height,depth,openings){
    const group=new T.Group();
    group.position.set(x,0,z);
    group.rotation.y=rotation;
    parent.add(group);
    const section=new T.Shape();
    section.moveTo(-span/2,0);section.lineTo(span/2,0);section.lineTo(span/2,height);
    section.lineTo(-span/2,height);section.closePath();
    for(const [u,bottom,w,h,door] of openings){
      const cut=new T.Path();
      if(door){
        cut.moveTo(u-w/2,bottom);cut.lineTo(u+w/2,bottom);cut.lineTo(u+w/2,bottom+h);
        cut.lineTo(u-w/2,bottom+h);cut.closePath();
      }else arch(cut,u,bottom,w,h);
      section.holes.push(cut);
    }
    group.add(new T.Mesh(new T.ExtrudeGeometry(section,{depth,bevelEnabled:false,curveSegments:24}),stone));
    return group;
  }
  function frame(group,u,bottom,w,h,depth,ironBand=false,blind=false){
    const r=w/2,spring=bottom+h-r;
    const archFace=trim.clone();
    archFace.side=T.DoubleSide;
    for(const [rad,band,z] of [[r,.13,-.09],[r+.13,.14,-.18],[r+.27,.08,-.225]]){
      const ring=new T.Mesh(new T.RingGeometry(rad,rad+band,32,1,0,Math.PI),archFace);
      ring.position.set(u,spring,z);
      group.add(ring);
      for(const side of [-1,1]) box(group,trim,u+side*(rad+band/2),(bottom+spring)/2,z,band,spring-bottom,.10);
    }
    box(group,trim,u,bottom-.13,depth*.23,w+.48,.24,depth*.86+.3);
    if(blind) return;
    const pane=new T.Shape();
    arch(pane,u,bottom,w,h);
    const mesh=new T.Mesh(new T.ShapeGeometry(pane,32),glass);
    mesh.position.z=depth*.85;
    group.add(mesh);
    const grid=depth*.85-.035;
    for(const f of [-.75,-.5,-.25,0,.25,.5,.75]){
      const dx=r*f, top=spring+Math.sqrt(r*r-dx*dx);
      box(group,iron,u+dx,(top+bottom)/2,grid,.065,top-bottom,.07);
    }
    for(let y=bottom+.82;y<bottom+h-.20;y+=.88){
      const half=y<spring?r:Math.sqrt(Math.max(0,r*r-(y-spring)**2));
      box(group,iron,u,y,grid,2*half,.055,.07);
    }
    if(ironBand){
      const grille=iron.clone();
      grille.side=T.DoubleSide;
      for(const inset of [.07,.30]){
        const ring=new T.Mesh(new T.RingGeometry(r-inset,r-inset+.055,32,1,0,Math.PI),grille);
        ring.position.set(u,spring,grid-.055);
        group.add(ring);
      }
      for(let i=1;i<22;i++){
        const a=i*Math.PI/22, rad=r-.17;
        const rosette=new T.Mesh(new T.TorusGeometry(.105,.021,6,10),iron);
        rosette.position.set(u+Math.cos(a)*rad,spring+Math.sin(a)*rad,grid-.09);
        group.add(rosette);
      }
    }
  }

  // Only the two room partitions remain here. The long walls and
  // their glazing belong to the exterior shell.
  const {west,east,north,south}=readingRoomBounds(width);
  for(const [z,rotation] of [[north,Math.PI],[south,0]]){
    const end=wall(third,(west+east)/2,z,rotation,east-west,15.8496,.23,[[0,.02,2.6,2.9,true]]);
    frame(end,0,4.8,5.3,8.2,.23,false,true);
  }

  // Three internal Astor Hall arches sit over separate entrance doorways.
  const axes=[-7.2,0,7.2];
  const openings=axes.flatMap(u=>[[u,4.1,4.3,6.15,false],[u,.02,2.42,3.96,true]]);
  const entry=wall(first,39.88,0,Math.PI/2,22,12.6,.44,openings);
  for(const u of axes){
    frame(entry,u,4.1,4.3,6.15,.44,true);
    for(const s of [-1,1]) box(entry,trim,u+s*1.33,1.96,-.22,.26,3.92,.55);
    box(entry,trim,u,3.99,-.21,3.15,.17,.62);
  }
  for(const u of [-10.35,-3.62,3.62,10.35]){
    const column=new T.Mesh(new T.CylinderGeometry(.27,.32,5.63,18),trim);
    column.position.set(u,2.99,-.62);
    entry.add(column);
    box(entry,trim,u,.13,-.62,.79,.26,.75);
    box(entry,trim,u,5.91,-.62,.82,.25,.74);
  }
}

import * as T from "three";
import { sculpt } from "./statuary.js";

function lathe(parent, material, x, y, z, profile) {
  const mesh=new T.Mesh(new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),40),material);
  mesh.position.set(x,y,z);
  parent.add(mesh);
}
export function entranceOrnaments(face, stone, trim, box, arch) {
  const water=new T.MeshStandardMaterial({color:0x78857a,roughness:.44});
  for(const side of [-1,1]){
    const x=side*17.7;
    const recess=new T.Shape();
    arch(recess,x,4.55,3.5,5.85);
    const back=new T.Mesh(new T.ShapeGeometry(recess,24),stone);
    back.position.z=-.48;
    face.add(back);
    const spring=4.55+5.85-1.75;
    const rim=new T.Mesh(new T.RingGeometry(1.75,2.02,32,1,0,Math.PI),trim);
    rim.position.set(x,spring,.84);
    face.add(rim);
    for(const dx of [-1.88,1.88]) box(face,trim,x+dx,(spring+4.55)/2,.79,.27,spring-4.55,.33);
    for(let i=1;i<8;i++){
      const angle=i*Math.PI/8;
      const rib=new T.Mesh(new T.CylinderGeometry(.023,.023,1.46,6),trim);
      rib.position.set(x+Math.cos(angle)*.99,spring+Math.sin(angle)*.99,-.42);
      rib.rotation.z=angle-Math.PI/2;
      face.add(rib);
    }
    const basin=new T.Group();
    basin.position.set(x,1.45,2.35);
    basin.scale.set(1,.82,.72);
    face.add(basin);
    box(face,stone,x,.72,2.35,4.24,1.44,2.8);
    box(face,trim,x,3.13,1.03,2.72,2.48,1.45);
    lathe(basin,trim,0,0,0,[[0,0],[1.8,0],[2.12,.2],[2.26,.46],[2.3,.63],[2.13,.68],[2.03,.46],[0,.46]]);
    const pool=new T.Mesh(new T.CircleGeometry(2.05,40),water);
    pool.rotation.x=-Math.PI/2;
    pool.position.y=.49;
    basin.add(pool);
    box(face,trim,x,4.37,.66,3.47,.34,1.64);
    const beauty=side<0;
    const parts=beauty ? [
      [-.37,.38,.21,.84,.41,.53],[.32,.92,.19,.43,.71,.43,-.19],
      [.23,1.74,.18,.32,.49,.32,-.13],[.10,2.36,.17,.22,.29,.23],
      [-.49,1.30,.25,.17,.61,.18,.29],[.48,1.79,.26,.14,.48,.16,-.12],
      [.22,.39,.54,.37,.29,.29],[-.67,.21,.49,.49,.21,.25]
    ] : [
      [-.13,.46,.17,.83,.48,.56],[-.46,.57,.46,.35,.37,.31],
      [.28,1.24,.19,.57,.62,.43,.13],[.23,1.94,.18,.42,.56,.37,-.12],
      [.07,2.53,.23,.28,.31,.25],[.08,2.31,.38,.21,.23,.18],
      [-.48,1.57,.34,.24,.61,.19,.17],[.57,1.44,.37,.25,.42,.22,.17],
      [.61,.55,.36,.27,.54,.28]
    ];
    const figure=new T.Mesh(sculpt(parts,.055),trim);
    figure.position.set(x,4.53,.51);
    figure.name=beauty?"Beauty fountain":"Truth fountain";
    face.add(figure);

    // The two carved urns stand in front of the outer portico piers.
    const urnX=side*14.4, urnZ=6.4;
    box(face,stone,urnX,1.7,urnZ,1.47,3.4,1.47);
    box(face,stone,urnX,3.7,urnZ,1.24,.6,1.24);
    lathe(face,trim,urnX,4,urnZ,[[0,0],[.48,0],[.48,.1],[.34,.16],[.23,.31],[.24,.43],
      [.43,.55],[.56,.77],[.64,1.09],[.74,1.27],[.77,1.38],[.65,1.38],[.60,1.23],[.50,.84],[0,.73]]);
    for(const handleSide of [-1,1]){
      const handle=new T.Mesh(new T.TorusGeometry(.19,.055,8,16,Math.PI*1.33),trim);
      handle.position.set(urnX+handleSide*.66,5.15,urnZ);
      handle.rotation.z=handleSide*Math.PI/2;
      face.add(handle);
    }
  }
}

import * as T from "three";

// Sample the union of the sculpted masses, smooth the occupancy field, then
// triangulate its boundary. Adjacent cells share vertices and vertex normals.
export function sculpt(parts, spacing, cuts=[]) {
  const min = [0,1,2].map(axis => Math.min(...parts.map(p=>p[axis]-p[axis+3]))-3*spacing);
  const max = [0,1,2].map(axis => Math.max(...parts.map(p=>p[axis]+p[axis+3]))+3*spacing);
  const [nx,ny,nz] = max.map((v,axis)=>Math.ceil((v-min[axis])/spacing)+1);
  const layer = nx*ny;
  const count = layer*nz;
  const raw = new Float32Array(count);
  const field = new Float32Array(count);
  const point = i => [min[0]+(i%nx)*spacing,min[1]+(Math.floor(i/nx)%ny)*spacing,min[2]+Math.floor(i/layer)*spacing];
  for(let i=0;i<count;i++){
    const [x,y,z]=point(i);
    let value=0;
    for(const [cx,cy,cz,rx,ry,rz,lean=0] of parts){
      const dy=(y-cy)/ry;
      const d=Math.hypot((x-cx-lean*dy)/rx,dy,(z-cz)/rz);
      value=Math.max(value,Math.max(0,Math.min(1,.5+(1-d)*Math.min(rx,ry,rz)/spacing)));
    }
    for(const [cx,cy,cz,rx,ry,rz] of cuts){
      const d=Math.hypot((x-cx)/rx,(y-cy)/ry,(z-cz)/rz);
      const removal=Math.max(0,Math.min(1,.5+(1-d)*Math.min(rx,ry,rz)/spacing));
      value=Math.min(value,1-removal);
    }
    raw[i]=value;
  }
  for(let z=1;z<nz-1;z++) for(let y=1;y<ny-1;y++) for(let x=1;x<nx-1;x++){
    const i=x+y*nx+z*layer;
    field[i]=(4*raw[i]+raw[i-1]+raw[i+1]+raw[i-nx]+raw[i+nx]+raw[i-layer]+raw[i+layer])/10;
  }
  const positions=[], indices=[], vertices=new Map();
  const iso=.46;
  function intersection(a,b){
    const key=Math.min(a,b)*count+Math.max(a,b);
    if(vertices.has(key)) return vertices.get(key);
    const start=point(a), end=point(b), t=(iso-field[a])/(field[b]-field[a]);
    const index=positions.length/3;
    positions.push(...start.map((v,axis)=>T.MathUtils.lerp(v,end[axis],t)));
    vertices.set(key,index);
    return index;
  }
  const p=i=>new T.Vector3().fromArray(positions,i*3);
  function triangle(a,b,c,inside,outside){
    const normal=p(b).sub(p(a)).cross(p(c).sub(p(a)));
    if(normal.dot(new T.Vector3(...point(outside)).sub(new T.Vector3(...point(inside))))<0) [b,c]=[c,b];
    indices.push(a,b,c);
  }
  const tetrahedra=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
  const offsets=[0,1,nx,nx+1,layer,layer+1,layer+nx,layer+nx+1];
  for(let z=0;z<nz-1;z++) for(let y=0;y<ny-1;y++) for(let x=0;x<nx-1;x++){
    const base=x+y*nx+z*layer;
    const cube=offsets.map(o=>base+o);
    if(cube.every(i=>field[i]<iso)||cube.every(i=>field[i]>=iso)) continue;
    for(const tetra of tetrahedra){
      const corners=tetra.map(i=>cube[i]);
      const inside=corners.filter(i=>field[i]>=iso);
      const outside=corners.filter(i=>field[i]<iso);
      if(inside.length===1) triangle(...outside.map(b=>intersection(inside[0],b)),inside[0],outside[0]);
      if(outside.length===1) triangle(...inside.map(a=>intersection(a,outside[0])),inside[0],outside[0]);
      if(inside.length===2){
        const [a,b]=inside,[c,d]=outside;
        const ac=intersection(a,c),ad=intersection(a,d),bc=intersection(b,c),bd=intersection(b,d);
        triangle(ac,ad,bd,a,c);
        triangle(ac,bd,bc,a,c);
      }
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// North to south, observed from Fifth Avenue. Depth and folds are reconstructed.
const poses=[
  [-.17,-.24,.48,2.18,.36,1.5],[-.08,-.42,.38,1.93,.28,1.54],
  [.12,-.42,.40,1.50,.32,1.92],[-.10,-.48,.32,2.12,.33,1.43],
  [.13,-.36,.42,1.46,.34,2.06],[.14,-.30,.38,1.77,.32,1.92]
];
export function atticFigure(index){
  const [head, left, right, ly, reach, ry]=poses[index];
  return [
    [head,3.00,.16,.24,.34,.24],[head+.03,2.69,.11,.22,.25,.29],
    [head*.5,2.25,.03,.49,.60,.38,head*.5],[0,1.60,.01,.42,.43,.40],
    [-.21,.91,.09,.31,.83,.34,.14],[.22,.92,-.04,.32,.81,.39,-.13],
    [-.22,.19,.14,.26,.18,.32],[.22,.16,.07,.25,.15,.31],
    [left,ly,.19,.22,.52,.25,.15],[right,ry,.28,.20,.50,.24,-reach/2],
    [left*.8,ly-.17,.42,.15,.24,.20],[right*.65,ry-.18,.46,.16,.23,.17],
    [-.36,1.22,.28,.13,.83,.16,.24],[.35,1.04,.22,.14,.83,.19,-.19],
    [.05,1.38,.38,.17,.66,.13,.21],[head+.07,3.02,.36,.11,.12,.10]
  ];
}

// Local +X is the gaze direction. Each lion has its own head carriage and
// paw offsets. Photographs constrain the outline, with depth reconstructed.
export function libraryLion(isPatience) {
  const headHeight=isPatience?1.26:1.37;
  const parts=[
    [-.53,.59,0,1.62,.56,.64],[-1.58,.48,0,.72,.47,.66],
    [-1.16,.35,.47,.72,.35,.38],[-1.16,.35,-.46,.73,.35,.38],
    [-.39,.34,.57,.66,.24,.26],[-.38,.34,-.56,.67,.24,.26],
    [.69,.75,0,.78,.69,.70],[1.05,1.05,0,.66,.79,.70,-.08],
    [1.55,headHeight,0,.52,.50,.47],[1.73,headHeight+.21,0,.37,.28,.39],
    [1.89,headHeight-.19,0,.32,.22,.35],[2.10,headHeight-.12,0,.27,.19,.24],
    [2.30,headHeight-.07,0,.12,.11,.18],[2.13,headHeight-.29,0,.26,.11,.25]
  ];
  const cuts=[[2.32,headHeight-.222,0,.23,.039,.31]];
  for(const side of [-1,1]){
    parts.push(
      [1.42,headHeight+.41,side*.35,.16,.21,.135,-.06],
      [1.91,headHeight+.08,side*.34,.23,.105,.145],
      [1.92,headHeight-.13,side*.19,.28,.17,.21],
      [.76,.38,side*.46,.67,.29,.30]
    );
    cuts.push([1.96,headHeight+.025,side*.409,.14,.063,.095]);
    const paw=side===1 ? (isPatience?2.26:2.12) : (isPatience?2.07:2.27);
    parts.push([1.38,.20,side*.47,.86,.19,.24],[paw-.22,.15,side*.48,.42,.15,.29]);
    for(const offset of [-.18,-.06,.06,.18]){
      parts.push([paw+.065,.11,side*.48+offset,.145,.108,.077]);
    }
    for(const offset of [-.12,0,.12]){
      cuts.push([paw+.19,.15,side*.48+offset,.14,.089,.025]);
    }
    for(const [x,y,z,lean] of [[.68,1.19,.53,.15],[.43,.98,.54,.22],[.38,.75,.56,.19],[.74,.68,.64,.20],[.91,.85,.63,.16],[1.04,1.21,.60,.15],[1.23,.64,.50,.08],[.77,.46,.51,.18]]){
      parts.push([x,y,side*z,.15,.33,.15,lean]);
    }
  }
  const tailSide=isPatience?-1:1;
  const tail=[[-1.95,.34,.34],[-2.08,.20,.55],[-1.88,.14,.73],[-1.58,.13,.79],[-1.27,.14,.78],[-.96,.15,.72],[-.70,.18,.66]];
  for(let i=0;i<tail.length-1;i++){
    const [ax,ay,az]=tail[i], [bx,by,bz]=tail[i+1];
    for(const t of [0,.33,.67]){
      parts.push([ax+(bx-ax)*t,ay+(by-ay)*t,tailSide*(az+(bz-az)*t),.135,.10,.11]);
    }
  }
  parts.push([-.64,.19,tailSide*.64,.24,.13,.15]);
  return sculpt(parts,.045,cuts);
}

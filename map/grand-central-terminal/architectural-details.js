import * as T from "three";
function instances(parent,geometry,material,positions) {
  const batch=new T.InstancedMesh(geometry,material,positions.length);
  positions.forEach(([x,y,z],i)=>batch.setMatrixAt(i,new T.Matrix4().makeTranslation(x,y,z)));
  parent.add(batch);
}

// Triangulate the smoothed depth field and close it against the facade.
function reliefSurface(size,cx,cy,halfWidth,halfHeight,depthAt,positions,indices) {
  const columns=Math.ceil(halfWidth/size)+2, rows=Math.ceil(halfHeight/size)+2;
  const stride=2*columns+1;
  const grid=Array.from({length:(2*rows+1)*stride},(_,i)=>{
    const x=(i%stride-columns)*size,y=(Math.floor(i/stride)-rows)*size;
    const depth=depthAt(x,y);
    return {x,y,depth};
  });
  const occupied=grid.map(p=>Number(p.depth>0));
  const volume=grid.reduce((sum,p)=>sum+p.depth*size*size,0);
  const smooth=grid.map((p,i)=>{
    let depth=0, mask=0;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
      const weight=(dx===0?2:1)*(dy===0?2:1)/16;
      const at=i+dx+dy*stride;
      depth+=(grid[at]?.depth??0)*weight;
      mask+=(occupied[at]??0)*weight;
    }
    return {...p,depth,mask};
  });

  const vertices=[], triangles=[], lookup=new Map(), edges=new Map();
  function vertex(a,b=a) {
    if(smooth[a].mask===.5) b=a;
    else if(smooth[b].mask===.5) a=b;
    const key=a<b? a+":"+b:b+":"+a;
    if(lookup.has(key)) return lookup.get(key);
    const p=smooth[a],q=smooth[b];
    const t=a===b?0:(.5-p.mask)/(q.mask-p.mask);
    const i=vertices.length;
    vertices.push([cx+T.MathUtils.lerp(p.x,q.x,t),cy+T.MathUtils.lerp(p.y,q.y,t),
      T.MathUtils.lerp(p.depth,q.depth,t)]);
    lookup.set(key,i);
    return i;
  }
  function triangle(corners) {
    const polygon=[];
    for(let i=0;i<3;i++) {
      const a=corners[i], b=corners[(i+1)%3];
      const inside=smooth[a].mask>=.5, nextInside=smooth[b].mask>=.5;
      if(inside) polygon.push(vertex(a));
      if(inside!==nextInside) polygon.push(vertex(a,b));
    }
    for(let i=1;i+1<polygon.length;i++) {
      if(new Set([polygon[0],polygon[i],polygon[i+1]]).size===3) triangles.push([polygon[0],polygon[i],polygon[i+1]]);
    }
  }
  for(let y=0;y<2*rows;y++) for(let x=0;x<2*columns;x++) {
    const a=y*stride+x, b=a+1, c=a+stride, d=c+1;
    triangle([a,b,d]);
    triangle([a,d,c]);
  }
  let smoothedVolume=0;
  for(const [a,b,c] of triangles) {
    const [p,q,r]=[vertices[a],vertices[b],vertices[c]];
    const area=((q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]))/2;
    smoothedVolume+=area*(p[2]+q[2]+r[2])/3;
    for(const [i,j] of [[a,b],[b,c],[c,a]]) {
      const key=i<j?i+":"+j:j+":"+i;
      if(edges.has(key)) edges.delete(key);
      else edges.set(key,[i,j]);
    }
  }
  if(!smoothedVolume) return;
  const scale=volume/smoothedVolume, base=-.14, offset=positions.length/3, back=offset+vertices.length;
  for(const [x,y,depth] of vertices) positions.push(x,y,base+depth*scale);
  for(const [x,y] of vertices) positions.push(x,y,base);
  for(const [a,b,c] of triangles) indices.push(offset+a,offset+b,offset+c,back+c,back+b,back+a);
  for(const [a,b] of edges.values()) indices.push(offset+b,offset+a,back+a,offset+b,back+a,back+b);
}

export function clockCrest(parent, material, color) {
  // Silhouette in facade coordinates, read from the BCA elevation and photos.
  const outlines = [
    [[-9,26.1],[-6.5,27],[-4,29.1],[-2,30.3],[0,30.8],[2,30.3],[4,29.1],[6.5,27],[9,26.1],[7,25.85],[-7,25.85]],
    [[-4.1,29.7],[-3,31.5],[-4.4,32.7],[-2.5,32.9],[-.8,32.4],[1.2,33],[3.5,32.3],[2.9,31.7],[4,30.8],[1.1,31],[-1,30.4]],
    [[-.85,30.2],[-.7,32.1],[-1.2,32.7],[-1.85,34.2],[-1.5,34.35],[-.7,33.25],[-.65,34.1],[-.42,34.65],[.45,34.55],[.68,33.97],[.39,33.43],[1.8,33.9],[2.08,33.58],[.63,32.55],[.85,31.4],[.58,30.2],[.12,30.12],[-.17,31.78],[-.35,30.3]],
    [[-7.25,26.4],[-6.5,27.7],[-5.7,28.1],[-5.2,29.7],[-4.85,30.15],[-4.9,30.93],[-4.2,31.25],[-3.65,30.95],[-3.65,30.25],[-3.15,29.6],[-3.85,29],[-4.2,27.8],[-5.3,27.2]],
    [[7.25,26.4],[6.5,27.6],[5.5,28.2],[5,29.65],[4.48,30.1],[4.58,30.96],[3.9,31.2],[3.45,30.72],[3.63,30.02],[3,29.45],[3.6,28.7],[4.55,27.6],[5.5,27.12]]
  ];
  const size=.105, positions=[], indices=[];
  function signedDistance(x,y,ring) {
    let inside=false, distance=Infinity;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const [ax,ay]=ring[i], [bx,by]=ring[j];
      const dx=bx-ax,dy=by-ay;
      const t=T.MathUtils.clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
      distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
      if((ay>y)!==(by>y) && x<dx*(y-ay)/dy+ax) inside=!inside;
    }
    return inside?distance:-distance;
  }
  function sample(cx,cy,halfWidth,halfHeight,depthAt) {
    reliefSurface(size,cx,cy,halfWidth,halfHeight,depthAt,positions,indices);
  }
  sample(0,30.25,9,4.5,(x,y)=>{
    y+=30.25;
    if(Math.hypot(x,y-27.65)<2.06) return 0;
    let depth=0;
    for(const [i,outline] of outlines.entries()) {
      const distance=signedDistance(x,y,outline);
      if(distance<=0) continue;
      const rise=T.MathUtils.smoothstep(distance,0,.45);
      const fold=.05*Math.sin(x*5+y*3)*Math.cos(y*5-x*2);
      const crest=[.38,.54,1.04,.89,.89][i]+fold;
      depth=Math.max(depth,.085+(crest-.085)*rise);
    }
    return depth;
  });

  // BCA elevation shows two attic trophies, two end cartouches and two oval surrounds.
  for(const side of [-1,1]) {
    for(const [x,y,rx,ry,oval] of [[10.5,25.05,1.9,1.48,false],[34.4,25.3,2.05,2.05,false],[6.125,17.8,.54,2.27,true]]) {
      sample(side*x,y,rx,ry,(u,v)=>{
        const theta=Math.atan2(v/ry,u/rx), r=Math.hypot(u/rx,v/ry);
        const scallop=.85+.13*Math.cos(theta*9);
        if(r>scallop||(oval&&r<.52)) return 0;
        const leaf=Math.cos(theta*9+r*11), curl=Math.sin(theta*5-r*16);
        const rim=oval?Math.min(scallop-r,r-.52):scallop-r;
        const rise=T.MathUtils.smoothstep(rim,0,.17);
        const carving=.46+.16*leaf+.08*curl+.23*(1-T.MathUtils.smoothstep(r,.12,.43));
        return .075+carving*rise;
      });
    }
    sample(side*6.45,24.13,1.45,.45,(u,v)=>{
      const r=Math.hypot(u/1.45,v/.45);
      return r<1 ? .075+(.34+.08*Math.cos(u*7-v*4))*T.MathUtils.smoothstep(1-r,0,.3) : 0;
    });
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  parent.add(new T.Mesh(geometry,material(color)));
}

export function stoneRail(parent, box, material, from, to, y, color, postWidth=.56) {
  const rail=new T.Group();
  const [x,z]=from;
  const dx=to[0]-x,dz=to[1]-z,length=Math.hypot(dx,dz);
  rail.position.set(x,y,z);
  rail.rotation.y=-Math.atan2(dz,dx);
  parent.add(rail);
  box(rail,length/2,.11,0,length,.22,Math.min(.5,postWidth),color);
  box(rail,length/2,.98,0,length,.19,Math.min(.53,postWidth),color);
  const posts=parent.userData.stoneRailPosts ??= new Set();
  for(const [end,[px,pz]] of [[0,from],[length,to]]) {
    const key=[px,y,pz].map(value=>Math.round(value*1000)).join(",");
    if(posts.has(key)) continue;
    posts.add(key);
    box(rail,end,.57,0,postWidth,1.14,postWidth,color).rotation.y=-rail.rotation.y;
  }
  const count=Math.ceil(length/.68);
  const spindle=new T.LatheGeometry([[.14,0],[.13,.1],[.09,.24],[.13,.39],[.1,.59],[.13,.68]]
    .map(([r,h])=>new T.Vector2(r,h)),8);
  instances(rail,spindle,material(color),Array.from({length:count-1},(_,i)=>[(i+1)*length/count,.22,0]));
}

export function interiorColumns({main,lower,material,stone}) {
  // Retain the same pier footprints after removing the passage arches.
  function row(parent,center,width,depth,bays,angle,height) {
    const group=new T.Group();
    group.position.set(...center);
    group.rotation.y=angle;
    parent.add(group);
    const stations=Array.from({length:bays+1},(_,i)=>-depth/2+i*depth/bays);
    const positions=stations.flatMap(z=>[-1,1].map(side=>[side*(width/2+.12),height/2,z]));
    const clearPositions=positions.filter(([x,,z])=>{
      const worldX=center[0]+x*Math.cos(angle)+z*Math.sin(angle);
      const worldZ=center[2]-x*Math.sin(angle)+z*Math.cos(angle);
      // Keep piers out of the north balcony stair and its lower landing.
      return parent!==main||worldX<38.7||worldX>45.3||worldZ>-33.5||worldZ<-42.5;
    });
    if(clearPositions.length) instances(group,new T.BoxGeometry(.5,height,.44),material(stone),clearPositions);
  }
  row(main,[37,0,15.5],5.7,10,3,0,4.3);
  row(lower,[58.5,0,12],5,12,3,Math.PI/2,2.65);
  for(const z of [-34,-2]) row(main,[40,0,z],3.7,64,8,Math.PI/2,3.35);
}

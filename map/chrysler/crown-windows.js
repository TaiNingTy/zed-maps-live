import * as T from "three";

// Four matching fans. Heights are model-space crest stations sampled
// from the existing crown, not independent photographic window heights.
const rectangle = (x,y,w,h) => [[x-w/2,y],[x+w/2,y],[x+w/2,y+h],[x-w/2,y+h]];
const arch = (x,y,w,h) => [[x-w/2,y+h],[x-w/2,y+h*.42],[x-w*.34,y+h*.12],
  [x,y],[x+w*.34,y+h*.12],[x+w/2,y+h*.42],[x+w/2,y+h]];
const crests = [229,235,242,249,256,262,267,272];
const fans = [null,[9.2,7],[7.8,5],[6.25,5],[4.6,3],[3.5,3],[2.45,1]];
const axes = [[-1,0],[0,1],[1,0],[0,-1]];

// Rectify vertical perspective separately from the fan photograph. The
// eagle cornice is the datum and the sill bands follow the elevation rows.
const head = [rectangle(-1.76,225.5,.88,1.03),rectangle(1.76,225.5,.88,1.03),
  arch(0,0,2.86,2.8).map(([u,y])=>[u,224.6-y])];
for (let row=0; row<7; row++) {
  const sill=199.85+row*3.28;
  head.push(rectangle(-4.02,sill,1.12,1.76),rectangle(4.02,sill,1.12,1.76));
  if (row<6) head.push(rectangle(-.88,sill,1.08,1.83),rectangle(.88,sill,1.08,1.83));
}
// The narrow steel-clad strips flanking the arched stone panel
// have their own sash columns. Keep them below the lowest fan.
for (const y of [200.7,204,207.3,210.6,213.9,217.2]) {
  for (const side of [-1,1]) {
    head.push(rectangle(side*6.48,y,.84,1.69));
    head.push(rectangle(side*8.02,y-.12,.69,1.55));
  }
}

// Historic street plan: the jamb centers are taken from model.json's
// registered entrance segments. Storefront limits are read from the 1930 plate.
function groundOpenings(dx,dz,entrances) {
  const west=dx===-1;
  if (!west && dx!==0) return [];
  const name=west?"op-lex":dz===1?"op-42":"op-43";
  const entry=entrances.find(opening=>opening.id===name);
  const toAxis=([u,v])=>west?28.55-v:dz===1?u-33.05:33.05-u;
  if (!entry) return [];
  const [a,b]=entry.segment.map(toAxis);
  const portal=rectangle((a+b)/2,.03,Math.abs(a-b),dz===-1?4.15:9.8);
  const intervals=west?[[111,157],[179,229],[249,294],[327,360],[379,421],
    [508,549],[571,607],[632,650],[671,690],[704,724],[745,756],[774,799],[814,835]]
    : dz===1?[[292,309],[315,331],[348,366],[382,402],[419,437],[449,465],
      [553,571],[587,607],[621,638],[655,675],[690,710],[727,747],[763,783],[801,819]]
    : [[160,181],[216,237],[348,370],[377,400],[558,577],[592,610],[627,646],
      [659,680],[700,718],[735,752],[769,785],[807,822]];
  const across=pixel=>west?28.55-(841-pixel)*60.5/755:
    (dz===1?1:-1)*((832-pixel)*50.4/638-33.05);
  const storefronts=intervals.map(([lo,hi])=>{
    const x=across(lo), y=across(hi);
    return rectangle((x+y)/2,.58,Math.abs(x-y),2.12);
  }).filter(poly=>Math.max(...poly.map(p=>p[0]))<Math.min(a,b)-.3 ||
    Math.min(...poly.map(p=>p[0]))>Math.max(a,b)+.3);
  return [{polygon:portal,portal:true},...storefronts.map(polygon=>({polygon}))];
}

// Van Alen's 1930 floors 6–10 plate. Read openings between the
// black piers. The rear edge includes the recessed wall of Court No. 2.
// Window centers on the rear perimeter of the 6–10 plate, read from
// the two wings and the recessed cross wall. The side returns stay intact.
const rearBays = [109,130,152,176,204,233,257,278,
  305,328,351,376,415,437,480,504,531,550,
  580,605,624,651,673,708,730,750];
const rearPositions = width => rearBays.map(x=>(x-427)/666*width);

function streetWindows(dx,dz) {
  const northY=[64,83,104,127,150,172,211,235,278,303,346,372,415,441,
    484,509,552,578,620,646,687,712,756,783];
  const southY=[210,237,279,304,347,373,415,440,485,511,552,578,620,646,
    687,713,756,783];
  // Lexington wing fronts and Court No. 1's cross wall are both
  // visible in the same elevation, at different depths.
  const lexX=[134,161,205,229,277,306,675,701,751,778,823,847];
  const courtX=[330,355,379,413,438,471,496,530,557,590,617,642]
    .map(pixel=>pixel*973/850);
  const positions = dx===-1 ? [...lexX,...courtX].map(x=>28.55-(874-x)*60.5/762)
    : dz===1 ? southY.map(y=>(813-y)*.0794-33.05)
    : dz===-1 ? northY.map(y=>33.05-(819-y)*.0794) : rearPositions(60.5);
  return Array.from({length:15},(_,index)=>index+2).flatMap(floor=>{
    const elevation=(floor-1)*3;
    // On the three street fronts the tall entrance compositions occupy 02–04.
    if (dx!==1 && floor<=4) return [];
    // Register the lowest rear row to the straight wall faces below
    // the plinth transition, retaining the previous bay stations.
    if (dx===1 && floor===2) return positions.map(u=>rectangle(u+1.1,.66,1.18,1.60));
    return positions.map(u=>rectangle(u,elevation+.66,1.18,1.60));
  });
}

// 17th framing and 24th plumbing plans show different perimeter runs.
function setbackWindows(dx,dz) {
  const bands=[
    {first:17,last:23, x:[145,797], y:[65,737], short:[225,255,283,314,344,377,408,468,500,532,563,594,625,655,687,715],
      long:[167,194,226,254,282,309,629,656,687,715,744,773],
      court:[355,382,407,433,459,484,512,538,563,589,615]},
    {first:24,last:26, x:[243,710], y:[169,645], short:[220,247,276,306,332,363,393,423,455,482,514,543,570,602,630],
      long:[252,278,304,327,625,653,677,700],
      court:[351,375,396,420,443,466,492,515,537,560,584,605]},
    // Transition below the shaft. Bay rhythm is provisional pending a 27–30 sheet.
    {first:27,last:30, x:[243,710], y:[169,645], short:[247,276,306,332,363,393,423,455,482,514,543,570],
      long:[278,304,327,375,420,463,510,555,601,653,677]}
  ];
  return bands.flatMap(({first,last,x,y,short,long,court=[]})=>{
    const positions=dx===-1 ? [...long,...court].map(value=>28.55-(x[1]-value)*44/(x[1]-x[0])-6.55)
      : dx===1 ? (first===27 ? long.map(value=>(value-476.5)/467*38) : rearPositions(first===17?49:43)) : short.map(value=>(dz===1?1:-1)*((y[1]-value)*51/(y[1]-y[0])-25.5));
    return Array.from({length:last-first+1},(_,index)=>(first+index-1)*3)
      .flatMap(elevation=>positions.map(u=>rectangle(u,elevation+.68,1.13,1.68)));
  });
}

// The 31–41 plate shows a shorter rectangular envelope and a
// different pier spacing from the podium. Keep its bays in that group.
function shaftWindows(dx,dz) {
  const longBays=[226,274,322,395,436,515,566,645,685,761,807,851];
  const shortBays=[121,180,253,303,371,428,493,552,617,674];
  const positions = dx===-1 ? longBays.map(x=>28.55-(12.17+(918-x)*32.766/750))
    : dx===1 ? longBays.map(x=>12.17+(918-x)*32.766/750-28.55)
    : dz===1 ? shortBays.map(y=>19.6+(713-y)*27/621-33.05)
    : shortBays.map(y=>33.05-(19.6+(713-y)*27/621));
  return Array.from({length:11},(_,index)=>90+index*109/30).flatMap(elevation=>
    positions.map(u=>rectangle(u,elevation+.81,1.12,1.85)));
}

// LoC E-21 through E-25 and revised plumbing sheets. Source-pixel
// axes are independently registered to the typical tower width and depth.
const upperSheets = [
  [42,43,[134,470,281,558],[152,174,196,217,244,266,290,315,340,365,388,410,433,454],[298,326,353,381,408,438,466,495,524,547]],
  [44,46,[122,474,275,563],[140,165,189,215,240,266,290,318,343,369,394,421,447,462],[292,320,350,380,408,439,468,496,526,550]],
  [47,50,[139,488,269,550],[156,183,211,243,271,298,322,349,375,401,428,454,475],[285,311,340,371,398,428,456,485,515,538]],
  [51,56,[589,938,269,558],[605,631,656,685,712,737,763,790,815,840,867,893,919],[286,313,343,371,401,430,459,488,518,545]],
  [57,57,[587,934,263,548],[604,628,654,680,706,732,758,786,814,840,866,892,917],[281,310,339,367,397,425,455,484,514,535]],
  [58,58,[135,481,268,550],[152,176,201,228,254,282,307,333,361,387,414,440,465],[284,312,342,370,399,428,457,486,516,539]]
];
function upperShaftWindows(dx,dz) {
  // ds.13724, right drawing revised to 59 and left revised to 60.
  // Read each perimeter run separately. The pixel origin is the plan center.
  const eagleSheets = [
    [191.73,818,442,{
      "0,-1":[355,381,407,435,462,490,519],
      "0,1":[357,382,408,434,462,488,518],
      "-1,0":[734,767,800,834,867,900],
      "1,0":[735,768,801,834,866,899]
    }],
    [195.37,332,442,{
      "0,-1":[355,382,409,437,466,493,520],
      "0,1":[355,382,408,435,463,491,518],
      "-1,0":[247,282,315,348,383,416],
      "1,0":[248,283,315,349,383,415]
    }]
  ];
  const eagleBand=eagleSheets.flatMap(([y,centerX,centerY,runs]) =>
    runs[[dx,dz].join(",")].map(pixel=>{
      const u=(dx ? dx*(centerX-pixel) : dz*(centerY-pixel)) * (.1*1024/1100);
      return rectangle(u,y+.72,.98,1.76);
    }));
  return eagleBand.concat(upperSheets.flatMap(([first,last,[left,right,top,bottom],long,short])=>{
    const positions=dx!==0 ? long.map(x=>dx*((right-x)*32.766/(right-left)-16.383))
      : short.map(y=>dz*((bottom-y)*27/(bottom-top)-13.5));
    return Array.from({length:last-first+1},(_,i)=>90+(first+i-31)*109/30).flatMap(elevation=>
      positions.map(u=>rectangle(u,elevation+.79,1.03,1.78)));
  }));
}

function fanWindows(ridgeAt) {
  // Trace the red annotation: tip, inner base corner, outer base
  // corner. Average the two sides around the photograph's center seam.
  const tracedLights = [
    [[90,512],[6,644],[85,654]],
    [[227,573],[128,667],[195,714]],
    [[311,734],[208,758],[247,836]],
    [[369,882],[256,884],[272,990]]
  ];
  const scales = [1,.83,.69,.56];
  // Register each pair to the exposed steel beside the projecting trim.
  const clearance = [[0,.32],[.35,.62],[1.02,.74],[.24,1.15]];
  const result=tracedLights.flatMap((light,index)=>{
    const centerX=light.reduce((sum,[x])=>sum+x,0)/3;
    const centerY=light.reduce((sum,[,y])=>sum+y,0)/3;
    return [-1,1].map(side=>light.map(([x,y])=>[
      side*((centerX+(x-centerX)*scales[index])*.027+clearance[index][0]),
      229+(644-centerY-(y-centerY)*scales[index])/30+clearance[index][1]
    ]));
  });
  for (let tier=1;tier<fans.length;tier++) {
    const [width,count]=fans[tier];
    const band = (u,t) => {
      const lower=ridgeAt(u,tier), upper=ridgeAt(u,tier+1);
      return lower+(upper-lower)*t;
    };
    for (let slot=0; slot<count; slot++) {
      const angle=((slot+.5)/count-.5)*1.8;
      const u=width*Math.sin(angle);
      const half=width/count*.62;
      const tip=u+width*Math.sin(angle)*.24;
      result.push([[tip,band(tip,.84)],[u-half,band(u-half,.15)],[u+half,band(u+half,.15)]]);
    }
  }
  return result;
}

function split(poly, a, b, sign) {
  const inside = [], outside = [];
  const distance = point => sign*((b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]));
  for (let i=0; i<poly.length; i++) {
    const p=poly[i], q=poly[(i+1)%poly.length];
    const dp=distance(p), dq=distance(q);
    (dp>=-1e-8 ? inside : outside).push(p);
    if ((dp>=-1e-8)!==(dq>=-1e-8)) {
      const t=dp/(dp-dq);
      const hit=p.map((value,index)=>value+(q[index]-value)*t);
      inside.push(hit);
      outside.push(hit);
    }
  }
  return [inside,outside];
}

function signedArea(poly) {
  return poly.reduce((area, point, i) => {
    const next=poly[(i+1)%poly.length];
    return area+point[0]*next[1]-next[0]*point[1];
  },0)/2;
}

function subtract(poly, cut) {
  const sign=Math.sign(signedArea(cut));
  const fragments=[];
  let inside=poly;
  for (let i=0; i<cut.length && inside.length>=3; i++) {
    const [kept,discarded]=split(inside,cut[i],cut[(i+1)%cut.length],sign);
    if (discarded.length>=3) fragments.push(discarded);
    inside=kept;
  }
  return fragments;
}

// The study's registered first-floor perimeter replaces the generic
// GLB plinth. Join the outlines above the storefront heads.
function registeredPlinth(footprint) {
  const plan = footprint.slice(0,-1);
  const upper = [[.88,-3.35],[52.63,-3.49],[55.71,16.93],[56.5,22.18],
    [64.66,50.63],[64.7,59.36],[.93,59.15]];
  const positions = [];
  const add = (point,y) => positions.push(point[0],y,-point[1]);
  for (const [bottom,top,y0,y1] of [[plan,plan,0,3.5],[plan,upper,3.5,4.5]]) {
    for (let i=0;i<bottom.length;i++) {
      const j=(i+1)%bottom.length;
      add(bottom[i],y0); add(bottom[j],y0); add(top[j],y1);
      add(bottom[i],y0); add(top[j],y1); add(top[i],y1);
    }
  }
  // Use the full plan, including the intermediate stations on the diagonal.
  const bottom=footprint.slice(0,-1);
  for (const triangle of T.ShapeUtils.triangulateShape(bottom.map(([x,y])=>new T.Vector2(x,y)),[])) {
    for (const index of triangle) add(bottom[index],0);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  return geometry;
}

// Read both return walls independently from the 6–10, 17 and 24 plans.
// The oblique photo sets the visible window proportions by tier.
// Neighboring floors inherit the corresponding drawing, provisionally.
const returnBands = {
  "-1,1": [
    [5,16,[1.85,3.87,6.60,9.24,11.18,13.90,15.84],1.08,1.62],
    [17,23,[2.6,4.9,7.5,10,12.5],.91,1.83],
    [24,26,[4.5,6.8,9.1],1.13,1.43]
  ],
  "-1,-1": [
    [5,16,[1.41,3.08,5.54,7.57,9.68,12.06,14.26,15.93],.96,1.59],
    [17,23,[2.1,4.2,6.6,9.1,11.4,13.3],.93,1.79],
    [24,26,[3.9,5.8,8.1,10.2],1.06,1.47]
  ],
  "1,1": [
    [5,16,[16.8,19.1,21.8,24.4,27.1],1.10,1.62],
    [17,23,[16.4,18.9,21.4,23.7],.92,1.82],
    [24,26,[15.6,18.2,20.4],1.12,1.46]
  ],
  "1,-1": [
    [5,16,[17.4,19.6,22.4,25.1,27.6],1.02,1.58],
    [17,23,[16.5,18.7,21,23.2,25.4],.95,1.78],
    [24,26,[16.3,18.6],1.06,1.45]
  ]
};

function courtReturnWindows(dz, side) {
  return returnBands[[side,dz].join(",")].flatMap(([first,last,stations,width,height]) =>
    Array.from({length:last-first+1},(_,index)=>(first+index-1)*3).flatMap(elevation =>
      stations.map(station=>({
        polygon:rectangle(dz*(side===-1?station-33.05:station),elevation+.66,width,height)
      }))));
}

export function crownWindows(shell, entrances = [], footprint, portalSlabs = []) {
  shell.updateMatrixWorld(true);
  const group = new T.Group();
  group.name = "Inset Chrysler glazing";
  const sources = [];
  const shellFaces = [];
  let plinthMaterial;
  shell.traverse(mesh => {
    if (!mesh.isMesh) return;
    plinthMaterial ??= mesh.material;
    const position = mesh.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i += 3) {
      const face = [0,1,2].map(n => new T.Vector3()
        .fromBufferAttribute(position,i+n).applyMatrix4(mesh.matrixWorld));
      const above = footprint
        ? split(face.map(p=>[p.x,p.y,p.z]),[0,4.5],[1,4.5],1)[0].map(p=>new T.Vector3(...p))
        : face;
      for (let j=1;j<above.length-1;j++) {
        const triangle=[above[0],above[j],above[j+1]];
        shellFaces.push(triangle);
        sources.push({mesh,face:triangle});
      }
    }
  });
  if (footprint) {
    const plinth = new T.Mesh(registeredPlinth(footprint), plinthMaterial);
    plinth.name = "Registered 1930 ground-floor shell";
    plinth.rotation.y = -shell.rotation.y;
    shell.add(plinth);
    shell.updateMatrixWorld(true);
    const points = plinth.geometry.getAttribute("position");
    for (let i=0;i<points.count;i+=3) {
      const face=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(points,i+j));
      shellFaces.push(face);
      sources.push({mesh:plinth,face});
    }
  }
  const center = new T.Vector3(33.05,0,-28.55);
  const framePoints = [], glassPoints = [];
  const cuts=[];
  for (const [dx,dz,returnSide] of [...axes,[0,1,-1],[0,-1,-1],[0,1,1],[0,-1,1]]) {
    const outward = new T.Vector3(dx,0,dz);
    const across = new T.Vector3(dz,0,-dx);
    // Bin projected triangles by elevation. For each sampled point use the
    // frontmost triangle of the actual crown mesh, including its curved folds.
    const bins = new Map();
    for (const face of shellFaces) {
      const projected = face.map(point => [
        point.clone().sub(center).dot(across), point.y, point.clone().sub(center).dot(outward)
      ]);
      if (returnSide && projected.some(([u,,depth])=>depth<7 || depth>16 || u*dz*returnSide<8)) continue;
      const heights = projected.map(point => point[1]);
      if (Math.max(...heights) < 0 || Math.min(...heights) > 285) continue;
      for (let bin = Math.floor(Math.min(...heights)); bin <= Math.floor(Math.max(...heights)); bin++) {
        if (!bins.has(bin)) bins.set(bin,[]);
        bins.get(bin).push(projected);
      }
    }
    const depthAt = (u,height,reference) => {
      let depth = -Infinity;
      for (const [a,b,c] of bins.get(Math.floor(height)) ?? []) {
        const det = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
        if (Math.abs(det)<1e-8) continue;
        const wa = ((b[1]-c[1])*(u-c[0])+(c[0]-b[0])*(height-c[1]))/det;
        const wb = ((c[1]-a[1])*(u-c[0])+(a[0]-c[0])*(height-c[1]))/det;
        const wc = 1-wa-wb;
        if (Math.min(wa,wb,wc)<-1e-6) continue;
        const hit=wa*a[2]+wb*b[2]+wc*c[2];
        if (reference===undefined) depth=Math.max(depth,hit);
        else if (Math.abs(hit-reference)<=.82 && Math.abs(hit-reference)<Math.abs(depth-reference)) depth=hit;
      }
      return depth;
    };
    let windowDepth;
    const project = ([u,height], offset) => {
      const depth=depthAt(u,height,windowDepth);
      if (!Number.isFinite(depth)) return;
      return center.clone().addScaledVector(across,u).addScaledVector(outward,depth+(returnSide?-offset:offset)).setY(height);
    };
    const interpolate = (a,b,t) => a.map((value,i)=>value+(b[i]-value)*t);
    const triangle = (a,b,c,offset,output) => {
      const longest = Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
        Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(b[0]-c[0],b[1]-c[1]));
      if (longest > .34) {
        const ab=interpolate(a,b,.5), bc=interpolate(b,c,.5), ca=interpolate(c,a,.5);
        triangle(a,ab,ca,offset,output);
        triangle(ab,b,bc,offset,output);
        triangle(ca,bc,c,offset,output);
        triangle(ab,bc,ca,offset,output);
        return;
      }
      const points = [a,b,c].map(point => project(point,offset));
      if (points.some(point => !point)) return;
      // Avoid a sliver spanning two disconnected skin surfaces.
      const depths = points.map(point => point.dot(outward));
      if (Math.max(...depths)-Math.min(...depths) > .8) return;
      for (const point of points) output.push(...point);
    };
    const patch = (polygon, offset, output) => {
      for (let i=1; i<polygon.length-1; i++) triangle(polygon[0],polygon[i],polygon[i+1],offset,output);
    };
    const bar = (a,b,width,offset,output) => {
      const length = Math.hypot(b[0]-a[0],b[1]-a[1]);
      const x = -(b[1]-a[1])*width/length, y = (b[0]-a[0])*width/length;
      patch([[a[0]+x,a[1]+y],[b[0]+x,b[1]+y],[b[0]-x,b[1]-y],[a[0]-x,a[1]-y]],offset,output);
    };
    // Locate each arch ledge in the loaded mesh. The quadratic is just a
    // search seed for the edge as it drops toward the fan's shoulders.
    const ridgeAt = (u,index) => {
      const span = [10.8,11.5,10.5,9,7.15,5.3,4.3,3.1][index];
      const expected = crests[index] - 4.5*(u/span)**2;
      let ridge=expected, strongest=.20;
      for (let y=expected-1.35; y<=expected+1.35; y+=.075) {
        const below=depthAt(u,y-.1), above=depthAt(u,y+.1);
        if (!Number.isFinite(above) || !Number.isFinite(below) || below-above<=strongest) continue;
        strongest=below-above;
        ridge=y;
      }
      return ridge;
    };
    const windows=returnSide ? courtReturnWindows(dz,returnSide) : [...head,...fanWindows(ridgeAt),...streetWindows(dx,dz),...setbackWindows(dx,dz),
      ...shaftWindows(dx,dz),...upperShaftWindows(dx,dz)].map(polygon=>({polygon}));
    if (!returnSide) windows.push(...groundOpenings(dx,dz,entrances));
    for (const {polygon,portal} of windows) {
      const centroid=polygon.reduce(([x,y],[u,v])=>[x+u/polygon.length,y+v/polygon.length],[0,0]);
      const lowestFan = polygon.length===3 && polygon[0][1]<235;
      windowDepth=lowestFan ? depthAt(...centroid) : undefined;
      const boundary=polygon.map(point=>project(point,0));
      if (!lowestFan && boundary.some(point=>!point)) continue;
      if (lowestFan && !Number.isFinite(windowDepth)) continue;
      const span=boundary.filter(Boolean).map(point=>point.dot(outward));
      const eagleWindow = !returnSide && centroid[1]>192 && centroid[1]<198;
      if (!lowestFan && Math.max(...span)-Math.min(...span)>(eagleWindow?.28:portal?4.5:2.3)) continue;
      const cut=polygon;
      cuts.push({outward,across,cut,applied:false,returnSide,lowestFan,eagleWindow,windowDepth,triangle:polygon.length===3,depth:span.map(d=>d-center.dot(outward)),bounds:[
        Math.min(...cut.map(p=>p[0])),Math.min(...cut.map(p=>p[1])),
        Math.max(...cut.map(p=>p[0])),Math.max(...cut.map(p=>p[1]))
      ]});
      const windowFrames = portal ? [] : framePoints;
      const windowGlass = portal ? [] : glassPoints;
      const inner=polygon.map(point=>interpolate(centroid,point,.84));
      for (let i=0; i<polygon.length; i++) {
        const next=(i+1)%polygon.length;
        if (!portal) patch([centroid,inner[i],inner[next]],-.075,windowGlass);
        patch([polygon[i],polygon[next],inner[next],inner[i]],-.018,windowFrames);
        const outerA=project(polygon[i],.002), outerB=project(polygon[next],.002);
        const innerA=project(polygon[i],-.04), innerB=project(polygon[next],-.04);
        if (outerA && outerB && innerA && innerB) {
          for (const point of [outerA,outerB,innerB,outerA,innerB,innerA]) windowFrames.push(...point);
        }
      }
      if (portal) {
        const left=inner[0][0],right=inner[1][0],top=inner[2][1];
        const sill=Math.min(3.1,top-.6);
        patch([[left,sill],[right,sill],[right,top],[left,top]],-.075,windowGlass);
        bar([left,sill],[right,sill],.08,-.046,windowFrames);
        const middle=(left+right)/2;
        bar([middle,sill],[middle,top],.065,-.046,windowFrames);
      } else if (polygon.length===3) {
        const [top,left,right]=inner;
        for (const t of [.55,.78]) bar(interpolate(top,left,t),interpolate(top,right,t),.035,-.046,windowFrames);
      } else if (polygon.length===7) {
        const top = inner[3], bottom = interpolate(inner[0],inner[6],.5);
        bar(top,bottom,.07,-.045,windowFrames);
        const left = interpolate(inner[0],inner[1],.65);
        const right = interpolate(inner[6],inner[5],.65);
        bar(left,right,.045,-.045,windowFrames);
      } else if (polygon.length===4) {
        const [a,b,c,d]=inner;
        bar(interpolate(a,d,.5),interpolate(b,c,.5),.041,-.046,windowFrames);
      }
      if (portal) {
        // Interrupt the inset assembly at floor edges. The masonry
        // aperture and registered floor polygons retain their geometry.
        for (const [vertices,output] of [[windowFrames,framePoints],[windowGlass,glassPoints]]) {
          for (let i=0;i<vertices.length;i+=9) {
            let pieces=[[vertices.slice(i,i+3),vertices.slice(i+3,i+6),vertices.slice(i+6,i+9)]];
            for (const y of portalSlabs) {
              pieces=pieces.flatMap(piece=>{
                const [above]=split(piece,[0,y+.025],[1,y+.025],1);
                const [below]=split(piece,[0,y-.265],[1,y-.265],-1);
                return [above,below].filter(part=>part.length>=3);
              });
            }
            for (const piece of pieces) {
              for (let j=1;j<piece.length-1;j++) output.push(...piece[0],...piece[j],...piece[j+1]);
            }
          }
        }
      }
    }
  }

  const shells=new Map();
  for (const {mesh,face} of sources) {
    if (!shells.has(mesh)) shells.set(mesh,[]);
    const points=shells.get(mesh);
    const centerFace=face[0].clone().add(face[1]).add(face[2]).divideScalar(3).sub(center);
    const candidates=cuts.filter(({outward,bounds})=>centerFace.dot(outward)>0 &&
      Math.max(...face.map(p=>p.y))>bounds[1] && Math.min(...face.map(p=>p.y))<bounds[3]);
    let fragments=[face];
    for (const aperture of candidates) {
      const {outward,across,cut,bounds}=aperture;
      const projected=face.map(point=>[
        point.clone().sub(center).dot(across),point.y,point.clone().sub(center).dot(outward)
      ]);
      if (Math.max(...projected.map(p=>p[0]))<=bounds[0] ||
          Math.min(...projected.map(p=>p[0]))>=bounds[2] ||
          Math.min(...projected.map(p=>p[2]))<.15) continue;
      const normal=face[1].clone().sub(face[0]).cross(face[2].clone().sub(face[0])).normalize();
      if (Math.abs(normal.dot(outward))<.35) continue;
      if (aperture.returnSide && projected.some(([u,,depth])=>
        depth<7 || depth>16 || u*outward.z*aperture.returnSide<8)) continue;
      if ((bounds[1]<190 || aperture.eagleWindow) && (Math.max(...projected.map(p=>p[2]))<Math.min(...aperture.depth)-.12 ||
          Math.min(...projected.map(p=>p[2]))>Math.max(...aperture.depth)+.12)) continue;
      const project=point=>[point.clone().sub(center).dot(across),point.y,point.clone().sub(center).dot(outward)];
      const world=([u,y,depth])=>center.clone().addScaledVector(across,u).addScaledVector(outward,depth).setY(y);
      fragments=fragments.flatMap(fragment=>{
        const plane=fragment.map(project);
        let pieces;
        if (aperture.lowestFan) {
          // Trim only the same skin band used for the glazing.
          const depthPlane=plane.map(([u,y,d])=>[u,d,y]);
          const [insideLow,below]=split(depthPlane,[0,aperture.windowDepth-.82],[1,aperture.windowDepth-.82],1);
          const [skin,above]=split(insideLow,[0,aperture.windowDepth+.82],[1,aperture.windowDepth+.82],-1);
          const toFacade=poly=>poly.map(([u,d,y])=>[u,y,d]);
          pieces=[toFacade(below),toFacade(above),...subtract(toFacade(skin),cut)].filter(poly=>poly.length>=3);
        } else {
          pieces=subtract(plane,cut);
        }
        if (Math.abs(signedArea(plane))-pieces.reduce((area,p)=>area+Math.abs(signedArea(p)),0)>1e-5) {
          aperture.applied=true;
        }
        return pieces.map(poly=>poly.map(world));
      });
    }
    for (const fragment of fragments) {
      for (let i=1; i<fragment.length-1; i++) points.push(fragment[0],fragment[i],fragment[i+1]);
    }
  }
  for (const [mesh,points] of shells) {
    const inverse=mesh.matrixWorld.clone().invert();
    const geometry=new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(
      points.flatMap(point=>point.clone().applyMatrix4(inverse).toArray()),3));
    geometry.computeVertexNormals();
    mesh.geometry=geometry;
  }
  group.userData.eagleOpenings=Object.fromEntries(axes.map(([x,z])=>[[x,z].join(","),
    cuts.filter(cut=>cut.eagleWindow && cut.applied && cut.outward.x===x && cut.outward.z===z).length]));
  group.userData.lowestFanOpenings=Object.fromEntries(axes.map(([x,z])=>[[x,z].join(","),
    cuts.filter(cut=>cut.lowestFan && cut.applied && cut.outward.x===x && cut.outward.z===z).length]));
  group.userData.returnOpenings=Object.fromEntries(Object.keys(returnBands).map(key=>[key,
    cuts.filter(cut=>[cut.returnSide,cut.outward.z].join(",")===key && cut.applied).length]));
  group.userData.openings=Object.fromEntries(axes.map(axis=>[
    axis.join(","),cuts.filter(cut=>cut.applied && cut.outward.x===axis[0] && cut.outward.z===axis[1])
      .reduce((counts,cut)=>{counts[cut.bounds[1]<10?"ground":cut.bounds[1]<40?"street":cut.bounds[1]<90?"setback":cut.bounds[1]<190?"shaft":cut.triangle?"triangular":"head"]++; return counts;},{triangular:0,head:0,ground:0,street:0,setback:0,shaft:0})
  ]));
  for (const [name,vertices,color] of [
    ["Glazing",glassPoints,0x233846],["Nirosta frames and transoms",framePoints,0x879ba8]
  ]) {
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
    geometry.computeVertexNormals();
    const mesh = new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.47,side:T.DoubleSide}));
    mesh.name=name;
    group.add(mesh);
  }
  return group;
}

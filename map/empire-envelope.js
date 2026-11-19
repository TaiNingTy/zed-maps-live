// Empire State exterior registered to the floor model, with facade
// rhythms from NYC LPC LP-2000, description pp. 14–17.
import * as T from "three";

export function createEmpireEnvelope(floors) {
  const group = new T.Group();
  group.name = "Empire State Building envelope";
  const colors = {stone:0xc4b8a3, trim:0xa5a39b, glass:0x354954, metal:0xb9c0c2};
  const vertices = Object.fromEntries(Object.keys(colors).map(key=>[key,[]]));
  const quad = (key,a,b,c,d) => vertices[key].push(...a,...b,...c,...a,...c,...d);
  const stack = floors.filter(f=>f.building==="esb" && /^esb:\d+$/.test(f.id));
  const ringOf = f => {
    const ring=f.plate[0];
    return ring[0][0]===ring.at(-1)[0] && ring[0][1]===ring.at(-1)[1] ? ring.slice(0,-1) : ring;
  };
  // Plates end at the floor datum and are 0.55 m deep. Start the
  // facade of that floor below the plate, with a separate wall allowance.
  const wallAllowance = .30, slabDepth = .55;
  const facadeRing = ring => {
    const points=ring.map(([u,v])=>new T.Vector2(u,v));
    const winding=Math.sign(T.ShapeUtils.area(points));
    const outward=(a,b)=>new T.Vector2(b.y-a.y,a.x-b.x).normalize().multiplyScalar(winding);
    return points.map((p,i)=>{
      const a=outward(points[(i+points.length-1)%points.length],p);
      const b=outward(p,points[(i+1)%points.length]);
      const mitre=a.clone().add(b).multiplyScalar(wallAllowance/Math.max(.42,1+a.dot(b)));
      return p.clone().add(mitre).toArray();
    });
  };
  const contains = (ring,[u,v]) => ring.reduce((inside,[x,y],i)=>{
    const [a,b]=ring[(i+1)%ring.length];
    return (y>v)!==(b>v) && u<(a-x)*(v-y)/(b-y)+x ? !inside : inside;
  },false);
  const closed = (ring,y,next) => {
    const hole=next?.every(point=>contains(ring,point)) ? next : null;
    const vectorize=points=>points.map(([u,v])=>new T.Vector2(u,v));
    const points=hole ? [...ring,...hole] : ring;
    for (const tri of T.ShapeUtils.triangulateShape(vectorize(ring),hole?[vectorize(hole)]:[])) {
      for (const index of tri) vertices.trim.push(points[index][0],y,-points[index][1]);
    }
  };
  for (const [i,f] of stack.entries()) {
    const floor=Number(f.id.split(":")[1]);
    const y=i===0?0:f.elev_m, top=stack[i+1]?.elev_m??381;
    const ring=facadeRing(ringOf(f));
    const wallBottom=i===0?0:y-slabDepth;
    const wallTop=stack[i+1]?top-slabDepth:top;
    const orientation=Math.sign(T.ShapeUtils.area(ring.map(([u,v])=>new T.Vector2(u,v))));
    for (const [j,[u,v]] of ring.entries()) {
      const [x,z]=ring[(j+1)%ring.length];
      const du=x-u,dv=z-v,length=Math.hypot(du,dv);
      if (length<.015) continue;
      const point=(t,h,offset=0)=>[u+du*t+orientation*dv/length*offset,h,-(v+dv*t-orientation*du/length*offset)];
      const panel=(key,l,r,low,high,offset=0)=>quad(key,point(l,low,offset),point(r,low,offset),point(r,high,offset),point(l,high,offset));
      panel(floor>=87?"metal":"stone",0,1,wallBottom,wallTop);
      if ([6,21,25,30,72,81,85].includes(floor)) panel("trim",0,1,wallBottom,wallBottom+.20,.085);
      if (length<2 || (floor>=87 && floor<102)) continue;
      const longFace=Math.abs(du)>Math.abs(dv);
      const count=Math.max(1,Math.round(length/(floor<6?5.4:longFace?5.0:4.45)));
      const height=top-y;
      for (let bay=0;bay<count;bay++) {
        const center=(bay+.5)/count;
        const width=.62/count;
        const sashCount=floor>=102 || length/count<3 ? 1
          : longFace && floor>=30 && floor<85 && bay===Math.floor(count/2) && count===3 ? 3 : 2;
        panel("trim",center-width/2,center+width/2,y+.12*height,Math.min(top-.08*height,wallTop-.03),.035);
        for (let sash=0;sash<sashCount;sash++) {
          const left=center-width/2+width*sash/sashCount;
          const right=left+width/sashCount;
          const gap=Math.min(.045/length,(right-left)*.12);
          panel("glass",left+gap,right-gap,y+.34*height,Math.min(top-.15*height,wallTop-.04),.054);
        }
      }
    }
    if (!stack[i+1] || f.plate!==stack[i+1].plate &&
        JSON.stringify(f.plate)!==JSON.stringify(stack[i+1].plate)) {
      closed(ring,wallTop,stack[i+1] && facadeRing(ringOf(stack[i+1])));
    }
    if (f.deck) {
      // The outdoor observation terrace extends beyond the glazed 86th
      // floor. Wrap its slab edge independently from the interior wall.
      const deck=facadeRing(f.deck[0]);
      for (let j=0;j<deck.length;j++) {
        const [u,v]=deck[j], [x,z]=deck[(j+1)%deck.length];
        quad("trim",[u,y-slabDepth-.025,-v],[x,y-slabDepth-.025,-z],[x,y+.06,-z],[u,y+.06,-v]);
        quad("metal",[u,y+1.06,-v],[x,y+1.06,-z],[x,y+1.16,-z],[u,y+1.16,-v]);
        const count=Math.max(1,Math.round(Math.hypot(x-u,z-v)/1.8));
        for(let post=0;post<count;post++) {
          const a=post/count,b=Math.min(1,a+.07/Math.hypot(x-u,z-v));
          const point=(t,h)=>[u+(x-u)*t,h,-(v+(z-v)*t)];
          quad("metal",point(a,y+.06),point(b,y+.06),point(b,y+1.06),point(a,y+1.06));
        }
      }
      closed(deck,y+.06,ring);
    }
  }

  for (const [key,points] of Object.entries(vertices)) {
    const geometry=new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(points,3));
    geometry.computeVertexNormals();
    group.add(new T.Mesh(geometry,new T.MeshStandardMaterial({
      color:colors[key],side:T.DoubleSide,roughness:key==="glass"?.28:.77
    })));
  }
  // Broadcasting antenna above the historic mast, to the model's 443.2 m tip.
  const ring=ringOf(stack.at(-1));
  const center=ring.reduce(([x,z],[u,v])=>[x+u/ring.length,z-v/ring.length],[0,0]);
  const metal=group.children[3].material;
  // Four metal collars and corner fins articulate the historic mast.
  // The documented form is used here with approximate offsets from its plate.
  for (const [y,size] of [[322.1,16.6],[326.2,15.5],[330.3,14.6],[334.4,13.8]]) {
    const collar=new T.Mesh(new T.BoxGeometry(size,.42,size),metal);
    collar.position.set(center[0],y,center[1]);
    group.add(collar);
  }
  for (let corner=0;corner<4;corner++) {
    const angle=Math.PI/4+corner*Math.PI/2;
    for (let wing=0;wing<3;wing++) {
      const radius=6.2+wing*.39, bottom=333-wing*1.1, top=354-wing*4;
      const shape=new T.Shape();
      shape.moveTo(0,0); shape.lineTo(1.25,0); shape.lineTo(.15,top-bottom); shape.closePath();
      const fin=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.21,bevelEnabled:false}),metal);
      fin.rotation.y=angle;
      fin.position.set(center[0]+Math.cos(angle)*radius,bottom,center[1]-Math.sin(angle)*radius);
      group.add(fin);
    }
  }
  for (const [bottom,top,r0,r1] of [[381,387,3.35,2.08],[387,404,1.96,1.33],
    [404,420,1.28,.81],[420,437,.78,.45],[437,443.2,.32,.16]]) {
    const mesh=new T.Mesh(new T.CylinderGeometry(r1,r0,top-bottom,12),metal);
    mesh.position.set(center[0],(bottom+top)/2,center[1]);
    group.add(mesh);
  }
  return group;
}

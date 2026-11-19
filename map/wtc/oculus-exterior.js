import * as T from "three";

export function createOculusExterior() {
  const materials = new Map();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({color, roughness: .82}));
    return materials.get(color);
  }
  function box(parent, x,y,z,w,h,d,color) {
    const mesh = new T.Mesh(new T.BoxGeometry(w,h,d), material(color));
    mesh.position.set(x,y,z);
    parent.add(mesh);
    return mesh;
  }
  const shell = new T.Group();
  const facadePanels = [];
  const skylight = new T.Group();
  shell.add(skylight);
  function facadePanel(x, z) {
    const group = new T.Group();
    shell.add(group);
    facadePanels.push({ group, x, z });
    return group;
  }
  const steel = material(0xf1efe7);
  const bladeSteel = steel.clone();
  bladeSteel.flatShading = true;
  const portalSteel = steel.clone();
  portalSteel.side = T.DoubleSide;
  const glazing = new T.MeshStandardMaterial({color:0x94b5c4, transparent:true, opacity:.37, depthWrite:false, side:T.DoubleSide});

  const spline = vertices => new T.CatmullRomCurve3(vertices.map(p=>new T.Vector3(...p)));
  function sweptSteel(curve, section, blade = false) {
    const steps = Math.max(24,curve.points.length*2), positions=[], indices=[];
    const frames = curve.computeFrenetFrames(steps,false);
    for(let i=0;i<=steps;i++){
      const point=curve.getPointAt(i/steps);
      const [width,depth]=section(i/steps);
      const tangent = curve.getTangentAt(i/steps);
      const chord = blade ? new T.Vector3(1,0,0).addScaledVector(tangent,-tangent.x).normalize() : frames.normals[i];
      const thickness = blade ? tangent.clone().cross(chord).normalize() : frames.binormals[i];
      for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]])
        positions.push(...point.clone().addScaledVector(chord,u*width/2)
          .addScaledVector(thickness,v*depth/2).toArray());
      if(i>0)for(let j=0;j<4;j++){
        const previous=4*(i-1)+j, next=4*(i-1)+(j+1)%4;
        indices.push(previous,next,previous+4,next,next+4,previous+4);
      }
    }
    indices.push(0,2,1,0,3,2,4*steps,4*steps+1,4*steps+2,4*steps,4*steps+2,4*steps+3);
    surface(positions,indices,blade ? bladeSteel : steel);
  }
  function surface(vertices,indices,finish,parent=shell){
    const geometry=new T.BufferGeometry();
    geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    parent.add(new T.Mesh(geometry,finish));
  }
  function ribbon(rows,finish,parent){
    const faces=[];
    for(let i=1;i<rows.length;i++){
      const n=2*i;faces.push(n-2,n-1,n,n-1,n+1,n);
    }
    surface(rows.flat(2),faces,finish,parent);
  }

  // Model metres. Overall dimensions follow Calatrava; local profiles are photo-fitted.
  const halfArch = 53.34;
  const halfSkylight = 50.29;
  const ribCount = 57;
  const crown = x => 4.2 + 34.2*Math.sqrt(Math.max(0,1-(x/halfArch)**2));
  const spineHalfWidth = 1.6;
  const ribStations = Array.from({length:ribCount}, (_,i) => -52.8+i*105.6/(ribCount-1));
  const glassSamples = 20;
  const endProfiles = new Map();
  for (const side of [-1,1]) {
    const facade = facadePanel(0,side);
    const feet=[], spine=[], profiles=[], wings=[];
    for (const x of ribStations) {
      const t=x/halfArch, breadth=Math.sqrt(1-t*t), y=crown(x);
      const foot=[x,-.22,side*(4.4+12.8*breadth)];
      const shoulder=[x,y*.65,side*(3.5+7.7*breadth)];
      const joint=[x,y,side*spineHalfWidth];
      const inner=spline([foot,[x,y*.26,side*(4.2+11.7*breadth)],shoulder,joint]);
      const reach=4.5+22*Math.pow(breadth,.74);
      const rise=2.8+15.2*Math.pow(breadth,.88);
      const sweep=2.6*t*Math.abs(t);
      const wing=spline([joint,[x+sweep*.25,y+rise*.22,side*(spineHalfWidth+reach*.23)],
        [x+sweep*.7,y+rise*.70,side*(spineHalfWidth+reach*.72)],
        [x+sweep,y+rise,side*(spineHalfWidth+reach)]]);
      sweptSteel(inner,f=>[.46+.28*Math.sin(f*Math.PI/2),.72+.5*f]);
      sweptSteel(wing,f=>{
        const tip = Math.max(0,(f-.80)/.20);
        return [.065+1.51*(1-.14*f)*(1-tip),.035+.69*(1-f)];
      },true);
      feet.push(foot);
      spine.push(joint);
      profiles.push(inner);
      wings.push(wing);
    }
    const arch=spline([[-halfArch,4.2,side*spineHalfWidth],...spine,[halfArch,4.2,side*spineHalfWidth]]);
    sweptSteel(arch,f=>[1.22+.32*Math.sin(Math.PI*f),1.25+.4*Math.sin(Math.PI*f)]);
    sweptSteel(spline(feet),()=>[.62,.46]);

    // The curved tie crosses the wing in plan and intersects every blade.
    sweptSteel(spline(wings.map(wing=>wing.getPointAt(.69).toArray())),()=>[.24,.27]);
    endProfiles.set(side,[
      {rib:profiles[0],wing:wings[0]},
      {rib:profiles.at(-1),wing:wings.at(-1)},
    ]);
    // Sample the same rib curves and offset toward the enclosure.
    const glassPoint = (curve,t) => {
      const p=curve.getPoint(t);
      const tangent=curve.getTangent(t);
      p.addScaledVector(new T.Vector3(0,side*tangent.z,-side*tangent.y),.39);
      return p.toArray();
    };
    for(let j=1;j<=glassSamples;j++)
      ribbon(profiles.map(curve=>[glassPoint(curve,(j-1)/glassSamples),glassPoint(curve,j/glassSamples)]),glazing,facade);
  }

  const roofStations = Array.from({length:57},(_,i)=>-halfSkylight+i*2*halfSkylight/56);
  const roofWidth = x => spineHalfWidth*Math.sqrt(Math.max(0,1-Math.max(0,Math.abs(x)-halfSkylight+2)**2/4));
  ribbon(roofStations.map(x=>[[x,crown(x)+.08,-roofWidth(x)],[x,crown(x)+.08,roofWidth(x)]]),glazing,skylight);
  for(const x of roofStations.slice(1,-1))
    box(skylight,x,crown(x)+.13,0,.08,.12,2*roofWidth(x),0xd0dadd);

  for(const side of [-1,1]){
    const facade=facadePanel(side,0);
    const x=side*halfArch;
    const doorHalfWidth=3.2;
    // The solid end portal ties the last wings into a central saddle over the doors.
    const nose = [x+side*3.45,5.05,0];
    const soffit = spline([[x+side*1.65,3.02,-4.7],[x+side*2.75,3.28,-3.15],
      [x+side*3.7,3.42,0],[x+side*2.75,3.28,3.15],[x+side*1.65,3.02,4.7]]);
    for(const zSign of [-1,1]){
      const {rib,wing}=endProfiles.get(zSign)[side<0?0:1];
      const jamb=soffit.getPoint(zSign<0?0:1);
      const cheek=spline([[x+side*1.1,0,zSign*4.7],jamb.toArray()]);
      const shoulder=spline([jamb.toArray(),[x+side*2.65,4.38,zSign*2.7],nose]);
      const samples=Array.from({length:25},(_,i)=>i/24);
      const portalEdge=t=>t<=.5?cheek.getPoint(t*2):shoulder.getPoint(t*2-1);
      ribbon(samples.map(t=>[rib.getPoint(t).toArray(),portalEdge(t).toArray()]),portalSteel,shell);
      const noseOffset=new T.Vector3(...nose).sub(wing.getPoint(0));
      ribbon(samples.map(t=>{
        const blade=wing.getPoint(t);
        return [blade.toArray(),blade.clone().addScaledVector(noseOffset,(1-t)**2).toArray()];
      }),portalSteel,shell);
      ribbon(Array.from({length:13},(_,i)=>{
        const t=i/12;
        return [soffit.getPoint(.5+zSign*.5*t).toArray(),shoulder.getPoint(1-t).toArray()];
      }),portalSteel,shell);
    }
    const ridgeEnd=spline([nose,[x+side*2.15,5.4,0],[side*halfSkylight,crown(halfSkylight)+.08,0]]);
    const capRows=Array.from({length:21},(_,i)=>{
      const t=i/20,p=ridgeEnd.getPoint(t);
      const width=spineHalfWidth*Math.sin(Math.PI*t/2);
      return [[p.x,p.y,-width],[p.x,p.y,width]];
    });
    ribbon(capRows,portalSteel,shell);
    // Fill between the rounded glazing tip and the two fixed arch shoulders.
    for(const zSign of [-1,1]){
      ribbon([...roofStations.filter(x=>x*side>halfSkylight-2),side*(halfSkylight-2)].sort((a,b)=>a-b).map(roofX=>{
        const y=crown(roofX)+.08;
        return [[roofX,y,zSign*roofWidth(roofX)],[roofX,y,zSign*spineHalfWidth]];
      }),portalSteel,shell);
    }
    ribbon(Array.from({length:21},(_,i)=>{
      const p=soffit.getPoint(i/20);
      return [p.toArray(),[x-side*.6,p.y+.13,p.z]];
    }),portalSteel,shell);
    const entrance=x-side*.55;
    const header=box(facade,entrance,3.17,0,.13,.65,9.7,0x94b5c4);
    header.material=glazing;
    for(const zSign of [-1,1]){
      const pane=box(facade,entrance,1.44,zSign*(doorHalfWidth+.75),.12,2.88,1.5,0x94b5c4);
      pane.material=glazing;
      for(const z of [doorHalfWidth,doorHalfWidth+1.5])
        box(facade,entrance,1.58,zSign*z,.14,3.16,.075,0xbac4c6);
    }
  }

  return {shell, facadePanels, skylight};
}

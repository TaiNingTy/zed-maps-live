import * as T from "three";
import { crownWindows } from "./crown-windows.js";

export function buildEnvelope(shell, study, floors, {facadeLift = {value:0}, map = false} = {}) {
  const bearing = T.MathUtils.degToRad(study.frame.u_bearing_deg);
  shell.rotation.y = -bearing;
  const facadeRotation = map ? -bearing : 0;
  shell.traverse(object => {
    if (!object.isMesh) return;
    if (!object.geometry.attributes.normal) object.geometry.computeVertexNormals();
    const surface = new T.MeshStandardMaterial({roughness: .8, side: T.DoubleSide});
    surface.onBeforeCompile = shader => {
      shader.uniforms.facadeLift = facadeLift;
      shader.uniforms.facadeRotation = {value: facadeRotation};
      shader.vertexShader = "uniform float facadeLift; uniform float facadeRotation;\nvarying vec3 facadePosition;\n" + shader.vertexShader.replace(
        "#include <begin_vertex>", "#include <begin_vertex>\nfacadePosition = (modelMatrix * vec4(position, 1.0)).xyz; float c = cos(facadeRotation), s = sin(facadeRotation); facadePosition.xz = mat2(c,-s,s,c) * facadePosition.xz; facadePosition.y -= facadeLift;");
      shader.fragmentShader = "varying vec3 facadePosition;\n" + shader.fragmentShader.replace(
        "#include <color_fragment>", `#include <color_fragment>
        float elevation = facadePosition.y;
        vec3 dx = dFdx(facadePosition);
        vec3 dy = dFdy(facadePosition);
        vec3 localNormal = normalize(cross(dx, dy));
        vec2 centered = facadePosition.xz - vec2(33.05,-28.55);
        bool sideX = abs(centered.x) > abs(centered.y);
        float across = sideX ? centered.y : centered.x;
        float face = sideX ? abs(localNormal.x) : abs(localNormal.z);
        float row = fract((elevation-.35)/3.35);
        vec3 masonry = vec3(.68,.65,.59);
        if (elevation < 12.2) masonry = vec3(.83,.81,.75);
        if (elevation < 4.7) masonry = vec3(.032,.035,.040);
        if (elevation > 72.0 && elevation < 82.0 && row < .24) masonry *= .48;
        if (elevation < 200.0) {
          diffuseColor.rgb *= masonry;
        } else {
          // The stone head is a single rounded panel with a metal collar.
          // Highlight the existing shell ribs using the real face normals.
          float headX = across/7.4;
          float head = 221.0 + 11.0*sqrt(max(0.0,1.0-headX*headX));
          float headEdge = max(abs(headX)-1.0,(elevation-head)/12.0);
          float stonePanel = (1.0-smoothstep(-.012,.008,headEdge))*smoothstep(.72,.9,face);
          float band = fract((elevation-199.0)/3.35);
          float pairedPier = step(abs(across),1.65);
          float flankingPilaster = step(abs(abs(across)-2.15),.18);
          vec3 panel = vec3(.64,.62,.57)*(1.0-.15*step(.85,band));
          panel = mix(panel,vec3(.47,.49,.48),pairedPier*.45);
          panel = mix(panel,vec3(.78,.75,.69),flankingPilaster*.43);
          float fan = atan(across,max(2.5,elevation-216.0));
          float seam = 1.0-smoothstep(.015,.065,abs(fract(fan*26.0+.5)-.5));
          float collar = (1.0-smoothstep(.025,.070,abs(headEdge-.035)))*smoothstep(.60,.90,face);
          float folded = .55+.31*face+.12*abs(localNormal.y);
          vec3 steel = vec3(.55,.64,.72)*folded;
          steel = mix(steel,vec3(.80,.86,.91),clamp(collar*.58+seam*.12,0.0,1.0));
          if (elevation>279.0) steel=vec3(.67,.76,.84)*folded;
          diffuseColor.rgb *= mix(steel,panel,stonePanel);
        }`);
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nif (facadePosition.y >= 200.0 || facadePosition.y < 4.7) roughnessFactor = 0.36;");
    };
    object.material = surface;
  });
  const portalSlabs = floors.floors.filter(floor=>["02","03","04"].includes(floor.id)).map(floor=>floor.elev);
  const glazing = crownWindows(shell, study.openings, study.footprint, portalSlabs);
  return glazing;
}

export function createMapEnvelope(shell, study, floors) {
  const glazing = buildEnvelope(shell, study, floors, {map:true});
  const root = new T.Group();
  root.rotation.y = T.MathUtils.degToRad(study.frame.u_bearing_deg);
  root.add(shell, glazing);
  return root;
}

export function mapFloorModel(study, data) {
  return {
    frame: study.frame,
    crowns: [],
    floors: data.floors.map(floor=>{
      const layout = data.layouts[floor.layout];
      const rings = floor.rings ?? layout?.rings ?? [[study.footprint]];
      const openings = [...(layout?.components.elevators ?? []), ...(layout?.stairs ?? [])];
      return {
        id: floor.id, building: "chrysler", elev_m: floor.elev, height_m: 3,
        use: layout ? "office" : "plant",
        evidence: {outline: layout ? "rebuilt" : "scenario"},
        studyPlates: rings.map(([outline,...holes])=>[outline, ...holes,
          ...openings.filter(ring=>insideRing(ring[0],outline))])
      };
    })
  };
}

function insideRing([x,y], ring) {
  let inside=false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [ax,ay]=ring[i], [bx,by]=ring[j];
    if ((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax) inside=!inside;
  }
  return inside;
}

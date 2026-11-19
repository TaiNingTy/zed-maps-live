// A subway station under the street, drawn in 3D as a MapLibre custom layer (model: scripts/build_station.py).
// MapLibre's own extrusions cannot go below the ground, so the station's floors, its escalators and lifts, and the
// route through them are drawn here, at their true depth or at the spread-out heights (app.js gives the heights).
// The floor you stand on is in full colour and the others are faded, as with the building floors.
import * as THREE from "three";
import { prism } from "./floorkit.js";
import { facility, fareGates, openingGuards, landingPortal, heraldRailDetail } from "./station-fixtures.js";

const SLAB_M = 0.7;
const ROUTE_R = 1.1, ROUTE_LIFT_M = 0.8;

export function createStationLayer(maplibregl, { id, colors }) {
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-0.4, 1, 0.6);
  scene.add(sun);
  const group = new THREE.Group();
  scene.add(group);

  let map, renderer, origin = null, scale = 1, model = null, visible = false;
  let elevOf = () => 0, levelIds = {}, currentLevel = null, evidence = false, route = [], step = 0, spread = false;
  const faded = (v) => (spread ? Math.max(v, 0.72) : v); // floors spread apart do not overlap: no need to fade them so far

  const toLocal = (x, z) => {
    const f = model.frame;
    const mc = maplibregl.MercatorCoordinate.fromLngLat([f.origin[0] + x / f.m_per_deg_lon, f.origin[1] - z / f.m_per_deg_lat], 0);
    return [(mc.x - origin.x) / scale, (mc.y - origin.y) / scale];
  };
  const yOf = (level) => elevOf(levelIds[level]);
  const isCurrent = (level) => levelIds[level] === currentLevel;
  const paint = (el, base) => new THREE.Color(evidence ? colors.tier[el.evidence.place] : base);

  function material(color, opacity) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.75, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  }

  function slab(rings, y, color, opacity) {
    const shapes = rings.map((ring) => {
      const s = new THREE.Shape(ring.outer.map(([x, z]) => { const p = toLocal(x, z); return new THREE.Vector2(p[0], -p[1]); }));
      for (const h of ring.holes || []) s.holes.push(new THREE.Path(h.map(([x, z]) => { const p = toLocal(x, z); return new THREE.Vector2(p[0], -p[1]); })));
      return s;
    });
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: SLAB_M, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material(color, opacity));
    mesh.position.y = y - SLAB_M;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: opacity < 1 ? 0.3 : 0.7 })));
    return mesh;
  }

  function band(a, b, width, thick, color, opacity, edged = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, thick, a.distanceTo(b)), material(color, opacity));
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.lookAt(b);
    if (edged) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity: Math.min(1, opacity + 0.3) })));
    return mesh;
  }

  function buildModel() {
    for (const z of model.zones) {
      const fill = z.kind === "track" ? colors.track : z.operator ? colors.lirr : colors.hall;
      group.add(slab(z.shape, yOf(z.level) - (z.drop_m || 0), paint(z, fill), isCurrent(z.level) ? 1 : faded(0.26)));
    }
    for (const f of model.fare_lines) {
      const y = yOf(f.level);
      const [ax, az] = toLocal(...f.a), [bx, bz] = toLocal(...f.b);
      group.add(fareGates(new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz), paint(f, colors.gate), isCurrent(f.level) ? 1 : faded(0.25)));
    }
    for (const it of model.items) {
      const [ax, az] = toLocal(...it.from.xz), [bx, bz] = toLocal(...it.to.xz);
      const a = new THREE.Vector3(ax, yOf(it.from.level), az), b = new THREE.Vector3(bx, yOf(it.to.level), bz);
      const near = isCurrent(it.from.level) || isCurrent(it.to.level);
      const color = paint(it, it.kind === "stairs" || it.kind === "ramp" ? colors.stairs : it.kind === "escalator" ? colors.escalator : colors.elevator);
      const access=l=>{const p=it.access?.[l];if(!p)return;const [x,z]=toLocal(...p);return new THREE.Vector3(x,yOf(l),z);};
      group.add(facility({a,b,kind:it.kind,width:it.width_m,railDetail:model.station.id==="herald-square"?heraldRailDetail(it.id):undefined,color,opacity:near?1:faded(.28),rise:it.rise_m,accessA:access(it.from.level),accessB:access(it.to.level)}));
    }
    const guardsByLevel=new Map();
    for (const z of model.zones.filter(z=>z.kind!=="track")) {
      if(!guardsByLevel.has(z.level))guardsByLevel.set(z.level,{posts:[],beams:[]});
      const guardLevel=guardsByLevel.get(z.level);
      const v=p=>{const [x,t]=toLocal(...p);return new THREE.Vector3(x,yOf(z.level),t);};
      const portals=model.items.flatMap(it=>[it.from,it.to].filter(p=>p.level===z.level).map(p=>landingPortal(v(p.xz),v(p===it.from?it.to.xz:it.from.xz),it.kind,it.width_m,model.station.id==="herald-square"?heraldRailDetail(it.id):undefined,yOf(p.level)<=yOf(p===it.from?it.to.level:it.from.level))));
      for(const r of z.shape) for(const h of r.holes||[]) group.add(openingGuards(h.map(v),portals,isCurrent(z.level)?1:faded(.28),true,false,false,guardLevel));
      for(const path of z.guard_paths||[]) group.add(openingGuards(path.map(v),portals,isCurrent(z.level)?1:faded(.28),false,!!z.circulation_landing,false,guardLevel));
    }
    buildShell();
  }

  // What the architect's drawings add: the vault over the lower mezzanine, a tube round each long shaft, the canopies
  function buildShell() {
    const lifted = (a, b, y) => new THREE.Vector3(a, y, b);
    const shafts = {};
    for (const it of model.section ? model.items : []) { // only where a drawing shows the shafts
      if (Math.abs(it.rise_m) < 15) continue;
      const [ax, az] = toLocal(...it.from.xz), [bx, bz] = toLocal(...it.to.xz);
      (shafts[it.link] ||= []).push([lifted(ax, az, yOf(it.from.level)), lifted(bx, bz, yOf(it.to.level))]);
    }
    for (const list of Object.values(shafts)) {
      const a = new THREE.Vector3(), b = new THREE.Vector3();
      for (const [p, q] of list) { a.add(p); b.add(q); }
      a.divideScalar(list.length); b.divideScalar(list.length);
      const up = new THREE.Vector3(0, 2.6, 0);
      group.add(band(a.add(up), b.add(up), 11, 6.2, colors.hall, 0.14, true));
    }
    const sec = model.section, plat = model.zones.find((z) => z.id === "platform")?.shape[0]?.outer;
    if (sec && plat) {
      // the platform's two short ends give its centre line
      const p = plat.map((q) => toLocal(...q));
      const mid = (i, j) => [(p[i][0] + p[j][0]) / 2, (p[i][1] + p[j][1]) / 2];
      const [s0, s1] = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) < Math.hypot(p[1][0] - p[2][0], p[1][1] - p[2][1]) ? [mid(0, 1), mid(2, 3)] : [mid(1, 2), mid(3, 0)];
      const A = new THREE.Vector3(s0[0], 0, s0[1]), along = new THREE.Vector3(s1[0] - s0[0], 0, s1[1] - s0[1]);
      const dir = along.clone().normalize(), east = new THREE.Vector3(-dir.z, 0, dir.x);
      if (east.x < 0) east.negate();
      const y0 = yOf("lower");
      const pts = sec.vault.map(([x, y]) => A.clone().addScaledVector(east, x).add(new THREE.Vector3(0, y0 + y, 0)));
      group.add(new THREE.Mesh(prism(pts, along), new THREE.MeshBasicMaterial({ color: colors.hall, transparent: true, opacity: isCurrent("lower") ? 0.1 : 0.06, side: THREE.DoubleSide, depthWrite: false })));
      const ribs = [];
      for (let d = 0; d <= along.length(); d += 8) for (let i = 1; i < pts.length; i++) ribs.push(pts[i - 1].clone().addScaledVector(dir, d), pts[i].clone().addScaledVector(dir, d));
      group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ribs), new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.16 })));
    }
    // A cavern's shell, from its measured section, along its length
    for (const c of model.caverns || []) {
      const [ax, az] = toLocal(...c.xz[0]), [bx, bz] = toLocal(...c.xz[1]);
      const A = new THREE.Vector3(ax, 0, az), along = new THREE.Vector3(bx - ax, 0, bz - az);
      const dir = along.clone().normalize(), east = new THREE.Vector3(-dir.z, 0, dir.x);
      if (east.x < 0) east.negate();
      const y0 = yOf(c.level);
      const pts = c.profile.map(([x, y]) => A.clone().addScaledVector(east, x).add(new THREE.Vector3(0, y0 + y, 0)));
      group.add(new THREE.Mesh(prism(pts, along), new THREE.MeshBasicMaterial({ color: colors.lirr, transparent: true, opacity: isCurrent(c.level) ? 0.14 : 0.08, side: THREE.DoubleSide, depthWrite: false })));
      const ribs = [];
      for (let d = 0; d <= along.length(); d += 24) for (let i = 1; i < pts.length; i++) ribs.push(pts[i - 1].clone().addScaledVector(dir, d), pts[i].clone().addScaledVector(dir, d));
      group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ribs), new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.2 })));
    }
    for (const e of model.section ? model.entrances : []) {
      if (e.id === "entrance-elevator") continue;
      const big = e.id === "entrance-main", [x, z] = toLocal(...e.xz);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), material(colors.hall, 0.3));
      dome.scale.set(big ? 15 : 9, big ? 5 : 4, big ? 11 : 7);
      dome.position.set(x, yOf("street"), z);
      group.add(dome);
    }
  }

  // The route as a tube; where a floor hides it, a faint ghost still shows the way
  function tube(a, b, color) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    if (len < 0.01) return;
    const geo = new THREE.CylinderGeometry(model.routeRadius ?? ROUTE_R, model.routeRadius ?? ROUTE_R, len, 10);
    const place = (mesh) => {
      mesh.position.copy(a).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      group.add(mesh);
    };
    place(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })));
    const ghost = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, depthFunc: THREE.GreaterDepth }));
    ghost.renderOrder = 3;
    place(ghost);
  }

  function buildRoute() {
    for (const s of route) {
      const color = s.step === step ? colors.route.current : s.step < step ? colors.route.done : colors.route.next;
      const a = maplibregl.MercatorCoordinate.fromLngLat(s.a.lonlat, 0), b = maplibregl.MercatorCoordinate.fromLngLat(s.b.lonlat, 0);
      tube(new THREE.Vector3((a.x - origin.x) / scale, (s.a.elev??elevOf(s.a.level)) + (model.routeLift ?? ROUTE_LIFT_M), (a.y - origin.y) / scale),
        new THREE.Vector3((b.x - origin.x) / scale, (s.b.elev??elevOf(s.b.level)) + (model.routeLift ?? ROUTE_LIFT_M), (b.y - origin.y) / scale), color);
    }
  }

  function rebuild() {
    group.traverse((o) => { o.geometry?.dispose(); if(o.isInstancedMesh) o.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    group.clear();
    if (model && visible) { buildModel(); buildRoute(); }
    map?.triggerRepaint();
  }

  const layer = {
    id, type: "custom", renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, matrix) {
      if (!visible || !model) return;
      // model frame: x east, y up, z south (metres) -> Mercator (x east, y south, z up)
      const m4 = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z)
        .scale(new THREE.Vector3(scale, -scale, scale)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(m4);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };

  return {
    layer,
    /** Show a station, or none. `levels` maps the model's levels to the venue's; `elev(level)` gives its height. */
    setModel(m, { levels = {}, elev = () => 0 } = {}) {
      model = m; levelIds = levels; elevOf = elev; route = [];
      if (m) {
        origin = maplibregl.MercatorCoordinate.fromLngLat(m.frame.origin, 0);
        scale = origin.meterInMercatorCoordinateUnits();
      }
      rebuild();
    },
    setVisible(on) { if (on !== visible) { visible = on; rebuild(); } },
    /** The route's part in the station: [{ step, a: { lonlat, level }, b: { lonlat, level } }]. */
    setRoute(segments) { route = segments; rebuild(); },
    setStep(i) { if (i !== step) { step = i; rebuild(); } },
    setLevel(id) { if (id !== currentLevel) { currentLevel = id; rebuild(); } },
    setEvidence(on) { if (on !== evidence) { evidence = on; rebuild(); } },
    setSpread(on) { spread = on; },
    /** Heights changed (floors spread apart, or back). */
    refresh: rebuild,
    get group() { return group; },
    get visible() { return visible; },
  };
}

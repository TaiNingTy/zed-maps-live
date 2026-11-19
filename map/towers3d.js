// The floors of 10 and 30 Hudson Yards and The Shops, standing where they are on the map, as a MapLibre custom layer.
// It shows with the inside views: at real height inside the see-through towers, or spread apart with Spread floors.
// The floor you stand on is solid, with its rooms and desks; the others are one light merged mesh, so 130 floors stay cheap.
import * as THREE from "three";
import { floorParts, desksMesh, crownShapes, prism, edgeShaftSpan, edgeShaftGeo, blockGeo, CORE_COLOR, coreBlocks } from "./floorkit.js";

import { facility, fareGates, openingGuards } from "./cpt-station/station-fixtures.js";

const CPT_COLORS = {condo:"#7db6dd",unknown:"#858891",transit:"#9e88d5",track:"#3a3d45",escalators:"#a8663f"};

function cptParts(data,f) {
  const source = f.id === "cpt:lobby" || f.id === "retail:1"
    ? {...f,features:f.features.filter(x=>x.kind!=="door"&&x.kind!=="gate")} : f;
  const parts = floorParts(data,{...source,core:null});
  function blocks(key,boxes,height,y=0,tier="scenario",opacity) {
    if (boxes.length) parts.push({key,geo:blockGeo(boxes,height),y,tier,opacity});
  }
  if (f.id === "cpt:lobby") {
    blocks("door",[[65.12,-.09,65.27,.09],[66.73,-.09,66.88,.09]],2.4);
    blocks("door",[[65.12,-.09,66.88,.09]],.15,2.25);
    blocks("gate",[[64.62,23.82,64.98,24.18]],.98);
  }
  if (!f.core_height_m) return parts;
  const h=f.core_height_m;
  for (const b of coreBlocks(data,f)) {
    const [x0,y0,x1,y1]=b.rect, key=CORE_COLOR[b.kind], tier=b.tier||f.evidence.core;
    if (b.kind !== "elevators") {
      blocks(key,[b.rect],b.kind==="lobby"?.12:h,0,tier,b.name==="Core enclosure wall"?.16:undefined);
      continue;
    }
    const t=.13, portal=f.core_portals?.find(p=>p.shaft===b.name);
    for (const [side,wall] of Object.entries({west:[x0,y0,x0+t,y1],east:[x1-t,y0,x1,y1],
      south:[x0+t,y0,x1-t,y0+t],north:[x0+t,y1-t,x1-t,y1]})) {
      if (side!==portal?.side) {blocks(key,[wall],h,0,tier);continue;}
      const axis=side==="east"||side==="west"?1:0, low=portal.seg[0][axis],high=portal.seg[1][axis];
      const left=[...wall],right=[...wall],header=[...wall];
      left[axis+2]=low;right[axis]=high;header[axis]=low;header[axis+2]=high;
      blocks(key,[left,right],h,0,tier);
      if (h>2.2) blocks(key,[header],h-2.2,2.2,tier);
      if (!portal.demo_open) blocks(key,[header],Math.min(2.2,h),0,portal.tier);
    }
  }
  return parts;
}

const PALETTE = {
  light: { office: "#7db6dd", retail: "#f2a241", dining: "#ea8a3f", plant: "#2a2c31", amenity: "#3fa596", lobby: "#cdd2d9", observation: "#ec8d97", event: "#cfa8df", terrace: "#7fb96c",
    elevators: "#cf3a31", edgeshaft: "#e8590c", stairs: "#8f2f6b", service: "#565b63", restrooms: "#b4bcc8", corelobby: "#e9e8e3", desk: "#2f6387", room: "#4d8db5", meeting: "#5f7fd0", corridor: "#fbe3bd", edgeroom: "#e9a9bd", door: "#1f7a4d", gate: "#b42318", steps: "#6b4f8f", glassfloor: "#bfe8ff", glasswall: "#9fd4ee", edge: "#3f4349" },
  dark: { office: "#7db6dd", retail: "#f2a241", dining: "#ea8a3f", plant: "#55585f", amenity: "#3fa596", lobby: "#8f949c", observation: "#ec8d97", event: "#cfa8df", terrace: "#7fb96c",
    elevators: "#cf3a31", edgeshaft: "#ff8a3d", stairs: "#8f2f6b", service: "#70757e", restrooms: "#8d95a1", corelobby: "#6c6d6b", desk: "#a8d3ef", room: "#5f9bc2", meeting: "#5f7fd0", corridor: "#6d5a3c", edgeroom: "#b5688a", door: "#3ecf8e", gate: "#f0806f", steps: "#a98fd0", glassfloor: "#bfe8ff", glasswall: "#9fd4ee", edge: "#c5c4bf" },
};
const REAL_OPACITY = 0.14, SPREAD_OPACITY = 1; // spread apart, floors can be solid: the gaps show the route

// Join many geometries into one, each lifted by its own height: much faster to draw than one mesh per floor
function merged(list, lines) {
  let n = 0;
  const flat = list.map(({ geo, y }) => {
    const g = lines ? geo : (geo.userData.flat ||= geo.index ? geo.toNonIndexed() : geo);
    n += g.attributes.position.count;
    return { g, y };
  });
  const pos = new Float32Array(n * 3), nrm = lines ? null : new Float32Array(n * 3);
  let at = 0;
  for (const { g, y } of flat) {
    const p = g.attributes.position.array, c = g.attributes.position.count;
    for (let i = 0; i < c; i++) { pos[(at + i) * 3] = p[i * 3]; pos[(at + i) * 3 + 1] = p[i * 3 + 1] + y; pos[(at + i) * 3 + 2] = p[i * 3 + 2]; }
    if (nrm) nrm.set(g.attributes.normal.array, at * 3);
    at += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  if (nrm) out.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
  return out;
}

export function createTowersLayer(maplibregl, { id, dark, tiers }) {
  const colors = {...CPT_COLORS,...(dark ? PALETTE.dark : PALETTE.light)};
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 2.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-0.4, 1, 0.6);
  scene.add(sun);
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  scene.add(group);

  let map, renderer, data = null, visible = false, spread = false, current = null, evidence = false, cutaway = false;
  let elevOf = (f) => f.elev_m, modelMatrix = null, tops = {};
  const material = (color, opacity) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const colorFor = (part) => (evidence && part.tier ? tiers[part.tier] : colors[part.key]);

  function rebuild() {
    group.traverse((o) => { if (o.geometry && (o.userData.own || o.isInstancedMesh)) o.geometry.dispose(); if(o.isInstancedMesh) o.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    group.clear();
    map?.triggerRepaint();
    if (!data || !visible) return;
    const opacity = spread ? SPREAD_OPACITY : REAL_OPACITY;
    const byColor = new Map(), edges = [];
    const here = cutaway && current ? data.floors.find((f) => f.id === current) : null;
    const cutAt = here ? elevOf(here) : Infinity;
    for (const f of data.floors) {
      if (f.zones && !data.map_station) continue; // Other stations use station3d.js.
      if (here?.zones && !f.zones) continue;
      const y = elevOf(f);
      if (y > cutAt + 0.1) continue;
      for (const p of (data.map_station ? cptParts(data,f) : floorParts(data,f))) {
        if (f.id === current) {
          const m = new THREE.Mesh(p.geo, material(colorFor(p), p.opacity ?? 1));
          if (p.opacity) m.material.side = THREE.DoubleSide;
          m.position.y = y + p.y;
          group.add(m);
          if (p.edges) { const e = new THREE.LineSegments(p.edges, new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.8 })); e.position.y = m.position.y; group.add(e); }
          continue;
        }
        if (p.room && !spread) continue; // at real height, furnishing on every floor would only be noise
        if (p.opacity) continue; // glass walls: only on the floor you stand on
        const c = colorFor(p);
        if (!byColor.has(c)) byColor.set(c, []);
        byColor.get(c).push({ geo: p.geo, y: y + p.y });
        if (p.edges) edges.push({ geo: p.edges, y: y + p.y });
      }
      if (f.id === current && !f.zones) {
        const desks = desksMesh(data, f, material(evidence ? tiers.scenario : colors.desk, 1));
        if (desks) { desks.position.y = y; group.add(desks); }
      }
    }
    for (const [c, list] of byColor) {
      const m = new THREE.Mesh(merged(list, false), material(c, opacity));
      m.userData.own = true;
      group.add(m);
    }
    if (edges.length) {
      const l = new THREE.LineSegments(merged(edges, true), new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: spread ? 0.4 : 0.26, depthWrite: false }));
      l.userData.own = true;
      group.add(l);
    }
    if (data.map_station) {
      const levels=data.station.level_floors;
      const byId=Object.fromEntries(data.floors.map(f=>[f.id,f]));
      const v=(p,l)=>new THREE.Vector3(p[0],elevOf(byId[levels[l]]),-p[1]);
      const shown=l=>elevOf(byId[levels[l]])<=cutAt+.1;
      const tone=(key,ev)=>evidence?tiers[ev?.place||"scenario"]:colors[key];
      for(const it of data.station.items) {
        if(!shown(it.a)||!shown(it.b)) continue;
        const access=l=>it.access?.[l]&&v(it.access[l],l);
        const key={elevator:"elevators",escalator:"escalators",stairs:"stairs"}[it.kind];
        group.add(facility({a:v(it.from,it.a),b:v(it.to,it.b),kind:it.kind,width:it.width_m,
          accessA:access(it.a),accessB:access(it.b),flushUpperLanding:it.flush_upper_landing,
          rise:Math.abs(byId[levels[it.a]].elev_m-byId[levels[it.b]].elev_m),
          color:tone(key,it.evidence),opacity:current===levels[it.a]||current===levels[it.b]||spread?1:.58}));
      }
      for(const f of data.station.fare_lines) if(shown(f.level))
        group.add(fareGates(v(f.a,f.level),v(f.b,f.level),tone("gate",f.evidence)));
      for(const [l,id] of Object.entries(levels)) {
        const f=byId[id];
        if(!shown(l)) continue;
        for(const zone of f.zones||[]) for(const path of zone.flush_stair_guards||[])
          group.add(openingGuards(path.map(p=>v(p,l)),[],1,false,false,true));
        for(const path of f.guard_paths||[])
          group.add(openingGuards(path.map(p=>v(p,l)),[],1,false));
      }
    }
    // Edge's elevator shaft, the one thing that joins Level 4 to Level 100
    const span = edgeShaftSpan(data, elevOf);
    if (span) {
      span.y1 = Math.min(span.y1, cutAt + 10);
      const m = new THREE.Mesh(edgeShaftGeo(span), material(evidence ? tiers[span.evidence.place] : colors.edgeshaft, 0.62));
      m.position.y = span.y0;
      group.add(m);
    }
    for (const c of here ? [] : crownShapes(data)) {
      const pts = c.points.map((p) => p.clone().setY(p.y + elevOf(c.top) - c.top.elev_m));
      const geo = prism(pts, c.along);
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colors.lobby, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
      m.userData.own = true;
      group.add(m);
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: colors.edge, transparent: true, opacity: 0.5, depthWrite: false }));
      l.userData.own = true;
      group.add(l);
    }
  }

  function place(frame) {
    // the frame's street grid -> the map: two axes, measured through longitude and latitude so floors land on the venue's outlines
    const [lon0, lat0] = frame.origin_lonlat;
    const th = (frame.u_bearing_deg * Math.PI) / 180, mx = 111320 * Math.cos((lat0 * Math.PI) / 180), my = 110540;
    const o = maplibregl.MercatorCoordinate.fromLngLat([lon0, lat0], 0);
    const s = o.meterInMercatorCoordinateUnits();
    const at = (u, v) => {
      const x = u * Math.cos(th) - v * Math.sin(th), y = u * Math.sin(th) + v * Math.cos(th);
      const m = maplibregl.MercatorCoordinate.fromLngLat([lon0 + x / mx, lat0 + y / my], 0);
      return [(m.x - o.x) / s, (m.y - o.y) / s];
    };
    const [ax, az] = at(1000, 0), [bx, bz] = at(0, 1000);
    // geometry: (u, height, -v); model: x east, y up, z south
    group.matrix.set(ax / 1000, 0, -bx / 1000, 0, 0, 1, 0, 0, az / 1000, 0, -bz / 1000, 0, 0, 0, 0, 1);
    group.matrixWorldNeedsUpdate = true;
    modelMatrix = new THREE.Matrix4().makeTranslation(o.x, o.y, o.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  }

  const layer = {
    id, type: "custom", renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, matrix) {
      if (!visible || !data) return;
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };

  return {
    layer,
    /** Show the model, or none. `elev(floor)` gives a floor's height on the map (real or spread). */
    setModel(d, { elev } = {}) {
      data = d;
      if (elev) elevOf = elev;
      if (d) place(d.frame);
      rebuild();
    },
    setVisible(on) { if (on !== visible) { visible = on; rebuild(); } },
    /** The floor you stand on (a floor id), shown solid with its rooms and desks; null for none. */
    setCurrent(fid) { if (fid !== current) { current = fid ?? null; rebuild(); } },
    setSpread(on) { spread = on; rebuild(); },
    /** Hide everything above the floor you stand on, so it can be seen from outside. */
    setCutaway(on) { if (on !== cutaway) { cutaway = on; rebuild(); } },
    setEvidence(on) { if (on !== evidence) { evidence = on; rebuild(); } },
    get group() { return group; },
    get visible() { return visible; },
  };
}

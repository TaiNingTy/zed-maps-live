// Shared by the floors page (building.html) and the map (towers3d.js): how one floor of a modelled building becomes geometry,
// and how far each floor moves when the building is spread apart. Model data: scripts/build_buildings.py.
// Coordinates are the frame's metres: x along the street grid to the east, y up, z = -north.
import * as THREE from "three";

export const FT = 0.3048;
const ZONES = { "station-P": -3, "station-LM": -2, "station-UM": -1, shops: 0, "hy30-lobby": 1, "hy30-base": 2, "hy30-low": 3, "hy30-amenity": 4, "hy30-mid": 5, "hy30-upper": 6, "hy30-top": 7,
  "hy10-base": 1, "hy10-low": 2, "hy10-mid": 3, "hy10-high": 4,
  "gc-lirr-lower": -9, "gc-lirr-mezz": -8, "gc-lirr-upper": -7, "gc-plat7": -6, "gc-central7": -5, "gc-madison": -4, "gc-west7": -3, "gc-lex": -2, "gc-b2": -1, "hs-ind": -7, "hs-ramp-lower": -6, "hs-south-lower": -5, "hs-bmt": -4, "hs-ramp-upper": -3, "hs-mezz": -2, "esb-below": -1, "esb-base": 0, "esb-low": 1, "esb-21": 2, "esb-25": 3, "esb-tower": 4, "esb-72": 5, "esb-81": 6, "esb-86": 7, "esb-mast": 8, "ov-concourse": 0, "ov-base": 1, "ov-podium": 2, "ov-exec": 3, "ov-tower": 4, "ov-pent": 5, "ov-sky": 6, "ov-summit": 7 };
export const ZONE_GAP = 30;
const FLOOR_GAP = { hy30: 1.2, hy10: 1.2, shops: 5, station: 0, lirr: 0, ov: 1.2, esb: 1.2, chrysler: 1.2, cpt: 1.2, retail: 1.2 };
export const CORE_COLOR = { elevators: "elevators", edgeshaft: "edgeshaft", stairs: "stairs", service: "service", restrooms: "restrooms", lobby: "corelobby" };

/** Each floor's place in its building, counted from the bottom. */
export function floorOrder(floors) {
  const order = {};
  for (const b of new Set(floors.map((f) => f.building))) {
    floors.filter((f) => f.building === b).sort((a, c) => a.elev_m - c.elev_m).forEach((f, i) => { order[f.id] = i; });
  }
  return order;
}
/** How far a floor rises when spread (as in KPF's drawing: a gap between groups of floors, a small one between floors). */
export const spreadOffset = (f, order, spread = 1) => spread * (ZONE_GAP * (ZONES[f.zone] ?? 0) + FLOOR_GAP[f.building] * order[f.id]);

const geoCache = new Map();
export function plateGeo(rings, thick, holes) {
  const key = JSON.stringify([rings, thick, holes]);
  if (geoCache.has(key)) return geoCache.get(key);
  const shapes = rings.map((r) => {
    const s = new THREE.Shape(r.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const h of holes || []) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    return s;
  });
  const g = new THREE.ExtrudeGeometry(shapes, { depth: thick, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.userData.edges = new THREE.EdgesGeometry(g, 30);
  geoCache.set(key, g);
  return g;
}
export function blockGeo(list, h, lift = 0) {
  const key = JSON.stringify([list, h, lift]);
  if (geoCache.has(key)) return geoCache.get(key);
  const pos = [], idx = [];
  const faces = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
  for (const [x0, y0, x1, y1, hh] of list) {
    const t = lift + (hh ?? h);
    const v = [[x0, t, -y0], [x1, t, -y0], [x1, t, -y1], [x0, t, -y1], [x0, lift, -y0], [x1, lift, -y0], [x1, lift, -y1], [x0, lift, -y1]];
    for (const fa of faces) {
      const b = pos.length / 3;
      for (const i of fa) pos.push(...v[i]);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}
/** A polygon (3D points) swept along a vector. */
export function prism(points, along) {
  const pos = [], idx = [];
  const n = points.length;
  const a = points, b = points.map((p) => p.clone().add(along));
  for (const p of [...a, ...b]) pos.push(p.x, p.y, p.z);
  for (let i = 1; i < n - 1; i++) { idx.push(0, i, i + 1); idx.push(n, n + i + 1, n + i); }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; idx.push(i, j, n + j, i, n + j, n + i); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The floor's core, block by block; on floors with no published plan, the assumed block. */
export function coreBlocks(data, f) {
  if (f.core) {
    const minY = ((f.core.min_y_ft || 0) + data.origin_ft.y) * FT;
    return data.cores[f.core.template]
      .filter((b) => (b.rect[2] / FT - data.origin_ft.x) <= f.core.max_x_ft)
      .filter((b) => b.kind !== "edgeshaft" || f.elev_m >= (data.edge_shaft?.bottom_m ?? 0) - 1) // the shaft starts at Level 4
      .filter((b) => b.rect[3] > minY)
      .map((b) => (b.rect[1] < minY ? { ...b, rect: [b.rect[0], minY, b.rect[2], b.rect[3]] } : b));
  }
  if (f.core10) return data.cores[`hy10-${f.core10}`];
  if (f.core_box_ft) {
    const [x0, y0, x1, y1] = f.core_box_ft, o = data.origin_ft;
    return [{ kind: "service", n: 0, rect: [(x0 + o.x) * FT, (y0 + o.y) * FT, (x1 + o.x) * FT, (y1 + o.y) * FT], assumed: true }];
  }
  return [];
}
// Is this point inside the floor's outline? Floors that narrow with height drop what no longer fits on them.
export const onPlate = (f, x, y) => {
  const r = f.plate[0];
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if ((r[i][1] > y) !== (r[j][1] > y) && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) inside = !inside;
  }
  return inside;
};
/** The rooms and desks of a floor's test layout that fit on it. */
export function layoutOf(data, f) {
  if (!f.layout) return { rooms: [], desks: [] };
  const lay = data.layouts[f.layout.template];
  if (f.layout.clip) {
    return { rooms: lay.rooms.filter((r) => onPlate(f, r[1], r[2]) && onPlate(f, r[3], r[4]) && onPlate(f, r[1], r[4]) && onPlate(f, r[3], r[2])), desks: lay.desks.filter((d) => onPlate(f, d[0], d[1])) };
  }
  const lim = (f.layout.max_x_ft + data.origin_ft.x) * FT;
  return { rooms: lay.rooms.filter((r) => r[3] <= lim), desks: lay.desks.filter((d) => d[0] <= lim) };
}
const box = (poly, h) => { const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), h]; };

// How far the steps climb: to the next floor up
function stepRise(data, f) {
  const up = data.floors.filter((g) => g.building === f.building && g.elev_m > f.elev_m).sort((a, b) => a.elev_m - b.elev_m)[0];
  return up ? up.elev_m - f.elev_m : 3;
}
// Bleacher steps from the south edge of their outline (at the floor) to the north edge (at the next floor)
function stepsGeo(poly, n, rise) {
  const ys = poly.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const x0 = Math.min(...poly.map((p) => p[0]));
  const south = Math.max(...poly.filter((p) => p[1] === y0).map((p) => p[0])), north = Math.max(...poly.filter((p) => p[1] === y1).map((p) => p[0]));
  const list = [];
  for (let i = 0; i < n; i++) {
    const a = y0 + ((y1 - y0) * i) / n, b = y0 + ((y1 - y0) * (i + 1)) / n, t = (i + 0.5) / n;
    list.push([x0, a, south + (north - south) * t, b, (rise * (i + 1)) / n]);
  }
  return blockGeo(list, rise);
}
// An upright strip along a line, for the glass walls
function wallGeo(line, h) {
  const pos = [], idx = [];
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i], s = pos.length / 3;
    pos.push(ax, 0, -ay, bx, 0, -by, bx, h, -by, ax, h, -ay);
    idx.push(s, s + 1, s + 2, s, s + 2, s + 3, s, s + 2, s + 1, s, s + 3, s + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Upright strips along separate segments, as one geometry. */
export function wallSegmentsGeo(segments, h) {
  const pos = [], idx = [];
  for (const [[ax, ay], [bx, by]] of segments) {
    const s = pos.length / 3;
    pos.push(ax, 0, -ay, bx, 0, -by, bx, h, -by, ax, h, -ay);
    idx.push(s, s + 1, s + 2, s, s + 2, s + 3, s, s + 2, s + 1, s, s + 3, s + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Edge's elevator shaft between its floors, given how high each floor stands: { rect, y0, y1, cars, name }. */
export function edgeShaftSpan(data, heightOf) {
  const s = data.edge_shaft;
  if (!s) return null;
  const a = data.floors.find((f) => f.id === s.from), b = data.floors.find((f) => f.id === s.to);
  return { ...s, y0: heightOf(a), y1: heightOf(b) + (s.top_m - b.elev_m) };
}
/** The shaft as a mesh-ready box in the frame: two cars side by side along y. */
export function edgeShaftGeo(span) {
  const [x0, y0, x1, y1] = span.rect, mid = (y0 + y1) / 2, gap = 0.25;
  const h = span.y1 - span.y0;
  return blockGeo([[x0, y0, x1, mid - gap, h], [x0, mid + gap, x1, y1, h]], h);
}

/** The pieces of one floor: [{ key (a colour name), tier, geo, y, slab, edges, room }]. `room` marks interior furnishing. */
export function floorParts(data, f) {
  const parts = [];
  const ev = f.evidence || {};
  const slab = (rings, holes, key, tier, y = -0.55, thick = 0.55) => {
    const geo = plateGeo(rings, thick, holes);
    parts.push({ key, tier, geo, y, slab: true, edges: geo.userData.edges });
  };
  if (f.studyPlates) {
    for (const [outline,...holes] of f.studyPlates) slab([outline],holes,f.use,ev.outline,-.24,.24);
    return parts;
  }
  for (const z of f.context_zones || []) for (const r of z.shape) slab([r.outer], r.holes, "transit", z.evidence.place, -0.5, 0.5);
  if (f.zones) {
    for (const z of f.zones) for (const r of z.shape) {
      if (z.plan_only) continue;
      if (z.rail_only) {
        slab([r.outer],r.holes,"track",z.evidence.place,-.75,.35);
        continue;
      }
      if (z.kind === "survey-stair-trace") {
        slab([r.outer], r.holes, "stairs", z.evidence.place, 0.04, 0.06);
        continue;
      }
      slab([r.outer], r.holes, z.circulation_landing ? "stairs" : z.kind === "track" ? "track" : z.operator ? "lirr" : "transit", z.evidence.place, -0.5 - (z.drop_m || 0), 0.5);
      parts[parts.length-1].circulationLanding = !!z.circulation_landing;
    }
    return parts;
  }
  if (f.terrace && f.indoor) {
    slab(f.terrace, null, "terrace", ev.outline);
    slab(f.indoor, null, f.use, ev.outline);
  } else {
    slab(f.plate, f.hole, f.use, ev.outline);
    if (f.terrace) slab(f.terrace, null, "terrace", ev.outline);
  }
  if (f.deck) slab(f.deck, null, "observation", "rebuilt");
  // Core: elevators, stairs, restrooms and building services, standing on the floor
  const wall = Math.min(f.height_m * 0.85, 3.6);
  const kinds = {};
  for (const b of coreBlocks(data, f)) (kinds[b.kind] ||= []).push([...b.rect, b.kind === "lobby" ? 0.15 : wall]);
  for (const [kind, list] of Object.entries(kinds)) parts.push({ key: CORE_COLOR[kind], tier: ev.core, geo: blockGeo(list, wall), y: 0 });
  // Shop corridors
  if (f.corridors) parts.push({ key: "corridor", tier: ev.layout, geo: blockGeo(f.corridors.map((r) => box(r, 0.1)), 0.1), y: 0 });
  // Inside Edge: rooms, doors, the ticket line, the skyline steps, the glass floor and walls
  for (const x of f.features || []) {
    if (x.kind === "room") {
      parts.push({ key: "edgeroom", tier: x.tier, geo: plateGeo([x.poly], 1.1), y: 0.05, edges: plateGeo([x.poly], 1.1).userData.edges, feature: true });
    } else if (x.kind === "door" || x.kind === "gate") {
      const [[ax, ay], [bx, by]] = x.seg, t = 0.45;
      const rect = ax === bx ? [ax - t, Math.min(ay, by), ax + t, Math.max(ay, by)] : [Math.min(ax, bx), ay - t, Math.max(ax, bx), ay + t];
      parts.push({ key: x.kind === "door" ? "door" : "gate", tier: x.tier, geo: blockGeo([[...rect, 2.6]], 2.6), y: 0, feature: true });
    } else if (x.kind === "steps") {
      parts.push({ key: "steps", tier: x.tier, geo: stepsGeo(x.poly, x.treads, stepRise(data, f)), y: 0, feature: true });
    } else if (x.kind === "glass-floor") {
      parts.push({ key: "glassfloor", tier: x.tier, geo: plateGeo([x.poly], 0.5), y: 0, feature: true });
    } else if (x.kind === "glass-wall") {
      parts.push({ key: "glasswall", tier: x.tier, geo: wallGeo(x.line, x.height_m), y: 0, opacity: 0.32, feature: true });
    }
  }
  // Interior: rooms from the deck's test layouts
  if (f.layout) {
    const { rooms } = layoutOf(data, f);
    const of = (kind) => rooms.filter((r) => r[0] === kind).map((r) => [r[1], r[2], r[3], r[4], 1.5]);
    if (of("office").length) parts.push({ key: "room", tier: ev.layout, geo: blockGeo(of("office"), 1.5), y: 0, room: true });
    if (of("meeting").length) parts.push({ key: "meeting", tier: ev.layout, geo: blockGeo(of("meeting"), 1.5), y: 0, room: true });
  }
  return parts;
}

export const deskGeo = new THREE.BoxGeometry(1.5, 0.75, 0.75);
/** Desks of this floor, as an instanced mesh (none if the floor has no test layout). */
export function desksMesh(data, f, material) {
  const { desks } = layoutOf(data, f);
  if (!desks.length) return null;
  const mesh = new THREE.InstancedMesh(deskGeo, material, desks.length);
  const m = new THREE.Matrix4();
  desks.forEach((d, i) => { m.makeTranslation(d[0], 0.38, -d[1]); mesh.setMatrixAt(i, m); });
  return mesh;
}
/** Crown geometry in the frame, standing at its real height: [{ top: floor, points, along }]. */
export function crownShapes(data) {
  return data.crowns.map((c) => {
    const top = data.floors.filter((f) => f.building === c.building).sort((a, b) => b.elev_m - a.elev_m)[0];
    const points = c.axis === "ns" ? c.profile.map(([x, e]) => new THREE.Vector3(x, e, -c.span[0])) : c.profile.map(([y, e]) => new THREE.Vector3(c.span[0], e, -y));
    const along = c.axis === "ns" ? new THREE.Vector3(0, 0, -(c.span[1] - c.span[0])) : new THREE.Vector3(c.span[1] - c.span[0], 0, 0);
    return { top, points, along };
  });
}

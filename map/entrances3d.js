// Subway entrances in 3D: a small map pin (round head, pointed foot) on MTA entrances, drawn as a MapLibre
// custom layer. The pin's point touches the entrance; the pin turns to face the camera.
// While choosing, every entrance shows, coloured by type, and the route's own is larger and in the start colour.
// While following the steps only that one stays (setShowAll), so the view stays about the route. Types:
//   stairs dark · street elevator blue (step-free) · station house slate · in-building passage grey
// Where a building hides a pin, its hidden part is drawn as a faint ghost (x-ray).
import * as THREE from "three";

const R = 0.35, C = 0.65;     // head radius and head centre height, in pin heights (pin is 0.7 wide)
const HOLE = 0.15;
const TARGET_PX = 22;         // pin height on screen, kept roughly constant across zooms
const MIN_M = 3, MAX_M = 40;
const CHOSEN_SCALE = 1.2;

function pinShape() {
  const a = Math.acos(R / C);  // the two sides are tangent to the head
  const s = new THREE.Shape();
  s.moveTo(0, 0).absarc(0, C, R, -Math.PI / 2 + a, (3 * Math.PI) / 2 - a, false).lineTo(0, 0);
  const hole = new THREE.Path();
  hole.absarc(0, C, HOLE, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

export function createEntranceLayer(maplibregl, { id, entrances, colors }) {
  const pts = entrances.features;
  const c0 = pts.reduce((a, f) => [a[0] + f.geometry.coordinates[0] / pts.length, a[1] + f.geometry.coordinates[1] / pts.length], [0, 0]);
  const mc0 = maplibregl.MercatorCoordinate.fromLngLat(c0, 0);
  const s = mc0.meterInMercatorCoordinateUnits();
  // model frame: x east, y up, z south (metres) -> Mercator (x east, y south, z up)
  const modelMatrix = new THREE.Matrix4().makeTranslation(mc0.x, mc0.y, mc0.z)
    .scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(0.6, 1, 0.8);
  scene.add(sun);

  const pin = new THREE.ExtrudeGeometry(pinShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03,
    bevelSize: 0.02, bevelSegments: 2, curveSegments: 24 }).translate(0, 0, -0.06);
  const edges = new THREE.EdgesGeometry(pin, 40);
  const disc = new THREE.CircleGeometry(0.12, 24).rotateX(-Math.PI / 2);
  const hitGeom = new THREE.BoxGeometry(0.9, 1.1, 0.9).translate(0, 0.55, 0); // easy to click from any angle
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });

  const body = { stair: colors.stair, elevator: colors.elevator, house: colors.house, passage: colors.passage };
  const mats = new Map(); // one material per (colour, faded) pair
  const mat = (hex, faded) => {
    const key = `${hex}|${faded}`;
    if (!mats.has(key)) {
      mats.set(key, {
        solid: new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.05, transparent: true, opacity: faded ? 0.3 : 1 }),
        edge: new THREE.LineBasicMaterial({ color: colors.rim, transparent: true, opacity: faded ? 0.2 : 0.7 }),
        disc: new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: faded ? 0.1 : 0.3, depthWrite: false }),
        ghost: new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: faded ? 0.08 : 0.35, depthWrite: false,
          depthFunc: THREE.GreaterDepth }), // only where something nearer (a building) already drew
      });
    }
    return mats.get(key);
  };

  const items = pts.map((f) => {
    const p = f.properties, mc = maplibregl.MercatorCoordinate.fromLngLat(f.geometry.coordinates, 0);
    const root = new THREE.Group();
    root.position.set((mc.x - mc0.x) / s, 0, (mc.y - mc0.y) / s);
    const spin = new THREE.Group(); // turns to face the camera
    const solid = new THREE.Mesh(pin);
    const edge = new THREE.LineSegments(edges);
    const ghost = new THREE.Mesh(pin);
    ghost.renderOrder = 2;
    spin.add(solid, edge, ghost);
    const ground = new THREE.Mesh(disc);
    const hit = new THREE.Mesh(hitGeom, hitMat);
    hit.userData.eid = p.eid;
    root.add(spin, ground, hit);
    scene.add(root);
    return { p, kind: body[p.glyph] ? p.glyph : "stair", root, spin, solid, edge, ghost, ground, hit };
  });

  let map, renderer, visible = false, station = null, chosen = -1, hover = -1, showAll = true;

  function restyle() {
    for (const it of items) {
      const isChosen = it.p.eid === chosen;
      it.root.visible = showAll || chosen < 0 || isChosen;
      const faded = station != null && it.p.complex_id !== station && !isChosen;
      const m = mat(isChosen ? colors.route : body[it.kind], faded);
      it.solid.material = m.solid; it.edge.material = m.edge; it.ground.material = m.disc; it.ghost.material = m.ghost;
    }
    map?.triggerRepaint();
  }
  restyle();

  const layer = {
    id, type: "custom", renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, matrix) {
      if (!visible) return;
      const mpp = (40075016.686 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / (512 * 2 ** map.getZoom());
      const h = Math.min(MAX_M, Math.max(MIN_M, TARGET_PX * mpp));
      const yaw = (-map.getBearing() * Math.PI) / 180;
      for (const it of items) {
        if (!it.root.visible) continue;
        it.root.scale.setScalar(h * (it.p.eid === chosen ? CHOSEN_SCALE : 1) * (it.p.eid === hover ? 1.15 : 1));
        it.spin.rotation.y = yaw;
      }
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };

  return {
    layer,
    setVisible(on) { visible = on; map?.triggerRepaint(); },
    /** Strong pins for one station (null: all strong); the chosen entrance always stays strong. */
    setStation(cid) { station = cid ?? null; restyle(); },
    /** The route's entrance (-1: none): larger, in the start colour. */
    setRouteExit(eid) { chosen = eid; restyle(); },
    /** All entrances, or only the route's (when one is set). */
    setShowAll(on) { if (on !== showAll) { showAll = on; restyle(); } },
    /** Hover feedback; returns the entrance under the point, if any. */
    setHover(point) {
      const f = this.hit(point);
      const eid = f ? f.properties.eid : -1;
      if (eid !== hover) { hover = eid; map.triggerRepaint(); }
      return f;
    },
    /** The shown entrance feature under a screen point (CSS px), or null. */
    hit(point) {
      if (!visible || !map) return null;
      const c = map.getCanvas();
      const x = (point.x / c.clientWidth) * 2 - 1, y = 1 - (point.y / c.clientHeight) * 2;
      const inv = camera.projectionMatrix.clone().invert();
      const near = new THREE.Vector3(x, y, -1).applyMatrix4(inv);
      const far = new THREE.Vector3(x, y, 1).applyMatrix4(inv);
      const ray = new THREE.Raycaster(near, far.sub(near).normalize());
      const hits = ray.intersectObjects(items.filter((it) => it.root.visible).map((it) => it.hit), false);
      if (!hits.length) return null;
      const eid = hits[0].object.userData.eid;
      return pts.find((f) => f.properties.eid === eid);
    },
  };
}

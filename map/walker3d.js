// The 3D counterpart of the 2D walker dot: a small figure standing on the route band, drawn as a MapLibre custom
// layer. app.js moves it (setPose) from the same animation that moves the 2D dot, so both always show the same
// place on the route. It faces the way it walks, swings its legs while walking and stands still in a lift or at a
// desk. Like the subway pins it keeps a readable size on screen, and where a floor hides it a faint ghost shows.
import * as THREE from "three";

const TARGET_PX = 30;         // figure height on screen
const MIN_M = 2.2, MAX_M = 12; // beyond 12 m the floor marker shows where you are

export function createWalkerFigure({ color, rim }) {
  // Proportions in figure heights (1 = whole figure): head, torso, two legs, two arms
  const solid = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.05 });
  const ghost = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false,
    depthFunc: THREE.GreaterDepth });
  const edgeMat = new THREE.LineBasicMaterial({ color: rim, transparent: true, opacity: 0.8 });
  const fig = new THREE.Group();
  const part = (geom, x, y, z) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const m = new THREE.Mesh(geom, solid), gh = new THREE.Mesh(geom, ghost), e = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 35), edgeMat);
    gh.renderOrder = 2;
    g.add(m, gh, e);
    fig.add(g);
    return g;
  };
  part(new THREE.SphereGeometry(0.11, 20, 14), 0, 0.87, 0);
  part(new THREE.CapsuleGeometry(0.13, 0.22, 4, 12), 0, 0.6, 0);
  const limb = (len, r) => new THREE.CapsuleGeometry(r, len, 3, 8).translate(0, -len / 2, 0); // pivots at the top
  const legL = part(limb(0.3, 0.055), -0.07, 0.4, 0), legR = part(limb(0.3, 0.055), 0.07, 0.4, 0);
  const armL = part(limb(0.24, 0.042), -0.18, 0.7, 0), armR = part(limb(0.24, 0.042), 0.18, 0.7, 0);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.position.y = 0.005;
  fig.add(shadow);
  const hitMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ visible: false }));
  fig.add(hitMesh);

  // "You are here" on the floor, as on a phone map: a ringed dot with a beam the way you face. It keeps its size on
  // screen while the figure keeps its true-ish size, so the floor the figure stands on always reads clearly.
  const flat = (geom, mat, y) => { const m = new THREE.Mesh(geom.rotateX(-Math.PI / 2), mat); m.position.y = y; m.renderOrder = 1; return m; };
  const BEAM = Math.PI / 3;
  const marker = new THREE.Group();
  marker.add(flat(new THREE.CircleGeometry(4.2, 28, Math.PI / 2 - BEAM / 2, BEAM),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }), 0.02));
  marker.add(flat(new THREE.CircleGeometry(1.35, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }), 0.03));
  marker.add(flat(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color, depthWrite: false }), 0.04));
  // where a floor hides it, a faint ghost still shows where you are
  marker.add(flat(new THREE.CircleGeometry(1.35, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35,
    depthWrite: false, depthFunc: THREE.GreaterDepth }), 0.04));
  function swingLimbs(swing) {
    legL.rotation.x = swing; legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.7; armR.rotation.x = swing * 0.7;
  }
  return { fig, marker, hitMesh, swingLimbs };
}

export function createWalkerLayer(maplibregl, { id, color, rim }) {
  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(0.6, 1, 0.8);
  scene.add(sun);

  const { fig, marker, hitMesh, swingLimbs } = createWalkerFigure({ color, rim });
  scene.add(fig, marker);
  const MARKER_PX = 7; // dot radius on screen

  let map, renderer, visible = false, pose = null, hover = false;

  const layer = {
    id, type: "custom", renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },
    render(gl, matrix) {
      if (!visible || !pose) return;
      const mc = maplibregl.MercatorCoordinate.fromLngLat(pose.lonlat, pose.alt);
      const s = mc.meterInMercatorCoordinateUnits();
      // model frame: x east, y up, z south (metres) -> Mercator (x east, y south, z up)
      const model = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z)
        .scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      const mpp = (40075016.686 * Math.cos((pose.lonlat[1] * Math.PI) / 180)) / (512 * 2 ** map.getZoom());
      // readable on screen, but never taller than the room: below the next floor up (pose.maxM, from app.js)
      const tall = Math.min(MAX_M, pose.maxM ?? MAX_M, Math.max(MIN_M, TARGET_PX * mpp));
      fig.scale.setScalar(tall * (hover ? 1.12 : 1));
      fig.rotation.y = -pose.heading; // heading: radians clockwise from north; the figure's front is -z (north)
      marker.scale.setScalar(Math.min(pose.maxMarkerScale ?? Infinity, Math.max(0.6, MARKER_PX * mpp)));
      marker.rotation.y = -(pose.facing ?? pose.heading); // the phone's compass, when it is on
      swingLimbs(pose.walking ? Math.sin(pose.phase) * 0.6 : 0);
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(model);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };

  return {
    layer,
    setVisible(on) { visible = on; map?.triggerRepaint(); },
    /** Place the figure: lonlat, alt (m above ground), heading (rad clockwise from north), walking, phase (leg cycle). */
    setPose(p) { pose = p; map?.triggerRepaint(); },
    get pose() { return pose; },
    /** Figure height in metres at the current zoom (it keeps a readable size on screen). */
    get heightM() { return fig.scale.x; },
    clear() { pose = null; map?.triggerRepaint(); },
    /** Hover feedback; returns true when the point is on the figure. */
    setHover(point) {
      const on = this.hit(point);
      if (on !== hover) { hover = on; map?.triggerRepaint(); }
      return on;
    },
    /** Whether a screen point (CSS px) is on the shown figure. */
    hit(point) {
      if (!visible || !pose || !map) return false;
      const c = map.getCanvas();
      const x = (point.x / c.clientWidth) * 2 - 1, y = 1 - (point.y / c.clientHeight) * 2;
      const inv = camera.projectionMatrix.clone().invert();
      const near = new THREE.Vector3(x, y, -1).applyMatrix4(inv), far = new THREE.Vector3(x, y, 1).applyMatrix4(inv);
      fig.updateMatrixWorld(true);
      return new THREE.Raycaster(near, far.sub(near).normalize()).intersectObject(hitMesh, false).length > 0;
    },
  };
}

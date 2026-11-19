// Landmark exterior model (glTF from scripts/build_landmark.py) drawn as a MapLibre custom 3D layer.
// Two looks: an opaque glass tower, and a see-through shell (edges only) that reveals the indoor route.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const MULLION_M = 1.5; // glass panel width; scripts/build_landmark.py uses the same value

// One facade tile = one panel wide x one storey tall (model UVs are in metres, see build_landmark.py).
// Tiles are greyscale and get multiplied by each part's OSM colour (vertex colours).
// The floor line is the strongest mark in every style so storeys stay countable from a distance.
const FACADE_STYLES = {
  // curtain wall: clear glass, faint mullion, dark spandrel band at each floor slab
  glass: { widthM: MULLION_M, draw(g, w, h) {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#ffffff"); sky.addColorStop(1, "#dfe4e8");
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = "#b9c0c4"; g.fillRect(0, 0, 2, h);                  // mullion (faint: avoids moire)
    g.fillStyle = "#4d5560"; g.fillRect(0, h * 0.82, w, h * 0.18);    // spandrel at the slab
    g.fillStyle = "#2c323a"; g.fillRect(0, h - 3, w, 3);              // slab edge
  } },
  // masonry (30 Rock limestone, concrete parapets): pier on the left, one punched window per storey
  masonry: { widthM: 3.0, draw(g, w, h) {
    g.fillStyle = "#f1ece2"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#5c636b"; g.fillRect(w * 0.3, h * 0.18, w * 0.6, h * 0.58); // window
    g.fillStyle = "#d9d1c3"; g.fillRect(0, 0, w * 0.18, h);                   // pier
    g.fillStyle = "#a79d8c"; g.fillRect(0, h - 3, w, 3);                      // floor line
  } },
  // metal (spires, fins): plain panels with a seam per storey
  metal: { widthM: 3.0, draw(g, w, h) {
    g.fillStyle = "#e9ebed"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#9da3a8"; g.fillRect(0, h - 2, w, 2);
  } },
  // brick (St. Paul's Chapel, Buell Hall, Avery Hall): running-bond courses, stone sill and lintel, one window
  brick: { widthM: 3.0, draw(g, w, h) {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#cfc9c0";                                   // mortar joints (the vertex colour tints the brick)
    const course = h / 16;
    for (let r = 0; r < 16; r++) {
      g.fillRect(0, r * course, w, 1);
      const off = r % 2 ? w / 4 : 0;
      for (let x = off; x < w; x += w / 2) g.fillRect(x, r * course, 1, course);
    }
    g.fillStyle = "#4f565e"; g.fillRect(w * 0.3, h * 0.22, w * 0.42, h * 0.5);  // window
    g.fillStyle = "#f4efe6"; g.fillRect(w * 0.26, h * 0.72, w * 0.5, 3);        // stone sill
    g.fillRect(w * 0.26, h * 0.19, w * 0.5, 4);                                // stone lintel
  } },
  // Avery Hall (sourced facade): UVs are already in tiles, one bay wide and one storey tall (tiled: true)
  brick_arched: { widthM: 1, tiled: true, draw(g, w, h) {
    brickCourses(g, w, h);
    g.fillStyle = "#4b525a";                                       // arched window
    g.fillRect(w * 0.3, h * 0.28, w * 0.4, h * 0.5);
    g.beginPath(); g.arc(w * 0.5, h * 0.28, w * 0.2, Math.PI, 0); g.fill();
    g.fillStyle = "#f2ede3";
    g.fillRect(w * 0.27, h * 0.78, w * 0.46, 3);                  // stone sill
    g.fillRect(w * 0.47, h * 0.06, w * 0.06, h * 0.06);           // keystone
  } },
  brick_window: { widthM: 1, tiled: true, draw(g, w, h) {
    brickCourses(g, w, h);
    g.fillStyle = "#4b525a"; g.fillRect(w * 0.32, h * 0.22, w * 0.36, h * 0.55);
    g.fillStyle = "#f2ede3"; g.fillRect(w * 0.29, h * 0.77, w * 0.42, 3); g.fillRect(w * 0.29, h * 0.18, w * 0.42, 4);
  } },
  // limestone (bands, cornices, columns) and the campus's stairs and walls: plain with faint coursing
  stone: { widthM: 1.2, draw(g, w, h) {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e3ded5"; for (let r = 1; r < 4; r++) g.fillRect(0, (r * h) / 4, w, 1);
  } },
  hardscape: { widthM: 1.2, draw(g, w, h) {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e6e1d8"; for (let r = 1; r < 4; r++) g.fillRect(0, (r * h) / 4, w, 1);
  } },
  tree: { widthM: 4.0, draw(g, w, h) { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); } },
  water: { widthM: 4.0, draw(g, w, h) { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); } },
  // ground (campus terrain from scripts/build_terrain.py): plain; vertex colours mark paving vs walls
  ground: { widthM: 4.0, draw(g, w, h) {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  } },
  // roof (domes, pitched roofs): plain, with faint courses of tile or seams
  roof: { widthM: 1.5, draw(g, w, h) {
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#dedad3";
    for (let r = 0; r < 8; r++) g.fillRect(0, r * (h / 8), w, 1);
  } },
};

function brickCourses(g, w, h) {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#cfc9c0";
  const course = h / 24;
  for (let r = 0; r < 24; r++) {
    g.fillRect(0, r * course, w, 1);
    for (let x = r % 2 ? w / 8 : 0; x < w; x += w / 4) g.fillRect(x, r * course, 1, course);
  }
}

// Textures are shared by every landmark layer (11 can be on the map at once); materials are not: see-through mode
// changes one landmark's materials only
const TEXTURES = new Map();
function facadeTexture(style, floorM, anisotropy) {
  const key = `${style}|${floorM}|${anisotropy}`;
  if (TEXTURES.has(key)) return TEXTURES.get(key);
  const c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  FACADE_STYLES[style].draw(c.getContext("2d"), c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / FACADE_STYLES[style].widthM, FACADE_STYLES[style].tiled ? 1 : 1 / floorM);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  TEXTURES.set(key, t);
  return t;
}

/** One material per facade style; glTF material names (glass / masonry / metal) pick the style. */
export function facadeMaterials(floorM, anisotropy = 8) {
  return Object.fromEntries(Object.keys(FACADE_STYLES).map((style) => [style, new THREE.MeshStandardMaterial({
    vertexColors: true, map: facadeTexture(style, floorM, anisotropy),
    metalness: style === "metal" ? 0.3 : 0.05, roughness: style === "glass" ? 0.6 : 0.85, // matte: big flat faces glare otherwise
    side: THREE.DoubleSide,
  })]));
}

const SOLID = new Set(["ground", "hardscape", "water"]);
// One three.js renderer per map (WebGL context), shared by all landmark layers: one set of compiled shaders
const RENDERERS = new WeakMap();
// Neighbouring buildings (Columbia's campus) are fetched once the camera is this close; the landscape detail file
// once it is within detailMinZoom. Farther out the map's own city buildings stand in.
const CONTEXT_MIN_ZOOM = 14;
const NEAR_M = 2500; // ... and the camera is looking at a point this close to the landmark

export function createLandmarkLayer(maplibregl, { id, url, origin, floorM, contextUrl = null, detailUrl = null, detailMinZoom = 16, companion = null, createModel = null }) {
  const mc = maplibregl.MercatorCoordinate.fromLngLat(origin, 0);
  const originLngLat = new maplibregl.LngLat(origin[0], origin[1]);
  const s = mc.meterInMercatorCoordinateUnits();
  // model frame: x east, y up, z south (metres) -> Mercator (x east, y south, z up)
  const modelMatrix = new THREE.Matrix4()
    .makeTranslation(mc.x, mc.y, mc.z)
    .scale(new THREE.Vector3(s, -s, s))
    .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));

  const camera = new THREE.Camera();
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa39d8c, 2.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(0.6, 1, 0.8); // from the south-east, high
  scene.add(sun);

  let shells = {};
  const edges = new THREE.LineBasicMaterial({ color: 0x2f3b48, transparent: true, opacity: 0.25 });

  let map, renderer, root, companionRoot, detailRoot = null, ready = false, seeThrough = false, muted = false, visible = true, far = false;
  let coarseGround = null, fineGround = null, contextLoaded, modelLoaded, loader, prepare, contextAsked = false, detailAsked = false;
  // resolves when the neighbouring buildings are drawn (at once when there are none): the map then hides its own boxes
  const contextReady = new Promise((r) => { contextLoaded = r; });
  if (!contextUrl) contextLoaded();
  // resolves when the landmark itself is drawn: the map then flattens its plain box
  const loaded = new Promise((r) => { modelLoaded = r; });
  const FACADE_MIN_ZOOM = 15; // farther out, facades are plain masses: no window texture (no moire, less sampling)
  const meshes = [];
  const modelMaterials = new Set();

  function applyLook() {
    for (const [style, shell] of Object.entries(shells)) {
      if (SOLID.has(style) && !muted) continue; // the ground, its stairs, walls and water stay solid: the route stands on them
      shell.transparent = seeThrough || muted;
      shell.opacity = muted ? 0.05 : seeThrough ? 0.1 : 1;
      shell.depthWrite = !seeThrough && !muted; // the indoor floors and route behind it must stay visible
      shell.needsUpdate = true;
    }
    for (const material of modelMaterials) {
      material.opacity = muted ? .05 : seeThrough ? (material.userData.seeThroughOpacity ?? .1)
        : (material.userData.outsideOpacity ?? 1);
      material.transparent = material.opacity < 1;
      material.depthWrite = !material.transparent;
      material.needsUpdate = true;
    }
    edges.opacity = muted ? 0.05 : seeThrough ? 0.55 : 0.22;
    map?.triggerRepaint();
  }

  const layer = {
    id, type: "custom", renderingMode: "3d",
    onAdd(m, gl) {
      map = m;
      renderer = RENDERERS.get(gl);
      if (!renderer) {
        renderer = new THREE.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: true });
        renderer.autoClear = false;
        RENDERERS.set(gl, renderer);
      }
      shells = facadeMaterials(floorM, renderer.capabilities.getMaxAnisotropy());
      loader = new GLTFLoader();
      // the neighbours in a landmark's own context file stay barely there, like the rest of the city in 3D
      const faintShells = {};
      const faintEdges = new THREE.LineBasicMaterial({ color: 0x2f3b48, transparent: true, opacity: 0.1 });
      const faint = (m) => (faintShells[m.uuid] ||= Object.assign(m.clone(), { transparent: true, opacity: 0.07, depthWrite: false }));
      prepare = (scene3d, isDetail, isContext = false) => scene3d.traverse((o) => {
          if (!o.isMesh) return;
          // shared-vertex meshes (ground, trees) come without normals to save bytes: smooth ones are computed here
          if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
          if (o.material.name === "ground") {
            if (isDetail) fineGround = o; else coarseGround = o; // two ground levels of detail: 2 m first, 1 m close in
          }
          if (o.material.name === "ground" && o.material.map) {
            // the campus ground brings its own paving texture (scripts/build_landmark.py); keep it, lit like the rest
            o.material.side = THREE.DoubleSide;
            o.material.vertexColors = true;
            o.material.roughness = 1; o.material.metalness = 0;
            if (shells.ground?.map) o.material = shells.ground; // both ground files share one material
            else shells.ground = o.material;
          } else {
            o.material = shells[o.material.name] || shells.glass;
          }
          if (o.material !== shells.ground && !isDetail) meshes.push(o); // clicking the ground or a tree is not clicking the building
          if (isContext && o.material !== shells.ground) o.material = faint(o.material);
          // ground: outline only real breaks (retaining walls, stair risers, the edge skirt), not gentle slopes
          if (o.material !== shells.tree && o.material !== shells.water) { // trees and water: no outlines
            o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, o.material === shells.ground ? 60 : 25), isContext ? faintEdges : edges));
          }
        });
      const attach = (model) => {
        root = model;
        if (createModel) root.traverse((object) => {
          if (!object.isMesh) return;
          meshes.push(object);
          for (const material of [object.material].flat()) modelMaterials.add(material);
        });
        else prepare(root, false);
        scene.add(root);
        if (companion) {
          companionRoot = companion({ origin: mc, scale: s });
          scene.add(companionRoot);
        }
        ready = true;
        applyLook();
        modelLoaded();
        m.triggerRepaint();
      };
      if (createModel) Promise.resolve().then(() => createModel(loader, url)).then(attach, () => modelLoaded());
      else loader.load(url, (gltf) => attach(gltf.scene), undefined, () => modelLoaded());
    },
    render(gl, matrix) {
      if (!ready || !visible) return;
      const z = map.getZoom();
      // neighbouring buildings, then the landscape detail (fine ground, trees, stairs, walls, fountains), only close in
      const near = (contextUrl || detailUrl) && z >= CONTEXT_MIN_ZOOM && map.getCenter().distanceTo(originLngLat) < NEAR_M;
      if (contextUrl && !contextAsked && near) {
        contextAsked = true;
        loader.load(contextUrl, (c) => { prepare(c.scene, false, true); scene.add(c.scene); contextLoaded(); map.triggerRepaint(); },
          undefined, () => contextLoaded());
      }
      if (detailUrl && !detailAsked && near && z >= detailMinZoom) {
        detailAsked = true;
        contextReady.then(() => loader.load(detailUrl, (d) => { // after the campus: it is the bigger, later need
          detailRoot = d.scene;
          prepare(detailRoot, true);
          scene.add(detailRoot);
          map.triggerRepaint();
        }));
      }
      if (detailRoot) detailRoot.visible = z >= detailMinZoom; // level of detail: far away, masses only
      if (coarseGround) coarseGround.visible = !(fineGround && z >= detailMinZoom);
      if ((z < FACADE_MIN_ZOOM) !== far) {
        far = !far;
        for (const [style, shell] of Object.entries(shells)) {
          if (style === "ground") continue;
          if (!shell.userData.map) shell.userData.map = shell.map;
          shell.map = far ? null : shell.userData.map;
          shell.needsUpdate = true;
        }
      }
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(modelMatrix);
      renderer.resetState();
      renderer.render(scene, camera);
    },
  };

  return {
    layer,
    get ready() { return ready; },
    loaded,
    contextReady,
    get seeThrough() { return seeThrough; },
    setSeeThrough(on) { seeThrough = on; applyLook(); },
    setVisible(on) { visible = on; map?.triggerRepaint(); },
    /** Another building, while a route is on: barely there. */
    setMuted(on) { if (on !== muted) { muted = on; applyLook(); } },
    /** True when the screen point (CSS px) hits the model. */
    hit(point, part = "building") {
      if (!ready || !visible || (part === "companion" && !companionRoot)) return false;
      const c = map.getCanvas();
      const x = (point.x / c.clientWidth) * 2 - 1, y = 1 - (point.y / c.clientHeight) * 2;
      const inv = camera.projectionMatrix.clone().invert();
      const near = new THREE.Vector3(x, y, -1).applyMatrix4(inv);
      const far = new THREE.Vector3(x, y, 1).applyMatrix4(inv);
      const ray = new THREE.Raycaster(near, far.sub(near).normalize());
      const [building] = ray.intersectObjects(meshes, false);
      if (part !== "companion") return Boolean(building);
      const [companionHit] = ray.intersectObject(companionRoot, true);
      return Boolean(companionHit && (!building || companionHit.distance < building.distance));
    },
  };
}

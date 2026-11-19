// Hudson Yards as built in the station guide (the folder served at ./v2): the 34 St–Hudson Yards station, the park over it,
// Vessel and its square, and Edge with 30 Hudson Yards and The Shops, drawn on the city map as one MapLibre custom 3D layer.
//
// How: the station guide writes its scene as a module too (../hy-scene.js and ../28st-scene.js in this project, generated from the same parts as their pages). This
// layer imports that module and draws its scene with the map's camera. Nothing is copied or exported, so the map shows what
// the guide shows; no page is opened behind the map, and the module uses the map's own copy of three.js (index.html's import
// map points the guide's copy at it: the two files are the same). Trains are not part of the scene here; water and the lift stand still.
//
// Loading: nothing is fetched until the map, in 3D, looks at this place from within the middle band; from further off the city's
// own buildings stand for it. Display by distance: each frame the layer works out how far the map is looking from (camera to the
// centre of the view, in metres) and tells the scene which band that is; the scene shows the parts that belong to it
// (station guide: tools/hy_parts/station.js, setTier). Far: the landmarks alone. Middle: also the park's green shapes, trees
// and entrances. The station under the street shows only when the place is cut open (setOpen). Near: also the ground with its paving, kerbs, crossings, signals, lamps, benches.
// A place's frame (each scene module's own): origin [lon, lat] and the bearing of its +x axis in degrees east of north; +z to its right, y up (metres).

const NEAR_M = 800, MID_M = 2500, LOAD_M = 3000;                       // viewing distances (m): a block or two across · a few blocks · start loading

// Any place built this way: module = the place's scene module (it exports buildWorld), origin and bearing = its frame on the map.
export function createPlaceLayer(maplibregl, { id, module, origin: ORIGIN, bearing, night = false }) {
  const BEARING = bearing * Math.PI / 180;
  let map, gl, T, scene, renderer, camera, L, world, started = false, ready = false, visible = true, failed = false, level = -1, done, ms = 0, open = false, held = false, shown = '', levelId = null, onState = null, fp = null, pcam = null, above = null, sky = null, fpT = 0, lastM = null;
  const emit = () => onState?.();
  const loaded = new Promise((r) => { done = r; });
  const start = async () => {
    started = true;
    const t0 = performance.now();
    try {
      const { buildWorld } = await import(module);
      world = await buildWorld({ night });                      // the map's scene (day or night), not the device's own setting
      T = world.THREE; scene = world.scene;
      world.onChange?.(() => map.triggerRepaint());             // the scene laid something it had left for later (its paving): draw again
      const mc = maplibregl.MercatorCoordinate.fromLngLat(ORIGIN, 0), s = mc.meterInMercatorCoordinateUnits(), sin = Math.sin(BEARING), cos = Math.cos(BEARING), y0 = world.street;
      // guide (x, y, z) -> Mercator (x east, y south, z up): the street level of the guide stands on the map's ground
      L = new T.Matrix4().set(
        s * sin, 0, s * cos, mc.x,
        -s * cos, 0, s * sin, mc.y,
        0, s, 0, mc.z - s * y0,
        0, 0, 0, 1);
      camera = new T.Camera(); sky = new T.Color(night ? "#101216" : "#eef0f1");
      ms = Math.round(performance.now() - t0);
      ready = true; done(true); map?.triggerRepaint(); emit();
    } catch (e) { console.error(`${id}: the scene could not be built`, e); failed = true; done(false); }
  };
  // The trip's band, its ends and the train are the station page's own (the scene module runs the page's functions). Seen from above
  // on the map the band is made wider by k, because the map looks from much further off than the page's overview; walked, k is 1.
  let tripNow = null, bandK = 1, lastT = 0, filmDt = null, fpInside = false;
  const kNow = () => (fp ? 1 : Math.max(1, Math.min(40, 7 * (78271.517 * Math.cos(map.getCenter().lat * Math.PI / 180) / 2 ** map.getZoom()) / 0.6)));
  const showRoute = (opts) => { if (!ready) return; tripNow = opts ? (({ train, dest, via, rev }) => ({ train, dest, via, rev }))(opts) : null;
    bandK = kNow(); world.trip.band(Boolean(tripNow), night, tripNow, bandK); map.triggerRepaint(); };
  // The page's own name labels (entrances, mezzanines, escalators, "You get off here"), placed over the map by the page's rule:
  // cut open (the page's overview) all of them; walked, only the name of the way out being walked to; otherwise none.
  let box = null;
  const placeLabels = (M, mode) => {
    const L = world.trip.labels?.(); if (!L) return;
    if (!box) { box = document.createElement("div"); box.className = "v2-labels"; map.getContainer().appendChild(box); for (const l of L) box.appendChild(l.el); }
    const w = box.clientWidth, h = box.clientHeight, you = world.trip.youLabel(), v = new T.Vector4();
    for (const l of L) {
      let show = mode === "open" ? (l !== you || world.trip.phase() !== "arriving") : mode === "fp" ? l.kind === "exit" && l.id === tripNow?.dest && !(fp && Math.hypot(l.pos.x - fp.pos[0], l.pos.y - fp.pos[1], l.pos.z - fp.pos[2]) < 80) : false;   // not once the walker has arrived there: the name would hang in the air
      if (show) { v.set(l.pos.x, l.pos.y, l.pos.z, 1).applyMatrix4(M); show = v.w > 0 && Math.abs(v.x / v.w) < 1.1 && Math.abs(v.y / v.w) < 1.1; }
      l.el.style.display = show ? "" : "none";
      if (show) l.el.style.transform = `translate(-50%,-50%) translate(${((v.x / v.w + 1) / 2 * w).toFixed(1)}px,${((1 - v.y / v.w) / 2 * h).toFixed(1)}px)`;
    }
  };
  // a point of the scene (x along the platform, z to its right, metres) as a place on the map, and a direction in it as a map bearing
  const lngLat = (x, z) => { const mc = maplibregl.MercatorCoordinate.fromLngLat(ORIGIN, 0), s = mc.meterInMercatorCoordinateUnits(), sin = Math.sin(BEARING), cos = Math.cos(BEARING);
    return new maplibregl.MercatorCoordinate(mc.x + s * (sin * x + cos * z), mc.y + s * (-cos * x + sin * z), 0).toLngLat(); };
  const bearingOf = (dx, dz) => bearing + Math.atan2(dz, dx) * 180 / Math.PI;

  // how far the map is looking from, and how far the middle of the view is from this place (metres)
  const viewing = () => {
    const c = map.getCenter(), k = Math.cos(c.lat * Math.PI / 180);
    return { d: map.transform.cameraToCenterDistance * 78271.517 * k / 2 ** map.getZoom(),
      off: Math.hypot((c.lng - ORIGIN[0]) * 111320 * k, (c.lat - ORIGIN[1]) * 110540) };
  };

  const layer = {
    id, type: "custom", renderingMode: "3d",
    onAdd(m, context) { map = m; gl = context; },
    render(_gl, matrix) {
      if (!visible) return;
      const v = viewing();
      if (!started) { if (v.d < LOAD_M && v.off < Math.max(1200, v.d)) start(); return; }
      if (!ready) return;
      if (!renderer) {
        renderer = new T.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
        renderer.autoClear = false; renderer.shadowMap.enabled = false;
        renderer.localClippingEnabled = true;                    // the guide cuts a building's inside off above the floor looked at
      }
      const tNow = performance.now(), dt = filmDt ?? Math.min(0.05, (tNow - (lastT || tNow)) / 1000); lastT = tNow;   // filmDt: a fixed step of time per frame drawn (a film is taken frame by frame)
      if (tripNow || fp) world.trip.tick(dt, fp ? fp.pos : null);                   // the page's own step: the chevrons travel, the train comes in, its doors open
      if (fp) {                                                 // a first-person view: the scene alone, from the walker's eye, over the whole map
        if (shown !== "fp") { shown = "fp"; world.setTier(2, false, true); }
        const c = map.getCanvas();
        pcam ??= new T.PerspectiveCamera(68, 1, 0.1, 14000);
        pcam.aspect = c.width / c.height; pcam.fov = fp.fov || 68; pcam.updateProjectionMatrix();          // (fov: a film may look closer)
        pcam.position.set(fp.pos[0], fp.pos[1], fp.pos[2]); pcam.rotation.set(fp.pitch, fp.yaw, 0, "YXZ");
        scene.background = sky;
        renderer.resetState(); renderer.clear(true, true, true); renderer.render(scene, pcam); renderer.resetState();
        scene.background = null;
        pcam.updateMatrixWorld(); placeLabels(new T.Matrix4().multiplyMatrices(pcam.projectionMatrix, pcam.matrixWorldInverse), "fp");
        map.triggerRepaint();                                   // a first-person view keeps drawing: the chevrons move even standing still
        return;
      }
      const now = v.d <= NEAR_M ? 2 : v.d <= MID_M ? 1 : 0;
      // (not while the map is on its way in: a place opened from afar stays open until the move ends)
      if (now === 0 && (open || levelId) && !held && !map.isMoving()) { open = false; levelId = null; world.trip.showInside(null); emit(); }   // looked at from afar again: a place opened by "See layout" closes
      if (`${now}${open}` !== shown) { level = now; shown = `${now}${open}`; world.setTier(level, open); }
      camera.projectionMatrix = new T.Matrix4().fromArray(matrix).multiply(L); lastM = camera.projectionMatrix;
      if (tripNow) { const k = kNow(); if (Math.abs(k / bandK - 1) > 0.12) { bandK = k; world.trip.band(true, night, tripNow, k); } map.triggerRepaint(); }   // a trip in view keeps drawing, as on the page
      placeLabels(lastM, open ? "open" : "none");
      renderer.resetState();
      renderer.render(scene, camera);
      renderer.resetState();
    },
  };
  return { layer, loaded, get ready() { return ready; }, get failed() { return failed; }, get started() { return started; }, get level() { return level; }, get ms() { return ms; },
    setVisible(on) { visible = on; map?.triggerRepaint(); },
    // for the trip card: build the scene now if it is not there yet, then hand over the station's trip interface
    async trips() { if (!started) start(); return (await loaded) ? world.trip : null; },
    // cut the place open (the station under the street is shown, the ground's lid is not) or close it. hold: keep it so at any
    // distance (a trip is on); without hold it closes by itself when the map looks from afar again
    // day or night changed on the map: the same scene, relit; nothing is built again
    setNight(n) { night = Boolean(n); sky?.set(night ? "#101216" : "#eef0f1"); if (ready) { world.setNight?.(night);
        // relighting runs the page's own night step, which sets the tower and what shows at each distance as for the page's overview:
        // put back what this map was showing (the walk's tower as built with all its near parts, or the level cut open)
        shown = ""; if (fp) world.trip.walkMode(true, fpInside); else if (levelId) this.setLevel(levelId);
        bandK = fp ? 1 : kNow(); world.trip.band(Boolean(tripNow), night, tripNow, bandK); } map?.triggerRepaint(); },
    set filmDt(v) { filmDt = v; },
    // a walked view covers the whole map: whenever the page reorders its layers, this one goes back on top, or the map's own city
    // (drawn from the map's camera, see-through) lies over the walker's picture like a ghost
    keepOnTop() { if (fp && map?.getLayer(id)) map.moveLayer(id); },
    setOpen(on, hold = false) { open = on; held = on && hold; levelId = null; world?.trip.showInside(null); map?.triggerRepaint(); emit(); },
    // The level switch. One level of the place is the one looked at: under the street the place is cut open; a floor of the tower
    // opens the tower and cuts it off above that floor; the street closes both. focusLevel also moves the map to that level.
    levels() { return ready ? world.trip.levels() : []; },
    setLevel(id, hold = held) { const l = this.levels().find((x) => x.id === id); if (!l) return null;
      levelId = id; open = l.y < world.street - 1; held = hold; world.trip.showInside(l.inside ? l.y : null); map.triggerRepaint(); emit(); return l; },
    focusLevel(id) { const l = this.setLevel(id); if (l) map.easeTo({ center: lngLat(l.at[0], l.at[1]), zoom: l.rel > 100 ? 15.7 : l.inside ? 17.3 : 17.4, pitch: 55, ...(l.inside ? { bearing: bearing + 180 } : {}), duration: 1000 }); },   // (a floor of the tower is looked at from the north: from the south the next tower stands in the way)   // a floor high in a tower: from far enough to see the tower whole
    get levelId() { return levelId; }, set onState(fn) { onState = fn; },
    get world() { return world; },                              // for checks
    // First-person view (walk, door): pose = { pos: [x, y, z], yaw, pitch } in the scene's metres, or null to give the map back.
    // While it is on, this layer is drawn last and fills the map; the map's own gestures are off so a drag can look around.
    setFP(pose, { inside = false, trip = null } = {}) {
      if (!ready) return;
      if (pose && !fp) {
        const order = map.style?._order ?? [], i = order.indexOf(id); above = i >= 0 ? order[i + 1] ?? null : null;   // the layer drawn next (the style's own list leaves custom layers out, so the map's drawing order is read)
        map.moveLayer(id); document.body.classList.add("fp-on"); fpInside = inside; world.trip.walkMode(true, inside);
        if (trip) tripNow = (({ train, dest, via, rev }) => ({ train, dest, via, rev }))(trip);
        bandK = 1; world.trip.band(true, night, tripNow, 1);    // walked: the band at the page's own width
        for (const h of ["dragPan", "dragRotate", "scrollZoom", "touchZoomRotate", "doubleClickZoom", "keyboard"]) map[h].disable();
      } else if (!pose && fp) {
        if (above && map.getLayer(above)) map.moveLayer(id, above);   // back where it was drawn before; with nothing after it, it stays last
        document.body.classList.remove("fp-on"); world.trip.walkMode(false); shown = "";
        for (const h of ["dragPan", "dragRotate", "scrollZoom", "touchZoomRotate", "doubleClickZoom", "keyboard"]) map[h].enable();
      }
      const was = Boolean(fp); fp = pose;
      if (was && !fp) { bandK = kNow(); world.trip.band(Boolean(tripNow), night, tripNow, bandK); }   // back above: the band at the map's width again
      map.triggerRepaint();
    },
    get fp() { return Boolean(fp); },
    // Which of the place's things a tap on the map falls on (a point in the map's own pixels): the id the scene gives it, or null.
    // A ray from the eye through that point, tried against what is drawn; the nearest thing hit wins.
    pick(point) {
      if (!ready || fp || !lastM || !world.picks) return null;
      const c = map.getCanvas(), x = point.x / c.clientWidth * 2 - 1, y = 1 - point.y / c.clientHeight * 2, inv = lastM.clone().invert();
      const a = new T.Vector3(x, y, -1).applyMatrix4(inv), b = new T.Vector3(x, y, 1).applyMatrix4(inv), rc = new T.Raycaster(a, b.sub(a).normalize());
      const shown = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
      let best = null;
      for (const [pid, obj] of world.picks) { const h = rc.intersectObject(obj, true).find((q) => shown(q.object)); if (h && (!best || h.distance < best.d)) best = { id: pid, d: h.distance }; }
      return best?.id ?? null;
    },
    setTrain(on, train) { if (ready) { world.trip.setTrain(on, train); map.triggerRepaint(); } },
    // how the train stands: "arrive" (comes in, doors open, the band is laid out), "open" (in, doors opening), "ready" (in, doors open)
    arrive(how) { if (ready && tripNow) { world.trip.arrive(how); map.triggerRepaint(); } },
    get phase() { return ready ? world.trip.phase() : "ready"; },
    get open() { return open; }, get street() { return world?.street; },
    showRoute, lngLat, bearingOf };
}

// The two places built so far: 34 St–Hudson Yards (with the park, Vessel and Edge) and 28 St (R W).
export const createHYWorldLayer = (maplibregl, o = {}) => createPlaceLayer(maplibregl, { id: "hy-world", module: "../hy-scene.js", origin: [-74.001918, 40.755884], bearing: 29, ...o });
export const create28StLayer = (maplibregl, o = {}) => createPlaceLayer(maplibregl, { id: "st28-world", module: "../28st-scene.js", origin: [-73.98869258, 40.74550858], bearing: 8.2466, ...o });

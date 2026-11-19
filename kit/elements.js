// Element kit: every 3D element of the guide, built once and reused at every station.
// Sizes come from design/dimension-sheet.md; `trust` repeats that sheet's levels:
// A official · B Wikipedia · E measured in photos (±15%) · D ordinary building dimensions, no source checked.
// Units are metres. Each builder returns a group standing on y = 0.
import * as THREE from '../vendor/three.module.min.js';
import { BASE, ACCENTS, NIGHT, LINES, NQRW, CROWN, JOINTS } from './palette.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const bas = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });

function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export function createKit() {
  /* ───────── textures ───────── */
  const gridTex = tex(64, 64, (g, w, h) => {                    // faint tile joints, multiplied over the tile colour
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(60,50,30,.16)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
  const blobTex = tex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,.62)'); r.addColorStop(0.45, 'rgba(0,0,0,.36)'); r.addColorStop(0.8, 'rgba(0,0,0,.10)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  const glowTex = tex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(0.4, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  const chevTex = tex(96, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(w * 0.38, h * 0.26); g.lineTo(w * 0.62, h * 0.5); g.lineTo(w * 0.38, h * 0.74); g.stroke();
  });
  chevTex.wrapS = THREE.RepeatWrapping;
  const bullet = (g, x, y, r, letter, color, dark) => {
    g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = dark ? '#14171A' : '#ffffff'; g.font = `700 ${r * 1.25}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(letter, x, y + r * 0.06);
  };
  const signTex = (w, h, draw) => tex(w, h, (g) => {            // black sign with the white line along the top
    g.fillStyle = BASE.sign; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h * 0.07);
    g.fillStyle = '#ffffff'; g.textBaseline = 'middle'; draw(g, w, h);
  });

  /* ───────── materials ───────── */
  const m = {
    tile: lam(BASE.tile), tileGrid: null, floor: lam(BASE.floor), band: lam(BASE.band), steel: lam(BASE.steel), dark: lam(BASE.darkSteel),
    sign: lam(BASE.sign), edge: lam(BASE.edge), tan: lam(BASE.tan), white: lam('#ffffff'),
    col: lam(ACCENTS.blue.col), tab: lam(ACCENTS.blue.tab), topBand: lam(ACCENTS.blue.band),
    glass: lam(BASE.glass, { transparent: true, opacity: 0.3, depthWrite: false }),
    rFill: bas(BASE.routeFill), rEdgeIn: bas(BASE.routeEdgeOnBright), rEdgeOut: bas(BASE.routeEdgeOnBright),
    chev: bas('#ffffff', { map: chevTex, transparent: true, depthWrite: false }),
    target: bas(BASE.routeFill, { transparent: true, opacity: 0.3, depthWrite: false }),
    shadow: bas('#000000', { map: blobTex, transparent: true, depthWrite: false }),
    // outdoors: these are the only materials night changes
    oWalk: lam(BASE.floor), oRoad: lam(BASE.road), oStripe: lam('#ffffff'), oStreet: lam(BASE.street), oSteel: lam(BASE.steel),
    // nearby buildings: translucent blocks, no outline; the light sits to the viewer's left, so the shading follows the view
    oBldgTop: bas(BASE.steel, { transparent: true, opacity: 0.10, side: THREE.DoubleSide }),
    oBldgSide: ['+x', '-x', '+z', '-z'].map(() => bas(BASE.steel, { transparent: true, opacity: 0.2 })),   // shaded per frame (setView); they write depth, so blocks hide each other instead of piling up as haze
    oLine: new THREE.LineBasicMaterial({ color: BASE.steel }),
    oShell: lam(BASE.tile, { transparent: true, opacity: 0.22, depthWrite: false }),
    oWin: bas(NIGHT.window, { transparent: true, opacity: 0, depthWrite: false }),
    oGlobeTop: lam(BASE.street), oGlobeBot: lam('#ffffff'), oSignal: lam(BASE.street),
    oHalo: new THREE.SpriteMaterial({ map: glowTex, color: NIGHT.globe, transparent: true, opacity: 0, depthWrite: false }),
    oPool: bas(NIGHT.lamp, { map: glowTex, transparent: true, opacity: 0, depthWrite: false }),
    // street planting and masonry: palette colours only (foliage = the street green, trunk and stone = the band grey, soil = dark steel)
    oLeaf: lam(BASE.leaf, { flatShading: true }), oTrunk: lam(BASE.band), oSoil: lam(BASE.darkSteel), oStone: lam(BASE.band),
    // street paving, by the same faint-grid method: sidewalk = concrete flags 1.5 m square (5 ft scoring); park = pavers 0.6 × 0.3 m;
    // roadway = plain; kerb = granite, the stone grey. Set after the textures exist (see below).
    oFlag: null, oPlaza: null, oSlat: null, oGranite: null, oSparkle: null, oGraniteDark: null,
    oCopper: new THREE.MeshPhongMaterial({ color: BASE.copper, shininess: 60, specular: new THREE.Color(0x3a2a20), side: THREE.DoubleSide, flatShading: true }),   // Vessel's underside: the palette's copper, with a soft shine
    oVTop: lam(BASE.floor, { side: THREE.DoubleSide }), oVDark: lam(BASE.darkSteel, { side: THREE.DoubleSide }), oVGlass: lam(BASE.glass, { transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }), oVCap: new THREE.LineBasicMaterial({ color: BASE.copper }), oVLight: bas(NIGHT.lamp, { transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, map: tex(8, 128, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.09, 'rgba(255,255,255,0.35)'); g.addColorStop(0.125, 'rgba(255,255,255,1)'); g.addColorStop(0.16, 'rgba(255,255,255,0.5)'); g.addColorStop(0.45, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }) }),   // Vessel's light strips: the night lamp colour, unseen by day
    oSpray: new THREE.LineBasicMaterial({ color: BASE.tile, transparent: true, opacity: 0.9 }),   // oSpray: fine lines of falling water
    wire: lam(BASE.steel, { transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }),   // wire: wire-mesh infill of a balustrade, drawn as a sheet one can see through
    oHill: lam(BASE.leaf),   // oHill: the mound's surface, smooth-shaded (the shrubs keep the faceted leaf material)
                           // oSlat: light wood in slats, for the park's benches (set below)
    oRail: lam(BASE.tile),                                       // the low rails round tree beds, planting beds and lawns: the tile white (owner, 2026-11-17: black stood out too much)
    oLampPost: lam(BASE.sign), oLantern: lam('#ffffff', { emissive: 0x000000 }), oSignalBody: lam(BASE.edge),   // park lamp: the sign black; signal heads: the palette's yellow
    oLampHalo: new THREE.SpriteMaterial({ map: glowTex, color: NIGHT.lamp, transparent: true, opacity: 0, depthWrite: false }),
    oWood: lam(BASE.tan), oWater: lam(BASE.glass, { transparent: true, opacity: 0.8 }),   // bench wood = the palette's tan; water = the glass colour, more solid
    lamp: bas('#ffffff'),                                        // a light fitting indoors: always lit
    // the glass entrance canopy at night: glow inside the shell, its lamps, the lit edge and halo of its sign, its bars
    nGlow: bas(NIGHT.lamp, { transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), nLamp: bas('#ffffff', { transparent: true, opacity: 0 }),
    nSign: bas(NIGHT.lamp, { transparent: true, opacity: 0 }), nHalo: bas(NIGHT.lamp, { transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
    nBars: new THREE.LineBasicMaterial({ color: BASE.darkSteel }),
  };
  const tileWorld = (() => { const t = gridTex.clone(); t.needsUpdate = true; t.repeat.set(1 / 0.108, 1 / 0.108); return lam(BASE.tile, { map: t }); })();
  // Paving and wall panels, drawn the same way as the tile joints: the faint grid over a palette colour, at the unit's real size.
  // paver 0.6 × 0.3 m on the floor colour (photos of 34 St–Hudson Yards, E); wall panel 0.9 × 0.3 m on the tile colour (porcelain
  // slabs, text + photos, E). `World` = for surfaces whose texture coordinates are in metres; `For` = for a face of a given size.
  const gridOn = (colour, rx, ry) => { const t = gridTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return lam(colour, { map: t }); };
  // Bench wood: light slats (photographs). No new colour: the palette's tan lightened half-way toward the tile colour; the
  // slats are the faint-grid lines, 2.4 m long and 7 cm wide.
  const WOOD = '#' + new THREE.Color(BASE.tan).lerp(new THREE.Color(BASE.tile), 0.5).getHexString();
  m.oSlat = gridOn(WOOD, 1 / 2.4, 1 / 0.07);
  m.oFlag = gridOn(BASE.floor, 1 / 1.5, 1 / 1.5); m.oPlaza = gridOn(BASE.floor, 1 / 0.6, 1 / 0.3);
  // Street paving shows its joints only near the viewer (palette: JOINTS); further off the same surface is plain. The plain
  // value is the pattern's own average, so the ground does not change brightness as the joints fade.
  // The park's two own pavements (the landscape architect's pavement types). No new colours: granite block pavers = the floor
  // colour half-way toward the band grey, blocks 0.3 × 0.15 m laid in courses; "sparkle" concrete = the floor
  // colour 0.45 of the way toward the tile colour, slabs 1.2 m square. Block and slab sizes are assumed.
  const GRANITE = '#' + new THREE.Color(BASE.floor).lerp(new THREE.Color(BASE.band), 0.5).getHexString(), SPARKLE = '#' + new THREE.Color(BASE.floor).lerp(new THREE.Color(BASE.tile), 0.4).getHexString();
  m.oGranite = gridOn(GRANITE, 1 / 0.3, 1 / 0.3); m.oGranite.polygonOffset = true; m.oGranite.polygonOffsetFactor = -2; m.oGranite.polygonOffsetUnits = -2;
  m.oSparkle = gridOn(SPARKLE, 1 / 0.6, 1 / 0.6);   // the three pavings by pattern (owner, 2026-11-17): plaza = small squares, light; round the mounds = small squares, dark; sidewalk = large squares
  // The fountain floors are the darker of the two granites: the floor colour 0.7 of the way toward the band grey (no new colour).
  const GRANITE_D = '#' + new THREE.Color(BASE.floor).lerp(new THREE.Color(BASE.band), 0.7).getHexString();
  m.oGraniteDark = gridOn(GRANITE_D, 1 / 0.3, 1 / 0.15); m.oGraniteDark.polygonOffset = true; m.oGraniteDark.polygonOffsetFactor = -2; m.oGraniteDark.polygonOffsetUnits = -2;
  m.oVPave = gridOn(SPARKLE, 1 / 0.6, 1 / 0.6); m.oVPave.side = THREE.DoubleSide;   // Vessel's landings: the plaza's small light squares; joints show only near, like all the paving
  for (const mat of [m.oFlag, m.oPlaza, m.oGranite, m.oSparkle, m.oGraniteDark, m.oVPave]) mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( 0.985 ), smoothstep( ${JOINTS.d0.toFixed(1)}, ${JOINTS.d1.toFixed(1)}, length( vViewPosition ) ) );
	diffuseColor *= sampledDiffuseColor;
#endif`);
  };
  const finish = {
    paverWorld: gridOn(BASE.floor, 1 / 0.6, 1 / 0.3), paverFor: (lenM, widM) => gridOn(BASE.floor, lenM / 0.6, widM / 0.3),
    panelWorld: gridOn(BASE.tile, 1 / 0.9, 1 / 0.3), panelFor: (lenM, hM) => gridOn(BASE.tile, lenM / 0.9, hM / 0.3),
    ceilingFor: (lenM, widM) => gridOn(BASE.tile, lenM / 1.5, widM / 1.5),
  };
  const tileMat = (lenM, hM) => {                                // 108 mm tile (E)
    const t = gridTex.clone(); t.needsUpdate = true; t.repeat.set(lenM / 0.108, hM / 0.108);
    const mm = lam(BASE.tile, { map: t }); return mm;
  };

  /* ───────── small builders ───────── */
  const box = (g, w, h, d, mat, x = 0, y = 0, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); b.position.set(x, y + h / 2, z); g.add(b); return b;
  };
  const cyl = (g, r, h, mat, x = 0, y = 0, z = 0, seg = 18) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); c.position.set(x, y + h / 2, z); g.add(c); return c;
  };
  const bar = (g, a, b, r, mat) => {                             // a round bar between two points
    const d = b.clone().sub(a), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), mat);
    c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); g.add(c); return c;
  };
  const face = (g, w, h, mat, x, y, z, ry = 0) => {              // an upright panel, centred at (x, y, z)
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(x, y, z); p.rotation.y = ry; g.add(p); return p;
  };
  const flat = (g, w, d, mat, x = 0, y = 0.012, z = 0, order = 1) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.renderOrder = order; g.add(p); return p;
  };
  const disc = (g, r, mat, x, y, z, order = 2, r0 = 0) => {
    const geo = r0 ? new THREE.RingGeometry(r0, r, 40) : new THREE.CircleGeometry(r, 40);
    const p = new THREE.Mesh(geo, mat); p.rotation.x = -Math.PI / 2; p.position.set(x, y, z); p.renderOrder = order; g.add(p); return p;
  };
  const ext = (g, pts, depth, mat, z = 0) => {                   // a side profile in x-y, extruded across z and centred on z
    const sh = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
    const e = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }), mat); e.position.z = z - depth / 2; g.add(e); return e;
  };
  const shadow = (g, w, d, x = 0, z = 0) => flat(g, w, d, m.shadow, x, 0.012, z, 1);
  const pic = (t) => bas('#ffffff', { map: t });
  const picT = (t) => bas('#ffffff', { map: t, transparent: true });

  /* ───────── route ───────── */
  function routeRibbon(pts, width, y, mat, rep = 0) {             // (was also called `ribbon`: the solid strip added later under the same name replaced it, and the route samples in the showroom failed)
    const pos = [], uv = [], idx = []; let dist = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
      if (i) dist += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const yy = y + (pts[i][2] || 0);
      pos.push(pts[i][0] + nx * width / 2, yy, pts[i][1] + nz * width / 2, pts[i][0] - nx * width / 2, yy, pts[i][1] - nz * width / 2);
      const u = rep ? dist / rep : i / (pts.length - 1); uv.push(u, 0, u, 1);
      if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    mat.side = THREE.DoubleSide; return new THREE.Mesh(geo, mat);
  }
  // The agreed route: one blue fill, an edge in the same hue, white chevrons that move along it.
  function route(pts, edgeMat) {
    const g = new THREE.Group();
    const e = routeRibbon(pts, 0.86, 0.02, edgeMat); e.renderOrder = 3; g.add(e);
    const f = routeRibbon(pts, 0.56, 0.03, m.rFill); f.renderOrder = 4; g.add(f);
    const c = routeRibbon(pts, 0.56, 0.04, m.chev, 1.1); c.renderOrder = 5; g.add(c);
    return g;
  }
  function youMarker(g, x, z, edgeMat) {
    disc(g, 0.52, edgeMat, x, 0.05, z, 6); disc(g, 0.4, bas('#ffffff'), x, 0.055, z, 7); disc(g, 0.2, m.rFill, x, 0.06, z, 8);
  }
  function arrival(g, x, z, edgeMat) {
    disc(g, 0.6, edgeMat, x, 0.05, z, 6); disc(g, 0.48, m.rFill, x, 0.055, z, 7); disc(g, 0.17, bas('#ffffff'), x, 0.06, z, 8);
    cyl(g, 0.025, 1.25, m.dark, x + 0.75, 0, z);
    const t = signTex(256, 96, (c, w, h) => { c.font = `700 44px ${FONT}`; c.textAlign = 'center'; c.fillText('Arrive', w / 2, h * 0.56); });
    box(g, 0.9, 0.34, 0.04, m.sign, x + 0.75, 1.2, z);
    face(g, 0.9, 0.34, pic(t), x + 0.75, 1.37, z + 0.021); face(g, 0.9, 0.34, pic(t), x + 0.75, 1.37, z - 0.021, Math.PI);
  }

  /* ───────── station ───────── */
  // Trains. Three cars stand for a whole train: tail car, a middle car, head car.
  // R160 (R): ten 18.35 m cars, separate, with a gap and safety gates between them (B).
  // R46 (W): eight 22.77 m cars, separate (B).  R211T (G): open gangway, walk-through from end to end (B).
  // Where the doors sit along a car, and the look of the car ends, are read from photos (E / D).
  const LINE7 = LINES.find(l => l[0] === '7')[1];                 // the official line colour, from the palette
  const TRAINS = {
    R160:  { L: 18.35, W: 2.98, doors: [6.9, 2.3, -2.3, -6.9], doorW: 1.27, letter: 'R', color: NQRW, dark: true },
    R46:   { L: 22.77, W: 3.05, doors: [8.56, 2.85, -2.85, -8.56], doorW: 1.27, letter: 'W', color: NQRW, dark: true },
    R211T: { L: 18.35, W: 3.05, doors: [6.9, 2.3, -2.3, -6.9], doorW: 1.47, letter: 'G', color: '#799534', dark: false, open: true, blue: true },
    R188:  { L: 15.65, W: 2.62, doors: [4.9, 0, -4.9], doorW: 1.37, letter: '7', color: LINE7, dark: false },   // 7 train: 51 ft 4 in cars, three 54 in doors a side (B); door spacing assumed
  };
  const LIV = { head: bas('#FFF6D8'), tail: bas('#D82233'), blue: lam('#08179C'), inside: bas('#FFE9B0') };   // lamps and the R211 blue (official MTA blue)
  function car(g, x0, o, cabFront, cabRear, lamps, live) {       // `live`: collect door leaves that can slide open
    const { L, W } = o;
    box(g, L - 1.4, 0.75, W - 0.9, m.dark, x0, 0.25, 0);
    box(g, L, 2.45, W, m.steel, x0, 1.0, 0);
    box(g, L - 0.5, 0.22, W - 0.6, m.dark, x0, 3.45, 0);
    for (const s of [1, -1]) {
      const z = s * (W / 2 + 0.008);
      // windows: one between each pair of doors and a small one at each end, not a band running through the doors (photos)
      const ed = [-L / 2, ...o.doors.slice().sort((a, b) => a - b).flatMap(dx => [dx - o.doorW / 2, dx + o.doorW / 2]), L / 2];
      for (let i = 0; i < ed.length; i += 2) {
        const a = ed[i], b = ed[i + 1], bay = b - a, end = i === 0 || i === ed.length - 2, ww = end ? Math.min(1.0, bay - 1.0) : Math.min(2.3, bay - 0.9);
        if (ww < 0.5) continue;
        const cx = !end ? (a + b) / 2 : i === 0 ? b - 0.5 - ww / 2 : a + 0.5 + ww / 2;
        box(g, ww, 0.72, 0.016, m.dark, x0 + cx, 2.06, z);
        if (ww > 1.5) box(g, 0.05, 0.72, 0.02, m.steel, x0 + cx, 2.06, z + s * 0.002);            // the post between the two panes
      }
      if (o.blue) box(g, L, 0.2, 0.018, LIV.blue, x0, 1.5, z);
      for (const dx of o.doors) {
        const w = o.doorW;
        if (live) {                                              // two leaves, each hinged at its outer edge, in front of a lit doorway
          box(g, w, 1.95, 0.02, LIV.inside, x0 + dx, 1.14, z - s * 0.012);
          const pair = [];
          for (const e of [1, -1]) {
            const lf = new THREE.Group(); lf.position.set(x0 + dx + e * w / 2, 0, z + s * 0.02); g.add(lf); pair.push(lf);
            box(lf, w / 2, 1.95, 0.03, m.steel, -e * w / 4, 1.14, 0); box(lf, w * 0.35, 0.72, 0.034, m.dark, -e * w / 4, 2.06, s * 0.004);
          }
          live[s > 0 ? 'R' : 'L'].push(pair); continue;
        }
        box(g, w, 1.95, 0.03, m.steel, x0 + dx, 1.14, z);
        box(g, w * 0.35, 0.72, 0.034, m.dark, x0 + dx - w * 0.24, 2.06, z); box(g, w * 0.35, 0.72, 0.034, m.dark, x0 + dx + w * 0.24, 2.06, z);
        box(g, 0.02, 1.95, 0.036, m.dark, x0 + dx, 1.14, z);
      }
    }
    const bt = tex(128, 128, (c) => bullet(c, 64, 64, 58, o.letter, o.color, o.dark));
    for (const e of [1, -1]) {
      const x = x0 + e * (L / 2), cab = e > 0 ? cabFront : cabRear, ry = e * Math.PI / 2;
      if (!o.open || cab) {                                      // every car end that has a door (photos of R68 and R160 ends)
        box(g, 0.42, 0.06, 1.0, m.dark, x + e * 0.21, 1.09, 0);                           // footplate under the end door, level with the floor
        for (const z of [0.52, -0.52]) bar(g, V(x + e * 0.07, 1.3, z), V(x + e * 0.07, 2.55, z), 0.018, m.steel);   // grab bars beside the door
        if (!cab) box(g, 0.12, 0.14, W - 0.3, m.dark, x + e * 0.06, 0.93, 0);             // anticlimber
        else for (const y of [1.55, 1.9, 2.25]) bar(g, V(x + e * 0.1, y, -0.52), V(x + e * 0.1, y, 0.52), 0.012, m.dark);   // chains across the door at the end of the train
      }
      if (!cab) {                                                // plain car end: a door with a window
        if (!o.open) { box(g, 0.03, 1.95, 0.8, m.steel, x + e * 0.012, 1.14, 0); box(g, 0.04, 0.75, 0.46, m.dark, x + e * 0.02, 2.05, 0); }
        continue;
      }
      if (o.blue) box(g, 0.04, 2.45, W, LIV.blue, x + e * 0.015, 1.0, 0);
      box(g, 0.04, 0.95, W - 0.5, m.dark, x + e * 0.03, 1.95, 0);                       // windscreen band
      box(g, 0.05, 2.0, 0.74, o.blue ? LIV.blue : m.steel, x + e * 0.04, 1.05, 0);     // storm door in the middle
      box(g, 0.06, 0.8, 0.44, m.dark, x + e * 0.045, 2.0, 0);
      box(g, 0.04, 0.3, W - 0.7, m.sign, x + e * 0.03, 3.03, 0);                        // sign strip with the line bullet
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.14, 32), picT(bt)); bl.position.set(x + e * 0.055, 3.18, 0); bl.rotation.y = ry; g.add(bl);
      const lamp = lamps === 'tail' ? LIV.tail : LIV.head;       // white lamps lead, red lamps follow
      for (const z of [W / 2 - 0.42, -(W / 2 - 0.42)]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), lamp); d.position.set(x + e * 0.05, 1.34, z); d.rotation.y = ry; g.add(d); }
      box(g, 0.24, 0.14, W - 0.3, m.dark, x + e * 0.1, 0.93, 0); box(g, 0.7, 0.3, 0.4, m.dark, x + e * 0.35, 0.45, 0);   // anticlimber, coupler
    }
  }
  function link(g, x, o, gap) {                                  // what is between two cars
    const W = o.W, xa = x - gap / 2, xb = x + gap / 2;
    box(g, gap + 0.3, 0.25, 0.3, m.dark, x, 0.5, 0);                                    // coupler and drawbar
    if (o.open) { box(g, gap + 0.06, 2.3, W - 0.3, m.dark, x, 1.05, 0); return; }       // open gangway: a bellows, one continuous interior
    // Separate cars: the two footplates meet in the middle and make a narrow walkway between the end doors.
    for (const z of [0.52, -0.52]) for (const y of [1.55, 1.9, 2.25]) bar(g, V(xa, y, z), V(xb, y, z), 0.012, m.dark);   // chains along both sides of the walkway
    for (const z of [W / 2 - 0.1, -(W / 2 - 0.1)]) {             // safety barriers at the body corners, on the platform sides
      bar(g, V(xa, 1.2, z), V(xb, 2.3, z), 0.018, m.dark); bar(g, V(xa, 2.3, z), V(xb, 1.2, z), 0.018, m.dark);
      bar(g, V(xa, 1.2, z), V(xb, 1.2, z), 0.014, m.dark); bar(g, V(xa, 2.3, z), V(xb, 2.3, z), 0.014, m.dark);
    }
    for (const z of [0.9, -0.9]) {                               // hoses and cables hanging between the cars
      const c = new THREE.Mesh(new THREE.TorusGeometry(gap / 2, 0.025, 8, 16, Math.PI), m.dark); c.position.set(x, 0.95, z); c.rotation.z = Math.PI; g.add(c);
    }
  }
  // One car for a station page: rail level at y = 0, floor at 1.146, doors that slide. `over` adjusts length and door positions
  // so that a whole train of `pitch`-spaced cars fits the platform.
  function liveCar(model, over, cabFront, cabRear, lamps) {
    const g = new THREE.Group(), o = { ...TRAINS[model], ...over }, doors = { L: [], R: [] };
    car(g, 0, o, cabFront, cabRear, lamps, doors); return { g, doors, o };
  }
  function train(model) {
    const g = new THREE.Group(), o = TRAINS[model], gap = o.open ? 0.5 : 0.8, pitch = o.L + gap;
    car(g, -pitch, o, false, true, 'tail'); car(g, 0, o, false, false); car(g, pitch, o, true, false, 'head');
    link(g, -pitch / 2, o, gap); link(g, pitch / 2, o, gap);
    const z = o.W / 2 + 0.035, dx = o.doors[1], w = o.doorW;     // the rider's door, outlined in the route edge colour
    box(g, w + 0.18, 0.08, 0.04, m.rEdgeIn, dx, 3.09, z); box(g, 0.08, 2.03, 0.04, m.rEdgeIn, dx - w / 2 - 0.05, 1.14, z); box(g, 0.08, 2.03, 0.04, m.rEdgeIn, dx + w / 2 + 0.05, 1.14, z);
    shadow(g, pitch * 2 + o.L + 3, o.W + 2.4); return g;
  }

  function platform(len = 7) {                                   // platform 1.15 m above the rail (B), edge strip 0.61 m (D)
    const g = new THREE.Group(), H = 1.15;
    box(g, len, H, 3.2, m.floor, 0, 0, -1.6);
    box(g, len, 0.014, 0.61, m.edge, 0, H, -0.305);
    box(g, len, 0.016, 0.08, m.dark, 0, H, -0.66);              // the dark inner line (design log, step 8)
    box(g, len, 0.06, 2.9, m.band, 0, 0, 1.45);
    box(g, len, 0.14, 0.07, m.steel, 0, 0.06, 0.77); box(g, len, 0.14, 0.07, m.steel, 0, 0.06, 2.2);
    shadow(g, len + 1.4, 7.4, 0, 0); return g;
  }

  function wall(len = 6) {                                       // ceiling 2.55, band 0.22, base 0.5, tablet 1.4 × 0.5, tile 108 mm (E)
    const g = new THREE.Group(), H = 2.55;
    box(g, len, H, 0.14, tileMat(len, H), 0, 0, 0);
    box(g, len, 0.22, 0.15, m.topBand, 0, H - 0.22, 0);
    box(g, len, 0.5, 0.15, m.band, 0, 0, 0); box(g, len, 0.05, 0.152, m.tab, 0, 0.5, 0);
    box(g, 1.4, 0.5, 0.16, m.tan, 0, 1.45, 0); box(g, 1.3, 0.4, 0.17, m.tab, 0, 1.5, 0);
    const t = tex(512, 160, (c, w, h) => {
      c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = '700 84px Georgia, "Times New Roman", serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('28TH STREET', w / 2, h / 2 + 4, w - 40);
    });
    face(g, 1.3, 0.4, picT(t), 0, 1.7, 0.087);
    shadow(g, len + 1, 1.6, 0, 0.3); return g;
  }

  function column() {                                            // 0.40 m wide, sign 0.38 m square with its bottom at 1.7 m (E)
    const g = new THREE.Group();
    box(g, 0.4, 2.55, 0.4, m.col, 0, 0, 0);
    const t = signTex(256, 256, (c, w, h) => {
      c.font = `700 96px ${FONT}`; c.textAlign = 'left'; c.fillText('28', 26, h * 0.38); c.font = `700 62px ${FONT}`; c.fillText('Street', 26, h * 0.72);
    });
    for (const [x, z, ry] of [[0.204, 0, Math.PI / 2], [-0.204, 0, -Math.PI / 2], [0, 0.204, 0], [0, -0.204, Math.PI]]) face(g, 0.38, 0.38, pic(t), x, 1.89, z, ry);
    shadow(g, 1.5, 1.5); return g;
  }

  function overheadSign() {
    const g = new THREE.Group(), W = 3.2, H = 0.42, Y = 2.3;
    const t = signTex(1024, 134, (c, w, h) => {
      bullet(c, 70, h * 0.56, 40, 'R', NQRW, true); bullet(c, 160, h * 0.56, 40, 'W', NQRW, true);
      c.fillStyle = '#ffffff'; c.font = `700 60px ${FONT}`; c.textAlign = 'left'; c.fillText('Exit   28 St & Broadway   NE corner', 230, h * 0.58);
    });
    box(g, W, H, 0.06, m.sign, 0, Y, 0);
    face(g, W, H, pic(t), 0, Y + H / 2, 0.031); face(g, W, H, pic(t), 0, Y + H / 2, -0.031, Math.PI);
    cyl(g, 0.014, 0.5, m.dark, -W / 2 + 0.3, Y + H, 0); cyl(g, 0.014, 0.5, m.dark, W / 2 - 0.3, Y + H, 0);
    box(g, W, 0.05, 0.12, m.dark, 0, Y + H + 0.5, 0);
    cyl(g, 0.05, Y + H + 0.5, m.dark, -W / 2 - 0.1, 0, 0); cyl(g, 0.05, Y + H + 0.5, m.dark, W / 2 + 0.1, 0, 0);   // stand, showroom only
    shadow(g, W + 1, 1.4); return g;
  }

  function bullets() {
    const g = new THREE.Group(), W = 3.6, H = 0.5;
    const t = tex(1152, 160, (c, w, h) => {
      c.fillStyle = BASE.sign; c.fillRect(0, 0, w, h);
      LINES.forEach(([l, col, dk], i) => bullet(c, 76 + i * 125, h / 2, 54, l, col, dk));
    });
    box(g, W, H, 0.05, m.sign, 0, 1.15, 0); face(g, W, H, pic(t), 0, 1.4, 0.026); face(g, W, H, pic(t), 0, 1.4, -0.026, Math.PI);
    cyl(g, 0.03, 1.15, m.dark, -1.5, 0, 0); cyl(g, 0.03, 1.15, m.dark, 1.5, 0, 0);
    shadow(g, W + 0.8, 1.2); return g;
  }

  function railing(len = 3) {                                    // 1.07 m guard rail (D)
    const g = new THREE.Group(), H = 1.07;
    for (let x = -len / 2; x <= len / 2 + 0.01; x += len / 2) cyl(g, 0.025, H, m.steel, x, 0, 0);
    bar(g, V(-len / 2, H, 0), V(len / 2, H, 0), 0.025, m.steel); bar(g, V(-len / 2, H * 0.52, 0), V(len / 2, H * 0.52, 0), 0.018, m.steel);
    shadow(g, len + 0.6, 0.9); return g;
  }

  /* ───────── fare control (sizes: MTA document 132021, A; heights from photos, E) ───────── */
  function turnstiles(n = 3) {
    const g = new THREE.Group(), pitch = 0.29 + 0.42, z0 = -n * pitch / 2;
    for (let i = 0; i <= n; i++) {
      const z = z0 + i * pitch;
      box(g, 1.27, 0.55, 0.29, m.steel, 0, 0, z);
      ext(g, [[-0.635, 0.55], [0.635, 0.55], [0.635, 1.0], [-0.15, 1.0], [-0.635, 0.8]], 0.15, m.steel, z);   // top slopes down toward the rider
      const rd = box(g, 0.3, 0.03, 0.13, m.sign, -0.39, 0.9, z); rd.rotation.z = Math.atan2(0.2, 0.485);       // the reader sits on the slope
      if (i < n) bar(g, V(0, 0.84, z + 0.07), V(0, 0.74, z + 0.5), 0.02, m.dark);
    }
    shadow(g, 2.3, n * pitch + 1.3); return g;
  }
  function exitGate() {
    const g = new THREE.Group(), W = 0.95, H = 2.1;
    for (const x of [-W / 2, W / 2]) box(g, 0.07, H, 0.07, m.dark, x, 0, 0);
    box(g, W, 0.07, 0.07, m.dark, 0, H - 0.07, 0); box(g, W, 0.06, 0.05, m.dark, 0, 0.12, 0);
    for (let i = 1; i < 8; i++) cyl(g, 0.012, H - 0.25, m.dark, -W / 2 + i * W / 8, 0.15, 0, 8);
    const t = signTex(384, 96, (c, w, h) => { c.font = `700 40px ${FONT}`; c.textAlign = 'center'; c.fillText('Emergency exit', w / 2, h * 0.58); });
    box(g, W - 0.1, 0.22, 0.05, m.sign, 0, 0.95, 0); face(g, W - 0.1, 0.22, pic(t), 0, 1.06, 0.026); face(g, W - 0.1, 0.22, pic(t), 0, 1.06, -0.026, Math.PI);
    shadow(g, 1.8, 1.2); return g;
  }
  function heet() {                                              // high entry/exit turnstile, about 1.5 m square and 2.2 m high (D)
    const g = new THREE.Group(), S = 1.5, H = 2.2, R = 0.68;
    for (const [x, z] of [[-S / 2, -S / 2], [S / 2, -S / 2], [-S / 2, S / 2], [S / 2, S / 2]]) box(g, 0.06, H, 0.06, m.dark, x, 0, z);
    box(g, S, 0.06, S, m.dark, 0, H, 0);
    cyl(g, 0.045, H, m.steel, 0, 0, 0);
    for (let k = 0; k < 3; k++) {
      const a = k * Math.PI * 2 / 3 + 0.5;
      for (let y = 0.25; y < H - 0.1; y += 0.22) bar(g, V(0, y, 0), V(Math.cos(a) * R, y, Math.sin(a) * R), 0.014, m.steel);
    }
    for (let z = -S / 2 + 0.12; z < S / 2; z += 0.14) cyl(g, 0.012, H, m.dark, -S / 2, 0, z, 8);   // the fixed comb on one side
    shadow(g, S + 1, S + 1); return g;
  }
  // Fare-control railing: steel bars from the floor to above head height, as in the station photos (not glass). Sizes D.
  function fence(len = 3, h = 2.2) {
    const g = new THREE.Group(), n = Math.max(1, Math.round(len / 1.5));
    for (let i = 0; i <= n; i++) box(g, 0.07, h, 0.07, m.dark, -len / 2 + i * len / n, 0, 0);
    box(g, len, 0.06, 0.06, m.dark, 0, h - 0.06, 0); box(g, len, 0.06, 0.06, m.dark, 0, 0.08, 0); box(g, len, 0.04, 0.04, m.dark, 0, h * 0.52, 0);
    const cnt = Math.max(1, Math.floor(len / 0.11)), bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.024, h - 0.2, 0.024), m.dark, cnt), mt = new THREE.Matrix4();
    for (let i = 0; i < cnt; i++) { mt.makeTranslation(-len / 2 + (i + 0.5) * len / cnt, h / 2, 0); bars.setMatrixAt(i, mt); }
    bars.castShadow = true; g.add(bars); return g;
  }
  function booth() {                                             // about 2.5 × 2 × 2.4 m (D)
    const g = new THREE.Group(), W = 2.5, D = 2.0, H = 2.4;
    box(g, W, H, D, m.tile, 0, 0, 0); box(g, W + 0.02, 0.45, D + 0.02, m.dark, 0, 0, 0); box(g, W + 0.1, 0.1, D + 0.1, m.dark, 0, H, 0);
    box(g, W - 0.5, 0.85, 0.03, m.dark, 0, 1.05, D / 2 + 0.005); box(g, 0.03, 0.85, D - 0.5, m.dark, W / 2 + 0.005, 1.05, 0); box(g, 0.03, 0.85, D - 0.5, m.dark, -W / 2 - 0.005, 1.05, 0);
    shadow(g, W + 1.4, D + 1.4); return g;
  }
  function omny() {                                              // about 0.8 × 1.9 × 0.5 m (D)
    const g = new THREE.Group();
    box(g, 0.8, 1.9, 0.5, m.steel, 0, 0, 0); box(g, 0.74, 0.7, 0.02, m.dark, 0, 0.1, 0.255); box(g, 0.5, 0.42, 0.02, m.sign, 0, 1.15, 0.255);
    shadow(g, 1.6, 1.3); return g;
  }

  /* ───────── stairs and lifts (D) ───────── */
  // The subway has two kinds of stair. Both: riser 0.18, tread 0.28, yellow step edges, handrail 0.9 above the steps.
  function stairSteps(g, w, n, mat, open) {
    const R = 0.18, T = 0.28;
    for (let i = 0; i < n; i++) {
      if (open) box(g, T + 0.02, 0.045, w, mat, i * T + T / 2, (i + 1) * R - 0.045, 0);     // steel tread, open riser
      else box(g, T, (i + 1) * R, w, mat, i * T + T / 2, 0, 0);                              // solid concrete step
      box(g, 0.06, 0.012, w, m.edge, i * T + 0.03, (i + 1) * R, 0);
    }
    return { R, T, run: n * T, rise: n * R };
  }
  function stairsTiled(w = 1.8, n = 16) {                        // concrete steps between tiled walls, handrails fixed to the walls
    const g = new THREE.Group(), { R, run, rise } = stairSteps(g, w, n, m.floor, false), top = 1.4;
    box(g, top, rise, w, m.floor, run + top / 2, 0, 0);
    for (const s of [1, -1]) {
      const z = s * (w / 2 + 0.07), zr = s * (w / 2 - 0.07);
      ext(g, [[-0.15, 0], [run + top, 0], [run + top, rise + 1.15], [run, rise + 1.15], [-0.15, 1.15 + R]], 0.14, tileWorld, z);   // 108 mm joints, undistorted on the slope
      ext(g, [[-0.15, 1.15 + R], [run, rise + 1.15], [run + top, rise + 1.15], [run + top, rise + 1.23], [run - 0.02, rise + 1.23], [-0.15, 1.23 + R]], 0.16, m.band, z);
      bar(g, V(-0.1, 0.9 + R, zr), V(run, rise + 0.9, zr), 0.025, m.steel); bar(g, V(run, rise + 0.9, zr), V(run + top - 0.1, rise + 0.9, zr), 0.025, m.steel);
      for (let i = 2; i <= n; i += 4) bar(g, V(i * 0.28, i * R + 0.9, zr), V(i * 0.28, i * R + 0.9, z - s * 0.07), 0.012, m.steel);
    }
    shadow(g, run + top + 1.6, w + 1.8, (run + top) / 2, 0); return g;
  }
  // A wide stair in two flights with a landing between (photo: 34 St–Hudson Yards, platform to mezzanine): solid stainless
  // sides from the floor up, a handrail on each side and two down the middle on posts. Foot at x = 0, climbing toward +x.
  function stairsWide(w = 5.2, n = 13, rise = 4.88, land = 1.5) {
    const g = new THREE.Group(), T = 0.31, R = rise / (2 * n), f1 = n * T, x2 = f1 + land, run = 2 * f1 + land, yl = n * R, H = 0.95;
    for (let i = 0; i < n; i++) {
      const mark = i === 0 || i === n - 1;                       // photographs: a yellow strip on the top and bottom step of each flight only
      box(g, T, R, w, m.band, i * T + T / 2, i * R, 0); if (mark) box(g, 0.07, 0.012, w, m.edge, i * T + 0.04, (i + 1) * R, 0);
      box(g, T, R, w, m.band, x2 + i * T + T / 2, yl + i * R, 0); if (mark) box(g, 0.07, 0.012, w, m.edge, x2 + i * T + 0.04, yl + (i + 1) * R, 0);
    }
    box(g, land, 0.2, w, m.band, f1 + land / 2, yl - 0.2, 0);
    const top = h => [V(0, h, 0), V(f1, yl + h, 0), V(x2, yl + h, 0), V(run, rise + h, 0)];        // the line of the nosings, lifted by h
    for (const s of [1, -1]) {                                   // the sides (photographs): open. A dark stringer along the steps, stainless posts, a top rail and a mid rail, wire mesh between
      const z = s * (w / 2 + 0.03);
      ext(g, [[0, -0.02], [f1, yl - 0.02], [x2, yl - 0.02], [run, rise - 0.02], [run, rise + 0.12], [x2, yl + 0.12], [f1, yl + 0.12], [0, 0.12]].map(q => [q[0], q[1]]), 0.07, m.dark, z);   // stringer
      ext(g, [[0, -0.34], [f1, yl - 0.34], [x2, yl - 0.34], [run, rise - 0.34], [run, rise - 0.02], [x2, yl - 0.02], [f1, yl - 0.02], [0, -0.02]].filter(q => true).map(q => [q[0], Math.max(0, q[1])]), 0.07, m.dark, z);
      ext(g, [[0, 0.12], [f1, yl + 0.12], [x2, yl + 0.12], [run, rise + 0.12], [run, rise + 1.0], [x2, yl + 1.0], [f1, yl + 1.0], [0, 1.0]], 0.012, m.wire, z);                                   // wire mesh, seen through
      const TR = top(1.0).map(q => V(q.x, q.y, z)), MR = top(0.55).map(q => V(q.x, q.y, z));
      for (let i = 0; i < 3; i++) { bar(g, TR[i], TR[i + 1], 0.022, m.steel); bar(g, MR[i], MR[i + 1], 0.014, m.steel); }
      const sp = (x, y) => bar(g, V(x, y, z), V(x, y + 1.0, z), 0.02, m.steel);
      for (let i = 0; i <= n; i += 3) { sp(i * T, i * R); sp(x2 + i * T, yl + i * R); } sp(f1, yl); sp(run, rise);
      const L = top(H).map(p => V(p.x, p.y, s * (w / 2 - 0.09)));
      for (let i = 0; i < 3; i++) bar(g, L[i], L[i + 1], 0.022, m.dark);                             // handrail on the side wall
    }
    for (const z of [w / 6, -w / 6]) {                           // two handrails down the middle, each on posts
      const L = top(H).map(p => V(p.x, p.y, z));
      for (let i = 0; i < 3; i++) bar(g, L[i], L[i + 1], 0.025, m.steel);
      const post = (x, y) => bar(g, V(x, y, z), V(x, y + H, z), 0.018, m.steel);
      for (let i = 0; i <= n; i += 4) { post(i * T, i * R); post(x2 + i * T, yl + i * R); }
      post(f1, yl); post(run, rise);
    }
    shadow(g, run + 1.6, w + 1.8, run / 2, 0); return g;
  }
  // Platform stair in three flights (photographs of 34 St–Hudson Yards): one wide flight climbs along the platform to a
  // landing half-way up; from the landing a flight goes off to each side, across the platform, up to the mezzanine's side
  // decks. Open balustrades: a dark stringer, stainless posts, a top and a mid rail, wire mesh; a handrail down the middle of
  // the wide flight. Local frame: the wide flight climbs +x from x = 0, centred on z = 0; the side flights climb toward +z and -z.
  function stairsT(wl = 4.0, n = 13, rise = 4.88, wu = 2.2) {
    const g = new THREE.Group(), T = 0.31, R = rise / (2 * n), f1 = n * T, yl = n * R, xm = f1 + wu / 2;
    for (let i = 0; i < n; i++) {
      const mark = i === 0 || i === n - 1;
      box(g, T, R, wl, m.band, i * T + T / 2, i * R, 0); if (mark) box(g, 0.07, 0.012, wl, m.edge, i * T + 0.04, (i + 1) * R, 0);
      for (const s of [1, -1]) { box(g, wu, R, T, m.band, xm, yl + i * R, s * (wl / 2 + i * T + T / 2)); if (mark) box(g, wu, 0.012, 0.07, m.edge, xm, yl + (i + 1) * R, s * (wl / 2 + i * T + 0.04)); }
    }
    box(g, wu, 0.2, wl, m.band, xm, yl - 0.2, 0);                                                           // the landing
    const rail = (A, B, mesh = true) => {                         // a balustrade standing on the line A-B (points on the line of the nosings)
      const up = h => [A.clone().setY(A.y + h), B.clone().setY(B.y + h)], len = A.distanceTo(B), np = Math.max(1, Math.round(len / 1.0));
      if (mesh) { bar(g, ...up(0.02), 0.06, m.dark); bar(g, ...up(0.55), 0.014, m.steel);                 // stringer, mid rail
        const [a0, b0] = up(0.1), [a1, b1] = up(1.0), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([a0, b0, b1, a0, b1, a1].flatMap(q => [q.x, q.y, q.z]), 3)); geo.computeVertexNormals(); g.add(new THREE.Mesh(geo, m.wire)); }
      bar(g, ...up(1.0), 0.022, m.steel);
      for (let i = 0; i <= np; i++) { const q = A.clone().lerp(B, i / np); bar(g, q, q.clone().setY(q.y + 1.0), 0.02, m.steel); }
    };
    for (const s of [1, -1]) {
      rail(V(0, 0, s * wl / 2), V(f1, yl, s * wl / 2));                                                     // sides of the wide flight
      rail(V(f1, yl, s * wl / 2), V(f1, rise, s * (wl / 2 + f1)));                                          // near side of a side flight
      rail(V(f1 + wu, yl, s * wl / 2), V(f1 + wu, rise, s * (wl / 2 + f1)));                                // far side of a side flight
    }
    rail(V(f1 + wu, yl, -wl / 2), V(f1 + wu, yl, wl / 2));                                                  // the far edge of the landing
    rail(V(0, 0, 0), V(f1, yl, 0), false);                                                                  // handrail down the middle
    return g;
  }
  function stairsSteel(w = 1.5, n = 16) {                        // steel stringers, open steel treads, railings with balusters
    const g = new THREE.Group(), { R, T, run, rise } = stairSteps(g, w, n, m.dark, true), top = 1.4, ang = Math.atan2(R, T), len = Math.hypot(run, rise);
    box(g, top, 0.06, w, m.dark, run + top / 2, rise - 0.06, 0);
    for (const s of [1, -1]) {
      const z = s * (w / 2 + 0.04);
      const st = box(g, len + 0.3, 0.3, 0.07, m.steel, run / 2, rise / 2 - 0.1, z); st.rotation.z = ang;      // stringer
      box(g, top, 0.26, 0.07, m.steel, run + top / 2, rise - 0.26, z);
      for (const x of [run + 0.1, run + top - 0.1]) box(g, 0.12, rise - 0.26, 0.12, m.steel, x, 0, z);         // posts under the landing
      bar(g, V(0, 0.9 + R, z), V(run, rise + 0.9, z), 0.025, m.steel); bar(g, V(run, rise + 0.9, z), V(run + top, rise + 0.9, z), 0.025, m.steel);
      bar(g, V(0, 0.45 + R, z), V(run, rise + 0.45, z), 0.016, m.steel); bar(g, V(run, rise + 0.45, z), V(run + top, rise + 0.45, z), 0.016, m.steel);
      for (let i = 0; i <= n; i += 2) bar(g, V(i * T, i * R + (i ? 0 : R), z), V(i * T, i * R + 0.9 + (i ? 0 : R), z), 0.016, m.steel);
      bar(g, V(run + top, rise, z), V(run + top, rise + 0.9, z), 0.016, m.steel);
    }
    shadow(g, run + top + 1.6, w + 1.6, (run + top) / 2, 0); return g;
  }
  function escalator(glass = false, rise = 2.88) {               // 30°, 1.0 m step; flat run-in and run-out at both ends; steel or glass sides
    const g = new THREE.Group(), a = Math.PI / 6, tn = Math.tan(a), run = rise / tn, W = 1.0, F = 1.4, x1 = F, x2 = F + run, x3 = F + run + F, y0 = 0.06;
    // body: the truss under the steps, seen from the side
    ext(g, [[0, 0], [x1 + 0.7, 0], [x2 + 0.35, rise - 0.85], [x3, rise - 0.85], [x3, rise + y0], [x2, rise + y0], [x1, y0], [0, y0]], W + 0.24, m.steel, 0);
    // steps: dark, each with a yellow edge
    const sd = 0.4, ns = Math.round(run / sd);
    for (let i = 0; i < ns; i++) {
      const x = x1 + i * sd, y = y0 + i * sd * tn;
      box(g, sd, sd * tn + 0.02, W - 0.04, m.dark, x + sd / 2, y, 0); box(g, 0.035, 0.012, W - 0.04, m.edge, x + 0.02, y + sd * tn + 0.02, 0);
    }
    box(g, F - 0.25, 0.02, W - 0.04, m.dark, (F - 0.25) / 2 + 0.25, y0, 0); box(g, F - 0.25, 0.02, W - 0.04, m.dark, x2 + (F - 0.25) / 2, rise + y0, 0);
    box(g, 0.07, 0.014, W - 0.04, m.edge, 0.3, y0 + 0.02, 0); box(g, 0.07, 0.014, W - 0.04, m.edge, x3 - 0.3, rise + y0 + 0.02, 0);   // comb plates
    // balustrades and the moving handrail with rounded ends
    const hb = 0.9, off = hb * Math.tan(a / 2), r = hb / 2;
    for (const s of [1, -1]) {
      const z = s * (W / 2 + 0.07);
      const side = ext(g, [[r, y0], [x1, y0], [x2, rise + y0], [x3 - r, rise + y0], [x3 - r, rise + y0 + hb], [x2 - off, rise + y0 + hb], [x1 - off, y0 + hb], [r, y0 + hb]], glass ? 0.02 : 0.05, glass ? m.glass : m.steel, z);
      if (glass) {                                               // glass panel on a steel skirt, with a steel rail under the handrail
        side.renderOrder = 9; const k = 0.22, ok = k * Math.tan(a / 2);
        ext(g, [[r, y0], [x1, y0], [x2, rise + y0], [x3 - r, rise + y0], [x3 - r, rise + y0 + k], [x2 - ok, rise + y0 + k], [x1 - ok, y0 + k], [r, y0 + k]], 0.07, m.steel, z);
      }
      const P = [V(r, y0 + hb, z), V(x1 - off, y0 + hb, z), V(x2 - off, rise + y0 + hb, z), V(x3 - r, rise + y0 + hb, z)];
      for (let i = 0; i < 3; i++) bar(g, P[i], P[i + 1], 0.05, m.dark);
      for (const q of P) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), m.dark); k.position.copy(q); g.add(k); }   // a ball of the handrail's own size at every bend and where the curved ends begin: straight pieces that meet at an angle otherwise leave a notch
      for (const [cx, cy, rz] of [[r, y0 + r, Math.PI / 2], [x3 - r, rise + y0 + r, -Math.PI / 2]]) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 10, 20, Math.PI), m.dark); t.position.set(cx, cy, z); t.rotation.z = rz; g.add(t);
        const c = new THREE.Mesh(new THREE.CircleGeometry(r - 0.04, 24), glass ? m.glass : m.steel); c.renderOrder = 9; c.position.set(cx, cy, z + s * 0.026); c.rotation.y = s > 0 ? 0 : Math.PI; g.add(c);
        const c2 = c.clone(); c2.position.z = z - s * 0.026; c2.rotation.y = s > 0 ? Math.PI : 0; g.add(c2);
      }
    }
    shadow(g, x3 + 1.6, W + 2, x3 / 2, 0); return g;
  }
  function elevator() {                                          // door 0.91 m clear, cab about 1.3 × 1.7 m
    const g = new THREE.Group();
    box(g, 1.7, 2.45, 1.6, m.steel, 0, 0, 0);
    box(g, 0.455, 2.05, 0.03, m.dark, -0.23, 0, 0.805); box(g, 0.455, 2.05, 0.03, m.dark, 0.23, 0, 0.805);
    box(g, 1.1, 0.12, 0.04, m.sign, 0, 2.1, 0.81); box(g, 0.12, 0.2, 0.04, m.sign, 0.72, 1.05, 0.81);
    shadow(g, 2.8, 2.6); return g;
  }

  /* ───────── route sample ───────── */
  function routeSample(outdoor) {
    const g = new THREE.Group(), e = outdoor ? m.rEdgeOut : m.rEdgeIn;
    const pts = [[-4.2, 0], [-1, 0], [1, 0], [2.6, -1.3], [4.2, -1.3]];
    flat(g, 10.4, 4.6, outdoor ? m.oWalk : m.floor, 0, 0.006, -0.65, 0);
    g.add(route(pts, e)); youMarker(g, -4.2, 0, e); arrival(g, 4.2, -1.3, e);
    return g;
  }

  /* ───────── street (D) ───────── */
  function entrance() {
    const g = new THREE.Group(), L = 4.2, W = 1.8, H = 1.1;
    flat(g, L, W, m.dark, 0, 0.014, 0, 1);                       // the stair opening, drawn flat
    for (let i = 0; i < 7; i++) flat(g, 0.08, W - 0.1, m.edge, -L / 2 + 0.5 + i * 0.5, 0.016, 0, 2).material = m.edge;
    const rail = (ax, az, bx, bz) => {
      const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(d / 1.4));
      for (let i = 0; i <= n; i++) box(g, 0.08, H, 0.08, m.oStreet, ax + (bx - ax) * i / n, 0, az + (bz - az) * i / n);
      bar(g, V(ax, H, az), V(bx, H, bz), 0.035, m.oStreet);
      const p = box(g, d, 0.5, 0.04, m.oStreet, (ax + bx) / 2, 0.12, (az + bz) / 2); p.rotation.y = -Math.atan2(bz - az, bx - ax);
    };
    rail(-L / 2, -W / 2 - 0.1, L / 2, -W / 2 - 0.1); rail(-L / 2, W / 2 + 0.1, L / 2, W / 2 + 0.1); rail(L / 2, -W / 2 - 0.1, L / 2, W / 2 + 0.1);
    const lx = -L / 2, lz = W / 2 + 0.1;                         // lamp: green over white globe; it glows at night
    cyl(g, 0.055, 2.7, m.oStreet, lx, 0, lz);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.oGlobeTop); top.position.set(lx, 2.9, lz); g.add(top);
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.oGlobeBot); bot.position.set(lx, 2.9, lz); g.add(bot);
    const halo = new THREE.Sprite(m.oHalo); halo.position.set(lx, 2.9, lz); halo.scale.set(1.6, 1.6, 1); g.add(halo);
    const t = signTex(512, 213, (c, w, h) => {
      c.font = `700 62px ${FONT}`; c.textAlign = 'left'; c.fillText('28 St Station', 28, h * 0.36);
      bullet(c, 62, h * 0.72, 38, 'R', NQRW, true); bullet(c, 150, h * 0.72, 38, 'W', NQRW, true);
    });
    box(g, 0.05, 0.5, 1.2, m.sign, L / 2 + 0.07, 1.25, 0); face(g, 1.2, 0.5, pic(t), L / 2 + 0.1, 1.5, 0, Math.PI / 2); face(g, 1.2, 0.5, pic(t), L / 2 + 0.04, 1.5, 0, -Math.PI / 2);
    return g;
  }
  function crossing() {
    const g = new THREE.Group();
    box(g, 9, 0.02, 6.4, m.oRoad, 0, 0, 0);
    for (let i = 0; i < 8; i++) box(g, 0.55, 0.012, 3.2, m.oStripe, -3.6 + i * 1.03, 0.02, 0);
    box(g, 9, 0.14, 1.6, m.oWalk, 0, 0, -4); box(g, 9, 0.14, 1.6, m.oWalk, 0, 0, 4);
    return g;
  }
  // Two kinds of signal at a crossing (schematic sizes, D). Lamps are unlit colours by day and night alike: they glow on their own.
  const LAMP = { red: bas('#8A2F2F'), amber: bas('#8A6E2A'), green: bas('#39C97E'), walk: bas('#FFF6D8'), wait: bas('#8A5A22') };
  const lampDisc = (g, mat, x, y, z) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), mat); d.position.set(x, y, z); g.add(d); };
  // For drivers: a pole at the corner with an arm over the road and a three-lamp head. Arm along +x, head facing +z.
  function vehicleSignal(arm = 6.1) {                          // NYC's standard pole carries a 20 ft (6.1 m) arm (NYC DOT standard drawings)
    const g = new THREE.Group();
    cyl(g, 0.09, 5.7, m.oSteel, 0, 0, 0); bar(g, V(0, 5.2, 0), V(arm, 5.6, 0), 0.06, m.oSteel);
    box(g, 0.4, 1.1, 0.06, m.sign, arm, 4.45, -0.1); box(g, 0.34, 1.0, 0.24, m.sign, arm, 4.5, 0.02);
    lampDisc(g, LAMP.red, arm, 5.3, 0.145); lampDisc(g, LAMP.amber, arm, 5.0, 0.145); lampDisc(g, LAMP.green, arm, 4.7, 0.145);
    return g;
  }
  // For people on foot: a small head at about 2.6 m showing the hand above and the walking sign below, facing +z.
  const pedTex = tex(128, 256, (c, w, h) => {                    // raised hand (waiting, unlit) above, walking figure (lit) below
    c.fillStyle = '#0c0d0f'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7A4A16'; c.fillRect(44, 58, 40, 46); for (let i = 0; i < 4; i++) c.fillRect(44 + i * 10.5, 24, 8, 40); c.fillRect(30, 62, 14, 26);
    c.strokeStyle = c.fillStyle = '#FFF6D8'; c.lineWidth = 9; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.arc(70, 148, 11, 0, 7); c.fill();
    c.beginPath(); c.moveTo(64, 166); c.lineTo(58, 200); c.lineTo(44, 232); c.moveTo(58, 200); c.lineTo(78, 214); c.lineTo(84, 238); c.moveTo(64, 172); c.lineTo(44, 190); c.moveTo(66, 172); c.lineTo(88, 186); c.stroke();
  });
  function pedHead() {                                           // faces +z; mounts on a pole at the origin
    const g = new THREE.Group();
    box(g, 0.46, 0.86, 0.2, m.sign, 0, 2.25, 0.2);
    face(g, 0.4, 0.8, pic(pedTex), 0, 2.68, 0.305);
    return g;
  }
  function pedPole() { const g = new THREE.Group(); cyl(g, 0.07, 3.2, m.oSteel, 0, 0, 0); return g; }
  function pedSignal() { const g = pedHead(); cyl(g, 0.07, 3.2, m.oSteel, 0, 0, 0); return g; }
  function slabBox(g, w, h, d, x, z, windows) {                  // translucent block; windows light up at night
    const S = m.oBldgSide, faces = [S[0], S[1], m.oBldgTop, m.oBldgTop, S[2], S[3]];   // face order of a box: +x, -x, +y, -y, +z, -z
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faces); b.position.set(x, h / 2, z); b.renderOrder = 9; g.add(b);
    for (const [wx, wy] of windows) face(g, 0.7, 1.0, m.oWin, x + wx, wy, z + d / 2 + 0.02).renderOrder = 10;
  }
  function buildings() {
    const g = new THREE.Group();
    slabBox(g, 6, 14, 6, -7, 0, [[-1.6, 9], [1.2, 5], [0.2, 11.5]]);
    slabBox(g, 7, 22, 6, 0, 0, [[-2, 6], [1.8, 13], [-0.4, 18], [2.2, 9.5]]);
    slabBox(g, 5, 9, 6, 6.5, 0, [[-1, 4], [1.2, 6.5]]);
    return g;
  }

  /* ───────── landmark: the one building drawn solid, with the route continuing inside ───────── */
  // Vessel (Heatherwick Studio, 2019; the landmark at the south end of the park), in general terms: rings, stairs and
  // underside, no single steps, no 2024 mesh (owner's choices). Read from the architect's drawings (viewed, not copied):
  //   a lattice of stairs on a bowl that opens upward: 15 m wide at the foot, 46 m at the top, 46 m high (press figures);
  //   five repeats round the circle; 16 levels, each of 5 long landings (80 in all); the landings of one level stand over
  //   the gaps of the level below; from each end of a landing a stair climbs to the nearer end of the landing above
  //   (150 stairs, and 5 from the central floor: the real count is 154); so the openings between are flat hexagons;
  //   each piece: a flat walking top, upright dark steel sides, a faceted copper-coloured underside, glass balustrades;
  //   one lift on a curved inclined track up the inside; five feet on a round stepped plinth.
  // Assumed: the bowl's exact curve, landing and stair widths, the depth of the underside. Local frame: centre at the origin.
  function vessel() {
    // Deepened 2026-11-18 from the architect's "dogbone" drawing and close photographs. The unit: a long landing two stairs
    // wide; at each end the stair going UP leaves from its outer half and the stair coming up from BELOW arrives on its inner
    // half, side by side (the bowl widens upward, so up is outward). Five legs.
    const g = new THREE.Group(), LV = 16, DY = 2.75, Y0 = 0.45, RT = 23 - 1.8, RB = 7.5 + 1.2, WS = 1.7, W = 2 * WS, SD = 0.3, KEEL = 1.0, A = Math.PI * 2 / 5, HA = A * 0.125, TL = A * 0.75;
    const yAt = k => Y0 + DY * (k + 1), rAt = y => RB + (RT - RB) * (1 - Math.pow(1 - Math.min(1, (y - Y0) / (DY * LV)), 1.9));
    const top = [], dark = [], cop = [], gl = [], cap = [], lit = [], luv = [], pave = [], puv = [];
    const quad = (arr, a, b, c, d) => { for (const q of [a, b, c, a, c, d]) arr.push(q.x, q.y, q.z); };
    const tri = (arr, a, b, c) => { for (const q of [a, b, c]) arr.push(q.x, q.y, q.z); };
    const pol = (r, th, y) => new THREE.Vector3(r * Math.cos(th), y, r * Math.sin(th));
    const dn = (q, d) => q.clone().setY(q.y - d), up = q => q.clone().setY(q.y + 1.1);
    const rail = (a, b) => { quad(gl, a, b, up(b), up(a)); cap.push(up(a).x, up(a).y, up(a).z, up(b).x, up(b).y, up(b).z); };
    // one piece of walkway: from (angle t0, height y0, offset o0 across the walking line) to (t1, y1, o1), w wide;
    // rails: which sides get a balustrade ('i' inner, 'o' outer)
    // Every piece is a closed block: top, two upright dark sides, two sloping copper flanks, a flat copper bottom, and an
    // end face at each end. Its two ends lie in upright planes through the centre, the same planes the landings end on,
    // so a stair and a landing meet face to face: no gap, and nothing runs through anything (owner, 2026-11-18).
    // A light strip runs along both upper edges (lit at night, as on the building).
    const IN = 0.4, strip = (a, b, out) => { const n = new THREE.Vector3(Math.cos(out), 0, Math.sin(out)).multiplyScalar(0.03), a1 = a.clone().add(n), b1 = b.clone().add(n); quad(lit, a1.clone().setY(a1.y + 0.12), b1.clone().setY(b1.y + 0.12), dn(b1, 1.0), dn(a1, 1.0)); luv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); };   // a glow, not a block: brightest in a thin line at the edge, fading out above it and down the side over about a metre
    const piece = (t0, y0, o0, t1, y1, o1, w, rails) => {
      const r0 = rAt(y0) + o0, r1 = rAt(y1) + o1, D = SD + KEEL, i0 = pol(r0 - w / 2, t0, y0), o0p = pol(r0 + w / 2, t0, y0), i1 = pol(r1 - w / 2, t1, y1), o1p = pol(r1 + w / 2, t1, y1);
      const bi0 = pol(r0 - w / 2 + IN, t0, y0 - D), bo0 = pol(r0 + w / 2 - IN, t0, y0 - D), bi1 = pol(r1 - w / 2 + IN, t1, y1 - D), bo1 = pol(r1 + w / 2 - IN, t1, y1 - D);
      if (rails === 'io' && y0 === y1) { quad(pave, i0, i1, o1p, o0p); const L = i0.distanceTo(i1); puv.push(0, 0, L, 0, L, w, 0, 0, L, w, 0, w); }   // a landing: paved (the stairs stay plain, so the two read apart)
      else quad(top, i0, i1, o1p, o0p);
      quad(dark, i0, dn(i0, SD), dn(i1, SD), i1); quad(dark, o0p, o1p, dn(o1p, SD), dn(o0p, SD));
      quad(cop, dn(i0, SD), bi0, bi1, dn(i1, SD)); quad(cop, dn(o0p, SD), dn(o1p, SD), bo1, bo0); quad(cop, bi0, bo0, bo1, bi1);          // flanks and bottom
      quad(cop, i0, o0p, bo0, bi0); quad(cop, i1, bi1, bo1, o1p);                                                                          // end faces (the outline is a little more than the block's: it only ever lies inside a neighbour)
      if (rails.includes('i')) rail(i0, i1); if (rails.includes('o')) rail(o0p, o1p);
      const tm = (t0 + t1) / 2; strip(o0p, o1p, tm); strip(i0, i1, tm + Math.PI);
    };
    let stairs = 0;
    for (let k = 0; k < LV; k++) for (let i = 0; i < 5; i++) {
      const tc = (i + (k % 2) / 2) * A, y = yAt(k);
      piece(tc - HA, y, 0, tc + HA, y, 0, W, 'io');                                                  // the landing, two stairs wide
      for (const s of [1, -1]) {
        if (k < LV - 1) { piece(tc + s * HA, y, WS / 2, tc + s * (A / 2 - HA), yAt(k + 1), -WS / 2, WS, 'io'); stairs++; }   // up: from the outer half here to the inner half of the landing above
        const e = [pol(rAt(y) - W / 2, tc + s * HA, y), pol(rAt(y), tc + s * HA, y), pol(rAt(y) + W / 2, tc + s * HA, y)];
        if (k === LV - 1) rail(e[1], e[2]); if (k === 0) rail(e[0], e[1]);                           // the open half of an end: top level outer, lowest level inner
      }
      if (k === 0) {                                                                                  // a leg under each lowest landing: a tapering copper box down to the plinth
        const R = rAt(y), q = (dr, dt, yy, rr = R) => pol(rr + dr, tc + dt, yy), T = [q(-1.5, -HA * 0.9, y - SD), q(-1.5, HA * 0.9, y - SD), q(1.5, HA * 0.9, y - SD), q(1.5, -HA * 0.9, y - SD)], F = [q(-0.8, -0.1, Y0, 6.6), q(-0.8, 0.1, Y0, 6.6), q(0.8, 0.1, Y0, 6.6), q(0.8, -0.1, Y0, 6.6)];
        for (let j = 0; j < 4; j++) quad(cop, T[j], F[j], F[(j + 1) % 4], T[(j + 1) % 4]);
        if (Math.abs(tc + A / 2 - TL) > 0.3) {                                                        // a stair up from the central floor between two legs; none where the lift stands (5 - 1 = 4: 154 stairs in all)
          const s0 = pol(4.2, tc + A / 2, Y0), s1 = pol(R - WS / 2, tc + HA, y), sx = new THREE.Vector3(-Math.sin(tc + A / 4), 0, Math.cos(tc + A / 4)).multiplyScalar(WS / 2), a0 = s0.clone().sub(sx), a1 = s1.clone().sub(sx), b0 = s0.clone().add(sx), b1 = s1.clone().add(sx);
          quad(top, a0, a1, b1, b0); quad(dark, a0, dn(a0, 0.01), dn(a1, SD), a1); quad(dark, b0, b1, dn(b1, SD), dn(b0, 0.01)); quad(cop, dn(a0, 0.01), dn(b0, 0.01), dn(b1, SD), dn(a1, SD)); rail(a0, a1); rail(b0, b1); stairs++;
        }
      }
    }
    const mesh = (arr, mat, order) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.computeVertexNormals(); const o = new THREE.Mesh(geo, mat); o.castShadow = mat !== m.oVGlass; if (order) o.renderOrder = order; g.add(o); return o; };
    mesh(top, m.oVTop); mesh(pave, m.oVPave).geometry.setAttribute('uv', new THREE.Float32BufferAttribute(puv, 2)); mesh(dark, m.oVDark); mesh(cop, m.oCopper); mesh(gl, m.oVGlass, 9); { const o = mesh(lit, m.oVLight, 8); o.castShadow = false; o.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(luv, 2)); }
    // (a copper cap line along every balustrade was tried and left out: at this size it read as wire and cluttered the form)
    // the lift: a dark track up the inside of the bowl at one place, with a glass cabin part of the way up
    const lt = [], NL = 24; for (let i = 0; i < NL; i++) { const ya = Y0 + (yAt(LV - 1) - Y0) * i / NL, yb = Y0 + (yAt(LV - 1) - Y0) * (i + 1) / NL, ra = rAt(ya) - W / 2 - 0.7, rb = rAt(yb) - W / 2 - 0.7; quad(lt, pol(ra, TL - 0.8 / ra, ya), pol(rb, TL - 0.8 / rb, yb), pol(rb, TL + 0.8 / rb, yb), pol(ra, TL + 0.8 / ra, ya)); }
    mesh(lt, m.oVDark); const yc = yAt(8), cab = box(g, 1.8, 2.3, 1.5, m.oVGlass, 0, 0, 0); cab.position.copy(pol(rAt(yc) - W / 2 - 1.5, TL, yc)); cab.rotation.y = -TL; cab.renderOrder = 9;
    // the plinth: three low round steps, and the central floor
    cyl(g, 12.0, 0.15, m.oWalk, 0, 0, 0, 60); cyl(g, 10.6, 0.3, m.oWalk, 0, 0, 0, 60); cyl(g, 9.2, Y0, m.oWalk, 0, 0, 0, 60);
    g.userData.stairs = stairs; return g;
  }
  function landmark() {
    const g = new THREE.Group(), W = 9, D = 8, F = 3.75, N = 6, H = F * N, tf = 4;
    for (let i = 0; i <= N; i++) box(g, W, 0.12, D, i ? m.tile : m.floor, 0, i * F - (i ? 0.06 : 0) + (i ? 0 : 0.01), 0);
    const geo = new THREE.BoxGeometry(W, H, D), shell = new THREE.Mesh(geo, m.oShell); shell.position.set(0, H / 2, 0); shell.renderOrder = 9; g.add(shell);
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo), m.oLine); l.position.copy(shell.position); g.add(l);
    box(g, 3, H, 3, m.steel, 0, 0, -1.2);                        // core
    for (const x of [-0.6, 0.6]) box(g, 0.9, 2.1, 0.04, m.dark, x, 0.13, 0.32);
    for (const x of [-1.5, -0.75, 0, 0.75, 1.5]) box(g, 0.15, 1.07, 1.5, m.steel, x, 0.13, 2.9);   // lobby gates
    const tfl = flat(g, W - 0.3, D - 0.3, m.target, 0, tf * F + 0.08, 0, 11);                       // target floor
    box(g, 0.28, tf * F, 0.28, m.rFill, 0, 0.13, 0.5);                                              // ride up the core
    const out = route([[0, D / 2 + 5, 0], [0, D / 2 + 0.2, 0]], m.rEdgeOut); g.add(out);
    const inn = route([[0, D / 2 + 0.2, 0.14], [0, 0.7, 0.14]], m.rEdgeIn); g.add(inn);
    youMarker(g, 0, D / 2 + 5, m.rEdgeOut);
    disc(g, 0.6, m.rEdgeIn, 0, tf * F + 0.1, 0.5, 12); disc(g, 0.48, m.rFill, 0, tf * F + 0.105, 0.5, 13); disc(g, 0.17, bas('#ffffff'), 0, tf * F + 0.11, 0.5, 14);
    return g;
  }

  /* ───────── added with 34 St–Hudson Yards: a deep station of the 2010s ───────── */
  const arcP = (hw, h, n = 16) => [...Array(n + 1)].map((_, i) => [-hw * Math.cos(Math.PI * i / n), h * Math.sin(Math.PI * i / n)]);   // half an ellipse
  // A surface swept from A to B: `profile` is a list of [across, up] points, `ax` the across direction. Texture coordinates in metres.
  function sweepG(g, profile, A, B, ax, mat) {
    const pos = [], uv = [], len = A.distanceTo(B); let v0 = 0;
    for (let i = 1; i < profile.length; i++) {
      const [u0, w0] = profile[i - 1], [u1, w1] = profile[i], v1 = v0 + Math.hypot(u1 - u0, w1 - w0);
      const p = (P, u, v) => [P.x + ax.x * u, P.y + v, P.z + ax.z * u];
      const a = p(A, u0, w0), b = p(A, u1, w1), c = p(B, u1, w1), d = p(B, u0, w0);
      pos.push(...a, ...b, ...c, ...a, ...c, ...d); uv.push(0, v0, 0, v1, len, v1, 0, v0, len, v1, len, v0); v0 = v1;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; g.add(mesh); return mesh;
  }
  const seg = (g, x0, z0, x1, z1, y, h, mat, t = 0.05) => {     // a thin upright panel between two points
    const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.05) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, h, t), mat); mesh.position.set((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2); mesh.rotation.y = -Math.atan2(z1 - z0, x1 - x0); mesh.castShadow = true; g.add(mesh); return mesh;
  };
  // A solid strip along a line of points (x, z), `w` wide, from y0 up to y1, as one piece with mitred corners: kerbs, edgings,
  // bench seats. `closed` joins the last point to the first; `off` shifts the strip sideways (to the left of the way it runs).
  function ribbon(g, pts, w, y0, y1, mat, closed = false, off = 0) {
    const P = closed && pts.length > 2 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts.slice(0, -1) : pts, n = P.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = closed ? P[(i - 1 + n) % n] : P[Math.max(0, i - 1)], b = P[i], c = closed ? P[(i + 1) % n] : P[Math.min(n - 1, i + 1)];
      let ax = -(b[1] - a[1]), az = b[0] - a[0], cx = -(c[1] - b[1]), cz = c[0] - b[0]; const la = Math.hypot(ax, az), lc = Math.hypot(cx, cz);
      if (la >= 1e-6) { ax /= la; az /= la; } if (lc >= 1e-6) { cx /= lc; cz /= lc; }           // both made unit length first…
      if (la < 1e-6) { ax = cx; az = cz; } if (lc < 1e-6) { cx = ax; cz = az; }                       // …then an end borrows its neighbour's direction (borrowing before that made the first end 2.9 times too wide)
      let nx = ax + cx, nz = az + cz; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; const k = 1 / Math.max(0.35, nx * ax + nz * az);
      L.push([b[0] + nx * k * (off + w / 2), b[1] + nz * k * (off + w / 2)]); R.push([b[0] + nx * k * (off - w / 2), b[1] + nz * k * (off - w / 2)]);
    }
    const pos = [], uv = [], m3 = (p, y) => [p[0], y, p[1]];
    const q = (a, b, c, d, ua, ub, uc, ud) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d, ...a, ...c, ...b, ...a, ...d, ...c); uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud, ...ua, ...uc, ...ub, ...ua, ...ud, ...uc); };   // texture coordinates in metres: along the strip, across it
    let run = 0;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n, d = Math.hypot(P[j][0] - P[i][0], P[j][1] - P[i][1]), u0 = run, u1 = run + d; run = u1;
      q(m3(L[i], y1), m3(L[j], y1), m3(R[j], y1), m3(R[i], y1), [u0, 0], [u1, 0], [u1, w], [u0, w]);
      q(m3(L[i], y0), m3(L[j], y0), m3(L[j], y1), m3(L[i], y1), [u0, 0], [u1, 0], [u1, y1 - y0], [u0, y1 - y0]);
      q(m3(R[i], y0), m3(R[j], y0), m3(R[j], y1), m3(R[i], y1), [u0, 0], [u1, 0], [u1, y1 - y0], [u0, y1 - y0]);
    }
    if (!closed) for (const i of [0, n - 1]) q(m3(L[i], y0), m3(R[i], y0), m3(R[i], y1), m3(L[i], y1), [0, 0], [w, 0], [w, y1 - y0], [0, y1 - y0]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    const o = new THREE.Mesh(geo, mat); o.castShadow = true; g.add(o); return o;
  }
  const steel2 = lam(BASE.steel, { side: THREE.DoubleSide }), tile2 = lam(BASE.tile, { side: THREE.DoubleSide });
  // Elliptical tunnel (drawing + photos, E): wall panels on the vault, three light lines, steel ribs every 3 m, and a stainless
  // ring in a tiled wall at the mouth. Runs along +z from 0; `rise` > 0 makes it an inclined shaft (no floor, ribs or ring by default).
  function tunnel(hw = 4.5, h = 4.4, len = 9, rise = 0, o = {}) {
    const g = new THREE.Group(), level = !rise, ribs = o.ribs ?? level, ring = o.ring ?? level, floor = o.floor ?? level;
    if (floor) box(g, 2 * hw, 0.4, len + 0.4, finish.paverFor(2 * hw, len + 0.4), 0, -0.4, len / 2 - 0.2);
    const skin = o.twoSided ? Object.assign(finish.panelWorld.clone(), { side: THREE.DoubleSide }) : finish.panelWorld;   // in a station the vault is seen from inside only
    sweepG(g, arcP(hw, h), V(0, 0, 0), V(0, rise, len), V(1, 0, 0), skin);
    for (const q of [-0.66, 0, 0.66]) { const lx = q * hw, ly = h * Math.sqrt(1 - q * q) - 0.12; bar(g, V(lx, ly, 0.5), V(lx, rise + ly, len - 0.5), 0.06, m.lamp); }
    if (ribs) for (let z = 3; z < len - 1; z += 3) sweepG(g, arcP(hw - 0.03, h - 0.03), V(0, 0, z), V(0, 0, z + 0.16), V(1, 0, 0), m.steel);
    if (ring) {
      sweepG(g, arcP(hw - 0.05, h - 0.05), V(0, 0, -0.55), V(0, 0, 0.35), V(1, 0, 0), steel2);
      const sp = new THREE.Shape([[-hw - 0.3, 0], [hw + 0.3, 0], [hw + 0.3, h + 0.1], [-hw - 0.3, h + 0.1]].map(q => new THREE.Vector2(q[0], q[1])));
      sp.holes.push(new THREE.Path(arcP(hw - 0.05, h - 0.05, 24).map(q => new THREE.Vector2(q[0], q[1]))));
      const face = new THREE.Mesh(new THREE.ShapeGeometry(sp), tile2); face.position.z = -0.5; g.add(face);
    }
    return g;
  }
  // Long stair beside escalators (photo, E): one straight flight, a stainless handrail each side on posts. Climbs +z from 0.
  function stairsLong(w = 1.6, rise = 3.0, n = 16, run = n * 0.3) {
    const g = new THREE.Group(), T = run / n, R = rise / n;
    for (let i = 0; i < n; i++) box(g, w, R, T, m.band, 0, i * R, (i + 0.5) * T);
    for (const e of [-w / 2 + 0.06, w / 2 - 0.06]) {
      bar(g, V(e, 0.95, 0), V(e, rise + 0.95, run), 0.025, m.steel);
      for (let i = 0; i <= n; i += 5) bar(g, V(e, i * R, i * T), V(e, i * R + 0.95, i * T), 0.018, m.steel);
    }
    return g;
  }
  // Platform-edge light (photos, E): a line of tube lights under the black band that carries the signs. Along x, centred.
  function edgeLight(len = 8) {
    const g = new THREE.Group(); box(g, len, 0.12, 0.18, m.lamp, 0, 3.28, 0); box(g, len, 0.55, 0.34, m.sign, 0, 3.4, 0); return g;
  }
  // Round tiled column (photo, E).
  function columnRound(h = 5.0, r = 0.45) { const g = new THREE.Group(); cyl(g, r, h, m.tile, 0, 0, 0, 24).castShadow = true; return g; }
  // Guard round an opening in the plaza (contractor's page + photos, E): dark stone 0.75 m with a glass guard 0.55 m on top.
  function guard(pts) {
    const g = new THREE.Group();
    ribbon(g, pts, 0.12, 0, 0.75, m.band); ribbon(g, pts, 0.03, 0.75, 1.3, m.glass).renderOrder = 9;                // one piece each, corners joined
    return g;
  }
  const horseshoe = (hw = 4, len = 7, round = 2.6) => [[-hw, len - round], ...[...Array(17)].map((_, i) => { const t = Math.PI * i / 16; return [-hw * Math.cos(t), -round * Math.sin(t)]; }), [hw, len - round]];
  // Inclined elevator (official: two at 34 St; drawn, not animated): a steel rail up the slope and a glass cabin at its foot. Climbs +z.
  function inclinedLift(rise = 6, run = rise / Math.tan(Math.PI / 6)) {
    const g = new THREE.Group(), len = Math.hypot(run, rise), rail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, len), m.steel);
    rail.position.set(0, rise / 2 + 0.06, run / 2); rail.rotation.x = -Math.atan2(rise, run); g.add(rail);
    box(g, 1.6, 2.3, 2.0, m.glass, 0, 0, -1.2).renderOrder = 9; box(g, 1.7, 0.1, 2.1, m.steel, 0, 2.3, -1.2);
    return g;
  }
  // Glass entrance canopy (engineer's and contractor's pages, B; outline from the map; heights and legs from photos, E).
  // A double-curved glass gridshell inside a free-form rim. The rim is high over the mouth and low at the back. It stands on
  // three upright Y-shaped supports (construction photographs): one a little back from each corner of the mouth, its front
  // arm meeting the rim at the corner, and one under the back tip.
  // The station name hangs across the mouth. At night the shell glows from inside and the sign is lit.
  //   ring  = the rim's outline in plan, points [x, z]            mouth = the two ends of the mouth's edge
  //   H     = the rim's height over the mouth (back: 1.1 m)
  const CANOPY34 = { ring: [[9.2, 2.3], [9.4, 0.8], [9.3, -0.6], [8.9, -2.2], [8.2, -3.9], [7.3, -5.3], [6.2, -6.8], [4.6, -7.8], [3, -8.4], [1.3, -8.6], [-0.4, -8.5], [-1.8, -8.3], [-3.5, -7.8], [-5, -7], [-6.5, -5.9], [-7.6, -4.7], [-8.4, -3.2], [-8.9, -1.6], [-9.1, -0], [-9.1, 1.6], [-8.8, 3.4], [-8.1, 4.9], [-7.4, 5.8], [-6.6, 6.3], [-5.5, 6.6], [-4.9, 6.6], [-3.2, 6.6], [-1.7, 6.5], [0.3, 6.3], [1.2, 6.2], [2.7, 5.9], [4.6, 5.2], [6.5, 4.6], [7.3, 4.2], [8, 3.9], [8.7, 3.3]], mouth: [[-6.6, 6.3], [7.3, 4.2]] };
  function canopy(o = {}) {
    const g = new THREE.Group(), P = o.ring || CANOPY34.ring, MO = o.mouth || CANOPY34.mouth, H = o.H ?? 6.7, hb = o.back ?? 1.1, name = o.name || '34 Street–Hudson Yards Subway Station', line = o.line || '7';
    const cx = P.reduce((a, q) => a + q[0], 0) / P.length, cz = P.reduce((a, q) => a + q[1], 0) / P.length;
    const mx = (MO[0][0] + MO[1][0]) / 2, mz = (MO[0][1] + MO[1][1]) / 2, nl = Math.hypot(mx - cx, mz - cz), nx = (mx - cx) / nl, nz = (mz - cz) / nl, tx = -nz, tz = nx;   // n: out of the mouth; t: along it
    const chord = Math.hypot(MO[1][0] - MO[0][0], MO[1][1] - MO[0][1]), dir = th => [nx * Math.cos(th) + tx * Math.sin(th), nz * Math.cos(th) + tz * Math.sin(th)];
    const reach = th => {                                       // how far the rim is from the centre in direction th
      const [dx, dz] = dir(th); let best = 0;
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], ex = b[0] - a[0], ez = b[1] - a[1], den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue; const u = ((a[0] - cx) * ez - (a[1] - cz) * ex) / den, v = ((a[0] - cx) * dz - (a[1] - cz) * dx) / den; if (u > 0 && v >= 0 && v <= 1) best = Math.max(best, u); }
      return best;
    };
    // The map's outline is traced by hand and has kinks; the real rim is one smooth curve, alike on both sides of the mouth's
    // axis. So the outline is fitted with a smooth closed curve: its distance from the centre as a few cosine waves of the angle.
    const N = 96, raw = [...Array(N)].map((_, i) => reach(i / N * Math.PI * 2));
    const fit = KH => { const c = [...Array(KH + 1)].map((_, k) => raw.reduce((a, r, i) => a + r * Math.cos(k * i / N * Math.PI * 2), 0) / N * (k ? 2 : 1)); return [...Array(N + 1)].map((_, i) => c.reduce((a, q, k) => a + q * Math.cos(k * i / N * Math.PI * 2), 0)); };
    const bulges = R => { const q = i => { const a = (i % N) / N * Math.PI * 2; return [R[i % N] * Math.cos(a), R[i % N] * Math.sin(a)]; }; for (let i = 0; i < N; i++) { const a = q(i), b = q(i + 1), c = q(i + 2); if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-6) return false; } return true; };
    let RR = null; for (const KH of o.smooth ? [o.smooth] : [4, 3, 2, 1]) { RR = fit(KH); if (bulges(RR)) break; }   // the most detail that still bulges outward all the way round: no dents, no waves
    const reachAt = th => { const k = ((th / (Math.PI * 2)) % 1 + 1) % 1 * N, i = Math.floor(k); return RR[i] + (RR[i + 1] - RR[i]) * (k - i); };
    const TH0 = 0, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    const rimY = th => hb + (H - hb) * Math.pow(Math.max(0, Math.cos(Math.min(1, Math.abs(wrap(th - TH0)) / (150 * Math.PI / 180)) * Math.PI / 2)), 3);   // high over the mouth, low at the back
    const CROWN = hb + (H - hb) * 0.8, at = (th, r) => { const [dx, dz] = dir(th), R = reachAt(th) * r; return V(cx + dx * R, rimY(th) * r * r + CROWN * (1 - r * r), cz + dz * R); };
    const yAt = (x, z) => { const px = x - cx, pz = z - cz, th = Math.atan2(px * tx + pz * tz, px * nx + pz * nz), r = Math.min(1, Math.hypot(px, pz) / reachAt(th)); return rimY(th) * r * r + CROWN * (1 - r * r); };
    const RN = 8, pos = [], idx = [];
    for (let j = 0; j <= RN; j++) for (let i = 0; i <= N; i++) { const p = at(i / N * Math.PI * 2, j / RN); pos.push(p.x, p.y, p.z); }
    for (let j = 0; j < RN; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const glass = m.glass.clone(); glass.side = THREE.DoubleSide; const shell = new THREE.Mesh(geo, glass); shell.renderOrder = 9; g.add(shell);
    const glow = new THREE.Mesh(geo, m.nGlow); glow.renderOrder = 10; g.add(glow);
    for (const th of [0, 1.05, -1.05, 2.1, -2.1, Math.PI]) { const p = at(th, 0.5); const lp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), m.nLamp); lp.position.set(p.x, p.y - 0.35, p.z); g.add(lp); }
    const bars = [], ext = Math.max(...RR) + 1;                  // the grid of bars: straight in plan every 1.35 m both ways, square to the mouth
    for (const along of [0, 1]) for (let u = -Math.floor(ext / 1.35) * 1.35; u < ext; u += 1.35) {
      let prev = null;
      for (let k = 0; k <= 40; k++) { const v = -ext + 2 * ext * k / 40, a = along ? v : u, b = along ? u : v, x = cx + nx * a + tx * b, z = cz + nz * a + tz * b, ok = Math.hypot(a, b) < reachAt(Math.atan2(b, a)) - 0.05, p = ok ? [x, yAt(x, z) - 0.03, z] : null; if (prev && p) bars.push(...prev, ...p); prev = p; }
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bars, 3)); g.add(new THREE.LineSegments(bg, m.nBars));
    const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...Array(N)].map((_, i) => at(i / N * Math.PI * 2, 1)), true), 240, 0.2, 10, true), m.steel); rim.castShadow = true; g.add(rim);
    // The supports (construction photographs; the view of both entrances from above). Each is an upright Y: a short stem on a
    // footing just outside the rim, and two arms up to the rim either side of it, about as steep as they are long.
    const ySupport = (thF, spread, out, r) => {
      const [dx, dz] = dir(thF), R = reachAt(thF) + out, fx = cx + dx * R, fz = cz + dz * R, top = V(fx, 0.9, fz);
      box(g, 1.0, 0.35, 1.0, m.dark, fx, 0, fz); bar(g, V(fx, 0.3, fz), top, r * 1.15, m.steel).castShadow = true;
      for (const a of spread) bar(g, at(thF + a, 1), top, r, m.steel).castShadow = true;
    };
    const thOf = q => Math.atan2((q[0] - cx) * tx + (q[1] - cz) * tz, (q[0] - cx) * nx + (q[1] - cz) * nz);
    for (const q of MO) { const th = thOf(q), s = Math.sign(th); ySupport(th + s * 0.30, [-s * 0.27, s * 0.33], 1.0, 0.17); }   // one a little way back from each corner of the mouth: the front arm meets the rim at the corner
    ySupport(Math.PI, [-0.2, 0.2], 0.5, 0.13);                    // one under the back tip
    const sg = new THREE.Group(); sg.position.set(mx - nx * 1.0, 0, mz - nz * 1.0); sg.rotation.y = Math.atan2(nx, nz); g.add(sg);   // across the mouth: the station name, lit at night
    const sw = chord * 0.86, sh = sw / 9, lineCol = (LINES.find(l => l[0] === line) || [0, NQRW])[1];
    const sign = bas('#ffffff', { map: tex(1440, 160, (c, w, h) => { c.fillStyle = BASE.sign; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, 10); c.font = `bold ${h * 0.4}px ${FONT}`; c.textBaseline = 'middle'; c.fillText(name, 34, h * 0.57); bullet(c, w - h * 0.62, h * 0.57, h * 0.32, line, lineCol, false); }) });
    for (const ry of [0, Math.PI]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), sign); p.position.set(0, 3.0, ry ? -0.06 : 0.06); p.rotation.y = ry; sg.add(p); }
    box(sg, sw, sh, 0.1, m.sign, 0, 3.0 - sh / 2, 0); box(sg, sw + 0.1, sh + 0.1, 0.07, m.nSign, 0, 3.0 - sh / 2 - 0.05, 0);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(sw + 1.2, sh + 1.2), m.nHalo); halo.position.set(0, 3.0, 0); halo.renderOrder = 11; sg.add(halo);
    for (const q of [-0.38, 0.38]) { const wx = sg.position.x - tx * sw * q, wz = sg.position.z - tz * sw * q, y0 = 3.0 + sh / 2, y1 = yAt(wx, wz) - 0.05; if (y1 > y0) box(g, 0.04, y1 - y0, 0.04, m.steel, wx, y0, wz); }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), m.oPool); pool.rotation.x = -Math.PI / 2; pool.scale.set(chord * 0.6, 5, 1); pool.position.set(0, 0.03, 4.0); pool.renderOrder = 3; sg.add(pool);   // light on the paving before the mouth
    return g;
  }
  const bollards = (pts) => { const g = new THREE.Group(); for (const [x, z] of pts) cyl(g, 0.16, 1.0, m.steel, x, 0, z, 16).castShadow = true; return g; };   // steel bollards, 1.0 m (photos)
  // Finishes sample: pavers, wall panels with a dark base, ceiling panels with a downlight.
  function finishes() {
    const g = new THREE.Group();
    box(g, 3.6, 0.1, 3.0, finish.paverFor(3.6, 3.0), 0, 0, 0); box(g, 3.6, 2.7, 0.1, finish.panelFor(3.6, 2.7), 0, 0.1, -1.45); box(g, 3.6, 0.45, 0.04, m.band, 0, 0.1, -1.38);
    box(g, 3.6, 0.06, 1.5, finish.ceilingFor(3.6, 1.5), 0, 2.8, -0.75); box(g, 0.36, 0.03, 0.36, m.lamp, 0, 2.77, -0.75);
    shadow(g, 4.4, 3.8); return g;
  }
  const sample = (obj, w, d, x = 0, z = 0) => { shadow(obj, w, d, x, z); return obj; };

  /* ───────── more street entrances (each stands on y = 0; the stair opening is drawn flat, entered from −x) ───────── */
  const opening = (g, L, W, x = 0, z = 0) => { flat(g, L, W, m.dark, x, 0.014, z, 1); for (let i = 0; i < Math.floor(L / 0.5) - 1; i++) flat(g, 0.08, W - 0.1, m.edge, x - L / 2 + 0.5 + i * 0.5, 0.016, z, 2); };
  const globeLamp = (g, x, z, h = 2.7) => {                      // green over white globe on a post; it glows at night
    cyl(g, 0.055, h, m.oStreet, x, 0, z);
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.oGlobeTop); top.position.set(x, h + 0.2, z); g.add(top);
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), m.oGlobeBot); bot.position.set(x, h + 0.2, z); g.add(bot);
    const halo = new THREE.Sprite(m.oHalo); halo.position.set(x, h + 0.2, z); halo.scale.set(1.6, 1.6, 1); g.add(halo);
  };
  const nameSign = (w, h, name = '28 St Station', letters = 'RW', big = false) => pic(signTex(Math.round(256 * w / h), 256, (c, W, H) => {
    c.font = `700 ${H * (big ? 0.34 : 0.3)}px ${FONT}`; c.textAlign = 'left'; c.fillText(name, H * 0.14, H * (big ? 0.56 : 0.36));
    [...letters].forEach((l, i) => { const ln = LINES.find(q => q[0] === l) || [l, NQRW, true]; big ? bullet(c, W - H * (0.42 + 0.62 * (letters.length - 1 - i)), H * 0.56, H * 0.26, l, ln[1], !!ln[2]) : bullet(c, H * 0.3 + i * H * 0.42, H * 0.72, H * 0.18, l, ln[1], !!ln[2]); });
  }));
  // Stair with a masonry parapet (D): low stone walls on three sides, a steel handrail on top, a globe lamp each side of the way in.
  function entranceWall() {
    const g = new THREE.Group(), L = 4.2, W = 1.8, H = 0.95, t = 0.25;
    opening(g, L, W);
    for (const sz of [1, -1]) { box(g, L + t, H, t, m.oStone, t / 2, 0, sz * (W / 2 + t / 2)); bar(g, V(-L / 2, H + 0.12, sz * (W / 2 + t / 2)), V(L / 2 + t, H + 0.12, sz * (W / 2 + t / 2)), 0.03, m.oSteel); globeLamp(g, -L / 2 - 0.15, sz * (W / 2 + t / 2)); }
    box(g, t, H, W, m.oStone, L / 2 + t / 2, 0, 0);
    const sg = nameSign(1.5, 0.6); for (const sx of [1, -1]) face(g, 1.5, 0.6, sg, L / 2 + t / 2 + sx * 0.04, H + 0.75, 0, sx * Math.PI / 2);
    box(g, 0.05, 0.6, 1.5, m.sign, L / 2 + t / 2, H + 0.45, 0); for (const z of [-0.6, 0.6]) box(g, 0.05, 0.45, 0.05, m.oSteel, L / 2 + t / 2, H, z);
    shadow(g, L + 2, W + 2); return g;
  }
  // Stair under a glass canopy (D; as at stations rebuilt since the 2010s): steel posts, a glass roof falling to the back,
  // glass guards on the long sides, the station name on the fascia over the way in.
  function entranceCanopy() {
    const g = new THREE.Group(), L = 5.0, W = 2.2, H = 2.9;
    opening(g, L, W);
    for (const sz of [1, -1]) {
      const z = sz * (W / 2 + 0.1);
      for (const x of [-L / 2, 0, L / 2]) box(g, 0.1, x < 0 ? H : H - 0.25 * (x + L / 2) / L, 0.1, m.oSteel, x, 0, z);
      box(g, L, 0.25, 0.08, m.oSteel, 0, 0, z); box(g, L, 0.85, 0.03, m.glass, 0, 0.25, z).renderOrder = 9; bar(g, V(-L / 2, 1.1, z), V(L / 2, 1.1, z), 0.025, m.oSteel);
      bar(g, V(-L / 2 - 0.4, H + 0.05, z), V(L / 2 + 0.3, H - 0.2, z), 0.05, m.oSteel);
    }
    box(g, 0.08, 0.25, W + 0.2, m.oSteel, L / 2, 0, 0); box(g, 0.03, 0.85, W + 0.2, m.glass, L / 2, 0.25, 0).renderOrder = 9;
    const roof = box(g, L + 0.7, 0.04, W + 0.7, m.glass, -0.05, H - 0.07, 0); roof.rotation.z = -Math.atan2(0.25, L); roof.renderOrder = 9;
    box(g, 0.08, 0.5, W + 0.3, m.sign, -L / 2 - 0.4, H - 0.5, 0); face(g, W + 0.3, 0.5, nameSign(W + 0.3, 0.5, '28 St Station', 'RW', true), -L / 2 - 0.45, H - 0.25, 0, -Math.PI / 2);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 32), m.oPool); pool.rotation.x = -Math.PI / 2; pool.scale.set(L * 0.8, W * 1.3, 1); pool.position.set(-0.6, 0.03, 0); pool.renderOrder = 3; g.add(pool);
    shadow(g, L + 2.4, W + 2.4); return g;
  }
  // Entrance inside a building (D): a doorway in the street wall, the stair going down inside, the sign over it, a globe lamp each side.
  function entranceBuilding() {
    const g = new THREE.Group(), WW = 7.0, WH = 5.2, t = 0.4, pw = 2.6, ph = 2.8;
    for (const sx of [1, -1]) box(g, (WW - pw) / 2, WH, t, m.oStone, sx * (pw / 2 + (WW - pw) / 4), 0, 0);
    box(g, pw, WH - ph, t, m.oStone, 0, ph, 0);
    box(g, pw, ph, 0.05, m.dark, 0, 0, -t / 2 - 2.2); for (const sx of [1, -1]) box(g, 0.05, ph, 2.2, m.dark, sx * pw / 2, 0, -t / 2 - 1.1); box(g, pw, 0.05, 2.2, m.dark, 0, ph, -t / 2 - 1.1);
    flat(g, pw - 0.1, 2.2, m.dark, 0, 0.014, -t / 2 - 1.1, 1); for (let i = 0; i < 4; i++) flat(g, pw - 0.2, 0.08, m.edge, 0, 0.016, -t / 2 - 0.4 - i * 0.5, 2);
    box(g, pw + 0.6, 0.6, 0.06, m.sign, 0, ph + 0.15, t / 2 + 0.03); face(g, pw + 0.6, 0.6, nameSign(pw + 0.6, 0.6, '28 St Station', 'RW', true), 0, ph + 0.45, t / 2 + 0.07);
    for (const sx of [1, -1]) globeLamp(g, sx * (pw / 2 + 0.55), t / 2 + 0.25, 2.2);
    for (const [x, y] of [[-2.4, 3.9], [2.4, 3.9], [0, 4.3]]) face(g, 1.2, 0.9, m.oWin, x, y, t / 2 + 0.01);
    shadow(g, WW + 1.5, 4, 0, -0.6); return g;
  }
  // Street elevator (D): a glass headhouse on steel posts with a flat roof, the door on the front, the sign over it.
  function elevatorKiosk(letters = 'RW') {
    const g = new THREE.Group(), W = 2.4, D = 2.8, H = 3.0;
    for (const sx of [1, -1]) for (const sz of [1, -1]) box(g, 0.1, H, 0.1, m.oSteel, sx * W / 2, 0, sz * D / 2);
    box(g, W, 0.3, D, m.oSteel, 0, 0, 0);
    for (const sz of [1, -1]) box(g, W, H - 0.3, 0.03, m.glass, 0, 0.3, sz * D / 2).renderOrder = 9;
    for (const sx of [1, -1]) box(g, 0.03, H - 0.3, D, m.glass, sx * W / 2, 0.3, 0).renderOrder = 9;
    box(g, W + 0.5, 0.12, D + 0.5, m.oSteel, 0, H, 0);
    box(g, 1.3, 2.2, 0.06, m.dark, 0, 0, D / 2 + 0.03); for (const sx of [1, -1]) box(g, 0.5, 2.0, 0.03, m.oSteel, sx * 0.27, 0.05, D / 2 + 0.07);
    box(g, W, 0.45, 0.05, m.sign, 0, H - 0.5, D / 2 + 0.04); face(g, W, 0.45, nameSign(W, 0.45, 'Elevator', letters, true), 0, H - 0.275, D / 2 + 0.07);
    box(g, 0.25, 0.25, 0.06, m.oSteel, 0.95, 1.0, D / 2 + 0.04);                                        // call button
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 32), m.oPool); pool.rotation.x = -Math.PI / 2; pool.scale.set(2.2, 1.8, 1); pool.position.set(0, 0.03, D / 2 + 1.2); pool.renderOrder = 3; g.add(pool);
    shadow(g, W + 2, D + 2); return g;
  }

  /* ───────── street planting: light, faceted shapes in the street green ───────── */
  // Tree crowns: translucent, and the further from the viewer the more so (palette: CROWN). Drawn in two passes, depth first and
  // colour second, so a crown reads as one even veil: the balls it is made of do not show through each other.
  const crownMats = [], crownDepth = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true });
  const crownMat = (day, night = NIGHT.street, flat = true) => {
    const mat = lam(day, { flatShading: flat, transparent: true }); mat.userData.day = day; mat.userData.night = night;
    mat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>\n\tgl_FragColor.a *= mix(${CROWN.near.toFixed(3)}, ${CROWN.far.toFixed(3)}, smoothstep(${CROWN.d0.toFixed(1)}, ${CROWN.d1.toFixed(1)}, length(vViewPosition)));`); };
    crownMats.push(mat); return mat;
  };
  m.oCrown = crownMat(BASE.leaf); m.oTrunkFade = crownMat(BASE.band, NIGHT.steel, false);     // the trunk fades with its crown
  const veil = (g, mesh) => { const d = mesh.clone(); d.material = crownDepth; d.renderOrder = 20; mesh.renderOrder = 21; g.add(d, mesh); return mesh; };
  const crownBall = (g, r, x, y, z, sy, mat) => {
    const geo = new THREE.IcosahedronGeometry(r, 1);
    for (const [mm, order] of [[crownDepth, 20], [mat, 21]]) { const b = new THREE.Mesh(geo, mm); b.position.set(x, y, z); b.scale.y = sy; b.rotation.y = x * 1.7 + z; b.renderOrder = order; g.add(b); }
  };
  const leafBall = (g, r, x, y, z, sy = 1) => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), m.oLeaf); b.position.set(x, y, z); b.scale.y = sy; b.rotation.y = x * 1.7 + z; b.castShadow = true; g.add(b); return b; };
  const pit = (g, w = 1.5, l = 3.0) => flat(g, l, w, m.oSoil, 0, 0.014, 0, 1);       // tree bed, 1.5 × 3 m (5 × 10 ft)
  // Street tree (D): a trunk in a tree bed and a crown of three faceted balls. `h` total height, `r` crown radius.
  function tree(h = 9, r = 2.6, guarded = false, bedded = true) {   // bedded = false: the tree stands in a planting bed, so it has no bed of its own
    const leaf = m.oCrown;
    const g = new THREE.Group(), th = h - r * 1.5, tr = 0.05 + h * 0.014;
    if (bedded) pit(g);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(tr * 0.7, tr, th + r * 0.5, 10), m.oTrunkFade); trunk.position.y = (th + r * 0.5) / 2; veil(g, trunk);
    crownBall(g, r, 0, th + r * 0.75, 0, 0.9, leaf); crownBall(g, r * 0.72, r * 0.55, th + r * 0.45, r * 0.25, 0.85, leaf); crownBall(g, r * 0.66, -r * 0.5, th + r * 0.55, -r * 0.35, 0.85, leaf);
    if (h < 6) for (const sx of [1, -1]) { cyl(g, 0.03, 1.8, m.oTrunk, sx * 0.45, 0, 0, 8); bar(g, V(sx * 0.45, 1.5, 0), V(0, 1.5, 0), 0.012, m.oTrunk); }   // a young tree is staked
    if (guarded) for (const [ax, az, bx, bz] of [[-1.5, -0.75, 1.5, -0.75], [1.5, -0.75, 1.5, 0.75], [-1.5, -0.75, -1.5, 0.75]]) {    // tree guard: 0.45 m, open on the kerb side
      bar(g, V(ax, 0.45, az), V(bx, 0.45, bz), 0.02, m.oStreet); bar(g, V(ax, 0.2, az), V(bx, 0.2, bz), 0.012, m.oStreet);
      const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.75); for (let i = 0; i <= n; i++) cyl(g, 0.02, 0.45, m.oStreet, ax + (bx - ax) * i / n, 0, az + (bz - az) * i / n, 8);
    }
    shadow(g, r * 2.6, r * 2.6); return g;
  }
  function shrub(r = 0.6) { const g = new THREE.Group(); leafBall(g, r, 0, r * 0.7, 0, 0.8); leafBall(g, r * 0.75, r * 0.8, r * 0.5, 0.2, 0.75); leafBall(g, r * 0.7, -r * 0.7, r * 0.5, -0.25, 0.8); shadow(g, r * 4, r * 3); return g; }
  function hedge(len = 4, h = 0.9, d = 0.7) {                     // a clipped hedge: a faceted block
    const g = new THREE.Group(), geo = new THREE.BoxGeometry(len, h, d, Math.max(2, Math.round(len / 0.8)), 2, 2), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = Math.sin(p.getX(i) * 3.1 + p.getZ(i) * 5.3 + p.getY(i) * 4.7) * 0.05; p.setXYZ(i, p.getX(i) + k, p.getY(i) + (p.getY(i) > 0 ? k : 0), p.getZ(i) + k); }
    geo.computeVertexNormals(); const b = new THREE.Mesh(geo, m.oLeaf); b.position.y = h / 2; b.castShadow = true; g.add(b); shadow(g, len + 1, d + 1.2); return g;
  }
  function planter(round = false) {                              // a planter with shrubs: a stone box 2.4 × 0.8 × 0.6 m, or a round tub 1.2 m across
    const g = new THREE.Group();
    if (round) { cyl(g, 0.6, 0.65, m.oStone, 0, 0, 0, 20).castShadow = true; disc(g, 0.52, m.oSoil, 0, 0.655, 0); leafBall(g, 0.5, 0, 1.0, 0, 0.85); shadow(g, 2.2, 2.2); }
    else { box(g, 2.4, 0.6, 0.8, m.oStone).castShadow = true; flat(g, 2.2, 0.6, m.oSoil, 0, 0.605, 0); for (const x of [-0.75, 0, 0.75]) leafBall(g, 0.38, x, 0.85, 0, 0.8); shadow(g, 3.4, 1.8); }
    return g;
  }
  // A planting bed or a lawn of any outline (points in x, z, on y = 0): a low stone kerb, ground cover, and shrubs set out
  // on a loose grid inside it. The same every time for the same outline.
  const inside = (x, z, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
  function bed(pts, o = {}) {
    const g = new THREE.Group(), rail = o.rail ?? false, kerb = (o.kerb ?? true) && !rail, every = o.every ?? 2.6, y = o.y ?? (kerb ? 0.1 : 0.06);
    const cover = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts.map(q => new THREE.Vector2(q[0], -q[1])))), m.oLeaf); cover.rotation.x = -Math.PI / 2; cover.position.y = y; cover.receiveShadow = true; g.add(cover);
    if (kerb) ribbon(g, pts, 0.12, 0, 0.15, m.oStone, true);    // one kerb all round, corners mitred
    if (rail) {                                                   // a tree bed by the kerb (street imagery): flush with the paving, a low black rail round it
      ribbon(g, pts, 0.03, 0.4, 0.44, m.oRail, true);
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.9)); for (let k = 0; k < n; k++) cyl(g, 0.014, 0.42, m.oRail, a[0] + (b[0] - a[0]) * k / n, 0, a[1] + (b[1] - a[1]) * k / n, 6); }
    }
    if (every) {
      const xs = pts.map(q => q[0]), zs = pts.map(q => q[1]);
      for (let x = Math.min(...xs) + every / 2; x < Math.max(...xs); x += every) for (let z = Math.min(...zs) + every / 2; z < Math.max(...zs); z += every) {
        const k = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453, r1 = k - Math.floor(k), r2 = (k * 7.13) - Math.floor(k * 7.13), px = x + (r1 - 0.5) * every * 0.6, pz = z + (r2 - 0.5) * every * 0.6, r = 0.34 + r1 * 0.22;
        if ([[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]].every(([dx, dz]) => inside(px + dx, pz + dz, pts))) leafBall(g, r, px, y + r * 0.7, pz, 0.8);
      }
    }
    return g;
  }
  function plantBed() {                                           // a planting bed: a low kerb, ground cover, shrubs and a small tree
    const g = new THREE.Group(), L = 5, W = 2;
    for (const sz of [1, -1]) box(g, L, 0.15, 0.12, m.oStone, 0, 0, sz * W / 2); for (const sx of [1, -1]) box(g, 0.12, 0.15, W, m.oStone, sx * L / 2, 0, 0);
    flat(g, L - 0.12, W - 0.12, m.oSoil, 0, 0.05, 0, 1); box(g, L - 0.4, 0.12, W - 0.4, m.oLeaf, 0, 0.05, 0);
    for (const [x, z, r] of [[-1.7, 0.2, 0.45], [-0.6, -0.3, 0.38], [1.9, 0.25, 0.5], [1.0, -0.35, 0.34]]) leafBall(g, r, x, r * 0.75 + 0.1, z, 0.8);
    shadow(g, L + 1.4, W + 1.4); return g;
  }

  /* ───────── park landscape: planted mounds, benches that wrap them, lamps ───────── */
  // A planted mound of any outline (points in x, z). No kerb: the ground rises from the paving edge to about 1.1 m, steeper at
  // the edge and flattening toward the middle; low shrubs stand thick along the edge and thin out up the slope, so the planting
  // itself makes the boundary (how the park's beds read in photographs). `heightAt(x, z)` gives the ground height, for trees.
  function mound(pts, o = {}) {
    const g = new THREE.Group(), HM = o.h ?? 1.1, shrubs = o.shrubs ?? true, full = o.full ?? false, sparse = o.sparse ?? false, P = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts.slice(0, -1) : pts, n = P.length;
    const edge = (x, z) => { let d = 1e9; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1))); d = Math.min(d, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t)); } return d; };
    const heightAt = (x, z) => inside(x, z, P) ? HM * (1 - Math.exp(-edge(x, z) / 1.7)) : 0;
    const base = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(P.map(q => new THREE.Vector2(q[0], -q[1])))), m.oLeaf); base.rotation.x = -Math.PI / 2; base.position.y = 0.04; g.add(base);
    const xs = P.map(q => q[0]), zs = P.map(q => q[1]), x0 = Math.min(...xs), z0 = Math.min(...zs), S = 0.8, nx = Math.ceil((Math.max(...xs) - x0) / S), nz = Math.ceil((Math.max(...zs) - z0) / S), H = [], pos = [];
    // The surface is a square mesh. A mesh point that falls outside the outline is moved onto the nearest point of the outline,
    // at ground level, so the mound ends on its own smooth edge and not in steps.
    const snap = (x, z) => { let d = 1e9, r = [x, z]; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1))), px = a[0] + vx * t, pz = a[1] + vz * t, q = Math.hypot(x - px, z - pz); if (q < d) { d = q; r = [px, pz]; } } return r; };
    for (let i = 0; i <= nx; i++) { H.push([]); for (let j = 0; j <= nz; j++) { const x = x0 + i * S, z = z0 + j * S, on = inside(x, z, P), q = on ? [x, z] : snap(x, z); H[i].push([q[0], on ? heightAt(x, z) + 0.04 : 0.04, q[1], on]); } }
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => H[a][b]); if (!c.some(v => v[3])) continue;
      const v = c.map(q => q.slice(0, 3)); pos.push(...v[0], ...v[2], ...v[1], ...v[0], ...v[3], ...v[2]);
    }
    // shading follows the mound's own slope at each point, not the mesh's triangles, so the surface reads as one smooth form
    const nor = [], hh = (x, z) => heightAt(x, z); for (let i = 0; i < pos.length; i += 3) { const x = pos[i], z = pos[i + 2], e = 0.3, gx = (hh(x + e, z) - hh(x - e, z)) / (2 * e), gz = (hh(x, z + e) - hh(x, z - e)) / (2 * e), l = Math.hypot(gx, 1, gz); nor.push(-gx / l, 1 / l, -gz / l); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const hill = new THREE.Mesh(geo, m.oHill); hill.receiveShadow = true; g.add(hill);
    if (shrubs) for (let x = x0 + 0.6; x < x0 + nx * S; x += 1.5) for (let z = z0 + 0.6; z < z0 + nz * S; z += 1.5) {
      const k = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453, r1 = k - Math.floor(k), r2 = (k * 7.13) - Math.floor(k * 7.13), px = x + (r1 - 0.5) * 0.9, pz = z + (r2 - 0.5) * 0.9;
      if (!inside(px, pz, P)) continue; const d = edge(px, pz); if (d < 0.35 || (d > 2.4 && r1 > (full ? 0.72 : 0.35))) continue; if (sparse && (d > 2.0 ? r2 > 0.1 : r1 > 0.3)) continue;   // sparse: a few along the edge, hardly any further in      // a thick band along the edge, a scatter further in (full: most of the ground planted)
      const r = d < 2.4 ? 0.3 + r2 * 0.22 : 0.4 + r2 * 0.3; leafBall(g, r, px, heightAt(px, pz) + r * 0.55, pz, 0.8);
    }
    if (o.rail) {                                                 // a lawn: a low rail round it keeps feet off the edge planting
      const R = [...P, P[0]]; ribbon(g, R, 0.03, 0.3, 0.33, m.oRail, true);
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], c = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.2)); for (let k = 0; k < c; k++) cyl(g, 0.014, 0.31, m.oRail, a[0] + (b[0] - a[0]) * k / c, 0, a[1] + (b[1] - a[1]) * k / c, 6); }
    }
    g.userData.heightAt = heightAt; return g;
  }
  // A long bench that follows a curve (points in x, z along its middle): a wooden seat and back on a dark base, the back on
  // the side given (`back`: +1 = to the left of the way the points run). The park's seats wrap its planting like this.
  function benchCurve(pts, back = 1) {
    const g = new THREE.Group();
    if (!back) { ribbon(g, pts, 0.7, 0, 0.38, m.oSoil); ribbon(g, pts, 0.9, 0.38, 0.45, m.oSlat); return g; }   // back = 0: a broad platform without a back, to sit on from either side (the fountain benches)
    ribbon(g, pts, 0.4, 0, 0.38, m.oSoil, false, back * 0.03); ribbon(g, pts, 0.52, 0.38, 0.45, m.oSlat); ribbon(g, pts, 0.06, 0.45, 0.84, m.oSlat, false, back * 0.23);   // seat, base and back end together, square
    return g;
  }
  // Park lamp (photographs: a black post with a lantern, of the kind used in New York parks; sizes D): post 3.3 m, lantern 0.6 m.
  // The lantern glows at night and throws a pool of light.
  function parkLamp() {
    const g = new THREE.Group();
    cyl(g, 0.11, 0.5, m.oLampPost, 0, 0, 0, 10); cyl(g, 0.05, 3.3, m.oLampPost, 0, 0, 0, 10); cyl(g, 0.16, 0.06, m.oLampPost, 0, 3.3, 0, 10);
    const lan = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.5, 8), m.oLantern); lan.position.set(0, 3.61, 0); g.add(lan);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 8), m.oLampPost); cap.position.set(0, 3.97, 0); g.add(cap);
    const halo = new THREE.Sprite(m.oLampHalo); halo.position.set(0, 3.6, 0); halo.scale.set(1.5, 1.5, 1); g.add(halo);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), m.oPool); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.035; pool.renderOrder = 3; g.add(pool);
    return g;
  }
  // Street light. NYC Street Design Manual: the standard street light is a tapered eight-sided steel pole with an LED
  // cobra-head lamp. Street imagery of Hudson Boulevard East (April 2026): such a pole at the kerb with a long straight arm
  // rising a little over the roadway. `davit` = true gives the curved Davit pole (30 ft), the manual's alternative, seen at
  // W 34th St. The arm runs along +x. Lit at night. Height from the manual's Davit; arm length and lamp size D.
  function streetLight(davit = false) {
    const g = new THREE.Group(), H = 9.1, R = davit ? 2.4 : 3.6;
    box(g, 0.4, 0.45, 0.4, m.oSteel);
    if (davit) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, H - R, 8), m.oSteel); shaft.position.y = (H - R) / 2; g.add(shaft);
      const pts = [...Array(9)].map((_, i) => { const a = i / 8 * Math.PI / 2; return V(R - R * Math.cos(a), H - R + R * Math.sin(a), 0); });
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.06, 8), m.oSteel));
    } else {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, H - 0.5, 8), m.oSteel); shaft.position.y = (H - 0.5) / 2; g.add(shaft);
      bar(g, V(0, H - 1.0, 0), V(R + 0.3, H, 0), 0.05, m.oSteel); bar(g, V(0, H - 2.2, 0), V(R * 0.45, H - 0.55, 0), 0.025, m.oSteel);
    }
    box(g, 0.75, 0.12, 0.3, m.oSteel, R + 0.3, H - 0.06, 0); box(g, 0.5, 0.03, 0.22, m.oLantern, R + 0.35, H - 0.09, 0);
    const halo = new THREE.Sprite(m.oLampHalo); halo.position.set(R + 0.35, H - 0.2, 0); halo.scale.set(1.8, 1.8, 1); g.add(halo);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 28), m.oPool); pool.rotation.x = -Math.PI / 2; pool.position.set(R + 0.35, -0.1, 0); pool.renderOrder = 3; g.add(pool);
    return g;
  }
  // New York's standard signal pole with a mast arm (Type M-2A: eight-sided, galvanised; NYC Street Design Manual) and the
  // city's yellow signal heads (street imagery, April 2026). The arm runs along +x. `faces` are the ways the heads look, as
  // turns about the vertical from +z: one head at the tip of the arm for each, and one on the pole for the first. With
  // arm = 0 it is the same pole with heads on the pole only (seen at several corners of 10th and 11th Avenue).
  function signalHead(g, x, y, z, ry) {
    const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry; g.add(h);
    box(h, 0.36, 1.05, 0.22, m.oSignalBody, 0, -0.525, 0); box(h, 0.3, 0.98, 0.02, m.sign, 0, -0.49, 0.115);
    lampDisc(h, LAMP.red, 0, 0.3, 0.13); lampDisc(h, LAMP.amber, 0, 0, 0.13); lampDisc(h, LAMP.green, 0, -0.3, 0.13);
  }
  function signalMast(arm = 5.5, faces = [0]) {
    const g = new THREE.Group();
    box(g, 0.42, 0.5, 0.42, m.oSteel); cyl(g, 0.11, 6.1, m.oSteel, 0, 0, 0, 8);
    if (arm > 0) { bar(g, V(0, 5.3, 0), V(arm, 5.75, 0), 0.07, m.oSteel); bar(g, V(0, 4.3, 0), V(arm * 0.45, 5.5, 0), 0.03, m.oSteel); faces.forEach((a, i) => signalHead(g, arm - i * 0.42, 5.25, 0, a)); }
    faces.slice(0, arm > 0 ? 1 : 2).forEach((a, i) => signalHead(g, 0.32 * Math.sin(a), 3.9 + i * 1.15, 0.32 * Math.cos(a), a));   // on the pole itself; with no arm (arm = 0) the pole carries the heads alone
    return g;
  }

  /* ───────── street furniture and the city round a station ───────── */
  // Park bench (D): wood slats on steel legs, with a back. Faces +z.
  function bench(len = 1.8) {
    const g = new THREE.Group();
    box(g, len, 0.06, 0.5, m.oSlat, 0, 0.42, 0); const back = box(g, len, 0.42, 0.05, m.oSlat, 0, 0.5, -0.27); back.rotation.x = -0.18;
    for (const x of [-len / 2 + 0.18, len / 2 - 0.18]) box(g, 0.06, 0.42, 0.46, m.oSteel, x, 0, 0);
    return g;
  }
  // Station artwork, as a sketch (34 St–Hudson Yards: "Funktional Vibrations", Xenobia Bailey, 2015, glass mosaic).
  // The artwork itself is NOT reproduced. What is drawn is its structure only, as read from photographs: a deep blue
  // ground, bands fanning out, a few groups of ringed discs, scattered dots, and (in the dome) a tall lens outlined in the
  // middle. Where each group sits, how many rings it has and its colours are made up here, in the palette's own colours:
  // the blue, maroon, tan and terracotta station accents, the platform-edge yellow and the tile white. No new colours.
  const ART = { blue: '#1F4F8F', maroon: '#7A3028', tan: BASE.tan, terra: '#9A5440', yellow: BASE.edge, white: BASE.tile };
  // The mosaic look (owner, 2026-11-17: "it reads as a print, not as mosaic; add fine lines, dark and light, to stand for the
  // shine and the shadow"). Three kinds of fine line are drawn over the colours, in the sign black and the tile white only:
  //   joints  - thin dark lines that cut every field into small pieces, laid the way a mosaicist lays them: in rings and
  //             spokes inside each disc, along each band of a fan, in level courses over the ground;
  //   shine   - a thin white line along the side of each ring and band that faces the light (upper left);
  //   shadow  - a thin dark line along the opposite side; and here and there one piece catches the light or stays dark.
  function artTex(kind) {                                        // kind: 'dome' (square, laid over an oval) or 'slope' (2 : 1)
    const W = 1024, H = kind === 'dome' ? 1024 : 512, K2 = 2;
    return tex(W * K2, H * K2, c => {
      c.scale(K2, K2);
      let sd = kind === 'dome' ? 7 : 23; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      const mixc = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
      const INK = 'rgba(20,23,26,', LIT = 'rgba(238,235,228,', T = 9;      // T: the size of one piece, in picture units
      c.fillStyle = ART.blue; c.fillRect(0, 0, W, H);
      const fan = (x, y, a0, a1, n, r, col) => {
        for (let i = 0; i < n; i += 2) {
          const p = a0 + (a1 - a0) * i / n, q = a0 + (a1 - a0) * (i + 1) / n;
          c.fillStyle = col; c.beginPath(); c.moveTo(x, y); c.arc(x, y, r, p, q); c.closePath(); c.fill();
          c.lineWidth = 1.2; c.strokeStyle = LIT + '0.75)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * Math.cos(p), y + r * Math.sin(p)); c.stroke();       // shine on one edge of the band
          c.strokeStyle = INK + '0.45)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + r * Math.cos(q), y + r * Math.sin(q)); c.stroke();                       // shadow on the other
          c.lineWidth = 0.7; c.strokeStyle = INK + '0.22)'; for (let rr = T * 3; rr < r; rr += T) { c.beginPath(); c.arc(x, y, rr, p, q); c.stroke(); }        // joints across the band
        }
      };
      const disc = (x, y, r, cols, rings) => {
        for (let i = 0; i < rings; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(x, y, r * (1 - i / rings), 0, 7); c.fill(); }
        for (let i = 0; i < rings; i++) {
          const ro = r * (1 - i / rings), ri = r * (1 - (i + 1) / rings), n = Math.max(6, Math.round(2 * Math.PI * ro / T));
          c.lineWidth = 0.7; c.strokeStyle = INK + '0.3)'; c.beginPath(); c.arc(x, y, ro, 0, 7); c.stroke();                                                   // joint between two rings
          for (let k = 0; k < n; k++) { const t = 2 * Math.PI * (k + (i % 2) / 2) / n; c.beginPath(); c.moveTo(x + ri * Math.cos(t), y + ri * Math.sin(t)); c.lineTo(x + ro * Math.cos(t), y + ro * Math.sin(t)); c.stroke(); }   // spokes: the pieces of one ring
          c.lineWidth = 1.3; c.strokeStyle = LIT + '0.8)'; c.beginPath(); c.arc(x, y, ro - 1.2, Math.PI * 0.95, Math.PI * 1.55); c.stroke();                   // shine, upper left
          c.strokeStyle = INK + '0.5)'; c.beginPath(); c.arc(x, y, ro - 1.2, -0.05 * Math.PI, 0.55 * Math.PI); c.stroke();                                    // shadow, lower right
        }
      };
      const ground = () => {                                      // the blue ground: level courses of pieces, every other course shifted by half a piece
        c.lineWidth = 0.7; c.strokeStyle = INK + '0.2)';
        for (let y = 0, row = 0; y < H; y += T, row++) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); for (let x = (row % 2) * T / 2; x < W; x += T) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + T); c.stroke(); } }
        for (let i = 0; i < 520; i++) { const x = Math.floor(rnd() * W / T) * T + ((Math.floor(rnd() * 2)) * T / 2), y = Math.floor(rnd() * H / T) * T; c.fillStyle = i % 3 ? LIT + (0.16 + rnd() * 0.3) + ')' : INK + '0.28)'; c.fillRect(x + 1, y + 1, T - 2, T - 2); }   // a piece that catches the light, or stays dark
      };
      const sets = [[ART.maroon, ART.white, ART.terra, ART.yellow], [ART.yellow, ART.blue, ART.white, ART.tan], [ART.terra, ART.tan, ART.maroon, ART.white], [ART.white, mixc(ART.blue, ART.white, 0.5)]];
      const pale = mixc(ART.blue, ART.white, 0.42);
      ground();
      if (kind === 'dome') {
        fan(-120, 512, -0.75, 0.75, 44, 560, pale); fan(1144, 512, Math.PI - 0.75, Math.PI + 0.75, 44, 560, pale);      // bands fanning in from either side
        c.save(); c.beginPath(); c.ellipse(512, 512, 190, 430, 0, 0, 7); c.clip(); c.fillStyle = ART.blue; c.fillRect(0, 0, W, H); ground(); c.restore();   // the lens: plain blue ground, outlined
        c.strokeStyle = mixc(ART.blue, ART.white, 0.75); c.lineWidth = 4; c.beginPath(); c.ellipse(512, 512, 190, 430, 0, 0, 7); c.stroke();
        c.strokeStyle = INK + '0.45)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(512, 512, 193.5, 433.5, 0, 0, 7); c.stroke();
        c.strokeStyle = mixc(ART.blue, ART.white, 0.75); c.lineWidth = 2.5; c.beginPath(); c.moveTo(512, 82); c.lineTo(512, 942); c.moveTo(322, 512); c.lineTo(702, 512); c.stroke();
        for (const [x, y, r] of [[250, 760, 120], [790, 250, 110], [730, 800, 95]]) { disc(x, y, r, sets[0], 9); disc(x + r * 0.9, y - r * 0.5, r * 0.6, sets[1], 7); disc(x - r * 0.5, y + r * 0.85, r * 0.5, sets[2], 6); disc(x + r * 0.55, y + r * 0.8, r * 0.38, sets[3], 6); }
      } else {
        fan(880, 90, 0.5 * Math.PI - 1.0, 0.5 * Math.PI + 1.3, 30, 900, pale);                                          // a sun-like form up in one corner, with bands of colour
        for (let i = 0; i < 5; i++) fan(880, 90, 1.2 + i * 0.32, 1.36 + i * 0.32, 1, 520, [ART.yellow, ART.terra, ART.tan, ART.maroon, ART.yellow][i]);
        disc(880, 90, 120, sets[1], 8);
        for (const [x, y, r] of [[170, 300, 150], [470, 190, 120], [640, 380, 110]]) { disc(x, y, r, sets[0], 10); disc(x + r * 0.95, y + r * 0.45, r * 0.62, sets[2], 7); disc(x - r * 0.3, y - r * 0.9, r * 0.45, sets[1], 6); disc(x + r * 0.2, y + r * 1.0, r * 0.4, sets[3], 6); }
      }
      for (let i = 0; i < 70; i++) { const x = rnd() * W, y = rnd() * H, r = 3 + rnd() * 5; c.fillStyle = [ART.yellow, ART.white, ART.terra, ART.tan][i % 4]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.lineWidth = 1; c.strokeStyle = LIT + '0.8)'; c.beginPath(); c.arc(x, y, r, Math.PI, Math.PI * 1.5); c.stroke(); c.strokeStyle = INK + '0.5)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 0.5); c.stroke(); }      // scattered dots, each with its shine and shadow
    });
  }
  const artMats = {};
  const artMat = kind => artMats[kind] ??= new THREE.MeshLambertMaterial({ map: artTex(kind), emissive: 0xffffff, emissiveMap: artTex(kind), emissiveIntensity: 0.35 });   // lit a little from itself: it is indoors, under lamps
  // A recessed dome in a ceiling (points up from y = 0): an oval bowl, half-axes a (along x) and b (along z), `depth` deep,
  // seen from below only; a steel ring round its mouth with a row of small lamps inside it (photographs).
  function artDome(a = 4.6, b = 3.0, depth = 2.0) {
    const g = new THREE.Group(), NR = 14, NT = 56, pos = [], uv = [], idx = [];
    for (let i = 0; i <= NR; i++) for (let j = 0; j <= NT; j++) { const r = i / NR, t = 2 * Math.PI * j / NT; pos.push(a * r * Math.cos(t), depth * Math.sqrt(Math.max(0, 1 - r * r)), b * r * Math.sin(t)); uv.push(0.5 + 0.5 * r * Math.cos(t), 0.5 + 0.5 * r * Math.sin(t)); }
    for (let i = 0; i < NR; i++) for (let j = 0; j < NT; j++) { const p = i * (NT + 1) + j, q = p + NT + 1; idx.push(p, q, p + 1, p + 1, q, q + 1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const mat = artMat('dome').clone(); mat.side = THREE.DoubleSide; const bowl = new THREE.Mesh(geo, mat); g.add(bowl); g.userData.bowl = bowl;
    const pts = [...Array(NT + 1)].map((_, j) => { const t = 2 * Math.PI * j / NT; return [a * Math.cos(t), b * Math.sin(t)]; });
    ribbon(g, pts, 0.22, -0.1, 0.12, m.oSteel, true);                                                                    // the steel ring
    for (let j = 0; j < NT; j += 2) { const t = 2 * Math.PI * (j + 0.5) / NT; box(g, 0.1, 0.03, 0.1, m.lamp, (a - 0.16) * Math.cos(t), 0.13, (b - 0.16) * Math.sin(t)); }   // small lamps just inside it
    return g;
  }
  // A mosaic on the sloping ceiling over a bank of escalators: a flat panel w wide from the point `a` up to the point `b`,
  // seen from below.
  function artSlope(a, b, w) {
    const d = b.clone().sub(a), side = new THREE.Vector3(1, 0, 0), h = w / 2, P = [a.clone().addScaledVector(side, -h), a.clone().addScaledVector(side, h), b.clone().addScaledVector(side, h), b.clone().addScaledVector(side, -h)];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap(p => [p.x, p.y, p.z]), 3)); const asp = d.length() / w, u0 = asp < 2 ? 0.5 - asp / 4 : 0, u1 = 1 - u0, v0 = asp > 2 ? 0.5 - 1 / asp : 0, v1 = 1 - v0;   // the picture is 2 : 1; only as much of it is used as keeps its circles round
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([u0, v0, u0, v1, u1, v1, u1, v0], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
    const mat = artMat('slope').clone(); mat.side = THREE.DoubleSide; return new THREE.Mesh(geo, mat);
  }
  // ── Water (kit materials and parts; owner, 2026-11-17: still water and moving water each need their own look) ──
  // No new colour: deep water = the dark steel 0.4 of the way toward the street green; spray, drops and foam = the tile white.
  // Still water: a surface one sees into a little (0.74 solid), that shines where the light strikes it, with faint ripples
  // that drift slowly. Moving water: the same surface with stronger, faster ripples; jets as fine arcs with drops that
  // travel along them; a band of foam where they fall, that flickers. All of it moves only through kit.tick.
  const WATER = '#' + new THREE.Color(BASE.darkSteel).lerp(new THREE.Color(BASE.street), 0.4).getHexString();
  const rippleTex = (strong) => { const t = tex(256, 256, (c, w, h) => { c.fillStyle = strong ? '#bdbdbd' : '#d6d6d6'; c.fillRect(0, 0, w, h); c.lineCap = 'round';
    for (let i = 0; i < (strong ? 26 : 16); i++) { const y = (i * 53 % 256), x = (i * 97 % 256), l = 40 + (i * 31 % 70); c.strokeStyle = `rgba(255,255,255,${strong ? 0.75 : 0.5})`; c.lineWidth = strong ? 3 : 2; for (const ox of [-256, 0, 256]) { c.beginPath(); c.moveTo(x + ox, y); c.quadraticCurveTo(x + ox + l / 2, y + (i % 2 ? 7 : -7), x + ox + l, y); c.stroke(); } } });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 2.2, 1 / 2.2); return t; };
  const waterMat = (strong) => new THREE.MeshPhongMaterial({ color: WATER, map: rippleTex(strong), transparent: true, opacity: strong ? 0.8 : 0.74, shininess: 220, specular: new THREE.Color(0x3a4043), depthWrite: false })   // a small, dim highlight: a brighter one washed a whole basin white when seen from above against the sun;
  m.oWaterStill = waterMat(false); m.oWaterMoving = waterMat(true);
  m.oDrop = new THREE.PointsMaterial({ color: BASE.tile, size: 0.085, sizeAttenuation: true, transparent: true, opacity: 0.95, depthWrite: false });
  m.oFoam = bas(BASE.tile, { transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  m.oStream = bas(BASE.tile, { transparent: true, opacity: 0.78, depthWrite: false, side: THREE.DoubleSide });   // the falling stream itself
  // Which way the trains run, written on the track bed: a band of the line's own colour lying between the rails, and on it, again and
  // again, the platform sign's words followed by three chevrons pointing the way of travel. A band with words, as on a line diagram:
  // it must not look like the arrows painted on a roadway (owner, 2026-11-18). The band is faint, the words and chevrons a pale
  // tint of the same hue, so it is clear on the dark bed whatever the line's colour and does not pull the eye. The words read
  // the right way up, and in the direction of travel, for someone standing on that track's own platform. Flat: nothing floats.
  function trackDirection(x0, x1, color, label, { dir = 1, w = 1.0, unit = 20 } = {}) {
    const pale = '#' + new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.72).getHexString(), PX = 64, W = unit * PX;
    const draw = (ahead) => tex(W, PX, (g, cw, ch) => {            // ahead: the chevrons point the way the words read (after them); else they point back (before them)
      g.clearRect(0, 0, cw, ch); g.globalAlpha = 0.34; g.fillStyle = color; g.fillRect(0, ch * 0.1, cw, ch * 0.8); g.globalAlpha = 1;
      g.fillStyle = pale; g.strokeStyle = pale; g.lineWidth = ch * 0.11; g.lineCap = 'round'; g.lineJoin = 'round'; g.font = `700 ${ch * 0.56}px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left';
      const chev = (cx) => { for (let i = 0; i < 3; i++) { const a = ahead ? cx : cx + ch * 0.3, b = ahead ? cx + ch * 0.3 : cx; g.beginPath(); g.moveTo(a, ch * 0.26); g.lineTo(b, ch * 0.5); g.lineTo(a, ch * 0.74); g.stroke(); cx += ch * 0.5; } return cx; };
      let x = ch * 1.2; if (!ahead) x = chev(x) + ch * 0.6; g.fillText(label, x, ch * 0.53); if (ahead) chev(x + g.measureText(label).width + ch * 0.9);
    });
    const g = new THREE.Group(), mats = [];
    // Two faces, one for each side the viewer may stand on: the words always read the right way up, like a street's name on a map;
    // the chevrons always point the way the trains run.
    for (const v of [1, -1]) {
      const map = draw(dir * v > 0); map.wrapS = THREE.RepeatWrapping; map.repeat.set((x1 - x0) / unit, 1);
      const mat = bas('#ffffff', { map, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
      const o = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, w), mat), h = new THREE.Group(); o.rotation.x = -Math.PI / 2; o.renderOrder = 3; h.add(o);
      h.position.x = (x0 + x1) / 2; if (v < 0) h.rotation.y = Math.PI; h.userData.v = v; g.add(h); mats.push(mat);
    }
    g.userData.fade = (k) => { for (const m of mats) m.opacity = k; g.visible = k > 0.02; };
    g.userData.face = (dz) => { for (const h of g.children) h.visible = (dz >= 0) === (h.userData.v > 0); };      // dz: the viewer's place across the track (their z minus the band's)
    g.userData.face(1);
    return g;
  }
  const anims = []; let wt = 0;                                  // what moves, and the water's own clock
  anims.push(dt => { wt += dt; m.oWaterStill.map.offset.x = wt * 0.012; m.oWaterStill.map.offset.y = wt * 0.007; m.oWaterMoving.map.offset.x = wt * 0.05; m.oWaterMoving.map.offset.y = -wt * 0.11; m.oFoam.opacity = 0.5 + 0.14 * Math.sin(wt * 9); });
  // A water surface of any outline (points in x, z) at height y: still, or moving for a basin with jets.
  function waterSurface(pts, y = 0.16, moving = false) {
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(q => new THREE.Vector2(q[0], -q[1])))); const w = new THREE.Mesh(geo, moving ? m.oWaterMoving : m.oWaterStill); w.rotation.x = -Math.PI / 2; w.position.y = y; w.renderOrder = 4; return w;
  }
  // A row of jets (the architect's aerial photograph: each jet is a thin white stream that thickens as it falls and ends in a
  // white burst on the water). Each [x, z, dx, dz] starts at (x, z), height `from`, and is thrown `reach` along (dx, dz) in an
  // arc `up` high, falling to `to`. Four things make one jet:
  //   the stream  - a strip that starts 1.5 cm wide at the nozzle and is 7 cm wide where it lands, seen from above and from the side;
  //   the flow    - drops that travel along it, out of step with the next jet;
  //   the splash  - where it lands: a patch of foam on the water, and drops that hop up and outward from it, again and again;
  //   (the ripples it sends out are the moving surface's own).
  function waterJets(jets, o = {}) {
    const g = new THREE.Group(), from = o.from ?? 0.5, to = o.to ?? 0.17, reach = o.reach ?? 2.1, up = o.up ?? 0.55, NS = 10, ND = 3, NSP = 5, sp = [], fp = [];
    const at = (j, t) => new THREE.Vector3(j[0] + j[2] * reach * t, from + (to - from) * t + 4 * up * t * (1 - t), j[1] + j[3] * reach * t);
    for (const j of jets) {
      const side = new THREE.Vector3(-j[3], 0, j[2]), upv = new THREE.Vector3(0, 1, 0), wAt = t => 0.0075 + 0.0275 * t * t;          // half-width along the stream
      for (let i = 0; i < NS; i++) { const a = at(j, i / NS), b = at(j, (i + 1) / NS), wa = wAt(i / NS), wb = wAt((i + 1) / NS);
        for (const ax of [side, upv]) { const p = [a.clone().addScaledVector(ax, -wa), a.clone().addScaledVector(ax, wa), b.clone().addScaledVector(ax, wb), b.clone().addScaledVector(ax, -wb)]; for (const k of [0, 1, 2, 0, 2, 3]) sp.push(p[k].x, p[k].y, p[k].z); } }
      const L = at(j, 1), R = 0.2, NF = 10;                       // the foam patch: a small uneven disc on the water under the fall
      for (let k = 0; k < NF; k++) { const a0 = 2 * Math.PI * k / NF, a1 = 2 * Math.PI * (k + 1) / NF, r0 = R * (0.75 + 0.25 * Math.sin(k * 2.3 + j[0])), r1 = R * (0.75 + 0.25 * Math.sin((k + 1) * 2.3 + j[0])); fp.push(L.x, to + 0.014, L.z, L.x + r1 * Math.cos(a1), to + 0.014, L.z + r1 * Math.sin(a1), L.x + r0 * Math.cos(a0), to + 0.014, L.z + r0 * Math.sin(a0)); }
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); const streams = new THREE.Mesh(sg, m.oStream); streams.renderOrder = 6; g.add(streams);
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); const foam = new THREE.Mesh(fg, m.oFoam); foam.renderOrder = 5; g.add(foam);
    const N = jets.length * (ND + NSP), dp = new Float32Array(N * 3), dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); const drops = new THREE.Points(dg, m.oDrop); drops.frustumCulled = false; drops.renderOrder = 7; g.add(drops);
    const move = () => { let i = 0; jets.forEach((j, k) => {
      for (let d = 0; d < ND; d++) { const q = at(j, (wt * 0.9 + d / ND + k * 0.37) % 1); dp[i++] = q.x; dp[i++] = q.y; dp[i++] = q.z; }                      // the flow
      const L = at(j, 1); for (let d = 0; d < NSP; d++) { const t = (wt * 2.2 + d / NSP + k * 0.61) % 1, a = d * 1.2566 + k * 0.7, r = (0.1 + 0.26 * ((d * 7 + k * 3) % 5) / 4) * t, h = 0.16 + 0.14 * ((d * 3 + k) % 4) / 3; dp[i++] = L.x + Math.cos(a) * r; dp[i++] = to + 0.02 + 4 * h * t * (1 - t); dp[i++] = L.z + Math.sin(a) * r; }   // the splash
    }); dg.attributes.position.needsUpdate = true; };
    move(); anims.push(move);
    return g;
  }
  // Fountain floor (construction photographs): not a basin. A floor of dark granite setts level with the ground, laid in rings
  // struck from one centre, with a few light round stones set in it and jets rising straight from it. f = { ring, c, stones, jets }.
  function fountainFloor(f) {
    const g = new THREE.Group(), P = f.ring.slice(0, -1), n = P.length, [cx, cz] = f.c, S = 0.5, pos = [], uv = [];
    const snap = (x, z) => { let d = 1e9, r = [x, z]; for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz || 1))), px = a[0] + vx * t, pz = a[1] + vz * t, q = Math.hypot(x - px, z - pz); if (q < d) { d = q; r = [px, pz]; } } return r; };
    const xs = P.map(q => q[0]), zs = P.map(q => q[1]), x0 = Math.min(...xs) - S, z0 = Math.min(...zs) - S, nx = Math.ceil((Math.max(...xs) - x0) / S) + 1, nz = Math.ceil((Math.max(...zs) - z0) / S) + 1, V = [];
    for (let i = 0; i <= nx; i++) { V.push([]); for (let j = 0; j <= nz; j++) { const x = x0 + i * S, z = z0 + j * S, on = inside(x, z, P), q = on ? [x, z] : snap(x, z); V[i].push([q[0], q[1], on]); } }
    const tri = (a, b, c) => {                                    // texture: across = distance from the centre (the rings), along = distance round the ring
      const T = [a, b, c].map(q => Math.atan2(q[1] - cz, q[0] - cx)); for (let k = 1; k < 3; k++) { if (T[k] - T[0] > Math.PI) T[k] -= 2 * Math.PI; if (T[k] - T[0] < -Math.PI) T[k] += 2 * Math.PI; }
      [a, b, c].forEach((q, k) => { const r = Math.hypot(q[0] - cx, q[1] - cz); pos.push(q[0], 0, q[1]); uv.push(T[k] * Math.max(r, 1), r); });
    };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const c = [V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]]; if (!c.some(v => v[2])) continue; tri(c[0], c[2], c[1]); tri(c[0], c[3], c[2]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    const floor = new THREE.Mesh(geo, m.oGraniteDark); floor.position.y = 0.012; floor.receiveShadow = true; g.add(floor);
    // (aerial photograph) the floor lies under a sheet of water, the light stones show through it, and a row of jets along
    // the outer wall is thrown inward toward the planted island
    for (const [x, z] of f.stones) disc(g, 0.35, m.oSparkle, x, 0.07, z);
    g.add(waterSurface(f.ring, 0.16, true)); g.add(waterJets(f.jets));                       // kit: moving water over the floor; jets from the outer wall toward the island
    for (const run of f.kerb || []) if (run.length > 2) ribbon(g, run, 0.18, 0, 0.26, m.oSparkle);   // the island's low light kerb, which closes the basin on its inner side
    return g;
  }
  // Fountain basin of any outline (points in x, z): a stone kerb, water, a few jets.
  function fountain(pts, o = {}) {                               // o.seat: a wooden seat all round the basin instead of a stone kerb
    const g = new THREE.Group(), n = pts.length - 1, cx = pts.slice(0, n).reduce((a, q) => a + q[0], 0) / n, cz = pts.slice(0, n).reduce((a, q) => a + q[1], 0) / n;
    if (o.seat) { ribbon(g, pts, 0.4, 0, 0.38, m.oSoil, true, 0.02); ribbon(g, pts, 0.58, 0.38, 0.45, m.oSlat, true, 0.02); } else ribbon(g, pts, 0.25, 0, 0.35, m.oStone, true);
    g.add(waterSurface(pts, 0.25, false));                                                                  // kit: still water
    for (const k of [0, 0.45, -0.45]) { const q = pts[Math.floor(n * (0.5 + k / 2)) % n], x = cx + (q[0] - cx) * Math.abs(k), z = cz + (q[1] - cz) * Math.abs(k); cyl(g, 0.05, 1.3, m.oWater, x, 0.25, z, 8); }
    return g;
  }
  // Many street trees at once (one draw each for crowns and trunks): the same translucent tree, one ball to a crown. For the
  // trees of a whole neighbourhood; the full `tree` is for those close to the route.
  function grove(points) {
    const g = new THREE.Group(), n = points.length, M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ball = new THREE.IcosahedronGeometry(1, 1), stem = new THREE.CylinderGeometry(0.75, 1, 1, 8);
    const crownD = new THREE.InstancedMesh(ball, crownDepth, n), crown = new THREE.InstancedMesh(ball, m.oCrown, n), trunkD = new THREE.InstancedMesh(stem, crownDepth, n), trunk = new THREE.InstancedMesh(stem, m.oTrunkFade, n);
    points.forEach(([x, z], i) => {
      const k = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453, r1 = k - Math.floor(k), h = 6.5 + r1 * 3, r = h * 0.3, th = h - r * 1.4, tr = 0.05 + h * 0.014;
      q.setFromAxisAngle(V(0, 1, 0), r1 * 6.28);
      M4.compose(V(x, th + r * 0.75, z), q, V(r, r * 0.88, r)); crownD.setMatrixAt(i, M4); crown.setMatrixAt(i, M4);
      M4.compose(V(x, (th + r * 0.4) / 2, z), q, V(tr, th + r * 0.4, tr)); trunkD.setMatrixAt(i, M4); trunk.setMatrixAt(i, M4);
    });
    for (const [o, order] of [[crownD, 20], [trunkD, 20], [crown, 21], [trunk, 21]]) { o.renderOrder = order; o.frustumCulled = false; g.add(o); }
    return g;
  }
  // The buildings round a station as translucent blocks: each from its outline and roof height ({ pts: [[x, z]…], h }).
  // One mesh per face direction, so the shading can follow the view; a few windows that light at night.
  function massing(list) {
    const g = new THREE.Group(), tri = { top: [], s0: [], s1: [], s2: [], s3: [], win: [] }, rnd = (k) => { const x = Math.sin(k * 127.1) * 43758.5453; return x - Math.floor(x); };
    const quad = (o, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) => o.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
    list.forEach((bd, bi) => {
      const P = bd.pts, h = bd.h, n = P.length; let area = 0;
      for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
      const sg = area > 0 ? 1 : -1;
      for (const f of THREE.ShapeUtils.triangulateShape(P.map(p => new THREE.Vector2(p[0], p[1])), [])) for (const k of f) tri.top.push(P[k][0], h, P[k][1]);
      for (let i = 0; i < n; i++) {
        const a = P[i], b = P[(i + 1) % n], ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez); if (len < 0.05) continue;
        const nx = sg * ez / len, nz = -sg * ex / len, [p, q] = sg > 0 ? [b, a] : [a, b];
        quad(tri[Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 's0' : 's1') : (nz > 0 ? 's2' : 's3')], p[0], 0, p[1], q[0], 0, q[1], q[0], h, q[1], p[0], h, p[1]);
        if (len > 6 && h > 9) for (let w = 0, cnt = Math.min(12, Math.floor(len / 6 * h / 14)); w < cnt; w++) {
          const t = 0.12 + 0.76 * rnd(bi * 31 + i * 7 + w), y = 4 + (h - 7) * rnd(bi * 17 + i * 3 + w * 5), hw = 0.7 / len;
          const x0 = a[0] + ex * (t - hw) + nx * 0.06, z0 = a[1] + ez * (t - hw) + nz * 0.06, x1 = a[0] + ex * (t + hw) + nx * 0.06, z1 = a[1] + ez * (t + hw) + nz * 0.06;
          quad(tri.win, x0, y, z0, x1, y, z1, x1, y + 1.7, z1, x0, y + 1.7, z0);
        }
      }
    });
    const S = m.oBldgSide, mats = { top: m.oBldgTop, s0: S[0], s1: S[1], s2: S[2], s3: S[3], win: m.oWin }; m.oWin.side = THREE.DoubleSide;
    for (const [k, arr] of Object.entries(tri)) { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const o = new THREE.Mesh(geo, mats[k]); o.renderOrder = k === 'win' ? 10 : 9; o.frustumCulled = false; g.add(o); }
    return g;
  }
  // A band of paving between two lines of points that run side by side (outer and inner, the same number of points, closed
  // into a ring). The pattern's two measures are given for every point: how far along the kerb and how far back from it
  // (`uvo` for the outer line, `uvi` for the inner; `uvo2`/`uvi2` where the measure changes, on the diagonal of a street
  // corner). `len` is the kerb's length; the pattern is fitted to it so it meets itself without a break. Flat, on y = 0.
  function pavedBand(B, mat, unit = 1.5) {
    const { outer, inner, uvo, uvi, uvo2, uvi2, len } = B, n = outer.length, pos = [], uv = [], fit = Math.max(1, Math.round(len / unit)) * unit / len;
    for (let i = 0; i < n; i++) {                                 // one four-sided piece for each step along the kerb
      const j = (i + 1) % n, a = outer[i], b = outer[j], c = inner[j], d = inner[i];
      const ua = uvo2[i] || uvo[i], ud = uvi2[i] || uvi[i]; let ub = uvo[j], uc = uvi[j];
      if (j === 0) { ub = [ub[0] + len, ub[1]]; uc = [uc[0] + len, uc[1]]; }                       // the ring closes: the last piece runs on to the full length
      const P3 = [a, b, c, a, c, d, a, c, b, a, d, c], U = [ua, ub, uc, ua, uc, ud, ua, uc, ub, ua, ud, uc];   // both windings: the ring may run either way round
      for (let k = 0; k < 12; k++) { pos.push(P3[k][0], 0, P3[k][1]); uv.push(U[k][0] * fit, U[k][1]); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
    const o = new THREE.Mesh(geo, mat); o.receiveShadow = true; return o;
  }
  // Crossing stripes along the lines given (each a line across a roadway): bars 0.55 × 3 m every 1.1 m, all in one draw.
  function zebra(lines) {
    const spots = [];
    for (const P of lines) { const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); const L = cum[cum.length - 1];
      for (let t = 0.8; t <= L - 0.8; t += 1.1) { let i = 1; while (i < P.length - 1 && cum[i] < t) i++; const a = P[i - 1], b = P[i], k = (t - cum[i - 1]) / (cum[i] - cum[i - 1]); spots.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(-(b[1] - a[1]), b[0] - a[0])]); } }
    const geo = new THREE.PlaneGeometry(0.55, 3); geo.rotateX(-Math.PI / 2);
    const o = new THREE.InstancedMesh(geo, m.oStripe, spots.length), M4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    spots.forEach(([x, z, a], i) => { q.setFromAxisAngle(V(0, 1, 0), a); M4.compose(V(x, 0, z), q, V(1, 1, 1)); o.setMatrixAt(i, M4); }); o.frustumCulled = false; return o;
  }

  // Street paving sample: the three kinds of ground and the kerb between them (see design/dimension-sheet.md).
  function pavingSample() {
    const g = new THREE.Group(), slab = (w, d, mat, x, y, z) => { const geo = new THREE.PlaneGeometry(w, d); geo.rotateX(-Math.PI / 2); const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) + x, p.getZ(i) + z); const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); g.add(o); };
    slab(3, 4, m.oRoad, -3.7, 0.01, 0); slab(3, 4, m.oFlag, -0.4, 0.14, 0); slab(3, 4, m.oPlaza, 3.0, 0.14, 0);
    box(g, 0.18, 0.14, 4, m.oStone, -2.11, 0, 0);
    for (let i = 0; i < 3; i++) box(g, 0.55, 0.004, 3.2, m.oStripe, -4.8 + i * 1.1, 0.012, 0);
    shadow(g, 11, 5.5); return g;
  }

  const ELEMENTS = [
    { id: 'trainR160', group: 'Trains', row: 'Train R', name: 'R160 (R): separate cars', size: 'Ten cars in service, three shown: tail, middle, head. Car 18.35 × 2.98 × 3.67 m; four 1.27 m doors a side; between cars: footplates forming a walkway, chains, corner safety barriers; white lamps at the head, red at the tail', trust: 'B / E', build: () => train('R160') },
    { id: 'trainR46', group: 'Trains', row: 'Train W', name: 'R46 (W): longer separate cars', size: 'Eight cars in service, three shown. Car 22.77 × 3.05 m; four 1.27 m doors a side; cars separate, same kind of gap', trust: 'B / E', build: () => train('R46') },
    { id: 'trainR188', group: 'Trains', row: 'Train 7', name: 'R188 (7): shorter, narrower cars', size: 'Eleven cars in service, three shown. Car 15.65 × 2.62 m; three 1.37 m doors a side; one window between doors', trust: 'B', build: () => train('R188') },
    { id: 'trainR211T', group: 'Trains', row: 'Train G', name: 'R211T (G): open gangway', size: 'Walk-through train: the cars are joined by a bellows, one continuous interior. Car 18.35 m; 1.47 m doors; blue front and side stripe. Does not run on R or W', trust: 'B / D', build: () => train('R211T') },
    { id: 'trackDirection', group: 'Platform', name: 'Direction on the track bed', size: 'A faint band of the line\'s colour between the rails, 1.0 m wide; every 20 m the platform sign\'s words and three chevrons pointing the way the trains run. Shown here for three lines: yellow (N Q R W), purple (7), red (1 2 3)', trust: 'D', build: () => {
      const g = new THREE.Group(), bed = lam('#' + new THREE.Color(BASE.band).lerp(new THREE.Color('#000000'), 0.12).getHexString());
      [[NQRW, 'Uptown & Queens', 1], [LINES.find(l => l[0] === '7')[1], 'Queens', -1], [LINES.find(l => l[0] === '1')[1], 'Downtown & Brooklyn', -1]].forEach(([c, t, d], i) => {
        const z = (i - 1) * 3.4; box(g, 24, 0.1, 3.0, bed, 0, -0.05, z); for (const o of [-0.72, 0.72]) box(g, 24, 0.13, 0.08, m.steel, 0, 0.065, z + o);
        const b = trackDirection(-12, 12, c, t, { dir: d, unit: 12 }); b.position.set(0, 0.09, z); g.add(b); });
      return g; } },
    { id: 'platform', group: 'Platform', name: 'Platform, edge strip, track', size: 'Platform 1.15 m above the rail; edge strip 0.61 m with a dark inner line', trust: 'B / D', build: platform },
    { id: 'wall', group: 'Platform', name: 'Wall: tile, band, name tablet', size: 'Height 2.55 m; band 0.22 m; base 0.5 m; tablet 1.4 × 0.5 m; tile 108 mm', trust: 'E', build: wall },
    { id: 'column', group: 'Platform', name: 'Column with station sign', size: '0.40 m wide, 2.55 m high; sign 0.38 m square, bottom at 1.7 m; spacing 4.57 m', trust: 'E', build: column },
    { id: 'sign', group: 'Platform', name: 'Overhead sign', size: '3.2 × 0.42 m, bottom at 2.3 m', trust: 'D', build: overheadSign },
    { id: 'bullets', group: 'Platform', name: 'Line bullets', size: 'Official MTA line colours', trust: 'A', build: bullets },
    { id: 'railing', group: 'Platform', name: 'Railing', size: '1.07 m high', trust: 'D', build: railing },
    { id: 'turnstiles', group: 'Fare control', name: 'Low turnstiles', size: 'Cabinet 1.27 m long, 0.29 m wide at the base, 0.15 m above; aisle 0.42 m; about 1.0 m high', trust: 'A / E', build: turnstiles },
    { id: 'exitgate', group: 'Fare control', name: 'Emergency exit gate', size: 'About 0.95 × 2.1 m', trust: 'D', build: exitGate },
    { id: 'fence', group: 'Fare control', name: 'Fare-control railing', size: 'Steel bars, about 2.2 m high, on both sides of the turnstiles', trust: 'D', build: () => { const g = fence(3.6); shadow(g, 4.4, 1.2); return g; } },
    { id: 'heet', group: 'Fare control', name: 'High entry/exit turnstile', size: 'About 1.5 m square, 2.2 m high', trust: 'D', build: heet },
    { id: 'booth', group: 'Fare control', name: 'Station booth', size: 'About 2.5 × 2.0 × 2.4 m', trust: 'D', build: booth },
    { id: 'omny', group: 'Fare control', name: 'OMNY machine', size: 'About 0.8 × 0.5 × 1.9 m', trust: 'D', build: omny },
    { id: 'stairsTiled', group: 'Stairs and lifts', name: 'Stairs: concrete, tiled walls', size: 'Riser 0.18 m, tread 0.28 m, 1.8 m wide; handrail on the wall, 0.9 m above the steps', trust: 'D', build: stairsTiled },
    { id: 'stairsWide', group: 'Stairs and lifts', name: 'Stairs: wide, two flights with a landing', size: '5.2 m wide, riser 0.19 m, tread 0.31 m, landing 1.5 m; solid stainless sides, two handrails down the middle on posts (34 St–Hudson Yards)', trust: 'E', build: () => stairsWide() },
    { id: 'stairsSteel', group: 'Stairs and lifts', name: 'Stairs: steel structure', size: 'Same riser and tread, 1.5 m wide; steel stringers, open treads, railing with balusters', trust: 'D', build: stairsSteel },
    { id: 'escalator', group: 'Stairs and lifts', name: 'Escalator: steel sides', size: '30° incline, 1.0 m step, flat run of 1.4 m at each end, handrail 0.9 m', trust: 'D', build: () => escalator(false) },
    { id: 'escalatorGlass', group: 'Stairs and lifts', name: 'Escalator: glass sides', size: 'Same escalator with glass panels on a steel skirt, as at newer stations', trust: 'D', build: () => escalator(true) },
    { id: 'elevator', group: 'Stairs and lifts', name: 'Elevator', size: 'Door 0.91 m clear; cab about 1.3 × 1.7 m', trust: 'D', build: elevator },
    { id: 'stairsLong', group: 'Stairs and lifts', name: 'Stairs: long flight beside escalators', size: '1.6 m wide, one straight flight; a stainless handrail each side on posts (34 St–Hudson Yards, to the street)', trust: 'E', build: () => sample(stairsLong(), 2.6, 5.6, 0, 2.4) },
    { id: 'inclinedLift', group: 'Stairs and lifts', name: 'Inclined elevator', size: 'A glass cabin on a steel rail up a 30° slope, beside the long escalators (34 St–Hudson Yards has two). Drawn, not animated', trust: 'A / D', build: () => sample(inclinedLift(), 2.6, 13, 0, 4.5) },
    { id: 'tunnel', group: 'Deep station', name: 'Passage: elliptical tunnel', size: '9 m wide, 4.4 m high; wall panels on the vault, three light lines, steel ribs every 3 m, a stainless ring in a tiled wall at the mouth', trust: 'E', build: () => tunnel(4.5, 4.4, 9, 0, { twoSided: true }) },
    { id: 'shaft', group: 'Deep station', name: 'Escalator shaft: inclined tube', size: 'The same vault on a 30° slope, with light lines; escalators stand inside it', trust: 'E', build: () => sample(tunnel(4.3, 4.6, 10.4, 6, { twoSided: true }), 9.6, 11, 0, 5.2) },
    { id: 'columnRound', group: 'Deep station', name: 'Round tiled column', size: '0.9 m across, floor to ceiling (5 m in the round hall)', trust: 'E', build: () => sample(columnRound(), 1.8, 1.8) },
    { id: 'edgeLight', group: 'Deep station', name: 'Platform-edge light and sign band', size: 'A line of tube lights at 3.3 m under a black band 0.55 m high that carries the signs; runs the length of the platform edge', trust: 'E', build: () => { const g = edgeLight(8); for (const x of [-3, 3]) box(g, 0.04, 0.6, 0.04, m.steel, x, 3.95, 0); return sample(g, 8.6, 1.2); } },
    { id: 'finishes', group: 'Deep station', name: 'Finishes: pavers, wall panels, ceiling', size: 'Paver 0.6 × 0.3 m on the floor colour; wall panel 0.9 × 0.3 m on the tile colour, dark base 0.45 m; ceiling panel 1.5 m with a downlight. Same faint-grid method as the tile', trust: 'E', build: finishes },
    { id: 'routeIn', group: 'Route', name: 'Route, indoors', size: 'Fill #2F80FF, edge darker; white chevrons; "you" and arrival markers', trust: 'Design', build: () => routeSample(false) },
    { id: 'entrance', group: 'Entrances', outdoor: true, name: 'Entrance: stair, railing, globe lamp', size: 'Railing 1.1 m; lamp post 2.7 m, globe 0.4 m; sign 1.2 × 0.5 m', trust: 'D', build: entrance },
    { id: 'canopy', group: 'Entrances', row: 'Entrances large', outdoor: true, name: 'Entrance: glass canopy', size: 'Glass gridshell in a free-form rim, 18.5 × 15 m, rim 6.7 m over the mouth and 1.1 m at the back; three upright Y-shaped supports: one a little back from each corner of the mouth, its front arm meeting the rim at the corner, and one under the back tip; station name across the mouth. Glows at night (34 St–Hudson Yards, 34 St entrance)', trust: 'B / E', build: () => sample(canopy(), 22, 18) },
    { id: 'canopySmall', group: 'Entrances', row: 'Entrances large', outdoor: true, name: 'Entrance: glass canopy, smaller', size: 'The same kind of canopy from another outline: 13 × 13 m, rim 6.0 m (34 St–Hudson Yards, 35 St entrance). Any outline can be given', trust: 'E', build: () => sample(canopy({ ring: CANOPY34.ring.map(q => [q[0] * 0.72, q[1] * 0.86]), mouth: CANOPY34.mouth.map(q => [q[0] * 0.72, q[1] * 0.86]), H: 6.0 }), 16, 16) },
    { id: 'bollards', group: 'Entrances', row: 'Entrances large', outdoor: true, name: 'Bollards', size: 'Steel, 0.32 m across, 1.0 m high, about 1.8 m apart, set out along any line', trust: 'E', build: () => sample(bollards([...Array(7)].map((_, i) => [(i - 3) * 1.8, -Math.cos((i - 3) * 0.45) * 2])), 13, 4) },
    { id: 'guard', group: 'Entrances', row: 'Entrances large', outdoor: true, name: 'Opening guard: stone and glass', size: 'Round the opening in the plaza: dark stone 0.75 m with a glass guard 0.55 m on top; the opening is a horseshoe 7 m long', trust: 'E', build: () => sample(guard(horseshoe()), 9.4, 8.4, 0, 0.9) },
    { id: 'entranceWall', group: 'Entrances', outdoor: true, name: 'Entrance: stair with stone parapet', size: 'Opening 4.2 × 1.8 m; stone walls 0.95 m on three sides with a steel handrail; a globe lamp each side; sign over the far end', trust: 'D', build: entranceWall },
    { id: 'entranceCanopy', group: 'Entrances', outdoor: true, name: 'Entrance: stair under a glass canopy', size: 'Opening 5.0 × 2.2 m; steel posts 2.9 m; glass roof falling to the back; glass guards 1.1 m; name on the fascia', trust: 'D', build: entranceCanopy },
    { id: 'entranceBuilding', group: 'Entrances', outdoor: true, name: 'Entrance: inside a building', size: 'Doorway 2.6 × 2.8 m in the street wall; the stair goes down inside; sign over the doorway; a globe lamp each side', trust: 'D', build: entranceBuilding },
    { id: 'elevatorKiosk', group: 'Entrances', outdoor: true, name: 'Entrance: street elevator', size: 'Glass headhouse 2.4 × 2.8 × 3.0 m on steel posts; door 1.0 m; sign over the door', trust: 'D', build: elevatorKiosk },
    { id: 'waterStill', group: 'Water', outdoor: true, name: 'Still water', size: 'Any outline; shown as a basin 6 × 3.6 m with a stone kerb. One sees into it a little, it shines, faint ripples drift', trust: 'D',
      build: () => { const g = new THREE.Group(), P = [[-3, -1.8], [3, -1.8], [3, 1.8], [-3, 1.8], [-3, -1.8]]; flat(g, 6, 3.6, m.oGraniteDark, 0, 0.02, 0); ribbon(g, P, 0.25, 0, 0.35, m.oStone, true); g.add(waterSurface(P, 0.25, false)); return g; } },
    { id: 'waterJets', group: 'Water', outdoor: true, name: 'Moving water: jets from a wall', size: 'Jets every 0.6 m, thrown 2.1 m in an arc 0.55 m high: a stream that thickens as it falls, drops travelling along it, a foam patch and hopping drops where it lands; stronger ripples', trust: 'D',
      build: () => { const g = new THREE.Group(), P = [[-3.2, -2], [3.2, -2], [3.2, 2], [-3.2, 2], [-3.2, -2]], W = [[-3.2, -2.2], [0, -2.2], [3.2, -2.2]]; flat(g, 6.4, 4, m.oGraniteDark, 0, 0.02, 0); ribbon(g, P, 0.2, 0, 0.3, m.oStone, true); ribbon(g, W, 0.4, 0, 0.38, m.oSoil); ribbon(g, W, 0.9, 0.38, 0.45, m.oSlat);
        g.add(waterSurface(P, 0.16, true)); g.add(waterJets([...Array(10)].map((_, i) => [-2.7 + i * 0.6, -1.85, 0, 1]))); return g; } },
    { id: 'treeLarge', group: 'Planting', outdoor: true, name: 'Street tree: mature', size: 'About 11 m high, crown 6.4 m across; tree bed 1.5 × 3.0 m (5 × 10 ft)', trust: 'D', build: () => tree(11, 3.2) },
    { id: 'treeMid', group: 'Planting', outdoor: true, name: 'Street tree: medium, with tree guard', size: 'About 8 m high, crown 4.4 m; steel tree guard 0.45 m high, open on the kerb side', trust: 'D', build: () => tree(8, 2.2, true) },
    { id: 'treeYoung', group: 'Planting', outdoor: true, name: 'Street tree: young, staked', size: 'About 4.5 m high, crown 2.2 m; two stakes', trust: 'D', build: () => tree(4.5, 1.1) },
    { id: 'shrub', group: 'Planting', outdoor: true, name: 'Shrub', size: 'About 1.2 m across, 0.9 m high', trust: 'D', build: () => shrub() },
    { id: 'hedge', group: 'Planting', outdoor: true, name: 'Hedge', size: '0.9 m high, 0.7 m deep, any length', trust: 'D', build: () => hedge() },
    { id: 'planterBox', group: 'Planting', outdoor: true, name: 'Planter: stone box', size: '2.4 × 0.8 × 0.6 m with shrubs', trust: 'D', build: () => planter(false) },
    { id: 'planterRound', group: 'Planting', outdoor: true, name: 'Planter: round tub', size: '1.2 m across, 0.65 m high', trust: 'D', build: () => planter(true) },
    { id: 'plantBed', group: 'Planting', outdoor: true, name: 'Planting bed', size: '5 × 2 m; kerb 0.15 m; ground cover and shrubs', trust: 'D', build: plantBed },
    { id: 'mound', group: 'Planting', outdoor: true, name: 'Planted mound', size: 'Any outline; no kerb; the ground rises to about 1.1 m; shrubs thick along the edge, thinner up the slope', trust: 'E', build: () => { const g = mound([...Array(29)].map((_, i) => { const a = i / 28 * Math.PI * 2; return [(4.5 + 1.2 * Math.cos(2 * a)) * Math.cos(a), (3 + 0.6 * Math.sin(3 * a)) * Math.sin(a)]; })); shadow(g, 13, 8); return g; } },
    { id: 'benchCurve', group: 'Planting', outdoor: true, name: 'Bench that follows a curve', size: 'Light wood slats; seat 0.52 m deep, 0.45 m high, back to 0.84 m, on a dark base; any curve, any length', trust: 'E', build: () => { const g = benchCurve([...Array(13)].map((_, i) => { const a = -0.9 + i * 0.15; return [5 * Math.sin(a), 5 * Math.cos(a) - 5]; }), 1); shadow(g, 9, 3, 0, -1); return g; } },
    { id: 'parkLamp', group: 'Planting', outdoor: true, name: 'Park lamp', size: 'Black post 3.3 m, lantern 0.6 m; glows at night', trust: 'D', build: () => { const g = parkLamp(); shadow(g, 1.6, 1.6); return g; } },
    { id: 'treeBed', group: 'Planting', outdoor: true, name: 'Tree bed by the kerb', size: 'Flush with the paving, planted; a low black rail 0.44 m high round it; stands directly behind the kerbstone', trust: 'E', build: () => { const g = bed([[-1.5, -0.75], [1.5, -0.75], [1.5, 0.75], [-1.5, 0.75], [-1.5, -0.75]], { rail: true, every: 1.1 }); shadow(g, 4, 2.4); return g; } },
    { id: 'bench', group: 'Planting', outdoor: true, name: 'Park bench', size: '1.8 m long, seat 0.45 m high; wood slats (the palette\'s tan) on steel legs', trust: 'D', build: () => { const g = bench(); shadow(g, 2.6, 1.4); return g; } },
    { id: 'fountain', group: 'Planting', outdoor: true, name: 'Fountain basin', size: 'Any outline; stone kerb 0.35 m; water in the glass colour; jets 1.3 m', trust: 'D', build: () => { const g = fountain([...Array(25)].map((_, i) => [3.2 * Math.cos(i / 24 * Math.PI * 2), 2.2 * Math.sin(i / 24 * Math.PI * 2)])); shadow(g, 8, 6); return g; } },
    { id: 'paving', group: 'Street', outdoor: true, name: 'Paving: roadway, kerb, sidewalk, park', size: 'Roadway: plain, with crossing stripes 0.55 × 3 m. Kerb: granite 0.18 m wide, 0.13 m above the roadway. Sidewalk: concrete flags 1.5 m square. Park: pavers 0.6 × 0.3 m', trust: 'D', build: pavingSample },
    { id: 'crossing', group: 'Street', outdoor: true, name: 'Sidewalk, road, crossing', size: 'Schematic', trust: 'D', build: crossing },
    { id: 'vehSignal', group: 'Street', outdoor: true, name: 'Traffic signal for vehicles', size: 'Pole about 5.7 m with a 6.1 m arm over the road; three lamps. One arm for each one-way traffic flow, on the far side of the intersection', trust: 'D', build: () => vehicleSignal(6.1) },
    { id: 'signalMast', group: 'Street', outdoor: true, name: 'Signal pole with mast arm (NYC Type M-2A)', size: 'Eight-sided galvanised pole 6.1 m, arm 5.5 m; yellow three-lamp heads at the tip of the arm and one on the pole. Two to an intersection, on opposite corners; the other corners carry pedestrian heads on a plain pole', trust: 'A / E', build: () => { const g = signalMast(5.5, [0, Math.PI / 2]); shadow(g, 7, 2, 2.7, 0); return g; } },
    { id: 'streetLight', group: 'Street', outdoor: true, name: 'Street light (NYC standard pole, cobra head)', size: 'Tapered eight-sided pole 9.1 m high, straight arm 3.6 m rising over the roadway, LED cobra-head lamp; stands 0.6 m behind the kerb; lights at night', trust: 'A / E', build: () => { const g = streetLight(); shadow(g, 5, 1.6, 1.8, 0); return g; } },
    { id: 'streetLightDavit', group: 'Street', outdoor: true, name: 'Street light: Davit pole', size: 'The manual\'s curved alternative, 9.1 m (30 ft), reach 2.4 m; same lamp', trust: 'A / D', build: () => { const g = streetLight(true); shadow(g, 4, 1.6, 1.2, 0); return g; } },
    { id: 'pedSignal', group: 'Street', outdoor: true, name: 'Pedestrian signal', size: 'Head at about 2.7 m: hand above, walking figure below. At every corner, clear of the subway entrance', trust: 'D', build: pedSignal },
    { id: 'buildings', group: 'Street', outdoor: true, name: 'Nearby buildings', size: 'Translucent blocks; the shaded side follows the view', trust: 'Design', build: buildings },
    { id: 'routeOut', group: 'Street', outdoor: true, name: 'Route, outdoors', size: 'Same fill; the edge turns lighter at night', trust: 'Design', build: () => routeSample(true) },
    { id: 'vessel', group: 'Landmark', outdoor: true, name: 'Vessel', size: '46 m high, 15 m wide at the foot, 46 m at the top; 16 levels of 5 landings two stairs wide, 154 stairs side by side at each landing end, drawn without single steps; copper-coloured underside; plinth 24 m across', trust: 'Drawing (form), B (sizes), D (details)', build: () => vessel() },
    { id: 'landmark', group: 'Landmark', outdoor: true, name: 'Landmark: lobby, core, target floor', size: 'Schematic; not a real building', trust: 'Design', build: landmark },
  ];

  /* ───────── the three switches ───────── */
  const C = (h) => new THREE.Color(h), mix = (a, b, t) => C(a).lerp(C(b), t);
  function setAccent(key) {
    const a = ACCENTS[key] || ACCENTS.blue;
    m.col.color.set(a.col); m.tab.color.set(a.tab); m.topBand.color.set(a.band || BASE.tile);
  }
  function setNight(t) {                                         // 0 = day, 1 = night; only outdoor materials change
    m.oWalk.color.copy(mix(BASE.floor, NIGHT.sidewalk, t)); m.oRoad.color.copy(mix(BASE.road, NIGHT.road, t));
    m.oStripe.color.copy(mix('#ffffff', NIGHT.stripe, t)); m.oStreet.color.copy(mix(BASE.street, NIGHT.street, t));
    m.oSteel.color.copy(mix(BASE.steel, NIGHT.steel, t)); m.oLine.color.copy(mix(BASE.steel, NIGHT.outline, t));
    m.oBldgTop.color.copy(mix(BASE.steel, '#4A5058', t)); m.oBldgTop.opacity = 0.10 + 0.12 * t; m.oShell.opacity = 0.22 - 0.06 * t;
    bl.sun.copy(mix(BASE.steel, '#3A4048', t)); bl.shade.copy(mix('#3E4247', '#151920', t)); bl.sunO = 0.18 + 0.16 * t; bl.shadeO = 0.50 + 0.14 * t;
    m.oWin.opacity = 0.7 * t; m.oHalo.opacity = 0.55 * t; m.oPool.opacity = 0.16 * t;
    m.oCopper.color.copy(mix(BASE.copper, NIGHT.road, 0.72 * t)); m.oCopper.emissive.copy(C(BASE.copper)).multiplyScalar(0.07 * t); m.oCopper.shininess = 60 + 80 * t; m.oCopper.specular.copy(mix('#3a2a20', NIGHT.lamp, 0.55 * t));   // at night the copper goes dark and keeps its metal: a deep tone, a hard warm glint, no wash of light, so the strips stand out against it
    m.oVCap.color.copy(m.oCopper.color); m.oVLight.opacity = t; m.oVTop.color.copy(mix(BASE.floor, NIGHT.sidewalk, t)); m.oVPave.color.copy(mix(SPARKLE, NIGHT.sidewalk, t)); m.oVDark.color.copy(mix(BASE.darkSteel, NIGHT.road, 0.5 * t)); m.oRail.color.copy(mix(BASE.tile, NIGHT.steel, 0.75 * t)); m.oLeaf.color.copy(mix(BASE.leaf, NIGHT.street, t)); m.oHill.color.copy(m.oLeaf.color); for (const cm of crownMats) cm.color.copy(mix(cm.userData.day, cm.userData.night, t)); m.oTrunk.color.copy(mix(BASE.band, NIGHT.steel, t)); m.oSoil.color.copy(mix(BASE.darkSteel, NIGHT.road, t)); m.oStone.color.copy(mix(BASE.band, NIGHT.steel, t)); m.oWood.color.copy(mix(BASE.tan, NIGHT.steel, t)); m.oSlat.color.copy(mix(WOOD, NIGHT.steel, 0.7 * t)); m.oLampHalo.opacity = 0.6 * t; m.oLantern.emissive.copy(C(NIGHT.lamp)).multiplyScalar(0.9 * t); m.oLantern.color.copy(mix('#ffffff', NIGHT.lamp, t)); m.oSignalBody.color.copy(mix(BASE.edge, NIGHT.road, 0.55 * t)); m.oFlag.color.copy(m.oWalk.color); m.oPlaza.color.copy(m.oWalk.color); m.oGranite.color.copy(mix(GRANITE, NIGHT.road, t)); m.oGraniteDark.color.copy(mix(GRANITE_D, NIGHT.road, t)); m.oSparkle.color.copy(mix(SPARKLE, NIGHT.sidewalk, t)); m.oWater.color.copy(mix(BASE.glass, NIGHT.steel, t)); m.oWaterStill.color.copy(mix(WATER, NIGHT.road, 0.6 * t)); m.oWaterMoving.color.copy(m.oWaterStill.color);
    m.nGlow.opacity = 0.26 * t; m.nLamp.opacity = t; m.nSign.opacity = t; m.nHalo.opacity = 0.16 * t; m.nBars.color.copy(mix(BASE.darkSteel, NIGHT.lamp, 0.85 * t));
    m.oGlobeTop.emissive.copy(C(NIGHT.globe)).multiplyScalar(0.9 * t); m.oGlobeBot.emissive.copy(C('#ffffff')).multiplyScalar(0.6 * t);
    m.rEdgeOut.color.copy(mix(BASE.routeEdgeOnBright, BASE.routeEdgeOnDark, t));
  }
  // Building shade follows the view: the light is placed 50° to the left of the line from the scene to the camera,
  // so whichever two sides are in view, one is light and one is dark.
  const bl = { sun: C(BASE.steel), shade: C('#3E4247'), sunO: 0.18, shadeO: 0.5 }, NORM = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let solid = 0;                                                 // 0 = light context (overview, showroom) … 1 = a massing model (street level)
  const setSolid = (v) => { solid = v; };
  function setView(toCam) {
    const a = Math.atan2(toCam.z, toCam.x) + 50 * Math.PI / 180, lx = Math.cos(a), lz = Math.sin(a);
    m.oBldgSide.forEach((mat, i) => {
      const k = Math.min(1, Math.max(0, 0.5 - 0.5 * (NORM[i][0] * lx + NORM[i][1] * lz) * 1.6));   // 0 facing the light … 1 facing away
      mat.color.copy(bl.sun).lerp(bl.shade, k); const o = bl.sunO + (bl.shadeO - bl.sunO) * k; mat.opacity = o + (0.62 + 0.3 * k - o) * solid;
    });
    m.oBldgTop.opacity += (0.5 - m.oBldgTop.opacity) * solid;
  }
  const tick = (dt) => { chevTex.offset.x -= dt * 0.9; for (const a of anims) a(dt); };        // chevrons travel along the route; the water moves

  return { ELEMENTS, materials: m, setAccent, setNight, setView, setSolid, tick, route, youMarker, arrival,
    TRAINS, liveCar, link, tileMat, tileWorld, chevTex, tex, bullet, signTex,
    finish, horseshoe, inside, parts: { trackDirection, vessel, waterSurface, waterJets, stairsT, artDome, artSlope, fountainFloor, pavedBand, streetLight, ribbon, mound, benchCurve, parkLamp, signalMast, bench, fountain, grove, massing, zebra, bed, entranceWall, entranceCanopy, entranceBuilding, elevatorKiosk, tree, shrub, hedge, planter, plantBed, tunnel, stairsLong, edgeLight, columnRound, guard, inclinedLift, canopy, bollards, escalator, stairsWide, stairsSteel, elevator, turnstiles, exitGate, heet, booth, omny, vehicleSignal, pedHead, pedSignal, pedPole, slabBox, column, railing, fence } };
}

// Landmark kit: the materials and elements of landmark buildings. Apart from the station kit (elements.js) and with its
// own colours (palette.js, LANDMARK). Nothing here is made for one building: every element takes numbers (an outline,
// heights) and is meant for every landmark. Rules (design/palette-design-log.md, steps 94 and 95):
//   form first · palette colours only, by material: glass, metal, stone · bodies opaque and light · no window geometry:
//   floors and bays are a drawn pattern that fades with distance · three distances (palette LOD) · one merged geometry per
//   material · flat soft shading · sharp edges · night: window glow as a pattern, edges lit by a soft glow.
// Units are metres. An outline is a list of [x, z] points; y is up. Each builder returns a group standing on y = 0.
import * as THREE from '../vendor/three.module.min.js';
import { LANDMARK, LANDMARK_ACCENTS, NIGHT, BASE, LOD } from './palette.js';

const C = (h) => new THREE.Color(h), mix = (a, b, t) => C(a).lerp(C(b), t);
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function createLandmarkKit() {
  /* ───────── patterns (drawn, 64 px; never photographs) ───────── */
  // Glass face: one floor by one bay. A spandrel line along the bottom, a fainter mullion line up one side.
  const glassTex = () => tex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(40,52,60,.26)'; g.fillRect(0, h * 0.86, w, h * 0.14); g.fillStyle = 'rgba(40,52,60,.12)'; g.fillRect(0, 0, w * 0.06, h); });
  // Mall floor: large stone tiles, 2 by 2 to the pattern, fine joints, every other tile a shade deeper, a faint vein or two.
  const tileTex = () => tex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(50,48,44,.07)'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
    g.strokeStyle = 'rgba(50,48,44,.10)'; g.lineWidth = 1.5; for (const [x0, y0, x1, y1] of [[6, 20, 58, 44], [70, 96, 122, 74], [18, 118, 50, 82], [84, 10, 110, 52]]) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 8, (y0 + y1) / 2 - 6, x1, y1); g.stroke(); }
    g.fillStyle = 'rgba(50,48,44,.30)'; for (const v of [0, w / 2]) { g.fillRect(v, 0, 1.5, h); g.fillRect(0, v, w, 1.5); } });
  // Mall ceiling: dark slats with a fine gap between them, and a brighter reflecting band now and then.
  const slatTex = () => tex(128, 16, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.42)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 3, h); g.fillStyle = 'rgba(255,255,255,.0)'; g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(48, 0, 16, h); g.fillRect(96, 0, 16, h); });
  // Shopfront: one bay. Palette colours only (stone, stoneGrey, metal, metalDark, glass).
  const shopDraw = (glow) => (g, w, h) => { const S = LANDMARK, R = (c, x, y, a, b) => { g.fillStyle = c; g.fillRect(x * w, y * h, a * w, b * h); };
    R(glow ? '#000' : S.stone, 0, 0, 1, 1);
    const gx = 0.07, gy = 0.2, gw = 0.86, gh = 0.76, gr = g.createLinearGradient(0, gy * h, 0, (gy + gh) * h);
    if (glow) { gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#aaa'); gr.addColorStop(1, '#666'); } else { gr.addColorStop(0, S.glass); gr.addColorStop(0.5, S.stoneGrey); gr.addColorStop(1, S.metal); }
    g.fillStyle = gr; g.fillRect(gx * w, gy * h, gw * w, gh * h);
    if (!glow) { for (const [x, a] of [[0.13, 0.1], [0.27, 0.05], [0.68, 0.06], [0.79, 0.1]]) R('rgba(95,99,104,.28)', x, 0.52, a, 0.44);          // what stands in the window, as soft shapes
      R('rgba(95,99,104,.20)', gx, 0.42, gw, 0.012); R('rgba(255,255,255,.35)', gx, gy, gw, 0.03);
      R(S.metalDark, 0, 0, 1, 0.17); R(S.metal, 0.36, 0.06, 0.28, 0.05); R(S.stoneGrey, 0, 0.965, 1, 0.035);                                      // fascia, blank name plate, plinth
      g.strokeStyle = S.metalDark; g.lineWidth = w / 128; g.strokeRect(gx * w, gy * h, gw * w, gh * h); g.lineWidth = w / 170; g.strokeRect(0.37 * w, 0.42 * h, 0.26 * w, 0.54 * h); g.beginPath(); g.moveTo(0.5 * w, 0.42 * h); g.lineTo(0.5 * w, 0.96 * h); g.stroke();   // the pair of doors
      R(S.metal, 0.485, 0.66, 0.006, 0.1); R(S.metal, 0.509, 0.66, 0.006, 0.1); }
    else { R('#000', 0, 0, 1, 0.17); } };
  const shopTex = () => { const t = tex(512, 384, shopDraw(false)); t.flipY = true; return t; }, shopGlowTex = () => { const t = tex(512, 384, shopDraw(true)); t.flipY = true; return t; };
  // Steel cladding: tall panels with fine joints, lighter toward the top as if taking the sky.
  const steelTex = () => { const t = tex(64, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#e4e6e8'); gr.addColorStop(1, '#cfd2d5'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.20)'; g.fillRect(0, 0, 1.2, h); g.fillRect(0, h - 1.5, w, 1.5); }); t.repeat.set(1 / 1.5, 1 / 3.1); return t; };
  // Glazing one can see through: a faint tint of the glass colour, a dark mullion up one side and a dark line at floor and head.
  const glazings = [];
  function glazing(floorH = 6, bay = 1.5, y0 = 0) {
    const map = tex(64, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(221,230,234,0.14)'; g.fillRect(0, 0, w, h); g.fillStyle = LANDMARK.metalDark; g.fillRect(0, 0, w * 0.045, h); g.fillRect(0, h * 0.955, w, h * 0.045); g.fillRect(0, 0, w, h * 0.03); });
    map.repeat.set(1 / bay, 1 / floorH); map.offset.set(0, -((y0 / floorH) % 1));
    const mat = new THREE.MeshLambertMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide }); glazings.push(mat); return mat;
  }
  // A landmark's own front inside a mall: dark metal panels, one bay to the pattern, fine joints, a lighter line under the fascia.
  const frontTex = () => tex(128, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.30)'; for (const x of [0, w / 3, 2 * w / 3]) g.fillRect(x, 0, 1.5, h); g.fillRect(0, h * 0.5, w, 1.2);
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 0, w, h * 0.14); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, h * 0.14, w, 2); });
  // A name in light letters on nothing (the wall shows through): for a landmark's own sign over its door.
  const nameTex = (text) => { const t = tex(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '600 92px Inter, "Helvetica Neue", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
  // Stone face: piers with a window strip between them, and a faint line at each floor.
  const stoneTex = () => tex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(50,48,44,.22)'; g.fillRect(w * 0.3, 0, w * 0.4, h * 0.8); g.fillStyle = 'rgba(50,48,44,.08)'; g.fillRect(0, h * 0.94, w, h * 0.06); });
  // Night: a 16 by 16 field of windows, some lit. One cell is one bay of one floor.
  const winTex = (share, seed) => tex(128, 128, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); let r = seed;
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { r = (r * 16807) % 2147483647; if (r / 2147483647 < share) { g.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * ((r >> 8) % 100) / 100})`; g.fillRect(i * 8 + 1.5, j * 8 + 1.5, 5, 4.5); } }
  });
  const glowTex = tex(8, 128, (g, w, h) => {                      // an edge light: a thin bright line fading down the face (as on Vessel)
    const k = g.createLinearGradient(0, 0, 0, h); k.addColorStop(0, 'rgba(255,255,255,0)'); k.addColorStop(0.09, 'rgba(255,255,255,.35)'); k.addColorStop(0.125, 'rgba(255,255,255,1)'); k.addColorStop(0.16, 'rgba(255,255,255,.5)'); k.addColorStop(0.45, 'rgba(255,255,255,.14)'); k.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = k; g.fillRect(0, 0, w, h);
  });

  /* ───────── materials, by what they are made of ───────── */
  const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide, ...o });
  // What is inside a body can be cut off above a height (setCut), so that the floor one is looking at is not hidden by those over it.
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e9), CUT = { clippingPlanes: [cutPlane] };
  const m = {
    // glass
    glass: lam(LANDMARK.glass),                                                                   // a plain curtain wall (far, or no pattern wanted)
    clear: lam(LANDMARK.glass, { transparent: true, opacity: 0.3, depthWrite: false }),            // balustrades, glass floors, lift cars, atrium fronts
    // metal
    metal: lam(LANDMARK.metal), metalDark: lam(LANDMARK.metalDark),
    copper: new THREE.MeshPhongMaterial({ color: LANDMARK.copper, shininess: 60, specular: C(0x3a2a20), side: THREE.DoubleSide, flatShading: true }),   // the one shiny material
    // stone
    stone: lam(LANDMARK.stone), stoneGrey: lam(LANDMARK.stoneGrey),
    accent: lam(LANDMARK_ACCENTS.none.accent),                                                     // the landmark's one accent: sign bands, gate tops, belts, lift indicators (setAccent)
    // inside, light, route
    shell: lam(LANDMARK.stone, { transparent: true, opacity: 0.2, depthWrite: false, ...CUT }),    // the ghost of the body when looking inside
    iPlate: lam(LANDMARK.stoneGrey, CUT), iDark: lam(LANDMARK.metalDark, CUT), iMetal: lam(LANDMARK.metal, CUT), iStone: lam(LANDMARK.stone, CUT),   // floor plates, cores and rooms inside: the same colours, cut with the shell
    lamp: new THREE.MeshBasicMaterial({ color: LANDMARK.stone, side: THREE.DoubleSide }),
    mallFloor: lam(LANDMARK.stone, { map: (() => { const t = tileTex(); t.repeat.set(1 / 2.4, 1 / 2.4); return t; })(), ...CUT }), mallCeil: lam(LANDMARK.metalDark, { map: (() => { const t = slatTex(); t.repeat.set(1 / 2.4, 1 / 2.4); return t; })(), ...CUT }),   // a mall's floor and ceiling (plates' `top` and `under`)
    shop: lam('#ffffff', { map: shopTex(), emissiveMap: shopGlowTex(), emissive: C(0x000000) }),
    front: lam(LANDMARK.metalDark, { map: frontTex() }),
    greyFloor: lam(LANDMARK.stoneGrey, { map: (() => { const t = tileTex(); t.repeat.set(1 / 2.4, 1 / 2.4); return t; })(), ...CUT }),   // a quiet grey paving (an observation floor)
    steel: lam(LANDMARK.metal, { map: steelTex(), ...CUT }),                                                                            // bright metal panels: a core clad in steel
    // a dark interior that makes its own light (an exhibition, a queue through installations): walls, floor and ceiling in the dark metal
    // deepened with the palette's night road, the same by day and night; what glows in it is the glass colour, unlit and unshaded
    xWall: lam(mix(LANDMARK.metalDark, NIGHT.road, 0.35), CUT), xFloor: lam(mix(LANDMARK.metalDark, NIGHT.road, 0.6), CUT),
    exhibit: new THREE.MeshBasicMaterial({ color: LANDMARK.glass, side: THREE.DoubleSide, ...CUT }),     // ceiling light panels: pale by day, the night window colour by night (setNight)
    lift: new THREE.MeshBasicMaterial({ color: BASE.routeFill }), liftShaft: new THREE.MeshBasicMaterial({ color: BASE.routeFill, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, ...CUT }),
    glow: new THREE.MeshBasicMaterial({ color: NIGHT.lamp, map: glowTex, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }),
  };
  // A patterned face. One material per kind, floor height and bay width, made once and shared. The pattern is plain beyond
  // LOD.mid and fully drawn within LOD.near; the plain value is the pattern's own average, so the face keeps its brightness.
  const faces = {};
  // Normally a face fades by its own distance from the camera. A caller that draws the scene without a camera of that kind (the city
  // map, which hands over one combined matrix) says the distance instead: setViewDistance(metres), or null for the camera's own.
  const viewDist = { value: -1 };
  const setViewDistance = (d) => { viewDist.value = d == null ? -1 : d; };
  function face(kind = 'glass', floorH = 4, bay = 1.5) {
    const key = `${kind}/${floorH}/${bay}`; if (faces[key]) return faces[key];
    const map = kind === 'stone' ? stoneTex() : glassTex(), win = winTex(kind === 'stone' ? 0.22 : 0.34, kind === 'stone' ? 7 : 11);
    map.repeat.set(1 / bay, 1 / floorH); win.repeat.set(1 / (bay * 16), 1 / (floorH * 16));
    const mat = lam(kind === 'stone' ? LANDMARK.stone : LANDMARK.glass, { map, emissiveMap: win, emissive: C(0x000000) });
    mat.userData = { kind, avg: kind === 'stone' ? 0.925 : 0.955 };
    mat.onBeforeCompile = sh => {
      sh.uniforms.uViewDist = viewDist;
      sh.fragmentShader = 'uniform float uViewDist;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= gl_FrontFacing ? 1.0 : 0.0;   // lit windows show on the outer face only: walls are wound outward (Bag.walls)').replace('#include <map_fragment>', `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, vec3( ${mat.userData.avg.toFixed(3)} ), smoothstep( ${LOD.near.toFixed(1)}, ${LOD.mid.toFixed(1)}, uViewDist < 0.0 ? length( vViewPosition ) : uViewDist ) );
	diffuseColor *= sampledDiffuseColor;
#endif`);
    };
    return (faces[key] = mat);
  }
  const pick = (mat) => typeof mat === 'string' ? (m[mat] || face(mat)) : mat;

  /* ───────── geometry: outlines to faces ───────── */
  const area = (o) => o.reduce((s, p, i) => { const q = o[(i + 1) % o.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
  const centre = (o) => [o.reduce((s, p) => s + p[0], 0) / o.length, o.reduce((s, p) => s + p[1], 0) / o.length];
  const scaled = (o, k, c = centre(o)) => o.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
  const rect = (w, d, cx = 0, cz = 0) => [[cx - w / 2, cz - d / 2], [cx + w / 2, cz - d / 2], [cx + w / 2, cz + d / 2], [cx - w / 2, cz + d / 2]];
  class Bag {                                                    // collects triangles per material; one mesh per material at the end
    constructor() { this.b = new Map(); }
    of(mat) { mat = pick(mat); if (!this.b.has(mat)) this.b.set(mat, { p: [], u: [] }); return this.b.get(mat); }
    tri(mat, a, b, c, ua, ub, uc) { const k = this.of(mat); k.p.push(...a, ...b, ...c); k.u.push(...(ua || [0, 0]), ...(ub || [0, 0]), ...(uc || [0, 0])); }
    quad(mat, a, b, c, d, ua, ub, uc, ud) { this.tri(mat, a, b, c, ua, ub, uc); this.tri(mat, a, c, d, ua, uc, ud); }
    // side walls between a lower and an upper outline (same number of points); ya and yb may be one height or one per point.
    // holes: { edge index: [{ u0, u1, y0, y1 }] } leaves a doorway in that wall: u in metres along the edge from its first point,
    // y in metres of height. The wall is then built round the doorway; nothing is cut afterwards.
    walls(mat, lo, hi, ya, yb, holes) {
      const n = lo.length, Y = (y, i) => Array.isArray(y) ? y[i] : y, flip = lo.reduce((s2, p, i) => { const q = lo[(i + 1) % n]; return s2 + p[0] * q[1] - q[0] * p[1]; }, 0) > 0; let u = 0;   // flip: every wall faces outward, whichever way round its outline is given
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, len = Math.hypot(lo[j][0] - lo[i][0], lo[j][1] - lo[i][1]);
        const at = (fu, fy) => { const bx = lo[i][0] + (lo[j][0] - lo[i][0]) * fu, bz = lo[i][1] + (lo[j][1] - lo[i][1]) * fu, by = Y(ya, i) + (Y(ya, j) - Y(ya, i)) * fu, tx = hi[i][0] + (hi[j][0] - hi[i][0]) * fu, tz = hi[i][1] + (hi[j][1] - hi[i][1]) * fu, ty = Y(yb, i) + (Y(yb, j) - Y(yb, i)) * fu; return [bx + (tx - bx) * fy, by + (ty - by) * fy, bz + (tz - bz) * fy]; };
        const cell = (f0, f1, g0, g1) => { const a = at(f0, g0), b = at(f1, g0), c = at(f1, g1), d = at(f0, g1), ua = [u + f0 * len, a[1]], ub = [u + f1 * len, b[1]], uc = [u + f1 * len, c[1]], ud = [u + f0 * len, d[1]];
          if (flip) this.quad(mat, b, a, d, c, ub, ua, ud, uc); else this.quad(mat, a, b, c, d, ua, ub, uc, ud); };
        const hs = holes && holes[i];
        if (!hs) cell(0, 1, 0, 1);
        else { const h = hs[0], y0 = Y(ya, i), y1 = Y(yb, i), fu = [0, h.u0 / len, h.u1 / len, 1], fy = [0, Math.max(0, (h.y0 - y0) / (y1 - y0)), Math.min(1, (h.y1 - y0) / (y1 - y0)), 1];
          for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) if (!(a === 1 && c === 1) && fu[a + 1] - fu[a] > 1e-6 && fy[c + 1] - fy[c] > 1e-6) cell(fu[a], fu[a + 1], fy[c], fy[c + 1]); }
        u += len;
      }
    }
    cap(mat, o, y, holes = []) {                                 // a flat or sloping lid over an outline; y may be one height or one per point; holes: outlines left open (flat lids only)
      const Y = (i) => Array.isArray(y) ? y[i] : y, V2 = (p) => new THREE.Vector2(p[0], p[1]), all = o.concat(...holes), H = (i) => i < o.length ? Y(i) : Y(0);
      for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(o.map(V2), holes.map(h => h.map(V2))))
        this.tri(mat, [all[a][0], H(a), all[a][1]], [all[b][0], H(b), all[b][1]], [all[c][0], H(c), all[c][1]], all[a], all[b], all[c]);
    }
    box(mat, x0, y0, z0, x1, y1, z1) { const o = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; this.walls(mat, o, o, y0, y1); this.cap(mat, o, y1); this.cap(mat, o, y0); }
    into(g, lod) {
      for (const [mat, k] of this.b) {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(k.p, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(k.u, 2)); geo.computeVertexNormals();
        const o = new THREE.Mesh(geo, mat); if (mat.transparent) { o.renderOrder = 9; o.castShadow = false; } if (lod) o.userData.lod = lod; g.add(o);
      }
      return g;
    }
  }
  const group = (fn, lod) => { const b = new Bag(); fn(b); return b.into(new THREE.Group(), lod); };

  /* ───────── mass ───────── */
  // 1 Extruded block.
  const block = (o, h, mat = 'glass', y0 = 0) => group(b => { b.walls(mat, o, o, y0, y0 + h); b.cap('stoneGrey', o, y0 + h); });
  // 2 Leaning or tapering shaft: a lower outline joined to an upper one with the same number of points.
  const shaft = (lo, hi, y0, y1, mat = 'glass') => group(b => { b.walls(mat, lo, hi, y0, y1); b.cap('stoneGrey', hi, y1); });
  // 3 Setback stack: levels from the ground up. Each: { o, y0, y1, top (outline at y1, if it leans), mat }. A plant band is a level
  //   in metalDark. Every level gets a roof, so a setback shows its terrace.
  const stack = (levels) => group(b => { for (const L of levels) { b.walls(L.mat || 'glass', L.o, L.top || L.o, L.y0, L.y1, L.holes); if (L.roof !== false) b.cap(L.roof || 'stoneGrey', L.top || L.o, L.y1); } });   // roof: false leaves a level open above (a room inside, seen from over it)
  // 4 Podium: a low block whose front (edge `front` of the outline) is a glass wall with the floors seen behind it, and an
  //   atrium the full height at its middle third. `door` { u, w, h } leaves a doorway in the glass front; `holes` as for walls.
  function podium(o, h, { front = 0, levels = 4, mat = 'stone', door = null, holes = null, back = true } = {}) {      // back: false when real floors stand behind the glass
    const g = new THREE.Group(), n = o.length, A = o[front], B = o[(front + 1) % n], s = Math.sign(area(o)) || 1, len = Math.hypot(B[0] - A[0], B[1] - A[1]), tx = (B[0] - A[0]) / len, tz = (B[1] - A[1]) / len, nx = tz * s, nz = -tx * s;
    group(b => {
      const solid = new Bag(), front1 = new Bag(), only = (k) => o.map((_, i) => i === k);
      // the walls: every side but the front in the body's material; the front in clear glass, with its doorway if there is one
      const side = { ...(holes || {}) }; b.walls(mat, o, o, 0, h, Object.fromEntries(o.map((_, i) => [i, i === front ? [{ u0: 0, u1: 1e9, y0: -1, y1: 1e9 }] : side[i]]).filter(q => q[1])));
      b.cap('stoneGrey', o, h);
      b.walls('clear', o, o, 0, h, Object.fromEntries(o.map((_, i) => [i, i === front ? (door ? [{ u0: door.u - door.w / 2, u1: door.u + door.w / 2, y0: 0, y1: door.h }] : null) : [{ u0: 0, u1: 1e9, y0: -1, y1: 1e9 }]]).filter(q => q[1])));
      const P = (t, d, y) => [A[0] + tx * t - nx * d, y, A[1] + tz * t - nz * d];
      if (back) b.quad('stone', P(0, 9, 0), P(len, 9, 0), P(len, 9, h), P(0, 9, h));                           // the back of what is seen through the glass
    }).children.forEach(c => g.add(c));
    group(b => {                                                 // the glass front reads as a curtain wall: a metal upright every 3 m or so, a dark band at every floor and along the top; the doorway is left clear
      const P = (t, y) => [A[0] + tx * t + nx * 0.04, y, A[1] + tz * t + nz * 0.04], k = Math.max(1, Math.round(len / 3)), inDoor = (t) => door && Math.abs(t - door.u) < door.w / 2;
      for (let i = 0; i <= k; i++) { const t = i * len / k, y0 = inDoor(t) ? door.h : 0; b.quad('metal', P(t - 0.06, y0), P(t + 0.06, y0), P(t + 0.06, h), P(t - 0.06, h)); }
      for (let j = 1; j <= levels; j++) { const y = h * j / levels, spans = door && y - 0.35 < door.h ? [[0, door.u - door.w / 2], [door.u + door.w / 2, len]] : [[0, len]];
        for (const [t0, t1] of spans) b.quad('metalDark', P(t0, y - 0.35), P(t1, y - 0.35), P(t1, y), P(t0, y)); }
    }, 'mid').children.slice().forEach(c => g.add(c));
    group(b => {                                                 // floor edges behind the glass, left open over the middle third: the atrium
      const P = (t, d, y) => [A[0] + tx * t - nx * d, y, A[1] + tz * t - nz * d];
      for (let k = 1; back && k < levels; k++) for (const [t0, t1] of [[0.4, len / 3], [len * 2 / 3, len - 0.4]]) {
        const y = h * k / levels; b.quad('stoneGrey', P(t0, 0.5, y), P(t1, 0.5, y), P(t1, 9, y), P(t0, 9, y)); b.quad('metalDark', P(t0, 0.5, y - 0.5), P(t1, 0.5, y - 0.5), P(t1, 0.5, y), P(t0, 0.5, y));
      }
    }, 'mid').children.slice().forEach(c => g.add(c));
    return g;
  }
  // 5 Crowns. flat: the roof a block already has. wedge: the top cut on a slope, low at one end of direction `dir`, high at the other.
  function wedge(o, y, hLow, hHigh, dir = [1, 0], mat = 'glass') {
    const t = o.map(p => p[0] * dir[0] + p[1] * dir[1]), t0 = Math.min(...t), t1 = Math.max(...t), top = t.map(v => y + hLow + (hHigh - hLow) * (v - t0) / (t1 - t0 || 1));
    return group(b => { b.walls(mat, o, o, y, top); b.cap('metalDark', o, top); });
  }
  const stepped = (o, y, steps = 3, stepH = 4, shrink = 0.72, mat = 'stone') => group(b => { let k = 1, yy = y; for (let i = 0; i < steps; i++) { k *= shrink; const q = scaled(o, k); b.walls(mat, q, q, yy, yy + stepH); b.cap('stoneGrey', q, yy + stepH); yy += stepH; } });
  function mast(y, h, r = 0.6) {
    const ring = (rr) => Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * rr, Math.sin(i * Math.PI / 3) * rr]);
    return group(b => { b.walls('metal', ring(r), ring(r * 0.25), y, y + h); b.walls('metalDark', ring(r * 1.8), ring(r * 1.8), y, y + h * 0.06); b.cap('metalDark', ring(r * 1.8), y + h * 0.06); });
  }

  /* ───────── face ───────── */
  // 6 to 9 are the patterned materials: face('glass' | 'stone', floor height, bay width) carries floor lines, bays or piers, and
  // the night windows; a plant band is a level of a stack in metalDark.
  // 10 Entrance: a dark reveal, glass doors, a canopy. Seen only close up. Faces +z.
  function entrance(w = 8, h = 4.5, canopy = 2.6, open = false) {      // open: a doorway to walk through, no glass in it
    return group(b => {
      b.box('metalDark', -w / 2 - 0.3, 0, -0.5, -w / 2, h + 0.3, 0.1); b.box('metalDark', w / 2, 0, -0.5, w / 2 + 0.3, h + 0.3, 0.1); b.box('metalDark', -w / 2 - 0.3, h, -0.5, w / 2 + 0.3, h + 0.3, 0.1);
      if (!open) b.quad('clear', [-w / 2, 0, 0], [w / 2, 0, 0], [w / 2, h, 0], [-w / 2, h, 0]);
      for (let i = 1; !open && i < Math.round(w / 1.8); i++) { const x = -w / 2 + i * w / Math.round(w / 1.8); b.box('metal', x - 0.04, 0, -0.03, x + 0.04, h, 0.05); }
      b.box('metal', -w / 2 - 0.6, h + 0.3, -0.2, w / 2 + 0.6, h + 0.5, canopy);
    }, 'near');
  }

  /* ───────── projections ───────── */
  // 11 Cantilevered deck or terrace: a slab on an outline, its top at height y. Paved top, dark edge, metal soffit.
  //    `hole`: an outline left open right through the slab (a glass floor is set in it).
  const deck = (o, y, t = 0.9, { hole = null } = {}) => group(b => { const hs = hole ? [hole] : []; b.cap('stoneGrey', o, y, hs); b.walls('metalDark', o, o, y - t, y); b.cap('metal', o, y - t, hs); if (hole) b.walls('metalDark', hole, hole, y - t, y); });
  // 12 Glass balustrade along a path at height y: upright, or leaning out by `lean` degrees. `side` +1 or -1 says which side
  //    of the path is outside. Panels of glass with a thin metal top rail; the rail and the joints are seen only close up.
  function balustrade(path, y, h = 1.2, { lean = 0, side = 1, closed = false, panel = 1.5 } = {}) {
    const g = new THREE.Group(), n = path.length, segs = closed ? n : n - 1, out = Math.tan(lean * Math.PI / 180) * h;
    const N = (i) => { const a = path[i], c = path[(i + 1) % n], l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1; return [(c[1] - a[1]) / l * side, -(c[0] - a[0]) / l * side]; };
    const top = (p, nn) => [p[0] + nn[0] * out, y + h, p[1] + nn[1] * out];
    // at a corner of the path the two leaning panes meet in one line: the top of the corner is where their top edges cross
    const V = path.map((p, i) => { const hasA = closed || i > 0, hasB = closed || i < n - 1, na = hasA ? N((i - 1 + n) % n) : null, nb = hasB ? N(i) : null;
      if (!na || !nb) return top(p, na || nb); const k = 1 + na[0] * nb[0] + na[1] * nb[1]; return k < 0.05 ? top(p, nb) : [p[0] + (na[0] + nb[0]) / k * out, y + h, p[1] + (na[1] + nb[1]) / k * out]; });
    const lerp3 = (a, c, f) => [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, a[2] + (c[2] - a[2]) * f];
    group(b => { for (let i = 0; i < segs; i++) { const a = path[i], c = path[(i + 1) % n]; b.quad('clear', [a[0], y, a[1]], [c[0], y, c[1]], V[(i + 1) % n], V[i]); } }).children.forEach(c => g.add(c));
    group(b => {
      for (let i = 0; i < segs; i++) {
        const a = path[i], c = path[(i + 1) % n], nn = N(i), l = Math.hypot(c[0] - a[0], c[1] - a[1]), k = Math.max(1, Math.round(l / panel)), ta = V[i], tc = V[(i + 1) % n];
        { const ux = (tc[0] - ta[0]), uz = (tc[2] - ta[2]), ul = Math.hypot(ux, uz) || 1, ex = ux / ul * 0.035, ez = uz / ul * 0.035, px = -ez, pz = ex, A = [ta[0] - ex, ta[1], ta[2] - ez], Cc = [tc[0] + ex, tc[1], tc[2] + ez], hh = 0.05;   // the handrail: 7 cm wide, 5 cm deep, run on half its width past each end so two rails meet at a corner
          const q = (p, s, up) => [p[0] + px * s, p[1] + (up ? hh : 0), p[2] + pz * s];
          b.quad('metal', q(A, -1, 1), q(Cc, -1, 1), q(Cc, 1, 1), q(A, 1, 1)); for (const s of [-1, 1]) b.quad('metal', q(A, s, 0), q(Cc, s, 0), q(Cc, s, 1), q(A, s, 1));
          for (const E of [A, Cc]) b.quad('metal', q(E, -1, 0), q(E, 1, 0), q(E, 1, 1), q(E, -1, 1)); }
        for (let j = 0; j <= k; j++) { const f = j / k, p = [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f], q = lerp3(ta, tc, f), d = 0.02; b.quad('metal', [p[0] - d * nn[1], y, p[1] + d * nn[0]], [p[0] + d * nn[1], y, p[1] - d * nn[0]], [q[0] + d * nn[1], q[1], q[2] - d * nn[0]], [q[0] - d * nn[1], q[1], q[2] + d * nn[0]]); }
      }
    }, 'near').children.slice().forEach(c => g.add(c));
    return g;
  }
  // 13 Glass floor panel set in a deck: clear glass with a thin metal frame, a hair above the deck.
  const glassFloor = (o, y) => { const g = group(b => b.cap('clear', o, y + 0.02)); group(b => { const q = scaled(o, 1.04); b.walls('metal', q, q, y, y + 0.03); }, 'near').children.slice().forEach(c => g.add(c)); return g; };
  // 14 Bleacher steps: n steps of width w rising along +x from (x0, z0).
  const bleachers = (w, n, rise = 0.45, going = 0.9, y = 0) => group(b => { for (let i = 0; i < n; i++) b.box(i % 2 ? 'stoneGrey' : 'stone', i * going, y, -w / 2, (i + 1) * going, y + (i + 1) * rise, w / 2); });
  // 14b Bleacher steps on a four-sided outline [low inner, low outer, high outer, high inner]: n steps climb from the low side to
  //     the high side, each as wide as the outline is there (so a flight can narrow as it climbs, between a wall and a slanting edge).
  function stepsOn(q, n, rise, y = 0) {
    const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return group(b => { for (let i = 0; i < n; i++) { const o = [mid(q[0], q[3], i / n), mid(q[1], q[2], i / n), mid(q[1], q[2], (i + 1) / n), mid(q[0], q[3], (i + 1) / n)], h = y + (i + 1) * rise; b.walls(i % 2 ? 'stoneGrey' : 'stone', o, o, y, h); b.cap(i % 2 ? 'stoneGrey' : 'stone', o, h); } });
  }
  // Edge light: the soft glow down the face below an edge (night only). `path` runs along the edge at height y.
  function edgeGlow(path, y, { closed = true, drop = 1.0 } = {}) {
    const n = path.length, segs = closed ? n : n - 1, b = new Bag();
    for (let i = 0; i < segs; i++) { const a = path[i], c = path[(i + 1) % n]; b.quad(m.glow, [a[0], y + 0.12 * drop, a[1]], [c[0], y + 0.12 * drop, c[1]], [c[0], y - drop, c[1]], [a[0], y - drop, a[1]], [0, 1], [1, 1], [1, 0], [0, 0]); }
    const g = b.into(new THREE.Group()); g.children.forEach(c => { c.renderOrder = 8; }); return g;
  }

  /* ───────── inside (a separate mode: the body becomes a ghost shell) ───────── */
  const shell = (lo, hi, y0, y1, yh) => group(b => { b.walls('shell', lo, hi, y0, yh || y1); });
  // 15 Floor plates at the heights given; `at(y)` returns the outline at that height.
  //    at(y) gives the plate's outline, or { o, holes } where the floor is open (an atrium void): the hole's edge is closed like the plate's
  //    `top` and `under`: the materials of the floor and of the ceiling below it (a mall: 'mallFloor', 'mallCeil').
  const plates = (at, ys, t = 0.3, { top = 'iPlate', under = 'iDark' } = {}) => group(b => { for (const y of ys) { const q = at(y), o = q.o || q, hs = q.holes || []; b.cap(top, o, y, hs); b.walls('iDark', o, o, y - t, y); b.cap(under, o, y - t, hs); for (const hl of hs) b.walls('iDark', hl, hl, y - t, y); } }, 'mid');
  // A crown or any closed top: from an outline up to another whose corners stand at their own heights.
  const loft = (lo, hi, y0, yh, mat = 'glass', top = 'metalDark') => group(b => { b.walls(mat, lo, hi, y0, yh); b.cap(top, hi, yh); });
  // 16 Core as blocks [x0, z0, x1, z1] from y0 to y1.
  //    A block may begin with its kind: lift banks are metal, everything else dark metal.
  const core = (blocks, y0, y1, { mat = null } = {}) => group(b => { for (const q of blocks) { const k = typeof q[0] === 'string' ? q[0] : null, [x0, z0, x1, z1] = k ? q.slice(1) : q; b.box(mat || (k === 'elevators' ? 'iMetal' : 'iDark'), Math.min(x0, x1), y0, Math.min(z0, z1), Math.max(x0, x1), y1, Math.max(z0, z1)); } });
  // A flat area on a floor (a room shown by its floor only), a hair above the plate and below the route line.
  const floorArea = (o, y, mat = 'iStone', fill = 0.955) => group(b => { b.cap('iDark', o, y + 0.012); b.cap(mat, scaled(o, fill), y + 0.024); }, 'mid');   // a dark line round it, so rooms side by side read apart
  // 17 Express lift: its shaft picked out in the route colour, a car that travels between two heights.
  const cars = [];
  function lift(x, z, w, d, y0, y1, { carH = 3, speed = 0.12, door = null } = {}) {
    const g = group(b => { const o = rect(w, d, x, z); b.walls(m.liftShaft, o, o, y0, y1); });
    const shaft = g.children.slice(), car = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, carH, d * 0.8), m.lift); car.position.set(x, y0 + carH / 2, z); g.add(car);
    const rec = { car, y0: y0 + carH / 2, y1: y1 - carH / 2, t: 0, speed, held: false }; cars.push(rec);
    // With `door` ({ side: -1 or 1 along x, at: offset along z, w, h }) the car can be ridden: g.userData.ride(floorY, open) holds it at a
    // floor height with its own doors open (1) to closed (0), and shows the car from within: a floor, a dark ceiling, clear walls (the shaft's colour is not drawn then),
    // a dark door wall with two metal leaves. ride(null) gives it back to its own travelling, seen from outside as before.
    if (door) { const cw = w * 0.8, cd = d * 0.8, h = Math.min(carH - 0.3, 2.6), dw = door.w || 1.1, dh = door.h || 2.1, xs = door.side * cw / 2, za = door.at || 0, inn = new THREE.Group(), leaves = [];
      const box = (mat, x0, y0b, z0, x1, y1b, z1) => { const o = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0) || 0.02, Math.abs(y1b - y0b) || 0.02, Math.abs(z1 - z0) || 0.02), typeof mat === 'string' ? m[mat] : mat); o.position.set((x0 + x1) / 2, (y0b + y1b) / 2, (z0 + z1) / 2); inn.add(o); return o; };
      box('stone', -cw / 2, -0.04, -cd / 2, cw / 2, 0, cd / 2); box('metalDark', -cw / 2, h, -cd / 2, cw / 2, h + 0.04, cd / 2);
      const glass = m.clear.clone(); glass.side = THREE.DoubleSide;
      box(glass, -xs, 0, -cd / 2, -xs, h, cd / 2); box(glass, -cw / 2, 0, -cd / 2, cw / 2, h, -cd / 2); box(glass, -cw / 2, 0, cd / 2, cw / 2, h, cd / 2);
      box('metalDark', xs, 0, -cd / 2, xs, h, za - dw / 2); box('metalDark', xs, 0, za + dw / 2, xs, h, cd / 2); box('metalDark', xs, dh, za - dw / 2, xs, h, za + dw / 2);
      for (const s of [-1, 1]) { const lf = box('metal', xs - 0.02, 0, za + s * 0.005, xs + 0.02, dh, za + s * dw / 2); lf.userData = { z: lf.position.z, s }; leaves.push(lf); }
      inn.visible = false; inn.position.set(x, y0, z); g.add(inn);
      // what tells the rider the car is moving: a dark line round the shaft at every floor (door.floorH apart), passing the clear walls
      const fh = door.floorH || 4, nR = Math.max(0, Math.floor((y1 - y0) / fh) - 1), bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), m.metalDark, nR * 4), M = new THREE.Matrix4();
      for (let k = 0; k < nR; k++) { const y = y0 + (k + 1) * fh; [[x, z - d / 2, w, 0.05], [x, z + d / 2, w, 0.05], [x - w / 2, z, 0.05, d], [x + w / 2, z, 0.05, d]].forEach(([bx, bz, sx, sz], j) => bars.setMatrixAt(k * 4 + j, M.makeScale(sx, 0.3, sz).setPosition(bx, y, bz))); }
      bars.visible = false; bars.frustumCulled = false; g.add(bars);
      g.userData.ride = (fy, open = 1, inside = true) => { rec.held = fy != null; inn.visible = rec.held; car.visible = !rec.held; for (const o of shaft) o.visible = !rec.held; bars.visible = rec.held && inside; if (!rec.held) return;   // ridden, the shaft's colour steps aside: the rider looks out
        inn.position.y = fy; car.position.y = fy + carH / 2; for (const lf of leaves) lf.position.z = lf.userData.z + lf.userData.s * dw / 2 * 0.92 * open; }; }
    return g;
  }
  // 21 Plinth.
  const plinth = (o, h = 0.45) => group(b => { b.walls('stoneGrey', o, o, 0, h); b.cap('stoneGrey', o, h); });

  /* ───────── inside furniture: one set for every landmark; a landmark's accent colour makes it its own ─────────
     Sizes are ordinary building dimensions, no source checked (level D on the dimension sheet). Each stands on y = 0 and is
     approached from -z: a visitor walks toward +z. */
  // 22 Service desk: a counter w wide with a raised front, an accent band along it, a work top behind, and a back wall with a sign band.
  function desk(w = 6, { back = true } = {}) {
    return group(b => {
      b.box('stone', -w / 2, 0, -0.4, w / 2, 1.1, -0.25); b.box('accent', -w / 2, 0.8, -0.425, w / 2, 0.94, -0.4);
      b.box('metalDark', -w / 2 - 0.03, 1.1, -0.46, w / 2 + 0.03, 1.14, 0.38);
      b.box('stone', -w / 2, 0, -0.25, -w / 2 + 0.14, 1.1, 0.35); b.box('stone', w / 2 - 0.14, 0, -0.25, w / 2, 1.1, 0.35);
      b.box('stoneGrey', -w / 2 + 0.14, 0.72, -0.25, w / 2 - 0.14, 0.76, 0.35);
      if (back) { b.box('metalDark', -w / 2, 0, 1.6, w / 2, 2.7, 1.72); b.box('accent', -w / 2, 2.15, 1.57, w / 2, 2.45, 1.6); }
    }, 'near');
  }
  // 23 Ticket gates: n lanes 0.6 m wide and `wide` lanes 0.92 m wide between slim cabinets, glass wings drawn open. Not a subway
  //    turnstile: no arms, no cage. userData.lanes gives each lane's centre (x), so a walk can be put through one.
  function ticketGates(n = 4, { wide = 1 } = {}) {
    const lanes = [...Array(n).fill(0.6), ...Array(wide).fill(0.92)], cab = 0.22, total = lanes.reduce((a, v) => a + v, 0) + cab * (lanes.length + 1), xs = []; let x = -total / 2;
    const g = group(b => {
      for (let i = 0; i <= lanes.length; i++) {
        b.box('metal', x, 0, -0.7, x + cab, 0.98, 0.7); b.box('metalDark', x - 0.01, 0.98, -0.71, x + cab + 0.01, 1.02, 0.71); b.box('accent', x + 0.05, 1.02, -0.45, x + cab - 0.05, 1.03, 0.45);
        if (i < lanes.length) { for (const sx of [x + cab, x + cab + lanes[i] - 0.03]) b.box('clear', sx, 0.15, -0.28, sx + 0.03, 0.95, 0.28); xs.push(x + cab + lanes[i] / 2); x += cab + lanes[i]; }
      }
    }, 'near');
    g.userData.lanes = xs; g.userData.width = total; return g;
  }
  // 24 Security check: a walk-through arch on the line of the walk (x = 0) and, beside it, a bag scanner with its roller tables.
  function security({ scanner = true, side = 1 } = {}) {
    return group(b => {
      for (const sx of [-0.55, 0.45]) b.box('metal', sx, 0, -0.3, sx + 0.1, 2.1, 0.3);
      b.box('metal', -0.55, 2.1, -0.3, 0.55, 2.22, 0.3); b.box('accent', -0.55, 2.22, -0.3, 0.55, 2.25, 0.3);
      if (scanner) { const x0 = side * 1.2, x1 = side * 2.1, a = Math.min(x0, x1), c = Math.max(x0, x1);
        b.box('metalDark', a, 0, -0.8, c, 1.3, 0.8); b.box('stoneGrey', a + 0.12, 0, -2.0, c - 0.12, 0.78, -0.8); b.box('stoneGrey', a + 0.12, 0, 0.8, c - 0.12, 0.78, 2.0); b.box('accent', a, 1.3, -0.8, c, 1.33, 0.8); }
    }, 'near');
  }
  // 25 Queue line: posts a metre high along a path, a belt in the accent colour between them.
  function queue(path) {
    return group(b => {
      for (let i = 0; i < path.length; i++) {
        const p = path[i]; b.box('metalDark', p[0] - 0.035, 0, p[1] - 0.035, p[0] + 0.035, 1.0, p[1] + 0.035); b.box('metalDark', p[0] - 0.16, 0, p[1] - 0.16, p[0] + 0.16, 0.03, p[1] + 0.16);
        if (i) { const q = path[i - 1], l = Math.hypot(p[0] - q[0], p[1] - q[1]), nx = -(p[1] - q[1]) / l * 0.012, nz = (p[0] - q[0]) / l * 0.012; b.quad('accent', [q[0] + nx, 0.88, q[1] + nz], [p[0] + nx, 0.88, p[1] + nz], [p[0] + nx, 0.94, p[1] + nz], [q[0] + nx, 0.94, q[1] + nz]); b.quad('accent', [q[0] - nx, 0.88, q[1] - nz], [p[0] - nx, 0.88, p[1] - nz], [p[0] - nx, 0.94, p[1] - nz], [q[0] - nx, 0.94, q[1] - nz]); }
      }
    }, 'near');
  }
  // 26 Lift doors: n pairs of doors in a row on a wall at z = 0, each in a dark frame with an indicator in the accent colour over it.
  //    With `body`, the bank itself stands behind them as a block (a core piece on its own).
  //    `open`: the index of a pair that stands open (the lift in use): its leaves drawn slid aside.
  function liftDoors(n = 3, { w = 1.1, h = 2.1, gap = 2.6, body = 0, bodyH = 3.2, open = -1 } = {}) {
    return group(b => {
      const total = (n - 1) * gap;
      if (body) b.box('metalDark', -total / 2 - gap / 2, 0, 0, total / 2 + gap / 2, bodyH, body);
      for (let i = 0; i < n; i++) { const x = -total / 2 + i * gap;
        if (i === open) { b.box('metalDark', x - w / 2 - 0.12, 0, -0.06, x - w / 2, h + 0.12, 0); b.box('metalDark', x + w / 2, 0, -0.06, x + w / 2 + 0.12, h + 0.12, 0); b.box('metalDark', x - w / 2, h, -0.06, x + w / 2, h + 0.12, 0); }
        else { b.box('metalDark', x - w / 2 - 0.12, 0, -0.06, x + w / 2 + 0.12, h + 0.12, 0); b.box('metal', x - w / 2, 0, -0.08, x - 0.01, h, -0.06); b.box('metal', x + 0.01, 0, -0.08, x + w / 2, h, -0.06); }
        b.box('accent', x - 0.18, h + 0.2, -0.07, x + 0.18, h + 0.32, -0.05); }
    }, 'near');
  }
  // 28 Shopfronts along a mall concourse: a run `len` long along +x on z = 0, facing -z. Each bay (about `bay` wide) has a glass
  //    front with a doorway at its middle, dark posts between bays and a blank dark fascia over them (no names), a plain wall behind.
  //    The front is one drawn pattern per bay (shopTex: a pale stone portal, a dark fascia with a blank name plate, the glass with the
  //    depth of the shop suggested behind it, a pair of doors as fine lines), lit from within at night; pilasters between the bays stand
  //    out a little. Behind it the shops are one plain body `depth` deep, roofed, so they read as rooms from above.
  function shopfront(len, { h = 4.2, bay = 6, depth = 12 } = {}) {
    return group(b => {
      const k = Math.max(1, Math.round(len / bay)), w = len / k;
      b.quad('shop', [0, 0, 0], [len, 0, 0], [len, h, 0], [0, h, 0], [0, 0], [k, 0], [k, 1], [0, 1]);
      for (let i = 0; i <= k; i++) b.box('stone', i * w - 0.18, 0, -0.14, i * w + 0.18, h, 0.02);
      b.box('metalDark', 0, h, -0.14, len, h + 0.12, 0.3);
      const o = [[0, 0.03], [len, 0.03], [len, depth], [0, depth]]; b.walls('stone', o, o, 0, h, { 0: [{ u0: 0, u1: 1e9, y0: -1, y1: 1e9 }] }); b.cap('stoneGrey', o, h);
    }, 'near');
  }
  // 31 A landmark's own front in a mall: a blank run `len` long along +x on z = 0, facing -z, in dark metal panels with the mall's
  //    rhythm of pilasters and a fascia, no windows. `name`: its sign, set over a doorway by nameSign.
  function frontWall(len, { h = 5.1, bay = 6, depth = 0.3 } = {}) {
    return group(b => { const k = Math.max(1, Math.round(len / bay)), w = len / k;
      b.quad('front', [0, 0, 0], [len, 0, 0], [len, h, 0], [0, h, 0], [0, 0], [k, 0], [k, 1], [0, 1]);
      for (let i = 0; i <= k; i++) b.box('metalDark', i * w - 0.18, 0, -0.14, i * w + 0.18, h, 0.02);
      const o = [[0, 0.03], [len, 0.03], [len, depth], [0, depth]]; b.walls('metalDark', o, o, 0, h, { 0: [{ u0: 0, u1: 1e9, y0: -1, y1: 1e9 }] }); }, 'near');
  }
  // 32 A name sign: light letters `w` wide and `h` high, centred on the origin, facing -z; they glow at night.
  const signMats = [];
  function nameSign(text, w = 4, h = 1) {
    const mat = new THREE.MeshBasicMaterial({ map: nameTex(text), transparent: true, depthWrite: false, side: THREE.DoubleSide }); mat.color = m.lamp.color; signMats.push(mat);
    const g = new THREE.Group(), o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); o.rotation.y = Math.PI; o.renderOrder = 6; g.add(o); return g;
  }
  // 33 Light in a dark interior: flat shapes that glow, each given as four points (the kit draws them; what they stand for is the place's).
  const glow = (quads) => group(b => { for (const q of quads) b.quad('exhibit', q[0], q[1], q[2], q[3]); }, 'mid');
  // 29 Ceiling lights along a way: flat panels under a ceiling at height y, one every few metres along the path, lying along it.
  function ceilingLights(path, y, { every = 3.5, len = 1.8, w = 0.4 } = {}) {
    return group(b => { let carry = every / 2;
      for (let i = 0; i < path.length - 1; i++) { const a = path[i], c = path[i + 1], l = Math.hypot(c[0] - a[0], c[1] - a[1]); if (l < 0.01) continue; const dx = (c[0] - a[0]) / l, dz = (c[1] - a[1]) / l;
        for (let s = carry; s < l; s += every) { const x = a[0] + dx * s, z = a[1] + dz * s, P = (u, v) => [x + dx * u - dz * v, y, z + dz * u + dx * v]; b.quad('lamp', P(-len / 2, -w / 2), P(len / 2, -w / 2), P(len / 2, w / 2), P(-len / 2, w / 2)); }
        carry = (carry - l) % every; if (carry < 0) carry += every; }
    }, 'near');
  }
  // 30 Light slots in a ceiling: each run [a, b] is one unbroken slot of light, `w` wide, at height y.
  const lightSlots = (runs, y, w = 0.3) => group(b => { for (const [a, c] of runs) { const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / l * w / 2, nz = (c[0] - a[0]) / l * w / 2; b.quad('lamp', [a[0] - nx, y, a[1] - nz], [c[0] - nx, y, c[1] - nz], [c[0] + nx, y, c[1] + nz], [a[0] + nx, y, a[1] + nz]); } }, 'near');
  // 27 Escalator in a building: one unit climbing `rise` at 30 degrees along +z, with a flat landing at each end; glass sides, dark handrails.
  function escalator(rise, { w = 1.0, land = 1.3 } = {}) {
    const run = rise / Math.tan(Math.PI / 6), z0 = land, z1 = land + run, z2 = 2 * land + run;
    return group(b => {
      const P = (x, y, z) => [x, y, z];
      b.quad('stoneGrey', P(-w / 2, 0.02, 0), P(w / 2, 0.02, 0), P(w / 2, 0.02, z0), P(-w / 2, 0.02, z0)); b.quad('stoneGrey', P(-w / 2, 0.02, z0), P(w / 2, 0.02, z0), P(w / 2, rise + 0.02, z1), P(-w / 2, rise + 0.02, z1)); b.quad('stoneGrey', P(-w / 2, rise + 0.02, z1), P(w / 2, rise + 0.02, z1), P(w / 2, rise + 0.02, z2), P(-w / 2, rise + 0.02, z2));
      for (const sx of [-w / 2 - 0.02, w / 2 + 0.02]) {
        b.quad('clear', P(sx, 0, 0), P(sx, 0, z0), P(sx, 0.95, z0), P(sx, 0.95, 0)); b.quad('clear', P(sx, 0, z0), P(sx, rise, z1), P(sx, rise + 0.95, z1), P(sx, 0.95, z0)); b.quad('clear', P(sx, rise, z1), P(sx, rise, z2), P(sx, rise + 0.95, z2), P(sx, rise + 0.95, z1));
        // the handrail: a dark band 9 cm wide and 7 cm deep along the top of the glass on both sides, turned down to the floor at each end (the newel)
        const t = 0.045, hh = 0.07, rail = (ya, za, yb, zb) => { b.quad('metalDark', P(sx - t, ya + hh, za), P(sx + t, ya + hh, za), P(sx + t, yb + hh, zb), P(sx - t, yb + hh, zb)); b.quad('metalDark', P(sx - t, ya, za), P(sx + t, ya, za), P(sx + t, yb, zb), P(sx - t, yb, zb));
          for (const o of [-t, t]) b.quad('metalDark', P(sx + o, ya, za), P(sx + o, yb, zb), P(sx + o, yb + hh, zb), P(sx + o, ya + hh, za)); };
        rail(0.95, 0, 0.95, z0); rail(0.95, z0, rise + 0.95, z1); rail(rise + 0.95, z1, rise + 0.95, z2);
        // each end is rounded: the handrail turns down round the end of the glass in a half circle and the glass ends in the same curve
        const R = 0.46, ri = R - hh, newel = (y0, zc, dir) => { const yc = y0 + 0.95 + hh - R, N = 10, pt = (r, k) => { const a = Math.PI * k / N; return P(sx, yc + r * Math.cos(a), zc + dir * r * Math.sin(a)); };
          for (let k = 0; k < N; k++) { const a0 = pt(R, k), a1 = pt(R, k + 1), i0 = pt(ri, k), i1 = pt(ri, k + 1), off = (p, o) => [p[0] + o, p[1], p[2]];
            b.quad('metalDark', off(a0, -t), off(a0, t), off(a1, t), off(a1, -t)); b.quad('metalDark', off(i0, -t), off(i0, t), off(i1, t), off(i1, -t));
            for (const o of [-t, t]) b.quad('metalDark', off(a0, o), off(a1, o), off(i1, o), off(i0, o));
            b.tri('clear', P(sx, yc, zc), i0, i1); }
          b.tri('clear', P(sx, y0, zc), P(sx, yc, zc), pt(ri, N)); };
        newel(0, 0, -1); newel(rise, z2, 1);
        b.quad('metal', P(sx, 0, 0), P(sx, 0, z0), P(sx, 0.18, z0), P(sx, 0.18, 0)); b.quad('metal', P(sx, 0, z0), P(sx, rise, z1), P(sx, rise + 0.18, z1), P(sx, 0.18, z0)); b.quad('metal', P(sx, rise, z1), P(sx, rise, z2), P(sx, rise + 0.18, z2), P(sx, rise + 0.18, z1));   // the skirt at the foot of the glass
      }
      b.quad('metalDark', P(-w / 2 - 0.3, -0.25, z0), P(w / 2 + 0.3, -0.25, z0), P(w / 2 + 0.3, rise - 0.25, z1), P(-w / 2 - 0.3, rise - 0.25, z1));     // the truss underneath
    });
  }
  // The landmark's accent: a name from the palette's LANDMARK_ACCENTS.
  const setAccent = (key) => { m.accent.color.set((LANDMARK_ACCENTS[key] || LANDMARK_ACCENTS.none).accent); m.accent.userData.day = m.accent.color.getHex(); };

  /* ───────── day and night, distance, movement ───────── */
  function setNight(t) {                                         // 0 = day, 1 = night
    const dark = NIGHT.sidewalk;
    m.glass.color.copy(mix(LANDMARK.glass, dark, 0.74 * t)); m.clear.color.copy(mix(LANDMARK.glass, NIGHT.steel, 0.6 * t));
    m.stone.color.copy(mix(LANDMARK.stone, dark, 0.66 * t)); m.stoneGrey.color.copy(mix(LANDMARK.stoneGrey, dark, 0.7 * t));
    m.metal.color.copy(mix(LANDMARK.metal, NIGHT.steel, t)); m.metalDark.color.copy(mix(LANDMARK.metalDark, NIGHT.road, 0.6 * t));
    m.copper.color.copy(mix(LANDMARK.copper, NIGHT.road, 0.72 * t)); m.copper.emissive.copy(C(LANDMARK.copper)).multiplyScalar(0.07 * t); m.copper.shininess = 60 + 80 * t;
    // indoors the lights are on at night: what stands inside darkens far less than the outside, and the ceiling panels glow
    m.glow.opacity = t; m.iPlate.color.copy(mix(LANDMARK.stoneGrey, dark, 0.3 * t)); m.iDark.color.copy(m.metalDark.color); m.iMetal.color.copy(mix(LANDMARK.metal, NIGHT.steel, 0.5 * t)); m.iStone.color.copy(mix(LANDMARK.stone, dark, 0.22 * t)); m.lamp.color.copy(mix(LANDMARK.stone, NIGHT.window, t));
    m.greyFloor.color.copy(m.iPlate.color); m.steel.color.copy(m.iMetal.color); for (const gz of glazings) gz.color.copy(mix('#ffffff', dark, 0.5 * t));
    m.front.color.copy(m.metalDark.color); m.mallFloor.color.copy(m.iStone.color); m.mallCeil.color.copy(m.metalDark.color); m.shop.color.copy(mix('#ffffff', dark, 0.45 * t)); m.shop.emissive.copy(C(NIGHT.window)).multiplyScalar(0.85 * t);
    for (const f of Object.values(faces)) { f.color.copy(f.userData.kind === 'stone' ? m.stone.color : m.glass.color); f.emissive.copy(C(NIGHT.window)).multiplyScalar(0.95 * t); }
  }
  // Show what belongs to the distance. `from` is the viewer's place (a Vector3): each part is judged by its own distance, so the
  // door at the foot of a tower and the rail on its deck 300 m up are each shown when the viewer is near THEM. A number is taken
  // as one distance for the whole object.
  const _c = new THREE.Vector3();
  const lod = (obj, from) => obj.traverse(o => {
    if (!o.userData.lod) return;
    let d = from;
    if (typeof from !== 'number') { if (!o.userData.at) { o.geometry.computeBoundingSphere(); o.updateWorldMatrix(true, false); o.userData.at = o.localToWorld(o.geometry.boundingSphere.center.clone()); } d = _c.copy(from).distanceTo(o.userData.at); }
    o.visible = d < (o.userData.lod === 'near' ? LOD.near : LOD.mid);
  });
  // Cut what is inside off above this height (in the scene's own metres; pass Infinity for no cut). The renderer must have
  // localClippingEnabled set.
  const setCut = (y) => { cutPlane.constant = Number.isFinite(y) ? y : 1e9; };
  const tick = (dt) => { for (const c of cars) { if (c.held) continue; c.t += dt * c.speed; const k = 0.5 - 0.5 * Math.cos(c.t); c.car.position.y = c.y0 + (c.y1 - c.y0) * k; } };

  /* ───────── the showroom's samples: each element on its own, on made-up sizes ───────── */
  const add = (g, ...parts) => { parts.forEach(p => g.add(p)); return g; };
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const swatch = (mat) => () => group(b => b.box(mat, -2, 0, -2, 2, 6, 2));
  const tower = () => { const lo = rect(26, 20), hi = rect(18, 20, -4, 0); return add(new THREE.Group(), shaft(lo, hi, 0, 60, face('glass', 4, 1.5))); };
  const setbacks = () => stack([
    { o: rect(30, 22), y0: 0, y1: 16, mat: face('stone', 4, 2.4) }, { o: rect(24, 18), y0: 16, y1: 36, mat: face('stone', 4, 2.4) },
    { o: rect(24.4, 18.4), y0: 36, y1: 39, mat: 'metalDark' }, { o: rect(18, 14), y0: 39, y1: 60, mat: face('stone', 4, 2.4) },
  ]);
  const crowns = () => add(new THREE.Group(), at(add(new THREE.Group(), block(rect(10, 10), 8, face('glass', 4, 1.5))), -21, 0, 0),
    at(add(new THREE.Group(), block(rect(10, 10), 8, face('glass', 4, 1.5)), wedge(rect(10, 10), 8, 2, 9, [1, 0], 'glass')), -7, 0, 0),
    at(add(new THREE.Group(), block(rect(10, 10), 8, face('stone', 4, 2.4)), stepped(rect(10, 10), 8, 3, 3)), 7, 0, 0),
    at(add(new THREE.Group(), block(rect(10, 10), 8, face('glass', 4, 1.5)), mast(8, 16)), 21, 0, 0));
  const facePanel = (kind) => () => group(b => { const o = rect(24, 1); b.walls(face(kind, 4, kind === 'stone' ? 2.4 : 1.5), o, o, 0, 28); b.cap('stoneGrey', o, 28); });
  function deckSample() {                                        // a deck thrown out from the corner of a body: every part of group "Projections"
    const tri = [[0, 0], [16, 0], [0, 14]], y = 14;
    return add(new THREE.Group(), block(rect(12, 12, -6, -6), 22, face('glass', 4, 1.5)), deck(tri, y), balustrade([[16, 0], [0, 14]], y, 2.7, { lean: 6.6, side: -1 }),
      balustrade([[0, 0], [16, 0]], y, 2.7, { lean: 6.6, side: 1 }), glassFloor([[8.5, 1.2], [12.5, 1.2], [8.5, 4.7]], y), at(bleachers(5, 6, 0.4, 0.8, 0), 0.4, y, 9), edgeGlow([[0, 0], [16, 0], [0, 14]], y - 0.02, { closed: false }));
  }
  function insideSample() {
    const lo = rect(26, 20), hi = rect(20, 20, -3, 0), H = 48, out = (y) => lo.map((p, i) => [p[0] + (hi[i][0] - p[0]) * y / H, p[1] + (hi[i][1] - p[1]) * y / H]);
    return add(new THREE.Group(), shell(lo, hi, 0, H), plates(out, Array.from({ length: 11 }, (_, i) => 4 + i * 4)), core([[-9, -3, -1, 3], [1, -3, 5, 3]], 0, H), lift(-11, 0, 2.4, 3, 0, H));
  }
  const S = (id, row, name, size, build) => ({ id, group: 'Landmark kit', row, outdoor: true, landmark: true, name, size, trust: 'sample sizes, made up', build });
  const F = (...a) => ({ ...S(...a), small: true, trust: 'D' });   // furniture: shown close together, like the station's
  const ELEMENTS = [
    S('lmMaterials', 'Landmark materials', 'Materials: glass, metal, stone', 'From the left: glass · glass, clear · metal · metal, dark · metal accent, copper (the one shiny material; at most one accent per landmark) · stone · stone, grey', () => add(new THREE.Group(), ...['glass', 'clear', 'metal', 'metalDark', 'copper', 'stone', 'stoneGrey'].map((k, i) => at(swatch(k)(), (i - 3) * 6, 0, 0)))),
    S('lmFaceGlass', 'Landmark faces', 'Glass face: floor lines and bays', 'A drawn pattern, one floor by one bay; plain beyond 600 m, full within 150 m. At night some windows glow. No window is modelled', facePanel('glass')),
    S('lmFaceStone', 'Landmark faces', 'Stone face: piers and floor lines', 'Piers with a window strip between; same distances; fewer windows lit at night', facePanel('stone')),
    S('lmEntrance', 'Landmark faces', 'Entrance', 'Dark reveal, glass doors, canopy. Shown only within 150 m', () => entrance()),
    S('lmShaft', 'Landmark mass', 'Leaning or tapering shaft', 'A lower outline joined to an upper one. One face upright, the opposite leaning', tower),
    S('lmStack', 'Landmark mass', 'Setback stack with a plant band', 'Levels with their own outlines and heights; every setback has its terrace; the dark level is a plant band', setbacks),
    S('lmPodium', 'Landmark mass', 'Podium with a glass front and atrium', 'A low block; one side is glass with the floors seen behind it, open the full height at the middle third', () => podium(rect(40, 26), 20)),
    S('lmCrowns', 'Landmark mass', 'Crowns: flat, wedge, stepped, mast', 'Four ways to end a tower', crowns),
    S('lmDeck', 'Landmark projections', 'Cantilevered deck, leaning glass, glass floor, steps', 'A slab on any outline; balustrade upright or leaning (here 6.6 degrees, 2.7 m); a glass panel in the floor; bleacher steps; at night a soft light under the edge', deckSample),
    F('lmDesk', 'Landmark interior', 'Service desk', 'Counter 1.1 m high with a raised front and an accent band; work top; back wall with a sign band. One model for every landmark; the accent colour is the landmark\'s', () => desk(6)),
    F('lmGates', 'Landmark interior', 'Ticket gates', 'Four lanes 0.6 m and one 0.92 m wide between slim cabinets, glass wings open; accent strip on each cabinet. Not the subway turnstile', () => ticketGates(4)),
    F('lmSecurity', 'Landmark interior', 'Security check', 'Walk-through arch 0.9 m wide and 2.1 m high; bag scanner with roller tables beside it', () => security()),
    F('lmQueue', 'Landmark interior', 'Queue line', 'Posts 1 m high, belt in the accent colour', () => queue([[-3, 0], [0, 0], [3, 0], [3, 2], [0, 2], [-3, 2]])),
    F('lmLiftDoors', 'Landmark interior', 'Lift doors and bank', 'Doors 1.1 by 2.1 m in dark frames, an indicator in the accent colour over each; here with the bank behind as a block', () => liftDoors(3, { body: 2.4 })),
    F('lmEscalator', 'Landmark interior', 'Escalator', 'One unit at 30 degrees with a landing at each end; glass sides, dark handrails', () => escalator(5.4)),
    S('lmInside', 'Landmark inside', 'Ghost shell, floor plates, core, express lift', 'The body as a ghost; a plate per floor near the focus; the core as blocks; the lift in use in the route colour, its car travelling', insideSample),
  ];

  return { ELEMENTS, materials: m, face, glazing, setNight, setAccent, lod, setViewDistance, tick, setCut, rect, scaled,
    parts: { block, shaft, stack, podium, wedge, stepped, mast, entrance, deck, balustrade, glassFloor, bleachers, stepsOn, edgeGlow, shell, plates, core, lift, plinth, loft, floorArea, desk, ticketGates, security, queue, liftDoors, escalator, shopfront, ceilingLights, lightSlots, frontWall, nameSign, glow } };
}

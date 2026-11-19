// NYC landmark wayfinding demo: outdoor base map + indoor levels + precomputed routes, one venue at a time.
// Routes come from scripts/build_routes.py (the Python router is the single source of truth).
import { createOculusExterior } from "./wtc/oculus-exterior.js";
import { createLandmarkLayer } from "./landmark.js";
import { createWalkerLayer } from "./walker3d.js";
import { createStationLayer } from "./station3d.js";
import { createTowersLayer } from "./towers3d.js";
import { createHYWorldLayer, create28StLayer } from "./hy-world.js";
import { createTripCard, createLevelBar } from "./trip-card.js";
import { floorOrder, spreadOffset } from "./floorkit.js";
import { registerSymbols, poiFeatures, bulletsHtml } from "./symbols.js";
import { buildJourney } from "./journey.js";

// bin = NYC building identification number. Camera: `bearing` is the direction the 3D camera looks,
// `insideZoom` frames the route's floors, `towerM` sizes the exterior shot.
import {loadContinuationVenue, venueLeg, normalizedLeg, connectLegs} from "./continuation.js";
import {pennIngress, pennRouteLeg} from "./penn-continuation.js";

const VENUES = [
  { id: "one-vanderbilt", name: "One Vanderbilt", bin: "1090825", target: "ob3-terrace", towerM: 427,
    bearing: -72, insideZoom: 16.75, frameRoute: true, spread: { aheadM: 220, zoom: 15.05, pitch: 60 }, pickerSkips: ["LC", "C7", "LU", "LZ", "LL"],
    floorView: { 35: { node: "35-reception-e", fit: 120, pitch: 52 }, OB1: { node: "ob1-reflect", fit: 110, pitch: 50 }, OB2: { node: "ob2-levitation", fit: 110, pitch: 50 }, OB3: { node: "ob3-boutique", fit: 110, pitch: 50 } },
    station: { id: "grand-central", levels: { street: "L1", b1: "C", b2: "B2", lex: "LX", west7: "M7", madison: "LC", central7: "C7", plat7: "P7", lirr_upper: "LU", lirr_mezz: "LZ", lirr_lower: "LL" } },
    routeScenes: {
      viewer: "building.html?model=one-vanderbilt&experience=segment",
      stationName: "Grand Central", buildingName: "One Vanderbilt",
      streetLevel: "L1", indoorNodePrefix: "l1-", floorScope: true,
      target: "ob3-terrace", start: "st-lx-a",
    },
    floorsModel: "one-vanderbilt",
    floors: { LL: "lirr:LO", LZ: "lirr:MZ", LU: "lirr:UP", P7: "station:P7", C7: "station:C7", LC: "lirr:MC", M7: "station:M7", LX: "station:LX", B2: "station:B2", C: "ov:B1", L1: "ov:L1", 35: "ov:35", OB1: "ov:OB1", OB2: "ov:OB2", OB3: "ov:OB3" }, // web/building.html
    sub: "From the 4 5 6, 7 or Shuttle platform at Grand Central–42 St, or the LIRR, to SUMMIT (from public sources), or an office visit on floor 35 (a scenario)." },
  { id: "30-rock", name: "30 Rockefeller Plaza", bin: "1076262", target: "67-arrive", towerM: 260,
    bearing: 22, insideZoom: 16.9, exteriorZoom: 16.35,
    sub: "From the 47–50 Sts subway to Top of the Rock's 50th St entrance (public sources), or an office visit on floor 22 (a scenario)." },
  { id: "one-wtc", name: "One World Trade Center", bin: "1088469", target: "100-arrive", towerM: 541,
    floorViewer: "wtc/",
    viewerFloors: { B1: "entry", L1: "lobby", 64: "sky64", 75: "tower75", 100: "obs100", 102: "obs102" },
    bearing: -62, insideZoom: 15.5,
    sub: "From WTC Cortlandt or the Oculus side to One World Observatory (public sources), or an office visit on floor 75 (a scenario)." },
  { id: "central-park-tower", name: "Central Park Tower", bin: "1090180", target: "nordstrom-floor-2", towerM: 472,
    routeScenes: {
      viewer: "building.html?model=central-park-tower-station&experience=segment",
      stationName: "57 St–7 Av", buildingName: "Nordstrom",
      streetLevel: "G", indoorNodePrefix: "cpt-N",
      floorScope: true, target: "nordstrom-floor-2",
      starts: ["cpt-platform", "cpt-south-platform"], allowReverse: true,
      altitudeOffset: 4.42,
    },
    floorsModel: "central-park-tower-station",
    cptModel: true, noExits: true, frameRoute: true, groundFloors: ["L1", "N1"],
    floors: { P:"station:P", M:"station:UM", G:"station:street", L1:"cpt:lobby", N1:"retail:1", N2:"retail:2", PH:"cpt:s432" },
    floorView: {
      P:{node:"cpt-platform",fit:85,pitch:46}, M:{node:"cpt-M-175.0--175.2",fit:65,pitch:46},
      L1:{node:"cpt-L1-63.8-12",fit:45,pitch:48}, N1:{node:"cpt-N1-45-2",fit:55,pitch:48},
      N2:{node:"cpt-N2-42.0-35.81",fit:45,pitch:48}, PH:{node:"cpt-PH-63.5-35.8",fit:39,pitch:48},
    },
    bearing: 22, insideZoom: 16.85, exteriorZoom: 15.85, sub: "From either island platform to Nordstrom Floor 2 or the penthouse elevator foyer." },
  // Exterior and surroundings only: model, neighbouring buildings, streets and stations; no indoor route yet.
  // centre = the OSM building's centre (data/landmarks.json); towerM = tallest part, for the 3D camera
  { id: "grand-central", name: "Grand Central Terminal", bin: "1035381", target: "gct-to-ov", noExits: true /* routes start inside the terminal: no exits to rank */, center: [-73.97727, 40.75265],
    keepCenter: true, towerM: 46, bearing: 29, exteriorZoom: 17.2, exteriorPitch: 45, insideZoom: 17.4, frameRoute: true, spread: { aheadM: -90, zoom: 16.1, pitch: 58 },
    station: { id: "grand-central", levels: { street: "L", b1: "MC", b2: "B2", lex: "LX", west7: "M7", madison: "LC", central7: "C7", plat7: "P7", lirr_upper: "LU", lirr_mezz: "LZ", lirr_lower: "LL" } },
    pickerSkips: ["LC", "C7", "LU", "LZ", "LL"],
    floorViewer: "grand-central-terminal/",
    viewerFloors: { L:"street", MC:"main", B2:"rail-b2", LX:"rail-lex", M7:"rail-west7",
      LC:"rail-madison", C7:"rail-central7", P7:"rail-plat7", LU:"rail-lirr_upper",
      LZ:"rail-lirr_mezz", LL:"rail-lirr_lower" },
    sub: "From a subway, LIRR or Metro-North upper platform, through the Main Concourse to One Vanderbilt or the Chrysler Building." },
  { id: "chrysler", name: "Chrysler Building", bin: "1036156", target: "lex-front", towerM: 319, bearing: -40,
    routeScenes: {
      viewer: "building.html?model=one-vanderbilt&experience=segment",
      stationName: "Grand Central–42 St",
      streetLevel: "L", entrance: "lex-front",
      target: "lex-front", start: "st-lx-a",
      floors: { LX: "station:LX", B2: "station:B2" },
    },
    floors: { L: "01" },
    insideZoom: 17.6, frameRoute: true, spread: { aheadM: -90, zoom: 16.1, pitch: 58 },
    station: { id: "grand-central", levels: { street: "L", b1: "B1", b2: "B2", lex: "LX", west7: "M7", madison: "LC", central7: "C7", plat7: "P7", lirr_upper: "LU", lirr_mezz: "LZ", lirr_lower: "LL" } },
    pickerSkips: ["B1", "LC", "C7", "LU", "LZ", "LL"],
    sub: "From a platform at Grand Central–42 St to the Chrysler Building's Lexington Avenue entrance; the lobby only as a scenario." },
  { id: "nypl-schwarzman", name: "NYPL Schwarzman Building", floorViewer: "nypl-schwarzman/", bin: "1034194", target: "f1-115-desk",
    towerM: 38, bearing: -61, exteriorZoom: 17.3, exteriorPitch: 45, insideZoom: 17.6, // from 5th Ave
    sub: "From the 42 St–Bryant Pk / 5 Av subway, step-free through the 42nd St ramp entrance to the Visitor Center (Room 115)." },
  { id: "empire-state", name: "Empire State Building", bin: "1015862", target: "f86-deck",
    routeScenes: {
      viewer: "building.html?model=empire-state&experience=segment",
      stationName: "Herald Sq", buildingName: "Empire State",
      streetLevel: "L", entrance: "l-door", indoorNodePrefix: "l-",
      excludedNodes: ["f86-102-queue", "f102-deck"],
    },
    towerM: 443, bearing: -30, insideZoom: 16.5, frameRoute: true, badgeLabel: "I booked the 102nd Floor", spread: { aheadM: 300, zoom: 15.05, pitch: 60 },
    floorView: { F80: { node: "f80-out", fit: 110, pitch: 52 }, F86: { node: "f86-in", fit: 110, pitch: 52 }, F102: { node: "f102-deck", fit: 60, pitch: 52 } },
    station: { id: "herald-square", levels: { street: "L", mezz: "MZ", ramp_upper: "RU", bmt: "BM", south_lower: "SL", ramp_lower: "RL", ind: "IP" } }, pickerSkips: ["RU", "RL", "SL"],
    floorsModel: "empire-state", floors: { IP: "station:IP", RL: "station:RL", SL: "station:SL", BM: "station:BM", RU: "station:RU", MZ: "station:MZ", L: "esb:1", F2: "esb:2", F80: "esb:80", F86: "esb:86", F102: "esb:102" }, // web/building.html
    sub: "From the B D F M or N Q R W platform at 34 St–Herald Sq to the observatory entrance at 20 W 34th St, through the exhibits and the 80th floor to the 86th Floor deck." },
  { id: "hudson-yards-edge", name: "Edge (30 Hudson Yards)", bin: "1088961", target: "l100-sky",
    routeScenes: {
      viewer: "building.html?model=hudson-yards&experience=segment",
      stationName: "34 St–Hudson Yards", buildingName: "Edge",
      streetLevel: "L1", entrance: "l1-door", indoorNodePrefix: "l1-",
      floorScope: true, target: "l100-sky", start: "hy-platform",
    },
    towerM: 395, bearing: -61, exteriorZoom: 16.05, insideZoom: 16.5, frameRoute: true, spread: { aheadM: 400, zoom: 15.3, pitch: 60 },
    floorView: { L4: { node: "l4-exp-a", fit: 130, pitch: 52 }, L100: { node: "l100-indoor", fit: 130, pitch: 50 } },
    station: { id: "hudson-yards", levels: { street: "L1", upper: "UM", lower: "LM", platform: "P" } },
    floors: { P: "station:P", LM: "station:LM", UM: "station:UM", L1: "shops:L1", L4: "shops:L4", L100: "hy30:100" }, // web/building.html
    sub: "From the 7 train at 34 St–Hudson Yards into The Shops, up to the Edge entrance on Level 4 and the sky deck on Level 100." },
  { id: "columbia-avery", name: "Columbia: Avery Library", bin: "1084460", target: "avery-lib",
    towerM: 27, bearing: -61, exteriorZoom: 17.2, exteriorPitch: 45, insideZoom: 17.4, // from Amsterdam Ave
    badgeLabel: "I have a Columbia ID (CUID)",
    sub: "From the 116 St subway through the campus gate, along College Walk and past Low Library to Avery Library." },
];

const css = getComputedStyle(document.documentElement);
const color = (name) => css.getPropertyValue(name).trim();
const VIEW_2D = { pitch: 0, bearing: 29 }; // avenues point up the screen
const EMPTY = { type: "FeatureCollection", features: [] };

// Point `metres` along a compass bearing from a lon/lat
function offset([lon, lat], bearingDeg, metres) {
  const b = (bearingDeg * Math.PI) / 180;
  return [lon + (Math.sin(b) * metres) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (Math.cos(b) * metres) / 110540];
}
// Inside view frames the stacked floors; the exterior view sits its centre beyond the tower so the top fits
// frameRoute: frame the floors the route uses (One Vanderbilt: the lobby for an office visit, up to ~330 m for SUMMIT)
function viewInside(v) {
  const here = state.route?.steps?.[state.step];
  if (stationCenter && state.ui === "step" && levels[here?.level]?.underground) {
    return { center: stationCenter, pitch: 50, bearing: v.bearing, zoom: isPhone() ? 16.9 : 17.75 };
  }
  // On a floor that has been modelled inside, the camera goes to that floor, wherever it stands. MapLibre looks at the
  // ground, so to frame a floor high above it, it looks at the spot on the ground behind that floor.
  const floor = v.cptModel ? state.level : here?.level;
  const close = (state.ui === "step" || v.cptModel && state.ui === "route") && !state.exploded && v.floorView?.[floor];
  if (close && nodes[close.node]?.lonlat) {
    const anchor = v.cptModel && floor === "P" ? nodes[state.route?.start] || nodes[close.node] : nodes[close.node];
    const pitch = (close.pitch * Math.PI) / 180, h = elevOf(floor), [lon, lat] = anchor.lonlat;
    // the camera stands `fit` metres of view back from the floor, and so above it: MapLibre's field of view shows
    // a height of d / 1.5 at distance d, and the zoom follows from how far the camera then is from the ground
    const toFloor = close.fit * (isPhone() ? 1.35 : 1) * 1.5, toGround = toFloor + h / Math.cos(pitch);
    const pxPerM = (512 / (40075016 * Math.cos((lat * Math.PI) / 180)));
    const zoom = Math.log2((1.5 * map.getContainer().clientHeight) / toGround / pxPerM);
    return { center: offset([lon, lat], v.bearing, h * Math.tan(pitch)), pitch: close.pitch, bearing: v.bearing, zoom };
  }
  const top = v.frameRoute && state.route?.steps ? Math.max(...state.route.steps.map((s) => levels[s.level].elev)) : 0;
  if (top < 200) return { center: v.center, pitch: 52, bearing: v.bearing, zoom: v.insideZoom };
  return { center: offset(v.center, v.bearing, top * 0.7), pitch: 52, bearing: v.bearing, zoom: 15.85 + Math.log2(427 / top) };
}
const viewExterior = (v) => ({ center: offset(v.center, v.bearing, v.towerM * 0.6), pitch: v.exteriorPitch ?? 52, bearing: v.bearing,
  zoom: v.exteriorZoom ?? 16.25 + Math.log2(427 / v.towerM) }); // wide slabs (30 Rock) need a wider shot than height alone suggests

// Provenance classes: what a professional reviewer needs to know about every feature
// Evidence tiers (docs/data-model.md "Evidence"); scripts/venue.py tier_of() is the reference implementation
const TIERS = [
  { id: "official", label: "Official source", long: "Official source (NYC, MTA or the operator's visitor information)", color: "#1a9850" },
  { id: "rebuilt", label: "Rebuilt", long: "Rebuilt from public maps (OpenStreetMap)", color: "#2b6cb0" },
  { id: "scenario", label: "Scenario", long: "Scenario (assumed)", color: "#e08214" },
];
const TIER = Object.fromEntries(TIERS.map((t) => [t.id, t]));
const SOURCE_TIER = { mta: "official", "nyc-opendata": "official", "public-doc": "official", osm: "rebuilt", "osm-snap": "rebuilt" };
function tierOf(item, aspect) {
  const ev = item.evidence || {};
  if (ev[aspect]) return ev[aspect];
  const src = item.source || "illustrative";
  if (aspect === "place" && src === "public-doc") return "rebuilt";
  return SOURCE_TIER[src] || "scenario";
}
const SOURCE_COLOR = ["match", ["coalesce", ["get", "tier"], "scenario"], ...TIERS.flatMap((t) => [t.id, t.color]), "#e08214"];
// Display (settled in index.html before the first paint): the interface is light or dark, the scene is day or night, chosen apart.
// The map and every 3D scene follow the scene (night = the dark map); cards and controls follow the interface (style.css).
const NIGHT = document.documentElement.dataset.scene === "night";
const DARK = NIGHT;
const THEMES = { night: {
  basemap: "https://tiles.openfreemap.org/styles/dark", city: ["#26282c", "#34373d"], city2d: "#2e3136", landmark: "#8a5a4e", footway: "#5b5f66",
  units: { lobby: "#3a3833", "transit-hall": "#2b3a48", core: "#57534c", "elevator-lobby": "#5a4636",
    walkway: "#34322d", tenant: "#2f3a2e", restroom: "#3b3446", floor: "#2a2926" },
  gap: "#2a2926", slabFaded: "#2c2d30", wall: "#8a857b", outerWall: "#cfc8bb", roomLabel: "#bdb7ab", label: "#ece8e0", halo: "#141414",
  route: { done: "#5b616b", current: "#7cb5ff", next: "#3b82f6" }, casing: "#0f1115", stroke: "#0f1115",
  entrance: "#e5e7eb", entranceRing: "#111111", liftRing: "#60a5fa", station: "#9aa4b2", house: "#a9bccb", passage: "#8a939c",
}, day: {
  basemap: "https://tiles.openfreemap.org/styles/positron", city: ["#eceae5", "#d6d3cb"], city2d: "#d6d3cc", landmark: "#e3a898", footway: "#9a9893",
  units: { lobby: "#ece6d8", "transit-hall": "#d9e6f2", core: "#b4afa5", "elevator-lobby": "#f2d3bf",
    walkway: "#eee8dc", tenant: "#dfe8d8", restroom: "#e3dbef", floor: "#f2efe9" },
  gap: "#f6f3ec", slabFaded: "#ebe9e4", wall: "#7d776c", outerWall: "#4a453d", roomLabel: "#6b665c", label: "#2f2c27", halo: "#ffffff",
  route: { done: "#b3b8c2", current: "#1d4ed8", next: "#5b9cf6" }, casing: "#ffffff", stroke: "#ffffff",
  entrance: "#1f2328", entranceRing: "#ffffff", liftRing: "#2563eb", station: "#3f4c5a", house: "#3f5866", passage: "#8a939c",
} };
const T = structuredClone(THEMES[DARK ? "night" : "day"]);       // the colours in use; a change of scene writes the other set into it (applyScene)
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { const e = document.documentElement.dataset; if (e.uiPref === "auto") { e.theme = window.zedDisplay.theme("auto"); sceneFollows(); } });
// A choice in the Display sheet is kept on this device.
// Interface (light / dark): cards and controls only, all in the stylesheet, so it is applied at once.
// Scene (day / night): the map's palette, its basemap and every 3D scene are set when the page loads, so a change of scene draws
// the page again. On Auto the scene follows the interface, so there a change of interface changes the scene too.
function setDisplay(key, value) {
  try { value === "auto" ? localStorage.removeItem(`zed.${key}`) : localStorage.setItem(`zed.${key}`, value); } catch { /* private window: the choice lasts until the page is left */ }
  const e = document.documentElement.dataset;
  if (key === "ui") { e.uiPref = value; e.theme = window.zedDisplay.theme(value); } else e.scenePref = value;
  syncDisplay(); sceneFollows();
}
// A change of scene made in place, without drawing the page again (which took many seconds: every data file and every 3D scene
// was loaded and built anew). The base map's own layers are taken out and the other style's put in their place (both styles
// draw from the same tile sources, so no tile is fetched again); this page's layers are recoloured from the other set of colours;
// the 3D scenes are relit. Returns false if anything fails: the page is then drawn again as before.
const baseStyles = {};
const flatTheme = (o, p = "", out = {}) => { for (const [k, v] of Object.entries(o)) { if (typeof v === "string") out[p + k] = v; else if (v && typeof v === "object") flatTheme(v, `${p}${k}.`, out); } return out; };
async function applyScene(scene) {
  const from = document.documentElement.dataset.scene === "night" ? "night" : "day";
  if (from === scene) return true;
  try {
    const style = baseStyles[scene] ||= await (await fetch(THEMES[scene].basemap)).json();
    const A = { ...flatTheme(THEMES[from], "t."), ...flatTheme(FOCUSES[from], "f.") }, B = { ...flatTheme(THEMES[scene], "t."), ...flatTheme(FOCUSES[scene], "f.") }, swap = new Map();
    for (const k of Object.keys(A)) if (k !== "t.basemap" && A[k] !== B[k] && !swap.has(A[k].toLowerCase())) swap.set(A[k].toLowerCase(), B[k]);
    const sub = (v) => typeof v === "string" ? (swap.get(v.toLowerCase()) ?? v) : Array.isArray(v) ? v.map(sub) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sub(x)])) : v;
    const layers = map.getStyle().layers, before = layers.find((l) => !baseIds.has(l.id))?.id;
    for (const l of layers) if (!baseIds.has(l.id) && l.type !== "custom") for (const [p, v] of Object.entries(l.paint || {})) { const w = sub(v); if (JSON.stringify(w) !== JSON.stringify(v)) map.setPaintProperty(l.id, p, w); }
    for (const id of baseIds) if (map.getLayer(id)) map.removeLayer(id);
    baseIds = new Set();
    for (const l of style.layers) { if (map.getLayer(l.id)) continue; map.addLayer(l, before); baseIds.add(l.id); }
    Object.assign(T, structuredClone(THEMES[scene])); Object.assign(FOCUS, FOCUSES[scene]);
    document.documentElement.dataset.scene = scene;
    rememberBasemap(); setMode(state.is3d, { move: false });
    for (const P of Object.values(V2)) P.world?.setNight?.(scene === "night");
    map.triggerRepaint(); return true;
  } catch (err) { console.warn("scene: the change could not be made in place; drawing the page again", err); return false; }
}
// The scene that the choices now ask for (on Auto it follows the interface: day with light, night with dark). If it is not the one
// on screen, the page is drawn again with it, and what was on screen is put back (resumeView).
function sceneFollows() {
  const e = document.documentElement.dataset;
  const want = window.zedDisplay.scene(e.scenePref, e.uiPref);
  if (want === e.scene) return;
  if (!sceneBusy) { sceneBusy = true; return applyScene(want).then((ok) => { sceneBusy = false; if (ok) sceneFollows(); else redrawForScene(); }); }
}
let sceneBusy = false;
// (kept for when the change cannot be made in place)
function redrawForScene() {
  const open = Object.entries(V2).find(([, P]) => P.card?.isOpen), c = map.getCenter();
  try { sessionStorage.setItem("zed.resume", JSON.stringify({ center: [c.lng, c.lat], zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), is3d: state.is3d,
    trip: open ? { cid: open[0], init: (({ train, dest, via, rev, mode, step, view }) => ({ train, dest, via, rev, mode, step, view }))(open[1].card.state) } : null })); } catch { /* the view is then not put back */ }
  location.reload();
}
// after the page has been drawn again for a change of scene: back to where it was
function resumeView() {
  let r = null; try { r = JSON.parse(sessionStorage.getItem("zed.resume")); sessionStorage.removeItem("zed.resume"); } catch { /* nothing kept */ }
  if (!r) return;
  performance.mark("resume-start");
  if (r.is3d !== state.is3d) setMode(r.is3d, { move: false });
  map.jumpTo({ center: r.center, zoom: r.zoom, pitch: r.pitch, bearing: r.bearing });
  if (r.trip && placeOf(r.trip.cid)) tripCard(r.trip.cid).open(r.trip.init).then(() => performance.mark("resume-trip"));
}
function syncDisplay() {
  const e = document.documentElement.dataset;
  for (const b of document.querySelectorAll("[data-display]")) { const [k, v] = b.dataset.display.split(":"); b.setAttribute("aria-pressed", String((k === "ui" ? e.uiPref : e.scenePref) === v)); }
}
// 3D keeps the eye on the route: a plain ground, faint roads and their names, and a city that is barely there
const FOCUSES = { night: { ground: "#000000", road: "#171717", text: "#6a6a6a", city: "#3c3c3c", cityOpacity: 0.09, footway: "#262626" },
  day: { ground: "#ffffff", road: "#ececec", text: "#a6a6a6", city: "#dcdcdc", cityOpacity: 0.14, footway: "#e8e8e8" } };
const FOCUS = { ...FOCUSES[DARK ? "night" : "day"] };
const ENTRANCE_LABEL = ["match", ["get", "glyph"], "elevator", "Street elevator", "passage", "In building",
  "house", "Station house", "Stairs"];
const OPENING_COLOR = ["match", ["get", "category"], "turnstile", "#b42318", T.gap];
const ROOM_LABEL_FILTER = ["all", ["==", ["get", "feature_type"], "unit"],
  ["!", ["in", ["get", "category"], ["literal", ["core", "elevator-lobby", "restroom"]]]]];
const UNDERGROUND = ["==", ["get", "underground"], true];
const UNIT_COLOR = ["match", ["get", "cat"], ...Object.entries(T.units).flat(), T.units.floor];
// Route by step: done (grey), current (deep blue, wider), upcoming (light blue)
const ROUTE = T.route;
const INDOOR_MINZOOM = 16; // zoomed out: the building reads as one footprint; indoor detail appears closer in
const EXPLODE_GAP_M = 28; // exploded view: schematic spacing between the levels a venue models
const KIND_LABEL = { start: "Start", walk: "Walk", service: "Check in", gate: "Access",
  elevator: "Elevator", escalator: "Escalator", stairs: "Stairs", ramp: "Ramp", arrive: "Arrive" };

const state = { is3d: false, level: "L1", step: 0, route: null, venue: null, back: false, exploded: false, playing: false,
  overview: false, // overview: all 11 landmarks in one view (showOverview)
  speed: 1, // playback speed of Play
  session: false, // a preview is under way (playing, or paused part-way): the step card shows Restart / End
  headingMode: "grid" }; // which way the 2D map turns: "grid" (avenues up), "ahead" (the way you walk), "compass" (the phone)
let journey = [];
let venue, graph, routes, nodes, levels, landmark, subway, exits, walker3d, station3d, towers3d, hyWorld;
// Hudson Yards, second version (owner, 2026-11-18): the station, the park, Vessel and Edge as built in the station guide are drawn
// on this map by hy-world.js. While they stand, the first version's models there are hidden: the Edge tower model, the station
// model under it and the floors of 30 Hudson Yards and The Shops. If the new scene fails to load, the first version shows as before.
const hyV2 = () => Boolean(hyWorld?.ready);
// Stage E: the first version's views are retired where the new page has built the place. Its data stays (the new scenes are built
// from it); what is closed is every way into its own pages and models there. Retired so far: Edge at Hudson Yards.
const RETIRED = { "hudson-yards-edge": { cid: "471", dest: "edge" } };
const HY_COMPLEX = "471", ST28_COMPLEX = "13";                  // 34 St–Hudson Yards and 28 St (R W) in the MTA's list of station complexes
// The places of the new page at Hudson Yards that are not the station: where each stands in the scene (x, z in its metres), how near a
// tap on the map must fall to mean it, and which destination of the trip card it is.
const HY_PLACES = {
  "hudson-yards-edge": { dest: "edge", name: "Edge", sub: "30 Hudson Yards · sky deck on Level 100", at: [-133, 195], r: 45, level: "l100" },   // level: the floor "See layout" opens the tower at
  "hy-vessel": { dest: "vessel", name: "Vessel", sub: "Public Square and Gardens", at: [-212.2, 94.2], r: 26 },
};
function hyPlaceCard(hit) {                                       // the place card: a tap must choose, preview or decide
  const at = hyWorld.lngLat(hit.at[0], hit.at[1]);
  openPopup(at, `<p class="pop-k">Landmark</p><p class="pop-t">${esc(hit.name)}</p><p class="pop-m">${esc(hit.sub)}</p>
    <div class="pop-acts"><button type="button" class="ctl text" data-trip-to>Go here</button><button type="button" class="ctl text" data-see-layout>See layout</button></div>`);
  const pe = popup.getElement();
  pe.querySelector("[data-trip-to]").addEventListener("click", () => { popup?.remove(); tripCard().open({ dest: hit.dest }); });
  // See layout: the place from close by, in 3D. A tower is opened at the floor that matters (the level bar then shows its other floors)
  pe.querySelector("[data-see-layout]").addEventListener("click", () => { popup?.remove(); if (!state.is3d) setMode(true, { move: false });
    if (hit.level) hyWorld.trips().then((ok) => { if (ok) hyWorld.focusLevel(hit.level); });
    else map.easeTo({ center: at, zoom: 16.8, pitch: 60, duration: 1200 }); });
  return true;
}
// a tap on the map in 3D: on Vessel or on the towers as drawn (a ray against the scene), or, before the scene is there, near where they stand
function hyPlaceAt(e) {
  if (!state.is3d || V2[HY_COMPLEX]?.card?.isOpen) return false;
  const id = hyV2() ? hyWorld.pick(e.point) : null;
  const hit = id ? Object.values(HY_PLACES).find((p) => p.dest === id) : Object.values(HY_PLACES).find((p) => e.lngLat.distanceTo(hyWorld.lngLat(p.at[0], p.at[1])) < p.r);
  return hit ? hyPlaceCard(hit) : false;
}
// The places of the new page, by the MTA's station-complex number: each has its scene layer (world), and gets its own trip card and
// level bar the first time it is used. One trip at a time: opening one place's card closes the other's.
const V2 = {};                                                  // complex id -> { world, card, bar }
const placeOf = (cid) => V2[String(cid)];
function tripCard(cid = HY_COMPLEX) {
  const P = placeOf(cid);
  P.card ??= createTripCard({ map, world: P.world, colors: { on: T.route.current, off: T.route.next },
    ensure3d: () => { if (!state.is3d) setMode(true, { move: false }); }, changed: () => syncLevels(cid) });
  const open = P.card.open;
  if (!P.card.wrapped) { P.card.wrapped = true; P.card.open = (init) => { for (const [k, Q] of Object.entries(V2)) if (k !== String(cid) && Q.card?.isOpen) Q.card.close(); return open(init); }; }
  return P.card;
}
// The level switch shows while the place is in focus: cut open, a level chosen, or a trip on. During a started trip a tap goes to the
// trip's first step on that level; otherwise it looks at that level of the place.
function syncLevels(cid = HY_COMPLEX) {
  const P = placeOf(cid);
  if (!P?.world.ready) return;
  P.bar ??= createLevelBar({ host: $("controls"), world: P.world,
    pick: (id) => (P.card?.isOpen && P.card.state.mode === "go" ? P.card.gotoLevel(id) : P.world.focusLevel(id)) });
  const going = Boolean(P.card?.isOpen) && P.card.state.mode === "go";
  P.bar.sync(state.is3d && (Boolean(P.card?.isOpen) || P.world.open || Boolean(P.world.levelId)), going ? P.card.levelsOnTrip : null);
}
const HY_V2_BINS = ["1088961", "1089323", "1090391", "1090967"];   // the map's own plain boxes that the new models replace
let thirdPlace = "", thirdPlatformLayer, thirdPlatformRequest = 0, continuationLine;
let continuationSegments=[];
let continuationFeatures=[],thirdStationModel=null;
let continuation = null, continuationStatus = "", continuationRequest = 0;
let stationModel = null, stationCenter = null; // web/data/stations/<id>.json, for a venue whose route starts underground
let projMatrix = null; // MapLibre's projection matrix (Mercator world -> clip), from the label-projector layer
let entranceRoutes = null; // web/data/venues/<id>/entrance-routes.json, loaded on the first entrance click
const landmarks = {}; // venue id -> landmark layer; all 11 are loaded after the first route, so all show at once
// City buildings: every Manhattan building as vector tiles (scripts/build_city_tiles.py: NYC footprints, zooms 10-15,
// tall buildings only below zoom 13). Bounds from web/data/tiles/buildings/metadata.json.
const CITY_TILES = { minzoom: 10, maxzoom: 15, bounds: [-74.047288, 40.684283, -73.906638, 40.878696] };
const LANDMARK_BINS = VENUES.map((v) => v.bin);
const isLandmark = ["in", ["get", "bin"], ["literal", LANDMARK_BINS]];
// Quiet city: light, slightly darker with height so the skyline still reads; landmarks carry the colour
const CITY_COLOR = ["interpolate", ["linear"], ["coalesce", ["get", "height_m"], 0], 0, T.city[0], 150, T.city[1]];
// ... and see-through from afar, so the landmark models stand out; solid again at street level, where routes are read
const CITY_OPACITY = ["interpolate", ["linear"], ["zoom"], 12, 0.3, 14.5, 0.45, 16.5, 0.85];
// URL: #<landmark> (where inside?), #<landmark>/route, #<landmark>/step-<n>; no landmark in the URL: open on all 11
const HASH = location.hash.slice(1).split("/");
const OVERVIEW_START = HASH[0] !== "oculus" && !VENUES.some((v) => v.id === HASH[0] && v.id !== "hudson-yards-edge");

const map = new maplibregl.Map({
  container: "map",
  style: T.basemap,
  ...(OVERVIEW_START ? { center: [-73.975, 40.772], zoom: 11.3, pitch: 0, bearing: 0 }
    : { center: [-73.9786, 40.7530], zoom: 17.6, ...VIEW_2D }),
  maxPitch: 75,
  attributionControl: { compact: true },
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right"); // desktop; phones pinch

// Keep the canvas in sync with its container (needed when embedded in an iframe that resizes after load)
new ResizeObserver(() => map.resize()).observe(document.getElementById("map"));

// The card is a bottom sheet on phones and a left panel from 768 px wide; the map keeps its centre clear of both, and
// of the details drawer when it is open
const isPhone = () => window.innerWidth < 768;
const panelEl = document.getElementById("panel");
function panelPadding() {
  if (document.body.dataset.ui === "explore") {
    return isPhone() ? { left: 20, right: 20, top: 64, bottom: 165 }
      : { left: 72, right: 72, top: 24, bottom: 24 };
  }
  if (!isPhone()) return { left: 412, top: 20, right: document.body.classList.contains("has-sheet") ? 486 : 70, bottom: 20 };
  const ui = document.body.dataset.ui;
  return { bottom: panelEl.offsetHeight + 10, top: ui === "route" ? 166 : ui === "step" ? 122 : 20, left: 20, right: 64 };
}
function updatePadding() {
  document.documentElement.style.setProperty("--panel-h", isPhone() ? `${panelEl.offsetHeight}px` : "0px");
  const p = panelPadding(), cur = map.getPadding();
  if (["top", "bottom", "left", "right"].every((k) => Math.abs(cur[k] - p[k]) < 2)) return;
  // setting the padding stops a camera move in flight (flying to a landmark): wait for it to land
  if (map.isMoving()) { map.once("moveend", updatePadding); return; }
  map.setPadding(p);
}
new ResizeObserver(updatePadding).observe(panelEl);
window.addEventListener("resize", updatePadding);
// phones: the handle folds the sheet down to its first lines and back
document.getElementById("handle").addEventListener("click", () => {
  const folded = panelEl.classList.toggle("collapsed");
  document.getElementById("handle").setAttribute("aria-expanded", String(!folded));
});

// --- data loading -----------------------------------------------------------
// revalidate data files every load (cheap 304s) so a rebuilt dataset is never shadowed by a cached copy
const fetchJSON = (p) => fetch(p, { cache: "no-cache" }).then((r) => {
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
});
// Files the first screen needs start downloading at once, in parallel with the basemap style and tiles; the first
// loadJSON of each takes the request already in flight
const early = new Map();
const loadJSON = (p) => {
  const pending = early.get(p);
  if (pending) { early.delete(p); return pending; }
  return fetchJSON(p);
};
{
  const first = (VENUES.find((v) => v.id === HASH[0]) || VENUES[0]).id;
  const files = ["data/subway_entrances.geojson", "data/subway_stations.geojson", "data/subway_station_areas.geojson",
    "data/subway_underground.geojson", "data/osm_pedestrian.geojson", ...VENUES.map((v) => `data/landmarks/${v.id}.json`),
    `data/venues/${first}/venue.geojson`, `data/venues/${first}/graph.json`, `data/venues/${first}/routes.json`];
  for (const f of files) {
    const pr = fetchJSON(f);
    pr.catch(() => {}); // a missing optional file fails later, where it is used
    early.set(f, pr);
  }
}
async function loadVenueData(cfg) {
  const dir = `data/venues/${cfg.id}/`;
  const combined = cfg.cptModel ? await loadJSON("data/buildings/cpt-map.json") : null;
  const [v, g, r, x] = combined ? [combined.venue, combined.graph, combined.routes, null] : await Promise.all([loadJSON(dir + "venue.geojson"), loadJSON(dir + "graph.json"),
    loadJSON(dir + "routes.json"), cfg.noExits ? null : loadJSON(dir + "exits.json").catch(() => null)]);
  venue = v; graph = g; routes = r; exits = x; // exits.json: scripts/build_exits.py
  entranceRoutes = null;
  nodes = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
  levels = Object.fromEntries(g.levels.map((l) => [l.id, { ...l, elev: l.elev_m }])); // elev_m from scripts/venue.py
  // a level marked `terrain` stands on the modelled ground (scripts/build_terrain.py), e.g. Columbia's campus
  terrain = g.levels.some((l) => l.terrain)
    ? await loadJSON(`data/landmarks/${cfg.id}.terrain.json`).then(makeTerrain).catch(() => null) : null;
  [...g.levels].sort((a, b) => a.ordinal - b.ordinal).forEach((l, i) => { levels[l.id].explodedElev = i * EXPLODE_GAP_M; });
  if (cfg.station && !cfg.floors) { // a station under a building with few floors: keep the street where it is and spread downward
    const street = g.levels.find((l) => l.ordinal === 0)?.id;
    const shift = street ? levels[street].explodedElev - levels[street].elev : 0;
    for (const l of g.levels) levels[l.id].explodedElev -= shift;
  }
  for (const f of venue.features) {
    const p = f.properties;
    p.cat = p.feature_type === "level" ? "floor" : p.category;
    const ring = f.geometry.type === "Polygon" ? f.geometry.coordinates[0].slice(0, -1) : null;
    p.ground = ring ? groundOf(p.level, [ring.reduce((a, c) => a + c[0], 0) / ring.length,
      ring.reduce((a, c) => a + c[1], 0) / ring.length]) : 0;
  }
  await loadFloors(cfg, combined?.model);
  setElevations();
  await loadStation(cfg);
  // Camera centre = centre of the ground floor outline
  if (combined) {
    cfg.center = landmarkMeta[cfg.id]?.origin_lonlat || nodes["cpt-L1-66-0"].lonlat;
    return;
  }
  if (cfg.keepCenter) return; // e.g. Grand Central: its street level is only the door landings
  const ground = venue.features.find((f) => f.properties.feature_type === "level" && f.properties.ordinal === 0);
  const ring = ground.geometry.coordinates[0];
  cfg.center = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
}

const closeFloor = () => Boolean(state.is3d && state.ui === "step" && !state.exploded && state.venue?.floorView?.[state.level]);
// Every floor of the buildings (data/buildings/<model>.json). Spread, the route's levels move with their floors,
// so the map shows the same drawing as the floors page, standing where the buildings stand.
let floorsModel = null, floorsOrder = {};
let chryslerAssets;
function loadChryslerAssets() {
  return chryslerAssets ??= Promise.all([
    import("./chrysler/envelope.js"),
    loadJSON("chrysler/model.json"),
    loadJSON("chrysler/floors.json")
  ]);
}
async function loadFloors(cfg, combined) {
  const chrysler = cfg.id === "chrysler" ? await loadChryslerAssets() : null;
  floorsModel = chrysler ? chrysler[0].mapFloorModel(chrysler[1],chrysler[2])
    : combined || (cfg.floors ? await loadJSON(`data/buildings/${cfg.floorsModel || "hudson-yards"}.json`).catch(() => null) : null);
  if (floorsModel) {
    floorsOrder = floorOrder(floorsModel.floors);
    const byId = Object.fromEntries(floorsModel.floors.map((f) => [f.id, f]));
    for (const [lid, fid] of Object.entries(cfg.floors)) if (levels[lid] && byId[fid]) levels[lid].explodedElev = levels[lid].elev + spreadOffset(byId[fid], floorsOrder);
  }
  towers3d.setModel(floorsModel, { elev: floorElev });
}
// The Shops' levels follow the route's: the street at the app's usual height, Level 4 where the route has it
function floorElev(f) {
  let e = f.elev_m + (floorsModel?.map_station ? 4.42 : 0);
  if (f.building === "shops") {
    const i = floorsOrder[f.id], low = levels.L1?.elev ?? 4.5, l4 = levels.L4?.elev ?? 20;
    e = i <= 3 ? low + (i * (l4 - low)) / 3 : l4 + (i - 3) * f.height_m;
  }
  return state.exploded ? e + spreadOffset(f, floorsOrder) : e;
}

const stationLevels = () => (stationModel && state.venue?.station?.levels) || null;
async function loadStation(cfg) {
  stationModel = cfg.station ? await loadJSON(`data/stations/${cfg.station.id}.json`).catch(() => null) : null;
  stationCenter = stationModel ? [stationModel.frame.origin[0] + stationModel.center[0] / stationModel.frame.m_per_deg_lon,
    stationModel.frame.origin[1] - stationModel.center[1] / stationModel.frame.m_per_deg_lat] : null;
  station3d.setModel(stationModel, { levels: cfg.station?.levels, elev: elevOf });
}

// Floor heights used by the 3D layers: real (from the venue frame) or exploded (schematic, evenly spaced)
const elevOf = (levelId) => (state.exploded ? levels[levelId].explodedElev : levels[levelId].elev);

// Ground height (m above the venue's datum) from a terrain grid in the venue's u/v frame; 0 off the grid
let terrain = null;
function makeTerrain(t) {
  const bin = atob(t.heights_cm), h = new Int16Array(bin.length / 2);
  for (let k = 0; k < h.length; k++) h[k] = bin.charCodeAt(2 * k) | (bin.charCodeAt(2 * k + 1) << 8);
  const th = (t.u_bearing_deg * Math.PI) / 180, [lon0, lat0] = t.origin_lonlat;
  const node = (i, j) => h[j * t.nu + i] / 100;
  return {
    at([lon, lat]) {
      const x = (lon - lon0) * t.m_per_deg_lon, y = (lat - lat0) * t.m_per_deg_lat;
      const u = x * Math.cos(th) + y * Math.sin(th), v = -x * Math.sin(th) + y * Math.cos(th);
      const gx = (u - t.u0) / t.cell_m, gy = (v - t.v0) / t.cell_m;
      if (!(gx >= 0 && gy >= 0 && gx <= t.nu - 1 && gy <= t.nv - 1)) return 0;
      const i = Math.min(Math.floor(gx), t.nu - 2), j = Math.min(Math.floor(gy), t.nv - 2), fx = gx - i, fy = gy - j;
      return (node(i, j) * (1 - fx) + node(i + 1, j) * fx) * (1 - fy) + (node(i, j + 1) * (1 - fx) + node(i + 1, j + 1) * fx) * fy;
    },
  };
}
const groundOf = (levelId, lonlat) => (terrain && levels[levelId]?.terrain ? terrain.at(lonlat) : 0);
// Long segments on terrain are cut into short pieces so the band and the walker follow the ground
const TERRAIN_STEP_M = 1.5;
function densify(a, b, levelId) {
  if (!terrain || !levels[levelId]?.terrain) return [a, b];
  const my = 110540, mx = 111320 * Math.cos((a[1] * Math.PI) / 180);
  const n = Math.max(1, Math.ceil(Math.hypot((b[0] - a[0]) * mx, (b[1] - a[1]) * my) / TERRAIN_STEP_M));
  return Array.from({ length: n + 1 }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
}
function setElevations() {
  for (const f of venue.features) {
    const p = f.properties;
    p.elev = elevOf(p.level) + (p.ground || 0);
    p.top = p.elev + (p.cat === "core" ? 3.2 : p.feature_type === "level" ? 0.15 : 0.35);
  }
}

// --- geometry helpers ---------------------------------------------------------
function square(c, halfM) {
  const my = 110540, mx = 111320 * Math.cos((c[1] * Math.PI) / 180);
  const x = halfM / mx, y = halfM / my;
  return [[[c[0] - x, c[1] - y], [c[0] + x, c[1] - y], [c[0] + x, c[1] + y], [c[0] - x, c[1] + y], [c[0] - x, c[1] - y]]];
}

// The 3D route on one floor as one continuous band: consecutive segments share mitred corner points, so turns
// are closed (no notch) and pieces never overlap (no double shading where the band is translucent).
// Each segment keeps its own quad, so colouring by step still works; a step change at a corner splits on the mitre.
const RIBBON_HALF_M = 1.1, MITRE_LIMIT = 3;
function bandQuads(chain) {
  const lat = chain[0].pts[0][1];
  const my = 110540, mx = 111320 * Math.cos((lat * Math.PI) / 180);
  const P = [chain[0].pts[0], ...chain.map((c) => c.pts[1])].map((p) => [p[0] * mx, p[1] * my]); // metres
  const dir = P.slice(1).map((q, k) => {
    const dx = q[0] - P[k][0], dy = q[1] - P[k][1], l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  });
  const normal = (d) => [-d[1], d[0]];
  const offsets = P.map((p, j) => {
    const d0 = dir[Math.max(0, j - 1)], d1 = dir[Math.min(dir.length - 1, j)];
    const n0 = normal(d0), n1 = normal(d1);
    let m = [n0[0] + n1[0], n0[1] + n1[1]];
    const ml = Math.hypot(...m);
    if (ml < 1e-6) m = n1; else m = [m[0] / ml, m[1] / ml]; // U-turn: square off
    const cos = m[0] * n1[0] + m[1] * n1[1];
    const len = RIBBON_HALF_M / Math.max(cos, 1 / MITRE_LIMIT);
    return [m[0] * len, m[1] * len];
  });
  const ll = (p) => [p[0] / mx, p[1] / my];
  return chain.map((c, k) => {
    const a = P[k], b = P[k + 1], oa = offsets[k], ob = offsets[k + 1];
    const ring = [[a[0] + oa[0], a[1] + oa[1]], [b[0] + ob[0], b[1] + ob[1]], [b[0] - ob[0], b[1] - ob[1]],
      [a[0] - oa[0], a[1] - oa[1]]].map(ll);
    return { ...c, ring: [[...ring, ring[0]]] };
  });
}

// Match the station fixture's flat landings and tread heights in both
// the route strip and playback. Reverse the same profile for the return.
function cptStairPath(a, b) {
  const up = levels[a.level].elev < levels[b.level].elev;
  const [low, high] = up ? [a,b] : [b,a];
  const run = Math.hypot(low.uv[0]-high.uv[0],low.uv[1]-high.uv[1]);
  const landing = Math.min(.65,run*.12)/run;
  const count = Math.ceil((levels[high.level].elev-levels[low.level].elev)/.17);
  const lo=elevOf(low.level), hi=elevOf(high.level);
  const point=(t,h)=>({lonlat:low.lonlat.map((v,i)=>v+(high.lonlat[i]-v)*t),elev:lo+(hi-lo)*h});
  const samples=[point(0,0)];
  for (let i=0;i<count;i++) {
    const t=landing+(1-2*landing)*i/count;
    const u=landing+(1-2*landing)*(i+1)/count;
    samples.push(point(t,i/count),point(t,(i+1)/count),point(u,(i+1)/count));
  }
  samples.push(point(1,1));
  return up ? samples : samples.reverse();
}

function routeFeatures(r) {
  const lines = [], solids = [], points = [], station = [];
  const under = (n) => levels[n.level]?.underground;
  const extension=[];
  const chains = []; // runs of same-level segments where each starts where the previous one ended
  r.steps.forEach((s, i) => {
    for (let k = 1; k < s.nodes.length; k++) {
      const a = nodes[s.nodes[k - 1]], b = nodes[s.nodes[k]];
      if(s.continuation || state.venue.cptModel){
        const level = a.level === b.level ? a.level : s.level;
        lines.push({type:"Feature",properties:{step:i,level},geometry:{type:"LineString",coordinates:[a.lonlat,b.lonlat]}});
        const path=state.venue.cptModel && !s.continuation && s.kind==="stairs" && a.level!==b.level
          ? cptStairPath(a,b) : [a,b].map(n=>({lonlat:n.lonlat,elev:n.routeElev??elevOf(n.level)}));
        for(let p=1;p<path.length;p++) extension.push({step:i,a:path[p-1],b:path[p]});
        continue;
      }
      // below the street MapLibre's extrusions cannot follow: the station layer draws this part of the route in 3D
      if (under(a) || under(b)) station.push({ step: i, a: { lonlat: a.lonlat, level: a.level }, b: { lonlat: b.lonlat, level: b.level } });
      if (a.level === b.level) {
        lines.push({ type: "Feature", properties: { step: i, level: a.level },
          geometry: { type: "LineString", coordinates: [a.lonlat, b.lonlat] } });
        if (under(a)) continue;
        const last = chains.at(-1)?.at(-1);
        const seg = { step: i, level: a.level, from: a.id, to: b.id, pts: [a.lonlat, b.lonlat] };
        if (last && last.to === a.id && last.level === a.level) chains.at(-1).push(seg);
        else chains.push([seg]);
      } else if (under(a) || under(b)) {
        // an escalator or inclined lift between two station floors: joins the route up on the whole-route plan
        lines.push({ type: "Feature", properties: { step: i, level: "between" },
          geometry: { type: "LineString", coordinates: [a.lonlat, b.lonlat] } });
      } else {
        const [lo, hi] = [elevOf(a.level) + groundOf(a.level, a.lonlat), elevOf(b.level) + groundOf(b.level, b.lonlat)].sort((x, y) => x - y);
        solids.push({ type: "Feature", properties: { step: i, base: lo + 0.4, top: hi + 1.1 },
          geometry: { type: "Polygon", coordinates: square(a.lonlat, 1.6) } });
      }
    }
    if (s.kind !== "walk") {
      const n = nodes[s.nodes[s.nodes.length - 1]];
      points.push({ type: "Feature", properties: { step: i, level: n.level, kind: s.kind },
        geometry: { type: "Point", coordinates: n.lonlat } });
    }
  });
  for (const chain of chains) {
    const pieces = chain.flatMap((c) => {
      const pts = densify(c.pts[0], c.pts[1], c.level);
      return pts.slice(1).map((q, k) => ({ ...c, pts: [pts[k], q] }));
    });
    for (const q of bandQuads(pieces)) {
      const mid = [(q.pts[0][0] + q.pts[1][0]) / 2, (q.pts[0][1] + q.pts[1][1]) / 2];
      const e = elevOf(q.level) + groundOf(q.level, mid);
      solids.push({ type: "Feature", properties: { step: q.step, base: e + 0.4, top: e + 1.1 },
        geometry: { type: "Polygon", coordinates: q.ring } });
    }
  }
  const fc = (features) => ({ type: "FeatureCollection", features });
  return { lines: fc(lines), solids: fc(solids), points: fc(points), station, extension };
}

// --- 3D focus: the basemap in 2D stays exactly as the style has it; 3D swaps to the plain look, and back ---------
const basemap = [];
let baseIds = null;                                              // the base map's own layers (the style's), as against this page's
function rememberBasemap() {
  baseIds ||= new Set(map.getStyle().layers.map((l) => l.id)); basemap.length = 0;
  for (const l of map.getStyle().layers) {
    if (!baseIds.has(l.id)) continue;
    if (l["source-layer"] === "building") { map.setLayoutProperty(l.id, "visibility", "none"); continue; }
    const road = l["source-layer"] === "transportation" && l.type === "line" && !/casing|rail|aeroway|ferry/.test(l.id);
    const name = l["source-layer"] === "transportation_name" && l.type === "symbol" && !l.layout?.["icon-image"];
    const paint = l.type === "background" ? { "background-color": FOCUS.ground }
      : road ? { "line-color": FOCUS.road, "line-opacity": 1 }
        : name ? { "text-color": FOCUS.text, "text-halo-color": FOCUS.ground } : null;
    basemap.push({ id: l.id, hide: !paint, visibility: l.layout?.visibility ?? "visible", name, filter: l.filter,
      paint: paint || {}, original: Object.fromEntries(Object.keys(paint || {}).map((p) => [p, map.getPaintProperty(l.id, p)])) });
  }
}
function setFocusLook(on) {
  for (const b of basemap) {
    if (b.hide) map.setLayoutProperty(b.id, "visibility", on ? "none" : b.visibility);
    for (const [p, v] of Object.entries(b.paint)) map.setPaintProperty(b.id, p, on ? v : b.original[p]);
    // road names only: this layer also names ferry routes and railways
    if (b.name) map.setFilter(b.id, on ? ["all", b.filter, ["!", ["match", ["get", "class"], ["ferry", "rail", "transit"], true, false]]] : b.filter);
  }
  map.setPaintProperty("footways", "line-color", on ? FOCUS.footway : T.footway);
  placeCity();
}
// The city draws after the models in 3D: it writes depth even when faint, and would cut holes in anything drawn later.
// In 2D it goes back to its place under the floor plan.
function placeCity() {
  if (!state.is3d) return map.moveLayer("buildings-3d", "target-3d");
  map.moveLayer("buildings-3d");
  for (const id of ["entrances-3d", "walker-3d"]) map.moveLayer(id);
  for (const P of Object.values(V2)) P.world?.keepOnTop?.();          // a walked view stays over everything
}

// --- map layers -------------------------------------------------------------
map.on("load", async () => {
  // the map credits start folded (the "i" opens them), so they do not sit over the map on a phone
  document.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
  // Hide the basemap's own building layers so ours are the only 3D volumes
  for (const layer of map.getStyle().layers) {
    if (layer["source-layer"] === "building") map.setLayoutProperty(layer.id, "visibility", "none");
  }
  rememberBasemap();
  // absolute (the tiles are fetched from a worker); the {z}/{x}/{y} placeholders must stay unescaped
  map.addSource("buildings", { type: "vector", tiles: [`${new URL("data/tiles/buildings/", location.href).href}{z}/{x}/{y}.pbf`],
    ...CITY_TILES, attribution: "Buildings: NYC Open Data" });
  // fetched with loadJSON (revalidated each load) so a refreshed study area is never hidden by a cached copy
  map.addSource("osm", { type: "geojson", data: EMPTY });
  loadJSON("data/osm_pedestrian.geojson").then((d) => map.getSource("osm").setData(d));
  map.addSource("landmark-points", { type: "geojson", data: EMPTY });
  // Subway: one station per MTA complex (label + line bullets once), entrances as typed glyphs beneath it
  const [entrances, stationPts, stationAreas, under, survey] = await Promise.all([loadJSON("data/subway_entrances.geojson"),
    loadJSON("data/subway_stations.geojson"), loadJSON("data/subway_station_areas.geojson"),
    loadJSON("data/subway_underground.geojson").catch(() => ({ type: "FeatureCollection", features: [] })),
    loadJSON("data/buildings/survey-stations.json").catch(() => ({}))]);
  surveyStationModels = survey;
  subway = { entrances, stations: stationPts, under };
  registerSymbols(map, new Set(stationPts.features.map((f) => f.properties.routes)));
  map.addSource("entrances", { type: "geojson", data: entrances });
  map.addSource("stations", { type: "geojson", data: stationPts });
  const pinnedStations = new Set();
  for (const feature of stationPts.features) {
    const id = String(feature.properties.complex_id);
    if (pinnedStations.has(id)) continue;
    pinnedStations.add(id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "station-map-pin";
    button.innerHTML = '<svg width="23" height="29" viewBox="0 0 23 29" aria-hidden="true"><path d="M11.5 27.5C9 24 1 16.8 1 11.5a10.5 10.5 0 1 1 21 0c0 5.3-8 12.5-10.5 16Z"/><circle cx="11.5" cy="11.5" r="3.5"/></svg>';
    button.dataset.stationComplex = id;
    button.setAttribute("aria-label", id === "225" ? "47–50 Sts–Rockefeller Center subway station" : surveyStationModels[id]?.name || independentStationViewers[id]?.label || feature.properties.station);
    button.title = button.getAttribute("aria-label");
    button.addEventListener("click", event => {
      event.stopPropagation();
      focusStation(feature.properties, feature.geometry.coordinates);
    });
    new maplibregl.Marker({element:button,anchor:"bottom",offset:[0,0]})
      .setLngLat(feature.geometry.coordinates).addTo(map);
    const syncMarker = () => {
      // DOM pins sit above the 3D canvas, so reserve them for map browsing.
      button.hidden = !state.is3d || map.getZoom() < 13 || state.ui !== "explore" || state.exploded || Boolean(pennMap?.active);
      button.setAttribute("aria-pressed", String(String(state.station) === id));
      button.classList.toggle("is-muted", state.station != null && String(state.station) !== id);
    };
    map.on("render",syncMarker);
    syncMarker();
  }
  map.addSource("station-areas", { type: "geojson", data: stationAreas });
  map.addSource("underground", { type: "geojson", data: under });
  map.addSource("pois", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  const empty = { type: "FeatureCollection", features: [] };
  map.addSource("venue", { type: "geojson", data: empty });
  for (const id of ["route-lines", "route-solids", "route-points", "walker", "exit-preview", "exit-ranks"]) {
    map.addSource(id, { type: "geojson", data: empty });
  }

  // The 11 landmarks are never city boxes: in 3D their models stand there, in 2D their footprints are tinted
  map.addLayer({ id: "buildings-3d", type: "fill-extrusion", source: "buildings", "source-layer": "buildings",
    filter: ["!", isLandmark],
    paint: { "fill-extrusion-color": T.city2d, "fill-extrusion-height": 0, "fill-extrusion-opacity": CITY_OPACITY } }); // 2D at start
  map.addLayer({ id: "target-3d", type: "fill-extrusion", source: "buildings", "source-layer": "buildings", filter: isLandmark,
    paint: { "fill-extrusion-color": targetColor(""), "fill-extrusion-height": 0, "fill-extrusion-opacity": 0.35 } });
  // Footways only exist around the 11 landmarks (OSM, fetch_outdoor.py): street level only, or from afar they
  // would show as dark patches over the even, island-wide city layer
  map.addLayer({ id: "footways", type: "line", source: "osm", minzoom: 16,
    filter: ["all", ["==", ["geometry-type"], "LineString"], ["!", ["has", "indoor"]]],
    paint: { "line-color": T.footway, "line-width": 1, "line-dasharray": [2, 1.5] } });

  // 2D floor plan of the selected level
  const unitColor = UNIT_COLOR;
  map.addLayer({ id: "indoor-fill", type: "fill", source: "venue", minzoom: INDOOR_MINZOOM,
    filter: ["in", ["get", "feature_type"], ["literal", ["level", "unit"]]],
    paint: { "fill-color": unitColor, "fill-opacity": 0.95 } });
  // Interior walls thicken with zoom; the floor outline is drawn as a heavier exterior wall
  map.addLayer({ id: "indoor-outline", type: "line", source: "venue", minzoom: INDOOR_MINZOOM,
    filter: ["==", ["get", "feature_type"], "unit"],
    paint: { "line-color": T.wall, "line-width": ["interpolate", ["linear"], ["zoom"], 16, 0.6, 19, 1.2] } });
  map.addLayer({ id: "indoor-walls", type: "line", source: "venue", minzoom: INDOOR_MINZOOM,
    filter: ["==", ["get", "feature_type"], "level"],
    paint: { "line-color": ["case", UNDERGROUND, T.wall, T.outerWall], // a station's outline is an area, not walls
      "line-width": ["interpolate", ["linear"], ["zoom"], 16, ["case", UNDERGROUND, 0.6, 1.2], 19, ["case", UNDERGROUND, 1.05, 2]] } });
  // Doors are gaps cut into the wall (floor-coloured, wider than the wall); turnstiles are a red dashed line
  // MapLibre 4 cannot vary line-dasharray per feature, so doors (solid gaps) and turnstiles (dashed) are two layers
  map.addLayer({ id: "indoor-openings", type: "line", source: "venue", minzoom: INDOOR_MINZOOM,
    filter: ["all", ["==", ["get", "feature_type"], "opening"], ["!=", ["get", "category"], "turnstile"]],
    layout: { "line-cap": "butt" },
    paint: { "line-color": OPENING_COLOR, "line-width": ["interpolate", ["linear"], ["zoom"], 16, 1.5, 19, 3] } });
  map.addLayer({ id: "indoor-turnstiles", type: "line", source: "venue", minzoom: INDOOR_MINZOOM,
    filter: ["all", ["==", ["get", "feature_type"], "opening"], ["==", ["get", "category"], "turnstile"]],
    layout: { "line-cap": "butt" },
    paint: { "line-color": OPENING_COLOR, "line-width": ["interpolate", ["linear"], ["zoom"], 16, 1.5, 19, 3],
      "line-dasharray": [1.2, 0.8] } });

  // 3D stacked floors
  map.addLayer({ id: "indoor-slabs", type: "fill-extrusion", source: "venue",
    filter: ["all", ["in", ["get", "feature_type"], ["literal", ["level", "unit"]]], ["!=", ["get", "underground"], true]],
    paint: { "fill-extrusion-color": unitColor, "fill-extrusion-base": ["get", "elev"],
      "fill-extrusion-height": ["get", "top"], "fill-extrusion-opacity": 0.9 } });

  // Route (colored per step in paintStep)
  map.addLayer({ id: "route-casing", type: "line", source: "route-lines",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": T.casing, "line-width": 9 } });
  map.addLayer({ id: "route-line", type: "line", source: "route-lines",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": ROUTE.next, "line-width": 5 } });
  map.addLayer({ id: "route-solids", type: "fill-extrusion", source: "route-solids",
    paint: { "fill-extrusion-color": ROUTE.next, "fill-extrusion-base": ["get", "base"],
      "fill-extrusion-height": ["get", "top"], "fill-extrusion-opacity": 0.62, "fill-extrusion-vertical-gradient": false } });
  map.addLayer({ id: "route-points", type: "circle", source: "route-points",
    paint: { "circle-radius": ["case", ["==", ["get", "kind"], "arrive"], 8, 6], "circle-color": ROUTE.next,
      "circle-stroke-color": T.stroke, "circle-stroke-width": 2.5 } });

  // Labels (2D only; symbols cannot float at floor height)
  // Room names: quiet, spaced capitals; facilities are icons with a short label (below)
  map.addLayer({ id: "indoor-labels", type: "symbol", source: "venue", minzoom: INDOOR_MINZOOM + 0.8,
    filter: ROOM_LABEL_FILTER,
    layout: { "text-field": ["upcase", ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 9.5,
      "text-letter-spacing": 0.08, "text-max-width": 8, "text-allow-overlap": false },
    paint: { "text-color": T.roomLabel, "text-halo-color": T.halo, "text-halo-width": 1 } });
  map.addLayer({ id: "indoor-pois", type: "symbol", source: "pois", minzoom: INDOOR_MINZOOM,
    layout: { "icon-image": ["concat", "poi-", ["get", "icon"]], "icon-size": ["interpolate", ["linear"], ["zoom"], 16, 0.65, 19, 1],
      "symbol-sort-key": ["get", "rank"], "icon-allow-overlap": false,
      "text-field": ["step", ["zoom"], "", 17.6, ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": 10.5,
      "text-anchor": "top", "text-offset": [0, 1.1], "text-max-width": 8, "text-optional": true },
    paint: { "text-color": T.label, "text-halo-color": T.halo, "text-halo-width": 1.3 } });

  // The 11 landmarks by name, from far away (gone once the camera is close to one); click one to go there
  map.addLayer({ id: "landmark-dots", type: "circle", source: "landmark-points", maxzoom: 15.5,
    paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 15, 7], "circle-color": dotColor(""),
      "circle-stroke-color": T.stroke, "circle-stroke-width": 2, "circle-pitch-alignment": "viewport" } });
  map.addLayer({ id: "landmark-labels", type: "symbol", source: "landmark-points", maxzoom: 15.5,
    layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 12.5, "text-max-width": 9,
      "text-variable-anchor": ["left", "right", "top", "bottom"], "text-radial-offset": 0.9, "text-justify": "auto",
      "text-allow-overlap": false, "symbol-sort-key": ["get", "rank"] },
    paint: { "text-color": T.label, "text-halo-color": T.halo, "text-halo-width": 1.8 } });

  // you: a blue dot with a soft beam the way you face, as on a phone map; it turns with the map
  map.addImage("me", meIcon(), { pixelRatio: 2 });
  map.addLayer({ id: "walker", type: "symbol", source: "walker",
    layout: { "icon-image": "me", "icon-rotate": ["get", "heading"], "icon-rotation-alignment": "map", "icon-pitch-alignment": "map",
      "icon-allow-overlap": true, "icon-ignore-placement": true,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 15, 0.75, 19, 1.15] } });
  map.addLayer({ id: "station-areas", type: "fill", source: "station-areas", minzoom: 15,
    paint: { "fill-color": T.station, "fill-opacity": 0.08 } }, "indoor-fill");
  map.addLayer({ id: "station-area-lines", type: "line", source: "station-areas", minzoom: 15,
    paint: { "line-color": T.station, "line-opacity": 0.35, "line-width": 1, "line-dasharray": [2, 2] } }, "indoor-fill");
  // Under the highlighted station (2D): OSM subway platforms, passages and tracks (mapped data only)
  const ugKind = (k) => ["==", ["get", "kind"], k];
  map.addLayer({ id: "ug-tracks", type: "line", source: "underground", minzoom: 15, filter: ugKind("track"),
    paint: { "line-color": T.footway, "line-width": 1, "line-dasharray": [3, 3], "line-opacity": 0.6 } });
  map.addLayer({ id: "ug-passages", type: "line", source: "underground", minzoom: 15, filter: ugKind("passage"),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#c2851f", "line-width": ["interpolate", ["linear"], ["zoom"], 15, 1.2, 18, 3], "line-opacity": 0.85 } });
  map.addLayer({ id: "ug-platforms", type: "line", source: "underground", minzoom: 15, filter: ugKind("platform"),
    layout: { "line-join": "round" },
    paint: { "line-color": "#5b9cf6", "line-width": ["interpolate", ["linear"], ["zoom"], 15, 2, 18, 5], "line-opacity": 0.75 } });
  map.addLayer({ id: "ug-platform-labels", type: "symbol", source: "underground", minzoom: 17, filter: ugKind("platform"),
    layout: { "symbol-placement": "line", "text-field": ["concat", "Platform",
      ["case", ["has", "level"], ["concat", " · level ", ["get", "level"]], ""]],
      "text-font": ["Noto Sans Regular"], "text-size": 10, "text-max-angle": 30 },
    paint: { "text-color": "#2f5fb3", "text-halo-color": T.halo, "text-halo-width": 1.4 } });
  map.addLayer({ id: "route-exit", type: "circle", source: "entrances", filter: ["==", ["get", "eid"], -1],
    paint: { "circle-radius": 14, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": ROUTE.current,
      "circle-stroke-width": 3, "circle-pitch-alignment": "map" } });
  map.addLayer({ id: "exit-preview", type: "line", source: "exit-preview", layout: { "line-cap": "round" },
    paint: { "line-color": ROUTE.current, "line-width": 3, "line-dasharray": [1.5, 1.5], "line-opacity": 0.9 } });
  map.addLayer({ id: "subway-entrances", type: "symbol", source: "entrances", minzoom: 14.5,
    layout: { "icon-image": ["concat", "ent-", ["get", "glyph"]], "icon-allow-overlap": true,
      "icon-size": ["interpolate", ["linear"], ["zoom"], 14.5, 0.6, 18, 1.05],
      "icon-pitch-alignment": "map", "icon-rotation-alignment": "map" } });
  map.addLayer({ id: "entrance-labels", type: "symbol", source: "entrances", minzoom: 17.4,
    layout: { "text-field": ["concat", ENTRANCE_LABEL, ["match", ["get", "oneway"], "exit-only", " · exit only",
      "entry-only", " · entry only", ""]], "text-font": ["Noto Sans Regular"], "text-size": 10,
      "text-anchor": "left", "text-offset": [1.1, 0], "text-optional": true },
    paint: { "text-color": T.roomLabel, "text-halo-color": T.halo, "text-halo-width": 1.2 } });
  map.addLayer({ id: "exit-ranks", type: "symbol", source: "exit-ranks", minzoom: 15,
    layout: { "text-field": ["to-string", ["get", "rank"]], "text-font": ["Noto Sans Regular"], "text-size": 11,
      "text-offset": [-1.2, -1.1], "text-allow-overlap": true, "icon-allow-overlap": true },
    paint: { "text-color": "#ffffff", "text-halo-color": ROUTE.current, "text-halo-width": 3 } });
  map.addLayer({ id: "herald-station-point", type: "circle", source: "stations", minzoom: 13,
    filter: ["in", ["to-string", ["get", "complex_id"]], ["literal", ["607", "602"]]],
    paint: { "circle-radius": 5, "circle-color": T.label, "circle-stroke-width": 1.5, "circle-stroke-color": T.halo } });
  map.addLayer({ id: "station-labels", type: "symbol", source: "stations", minzoom: 13,
    layout: { "icon-image": ["concat", "routes-", ["get", "routes"]], "icon-anchor": "bottom",
      "text-field": ["get", "station"], "text-font": ["Noto Sans Regular"], "text-size": 12.5,
      "text-anchor": "top", "text-offset": [0, 0.2], "text-max-width": 10,
      "symbol-sort-key": ["-", 0, ["get", "entrances"]], "icon-allow-overlap": false, "text-optional": false },
    paint: { "text-color": T.label, "text-halo-color": T.halo, "text-halo-width": 1.6 } });

  map.addLayer({
    id: "entrances-3d", type: "symbol", source: "entrances", minzoom: 15,
    layout: { "visibility": "none", "icon-image": ["concat", "entry-tile-", ["get", "glyph"]],
      "icon-size": 0.9, "icon-pitch-alignment": "viewport", "icon-rotation-alignment": "viewport" },
  });
  map.addLayer({
    id: "route-entrance-3d", type: "symbol", source: "entrances",
    layout: { "visibility": "none", "icon-image": ["concat", "entry-active-", ["get", "glyph"]],
      "icon-size": 1.15, "icon-allow-overlap": true, "icon-pitch-alignment": "viewport" },
  });
  walker3d = createWalkerLayer(maplibregl, { id: "walker-3d", color: ROUTE.current, rim: T.stroke });
  map.addLayer(walker3d.layer);
  const stationColors = { hall: T.units["transit-hall"], lirr: "#2f9e94", track: T.station, gate: color("--gate"),
    escalator: color("--stair"), stairs: color("--passage"), elevator: color("--indoor"), edge: T.wall, route: ROUTE,
    tier: Object.fromEntries(TIERS.map((t) => [t.id, t.color])) };
  station3d = createStationLayer(maplibregl, { id: "station-3d", colors: stationColors });
  thirdPlatformLayer = createStationLayer(maplibregl, { id: "third-platform-3d", colors: stationColors });
  map.addLayer(station3d.layer);
  map.addLayer(thirdPlatformLayer.layer);
  continuationLine = createStationLayer(maplibregl, {id:"continuation-line-3d",colors:stationColors});
  map.addLayer(continuationLine.layer);
  towers3d = createTowersLayer(maplibregl, { id: "towers-3d", dark: NIGHT,
    tiers: Object.fromEntries(TIERS.map((t) => [t.id, t.color])) });
  map.addLayer(towers3d.layer);
  hyWorld = createHYWorldLayer(maplibregl, { night: NIGHT }); hyWorld.onState = () => syncLevels(HY_COMPLEX);
  V2[HY_COMPLEX] = { world: hyWorld };
  { const w = create28StLayer(maplibregl, { night: NIGHT }); w.onState = () => syncLevels(ST28_COMPLEX); V2[ST28_COMPLEX] = { world: w }; map.addLayer(w.layer); }
  map.addLayer(hyWorld.layer);
  hyWorld.loaded.then((ok) => {
    if (!ok) return;
    hiddenBins = [...new Set([...hiddenBins, ...HY_V2_BINS])];
    if (state.is3d && !state.exploded) map.setPaintProperty("buildings-3d", "fill-extrusion-height", cityHeight());
    syncLandmarks(); applyFilters();
  });

  // Captures the 3D camera matrix each frame so HTML floor labels can be placed at floor-slab height
  map.addLayer({ id: "label-projector", type: "custom", renderingMode: "3d",
    onAdd() {}, render(gl, matrix) { projMatrix = matrix; } });
  map.on("render", placeFloorLabels);

  // Translucent extrusions still write depth, so draw floors and the route before any building shell
  map.moveLayer("indoor-slabs", "buildings-3d");
  map.moveLayer("route-solids", "buildings-3d");
  map.moveLayer("station-3d", "buildings-3d"); // under the street, seen through the translucent city
  map.moveLayer("towers-3d", "buildings-3d");

  map.on("click", (e) => {
    if (pennMap?.handleClick(e.point)) { e.originalEvent.pennHandled = true; return; }
    if (pennMap?.active) return;
    if (state.is3d) {
      const [entrance] = map.queryRenderedFeatures(e.point, { layers: ["route-entrance-3d", "entrances-3d"] });
      if (entrance) {
        e.originalEvent.stationEntranceHandled = true;
        show3dEntrance(entrance.properties, entrance.geometry.coordinates);
        return;
      }
    }
    const station = map.queryRenderedFeatures(e.point, {layers: ["station-labels", "herald-station-point"]})
      .find(f => standaloneStationModel(f.properties.complex_id));
    if (station) {
      e.originalEvent.heraldHandled = true;
      if (state.is3d) focusStation(station.properties, station.geometry.coordinates);
      else showStation(station.properties, station.geometry.coordinates);
      return;
    }
    if (!state.is3d) return;
    if (walker3d.hit(e.point)) return state.playing ? stopPlay() : startPlay();
    if (landmarks["one-wtc"]?.hit(e.point, "companion")) {
      e.originalEvent.oculusHandled = true;
      return state.venue?.area === "oculus" ? openOculus() : locateOculus();
    }
    if (hyPlaceAt(e)) { e.originalEvent.landmarkHandled = true; return; }   // Vessel, Edge: the new page's place card
    const hit = Object.keys(landmarks).find((id) => !RETIRED[id] && landmarks[id].hit(e.point));
    if (!hit) return;
    e.originalEvent.landmarkHandled = true;
    standaloneStation = false;
    stationSelected = false;
    syncFloorsButton();
    const viewerVenue = VENUES.find((venue) => venue.id === hit);
    if (state.ui === "explore" || state.venue.id !== hit) {
      selectVenue(hit).then(() => {
        if (state.venue.id !== hit || state.ui !== "landmark") return;
        if (viewerVenue.floorViewer) openFloors({viewerVenue});
        else setSeeThrough(true);
      });
    } else if (viewerVenue.floorViewer && state.ui === "landmark") openFloors({viewerVenue});
    else setSeeThrough(!landmark.seeThrough);
  });
  map.on("click", "subway-entrances", (e) => { if (!e.originalEvent.stationEntranceHandled && !e.originalEvent.heraldHandled && !e.originalEvent.oculusHandled) showEntrance(e.features[0].properties, e.lngLat); });
  for (const id of ["landmark-dots", "landmark-labels"]) {
    map.on("click", id, (e) => { if (!e.originalEvent.stationEntranceHandled && !e.originalEvent.heraldHandled && !e.originalEvent.pennHandled && !e.originalEvent.oculusHandled && !e.originalEvent.landmarkHandled) { const pid = e.features[0].properties.id; HY_PLACES[pid] ? hyPlaceCard(HY_PLACES[pid]) : selectVenue(pid); } });
    map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
  }
  // zooming in by hand ends the overview (its controls come back)
  map.on("moveend", () => { if (state.overview && map.getZoom() >= 14.5) { state.overview = false; applyFilters(); } });
  map.on("click", "station-labels", (e) => { if (!e.originalEvent.stationEntranceHandled && !e.originalEvent.heraldHandled && !e.originalEvent.pennHandled && !e.originalEvent.oculusHandled) showStation(e.features[0].properties, e.features[0].geometry.coordinates); });
  for (const id of ["subway-entrances", "station-labels", "herald-station-point"]) {
    map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
  }
  map.on("mousemove", (e) => {
    if (state.is3d) map.getCanvas().style.cursor = walker3d.setHover(e.point) || map.queryRenderedFeatures(e.point, { layers: ["route-entrance-3d", "entrances-3d"] }).length || landmarks["one-wtc"]?.hit(e.point, "companion") || landmark?.hit(e.point) ? "pointer" : "";
  });

  const fromHash = VENUES.find((v) => v.id === (HASH[0] === "oculus" ? "one-wtc" : HASH[0]) && !RETIRED[v.id]);
  const retiredStart = RETIRED[HASH[0]];                         // an old link to a retired venue: the map opens as usual, then the new page's trip
  await selectVenue((fromHash || VENUES[0]).id, { area: HASH[0] === "oculus" ? "oculus" : undefined, animate: false, camera: !OVERVIEW_START, ui: OVERVIEW_START ? "explore" : "landmark" });
  initControls();
  performance.mark("route-ready"); // first route on screen: the "usable" moment the performance check reports
  const all = loadAllLandmarks();
  all.then(() => initPennMap()).catch(console.error);
  if (OVERVIEW_START) {
    showOverview({ animate: false });
    if (["penn-station", "moynihan"].includes(HASH[0])) openPenn(HASH[1], HASH[2]);
  }
  else if (HASH[1] === "route") showRoute({ animate: false });
  else if (HASH[1]?.startsWith("step-")) startSteps(+HASH[1].slice(5) - 1);
  if (retiredStart) tripCard(retiredStart.cid).open({ dest: retiredStart.dest });
  resumeView();
  if (new URLSearchParams(location.search).has("perf")) import("./perf.js").then((m) => m.runPerf(window.demo));
  if (new URLSearchParams(location.search).has("film")) import("./film.js");   // the film of a route, taken frame by frame (demo/edge-film)
});

// Every floor of the building, over the map: on a step it opens at the floor you stand on
let pennMap = null, pennMapPromise = null;
async function initPennMap() {
  if (!pennMapPromise) pennMapPromise = (async () => {
    const { createPennMap } = await import("./penn-map.js");
    pennMap = await createPennMap({ map, maplibregl, getMapMode: () => state.is3d, onExit: () => showOverview(),
      thirdPlaceControl, buildContinuation: buildPennContinuation,
      clearDestination: () => { clearThirdPlace(); syncLandmarks(); },
      onSuspend: () => { clearThirdPlace(); stopPlay(); closeSheet(); station3d.setVisible(false); towers3d.setVisible(false); walker3d.setVisible(false); syncEntranceHierarchy(); syncLandmarks(); },
      onResume: () => { clearThirdPlace(); applyFilters(); } });
    syncLandmarks();
    return pennMap;
  })();
  return pennMapPromise;
}
async function openPenn(routeState, routeOptions) {
  try { await (await initPennMap()).activate(routeState, routeOptions); }
  catch (error) { console.error(error); toast("Penn Station could not load. Please reload and try again."); }
}
let stationSelected = false;
let standaloneStation = false;
let surveyStationModels = {};
const independentStationViewers = {
  "225": { floorsModel: "rockefeller-station" },
  "9": { floorsModel: "57-st-7-av" },
  "607": { floorsModel: "empire-state", stationScope: true },
  "602": { floorsModel: "empire-state", stationScope: true },
  "610": { floorsModel: "one-vanderbilt", stationScope: true },
  // (34 St–Hudson Yards, complex 471, is no longer here: it is a place of the new page, with its trip on the map itself.)
  "318": { floorViewer: "penn-station/", stationTab: "irt", label: "34 St–Penn Station · 1 2 3" },
  "164": { floorViewer: "penn-station/", stationTab: "ind", label: "34 St–Penn Station · A C E" },
};
const standaloneStationModel = id => independentStationViewers[String(id)] ??
  (Object.hasOwn(surveyStationModels, String(id)) ? { floorsModel: surveyStationModels[String(id)].model } : null);
function openStandaloneStation() {
  if (standaloneStation) openFloors({viewerVenue: standaloneStation, station: true});
}
function syncFloorsButton() {
  $("floors-btn").textContent = floorsButtonLabel();
  $("floors-btn").hidden = !standaloneStation &&
    (!(state.venue?.floors || state.venue?.floorViewer) || state.ui === "explore");
}
const stationViewerComplexes = {
  "empire-state": ["607", "602"], "one-vanderbilt": ["610"],
  "hudson-yards-edge": ["471"], "central-park-tower": ["9"],
};
const floorsButtonLabel = () => standaloneStation || stationSelected || state.venue?.id === "grand-central"
  ? "Explore station" : "All floors";
const OCULUS_CENTER = [-74.0114042, 40.711532];

function locateOculus() {
  popup?.remove();
  return selectVenue("one-wtc", { area: "oculus" });
}

function openOculus() {
  openFloors({ viewerVenue: VENUES.find(v => v.id === "one-wtc"), area: "oculus", station: false });
}

function openFloors({ viewerVenue = state.venue, area, preview = false, station = stationSelected } = {}) {
  stopPlay();
  const floor = !station && !area && state.ui === "step"
    ? (state.venue.viewerFloors || state.venue.floors)?.[state.level]
    : null;
  const box = $("floors-view");
  const frame = document.createElement("iframe");
  frame.title = station ? "Explore station" : "All floors";
  const query = new URLSearchParams();
  if (viewerVenue.floorsModel) query.set("model", viewerVenue.floorsModel);
  else if (stationSelected && viewerVenue.id === "hudson-yards-edge") query.set("model", "hudson-yards");
  if (viewerVenue.stationTab) query.set("station", viewerVenue.stationTab);
  if (floor) query.set("floor", floor);
  if (area) query.set("area", area);
  if (viewerVenue.stationScope || viewerVenue.id === "empire-state" || (stationSelected && viewerVenue === state.venue && stationViewerComplexes[viewerVenue.id])) {
    query.set("experience", preview ? "preview" : station ? "station" : "building");
    frame.title = preview ? "Preview route" : station ? "Explore station" : "All floors";
  }

  if (viewerVenue.id === "one-wtc" && !area) query.set("tower", "1");
  frame.src = `${viewerVenue.floorViewer || (viewerVenue.id === "chrysler" ? "chrysler/" : null) || "building.html"}${query.size ? `?${query}` : ""}`;
  box.replaceChildren(frame);
  box.hidden = false;
}
function closeFloors() {
  $("floors-view").hidden = true;
  $("floors-view").replaceChildren();
}

// Switch building: data, floors, exterior model, controls and camera
async function selectVenue(id, { animate = true, camera = true, ui = "landmark", area } = {}) {
  if (RETIRED[id]) return tripCard(RETIRED[id].cid).open({ dest: RETIRED[id].dest });   // whatever asked for a retired venue gets the new page's trip
  pennMap?.deactivate();
  const base = VENUES.find((v) => v.id === id);
  const cfg = area === "oculus" ? { ...base, area, name: "Oculus", target: "c-turn",
    center: OCULUS_CENTER, keepCenter: true, towerM: 0, exteriorZoom: 17.6,
    sub: "Arrival via the modeled World Trade Center concourse." } : base;
  if (state.venue?.id !== id || state.venue?.area !== area || state.ui === "explore") clearThirdPlace();
  const fromOverview = state.overview;
  popup?.remove();
  browsedStation = null;
  stopPlay();
  closeSheet();
  state.overview = false;
  if (state.exploded) {
    state.exploded = false;
    $("explode").setAttribute("aria-pressed", "false");
    station3d.setSpread(false);
    towers3d.setSpread(false);
    map.setPaintProperty("buildings-3d", "fill-extrusion-height", state.is3d ? cityHeight() : 0);
  }
  standaloneStation = false;
  stationSelected = false;
  state.venue = cfg;
  $("opt-badge").textContent = cfg.badgeLabel || "I have a building badge";
  if (cfg.exterior) return selectExterior(cfg, { animate });
  await loadVenueData(cfg);
  if (id === "one-wtc") {
    routes = { ...routes, targets: routes.targets.filter(t => (t.route_set === "oculus") === Boolean(area)),
      route_sets: routes.route_sets.filter(rs => (rs.id === "oculus") === Boolean(area)) };
  }
  map.getSource("venue").setData(venue);
  map.getSource("pois").setData(poiFeatures(venue));
  highlightLandmark(cfg.bin);

  await useLandmark(id);
  setSeeThrough(false, { move: false });

  populateVenueControls(cfg);
  $("qa-link").href = `qa.html#${id}`;
  $("evidence-link").href = `evidence.html#${id}`;
  applyProvenance();
  selectRoute();
  setUI(ui);
  if (!camera) return;
  if (state.is3d) map[(fromOverview || area) && animate ? "flyTo" : "jumpTo"]({ ...viewExterior(cfg), duration: 1800 });
  else if (!animate) map.jumpTo({ center: cfg.center, zoom: 17.6, ...VIEW_2D });
  else if (area || fromOverview || map.getZoom() < 15) map.flyTo({ center: cfg.center, zoom: 17.6, ...VIEW_2D, duration: 1800 });
}

// Landmark colours: the selected one in the accent colour, the other ten softer
function targetColor(bin) { return ["case", ["==", ["get", "bin"], bin], color("--accent"), T.landmark]; }
function dotColor(id) { return ["case", ["==", ["get", "id"], id], color("--accent"), T.landmark]; }
function highlightLandmark(bin) {
  map.setPaintProperty("target-3d", "fill-extrusion-color", targetColor(bin));
  map.setPaintProperty("landmark-dots", "circle-color", dotColor(VENUES.find((v) => v.bin === bin)?.id || ""));
}

// Every landmark model and its name on the map: metadata first (small), the models stream in behind
async function loadAllLandmarks() {
  await Promise.all(VENUES.map((v) => ensureLandmark(v.id).catch(() => null)));
  map.getSource("landmark-points").setData({ type: "FeatureCollection", features: VENUES.filter((v) => landmarkMeta[v.id])
    .map((v, i) => ({ type: "Feature", properties: { id: v.id, name: v.name, rank: i },
      geometry: { type: "Point", coordinates: landmarkMeta[v.id].origin_lonlat } }))
      .concat([{ type: "Feature", properties: { id: "hy-vessel", name: "Vessel", rank: VENUES.length },   // not a venue of the first version: a place of the new page
        geometry: { type: "Point", coordinates: hyWorld.lngLat(...HY_PLACES["hy-vessel"].at).toArray() } }]) });
}

// Frame Manhattan independently of the open browse category.
function showOverview({ animate = true } = {}) {
  pennMap?.deactivate();
  popup?.remove();
  state.overview = true;
  clearThirdPlace();
  stopPlay();
  closeSheet();
  if (landmark?.seeThrough) setSeeThrough(false, { move: false });
  setUI("explore");
  setMode(state.is3d, { move: false });
  map.fitBounds([[-74.020, 40.699], [-73.907, 40.881]], {
    padding: panelPadding(), retainPadding: false, bearing: 0, pitch: state.is3d ? 45 : 0,
    duration: animate ? 900 : 0,
  });
}

// Neighbouring buildings drawn by a landmark model itself (Columbia's campus) are flattened in the city layer
let hiddenBins = [];
const cityHeight = () => ["case", ["in", ["get", "bin"], ["literal", hiddenBins]], 0, ["coalesce", ["get", "height_m"], 0]];

// Detailed exteriors, added last so they draw over the floors (see-through mode does not write depth)
const landmarkMeta = {};
const landmarkLoading = {};
function oculusCompanion({ origin, scale }) {
  // NYC Transportation Hub footprint centroid and long axis (BIN 1089309).
  const anchor = maplibregl.MercatorCoordinate.fromLngLat(OCULUS_CENTER);
  const {shell} = createOculusExterior();
  shell.position.set((anchor.x-origin.x)/scale,0,(anchor.y-origin.y)/scale);
  shell.rotation.y = -Math.atan2(68,86.4);
  return shell;
}
function ensureLandmark(id) {
  landmarkLoading[id] ??= loadJSON(`data/landmarks/${id}.json`).then(async (meta) => {
    let createModel = null;
    if (id === "grand-central") {
      const [{ createMapTerminal }, plan] = await Promise.all([
        import("./grand-central-terminal/exterior.js"),
        loadJSON("grand-central-terminal/interior-plan.json")
      ]);
      createModel = () => createMapTerminal(plan);
    } else if (id === "nypl-schwarzman") {
      const {createMapLibrary} = await import("./nypl-schwarzman/model.js");
      createModel = createMapLibrary;
    } else if (id === "chrysler") {
      const [{createMapEnvelope}, study, floors] = await loadChryslerAssets();
      createModel = async (loader, url) => createMapEnvelope((await loader.loadAsync(url)).scene, study, floors);
    } else if (id === "empire-state") {
      const [{createEmpireEnvelope}, model] = await Promise.all([
        import("./empire-envelope.js"),
        loadJSON("data/buildings/empire-state.json")
      ]);
      createModel = () => {
        const shell = createEmpireEnvelope(model.floors);
        const [lon, lat] = model.frame.origin_lonlat;
        const angle = model.frame.u_bearing_deg * Math.PI / 180;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const origin = maplibregl.MercatorCoordinate.fromLngLat([lon, lat]);
        const scale = origin.meterInMercatorCoordinateUnits();
        const mx = 111320 * Math.cos(lat * Math.PI / 180);
        const axis = (east, north) => {
          const end = maplibregl.MercatorCoordinate.fromLngLat([lon+east/mx,lat+north/110540]);
          return [(end.x-origin.x)/scale,(end.y-origin.y)/scale];
        };
        const [ax,az] = axis(cos*1000,sin*1000);
        const [bx,bz] = axis(-sin*1000,cos*1000);
        // Use the same street-grid transform as the map floor layer.
        shell.matrixAutoUpdate = false;
        shell.matrix.set(ax/1000,0,-bx/1000,0,0,1,0,0,az/1000,0,-bz/1000,0,0,0,0,1);
        shell.matrixWorldNeedsUpdate = true;
        return shell;
      };
    } else if (id === "one-wtc") {
      const { createTowerExterior } = await import("./wtc/tower-exterior.js");
      createModel = () => {
        const shell = createTowerExterior();
        // The landmark layer starts at the West/Fulton footprint corner.
        // The generated shell starts at the center of the NYC footprint (BIN 1088469).
        const origin = maplibregl.MercatorCoordinate.fromLngLat(meta.origin_lonlat);
        const center = maplibregl.MercatorCoordinate.fromLngLat([-74.01317308, 40.71300943]);
        const scale = origin.meterInMercatorCoordinateUnits();
        shell.position.set((center.x - origin.x) / scale, 0, (center.y - origin.y) / scale);
        shell.rotation.y = -29.46 * Math.PI / 180;
        return shell;
      };
    }
    landmarkMeta[id] = meta;
    const l = landmarks[id] = createLandmarkLayer(maplibregl, { id: `landmark-${id}`, url: `data/landmarks/${id}.glb`,
      origin: meta.origin_lonlat, floorM: meta.facade_floor_m, contextUrl: meta.context_url,
      detailUrl: meta.detail_url, detailMinZoom: meta.detail_min_zoom,
      createModel, companion: id === "one-wtc" ? oculusCompanion : null });
    map.addLayer(l.layer);
    if (id === "one-wtc") l.loaded.then(() => {
      if (!l.ready) return;
      hiddenBins = [...new Set([...hiddenBins, "1089309"])];
      if (state.is3d && !state.exploded) map.setPaintProperty("buildings-3d", "fill-extrusion-height", cityHeight());
    });
    placeCity();
    map.moveLayer("entrances-3d"); // after the tower models, so pins behind them get the x-ray ghost
    map.moveLayer("walker-3d");
    syncLandmarks();
    // the model's own neighbours replace the map's plain boxes once they are drawn (until then the boxes stand in)
    l.contextReady.then(() => {
      if (!meta.campus_bins?.length) return;
      hiddenBins = [...new Set([...hiddenBins, ...meta.campus_bins])];
      if (state.is3d && !state.exploded) map.setPaintProperty("buildings-3d", "fill-extrusion-height", cityHeight());
    });
    return l;
  });
  return landmarkLoading[id];
}
async function useLandmark(id) {
  landmark = await ensureLandmark(id);
  syncLandmarks();
}
const PLATFORM_CHOICES = [
  ["hudson-yards:platform", "34 St–Hudson Yards · 7 platform"],
  ["grand-central:b2", "Grand Central · S platform"],
  ["grand-central:lex", "Grand Central · 4 5 6 platforms"],
  ["grand-central:plat7", "Grand Central · 7 platform"],
  ["grand-central:lirr_upper", "Grand Central Madison · upper platforms"],
  ["grand-central:lirr_lower", "Grand Central Madison · lower platforms"],
  ["herald-square:bmt", "34 St–Herald Sq · N Q R W platforms"],
  ["herald-square:ind", "34 St–Herald Sq · B D F M platforms"],
  ["penn:irtP", "34 St–Penn Station · 1 2 3 platforms"],
  ["penn:indP", "34 St–Penn Station · A C E platforms"],
  ["penn:rail", "Penn Station · rail platforms"],
];
function stopName(id) {
  if(id==="penn-station")return "Penn Station";
  return PLATFORM_CHOICES.find(([value])=>value===id)?.[1] || VENUES.find(v=>v.id===id)?.name || "the next stop";
}
function thirdPlaceControl(slot,addButton,editable) {
  const primary = pennMap?.active ? "penn-station" : state.venue?.id;
  const buildings = [...VENUES, {id:"penn-station",name:"Penn Station"}].filter(v=>v.id!==primary);
  const select = document.createElement("select");
  select.className = "third-place";
  select.setAttribute("aria-label", "Next stop");
  select.title = "Choose where to go after the current destination";
  select.add(new Option(thirdPlace ? "Remove stop" : "Choose a stop", ""));
  for (const [name, entries] of [["Buildings", buildings.map(v=>[v.id,v.name])], ["Platforms", PLATFORM_CHOICES]]) {
    const group = document.createElement("optgroup");
    group.label = name;
    for (const [id,label] of entries) group.append(new Option(label,id));
    select.append(group);
  }
  select.value = thirdPlace;
  select.hidden=true;
  const row=document.createElement(editable?"button":"div");
  row.className="end stop-row";
  row.hidden=!thirdPlace;
  if(editable)row.type="button";
  const dot=document.createElement("span");
  dot.className="d";
  dot.setAttribute("aria-hidden","true");
  const label=document.createElement("span");
  label.textContent=thirdPlace?stopName(thirdPlace):"";
  row.append(dot,label);
  const open=()=>{
    slot.hidden=false;select.hidden=false;row.hidden=true;
    addButton.setAttribute("aria-expanded","true");select.focus();
  };
  const close=()=>{
    select.hidden=true;row.hidden=!thirdPlace;slot.hidden=!thirdPlace;
    addButton.setAttribute("aria-expanded","false");
  };
  if(editable)row.onclick=open;
  addButton.hidden=!editable||Boolean(thirdPlace);
  addButton.setAttribute("aria-expanded","false");
  addButton.onclick=()=>select.hidden?open():close();
  select.onkeydown=e=>{
    if(e.key!=="Escape")return;
    e.stopPropagation();close();(thirdPlace?row:addButton).focus();
  };
  select.onchange=()=>{
    const id=select.value;
    chooseThirdDestination(id);
    if(slot.isConnected)thirdPlaceControl(slot,addButton,editable);
  };
  slot.hidden=!thirdPlace;
  const field=document.createElement("div");
  const status=document.createElement("p");
  status.className="fine third-route-status";
  status.setAttribute("role","status");
  status.textContent=continuationStatus;
  status.hidden=!continuationStatus;
  field.append(row,select,status);
  slot.replaceChildren(field);
}
function clearThirdPlace() {
  thirdPlace = "";
  continuation=null;
  continuationFeatures=[];
  thirdStationModel=null;
  if(venue&&map.getSource("venue"))map.getSource("venue").setData(venue);
  continuationStatus="";
  continuationRequest++;
  thirdPlatformRequest++;
  thirdPlatformLayer?.setVisible(false);
  setContinuationLine([]);
}
function frameThirdPlace(point) {
  const primary = pennMap?.active ? pennMap.lonlat(-90,-55) : state.venue?.center;
  if (!primary || !point) return;
  map.fitBounds(new maplibregl.LngLatBounds(primary,primary).extend(point),
    {padding:{top:76,bottom:76,left:72,right:72},maxZoom:17.8,duration:700});
}
async function setThirdPlace(id) {
  clearThirdPlace();
  thirdPlace = id;
  syncLandmarks();
  const [station,level] = id.split(":");
  if (!level) {
    if(id==="penn-station"){
      const request=thirdPlatformRequest;
      const penn=await initPennMap();
      if(request===thirdPlatformRequest)frameThirdPlace(penn.lonlat(-90,-55));
    }else frameThirdPlace(VENUES.find(v=>v.id===id)?.center);
    return;
  }
  if(station==="penn"){
    const request=thirdPlatformRequest;
    const penn=await initPennMap();
    if(request===thirdPlatformRequest)frameThirdPlace(penn.lonlat(level==="indP"?-174:level==="irtP"?170:0,-90));
    return;
  }
  const request = thirdPlatformRequest;
  try {
    const model = await loadJSON(`data/stations/${station}.json`);
    if (request !== thirdPlatformRequest) return;
    thirdStationModel=model;
    const depth = model.levels.find(l=>l.id===level).depth_m;
    thirdPlatformLayer.setModel({
      ...model, section:null, items:[], fare_lines:[],
      zones:model.zones.filter(z=>z.level===level && ["platform","track"].includes(z.kind)),
    }, {levels:{[level]:level}, elev:()=>-depth});
    thirdPlatformLayer.setLevel(level);
    thirdPlatformLayer.setVisible(true);
    const points=model.zones.filter(z=>z.level===level&&z.kind==="platform").flatMap(z=>z.shape.flatMap(r=>r.outer));
    if(points.length){
      const [x,z]=points.reduce(([a,b],[c,d])=>[a+c/points.length,b+d/points.length],[0,0]);
      frameThirdPlace([model.frame.origin[0]+x/model.frame.m_per_deg_lon,model.frame.origin[1]-z/model.frame.m_per_deg_lat]);
    }
  } catch(error) {
    if (request !== thirdPlatformRequest) return;
    clearThirdPlace();
    syncLandmarks();
    for (const select of document.querySelectorAll(".third-place")) select.value="";
    toast("The platform model could not load.");
  }
}
async function thirdIngress(id,stepFree){
  const [station,platform]=id.split(":");
  if(station==="penn" || id==="penn-station"){
    const penn=await initPennMap();
    const points=await pennIngress(platform,stepFree);
    return points?pennRouteLeg(points,penn.registration):null;
  }
  const cfg=platform?VENUES.find(v=>v.station?.id===station):VENUES.find(v=>v.id===id);
  if(!cfg||cfg.exterior)return null;
  const data=await loadContinuationVenue(cfg.id);
  const leg=venueLeg(data,{platform:platform?cfg.station.levels[platform]:null,targetId:cfg.target,leaving:false,stepFree});
  return leg?normalizedLeg(leg):null;
}
async function buildPennContinuation(exit,id,stepFree){
  return connectLegs(exit,await thirdIngress(id,stepFree),stepFree);
}
function setContinuationStatus(message){
  continuationStatus=message;
  for(const status of document.querySelectorAll(".third-route-status")){
    status.textContent=message;status.hidden=!message;
  }
}
async function chooseThirdDestination(id){
  const primary=state.venue?.id, penn=Boolean(pennMap?.active);
  const display=setThirdPlace(id);
  const request=continuationRequest;
  if(!id){
    if(penn)pennMap.setContinuation([]);
    else selectRoute();
    return;
  }
  setContinuationStatus("Finding a connected route…");
  if(penn)pennMap.setContinuation(null);
  else { selectRoute({keepContinuation:true}); $("start").disabled=true;$("play").disabled=true; }
  try {
    const stepFree=penn?pennMap.stepFree:$("accessible").checked;
    let steps;
    if(penn)steps=await pennMap.continueTo(id);
    else {
      const end=state.baseRoute?.steps?.at(-1)?.nodes.at(-1);
      const data={id:primary,graph,routeData:routes,nodes};
      const exit=end?venueLeg(data,{endpoint:end,leaving:true,stepFree,badge:$("badge").checked}):null;
      steps=exit?await connectLegs(normalizedLeg(exit),await thirdIngress(id,stepFree),stepFree):null;
    }
    if(request!==continuationRequest||primary!==state.venue?.id||penn!==Boolean(pennMap?.active))return;
    await display;
    if(request!==continuationRequest)return;
    if(!steps?.length)throw Error("No connected modelled route");
    continuation=steps;
    if(thirdStationModel){
      const cfg=VENUES.find(v=>v.station?.id===thirdStationModel.station.id);
      const heights=new Map(steps.flatMap(s=>s.points.filter(p=>p.owner===cfg?.id).map(p=>[p.level,p.elev])));
      const mapping=Object.fromEntries(Object.entries(cfg.station.levels).filter(([,l])=>heights.has(l)));
      thirdPlatformLayer.setModel({...thirdStationModel,section:null,caverns:[],
        zones:thirdStationModel.zones.filter(z=>mapping[z.level]),
        fare_lines:thirdStationModel.fare_lines.filter(f=>mapping[f.level]),
        items:thirdStationModel.items.filter(it=>mapping[it.from.level]&&mapping[it.to.level]),
      },{levels:mapping,elev:l=>heights.get(l)});
      thirdPlatformLayer.setLevel(mapping[id.split(":")[1]]);
    }
    if(!penn && !id.includes(":") && id!=="penn-station"){
      const remote=id==="central-park-tower" ? (await loadContinuationVenue(id)).venue : await loadJSON(`data/venues/${id}/venue.geojson`);
      if(request!==continuationRequest)return;
      const used=new Set(steps.flatMap(s=>s.points.filter(p=>p.owner===id).map(p=>p.level)));
      continuationFeatures=remote.features.filter(f=>used.has(f.properties.level)).map(f=>({
        ...f,properties:{...f.properties,level:"continuation:"+id+":"+f.properties.level,
          cat:f.properties.category,elev:steps.flatMap(s=>s.points).find(p=>p.owner===id&&p.level===f.properties.level)?.elev,
          top:(steps.flatMap(s=>s.points).find(p=>p.owner===id&&p.level===f.properties.level)?.elev??0)+.35}
      }));
    }
    const firstStop=penn?pennMap.destinationName:$("trip-to").querySelector("b")?.textContent;
    const nextStop=stopName(id);
    setContinuationStatus(firstStop
      ? `After ${firstStop}, continue to ${nextStop}.`
      : `Continue to ${nextStop}.`);
    if(penn)pennMap.setContinuation(steps,nextStop);
    else selectRoute({keepContinuation:true});
    syncLandmarks();
  }catch(error){
    if(request!==continuationRequest)return;
    continuation=null;
    setContinuationStatus("No route to this stop with the current travel options. Choose another stop or remove it.");
    if(penn)pennMap.setContinuation(null);
    else { $("start").disabled=true;$("play").disabled=true; }
  }
}
let continuationNodeIds=[],continuationLevelIds=[];
function appendContinuation(route){
  for(const id of continuationNodeIds)delete nodes[id];
  for(const id of continuationLevelIds)delete levels[id];
  continuationNodeIds=[];continuationLevelIds=[];
  if(!continuation?.length)return route;
  const last=route.steps.at(-1),source=nodes[last.nodes.at(-1)];
  let previous=source.id, priorLevel=source.level;
  const extra=[];
  for(const [i,step] of continuation.entries()){
    const path=step.points.map((p,j)=>{
      if(j===0)return previous;
      const id="continuation-"+i+"-"+j;
      const level=p.owner===state.venue?.id && levels[p.level]?p.level:"continuation:"+(p.owner||"")+":"+p.level;
      if(!levels[level]){
        levels[level]={id:level,name:p.name,short_name:p.short||p.name,ordinal:0,elev:p.elev,explodedElev:p.elev,underground:p.underground||p.elev<0};
        continuationLevelIds.push(level);
      }
      nodes[id]={id,level,lonlat:p.lonlat,routeElev:p.owner===state.venue?.id?undefined:p.elev};continuationNodeIds.push(id);
      return id;
    });
    previous=path.at(-1);priorLevel=nodes[previous].level;
    const distance_m=path.slice(1).reduce((sum,id,j)=>{
      const a=nodes[path[j]].lonlat,b=nodes[id].lonlat;
      return sum+Math.hypot((a[0]-b[0])*84000,(a[1]-b[1])*111000);
    },0);
    extra.push({kind:step.kind,level:priorLevel,text:step.text,nodes:path,distance_m,continuation:true,
      evidence:{action:"scenario",place:"scenario",refs:[],notes:["Continuation assembled from modelled routes and OSM walking data."]}});
  }
  extra.push({kind:"arrive",level:priorLevel,text:`Arrive at ${stopName(thirdPlace)}.`,nodes:[previous],
    evidence:{action:"scenario",place:"scenario",refs:[],notes:[]}});
  const finish={...last,kind:"walk",text:`Continue from here to ${stopName(thirdPlace)}.`};
  return {...route,steps:[...route.steps.slice(0,-1),finish,...extra],path:[...route.path,...continuationNodeIds]};
}
function setContinuationLine(segments){
  if(!continuationLine)return;
  const hadRoute=continuationSegments.length;
  continuationSegments=segments;
  if(!segments.length){
    continuationLine.setVisible(false);
    if(hadRoute)continuationLine.setModel(null);
    return;
  }
  const origin=segments[0].a.lonlat;
  const cpt = state.venue?.cptModel;
  continuationLine.setModel({frame:{origin},zones:[],fare_lines:[],items:[],section:null,
    ...(cpt ? {routeRadius:.19,routeLift:.22} : {})});
  continuationLine.setRoute(segments);
  continuationLine.setVisible(state.is3d);
}
function syncLandmarks() {
  const pennActive = Boolean(pennMap?.active);
  const primary = pennActive ? "penn-station" : state.ui !== "explore" ? state.venue?.id : null;
  const allowed = [primary,thirdPlace].filter(Boolean);
  const underTowers = !(["chrysler","empire-state"].includes(primary) && state.ui === "landmark") && state.venue?.floors && (levels[state.level]?.underground || closeFloor()) && landmark?.seeThrough;
  for (const [id,l] of Object.entries(landmarks)) {
    const selected = id === primary;
    l.setVisible(!RETIRED[id] && (pennActive || state.is3d) && (!primary || allowed.includes(id)) &&
      !(selected && (state.exploded || underTowers)));
    l.setMuted(false);
    if(!selected)l.setSeeThrough(id===thirdPlace&&Boolean(continuation?.length));
  }
  const bins = VENUES.filter(v=>allowed.includes(v.id)).map(v=>v.bin);
  map.setLayoutProperty("buildings-3d","visibility",primary?"none":"visible");
  map.setFilter("target-3d",primary?["in",["get","bin"],["literal",bins]]:isLandmark);
  for (const id of ["landmark-dots","landmark-labels"]) {
    map.setFilter(id,primary?["in",["get","id"],["literal",allowed]]:null);
  }
  pennMap?.setMapVisibility(!primary || allowed.includes("penn-station"),state.is3d,
    thirdPlace.startsWith("penn:")?thirdPlace.split(":")[1]:null,
    continuation?.length && (thirdPlace.startsWith("penn:")||thirdPlace==="penn-station")
      ? (state.level.includes(":penn:")?state.level.split(":").at(-1):"all") : null);
  if(state.level.startsWith("continuation:") && thirdStationModel)thirdPlatformLayer.setLevel(state.level.split(":").at(-1));
}

// A landmark with its exterior model, neighbouring buildings, streets and stations, but no indoor route yet
async function selectExterior(cfg, { animate }) {
  stopPlay();
  state.route = null;
  venue = EMPTY; graph = { nodes: [], edges: [], levels: [], elevator_groups: [] };
  routes = { starts: [], targets: [], routes: {} }; exits = null; entranceRoutes = null; nodes = {}; levels = {};
  for (const src of ["venue", "pois", "route-lines", "route-solids", "route-points", "exit-preview", "exit-ranks"]) {
    map.getSource(src).setData(EMPTY);
  }
  clearWalker();
  state.routeExit = -1;
  map.setFilter("route-exit", ["==", ["get", "eid"], -1]);
  highlightStation(null);
  highlightLandmark(cfg.bin);
  await loadStation(cfg);
  await useLandmark(cfg.id);
  const meta = landmarkMeta[cfg.id];
  $("lm-sub").textContent = meta.task || "";
  $("exterior-note").innerHTML = `<p><b>Exterior and surroundings only.</b> The arrival route for this landmark is not built yet.
    Shown: the building model (${esc(meta.outline_only ? "official NYC footprint and roof height; OpenStreetMap has no 3D parts"
      : `${meta.parts} OpenStreetMap 3D parts, checked against the NYC footprint and roof height`)}),
    neighbouring buildings (NYC footprints), streets and subway entrances (MTA).</p>` +
    (meta.address ? `<p>${esc(meta.address)}</p>` : "") +
    (meta.open_questions?.length ? `<p>Open before routing:</p><ul>${meta.open_questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : "");
  $("qa-link").href = `qa.html#${cfg.id}`;
  setSeeThrough(false, { move: false });
  if (state.is3d) map[animate ? "easeTo" : "jumpTo"]({ ...viewExterior(cfg), duration: 1200 });
  else map[animate ? "easeTo" : "jumpTo"]({ center: cfg.center, zoom: 16.6, ...VIEW_2D, duration: 1200 });
}

// The 2D "you" marker, drawn once: a 70° beam fading out ahead (north, before the layer rotates it) and a ringed dot
function meIcon() {
  const px = 2, size = 72, c = document.createElement("canvas");
  c.width = c.height = size * px;
  const g = c.getContext("2d");
  g.scale(px, px);
  const mid = size / 2, rgb = ROUTE.current.match(/\w\w/g).map((h) => parseInt(h, 16)).join(",");
  const beam = g.createRadialGradient(mid, mid, 6, mid, mid, 34);
  beam.addColorStop(0, `rgba(${rgb},0.55)`);
  beam.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = beam;
  g.beginPath(); g.moveTo(mid, mid); g.arc(mid, mid, 34, -Math.PI / 2 - 0.61, -Math.PI / 2 + 0.61); g.closePath(); g.fill();
  g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 4;
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(mid, mid, 9.5, 0, 2 * Math.PI); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = ROUTE.current; g.beginPath(); g.arc(mid, mid, 6.8, 0, 2 * Math.PI); g.fill();
  return { width: c.width, height: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
}

// --- UI ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function initControls() {
  const landmarkList = $("chips");
  const stationList = $("stations-list");
  const search = $("search");
  const categoryGroup = document.querySelector(".home-categories");
  const categories = [...categoryGroup.querySelectorAll("[data-home-category]")];
  const stations = [...subway.stations.features].sort((a, b) =>
    a.properties.station.localeCompare(b.properties.station, "en", { numeric: true }));
  let category = null;

  landmarkList.innerHTML = VENUES.filter(v => v.id !== "penn-station")
    .flatMap(v => v.id === "one-wtc" ? [v, { id: "oculus", name: "Oculus" }] : [v])
    .flatMap(v => v.id === "hudson-yards-edge" ? [v, { id: "hy-vessel", name: "Vessel (Hudson Yards)" }] : [v])
    .sort((a, b) => Boolean(HY_PLACES[b.id]) - Boolean(HY_PLACES[a.id]))   // the places of the new page first
    .map(v => `<button type="button" data-id="${esc(v.id)}">${esc(v.name)}</button>`).join("") + '<button type="button" data-id="penn-station">Penn Station</button>';
  stationList.innerHTML = stations.map((f, i) =>
    `<button type="button" data-station="${i}"><span>${esc(f.properties.station)}</span><span class="home-route-badges">${bulletsHtml(esc(f.properties.routes))}</span></button>`).join("");

  function updateBrowse() {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    for (const button of categories) {
      const key = button.dataset.homeCategory;
      const list = $(button.getAttribute("aria-controls"));
      let groupMatches = 0;
      for (const result of list.children) {
        const routes = key === "transit" ? stations[Number(result.dataset.station)].properties.routes : "";
        result.hidden = Boolean(query) && !result.textContent.toLowerCase().includes(query) &&
          !routes.toLowerCase().includes(query);
        if (!result.hidden) groupMatches++;
      }
      const expanded = query ? groupMatches > 0 : category === key;
      list.hidden = !expanded;
      list.scrollTop = 0;
      button.setAttribute("aria-expanded", String(expanded));
      matches += groupMatches;
    }
    categoryGroup.dataset.searching = String(Boolean(query));
    $("home-empty").hidden = !query || matches > 0;
  }

  for (const button of categories) button.addEventListener("click", () => {
    const key = button.dataset.homeCategory;
    category = search.value.trim() || category !== key ? key : null;
    search.value = "";
    updateBrowse();
  });
  landmarkList.addEventListener("click", e => {
    const button = e.target.closest("[data-id]");
    if (!button) return;
    if (button.dataset.id === "oculus") return locateOculus();
    if (button.dataset.id === "penn-station") return openPenn();
    if (HY_PLACES[button.dataset.id]) return tripCard().open({ dest: HY_PLACES[button.dataset.id].dest });   // a place of the new page: straight to its trip
    selectVenue(button.dataset.id);
  });
  stationList.addEventListener("click", e => {
    const button = e.target.closest("[data-station]");
    if (!button) return;
    const station = stations[Number(button.dataset.station)];
    const center = station.geometry.coordinates;
    focusStation(station.properties, center);
  });
  search.addEventListener("input", updateBrowse);
  search.addEventListener("keydown", e => {
    if (e.key !== "Enter" || !search.value.trim()) return;
    [landmarkList, stationList].find(list => list.querySelector("button:not([hidden])"))
      ?.querySelector("button:not([hidden])")?.click();
  });
  // anything marked data-open opens that detail sheet; data-back goes one state back
  document.addEventListener("click", (e) => {
    const disp = e.target.closest("[data-display]");
    if (disp) return setDisplay(...disp.dataset.display.split(":"));
    const open = e.target.closest("[data-open]");
    if (open) return openSheet(open.dataset.open);
    if (e.target.closest("[data-back]")) goBack();
  });
  $("sheet-close").onclick = closeSheet;
  $("scrim").onclick = closeSheet;
  const pick = (el, fn) => el.addEventListener("click", (e) => { const b = e.target.closest("button[data-id]"); if (b) fn(b.dataset.id); });
  pick($("dests"), (id) => pickTarget(id));
  pick($("targets"), (id) => { pickTarget(id); closeSheet(); });
  pick($("starts"), chooseEntrance);
  $("show-route").onclick = () => showRoute();
  $("start").onclick = () => startSteps(0);
  $("segments").addEventListener("click", (e) => { const b = e.target.closest("button[data-step]"); if (b) startSteps(+b.dataset.step); });
  $("opt-free").onclick = () => toggleOption("accessible", "opt-free");
  $("opt-badge").onclick = () => toggleOption("badge", "opt-badge");
  $("swap").onclick = () => setDirection(!state.back);
  $("prev").onclick = () => seekRouteStep(state.step - 1);
  $("next").onclick = () => (state.step >= state.route.steps.length - 1 ? goBack() : seekRouteStep(state.step + 1));
  $("prov").addEventListener("change", applyProvenance);
  $("btn2d").onclick = () => setMode(false);
  $("btn3d").onclick = () => setMode(true);
  $("xray").onclick = () => setSeeThrough(!landmark.seeThrough);
  $("explode").onclick = () => setExploded(!state.exploded);
  $("floors-btn").onclick = () => standaloneStation ? openStandaloneStation() : state.venue?.area === "oculus" ? openOculus() : openFloors();
  window.addEventListener("message", (e) => { if (e.origin === location.origin && e.data?.type === "close-floors") closeFloors(); });
  $("play").onclick = () => {
    if (routeSceneConfig()) segmentedRoute = true;
    if (state.playing) stopPlay(); else startSteps(0, { play: true });
  };
  $("play-step").onclick = () => {
    if (routeSceneConfig() && !state.session) segmentedRoute = true;
    if (state.playing) stopPlay(); else startPlay();
  };
  $("route-global").onclick = () => { segmentedRoute = false; syncRouteScene(); };
  $("route-segmented").onclick = () => { segmentedRoute = true; syncRouteScene(); };
  $("route-scrub").oninput = (event) => seekRouteStep(Number(event.target.value));
  $("route-scene").addEventListener("route-ready", () => syncRouteScene());
  $("route-follow").onclick = () => {
    followPaused = false;
    lastRouteCameraStep = null;
    $("route-scene").contentWindow?.floorsView?.resumeRouteFollow?.();
    syncRouteScene(undefined, { recenter: true });
  };
  $("restart").onclick = () => { stopPlay(); setStep(0); startPlay(); };
  $("end-play").onclick = endPreview;
  $("speed").onclick = () => {
    state.speed = state.speed >= 4 ? 1 : state.speed * 2;
    $("speed").textContent = `${state.speed}×`;
    $("speed").setAttribute("aria-label", `Playback speed: ${state.speed} times`);
    setPlayButtons(state.playing);
  };
  $("heading").onclick = cycleHeading;
  // the direction button's arrow points north, like a compass needle
  map.on("rotate", () => $("heading").style.setProperty("--rot", `${-map.getBearing()}deg`));
  // dragging the map while playing stops the camera following the dot until the next step
  for (const ev of ["dragstart", "rotatestart", "zoomstart"]) map.on(ev, (e) => { if ((state.playing || routeSceneConfig() && state.ui === "step") && e.originalEvent) followPaused = true; });
  for (const id of ["prev", "next"]) $(id).addEventListener("click", stopPlay, true);
  $("steps").addEventListener("click", stopPlay, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return !$("floors-view").hidden ? closeFloors() : !$("sheet").hidden ? closeSheet() : state.session ? endPreview() : goBack();
    if (e.target.closest("select, input")) return;
    if (e.key === "/" && state.ui === "explore") { e.preventDefault(); $("search").focus(); return; }
    if (state.ui !== "step") return;
    if (e.key === "ArrowRight") setStep(state.step + 1);
    if (e.key === "ArrowLeft") setStep(state.step - 1);
  });
  $("levels").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) { if (state.venue?.cptModel && state.playing) stopPlay(); setLevel(b.dataset.level); }
  });
}

// --- the four states: explore -> landmark -> route -> step ---------------------------------------------------
function setUI(ui) {
  state.ui = ui;
  syncRouteScene();
  if (ui === "explore" || ui === "landmark") {
    const hadStop=Boolean(thirdPlace);
    clearThirdPlace();
    if(hadStop && !state.venue?.exterior)selectRoute();
  }
  thirdPlaceControl($("third-place-slot"),$("add-stop"),ui==="route");
  document.body.dataset.ui = ui;
  panelEl.classList.remove("collapsed");
  const id = state.venue?.area || state.venue?.id;
  const hash = ui === "explore" || !id ? "" : `#${id}${ui === "route" ? "/route" : ui === "step" ? `/step-${state.step + 1}` : ""}`;
  if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname + location.search);
  for (const b of $("chips").children) b.setAttribute("aria-current", String(b.dataset.id === id));
  // back from the steps of a route that starts under the street: the street plan, with the whole route on it
  if (stationLevels() && ui !== "step") setLevel(stationLevels().street, false);
  else applyFilters();
  updatePadding();
}
function goBack() {
  stopPlay();
  if (state.ui === "step") { endSession(); return showRoute(); }
  if (state.ui === "landmark") return showOverview();
  if (state.ui !== "route") return;
  setSeeThrough(false, { move: false });
  setUI("landmark");
  if (state.is3d) map.easeTo({ ...viewExterior(state.venue), duration: 1000 });
  else map.easeTo({ center: state.venue.center, zoom: 17.2, ...VIEW_2D, duration: 900 });
}
// S2: the whole route on screen (in 3D through the see-through shell)
function showRoute({ animate = true } = {}) {
  stopPlay();
  setUI("route");
  if (state.step !== 0) setStep(0); // the overview starts at the beginning: the figure and dot stand at the start
  frameRoute(animate);
}
function frameRoute(animate = true) {
  const r = state.route;
  if (!r?.steps) return;
  if (state.is3d) {
    if (!landmark.seeThrough && !state.exploded) setSeeThrough(true, { move: false });
    if(continuation?.length){
      const points=r.path.map(id=>nodes[id]?.lonlat).filter(Boolean);
      const bounds=points.reduce((b,p)=>b.extend(p),new maplibregl.LngLatBounds(points[0],points[0]));
      map.fitBounds(bounds,{maxZoom:17.7,padding:70,duration:animate?900:0});
      return;
    }
    map.easeTo({ ...viewInside(state.venue), duration: animate ? 1000 : 0 });
    return;
  }
  const pts = r.path.map((id) => nodes[id]?.lonlat).filter(Boolean);
  const b = pts.reduce((bb, q) => bb.extend(q), new maplibregl.LngLatBounds(pts[0], pts[0]));
  map.fitBounds(b, { maxZoom: 18.4, bearing: VIEW_2D.bearing, pitch: 0, duration: animate ? 900 : 0, padding: 40 });
}
// S3: one step at a time (Preview plays through them)
function startSteps(i = 0, { play = false } = {}) {
  if (!state.route?.steps || (thirdPlace&&!continuation)) return;
  state.step = Math.max(0, Math.min(state.route.steps.length - 1, i));
  setUI("step");
  if (state.is3d && !landmark.seeThrough && !state.exploded) setSeeThrough(true, { move: false });
  setStep(state.step);
  if (play) startPlay();
}
function toggleOption(inputId, buttonId) {
  $(inputId).checked = !$(inputId).checked;
  $(buttonId).setAttribute("aria-pressed", String($(inputId).checked));
  selectRoute();
}
function pickTarget(id) {
  $("to").value = id;
  selectRoute();
}

// --- details on demand: one sheet (phones) / drawer (wider screens), one pane at a time ----------------------
function openSheet(kind) {
  const pane = $("sheet").querySelector(`[data-pane="${kind}"]`);
  if (!pane) return;
  for (const p of $("sheet").querySelectorAll("[data-pane]")) p.hidden = p !== pane;
  $("sheet-title").textContent = kind === "from" && state.back ? "Back to" : pane.dataset.title;
  if (kind === "steps") $("steps").children[state.step]?.scrollIntoView({ block: "nearest" });
  if (kind === "from") openEntrances();
  if (kind === "display") syncDisplay();
  $("sheet").hidden = false;
  $("scrim").hidden = false;
  document.body.classList.add("has-sheet");
  updatePadding();
  $("sheet-close").focus({ preventScroll: true });
}
function closeSheet() {
  if ($("sheet").hidden) return;
  $("sheet").hidden = true;
  $("scrim").hidden = true;
  document.body.classList.remove("has-sheet");
  updatePadding();
}
const basisTag = (rs) => (rs ? `<span class="basis-tag" data-basis="${rs.basis === "scenario" ? "scenario" : "public"}">${
  rs.basis === "scenario" ? "Scenario" : "Public sources"}</span>` : "");
const routeSet = (t) => routes.route_sets?.find((x) => x.id === t?.route_set);
// S1 shows one choice per route set (SUMMIT / office visit); a venue without sets lists its places
function landmarkChoices() {
  const cur = $("to").value;
  if (!routes.route_sets?.length) return routes.targets;
  return routes.route_sets.map((rs) => {
    const ts = routes.targets.filter((t) => t.route_set === rs.id);
    return ts.find((t) => t.id === cur) || ts.find((t) => t.id === state.venue.target) || ts.find((t) => !/restroom/i.test(t.name)) || ts[0];
  }).filter(Boolean);
}
function renderChoices() {
  const cur = $("to").value;
  $("dests").innerHTML = landmarkChoices().map((t) => {
    const rs = routeSet(t);
    const title = rs && routes.route_sets.length > 1 ? rs.name : t.name;
    const sub = rs && routes.route_sets.length > 1 ? `${t.name} · ${levels[t.level].name}` : levels[t.level].name;
    return `<button type="button" role="radio" aria-checked="${t.id === cur}" data-id="${t.id}"><span class="t"><b>${esc(title)}</b><small>${
      esc(sub)}</small></span>${basisTag(rs)}</button>`;
  }).join("");
  // the To sheet: every place, grouped by route set
  const row = (t) => `<button type="button" role="radio" aria-checked="${t.id === cur}" data-id="${t.id}"><span class="t"><b>${
    esc(t.name)}</b><small>${esc(levels[t.level].name)}</small></span>${basisTag(routeSet(t))}</button>`;
  $("targets").innerHTML = routes.route_sets?.length
    ? routes.route_sets.map((rs) => `<p class="group">${esc(rs.name)}</p>${routes.targets.filter((t) => t.route_set === rs.id).map(row).join("")}`).join("")
    : routes.targets.map(row).join("");
}
// the From sheet: the entrances this building's routes start from (and any picked on the map), by station
function renderEntrances() {
  const cur = $("from").value, badge = +$("badge").checked, acc = +$("accessible").checked;
  const rest = [$("to").value, badge, acc, +state.back].join("|");
  const ranked = new Map((exits?.rank?.[`${$("to").value}|${badge}|${acc}`] || []).map((x) => [x.eid, x]));
  const rows = [], modelled = new Set();
  for (const e of Object.values(exits?.entrances || {})) {
    if (e.modeled_start) modelled.add(e.modeled_start);
    const r = e.modeled_start ? routes.routes[`${e.modeled_start}|${rest}`] : entranceRoutes?.[`${e.eid}|${rest}`];
    if (!r && !e.modeled_start) continue; // an in-building passage whose indoor link is not modelled
    const rk = ranked.get(e.eid);
    rows.push({ value: e.modeled_start || `eid:${e.eid}`, station: e.station, complex: String(e.complex_id), lines: stationOf(e.complex_id)?.routes || e.lines,
      name: e.desc, glyph: e.glyph, kind: GLYPH_WORD[e.glyph] || e.type,
      street: rk ? (rk.underground ? "stays underground" : `${rk.street_m} m on the street`) : "", r });
  }
  // starts not tied to an MTA entrance (a passage inside Grand Central)
  for (const st of routes.starts) {
    if (!modelled.has(st.id)) rows.push({ value: st.id, station: st.station || "Start", complex: String(st.complex_id ?? st.id), lines: st.lines,
      name: st.desc || cap(st.name), glyph: st.platform ? "stair" : "passage", kind: st.platform ? "Includes the way through the station" : "", street: "",
      platform: st.platform, r: routes.routes[`${st.id}|${rest}`] });
  }
  const usable = (x) => x.r && !x.r.blocked;
  // one short reason on a row that cannot be chosen
  const whyNot = (x) => {
    const b = x.r?.blocked || "";
    if (/exit-only/.test(b)) return `${x.kind} · exit only, you cannot go in here`;
    if (/entry-only/.test(b)) return `${x.kind} · entry only, you cannot come up here`;
    if (state.venue?.cptModel && b) return b;
    if (acc && x.glyph !== "elevator") return `${x.kind || "Stairs"} · not step-free`;
    return b || "No route for this choice";
  };
  const time = (x) => (usable(x) ? x.r.total_s : Infinity);
  const groups = new Map();
  for (const x of rows) { if (!groups.has(x.complex)) groups.set(x.complex, []); groups.get(x.complex).push(x); }
  // a start on the platform is the whole trip, so it comes first and is not compared with street entrances
  for (const g of groups.values()) g.sort((a, b) => (b.platform ? 1 : 0) - (a.platform ? 1 : 0) || time(a) - time(b));
  const order = [...groups.entries()].sort(([a, ga], [b, gb]) => (a === String(state.routeStation) ? -1 : b === String(state.routeStation) ? 1 : time(ga[0]) - time(gb[0])));
  const min = (sec) => Math.max(1, Math.round(sec / 60));
  $("starts").innerHTML = order.map(([, g]) => {
    const best = time(g.find((x) => !x.platform) || g[0]);
    return `<p class="group">${esc(g[0].station)} ${g[0].lines ? bulletsHtml(g[0].lines) : ""}</p>` + g.map((x, i) => {
      const on = x.value === cur;
      const sub = usable(x) ? [x.kind, x.street].filter(Boolean).join(" · ") : whyNot(x);
      const note = !usable(x) ? "" : x.platform ? "whole trip" : time(x) === best ? "fastest" : time(x) - best < 45 ? "about the same" : `+${min(time(x) - best)} min`;
      return `<button type="button" class="entrance" role="radio" aria-checked="${on}" data-id="${esc(x.value)}"${usable(x) ? "" : " disabled"}>
        <span class="gl ${esc(x.glyph)}" aria-hidden="true"></span>
        <span class="ds"><b>${esc(cap(x.name))}</b>${on ? '<span class="tag">Your route</span>' : ""}<small>${esc(sub)}</small></span>
        <span class="tm">${usable(x) ? `${x.r.scenario_demo ? "Scenario" : min(time(x)) + " min"}<small>${esc(note)}</small>` : ""}</span></button>`;
    }).join("");
  }).join("");
  $("from-hint").textContent = state.venue?.id === "grand-central" ? "Choose a subway or rail platform, or a terminal connection." : state.back ? "Choose the subway entrance you go back to, here or on the map."
    : "Choose the subway entrance you come up at, here or on the map.";
  const hidden = exits?.skipped?.length || 0;
  $("from-note").textContent = state.venue?.cptModel ? "Choose a modeled island platform. The northbound route uses station elevators and the southbound route uses stairs. No travel-time estimate is provided." : `${routes.starts.some((s) => s.platform) ? "Street entrances: walking" : "Walking"} time from the street entrance; time inside the station is not included.${
    hidden ? ` ${hidden} in-building entrance${hidden > 1 ? "s are" : " is"} not listed: where they lead indoors is not modelled.` : ""}`;
}
async function openEntrances() {
  if (exits && !entranceRoutes) $("starts").innerHTML = '<p class="detail">Loading entrances…</p>';
  await ensureEntranceRoutes();
  renderEntrances();
}
// Routes from every entrance, and the points they use, loaded the first time they are needed
async function ensureEntranceRoutes() {
  if (entranceRoutes || !exits) return entranceRoutes;
  const v = state.venue, dir = `data/venues/${v.id}/`;
  const [er, extra] = await Promise.all([loadJSON(`${dir}entrance-routes.json`).catch(() => null), loadJSON(`${dir}entrance-nodes.json`).catch(() => [])]);
  if (state.venue !== v) return null; // switched building meanwhile
  for (const n of extra) nodes[n.id] ??= n;
  entranceRoutes = er;
  return er;
}
// Choosing an entrance is the answer to "from where": the route shows on the map straight away
async function chooseEntrance(value) {
  closeSheet();
  if (value.startsWith("eid:")) { if (!(await routeFromEntrance(+value.slice(4)))) return; }
  else { $("from").value = value; selectRoute(); }
  if (state.ui === "landmark") showRoute();
}

function populateVenueControls(cfg) {
  // the route model: starts grouped by station (each option describes the entrance itself), and the destinations
  const groups = new Map();
  for (const s of routes.starts) {
    const k = s.complex_id ?? s.id;
    if (!groups.has(k)) groups.set(k, { label: s.station ? `${s.station} · ${s.lines}` : "Start", starts: [] });
    groups.get(k).starts.push(s);
  }
  $("from").innerHTML = [...groups.entries()].map(([k, g]) => `<optgroup label="${esc(g.label)}" data-complex="${esc(k)}">${g.starts.map((s) =>
    `<option value="${s.id}" title="${esc(cap(s.name))}">${esc(s.desc || cap(s.name))}${s.step_free ? " · step-free" : ""}</option>`).join("")}</optgroup>`).join("");
  $("to").innerHTML = routes.targets.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
  $("to").value = cfg.target;
  if (cfg.area === "oculus") {
    const rest = [cfg.target, +$("badge").checked, +$("accessible").checked, +state.back].join("|");
    const start = routes.starts.find(s => routes.routes[`${s.id}|${rest}`]?.steps?.length > 1);
    if (start) $("from").value = start.id;
  }
  for (const [input, btn] of [["badge", "opt-badge"], ["accessible", "opt-free"]]) $(btn).setAttribute("aria-pressed", String($(input).checked));
  $("lm-name").textContent = cfg.name;
  $("lm-sub").textContent = cfg.area ? cfg.sub : landmarkMeta[cfg.id]?.address || "";
  const order = Object.values(levels).sort((a, b) => b.ordinal - a.ordinal);
  $("levels").innerHTML = order.map((l) => `<button type="button" data-level="${l.id}" title="${esc(l.name)}">${esc(l.short_name)}</button>`).join("");
}

function selectRoute({keepContinuation=false}={}) {
  if (state.venue?.exterior) return; // exterior-only landmark: no routes yet
  const from = $("from").value;
  const rest = [$("to").value, +$("badge").checked, +$("accessible").checked, +state.back].join("|");
  // a start picked on the map ("eid:<n>") routes from that entrance; listed starts use routes.json
  const baseRoute = from.startsWith("eid:") ? entranceRoutes?.[`${from.slice(4)}|${rest}`] : routes.routes[`${from}|${rest}`];
  if(!keepContinuation && thirdPlace){continuation=null;continuationFeatures=[];map.getSource("venue").setData(venue);}
  const r = baseRoute?.steps ? appendContinuation(baseRoute) : baseRoute;
  if(continuationFeatures.length)map.getSource("venue").setData({...venue,features:[...venue.features,...continuationFeatures]});
  state.baseRoute=baseRoute;
  state.route = r;
  setPlayButtons(state.playing);
  if(!keepContinuation&&thirdPlace&&state.ui==="route")queueMicrotask(()=>chooseThirdDestination(thirdPlace));
  const picked = from.startsWith("eid:") ? exits.entrances[from.slice(4)] : null;
  const st = picked ? { station: picked.station, lines: stationOf(picked.complex_id)?.routes || picked.lines }
    : routes.starts.find((x) => x.id === from);
  const target = routes.targets.find((t) => t.id === $("to").value);
  // the trip: arriving runs station -> place, leaving place -> station (the same two choices, swapped); the station
  // line also names the entrance, so a choice of entrance shows
  const station = st?.station || cap(st?.name || "Start"), place = target?.name || "";
  const where = picked ? `${cap(picked.desc)} · ${(GLYPH_WORD[picked.glyph] || "entrance").toLowerCase()}` : st?.station && st?.desc ? cap(st.desc) : "";
  const stationHtml = `<b>${esc(station)}</b>${where ? `<small>${esc(where)}</small>` : ""}`;
  $("trip-from").innerHTML = state.back ? `<b>${esc(place)}</b>` : stationHtml;
  $("trip-to").innerHTML = state.back ? stationHtml : `<b>${esc(place)}</b>`;
  $("trip-from-k").textContent = "From";
  $("trip-to-k").textContent = state.back ? "Back to" : "To";
  const ends = document.querySelectorAll(".trip .end");
  ends[0].dataset.open = state.back ? "to" : "from";
  ends[1].dataset.open = state.back ? "from" : "to";
  $("lm-from-k").textContent = state.back ? "Back to" : "From";
  $("lm-from").innerHTML = `<span>${esc(station)} ${st?.lines ? bulletsHtml(st.lines) : ""}</span>${where ? `<small>${esc(where)}</small>` : ""}`;
  renderChoices();
  if ($("sheet").querySelector('[data-pane="from"]').hidden === false && !$("sheet").hidden) renderEntrances();
  showRouteSet(target?.route_set);
  stopPlay();
  if (!r || r.blocked) {
    // blocked: e.g. MTA marks this entrance entry-only or exit-only
    state.summary = r?.blocked || "No route for this combination";
    $("rt-time").textContent = "No route";
    $("rt-split").textContent = "";
    $("rt-note").hidden = false;
    $("rt-note").removeAttribute("data-basis");
    $("rt-note").textContent = state.summary;
    $("show-route").textContent = "No route for this choice";
    for (const id of ["show-route", "start", "play"]) $(id).disabled = true;
    for (const src of ["route-lines", "route-solids", "route-points"]) map.getSource(src).setData(EMPTY);
    station3d.setRoute([]);
    $("segments").innerHTML = $("steps").innerHTML = $("rt-meter").innerHTML = "";
    clearWalker();
    return;
  }
  for (const id of ["show-route", "start", "play"]) $(id).disabled = false;
  const f = routeFeatures(r);
  map.getSource("route-lines").setData(f.lines);
  map.getSource("route-solids").setData(f.solids);
  map.getSource("route-points").setData(f.points);
  station3d.setRoute(f.station);
  setContinuationLine(f.extension);
  const min = (sec) => Math.max(1, Math.round(sec / 60));
  const t = r.time, lo = min(t.low_s), hi = min(t.high_s);
  const time = r.scenario_demo ? "Scenario route" : `${lo === hi ? lo : `${lo}–${hi}`} min`, n = r.steps.length;
  state.summary = `${time} · ${n} steps`;
  $("rt-time").textContent = continuation?.length ? "Route with a stop" : time;
  // where the time goes: walking is predictable, lift waits and desks are what make the range wide
  $("rt-split").textContent = continuation?.length || r.scenario_demo ? "" : [["walk", t.walk_s], ["lift", t.wait_s + t.ride_s], ["desk", t.service_s]]
    .filter(([, sec]) => sec > 0).map(([k, sec]) => `${k} ${sec < 60 ? "<1" : min(sec)}`).join(" · ");
  $("show-route").textContent = continuation?.length ? "Show route with a stop" : `Show route · ${time}`;
  const ev = continuation?.length ? null : r.evidence;
  if (ev) {
    const a = ev.action, pct = (k) => `${(100 * a[k]) / n}%`;
    $("rt-meter").innerHTML = `<span class="bar" aria-hidden="true"><span style="width:${pct("official")}"></span><span style="width:${
      pct("rebuilt")}"></span><span style="width:${pct("scenario")}"></span></span>${a.official} of ${n} steps from official sources`;
    const box = (k, c) => `<div><span class="k">${k}</span>${TIERS.map((x) => `<span class="tier" data-tier="${x.id}">${c[x.id]} ${
      esc(x.label.toLowerCase())}</span>`).join("")}</div>`;
    $("ev-route").innerHTML = box("What you do", ev.action) + box("Where", ev.place);
  } else $("rt-meter").innerHTML = $("ev-route").innerHTML = "";
  journey = buildJourney(r);
  // S2: the route as places (a level, or the lift between two); tap one to start there
  $("segments").innerHTML = journey.map((j) => {
    const lvl = levels[j.level];
    const from = j.via && levels[r.steps[Math.max(0, j.via.step - 1)].level];
    const floors = from ? Math.abs(lvl.ordinal - from.ordinal) : 0;
    const name = j.via ? `${cap(j.via.kind)} to ${lvl.name}` : lvl.name;
    // Levels of a station are not storeys (Herald Sq has five between two points 27 ft apart): give the real rise
    const rise = from && (lvl.ordinal < 0 || from.ordinal < 0) && lvl.elev !== from.elev ? `${Math.round(Math.abs(lvl.elev - from.elev) / 0.3048)} ft ${lvl.elev > from.elev ? "up" : "down"}` : "";
    const sub = rise || (j.via && floors > 1 ? `${floors} floors` : j.dist ? `walk ${Math.round(j.dist)} m` : `${j.last - j.first + 1} step${j.last > j.first ? "s" : ""}`);
    return `<li><button type="button" data-step="${j.first}"><span class="dot" aria-hidden="true"></span><span class="t"><b>${esc(name)}</b><small>${
      esc(sub)}</small></span><span class="mono">${esc(lvl.short_name)}</span></button></li>`;
  }).join("");
  $("steps").innerHTML = r.steps.map((s, i) =>
    `<li data-i="${i}"><span class="lvl">${esc(levels[s.level].short_name)}</span><span>${tierDot(s)}${esc(s.text)}${
      s.photo != null ? ' <span class="has-photo" title="Photo of this spot">📷</span>' : ""}</span></li>`).join("");
  $("steps").onclick = (e) => { const li = e.target.closest("li"); if (li) { closeSheet(); startSteps(+li.dataset.i); } };
  markRouteExit(r);
  updateExitHints();
  for(const b of $("levels").querySelectorAll("[data-continuation-level]"))b.remove();
  for(const id of continuationLevelIds){
    const button=document.createElement("button");
    button.type="button";button.dataset.level=id;button.dataset.continuationLevel="";
    button.textContent=levels[id].short_name;button.title=levels[id].name;
    $("levels").append(button);
  }
  const used = new Set(r.steps.map((s) => s.level));
  for (const b of $("levels").children) {
    b.classList.toggle("on-route", used.has(b.dataset.level));
    // Levels this route does not stop on, on a long list, stay out of the picker: they are in 3D and on the floors page
    b.hidden = Boolean(state.venue?.pickerSkips?.includes(b.dataset.level)) && !used.has(b.dataset.level);
  }
  // a new start, destination, option or direction is a new route: back to its first step, at its entrance
  endSession();
  setStep(0);
  if (state.ui === "route") frameRoute();
}

function setStep(i) {
  const r = state.route;
  if (!r?.steps) return;
  const n = r.steps.length;
  state.step = Math.max(0, Math.min(n - 1, i));
  routeFraction = 0;
  const s = r.steps[state.step];
  paintStep();
  // S3: which place you are in, how far along, the instruction, and how we know it
  const j = journey.find((x) => state.step >= x.first && state.step <= x.last) || journey[0];
  $("st-seg").textContent = j ? (j.via ? `${cap(j.via.kind)} to ${levels[j.level].name}` : levels[j.level].name) : "";
  $("st-count").textContent = `${state.step + 1} / ${n}`;
  $("st-progress").innerHTML = journey.map((x) => {
    const len = x.last - x.first + 1;
    const cls = state.step > x.last ? "done" : state.step >= x.first ? "on" : "";
    return `<span class="${cls}" style="flex:${len};--f:${(100 * (state.step - x.first + 1)) / len}%"></span>`;
  }).join("");
  $("st-text").textContent = s.text;
  $("st-meta").textContent = `${KIND_LABEL[s.kind] || s.kind} · ${levels[s.level].short_name}${s.distance_m ? ` · ${Math.round(s.distance_m)} m` : ""}`;
  const tip = state.step === 0 && !state.back ? state.exitTip : "";
  $("st-tip").hidden = !tip;
  $("st-tip").innerHTML = tip || "";
  renderPhoto(s);
  renderBasis(s);
  renderHandoff(s);
  $("prev").disabled = state.step === 0;
  $("next").textContent = state.step === n - 1 ? "Done" : "Next";
  for (const li of $("steps").children) li.removeAttribute("aria-current");
  $("steps").children[state.step]?.setAttribute("aria-current", "step");
  setLevel(stationLevels() && state.ui !== "step" ? stationLevels().street : s.level, false);
  if (!state.playing) placeWalker();
  syncRouteScene();
  if (state.ui !== "step") return;
  // in 3D, follow the route between the station under the street and the building
  const under = Boolean(levels[s.level]?.underground);
  const closeLevel = state.venue?.floorView?.[s.level] ? s.level : null; // and to a floor modelled inside, or back from it
  if (!routeSceneConfig() && (under !== state.wasUnder || closeLevel !== state.wasClose) && state.is3d && !state.exploded && (stationCenter || closeLevel)) map.easeTo({ ...viewInside(state.venue), duration: 1000 });
  state.wasUnder = under;
  state.wasClose = closeLevel;
  history.replaceState(null, "", `#${state.venue.area || state.venue.id}/step-${state.step + 1}`);
  if (!routeSceneConfig()) followPaused = false;
  if (state.venue.cptModel && state.is3d && s.level === "G") {
    map.easeTo({center:nodes[s.nodes[0]].lonlat,zoom:18.1,bearing:state.venue.bearing,pitch:48,duration:state.playing?250:600});
  } else if (s.continuation && state.is3d) {
    map.easeTo({center:nodes[s.nodes.at(-1)].lonlat,zoom:18.5,pitch:55,duration:state.playing?220:550});
  } else if (!routeSceneConfig() && !state.is3d && !state.playing) frameStep(s);
}

// --- step photos (data/photos.json via routes.json) ------------------------------------
// A few key points per landmark only: the subway exit, a corner with a view of the landmark, the entrance. Openly
// licensed photos from Wikimedia Commons, shown with author and licence; loaded only when their step is shown.
function renderPhoto(s) {
  const p = s.photo != null ? routes.photos?.[s.photo] : null;
  for (const id of ["st-thumb", "st-credit", "src-photo"]) $(id).hidden = !p;
  if (!p) { $("st-img").removeAttribute("src"); $("src-img").removeAttribute("src"); return; }
  if ($("st-img").getAttribute("src") !== p.thumb) {
    $("st-img").src = p.thumb;
    $("src-img").src = p.thumb;
    $("src-img").width = 500;
    $("src-img").height = Math.round((500 * p.height) / p.width);
  }
  $("st-img").alt = $("src-img").alt = p.caption;
  const lic = p.licence_url ? `<a href="${esc(p.licence_url)}" target="_blank" rel="noopener">${esc(p.licence)}</a>` : esc(p.licence);
  const credit = `Photo: <a href="${esc(p.page)}" target="_blank" rel="noopener">${esc(p.author || "Wikimedia Commons contributor")}</a>${
    p.date ? `, ${esc(p.date.slice(0, 4))}` : ""} · ${lic} · Wikimedia Commons`;
  $("st-credit").innerHTML = credit;
  $("src-cap").innerHTML = `${esc(p.caption)}<br>${credit}`;
}

// --- evidence ------------------------------------------------------------------------
const tierDot = (s) => s.evidence
  ? `<span class="tier-dot" data-tier="${s.evidence.action}" title="What you do: ${esc(TIER[s.evidence.action].long)}"></span>` : "";

/** The current step's evidence: what you do and where, with the references and open questions behind it. */
function renderBasis(s) {
  const ev = s.evidence;
  $("st-mark").hidden = !ev;
  if (!ev) { $("src-tiers").innerHTML = $("src-detail").innerHTML = ""; return; }
  $("st-mark").textContent = { official: "Official", rebuilt: "Rebuilt", scenario: "Scenario" }[ev.action];
  $("st-mark").dataset.tier = ev.action;
  $("st-mark").setAttribute("aria-label", `What you do: ${TIER[ev.action].long}. How we know this step`);
  $("src-tiers").innerHTML = [["What you do", ev.action], ["Where", ev.place]].map(([k, t]) =>
    `<div><span class="k">${k}</span><span class="tier" data-tier="${t}">${esc(TIER[t].label)}</span><small>${esc(TIER[t].long)}</small></div>`).join("");
  const refs = new Map((routes.references || []).map((r) => [r.id, r]));
  const items = ev.refs.map((id) => refs.get(id)).filter(Boolean);
  $("src-detail").innerHTML =
    (ev.notes.length ? `<ul>${ev.notes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "") +
    (items.length ? `<p>Sources:</p><ul>${items.map((r) => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${
      esc(r.title)}</a> · ${esc(r.publisher)} (checked ${esc(r.accessed)})</li>`).join("")}</ul>`
      : `<p>${ev.action === "scenario" && ev.place === "scenario" ? "No public source: this step is assumed."
        : "Sources for this building are not itemised yet; see the building note."}</p>`);
}

/** Where a route ends (or starts) at a connection modelled in the neighbouring building (Grand Central <->
 * One Vanderbilt), offer that building's part of the journey, same direction. */
function renderHandoff(s) {
  const btn = $("handoff");
  const end = (s.kind === "arrive" || s.kind === "start") && nodes[s.nodes[0]];
  const h = end?.handoff;
  const other = h && VENUES.find((v) => v.id === h.venue);
  btn.hidden = !other;
  if (!other) return;
  btn.textContent = s.kind === "arrive" ? `Continue in ${other.name} →` : `← Previous part: ${other.name}`;
  btn.onclick = () => followHandoff(h);
}
async function followHandoff(h) {
  const back = state.back;
  stopPlay();
  await selectVenue(h.venue, { ui: "route" });
  // the connection is a start (From) in one building and a place (To) in the other
  if (nodes[h.node]?.kind === "subway") $("from").value = h.node;
  else $("to").value = h.node;
  setDirection(back);
  showRoute();
}

/** Notice under the destination: which route set this is and how far its sources go. */
function showRouteSet(id) {
  const rs = routes.route_sets?.find((x) => x.id === id);
  // only a scenario needs saying up front; public sources are behind the evidence meter
  const note = $("rt-note");
  note.hidden = rs?.basis !== "scenario";
  if (!note.hidden) {
    note.dataset.basis = "scenario";
    note.innerHTML = `<b>${esc(rs.name)} · scenario.</b> ${esc(rs.note)}`;
  }
  // a building badge means nothing at a ticketed attraction
  const noBadge = id === "summit" || Boolean(rs?.hide_badge);
  $("opt-badge").hidden = noBadge;
  if (noBadge) { $("badge").checked = false; $("opt-badge").setAttribute("aria-pressed", "false"); }
}

// Color the route by step: done, current, upcoming
function paintStep() {
  const cur = state.step;
  const c = ["case", ["==", ["get", "step"], cur], ROUTE.current, ["<", ["get", "step"], cur], ROUTE.done, ROUTE.next];
  map.setPaintProperty("route-line", "line-color", c);
  map.setPaintProperty("route-line", "line-width", ["case", ["==", ["get", "step"], cur], 7, 5]);
  map.setPaintProperty("route-casing", "line-width", ["case", ["==", ["get", "step"], cur], 11, 8]);
  map.setPaintProperty("route-solids", "fill-extrusion-color", c);
  map.setPaintProperty("route-points", "circle-color", c);
  station3d.setStep(cur);
  continuationLine?.setStep(cur);
  // Current step on top where legs overlap (e.g. walking back from the visitor desk)
  const sortKey = ["case", ["==", ["get", "step"], cur], 1000, ["-", 0, ["get", "step"]]];
  map.setLayoutProperty("route-line", "line-sort-key", sortKey);
  map.setLayoutProperty("route-casing", "line-sort-key", sortKey);
}

function frameStep(s) {
  const pts = s.nodes.map((id) => nodes[id].lonlat);
  const b = pts.reduce((bb, p) => bb.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0]));
  map.fitBounds(b, { maxZoom: 19.2, bearing: stepBearing(s), pitch: 0, duration: 700, padding: 60 });
}

// 3D floors: the current one in full colour, the others faded, so the floor you stand on reads at a glance
const slabColor = () => ["case", ["==", ["get", "level"], state.level], $("prov").checked ? SOURCE_COLOR : UNIT_COLOR, T.slabFaded];
function setLevel(id, frame = true) {
  state.level = id;
  station3d.setLevel(id);
  towers3d.setCurrent(state.venue?.floors?.[id]);
  map.setPaintProperty("indoor-slabs", "fill-extrusion-color", slabColor());
  for (const b of $("levels").children) b.setAttribute("aria-pressed", String(b.dataset.level === id));
  applyFilters();
  if (frame && state.venue?.cptModel) {
    const point = nodes[state.venue.floorView[id]?.node]?.lonlat
      || state.route?.path.map(key=>nodes[key]).find(n=>n.level===id)?.lonlat || state.venue.center;
    const view = !state.is3d ? {center:point,zoom:18.8,...VIEW_2D}
      : id==="G" ? {center:point,zoom:18.1,bearing:state.venue.bearing,pitch:48} : viewInside(state.venue);
    map.easeTo({...view,duration:550});
    return;
  }
  if (frame && (!state.is3d || id.startsWith("continuation:"))) map.easeTo({ center: id.startsWith("continuation:") ? Object.values(nodes).find(n=>n.level===id)?.lonlat||state.venue.center : state.venue.center, zoom: 18, duration: 500 });
}

function applyFilters() {
  if (pennMap?.active) return;
  continuationLine?.setVisible(state.is3d&&continuationSegments.length>0);
  const onLevel = ["==", ["get", "level"], state.level];
  const base = (types) => ["in", ["get", "feature_type"], ["literal", types]];
  // a station has no floor fill: only its halls and platform, with the street still readable around them
  map.setFilter("indoor-fill", ["all", ["any", base(["unit"]), ["all", base(["level"]), ["!", UNDERGROUND]]], onLevel]);
  map.setFilter("indoor-outline", ["all", base(["unit"]), onLevel]);
  map.setFilter("indoor-openings", ["all", base(["opening"]), ["!=", ["get", "category"], "turnstile"], onLevel]);
  map.setFilter("indoor-turnstiles", ["all", base(["opening"]), ["==", ["get", "category"], "turnstile"], onLevel]);
  map.setFilter("indoor-labels", ["all", onLevel, ROOM_LABEL_FILTER]);
  map.setFilter("indoor-pois", onLevel);
  map.setFilter("indoor-walls", ["all", base(["level"]), onLevel]);
  // before the steps, a route that starts under the street shows whole: station and street together
  const routeLevels = (continuation?.length || state.venue?.cptModel) && state.ui !== "step" ? null : stationLevels() && state.ui !== "step"
    ? ["in", ["get", "level"], ["literal", [...Object.values(stationLevels()), "between"]]] : onLevel;
  map.setFilter("route-line", routeLevels);
  map.setFilter("route-casing", routeLevels);
  map.setFilter("walker", routeLevels);
  map.setFilter("route-points", routeLevels);

  const show2d = state.is3d ? "none" : "visible", show3d = state.is3d ? "visible" : "none";
  // Circles and labels sit on the ground plane, so they only make sense in the flat 2D view
  for (const id of ["indoor-fill", "indoor-outline", "indoor-walls", "indoor-openings", "indoor-turnstiles", "indoor-labels", "indoor-pois",
    "route-line", "route-casing", "route-points"]) {
    const hideLabel = state.ui === "step" && ["indoor-labels", "indoor-pois"].includes(id);
    map.setLayoutProperty(id, "visibility", state.ui === "explore" || hideLabel ? "none" : show2d);
  }
  // In 3D the floors and route only show once the tower is see-through
  const inside = state.ui !== "explore" && state.is3d && (landmark?.seeThrough || state.exploded) ? "visible" : "none";   // (landmark?: the mode may change before the first landmark has loaded, on a slow line)
  for (const id of ["indoor-slabs", "route-solids"]) map.setLayoutProperty(id, "visibility", inside);
  // the same floor plates the towers layer draws: under the street they would only block the view of the station
  if (state.venue?.cptModel || (state.venue?.floors && levels[state.level]?.underground && !state.exploded)) map.setLayoutProperty("indoor-slabs", "visibility", "none");
  const hyOld = Boolean(RETIRED[state.venue?.id]);               // the first version's station and floors of a retired venue: never shown
  for (const P of Object.values(V2)) P.world.setVisible(state.is3d);
  station3d.setVisible(inside === "visible" && Boolean(stationModel) && !hyOld);
  // under the street the towers would stand between you and the station
  towers3d.setVisible(!hyOld && inside === "visible" && Boolean(floorsModel && state.venue?.floors) && (state.venue?.cptModel || state.exploded || !levels[state.level]?.underground ||
    (["chrysler","empire-state"].includes(state.venue?.id) && state.ui === "landmark")));
  towers3d.setCutaway(closeFloor()); // on a floor modelled inside, what stands above it steps aside
  // The detailed model replaces the plain extrusion in 3D; 2D keeps the flat footprint
  map.setLayoutProperty("target-3d", "visibility", state.venue?.cptModel && state.ui === "step" ? "none" : show2d);
  // under the street the city would stand between you and the route
  map.setPaintProperty("buildings-3d", "fill-extrusion-opacity", state.is3d ? FOCUS.cityOpacity : CITY_OPACITY);
  syncLandmarks(); // exploded floors no longer sit inside the real shell
  // map controls appear only where they mean something: floors and the inside views belong to a route
  const onRoute = state.ui === "route" || state.ui === "step";
  $("levels").hidden = (state.is3d && !continuation?.length && !state.venue?.cptModel) || !onRoute;
  $("xray").hidden = !state.is3d || !onRoute || state.exploded;
  $("explode").hidden = !state.is3d || !onRoute || state.venue?.id === "empire-state";
  syncFloorsButton();
  $("heading").hidden = !onRoute;
  map.setLayoutProperty("walker", "visibility", show2d);
  walker3d.setVisible(inside === "visible" || (state.is3d && state.ui === "step" && routeSceneConfig())); // stands on the 3D route, so it shows when the route does
  // Street layers belong to the ground floor. While following the steps on another floor they hide (the floor plan is
  // about that floor); everywhere else they stay, because that is where you choose an entrance.
  const onGround = levels[state.level]?.ordinal === 0 || state.venue?.groundFloors?.includes(state.level);
  const street = !state.is3d && state.ui === "step" && !onGround ? "none" : "visible";
  map.setLayoutProperty("footways", "visibility", street);
  for (const id of ["subway-entrances", "route-exit"]) map.setLayoutProperty(id, "visibility", state.is3d ? "none" : street);
  syncEntranceHierarchy();
  // stations with their line bullets also show in 3D, except while following the steps or with floors spread apart
  const stationVisibility = state.is3d ? (state.ui === "step" || state.exploded ? "none" : "visible") : street;
  for (const layer of ["station-labels", "herald-station-point"]) map.setLayoutProperty(layer, "visibility", stationVisibility);
  // areas and underground lines are ground drawings: in 3D they would float under every building, so 2D only
  for (const id of ["station-areas", "station-area-lines", "entrance-labels", "exit-ranks", "exit-preview", ...UNDERGROUND_LAYERS]) {
    map.setLayoutProperty(id, "visibility", state.is3d ? "none" : street);
  }
}

function setMode(is3d, { move = true } = {}) {
  state.is3d = is3d;
  syncRouteScene();
  $("btn2d").setAttribute("aria-pressed", String(!is3d));
  $("btn3d").setAttribute("aria-pressed", String(is3d));
  const h = ["coalesce", ["get", "height_m"], 0];
  map.setPaintProperty("buildings-3d", "fill-extrusion-height", is3d && !state.exploded ? cityHeight() : 0);
  map.setPaintProperty("buildings-3d", "fill-extrusion-color", is3d ? FOCUS.city : T.city2d); // flat plan: a firmer grey
  setFocusLook(is3d);
  map.setPaintProperty("target-3d", "fill-extrusion-height", is3d ? h : 0);
  map.setPaintProperty("target-3d", "fill-extrusion-opacity", 0.35);
  applyFilters();
  if (!move) return;
  if (state.ui === "explore") return map.easeTo({ pitch: is3d ? 45 : 0, duration: 600 });
  if (state.ui === "route") return frameRoute();
  if (state.ui === "step") {
    if (routeSceneConfig()) return;
    if (!is3d) return frameStep(state.route.steps[state.step]);
    if (!landmark.seeThrough && !state.exploded) setSeeThrough(true, { move: false });
    return map.easeTo({ ...viewInside(state.venue), duration: 900 });
  }
  if (is3d) map.easeTo({ ...(landmark?.seeThrough ? viewInside(state.venue) : viewExterior(state.venue)), duration: 900 });
  else map.easeTo({ center: state.venue.center, zoom: 16.6, ...VIEW_2D, duration: 900 });
}

// Colour floors, doors and facilities by where their data comes from, with per-class counts
function applyProvenance() {
  const on = $("prov").checked;
  station3d.setEvidence(on);
  towers3d.setEvidence(on);
  map.setPaintProperty("indoor-fill", "fill-color", on ? SOURCE_COLOR : UNIT_COLOR);
  map.setPaintProperty("indoor-fill", "fill-opacity", on ? 0.55 : 0.95);
  map.setPaintProperty("indoor-slabs", "fill-extrusion-color", slabColor());
  for (const id of ["indoor-openings", "indoor-turnstiles"]) map.setPaintProperty(id, "line-color", on ? SOURCE_COLOR : OPENING_COLOR);
  $("prov-legend").hidden = !on;
  if (!on) return;
  // positions of floors, rooms, doors, desks and lifts (street graph nodes are counted separately)
  const items = [...venue.features.filter((f) => f.properties.feature_type !== "level").map((f) => f.properties),
    ...graph.nodes.filter((n) => !n.osm && !n.generated), ...graph.elevator_groups];
  const count = (t) => items.filter((x) => tierOf(x, "place") === t.id).length;
  $("prov-legend").innerHTML = `<ul>${TIERS.map((t) =>
    `<li><span class="sw" style="background:${t.color}"></span><span>${t.long}</span><span class="n">${count(t)}</span></li>`).join("")}</ul>
    <p>Colours show where each room, door and lift is placed from. Building footprint and height (NYC), subway entrances (MTA) and the exterior (${state.venue?.floors ? "traced floor by floor from a leasing deck and published plans" : "OSM, checked against NYC"}) are real data.</p>`;
}

// --- 3D floor labels ------------------------------------------------------------------
// Symbol layers sit on the ground, so floors are labelled with HTML placed at each slab's projected position.
function project(lonlat, altitude) {
  const m = projMatrix, c = maplibregl.MercatorCoordinate.fromLngLat(lonlat, altitude);
  const x = m[0] * c.x + m[4] * c.y + m[8] * c.z + m[12], y = m[1] * c.x + m[5] * c.y + m[9] * c.z + m[13];
  const w = m[3] * c.x + m[7] * c.y + m[11] * c.z + m[15];
  if (w <= 0) return null;
  const canvas = map.getCanvas();
  return { x: ((x / w + 1) / 2) * canvas.clientWidth, y: ((1 - y / w) / 2) * canvas.clientHeight };
}

function placeFloorLabels() {
  const box = $("floor-labels");
  const show = state.is3d && venue && projMatrix && (landmark?.seeThrough || state.exploded);
  if (!show) { if (box.childElementCount) box.innerHTML = ""; return; }
  const used = new Set(state.route?.steps?.map((s) => s.level) || []);
  const current = state.route?.steps?.[state.step]?.level;
  const labels = [];
  for (const f of venue.features) {
    const p = f.properties;
    if (p.feature_type !== "level") continue;
    // anchor on the outline corner furthest right on screen, at the floor's (real or exploded) height
    const pts = f.geometry.coordinates[0].map((c) => project(c, elevOf(p.level) + (p.ground || 0) + 1.5)).filter(Boolean);
    if (!pts.length) continue;
    const a = pts.reduce((best, q) => (q.x > best.x ? q : best));
    // keep the label on screen: a station's outline can run past the edge when you are close
    labels.push({ level: p.level, x: Math.min(a.x, map.getCanvas().clientWidth - 240), y: a.y });
  }
  // floors only metres apart (concourse vs lobby) would overlap: keep labels at least 24 px apart, top to bottom
  labels.sort((a, b) => a.y - b.y);
  labels.forEach((l, i) => { if (i && l.y < labels[i - 1].y + 24) l.y = labels[i - 1].y + 24; });
  box.innerHTML = labels.map((l) => {
    const cls = l.level === current ? "on" : used.has(l.level) ? "" : "off";
    return `<div class="floor-label ${cls}" style="left:${l.x.toFixed(1)}px;top:${l.y.toFixed(1)}px">` +
      `<b>${esc(levels[l.level].short_name)}</b>${esc(levels[l.level].name)}</div>`;
  }).join("");
}

// --- subway stations and entrances --------------------------------------------
const ENTRANCE_TEXT = { stair: "Stairs", elevator: "Street elevator (step-free from the street)",
  passage: "Entrance inside a building passage", house: "Station house" };
let popup = null, swappingPopup = false;
const UNDERGROUND_LAYERS = ["ug-tracks", "ug-passages", "ug-platforms", "ug-platform-labels"];
const UG_KIND = { "ug-tracks": "track", "ug-passages": "passage", "ug-platforms": "platform", "ug-platform-labels": "platform" };
const TYPE_COUNT = { stair: ["stair entrance", "stair entrances"], elevator: ["street elevator", "street elevators"],
  passage: ["in-building passage", "in-building passages"], house: ["station house", "station houses"] };

// Highlight one station: its entrances and area stay strong, every other station fades
function highlightStation(cid) {
  state.station = cid ?? null;
  const on = ["==", ["get", "complex_id"], cid ?? "__none__"];
  const fade = (strong, weak, none) => (cid == null ? none : ["case", on, strong, weak]);
  map.setPaintProperty("subway-entrances", "icon-opacity", fade(1, 0.3, 1));
  syncEntranceHierarchy();
  map.setPaintProperty("station-labels", "text-opacity", fade(1, 0.35, 1));
  map.setPaintProperty("station-labels", "icon-opacity", fade(1, 0.35, 1));
  map.setPaintProperty("station-areas", "fill-opacity", fade(0.22, 0.03, 0.08));
  map.setPaintProperty("station-area-lines", "line-opacity", fade(0.9, 0.15, 0.35));
  map.setPaintProperty("entrance-labels", "text-opacity", fade(1, 0.3, 1));
  for (const id of UNDERGROUND_LAYERS) map.setFilter(id, ["all", ["==", ["get", "kind"], UG_KIND[id]], on]);
}

function stationOf(cid) {
  return subway.stations.features.find((f) => f.properties.complex_id === cid)?.properties;
}

function openPopup(lngLat, html) {
  swappingPopup = true;  // replacing a card is not the user closing it
  popup?.remove();
  swappingPopup = false;
  // in 3D the card sits above the entrance pin
  popup = new maplibregl.Popup({ maxWidth: "280px", offset: state.is3d ? 34 : 14, className: "st-pop" }).setLngLat(lngLat).setHTML(html).addTo(map);
  popup.on("close", () => {
    if (swappingPopup) return;
    standaloneStation = false;
    browsedStation = null;
    syncFloorsButton();
    highlightStation(state.routeStation);
  }); // back to the route's station
}

// Station selection is distinct from the station highlighted by a route.
let browsedStation = null;
function syncEntranceHierarchy() {
  if (!map.getLayer("entrances-3d")) return;
  const visible = state.is3d && !state.exploded && !pennMap?.active;
  const onRoute = state.ui === "route" || state.ui === "step";
  map.setFilter("entrances-3d", ["==", ["to-string", ["get", "complex_id"]], browsedStation ?? ""]);
  map.setFilter("route-entrance-3d", ["==", ["get", "eid"], state.routeExit ?? -1]);
  map.setLayoutProperty("entrances-3d", "visibility", visible && !onRoute && browsedStation ? "visible" : "none");
  map.setLayoutProperty("route-entrance-3d", "visibility", visible && onRoute && state.routeExit >= 0 ? "visible" : "none");
}

function focusStation(p, center) {
  showStation(p, center);
  map.easeTo({ center, zoom: Math.max(map.getZoom(), state.is3d ? 16.8 : 16),
    padding: panelPadding(), retainPadding: false, duration: 750 });
}

async function show3dEntrance(p, center) {
  const station = stationOf(p.complex_id);
  if (!station) return;
  const flow = p.oneway === "exit-only" ? "Exit only" : p.oneway === "entry-only" ? "Entry only" : "Entry and exit";
  const preview = state.ui === "route" || state.ui === "step";
  openPopup(center, `<p class="pop-k">${preview ? "Route entrance" : "Subway entrance"}</p>
    <p class="pop-t">${esc(ENTRANCE_TEXT[p.glyph] || p.entrance_type)}</p>
    <p>${esc(station.station)} · ${flow}</p><div data-entrance-action></div>`);
  const card = popup;
  const selectedVenue = state.venue;
  const e = exits?.entrances?.[p.eid];
  const rest = [$("to").value, +$("badge").checked, +$("accessible").checked, +state.back].join("|");
  if (e && !e.modeled_start && !preview && !state.overview) await ensureEntranceRoutes().catch(() => null);
  if (popup !== card || !card.isOpen() || selectedVenue !== state.venue) return;
  const route = !e ? null : e.modeled_start ? routes.routes[`${e.modeled_start}|${rest}`] : entranceRoutes?.[`${p.eid}|${rest}`];
  const slot = card.getElement().querySelector("[data-entrance-action]");
  if (preview || state.overview || !route?.steps?.length) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ctl text";
  button.textContent = state.back ? "End here" : "Start here";
  button.onclick = async () => { if (await routeFromEntrance(p.eid)) showRoute(); };
  slot.append(button);
}

// Click an entrance: route from it (any entrance on the mapped street network), then show its card
async function showEntrance(p, lngLat) {
  const routed = await routeFromEntrance(p.eid);
  standaloneStation = standaloneStationModel(p.complex_id);
  if (routed && state.ui === "landmark") setUI("route"); // the card shows the route from here; the camera stays
  stationSelected = Boolean(stationViewerComplexes[state.venue?.id]?.includes(String(p.complex_id)));
  syncFloorsButton();
  const st = stationOf(p.complex_id);
  highlightStation(p.complex_id);
  const flow = p.oneway === "exit-only" ? "Exit only" : p.oneway === "entry-only" ? "Entry only" : "Entry and exit";
  const isExit = p.eid === state.routeExit;
  openPopup(lngLat, `<p class="pop-k">${isExit ? "Your exit · " : ""}Subway entrance</p>
    <p class="pop-t">${esc(st.station)}</p><p class="pop-b">${bulletsHtml(st.routes)}</p>
    <p>${esc(ENTRANCE_TEXT[p.glyph] || p.entrance_type)} · ${flow}</p>
    ${routed ? `<p class="pop-r">${state.back ? "Route to this entrance" : "Route from this entrance"}: ${esc(state.summary || "")}</p>`
      : `<p class="pop-r">${esc(unroutableReason(p))}</p>`}
    <p class="pop-m">1 of ${st.entrances} entrances to this station${p.constituent_station_name !== p.stop_name
      ? ` · ${esc(p.constituent_station_name)} platforms` : ""}. Source: MTA Subway Entrances and Exits 2024.</p>`);
}

function unroutableReason(p) {
  if (p.glyph === "passage") return "In-building passage: where it leads indoors is not modelled, so no route starts here.";
  return "Outside this building's mapped street area: pick an entrance closer to the building.";
}

// Make an entrance the route's start: a modelled start selects its option; any other entrance gets an option
// under its station's group in the From list. Returns false if no route can start there.
async function routeFromEntrance(eid) {
  const e = exits?.entrances?.[eid];
  if (!e) return false;
  stopPlay();
  if (e.modeled_start) {
    $("from").value = e.modeled_start;
  } else {
    await ensureEntranceRoutes();
    if (!entranceRoutes || !Object.keys(entranceRoutes).some((k) => k.startsWith(`${eid}|`))) return false;
    const value = `eid:${eid}`;
    if (![...$("from").options].some((o) => o.value === value)) {
      let group = [...$("from").querySelectorAll("optgroup")].find((g) => g.dataset.complex === String(e.complex_id));
      if (!group) {
        group = document.createElement("optgroup");
        group.dataset.complex = e.complex_id;
        group.label = `${e.station} · ${stationOf(e.complex_id)?.routes || e.lines}`;
        $("from").appendChild(group);
      }
      group.appendChild(new Option(e.desc, value));
    }
    $("from").value = value;
  }
  selectRoute();
  return true;
}

function showStation(p, lngLat) {
  browsedStation = String(p.complex_id);
  standaloneStation = standaloneStationModel(p.complex_id);
  stationSelected = Boolean(stationViewerComplexes[state.venue?.id]?.includes(String(p.complex_id)));
  syncFloorsButton();
  highlightStation(p.complex_id);
  const types = typeof p.types === "string" ? JSON.parse(p.types) : p.types; // GeoJSON feature props arrive stringified
  const parts = Object.entries(types).map(([k, n]) => `${n} ${(TYPE_COUNT[k] || [k, k])[n > 1 ? 1 : 0]}`);
  const constituents = typeof p.constituents === "string" ? JSON.parse(p.constituents) : p.constituents;
  const survey = surveyStationModels[String(p.complex_id)];
  const cathedral = survey?.model === "survey-cathedral-110" ? survey : null;
  const entranceSummary = cathedral
    ? `${cathedral.entrances} stair entrances`
    : `${p.entrances} entrances: ${parts.join(", ")}`;
  const interiorSummary = cathedral
    ? `Station model: ${cathedral.platforms} side platforms. Stair connections are illustrative.`
    : survey?.model === "survey-50-st-bway"
      ? `Station model: ${survey.platforms} side platforms. Entrance connections are illustrative.`
      : standaloneStation?.floorsModel === "57-st-7-av"
        ? "Station model: two island platforms, mezzanine and elevator route. Some connections are illustrative."
        : undergroundSummary(p.complex_id);
  openPopup(lngLat, `<p class="pop-k">Subway station</p><p class="pop-t">${esc(p.station)}</p>
    <p class="pop-b">${bulletsHtml(p.routes)}</p>
    <p>${esc(entranceSummary)}</p>
    <p class="pop-m">${p.step_free ? "Has a street elevator entrance." : "No street elevator entrance in MTA data."}${
      constituents.length > 1 ? ` Includes ${esc(constituents.join(", "))}.` : ""}</p>
    <p class="pop-m">${esc(interiorSummary)}</p>
    ${placeOf(p.complex_id) ? '<div class="pop-acts"><button type="button" class="ctl text" data-trip-here>Go from here</button><button type="button" class="ctl text" data-see-layout>See layout</button></div>'
      : standaloneStation ? '<button type="button" class="ctl text" data-explore-station>Explore station</button>' : ""}`);
  const pe = popup.getElement();
  pe.querySelector("[data-explore-station]")?.addEventListener("click", openStandaloneStation);
  // 34 St–Hudson Yards: the place card of the new page. A tap must choose, preview or decide: the trip card, or a closer look, with no change of page
  pe.querySelector("[data-trip-here]")?.addEventListener("click", () => { popup?.remove(); tripCard(p.complex_id).open(); });
  pe.querySelector("[data-see-layout]")?.addEventListener("click", () => { popup?.remove(); if (!state.is3d) setMode(true, { move: false });
    placeOf(p.complex_id).world.setOpen(true);                   // cut open: the station under the street, without the ground's lid
    map.easeTo({ center: lngLat, zoom: 16.6, pitch: 60, bearing: 20, duration: 1200 }); });
}

function undergroundSummary(cid) {
  if (stationModel && String(cid) === stationModel.station.complex_id) {
    return "Inside the station: levels and machines from the MTA; the route shows the way from the platform to the street. Some positions are assumed.";
  }
  const fs = subway.under.features.filter((f) => String(f.properties.complex_id) === String(cid));
  const n = (k) => fs.filter((f) => f.properties.kind === k).length;
  const levelsSeen = [...new Set(fs.filter((f) => f.properties.kind === "platform" && f.properties.level)
    .map((f) => f.properties.level))].sort();
  return `Underground (OpenStreetMap): ${n("platform")} platform${n("platform") === 1 ? "" : "s"}${
    levelsSeen.length ? ` on level ${levelsSeen.join(", ")}` : ""}, ${n("passage") || "no"} mapped passage segment${
    n("passage") === 1 ? "" : "s"}. How entrances connect to platforms is not in open data, so it is not drawn.`;
}

// The route's subway entrance: ringed on the map, and its station highlighted by default
function markRouteExit(r) {
  const ends = [r.path[0], r.path.at(-1)];
  const picked = ends.find((id) => id.startsWith("exit-")); // entrance picked on the map: node id carries its eid
  // from a platform, the entrance is the one the route comes up at
  const sub = ends.map((id) => nodes[id]).find((n) => n?.mta?.lonlat) ?? r.path.map((id) => nodes[id]).find((n) => n?.mta?.lonlat);
  const f = picked ? subway.entrances.features.find((x) => x.properties.eid === +picked.slice(5))
    : sub && subway.entrances.features.find((x) =>
      Math.abs(x.geometry.coordinates[0] - sub.mta.lonlat[0]) < 1e-6 && Math.abs(x.geometry.coordinates[1] - sub.mta.lonlat[1]) < 1e-6);
  state.routeExit = f ? f.properties.eid : -1;
  state.routeStation = f ? f.properties.complex_id : null;
  map.setFilter("route-exit", ["==", ["get", "eid"], state.routeExit]);
  swappingPopup = true;
  popup?.remove();
  swappingPopup = false;
  highlightStation(state.routeStation);
}

// --- best exit -----------------------------------------------------------------
const GLYPH_WORD = { stair: "Stairs", elevator: "Street elevator", house: "Station house", passage: "In building" };
// One line for the first step when a faster exit exists, and the three fastest entrances numbered on the map; the
// full list is the From sheet (renderEntrances)
function updateExitHints() {
  const key = [$("to").value, +$("badge").checked, +$("accessible").checked].join("|");
  // rank within the route's station only (the file also holds nearby stations' entrances)
  const rows = exits?.rank?.[key]?.filter((r) => String(r.complex_id) === String(state.routeStation));
  map.getSource("exit-preview").setData(EMPTY);
  state.exitTip = "";
  // ranking is for arriving at street entrances; leaving uses the chosen entrance, and a platform start has none chosen
  if (!rows?.length || state.back || nodes[state.route?.path?.[0]]?.platform_start) {
    map.getSource("exit-ranks").setData(EMPTY);
    return;
  }
  const ours = rows.find((r) => r.eid === state.routeExit);
  if (ours && ours !== rows[0] && rows[0].time_s < ours.time_s - 45) {
    state.exitTip = `Exit at <b>${esc(exits.entrances[rows[0].eid].desc)}</b> to save about ${Math.max(1, Math.round((ours.time_s - rows[0].time_s) / 60))} min. <button type="button" class="link" data-open="from">See exits</button>`;
  }
  map.getSource("exit-ranks").setData({ type: "FeatureCollection", features: rows.slice(0, 3).map((r, i) => ({
    type: "Feature", geometry: { type: "Point", coordinates: exits.entrances[r.eid].lonlat }, properties: { rank: i + 1 } })) });
}

// Getting there: subway -> place. Leaving: place -> back to the subway (exit gates need no badge).
function setDirection(back) {
  state.back = back;
  $("swap").setAttribute("aria-pressed", String(back));
  $("swap").setAttribute("aria-label", back ? "Swap: arriving instead of leaving" : "Swap: leaving instead of arriving");
  selectRoute();
}

const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
// Exploded floors: the route's levels spread evenly apart so upper floors are as readable as the lobby
function setExploded(on) {
  state.exploded = on;
  $("explode").setAttribute("aria-pressed", String(on));
  setElevations();
  station3d.setSpread(on);
  station3d.refresh();
  towers3d.setSpread(on);
  map.getSource("venue").setData(venue);
  // schematic floors next to real-height neighbours would mislead (and hide the lower floors): flatten the city
  map.setPaintProperty("buildings-3d", "fill-extrusion-height", on || !state.is3d ? 0 : cityHeight());
  if (state.route) {
    const f = routeFeatures(state.route);
    map.getSource("route-solids").setData(f.solids);
    station3d.setRoute(f.station);
    setContinuationLine(f.extension);
    if (!state.playing) placeWalker(); // floors moved: stand on the new height
  }
  applyFilters();
  const spreadView = () => (state.venue.spread ? { center: offset(stationCenter ? midpoint(state.venue.center, stationCenter) : state.venue.center, state.venue.bearing, state.venue.spread.aheadM), zoom: state.venue.spread.zoom - (isPhone() ? 0.9 : 0), pitch: state.venue.spread.pitch, bearing: state.venue.bearing }
    : { center: stationCenter ? midpoint(state.venue.center, stationCenter) : state.venue.center, zoom: stationCenter ? 16.7 : 17.4, pitch: 58, bearing: state.venue.bearing });
  if (state.is3d) map.easeTo({ ...(on ? spreadView()
    : landmark.seeThrough ? viewInside(state.venue) : viewExterior(state.venue)), duration: 1000 });
}

// Play: step through the route. One animation moves both walkers along each step's path: the dot in 2D and the
// figure in 3D, so the two views always show the same place. When not playing, both stand at the current step.
let playTimer = 0, walkFrame = 0, lastHeading = 0, followPaused = false;
const WALKER_LIFT_M = 1.1; // stands on top of the 3D route band
function stepDuration(s) {
  const ms = s.kind === "walk" ? Math.min(3600, Math.max(1100, 700 + (s.distance_m || 0) * 30)) : s.kind === "elevator" ? 1800 : 1500;
  return ms / state.speed;
}
// The step's path in metres (east, north, up) from its first node; heights follow real or exploded floors
function stepPath(s) {
  const ns = s.nodes.map((id) => nodes[id]);
  const o = ns[0].lonlat, my = 110540, mx = 111320 * Math.cos((o[1] * Math.PI) / 180);
  const stair=state.venue?.cptModel && !s.continuation && s.kind==="stairs" && ns.length===2 && ns[0].level!==ns[1].level;
  const pts = stair ? cptStairPath(...ns).map(p=>({lonlat:p.lonlat,x:(p.lonlat[0]-o[0])*mx,
    y:(p.lonlat[1]-o[1])*my,z:p.elev})) : ns.flatMap((n, k) => {
    const ll = k && ns[k - 1].level === n.level ? densify(ns[k - 1].lonlat, n.lonlat, n.level).slice(1) : [n.lonlat];
    return ll.map((p) => ({ lonlat: p, x: (p[0] - o[0]) * mx, y: (p[1] - o[1]) * my, z: (n.routeElev??elevOf(n.level)) + groundOf(n.level, p) }));
  });
  const seg = pts.slice(1).map((q, k) => Math.hypot(q.x - pts[k].x, q.y - pts[k].y, q.z - pts[k].z));
  return { pts, seg, total: seg.reduce((a, b) => a + b, 0) };
}
/** The way a step sets off (radians clockwise from north), or null when it does not move across the floor. */
function stepHeading(s) {
  const { pts } = stepPath(s);
  for (let k = 1; k < pts.length; k++) {
    const dx = pts[k].x - pts[0].x, dy = pts[k].y - pts[0].y;
    if (Math.hypot(dx, dy) > 0.5) return Math.atan2(dx, dy);
  }
  return null;
}
/** The 2D map's bearing for a step: the avenue grid up, the way you walk, or the phone's compass. */
function stepBearing(s) {
  if (state.headingMode === "compass" && deviceHeading != null) return deviceHeading;
  if (state.headingMode !== "ahead") return VIEW_2D.bearing;
  const steps = state.route.steps, i = steps.indexOf(s);
  const h = stepHeading(s) ?? (steps[i + 1] ? stepHeading(steps[i + 1]) : null);
  return h == null ? map.getBearing() : (h * 180) / Math.PI;
}
function poseAt(path, f) {
  const { pts, seg, total } = path;
  let d = f * total, k = 0;
  while (k < seg.length - 1 && d > seg[k]) d -= seg[k++];
  const a = pts[k], b = pts[k + 1] || a, t = seg[k] ? Math.min(1, d / seg[k]) : 0;
  const dx = b.x - a.x, dy = b.y - a.y;
  const flat = Math.hypot(dx, dy) > 0.05;
  if (flat) lastHeading = Math.atan2(dx, dy); // clockwise from north
  return { lonlat: [a.lonlat[0] + (b.lonlat[0] - a.lonlat[0]) * t, a.lonlat[1] + (b.lonlat[1] - a.lonlat[1]) * t],
    alt: a.z + (b.z - a.z) * t + (state.venue?.cptModel ? .24 : WALKER_LIFT_M), heading: lastHeading, walking: flat && f < 1 };
}
// The 3D figure may not reach into the floor above: 75 % of the height to the next level up (real or spread)
function roomAbove(level) {
  const here = elevOf(level);
  const above = Object.keys(levels).map(elevOf).filter((e) => e > here + 0.5);
  return above.length ? Math.max(2.2, 0.75 * (Math.min(...above) - here)) : null;
}
function showWalker(pose, level) {
  pose.maxM = state.venue?.cptModel ? 1.75 : roomAbove(level);
  if (state.venue?.cptModel) pose.maxMarkerScale = .5;
  const facing = pose.facing ?? pose.heading; // the phone's compass, when on, else the way the route goes
  map.getSource("walker").setData({ type: "Feature", properties: { level, heading: (facing * 180) / Math.PI },
    geometry: { type: "Point", coordinates: pose.lonlat } });
  walker3d.setPose(pose);
}
function clearWalker() {
  map.getSource("walker")?.setData({ type: "FeatureCollection", features: [] });
  walker3d?.clear();
}
/** Stand at the start of the current step (the end, for the last one), facing the way it goes. */
function placeWalker() {
  cancelAnimationFrame(walkFrame);
  const r = state.route;
  if (!r?.steps?.length) return clearWalker();
  const i = Math.min(state.step, r.steps.length - 1), s = r.steps[i], last = i === r.steps.length - 1;
  const path = stepPath(s);
  const pose = { ...poseAt(path, last ? 1 : 0), walking: false };
  // a step that does not move (come up at the exit, a desk) faces the way the next one goes
  if (path.total < 0.05 && r.steps[i + 1]) pose.heading = stepHeading(r.steps[i + 1]) ?? pose.heading;
  else if (!last) pose.heading = stepHeading(s) ?? pose.heading;
  if (state.headingMode === "compass" && deviceHeading != null) pose.facing = (deviceHeading * Math.PI) / 180;
  showWalker(pose, s.level);
}
// While playing in 2D the camera follows the dot; facing your way it also turns, smoothly, with the walk
function follow(pose) {
  if (followPaused) return;
  if (state.is3d) {
    if (routeSceneConfig() && state.ui === "step") {
      if (!$("route-scene").hidden || map.isEasing()) return;
      const center = offset(pose.lonlat, map.getBearing(), pose.alt * Math.tan(map.getPitch() * Math.PI / 180));
      map.jumpTo({ center });
      return;
    }
    if (state.venue?.cptModel && state.level === "G" && pose.walking) map.jumpTo({center:pose.lonlat});
    return;
  }
  const target = state.headingMode === "grid" ? VIEW_2D.bearing : (pose.heading * 180) / Math.PI;
  const b = map.getBearing(), d = ((target - b + 540) % 360) - 180;
  map.jumpTo({ center: pose.lonlat, bearing: b + d * 0.08, pitch: 0 });
}
function animateWalker(s, ms) {
  cancelAnimationFrame(walkFrame);
  const path = stepPath(s);
  const initial = routeFraction;
  const t0 = performance.now();
  const frame = (now) => {
    const f = Math.min(1, initial + (now - t0) / ms);
    routeFraction = f;
    const pose = { ...poseAt(path, f), phase: now * 0.012 * state.speed };
    if (state.venue?.cptModel && !s.continuation && (s.kind === "elevator" || s.kind === "stairs")) {
      const floor = f < 1 && !state.is3d ? nodes[s.nodes[0]].level : s.level;
      if (state.level !== floor) setLevel(floor,false);
      if (state.is3d && !followPaused && s.kind === "elevator") {
        const pitch=46, angle=pitch*Math.PI/180, bearing=state.venue.bearing;
        const view=1.5*55+pose.alt/Math.cos(angle);
        const pxPerM=512/(40075016*Math.cos(pose.lonlat[1]*Math.PI/180));
        map.jumpTo({center:offset(pose.lonlat,bearing,pose.alt*Math.tan(angle)),pitch,bearing,
          zoom:Math.log2(1.5*map.getContainer().clientHeight/view/pxPerM)});
      }
      showWalker(pose,floor);
    } else {
      showWalker(pose,s.level);
      follow(pose);
    }
    if (routeSceneConfig()) syncRouteScene(pose);
    if (f < 1) walkFrame = requestAnimationFrame(frame);
  };
  walkFrame = requestAnimationFrame(frame);
}
function seekRouteStep(index) {
  clearTimeout(playTimer);
  setStep(index);
  if (state.playing) playStep();
}
function trainDoorRoute() {
  return state.venue?.id === "empire-state" && $("from").value === "st-ip-e" &&
    $("to").value === "f86-deck" && !state.back;
}
function playStep(waited = 0) {
  const s = state.route.steps[state.step];
  const doorStart = trainDoorRoute() && state.step === 0 && state.is3d && segmentedRoute && routeSceneConfig();
  if (doorStart && !$("route-scene").contentWindow?.floorsView?.ready && waited < 5000) {
    playTimer = setTimeout(() => playStep(waited + 100), 100);
    return;
  }
  const ms = doorStart ? 3200 / state.speed : stepDuration(s);
  animateWalker(s, ms);
  playTimer = setTimeout(() => {
    if (state.step >= state.route.steps.length - 1) return stopPlay();
    setStep(state.step + 1);
    playStep();
  }, ms * (1 - routeFraction));
}
function routeSceneConfig() {
  const config = state.venue?.routeScenes;
  if (!config || !state.route?.steps?.length || (config.target && $("to").value !== config.target)) return null;
  const starts = config.starts || (config.start ? [config.start] : null);
  if (starts && (!starts.includes($("from").value) || (state.back && !config.allowReverse) ||
    $("accessible").checked || $("badge").checked)) return null;
  return state.route.steps.some(step => step.nodes.some(id => config.excludedNodes?.includes(id)))
    ? null : config;
}

let segmentedRoute = false;
let routeFraction = 0;
let lastRouteCameraStep, lastRouteCameraMode;
function syncRouteScene(pose, { recenter = false } = {}) {
  const frame = $("route-scene");
  const config = routeSceneConfig();
  const active = state.ui === "step" && Boolean(state.route?.steps?.[state.step]);
  const modeControls = $("route-view-modes");
  modeControls.hidden = !active;
  let scope = null;
  let sceneReady = false;
  let floor = null;
  if (active) {
    const step = state.route.steps[state.step];
    const first = nodes[step.nodes[0]];
    const last = nodes[step.nodes.at(-1)];
    const station = levels[first?.level]?.underground || levels[last?.level]?.underground;
    const floorMap = config?.floors || state.venue.floors;
    const building = config?.buildingName && [step.nodes[0], step.nodes.at(-1)].every(id => nodes[id] && (nodes[id].level !== config.streetLevel || id.startsWith(config.indoorNodePrefix)));
    const destinationFloor = floorMap?.[step.level];
    const crossesStreet = config?.allowReverse && !station &&
      (first?.level === config.streetLevel || last?.level === config.streetLevel);
    const indoor = crossesStreet ? null : config?.floorScope && step.level !== config.streetLevel && destinationFloor
      ? /^(station|lirr):/.test(destinationFloor) ? "station" : "building"
      : station ? "station" : building ? "building" : null;
    scope = config && segmentedRoute ? indoor : null;
    const level = state.is3d || routeFraction >= 1 ? step.level : first?.level;
    floor = floorMap?.[level];
    if (scope === "station" && !/^(station|lirr):/.test(floor || "")) {
      floor = [first, last].map(node => floorMap?.[node?.level]).find(id => /^(station|lirr):/.test(id || ""));
    }
    $("route-scene-name").textContent = scope === "station" ? (trainDoorRoute() && state.is3d && state.step === 0 ? "Train door · Scenario" : config.stationName)
      : scope === "building" ? config.buildingName : "Map";
    $("route-global").setAttribute("aria-pressed", String(!config || !segmentedRoute));
    const segmentedButton = $("route-segmented");
    segmentedButton.disabled = !config;
    segmentedButton.title = config ? "" : "Separate indoor views are unavailable for this route.";
    segmentedButton.setAttribute("aria-pressed", String(Boolean(config && segmentedRoute)));
    $("route-scrub").max = state.route.steps.length - 1;
    $("route-scrub").value = state.step;
    if (!pose) $("route-next").textContent = state.route.steps[state.step + 1]
      ? `Next · ${state.route.steps[state.step + 1].text}` : "";
    if (!scope && !followPaused && (recenter || config && (lastRouteCameraStep !== step || lastRouteCameraMode !== state.is3d))) {
      const current = pose || poseAt(stepPath(step), routeFraction);
      const entranceApproach = state.is3d && !indoor && step.nodes.at(-1) === config?.entrance
        ? nodes[step.nodes.at(-2)]?.lonlat : null;
      const pitch = state.is3d ? (entranceApproach ? 38 : 52) : 0;
      let bearing = state.is3d ? map.getBearing() : stepBearing(step);
      if (entranceApproach && last?.lonlat) {
        // Look toward the door from the sidewalk, so the tower sits behind the walker.
        const [lon, lat] = last.lonlat;
        const east = (lon - entranceApproach[0]) * Math.cos(lat * Math.PI / 180);
        const north = lat - entranceApproach[1];
        if (east || north) bearing = Math.atan2(east, north) * 180 / Math.PI;
      }
      const center = state.is3d ? offset(current.lonlat, bearing, current.alt * Math.tan(pitch * Math.PI / 180)) : current.lonlat;
      map.easeTo({ center, pitch, bearing, zoom: 18.9, duration: 700 });
      lastRouteCameraStep = step;
      lastRouteCameraMode = state.is3d;
    }
    if (scope) {
      if (frame.getAttribute("src") !== config.viewer) {
        frame.src = config.viewer;
        frame.hidden = true;
        document.body.classList.remove("route-interior");
        return;
      }
      const currentPose = pose || poseAt(stepPath(step), routeFraction);
      const view = frame.contentWindow?.floorsView;
      view?.showRouteSegment?.({
        scope, floor, step, doorGuide: trainDoorRoute(), progress: routeFraction, is3d: state.is3d, coordinates: currentPose.lonlat, altitude: currentPose.alt - (config.altitudeOffset || 0),
        heading: currentPose.heading, color: ROUTE.current, rim: T.stroke, walking: currentPose.walking, phase: currentPose.phase,
        points: step.nodes.map(id => ({ coordinates: nodes[id].lonlat, floor: floorMap?.[nodes[id].level], altitude: elevOf(nodes[id].level) + WALKER_LIFT_M - (config.altitudeOffset || 0) })),
      });
      sceneReady = Boolean(view?.showRouteSegment);
    }
  }
  if (scope || !active) lastRouteCameraStep = null;
  frame.hidden = !sceneReady;
  document.body.classList.toggle("route-interior", sceneReady);
  if ((!active || !config) && frame.hasAttribute("src")) frame.removeAttribute("src");
}
function setPlayButtons(on) {
  const r = state.route, last = r?.steps && state.step >= r.steps.length - 1;
  $("playbar").hidden = !state.session;
  $("pb-label").textContent = on ? `PLAYING ${state.speed}×` : last ? "DONE" : "PAUSED";
  for (const id of ["play", "play-step"]) $(id).setAttribute("aria-pressed", String(on));
  $("play").lastElementChild.textContent = on ? "Pause" : "Preview route";
  const stepLabel = $("preview-step-label");
  stepLabel.hidden = false;
  stepLabel.textContent = on ? "Pause" : state.session ? "Resume" : "Preview route";
  $("play-step").setAttribute("aria-label", stepLabel.textContent);
}
function startPlay() {
  if (!state.route?.steps || (thirdPlace&&!continuation)) return;
  if (state.step >= state.route.steps.length - 1 && routeFraction >= 1) setStep(0);
  state.playing = true;
  state.session = true;
  followPaused = false;
  setPlayButtons(true);
  if (!state.is3d) map.jumpTo({ zoom: Math.max(map.getZoom(), 18.2), pitch: 0 }); // close enough to follow the walk
  playStep();
}
function stopPlay() {
  clearTimeout(playTimer);
  cancelAnimationFrame(walkFrame);
  state.playing = false;
  setPlayButtons(false);
  syncRouteScene();
}
// End a preview: back to the route overview, the dot at the start
function endSession() {
  state.session = false;
  setPlayButtons(state.playing);
}
function endPreview() {
  stopPlay();
  endSession();
  setStep(0);
  showRoute();
}

// --- which way the map faces ---------------------------------------------------------------------------------
// grid: Manhattan's avenues up (the default) · ahead: the way you walk is up · compass: the phone's own heading,
// as in a phone map's heading mode (phones only; iOS asks for permission once)
let deviceHeading = null, compassListener = null, compassFrame = 0;
const hasCompass = () => "DeviceOrientationEvent" in window && matchMedia("(pointer: coarse)").matches;
const HEADING_LABEL = { grid: "Map turns: grid up. Tap to face your way", ahead: "Map turns: facing your way. Tap for "
  + "the phone's compass", compass: "Map turns with your phone's compass. Tap for grid up" };
async function cycleHeading() {
  const order = hasCompass() ? ["grid", "ahead", "compass"] : ["grid", "ahead"];
  let next = order[(order.indexOf(state.headingMode) + 1) % order.length], noCompass = false;
  if (next === "compass" && !(await enableCompass())) {
    noCompass = true;
    next = "grid";
  }
  if (state.headingMode === "compass" && next !== "compass") disableCompass();
  state.headingMode = next;
  $("heading").dataset.mode = next;
  $("heading").setAttribute("aria-label", next === "ahead" && !hasCompass() ? "Map turns: facing your way. Tap for grid up"
    : HEADING_LABEL[next]);
  toast(noCompass ? "No compass reading on this device: the map is back to grid up."
    : { grid: "Grid up: avenues point up the screen", ahead: "Facing your way: the route ahead points up",
      compass: "Compass: the map turns with your phone" }[next]);
  placeWalker();
  if (state.ui === "step" && !state.is3d && !state.playing) frameStep(state.route.steps[state.step]);
  else if (state.ui === "route" && !state.is3d && next === "grid") map.easeTo({ bearing: VIEW_2D.bearing, duration: 600 });
}
async function enableCompass() {
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function" && (await DeviceOrientationEvent.requestPermission()) !== "granted") return false;
  } catch { return false; }
  compassListener = (e) => {
    const h = e.webkitCompassHeading ?? (e.absolute && e.alpha != null ? 360 - e.alpha : null);
    if (h == null) return;
    deviceHeading = (h + (screen.orientation?.angle || 0) + 360) % 360;
    onDeviceHeading();
  };
  window.addEventListener("deviceorientationabsolute", compassListener);
  window.addEventListener("deviceorientation", compassListener);
  for (let t = 0; t < 10 && deviceHeading == null; t++) await new Promise((r) => setTimeout(r, 200)); // no sensor: give up
  if (deviceHeading == null) disableCompass();
  return deviceHeading != null;
}
function disableCompass() {
  window.removeEventListener("deviceorientationabsolute", compassListener);
  window.removeEventListener("deviceorientation", compassListener);
  compassListener = null;
  deviceHeading = null;
}
function onDeviceHeading() {
  if (compassFrame) return;
  compassFrame = requestAnimationFrame(() => {
    compassFrame = 0;
    if (state.headingMode !== "compass" || state.playing) return;
    placeWalker();
    if (!state.is3d && (state.ui === "route" || state.ui === "step")) map.jumpTo({ bearing: deviceHeading });
  });
}
let toastTimer = 0;
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 2600);
}

function setSeeThrough(on, { move = true } = {}) {
  landmark.setSeeThrough(on);
  $("xray").setAttribute("aria-pressed", String(on));
  $("xray").textContent = on ? "Show outside" : "See inside";
  applyFilters();
  if (state.is3d && move) map.easeTo({ ...(on ? viewInside(state.venue) : viewExterior(state.venue)), duration: 1000 });
}

// Console hook for debugging and automated checks
window.demo = { get hyWorld() { return hyWorld; }, get places() { return V2; }, tripCard, map, state, venues: VENUES.map((v) => v.id), cycleHeading, showOverview, setUI, showRoute, startSteps, openSheet, closeSheet, setStep, setMode, setSeeThrough, selectVenue, setDirection, setExploded, startPlay, stopPlay, get nodes() { return nodes; }, get levels() { return levels; }, project, elevOf, get landmark() { return landmark; }, get walker3d() { return walker3d; }, get station3d() { return station3d; } };

// Map symbols drawn at runtime (no sprite files): MTA line bullets and the indoor facility icon set.

// MTA trunk-line colours (route bullets); N Q R W use black text on yellow
const MTA = {
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  "A": "#0039A6", "C": "#0039A6", "E": "#0039A6",
  "B": "#FF6319", "D": "#FF6319", "F": "#FF6319", "M": "#FF6319",
  "G": "#6CBE45", "J": "#996633", "Z": "#996633", "L": "#A7A9AC",
  "N": "#FCCC0A", "Q": "#FCCC0A", "R": "#FCCC0A", "W": "#FCCC0A",
  "S": "#808183",
};
const DARK_TEXT = new Set(["N", "Q", "R", "W"]);
const PR = 2; // draw at 2x for crisp icons on retina screens

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w * PR; c.height = h * PR;
  const g = c.getContext("2d");
  g.scale(PR, PR);
  return [c, g];
}

/** One image per distinct route list, e.g. "4 5 6 7 S" -> five bullets in a row (wraps after six). */
function routeBullets(routes) {
  const list = routes.split(/\s+/).filter(Boolean);
  const d = 15, gap = 2, perRow = 6;
  const cols = Math.min(list.length, perRow), rows = Math.ceil(list.length / perRow);
  const [c, g] = canvas(cols * (d + gap) + 4, rows * (d + gap) + 4);
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.beginPath(); g.roundRect(0, 0, cols * (d + gap) + 4, rows * (d + gap) + 4, 5); g.fill();
  list.forEach((r, i) => {
    const x = 2 + (i % perRow) * (d + gap) + d / 2, y = 2 + Math.floor(i / perRow) * (d + gap) + d / 2;
    g.fillStyle = MTA[r] || "#808183";
    g.beginPath(); g.arc(x, y, d / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = DARK_TEXT.has(r) ? "#111" : "#fff";
    g.font = "700 10px Helvetica, Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(r, x, y + 0.5);
  });
  return c;
}

// Indoor facility icons: a rounded tile in a category colour with a white pictogram
const ICONS = {
  elevator: { bg: "#3f4c5a", draw(g) {
    g.beginPath(); g.moveTo(9, 6); g.lineTo(13, 11); g.lineTo(5, 11); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(9, 20); g.lineTo(13, 15); g.lineTo(5, 15); g.closePath(); g.fill();
    g.fillRect(15, 6, 2, 14); g.fillRect(19, 6, 2, 14);
  } },
  escalator: { bg: "#3f4c5a", draw(g) {
    g.lineWidth = 2.4; g.lineJoin = "round";
    g.beginPath(); g.moveTo(4, 20); g.lineTo(9, 20); g.lineTo(17, 8); g.lineTo(22, 8); g.stroke();
    g.beginPath(); g.arc(17, 4.5, 1.8, 0, Math.PI * 2); g.fill();
  } },
  stairs: { bg: "#3f4c5a", draw(g) {
    g.lineWidth = 2.4; g.lineJoin = "round";
    g.beginPath(); g.moveTo(4, 21); g.lineTo(9, 21); g.lineTo(9, 16); g.lineTo(14, 16); g.lineTo(14, 11); g.lineTo(19, 11); g.lineTo(19, 6); g.lineTo(23, 6); g.stroke();
  } },
  turnstile: { bg: "#b42318", draw(g) {
    g.fillRect(5, 6, 3, 14); g.fillRect(18, 6, 3, 14);
    g.lineWidth = 2.2; g.beginPath(); g.moveTo(8, 13); g.lineTo(18, 13); g.stroke();
  } },
  desk: { bg: "#a16207", draw(g) {
    g.beginPath(); g.arc(13, 7, 3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.roundRect(7.5, 11, 11, 5, 2); g.fill();
    g.fillRect(4, 17, 18, 3);
  } },
  kiosk: { bg: "#6b46c1", draw(g) {
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) g.fillRect(6 + k * 5, 6 + r * 5, 3.4, 3.4);
  } },
  ticket: { bg: "#a16207", draw(g) {
    g.beginPath(); g.roundRect(4, 8, 18, 10, 2); g.fill();
    g.fillStyle = "#a16207"; g.fillRect(14, 8, 1.4, 10);
  } },
  restroom: { bg: "#4b5563", draw(g) {
    g.font = "700 9.5px Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("WC", 13, 13.5);
  } },
  entrance: { bg: "#1f7a4d", draw(g) {
    g.fillRect(14, 5, 2.2, 16); // door frame
    g.lineWidth = 2.4; g.lineCap = "round";
    g.beginPath(); g.moveTo(4, 13); g.lineTo(11, 13); g.stroke();
    g.beginPath(); g.moveTo(8, 9.5); g.lineTo(11.5, 13); g.lineTo(8, 16.5); g.stroke();
    g.fillRect(17, 7, 4, 12);
  } },
  transit: { bg: "#111827", draw(g) {
    g.beginPath(); g.roundRect(7, 5, 12, 13, 3); g.fill();
    g.fillStyle = "#111827"; g.fillRect(9, 8, 8, 4);
    g.beginPath(); g.arc(10, 15, 1.2, 0, 7); g.arc(16, 15, 1.2, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.fillRect(8, 19, 2, 3); g.fillRect(16, 19, 2, 3);
  } },
};

function poiIcon({ bg, draw }) {
  const [c, g] = canvas(26, 26);
  g.fillStyle = bg; g.beginPath(); g.roundRect(0.5, 0.5, 25, 25, 6); g.fill();
  g.strokeStyle = "#fff"; g.lineWidth = 1; g.stroke();
  g.fillStyle = "#fff"; g.strokeStyle = "#fff";
  draw(g);
  return c;
}

const toImage = (c) => c.getContext("2d").getImageData(0, 0, c.width, c.height);

// Subway entrance glyphs: small round markers by entrance type (no line bullets: the station label carries those)
const ENTRANCE = {
  stair: { bg: "#1f2328", draw(g) {
    g.lineWidth = 1.8; g.lineJoin = "round";
    g.beginPath(); g.moveTo(4.5, 13); g.lineTo(7, 13); g.lineTo(7, 10.5); g.lineTo(9.5, 10.5); g.lineTo(9.5, 8);
    g.lineTo(12, 8); g.lineTo(12, 5.5); g.lineTo(13.5, 5.5); g.stroke();
  } },
  elevator: { bg: "#2563eb", draw(g) {
    g.beginPath(); g.moveTo(9, 3.5); g.lineTo(12.2, 7.5); g.lineTo(5.8, 7.5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(9, 14.5); g.lineTo(12.2, 10.5); g.lineTo(5.8, 10.5); g.closePath(); g.fill();
  } },
  passage: { bg: "#4b5563", draw(g) {
    g.fillRect(11, 4, 2, 10);
    g.lineWidth = 1.8; g.lineCap = "round";
    g.beginPath(); g.moveTo(4, 9); g.lineTo(9, 9); g.moveTo(7, 6.8); g.lineTo(9.2, 9); g.lineTo(7, 11.2); g.stroke();
  } },
  house: { bg: "#1f2328", draw(g) {
    g.beginPath(); g.moveTo(9, 4); g.lineTo(14, 8.5); g.lineTo(4, 8.5); g.closePath(); g.fill();
    g.fillRect(5.5, 8.5, 7, 5);
  } },
};

function entranceIcon({ bg, draw }) {
  const [c, g] = canvas(18, 18);
  g.fillStyle = bg; g.beginPath(); g.arc(9, 9, 8, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = "#fff"; g.strokeStyle = "#fff";
  draw(g);
  return c;
}

function entranceTile({ draw }, active) {
  const [c, g] = canvas(18, 18);
  g.fillStyle = "#fff";
  g.strokeStyle = active ? "#2563eb" : "#777e88";
  g.lineWidth = active ? 2 : 1;
  g.beginPath();
  g.roundRect(1.25, 1.25, 15.5, 15.5, 3);
  g.fill();
  g.stroke();
  g.fillStyle = g.strokeStyle = "#20242b";
  draw(g);
  return c;
}

/** HTML row of line bullets for info cards. */
export function bulletsHtml(routes) {
  return routes.split(/\s+/).filter(Boolean).map((r) => `<span class="bullet" style="background:${MTA[r] || "#808183"};color:${
    DARK_TEXT.has(r) ? "#111" : "#fff"}">${r}</span>`).join("");
}

export function registerSymbols(map, routeLists) {
  for (const [name, def] of Object.entries(ICONS)) map.addImage(`poi-${name}`, toImage(poiIcon(def)), { pixelRatio: PR });
  for (const [name, def] of Object.entries(ENTRANCE)) {
    map.addImage(`ent-${name}`, toImage(entranceIcon(def)), { pixelRatio: PR });
    map.addImage(`entry-tile-${name}`, toImage(entranceTile(def, false)), { pixelRatio: PR });
    map.addImage(`entry-active-${name}`, toImage(entranceTile(def, true)), { pixelRatio: PR });
  }
  for (const r of routeLists) if (r && !map.hasImage(`routes-${r}`)) map.addImage(`routes-${r}`, toImage(routeBullets(r)), { pixelRatio: PR });
}

const AMENITY_ICON = { "visitor-desk": "desk", "security-desk": "desk", "dispatch-kiosk": "kiosk",
  escalator: "escalator", information: "ticket", elevator: "elevator", stairs: "stairs" };
const OPENING_ICON = { pedestrian: "entrance", turnstile: "turnstile", "transit-connection": "transit" };
const UNIT_ICON = { "elevator-lobby": "elevator", restroom: "restroom" };
// Draw order when icons collide: what a visitor must find first wins
const PRIORITY = { transit: 0, entrance: 1, turnstile: 2, desk: 3, kiosk: 4, ticket: 4, elevator: 5, escalator: 6, stairs: 6, restroom: 7 };

function centroid(ring) {
  const pts = ring.slice(0, -1);
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

/** Point features for the facility icon layer, derived from the venue's amenities, units and openings. */
export function poiFeatures(venue) {
  const out = [];
  for (const f of venue.features) {
    const p = f.properties;
    let icon, at;
    if (p.feature_type === "amenity") { icon = AMENITY_ICON[p.category]; at = f.geometry.coordinates; }
    else if (p.feature_type === "opening") {
      icon = OPENING_ICON[p.category];
      const [a, b] = f.geometry.coordinates;
      at = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    } else if (p.feature_type === "unit") { icon = UNIT_ICON[p.category]; at = icon && centroid(f.geometry.coordinates[0]); }
    if (!icon) continue;
    out.push({ type: "Feature", geometry: { type: "Point", coordinates: at },
      properties: { icon, name: p.name, level: p.level, source: p.source, rank: PRIORITY[icon] ?? 9 } });
  }
  return { type: "FeatureCollection", features: out };
}

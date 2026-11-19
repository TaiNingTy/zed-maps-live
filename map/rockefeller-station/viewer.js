const $ = id => document.getElementById(id);
const response = await fetch("./model.json");
if (!response.ok) throw new Error("Station model could not load");
const model = await response.json();
const drawing = $("drawing");
const note = $("note");
let mode = "3d", zoom = 1, selected = null;
const svg = (name, attrs) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
};
const locations = model.features.flatMap(feature => feature.shape || [feature.position]);
const centre = [0, 1].map(axis => (Math.min(...locations.map(p => p[axis])) + Math.max(...locations.map(p => p[axis]))) / 2);
function render() {
  note.hidden = true;
  const width = drawing.clientWidth, height = drawing.clientHeight;
  if (!width || !height) return;
  const size = Math.max(...locations.map(p => Math.hypot(p[0] - centre[0], p[1] - centre[1])));
  const scale = Math.min(width, height) * .36 * zoom / size;
  drawing.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const project = ([x, y], platform) => {
    x -= centre[0];
    y -= centre[1];
    const east = mode === "plan" ? x : x * .83 - y * .55;
    const south = mode === "plan" ? y : (x * .55 + y * .83) * .61;
    const offset = platform && mode === "stack" ? Number($("spread").value) * .8 : 0;
    return [width / 2 + east * scale, height / 2 + south * scale + offset];
  };
  drawing.replaceChildren();
  for (const feature of [...model.features].sort((a,b) => Number(b.kind === "platform") - Number(a.kind === "platform"))) {
    const platform = feature.kind === "platform";
    const filter = $("level").value;
    if (filter !== "all" && filter !== (platform ? "platform" : "street")) continue;
    const points = (feature.shape || [feature.position]).map(point => project(point, platform));
    const [x, y] = points[0];
    const element = platform
      ? svg(feature.closed ? "polygon" : "polyline", {points:points.map(p => p.join(",")).join(" "),fill:feature.closed ? "#526899" : "none",stroke:"#91acf3","stroke-width":3})
      : svg("circle", {cx:x,cy:y,r:5,fill:"#e8a667",stroke:"#181a21","stroke-width":1});
    element.dataset.feature = feature.id;
    element.setAttribute("aria-pressed", String(selected?.id === feature.id));
    element.addEventListener("click", event => {
      event.stopPropagation();
      const bounds = drawing.getBoundingClientRect();
      selected = selected?.id === feature.id ? null : {id:feature.id,x:event.clientX-bounds.left,y:event.clientY-bounds.top};
      render();
    });
    drawing.append(element);
    if (selected?.id !== feature.id) continue;
    const ax = selected.x, ay = selected.y;
    note.firstElementChild.textContent = platform ? "Platform outline" : feature.type;
    note.lastElementChild.textContent = platform ? feature.id + " · OSM" : `MTA · Entry ${feature.entry} · Exit ${feature.exit}`;
    note.hidden = false;
    const right = ax + note.offsetWidth + 36 < width;
    const left = Math.max(4, Math.min(width-note.offsetWidth-4,right ? ax+32 : ax-note.offsetWidth-32));
    const top = Math.max(56, Math.min(height-note.offsetHeight-4,ay-24));
    note.style.transform = `translate(${left}px,${top}px)`;
    drawing.append(svg("line",{x1:ax,y1:ay,x2:right ? left : left+note.offsetWidth,y2:top+note.offsetHeight/2,stroke:"#efeeea","pointer-events":"none"}));
  }
}
function clear() { selected = null; render(); }
for (const button of document.querySelectorAll("[data-view]")) {
  button.onclick = () => {
    mode = button.dataset.view;
    for (const item of document.querySelectorAll("[data-view]")) item.setAttribute("aria-pressed", String(item === button));
    $("spread-control").hidden = mode !== "stack";
    clear();
  };
}
$("level").onchange = $("spread").oninput = clear;
$("in").onclick = () => { zoom = Math.min(5,zoom * 1.25); clear(); };
$("out").onclick = () => { zoom = Math.max(.35,zoom / 1.25); clear(); };
$("fit").onclick = () => { zoom = 1; clear(); };
drawing.onclick = clear;
document.addEventListener("keydown", event => { if (event.key === "Escape") clear(); });
for (const entry of [...model.topology.fare_areas,...model.topology.stairs]) {
  const item = document.createElement("li");
  item.textContent = entry.width_ft ? `${entry.id} · stair · ${entry.width_ft} ft` : `${entry.id} · fare control`;
  $("history").append(item);
}
document.querySelector('[data-view="3d"]').click();
new ResizeObserver(clear).observe(drawing);

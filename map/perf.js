// Performance check, run with ?perf=1 (any device). After the first route is on screen it measures, in order:
//   - first load: page parsed, first route usable, bytes downloaded by kind
//   - 2D -> 3D switch: from the click to the map being idle with the landmark model ready
//   - overview: all 11 landmarks and every Manhattan building in one view, time to idle and frame cost
//   - per building (in 3D): switch time, bytes it fetched, and the cost of one frame during a camera orbit
//   - JS heap after load and after visiting every building (Chromium only)
// Results show in a panel (copy as JSON) and in the console. `&venues=id1,id2` limits the buildings.

const kind = (url) => {
  const p = new URL(url, location.href).pathname;
  if (p.includes("/data/tiles/")) return "city tiles";
  if (p.endsWith(".glb")) return "3D models";
  if (p.endsWith(".geojson")) return "map layers";
  if (p.endsWith(".json")) return p.includes("/venues/") ? "venue data" : p.includes("/landmarks/") ? "landmark data" : "other data";
  if (p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".html")) return "code";
  if (/\.(pbf|mvt)$/.test(p) || url.includes("tiles")) return "basemap tiles";
  return "other";
};
const bytesOf = (entries) => {
  const out = {};
  for (const e of entries) {
    const b = e.transferSize || e.encodedBodySize || 0;
    out[kind(e.name)] = (out[kind(e.name)] || 0) + b;
  }
  out.total = Object.values(out).reduce((a, b) => a + b, 0);
  return out;
};
const mb = (b) => Math.round(b / 1e5) / 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function idle(map, timeout = 15000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    map.once("idle", finish);
    setTimeout(finish, timeout);
  });
}
async function modelReady(demo, timeout = 15000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeout) {
    if (!demo.landmark || demo.landmark.ready) return;
    await sleep(50);
  }
}
function orbit(map, steps = 60) {
  // Frame cost, not screen fps: each orbit step forces a synchronous redraw and waits for the GPU (gl.finish), so
  // the numbers hold even when the tab is hidden or the display caps the frame rate. fps_equiv = 1000 / median ms.
  const gl = map.painter?.context?.gl || map.getCanvas().getContext("webgl2") || map.getCanvas().getContext("webgl");
  const times = [];
  const b0 = map.getBearing();
  for (let k = 0; k < steps; k++) {
    map.jumpTo({ bearing: b0 + (100 * k) / steps });
    const t = performance.now();
    map.redraw();
    gl?.finish();
    times.push(performance.now() - t);
  }
  times.sort((a, b) => a - b);
  const med = times[Math.floor(times.length / 2)];
  return { frame_ms: Math.round(med * 10) / 10, p95_frame_ms: Math.round(times[Math.floor(times.length * 0.95)] * 10) / 10,
    fps_equiv: Math.min(120, Math.round(1000 / Math.max(med, 0.1))), long_frames: times.filter((t) => t > 50).length };
}

export async function runPerf(demo) {
  const { map } = demo;
  performance.setResourceTimingBufferSize(3000);
  const nav = performance.getEntriesByType("navigation")[0];
  const ready = performance.getEntriesByName("route-ready")[0];
  await idle(map);
  await modelReady(demo);
  const res = {
    when: new Date().toISOString(), url: location.href,
    device: { userAgent: navigator.userAgent, viewport: `${innerWidth}x${innerHeight}`, dpr: devicePixelRatio,
      cores: navigator.hardwareConcurrency, memory_gb: navigator.deviceMemory ?? null },
    first_load: { parsed_ms: Math.round(nav.domContentLoadedEventEnd), first_route_ms: Math.round(ready.startTime),
      idle_with_model_ms: Math.round(performance.now()), bytes: bytesOf(performance.getEntriesByType("resource")) },
    heap_mb_after_load: performance.memory ? mb(performance.memory.usedJSHeapSize) : null,
  };
  // 2D -> 3D
  let t0 = performance.now();
  demo.setMode(true);
  await idle(map);
  await modelReady(demo);
  res.switch_2d_to_3d_ms = Math.round(performance.now() - t0);
  // overview: the whole island
  t0 = performance.now();
  demo.showOverview({ animate: false });
  await idle(map);
  res.overview = { ms: Math.round(performance.now() - t0), ...orbit(map) };
  // each building in 3D
  const only = new URLSearchParams(location.search).get("venues");
  const ids = demo.venues.filter((id) => !only || only.split(",").includes(id));
  res.buildings = [];
  for (const id of ids) {
    const before = performance.getEntriesByType("resource").length;
    t0 = performance.now();
    await demo.selectVenue(id, { animate: false });
    await idle(map);
    await modelReady(demo);
    const switch_ms = Math.round(performance.now() - t0);
    await Promise.race([demo.landmark?.contextReady, sleep(15000)]); // neighbours drawn (Columbia's campus loads after the landmark)
    const context_ms = Math.round(performance.now() - t0);
    const fetched = bytesOf(performance.getEntriesByType("resource").slice(before));
    await sleep(300);
    const o = orbit(map);
    res.buildings.push({ id, switch_ms, context_ms, fetched_mb: mb(fetched.total), model_mb: mb(fetched["3D models"] || 0), ...o });
  }
  res.heap_mb_after_all = performance.memory ? mb(performance.memory.usedJSHeapSize) : null;
  demo.setMode(false);
  const fps = res.buildings;
  res.summary = { median_frame_ms_3d: res.buildings.map((b) => b.frame_ms).sort((a, b) => a - b)[Math.floor(fps.length / 2)],
    worst_frame_ms_3d: Math.max(...res.buildings.map((b) => b.frame_ms)),
    median_switch_ms: res.buildings.map((b) => b.switch_ms).sort((a, b) => a - b)[Math.floor(fps.length / 2)] };
  console.log("PERF", JSON.stringify(res));
  window.perfResult = res;
  show(res);
}

function show(res) {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;right:12px;top:12px;z-index:99;max-width:420px;max-height:80vh;overflow:auto;background:#fff;color:#111;"
    + "border:1px solid #ccc;border-radius:10px;padding:12px;font:12px/1.45 -apple-system,Segoe UI,sans-serif;box-shadow:0 6px 24px #0003";
  const f = res.first_load;
  el.innerHTML = `<b>Performance check</b> <span style="color:#666">${res.device.viewport} @${res.device.dpr}x</span>
    <p style="margin:6px 0">First route usable: <b>${f.first_route_ms} ms</b> (page parsed ${f.parsed_ms} ms; idle with model ${f.idle_with_model_ms} ms).
    Downloaded ${mb(f.bytes.total)} MB (${Object.entries(f.bytes).filter(([k]) => k !== "total").map(([k, v]) => `${k} ${mb(v)}`).join(", ")}).</p>
    <p style="margin:6px 0">2D → 3D: <b>${res.switch_2d_to_3d_ms} ms</b>. All 11 landmarks: <b>${res.overview.ms} ms</b>, frame ${res.overview.frame_ms} ms. Heap ${res.heap_mb_after_load ?? "–"} → ${res.heap_mb_after_all ?? "–"} MB.</p>
    <table style="border-collapse:collapse;width:100%">${["<tr><th align=left>Building</th><th>switch ms</th><th>MB</th><th>frame ms</th><th>p95 ms</th></tr>",
      ...res.buildings.map((b) => `<tr><td>${b.id}</td><td align=right>${b.switch_ms}</td><td align=right>${b.fetched_mb}</td><td align=right>${b.frame_ms}</td><td align=right>${b.p95_frame_ms}</td></tr>`)].join("")}</table>
    <button style="margin-top:8px">Copy JSON</button>`;
  el.querySelector("button").onclick = () => navigator.clipboard?.writeText(JSON.stringify(res, null, 1));
  document.body.appendChild(el);
}

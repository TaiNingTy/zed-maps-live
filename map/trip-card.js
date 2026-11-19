// The trip card of the station guide, on the city map (design log of the station guide, steps 104, 107, 114, 115).
// One card for a trip through a place: From / Via / To with a button that turns the trip round and "+" to add a place on the
// way; the time; Start and Play. Started, it shows one step at a time and moves the map to where that step is walked.
// The trip itself (points, steps, time, the choices) comes from the place's scene module through hy-world.js: the card holds
// no route knowledge of its own. First place served: 34 St–Hudson Yards.
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function createTripCard({ map, world, ensure3d, colors, changed }) {
  const el = document.createElement("section");
  el.className = "trip2"; el.hidden = true; el.setAttribute("aria-label", "Trip");
  document.body.appendChild(el);
  const st = { train: "E", dest: "main", via: null, rev: false, mode: "plan", step: 0, edit: null, list: false, view: "walk", sheet: "low" };   // view: walk (first person) or map (from above)
  let T = null, R = null, PL = null, timer = null, lv = [];    // R: the trip · PL: the parts of the station page's own plan card · lv: the level each step is walked on

  const name = (id) => T.places().find((p) => p.id === id)?.name ?? id;
  const stopPlay = () => { clearInterval(timer); timer = null; };
  const pad = () => (innerWidth < 768 ? { top: 70, bottom: Math.min(innerHeight * 0.55, el.offsetHeight + 24), left: 30, right: 70 } : { top: 60, bottom: 60, left: 430, right: 80 });

  /* ── first person: the walker's eye moves along the route (the station page's walk and door views, on the map) ── */
  const EYE = 1.62, PACE = 3.6, LIFT_PACE = 6.15;                                // eye height (m) and pace (m/s), as on the station page
  // For a film of the walk (demo/edge-film): the walk driven from outside, one fixed step of time at a time, at a chosen pace and
  // with the view turned by a chosen amount. Unused in ordinary use (paceK 1, film 0).
  let paceK = 1, film = 0, filmFov = 0;
  const LEN = () => (st.rev ? Math.max(0, R.len - 1.6) : R.len);   // going back to the train the walk ends 1.6 m short of the doors, played through or step by step (it used to walk on into the train's side when played)
  const w = { s: 0, limit: 0, yaw: 0, pitch: 0, offYaw: 0, offPitch: 0, raf: 0, last: 0, all: false, hold: false };
  const at = (s) => { s = Math.max(0, Math.min(R.len, s)); let i = 1; while (i < R.cum.length - 1 && R.cum[i] < s) i++;
    const a = R.pts[i - 1], b = R.pts[i], t = (s - R.cum[i - 1]) / Math.max(1e-6, R.cum[i] - R.cum[i - 1]); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  const turn = (to, k) => { w.yaw += Math.atan2(Math.sin(to - w.yaw), Math.cos(to - w.yaw)) * k; };
  const doorStep = () => !st.rev && st.step === 0 && R.steps[0].seg === "Doors";
  function pose(dt) {
    const p = at(w.s), eye = [p[0], p[1] + EYE, p[2]];
    if (doorStep() && w.s < 0.05) {                             // the door view: standing in the doorway, looking out across the platform toward the way to go
      const far = at(Math.min(R.len, 9)), lx = (p[0]) * 0.4 + far[0] * 0.6, lz = (p[2] - R.side * 4) * 0.4 + far[2] * 0.6;
      w.yaw = Math.atan2(-(lx - p[0]), -(lz - p[2])); w.pitch = -0.04;
    } else {
      const a = at(w.s + 4.5), dx = a[0] - eye[0], dz = a[2] - eye[2], dh = Math.hypot(dx, dz), k = dt ? 1 - Math.exp(-dt * 3.5) : 1;
      if (dh > 0.3) { turn(Math.atan2(-dx, -dz), k); const dy = a[1] + 1.45 - eye[1], mid = at(w.s + 2.25), lift = Math.abs(a[1] - mid[1]) > 0.8 * Math.hypot(a[0] - mid[0], a[2] - mid[2]); w.pitch += ((lift || Math.abs(dy) > 0.8 * dh ? 0 : Math.atan2(dy, dh) * 0.8) - w.pitch) * k; }   // a lift ahead: look level
      else if (Math.abs(a[1] + 1.62 - eye[1]) > 1) w.pitch -= w.pitch * k;   // riding a lift: level
    }
    world.setFP({ pos: eye, yaw: w.yaw - w.offYaw, pitch: Math.max(-1.3, Math.min(1.3, w.pitch - w.offPitch)), fov: filmFov }, { inside: st.dest === "edge", trip: { train: st.train, dest: st.dest, via: st.via, rev: st.rev } });
  }
  function frame(now) {
    const dt = film || Math.min(0.05, (now - w.last) / 1000); w.last = now;
    const p0 = at(w.s), p1 = at(w.s + 0.5), riding = Math.abs(p1[1] - p0[1]) > 0.4 && Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) < 0.05;   // straight up or down: a lift, ridden at a lift's speed
    if (!w.hold) w.s = Math.min(R.len, w.limit, w.s + dt * (riding ? LIFT_PACE : PACE) * paceK);
    pose(dt);
    { const ri = world.world?.trip.ride?.(), txt = ri ? `Level ${ri.level} · ${ri.up} m above Level 4` : null;      // riding a lift: the card counts the floors
      if (txt !== w.rideTxt) { w.rideTxt = txt; const d = el.querySelector(".t2-d"); if (d) d.textContent = txt || R.steps[st.step].d; } }
    if (w.all && w.s >= R.steps[st.step].end - 0.01 && st.step < R.steps.length - 1) { st.step++; w.limit = LEN(); world.setLevel(lv[st.step], true); render(); changed?.(); }
    const done = w.s >= Math.min(R.len, w.limit) - 0.01;
    if (done && w.all) { if (st.step < R.steps.length - 1) { st.step = R.steps.length - 1; world.setLevel(lv[st.step], true); changed?.(); } w.all = false; render(); }   // the walk has ended (short of the doors on the way back): the card shows the last step
    w.raf = film || (done && !w.all) ? 0 : requestAnimationFrame(frame);
  }
  function walk(from, limit, all = false) {
    cancelAnimationFrame(w.raf); Object.assign(w, { s: from, limit, all, hold: false, offYaw: 0, offPitch: 0, last: performance.now() });
    if (world.phase === "arriving") world.arrive("open");       // stepping into the walk while the train is still coming in: it is in, its doors opening (the station page's rule)
    pose(0);
    if (!doorStep() || all) w.raf = requestAnimationFrame(frame); else w.raf = 0;   // at the door the view stands still until Next
  }
  const stopWalk = () => { cancelAnimationFrame(w.raf); w.raf = 0; w.all = false; world.setFP(null); };
  // a drag looks around while standing or walking (the map's own gestures are off in this view)
  { const cv = map.getCanvasContainer(); let d = null;
    cv.addEventListener("pointerdown", (e) => { if (world.fp) d = [e.clientX, e.clientY]; });
    addEventListener("pointermove", (e) => { if (!d || !world.fp) return; w.offYaw += (e.clientX - d[0]) * -0.005; w.offPitch += (e.clientY - d[1]) * -0.004; d = [e.clientX, e.clientY]; if (!w.raf) pose(0); });
    addEventListener("pointerup", () => { d = null; }); }

  function look() {
    if (!R) return;
    if (st.mode === "go" && st.view === "walk") {               // started: walk this step in first person, and stop at its end
      world.showRoute(st); world.setLevel(lv[st.step], true); changed?.();
      // (a return trip ends at the train door: stop a step and a half short of it, so the open door is in front and not the car's side in the face)
      const end = R.steps[st.step].end, from = st.step ? R.steps[st.step - 1].end : 0;
      if (st.rev && st.step === R.steps.length - 1) { const back = Math.max(0, end - 1.6); return walk(Math.min(from, back), back); }   // (the last step may have no length of its own: stand back from the door all the same)
      return walk(from, end);
    }
    stopWalk();
    if (st.mode === "plan") {
      let b = null; for (const [x, , z] of R.pts) { const p = world.lngLat(x, z); b = b ? b.extend(p) : new maplibregl.LngLatBounds(p, p); }
      // the whole trip in view: as close as shows all of it in what the card leaves free, never so far that the place falls back to bare masses
      const P = pad(), free = Math.max(160, Math.min(innerWidth - P.left - P.right, innerHeight - P.top - P.bottom)), sw = b.getSouthWest(), ne = b.getNorthEast();
      const span = Math.max(40, sw.distanceTo(ne)), z = Math.log2(78271.517 * Math.cos(sw.lat * Math.PI / 180) * free / (span * 1.5));
      map.easeTo({ center: b.getCenter(), zoom: Math.max(15.9, Math.min(18.2, z)), pitch: 55, bearing: T.bearing - 9, padding: P, duration: 900 });
      world.showRoute(st); world.setOpen(true, true);   // the whole trip: the place cut open, as in the station page's overview
      changed?.();
    } else {
      const a = st.step ? R.steps[st.step - 1].end : 0, z = R.steps[st.step].end, seg = R.pts.filter((_, i) => R.cum[i] >= a - 0.01 && R.cum[i] <= z + 0.01);
      const p = seg.length ? seg : [R.pts[R.pts.length - 1]], f = p[0], l = p[p.length - 1], mid = p[p.length >> 1];
      const far = Math.hypot(l[0] - f[0], l[2] - f[2]);
      map.easeTo({ center: world.lngLat(mid[0], mid[2]), zoom: far > 120 ? 17.4 : 18.4, pitch: 60, bearing: far > 1 ? world.bearingOf(l[0] - f[0], l[2] - f[2]) : map.getBearing(), padding: pad(), duration: 1000 });
      world.showRoute(st);
      world.setLevel(lv[st.step], true);                        // the level this step is walked on: under the street the place opens, in the tower the tower does
      changed?.();
    }
  }

  function render() {
    if (!T) { el.innerHTML = '<p class="t2-wait">Building the station…</p>'; return; }
    // the two rows as the station page writes them (its own words and line bullet); turned round, the place is From and the platform To
    const rows = [["From", PL.vFrom, st.rev ? "dest" : "train"], ["To", PL.vTo, st.rev ? "train" : "dest"]];
    const head = `<header class="t2-head"><h2>${esc(T.station)}</h2>${T.line.split(" ").map((l) => `<span class="t2-bl" style="background:${T.color};color:${T.ink}">${esc(l)}</span>`).join("")}
      <button type="button" class="icon" data-t2="close" aria-label="Close the trip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>`;
    // on a narrow screen (a phone, a folding phone closed) the plan is a sheet of two heights: low, it says the trip in one line over the
    // time and Start, and leaves the map to the route; pulled up, it is the whole plan. A wide screen shows the whole plan always.
    el.dataset.sheet = st.mode === "go" ? "go" : st.edit || st.list || st.sheet === "full" ? "full" : "low";
    if (st.mode === "go") {
      const s = R.steps[st.step], n = R.steps.length, last = st.step === n - 1;
      el.innerHTML = `${head}
        <div class="t2-prog"><button type="button" class="link" data-t2="plan">‹ Trip</button><span>${esc(s.seg)}</span><span>${st.step + 1} / ${n}</span></div>
        <div class="t2-bar">${R.steps.map((_, i) => `<i class="${i <= st.step ? "on" : ""}"></i>`).join("")}</div>
        <h3>${esc(s.t)}</h3><p class="t2-d">${esc(s.d)}</p>
        <div class="t2-act"><button type="button" class="secondary" data-t2="prev" ${st.step ? "" : "disabled"} aria-label="Step back">‹</button>
          <button type="button" class="secondary" data-t2="play" aria-pressed="${Boolean(timer) || w.all}">${timer || w.all ? "Pause" : "Play"}</button>
          <button type="button" class="primary" data-t2="${last ? "plan" : "next"}">${last ? "Done" : "Next"}</button></div>
        <div class="t2-links"><button type="button" class="link" data-t2="list">${st.list ? "Hide steps" : "All steps"}</button>
          <button type="button" class="link" data-t2="view">${st.view === "walk" ? "See from above" : "Walk it"}</button></div>
        ${st.list ? `<ol class="t2-steps">${R.steps.map((x, i) => `<li><button type="button" data-step="${i}" aria-current="${i === st.step}"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></button></li>`).join("")}</ol>` : ""}`;
      return;
    }
    const adds = T.adds(st.train, st.dest, st.via);
    const choice = (label, sub, time, on, data) => `<button type="button" class="t2-choice" role="radio" aria-checked="${on}" ${data}><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</span>${time ? `<span class="t2-t">${esc(time)}</span>` : ""}</button>`;
    const t = (o) => T.trip({ ...st, ...o, rev: false }).timeText;
    const editor = st.edit === "train" ? T.trains.map((x) => choice(x.name, x.note, "", x.id === st.train, `data-train="${x.id}"`)).join("")
      : st.edit === "dest" ? T.places().map((x) => choice(x.name, x.where, t({ dest: x.id, via: T.viaOk(st.train, x.id, st.via) ? st.via : null }), x.id === st.dest, `data-dest="${x.id}"`)).join("")
      : st.edit === "via" ? `<p class="t2-note">${esc(T.note)}</p>` + adds.map((o, i) => choice(o.name, o.where || "", t(o.set), (o.set.dest || st.dest) === st.dest && ("via" in o.set ? o.set.via : st.via) === st.via, `data-add="${i}"`)).join("") : "";
    el.innerHTML = `<button type="button" class="t2-grab" data-t2="sheet" aria-label="${el.dataset.sheet === "full" ? "Show less of the trip" : "Show the whole trip"}" aria-expanded="${el.dataset.sheet === "full"}"><span></span></button>${head}
      <button type="button" class="t2-line" data-t2="sheet">${rows[0][1]} <i>→</i> ${st.via ? `${esc(T.viaName(st.via))} <i>→</i> ` : ""}${rows[1][1]}</button>
      <div class="t2-rows">
        <button type="button" class="t2-row" data-edit="${rows[0][2]}"><span class="k">${rows[0][0]}</span><span class="v">${rows[0][1]}</span></button>
        ${st.via ? `<div class="t2-row"><span class="k">Via</span><span class="v">${esc(T.viaName(st.via))}</span><button type="button" class="icon" data-t2="dropvia" aria-label="Remove this place">×</button></div>` : ""}
        <button type="button" class="t2-row" data-edit="${rows[1][2]}"><span class="k">To</span><span class="v">${rows[1][1]}</span></button>
        <button type="button" class="icon t2-swap" data-t2="swap" aria-label="Turn the trip round" aria-pressed="${st.rev}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v15m0 0l-3-3m3 3l3-3M16 20V5m0 0l-3 3m3-3l3 3"/></svg></button>
      </div>
      ${adds.length && st.edit !== "via" ? '<button type="button" class="link t2-add" data-edit="via">+ Add a place on the way</button>' : ""}
      ${editor ? `<div class="t2-choices" role="radiogroup">${editor}</div>` : ""}
      <div class="answer"><svg viewBox="0 0 46 34" aria-hidden="true">${PL.ansIcon}</svg><div><b>${esc(PL.ansBig)}</b><span>${esc(PL.ansSm)}</span></div></div>
      <p class="big"><b>${esc(PL.sumTime)}</b><span>${esc(PL.sumLen)}</span></p>
      <div class="segs">${PL.segs}</div>
      ${PL.tip ? `<div class="tip">${PL.tip}</div>` : ""}
      <div class="t2-act"><button type="button" class="primary" data-t2="start">Start</button><button type="button" class="secondary" data-t2="playall">Play</button></div>
      <button type="button" class="link" data-t2="list">${st.list ? "Hide steps" : "All steps"}</button>
      ${st.list ? `<ol class="t2-all">${R.steps.map((x) => `<li>${esc(x.t)}<small>${esc(x.d)}</small></li>`).join("")}</ol>${PL.see.length ? `<h4>When you step out of the door</h4>${PL.see.map((x) => `<p class="t2-d">${esc(x)}</p>`).join("")}` : ""}` : ""}`;
    if (editor) T.trip(st);                                     // the times in the list were worked out trip by trip: leave the scene on the trip in hand
  }

  function update(move = true) {
    ({ trip: R, parts: PL } = T.plan(st)); st.step = Math.min(st.step, R.steps.length - 1);
    world.setTrain(true, st.train);
    lv = R.steps.map((s, i) => { const a = i ? R.steps[i - 1].end : 0, on = {};          // the level most of the step's length is walked on (a step may begin lower: the mall's escalators)
      for (let k = 1; k < R.pts.length; k++) { const s0 = Math.max(a, R.cum[k - 1]), s1 = Math.min(s.end, R.cum[k]); if (s1 > s0) { const id = T.levelOf((R.pts[k - 1][1] + R.pts[k][1]) / 2); on[id] = (on[id] || 0) + s1 - s0; } }
      const best = Object.entries(on).sort((x, y) => y[1] - x[1])[0]; return best ? best[0] : T.levelOf(at(a)[1]); });   // (a step with no length: where it stands)
    render(); if (move) look();
  }
  const go = (i) => { st.mode = "go"; st.step = Math.max(0, Math.min(R.steps.length - 1, i)); render(); look(); };
  const play = () => {
    if (st.view === "walk") {                                  // walk on without stopping at each step; the card follows
      if (w.all) { w.all = false; w.hold = true; return render(); }
      if (w.hold && world.fp) { w.hold = false; w.all = true; w.limit = LEN(); w.last = performance.now(); if (!w.raf) w.raf = requestAnimationFrame(frame); return render(); }
      walk(st.step ? R.steps[st.step - 1].end : 0, LEN(), true); return render();
    }
    if (timer) { stopPlay(); render(); return; }
    timer = setInterval(() => { if (st.step >= R.steps.length - 1) { stopPlay(); render(); } else go(st.step + 1); }, 3200); render(); };

  // the sheet's grip and its head also take a pull: up for the whole plan, down for the low sheet
  { let y0 = null; el.addEventListener("pointerdown", (e) => { y0 = e.target.closest(".t2-grab, .t2-head, .t2-line") && st.mode === "plan" ? e.clientY : null; });
    el.addEventListener("pointerup", (e) => { if (y0 === null) return; const dy = e.clientY - y0; y0 = null; const to = dy < -24 ? "full" : dy > 24 ? "low" : null;
      if (to && to !== el.dataset.sheet) { st.sheet = to; st.edit = null; st.list = false; render(); look(); } }); }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !T) return;
    const d = b.dataset;
    if (d.edit) { st.edit = st.edit === d.edit ? null : d.edit; return render(); }
    if (d.train) { st.train = d.train; if (st.via && !T.viaOk(st.train, st.dest, st.via)) st.via = null; st.edit = null; update(); return world.arrive(st.rev ? "ready" : "arrive"); }   // another train: it comes in (the station page's rule)
    if (d.dest) { st.dest = d.dest; if (st.via && !T.viaOk(st.train, st.dest, st.via)) st.via = null; st.edit = null; return update(); }
    if (d.add) { Object.assign(st, T.adds(st.train, st.dest, st.via)[+d.add].set); st.edit = null; return update(); }
    if (d.step) return go(+d.step);
    switch (d.t2) {
      case "close": return close();
      case "swap": st.rev = !st.rev; st.edit = null; update(); return world.arrive(st.rev ? "ready" : "arrive");   // going down to board, the train is in; arriving, it comes in
      case "dropvia": st.via = null; return update();
      case "start": return go(0);
      case "sheet": st.sheet = el.dataset.sheet === "full" ? "low" : "full"; st.edit = null; st.list = false; render(); return look();
      case "playall": return world.arrive(st.rev ? "ready" : "arrive");   // Play before starting, as on the station page: the train comes in, its doors open, the band is laid out
      case "play": return play();
      case "next": stopPlay(); return go(st.step + 1);
      case "prev": stopPlay(); return go(st.step - 1);
      case "plan": stopPlay(); stopWalk(); st.mode = "plan"; st.list = false; render(); return look();
      case "list": st.list = !st.list; return render();
      case "view": stopPlay(); st.view = st.view === "walk" ? "map" : "walk"; render(); return look();
    }
  });

  // each place has its own trains and places: a trip that names none starts from the place's first
  const defaults = () => { if (!T.trains.some((t) => t.id === st.train)) st.train = T.trains[0].id; if (!T.places().some((x) => x.id === st.dest)) st.dest = T.places()[0].id; };
  async function open(init = {}) {
    Object.assign(st, { train: null, dest: null, via: null, rev: false, mode: "plan", step: 0, edit: null, list: false, view: "walk", sheet: "low" }, init);
    if (T) defaults();                                          // opened before: the place is known, so the card can be drawn at once
    el.hidden = false; document.body.classList.add("has-trip2"); render();
    ensure3d?.();
    T = await world.trips();
    if (!T) { el.innerHTML = '<p class="t2-wait">The station could not be built here.</p>'; return; }
    defaults(); update();
    world.arrive(st.mode === "plan" && !st.rev ? "arrive" : "ready");   // opened on a plan: the train comes in, as when the station page opens
  }
  function close() { stopPlay(); stopWalk(); world.setTrain(false); el.hidden = true; document.body.classList.remove("has-trip2"); world.showRoute(null); world.setOpen(false); changed?.(); }
  return { open, close, gotoLevel(id) { const i = lv.indexOf(id); if (i >= 0) { stopPlay(); go(i); } },
    get drive() { return { get s() { return w.s; }, get len() { return R.len; }, get ended() { return w.s >= Math.min(R.len, w.limit) - 0.01; }, set pace(k) { paceK = k; }, look(yaw = 0, pitch = 0, fov = 0) { w.offYaw = yaw; w.offPitch = pitch; filmFov = fov; }, get yaw() { return w.yaw; }, at(s) { return at(s); }, seek(s) { w.s = s; },
      step(dt) { film = dt; cancelAnimationFrame(w.raf); w.hold = false; frame(performance.now()); }, release() { film = 0; paceK = 1; filmFov = 0; w.offYaw = w.offPitch = 0; } }; },
    lookFromAbove() { if (st.mode === "go" && st.view === "walk") { st.view = "map"; render(); look(); } }, get levelsOnTrip() { return new Set(lv); }, get state() { return { ...st, steps: R?.steps.length, time: R?.timeText, len: R && Math.round(R.len) }; }, get isOpen() { return !el.hidden; } };
}

// The level switch (design log of the station guide, step 115): one upright bar on the right, the place's levels from top to
// bottom, short labels. A tap opens the bar to show the full names and how far each is above or below the street; a tap on a
// level then chooses it. The level looked at is marked; during a trip the levels the trip does not pass are faint.
export function createLevelBar({ host, world, pick }) {
  const el = document.createElement("div");
  el.className = "lvl2"; el.hidden = true; el.setAttribute("role", "group"); el.setAttribute("aria-label", "Level");
  host.appendChild(el);
  let wide = false, onTrip = null;
  const rel = (m) => (m === 0 ? "street level" : m > 0 ? `${m} m up` : `${-m} m down`);
  const render = () => {
    el.classList.toggle("wide", wide);
    el.innerHTML = world.levels().map((l) => `<button type="button" data-level="${l.id}" aria-pressed="${l.id === world.levelId}" class="${onTrip && !onTrip.has(l.id) ? "off" : ""}"
      aria-label="${esc(l.name)}, ${rel(l.rel)}"><b>${esc(l.short)}</b>${wide ? `<span>${esc(l.name)}<small>${rel(l.rel)}</small></span>` : ""}</button>`).join("");
  };
  el.addEventListener("click", (e) => { const b = e.target.closest("[data-level]"); if (!b) return;
    if (!wide) { wide = true; return render(); }
    wide = false; pick(b.dataset.level); render(); });
  return { sync(show, trip = null) { el.hidden = !show; onTrip = trip; if (!show) wide = false; else render(); }, get el() { return el; } };
}

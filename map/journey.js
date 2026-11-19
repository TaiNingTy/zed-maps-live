// A route as places: the levels it visits, joined by the vertical moves between them (lift, escalator, stairs).
// The route card lists these as its segments and the step card's progress bar is drawn from them (app.js).

const VERTICAL = new Set(["elevator", "escalator", "stairs"]);

/** Group a route's steps into level stops joined by vertical moves. */
export function buildJourney(route) {
  const stops = [];
  route.steps.forEach((s, i) => {
    // a vertical move is a new stop only when it changes level (outdoor steps on one level, e.g. Low Library's, are not)
    if (VERTICAL.has(s.kind) && stops.length && stops.at(-1).level !== s.level) {
      stops.push({ level: s.level, first: i, last: i, dist: 0, via: { kind: s.kind, step: i } });
      return;
    }
    let cur = stops.at(-1);
    if (!cur || cur.level !== s.level) {
      cur = { level: s.level, first: i, last: i, dist: 0 };
      stops.push(cur);
    }
    cur.last = i;
    cur.dist += s.distance_m || 0;
  });
  return stops;
}

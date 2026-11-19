// Port Authority wayfinding photos and campus plans locate the retail banks.
// Dimensions and the exact landing positions are reconstructed.
const passages = [
  {
    name: "North retail passage", side: -1, liftZ: 37, lifts: [[23, 0]],
    // Port Authority's C1 and C2 photos show a through aisle between the two escalators.
    top: 19, foot: 31.7, openingEnd: 26,
    banks: [-2.4, 2.4].map(x => [{kind: "escalator", x, width: 1.3}]),
  },
  {
    name: "South retail passage", side: 1, liftZ: 40, lifts: [[19, -1.55], [20, 1.55]],
    top: 31.7, foot: 19, openingEnd: 25,
    banks: [
      [{kind: "stairs", x: -4.35, width: 2.2}, {kind: "escalator", x: -2.6, width: 1.3}],
      [{kind: "escalator", x: 2.6, width: 1.3}, {kind: "stairs", x: 4.35, width: 2.2}],
    ],
  },
];

// The southern throat is wider to fit stairs outside the escalators.
export function retailPassageEdge(id, side) {
  if (side < 0) return id === "balcony" ? 4.7368 : 3.486;
  return id === "balcony" ? 7.1053 : 6.957;
}

export const retailCirculation = passages.flatMap(({name, side, liftZ, lifts, banks, foot, top}) => [
  ...banks.flat().map(({kind, x, width}) => ({
    name, kind, width, a: ["main", x, side * foot], b: ["balcony", x, side * top]
  })),
  ...lifts.map(([number, x]) => ({
    name: `Lift ${number}`, kind: "elevator",
    a: ["main", x, side * liftZ], b: ["balcony", x, side * liftZ],
    accessA: ["main", x, side * (liftZ - 3)], accessB: ["balcony", x, side * (liftZ - 3)]
  })),
]);

export const retailCirculationLabels = passages.flatMap(({name, side, liftZ, lifts}) =>
  ["main", "balcony"].flatMap(id => [
    [name, id, -3, side * 19],
    [`Lift ${lifts.map(([number]) => number).join(" / ")}`, id, 0, side * liftZ]
  ])
);

export function fitRetailPassages(floors) {
  const guards = [];
  const walls = [];
  const fitted = floors.map(floor => {
    if (floor.id !== "main" && floor.id !== "balcony") return floor;
    const upper = floor.id === "balcony";
    let ring = floor.ring;
    const holes = [...floor.holes];
    for (const {side, liftZ, lifts, banks, top, foot, openingEnd} of passages) {
      const edge = retailPassageEdge(floor.id, side);
      const openingStart = top + .65 * Math.sign(foot - top);
      // Replace just the center segment of the outside edge. The adjoining
      // retail footprints continue to use the original model seam.
      const seam = ring.map(([x,z], i) => Math.abs(x) === edge && side*z > 16 ? i : -1)
        .filter(i => i >= 0);
      if (seam.length !== 2) continue;
      const [first, last] = seam;
      const end = side * (liftZ + 2.2);
      ring = [...ring.slice(0, first+1), [ring[first][0], end], [ring[last][0], end], ...ring.slice(last)];
      // Enclose the lift lobby where the adjoining shop volumes end.
      walls.push([floor.id, 0, end, 2 * edge, .18]);
      for (const wallSide of [-1, 1]) {
        const back = side === -1 && wallSide === -1 ? 29 : 24;
        const depth = Math.abs(end) - back;
        walls.push([floor.id, wallSide * edge, side * (back + depth / 2), .18, depth]);
      }
      if (!upper) continue;
      for (const bank of banks) {
        const first = bank[0];
        const last = bank.at(-1);
        const left = first.x - first.width / 2;
        const right = last.x + last.width / 2;
        const opening = [[left, side*openingStart], [left, side*openingEnd],
          [right, side*openingEnd], [right, side*openingStart]];
        holes.push(opening);
        guards.push(opening);
      }
      for (const [, x] of lifts) {
        const z = side * liftZ;
        const half = 1.42;
        holes.push([[x-half,z-half],[x-half,z+half],[x+half,z+half],[x+half,z-half]]);
      }
    }
    return {...floor, ring, holes};
  });
  return {floors: fitted, guards, walls};
}

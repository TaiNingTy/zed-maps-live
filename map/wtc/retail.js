import { retailPassageEdge } from "./retail-circulation.js";

export const appleStair = {
  a: ["main", -29, -27.3], b: ["balcony", -29, -18.8],
  kind: "stairs", width: 2.3
};

const halfStair = appleStair.width / 2;
const [,, footZ] = appleStair.a;
const [, stairX, topZ] = appleStair.b;
export const appleOpening = [
  [stairX - halfStair, topZ - .65],
  [stairX - halfStair, footZ - .1],
  [stairX + halfStair, footZ - .1],
  [stairX + halfStair, topZ - .65],
];

// Campus retail directory: Apple occupies the northwest bank on C1 and C2.
// The shop depths, individual demising lines and display fixtures are schematic.
export function addOculusRetail({T, groups, floors, slab, box, guard}) {
  const retail = 0xf2a241;
  const glass = new T.MeshStandardMaterial({
    color: 0xa9d2e2, transparent: true, opacity: .24, depthWrite: false
  });
  const shopVolume = new T.MeshStandardMaterial({
    color: retail, transparent: true, opacity: .34, depthWrite: false
  });
  const appleVolume = new T.MeshStandardMaterial({
    color: 0xeadcc1, transparent: true, opacity: .18, depthWrite: false
  });

  for (const id of ["balcony", "main"]) {
    const parent = groups[id];
    const height = id === "balcony" ? 3.5 : 4.4;
    for (const side of [-1, 1]) {
      // Reuse the outside slab vertices so the storefront thresholds share
      // an edge with the public floor, including on the curved balcony.
      const ring = floors.filter(floor => floor.id === id)
        [id === "balcony" && side === 1 ? 1 : 0].ring;
      const outer = ring.filter(([x, z]) => Math.abs(x) < 38 && side * z > 12)
        .sort(([x1], [x2]) => x1 - x2);
      const edge = [...new Map(outer.map(([x, z]) => [x, z])).entries()];
      const passageEdge = retailPassageEdge(id, side);
      const west = edge.filter(([x]) => x <= -passageEdge);
      const east = edge.filter(([x]) => x >= passageEdge);
      const split = bank => bank.slice(0, -1).map((point, i) => [point, bank[i + 1]]);
      const units = side === -1
        ? [{front: west, apple: true}, ...split(east).map(front => ({front}))]
        : [...split(west), ...split(east)].map(front => ({front}));
      for (const {front, apple} of units) {
        const [left, right] = [front[0][0], front.at(-1)[0]];
        const back = side * (apple ? 29 : 24);
        const outline = [...front, [right, back], [left, back]];
        const upstairs = apple && id === "balcony";
        const floor = slab(id, outline, apple ? 0xd3c8b5 : retail, upstairs ? [appleOpening] : [], .45);
        if (upstairs) guard(id, appleOpening, [appleStair]);
        const mass = new T.Mesh(floor.geometry, apple ? appleVolume : shopVolume);
        mass.position.y = .04;
        if (!apple) {
          // Separate adjacent shells so their transparent side faces do not overlap.
          const center = (left + right) / 2;
          mass.scale.x = 1 - .24 / (right - left);
          mass.position.x = center * (1 - mass.scale.x);
        }
        mass.scale.y = (apple ? .14 : height) / .45;
        parent.add(mass);
        if (!apple) {
          floor.material = shopVolume;
          continue;
        }

        box(parent, (left + right) / 2, height / 2, back, right - left, height, .24, 0xd4cbbd);
        for (const x of [left, right]) {
          const z = x === left ? front[0][1] : front.at(-1)[1];
          const wall = box(parent, x, height / 2, (z + back) / 2, .14, height, Math.abs(z - back), 0xd4cbbd);
          wall.material = glass;
        }
        for (const [[ax, az], [bx, bz]] of split(front)) {
          const length = Math.hypot(bx - ax, bz - az);
          const door = ax < -16 && bx >= -16;
          const y = door ? height - .27 : height / 2;
          const facade = box(parent, (ax + bx) / 2, y, (az + bz) / 2,
            length, door ? .54 : height, .07, 0xa9d2e2);
          facade.rotation.y = -Math.atan2(bz - az, bx - ax);
          facade.material = glass;
          box(parent, ax, height / 2, az, .05, height, .05, 0xc9d0d2);
        }
        for (const x of [-21, -10]) {
          for (const z of [-20, -24]) {
            box(parent, x, .88, z, 2.8, .13, 1.25, 0xd7b482);
            for (const dx of [-1.16, 1.16])
              box(parent, x + dx, .42, z, .10, .84, .92, 0xd7b482);
            for (const dx of [-.72, 0, .72])
              box(parent, x + dx, .968, z, .25, .044, .16, 0x52616a);
          }
        }
        if (!upstairs) box(parent, -8, 1.62, back + .18, 3.6, 1.75, .12, 0x5f7381);
      }
    }
  }
}

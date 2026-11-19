import * as THREE from 'three';

const platformFloor = 'station:platform';
const cross = ([ax, ay], [bx, by]) => ax * by - ay * bx;
const difference = ([ax, ay], [bx, by]) => [ax - bx, ay - by];

// Extend each paid-side endpoint toward the adjacent track, intersecting the actual modeled platform rim.
export function doorJourneys(journeys, floors) {
  const platforms = floors.find(floor => floor.id === platformFloor).zones.filter(zone => zone.name.includes('R/W side platform'));
  return journeys.map(journey => {
    const deck = platforms.find(zone => journey.name.includes(zone.name.split(' · ')[0]));
    const other = platforms.find(zone => zone !== deck);
    const center = zone => zone.shape[0].outer.reduce(([x, y], p, _, ring) => [x + p[0] / ring.length, y + p[1] / ring.length], [0, 0]);
    const direction = difference(center(other), center(deck));
    const end = journey.segments.at(-1).b;
    const ring = deck.shape[0].outer;
    const hits = ring.flatMap((p, i) => {
      const edge = difference(ring[(i + 1) % ring.length], p);
      const denominator = cross(direction, edge);
      if (Math.abs(denominator) < 1e-8) return [];
      const relative = difference(p, end.p);
      const t = cross(relative, edge) / denominator;
      const u = cross(relative, direction) / denominator;
      return t > 0 && u >= 0 && u <= 1 ? [{t, edge}] : [];
    });
    const hit = hits.sort((a, b) => a.t - b.t)[0];
    const threshold = end.p.map((v, i) => v + hit.t * direction[i]);
    const door = {floor: platformFloor, p: threshold};
    return {
      ...journey,
      name: journey.name.replace('Scenario · ', ''),
      doorEdge: hit.edge,
      segments: [...journey.segments, {kind: 'walk', name: 'Step out onto the same-side platform', a: end, b: door}],
    };
  });
}

export function createDoorPreview(parent) {
  const group = new THREE.Group();
  const car = new THREE.Group();
  const camera = new THREE.PerspectiveCamera(65, 1, .035, 450);
  parent.add(group);
  group.add(car);
  const silver = new THREE.MeshStandardMaterial({color: 0xadb8c0, roughness: .55});
  const windows = new THREE.MeshStandardMaterial({color: 0x354757});
  const sill = new THREE.MeshStandardMaterial({color: 0xb4c0c9});
  const box = (material, w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    car.add(mesh);
  };
  // Display one car segment around the open doorway. Local +Z faces the platform.
  box(sill, 12, .18, 2.55, 0, -.09, -1.33);
  box(silver, 12, .18, 2.55, 0, 2.15, -1.33);
  box(silver, 12, 2.1, .1, 0, 1.05, -2.55);
  box(silver, 12, .27, .1, 0, 1.99, -.08);
  for (const side of [-1, 1]) {
    box(silver, 5.35, 1.92, .1, side * 3.325, .96, -.08);
    for (const offset of [1.6, 3.25, 4.85]) box(windows, 1.12, .72, .02, side * offset, 1.31, -.022);
  }
  const arrow = new THREE.Shape();
  arrow.moveTo(-.21, .16);
  arrow.lineTo(0, -.26);
  arrow.lineTo(.21, .16);
  arrow.lineTo(0, .055);
  arrow.closePath();
  const geometry = new THREE.ExtrudeGeometry(arrow, {depth:.045, bevelEnabled:false}).rotateX(-Math.PI / 2);
  const markers = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({color:0x1677ee}), 160);
  markers.frustumCulled = false;
  markers.count = 0;
  group.add(markers);
  const marker = new THREE.Object3D();
  return {
    camera,
    setCarVisible(visible) { car.visible = visible; },
    clearArrows() { markers.count = 0; },
    reset(journey, position, toward, fromDoor) {
      const [x, y] = journey.doorEdge;
      const tangent = new THREE.Vector3(x, 0, -y).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
      if (normal.dot(toward) < 0) normal.negate();
      car.position.copy(position);
      car.rotation.y = Math.atan2(normal.x, normal.z);
      car.visible = fromDoor;
      markers.count = 0;
    },
    draw(segment, point, next, from, run, sample) {
      let count = 0;
      if (run > .5) {
        for (let distance = Math.max(.45, from * run + .4); distance < Math.min(run - .12, from * run + 12) && count < 160; distance += 1.15) {
          const t = distance / run;
          marker.position.copy(sample(t));
          marker.position.y += .055;
          marker.rotation.set(0, Math.atan2(next.x - point.x, next.z - point.z), 0);
          marker.updateMatrix();
          markers.setMatrixAt(count++, marker.matrix);
        }
      }
      markers.count = count;
      markers.instanceMatrix.needsUpdate = true;
    },
  };
}

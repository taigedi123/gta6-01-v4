// Vehicles: 12 drivable cars + 3 boats. Cars have speed/handling/durability;
// boats sail the harbor and marina. Stealing a parked or traffic car is the
// core loop — jacking in front of police raises your wanted level.
import { clamp, dist, makeRng, pick, rand, turnToward, angleDiff } from './util.js';
import { inWater } from './city.js';

export const CAR_DEFS = [
  { id: 'sedan', name: 'Comet Sedan', color: '#c94a4a', top: 330, accel: 260, turn: 2.6, hp: 100, price: 1200, seats: 4 },
  { id: 'taxi', name: 'Bay Taxi', color: '#e8c832', top: 310, accel: 240, turn: 2.6, hp: 100, price: 900, seats: 4 },
  { id: 'coupe', name: 'Stingray Coupe', color: '#3a7ad2', top: 420, accel: 340, turn: 3.1, hp: 90, price: 8500, seats: 2 },
  { id: 'muscle', name: 'Thunder V8', color: '#7a2fa0', top: 400, accel: 380, turn: 2.4, hp: 120, price: 12000, seats: 2 },
  { id: 'suv', name: 'Trailblazer SUV', color: '#4a7a3a', top: 340, accel: 260, turn: 2.3, hp: 150, price: 6500, seats: 5 },
  { id: 'van', name: 'Cargo Van', color: '#d2d2d2', top: 280, accel: 200, turn: 2.1, hp: 160, price: 2200, seats: 3 },
  { id: 'truck', name: 'Hauler Truck', color: '#b06a2a', top: 300, accel: 220, turn: 2.0, hp: 200, price: 4800, seats: 3 },
  { id: 'sport', name: 'Falcon GT', color: '#ff5a1a', top: 470, accel: 420, turn: 3.4, hp: 85, price: 28000, seats: 2 },
  { id: 'limo', name: 'Presidential Limo', color: '#222226', top: 360, accel: 280, turn: 2.0, hp: 180, price: 35000, seats: 6 },
  { id: 'pickup', name: 'Desert Pickup', color: '#8a6a3a', top: 350, accel: 280, turn: 2.4, hp: 150, price: 5200, seats: 3 },
  { id: 'convert', name: 'Sunset Convertible', color: '#ff7ab8', top: 430, accel: 360, turn: 3.2, hp: 80, price: 19000, seats: 2 },
  { id: 'police', name: 'SMPD Interceptor', color: '#1a2a4a', top: 450, accel: 400, turn: 3.3, hp: 160, price: 0, seats: 4 },
];
export const BOAT_DEFS = [
  { id: 'dinghy', name: 'Harbor Dinghy', color: '#e8e0d0', top: 200, accel: 160, turn: 2.0, hp: 80, price: 1500 },
  { id: 'speedboat', name: 'Wave Runner 900', color: '#ff3a3a', top: 420, accel: 380, turn: 3.0, hp: 90, price: 14000 },
  { id: 'yacht', name: 'Golden Gull Yacht', color: '#f0e8d0', top: 260, accel: 180, turn: 1.8, hp: 220, price: 60000 },
];

export function makeVehicle(def, x, y, angle, opts = {}) {
  return {
    ...def, x, y, angle: angle ?? 0, speed: 0, hp: def.hp, maxHp: def.hp,
    kind: opts.kind || 'car', driver: opts.driver || null, // 'player' | 'traffic' | 'police' | null (parked)
    color: opts.color || def.color, smoke: 0, stuck: 0, id2: Math.random().toString(36).slice(2, 8),
  };
}

export function spawnCityVehicles(city, rng) {
  const cars = [];
  // Parked cars along roads.
  for (let i = 0; i < 42; i++) {
    const def = pick(rng, CAR_DEFS.filter(d => d.id !== 'police'));
    const rx = pick(rng, city.roadsV), ry = pick(rng, city.roadsH);
    const horizontal = rng() < 0.5;
    const x = horizontal ? rand(rng, 200, 3400) : rx + (rng() < 0.5 ? 18 : -18);
    const y = horizontal ? ry + (rng() < 0.5 ? 18 : -18) : rand(rng, 200, 2400);
    if (inWater(x, y)) continue;
    cars.push(makeVehicle(def, x, y, horizontal ? 0 : Math.PI / 2));
  }
  // Traffic cars driving on roads.
  for (let i = 0; i < 22; i++) {
    const def = pick(rng, CAR_DEFS.filter(d => d.id !== 'police'));
    const horizontal = rng() < 0.5;
    const rx = pick(rng, city.roadsV), ry = pick(rng, city.roadsH);
    const x = horizontal ? rand(rng, 200, 3400) : rx;
    const y = horizontal ? ry : rand(rng, 200, 2400);
    const v = makeVehicle(def, x, y, horizontal ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2), { driver: 'traffic' });
    v.speed = rand(rng, 90, 170);
    cars.push(v);
  }
  return cars;
}

export function spawnBoats(rng) {
  const boats = [];
  const spots = [
    { x: 3350, y: 300 }, { x: 3450, y: 900 }, { x: 3350, y: 1500 },
    { x: 3450, y: 2100 }, { x: 1150, y: 110 }, { x: 1350, y: 130 },
  ];
  spots.forEach((s, i) => {
    const def = BOAT_DEFS[i % BOAT_DEFS.length];
    boats.push(makeVehicle(def, s.x, s.y, rand(rng, 0, Math.PI * 2), { kind: 'boat' }));
  });
  return boats;
}

// Drive physics shared by player cars, traffic and boats.
export function driveVehicle(v, input, dt, city, isBoat) {
  const forward = input.y < 0 ? 1 : input.y > 0 ? -0.55 : 0;
  const steer = input.x;
  if (forward !== 0) {
    v.speed += forward * v.accel * dt;
    v.speed = clamp(v.speed, -v.top * 0.5, v.top);
  } else {
    v.speed *= Math.pow(0.4, dt);
    if (Math.abs(v.speed) < 4) v.speed = 0;
  }
  const turnRate = v.turn * clamp(Math.abs(v.speed) / 120, 0.25, 1) * (v.speed < 0 ? -1 : 1);
  v.angle += steer * turnRate * dt;
  const nx = v.x + Math.cos(v.angle) * v.speed * dt;
  const ny = v.y + Math.sin(v.angle) * v.speed * dt;
  if (isBoat) {
    if (inWater(nx, ny) || inWater(v.x, ny) || inWater(nx, v.y)) { v.x = nx; v.y = ny; }
    else { v.speed *= 0.4; }
    return 'water';
  }
  const hit = city && city.buildings ? null : null;
  if (city) {
    // Blocked by buildings: slide along the axis that is free.
    const blocked = (x, y) => {
      for (const b of city.buildings) if (x + 14 > b.x && x - 14 < b.x + b.w && y + 10 > b.y && y - 10 < b.y + b.h) return true;
      for (const l of city.landmarks) if (x + 14 > l.x && x - 14 < l.x + l.w && y + 10 > l.y && y - 10 < l.y + l.h) return true;
      return false;
    };
    if (!blocked(nx, v.y)) v.x = nx; else { v.speed *= 0.5; v.hitWall = true; }
    if (!blocked(v.x, ny)) v.y = ny; else { v.speed *= 0.5; v.hitWall = true; }
    v.x = clamp(v.x, 30, 3570); v.y = clamp(v.y, 30, 2570);
  } else { v.x = nx; v.y = ny; }
  return 'road';
}

export function trafficAI(v, dt, city, rng) {
  // Traffic follows its road, slows for cars ahead, turns at intersections.
  const aheadX = v.x + Math.cos(v.angle) * 46, aheadY = v.y + Math.sin(v.angle) * 46;
  const onRoadNow = city.roadsV.some(rx => Math.abs(v.x - rx) < 20) || city.roadsH.some(ry => Math.abs(v.y - ry) < 20);
  let input = { x: 0, y: -1 };
  const atIntersection = city.roadsV.some(rx => Math.abs(v.x - rx) < 24) && city.roadsH.some(ry => Math.abs(v.y - ry) < 24);
  if (atIntersection && rng() < dt * 0.35) {
    // Pick a new heading along a road.
    const opts = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    v.targetAngle = pick(rng, opts);
  }
  if (v.targetAngle !== undefined) {
    const d = angleDiff(v.angle, v.targetAngle);
    if (Math.abs(d) > 0.05) input.x = d > 0 ? 1 : -1;
    else v.targetAngle = undefined;
  }
  driveVehicle(v, input, dt, city, false);
  if (!onRoadNow) { // drifted off-road: steer back toward nearest road
    const nrx = city.roadsV.reduce((a, b) => Math.abs(b - v.x) < Math.abs(a - v.x) ? b : a, city.roadsV[0]);
    const nry = city.roadsH.reduce((a, b) => Math.abs(b - v.y) < Math.abs(a - v.y) ? b : a, city.roadsH[0]);
    const want = Math.abs(nrx - v.x) < Math.abs(nry - v.y)
      ? (nrx > v.x ? 0 : Math.PI) : (nry > v.y ? Math.PI / 2 : -Math.PI / 2);
    v.angle = turnToward(v.angle, want, 1.6 * dt);
  }
  return aheadX;
}

export function nearestVehicle(x, y, list, maxD) {
  let best = null, bd = maxD;
  for (const v of list) {
    const d = dist(x, y, v.x, v.y);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

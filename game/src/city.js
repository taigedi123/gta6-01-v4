// Solmar Bay — the city itself: 12 districts, road grid, buildings, parks,
// the eastern harbor (water you can sail), the metro loop and the casino strip.
import { makeRng, pick, rand, randInt } from './util.js';

export const WORLD_W = 3600;
export const WORLD_H = 2600;

export const DISTRICTS = [
  { name: 'Old Harbor', x: 0, y: 0, w: 900, h: 700, color: '#3d6b8e', tint: '#274b66', desc: 'Docks, cranes and fish markets' },
  { name: 'Marina Bay', x: 900, y: 0, w: 900, h: 700, color: '#2f7f8f', tint: '#1f5a66', desc: 'Yachts, boardwalk and sailboats' },
  { name: 'Casino Row', x: 1800, y: 0, w: 900, h: 700, color: '#8e2f6b', tint: '#5e1f47', desc: 'Neon, slots and high rollers' },
  { name: 'Palm Heights', x: 2700, y: 0, w: 900, h: 700, color: '#7a8e2f', tint: '#54611f', desc: 'Hillside villas and palm avenues' },
  { name: 'Downtown', x: 0, y: 700, w: 900, h: 650, color: '#4a5a7a', tint: '#323e57', desc: 'Glass towers and the bank' },
  { name: 'Market Square', x: 900, y: 700, w: 900, h: 650, color: '#8e6b2f', tint: '#5f4720', desc: 'Bazaars, food stalls and crowds' },
  { name: 'The Strip', x: 1800, y: 700, w: 900, h: 650, color: '#a03d5a', tint: '#6e2a3e', desc: 'Clubs, bars and bright lights' },
  { name: 'University Hill', x: 2700, y: 700, w: 900, h: 650, color: '#3d7a5a', tint: '#2a5440', desc: 'Campus lawns and libraries' },
  { name: 'Junkyard Flats', x: 0, y: 1350, w: 900, h: 600, color: '#6b6b5a', tint: '#48483c', desc: 'Scrap, chop shops and warehouses' },
  { name: 'Little Havana Bay', x: 900, y: 1350, w: 900, h: 600, color: '#c97b2f', tint: '#8a5420', desc: 'Cafes, dominoes and salsa' },
  { name: 'Sunset Beach', x: 1800, y: 1350, w: 900, h: 600, color: '#c9a13d', tint: '#8a6e29', desc: 'Sand, surf shops and lifeguards' },
  { name: 'Airport Fields', x: 2700, y: 1350, w: 900, h: 600, color: '#5a6b7a', tint: '#3d4a55', desc: 'Runway, hangars and cargo' },
  // South band (y 1950-2600) is shared waterfront parkland + the southern docks.
  { name: 'South Docks', x: 0, y: 1950, w: 1800, h: 650, color: '#2f4b6b', tint: '#1f3347', desc: 'Container port and ferries' },
  { name: 'Coral Park', x: 1800, y: 1950, w: 1800, h: 650, color: '#2f7a4a', tint: '#1f5233', desc: 'Gardens, lake and the metro depot' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[0];
}

// The harbor: open water along the whole east edge plus the marina basin.
export const WATER = [
  { x: 3300, y: 0, w: 300, h: 2600 },          // eastern sea
  { x: 900, y: 0, w: 500, h: 220 },            // marina basin
  { x: 2400, y: 2150, w: 500, h: 200 },        // coral lake (park pond, boats allowed in missions)
];
export function inWater(x, y) {
  return WATER.some(w => x >= w.x && x < w.x + w.w && y >= w.y && y < w.y + w.h);
}

// Metro loop: a rectangular elevated line with 6 stations.
export const METRO_STATIONS = [
  { name: 'Harbor Central', x: 450, y: 350 },
  { name: 'Casino Row', x: 2250, y: 350 },
  { name: 'Downtown', x: 450, y: 1025 },
  { name: 'The Strip', x: 2250, y: 1025 },
  { name: 'Beachfront', x: 2250, y: 1650 },
  { name: 'South Docks', x: 450, y: 2275 },
];
export const METRO_PATH = [
  [450, 350], [2250, 350], [2250, 1025], [2250, 1650], [2250, 2275],
  [450, 2275], [450, 1650], [450, 1025],
];

export function buildCity() {
  const rng = makeRng(20261118);
  const buildings = [];
  const trees = [];
  const parks = [];
  // Road grid: vertical roads every 300px, horizontal every ~325px.
  const roadsV = [];
  for (let x = 150; x < WORLD_W - 100; x += 300) roadsV.push(x);
  const roadsH = [];
  for (let y = 150; y < WORLD_H - 100; y += 325) roadsH.push(y);

  // Buildings fill the blocks between roads, skipping water, parks and station plazas.
  for (let gx = 0; gx < roadsV.length - 1; gx++) {
    for (let gy = 0; gy < roadsH.length - 1; gy++) {
      const bx0 = roadsV[gx] + 28, by0 = roadsH[gy] + 28;
      const bx1 = roadsV[gx + 1] - 28, by1 = roadsH[gy + 1] - 28;
      const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
      if (inWater(cx, cy)) continue;
      if (METRO_STATIONS.some(s => Math.hypot(s.x - cx, s.y - cy) < 180)) continue;
      const d = districtAt(cx, cy);
      const roll = rng();
      if (roll < 0.14) { // park / plaza block
        parks.push({ x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0, kind: pick(rng, ['park', 'plaza', 'garden']) });
        for (let t = 0; t < 6; t++) trees.push({ x: rand(rng, bx0 + 10, bx1 - 10), y: rand(rng, by0 + 10, by1 - 10), r: rand(rng, 8, 16) });
        continue;
      }
      const n = roll < 0.55 ? 1 : 2;
      for (let i = 0; i < n; i++) {
        const w = rand(rng, 70, (bx1 - bx0) / n - 12);
        const h = rand(rng, 60, by1 - by0 - 12);
        const x = bx0 + (i * (bx1 - bx0)) / n + rand(rng, 4, 14);
        const y = by0 + rand(rng, 4, 14);
        if (inWater(x + w / 2, y + h / 2)) continue;
        const tall = d.name === 'Downtown' || d.name === 'Casino Row';
        buildings.push({
          x, y, w, h,
          height: tall ? randInt(rng, 3, 9) : randInt(rng, 1, 3),
          color: pick(rng, ['#8a7a66', '#7a6b5a', '#6b7a8a', '#9a8a7a', '#5a6b7a', '#a08a6a', '#7a5a6b']),
          roof: pick(rng, ['#4a3f35', '#3a4a5a', '#5a4a3a', '#2f3a2f']),
          district: d.name,
          neon: d.name === 'Casino Row' || d.name === 'The Strip',
        });
      }
      if (rng() < 0.5) trees.push({ x: rand(rng, bx0, bx1), y: rand(rng, by0, by1), r: rand(rng, 7, 13) });
    }
  }
  // Landmarks: casino, bank, stadium, airport tower, lighthouse.
  const landmarks = [
    { name: 'The Golden Gull Casino', x: 2050, y: 180, w: 260, h: 160, kind: 'casino', color: '#c9a13d' },
    { name: 'Meridian Bank Tower', x: 300, y: 850, w: 180, h: 180, kind: 'bank', color: '#4a5a7a' },
    { name: 'Solmar Stadium', x: 2900, y: 1500, w: 300, h: 200, kind: 'stadium', color: '#7a8e2f' },
    { name: 'Harbor Lighthouse', x: 3350, y: 2400, w: 60, h: 60, kind: 'lighthouse', color: '#e8e0d0' },
    { name: 'City Hall', x: 1050, y: 850, w: 200, h: 140, kind: 'hall', color: '#8a7a66' },
  ];
  return { buildings, trees, parks, roadsV, roadsH, landmarks };
}

export function collidesWithBuildings(x, y, r, city) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  for (const l of city.landmarks) {
    if (x + r > l.x && x - r < l.x + l.w && y + r > l.y && y - r < l.y + l.h) return l;
  }
  return null;
}
export function onRoad(x, y, city) {
  return city.roadsV.some(rx => Math.abs(x - rx) < 16) || city.roadsH.some(ry => Math.abs(y - ry) < 16);
}

// Pedestrians: walkers on sidewalks, shoppers, beachgoers, joggers — they stroll,
// flee gunfire and police chases, and scream (visually) when scared.
import { clamp, dist, makeRng, pick, rand, randInt } from './util.js';
import { collidesWithBuildings, onRoad } from './city.js';

const PED_COLORS = ['#e8b890', '#c98a5a', '#8a5a3a', '#f0d0a0', '#6a4a2a'];
const PED_SHIRTS = ['#d24a4a', '#4a7ad2', '#4ad27a', '#d2c94a', '#9a4ad2', '#4ad2c9', '#e8e8e8', '#3a3a3a'];

export function spawnPeds(city, rng, n = 90) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    const x = rand(rng, 100, 3500), y = rand(rng, 100, 2500);
    peds.push({
      x, y, hp: 50, angle: rand(rng, 0, Math.PI * 2), speed: rand(rng, 28, 62),
      hostile: false, kind: 'ped', radius: 13,
      color: pick(rng, PED_COLORS), shirt: pick(rng, PED_SHIRTS),
      flee: 0, targetX: x, targetY: y, retarget: rand(rng, 0, 4),
      walkPhase: rand(rng, 0, 6), job: pick(rng, ['walker', 'shopper', 'jogger', 'tourist', 'worker']),
    });
  }
  return peds;
}

export function updatePeds(G, dt) {
  const p = G.player;
  for (const ped of G.peds) {
    if (ped.hp <= 0) continue;
    ped.walkPhase += dt * 6;
    const dPlayer = dist(ped.x, ped.y, p.x, p.y);
    // Flee: gunfire nearby, a speeding car, or the player with a weapon out.
    const gunfire = G.bullets.list.length > 0 && G.bullets.list.some(b => dist(b.x, b.y, ped.x, ped.y) < 260);
    const speedingCar = G.cars.some(c => c.driver && Math.abs(c.speed) > 200 && dist(c.x, c.y, ped.x, ped.y) < 120);
    if (gunfire || speedingCar || (dPlayer < 60 && G.weapon && G.weapon.kind !== 'melee' && G.input.mouseDown)) {
      ped.flee = 2.5;
    }
    if (ped.flee > 0) {
      ped.flee -= dt;
      const away = Math.atan2(ped.y - p.y, ped.x - p.x);
      movePed(G, ped, Math.cos(away), Math.sin(away), ped.speed * 2.4, dt);
      continue;
    }
    ped.retarget -= dt;
    if (ped.retarget <= 0 || dist(ped.x, ped.y, ped.targetX, ped.targetY) < 24) {
      ped.retarget = rand(Math.random, 3, 8);
      // Wander along a nearby road or plaza.
      const ang = Math.random() * Math.PI * 2;
      ped.targetX = clamp(ped.x + Math.cos(ang) * rand(Math.random, 80, 260), 60, 3540);
      ped.targetY = clamp(ped.y + Math.sin(ang) * rand(Math.random, 80, 260), 60, 2540);
    }
    const dx = ped.targetX - ped.x, dy = ped.targetY - ped.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = ped.job === 'jogger' ? ped.speed * 1.8 : ped.speed;
    movePed(G, ped, dx / d, dy / d, sp, dt);
    ped.angle = Math.atan2(dy, dx);
  }
  // Remove the dead quietly (they fade as a marker) and top the crowd back up.
  G.peds = G.peds.filter(pd => pd.hp > 0);
  if (G.peds.length < 60) {
    const rng = makeRng(Date.now() % 100000);
    G.peds.push(...spawnPeds(G.city, rng, 8));
  }
}

function movePed(G, ped, dx, dy, speed, dt) {
  const nx = ped.x + dx * speed * dt, ny = ped.y + dy * speed * dt;
  if (!collidesWithBuildings(nx, ped.y, 10, G.city)) ped.x = nx;
  if (!collidesWithBuildings(ped.x, ny, 10, G.city)) ped.y = ny;
  ped.x = clamp(ped.x, 30, 3570); ped.y = clamp(ped.y, 30, 2570);
}

export function drawPeds(ctx, cam, peds) {
  for (const ped of peds) {
    const sx = ped.x - cam.x, sy = ped.y - cam.y;
    if (sx < -40 || sy < -40 || sx > 1320 || sy > 840) continue;
    const bob = Math.sin(ped.walkPhase) * 1.5;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Body.
    ctx.fillStyle = ped.shirt;
    ctx.beginPath(); ctx.arc(sx, sy + bob * 0.3, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.arc(sx, sy - 8 + bob * 0.3, 6, 0, Math.PI * 2); ctx.fill();
    // Direction tick.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(ped.angle) * 12, sy + Math.sin(ped.angle) * 12); ctx.stroke();
    if (ped.flee > 0) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', sx, sy - 20);
    }
  }
}

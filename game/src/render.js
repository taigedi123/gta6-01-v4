// Renderer: draws the whole world top-down — water, sand, grass, roads, parks,
// buildings with height shading, landmarks, vehicles, boats, the player, enemies,
// pickups, the mission marker and day/night + weather overlays.
import { WORLD_W, WORLD_H, districtAt, inWater } from './city.js';
import { clamp } from './util.js';

export function drawWorld(ctx, G) {
  const cam = G.cam;
  const vw = G.view.w, vh = G.view.h;
  const x0 = Math.max(0, cam.x - 60), y0 = Math.max(0, cam.y - 60);
  const x1 = Math.min(WORLD_W, cam.x + vw + 60), y1 = Math.min(WORLD_H, cam.y + vh + 60);
  // Ground: district-tinted blocks.
  ctx.fillStyle = '#2a2a24';
  ctx.fillRect(0, 0, vw, vh);
  const block = 300;
  for (let bx = Math.floor(x0 / block) * block; bx < x1; bx += block) {
    for (let by = Math.floor(y0 / block) * block; by < y1; by += block) {
      const d = districtAt(bx + block / 2, by + block / 2);
      ctx.fillStyle = d.tint;
      ctx.fillRect(bx - cam.x, by - cam.y, block, block);
    }
  }
  // Water.
  for (const w of G.cityWater) {
    ctx.fillStyle = G.night ? '#0e2a4a' : '#2a7ab8';
    ctx.fillRect(w.x - cam.x, w.y - cam.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const wy = w.y + 30 + i * 60 + ((G.time * 12 + i * 37) % 60);
      ctx.beginPath(); ctx.moveTo(w.x - cam.x + 10, wy - cam.y);
      ctx.lineTo(w.x - cam.x + w.w - 10, wy - cam.y); ctx.stroke();
    }
  }
  // Beach sand along the sea edge.
  ctx.fillStyle = '#d8c08a';
  ctx.fillRect(3260 - cam.x, 0, 40, WORLD_H);
  // Parks.
  for (const pk of G.city.parks) {
    if (pk.x + pk.w < x0 || pk.x > x1 || pk.y + pk.h < y0 || pk.y > y1) continue;
    ctx.fillStyle = pk.kind === 'plaza' ? '#9a8a7a' : '#3a7a3a';
    ctx.fillRect(pk.x - cam.x, pk.y - cam.y, pk.w, pk.h);
  }
  // Roads.
  ctx.fillStyle = '#232326';
  for (const rx of G.city.roadsV) ctx.fillRect(rx - 16 - cam.x, 0, 32, WORLD_H);
  for (const ry of G.city.roadsH) ctx.fillRect(0, ry - 16 - cam.y, WORLD_W, 32);
  // Road dashes.
  ctx.fillStyle = '#e8c832';
  for (const rx of G.city.roadsV) for (let y = 0; y < WORLD_H; y += 60) ctx.fillRect(rx - 2 - cam.x, y - cam.y, 4, 26);
  for (const ry of G.city.roadsH) for (let x = 0; x < WORLD_W; x += 60) ctx.fillRect(x - cam.x, ry - 2 - cam.y, 26, 4);
  // Metro track + train (under the world layer so vehicles sit above).
  G.metro.draw(ctx, cam);
  // Trees.
  for (const t of G.city.trees) {
    if (t.x < x0 || t.x > x1 || t.y < y0 || t.y > y1) continue;
    ctx.fillStyle = '#2f6b2f';
    ctx.beginPath(); ctx.arc(t.x - cam.x, t.y - cam.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a8a3a';
    ctx.beginPath(); ctx.arc(t.x - cam.x - 2, t.y - cam.y - 2, t.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // Buildings with fake height shadow.
  for (const b of G.city.buildings) {
    if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(b.x - cam.x + 8, b.y - cam.y + 8 + b.height * 2, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x - cam.x + 5, b.y - cam.y + 5, b.w - 10, b.h - 10);
    // Windows.
    ctx.fillStyle = G.night ? '#ffd94a' : '#bfe8ff';
    const cols = Math.max(1, Math.floor(b.w / 26)), rows = Math.max(1, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 3 + b.height) % 3 === 0) continue;
      ctx.fillRect(b.x - cam.x + 10 + i * 24, b.y - cam.y + 10 + j * 24, 10, 8);
    }
    if (b.neon) {
      ctx.strokeStyle = G.night ? '#ff5ad2' : '#c94a8a'; ctx.lineWidth = 2;
      ctx.strokeRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
    }
  }
  // Landmarks.
  for (const l of G.city.landmarks) {
    if (l.x + l.w < x0 || l.x > x1 || l.y + l.h < y0 || l.y > y1) continue;
    ctx.fillStyle = l.color;
    ctx.fillRect(l.x - cam.x, l.y - cam.y, l.w, l.h);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(l.name, l.x - cam.x + l.w / 2, l.y - cam.y + l.h / 2 + 4);
    if (l.kind === 'casino') {
      ctx.fillStyle = G.night ? '#ff5ad2' : '#ffd94a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('★ GOLDEN GULL ★', l.x - cam.x + l.w / 2, l.y - cam.y - 10);
    }
    if (l.kind === 'lighthouse') {
      ctx.fillStyle = 'rgba(255,255,200,0.5)';
      ctx.beginPath(); ctx.moveTo(l.x - cam.x + 30, l.y - cam.y);
      ctx.lineTo(l.x - cam.x + 200, l.y - cam.y - 60); ctx.lineTo(l.x - cam.x + 200, l.y - cam.y + 60);
      ctx.closePath(); ctx.fill();
    }
  }
  // Mission pickups.
  for (const pk of G.pickups || []) {
    if (pk.taken) continue;
    const sx = pk.x - cam.x, sy = pk.y - cam.y;
    const pulse = 1 + Math.sin(G.time * 5) * 0.15;
    ctx.fillStyle = pk.kind === 'cash' ? '#7aff6a' : '#ffd94a';
    ctx.beginPath(); ctx.arc(sx, sy, 12 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : '!', sx, sy + 4);
  }
  // Mission marker: bouncing arrow + ring.
  const marker = G.missions.marker();
  if (marker) {
    const sx = marker.x - cam.x, sy = marker.y - cam.y;
    const bob = Math.sin(G.time * 4) * 6;
    ctx.strokeStyle = marker.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx, sy, 26 + Math.sin(G.time * 3) * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 52 + bob); ctx.lineTo(sx - 12, sy - 30 + bob); ctx.lineTo(sx + 12, sy - 30 + bob);
    ctx.closePath(); ctx.fill();
  }
  // Race checkpoints.
  const step = G.missions.step();
  if (step && step.type === 'race') {
    step.checkpoints.forEach((cp, i) => {
      const sx = cp[0] - cam.x, sy = cp[1] - cam.y;
      ctx.strokeStyle = i === G.missions.raceCp ? '#ffd94a' : '#888'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = i === G.missions.raceCp ? '#ffd94a' : '#888';
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), sx, sy + 6);
    });
  }
}

export function drawVehicle(ctx, cam, v, isBoat) {
  const sx = v.x - cam.x, sy = v.y - cam.y;
  if (sx < -80 || sy < -80 || sx > 1360 || sy > 880) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(v.angle);
  const len = isBoat ? 52 : v.id === 'truck' || v.id === 'van' || v.id === 'limo' ? 56 : 44;
  const wid = isBoat ? 20 : v.id === 'truck' ? 22 : 20;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
  ctx.fillStyle = v.color;
  roundRect(ctx, -len / 2, -wid / 2, len, wid, 6); ctx.fill();
  // Cabin / windshield.
  ctx.fillStyle = isBoat ? '#f0f0f0' : '#2a3a4a';
  roundRect(ctx, -len / 2 + 8, -wid / 2 + 3, len * 0.4, wid - 6, 3); ctx.fill();
  ctx.fillStyle = '#bfe8ff';
  ctx.fillRect(len / 2 - 10, -wid / 2 + 4, 6, wid - 8);
  // Headlights.
  if (!isBoat) {
    ctx.fillStyle = '#ffe9a0';
    ctx.fillRect(len / 2 - 2, -wid / 2 + 2, 3, 4);
    ctx.fillRect(len / 2 - 2, wid / 2 - 6, 3, 4);
  }
  if (v.driver === 'police') {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(-len / 2 + 2, -wid / 2 + 2, len - 4, 6);
    const blink = Math.floor(G_time() * 6) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3a3a' : '#3a7aff';
    ctx.fillRect(-4, -wid / 2 - 3, 8, 5);
  }
  ctx.restore();
  // Damage smoke + health bar for the player's car.
  if (v.hp < v.maxHp * 0.6) {
    ctx.fillStyle = '#888';
    ctx.fillRect(sx - 20, sy - 24, 40, 4);
    ctx.fillStyle = v.hp < v.maxHp * 0.3 ? '#ff3a3a' : '#ffd94a';
    ctx.fillRect(sx - 20, sy - 24, 40 * (v.hp / v.maxHp), 4);
  }
}
let _t = 0;
function G_time() { return _t; }
export function setRenderTime(t) { _t = t; }

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPlayer(ctx, cam, G) {
  const p = G.player;
  if (p.inVehicle || p.inBoat || p.ridingMetro) return;
  const sx = p.x - cam.x, sy = p.y - cam.y;
  const bob = p.moving ? Math.sin(G.time * 12) * 2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 11, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
  // Body: teal jacket (Mara's signature), jeans, hair.
  ctx.fillStyle = '#1a7a6a';
  ctx.beginPath(); ctx.arc(sx, sy + bob * 0.3, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a4a6a';
  ctx.fillRect(sx - 8, sy + 4, 16, 8);
  ctx.fillStyle = '#e8b890';
  ctx.beginPath(); ctx.arc(sx, sy - 9 + bob * 0.3, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a1a1a';
  ctx.beginPath(); ctx.arc(sx, sy - 11 + bob * 0.3, 6.5, Math.PI, 0); ctx.fill();
  // Gun in hand when armed.
  if (G.weapon && G.weapon.kind !== 'melee') {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(p.aimAngle) * 18, sy + Math.sin(p.aimAngle) * 18); ctx.stroke();
  } else if (G.weapon && G.weapon.id !== 'fists') {
    ctx.strokeStyle = '#c9a13d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(p.aimAngle) * 16, sy + Math.sin(p.aimAngle) * 16); ctx.stroke();
  }
  if (p.hurtFlash > 0) {
    ctx.fillStyle = 'rgba(255,40,40,0.35)';
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
  }
  if (p.swim) {
    ctx.strokeStyle = '#bfe8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawEnemies(ctx, cam, G) {
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    const sx = e.x - cam.x, sy = e.y - cam.y;
    if (sx < -40 || sy < -40 || sx > 1320 || sy > 840) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8b890';
    ctx.beginPath(); ctx.arc(sx, sy - 8, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(e.angle) * 16, sy + Math.sin(e.angle) * 16); ctx.stroke();
    // HP bar.
    ctx.fillStyle = '#333'; ctx.fillRect(sx - 14, sy - 22, 28, 4);
    ctx.fillStyle = '#ff3a3a'; ctx.fillRect(sx - 14, sy - 22, 28 * clamp(e.hp / 100, 0, 1), 4);
  }
}

// Day/night + weather overlay: a translucent tint + rain streaks.
export function drawAtmosphere(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  if (G.night) {
    ctx.fillStyle = 'rgba(8,12,40,0.44)';
    ctx.fillRect(0, 0, vw, vh);
  } else if (G.weather === 'sunset') {
    ctx.fillStyle = 'rgba(255,120,40,0.10)';
    ctx.fillRect(0, 0, vw, vh);
  }
  if (G.weather === 'rain') {
    ctx.strokeStyle = 'rgba(180,210,255,0.4)'; ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const x = (i * 137 + G.time * 900) % vw;
      const y = (i * 89 + G.time * 1400) % vh;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); ctx.stroke();
    }
  }
}

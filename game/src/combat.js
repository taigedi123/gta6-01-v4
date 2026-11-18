// Combat: 9 weapons, bullets, melee, enemy health, weapon pickups and the gun shop.
import { clamp, dist } from './util.js';

export const WEAPON_DEFS = [
  { id: 'fists', name: 'Fists', damage: 12, rate: 0.35, range: 34, speed: 0, spread: 0, ammo: Infinity, price: 0, kind: 'melee', color: '#d8b890' },
  { id: 'bat', name: 'Aluminum Bat', damage: 26, rate: 0.5, range: 46, speed: 0, spread: 0, ammo: Infinity, price: 150, kind: 'melee', color: '#c9a13d' },
  { id: 'knife', name: 'Harbor Knife', damage: 34, rate: 0.4, range: 38, speed: 0, spread: 0, ammo: Infinity, price: 300, kind: 'melee', color: '#c0c8d0' },
  { id: 'pistol', name: 'P9 Pistol', damage: 22, rate: 0.28, range: 420, speed: 780, spread: 0.05, ammo: 120, price: 600, kind: 'gun', color: '#3a3a42' },
  { id: 'smg', name: 'Stinger SMG', damage: 15, rate: 0.09, range: 380, speed: 820, spread: 0.12, ammo: 240, price: 2400, kind: 'gun', color: '#2a2a32' },
  { id: 'shotgun', name: 'Boomstick 12G', damage: 16, rate: 0.85, range: 260, speed: 640, spread: 0.22, ammo: 40, price: 3200, kind: 'gun', pellets: 6, color: '#6a3a2a' },
  { id: 'rifle', name: 'AR-77 Rifle', damage: 34, rate: 0.13, range: 620, speed: 1100, spread: 0.04, ammo: 180, price: 6800, kind: 'gun', color: '#2f4a2f' },
  { id: 'sniper', name: 'Longshot .50', damage: 95, rate: 1.1, range: 900, speed: 1500, spread: 0.005, ammo: 20, price: 12000, kind: 'gun', color: '#1a1a22' },
  { id: 'rpg', name: 'Boom Tube RPG', damage: 130, rate: 1.6, range: 700, speed: 420, spread: 0.01, ammo: 8, price: 20000, kind: 'explosive', color: '#4a2a1a' },
];

export function makeWeapons() {
  return WEAPON_DEFS.map(d => ({ ...d, owned: d.id === 'fists' || d.id === 'pistol', ammoLeft: d.ammo }));
}
export function weaponById(list, id) { return list.find(w => w.id === id); }

export class Bullets {
  constructor() { this.list = []; }
  fire(x, y, angle, weapon, owner) {
    const pellets = weapon.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const a = angle + (Math.random() - 0.5) * weapon.spread * 2;
      this.list.push({
        x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20,
        vx: Math.cos(a) * weapon.speed, vy: Math.sin(a) * weapon.speed,
        damage: weapon.damage, range: weapon.range, traveled: 0,
        owner, explosive: weapon.kind === 'explosive', color: weapon.id === 'rpg' ? '#ff7a2a' : '#ffe9a0',
      });
    }
    if (this.list.length > 200) this.list.splice(0, this.list.length - 200);
  }
  update(dt, G) {
    for (const b of this.list) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.traveled += Math.hypot(b.vx, b.vy) * dt;
      // Hit a building?
      const hitB = G.city.buildings.some(bd => b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h);
      if (hitB || b.traveled > b.range || b.x < 0 || b.y < 0 || b.x > 3600 || b.y > 2600) b.dead = true;
      if (b.dead) continue;
      if (b.explosive) {
        // RPG: splash damage to nearby enemies and vehicles.
        const boom = (list, dmg, isPed) => {
          for (const t of list) {
            if (t.hp <= 0) continue;
            if (dist(b.x, b.y, t.x, t.y) < 90) { t.hp -= dmg; if (isPed) G.particles.blood(t.x, t.y); }
          }
        };
        if (b.traveled > b.range * 0.55 || G.peds.some(p => p.hp > 0 && dist(b.x, b.y, p.x, p.y) < 22)) {
          boom(G.peds, 130, true); boom(G.enemies, 130, true); boom(G.cars, 160, false);
          G.particles.burst(b.x, b.y, '#ff7a2a', 26); G.particles.smoke(b.x, b.y);
          G.sounds._noise(0.4, 0.9, 600);
          b.dead = true; continue;
        }
      }
      // Hit enemies / hostile peds / cops.
      const targets = [...G.enemies, ...G.peds.filter(p => p.hostile), ...G.cops];
      for (const t of targets) {
        if (t.hp <= 0) continue;
        if (dist(b.x, b.y, t.x, t.y) < (t.radius || 16)) {
          t.hp -= b.damage;
          G.particles.blood(t.x, t.y);
          if (b.owner === 'player') { G.stats.hits++; if (t.hp <= 0) G.stats.kills++; }
          b.dead = true; break;
        }
      }
      if (b.dead) continue;
      // Hit the player (enemy bullets only).
      if (b.owner !== 'player' && G.player.hp > 0 && dist(b.x, b.y, G.player.x, G.player.y) < 15) {
        G.player.hp -= b.damage; G.player.hurtFlash = 0.25; G.sounds.hit();
        b.dead = true;
      }
    }
    this.list = this.list.filter(b => !b.dead);
  }
  draw(ctx, cam) {
    for (const b of this.list) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - cam.x - 3, b.y - cam.y - 1.5, 7, 3);
    }
  }
}

// Melee swing: damages the nearest hostile in range in front of the player.
export function meleeSwing(G, weapon) {
  const p = G.player;
  const targets = [...G.enemies, ...G.peds.filter(x => x.hostile), ...G.cops];
  let best = null, bd = weapon.range;
  for (const t of targets) {
    if (t.hp <= 0) continue;
    const d = dist(p.x, p.y, t.x, t.y);
    if (d < bd) { bd = d; best = t; }
  }
  if (best) {
    best.hp -= weapon.damage;
    G.particles.blood(best.x, best.y);
    G.stats.hits++;
    if (best.hp <= 0) G.stats.kills++;
    return true;
  }
  return false;
}

// Police: wanted stars, cop cars that ram and roadblock, foot cops that chase
// and arrest, and a helicopter at 4+ stars. Wanted decays when you stay hidden.
import { clamp, dist, angleTo, turnToward, rand } from './util.js';
import { makeVehicle, CAR_DEFS } from './vehicles.js';
import { driveVehicle } from './vehicles.js';

export function makeCop(x, y, onFoot) {
  return { x, y, hp: 80, angle: 0, speed: onFoot ? 175 : 0, hostile: true, kind: 'cop',
    radius: 14, color: '#1a2a4a', shirt: '#22355e', onFoot: !!onFoot, fireCooldown: 0, arrest: 0 };
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Spawn pressure scales with wanted level.
  const wantCops = G.wanted === 0 ? 0 : G.wanted <= 1 ? 2 : G.wanted <= 2 ? 4 : G.wanted <= 3 ? 6 : G.wanted <= 4 ? 8 : 10;
  const wantCars = G.wanted >= 2 ? Math.min(4, G.wanted - 1) : 0;
  // Foot cops.
  while (G.cops.length < wantCops) {
    const a = Math.random() * Math.PI * 2;
    const d = 420 + Math.random() * 260;
    G.cops.push(makeCop(clamp(p.x + Math.cos(a) * d, 40, 3560), clamp(p.y + Math.sin(a) * d, 40, 2560), true));
  }
  if (G.cops.length > wantCops) G.cops.splice(wantCops);
  // Cop cars.
  const copCars = G.cars.filter(c => c.driver === 'police');
  while (copCars.length < wantCars) {
    const a = Math.random() * Math.PI * 2;
    const d = 500 + Math.random() * 300;
    const def = CAR_DEFS.find(d2 => d2.id === 'police');
    const car = makeVehicle(def, clamp(p.x + Math.cos(a) * d, 60, 3540), clamp(p.y + Math.sin(a) * d, 60, 2540), 0, { driver: 'police' });
    G.cars.push(car); copCars.push(car);
  }
  // Helicopter at 4+ stars.
  if (G.wanted >= 4 && !G.heli) G.heli = { x: p.x + 300, y: p.y - 300, angle: 0, hp: 300, search: 0 };
  if (G.wanted < 4) G.heli = null;
  if (G.heli) {
    const h = G.heli;
    h.angle = angleTo(h.x, h.y, p.x, p.y);
    h.x += Math.cos(h.angle) * 190 * dt; h.y += Math.sin(h.angle) * 190 * dt;
    h.search += dt;
    if (h.search > 2.5) { h.search = 0; G.sounds.siren(); }
    // Spotlight + occasional shots at the player.
    if (dist(h.x, h.y, p.x, p.y) < 420 && Math.random() < dt * 0.7 && p.hp > 0 && G.grace <= 0) {
      const w = { damage: 8, speed: 900, range: 500, spread: 0.1, pellets: 1 };
      G.bullets.fire(h.x, h.y, angleTo(h.x, h.y, p.x, p.y), w, 'heli');
    }
    if (h.hp <= 0) { G.particles.burst(h.x, h.y, '#ff7a2a', 40); G.heli = null; G.money += 500; G.stats.kills++; }
  }

  // Foot cop AI: chase, shoot in range, arrest when touching a slow player.
  for (const c of G.cops) {
    if (c.hp <= 0) continue;
    const d = dist(c.x, c.y, p.x, p.y);
    const ang = angleTo(c.x, c.y, p.x, p.y);
    c.angle = ang;
    c.fireCooldown -= dt;
    if (d > 26) {
      c.x += Math.cos(ang) * c.speed * dt;
      c.y += Math.sin(ang) * c.speed * dt;
    } else if (p.onFoot && Math.abs(p.speed || 0) < 40 && G.grace <= 0) {
      // Busted! Lose wanted, pay a fine, respawn at the station.
      c.arrest += dt;
      if (c.arrest > 1.2) { busted(G); return; }
    }
    if (d < 380 && d > 60 && c.fireCooldown <= 0 && p.hp > 0 && G.grace <= 0) {
      c.fireCooldown = 1.1 + Math.random() * 0.6;
      G.bullets.fire(c.x, c.y, ang + (Math.random() - 0.5) * 0.16, { damage: 7, speed: 800, range: 420, spread: 0.08, pellets: 1 }, 'cop');
      G.sounds.shoot('pistol');
    }
  }
  G.cops = G.cops.filter(c => c.hp > 0);

  // Cop car AI: ram the player's car, or chase on foot.
  for (const car of copCars) {
    if (car.hp <= 0) { car.driver = null; continue; }
    const target = p.inVehicle ? p.inVehicle : p;
    const ang = angleTo(car.x, car.y, target.x, target.y);
    const d = angleTo(car.x, car.y, target.x, target.y) - car.angle;
    let dd = d; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2;
    const input = { x: clamp(dd * 2.2, -1, 1), y: -1 };
    driveVehicle(car, input, dt, G.city, false);
    if (dist(car.x, car.y, target.x, target.y) < 46) {
      // Ram! (cooldown so one touch does not melt a car in a second)
      car.ramCd = (car.ramCd || 0) - dt;
      if (car.ramCd <= 0 && G.grace <= 0) {
        car.ramCd = 0.9;
        if (p.inVehicle) { p.inVehicle.hp -= 6; G.sounds.crash(); G.particles.burst(car.x, car.y, '#ffb84a', 5); }
        else { p.hp -= 6; p.hurtFlash = 0.3; }
      }
      car.speed *= 0.4;
    }
    if (Math.random() < dt * 0.25) G.sounds.siren();
  }
  // Wanted decay: hide for a while and the heat fades.
  if (G.wanted > 0) {
    const nearCop = G.cops.some(c => dist(c.x, c.y, p.x, p.y) < 320) || copCars.some(c => dist(c.x, c.y, p.x, p.y) < 380);
    G.hiddenTimer = nearCop ? 0 : G.hiddenTimer + dt;
    if (G.hiddenTimer > 14) { G.wanted--; G.hiddenTimer = 0; G.sounds.pickup(); }
  } else G.hiddenTimer = 0;
}

function busted(G) {
  const fine = Math.min(G.money, 300);
  G.money -= fine;
  G.wanted = 0; G.cops = []; G.heli = null;
  G.cars.forEach(c => { if (c.driver === 'police') c.driver = null; });
  G.player.hp = Math.max(50, G.player.hp);
  G.player.x = 450; G.player.y = 1025; // SMPD station, Downtown
  if (G.player.inVehicle) { G.player.inVehicle.driver = null; G.player.inVehicle = null; G.player.onFoot = true; }
  G.banner = { text: 'BUSTED!  Fine ' + '$' + fine + ' — released at SMPD HQ', t: 3.5, color: '#4a7ad2' };
  G.sounds.missionFail();
}

export function drawPolice(ctx, cam, G) {
  for (const c of G.cops) {
    const sx = c.x - cam.x, sy = c.y - cam.y;
    if (sx < -40 || sy < -40 || sx > 1320 || sy > 840) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(sx, sy + 10, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22355e';
    ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8c832';
    ctx.fillRect(sx - 10, sy - 3, 20, 5); // badge stripe
    ctx.fillStyle = '#e8b890';
    ctx.beginPath(); ctx.arc(sx, sy - 9, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a2a4a';
    ctx.fillRect(sx - 6, sy - 16, 12, 4); // cap
  }
  if (G.heli) {
    const h = G.heli, sx = h.x - cam.x, sy = h.y - cam.y;
    // Searchlight cone.
    ctx.save();
    ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff8c0';
    ctx.beginPath(); ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, 260, h.angle - 0.25, h.angle + 0.25); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#22355e';
    ctx.beginPath(); ctx.ellipse(sx, sy, 22, 12, h.angle, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#22355e'; ctx.lineWidth = 3;
    const rot = performance.now() / 40;
    ctx.beginPath(); ctx.moveTo(sx - Math.cos(rot) * 26, sy - Math.sin(rot) * 26);
    ctx.lineTo(sx + Math.cos(rot) * 26, sy + Math.sin(rot) * 26); ctx.stroke();
    ctx.fillStyle = '#ff3a3a';
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
  }
}

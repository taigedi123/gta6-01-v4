// The player: Mara Quinn — on foot movement, entering/exiting cars and boats,
// health/armor, sprint, aiming with the mouse, and the wanted-level heat.
import { clamp, dist, makeRng } from './util.js';
import { inWater, collidesWithBuildings } from './city.js';
import { nearestVehicle } from './vehicles.js';

export function makePlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, hp: 100, maxHp: 100, armor: 0,
    inVehicle: null, inBoat: null, onFoot: true, sprint: 1,
    fireCooldown: 0, hurtFlash: 0, swim: false, radius: 14,
    aimAngle: 0, moving: false,
  };
}

export function updatePlayer(G, dt) {
  const p = G.player, input = G.input;
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);
  // Aim at the mouse (screen -> world).
  p.aimAngle = Math.atan2(input.mouseY + G.cam.y - p.y, input.mouseX + G.cam.x - p.x);

  if (p.inVehicle) { updateDriving(G, dt); return; }
  if (p.inBoat) { updateBoating(G, dt); return; }

  const mv = input.moveVec();
  const sprinting = input.down('shift') && (mv.x || mv.y);
  const speed = sprinting ? 235 : 150;
  p.moving = !!(mv.x || mv.y);
  if (p.moving) p.angle = Math.atan2(mv.y, mv.x);
  const nx = p.x + mv.x * speed * dt;
  const ny = p.y + mv.y * speed * dt;
  // Swim in the harbor (slow), blocked by buildings on land.
  if (inWater(nx, ny)) { p.swim = true; p.x = nx; p.y = ny; }
  else {
    p.swim = false;
    if (!collidesWithBuildings(nx, p.y, 12, G.city)) p.x = nx;
    if (!collidesWithBuildings(p.x, ny, 12, G.city)) p.y = ny;
  }
  p.x = clamp(p.x, 20, 3580); p.y = clamp(p.y, 20, 2580);

  // Enter / exit vehicles.
  if (input.hit('e')) {
    const car = nearestVehicle(p.x, p.y, G.cars, 64);
    const boat = nearestVehicle(p.x, p.y, G.boats, 70);
    const target = boat && (!car || dist(p.x, p.y, boat.x, boat.y) < dist(p.x, p.y, car.x, car.y)) ? boat : car;
    if (target) {
      if (target.driver === 'traffic') { // jack the driver out
        G.peds.push(makeBystander(G, target.x + 30, target.y));
        target.driver = 'player';
        G.stats.carsStolen++;
        G.money += 0;
        if (G.wanted < 2 && nearbyCop(G, 420)) addWanted(G, 1);
        G.sounds.pickup();
      } else if (!target.driver) {
        target.driver = 'player';
        G.stats.carsStolen++;
        G.sounds.pickup();
      }
      if (target.kind === 'boat') { p.inBoat = target; p.onFoot = false; }
      else { p.inVehicle = target; p.onFoot = false; }
    } else if (inWater(p.x, p.y)) {
      // nothing to board
    }
  }
  // Fire weapon.
  if (input.mouseDown && p.fireCooldown <= 0 && G.weapon) {
    fireWeapon(G);
  }
  if (input.hit('q')) cycleWeapon(G);
  if (input.hit('r')) reloadWeapon(G);
}

function makeBystander(G, x, y) {
  return { x, y, hp: 50, angle: 0, speed: 60, hostile: false, kind: 'ped', radius: 13, color: '#c9a13d', flee: 1 };
}

function nearbyCop(G, r) { return G.cops.some(c => dist(G.player.x, G.player.y, c.x, c.y) < r); }
export function addWanted(G, n) {
  G.wanted = clamp(G.wanted + n, 0, 5);
  if (G.wanted >= 1) G.sounds.siren();
}

function updateDriving(G, dt) {
  const p = G.player, v = p.inVehicle, input = G.input;
  const mv = input.moveVec();
  const res = (function () {
    // inline drive: reuse vehicles.driveVehicle via dynamic import-free call
    return G.driveCar(v, mv, dt);
  })();
  p.x = v.x; p.y = v.y; p.angle = v.angle;
  if (v.hitWall) { G.sounds.crash(); G.particles.burst(v.x, v.y, '#ffb84a', 6); v.hitWall = false; v.hp -= 2; }
  if (v.hp < 40) { v.smoke += dt; if (v.smoke > 0.4) { G.particles.smoke(v.x, v.y); v.smoke = 0; } }
  if (v.hp <= 0) { // car explodes, player bails out
    G.particles.burst(v.x, v.y, '#ff7a2a', 30); G.sounds.crash();
    v.driver = null; v.hp = 0; p.inVehicle = null; p.onFoot = true;
    p.x = v.x + 40; p.y = v.y; p.hp -= 15;
  }
  if (input.hit('e')) { // get out
    p.inVehicle = null; p.onFoot = true;
    v.driver = null; v.speed = 0;
    p.x = v.x + Math.cos(v.angle + Math.PI / 2) * 34;
    p.y = v.y + Math.sin(v.angle + Math.PI / 2) * 34;
  }
  if (input.hit(' ')) { /* handbrake */ v.speed *= 0.6; }
}

function updateBoating(G, dt) {
  const p = G.player, b = p.inBoat, input = G.input;
  const mv = input.moveVec();
  G.driveBoat(b, mv, dt);
  p.x = b.x; p.y = b.y; p.angle = b.angle;
  if (Math.random() < dt * 8) G.particles.spray(b.x - Math.cos(b.angle) * 20, b.y - Math.sin(b.angle) * 20);
  if (input.hit('e')) {
    p.inBoat = null; p.onFoot = true; b.driver = null; b.speed = 0;
    // Step onto the nearest shore.
    p.x = b.x - 40; p.y = b.y;
    if (inWater(p.x, p.y)) { p.x = b.x + 40; }
  }
}

export function fireWeapon(G) {
  const w = G.weapon, p = G.player;
  if (!w) return;
  if (w.ammo !== Infinity && w.ammoLeft <= 0) { G.sounds.hit(); return; }
  p.fireCooldown = w.rate;
  if (w.kind === 'melee') {
    G.sounds._tone(300, 0.08, 'square', 0.2, 0, 120);
    // melee handled by combat.meleeSwing in main loop via flag
    G.meleePending = w;
    return;
  }
  w.ammoLeft = w.ammo === Infinity ? Infinity : w.ammoLeft - 1;
  G.bullets.fire(p.x, p.y, p.aimAngle, w, 'player');
  G.particles.muzzle(p.x, p.y, p.aimAngle);
  G.sounds.shoot(w.id === 'shotgun' ? 'shotgun' : w.id === 'rifle' || w.id === 'sniper' ? 'rifle' : 'pistol');
  G.stats.shots++;
  if (w.id === 'rpg') G.sounds._noise(0.3, 0.7, 800);
}

export function cycleWeapon(G) {
  const owned = G.weapons.filter(w => w.owned);
  if (!owned.length) return;
  const i = owned.indexOf(G.weapon);
  G.weapon = owned[(i + 1) % owned.length];
  G.sounds.pickup();
}
export function reloadWeapon(G) {
  const w = G.weapon;
  if (!w || w.ammo === Infinity) return;
  w.ammoLeft = w.ammo; G.sounds.pickup();
}

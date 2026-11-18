// Solmar Bay — main loop: game state, update, draw, menus and interactions.
// Mara Quinn's open world: 15 missions, 12 districts, 12 cars, 3 boats, casino,
// metro, properties, 5-star wanted, day/night + weather.
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { Particles } from './particles.js';
import { buildCity, WATER, districtAt } from './city.js';
import { spawnCityVehicles, spawnBoats, driveVehicle, nearestVehicle, trafficAI } from './vehicles.js';
import { makePlayer, updatePlayer, addWanted } from './player.js';
import { spawnPeds, updatePeds, drawPeds } from './pedestrians.js';
import { updatePolice, drawPolice } from './police.js';
import { MissionRunner, MISSIONS } from './missions.js';
import { Bullets, meleeSwing, makeWeapons } from './combat.js';
import { Casino, collectRent, buyWeapon, buyAmmo, buyArmor, buyHealth, buyProperty, PROPERTIES } from './economy.js';
import { Metro } from './metro.js';
import { makeRng, clamp, dist } from './util.js';
import { drawWorld, drawVehicle, drawPlayer, drawEnemies, drawAtmosphere, setRenderTime } from './render.js';
import { drawHUD, drawTitle, drawPause, drawShop, drawCasino, drawProperties } from './hud.js';
import { applyScene } from './scenes.js';
import { readSave, writeSave, snapshotState, applySave } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const params = new URLSearchParams(location.search);
const sceneParam = params.get('scene');

const G = {
  view: { w: canvas.width, h: canvas.height },
  cam: { x: 0, y: 0 },
  time: 0, mode: 'title', // title | play | pause | shop | casino | properties | help
  city: null, cityWater: WATER,
  player: null, cars: [], boats: [], peds: [], cops: [], enemies: [], pickups: [],
  bullets: new Bullets(), particles: new Particles(), sounds: new SoundBank(),
  input: new Input(canvas),
  missions: null, weapons: makeWeapons(), weapon: null,
  money: 500, respect: 0, wanted: 0, hiddenTimer: 0, heli: null,
  missionIndex: 0, missionsDone: 0,
  stats: { kills: 0, shots: 0, hits: 0, carsStolen: 0, playSeconds: 0, casinoWon: 0, casinoSession: 0 },
  ownedCars: [], properties: [], rentTimer: 0,
  night: false, weather: 'clear', clockLabel: '09:00', dayMinutes: 9 * 60,
  banner: null, shopMsg: '', meleePending: null, raceTimer: 0,
  metro: new Metro(), casino: new Casino(), garageCars: [],
  driveCar(v, mv, dt) { return driveVehicle(v, mv, dt, this.city, false); },
  driveBoat(b, mv, dt) { return driveVehicle(b, mv, dt, this.city, true); },
};

function initWorld() {
  const rng = makeRng(20261118);
  G.city = buildCity();
  G.cars = spawnCityVehicles(G.city, rng);
  G.boats = spawnBoats(rng);
  G.peds = spawnPeds(G.city, rng, 90);
  G.player = makePlayer(1150, 980); // Sal's garage, Market Square
  G.missions = new MissionRunner(G);
  G.weapon = G.weapons.find(w => w.id === 'pistol');
  // Cash pickups scattered around the city.
  for (let i = 0; i < 14; i++) {
    G.pickups.push({ x: 200 + Math.random() * 3200, y: 200 + Math.random() * 2200, kind: 'cash', taken: false });
  }
  // Health + armor pickups near landmarks.
  G.pickups.push({ x: 500, y: 400, kind: 'health', taken: false });
  G.pickups.push({ x: 2300, y: 1000, kind: 'armor', taken: false });
  G.pickups.push({ x: 1300, y: 1600, kind: 'health', taken: false });
  G.cam.x = G.player.x - G.view.w / 2;
  G.cam.y = G.player.y - G.view.h / 2;
}
initWorld();
applyScene(G, sceneParam);
if (sceneParam === 'start') G.mode = 'title';

function startGame() {
  G.mode = 'play';
  G.sounds.ensure();
}

function update(dt) {
  G.time += dt;
  setRenderTime(G.time);
  G.stats.playSeconds += dt;
  if (G.grace > 0) G.grace -= dt;
  // Day clock: 1 game-hour per 100 real seconds; night 20:00–06:00.
  G.dayMinutes = (G.dayMinutes + dt * 0.6) % (24 * 60);
  const hh = Math.floor(G.dayMinutes / 60), mm = Math.floor(G.dayMinutes % 60);
  G.clockLabel = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  G.night = hh >= 20 || hh < 6;
  // Weather changes slowly.
  if (Math.random() < dt * 0.002) {
    G.weather = G.weather === 'clear' ? (Math.random() < 0.5 ? 'rain' : 'sunset') : 'clear';
  }
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  G.sounds.tickMusic(dt);
  collectRent(G, dt);

  updatePlayer(G, dt);
  // Melee swings resolve here.
  if (G.meleePending) { meleeSwing(G, G.meleePending); G.meleePending = null; }
  for (const car of G.cars) {
    if (car.driver === 'traffic') trafficAI(car, dt, G.city, Math.random);
    if (car.hp <= 0 && car.driver === 'traffic') car.driver = null;
  }
  updatePeds(G, dt);
  updatePolice(G, dt);
  updateEnemies(G, dt);
  G.bullets.update(dt, G);
  G.particles.update(dt);
  G.metro.update(dt, G);
  G.missions.update(dt);

  // Pickups.
  const p = G.player;
  for (const pk of G.pickups) {
    if (pk.taken) continue;
    if (dist(p.x, p.y, pk.x, pk.y) < 30) {
      pk.taken = true;
      if (pk.kind === 'cash') { const v = 50 + Math.floor(Math.random() * 150); G.money += v; G.sounds.cash(); G.banner = { text: 'Found $' + v + ' cash', t: 2, color: '#7aff6a' }; }
      if (pk.kind === 'health') { p.hp = p.maxHp; G.sounds.pickup(); G.banner = { text: 'Health restored', t: 2, color: '#7aff6a' }; }
      if (pk.kind === 'armor') { p.armor = 100; G.sounds.pickup(); G.banner = { text: 'Body armor +100', t: 2, color: '#4ad2ff' }; }
      if (pk.kind === 'mission') { G.missions.collected++; G.sounds.pickup(); }
    }
  }
  // Health regen slowly out of combat.
  if (p.hp > 0 && p.hp < p.maxHp && G.wanted === 0) p.hp = Math.min(p.maxHp, p.hp + dt * 1.5);
  // Armor absorbs damage first (applied in damage sites via hurtFlash path).
  if (p.hp <= 0) {
    // Wasted: lose some cash, respawn at the hospital.
    G.money = Math.max(0, G.money - 200);
    p.hp = 100; p.x = 1300; p.y = 1000; p.y = 1000;
    if (p.inVehicle) { p.inVehicle.driver = null; p.inVehicle = null; p.onFoot = true; }
    if (p.inBoat) { p.inBoat.driver = null; p.inBoat = null; p.onFoot = true; }
    G.wanted = Math.max(0, G.wanted - 1);
    G.missions.fail('Mara was wasted — respawned at the hospital.');
    G.banner = { text: 'WASTED!  -$200 — woke up at Solmar General', t: 4, color: '#ff5a5a' };
    G.sounds.missionFail();
  }
  // Camera follows the player, clamped to the world.
  const tx = clamp(p.x - G.view.w / 2, 0, 3600 - G.view.w);
  const ty = clamp(p.y - G.view.h / 2, 0, 2600 - G.view.h);
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 5);

  // Interactions: E near casino / gun shop / garage / property office.
  if (G.input.hit('e') && p.onFoot) {
    if (dist(p.x, p.y, 2180, 260) < 130) { G.mode = 'casino'; G.sounds.ensure(); }
    else if (dist(p.x, p.y, 390, 940) < 110) { G.mode = 'shop'; G.shopMsg = ''; }
    else if (dist(p.x, p.y, 1150, 980) < 110) { G.mode = 'properties'; G.shopMsg = ''; }
  }
  if (G.input.hit('m') && !G.missions.active) {
    if (G.missionIndex < MISSIONS.length) G.missions.start(G.missionIndex);
  }
  if (G.input.hit('c')) { const st = G.sounds.cycleStation(); G.banner = { text: 'Radio: ' + st, t: 2, color: '#4ad2ff' }; }
  if (G.input.hit('n')) { const m = G.sounds.toggleMute(); G.banner = { text: m ? 'Sound muted' : 'Sound on', t: 1.5, color: '#ccc' }; }
  if (G.input.hit('p') || G.input.hit('escape')) { G.mode = 'pause'; }
  if (G.input.hit('f5')) {
    writeSave(0, snapshotState(G));
    G.banner = { text: 'Quick-saved to slot 1', t: 2, color: '#7aff6a' };
  }
  if (G.input.hit('1') && G.mode === 'play') { /* reserved for shop menus */ }
}

// Enemy AI: chase the player, shoot when in range, attack the player's car.
function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    const d = dist(e.x, e.y, p.x, p.y);
    e.angle = Math.atan2(p.y - e.y, p.x - e.x);
    e.fireCooldown -= dt;
    if (d > 40) {
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
    } else if (p.onFoot && G.grace <= 0) {
      p.hp -= 12 * dt; p.hurtFlash = 0.2;
    }
    if (d < 420 && d > 50 && e.fireCooldown <= 0 && p.hp > 0 && G.grace <= 0) {
      e.fireCooldown = 1.3 + Math.random() * 0.8;
      G.bullets.fire(e.x, e.y, e.angle + (Math.random() - 0.5) * 0.2, { damage: 9, speed: 780, range: 460, spread: 0.1, pellets: 1 }, 'enemy');
      G.sounds.shoot('pistol');
    }
  }
  G.enemies = G.enemies.filter(e => e.hp > 0);
}

// Traffic AI lives in vehicles.js and is imported statically at the top.

function draw() {
  const vw = G.view.w, vh = G.view.h;
  G.view.w = canvas.width; G.view.h = canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (G.mode === 'title') { drawTitle(ctx, G); return; }
  drawWorld(ctx, G);
  // Boats under cars.
  for (const b of G.boats) drawVehicle(ctx, G.cam, b, true);
  for (const car of G.cars) drawVehicle(ctx, G.cam, car, false);
  drawPeds(ctx, G.cam, G.peds);
  drawEnemies(ctx, G.cam, G);
  drawPolice(ctx, G.cam, G);
  drawPlayer(ctx, G.cam, G);
  G.bullets.draw(ctx, G.cam);
  G.particles.draw(ctx, G.cam);
  drawAtmosphere(ctx, G);
  if (G.mode === 'play' || G.mode === 'pause') drawHUD(ctx, G);
  if (G.mode === 'pause') drawPause(ctx, G);
  if (G.mode === 'shop') drawShop(ctx, G);
  if (G.mode === 'casino') drawCasino(ctx, G);
  if (G.mode === 'properties') drawProperties(ctx, G);
  if (G.mode === 'help') {
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Press Esc to close help. WASD move, E enter vehicles, M mission, P pause.', vw / 2, vh / 2);
  }
}

function handleMenus() {
  const input = G.input;
  if (G.mode === 'title') {
    if (input.anyKey || input.mouseClicked) startGame();
    return;
  }
  if (G.mode === 'pause') {
    if (input.hit('p') || input.hit('escape')) G.mode = 'play';
    if (input.hit('1')) { writeSave(0, snapshotState(G)); G.banner = { text: 'Saved to slot 1', t: 2, color: '#7aff6a' }; G.mode = 'play'; }
    if (input.hit('2')) { writeSave(1, snapshotState(G)); G.banner = { text: 'Saved to slot 2', t: 2, color: '#7aff6a' }; G.mode = 'play'; }
    if (input.hit('3')) { writeSave(2, snapshotState(G)); G.banner = { text: 'Saved to slot 3', t: 2, color: '#7aff6a' }; G.mode = 'play'; }
    if (input.hit('l')) { const s = readSave(0); if (s) { applySave(G, s); G.banner = { text: 'Loaded slot 1', t: 2, color: '#7aff6a' }; } G.mode = 'play'; }
    if (input.hit('h')) G.mode = 'help';
    return;
  }
  if (G.mode === 'help') { if (input.hit('escape') || input.hit('h')) G.mode = 'pause'; return; }
  if (G.mode === 'shop') {
    if (input.hit('escape')) { G.mode = 'play'; return; }
    G.weapons.forEach((w, i) => {
      if (input.hit(String(i + 1))) G.shopMsg = buyWeapon(G, w.id);
    });
    if (input.hit('a')) G.shopMsg = buyAmmo(G);
    if (input.hit('b')) G.shopMsg = buyArmor(G);
    if (input.hit('h')) G.shopMsg = buyHealth(G);
    return;
  }
  if (G.mode === 'casino') {
    if (input.hit('escape')) { G.mode = 'play'; return; }
    const bet = (n) => {
      if (G.money < n) { G.banner = { text: 'Not enough cash to bet $' + n, t: 2, color: '#ff8a8a' }; return; }
      G.money -= n;
      const r = G.casino.spin(n);
      G.money += r.win;
      if (r.win > 0) { G.stats.casinoWon += r.win - n; G.stats.casinoSession += r.win - n; G.sounds.cash(); }
      else { G.stats.casinoSession -= n; G.sounds.hit(); }
    };
    if (input.hit('1')) bet(50);
    if (input.hit('2')) bet(200);
    if (input.hit('3')) {
      if (G.money < 100) { G.banner = { text: 'Need $100 to play Gull 21', t: 2, color: '#ff8a8a' }; return; }
      G.money -= 100;
      const h = G.casino.play21(100);
      G.money += h.win;
      if (h.win > 100) { G.stats.casinoWon += h.win - 100; G.stats.casinoSession += h.win - 100; G.sounds.cash(); }
      else if (h.win === 0) { G.stats.casinoSession -= 100; G.sounds.hit(); }
    }
    return;
  }
  if (G.mode === 'properties') {
    if (input.hit('escape')) { G.mode = 'play'; return; }
    PROPERTIES.forEach((p, i) => {
      if (input.hit(String(i + 1))) G.shopMsg = buyProperty(G, p.id);
    });
    return;
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.view.w = canvas.width; G.view.h = canvas.height;
  handleMenus();
  if (G.mode === 'play') update(dt);
  else G.time += dt; // keep title/menu animations alive
  draw();
  G.input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

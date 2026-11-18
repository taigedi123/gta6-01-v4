// Screenshot staging: ?scene=chase | drive | mission | night | start.
// Each scene sets up a deterministic, readable state before the first frame so
// the cover and the other shots show several systems at once.
import { makeVehicle, CAR_DEFS } from './vehicles.js';
import { makeCop } from './police.js';

export function applyScene(G, scene) {
  const p = G.player;
  if (!scene) return;
  G.mode = 'play';
  // Staged scenes are for screenshots: a grace window keeps the police and
  // enforcers from killing or busting the stationary player before the shot.
  G.grace = 30;
  if (scene === 'start') { G.mode = 'title'; return; }
  if (scene === 'chase') {
    // Police chase: Mara in a Falcon GT, 4 wanted stars, cop cars + foot cops
    // closing in, mission objective on the HUD, minimap full of red dots.
    const def = CAR_DEFS.find(d => d.id === 'sport');
    const car = makeVehicle(def, 1300, 1025, 0, { driver: 'player' });
    G.cars.push(car);
    p.inVehicle = car; p.onFoot = false; p.x = car.x; p.y = car.y;
    car.speed = 300;
    G.wanted = 4;
    G.heli = { x: p.x + 260, y: p.y - 240, angle: 0, hp: 300, search: 0 };
    for (let i = 0; i < 4; i++) {
      const c = makeCop(p.x - 200 - i * 60, p.y + 120 + i * 40, true);
      G.cops.push(c);
    }
    const copDef = CAR_DEFS.find(d => d.id === 'police');
    const cc = makeVehicle(copDef, p.x - 260, p.y - 30, 0, { driver: 'police' });
    cc.speed = 320; G.cars.push(cc);
    const cc2 = makeVehicle(copDef, p.x + 200, p.y + 90, Math.PI, { driver: 'police' });
    cc2.speed = 300; G.cars.push(cc2);
    G.missions.start(4); // Midnight Racer — race objective visible
    G.money = 12500; G.respect = 42;
    G.weather = 'clear'; G.night = false; G.dayMinutes = 14 * 60 + 20;
  } else if (scene === 'drive') {
    // Cruising The Strip at sunset in a convertible, traffic + peds around.
    const def = CAR_DEFS.find(d => d.id === 'convert');
    const car = makeVehicle(def, 2100, 1025, 0, { driver: 'player' });
    G.cars.push(car);
    p.inVehicle = car; p.onFoot = false; p.x = car.x; p.y = car.y;
    car.speed = 220;
    G.wanted = 0; G.weather = 'sunset'; G.night = false; G.dayMinutes = 18 * 60 + 45;
    G.money = 8420; G.respect = 28;
    G.missions.start(1);
  } else if (scene === 'mission') {
    // On-foot firefight: Mara with the rifle, enforcers at the casino,
    // health bar, ammo counter and objective visible.
    p.x = 2050; p.y = 320; p.onFoot = true;
    p.hp = 82; p.armor = 60;
    const rifle = G.weapons.find(w => w.id === 'rifle');
    if (rifle) { rifle.owned = true; rifle.ammoLeft = 120; G.weapon = rifle; }
    G.wanted = 2;
    G.missions.start(14); // Queen of Solmar — final mission
    // Jump straight to the firefight step so enforcers are visible.
    G.missions.stepIndex = 1;
    G.missions.beginStep();
    for (const e of G.enemies) { e.x = 2150 + Math.random() * 120; e.y = 260 + Math.random() * 120; }
    G.weather = 'clear'; G.night = false; G.dayMinutes = 11 * 60 + 30;
    G.money = 21400; G.respect = 68;
  } else if (scene === 'night') {
    // Night city: Mara on foot in Casino Row, neon, rain, 1 star.
    p.x = 2250; p.y = 420; p.onFoot = true;
    G.night = true; G.weather = 'rain'; G.dayMinutes = 23 * 60 + 15;
    G.wanted = 1;
    G.missions.start(6); // Casino Royale
    G.money = 15300; G.respect = 55;
    const smg = G.weapons.find(w => w.id === 'smg');
    if (smg) { smg.owned = true; smg.ammoLeft = 180; G.weapon = smg; }
  }
  // Center the camera on the player immediately.
  G.cam.x = p.x - G.view.w / 2;
  G.cam.y = p.y - G.view.h / 2;
}

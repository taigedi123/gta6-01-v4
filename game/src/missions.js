// Story: 15 missions for Mara Quinn, ex-street-racer turned fixer, climbing from
// harbor errands to taking down the Gull syndicate. A tiny objective engine:
// goto / kill / collect / deliver / survive / race / boat / casino steps.
import { dist, clamp } from './util.js';

export const MISSIONS = [
  { id: 'm1', title: 'First Day on the Bay', giver: 'Uncle Sal', reward: 400, respect: 5,
    briefing: 'Sal needs his delivery van back from the Old Harbor docks. Steal any car, drive to the marker and bring the van home.',
    steps: [{ type: 'goto', x: 420, y: 380, label: 'Reach the Old Harbor docks' }, { type: 'deliver', x: 1150, y: 980, label: 'Deliver the van to Sal\'s garage', needCar: true }] },
  { id: 'm2', title: 'Taxi Trouble', giver: 'Sal', reward: 650, respect: 6,
    briefing: 'A rival cab firm is muscling Sal\'s drivers. Rough up 3 of their thugs near Market Square — fists or bat, your call.',
    steps: [{ type: 'kill', count: 3, x: 1300, y: 1000, label: 'Deal with 3 rival thugs', spawn: 'thug' }] },
  { id: 'm3', title: 'The Gull\'s Cut', giver: 'Detective Rosa', reward: 900, respect: 8,
    briefing: 'Rosa will look the other way if you collect 4 protection envelopes from shops on The Strip. No witnesses — keep it quiet.',
    steps: [{ type: 'collect', count: 4, spots: [[2100, 850], [2300, 950], [2000, 1100], [2400, 800]], label: 'Collect 4 envelopes on The Strip' }] },
  { id: 'm4', title: 'Harbor Lights', giver: 'Sal', reward: 1100, respect: 8,
    briefing: 'Smuggled crates are waiting on a boat in the marina. Take a boat out, grab the cargo and bring it to the South Docks.',
    steps: [{ type: 'boat', x: 1150, y: 110, label: 'Board a boat at the marina' }, { type: 'collect', count: 2, spots: [[3350, 300], [3450, 900]], label: 'Pick up 2 crates from the harbor' }, { type: 'deliver', x: 700, y: 2250, label: 'Deliver the crates to South Docks', needBoat: true }] },
  { id: 'm5', title: 'Midnight Racer', giver: 'Jax', reward: 1500, respect: 10,
    briefing: 'Jax runs the street races. Beat the checkpoint course through Downtown and The Strip before the timer runs out.',
    steps: [{ type: 'race', checkpoints: [[450, 1025], [1300, 1025], [2250, 1025], [2250, 1650], [1300, 1650], [450, 1650]], time: 75, label: 'Hit all 6 checkpoints in 75s' }] },
  { id: 'm6', title: 'Bank Job: The Setup', giver: 'Rosa', reward: 1800, respect: 10,
    briefing: 'The Meridian Bank moves cash at dawn. Steal a cargo van and photograph the route — drive past the bank, the hall and the depot.',
    steps: [{ type: 'goto', x: 390, y: 940, label: 'Scout the Meridian Bank Tower' }, { type: 'goto', x: 1150, y: 920, label: 'Scout City Hall' }, { type: 'goto', x: 700, y: 2275, label: 'Scout the South Docks depot' }] },
  { id: 'm7', title: 'Casino Royale', giver: 'The Gull', reward: 2500, respect: 12,
    briefing: 'The Golden Gull wants a courier tested. Win $1,000 at the casino tables first — then deliver the winnings to the penthouse.',
    steps: [{ type: 'casino', target: 1000, x: 2180, y: 260, label: 'Win $1,000 at the Golden Gull casino' }, { type: 'deliver', x: 2180, y: 260, label: 'Hand the winnings to the Gull\'s man' }] },
  { id: 'm8', title: 'Wheels Up', giver: 'Jax', reward: 2200, respect: 12,
    briefing: 'A rival crew stole Jax\'s Falcon GT. It is parked at Airport Fields under guard. Take it back — expect a fight.',
    steps: [{ type: 'kill', count: 4, x: 3000, y: 1600, label: 'Clear the 4 guards at Airport Fields', spawn: 'guard' }, { type: 'goto', x: 3050, y: 1650, label: 'Recover the Falcon GT' }] },
  { id: 'm9', title: 'The Informant', giver: 'Rosa', reward: 2600, respect: 14,
    briefing: 'A witness is hiding on University Hill. Escort him to the safehouse in Little Havana Bay while hitmen close in.',
    steps: [{ type: 'goto', x: 3000, y: 1000, label: 'Find the witness on University Hill' }, { type: 'kill', count: 5, x: 3000, y: 1000, label: 'Fight off 5 hitmen', spawn: 'hitman' }, { type: 'deliver', x: 1300, y: 1600, label: 'Escort the witness to the safehouse' }] },
  { id: 'm10', title: 'Metro Heist', giver: 'Sal', reward: 3200, respect: 14,
    briefing: 'Ride the metro to Downtown, grab the payroll case from the platform office and get out before the cops lock the station.',
    steps: [{ type: 'goto', x: 450, y: 350, label: 'Board the metro at Harbor Central' }, { type: 'collect', count: 1, spots: [[450, 1025]], label: 'Grab the payroll case at Downtown station' }, { type: 'survive', time: 20, label: 'Survive the police response (20s)' }] },
  { id: 'm11', title: 'Beachfront Brawl', giver: 'Jax', reward: 3000, respect: 15,
    briefing: 'The Sunset Beach gang challenged Jax\'s crew to a turf fight. Clear 6 of them off the boardwalk.',
    steps: [{ type: 'kill', count: 6, x: 2200, y: 1600, label: 'Clear 6 gang members off Sunset Beach', spawn: 'gang' }] },
  { id: 'm12', title: 'The Yacht Party', giver: 'The Gull', reward: 4500, respect: 16,
    briefing: 'The Gull is hosting a party on his yacht. Sail out, board it, grab his ledger from the cabin and slip away in the dark.',
    steps: [{ type: 'boat', x: 3350, y: 1500, label: 'Sail to the Gull\'s yacht' }, { type: 'collect', count: 1, spots: [[3350, 1500]], label: 'Steal the ledger from the yacht cabin' }, { type: 'goto', x: 1150, y: 110, label: 'Return to the marina' }] },
  { id: 'm13', title: 'Burning Bridges', giver: 'Rosa', reward: 5000, respect: 18,
    briefing: 'The syndicate torched Rosa\'s evidence locker. Retaliate: destroy 3 of their stash cars in Junkyard Flats, then vanish.',
    steps: [{ type: 'kill', count: 3, x: 450, y: 1600, label: 'Destroy 3 stash cars in Junkyard Flats', spawn: 'stashcar' }, { type: 'survive', time: 25, label: 'Lose the heat — survive 25s at 3 stars' }] },
  { id: 'm14', title: 'The Long Night', giver: 'Sal', reward: 6500, respect: 20,
    briefing: 'Everything comes to a head. Survive a full 5-star siege at the harbor for 45 seconds — cops, cars and the chopper.',
    steps: [{ type: 'survive', time: 45, wanted: 5, x: 450, y: 380, label: 'Survive the 5-star siege at Old Harbor (45s)' }] },
  { id: 'm15', title: 'Queen of Solmar', giver: 'Mara Quinn', reward: 10000, respect: 25,
    briefing: 'Final job: storm the Golden Gull Casino, take the vault cash and drive the getaway boat to the lighthouse. End the Gull.',
    steps: [{ type: 'goto', x: 2180, y: 260, label: 'Storm the Golden Gull Casino' }, { type: 'kill', count: 8, x: 2180, y: 260, label: 'Take down 8 of the Gull\'s enforcers', spawn: 'enforcer' }, { type: 'boat', x: 3350, y: 2400, label: 'Escape by boat to the lighthouse' }] },
];

export class MissionRunner {
  constructor(G) { this.G = G; this.active = null; this.stepIndex = 0; this.timer = 0; this.progress = 0; this.raceCp = 0; this.collected = 0; this.killed = 0; this.spawned = []; }
  start(index) {
    const m = MISSIONS[index];
    if (!m) return false;
    this.active = m; this.stepIndex = 0; this.timer = 0; this.progress = 0;
    this.raceCp = 0; this.collected = 0; this.killed = 0; this.spawned = [];
    this.G.banner = { text: m.title + ' — ' + m.giver, t: 4, color: '#ffd94a' };
    this.G.sounds.missionOk();
    this.beginStep();
    return true;
  }
  step() { return this.active ? this.active.steps[this.stepIndex] : null; }
  beginStep() {
    const s = this.step();
    if (!s) return;
    this.timer = s.time || 0;
    this.raceCp = 0; this.collected = 0; this.killed = 0; this.spawned = [];
    const G = this.G;
    if (s.type === 'kill' || s.type === 'collect') {
      const n = s.count;
      if (s.spawn) {
        for (let i = 0; i < n; i++) {
          const e = this.spawnEnemy(s.spawn, s.x + (Math.random() - 0.5) * 260, s.y + (Math.random() - 0.5) * 260);
          this.spawned.push(e); G.enemies.push(e);
        }
      } else if (s.spots) {
        G.pickups = s.spots.map(([x, y]) => ({ x, y, kind: 'mission', taken: false }));
      }
    }
    if (s.type === 'race') { G.raceTimer = s.time; }
    if (s.type === 'survive' && s.wanted) { G.wanted = Math.max(G.wanted, s.wanted); }
    if (s.type === 'boat') { G.banner = { text: 'Find a boat — press E near one at the water', t: 3, color: '#4ad2ff' }; }
  }
  spawnEnemy(kind, x, y) {
    const base = { x, y, hp: 60, angle: 0, speed: 120, hostile: true, kind: 'enemy', radius: 14, fireCooldown: 1, color: '#c9a13d' };
    if (kind === 'guard' || kind === 'enforcer') { base.hp = 100; base.color = '#3a3a42'; base.speed = 135; }
    if (kind === 'hitman') { base.hp = 80; base.speed = 150; }
    if (kind === 'gang') { base.hp = 70; base.color = '#7a2f2f'; }
    if (kind === 'stashcar') { base.hp = 1; base.isCar = true; base.color = '#b06a2a'; }
    return base;
  }
  update(dt) {
    if (!this.active) return;
    const s = this.step();
    if (!s) { this.complete(); return; }
    const G = this.G, p = G.player;
    if (s.type === 'goto' || s.type === 'deliver') {
      if (dist(p.x, p.y, s.x, s.y) < 70) this.nextStep();
    } else if (s.type === 'kill') {
      this.killed = s.count - this.spawned.filter(e => e.hp > 0).length;
      if (this.spawned.length && this.spawned.every(e => e.hp <= 0)) this.nextStep();
    } else if (s.type === 'collect') {
      const left = (G.pickups || []).filter(pk => pk.kind === 'mission' && !pk.taken).length;
      if (s.spots && left === 0) this.nextStep();
    } else if (s.type === 'race') {
      G.raceTimer -= dt;
      const cp = s.checkpoints[this.raceCp];
      if (cp && dist(p.x, p.y, cp[0], cp[1]) < 80) {
        this.raceCp++; G.sounds.pickup();
        if (this.raceCp >= s.checkpoints.length) this.nextStep();
      }
      if (G.raceTimer <= 0) this.fail('Out of time on the race!');
    } else if (s.type === 'survive') {
      this.timer -= dt;
      if (s.wanted) G.wanted = Math.max(G.wanted, s.wanted - (this.timer < 15 ? 1 : 0));
      if (this.timer <= 0) this.nextStep();
      if (p.hp <= 0) this.fail('You did not survive.');
    } else if (s.type === 'boat') {
      if (p.inBoat && dist(p.x, p.y, s.x, s.y) < 220) this.nextStep();
    } else if (s.type === 'casino') {
      if (G.stats.casinoSession >= s.target) this.nextStep();
    }
    if (p.hp <= 0 && s.type !== 'survive') this.fail('Mara went down. Mission failed.');
  }
  nextStep() {
    this.stepIndex++;
    this.G.sounds.pickup();
    if (this.stepIndex >= this.active.steps.length) this.complete();
    else this.beginStep();
  }
  complete() {
    const m = this.active;
    const G = this.G;
    G.money += m.reward; G.respect += m.respect;
    G.missionsDone++; G.missionIndex++;
    G.banner = { text: 'MISSION COMPLETE: ' + m.title + '  +' + '$' + m.reward, t: 4, color: '#7aff6a' };
    G.sounds.missionOk(); G.sounds.cash();
    G.particles.confetti(G.player.x, G.player.y);
    G.stats.casinoSession = 0;
    this.active = null; this.stepIndex = 0;
    if (G.missionIndex >= MISSIONS.length) {
      G.banner = { text: 'STORY COMPLETE — Mara Quinn rules Solmar Bay!', t: 6, color: '#ffd94a' };
    }
  }
  fail(reason) {
    const G = this.G;
    G.banner = { text: 'MISSION FAILED — ' + reason, t: 4, color: '#ff5a5a' };
    G.sounds.missionFail();
    G.enemies = G.enemies.filter(e => !this.spawned.includes(e));
    this.active = null; this.stepIndex = 0;
    G.stats.casinoSession = 0;
  }
  objectiveText() {
    if (!this.active) return MISSIONS[this.G.missionIndex]
      ? 'Next: ' + MISSIONS[this.G.missionIndex].title + ' — press M to start'
      : 'Story complete!';
    const s = this.step();
    if (!s) return '';
    let extra = '';
    if (s.type === 'kill') extra = ' (' + this.killed + '/' + s.count + ')';
    if (s.type === 'collect') extra = ' (' + (this.collected) + '/' + s.count + ')';
    if (s.type === 'race') extra = ' (' + this.raceCp + '/' + s.checkpoints.length + ') ' + Math.max(0, Math.ceil(this.G.raceTimer || 0)) + 's';
    if (s.type === 'survive') extra = ' ' + Math.max(0, Math.ceil(this.timer)) + 's';
    if (s.type === 'casino') extra = ' ($' + Math.floor(this.G.stats.casinoSession) + '/$' + s.target + ')';
    return this.active.title + ': ' + s.label + extra;
  }
  marker() {
    if (!this.active) {
      const next = MISSIONS[this.G.missionIndex];
      return next && next.steps[0] && next.steps[0].x ? { x: next.steps[0].x, y: next.steps[0].y, color: '#888' } : null;
    }
    const s = this.step();
    if (!s) return null;
    if (s.type === 'race') { const cp = s.checkpoints[this.raceCp]; return cp ? { x: cp[0], y: cp[1], color: '#ffd94a' } : null; }
    if (s.type === 'collect' && s.spots) {
      const left = (this.G.pickups || []).find(pk => pk.kind === 'mission' && !pk.taken);
      return left ? { x: left.x, y: left.y, color: '#ffd94a' } : null;
    }
    if (s.x !== undefined) return { x: s.x, y: s.y, color: '#ffd94a' };
    return null;
  }
}

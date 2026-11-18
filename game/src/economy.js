// Economy: money, the gun shop, the garage (buy/store cars), buyable properties
// that pay rent, and the casino (slots + blackjack-lite) at the Golden Gull.
import { clamp } from './util.js';
import { weaponById } from './combat.js';

export const PROPERTIES = [
  { id: 'garage1', name: 'Sal\'s Garage Apartment', price: 8000, rent: 120, x: 1150, y: 980, desc: 'A flat above the garage. Pays rent every minute.' },
  { id: 'beachhouse', name: 'Sunset Beach House', price: 25000, rent: 400, x: 2200, y: 1650, desc: 'Beachfront pad with a garage slot.' },
  { id: 'penthouse', name: 'Casino Row Penthouse', price: 60000, rent: 1000, x: 2250, y: 350, desc: 'Top-floor luxury. The Gull used to own it.' },
  { id: 'marina', name: 'Marina Slip & Office', price: 18000, rent: 300, x: 1150, y: 110, desc: 'Your own boat slip and a harborside office.' },
];

export const SHOP_ITEMS = [
  { kind: 'weapon', id: 'bat' }, { kind: 'weapon', id: 'knife' }, { kind: 'weapon', id: 'smg' },
  { kind: 'weapon', id: 'shotgun' }, { kind: 'weapon', id: 'rifle' }, { kind: 'weapon', id: 'sniper' },
  { kind: 'weapon', id: 'rpg' }, { kind: 'ammo', id: 'ammo' }, { kind: 'armor', id: 'armor' },
  { kind: 'health', id: 'health' },
];

export function buyWeapon(G, id) {
  const def = weaponById(G.weapons, id);
  if (!def) return 'No such weapon.';
  if (def.owned) return def.name + ' already owned.';
  if (G.money < def.price) return 'Not enough cash for ' + def.name + ' ($' + def.price + ').';
  G.money -= def.price; def.owned = true; def.ammoLeft = def.ammo;
  G.weapon = def; G.sounds.cash();
  return 'Bought ' + def.name + '!';
}
export function buyAmmo(G) {
  const w = G.weapon;
  if (!w || w.ammo === Infinity) return 'Nothing to reload.';
  if (G.money < 100) return 'Ammo costs $100.';
  G.money -= 100; w.ammoLeft = w.ammo; G.sounds.cash();
  return 'Ammo restocked for ' + w.name + '.';
}
export function buyArmor(G) {
  if (G.money < 250) return 'Armor costs $250.';
  G.money -= 250; G.player.armor = 100; G.sounds.cash();
  return 'Body armor fitted (100).';
}
export function buyHealth(G) {
  if (G.money < 150) return 'A medkit costs $150.';
  G.money -= 150; G.player.hp = G.player.maxHp; G.sounds.cash();
  return 'Patched up to full health.';
}
export function buyProperty(G, id) {
  const p = PROPERTIES.find(x => x.id === id);
  if (!p) return 'No such property.';
  if (G.properties.includes(id)) return 'You already own ' + p.name + '.';
  if (G.money < p.price) return 'Need $' + p.price.toLocaleString() + ' for ' + p.name + '.';
  G.money -= p.price; G.properties.push(id); G.sounds.cash();
  return 'You own ' + p.name + ' — it pays $' + p.rent + '/min in rent.';
}
export function collectRent(G, dt) {
  G.rentTimer = (G.rentTimer || 0) + dt;
  if (G.rentTimer >= 60 && G.properties.length) {
    G.rentTimer = 0;
    let total = 0;
    for (const id of G.properties) { const p = PROPERTIES.find(x => x.id === id); if (p) total += p.rent; }
    G.money += total;
    G.banner = { text: 'Rent collected: +$' + total + ' from your properties', t: 3, color: '#7aff6a' };
    G.sounds.cash();
  }
}

// ---- Casino: slots (3-reel) and a one-card blackjack-lite ("Gull 21") ----
export class Casino {
  constructor() { this.slots = ['🍒', '🍋', '⭐', '💎', '7️⃣', '🔔']; this.lastSpin = null; this.lastHand = null; }
  spin(bet) {
    const r = [0, 1, 2].map(() => this.slots[Math.floor(Math.random() * this.slots.length)]);
    let win = 0;
    if (r[0] === r[1] && r[1] === r[2]) win = bet * (r[0] === '7️⃣' ? 25 : r[0] === '💎' ? 12 : 6);
    else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) win = bet;
    this.lastSpin = { reels: r, bet, win };
    return { reels: r, win };
  }
  // Gull 21: you and the house each draw 2 cards (1-11); closest to 21 wins, ties push.
  play21(bet) {
    const card = () => Math.floor(Math.random() * 11) + 1;
    const you = card() + card(), house = card() + card();
    let win = 0;
    if (you > 21) win = 0;
    else if (house > 21 || you > house) win = bet * 2;
    else if (you === house) win = bet;
    this.lastHand = { you, house, bet, win };
    return { you, house, win };
  }
}

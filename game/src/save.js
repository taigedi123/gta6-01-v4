// Save system: 3 slots in localStorage, each holding money, mission progress,
// owned cars / properties / weapons, stats and play time.
const KEY = 'solmar-bay-save-';
export function listSaves() {
  const out = [];
  for (let i = 0; i < 3; i++) {
    try {
      const raw = localStorage.getItem(KEY + i);
      out.push(raw ? JSON.parse(raw) : null);
    } catch (e) { out.push(null); }
  }
  return out;
}
export function readSave(slot) {
  try { const raw = localStorage.getItem(KEY + slot); return raw ? JSON.parse(raw) : null; }
  catch (e) { return null; }
}
export function writeSave(slot, data) {
  try {
    data.savedAt = new Date().toISOString();
    localStorage.setItem(KEY + slot, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}
export function snapshotState(G) {
  return {
    money: G.money, missionIndex: G.missionIndex, missionsDone: G.missionsDone,
    respect: G.respect, kills: G.stats.kills, carsStolen: G.stats.carsStolen,
    playSeconds: G.stats.playSeconds, ownedCars: G.ownedCars, properties: G.properties,
    weapons: G.weapons.map(w => w.id), casinoWon: G.stats.casinoWon,
    px: G.player.x, py: G.player.y,
  };
}
export function applySave(G, s) {
  if (!s) return;
  G.money = s.money ?? 500; G.missionIndex = s.missionIndex ?? 0;
  G.missionsDone = s.missionsDone ?? 0; G.respect = s.respect ?? 0;
  G.stats.kills = s.kills ?? 0; G.stats.carsStolen = s.carsStolen ?? 0;
  G.stats.playSeconds = s.playSeconds ?? 0; G.stats.casinoWon = s.casinoWon ?? 0;
  G.ownedCars = s.ownedCars ?? []; G.properties = s.properties ?? [];
  if (Array.isArray(s.weapons)) {
    for (const w of G.weapons) w.owned = s.weapons.includes(w.id) || w.id === 'fists' || w.id === 'pistol';
    const cur = G.weapons.find(w => w.owned && w.id !== 'fists');
    if (cur) G.weapon = cur;
  }
  if (s.px) { G.player.x = s.px; G.player.y = s.py; }
}

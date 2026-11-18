// HUD: health/armor, money, wanted stars, minimap, mission objective, radio,
// clock, and all menus (title, pause, gun shop, casino, properties, saves, help).
import { fmtMoney, fmtTime, clamp } from './util.js';
import { DISTRICTS, districtAt } from './city.js';
import { PROPERTIES } from './economy.js';
import { listSaves } from './save.js';

export function drawHUD(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  const p = G.player;
  // Top-left: health + armor bars.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 220, 58);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('MARA QUINN', 20, 28);
  ctx.fillStyle = '#333'; ctx.fillRect(20, 34, 150, 10);
  ctx.fillStyle = p.hp > 30 ? '#4ad27a' : '#ff3a3a';
  ctx.fillRect(20, 34, 150 * clamp(p.hp / 100, 0, 1), 10);
  ctx.fillStyle = '#333'; ctx.fillRect(20, 48, 150, 6);
  ctx.fillStyle = '#4ad2ff';
  ctx.fillRect(20, 48, 150 * clamp(p.armor / 100, 0, 1), 6);
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
  ctx.fillText('HP ' + Math.ceil(p.hp) + '  ARMOR ' + Math.ceil(p.armor), 176, 44);
  // Top-right: money, respect, clock.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(vw - 232, 12, 220, 58);
  ctx.fillStyle = '#7aff6a'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText(fmtMoney(G.money), vw - 20, 34);
  ctx.fillStyle = '#ffd94a'; ctx.font = '13px sans-serif';
  ctx.fillText('Respect ' + G.respect + '   Missions ' + G.missionsDone + '/15', vw - 20, 54);
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif';
  ctx.fillText(G.clockLabel + '  ·  ' + districtAt(p.x, p.y).name, vw - 20, 66);
  // Wanted stars top-center.
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.font = '26px sans-serif';
    ctx.fillStyle = i < G.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', vw / 2 - 52 + i * 26, 40);
  }
  if (G.wanted > 0) {
    ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(G.wanted >= 4 ? 'HELICOPTER INBOUND' : 'WANTED — hide to lose the heat', vw / 2, 60);
  }
  // Mission objective bar (bottom-center).
  const obj = G.missions.objectiveText();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const ow = Math.min(720, ctx.measureText(obj).width + 30);
  ctx.fillRect(vw / 2 - ow / 2, vh - 44, ow, 28);
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(obj, vw / 2, vh - 25);
  // Weapon + speed (bottom-left).
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, vh - 66, 250, 54);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
  const w = G.weapon;
  ctx.fillText(w ? w.name : '—', 20, vh - 44);
  ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
  ctx.fillText(w && w.ammo !== Infinity ? 'Ammo ' + w.ammoLeft + '/' + w.ammo + '  (R reload, Q swap)' : 'Press Q to swap weapon', 20, vh - 26);
  const spd = p.inVehicle ? Math.abs(p.inVehicle.speed) * 0.36 : p.inBoat ? Math.abs(p.inBoat.speed) * 0.36 : 0;
  if (spd > 1) { ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(Math.round(spd) + ' km/h', 200, vh - 44); }
  // Radio (bottom-right above minimap).
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(vw - 232, vh - 66, 220, 24);
  ctx.fillStyle = '#4ad2ff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('♪ ' + G.sounds.stations[G.sounds.station] + ' (C)', vw - 20, vh - 49);
  // Minimap.
  drawMinimap(ctx, G);
  // Banner.
  if (G.banner && G.banner.t > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    const bw = Math.min(760, ctx.measureText(G.banner.text).width + 40);
    ctx.fillRect(vw / 2 - bw / 2, 84, bw, 34);
    ctx.fillStyle = G.banner.color || '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(G.banner.text, vw / 2, 106);
  }
  // Controls hint (first minute).
  if (G.stats.playSeconds < 75 && G.mode === 'play') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(12, 84, 300, 92);
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('WASD move / drive · Mouse aim · Click shoot', 20, 102);
    ctx.fillText('E enter car / boat / metro · Shift sprint', 20, 120);
    ctx.fillText('M mission · P pause · C radio · N mute', 20, 138);
    ctx.fillText('Near the casino, garage or shop: press E', 20, 156);
  }
}

function drawMinimap(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  const mw = 200, mh = 145, mx = vw - mw - 12, my = vh - mh - 78;
  const sx = mw / 3600, sy = mh / 2600;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  // Districts.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color;
    ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy);
  }
  // Water.
  ctx.fillStyle = '#2a7ab8';
  for (const w of G.cityWater) ctx.fillRect(mx + w.x * sx, my + w.y * sy, w.w * sx, w.h * sy);
  // Roads.
  ctx.fillStyle = '#444';
  for (const rx of G.city.roadsV) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
  for (const ry of G.city.roadsH) ctx.fillRect(mx, my + ry * sy - 1, mw, 2);
  // Marker.
  const marker = G.missions.marker();
  if (marker) {
    ctx.fillStyle = marker.color;
    ctx.beginPath(); ctx.arc(mx + marker.x * sx, my + marker.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Cops (red) and player (white arrow).
  ctx.fillStyle = '#ff3a3a';
  for (const c of G.cops) ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
  const p = G.player;
  ctx.save();
  ctx.translate(mx + p.x * sx, my + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  // North + district label.
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('N ↑', mx + 4, my + 12);
}

// ---- Menus (drawn over the world) ----
export function drawTitle(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  const grad = ctx.createLinearGradient(0, 0, 0, vh);
  grad.addColorStop(0, '#ff7a3a'); grad.addColorStop(0.5, '#c94a7a'); grad.addColorStop(1, '#1a2a5a');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SOLMAR BAY', vw / 2, 150);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText('A Mara Quinn Story — Open-World Crime', vw / 2, 195);
  ctx.fillStyle = '#ffe9a0'; ctx.font = '16px sans-serif';
  ctx.fillText('15 missions · 12 districts · 12 cars · 3 boats · casino · metro · properties', vw / 2, 230);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(vw / 2 - 260, 270, 520, 190);
  ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif'; ctx.textAlign = 'left';
  const lines = [
    'WASD / arrows — move & drive      Mouse — aim, Click — shoot',
    'E — enter car, boat or metro      Shift — sprint',
    'Q — swap weapon   R — reload      C — radio station   N — mute',
    'M — start mission   P — pause    F5 — quick save (slot 1)',
    'Steal cars, dodge the SMPD, win at the Golden Gull casino,',
    'buy property, and take down the Gull syndicate.',
  ];
  lines.forEach((l, i) => ctx.fillText(l, vw / 2 - 240, 300 + i * 26));
  ctx.fillStyle = '#7aff6a'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('CLICK OR PRESS ENTER TO PLAY', vw / 2, 510 + Math.sin(G.time * 4) * 4);
  ctx.fillStyle = '#ccc'; ctx.font = '13px sans-serif';
  ctx.fillText('Original game — no Rockstar / GTA assets, names or music. All art & sound generated in code.', vw / 2, 560);
  const saves = listSaves();
  saves.forEach((s, i) => {
    if (!s) return;
    ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Slot ' + (i + 1) + ': ' + fmtMoney(s.money) + ' · ' + s.missionsDone + '/15 missions · ' + (s.savedAt || '').slice(0, 10), vw / 2, 590 + i * 18);
  });
}

export function drawPause(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PAUSED', vw / 2, 160);
  ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
  const lines = [
    'P / Esc — resume', '1 / 2 / 3 — save to slot 1/2/3', 'L — load slot 1',
    'H — help', 'N — mute sound', 'C — change radio station',
    'Stats: ' + G.stats.kills + ' takedowns · ' + G.stats.carsStolen + ' cars stolen · ' + fmtTime(G.stats.playSeconds) + ' played',
    fmtMoney(G.money) + ' cash · ' + G.respect + ' respect · ' + G.properties.length + ' properties owned',
  ];
  lines.forEach((l, i) => ctx.fillText(l, vw / 2, 220 + i * 30));
}

export function drawShop(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('AMMU-NATION — Solmar Gun Shop', vw / 2, 90);
  ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Cash: ' + fmtMoney(G.money) + '    (press number to buy, Esc to leave)', vw / 2 - 320, 120);
  G.weapons.forEach((w, i) => {
    const y = 150 + i * 34;
    ctx.fillStyle = w.owned ? '#7aff6a' : '#fff';
    ctx.fillText((i + 1) + '. ' + w.name + '  —  ' + (w.owned ? 'OWNED (ammo ' + (w.ammo === Infinity ? '∞' : w.ammoLeft) + ')' : '$' + w.price.toLocaleString() + '  · dmg ' + w.damage), vw / 2 - 320, y);
  });
  const y0 = 150 + G.weapons.length * 34;
  ctx.fillStyle = '#fff';
  ctx.fillText('A. Ammo refill $100    B. Body armor $250    H. Medkit $150', vw / 2 - 320, y0 + 10);
  ctx.fillStyle = '#ccc'; ctx.font = '13px sans-serif';
  ctx.fillText(G.shopMsg || '', vw / 2 - 320, y0 + 44);
}

export function drawCasino(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  ctx.fillStyle = 'rgba(20,0,30,0.88)'; ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('★ THE GOLDEN GULL CASINO ★', vw / 2, 90);
  ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
  ctx.fillText('Cash: ' + fmtMoney(G.money) + '    (1) Slots $50   (2) Slots $200   (3) Gull 21 $100   (Esc) leave', vw / 2, 125);
  const spin = G.casino.lastSpin;
  if (spin) {
    ctx.font = '44px sans-serif';
    ctx.fillText(spin.reels.join('  '), vw / 2, 210);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = spin.win > 0 ? '#7aff6a' : '#ff8a8a';
    ctx.fillText(spin.win > 0 ? 'WIN $' + spin.win + '!' : 'No win — try again', vw / 2, 250);
  } else {
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#ccc';
    ctx.fillText('Spin the slots or play Gull 21 (closest to 21 wins).', vw / 2, 210);
  }
  const hand = G.casino.lastHand;
  if (hand) {
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
    ctx.fillText('Gull 21 — You ' + hand.you + ' vs House ' + hand.house + '  →  ' + (hand.win > hand.bet ? 'WIN $' + (hand.win - hand.bet) : hand.win === hand.bet ? 'Push' : 'House wins'), vw / 2, 290);
  }
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText('Session winnings: $' + Math.floor(G.stats.casinoSession) + '  (mission 7 needs $1,000)', vw / 2, 330);
}

export function drawProperties(ctx, G) {
  const vw = G.view.w, vh = G.view.h;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, vw, vh);
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SOLMAR REALTY — Buy Property', vw / 2, 90);
  ctx.fillStyle = '#fff'; ctx.font = '15px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('Cash: ' + fmtMoney(G.money) + '    (press number to buy, Esc to leave)', vw / 2 - 320, 120);
  PROPERTIES.forEach((p, i) => {
    const owned = G.properties.includes(p.id);
    ctx.fillStyle = owned ? '#7aff6a' : '#fff';
    ctx.fillText((i + 1) + '. ' + p.name + ' — ' + (owned ? 'OWNED, pays $' + p.rent + '/min' : '$' + p.price.toLocaleString() + ' · rent $' + p.rent + '/min'), vw / 2 - 320, 160 + i * 30);
    ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
    ctx.fillText('    ' + p.desc, vw / 2 - 320, 178 + i * 30);
    ctx.font = '15px sans-serif';
  });
  ctx.fillStyle = '#ccc'; ctx.font = '13px sans-serif';
  ctx.fillText(G.shopMsg || '', vw / 2 - 320, 160 + PROPERTIES.length * 30 + 20);
}

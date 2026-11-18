// Metro: the elevated loop train with 6 stations. Stand on a platform and press
// E to board; the train carries you around the loop. Riding is free and fast.
import { METRO_PATH, METRO_STATIONS } from './city.js';
import { dist } from './util.js';

export class Metro {
  constructor() {
    this.path = METRO_PATH;
    this.seg = 0; this.t = 0; this.speed = 260;
    this.x = METRO_PATH[0][0]; this.y = METRO_PATH[0][1];
    this.dwell = 0; this.stationIdx = 0;
    this.passengers = 0;
  }
  stationNear(x, y, r = 60) {
    return METRO_STATIONS.find(s => dist(x, y, s.x, s.y) < r) || null;
  }
  update(dt, G) {
    if (this.dwell > 0) {
      this.dwell -= dt;
      // Boarding: player standing at the station hops on.
      if (G && G.player && G.player.onFoot && this.stationNear(G.player.x, G.player.y, 70)) {
        if (G.input.hit('e')) { G.player.ridingMetro = true; G.sounds.pickup(); }
      }
      if (G && G.player && G.player.ridingMetro) {
        G.player.x = this.x; G.player.y = this.y;
      }
      return;
    }
    const [x1, y1] = this.path[this.seg];
    const [x2, y2] = this.path[(this.seg + 1) % this.path.length];
    const segLen = Math.hypot(x2 - x1, y2 - y1);
    this.t += (this.speed * dt) / segLen;
    if (this.t >= 1) {
      this.t = 0; this.seg = (this.seg + 1) % this.path.length;
      const at = this.path[this.seg];
      const st = METRO_STATIONS.find(s => s.x === at[0] && s.y === at[1]);
      if (st) { this.dwell = 3.5; this.stationIdx = METRO_STATIONS.indexOf(st); }
    }
    const a = this.path[this.seg], b = this.path[(this.seg + 1) % this.path.length];
    this.x = a[0] + (b[0] - a[0]) * this.t;
    this.y = a[1] + (b[1] - a[1]) * this.t;
    if (G && G.player && G.player.ridingMetro) {
      G.player.x = this.x; G.player.y = this.y;
      if (G.input.hit('e')) { G.player.ridingMetro = false; G.sounds.pickup(); }
    }
  }
  draw(ctx, cam) {
    // Elevated track.
    ctx.strokeStyle = '#3a3a42'; ctx.lineWidth = 8;
    ctx.beginPath();
    this.path.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x - cam.x, y - cam.y); else ctx.lineTo(x - cam.x, y - cam.y); });
    ctx.closePath(); ctx.stroke();
    ctx.strokeStyle = '#e8c832'; ctx.lineWidth = 2;
    ctx.beginPath();
    this.path.forEach(([x, y], i) => { if (i === 0) ctx.moveTo(x - cam.x, y - cam.y); else ctx.lineTo(x - cam.x, y - cam.y); });
    ctx.closePath(); ctx.stroke();
    // Stations.
    for (const s of METRO_STATIONS) {
      const sx = s.x - cam.x, sy = s.y - cam.y;
      ctx.fillStyle = '#22355e';
      ctx.fillRect(sx - 16, sy - 16, 32, 32);
      ctx.fillStyle = '#e8c832';
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('M', sx, sy + 4);
    }
    // Train: 3 cars.
    const ang = Math.atan2(this.path[(this.seg + 1) % this.path.length][1] - this.path[this.seg][1],
      this.path[(this.seg + 1) % this.path.length][0] - this.path[this.seg][0]);
    ctx.save();
    ctx.translate(this.x - cam.x, this.y - cam.y);
    ctx.rotate(ang);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 0 ? '#c94a4a' : '#d2d2d2';
      ctx.fillRect(-34 - i * 30, -9, 28, 18);
      ctx.fillStyle = '#4ad2ff';
      ctx.fillRect(-30 - i * 30, -6, 20, 12);
    }
    ctx.restore();
  }
}

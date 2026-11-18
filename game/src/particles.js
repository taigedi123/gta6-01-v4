// Particles: sparks, smoke, blood puffs, muzzle flashes, confetti, water spray.
import { rand } from './util.js';
export class Particles {
  constructor() { this.list = []; }
  spawn(x, y, opts) {
    const n = opts.n || 8;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(Math.random, opts.speedMin ?? 40, opts.speedMax ?? 160);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(Math.random, 0.25, opts.life ?? 0.7),
        maxLife: opts.life ?? 0.7,
        size: rand(Math.random, opts.sizeMin ?? 2, opts.sizeMax ?? 5),
        color: opts.color, gravity: opts.gravity ?? 0, drag: opts.drag ?? 0.98,
      });
    }
    if (this.list.length > 600) this.list.splice(0, this.list.length - 600);
  }
  burst(x, y, color, n = 10) { this.spawn(x, y, { n, color, speedMax: 220, life: 0.6 }); }
  smoke(x, y) { this.spawn(x, y, { n: 3, color: '#666', speedMax: 40, life: 1.1, sizeMin: 5, sizeMax: 10, gravity: -30 }); }
  blood(x, y) { this.spawn(x, y, { n: 8, color: '#a02020', speedMax: 130, life: 0.5 }); }
  muzzle(x, y, ang) {
    for (let i = 0; i < 4; i++) {
      this.list.push({ x: x + Math.cos(ang) * 14, y: y + Math.sin(ang) * 14,
        vx: Math.cos(ang + (Math.random() - 0.5) * 0.5) * 320, vy: Math.sin(ang + (Math.random() - 0.5) * 0.5) * 320,
        life: 0.08, maxLife: 0.08, size: 3, color: '#ffd94a', gravity: 0, drag: 0.9 });
    }
  }
  confetti(x, y) {
    const colors = ['#ffd94a', '#ff5a7a', '#4ad2ff', '#7aff6a'];
    for (let i = 0; i < 30; i++) this.spawn(x, y, { n: 1, color: colors[i % 4], speedMax: 260, life: 1.4, gravity: 160 });
  }
  spray(x, y) { this.spawn(x, y, { n: 4, color: '#bfe8ff', speedMax: 90, life: 0.5, sizeMin: 2, sizeMax: 4 }); }
  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.vx *= p.drag; p.vy *= p.drag; p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.list = this.list.filter(p => p.life > 0);
  }
  draw(ctx, cam) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - cam.x - p.size / 2, p.y - cam.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

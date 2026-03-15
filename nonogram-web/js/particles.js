// particles.js - 파티클 시스템 + 별빛 배경

// ── 파티클 ────────────────────────────────────────────────────────────────

class Particle {
  constructor(x, y, vx, vy, life, color, size, kind = 'spark', gravity = 0) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.size = size;
    this.kind = kind; this.gravity = gravity;
  }
  get alive() { return this.life > 0; }
  get ratio() { return Math.max(0, this.life / this.maxLife); }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= 0.98;
    this.life -= dt;
  }
}

const SPARK_COLORS  = ['#ffdc50','#ffb428','#ffffa0','#c8e8ff','#a0c8ff'];
const STAR_COLORS   = ['#ffffff','#c8dcff','#fff0c8','#b4ffe8'];
const FW_COLORS     = ['#ff5050','#ffa028','#fff03c','#50ff78','#3ca0ff','#c850ff','#ff78c8','#78ffff'];
const LINE_COLORS   = ['#ffdc50','#ffc864','#ffb428'];

class ParticleSystem {
  constructor() { this._p = []; }

  update(dt) {
    for (const p of this._p) p.update(dt);
    this._p = this._p.filter(p => p.alive);
  }

  draw(ctx) {
    for (const p of this._p) {
      const a = p.ratio;
      ctx.globalAlpha = a;
      const sz = Math.max(1, p.size * a);

      if (p.kind === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
        if (sz > 2) {
          ctx.globalAlpha = a * 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (p.kind === 'star') {
        this._drawStar(ctx, p.x, p.y, sz, p.color);
      } else if (p.kind === 'trail') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, sz / 3);
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * p.ratio * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  _drawStar(ctx, cx, cy, r, color) {
    if (r < 2) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, 1, 0, Math.PI * 2); ctx.fill();
      return;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * 36 - 90) * Math.PI / 180;
      const radius = i % 2 === 0 ? r : r * 0.45;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }

  _rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  _rnd(min, max) { return Math.random() * (max - min) + min; }

  spawnCellFill(cx, cy) {
    const n = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this._rnd(40, 160);
      this._p.push(new Particle(cx, cy,
        Math.cos(angle)*speed, Math.sin(angle)*speed,
        this._rnd(0.3, 0.7), this._rand(SPARK_COLORS),
        this._rnd(2, 5), 'spark', 120));
    }
  }

  spawnCellError(cx, cy) {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this._rnd(30, 100);
      const r = 200 + Math.floor(Math.random()*55);
      this._p.push(new Particle(cx, cy,
        Math.cos(angle)*speed, Math.sin(angle)*speed,
        this._rnd(0.2, 0.5), `rgb(${r},${Math.floor(Math.random()*60)},40)`,
        3, 'spark', 80));
    }
  }

  spawnLineClear(x1, y1, x2, y2, isRow) {
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const px = x1 + (x2-x1)*t, py = y1 + (y2-y1)*t;
      const vx = this._rnd(-30,30), vy = isRow ? this._rnd(-80,-20) : this._rnd(-30,30);
      this._p.push(new Particle(px, py, vx, vy, this._rnd(0.4, 0.9),
        this._rand(LINE_COLORS), this._rnd(3,7), 'spark', 60));
    }
    for (let i = 0; i < 10; i++) {
      const t = Math.random();
      const px = x1 + (x2-x1)*t, py = y1 + (y2-y1)*t;
      this._p.push(new Particle(px, py, this._rnd(-20,20), this._rnd(-60,-10),
        this._rnd(0.5,1.0), this._rand(STAR_COLORS), this._rnd(4,9), 'star', 30));
    }
  }

  spawnFireworks(cx, cy, bursts = 5) {
    for (let b = 0; b < bursts; b++) {
      const bx = cx + this._rnd(-200, 200);
      const by = cy + this._rnd(-150, 150);
      const baseCol = this._rand(FW_COLORS);
      const n = 30 + Math.floor(Math.random()*20);
      for (let i = 0; i < n; i++) {
        const angle = (i/n) * Math.PI*2 + this._rnd(-0.1,0.1);
        const speed = this._rnd(80, 220);
        this._p.push(new Particle(bx, by,
          Math.cos(angle)*speed, Math.sin(angle)*speed,
          this._rnd(0.6,1.4), baseCol, this._rnd(2,6), 'spark', 180));
      }
      // 링 이펙트
      for (let sz = 5; sz < 50; sz += 8) {
        this._p.push(new Particle(bx, by, 0, 0, 0.4, baseCol, sz, 'ring', 0));
      }
    }
  }

  spawnHintReveal(cx, cy) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this._rnd(30, 100);
      this._p.push(new Particle(cx, cy,
        Math.cos(angle)*speed, Math.sin(angle)*speed,
        this._rnd(0.5,1.0), `rgb(${100+Math.floor(Math.random()*80)},${180+Math.floor(Math.random()*75)},255)`,
        this._rnd(3,7), 'star', 40));
    }
  }

  clear() { this._p = []; }
  count() { return this._p.length; }
}

// ── 별빛 배경 ────────────────────────────────────────────────────────────

class StarField {
  constructor(w, h) {
    this.w = w; this.h = h;
    this._time = 0;
    this._layers = this._build(w, h);
  }

  _build(w, h) {
    const rnd = (a,b) => Math.random()*(b-a)+a;
    const COLS = ['#ffffff','#c8dcff','#fff0c8','#b4ffe8','#ffc8c8'];
    return [
      { stars: Array.from({length:120},()=>({x:rnd(0,w),y:rnd(0,h),r:1,twinkle:rnd(0,Math.PI*2),col:COLS[Math.floor(Math.random()*COLS.length)]})), speed:0, alpha:0.55 },
      { stars: Array.from({length:60}, ()=>({x:rnd(0,w),y:rnd(0,h),r:1.5,twinkle:rnd(0,Math.PI*2),col:COLS[Math.floor(Math.random()*COLS.length)]})), speed:0, alpha:0.78 },
      { stars: Array.from({length:25}, ()=>({x:rnd(0,w),y:rnd(0,h),r:2,twinkle:rnd(0,Math.PI*2),col:COLS[Math.floor(Math.random()*COLS.length)]})), speed:45, alpha:1.0 },
    ];
  }

  resize(w, h) { this.w = w; this.h = h; this._layers = this._build(w, h); }

  update(dt) {
    this._time += dt;
    for (const layer of this._layers) {
      if (!layer.speed) continue;
      for (const s of layer.stars) {
        s.y += layer.speed * dt;
        if (s.y > this.h) { s.y = 0; s.x = Math.random() * this.w; }
      }
    }
  }

  draw(ctx) {
    for (const layer of this._layers) {
      for (const s of layer.stars) {
        const t = 0.5 + 0.5 * Math.sin(this._time * 2.5 + s.twinkle);
        ctx.globalAlpha = layer.alpha * (0.5 + 0.5 * t);
        ctx.fillStyle = s.col;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ── 성운 배경 (오프스크린 캔버스) ─────────────────────────────────────────

class NebulaBackground {
  constructor(w, h) {
    this._canvas = document.createElement('canvas');
    this._canvas.width = w; this._canvas.height = h;
    this._build(w, h);
  }

  _build(w, h) {
    const ctx = this._canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0,   '#05051a');
    grad.addColorStop(0.4, '#060820');
    grad.addColorStop(0.7, '#080520');
    grad.addColorStop(1,   '#05051a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const NEBULA = [
      [w*0.2, h*0.3, '#281450', 160],
      [w*0.7, h*0.2, '#0a1e50', 180],
      [w*0.5, h*0.7, '#3c0a28', 140],
      [w*0.8, h*0.8, '#0a3c3c', 130],
    ];
    for (const [cx, cy, col, size] of NEBULA) {
      for (let i = 0; i < 18; i++) {
        const rx = cx + (Math.random()-0.5)*size*2;
        const ry = cy + (Math.random()-0.5)*size*2;
        const r  = size * (0.3 + Math.random()*0.5);
        const g  = ctx.createRadialGradient(rx,ry,0,rx,ry,r);
        g.addColorStop(0, col + '28');
        g.addColorStop(1, col + '00');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  resize(w, h) {
    this._canvas.width = w; this._canvas.height = h;
    this._build(w, h);
  }

  draw(ctx) {
    ctx.drawImage(this._canvas, 0, 0);
  }
}

// particles.js - 파티클 시스템 + 6가지 이펙트 테마 + 별빛 배경

// ═══════════════════════════════════════════════════════════════════════════
// 이펙트 테마 정의
// ═══════════════════════════════════════════════════════════════════════════
const EFFECT_THEMES = {
  galaxy: {
    id: 'galaxy', name: '🌌 갤럭시', desc: '별빛 폭발, 성운 파티클',
    colors: ['#ffdc50','#a0c8ff','#c8e8ff','#ffffa0','#78e8ff','#b450ff'],
    lineColors: ['#78e8ff','#a050ff','#50c8ff'],
    kind: 'star', gravity: 60, speed: [60, 200], count: 20, size: [3,7],
  },
  fire: {
    id: 'fire', name: '🔥 파이어', desc: '불꽃 튀기는 화염 이펙트',
    colors: ['#ff6000','#ff9020','#ffcc40','#ff3010','#ffee80','#ff8000'],
    lineColors: ['#ff6000','#ffcc40','#ff4400'],
    kind: 'spark', gravity: -180, speed: [80, 240], count: 22, size: [2,6],
  },
  ice: {
    id: 'ice', name: '❄️ 아이스', desc: '얼음 결정 부서지는 효과',
    colors: ['#a0e8ff','#d0f8ff','#ffffff','#80d0ff','#c0f0ff','#60c8ff'],
    lineColors: ['#a0e8ff','#ffffff','#60c8ff'],
    kind: 'crystal', gravity: 30, speed: [50, 160], count: 18, size: [3,8],
  },
  neon: {
    id: 'neon', name: '⚡ 네온', desc: '전기 방전, 형광 링',
    colors: ['#00ffff','#ff00ff','#00ff80','#ff8000','#8000ff','#ffff00'],
    lineColors: ['#00ffff','#ff00ff','#00ff80'],
    kind: 'electric', gravity: 0, speed: [100, 300], count: 16, size: [2,5],
  },
  sakura: {
    id: 'sakura', name: '🌸 벚꽃', desc: '꽃잎이 흩날리는 효과',
    colors: ['#ffb7d5','#ff8fb0','#ffd0e8','#ff6699','#ffe0f0','#ffaacc'],
    lineColors: ['#ffb7d5','#ff8fb0','#ffd0e8'],
    kind: 'petal', gravity: 120, speed: [30, 120], count: 24, size: [4,10],
  },
  rainbow: {
    id: 'rainbow', name: '🌈 레인보우', desc: '무지개빛 다채로운 폭죽',
    colors: ['#ff4040','#ff9900','#ffff00','#40ff80','#4080ff','#aa40ff','#ff40aa'],
    lineColors: ['#ff9900','#40ff80','#4080ff'],
    kind: 'spark', gravity: 90, speed: [70, 220], count: 28, size: [2,7],
  },
};

const EFFECT_ORDER = ['galaxy','fire','ice','neon','sakura','rainbow'];

function getCurrentTheme() {
  const id = Storage.getSettings().effectTheme || 'galaxy';
  return EFFECT_THEMES[id] || EFFECT_THEMES.galaxy;
}

// ═══════════════════════════════════════════════════════════════════════════
// 파티클 클래스
// ═══════════════════════════════════════════════════════════════════════════
class Particle {
  constructor(x, y, vx, vy, life, color, size, kind = 'spark', gravity = 0) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color; this.size = size;
    this.kind = kind; this.gravity = gravity;
    this.angle = Math.random() * Math.PI * 2;
    this.spin  = (Math.random() - 0.5) * 8;
  }
  get alive() { return this.life > 0; }
  get ratio() { return Math.max(0, this.life / this.maxLife); }

  update(dt) {
    this.x     += this.vx * dt;
    this.y     += this.vy * dt;
    this.vy    += this.gravity * dt;
    this.vx    *= 0.97;
    this.angle += this.spin * dt;
    this.life  -= dt;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 파티클 시스템
// ═══════════════════════════════════════════════════════════════════════════
class ParticleSystem {
  constructor() { this._p = []; }

  update(dt) {
    for (const p of this._p) p.update(dt);
    this._p = this._p.filter(p => p.alive);
  }

  draw(ctx) {
    for (const p of this._p) {
      const a = p.ratio;
      const sz = Math.max(1, p.size * (0.3 + 0.7 * a));
      // 모든 그리기는 save/restore 안에서 수행 — globalAlpha 누수 방지
      ctx.save();
      ctx.globalAlpha = a;
      switch (p.kind) {
        case 'spark':    this._drawSpark(ctx, p, sz); break;
        case 'star':     this._drawStarShape(ctx, p, sz); break;
        case 'crystal':  this._drawCrystal(ctx, p, sz); break;
        case 'electric': this._drawElectric(ctx, p, sz); break;
        case 'petal':    this._drawPetal(ctx, p, sz); break;
        case 'ring':     this._drawRing(ctx, p, sz); break;
        case 'trail':
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI*2); ctx.fill();
          break;
      }
      ctx.restore();
    }
    // 보험용 — 루프 후 항상 초기화
    ctx.globalAlpha = 1;
  }

  _drawSpark(ctx, p, sz) {
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, sz, 0, Math.PI*2); ctx.fill();
    if (sz > 2) {
      ctx.globalAlpha *= 0.4;  // 외부 save로 보호되므로 상대적으로 줄임
      ctx.beginPath(); ctx.arc(p.x, p.y, sz * 2, 0, Math.PI*2); ctx.fill();
    }
  }

  _drawStarShape(ctx, p, sz) {
    if (sz < 2) { this._drawSpark(ctx, p, sz); return; }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = sz * 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = (i * 36 - 90) * Math.PI / 180;
      const r = i % 2 === 0 ? sz : sz * 0.4;
      i === 0 ? ctx.moveTo(r*Math.cos(ang), r*Math.sin(ang))
              : ctx.lineTo(r*Math.cos(ang), r*Math.sin(ang));
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawCrystal(ctx, p, sz) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, sz * 0.25);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = sz * 3;
    // 다이아몬드 형태
    ctx.beginPath();
    ctx.moveTo(0, -sz); ctx.lineTo(sz*0.6, 0);
    ctx.lineTo(0, sz);  ctx.lineTo(-sz*0.6, 0);
    ctx.closePath();
    ctx.stroke();
    // 내부 십자
    ctx.beginPath();
    ctx.moveTo(0, -sz*0.6); ctx.lineTo(0, sz*0.6);
    ctx.moveTo(-sz*0.4, 0); ctx.lineTo(sz*0.4, 0);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawElectric(ctx, p, sz) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, sz * 0.3);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = sz * 4;
    ctx.globalAlpha *= (0.6 + 0.4 * Math.sin(p.life * 30));
    const len = sz * 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    for (let i = 1; i <= 4; i++) {
      const ox = (Math.random() - 0.5) * sz * 2;
      const oy = (Math.random() - 0.5) * sz * 2;
      ctx.lineTo(p.x + ox + p.vx*0.01*i, p.y + oy + p.vy*0.01*i);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _drawPetal(ctx, p, sz) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    ctx.globalAlpha *= 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 0, sz * 0.5, sz, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawRing(ctx, p, sz) {
    const r = sz * (1.5 - p.ratio * 0.5);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, sz * 0.2);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  _rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  _rnd(min, max) { return Math.random() * (max - min) + min; }

  // ── 테마별 셀 채우기 이펙트 ───────────────────────────────────────────
  spawnCellFill(cx, cy) {
    const th = getCurrentTheme();
    const n = th.count + Math.floor(Math.random() * 8);

    if (th.id === 'neon') {
      // 링 + 전기
      for (let r = 6; r <= 40; r += 10) {
        this._p.push(new Particle(cx, cy, 0, 0, this._rnd(0.25,0.5),
          this._rand(th.colors), r, 'ring', 0));
      }
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = this._rnd(...th.speed);
        this._p.push(new Particle(cx, cy,
          Math.cos(angle)*speed, Math.sin(angle)*speed,
          this._rnd(0.2, 0.5), this._rand(th.colors), this._rnd(...th.size),
          'electric', th.gravity));
      }
    } else if (th.id === 'fire') {
      // 불꽃은 위로 솟구침
      for (let i = 0; i < n; i++) {
        const angle = -Math.PI/2 + this._rnd(-0.9, 0.9);
        const speed = this._rnd(...th.speed);
        this._p.push(new Particle(cx, cy,
          Math.cos(angle)*speed, Math.sin(angle)*speed,
          this._rnd(0.3, 0.7), this._rand(th.colors), this._rnd(...th.size),
          'spark', th.gravity));
      }
    } else if (th.id === 'sakura') {
      // 꽃잎 + 느린 낙하
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = this._rnd(...th.speed);
        this._p.push(new Particle(cx, cy,
          Math.cos(angle)*speed, Math.sin(angle)*speed - 40,
          this._rnd(0.7, 1.4), this._rand(th.colors), this._rnd(...th.size),
          'petal', th.gravity));
      }
    } else {
      // galaxy, ice, rainbow — 일반 방사형
      for (let i = 0; i < n; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = this._rnd(...th.speed);
        this._p.push(new Particle(cx, cy,
          Math.cos(angle)*speed, Math.sin(angle)*speed,
          this._rnd(0.3, 0.8), this._rand(th.colors), this._rnd(...th.size),
          th.kind, th.gravity));
      }
      // 작은 반짝이 링
      for (let r = 5; r <= 25; r += 8) {
        this._p.push(new Particle(cx, cy, 0, 0, this._rnd(0.2, 0.4),
          this._rand(th.colors), r, 'ring', 0));
      }
    }
  }

  spawnCellError(cx, cy) {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this._rnd(40, 130);
      const r = 200 + Math.floor(Math.random()*55);
      this._p.push(new Particle(cx, cy,
        Math.cos(angle)*speed, Math.sin(angle)*speed,
        this._rnd(0.25, 0.6), `rgb(${r},${Math.floor(Math.random()*60)},40)`,
        3, 'spark', 80));
    }
    for (let r = 5; r <= 30; r += 8) {
      this._p.push(new Particle(cx, cy, 0, 0, 0.35, '#ff4020', r, 'ring', 0));
    }
  }

  spawnLineClear(x1, y1, x2, y2, isRow) {
    const th = getCurrentTheme();
    const cols = th.lineColors;
    for (let i = 0; i < 50; i++) {
      const t = i / 50;
      const px = x1 + (x2-x1)*t, py = y1 + (y2-y1)*t;
      const vx = this._rnd(-40, 40);
      const vy = isRow ? this._rnd(-100, -20) : this._rnd(-40, 40);
      this._p.push(new Particle(px, py, vx, vy, this._rnd(0.4, 1.0),
        this._rand(cols), this._rnd(3, 8), th.kind, 60));
    }
    for (let i = 0; i < 14; i++) {
      const t = Math.random();
      const px = x1+(x2-x1)*t, py = y1+(y2-y1)*t;
      this._p.push(new Particle(px, py, this._rnd(-25,25), this._rnd(-70,-15),
        this._rnd(0.5,1.0), this._rand(cols), this._rnd(4,10), 'star', 30));
    }
  }

  spawnFireworks(cx, cy, bursts = 5) {
    const th = getCurrentTheme();
    for (let b = 0; b < bursts; b++) {
      const bx = cx + this._rnd(-200, 200);
      const by = cy + this._rnd(-150, 150);
      const baseCol = this._rand(th.colors);
      const n = 36 + Math.floor(Math.random()*16);
      for (let i = 0; i < n; i++) {
        const angle = (i/n) * Math.PI*2 + this._rnd(-0.1,0.1);
        const speed = this._rnd(100, 260);
        this._p.push(new Particle(bx, by,
          Math.cos(angle)*speed, Math.sin(angle)*speed,
          this._rnd(0.7, 1.6), baseCol, this._rnd(2,7), th.kind, 180));
      }
      for (let r = 8; r < 60; r += 10) {
        this._p.push(new Particle(bx, by, 0, 0, 0.45, baseCol, r, 'ring', 0));
      }
    }
  }

  spawnHintReveal(cx, cy) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this._rnd(40, 120);
      this._p.push(new Particle(cx, cy,
        Math.cos(angle)*speed, Math.sin(angle)*speed,
        this._rnd(0.5, 1.1),
        `rgb(${100+Math.floor(Math.random()*80)},${180+Math.floor(Math.random()*75)},255)`,
        this._rnd(3, 8), 'star', 40));
    }
  }

  // 미리보기용 (설정 화면에서 데모)
  spawnPreview(cx, cy, themeId) {
    const th = EFFECT_THEMES[themeId];
    if (!th) return;
    const n = 18;
    for (let i = 0; i < n; i++) {
      const angle = (i/n) * Math.PI*2;
      const speed = this._rnd(50, 150);
      this._p.push(new Particle(cx, cy,
        Math.cos(angle)*speed, Math.sin(angle)*speed,
        this._rnd(0.4, 0.9), this._rand(th.colors), this._rnd(3, 8),
        th.kind, th.gravity * 0.5));
    }
    for (let r = 6; r <= 30; r += 10) {
      this._p.push(new Particle(cx, cy, 0, 0, 0.35, this._rand(th.colors), r, 'ring', 0));
    }
  }

  clear() { this._p = []; }
  count() { return this._p.length; }
}

// ═══════════════════════════════════════════════════════════════════════════
// 별빛 배경
// ═══════════════════════════════════════════════════════════════════════════
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
      { stars: Array.from({length:120},()=>({x:rnd(0,w),y:rnd(0,h),r:1,  twinkle:rnd(0,Math.PI*2),col:COLS[Math.floor(Math.random()*COLS.length)]})), speed:0,  alpha:0.55 },
      { stars: Array.from({length:60}, ()=>({x:rnd(0,w),y:rnd(0,h),r:1.5,twinkle:rnd(0,Math.PI*2),col:COLS[Math.floor(Math.random()*COLS.length)]})), speed:0,  alpha:0.78 },
      { stars: Array.from({length:25}, ()=>({x:rnd(0,w),y:rnd(0,h),r:2,  twinkle:rnd(0,Math.PI*2),col:COLS[Math.floor(Math.random()*COLS.length)]})), speed:45, alpha:1.0  },
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
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 성운 배경
// ═══════════════════════════════════════════════════════════════════════════
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
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

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
        g.addColorStop(0, col+'28'); g.addColorStop(1, col+'00');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(rx, ry, r, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  resize(w, h) { this._canvas.width = w; this._canvas.height = h; this._build(w, h); }
  draw(ctx) { ctx.drawImage(this._canvas, 0, 0); }
}

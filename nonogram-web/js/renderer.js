// renderer.js - Canvas 2D 렌더링 (그리드, 힌트, 네온 UI)

// ── 비주얼 테마 정의 ─────────────────────────────────────────────────────────
const VISUAL_THEMES = {
  galaxy: {
    id: 'galaxy', name: '🌌 갤럭시', desc: '별빛 우주 공간',
    bg: '#05051a',
    cellEmpty: '#0e1530', cellHover: '#141e46',
    cellFilled: '#3ca0ff', cellFilled2: '#64c8ff',
    gridLine: 'rgba(50,70,130,0.95)', grid5Line: 'rgba(90,120,200,1.0)',
    hintBg: 'rgba(5,8,25,0.97)', rowDone: 'rgba(20,80,35,0.75)',
    xStroke: 'rgba(255,255,255,0.9)',
    neonAccent: '#50b4ff', progressFg: '#3cb4ff',
    nebulaColors: ['#281450','#0a1e50','#3c0a28','#0a3c3c'],
    starColors: ['#ffffff','#c8dcff','#fff0c8','#b4ffe8','#ffc8c8'],
    particleKind: 'star', particleGravity: 60,
    particleColors: ['#ffdc50','#a0c8ff','#c8e8ff','#ffffa0','#78e8ff','#b450ff'],
  },
  sakura: {
    id: 'sakura', name: '🌸 벚꽃', desc: '봄 벚꽃 흩날리는 숲',
    bg: '#1a0815',
    cellEmpty: '#2a1020', cellHover: '#3d1830',
    cellFilled: '#ff7eb3', cellFilled2: '#ffb3d1',
    gridLine: 'rgba(180,80,120,0.7)', grid5Line: 'rgba(220,100,150,0.95)',
    hintBg: 'rgba(20,5,15,0.97)', rowDone: 'rgba(80,20,50,0.75)',
    xStroke: 'rgba(255,255,255,0.9)',
    neonAccent: '#ff7eb3', progressFg: '#ff7eb3',
    nebulaColors: ['#3c0820','#280818','#4a1030','#200510'],
    starColors: ['#ffb7d5','#ffd0e8','#fff0f5','#ff99cc','#ffe0ee'],
    particleKind: 'petal', particleGravity: 120,
    particleColors: ['#ffb7d5','#ff8fb0','#ffd0e8','#ff6699','#ffe0f0','#ffaacc'],
  },
  desert: {
    id: 'desert', name: '🏜️ 사막', desc: '황금빛 모래 폭풍',
    bg: '#1a1005',
    cellEmpty: '#2a1e08', cellHover: '#3d2e10',
    cellFilled: '#f0a030', cellFilled2: '#ffc850',
    gridLine: 'rgba(150,100,30,0.8)', grid5Line: 'rgba(200,140,40,0.95)',
    hintBg: 'rgba(18,12,3,0.97)', rowDone: 'rgba(80,55,10,0.75)',
    xStroke: 'rgba(255,240,200,0.9)',
    neonAccent: '#f0a030', progressFg: '#f0a030',
    nebulaColors: ['#3c2808','#281800','#4a3010','#200e00'],
    starColors: ['#ffd080','#ffe4a0','#fff0c0','#ffcc60','#ffe8b0'],
    particleKind: 'spark', particleGravity: 90,
    particleColors: ['#ff8800','#ffaa20','#ffcc40','#ff6600','#ffee80','#ff9900'],
  },
  forest: {
    id: 'forest', name: '🌲 숲', desc: '신비로운 마법의 숲',
    bg: '#020f02',
    cellEmpty: '#081508', cellHover: '#102010',
    cellFilled: '#40c060', cellFilled2: '#70e880',
    gridLine: 'rgba(30,80,30,0.9)', grid5Line: 'rgba(50,120,50,0.95)',
    hintBg: 'rgba(2,8,2,0.97)', rowDone: 'rgba(10,60,15,0.75)',
    xStroke: 'rgba(200,255,200,0.9)',
    neonAccent: '#40c060', progressFg: '#40c060',
    nebulaColors: ['#082808','#041804','#0c3c0c','#041004'],
    starColors: ['#a0ffb0','#c0ffc0','#e0ffe0','#80ff90','#d0ffd8'],
    particleKind: 'petal', particleGravity: 80,
    particleColors: ['#40ff60','#80ff90','#c0ffb0','#20e040','#a0ffc0','#60ff80'],
  },
  arctic: {
    id: 'arctic', name: '❄️ 북극', desc: '얼음 결정 설원',
    bg: '#020818',
    cellEmpty: '#081828', cellHover: '#102840',
    cellFilled: '#80d8ff', cellFilled2: '#c0f0ff',
    gridLine: 'rgba(80,140,200,0.8)', grid5Line: 'rgba(120,180,240,0.95)',
    hintBg: 'rgba(2,5,18,0.97)', rowDone: 'rgba(20,60,90,0.75)',
    xStroke: 'rgba(220,240,255,0.95)',
    neonAccent: '#80d8ff', progressFg: '#80d8ff',
    nebulaColors: ['#081838','#041028','#0c2848','#041828'],
    starColors: ['#ffffff','#d0f0ff','#e8f8ff','#a0e8ff','#f0faff'],
    particleKind: 'crystal', particleGravity: 30,
    particleColors: ['#a0e8ff','#d0f8ff','#ffffff','#80d0ff','#c0f0ff','#60c8ff'],
  },
  ocean: {
    id: 'ocean', name: '🌊 딥오션', desc: '심해 발광 생물',
    bg: '#000a18',
    cellEmpty: '#001525', cellHover: '#002038',
    cellFilled: '#0088cc', cellFilled2: '#00bbff',
    gridLine: 'rgba(0,80,120,0.9)', grid5Line: 'rgba(0,120,180,0.95)',
    hintBg: 'rgba(0,5,15,0.97)', rowDone: 'rgba(0,50,80,0.75)',
    xStroke: 'rgba(150,240,255,0.9)',
    neonAccent: '#00bbff', progressFg: '#0088cc',
    nebulaColors: ['#001830','#000c20','#002840','#001020'],
    starColors: ['#00ffff','#40e0ff','#80f0ff','#00ddcc','#60ffee'],
    particleKind: 'ring', particleGravity: -20,
    particleColors: ['#00ffff','#0088ff','#00ddaa','#4080ff','#80ffee','#00bbcc'],
  },
  lava: {
    id: 'lava', name: '🌋 용암', desc: '마그마 불꽃 폭발',
    bg: '#180200',
    cellEmpty: '#280500', cellHover: '#3c0800',
    cellFilled: '#ff4400', cellFilled2: '#ff8020',
    gridLine: 'rgba(120,20,0,0.9)', grid5Line: 'rgba(180,40,0,0.95)',
    hintBg: 'rgba(15,2,0,0.97)', rowDone: 'rgba(80,15,0,0.75)',
    xStroke: 'rgba(255,200,100,0.9)',
    neonAccent: '#ff4400', progressFg: '#ff4400',
    nebulaColors: ['#3c0800','#280400','#4a0c00','#200300'],
    starColors: ['#ff8040','#ffaa60','#ff6020','#ffcc80','#ff9050'],
    particleKind: 'spark', particleGravity: -180,
    particleColors: ['#ff6000','#ff9020','#ffcc40','#ff3010','#ffee80','#ff8000'],
  },
};
const VISUAL_ORDER = ['galaxy','sakura','desert','forest','arctic','ocean','lava'];

// 현재 비주얼 테마 반환
function getCurrentVisualTheme() {
  const id = (typeof Storage !== 'undefined') ? (Storage.getSettings().visualTheme || 'galaxy') : 'galaxy';
  return VISUAL_THEMES[id] || VISUAL_THEMES.galaxy;
}

// ── 색상 상수 C (테마에 따라 동적으로 업데이트) ──────────────────────────────
const C = {
  bg:           '#05051a',
  panel:        'rgba(10,15,40,0.85)',
  panelBorder:  'rgba(40,60,120,0.8)',
  gridLine:     'rgba(50,70,130,0.95)',
  grid5Line:    'rgba(90,120,200,1.0)',
  cellEmpty:    '#0e1530',
  cellHover:    '#141e46',
  cellFilled:   '#3ca0ff',
  cellFilled2:  '#64c8ff',
  cellMarked:   '#3c3c5a',
  hintNormal:   '#b4c8f0',
  hintDone:     '#50c878',
  hintBg:       'rgba(5,8,25,0.97)',
  rowDone:      'rgba(20,80,35,0.75)',
  gold:         '#ffd23c',
  neonBlue:     '#50b4ff',
  neonPurple:   '#b450ff',
  neonCyan:     '#3cf0dc',
  neonPink:     '#ff64b4',
  white:        '#ffffff',
  timer:        '#a0dcff',
  errorRed:     '#ff3c50',
  progressBg:   'rgba(15,20,50,0.8)',
  progressFg:   '#3cb4ff',
  xStroke:      'rgba(255,255,255,0.9)',
};

// 테마 색상을 C에 적용
function applyVisualTheme(themeId) {
  const t = VISUAL_THEMES[themeId] || VISUAL_THEMES.galaxy;
  C.bg          = t.bg;
  C.cellEmpty   = t.cellEmpty;
  C.cellHover   = t.cellHover;
  C.cellFilled  = t.cellFilled;
  C.cellFilled2 = t.cellFilled2;
  C.gridLine    = t.gridLine;
  C.grid5Line   = t.grid5Line;
  C.hintBg      = t.hintBg;
  C.rowDone     = t.rowDone;
  C.neonBlue    = t.neonAccent;
  C.progressFg  = t.progressFg;
  C.xStroke     = t.xStroke || 'rgba(255,255,255,0.9)';
  C.timer       = t.neonAccent;
  C.panel       = t.hintBg;
  C.panelBorder = t.gridLine;
}

// ── 폰트 헬퍼 ─────────────────────────────────────────────────────────────
function font(size, bold = false) {
  return `${bold ? 'bold ' : ''}${size}px 'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif`;
}

// ── 네온 글로우 텍스트 ────────────────────────────────────────────────────
function drawNeonText(ctx, text, x, y, color, size, bold = false, glowRadius = 6) {
  ctx.save();
  ctx.font = font(size, bold);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = glowRadius * 3;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = glowRadius;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawText(ctx, text, x, y, color, size, bold = false, align = 'center') {
  ctx.save();
  ctx.font = font(size, bold);
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ── 둥근 사각형 ───────────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── 네온 버튼 ─────────────────────────────────────────────────────────────
class NeonButton {
  constructor(x, y, w, h, label, color = C.neonBlue, fontSize = 20) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.label = label; this.color = color; this.fontSize = fontSize;
    this._hover = 0;
    this.enabled = true;
  }

  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  contains(px, py) {
    return this.enabled &&
      px >= this.x && px <= this.x + this.w &&
      py >= this.y && py <= this.y + this.h;
  }

  update(dt, mx, my) {
    const target = this.contains(mx, my) ? 1 : 0;
    this._hover += (target - this._hover) * Math.min(1, dt * 8);
  }

  draw(ctx) {
    const t = this._hover;
    ctx.save();
    roundRect(ctx, this.x, this.y, this.w, this.h, 10);
    ctx.fillStyle = `rgba(10,20,60,${0.6 + 0.3*t})`;
    ctx.fill();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5 + t;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8 * t;
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawNeonText(ctx, this.label,
      this.x + this.w/2, this.y + this.h/2,
      this.color, this.fontSize, true, t > 0.1 ? 4 : 1);
    ctx.restore();
  }
}

// ── 그리드 렌더러 ─────────────────────────────────────────────────────────
class GridRenderer {
  constructor() {
    this.cellSize = 32;
    this.hintColW = 0;
    this.hintRowH = 0;
    this.gridX = 0;
    this.gridY = 0;
    this._shakeX = 0; this._shakeY = 0;
    this._shakeDur = 0; this._shakeMag = 0;
    this._cellGlow = {};
    this._rowFlash = {};
    this._colFlash = {};
    this._hover = null;
    this._activeRow = -1;  // 현재 터치/드래그 중인 행
    this._activeCol = -1;  // 현재 터치/드래그 중인 열
    this._counterAnim = {}; // 'r{r}' / 'c{c}' → 애니 타이머
  }

  setActiveCell(cell) {
    const row = cell ? cell[0] : -1;
    const col = cell ? cell[1] : -1;
    if (row !== this._activeRow || col !== this._activeCol) {
      if (row >= 0) this._counterAnim[`r${row}`] = 0.35;
      if (col >= 0) this._counterAnim[`c${col}`] = 0.35;
    }
    this._activeRow = row;
    this._activeCol = col;
  }

  // 게임 씬용 레이아웃 — 상단/하단 UI 영역을 명시적으로 비워줌
  relayout(puzzle, canvasW, canvasH) {
    const TOP_PAD = 112; // HUD(56) + 버튼행(44) + 여유
    const BOT_PAD = 96;  // 모드버튼(44) + 열 카운터 공간(20) + 여유
    const avW = canvasW - 56; // 오른쪽 행 카운터 공간 확보
    const avH = canvasH - TOP_PAD - BOT_PAD;

    const MAX_HINT_COLS = Math.max(...puzzle.colHints.map(h => h.length));
    const MAX_HINT_ROWS = Math.max(...puzzle.rowHints.map(h => h.length));

    for (let cs = 48; cs >= 10; cs--) {
      const hw = MAX_HINT_COLS * cs;
      const hh = MAX_HINT_ROWS * cs;
      if (hw + puzzle.cols * cs <= avW && hh + puzzle.rows * cs <= avH) {
        this.cellSize  = cs;
        this.hintColW  = hw;
        this.hintRowH  = hh;
        break;
      }
    }
    const tw = this.hintColW + puzzle.cols * this.cellSize;
    const th = this.hintRowH + puzzle.rows * this.cellSize;
    this.gridX = (canvasW - tw) / 2 + this.hintColW;
    this.gridY = TOP_PAD + (avH - th) / 2 + this.hintRowH;
  }

  // 메뉴/일반 씬용 레이아웃 (하위 호환)
  layout(puzzle, canvasW, canvasH) {
    this.relayout(puzzle, canvasW, canvasH);
  }

  shake(mag = 8, dur = 0.35) { this._shakeDur = dur; this._shakeMag = mag; }
  glowCell(r, c) { this._cellGlow[`${r},${c}`] = 0.6; }
  flashRow(r) { this._rowFlash[r] = 0.8; }
  flashCol(c) { this._colFlash[c] = 0.8; }
  setHover(cell) { this._hover = cell; }

  update(dt) {
    if (this._shakeDur > 0) {
      this._shakeDur -= dt;
      const m = this._shakeMag * (this._shakeDur / 0.35);
      this._shakeX = (Math.random() - 0.5) * 2 * m;
      this._shakeY = (Math.random() - 0.5) * 2 * m;
    } else { this._shakeX = 0; this._shakeY = 0; }

    for (const k in this._cellGlow) { this._cellGlow[k] -= dt; if (this._cellGlow[k] <= 0) delete this._cellGlow[k]; }
    for (const k in this._rowFlash) { this._rowFlash[k] -= dt; if (this._rowFlash[k] <= 0) delete this._rowFlash[k]; }
    for (const k in this._colFlash) { this._colFlash[k] -= dt; if (this._colFlash[k] <= 0) delete this._colFlash[k]; }
    for (const k in this._counterAnim) { this._counterAnim[k] -= dt; if (this._counterAnim[k] <= 0) delete this._counterAnim[k]; }
  }

  getCellAt(px, py, puzzle) {
    const lx = px - this.gridX - this._shakeX;
    const ly = py - this.gridY - this._shakeY;
    if (lx < 0 || ly < 0) return null;
    const col = Math.floor(lx / this.cellSize);
    const row = Math.floor(ly / this.cellSize);
    if (row >= 0 && row < puzzle.rows && col >= 0 && col < puzzle.cols)
      return [row, col];
    return null;
  }

  cellCenter(row, col) {
    return [
      this.gridX + col * this.cellSize + this.cellSize/2 + this._shakeX,
      this.gridY + row * this.cellSize + this.cellSize/2 + this._shakeY,
    ];
  }

  draw(ctx, puzzle) {
    const cs = this.cellSize;
    const gx = this.gridX + this._shakeX;
    const gy = this.gridY + this._shakeY;

    // ── 힌트 배경 (그리드 칸과 명확히 분리) ──
    ctx.save();
    // 행 힌트 배경 (그리드 왼쪽)
    ctx.fillStyle = C.hintBg;
    roundRect(ctx, gx - this.hintColW, gy, this.hintColW, puzzle.rows * cs, 6);
    ctx.fill();
    // 열 힌트 배경 (그리드 위쪽)
    roundRect(ctx, gx, gy - this.hintRowH, puzzle.cols * cs, this.hintRowH, 6);
    ctx.fill();
    // 코너 채우기 (왼쪽 위 모서리 빈칸)
    ctx.fillStyle = C.hintBg;
    ctx.fillRect(gx - this.hintColW, gy - this.hintRowH, this.hintColW, this.hintRowH);
    ctx.restore();

    // ── 활성 행/열 하이라이트 (터치/드래그 중) ──
    if (this._activeRow >= 0 && this._activeRow < puzzle.rows) {
      ctx.fillStyle = 'rgba(100,180,255,0.12)';
      ctx.fillRect(gx - this.hintColW, gy + this._activeRow*cs, this.hintColW + puzzle.cols*cs, cs);
      ctx.strokeStyle = 'rgba(100,180,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx, gy + this._activeRow*cs, puzzle.cols*cs, cs);
    }
    if (this._activeCol >= 0 && this._activeCol < puzzle.cols) {
      ctx.fillStyle = 'rgba(100,180,255,0.12)';
      ctx.fillRect(gx + this._activeCol*cs, gy - this.hintRowH, cs, this.hintRowH + puzzle.rows*cs);
      ctx.strokeStyle = 'rgba(100,180,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(gx + this._activeCol*cs, gy, cs, puzzle.rows*cs);
    }

    // ── 완성 행/열 배경 ──
    for (let r = 0; r < puzzle.rows; r++) {
      if (!puzzle.completedRows[r]) continue;
      ctx.fillStyle = C.rowDone;
      ctx.fillRect(gx - this.hintColW, gy + r*cs, this.hintColW + puzzle.cols*cs, cs);
      const ft = this._rowFlash[r];
      if (ft > 0) {
        ctx.fillStyle = `rgba(255,210,60,${ft/0.8*0.3})`;
        ctx.fillRect(gx - this.hintColW, gy + r*cs, this.hintColW + puzzle.cols*cs, cs);
      }
    }
    for (let c = 0; c < puzzle.cols; c++) {
      if (!puzzle.completedCols[c]) continue;
      ctx.fillStyle = C.rowDone;
      ctx.fillRect(gx + c*cs, gy - this.hintRowH, cs, this.hintRowH + puzzle.rows*cs);
      const ft = this._colFlash[c];
      if (ft > 0) {
        ctx.fillStyle = `rgba(255,210,60,${ft/0.8*0.3})`;
        ctx.fillRect(gx + c*cs, gy - this.hintRowH, cs, this.hintRowH + puzzle.rows*cs);
      }
    }

    // ── 셀 ──
    const hintFontSize = Math.max(9, cs - 10);
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const x = gx + c*cs, y = gy + r*cs;
        const state = puzzle.grid[r][c];
        const glow = this._cellGlow[`${r},${c}`] || 0;
        const isHover = this._hover && this._hover[0]===r && this._hover[1]===c;

        if (state === CELL.FILLED) {
          // ── 채운 칸: 강한 그라디언트 + 글로우 ──
          ctx.save();
          const grad = ctx.createLinearGradient(x, y, x+cs, y+cs);
          grad.addColorStop(0, C.cellFilled2);
          grad.addColorStop(1, C.cellFilled);
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, cs, cs);
          // 상단 하이라이트
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(x+2, y+2, cs-6, Math.max(2, cs*0.15));
          // 항상 은은한 글로우
          ctx.shadowColor = C.neonBlue;
          ctx.shadowBlur = 8;
          ctx.strokeStyle = 'rgba(100,200,255,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x+1, y+1, cs-2, cs-2);
          ctx.shadowBlur = 0;
          // 방금 채운 칸 강한 글로우
          if (glow > 0) {
            ctx.shadowColor = C.neonBlue;
            ctx.shadowBlur = 24 * (glow/0.6);
            ctx.fillStyle = `rgba(80,180,255,${glow/0.6*0.45})`;
            ctx.fillRect(x-4, y-4, cs+8, cs+8);
            ctx.shadowBlur = 0;
          }
          ctx.restore();

        } else if (state === CELL.MARKED) {
          // ── X 표시 (채우기와 동일한 파란 계열) ──
          ctx.save();
          const grad = ctx.createLinearGradient(x, y, x+cs, y+cs);
          grad.addColorStop(0, C.cellFilled2);
          grad.addColorStop(1, C.cellFilled);
          ctx.fillStyle = grad;
          ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(x+2, y+2, cs-6, Math.max(2, cs*0.15));
          const m = cs * 0.22;
          ctx.strokeStyle = C.xStroke;
          ctx.lineWidth = Math.max(2, cs * 0.15);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x+m, y+m);     ctx.lineTo(x+cs-m, y+cs-m);
          ctx.moveTo(x+cs-m, y+m);  ctx.lineTo(x+m, y+cs-m);
          ctx.stroke();
          ctx.restore();

        } else if (state === CELL.MEMO) {
          // ── 메모 ▲ (후보 칸) ──
          ctx.save();
          ctx.fillStyle = 'rgba(10,20,50,0.75)';
          ctx.fillRect(x, y, cs, cs);
          // 삼각형 ▲
          const triSize = cs * 0.52;
          const tx = x + cs/2;
          const ty = y + cs/2 + triSize*0.18;
          ctx.beginPath();
          ctx.moveTo(tx,                     ty - triSize*0.62);
          ctx.lineTo(tx + triSize*0.55,      ty + triSize*0.38);
          ctx.lineTo(tx - triSize*0.55,      ty + triSize*0.38);
          ctx.closePath();
          ctx.fillStyle = 'rgba(80,200,255,0.82)';
          ctx.shadowColor = '#50c8ff';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
        } else {
          ctx.fillStyle = isHover ? C.cellHover : C.cellEmpty;
          ctx.fillRect(x, y, cs, cs);
        }

      }
    }

    // ── 격자선 (셀 채우기 위에 일관되게 선으로만 그림) ──
    // 얇은 기본선
    ctx.strokeStyle = C.gridLine;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let r = 0; r <= puzzle.rows; r++) {
      const ly = gy + r * cs;
      ctx.moveTo(gx, ly);
      ctx.lineTo(gx + puzzle.cols * cs, ly);
    }
    for (let c = 0; c <= puzzle.cols; c++) {
      const lx = gx + c * cs;
      ctx.moveTo(lx, gy);
      ctx.lineTo(lx, gy + puzzle.rows * cs);
    }
    ctx.stroke();

    // 5칸마다 굵은 구분선
    ctx.strokeStyle = C.grid5Line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let r = 0; r <= puzzle.rows; r += 5) {
      const ly = gy + r * cs;
      ctx.moveTo(gx, ly);
      ctx.lineTo(gx + puzzle.cols * cs, ly);
    }
    for (let c = 0; c <= puzzle.cols; c += 5) {
      const lx = gx + c * cs;
      ctx.moveTo(lx, gy);
      ctx.lineTo(lx, gy + puzzle.rows * cs);
    }
    ctx.stroke();

    // ── 힌트 텍스트 (클리핑으로 그리드 영역 침범 방지) ──
    ctx.textBaseline = 'middle';
    ctx.font = font(hintFontSize, true);

    // 현재 그리드에서 행/열별 실제 블록 현황 계산
    const rowBlocks = Array.from({length: puzzle.rows}, (_, r) =>
      Puzzle.calcHints(puzzle.grid[r].map(c => c === CELL.FILLED ? 1 : 0)));
    const colBlocks = Array.from({length: puzzle.cols}, (_, c) =>
      Puzzle.calcHints(puzzle.grid.map(row => row[c] === CELL.FILLED ? 1 : 0)));

    // 행 힌트 (왼쪽 영역에만 그리기)
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx - this.hintColW, gy, this.hintColW, puzzle.rows * cs);
    ctx.clip();
    for (let r = 0; r < puzzle.rows; r++) {
      const hints  = puzzle.rowHints[r];
      const actual = rowBlocks[r];
      const hy = gy + r*cs + cs/2;
      const n = hints.length;
      const done = puzzle.completedRows[r];
      hints.forEach((num, i) => {
        const hx = gx - this.hintColW + (i+0.5) * this.hintColW / n;
        // 힌트 숫자와 실제 블록 매칭
        const cur = actual[i] ?? 0;
        let col;
        if (done) {
          col = C.hintDone; // 완성: 초록
        } else if (cur === num) {
          col = '#80ffaa'; // 이 블록만 맞음: 밝은 초록
        } else if (cur > 0 && cur < num) {
          col = C.gold;    // 진행 중: 금색
        } else if (cur > num) {
          col = C.errorRed; // 초과: 빨강
        } else {
          col = C.hintNormal;
        }
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        // 완성 블록은 취소선 스타일로 dim
        if (done) ctx.globalAlpha = 0.6;
        ctx.fillText(String(num), hx, hy);
        ctx.globalAlpha = 1;
      });
    }
    ctx.restore();

    // 열 힌트 (위쪽 영역에만 그리기)
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy - this.hintRowH, puzzle.cols * cs, this.hintRowH);
    ctx.clip();
    for (let c = 0; c < puzzle.cols; c++) {
      const hints  = puzzle.colHints[c];
      const actual = colBlocks[c];
      const hx = gx + c*cs + cs/2;
      const n = hints.length;
      const done = puzzle.completedCols[c];
      hints.forEach((num, i) => {
        const hy = gy - this.hintRowH + (i+0.5) * this.hintRowH / n;
        const cur = actual[i] ?? 0;
        let col;
        if (done) {
          col = C.hintDone;
        } else if (cur === num) {
          col = '#80ffaa';
        } else if (cur > 0 && cur < num) {
          col = C.gold;
        } else if (cur > num) {
          col = C.errorRed;
        } else {
          col = C.hintNormal;
        }
        ctx.fillStyle = col;
        ctx.textAlign = 'center';
        if (done) ctx.globalAlpha = 0.6;
        ctx.fillText(String(num), hx, hy);
        ctx.globalAlpha = 1;
      });
    }
    ctx.restore();

    // ── 외곽선 ──
    ctx.save();
    ctx.strokeStyle = C.neonBlue;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.neonBlue;
    ctx.shadowBlur = 8;
    ctx.strokeRect(gx, gy, puzzle.cols*cs, puzzle.rows*cs);
    ctx.restore();

    // ── 행/열 블록 카운터 오버레이 (채운 블록 수 실시간 표시) ──
    if (cs >= 14) this._drawBlockCounters(ctx, puzzle, gx, gy, cs);
  }

  // 각 행/열에 현재 채워진 블록 수를 힌트 옆에 작게 표시
  _drawBlockCounters(ctx, puzzle, gx, gy, cs) {
    const fs = Math.max(8, Math.min(cs - 4, 14));
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // ── 행: 그리드 오른쪽 바깥에 표시 ──
    const ROW_X = gx + puzzle.cols * cs + Math.max(12, cs * 0.6);
    for (let r = 0; r < puzzle.rows; r++) {
      const line   = puzzle.grid[r].map(c => c === CELL.FILLED ? 1 : 0);
      const filled = line.reduce((a, v) => a + v, 0);
      const total  = puzzle.rowHints[r].reduce((a, v) => a + v, 0);
      if (filled === 0) continue;

      const hy     = gy + r * cs + cs / 2;
      const done   = puzzle.completedRows[r];
      const active = this._activeRow === r;
      const anim   = this._counterAnim[`r${r}`] || 0;
      const ratio  = filled / total;

      let col = done ? C.hintDone : ratio >= 1 ? '#80ffaa' : active ? '#ffffff' : ratio >= 0.5 ? C.gold : C.neonBlue;
      const scale = 1 + (anim / 0.35) * 0.4; // 새 칸 채울 때 팝업 효과

      ctx.save();
      ctx.globalAlpha = done ? 0.5 : 0.92;
      ctx.font = font(Math.round(fs * scale), true);

      if (active || anim > 0) {
        // 배경 pill
        const tw = ctx.measureText(`${filled}`).width + 10;
        roundRect(ctx, ROW_X - tw/2, hy - fs*0.75, tw, fs*1.5, 4);
        ctx.fillStyle = done ? 'rgba(50,120,60,0.7)' : ratio >= 1 ? 'rgba(40,120,60,0.8)' : 'rgba(20,50,100,0.8)';
        ctx.fill();
      }
      ctx.fillStyle = col;
      if (active) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
      ctx.fillText(`${filled}`, ROW_X, hy);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── 열: 그리드 아래쪽 바깥에 표시 ──
    const COL_Y = gy + puzzle.rows * cs + Math.max(12, cs * 0.6);
    for (let c = 0; c < puzzle.cols; c++) {
      const line   = puzzle.grid.map(row => row[c] === CELL.FILLED ? 1 : 0);
      const filled = line.reduce((a, v) => a + v, 0);
      const total  = puzzle.colHints[c].reduce((a, v) => a + v, 0);
      if (filled === 0) continue;

      const hx     = gx + c * cs + cs / 2;
      const done   = puzzle.completedCols[c];
      const active = this._activeCol === c;
      const anim   = this._counterAnim[`c${c}`] || 0;
      const ratio  = filled / total;

      let col = done ? C.hintDone : ratio >= 1 ? '#80ffaa' : active ? '#ffffff' : ratio >= 0.5 ? C.gold : C.neonBlue;
      const scale = 1 + (anim / 0.35) * 0.4;

      ctx.save();
      ctx.globalAlpha = done ? 0.5 : 0.92;
      ctx.font = font(Math.round(fs * scale), true);

      if (active || anim > 0) {
        const tw = ctx.measureText(`${filled}`).width + 10;
        roundRect(ctx, hx - tw/2, COL_Y - fs*0.75, tw, fs*1.5, 4);
        ctx.fillStyle = done ? 'rgba(50,120,60,0.7)' : ratio >= 1 ? 'rgba(40,120,60,0.8)' : 'rgba(20,50,100,0.8)';
        ctx.fill();
      }
      ctx.fillStyle = col;
      if (active) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
      ctx.fillText(`${filled}`, hx, COL_Y);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }
}

// ── HUD (상단 56px: 타이틀/타이머/오류, 56~108px: 버튼 행) ─────────────────
class HUD {
  draw(ctx, puzzle, elapsed, errors, maxErrors, sw, sh) {
    // 상단 바 (0~56)
    ctx.fillStyle = 'rgba(5,8,25,0.92)';
    ctx.fillRect(0, 0, sw, 56);
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 56); ctx.lineTo(sw, 56); ctx.stroke();

    // 타이틀 중앙
    drawNeonText(ctx, puzzle.title, sw/2, 28, C.neonCyan, 17, true, 3);

    // 타이머 좌
    const mins = String(Math.floor(elapsed/60)).padStart(2,'0');
    const secs = String(Math.floor(elapsed%60)).padStart(2,'0');
    ctx.save();
    ctx.font = font(14, true);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.timer;
    ctx.fillText(`⏱ ${mins}:${secs}`, 10, 28);
    ctx.restore();

    // 오류 카운터 우
    const errCol = errors >= maxErrors ? C.errorRed : 'rgba(220,120,120,0.9)';
    ctx.save();
    ctx.font = font(14, true);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = errCol;
    ctx.fillText(`✕ ${errors}/${maxErrors}`, sw - 10, 28);
    ctx.restore();

    // 버튼 행 배경 (56~108)
    ctx.fillStyle = 'rgba(5,8,25,0.78)';
    ctx.fillRect(0, 56, sw, 52);
    ctx.strokeStyle = 'rgba(25,40,90,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 108); ctx.lineTo(sw, 108); ctx.stroke();

    // 하단 영역 배경 (모드버튼 뒤)
    ctx.fillStyle = 'rgba(5,8,25,0.82)';
    ctx.fillRect(0, sh - 68, sw, 68);
    ctx.strokeStyle = 'rgba(25,40,90,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, sh - 68); ctx.lineTo(sw, sh - 68); ctx.stroke();

    // 진행률 바 (하단)
    const prog = puzzle.progress();
    const bw = Math.min(180, sw * 0.25);
    const bx = sw/2 - bw/2, by = sh - 16;
    roundRect(ctx, bx, by, bw, 7, 3);
    ctx.fillStyle = C.progressBg; ctx.fill();
    if (prog > 0) {
      roundRect(ctx, bx, by, bw * prog, 7, 3);
      const grad = ctx.createLinearGradient(bx, 0, bx+bw, 0);
      grad.addColorStop(0, '#3cb4ff');
      grad.addColorStop(1, '#78e8ff');
      ctx.fillStyle = grad; ctx.fill();
    }
    ctx.strokeStyle = C.panelBorder; ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, 7, 3); ctx.stroke();
  }
}

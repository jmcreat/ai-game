// renderer.js - Canvas 2D 렌더링 (그리드, 힌트, 네온 UI)

const C = {
  bg:           '#05051a',
  panel:        'rgba(10,15,40,0.85)',
  panelBorder:  'rgba(40,60,120,0.8)',
  gridLine:     'rgba(30,40,80,0.9)',
  grid5Line:    'rgba(60,80,140,0.9)',
  cellEmpty:    '#0c1028',
  cellHover:    '#141e46',
  cellFilled:   '#3ca0ff',
  cellFilled2:  '#64c8ff',
  cellMarked:   '#3c3c5a',
  hintNormal:   '#b4c8f0',
  hintDone:     '#50c878',
  hintBg:       'rgba(5,8,25,0.97)',
  rowDone:      'rgba(20,60,30,0.5)',
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
};

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
  }

  // 게임 씬용 레이아웃 — 상단/하단 UI 영역을 명시적으로 비워줌
  relayout(puzzle, canvasW, canvasH) {
    const TOP_PAD = 112; // HUD(56) + 버튼행(44) + 여유
    const BOT_PAD = 76;  // 모드버튼(44) + 여유
    const avW = canvasW - 32;
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
          // ── X 표시 ──
          ctx.save();
          ctx.fillStyle = 'rgba(40,10,20,0.85)';
          ctx.fillRect(x, y, cs, cs);
          const m = cs * 0.22;
          ctx.strokeStyle = 'rgba(255,80,120,0.9)';
          ctx.lineWidth = Math.max(1.5, cs * 0.13);
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

        // 셀 테두리
        ctx.strokeStyle = (r%5===4 || c%5===4) ? C.grid5Line : C.gridLine;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x+0.5, y+0.5, cs-1, cs-1);
      }
    }

    // ── 힌트 텍스트 (클리핑으로 그리드 영역 침범 방지) ──
    ctx.textBaseline = 'middle';
    ctx.font = font(hintFontSize, true);

    // 행 힌트 (왼쪽 영역에만 그리기)
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx - this.hintColW, gy, this.hintColW, puzzle.rows * cs);
    ctx.clip();
    for (let r = 0; r < puzzle.rows; r++) {
      const hints = puzzle.rowHints[r];
      const hy = gy + r*cs + cs/2;
      const n = hints.length;
      hints.forEach((num, i) => {
        const hx = gx - this.hintColW + (i+0.5) * this.hintColW / n;
        ctx.fillStyle = puzzle.completedRows[r] ? C.hintDone : C.hintNormal;
        ctx.textAlign = 'center';
        ctx.fillText(String(num), hx, hy);
      });
    }
    ctx.restore();

    // 열 힌트 (위쪽 영역에만 그리기)
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, gy - this.hintRowH, puzzle.cols * cs, this.hintRowH);
    ctx.clip();
    for (let c = 0; c < puzzle.cols; c++) {
      const hints = puzzle.colHints[c];
      const hx = gx + c*cs + cs/2;
      const n = hints.length;
      hints.forEach((num, i) => {
        const hy = gy - this.hintRowH + (i+0.5) * this.hintRowH / n;
        ctx.fillStyle = puzzle.completedCols[c] ? C.hintDone : C.hintNormal;
        ctx.textAlign = 'center';
        ctx.fillText(String(num), hx, hy);
      });
    }
    ctx.restore();

    // ── 5칸 구분선 ──
    ctx.strokeStyle = C.grid5Line;
    ctx.lineWidth = 1.5;
    for (let r = 0; r <= puzzle.rows; r += 5) {
      const y = gy + r*cs;
      ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + puzzle.cols*cs, y); ctx.stroke();
    }
    for (let c = 0; c <= puzzle.cols; c += 5) {
      const x = gx + c*cs;
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + puzzle.rows*cs); ctx.stroke();
    }

    // ── 외곽선 ──
    ctx.save();
    ctx.strokeStyle = C.neonBlue;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.neonBlue;
    ctx.shadowBlur = 8;
    ctx.strokeRect(gx, gy, puzzle.cols*cs, puzzle.rows*cs);
    ctx.restore();
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

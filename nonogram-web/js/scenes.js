// scenes.js - 씬 관리 (메인메뉴, 스테이지선택, 게임, 무한모드 설정)

const MAX_ERRORS = 5;

// ── 유틸 ──────────────────────────────────────────────────────────────────
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── 베이스 씬 ─────────────────────────────────────────────────────────────
class Scene {
  constructor(sw, sh) { this.sw = sw; this.sh = sh; this._next = null; }
  handleEvent(e) {}
  update(dt, mx, my) {}
  draw(ctx) {}
  nextScene() { return this._next; }
}

// ═══════════════════════════════════════════════════════════════════════════
// 메인 메뉴
// ═══════════════════════════════════════════════════════════════════════════
class MainMenuScene extends Scene {
  constructor(sw, sh, nebula, starfield) {
    super(sw, sh);
    this._nebula = nebula;
    this._starfield = starfield;
    this._time = 0;
    this._buttons = [
      new NeonButton(sw/2-140, sh/2-20,  280, 52, '스테이지 플레이', C.neonBlue,   22),
      new NeonButton(sw/2-140, sh/2+50,  280, 52, '무한 모드 ∞',    C.neonPurple, 22),
      new NeonButton(sw/2-140, sh/2+120, 280, 52, '오늘의 퍼즐 📅',  C.neonCyan,   22),
    ];
    this._stats = Storage.getStats();
  }

  handleEvent(e) {
    if (e.type === 'click' || e.type === 'touchend') {
      const {x, y} = getPoint(e);
      if (this._buttons[0].contains(x, y)) this._next = { scene:'stage' };
      if (this._buttons[1].contains(x, y)) this._next = { scene:'infinite_setup' };
      if (this._buttons[2].contains(x, y)) this._next = { scene:'daily' };
    }
  }

  update(dt, mx, my) {
    this._time += dt;
    this._buttons.forEach(b => b.update(dt, mx, my));
  }

  draw(ctx) {
    this._nebula.draw(ctx);
    this._starfield.draw(ctx);

    // 제목
    const t = this._time;
    const glow = 6 + 4*Math.sin(t*2);
    ctx.save();
    ctx.font = font(52, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = C.neonCyan;
    ctx.shadowBlur = glow;
    const grad = ctx.createLinearGradient(this.sw/2-250, 0, this.sw/2+250, 0);
    grad.addColorStop(0, '#78e8ff');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#b450ff');
    ctx.fillStyle = grad;
    ctx.fillText('Nonogram Galaxy', this.sw/2, this.sh/2 - 140);
    ctx.shadowBlur = 0;
    ctx.font = font(20);
    ctx.fillStyle = 'rgba(160,200,255,0.7)';
    ctx.fillText('✦ 우주를 완성하라 ✦', this.sw/2, this.sh/2 - 88);
    ctx.restore();

    this._buttons.forEach(b => b.draw(ctx));

    // 통계
    const s = this._stats;
    const lines = [
      `클리어 ${s.cleared}  |  최고 레벨 ${s.infiniteLevel}  |  플레이 ${fmtTime(s.playTime)}`,
    ];
    ctx.save();
    ctx.font = font(14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(120,160,200,0.6)';
    ctx.fillText(lines[0], this.sw/2, this.sh - 32);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 스테이지 선택
// ═══════════════════════════════════════════════════════════════════════════
const DIFF_COLOR = { easy:'#50c878', normal:C.neonBlue, hard:C.neonPurple, expert:C.neonPink };

class StageSelectScene extends Scene {
  constructor(sw, sh, nebula, starfield) {
    super(sw, sh);
    this._nebula  = nebula;
    this._starfield = starfield;
    this._stages  = getAllStages();
    this._time    = 0;
    this._scroll  = 0;
    this._hoverId = null;
    this._back = new NeonButton(24, 16, 90, 38, '◀ 뒤로', C.neonBlue, 16);
    this._COLS = sw < 600 ? 2 : 4;
    this._CARD_W = Math.floor((sw - 80) / this._COLS);
    this._CARD_H = 110;
  }

  _cardRect(i) {
    const COLS = this._COLS, CW = this._CARD_W, CH = this._CARD_H;
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const x = 40 + col * CW;
    const y = 80 + row * (CH + 14) - this._scroll;
    return { x, y, w: CW - 16, h: CH };
  }

  handleEvent(e) {
    if (e.type === 'click' || e.type === 'touchend') {
      const {x, y} = getPoint(e);
      if (this._back.contains(x, y)) { this._next = { scene:'menu' }; return; }
      for (let i = 0; i < this._stages.length; i++) {
        const r = this._cardRect(i);
        if (x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) {
          this._next = { scene:'game', stageId: this._stages[i].id };
          return;
        }
      }
    }
    if (e.type === 'wheel') {
      this._scroll = Math.max(0, this._scroll + e.deltaY);
    }
    if (e.type === 'touchmove') {
      e.preventDefault();
    }
  }

  update(dt, mx, my) {
    this._time += dt;
    this._back.update(dt, mx, my);
    this._hoverId = null;
    for (let i = 0; i < this._stages.length; i++) {
      const r = this._cardRect(i);
      if (mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h) {
        this._hoverId = i; break;
      }
    }
  }

  draw(ctx) {
    this._nebula.draw(ctx);
    this._starfield.draw(ctx);
    // 헤더
    ctx.fillStyle = 'rgba(5,8,25,0.88)';
    ctx.fillRect(0, 0, this.sw, 68);
    drawNeonText(ctx, '스테이지 선택', this.sw/2, 34, C.neonCyan, 24, true, 4);
    this._back.draw(ctx);

    for (let i = 0; i < this._stages.length; i++) {
      const s = this._stages[i];
      const r = this._cardRect(i);
      if (r.y + r.h < 68 || r.y > this.sh) continue;

      const cleared = Storage.isStageCleared(s.id);
      const best = Storage.getBestTime(s.id);
      const hover = this._hoverId === i;
      const col = DIFF_COLOR[s.difficulty] || C.neonBlue;

      ctx.save();
      roundRect(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.fillStyle = hover ? 'rgba(15,25,60,0.95)' : 'rgba(8,12,35,0.85)';
      ctx.fill();
      ctx.strokeStyle = cleared ? '#50c878' : (hover ? col : 'rgba(40,60,120,0.7)');
      ctx.lineWidth = hover ? 2 : 1;
      if (hover) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // 번호 & 제목
      drawNeonText(ctx, String(s.id).padStart(2,'0'), r.x+22, r.y+28, col, 15, true, 1);
      drawText(ctx, s.title, r.x+r.w/2+8, r.y+28, cleared ? '#50c878' : C.white, 17, true);
      // 크기 & 난이도
      drawText(ctx, s.size, r.x+r.w/2-20, r.y+54, 'rgba(160,180,220,0.7)', 13);
      drawText(ctx, s.difficulty, r.x+r.w/2+30, r.y+54, col, 13);
      // 기록
      if (cleared) {
        drawNeonText(ctx, '✔ CLEAR', r.x+r.w-50, r.y+28, '#50c878', 12, true, 2);
        if (best) drawText(ctx, `⏱ ${fmtTime(best)}`, r.x+r.w-50, r.y+54, '#a0d8b0', 12);
      }
    }

    // 스크롤 힌트
    const COLS = this._COLS, rows = Math.ceil(this._stages.length/COLS);
    const totalH = rows * (this._CARD_H + 14) + 100;
    if (totalH > this.sh) {
      ctx.fillStyle = 'rgba(100,140,200,0.35)';
      const barH = Math.max(40, this.sh * (this.sh / totalH));
      const barY = 68 + (this.sh-68) * (this._scroll / (totalH - this.sh));
      roundRect(ctx, this.sw-6, barY, 4, barH, 2);
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 무한 모드 설정
// ═══════════════════════════════════════════════════════════════════════════
class InfiniteSetupScene extends Scene {
  constructor(sw, sh, nebula, starfield) {
    super(sw, sh);
    this._nebula = nebula; this._starfield = starfield;
    this._level = Storage.get().infiniteLevel;
    this._time = 0;
    this._back  = new NeonButton(24, 16, 90, 38, '◀ 뒤로', C.neonBlue, 16);
    this._start = new NeonButton(sw/2-120, sh/2+60, 240, 54, '시작!', C.neonCyan, 22);
    this._plus  = new NeonButton(sw/2+90, sh/2-10, 48, 48, '+', C.neonPurple, 24);
    this._minus = new NeonButton(sw/2-138, sh/2-10, 48, 48, '−', C.neonPurple, 24);
  }

  handleEvent(e) {
    if (e.type === 'click' || e.type === 'touchend') {
      const {x,y} = getPoint(e);
      if (this._back.contains(x,y))  { this._next={scene:'menu'}; return; }
      if (this._start.contains(x,y)) { this._next={scene:'infinite',level:this._level}; return; }
      if (this._plus.contains(x,y))  { this._level = Math.min(999, this._level+1); }
      if (this._minus.contains(x,y)) { this._level = Math.max(1, this._level-1); }
    }
  }

  update(dt, mx, my) {
    this._time += dt;
    [this._back, this._start, this._plus, this._minus].forEach(b=>b.update(dt,mx,my));
  }

  draw(ctx) {
    this._nebula.draw(ctx); this._starfield.draw(ctx);
    ctx.fillStyle='rgba(5,8,25,0.88)'; ctx.fillRect(0,0,this.sw,68);
    drawNeonText(ctx,'무한 모드 설정',this.sw/2,34,C.neonPurple,24,true,4);
    this._back.draw(ctx);

    // 레벨 표시
    drawNeonText(ctx,`LEVEL ${String(this._level).padStart(3,'0')}`,this.sw/2,this.sh/2-60,C.gold,42,true,8);

    const p = generateInfinitePuzzle(this._level);
    drawText(ctx,`${p.rows}×${p.cols} 그리드`,this.sw/2,this.sh/2-18,'rgba(160,200,255,0.8)',16);

    this._plus.draw(ctx); this._minus.draw(ctx); this._start.draw(ctx);

    const best = Storage.get().infiniteLevel;
    drawText(ctx,`최고 기록: LEVEL ${best}`,this.sw/2,this.sh-40,'rgba(180,160,220,0.6)',14);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 게임 씬 (스테이지 / 무한 / 데일리 공통)
// ═══════════════════════════════════════════════════════════════════════════
class GameScene extends Scene {
  constructor(sw, sh, nebula, starfield, puzzle, opts = {}) {
    super(sw, sh);
    this._nebula = nebula; this._starfield = starfield;
    this._puzzle  = puzzle;
    this._stageId = opts.stageId ?? null;
    this._level   = opts.level ?? null;
    this._isDaily = opts.isDaily ?? false;

    this._grid   = new GridRenderer();
    this._ps     = new ParticleSystem();
    this._hud    = new HUD();
    this._elapsed = 0;
    this._errors  = 0;
    this._dragging = false;
    this._dragFill = true;

    this._clearOverlay = false;
    this._clearTimer   = 0;
    this._failOverlay  = false;
    this._hintUsed = false;

    this._mx = 0; this._my = 0;

    // UI 버튼
    this._btnHint = new NeonButton(sw-110, sh-60, 100, 40, '힌트 💡', C.gold, 15);
    this._btnMenu = new NeonButton(10, 14, 80, 34, '◀ 메뉴', C.neonBlue, 14);
    this._btnReset= new NeonButton(sw-118, 14, 100, 34, '↺ 초기화', 'rgba(180,120,120,0.9)', 13);

    this._grid.layout(puzzle, sw, sh);
    this._activePointer = null;
    this._startTime = Date.now();
  }

  handleEvent(e) {
    if (e.type === 'click' || e.type === 'touchend') {
      const {x, y} = getPoint(e);
      if (this._btnMenu.contains(x, y)) { this._goMenu(); return; }
      if (this._btnReset.contains(x, y)) {
        this._puzzle.reset();
        this._errors = 0;
        this._ps.clear();
        this._clearOverlay = false;
        this._failOverlay  = false;
        return;
      }
      if (this._btnHint.contains(x, y)) { this._doHint(); return; }
    }

    if (this._clearOverlay || this._failOverlay) {
      if (e.type === 'click' || e.type === 'touchend') {
        if (this._clearOverlay) this._goNext();
        else                    this._goMenu();
      }
      return;
    }

    if (e.type === 'mousedown' || e.type === 'touchstart') {
      const {x, y, button} = getPoint(e);
      const cell = this._grid.getCellAt(x, y, this._puzzle);
      if (cell) {
        this._dragging = true;
        this._dragFill = (button !== 2);
        this._doCell(cell[0], cell[1]);
      }
    }
    if (e.type === 'mousemove' || e.type === 'touchmove') {
      const {x, y} = getPoint(e);
      this._mx = x; this._my = y;
      if (this._dragging) {
        const cell = this._grid.getCellAt(x, y, this._puzzle);
        if (cell) this._doCell(cell[0], cell[1]);
      }
    }
    if (e.type === 'mouseup' || e.type === 'touchend') {
      this._dragging = false;
    }
    if (e.type === 'contextmenu') { e.preventDefault(); }
  }

  _doCell(row, col) {
    if (this._puzzle.isSolved) return;
    const result = this._puzzle.toggleCell(row, col, this._dragFill);
    const [cx, cy] = this._grid.cellCenter(row, col);

    if (result.wasError) {
      this._errors++;
      this._ps.spawnCellError(cx, cy);
      this._grid.shake(6, 0.25);
      if (this._errors >= MAX_ERRORS) { this._failOverlay = true; return; }
    } else if (this._puzzle.grid[row][col] === CELL.FILLED) {
      this._ps.spawnCellFill(cx, cy);
      this._grid.glowCell(row, col);
    }

    if (result.rowCleared) {
      const gx = this._grid.gridX, gy = this._grid.gridY, cs = this._grid.cellSize;
      const y0 = gy + row*cs + cs/2;
      this._ps.spawnLineClear(gx, y0, gx + this._puzzle.cols*cs, y0, true);
      this._grid.flashRow(row);
    }
    if (result.colCleared) {
      const gx = this._grid.gridX, gy = this._grid.gridY, cs = this._grid.cellSize;
      const x0 = gx + col*cs + cs/2;
      this._ps.spawnLineClear(x0, gy, x0, gy + this._puzzle.rows*cs, false);
      this._grid.flashCol(col);
    }

    if (this._puzzle.isSolved) this._onSolved();
  }

  _doHint() {
    if (this._puzzle.isSolved) return;
    const cell = this._puzzle.getHintCell();
    if (!cell) return;
    this._puzzle.forceReveal(cell[0], cell[1]);
    this._hintUsed = true;
    const [cx, cy] = this._grid.cellCenter(cell[0], cell[1]);
    this._ps.spawnHintReveal(cx, cy);
    this._grid.glowCell(cell[0], cell[1]);
    if (this._puzzle.isSolved) this._onSolved();
  }

  _onSolved() {
    this._clearOverlay = true;
    this._clearTimer   = 0;
    const elapsed = this._elapsed;

    this._ps.spawnFireworks(this.sw/2, this.sh/2, 6);
    setTimeout(() => this._ps.spawnFireworks(this.sw/2, this.sh/2, 4), 600);
    setTimeout(() => this._ps.spawnFireworks(this.sw/2, this.sh/2, 5), 1200);

    if (this._stageId !== null) Storage.markStageCleared(this._stageId, elapsed);
    if (this._isDaily)          Storage.markDailyCleared(todayStr(), elapsed);
    if (this._level !== null)   Storage.updateInfiniteLevel(this._level + 1);
    Storage.addPlayTime(elapsed);
  }

  _goNext() {
    if (this._stageId !== null) {
      const nxt = this._stageId + 1;
      this._next = nxt <= STAGE_DATA.length
        ? { scene:'game', stageId:nxt }
        : { scene:'stage' };
    } else if (this._level !== null) {
      this._next = { scene:'infinite', level: this._level + 1 };
    } else {
      this._next = { scene:'menu' };
    }
  }

  _goMenu() {
    Storage.addPlayTime(this._elapsed);
    this._next = { scene:'menu' };
  }

  update(dt, mx, my) {
    if (!this._clearOverlay && !this._failOverlay) this._elapsed += dt;
    this._clearTimer += dt;
    this._ps.update(dt);
    this._grid.update(dt);
    this._grid.setHover(this._grid.getCellAt(mx, my, this._puzzle));
    this._btnHint.update(dt, mx, my);
    this._btnMenu.update(dt, mx, my);
    this._btnReset.update(dt, mx, my);
  }

  draw(ctx) {
    this._nebula.draw(ctx);
    this._starfield.draw(ctx);

    this._grid.draw(ctx, this._puzzle, this._elapsed);
    this._ps.draw(ctx);
    this._hud.draw(ctx, this._puzzle, this._elapsed, this._errors, MAX_ERRORS, this.sw, this.sh);

    this._btnHint.draw(ctx);
    this._btnMenu.draw(ctx);
    this._btnReset.draw(ctx);

    if (this._clearOverlay) this._drawClearOverlay(ctx);
    if (this._failOverlay)  this._drawFailOverlay(ctx);
  }

  _drawClearOverlay(ctx) {
    const t = Math.min(1, this._clearTimer / 0.6);
    ctx.fillStyle = `rgba(0,0,15,${0.7*t})`;
    ctx.fillRect(0, 0, this.sw, this.sh);

    const pulse = 1 + 0.03*Math.sin(this._clearTimer*5);
    ctx.save();
    ctx.translate(this.sw/2, this.sh/2);
    ctx.scale(pulse, pulse);
    ctx.translate(-this.sw/2, -this.sh/2);
    drawNeonText(ctx,'✦ CLEAR ✦', this.sw/2, this.sh/2-55, C.gold, 52, true, 16);
    drawNeonText(ctx, fmtTime(this._elapsed), this.sw/2, this.sh/2+10, C.neonCyan, 28, true, 6);
    const nextLabel = (this._stageId !== null && this._stageId < STAGE_DATA.length)
      ? '다음 스테이지 ▶'
      : (this._level !== null ? `LEVEL ${this._level+1} 도전 ▶` : '메뉴로 ▶');
    drawText(ctx, nextLabel, this.sw/2, this.sh/2+58, 'rgba(200,240,255,0.8)', 18);
    ctx.restore();
  }

  _drawFailOverlay(ctx) {
    ctx.fillStyle = 'rgba(20,0,0,0.75)';
    ctx.fillRect(0,0,this.sw,this.sh);
    drawNeonText(ctx,'✕ GAME OVER',this.sw/2,this.sh/2-40,C.errorRed,44,true,14);
    drawText(ctx,'오류가 너무 많습니다',this.sw/2,this.sh/2+14,'rgba(255,180,160,0.8)',20);
    drawText(ctx,'클릭하면 메뉴로...',this.sw/2,this.sh/2+50,'rgba(200,160,160,0.6)',16);
  }
}

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
      new NeonButton(sw/2-140, sh/2-30,  280, 50, '스테이지 플레이', C.neonBlue,   20),
      new NeonButton(sw/2-140, sh/2+36,  280, 50, '무한 모드 ∞',    C.neonPurple, 20),
      new NeonButton(sw/2-140, sh/2+102, 280, 50, '오늘의 퍼즐 📅',  C.neonCyan,   20),
      new NeonButton(sw/2-140, sh/2+166, 280, 50, '✨ 이펙트 설정',  C.gold,       20),
    ];
    this._stats = Storage.getStats();
  }

  handleEvent(e) {
    if (e.type === 'click' || e.type === 'touchend') {
      const {x, y} = getPoint(e);
      if (this._buttons[0].contains(x, y)) this._next = { scene:'stage' };
      if (this._buttons[1].contains(x, y)) this._next = { scene:'infinite_setup' };
      if (this._buttons[2].contains(x, y)) this._next = { scene:'daily' };
      if (this._buttons[3].contains(x, y)) this._next = { scene:'effect_settings' };
    }
  }

  update(dt, mx, my) {
    this._time += dt;
    this._buttons.forEach(b => b.update(dt, mx, my));
  }

  draw(ctx) {
    this._nebula.draw(ctx);
    this._starfield.draw(ctx);

    const t = this._time;
    const glow = 6 + 4*Math.sin(t*2);
    ctx.save();
    ctx.font = font(48, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = C.neonCyan;
    ctx.shadowBlur = glow;
    const grad = ctx.createLinearGradient(this.sw/2-250, 0, this.sw/2+250, 0);
    grad.addColorStop(0, '#78e8ff');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, '#b450ff');
    ctx.fillStyle = grad;
    ctx.fillText('Nonogram Galaxy', this.sw/2, this.sh/2 - 155);
    ctx.shadowBlur = 0;
    ctx.font = font(18);
    ctx.fillStyle = 'rgba(160,200,255,0.7)';
    ctx.fillText('✦ 우주를 완성하라 ✦', this.sw/2, this.sh/2 - 105);
    ctx.restore();

    // 현재 테마 표시
    const th = getCurrentTheme();
    ctx.save();
    ctx.font = font(13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.gold;
    ctx.fillText(`이펙트: ${th.name}`, this.sw/2, this.sh/2 + 232);
    ctx.restore();

    this._buttons.forEach(b => b.draw(ctx));

    const s = this._stats;
    ctx.save();
    ctx.font = font(13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(120,160,200,0.6)';
    ctx.fillText(`클리어 ${s.cleared}  |  최고 레벨 ${s.infiniteLevel}  |  플레이 ${fmtTime(s.playTime)}`, this.sw/2, this.sh - 28);
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
    this._touchStartY = 0;
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
    if (e.type === 'touchstart') {
      this._touchStartY = e.touches[0].clientY;
      this._scrollStart = this._scroll;
    }
    if (e.type === 'touchmove') {
      e.preventDefault();
      const dy = this._touchStartY - e.touches[0].clientY;
      this._scroll = Math.max(0, this._scrollStart + dy);
    }
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

      drawNeonText(ctx, String(s.id).padStart(2,'0'), r.x+22, r.y+28, col, 15, true, 1);
      drawText(ctx, s.title, r.x+r.w/2+8, r.y+28, cleared ? '#50c878' : C.white, 17, true);
      drawText(ctx, s.size, r.x+r.w/2-20, r.y+54, 'rgba(160,180,220,0.7)', 13);
      drawText(ctx, s.difficulty, r.x+r.w/2+30, r.y+54, col, 13);
      if (cleared) {
        drawNeonText(ctx, '✔ CLEAR', r.x+r.w-50, r.y+28, '#50c878', 12, true, 2);
        if (best) drawText(ctx, `⏱ ${fmtTime(best)}`, r.x+r.w-50, r.y+54, '#a0d8b0', 12);
      }
    }

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

    // ── 드래그 상태 ──
    this._dragging    = false;
    this._dragAction  = null;   // 'fill'|'mark'|'erase_fill'|'erase_mark'
    this._touchedCells = new Set();

    // ── 모드: 'fill' | 'mark' | 'memo' ──
    // fill  = 채우기(■)
    // mark  = X 표시(✕)
    // memo  = 메모(작은 점, 실제로는 채우기와 동일 동작 — 추후 확장 가능)
    this._mode = 'fill';

    // ── undo 스택 ──
    this._undoStack = [];

    this._clearOverlay = false;
    this._clearTimer   = 0;
    this._failOverlay  = false;
    this._mx = 0; this._my = 0;

    // ── 상단 버튼 행 (HUD 56px 아래) ──
    const TOP = 64;
    const bh  = 36;
    this._btnMenu  = new NeonButton(8,       TOP, 72, bh, '◀ 뒤로', C.neonBlue, 13);
    this._btnUndo  = new NeonButton(86,      TOP, 72, bh, '↩ 취소', 'rgba(180,200,120,0.9)', 13);
    this._btnHint  = new NeonButton(sw-160,  TOP, 74, bh, '💡 힌트', C.gold, 13);
    this._btnReset = new NeonButton(sw-82,   TOP, 74, bh, '↺ 초기화', 'rgba(180,120,120,0.9)', 12);

    // ── 하단 3버튼 (X / 연필 / 메모) ──
    const BOT_Y  = sh - 58;
    const BTN_W  = Math.min(110, (sw - 32) / 3);
    const BTN_H  = 44;
    const cx3    = sw / 2;
    this._modeButtons = [
      { id:'mark', label:'✕  X표시',  x: cx3 - BTN_W*1.5 - 6, y: BOT_Y, w: BTN_W, h: BTN_H, color: C.neonPink },
      { id:'fill', label:'✏  연필',   x: cx3 - BTN_W/2,        y: BOT_Y, w: BTN_W, h: BTN_H, color: C.neonBlue },
      { id:'memo', label:'▲  메모',   x: cx3 + BTN_W/2 + 6,    y: BOT_Y, w: BTN_W, h: BTN_H, color: C.neonCyan },
    ];
    this._modeBtnHover = [0, 0, 0];

    this._grid.relayout(puzzle, sw, sh);
  }

  handleEvent(e) {
    if (e.type === 'click' || e.type === 'touchend') {
      const {x, y} = getPoint(e);

      if (this._clearOverlay) { this._goNext(); return; }
      if (this._failOverlay)  { this._goMenu(); return; }

      if (this._btnMenu.contains(x, y))  { this._goMenu(); return; }
      if (this._btnUndo.contains(x, y))  { this._undo(); return; }
      if (this._btnHint.contains(x, y))  { this._doHint(); return; }
      if (this._btnReset.contains(x, y)) { this._resetPuzzle(); return; }

      // 모드 버튼
      for (const mb of this._modeButtons) {
        if (x >= mb.x && x <= mb.x+mb.w && y >= mb.y && y <= mb.y+mb.h) {
          this._mode = mb.id;
          return;
        }
      }
    }

    if (this._clearOverlay || this._failOverlay) return;

    if (e.type === 'mousedown' || e.type === 'touchstart') {
      const {x, y} = getPoint(e);
      if (this._isUI(x, y)) return;
      const cell = this._grid.getCellAt(x, y, this._puzzle);
      if (cell) {
        this._dragging = true;
        this._touchedCells = new Set();

        // ── 모드 결정: 마우스 우클릭은 항상 X, 터치/좌클릭은 현재 모드 ──
        // e.button: 0=왼쪽, 2=오른쪽 (터치는 undefined → 0으로 처리)
        const isRightClick = (e.button === 2);
        const mode = isRightClick ? 'mark' : this._mode;

        const cur = this._puzzle.grid[cell[0]][cell[1]];
        if (mode === 'fill') {
          // 연필: 비어있거나 메모/X면 채우기, 이미 채워져 있으면 지우기
          this._dragAction = (cur === CELL.FILLED) ? 'erase_fill' : 'fill';
        } else if (mode === 'mark') {
          // X: X가 없으면 X 찍기, 이미 X면 지우기
          this._dragAction = (cur === CELL.MARKED) ? 'erase_mark' : 'mark';
        } else if (mode === 'memo') {
          // 메모: 메모가 없으면 메모 찍기, 이미 메모면 지우기
          this._dragAction = (cur === CELL.MEMO) ? 'erase_memo' : 'memo';
        }
        this._applyCell(cell[0], cell[1]);
      }
    }
    if (e.type === 'mousemove' || e.type === 'touchmove') {
      e.preventDefault();
      const {x, y} = getPoint(e);
      this._mx = x; this._my = y;
      if (this._dragging) {
        const cell = this._grid.getCellAt(x, y, this._puzzle);
        if (cell) this._applyCell(cell[0], cell[1]);
      }
    }
    if (e.type === 'mouseup' || e.type === 'touchend') {
      this._dragging = false;
    }
    if (e.type === 'contextmenu') { e.preventDefault(); }
  }

  _isUI(x, y) {
    return y < 108 || y > this.sh - 66;
  }

  _applyCell(row, col) {
    if (this._puzzle.isSolved) return;
    const key = `${row},${col}`;
    if (this._touchedCells.has(key)) return;
    this._touchedCells.add(key);

    const before = this._puzzle.grid[row][col];
    let after = before;

    if (this._dragAction === 'fill') {
      // 채워진 칸이 아닌 경우에만 채우기 (메모/X 위에도 덮어씌움)
      if (before !== CELL.FILLED) {
        const result = this._puzzle.toggleCell(row, col, true);
        after = this._puzzle.grid[row][col];
        const [cx, cy] = this._grid.cellCenter(row, col);
        if (result.wasError) {
          this._errors++;
          this._ps.spawnCellError(cx, cy);
          this._grid.shake(6, 0.25);
          if (this._errors >= MAX_ERRORS) { this._failOverlay = true; }
        } else {
          this._ps.spawnCellFill(cx, cy);
          this._grid.glowCell(row, col);
        }
        this._handleLineClears(result, row, col);
      }
    } else if (this._dragAction === 'erase_fill') {
      if (before === CELL.FILLED) { this._puzzle.grid[row][col] = CELL.EMPTY; after = CELL.EMPTY; }
    } else if (this._dragAction === 'mark') {
      // X: EMPTY 또는 MEMO 위에 찍기 (FILLED 위에는 찍지 않음)
      if (before !== CELL.FILLED) { this._puzzle.grid[row][col] = CELL.MARKED; after = CELL.MARKED; }
    } else if (this._dragAction === 'erase_mark') {
      if (before === CELL.MARKED) { this._puzzle.grid[row][col] = CELL.EMPTY; after = CELL.EMPTY; }
    } else if (this._dragAction === 'memo') {
      // 메모: EMPTY 또는 MARKED 위에 찍기 (FILLED 위에는 찍지 않음)
      if (before !== CELL.FILLED) { this._puzzle.grid[row][col] = CELL.MEMO; after = CELL.MEMO; }
    } else if (this._dragAction === 'erase_memo') {
      if (before === CELL.MEMO) { this._puzzle.grid[row][col] = CELL.EMPTY; after = CELL.EMPTY; }
    }

    if (before !== after) {
      this._undoStack.push({ row, col, before, after });
      if (this._undoStack.length > 200) this._undoStack.shift();
    }
    if (this._puzzle.isSolved) this._onSolved();
  }

  _handleLineClears(result, row, col) {
    if (result.rowCleared) {
      const gx = this._grid.gridX, gy = this._grid.gridY, cs = this._grid.cellSize;
      this._ps.spawnLineClear(gx, gy+row*cs+cs/2, gx+this._puzzle.cols*cs, gy+row*cs+cs/2, true);
      this._grid.flashRow(row);
    }
    if (result.colCleared) {
      const gx = this._grid.gridX, gy = this._grid.gridY, cs = this._grid.cellSize;
      this._ps.spawnLineClear(gx+col*cs+cs/2, gy, gx+col*cs+cs/2, gy+this._puzzle.rows*cs, false);
      this._grid.flashCol(col);
    }
  }

  _undo() {
    if (!this._undoStack.length) return;
    const { row, col, before } = this._undoStack.pop();
    this._puzzle.grid[row][col] = before;
    this._puzzle.completedRows[row] = false;
    const rowLine = this._puzzle.grid[row].map(c => c === CELL.FILLED ? 1 : 0);
    if (JSON.stringify(Puzzle.calcHints(rowLine)) === JSON.stringify(this._puzzle.rowHints[row]))
      this._puzzle.completedRows[row] = true;
    this._puzzle.completedCols[col] = false;
    const colLine = this._puzzle.grid.map(r => r[col] === CELL.FILLED ? 1 : 0);
    if (JSON.stringify(Puzzle.calcHints(colLine)) === JSON.stringify(this._puzzle.colHints[col]))
      this._puzzle.completedCols[col] = true;
    this._puzzle.isSolved = false;
  }

  _doHint() {
    if (this._puzzle.isSolved) return;
    const cell = this._puzzle.getHintCell();
    if (!cell) return;
    const before = this._puzzle.grid[cell[0]][cell[1]];
    this._puzzle.forceReveal(cell[0], cell[1]);
    this._undoStack.push({ row:cell[0], col:cell[1], before, after:CELL.FILLED });
    const [cx, cy] = this._grid.cellCenter(cell[0], cell[1]);
    this._ps.spawnHintReveal(cx, cy);
    this._grid.glowCell(cell[0], cell[1]);
    if (this._puzzle.isSolved) this._onSolved();
  }

  _resetPuzzle() {
    this._puzzle.reset();
    this._errors = 0;
    this._undoStack = [];
    this._ps.clear();
    this._clearOverlay = false;
    this._failOverlay  = false;
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
      this._next = nxt <= STAGE_DATA.length ? { scene:'game', stageId:nxt } : { scene:'stage' };
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
    this._btnMenu.update(dt, mx, my);
    this._btnUndo.update(dt, mx, my);
    this._btnHint.update(dt, mx, my);
    this._btnReset.update(dt, mx, my);
    // 모드버튼 호버
    this._modeButtons.forEach((mb, i) => {
      const inside = mx >= mb.x && mx <= mb.x+mb.w && my >= mb.y && my <= mb.y+mb.h;
      this._modeBtnHover[i] = Math.min(1, Math.max(0,
        this._modeBtnHover[i] + (inside ? 1 : -1) * Math.min(1, dt*8)));
    });
  }

  draw(ctx) {
    this._nebula.draw(ctx);
    this._starfield.draw(ctx);
    this._grid.draw(ctx, this._puzzle);
    this._ps.draw(ctx);
    this._hud.draw(ctx, this._puzzle, this._elapsed, this._errors, MAX_ERRORS, this.sw, this.sh);

    this._btnMenu.draw(ctx);
    this._btnUndo.draw(ctx);
    this._btnHint.draw(ctx);
    this._btnReset.draw(ctx);

    this._drawModeButtons(ctx);

    if (this._clearOverlay) this._drawClearOverlay(ctx);
    if (this._failOverlay)  this._drawFailOverlay(ctx);
  }

  _drawModeButtons(ctx) {
    this._modeButtons.forEach((mb, i) => {
      const sel = this._mode === mb.id;
      const t   = this._modeBtnHover[i];
      ctx.save();
      roundRect(ctx, mb.x, mb.y, mb.w, mb.h, 10);
      if (sel) {
        // 선택된 버튼 — 강조 배경
        const bg = ctx.createLinearGradient(mb.x, mb.y, mb.x, mb.y+mb.h);
        bg.addColorStop(0, mb.color + '55');
        bg.addColorStop(1, mb.color + '22');
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = `rgba(8,14,40,${0.7 + 0.2*t})`;
      }
      ctx.fill();
      ctx.strokeStyle = mb.color;
      ctx.lineWidth   = sel ? 2.5 : (1 + t);
      ctx.shadowColor = mb.color;
      ctx.shadowBlur  = sel ? 14 : (4 * t);
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // 라벨
      ctx.font = font(13, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = sel ? '#ffffff' : mb.color;
      ctx.shadowColor = mb.color;
      ctx.shadowBlur  = sel ? 6 : (2*t);
      ctx.fillText(mb.label, mb.x + mb.w/2, mb.y + mb.h/2);
      ctx.shadowBlur  = 0;

      // 선택 표시 점
      if (sel) {
        ctx.fillStyle = mb.color;
        ctx.beginPath();
        ctx.arc(mb.x + mb.w/2, mb.y + mb.h + 6, 3, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    });
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
    drawText(ctx,'탭하면 메뉴로...',this.sw/2,this.sh/2+50,'rgba(200,160,160,0.6)',16);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 모드 토글 버튼 (채우기 ↔ X표시)
// ═══════════════════════════════════════════════════════════════════════════
class ToggleButton {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this._mode = 'fill';
    this._hover = 0;
  }

  setMode(mode) { this._mode = mode; }

  contains(px, py) {
    return px >= this.x && px <= this.x + this.w &&
           py >= this.y && py <= this.y + this.h;
  }

  update(dt, mx, my) {
    const target = this.contains(mx, my) ? 1 : 0;
    this._hover += (target - this._hover) * Math.min(1, dt * 8);
  }

  draw(ctx) {
    const t = this._hover;
    const isFill = this._mode === 'fill';
    const col = isFill ? C.neonBlue : C.neonPink;
    const label = isFill ? '■ 채우기 모드' : '✕ X 표시 모드';

    ctx.save();
    roundRect(ctx, this.x, this.y, this.w, this.h, 10);
    ctx.fillStyle = isFill
      ? `rgba(10,30,70,${0.75 + 0.2*t})`
      : `rgba(60,10,30,${0.75 + 0.2*t})`;
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.shadowColor = col;
    ctx.shadowBlur = 6 + 6*t;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 텍스트
    ctx.font = font(15, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = col;
    ctx.shadowBlur = 4;
    ctx.fillStyle = col;
    ctx.fillText(label, this.x + this.w/2, this.y + this.h/2);
    ctx.shadowBlur = 0;

    // 힌트 (작은 글씨)
    ctx.font = font(10);
    ctx.fillStyle = 'rgba(160,180,220,0.5)';
    ctx.fillText('탭하여 전환', this.x + this.w/2, this.y + this.h + 12);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 이펙트 설정 씬
// ═══════════════════════════════════════════════════════════════════════════
class EffectSettingsScene extends Scene {
  constructor(sw, sh, nebula, starfield) {
    super(sw, sh);
    this._nebula   = nebula;
    this._starfield = starfield;
    this._ps       = new ParticleSystem();
    this._time     = 0;
    this._selected = Storage.getSettings().effectTheme || 'galaxy';
    this._hoverId  = null;
    this._previewTimer = {};    // themeId → cooldown
    this._back = new NeonButton(16, 16, 90, 38, '◀ 뒤로', C.neonBlue, 15);

    // 카드 배치 계산
    this._COLS  = sw < 500 ? 2 : 3;
    this._CARD_W = Math.floor((sw - 48) / this._COLS);
    this._CARD_H = 140;
    this._TOP    = 74;
  }

  _cardRect(i) {
    const col = i % this._COLS;
    const row = Math.floor(i / this._COLS);
    const x = 16 + col * this._CARD_W;
    const y = this._TOP + row * (this._CARD_H + 14);
    return { x, y, w: this._CARD_W - 14, h: this._CARD_H };
  }

  _cardCenter(i) {
    const r = this._cardRect(i);
    return [r.x + r.w/2, r.y + r.h/2];
  }

  handleEvent(e) {
    if (e.type === 'click' || e.type === 'touchend') {
      const {x, y} = getPoint(e);
      if (this._back.contains(x, y)) { this._next = { scene:'menu' }; return; }
      EFFECT_ORDER.forEach((id, i) => {
        const r = this._cardRect(i);
        if (x >= r.x && x <= r.x+r.w && y >= r.y && y <= r.y+r.h) {
          this._selected = id;
          Storage.updateSetting('effectTheme', id);
          // 선택 시 미리보기 파티클
          const [cx, cy] = this._cardCenter(i);
          this._ps.spawnPreview(cx, cy, id);
          this._ps.spawnFireworks(cx, cy, 1);
        }
      });
    }
  }

  update(dt, mx, my) {
    this._time += dt;
    this._back.update(dt, mx, my);
    this._ps.update(dt);

    // 호버 감지 + 자동 미리보기
    this._hoverId = null;
    EFFECT_ORDER.forEach((id, i) => {
      const r = this._cardRect(i);
      if (mx >= r.x && mx <= r.x+r.w && my >= r.y && my <= r.y+r.h) {
        this._hoverId = i;
        this._previewTimer[id] = (this._previewTimer[id] || 0) - dt;
        if ((this._previewTimer[id] || 0) <= 0) {
          const [cx, cy] = this._cardCenter(i);
          this._ps.spawnPreview(cx, cy, id);
          this._previewTimer[id] = 1.2;
        }
      }
    });
  }

  draw(ctx) {
    this._nebula.draw(ctx);
    this._starfield.draw(ctx);

    // 헤더
    ctx.fillStyle = 'rgba(5,8,25,0.92)';
    ctx.fillRect(0, 0, this.sw, 62);
    drawNeonText(ctx, '✨ 이펙트 테마 선택', this.sw/2, 31, C.gold, 22, true, 5);
    this._back.draw(ctx);

    // 카드
    EFFECT_ORDER.forEach((id, i) => {
      const th  = EFFECT_THEMES[id];
      const r   = this._cardRect(i);
      const sel = this._selected === id;
      const hov = this._hoverId === i;
      const mainCol = th.colors[0];

      ctx.save();
      // 카드 배경
      roundRect(ctx, r.x, r.y, r.w, r.h, 14);
      if (sel) {
        // 선택된 카드 — 배경 강조
        const bg = ctx.createLinearGradient(r.x, r.y, r.x+r.w, r.y+r.h);
        bg.addColorStop(0, 'rgba(10,20,55,0.97)');
        bg.addColorStop(1, 'rgba(20,10,40,0.97)');
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = hov ? 'rgba(15,22,55,0.92)' : 'rgba(8,12,32,0.82)';
      }
      ctx.fill();

      // 테두리
      ctx.strokeStyle = sel ? mainCol : (hov ? 'rgba(120,140,200,0.7)' : 'rgba(30,45,90,0.6)');
      ctx.lineWidth   = sel ? 2.5 : (hov ? 1.5 : 1);
      if (sel || hov) { ctx.shadowColor = mainCol; ctx.shadowBlur = sel ? 14 : 6; }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();

      // 색상 팔레트 미리보기 (상단)
      const dotY = r.y + 22;
      th.colors.slice(0,6).forEach((col, ci) => {
        const dotX = r.x + 16 + ci * 20;
        ctx.save();
        ctx.beginPath(); ctx.arc(dotX, dotY, 7, 0, Math.PI*2);
        ctx.fillStyle = col;
        if (sel) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
        ctx.fill();
        ctx.shadowBlur = 0;
        // 외곽선
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });

      // 테마 이름
      drawNeonText(ctx, th.name, r.x + r.w/2, r.y + 54, sel ? mainCol : 'rgba(200,220,255,0.9)',
        15, true, sel ? 4 : 1);

      // 설명
      drawText(ctx, th.desc, r.x + r.w/2, r.y + 78, 'rgba(140,160,200,0.75)', 11);

      // 선택 표시
      if (sel) {
        ctx.save();
        roundRect(ctx, r.x + r.w/2 - 36, r.y + r.h - 28, 72, 22, 10);
        ctx.fillStyle = mainCol + '33'; ctx.fill();
        ctx.strokeStyle = mainCol; ctx.lineWidth = 1.5;
        ctx.shadowColor = mainCol; ctx.shadowBlur = 6;
        ctx.stroke(); ctx.shadowBlur = 0;
        drawNeonText(ctx, '✔ 선택됨', r.x + r.w/2, r.y + r.h - 17, mainCol, 12, true, 3);
        ctx.restore();
      } else {
        drawText(ctx, '탭하여 선택', r.x + r.w/2, r.y + r.h - 17, 'rgba(100,130,180,0.45)', 11);
      }
    });

    // 파티클
    this._ps.draw(ctx);

    // 하단 힌트
    const th = getCurrentTheme();
    ctx.save();
    ctx.font = font(13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(160,200,255,0.5)';
    ctx.fillText(`현재: ${th.name} — ${th.desc}`, this.sw/2, this.sh - 22);
    ctx.restore();
  }
}

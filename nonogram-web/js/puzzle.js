// puzzle.js - 노노그램 퍼즐 로직

// EMPTY  = 빈 칸
// FILLED = 채운 칸 (연필)
// MARKED = X 표시  (절대 아닌 칸)
// MEMO   = 메모 ▲  (후보 칸, 정답 체크 무관)
const CELL = { EMPTY: 0, FILLED: 1, MARKED: 2, MEMO: 3 };

class Puzzle {
  constructor(solution, title = '', seed = null) {
    this.rows     = solution.length;
    this.cols     = solution[0].length;
    this.solution = solution;
    this.title    = title;
    this.seed     = seed;

    this.grid         = Array.from({ length: this.rows }, () => new Array(this.cols).fill(CELL.EMPTY));
    this.rowHints     = solution.map(row => Puzzle.calcHints(row));
    this.colHints     = Array.from({ length: this.cols }, (_, c) =>
      Puzzle.calcHints(solution.map(r => r[c])));

    this.completedRows = new Array(this.rows).fill(false);
    this.completedCols = new Array(this.cols).fill(false);
    this.errorCount   = 0;
    this.isSolved     = false;
  }

  static calcHints(line) {
    const hints = [];
    let count = 0;
    for (const v of line) {
      if (v === 1) { count++; }
      else if (count) { hints.push(count); count = 0; }
    }
    if (count) hints.push(count);
    return hints.length ? hints : [0];
  }

  toggleCell(row, col, fill) {
    const state = this.grid[row][col];
    let wasError = false;

    if (fill) {
      if (state === CELL.FILLED) {
        this.grid[row][col] = CELL.EMPTY;
      } else {
        this.grid[row][col] = CELL.FILLED;
        if (this.solution[row][col] === 0) {
          wasError = true;
          this.errorCount++;
        }
      }
    } else {
      this.grid[row][col] = (state === CELL.MARKED) ? CELL.EMPTY : CELL.MARKED;
    }

    const rowCleared = this._checkRow(row);
    const colCleared = this._checkCol(col);
    this.isSolved = this._checkSolved();
    return { wasError, rowCleared, colCleared };
  }

  forceReveal(row, col) {
    this.grid[row][col] = CELL.FILLED;
    const rowCleared = this._checkRow(row);
    const colCleared = this._checkCol(col);
    this.isSolved = this._checkSolved();
    return { rowCleared, colCleared };
  }

  _checkRow(row) {
    if (this.completedRows[row]) return false;
    const line = this.grid[row].map(c => c === CELL.FILLED ? 1 : 0);
    if (JSON.stringify(Puzzle.calcHints(line)) === JSON.stringify(this.rowHints[row])) {
      this.completedRows[row] = true; return true;
    }
    return false;
  }

  _checkCol(col) {
    if (this.completedCols[col]) return false;
    const line = this.grid.map(r => r[col] === CELL.FILLED ? 1 : 0);
    if (JSON.stringify(Puzzle.calcHints(line)) === JSON.stringify(this.colHints[col])) {
      this.completedCols[col] = true; return true;
    }
    return false;
  }

  _checkSolved() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        if (this.solution[r][c] === 1 && this.grid[r][c] !== CELL.FILLED) return false;
        if (this.solution[r][c] === 0 && this.grid[r][c] === CELL.FILLED) return false;
      }
    return true;
  }

  getHintCell() {
    const empties = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.solution[r][c] === 1 && this.grid[r][c] !== CELL.FILLED)
          empties.push([r, c]);
    if (!empties.length) return null;
    return empties[Math.floor(Math.random() * empties.length)];
  }

  progress() {
    let total = 0, filled = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        if (this.solution[r][c] === 1) {
          total++;
          if (this.grid[r][c] === CELL.FILLED) filled++;
        }
      }
    return total ? filled / total : 1;
  }

  reset() {
    this.grid = Array.from({ length: this.rows }, () => new Array(this.cols).fill(CELL.EMPTY));
    this.completedRows.fill(false);
    this.completedCols.fill(false);
    this.errorCount = 0;
    this.isSolved = false;
  }
}

// ── 랜덤 퍼즐 생성 ────────────────────────────────────────────────────────

class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  randInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  randFloat(min, max) {
    return this.next() * (max - min) + min;
  }
}

const DENSITY = {
  easy:   [0.40, 0.55],
  normal: [0.50, 0.65],
  hard:   [0.55, 0.75],
  expert: [0.60, 0.80],
};

function generateRandomPuzzle(rows, cols, difficulty = 'normal', seed = null, title = '') {
  if (seed === null) seed = Math.floor(Math.random() * 999999);
  const rng = new SeededRandom(seed);
  const [lo, hi] = DENSITY[difficulty] ?? [0.5, 0.65];
  const density = rng.randFloat(lo, hi);

  const solution = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rng.next() < density ? 1 : 0));

  // 빈 행/열 방지
  for (let r = 0; r < rows; r++)
    if (solution[r].every(v => v === 0))
      solution[r][rng.randInt(0, cols - 1)] = 1;
  for (let c = 0; c < cols; c++)
    if (solution.every(row => row[c] === 0))
      solution[rng.randInt(0, rows - 1)][c] = 1;

  return new Puzzle(solution, title || `SEED-${seed}`, seed);
}

function generateDailyPuzzle() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const seed = parseInt(dateStr);
  return generateRandomPuzzle(12, 12, 'normal', seed,
    `Daily ${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`);
}

function generateInfinitePuzzle(level) {
  const steps = [
    [1,  5,  5, 'easy'],
    [3,  7,  7, 'easy'],
    [5,  8,  8, 'normal'],
    [8,  10, 10,'normal'],
    [12, 12, 12,'hard'],
    [16, 15, 15,'hard'],
    [20, 18, 18,'expert'],
  ];
  let rows = 10, cols = 10, diff = 'normal';
  for (const [thr, r, c, d] of steps)
    if (level >= thr) { rows = r; cols = c; diff = d; }
  const seed = (level * 31337 + 42) >>> 0;
  return generateRandomPuzzle(rows, cols, diff, seed, `LEVEL ${String(level).padStart(3,'0')}`);
}

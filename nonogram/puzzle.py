# puzzle.py - 노노그램 퍼즐 로직, 랜덤 생성, 힌트 계산, 검증

import random
from typing import List, Tuple, Optional
from enum import Enum


class CellState(Enum):
    EMPTY   = 0   # 미입력
    FILLED  = 1   # 채움
    MARKED  = 2   # X 표시


class Puzzle:
    """노노그램 퍼즐 상태 및 로직"""

    def __init__(self, solution: List[List[int]], title: str = "", seed: Optional[int] = None):
        self.rows = len(solution)
        self.cols = len(solution[0])
        self.solution = solution          # 정답 그리드 (1=채움, 0=빔)
        self.title = title
        self.seed = seed

        # 플레이어 상태 그리드
        self.grid: List[List[CellState]] = [
            [CellState.EMPTY] * self.cols for _ in range(self.rows)
        ]

        # 힌트 계산
        self.row_hints: List[List[int]] = [self._calc_hints(solution[r]) for r in range(self.rows)]
        self.col_hints: List[List[int]] = [
            self._calc_hints([solution[r][c] for r in range(self.rows)])
            for c in range(self.cols)
        ]

        # 완성된 행/열 추적
        self.completed_rows: List[bool] = [False] * self.rows
        self.completed_cols: List[bool] = [False] * self.cols

        self.error_count: int = 0
        self.is_solved: bool = False

    @staticmethod
    def _calc_hints(line: List[int]) -> List[int]:
        """한 줄의 힌트(연속 블록 길이 목록) 계산"""
        hints, count = [], 0
        for cell in line:
            if cell == 1:
                count += 1
            elif count:
                hints.append(count)
                count = 0
        if count:
            hints.append(count)
        return hints if hints else [0]

    def toggle_cell(self, row: int, col: int, fill: bool = True) -> Tuple[bool, bool, bool]:
        """
        셀 상태 변경.
        fill=True: 채우기/되돌리기 토글
        fill=False: X 표시/되돌리기 토글
        반환: (was_error, row_cleared, col_cleared)
        """
        state = self.grid[row][col]
        was_error = False

        if fill:
            if state == CellState.FILLED:
                self.grid[row][col] = CellState.EMPTY
            else:
                self.grid[row][col] = CellState.FILLED
                if self.solution[row][col] == 0:
                    was_error = True
                    self.error_count += 1
        else:
            if state == CellState.MARKED:
                self.grid[row][col] = CellState.EMPTY
            else:
                self.grid[row][col] = CellState.MARKED

        row_cleared = self._check_row(row)
        col_cleared = self._check_col(col)
        self.is_solved = self._check_solved()
        return was_error, row_cleared, col_cleared

    def _check_row(self, row: int) -> bool:
        """행이 새로 완성됐으면 True"""
        if self.completed_rows[row]:
            return False
        line = [1 if self.grid[row][c] == CellState.FILLED else 0 for c in range(self.cols)]
        if self._calc_hints(line) == self.row_hints[row]:
            self.completed_rows[row] = True
            return True
        return False

    def _check_col(self, col: int) -> bool:
        """열이 새로 완성됐으면 True"""
        if self.completed_cols[col]:
            return False
        line = [1 if self.grid[r][col] == CellState.FILLED else 0 for r in range(self.rows)]
        if self._calc_hints(line) == self.col_hints[col]:
            self.completed_cols[col] = True
            return True
        return False

    def _check_solved(self) -> bool:
        for r in range(self.rows):
            for c in range(self.cols):
                if self.solution[r][c] == 1 and self.grid[r][c] != CellState.FILLED:
                    return False
                if self.solution[r][c] == 0 and self.grid[r][c] == CellState.FILLED:
                    return False
        return True

    def get_hint_reveal(self) -> Tuple[int, int]:
        """힌트: 비어있는 정답 셀 하나를 무작위로 반환 (row, col)"""
        empties = [
            (r, c)
            for r in range(self.rows)
            for c in range(self.cols)
            if self.solution[r][c] == 1 and self.grid[r][c] != CellState.FILLED
        ]
        if empties:
            return random.choice(empties)
        return (-1, -1)

    def reset(self):
        self.grid = [[CellState.EMPTY] * self.cols for _ in range(self.rows)]
        self.completed_rows = [False] * self.rows
        self.completed_cols = [False] * self.cols
        self.error_count = 0
        self.is_solved = False

    def progress(self) -> float:
        """진행률 0.0~1.0"""
        total = sum(sum(row) for row in self.solution)
        if total == 0:
            return 1.0
        filled = sum(
            1 for r in range(self.rows) for c in range(self.cols)
            if self.solution[r][c] == 1 and self.grid[r][c] == CellState.FILLED
        )
        return filled / total


# ── 랜덤 퍼즐 생성 ────────────────────────────────────────────────────────

DIFFICULTY_DENSITY = {
    "easy":   (0.40, 0.55),
    "normal": (0.50, 0.65),
    "hard":   (0.55, 0.75),
    "expert": (0.60, 0.80),
}

SIZE_PRESETS = {
    "tiny":   (5, 5),
    "small":  (8, 8),
    "medium": (10, 10),
    "large":  (15, 15),
    "xl":     (20, 20),
    "wide":   (10, 15),
    "tall":   (15, 10),
}


def generate_random_puzzle(
    rows: int = 10, cols: int = 10,
    difficulty: str = "normal",
    seed: Optional[int] = None,
    title: str = ""
) -> Puzzle:
    """시드 기반 재현 가능한 랜덤 노노그램 퍼즐 생성"""
    if seed is None:
        seed = random.randint(0, 999999)
    rng = random.Random(seed)

    lo, hi = DIFFICULTY_DENSITY.get(difficulty, (0.50, 0.65))
    density = rng.uniform(lo, hi)

    solution = [[1 if rng.random() < density else 0 for _ in range(cols)] for _ in range(rows)]

    # 고립된 행/열(전부 0) 방지: 최소 1개 셀 보장
    for r in range(rows):
        if sum(solution[r]) == 0:
            solution[r][rng.randint(0, cols - 1)] = 1
    for c in range(cols):
        if sum(solution[r][c] for r in range(rows)) == 0:
            solution[rng.randint(0, rows - 1)][c] = 1

    label = title or f"SEED-{seed}"
    return Puzzle(solution, title=label, seed=seed)


def generate_daily_puzzle() -> Puzzle:
    """오늘 날짜 기반 일일 챌린지 퍼즐 (12x12)"""
    import datetime
    today = datetime.date.today()
    seed = int(today.strftime("%Y%m%d"))
    return generate_random_puzzle(12, 12, difficulty="normal", seed=seed,
                                  title=f"Daily {today.strftime('%Y-%m-%d')}")


def generate_infinite_puzzle(level: int) -> Puzzle:
    """무한 모드: 레벨에 따라 점진적으로 어려워지는 퍼즐"""
    size_steps = [
        (1,  5,  5,  "easy"),
        (3,  7,  7,  "easy"),
        (5,  8,  8,  "normal"),
        (8,  10, 10, "normal"),
        (12, 12, 12, "hard"),
        (16, 15, 15, "hard"),
        (20, 18, 18, "expert"),
    ]
    rows, cols, diff = 10, 10, "normal"
    for (threshold, r, c, d) in size_steps:
        if level >= threshold:
            rows, cols, diff = r, c, d

    seed = level * 31337 + 42
    return generate_random_puzzle(rows, cols, difficulty=diff, seed=seed,
                                  title=f"LEVEL {level:03d}")

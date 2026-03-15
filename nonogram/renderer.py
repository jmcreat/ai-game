# renderer.py - 그리드, 힌트, 우주 배경, 네온 UI 렌더링

import math
import pygame
from typing import List, Tuple, Optional
from puzzle import Puzzle, CellState

# ── 색상 ────────────────────────────────────────────────────────────────
C_BG_DEEP      = (  5,   5,  20)
C_BG_MID       = (  8,  10,  30)
C_PANEL        = ( 10,  15,  40)
C_PANEL_BORDER = ( 40,  60, 120)
C_GRID_LINE    = ( 30,  40,  80)
C_GRID_5LINE   = ( 60,  80, 140)
C_CELL_EMPTY   = ( 12,  16,  40)
C_CELL_HOVER   = ( 20,  30,  70)
C_CELL_FILLED  = ( 60, 160, 255)
C_CELL_FILLED2 = (100, 200, 255)
C_CELL_MARKED  = ( 60,  60,  90)
C_CELL_ERROR   = (255,  60,  60)
C_HINT_NORMAL  = (180, 200, 240)
C_HINT_DONE    = ( 80, 200, 120)
C_HINT_BG      = (  8,  12,  32)
C_WHITE        = (255, 255, 255)
C_GOLD         = (255, 210,  60)
C_NEON_BLUE    = ( 80, 180, 255)
C_NEON_PURPLE  = (180,  80, 255)
C_NEON_CYAN    = ( 60, 240, 220)
C_NEON_PINK    = (255, 100, 180)
C_ROW_DONE     = ( 20,  60,  30)
C_COL_DONE     = ( 20,  60,  30)
C_PROGRESS_BG  = ( 15,  20,  50)
C_PROGRESS_FG  = ( 60, 180, 255)
C_ERROR_RED    = (255,  60,  80)
C_TIMER        = (160, 220, 255)


def get_font(size: int, bold: bool = False) -> pygame.font.Font:
    for name in ["malgunbd" if bold else "malgun gothic",
                 "applegothic", "nanumgothic", "arial", "freesans"]:
        try:
            f = pygame.font.SysFont(name, size, bold=bold)
            if f:
                return f
        except Exception:
            pass
    return pygame.font.SysFont(None, size, bold=bold)


def draw_neon_text(surface: pygame.Surface, text: str, font: pygame.font.Font,
                   color: Tuple, x: int, y: int, center: bool = True,
                   glow_radius: int = 4):
    """글로우 효과 네온 텍스트"""
    r, g, b = color
    for i in range(glow_radius, 0, -1):
        alpha = int(120 * (1 - i / glow_radius))
        glow = font.render(text, True, (
            min(255, r + 40), min(255, g + 40), min(255, b + 40)))
        glow_surf = pygame.Surface(glow.get_size(), pygame.SRCALPHA)
        glow_surf.blit(glow, (0, 0))
        glow_surf.set_alpha(alpha)
        gx = x - glow.get_width() // 2 - i if center else x - i
        gy = y - glow.get_height() // 2 - i if center else y - i
        for dx in range(-i, i + 1, i):
            for dy in range(-i, i + 1, i):
                surface.blit(glow_surf, (gx + dx, gy + dy))
    main = font.render(text, True, color)
    if center:
        surface.blit(main, (x - main.get_width() // 2, y - main.get_height() // 2))
    else:
        surface.blit(main, (x, y))


def draw_rounded_rect(surface, color, rect, radius=10, border_color=None, border_width=2, alpha=255):
    """반투명 지원 둥근 사각형"""
    s = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
    r, g, b = color
    pygame.draw.rect(s, (r, g, b, alpha), s.get_rect(), border_radius=radius)
    if border_color:
        br, bg, bb = border_color
        pygame.draw.rect(s, (br, bg, bb, min(255, alpha + 60)),
                         s.get_rect(), border_width, border_radius=radius)
    surface.blit(s, rect.topleft)


def draw_gradient_rect(surface, rect, top_color, bottom_color):
    r1, g1, b1 = top_color
    r2, g2, b2 = bottom_color
    for y in range(rect.height):
        t = y / max(rect.height - 1, 1)
        color = (int(r1+(r2-r1)*t), int(g1+(g2-g1)*t), int(b1+(b2-b1)*t))
        pygame.draw.line(surface, color, (rect.x, rect.y+y), (rect.x+rect.width-1, rect.y+y))


# ── 네온 버튼 ─────────────────────────────────────────────────────────────

class NeonButton:
    def __init__(self, rect: pygame.Rect, text: str,
                 color: Tuple = C_NEON_BLUE, font_size: int = 22):
        self.rect      = rect
        self.text      = text
        self.color     = color
        self.font_size = font_size
        self._hovered  = False
        self._anim     = 0.0

    def update(self, dt: float, mouse_pos: Tuple):
        self._hovered = self.rect.collidepoint(mouse_pos)
        if self._hovered:
            self._anim = min(1.0, self._anim + dt * 4)
        else:
            self._anim = max(0.0, self._anim - dt * 4)

    def draw(self, surface: pygame.Surface):
        t = self._anim
        r, g, b = self.color
        bg_alpha = int(80 + 80 * t)
        border_col = (min(255, int(r*(0.7 + 0.3*t))),
                      min(255, int(g*(0.7 + 0.3*t))),
                      min(255, int(b*(0.7 + 0.3*t))))

        draw_rounded_rect(surface, C_PANEL, self.rect, radius=12,
                          border_color=border_col, border_width=2, alpha=bg_alpha)

        font = get_font(self.font_size, bold=True)
        cx = self.rect.centerx
        cy = self.rect.centery
        glow = 3 if t > 0.1 else 1
        draw_neon_text(surface, self.text, font, self.color, cx, cy,
                       center=True, glow_radius=glow)

    def is_clicked(self, event: pygame.event.Event) -> bool:
        return (event.type == pygame.MOUSEBUTTONDOWN and event.button == 1
                and self.rect.collidepoint(event.pos))


# ── 그리드 렌더러 ─────────────────────────────────────────────────────────

class GridRenderer:
    """노노그램 그리드 및 힌트 렌더링"""

    MIN_CELL = 18
    MAX_CELL = 48

    def __init__(self, screen_w: int, screen_h: int):
        self.screen_w = screen_w
        self.screen_h = screen_h
        self.cell_size: int = 32
        self.hint_col_w: int = 0
        self.hint_row_h: int = 0
        self.grid_x: int = 0
        self.grid_y: int = 0
        self._shake_offset = (0, 0)
        self._shake_timer  = 0.0
        self._shake_mag    = 0.0
        self._cell_glow: dict = {}   # (r,c) → glow timer
        self._row_flash: dict = {}   # row → timer
        self._col_flash: dict = {}   # col → timer
        self._hover: Optional[Tuple[int,int]] = None
        self._drag_fill: Optional[bool] = None   # 드래그 중 채우기 모드

    def layout(self, puzzle: Puzzle):
        """퍼즐 크기에 맞게 레이아웃 자동 계산"""
        max_hint_cols = max(len(h) for h in puzzle.col_hints)
        max_hint_rows = max(len(h) for h in puzzle.row_hints)

        avail_w = self.screen_w - 80
        avail_h = self.screen_h - 80

        # 힌트 크기 추정 후 셀 크기 결정
        for cell in range(self.MAX_CELL, self.MIN_CELL - 1, -1):
            font_size = max(9, cell - 6)
            hint_w = max_hint_cols * cell
            hint_h = max_hint_rows * cell
            total_w = hint_w + puzzle.cols * cell
            total_h = hint_h + puzzle.rows * cell
            if total_w <= avail_w and total_h <= avail_h:
                self.cell_size  = cell
                self.hint_col_w = hint_w
                self.hint_row_h = hint_h
                break
        else:
            self.cell_size  = self.MIN_CELL
            self.hint_col_w = max_hint_cols * self.MIN_CELL
            self.hint_row_h = max_hint_rows * self.MIN_CELL

        total_w = self.hint_col_w + puzzle.cols * self.cell_size
        total_h = self.hint_row_h + puzzle.rows * self.cell_size
        self.grid_x = (self.screen_w - total_w) // 2 + self.hint_col_w
        self.grid_y = (self.screen_h - total_h) // 2 + self.hint_row_h + 20

    def shake(self, magnitude: float = 8.0, duration: float = 0.35):
        self._shake_timer = duration
        self._shake_mag   = magnitude

    def glow_cell(self, row: int, col: int):
        self._cell_glow[(row, col)] = 0.6

    def flash_row(self, row: int):
        self._row_flash[row] = 0.8

    def flash_col(self, col: int):
        self._col_flash[col] = 0.8

    def update(self, dt: float):
        import random as rng
        if self._shake_timer > 0:
            self._shake_timer -= dt
            m = self._shake_mag * (self._shake_timer / 0.35)
            self._shake_offset = (rng.randint(-int(m), int(m)),
                                  rng.randint(-int(m), int(m)))
        else:
            self._shake_offset = (0, 0)

        self._cell_glow = {k: v - dt for k, v in self._cell_glow.items() if v - dt > 0}
        self._row_flash = {k: v - dt for k, v in self._row_flash.items() if v - dt > 0}
        self._col_flash = {k: v - dt for k, v in self._col_flash.items() if v - dt > 0}

    def get_cell_at(self, mx: int, my: int, puzzle: Puzzle) -> Optional[Tuple[int,int]]:
        ox, oy = self._shake_offset
        lx = mx - self.grid_x - ox
        ly = my - self.grid_y - oy
        if lx < 0 or ly < 0:
            return None
        col = int(lx // self.cell_size)
        row = int(ly // self.cell_size)
        if 0 <= row < puzzle.rows and 0 <= col < puzzle.cols:
            return (row, col)
        return None

    def set_hover(self, cell: Optional[Tuple[int,int]]):
        self._hover = cell

    def cell_rect(self, row: int, col: int) -> pygame.Rect:
        ox, oy = self._shake_offset
        x = self.grid_x + col * self.cell_size + ox
        y = self.grid_y + row * self.cell_size + oy
        return pygame.Rect(x, y, self.cell_size, self.cell_size)

    def cell_center(self, row: int, col: int) -> Tuple[float, float]:
        r = self.cell_rect(row, col)
        return (r.centerx, r.centery)

    def draw(self, surface: pygame.Surface, puzzle: Puzzle, time: float = 0.0):
        ox, oy = self._shake_offset
        cs = self.cell_size

        # ── 힌트 배경 패널 ──
        hint_panel = pygame.Rect(
            self.grid_x - self.hint_col_w + ox,
            self.grid_y + oy,
            self.hint_col_w,
            puzzle.rows * cs
        )
        draw_rounded_rect(surface, C_HINT_BG, hint_panel, radius=6,
                          border_color=C_PANEL_BORDER, border_width=1, alpha=180)

        col_hint_panel = pygame.Rect(
            self.grid_x + ox,
            self.grid_y - self.hint_row_h + oy,
            puzzle.cols * cs,
            self.hint_row_h
        )
        draw_rounded_rect(surface, C_HINT_BG, col_hint_panel, radius=6,
                          border_color=C_PANEL_BORDER, border_width=1, alpha=180)

        # ── 완성 행/열 배경 강조 ──
        for r in range(puzzle.rows):
            if puzzle.completed_rows[r]:
                row_rect = pygame.Rect(
                    self.grid_x - self.hint_col_w + ox,
                    self.grid_y + r * cs + oy,
                    self.hint_col_w + puzzle.cols * cs,
                    cs
                )
                draw_rounded_rect(surface, C_ROW_DONE, row_rect, radius=3, alpha=120)
                t = self._row_flash.get(r, 0)
                if t > 0:
                    flash_alpha = int(200 * t / 0.8)
                    draw_rounded_rect(surface, C_GOLD, row_rect, radius=3, alpha=flash_alpha)

        for c in range(puzzle.cols):
            if puzzle.completed_cols[c]:
                col_rect = pygame.Rect(
                    self.grid_x + c * cs + ox,
                    self.grid_y - self.hint_row_h + oy,
                    cs,
                    self.hint_row_h + puzzle.rows * cs
                )
                draw_rounded_rect(surface, C_COL_DONE, col_rect, radius=3, alpha=120)
                t = self._col_flash.get(c, 0)
                if t > 0:
                    flash_alpha = int(200 * t / 0.8)
                    draw_rounded_rect(surface, C_GOLD, col_rect, radius=3, alpha=flash_alpha)

        # ── 셀 그리기 ──
        font_hint = get_font(max(9, cs - 10), bold=True)
        for r in range(puzzle.rows):
            for c in range(puzzle.cols):
                rect = self.cell_rect(r, c)
                state = puzzle.grid[r][c]
                glow_t = self._cell_glow.get((r, c), 0)
                is_hover = (self._hover == (r, c))

                if state == CellState.FILLED:
                    # 채워진 셀: 그라디언트 + 글로우
                    draw_gradient_rect(surface, rect, C_CELL_FILLED2, C_CELL_FILLED)
                    # 내부 하이라이트
                    hl_rect = pygame.Rect(rect.x + 2, rect.y + 2, rect.width - 8, 3)
                    highlight = pygame.Surface((hl_rect.width, hl_rect.height), pygame.SRCALPHA)
                    highlight.fill((255, 255, 255, 80))
                    surface.blit(highlight, hl_rect.topleft)
                    if glow_t > 0:
                        g_alpha = int(200 * glow_t / 0.6)
                        glow_surf = pygame.Surface((rect.width+8, rect.height+8), pygame.SRCALPHA)
                        pygame.draw.rect(glow_surf, (100, 200, 255, g_alpha),
                                         (0, 0, rect.width+8, rect.height+8), border_radius=4)
                        surface.blit(glow_surf, (rect.x-4, rect.y-4))

                elif state == CellState.MARKED:
                    pygame.draw.rect(surface, C_CELL_MARKED, rect)
                    # X 그리기
                    m = cs // 5
                    col_x = (80, 80, 120)
                    pygame.draw.line(surface, col_x,
                                     (rect.x+m, rect.y+m), (rect.right-m, rect.bottom-m), 2)
                    pygame.draw.line(surface, col_x,
                                     (rect.right-m, rect.y+m), (rect.x+m, rect.bottom-m), 2)
                else:
                    col = C_CELL_HOVER if is_hover else C_CELL_EMPTY
                    pygame.draw.rect(surface, col, rect)

                # 셀 테두리
                border_col = C_GRID_5LINE if (r % 5 == 4 or c % 5 == 4) else C_GRID_LINE
                if cs >= 20:
                    pygame.draw.rect(surface, border_col, rect, 1)

        # ── 행 힌트 ──
        for r in range(puzzle.rows):
            hints  = puzzle.row_hints[r]
            done   = puzzle.completed_rows[r]
            hy     = self.grid_y + r * cs + cs // 2 + oy
            n      = len(hints)
            for i, num in enumerate(hints):
                hx = self.grid_x - self.hint_col_w + ox + int((i + 0.5) * self.hint_col_w / n)
                col = C_HINT_DONE if done else C_HINT_NORMAL
                txt = font_hint.render(str(num), True, col)
                surface.blit(txt, (hx - txt.get_width()//2, hy - txt.get_height()//2))

        # ── 열 힌트 ──
        for c in range(puzzle.cols):
            hints = puzzle.col_hints[c]
            done  = puzzle.completed_cols[c]
            hx    = self.grid_x + c * cs + cs // 2 + ox
            n     = len(hints)
            for i, num in enumerate(hints):
                hy = self.grid_y - self.hint_row_h + oy + int((i + 0.5) * self.hint_row_h / n)
                col = C_HINT_DONE if done else C_HINT_NORMAL
                txt = font_hint.render(str(num), True, col)
                surface.blit(txt, (hx - txt.get_width()//2, hy - txt.get_height()//2))

        # ── 굵은 5칸 구분선 ──
        for r in range(0, puzzle.rows + 1, 5):
            y = self.grid_y + r * cs + oy
            pygame.draw.line(surface, C_GRID_5LINE,
                             (self.grid_x + ox, y),
                             (self.grid_x + puzzle.cols * cs + ox, y), 2)
        for c in range(0, puzzle.cols + 1, 5):
            x = self.grid_x + c * cs + ox
            pygame.draw.line(surface, C_GRID_5LINE,
                             (x, self.grid_y + oy),
                             (x, self.grid_y + puzzle.rows * cs + oy), 2)

        # 외곽선
        outer = pygame.Rect(
            self.grid_x + ox, self.grid_y + oy,
            puzzle.cols * cs, puzzle.rows * cs
        )
        pygame.draw.rect(surface, C_NEON_BLUE, outer, 2, border_radius=2)


# ── HUD (상단 정보 바) ────────────────────────────────────────────────────

class HUD:
    def __init__(self, screen_w: int, screen_h: int):
        self.screen_w = screen_w
        self.screen_h = screen_h

    def draw(self, surface: pygame.Surface, puzzle: Puzzle,
             elapsed: float, errors: int, max_errors: int = 3):
        # 반투명 상단 바
        bar = pygame.Surface((self.screen_w, 52), pygame.SRCALPHA)
        bar.fill((5, 8, 25, 200))
        surface.blit(bar, (0, 0))
        pygame.draw.line(surface, C_PANEL_BORDER, (0, 52), (self.screen_w, 52), 1)

        font_title = get_font(22, bold=True)
        font_info  = get_font(18)

        # 타이틀
        draw_neon_text(surface, puzzle.title, font_title, C_NEON_CYAN,
                       self.screen_w // 2, 26, center=True, glow_radius=3)

        # 타이머
        mins = int(elapsed) // 60
        secs = int(elapsed) % 60
        timer_txt = f"{mins:02d}:{secs:02d}"
        draw_neon_text(surface, timer_txt, font_info, C_TIMER, 60, 26,
                       center=True, glow_radius=2)

        # 오류 카운터
        err_col = C_ERROR_RED if errors >= max_errors else (200, 120, 120)
        err_txt = f"오류: {'❌' * errors}{'○' * (max_errors - errors)}"
        err_surf = font_info.render(err_txt, True, err_col)
        surface.blit(err_surf, (self.screen_w - err_surf.get_width() - 20, 16))

        # 진행률 바
        prog = puzzle.progress()
        bar_w = 200
        bar_x = self.screen_w // 2 - bar_w // 2
        bar_y = self.screen_h - 30
        pygame.draw.rect(surface, C_PROGRESS_BG, (bar_x, bar_y, bar_w, 12), border_radius=6)
        fill_w = int(bar_w * prog)
        if fill_w > 0:
            pygame.draw.rect(surface, C_PROGRESS_FG,
                             (bar_x, bar_y, fill_w, 12), border_radius=6)
        pygame.draw.rect(surface, C_PANEL_BORDER, (bar_x, bar_y, bar_w, 12), 1, border_radius=6)

        # 진행률 텍스트
        fn = get_font(14)
        pt = fn.render(f"{int(prog*100)}%", True, C_TIMER)
        surface.blit(pt, (bar_x + bar_w + 8, bar_y - 1))


# ── 성운 배경 ─────────────────────────────────────────────────────────────

class NebulaBackground:
    """pygame으로 직접 그린 성운 배경"""

    def __init__(self, width: int, height: int):
        self._surf = pygame.Surface((width, height))
        self._build(width, height)

    def _build(self, w: int, h: int):
        import random as rng
        self._surf.fill(C_BG_DEEP)
        # 성운 색 구름 (반투명 원들의 겹침)
        nebula_surf = pygame.Surface((w, h), pygame.SRCALPHA)
        clusters = [
            (rng.randint(50, w-50), rng.randint(50, h-50), (40, 10, 80), 180),
            (rng.randint(50, w-50), rng.randint(50, h-50), (10, 30, 80), 200),
            (rng.randint(50, w-50), rng.randint(50, h-50), (60, 10, 40), 160),
            (rng.randint(50, w-50), rng.randint(50, h-50), (10, 60, 60), 150),
        ]
        for cx, cy, col, size in clusters:
            for _ in range(20):
                rx = cx + rng.randint(-size, size)
                ry = cy + rng.randint(-size, size)
                r = rng.randint(size//4, size)
                alpha = rng.randint(10, 40)
                cr, cg, cb = col
                pygame.draw.circle(nebula_surf, (cr, cg, cb, alpha), (rx, ry), r)
        self._surf.blit(nebula_surf, (0, 0))

    def draw(self, surface: pygame.Surface):
        surface.blit(self._surf, (0, 0))

    def rebuild(self, width: int, height: int):
        self._surf = pygame.Surface((width, height))
        self._build(width, height)

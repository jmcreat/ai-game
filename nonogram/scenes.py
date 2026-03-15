# scenes.py - 씬 모음 (MainMenu, StageSelect, GameScene, ClearScene)

import sys
import math
import random
import json
import os
import pygame

from puzzle import Puzzle, generate_random_puzzle, generate_daily_puzzle, generate_infinite_puzzle
from particles import ParticleSystem, StarField
from renderer import (GridRenderer, HUD, NebulaBackground, NeonButton,
                      draw_neon_text, draw_rounded_rect, get_font,
                      C_BG_DEEP, C_NEON_BLUE, C_NEON_CYAN, C_NEON_PURPLE,
                      C_NEON_PINK, C_GOLD, C_WHITE, C_PANEL, C_PANEL_BORDER,
                      C_HINT_NORMAL, C_HINT_DONE)

SAVE_FILE = os.path.join(os.path.dirname(__file__), "save.json")


def load_save() -> dict:
    if os.path.exists(SAVE_FILE):
        try:
            with open(SAVE_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return {"best_times": {}, "cleared_stages": [], "infinite_level": 1}


def write_save(data: dict):
    try:
        with open(SAVE_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


# ── 씬 베이스 ─────────────────────────────────────────────────────────────

class Scene:
    def handle_event(self, event: pygame.event.Event): pass
    def update(self, dt: float): pass
    def draw(self, surface: pygame.Surface): pass
    def next_scene(self): return None   # 씬 전환 요청 시 (씬_이름, kwargs) 반환


# ── 메인 메뉴 ─────────────────────────────────────────────────────────────

class MainMenuScene(Scene):
    def __init__(self, screen_w: int, screen_h: int):
        self.sw, self.sh = screen_w, screen_h
        self.stars    = StarField(screen_w, screen_h)
        self.nebula   = NebulaBackground(screen_w, screen_h)
        self.particles = ParticleSystem()
        self._time    = 0.0
        self._next    = None

        cx = screen_w // 2
        bw, bh = 300, 54
        self.buttons = [
            NeonButton(pygame.Rect(cx-bw//2, 300, bw, bh), "스테이지 모드", C_NEON_CYAN,   24),
            NeonButton(pygame.Rect(cx-bw//2, 375, bw, bh), "무한 모드",     C_NEON_PURPLE, 24),
            NeonButton(pygame.Rect(cx-bw//2, 450, bw, bh), "일일 챌린지",   C_GOLD,        24),
            NeonButton(pygame.Rect(cx-bw//2, 530, bw, bh), "종료",          C_NEON_PINK,   22),
        ]
        # 배경 별똥별 타이머
        self._meteor_timer = 0.0

    def handle_event(self, event):
        for btn in self.buttons:
            if btn.is_clicked(event):
                if btn.text == "스테이지 모드":
                    self._next = ("stage_select", {})
                elif btn.text == "무한 모드":
                    self._next = ("infinite", {})
                elif btn.text == "일일 챌린지":
                    self._next = ("daily", {})
                elif btn.text == "종료":
                    pygame.quit(); sys.exit()
        if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            pygame.quit(); sys.exit()

    def update(self, dt):
        self._time += dt
        self.stars.update(dt)
        self.particles.update(dt)

        mouse = pygame.mouse.get_pos()
        for btn in self.buttons:
            btn.update(dt, mouse)

        # 주기적으로 별똥별
        self._meteor_timer += dt
        if self._meteor_timer > 2.5:
            self._meteor_timer = 0.0
            sx = random.randint(0, self.sw)
            sy = random.randint(0, self.sh // 2)
            for i in range(20):
                self.particles._particles.append(
                    __import__('particles').Particle(
                        sx + i * 8, sy + i * 5,
                        random.uniform(-20, 20), random.uniform(-10, 10),
                        0.4 - i * 0.018,
                        (255, 240, 200), max(1, 4 - i // 5), kind="trail"
                    )
                )

    def draw(self, surface):
        self.nebula.draw(surface)
        self.stars.draw(surface)
        self.particles.draw(surface)

        # 타이틀 로고
        font_big  = get_font(64, bold=True)
        font_sub  = get_font(26)
        pulse = 0.92 + 0.08 * math.sin(self._time * 2.0)
        cx = self.sw // 2

        # 그라디언트 타이틀
        draw_neon_text(surface, "NONOGRAM", font_big, C_NEON_CYAN,
                       cx, 160, center=True, glow_radius=8)
        draw_neon_text(surface, "GALAXY", font_big, C_NEON_PURPLE,
                       cx, 230, center=True, glow_radius=8)
        draw_neon_text(surface, "∞ 무한 퍼즐 우주 ∞", font_sub, C_GOLD,
                       cx, 275, center=True, glow_radius=3)

        for btn in self.buttons:
            btn.draw(surface)

        # 하단 저작권
        fn = get_font(14)
        ct = fn.render("Wikimedia Commons Hwatu Images · MIT License", True, (80, 100, 140))
        surface.blit(ct, (cx - ct.get_width()//2, self.sh - 24))

    def next_scene(self):
        n = self._next
        self._next = None
        return n


# ── 스테이지 선택 ─────────────────────────────────────────────────────────

class StageSelectScene(Scene):
    COLS = 5

    def __init__(self, screen_w: int, screen_h: int):
        self.sw, self.sh = screen_w, screen_h
        self.stars    = StarField(screen_w, screen_h)
        self.nebula   = NebulaBackground(screen_w, screen_h)
        self._time    = 0.0
        self._next    = None
        self._save    = load_save()

        from data.stages import get_all_stages
        self.stages   = get_all_stages()
        self._hovered = -1

        # 카드 레이아웃
        self.card_w, self.card_h = 160, 90
        self.pad = 18
        cols = self.COLS
        total_w = cols * (self.card_w + self.pad) - self.pad
        self.start_x = (screen_w - total_w) // 2
        self.start_y = 120

        # 뒤로가기 버튼
        self.back_btn = NeonButton(
            pygame.Rect(30, 20, 100, 40), "← 뒤로", C_NEON_PINK, 20)

    def _card_rect(self, idx: int) -> pygame.Rect:
        row = idx // self.COLS
        col = idx % self.COLS
        x = self.start_x + col * (self.card_w + self.pad)
        y = self.start_y + row * (self.card_h + self.pad)
        return pygame.Rect(x, y, self.card_w, self.card_h)

    def handle_event(self, event):
        if self.back_btn.is_clicked(event):
            self._next = ("menu", {})
            return
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            for i in range(len(self.stages)):
                if self._card_rect(i).collidepoint(event.pos):
                    self._next = ("game", {"puzzle": self.stages[i], "mode": "stage"})
                    return
        if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            self._next = ("menu", {})

    def update(self, dt):
        self._time += dt
        self.stars.update(dt)
        mouse = pygame.mouse.get_pos()
        self.back_btn.update(dt, mouse)
        self._hovered = -1
        for i in range(len(self.stages)):
            if self._card_rect(i).collidepoint(mouse):
                self._hovered = i

    def draw(self, surface):
        self.nebula.draw(surface)
        self.stars.draw(surface)

        font_title = get_font(32, bold=True)
        draw_neon_text(surface, "STAGE SELECT", font_title, C_NEON_CYAN,
                       self.sw//2, 70, center=True, glow_radius=4)
        self.back_btn.draw(surface)

        fn_name  = get_font(14, bold=True)
        fn_diff  = get_font(12)
        fn_clear = get_font(12)
        cleared  = self._save.get("cleared_stages", [])

        DIFF_COLORS = {
            "easy":   C_NEON_CYAN,
            "normal": C_GOLD,
            "hard":   C_NEON_PINK,
            "expert": C_NEON_PURPLE,
        }

        for i, stage in enumerate(self.stages):
            rect = self._card_rect(i)
            is_hover   = (self._hovered == i)
            is_cleared = (stage.stage_id in cleared)
            pulse = 0.85 + 0.15 * math.sin(self._time * 2 + i * 0.5)

            # 카드 배경
            bg_col = (15, 30, 60) if is_hover else (8, 15, 35)
            border_col = C_GOLD if is_cleared else (C_NEON_BLUE if is_hover else C_PANEL_BORDER)
            draw_rounded_rect(surface, bg_col, rect, radius=10,
                              border_color=border_col, border_width=2,
                              alpha=220 if is_hover else 180)

            # 스테이지 번호
            num_txt = fn_diff.render(f"#{stage.stage_id:02d}", True, (100, 120, 160))
            surface.blit(num_txt, (rect.x + 8, rect.y + 6))

            # 클리어 마크
            if is_cleared:
                star_txt = fn_clear.render("★ CLEAR", True, C_GOLD)
                surface.blit(star_txt, (rect.right - star_txt.get_width() - 8, rect.y + 6))

            # 타이틀
            name_surf = fn_name.render(stage.title, True, C_WHITE if is_hover else C_HINT_NORMAL)
            surface.blit(name_surf, (rect.x + rect.width//2 - name_surf.get_width()//2,
                                     rect.y + rect.height//2 - name_surf.get_height()//2 - 5))

            # 난이도 + 크기
            diff_label = getattr(stage, "difficulty_label", "normal")
            diff_col = DIFF_COLORS.get(diff_label, C_HINT_NORMAL)
            diff_surf = fn_diff.render(
                f"{diff_label.upper()}  {stage.rows}×{stage.cols}",
                True, diff_col)
            surface.blit(diff_surf, (rect.x + rect.width//2 - diff_surf.get_width()//2,
                                     rect.y + rect.height - 22))

    def next_scene(self):
        n = self._next; self._next = None
        return n


# ── 게임 씬 ───────────────────────────────────────────────────────────────

MAX_ERRORS = 3

class GameScene(Scene):
    def __init__(self, screen_w: int, screen_h: int,
                 puzzle: Puzzle, mode: str = "stage",
                 infinite_level: int = 1):
        self.sw, self.sh = screen_w, screen_h
        self.puzzle   = puzzle
        self.mode     = mode
        self.inf_level = infinite_level

        self.stars     = StarField(screen_w, screen_h)
        self.nebula    = NebulaBackground(screen_w, screen_h)
        self.particles = ParticleSystem()
        self.grid_r    = GridRenderer(screen_w, screen_h)
        self.grid_r.layout(puzzle)
        self.hud       = HUD(screen_w, screen_h)

        self._time     = 0.0
        self._elapsed  = 0.0
        self._next     = None
        self._solved_timer = 0.0
        self._firework_timer = 0.0
        self._drag_button: Optional[int] = None
        self._drag_fill:   Optional[bool] = None
        self._nebula_timer = 0.0
        self._save = load_save()

        # 버튼
        bw, bh = 120, 38
        self.btn_menu  = NeonButton(pygame.Rect(20, 8, bw, bh), "메뉴",  C_NEON_PINK,   18)
        self.btn_reset = NeonButton(pygame.Rect(150, 8, bw, bh), "리셋", C_NEON_PURPLE, 18)
        self.btn_hint  = NeonButton(pygame.Rect(280, 8, bw, bh), "힌트 (?)", C_GOLD,   18)

    def handle_event(self, event):
        if self.puzzle.is_solved:
            if event.type == pygame.MOUSEBUTTONDOWN:
                self._go_next()
            if event.type == pygame.KEYDOWN:
                self._go_next()
            return

        if self.btn_menu.is_clicked(event):
            self._next = ("menu", {})
            return
        if self.btn_reset.is_clicked(event):
            self.puzzle.reset()
            self.grid_r._cell_glow.clear()
            self.grid_r._row_flash.clear()
            self.grid_r._col_flash.clear()
            return
        if self.btn_hint.is_clicked(event):
            r, c = self.puzzle.get_hint_reveal()
            if r >= 0:
                self.puzzle.grid[r][c] = __import__('puzzle').CellState.FILLED
                self.puzzle._check_row(r); self.puzzle._check_col(c)
                self.puzzle.is_solved = self.puzzle._check_solved()
                cx, cy = self.grid_r.cell_center(r, c)
                self.particles.spawn_hint_reveal(cx, cy)
                self.grid_r.glow_cell(r, c)
            return

        if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            self._next = ("menu", {})
            return

        if event.type == pygame.MOUSEBUTTONDOWN:
            cell = self.grid_r.get_cell_at(event.pos[0], event.pos[1], self.puzzle)
            if cell:
                fill = (event.button == 1)
                self._drag_button = event.button
                self._drag_fill   = fill
                self._do_cell(cell[0], cell[1], fill)

        if event.type == pygame.MOUSEBUTTONUP:
            self._drag_button = None
            self._drag_fill   = None

        if event.type == pygame.MOUSEMOTION and self._drag_button is not None:
            cell = self.grid_r.get_cell_at(event.pos[0], event.pos[1], self.puzzle)
            if cell:
                self._do_cell(cell[0], cell[1], self._drag_fill)

    def _do_cell(self, row: int, col: int, fill: bool):
        err, row_clr, col_clr = self.puzzle.toggle_cell(row, col, fill)
        cx, cy = self.grid_r.cell_center(row, col)

        if err:
            self.particles.spawn_cell_error(cx, cy)
            self.grid_r.shake()
        elif fill and self.puzzle.grid[row][col].value == 1:
            self.particles.spawn_cell_fill(cx, cy)
            self.grid_r.glow_cell(row, col)

        if row_clr:
            x1 = self.grid_r.grid_x
            x2 = self.grid_r.grid_x + self.puzzle.cols * self.grid_r.cell_size
            self.particles.spawn_line_clear(x1, cy, x2, cy, is_row=True)
            self.grid_r.flash_row(row)

        if col_clr:
            y1 = self.grid_r.grid_y
            y2 = self.grid_r.grid_y + self.puzzle.rows * self.grid_r.cell_size
            self.particles.spawn_line_clear(cx, y1, cx, y2, is_row=False)
            self.grid_r.flash_col(col)

        if self.puzzle.is_solved:
            self._on_solved()

    def _on_solved(self):
        self._solved_timer = 0.0
        # 저장
        key = self.puzzle.title
        best = self._save.get("best_times", {})
        if key not in best or self._elapsed < best[key]:
            best[key] = round(self._elapsed, 2)
        self._save["best_times"] = best
        if self.mode == "stage":
            sid = getattr(self.puzzle, "stage_id", -1)
            cleared = self._save.get("cleared_stages", [])
            if sid not in cleared:
                cleared.append(sid)
            self._save["cleared_stages"] = cleared
        elif self.mode == "infinite":
            self._save["infinite_level"] = max(
                self._save.get("infinite_level", 1), self.inf_level + 1)
        write_save(self._save)

    def _go_next(self):
        if self.mode == "stage":
            self._next = ("stage_select", {})
        elif self.mode == "infinite":
            nxt = generate_infinite_puzzle(self.inf_level + 1)
            self._next = ("game", {"puzzle": nxt, "mode": "infinite",
                                   "infinite_level": self.inf_level + 1})
        elif self.mode == "daily":
            self._next = ("menu", {})
        elif self.mode == "random":
            self._next = ("menu", {})
        else:
            self._next = ("menu", {})

    def update(self, dt):
        self._time += dt
        if not self.puzzle.is_solved:
            self._elapsed += dt
        self.stars.update(dt)
        self.particles.update(dt)
        self.grid_r.update(dt)

        mouse = pygame.mouse.get_pos()
        self.btn_menu.update(dt, mouse)
        self.btn_reset.update(dt, mouse)
        self.btn_hint.update(dt, mouse)
        cell = self.grid_r.get_cell_at(mouse[0], mouse[1], self.puzzle)
        self.grid_r.set_hover(cell)

        # 성운 먼지 파티클 (주기적)
        self._nebula_timer += dt
        if self._nebula_timer > 0.8:
            self._nebula_timer = 0.0
            self.particles.spawn_ambient_nebula(self.sw, self.sh, count=2)

        # 클리어 후 폭죽
        if self.puzzle.is_solved:
            self._solved_timer += dt
            self._firework_timer += dt
            if self._firework_timer > 0.25:
                self._firework_timer = 0.0
                self.particles.spawn_fireworks(self.sw // 2, self.sh // 2, count_bursts=3)

    def draw(self, surface):
        self.nebula.draw(surface)
        self.stars.draw(surface)
        self.particles.draw(surface)
        self.grid_r.draw(surface, self.puzzle, self._time)
        self.hud.draw(surface, self.puzzle, self._elapsed,
                      self.puzzle.error_count, MAX_ERRORS)

        self.btn_menu.draw(surface)
        self.btn_reset.draw(surface)
        self.btn_hint.draw(surface)

        # 클리어 오버레이
        if self.puzzle.is_solved:
            self._draw_clear_overlay(surface)

    def _draw_clear_overlay(self, surface):
        t = min(1.0, self._solved_timer / 0.5)
        ov = pygame.Surface((self.sw, self.sh), pygame.SRCALPHA)
        ov.fill((0, 0, 20, int(160 * t)))
        surface.blit(ov, (0, 0))

        pulse = 0.95 + 0.05 * math.sin(self._time * 4)
        font_big = get_font(72, bold=True)
        font_mid = get_font(32)
        font_sm  = get_font(22)

        draw_neon_text(surface, "CLEAR!", font_big, C_GOLD,
                       self.sw//2, self.sh//2 - 80, center=True, glow_radius=10)

        mins = int(self._elapsed) // 60
        secs = int(self._elapsed) % 60
        draw_neon_text(surface, f"Time: {mins:02d}:{secs:02d}", font_mid, C_NEON_CYAN,
                       self.sw//2, self.sh//2, center=True, glow_radius=4)

        draw_neon_text(surface, "클릭 또는 아무 키나 눌러서 계속", font_sm, C_HINT_NORMAL,
                       self.sw//2, self.sh//2 + 60, center=True, glow_radius=2)

    def next_scene(self):
        n = self._next; self._next = None
        return n


# ── 무한 모드 설정 씬 ────────────────────────────────────────────────────

class InfiniteSetupScene(Scene):
    SIZES = [
        ("tiny  5×5",    5,  5),
        ("small 8×8",    8,  8),
        ("mid  10×10",  10, 10),
        ("large 15×15", 15, 15),
        ("XL   20×20",  20, 20),
    ]
    DIFFS = ["easy", "normal", "hard", "expert"]

    def __init__(self, screen_w, screen_h):
        self.sw, self.sh = screen_w, screen_h
        self.stars  = StarField(screen_w, screen_h)
        self.nebula = NebulaBackground(screen_w, screen_h)
        self._time  = 0.0
        self._next  = None
        self._sel_size = 2
        self._sel_diff = 1

        cx = screen_w // 2
        self.size_btns = [
            NeonButton(pygame.Rect(cx - 350 + i*140, 280, 130, 50), s[0], C_NEON_BLUE, 16)
            for i, s in enumerate(self.SIZES)
        ]
        self.diff_btns = [
            NeonButton(pygame.Rect(cx - 280 + i*150, 380, 135, 50), d.upper(), C_NEON_PURPLE, 18)
            for i, d in enumerate(self.DIFFS)
        ]
        self.start_btn = NeonButton(pygame.Rect(cx-120, 480, 240, 56), "시작!", C_GOLD, 28)
        self.back_btn  = NeonButton(pygame.Rect(30, 20, 100, 40), "← 뒤로", C_NEON_PINK, 20)

    def handle_event(self, event):
        if self.back_btn.is_clicked(event):
            self._next = ("menu", {}); return
        for i, btn in enumerate(self.size_btns):
            if btn.is_clicked(event):
                self._sel_size = i; return
        for i, btn in enumerate(self.diff_btns):
            if btn.is_clicked(event):
                self._sel_diff = i; return
        if self.start_btn.is_clicked(event):
            rows, cols = self.SIZES[self._sel_size][1], self.SIZES[self._sel_size][2]
            diff = self.DIFFS[self._sel_diff]
            p = generate_random_puzzle(rows, cols, difficulty=diff)
            self._next = ("game", {"puzzle": p, "mode": "random"}); return
        if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            self._next = ("menu", {})

    def update(self, dt):
        self._time += dt
        self.stars.update(dt)
        mouse = pygame.mouse.get_pos()
        for btn in self.size_btns + self.diff_btns + [self.start_btn, self.back_btn]:
            btn.update(dt, mouse)
        # 선택된 버튼 색상 강조
        for i, btn in enumerate(self.size_btns):
            btn.color = C_GOLD if i == self._sel_size else C_NEON_BLUE
        for i, btn in enumerate(self.diff_btns):
            btn.color = C_GOLD if i == self._sel_diff else C_NEON_PURPLE

    def draw(self, surface):
        self.nebula.draw(surface)
        self.stars.draw(surface)
        self.back_btn.draw(surface)

        font_t = get_font(40, bold=True)
        font_s = get_font(22)
        cx = self.sw // 2

        draw_neon_text(surface, "INFINITE MODE", font_t, C_NEON_PURPLE,
                       cx, 120, center=True, glow_radius=6)
        draw_neon_text(surface, "퍼즐 크기 선택", font_s, C_HINT_NORMAL,
                       cx, 240, center=True, glow_radius=2)
        for btn in self.size_btns:
            btn.draw(surface)
        draw_neon_text(surface, "난이도 선택", font_s, C_HINT_NORMAL,
                       cx, 350, center=True, glow_radius=2)
        for btn in self.diff_btns:
            btn.draw(surface)
        self.start_btn.draw(surface)

    def next_scene(self):
        n = self._next; self._next = None
        return n


# Optional import guard
try:
    from typing import Optional
except ImportError:
    Optional = None

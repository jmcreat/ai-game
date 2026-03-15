# main.py - Pygame 기반 고스톱 GUI (이미지 카드 버전)

import sys
import os
import math
import pygame
from typing import Optional, Tuple, List, Dict

from cards import Card, CardType, MONTH_NAMES, create_all_cards
from game import GoStopGame, GamePhase

# ── 상수 ──────────────────────────────────────────────────────────────────
CARD_W, CARD_H   = 58, 82       # 화면 표시 크기
IMG_W,  IMG_H    = 116, 164     # 저장된 이미지 원본 크기
CARD_MARGIN      = 6
SCREEN_W         = 1100
SCREEN_H         = 780

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets", "cards")

COLOR_BG        = (34,  85,  34)
COLOR_FIELD_BG  = (20,  60,  20)
COLOR_PANEL     = (20,  50,  20)
COLOR_WHITE     = (255, 255, 255)
COLOR_SELECTED  = (255, 255,   0)
COLOR_HIGHLIGHT = (255, 220,   0)
COLOR_BTN_GO    = (30,  150,  30)
COLOR_BTN_STOP  = (180,  30,  30)
COLOR_GWANG     = (220,  50,  50)
COLOR_YUL       = (50,  100, 220)
COLOR_TI        = (200, 150,  30)
COLOR_PI        = (150, 150, 150)

TYPE_COLORS = {
    CardType.GWANG: COLOR_GWANG,
    CardType.YUL:   COLOR_YUL,
    CardType.TI:    COLOR_TI,
    CardType.PI:    COLOR_PI,
}
TYPE_SYMBOLS = {
    CardType.GWANG: "光",
    CardType.YUL:   "◆",
    CardType.TI:    "▬",
    CardType.PI:    "●",
}


# ── 폰트 ──────────────────────────────────────────────────────────────────
def get_font(size: int, bold: bool = False) -> pygame.font.Font:
    for name in (["malgunbd","malgun gothic","applegothic","nanumgothic","gulim","batang"]):
        try:
            f = pygame.font.SysFont(name, size, bold=bold)
            if f: return f
        except Exception:
            pass
    return pygame.font.SysFont(None, size, bold=bold)


# ── 이미지 캐시 ────────────────────────────────────────────────────────────
class CardImageCache:
    """카드 이미지를 로드하고 CARD_W×CARD_H 크기로 캐싱"""

    def __init__(self):
        self._cache: Dict[str, pygame.Surface] = {}
        self._back: Optional[pygame.Surface] = None
        self._fallback_cache: Dict[str, pygame.Surface] = {}

    def _key(self, card: Card, idx: int = 0) -> str:
        suffix = f"_{idx}" if idx > 0 else ""
        return f"{card.month:02d}_{card.card_type.name}{suffix}"

    def _load(self, key: str) -> Optional[pygame.Surface]:
        path = os.path.join(ASSETS_DIR, f"{key}.png")
        if not os.path.exists(path):
            return None
        try:
            img = pygame.image.load(path).convert_alpha()
            return pygame.transform.smoothscale(img, (CARD_W, CARD_H))
        except Exception:
            return None

    def get(self, card: Card, idx: int = 0) -> Optional[pygame.Surface]:
        key = self._key(card, idx)
        if key not in self._cache:
            self._cache[key] = self._load(key)
            if self._cache[key] is None and idx > 0:
                self._cache[key] = self._load(self._key(card, 0))
        return self._cache[key]

    def get_back(self) -> Optional[pygame.Surface]:
        if self._back is None:
            path = os.path.join(ASSETS_DIR, "back.png")
            if os.path.exists(path):
                img = pygame.image.load(path).convert_alpha()
                self._back = pygame.transform.smoothscale(img, (CARD_W, CARD_H))
        return self._back

    def make_fallback(self, card: Card) -> pygame.Surface:
        """이미지 없을 때 벡터로 그린 대체 카드"""
        key = f"fb_{card.month}_{card.card_type.name}"
        if key in self._fallback_cache:
            return self._fallback_cache[key]

        MONTH_COLORS = {
            1:(220,240,210),2:(255,230,230),3:(255,200,200),4:(220,200,255),
            5:(200,240,240),6:(255,210,230),7:(255,220,200),8:(240,240,200),
            9:(220,255,220),10:(255,230,200),11:(210,220,240),12:(230,230,255),
        }
        surf = pygame.Surface((CARD_W, CARD_H), pygame.SRCALPHA)
        bg = MONTH_COLORS.get(card.month, (255,248,220))
        pygame.draw.rect(surf, bg, (0,0,CARD_W,CARD_H), border_radius=6)
        pygame.draw.rect(surf, (90,60,20), (0,0,CARD_W,CARD_H), 2, border_radius=6)
        fn = get_font(13, bold=True)
        mn = fn.render(str(card.month), True, (60,30,10))
        surf.blit(mn, (4,3))
        tc = TYPE_COLORS[card.card_type]
        ts = get_font(22, bold=True)
        sym = ts.render(TYPE_SYMBOLS[card.card_type], True, tc)
        surf.blit(sym, (CARD_W//2 - sym.get_width()//2, CARD_H//2 - sym.get_height()//2))
        ns = get_font(11)
        nm = ns.render(card.name[:3], True, (40,20,5))
        surf.blit(nm, (2, CARD_H-17))
        self._fallback_cache[key] = surf
        return surf


# ── 카드 그리기 헬퍼 ────────────────────────────────────────────────────────
def draw_card(surface: pygame.Surface, card: Card, x: int, y: int,
              cache: CardImageCache, card_idx: int = 0,
              selected: bool = False, face_up: bool = True,
              highlight: bool = False, scale: float = 1.0):
    """이미지 기반 카드 그리기. 이미지 없으면 벡터 폴백."""

    dw = int(CARD_W * scale)
    dh = int(CARD_H * scale)
    rect = pygame.Rect(x, y, dw, dh)

    if selected:
        pygame.draw.rect(surface, COLOR_SELECTED, rect.inflate(8, 8), border_radius=9)
    if highlight:
        pygame.draw.rect(surface, COLOR_HIGHLIGHT, rect.inflate(6, 6), border_radius=8)

    if not face_up:
        back = cache.get_back()
        if back:
            img = back if scale == 1.0 else pygame.transform.smoothscale(back, (dw, dh))
            surface.blit(img, (x, y))
        else:
            pygame.draw.rect(surface, (60,30,100), rect, border_radius=6)
            pygame.draw.rect(surface, (100,60,160), rect.inflate(-6,-6), border_radius=4)
        return

    img = cache.get(card, card_idx)
    if img is None:
        img = cache.make_fallback(card)

    if scale != 1.0:
        img = pygame.transform.smoothscale(img, (dw, dh))

    surface.blit(img, (x, y))

    # 선택 시 반투명 노란 오버레이
    if selected:
        ov = pygame.Surface((dw, dh), pygame.SRCALPHA)
        ov.fill((255,255,0,60))
        surface.blit(ov, (x, y))


def draw_button(surface, text, x, y, w, h, color, hover=False, font_size=20):
    rect = pygame.Rect(x, y, w, h)
    col = tuple(min(c+30,255) for c in color) if hover else color
    pygame.draw.rect(surface, col, rect, border_radius=10)
    pygame.draw.rect(surface, COLOR_WHITE, rect, 2, border_radius=10)
    font = get_font(font_size, bold=True)
    txt = font.render(text, True, COLOR_WHITE)
    surface.blit(txt, (x+(w-txt.get_width())//2, y+(h-txt.get_height())//2))
    return rect


def draw_gradient_rect(surface, top_c, bot_c, rect):
    r1,g1,b1 = top_c; r2,g2,b2 = bot_c
    for dy in range(rect.height):
        t = dy / max(rect.height-1,1)
        pygame.draw.line(surface,
            (int(r1+(r2-r1)*t), int(g1+(g2-g1)*t), int(b1+(b2-b1)*t)),
            (rect.x, rect.y+dy), (rect.x+rect.width-1, rect.y+dy))


# ── 메인 UI 클래스 ─────────────────────────────────────────────────────────
class GoStopUI:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("고스톱 (Go-Stop)")
        self.screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), pygame.RESIZABLE)
        self.clock  = pygame.time.Clock()
        self.cache  = CardImageCache()
        self.game   = GoStopGame()
        self.game.new_game()
        self._build_card_idx_map()

        self.hover_card:   Optional[Card] = None
        self.ai_turn_timer: float = 0.0

    def _build_card_idx_map(self):
        """같은 월/타입 카드가 여러 장일 때 인덱스 구분 맵 생성"""
        self._card_idx: Dict[int, int] = {}   # id(card) → idx
        counter: Dict[str, int] = {}
        all_cards = create_all_cards()
        for card in all_cards:
            key = f"{card.month}_{card.card_type.name}"
            n = counter.get(key, 0)
            counter[key] = n + 1
            self._card_idx[id(card)] = n

    def _idx(self, card: Card) -> int:
        return self._card_idx.get(id(card), 0)

    # ── 레이아웃 ───────────────────────────────────────────────────────────
    def card_row_x(self, count, center_x):
        total = count * CARD_W + (count-1) * CARD_MARGIN
        x = center_x - total//2
        return [x + i*(CARD_W+CARD_MARGIN) for i in range(count)]

    # ── 배경 ───────────────────────────────────────────────────────────────
    def draw_background(self):
        # 메인 바닥 그라디언트
        draw_gradient_rect(self.screen, (28,75,28), (40,100,40),
                           pygame.Rect(0,0,SCREEN_W,SCREEN_H))
        # 상단 패널
        pygame.draw.rect(self.screen, COLOR_PANEL, (0,0,SCREEN_W,52))
        pygame.draw.line(self.screen,(60,100,60),(0,52),(SCREEN_W,52),1)
        # 하단 패널
        pygame.draw.rect(self.screen, COLOR_PANEL, (0,SCREEN_H-52,SCREEN_W,52))
        pygame.draw.line(self.screen,(60,100,60),(0,SCREEN_H-52),(SCREEN_W,SCREEN_H-52),1)

    # ── 플레이어 정보 ──────────────────────────────────────────────────────
    def draw_player_info(self):
        g = self.game
        font = get_font(17, bold=True)
        for i, player in enumerate(g.players):
            sc    = player.calculate_current_score()
            total = sc["total"]
            bonus = " · ".join(f"{k}:{v}점" for k,v in sc["bonuses"].items())
            y = 14 if i==1 else SCREEN_H-40
            label = f"{'▶ ' if g.current_player_idx==i else ''}{player.name}  점수:{total}점  고:{player.go_count}회"
            if bonus: label += f"  [{bonus}]"
            col = (255,240,80) if g.current_player_idx==i else COLOR_WHITE
            self.screen.blit(font.render(label, True, col), (14, y))

    # ── 바닥패 ─────────────────────────────────────────────────────────────
    def draw_field(self):
        cols, rows = 6, 2
        SLOT_W = CARD_W + CARD_MARGIN + 6
        SLOT_H = CARD_H + CARD_MARGIN + 22
        total_w = cols * SLOT_W - CARD_MARGIN
        x0 = (SCREEN_W - total_w) // 2
        y0 = 178

        font_m = get_font(11)
        for col in range(cols):
            for row in range(rows):
                month = row*cols + col + 1
                x = x0 + col*SLOT_W
                y = y0 + row*SLOT_H
                # 월 레이블
                self.screen.blit(
                    font_m.render(MONTH_NAMES[month-1], True, (160,210,160)),
                    (x, y-14))
                cards = self.game.field[month]
                if not cards:
                    pygame.draw.rect(self.screen, COLOR_FIELD_BG,
                                     (x,y,CARD_W,CARD_H), border_radius=6)
                    pygame.draw.rect(self.screen, (50,90,50),
                                     (x,y,CARD_W,CARD_H), 1, border_radius=6)
                else:
                    for ci, card in enumerate(cards[:3]):
                        offset = ci*7
                        draw_card(self.screen, card, x+offset, y+offset,
                                  self.cache, self._idx(card))

    # ── 핸드 ───────────────────────────────────────────────────────────────
    def draw_hand(self, player_idx: int):
        player = self.game.players[player_idx]
        hand   = player.hand
        if not hand: return

        is_human = player.is_human
        center_x = SCREEN_W // 2
        y = SCREEN_H - 142 if is_human else 55

        xs = self.card_row_x(len(hand), center_x)
        for i, card in enumerate(hand):
            selected = (card == self.game.selected_hand_card)
            hover    = (card == self.hover_card) and is_human
            y_off    = -12 if (selected or hover) else 0
            draw_card(self.screen, card, xs[i], y+y_off,
                      self.cache, self._idx(card),
                      selected=selected, face_up=is_human,
                      highlight=hover)

    # ── 먹은 패 사이드바 ────────────────────────────────────────────────────
    def draw_captured(self):
        font_hd = get_font(13, bold=True)
        font_sm = get_font(11)
        x0 = SCREEN_W - 158

        for i, player in enumerate(self.game.players):
            y0 = 58 + i*340
            lbl = font_hd.render(f"── {player.name} 먹은 패 ──", True, COLOR_WHITE)
            self.screen.blit(lbl, (x0, y0))
            grouped = {
                "광": player.get_gwang(), "열끗": player.get_yul(),
                "띠": player.get_ti(),    "피":   player.get_pi(),
            }
            row_y = y0 + 20
            for gname, gcards in grouped.items():
                if not gcards: continue
                self.screen.blit(
                    font_sm.render(f"{gname}({len(gcards)})", True, (190,220,190)),
                    (x0, row_y))
                mw, mh = 20, 28
                for j, c in enumerate(gcards[:6]):
                    cx2 = x0+54+j*(mw+2); cy2 = row_y-1
                    mini = pygame.transform.smoothscale(
                        self.cache.get(c, self._idx(c)) or self.cache.make_fallback(c),
                        (mw, mh))
                    self.screen.blit(mini, (cx2, cy2))
                row_y += 34

    # ── 덱 카운트 ─────────────────────────────────────────────────────────
    def draw_deck_count(self):
        font = get_font(15)
        txt  = font.render(f"덱 {len(self.game.deck)}장", True, COLOR_WHITE)
        # 덱 뒷면 카드 아이콘
        back = self.cache.get_back()
        if back:
            mini = pygame.transform.smoothscale(back, (30,42))
            self.screen.blit(mini, (14, SCREEN_H//2 - 21))
        self.screen.blit(txt, (50, SCREEN_H//2 - 10))

    # ── 메시지 바 ─────────────────────────────────────────────────────────
    def draw_message(self):
        bar = pygame.Surface((SCREEN_W, 34), pygame.SRCALPHA)
        bar.fill((0,0,0,130))
        self.screen.blit(bar, (0, SCREEN_H-175))
        font = get_font(16)
        surf = font.render(self.game.message, True, COLOR_WHITE)
        self.screen.blit(surf, (14, SCREEN_H-170))

    # ── 고/스톱 버튼 ─────────────────────────────────────────────────────
    def draw_go_stop_buttons(self):
        mouse = pygame.mouse.get_pos()
        bw, bh = 140, 52
        gx = SCREEN_W//2 - bw - 22
        sx = SCREEN_W//2 + 22
        by = SCREEN_H//2 - bh//2

        # 반투명 오버레이
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        ov.fill((0,0,0,100))
        self.screen.blit(ov,(0,0))

        font = get_font(20, bold=True)
        hint = font.render("고 또는 스톱을 선택하세요", True, COLOR_HIGHLIGHT)
        self.screen.blit(hint, (SCREEN_W//2-hint.get_width()//2, by-52))

        go_r   = draw_button(self.screen,"고 (GO)",   gx,by,bw,bh, COLOR_BTN_GO,
                             pygame.Rect(gx,by,bw,bh).collidepoint(mouse), 22)
        stop_r = draw_button(self.screen,"스톱 (STOP)",sx,by,bw,bh, COLOR_BTN_STOP,
                             pygame.Rect(sx,by,bw,bh).collidepoint(mouse), 22)
        return go_r, stop_r

    # ── 2장 선택 ────────────────────────────────────────────────────────
    def draw_choose_capture(self):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        ov.fill((0,0,0,120))
        self.screen.blit(ov,(0,0))

        font = get_font(20, bold=True)
        hint = font.render("먹을 카드를 선택하세요!", True, COLOR_HIGHLIGHT)
        self.screen.blit(hint, (SCREEN_W//2-hint.get_width()//2, SCREEN_H//2-90))

        cards  = self.game.pending_captures
        xs     = self.card_row_x(len(cards), SCREEN_W//2)
        y      = SCREEN_H//2 - CARD_H//2
        mouse  = pygame.mouse.get_pos()
        result = []
        for i, card in enumerate(cards):
            x    = xs[i]
            over = pygame.Rect(x,y,CARD_W,CARD_H).collidepoint(mouse)
            draw_card(self.screen, card, x, y, self.cache, self._idx(card),
                      highlight=over, scale=1.3 if over else 1.0)
            result.append((card, pygame.Rect(x,y,CARD_W,CARD_H)))
        return result

    # ── 게임 오버 ──────────────────────────────────────────────────────
    def draw_game_over(self):
        ov = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        ov.fill((0,0,0,190))
        self.screen.blit(ov,(0,0))

        g = self.game
        winner_name = g.winner.name if g.winner else "무승부"

        font_big = get_font(54, bold=True)
        font_mid = get_font(28)
        font_sm  = get_font(20)

        title = font_big.render(f"{winner_name} 승리!", True, COLOR_HIGHLIGHT)
        self.screen.blit(title,(SCREEN_W//2-title.get_width()//2, SCREEN_H//2-150))

        if g.winner:
            sc    = g.winner.calculate_current_score()
            stxt  = font_mid.render(f"최종 점수: {g.winner.score}점", True, COLOR_WHITE)
            self.screen.blit(stxt,(SCREEN_W//2-stxt.get_width()//2, SCREEN_H//2-70))
            bonus = "  |  ".join(f"{k}: {v}점" for k,v in sc["bonuses"].items())
            if bonus:
                bsurf = font_sm.render(bonus, True, (200,240,200))
                self.screen.blit(bsurf,(SCREEN_W//2-bsurf.get_width()//2, SCREEN_H//2-20))

        # 먹은 패 하이라이트 (승자)
        if g.winner:
            self._draw_winner_cards(g.winner)

        mouse = pygame.mouse.get_pos()
        bw,bh = 200,54
        bx = SCREEN_W//2-bw//2
        by = SCREEN_H//2+90
        return draw_button(self.screen,"다시하기",bx,by,bw,bh,
                           (60,120,60), pygame.Rect(bx,by,bw,bh).collidepoint(mouse), 24)

    def _draw_winner_cards(self, player):
        """게임오버 화면에 승자 먹은 패 일렬 표시"""
        caps = player.captured
        if not caps: return
        scale = 0.7
        cw = int(CARD_W*scale); ch = int(CARD_H*scale)
        total = len(caps)*(cw+3)
        sx = SCREEN_W//2 - total//2
        y  = SCREEN_H//2 + 50
        for i, card in enumerate(caps):
            draw_card(self.screen, card, sx+i*(cw+3), y,
                      self.cache, self._idx(card), scale=scale)

    # ── 클릭 감지 ─────────────────────────────────────────────────────────
    def get_hand_card_at(self, mx, my):
        player = self.game.players[0]
        if not player.hand: return None
        xs = self.card_row_x(len(player.hand), SCREEN_W//2)
        y  = SCREEN_H - 142
        for i, card in enumerate(player.hand):
            selected = (card == self.game.selected_hand_card)
            hover    = (card == self.hover_card)
            y_off    = -12 if (selected or hover) else 0
            if pygame.Rect(xs[i], y+y_off, CARD_W, CARD_H).collidepoint(mx, my):
                return card
        return None

    # ── 이벤트 ────────────────────────────────────────────────────────────
    def handle_events(self, go_rect=None, stop_rect=None,
                      capture_rects=None, restart_rect=None):
        g = self.game
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit(); sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit(); sys.exit()
                if event.key == pygame.K_r and g.phase == GamePhase.GAME_OVER:
                    g.new_game(); self._build_card_idx_map()
            if event.type == pygame.MOUSEMOTION:
                self.hover_card = self.get_hand_card_at(*event.pos)
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                mx, my = event.pos
                if g.phase == GamePhase.GAME_OVER and restart_rect:
                    if restart_rect.collidepoint(mx,my):
                        g.new_game(); self._build_card_idx_map(); return
                if g.phase == GamePhase.GO_STOP_CHOICE:
                    if go_rect   and go_rect.collidepoint(mx,my):   g.declare_go();   return
                    if stop_rect and stop_rect.collidepoint(mx,my): g.declare_stop(); return
                if g.phase == GamePhase.CHOOSE_CAPTURE and capture_rects:
                    for card, rect in capture_rects:
                        if rect.collidepoint(mx,my): g.choose_capture(card); return
                if g.phase == GamePhase.PLAYER_TURN:
                    card = self.get_hand_card_at(mx, my)
                    if card: g.play_card(card)

    # ── 메인 루프 ─────────────────────────────────────────────────────────
    def run(self):
        go_r = stop_r = restart_r = None
        cap_rects = []

        while True:
            dt = self.clock.tick(60) / 1000.0
            g  = self.game

            if g.phase == GamePhase.AI_TURN:
                self.ai_turn_timer += dt
                if self.ai_turn_timer >= 1.0:
                    self.ai_turn_timer = 0.0
                    g.ai_take_turn()
            elif g.phase == GamePhase.GO_STOP_CHOICE and not g.current_player.is_human:
                self.ai_turn_timer += dt
                if self.ai_turn_timer >= 0.8:
                    self.ai_turn_timer = 0.0
                    g.ai_go_stop()

            self.draw_background()
            self.draw_field()
            self.draw_hand(0)
            self.draw_hand(1)
            self.draw_captured()
            self.draw_deck_count()
            self.draw_player_info()
            self.draw_message()

            if g.phase == GamePhase.GO_STOP_CHOICE and g.current_player.is_human:
                go_r, stop_r = self.draw_go_stop_buttons()
            else:
                go_r = stop_r = None

            if g.phase == GamePhase.CHOOSE_CAPTURE and g.current_player.is_human:
                cap_rects = self.draw_choose_capture()
            else:
                cap_rects = []

            if g.phase == GamePhase.GAME_OVER:
                restart_r = self.draw_game_over()
            else:
                restart_r = None

            pygame.display.flip()
            self.handle_events(go_r, stop_r, cap_rects, restart_r)


if __name__ == "__main__":
    ui = GoStopUI()
    ui.run()

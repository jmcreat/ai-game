# particles.py - 파티클/이펙트 시스템

import math
import random
import pygame
from typing import List, Tuple


# ── 색상 팔레트 ──────────────────────────────────────────────────────────
SPARK_COLORS = [
    (255, 220,  80),  # 골드
    (255, 180,  40),  # 오렌지
    (255, 255, 160),  # 밝은 노랑
    (200, 240, 255),  # 아이스 블루
    (160, 200, 255),  # 하늘
]
STAR_COLORS = [
    (255, 255, 255),
    (200, 220, 255),
    (255, 240, 200),
    (180, 255, 220),
]
FIREWORK_COLORS = [
    (255,  80,  80),   # 빨강
    (255, 160,  40),   # 주황
    (255, 240,  60),   # 노랑
    ( 80, 255, 120),   # 초록
    ( 60, 160, 255),   # 파랑
    (200,  80, 255),   # 보라
    (255, 120, 200),   # 핑크
    (120, 255, 255),   # 시안
]
LINE_COLORS = [
    (255, 220,  80),
    (255, 200, 100),
    (255, 180,  40),
]


class Particle:
    """단일 파티클"""
    __slots__ = ("x", "y", "vx", "vy", "life", "max_life", "color", "size", "kind", "gravity")

    def __init__(self, x, y, vx, vy, life, color, size, kind="spark", gravity=0.0):
        self.x, self.y   = float(x), float(y)
        self.vx, self.vy = float(vx), float(vy)
        self.life        = float(life)
        self.max_life    = float(life)
        self.color       = color
        self.size        = float(size)
        self.kind        = kind
        self.gravity     = gravity

    @property
    def alive(self):
        return self.life > 0

    @property
    def alpha_ratio(self):
        return max(0.0, self.life / self.max_life)

    def update(self, dt: float):
        self.x  += self.vx * dt
        self.y  += self.vy * dt
        self.vy += self.gravity * dt
        self.vx *= 0.98   # 마찰
        self.life -= dt


class ParticleSystem:
    """전체 파티클 풀 관리 및 렌더링"""

    def __init__(self):
        self._particles: List[Particle] = []

    def update(self, dt: float):
        for p in self._particles:
            p.update(dt)
        self._particles = [p for p in self._particles if p.alive]

    def draw(self, surface: pygame.Surface):
        for p in self._particles:
            alpha = p.alpha_ratio
            r, g, b = p.color
            col = (int(r * alpha), int(g * alpha), int(b * alpha))
            sz = max(1, int(p.size * alpha))

            if p.kind == "spark":
                # 밝은 코어 + 글로우
                pygame.draw.circle(surface, col, (int(p.x), int(p.y)), sz)
                if sz > 2:
                    glow_col = (min(255, int(r * alpha * 1.2)),
                                min(255, int(g * alpha * 1.2)),
                                min(255, int(b * alpha * 1.2)))
                    pygame.draw.circle(surface, glow_col, (int(p.x), int(p.y)), max(1, sz - 1))

            elif p.kind == "star":
                self._draw_star(surface, int(p.x), int(p.y), sz, col)

            elif p.kind == "trail":
                pygame.draw.circle(surface, col, (int(p.x), int(p.y)), sz)

            elif p.kind == "ring":
                if sz > 0:
                    pygame.draw.circle(surface, col, (int(p.x), int(p.y)), sz, max(1, sz // 3))

    @staticmethod
    def _draw_star(surface, cx, cy, r, color):
        """별 모양 그리기"""
        if r < 2:
            pygame.draw.circle(surface, color, (cx, cy), 1)
            return
        pts = []
        for i in range(10):
            angle = math.radians(i * 36 - 90)
            radius = r if i % 2 == 0 else r * 0.45
            pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
        pygame.draw.polygon(surface, color, pts)

    # ── 이펙트 스폰 ────────────────────────────────────────────────────────

    def spawn_cell_fill(self, cx: float, cy: float):
        """셀 채우기: 골드 스파크 폭발"""
        count = random.randint(12, 20)
        for _ in range(count):
            angle = random.uniform(0, math.pi * 2)
            speed = random.uniform(40, 160)
            life  = random.uniform(0.3, 0.7)
            color = random.choice(SPARK_COLORS)
            size  = random.uniform(2, 5)
            self._particles.append(Particle(
                cx, cy,
                math.cos(angle) * speed,
                math.sin(angle) * speed,
                life, color, size, kind="spark", gravity=120
            ))

    def spawn_cell_error(self, cx: float, cy: float):
        """오답: 빨간 스파크"""
        for _ in range(8):
            angle = random.uniform(0, math.pi * 2)
            speed = random.uniform(30, 100)
            life  = random.uniform(0.2, 0.5)
            color = (random.randint(200, 255), random.randint(0, 60), random.randint(0, 60))
            self._particles.append(Particle(
                cx, cy,
                math.cos(angle) * speed,
                math.sin(angle) * speed,
                life, color, 3, kind="spark", gravity=80
            ))

    def spawn_line_clear(self, x1: float, y1: float, x2: float, y2: float, is_row: bool):
        """행/열 완성: 골드 파티클이 라인을 따라 흐름"""
        count = 40
        for i in range(count):
            t = i / count
            px = x1 + (x2 - x1) * t
            py = y1 + (y2 - y1) * t
            vx = random.uniform(-30, 30) + (0 if is_row else random.uniform(-20, 20))
            vy = random.uniform(-80, -20) if is_row else random.uniform(-30, 30)
            life  = random.uniform(0.4, 0.9)
            color = random.choice(LINE_COLORS)
            size  = random.uniform(3, 7)
            self._particles.append(Particle(
                px, py, vx, vy, life, color, size, kind="spark", gravity=60
            ))
        # 별 파티클도 추가
        for _ in range(10):
            t  = random.random()
            px = x1 + (x2 - x1) * t
            py = y1 + (y2 - y1) * t
            life = random.uniform(0.5, 1.0)
            color = random.choice(STAR_COLORS)
            self._particles.append(Particle(
                px, py, random.uniform(-20, 20), random.uniform(-60, -10),
                life, color, random.uniform(4, 9), kind="star", gravity=30
            ))

    def spawn_fireworks(self, cx: float, cy: float, count_bursts: int = 5):
        """퍼즐 클리어: 무지개 폭죽"""
        for _ in range(count_bursts):
            bx = cx + random.uniform(-200, 200)
            by = cy + random.uniform(-150, 150)
            color_group = random.choice(FIREWORK_COLORS)
            n = random.randint(30, 50)
            for i in range(n):
                angle = (i / n) * math.pi * 2 + random.uniform(-0.1, 0.1)
                speed = random.uniform(80, 220)
                life  = random.uniform(0.6, 1.4)
                col   = (
                    min(255, color_group[0] + random.randint(-30, 30)),
                    min(255, color_group[1] + random.randint(-30, 30)),
                    min(255, color_group[2] + random.randint(-30, 30)),
                )
                self._particles.append(Particle(
                    bx, by,
                    math.cos(angle) * speed,
                    math.sin(angle) * speed,
                    life, col, random.uniform(2, 6),
                    kind="spark", gravity=180
                ))
            # 링 이펙트
            for sz in range(5, 50, 6):
                self._particles.append(Particle(
                    bx, by, 0, 0,
                    0.4, color_group, sz, kind="ring", gravity=0
                ))

    def spawn_hint_reveal(self, cx: float, cy: float):
        """힌트 공개: 파란 별 파티클"""
        for _ in range(15):
            angle = random.uniform(0, math.pi * 2)
            speed = random.uniform(30, 100)
            life  = random.uniform(0.5, 1.0)
            color = (random.randint(100, 180), random.randint(180, 255), 255)
            self._particles.append(Particle(
                cx, cy,
                math.cos(angle) * speed,
                math.sin(angle) * speed,
                life, color, random.uniform(3, 7),
                kind="star", gravity=40
            ))

    def spawn_ambient_nebula(self, width: int, height: int, count: int = 3):
        """배경 성운 먼지 (주기적으로 호출)"""
        for _ in range(count):
            x = random.uniform(0, width)
            y = random.uniform(0, height)
            color = random.choice([
                (80, 40, 120), (40, 80, 160), (100, 40, 80),
                (40, 100, 80), (120, 80, 40),
            ])
            self._particles.append(Particle(
                x, y,
                random.uniform(-8, 8), random.uniform(-5, 5),
                random.uniform(3, 8), color,
                random.uniform(8, 24), kind="trail", gravity=0
            ))

    def clear(self):
        self._particles.clear()

    def count(self):
        return len(self._particles)


# ── 배경 별 레이어 (시차 스크롤) ──────────────────────────────────────────

class StarField:
    """레이어드 별빛 배경 (시차 효과)"""

    def __init__(self, width: int, height: int, layers: int = 3):
        self.width  = width
        self.height = height
        self.layers = []
        counts = [120, 60, 25]
        speeds = [8,   20,  45]
        sizes  = [(1, 1), (1, 2), (2, 3)]
        alphas = [140, 200, 255]

        for i in range(layers):
            stars = []
            for _ in range(counts[i]):
                x = random.uniform(0, width)
                y = random.uniform(0, height)
                size = random.randint(*sizes[i])
                twinkle = random.uniform(0, math.pi * 2)
                col_base = random.choice([
                    (255, 255, 255), (200, 220, 255), (255, 240, 200),
                    (180, 255, 230), (255, 200, 200),
                ])
                stars.append([x, y, size, twinkle, col_base])
            self.layers.append({"stars": stars, "speed": speeds[i], "alpha": alphas[i]})

        self._time = 0.0

    def update(self, dt: float):
        self._time += dt
        # 가장 빠른 레이어만 흘러내림
        for layer in self.layers[2:]:
            for star in layer["stars"]:
                star[1] += layer["speed"] * dt
                if star[1] > self.height:
                    star[1] = 0
                    star[0] = random.uniform(0, self.width)

    def draw(self, surface: pygame.Surface):
        for layer in self.layers:
            alpha = layer["alpha"]
            for star in layer["stars"]:
                x, y, sz, twinkle, col_base = star
                # 반짝임
                t_val = 0.5 + 0.5 * math.sin(self._time * 2.5 + twinkle)
                a = int(alpha * (0.5 + 0.5 * t_val))
                r = int(col_base[0] * a / 255)
                g = int(col_base[1] * a / 255)
                b = int(col_base[2] * a / 255)
                col = (r, g, b)
                pygame.draw.circle(surface, col, (int(x), int(y)), sz)

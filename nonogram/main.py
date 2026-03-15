# main.py - SceneManager + 메인 루프

import sys
import os
import pygame

from puzzle import generate_daily_puzzle, generate_infinite_puzzle
from scenes import (MainMenuScene, StageSelectScene, GameScene,
                    InfiniteSetupScene, load_save)

SCREEN_W = 1200
SCREEN_H = 800
FPS      = 60
TITLE    = "Nonogram Galaxy ✦"


class SceneManager:
    def __init__(self, screen: pygame.Surface):
        self.screen = screen
        sw, sh = screen.get_size()
        self._current = MainMenuScene(sw, sh)

    def handle_event(self, event: pygame.event.Event):
        self._current.handle_event(event)

    def update(self, dt: float):
        self._current.update(dt)
        req = self._current.next_scene()
        if req:
            self._transition(req[0], req[1])

    def draw(self):
        self._current.draw(self.screen)

    def _transition(self, name: str, kwargs: dict):
        sw, sh = self.screen.get_size()
        if name == "menu":
            self._current = MainMenuScene(sw, sh)
        elif name == "stage_select":
            self._current = StageSelectScene(sw, sh)
        elif name == "game":
            puzzle = kwargs.get("puzzle")
            mode   = kwargs.get("mode", "stage")
            level  = kwargs.get("infinite_level", 1)
            self._current = GameScene(sw, sh, puzzle, mode=mode, infinite_level=level)
        elif name == "infinite":
            self._current = InfiniteSetupScene(sw, sh)
        elif name == "daily":
            puzzle = generate_daily_puzzle()
            self._current = GameScene(sw, sh, puzzle, mode="daily")
        else:
            self._current = MainMenuScene(sw, sh)


def main():
    pygame.init()
    pygame.display.set_caption(TITLE)

    # 아이콘 (작은 별 모양)
    icon = pygame.Surface((32, 32), pygame.SRCALPHA)
    import math
    pts = []
    for i in range(10):
        angle = math.radians(i * 36 - 90)
        r = 14 if i % 2 == 0 else 6
        pts.append((16 + r * math.cos(angle), 16 + r * math.sin(angle)))
    pygame.draw.polygon(icon, (60, 160, 255), pts)
    pygame.display.set_icon(icon)

    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H), pygame.RESIZABLE)
    clock  = pygame.time.Clock()
    mgr    = SceneManager(screen)

    while True:
        dt = clock.tick(FPS) / 1000.0
        dt = min(dt, 0.05)   # 최대 50ms 클램프 (프레임 드랍 대응)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.VIDEORESIZE:
                screen = pygame.display.set_mode(event.size, pygame.RESIZABLE)
            mgr.handle_event(event)

        mgr.update(dt)
        mgr.draw()
        pygame.display.flip()


if __name__ == "__main__":
    main()

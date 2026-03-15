# game.py - 고스톱 게임 상태 및 로직

import random
from typing import List, Dict, Optional, Tuple
from cards import Card, CardType, create_all_cards
from scoring import calculate_score, check_go_stop_multiplier


class Player:
    def __init__(self, name: str, is_human: bool = True):
        self.name = name
        self.is_human = is_human
        self.hand: List[Card] = []
        self.captured: List[Card] = []  # 먹은 패
        self.go_count: int = 0
        self.score: int = 0

    def get_gwang(self):
        return [c for c in self.captured if c.card_type == CardType.GWANG]

    def get_yul(self):
        return [c for c in self.captured if c.card_type == CardType.YUL]

    def get_ti(self):
        return [c for c in self.captured if c.card_type == CardType.TI]

    def get_pi(self):
        return [c for c in self.captured if c.card_type in (CardType.PI,)]

    def calculate_current_score(self) -> Dict:
        return calculate_score(
            self.get_gwang(), self.get_yul(), self.get_ti(), self.get_pi()
        )


class GamePhase:
    WAITING = "waiting"
    PLAYER_TURN = "player_turn"
    FLIP_CARD = "flip_card"
    CHOOSE_CAPTURE = "choose_capture"
    GO_STOP_CHOICE = "go_stop_choice"
    AI_TURN = "ai_turn"
    GAME_OVER = "game_over"


class GoStopGame:
    def __init__(self, num_players: int = 2):
        self.deck: List[Card] = []
        self.field: Dict[int, List[Card]] = {m: [] for m in range(1, 13)}  # 월별 바닥패
        self.players: List[Player] = []
        self.current_player_idx: int = 0
        self.phase: str = GamePhase.WAITING
        self.message: str = ""
        self.selected_hand_card: Optional[Card] = None
        self.flipped_card: Optional[Card] = None
        self.pending_captures: List[Card] = []   # 선택 대기 중인 먹을 패
        self.winner: Optional[Player] = None
        self.num_players = num_players
        self.shaking_count: int = 0  # 흔들기 횟수

    def new_game(self):
        """게임 초기화 및 패 배분"""
        all_cards = create_all_cards()
        random.shuffle(all_cards)

        self.players = [
            Player("플레이어", is_human=True),
            Player("AI",       is_human=False),
        ]
        self.field = {m: [] for m in range(1, 13)}
        self.deck = []
        self.current_player_idx = 0
        self.phase = GamePhase.PLAYER_TURN
        self.winner = None
        self.message = "플레이어 차례입니다. 패를 선택하세요."
        self.selected_hand_card = None
        self.flipped_card = None
        self.pending_captures = []
        self.shaking_count = 0
        for p in self.players:
            p.go_count = 0
            p.score = 0
            p.captured = []

        # 카드 배분: 각자 10장, 바닥 8장, 나머지 덱
        idx = 0
        for _ in range(10):
            for p in self.players:
                p.hand.append(all_cards[idx])
                idx += 1
        for _ in range(8):
            card = all_cards[idx]
            self.field[card.month].append(card)
            idx += 1
        self.deck = all_cards[idx:]

    @property
    def current_player(self) -> Player:
        return self.players[self.current_player_idx]

    def get_matching_field(self, month: int) -> List[Card]:
        return self.field[month]

    def play_card(self, hand_card: Card) -> bool:
        """핸드 카드 선택 후 처리. True=성공"""
        if hand_card not in self.current_player.hand:
            return False

        self.selected_hand_card = hand_card
        field_matches = self.field[hand_card.month]

        if len(field_matches) == 0:
            # 바닥에 없음 → 그냥 버리기
            self.current_player.hand.remove(hand_card)
            self.field[hand_card.month].append(hand_card)
            self.message = f"{hand_card}을(를) 바닥에 버렸습니다."
            self._flip_deck_card()
        elif len(field_matches) == 1:
            # 1장 매칭 → 바로 먹기
            self._capture_cards(hand_card, field_matches[:])
            self._flip_deck_card()
        elif len(field_matches) == 2:
            # 2장 → 플레이어가 선택
            self.current_player.hand.remove(hand_card)
            self.pending_captures = field_matches[:]
            self.phase = GamePhase.CHOOSE_CAPTURE
            self.message = "먹을 패를 선택하세요."
        elif len(field_matches) == 3:
            # 3장 모두 먹기 (쓸)
            self._capture_cards(hand_card, field_matches[:])
            self._flip_deck_card()
        return True

    def choose_capture(self, chosen: Card):
        """2장 중 하나를 선택해 먹기"""
        if chosen not in self.pending_captures:
            return
        self.current_player.hand.remove(self.selected_hand_card) if self.selected_hand_card in self.current_player.hand else None
        caps = [self.selected_hand_card, chosen]
        for c in caps:
            if c in self.field[c.month]:
                self.field[c.month].remove(c)
        self.current_player.captured.extend(caps)
        self.pending_captures = []
        self._flip_deck_card()

    def _capture_cards(self, hand_card: Card, field_cards: List[Card]):
        """패 먹기 처리"""
        self.current_player.hand.remove(hand_card)
        for c in field_cards:
            self.field[c.month].remove(c)
        caps = [hand_card] + field_cards
        self.current_player.captured.extend(caps)
        self.message = f"{', '.join(str(c) for c in caps)} 먹었습니다!"

    def _flip_deck_card(self):
        """덱에서 카드 1장 뒤집기"""
        if not self.deck:
            self._check_game_end()
            return

        self.flipped_card = self.deck.pop(0)
        field_matches = self.field[self.flipped_card.month]

        if len(field_matches) == 0:
            self.field[self.flipped_card.month].append(self.flipped_card)
            self.message += f" | 덱에서 {self.flipped_card} 뒤집기 → 바닥에."
        elif len(field_matches) == 1:
            caps = [self.flipped_card] + field_matches[:]
            for c in field_matches:
                self.field[c.month].remove(c)
            self.current_player.captured.extend(caps)
            self.message += f" | 덱 카드로 추가 먹기!"
        elif len(field_matches) == 2:
            # 덱 카드 2장 → 임시로 첫번째 선택 (AI는 자동)
            chosen = field_matches[0]
            caps = [self.flipped_card, chosen]
            self.field[chosen.month].remove(chosen)
            self.current_player.captured.extend(caps)
            self.message += f" | 덱 카드로 추가 먹기!"
        elif len(field_matches) == 3:
            caps = [self.flipped_card] + field_matches[:]
            for c in field_matches:
                self.field[c.month].remove(c)
            self.current_player.captured.extend(caps)
            self.message += f" | 쓸! 덱 카드로 3장 모두 먹기!"

        self._after_flip()

    def _after_flip(self):
        """뒤집기 후 점수 확인 및 다음 차례 처리"""
        score_info = self.current_player.calculate_current_score()
        current_score = score_info["total"]

        if current_score >= 3:
            self.phase = GamePhase.GO_STOP_CHOICE
            self.message = f"점수: {current_score}점! 고(계속) 또는 스톱(종료)?"
        else:
            self._next_turn()

    def declare_stop(self):
        """스톱 선언"""
        self.winner = self.current_player
        score_info = self.current_player.calculate_current_score()
        multiplier = check_go_stop_multiplier(self.current_player.go_count)
        self.winner.score = int(score_info["total"] * multiplier)
        self.phase = GamePhase.GAME_OVER
        self.message = (
            f"{self.winner.name} 스톱! "
            f"점수: {score_info['total']}점 × {multiplier}배 = {self.winner.score}점"
        )

    def declare_go(self):
        """고 선언"""
        self.current_player.go_count += 1
        self.message = f"{self.current_player.name} 고! ({self.current_player.go_count}번째)"
        self._next_turn()

    def _next_turn(self):
        """다음 플레이어로 차례 넘기기"""
        if not self.deck and all(len(p.hand) == 0 for p in self.players):
            self._check_game_end()
            return

        self.current_player_idx = (self.current_player_idx + 1) % len(self.players)
        if self.current_player.is_human:
            self.phase = GamePhase.PLAYER_TURN
            self.message = "플레이어 차례입니다. 패를 선택하세요."
        else:
            self.phase = GamePhase.AI_TURN
            self.message = "AI 차례..."

    def _check_game_end(self):
        """게임 종료 조건 확인"""
        # 패가 없거나 덱이 비면 강제 종료
        best = max(self.players, key=lambda p: p.calculate_current_score()["total"])
        score_info = best.calculate_current_score()
        if score_info["total"] > 0:
            self.winner = best
            self.winner.score = score_info["total"]
        self.phase = GamePhase.GAME_OVER
        self.message = f"게임 종료! {self.winner.name if self.winner else '무승부'}"

    def ai_take_turn(self) -> Optional[Card]:
        """AI 자동 턴 실행. 플레이한 카드 반환"""
        if not self.current_player.hand:
            self._next_turn()
            return None

        # 단순 AI: 바닥과 매칭되는 카드 우선, 없으면 랜덤
        for card in self.current_player.hand:
            if self.field[card.month]:
                self.play_card(card)
                return card

        # 매칭 없으면 랜덤
        card = random.choice(self.current_player.hand)
        self.play_card(card)
        return card

    def ai_go_stop(self):
        """AI 고/스톱 판단 (7점 이상이면 스톱)"""
        score_info = self.current_player.calculate_current_score()
        if score_info["total"] >= 7 or self.current_player.go_count >= 2:
            self.declare_stop()
        else:
            self.declare_go()

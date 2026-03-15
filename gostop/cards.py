# cards.py - 화투 카드 데이터 정의

from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class CardType(Enum):
    GWANG = "광"       # 5점
    YUL = "열끗"       # 2점
    TI = "띠"          # 1점
    PI = "피"          # 1점 (피패)


# 월별 이름
MONTH_NAMES = [
    "1월(松)", "2월(梅)", "3월(벚꽃)", "4월(등나무)",
    "5월(창포)", "6월(모란)", "7월(홍싸리)", "8월(억새)",
    "9월(국화)", "10월(단풍)", "11월(오동)", "12월(비)"
]


@dataclass
class Card:
    month: int          # 1~12
    card_type: CardType
    name: str
    points: int
    special: Optional[str] = None   # 'ssangpi', 'godori', 'cheongtanwori' 등

    def __repr__(self):
        return f"[{MONTH_NAMES[self.month-1]} {self.card_type.value} {self.name}]"


def create_all_cards() -> List[Card]:
    """48장 화투 카드 전체 생성"""
    cards = []

    # 1월 (松 / 솔) - 광1, 띠1, 피2
    cards.append(Card(1, CardType.GWANG, "일월광", 20, special="일광"))
    cards.append(Card(1, CardType.TI,   "홍띠",   0))
    cards.append(Card(1, CardType.PI,   "피",     0))
    cards.append(Card(1, CardType.PI,   "피",     0))

    # 2월 (梅 / 매화)
    cards.append(Card(2, CardType.YUL,  "매조",   0, special="조류"))
    cards.append(Card(2, CardType.TI,   "홍띠",   0))
    cards.append(Card(2, CardType.PI,   "피",     0))
    cards.append(Card(2, CardType.PI,   "피",     0))

    # 3월 (벚꽃)
    cards.append(Card(3, CardType.GWANG, "삼월광", 20, special="삼광"))
    cards.append(Card(3, CardType.TI,   "홍띠",   0))
    cards.append(Card(3, CardType.PI,   "피",     0))
    cards.append(Card(3, CardType.PI,   "피",     0))

    # 4월 (등나무)
    cards.append(Card(4, CardType.YUL,  "제비",   0, special="조류"))
    cards.append(Card(4, CardType.TI,   "초띠",   0))
    cards.append(Card(4, CardType.PI,   "피",     0))
    cards.append(Card(4, CardType.PI,   "피",     0))

    # 5월 (창포)
    cards.append(Card(5, CardType.YUL,  "난초",   0))
    cards.append(Card(5, CardType.TI,   "초띠",   0))
    cards.append(Card(5, CardType.PI,   "피",     0))
    cards.append(Card(5, CardType.PI,   "피",     0))

    # 6월 (모란)
    cards.append(Card(6, CardType.YUL,  "나비",   0, special="조류"))
    cards.append(Card(6, CardType.TI,   "초띠",   0))
    cards.append(Card(6, CardType.PI,   "피",     0))
    cards.append(Card(6, CardType.PI,   "피",     0))

    # 7월 (홍싸리)
    cards.append(Card(7, CardType.YUL,  "멧돼지", 0, special="홍단띠"))
    cards.append(Card(7, CardType.TI,   "홍띠",   0, special="홍단"))
    cards.append(Card(7, CardType.PI,   "피",     0))
    cards.append(Card(7, CardType.PI,   "피",     0))

    # 8월 (억새)
    cards.append(Card(8, CardType.GWANG, "팔월광", 20, special="팔광"))
    cards.append(Card(8, CardType.YUL,  "기러기", 0, special="조류"))
    cards.append(Card(8, CardType.PI,   "피",     0))
    cards.append(Card(8, CardType.PI,   "피",     0))

    # 9월 (국화)
    cards.append(Card(9, CardType.YUL,  "국화주", 0, special="술잔"))
    cards.append(Card(9, CardType.TI,   "초띠",   0))
    cards.append(Card(9, CardType.PI,   "피",     0))
    cards.append(Card(9, CardType.PI,   "피",     0))

    # 10월 (단풍)
    cards.append(Card(10, CardType.YUL, "사슴",   0))
    cards.append(Card(10, CardType.TI,  "청띠",   0, special="청단"))
    cards.append(Card(10, CardType.PI,  "피",     0))
    cards.append(Card(10, CardType.PI,  "피",     0))

    # 11월 (오동)
    cards.append(Card(11, CardType.GWANG, "십일월광", 20, special="비광"))
    cards.append(Card(11, CardType.YUL,  "제비燕",  0))
    cards.append(Card(11, CardType.PI,   "쌍피",    0, special="ssangpi"))
    cards.append(Card(11, CardType.PI,   "피",      0))

    # 12월 (비)
    cards.append(Card(12, CardType.GWANG, "십이월광", 20, special="비광"))
    cards.append(Card(12, CardType.YUL,  "봉황",    0))
    cards.append(Card(12, CardType.PI,   "쌍피",    0, special="ssangpi"))
    cards.append(Card(12, CardType.PI,   "피",      0))

    return cards

# scoring.py - 고스톱 점수 계산 로직

from typing import List, Dict
from cards import Card, CardType


def count_pi(cards: List[Card]) -> int:
    """피 장수 계산 (쌍피는 2장으로 계산)"""
    total = 0
    for c in cards:
        if c.card_type == CardType.PI:
            total += 2 if c.special == "ssangpi" else 1
        elif c.card_type == CardType.YUL and c.special == "술잔":
            total += 1  # 국화주도 피로 사용 가능 (룰에 따라)
    return total


def calculate_score(
    gwang_cards: List[Card],
    yul_cards: List[Card],
    ti_cards: List[Card],
    pi_cards: List[Card]
) -> Dict[str, int]:
    """보유 패로부터 점수 계산. 결과 딕셔너리 반환."""
    score = 0
    bonuses = {}

    # --- 광 점수 ---
    gwang_count = len(gwang_cards)
    gwang_specials = [c.special for c in gwang_cards]
    has_bi = "비광" in gwang_specials

    if gwang_count >= 5:
        g_score = 15
        bonuses["오광"] = g_score
    elif gwang_count == 4:
        g_score = 4 if has_bi else 4
        bonuses["사광"] = g_score
    elif gwang_count == 3:
        g_score = 2 if has_bi else 3
        bonuses["삼광"] = g_score
    else:
        g_score = 0
    score += g_score

    # --- 열끗(조류) 고도리 ---
    godori_cards = [c for c in yul_cards if c.special == "조류"]  # 2,4,6월
    yul_count = len(yul_cards)
    if len(godori_cards) >= 3:
        bonuses["고도리"] = 5
        score += 5

    # 열끗 기본: 5장부터 1점, 추가마다 +1
    if yul_count >= 5:
        y_score = 1 + (yul_count - 5)
        bonuses[f"열끗({yul_count}장)"] = y_score
        score += y_score

    # --- 띠 점수 ---
    ti_count = len(ti_cards)
    ti_specials = [c.special for c in ti_cards]

    # 홍단: 1,2,3월 홍띠
    hongdan_months = {c.month for c in ti_cards if c.special in ("홍단", None) and c.month in (1, 2, 3)}
    # 실제로는 1,2,3월 띠가 모두 홍띠
    hongdan_cards = [c for c in ti_cards if c.month in (1, 2, 3)]
    if len(hongdan_cards) >= 3:
        bonuses["홍단"] = 3
        score += 3

    # 청단: 6,9,10월 청띠
    chungdan_cards = [c for c in ti_cards if c.special == "청단" or c.month in (6, 9, 10)]
    # 단순하게 6,9,10월 띠로 처리
    chungdan_cards = [c for c in ti_cards if c.month in (6, 9, 10)]
    if len(chungdan_cards) >= 3:
        bonuses["청단"] = 3
        score += 3

    # 초단: 4,5,7월 초띠
    chodan_cards = [c for c in ti_cards if c.month in (4, 5, 7)]
    if len(chodan_cards) >= 3:
        bonuses["초단"] = 3
        score += 3

    # 띠 기본: 5장부터 1점
    if ti_count >= 5:
        t_score = 1 + (ti_count - 5)
        bonuses[f"띠({ti_count}장)"] = t_score
        score += t_score

    # --- 피 점수 ---
    pi_total = count_pi(pi_cards)
    if pi_total >= 10:
        p_score = 1 + (pi_total - 10)
        bonuses[f"피({pi_total}장)"] = p_score
        score += p_score

    return {"total": score, "bonuses": bonuses}


def check_go_stop_multiplier(go_count: int) -> float:
    """고 선언 횟수에 따른 배수"""
    if go_count == 0:
        return 1.0
    elif go_count == 1:
        return 2.0
    elif go_count == 2:
        return 3.0
    else:
        return 3.0 * (2 ** (go_count - 2))

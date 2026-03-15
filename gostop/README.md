# 고스톱 (Go-Stop) 게임

Python + Pygame 으로 만든 2인용 (플레이어 vs AI) 화투 고스톱 게임입니다.
Windows / macOS / Linux 모두 실행 가능합니다.

---

## 설치 및 실행

### 1. Python 설치 (3.9 이상 권장)
- https://www.python.org/downloads/ 에서 다운로드

### 2. 의존성 설치
```bash
pip install -r requirements.txt
```

### 3. 게임 실행
```bash
python main.py
```

---

## Windows에서 실행하기

```bat
pip install pygame
python main.py
```

또는 `run_windows.bat` 을 더블클릭:

```bat
@echo off
pip install pygame >nul 2>&1
python main.py
pause
```

---

## 게임 방법

| 동작 | 방법 |
|------|------|
| 카드 선택 | 내 패(하단)의 카드를 마우스로 클릭 |
| 고 선언 | **고(GO)** 버튼 클릭 (배수 2배 적용) |
| 스톱 선언 | **스톱(STOP)** 버튼 클릭 (점수 확정) |
| 다시하기 | 게임 종료 후 **다시하기** 버튼 또는 `R` 키 |
| 종료 | `ESC` 키 |

---

## 점수 규칙

| 조합 | 점수 |
|------|------|
| 오광 (5광) | 15점 |
| 사광 (4광) | 4점 |
| 삼광 (3광) | 3점 (비광 포함 시 2점) |
| 고도리 (2,4,6월 열끗) | 5점 |
| 열끗 5장 이상 | 1점 + 초과마다 1점 |
| 홍단 (1,2,3월 띠) | 3점 |
| 청단 (6,9,10월 띠) | 3점 |
| 초단 (4,5,7월 띠) | 3점 |
| 띠 5장 이상 | 1점 + 초과마다 1점 |
| 피 10장 이상 | 1점 + 초과마다 1점 |

### 고 배수
- 고 1번: ×2배
- 고 2번: ×3배
- 고 3번 이상: ×6배 (2배씩 증가)

---

## 파일 구조

```
gostop/
├── main.py          # Pygame GUI 메인
├── game.py          # 게임 상태 및 로직
├── cards.py         # 화투 카드 데이터 (48장)
├── scoring.py       # 점수 계산
├── requirements.txt
└── README.md
```

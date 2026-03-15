# generate_cards.py
# 화투 48장 카드 이미지를 Pygame으로 그려서 assets/cards/ 에 PNG로 저장

import os
import math
import pygame
import pygame.gfxdraw
from cards import create_all_cards, CardType, Card

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "cards")
CARD_W, CARD_H = 116, 164   # 실제 저장 크기 (화면 표시의 2배 해상도)

# ── 팔레트 ────────────────────────────────────────────────────────────────
WHITE   = (255, 255, 255)
BLACK   = (  0,   0,   0)
CREAM   = (255, 248, 220)
DARK    = ( 30,  20,  10)

# 월별 배경 그라디언트 상단/하단
MONTH_GRAD = {
    1:  ((200, 230, 180), (240, 255, 220)),   # 솔 - 초록
    2:  ((255, 200, 210), (255, 230, 240)),   # 매화 - 분홍
    3:  ((255, 190, 200), (255, 220, 230)),   # 벚꽃 - 연분홍
    4:  ((190, 170, 230), (220, 210, 255)),   # 등나무 - 라벤더
    5:  ((170, 220, 210), (210, 245, 240)),   # 창포 - 청록
    6:  ((240, 180, 210), (255, 215, 235)),   # 모란 - 핑크
    7:  ((230, 180, 160), (255, 215, 200)),   # 홍싸리 - 살구
    8:  ((220, 220, 160), (245, 245, 200)),   # 억새 - 노랑
    9:  ((190, 230, 190), (220, 255, 220)),   # 국화 - 연두
    10: ((240, 200, 160), (255, 230, 200)),   # 단풍 - 주황
    11: ((180, 190, 230), (210, 220, 255)),   # 오동 - 하늘
    12: ((160, 180, 210), (200, 215, 240)),   # 비 - 회청
}

# 광 배경 금빛 오버레이
GWANG_GOLD   = (255, 210,  60)
GWANG_BORDER = (200, 150,  20)

# 타입별 띠 색
TI_COLORS = {
    "홍띠":  (200,  40,  40),
    "초띠":  ( 40, 140,  40),
    "청띠":  ( 30,  80, 200),
    "default": (160,  80,  20),
}

def get_font(size, bold=False):
    preferred = ["malgunbd" if bold else "malgun gothic",
                 "applegothic", "nanumgothic", "gulim", "batang"]
    for name in preferred:
        try:
            f = pygame.font.SysFont(name, size, bold=bold)
            if f: return f
        except Exception:
            pass
    return pygame.font.SysFont(None, size, bold=bold)

# ── 그라디언트 배경 ────────────────────────────────────────────────────────
def draw_gradient(surf, top_color, bottom_color, rect):
    r1,g1,b1 = top_color
    r2,g2,b2 = bottom_color
    for y in range(rect.height):
        t = y / max(rect.height - 1, 1)
        r = int(r1 + (r2-r1)*t)
        g = int(g1 + (g2-g1)*t)
        b = int(b1 + (b2-b1)*t)
        pygame.draw.line(surf, (r,g,b), (rect.x, rect.y+y), (rect.x+rect.width-1, rect.y+y))

# ── 공통 테두리 ───────────────────────────────────────────────────────────
def draw_border(surf, color=(100,70,20), width=3):
    pygame.draw.rect(surf, color, (0,0,CARD_W,CARD_H), width, border_radius=10)

# ── 식물/자연 모티프 그리기 함수들 ─────────────────────────────────────────

def draw_pine(surf, cx, cy, size=1.0):
    """솔나무"""
    s = size
    trunk_w = int(10*s); trunk_h = int(22*s)
    tx = cx - trunk_w//2; ty = cy + int(10*s)
    pygame.draw.rect(surf, (100,60,20), (tx,ty,trunk_w,trunk_h), border_radius=3)
    for i, (w, h, yoff) in enumerate([(int(48*s),int(22*s),0),(int(38*s),int(20*s),-int(14*s)),(int(26*s),int(18*s),-int(26*s))]):
        color = (30+i*15, 110+i*10, 30+i*10)
        pts = [(cx, cy-int(20*s)+yoff-h//2),
               (cx-w//2, cy-int(20*s)+yoff+h//2),
               (cx+w//2, cy-int(20*s)+yoff+h//2)]
        pygame.draw.polygon(surf, color, pts)
        pygame.draw.polygon(surf, (20,80,20), pts, 1)

def draw_plum(surf, cx, cy, size=1.0):
    """매화 가지와 꽃"""
    s = size
    # 가지
    pygame.draw.line(surf, (80,40,10), (cx, cy+int(30*s)), (cx-int(20*s), cy-int(30*s)), int(4*s))
    pygame.draw.line(surf, (80,40,10), (cx-int(10*s), cy), (cx+int(25*s), cy-int(20*s)), int(3*s))
    pygame.draw.line(surf, (80,40,10), (cx-int(20*s), cy-int(30*s)), (cx-int(35*s), cy-int(10*s)), int(2*s))
    # 꽃들
    for fx, fy, r in [(cx-int(20*s),cy-int(30*s),int(9*s)),(cx+int(22*s),cy-int(22*s),int(8*s)),(cx-int(35*s),cy-int(10*s),int(7*s)),(cx-int(5*s),cy-int(10*s),int(6*s))]:
        for angle in range(5):
            a = math.radians(angle*72)
            px = fx + int(r*0.65*math.cos(a))
            py = fy + int(r*0.65*math.sin(a))
            pygame.draw.circle(surf, (255,180,190), (px,py), int(r*0.45))
        pygame.draw.circle(surf, (255,230,50), (fx,fy), int(r*0.25))

def draw_cherry(surf, cx, cy, size=1.0):
    """벚꽃"""
    s = size
    pygame.draw.line(surf, (90,50,20), (cx,cy+int(30*s)), (cx,cy-int(10*s)), int(5*s))
    pygame.draw.line(surf, (90,50,20), (cx,cy-int(5*s)), (cx-int(30*s),cy-int(30*s)), int(3*s))
    pygame.draw.line(surf, (90,50,20), (cx,cy-int(5*s)), (cx+int(30*s),cy-int(30*s)), int(3*s))
    for fx, fy in [(cx-int(28*s),cy-int(32*s)),(cx+int(28*s),cy-int(32*s)),(cx-int(10*s),cy-int(22*s)),(cx+int(10*s),cy-int(22*s)),(cx,cy-int(38*s))]:
        for angle in range(5):
            a = math.radians(angle*72-18)
            px = fx + int(11*s*math.cos(a))
            py = fy + int(11*s*math.sin(a))
            pygame.draw.circle(surf, (255,200,215), (px,py), int(6*s))
        pygame.draw.circle(surf, (255,240,100), (fx,fy), int(3*s))

def draw_wisteria(surf, cx, cy, size=1.0):
    """등나무 (보라 꽃 드리움)"""
    s = size
    pygame.draw.line(surf, (80,50,20), (cx-int(20*s),cy-int(40*s)),(cx+int(20*s),cy-int(40*s)),int(5*s))
    pygame.draw.line(surf, (100,60,20), (cx-int(20*s),cy-int(40*s)),(cx-int(20*s),cy+int(30*s)),int(2*s))
    pygame.draw.line(surf, (100,60,20), (cx,cy-int(40*s)),(cx,cy+int(35*s)),int(2*s))
    pygame.draw.line(surf, (100,60,20), (cx+int(20*s),cy-int(40*s)),(cx+int(20*s),cy+int(30*s)),int(2*s))
    for vx in [cx-int(20*s), cx, cx+int(20*s)]:
        for vy in range(cy-int(30*s), cy+int(35*s), int(10*s)):
            pygame.draw.ellipse(surf, (160,100,210), (vx-int(5*s),vy-int(7*s),int(10*s),int(8*s)))

def draw_iris(surf, cx, cy, size=1.0):
    """창포"""
    s = size
    for dx, angle in [(-int(15*s),-15),(0,0),(int(15*s),15)]:
        pts_leaf = []
        for i in range(10):
            t = i/9
            x = cx+dx + int(math.sin(math.radians(angle+t*10))*8*s)
            y = cy+int(30*s) - int(t*70*s)
            pts_leaf.append((x,y))
        if len(pts_leaf)>=2:
            pygame.draw.lines(surf,(40,130,80),False,pts_leaf,int(4*s))
    # 꽃
    for angle in range(6):
        a = math.radians(angle*60)
        px = cx + int(16*s*math.cos(a))
        py = cy - int(22*s) + int(16*s*math.sin(a))
        pygame.draw.ellipse(surf,(130,80,200),(px-int(6*s),py-int(8*s),int(12*s),int(16*s)))
    pygame.draw.circle(surf,(255,230,50),(cx,cy-int(22*s)),int(5*s))

def draw_peony(surf, cx, cy, size=1.0):
    """모란"""
    s = size
    # 잎
    for lx,ly,lw,lh in [(cx-int(30*s),cy+int(5*s),int(30*s),int(18*s)),(cx+int(5*s),cy+int(10*s),int(28*s),int(16*s))]:
        pygame.draw.ellipse(surf,(40,110,40),(lx,ly,lw,lh))
        pygame.draw.line(surf,(20,80,20),(lx+lw//2,ly),(lx+lw//2,ly+lh),1)
    # 꽃
    layers = [(int(30*s),(220,80,120)),(int(22*s),(240,120,150)),(int(14*s),(255,160,180)),(int(8*s),(255,220,230))]
    for r,c in layers:
        for i in range(8):
            a = math.radians(i*45)
            px = cx+int(r*0.55*math.cos(a)); py = cy-int(10*s)+int(r*0.55*math.sin(a))
            pygame.draw.circle(surf,c,(px,py),int(r*0.45))
    pygame.draw.circle(surf,(255,240,100),(cx,cy-int(10*s)),int(5*s))

def draw_clover(surf, cx, cy, size=1.0):
    """홍싸리 (작은 꽃 무더기)"""
    s = size
    # 줄기들
    for dx,dy2 in [(-int(20*s),-int(20*s)),(0,-int(30*s)),(int(20*s),-int(20*s))]:
        pygame.draw.line(surf,(60,100,40),(cx,cy+int(30*s)),(cx+dx,cy+dy2),int(3*s))
        # 작은 꽃들
        for t in [0.3,0.6,0.9]:
            fx = int(cx + dx*t); fy = int(cy+int(30*s) + (dy2-int(30*s))*t)
            pygame.draw.circle(surf,(220,80,100),(fx,fy),int(5*s))
            pygame.draw.circle(surf,(255,150,170),(fx,fy),int(3*s))

def draw_pampas(surf, cx, cy, size=1.0):
    """억새 (보름달과 갈대)"""
    s = size
    # 달
    pygame.draw.circle(surf,(255,240,180),(cx,cy-int(20*s)),int(22*s))
    pygame.draw.circle(surf,(255,220,120),(cx,cy-int(20*s)),int(22*s),2)
    # 억새 줄기
    for dx in range(-int(25*s), int(30*s), int(10*s)):
        bx = cx+dx
        pygame.draw.line(surf,(150,130,80),(bx,cy+int(35*s)),(bx+int(5*s),cy-int(10*s)),int(2*s))
        pygame.draw.ellipse(surf,(180,160,100),(bx,cy-int(20*s),int(8*s),int(18*s)))

def draw_chrysanthemum(surf, cx, cy, size=1.0):
    """국화"""
    s = size
    # 잎
    for angle in range(0,360,60):
        a = math.radians(angle)
        lx = cx+int(22*s*math.cos(a)); ly = cy+int(10*s)+int(22*s*math.sin(a))
        pygame.draw.ellipse(surf,(40,110,40),(lx-int(8*s),ly-int(12*s),int(16*s),int(22*s)))
    # 꽃잎
    for layer, (r,col) in enumerate([(int(24*s),(220,180,40)),(int(17*s),(240,200,60)),(int(10*s),(255,230,100))]):
        for i in range(12):
            a = math.radians(i*30 + layer*15)
            px = cx+int(r*0.6*math.cos(a)); py = cy-int(5*s)+int(r*0.6*math.sin(a))
            pygame.draw.ellipse(surf,col,(px-int(4*s),py-int(7*s),int(8*s),int(14*s)))
    pygame.draw.circle(surf,(255,200,40),(cx,cy-int(5*s)),int(6*s))

def draw_maple(surf, cx, cy, size=1.0):
    """단풍"""
    s = size
    pygame.draw.line(surf,(90,50,20),(cx,cy+int(35*s)),(cx,cy-int(5*s)),int(5*s))
    pygame.draw.line(surf,(90,50,20),(cx,cy-int(5*s)),(cx-int(30*s),cy-int(30*s)),int(3*s))
    pygame.draw.line(surf,(90,50,20),(cx,cy-int(5*s)),(cx+int(30*s),cy-int(30*s)),int(3*s))
    pygame.draw.line(surf,(90,50,20),(cx,cy-int(15*s)),(cx-int(35*s),cy-int(5*s)),int(2*s))
    pygame.draw.line(surf,(90,50,20),(cx,cy-int(15*s)),(cx+int(35*s),cy-int(5*s)),int(2*s))

    def maple_leaf(sx, sy, r):
        pts = []
        for i in range(7):
            a = math.radians(i*360/7 - 90)
            lr = r if i%2==0 else int(r*0.5)
            pts.append((sx+int(lr*math.cos(a)), sy+int(lr*math.sin(a))))
        pygame.draw.polygon(surf,(200,60,20),pts)
        pygame.draw.polygon(surf,(160,30,10),pts,1)

    for lx,ly,lr in [(cx-int(30*s),cy-int(32*s),int(14*s)),(cx+int(30*s),cy-int(32*s),int(14*s)),(cx,cy-int(38*s),int(15*s)),(cx-int(35*s),cy-int(8*s),int(11*s)),(cx+int(35*s),cy-int(8*s),int(11*s))]:
        maple_leaf(lx,ly,lr)

def draw_paulownia(surf, cx, cy, size=1.0):
    """오동나무"""
    s = size
    pygame.draw.line(surf,(80,50,20),(cx,cy+int(30*s)),(cx,cy-int(10*s)),int(5*s))
    for dx in [-int(28*s),0,int(28*s)]:
        pygame.draw.line(surf,(80,50,20),(cx,cy-int(10*s)),(cx+dx,cy-int(35*s)),int(3*s))
        bx = cx+dx; by = cy-int(35*s)
        for i in range(5):
            a = math.radians(i*30-60)
            pygame.draw.ellipse(surf,(120,80,180),(bx+int(10*s*math.cos(a))-int(5*s),by+int(10*s*math.sin(a))-int(8*s),int(10*s),int(16*s)))
    # 큰 잎
    for lx,ly in [(cx-int(25*s),cy+int(5*s)),(cx+int(10*s),cy+int(8*s))]:
        pygame.draw.ellipse(surf,(40,110,40),(lx,ly,int(32*s),int(22*s)))

def draw_rain(surf, cx, cy, size=1.0):
    """비 (빗줄기)"""
    s = size
    # 구름
    for cx2,cy2,r in [(cx-int(18*s),cy-int(28*s),int(16*s)),(cx,cy-int(32*s),int(20*s)),(cx+int(18*s),cy-int(28*s),int(16*s))]:
        pygame.draw.circle(surf,(160,170,190),(cx2,cy2),r)
    # 빗줄기
    for i in range(8):
        rx = cx - int(28*s) + i*int(8*s)
        pygame.draw.line(surf,(100,130,200),(rx,cy-int(12*s)),(rx-int(6*s),cy+int(30*s)),int(2*s))

# 월별 식물 그리기 함수 매핑
MONTH_DRAW_FN = {
    1: draw_pine, 2: draw_plum, 3: draw_cherry,
    4: draw_wisteria, 5: draw_iris, 6: draw_peony,
    7: draw_clover, 8: draw_pampas, 9: draw_chrysanthemum,
    10: draw_maple, 11: draw_paulownia, 12: draw_rain,
}

# 동물/특수 오브젝트
def draw_bird(surf, cx, cy, color=(40,40,40), size=1.0):
    """작은 새"""
    s = size
    pygame.draw.ellipse(surf,color,(cx-int(10*s),cy-int(5*s),int(20*s),int(10*s)))
    pygame.draw.circle(surf,color,(cx+int(8*s),cy-int(4*s)),int(5*s))
    pygame.draw.polygon(surf,(255,200,50),[(cx+int(12*s),cy-int(4*s)),(cx+int(18*s),cy-int(2*s)),(cx+int(12*s),cy)])
    pygame.draw.ellipse(surf,color,(cx-int(18*s),cy-int(10*s),int(12*s),int(8*s)))
    pygame.draw.ellipse(surf,color,(cx+int(4*s),cy-int(10*s),int(12*s),int(8*s)))

def draw_goose(surf, cx, cy, size=1.0):
    """기러기 (팔월광)"""
    s = size
    for i,dy in enumerate([0,-int(12*s),-int(24*s)]):
        bx = cx - int(20*s) + i*int(20*s)
        draw_bird(surf,bx,cy+dy,(50,50,60),size*0.85)

def draw_boar(surf, cx, cy, size=1.0):
    """멧돼지"""
    s = size
    pygame.draw.ellipse(surf,(90,60,50),(cx-int(22*s),cy-int(10*s),int(44*s),int(22*s)))
    pygame.draw.circle(surf,(90,60,50),(cx+int(18*s),cy-int(8*s)),int(10*s))
    pygame.draw.circle(surf,(60,30,20),(cx+int(22*s),cy-int(10*s)),int(3*s))
    pygame.draw.line(surf,(110,80,60),(cx-int(14*s),cy+int(10*s)),(cx-int(14*s),cy+int(22*s)),int(4*s))
    pygame.draw.line(surf,(110,80,60),(cx-int(4*s),cy+int(10*s)),(cx-int(4*s),cy+int(22*s)),int(4*s))
    pygame.draw.line(surf,(110,80,60),(cx+int(6*s),cy+int(10*s)),(cx+int(6*s),cy+int(22*s)),int(4*s))
    pygame.draw.polygon(surf,(100,70,60),[(cx-int(22*s),cy-int(10*s)),(cx-int(30*s),cy-int(4*s)),(cx-int(28*s),cy+int(4*s)),(cx-int(22*s),cy+int(4*s))])

def draw_deer(surf, cx, cy, size=1.0):
    """사슴"""
    s = size
    pygame.draw.ellipse(surf,(160,110,70),(cx-int(18*s),cy-int(5*s),int(36*s),int(20*s)))
    pygame.draw.ellipse(surf,(160,110,70),(cx+int(8*s),cy-int(22*s),int(16*s),int(20*s)))
    pygame.draw.circle(surf,(140,90,60),(cx+int(18*s),cy-int(18*s)),int(6*s))
    pygame.draw.line(surf,(130,80,40),(cx+int(16*s),cy-int(24*s)),(cx+int(10*s),cy-int(36*s)),int(2*s))
    pygame.draw.line(surf,(130,80,40),(cx+int(20*s),cy-int(24*s)),(cx+int(26*s),cy-int(36*s)),int(2*s))
    pygame.draw.line(surf,(130,80,40),(cx+int(10*s),cy-int(36*s)),(cx+int(5*s),cy-int(44*s)),int(2*s))
    pygame.draw.line(surf,(130,80,40),(cx+int(10*s),cy-int(36*s)),(cx+int(14*s),cy-int(44*s)),int(2*s))
    for lx in [cx-int(12*s),cx-int(2*s),cx+int(8*s),cx+int(18*s)]:
        pygame.draw.line(surf,(140,95,60),(lx,cy+int(12*s)),(lx,cy+int(28*s)),int(4*s))

def draw_swallow(surf, cx, cy, size=1.0):
    """제비"""
    s = size
    pygame.draw.ellipse(surf,(30,30,50),(cx-int(12*s),cy-int(5*s),int(24*s),int(10*s)))
    pygame.draw.circle(surf,(30,30,50),(cx+int(10*s),cy-int(3*s)),int(5*s))
    pygame.draw.polygon(surf,(200,50,50),[(cx+int(14*s),cy-int(2*s)),(cx+int(20*s),cy+int(5*s)),(cx+int(14*s),cy+int(4*s))])
    pygame.draw.ellipse(surf,(30,30,50),(cx-int(22*s),cy-int(10*s),int(14*s),int(7*s)))
    pygame.draw.ellipse(surf,(30,30,50),(cx+int(2*s),cy-int(10*s),int(14*s),int(7*s)))
    pygame.draw.polygon(surf,(30,30,50),[(cx-int(10*s),cy+int(5*s)),(cx-int(5*s),cy+int(18*s)),(cx,cy+int(18*s)),(cx+int(5*s),cy+int(5*s))])

def draw_phoenix(surf, cx, cy, size=1.0):
    """봉황"""
    s = size
    pygame.draw.ellipse(surf,(200,160,20),(cx-int(12*s),cy-int(5*s),int(24*s),int(14*s)))
    pygame.draw.circle(surf,(200,120,10),(cx+int(10*s),cy-int(2*s)),int(7*s))
    pygame.draw.polygon(surf,(180,80,0),[(cx+int(16*s),cy-int(2*s)),(cx+int(26*s),cy+int(2*s)),(cx+int(16*s),cy+int(4*s))])
    # 날개
    wing_pts_l = [(cx-int(12*s),cy),(cx-int(30*s),cy-int(18*s)),(cx-int(20*s),cy-int(28*s)),(cx-int(5*s),cy-int(10*s))]
    wing_pts_r = [(cx+int(8*s),cy),(cx+int(28*s),cy-int(18*s)),(cx+int(18*s),cy-int(28*s)),(cx-int(2*s),cy-int(10*s))]
    pygame.draw.polygon(surf,(220,150,30),wing_pts_l)
    pygame.draw.polygon(surf,(220,150,30),wing_pts_r)
    # 꼬리
    for i,angle in enumerate([20,10,0,-10,-20]):
        a = math.radians(180+angle)
        tx = cx+int(36*s*math.cos(a)); ty = cy+int(36*s*math.sin(a))
        col = [(255,80,0),(255,140,0),(220,200,0),(0,180,100),(0,100,200)][i]
        pygame.draw.line(surf,col,(cx-int(10*s),cy),(tx,ty),int(3*s))

def draw_sake_cup(surf, cx, cy, size=1.0):
    """국화주 술잔"""
    s = size
    pygame.draw.polygon(surf,(240,200,120),[(cx-int(16*s),cy-int(10*s)),(cx+int(16*s),cy-int(10*s)),(cx+int(10*s),cy+int(15*s)),(cx-int(10*s),cy+int(15*s))])
    pygame.draw.polygon(surf,(200,160,80),[(cx-int(16*s),cy-int(10*s)),(cx+int(16*s),cy-int(10*s)),(cx+int(10*s),cy+int(15*s)),(cx-int(10*s),cy+int(15*s))],int(2*s))
    pygame.draw.line(surf,(200,160,80),(cx-int(14*s),cy+int(18*s)),(cx+int(14*s),cy+int(18*s)),int(3*s))
    pygame.draw.ellipse(surf,(180,220,255),(cx-int(12*s),cy-int(10*s),int(24*s),int(8*s)))

# 특수 오브젝트 매핑 (열끗/광)
SPECIAL_DRAW = {
    2:  draw_bird,
    4:  draw_swallow,
    6:  draw_bird,
    8:  draw_goose,
    7:  draw_boar,
    10: draw_deer,
    11: draw_swallow,
    12: draw_phoenix,
    9:  draw_sake_cup,
}

# ── 광 장식 ────────────────────────────────────────────────────────────────
def draw_gwang_decoration(surf, cx, cy):
    s = CARD_W / 116
    # 방사형 금빛 광채
    for i in range(16):
        a = math.radians(i*22.5)
        r1, r2 = int(20*s), int(42*s)
        x1 = cx+int(r1*math.cos(a)); y1 = cy+int(r1*math.sin(a))
        x2 = cx+int(r2*math.cos(a)); y2 = cy+int(r2*math.sin(a))
        alpha_col = (255,210,60, 120)
        pygame.draw.line(surf,(255,210,60),(x1,y1),(x2,y2),int(2*s))
    pygame.draw.circle(surf,(255,230,100),(cx,cy),int(18*s))
    pygame.draw.circle(surf,(255,200,40),(cx,cy),int(18*s),int(2*s))
    font = get_font(int(20*s), bold=True)
    t = font.render("光", True, (180,80,0))
    surf.blit(t,(cx-t.get_width()//2, cy-t.get_height()//2))

# ── 띠 그리기 ──────────────────────────────────────────────────────────────
def draw_ti_ribbon(surf, card: Card):
    s = CARD_W / 116
    name = card.name
    if "홍" in name or card.month in (1,2,3,7):
        col = TI_COLORS["홍띠"]
    elif "청" in name or card.special == "청단":
        col = TI_COLORS["청띠"]
    elif "초" in name or card.month in (4,5,6):
        col = TI_COLORS["초띠"]
    else:
        col = TI_COLORS["default"]

    cy = CARD_H // 2 + int(10*s)
    bx, bw, bh = int(14*s), CARD_W-int(28*s), int(22*s)
    pygame.draw.rect(surf, col, (bx, cy-bh//2, bw, bh), border_radius=int(6*s))
    pygame.draw.rect(surf, tuple(max(c-40,0) for c in col), (bx, cy-bh//2, bw, bh), int(2*s), border_radius=int(6*s))
    # 리본 양 끝 V자
    pygame.draw.polygon(surf, tuple(max(c-40,0) for c in col),
        [(bx, cy-bh//2), (bx-int(8*s), cy), (bx, cy+bh//2)])
    pygame.draw.polygon(surf, tuple(max(c-40,0) for c in col),
        [(bx+bw, cy-bh//2), (bx+bw+int(8*s), cy), (bx+bw, cy+bh//2)])
    # 텍스트
    font = get_font(int(15*s), bold=True)
    label = "홍단" if card.month in (1,2,3,7) else ("청단" if card.special=="청단" else ("초단" if card.month in (4,5,6) else "띠"))
    t = font.render(label, True, WHITE)
    surf.blit(t, (CARD_W//2 - t.get_width()//2, cy - t.get_height()//2))

# ── 피 패턴 ────────────────────────────────────────────────────────────────
def draw_pi_pattern(surf, card: Card):
    s = CARD_W / 116
    is_ssang = card.special == "ssangpi"
    # 배경 패턴 (물결)
    for y in range(0, CARD_H, int(14*s)):
        for x in range(0, CARD_W, int(18*s)):
            pygame.draw.circle(surf,(200,210,200),(x,y),int(4*s),int(1*s))
    # 피 원
    positions = [(CARD_W//2, CARD_H//2 - int(12*s)), (CARD_W//2, CARD_H//2 + int(12*s))] if is_ssang else [(CARD_W//2, CARD_H//2)]
    for px,py in positions:
        pygame.draw.circle(surf,(80,140,80),(px,py),int(16*s))
        pygame.draw.circle(surf,(100,180,100),(px,py),int(12*s))
        pygame.draw.circle(surf,(140,210,140),(px,py),int(7*s))
    if is_ssang:
        font = get_font(int(14*s), bold=True)
        t = font.render("쌍피", True, (40,100,40))
        surf.blit(t,(CARD_W//2-t.get_width()//2, CARD_H-int(22*s)))

# ── 카드 상단 월/타입 레이블 ────────────────────────────────────────────────
def draw_card_header(surf, card: Card):
    s = CARD_W / 116
    # 상단 좌 - 월 번호
    font_n = get_font(int(18*s), bold=True)
    mn = font_n.render(str(card.month), True, (60,30,10))
    surf.blit(mn, (int(7*s), int(5*s)))

    # 타입 기호 (우상단)
    type_chars = {CardType.GWANG:"光", CardType.YUL:"✦", CardType.TI:"▬", CardType.PI:"●"}
    type_cols  = {CardType.GWANG:(200,100,0), CardType.YUL:(30,80,200), CardType.TI:(180,60,20), CardType.PI:(60,120,60)}
    tc = font_n.render(type_chars[card.card_type], True, type_cols[card.card_type])
    surf.blit(tc, (CARD_W - tc.get_width() - int(6*s), int(5*s)))

    # 하단 카드 이름
    font_sm = get_font(int(13*s))
    nm = font_sm.render(card.name[:4], True, (50,30,10))
    surf.blit(nm, (CARD_W//2 - nm.get_width()//2, CARD_H - int(18*s)))

# ── 메인 카드 생성 함수 ────────────────────────────────────────────────────
def render_card(card: Card) -> pygame.Surface:
    surf = pygame.Surface((CARD_W, CARD_H), pygame.SRCALPHA)

    top_c, bot_c = MONTH_GRAD.get(card.month, (CREAM, WHITE))
    draw_gradient(surf, top_c, bot_c, pygame.Rect(0,0,CARD_W,CARD_H))

    cx = CARD_W // 2
    cy = CARD_H // 2

    draw_fn = MONTH_DRAW_FN.get(card.month)

    if card.card_type == CardType.GWANG:
        # 금빛 오버레이
        gold_surf = pygame.Surface((CARD_W, CARD_H), pygame.SRCALPHA)
        pygame.draw.rect(gold_surf, (*GWANG_GOLD, 40), (0,0,CARD_W,CARD_H), border_radius=10)
        surf.blit(gold_surf, (0,0))
        if draw_fn:
            draw_fn(surf, cx, cy - CARD_H//8, size=0.85)
        draw_gwang_decoration(surf, cx, cy + CARD_H//4)

    elif card.card_type == CardType.YUL:
        if draw_fn:
            draw_fn(surf, cx, cy + int(CARD_H*0.05), size=0.80)
        spec_fn = SPECIAL_DRAW.get(card.month)
        if spec_fn:
            spec_fn(surf, cx, cy - int(CARD_H*0.22), size=0.75)

    elif card.card_type == CardType.TI:
        if draw_fn:
            draw_fn(surf, cx, cy - int(CARD_H*0.1), size=0.70)
        draw_ti_ribbon(surf, card)

    elif card.card_type == CardType.PI:
        if draw_fn:
            draw_fn(surf, cx, cy - int(CARD_H*0.12), size=0.60)
        draw_pi_pattern(surf, card)

    # 테두리와 헤더는 모든 카드 공통
    draw_card_header(surf, card)
    pygame.draw.rect(surf, (90,60,20), (0,0,CARD_W,CARD_H), 3, border_radius=10)

    return surf


def render_back() -> pygame.Surface:
    """카드 뒷면"""
    surf = pygame.Surface((CARD_W, CARD_H), pygame.SRCALPHA)
    draw_gradient(surf, (50,20,80), (80,40,120), pygame.Rect(0,0,CARD_W,CARD_H))
    s = CARD_W / 116
    # 격자 패턴
    for y in range(0, CARD_H, int(14*s)):
        pygame.draw.line(surf,(100,60,160,80),(0,y),(CARD_W,y),1)
    for x in range(0, CARD_W, int(14*s)):
        pygame.draw.line(surf,(100,60,160,80),(x,0),(x,CARD_H),1)
    # 중앙 마름모
    cx, cy = CARD_W//2, CARD_H//2
    r = int(28*s)
    pts = [(cx,cy-r),(cx+r,cy),(cx,cy+r),(cx-r,cy)]
    pygame.draw.polygon(surf,(120,70,180),pts)
    pygame.draw.polygon(surf,(160,110,220),pts,int(2*s))
    font = get_font(int(22*s),bold=True)
    t = font.render("花", True,(200,160,240))
    surf.blit(t,(cx-t.get_width()//2, cy-t.get_height()//2))
    pygame.draw.rect(surf,(120,70,180),(0,0,CARD_W,CARD_H),3,border_radius=10)
    return surf


def generate_all_card_images():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    pygame.init()
    # headless 표면 (디스플레이 없이)
    dummy = pygame.Surface((1,1))

    cards = create_all_cards()
    seen = {}
    for card in cards:
        key = (card.month, card.card_type.name, card.special or "")
        if key in seen:
            # 같은 월/타입/특수가 2장이면 _2 접미사
            seen[key] += 1
            suffix = f"_{seen[key]}"
        else:
            seen[key] = 1
            suffix = ""
        filename = f"{card.month:02d}_{card.card_type.name}{suffix}.png"
        path = os.path.join(OUTPUT_DIR, filename)
        surf = render_card(card)
        pygame.image.save(surf, path)
        print(f"  저장: {filename}")

    # 뒷면
    back = render_back()
    pygame.image.save(back, os.path.join(OUTPUT_DIR, "back.png"))
    print("  저장: back.png")
    print(f"\n총 {len(cards)+1}개 이미지 생성 완료 → {OUTPUT_DIR}")
    pygame.quit()


if __name__ == "__main__":
    generate_all_card_images()

# fetch_real_cards.py (v2)
# 위키미디어 표준 썸네일 URL(500px)로 화투 PNG 48장 다운로드

import os, io, time, urllib.request
from PIL import Image, ImageDraw

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "cards")
os.makedirs(OUTPUT_DIR, exist_ok=True)

CARD_W, CARD_H = 232, 328
HEADERS = {
    "User-Agent": "HwatuGame/1.0 (educational project; single user download)",
    "Accept": "image/png,image/*",
}

# 위키미디어 표준 500px 썸네일 URL (SVG→PNG 자동 변환)
# 형식: https://upload.wikimedia.org/wikipedia/commons/thumb/{hash1}/{hash2}/{filename}/{size}px-{filename}.png
CARD_URLS = [
    ("01_GWANG", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Hwatu_January_Hikari.svg/500px-Hwatu_January_Hikari.svg.png"),
    ("01_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Hwatu_January_Tanzaku.svg/500px-Hwatu_January_Tanzaku.svg.png"),
    ("01_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Hwatu_January_Kasu_1.svg/500px-Hwatu_January_Kasu_1.svg.png"),
    ("01_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Hwatu_January_Kasu_2.svg/500px-Hwatu_January_Kasu_2.svg.png"),

    ("02_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Hwatu_February_Tane.svg/500px-Hwatu_February_Tane.svg.png"),
    ("02_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Hwatu_February_Tanzaku.svg/500px-Hwatu_February_Tanzaku.svg.png"),
    ("02_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Hwatu_February_Kasu_1.svg/500px-Hwatu_February_Kasu_1.svg.png"),
    ("02_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Hwatu_February_Kasu_2.svg/500px-Hwatu_February_Kasu_2.svg.png"),

    ("03_GWANG", "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hwatu_March_Hikari.svg/500px-Hwatu_March_Hikari.svg.png"),
    ("03_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Hwatu_March_Tanzaku.svg/500px-Hwatu_March_Tanzaku.svg.png"),
    ("03_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Hwatu_March_Kasu_1.svg/500px-Hwatu_March_Kasu_1.svg.png"),
    ("03_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Hwatu_March_Kasu_2.svg/500px-Hwatu_March_Kasu_2.svg.png"),

    ("04_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Hwatu_April_Tane.svg/500px-Hwatu_April_Tane.svg.png"),
    ("04_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Hwatu_April_Tanzaku.svg/500px-Hwatu_April_Tanzaku.svg.png"),
    ("04_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Hwatu_April_Kasu_1.svg/500px-Hwatu_April_Kasu_1.svg.png"),
    ("04_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Hwatu_April_Kasu_2.svg/500px-Hwatu_April_Kasu_2.svg.png"),

    ("05_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Hwatu_May_Tane.svg/500px-Hwatu_May_Tane.svg.png"),
    ("05_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Hwatu_May_Tanzaku.svg/500px-Hwatu_May_Tanzaku.svg.png"),
    ("05_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Hwatu_May_Kasu_1.svg/500px-Hwatu_May_Kasu_1.svg.png"),
    ("05_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Hwatu_May_Kasu_2.svg/500px-Hwatu_May_Kasu_2.svg.png"),

    ("06_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Hwatu_June_Tane.svg/500px-Hwatu_June_Tane.svg.png"),
    ("06_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Hwatu_June_Tanzaku.svg/500px-Hwatu_June_Tanzaku.svg.png"),
    ("06_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Hwatu_June_Kasu_1.svg/500px-Hwatu_June_Kasu_1.svg.png"),
    ("06_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Hwatu_June_Kasu_2.svg/500px-Hwatu_June_Kasu_2.svg.png"),

    ("07_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Hwatu_July_Tane.svg/500px-Hwatu_July_Tane.svg.png"),
    ("07_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Hwatu_July_Tanzaku.svg/500px-Hwatu_July_Tanzaku.svg.png"),
    ("07_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Hwatu_July_Kasu_1.svg/500px-Hwatu_July_Kasu_1.svg.png"),
    ("07_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Hwatu_July_Kasu_2.svg/500px-Hwatu_July_Kasu_2.svg.png"),

    ("08_GWANG", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Hwatu_August_Hikari.svg/500px-Hwatu_August_Hikari.svg.png"),
    ("08_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Hwatu_August_Tane.svg/500px-Hwatu_August_Tane.svg.png"),
    ("08_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Hwatu_August_Kasu_1.svg/500px-Hwatu_August_Kasu_1.svg.png"),
    ("08_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Hwatu_August_Kasu_2.svg/500px-Hwatu_August_Kasu_2.svg.png"),

    ("09_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Hwatu_September_Tane.svg/500px-Hwatu_September_Tane.svg.png"),
    ("09_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Hwatu_September_Tanzaku.svg/500px-Hwatu_September_Tanzaku.svg.png"),
    ("09_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Hwatu_September_Kasu_1.svg/500px-Hwatu_September_Kasu_1.svg.png"),
    ("09_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Hwatu_September_Kasu_2.svg/500px-Hwatu_September_Kasu_2.svg.png"),

    ("10_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Hwatu_October_Tane.svg/500px-Hwatu_October_Tane.svg.png"),
    ("10_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Hwatu_October_Tanzaku.svg/500px-Hwatu_October_Tanzaku.svg.png"),
    ("10_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Hwatu_October_Kasu_1.svg/500px-Hwatu_October_Kasu_1.svg.png"),
    ("10_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Hwatu_October_Kasu_2.svg/500px-Hwatu_October_Kasu_2.svg.png"),

    ("11_GWANG", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Hwatu_November_Hikari.svg/500px-Hwatu_November_Hikari.svg.png"),
    ("11_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Hwatu_November_Kasu_1.svg/500px-Hwatu_November_Kasu_1.svg.png"),
    ("11_PI_2",  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Hwatu_November_Kasu_2.svg/500px-Hwatu_November_Kasu_2.svg.png"),
    ("11_PI_3",  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Hwatu_November_Kasu_3.svg/500px-Hwatu_November_Kasu_3.svg.png"),

    ("12_GWANG", "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Hwatu_December_Hikari.svg/500px-Hwatu_December_Hikari.svg.png"),
    ("12_YUL",   "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Hwatu_December_Tane.svg/500px-Hwatu_December_Tane.svg.png"),
    ("12_TI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Hwatu_December_Tanzaku.svg/500px-Hwatu_December_Tanzaku.svg.png"),
    ("12_PI",    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Hwatu_December_Kasu.svg/500px-Hwatu_December_Kasu.svg.png"),
]


def make_card_frame(art: Image.Image, w=CARD_W, h=CARD_H) -> Image.Image:
    """화투 아트를 카드 모양 프레임에 배치 (흰 배경 + 둥근 모서리)"""
    # 흰 카드 배경
    card = Image.new("RGBA", (w, h), (255, 255, 255, 255))

    # 둥근 모서리 마스크
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w-1, h-1], radius=16, fill=255)
    card.putalpha(mask)

    # 아트 배치 (상하 여백 포함, 정사각형 유지)
    pad = int(w * 0.03)
    art_size = w - pad * 2
    resized = art.resize((art_size, art_size), Image.LANCZOS)
    top = int(h * 0.05)
    # 알파채널 처리
    if resized.mode == "RGBA":
        card.paste(resized, (pad, top), resized)
    else:
        card.paste(resized, (pad, top))

    # 검정 테두리
    border = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(border).rounded_rectangle(
        [1, 1, w-2, h-2], radius=16, outline=(40, 20, 5, 255), width=3)
    card = Image.alpha_composite(card, border)
    return card


def fetch(name: str, url: str) -> bool:
    png_path = os.path.join(OUTPUT_DIR, f"{name}.png")
    print(f"  [{name}] ...", end=" ", flush=True)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
    except Exception as e:
        print(f"실패 ({e})")
        return False

    try:
        art = Image.open(io.BytesIO(data)).convert("RGBA")
        card = make_card_frame(art)
        card.save(png_path, "PNG")
        print("✓")
        return True
    except Exception as e:
        print(f"변환 실패 ({e})")
        return False


def main():
    print("=== 위키미디어 화투 이미지 다운로드 (500px 썸네일) ===\n")
    ok = fail = 0
    for i, (name, url) in enumerate(CARD_URLS):
        if fetch(name, url):
            ok += 1
        else:
            fail += 1
        # 요청 사이 딜레이
        time.sleep(0.8 if i % 4 != 3 else 2.5)

    print(f"\n완료: {ok}/{ok+fail}장  →  {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

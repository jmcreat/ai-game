# download_cards.py
# 위키미디어 Commons에서 화투 SVG 이미지를 다운로드하고 PNG로 변환

import os
import urllib.request
import subprocess
import sys

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "assets", "cards")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 위키미디어 Commons SVG URL 목록 (48장 + 뒷면)
CARD_URLS = [
    # 1월 솔
    ("01_GWANG",   "https://upload.wikimedia.org/wikipedia/commons/9/9d/Hwatu_January_Hikari.svg"),
    ("01_TI",      "https://upload.wikimedia.org/wikipedia/commons/d/da/Hwatu_January_Tanzaku.svg"),
    ("01_PI",      "https://upload.wikimedia.org/wikipedia/commons/e/e1/Hwatu_January_Kasu_1.svg"),
    ("01_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/f/fe/Hwatu_January_Kasu_2.svg"),
    # 2월 매화
    ("02_YUL",     "https://upload.wikimedia.org/wikipedia/commons/0/03/Hwatu_February_Tane.svg"),
    ("02_TI",      "https://upload.wikimedia.org/wikipedia/commons/b/bd/Hwatu_February_Tanzaku.svg"),
    ("02_PI",      "https://upload.wikimedia.org/wikipedia/commons/e/e4/Hwatu_February_Kasu_1.svg"),
    ("02_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/3/31/Hwatu_February_Kasu_2.svg"),
    # 3월 벚꽃
    ("03_GWANG",   "https://upload.wikimedia.org/wikipedia/commons/9/93/Hwatu_March_Hikari.svg"),
    ("03_TI",      "https://upload.wikimedia.org/wikipedia/commons/f/f3/Hwatu_March_Tanzaku.svg"),
    ("03_PI",      "https://upload.wikimedia.org/wikipedia/commons/b/b1/Hwatu_March_Kasu_1.svg"),
    ("03_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/1/12/Hwatu_March_Kasu_2.svg"),
    # 4월 등나무
    ("04_YUL",     "https://upload.wikimedia.org/wikipedia/commons/e/e6/Hwatu_April_Tane.svg"),
    ("04_TI",      "https://upload.wikimedia.org/wikipedia/commons/7/75/Hwatu_April_Tanzaku.svg"),
    ("04_PI",      "https://upload.wikimedia.org/wikipedia/commons/0/00/Hwatu_April_Kasu_1.svg"),
    ("04_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/7/7c/Hwatu_April_Kasu_2.svg"),
    # 5월 창포
    ("05_YUL",     "https://upload.wikimedia.org/wikipedia/commons/7/7e/Hwatu_May_Tane.svg"),
    ("05_TI",      "https://upload.wikimedia.org/wikipedia/commons/0/0f/Hwatu_May_Tanzaku.svg"),
    ("05_PI",      "https://upload.wikimedia.org/wikipedia/commons/0/0e/Hwatu_May_Kasu_1.svg"),
    ("05_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/4/4b/Hwatu_May_Kasu_2.svg"),
    # 6월 모란
    ("06_YUL",     "https://upload.wikimedia.org/wikipedia/commons/e/e1/Hwatu_June_Tane.svg"),
    ("06_TI",      "https://upload.wikimedia.org/wikipedia/commons/f/fc/Hwatu_June_Tanzaku.svg"),
    ("06_PI",      "https://upload.wikimedia.org/wikipedia/commons/2/22/Hwatu_June_Kasu_1.svg"),
    ("06_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/9/93/Hwatu_June_Kasu_2.svg"),
    # 7월 홍싸리
    ("07_YUL",     "https://upload.wikimedia.org/wikipedia/commons/d/d5/Hwatu_July_Tane.svg"),
    ("07_TI",      "https://upload.wikimedia.org/wikipedia/commons/3/31/Hwatu_July_Tanzaku.svg"),
    ("07_PI",      "https://upload.wikimedia.org/wikipedia/commons/d/d9/Hwatu_July_Kasu_1.svg"),
    ("07_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/d/d4/Hwatu_July_Kasu_2.svg"),
    # 8월 억새
    ("08_GWANG",   "https://upload.wikimedia.org/wikipedia/commons/c/c6/Hwatu_August_Hikari.svg"),
    ("08_YUL",     "https://upload.wikimedia.org/wikipedia/commons/c/c7/Hwatu_August_Tane.svg"),
    ("08_PI",      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Hwatu_August_Kasu_1.svg"),
    ("08_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/6/68/Hwatu_August_Kasu_2.svg"),
    # 9월 국화
    ("09_YUL",     "https://upload.wikimedia.org/wikipedia/commons/c/c5/Hwatu_September_Tane.svg"),
    ("09_TI",      "https://upload.wikimedia.org/wikipedia/commons/4/4c/Hwatu_September_Tanzaku.svg"),
    ("09_PI",      "https://upload.wikimedia.org/wikipedia/commons/a/a9/Hwatu_September_Kasu_1.svg"),
    ("09_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/d/dd/Hwatu_September_Kasu_2.svg"),
    # 10월 단풍
    ("10_YUL",     "https://upload.wikimedia.org/wikipedia/commons/f/f0/Hwatu_October_Tane.svg"),
    ("10_TI",      "https://upload.wikimedia.org/wikipedia/commons/c/c0/Hwatu_October_Tanzaku.svg"),
    ("10_PI",      "https://upload.wikimedia.org/wikipedia/commons/0/08/Hwatu_October_Kasu_1.svg"),
    ("10_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/5/59/Hwatu_October_Kasu_2.svg"),
    # 11월 오동 (비광 없음, 피 3장)
    ("11_GWANG",   "https://upload.wikimedia.org/wikipedia/commons/d/d1/Hwatu_November_Hikari.svg"),
    ("11_PI",      "https://upload.wikimedia.org/wikipedia/commons/e/e6/Hwatu_November_Kasu_1.svg"),
    ("11_PI_2",    "https://upload.wikimedia.org/wikipedia/commons/0/0f/Hwatu_November_Kasu_2.svg"),
    ("11_PI_3",    "https://upload.wikimedia.org/wikipedia/commons/8/89/Hwatu_November_Kasu_3.svg"),
    # 12월 비
    ("12_GWANG",   "https://upload.wikimedia.org/wikipedia/commons/6/6b/Hwatu_December_Hikari.svg"),
    ("12_YUL",     "https://upload.wikimedia.org/wikipedia/commons/1/17/Hwatu_December_Tane.svg"),
    ("12_TI",      "https://upload.wikimedia.org/wikipedia/commons/1/19/Hwatu_December_Tanzaku.svg"),
    ("12_PI",      "https://upload.wikimedia.org/wikipedia/commons/6/61/Hwatu_December_Kasu.svg"),
]

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; hwatu-downloader/1.0)"}


def download_svg(name: str, url: str) -> str | None:
    """SVG 파일 다운로드. 경로 반환"""
    svg_path = os.path.join(OUTPUT_DIR, f"{name}.svg")
    if os.path.exists(svg_path):
        return svg_path
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        with open(svg_path, "wb") as f:
            f.write(data)
        return svg_path
    except Exception as e:
        print(f"  [오류] {name}: {e}")
        return None


def svg_to_png_cairosvg(svg_path: str, png_path: str, size: int = 200):
    import cairosvg
    cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=size, output_height=size)


def svg_to_png_inkscape(svg_path: str, png_path: str, size: int = 200):
    for cmd in ["inkscape", "/Applications/Inkscape.app/Contents/MacOS/inkscape"]:
        try:
            result = subprocess.run(
                [cmd, svg_path, f"--export-png={png_path}",
                 f"--export-width={size}", f"--export-height={size}"],
                capture_output=True, timeout=30
            )
            if result.returncode == 0:
                return True
        except FileNotFoundError:
            continue
        except Exception:
            continue
    return False


def svg_to_png_rsvg(svg_path: str, png_path: str, size: int = 200):
    try:
        result = subprocess.run(
            ["rsvg-convert", "-w", str(size), "-h", str(size), "-o", png_path, svg_path],
            capture_output=True, timeout=30
        )
        return result.returncode == 0
    except FileNotFoundError:
        return False


def svg_to_png_imagemagick(svg_path: str, png_path: str, size: int = 200):
    for cmd in ["convert", "magick"]:
        try:
            result = subprocess.run(
                [cmd, "-background", "none", "-resize", f"{size}x{size}",
                 svg_path, png_path],
                capture_output=True, timeout=30
            )
            if result.returncode == 0:
                return True
        except FileNotFoundError:
            continue
    return False


def svg_to_png(svg_path: str, png_path: str, size: int = 200) -> bool:
    """여러 방법으로 SVG → PNG 변환 시도"""
    # 1) cairosvg (pip install cairosvg)
    try:
        svg_to_png_cairosvg(svg_path, png_path, size)
        if os.path.exists(png_path):
            return True
    except ImportError:
        pass
    except Exception as e:
        print(f"    cairosvg 실패: {e}")

    # 2) rsvg-convert
    if svg_to_png_rsvg(svg_path, png_path, size):
        return True

    # 3) inkscape
    if svg_to_png_inkscape(svg_path, png_path, size):
        return True

    # 4) imagemagick
    if svg_to_png_imagemagick(svg_path, png_path, size):
        return True

    return False


def check_converter():
    """사용 가능한 SVG 변환기 확인"""
    try:
        import cairosvg
        print("  변환기: cairosvg ✓")
        return "cairosvg"
    except ImportError:
        pass
    for cmd in ["rsvg-convert", "inkscape", "convert", "magick"]:
        try:
            subprocess.run([cmd, "--version"], capture_output=True, timeout=5)
            print(f"  변환기: {cmd} ✓")
            return cmd
        except FileNotFoundError:
            continue
    return None


def main():
    print("=== 화투 이미지 다운로드 시작 ===\n")

    converter = check_converter()
    if not converter:
        print("cairosvg 가 없습니다. 설치 중...")
        subprocess.run([sys.executable, "-m", "pip", "install", "cairosvg"], check=True)
        converter = "cairosvg"

    ok = 0
    fail = 0
    for name, url in CARD_URLS:
        png_path = os.path.join(OUTPUT_DIR, f"{name}.png")
        if os.path.exists(png_path) and os.path.getsize(png_path) > 1000:
            print(f"  스킵(기존): {name}.png")
            ok += 1
            continue

        print(f"  다운로드: {name} ...", end=" ", flush=True)
        svg_path = download_svg(name, url)
        if not svg_path:
            fail += 1
            continue

        if svg_to_png(svg_path, png_path, size=232):
            print(f"변환 완료 ✓")
            ok += 1
        else:
            print(f"변환 실패 ✗")
            fail += 1

    print(f"\n완료: {ok}장 성공 / {fail}장 실패")
    print(f"저장 위치: {OUTPUT_DIR}")

    if fail > 0:
        print("\n변환 실패 카드는 기존 생성 이미지를 유지합니다.")


if __name__ == "__main__":
    main()

@echo off
chcp 65001 >nul
echo 고스톱 게임 시작 중...
pip install pygame >nul 2>&1
python main.py
if %errorlevel% neq 0 (
    echo.
    echo 오류 발생! Python이 설치되어 있는지 확인하세요.
    echo https://www.python.org/downloads/
    pause
)

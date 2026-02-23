#!/bin/bash
set -e

# === Silero TTS Studio — Installer ===

REPO="https://github.com/sanchousmutant/Silero-TTS-Studio.git"
DIR="Silero-TTS-Studio"

echo "============================================================"
echo "  Silero TTS Studio — Установка"
echo "============================================================"
echo ""

# Check Python
if ! command -v python3 &>/dev/null && ! command -v python &>/dev/null; then
    echo "ERROR: Python не найден. Установите Python 3.8+ и повторите."
    exit 1
fi

PYTHON=$(command -v python3 || command -v python)
echo "Python: $($PYTHON --version)"

# Check git
if ! command -v git &>/dev/null; then
    echo "ERROR: git не найден. Установите git и повторите."
    exit 1
fi

# Clone
if [ -d "$DIR" ]; then
    echo "Папка $DIR уже существует, обновляю..."
    cd "$DIR"
    git pull
else
    echo "Клонирование репозитория..."
    git clone "$REPO" "$DIR"
    cd "$DIR"
fi

echo ""
echo "Создание виртуального окружения..."
$PYTHON -m venv .venv

# Activate venv
if [ -f ".venv/Scripts/activate" ]; then
    source .venv/Scripts/activate    # Windows (Git Bash / MSYS)
else
    source .venv/bin/activate        # Linux / macOS
fi

echo "Установка зависимостей..."
pip install --upgrade pip -q
pip install flask numpy scipy torch silero-stress -q

echo ""
echo "============================================================"
echo "  Установка завершена!"
echo "============================================================"
echo ""
echo "  Запуск:  cd $DIR && python app.py"
echo "  Браузер: http://localhost:5000"
echo "============================================================"
echo ""

read -p "Запустить сейчас? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    python app.py
fi

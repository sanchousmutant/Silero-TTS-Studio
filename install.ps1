# === Silero TTS Studio — Installer (Windows) ===

$ErrorActionPreference = "Stop"
$REPO = "https://github.com/sanchousmutant/Silero-TTS-Studio.git"
$DIR = "Silero-TTS-Studio"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Silero TTS Studio — Установка" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
try {
    $pyVersion = python --version 2>&1
    Write-Host "Python: $pyVersion"
} catch {
    Write-Host "ERROR: Python не найден. Установите Python 3.8+ и повторите." -ForegroundColor Red
    exit 1
}

# Check git
try {
    git --version | Out-Null
} catch {
    Write-Host "ERROR: git не найден. Установите git и повторите." -ForegroundColor Red
    exit 1
}

# Clone
if (Test-Path $DIR) {
    Write-Host "Папка $DIR уже существует, обновляю..."
    Set-Location $DIR
    git pull
} else {
    Write-Host "Клонирование репозитория..."
    git clone $REPO $DIR
    Set-Location $DIR
}

Write-Host ""
Write-Host "Создание виртуального окружения..."
python -m venv .venv

# Activate venv
& .\.venv\Scripts\Activate.ps1

Write-Host "Установка зависимостей..."
pip install --upgrade pip -q
pip install flask numpy scipy torch silero-stress -q

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Установка завершена!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Запуск:  cd $DIR; python app.py"
Write-Host "  Браузер: http://localhost:5000"
Write-Host "============================================================"
Write-Host ""

$response = Read-Host "Запустить сейчас? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    python app.py
}

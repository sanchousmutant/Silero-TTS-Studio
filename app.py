import os
import sys
import io

# Принудительная установка UTF-8 для консоли Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import torch
import time
import uuid
import atexit
import numpy as np
import scipy.io.wavfile
from flask import Flask, request, jsonify, render_template, send_from_directory

# --- Инициализация Flask ---
app = Flask(__name__)
AUDIO_FOLDER = 'audio_files'
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# --- Функция очистки при выходе ---
def cleanup_audio_files():
    """Удаляет все аудиофайлы при завершении работы сервера."""
    print("\n" + "="*60)
    print("🧹 Запущена функция очистки...")
    
    files = os.listdir(AUDIO_FOLDER)
    if not files:
        print("Папка 'audio_files' пуста. Очистка не требуется.")
        print("="*60)
        return

    print(f"⚠️  ВНИМАНИЕ: Сервер останавливается.")
    print(f"   Все сгенерированные файлы ({len(files)} шт.) в папке '{AUDIO_FOLDER}' будут удалены через 10 секунд.")
    print("   Если вы хотите их сохранить, скопируйте их сейчас.")
    
    try:
        # Даем пользователю время на реакцию
        for i in range(10, 0, -1):
            sys.stdout.write(f"\r   Удаление через: {i} сек... ")
            sys.stdout.flush()
            time.sleep(1)
        sys.stdout.write("\r" + " "*30 + "\r") # Очистка строки таймера
    except KeyboardInterrupt:
        # Если пользователь прерывает ожидание, сразу начинаем удаление
        print("\nОжидание прервано. Начинаю удаление...")

    deleted_count = 0
    for filename in files:
        try:
            filepath = os.path.join(AUDIO_FOLDER, filename)
            # Пропускаем папки, если они вдруг появятся
            if os.path.isfile(filepath):
                os.remove(filepath)
                deleted_count += 1
        except Exception as e:
            print(f"   ❌ Не удалось удалить {filename}: {e}")

    print(f"✅ Очистка завершена. Удалено {deleted_count} файлов.")
    print("="*60)

# --- Конфигурация ---
AVAILABLE_SPEAKERS = ['aidar', 'baya', 'kseniya', 'xenia', 'eugene', 'random']
AVAILABLE_SPEEDS = ['x-slow', 'slow', 'medium', 'fast', 'x-fast']

# --- Глобальные переменные для моделей ---
accentor = None
tts_model = None
device = None

def init_models():
    """Инициализация моделей при запуске приложения."""
    global accentor, tts_model, device
    
    print("=" * 60)
    print("Инициализация моделей Silero TTS...")
    print("=" * 60)
    
    # 1. Загрузка модели для расстановки ударений
    try:
        from silero_stress import load_accentor
        print("📝 Загрузка модели расстановки ударений...")
        accentor = load_accentor()
        print("✅ Модель расстановки ударений загружена успешно!")
    except ImportError as e:
        print(f"⚠️  Не удалось импортировать 'silero_stress': {e}")
        print("   Установите пакет: pip install silero-stress")
        accentor = None
    except Exception as e:
        print(f"❌ Ошибка при загрузке модели ударений: {e}")
        accentor = None
    
    # 2. Загрузка TTS модели
    try:
        print("\n🔊 Загрузка TTS модели...")
        device = torch.device('cpu')
        
        # Используем правильный метод загрузки
        tts_model, _ = torch.hub.load(
            repo_or_dir='.',
            model='silero_tts',
            language='ru',
            speaker='v5_ru',
            source='local'
        )
        tts_model.to(device)
        
        print("✅ TTS модель загружена успешно!")
        
        # Проверка доступных дикторов
        if hasattr(tts_model, 'speakers'):
            print(f"📢 Доступные дикторы ({len(tts_model.speakers)}): {', '.join(tts_model.speakers)}")
        
    except Exception as e:
        print(f"❌ Ошибка при загрузке TTS модели: {e}")
        import traceback
        traceback.print_exc()
        tts_model = None
    
    print("=" * 60)
    print("Инициализация завершена!")
    print("=" * 60 + "\n")


# --- Маршруты API ---

@app.route('/')
def index():
    """Главная страница с веб-интерфейсом."""
    return render_template('index.html', speakers=AVAILABLE_SPEAKERS, speeds=AVAILABLE_SPEEDS)


@app.route('/add_stress', methods=['POST'])
def add_stress_route():
    """API для автоматической расстановки ударений в тексте."""
    try:
        if not accentor:
            return jsonify({
                "error": "Модель для расстановки ударений не загружена. Установите: pip install silero-stress"
            }), 500
        
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({"error": "Текст не может быть пустым."}), 400
        
        # Применяем модель расстановки ударений
        stressed_text = accentor(text)
        
        return jsonify({
            "success": True,
            "stressed_text": stressed_text
        })
    
    except Exception as e:
        print(f"Ошибка в /add_stress: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Ошибка при обработке текста: {str(e)}"}), 500


@app.route('/synthesize', methods=['POST'])
def synthesize():
    """API для генерации аудио из текста."""
    try:
        if not tts_model:
            return jsonify({
                "error": "TTS модель не загружена. Проверьте логи сервера."
            }), 500
        
        data = request.get_json()
        text = data.get('text', '').strip()
        speaker = data.get('speaker', 'xenia')
        speed = data.get('speed', 'medium')
        
        # Валидация
        if not text:
            return jsonify({"error": "Текст не может быть пустым."}), 400
        
        if speaker not in AVAILABLE_SPEAKERS:
            return jsonify({"error": f"Неизвестный диктор: {speaker}"}), 400
        
        if speed not in AVAILABLE_SPEEDS:
            return jsonify({"error": f"Неизвестная скорость: {speed}"}), 400
        
        # Проверка доступности диктора
        if hasattr(tts_model, 'speakers') and speaker not in tts_model.speakers:
            return jsonify({
                "error": f"Диктор '{speaker}' не найден. Доступны: {', '.join(tts_model.speakers)}"
            }), 400
        
        print(f"\n🎤 Генерация аудио: speaker={speaker}, speed={speed}, text_len={len(text)}")
        
        # Генерация аудио
        sample_rate = 48000
        
        if speed == 'medium':
            # Без SSML для средней скорости
            audio_tensor = tts_model.apply_tts(
                text=text,
                speaker=speaker,
                sample_rate=sample_rate
            )
        else:
            # С SSML для других скоростей
            ssml_text = f'<speak><prosody rate="{speed}">{text}</prosody></speak>'
            audio_tensor = tts_model.apply_tts(
                ssml_text=ssml_text,
                speaker=speaker,
                sample_rate=sample_rate
            )
        
        # Конвертация в numpy и сохранение
        audio_np = audio_tensor.numpy()
        audio_int16 = (audio_np * 32767).astype(np.int16)
        
        # Генерация уникального имени файла
        timestamp = int(time.time())
        unique_id = str(uuid.uuid4())[:8]
        filename = f"tts_{speaker}_{speed}_{timestamp}_{unique_id}.wav"
        filepath = os.path.join(AUDIO_FOLDER, filename)
        
        # Сохранение WAV файла
        scipy.io.wavfile.write(filepath, sample_rate, audio_int16)
        
        print(f"✅ Аудио сохранено: {filename}")
        
        return jsonify({
            "success": True,
            "filename": filename,
            "audio_url": f"/audio/{filename}"
        })
    
    except Exception as e:
        print(f"Ошибка в /synthesize: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Ошибка при генерации аудио: {str(e)}"}), 500


@app.route('/audio/<filename>')
def serve_audio(filename):
    """Раздача аудио файлов."""
    try:
        return send_from_directory(AUDIO_FOLDER, filename)
    except Exception as e:
        print(f"Ошибка при отправке файла {filename}: {e}")
        return jsonify({"error": "Файл не найден"}), 404


@app.route('/delete_audio', methods=['POST'])
def delete_audio():
    """API для удаления аудио файла."""
    try:
        data = request.get_json()
        filename = data.get('filename', '').strip()
        
        if not filename:
            return jsonify({"error": "Имя файла не указано."}), 400
        
        # Безопасность: проверяем, что файл в нужной директории
        filepath = os.path.join(AUDIO_FOLDER, filename)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "Файл не найден."}), 404
        
        # Проверка на path traversal
        if not os.path.abspath(filepath).startswith(os.path.abspath(AUDIO_FOLDER)):
            return jsonify({"error": "Недопустимое имя файла."}), 400
        
        os.remove(filepath)
        print(f"🗑️  Файл удален: {filename}")
        
        return jsonify({
            "success": True,
            "message": f"Файл {filename} успешно удален."
        })
    
    except Exception as e:
        print(f"Ошибка в /delete_audio: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Ошибка при удалении файла: {str(e)}"}), 500


# --- Запуск приложения ---

if __name__ == '__main__':
    # Регистрация функции очистки при выходе
    atexit.register(cleanup_audio_files)

    # Инициализация моделей при запуске
    init_models()
    
    # Запуск Flask сервера
    print("\n🚀 Запуск Flask сервера...")
    print("📍 Откройте в браузере: http://localhost:5000")
    print("Ctrl+C чтобы остановить сервер и очистить аудиофайлы.")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
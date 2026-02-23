document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const stressedText = document.getElementById('stressed-text');
    const addStressBtn = document.getElementById('add-stress-btn');
    const generateBtn = document.getElementById('generate-btn');
    const loader = document.getElementById('loader');
    const audioHistory = document.getElementById('audio-history');
    const audioList = document.getElementById('audio-list');
    const speakerOptionsDiv = document.getElementById('speaker-options');
    const inputCounter = document.getElementById('input-counter');
    const stressedCounter = document.getElementById('stressed-counter');

    // === Динамическое создание кнопок выбора диктора ===
    // Используем только дикторов, которые работают с моделью ru_v3
    const speakers = ['aidar', 'baya', 'kseniya', 'xenia', 'eugene', 'random'];
    const speakerNames = {
        'aidar': 'Айдар 👨',
        'baya': 'Бая 👩',
        'kseniya': 'Ксения V1 👩',
        'xenia': 'Ксения V2 👩',
        'eugene': 'Женя 👨‍🦰',
        'random': '🎲 Случайный'
    };

    speakers.forEach((speaker, index) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'speaker';
        input.value = speaker;
        if (index === 3) { // 'xenia' по умолчанию
            input.checked = true;
        }

        const span = document.createElement('span');
        span.textContent = speakerNames[speaker] || speaker;

        label.appendChild(input);
        label.appendChild(span);
        speakerOptionsDiv.appendChild(label);
    });

    // === Счетчики символов ===
    function updateCharCounter(textarea, counter) {
        const length = textarea.value.length;
        counter.textContent = `${length} / 5000`;

        if (length > 4500) {
            counter.style.color = '#f45c43';
        } else {
            counter.style.color = '#718096';
        }
    }

    textInput.addEventListener('input', () => updateCharCounter(textInput, inputCounter));
    stressedText.addEventListener('input', () => updateCharCounter(stressedText, stressedCounter));

    // === Toast notifications ===
    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            'success': '✅',
            'error': '❌',
            'info': 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Автоматическое удаление через 4 секунды
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.4s ease reverse';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // === Обработчик: Поставить ударения ===
    addStressBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text) {
            showToast('Пожалуйста, введите текст', 'error');
            return;
        }

        addStressBtn.disabled = true;
        addStressBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Обработка...</span>';

        try {
            const response = await fetch('/add_stress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            stressedText.value = data.stressed_text;
            updateCharCounter(stressedText, stressedCounter);
            showToast('Ударения успешно расставлены!', 'success');
        } catch (error) {
            showToast(`Ошибка: ${error.message}`, 'error');
            console.error('Error in add_stress:', error);
        } finally {
            addStressBtn.disabled = false;
            addStressBtn.innerHTML = '<span class="btn-icon">✨</span><span>Поставить ударения</span>';
        }
    });

    // === Обработчик: Сгенерировать аудио ===
    generateBtn.addEventListener('click', async () => {
        let textToSynthesize = stressedText.value.trim();
        if (!textToSynthesize) {
            textToSynthesize = textInput.value.trim();
        }
        if (!textToSynthesize) {
            showToast('Введите текст в одно из полей', 'error');
            return;
        }

        const speaker = document.querySelector('input[name="speaker"]:checked').value;
        const speed = document.querySelector('input[name="speed"]:checked').value;

        showLoader(true);

        try {
            const response = await fetch('/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSynthesize, speaker, speed }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Ошибка сервера: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Добавляем новое аудио в историю
            addAudioToHistory(data.filename, data.audio_url, speaker, speed, textToSynthesize);
            showToast('Аудио успешно сгенерировано!', 'success');

        } catch (error) {
            showToast(`Ошибка генерации: ${error.message}`, 'error');
            console.error('Error in synthesize:', error);
        } finally {
            showLoader(false);
        }
    });

    // === Предупреждение перед закрытием страницы (только если есть результат) ===
    let hasGeneratedFiles = false;

    window.addEventListener('beforeunload', function (e) {
        // Показываем предупреждение только если пользователь сгенерировал аудио
        if (hasGeneratedFiles) {
            const message = 'Вы уверены, что хотите покинуть страницу? Закрытие этой вкладки не остановит сервер. Файлы будут удалены только при остановке консольного приложения (черного окна).';
            e.returnValue = message; // для большинства браузеров
            return message;          // для старых браузеров
        }
    });

    // === Добавление аудио в историю ===
    function addAudioToHistory(filename, audioUrl, speaker, speed, text) {
        // Устанавливаем флаг, что пользователь получил результат
        hasGeneratedFiles = true;

        // Показываем секцию истории
        audioHistory.style.display = 'block';

        // Получаем имя диктора
        const speakerName = speakerNames[speaker] || speaker;

        // Обрезаем текст для превью
        const previewText = text.length > 50 ? text.substring(0, 50) + '...' : text;

        // Создаем элемент аудио
        const audioItem = document.createElement('div');
        audioItem.className = 'audio-item';
        audioItem.dataset.filename = filename;
        audioItem.innerHTML = `
            <div class="audio-item-header">
                <span class="audio-item-speaker">${speakerName}</span>
                <span class="audio-item-speed">Скорость: ${speed}</span>
            </div>
            <div class="audio-item-text">${previewText}</div>
            <audio controls src="${audioUrl}"></audio>
            <div class="audio-item-controls">
                <a class="btn btn-success btn-sm" href="${audioUrl}" download="${filename}">
                    <span class="btn-icon">⬇️</span>
                    <span>Скачать</span>
                </a>
                <button class="btn btn-danger btn-sm delete-audio-btn" data-filename="${filename}">
                    <span class="btn-icon">🗑️</span>
                    <span>Удалить</span>
                </button>
            </div>
        `;

        // Добавляем в начало списка
        audioList.insertBefore(audioItem, audioList.firstChild);

        // Прокрутка к новому элементу
        audioItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Обработчик удаления
        const deleteBtn = audioItem.querySelector('.delete-audio-btn');
        deleteBtn.addEventListener('click', () => deleteAudioItem(filename, audioItem));
    }

    // === Удаление аудио из истории ===
    async function deleteAudioItem(filename, audioItem) {
        const deleteBtn = audioItem.querySelector('.delete-audio-btn');
        deleteBtn.disabled = true;

        try {
            const response = await fetch('/delete_audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename }),
            });

            const data = await response.json();

            if (data.success) {
                audioItem.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    audioItem.remove();
                    // Скрываем секцию, если нет аудио
                    if (audioList.children.length === 0) {
                        audioHistory.style.display = 'none';
                    }
                }, 300);
                showToast('Аудио файл удален', 'success');
            } else {
                throw new Error(data.error || 'Не удалось удалить файл');
            }
        } catch (error) {
            showToast(`Ошибка удаления: ${error.message}`, 'error');
            console.error('Error in delete_audio:', error);
            deleteBtn.disabled = false;
        }
    }

    // === Вспомогательные функции ===
    function showLoader(show) {
        loader.style.display = show ? 'flex' : 'none';
        generateBtn.disabled = show;

        if (show) {
            generateBtn.innerHTML = '<span class="btn-icon">⏳</span><span>Генерация...</span>';
        } else {
            generateBtn.innerHTML = '<span class="btn-icon">🎵</span><span>Сгенерировать аудио</span>';
        }
    }

    // === Автосохранение в localStorage ===
    const STORAGE_KEY = 'silero_tts_draft';

    function saveDraft() {
        const draft = {
            text: textInput.value,
            stressedText: stressedText.value,
            speaker: document.querySelector('input[name="speaker"]:checked')?.value,
            speed: document.querySelector('input[name="speed"]:checked')?.value
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }

    function loadDraft() {
        try {
            const draft = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (draft) {
                if (draft.text) {
                    textInput.value = draft.text;
                    updateCharCounter(textInput, inputCounter);
                }
                if (draft.stressedText) {
                    stressedText.value = draft.stressedText;
                    updateCharCounter(stressedText, stressedCounter);
                }
                if (draft.speaker) {
                    const speakerRadio = document.querySelector(`input[name="speaker"][value="${draft.speaker}"]`);
                    if (speakerRadio) speakerRadio.checked = true;
                }
                if (draft.speed) {
                    const speedRadio = document.querySelector(`input[name="speed"][value="${draft.speed}"]`);
                    if (speedRadio) speedRadio.checked = true;
                }
            }
        } catch (e) {
            console.error('Error loading draft:', e);
        }
    }

    // Загрузить черновик при запуске
    loadDraft();

    // Автосохранение при изменении
    textInput.addEventListener('input', saveDraft);
    stressedText.addEventListener('input', saveDraft);

    document.querySelectorAll('input[name="speaker"]').forEach(radio => {
        radio.addEventListener('change', saveDraft);
    });

    document.querySelectorAll('input[name="speed"]').forEach(radio => {
        radio.addEventListener('change', saveDraft);
    });

    // === Клавиатурные shortcuts ===
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter для генерации
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            generateBtn.click();
        }

        // Ctrl+Shift+S для расстановки ударений
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            addStressBtn.click();
        }
    });

    // === Инициализация счетчиков ===
    updateCharCounter(textInput, inputCounter);
    updateCharCounter(stressedText, stressedCounter);

    // === Предупреждение перед закрытием страницы ===
    window.addEventListener('beforeunload', function (e) {
        // Стандартный способ показать диалог подтверждения
        const message = 'Вы уверены, что хотите покинуть страницу? Закрытие этой вкладки не остановит сервер. Файлы будут удалены только при остановке консольного приложения (черного окна).';
        e.returnValue = message; // для большинства браузеров
        return message;          // для старых браузеров
    });

    console.log('🎉 Silero TTS Studio загружен!');
    console.log('💡 Shortcuts: Ctrl+Enter - генерация, Ctrl+Shift+S - ударения');
});

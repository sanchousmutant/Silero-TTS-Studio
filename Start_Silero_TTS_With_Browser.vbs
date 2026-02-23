Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' ѕуть к проекту
projectPath = "E:\Project\silero"

'  оманда дл€ запуска. ”станавливаем переменные окружени€ и кодовую страницу.
Dim runCommand
runCommand = "cmd /k ""cd /d """ & projectPath & """ && title Silero TTS Studio (Diagnostic) && chcp 65001 > nul && set PYTHONIOENCODING=utf-8 && set PYTHONLEGACYWINDOWSSTDIO=utf-8 && echo ============================================================ && echo. && echo    Silero TTS Studio - Server Starting... && echo. && echo ============================================================ && echo. && echo URL: http://localhost:5000 && echo. && echo To stop, close this window. && echo. && echo ============================================================ && echo. && python app.py"""

' «апуск сервера в новом окне командной строки
WshShell.Run runCommand, 1, False

' ∆дем 5 секунд, чтобы сервер успел запуститьс€
WScript.Sleep 5000

' ќткрываем браузер
WshShell.Run "http://localhost:5000"

' —ообщение дл€ пользовател€. VBScript использует системную кодировку (ANSI).
MsgBox "Silero TTS Studio запущен!" & vbCrLf & vbCrLf & _
       "—ервер: http://localhost:5000" & vbCrLf & _
       "Ѕраузер откроетс€ автоматически." & vbCrLf & vbCrLf & _
       "ƒл€ остановки сервера просто закройте черное окно консоли.", _
       vbInformation, "Silero TTS Studio"

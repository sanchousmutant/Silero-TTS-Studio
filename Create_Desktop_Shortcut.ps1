# PowerShell script to create Silero TTS Studio desktop shortcut

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Creating Silero TTS Studio Desktop Shortcut" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Desktop path
$DesktopPath = [Environment]::GetFolderPath("Desktop")

# Target VBS script path
$TargetPath = "E:\Project\silero\Start_Silero_TTS_With_Browser.vbs"

# Shortcut name
$ShortcutName = "Silero TTS Studio.lnk"

# Full shortcut path
$ShortcutPath = Join-Path $DesktopPath $ShortcutName

# Create WScript.Shell object
$WshShell = New-Object -ComObject WScript.Shell

# Create shortcut
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = "E:\Project\silero"
$Shortcut.Description = "Launch Silero TTS Studio - Russian Speech Synthesis"
$Shortcut.WindowStyle = 1  # Normal window

# Set icon (microphone from system icons)
$Shortcut.IconLocation = "%SystemRoot%\System32\shell32.dll,43"

# Save shortcut
$Shortcut.Save()

Write-Host "Success! Shortcut created!" -ForegroundColor Green
Write-Host ""
Write-Host "Location: $ShortcutPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "You can now launch the app from desktop!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Ask to launch now
$response = Read-Host "Launch application now? (Y/N)"
if ($response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "Starting Silero TTS Studio..." -ForegroundColor Cyan
    Start-Process $TargetPath
}
else {
    Write-Host ""
    Write-Host "Done! Use desktop shortcut to launch." -ForegroundColor Green
}

Write-Host ""
Read-Host "Press Enter to exit"

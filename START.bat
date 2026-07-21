@echo off
title HyMupen — Smart Irrigation Platform
color 0A

echo.
echo  ████████████████████████████████████████████████
echo  █                                              █
echo  █   HyMupen — Smart Irrigation Platform       █
echo  █   Universitas Trunojoyo Madura - 2025       █
echo  █                                              █
echo  ████████████████████████████████████████████████
echo.

:: ── Cek Python tersedia
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python tidak ditemukan!
    echo.
    echo Silakan install Python 3.10+ dari https://python.org
    echo Pastikan centang "Add Python to PATH" saat install.
    echo.
    pause
    exit /b 1
)

:: ── Install dependencies jika belum
echo [1/3] Mengecek dependencies...
pip show fastapi >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/3] Menginstall dependencies (sekali saja)...
    pip install -r backend\requirements.txt -q
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal install dependencies!
        pause
        exit /b 1
    )
)
echo [1/3] Dependencies OK

:: ── Jalankan backend di background
echo [2/3] Menjalankan backend server...
start "HyMupen Backend" /min cmd /c "cd backend && python server.py"

:: ── Tunggu backend ready
echo [2/3] Menunggu backend siap...
timeout /t 3 /nobreak >nul

:: ── Cek apakah backend berhasil jalan
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 (
    :: curl tidak tersedia, coba PowerShell
    powershell -command "try { Invoke-WebRequest http://localhost:8000/health -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARNING] Backend mungkin belum siap — akan dicoba lagi oleh browser
    )
)
echo [2/3] Backend siap di http://localhost:8000

:: ── Buka browser ke frontend
echo [3/3] Membuka aplikasi di browser...
timeout /t 1 /nobreak >nul

:: Coba buka dengan berbagai browser
where chrome >nul 2>&1
if %errorlevel% equ 0 (
    start chrome "frontend\index.html"
    goto :opened
)

where msedge >nul 2>&1
if %errorlevel% equ 0 (
    start msedge "frontend\index.html"
    goto :opened
)

:: Fallback: buka dengan default browser
start "" "frontend\index.html"

:opened
echo.
echo ════════════════════════════════════════════════
echo   Aplikasi berhasil dibuka!
echo.
echo   Frontend : frontend\index.html (di browser)
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo.
echo   Indikator koneksi:
echo   🟢 Live      = Backend terhubung, data real-time
echo   🟡 Simulasi  = Backend offline, data simulasi
echo.
echo   Tutup jendela ini untuk menghentikan backend.
echo ════════════════════════════════════════════════
echo.
pause

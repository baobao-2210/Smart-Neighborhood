@echo off
title Smart Neighborhood - May ao, Backend & Supabase
echo [1/4] Kiem tra va khoi dong Backend NestJS (cong 3000 - Supabase)...
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if errorlevel 1 (
    start "Backend NestJS (Supabase)" cmd /k "cd /d "%~dp0" && pnpm --filter backend start:dev"
) else (
    echo Backend da chay san o cong 3000.
)

echo [2/4] Dang mo may ao Android Medium_Phone...
start "" "%LOCALAPPDATA%\Android\Sdk\emulator\emulator.exe" -avd Medium_Phone

echo [3/4] Dang khoi dong Expo Metro Bundler (cong 8081)...
start "Expo Metro Bundler" cmd /k "cd /d "%~dp0apps\mobile" && npx expo start --port 8081"

echo [4/4] Dang cho may ao khoi dong xong...
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" wait-for-device
:waitboot
for /f "delims=" %%i in ('"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" shell getprop sys.boot_completed 2^>nul') do set BOOT=%%i
if not "%BOOT%"=="1" (
    timeout /t 2 /nobreak >nul
    goto waitboot
)

echo Ket noi cong 8081 (Expo) va cong 3000 (Backend Supabase)...
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" reverse tcp:3000 tcp:3000
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" shell monkey -p host.exp.exponent -c android.intent.category.LAUNCHER 1 >nul 2>&1
timeout /t 3 /nobreak >nul
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081"

echo Hoan tat! Mobile App tren may ao dang ket noi thang toi Backend + Supabase.
timeout /t 5 >nul

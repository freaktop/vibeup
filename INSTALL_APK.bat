@echo off
echo ============================================
echo VibeUp APK Installation Helper
echo ============================================
echo.

set APK_PATH=%~dp0android\app\build\outputs\apk\debug\app-debug.apk

if not exist "%APK_PATH%" (
    echo ERROR: APK file not found!
    echo Expected location: %APK_PATH%
    pause
    exit /b 1
)

echo APK found: %APK_PATH%
echo.
echo Checking for connected Android device...
echo.

adb devices

echo.
echo ============================================
echo Installation Options:
echo ============================================
echo.
echo 1. Try automatic install via ADB
echo 2. Open folder with APK file (for manual copy)
echo 3. Copy APK to Desktop (for easy access)
echo.
set /p choice="Choose option (1, 2, or 3): "

if "%choice%"=="1" (
    echo.
    echo Attempting to install via ADB...
    adb install -r "%APK_PATH%"
    if %errorlevel%==0 (
        echo.
        echo SUCCESS! App installed!
        adb shell am start -n com.perezcode.vibeup/.MainActivity
    ) else (
        echo.
        echo FAILED: Device not detected or permission denied.
        echo Please check:
        echo - USB cable is connected
        echo - USB Debugging is enabled on phone
        echo - You allowed USB debugging on phone
        echo.
        echo Opening folder for manual installation...
        explorer /select,"%APK_PATH%"
    )
) else if "%choice%"=="2" (
    explorer /select,"%APK_PATH%"
    echo.
    echo Folder opened! Copy the APK file to your phone.
) else if "%choice%"=="3" (
    copy "%APK_PATH%" "%USERPROFILE%\Desktop\VibeUp-App.apk"
    echo.
    echo APK copied to Desktop as "VibeUp-App.apk"
    echo You can now easily transfer it to your phone.
    explorer "%USERPROFILE%\Desktop"
) else (
    echo Invalid choice.
)

echo.
pause

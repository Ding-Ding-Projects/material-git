@echo off
setlocal
cd /d "%~dp0"
set "BOOT_SILENT="
set "BOOT_RUN="
if "%SILENT%"=="1" set "BOOT_SILENT=-Silent"
if "%RUN_AFTER_BUILD%"=="1" set "BOOT_RUN=-Run"
:parse
if "%~1"=="" goto execute
if /I "%~1"=="/s" set "BOOT_SILENT=-Silent"
if /I "%~1"=="--silent" set "BOOT_SILENT=-Silent"
if /I "%~1"=="/run" set "BOOT_RUN=-Run"
if /I "%~1"=="--run" set "BOOT_RUN=-Run"
shift
goto parse
:execute
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\bootstrap.ps1" -Action build %BOOT_SILENT% %BOOT_RUN%
exit /b %errorlevel%

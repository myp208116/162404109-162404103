@echo off
setlocal
set "SHIGUANG_CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%SHIGUANG_CHROME%" goto launch
set "SHIGUANG_CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%SHIGUANG_CHROME%" goto launch
set "SHIGUANG_CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%SHIGUANG_CHROME%" goto launch
echo Google Chrome was not found in the usual locations.
echo Right-click index.html and choose Open with Google Chrome.
pause
exit /b 1
:launch
start "" "%SHIGUANG_CHROME%" "%~dp0index.html"
endlocal

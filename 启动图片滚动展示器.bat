@echo off
chcp 65001 >nul
title 图片滚动展示器启动器
color 0A

echo.
echo ========================================
echo           图片滚动展示器启动器
echo ========================================
echo.
echo 正在启动图片滚动展示器...
echo.

:: 检查默认浏览器
set "browser="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "browser=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "browser=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "browser=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "browser=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Internet Explorer\iexplore.exe" (
    set "browser=%ProgramFiles%\Internet Explorer\iexplore.exe"
) else if exist "%ProgramFiles(x86)%\Internet Explorer\iexplore.exe" (
    set "browser=%ProgramFiles(x86)%\Internet Explorer\iexplore.exe"
)

if defined browser (
    echo 检测到浏览器: %browser%
    echo.
    echo 请选择启动模式:
    echo 1. 普通模式 (推荐)
    echo 2. 全屏模式 (适合电视播放)
    echo 3. 退出
    echo.
    set /p choice="请输入选择 (1-3): "
    
    if "%choice%"=="1" (
        echo 正在启动普通模式...
        start "" "%browser%" "%~dp0index.html"
    ) else if "%choice%"=="2" (
        echo 正在启动全屏模式...
        start "" "%browser%" "%~dp0fullscreen.html"
    ) else if "%choice%"=="3" (
        echo 退出程序...
        goto :eof
    ) else (
        echo 无效选择，启动默认模式...
        start "" "%browser%" "%~dp0index.html"
    )
) else (
    echo 未检测到支持的浏览器，尝试使用系统默认浏览器打开...
    start "" "%~dp0index.html"
)

echo.
echo 图片滚动展示器已启动！
echo.
echo 使用说明:
echo - 点击"选择图片"按钮选择要展示的图片
echo - 使用播放/暂停按钮控制滚动
echo - 调节滑块改变滚动速度
echo - 点击图片切换滚动方向
echo.
echo 按任意键退出...
pause >nul

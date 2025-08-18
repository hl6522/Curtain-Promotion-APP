@echo off
chcp 65001 >nul
title WHL窗帘移动版启动器

echo.
echo ========================================
echo        WHL窗帘移动版应用启动器
echo ========================================
echo.
echo 正在启动移动版应用...
echo.

:: 检查文件是否存在
if not exist "mobile.html" (
    echo 错误：找不到 mobile.html 文件！
    echo 请确保文件在当前目录中。
    pause
    exit /b 1
)

:: 启动移动版应用
echo 启动移动版主页面...
start "" "mobile.html"

echo.
echo 移动版应用已启动！
echo.
echo 功能说明：
echo - 产品目录浏览
echo - 幻灯片播放
echo - 背景音乐
echo - 投屏到电视
echo.
echo 提示：在手机浏览器中访问可获得最佳体验
echo.

:: 等待用户确认
pause

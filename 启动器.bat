@echo off
chcp 65001 >nul
title 窗帘布艺展示器启动器
color 0A

echo.
echo  ========================================
echo  🏠 窗帘布艺展示器启动器
echo  ========================================
echo.
echo  请选择要打开的页面：
echo.
echo  1. 📚 打开目录选择页面 (推荐)
echo      - 浏览所有窗帘布艺分类
echo      - 支持单个、类别、全部播放
echo      - 适合电视展示和客户浏览
echo.
echo  2. 🎬 直接进入播放页面
echo      - 快速进入图片滚动播放
echo      - 需要手动选择图片文件
echo.
echo  3. 📖 打开普通模式页面
echo      - 适合电脑端使用
echo      - 包含完整控制界面
echo.
echo  4. ❌ 退出
echo.
echo  ========================================
echo.

:choice
set /p choice=请输入选择 (1-4): 

if "%choice%"=="1" goto catalog
if "%choice%"=="2" goto player
if "%choice%"=="3" goto normal
if "%choice%"=="4" goto exit
echo 无效选择，请重新输入
goto choice

:catalog
echo.
echo 🚀 正在打开目录选择页面...
start catalog.html
echo ✅ 目录页面已打开！
echo.
echo 💡 提示：
echo    - 在目录页面选择您喜欢的窗帘布艺
echo    - 支持单个播放、类别播放和全部播放
echo    - 每个项目会显示3秒标题，然后自动跳转
echo.
pause
goto exit

:player
echo.
echo 🚀 正在打开播放页面...
start fullscreen.html
echo ✅ 播放页面已打开！
echo.
echo 💡 提示：
echo    - 点击"选择图片"按钮选择要展示的图片
echo    - 使用播放控制按钮开始滚动展示
echo    - 支持背景音乐和拖拽控制
echo.
pause
goto exit

:normal
echo.
echo 🚀 正在打开普通模式页面...
start index.html
echo ✅ 普通模式页面已打开！
echo.
echo 💡 提示：
echo    - 适合电脑端使用
echo    - 包含完整的控制界面
echo    - 支持图片滚动、背景音乐等功能
echo.
pause
goto exit

:exit
echo.
echo 👋 感谢使用窗帘布艺展示器！
echo.
pause
exit

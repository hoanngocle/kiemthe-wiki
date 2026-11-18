@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Hay cai Node.js 22.18 tro len.
  pause
  exit /b 1
)
if not exist "node_modules\next\dist\bin\next" (
  echo Chua co thu vien. Hay chay npm install trong thu muc admin.
  pause
  exit /b 1
)
if not exist ".next\BUILD_ID" (
  echo Dang build trang quan tri...
  call npm run build
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo.
echo Mo http://kiemthe.bee.
echo Giu cua so nay de su dung trang quan tri. Ctrl+C de dong.
call npm start
if errorlevel 1 pause

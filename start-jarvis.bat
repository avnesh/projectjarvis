@echo off
echo �� Starting Jarvis AI Platform...

REM Check if MongoDB is running
echo 📊 Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo ⚠️  MongoDB is not running. Please start MongoDB first:
    echo    - Start MongoDB service
    echo    - Or use MongoDB Atlas (cloud) and update your .env file
    echo.
    pause
)

REM Install server dependencies
echo 📦 Installing server dependencies...
cd server
call npm install

REM Install client dependencies
echo 📦 Installing client dependencies...
cd ..\client
call npm install

REM Start server
echo 🔧 Starting server...
cd ..\server
start "Jarvis Server" npm start

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

REM Start client
echo 🌐 Starting client...
cd ..\client
npm run dev

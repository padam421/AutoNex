@echo off
title PROJECT KAVACH — 24/7 Autonomous Rail Operating System
color 0A
echo =========================================================================
echo             PROJECT KAVACH — 24/7 RAG & CLOSED-LOOP RAILWAY ENGINE
echo =========================================================================
echo.

echo [1/3] Starting 24/7 KAVACH Python RAG & Physics Microservice (Port 8000)...
start "Kavach RAG Microservice" cmd /k "title Kavach RAG Service (Port 8000) && cd /d "%~dp0" && python -m uvicorn rag_engine.app:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting PROJECT-KAVACH Express API Gateway & Proxy (Port 5000)...
start "Kavach Express Gateway" cmd /k "title Kavach Express Gateway (Port 5000) && cd /d "%~dp0" && node backend/src/app.js"

echo [3/3] Opening Project Kavach Live Command Dashboard...
timeout /t 3 /nobreak >nul
start "" "http://localhost:5000/pages/dashboard.html"

echo.
echo =========================================================================
echo  Express API Gateway:     http://localhost:5000/health
echo  Kavach RAG Microservice: http://localhost:8000/api/v1/health
echo  Live Command Dashboard:  http://localhost:5000/pages/dashboard.html
echo =========================================================================
echo.
pause

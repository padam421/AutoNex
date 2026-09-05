@echo off
title PROJECT KAVACH — 24/7 Autonomous Rail Operating System
color 0A
echo =========================================================================
echo             PROJECT KAVACH — 24/7 RAG & CLOSED-LOOP RAILWAY ENGINE
echo =========================================================================
echo.
echo [1/2] Starting 24/7 KAVACH RAG & Deterministic Physics Microservice (Port 8000)...
start "Kavach RAG Microservice" cmd /k "title Kavach RAG Service (Port 8000) && cd /d "%~dp0" && python -m uvicorn rag_engine.app:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Opening Project Kavach Website Dashboard...
timeout /t 2 /nobreak >nul
start "" "%~dp0frontend\src\pages\dashboard.html"

echo.
echo =========================================================================
echo  Kavach RAG Microservice:  http://localhost:8000/api/v1/health
echo  Cloudflare Tunnel URL:    https://operated-range-job-oxide.trycloudflare.com
echo  Website Dashboard:        frontend/src/pages/dashboard.html
echo =========================================================================
echo.
pause

@echo off
REM Meta Authentication Debug Helper Script
REM This script helps you debug the authentication flow

echo ========================================
echo Meta Authentication Debug Helper
echo ========================================
echo.

:menu
echo.
echo Choose a debug action:
echo.
echo [1] Clear tokens and start fresh
echo [2] View current tokens
echo [3] Test auth endpoint
echo [4] Test callback endpoint
echo [5] Validate current token with Facebook
echo [6] Check token permissions
echo [7] List Facebook Pages
echo [8] View environment variables
echo [9] Open browser to localhost:3000
echo [0] Exit
echo.
set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" goto clear_tokens
if "%choice%"=="2" goto view_tokens
if "%choice%"=="3" goto test_auth
if "%choice%"=="4" goto test_callback
if "%choice%"=="5" goto validate_token
if "%choice%"=="6" goto check_permissions
if "%choice%"=="7" goto list_pages
if "%choice%"=="8" goto view_env
if "%choice%"=="9" goto open_browser
if "%choice%"=="0" goto end
goto menu

:clear_tokens
echo.
echo Clearing tokens...
echo {} > data\tokens.json
echo ✓ Tokens cleared! File now contains: {}
goto menu

:view_tokens
echo.
echo Current tokens:
echo ----------------------------------------
type data\tokens.json
echo.
echo ----------------------------------------
goto menu

:test_auth
echo.
echo Testing auth endpoint...
echo ----------------------------------------
curl.exe -I http://localhost:3000/api/auth
echo ----------------------------------------
echo.
echo ✓ Check the Location header above
echo   Should redirect to facebook.com with your App ID
goto menu

:test_callback
echo.
echo Testing callback endpoint (should error without code)...
echo ----------------------------------------
curl.exe http://localhost:3000/api/auth/callback
echo.
echo ----------------------------------------
echo.
echo ✓ Should show: {"error":"No code provided"}
goto menu

:validate_token
echo.
set /p token="Enter your access token (or press Enter to read from tokens.json): "
if "%token%"=="" (
    echo Reading token from tokens.json...
    REM This is simplified - in practice you'd parse the JSON
    echo Please manually copy the access_token value from tokens.json
    goto menu
)
echo.
echo Validating token...
echo ----------------------------------------
curl.exe "https://graph.facebook.com/v18.0/me?fields=id,name&access_token=%token%"
echo.
echo ----------------------------------------
goto menu

:check_permissions
echo.
set /p token="Enter your access token: "
if "%token%"=="" goto menu
echo.
echo Checking permissions...
echo ----------------------------------------
curl.exe "https://graph.facebook.com/v18.0/me/permissions?access_token=%token%"
echo.
echo ----------------------------------------
echo.
echo ✓ Look for these permissions with "granted" status:
echo   - instagram_basic
echo   - instagram_content_publish
echo   - pages_read_engagement
echo   - pages_show_list
goto menu

:list_pages
echo.
set /p token="Enter your access token: "
if "%token%"=="" goto menu
echo.
echo Listing Facebook Pages...
echo ----------------------------------------
curl.exe "https://graph.facebook.com/v18.0/me/accounts?access_token=%token%"
echo.
echo ----------------------------------------
goto menu

:view_env
echo.
echo Environment variables:
echo ----------------------------------------
type .env.local
echo ----------------------------------------
goto menu

:open_browser
echo.
echo Opening browser to http://localhost:3000
start http://localhost:3000
echo ✓ Browser opened!
goto menu

:end
echo.
echo Goodbye!
exit /b 0

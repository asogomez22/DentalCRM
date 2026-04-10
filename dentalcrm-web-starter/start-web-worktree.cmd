@echo off
setlocal

set "WORKTREE_ROOT=C:\Users\asogo\DentalCRM\dentalcrm-web-starter\.claude\worktrees\beautiful-lalande\dentalcrm-web-starter"

cd /d "%WORKTREE_ROOT%\apps\web"
call npm run dev -- --host 127.0.0.1 --port 5174 --force

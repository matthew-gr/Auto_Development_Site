#!/bin/bash
# Double-click to launch the demo site locally (macOS/Linux).
# On Windows, double-click "Launch Demo.bat" instead.
# Keep this window open while recording. Press Ctrl+C (or close it) to stop.

cd "$(dirname "$0")" || exit 1
PORT=8090
NAME="VELOCE"

lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | xargs kill -9 2>/dev/null
URL="http://localhost:$PORT"
echo ""
echo "  $NAME — local server"
echo "  Open in your browser:  $URL"
echo "  Keep this window open while recording. Ctrl+C to stop."
echo ""

# python3 on macOS/Linux, python on Windows/Git-Bash
PY=python3; command -v python3 >/dev/null 2>&1 || PY=python

# open (macOS) / xdg-open (Linux) / start (Windows)
( sleep 1
  if   command -v open     >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v start    >/dev/null 2>&1; then start "$URL"
  fi ) &

$PY serve.py $PORT

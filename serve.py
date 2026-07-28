#!/usr/bin/env python3
"""Threaded static dev server for the VELOCE site.

Two reasons this exists instead of `python -m http.server`:
  1. Threaded (ThreadingHTTPServer) so the browser's parallel/idle
     connections never block frame loading. A single-threaded server
     hangs on speculative keep-alive sockets and freezes every scrub.
  2. Sends no-cache headers for html/css/js (so edits always show up),
     but lets the browser cache the frame images (so 300+ frames aren't
     re-downloaded on every reload).

Usage: python serve.py [port]   (default 8090)
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
NO_CACHE_EXT = (".html", ".htm", ".css", ".js", ".json")


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split("?", 1)[0].lower()
        if path.endswith("/") or path.endswith(NO_CACHE_EXT):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        else:
            self.send_header("Cache-Control", "public, max-age=86400")
        super().end_headers()


if __name__ == "__main__":
    httpd = ThreadingHTTPServer(("", PORT), Handler)
    print(f"Serving on http://localhost:{PORT}  (threaded; html/css/js no-cache, media cached)  —  Ctrl+C to stop")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()

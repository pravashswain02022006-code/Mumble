#!/usr/bin/env python3
"""SPA-aware static file server — falls back to index.html for unknown routes."""
import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(os.environ.get("PORT", 4173))
HOST = os.environ.get("HOST", "127.0.0.1")

class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Strip query string
        path = self.path.split("?")[0]

        # Check if file exists on disk
        fs_path = self.translate_path(path)
        if os.path.exists(fs_path) and not os.path.isdir(fs_path):
            super().do_GET()
        else:
            # Fallback: serve index.html for SPA client-side routes
            self.path = "/index.html"
            super().do_GET()

    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} → {fmt % args}")

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = HTTPServer((HOST, PORT), SPAHandler)
    print(f"✅  Mumble app running at http://{HOST}:{PORT}")
    print(f"   Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
import os
import sys


PROJECT_ROOT = Path(__file__).resolve().parent
BUILD_DIR = PROJECT_ROOT / "frontend" / "build"
BACKEND_BASE = os.environ.get("BACKEND_BASE", "http://127.0.0.1:8000").rstrip("/")
HOST = os.environ.get("SHARE_HOST", "0.0.0.0")
PORT = int(os.environ.get("SHARE_PORT", "8080"))


class ShareHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BUILD_DIR), **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy_request()
            return
        super().do_GET()

    def do_POST(self):
        self._proxy_request()

    def do_PUT(self):
        self._proxy_request()

    def do_PATCH(self):
        self._proxy_request()

    def do_DELETE(self):
        self._proxy_request()

    def send_head(self):
        path = self.translate_path(self.path)
        target = Path(path)
        if target.exists():
            return super().send_head()
        self.path = "/index.html"
        return super().send_head()

    def _proxy_request(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length) if content_length else None
        upstream_url = f"{BACKEND_BASE}{self.path}"
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "content-length", "accept-encoding", "connection"}
        }
        request = Request(upstream_url, data=body, headers=headers, method=self.command)

        try:
            with urlopen(request, timeout=30) as upstream:
                self.send_response(upstream.status)
                for key, value in upstream.getheaders():
                    if key.lower() in {"transfer-encoding", "connection", "content-encoding"}:
                        continue
                    self.send_header(key, value)
                self.end_headers()
                self.wfile.write(upstream.read())
        except HTTPError as error:
            self.send_response(error.code)
            for key, value in error.headers.items():
                if key.lower() in {"transfer-encoding", "connection", "content-encoding"}:
                    continue
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(error.read())
        except URLError as error:
            message = f"Backend unreachable: {error.reason}\n".encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(message)))
            self.end_headers()
            self.wfile.write(message)

    def log_message(self, format, *args):
        sys.stdout.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), format % args))


def main():
    if not BUILD_DIR.exists():
        raise SystemExit("frontend/build not found. Run the production build first.")

    server = ThreadingHTTPServer((HOST, PORT), ShareHandler)
    print(f"Serving {BUILD_DIR} on http://{HOST}:{PORT}")
    print(f"Proxying /api to {BACKEND_BASE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

import http.server
import socketserver


def main() -> None:
    port = 8000
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving on http://127.0.0.1:{port}/ (Ctrl+C to stop)")
        httpd.serve_forever()


if __name__ == "__main__":
    main()

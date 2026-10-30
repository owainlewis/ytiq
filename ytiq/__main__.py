import argparse
import threading
import webbrowser

import uvicorn


def main():
    parser = argparse.ArgumentParser(prog="ytiq")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--reload", action="store_true")
    parser.add_argument("--no-browser", action="store_true", help="don't open ytiq in your browser on start")
    args = parser.parse_args()
    url = f"http://{args.host}:{args.port}"
    print(f"\n  ytiq is running at {url}  (Ctrl+C to stop)\n")
    if not args.no_browser and not args.reload:
        # Give the server a moment to bind before the browser asks for the page.
        threading.Timer(1.0, webbrowser.open, [url]).start()
    uvicorn.run("ytiq.app:app", host=args.host, port=args.port, reload=args.reload, log_level="warning")


if __name__ == "__main__":
    main()

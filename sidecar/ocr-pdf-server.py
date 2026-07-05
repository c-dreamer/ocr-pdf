#!/usr/bin/env python3
"""Simple HTTP server that wraps ocr-pdf for Tauri sidecar use.

This script lets Tauri spawn a long-lived Python process that handles
document processing requests over stdin/stdout JSON lines, avoiding
the overhead of starting a new Python process per request.

Usage (in Tauri Rust code):
    sidecar = app.shell().sidecar("ocr-pdf-server")
    sidecar.send(json.dumps({"file_path": "/path/to/doc.pdf"}))
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.router import process_file


def handle_request(request: dict) -> dict:
    """Process a single request."""
    file_path = request.get("file_path", "")
    output_dir = request.get("output_dir")

    if not file_path:
        return {"error": "Missing file_path"}

    path = Path(file_path)
    if not path.exists():
        return {"error": f"File not found: {file_path}"}

    result = process_file(path, output_dir=output_dir or str(tempfile.mkdtemp()))
    return {
        "text": result.get("text", ""),
        "method": result.get("method", "unknown"),
        "quality": result.get("quality", {}).get("overall", 0.0),
        "file_type": result.get("file_type", "unknown"),
        "error": result.get("error"),
    }


def main():
    """Read JSON lines from stdin, write results to stdout."""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
        except json.JSONDecodeError as e:
            response = {"error": f"Invalid JSON: {e}"}
        except Exception as e:
            response = {"error": str(e)}

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()

"""Minimal child-process PDF extractor. It receives bytes on stdin, never secrets."""

import json
import re
import sys
from io import BytesIO

try:
    import resource
    resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))
    resource.setrlimit(resource.RLIMIT_CPU, (25, 25))
except (ImportError, OSError, ValueError):
    pass

from pypdf import PdfReader


def extract(data: bytes, max_pages: int, max_chars: int) -> list[dict]:
    if not data.startswith(b"%PDF-"):
        raise ValueError("Invalid PDF header")
    reader = PdfReader(BytesIO(data), strict=False)
    if reader.is_encrypted:
        raise ValueError("Encrypted PDF")
    if len(reader.pages) > max_pages:
        raise ValueError("Too many pages")
    pages = []
    remaining = max_chars
    for index, page in enumerate(reader.pages, start=1):
        text = re.sub(r"[ \t]+", " ", (page.extract_text() or "").replace("\r", "\n")).strip()
        if len(text) > remaining:
            raise ValueError("Extracted text is too large")
        remaining -= len(text)
        if text:
            pages.append({"page": index, "text": text})
    if not pages or sum(len(item["text"]) for item in pages) < 20:
        raise ValueError("No meaningful selectable text; OCR may be required")
    return pages


if __name__ == "__main__":
    try:
        print(json.dumps(extract(sys.stdin.buffer.read(), int(sys.argv[1]), int(sys.argv[2]))))
    except Exception:
        sys.exit(2)

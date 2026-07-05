"""PyMuPDF-based text extractor.

Fastest path for born-digital PDFs. Extracts text directly from the
PDF text layer. Also provides page rendering for OCR fallback.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class PyMuPDFExtractor:
    """Extract text from PDFs using PyMuPDF (fitz)."""

    def extract(self, file_path: str | Path, **kwargs) -> str:
        """Extract text from a PDF file.

        Args:
            file_path: Path to the PDF file.

        Returns:
            Extracted text content.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        doc = fitz.open(str(path))
        pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            pages.append(text)

        doc.close()
        return "\n\n".join(pages)

    def extract_with_metadata(self, file_path: str | Path) -> dict:
        """Extract text with per-page metadata.

        Returns:
            Dict with 'text', 'pages' (list of per-page dicts), 'metadata'.
        """
        path = Path(file_path)
        doc = fitz.open(str(path))

        pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            pages.append({
                "page": page_num + 1,
                "text": text,
                "char_count": len(text),
                "word_count": len(text.split()),
            })

        metadata = {
            "page_count": len(doc),
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "format": doc.metadata.get("format", ""),
        }

        doc.close()
        return {"text": "\n\n".join(p["text"] for p in pages), "pages": pages, "metadata": metadata}

    def render_page(self, file_path: str | Path, page_num: int = 0, dpi: int = 200) -> Optional[bytes]:
        """Render a PDF page as PNG image bytes (for OCR fallback).

        Args:
            file_path: Path to the PDF file.
            page_num: Zero-based page number.
            dpi: Rendering DPI.

        Returns:
            PNG image bytes, or None if rendering fails.
        """
        try:
            doc = fitz.open(str(file_path))
            page = doc[page_num]
            zoom = dpi / 72
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            doc.close()
            return img_bytes
        except Exception as e:
            logger.warning(f"Page rendering failed: {e}")
            return None

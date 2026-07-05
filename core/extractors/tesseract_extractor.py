"""Tesseract OCR extractor for images.

Processes images (PNG, JPG, TIFF, etc.) via Tesseract OCR.
Also used as fallback for scanned PDF pages rendered to images.
"""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)


class TesseractExtractor:
    """Extract text from images using Tesseract OCR."""

    def __init__(self, language: str = "eng"):
        self.language = language

    def extract(self, file_path: str | Path, **kwargs) -> str:
        """Extract text from a single image file.

        Args:
            file_path: Path to an image file (PNG, JPG, TIFF, etc.).

        Returns:
            Extracted text.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            import pytesseract
            img = Image.open(str(path))
            text = pytesseract.image_to_string(img, lang=self.language)
            return text.strip()
        except ImportError:
            logger.warning("pytesseract not installed, trying CLI fallback")
            return self._cli_extract(path)

    def extract_from_bytes(self, image_bytes: bytes, **kwargs) -> str:
        """Extract text from image bytes.

        Args:
            image_bytes: PNG/JPEG image as bytes.

        Returns:
            Extracted text.
        """
        import pytesseract
        from io import BytesIO
        img = Image.open(BytesIO(image_bytes))
        text = pytesseract.image_to_string(img, lang=self.language)
        return text.strip()

    def _cli_extract(self, path: Path) -> str:
        """Fallback: call tesseract CLI directly."""
        try:
            result = subprocess.run(
                ["tesseract", str(path), "stdout", "-l", self.language],
                capture_output=True, text=True, timeout=60,
            )
            if result.returncode == 0:
                return result.stdout.strip()
            logger.warning(f"Tesseract CLI failed: {result.stderr.strip()}")
            return ""
        except FileNotFoundError:
            logger.error("Tesseract not found on PATH. Install it.")
            return ""
        except subprocess.TimeoutExpired:
            logger.error("Tesseract timed out.")
            return ""

    def is_available(self) -> bool:
        """Check if Tesseract is available."""
        try:
            result = subprocess.run(
                ["tesseract", "--version"],
                capture_output=True, text=True, timeout=10,
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

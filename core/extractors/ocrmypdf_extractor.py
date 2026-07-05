"""OCRmyPDF-based extractor for scanned PDFs.

Runs OCRmyPDF to add a searchable text layer to scanned/image-based
PDFs, then extracts the text using PyMuPDF.
"""

from __future__ import annotations

import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

from core.extractors.pymupdf_extractor import PyMuPDFExtractor

logger = logging.getLogger(__name__)


class OCRmyPDFExtractor:
    """Add OCR layer to scanned PDFs, then extract text."""

    def __init__(self, language: str = "eng", skip_text: bool = True):
        self.language = language
        # skip_text=True: skip pages that already have text (faster)
        self.skip_text = skip_text

    def extract(self, file_path: str | Path, **kwargs) -> str:
        """Run OCRmyPDF on a PDF and extract the resulting text.

        Args:
            file_path: Path to the scanned PDF.

        Returns:
            Extracted text content.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # OCRmyPDF processes to a temp file, then we extract text
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            output_path = tmp.name

        try:
            self._run_ocrmypdf(path, output_path)
            if Path(output_path).exists():
                extractor = PyMuPDFExtractor()
                text = extractor.extract(output_path)
                return text
            return ""
        finally:
            Path(output_path).unlink(missing_ok=True)

    def _run_ocrmypdf(self, input_path: Path, output_path: str) -> None:
        """Execute OCRmyPDF as a subprocess."""
        cmd = [
            "ocrmypdf",
            "--language", self.language,
            "--output-type", "pdfa",
            "--pdfa-image-compression", "jpeg",
        ]
        if self.skip_text:
            cmd.append("--skip-text")

        cmd.extend([str(input_path), output_path])

        logger.info(f"Running OCRmyPDF: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            error_msg = result.stderr.strip()
            logger.warning(f"OCRmyPDF failed (code {result.returncode}): {error_msg}")
            raise RuntimeError(f"OCRmyPDF failed: {error_msg}")

    def is_available(self) -> bool:
        """Check if OCRmyPDF is installed on the system."""
        try:
            result = subprocess.run(
                ["ocrmypdf", "--version"],
                capture_output=True, text=True, timeout=10,
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

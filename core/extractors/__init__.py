"""Extractor modules for different document types."""

from core.extractors.pymupdf_extractor import PyMuPDFExtractor
from core.extractors.ocrmypdf_extractor import OCRmyPDFExtractor
from core.extractors.tesseract_extractor import TesseractExtractor

__all__ = [
    "PyMuPDFExtractor",
    "OCRmyPDFExtractor",
    "TesseractExtractor",
]

"""Smart document processing router.

Detects file type and content, selects the best extraction strategy:
  - Born-digital PDF → PyMuPDF (fast path)
  - Scanned PDF → OCRmyPDF + PyMuPDF (OCR fallback)
  - Image → Tesseract OCR
  - Quality gate → auto-fallback if result is poor
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from core.config import load_config
from core.extractors import OCRmyPDFExtractor, PyMuPDFExtractor, TesseractExtractor
from core.quality import is_quality_acceptable, needs_fallback, score_text

logger = logging.getLogger(__name__)

# Image file extensions
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"}
# Document file extensions
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".pptx", ".odt", ".txt", ".md"}


def detect_file_type(file_path: str | Path) -> str:
    """Detect file type by extension.

    Returns: 'pdf', 'image', or 'unknown'.
    """
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return "pdf"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    return "unknown"


def detect_pdf_type(file_path: str | Path) -> str:
    """Detect whether a PDF is born-digital or scanned.

    Uses PyMuPDF to check if the PDF has extractable text on most pages.
    If < 50% of pages have meaningful text, it's likely scanned.

    Returns: 'digital', 'scanned', or 'unknown'.
    """
    try:
        import fitz
        doc = fitz.open(str(file_path))
        total_pages = len(doc)

        if total_pages == 0:
            doc.close()
            return "unknown"

        pages_with_text = 0
        for page_num in range(total_pages):
            page = doc[page_num]
            text = page.get_text("text").strip()
            # A page with < 20 chars is essentially blank / image-only
            if len(text) > 20:
                pages_with_text += 1

        doc.close()

        text_ratio = pages_with_text / total_pages
        if text_ratio >= 0.5:
            return "digital"
        return "scanned"
    except ImportError:
        logger.warning("PyMuPDF not available, assuming digital PDF")
        return "digital"
    except Exception as e:
        logger.warning(f"PDF type detection failed: {e}")
        return "unknown"


def process_file(
    file_path: str | Path,
    output_dir: Optional[str | Path] = None,
    config: Optional[Dict[str, Any]] = None,
    **kwargs,
) -> Dict[str, Any]:
    """Process a single file through the smart router.

    Args:
        file_path: Path to the file to process.
        output_dir: Directory to write output files. If None, no files written.
        config: Optional configuration overrides.

    Returns:
        Dict with keys:
          - `text`: Extracted text content.
          - `path`: Path to output file (if output_dir set), else None.
          - `method`: Extraction method used.
          - `quality`: Quality score dict.
          - `file_type`: Detected file type.
          - `metadata`: File metadata.
    """
    if config is None:
        config = load_config()

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    file_type = detect_file_type(path)
    quality_cfg = config.get("quality", {})
    min_score = quality_cfg.get("min_score", 0.6)
    min_words = quality_cfg.get("min_word_count", 10)
    ocr_cfg = config.get("ocr", {})
    ocr_lang = ocr_cfg.get("language", "eng")
    router_cfg = config.get("router", {})

    result: Dict[str, Any] = {
        "text": "",
        "path": None,
        "method": "none",
        "quality": {"overall": 0.0},
        "file_type": file_type,
        "metadata": {"source": str(path), "filename": path.name},
    }

    try:
        if file_type == "pdf":
            result = _process_pdf(
                path, min_score, min_words, ocr_lang, router_cfg, config, **kwargs
            )
        elif file_type == "image":
            result = _process_image(path, ocr_lang, **kwargs)
        else:
            logger.warning(f"Unsupported file type: {file_type}")
            result["text"] = ""

    except Exception as e:
        logger.error(f"Processing failed for {path}: {e}")
        result["error"] = str(e)
        return result

    # Write output file if output_dir specified
    if output_dir and result.get("text"):
        out_path = _write_output(path, result["text"], output_dir)
        result["path"] = str(out_path)

    return result


def process_bytes(
    content: bytes,
    filename: str,
    output_dir: Optional[str | Path] = None,
    **kwargs,
) -> Dict[str, Any]:
    """Process file content from bytes (e.g., from an API upload).

    Args:
        content: Raw file bytes.
        filename: Original filename (used for type detection).
        output_dir: Optional output directory.

    Returns:
        Same structure as process_file().
    """
    import tempfile
    suffix = Path(filename).suffix
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        return process_file(tmp_path, output_dir, **kwargs)
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def _process_pdf(
    path: Path,
    min_score: float,
    min_words: int,
    ocr_lang: str,
    router_cfg: dict,
    config: dict,
    **kwargs,
) -> Dict[str, Any]:
    """Route PDF through best extraction strategy."""
    pdf_type = detect_pdf_type(path)
    logger.info(f"PDF type: {pdf_type} for {path.name}")

    result = {
        "text": "",
        "method": "none",
        "file_type": "pdf",
        "pdf_type": pdf_type,
        "metadata": {"source": str(path), "filename": path.name},
    }

    if pdf_type == "digital":
        # Fast path: PyMuPDF direct extraction
        extractor = PyMuPDFExtractor()
        text = extractor.extract(path)

        quality = score_text(text, min_words)
        result["quality"] = quality
        result["text"] = text

        if is_quality_acceptable(quality["overall"], min_score):
            result["method"] = "pymupdf"
            return result

        # Quality too low, try OCR fallback
        logger.info(f"PyMuPDF quality {quality['overall']:.2f} < {min_score}, trying OCR fallback")
        if router_cfg.get("fallback_to_ocr", True):
            ocr_text = _ocr_fallback(path, ocr_lang, min_words)
            ocr_quality = score_text(ocr_text, min_words)
            if ocr_quality["overall"] > quality["overall"]:
                result["text"] = ocr_text
                result["quality"] = ocr_quality
                result["method"] = "ocrmypdf"
                return result

        # Return best available text even if below threshold
        result["method"] = "pymupdf (low quality)"
        return result

    elif pdf_type == "scanned":
        # OCR path: OCRmyPDF + PyMuPDF
        if router_cfg.get("fallback_to_ocr", True):
            text = _ocr_fallback(path, ocr_lang, min_words)
            quality = score_text(text, min_words)
            result["text"] = text
            result["quality"] = quality
            result["method"] = "ocrmypdf"
            return result

        # OCR fallback disabled
        extractor = PyMuPDFExtractor()
        text = extractor.extract(path)
        result["text"] = text
        result["quality"] = score_text(text, min_words)
        result["method"] = "pymupdf (no ocr)"
        return result

    else:
        # Unknown type, try PyMuPDF first
        extractor = PyMuPDFExtractor()
        text = extractor.extract(path)
        result["text"] = text
        result["quality"] = score_text(text, min_words)
        result["method"] = "pymupdf (unknown type)"
        return result


def _ocr_fallback(path: Path, ocr_lang: str, min_words: int) -> str:
    """Run OCRmyPDF fallback on a PDF."""
    ocr_extractor = OCRmyPDFExtractor(language=ocr_lang)
    if ocr_extractor.is_available():
        try:
            text = ocr_extractor.extract(path)
            if text.strip():
                return text
        except Exception as e:
            logger.warning(f"OCRmyPDF failed: {e}")

    # Final fallback: render pages and run Tesseract on each
    logger.info("Falling back to page-by-page Tesseract OCR")
    pymupdf = PyMuPDFExtractor()
    import fitz
    doc = fitz.open(str(path))
    texts = []
    for page_num in range(len(doc)):
        img_bytes = pymupdf.render_page(path, page_num)
        if img_bytes:
            tesseract = TesseractExtractor(language=ocr_lang)
            page_text = tesseract.extract_from_bytes(img_bytes)
            texts.append(page_text)
    doc.close()
    return "\n\n".join(texts)


def _process_image(
    path: Path,
    ocr_lang: str,
    **kwargs,
) -> Dict[str, Any]:
    """Process an image file through Tesseract OCR."""
    extractor = TesseractExtractor(language=ocr_lang)
    text = extractor.extract(path)

    quality = score_text(text)
    return {
        "text": text,
        "method": "tesseract",
        "quality": quality,
        "file_type": "image",
        "metadata": {"source": str(path), "filename": path.name},
    }


def _write_output(input_path: Path, text: str, output_dir: str | Path) -> Path:
    """Write extracted text to a markdown file."""
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    stem = input_path.stem
    out_path = out_dir / f"{stem}.md"
    out_path.write_text(text, encoding="utf-8")
    logger.info(f"Wrote output to {out_path}")
    return out_path

"""Shared test fixtures."""

import tempfile
from pathlib import Path

import pytest


@pytest.fixture
def sample_pdf_path() -> Path:
    """Create a minimal valid PDF with extractable text."""
    import fitz

    path = Path(tempfile.mktemp(suffix=".pdf"))
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Test page content for OCR-PDF testing.", fontsize=12)
    page.insert_text((50, 130), "This is a second line of text.", fontsize=12)
    doc.save(str(path))
    doc.close()
    return path


@pytest.fixture
def sample_image_path() -> Path:
    """Create a simple test image with text."""
    from PIL import Image, ImageDraw, ImageFont

    path = Path(tempfile.mktemp(suffix=".png"))
    img = Image.new("RGB", (400, 100), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((20, 40), "Hello OCR-PDF", fill="black")
    img.save(str(path))
    return path

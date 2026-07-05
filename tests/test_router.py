"""Tests for core.router module."""

from pathlib import Path

import pytest

from core.router import detect_file_type, process_file


class TestDetectFileType:
    def test_pdf(self):
        assert detect_file_type("document.pdf") == "pdf"
        assert detect_file_type("doc.PDF") == "pdf"

    def test_images(self):
        assert detect_file_type("photo.png") == "image"
        assert detect_file_type("photo.jpg") == "image"
        assert detect_file_type("photo.jpeg") == "image"
        assert detect_file_type("photo.tiff") == "image"
        assert detect_file_type("photo.bmp") == "image"
        assert detect_file_type("photo.webp") == "image"

    def test_unknown(self):
        assert detect_file_type("notes.txt") == "unknown"
        assert detect_file_type("data.csv") == "unknown"
        assert detect_file_type("script.py") == "unknown"


class TestProcessFile:
    def test_nonexistent_file(self):
        with pytest.raises(FileNotFoundError):
            process_file("/nonexistent/file.pdf")

    def test_process_digital_pdf(self, sample_pdf_path: Path):
        result = process_file(sample_pdf_path)
        assert result["file_type"] == "pdf"
        assert result["pdf_type"] == "digital"
        assert result["method"] in ("pymupdf", "pymupdf (low quality)")
        assert len(result["text"]) > 0
        assert "Test page content" in result["text"]
        assert result["quality"]["overall"] >= 0.5

    def test_process_with_output_dir(self, sample_pdf_path: Path, tmp_path: Path):
        result = process_file(sample_pdf_path, output_dir=str(tmp_path))
        assert result["path"] is not None
        out_file = Path(result["path"])
        assert out_file.exists()
        assert "Test page content" in out_file.read_text()

    def test_process_image(self, sample_image_path: Path):
        result = process_file(sample_image_path)
        assert result["file_type"] == "image"
        # Tesseract may not be installed
        if not result["text"]:
            pytest.skip("Tesseract not available")
        assert result["method"] == "tesseract"
        assert len(result["text"]) > 0

    def test_result_structure(self, sample_pdf_path: Path):
        result = process_file(sample_pdf_path)
        expected_keys = {"text", "path", "method", "quality", "file_type", "metadata"}
        assert expected_keys.issubset(result.keys())
        assert isinstance(result["text"], str)
        assert isinstance(result["quality"]["overall"], float)
        assert "filename" in result["metadata"]
        assert "source" in result["metadata"]

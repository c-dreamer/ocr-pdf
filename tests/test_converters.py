"""Tests for core.converters module."""

from pathlib import Path

import pytest

from core.converters import markdown_to_pdf, pdf_to_markdown


class TestPdfToMarkdown:
    def test_conversion(self, sample_pdf_path: Path):
        result = pdf_to_markdown(sample_pdf_path, frontmatter=True)
        assert result["markdown"]
        assert "---" in result["markdown"]  # frontmatter
        assert "Test page content" in result["markdown"]
        assert "method" in result
        assert "quality" in result

    def test_without_frontmatter(self, sample_pdf_path: Path):
        result = pdf_to_markdown(sample_pdf_path, frontmatter=False)
        assert "---" not in result["markdown"].split("\n")[0]

    def test_write_to_output(self, sample_pdf_path: Path, tmp_path: Path):
        result = pdf_to_markdown(sample_pdf_path, output_dir=str(tmp_path), frontmatter=False)
        assert result["path"] is not None
        out_file = Path(result["path"])
        assert out_file.exists()
        assert out_file.suffix == ".md"

    def test_empty_page_pdf(self):
        import fitz
        import tempfile

        path = Path(tempfile.mktemp(suffix=".pdf"))
        doc = fitz.open()
        doc.new_page()  # Must have at least one page
        doc.save(str(path))
        doc.close()

        result = pdf_to_markdown(path)
        assert result["markdown"] is not None  # May have frontmatter with empty text


class TestMarkdownToPdf:
    def test_nonexistent_file(self):
        import pytest
        with pytest.raises(FileNotFoundError):
            markdown_to_pdf("/nonexistent/file.md")

    def test_conversion_with_weasyprint(self, tmp_path: Path):
        """Requires weasyprint to be installed."""
        md_path = tmp_path / "test.md"
        md_path.write_text("# Hello\n\nThis is a **test**.")

        pdf_path = tmp_path / "output.pdf"
        result = markdown_to_pdf(md_path, output_path=pdf_path)

        if result:
            assert result.exists()
            assert result.suffix == ".pdf"
        else:
            pytest.skip("No PDF converter available (weasyprint or pandoc)")

    def test_md_file_not_found(self):
        import pytest
        with pytest.raises(FileNotFoundError):
            markdown_to_pdf(Path("/nonexistent/file.md"))

"""Tests for core.batch module."""

from pathlib import Path

from core.batch import process_batch, watch_folder


class TestProcessBatch:
    def test_empty_list(self, tmp_path: Path):
        results = process_batch([], output_dir=str(tmp_path))
        assert results == []

    def test_single_file(self, sample_pdf_path: Path, tmp_path: Path):
        results = process_batch([sample_pdf_path], output_dir=str(tmp_path))
        assert len(results) == 1
        assert "text" in results[0]
        assert results[0]["text"]

    def test_multiple_files(self, sample_pdf_path: Path, tmp_path: Path):
        results = process_batch(
            [sample_pdf_path, sample_pdf_path],
            output_dir=str(tmp_path),
            max_workers=2,
        )
        assert len(results) == 2

    def test_output_files_created(self, sample_pdf_path: Path, tmp_path: Path):
        process_batch([sample_pdf_path], output_dir=str(tmp_path))
        md_files = list(tmp_path.glob("*.md"))
        assert len(md_files) >= 1

    def test_on_progress_callback(self, sample_pdf_path: Path, tmp_path: Path):
        called = []

        def callback(result):
            called.append(result)

        process_batch([sample_pdf_path], output_dir=str(tmp_path), on_progress=callback)
        assert len(called) >= 1

    def test_nonexistent_file_does_not_crash(self, tmp_path: Path):
        results = process_batch(
            [Path("/nonexistent/file.pdf")],
            output_dir=str(tmp_path),
        )
        assert len(results) == 1
        assert "error" in results[0]

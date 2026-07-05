"""ocr-pdf: Local-first document processing engine.

Converts PDFs and images to Markdown using a smart router that picks
the best extraction engine per file type. Supports batch processing,
folder watching, Obsidian vault integration, and MCP server.

Typical usage:
    from core import process_file
    result = process_file("scan.pdf", output_dir="./out")
"""

__version__ = "0.1.0"

from core.router import process_file, process_bytes, detect_file_type
from core.batch import process_batch, watch_folder, FolderWatcher
from core.obsidian import ObsidianWriter
from core.converters import pdf_to_markdown, markdown_to_pdf
from core.quality import score_text, is_quality_acceptable, needs_fallback
from core.config import load_config, DEFAULT_CONFIG

__all__ = [
    # Core processing
    "process_file",
    "process_bytes",
    "detect_file_type",
    # Batch & watch
    "process_batch",
    "watch_folder",
    "FolderWatcher",
    # Obsidian
    "ObsidianWriter",
    # Converters
    "pdf_to_markdown",
    "markdown_to_pdf",
    # Quality
    "score_text",
    "is_quality_acceptable",
    "needs_fallback",
    # Config
    "load_config",
    "DEFAULT_CONFIG",
]

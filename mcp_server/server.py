"""MCP (Model Context Protocol) server for ocr-pdf.

Provides PDF/image processing tools to any MCP client (Claude Desktop,
Cursor, OpenCode, etc.).

Run with:
    python -m mcp_server.server
    # or via the CLI:
    ocr-pdf mcp
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

from core import (
    detect_file_type,
    load_config,
    pdf_to_markdown,
    process_batch,
    process_file,
    process_bytes,
)

logger = logging.getLogger(__name__)

try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    FastMCP = None  # type: ignore


def create_server(config: dict[str, Any] | None = None) -> Any:
    """Create and configure the MCP server.

    Args:
        config: Optional configuration dict. Loads defaults if None.

    Returns:
        FastMCP server instance.
    """
    if FastMCP is None:
        raise ImportError(
            "MCP server requires 'mcp' package. Install with: pip install mcp"
        )

    if config is None:
        config = load_config()

    mcp = FastMCP(
        "ocr-pdf",
        description="Local-first document processing: extract text from PDFs and images, convert formats",
    )

    @mcp.tool()
    def process_document(file_path: str, output_dir: str | None = None) -> dict[str, Any]:
        """Extract text from a PDF or image file.

        Automatically detects file type and selects the best extraction
        engine (PyMuPDF for digital PDFs, OCRmyPDF for scanned PDFs,
        Tesseract for images).

        Args:
            file_path: Absolute path to the PDF or image file.
            output_dir: Optional directory to write the output .md file.

        Returns:
            Dict with extracted text, method used, quality score, and metadata.
        """
        path = Path(file_path)
        if not path.exists():
            return {"error": f"File not found: {file_path}"}

        result = process_file(path, output_dir=output_dir, config=config)
        return {
            "text": result.get("text", ""),
            "method": result.get("method", "unknown"),
            "quality": result.get("quality", {}).get("overall", 0.0),
            "file_type": result.get("file_type", "unknown"),
            "metadata": result.get("metadata", {}),
            "output_path": result.get("path"),
        }

    @mcp.tool()
    def process_document_bytes(
        content: bytes,
        filename: str,
        output_dir: str | None = None,
    ) -> dict[str, Any]:
        """Extract text from a PDF or image provided as raw bytes.

        Useful when the file comes from an upload or API call rather
        than a filesystem path.

        Args:
            content: Raw file bytes.
            filename: Original filename (used for type detection).
            output_dir: Optional output directory.

        Returns:
            Dict with extracted text, method, quality, and metadata.
        """
        result = process_bytes(content, filename, output_dir=output_dir)
        return {
            "text": result.get("text", ""),
            "method": result.get("method", "unknown"),
            "quality": result.get("quality", {}).get("overall", 0.0),
            "file_type": result.get("file_type", "unknown"),
            "metadata": result.get("metadata", {}),
        }

    @mcp.tool()
    def convert_to_markdown(
        file_path: str,
        output_dir: str | None = None,
        frontmatter: bool = True,
    ) -> dict[str, Any]:
        """Convert a PDF file to Markdown with optional YAML frontmatter.

        Args:
            file_path: Path to the PDF file.
            output_dir: Optional output directory for the .md file.
            frontmatter: Include YAML frontmatter with metadata.

        Returns:
            Dict with markdown content, method, quality, and output path.
        """
        path = Path(file_path)
        if not path.exists():
            return {"error": f"File not found: {file_path}"}

        result = pdf_to_markdown(
            path, output_dir=output_dir, frontmatter=frontmatter,
        )
        return {
            "markdown": result.get("markdown", ""),
            "method": result.get("method", "unknown"),
            "quality": result.get("quality", {}).get("overall", 0.0),
            "output_path": result.get("path"),
        }

    @mcp.tool()
    def batch_process(
        input_dir: str,
        output_dir: str,
        patterns: list[str] | None = None,
    ) -> dict[str, Any]:
        """Batch process all documents in a directory.

        Args:
            input_dir: Directory containing PDFs/images to process.
            output_dir: Directory for output .md files.
            patterns: File patterns to match (e.g. ["*.pdf", "*.png"]).
                     Defaults to common document image formats.

        Returns:
            Dict with summary statistics and per-file results.
        """
        in_path = Path(input_dir)
        out_path = Path(output_dir)
        if not in_path.exists():
            return {"error": f"Input directory not found: {input_dir}"}

        out_path.mkdir(parents=True, exist_ok=True)

        files: list[Path] = []
        for ext in patterns or ["*.pdf", "*.png", "*.jpg", "*.jpeg", "*.tiff", "*.bmp"]:
            files.extend(in_path.glob(ext))

        if not files:
            return {"error": "No matching files found", "files_processed": 0, "results": []}

        results = process_batch(files, output_dir, config=config)
        successes = sum(1 for r in results if r.get("text"))
        errors = sum(1 for r in results if "error" in r)

        return {
            "files_found": len(files),
            "files_processed": len(results),
            "successes": successes,
            "errors": errors,
            "results": [
                {
                    "filename": r.get("metadata", {}).get("filename", "?"),
                    "method": r.get("method", "unknown"),
                    "quality": r.get("quality", {}).get("overall", 0.0),
                    "error": r.get("error"),
                    "output_path": r.get("path"),
                }
                for r in results
            ],
        }

    @mcp.resource("config://defaults")
    def get_default_config() -> str:
        """Return the default configuration as YAML."""
        import yaml
        return yaml.dump(config, default_flow_style=False)

    @mcp.resource("file://{path}")
    def get_file_info(path: str) -> str:
        """Get information about a file (type detection only)."""
        p = Path(path)
        if not p.exists():
            return f"File not found: {path}"
        ftype = detect_file_type(p)
        size = p.stat().st_size
        return f"File: {p.name}\nSize: {size} bytes\nType: {ftype}"

    return mcp


def main():
    """Run the MCP server over stdio."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(levelname)s %(message)s",
        stream=sys.stderr,
    )

    server = create_server()
    logger.info("Starting ocr-pdf MCP server (stdio)...")
    server.run(transport="stdio")


if __name__ == "__main__":
    main()

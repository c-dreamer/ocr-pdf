"""PDF to Markdown converter.

Wraps the smart router and formats extracted text as clean Markdown
with optional YAML frontmatter, page separators, and metadata.
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from core.router import process_file

logger = logging.getLogger(__name__)


def pdf_to_markdown(
    file_path: str | Path,
    output_dir: Optional[str | Path] = None,
    frontmatter: bool = True,
    page_separators: bool = True,
    **kwargs,
) -> Dict[str, Any]:
    """Convert a PDF file to Markdown.

    Args:
        file_path: Path to the PDF file.
        output_dir: Optional output directory for the .md file.
        frontmatter: Include YAML frontmatter with metadata.
        page_separators: Include --- page separators.

    Returns:
        Dict with 'markdown' (str), 'path' (optional), 'quality', 'method'.
    """
    result = process_file(file_path, output_dir=None, **kwargs)
    text = result.get("text", "")

    if not text:
        return {**result, "markdown": ""}

    md_parts = []

    # YAML frontmatter
    if frontmatter:
        meta = result.get("metadata", {})
        source = Path(file_path)
        front = {
            "title": source.stem.replace("_", " ").replace("-", " ").title(),
            "source": str(source),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "method": result.get("method", "unknown"),
            "quality": result.get("quality", {}).get("overall", 0.0),
        }
        frontmatter_yaml = "\n".join(f"{k}: {v}" for k, v in front.items())
        md_parts.append(f"---\n{frontmatter_yaml}\n---\n")

    # Content
    if page_separators:
        md_parts.append(text)
    else:
        md_parts.append(text)

    markdown = "\n\n".join(md_parts)

    # Write if output_dir provided
    out_path = None
    if output_dir:
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        stem = Path(file_path).stem
        out_path = out_dir / f"{stem}.md"
        out_path.write_text(markdown, encoding="utf-8")
        logger.info(f"Wrote Markdown to {out_path}")

    return {
        **result,
        "markdown": markdown,
        "path": str(out_path) if out_path else None,
    }

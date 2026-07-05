"""Markdown to PDF converter.

Uses weasyprint (preferred) or pandoc (fallback) to convert Markdown
files to PDF.
"""

from __future__ import annotations

import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def markdown_to_pdf(
    md_path: str | Path,
    output_path: Optional[str | Path] = None,
    css: Optional[str] = None,
) -> Optional[Path]:
    """Convert a Markdown file to PDF.

    Args:
        md_path: Path to the Markdown file.
        output_path: Output PDF path. If None, derived from input path.
        css: Optional CSS string for styling.

    Returns:
        Path to the generated PDF, or None on failure.
    """
    md_path = Path(md_path)
    if not md_path.exists():
        raise FileNotFoundError(f"Markdown file not found: {md_path}")

    if output_path is None:
        output_path = md_path.with_suffix(".pdf")
    output_path = Path(output_path)

    # Try weasyprint first
    if _weasyprint_available():
        return _convert_via_weasyprint(md_path, output_path, css)

    # Fallback: pandoc
    if _pandoc_available():
        return _convert_via_pandoc(md_path, output_path)

    logger.error("No PDF converter available. Install weasyprint or pandoc.")
    return None


def _weasyprint_available() -> bool:
    try:
        import weasyprint  # noqa: F401
        return True
    except ImportError:
        return False


def _pandoc_available() -> bool:
    try:
        result = subprocess.run(
            ["pandoc", "--version"],
            capture_output=True, text=True, timeout=10,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


def _convert_via_weasyprint(md_path: Path, output_path: Path, css: Optional[str] = None) -> Path:
    """Convert MD to PDF using weasyprint."""
    import markdown
    from weasyprint import HTML

    # Convert MD to HTML
    md_content = md_path.read_text(encoding="utf-8")
    html_body = markdown.markdown(
        md_content,
        extensions=["fenced_code", "tables", "codehilite", "md_in_html"],
    )

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
       font-size: 12pt; line-height: 1.6; max-width: 800px; margin: auto; padding: 2em; }}
code {{ background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
pre code {{ display: block; padding: 1em; overflow-x: auto; }}
table {{ border-collapse: collapse; width: 100%; }}
th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
img {{ max-width: 100%; }}
{css or ''}
</style>
</head>
<body>
{html_body}
</body>
</html>"""

    HTML(string=html).write_pdf(str(output_path))
    logger.info(f"Converted {md_path} → {output_path} (weasyprint)")
    return output_path


def _convert_via_pandoc(md_path: Path, output_path: Path) -> Path:
    """Convert MD to PDF using pandoc."""
    cmd = ["pandoc", str(md_path), "-o", str(output_path), "--pdf-engine=xelatex"]
    logger.info(f"Running: {' '.join(cmd)}")
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=120,
    )
    if result.returncode != 0:
        logger.warning(f"Pandoc failed: {result.stderr.strip()}")
        raise RuntimeError(f"Pandoc conversion failed: {result.stderr.strip()}")
    logger.info(f"Converted {md_path} → {output_path} (pandoc)")
    return output_path

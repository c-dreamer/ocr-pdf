"""CLI tool for ocr-pdf.

Usage:
    ocr-pdf process scan.pdf
    ocr-pdf batch ./input/ ./output/
    ocr-pdf watch ./input/ ./output/
    ocr-pdf convert scan.pdf output.md
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import click

from core import (
    DEFAULT_CONFIG,
    FolderWatcher,
    detect_file_type,
    load_config,
    markdown_to_pdf,
    pdf_to_markdown,
    process_batch,
    process_file,
    watch_folder,
)
from mcp_server.server import main as run_mcp_server

logger = logging.getLogger(__name__)


@click.group()
@click.option("--config", "-c", type=click.Path(exists=True), help="Config file path")
@click.option("--verbose", "-v", is_flag=True, help="Enable debug logging")
@click.pass_context
def cli(ctx: click.Context, config: str | None, verbose: bool):
    """OCR-PDF: Local-first document processing engine.

    Extract text from PDFs and images, convert between formats,
    batch process directories, and watch folders for new files.
    """
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(levelname)s %(message)s",
        stream=sys.stderr,
    )
    cfg = load_config(Path(config) if config else None)
    ctx.ensure_object(dict)
    ctx.obj["config"] = cfg


@cli.command()
@click.argument("input", type=click.Path(exists=True))
@click.option("--output", "-o", type=click.Path(), help="Output directory")
@click.option("--pdf-engine", type=click.Choice(["auto", "pymupdf", "ocrmypdf"]), default="auto",
              help="PDF extraction engine (default: auto-detect)")
@click.pass_context
def process(ctx: click.Context, input: str, output: str | None, pdf_engine: str):
    """Process a single PDF or image file."""
    cfg = ctx.obj["config"]
    if output:
        cfg["output"]["directory"] = output

    result = process_file(input, output_dir=output, config=cfg)
    text = result.get("text", "")
    method = result.get("method", "none")
    quality = result.get("quality", {}).get("overall", 0.0)

    if not text:
        click.echo(f"✗ No text extracted from {click.format_filename(input)}", err=True)
        sys.exit(1)

    click.echo(f"✓ Extracted ({method}, quality={quality:.2f})")

    if result.get("path"):
        click.echo(f"  → {result['path']}")
    else:
        click.echo(text[:500] + ("..." if len(text) > 500 else ""))


@cli.command()
@click.argument("input", type=click.Path(exists=True))
@click.argument("output", type=click.Path())
@click.option("--to", "target_format", type=click.Choice(["md", "pdf"]), default="md",
              help="Target format (default: md)")
@click.pass_context
def convert(ctx: click.Context, input: str, output: str, target_format: str):
    """Convert a PDF to Markdown or Markdown to PDF."""
    cfg = ctx.obj["config"]

    if target_format == "md":
        result = pdf_to_markdown(input, output_dir=Path(output).parent if Path(output).suffix else output, **cfg)
        method = result.get("method", "none")
        quality = result.get("quality", {}).get("overall", 0.0)
        click.echo(f"✓ Converted ({method}, quality={quality:.2f})")
        if result.get("path"):
            click.echo(f"  → {result['path']}")

    elif target_format == "pdf":
        out = markdown_to_pdf(input, output_path=output)
        if out:
            click.echo(f"✓ Converted → {out}")
        else:
            click.echo("✗ Conversion failed (install weasyprint or pandoc)", err=True)
            sys.exit(1)


@cli.command()
@click.argument("input_dir", type=click.Path(exists=True, file_okay=False))
@click.argument("output_dir", type=click.Path(file_okay=False))
@click.option("--workers", "-w", default=4, help="Parallel workers (default: 4)")
@click.option("--pattern", "-p", multiple=True,
              help="File patterns (repeatable, default: *.pdf, *.png, *.jpg)")
@click.pass_context
def batch(ctx: click.Context, input_dir: str, output_dir: str, workers: int, pattern: tuple[str]):
    """Batch process all files in a directory."""
    cfg = ctx.obj["config"]
    patterns = list(pattern) if pattern else None

    # Collect matching files
    in_path = Path(input_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    files: list[Path] = []
    for ext in patterns or ["*.pdf", "*.png", "*.jpg", "*.jpeg", "*.tiff", "*.bmp"]:
        files.extend(in_path.glob(ext))

    if not files:
        click.echo(f"No matching files found in {input_dir}")
        return

    click.echo(f"Processing {len(files)} file(s) with {workers} worker(s)...")

    def on_progress(result):
        name = result.get("metadata", {}).get("filename", "?")
        if "error" in result:
            click.echo(f"  ✗ {name}: {result['error']}", err=True)
        else:
            click.echo(f"  ✓ {name}")

    results = process_batch(files, output_dir, max_workers=workers, config=cfg,
                            on_progress=on_progress)

    successes = sum(1 for r in results if r.get("text"))
    errors = sum(1 for r in results if "error" in r)
    click.echo(f"\nDone: {successes} succeeded, {errors} failed")


@cli.command()
@click.argument("input_dir", type=click.Path(exists=True, file_okay=False))
@click.argument("output_dir", type=click.Path(file_okay=False))
@click.option("--interval", "-i", default=2.0, help="Polling interval in seconds")
@click.option("--workers", "-w", default=2, help="Parallel workers")
@click.pass_context
def watch(ctx: click.Context, input_dir: str, output_dir: str, interval: float, workers: int):
    """Watch a directory for new files and process them automatically."""
    cfg = ctx.obj["config"]

    def on_progress(result):
        name = result.get("metadata", {}).get("filename", "?")
        if "error" in result:
            click.echo(f"  ✗ {name}: {result['error']}", err=True)
        else:
            method = result.get("method", "?")
            quality = result.get("quality", {}).get("overall", 0.0)
            click.echo(f"  ✓ {name} ({method}, q={quality:.2f})")

    click.echo(f"Watching {input_dir} (interval={interval}s, workers={workers})...")
    click.echo("Press Ctrl+C to stop.")
    try:
        watch_folder(input_dir, output_dir, interval=interval, max_workers=workers,
                     config=cfg, on_complete=on_progress)
    except KeyboardInterrupt:
        click.echo("\nStopped.")


@cli.command()
def mcp():
    """Start the MCP (Model Context Protocol) stdio server.

    Run this command and point your MCP client (Claude Desktop, Cursor, etc.)
    to the subprocess. Example claude_desktop_config.json:

        {
          "mcpServers": {
            "ocr-pdf": {
              "command": "ocr-pdf",
              "args": ["mcp"]
            }
          }
        }
    """
    run_mcp_server()


if __name__ == "__main__":
    cli()

# OCR-PDF

**Local-first document processing engine.** Extract text from PDFs and images using a smart router that auto-selects the best engine — no cloud dependencies.

```bash
pip install ocr-pdf
ocr-pdf process scan.pdf -o ./output
```

## Features

- **Smart router** — detects digital vs. scanned PDFs, routes to PyMuPDF (fast), OCRmyPDF (accurate), or Tesseract (image fallback) automatically
- **Quality gate** — scores output (0.0–1.0) and auto-falls back to heavier engine if quality < threshold
- **Batch processing** — parallel `ThreadPoolExecutor` for multi-file throughput
- **Folder watcher** — polls a directory, processes new files with SHA-256 dedup
- **PDF↔Markdown** — convert both ways with YAML frontmatter support
- **Obsidian writer** — writes directly into an Obsidian vault with wikilinks and frontmatter
- **MCP server** — stdio-based [Model Context Protocol](https://modelcontextprotocol.io) server for Claude Desktop, Cursor, OpenCode, and any MCP client
- **OpenCode skill** — agents can discover and invoke ocr-pdf natively
- **Next.js web UI** — drag-and-drop upload and processing (existing, powered by Python core)

## Quick Install

### System Dependencies

```bash
# Ubuntu / Debian
sudo apt install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract
```

### Python Package

```bash
# Core (CLI + library)
pip install ocr-pdf

# With MCP server support
pip install "ocr-pdf[mcp]"

# All extras
pip install "ocr-pdf[all]"
```

Or install from source:

```bash
git clone https://github.com/c-dreamer/ocr-pdf.git
cd ocr-pdf
pip install -e .
```

## CLI Usage

```bash
# Process a single file
ocr-pdf process document.pdf -o ./out/

# Batch process all PDFs and images in a directory
ocr-pdf batch ./input/ ./output/ --workers 4

# Watch a directory for new files (poll every 2s)
ocr-pdf watch ./input/ ./output/

# Convert between formats
ocr-pdf convert document.pdf output.md
ocr-pdf convert document.md output.pdf

# Start the MCP server (for Claude Desktop/Cursor/OpenCode)
ocr-pdf mcp

# Verbose debug output
ocr-pdf -v process document.pdf
```

### Python API

```python
from core import process_file, pdf_to_markdown, process_batch

# Single file
result = process_file("scan.pdf", output_dir="./out")
print(result["text"])        # extracted text
print(result["method"])      # 'pymupdf' | 'ocrmypdf' | 'tesseract'
print(result["quality"])     # {'overall': 0.98, 'signals': {...}}

# PDF to Markdown
result = pdf_to_markdown("doc.pdf", output_dir="./out", frontmatter=True)
print(result["markdown"])

# Batch
results = process_batch(["./doc1.pdf", "./doc2.png"], "./out/")
```

## MCP Server

Start the MCP server and connect any MCP client:

```bash
ocr-pdf mcp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ocr-pdf": {
      "command": "ocr-pdf",
      "args": ["mcp"]
    }
  }
}
```

### Cursor

In Cursor Settings → MCP Servers, add:

```
Name: ocr-pdf
Type: command
Command: ocr-pdf mcp
```

### OpenCode (Auto-Discovery)

If installed in the same environment as OpenCode, the `.opencode/mcp.json` config is picked up automatically. Otherwise add to your `opencode.json`:

```json
{
  "mcpServers": {
    "ocr-pdf": {
      "command": "ocr-pdf",
      "args": ["mcp"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
|---|---|
| `process_document` | Extract text from a PDF or image file |
| `process_document_bytes` | Extract text from raw bytes (upload/API) |
| `convert_to_markdown` | Convert PDF to Markdown with optional frontmatter |
| `batch_process` | Process all documents in a directory |

## OpenCode Skill Integration

ocr-pdf ships with an OpenCode skill that lets AI agents discover and use the tool without manual setup. When the skill is loaded, agents can:

- Process PDFs and images on demand
- Convert documents between formats
- Batch process directories
- Watch folders for new files

The skill triggers on keywords like: `ocr`, `pdf`, `extract text`, `document processing`.

## Architecture

```
                    ┌──────────────────────────────────┐
                    │         Client / Agent            │
                    │  CLI │ MCP │ Python API │ Web UI  │
                    └──────┬──────┬──────────┬──────────┘
                           │      │          │
                    ┌──────▼──────▼──────────▼──────────┐
                    │         Smart Router               │
                    │  detect → route → extract → score  │
                    │         → fallback if needed        │
                    └──────┬──────┬──────────┬──────────┘
                           │      │          │
              ┌────────────▼──┐ ┌─▼──────┐ ┌─▼──────────┐
              │  PyMuPDF      │ │OCRmyPDF│ │  Tesseract  │
              │  (digital)    │ │(scanned)│ │  (images)   │
              └───────────────┘ └────────┘ └─────────────┘
```

## File Structure

```
ocr-pdf/
├── core/                  # Python engine
│   ├── config.py          # YAML + env config
│   ├── quality.py         # 5-signal quality scorer
│   ├── router.py          # Smart routing engine
│   ├── extractors/        # Extraction backends
│   ├── converters/        # PDF↔MD conversion
│   ├── obsidian.py        # Obsidian vault writer
│   └── batch.py           # Batch + folder watcher
├── cli/main.py            # Click CLI (5 commands)
├── mcp_server/server.py   # FastMCP stdio server
├── opencode-skill/        # OpenCode agent skill
├── .opencode/mcp.json     # MCP auto-discovery
├── app/                   # Next.js web UI
└── pyproject.toml
```

## Configuration

ocr-pdf loads config from (in order):
1. `./ocr-pdf.yaml` or `./ocr-pdf.yml`
2. `~/.config/ocr-pdf/config.yaml`
3. Environment variables (`OCR_PDF_*`)
4. Defaults

Example `ocr-pdf.yaml`:

```yaml
output:
  format: md
  directory: ./output
  obsidian_vault: /path/to/vault

quality:
  min_score: 0.6
  min_word_count: 10

router:
  fallback_to_ocr: true

ocr:
  language: eng
  dpi: 200
```

## Development

```bash
git clone https://github.com/c-dreamer/ocr-pdf.git
cd ocr-pdf
pip install -e ".[dev]"
pip install -e ".[mcp]"    # for MCP server
```

### Test

```bash
pytest tests/
```

### Lint

```bash
ruff check .
```

## License

MIT

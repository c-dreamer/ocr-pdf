# OCR-PDF — Document Processing Skill

Extract text from PDFs and images using a smart local engine with no cloud dependencies.

## Description

OCR-PDF is a local-first document processing engine built into this repository. It uses a smart router that detects file type (digital PDF, scanned PDF, image) and selects the optimal extraction engine — PyMuPDF for digital PDFs (~0.01s/page), OCRmyPDF for scanned PDFs, or Tesseract for images. Output is quality-scored (0.0–1.0) and automatically falls back to a heavier engine if the score is below threshold.

## Triggers

Use this skill when the user asks to:
- "Extract text from a PDF/image"
- "OCR this document"
- "Convert PDF to Markdown"
- "Process a batch of documents"
- "Watch a folder for new PDFs"
- "Integrate OCR into OpenCode"
- "Set up document processing"
- Keywords: `ocr`, `pdf`, `extract text`, `document processing`, `scan`, `ocr-pdf`

## Usage

### CLI (direct invocation)

```bash
# Process a single file
ocr-pdf process <file> -o <output-dir>

# Batch process a directory
ocr-pdf batch <input-dir> <output-dir>

# Watch a folder for new files
ocr-pdf watch <input-dir> <output-dir>

# Convert PDF to Markdown
ocr-pdf convert <file> <output.md>

# Start MCP server
ocr-pdf mcp
```

### Python API (agent use)

```python
from core import process_file

result = process_file("document.pdf", output_dir="./output")
text = result["text"]
method = result["method"]       # 'pymupdf' | 'ocrmypdf' | 'tesseract'
quality = result["quality"]["overall"]  # 0.0–1.0
```

### MCP Tools (when connected to MCP host)

When the MCP server is running (`ocr-pdf mcp`), the following tools are available:

| Tool | Description |
|---|---|
| `process_document` | Extract text from a PDF or image file |
| `process_document_bytes` | Extract text from raw bytes |
| `convert_to_markdown` | Convert PDF to Markdown |
| `batch_process` | Process all documents in a directory |

## Quality Scoring

The engine scores extraction quality on 5 signals (0.0–1.0):
- **word_count**: Density of extracted words
- **garbage_ratio**: Proportion of non-printable / mojibake characters
- **repetition**: Repeated punctuation noise
- **avg_word_length**: Penalizes both too-short (garbage) and too-long (concatenated) words
- **bad_phrases**: Known OCR failure phrases ("lorem ipsum", "xxxxx", etc.)

Default threshold: 0.6. If quality < threshold, the router auto-falls back.

## MCP Server Setup (for the agent host)

The MCP server runs over stdio. Configure in the host's MCP config:

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

If `ocr-pdf` is not on PATH, use the full path:

```json
{
  "mcpServers": {
    "ocr-pdf": {
      "command": "/path/to/.venv/bin/ocr-pdf",
      "args": ["mcp"]
    }
  }
}
```

## Requirements

- Python ≥ 3.11
- Tesseract OCR installed on system (`apt install tesseract-ocr` or `brew install tesseract`)
- OCRmyPDF (optional, installed via pip)
- PyMuPDF (installed via pip)

## Configuration

Settings can be placed in `ocr-pdf.yaml` in the working directory or `~/.config/ocr-pdf/config.yaml`. See the project README for all options.

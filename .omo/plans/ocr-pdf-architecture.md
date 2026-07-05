# OCR-PDF Architecture Plan

## Phases

### Phase 1 — Core Engine ✅
- Config loader (YAML + env)
- 5-signal quality scorer
- 3 extractors: PyMuPDF (digital), OCRmyPDF (scanned), Tesseract (images)
- Smart router with auto-fallback
- PDF↔Markdown converters
- Obsidian vault writer
- Batch processor + FolderWatcher with SHA-256 dedup

### Phase 2 — CLI Tool ✅
- `ocr-pdf process` — single file
- `ocr-pdf batch` — parallel batch
- `ocr-pdf watch` — folder watcher
- `ocr-pdf convert` — PDF↔MD
- `ocr-pdf mcp` — MCP server

### Phase 3 — MCP Server ✅
- FastMCP stdio server
- 4 tools, 2 resources
- Compatible with Claude Desktop, Cursor, OpenCode

### Phase 4 — OpenCode Integration ✅
- `opencode-skill/SKILL.md` — skill definition
- `.opencode/mcp.json` — MCP auto-discovery
- `.opencode/agents.json` — agent config

### Phase 5 — Web UI (Next.js refactor)
- Refactor existing Next.js app to call Python core

### Phase 6 — Tauri Desktop App
- Tauri + Python sidecar (macOS)

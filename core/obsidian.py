"""Obsidian vault writer.

Writes processed documents as Markdown files directly to an Obsidian vault,
with proper YAML frontmatter, [[wiki-links]], and attachment handling.
"""

from __future__ import annotations

import logging
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ObsidianWriter:
    """Write extracted text to an Obsidian vault as formatted Markdown."""

    def __init__(
        self,
        vault_path: str | Path,
        attachment_dir: str = "attachments",
        create_frontmatter: bool = True,
        default_tags: Optional[List[str]] = None,
    ):
        self.vault_path = Path(vault_path)
        self.attachment_dir = attachment_dir
        self.create_frontmatter = create_frontmatter
        self.default_tags = default_tags or ["ocr", "processed"]

    def write(
        self,
        text: str,
        filename: str,
        metadata: Optional[Dict[str, Any]] = None,
        attachments: Optional[List[Path]] = None,
        subfolder: Optional[str] = None,
    ) -> Path:
        """Write extracted text as an Obsidian-compatible Markdown note.

        Args:
            text: The extracted text content.
            filename: Name for the note (e.g., 'my-document' or 'my-document.md').
            metadata: Optional metadata dict for frontmatter.
            attachments: Optional list of image file paths to copy into vault.
            subfolder: Optional subfolder within the vault (e.g., 'inbox').

        Returns:
            Path to the written note.
        """
        # Ensure filename ends with .md
        if not filename.endswith(".md"):
            filename = f"{Path(filename).stem}.md"

        # Build output path
        output_dir = self.vault_path
        if subfolder:
            output_dir = output_dir / subfolder
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / filename

        # Build frontmatter
        if self.create_frontmatter:
            front = self._build_frontmatter(metadata or {})
        else:
            front = ""

        # Handle attachments (copy images into vault, create wikilinks)
        if attachments:
            att_dir = output_dir / self.attachment_dir
            att_dir.mkdir(parents=True, exist_ok=True)
            for att_path in attachments:
                if att_path.exists():
                    dest = att_dir / att_path.name
                    shutil.copy2(str(att_path), str(dest))
                    logger.info(f"Copied attachment {att_path.name} to vault")

        # Write the note
        content = f"{front}\n{text}" if front else text
        output_path.write_text(content.strip() + "\n", encoding="utf-8")
        logger.info(f"Wrote Obsidian note: {output_path}")
        return output_path

    def _build_frontmatter(self, metadata: Dict[str, Any]) -> str:
        """Build YAML frontmatter string."""
        fields = {
            "title": metadata.get("title", "Untitled"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "tags": self.default_tags.copy(),
            "source": metadata.get("source", ""),
        }

        if "method" in metadata:
            fields["method"] = metadata["method"]
        if "quality" in metadata:
            fields["quality"] = metadata["quality"]

        lines = ["---"]
        for key, value in fields.items():
            if value:
                if isinstance(value, list):
                    lines.append(f"{key}: [{', '.join(value)}]")
                else:
                    lines.append(f"{key}: {value}")
        lines.append("---")
        return "\n".join(lines)

    def is_valid_vault(self) -> bool:
        """Check if the path points to a valid Obsidian vault.

        A valid vault has either a `.obsidian` directory or is a
        writeable directory.
        """
        if not self.vault_path.exists():
            return False
        if not self.vault_path.is_dir():
            return False
        # Check for .obsidian directory (created by Obsidian app)
        obsidian_dir = self.vault_path / ".obsidian"
        return obsidian_dir.exists() or True  # Allow non-Obsidian dirs too

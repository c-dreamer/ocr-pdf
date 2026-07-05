"""Configuration management for ocr-pdf.

Loads settings from config files (YAML) and environment variables.
Config search order:
  1. ./ocr-pdf.yaml / ./ocr-pdf.yml
  2. ~/.config/ocr-pdf/config.yaml
  3. Environment variables (OCR_PDF_*)
  4. Defaults
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional

import yaml


DEFAULT_CONFIG: Dict[str, Any] = {
    "output": {
        "format": "md",
        "directory": "./output",
        "obsidian_vault": None,
        "obsidian_attachment_dir": "attachments",
        "create_frontmatter": True,
    },
    "quality": {
        "enabled": True,
        "min_score": 0.6,
        "min_word_count": 10,
        "max_garbage_ratio": 0.3,
    },
    "router": {
        "prefer_marker": False,
        "prefer_docling": False,
        "fallback_to_ocr": True,
    },
    "watch": {
        "interval": 2.0,
        "patterns": ["*.pdf", "*.png", "*.jpg", "*.jpeg", "*.tiff", "*.bmp"],
    },
    "ocr": {
        "language": "eng",
        "dpi": 200,
    },
}


def _merge(base: dict, override: dict) -> dict:
    """Deep-merge override into base dict."""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _merge(result[key], value)
        else:
            result[key] = value
    return result


def _find_config_file() -> Optional[Path]:
    """Search for config file in standard locations."""
    candidates = [
        Path.cwd() / "ocr-pdf.yaml",
        Path.cwd() / "ocr-pdf.yml",
        Path.home() / ".config" / "ocr-pdf" / "config.yaml",
    ]
    for path in candidates:
        if path.exists():
            return path
    return None


def _load_env_overrides(config: dict) -> dict:
    """Override config from OCR_PDF_* environment variables.

    OCR_PDF_OUTPUT_DIRECTORY -> config['output']['directory']
    OCR_PDF_QUALITY_MIN_SCORE -> config['quality']['min_score']
    etc.
    """
    result = config.copy()
    for key, value in os.environ.items():
        if not key.startswith("OCR_PDF_"):
            continue
        parts = key[8:].lower().split("_")
        target = result
        for part in parts[:-1]:
            if part not in target:
                break
            target = target[part]
        else:
            last_key = parts[-1]
            if last_key in target:
                try:
                    typed_value = type(target[last_key])(value)
                except (ValueError, TypeError):
                    typed_value = value
                target[last_key] = typed_value
    return result


def load_config(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load configuration from file + environment + defaults.

    Args:
        config_path: Explicit path to config file. If None, search standard locations.

    Returns:
        Merged configuration dictionary.
    """
    config = DEFAULT_CONFIG.copy()

    if config_path is None:
        config_path = _find_config_file()

    if config_path and config_path.exists():
        with open(config_path) as f:
            file_config = yaml.safe_load(f) or {}
        config = _merge(config, file_config)

    config = _load_env_overrides(config)
    return config

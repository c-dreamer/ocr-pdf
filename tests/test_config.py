"""Tests for core.config module."""

import os
from pathlib import Path

import pytest
import yaml

from core.config import DEFAULT_CONFIG, load_config


class TestDefaultConfig:
    def test_structure(self):
        assert "output" in DEFAULT_CONFIG
        assert "quality" in DEFAULT_CONFIG
        assert "router" in DEFAULT_CONFIG
        assert "watch" in DEFAULT_CONFIG
        assert "ocr" in DEFAULT_CONFIG

    def test_default_values(self):
        assert DEFAULT_CONFIG["output"]["format"] == "md"
        assert DEFAULT_CONFIG["quality"]["min_score"] == 0.6
        assert DEFAULT_CONFIG["router"]["fallback_to_ocr"] is True


class TestLoadConfig:
    def test_defaults_when_no_file(self):
        cfg = load_config()
        assert cfg["output"]["format"] == "md"

    def test_load_from_yaml(self, tmp_path: Path):
        config_file = tmp_path / "ocr-pdf.yaml"
        config_data = {"output": {"directory": "/custom/path"}, "quality": {"min_score": 0.8}}
        with open(config_file, "w") as f:
            yaml.dump(config_data, f)

        cfg = load_config(config_file)
        assert cfg["output"]["directory"] == "/custom/path"
        assert cfg["quality"]["min_score"] == 0.8

    def test_partial_override(self, tmp_path: Path):
        """Loading a partial config should merge with defaults."""
        config_file = tmp_path / "ocr-pdf.yaml"
        with open(config_file, "w") as f:
            yaml.dump({"ocr": {"language": "fra"}}, f)

        cfg = load_config(config_file)
        assert cfg["ocr"]["language"] == "fra"
        # Other fields should still have defaults
        assert cfg["output"]["format"] == "md"
        assert cfg["quality"]["min_score"] == 0.6

    def test_nonexistent_file_returns_defaults(self):
        cfg = load_config(Path("/nonexistent/config.yaml"))
        assert cfg["output"]["format"] == "md"

    def test_empty_yaml(self, tmp_path: Path):
        config_file = tmp_path / "empty.yaml"
        config_file.write_text("")
        cfg = load_config(config_file)
        assert cfg["output"]["format"] == "md"

    def test_env_override(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
        monkeypatch.setenv("OCR_PDF_QUALITY_MIN_SCORE", "0.95")
        monkeypatch.setenv("OCR_PDF_OUTPUT_DIRECTORY", "/env/path")

        cfg = load_config()
        assert cfg["quality"]["min_score"] == 0.95
        assert cfg["output"]["directory"] == "/env/path"

"""Batch processing and folder watching.

Processes multiple files in parallel, watches directories for new files,
and handles deduplication.
"""

from __future__ import annotations

import hashlib
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set

from core.router import process_file

logger = logging.getLogger(__name__)


def watch_folder(
    input_dir: str | Path,
    output_dir: str | Path,
    patterns: Optional[List[str]] = None,
    interval: float = 2.0,
    max_workers: int = 2,
    config: Optional[Dict[str, Any]] = None,
    on_complete: Optional[Callable] = None,
):
    """Convenience function: create a FolderWatcher and start it.

    Args:
        input_dir: Directory to watch.
        output_dir: Output directory for processed files.
        patterns: Glob patterns for files to process.
        interval: Polling interval in seconds.
        max_workers: Parallel workers.
        config: Optional configuration.
        on_complete: Optional callback per completed file.
    """
    watcher = FolderWatcher(
        input_dir=input_dir,
        output_dir=output_dir,
        patterns=patterns,
        interval=interval,
        max_workers=max_workers,
        config=config,
    )
    watcher.start(on_complete=on_complete)


def process_batch(
    file_paths: List[str | Path],
    output_dir: str | Path,
    max_workers: int = 4,
    config: Optional[Dict[str, Any]] = None,
    on_progress: Optional[Callable] = None,
) -> List[Dict[str, Any]]:
    """Process multiple files.

    Args:
        file_paths: List of file paths to process.
        output_dir: Directory for output files.
        max_workers: Number of parallel workers.
        config: Optional configuration.
        on_progress: Optional callback(result_dict) per completed file.

    Returns:
        List of result dicts (one per file).
    """
    results: List[Dict[str, Any]] = []
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(process_file, path, output_dir, config): path
            for path in file_paths
        }

        for future in as_completed(futures):
            path = futures[future]
            try:
                result = future.result()
                results.append(result)
                if on_progress:
                    on_progress(result)
                status = "✓" if result.get("text") else "✗"
                logger.info(f"{status} {path.name} → method={result.get('method')} "
                           f"quality={result.get('quality', {}).get('overall', 0):.2f}")
            except Exception as e:
                logger.error(f"Failed to process {path}: {e}")
                results.append({
                    "error": str(e),
                    "metadata": {"filename": Path(path).name, "source": str(path)},
                })
                if on_progress:
                    on_progress({"error": str(e), "metadata": {"filename": Path(path).name}})

    return results


class FolderWatcher:
    """Watch a directory for new files and process them automatically.

    Tracks processed files by content hash to avoid re-processing.
    """

    def __init__(
        self,
        input_dir: str | Path,
        output_dir: str | Path,
        patterns: Optional[List[str]] = None,
        interval: float = 2.0,
        max_workers: int = 2,
        config: Optional[Dict[str, Any]] = None,
    ):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.patterns = patterns or ["*.pdf", "*.png", "*.jpg", "*.jpeg", "*.tiff", "*.bmp"]
        self.interval = interval
        self.max_workers = max_workers
        self.config = config
        self._processed_hashes: Set[str] = set()
        self._running = False

    def start(self, on_complete: Optional[Callable] = None):
        """Start watching the directory (blocking).

        Args:
            on_complete: Optional callback(result_dict) per processed file.
        """
        self._running = True
        logger.info(f"Watching {self.input_dir} for new files...")

        try:
            while self._running:
                new_files = self._scan()
                if new_files:
                    logger.info(f"Found {len(new_files)} new file(s)")
                    results = process_batch(
                        new_files, self.output_dir,
                        max_workers=self.max_workers, config=self.config,
                        on_progress=on_complete,
                    )
                    for result in results:
                        if result.get("text"):
                            self._record_hash(result["metadata"]["source"])

                time.sleep(self.interval)
        except KeyboardInterrupt:
            logger.info("Folder watcher stopped by user")
        finally:
            self._running = False

    def stop(self):
        """Stop watching."""
        self._running = False

    def _scan(self) -> List[Path]:
        """Find new files matching patterns that haven't been processed."""
        new_files = []
        for pattern in self.patterns:
            for file_path in self.input_dir.glob(pattern):
                if not file_path.is_file():
                    continue
                if self._is_processed(file_path):
                    continue
                new_files.append(file_path)
        return sorted(new_files)

    def _is_processed(self, file_path: Path) -> bool:
        """Check if a file has already been processed (by content hash)."""
        file_hash = self._content_hash(file_path)
        return file_hash in self._processed_hashes

    def _record_hash(self, file_path: str) -> None:
        """Record a file as processed."""
        try:
            file_hash = self._content_hash(Path(file_path))
            self._processed_hashes.add(file_hash)
        except Exception:
            pass

    def _content_hash(self, file_path: Path, chunk_size: int = 8192) -> str:
        """Compute SHA-256 hash of file content."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                hasher.update(chunk)
        return hasher.hexdigest()

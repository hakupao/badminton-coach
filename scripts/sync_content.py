#!/usr/bin/env python3

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content" / "i18n"
TARGET = ROOT / "public" / "content" / "i18n"


def to_rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def collect_files(root: Path) -> set[str]:
    if not root.exists():
        return set()
    return {
        path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()
    }


def diff_sync_state() -> tuple[list[str], list[str], list[str]]:
    source_files = collect_files(SOURCE)
    target_files = collect_files(TARGET)

    missing = sorted(source_files - target_files)
    extra = sorted(target_files - source_files)

    changed: list[str] = []
    for rel in sorted(source_files & target_files):
        source_file = SOURCE / rel
        target_file = TARGET / rel
        if source_file.read_bytes() != target_file.read_bytes():
            changed.append(rel)

    return missing, extra, changed


def print_sync_diff(missing: list[str], extra: list[str], changed: list[str]) -> None:
    if missing:
        print("Missing in target mirror:")
        for rel in missing:
            print(f"  - {rel}")

    if extra:
        print("Extra files in target mirror:")
        for rel in extra:
            print(f"  - {rel}")

    if changed:
        print("Changed files in target mirror:")
        for rel in changed:
            print(f"  - {rel}")


def check_sync() -> int:
    if not SOURCE.is_dir():
        print(f"Source directory not found: {to_rel(SOURCE)}", file=sys.stderr)
        return 1

    if not TARGET.is_dir():
        print(f"Target mirror not found: {to_rel(TARGET)}")
        return 1

    missing, extra, changed = diff_sync_state()
    if not missing and not extra and not changed:
        print("public/content/i18n is in sync with content/i18n")
        return 0

    print_sync_diff(missing, extra, changed)
    return 1


def sync() -> int:
    if not SOURCE.is_dir():
        print(f"Source directory not found: {to_rel(SOURCE)}", file=sys.stderr)
        return 1

    if TARGET.exists():
        shutil.rmtree(TARGET)

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SOURCE, TARGET)
    print(f"Synced {to_rel(SOURCE)} -> {to_rel(TARGET)}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sync content/i18n into public/content/i18n"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check whether the mirror is up to date without modifying files",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.check:
        return check_sync()
    return sync()


if __name__ == "__main__":
    raise SystemExit(main())

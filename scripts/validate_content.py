#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONTENT_ROOT = ROOT / "content" / "i18n"
SUPPORTED_LANGS = ("en", "zh")
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def to_rel(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def is_iso_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    if not DATE_PATTERN.fullmatch(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def is_within(path: Path, parent: Path) -> bool:
    try:
        path.relative_to(parent)
    except ValueError:
        return False
    return True


class Validator:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.json_cache: dict[Path, Any] = {}

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)

    def load_json(self, path: Path) -> Any:
        if path in self.json_cache:
            return self.json_cache[path]

        if not path.is_file():
            self.error(f"Missing file: {to_rel(path)}")
            return None

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            self.error(
                f"Invalid JSON: {to_rel(path)}:{exc.lineno}:{exc.colno} ({exc.msg})"
            )
            return None

        self.json_cache[path] = data
        return data


def validate_top_files(v: Validator, lang_root: Path) -> None:
    site_path = lang_root / "site.json"
    course_index_path = lang_root / "course" / "index.json"
    knowledge_index_path = lang_root / "knowledge" / "index.json"

    site = v.load_json(site_path)
    if isinstance(site, dict):
        ui = site.get("ui")
        if not isinstance(ui, dict):
            v.error(f"site.json must contain object field 'ui': {to_rel(site_path)}")

    for index_path in (course_index_path, knowledge_index_path):
        index_data = v.load_json(index_path)
        if isinstance(index_data, dict) and "updated" in index_data:
            if not is_iso_date(index_data["updated"]):
                v.error(f"Field 'updated' must be YYYY-MM-DD in {to_rel(index_path)}")


def validate_course(v: Validator, lang_root: Path) -> set[str]:
    course_index_path = lang_root / "course" / "index.json"
    course_index = v.load_json(course_index_path)
    slugs: set[str] = set()
    referenced_files: set[Path] = set()

    if not isinstance(course_index, dict):
        return slugs

    items = course_index.get("items")
    if not isinstance(items, list):
        v.error(f"Field 'items' must be an array in {to_rel(course_index_path)}")
        return slugs

    for i, item in enumerate(items):
        location = f"{to_rel(course_index_path)} items[{i}]"
        if not isinstance(item, dict):
            v.error(f"{location} must be an object")
            continue

        slug = item.get("slug")
        if not isinstance(slug, str) or not slug.strip():
            v.error(f"{location} requires non-empty string 'slug'")
            continue

        if slug in slugs:
            v.error(f"Duplicate course slug '{slug}' in {to_rel(course_index_path)}")
        slugs.add(slug)

        title = item.get("title")
        if not isinstance(title, str) or not title.strip():
            v.error(f"{location} requires non-empty string 'title'")

        rel_path = item.get("path")
        if not isinstance(rel_path, str) or not rel_path.strip():
            v.error(f"{location} requires non-empty string 'path'")
            continue
        if rel_path.startswith("/"):
            v.error(f"{location} path must be relative: '{rel_path}'")
            continue
        if not rel_path.startswith("course/"):
            v.warn(f"{location} path should start with 'course/': '{rel_path}'")

        detail_path = (lang_root / rel_path).resolve()
        if not is_within(detail_path, lang_root.resolve()):
            v.error(f"{location} path escapes language root: '{rel_path}'")
            continue

        referenced_files.add(detail_path)
        detail = v.load_json(detail_path)
        if not isinstance(detail, dict):
            continue

        detail_slug = detail.get("slug")
        if detail_slug != slug:
            v.error(
                f"Course slug mismatch: index '{slug}' vs detail '{detail_slug}' in {to_rel(detail_path)}"
            )

        detail_title = detail.get("title")
        if not isinstance(detail_title, str) or not detail_title.strip():
            v.error(f"Course detail requires non-empty 'title': {to_rel(detail_path)}")

    course_detail_files = {
        path.resolve()
        for path in (lang_root / "course").rglob("*.json")
        if path.name != "index.json"
    }
    unreferenced = sorted(
        to_rel(path) for path in (course_detail_files - referenced_files)
    )
    for rel in unreferenced:
        v.warn(f"Unreferenced course detail file: {rel}")

    return slugs


def validate_knowledge(v: Validator, lang_root: Path) -> tuple[set[str], set[str]]:
    knowledge_index_path = lang_root / "knowledge" / "index.json"
    knowledge_index = v.load_json(knowledge_index_path)
    slugs: set[str] = set()
    category_ids: set[str] = set()
    referenced_files: set[Path] = set()

    if not isinstance(knowledge_index, dict):
        return slugs, category_ids

    categories = knowledge_index.get("categories")
    if not isinstance(categories, list):
        v.error(
            f"Field 'categories' must be an array in {to_rel(knowledge_index_path)}"
        )
        return slugs, category_ids

    for i, category in enumerate(categories):
        cat_loc = f"{to_rel(knowledge_index_path)} categories[{i}]"
        if not isinstance(category, dict):
            v.error(f"{cat_loc} must be an object")
            continue

        category_id = category.get("id")
        if not isinstance(category_id, str) or not category_id.strip():
            v.error(f"{cat_loc} requires non-empty string 'id'")
            continue

        if category_id in category_ids:
            v.error(f"Duplicate knowledge category id '{category_id}'")
        category_ids.add(category_id)

        title = category.get("title")
        if not isinstance(title, str) or not title.strip():
            v.error(f"{cat_loc} requires non-empty string 'title'")

        items = category.get("items")
        if not isinstance(items, list):
            v.error(f"{cat_loc} requires array field 'items'")
            continue

        for j, item in enumerate(items):
            item_loc = f"{cat_loc} items[{j}]"
            if not isinstance(item, dict):
                v.error(f"{item_loc} must be an object")
                continue

            slug = item.get("slug")
            if not isinstance(slug, str) or not slug.strip():
                v.error(f"{item_loc} requires non-empty string 'slug'")
                continue

            if slug in slugs:
                v.error(
                    f"Duplicate knowledge slug '{slug}' in {to_rel(knowledge_index_path)}"
                )
            slugs.add(slug)

            item_title = item.get("title")
            if not isinstance(item_title, str) or not item_title.strip():
                v.error(f"{item_loc} requires non-empty string 'title'")

            rel_path = item.get("path")
            if not isinstance(rel_path, str) or not rel_path.strip():
                v.error(f"{item_loc} requires non-empty string 'path'")
                continue
            if rel_path.startswith("/"):
                v.error(f"{item_loc} path must be relative: '{rel_path}'")
                continue
            if not rel_path.startswith("knowledge/"):
                v.warn(f"{item_loc} path should start with 'knowledge/': '{rel_path}'")

            detail_path = (lang_root / rel_path).resolve()
            if not is_within(detail_path, lang_root.resolve()):
                v.error(f"{item_loc} path escapes language root: '{rel_path}'")
                continue

            referenced_files.add(detail_path)
            detail = v.load_json(detail_path)
            if not isinstance(detail, dict):
                continue

            detail_slug = detail.get("slug")
            if detail_slug != slug:
                v.error(
                    f"Knowledge slug mismatch: index '{slug}' vs detail '{detail_slug}' in {to_rel(detail_path)}"
                )

            detail_title = detail.get("title")
            if not isinstance(detail_title, str) or not detail_title.strip():
                v.error(
                    f"Knowledge detail requires non-empty 'title': {to_rel(detail_path)}"
                )

    knowledge_detail_files = {
        path.resolve()
        for path in (lang_root / "knowledge").rglob("*.json")
        if path.name != "index.json"
    }
    unreferenced = sorted(
        to_rel(path) for path in (knowledge_detail_files - referenced_files)
    )
    for rel in unreferenced:
        v.warn(f"Unreferenced knowledge detail file: {rel}")

    return slugs, category_ids


def validate_language(
    v: Validator, lang: str
) -> tuple[set[str], set[str], set[str], set[str]]:
    lang_root = CONTENT_ROOT / lang
    if not lang_root.is_dir():
        v.error(f"Missing language directory: {to_rel(lang_root)}")
        return set(), set(), set(), set()

    validate_top_files(v, lang_root)
    course_slugs = validate_course(v, lang_root)
    knowledge_slugs, category_ids = validate_knowledge(v, lang_root)
    json_files = {
        path.relative_to(lang_root).as_posix() for path in lang_root.rglob("*.json")
    }
    return course_slugs, knowledge_slugs, category_ids, json_files


def compare_sets(
    v: Validator,
    title: str,
    left_name: str,
    left: set[str],
    right_name: str,
    right: set[str],
) -> None:
    only_left = sorted(left - right)
    only_right = sorted(right - left)

    if only_left:
        v.error(f"{title}: only in {left_name}: {', '.join(only_left)}")
    if only_right:
        v.error(f"{title}: only in {right_name}: {', '.join(only_right)}")


def main() -> int:
    v = Validator()

    if not CONTENT_ROOT.is_dir():
        print(f"Missing directory: {to_rel(CONTENT_ROOT)}", file=sys.stderr)
        return 1

    actual_langs = sorted(path.name for path in CONTENT_ROOT.iterdir() if path.is_dir())
    expected_langs = sorted(SUPPORTED_LANGS)
    if actual_langs != expected_langs:
        v.warn(
            "Language directories differ from supported set: "
            f"expected {expected_langs}, found {actual_langs}"
        )

    lang_data: dict[str, tuple[set[str], set[str], set[str], set[str]]] = {}
    for lang in SUPPORTED_LANGS:
        lang_data[lang] = validate_language(v, lang)

    en_course_slugs, en_knowledge_slugs, en_category_ids, en_json_files = lang_data[
        "en"
    ]
    zh_course_slugs, zh_knowledge_slugs, zh_category_ids, zh_json_files = lang_data[
        "zh"
    ]

    compare_sets(
        v, "Course slugs mismatch", "en", en_course_slugs, "zh", zh_course_slugs
    )
    compare_sets(
        v,
        "Knowledge slugs mismatch",
        "en",
        en_knowledge_slugs,
        "zh",
        zh_knowledge_slugs,
    )
    compare_sets(
        v,
        "Knowledge category ids mismatch",
        "en",
        en_category_ids,
        "zh",
        zh_category_ids,
    )
    compare_sets(
        v, "JSON file parity mismatch", "en", en_json_files, "zh", zh_json_files
    )

    for warning in v.warnings:
        print(f"WARN: {warning}")

    if v.errors:
        for error in v.errors:
            print(f"ERROR: {error}")
        print(f"\nContent validation failed with {len(v.errors)} error(s).")
        return 1

    print("Content validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

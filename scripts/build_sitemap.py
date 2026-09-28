#!/usr/bin/env python3
"""Generate public/sitemap.xml from the content indexes.

Lists the canonical URL of every page in every language (clean paths, explicit
?lang=), with hreflang alternates, matching the canonical tags set by app.js.

    python scripts/build_sitemap.py          # write public/sitemap.xml
    python scripts/build_sitemap.py --check  # fail if it is out of date
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlencode
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "i18n"
OUTPUT = ROOT / "public" / "sitemap.xml"
SITE_ORIGIN = "https://badminton.bojiang.org"
LANGS = {"zh": "zh-Hans", "en": "en"}
DEFAULT_LANG = "zh"


def page_url(path: str, lang: str, slug: str | None = None) -> str:
    params = {"slug": slug} if slug else {}
    params["lang"] = lang
    return f"{SITE_ORIGIN}{path}?{urlencode(params)}"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def collect_pages() -> list[tuple[str, str | None]]:
    """Return (path, slug) pairs. Slugs are shared across languages."""
    index = CONTENT / DEFAULT_LANG
    pages: list[tuple[str, str | None]] = [("/", None)]
    for item in load_json(index / "course" / "index.json").get("items", []):
        pages.append(("/course", item["slug"]))
    for category in load_json(index / "knowledge" / "index.json").get("categories", []):
        for item in category.get("items", []):
            pages.append(("/knowledge", item["slug"]))
    return pages


def build_sitemap() -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for path, slug in collect_pages():
        alternates = [
            f'    <xhtml:link rel="alternate" hreflang="{code}" href="{escape(page_url(path, lang, slug))}"/>'
            for lang, code in LANGS.items()
        ]
        alternates.append(
            f'    <xhtml:link rel="alternate" hreflang="x-default" '
            f'href="{escape(page_url(path, DEFAULT_LANG, slug))}"/>'
        )
        for lang in LANGS:
            lines.append("  <url>")
            lines.append(f"    <loc>{escape(page_url(path, lang, slug))}</loc>")
            lines.extend(alternates)
            lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate public/sitemap.xml from the content indexes.")
    parser.add_argument("--check", action="store_true", help="fail if sitemap.xml is out of date")
    args = parser.parse_args()

    sitemap = build_sitemap()
    if args.check:
        current = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
        if current != sitemap:
            print("public/sitemap.xml is out of date. Run: python scripts/build_sitemap.py")
            return 1
        print("public/sitemap.xml is up to date.")
        return 0

    OUTPUT.write_text(sitemap, encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT).as_posix()} ({sitemap.count('<loc>')} URLs).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

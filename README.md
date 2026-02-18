# badminton-coach

Data-driven static site powered by JSON content.

## Structure
- `content/i18n/en/site.json` English site copy and highlights
- `content/i18n/zh/site.json` Chinese site copy and highlights
- `content/i18n/{lang}/course/index.json` course list
- `content/i18n/{lang}/course/2026/*.json` course detail pages
- `content/i18n/{lang}/knowledge/index.json` knowledge list and categories
- `content/i18n/{lang}/knowledge/{category}/*.json` knowledge detail pages
- `content/media/` shared assets
- `public/` UI templates and assets

## Language
- Add `?lang=en` or `?lang=zh` to the URL.
- The UI stores the last choice in `localStorage`.
- UI labels live in `content/i18n/{lang}/site.json` under `ui`.

## Content schema
- See `content/CONTENT_STRUCTURE.md`.

## Content workflow
- Source of truth is `content/i18n`. Do not edit `public/content/i18n` by hand.
- Validate content structure, path references, and language parity:

```bash
python scripts/validate_content.py
```

- Sync runtime content mirror for static hosting:

```bash
python scripts/sync_content.py
```

- Check whether `public/content/i18n` is in sync (useful in CI):

```bash
python scripts/sync_content.py --check
```

## Run locally
Serve the repository root so `/content/i18n` is accessible.

```bash
python -m http.server
```

Open `http://localhost:8000/public/index.html`.

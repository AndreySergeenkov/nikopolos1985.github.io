# Integration guide

Static HTML page. No build step. Serve this folder as-is.

## Deploy

Keep all six files in one directory. The charts load the three data files
over relative paths, so they must stay next to `index.html`.

    index.html
    octant_leaderboard_categorized_v1.csv
    octant_donor_counts_v1.csv
    octant_chart_data_v1.json
    og-image.png
    README.md

## Built for this URL

    https://octant.app/research/quadratic-funding-in-octant/

Publishing there needs zero changes. Publishing elsewhere: find-replace that
URL with your path (trailing slash) across `index.html`. It appears in the
canonical tag, `og:url`, `og:image`, the JSON-LD, and the copy-for-LLM script.

## Notes

- **Fonts:** Spiegel Sans and Arcane Fable auto-load from your `/assets/`. If
  a rebuild renames those font files, the page falls back to Inter; update the
  `/assets/SpiegelSans-*` and `/assets/arcane_fable-*` paths in the `<style>`
  block.
- **CSP:** the page loads `cdn.jsdelivr.net` (PNG-export buttons) and Google
  Fonts (fallback fonts). Allowlist them or those features break.
- **Indexing:** no `noindex` tag, ready to index.
- **Do not** run a bundler, and do not remove the hidden `id="llm-data"`
  section or the JSON-LD; they feed AI tools and screen readers.

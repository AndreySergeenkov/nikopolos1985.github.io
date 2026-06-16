## What this is

A ready-to-publish research page for octant.app. Plain static HTML, no build
step: drop this folder on your server and serve it.

## The URL it is built for

    https://octant.app/research/quadratic-funding-in-octant/

Publishing there needs zero changes. Publishing at a different path: find-replace
that URL (with a trailing slash) across `index.html`. It sits in the canonical
tag, `og:url`, `og:image`, the JSON-LD, and the copy-for-LLM script.

## Files (keep them together)

| File | Purpose |
|------|---------|
| `index.html` | the page |
| `octant_leaderboard_categorized_v1.csv` | chart data |
| `octant_donor_counts_v1.csv` | chart data |
| `octant_chart_data_v1.json` | chart data |
| `og-image.png` | social preview (1200x630) |

The charts load the data files over relative paths, so they must stay next to
`index.html`. No bundler, just serve the folder.

## Good to know

- **Fonts.** The page auto-loads Spiegel Sans and Arcane Fable from your
  `/assets/`. If a rebuild renames those font files it falls back to Inter;
  update the `/assets/SpiegelSans-*` and `/assets/arcane_fable-*` paths in the
  `<style>` block.
- **External resources.** It loads `cdn.jsdelivr.net` (the PNG-export buttons)
  and Google Fonts (fallback fonts). Allowlist them in your CSP or those
  features break.
- **Leave the hidden block.** Do not remove the `id="llm-data"` section or the
  JSON-LD; they feed AI tools and screen readers.

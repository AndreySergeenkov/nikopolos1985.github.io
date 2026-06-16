# Quadratic Funding in Octant: integration guide

A self-contained research page: "How Quadratic Funding Allocates Capital
in Octant." Plain static HTML, CSS, and JavaScript. No framework, no build
step. To publish it, serve this folder statically.

The page is configured to live at:

    https://octant.app/research/quadratic-funding-in-octant/

If you publish it there, nothing below needs changing. If the path differs,
see "If you publish at a different URL" near the end.

## What to deploy

Keep these five files together in the same directory. The page fetches the
three data files at runtime over relative paths, so if `index.html` is moved
away from them, the charts render empty.

    index.html                              the page
    octant_leaderboard_categorized_v1.csv   loaded by the charts
    octant_donor_counts_v1.csv              loaded by the charts
    octant_chart_data_v1.json               loaded by the charts
    og-image.png                            social share preview (1200x630)

There is no build step. Do not run this through a bundler. Serve the folder.

## Fonts load automatically (and why they might not)

The page asks for Spiegel Sans and Arcane Fable through `@font-face` rules
whose `src` is root-relative, for example `/assets/SpiegelSans-5Regular-*.woff2`.
Served from octant.app, those paths resolve to your own hosted font files, so
the page picks up the Octant typeface with no action from you.

The filenames carry your build hashes. If a future rebuild renames the font
files, these paths stop resolving and the page silently falls back to Inter.
So if the headings and body ever render in the wrong typeface, that is the
cause: update the four `/assets/SpiegelSans-*` paths and the one
`/assets/arcane_fable-*` path in the `<style>` block at the top of
`index.html` to the current filenames.

## Two external resources

The page pulls two things from outside your domain:

1. `html-to-image` from cdn.jsdelivr.net, which powers the "Save chart as PNG"
   buttons.
2. Google Fonts (Inter, IBM Plex Mono, IBM Plex Serif), used only as the
   fallback when Spiegel Sans and Arcane Fable are unavailable.

If your Content-Security-Policy blocks third-party origins, the PNG export
buttons stop working and the fallback fonts do not load (Spiegel from your
own `/assets/` is unaffected). Either allowlist `cdn.jsdelivr.net` and
`fonts.googleapis.com` / `fonts.gstatic.com`, or self-host those two
resources and update the two `<link>`/`<script>` tags.

## Everything is self-hosted in this folder

The page has no dependency on any outside domain for its own content. The
charts read the CSV and JSON copies shipped here over relative paths. The
`og:image` / `twitter:image` preview and the "download dataset" links in the
JSON-LD block use absolute URLs under
`https://octant.app/research/quadratic-funding-in-octant/`, which is where
these files land once the folder is deployed there. The only outside link is
the author's personal site in the JSON-LD `author` block, which is correct as
an identity reference.

Because `og:image` must be an absolute URL (social and search crawlers
require it and do not run JavaScript), that base URL has to match the path
you actually publish at. If it differs, see the last section.

## Indexing

The page is ready to be indexed; there is no `noindex` tag. If you want to
stage it privately first, add a `noindex` meta tag or block the path in your
robots.txt, then remove that when you go live.

## Do not strip the hidden block

Near the end of `<main>` there is a visually-hidden section (`id="llm-data"`)
plus a JSON-LD script in the `<head>`. They are intentional: they expose the
full dataset to AI tools and assistive technology. They are not dead code.

## If you publish at a different URL

Update the hardcoded URL in these spots inside `index.html` (search and
replace `https://octant.app/research/quadratic-funding-in-octant/`):

    <link rel="canonical" ...>
    <meta property="og:url" ...>
    JSON-LD  "url"  and  "mainEntityOfPage" / "@id"
    the Source line in the copy-for-LLM script

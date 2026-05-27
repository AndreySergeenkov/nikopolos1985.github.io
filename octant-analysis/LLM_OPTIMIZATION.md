# LLM optimization notes for `octant-analysis/index.html`

This page uses three independent techniques so an AI tool (ChatGPT,
Claude, Perplexity, Gemini, etc.) gets the full report when a user
shares the URL — regardless of whether the AI executes JavaScript,
clicks anything, or relies on raw HTML parsing.

## Why three things instead of one

Different AI tools fetch and parse pages differently:

| Tool behavior                                         | What it sees |
|-------------------------------------------------------|--------------|
| Plain HTTP GET + Readability (most common)           | Static HTML text, no JS-rendered charts. |
| Headless browser that strips `display:none`          | Visible content only — hidden blocks may be skipped. |
| Structured-data extractor (Google, some LLM pipelines)| `<script type="application/ld+json">` blocks. |
| User pastes content manually                          | Whatever the user copies. |

No single technique covers all four cases. Combining three of them
makes the article robust across tools.

---

## Technique 1 — JSON-LD in `<head>` (schema.org)

**What it is.** A `<script type="application/ld+json">` block in the
page head that describes the article as structured data using the
schema.org vocabulary: `Article`, `Person` (author), `Dataset` (with
download links to the CSV/JSON sources).

**What it carries.** Top-level metadata only — title, author, date,
a short description of what the dataset contains, and links to the
raw data files. Not the full prose or chart tables.

**Why it's there.** Structured-data extractors (Google's rich
results pipeline, some LLM-RAG pipelines, schema-aware crawlers)
read JSON-LD with high confidence. It's the cleanest way to say
"this article is by Andrey Sergeenkov, covers Octant V1, and the
underlying data is at these three URLs."

**Where it is in the page.** Inside `<head>`, right after `<title>`.

## Technique 2 — visually-hidden data appendix in the DOM

**What it is.** A `<section id="llm-data" class="sr-only">` at the
end of `<main>` containing a `<pre>` block with the entire chart
data rendered as Markdown tables: top 10 projects, 9 categories,
Ethereum Infrastructure breakdown, QF leverage buckets, donor
distribution, three project-epoch comparison, pre-QF multipliers,
funding split, etc.

**What it carries.** Every figure that is otherwise shown only
inside a JavaScript-rendered chart. The article prose stays in the
visible HTML; this block only fills in what would be lost if JS is
not executed.

**Why it's there.** The default behavior of most LLM web-fetch
tools is to make a single HTTP GET, convert the HTML to text or
Markdown via a Readability-style pipeline, and feed that to the
model. JavaScript is usually not executed. Without this block, an
LLM that follows a shared URL only sees the prose and empty chart
containers. With this block, it sees the prose plus a clean
Markdown table of every number the charts hold.

**How it's hidden.** The `.sr-only` CSS class keeps the element in
the DOM and in the accessibility tree (visible to screen readers),
but renders it at 1×1px, clipped, with `position: absolute`. This
is the standard accessible-hide pattern. We intentionally avoid
`display: none` and the `hidden` attribute because some headless-
browser-based AI tools strip those.

**Where it is in the page.** Just before `</main>`, after the
Methodology section.

## Technique 3 — "Copy article + chart data for LLM" button

**What it is.** A visible button near the top of the article that,
on click, builds one big Markdown payload (article prose + the
hidden data appendix from technique 2) and copies it to the
clipboard. The reader can then paste it into any AI chat.

**What it carries.** Everything technique 2 carries, plus the
walking text of the article (title, headings, prose paragraphs,
key findings, methodology). One self-contained dump.

**Why it's there.** For readers who explicitly want to feed the
article to an AI tool. Saves them from copying selections by hand.
Also useful for AI tools that don't fetch URLs but accept pasted
context (paid ChatGPT users without browse mode, isolated dev
agents, etc.).

**Where it is in the page.** Right after the opening section
(after the Mashal quote), before the first H2.

## How the three work together

A user can interact with this page in any of these ways and the AI
still gets the data:

1. **User shares the URL into an AI chat.** Tools that do plain GET
   read the visible prose plus technique 2 (the hidden Markdown
   appendix). Tools that read structured data also pick up
   technique 1 (JSON-LD).
2. **User clicks the "Copy for LLM" button and pastes manually.**
   The clipboard payload contains the prose plus the data
   appendix in one Markdown document.
3. **An indexing crawler visits the URL** (Perplexity-Bot,
   ClaudeBot, Google-Extended). It sees JSON-LD, the visible prose,
   and the hidden appendix.
4. **A user downloads the raw CSV/JSON files** directly. The links
   are in the JSON-LD `distribution` array and in the appendix's
   footer.

## What is intentionally NOT done

- **No `llms.txt` file.** That standard is for crawlers exploring a
  domain, not for the URL-share-into-chat flow. It wouldn't be
  consulted when a reader pastes this page's URL into an AI tool.
- **No separate `article.md` file.** Would add a maintenance second
  copy. The hidden appendix and the copy-button cover the same need
  without that overhead.
- **No removal of charts.** The interactive charts stay for human
  readers; technique 2 only duplicates their data as text so AI
  tools that can't see the SVGs still get the numbers.

## Where to look in the code

- JSON-LD: search `application/ld+json` in `index.html`.
- Hidden appendix: search `id="llm-data"` (the `<section>` and
  `<pre>` block at the end of `<main>`).
- Copy button: search `llm-copy-bar` (the visible button HTML) and
  `function copyForLLM` (the click handler).
- `.sr-only` CSS class is defined in the `<style>` block.

import argparse
import json
from pathlib import Path, PurePosixPath
import subprocess
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from xml.etree import ElementTree


ORIGIN = "https://sergeenkov.com"
ENDPOINT = "https://api.indexnow.org/indexnow"
ROOT = Path(__file__).resolve().parents[1]
KEY_FILE = "ba3f55ab3eae4f8bab260aa9d121b26f.txt"
LOCALE_PREFIXES = tuple(ORIGIN + "/" + locale + "/" for locale in ("ru", "zh", "es", "pt-br"))


def fetch(url):
    with urlopen(url, timeout=20) as response:
        return response.read()


def changed_pages(base):
    paths = subprocess.check_output(
        ["git", "diff", "--name-only", "--diff-filter=ACMRT", "-z", base, "HEAD", "--", "*.html"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    ).split("\0")
    urls = set()
    for name in filter(None, paths):
        path = PurePosixPath(name)
        if path.name == "404.html" or any(part.startswith(("_", ".")) for part in path.parts):
            continue
        route = name.removesuffix("index.html") if path.name == "index.html" else name
        urls.add(ORIGIN + "/" + route)
    return urls


def published_pages(key, expected):
    for attempt in range(6):
        try:
            if fetch(f"{ORIGIN}/{KEY_FILE}").decode().strip() == key:
                sitemap = ElementTree.fromstring(fetch(f"{ORIGIN}/sitemap.xml"))
                urls = {node.text for node in sitemap.findall("./{*}url/{*}loc")}
                if expected <= urls:
                    return urls
        except (URLError, TimeoutError, ElementTree.ParseError):
            pass
        if attempt < 5:
            time.sleep(10)
    raise SystemExit("The deployed verification file or sitemap entries could not be confirmed.")


def submit(urls, key):
    request = Request(
        ENDPOINT,
        data=json.dumps({
            "host": "sergeenkov.com",
            "key": key,
            "keyLocation": f"{ORIGIN}/{KEY_FILE}",
            "urlList": sorted(urls),
        }).encode(),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            status = response.status
    except HTTPError as error:
        raise SystemExit(f"IndexNow rejected the submission (HTTP {error.code}).") from None

    if status == 200:
        print(f"IndexNow received {len(urls)} URLs (HTTP 200).")
    elif status == 202:
        print(f"IndexNow received {len(urls)} URLs (HTTP 202, verification pending).")
    else:
        raise SystemExit(f"Unexpected IndexNow response (HTTP {status}).")


def main():
    parser = argparse.ArgumentParser(description="Notify IndexNow about published pages.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--localized", action="store_true", help="Submit the localized pages in the sitemap.")
    mode.add_argument("--since", metavar="SHA", help="Submit pages changed since the previous successful deployment.")
    args = parser.parse_args()

    urls = changed_pages(args.since) if args.since else set()
    if args.since and not urls:
        print("No published HTML pages changed.")
        return

    key = (ROOT / KEY_FILE).read_text(encoding="utf-8").strip()
    sitemap_urls = published_pages(key, urls)
    if args.localized:
        urls = {url for url in sitemap_urls if url.startswith(LOCALE_PREFIXES)}
    if not urls:
        raise SystemExit("No matching URLs were found in the sitemap.")
    submit(urls, key)


if __name__ == "__main__":
    main()

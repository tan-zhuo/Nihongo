#!/usr/bin/env python3
"""
Prefetch memory-aid images for the vocab browser: resolves every vocab word
to its Japanese-Wikipedia page image (hotlinkable upload.wikimedia.org
thumbnail) and writes the hits to public/word-images.json.

Batched 50 titles per request (~84 requests for 4200 words), throttled.
Words without a usable page image are simply absent from the manifest —
the UI shows no image and offers the Google Images link instead.

    python scripts/fetch-word-images.py
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = ROOT / "src" / "data" / "vocab"
OUT = ROOT / "public" / "word-images.json"

UA = {"User-Agent": "nihongo.ink-imagefetch/1.0 (https://www.nihongo.ink)"}
API = "https://ja.wikipedia.org/w/api.php"
BATCH = 50
THUMB = 400


def api(params: dict) -> dict:
    params = dict(params, format="json")
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
        except OSError:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    raise AssertionError


def main() -> int:
    words: list[str] = []
    seen = set()
    for f in ["n5", "n4", "n3", "n2", "n1"]:
        for w in json.loads((VOCAB_DIR / f"{f}.json").read_text(encoding="utf-8")):
            # Nouns only: page images for greetings/verbs/adjectives are
            # historical trivia more often than depictions of the concept.
            if w["pos"] != "noun":
                continue
            if w["word"] not in seen:
                seen.add(w["word"])
                words.append(w["word"])
    print(f"{len(words)} unique words")

    manifest: dict[str, str] = {}
    for i in range(0, len(words), BATCH):
        batch = words[i : i + BATCH]
        d = api({
            "action": "query",
            "prop": "pageimages",
            "pithumbsize": THUMB,
            "redirects": 1,
            "titles": "|".join(batch),
        })
        q = d.get("query", {})
        norm = {n["from"]: n["to"] for n in q.get("normalized", [])}
        redir = {r["from"]: r["to"] for r in q.get("redirects", [])}
        by_title = {p["title"]: p.get("thumbnail", {}).get("source") for p in q.get("pages", {}).values()}
        for w in batch:
            t = norm.get(w, w)
            t = redir.get(t, t)
            src = by_title.get(t)
            if src:
                manifest[w] = src
        print(f"[{min(i + BATCH, len(words))}/{len(words)}] hits so far: {len(manifest)}", flush=True)
        time.sleep(1.0)

    OUT.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"done: {len(manifest)}/{len(words)} words have images → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

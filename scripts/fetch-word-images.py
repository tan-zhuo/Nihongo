#!/usr/bin/env python3
"""
Prefetch memory-aid images for the vocab browser into public/word-images.json.

Three free tiers, best relevance first; a word takes the first tier that hits:
  1. nouns → ja.wikipedia exact-title page image (most representative)
  2. any word still missing → en.wikipedia page image looked up by the cleaned
     English gloss ("to meet" → "meet"), batched
  3. any word still missing → Wikimedia Commons file search by the cleaned
     gloss, first bitmap hit (relevance varies, but the card should rarely be
     imageless — the UI still offers the Google Images link)

All sources are keyless and hotlink-friendly. ~30 min run, network only at
build time; the site ships the manifest.

    python scripts/fetch-word-images.py
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = ROOT / "src" / "data" / "vocab"
OUT = ROOT / "public" / "word-images.json"

UA = {"User-Agent": "nihongo.ink-imagefetch/1.0 (https://www.nihongo.ink)"}
BATCH = 50
THUMB = 400


def api(host: str, params: dict) -> dict:
    params = dict(params, format="json")
    url = f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
        except OSError:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    raise AssertionError


def page_images(host: str, titles: list[str]) -> dict[str, str]:
    """title (as queried) → thumbnail URL, following normalization/redirects."""
    out: dict[str, str] = {}
    for i in range(0, len(titles), BATCH):
        batch = titles[i : i + BATCH]
        d = api(host, {
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
        for t in batch:
            tt = norm.get(t, t)
            tt = redir.get(tt, tt)
            if by_title.get(tt):
                out[t] = by_title[tt]
        time.sleep(0.8)
    return out


def commons_search(query: str) -> str | None:
    d = api("commons.wikimedia.org", {
        "action": "query",
        "generator": "search",
        "gsrnamespace": 6,
        "gsrlimit": 1,
        "gsrsearch": f"{query} filetype:bitmap",
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": THUMB,
    })
    pages = d.get("query", {}).get("pages", {})
    for p in pages.values():
        info = p.get("imageinfo", [{}])[0]
        if info.get("thumburl"):
            return info["thumburl"]
    return None


def clean_gloss(meaning_en: str) -> str:
    g = re.split(r"[;,(（]", meaning_en)[0].strip()
    g = re.sub(r"^(to|a|an|the)\s+", "", g, flags=re.I)
    return g.strip()


def main() -> int:
    words: list[dict] = []
    seen = set()
    for f in ["n5", "n4", "n3", "n2", "n1"]:
        for w in json.loads((VOCAB_DIR / f"{f}.json").read_text(encoding="utf-8")):
            if w["word"] not in seen:
                seen.add(w["word"])
                words.append(w)
    print(f"{len(words)} unique words")

    manifest: dict[str, str] = {}

    # tier 1: ja.wikipedia exact title, nouns only
    nouns = [w["word"] for w in words if w["pos"] == "noun"]
    t1 = page_images("ja.wikipedia.org", nouns)
    manifest.update(t1)
    print(f"tier1 ja-wiki nouns: {len(t1)}/{len(nouns)}")

    # tier 2: en.wikipedia by cleaned gloss
    missing = [w for w in words if w["word"] not in manifest]
    gloss_of = {w["word"]: clean_gloss(w["meaning_en"]) for w in missing}
    glosses = sorted({g for g in gloss_of.values() if g})
    t2 = page_images("en.wikipedia.org", glosses)
    for w in missing:
        g = gloss_of[w["word"]]
        if g in t2:
            manifest[w["word"]] = t2[g]
    print(f"tier2 en-wiki gloss: +{sum(1 for w in missing if w['word'] in manifest)} (glosses hit {len(t2)}/{len(glosses)})")

    # tier 3: Commons search by cleaned gloss (cache per gloss)
    missing = [w for w in words if w["word"] not in manifest]
    cache: dict[str, str | None] = {}
    for i, w in enumerate(missing, 1):
        g = gloss_of.get(w["word"]) or clean_gloss(w["meaning_en"])
        if not g:
            continue
        if g not in cache:
            cache[g] = commons_search(g)
            time.sleep(0.7)
        if cache[g]:
            manifest[w["word"]] = cache[g]
        if i % 100 == 0:
            print(f"tier3 [{i}/{len(missing)}] total {len(manifest)}", flush=True)

    OUT.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"done: {len(manifest)}/{len(words)} words have images → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

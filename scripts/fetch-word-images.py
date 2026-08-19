#!/usr/bin/env python3
"""
Prefetch memory-aid images for the vocab browser into public/word-images.json.

A wrong picture is worse than no picture: the card falls back to a "Google
Images ↗" link, which beats showing a film poster for 提出. So every candidate
has to survive a guard before it ships.

Two tiers, most trustworthy first; a word takes the first tier that hits.
Both are nouns-only — a photo cannot distinguish 走る from 駆ける, and glosses
of verbs and adverbs are homonym magnets ("still" → a distillery):
  1. ja.wikipedia article whose title IS the word — the article is about the
     word itself, so its lead image depicts it
  2. en.wikipedia article whose title IS the cleaned English gloss ("bank
     account" → "bank account") — only when the resolved title still matches
     the gloss and the English article calls itself the same thing in
     Japanese — so "last" can't land on a shoemaker's last

Rejected everywhere: disambiguation pages, articles Wikidata describes as a
work/person/place (the "Run (2020 film)" failure mode), and maintenance icons.
Searching Commons by gloss — the old tier 3 — is gone: it matched filenames,
not meanings, and produced ~2/3 of the manifest as noise.

All sources are keyless and hotlink-friendly. Network is only needed here, at
build time; the site ships the manifest.

    python scripts/fetch-word-images.py [--limit N]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = ROOT / "src" / "data" / "vocab"
OUT = ROOT / "public" / "word-images.json"
AUDIT = ROOT / "scripts" / "word-images-audit.tsv"

UA = {"User-Agent": "nihongo.ink-imagefetch/2.0 (https://www.nihongo.ink)"}
BATCH = 50
THUMB = 400

# Wikidata one-liners that mean "this article is not the everyday concept".
BAD_DESC = re.compile(
    r"\b(film|movie|album|song|single|band|musical|opera|novel|manga|anime|"
    r"video game|television|tv series|episode|magazine|newspaper|comic|"
    r"company|corporation|brand|band|record label|"
    r"surname|given name|family name|footballer|singer|actor|actress|writer|"
    r"politician|municipality|commune|town|village|city|county|province|"
    r"river|island|mountain range|railway station|album by|song by)\b",
    re.I,
)
# Japanese has no word boundaries, so these have to be phrases, not単語 —
# a bare 市 or 名前 matches half the dictionary.
BAD_DESC_JA = re.compile(
    r"(曖昧さ回避|の楽曲|のアルバム|のシングル|のバンド|の映画|の漫画|のアニメ|"
    r"のゲーム|のテレビドラマ|の小説|の雑誌|の企業|の政治家|の俳優|の歌手|"
    r"の作家|の声優|選手$|の市$|の町$|の村$|駅$)"
)
# Maintenance / placeholder graphics that carry no meaning.
JUNK_FILE = re.compile(
    r"(disambig|ambox|question_book|wiki_letter|commons-logo|wiktionary|"
    r"text_document|nuvola|crystal|replace_this_image|no_image|icon|"
    r"emblem|portal|edit-clear|symbol_|_logo\.|padlock)",
    re.I,
)


def api(host: str, params: dict) -> dict:
    params = dict(params, format="json", formatversion=2)
    url = f"https://{host}/w/api.php?" + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return json.load(r)
        except OSError:
            if attempt == 3:
                raise
            time.sleep(5 * (attempt + 1))
    raise AssertionError


def usable(page: dict) -> str | None:
    """The page's lead image, unless anything about the page smells wrong."""
    thumb = (page.get("thumbnail") or {}).get("source")
    if not thumb:
        return None
    if "disambiguation" in (page.get("pageprops") or {}):
        return None
    desc = " ".join((page.get("terms") or {}).get("description", []))
    if BAD_DESC.search(desc) or BAD_DESC_JA.search(desc):
        return None
    if JUNK_FILE.search(urllib.parse.unquote(thumb.rsplit("/", 1)[-1])):
        return None
    return thumb


def lead_images(
    host: str, titles: list[str], seen: dict[str, str] | None = None
) -> dict[str, tuple[str, str]]:
    """
    title (as queried) → (vetted lead-image URL, title it resolved to).
    `seen`, when given, collects queried title → resolved title for every page
    that exists at all, image or not — that is what tier 1b walks.
    """
    out: dict[str, tuple[str, str]] = {}
    for i in range(0, len(titles), BATCH):
        batch = titles[i : i + BATCH]
        d = api(host, {
            "action": "query",
            "prop": "pageimages|pageprops|pageterms",
            "piprop": "thumbnail",
            "pithumbsize": THUMB,
            "pilimit": len(batch),  # defaults to 1 — without this only one page answers
            "ppprop": "disambiguation",
            "wbptterms": "description",
            "redirects": 1,
            "titles": "|".join(batch),
        })
        q = d.get("query", {})
        norm = {n["from"]: n["to"] for n in q.get("normalized", [])}
        redir = {r["from"]: r["to"] for r in q.get("redirects", [])}
        by_title = {p["title"]: p for p in q.get("pages", []) if not p.get("missing")}
        for t in batch:
            tt = redir.get(norm.get(t, t), norm.get(t, t))
            page = by_title.get(tt)
            if page is not None and seen is not None:
                seen[t] = page["title"]
            img = usable(page) if page else None
            if img:
                out[t] = (img, page["title"])
        print(f"  …{min(i + BATCH, len(titles))}/{len(titles)} ({len(out)} hits)", flush=True)
        time.sleep(0.6)
    return out


def langlinks(host: str, lang: str, titles: list[str]) -> dict[str, str]:
    """title on `host` → title of the same Wikidata concept in `lang`."""
    out: dict[str, str] = {}
    for i in range(0, len(titles), BATCH):
        batch = titles[i : i + BATCH]
        d = api(host, {
            "action": "query",
            "prop": "langlinks",
            "lllang": lang,
            "lllimit": "max",
            "titles": "|".join(batch),
        })
        for p in d.get("query", {}).get("pages", []):
            links = p.get("langlinks") or []
            if links:
                out[p["title"]] = links[0]["title"]
        time.sleep(0.6)
    return out


def clean_gloss(meaning_en: str) -> str:
    g = re.split(r"[;,(（/]", meaning_en)[0].strip()
    g = re.sub(r"^(to|a|an|the)\s+", "", g, flags=re.I)
    return g.strip()


def same_concept(gloss: str, title: str) -> bool:
    """
    en-wiki resolved the gloss to the article of that name, not to a namesake.
    A redirect may inflect it ("reckless" → "Recklessness"), which is still the
    same concept; anything longer than that is a different subject.
    """
    norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower()).strip()
    g, t = norm(gloss), norm(title)
    if not g or not t:
        return False
    long, short = (g, t) if len(g) >= len(t) else (t, g)
    return long.startswith(short) and len(long) - len(short) <= 4


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="only process the first N words (smoke test)")
    args = ap.parse_args()

    words: list[dict] = []
    seen = set()
    for level in ["n5", "n4", "n3", "n2", "n1"]:
        for w in json.loads((VOCAB_DIR / f"{level}.json").read_text(encoding="utf-8")):
            if w["word"] not in seen:
                seen.add(w["word"])
                words.append(w)
    if args.limit:
        words = words[: args.limit]
    print(f"{len(words)} unique words")

    manifest: dict[str, str] = {}
    source: dict[str, str] = {}

    # tier 1 — the ja article for the word itself
    nouns = [w["word"] for w in words if w["pos"] == "noun"]
    print(f"tier1: {len(nouns)} nouns → ja.wikipedia")
    resolved: dict[str, str] = {}
    for word, (url, _) in lead_images("ja.wikipedia.org", nouns, resolved).items():
        manifest[word] = url
        source[word] = "ja.wikipedia.org"
    print(f"tier1 kept {len(manifest)}/{len(nouns)}")

    # tier 1b — the article exists but carries no image; the *same* concept on
    # en.wikipedia usually does. The interlanguage link keeps the identity, so
    # this is as trustworthy as tier 1 and roughly doubles it.
    imageless = [w for w in nouns if w in resolved and w not in manifest]
    print(f"tier1b: {len(imageless)} imageless ja articles → en via langlinks")
    en_of = langlinks("ja.wikipedia.org", "en", [resolved[w] for w in imageless])
    pairs = [(w, en_of[resolved[w]]) for w in imageless if resolved[w] in en_of]
    en_hits = lead_images("en.wikipedia.org", sorted({t for _, t in pairs}))
    kept1b = 0
    for word, en_title in pairs:
        if en_title in en_hits and word not in manifest:
            manifest[word] = en_hits[en_title][0]
            source[word] = "en.wikipedia.org (ja article)"
            kept1b += 1
    print(f"tier1b kept +{kept1b} (of {len(pairs)} linked)")

    # tier 2 — the en article for the gloss, only when the title matches it.
    # Nouns only: an English gloss of a verb or an adverb is a homonym magnet
    # ("still" → a distillery, "please" → a bus named Please).
    missing = [w for w in words if w["pos"] == "noun" and w["word"] not in manifest]
    gloss_of = {w["word"]: clean_gloss(w["meaning_en"]) for w in missing}
    glosses = sorted({g for g in gloss_of.values() if len(g) > 2})
    print(f"tier2: {len(glosses)} glosses → en.wikipedia")
    hits = lead_images("en.wikipedia.org", glosses)
    # An exact title match is not enough: "last" is an article about shoemakers'
    # lasts, "progress" about an 1895 magazine. Ask the English article what it
    # is called in Japanese — if that name has nothing to do with the word we
    # started from, the gloss was a homonym and the image is wrong.
    ja_of = langlinks("en.wikipedia.org", "ja", sorted({t for _, t in hits.values()}))
    kept = 0
    for w in missing:
        g = gloss_of[w["word"]]
        if g not in hits:
            continue
        url, resolved = hits[g]
        if not same_concept(g, resolved):
            continue
        ja_title = ja_of.get(resolved)
        if not ja_title or not (ja_title in w["word"] or w["word"] in ja_title):
            continue
        manifest[w["word"]] = url
        source[w["word"]] = "en.wikipedia.org"
        kept += 1
    print(f"tier2 kept +{kept} (glosses hit {len(hits)}/{len(glosses)})")

    # utm_source carries the host only; the audit table keeps the finer tier.
    tagged = {
        w: u + ("&" if "?" in u else "?") + urllib.parse.urlencode(
            {"utm_source": source[w].split(" ")[0], "utm_campaign": "nihongo.ink"}
        )
        for w, u in sorted(manifest.items())
    }
    OUT.write_text(json.dumps(tagged, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    by_word = {w["word"]: w for w in words}
    AUDIT.write_text(
        "word\tpos\tmeaning_en\tsource\tfile\n"
        + "".join(
            f"{w}\t{by_word[w]['pos']}\t{by_word[w]['meaning_en']}\t{source[w]}\t"
            f"{urllib.parse.unquote(manifest[w].split('?')[0].rsplit('/', 1)[-1])}\n"
            for w in sorted(manifest)
        ),
        encoding="utf-8",
    )
    print(f"done: {len(manifest)}/{len(words)} words have a vetted image → {OUT}")
    print(f"audit table → {AUDIT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""
Build src/data/vocab/accents.json — vocab word id → Tokyo pitch-accent type —
from the Kanjium accent database (github.com/mifunetoshiro/kanjium, which
compiles NHK/大辞林 accent data).

Lookup is (surface, reading-in-hiragana); kana-only words fall back to the
reading itself as surface. Where Kanjium lists several accents ("0,2") the
first (most common) is kept.

    python scripts/build-accents.py path/to/accents.txt
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = ROOT / "src" / "data" / "vocab"
OUT = VOCAB_DIR / "accents.json"


def kata2hira(s: str) -> str:
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)


def main() -> int:
    accents_path = Path(sys.argv[1])
    table: dict[tuple[str, str], int] = {}
    by_surface: dict[str, int] = {}
    for line in accents_path.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) < 3:
            continue
        surface, reading, accent = parts[0], parts[1], parts[2]
        try:
            first = int(accent.split(",")[0].split(";")[0].strip("()"))
        except ValueError:
            continue
        key = (surface, kata2hira(reading) if reading else "")
        table.setdefault(key, first)
        by_surface.setdefault(surface, first)

    out: dict[str, int] = {}
    total = 0
    for f in ["n5", "n4", "n3", "n2", "n1"]:
        for w in json.loads((VOCAB_DIR / f"{f}.json").read_text(encoding="utf-8")):
            total += 1
            hira = kata2hira(w["reading"])
            for key in [(w["word"], hira), (w["word"], ""), (hira, hira), (hira, "")]:
                if key in table:
                    out[w["id"]] = table[key]
                    break
            else:
                if w["word"] in by_surface:
                    out[w["id"]] = by_surface[w["word"]]

    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(out)}/{total} words have accent data → {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

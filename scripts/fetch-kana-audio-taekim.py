#!/usr/bin/env python3
"""
Fetch the 五十音 pronunciation clips from Tae Kim's Guide to Japanese
(www.guidetojapanese.org, CC BY-SA 3.0) — real native-speaker recordings,
replacing TTS for the kana chart. Attribution lives in the site footer.

Each source file speaks the kana twice with silence around; the first
occurrence is cut out by RMS-energy segmentation, faded, normalized to the
site's -6 dBFS reference and re-encoded like the rest of the audio.

    python scripts/fetch-kana-audio-taekim.py            # all clips
    python scripts/fetch-kana-audio-taekim.py --only ka,shi

Needs: numpy, soundfile (pip) and ffmpeg on PATH. Network access at fetch
time only; the site ships the resulting mp3 files.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
KANA_TS = ROOT / "src" / "data" / "kana.ts"
OUT_DIR = ROOT / "public" / "audio" / "kana"
MANIFEST = ROOT / "src" / "data" / "audio-manifest.json"

BASE = "http://www.guidetojapanese.org/audio/{}.mp3"
# The source uses jya/jyu/jyo where the site's chart uses ja/ju/jo.
REMOTE_NAME = {"ja": "jya", "ju": "jyu", "jo": "jyo"}

SR = 24000
TARGET_DBFS = -6.0
LEAD, TAIL = 0.05, 0.12
FADE_IN, FADE_OUT = 0.012, 0.018
WIN = 0.02
THRESH_DB = -34.0
MIN_GAP = 0.12
MIN_SEG = 0.12


def load_kana() -> list[tuple[str, str]]:
    src = KANA_TS.read_text(encoding="utf-8")
    pairs, seen = [], set()
    for _h, k, romaji in re.findall(
        r"c\('([^']+)',\s*'([^']+)',\s*((?:'[^']*'(?:,\s*)?)+)\)", src
    ):
        stem = re.findall(r"'([^']*)'", romaji)[0]
        if stem in seen:
            continue
        seen.add(stem)
        pairs.append((k, stem))
    return pairs


def fetch(stem: str, dest: Path) -> None:
    url = BASE.format(REMOTE_NAME.get(stem, stem))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (nihongo.ink audio fetch)"})
    for attempt in range(4):
        try:
            data = urllib.request.urlopen(req, timeout=30).read()
            if len(data) < 5000:
                raise OSError(f"suspiciously small response ({len(data)} bytes)")
            dest.write_bytes(data)
            return
        except OSError:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def decode(path: Path) -> np.ndarray:
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = Path(tmp.name)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path),
             "-ac", "1", "-ar", str(SR), str(wav)],
            check=True,
        )
        audio, _ = sf.read(str(wav), dtype="float32")
    finally:
        wav.unlink(missing_ok=True)
    return audio.astype(np.float32)


def voiced_regions(audio: np.ndarray) -> list[tuple[float, float]]:
    win = int(SR * WIN)
    n = len(audio) // win
    rms = np.sqrt(np.mean(audio[: n * win].reshape(n, win) ** 2, axis=1))
    floor = rms.max() * (10 ** (THRESH_DB / 20.0))
    on = rms > floor
    regions: list[list[float]] = []
    for i, v in enumerate(on):
        t0, t1 = i * WIN, (i + 1) * WIN
        if v:
            if regions and t0 - regions[-1][1] <= MIN_GAP:
                regions[-1][1] = t1
            else:
                regions.append([t0, t1])
    return [(a, b) for a, b in regions if b - a >= MIN_SEG]


def shape(audio: np.ndarray, start: float, end: float) -> np.ndarray:
    clip = audio[max(0, int((start - LEAD) * SR)) : min(len(audio), int((end + TAIL) * SR))].copy()
    n = min(int(SR * FADE_IN), len(clip) // 2)
    if n:
        clip[:n] *= 0.5 * (1 - np.cos(np.linspace(0, np.pi, n)))
    m = min(int(SR * FADE_OUT), len(clip) // 2)
    if m:
        clip[-m:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, m)))
    peak = float(np.max(np.abs(clip)))
    if peak > 0:
        clip *= 10 ** (TARGET_DBFS / 20.0) / peak
    return clip.astype(np.float32)


def encode_mp3(audio: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wav = Path(tmp.name)
    try:
        sf.write(str(wav), audio, SR)
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav),
             "-ac", "1", "-ar", "44100", "-b:a", "48k", "-f", "mp3", str(path)],
            check=True,
        )
    finally:
        wav.unlink(missing_ok=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", help="comma-separated romaji stems")
    args = ap.parse_args()

    pairs = load_kana()
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        pairs = [p for p in pairs if p[1] in wanted]

    durations = []
    for i, (kata, stem) in enumerate(pairs, 1):
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            raw = Path(tmp.name)
        try:
            fetch(stem, raw)
            audio = decode(raw)
        finally:
            raw.unlink(missing_ok=True)

        regions = voiced_regions(audio)
        if not regions:
            raise SystemExit(f"{stem} ({kata}): no voiced region found")
        # The speaker says the kana twice; take the first occurrence.
        start, end = regions[0]
        clip = shape(audio, start, end)
        encode_mp3(clip, OUT_DIR / f"{stem}.mp3")
        durations.append(len(clip) / SR)
        print(f"[{i}/{len(pairs)}] {stem} ({kata}) {len(clip) / SR:.2f}s ({len(regions)} regions)", flush=True)
        time.sleep(0.4)  # be polite to the source server

    stems = sorted(p[1] for p in load_kana())
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["kana"] = stems
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        f"\ndone: {len(durations)} clips, "
        f"{min(durations):.2f}-{max(durations):.2f}s (mean {sum(durations)/len(durations):.2f}s)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

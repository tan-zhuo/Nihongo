#!/usr/bin/env python3
"""
Generate the 五十音 pronunciation clips with Microsoft Edge neural TTS
(ja-JP-NanamiNeural) — a standard broadcast-register voice, replacing the
VOICEVOX character voice for the kana chart only (article audio stays
VOICEVOX).

Same carrier trick as the VOICEVOX script: each kana is synthesized three
times — カ。カ。カ。 — and the MIDDLE occurrence is cut out, so the clip
carries real articulation with speech on both sides. Edge TTS exposes no
phoneme timings, so the three occurrences are located by RMS-energy
segmentation and the middle voiced region is taken.

Readings are given in katakana so orthographic rules don't apply (は→ハ
keeps "ha"); ヲ is correctly read "o", ン is "n".

    python scripts/generate-kana-audio-edge.py            # all clips
    python scripts/generate-kana-audio-edge.py --only ka,shi

Needs: edge-tts, numpy, soundfile (pip) and ffmpeg on PATH. Network access
required at generation time only; the site ships the resulting mp3 files.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
KANA_TS = ROOT / "src" / "data" / "kana.ts"
OUT_DIR = ROOT / "public" / "audio" / "kana"
MANIFEST = ROOT / "src" / "data" / "audio-manifest.json"

VOICE = "ja-JP-NanamiNeural"
RATE = "-20%"  # slower = clearer articulation for learners
SR = 24000
TARGET_DBFS = -6.0  # matches the article tracks
LEAD, TAIL = 0.05, 0.12  # seconds of context kept around the cut mora
FADE_IN, FADE_OUT = 0.012, 0.018

# RMS-envelope segmentation
WIN = 0.02  # window seconds
THRESH_DB = -34.0  # below peak
MIN_GAP = 0.08  # merge voiced regions closer than this (seconds)
MIN_SEG = 0.05  # drop blips shorter than this (seconds)


def load_kana() -> list[tuple[str, str]]:
    """(katakana, romaji-stem) pairs from the chart the site renders."""
    src = KANA_TS.read_text(encoding="utf-8")
    pairs, seen = [], set()
    for _h, k, romaji in re.findall(
        r"c\('([^']+)',\s*'([^']+)',\s*((?:'[^']*'(?:,\s*)?)+)\)", src
    ):
        stem = re.findall(r"'([^']*)'", romaji)[0]
        if stem in seen:  # じ/ぢ and ず/づ are homophones sharing one file
            continue
        seen.add(stem)
        pairs.append((k, stem))
    return pairs


async def synth_mp3(text: str, path: Path) -> None:
    import edge_tts

    await edge_tts.Communicate(text, voice=VOICE, rate=RATE).save(str(path))


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
    """Merged (start, end) seconds of above-threshold energy."""
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
        text = "。".join([kata] * 3) + "。"
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            raw = Path(tmp.name)
        try:
            asyncio.run(synth_mp3(text, raw))
            audio = decode(raw)
        finally:
            raw.unlink(missing_ok=True)

        regions = voiced_regions(audio)
        if len(regions) != 3:
            raise SystemExit(
                f"{stem} ({kata}): expected 3 voiced regions, got {len(regions)}: "
                f"{[(round(a, 2), round(b, 2)) for a, b in regions]}"
            )
        # Prefer the middle occurrence (speech on both sides). If the engine
        # ran two occurrences together the merged region is far longer than
        # its siblings — fall back to the cleanest remaining region.
        shortest = min(b - a for a, b in regions)
        candidates = [r for r in (regions[1], regions[2], regions[0]) if (r[1] - r[0]) <= 1.6 * shortest]
        if not candidates:
            raise SystemExit(f"{stem} ({kata}): no clean region among {regions}")
        start, end = candidates[0]
        clip = shape(audio, start, end)
        encode_mp3(clip, OUT_DIR / f"{stem}.mp3")
        durations.append(len(clip) / SR)
        print(f"[{i}/{len(pairs)}] {stem} ({kata}) {len(clip) / SR:.2f}s")

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

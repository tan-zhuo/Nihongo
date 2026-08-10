#!/usr/bin/env python3
"""
Generate the 五十音 pronunciation clips for public/audio/kana/.

Why this is not just "synthesize one kana":
neural TTS is trained on connected speech, so asking it for a single isolated
mora yields a clipped, flat token that sounds artificial. Instead each kana is
synthesized inside a three-times carrier — カ'、カ'、カ' — and the MIDDLE
occurrence is cut out. The middle one has real speech on both sides, so it
carries genuine articulation and a real pitch contour, and because every kana
sits in an identical prosodic slot the whole chart stays consistent in pitch
and level (cutting from a heterogeneous gojuon row does not: the engine renders
post-pause bare vowels up to 25 dB quieter than their neighbours).

Readings come from the engine's phonetic kana notation (is_kana=true), never
from plain text — text input would apply Japanese orthography and read は as
"wa" and へ as "e".

Requires the VOICEVOX ENGINE running locally (generation time only; the site
itself ships the resulting mp3 files and needs no engine, model or API):
    cd voicevox/linux-cpu-x64 && ./run --host 127.0.0.1 --port 50021

    python scripts/generate-kana-audio.py           # all 102 clips
    python scripts/generate-kana-audio.py --only ka,shi
"""

from __future__ import annotations

import argparse
import io
import json
import re
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
KANA_TS = ROOT / "src" / "data" / "kana.ts"
OUT_DIR = ROOT / "public" / "audio" / "kana"
MANIFEST = ROOT / "src" / "data" / "audio-manifest.json"

HOST = "http://127.0.0.1:50021"
SPEAKER = 2  # 四国めたん (ノーマル)
SR = 24000
TARGET_DBFS = -6.0  # matches the article tracks

# Long engine-default pauses are kept deliberately: shortening them makes the
# engine render the carrier's morae markedly quieter.
QUERY = dict(speedScale=0.9, intonationScale=1.0, prePhonemeLength=0.2, postPhonemeLength=0.35)
LEAD, TAIL = 0.06, 0.14  # seconds of context kept around the cut mora
FADE_IN, FADE_OUT = 0.012, 0.018


def post(path: str, data: bytes | None = None, ctype: str | None = None) -> bytes:
    req = urllib.request.Request(HOST + path, data=data or b"", method="POST")
    if ctype:
        req.add_header("Content-Type", ctype)
    return urllib.request.urlopen(req, timeout=180).read()


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


def query_for(notation: str) -> dict:
    q = json.loads(post("/audio_query?" + urllib.parse.urlencode({"text": "あ", "speaker": SPEAKER})))
    q["accent_phrases"] = json.loads(
        post("/accent_phrases?" + urllib.parse.urlencode(
            {"text": notation, "speaker": SPEAKER, "is_kana": "true"}))
    )
    q.update(QUERY)
    return q


def synth(q: dict) -> np.ndarray:
    wav = post(f"/synthesis?speaker={SPEAKER}", json.dumps(q).encode(), "application/json")
    audio, _ = sf.read(io.BytesIO(wav), dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return audio.astype(np.float32)


def mora_spans(q: dict) -> list[tuple[str, float, float]]:
    """(text, start, end) per mora in rendered-audio seconds."""
    speed = q["speedScale"]
    t = q["prePhonemeLength"]
    out = []
    for ap in q["accent_phrases"]:
        for m in ap["moras"]:
            start = t
            t += (m["consonant_length"] or 0.0) + m["vowel_length"]
            out.append((m["text"], start / speed, t / speed))
        if ap.get("pause_mora"):
            t += ap["pause_mora"]["vowel_length"] * q.get("pauseLengthScale", 1.0)
    return out


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

    try:
        urllib.request.urlopen(f"{HOST}/version", timeout=5).read()
    except OSError as exc:
        raise SystemExit(
            f"VOICEVOX engine not reachable at {HOST} ({exc}).\n"
            "Start it with: cd voicevox/linux-cpu-x64 && ./run --host 127.0.0.1 --port 50021"
        ) from exc

    pairs = load_kana()
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        pairs = [p for p in pairs if p[1] in wanted]

    durations = []
    for i, (kata, stem) in enumerate(pairs, 1):
        notation = "、".join([f"{kata}'"] * 3)
        q = query_for(notation)
        audio = synth(q)
        spans = mora_spans(q)
        # Every carrier item is one mora, so the middle item is span index 1.
        text, start, end = spans[1]
        if text != kata:
            raise SystemExit(f"{stem}: engine returned mora {text!r}, expected {kata!r}")
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

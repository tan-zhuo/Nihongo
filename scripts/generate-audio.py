#!/usr/bin/env python3
"""
Offline Japanese TTS generation for Nihongo articles.

Engine: Kokoro v1.0 (ONNX) + misaki Japanese G2P (pyopenjtalk/fugashi).
License: Apache-2.0 (model weights + code). No attribution required.

For every article in src/data/articles/*.json it synthesizes each sentence of
the article's `trans` array separately, concatenates them (with a short pause
between sentences) into a single mp3 at public/audio/<article-id>.mp3, and
records each sentence's start offset in src/data/audio-manifest.json:

    { "n5-a1": { "dur": 42.5, "starts": [0, 5.2, 11.8, ...] }, ... }

Requirements (installed in /root/tts-venv):
    pip install kokoro-onnx soundfile "misaki[ja]" unidic-lite
Model files (~354 MB) in /root/tts-models:
    kokoro-v1.0.onnx, voices-v1.0.bin
    https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0
ffmpeg is used for mp3 encoding (mono, 44.1 kHz, 48 kbps).

Usage:
    /root/tts-venv/bin/python scripts/generate-audio.py            # everything
    /root/tts-venv/bin/python scripts/generate-audio.py --limit 1  # smoke test
    /root/tts-venv/bin/python scripts/generate-audio.py --force    # re-render
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

# Use all cores for ONNX runtime unless the caller said otherwise.
os.environ.setdefault("OMP_NUM_THREADS", str(os.cpu_count() or 4))

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
ARTICLES_DIR = ROOT / "src" / "data" / "articles"
AUDIO_DIR = ROOT / "public" / "audio"
MANIFEST_PATH = ROOT / "src" / "data" / "audio-manifest.json"

MODEL_DIR = Path(os.environ.get("KOKORO_MODEL_DIR", "/root/tts-models"))
MODEL_PATH = MODEL_DIR / "kokoro-v1.0.onnx"
VOICES_PATH = MODEL_DIR / "voices-v1.0.bin"

# Order matters only for --limit (easiest levels first).
ARTICLE_FILES = ["n5.json", "n4.json", "n3.json", "n2.json", "n1.json", "stories.json"]

SAMPLE_RATE = 24000  # Kokoro's native output rate
DEFAULT_VOICE = "jf_alpha"  # Japanese female; alternatives: jf_gongitsune,
# jf_nezumi, jf_tebukuro, jm_kumo (male)
DEFAULT_SPEED = 0.95
SENTENCE_GAP = 0.45  # seconds of silence inserted after each sentence
LEAD_IN = 0.15  # seconds of silence before the first sentence


def load_articles() -> list[dict]:
    articles: list[dict] = []
    for name in ARTICLE_FILES:
        path = ARTICLES_DIR / name
        if not path.exists():
            print(f"  ! missing {path}", file=sys.stderr)
            continue
        for art in json.loads(path.read_text(encoding="utf-8")):
            if art.get("trans"):
                articles.append(art)
            else:
                print(f"  ! {art.get('id')} has no trans[], skipping", file=sys.stderr)
    return articles


def load_manifest(path: Path) -> dict:
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return {
                    "articles": data.get("articles", {}),
                    "kana": data.get("kana", []),
                }
        except json.JSONDecodeError:
            print("  ! manifest was corrupt, starting fresh", file=sys.stderr)
    return {"articles": {}, "kana": []}


def write_manifest(manifest: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    articles = manifest.get("articles", {})
    ordered = {
        "articles": {k: articles[k] for k in sorted(articles)},
        "kana": sorted(set(manifest.get("kana", []))),
    }
    path.write_text(
        json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def load_kana() -> list[tuple[str, str]]:
    """(hiragana, romaji-stem) pairs parsed out of the TS kana chart."""
    src = (ROOT / "src" / "data" / "kana.ts").read_text(encoding="utf-8")
    pairs: list[tuple[str, str]] = []
    for h, _k, romaji in re.findall(
        r"c\('([^']+)',\s*'([^']+)',\s*((?:'[^']*'(?:,\s*)?)+)\)", src
    ):
        first = re.findall(r"'([^']*)'", romaji)[0]
        pairs.append((h, first))
    return pairs


class Synth:
    """Lazily-loaded Kokoro + misaki Japanese G2P."""

    def __init__(self, voice: str, speed: float):
        from kokoro_onnx import Kokoro
        from misaki import ja

        if not MODEL_PATH.exists() or not VOICES_PATH.exists():
            raise SystemExit(
                f"Model files not found in {MODEL_DIR}.\n"
                "Download kokoro-v1.0.onnx and voices-v1.0.bin from\n"
                "https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0"
            )
        self.kokoro = Kokoro(str(MODEL_PATH), str(VOICES_PATH))
        self.g2p = ja.JAG2P()
        self.voice = voice
        self.speed = speed

    def sentence(self, text: str) -> np.ndarray:
        phonemes, _ = self.g2p(text)
        if not phonemes.strip():
            return np.zeros(0, dtype=np.float32)
        audio, sr = self.kokoro.create(
            phonemes, voice=self.voice, speed=self.speed, is_phonemes=True
        )
        assert sr == SAMPLE_RATE, f"unexpected sample rate {sr}"
        return audio.astype(np.float32)

    def article(self, sentences: list[str]) -> tuple[np.ndarray, list[float]]:
        """Returns (concatenated audio, per-sentence start offsets in seconds)."""
        gap = np.zeros(int(SAMPLE_RATE * SENTENCE_GAP), dtype=np.float32)
        parts: list[np.ndarray] = [np.zeros(int(SAMPLE_RATE * LEAD_IN), dtype=np.float32)]
        starts: list[float] = []
        cursor = len(parts[0])
        for text in sentences:
            starts.append(round(cursor / SAMPLE_RATE, 3))
            chunk = self.sentence(text)
            parts.append(chunk)
            parts.append(gap)
            cursor += len(chunk) + len(gap)
        return np.concatenate(parts), starts


def encode_mp3(audio: np.ndarray, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_wav = Path(tmp.name)
    try:
        sf.write(str(tmp_wav), audio, SAMPLE_RATE)
        tmp_mp3 = out_path.with_suffix(".mp3.tmp")
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(tmp_wav),
                "-ac", "1", "-ar", "44100", "-b:a", "48k",
                "-f", "mp3", str(tmp_mp3),
            ],
            check=True,
        )
        shutil.move(str(tmp_mp3), str(out_path))
    finally:
        tmp_wav.unlink(missing_ok=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=None, help="only process the first N articles")
    ap.add_argument("--only", action="append", default=None, help="only this article id (repeatable)")
    ap.add_argument("--voice", default=DEFAULT_VOICE, help=f"Kokoro voice (default {DEFAULT_VOICE})")
    ap.add_argument("--speed", type=float, default=DEFAULT_SPEED, help=f"speaking rate (default {DEFAULT_SPEED})")
    ap.add_argument("--force", action="store_true", help="re-render even if the mp3 exists")
    ap.add_argument("--out-dir", default=str(AUDIO_DIR), help="mp3 output directory")
    ap.add_argument("--manifest", default=str(MANIFEST_PATH), help="manifest json path")
    ap.add_argument("--kana", action="store_true", help="also render the gojuon chart clips")
    ap.add_argument("--kana-only", action="store_true", help="render only the kana clips")
    args = ap.parse_args()
    manifest_path = Path(args.manifest)

    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg not found on PATH")

    out_dir = Path(args.out_dir)
    articles = [] if args.kana_only else load_articles()
    if args.only:
        wanted = set(args.only)
        articles = [a for a in articles if a["id"] in wanted]
    if args.limit is not None:
        articles = articles[: args.limit]

    manifest = load_manifest(manifest_path)
    synth: Synth | None = None
    total_audio = 0.0
    total_wall = 0.0
    made = skipped = 0

    for idx, art in enumerate(articles, 1):
        aid = art["id"]
        out_path = out_dir / f"{aid}.mp3"
        if out_path.exists() and not args.force and aid in manifest["articles"]:
            print(f"[{idx}/{len(articles)}] {aid}: exists, skipping")
            skipped += 1
            continue

        sentences = [t["ja"] for t in art["trans"] if t.get("ja", "").strip()]
        if not sentences:
            print(f"[{idx}/{len(articles)}] {aid}: no sentences, skipping")
            continue

        if synth is None:
            print(f"loading kokoro ({args.voice}) ...")
            synth = Synth(args.voice, args.speed)

        t0 = time.time()
        audio, starts = synth.article(sentences)
        encode_mp3(audio, out_path)
        wall = time.time() - t0
        dur = round(len(audio) / SAMPLE_RATE, 3)

        manifest["articles"][aid] = {"dur": dur, "starts": starts}
        write_manifest(manifest, manifest_path)  # checkpoint after every article

        total_audio += dur
        total_wall += wall
        made += 1
        print(
            f"[{idx}/{len(articles)}] {aid}: {len(sentences)} sentences, "
            f"{dur:.1f}s audio in {wall:.1f}s ({dur / wall:.2f}x realtime), "
            f"{out_path.stat().st_size / 1024:.0f} KB"
        )

    if args.kana or args.kana_only:
        kana_dir = out_dir / "kana"
        pairs = load_kana()
        print(f"\nrendering {len(pairs)} kana clips ...")
        for h, stem in pairs:
            clip = kana_dir / f"{stem}.mp3"
            if clip.exists() and not args.force:
                if stem not in manifest["kana"]:
                    manifest["kana"].append(stem)
                continue
            if synth is None:
                print(f"loading kokoro ({args.voice}) ...")
                synth = Synth(args.voice, args.speed)
            encode_mp3(synth.sentence(h), clip)
            manifest["kana"].append(stem)
        write_manifest(manifest, manifest_path)
        print(f"kana clips: {len(manifest['kana'])} in {kana_dir}")

    write_manifest(manifest, manifest_path)
    print(
        f"\ndone: {made} rendered, {skipped} skipped. "
        + (f"{total_audio:.0f}s audio in {total_wall:.0f}s ({total_audio / total_wall:.2f}x realtime)."
           if total_wall else "")
        + f"\nmanifest: {manifest_path}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

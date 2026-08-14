#!/usr/bin/env python3
"""
Generate per-word pronunciation clips for the vocab section with VOICEVOX
(speaker 52, 雀松朱司) into public/audio/words/{id}.mp3.

Pronunciation control: phrases are parsed from the reading (so the reading is
always ours) and the accent kernel is overridden with the Kanjium dictionary
value (src/data/vocab/accents.json) via /mora_data — dictionary-grade 語気.
Words without accent data use VOICEVOX's own dictionary lookup on the written
form when its reading agrees with ours, else the plain reading parse.

Requires the VOICEVOX engine:
    cd ~/voicevox/linux-cpu-x64 && ./run --host 127.0.0.1 --port 50021

    python scripts/generate-word-audio.py            # all words
    python scripts/generate-word-audio.py --only n5-0001,n5-0002
"""

from __future__ import annotations

import argparse
import io
import json
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = ROOT / "src" / "data" / "vocab"
OUT_DIR = ROOT / "public" / "audio" / "words"
MANIFEST = ROOT / "src" / "data" / "audio-manifest.json"

HOST = "http://127.0.0.1:50021"
SPEAKER = 52  # 雀松朱司 ノーマル
SR = 24000
TARGET_DBFS = -6.0
QUERY = dict(speedScale=0.93, prePhonemeLength=0.08, postPhonemeLength=0.15)

SMALL = "ァィゥェォャュョヮ"


def post(path: str, data: bytes | None = None, ctype: str | None = None) -> bytes:
    req = urllib.request.Request(HOST + path, data=data or b"", method="POST")
    if ctype:
        req.add_header("Content-Type", ctype)
    return urllib.request.urlopen(req, timeout=180).read()


def hira2kata(s: str) -> str:
    return "".join(chr(ord(c) + 0x60) if "ぁ" <= c <= "ゖ" else c for c in s)


def morae(kata: str) -> list[str]:
    out: list[str] = []
    for ch in kata:
        if out and ch in SMALL:
            out[-1] += ch
        else:
            out.append(ch)
    return out


def accent_phrases(text: str) -> list:
    return json.loads(post(
        "/accent_phrases?" + urllib.parse.urlencode({"text": text, "speaker": SPEAKER})
    ))


def with_accent(phrases: list, accent: int) -> list:
    """Override the accent kernel (Kanjium value; 0 = heiban) and recompute
    mora pitches via /mora_data. Only safe for single-phrase words."""
    if len(phrases) != 1:
        return phrases
    n = len([m for m in phrases[0]["moras"]])
    phrases[0]["accent"] = n if accent == 0 or accent > n else accent
    return json.loads(post(
        f"/mora_data?speaker={SPEAKER}", json.dumps(phrases).encode(), "application/json"))


# long-vowel normalization so ガクセイ compares equal to VOICEVOX's ガクセエ
_E_ROW = "エケゲセゼテデネヘベペメレェ"
_O_ROW = "オコゴソゾトドノホボポモヨロヲョォ"


def norm_long(kata: str) -> str:
    out: list[str] = []
    for ch in kata:
        if out and ch == "イ" and out[-1] in _E_ROW:
            out.append("エ")
        elif out and ch == "ウ" and out[-1] in _O_ROW:
            out.append("オ")
        else:
            out.append(ch)
    return "".join(out)


def phrase_reading(phrases: list) -> str:
    return "".join(m["text"] for ap in phrases for m in ap["moras"])


def synth(phrases: list, base_query: dict) -> np.ndarray:
    q = dict(base_query)
    q["accent_phrases"] = phrases
    q.update(QUERY)
    wav = post(f"/synthesis?speaker={SPEAKER}", json.dumps(q).encode(), "application/json")
    audio, _ = sf.read(io.BytesIO(wav), dtype="float32")
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    return audio.astype(np.float32)


def normalize(audio: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(audio)))
    if peak > 0:
        audio = audio * (10 ** (TARGET_DBFS / 20.0) / peak)
    return audio.astype(np.float32)


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
    ap.add_argument("--only", help="comma-separated word ids")
    args = ap.parse_args()

    urllib.request.urlopen(f"{HOST}/version", timeout=5).read()

    accents: dict[str, int] = json.loads((VOCAB_DIR / "accents.json").read_text(encoding="utf-8"))
    words = []
    for f in ["n5", "n4", "n3", "n2", "n1"]:
        words += json.loads((VOCAB_DIR / f"{f}.json").read_text(encoding="utf-8"))
    if args.only:
        wanted = {s.strip() for s in args.only.split(",")}
        words = [w for w in words if w["id"] in wanted]

    base_query = json.loads(post(
        "/audio_query?" + urllib.parse.urlencode({"text": "あ", "speaker": SPEAKER})))

    done = fallback = 0
    for i, w in enumerate(words, 1):
        out = OUT_DIR / f"{w['id']}.mp3"
        if out.exists():
            continue
        kata = hira2kata(w["reading"])
        acc = accents.get(w["id"])
        if acc is not None:
            # reading-parsed phrases + authoritative Kanjium accent
            phrases = with_accent(accent_phrases(w["reading"]), acc)
        else:
            # no accent data: prefer dictionary lookup on the written form
            phrases = None
            try:
                p = accent_phrases(w["word"])
                if norm_long(phrase_reading(p)) == norm_long(kata):
                    phrases = p
            except Exception:
                pass
            if phrases is None:
                phrases = accent_phrases(w["reading"])
                fallback += 1
        audio = normalize(synth(phrases, base_query))
        encode_mp3(audio, out)
        done += 1
        if done % 100 == 0:
            print(f"[{i}/{len(words)}] generated {done} (fallback {fallback})", flush=True)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    manifest["words"] = sorted(w["id"] for w in words if (OUT_DIR / f"{w['id']}.mp3").exists())
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"done: {done} new clips, {fallback} without accent control")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

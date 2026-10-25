"""Caption an actual user recording without changing the source or fabricating UI.

Usage:
    python video/render_captioned.py "C:/path/to/recording.mp4"

All moving footage comes from the source. Graphics live outside the application
viewport. Clip timing, captions and speedups are in the adjacent JSON edit plan.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".demo-tools"))
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

FPS = 25
WIDTH, HEIGHT = 1920, 1080
FRAME = (80, 52, 1760, 868)
COLORS = {"bg": "#153c33", "accent": "#e1eda6", "white": "#fafbf5", "muted": "#c8d9cf"}
FONT_DIR = Path("C:/Windows/Fonts")


def font(size: int, bold: bool = False):
    return ImageFont.truetype(str(FONT_DIR / ("segoeuib.ttf" if bold else "segoeui.ttf")), size)


def wrap_text(draw, text: str, text_font, max_width: int) -> list[str]:
    lines: list[str] = []
    for word in text.split():
        if not lines or draw.textlength(lines[-1] + " " + word, font=text_font) > max_width:
            lines.append(word)
        else:
            lines[-1] += " " + word
    return lines


def timestamp(seconds: float, separator: str = ",") -> str:
    ms = round(seconds * 1000)
    hours, ms = divmod(ms, 3600000)
    minutes, ms = divmod(ms, 60000)
    secs, ms = divmod(ms, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}{separator}{ms:03}"


def clock_label(seconds: float) -> str:
    return f"{int(seconds) // 60:02}:{seconds % 60:05.2f}"


def make_overlay(clip: dict, index: int, total: int, target: Path) -> None:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # Deliberately leave the app viewport untouched, including buttons and forms.
    draw.rectangle((0, 0, WIDTH, 51), fill=COLORS["bg"])
    draw.rectangle((0, 920, WIDTH, HEIGHT), fill=COLORS["bg"])
    draw.text((80, 10), "SECOND SERVING", font=font(22, True), fill=COLORS["accent"])
    draw.text((340, 15), "REAL USER WALKTHROUGH", font=font(16), fill=COLORS["muted"])
    speed = clip["speed"]
    right = f"{speed:g}× SPEED · TYPING COMPRESSED" if speed != 1 else "ORIGINAL SPEED · EDITED CUTS"
    draw.text((1840, 15), right, anchor="ra", font=font(16), fill=COLORS["muted"])
    draw.line((80, 935, 1840, 935), fill="#436257", width=1)
    draw.text((80, 947), f"0{clip['chapter']} / 08   {clip['label']}", font=font(18, True), fill=COLORS["accent"])
    lines = wrap_text(draw, clip["caption"], font(30), 1760)
    if len(lines) > 2:
        raise ValueError(f"Caption needs more than two lines: {clip['caption']}")
    draw.multiline_text((80, 979), "\n".join(lines), font=font(30), spacing=7, fill=COLORS["white"])
    draw.rectangle((0, 1075, WIDTH, 1079), fill="#34574a")
    draw.rectangle((0, 1075, round(WIDTH * (index + 1) / total), 1079), fill=COLORS["accent"])
    overlay.save(target)


def run_logged(command: list[str], log: Path) -> None:
    with log.open("wb") as output:
        process = subprocess.run(command, stdout=output, stderr=subprocess.STDOUT)
    if process.returncode:
        raise RuntimeError(f"FFmpeg failed; inspect {log}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--plan", type=Path, default=ROOT / "video/caption-plan-2026-10-24.json")
    parser.add_argument("--out", type=Path, default=ROOT / "deliverables/second-serving-video-en")
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    source = args.source.resolve(strict=True)
    out = args.out.resolve()
    if not out.is_relative_to(ROOT) or out == ROOT:
        raise ValueError("Output must be a dedicated directory inside this workspace.")
    out.mkdir(parents=True, exist_ok=True)
    cache = ROOT / ".demo-tools" / "captioned-video-2026-10-24"
    cache.mkdir(parents=True, exist_ok=True)
    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    clips = plan["clips"]
    if source.name != plan["source_name"]:
        raise ValueError("This edit plan is tied to the reviewed source recording.")
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    final = out / "second-serving-captioned-en.mp4"
    if final.resolve() == source:
        raise ValueError("The source recording must never be overwritten.")

    cursor = 0
    srt, chapters = [], []
    last_chapter = None
    timeline = []
    for index, clip in enumerate(clips):
        if clip["start"] < 0 or clip["end"] <= clip["start"] or clip["speed"] < 1:
            raise ValueError(f"Invalid clip: {clip}")
        if index and clip["start"] < clips[index - 1]["end"]:
            raise ValueError("Reviewed clips must remain chronological and non-overlapping.")
        frames = math.floor((clip["end"] - clip["start"]) / clip["speed"] * FPS + 1e-8)
        entry = {**clip, "frames": frames, "output_start": cursor / FPS, "output_end": (cursor + frames) / FPS}
        timeline.append(entry)
        srt.append(f"{index + 1}\n{timestamp(entry['output_start'])} --> {timestamp(entry['output_end'])}\n{clip['caption']}\n")
        if clip["chapter"] != last_chapter:
            if chapters:
                chapters[-1]["end"] = round(cursor / FPS * 1000)
            chapters.append({"start": round(cursor / FPS * 1000), "title": clip["label"]})
            last_chapter = clip["chapter"]
        make_overlay(clip, index, len(clips), cache / f"overlay-{index:02}.png")
        cursor += frames
    chapters[-1]["end"] = round(cursor / FPS * 1000)
    metadata = [";FFMETADATA1", f"title={plan['title']}", "comment=Actual user footage; edited cuts; speedups labelled; no audio."]
    for chapter in chapters:
        metadata += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={chapter['start']}", f"END={chapter['end']}", f"title={chapter['title']}"]
    duration = cursor / FPS
    if duration >= 180:
        raise ValueError(f"Submission cut must be under three minutes, got {duration:.2f}s")
    (out / "second-serving-captioned-en.srt").write_text("\n".join(srt), encoding="utf-8")
    (out / "edit-timeline.json").write_text(json.dumps({"source_name": source.name, "fps": FPS, "duration": duration, "notes": plan["notes"], "clips": timeline}, indent=2, ensure_ascii=False), encoding="utf-8")
    chapter_path = cache / "chapters.ffmetadata"
    chapter_path.write_text("\n".join(metadata) + "\n", encoding="utf-8")

    def render(index: int, clip: dict) -> Path:
        segment = cache / f"segment-{index:02}.mp4"
        overlay = cache / f"overlay-{index:02}.png"
        signature = hashlib.sha256(b"render-v2-frame-exact" + json.dumps(clip, sort_keys=True).encode() + overlay.read_bytes() + str(source.stat().st_mtime_ns).encode()).hexdigest()
        signature_file = cache / f"segment-{index:02}.sha256"
        if segment.exists() and signature_file.exists() and signature_file.read_text().strip() == signature:
            print(f"Cached {index + 1:02}/{len(clips)}: {clip['label']}", flush=True)
            return segment
        x, y, width, height = FRAME
        filters = (
            "[0:v]crop=1880:928:0:6,tpad=stop_mode=clone:stop_duration=0.2,"
            f"setpts=(PTS-STARTPTS)/{clip['speed']},"
            f"scale={width}:{height}:flags=lanczos,setsar=1,fps={FPS},"
            f"pad={WIDTH}:{HEIGHT}:{x}:{y}:color={COLORS['bg']}[app];"
            "[app][1:v]overlay=0:0:shortest=1:format=auto,format=yuv420p[v]"
        )
        run_logged([
            ffmpeg, "-hide_banner", "-loglevel", "warning", "-y",
            "-ss", str(clip["start"]), "-t", str(clip["end"] - clip["start"]), "-i", str(source),
            "-loop", "1", "-framerate", str(FPS), "-i", str(overlay),
            "-filter_complex_threads", "1", "-filter_complex", filters,
            "-map", "[v]", "-an", "-frames:v", str(clip["frames"]),
            "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-threads", "2",
            "-profile:v", "high", "-level:v", "4.1", "-pix_fmt", "yuv420p",
            "-video_track_timescale", "90000", "-movflags", "+faststart", str(segment)
        ], cache / f"segment-{index:02}.log")
        signature_file.write_text(signature, encoding="ascii")
        print(f"Rendered {index + 1:02}/{len(clips)}: {clip['label']}", flush=True)
        return segment

    print(f"Rendering {len(clips)} real-footage clips; target {duration:.2f}s", flush=True)
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 3))) as pool:
        futures = [pool.submit(render, index, clip) for index, clip in enumerate(timeline)]
        for future in as_completed(futures):
            future.result()
    concat = cache / "concat.txt"
    concat.write_text("\n".join(f"file '{(cache / f'segment-{index:02}.mp4').as_posix()}'" for index in range(len(clips))) + "\n", encoding="utf-8")
    run_logged([
        ffmpeg, "-hide_banner", "-loglevel", "warning", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
        "-f", "ffmetadata", "-i", str(chapter_path), "-map", "0:v:0", "-map_metadata", "1", "-map_chapters", "1",
        "-c:v", "copy", "-an", "-movflags", "+faststart", str(final)
    ], cache / "concat.log")
    run_logged([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-ss", "9", "-i", str(final), "-frames:v", "1", "-q:v", "2", str(out / "poster.jpg")], cache / "poster.log")

    notes = [
        "# Second Serving — captioned user walkthrough", "",
        f"Duration: **{clock_label(duration)}**. 1920×1080, 25 fps, H.264 MP4, no audio.", "",
        "English captions are burned into the MP4. The SRT is an editable sidecar; do not enable it over the burned-in captions.", "",
        "## Editorial notes", "",
        *[f"- {note}" for note in plan["notes"]], "",
        "## Still needed for a stronger submission", "",
        "The source ends with a policy-blocked recovery request. It does not show a successful request, approval, preparation, dispatch or receipt. Record that complete flow with a feasible, intentionally approved demo scenario, then append it or replace repetitive setup footage. Do not loosen real food-handling policies merely to obtain a successful demo.", "",
        "No claim of measured waste reduction, real customer adoption, completed delivery, incident resolution or verified physical repair is added.", "",
        "## Edit decision list", "",
        "| Output | Source | Speed | Section |", "|---|---|---|---|"
    ]
    for clip in timeline:
        notes.append(f"| {clock_label(clip['output_start'])}–{clock_label(clip['output_end'])} | {clock_label(clip['start'])}–{clock_label(clip['end'])} | {clip['speed']:g}× | {clip['label']} |")
    (out / "EDIT-NOTES.md").write_text("\n".join(notes) + "\n", encoding="utf-8")
    print(json.dumps({"video": str(final), "duration_seconds": duration, "bytes": final.stat().st_size, "source_unchanged": True}, indent=2), flush=True)


if __name__ == "__main__":
    main()

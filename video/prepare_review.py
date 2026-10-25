"""Extract timestamped review sheets without modifying the source recording."""
import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.demo-tools'))
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--out', type=Path, default=ROOT / '.demo-tools' / 'recording-2026-10-24')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error',
                '-i', str(args.source), '-vf', 'fps=1/6', '-q:v', '2',
                str(args.out / 'frame-%03d.jpg')], check=True)
frames = sorted(args.out.glob('frame-*.jpg'))
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 20)
for start in range(0, len(frames), 6):
    sheet = Image.new('RGB', (1920, 1509), '#f5f2e9')
    draw = ImageDraw.Draw(sheet)
    for offset, frame in enumerate(frames[start:start+6]):
        im = Image.open(frame).convert('RGB')
        im.thumbnail((960, 467))
        x, y = (offset % 2) * 960, (offset // 2) * 503
        seconds = (start + offset) * 6 + 3
        draw.text((x + 12, y + 6), f'{seconds // 60:02d}:{seconds % 60:02d}  /  frame {start + offset + 1:03d}', font=font, fill='#183c32')
        sheet.paste(im, (x, y + 36))
    sheet.save(args.out / f'sheet-{start // 6:02d}.jpg', quality=92)
print(f'{len(frames)} review frames / {(len(frames) + 5) // 6} sheets in {args.out}')

import sys, subprocess
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / '.demo-tools'))
import imageio_ffmpeg
from PIL import Image, ImageDraw

out = Path(__file__).parent / (sys.argv[2] if len(sys.argv) > 2 else 'user-recording-review')
out.mkdir(exist_ok=True)
source = sys.argv[1] if len(sys.argv) > 1 else 'C:/Users/phung/Videos/10.10.2026_20.47.51_REC.mp4'
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-i', source, '-vf', 'fps=1/5', '-q:v', '2', str(out / 'frame-%03d.jpg')], check=True)
frames = sorted(out.glob('frame-*.jpg'))
for start in range(0, len(frames), 8):
    sheet = Image.new('RGB', (1280, 4 * 384), '#ffffff')
    d = ImageDraw.Draw(sheet)
    for offset, path in enumerate(frames[start:start+8]):
        pic = Image.open(path)
        pic.thumbnail((640, 360))
        x, y = offset % 2 * 640, offset // 2 * 384
        sheet.paste(pic, (x, y+24))
        d.text((x+8, y+5), f'Approx {(start+offset)*5+2.5:.1f} sec', fill='black')
    sheet.save(out / f'sheet-{start//8}.jpg')
print(out)

"""Edited, sampled browser-interaction recording; no fabricated application frames."""
import sys,json,subprocess
from pathlib import Path
ROOT=Path(__file__).parent
sys.path.insert(0,str(ROOT/'.demo-tools'))
from PIL import Image,ImageDraw,ImageFont
import imageio_ffmpeg
frames=json.loads((ROOT/'rescue-recording/manifest.json').read_text())
font=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',n)
bold=lambda n:ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',n)
output=ROOT/'chain-rescue-interaction.mp4'
writer=imageio_ffmpeg.write_frames(str(output),(1280,720),fps=24,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',quality=8,output_params=['-movflags','+faststart']);writer.send(None)
for i,frame in enumerate(frames):
    im=Image.new('RGB',(1280,720),'#143e32');d=ImageDraw.Draw(im)
    d.text((50,42),'CHAIN RESCUE',font=bold(30),fill='#d9ff85')
    d.text((50,105),f'USER WALKTHROUGH / {i+1:02d}',font=font(18),fill='#bdcfbf')
    words=frame['label'].split();lines=[];line=''
    for word in words:
        candidate=(line+' '+word).strip()
        if d.textlength(candidate,font=bold(36))>720:lines.append(line);line=word
        else:line=candidate
    lines.append(line)
    d.multiline_text((50,165),'\n'.join(lines),font=bold(36),fill='white',spacing=10)
    d.multiline_text((50,365),'Actual browser actions and a live AI call.\nFictional branches, order and transport policy.\nOne operator simulates both branch roles.',font=font(23),fill='#d7e4d7',spacing=12)
    d.multiline_text((50,570),'SAMPLED INTERACTION CAPTURE\nEdited pauses; 5 seconds per captured step.\nNo audio. Not a continuous screen recording.',font=font(18),fill='#b5c9b8',spacing=8)
    shot=Image.open(ROOT/'rescue-recording'/frame['file']).convert('RGB');shot.thumbnail((380,640));im.paste(shot,(1035-shot.width//2,360-shot.height//2))
    if i in [0,7,len(frames)-1]:im.save(ROOT/'rescue-recording'/f'preview-{i}.jpg')
    for f in range(120):
        current=im.copy();draw=ImageDraw.Draw(current);draw.rectangle((0,715,1280*(i*120+f+1)/(len(frames)*120),720),fill='#d9ff85');writer.send(current.tobytes())
writer.close()
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(output),'-f','null','-'],check=True)
print(f'{output}: {len(frames)*5}s, full decode passed')

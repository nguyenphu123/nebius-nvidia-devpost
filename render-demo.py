"""Render a captioned storyboard using actual local app screenshots."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / '.demo-tools'))
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
import subprocess

ROOT = Path(__file__).parent
ASSETS = ROOT / 'demo-assets'
W, H, FPS = 1280, 720, 24
FONT = 'C:/Windows/Fonts/segoeui.ttf'
BOLD = 'C:/Windows/Fonts/segoeuib.ttf'
def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)

scenes = [
 ('01 / BÀI TOÁN', 'Một bữa ăn.\nNhiều điều bất ngờ.', 'Chị Linh điều phối một bếp cộng đồng.\n120 khách · 4 tình nguyện viên · 2 bếp.\nNgân sách mua bổ sung: $30.', 'baseline.jpg', 'SECOND SERVING', 9),
 ('02 / NHẬP LIỆU', 'Bắt đầu từ\nnhững gì đang có.', 'Tên nguyên liệu, mô tả, lượng và đơn vị.\nThêm phân loại tươi sống / thông thường.\nNguyên liệu chưa khớp được báo rõ.', 'input.jpg', 'Không đoán khối lượng mỗi bó hay gói.', 10),
 ('03 / SỰ CỐ', 'Thêm 20 khách.\nMột bếp hỏng.', 'Trước khi chuẩn bị: đậu lăng không đến.\nKế hoạch giảm từ 120 xuống 80 suất.\nCòn thiếu 60 suất — chưa thể duyệt.', 'disruption.jpg', '80 / 140 SUẤT', 11),
 ('04 / AI + KIỂM TRA', 'Hiểu thay đổi.\nKhông tự quyết định.', 'Nemotron trên Nebius đề xuất cập nhật.\nNgười dùng xem lại trước khi áp dụng.\nBộ tính kiểm tra lượng, tiền và thời gian.', 'assistant.jpg', 'Ảnh từ phiên AI thật đã diễn tập.', 10),
 ('05 / KHÔI PHỤC', 'Một quyết định.\nThêm 60 suất.', 'Linh xác nhận có bếp thay thế trước ca.\nTính lại: 140 suất, mua thêm $28.10.\nHoàn tất phút 237 — chỉ dư 3 phút.', 'recovered.jpg', '140 / 140 SUẤT', 11),
 ('06 / NGƯỜI DUYỆT', 'AI hỗ trợ.\nCon người quyết định.', 'Kiểm tra mua hàng và lịch nấu.\nNgười phụ trách duyệt, rồi xuất kế hoạch.\nKhông phải cam kết vận hành bếp thật.', 'shopping.jpg', 'Less waste. More welcome.', 10),
]

english = '--english' in sys.argv
if english:
    scenes = [
        ('01 / BEST APPS AND AGENTS', 'Second Serving.\nA plan that adapts.', 'A planning copilot for community kitchens.\nTurn available food and limited resources\ninto a meal plan people can review.', 'baseline.jpg', 'Nebius x NVIDIA Global AI Hackathon', 10),
        ('02 / THE USER AND THE PROBLEM', '120 guests.\nOne small kitchen.', 'Meet Linh, a fictional kitchen coordinator.\nFour volunteers. Two burners. Four hours.\nOnly $30 for additional ingredients.', 'input.jpg', 'Plan with the resources you actually have.', 11),
        ('03 / THE WORKING PROTOTYPE', 'From inventory\nto a service plan.', 'Enter names, descriptions, quantities and units.\nReview meals, purchases and a burner schedule.\nThe sample kitchen covers 120 guests.', 'baseline.jpg', '120 portions / $10.20 additional purchases', 12),
        ('04 / WHEN CONSTRAINTS CHANGE', 'More guests.\nOne broken burner.', 'Before prep: no lentils, 140 guests, one burner.\nReplanning produces 80 portions, not 140.\nApproval stays blocked: 60 guests need a meal.', 'disruption.jpg', 'An honest shortfall beats an impossible promise.', 13),
        ('05 / THE AI INTEGRATION', 'Language in.\nReviewed changes out.', 'NVIDIA Nemotron 3 Super interprets updates\nthrough the Nebius Token Factory runtime API.\nValidated edits require explicit user approval.', 'assistant.jpg', 'Model: nvidia/nemotron-3-super-120b-a12b', 13),
        ('06 / THE DECISION', 'Restore a burner.\nRecover 60 portions.', 'A replacement is confirmed before prep starts.\nThe planner now covers 140 guests for $28.10.\nFinish: minute 237. Just 3 minutes of slack.', 'recovered.jpg', 'Human decision + recalculation, not AI guesswork.', 13),
        ('07 / BUILT TO BE CHECKED', 'Inspect the plan.\nKeep control.', 'The recipe engine checks stock, budget and time.\nReview purchases and schedule, approve, export.\n16 automated tests passed in rehearsal.', 'shopping.jpg', 'AI extracts updates. Code checks feasibility.', 12),
        ('08 / IMPACT AND HONEST LIMITS', 'Less waste.\nMore welcome.', 'Goal: make resource gaps visible before service.\nToday: three sample recipes, no field impact data.\nNext: validate recipes with a kitchen partner.', 'recovered.jpg', 'Local-food matching and safety checks remain limited.', 12),
    ]

def render_scene(scene):
    tag, title, body, filename, callout, seconds = scene
    im = Image.new('RGB', (W,H), '#103c30')
    d = ImageDraw.Draw(im)
    d.text((60,38), 'second serving.', font=font(27,True), fill='#d9ff85')
    d.text((60,119), tag, font=font(18,True), fill='#b4c9b8')
    d.multiline_text((56,165), title, font=font(49,True), spacing=5, fill='#ffffff')
    d.multiline_text((60,315), body, font=font(23), spacing=15, fill='#dbe7de')
    d.rounded_rectangle((60,492,780,550),radius=12,fill='#d9ff85')
    d.text((79,504),callout,font=font(23,True),fill='#153f30')
    footer = ('ENGLISH SUBMISSION DRAFT · ACTUAL APP IMAGES\nEdited screenshots, not continuous screen footage.\nFictional scenario. Illustrative recipes and prices.' if english else 'BẢN DỰNG THỬ · ẢNH GIAO DIỆN THẬT\nTình huống giả định · 3 công thức mẫu\nKhông phải bản quay AI liên tục.')
    d.multiline_text((60,580),footer,font=font(17),spacing=7,fill='#a8c0b0')
    shot = Image.open(ASSETS / filename).convert('RGB')
    shot.thumbnail((340,640), Image.Resampling.LANCZOS)
    x,y = 1080-shot.width//2, 350-shot.height//2
    d.rounded_rectangle((x-8,y-8,x+shot.width+8,y+shot.height+8),radius=17,fill='#658d75')
    im.paste(shot,(x,y))
    return im

frames = [render_scene(s) for s in scenes]
suffix = '-en' if english else ''
for n,frame in enumerate(frames): frame.save(ASSETS / f'scene{suffix}-{n+1}.png')
frames[0].save(ROOT / f'demo-poster{suffix}.jpg',quality=95)
output = ROOT / f'second-serving-demo{suffix}.mp4'
writer = imageio_ffmpeg.write_frames(str(output),(W,H),fps=FPS,codec='libx264',pix_fmt_in='rgb24',pix_fmt_out='yuv420p',quality=8,output_params=['-movflags','+faststart'])
writer.send(None)
total = sum(s[-1] for s in scenes) * FPS
count = 0
for i,(scene,frame) in enumerate(zip(scenes,frames)):
    for n in range(scene[-1]*FPS):
        current = Image.blend(frames[i-1],frame,n/12) if i and n < 12 else frame.copy()
        draw = ImageDraw.Draw(current)
        draw.rectangle((0,H-5,W*(count+1)/total,H),fill='#d9ff85')
        writer.send(current.tobytes())
        count += 1
writer.close()
print(f'Created {output} | {total/FPS:.0f}s | {W}x{H} | {output.stat().st_size} bytes',flush=True)
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-i',str(output),'-f','null','-'],check=True)
print('Full video decode verified.',flush=True)

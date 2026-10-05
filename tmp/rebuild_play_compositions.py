"""Rebuild Play Store compositions: DejaVu fonts (arrow glyph), auto-fit captions."""
import os
import shutil
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = "/home/user/rork-app"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

os.chdir(ROOT)
master = Image.open("icon-zomi-1024.png").convert("RGBA")
out = "play-store/listing/en-US/images"

def cover(img, w, h):
    sw, sh = img.size
    scale = max(w / sw, h / sh)
    img = img.resize((int(sw * scale) + 1, int(sh * scale) + 1), Image.LANCZOS)
    sw, sh = img.size
    left, top = (sw - w) // 2, (sh - h) // 2
    return img.crop((left, top, left + w, top + h))

def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m

def fit_font(text, path, size, max_w):
    while size > 20:
        f = ImageFont.truetype(path, size)
        if ImageDraw.Draw(Image.new("RGB", (10, 10))).textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return ImageFont.truetype(path, size)

def paste_card(base, ui, center_x, center_y, width, radius=36):
    w, h = width, int(ui.height * width / ui.width)
    card = ui.resize((w, h), Image.LANCZOS).convert("RGBA")
    mask = rounded_mask((w, h), radius)
    x, y = int(center_x - w / 2), int(center_y - h / 2)
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([x - 6, y + 10, x + w + 6, y + h + 22], radius=radius + 6, fill=(0, 0, 0, 190))
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(24)))
    base.paste(card, (x, y), mask)
    bd = ImageDraw.Draw(base)
    bd.rounded_rectangle([x, y, x + w, y + h], radius=radius, outline=(255, 255, 255, 36), width=2)

def caption(base, title, sub, y=150):
    d = ImageDraw.Draw(base)
    f_big = fit_font(title, BOLD, 78, 980)
    f_sub = fit_font(sub, REG, 40, 980)
    tw = d.textlength(title, font=f_big)
    d.text(((1080 - tw) / 2, y), title, font=f_big, fill=(255, 255, 255, 255))
    sw = d.textlength(sub, font=f_sub)
    d.text(((1080 - sw) / 2, y + 108), sub, font=f_sub, fill=(160, 220, 235, 255))

def load_ui(path, top=50, bottom=20):
    img = Image.open(path).convert("RGBA")
    return img.crop((0, top, img.width, img.height - bottom))

bgs = {n: Image.open(f"screenshots/backgrounds/{n}.png").convert("RGBA")
       for n in ["translator", "glossary", "pronunciation", "settings"]}

ARROW = " \u21c4 "
slides = [
    ("translator", "01-translator", "Translate Zomi" + ARROW + "English", "AI-powered, made for the Zomi community",
     load_ui("screenshots/captures/iphone/01_translator.png", top=50, bottom=394)),
    ("glossary", "02-glossary", "Teach the AI Your Words", "Your own Zomi glossary for names & terms",
     load_ui("screenshots/captures/iphone/02_glossary.png")),
    ("pronunciation", "03-pronunciation", "Master Zomi Sounds & Tones", "Hear the alphabet, vowels & tones",
     load_ui("screenshots/captures/iphone/03_pronunciation.png")),
    ("settings", "04-settings", "Sign In & Make It Yours", "Google or Apple \u2014 across all your devices",
     load_ui("screenshots/captures/iphone/05_settings.png")),
]

for bg_name, out_name, title, sub, ui in slides:
    canvas = cover(bgs[bg_name], 1080, 1920).convert("RGBA")
    caption(canvas, title, sub)
    paste_card(canvas, ui, 540, 1130, 720)
    canvas.convert("RGB").save(f"{out}/phone/{out_name}.png", "PNG")
    shutil.copy(f"{out}/phone/{out_name}.png", f"{out}/tablet/{out_name}.png")
    print("rebuilt", out_name)

# Feature graphic
fg = cover(bgs["translator"], 1024, 500).convert("RGBA")
ov = Image.new("RGBA", fg.size, (0, 0, 0, 0))
od = ImageDraw.Draw(ov)
for x in range(1024):
    od.line([(x, 0), (x, 500)], fill=(6, 10, 30, int(200 * (1 - x / 1024))))
fg.alpha_composite(ov)
icon = master.resize((300, 300), Image.LANCZOS)
fg.paste(icon, (60, 100), icon)
d = ImageDraw.Draw(fg)
t1 = "ZOMI"
t2 = "AI Translator \u00b7 Zomi \u21c4 English"
t3 = "Text \u00b7 Voice \u00b7 Photos \u00b7 Pronunciation"
d.text((400, 130), t1, font=ImageFont.truetype(BOLD, 110), fill=(47, 224, 224, 255))
d.text((404, 258), t2, font=fit_font(t2, REG, 42, 580), fill=(255, 255, 255, 255))
d.text((404, 330), t3, font=fit_font(t3, BOLD, 38, 580), fill=(190, 205, 235, 255))
fg.convert("RGB").save(f"{out}/feature-graphic-1024x500.png", "PNG")
print("feature graphic rebuilt")
print("DONE")

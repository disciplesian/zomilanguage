"""Build Zomi brand assets: app icons for all platforms + Play Store listing images."""
import os
import shutil
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = "/home/user/rork-app"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

os.chdir(ROOT)
master = Image.open("icon-zomi-1024.png").convert("RGBA")

def save(img, path, fmt="PNG"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, fmt)
    print("wrote", path, img.size)

def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m

def circle_mask(size):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.ellipse([0, 0, size[0] - 1, size[1] - 1], fill=255)
    return m

# ---------- App icons ----------
save(master, "ios/ZomiTranslator/Assets.xcassets/AppIcon.appiconset/icon.png")

# Android adaptive foreground: content within center ~62% safe zone, transparent padding
fg = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
content = master.resize((268, 268), Image.LANCZOS)
fg.paste(content, ((432 - 268) // 2, (432 - 268) // 2), content)
save(fg, "android/app/src/main/res/drawable-xxxhdpi/ic_launcher_foreground.png")

# Android legacy launcher icons (minSdk 24)
for dpi, side in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    sq = master.resize((side, side), Image.LANCZOS)
    sq.putalpha(rounded_mask((side, side), int(side * 0.18)))
    save(sq, f"android/app/src/main/res/mipmap-{dpi}/ic_launcher.png")
    rd = master.resize((side, side), Image.LANCZOS)
    rd.putalpha(circle_mask((side, side)))
    save(rd, f"android/app/src/main/res/mipmap-{dpi}/ic_launcher_round.png")

# Expo
save(master, "expo/assets/images/icon.png")
expo_fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
content = master.resize((660, 660), Image.LANCZOS)
expo_fg.paste(content, ((1024 - 660) // 2, (1024 - 660) // 2), content)
save(expo_fg, "expo/assets/images/adaptive-icon.png")
save(master, "expo/assets/images/splash-icon.png")
save(master.resize((64, 64), Image.LANCZOS), "expo/assets/images/favicon.png")
save(master.resize((32, 32), Image.LANCZOS), "expo/assets/images/favicon-32.png")

# Web
save(master.resize((180, 180), Image.LANCZOS), "web/public/icon.png")
save(master.resize((192, 192), Image.LANCZOS), "web/public/icon-192.png")
save(master.resize((512, 512), Image.LANCZOS), "web/public/icon-512.png")
save(master.resize((32, 32), Image.LANCZOS), "web/public/favicon.png")
save(master.resize((512, 512), Image.LANCZOS), "web/public/zomi-logo.png")

# Play Store icon (512, RGBA, <1MB)
out = "play-store/listing/en-US/images"
save(master.resize((512, 512), Image.LANCZOS), f"{out}/icon-512.png")

# ---------- Helpers for compositions ----------
def cover(img, w, h):
    sw, sh = img.size
    scale = max(w / sw, h / sh)
    img = img.resize((int(sw * scale) + 1, int(sh * scale) + 1), Image.LANCZOS)
    sw, sh = img.size
    left, top = (sw - w) // 2, (sh - h) // 2
    return img.crop((left, top, left + w, top + h))

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
    f_big = ImageFont.truetype(FONT_BOLD, 78)
    f_sub = ImageFont.truetype(FONT_REG, 40)
    tw = d.textlength(title, font=f_big)
    d.text(((1080 - tw) / 2, y), title, font=f_big, fill=(255, 255, 255, 255))
    sw = d.textlength(sub, font=f_sub)
    d.text(((1080 - sw) / 2, y + 108), sub, font=f_sub, fill=(160, 220, 235, 255))

def load_ui(path, top=50, bottom=20):
    img = Image.open(path).convert("RGBA")
    return img.crop((0, top, img.width, img.height - bottom))

bgs = {n: Image.open(f"screenshots/backgrounds/{n}.png").convert("RGBA")
       for n in ["translator", "glossary", "pronunciation", "settings"]}

slides = [
    ("translator", "01-translator", "Translate Zomi \u21c4 English", "AI-powered, made for the Zomi community",
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
    save(canvas.convert("RGB"), f"{out}/phone/{out_name}.png", "PNG")

# Tablet slot (Play accepts 9:16 portrait at >=1080px) — same compositions
for f in sorted(os.listdir(f"{out}/phone")):
    shutil.copy(f"{out}/phone/{f}", f"{out}/tablet/{f}")
    print("copied tablet", f)

# ---------- Feature graphic 1024x500 ----------
fg = cover(bgs["translator"], 1024, 500).convert("RGBA")
ov = Image.new("RGBA", fg.size, (0, 0, 0, 0))
od = ImageDraw.Draw(ov)
for x in range(1024):
    od.line([(x, 0), (x, 500)], fill=(6, 10, 30, int(200 * (1 - x / 1024))))
fg.alpha_composite(ov)
icon = master.resize((300, 300), Image.LANCZOS)
fg.paste(icon, (60, 100), icon)
d = ImageDraw.Draw(fg)
f1 = ImageFont.truetype(FONT_BOLD, 110)
f2 = ImageFont.truetype(FONT_REG, 44)
f3 = ImageFont.truetype(FONT_BOLD, 40)
d.text((400, 130), "ZOMI", font=f1, fill=(47, 224, 224, 255))
d.text((404, 258), "AI Translator \u00b7 Zomi \u21c4 English", font=f2, fill=(255, 255, 255, 255))
d.text((404, 330), "Text \u00b7 Voice \u00b7 Photos \u00b7 Pronunciation", font=f3, fill=(190, 205, 235, 255))
save(fg.convert("RGB"), f"{out}/feature-graphic-1024x500.png", "PNG")

print("ALL DONE")

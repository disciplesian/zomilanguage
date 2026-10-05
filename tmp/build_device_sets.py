"""Play Store device-set screenshots: desktop (16:9), 10-inch (1440x2560), 7-inch (1080x1920).

Reuses the same real iPhone captures + background art as the phone set.
Aspect rules: desktop 16:9 (1080-7680px sides); 10" 9:16 (1080-7680px);
7" 9:16 (320-3840px).
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = "/home/user/rork-app"
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
OUT = os.path.join(ROOT, "play-store/listing/en-US/images")

ARROW = " \u21c4 "

SLIDES = [
    ("translator", "01-translator", "Translate Zomi" + ARROW + "English",
     "AI-powered, made for the Zomi community",
     ("screenshots/captures/iphone/01_translator.png", 50, 394)),
    ("glossary", "02-glossary", "Teach the AI Your Words",
     "Your own Zomi glossary for names & terms",
     ("screenshots/captures/iphone/02_glossary.png", 50, 20)),
    ("pronunciation", "03-pronunciation", "Master Zomi Sounds & Tones",
     "Hear the alphabet, vowels & tones",
     ("screenshots/captures/iphone/03_pronunciation.png", 50, 20)),
    ("settings", "04-settings", "Sign In & Make It Yours",
     "Google or Apple \u2014 across all your devices",
     ("screenshots/captures/iphone/05_settings.png", 50, 20)),
]


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


def caption_center(canvas, title, sub, y, max_w, t_size, s_size):
    d = ImageDraw.Draw(canvas)
    f_big = fit_font(title, BOLD, t_size, max_w)
    f_sub = fit_font(sub, REG, s_size, max_w)
    tw = d.textlength(title, font=f_big)
    d.text(((canvas.width - tw) / 2, y), title, font=f_big, fill=(255, 255, 255, 255))
    sw = d.textlength(sub, font=f_sub)
    d.text(((canvas.width - sw) / 2, y + t_size + 28), sub, font=f_sub, fill=(160, 220, 235, 255))


def load_ui(spec):
    path, top, bottom = spec
    img = Image.open(os.path.join(ROOT, path)).convert("RGBA")
    return img.crop((0, top, img.width, img.height - bottom))


bgs = {n: Image.open(os.path.join(ROOT, f"screenshots/backgrounds/{n}.png")).convert("RGBA")
       for n in ["translator", "glossary", "pronunciation", "settings"]}
master = Image.open(os.path.join(ROOT, "icon-zomi-1024.png")).convert("RGBA")
uis = {name: load_ui(spec) for name, _, _, _, spec in SLIDES}

# ---------------------------------------------------------------- 7-inch tablet: 1080x1920
for bg_name, out_name, title, sub, _ in SLIDES:
    canvas = cover(bgs[bg_name], 1080, 1920).convert("RGBA")
    caption_center(canvas, title, sub, y=150, max_w=980, t_size=78, s_size=40)
    paste_card(canvas, uis[out_name.split("-")[1]], 540, 1130, 700)
    canvas.convert("RGB").save(f"{OUT}/tablet-7/{out_name}.png", "PNG")
    print("tablet-7 ", out_name)

# ---------------------------------------------------------------- 10-inch tablet: 1440x2560
for bg_name, out_name, title, sub, _ in SLIDES:
    canvas = cover(bgs[bg_name], 1440, 2560).convert("RGBA")
    caption_center(canvas, title, sub, y=210, max_w=1300, t_size=108, s_size=54)
    paste_card(canvas, uis[out_name.split("-")[1]], 720, 1540, 960, radius=48)
    canvas.convert("RGB").save(f"{OUT}/tablet-10/{out_name}.png", "PNG")
    print("tablet-10", out_name)

# ---------------------------------------------------------------- desktop: 1920x1080
# Slides 1-2: two phone cards side by side; slide 3: three cards; slide 4: hero.
pair_groups = [
    ("desktop-01-translator-glossary", "translator",
     [("translator", "Translate Zomi" + ARROW + "English"), ("glossary", "Teach the AI Your Words")],
     "AI-powered translation, made for the Zomi community"),
    ("desktop-02-pronunciation-settings", "pronunciation",
     [("pronunciation", "Master Zomi Sounds & Tones"), ("settings", "Sign In & Make It Yours")],
     "Voice, photos & pronunciation \u2014 on every screen"),
]
for out_name, bg_name, pair, headline in pair_groups:
    canvas = cover(bgs[bg_name], 1920, 1080).convert("RGBA")
    caption_center(canvas, headline, "Zomi AI Translator \u00b7 Zomi \u21c4 English",
                   y=56, max_w=1500, t_size=64, s_size=36)
    card_w = 330
    gap = 70
    total = card_w * 2 + gap
    x0 = (1920 - total) / 2
    cy = 655
    for i, (key, _) in enumerate(pair):
        paste_card(canvas, uis[key], x0 + card_w / 2 + i * (card_w + gap), cy, card_w)
    d = ImageDraw.Draw(canvas)
    f_lab = fit_font(pair[0][1], REG, 30, card_w + 60)
    for i, (_, label) in enumerate(pair):
        lw = d.textlength(label, font=f_lab)
        d.text((x0 + i * (card_w + gap) + card_w / 2 - lw / 2, 1010), label, font=f_lab, fill=(190, 205, 235, 255))
    canvas.convert("RGB").save(f"{OUT}/desktop/{out_name}.png", "PNG")
    print("desktop  ", out_name)

# Slide 3: three cards
canvas = cover(bgs["glossary"], 1920, 1080).convert("RGBA")
caption_center(canvas, "Everything Zomi, in One App", "Translate \u00b7 Glossary \u00b7 Pronunciation \u00b7 Sign In",
               y=56, max_w=1500, t_size=64, s_size=36)
trio = ["translator", "glossary", "pronunciation"]
card_w = 260
gap = 90
total = card_w * 3 + gap * 2
x0 = (1920 - total) / 2
for i, key in enumerate(trio):
    paste_card(canvas, uis[key], x0 + card_w / 2 + i * (card_w + gap), 640, card_w)
canvas.convert("RGB").save(f"{OUT}/desktop/desktop-03-trio.png", "PNG")
print("desktop  ", "desktop-03-trio")

# Slide 4: hero — brand block left, one card right
canvas = cover(bgs["settings"], 1920, 1080).convert("RGBA")
d = ImageDraw.Draw(canvas)
icon = master.resize((230, 230), Image.LANCZOS)
canvas.paste(icon, (150, 240), icon)
d.text((150, 520), "ZOMI", font=ImageFont.truetype(BOLD, 120), fill=(47, 224, 224, 255))
d.text((152, 668), "AI Translator \u00b7 Zomi \u21c4 English", font=fit_font("AI Translator \u00b7 Zomi \u21c4 English", REG, 46, 700), fill=(255, 255, 255, 255))
d.text((152, 744), "Text \u00b7 Voice \u00b7 Photos \u00b7 Pronunciation", font=fit_font("Text \u00b7 Voice \u00b7 Photos \u00b7 Pronunciation", BOLD, 36, 700), fill=(190, 205, 235, 255))
paste_card(canvas, uis["translator"], 1450, 560, 360)
canvas.convert("RGB").save(f"{OUT}/desktop/desktop-04-hero.png", "PNG")
print("desktop  ", "desktop-04-hero")

print("DONE")

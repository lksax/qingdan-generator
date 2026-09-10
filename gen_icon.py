# -*- coding: utf-8 -*-
"""Render branded iOS app icons for 清单生成器 (checklist on brand green)."""
from PIL import Image, ImageDraw

GREEN = (46, 158, 126)      # #2E9E7E brand primary
GREEN_DK = (38, 138, 110)
WHITE = (255, 255, 255)
BAR = (214, 224, 220)       # light gray list bar
SHADOW = (0, 0, 0)

S = 1024  # master size (supersampled, then downscaled)

def rounded(d, box, r, fill):
    d.rounded_rectangle(box, radius=r, fill=fill)

def check(d, cx, cy, r, color):
    # check mark: two segments forming a tick inside circle of radius r
    w = max(10, int(r * 0.30))
    p1 = (cx - int(r * 0.42), cy - int(r * 0.02))
    p2 = (cx - int(r * 0.10), cy + int(r * 0.38))
    p3 = (cx + int(r * 0.46), cy - int(r * 0.40))
    d.line([p1, p2, p3], fill=color, width=w, joint="curve")

def draw_icon(size):
    img = Image.new("RGBA", (S, S), GREEN)
    d = ImageDraw.Draw(img)
    # subtle top-light gradient via overlay
    d.rectangle([0, 0, S, int(S * 0.5)], fill=GREEN_DK)

    # white card
    m = int(S * 0.165)
    card = (m, m, S - m, S - m)
    cr = int((S - 2 * m) * 0.16)
    # soft shadow
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([card[0] + 18, card[1] + 30, card[2] + 18, card[3] + 30],
                         radius=cr, fill=(0, 0, 0, 60))
    img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img)
    rounded(d, card, cr, WHITE)

    # three list rows
    pad = int(S * 0.085)
    x0 = card[0] + pad
    x1 = card[2] - pad
    rr = int((x1 - x0) * 0.115)  # circle radius
    row_h = int((card[3] - card[1] - 2 * pad) / 3)
    for i in range(3):
        cy = card[1] + pad + row_h * (i + 0.5)
        cx = x0 + rr
        # done circle (green) with white check
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=GREEN)
        check(d, cx, cy, rr, WHITE)
        # list bar
        bw = int((x1 - (cx + rr + int(S * 0.04))) )
        bx = cx + rr + int(S * 0.04)
        bh = int(rr * 0.85)
        rounded(d, [bx, cy - bh, bx + bw, cy + bh], int(bh * 0.5), BAR)

    out = img.resize((size, size), Image.LANCZOS)
    return out

for sz, name in [(180, "apple-touch-icon.png"), (192, "icon-192.png"), (512, "icon-512.png")]:
    im = draw_icon(sz)
    im.save(f"{name}", "PNG")
    print("saved", name, im.size)

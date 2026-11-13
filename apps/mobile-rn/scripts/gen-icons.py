from pathlib import Path
from PIL import Image

src = Path(__file__).resolve().parents[1] / "assets" / "logo.png"
out = src.parent
im = Image.open(src).convert("RGBA")

size = 1024
cream = (251, 246, 237, 255)
bg = Image.new("RGBA", (size, size), cream)
pad = 80
max_w = size - pad * 2
max_h = size - pad * 2
ratio = min(max_w / im.width, max_h / im.height)
nw, nh = int(im.width * ratio), int(im.height * ratio)
logo = im.resize((nw, nh), Image.Resampling.LANCZOS)
xy = ((size - nw) // 2, (size - nh) // 2)
bg.paste(logo, xy, logo)
bg.save(out / "icon.png")
bg.save(out / "splash-icon.png")

fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
fg.paste(logo, xy, logo)
fg.save(out / "android-icon-foreground.png")
Image.new("RGB", (size, size), (251, 246, 237)).save(out / "android-icon-background.png")
bg.resize((64, 64), Image.Resampling.LANCZOS).save(out / "favicon.png")
print("icons updated from", im.size)

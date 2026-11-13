"""Remove exterior cream backdrop via edge flood-fill (keeps white heart)."""
from collections import deque
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / "assets"
src = assets / "logo-source.png"
if not src.exists():
    src = assets / "logo.png"
im = Image.open(src).convert("RGBA")
w, h = im.size
px = im.load()


def is_cream(c: tuple[int, int, int, int]) -> bool:
    r, g, b, a = c
    if a < 10:
        return True
    return r > 235 and g > 228 and b > 205 and abs(r - g) < 30 and (r - b) < 50


visited = [[False] * w for _ in range(h)]
q: deque[tuple[int, int]] = deque()
for x in range(w):
    q.append((x, 0))
    q.append((x, h - 1))
for y in range(h):
    q.append((0, y))
    q.append((w - 1, y))

while q:
    x, y = q.popleft()
    if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
        continue
    visited[y][x] = True
    if not is_cream(px[x, y]):
        continue
    px[x, y] = (0, 0, 0, 0)
    q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

bbox = im.getbbox()
if bbox:
    l, t, r, b = bbox
    pad = 8
    im = im.crop((max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad)))

out = assets / "logo.png"
im.save(out)
print("flattened", im.size, "saved", out)

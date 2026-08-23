#!/usr/bin/env python3
"""
Slice Stitch sheets into public/assets with real alpha.

Stitch exports bake a checkerboard into RGB (no alpha). We:
1) wipe checker / low-chroma gray-white
2) flood-fill from edges
3) keep only the largest connected opaque blob per cell (drops salt noise)
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = next(
    (
        p
        for p in (
            ROOT / "stitch_grade_tycoon_asset_prompts 2",
            ROOT / "stitch_grade_tycoon_asset_prompts",
        )
        if p.is_dir()
    ),
    ROOT / "stitch_grade_tycoon_asset_prompts 2",
)
OUT = ROOT / "public" / "assets"


def is_checker_bg(r: int, g: int, b: int) -> bool:
    avg = (r + g + b) / 3.0
    ch = max(r, g, b) - min(r, g, b)
    # near-white
    if avg >= 200 and ch <= 40:
        return True
    # mid gray checker tiles
    if ch <= 28 and 40 <= avg <= 190:
        return True
    # light gray
    if ch <= 35 and avg >= 170:
        return True
    return False


def is_checker_bg_chars(r: int, g: int, b: int) -> bool:
    """Gentler: dark suits / hair must survive (mid-grey wipe kills characters)."""
    avg = (r + g + b) / 3.0
    ch = max(r, g, b) - min(r, g, b)
    if avg >= 205 and ch <= 42:
        return True
    # only pale mid checker, not charcoal clothing
    if ch <= 16 and 120 <= avg <= 185:
        return True
    return False


def clear_bg(im: Image.Image, *, chars: bool = False) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size

    def wipe_pixel(r: int, g: int, b: int) -> bool:
        avg = (r + g + b) / 3.0
        ch = max(r, g, b) - min(r, g, b)
        if chars:
            # Only kill near-white; leave suits. Checker removed via edge flood.
            return avg >= 205 and ch <= 42
        return is_checker_bg(r, g, b)

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or wipe_pixel(r, g, b):
                px[x, y] = (0, 0, 0, 0)

    def soft(r: int, g: int, b: int, a: int) -> bool:
        if a == 0:
            return True
        avg = (r + g + b) / 3.0
        ch = max(r, g, b) - min(r, g, b)
        if chars:
            # Edge-connected pale + mid checker only (not dark clothing interiors)
            if avg >= 200 and ch <= 45:
                return True
            if ch <= 22 and 95 <= avg <= 190:
                return True
            return False
        if is_checker_bg(r, g, b):
            return True
        return ch <= 50 and (avg >= 160 or (avg <= 130 and ch <= 20))

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def try_seed(x: int, y: int) -> None:
        if seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if soft(r, g, b, a):
            px[x, y] = (0, 0, 0, 0)
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        try_seed(x, 0)
        try_seed(x, h - 1)
    for y in range(h):
        try_seed(0, y)
        try_seed(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                r, g, b, a = px[nx, ny]
                if soft(r, g, b, a):
                    px[nx, ny] = (0, 0, 0, 0)
                    seen[ny][nx] = True
                    q.append((nx, ny))
                else:
                    seen[ny][nx] = True
    return im


def best_character_blob(im: Image.Image, min_alpha: int = 40, min_area: int = 80) -> Image.Image | None:
    """Prefer tall character-shaped blobs over wide props (books, tablets)."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    blobs: list[list[tuple[int, int]]] = []

    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0] or px[x0, y0][3] < min_alpha:
                seen[y0][x0] = True
                continue
            blob: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque([(x0, y0)])
            seen[y0][x0] = True
            while q:
                x, y = q.popleft()
                if px[x, y][3] < min_alpha:
                    continue
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                        seen[ny][nx] = True
                        if px[nx, ny][3] >= min_alpha:
                            q.append((nx, ny))
            if len(blob) >= min_area:
                blobs.append(blob)

    if not blobs:
        return None

    def score(blob: list[tuple[int, int]]) -> tuple[float, int]:
        xs = [p[0] for p in blob]
        ys = [p[1] for p in blob]
        bw = max(xs) - min(xs) + 1
        bh = max(ys) - min(ys) + 1
        # tall + large area wins; penalize very wide short props
        aspect = bh / max(1, bw)
        return (bh * 2 + len(blob) * 0.01 + aspect * 40, len(blob))

    best = max(blobs, key=score)
    keep = set(best)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    for x, y in keep:
        opx[x, y] = px[x, y]
    return out


def largest_blob(im: Image.Image, min_alpha: int = 40, min_area: int = 80) -> Image.Image | None:
    """Keep only the largest opaque connected component; wipe the rest."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    best: list[tuple[int, int]] = []

    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0] or px[x0, y0][3] < min_alpha:
                seen[y0][x0] = True
                continue
            blob: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque([(x0, y0)])
            seen[y0][x0] = True
            while q:
                x, y = q.popleft()
                if px[x, y][3] < min_alpha:
                    continue
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                        seen[ny][nx] = True
                        if px[nx, ny][3] >= min_alpha:
                            q.append((nx, ny))
            if len(blob) > len(best):
                best = blob

    if len(best) < min_area:
        return None

    keep = set(best)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    for x, y in keep:
        opx[x, y] = px[x, y]
    return out


def tight(im: Image.Image, pad: int = 2) -> Image.Image | None:
    px = im.load()
    w, h = im.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > 40:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < 0:
        return None
    return im.crop(
        (max(0, minx - pad), max(0, miny - pad), min(w, maxx + 1 + pad), min(h, maxy + 1 + pad))
    )


def scale_h(im: Image.Image, height: int) -> Image.Image:
    return im.resize((max(1, int(im.width * height / im.height)), height), Image.NEAREST)


def scale_fit(im: Image.Image, box: int) -> Image.Image:
    s = min(box / im.width, box / im.height)
    nw, nh = max(1, int(im.width * s)), max(1, int(im.height * s))
    return im.resize((nw, nh), Image.NEAREST)


def split_grid(im: Image.Image, cols: int, rows: int, margin: float = 0.01) -> list[Image.Image]:
    w, h = im.size
    mx, my = int(w * margin), int(h * margin)
    cw, ch = (w - 2 * mx) // cols, (h - 2 * my) // rows
    return [
        im.crop((mx + c * cw, my + r * ch, mx + (c + 1) * cw, my + (r + 1) * ch))
        for r in range(rows)
        for c in range(cols)
    ]


def scrub_checker_fringe(im: Image.Image) -> Image.Image:
    """Flood-remove leftover Stitch checker from edges into mid-grey fringe."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size

    def is_checkerish(r: int, g: int, b: int, a: int) -> bool:
        if a < 40:
            return True
        avg = (r + g + b) / 3.0
        ch = max(r, g, b) - min(r, g, b)
        # pale / mid checker only — dark clothing/shoes must survive
        return ch <= 22 and 85 <= avg <= 210

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if not (0 <= x < w and 0 <= y < h) or seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_checkerish(r, g, b, a):
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                r, g, b, a = px[nx, ny]
                if is_checkerish(r, g, b, a):
                    seen[ny][nx] = True
                    q.append((nx, ny))
                else:
                    seen[ny][nx] = True
    return im


def peel_edge_checker(im: Image.Image, passes: int = 8) -> Image.Image:
    """Peel Stitch checker halo attached to the silhouette (edge-only, mid-grey).

    Keeps mid-grey props (laptop) when they touch chromatic character pixels.
    """
    im = im.convert("RGBA")
    w, h = im.size

    def checkerish(r: int, g: int, b: int, a: int) -> bool:
        if a < 40:
            return False
        avg = (r + g + b) / 3.0
        ch = max(r, g, b) - min(r, g, b)
        return ch <= 24 and 80 <= avg <= 215

    def chromatic(r: int, g: int, b: int, a: int) -> bool:
        if a < 40:
            return False
        ch = max(r, g, b) - min(r, g, b)
        avg = (r + g + b) / 3.0
        # blue hoodie / skin / hair / brown shoes / black outlines
        return ch >= 28 or avg <= 45

    for _ in range(passes):
        px = im.load()
        kill: list[tuple[int, int]] = []
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if not checkerish(r, g, b, a):
                    continue
                touch_empty = False
                touch_chroma = False
                for nx, ny in (
                    (x + 1, y),
                    (x - 1, y),
                    (x, y + 1),
                    (x, y - 1),
                    (x + 1, y + 1),
                    (x - 1, y - 1),
                    (x + 1, y - 1),
                    (x - 1, y + 1),
                ):
                    if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 40:
                        touch_empty = True
                    else:
                        rr, gg, bb, aa = px[nx, ny]
                        if chromatic(rr, gg, bb, aa):
                            touch_chroma = True
                if touch_empty and not touch_chroma:
                    kill.append((x, y))
        if not kill:
            break
        for x, y in kill:
            px[x, y] = (0, 0, 0, 0)
    return im


def drop_orphan_blobs(im: Image.Image) -> Image.Image:
    """Keep the main character blob; drop tiny disconnected islands."""
    blob = best_character_blob(im, min_alpha=40, min_area=20)
    return blob if blob is not None else im


def wipe_dark_checker_specks(im: Image.Image, max_blob: int = 35) -> Image.Image:
    """Remove small dark low-chroma islands (leftover black checker tiles)."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]

    def is_dark_checker(r: int, g: int, b: int, a: int) -> bool:
        if a < 40:
            return False
        avg = (r + g + b) / 3.0
        ch = max(r, g, b) - min(r, g, b)
        return ch <= 16 and avg <= 70

    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0]:
                continue
            r, g, b, a = px[x0, y0]
            if not is_dark_checker(r, g, b, a):
                seen[y0][x0] = True
                continue
            blob: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque([(x0, y0)])
            seen[y0][x0] = True
            while q:
                x, y = q.popleft()
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                        rr, gg, bb, aa = px[nx, ny]
                        if is_dark_checker(rr, gg, bb, aa):
                            seen[ny][nx] = True
                            q.append((nx, ny))
                        else:
                            seen[ny][nx] = True
            if len(blob) <= max_blob:
                # only wipe if mostly surrounded by empty (not shoe interior)
                border_empty = 0
                for x, y in blob:
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] < 40:
                            border_empty += 1
                            break
                if border_empty >= max(1, len(blob) // 2):
                    for x, y in blob:
                        px[x, y] = (0, 0, 0, 0)
    return im


def wipe_corner_bg(im: Image.Image, tol: int = 32) -> Image.Image:
    """Stitch bakes checker into RGB — sample cell corners and wipe matching pixels."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    samples: list[tuple[int, int, int]] = []
    for x, y in (
        (2, 2),
        (w - 3, 2),
        (2, h - 3),
        (w - 3, h - 3),
        (w // 2, 2),
        (2, h // 2),
    ):
        if 0 <= x < w and 0 <= y < h:
            r, g, b, a = px[x, y]
            if a > 0:
                samples.append((r, g, b))
    if not samples:
        return im

    def match(r: int, g: int, b: int) -> bool:
        for sr, sg, sb in samples:
            if abs(r - sr) + abs(g - sg) + abs(b - sb) <= tol * 3:
                # only wipe low-chroma / pale-ish (don't eat blue hoodie via bad sample)
                ch = max(r, g, b) - min(r, g, b)
                avg = (r + g + b) / 3.0
                if ch <= 35 and 60 <= avg <= 220:
                    return True
        return False

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and match(r, g, b):
                px[x, y] = (0, 0, 0, 0)
    return im


def extract_cell(
    cell: Image.Image,
    min_area: int = 120,
    *,
    chars: bool = False,
) -> Image.Image | None:
    if chars:
        cleaned = wipe_corner_bg(cell)
        cleaned = clear_bg(cleaned, chars=True)
        cleaned = scrub_checker_fringe(cleaned)
        cleaned = peel_edge_checker(cleaned)
        blob = best_character_blob(cleaned, min_area=min_area)
    else:
        cleaned = clear_bg(cell, chars=False)
        blob = largest_blob(cleaned, min_area=min_area)
    if blob is None:
        return None
    if chars:
        blob = scrub_checker_fringe(blob)
        blob = peel_edge_checker(blob)
        blob = wipe_dark_checker_specks(blob)
    return tight(blob, pad=1)


def save_pair(
    im: Image.Image,
    rel: Path,
    sm_h: int | None = 52,
    sm_box: int | None = None,
    *,
    scrub_sm: bool = False,
) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)
    if sm_box is not None:
        sm = scale_fit(im, sm_box)
    elif sm_h is not None:
        sm = scale_h(im, sm_h)
    else:
        return
    if scrub_sm:
        sm = drop_orphan_blobs(sm)
        sm = tight(sm, pad=0) or sm
    sm.save(path.with_name(path.stem + "_sm.png"))


# Full animation sheets (4 rows): idle | walk-diag | walk-side | work/sit
MAPPING_DELIVERY = {
    "idle": 0,
    "walk0": 4,
    "walk1": 5,
    "walk2": 6,
    "walk3": 7,
    "work0": 12,
    "work1": 13,
}

# Dev sheet row4 bakes a desk into the sprite — use laptop idle/walk instead
MAPPING_DEV = {
    "idle": 0,
    "walk0": 4,
    "walk1": 5,
    "walk2": 6,
    "walk3": 7,
    "work0": 0,
    "work1": 8,  # row3 often has laptop while moving
}

# Designer sheet: front+tablet | front walk | profile+tablet | back walk
MAPPING_DESIGNER = {
    "idle": 8,  # profile with tablet — matches other roles' side view
    "walk0": 8,
    "walk1": 9,
    "walk2": 10,
    "walk3": 11,
    "work0": 0,  # front presenting tablet
    "work1": 1,
}

# Storyboards without a sit/work row — reuse idle + walk for "working"
MAPPING_SUPPORT = {
    "idle": 0,
    "walk0": 4,
    "walk1": 5,
    "walk2": 6,
    "walk3": 7,
    "work0": 0,
    "work1": 1,
}


def extract_cell_pale_clothes(cell: Image.Image, min_area: int = 180) -> Image.Image | None:
    """Like extract_cell(chars=True) but keeps cream/off-white clothing (Designer turtleneck)."""
    im = cell.convert("RGBA")
    px = im.load()
    w, h = im.size

    def is_gray_checker(r: int, g: int, b: int, a: int) -> bool:
        if a < 20:
            return True
        avg = (r + g + b) / 3.0
        ch = max(r, g, b) - min(r, g, b)
        warm = (r + g) / 2.0 - b
        # cream sweater is warm pale — never treat as checker
        if warm >= 8 and avg >= 160:
            return False
        return ch <= 20 and 70 <= avg <= 250

    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if not (0 <= x < w and 0 <= y < h) or seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if is_gray_checker(r, g, b, a):
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                r, g, b, a = px[nx, ny]
                if is_gray_checker(r, g, b, a):
                    seen[ny][nx] = True
                    q.append((nx, ny))
                else:
                    seen[ny][nx] = True

    # Keep all sizable blobs (body + tablet/stylus may be disconnected)
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    keep: set[tuple[int, int]] = set()
    min_alpha = 40
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0] or px[x0, y0][3] < min_alpha:
                seen[y0][x0] = True
                continue
            blob: list[tuple[int, int]] = []
            q2: deque[tuple[int, int]] = deque([(x0, y0)])
            seen[y0][x0] = True
            while q2:
                x, y = q2.popleft()
                if px[x, y][3] < min_alpha:
                    continue
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                        seen[ny][nx] = True
                        if px[nx, ny][3] >= min_alpha:
                            q2.append((nx, ny))
            if len(blob) >= 40:
                keep.update(blob)
    if len(keep) < min_area:
        return None
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    for x, y in keep:
        opx[x, y] = px[x, y]
    return tight(out, pad=1)


def extract_role_grid(role: str, rel: str, mapping: dict[str, int] | None = None) -> None:
    path = SRC / rel
    if not path.is_file():
        print("skip missing", role, rel)
        return
    mapping = mapping or MAPPING_DELIVERY
    sheet = Image.open(path)
    cells = split_grid(sheet, 4, 4, 0.012)
    saved = 0
    for name, idx in mapping.items():
        if idx >= len(cells):
            continue
        candidates = [idx]
        if name == "idle":
            candidates += [1, 2, 3]
        got = None
        for ci in candidates:
            if ci >= len(cells):
                continue
            if role == "designer":
                got = extract_cell_pale_clothes(cells[ci], min_area=180)
            else:
                got = extract_cell(cells[ci], min_area=180, chars=True)
            if got is not None and got.height >= 36:
                break
        if got is None:
            print(f"  ! {role}_{name} empty")
            continue
        save_pair(got, Path("chars") / f"{role}_{name}.png", sm_h=52, scrub_sm=role != "designer")
        saved += 1
    print(f"{role}: {saved}/{len(mapping)}")


def extract_blobs_free(rel: str, names: list[str], min_area: int = 400) -> None:
    """Furniture sheet is a 2x2 layout: desk | coffee / plant | conference."""
    path = SRC / rel
    if not path.is_file():
        print("skip", rel)
        return
    sheet = clear_bg(Image.open(path))
    w, h = sheet.size
    cells = [
        sheet.crop((0, 0, w // 2, h // 2)),
        sheet.crop((w // 2, 0, w, h // 2)),
        sheet.crop((0, h // 2, w // 2, h)),
        sheet.crop((w // 2, h // 2, w, h)),
    ]
    for name, cell in zip(names, cells):
        # Plant leaves often disconnect from pot — keep all sizable blobs
        if name == "plant":
            got = merge_nearby_blobs(cell, min_area=200)
        else:
            got = extract_cell(cell, min_area=min_area)
        if got is None:
            print("  ! furniture", name)
            continue
        save_pair(got, Path("furniture") / f"{name}.png", sm_h=72)
        print("furniture", name, got.size)


def merge_nearby_blobs(cell: Image.Image, min_area: int = 200) -> Image.Image | None:
    """Keep every opaque blob above min_area (plant = pot + leaves)."""
    cleaned = clear_bg(cell, chars=False)
    im = cleaned.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    keep: set[tuple[int, int]] = set()

    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0] or px[x0, y0][3] < 40:
                seen[y0][x0] = True
                continue
            blob: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque([(x0, y0)])
            seen[y0][x0] = True
            while q:
                x, y = q.popleft()
                if px[x, y][3] < 40:
                    continue
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                        seen[ny][nx] = True
                        if px[nx, ny][3] >= 40:
                            q.append((nx, ny))
            if len(blob) >= min_area:
                keep.update(blob)

    if not keep:
        return None
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    for x, y in keep:
        opx[x, y] = px[x, y]
    return tight(out, pad=1)


def extract_ui_badges() -> None:
    """Badges include silver (low-chroma grey) — do NOT wipe mid-grey as checker."""
    rel = "16_bit_pixel_art_ui_icons_and_badges_set._1._skill_tier_badges_3_variants_of_a/screen.png"
    path = SRC / rel
    if not path.is_file():
        print("skip badges")
        return
    sheet = Image.open(path).convert("RGBA")
    cells = split_grid(sheet, 3, 3, 0.02)
    names = [
        "tier_bronze",
        "tier_silver",
        "tier_gold",
        "heart_green",
        "heart_yellow",
        "heart_red",
        "icon_reroll",
        "icon_dossier",
        "icon_shield",
    ]
    for name, cell in zip(names, cells):
        got = extract_badge_cell(cell)
        if got is None:
            print("  ! badge", name)
            continue
        save_pair(got, Path("ui") / f"{name}.png", sm_h=None, sm_box=32)
        print("ui", name, got.size)


def extract_badge_cell(cell: Image.Image) -> Image.Image | None:
    im = cell.convert("RGBA")
    px = im.load()
    w, h = im.size
    # Only wipe near-white / pale checker — keep silver greys and gold
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            avg = (r + g + b) / 3.0
            ch = max(r, g, b) - min(r, g, b)
            if avg >= 215 and ch <= 40:
                px[x, y] = (0, 0, 0, 0)
            elif ch <= 12 and 150 <= avg <= 200:
                # pale mid checker squares only
                px[x, y] = (0, 0, 0, 0)

    # Edge flood pale leftovers
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def soft(r: int, g: int, b: int, a: int) -> bool:
        if a < 30:
            return True
        avg = (r + g + b) / 3.0
        ch = max(r, g, b) - min(r, g, b)
        return avg >= 210 and ch <= 45

    def seed(x: int, y: int) -> None:
        if seen[y][x]:
            return
        r, g, b, a = px[x, y]
        if soft(r, g, b, a):
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                r, g, b, a = px[nx, ny]
                if soft(r, g, b, a):
                    seen[ny][nx] = True
                    q.append((nx, ny))
                else:
                    seen[ny][nx] = True

    blob = largest_blob(im, min_area=80)
    return tight(blob, pad=1) if blob else None


def extract_tiles() -> None:
    """Floor diamonds from Stitch sheet are hard to isolate (merged clusters).
    Generate clean iso tiles tinted from the sheet palette; walls from tall blobs.
    """
    rel = "16_bit_pixel_art_floor_and_wall_tile_set._isometric_2_1_diamond_tiles._tier_1/screen.png"
    path = SRC / rel
    face = (198, 208, 220)
    face2 = (186, 200, 176)
    face3 = (176, 198, 222)
    if path.is_file():
        cleaned = clear_bg(Image.open(path))
        # sample opaque colors
        from collections import Counter

        px = cleaned.load()
        w, h = cleaned.size
        cols: list[tuple[int, int, int]] = []
        for y in range(0, h, 6):
            for x in range(0, w, 6):
                r, g, b, a = px[x, y]
                if a > 200 and not is_checker_bg(r, g, b):
                    cols.append((r, g, b))
        top = [c for c, _ in Counter(cols).most_common(12)]
        if top:
            face = top[0]
            for c in top[1:]:
                if sum(abs(a - b) for a, b in zip(c, face)) > 35:
                    face2 = c
                    break
            for c in top[1:]:
                if (
                    sum(abs(a - b) for a, b in zip(c, face)) > 35
                    and sum(abs(a - b) for a, b in zip(c, face2)) > 35
                ):
                    face3 = c
                    break

        # walls from tall blobs
        seen = [[False] * w for _ in range(h)]
        walls: list[Image.Image] = []
        for y0 in range(h):
            for x0 in range(w):
                if seen[y0][x0] or px[x0, y0][3] < 40:
                    seen[y0][x0] = True
                    continue
                blob: list[tuple[int, int]] = []
                q: deque[tuple[int, int]] = deque([(x0, y0)])
                seen[y0][x0] = True
                while q:
                    x, y = q.popleft()
                    if px[x, y][3] < 40:
                        continue
                    blob.append((x, y))
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx]:
                            seen[ny][nx] = True
                            if px[nx, ny][3] >= 40:
                                q.append((nx, ny))
                if len(blob) < 2000:
                    continue
                xs = [p[0] for p in blob]
                ys = [p[1] for p in blob]
                bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
                if bh < 80 or bh < bw * 0.9:
                    continue
                box = cleaned.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
                mask = Image.new("RGBA", box.size, (0, 0, 0, 0))
                mpx = mask.load()
                bpx = box.load()
                ox, oy = min(xs), min(ys)
                keep = {(x - ox, y - oy) for x, y in blob}
                for y in range(box.height):
                    for x in range(box.width):
                        if (x, y) in keep:
                            mpx[x, y] = bpx[x, y]
                t = tight(mask, pad=1)
                if t:
                    walls.append(t)
        walls.sort(key=lambda i: -(i.width * i.height))
        names = ["wall_a", "wall_b", "wall_window", "wall_solid"]
        for name, wall in zip(names, walls[:4]):
            save_pair(wall, Path("tiles") / f"{name}.png", sm_h=64)
            print("wall", name, wall.size)

    def make_iso_tile(
        tw: int,
        face_rgb: tuple[int, int, int],
    ) -> Image.Image:
        H = tw // 2
        thick = 8
        out = Image.new("RGBA", (tw, H + thick), (0, 0, 0, 0))
        px = out.load()
        side = tuple(max(0, c - 40) for c in face_rgb)
        outline = tuple(max(0, c - 90) for c in face_rgb)

        def in_diamond(x: int, y: int) -> bool:
            return abs((x + 0.5) - tw / 2) / (tw / 2) + abs((y + 0.5) - H / 2) / (H / 2) <= 1.02

        for y in range(H):
            for x in range(tw):
                if not in_diamond(x, y):
                    continue
                edge = any(
                    not (0 <= nx < tw and 0 <= ny < H and in_diamond(nx, ny))
                    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))
                )
                px[x, y] = (*outline, 255) if edge else (*face_rgb, 255)
        for y in range(H // 2, H):
            for x in range(tw):
                if px[x, y][3] == 0:
                    continue
                for dy in range(1, thick + 1):
                    yy = y + dy
                    if yy >= H + thick:
                        break
                    px[x, yy] = (*side, 255) if x < tw / 2 else (max(0, side[0] - 20), max(0, side[1] - 20), max(0, side[2] - 20), 255)
        return out

    # Prefer readable light office floors — Stitch sheet often samples near-black
    def lift(rgb: tuple[int, int, int], fallback: tuple[int, int, int]) -> tuple[int, int, int]:
        if sum(rgb) / 3 < 90:
            return fallback
        return rgb

    face = lift(face, (198, 208, 220))
    face2 = lift(face2, (176, 188, 200))
    face3 = lift(face3, (210, 216, 226))

    for name, fcol in (("tile_t1", face), ("tile_t2", face2), ("tile_t3", face3)):
        tile = make_iso_tile(48, fcol)
        tile.save(OUT / "tiles" / f"{name}.png")
        tile.save(OUT / "tiles" / f"{name}_sm.png")
        print("tile", name, tile.size, fcol)


def extract_logo() -> None:
    path = SRC / "grade_tycoon_pixel_logo" / "screen.png"
    if not path.is_file():
        return
    got = extract_cell(Image.open(path), min_area=50)
    if got:
        save_pair(got, Path("ui") / "pixel_g.png", sm_h=48)
        print("logo", got.size)


def main() -> None:
    print("SRC =", SRC)
    for d in ("chars", "furniture", "tiles", "ui"):
        (OUT / d).mkdir(parents=True, exist_ok=True)

    # Delivery roles — sheet identity from art (not folder number order):
    # chibi_1 yellow clipboard woman → HR
    # chibi_2 blue hoodie + laptop → Dev
    # chibi_3 navy suit + briefcase → Sales
    extract_role_grid(
        "hr",
        "16_bit_pixel_art_character_sprite_sheet_isometric_2_1_game_asset_chibi_1/screen.png",
        MAPPING_DELIVERY,
    )
    extract_role_grid(
        "dev",
        "16_bit_pixel_art_character_sprite_sheet_isometric_2_1_game_asset_chibi_2/screen.png",
        MAPPING_DEV,
    )
    extract_role_grid(
        "sales",
        "16_bit_pixel_art_character_sprite_sheet_isometric_2_1_game_asset_chibi_3/screen.png",
        MAPPING_DELIVERY,
    )
    extract_role_grid(
        "designer",
        "16_bit_pixel_art_character_sprite_sheet_the_designer/screen.png",
        MAPPING_DESIGNER,
    )

    support = {
        "recruiter": "16_bit_pixel_art_character_storyboard_the_recruiter._a_chibi_character_in_a/screen.png",
        "marketer": "16_bit_pixel_art_character_storyboard_the_marketer._a_chibi_character_in_a/screen.png",
        "lead_gen": "16_bit_pixel_art_character_storyboard_the_lead_gen_specialist._a_chibi/screen.png",
        "team_lead": "16_bit_pixel_art_character_storyboard_the_team_lead._a_chibi_character_in_a/screen.png",
        "accountant": "16_bit_pixel_art_character_storyboard_the_accountant._a_chibi_character_in_a/screen.png",
    }
    for role, rel in support.items():
        extract_role_grid(role, rel, MAPPING_SUPPORT)

    extract_blobs_free(
        "16_bit_pixel_art_isometric_office_furniture_set._items_include_1._office_desk/screen.png",
        ["desk", "coffee", "plant", "conference"],
        min_area=800,
    )
    extract_ui_badges()
    extract_tiles()
    extract_logo()
    print("done")


if __name__ == "__main__":
    main()

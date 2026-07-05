from pathlib import Path
import math
import random

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


SOURCE_DIR = Path("水晶作品集")
OUTPUT_DIR = Path("水晶作品集_商品圖優化_v2")
OUTPUT_SIZE = 1600
MAX_GRABCUT_SIDE = 1200
MAX_MODEL_SIDE = 1800


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

try:
    from rembg import new_session, remove

    REMBG_SESSION = new_session("isnet-general-use")
except Exception:
    remove = None
    REMBG_SESSION = None


PALETTES = [
    ((255, 249, 242), (236, 214, 229), (183, 147, 199), (214, 173, 120)),
    ((250, 246, 238), (229, 238, 231), (189, 209, 199), (199, 156, 128)),
    ((255, 247, 247), (238, 222, 246), (202, 180, 220), (229, 186, 158)),
    ((248, 244, 237), (229, 222, 210), (192, 173, 157), (183, 139, 62)),
]


def list_source_images():
    return [
        path
        for path in sorted(SOURCE_DIR.iterdir())
        if path.is_file()
        and path.suffix.lower() in IMAGE_EXTENSIONS
        and not path.name.startswith("contact-sheet")
    ]


def load_image(path):
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")


def make_background(seed, size=OUTPUT_SIZE):
    random.seed(seed)
    top, bottom, accent, gold = PALETTES[seed % len(PALETTES)]
    w = h = size
    y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    mix = np.clip((x * 0.42 + y * 0.68), 0, 1)
    top_arr = np.array(top, dtype=np.float32)
    bottom_arr = np.array(bottom, dtype=np.float32)
    bg = top_arr * (1 - mix[..., None]) + bottom_arr * mix[..., None]

    vignette = 1 - 0.18 * np.sqrt((x - 0.5) ** 2 + (y - 0.45) ** 2)
    bg *= np.clip(vignette[..., None], 0.86, 1.0)
    bg = np.clip(bg, 0, 255).astype(np.uint8)
    image = Image.fromarray(bg, "RGB").convert("RGBA")
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay, "RGBA")

    # Soft silk-like ribbons.
    for idx in range(6):
        phase = random.random() * math.tau
        amp = random.randint(26, 70)
        base_y = int(h * (0.54 + idx * 0.055))
        points = []
        for px in range(-80, w + 81, 42):
            py = base_y + int(math.sin(px / 170 + phase) * amp)
            points.append((px, py))
        color = accent + (30 + idx * 4,)
        draw.line(points, fill=color, width=random.randint(18, 34), joint="curve")

    # Pearl/bokeh glow dots.
    for _ in range(42):
        cx = random.randint(-80, w + 80)
        cy = random.randint(-40, int(h * 0.65))
        radius = random.randint(16, 70)
        color = random.choice([top, bottom, accent, gold]) + (random.randint(18, 48),)
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color)

    # Subtle product platform.
    draw.ellipse(
        (int(w * 0.18), int(h * 0.72), int(w * 0.82), int(h * 0.88)),
        fill=(80, 45, 90, 28),
    )

    overlay = overlay.filter(ImageFilter.GaussianBlur(20))
    image = Image.alpha_composite(image, overlay)
    grain = np.random.default_rng(seed).normal(0, 2.4, (h, w, 1))
    arr = np.asarray(image.convert("RGB"), dtype=np.float32)
    arr = np.clip(arr + grain, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB").convert("RGBA")


def grabcut_alpha(image):
    rgb = np.array(image)
    h, w = rgb.shape[:2]
    scale = min(1.0, MAX_GRABCUT_SIDE / max(w, h))
    small = cv2.resize(rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    sh, sw = small.shape[:2]

    mask = np.zeros((sh, sw), np.uint8)
    margin_x = max(8, int(sw * 0.045))
    margin_y = max(8, int(sh * 0.045))
    rect = (margin_x, margin_y, sw - margin_x * 2, sh - margin_y * 2)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    try:
        cv2.grabCut(small, mask, rect, bgd_model, fgd_model, 6, cv2.GC_INIT_WITH_RECT)
        alpha_small = np.where(
            (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD),
            255,
            0,
        ).astype(np.uint8)
    except cv2.error:
        alpha_small = np.ones((sh, sw), np.uint8) * 255

    kernel = np.ones((5, 5), np.uint8)
    alpha_small = cv2.morphologyEx(alpha_small, cv2.MORPH_CLOSE, kernel, iterations=2)
    alpha_small = cv2.morphologyEx(alpha_small, cv2.MORPH_OPEN, kernel, iterations=1)
    alpha = cv2.resize(alpha_small, (w, h), interpolation=cv2.INTER_CUBIC)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.6)
    return Image.fromarray(alpha, "L")


def crop_subject(image, alpha):
    alpha_arr = np.array(alpha)
    ys, xs = np.where(alpha_arr > 18)
    if not len(xs) or not len(ys):
        rgba = image.convert("RGBA")
        rgba.putalpha(Image.new("L", image.size, 255))
        return rgba

    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()
    pad = int(max(x2 - x1, y2 - y1) * 0.08)
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(image.width - 1, x2 + pad)
    y2 = min(image.height - 1, y2 + pad)

    rgba = image.convert("RGBA")
    rgba.putalpha(alpha)
    return rgba.crop((x1, y1, x2 + 1, y2 + 1))


def crop_rgba_to_alpha(image):
    alpha = image.getchannel("A")
    alpha_arr = np.array(alpha)
    ys, xs = np.where(alpha_arr > 16)
    if not len(xs) or not len(ys):
        return image

    x1, x2 = xs.min(), xs.max()
    y1, y2 = ys.min(), ys.max()
    pad = int(max(x2 - x1, y2 - y1) * 0.14)
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(image.width - 1, x2 + pad)
    y2 = min(image.height - 1, y2 + pad)
    return image.crop((x1, y1, x2 + 1, y2 + 1))


def extract_subject(image):
    if remove and REMBG_SESSION:
        model_image = image.copy()
        model_image.thumbnail((MAX_MODEL_SIDE, MAX_MODEL_SIDE), Image.Resampling.LANCZOS)
        cutout = remove(
            model_image,
            session=REMBG_SESSION,
            alpha_matting=True,
            alpha_matting_foreground_threshold=235,
            alpha_matting_background_threshold=18,
            alpha_matting_erode_size=8,
        )
        if cutout.mode != "RGBA":
            cutout = cutout.convert("RGBA")
        return crop_rgba_to_alpha(cutout)

    alpha = grabcut_alpha(image)
    return crop_subject(image, alpha)


def compose_product(subject, seed):
    canvas = make_background(seed)
    max_w = int(OUTPUT_SIZE * 0.78)
    max_h = int(OUTPUT_SIZE * 0.72)
    ratio = min(max_w / subject.width, max_h / subject.height, 1.0)
    subject = subject.resize(
        (max(1, int(subject.width * ratio)), max(1, int(subject.height * ratio))),
        Image.Resampling.LANCZOS,
    )

    x = (OUTPUT_SIZE - subject.width) // 2
    y = int(OUTPUT_SIZE * 0.52 - subject.height / 2)
    y = max(int(OUTPUT_SIZE * 0.16), min(y, OUTPUT_SIZE - subject.height - int(OUTPUT_SIZE * 0.08)))

    alpha = subject.getchannel("A")
    shadow = Image.new("RGBA", subject.size, (40, 20, 45, 0))
    shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(22)).point(lambda p: int(p * 0.28)))
    canvas.alpha_composite(shadow, (x + 18, y + 28))
    canvas.alpha_composite(subject, (x, y))

    # A barely visible front highlight, kept behind the product by drawing after shadow only.
    gloss = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(gloss, "RGBA")
    draw.ellipse(
        (int(OUTPUT_SIZE * 0.25), int(OUTPUT_SIZE * 0.78), int(OUTPUT_SIZE * 0.75), int(OUTPUT_SIZE * 0.91)),
        fill=(255, 255, 255, 28),
    )
    gloss = gloss.filter(ImageFilter.GaussianBlur(28))
    canvas = Image.alpha_composite(canvas, gloss)
    canvas.alpha_composite(subject, (x, y))
    return canvas.convert("RGB")


def make_contact_sheet(paths, out_path):
    thumbs = []
    for path in paths:
        image = Image.open(path).convert("RGB")
        image.thumbnail((280, 280))
        tile = Image.new("RGB", (300, 340), (248, 244, 237))
        tile.paste(image, ((300 - image.width) // 2, 12))
        draw = ImageDraw.Draw(tile)
        draw.text((12, 304), path.name, fill=(36, 26, 43))
        thumbs.append(tile)

    cols = 4
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * 300, rows * 340), (255, 250, 240))
    for idx, tile in enumerate(thumbs):
        sheet.paste(tile, ((idx % cols) * 300, (idx // cols) * 340))
    sheet.save(out_path, quality=92)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    result_paths = []
    for idx, path in enumerate(list_source_images()):
        image = load_image(path)
        subject = extract_subject(image)
        result = compose_product(subject, idx)
        out_path = OUTPUT_DIR / f"{path.stem}_product.webp"
        result.save(out_path, "WEBP", quality=96, method=6)
        result_paths.append(out_path)
        print(out_path)

    make_contact_sheet(result_paths, OUTPUT_DIR / "contact-sheet-optimized.jpg")
    print(OUTPUT_DIR / "contact-sheet-optimized.jpg")


if __name__ == "__main__":
    main()

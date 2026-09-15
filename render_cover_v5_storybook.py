from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
V5 = ROOT / "competition-assets" / "v5"
SCENE = V5 / "storybook-scene.png"
OUT = V5 / "cover-storybook.png"
THUMB = V5 / "cover-storybook-375x250.png"
MANIFEST = V5 / "manifest-v5.json"
ICON = ROOT / "public" / "favicon-light.webp"

CANVAS = (1536, 1024)
SAFE = (108, 72, 1428, 952)
DISPLAY = "/Users/jojo/Library/Fonts/FZLanTYJW_Da.TTF"
NAVY = (9, 59, 81, 255)


def inside_safe(box: tuple[int, int, int, int]) -> bool:
    return box[0] >= SAFE[0] and box[1] >= SAFE[1] and box[2] <= SAFE[2] and box[3] <= SAFE[3]


def main() -> None:
    base = Image.open(SCENE).convert("RGBA")
    if base.size != CANVAS:
        base = base.resize(CANVAS, Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(base)

    # One sentence only: hand-painted display typography, with a quiet cream edge for legibility.
    sentence = "喜欢的歌，一起下水"
    text_font = ImageFont.truetype(DISPLAY, 118)
    x, y = 118, 170
    bbox = draw.textbbox((x, y), sentence, font=text_font, stroke_width=4)
    draw.text((x + 7, y + 10), sentence, font=text_font, fill=(255, 255, 255, 170), stroke_width=7, stroke_fill=(255, 255, 255, 150))
    draw.text((x, y), sentence, font=text_font, fill=NAVY, stroke_width=4, stroke_fill=(255, 250, 220, 245))
    sentence_box = (bbox[0], bbox[1], bbox[2], bbox[3])

    # One prominent icon in the opposite corner, treated like a printed storybook seal.
    icon = Image.open(ICON).convert("RGBA").resize((122, 122), Image.Resampling.LANCZOS)
    ix, iy = 1250, 82
    medallion = Image.new("RGBA", (164, 164), (0, 0, 0, 0))
    md = ImageDraw.Draw(medallion)
    md.ellipse((3, 3, 160, 160), fill=(255, 249, 219, 235), outline=(255, 255, 255, 245), width=4)
    md.ellipse((13, 13, 150, 150), outline=(46, 176, 190, 160), width=3)
    medallion.alpha_composite(icon, (21, 21))
    shadow = medallion.getchannel("A").filter(ImageFilter.GaussianBlur(12))
    shadow_layer = Image.new("RGBA", medallion.size, (18, 85, 95, 0))
    shadow_layer.putalpha(shadow.point(lambda a: round(a * 0.28)))
    base.alpha_composite(shadow_layer, (ix + 9, iy + 13))
    base.alpha_composite(medallion, (ix, iy))
    icon_box = (ix, iy, ix + 164, iy + 164)

    base.convert("RGB").save(OUT, "PNG", optimize=True)
    base.resize((375, 250), Image.Resampling.LANCZOS).convert("RGB").save(THUMB, "PNG", optimize=True)
    manifest = {
        "version": 5,
        "style": "storybook watercolor / gouache",
        "canvas": {"width": 1536, "height": 1024, "ratio": "3:2"},
        "mobile_check": {"width": 375, "height": 250},
        "source_scene": str(SCENE),
        "kept_elements": ["one sentence: 喜欢的歌，一起下水", "one product icon", "Pig Little Brother swimming"],
        "removed_elements": ["product name", "citation line", "subtitles", "feature text", "UI", "album art", "domain", "extra decorations"],
        "boxes": {"sentence": sentence_box, "icon": icon_box},
        "safe_zone_pass": all(inside_safe(b) for b in [sentence_box, icon_box]),
        "output": str(OUT),
        "thumbnail": str(THUMB),
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

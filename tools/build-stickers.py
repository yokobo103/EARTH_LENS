"""Extract the current EARTH LENS mission stickers from an owner-supplied sheet.

Usage:
  python tools/build-stickers.py path/to/mission-sticker-sheet.jpg

The runtime uses the generated WebP files only. The source sheet is intentionally
not copied into the public bundle.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = PROJECT_ROOT / "src" / "assets" / "stickers"

# The current catalog has eight missions. Lithium and East African Rift are
# missions 07/08 in the app but stickers 08/09 on the concept sheet; the UI
# supplies a small canonical mission-number tab over the embedded concept label.
CROPS = {
    "mission-01-malacca.webp": (8, 2, 277, 288),
    "mission-02-himalayas.webp": (280, 2, 516, 292),
    "mission-03-hormuz.webp": (514, 2, 768, 288),
    "mission-04-suez.webp": (756, 3, 1004, 288),
    "mission-05-rotterdam.webp": (993, 2, 1277, 288),
    "mission-06-gibraltar.webp": (8, 286, 277, 576),
    "mission-07-lithium.webp": (503, 283, 773, 578),
    "mission-08-rift.webp": (768, 286, 1008, 576),
}


def remove_sheet_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    output = []
    for red, green, blue, _ in rgba.get_flattened_data():
        low = min(red, green, blue)
        high = max(red, green, blue)
        chroma = high - low

        # The JPEG sheet background is neutral white. Preserve the warm cream
        # sticker borders by requiring both high luminance and low chroma.
        if low >= 249 and chroma <= 7:
            alpha = 0
        elif low >= 241 and chroma <= 10:
            alpha = round(255 * (249 - low) / 8)
        else:
            alpha = 255
        output.append((red, green, blue, alpha))

    rgba.putdata(output)
    alpha = rgba.getchannel("A")
    alpha_pixels = alpha.load()
    width, height = rgba.size
    visited = bytearray(width * height)
    largest_component: list[tuple[int, int]] = []

    for y in range(height):
        for x in range(width):
            index = y * width + x
            if visited[index] or alpha_pixels[x, y] <= 16:
                continue
            component: list[tuple[int, int]] = []
            stack = [(x, y)]
            visited[index] = 1
            while stack:
                current_x, current_y = stack.pop()
                component.append((current_x, current_y))
                for next_x, next_y in (
                    (current_x - 1, current_y),
                    (current_x + 1, current_y),
                    (current_x, current_y - 1),
                    (current_x, current_y + 1),
                ):
                    if not (0 <= next_x < width and 0 <= next_y < height):
                        continue
                    next_index = next_y * width + next_x
                    if visited[next_index] or alpha_pixels[next_x, next_y] <= 16:
                        continue
                    visited[next_index] = 1
                    stack.append((next_x, next_y))
            if len(component) > len(largest_component):
                largest_component = component

    keep = set(largest_component)
    cleaned_alpha = Image.new("L", rgba.size, 0)
    cleaned_pixels = cleaned_alpha.load()
    for x, y in keep:
        cleaned_pixels[x, y] = alpha_pixels[x, y]
    rgba.putalpha(cleaned_alpha)

    alpha_box = rgba.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError("Sticker crop became fully transparent")

    trimmed = rgba.crop(alpha_box)
    framed = Image.new("RGBA", (trimmed.width + 12, trimmed.height + 12), (0, 0, 0, 0))
    framed.alpha_composite(trimmed, (6, 6))
    return framed


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Pass the owner-supplied sticker sheet path")

    source_path = Path(sys.argv[1]).expanduser().resolve()
    sheet = Image.open(source_path)
    if sheet.size != (1280, 853):
        raise SystemExit(f"Unexpected source size {sheet.size}; expected (1280, 853)")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, box in CROPS.items():
        sticker = remove_sheet_background(sheet.crop(box))
        output_path = OUTPUT_DIR / filename
        sticker.save(output_path, "WEBP", quality=88, method=6, exact=True)
        print(f"{filename}: {sticker.width}x{sticker.height} / {output_path.stat().st_size} bytes")


if __name__ == "__main__":
    main()

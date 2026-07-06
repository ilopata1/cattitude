"""Generate PWA icon sizes from the Cattitude hero logo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = (
    REPO_ROOT
    / "mobile/src/assets/images/vessels/cattitude/systems/logo-hero-6e4130b11588.png"
)
ICONS_DIR = REPO_ROOT / "mobile/src/assets/icons"
FAVICON = REPO_ROOT / "mobile/src/assets/icon/favicon.png"

SIZES: dict[str, int] = {
    "icon-192.png": 192,
    "icon-512.png": 512,
    "apple-touch-icon.png": 180,
}


def resize_icon(source: Image.Image, size: int) -> Image.Image:
    return source.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SOURCE.is_file():
        raise SystemExit(f"Source logo not found: {SOURCE}")

    ICONS_DIR.mkdir(parents=True, exist_ok=True)
    FAVICON.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(SOURCE) as img:
        rgb = img.convert("RGB")
        for name, size in SIZES.items():
            out = ICONS_DIR / name
            resize_icon(rgb, size).save(out, format="PNG", optimize=True)
            print(f"Wrote {out} ({size}x{size})")

        resize_icon(rgb, 64).save(FAVICON, format="PNG", optimize=True)
        print(f"Wrote {FAVICON} (64x64)")


if __name__ == "__main__":
    main()

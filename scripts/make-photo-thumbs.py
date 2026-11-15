#!/usr/bin/env python3
"""Crops downloaded public-domain / CC0 images into Projects thumbnails (720x480 WebP).
Usage: python3 scripts/make-photo-thumbs.py OUT_NAME IMAGE CROP_Y BRIGHTNESS [OUT_NAME IMAGE CROP_Y BRIGHTNESS ...]
  OUT_NAME   e.g. market-light-360.webp (written to assets/projects/)
  CROP_Y     0..1, where to take the 3:2 band when the image is taller than 3:2
  BRIGHTNESS 1 keeps the image as is; below 1 darkens it for dark mode
Sources and licences are recorded in docs/project-concept-references.json."""
import os, sys
from PIL import Image, ImageEnhance
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'projects')
def crop32(im, fy):
    w, h = im.size; th = round(w * 2 / 3)
    if th <= h:
        y = round((h - th) * fy); return im.crop((0, y, w, y + th))
    tw = round(h * 3 / 2); x = (w - tw) // 2; return im.crop((x, 0, x + tw, h))
args = sys.argv[1:]
for i in range(0, len(args), 4):
    name, path, fy, bright = args[i], args[i + 1], float(args[i + 2]), float(args[i + 3])
    im = crop32(Image.open(path).convert('RGB'), fy)
    if bright != 1: im = ImageEnhance.Brightness(im).enhance(bright)
    im.resize((720, 480), Image.LANCZOS).save(os.path.join(OUT, name), quality=88, method=6)

#!/usr/bin/env python3
"""Draws the Projects-index thumbnails (light + dark, 720x480 WebP, shown at
360x240 and scaled down to ~128px). Flat, bold, one idea each, in the palette of
the Transfer-beats-volume thumbnail. Every figure comes from the project's own
page; nothing here is a screenshot or a measured result beyond those figures."""
import math, os
from PIL import Image, ImageDraw, ImageFont
K = 2
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'projects')
FONT = '/System/Library/Fonts/HelveticaNeue.ttc'
THEMES = {'light': dict(bg=(250,250,249), ink=(28,25,23), mute=(87,83,78), faint=(214,211,209)),
          'dark': dict(bg=(12,10,9), ink=(231,229,228), mute=(168,162,158), faint=(68,64,60))}
def font(size, bold=False): return ImageFont.truetype(FONT, int(size * K), index=1 if bold else 0)
def box(d, x0, y0, x1, y1, **kw): d.rectangle([x0*K, y0*K, x1*K, y1*K], **kw)
def txt(d, x, y, s, size, fill, bold=False): d.text((x*K, y*K), s, font=font(size, bold), fill=fill)

def engine(d, c):
    txt(d, 30, 16, 'Red-team engine', 26, c['ink'], True)
    txt(d, 28, 52, '5 of 6', 68, c['ink'], True)
    txt(d, 30, 130, 'levels broken', 22, c['mute'])
    for i in range(6):
        x = 30 + i * 52
        if i < 5: box(d, x, 170, x + 42, 218, fill=c['ink'])
        else: box(d, x, 170, x + 42, 218, outline=c['ink'], width=4 * K)

def security(d, c):
    txt(d, 30, 16, 'Agent-security CTF', 26, c['ink'], True)
    txt(d, 30, 50, '6 levels completed', 20, c['mute'])
    for i in range(6):
        h = 28 + i * 22; x = 30 + i * 52
        box(d, x, 214 - h, x + 42, 214, fill=c['ink'])

JOBS = dict(engine=engine, security=security)
if __name__ == '__main__':
    for key, fn in JOBS.items():
        for name, c in THEMES.items():
            im = Image.new('RGB', (360 * K, 240 * K), c['bg']); fn(ImageDraw.Draw(im), c)
            im.save(os.path.join(OUT, f'{key}-{name}-360.webp'), quality=92, method=6)

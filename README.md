# VELOCE — scroll-cinematic auto site

A scroll-scrubbed cinematic hero site for an automotive brand with a software-engineering
angle. Built with the `scroll-cinematic` skill (vendored in [`Skills/`](Skills/)).

## How the "3D scroll" works

There is **no Three.js**. Each source clip is exported to numbered JPGs, all preloaded in the
browser, and the frame painted to a `<canvas>` is selected by scroll progress. Scrolling
forward plays the clip; scrolling backward reverses it. The 3D feel comes entirely from the
source video.

Stack: plain HTML + CSS + JS + [Lenis](https://github.com/darkroomengineering/lenis) smooth
scroll. Zero build — runs from any static server.

## Run it locally

- **Windows:** double-click `Launch Demo.bat`
- **macOS / Linux:** double-click `Launch Demo.command`

Both serve the folder on <http://localhost:8090>.

Or manually:

```bash
python -m http.server 8090
```

## Sections

| Section | Type | Frames | Source clip |
|---|---|---|---|
| `#hero` | canvas scrub | 180 | `Assets/Blue Auto float 360 dark.mp4` (360° turntable) |
| benefits | static | — | — |
| `#code` | canvas scrub | 145 | `Assets/Blue auto zoom in on code dark.mp4` (code reflection) |
| stats | static, animated counters | — | — |
| CTA | static | — | — |

Frame sequences live in `frames/spin/` and `frames/code/`, named `frame_0000.jpg` upward
(zero-indexed, 4-digit zero-padded). Both are 1280×720 JPEG q82 — 13.6 MB and 11.8 MB
respectively.

The `#code` section is 145 frames because that is the clip's **native** frame count
(6.04 s @ 24 fps); it is not resampled, so every frame is unique.

## Regenerating frames

Requires `ffmpeg` and Python with Pillow.

```bash
# 180 frames, resampled to fill the section
ffmpeg -i "Assets/Blue Auto float 360 dark.mp4" \
  -vf "fps=180/10.041667,scale=1280:-2:flags=lanczos" \
  -frames:v 180 -start_number 0 png/spin/frame_%04d.png

# native frame rate, no resampling
ffmpeg -i "Assets/Blue auto zoom in on code dark.mp4" \
  -vf "scale=1280:-2:flags=lanczos" \
  -start_number 0 png/code/frame_%04d.png
```

Then encode the PNGs to JPEG q82 into `frames/<name>/`.

Keep each section under ~15 MB or first paint gets slow. At 1600 px / q88 these clips came
out at ~26 MB per section, which is why they ship at 1280 px / q82.

## Config

`SCRUB_SECTIONS` at the bottom of [`index.html`](index.html) drives the engine — one entry
per clip. The engine skips any section whose element is missing.

> **Note:** `scroll-cinematic.js` is patched relative to the stock template. The template
> requested `framePath(i + 1)` (1-indexed); these frame folders start at `frame_0000`, so it
> now requests `framePath(i)`. The overlay headlines also need the `reveal-line` class — the
> template's `line` class alone is not what the engine queries.

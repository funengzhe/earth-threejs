# Earth Three.js

A standalone Three.js Earth renderer focused on a presentation-ready look: layered surface color grading, cloud shell, cloud shadows, night-side compression, black rim, blue atmosphere, rotation, and live tuning controls.

This repository is intentionally independent from any product website. It only contains the Earth visual experiment and the minimal assets needed to run it locally.

## Preview Locally

```bash
python3 -m http.server 4173
```

Open:

```text
http://127.0.0.1:4173
```

Useful query parameters:

```text
http://127.0.0.1:4173?bg=light
http://127.0.0.1:4173?freeze=1
```

## Files

```text
.
├── index.html
├── earth-three.js
├── assets/
│   ├── favicon.svg
│   └── earth/
│       ├── earth_day_4k.jpg
│       ├── earth_atmos_2048.jpg
│       ├── earth_webgl_clouds_2048.png
│       ├── earth_lights_2048.png
│       └── react-earth-lite/
└── vendor/
    └── three.module.js
```

## Checks

```bash
node --check earth-three.js
```

## Asset Notes

Project code is MIT licensed. Third-party Earth texture/support assets keep their own notices:

- `assets/earth/earth-webgl-LICENSE.txt`
- `assets/earth/react-earth-lite/LICENSE.txt`

The vendored Three.js runtime is included so the demo can run without an npm install.

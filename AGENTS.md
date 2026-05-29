# Agent Notes

## Scope

This repository is a standalone open-source Three.js Earth renderer. Keep it independent from any product website or backend service.

## Source Of Truth

- `earth-three.js` owns rendering, defaults, quality profiles, and exported API.
- `index.html` must stay clean and show only the Earth.
- `tuning.html` is the debug/tuning page and may contain controls.
- `docs/` contains user-facing and agent-facing documentation.

## Visual Direction

Preserve the current approved look unless the user explicitly asks for visual changes: sharp Earth texture, dark-side black veil, subtle black rim, blue atmosphere layers, and a faint white/background halo around the full silhouette.

Do not replace the dark side with general ambient light. If the dark side needs adjustment, use `darkStrength` and related veil/rim controls.

## Performance Direction

Prefer non-visual-regression optimizations first:

- Use `quality` profiles.
- Cap DPR, MSAA, and texture anisotropy.
- Pause hidden or offscreen rendering.
- Stop animation when `rotationSpeed` is `0`.

Avoid deleting cloud, atmosphere, shadow, or composite layers unless the user explicitly chooses that tradeoff.

## Checks

Run these before committing:

```bash
node --check earth-three.js
git diff --check
```

Do not commit generated screenshots, temporary browser files, or local server artifacts.

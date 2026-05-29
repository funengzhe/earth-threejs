# 调试文档

`tuning.html` 是这个项目的视觉调参台。它的目标不是做成产品页面，而是让你快速比较地球质感、复制参数、确认默认效果。

## 打开方式

```bash
python3 -m http.server 4173
```

```text
http://127.0.0.1:4173/tuning.html
```

推荐在 Chrome 或 Safari 中调试 WebGL。截图或参数对比时可以加：

```text
http://127.0.0.1:4173/tuning.html?bg=light&freeze=1
```

## 推荐流程

1. 打开 `tuning.html`。
2. 先确认背景，黑底看电影感，白底看边缘轮廓。
3. 先调光照，再调暗部，最后调大气层和云层。
4. 点击“复制参数链接”保存当前状态。
5. 如果这版要作为默认效果，把 URL 里的参数同步到 `earth-three.js` 的 `EARTH_TUNING_PRESET`。
6. 打开“纯展示页”检查没有面板遮挡时的最终观感。

## 参数说明

### 构图

- `cameraZ` / 画面大小：数值越小，地球越大；数值越大，地球越小。当前默认 `5.45` 偏完整展示。

### 光照

- `lightX` / 光照 X：控制光从左右哪个方向打过来。默认偏左侧来光。
- `lightY` / 光照 Y：控制光源高低，影响顶部和底部的明暗。
- `lightZ` / 光照 Z：控制光源正面程度，越大越正面。
- `lightIntensity` / 光照亮度：主要亮面亮度控制。比整体曝光更稳定，也更直观。

### 云层

- `cloudOpacity` / 云层厚度：控制云层可见度。
- `cloudContrast` / 云层层次：控制云的边界和层次感。过高会更锐，过低会更雾。

### 大气层

- `atmosphereColor` / 光晕颜色：同时影响地表边缘蓝光、内外大气层和透明罩。
- `atmosphereShellStrength` / 蓝色透明罩：模拟“地球外面套一层透明蓝色罩”的感觉。
- `atmosphereShellSize` / 透明罩大小：控制透明罩距离地球边缘的大小。
- `innerAtmosphereStrength` / 内光晕强度：地球内圈边缘蓝光。
- `innerAtmosphereSize` / 内光晕大小：内光晕覆盖范围。
- `outerAtmosphereStrength` / 外光晕强度：地球外圈蓝光。
- `outerAtmosphereSize` / 外光晕大小：外光晕离地球边缘的范围。

### 暗部

- `darkStrength` / 暗面黑色遮罩：控制暗面的压黑强度。它不是环境光，而是一层黑色遮罩透明度。
- `blackRimStrength` / 黑色轮廓：控制地球边缘黑色描边。
- `backgroundHaloStrength` / 外围白光：控制围绕地球一圈的微弱背景光。
- `backgroundHaloSize` / 白光范围：控制外围白光的范围。

### 动画

- `rotationSpeed` / 旋转速度：默认 `0.000036`。如果设为 `0`，渲染器会停止动画循环，只保留静态帧。

## 质量档位

通过 URL 参数指定：

```text
?quality=low
?quality=balanced
?quality=high
```

- `low`：适合低端移动端或页面里还有很多其他动画的场景。
- `balanced`：默认展示页档位，视觉和性能比较平衡。
- `high`：默认调参页档位，适合最终质感确认。

## 常见判断

- 如果地球边缘看不完整，优先提高 `backgroundHaloStrength`，不要直接把暗面调亮。
- 如果地球发雾，优先检查 `cloudOpacity` 和 `cloudContrast`。
- 如果亮面中间有强光斑，优先降低 `lightIntensity` 或调整 `lightZ`。
- 如果白底下地球轮廓不够，优先调 `backgroundHaloStrength` 和 `blackRimStrength`。
- 如果黑底下暗面死黑，优先降低 `darkStrength`，不要加环境光。

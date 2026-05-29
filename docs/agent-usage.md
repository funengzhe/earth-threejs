# Agent 调用说明

这份说明给后续维护这个仓库的 AI Agent 或自动化脚本使用。目标是让 Agent 能清楚理解项目边界、文件职责、可修改位置和验证方式。

## 项目边界

- 这是独立开源的 Three.js 地球项目。
- README 可以说明项目起源于 bigmodel.io 页面中的地球组件，但代码和文档主体仍然要保持独立。
- 不要加入主站业务、域名页面、表单、后端服务或额外主站品牌文案。
- 不要把生成截图、临时预览图、浏览器缓存文件提交到仓库。
- 默认视觉参数以 `earth-three.js` 的 `EARTH_TUNING_PRESET` 为准。

## 文件职责

- `earth-three.js`：唯一的核心渲染模块，导出 `createHeroEarth` 和 `EARTH_TUNING_PRESET`。
- `index.html`：纯展示页面，只显示地球，不放调试控件。
- `tuning.html`：中文调参台，可以有面板、按钮和实时参数控制。
- `docs/tuning.md`：给人使用的调参说明。
- `docs/performance.md`：性能策略、档位、嵌入建议。
- `docs/agent-usage.md`：给 Agent 的调用和维护说明。
- `AGENTS.md`：仓库级 Agent 规则摘要。

## 推荐 Agent Prompt

```text
你正在维护 earth-threejs，一个独立 Three.js 地球渲染项目。
请先阅读 README.md、AGENTS.md、docs/agent-usage.md。
除非用户明确要求，否则不要改变当前 EARTH_TUNING_PRESET 的视觉方向。
如果要改视觉参数，先在 tuning.html 中验证，再同步到 earth-three.js。
如果要优化性能，优先调整 quality 档位、DPR、采样、可见性暂停，不要删除云层、暗面遮罩或 composite pass。
完成后运行 node --check earth-three.js 和 git diff --check。
```

## 调用 API

```js
import { createHeroEarth, EARTH_TUNING_PRESET } from "./earth-three.js";

const controller = await createHeroEarth({
  globe: document.querySelector("[data-earth-globe]"),
  canvas: document.querySelector("[data-earth-canvas]"),
  quality: "balanced",
  settings: {
    ...EARTH_TUNING_PRESET,
    rotationSpeed: 0.000036,
  },
});
```

可用选项：

- `globe`：外层容器元素，必须传。
- `canvas`：WebGL canvas，必须传。
- `quality`：`low`、`balanced`、`high`。
- `settings`：覆盖 `EARTH_TUNING_PRESET` 中的视觉参数。
- `reducedMotion`：为 `true` 时只渲染静态帧。
- `showStars`：是否显示星点背景。
- `initialRotationY`：初始地球旋转角度。
- `tiltX`、`tiltY`、`tiltZ`：整体地球倾斜角。
- `pixelRatioCap`：覆盖质量档位的 DPR 上限。
- `anisotropyCap`：覆盖质量档位的纹理各向异性上限。
- `samples`：覆盖质量档位的 MSAA samples。
- `pauseWhenHidden`：页面隐藏时是否暂停，默认 `true`。
- `pauseWhenOutsideViewport`：离开视口时是否暂停，默认 `true`。

Controller 方法：

- `resize()`：手动重算尺寸。
- `getTuning()`：返回当前参数快照。
- `setTuning(nextSettings)`：实时改参数。
- `setVisible(visible)`：外部主动控制是否渲染。
- `dispose()`：释放资源。

## 修改流程

1. 先运行 `git status --short --branch`，确认当前工作区。
2. 读 `earth-three.js`、`index.html`、`tuning.html` 和相关文档。
3. 做视觉修改时，优先通过 URL 参数验证，再改 `EARTH_TUNING_PRESET`。
4. 做性能修改时，优先保持视觉默认参数不变。
5. 完成后运行 `node --check earth-three.js`。
6. 再运行 `git diff --check`。
7. 如果用户要求推送，再提交并 push。

## 验证命令

```bash
node --check earth-three.js
git diff --check
```

可选浏览器验证：

```bash
python3 -m http.server 4173
```

```text
http://127.0.0.1:4173/
http://127.0.0.1:4173/tuning.html?bg=light&freeze=1
```

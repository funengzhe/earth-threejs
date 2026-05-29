# 性能文档

这个项目的性能目标是：在保留高清地球质感的前提下，让首屏加载更可控，运行时更顺滑，嵌入其他页面时不抢占过多 GPU。

## 已做优化

- `index.html` 作为纯展示页，默认 `quality=balanced`，避免一打开就使用最高 GPU 配置。
- `tuning.html` 作为调参页，默认 `quality=high`，保证调试时看到的细节足够完整。
- `createHeroEarth` 支持 `quality`、`pixelRatioCap`、`anisotropyCap`、`samples`，可以按页面环境单独控制。
- 页面隐藏时暂停动画循环。
- 地球离开视口时暂停动画循环。
- `rotationSpeed=0` 或 `reducedMotion=true` 时不持续渲染。
- 使用 `ResizeObserver` 监听容器尺寸，只在尺寸变化时更新渲染目标。
- 纹理各向异性不再无条件使用设备最大值，而是按质量档位限制。

## 质量档位

| 档位 | 桌面 DPR 上限 | 移动 DPR 上限 | 桌面分段 | 移动分段 | 桌面 MSAA | 纹理各向异性 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `low` | 1.25 | 1.10 | 72 x 48 | 48 x 32 | 0 | 4 |
| `balanced` | 1.65 | 1.25 | 96 x 64 | 56 x 40 | 2 | 8 |
| `high` | 2.00 | 1.45 | 112 x 72 | 72 x 48 | 4 | 16 |

如果要嵌入一个已有复杂首页，建议先用 `balanced`。如果页面里还有滚动联动、视频、粒子或多个 WebGL 实例，移动端建议直接用 `low`。

## 嵌入建议

```js
const controller = await createHeroEarth({
  globe,
  canvas,
  quality: window.matchMedia("(max-width: 680px)").matches ? "low" : "balanced",
  showStars: false,
});
```

如果父页面已经有自己的可见性管理，可以主动调用：

```js
controller.setVisible(false);
controller.setVisible(true);
```

组件卸载时务必释放：

```js
controller.dispose();
```

## 加载建议

- 保留 `modulepreload`，让浏览器提前准备 `earth-three.js` 和 Three.js。
- 展示页可以预加载核心贴图，调参页预加载全部贴图。
- 不建议在同一个页面重复创建多个地球实例，除非主动降低 `quality` 并确保不可见实例暂停。
- 如果未来要继续压首屏体积，可以增加一套 2K 地表贴图，用 `quality=low` 时加载低分辨率贴图。

## 运行时排查

- 如果风扇明显升高，先确认页面是否一直在动画：设置 `rotationSpeed=0` 看 GPU 是否下降。
- 如果移动端发热，先降 `quality=low`，再降低 `pixelRatioCap`。
- 如果边缘锯齿明显，优先升 `quality=balanced` 或 `samples=2`，不要直接把 DPR 拉太高。
- 如果页面切后台仍然占用资源，检查是否有外部代码不断调用 `setTuning` 或 `resize`。

## 保留质感的优化边界

这些改动通常安全：

- 降低球体分段到 `balanced`。
- 限制 DPR 到 1.25 到 1.65。
- 限制各向异性到 8。
- 页面不可见时暂停动画。

这些改动风险较高：

- 移除云层或暗面遮罩，会明显改变当前确认过的质感。
- 把暗面改成环境光照亮，会偏离“暗面黑色透明遮罩”的设计方向。
- 删除后期 composite pass，会降低清晰度和边缘质感。

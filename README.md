[README.md](https://github.com/user-attachments/files/27897973/README.md)
# Antigravity 粒子动画复刻

本项目使用 Vite + TypeScript + Canvas 2D 复刻 `lizi.mp4` 中的 Google Antigravity 首屏粒子效果。实现重点放在白底 hero 页面、彩色短线粒子、漩涡运动、鼠标扰动、点击爆发和速度方向形变。

## 目录结构

```text
question-2/
├── code/                  # 完整可运行源码
├── prompt/                # 放置与 AI 交互过程截图
├── screenshot/            # 最终效果截图
│   ├── 01-overview.png
│   └── 02-interaction.png
└── README.md
```

## 运行方式

```bash
cd code
npm install
npm run dev
```

打开 Vite 输出的本地地址，例如 `http://127.0.0.1:5173/`。

## 构建方式

```bash
cd code
npm run build
```

构建产物输出到 `code/dist/`。

## 技术方案

- DOM 层使用原生 HTML/CSS 复刻 Antigravity 首屏导航、品牌标识、两行 hero 标题和 CTA 按钮。
- Canvas 层使用固定全屏画布，`pointer-events: none`，通过 `window` 事件读取鼠标坐标，确保按钮仍可点击。
- 粒子数量按视口面积自适应，约 800 到 1200 个；1920x1080 下约 887 个。
- 运动模型使用帧率解耦的欧拉积分，包含切向漩涡力、径向恢复力、全场鼠标跟随、局部鼠标排斥、湍流噪声和边界阻尼。
- 粒子颜色按相对中心角度映射 Google 风格色板，并随速度做轻微亮度调整。
- 粒子绘制为圆角短线，方向始终沿速度方向；高速时拉长变细，并带极轻微光晕。
- 点击页面会在点击点生成 20 个径向爆发粒子，鼠标移动会同时扰动中心粒子和外圈边缘粒子。

## 调试

在 URL 追加 `?debug` 可显示 FPS 和粒子数量。

用于截图复现的调试参数：

```text
?debug&pointer=940,520
?debug&pointer=940,520&burst=940,520
```

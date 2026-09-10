# 清单生成器（Qingdan Generator）

一款纯前端的移动端清单生成 PWA：出行、搬家、养猫、生活类清单一键生成，支持三段式清单行交互（完成 / 内容 / 「不需要」独立操作区）。

## 特性

- **纯前端 + 本地存储**：全部运行在浏览器，数据保存在本机 `localStorage`，**无任何后端、数据库或登录系统**。
- **可分享、可独立**：部署为公开站点后，任何人凭链接即可直接打开使用，**无需登录 GitHub**；不同用户 / 设备的数据各自独立，互不覆盖。
- **iPhone 友好**：适配竖屏、安全区（刘海 / 灵动岛 / Home Indicator）；可「添加到主屏幕」当作独立 App 使用。
- **隐私安全**：代码完全公开，但**个人数据只存在你自己的浏览器里**，绝不会写入代码或公开页面。

## 目录结构

```
清单生成器/
├── index.html            # 本地开发入口（加载下方源码，供浏览器直接打开调试）
├── app.js / data.js / screens.js / styles.css   # 源码
├── build.mjs             # 将源码内联为单文件 PWA（输出 清单生成器.html）
├── e2e.mjs               # jsdom 回归测试（115 断言）
├── browser_test.mjs      # Playwright 真 iPhone 交互测试（31 断言）
└── docs/                 # GitHub Pages 部署目录（单文件 PWA + 图标 + manifest）
    ├── index.html        # 已构建的可部署单文件应用
    ├── manifest.json
    ├── apple-touch-icon.png
    ├── icon-192.png
    └── icon-512.png
```

## 本地调试 / 重新构建

```bash
node build.mjs            # 重内联生成 清单生成器.html（单文件）
node e2e.mjs             # jsdom 回归（需 node_modules 软链接）
node browser_test.mjs    # Playwright 真机回归（需 Chromium）
```

## 部署（GitHub Pages）

本仓库通过 **GitHub Pages** 发布，`Source` 设置为 `main` 分支的 `/docs` 文件夹。
推送代码即自动更新同一地址，无需更换链接。

## 添加到 iPhone 主屏幕

用 Safari 打开 Pages 地址 → 分享 →「添加到主屏幕」→ 命名「清单生成器」→ 添加。
启动后以独立窗口运行，体验与原生 App 一致；数据保存在该浏览器本地。

## 隐私说明

本应用不收集任何个人信息。所有清单数据均存储在使用者本地浏览器，
换设备 / 换浏览器不会同步，也不会被其他用户看到。

# 宇宙人歌词填字

台湾乐团「宇宙人」的粉丝向歌词填字游戏（H5，非商业）。

## 技术栈

Vite + Vue 3 + TypeScript + Pinia。`src/core/` 为纯 TS、无框架依赖的游戏逻辑层，为将来迁移微信小程序做复用准备。

## 开发

```bash
npm install
npm run dev        # 本地开发
npm run build      # 类型检查 + 打包到 dist/
npm run preview    # 预览打包产物
npm run test       # 运行 core 单元测试（Vitest）
```

## 文档

- `docs/PRD.md` — 产品需求
- `docs/puzzle-generation.md` — 填字谜题生成算法与关卡数据 schema

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并发布到 GitHub Pages。

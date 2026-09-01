import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// 相对 base：GitHub Pages 项目站点在 /<repo>/ 子路径下也能正确加载资源，
// 且本项目为单页面、无前端路由，相对路径无副作用。
// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [vue()],
})

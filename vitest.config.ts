import { defineConfig } from 'vitest/config'

// core/ 为纯 TS、无框架依赖，测试运行在 node 环境即可。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
})

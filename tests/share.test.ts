import { describe, expect, it } from 'vitest'
import { buildShareText } from '../src/config/share'

describe('buildShareText', () => {
  it('替换 time / title / url', () => {
    expect(
      buildShareText({
        time: '03:42',
        title: '一万小时',
        url: 'https://wennie006.github.io/cosmos_crossing/',
      }),
    ).toBe(
      '我用 03:42 完成了宇宙人《一万小时》的歌词填字，你也来试试：https://wennie006.github.io/cosmos_crossing/',
    )
  })
})

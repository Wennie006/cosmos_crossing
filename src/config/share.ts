// 分享文案模板。MVP 仅「复制文案 + 链接」，分享卡片延后到微信小程序阶段。

export const SHARE_TEXT_TEMPLATE =
  '我用 {time} 完成了宇宙人《{title}》的歌词填字，你也来试试：{url}'

export function buildShareText(opts: {
  time: string
  title: string
  url: string
}): string {
  return SHARE_TEXT_TEMPLATE.replace('{time}', opts.time)
    .replace('{title}', opts.title)
    .replace('{url}', opts.url)
}

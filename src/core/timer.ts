// 正计时。纯 TS。规则见 docs/PRD.md §4.6：首次操作启动，切后台不暂停，完成时停。

export interface TimerState {
  /** 计时起点（epoch ms）；null 表示尚未启动。 */
  startEpoch: number | null
  /** 完成时刻（epoch ms）；null 表示尚在计时。 */
  finishEpoch: number | null
}

export function createTimer(): TimerState {
  return { startEpoch: null, finishEpoch: null }
}

/** 首次启动（已启动或已完成则忽略）。 */
export function startTimer(t: TimerState, now: number): void {
  if (t.startEpoch == null && t.finishEpoch == null) t.startEpoch = now
}

/** 停表（未启动或已停则忽略）。 */
export function finishTimer(t: TimerState, now: number): void {
  if (t.startEpoch != null && t.finishEpoch == null) t.finishEpoch = now
}

/** 已用时（ms）。未启动为 0；计时中为 now − start；已完成为 finish − start。 */
export function elapsedMs(t: TimerState, now: number): number {
  if (t.startEpoch == null) return 0
  const end = t.finishEpoch ?? now
  return Math.max(0, end - t.startEpoch)
}

export function isRunning(t: TimerState): boolean {
  return t.startEpoch != null && t.finishEpoch == null
}

/** 格式化为 mm:ss，超过 1 小时为 h:mm:ss。 */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const s = total % 60
  const m = Math.floor(total / 60) % 60
  const h = Math.floor(total / 3600)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

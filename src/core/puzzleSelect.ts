// 「再来一局」的谜题选择逻辑。纯 TS，无框架依赖。
// 规则见 docs/puzzle-generation.md §11。对 id 类型不作假设（当前为 number）。

/** 返回 [0, n) 的整数。默认用 Math.random；测试时可注入。 */
export type RandomInt = (n: number) => number

const defaultRandomInt: RandomInt = (n) => Math.floor(Math.random() * n)

/** 从谜题库中均匀随机选一个 puzzleId（首次进入）。 */
export function pickInitialPuzzleId<T>(
  ids: readonly T[],
  randomInt: RandomInt = defaultRandomInt,
): T {
  if (ids.length === 0) throw new Error('谜题库为空')
  return ids[randomInt(ids.length)]
}

/**
 * 「再来一局」：从 puzzleId 不等于 currentId 的谜题中均匀随机选一个。
 * 若候选为空（库中仅一个谜题），返回 currentId。
 */
export function pickNextPuzzleId<T>(
  ids: readonly T[],
  currentId: T,
  randomInt: RandomInt = defaultRandomInt,
): T {
  if (ids.length === 0) throw new Error('谜题库为空')
  const candidates = ids.filter((id) => id !== currentId)
  if (candidates.length === 0) return currentId
  return candidates[randomInt(candidates.length)]
}

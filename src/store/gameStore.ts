import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import * as engine from '../core/gameEngine'
import type { GameState } from '../core/gameEngine'
import {
  getDerivedPuzzle,
  pickInitialPuzzle,
  puzzleIds,
} from '../core/puzzleLibrary'
import { loadProgress, saveProgress } from '../core/progress'
import { createTimer, finishTimer, startTimer } from '../core/timer'
import type { TimerState } from '../core/timer'
import { generateTray } from '../core/trayGenerator'
import type { Cell } from '../core/types'

export const useGameStore = defineStore('game', () => {
  const currentPuzzleId = ref<number>(puzzleIds[0])
  const derived = computed(() => getDerivedPuzzle(currentPuzzleId.value))

  const state = reactive<GameState>(engine.createGameState([]))
  const timer = reactive<TimerState>(createTimer())
  const hintCount = ref(0)

  function freshState(): void {
    Object.assign(state, engine.createGameState(generateTray(derived.value)))
    Object.assign(timer, createTimer())
    hintCount.value = 0
  }

  // 初始化：优先恢复 sessionStorage 进度（同一 puzzleId 才恢复）；
  // 否则按 docs/puzzle-generation.md §11 均匀随机选一关（首次进入）。
  const saved = loadProgress()
  if (saved && puzzleIds.includes(saved.puzzleId)) {
    currentPuzzleId.value = saved.puzzleId
    Object.assign(
      state,
      engine.createGameState(generateTray(derived.value)),
      saved.gameState,
    )
    Object.assign(timer, createTimer(), saved.timer)
    hintCount.value = saved.hintCount ?? 0
  } else {
    currentPuzzleId.value = pickInitialPuzzle()
    freshState()
    persist()
  }

  function persist(): void {
    saveProgress({
      puzzleId: currentPuzzleId.value,
      gameState: JSON.parse(JSON.stringify(state)) as GameState,
      timer: { ...timer },
      hintCount: hintCount.value,
    })
  }

  function ensureStarted(): void {
    startTimer(timer, Date.now())
  }

  function checkComplete(): void {
    if (engine.isSolved(state, derived.value)) finishTimer(timer, Date.now())
  }

  /** 加载指定谜题并重置状态（进度记录同步替换为新关卡的空记录）。 */
  function loadPuzzle(id: number): void {
    currentPuzzleId.value = id
    freshState()
    persist()
  }

  // 完成即终点：完成后网格与字盘不再响应（完成弹窗在步骤 6）。
  const isComplete = computed(() => timer.finishEpoch != null)

  // ---- 操作 ----
  function selectCell(cell: Cell): void {
    if (isComplete.value) return
    ensureStarted()
    engine.selectCell(state, derived.value, cell)
    persist()
  }
  function placeTile(tileId: string): void {
    if (isComplete.value) return
    ensureStarted()
    engine.placeTile(state, derived.value, tileId)
    checkComplete()
    persist()
  }
  function clearSelected(): void {
    if (isComplete.value) return
    engine.clearSelected(state, derived.value)
    persist()
  }
  /** 提示：次数不限、不扣分、不影响计时——是一次普通操作。 */
  function hint(): void {
    if (isComplete.value) return
    ensureStarted()
    const applied = engine.useHint(state, derived.value)
    if (applied) hintCount.value++
    checkComplete()
    persist()
  }

  // ---- 只读派生 ----
  const availableTiles = computed(() => engine.availableTiles(state))
  const currentEntry = computed(() =>
    engine.currentEntry(state, derived.value),
  )
  const currentEntryKeys = computed(
    () => new Set(engine.currentEntryKeys(state, derived.value)),
  )

  return {
    currentPuzzleId,
    derived,
    state,
    timer,
    hintCount,
    availableTiles,
    currentEntry,
    currentEntryKeys,
    isComplete,
    loadPuzzle,
    selectCell,
    placeTile,
    clearSelected,
    hint,
  }
})

import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import * as engine from '../core/gameEngine'
import type { GameState } from '../core/gameEngine'
import { getDerivedPuzzle, puzzleIds } from '../core/puzzleLibrary'
import { generateTray } from '../core/trayGenerator'
import type { Cell } from '../core/types'

export const useGameStore = defineStore('game', () => {
  const currentPuzzleId = ref<string>(puzzleIds[0])
  const derived = computed(() => getDerivedPuzzle(currentPuzzleId.value))

  const state = reactive<GameState>(
    engine.createGameState(generateTray(derived.value)),
  )

  function resetForCurrentPuzzle(): void {
    Object.assign(state, engine.createGameState(generateTray(derived.value)))
  }

  /** 加载指定谜题并重置游戏状态。 */
  function loadPuzzle(id: string): void {
    currentPuzzleId.value = id
    resetForCurrentPuzzle()
  }

  // ---- 只读派生 ----
  const availableTiles = computed(() => engine.availableTiles(state))
  const currentEntry = computed(() =>
    engine.currentEntry(state, derived.value),
  )
  const currentEntryKeys = computed(
    () => new Set(engine.currentEntryKeys(state, derived.value)),
  )
  const isSolved = computed(() => engine.isSolved(state, derived.value))

  // ---- 操作 ----
  function selectCell(cell: Cell): void {
    engine.selectCell(state, derived.value, cell)
  }
  function placeTile(tileId: string): void {
    engine.placeTile(state, derived.value, tileId)
  }
  function clearSelected(): void {
    engine.clearSelected(state, derived.value)
  }

  return {
    currentPuzzleId,
    derived,
    state,
    availableTiles,
    currentEntry,
    currentEntryKeys,
    isSolved,
    loadPuzzle,
    resetForCurrentPuzzle,
    selectCell,
    placeTile,
    clearSelected,
  }
})

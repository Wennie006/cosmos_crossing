import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearProgress,
  loadProgress,
  saveProgress,
} from '../src/core/progress'
import type { ProgressRecord } from '../src/core/progress'

class FakeStorage implements Storage {
  private map = new Map<string, string>()
  get length(): number {
    return this.map.size
  }
  clear(): void {
    this.map.clear()
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
}

const sample: ProgressRecord = {
  puzzleId: 1,
  gameState: {
    tray: [{ id: 't0-让', char: '让' }],
    fills: { '4,0': '让' },
    cellTile: { '4,0': 't0-让' },
    selectedKey: '4,2',
    direction: 'horizontal',
  },
  timer: { startEpoch: 1000, finishEpoch: null },
  hintCount: 1,
}

beforeEach(() => {
  ;(globalThis as { sessionStorage?: Storage }).sessionStorage = new FakeStorage()
})
afterEach(() => {
  delete (globalThis as { sessionStorage?: Storage }).sessionStorage
})

describe('progress', () => {
  it('save / load 往返一致', () => {
    saveProgress(sample)
    expect(loadProgress()).toEqual(sample)
  })

  it('无记录时返回 null', () => {
    expect(loadProgress()).toBeNull()
  })

  it('clear 后返回 null', () => {
    saveProgress(sample)
    clearProgress()
    expect(loadProgress()).toBeNull()
  })

  it('损坏的 JSON 返回 null 而不抛', () => {
    globalThis.sessionStorage.setItem('cosmos:progress', '{不是json')
    expect(loadProgress()).toBeNull()
  })

  it('缺少必要字段返回 null', () => {
    globalThis.sessionStorage.setItem('cosmos:progress', JSON.stringify({ foo: 1 }))
    expect(loadProgress()).toBeNull()
  })

  it('sessionStorage 不可用时静默降级', () => {
    delete (globalThis as { sessionStorage?: Storage }).sessionStorage
    expect(() => saveProgress(sample)).not.toThrow()
    expect(loadProgress()).toBeNull()
  })
})

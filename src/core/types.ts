// 谜题数据模型的类型定义。纯 TS，无框架依赖。
// 字段语义见 docs/puzzle-generation.md §0.1、§10。

export type Direction = 'horizontal' | 'vertical'

export interface Cell {
  row: number
  col: number
}

/** 关卡源里一条词条的原始描述。 */
export interface EntrySpec {
  /** 谜题内的局部标识，如 "A1" / "V1"，无需跨谜题唯一。 */
  id: string
  /** 完整歌词行（歌词文件中的一整行，不截取、不拼接）。 */
  text: string
  direction: Direction
  /** 起点（词条第一个字符）所在格，0 基。 */
  row: number
  col: number
}

export interface SongMeta {
  title: string
  artist: string
  /**
   * 15 秒片段（MP3 音频）的相对路径。省略时默认 `assets/clips/{puzzleId}.mp3`，
   * 即片段文件名 = puzzleId。见 clipSrcOf()。
   */
  clipSrc?: string
  /** 片段时长（秒）。省略时按 15 处理。 */
  clipDuration?: number
}

/** 一个谜题的完整定义（puzzle JSON 的结构）。 */
export interface PuzzleSpec {
  /**
   * 全局唯一的整数编号，由歌词知识库分配（每首歌前面标的序号）。
   * 决定加载顺序、片段文件名（{puzzleId}.mp3）、以及「再来一局」的选择。
   */
  puzzleId: number
  song: SongMeta
  grid: { rows: number; cols: number }
  /** entries[0] 约定为第一条词条（direction 必为 horizontal）。 */
  entries: EntrySpec[]
  /** 提示字（预填格）坐标。每条词条落在其上的提示字数量应为 1–2。 */
  prefilled: Cell[]
  /** 干扰字符来源。运行时字盘从中取干扰字。 */
  distractorPool?: string[]
  /** 完成弹窗文案。 */
  successText?: string
  layoutSeed?: number
  traySeed?: number
}

// ---- 派生模型（由 PuzzleSpec 计算得出，见 puzzleModel.ts）----

export interface DerivedCell {
  row: number
  col: number
  /** 该格答案字符。 */
  char: string
  /** 覆盖该格的词条 id（长度 1 或 2）。 */
  entryIds: string[]
  /** 是否为交叉格（被两条词条共享）。 */
  isIntersection: boolean
  /** 是否为提示字（预填）。 */
  isPrefilled: boolean
}

export interface DerivedEntry extends EntrySpec {
  /** 按方向排序的占用格。 */
  cells: Cell[]
  /** text 的字符数组，与 cells 一一对应。 */
  chars: string[]
  /** 该词条上的交叉格。 */
  intersectionCells: Cell[]
  /** 该词条上的提示字格。 */
  givenCells: Cell[]
  /** 该词条上的待填格（非提示字）。 */
  blankCells: Cell[]
}

export interface DerivedPuzzle {
  spec: PuzzleSpec
  /** key 为 `${row},${col}`。 */
  cells: Map<string, DerivedCell>
  cellList: DerivedCell[]
  entries: DerivedEntry[]
  /** 所有交叉格。 */
  intersections: Cell[]
  /** 所有待填格（非提示字的词条格）。 */
  blankCells: Cell[]
}

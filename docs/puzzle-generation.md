# 填字谜题生成算法设计

- 版本：v0.2（MVP）
- 日期：2026-09-01
- 关联：`docs/PRD.md`
- 状态：待确认

本版相对 v0.1 的变更：移除全部比喻性命名（改用规范术语）；`id` 字段更名为 `puzzleId` 并要求全局唯一；新增「再来一局」的谜题选择逻辑；补入三关示例数据。

---

## 0. 术语与结构约束

### 0.1 术语

| 术语 | 定义 |
|---|---|
| 网格 | `rows` 行 × `cols` 列的二维格阵。格坐标 `(r, c)`，`r`、`c` 均从 0 起。 |
| 词条 entry | 四元组 `(text, direction, row, col)`。`direction ∈ {horizontal, vertical}`。长度 `L = text.length`。horizontal 词条占用 `(row, col) … (row, col+L-1)`；vertical 词条占用 `(row, col) … (row+L-1, col)`。 |
| 第一条词条 | 最先放置的词条，`direction = horizontal`。约定为 `entries[0]`。 |
| 附加横向词条 | `direction = horizontal` 且不与第一条词条交叉、而是与某一条 vertical 词条交叉的词条。每个谜题至多一条。 |
| 交叉 intersection | 两条方向不同的词条恰好共享一个格。 |
| 交叉格 | 交叉所在的那个格。 |
| 一致性约束 | 任一被两条词条共享的格，两条词条在该格的字符必须相等。 |
| 冲突 conflict | 违反一致性约束，或两条同方向词条部分重叠。 |
| 平行相邻 | 某个非交叉格，其行方向或列方向上相距 1 的相邻格已被另一词条占用。 |
| 提示字 / 预填格 | 谜题初始即给出字符、不可编辑的格。 |
| 候选字符集合（字盘） | 页面下方供玩家选取填入的字符多重集。 |
| 干扰字符 | 字盘中不属于任何词条答案的字符。 |
| 锚点字符 | 在候选词条集合中「含该字符的词条数」较高的字符；仅用于评分时优先选择交叉点，非硬约束。 |
| 包围盒 | 覆盖全部已放置词条占用格的最小矩形。 |

### 0.2 结构约束（MVP）

1. 恰有一条 horizontal 词条（即第一条词条）与所有 vertical 词条交叉。
2. vertical 词条之间互不交叉。
3. 至多一条附加横向词条，与某一条 vertical 词条交叉。
4. 交叉关系构成的图，从第一条词条出发的最长路径长度 ≤ 2（第一条词条 → vertical 词条 → 附加横向词条）。
5. 网格 `rows ≤ maxRows`、`cols ≤ maxCols`（默认 11 × 11）。
6. 每条词条必须是歌词文件中的完整一行（按文件换行切分），不截取、不拼接。
7. 允许平行相邻，但在评分中扣分。

密集交叉网格、多首歌合并出题、全自动生成、解的唯一性求解，均为后续版本，不在本文范围。

---

## 1. 数据流

```
歌词文件（每行一句）
  │  ① 预处理与选词条（可由关卡源的 curatedLines 直接指定）
  ▼  candidateEntries[]
  │  ② 字符频率统计 → anchorChars[]
  ▼
  │  ③ 布局阶段（选第一条词条 → 迭代放置 → 裁剪与归一化）
  ▼  entries[]
  │  ④ 推导交叉格；选提示字
  ▼
  │  ⑤ 生成候选字符集合（正确字符多重集 + 干扰字符，按 traySeed 确定性打乱）
  ▼
  │  ⑥ 校验（一致性 / 冲突 / 连通性 / 尺寸）+ 输出文本预览
  ▼  puzzle JSON（含 puzzleId）
```

---

## 2. 输入：关卡源对象

```jsonc
{
  "puzzleId": "yiwanxiaoshi",          // 全局唯一，稳定，kebab-case
  "song": {
    "title": "一万小时",
    "artist": "宇宙人",
    "clipSrc": "assets/clips/yiwanxiaoshi.mp4",
    "clipDuration": 15
  },
  "rawLyrics": "需要多久的时间\n平地才能搭起一座山\n…",   // 与 curatedLines 二选一
  "curatedLines": ["让我完成有你的世界", "我要变成你的树", "…"], // 与 rawLyrics 二选一，优先
  "anchorChars": ["我", "你"],          // 可选，人工指定锚点字符
  "distractorPool": ["山", "海"],        // 可选，干扰字符不足时补充
  "successText": "…",                   // 可选，完成弹窗文案
  "layoutSeed": 1,                      // 布局阶段的伪随机种子
  "traySeed": 1                         // 字盘打乱的伪随机种子，独立于 layoutSeed
}
```

歌词文件按行切分后碎句多（副歌整段重复、单句被换行拆开），MVP 优先用 `curatedLines` 提供已筛选的完整行；`rawLyrics` 走第 3 节的自动预处理，仅用于生成初稿。

---

## 3. ① 预处理与选词条

对 `rawLyrics`：

| 步骤 | 规则 | 参数 |
|---|---|---|
| 归一化 | 去除标点、空白字符，仅保留 CJK 字符；保持行切分 | — |
| 精确去重 | 内容完全相同的行只保留首次出现 | `dedupExact = true` |
| 长度过滤 | 保留长度在 `[minLineLen, maxLineLen]` 内的行 | `minLineLen = 3`，`maxLineLen = 8` |
| 排序 | 按「含锚点字符数」降序，其次按「与 `idealLen` 的差」升序 | `idealLen = 6` |

近似重复（同一句在歌里多次出现的变体）不自动合并，由 `curatedLines` 处理。
产物为 `candidateEntries[]`（一组完整歌词行）。

**断行校验**：词条取自歌词源的换行，其准确性依赖歌词源本身断得对。若歌词源把一个
语义单元断错（例如把行尾的字断到下一行行首），据此选出的词条会读起来不完整或错位，
且不是渲染 bug——需回头核对、更正歌词源，而不是在生成器里"修补"。

---

## 4. ② 字符频率与锚点字符

- `docFreq(ch)` = `candidateEntries[]` 中包含字符 `ch` 的词条数。
- 若关卡源提供 `anchorChars`，直接采用。
- 否则取 `docFreq ≥ anchorMinDocFreq` 的字符，按 `docFreq` 降序，取前 `anchorTopK` 个。
- 锚点字符只影响第 5 节的评分，不构成硬约束。

参数：`anchorMinDocFreq = 2`，`anchorTopK = 4`。

---

## 5. ③ 布局阶段

### 5.1 输入

`candidateEntries[]`；`targetEntries`；`maxRows`、`maxCols`；评分权重；`layoutSeed`。

### 5.2 数据结构

- 已放置词条集合 `placed[]`，每项为 `(text, direction, row, col)`。
- 占用表 `occupied`：把已占用格 `(r, c)` 映射到 `{ char, entryIndices[] }`。

### 5.3 选第一条词条

对每条候选词条按下式打分，取最高者，`direction = horizontal`，放在网格中部；加入 `placed`，更新 `occupied`。

```
firstEntryScore(E) =
    2 × （E 含有的不同锚点字符数）
  + 1 × （E 中「也出现在其它候选词条里」的字符，其下标的标准差）
  − 1 × max(0, E.length − maxCols + 2)
```

### 5.4 迭代放置

当「`placed.length < targetEntries`」且「存在可行放置」时，重复：

1. **枚举候选放置**：对每条未放置词条 `W`、`W` 的每个字符下标 `p`、每个满足 `occupied[(r, c)].char === W[p]` 的已占用格 `(r, c)`：
   - 令 `d` = 与占用 `(r, c)` 的词条相垂直的方向。
   - 构造放置：`W` 沿 `d` 排布，使 `W[p]` 落在 `(r, c)`。
2. **过滤**：删除违反任一硬约束（5.5）的放置。
3. **打分**：对每个剩余放置按 5.6 计算分值。
4. **执行**：选分值最高者写入 `placed` 与 `occupied`；分值并列时，按 `layoutSeed` 派生的固定伪随机序选取。

终止条件：`placed.length === targetEntries`，或第 1 步得到空集合。

### 5.5 硬约束（放置被过滤的条件，任一成立即过滤）

1. 放置的某个格与 `occupied` 中已有格重叠，且字符不相等。
2. 放置与某条同方向词条部分重叠。
3. 放置的交叉数为 0（第一条词条、附加横向词条除外）。
4. 放置的某个交叉格已同时属于一条 horizontal 和一条 vertical 词条。
5. 放置对单条已放置词条的交叉次数 > `maxCrossingsPerEntry`。
6. 该放置为 horizontal 且不与第一条词条交叉，而当前已存在一条附加横向词条（附加横向词条上限为 1）。

参数：`maxCrossingsPerEntry = 3`；第一条词条的被交叉次数上限单独设为 `maxCrossingsFirstEntry = 6`。

### 5.6 放置评分函数（分值越高越优先）

```
placeScore =
    W_cross    × 交叉数
  + W_anchor   × 落在锚点字符上的交叉数
  − W_parallel × 平行相邻的格数
  − W_flush    × （放置的首格之前一格、或末格之后一格已被占用）的次数
  − W_bbox     × 包围盒面积的增量
  − W_center   × 放置几何中心到网格中心的距离
  − W_len      × max(0, W.length − idealLen)
```

默认权重：`W_cross = 10`，`W_anchor = 4`，`W_parallel = 3`，`W_flush = 2`，`W_bbox = 1.0`，`W_center = 0.3`，`W_len = 0.5`。

### 5.7 裁剪与归一化

1. 若 `placed` 的包围盒超过 `maxRows × maxCols`：反复删除词条，每次删除「删除后包围盒面积缩小最多，且其 `placeScore` 最低」的词条，直到不超限。若删至 `placed.length < minEntries` 仍超限，则用次优的第一条词条重跑；再失败则报错，要求调整 `curatedLines`。
2. 平移所有词条坐标，使包围盒左上角为 `(0, 0)`。
3. `grid.rows` = 包围盒高，`grid.cols` = 包围盒宽。

参数：`targetEntries = 6`，`minEntries = 4`，`maxRows = 11`，`maxCols = 11`。

---

## 6. ④ 交叉格与提示字

### 6.1 交叉格（构建期推导，不写入 JSON）

`intersections = { (r, c) : occupied[(r, c)].entryIndices.length === 2 }`。校验每个交叉格上两条词条的字符相等（一致性约束）。

### 6.2 非提示的待填格

`entryCells`（所有词条占用格）中，既非交叉格被选为提示、也非其它提示格的格。每个这样的格向字盘贡献一枚其答案字符。相邻关系由 5.5、5.6 控制。

### 6.3 提示字选择

每条词条的提示字数量固定为 `givensPerEntry`（默认 2，下限 1）。一个交叉格若被设为提示字，则同时计入其所属的两条词条。

```
对每条词条 E：
  gCount(E) = E 上已被设为提示字的格数
按下述顺序为词条补足提示字，直到每条词条的 gCount 都等于 givensPerEntry：
  1) 优先把交叉格设为提示字：遍历尚未满额的词条，取其交叉格中
     使「本次操作后仍未满额的词条数」减少最多的一个设为提示字。
  2) 若某词条仅靠交叉格无法补足，则在其非交叉格中选 docFreq 最低者设为提示字；
     并列时选离已有提示字曼哈顿距离最大者。
  3) 任一词条的 gCount 不得超过 givensPerEntry。
prefilled = 所有被设为提示字的格坐标集合（写入 JSON，作者可手工调整）
```

---

## 7. ⑤ 候选字符集合（字盘）

```
blankCells   = entryCells − prefilled
trayCorrect  = [ 每个 blankCell 的答案字符 ]           // 多重集，重复字符按次数计入
nDistractors = ceil(distractorRatio × trayCorrect.length)
distractors  = 从（本首歌词出现过但不在任何答案中的字符）∪ distractorPool 中取 nDistractors 个
tray         = seededShuffle(trayCorrect ∪ distractors, traySeed)
```

- 字盘在运行时由 puzzle JSON + `traySeed` 确定性重建，不写入 JSON。
- 参数：`distractorRatio = 0.30`。

---

## 8. ⑥ 校验与文本预览

### 8.1 硬校验（`scripts/validate-puzzles.ts`）

- 每条词条完全落在 `grid` 内；`text.length` 等于其占用格数。
- 每个交叉格满足一致性约束。
- 连通性：所有词条经交叉关系与第一条词条连通。
- `grid.rows ≤ maxRows` 且 `grid.cols ≤ maxCols`。
- 每条词条的 `prefilled` 格数在 `[1, givensPerEntry]` 内。
- 干扰字符来源足够；`tray.length === blankCells.length + nDistractors`。
- `puzzleId` 在谜题库内唯一。

### 8.2 文本预览

输出网格：提示字显示字符，其它待填格显示 `＿`，非词条格显示 `·`。并逐条列出每条词条的：完整歌词、方向、起点、提示字及其位置。供人工判断「提示字是否足以让人认出该句」。

### 8.3 不做的校验

- 不做解的唯一性求解。在无逐句线索时，玩家依据对歌词的记忆求解，可解性由作者依据 8.2 的预览判断。

---

## 9. 参数表

| 参数 | 默认值 | 作用 |
|---|---|---|
| `minLineLen` / `maxLineLen` | 3 / 8 | 选词条的长度范围 |
| `idealLen` | 6 | 评分偏好长度 |
| `targetEntries` / `minEntries` | 6 / 4 | 目标词条数 / 下限 |
| `maxRows` / `maxCols` | 11 / 11 | 网格尺寸上限 |
| `anchorMinDocFreq` / `anchorTopK` | 2 / 4 | 锚点字符选取 |
| `maxCrossingsPerEntry` | 3 | 单条词条被交叉次数上限 |
| `maxCrossingsFirstEntry` | 6 | 第一条词条被交叉次数上限 |
| `givensPerEntry` | 2（下限 1） | 每条词条的提示字数量 |
| `distractorRatio` | 0.30 | 干扰字符比例 |
| `W_cross` … `W_len` | 见 5.6 | 放置评分权重 |
| `layoutSeed` / `traySeed` | 整数 | 布局 / 字盘的伪随机种子 |

---

## 10. 输出：puzzle JSON

```jsonc
{
  "puzzleId": "yiwanxiaoshi",
  "song": {
    "title": "一万小时",
    "artist": "宇宙人",
    "clipSrc": "assets/clips/yiwanxiaoshi.mp4",
    "clipDuration": 15
  },
  "grid": { "rows": 11, "cols": 9 },
  "entries": [
    { "id": "A1", "text": "让我完成有你的世界", "direction": "horizontal", "row": 4, "col": 0 },
    { "id": "V1", "text": "我要变成你的树",     "direction": "vertical",   "row": 4, "col": 1 },
    { "id": "V2", "text": "变成了终点",         "direction": "vertical",   "row": 3, "col": 3 },
    { "id": "V3", "text": "没有你的世界",       "direction": "vertical",   "row": 2, "col": 5 },
    { "id": "V4", "text": "需要多久的时间",     "direction": "vertical",   "row": 0, "col": 6 }
  ],
  "prefilled": [
    { "row": 4, "col": 1 }, { "row": 4, "col": 6 },
    { "row": 10, "col": 1 }, { "row": 3, "col": 6 },
    { "row": 3, "col": 3 }, { "row": 6, "col": 3 },
    { "row": 2, "col": 5 }, { "row": 7, "col": 5 }
  ],
  "distractorPool": ["山", "海", "沙", "浪", "暖", "河", "草"],
  "successText": "（待提供）",
  "layoutSeed": 1,
  "traySeed": 1
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| `puzzleId` | 全局唯一、稳定的字符串标识。谜题库内不得重复。用于「再来一局」的选择与 `sessionStorage` 进度键。 |
| `entries[].id` | 谜题内的局部标识（如 `A1`、`V1`），仅用于渲染与调试，不要求跨谜题唯一。 |
| `entries` | 唯一权威来源。交叉格、答案、字盘均由它推导。`entries[0]` 为第一条词条。 |
| `prefilled` | 提示字格坐标。由第 6.3 节产出，作者可手工调整后重跑校验。 |
| `grid` | 由布局阶段的包围盒得出。 |
| `successText` / `distractorPool` / `layoutSeed` / `traySeed` | 见第 2 节、第 5 节、第 7 节。 |

---

## 11. 「再来一局」的谜题选择逻辑

- **谜题库** = `src/puzzles/` 下所有 puzzle JSON 的集合，每个有唯一 `puzzleId`。
- **首次进入**：从谜题库中按均匀分布随机选一个 `puzzleId` 加载。
- **点击「再来一局」**：设当前谜题为 `currentId`。
  1. `candidates = 谜题库中 puzzleId !== currentId 的全部谜题`。
  2. 若 `candidates` 非空，从中按均匀分布随机选一个加载。
  3. 若 `candidates` 为空（谜题库只有一个谜题），重新加载 `currentId`。
- **随机源**：`Math.random()`，不要求可复现。
- **加载新谜题时重置**：网格填写状态清空；计时器 `startEpoch` 清空并置为未启动；`hintCount` 归零；`sessionStorage` 中以 `puzzleId` 为键的进度记录替换为新谜题的空记录。
- **进度记录键**：`sessionStorage` 中进度按 `puzzleId` 存储，刷新页面时据此恢复对应谜题。

---

## 12. 三关示例

三关均使用歌词文件中的完整行，满足第 0.2 节的结构约束。坐标为归一化后的最终值。

### 12.1 `puzzleId: "yiwanxiaoshi"` —《一万小时》

网格 11 行 × 9 列。5 条词条，4 个交叉。

| id | text | direction | (row, col) | 交叉格 |
|---|---|---|---|---|
| A1 | 让我完成有你的世界 | horizontal | (4, 0) | (4,1)、(4,3)、(4,5)、(4,6) |
| V1 | 我要变成你的树 | vertical | (4, 1) | (4,1) 与 A1 的「我」 |
| V2 | 变成了终点 | vertical | (3, 3) | (4,3) 与 A1 的「成」 |
| V3 | 没有你的世界 | vertical | (2, 5) | (4,5) 与 A1 的「你」 |
| V4 | 需要多久的时间 | vertical | (0, 6) | (4,6) 与 A1 的「的」 |

提示字：(4,1)我、(4,6)的、(10,1)树、(3,6)久、(3,3)变、(6,3)终、(2,5)没、(7,5)界。
平行相邻：V3(col5) 与 V4(col6) 在第 2–6 行相邻。

```
      c0 c1 c2 c3 c4 c5 c6 c7 c8
 r0   ·  ·  ·  ·  ·  ·  ＿ ·  ·
 r1   ·  ·  ·  ·  ·  ·  ＿ ·  ·
 r2   ·  ·  ·  ·  ·  没 ＿ ·  ·
 r3   ·  ·  ·  变 ·  ＿ 久 ·  ·
 r4   ＿ 我 ＿ ＿ ＿ ＿ 的 ＿ ＿
 r5   ·  ＿ ·  ＿ ·  ＿ ＿ ·  ·
 r6   ·  ＿ ·  终 ·  ＿ ＿ ·  ·
 r7   ·  ＿ ·  ＿ ·  界 ·  ·  ·
 r8   ·  ＿ ·  ·  ·  ·  ·  ·  ·
 r9   ·  ＿ ·  ·  ·  ·  ·  ·  ·
 r10  ·  树 ·  ·  ·  ·  ·  ·  ·
```

### 12.2 `puzzleId: "ruguo-women-hai-zai-yiqi"` —《如果我们还在一起》

> v2（2026-09-01 修订）：歌词知识库更正了断行（原断行把「知道你也在意我」错误拆成
> 「知道你也在意」/「我整夜都无法闭上眼睛」两行）。本节按更正后的歌词重新设计，
> 原 v1 版本（含 V3「不会有我们」、A2「是最该死的能力」）作废。

网格 11 行 × 11 列。5 条词条，4 个交叉。A2 为附加横向词条。

| id | text | direction | (row, col) | 交叉格 |
|---|---|---|---|---|
| A1 | 如果我们还在一起 | horizontal | (4, 0) | (4,0)、(4,2)、(4,5) |
| V1 | 也许我还是没勇气 | vertical | (2, 2) | (4,2) 与 A1 的「我」 |
| V2 | 知道你也在意我 | vertical | (0, 5) | (4,5) 与 A1 的「在」；(6,5) 与 A2 的「我」 |
| A2 | 我想要对你说 | horizontal | (6, 5) | (6,5) 与 V2 的「我」 |
| V4 | 如果你也在这里 | vertical | (4, 0) | (4,0) 与 A1 的「如」 |

提示字：(4,0)如、(4,5)在、(3,2)许、(9,2)气、(6,5)我、(6,10)说、(10,0)里。
无平行相邻。交叉格「我」(4,2) 不预填，靠 A1／V1 互相解出。

```
      c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 c10
 r0   ·  ·  ·  ·  ·  ＿ ·  ·  ·  ·  ·
 r1   ·  ·  ·  ·  ·  ＿ ·  ·  ·  ·  ·
 r2   ·  ·  ＿ ·  ·  ＿ ·  ·  ·  ·  ·
 r3   ·  ·  许 ·  ·  ＿ ·  ·  ·  ·  ·
 r4   如 ＿ ＿ ＿ ＿ 在 ＿ ＿ ·  ·  ·
 r5   ＿ ·  ＿ ·  ·  ＿ ·  ·  ·  ·  ·
 r6   ＿ ·  ＿ ·  ·  我 ＿ ＿ ＿ ＿ 说
 r7   ＿ ·  ＿ ·  ·  ·  ·  ·  ·  ·  ·
 r8   ＿ ·  ＿ ·  ·  ·  ·  ·  ·  ·  ·
 r9   ＿ ·  气 ·  ·  ·  ·  ·  ·  ·  ·
 r10  里 ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
```

### 12.3 `puzzleId: "wangqian"` —《往前》

网格 10 行 × 10 列。6 条词条，5 个交叉。A2 为附加横向词条。

| id | text | direction | (row, col) | 交叉格 |
|---|---|---|---|---|
| A1 | 永远有你在我身边 | horizontal | (5, 2) | (5,4)、(5,6)、(5,7)、(5,9) |
| V1 | 没有后路退 | vertical | (4, 4) | (5,4) 与 A1 的「有」；(8,4) 与 A2 的「退」 |
| V2 | 我只能往前 | vertical | (5, 7) | (5,7) 与 A1 的「我」 |
| V3 | 每天和自己在告别 | vertical | (0, 6) | (5,6) 与 A1 的「在」 |
| V4 | 挣脱了边界 | vertical | (2, 9) | (5,9) 与 A1 的「边」 |
| A2 | 在害怕在退却 | horizontal | (8, 0) | (8,4) 与 V1 的「退」 |

提示字：(5,4)有、(5,9)边、(8,4)退、(6,7)只、(9,7)前、(0,6)每、(7,6)别、(2,9)挣、(8,5)却。
平行相邻：V2(col7) 与 V3(col6) 在第 5–7 行相邻。

```
      c0 c1 c2 c3 c4 c5 c6 c7 c8 c9
 r0   ·  ·  ·  ·  ·  ·  每 ·  ·  ·
 r1   ·  ·  ·  ·  ·  ·  ＿ ·  ·  ·
 r2   ·  ·  ·  ·  ·  ·  ＿ ·  ·  挣
 r3   ·  ·  ·  ·  ·  ·  ＿ ·  ·  ＿
 r4   ·  ·  ·  ·  ＿ ·  ＿ ·  ·  ＿
 r5   ·  ·  ＿ ＿ 有 ＿ ＿ ＿ ＿ 边
 r6   ·  ·  ·  ·  ＿ ·  ＿ 只 ·  ＿
 r7   ·  ·  ·  ·  ＿ ·  别 ＿ ·  ·
 r8   ＿ ＿ ＿ ＿ 退 却 ·  ＿ ·  ·
 r9   ·  ·  ·  ·  ·  ·  ·  前 ·  ·
```

---

## 13. 后续版本方向（不在 MVP）

- 多首歌合并的候选词条池，按「跨歌共享的低频字符、且字符下标错开」挑选，以提高交叉密度。
- 全自动生成，并配合「打乱的歌词行列表」参考面板做解的唯一性求解。
- 词条允许为完整行的子串。
- 难度分级：提示字数量、干扰字符比例、是否提供参考面板。

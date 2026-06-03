# Fitness-AI 测试文档

> **概述**：本文档为 Fitness-AI 项目的完整测试指南，涵盖测试框架选型、运行命令、Mock 策略、测试文件清单及全部测试项。

> 文档版本：v1.0 | 更新日期：2026-05-20

---

## 1. 测试框架

| 组件 | 选择 | 说明 |
|------|------|------|
| 测试运行器 | **Vitest** 4.x | 快速、原生 ESM、兼容 Jest API |
| 断言库 | Vitest 内置 (`expect`) | 兼容 Jest 断言语法 |
| React 测试 | **@testing-library/react** | 组件渲染与交互测试 |
| DOM 环境 | **jsdom** | 模拟浏览器环境 |
| IndexedDB | **fake-indexeddb** | 自动注入全局，拦截 IndexedDB 操作 |
| 覆盖率 | **@vitest/coverage-v8** | V8 原生覆盖率 |

## 2. 运行命令

```bash
# 运行全部测试
pnpm vitest run

# 监听模式（开发时使用）
pnpm vitest

# 运行单个测试文件
pnpm vitest run lib/__tests__/health-utils.test.ts

# 带覆盖率报告
pnpm vitest run --coverage

# UI 模式
pnpm vitest --ui
```

## 3. 测试文件结构

```
Snapifit-AI/
├── vitest.config.ts                # Vitest 全局配置
├── lib/
│   ├── test-utils.ts               # 测试辅助工具（数据工厂 + mock 函数）
│   └── __tests__/
│       ├── utils.test.ts           # 纯函数：cn / formatDailyStatusForAI
│       ├── health-utils.test.ts    # 纯函数：BMR / TDEE 计算
│       ├── tef-utils.test.ts       # 纯函数：TEF / 衰减 / 增强因子
│       ├── tef-cache.test.ts       # 单例类：TEFCacheManager
│       └── openai-client.test.ts   # Mock fetch：OpenAI 客户端
└── hooks/
    └── __tests__/
        ├── use-local-storage.test.ts   # Hook：localStorage CRUD
        ├── use-indexed-db.test.ts      # Hook：IndexedDB CRUD
        ├── use-date-records.test.ts    # Hook：日历记录标记
        ├── use-export-reminder.test.ts # Hook：导出提醒逻辑
        └── use-ai-memory.test.ts       # Hook：AI 记忆管理
```

## 4. Mock 策略

### 4.1 纯函数测试（lib/）
- **无需 Mock**：直接 import → 输入值 → 验证返回值
- 适合：`health-utils.ts`、`tef-utils.ts`、`utils.ts`

### 4.2 类测试（lib/tef-cache.ts）
- Mock `localStorage`：使用 `vi.stubGlobal('localStorage', mockLocalStorage)`
- 验证内存 Map + localStorage 双向同步

### 4.3 API 客户端测试（lib/openai-client.ts）
- Mock `global.fetch`：使用 `vi.fn().mockResolvedValue()`
- 验证请求 URL、headers、body 构造正确性

### 4.4 Hook 测试
- `use-local-storage`：Mock `localStorage` + `window`
- `use-indexed-db`：使用 `fake-indexeddb`（自动注入 `indexedDB` 全局对象）
- `use-date-records`：Mock `window.indexedDB`
- `use-export-reminder`：Mock `window.indexedDB` + `localStorage`
- `use-ai-memory`：Mock `window.indexedDB`

## 5. 测试文件清单与测试项

### 5.1 utils.test.ts（7 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | cn 合并类名 | 验证 clsx + twMerge 合并 |
| 2 | cn 处理冲突 | 后者覆盖前者 |
| 3 | formatDailyStatus 正常 | stress=3 → "3/6(一般)" |
| 4 | formatDailyStatus 压力反向 | stress=5 → "5/6(很高)" |
| 5 | formatDailyStatus undefined | undefined → "未记录" |
| 6 | formatDailyStatus 含睡眠时间 | bedTime+wakeTime → "睡眠时间: 23:00 - 7:00" |
| 7 | formatDailyStatus 含备注 | stressNotes → "压力备注: xxx" |

### 5.2 health-utils.test.ts（16 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | Mifflin-St Jeor 男 | 70kg/170cm/30y/male → 1655 kcal |
| 2 | Mifflin-St Jeor 女 | 同上/female → 1489 kcal |
| 3 | Mifflin-St Jeor other | 同上/other → (1655+1489)/2 |
| 4 | Harris-Benedict 男 | 70kg/170cm/30y/male |
| 5 | Harris-Benedict 女 | 验证女性公式 |
| 6 | Katch-McArdle | LBM=56kg → 370+21.6×56 |
| 7 | Katch-McArdle 零值 | LBM ≤ 0 → 返回 0 |
| 8 | TDEE sedentary | BMR × 1.2 |
| 9 | TDEE with TEF | TDEE + additionalTEF |
| 10 | 当日体重大于配置 | 优先使用当日体重 |
| 11 | 当日体重无效 | 回退到 userProfile.weight |
| 12 | 活动水平无效 | 未知活动水平→返回 undefined |
| 13 | 去脂体重+有效体脂率 | 走 Katch-McArdle 路径 |
| 14 | 去脂体重+无效体脂率 | 回退总体重计算 |
| 15 | 缺少身高/年龄/性别 | 返回 undefined |
| 16 | calculateMetabolicRates 整合 | 端到端完整参数验证 |

### 5.3 tef-utils.test.ts（19 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | 基础 TEF 计算 | 混合食物聚合 |
| 2 | 纯蛋白质 TEF | 100g蛋白×4×0.25 = 100 kcal |
| 3 | 纯碳水 TEF | 100g碳水×4×0.08 = 32 kcal |
| 4 | 纯脂肪 TEF | 100g脂肪×9×0.02 = 18 kcal |
| 5 | 混合食物 TEF | 端到端多条食物聚合 |
| 6 | 空食物列表 | 返回全零 |
| 7 | 时间衰减-上升阶段 | 0.5h → 0.5/1.5 = 0.333 |
| 8 | 时间衰减-峰值 | 1.5h → 1.0 |
| 9 | 时间衰减-衰减阶段 | 3.5h → e^(-2×ln2/2) = 0.5 |
| 10 | 时间衰减-消失 | 7h → 0 |
| 11 | 未来时间 | hoursElapsed < 0 → 0 |
| 12 | 咖啡因识别 | "美式咖啡" → 推入"咖啡因" |
| 13 | 绿茶覆盖咖啡因 | "抹茶" → 推入"绿茶儿茶素" |
| 14 | 辛辣识别 | "川菜" → 推入"辛辣食物" |
| 15 | 多重因子累积 | 咖啡+辛辣→1.10×1.08=1.188 |
| 16 | 乘数上限 | 5类全匹配→上限1.3 |
| 17 | 去重 | 同类关键词两次→只记录一次 |
| 18 | generateTEFAnalysis 整合 | 端到端完整分析 |
| 19 | 自定义乘数覆盖 | 传入 enhancementMultiplier |

### 5.4 tef-cache.test.ts（17 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | 相同食物相同哈希 | 两次相同输入→相同 hash |
| 2 | 顺序无关 | 交换顺序→hash 相同 |
| 3 | 不同克数不同哈希 | 克数变化→hash 不同 |
| 4 | 不同食物不同哈希 | 食物名不同→hash 不同 |
| 5 | 浮点精度一致性 | 1.0000001 舍入为 1.0 |
| 6 | 缓存命中 | set 后 get→返回缓存值 |
| 7 | 缓存未命中 | 新数据→返回 null |
| 8 | 缓存过期 | 模拟 25h 前→返回 null |
| 9 | shouldAnalyze-相同哈希 | 相同哈希→false |
| 10 | shouldAnalyze-有缓存 | 新数据有缓存→false |
| 11 | shouldAnalyze-需分析 | 新数据无缓存→true |
| 12 | localStorage 持久化恢复 | setItem→新实例初始化→可 get |
| 13 | 过期数据不恢复 | 过期缓存→初始化不加载 |
| 14 | 清理过期缓存 | 写入时自动删除已过期 |
| 15 | clearCache | Map.size=0, localStorage 键删除 |
| 16 | getCacheStats | {size, oldestEntry} 正确 |
| 17 | SSR 安全 | typeof window==="undefined" 不崩溃 |

### 5.5 openai-client.test.ts（10 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | 构造函数 baseUrl 去斜杠 | 末尾 `/` 被移除 |
| 2 | 构造函数 baseUrl 去 /v1 | 末尾 `/v1` 被移除 |
| 3 | createChatCompletion 成功 | 验证请求 URL/headers/body |
| 4 | createChatCompletion 失败 | 模拟 401→验证异常 |
| 5 | generateText 纯文本 | 验证消息格式 |
| 6 | generateText 视觉模式 | 验证 image_url 数组 |
| 7 | streamText 插入 system | 验证 system 消息位置 |
| 8 | listModels 成功 | GET 返回模型列表 |
| 9 | listModels 失败 | 模拟非 OK |
| 10 | stream:true 参数传递 | streamText 传 stream:true |

### 5.6 use-local-storage.test.ts（6 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | SSR 环境返回初始值 | window undefined 不崩溃 |
| 2 | 首次读取空 localStorage | 返回 initialValue |
| 3 | 读取已存在的值 | 返回解析后的 JSON |
| 4 | JSON 解析异常降级 | 垃圾数据→返回 initialValue |
| 5 | setValue 写入 | state 和 localStorage 同步 |
| 6 | 函数式更新 | setValue(prev => ...) |

### 5.7 use-indexed-db.test.ts（9 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | DB 初始化成功 | isInitializing → false |
| 2 | DB 初始化失败 | 验证 error 状态 |
| 3 | onupgradeneeded 创建 store | healthLogs+aiMemories 两个 store |
| 4 | getData 读取数据 | put 后 get 返回正确值 |
| 5 | getData 读取不存在键 | 返回 null/undefined |
| 6 | saveData 覆盖已有键 | 两次 put→get 得到新值 |
| 7 | deleteData | delete 后 get 返回 null |
| 8 | clearAllData | clear 后所有数据不可读 |
| 9 | 组件卸载清理 | db.close() 被调用 |

### 5.8 use-date-records.test.ts（6 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | 加载有食物记录的日期 | foodEntries.length>0 被标记 |
| 2 | 加载有运动记录的日期 | exerciseEntries.length>0 被标记 |
| 3 | 有体重无条目的日期 | weight!==undefined 被标记 |
| 4 | 空数据 | 无记录时 Set 为空 |
| 5 | hasRecord 判定 | 有记录 true，无记录 false |
| 6 | refreshRecords 刷新 | 新增数据后更新集合 |

### 5.9 use-export-reminder.test.ts（5 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | 无数据时不提醒 | 空 IndexedDB→shouldRemind=false |
| 2 | 从未导出且有数据时提醒 | 数据≥2天+无 lastExportTime→true |
| 3 | 超过 2 天未导出提醒 | lastExportTime > 2 天→true |
| 4 | 刚导出不久不提醒 | lastExportTime < 2 天→false |
| 5 | 数据跨度不足 | 只有当天数据→hasEnoughData=false |

### 5.10 use-ai-memory.test.ts（12 项）

| # | 测试项 | 说明 |
|---|--------|------|
| 1 | 初始化加载所有记忆 | IndexedDB 有 3 个→memories 含 3 个 |
| 2 | 初始化空数据库 | 无数据→memories = {} |
| 3 | 方案 A 成功（cursor 遍历） | openCursor 正常 |
| 4 | 方案 B 回退（逐个查询） | cursor 失败→逐个 getData |
| 5 | getMemory 读取 | memories["nutrition"]→正确内容 |
| 6 | getMemory 不存在 | 返回 null |
| 7 | updateMemory 成功 | saveData+version+1+状态更新 |
| 8 | updateMemory 超 500 字 | content.length>500→throw |
| 9 | clearMemory 成功 | deleteData+状态删除 |
| 10 | clearAllMemories 成功 | clearAllData+state={} |
| 11 | DB 打开失败回退 | indexedDB.open 失败→方案 B |
| 12 | 单个记忆加载失败不阻塞 | 一个抛异常→其他正常 |

## 6. 测试覆盖率目标

| 层级 | 目标覆盖率 | 说明 |
|------|-----------|------|
| lib/ 工具函数 | ≥ 90% | 纯函数天然高覆盖 |
| hooks/ | ≥ 80% | Hook 核心逻辑路径覆盖 |
| components/ | ≥ 70% | 组件渲染 + 交互 |
| API routes | ≥ 60% | 路由级集成测试 |

---
name: ppt-mcp-generation
description: Use this skill when the user requests to generate, create, or make presentations (PPT/PPTX). Creates professional PowerPoint presentations using officecli without requiring image generation capabilities. Perfect for models that cannot generate images.
---

# PPT MCP Generation Skill

## 重要说明

**必须通过 bash 工具调用 officecli 命令，不要直接调用 officecli MCP 工具！**

原因：officecli MCP 运行在宿主机上，无法访问容器的虚拟路径。通过 bash 工具调用时，deer-flow 会自动将虚拟路径转换为宿主机实际路径。

**模板路径**: `/mnt/skills/public/templates/default.pptx`

## 工作流程

### 步骤0: 查看模板结构（重要！）

**必须先查看模板结构**，了解占位符名称：

```
description: 查看模板结构
command: officecli view /mnt/skills/public/templates/default.pptx outline
```

或获取详细信息：

```
description: 获取第一张幻灯片结构
command: officecli get /mnt/skills/public/templates/default.pptx /slide[1] --depth 2
```

**必须识别两种模板类型：**

1. **占位符模板**：存在 `placeholder[title/body/subtitle]`，优先使用占位符写入。
2. **文本框模板**：仅有 `shape[@id=...] (textbox)`，必须按 `shape` 写入，不能假设有 placeholder。

> 如果 `layoutType=blank` 且输出只有 `shape(textbox)`，按文本框模板处理。

### 步骤1: 复制模板到输出目录

```
description: 复制PPT模板到输出目录
command: cp /mnt/skills/public/templates/default.pptx /mnt/user-data/outputs/presentation.pptx
```

### 步骤1.5: 清理同文件旧会话（推荐）

为避免历史 resident 进程干扰本次写入，建议先关闭一次（即使不存在也可忽略失败）。

```
description: 清理旧会话
command: officecli close /mnt/user-data/outputs/presentation.pptx || true
```

### 步骤2: 打开文档会话（必须）

officecli 存在 resident process（open/close）。为避免“set 成功但文件未落盘”，必须显式打开并在最后关闭。

```
description: 打开PPT会话
command: officecli open /mnt/user-data/outputs/presentation.pptx
```

### 步骤3: 使用 bash 工具调用 officecli 命令

**必须通过 bash 工具执行 officecli 命令**。

#### 设置占位符内容（推荐）

根据模板中的占位符名称设置内容：

```
description: 设置标题占位符
command: officecli set /mnt/user-data/outputs/presentation.pptx '/slide[1]/placeholder[title]' --prop text="演示标题"
```

```
description: 设置副标题占位符
command: officecli set /mnt/user-data/outputs/presentation.pptx '/slide[1]/placeholder[subtitle]' --prop text="副标题内容"
```

常见占位符名称：
- `placeholder[title]` - 标题
- `placeholder[subtitle]` - 副标题
- `placeholder[centertitle]` - 居中标题
- `placeholder[body]` - 正文内容
- `placeholder[footer]` - 页脚

#### 设置形状内容（当模板无 placeholder 时）

如果模板使用形状而非占位符：

```
description: 设置形状文本
command: officecli set /mnt/user-data/outputs/presentation.pptx '/slide[1]/shape[1]' --prop text="标题内容"
```

推荐优先使用稳定选择器（按 id）：

```
description: 设置文本框文本（按id）
command: officecli set /mnt/user-data/outputs/presentation.pptx '/slide[1]/shape[@id=4]' --prop text="标题内容"
```

### 步骤4: 写入后强制校验（必须执行）

每次 `set` 之后，必须立刻 `get` 验证文本是否实际写入。禁止仅根据 `set` 返回成功就认为完成。

占位符示例校验：

```
description: 校验占位符写入结果
command: officecli get /mnt/user-data/outputs/presentation.pptx '/slide[1]/placeholder[title]' --depth 2
```

文本框示例校验：

```
description: 校验文本框写入结果
command: officecli get /mnt/user-data/outputs/presentation.pptx '/slide[1]/shape[@id=4]' --depth 3
```

若校验内容不匹配，按以下顺序回退重试：
1. 重新读取该页结构（`officecli get ... /slide[N] --depth 3`）
2. 改用更精确选择器（`shape[@id=...]` 优于 `shape[1]`）
3. 必要时改写到段落层：`/shape[@id=x]/paragraph[1]`
4. 仍失败则明确报错，不得静默继续

### 步骤4.5: 推荐使用 batch 执行多步写入（最稳）

当需要执行多个 `set/add/remove` 时，优先使用 `officecli batch`，它会在一次 open/save 周期内执行，减少会话状态不一致风险。

示例（将 JSON 存入临时文件后执行）：

```
description: 批量执行PPT修改
command: officecli batch /mnt/user-data/outputs/presentation.pptx --commands '[{"op":"set","path":"/slide[1]/shape[@id=2]","props":{"text":"演示标题"}},{"op":"set","path":"/slide[1]/shape[@id=3]","props":{"text":"副标题内容"}}]'
```

> 注意：`batch` 的参数格式以 `officecli batch --help` 为准；若当前版本格式不同，按帮助输出调整字段名。

### 步骤5: 关闭会话触发落盘（必须）

完成全部 `set/add` 后必须执行 `close`，否则可能只改了内存态。

```
description: 关闭PPT会话并触发落盘
command: officecli close /mnt/user-data/outputs/presentation.pptx
```

### 步骤6: 落盘校验（必须）

关闭后必须再次校验文件真实变化，至少执行一种：

1. 文件哈希变化：
```
description: 校验文件哈希
command: md5sum /mnt/user-data/outputs/presentation.pptx
```

2. 直接读取 slide xml 文本（推荐）：
```
description: 校验落盘后的XML文本
command: unzip -p /mnt/user-data/outputs/presentation.pptx ppt/slides/slide1.xml | rg "关键文本"
```

若哈希不变且 XML 中无目标文本，视为失败，必须报错并停止。

#### 添加新幻灯片

```
description: 添加新幻灯片
command: officecli add /mnt/user-data/outputs/presentation.pptx / --type slide --prop layout=title
```

常用布局类型：
- `title` - 标题幻灯片
- `titleOnly` - 仅标题
- `blank` - 空白
- `twoColumn` - 两栏

#### 在幻灯片上添加形状

```
description: 添加文本框
command: officecli add /mnt/user-data/outputs/presentation.pptx '/slide[2]' --type shape --prop text="内容文本" --prop x=2cm --prop y=3cm --prop width=10cm --prop height=2cm
```

### 步骤7: 呈现给用户

使用 `present_files` 工具将生成的PPT呈现给用户。

## 完整示例：生成5页新闻PPT

1. 查看模板结构：
   ```
   description: 查看模板结构
   command: officecli view /mnt/skills/public/templates/default.pptx outline
   ```

2. 复制模板：
   ```
   description: 复制模板
   command: cp /mnt/skills/public/templates/default.pptx /mnt/user-data/outputs/news.pptx
   ```

3. 设置第1页标题（根据模板结构选择 placeholder 或 shape）：
   ```
   description: 设置标题页
   command: officecli set /mnt/user-data/outputs/news.pptx '/slide[1]/placeholder[title]' --prop text="今日新闻摘要"
   ```

   若无 placeholder，改用：
   ```
   description: 设置标题页（文本框模板）
   command: officecli set /mnt/user-data/outputs/news.pptx '/slide[1]/shape[@id=4]' --prop text="今日新闻摘要"
   ```

   然后必须校验：
   ```
   description: 校验第1页标题
   command: officecli get /mnt/user-data/outputs/news.pptx '/slide[1]' --depth 3
   ```

4. 设置第1页副标题：
   ```
   description: 设置副标题
   command: officecli set /mnt/user-data/outputs/news.pptx '/slide[1]/placeholder[subtitle]' --prop text="2026年4月22日"
   ```

5. 添加第2页：
   ```
   description: 添加第2页
   command: officecli add /mnt/user-data/outputs/news.pptx / --type slide --prop layout=title
   ```

6. 设置第2页内容：
   ```
   description: 设置第2页标题
   command: officecli set /mnt/user-data/outputs/news.pptx '/slide[2]/placeholder[title]' --prop text="新闻标题1"
   ```

7. 重复添加和设置直到5页

8. 呈现给用户

## officecli 常用命令参考

| 操作 | 命令格式 |
|------|----------|
| 查看结构 | `officecli view <path> outline` |
| 获取元素 | `officecli get <path> <selector> --depth 2` |
| 设置占位符 | `officecli set <path> '/slide[N]/placeholder[name]' --prop text="内容"` |
| 设置形状（推荐） | `officecli set <path> '/slide[N]/shape[@id=N]' --prop text="内容"` |
| 添加幻灯片 | `officecli add <path> / --type slide --prop layout=<layout>` |
| 添加形状 | `officecli add <path> '/slide[N]' --type shape --prop text="内容" --prop x=... --prop y=...` |
| 批量修改（推荐） | `officecli batch <path> --commands '<json-array>'` |

### 选择器语法

| 选择器 | 说明 |
|--------|------|
| `/` | 文档根 |
| `/slide[1]` | 第1张幻灯片 |
| `/slide[2]/shape[@id=8]` | 第2张幻灯片中 id=8 的形状 |
| `/slide[1]/placeholder[title]` | 第1张幻灯片的标题占位符 |

## 禁止事项

- **禁止直接调用 officecli_officecli MCP 工具**（路径无法正确转换）
- **禁止使用 python-pptx 库从头创建PPT**（会丢失模板样式）
- **禁止使用 image-generation 技能**
- **禁止使用 ppt-generation 技能**（它需要图片生成）
- **禁止跳过写入校验步骤**（必须 `set` 后 `get` 验证）
- **禁止省略 `officecli close <file>`**（可能导致未落盘）

## 输出路径

所有生成的PPT文件保存到：`/mnt/user-data/outputs/`

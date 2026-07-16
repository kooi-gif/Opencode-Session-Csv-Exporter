# opencode-session-csv-exporter

中文 | [English](#english)

把 `opencode` 的本机会话列表自动导出为 CSV，方便你快速回忆：

- 这个 session 是干什么的
- 这个 session 当时开在哪个目录
- 第一条提问是什么
- 最近一次更新时间是什么时候

它适合"开了很多对话框，怕忘记每个窗口对应什么内容"的使用场景。

## 插件组成

本包包含两个插件和一个命令：

| 组件 | 作用 |
|------|------|
| `session-csv.js` | 自动导出全局 session 列表到 CSV |
| `save-history.js` | 自动保存结构化历史快照到工作区 `history/` 目录 |
| `/his_sess` | TUI 命令，一键用默认程序打开全局 CSV |

## 核心能力

- 启动 `opencode` 时自动生成或刷新 `opencode_sessions.csv`
- 会话继续进行时自动刷新 CSV
- 记录每个 session 的标题、目录路径、模型、时间、首条用户输入
- 自动保存每个会话的事件摘要和原始快照到 `history/` 目录
- 重点保留 `directory`，方便你知道这个 session 当时开在哪个目录
- 不依赖第三方 sqlite npm 包，直接使用 Node 24 自带 `node:sqlite`
- 提供 `/his_sess` 命令，在 TUI 中快速打开 CSV

## CSV 字段说明

- `session_id`: opencode 内部 session id
- `title`: opencode 显示的 session 标题
- `directory`: session 实际启动目录
- `session_path`: opencode 记录的相对路径标签
- `project_worktree`: 数据库中的 project worktree
- `workspace_directory`: 数据库中的 workspace directory
- `agent`: 使用的 agent
- `model`: 使用的模型信息
- `message_count`: 该 session 的消息数
- `input_count`: 用户输入条数
- `first_prompt`: 第一条用户输入，方便快速回忆内容
- `created_at`: 创建时间（UTC）
- `updated_at`: 最后更新时间（UTC）

## 输出位置

CSV 默认输出到 opencode 全局配置目录：

```text
~/.config/opencode/opencode_sessions.csv
```


## 数据来源

插件读取本机 opencode 数据库：

```text
~/.local/share/opencode/opencode.db
```

主要读取这些表：

- `session`
- `project`
- `workspace`
- `message`
- `part`

## 安装

方式 1:

```bash
node install.js
```

方式 2:

```bash
npm run install:opencode
```

安装后需要重启 `opencode`。

## 卸载

```bash
npm run uninstall:opencode
```

## 安装后会写入什么

安装脚本会把这些文件复制到 `~/.config/opencode/`：

- `plugins/session-csv.js`
- `plugins/save-history.js`
- `commands/his_sess.md`
- `AGENTS.md`

它还会尽量自动更新 `~/.config/opencode/opencode.jsonc`，把 `~/.config/opencode/AGENTS.md` 加进 `instructions`。

## 工作原理

`session-csv.js` 插件启动后会做两件事：

1. 在 opencode 初始化时立刻扫描数据库，生成一次 CSV
2. 在当前会话继续产生事件时，再次刷新 CSV

`save-history.js` 插件则会：

1. 在会话进行中持续捕获事件，自动保存到 `history/` 目录
2. 更新工作区 `AGENTS.md` 中的最新会话信息

这样你每次打开 opencode，都能拿到最新的 session 总表和历史快照。

## /his_sess 命令

安装后可在 opencode TUI 中使用 `/his_sess` 命令。它会用系统默认程序（Excel、记事本、VS Code 等）自动打开全局 CSV 文件。

命令定义文件位置：

```text
~/.config/opencode/commands/his_sess.md
```

## 适合什么场景

- 你经常同时开多个项目和多个 session
- 你想知道"这个旧对话当时是在哪个目录开的"
- 你想把 session 信息导出来自己筛选、排序、搜索
- 你想在 Excel 里统一管理自己的 opencode 会话
- 你想自动保留每个会话的结构化记录以便回溯

## 限制

- 依赖 Node 24 自带的 `node:sqlite`
- 这是会话索引导出，不会切换 opencode UI 到旧线程
- CSV 的路径、标题、模型等内容以 opencode 数据库记录为准
- `first_prompt` 是从最早的用户消息里提取的简短文本，不是完整历史全文

## 仓库结构

```text
.
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── assets/
│   ├── AGENTS.md
│   ├── commands/
│   │   └── his_sess.md
│   └── plugins/
│       ├── save-history.js
│       └── session-csv.js
├── .gitignore
├── install.js
├── LICENSE
├── package.json
├── README.md
└── uninstall.js
```

## English

`opencode-session-csv-exporter` automatically exports local `opencode` sessions to a CSV file so you can remember what each chat window was about and where it was opened.

### Capabilities

- Refreshes `opencode_sessions.csv` when `opencode` starts
- Refreshes it again while the session continues
- Records each session title, directory, model, timestamps, and first prompt
- Automatically saves structured history snapshots to the workspace `history/` directory
- Preserves the exact `directory` where the session was opened
- Uses Node 24 built-in `node:sqlite`, so no extra sqlite package is required
- Provides `/his_sess` command to open the CSV from TUI

### Install

```bash
node install.js
```

or:

```bash
npm run install:opencode
```

Restart `opencode` after installation.

### Uninstall

```bash
npm run uninstall:opencode
```

### Use Case

This plugin is useful if you often open many `opencode` sessions and later forget:

- what each session was for
- which directory it was opened from
- which prompt started it

It now writes one central CSV file under the global opencode config directory instead of scattering copies across multiple workspaces.

### Limitations

- Requires Node 24 built-in `node:sqlite`
- Exports session metadata only
- Does not switch the `opencode` UI to an old native thread

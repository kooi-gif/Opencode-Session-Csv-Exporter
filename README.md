# opencode-session-csv-exporter

中文 | [English](#english)

把 `opencode` 的本机会话列表自动导出为 CSV，方便你快速回忆：

- 这个 session 是干什么的
- 这个 session 当时开在哪个目录
- 第一条提问是什么
- 最近一次更新时间是什么时候

它适合“开了很多对话框，怕忘记每个窗口对应什么内容”的使用场景。

## 核心能力

- 启动 `opencode` 时自动生成或刷新 `opencode_sessions.csv`
- 会话继续进行时自动刷新 CSV
- 记录每个 session 的标题、目录路径、模型、时间、首条用户输入
- 重点保留 `directory`，方便你知道这个 session 当时开在哪个目录
- 不依赖第三方 sqlite npm 包，直接使用 Node 24 自带 `node:sqlite`

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

在你这台机器上对应的是：

```text
C:\Users\永远的神-骁柯\.config\opencode\opencode_sessions.csv
```

这样以后始终只维护一份总 CSV，不会在每个项目目录里各写一份副本。

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
- `AGENTS.md`

它还会尽量自动更新 `~/.config/opencode/opencode.jsonc`，把 `~/.config/opencode/AGENTS.md` 加进 `instructions`。

## 工作原理

插件启动后会做两件事：

1. 在 opencode 初始化时立刻扫描数据库，生成一次 CSV
2. 在当前会话继续产生事件时，再次刷新 CSV

这样你每次打开 opencode，都能拿到最新的 session 总表。

## 适合什么场景

- 你经常同时开多个项目和多个 session
- 你想知道“这个旧对话当时是在哪个目录开的”
- 你想把 session 信息导出来自己筛选、排序、搜索
- 你想在 Excel 里统一管理自己的 opencode 会话

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
│   └── plugins/
│       └── session-csv.js
├── .gitignore
├── install.js
├── LICENSE
├── package.json
├── README.md
└── uninstall.js
```

## 发布到 GitHub 的建议

最简单的做法是把整个 `opencode-session-csv-exporter/` 目录作为一个独立仓库上传。

推荐仓库名：

- `opencode-session-csv-exporter`
- `opencode-session-exporter`

## English

`opencode-session-csv-exporter` automatically exports local `opencode` sessions to a CSV file so you can remember what each chat window was about and where it was opened.

### Capabilities

- Refreshes `opencode_sessions.csv` when `opencode` starts
- Refreshes it again while the session continues
- Records each session title, directory, model, timestamps, and first prompt
- Preserves the exact `directory` where the session was opened
- Uses Node 24 built-in `node:sqlite`, so no extra sqlite package is required

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

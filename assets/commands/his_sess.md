---
description: 打开全局会话 CSV 文件
---

!`node -e "const{execSync}=require('node:child_process');const p=require('node:path').join(require('node:os').homedir(),'.config','opencode','opencode_sessions.csv');const cmd=process.platform==='win32'?'start \"\" \"'+p+'\"':'xdg-open \"'+p+'\"';execSync(cmd)"`

CSV 文件已用系统默认程序打开。文件路径：`~/.config/opencode/opencode_sessions.csv`

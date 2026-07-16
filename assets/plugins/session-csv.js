const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")
const sqlite = require("node:sqlite")

const OUTPUT_FILE = path.join(os.homedir(), ".config", "opencode", "opencode_sessions.csv")
const DB_PATH = path.join(os.homedir(), ".local", "share", "opencode", "opencode.db")
const CSV_HEADERS = [
  "session_id",
  "title",
  "directory",
  "session_path",
  "project_worktree",
  "workspace_directory",
  "agent",
  "model",
  "message_count",
  "input_count",
  "first_prompt",
  "created_at",
  "updated_at",
]

function getProjectRoot(project) {
  if (!project) return process.cwd()
  if (typeof project === "string") return project
  if (typeof project.root === "string") return project.root
  if (typeof project.path === "string") return project.path
  return process.cwd()
}

function toIso(value) {
  if (value == null) return ""
  const numeric = Number(value)
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toISOString()
}

function compactText(value, max = 200) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function csvCell(value) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

function buildCsv(rows) {
  const lines = [CSV_HEADERS.map(csvCell).join(",")]
  for (const row of rows) {
    lines.push(CSV_HEADERS.map((header) => csvCell(row[header])).join(","))
  }
  return `\ufeff${lines.join("\n")}\n`
}

function loadSessions() {
  const db = new sqlite.DatabaseSync(DB_PATH, { readonly: true })
  try {
    const query = `
      select
        s.id as session_id,
        s.title as title,
        s.directory as directory,
        s.path as session_path,
        p.worktree as project_worktree,
        w.directory as workspace_directory,
        s.agent as agent,
        s.model as model,
        coalesce(msg.message_count, 0) as message_count,
        coalesce(inp.input_count, 0) as input_count,
        coalesce(inp.first_prompt, '') as first_prompt,
        s.time_created as created_at_raw,
        s.time_updated as updated_at_raw
      from session s
      left join project p on p.id = s.project_id
      left join workspace w on w.id = s.workspace_id
      left join (
        select session_id, count(*) as message_count
        from message
        group by session_id
      ) msg on msg.session_id = s.id
      left join (
        select
          m.session_id as session_id,
          count(*) as input_count,
          (
            select json_extract(p2.data, '$.text')
            from message m2
            join part p2 on p2.message_id = m2.id
            where m2.session_id = m.session_id
              and json_extract(m2.data, '$.role') = 'user'
              and json_extract(p2.data, '$.type') = 'text'
            order by m2.time_created asc, p2.time_created asc
            limit 1
          ) as first_prompt
        from message m
        where json_extract(m.data, '$.role') = 'user'
        group by m.session_id
      ) inp on inp.session_id = s.id
      order by s.time_created desc
    `

    return db.prepare(query).all().map((row) => ({
      session_id: row.session_id,
      title: row.title,
      directory: row.directory,
      session_path: row.session_path,
      project_worktree: row.project_worktree,
      workspace_directory: row.workspace_directory,
      agent: row.agent,
      model: row.model,
      message_count: row.message_count,
      input_count: row.input_count,
      first_prompt: compactText(row.first_prompt, 240),
      created_at: toIso(row.created_at_raw),
      updated_at: toIso(row.updated_at_raw),
    }))
  } finally {
    db.close()
  }
}

async function writeSessionCsv(projectRoot) {
  const rows = loadSessions()
  const outputPath = OUTPUT_FILE
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, buildCsv(rows), "utf8")
}

module.exports = async ({ project }) => {
  const projectRoot = getProjectRoot(project)
  let writeInFlight = null
  let pendingWrite = false

  async function scheduleWrite() {
    pendingWrite = true
    if (writeInFlight) return writeInFlight

    writeInFlight = Promise.resolve()
      .then(async () => {
        while (pendingWrite) {
          pendingWrite = false
          await writeSessionCsv(projectRoot)
        }
      })
      .catch(() => {})
      .finally(() => {
        writeInFlight = null
      })

    return writeInFlight
  }

  await scheduleWrite()

  return {
    event: async () => {
      await scheduleWrite()
    },
    config: () => {
      void scheduleWrite()
    },
    "experimental.session.compacting": async () => {
      await scheduleWrite()
    },
  }
}

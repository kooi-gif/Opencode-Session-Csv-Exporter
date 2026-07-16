const fs = require("node:fs/promises")
const path = require("node:path")

const HISTORY_DIR = "history"
const SESSIONS_DIR = "sessions"
const RAW_FILE = "raw.json"
const SUMMARY_FILE = "summary.md"
const INDEX_FILE = "index.json"
const AGENTS_FILE = "AGENTS.md"
const MANAGED_START = "<!-- opencode:history-skill:start -->"
const MANAGED_END = "<!-- opencode:history-skill:end -->"
const MAX_EVENTS = 200
const MAX_INDEX_ITEMS = 100

function getProjectRoot(project) {
  if (!project) return process.cwd()
  if (typeof project === "string") return project
  if (typeof project.root === "string") return project.root
  if (typeof project.path === "string") return project.path
  return process.cwd()
}

function toIso(value = new Date()) {
  try {
    return new Date(value).toISOString()
  } catch {
    return new Date().toISOString()
  }
}

function makeSessionId() {
  const stamp = toIso().replace(/[:.]/g, "-")
  const random = Math.random().toString(36).slice(2, 8)
  return `${stamp}-${random}`
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return JSON.stringify({
      error: "Failed to serialize value",
      message: error instanceof Error ? error.message : String(error),
    }, null, 2)
  }
}

function trimText(value, max = 600) {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}...` : text
}

function collectText(value, output = []) {
  if (value == null) return output
  if (typeof value === "string") {
    const text = trimText(value)
    if (text) output.push(text)
    return output
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, output)
    return output
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (["content", "text", "summary", "title", "message", "prompt"].includes(key)) {
        collectText(item, output)
      }
    }
  }
  return output
}

function buildRecentEntries(events) {
  const recent = []
  for (let i = events.length - 1; i >= 0 && recent.length < 12; i -= 1) {
    const event = events[i]
    const texts = collectText(event.payload)
    if (texts.length === 0) continue
    recent.push({
      type: event.type,
      at: event.at,
      text: texts[0],
    })
  }
  return recent.reverse()
}

function buildSummary(sessionId, events) {
  const recent = buildRecentEntries(events)
  const lines = [
    "# Session Summary",
    "",
    `- Session ID: ${sessionId}`,
    `- Updated: ${toIso()}`,
    `- Event count: ${events.length}`,
    "",
    "## Recent Context",
    "",
  ]

  if (recent.length === 0) {
    lines.push("No text content was extracted from recent events yet.")
  } else {
    for (const item of recent) {
      lines.push(`- [${item.at}] ${item.type}: ${item.text}`)
    }
  }

  lines.push("", "## Notes", "", "This file is maintained automatically by the save-history plugin.")
  return `${lines.join("\n")}\n`
}

function buildTitle(events) {
  const recent = buildRecentEntries(events)
  const first = recent[0]?.text || "Untitled session"
  return trimText(first, 80)
}

async function readIndex(indexPath) {
  try {
    const text = await fs.readFile(indexPath, "utf8")
    const parsed = JSON.parse(text)
    if (parsed && Array.isArray(parsed.sessions)) {
      return parsed
    }
  } catch {}
  return { updatedAt: toIso(), sessions: [] }
}

async function writeAgentsFile(projectRoot, index) {
  const agentsPath = path.join(projectRoot, AGENTS_FILE)
  const folderName = path.basename(projectRoot)
  const latestSessions = index.sessions.slice(0, 5)
  const managedBlock = [
    MANAGED_START,
    "# Workspace Guide",
    "",
    `- Folder: ${folderName}`,
    `- Updated: ${toIso()}`,
    `- History location: ${HISTORY_DIR}/`,
    "",
    "## Purpose",
    "",
    "This workspace is tracked by opencode. Keep a short, current description here so opencode can quickly infer what this directory is for.",
    "",
    "## History Files",
    "",
    `- ${HISTORY_DIR}/${INDEX_FILE}: session index for listing available histories.`,
    `- ${HISTORY_DIR}/${RAW_FILE}: latest raw event snapshot alias.`,
    `- ${HISTORY_DIR}/${SUMMARY_FILE}: latest human-readable summary alias.`,
    `- ${HISTORY_DIR}/${SESSIONS_DIR}/<session-id>/: archived session snapshots.`,
    "",
    "## History Commands",
    "",
    "- `/history-list`: inspect available saved sessions.",
    "- `/history-load <session-id>`: read one saved session into the current conversation context.",
    "",
    "## Latest Sessions",
    "",
  ]

  if (latestSessions.length === 0) {
    managedBlock.push("No saved sessions yet.")
  } else {
    for (const session of latestSessions) {
      managedBlock.push(`- ${session.id}: ${session.title} (${session.updatedAt})`)
    }
  }

  managedBlock.push(MANAGED_END, "")

  let existing = ""
  try {
    existing = await fs.readFile(agentsPath, "utf8")
  } catch {}

  const blockText = managedBlock.join("\n")
  let next = blockText
  if (existing.includes(MANAGED_START) && existing.includes(MANAGED_END)) {
    next = existing.replace(new RegExp(`${MANAGED_START}[\\s\\S]*?${MANAGED_END}`), blockText.trimEnd())
  } else if (existing.trim()) {
    next = `${existing.trimEnd()}\n\n${blockText}`
  }

  await fs.writeFile(agentsPath, next, "utf8")
}

module.exports = async ({ project }) => {
  const projectRoot = getProjectRoot(project)
  const historyRoot = path.join(projectRoot, HISTORY_DIR)
  const latestRawPath = path.join(historyRoot, RAW_FILE)
  const latestSummaryPath = path.join(historyRoot, SUMMARY_FILE)
  const indexPath = path.join(historyRoot, INDEX_FILE)
  const sessionId = makeSessionId()
  const sessionRoot = path.join(historyRoot, SESSIONS_DIR, sessionId)
  const sessionRawPath = path.join(sessionRoot, RAW_FILE)
  const sessionSummaryPath = path.join(sessionRoot, SUMMARY_FILE)

  let events = []
  let writeInFlight = null

  async function persist() {
    await fs.mkdir(sessionRoot, { recursive: true })
    const updatedAt = toIso()
    const summary = buildSummary(sessionId, events)
    const title = buildTitle(events)
    const snapshot = {
      id: sessionId,
      updatedAt,
      projectRoot,
      eventCount: events.length,
      events,
    }

    await fs.writeFile(sessionRawPath, safeStringify(snapshot), "utf8")
    await fs.writeFile(sessionSummaryPath, summary, "utf8")
    await fs.writeFile(latestRawPath, safeStringify(snapshot), "utf8")
    await fs.writeFile(latestSummaryPath, summary, "utf8")

    const index = await readIndex(indexPath)
    const sessions = index.sessions.filter((item) => item.id !== sessionId)
    sessions.unshift({
      id: sessionId,
      title,
      updatedAt,
      eventCount: events.length,
      summaryPath: `${HISTORY_DIR}/${SESSIONS_DIR}/${sessionId}/${SUMMARY_FILE}`,
      rawPath: `${HISTORY_DIR}/${SESSIONS_DIR}/${sessionId}/${RAW_FILE}`,
    })

    index.updatedAt = updatedAt
    index.sessions = sessions.slice(0, MAX_INDEX_ITEMS)

    await fs.writeFile(indexPath, safeStringify(index), "utf8")
    await writeAgentsFile(projectRoot, index)
  }

  function schedulePersist() {
    if (writeInFlight) return writeInFlight
    writeInFlight = Promise.resolve()
      .then(() => persist())
      .catch(() => {})
      .finally(() => {
        writeInFlight = null
      })
    return writeInFlight
  }

  async function captureEvent(type, input) {
    events.push({
      at: toIso(),
      type,
      payload: input,
    })
    if (events.length > MAX_EVENTS) {
      events = events.slice(-MAX_EVENTS)
    }
    await schedulePersist()
  }

  return {
    event: async (input) => {
      await captureEvent(input?.type || "unknown", input)
    },
    "experimental.session.compacting": async (input) => {
      await captureEvent("experimental.session.compacting", input)
    },
  }
}

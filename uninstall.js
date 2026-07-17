const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")

const targetRoot = path.join(os.homedir(), ".config", "opencode")

async function removeIfExists(target) {
  await fs.rm(target, { recursive: true, force: true })
}

function removeInstructionsEntry(text, agentsPath) {
  const instructionsMatch = text.match(/"instructions"\s*:\s*\[(.*?)\]/s)
  if (!instructionsMatch) return text

  const full = instructionsMatch[0]
  const items = instructionsMatch[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item !== JSON.stringify(agentsPath))

  const next = items.length > 0
    ? `"instructions": [\n    ${items.join(",\n    ")}\n  ]`
    : '"instructions": []'

  return text.replace(full, next)
}

async function cleanupConfig() {
  const configPath = path.join(targetRoot, "opencode.jsonc")
  const agentsPath = "~/.config/opencode/AGENTS.md"

  try {
    const text = await fs.readFile(configPath, "utf8")
    const next = removeInstructionsEntry(text, agentsPath)
    await fs.writeFile(configPath, next, "utf8")
  } catch {}
}

async function main() {
  await removeIfExists(path.join(targetRoot, "plugins", "session-csv.js"))
  await removeIfExists(path.join(targetRoot, "plugins", "save-history.js"))
  await removeIfExists(path.join(targetRoot, "commands", "his_sess.md"))
  await removeIfExists(path.join(targetRoot, "AGENTS.md"))
  await cleanupConfig()

  process.stdout.write([
    "Removed global opencode session CSV exporter + history saver files.",
    `Target: ${targetRoot}`,
  ].join("\n"))
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})

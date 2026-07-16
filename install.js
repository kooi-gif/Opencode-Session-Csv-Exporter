const fs = require("node:fs/promises")
const os = require("node:os")
const path = require("node:path")

const sourceRoot = __dirname
const assetsRoot = path.join(sourceRoot, "assets")
const targetRoot = path.join(os.homedir(), ".config", "opencode")

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function copyRecursive(source, target) {
  const stat = await fs.stat(source)
  if (stat.isDirectory()) {
    await ensureDir(target)
    const entries = await fs.readdir(source)
    for (const entry of entries) {
      await copyRecursive(path.join(source, entry), path.join(target, entry))
    }
    return
  }

  await ensureDir(path.dirname(target))
  await fs.copyFile(source, target)
}

function ensureInstructionsEntry(text, agentsPath) {
  if (text.includes(agentsPath)) return text

  const instructionsMatch = text.match(/"instructions"\s*:\s*\[(.*?)\]/s)
  if (instructionsMatch) {
    const full = instructionsMatch[0]
    const inner = instructionsMatch[1].trim()
    const nextInner = inner ? `${inner},\n    ${JSON.stringify(agentsPath)}` : `\n    ${JSON.stringify(agentsPath)}\n  `
    return text.replace(full, `"instructions": [${nextInner}]`)
  }

  const schemaMatch = text.match(/"\$schema"\s*:\s*"[^"]+"\s*,?/) 
  if (schemaMatch) {
    const insertAfter = schemaMatch[0]
    const comma = insertAfter.trim().endsWith(",") ? "" : ","
    return text.replace(insertAfter, `${insertAfter}${comma}\n  "instructions": [\n    ${JSON.stringify(agentsPath)}\n  ],`)
  }

  return `{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    ${JSON.stringify(agentsPath)}
  ]
}\n`
}

async function ensureConfig() {
  const configPath = path.join(targetRoot, "opencode.jsonc")
  const agentsPath = "~/.config/opencode/AGENTS.md"

  let text = ""
  try {
    text = await fs.readFile(configPath, "utf8")
  } catch {
    text = `{
  "$schema": "https://opencode.ai/config.json"
}\n`
  }

  const next = ensureInstructionsEntry(text, agentsPath)
  await fs.writeFile(configPath, next, "utf8")
}

async function main() {
  await ensureDir(targetRoot)

  // copy plugins
  await copyRecursive(path.join(assetsRoot, "plugins"), path.join(targetRoot, "plugins"))
  // copy commands
  await copyRecursive(path.join(assetsRoot, "commands"), path.join(targetRoot, "commands"))
  // copy AGENTS.md
  await copyRecursive(path.join(assetsRoot, "AGENTS.md"), path.join(targetRoot, "AGENTS.md"))

  await ensureConfig()

  process.stdout.write([
    "Installed global opencode session CSV exporter + history saver.",
    `Target: ${targetRoot}`,
    "Restart opencode to activate the plugin and commands.",
  ].join("\n"))
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})

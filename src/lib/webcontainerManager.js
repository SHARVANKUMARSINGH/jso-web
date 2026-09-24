import { WebContainer } from '@webcontainer/api'

/** Waits for a spawned process to exit, but kills it and rejects if it takes
 *  longer than `ms` — without this, a genuinely stuck `npm install` would
 *  leave the whole build spinning forever with no way out. */
function waitForExit(proc, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s and was stopped`))
    }, ms)
    proc.exit.then(
      (code) => {
        clearTimeout(timer)
        resolve(code)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/** WebContainer.boot() may only be called ONCE per page load — cache the
 *  boot promise at module scope so every caller (including React 18/19
 *  StrictMode's double-invoked effects) gets the same instance. */
let bootPromise = null
export function bootWebContainer() {
  if (!bootPromise) bootPromise = WebContainer.boot()
  return bootPromise
}

/** Converts a flat list of { path, contents } files into the nested
 *  FileSystemTree shape WebContainer.mount() expects. */
export function toFileSystemTree(files) {
  const tree = {}
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean)
    const fileName = parts.pop()
    if (!fileName) continue
    let cursor = tree
    for (const dir of parts) {
      const existing = cursor[dir]
      if (existing && existing.directory) {
        cursor = existing.directory
      } else {
        const next = {}
        cursor[dir] = { directory: next }
        cursor = next
      }
    }
    cursor[fileName] = { file: { contents: file.contents } }
  }
  return tree
}

/** Splits a shell command string into argv, respecting simple "quoted" and
 *  'quoted' segments — good enough for `npm install foo`-style commands. */
function tokenizeCommand(command) {
  const tokens = []
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match
  while ((match = regex.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3])
  }
  return tokens
}

/** Runs extra AI-requested commands sequentially inside the container. */
export async function runCommands(container, commands, onOutput) {
  for (const command of commands) {
    const [cmd, ...args] = tokenizeCommand(command)
    if (!cmd) continue
    onOutput?.(`$ ${command}`)
    const proc = await container.spawn(cmd, args)
    proc.output.pipeTo(new WritableStream({ write: (chunk) => onOutput?.(chunk) }))
    const exit = await waitForExit(proc, 120_000, `"${command}"`)
    if (exit !== 0) throw new Error(`"${command}" failed with exit code ${exit}`)
  }
}

/**
 * Mounts the given files and runs `npm install` then `npm run build` inside
 * a hidden WebContainer — no live preview, no visible terminal, nothing the
 * user interacts with directly. This is purely a background validation
 * step: it proves the generated project actually installs and compiles
 * before it's ever offered as a download, instead of shipping a zip that
 * silently doesn't work. `onOutput` exists for optional debugging (e.g.
 * console.log during development) but nothing in the UI renders it — that's
 * the point: the terminal runs, but is never shown.
 */
export async function buildProject(container, files, onOutput = () => {}) {
  await container.mount(toFileSystemTree(files))

  onOutput('$ npm install')
  const install = await container.spawn('npm', ['install'])
  install.output.pipeTo(new WritableStream({ write: (chunk) => onOutput(chunk) }))
  const installExit = await waitForExit(install, 180_000, 'npm install')
  if (installExit !== 0) {
    throw new Error(`npm install failed with exit code ${installExit}`)
  }

  onOutput('$ npm run build')
  const build = await container.spawn('npm', ['run', 'build'])
  build.output.pipeTo(new WritableStream({ write: (chunk) => onOutput(chunk) }))
  const buildExit = await waitForExit(build, 180_000, 'npm run build')
  if (buildExit !== 0) {
    throw new Error(`npm run build failed with exit code ${buildExit}`)
  }
}

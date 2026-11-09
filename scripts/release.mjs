#!/usr/bin/env node
// Release-Ablauf: Version erhöhen → bauen → Commit und Tag pushen → GitHub-Release-Entwurf anlegen.
//
// Aufruf:
//   npm run release          # patch: 0.3.3 → 0.3.4
//   npm run release minor    # minor: 0.3.3 → 0.4.0
//   npm run release major    # major: 0.3.3 → 1.0.0
//   npm run release --minor      # Flag-Schreibweise, mit oder ohne -- davor
//
// Schlägt der Build fehl, wird die Versionserhöhung (Commit + Tag) lokal zurückgenommen.
// Gepusht wird erst nach erfolgreichem Build.

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const BUMP_TYPES = ['patch', 'minor', 'major']

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' })
}

function output(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function readVersion() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
}

// ── Parameter ────────────────────────────────────────────────────────────────

// Ohne -- davor reicht npm ein Flag wie --minor nicht durch, sondern setzt npm_config_minor
const flags = BUMP_TYPES.filter(t => process.env[`npm_config_${t}`] === 'true')
const args = [...process.argv.slice(2).map(a => a.replace(/^-+/, '')), ...flags]
const unknown = args.filter(a => !BUMP_TYPES.includes(a))
if (unknown.length > 0 || new Set(args).size > 1) {
  fail(`Unbekannter oder mehrfacher Parameter: ${args.join(' ')}\n  Erlaubt: ${BUMP_TYPES.join(' | ')} (Standard: patch)`)
}
const bump = args[0] ?? 'patch'

// ── Vorabprüfungen (bevor irgendetwas verändert wird) ────────────────────────

if (output('git status --porcelain') !== '') {
  fail('Das Arbeitsverzeichnis enthält nicht committete Änderungen. Bitte zuerst committen.')
}
try {
  output('gh auth status')
} catch {
  fail('Die GitHub CLI ist nicht angemeldet. Bitte zuerst `gh auth login` ausführen.')
}
const branch = output('git rev-parse --abbrev-ref HEAD')
try {
  output('git rev-parse --abbrev-ref --symbolic-full-name @{u}')
} catch {
  fail(`Der Branch "${branch}" hat keinen Upstream auf GitHub. Bitte zuerst \`git push -u origin ${branch}\` ausführen.`)
}

const oldVersion = readVersion()

// ── 1. Version erhöhen (Commit + Tag, lokal) ────────────────────────────────

run(`npm version ${bump} -m "%s"`)
const version = readVersion()
console.log(`\n▶ Version ${oldVersion} → ${version} (Branch ${branch})\n`)

// ── 2. Bauen ─────────────────────────────────────────────────────────────────

try {
  run('npm run release:build')
} catch {
  console.error(`\n✖ Build fehlgeschlagen – Versionserhöhung auf ${version} wird zurückgenommen.`)
  run(`git tag -d v${version}`)
  run('git reset --keep HEAD~1')
  fail(`Version steht wieder auf ${oldVersion}. Fehler beheben und \`npm run release ${bump}\` erneut ausführen.`)
}

// ── 3. Commit und Tag pushen ─────────────────────────────────────────────────

try {
  run('git push --follow-tags')
} catch {
  fail(`Push fehlgeschlagen. Commit und Tag v${version} sind lokal vorhanden.\n  Nach Behebung: \`git push --follow-tags && npm run release:github\``)
}

// ── 4. GitHub-Release-Entwurf anlegen ────────────────────────────────────────

try {
  run('npm run release:github')
} catch {
  fail(`Anlegen des Release-Entwurfs fehlgeschlagen. Die Dateien liegen in release/.\n  Erneut versuchen mit: \`npm run release:github\``)
}

console.log(`\n✔ Release-Entwurf v${version} ist auf GitHub angelegt. Dort Release-Notes eintragen und veröffentlichen.`)

// Baut alle Release-Artefakte nach release/ (wird von `npm run release` aufgerufen).
// Einzeln ausführbar: npm run release:build

import { execSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { zipSync } from 'fflate'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'))
const distDir = path.resolve('dist')
const releaseDir = path.resolve('release')
const zipName = `gradehub-${version}-webserver.zip`

// config.js-Inhalte für die beiden Varianten
const CONFIG_WEBSERVER = `\
// Laufzeit-Konfiguration fuer SVWS-GradeHub.
// Diese Datei kann nach dem Build editiert werden, ohne neu zu bauen.
//
// admintoolVisible: true  → Adminbereich wird angezeigt
// admintoolVisible: false → Adminbereich wird ausgeblendet (Lehrkraft-Modus)
//
// mailServerUrl           → URL des Node.js-Mail-Servers, wenn server.js separat
//                           neben einem anderen Webserver (z.B. Jetty) laeuft.
//                           Beispiel: 'https://svws-server.schule.de:3001'
//                           Leer lassen, wenn server.js die App selbst ausliefert.
window.GRADEHUB_CONFIG = {
  // admintoolVisible: true,
  // mailServerUrl: 'https://svws-server.schule.de:3001',
}
`

const CONFIG_ELECTRON = `\
// Laufzeit-Konfiguration fuer SVWS-GradeHub (Electron).
// In der Electron-App ist der Admin-Modus standardmäßig aktiv.
window.GRADEHUB_CONFIG = {
  admintoolVisible: true,
}
`

console.log('Bereinige Release-Verzeichnis...')
await rm(releaseDir, { recursive: true, force: true })

console.log('Baue Projekt...')
execSync('npm run build', { stdio: 'inherit' })

// Webserver-ZIP mit config.js ohne admintoolVisible
console.log('Erstelle Webserver-ZIP...')
await mkdir(releaseDir, { recursive: true })

function collectFiles(dir, base = '') {
  const entries = {}
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const relative = base ? `${base}/${name}` : name
    if (statSync(full).isDirectory()) {
      Object.assign(entries, collectFiles(full, relative))
    } else {
      entries[relative] = readFileSync(full)
    }
  }
  return entries
}

const webserverFiles = collectFiles(distDir)
const zipped = zipSync(webserverFiles)
await writeFile(path.join(releaseDir, zipName), zipped)
console.log(`  → release/${zipName}`)

// Node.js-Server-ZIP mit server.js + package-Dateien für npm install
console.log('Erstelle Node-Server-ZIP...')
const serverZipName = `gradehub-${version}-node-server.zip`
const serverFiles = {
  ...webserverFiles,
  'server.js': readFileSync('./server.js'),
  'package.json': readFileSync('./package.json'),
  'package-lock.json': readFileSync('./package-lock.json'),
}
const serverZipped = zipSync(serverFiles)
await writeFile(path.join(releaseDir, serverZipName), serverZipped)
console.log(`  → release/${serverZipName}`)

// Für die Electron-App admintoolVisible aktivieren
console.log('Aktiviere admintoolVisible für Electron-Build...')
await writeFile(path.join(distDir, 'config.js'), CONFIG_ELECTRON, 'utf8')

console.log('Baue Electron-App (Linux AppImage + Windows NSIS)...')
execSync('npx electron-builder --linux AppImage --win nsis --publish never', { stdio: 'inherit' })

// dist/config.js auf Webserver-Stand zurücksetzen
await writeFile(path.join(distDir, 'config.js'), CONFIG_WEBSERVER, 'utf8')

console.log('\nBuild abgeschlossen:')
console.log(`  release/${zipName}          (statische Dateien für Webserver/Jetty)`)
console.log(`  release/${serverZipName}  (Node.js-Server mit E-Mail-Funktion)`)
console.log(`  release/SVWS-GradeHub-${version}.AppImage`)
console.log(`  release/SVWS-GradeHub-Setup-${version}.exe`)

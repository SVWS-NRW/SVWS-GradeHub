# SVWS-GradeHub

Browserbasiertes Notenmodul für Lehrkräfte mit SVWS-Anbindung. Unterstützt zwei Betriebsmodi: als reine Offline-App (`file://`) und als Serveranwendung mit E-Mail-Versand.

> Dieses Dokument richtet sich an Entwickler und Administratoren. Eine Benutzeranleitung für Lehrkräfte befindet sich unter `docs/`.

---

## Betriebsmodi

### Offline-Modus (`file://`)

Die App läuft vollständig im Browser ohne eigenes Backend. Lehrkräfte öffnen `dist/index.html` direkt. Der Bereich „Vom SVWS-Server laden" wird über `config.js` gesteuert (siehe [Laufzeit-Konfiguration](#laufzeit-konfiguration)).

### Server-Modus (`http://` / `https://`)

Mit dem enthaltenen `server.js` (Express) werden zusätzlich API-Endpunkte bereitgestellt:

- `POST /api/mail/test` — SMTP-Verbindung testen
- `POST /api/mail/send` — verschlüsselte Notendatei per E-Mail versenden

Im Server-Modus erscheint im Admin-Bereich der Button **Dateien versenden**.

### Electron-Desktop-App

Die App kann als native Desktop-Anwendung gebaut und ausgeliefert werden. Electron lädt den Offline-Build (`dist/`) und erweitert ihn um:

- **CORS-Workaround**: Der SVWS-Server sendet `Access-Control-Allow-Origin: *` zusammen mit `Access-Control-Allow-Credentials: true` — laut CORS-Spezifikation ungültig. Der Electron-Hauptprozess (`electron/main.cjs`) ersetzt den Wildcard zur Laufzeit durch die tatsächliche Anfrage-Origin.
- **Selbstsignierte Zertifikate**: SVWS-Server nutzen oft selbstsignierte TLS-Zertifikate. Die Electron-App akzeptiert diese automatisch.
- **Admin-Modus aktiv**: `admintoolVisible` ist in der Electron-App immer auf `true` gesetzt.
- **Zoom**: `Strg++` / `Strg+-` / `Strg+0` steuern den Zoom-Level.

---

## Technologie-Stack

**Frontend**
- Vue 3 (Composition API) + TypeScript (strict)
- Vite, Pinia, Vue Router (Hash Mode)
- fflate (ZIP/gzip), jsPDF, Web Crypto API (AES-256-GCM, RSA-OAEP)

**Backend** (nur Server-Modus)
- Node.js + Express 5
- Nodemailer

**Entwicklung**
- Vitest, ESLint, concurrently

---

## Projektstruktur

```
├── src/
│   ├── components/     — wiederverwendbare Vue-Komponenten
│   ├── router/         — Hash-basiertes Routing
│   ├── stores/         — Pinia-Stores (ENM, Änderungen, Auth, UI)
│   ├── types/          — TypeScript-Typen für ENM und Änderungsmodelle
│   └── views/          — Seiten (Start, Lerngruppen, Notenerfassung, Admin)
├── public/
│   └── config.js       — Laufzeit-Konfiguration (wird nach dist/ kopiert)
├── data/               — Beispiel- und Testdaten
├── docs/               — Projektdokumentation und ADRs
├── electron/
│   └── main.cjs        — Electron-Hauptprozess (CORS-Fix, Zoom, Menü)
├── scripts/
│   ├── release.mjs     — Release-Skript (alle Artefakte auf einmal)
│   └── write-electron-config.mjs — Schreibt Electron-config.js nach dist/
├── server.js           — Express-Backend für E-Mail-Versand
├── vite.config.ts      — Vite-Konfiguration (Webserver-Build)
├── vite.offline.config.ts — Vite-Konfiguration (Offline-Build, IIFE)
├── .env                — Lokale Konfiguration (nicht im Repository)
└── .env.example        — Vorlage für .env
```

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js ≥ 20
- npm

### Setup

```bash
npm install
```

Konfigurationsdatei anlegen (optional):

```bash
cp .env.example .env
```

### Entwicklungsserver starten

**Nur Frontend** (kein E-Mail-Versand):
```bash
npm run dev
```

**Frontend + Backend** (mit E-Mail-Versand):
```bash
npm run dev:full
```

Vite läuft auf Port 5173, das Backend auf Port 3000. `/api`-Anfragen werden automatisch weitergeleitet.

### Weitere Befehle

| Befehl | Beschreibung |
|---|---|
| `npm run build` | Offline-Build (IIFE, `file://`-kompatibel) |
| `npm run build:web` | Webserver-Build (ES-Module) |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run test` | Unit-Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run preview` | Build-Vorschau |
| `npm run electron:dev` | Electron-App lokal starten (Linux, erfordert vorherigen Build) |
| `npm run electron:build` | Electron-Installer für die aktuelle Plattform bauen |
| `npm run release` | Alle Release-Artefakte in einem Schritt erzeugen (siehe unten) |

---

## Release

```bash
npm run release
```

Das Skript `scripts/release.mjs` erzeugt alle Artefakte in einem Schritt:

1. `release/`-Verzeichnis bereinigen
2. Offline-Build erstellen (`npm run build`)
3. Webserver-ZIP packen (mit deaktiviertem Admin-Modus in `config.js`)
4. `dist/config.js` auf Electron-Stand setzen (`admintoolVisible: true`)
5. Electron-Installer für Linux und Windows bauen (`electron-builder`)
6. `dist/config.js` zurücksetzen

Erzeugte Artefakte im Ordner `release/`:

| Datei | Beschreibung |
|---|---|
| `gradehub-{version}-webserver.zip` | Webserver-Bundle (dist + server.js + package.json) |
| `gradehub-{version}.AppImage` | Linux Desktop-App (ausführbar, kein Setup nötig) |
| `SVWS-GradeHub-Setup-{version}.exe` | Windows-Installer (NSIS) |

> `npm run electron:build` baut nur den Installer für die **aktuelle Plattform**. Für Cross-Plattform-Builds (z. B. Windows-EXE auf Linux) wird `wine` benötigt oder ein CI-System empfohlen.

---

## Laufzeit-Konfiguration

### `public/config.js`

Wird von Vite nach `dist/config.js` kopiert und zur Laufzeit geladen — funktioniert auch mit `file://`. Die Datei kann nach dem Build bearbeitet werden, ohne neu zu bauen.

```js
window.GRADEHUB_CONFIG = {
  // admintoolVisible: true,  // Auskommentiert = .env wird ausgewertet (nur Dev)
}
```

- `admintoolVisible: true` → Bereich „Vom SVWS-Server laden" sichtbar (Admin-Modus)
- `admintoolVisible: false` → ausgeblendet (Lehrkraft-Modus)
- Auskommentiert im Build → immer `false`; im Dev-Server → Wert aus `.env`

### `.env`

Nur zur Build-Zeit und im Dev-Server ausgewertet. Vorlage: `.env.example`.

```env
SVWSSERVER_HOST=localhost
SVWSSERVER_PORT=8443
SVWSSERVER_SCHEMA=svwsdb
SVWSSERVER_USER=Admin
SVWSSERVER_PASSWORD=

# Auf false setzen, um den Bereich "Vom SVWS-Server laden" auszublenden
ADMINTOOL_VISIBLE=false
```

---

## Admin-Bereich

Der Admin-Bereich (`/admin`) ist für Schulleitungen und Notenkoordinatoren gedacht. Er ermöglicht:

- Lehrerliste mit Notenpasswörtern und dienstlichen E-Mail-Adressen (aus `/db/{schema}/lehrer/{id}/stammdaten`)
- Generierung und Verwaltung von RSA-Schlüsselpaaren
- Erstellung verschlüsselter Notendateien (AES-256-GCM, `.enc.json`)
- Versand der Dateien per E-Mail (nur im Server-Modus)
- Speichern und Laden der Admin-Konfiguration (`.ghb`, verschlüsselt)

Die SMTP-Konfiguration wird verschlüsselt in der `.ghb`-Datei gespeichert.

---

## SVWS-API-Endpunkte

| Methode | Pfad | Verwendung |
|---|---|---|
| GET | `/db/{schema}/lehrer` | Lehrerliste laden |
| GET | `/db/{schema}/lehrer/{id}/stammdaten` | Dienstliche E-Mail-Adresse |
| GET | `/db/{schema}/enm/v2/lehrer/{id}/{funktion}` | ENM-Daten einer Lehrkraft; `funktion`: 1 Fachlehrer (Standard), 2 Klassenleitung, 3 Abteilungsleitung, 4 Schulleitung, 5 Notenmoduladmin |
| POST | `/db/{schema}/enm/v2/import` | Noten zurückschreiben |

Authentifizierung: Basic Auth (`Authorization: Basic <base64(user:pass)>`).

---

## Installation auf einem Server

### Voraussetzungen

- Node.js ≥ 20 auf dem Server
- Schreibzugriff auf einen SMTP-Server

### Build erstellen

```bash
npm run build:web
```

### Dateien auf den Server übertragen

Folgende Dateien werden benötigt (kein `node_modules`):

```
dist/
server.js
package.json
package-lock.json
```

### Auf dem Server einrichten

```bash
npm install --omit=dev
```

### Server starten

```bash
node server.js
```

oder mit dem npm-Skript:

```bash
npm start
```

Der Server läuft standardmäßig auf Port 3000. Der Port kann über die Umgebungsvariable `PORT` geändert werden:

```bash
PORT=8080 node server.js
```

`server.js` liefert die `dist/`-Dateien aus und stellt die `/api`-Endpunkte bereit — kein separater Webserver nötig.

### Dauerhafter Betrieb (empfohlen)

Für den produktiven Betrieb empfiehlt sich ein Prozessmanager:

```bash
npm install -g pm2
pm2 start server.js --name gradehub
pm2 save
pm2 startup
```

### Reverse Proxy (optional)

Wenn der Server hinter nginx oder Apache betrieben wird:

**nginx:**
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
}
```

---

## Architekturprinzipien

- ENM-Originaldaten werden nicht mutiert — alle Änderungen landen im Pinia-Change-Store
- Verschlüsselung ausschließlich über die native Web Crypto API (kein externes Crypto-Framework)
- Der Offline-Build erzeugt ein IIFE-Bundle, das ohne ES-Module-Support (`file://`) läuft
- `config.js` ermöglicht Laufzeit-Konfiguration ohne Rebuild
- Das Backend hält keine Sitzungen und keinen Zustand — alle Nutzdaten kommen aus dem Frontend

---

## Lizenz

[BSD 3-Clause License](LICENSE)

## Weitere Dokumentation

- `docs/adr/` — Architekturentscheidungen (ADRs)
- `docs/` — Benutzeranleitung (in Vorbereitung)

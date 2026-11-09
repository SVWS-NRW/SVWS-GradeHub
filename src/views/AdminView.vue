<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useChangeStore } from '@/stores/changeStore'
import { useENMStore } from '@/stores/enmStore'
import { useUIStore } from '@/stores/uiStore'
import { useSchluessel } from '@/composables/useSchluessel'
import { useSmtp } from '@/composables/useSmtp'
import { useTeacherAdmin } from '@/composables/useTeacherAdmin'
import { useKonfiguration } from '@/composables/useKonfiguration'
import { useVersand } from '@/composables/useVersand'
import { useImport } from '@/composables/useImport'

const authStore = useAuthStore()
const changeStore = useChangeStore()
const enmStore = useENMStore()
const uiStore = useUIStore()
const router = useRouter()
const { themePreference } = storeToRefs(uiStore)

const mailServerUrl = ((window as Window & { GRADEHUB_CONFIG?: { mailServerUrl?: string } }).GRADEHUB_CONFIG?.mailServerUrl ?? '').replace(/\/$/, '')

const läuftAufServer = ref<boolean>(false)
const kannAnSVWSServerSenden = computed<boolean>(() =>
  authStore.baseUrl.trim() !== '' && authStore.schema.trim() !== '',
)

const {
  schluesselModalOffen,
  schluesselGeneriert,
  schluesselGenerierenLaeuft,
  schluesselFehler,
  schluesselNachfrageOffen,
  oeffentlicherSchluesselPem,
  privaterSchluesselPem,
  generiereSchluessel,
  schliesseSchluesselModal,
  schliesseSchluesselModalOhneSpeichern,
  markiereSchluesselGesichert,
  fuehreSchluesselGenerierungDurch,
} = useSchluessel()

const {
  smtpModalOffen,
  smtpFehler,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPassword,
  smtpFrom,
  smtpTls,
  smtpTestLaeuft,
  smtpTestErfolg,
  smtpTestMeldung,
  oeffneSmtpModal,
  schliesseSmtpModal,
  speichereSmtpKonfiguration,
  testeSmtpVerbindung,
} = useSmtp(mailServerUrl)

const {
  lehrer,
  ausgewaehlt,
  nurAktive,
  isLoading,
  errorMessage,
  sichtbareLehrer,
  alleAusgewaehlt,
  ladeLehrerListe,
  ladeENMJsonFuerLehrer,
  toggleAuswahl,
  toggleAlle,
  generierePasswoerterFuerAuswahl,
  kopiereNotenpasswort,
  druckePasswortStreifen,
  erzeugeDateienFuerAuswahl: _erzeugeDateienFuerAuswahl,
  erzeugeDateienUnverschluesseltFuerAuswahl: _erzeugeDateienUnverschluesseltFuerAuswahl,
  spaltenStil,
  onResizeEnd,
  starteResize,
} = useTeacherAdmin(authStore)

const erzeugeModalOffen = ref(false)

function erzeugeeDateien(): void {
  erzeugeModalOffen.value = true
}

function speichernNachSchluessel(): void {
  schliesseSchluesselModalOhneSpeichern()
  speichern()
}

function erzeugeVerschluesselt(): void {
  erzeugeModalOffen.value = false
  void _erzeugeDateienFuerAuswahl(oeffentlicherSchluesselPem.value)
}

function erzeugeUnverschluesselt(): void {
  erzeugeModalOffen.value = false
  void _erzeugeDateienUnverschluesseltFuerAuswahl()
}

const {
  konfigKennwort,
  speichernModalOffen,
  speichernKennwort,
  speichernKennwortBestaetigung,
  speichernFehler,
  kennwoerterUngleich,
  speichernLaeuft,
  ladenModalOffen,
  ladenKennwort,
  ladenFehler,
  ladenLaeuft,
  ladenDateiName,
  serverKonfigVorhanden,
  ladenVomServerLaeuft,
  speichern,
  schliesseSpeichernModal,
  fuehreSpeichernDurch,
  fuehreServerSpeichernDurch,
  laden,
  pruefeServerKonfiguration,
  schliesseLadenModal,
  onLadenDateiGewaehlt,
  fuehreLadenDurch,
  fuehreServerLabenDurch,
} = useKonfiguration({
  lehrer,
  oeffentlicherSchluesselPem,
  privaterSchluesselPem,
  schluesselGeneriert,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPassword,
  smtpFrom,
  smtpTls,
  kannAnSVWSServerSenden,
  authStore,
  onGespeichert: markiereSchluesselGesichert,
})

const {
  versandModalOffen,
  versandErgebnisse,
  versandLaeuft,
  versandFortschritt,
  versandGesamt,
  schliesseVersandModal,
  versendeDateienFuerAuswahl,
} = useVersand({
  lehrer,
  ausgewaehlt,
  oeffentlicherSchluesselPem,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPassword,
  smtpFrom,
  smtpTls,
  isLoading,
  errorMessage,
  ladeENMJsonFuerLehrer,
  mailServerUrl,
})

const {
  importModalOffen,
  importEintraege,
  importLaeuft,
  importAllesendenLaeuft,
  importErfolgreicheAnzahl,
  oeffneImportModal,
  schliesseImportModal,
  resetImport,
  importStatusText,
  importEintragKlasse,
  waehleImportOrdner,
  onImportDateienGewaehlt,
  verarbeiteEintragNochmal,
  sendeEintragAnServer,
  sendeAlleAnServer,
} = useImport({
  lehrer,
  sichtbareLehrer,
  kannAnSVWSServerSenden,
  errorMessage,
  authStore,
})

function logout(): void {
  changeStore.reset()
  enmStore.reset()
  authStore.clear()
  konfigKennwort.value = ''
  router.push('/')
}

import type { ThemePreference } from '@/stores/uiStore'

const themeAriaLabel = computed<string>(() => {
  if (themePreference.value === 'light') return 'Theme: Hell – klicken zum Wechseln'
  if (themePreference.value === 'dark') return 'Theme: Dunkel – klicken zum Wechseln'
  return 'Theme: System – klicken zum Wechseln'
})

function toggleTheme(): void {
  const next: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }
  uiStore.setThemePreference(next[themePreference.value])
}

async function pruefeBackendVerfuegbar(): Promise<void> {
  try {
    const response = await fetch(`${mailServerUrl}/api/health`, { signal: AbortSignal.timeout(3000) })
    läuftAufServer.value = response.ok
  } catch {
    läuftAufServer.value = false
  }
}

onMounted(() => {
  void ladeLehrerListe()
  void pruefeServerKonfiguration()
  void pruefeBackendVerfuegbar()
})

onUnmounted(() => {
  onResizeEnd()
})
</script>

<template>
  <main class="admin-view">
    <div class="page-header">
      <h1>Notendatei Adminbereich</h1>
      <button
        class="theme-toggle"
        type="button"
        :aria-label="themeAriaLabel"
        :title="themeAriaLabel"
        @click="toggleTheme"
      >
        <svg
          v-if="themePreference === 'light'"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="5"
          />
          <line
            x1="12"
            y1="1"
            x2="12"
            y2="3"
          />
          <line
            x1="12"
            y1="21"
            x2="12"
            y2="23"
          />
          <line
            x1="4.22"
            y1="4.22"
            x2="5.64"
            y2="5.64"
          />
          <line
            x1="18.36"
            y1="18.36"
            x2="19.78"
            y2="19.78"
          />
          <line
            x1="1"
            y1="12"
            x2="3"
            y2="12"
          />
          <line
            x1="21"
            y1="12"
            x2="23"
            y2="12"
          />
          <line
            x1="4.22"
            y1="19.78"
            x2="5.64"
            y2="18.36"
          />
          <line
            x1="18.36"
            y1="5.64"
            x2="19.78"
            y2="4.22"
          />
        </svg>
        <svg
          v-else-if="themePreference === 'dark'"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="3"
            width="20"
            height="14"
            rx="2"
            ry="2"
          />
          <line
            x1="8"
            y1="21"
            x2="16"
            y2="21"
          />
          <line
            x1="12"
            y1="17"
            x2="12"
            y2="21"
          />
        </svg>
      </button>
    </div>

    <p
      v-if="isLoading"
      class="status"
    >
      Lehrkräfte werden geladen…
    </p>
    <p
      v-if="errorMessage"
      class="error"
    >
      {{ errorMessage }}
    </p>

    <section
      v-if="lehrer.length > 0"
      class="card"
    >
      <div class="table-header">
        <div class="table-header-left">
          <h2>Lehrkräfte ({{ sichtbareLehrer.length }})</h2>
          <button
            class="btn-generate"
            :class="{ 'btn-generate--aktiv': schluesselGeneriert }"
            type="button"
            @click="generiereSchluessel"
          >
            {{ oeffentlicherSchluesselPem ? 'Schlüssel anzeigen' : 'Schlüssel generieren' }}
          </button>
          <button
            class="btn-generate"
            type="button"
            :disabled="ausgewaehlt.size === 0"
            @click="generierePasswoerterFuerAuswahl"
          >
            Passwörter generieren
          </button>
          <button
            class="btn-generate"
            type="button"
            :disabled="ausgewaehlt.size === 0"
            @click="druckePasswortStreifen"
          >
            Drucken (Auswahl)
          </button>
          <button
            class="btn-generate"
            type="button"
            :disabled="ausgewaehlt.size === 0"
            @click="erzeugeeDateien"
          >
            Dateien erzeugen
          </button>
          <button
            class="btn-generate"
            type="button"
            @click="oeffneImportModal"
          >
            Dateien importieren
          </button>
          <button
            v-if="läuftAufServer"
            class="btn-generate"
            type="button"
            :disabled="ausgewaehlt.size === 0 || versandLaeuft"
            @click="versendeDateienFuerAuswahl"
          >
            Dateien versenden
          </button>
          <button
            v-if="läuftAufServer"
            class="btn-generate"
            type="button"
            @click="oeffneSmtpModal"
          >
            E-Mail-Server
          </button>
          <button
            class="btn-generate"
            type="button"
            @click="speichern"
          >
            Speichern
          </button>
          <button
            class="btn-generate"
            type="button"
            @click="laden"
          >
            Laden
          </button>
        </div>
        <div class="table-header-actions">
          <label class="toggle-label">
            <input
              v-model="nurAktive"
              type="checkbox"
            >
            Nur aktive anzeigen
          </label>
          <button
            class="btn-logout"
            type="button"
            @click="logout"
          >
            Abmelden
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <colgroup>
            <col class="col-check">
            <col :style="spaltenStil('kuerzel')">
            <col :style="spaltenStil('name')">
            <col :style="spaltenStil('email')">
            <col :style="spaltenStil('passwort')">
          </colgroup>
          <thead>
            <tr>
              <th class="col-check">
                <input
                  type="checkbox"
                  :checked="alleAusgewaehlt"
                  aria-label="Alle auswählen"
                  @change="toggleAlle"
                >
              </th>
              <th class="col-kuerzel">
                Kürzel
                <span
                  class="resize-handle"
                  @mousedown="starteResize('kuerzel', $event)"
                />
              </th>
              <th class="col-name">
                Name, Vorname
                <span
                  class="resize-handle"
                  @mousedown="starteResize('name', $event)"
                />
              </th>
              <th class="col-email">
                E-Mail (dienstlich)
                <span
                  class="resize-handle"
                  @mousedown="starteResize('email', $event)"
                />
              </th>
              <th class="col-passwort">
                Notenpasswort
                <span
                  class="resize-handle"
                  @mousedown="starteResize('passwort', $event)"
                />
              </th>
            </tr>
          </thead>
          <tfoot>
            <tr>
              <td
                colspan="5"
                class="tfoot-cell"
              >
                <span v-if="ausgewaehlt.size > 0">
                  {{ ausgewaehlt.size }} Lehrkraft{{ ausgewaehlt.size !== 1 ? 'kräfte' : '' }} ausgewählt
                </span>
                <span
                  v-else
                  class="tfoot-empty"
                >Keine Auswahl</span>
              </td>
            </tr>
          </tfoot>
          <tbody>
            <tr
              v-for="l in sichtbareLehrer"
              :key="l.id"
              :class="{ 'is-selected': ausgewaehlt.has(l.id) }"
              @click="toggleAuswahl(l.id)"
            >
              <td class="col-check">
                <input
                  type="checkbox"
                  :checked="ausgewaehlt.has(l.id)"
                  @click.stop
                  @change="toggleAuswahl(l.id)"
                >
              </td>
              <td class="col-kuerzel">
                {{ l.kuerzel }}
              </td>
              <td class="col-name">
                {{ l.nachname }}, {{ l.vorname }}
              </td>
              <td class="col-email">
                {{ l.emailDienstlich }}
              </td>
              <td class="col-passwort">
                <div class="col-passwort-inhalt">
                  <span class="passwort-text">{{ l.notenpasswort || '-' }}</span>
                  <button
                    v-if="l.notenpasswort"
                    class="copy-passwort-btn"
                    type="button"
                    title="Notenpasswort kopieren"
                    aria-label="Notenpasswort kopieren"
                    @click.stop="kopiereNotenpasswort(l.notenpasswort)"
                  >
                    ⎘
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Erzeugen-Modal -->
    <div
      v-if="erzeugeModalOffen"
      class="modal-backdrop"
      @click.self="erzeugeModalOffen = false"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="erzeugen-modal-title"
      >
        <div class="modal-header">
          <h2 id="erzeugen-modal-title">
            Dateien erzeugen
          </h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Schließen"
            @click="erzeugeModalOffen = false"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-meta">
            {{ ausgewaehlt.size }} Lehrkraft{{ ausgewaehlt.size !== 1 ? 'kräfte' : '' }} ausgewählt
          </p>
          <div class="erzeugen-optionen">
            <button
              class="btn-generate erzeugen-option"
              type="button"
              @click="erzeugeVerschluesselt"
            >
              <span class="erzeugen-option-titel">Verschlüsselte Dateien erzeugen</span>
              <span class="erzeugen-option-anzahl">{{ ausgewaehlt.size }} Datei{{ ausgewaehlt.size !== 1 ? 'en' : '' }}</span>
            </button>
            <button
              class="btn-generate erzeugen-option"
              type="button"
              @click="erzeugeUnverschluesselt"
            >
              <span class="erzeugen-option-titel">Unverschlüsselte Dateien erzeugen</span>
              <span class="erzeugen-option-anzahl">{{ ausgewaehlt.size }} Datei{{ ausgewaehlt.size !== 1 ? 'en' : '' }}</span>
              <span class="erzeugen-option-warnung">Nur für den Gebrauch in einem gesicherten Intranet mit verschlüsselter Kommunikation!</span>
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-generate"
            type="button"
            @click="erzeugeModalOffen = false"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Schlüssel-Modal -->
    <div
      v-if="schluesselModalOffen"
      class="modal-backdrop"
      @click.self="schliesseSchluesselModal"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schluessel-modal-title"
      >
        <div class="modal-header">
          <h2 id="schluessel-modal-title">
            Schlüsselpaar generieren
          </h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Schließen"
            @click="schliesseSchluesselModal"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-meta">
            Algorithmus: RSA-OAEP · SHA-256 · 4096 Bit
          </p>

          <p
            v-if="schluesselFehler"
            class="error"
          >
            {{ schluesselFehler }}
          </p>

          <div
            v-if="!schluesselGeneriert"
            class="modal-action-row"
          >
            <button
              class="btn-generate"
              type="button"
              :disabled="schluesselGenerierenLaeuft"
              @click="fuehreSchluesselGenerierungDurch"
            >
              {{ schluesselGenerierenLaeuft ? 'Wird erzeugt…' : 'Schlüsselpaar erzeugen' }}
            </button>
          </div>

          <div
            v-else
            class="modal-success"
          >
            <span class="modal-success-icon">✓</span>
            Schlüsselpaar wurde erfolgreich erzeugt.
          </div>

          <div
            v-if="oeffentlicherSchluesselPem"
            class="modal-key-block"
          >
            <label
              for="schluessel-pem-output"
              class="modal-key-label"
            >Öffentlicher Schlüssel</label>
            <textarea
              id="schluessel-pem-output"
              class="modal-key-textarea"
              readonly
              :value="oeffentlicherSchluesselPem"
            />
          </div>

          <div
            v-if="privaterSchluesselPem"
            class="modal-key-block"
          >
            <label
              for="schluessel-priv-output"
              class="modal-key-label modal-key-label--privat"
            >Privater Schlüssel <span class="modal-key-warn">(geheim halten!)</span></label>
            <textarea
              id="schluessel-priv-output"
              class="modal-key-textarea"
              readonly
              :value="privaterSchluesselPem"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-generate"
            type="button"
            @click="schliesseSchluesselModal"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>

    <!-- Nachfrage: Schlüssel nicht gesichert -->
    <div
      v-if="schluesselNachfrageOffen"
      class="modal-backdrop"
    >
      <div
        class="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="schluessel-nachfrage-title"
      >
        <div class="modal-header">
          <h2 id="schluessel-nachfrage-title">
            Konfiguration speichern?
          </h2>
        </div>
        <div class="modal-body">
          <p class="error">
            Das Schlüsselpaar und die Notenpasswörter sind noch nicht gespeichert.
            Gehen sie verloren, können bereits verschlüsselte Dateien nicht mehr entschlüsselt werden.
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="btn-generate"
            type="button"
            @click="schluesselNachfrageOffen = false"
          >
            Zurück
          </button>
          <button
            class="btn-generate"
            type="button"
            @click="schliesseSchluesselModalOhneSpeichern"
          >
            Ohne Speichern schließen
          </button>
          <button
            class="btn-generate btn-generate--aktiv"
            type="button"
            @click="speichernNachSchluessel"
          >
            Jetzt speichern
          </button>
        </div>
      </div>
    </div>

    <!-- Speichern-Modal -->
    <div
      v-if="speichernModalOffen"
      class="modal-backdrop"
      @click.self="schliesseSpeichernModal"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="speichern-modal-title"
      >
        <div class="modal-header">
          <h2 id="speichern-modal-title">
            Konfiguration speichern
          </h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Schließen"
            @click="schliesseSpeichernModal"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-meta">
            Die Daten werden mit AES-256-GCM verschlüsselt. Auf dem SVWS-Server gespeicherte Konfiguration kann von jedem Gerät geladen werden.
          </p>
          <p
            v-if="speichernFehler"
            class="error"
          >
            {{ speichernFehler }}
          </p>
          <label
            class="modal-form-label"
            for="speichern-pw"
          >Kennwort</label>
          <input
            id="speichern-pw"
            v-model="speichernKennwort"
            class="modal-input"
            type="password"
            autocomplete="new-password"
            placeholder="Mindestens 8 Zeichen"
            @keydown.enter="speichernLaeuft || kennwoerterUngleich || (kannAnSVWSServerSenden ? fuehreServerSpeichernDurch() : fuehreSpeichernDurch())"
          >
          <label
            class="modal-form-label"
            for="speichern-pw2"
          >Kennwort bestätigen</label>
          <input
            id="speichern-pw2"
            v-model="speichernKennwortBestaetigung"
            class="modal-input"
            type="password"
            autocomplete="new-password"
            placeholder="Kennwort wiederholen"
            @keydown.enter="speichernLaeuft || kennwoerterUngleich || (kannAnSVWSServerSenden ? fuehreServerSpeichernDurch() : fuehreSpeichernDurch())"
          >
          <p
            v-if="kennwoerterUngleich"
            class="error"
          >
            Die Kennwörter stimmen nicht überein.
          </p>
        </div>
        <div class="modal-footer">
          <button
            class="btn-generate"
            type="button"
            @click="schliesseSpeichernModal"
          >
            Abbrechen
          </button>
          <button
            class="btn-generate"
            type="button"
            :disabled="speichernLaeuft || kennwoerterUngleich"
            @click="fuehreSpeichernDurch"
          >
            {{ speichernLaeuft ? 'Wird gespeichert…' : 'Als Datei herunterladen' }}
          </button>
          <button
            v-if="kannAnSVWSServerSenden"
            class="btn-generate btn-generate--aktiv"
            type="button"
            :disabled="speichernLaeuft || kennwoerterUngleich"
            @click="fuehreServerSpeichernDurch"
          >
            {{ speichernLaeuft ? 'Wird gespeichert…' : 'Auf Server speichern' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Laden-Modal -->
    <div
      v-if="ladenModalOffen"
      class="modal-backdrop"
      @click.self="schliesseLadenModal"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="laden-modal-title"
      >
        <div class="modal-header">
          <h2 id="laden-modal-title">
            Konfiguration laden
          </h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Schließen"
            @click="schliesseLadenModal"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-meta">
            Konfiguration vom SVWS-Server oder aus einer Sicherungsdatei (.ghb) laden.
          </p>
          <div
            v-if="serverKonfigVorhanden"
            class="modal-server-hinweis"
          >
            Gespeicherte Konfiguration auf dem Server gefunden — Kennwort eingeben und „Vom Server laden" klicken.
          </div>
          <p
            v-if="ladenFehler"
            class="error"
          >
            {{ ladenFehler }}
          </p>
          <label
            class="modal-form-label"
            for="laden-datei"
          >Datei</label>
          <div class="modal-file-row">
            <label
              class="btn-generate modal-file-label"
              for="laden-datei"
            >Datei wählen…</label>
            <span class="modal-file-name">{{ ladenDateiName || 'Keine Datei ausgewählt' }}</span>
          </div>
          <input
            id="laden-datei"
            class="modal-file-input"
            type="file"
            accept=".ghb,application/json"
            @change="onLadenDateiGewaehlt"
          >
          <label
            class="modal-form-label"
            for="laden-pw"
          >Kennwort</label>
          <input
            id="laden-pw"
            v-model="ladenKennwort"
            class="modal-input"
            type="password"
            autocomplete="current-password"
            placeholder="Kennwort eingeben"
            @keydown.enter="(ladenLaeuft || ladenVomServerLaeuft) || (kannAnSVWSServerSenden && serverKonfigVorhanden ? fuehreServerLabenDurch() : fuehreLadenDurch())"
          >
        </div>
        <div class="modal-footer">
          <button
            class="btn-generate"
            type="button"
            @click="schliesseLadenModal"
          >
            Abbrechen
          </button>
          <button
            class="btn-generate"
            type="button"
            :disabled="ladenLaeuft || ladenVomServerLaeuft"
            @click="fuehreLadenDurch"
          >
            {{ ladenLaeuft ? 'Wird geladen…' : 'Aus Datei laden' }}
          </button>
          <button
            v-if="kannAnSVWSServerSenden"
            class="btn-generate btn-generate--aktiv"
            type="button"
            :disabled="ladenLaeuft || ladenVomServerLaeuft || !serverKonfigVorhanden"
            @click="fuehreServerLabenDurch"
          >
            {{ ladenVomServerLaeuft ? 'Wird geladen…' : 'Vom Server laden' }}
          </button>
        </div>
      </div>
    </div>
    <!-- Versand-Modal -->
    <div
      v-if="versandModalOffen"
      class="modal-backdrop"
      @click.self="schliesseVersandModal"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="versand-modal-title"
      >
        <div class="modal-header">
          <h2 id="versand-modal-title">
            Dateien versenden
          </h2>
          <button
            class="modal-close"
            type="button"
            :disabled="versandLaeuft"
            aria-label="Schließen"
            @click="schliesseVersandModal"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-meta">
            <template v-if="versandLaeuft">
              {{ versandFortschritt }} / {{ versandGesamt }} wird versendet…
            </template>
            <template v-else>
              {{ versandErgebnisse.filter(e => e.erfolg).length }} von {{ versandGesamt }} erfolgreich gesendet.
            </template>
          </p>
          <div class="versand-liste">
            <div
              v-for="ergebnis in versandErgebnisse"
              :key="ergebnis.kuerzel"
              class="versand-eintrag"
              :class="ergebnis.erfolg ? 'versand-ok' : 'versand-fehler'"
            >
              <span class="versand-kuerzel">{{ ergebnis.kuerzel }}</span>
              <span class="versand-email">{{ ergebnis.email }}</span>
              <span class="versand-meldung">{{ ergebnis.meldung }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-generate btn-generate--aktiv"
            type="button"
            :disabled="versandLaeuft"
            @click="schliesseVersandModal"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>

    <!-- SMTP-Modal -->
    <div
      v-if="smtpModalOffen"
      class="modal-backdrop"
      @click.self="schliesseSmtpModal"
    >
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="smtp-modal-title"
      >
        <div class="modal-header">
          <h2 id="smtp-modal-title">
            E-Mail-Server konfigurieren
          </h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Schließen"
            @click="schliesseSmtpModal"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-meta">
            Die SMTP-Daten werden beim Speichern in der Konfigurationsdatei verschlüsselt abgelegt.
          </p>
          <p
            v-if="smtpFehler"
            class="error"
          >
            {{ smtpFehler }}
          </p>
          <label
            class="modal-form-label"
            for="smtp-host"
          >SMTP-Server</label>
          <input
            id="smtp-host"
            v-model="smtpHost"
            class="modal-input"
            type="text"
            placeholder="mail.schule.de"
            @keydown.enter="speichereSmtpKonfiguration"
          >
          <label
            class="modal-form-label"
            for="smtp-port"
          >Port</label>
          <input
            id="smtp-port"
            v-model="smtpPort"
            class="modal-input"
            type="number"
            placeholder="587"
            @keydown.enter="speichereSmtpKonfiguration"
          >
          <label
            class="modal-form-label"
            for="smtp-user"
          >Benutzername</label>
          <input
            id="smtp-user"
            v-model="smtpUser"
            class="modal-input"
            type="text"
            autocomplete="username"
            placeholder="noten@schule.de"
            @keydown.enter="speichereSmtpKonfiguration"
          >
          <label
            class="modal-form-label"
            for="smtp-password"
          >Passwort</label>
          <input
            id="smtp-password"
            v-model="smtpPassword"
            class="modal-input"
            type="password"
            autocomplete="current-password"
            @keydown.enter="speichereSmtpKonfiguration"
          >
          <label
            class="modal-form-label"
            for="smtp-from"
          >Absenderadresse</label>
          <input
            id="smtp-from"
            v-model="smtpFrom"
            class="modal-input"
            type="email"
            placeholder="noten@schule.de"
            @keydown.enter="speichereSmtpKonfiguration"
          >
          <label class="toggle-label">
            <input
              v-model="smtpTls"
              type="checkbox"
            >
            TLS/STARTTLS verwenden
          </label>
          <div
            v-if="smtpTestErfolg !== null"
            :class="smtpTestErfolg ? 'smtp-test-ok' : 'smtp-test-fehler'"
          >
            {{ smtpTestMeldung }}
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="btn-generate"
            type="button"
            @click="schliesseSmtpModal"
          >
            Abbrechen
          </button>
          <button
            class="btn-generate"
            type="button"
            :disabled="smtpTestLaeuft"
            @click="testeSmtpVerbindung"
          >
            {{ smtpTestLaeuft ? 'Teste…' : 'Verbindung testen' }}
          </button>
          <button
            class="btn-generate btn-generate--aktiv"
            type="button"
            @click="speichereSmtpKonfiguration"
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
    <!-- Import-Modal -->
    <div
      v-if="importModalOffen"
      class="modal-backdrop"
      @click.self="schliesseImportModal"
    >
      <div
        class="modal import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        <div class="modal-header">
          <h2 id="import-modal-title">
            Notendateien importieren
          </h2>
          <button
            class="modal-close"
            type="button"
            aria-label="Schließen"
            @click="schliesseImportModal"
          >
            ✕
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-meta">
            Wählen Sie einen Ordner oder einzelne Dateien mit den Notendateien der Lehrkräfte aus.
            Verschlüsselte Dateien werden automatisch mit den gespeicherten Notenpasswörtern entschlüsselt.
          </p>

          <div
            v-if="importEintraege.length === 0"
            class="import-auswahl-row"
          >
            <button
              class="btn-generate"
              type="button"
              :disabled="importLaeuft"
              @click="waehleImportOrdner"
            >
              Ordner auswählen
            </button>
            <label
              class="btn-generate modal-file-label"
              for="import-dateien"
            >Dateien auswählen…</label>
            <input
              id="import-dateien"
              class="modal-file-input"
              type="file"
              multiple
              accept=".json,.gz,.enc.json"
              @change="onImportDateienGewaehlt"
            >
          </div>

          <p
            v-if="importLaeuft"
            class="modal-meta"
          >
            Wird verarbeitet…
          </p>

          <div
            v-if="importEintraege.length > 0"
            class="import-liste"
          >
            <div
              v-for="eintrag in importEintraege"
              :key="eintrag.id"
              class="import-eintrag"
              :class="importEintragKlasse(eintrag)"
            >
              <div class="import-eintrag-kopf">
                <span
                  class="import-dateiname"
                  :title="eintrag.dateiname"
                >{{ eintrag.dateiname }}</span>
                <span
                  v-if="eintrag.kuerzelErmittelt"
                  class="import-kuerzel"
                >{{ eintrag.kuerzelErmittelt }}</span>
                <span class="import-status-badge">{{ importStatusText(eintrag) }}</span>
              </div>

              <div
                v-if="eintrag.status === 'passwortFehlt' || eintrag.status === 'fehler'"
                class="import-eintrag-aktion"
              >
                <p
                  v-if="eintrag.fehlerText"
                  class="import-fehlertext"
                >
                  {{ eintrag.fehlerText }}
                </p>
                <div
                  v-if="eintrag.istVerschluesselt"
                  class="import-manuell"
                >
                  <select
                    v-model="eintrag.manuellKuerzel"
                    class="import-select"
                  >
                    <option value="">
                      Kürzel zuordnen…
                    </option>
                    <option
                      v-for="l in sichtbareLehrer"
                      :key="l.id"
                      :value="l.kuerzel"
                    >
                      {{ l.kuerzel }} – {{ l.nachname }}, {{ l.vorname }}
                    </option>
                  </select>
                  <input
                    v-model="eintrag.manuellKennwort"
                    type="password"
                    class="import-pw-input"
                    placeholder="Kennwort (falls abweichend)"
                  >
                  <button
                    class="btn-generate"
                    type="button"
                    :disabled="eintrag.verarbeiteLaeuft"
                    @click="verarbeiteEintragNochmal(eintrag)"
                  >
                    {{ eintrag.verarbeiteLaeuft ? 'Wird verarbeitet…' : 'Nochmal versuchen' }}
                  </button>
                </div>
              </div>

              <div
                v-if="eintrag.status === 'ok' && kannAnSVWSServerSenden"
                class="import-eintrag-senden"
              >
                <button
                  class="btn-generate btn-generate--aktiv"
                  type="button"
                  :disabled="eintrag.sendeLaeuft"
                  @click="sendeEintragAnServer(eintrag)"
                >
                  {{ eintrag.sendeLaeuft ? 'Wird gesendet…' : 'An SVWS-Server senden' }}
                </button>
                <span
                  v-if="eintrag.sendeFehler"
                  class="import-fehlertext"
                >{{ eintrag.sendeFehler }}</span>
              </div>

              <div
                v-if="eintrag.status === 'ok' && !kannAnSVWSServerSenden"
                class="import-eintrag-senden"
              >
                <span class="modal-meta">Kein SVWS-Server verbunden – Datei kann nicht übertragen werden.</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            v-if="importEintraege.length > 0"
            class="btn-generate"
            type="button"
            :disabled="importLaeuft || importAllesendenLaeuft"
            @click="resetImport"
          >
            Zurücksetzen
          </button>
          <button
            v-if="importErfolgreicheAnzahl > 0 && kannAnSVWSServerSenden"
            class="btn-generate btn-generate--aktiv"
            type="button"
            :disabled="importAllesendenLaeuft"
            @click="sendeAlleAnServer"
          >
            {{ importAllesendenLaeuft ? 'Wird gesendet…' : `Alle ${importErfolgreicheAnzahl} an Server senden` }}
          </button>
          <button
            class="btn-generate"
            type="button"
            @click="schliesseImportModal"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.admin-view {
  display: grid;
  gap: 1rem;
  max-width: 100%;
  margin: 0 auto;
  padding: 1.5rem 3rem 3rem;
  min-height: 100dvh;
  background-color: var(--color-bg);
}

.card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.75rem;
  padding: 1rem;
  max-height: calc(100dvh - 9rem);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.card h2 {
  margin: 0;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.page-header h1 {
  margin: 0;
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  font: inherit;
  padding: 0.35rem;
  border: 1px solid var(--color-border);
  border-radius: 0.35rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.theme-toggle:hover {
  background: var(--color-surface-hover, var(--color-border));
}

.card-content {
  display: grid;
  gap: 0.75rem;
}

label {
  display: grid;
  gap: 0.35rem;
  color: var(--color-text);
}

input[type='text'],
input[type='url'],
input[type='password'] {
  font: inherit;
  padding: 0.5rem 0.625rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.4rem;
}

.button-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

button {
  font: inherit;
  padding: 0.5rem 0.625rem;
  width: fit-content;
  cursor: pointer;
  color: var(--color-on-primary);
  background: var(--color-primary);
  border: 0;
  border-radius: 0.4rem;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.table-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.table-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-left: auto;
}

.btn-logout {
  font: inherit;
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--color-error-text);
  background: transparent;
  border: 1px solid var(--color-error-text);
  border-radius: 0.4rem;
}

.btn-generate {
  font: inherit;
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  cursor: pointer;
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-primary) 9%, var(--color-surface));
  border: 1px solid var(--color-border);
  border-radius: 0.4rem;
}

.btn-generate:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface));
}

.btn-generate:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-logout:hover {
  background: color-mix(in srgb, var(--color-error-text) 10%, transparent);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  cursor: pointer;
}

.toggle-label input[type='checkbox'] {
  cursor: pointer;
}

.table-wrap {
  overflow: auto;
  min-height: 0;
  max-height: none;
  border: 1px solid var(--color-border);
  border-radius: 0.4rem;
}

table {
  width: 100%;
  min-width: max-content;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.9rem;
}

thead tr {
  background: color-mix(in srgb, var(--color-surface) 80%, var(--color-bg));
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  box-shadow: 0 1px 0 var(--color-border);
}

th {
  position: relative;
  padding: 0.35rem 0.45rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.resize-handle {
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
}

.resize-handle::after {
  content: '';
  position: absolute;
  top: 20%;
  bottom: 20%;
  left: 3px;
  width: 1px;
  background: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
}

td {
  padding: 0.32rem 0.45rem;
  border-bottom: 1px solid var(--color-border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

tbody tr {
  cursor: pointer;
  transition: background 0.1s;
}

tbody tr:hover {
  background: color-mix(in srgb, var(--color-primary) 6%, var(--color-surface));
}

tbody tr.is-selected {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
}

tfoot {
  position: sticky;
  bottom: 0;
  z-index: 2;
}

tfoot tr {
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
}

.tfoot-cell {
  position: sticky;
  bottom: 0;
  z-index: 2;
  padding: 0.35rem 0.45rem;
  font-size: 0.88rem;
  color: var(--color-text);
  font-weight: 600;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  box-shadow: 0 -1px 0 var(--color-border);
}

.tfoot-empty {
  color: var(--color-text-muted);
  font-weight: 400;
}

.col-check {
  width: 2.1rem;
  text-align: left;
}

.col-kuerzel {
  text-align: left;
}

th.col-check,
td.col-check {
  padding-left: 0.45rem;
  padding-right: 0.5rem;
}

th.col-kuerzel,
td.col-kuerzel {
  padding-left: 0.28rem;
}

th.col-check input[type='checkbox'],
td.col-check input[type='checkbox'] {
  margin: 0;
}

.col-passwort {
  text-align: left;
  font-family: 'Noto Sans Mono', 'Courier New', monospace;
}

.col-passwort-inhalt {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.passwort-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-passwort-btn {
  flex: 0 0 auto;
  width: 1.35rem;
  height: 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 0.92rem;
  line-height: 1;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.25rem;
}

.copy-passwort-btn:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
  border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border));
}

.error {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: var(--color-error-text);
  background: color-mix(in srgb, var(--color-error-text) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-error-text) 30%, transparent);
}

.selection-info {
  display: none;
}

/* Schlüssel-Button aktiv (grün) */
.btn-generate--aktiv {
  color: var(--color-success-text);
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
}

.btn-generate--aktiv:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 20%, var(--color-surface));
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}

.modal {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: min(560px, calc(100vw - 2rem));
  max-height: calc(100dvh - 4rem);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.6rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.05rem;
}

.modal-close {
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: 0.35rem;
  cursor: pointer;
  line-height: 1;
}

.modal-close:hover {
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
  color: var(--color-text);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem;
  overflow-y: auto;
}

.modal-meta {
  margin: 0;
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

.modal-action-row {
  display: flex;
  gap: 0.5rem;
}

.modal-success {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.4rem;
  font-size: 0.9rem;
  color: var(--color-success-text);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.modal-success-icon {
  font-weight: 700;
  font-size: 1rem;
}

.modal-key-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.modal-key-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  display: block;
}

.modal-key-label--privat {
  color: #b45309;
}

.modal-key-warn {
  font-weight: 400;
  font-size: 0.8rem;
  color: #b45309;
}

.modal-key-textarea {
  font: 0.78rem/1.5 'Noto Sans Mono', 'Courier New', monospace;
  width: 100%;
  height: 8rem;
  resize: vertical;
  padding: 0.5rem 0.6rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.4rem;
  box-sizing: border-box;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.modal-form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.25rem;
}

.modal-input {
  font: inherit;
  padding: 0.5rem 0.625rem;
  width: 100%;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 0.4rem;
  box-sizing: border-box;
  margin-bottom: 0.75rem;
}

.modal-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.modal-file-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.modal-file-label {
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
}

.modal-file-name {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal-file-input {
  display: none;
}

.versand-liste {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.versand-eintrag {
  display: grid;
  grid-template-columns: 4rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.6rem;
  border-radius: 0.35rem;
  font-size: 0.88rem;
}

.versand-ok {
  color: var(--color-success-text);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.versand-fehler {
  color: var(--color-error-text);
  background: color-mix(in srgb, var(--color-error-text) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-error-text) 30%, transparent);
}

.versand-kuerzel {
  font-weight: 600;
  font-family: 'Noto Sans Mono', 'Courier New', monospace;
}

.versand-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.versand-meldung {
  white-space: nowrap;
}

.import-modal {
  width: min(720px, calc(100vw - 2rem));
  max-height: calc(100dvh - 4rem);
}

.import-auswahl-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.import-liste {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.import-eintrag {
  display: grid;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.4rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  font-size: 0.9rem;
}

.import-ok {
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
  background: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface));
}

.import-gesendet {
  border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
}

.import-fehler {
  border-color: color-mix(in srgb, var(--color-error-text) 35%, transparent);
  background: color-mix(in srgb, var(--color-error-text) 7%, var(--color-surface));
}

.import-warnung {
  border-color: color-mix(in srgb, #b45309 35%, transparent);
  background: color-mix(in srgb, #b45309 7%, var(--color-surface));
}

.import-eintrag-kopf {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.import-dateiname {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Noto Sans Mono', 'Courier New', monospace;
  font-size: 0.85rem;
}

.import-kuerzel {
  flex-shrink: 0;
  font-family: 'Noto Sans Mono', 'Courier New', monospace;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
}

.import-status-badge {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.import-eintrag-aktion {
  display: grid;
  gap: 0.4rem;
}

.import-fehlertext {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-error-text);
}

.import-manuell {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.import-select {
  font: inherit;
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.4rem;
  flex: 1;
  min-width: 0;
}

.import-pw-input {
  font: inherit;
  font-size: 0.85rem;
  padding: 0.3rem 0.5rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.4rem;
  width: 12rem;
}

.import-eintrag-senden {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.modal-server-hinweis {
  padding: 0.6rem 0.8rem;
  border-radius: 0.4rem;
  font-size: 0.88rem;
  color: var(--color-success-text);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.smtp-test-ok,
.smtp-test-fehler {
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;
  font-size: 0.88rem;
}

.smtp-test-ok {
  color: var(--color-success-text);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.smtp-test-fehler {
  color: var(--color-error-text);
  background: color-mix(in srgb, var(--color-error-text) 10%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-error-text) 30%, transparent);
}

.erzeugen-optionen {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.erzeugen-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.65rem 0.9rem;
  width: 100%;
  text-align: left;
}

.erzeugen-option-titel {
  font-weight: 600;
  font-size: 0.9rem;
}

.erzeugen-option-anzahl {
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.erzeugen-option-warnung {
  font-size: 0.82rem;
  color: var(--color-error-text);
  font-weight: 600;
}
</style>

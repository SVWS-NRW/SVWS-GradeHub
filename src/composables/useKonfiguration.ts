import { computed, ref } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { useAuthStore } from '@/stores/authStore'
import type { LehrerEintrag } from '@/types/admin'
import { encodeBasicAuth, aesVerschluesseln, aesEntschluesseln } from '@/utils/crypto'

type AuthStore = ReturnType<typeof useAuthStore>

type KonfigDeps = {
  lehrer: Ref<LehrerEintrag[]>
  oeffentlicherSchluesselPem: Ref<string>
  privaterSchluesselPem: Ref<string>
  schluesselGeneriert: Ref<boolean>
  smtpHost: Ref<string>
  smtpPort: Ref<string>
  smtpUser: Ref<string>
  smtpPassword: Ref<string>
  smtpFrom: Ref<string>
  smtpTls: Ref<boolean>
  kannAnSVWSServerSenden: ComputedRef<boolean>
  authStore: AuthStore
  onGespeichert?: () => void
}

function baueKonfigDaten(deps: KonfigDeps) {
  return {
    schluessel: {
      oeffentlich: deps.oeffentlicherSchluesselPem.value || null,
      privat: deps.privaterSchluesselPem.value || null,
    },
    lehrer: deps.lehrer.value.map((l) => ({ id: l.id, kuerzel: l.kuerzel, notenpasswort: l.notenpasswort })),
    smtp: deps.smtpHost.value.trim() !== '' ? {
      host: deps.smtpHost.value.trim(),
      port: parseInt(deps.smtpPort.value, 10) || 587,
      user: deps.smtpUser.value,
      password: deps.smtpPassword.value,
      from: deps.smtpFrom.value,
      tls: deps.smtpTls.value,
    } : null,
  }
}

type KonfigDaten = {
  schluessel: { oeffentlich: string | null; privat: string | null }
  lehrer: { id: number; kuerzel: string; notenpasswort: string }[]
  smtp?: { host: string; port: number; user: string; password: string; from: string; tls: boolean } | null
}

function wendeKonfigAn(daten: KonfigDaten, deps: KonfigDeps): void {
  deps.oeffentlicherSchluesselPem.value = daten.schluessel.oeffentlich ?? ''
  deps.privaterSchluesselPem.value = daten.schluessel.privat ?? ''
  deps.schluesselGeneriert.value = !!(daten.schluessel.oeffentlich && daten.schluessel.privat)
  const passwortMap = new Map(daten.lehrer.map((l) => [l.id, l.notenpasswort]))
  deps.lehrer.value = deps.lehrer.value.map((l) => ({
    ...l,
    notenpasswort: passwortMap.get(l.id) ?? l.notenpasswort,
  }))
  if (daten.smtp) {
    deps.smtpHost.value = daten.smtp.host
    deps.smtpPort.value = String(daten.smtp.port)
    deps.smtpUser.value = daten.smtp.user
    deps.smtpPassword.value = daten.smtp.password
    deps.smtpFrom.value = daten.smtp.from
    deps.smtpTls.value = daten.smtp.tls
  }
}

export function useKonfiguration(deps: KonfigDeps) {
  const konfigKennwort = ref<string>('')

  const speichernModalOffen = ref<boolean>(false)
  const speichernKennwort = ref<string>('')
  const speichernKennwortBestaetigung = ref<string>('')
  const speichernFehler = ref<string>('')
  const speichernLaeuft = ref<boolean>(false)
  const kennwoerterUngleich = computed<boolean>(() => speichernKennwort.value !== speichernKennwortBestaetigung.value)

  const ladenModalOffen = ref<boolean>(false)
  const ladenKennwort = ref<string>('')
  const ladenFehler = ref<string>('')
  const ladenLaeuft = ref<boolean>(false)
  const ladenDateiName = ref<string>('')
  const ladenDateiText = ref<string>('')
  const serverKonfigVorhanden = ref<boolean>(false)
  const ladenVomServerLaeuft = ref<boolean>(false)

  function speichern(): void {
    speichernKennwort.value = konfigKennwort.value
    speichernKennwortBestaetigung.value = konfigKennwort.value
    speichernFehler.value = ''
    speichernModalOffen.value = true
  }

  function schliesseSpeichernModal(): void {
    speichernModalOffen.value = false
  }

  async function fuehreSpeichernDurch(): Promise<void> {
    if (speichernKennwort.value.length < 8) {
      speichernFehler.value = 'Das Kennwort muss mindestens 8 Zeichen lang sein.'
      return
    }
    if (speichernKennwort.value !== speichernKennwortBestaetigung.value) {
      speichernFehler.value = 'Die Kennwörter stimmen nicht überein.'
      return
    }
    speichernFehler.value = ''
    speichernLaeuft.value = true
    try {
      const encrypted = await aesVerschluesseln(JSON.stringify(baueKonfigDaten(deps), null, 2), speichernKennwort.value)
      const blob = new Blob([encrypted], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'gradehub-config.ghb'; a.click()
      URL.revokeObjectURL(url)
      speichernModalOffen.value = false
      konfigKennwort.value = speichernKennwort.value
      deps.onGespeichert?.()
    } catch (error) {
      speichernFehler.value = error instanceof Error ? error.message : 'Speichern fehlgeschlagen.'
    } finally {
      speichernLaeuft.value = false
    }
  }

  async function speichereKonfigurationAufServer(encrypted: string): Promise<void> {
    const cleanedBaseUrl = deps.authStore.baseUrl.replace(/\/$/, '')
    const endpoint = `${cleanedBaseUrl}/db/${deps.authStore.schema}/client/config/gradehub/user/data`
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: encodeBasicAuth(deps.authStore.username, deps.authStore.password),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(encrypted),
      })
    } catch {
      throw new Error('Netzwerkfehler beim Zugriff auf den SVWS-Server.')
    }
    if (!response.ok) throw new Error(`Konfiguration konnte nicht auf dem Server gespeichert werden (${response.status}).`)
  }

  async function fuehreServerSpeichernDurch(): Promise<void> {
    if (speichernKennwort.value.length < 8) {
      speichernFehler.value = 'Das Kennwort muss mindestens 8 Zeichen lang sein.'
      return
    }
    if (speichernKennwort.value !== speichernKennwortBestaetigung.value) {
      speichernFehler.value = 'Die Kennwörter stimmen nicht überein.'
      return
    }
    speichernFehler.value = ''
    speichernLaeuft.value = true
    try {
      const encrypted = await aesVerschluesseln(JSON.stringify(baueKonfigDaten(deps), null, 2), speichernKennwort.value)
      await speichereKonfigurationAufServer(encrypted)
      serverKonfigVorhanden.value = true
      speichernModalOffen.value = false
      konfigKennwort.value = speichernKennwort.value
      deps.onGespeichert?.()
    } catch (error) {
      speichernFehler.value = error instanceof Error ? error.message : 'Speichern fehlgeschlagen.'
    } finally {
      speichernLaeuft.value = false
    }
  }

  function laden(): void {
    ladenKennwort.value = ''
    ladenFehler.value = ''
    ladenDateiName.value = ''
    ladenDateiText.value = ''
    ladenModalOffen.value = true
  }

  async function pruefeServerKonfiguration(): Promise<void> {
    if (!deps.kannAnSVWSServerSenden.value) return
    try {
      const cleanedBaseUrl = deps.authStore.baseUrl.replace(/\/$/, '')
      const endpoint = `${cleanedBaseUrl}/db/${deps.authStore.schema}/client/config/gradehub/user/data`
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: encodeBasicAuth(deps.authStore.username, deps.authStore.password),
          Accept: 'application/json',
        },
      })
      if (!response.ok) return
      const text = await response.text()
      let value: unknown
      try { value = JSON.parse(text) } catch { return }
      if (typeof value !== 'string' || value.trim() === '') return
      serverKonfigVorhanden.value = true
      laden()
    } catch {
      // Startprüfung still ignorieren
    }
  }

  function schliesseLadenModal(): void {
    ladenModalOffen.value = false
  }

  function onLadenDateiGewaehlt(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    ladenDateiName.value = file.name
    const reader = new FileReader()
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') ladenDateiText.value = e.target.result
    }
    reader.readAsText(file)
  }

  async function fuehreLadenDurch(): Promise<void> {
    if (!ladenDateiText.value) { ladenFehler.value = 'Bitte eine Datei auswählen.'; return }
    if (!ladenKennwort.value) { ladenFehler.value = 'Bitte das Kennwort eingeben.'; return }
    ladenFehler.value = ''
    ladenLaeuft.value = true
    try {
      const plaintext = await aesEntschluesseln(ladenDateiText.value, ladenKennwort.value)
      const daten = JSON.parse(plaintext) as KonfigDaten
      wendeKonfigAn(daten, deps)
      konfigKennwort.value = ladenKennwort.value
      ladenModalOffen.value = false
    } catch {
      ladenFehler.value = 'Entschlüsselung fehlgeschlagen. Falsches Kennwort oder beschädigte Datei.'
    } finally {
      ladenLaeuft.value = false
    }
  }

  async function ladeKonfigurationVomServer(): Promise<string> {
    const cleanedBaseUrl = deps.authStore.baseUrl.replace(/\/$/, '')
    const endpoint = `${cleanedBaseUrl}/db/${deps.authStore.schema}/client/config/gradehub/user/data`
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: encodeBasicAuth(deps.authStore.username, deps.authStore.password),
          Accept: 'application/json',
        },
      })
    } catch {
      throw new Error('Netzwerkfehler beim Zugriff auf den SVWS-Server.')
    }
    if (!response.ok) {
      if (response.status === 404) throw new Error('Keine gespeicherte Konfiguration auf dem Server gefunden.')
      throw new Error(`Konfiguration konnte nicht geladen werden (${response.status}).`)
    }
    const text = await response.text()
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'string' ? parsed : text
  }

  async function fuehreServerLabenDurch(): Promise<void> {
    if (!ladenKennwort.value) { ladenFehler.value = 'Bitte das Kennwort eingeben.'; return }
    ladenFehler.value = ''
    ladenVomServerLaeuft.value = true
    try {
      const encryptedJson = await ladeKonfigurationVomServer()
      const plaintext = await aesEntschluesseln(encryptedJson, ladenKennwort.value)
      const daten = JSON.parse(plaintext) as KonfigDaten
      wendeKonfigAn(daten, deps)
      konfigKennwort.value = ladenKennwort.value
      ladenModalOffen.value = false
    } catch (error) {
      ladenFehler.value = error instanceof Error ? error.message : 'Laden oder Entschlüsselung fehlgeschlagen.'
    } finally {
      ladenVomServerLaeuft.value = false
    }
  }

  return {
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
  }
}

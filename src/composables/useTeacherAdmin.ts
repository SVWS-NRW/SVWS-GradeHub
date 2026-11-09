import { computed, ref } from 'vue'
import { jsPDF } from 'jspdf'
import { strToU8, zipSync } from 'fflate'
import type { useAuthStore } from '@/stores/authStore'
import type { LehrerEintrag, SpaltenKey } from '@/types/admin'
import { ENM_FUNKTION } from '@/types/enm'
import type { EnmFunktion } from '@/types/enm'
import {
  encodeBasicAuth,
  aesVerschluesselnBytes,
  arrayBufferAusUint8Array,
} from '@/utils/crypto'

type AuthStore = ReturnType<typeof useAuthStore>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function mapLehrer(value: unknown): LehrerEintrag | null {
  if (!isRecord(value)) return null
  const id = value.id
  const kuerzel = value.kuerzel
  const nachname = value.nachname
  const vorname = value.vorname
  const notenpasswortRaw = value.notenpasswort ?? value.passwort ?? value.password ?? value.tsNotenpasswort
  if (typeof id !== 'number' || typeof kuerzel !== 'string') return null
  const istAktivRaw = value.istAktiv ?? value.aktiv ?? value.istSichtbar
  return {
    id,
    kuerzel,
    nachname: typeof nachname === 'string' ? nachname : '',
    vorname: typeof vorname === 'string' ? vorname : '',
    emailDienstlich: '',
    notenpasswort: typeof notenpasswortRaw === 'string' ? notenpasswortRaw : '',
    istAktiv: typeof istAktivRaw === 'boolean' ? istAktivRaw : true,
  }
}

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const values = window.crypto.getRandomValues(new Uint8Array(length))
  for (let i = 0; i < length; i++) {
    const randomByte = values.at(i) ?? 0
    result += chars.charAt(randomByte % chars.length)
  }
  return result
}

function generiereNotenpasswort(): string {
  return [
    randomAlphanumeric(4),
    randomAlphanumeric(4),
    randomAlphanumeric(4),
    randomAlphanumeric(4),
    randomAlphanumeric(4),
    randomAlphanumeric(4),
  ].join('-')
}

export function useTeacherAdmin(authStore: AuthStore) {
  const lehrer = ref<LehrerEintrag[]>([])
  const ausgewaehlt = ref<Set<number>>(new Set())
  const nurAktive = ref<boolean>(true)
  const isLoading = ref<boolean>(false)
  const errorMessage = ref<string>('')

  const sichtbareLehrer = computed<LehrerEintrag[]>(() => {
    const liste = nurAktive.value ? lehrer.value.filter((l) => l.istAktiv) : lehrer.value
    return [...liste].sort((a, b) => a.kuerzel.localeCompare(b.kuerzel, 'de'))
  })

  const alleAusgewaehlt = computed<boolean>(() =>
    sichtbareLehrer.value.length > 0 && sichtbareLehrer.value.every((l) => ausgewaehlt.value.has(l.id)),
  )

  const spaltenBreiten = ref<Record<SpaltenKey, number>>({
    kuerzel: 96,
    name: 240,
    email: 220,
    passwort: 260,
  })

  const minBreiten: Record<SpaltenKey, number> = { kuerzel: 32, name: 72, email: 60, passwort: 60 }

  let resizing: { key: SpaltenKey; startX: number; startWidth: number } | null = null

  async function ladeEmailAdressen(): Promise<void> {
    const cleanedBaseUrl = authStore.baseUrl.replace(/\/$/, '')
    const results = await Promise.allSettled(
      lehrer.value.map(async (eintrag) => {
        const response = await fetch(
          `${cleanedBaseUrl}/db/${authStore.schema}/lehrer/${eintrag.id}/stammdaten`,
          {
            method: 'GET',
            headers: {
              Authorization: encodeBasicAuth(authStore.username, authStore.password),
              Accept: 'application/json',
            },
          },
        )
        if (!response.ok) return { id: eintrag.id, email: '', istSichtbar: null }
        const data: unknown = await response.json()
        if (!isRecord(data)) return { id: eintrag.id, email: '', istSichtbar: null }
        return {
          id: eintrag.id,
          email: typeof data.emailDienstlich === 'string' ? data.emailDienstlich : '',
          istSichtbar: typeof data.istSichtbar === 'boolean' ? data.istSichtbar : null,
        }
      }),
    )
    const stammdatenMap = new Map<number, { email: string; istSichtbar: boolean | null }>()
    for (const result of results) {
      if (result.status === 'fulfilled') stammdatenMap.set(result.value.id, result.value)
    }
    lehrer.value = lehrer.value.map((eintrag) => {
      const stamm = stammdatenMap.get(eintrag.id)
      return {
        ...eintrag,
        emailDienstlich: stamm?.email ?? '',
        istAktiv: stamm?.istSichtbar ?? eintrag.istAktiv,
      }
    })
  }

  async function ladeLehrerListe(): Promise<void> {
    errorMessage.value = ''
    isLoading.value = true
    ausgewaehlt.value = new Set()
    lehrer.value = []
    try {
      const cleanedBaseUrl = authStore.baseUrl.replace(/\/$/, '')
      const endpoint = `${cleanedBaseUrl}/db/${authStore.schema}/lehrer`
      let response: Response
      try {
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: encodeBasicAuth(authStore.username, authStore.password),
            Accept: 'application/json',
          },
        })
      } catch {
        throw new Error(`Netzwerkfehler beim Zugriff auf ${endpoint}. Bitte URL, Protokoll und CORS pruefen.`)
      }
      if (!response.ok) throw new Error(`Lehrerliste konnte nicht geladen werden (${response.status}).`)
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('Lehrerliste hat ein ungueltiges Format.')
      lehrer.value = data.map(mapLehrer).filter((l): l is LehrerEintrag => l !== null)
      void ladeEmailAdressen()
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Lehrerliste konnte nicht geladen werden.'
    } finally {
      isLoading.value = false
    }
  }

  function toggleAuswahl(id: number): void {
    if (ausgewaehlt.value.has(id)) {
      ausgewaehlt.value.delete(id)
    } else {
      ausgewaehlt.value.add(id)
    }
  }

  function toggleAlle(): void {
    if (alleAusgewaehlt.value) {
      for (const l of sichtbareLehrer.value) ausgewaehlt.value.delete(l.id)
    } else {
      for (const l of sichtbareLehrer.value) ausgewaehlt.value.add(l.id)
    }
  }

  function generierePasswoerterFuerAuswahl(): void {
    if (ausgewaehlt.value.size === 0) return
    lehrer.value = lehrer.value.map((eintrag) => {
      if (!ausgewaehlt.value.has(eintrag.id)) return eintrag
      return { ...eintrag, notenpasswort: generiereNotenpasswort() }
    })
  }

  async function kopiereNotenpasswort(passwort: string): Promise<void> {
    if (passwort.trim() === '') return
    errorMessage.value = ''
    try {
      await window.navigator.clipboard.writeText(passwort)
    } catch {
      const fallbackInput = document.createElement('textarea')
      fallbackInput.value = passwort
      fallbackInput.setAttribute('readonly', '')
      fallbackInput.style.position = 'fixed'
      fallbackInput.style.left = '-9999px'
      document.body.appendChild(fallbackInput)
      fallbackInput.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(fallbackInput)
      if (!ok) errorMessage.value = 'Notenpasswort konnte nicht in die Zwischenablage kopiert werden.'
    }
  }

  function druckePasswortStreifen(): void {
    errorMessage.value = ''
    const daten = sichtbareLehrer.value.filter((l) => ausgewaehlt.value.has(l.id))
    if (daten.length === 0) {
      errorMessage.value = 'Bitte mindestens eine Lehrkraft auswählen, um die Passwortstreifen zu drucken.'
      return
    }
    const streifen = daten.map((l) => ({
      kuerzel: l.kuerzel,
      name: `${l.nachname}, ${l.vorname}`,
      passwort: l.notenpasswort.trim() !== '' ? l.notenpasswort : '-',
    }))
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 12
    const marginTop = 12
    const marginBottom = 12
    const stripHeight = 18
    const right = pageWidth - marginX
    const contentWidth = pageWidth - 2 * marginX
    let y = marginTop
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('Notenpasswoerter je Lehrkraft', marginX, y)
    y += 8
    for (const eintrag of streifen) {
      if (y + stripHeight > pageHeight - marginBottom) { doc.addPage(); y = marginTop }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('Kuerzel:', marginX, y + 3.5)
      doc.text('Name:', marginX + 34, y + 3.5)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
      doc.text(doc.splitTextToSize(eintrag.kuerzel, 24), marginX + 13, y + 3.5)
      doc.text(doc.splitTextToSize(eintrag.name, contentWidth - 48), marginX + 44, y + 3.5)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
      doc.text('Notenpasswort:', marginX, y + 10.5)
      doc.setFont('courier', 'bold'); doc.setFontSize(12)
      doc.text(eintrag.passwort, marginX + 24, y + 10.7)
      doc.setDrawColor(107, 114, 128); doc.setLineWidth(0.2)
      doc.setLineDashPattern([1.2, 1.2], 0)
      doc.line(marginX, y + stripHeight - 1.1, right, y + stripHeight - 1.1)
      doc.setLineDashPattern([], 0)
      y += stripHeight
    }
    const jetzt = new Date()
    const stempel = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}-${String(jetzt.getDate()).padStart(2, '0')}`
    doc.save(`notenpasswoerter-${stempel}.pdf`)
  }

  async function ladeENMJsonFuerLehrer(lehrerId: number, funktion: EnmFunktion = ENM_FUNKTION.FACHLEHRER): Promise<string> {
    const cleanedBaseUrl = authStore.baseUrl.replace(/\/$/, '')
    const endpoint = `${cleanedBaseUrl}/db/${authStore.schema}/enm/v2/lehrer/${lehrerId}/${funktion}`
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: encodeBasicAuth(authStore.username, authStore.password),
          Accept: 'application/json',
        },
      })
    } catch {
      throw new Error(`Netzwerkfehler beim Zugriff auf ${endpoint}. Bitte URL, Protokoll und CORS pruefen.`)
    }
    if (!response.ok) throw new Error(`ENM für Lehrkraft ${lehrerId} konnte nicht geladen werden (${response.status}).`)
    const text = await response.text()
    try {
      const parsed = JSON.parse(text) as unknown
      return JSON.stringify(parsed, null, 2)
    } catch {
      throw new Error(`Antwort fuer Lehrkraft ${lehrerId} ist kein gueltiges JSON.`)
    }
  }

  async function erzeugeDateienFuerAuswahl(oeffentlicherSchluesselPem: string): Promise<void> {
    errorMessage.value = ''
    if (ausgewaehlt.value.size === 0) {
      errorMessage.value = 'Bitte mindestens eine Lehrkraft auswählen.'
      return
    }
    if (!oeffentlicherSchluesselPem) {
      errorMessage.value = 'Bitte zuerst ein Schlüsselpaar erzeugen (öffentlicher Schlüssel fehlt).'
      return
    }
    const ausgewaehlteLehrer = lehrer.value.filter((e) => ausgewaehlt.value.has(e.id))
    const ohneNotenpasswort = ausgewaehlteLehrer.filter((e) => e.notenpasswort.trim() === '')
    if (ohneNotenpasswort.length > 0) {
      errorMessage.value = `Für folgende Lehrkräfte fehlt ein Notenpasswort: ${ohneNotenpasswort.map((l) => l.kuerzel).join(', ')}`
      return
    }
    isLoading.value = true
    try {
      const pickerWindow = window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
      let directoryHandle: FileSystemDirectoryHandle | null = null
      if (typeof pickerWindow.showDirectoryPicker === 'function') {
        try {
          directoryHandle = await pickerWindow.showDirectoryPicker()
        } catch {
          return
        }
      }
      for (const eintrag of ausgewaehlteLehrer) {
        const enmJson = await ladeENMJsonFuerLehrer(eintrag.id)
        const zipBytes = zipSync({
          'enm.json': strToU8(enmJson),
          'public_key.pem': strToU8(oeffentlicherSchluesselPem),
        })
        const zipFileName = `${eintrag.kuerzel || `lehrer-${eintrag.id}`}-enm.zip`
        const verschluesselt = await aesVerschluesselnBytes(arrayBufferAusUint8Array(zipBytes), eintrag.notenpasswort, zipFileName)
        const dateiname = `${zipFileName}.enc.json`
        if (directoryHandle) {
          const fileHandle = await directoryHandle.getFileHandle(dateiname, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(verschluesselt)
          await writable.close()
        } else {
          const blob = new Blob([verschluesselt], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = dateiname; a.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Dateien konnten nicht erzeugt werden.'
    } finally {
      isLoading.value = false
    }
  }

  async function erzeugeDateienUnverschluesseltFuerAuswahl(): Promise<void> {
    errorMessage.value = ''
    if (ausgewaehlt.value.size === 0) {
      errorMessage.value = 'Bitte mindestens eine Lehrkraft auswählen.'
      return
    }
    const ausgewaehlteLehrer = lehrer.value.filter((e) => ausgewaehlt.value.has(e.id))
    isLoading.value = true
    try {
      const pickerWindow = window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
      let directoryHandle: FileSystemDirectoryHandle | null = null
      if (typeof pickerWindow.showDirectoryPicker === 'function') {
        try {
          directoryHandle = await pickerWindow.showDirectoryPicker()
        } catch {
          return
        }
      }
      for (const eintrag of ausgewaehlteLehrer) {
        const enmJson = await ladeENMJsonFuerLehrer(eintrag.id)
        const dateiname = `${eintrag.kuerzel || `lehrer-${eintrag.id}`}-enm.json`
        if (directoryHandle) {
          const fileHandle = await directoryHandle.getFileHandle(dateiname, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(enmJson)
          await writable.close()
        } else {
          const blob = new Blob([enmJson], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = dateiname; a.click()
          URL.revokeObjectURL(url)
        }
      }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Dateien konnten nicht erzeugt werden.'
    } finally {
      isLoading.value = false
    }
  }

  function spaltenStil(key: SpaltenKey): { width: string; minWidth: string } {
    const breite = spaltenBreiten.value[key]
    if (key === 'passwort') return { width: 'auto', minWidth: `${breite}px` }
    return { width: `${breite}px`, minWidth: `${breite}px` }
  }

  function onResizeMove(event: MouseEvent): void {
    if (!resizing) return
    const delta = event.clientX - resizing.startX
    spaltenBreiten.value[resizing.key] = Math.max(minBreiten[resizing.key], resizing.startWidth + delta)
  }

  function onResizeEnd(): void {
    if (!resizing) return
    resizing = null
    window.removeEventListener('mousemove', onResizeMove)
    window.removeEventListener('mouseup', onResizeEnd)
    document.body.style.cursor = ''
  }

  function starteResize(key: SpaltenKey, event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()
    resizing = { key, startX: event.clientX, startWidth: spaltenBreiten.value[key] }
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', onResizeEnd)
  }

  return {
    lehrer,
    ausgewaehlt,
    nurAktive,
    isLoading,
    errorMessage,
    sichtbareLehrer,
    alleAusgewaehlt,
    spaltenBreiten,
    ladeLehrerListe,
    ladeENMJsonFuerLehrer,
    toggleAuswahl,
    toggleAlle,
    generierePasswoerterFuerAuswahl,
    kopiereNotenpasswort,
    druckePasswortStreifen,
    erzeugeDateienFuerAuswahl,
    erzeugeDateienUnverschluesseltFuerAuswahl,
    spaltenStil,
    onResizeEnd,
    starteResize,
  }
}

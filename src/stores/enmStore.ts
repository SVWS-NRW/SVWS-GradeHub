import { readonly, ref } from 'vue'
import { defineStore } from 'pinia'
import { decompressSync, strFromU8 } from 'fflate'

import { ENM_FUNKTION } from '@/types/enm'
import type { EnmExport as ENMDaten, EnmFunktion } from '@/types/enm'

const ENM_DOWNLOAD_TIMEOUT_MS = 30_000
const GZIP_MAGIC_BYTE_1 = 0x1f
const GZIP_MAGIC_BYTE_2 = 0x8b

export interface LehrerKurzinfo {
  id: number
  kuerzel: string
  istAktiv: boolean
}

export type ENMDataSource = 'api' | 'file' | null

function wipeString(value: string): string {
  if (value === '') {
    return ''
  }
  return '\0'.repeat(value.length)
}

function parseENMFromBytes(bytes: Uint8Array): ENMDaten {
  const isGzip = bytes.length > 2 && bytes[0] === GZIP_MAGIC_BYTE_1 && bytes[1] === GZIP_MAGIC_BYTE_2
  const json = isGzip ? strFromU8(decompressSync(bytes)) : strFromU8(bytes)
  return JSON.parse(json) as ENMDaten
}

function encodeBasicAuth(username: string, password: string): string {
  return `Basic ${window.btoa(`${username}:${password}`)}`
}

function toFetchError(error: unknown, endpoint: string): Error {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new Error(`Zeitueberschreitung beim Zugriff auf ${endpoint}.`)
  }

  if (error instanceof TypeError) {
    return new Error(
      `Netzwerkfehler beim Zugriff auf ${endpoint}. Bitte URL, Protokoll (http/https), Zertifikat und CORS pruefen.`,
    )
  }

  return error instanceof Error ? error : new Error('Unbekannter Fehler beim Serverzugriff.')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function mapLehrerKurzinfo(value: unknown): LehrerKurzinfo | null {
  if (!isRecord(value)) {
    return null
  }

  const idRaw = value.id
  const kuerzelRaw = value.kuerzel

  if (typeof idRaw !== 'number' || typeof kuerzelRaw !== 'string') {
    return null
  }

  const istAktivRaw = value.istAktiv ?? value.aktiv ?? value.istSichtbar
  const istAktiv = typeof istAktivRaw === 'boolean' ? istAktivRaw : true

  return {
    id: idRaw,
    kuerzel: kuerzelRaw,
    istAktiv,
  }
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result as ArrayBuffer)
    }

    reader.onerror = () => {
      reject(reader.error ?? new Error('Datei konnte nicht gelesen werden.'))
    }

    reader.readAsArrayBuffer(file)
  })
}

export const useENMStore = defineStore('enm', () => {
  const enmDaten = ref<ENMDaten | null>(null)
  const isLoaded = ref<boolean>(false)
  const dataSource = ref<ENMDataSource>(null)
  const sourceFileName = ref<string>('')
  const encryptedSourceFileName = ref<string>('')
  const encryptedOriginalFileName = ref<string>('')
  const encryptedSourcePassword = ref<string>('')

  function clearEncryptedSource(): void {
    encryptedSourcePassword.value = wipeString(encryptedSourcePassword.value)
    encryptedSourcePassword.value = ''
    encryptedSourceFileName.value = ''
    encryptedOriginalFileName.value = ''
  }

  function setEncryptedSource(nextSourceFileName: string, nextOriginalFileName: string, nextPassword: string): void {
    clearEncryptedSource()
    encryptedSourceFileName.value = nextSourceFileName
    encryptedOriginalFileName.value = nextOriginalFileName
    encryptedSourcePassword.value = nextPassword
  }

  async function ladeLehrerListeVomServer(baseUrl: string, schema: string, username: string, password: string): Promise<LehrerKurzinfo[]> {
    const cleanedBaseUrl = baseUrl.replace(/\/$/, '')
    const endpoint = `${cleanedBaseUrl}/db/${schema}/lehrer`

    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: encodeBasicAuth(username, password),
          Accept: 'application/json',
        },
      })
    } catch (error) {
      throw toFetchError(error, endpoint)
    }

    if (!response.ok) {
      throw new Error(`Lehrerliste konnte nicht geladen werden (${response.status}).`)
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('Lehrerliste hat ein ungueltiges Format.')
    }

    return data
      .map(mapLehrerKurzinfo)
      .filter((lehrer): lehrer is LehrerKurzinfo => lehrer !== null)
      .sort((a, b) => a.kuerzel.localeCompare(b.kuerzel, 'de'))
  }

  async function ladeENMVonServer(baseUrl: string, schema: string, username: string, password: string, lehrerId?: number, funktion: EnmFunktion = ENM_FUNKTION.FACHLEHRER): Promise<void> {
    const cleanedBaseUrl = baseUrl.replace(/\/$/, '')
    const endpoints = lehrerId
      ? [
          `${cleanedBaseUrl}/db/${schema}/enm/v2/lehrer/${lehrerId}/${funktion}`,
          `${cleanedBaseUrl}/db/${schema}/enm/v1/lehrer/${lehrerId}`,
        ]
      : [
          `${cleanedBaseUrl}/db/${schema}/enm/v2/alle/gzip`,
          `${cleanedBaseUrl}/db/${schema}/enm/v1/alle/gzip`,
        ]

    let lastError: unknown = new Error('Kein ENM-Endpunkt erreichbar.')

    for (const endpoint of endpoints) {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), ENM_DOWNLOAD_TIMEOUT_MS)

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: encodeBasicAuth(username, password),
            Accept: 'application/json, application/octet-stream',
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          if (response.status === 404) {
            continue
          }
          throw new Error(`ENM-Download fehlgeschlagen (${response.status}).`)
        }

        const payload = new Uint8Array(await response.arrayBuffer())
        enmDaten.value = parseENMFromBytes(payload)
        isLoaded.value = true
        dataSource.value = 'api'
        sourceFileName.value = ''
        clearEncryptedSource()
        return
      } catch (error) {
        lastError = toFetchError(error, endpoint)
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    throw lastError
  }

  async function ladeENMVonDatei(file: File): Promise<void> {
    const buffer = await readFileAsArrayBuffer(file)
    const payload = new Uint8Array(buffer)

    enmDaten.value = parseENMFromBytes(payload)
    isLoaded.value = true
    dataSource.value = 'file'
    sourceFileName.value = file.name
    clearEncryptedSource()
  }

  function ersetzeENMDaten(next: ENMDaten): void {
    enmDaten.value = next
    isLoaded.value = true
  }

  function reset(): void {
    enmDaten.value = null
    isLoaded.value = false
    dataSource.value = null
    sourceFileName.value = ''
    clearEncryptedSource()
  }

  return {
    enmDaten: readonly(enmDaten),
    isLoaded: readonly(isLoaded),
    dataSource: readonly(dataSource),
    sourceFileName: readonly(sourceFileName),
    encryptedSourceFileName: readonly(encryptedSourceFileName),
    encryptedOriginalFileName: readonly(encryptedOriginalFileName),
    encryptedSourcePassword: readonly(encryptedSourcePassword),
    ladeLehrerListeVomServer,
    ladeENMVonServer,
    ladeENMVonDatei,
    ersetzeENMDaten,
    setEncryptedSource,
    clearEncryptedSource,
    reset,
  }
})

// Naechster Schritt: Fehlerzustand und ENM-Version im UI-Store sichtbar machen.

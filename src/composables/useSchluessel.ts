import { ref } from 'vue'

export function useSchluessel() {
  const schluesselModalOffen = ref<boolean>(false)
  const schluesselGeneriert = ref<boolean>(false)
  const schluesselGenerierenLaeuft = ref<boolean>(false)
  const schluesselFehler = ref<string>('')
  // true, sobald ein Schlüsselpaar erzeugt wurde, das noch in keiner gespeicherten Konfiguration steckt
  const schluesselUngesichert = ref<boolean>(false)
  const schluesselNachfrageOffen = ref<boolean>(false)
  const oeffentlicherSchluesselPem = ref<string>('')
  const privaterSchluesselPem = ref<string>('')
  const privaterSchluessel = ref<CryptoKey | null>(null)
  const oeffentlicherSchluessel = ref<CryptoKey | null>(null)

  function generiereSchluessel(): void {
    schluesselFehler.value = ''
    schluesselModalOffen.value = true
  }

  function schliesseSchluesselModal(): void {
    if (schluesselUngesichert.value) {
      schluesselNachfrageOffen.value = true
      return
    }
    schluesselModalOffen.value = false
  }

  function schliesseSchluesselModalOhneSpeichern(): void {
    schluesselNachfrageOffen.value = false
    schluesselModalOffen.value = false
  }

  function markiereSchluesselGesichert(): void {
    schluesselUngesichert.value = false
  }

  async function fuehreSchluesselGenerierungDurch(): Promise<void> {
    schluesselFehler.value = ''
    schluesselGenerierenLaeuft.value = true
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 4096,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt'],
      )
      oeffentlicherSchluessel.value = keyPair.publicKey
      privaterSchluessel.value = keyPair.privateKey

      const spki = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
      const pubB64 = window.btoa(String.fromCharCode(...new Uint8Array(spki)))
      const pubLines = pubB64.match(/.{1,64}/g)?.join('\n') ?? pubB64
      oeffentlicherSchluesselPem.value = `-----BEGIN PUBLIC KEY-----\n${pubLines}\n-----END PUBLIC KEY-----`

      const pkcs8 = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
      const privB64 = window.btoa(String.fromCharCode(...new Uint8Array(pkcs8)))
      const privLines = privB64.match(/.{1,64}/g)?.join('\n') ?? privB64
      privaterSchluesselPem.value = `-----BEGIN PRIVATE KEY-----\n${privLines}\n-----END PRIVATE KEY-----`

      schluesselGeneriert.value = true
      schluesselUngesichert.value = true
    } catch (error) {
      schluesselFehler.value = error instanceof Error ? error.message : 'Schlüsselerzeugung fehlgeschlagen.'
    } finally {
      schluesselGenerierenLaeuft.value = false
    }
  }

  return {
    schluesselModalOffen,
    schluesselGeneriert,
    schluesselGenerierenLaeuft,
    schluesselFehler,
    schluesselUngesichert,
    schluesselNachfrageOffen,
    oeffentlicherSchluesselPem,
    privaterSchluesselPem,
    privaterSchluessel,
    oeffentlicherSchluessel,
    generiereSchluessel,
    schliesseSchluesselModal,
    schliesseSchluesselModalOhneSpeichern,
    markiereSchluesselGesichert,
    fuehreSchluesselGenerierungDurch,
  }
}

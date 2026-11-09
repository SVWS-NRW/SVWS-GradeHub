/**
 * SVWS Elektronische Notenmanagement (ENM) Typen
 * Abgeleitet aus dem echten SVWS-Exportformat (enm.json)
 *
 * Noten-Kürzel im System: '1+' | '1' | '1-' | '2+' | ... | '6'
 * sowie Sondernoten: 'AT' | 'E1' | 'E2' | 'E3' | 'NT' | 'NB' | 'NE' | 'LM' | 'AM'
 */

// ---------------------------------------------------------------------------
// Funktion der Lehrkraft (SVWS: /db/{schema}/enm/v2/lehrer/{id}/{funktion})
// ---------------------------------------------------------------------------

export const ENM_FUNKTION = {
  FACHLEHRER: 1,
  KLASSENLEITUNG: 2,
  ABTEILUNGSLEITUNG: 3,
  SCHULLEITUNG: 4,
  NOTENMODULADMIN: 5,
} as const

export type EnmFunktion = (typeof ENM_FUNKTION)[keyof typeof ENM_FUNKTION]

// ---------------------------------------------------------------------------
// Primitive Typen
// ---------------------------------------------------------------------------

export type NotenkuerzelZensur =
  | '1+' | '1' | '1-'
  | '2+' | '2' | '2-'
  | '3+' | '3' | '3-'
  | '4+' | '4' | '4-'
  | '5+' | '5' | '5-'
  | '6'

export type NotenkuerzelSonder =
  | 'AT'   // Attest
  | 'E1' | 'E2' | 'E3'  // Entwicklungsstufen (Grundschule)
  | 'NT'   // nicht teilgenommen
  | 'NB'   // nicht bewertet
  | 'NE'   // nicht erteilt
  | 'LM'   // laut Mitteilung
  | 'AM'   // abgemeldet

export type Notenkuerzel = NotenkuerzelZensur | NotenkuerzelSonder

export type Geschlecht = 'm' | 'w' | 'd' | 'x'

export type Kursart =
  | 'LK'    // Leistungskurs
  | 'GK'    // Grundkurs
  | 'ZK'    // Zusatzkurs
  | 'PJK'   // Projektkurs
  | 'PUK'   // Prüfungskurs
  | 'PUT'   // Prüfungstraining
  | 'VTF'   // Vertiefungsfach
  | 'WPII'  // Wahlpflicht II
  | 'FS3'   // Fremdsprache ab 3. Sprache
  | string  // Erweiterung für zukünftige Kursarten

// ---------------------------------------------------------------------------
// Lookup-Tabellen (Top-Level im Export)
// ---------------------------------------------------------------------------

export interface EnmNote {
  id: number
  kuerzel: Notenkuerzel
  notenpunkte: number   // 0 (ungenügend) bis 15 (SII) oder 6 (SI)
  text: string          // z.B. "mangelhaft (minus)"
}

export interface EnmFach {
  id: number
  kuerzel: string         // z.B. "D", "M", "E"
  kuerzelAnzeige: string  // Anzeigekürzel (kann abweichen)
  bezeichnung?: string | null // Langbezeichnung, falls vom Server geliefert
  sortierung: number
  istFremdsprache: boolean
}

export interface EnmJahrgang {
  id: number
  kuerzel: string         // z.B. "Q1", "EF"
  kuerzelAnzeige: string
  beschreibung: string    // z.B. "Qualifikationsphase 1"
  stufe: string           // z.B. "SII-2"
  sortierung: number
}

export interface EnmKlasse {
  id: number
  kuerzel: string         // z.B. "Q1", "5a"
  kuerzelAnzeige: string
  idJahrgang: number
  sortierung: number
  klassenlehrer: number[] // Lehrer-IDs
}

export interface EnmLehrer {
  id: number
  kuerzel: string
  nachname: string
  vorname: string
  geschlecht: Geschlecht
  eMailDienstlich: string | null
  passwordHash: string
  tsPasswordHash: string | null
  istInitialPassword?: boolean
  istErstanmeldung?: boolean
  isInitialPassword?: boolean
}

export interface EnmLerngruppe {
  id: number
  kID: number             // Kurs-ID im SVWS
  fachID: number
  kursartID: number
  bezeichnung: string     // z.B. "D-LK2"
  kursartKuerzel: Kursart | null
  bilingualeSprache: string | null
  lehrerID?: number[]
  idsLehrer?: number[]
  wochenstunden: number
}

export interface EnmFloskel {
  kuerzel: string
  text: string
  fachID: number | null
  niveau: string | null
  jahrgangID: number | null
}

export interface EnmFloskelgruppe {
  kuerzel: string
  bezeichnung: string
  hauptgruppe: string
  floskeln: readonly EnmFloskel[]
}

// ---------------------------------------------------------------------------
// Schüler-bezogene Typen
// ---------------------------------------------------------------------------

export interface EnmSprachenfolgeEintrag {
  fachID: number
  reihenfolge: number
  belegungVonJahrgang: string | null
  belegungVonAbschnitt: number | null
  belegungBisJahrgang: string | null
  belegungBisAbschnitt: number | null
  referenzniveau: string | null
}

export interface EnmLernabschnitt {
  id: number
  fehlstundenGesamt: number
  tsFehlstundenGesamt: string
  fehlstundenGesamtUnentschuldigt: number
  tsFehlstundenGesamtUnentschuldigt: string
  pruefungsordnung: string  // z.B. "APO-GOSt(B)10/G8"
  lernbereich1note: Notenkuerzel | null
  lernbereich2note: Notenkuerzel | null
  foerderschwerpunkt1: number | null
  foerderschwerpunkt2: number | null
}

export interface EnmTeilleistungsart {
  id: number
  bezeichnung: string
  sortierung: number
  gewichtung: number
}

export interface EnmTeilleistung {
  id: number
  artID: number
  tsArtID: string
  datum: string | null
  tsDatum: string
  bemerkung: string | null
  tsBemerkung: string
  note: Notenkuerzel | null
  tsNote: string
}

export interface EnmLeistungsdaten {
  id: number
  lerngruppenID: number
  note: Notenkuerzel | null
  tsNote: string
  noteQuartal: Notenkuerzel | null
  tsNoteQuartal: string
  istSchriftlich: boolean
  abiturfach: number | null   // 1-4 = Abiturfach, null = kein Abiturfach
  fehlstundenFach: number
  tsFehlstundenFach: string
  fehlstundenUnentschuldigtFach: number
  tsFehlstundenUnentschuldigtFach: string
  fachbezogeneBemerkungen: string | null
  tsFachbezogeneBemerkungen: string
  neueZuweisungKursart: string | null
  tsNeueZuweisungKursart?: string | null
  istDifferenzierungkursErweitert?: boolean
  istGemahnt: boolean
  tsIstGemahnt: string
  mahndatum: string | null
  teilleistungen: EnmTeilleistung[]
}

export interface EnmBemerkungen {
  ASV: string | null                        // Arbeits- und Sozialverhalten
  tsASV: string
  AUE: string | null                        // Außerunterrichtliches Engagement
  tsAUE: string
  ZB: string | null                         // Zeugnisbemerkung
  tsZB: string
  LELS: string | null                       // Lern- und Leistungsstand
  tsLELS: string
  schulformEmpf: string | null              // Schulformempfehlung
  tsSchulformEmpf: string
  individuelleVersetzungsbemerkungen: string | null
  tsIndividuelleVersetzungsbemerkungen: string
  foerderbemerkungen: string | null
  tsFoerderbemerkungen: string
}

export interface EnmSchueler {
  id: number
  jahrgangID: number
  klasseID: number
  nachname: string
  vorname: string
  geschlecht: Geschlecht
  bilingualeSprache: string | null
  istZieldifferent: boolean
  istDaZFoerderung: boolean
  sprachenfolge: EnmSprachenfolgeEintrag[]
  lernabschnitt: EnmLernabschnitt
  leistungsdaten: EnmLeistungsdaten[]
  ankreuzkompetenzen: unknown[]
  bemerkungen: EnmBemerkungen
  zp10: unknown | null
  bkabschluss: unknown | null
}

// ---------------------------------------------------------------------------
// Root-Export
// ---------------------------------------------------------------------------

export interface EnmExport {
  enmRevision: number
  schulnummer: string
  schuljahr: number
  anzahlAbschnitte: number      // 2 = Halbjahre, 4 = Quartale
  aktuellerAbschnitt: number
  publicKey?: string | null
  lehrerID: unknown            // Vom Server uneinheitlich geliefert; aktuell im UI ungenutzt
  fehlstundenEingabe?: boolean
  fehlstundenSIFachbezogen?: boolean
  fehlstundenSIIFachbezogen?: boolean
  schulform: string             // z.B. "GY", "GE", "RS"
  mailadresse?: string | null
  abteilungen?: unknown[]
  idSchulleitung?: number | null
  idSchulleitungStv?: number | null
  noten: EnmNote[]
  foerderschwerpunkte: unknown[]
  jahrgaenge: EnmJahrgang[]
  klassen: EnmKlasse[]
  floskelgruppen: EnmFloskelgruppe[]
  lehrer: EnmLehrer[]
  faecher: EnmFach[]
  ankreuzkompetenzen: unknown[]
  teilleistungsarten: EnmTeilleistungsart[]
  lerngruppen: EnmLerngruppe[]
  schueler: EnmSchueler[]
}

// ---------------------------------------------------------------------------
// View-Modelle (für die UI aufbereitet, nicht der Raw-Export)
// ---------------------------------------------------------------------------

/**
 * Aufbereitete Klasse für die Konferenzübersicht.
 * Alle Lookups sind bereits aufgelöst.
 */
export interface KonferenzKlasse {
  klasse: EnmKlasse
  jahrgang: EnmJahrgang
  klassenlehrer: EnmLehrer[]
  schueler: KonferenzSchueler[]
  /** Alle Lerngruppen, die Schüler dieser Klasse belegen */
  lerngruppen: EnmLerngruppe[]
  /** Fächer, sortiert nach sortierung */
  faecher: EnmFach[]
}

export interface KonferenzSchueler {
  schueler: EnmSchueler
  /** lerngruppenID → Leistungsdaten */
  leistungenByLerngruppe: Map<number, EnmLeistungsdaten>
}

export interface KonferenzLerngruppe {
  lerngruppe: EnmLerngruppe
  fach: EnmFach
  lehrer: EnmLehrer[]
  schueler: KonferenzSchueler[]
}

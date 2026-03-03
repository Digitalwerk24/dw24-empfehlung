# CLAUDE.md – Digitalwerk24 Vertriebspartner-Landingpage

## Projektübersicht

Dieses Repository enthält die Landingpage für das **Digitalwerk24 Empfehlungsprogramm** (Vertriebspartner-Programm). Die Seite ist unter **empfehlung.digitalwerk24.com** erreichbar und dient ausschließlich der Akquise von Empfehlungspartnern – NICHT der Kundenakquise. Kunden der Hauptseite (digitalwerk24.com) sollen von diesem Programm nichts mitbekommen.

## Geschäftskontext

### Was ist Digitalwerk24?
Digitalwerk24 ist eine digitale Marketing-Agentur, die Handwerksbetriebe und Existenzgründer in der DACH-Region mit professionellen Websites und Google Ads Kampagnen unterstützt. Claim: **"Damit Ihr Telefon wieder klingelt"**.

### Was ist das Empfehlungsprogramm?
Ein offenes Provisionsprogramm, bei dem **jede Person** (Studenten, Freelancer, Nebenjobler, etc.) **199€ einmalige Provision** erhält, wenn sie einen zahlenden Neukunden (Handwerker oder Existenzgründer) an Digitalwerk24 vermittelt.

### Ablauf des Programms
1. Interessent registriert sich über die Landingpage (Name, E-Mail, optional Telefon)
2. Double-Opt-In: Bestätigungsmail mit Verifizierungslink wird automatisch gesendet
3. Nach Bestätigung: Digitalwerk24 vergibt einen individuellen Tracking-Code (z.B. DW24-ANNA01)
4. Partner empfiehlt DW24 an Handwerker/Gründer und gibt den Code weiter
5. Neukunde nennt den Code bei Kontaktaufnahme/Buchung
6. Nach Zahlungseingang des Neukunden wird die Provision fällig
7. Gmail-Entwurf mit Auszahlungs-Info wird automatisch erstellt
8. 199€ werden innerhalb von 14 Tagen per Überweisung/PayPal ausgezahlt

### DW24-Preisstruktur (für Kalkulations-Referenz)
- **1.490€** einmalig – Website + Google Ads Kampagne (Kunde liefert Logo/Bilder)
- **1.750€** einmalig – Website + Google Ads Kampagne inkl. Logo/Bilder-Erstellung
- **49€/Monat** – Laufende Google Ads Überwachung & Optimierung

## Infrastruktur & Deployment

### Tech-Stack
- **Frontend:** Statische HTML/CSS/JS Landingpage (Single-File: index.html)
- **Backend:** Google Apps Script (standalone Web-App, v3.0)
- **Datenbank:** Google Sheets (5 Tabellenblätter)
- **Bankdaten-Formular:** Google Forms (verknüpft mit Sheet)
- **Hosting:** Vercel (Auto-Deploy bei Push auf main)
- **Repository:** github.com/Digitalwerk24/dw24-empfehlung
- **DNS:** Cloudflare
- **Anmeldeformular:** Web3Forms (API-Key: 1cd4f93e-337f-4343-b8e1-da153e720dab)
- **E-Mail:** Gmail (Entwürfe werden automatisch erstellt, manueller Versand)

### Live-URLs
- **Produktion:** https://empfehlung.digitalwerk24.com
- **Vercel-URL:** https://dw24-empfehlung.vercel.app
- **Vercel-Projekt:** dw24-empfehlung (Team: manuels-projects-733e7153)
- **Vercel-Projekt-ID:** prj_d8QzZ8MaeVWorFgUlVl4Nx1HKemw

### DNS-Konfiguration (erledigt ✅)
In Cloudflare wurde folgender DNS-Eintrag für digitalwerk24.com angelegt:

| Typ | Name | Ziel | Proxy-Status | TTL |
|-----|------|------|-------------|-----|
| CNAME | empfehlung | cname.vercel-dns.com | Nur DNS (graue Wolke) | Auto |

**Hinweis:** Vercel empfiehlt optional ein Update des CNAME-Ziels auf `22181005f8ca8e9.vercel-dns-017.com` (IP-Range-Expansion). Der alte Wert funktioniert weiterhin.

### Vercel-Konfiguration (erledigt ✅)
1. ✅ Vercel-Projekt erstellt und mit GitHub-Repository verknüpft
2. ✅ Custom Domain `empfehlung.digitalwerk24.com` hinzugefügt
3. ✅ SSL-Zertifikat automatisch ausgestellt
4. ✅ Auto-Deploy bei Push auf `main` aktiv

### Bestehende DNS-Einträge (digitalwerk24.com)
- **A-Record:** digitalwerk24.com → 216.198.79.1 (Nur DNS)
- **CNAME:** www → cname.vercel-dns.com (Nur DNS)
- **CNAME:** empfehlung → cname.vercel-dns.com (Nur DNS) ✅
- **MX-Records:** Google Workspace (aspmx.l.google.com etc.)

## Backend-System (Google Apps Script + Sheets)

### Google Sheets – Zentrale Datenbank
- **Sheet-ID:** `1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs`
- **URL:** `https://docs.google.com/spreadsheets/d/1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs`

#### Tabellenblätter (5 Stück)

**1. Partner** (Spalten A-J)
| Spalte | Inhalt |
|--------|--------|
| A | Registrierungsdatum |
| B | Vorname |
| C | Nachname |
| D | E-Mail |
| E | Telefon |
| F | Status (Neu / Bestätigt / Aktiv / Inaktiv) |
| G | Empfehlungscode (z.B. DW24-ANNA01) |
| H | Anzahl Empfehlungen |
| I | Erfolgreiche Empfehlungen |
| J | Gesamtprovision |

**2. Empfehlungen** (Spalten A-T)
| Spalte | Inhalt |
|--------|--------|
| A | Empfehlungsdatum |
| B | Empfehlungscode |
| C | Partner-Name (automatisch aus Partner-Sheet) |
| D | Partner-E-Mail (automatisch) |
| E | Empfohlener Name |
| F | Empfohlener Kontakt |
| G | Branche/Gewerk |
| H | Status (Offen / Kontaktiert / Angebot / Abgeschlossen / Storniert) |
| I | Paket (Website 1.490€ / Website+ 1.750€) |
| J | Notizen |
| K | Provisionsstatus (Offen / Fällig / Ausgezahlt) |
| L | Kunde bezahlt am (Datum → löst Auszahlungs-Workflow aus) |
| M | Provision fällig (automatisch "Ja" bei Datumeintrag in L) |
| N | Auszahlungsdatum |
| O | Auszahlungsbetrag |
| P | Zahlungsreferenz |
| Q | Gmail-Entwurf erstellt (automatisch "Ja") |
| R | IBAN (aus Bankdaten-Formular) |
| S | PayPal (aus Bankdaten-Formular) |
| T | Steuernr (aus Bankdaten-Formular) |

**3. Auszahlungen** (Spalten A-H)
| Spalte | Inhalt |
|--------|--------|
| A | Auszahlungsdatum |
| B | Empfehlungscode |
| C | Partner-Name |
| D | Betrag |
| E | Zahlungsmethode (Überweisung / PayPal) |
| F | Referenz/Verwendungszweck |
| G | Status (Ausstehend / Ausgezahlt) |
| H | Notizen |

**4. Dashboard** (Übersichtskennzahlen)
- Gesamt-Partner, Aktive Partner, Gesamt-Empfehlungen
- Erfolgsquote, Gesamt-Provisionen, Ausstehende Auszahlungen

**5. Formularantworten** (automatisch durch Google Form)
- Wird von Google Forms automatisch befüllt wenn Partner Bankdaten einreichen
- Verknüpft mit dem Google Formular "Bankdaten für Provisionsauszahlung"

### Google Apps Script – Web-App v3.0
- **Projekt-Name:** "Digitalwerk24 Kalender" (im Google Workspace digitalwerk24.com)
- **Projekt-URL:** `https://script.google.com/home/projects/1LFxZh7lzKt-evL2WCR6W9NC0KOqyFOxbeDiw2Gf4ODQzFObZEuGN1Uhf/edit`
- **Web-App-URL:** `https://script.google.com/macros/s/AKfycbyHk5k5rTEYL5GbYqkXV58ufhLIWCyWhjOdDdDynA2hWVebf92T6ZMvUj4uKfN0TTCY/exec`
- **Aktuelle Version:** Version 3 (deployed 03.03.2026, 16:01)
- **Bereitstellung:** öffentlich ("Jeder"), ausgeführt als hello@digitalwerk24.com
- **Projekttyp:** Standalone (NICHT an Spreadsheet gebunden)
- **Lokale Referenzkopie:** `google-apps-script.gs` (im Repository)

#### Funktionen im Apps Script

| Funktion | Zweck | Trigger |
|----------|-------|---------|
| `doPost(e)` | Web-App-Endpunkt: Empfängt Registrierungen von der Landingpage, erstellt Partner-Eintrag, sendet DOI-Mail | HTTP POST von index.html |
| `doGet(e)` | Double-Opt-In: Verarbeitet Bestätigungslinks (?action=confirm&token=...), setzt Status auf "Bestätigt" | HTTP GET (Klick auf DOI-Link) |
| `generateToken(email)` | Erstellt SHA-256 Token aus E-Mail + Secret für DOI-Verifizierung | Intern |
| `onEditTrigger(e)` | Auszahlungs-Workflow: Überwacht Spalte L ("Kunde bezahlt am"), setzt Spalte M auf "Ja", erstellt Gmail-Entwurf | Installable Trigger (onEdit) |
| `createProvisionDraft(...)` | Erstellt Gmail-ENTWURF mit Provisions-Benachrichtigung + Bankdaten-Formular-Link | Von onEditTrigger aufgerufen |
| `onFormSubmit(e)` | Liest Bankdaten aus Google Form, schreibt IBAN/PayPal/Steuernr in Empfehlungen-Sheet (Spalten R/S/T) | Installable Trigger (onFormSubmit) |
| `setupTriggers()` | Erstellt beide installable Triggers programmatisch (da standalone Projekt) | Manuell einmalig ausgeführt |

#### Konstanten im Script
```javascript
const SHEET_ID = '1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs';
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd9WOmH_foMe6oDW3XcUjpcX3n97x1QoG5qOIFvjYWkFagVUQ/viewform';
const FORM_ENTRY_EMPFEHLUNGSCODE = '1708813850';
const DOI_SECRET = 'DW24-SECRET-2024';
```

#### Installable Triggers (aktiv ✅)
1. **onEditTrigger** – Typ: "bei Bearbeitung" auf dem Spreadsheet
2. **onFormSubmit** – Typ: "bei Formularantwort" auf dem Spreadsheet

**Hinweis:** Triggers mussten programmatisch über `setupTriggers()` erstellt werden, da standalone Apps Script Projekte in der UI keine "Aus Tabelle"-Option anbieten.

### Google Formular – Bankdaten für Provisionsauszahlung
- **Formular-URL (öffentlich):** `https://docs.google.com/forms/d/e/1FAIpQLSd9WOmH_foMe6oDW3XcUjpcX3n97x1QoG5qOIFvjYWkFagVUQ/viewform`
- **Bearbeitungs-URL:** `https://docs.google.com/forms/d/1lYP6SgdaBUAJWk5NY8zSHiBjqlr5LJXri3_nn_bwMDc/edit`
- **Form-ID:** `1lYP6SgdaBUAJWk5NY8zSHiBjqlr5LJXri3_nn_bwMDc`
- **Empfehlungscode-Feld-ID:** `1708813850`
- **Ziel-Sheet:** Formularantworten (im gleichen Google Sheet)

#### Formular-Felder (9 Stück)
1. Empfehlungscode (Kurzantwort, Pflicht) – wird per Pre-Fill-URL automatisch ausgefüllt
2. Vollständiger Name (Kurzantwort, Pflicht)
3. Bevorzugte Auszahlungsmethode (Multiple Choice: Überweisung / PayPal)
4. IBAN (Kurzantwort, optional)
5. BIC/SWIFT (Kurzantwort, optional)
6. PayPal E-Mail-Adresse (Kurzantwort, optional)
7. Rechnungsadresse (Absatz, Pflicht)
8. Steuernummer / USt-IdNr. (Kurzantwort, optional)
9. Art der Tätigkeit (Multiple Choice: Privat / Gewerblich/Freiberuflich)

#### Pre-Fill-URL Format
```
https://docs.google.com/forms/d/e/1FAIpQLSd9WOmH_foMe6oDW3XcUjpcX3n97x1QoG5qOIFvjYWkFagVUQ/viewform?usp=pp_url&entry.1708813850=DW24-XXXX01
```
Der Empfehlungscode wird automatisch in den Gmail-Entwurf eingebettet, sodass Partner nur auf den Link klicken müssen.

### Double-Opt-In (DOI) System
- Registrierung über Landingpage → `doPost()` erstellt Partner mit Status "Neu"
- Bestätigungsmail wird automatisch via `GmailApp.sendEmail()` gesendet
- DOI-Link: `WEB_APP_URL?action=confirm&token=SHA256(email+secret)&email=base64(email)`
- Klick auf Link → `doGet()` setzt Status auf "Bestätigt"
- Bestätigungsseite zeigt Erfolgsmeldung mit DW24-Branding
- Token-Validierung verhindert Manipulation

### Auszahlungs-Workflow (semi-automatisch)
**Ablauf:**
1. Manuel trägt Datum in Spalte L ("Kunde bezahlt am") im Empfehlungen-Sheet ein
2. `onEditTrigger` wird automatisch ausgelöst
3. Spalte M ("Provision fällig") wird auf "Ja" gesetzt
4. Script prüft, ob Partner bereits Bankdaten hinterlegt hat (Spalte R/S)
5. Gmail-ENTWURF wird automatisch erstellt:
   - **Mit Bankdaten:** "Deine Provision ist unterwegs!" – Auszahlung wird angekündigt
   - **Ohne Bankdaten:** "Deine Provision wartet!" – Link zum Bankdaten-Formular (mit Pre-Fill)
6. Spalte Q wird auf "Ja" gesetzt (Gmail-Entwurf erstellt)
7. Manuel prüft Entwurf in Gmail und sendet manuell ab
8. Partner füllt ggf. Bankdaten-Formular aus → `onFormSubmit` schreibt Daten in Spalten R/S/T

## Anforderungen an die Landingpage

### Ziel der Seite
Maximale Conversion: Besucher sollen sich als Empfehlungspartner registrieren. Keine Ablenkung, kein Navigationsmenü zur Hauptseite, keine Verlinkung zu digitalwerk24.com.

### Seitenstruktur

#### 1. Hero-Bereich
- **Headline:** "Verdiene 199€ pro Empfehlung"
- **Subline:** "Einfach einen Handwerker oder Gründer empfehlen – wir kümmern uns um den Rest"
- Prominenter CTA-Button: "Jetzt Partner werden"

#### 2. So funktioniert's
3-Schritte-Darstellung:
- **Schritt 1:** Anmelden – Kostenloses Registrieren in 30 Sekunden
- **Schritt 2:** Empfehlen – Code an Handwerker oder Gründer weitergeben
- **Schritt 3:** Kassieren – 199€ erhalten, sobald der Kunde bezahlt hat

#### 3. Für wen ist das Programm?
Kurze Auflistung der Zielgruppen:
- Studenten & Nebenjobler
- Freelancer & Vertriebler
- Jeder, der Handwerker oder Gründer im Bekanntenkreis hat

#### 4. Anmeldeformular
Felder:
- Vorname & Nachname (Pflicht)
- E-Mail-Adresse (Pflicht)
- Telefon (optional)
- Checkbox: Teilnahmebedingungen akzeptieren

**Formular-Ablauf:**
1. Web3Forms sendet E-Mail an hello@digitalwerk24.com (Backup)
2. Parallel: AJAX POST an Apps Script Web-App
3. Apps Script erstellt Partner-Eintrag im Google Sheet
4. DOI-Bestätigungsmail wird automatisch gesendet
5. Erfolgs-/Fehlermeldung wird auf der Seite angezeigt

#### 5. FAQ-Bereich
- Wann wird die Provision ausgezahlt? → Innerhalb von 14 Tagen nach Zahlungseingang des Neukunden
- Wie oft kann ich empfehlen? → Unbegrenzt. Für jede erfolgreiche Vermittlung gibt es 199€
- Muss ich Steuern auf die Provision zahlen? → Die Provision ist als sonstige Einkünfte steuerpflichtig. Bitte informiere dich bei deinem Steuerberater
- Was genau macht Digitalwerk24? → Wir erstellen professionelle Websites und Google Ads Kampagnen für Handwerker und Existenzgründer
- Wer kann mitmachen? → Jeder ab 18 Jahren mit Wohnsitz in Deutschland, Österreich oder der Schweiz

#### 6. Footer
- Impressum-Link
- Datenschutz-Link
- Kontakt: hello@digitalwerk24.com
- KEIN Link zur Hauptseite digitalwerk24.com

### Design-Richtlinien
- **Primärfarbe (Orange):** #F97316
- **Dunkel:** #1E293B
- **Grau:** #64748B
- **Hintergrund:** #F8FAFC
- **Akzent/Border:** #E2E8F0
- Modern, clean, mobile-first
- DW24-Logo verwenden (wird als DW-24-Logo.png bereitgestellt)
- Keine Verbindung/Verlinkung zur Hauptseite

### Wichtige Hinweise
- Die Seite muss **komplett eigenständig** sein – kein gemeinsamer Header/Footer mit der Hauptseite
- **Kein SEO nötig** – die Seite wird ausschließlich über bezahlte Ads und direkte Links beworben
- **Mobile-First** – die meisten Besucher kommen über Facebook/Instagram Ads auf dem Handy
- **Schnelle Ladezeit** – statische Seite bevorzugt, kein unnötiges JavaScript-Framework
- **DSGVO-konform** – Datenschutzerklärung, Cookie-Hinweis falls nötig, Impressum

## Unternehmensstruktur (für Impressum/Rechtliches)

- **Betreiber:** Revis-1 LLC / Digitalwerk24
- **Adresse:** 2645 Executive Park Dr, 33331 Weston FL, USA
- **E-Mail:** partner@digitalwerk24.com
- **Hinweis:** B2B-Transaktionen in der EU laufen über Reverse-Charge §13b UStG

## Projektstatus (Stand: 03.03.2026)

### Fertig & Live

#### Frontend (Landingpage)
- Komplette Landingpage (index.html) als statische Single-File-Lösung (~1300 Zeilen)
- Alle Sektionen umgesetzt: Header, Hero (animierter 199€-Betrag), Verdienstrechner (1/5/10 Empfehlungen), 3-Schritte-Prozess, Zielgruppen-Karten, Trust-Badges, Anmeldeformular, FAQ-Akkordeon (7 Fragen), CTAs nach jedem Abschnitt, Footer
- Impressum & Datenschutz als Modal-Overlays (DSGVO-konform)
- Anmeldeformular: Web3Forms (Backup-E-Mail) + Apps Script Web-App (Datenbank + DOI)
- Bot-Schutz über Honeypot-Feld
- Mobile-First responsive Design
- Scroll-Animationen via IntersectionObserver (fade-in Effekte)
- DW24-Logo im Header und Footer eingebunden
- `noindex, nofollow` Meta-Tag (kein SEO nötig, nur Ads-Traffic)
- Facebook Pixel Platzhalter-Kommentar im Head vorbereitet

#### Backend (Google Apps Script v3.0)
- Google Sheets Datenbank mit 5 Tabellenblättern (Partner, Empfehlungen, Auszahlungen, Dashboard, Formularantworten)
- Apps Script v3.0 deployed als Web-App (Version 3, 03.03.2026)
- Double-Opt-In (DOI) System komplett implementiert:
  - Automatische Bestätigungsmail bei Registrierung
  - SHA-256 Token-basierte Verifizierung
  - Bestätigungsseite mit DW24-Branding
  - Status-Update von "Neu" → "Bestätigt"
- Auszahlungs-Workflow (DW24-EP-011) implementiert:
  - `onEditTrigger`: Überwacht "Kunde bezahlt am"-Spalte
  - `createProvisionDraft`: Erstellt Gmail-Entwürfe automatisch
  - Zwei Varianten: mit/ohne Bankdaten (unterschiedliche E-Mail-Texte)
  - Pre-Fill-Link zum Bankdaten-Formular in E-Mail eingebettet
- Google Formular "Bankdaten für Provisionsauszahlung" erstellt und verknüpft
- `onFormSubmit`: Schreibt Bankdaten automatisch in Empfehlungen-Sheet
- Installable Triggers aktiv (programmatisch erstellt via `setupTriggers()`)
- Duplikat-Prüfung bei Registrierung (E-Mail bereits vorhanden)

#### Deployment & Hosting
- GitHub Repository erstellt und Code gepusht (github.com/Digitalwerk24/dw24-empfehlung)
- Vercel-Projekt erstellt und mit GitHub verknüpft (Auto-Deploy aktiv)
- Custom Domain empfehlung.digitalwerk24.com konfiguriert und SSL aktiv
- Seite live erreichbar unter https://empfehlung.digitalwerk24.com

### Offen / TODO
- **Formular End-to-End testen:** Kompletten Flow durchspielen (Registrierung → DOI → Empfehlung eintragen → Bezahlung markieren → Gmail-Entwurf → Bankdaten-Formular)
- **Mobile-Ansicht testen:** Detaillierter Test auf echtem Smartphone
- **Facebook Pixel:** Pixel-ID einsetzen sobald Ads-Kampagne erstellt wird
- **Testdaten bereinigen:** DW24-TEST01 und DW24-TEST02 aus Partner-Sheet löschen
- **Optional:** CNAME in Cloudflare auf neuen Vercel-Wert aktualisieren (`22181005f8ca8e9.vercel-dns-017.com`)

## Deployment-Checkliste

### Frontend
- [x] Landingpage entwickeln (HTML/CSS/JS)
- [x] Anmeldeformular mit Web3Forms einrichten
- [x] DOI-Integration in Formular (AJAX POST an Apps Script)
- [x] Code in GitHub-Repository pushen
- [x] Vercel-Projekt erstellen und mit Repo verknüpfen
- [x] Custom Domain `empfehlung.digitalwerk24.com` in Vercel hinzufügen
- [x] SSL-Zertifikat prüfen (automatisch ausgestellt)
- [x] Impressum & Datenschutz einbinden (als Modals)
- [ ] Mobile-Ansicht testen (auf echtem Gerät)
- [ ] Facebook Pixel / Conversion-Tracking einbauen (für spätere Ads)

### Backend
- [x] Google Sheets Datenbank erstellen (5 Tabellenblätter)
- [x] Apps Script v1.0: Basis-Registrierung (doPost)
- [x] Apps Script v2.0: Double-Opt-In System (doPost + doGet + generateToken)
- [x] Apps Script v3.0: Auszahlungs-Workflow (onEditTrigger + createProvisionDraft + onFormSubmit)
- [x] Google Formular "Bankdaten für Provisionsauszahlung" erstellen
- [x] Formular mit Google Sheet verknüpfen (Formularantworten-Tab)
- [x] Installable Triggers einrichten (onEdit + onFormSubmit)
- [x] Version 3 deployen (03.03.2026, 16:01)
- [ ] End-to-End Test des kompletten Workflows
- [ ] Testdaten bereinigen

## Technische Details

### Registrierungsformular (Landingpage)
- **Web3Forms:** API-Key 1cd4f93e-337f-4343-b8e1-da153e720dab (Backup-E-Mail an hello@digitalwerk24.com)
- **Apps Script:** POST an Web-App-URL mit JSON-Body (vorname, nachname, email, telefon)
- **Bot-Schutz:** Honeypot-Feld (botcheck)
- **Fehlerbehandlung:** Bei Apps Script Fehler → Web3Forms als Fallback, Hinweis auf hello@digitalwerk24.com

### Wichtige IDs & URLs (Referenz)

| Ressource | Wert |
|-----------|------|
| Sheet-ID | `1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs` |
| Apps Script Projekt | `1LFxZh7lzKt-evL2WCR6W9NC0KOqyFOxbeDiw2Gf4ODQzFObZEuGN1Uhf` |
| Web-App-URL | `https://script.google.com/macros/s/AKfycbyHk5k5rTEYL5GbYqkXV58ufhLIWCyWhjOdDdDynA2hWVebf92T6ZMvUj4uKfN0TTCY/exec` |
| Google Form ID | `1lYP6SgdaBUAJWk5NY8zSHiBjqlr5LJXri3_nn_bwMDc` |
| Form Empfehlungscode-Feld | `1708813850` |
| Web3Forms API-Key | `1cd4f93e-337f-4343-b8e1-da153e720dab` |
| Vercel Projekt-ID | `prj_d8QzZ8MaeVWorFgUlVl4Nx1HKemw` |
| GitHub Repo | `Digitalwerk24/dw24-empfehlung` |

### Git-Verlauf (relevante Commits)
- `03b6586` – Auszahlungs-Workflow (v3.0): onEditTrigger, Gmail-Entwurf, Bankdaten-Formular (03.03.2026)
- Vorherige Commits: DOI-System, Landingpage-Erstellung, Vercel-Deployment

### Dateien im Repository
- `index.html` – Komplette Landingpage (HTML/CSS/JS in einer Datei)
- `google-apps-script.gs` – Lokale Referenzkopie des Apps Script Codes (v3.0)
- `CLAUDE.md` – Diese Projektdokumentation
- `STARTPROMPT.md` – Initialer Projektbrief
- `DW24-Empfehlungsprogramm-Sheets-Anleitung.md` – Anleitung für die Sheets-Verwaltung

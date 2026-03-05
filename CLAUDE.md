# CLAUDE.md – Digitalwerk24 Vertriebspartner-Landingpage

## Projektübersicht

Dieses Repository enthält die Landingpage für das **Digitalwerk24 Empfehlungsprogramm** (Vertriebspartner-Programm). Die Seite ist unter **empfehlung.digitalwerk24.com** erreichbar und dient ausschließlich der Akquise von Empfehlungspartnern – NICHT der Kundenakquise. Kunden der Hauptseite (digitalwerk24.com) sollen von diesem Programm nichts mitbekommen.

## Geschäftskontext

### Was ist Digitalwerk24?
Digitalwerk24 ist eine digitale Marketing-Agentur, die Handwerksbetriebe und Existenzgründer in der DACH-Region mit professionellen Websites und Google Ads Kampagnen unterstützt. Claim: **"Damit Ihr Telefon wieder klingelt"**.

### Was ist das Empfehlungsprogramm?
Ein offenes Provisionsprogramm, bei dem **jede Person** (Studenten, Freelancer, Nebenjobler, etc.) **199€ einmalige Provision** erhält, wenn sie einen zahlenden Neukunden (Handwerker oder Existenzgründer) an Digitalwerk24 vermittelt.

### Ablauf des Programms
1. Interessent registriert sich über die Landingpage (Name, Firma, Steuernr., E-Mail, optional Telefon)
2. Double-Opt-In: Bestätigungsmail mit Verifizierungslink wird automatisch gesendet
3. Nach Bestätigung: Digitalwerk24 vergibt einen individuellen Tracking-Code (z.B. DW24-ANNA01)
4. Partner loggt sich im Dashboard ein (empfehlung.digitalwerk24.com/partner)
5. Partner empfiehlt DW24 an Handwerker/Gründer und trägt Empfehlung im Dashboard ein
6. Neukunde nennt den Code bei Kontaktaufnahme/Buchung
7. Nach Zahlungseingang des Neukunden wird die Provision fällig
8. Gmail-Entwurf mit Auszahlungs-Info wird automatisch erstellt
9. 199€ werden innerhalb von 14 Tagen per Überweisung/PayPal ausgezahlt

### DW24-Preisstruktur (für Kalkulations-Referenz)
- **1.490€** einmalig – Website + Google Ads Kampagne (Kunde liefert Logo/Bilder)
- **1.750€** einmalig – Website + Google Ads Kampagne inkl. Logo/Bilder-Erstellung
- **49€/Monat** – Laufende Google Ads Überwachung & Optimierung

## Infrastruktur & Deployment

### Tech-Stack
- **Frontend:** Statische HTML/CSS/JS (index.html + partner.html)
- **Backend:** Google Apps Script (standalone Web-App, v4.4)
- **Datenbank:** Google Sheets (6 Tabellenblätter)
- **Bankdaten-Formular:** Google Forms (verknüpft mit Sheet) + Partner-Dashboard
- **Hosting:** Vercel (Auto-Deploy bei Push auf main)
- **Repository:** github.com/Digitalwerk24/dw24-empfehlung
- **DNS:** Cloudflare
- **Anmeldeformular:** Web3Forms (API-Key: 1cd4f93e-337f-4343-b8e1-da153e720dab)
- **E-Mail:** Gmail (Entwürfe werden automatisch erstellt, manueller Versand)
- **Partner-Dashboard:** partner.html (Login mit E-Mail + Empfehlungscode)

### Live-URLs
- **Produktion (primär):** https://empfehlung.digitalwerk24.com
- **Produktion (alias):** https://vertriebspartner.digitalwerk24.com
- **Partner-Dashboard:** https://empfehlung.digitalwerk24.com/partner
- **Vercel-URL:** https://dw24-empfehlung.vercel.app
- **Vercel-Projekt:** dw24-empfehlung (Team: manuels-projects-733e7153)
- **Vercel-Projekt-ID:** prj_d8QzZ8MaeVWorFgUlVl4Nx1HKemw

### DNS-Konfiguration (erledigt ✅)
In Cloudflare wurden folgende DNS-Einträge für digitalwerk24.com angelegt:

| Typ | Name | Ziel | Proxy-Status | TTL |
|-----|------|------|-------------|-----|
| CNAME | empfehlung | cname.vercel-dns.com | Nur DNS (graue Wolke) | Auto |
| CNAME | vertriebspartner | cname.vercel-dns.com | Nur DNS (graue Wolke) | Auto |

**Hinweis:** Vercel empfiehlt optional ein Update des CNAME-Ziels auf `22181005f8ca8e9.vercel-dns-017.com` (IP-Range-Expansion). Der alte Wert funktioniert weiterhin.

### Vercel-Konfiguration (erledigt ✅)
1. ✅ Vercel-Projekt erstellt und mit GitHub-Repository verknüpft
2. ✅ Custom Domain `empfehlung.digitalwerk24.com` hinzugefügt
3. ✅ Custom Domain `vertriebspartner.digitalwerk24.com` hinzugefügt (03.03.2026)
4. ✅ SSL-Zertifikate automatisch ausgestellt
5. ✅ Auto-Deploy bei Push auf `main` aktiv

### Bestehende DNS-Einträge (digitalwerk24.com)
- **A-Record:** digitalwerk24.com → 216.198.79.1 (Nur DNS)
- **CNAME:** www → cname.vercel-dns.com (Nur DNS)
- **CNAME:** empfehlung → cname.vercel-dns.com (Nur DNS) ✅
- **CNAME:** vertriebspartner → cname.vercel-dns.com (Nur DNS) ✅
- **MX-Records:** Google Workspace (aspmx.l.google.com etc.)

## Backend-System (Google Apps Script + Sheets)

### Google Sheets – Zentrale Datenbank
- **Sheet-ID:** `1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs`
- **URL:** `https://docs.google.com/spreadsheets/d/1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs`

#### Tabellenblätter (6 Stück)

**1. Partner** (Spalten A-V) – TATSÄCHLICHES Layout im Sheet
| Spalte | Inhalt |
|--------|--------|
| A | Partner-ID (z.B. DW24-TEST01) |
| B | Vorname |
| C | Nachname |
| D | E-Mail |
| E | Telefon |
| F | Empfehlungscode (z.B. DW24-ANNA01) |
| G | Status (Neu / Bestätigt / Aktiv / Inaktiv) |
| H | Registrierung am |
| I | Double-Opt-In am |
| J | DSE-Version |
| K | TB-Version |
| L | Consent-IP |
| M | Anzahl Empfehlungen (Formel: `=ZÄHLENWENN(Empfehlungen!B:B;F2)`) |
| N | Davon abgeschlossen (Formel: `=ZÄHLENWENNS(Empfehlungen!B:B;F2;Empfehlungen!I:I;"Abgeschlossen")`) |
| O | Offene Provisionen (Formel: `=ZÄHLENWENNS(...L:L;"Ja";...M:M;"Nein")*199`) |
| P | Ausgezahlte Provisionen (Formel: `=SUMMENPRODUKT(Auszahlungen!B2:B1000=F2)*E2:E1000)`) |
| Q | Gesamt-Provisionen (Formel: `=O2+P2`) |
| R | IBAN |
| S | PayPal |
| T | Steuernr./USt-ID (wird bei Registrierung erfasst) |
| U | Notizen |
| V | Firma / Unternehmen (NEU v4.4, wird bei Registrierung erfasst) |

**2. Empfehlungen** (Spalten A-N) – TATSÄCHLICHES Layout im Sheet
| Spalte | Inhalt |
|--------|--------|
| A | Empfehlungs-ID |
| B | Empfehlungscode |
| C | Partner-Name |
| D | Empfohlener Name |
| E | Empfohlene E-Mail/Firma |
| F | Empfohlenes Telefon |
| G | Branche/Gewerk |
| H | Empfohlen am |
| I | Status (Offen / Kontaktiert / Angebot / Abgeschlossen / Storniert) |
| J | DW24-Auftragsnr. |
| K | Kunde bezahlt am (Datum → löst Auszahlungs-Workflow aus) |
| L | Provision fällig (automatisch "Ja" bei Datumeintrag in K) |
| M | Provision ausgezahlt |
| N | Notizen |

**3. Auszahlungen** (Spalten A-J) – TATSÄCHLICHES Layout im Sheet
| Spalte | Inhalt |
|--------|--------|
| A | Auszahlungs-ID |
| B | Empfehlungscode |
| C | Partner-Name |
| D | Empfehlungs-ID |
| E | Betrag (EUR) |
| F | Auszahlungsdatum |
| G | Zahlungsmethode (Überweisung / PayPal) |
| H | Referenz/Buchungsnr. |
| I | Status (Ausstehend / Ausgezahlt) |
| J | Notizen |

**4. Dashboard** (Übersichtskennzahlen)
- Gesamt-Partner, Aktive Partner, Gesamt-Empfehlungen
- Erfolgsquote, Gesamt-Provisionen, Ausstehende Auszahlungen

**5. Formularantworten** (automatisch durch Google Form)
- Wird von Google Forms automatisch befüllt wenn Partner Bankdaten einreichen
- Verknüpft mit dem Google Formular "Bankdaten für Provisionsauszahlung"

**6. Partner-Empfehlungen** (NEU in v4.2) – Separate Detail-Liste zum Nachfassen
| Spalte | Inhalt |
|--------|--------|
| A | ID (PE-001, PE-002, ...) |
| B | Empfehlungscode |
| C | Partner-Name |
| D | Vorname (des Empfohlenen) |
| E | Nachname (des Empfohlenen) |
| F | Firma |
| G | Telefon |
| H | E-Mail |
| I | Adresse |
| J | Branche/Gewerk |
| K | Eingereicht am |
| L | Status (Neu / Kontaktiert / In Bearbeitung / Abgeschlossen / Abgelehnt) |
| M | Notizen |
- Wird automatisch vom Apps Script erstellt wenn Partner erste Empfehlung einträgt
- Partner tragen Empfehlungen über ihr Dashboard ein
- Jede Empfehlung wird parallel auch ins Empfehlungen-Sheet geschrieben (für Provisions-Workflow)

### Google Apps Script – Web-App v4.4
- **Projekt-Name:** "Digitalwerk24 Kalender" (im Google Workspace digitalwerk24.com)
- **Projekt-URL:** `https://script.google.com/home/projects/1LFxZh7lzKt-evL2WCR6W9NC0KOqyFOxbeDiw2Gf4ODQzFObZEuGN1Uhf/edit`
- **Web-App-URL:** `https://script.google.com/macros/s/AKfycbxlffSrXJ59kyr4ElFNIlen6n1-h4SizOHGwXyxymdt3kKlHSWTLzs-DHzMu6Cj_Wr5/exec`
- **Aktuelle Version:** Version 9 (deployed 04.03.2026, 19:36) – v4.4 Firma + Steuernr. bei Registrierung, Gutschriftverfahren
- **Bereitstellung:** öffentlich ("Jeder"), ausgeführt als hello@digitalwerk24.com
- **Projekttyp:** Standalone (NICHT an Spreadsheet gebunden)
- **Lokale Referenzkopie:** `google-apps-script.gs` (im Repository)

#### Funktionen im Apps Script

| Funktion | Zweck | Trigger |
|----------|-------|---------|
| `doPost(e)` | Zentraler POST-Endpoint mit Action-Routing (register/login/saveBankData/submitReferral/editReferral) | HTTP POST |
| `handleRegistration(data)` | Partner-Registrierung: Schreibt Partner ins Sheet + sendet DOI-Mail | Von doPost (action=register) |
| `handleLogin(data)` | Partner-Login: Validiert E-Mail + Code, gibt Dashboard-Daten + Empfehlungen (inkl. PE-Details) zurück | Von doPost (action=login) |
| `handleSaveBankData(data)` | Bankdaten speichern/aktualisieren aus dem Partner-Dashboard | Von doPost (action=saveBankData) |
| `handleSubmitReferral(data)` | Partner trägt Empfehlung ein → schreibt in Partner-Empfehlungen + Empfehlungen Sheet | Von doPost (action=submitReferral) |
| `handleEditReferral(data)` | **NEU v4.3:** Partner bearbeitet bestehende Empfehlung → aktualisiert Partner-Empfehlungen + Empfehlungen Sheet | Von doPost (action=editReferral) |
| `doGet(e)` | Health-Check + Double-Opt-In Bestätigung | HTTP GET (DOI-Link) |
| `sendDoubleOptIn(...)` | Sendet Bestätigungsmail mit Verifizierungslink | Von handleRegistration |
| `handleConfirmation(...)` | Verarbeitet DOI-Bestätigung, zeigt Erfolgsseite mit Code + Dashboard-Link | Von doGet |
| `onEditTrigger(e)` | Auszahlungs-Workflow: Überwacht Spalte L, erstellt Gmail-Entwurf | Installable Trigger (onEdit) |
| `createProvisionDraft(...)` | Erstellt Gmail-ENTWURF mit Provisions-Benachrichtigung + Dashboard-/Formular-Link | Von onEditTrigger |
| `onFormSubmit(e)` | Liest Bankdaten aus Google Form, schreibt in Partner-Sheet (Spalten R/S/T) | Installable Trigger (onFormSubmit) |
| `setupTriggers()` | Erstellt beide installable Triggers programmatisch | Manuell einmalig |

#### doPost Action-Routing
```
POST /exec
Body: { "action": "register", "vorname": "...", ... }  → Partner-Registrierung
Body: { "action": "login", "email": "...", "code": "DW24-..." }  → Partner-Login + Dashboard-Daten
Body: { "action": "saveBankData", "email": "...", "code": "...", "iban": "...", ... }  → Bankdaten speichern
Body: { "action": "forgotCode", "email": "..." }  → Empfehlungscode per E-Mail erneut senden
Body: { "action": "submitReferral", "email": "...", "code": "...", "refVorname": "...", "refNachname": "...", ... }  → Empfehlung eintragen
Body: { "action": "editReferral", "email": "...", "code": "...", "peId": "PE-001", "refVorname": "...", ... }  → Empfehlung bearbeiten (NEU v4.3)
```

#### Konstanten im Script
```javascript
const SHEET_ID = '1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs';
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd9WOmH_foMe6oDW3XcUjpcX3n97x1QoG5qOIFvjYWkFagVUQ/viewform';
const FORM_ENTRY_EMPFEHLUNGSCODE = '1708813850';
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
- Firma / Unternehmen (Pflicht, NEU v4.4)
- Steuernummer / USt-IdNr. (Pflicht, NEU v4.4)
- E-Mail-Adresse (Pflicht)
- Telefon (optional)
- Checkbox: Teilnahmebedingungen akzeptieren
- Hinweistext: "Eine Gewerbeanmeldung bzw. Kleingewerbe ist Voraussetzung für die Teilnahme."

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
- Muss ich eine Rechnung stellen? → Nein, Gutschrift gem. § 14 Abs. 2 UStG wird automatisch erstellt (NEU v4.4)
- Was genau macht Digitalwerk24? → Wir erstellen professionelle Websites und Google Ads Kampagnen für Handwerker und Existenzgründer
- Wer kann mitmachen? → Jeder ab 18 Jahren mit Gewerbeanmeldung (oder Kleingewerbe) und Wohnsitz in DACH (aktualisiert v4.4)

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

## Projektstatus (Stand: 04.03.2026)

### Fertig & Live

#### Frontend (Landingpage + Partner-Dashboard)
- Komplette Landingpage (index.html) als statische Single-File-Lösung
- Alle Sektionen umgesetzt: Header, Hero (animierter 199€-Betrag), Verdienstrechner (1/5/10 Empfehlungen), 3-Schritte-Prozess, Zielgruppen-Karten, Trust-Badges, Anmeldeformular, FAQ-Akkordeon (9 Fragen), CTAs nach jedem Abschnitt, Footer
- Impressum & Datenschutz als Modal-Overlays (DSGVO-konform)
- Anmeldeformular: Web3Forms (Backup-E-Mail) + Apps Script Web-App (Datenbank + DOI)
- Bot-Schutz über Honeypot-Feld
- Mobile-First responsive Design
- Scroll-Animationen via IntersectionObserver (fade-in Effekte)
- DW24-Logo im Header und Footer eingebunden
- `noindex, nofollow` Meta-Tag (kein SEO nötig, nur Ads-Traffic)
- Facebook Pixel Platzhalter-Kommentar im Head vorbereitet
- **Google Analytics:** G-1XWYSG8LLW (DSGVO-konform: lädt erst nach Cookie-Einwilligung, Consent Mode v2)
- **Partner-Login-Button** im Header der Landingpage (verlinkt auf partner.html)
- **Partner-Login-Link** im Footer der Landingpage
- **Hinweis auf Partner-Dashboard** in der Registrierungs-Erfolgsseite

#### Partner-Dashboard (partner.html)
- Eigenständige Dashboard-Seite unter `/partner`
- **Login:** E-Mail-Adresse + Empfehlungscode als Zugangsdaten
- **DOI-Prüfung:** Login nur möglich nach E-Mail-Bestätigung
- **Statistik-Karten:** Anzahl Empfehlungen, Abgeschlossene, Gesamtprovision, Ausgezahlt
- **Empfehlungen-Liste:** Alle Empfehlungen mit Status (Neu/Kontaktiert/Angebot/Abgeschlossen/Abgelehnt), Datum, Branche + Provisions-Status
- **Empfehlung bearbeiten:** Partner können eingetragene Empfehlungen nachträglich bearbeiten (alle Felder außer Status, Modal-Dialog mit Vorausfüllung)
- **Firma/Steuernr. Anzeige:** Firma + Steuernummer im Dashboard-Header (NEU v4.4)
- **Gutschrift-Hinweis:** Info-Box vor dem Bankdaten-Formular über automatische Gutschrift gem. § 14 Abs. 2 UStG (NEU v4.4)
- **Bankdaten-Formular:** Firma (Pflicht), IBAN/PayPal, BIC, strukturierte Adressfelder (Straße, PLZ, Ort, Land-Dropdown DE/AT/CH), Steuernummer (Pflicht), Art der Tätigkeit (v4.4: Freitext-Adresse durch strukturierte Felder ersetzt)
- **Bankdaten-Status:** Anzeige ob Bankdaten vorhanden sind oder noch fehlen
- **Auto-Login:** Session wird via sessionStorage gespeichert (kein erneuter Login bei Seitenaktualisierung)
- **Code-Kopieren:** Klick auf Empfehlungscode kopiert in Zwischenablage (mit Toast-Benachrichtigung)
- **XSS-Schutz:** HTML-Escaping bei allen Benutzerdaten
- **Empfehlung eintragen:** Formular im Dashboard (Vorname, Nachname, Firma, Telefon, E-Mail, Adresse, Branche)
- Mobile-First, gleiches Design wie Landingpage (Orange #F97316)

#### Backend (Google Apps Script v4.4)
- Google Sheets Datenbank mit 6 Tabellenblättern (Partner, Empfehlungen, Auszahlungen, Dashboard, Formularantworten, Partner-Empfehlungen)
- **Apps Script v4.4** mit Action-Routing im doPost-Endpunkt:
  - `action=register`: Partner-Registrierung + DOI-Mail (v4.4: Firma in Spalte V, Steuernr. in Spalte T bei Registrierung)
  - `action=login`: Partner-Login, gibt Dashboard-Daten inkl. Firma + Empfehlungen (inkl. PE-Details) + Bankdaten zurück
  - `action=saveBankData`: Bankdaten direkt aus dem Dashboard speichern (v4.4: Firma aktualisierbar)
  - `action=forgotcode`: Empfehlungscode per E-Mail erneut zusenden (v4.1)
  - `action=submitReferral`: Partner trägt Empfehlung ein → schreibt in Partner-Empfehlungen + Empfehlungen Sheet (v4.2)
  - `action=editReferral`: Partner bearbeitet bestehende Empfehlung → aktualisiert Partner-Empfehlungen + Empfehlungen Sheet (v4.3)
- Double-Opt-In (DOI) System komplett implementiert
- Auszahlungs-Workflow (DW24-EP-011) implementiert
- Provisions-E-Mails jetzt mit Link zum Partner-Dashboard UND Bankdaten-Formular
- DOI-Bestätigungsseite jetzt mit Link zum Partner-Dashboard
- Google Formular "Bankdaten für Provisionsauszahlung" erstellt und verknüpft
- Installable Triggers aktiv (programmatisch erstellt via `setupTriggers()`)
- Duplikat-Prüfung bei Registrierung (E-Mail bereits vorhanden)

#### DSGVO-Compliance (04.03.2026)
- **Google Analytics hinter Cookie-Consent:** GA-Script wird nicht mehr direkt im `<head>` geladen, sondern erst nach aktiver Einwilligung über den Cookie-Banner dynamisch nachgeladen (beide Seiten: index.html + partner.html)
- **Google Consent Mode v2:** Implementiert mit `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` – standardmäßig auf `denied`, nach Einwilligung auf `granted`
- **Datenschutzerklärung Version 2.1:** Komplett überarbeitet mit 15 Abschnitten (v4.4: Firma, Steuernummer, Gutschrift ergänzt):
  - Neuer Abschnitt 10: Art. 21 Widerspruchsrecht mit gesetzlich gefordertem besonderem Hinweis
  - Neuer Abschnitt 12: Google Analytics (Zweck, Rechtsgrundlage, Empfänger, Speicherdauer, Opt-Out)
  - Neuer Abschnitt 14: Pflicht/Freiwilligkeit der Datenbereitstellung
  - Drittlandtransfer (Abschnitt 7) vervollständigt: Cloudflare, Web3Forms, ipify.org ergänzt
  - Versionierung und Datum am Ende der DSE (Version 2.1, 04.03.2026)
- **Impressum:** Manuel Horn namentlich als Geschäftsführer benannt (statt nur "Revis-1 LLC")
- **Teilnahmebedingungen Version 1.1:** Rechtswahl auf deutsches Recht + Gerichtsstand Frankfurt am Main + §1a Gewerbe-Voraussetzung + §4a Gutschriftverfahren gem. § 14 Abs. 2 UStG
- **Cookie-Banner:** Beschreibung aktualisiert – erwähnt jetzt Google Analytics + Facebook Pixel
- **DSGVO-Report:** `DSGVO-Compliance-Report-empfehlung-digitalwerk24.docx` im Projektordner

#### Deployment & Hosting
- GitHub Repository erstellt und Code gepusht (github.com/Digitalwerk24/dw24-empfehlung)
- Vercel-Projekt erstellt und mit GitHub verknüpft (Auto-Deploy aktiv)
- Custom Domain empfehlung.digitalwerk24.com konfiguriert und SSL aktiv
- Custom Domain vertriebspartner.digitalwerk24.com als Alias hinzugefügt (03.03.2026)
- Seite live erreichbar unter https://empfehlung.digitalwerk24.com und https://vertriebspartner.digitalwerk24.com
- Partner-Dashboard erreichbar unter https://empfehlung.digitalwerk24.com/partner
- Google Analytics eingerichtet und verifiziert

### Offen / TODO
- **K1 (KRITISCH): EU-Vertreter nach Art. 27 DSGVO bestellen** – Revis-1 LLC als US-Unternehmen braucht zwingend einen EU-Vertreter (Bußgeldrisiko bis 10 Mio. EUR). Empfohlene Anbieter: DataRep (ab ~1.500€/J.), EU-REP.Global (ab ~1.200€/J.) oder deutscher Rechtsanwalt. Danach DSE Abschnitt 2 aktualisieren.
- **M5: Consent serverseitig dokumentieren** – Cookie-Einwilligung wird nur im localStorage gespeichert. Empfehlung: CMP-Tool wie Cookiebot oder Real Cookie Banner einsetzen.
- **N1: Telefonnummer im Impressum** – Optional aber empfohlen. Nummer fehlt noch.
- **End-to-End testen:** Kompletten Flow durchspielen (Registrierung → DOI → Login → Empfehlung eintragen → Auszahlungs-Workflow)
- **Mobile-Ansicht testen:** Dashboard + Empfehlungsformular auf echtem Smartphone testen
- **Facebook Pixel:** Pixel-ID einsetzen sobald Ads-Kampagne erstellt wird
- **Testdaten bereinigen:** DW24-TEST01 und DW24-TEST02 aus Partner-Sheet löschen
- **og:image:** Social-Media-Vorschaubild für empfehlung.digitalwerk24.com erstellen
- **Optional:** CNAME in Cloudflare auf neuen Vercel-Wert aktualisieren (`22181005f8ca8e9.vercel-dns-017.com`)

### Erledigt (History)
- ✅ Apps Script v4.0 deployed (Version 4, 03.03.2026, 20:58)
- ✅ CORS-Fix verifiziert – Content-Type Header entfernt, Registrierung funktioniert
- ✅ Google Sheets Formeln korrigiert – Semikolon-Trennzeichen + Spaltenreferenzen
- ✅ Apps Script v4.1 deployed (Version 5, 04.03.2026, 08:51) – Code-vergessen-Funktion
- ✅ Apps Script v4.2 deployed (Version 6, 04.03.2026, 09:52) – Empfehlungsverwaltung im Partner-Dashboard
- ✅ Apps Script v4.2.1 deployed (Version 7, 04.03.2026, 10:22) – Bugfix: toISOString auf partner[8] statt partner[4] korrigiert
- ✅ Apps Script v4.3 deployed (Version 8, 04.03.2026, 11:02) – Empfehlungs-Bearbeitung im Partner-Dashboard (handleEditReferral + editReferral-Action)
- ✅ DSGVO-Compliance-Fixes umgesetzt (04.03.2026) – GA hinter Cookie-Consent, Consent Mode v2, DSE v2.0 mit allen Pflichtangaben, Impressum mit Manuel Horn, Teilnahmebedingungen auf deutsches Recht
- ✅ Apps Script v4.4 deployed (Version 9, 04.03.2026, 19:36) – Firma + Steuernr. bei Registrierung (Spalte V+T), handleLogin gibt Firma zurück, handleSaveBankData aktualisiert Firma
- ✅ Gutschriftverfahren implementiert (04.03.2026) – TB v1.1 (§1a Gewerbe, §4a Gutschrift), DSE v2.1, FAQ aktualisiert, strukturierte Adressfelder im Dashboard

## Deployment-Checkliste

### Frontend
- [x] Landingpage entwickeln (HTML/CSS/JS)
- [x] Anmeldeformular mit Web3Forms einrichten
- [x] DOI-Integration in Formular (AJAX POST an Apps Script)
- [x] Partner-Dashboard erstellen (partner.html)
- [x] Partner-Login-Button in Header + Footer der Landingpage
- [x] Dashboard-Hinweis in Registrierungs-Erfolgsseite
- [x] Code in GitHub-Repository pushen
- [x] Vercel-Projekt erstellen und mit Repo verknüpfen
- [x] Custom Domain `empfehlung.digitalwerk24.com` in Vercel hinzufügen
- [x] Custom Domain `vertriebspartner.digitalwerk24.com` als Alias hinzufügen
- [x] SSL-Zertifikate prüfen (automatisch ausgestellt)
- [x] Impressum & Datenschutz einbinden (als Modals)
- [x] Google Analytics einbauen (G-1XWYSG8LLW)
- [x] DSGVO-Compliance: GA hinter Cookie-Consent, Consent Mode v2, DSE v2.1, Impressum + TB v1.1 korrigiert
- [ ] Mobile-Ansicht testen (auf echtem Gerät)
- [ ] Facebook Pixel / Conversion-Tracking einbauen (für spätere Ads)

### Backend
- [x] Google Sheets Datenbank erstellen (5 Tabellenblätter)
- [x] Apps Script v1.0: Basis-Registrierung (doPost)
- [x] Apps Script v2.0: Double-Opt-In System (doPost + doGet + generateToken)
- [x] Apps Script v3.0: Auszahlungs-Workflow (onEditTrigger + createProvisionDraft + onFormSubmit)
- [x] Apps Script v4.0: Partner-Dashboard (handleLogin + handleSaveBankData + Action-Routing)
- [x] Google Formular "Bankdaten für Provisionsauszahlung" erstellen
- [x] Formular mit Google Sheet verknüpfen (Formularantworten-Tab)
- [x] Installable Triggers einrichten (onEdit + onFormSubmit)
- [x] Apps Script v4.1: Code-vergessen-Funktion (handleForgotCode + forgotcode-Action)
- [x] Version 3 deployen (03.03.2026, 16:01)
- [x] Version 4 deployen (v4.0 mit Partner-Dashboard, 03.03.2026, 20:58)
- [x] Version 5 deployen (v4.1 mit Code-vergessen-Funktion, 04.03.2026, 08:51)
- [x] Apps Script v4.2: Empfehlungsverwaltung (handleSubmitReferral + Partner-Empfehlungen Sheet)
- [x] Version 6 deployen (v4.2 mit Empfehlungsverwaltung, 04.03.2026, 09:52)
- [x] Apps Script v4.3: Empfehlungs-Bearbeitung (handleEditReferral + editReferral-Action)
- [x] Version 8 deployen (v4.3 mit Empfehlungs-Bearbeitung, 04.03.2026, 11:02)
- [x] Apps Script v4.4: Firma + Steuernr. bei Registrierung (handleRegistration/Login/SaveBankData)
- [x] Version 9 deployen (v4.4 mit Firma + Gutschriftverfahren, 04.03.2026, 19:36)
- [ ] End-to-End Test des kompletten Workflows
- [ ] Testdaten bereinigen

## Technische Details

### Registrierungsformular (Landingpage)
- **Web3Forms:** API-Key 1cd4f93e-337f-4343-b8e1-da153e720dab (Backup-E-Mail an hello@digitalwerk24.com)
- **Apps Script:** POST an Web-App-URL mit JSON-Body (vorname, nachname, firma, steuernummer, email, telefon)
- **Bot-Schutz:** Honeypot-Feld (botcheck)
- **Fehlerbehandlung:** Bei Apps Script Fehler → Web3Forms als Fallback, Hinweis auf hello@digitalwerk24.com

### Wichtige IDs & URLs (Referenz)

| Ressource | Wert |
|-----------|------|
| Sheet-ID | `1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs` |
| Apps Script Projekt | `1LFxZh7lzKt-evL2WCR6W9NC0KOqyFOxbeDiw2Gf4ODQzFObZEuGN1Uhf` |
| Web-App-URL | `https://script.google.com/macros/s/AKfycbxlffSrXJ59kyr4ElFNIlen6n1-h4SizOHGwXyxymdt3kKlHSWTLzs-DHzMu6Cj_Wr5/exec` |
| Google Form ID | `1lYP6SgdaBUAJWk5NY8zSHiBjqlr5LJXri3_nn_bwMDc` |
| Form Empfehlungscode-Feld | `1708813850` |
| Web3Forms API-Key | `1cd4f93e-337f-4343-b8e1-da153e720dab` |
| Vercel Projekt-ID | `prj_d8QzZ8MaeVWorFgUlVl4Nx1HKemw` |
| GitHub Repo | `Digitalwerk24/dw24-empfehlung` |
| Google Analytics | `G-1XWYSG8LLW` |

### Git-Verlauf (relevante Commits)
- `3b570f2` – Apps Script v4.4 deployed (Version 9): Neue Web-App-URL aktualisiert (04.03.2026)
- `9ec78d2` – Gutschriftverfahren: Firma/Steuernr. Pflichtfelder, strukturierte Bankdaten, DSE v2.1 (04.03.2026)
- `3c96aca` – Impressum: Earlybirds Advisors INC Referenz entfernt (04.03.2026)
- `9ce9b87` – N3: Rechtswahl und Gerichtsstand auf deutsches Recht umgestellt (04.03.2026)
- `fcc42a3` – DSGVO-Compliance: GA hinter Cookie-Consent, Consent Mode v2, DSE v2.0 vervollständigt (04.03.2026)
- `108891e` – Text im Empfehlungsformular angepasst (04.03.2026)
- `f528a12` – CLAUDE.md aktualisiert: v4.3 Empfehlungs-Bearbeitung dokumentiert (04.03.2026)
- `3df0323` – v4.3: Empfehlungen bearbeiten – Partner können eingetragene Empfehlungen editieren (04.03.2026)
- `4d4011b` – Bugfix: Login-Fehler toISOString behoben + neue Web-App URL Version 7 (04.03.2026)
- `06dd7c3` – Apps Script v4.2 deployed: Web-App URL aktualisiert (04.03.2026)
- `fa585bc` – Empfehlungsverwaltung: Partner können Empfehlungen im Dashboard eintragen (04.03.2026)
- `8527fc0` – Apps Script v4.1 deployed: Code-vergessen-Funktion + neue Web-App-URL (04.03.2026)
- `5a43c30` – Code-vergessen-Funktion + neue FAQ auf Landingpage (04.03.2026)
- `e5206f9` – CLAUDE.md: Spalten-Layout korrigiert, Formel-Fix dokumentiert (03.03.2026)
- `08f701d` – Apps Script v4.0 deployed – Web-App URL aktualisiert (03.03.2026)
- `8134154` – Partner-Dashboard: Login-Portal mit Provisionen & Bankdaten (03.03.2026)
- `e4d91bf` – Fix: CORS-Fehler beim Formular-Submit behoben (03.03.2026)
- `b1fdb34` – Google Analytics Tag (G-1XWYSG8LLW) eingebaut (03.03.2026)
- Vorherige Commits: DOI-System, Landingpage-Erstellung, Vercel-Deployment, DNS-Konfiguration

### Dateien im Repository
- `index.html` – Komplette Landingpage (HTML/CSS/JS in einer Datei) mit Partner-Login-Button
- `partner.html` – Partner-Dashboard (Login + Provisionen + Bankdaten + Empfehlungsverwaltung)
- `google-apps-script.gs` – Lokale Referenzkopie des Apps Script Codes (v4.4)
- `vercel.json` – Vercel-Konfiguration (Routing für partner.html als /partner)
- `CLAUDE.md` – Diese Projektdokumentation
- `STARTPROMPT.md` – Initialer Projektbrief
- `DW24-Empfehlungsprogramm-Sheets-Anleitung.md` – Anleitung für die Sheets-Verwaltung
- `DW24-Empfehlungsprogramm-Ablaufplan.pdf` – Ablaufplan als PDF
- `DW24-Empfehlungsprogramm.xlsx` – Ursprüngliche Excel-Vorlage
- `DW-24-Logo.png` – Logo-Datei
- `digitalwerk24-partner.jpeg` – Partner-Bild
- `DSGVO-Compliance-Report-empfehlung-digitalwerk24.docx` – DSGVO Compliance-Report (Website-Audit)
- `create_sheets_template.py` – Helper-Script zum Erstellen der Sheets-Vorlage
- `.gitignore` – Git-Ausschlussliste

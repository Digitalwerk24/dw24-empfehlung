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
2. Digitalwerk24 vergibt einen individuellen Tracking-Code (z.B. DW24-ANNA01)
3. Partner empfiehlt DW24 an Handwerker/Gründer und gibt den Code weiter
4. Neukunde nennt den Code bei Kontaktaufnahme/Buchung
5. Nach Zahlungseingang des Neukunden wird die Provision fällig
6. 199€ werden innerhalb von 14 Tagen per Überweisung ausgezahlt

### DW24-Preisstruktur (für Kalkulations-Referenz)
- **1.490€** einmalig – Website + Google Ads Kampagne (Kunde liefert Logo/Bilder)
- **1.750€** einmalig – Website + Google Ads Kampagne inkl. Logo/Bilder-Erstellung
- **49€/Monat** – Laufende Google Ads Überwachung & Optimierung

## Infrastruktur & Deployment

### Tech-Stack
- **Frontend:** Statische HTML/CSS/JS Landingpage (Single-File: index.html)
- **Hosting:** Vercel (Auto-Deploy bei Push auf main)
- **Repository:** github.com/Digitalwerk24/dw24-empfehlung
- **DNS:** Cloudflare
- **Formular:** Web3Forms (API-Key: 1cd4f93e-337f-4343-b8e1-da153e720dab)

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

Formular-Einreichung: E-Mail an hello@digitalwerk24.com senden (oder Webhook/API nach Wahl)

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
- Komplette Landingpage (index.html) als statische Single-File-Lösung (~1300 Zeilen)
- Alle Sektionen umgesetzt: Header, Hero (animierter 199€-Betrag), Verdienstrechner (1/5/10 Empfehlungen), 3-Schritte-Prozess, Zielgruppen-Karten, Trust-Badges, Anmeldeformular, FAQ-Akkordeon (7 Fragen), CTAs nach jedem Abschnitt, Footer
- Impressum & Datenschutz als Modal-Overlays (DSGVO-konform)
- Anmeldeformular über Web3Forms (AJAX, sendet an hello@digitalwerk24.com)
- Bot-Schutz über Honeypot-Feld
- Mobile-First responsive Design
- Scroll-Animationen via IntersectionObserver (fade-in Effekte)
- DW24-Logo im Header und Footer eingebunden
- `noindex, nofollow` Meta-Tag (kein SEO nötig, nur Ads-Traffic)
- Facebook Pixel Platzhalter-Kommentar im Head vorbereitet
- GitHub Repository erstellt und Code gepusht
- Vercel-Projekt erstellt und mit GitHub verknüpft (Auto-Deploy aktiv)
- Custom Domain empfehlung.digitalwerk24.com konfiguriert und SSL aktiv
- Seite live erreichbar unter https://empfehlung.digitalwerk24.com

### Offen / TODO
- **Formular testen:** Testregistrierung durchführen und E-Mail-Empfang prüfen
- **Mobile-Ansicht testen:** Detaillierter Test auf echtem Smartphone
- **Facebook Pixel:** Pixel-ID einsetzen sobald Ads-Kampagne erstellt wird
- **Optional:** CNAME in Cloudflare auf neuen Vercel-Wert aktualisieren (`22181005f8ca8e9.vercel-dns-017.com`)

## Deployment-Checkliste

- [x] Landingpage entwickeln (HTML/CSS/JS)
- [x] Anmeldeformular mit Web3Forms einrichten
- [x] Code in GitHub-Repository pushen
- [x] Vercel-Projekt erstellen und mit Repo verknüpfen
- [x] Custom Domain `empfehlung.digitalwerk24.com` in Vercel hinzufügen
- [x] SSL-Zertifikat prüfen (automatisch ausgestellt)
- [x] Impressum & Datenschutz einbinden (als Modals)
- [ ] Mobile-Ansicht testen (auf echtem Gerät)
- [ ] Formular-Funktion testen (Testregistrierung durchführen)
- [ ] Facebook Pixel / Conversion-Tracking einbauen (für spätere Ads)

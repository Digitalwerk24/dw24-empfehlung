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
- **Frontend:** HTML/CSS/JS (statische Landingpage) oder Next.js/React
- **Hosting:** Vercel
- **Repository:** GitHub (dieses Repo)
- **DNS:** Cloudflare
- **Domain:** empfehlung.digitalwerk24.com

### DNS-Konfiguration (bereits erledigt ✅)
In Cloudflare wurde folgender DNS-Eintrag für digitalwerk24.com angelegt:

| Typ | Name | Ziel | Proxy-Status | TTL |
|-----|------|------|-------------|-----|
| CNAME | empfehlung | cname.vercel-dns.com | Nur DNS (graue Wolke) | Auto |

### Vercel-Konfiguration (noch zu erledigen)
1. Neues Vercel-Projekt erstellen und mit diesem GitHub-Repository verknüpfen
2. Unter Project Settings → Domains die Custom Domain `empfehlung.digitalwerk24.com` hinzufügen
3. Vercel erkennt den CNAME automatisch und stellt ein SSL-Zertifikat aus
4. Nach erfolgreichem Setup ist die Seite unter https://empfehlung.digitalwerk24.com erreichbar

### Bestehende DNS-Einträge (digitalwerk24.com)
- **A-Record:** digitalwerk24.com → 216.198.79.1 (Nur DNS)
- **CNAME:** www → cname.vercel-dns.com (Nur DNS)
- **CNAME:** empfehlung → cname.vercel-dns.com (Nur DNS) ✅ NEU
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
- **Muttergesellschaft:** Earlybirds Advisors INC
- **Adresse:** 2645 Executive Park Dr, 33331 Weston FL, USA
- **E-Mail:** hello@digitalwerk24.com
- **Hinweis:** B2B-Transaktionen in der EU laufen über Reverse-Charge §13b UStG

## Deployment-Checkliste

- [ ] Landingpage entwickeln (HTML/CSS/JS oder Framework)
- [ ] Anmeldeformular mit E-Mail-Versand oder Webhook einrichten
- [ ] Code in dieses GitHub-Repository pushen
- [ ] Vercel-Projekt erstellen und mit Repo verknüpfen
- [ ] Custom Domain `empfehlung.digitalwerk24.com` in Vercel hinzufügen
- [ ] SSL-Zertifikat prüfen (wird von Vercel automatisch ausgestellt)
- [ ] Impressum & Datenschutz einbinden
- [ ] Mobile-Ansicht testen
- [ ] Formular-Funktion testen (Testregistrierung durchführen)
- [ ] Facebook Pixel / Conversion-Tracking einbauen (für spätere Ads)

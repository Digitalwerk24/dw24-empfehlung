# DW24 Empfehlungsprogramm — Google Sheets Backend + Formular-Anbindung

## Kontext

Digitalwerk24 (Revis-1 LLC) betreibt ein Empfehlungsprogramm auf empfehlung.digitalwerk24.com.
Vertriebspartner empfehlen Handwerker oder Existenzgründer und erhalten 199€ Provision pro
vermitteltem Neukunden nach Zahlungseingang. Die Verwaltung soll über Google Sheets laufen,
das Anmeldeformular auf der Landingpage soll Daten direkt ins Sheet schreiben.

---

## TEIL 1: Google Sheets Template erstellen

Erstelle eine XLSX-Datei mit folgenden 4 Tabellenblättern:

### Blatt 1: "Partner"

Spalten:
| Spalte | Name | Format | Beschreibung |
|--------|------|--------|--------------|
| A | Partner-ID | Text | Auto-generiert: DW24-[VORNAME][NR], z.B. DW24-ANNA01 |
| B | Vorname | Text | Pflichtfeld |
| C | Nachname | Text | Pflichtfeld |
| D | E-Mail | Text | Pflichtfeld |
| E | Telefon | Text | Optional |
| F | Empfehlungscode | Text | = Partner-ID (identisch) |
| G | Status | Dropdown | Aktiv / Pausiert / Gekündigt |
| H | Registrierung am | Datum | Timestamp der Anmeldung |
| I | Double-Opt-In am | Datum | Timestamp der E-Mail-Bestätigung |
| J | DSE-Version | Text | Version der Datenschutzerklärung bei Anmeldung |
| K | TB-Version | Text | Version der Teilnahmebedingungen bei Anmeldung |
| L | Consent-IP | Text | IP-Adresse bei Anmeldung (DSGVO-Nachweis) |
| M | Anzahl Empfehlungen | Zahl | Formel: COUNTIF aus Blatt "Empfehlungen" |
| N | Davon abgeschlossen | Zahl | Formel: COUNTIFS (Status = "Abgeschlossen") |
| O | Offene Provision (€) | Währung | Formel: Anzahl offene × 199€ |
| P | Ausgezahlte Provision (€) | Währung | Formel: Summe aus Blatt "Auszahlungen" |
| Q | Gesamt-Provision (€) | Währung | Formel: O + P |
| R | IBAN | Text | Erst bei erster Auszahlung eintragen |
| S | PayPal | Text | Alternative zu IBAN |
| T | Steuernummer/USt-ID | Text | Bei gewerblichen Partnern |
| U | Notizen | Text | Freitext |

Formatierung:
- Kopfzeile: Fett, Hintergrund #1a1a2e (DW24 Dunkelblau), Schrift weiß
- Dropdown "Status" mit Datenvalidierung
- Bedingte Formatierung: Aktiv = grün, Pausiert = gelb, Gekündigt = rot
- Spalten R-T ausgeblendet (sensible Daten, nur bei Bedarf einblenden)

### Blatt 2: "Empfehlungen"

Spalten:
| Spalte | Name | Format | Beschreibung |
|--------|------|--------|--------------|
| A | Empfehlungs-ID | Text | Auto: EMP-[JJJJ]-[NR], z.B. EMP-2026-001 |
| B | Empfehlungscode | Text | Code des Partners (Lookup zu Blatt Partner) |
| C | Partner-Name | Text | Formel: VLOOKUP aus Blatt Partner |
| D | Empfohlener Name | Text | Name des Handwerkers/Gründers |
| E | Empfohlene Firma | Text | Falls vorhanden |
| F | Empfohlene E-Mail | Text | Kontakt |
| G | Empfohlenes Telefon | Text | Kontakt |
| H | Branche/Gewerk | Text | z.B. Elektriker, Maler, SHK |
| I | Empfohlen am | Datum | Wann wurde die Empfehlung eingereicht |
| J | Status | Dropdown | Neu / Kontaktiert / Angebot gesendet / Abgeschlossen / Abgelehnt |
| K | DW24-Auftragswert (€) | Währung | Wert des DW24-Auftrags (1.490€ oder 1.750€) |
| L | Kunde bezahlt am | Datum | Datum Zahlungseingang (triggert Provision) |
| M | Provision fällig | Ja/Nein | Formel: Wenn Kunde bezahlt = Ja |
| N | Provision ausgezahlt | Ja/Nein | Manuell setzen nach Auszahlung |
| O | Notizen | Text | Freitext |

Formatierung:
- Gleicher Header-Style wie Blatt Partner
- Bedingte Formatierung Status: Neu = blau, Kontaktiert = gelb, Angebot = orange, Abgeschlossen = grün, Abgelehnt = rot
- Spalte M: Formel =WENN(L2<>"","Ja","Nein")
- Spalte N: Manuelles Dropdown Ja/Nein

### Blatt 3: "Auszahlungen"

Spalten:
| Spalte | Name | Format | Beschreibung |
|--------|------|--------|--------------|
| A | Auszahlungs-ID | Text | Auto: AUS-[JJJJ]-[NR] |
| B | Empfehlungscode | Text | Partner-Code |
| C | Partner-Name | Text | Formel: VLOOKUP |
| D | Empfehlungs-ID | Text | Referenz zur Empfehlung |
| E | Betrag (€) | Währung | 199,00€ |
| F | Auszahlungsdatum | Datum | Wann wurde ausgezahlt |
| G | Zahlungsmethode | Dropdown | Überweisung / PayPal |
| H | Referenz/Buchungsnr. | Text | Bankreferenz |
| I | Status | Dropdown | Offen / Angewiesen / Bestätigt |
| J | Notizen | Text | Freitext |

### Blatt 4: "Dashboard"

Übersichtskennzahlen mit Formeln:
- Gesamtzahl aktiver Partner: =COUNTIF(Partner!G:G,"Aktiv")
- Gesamtzahl Empfehlungen: =COUNTA(Empfehlungen!A:A)-1
- Davon abgeschlossen: =COUNTIF(Empfehlungen!J:J,"Abgeschlossen")
- Conversion-Rate: =Abgeschlossen/Gesamt
- Offene Provisionen gesamt (€): =COUNTIFS(Empfehlungen!M:M,"Ja",Empfehlungen!N:N,"Nein")*199
- Ausgezahlte Provisionen gesamt (€): =SUMME(Auszahlungen!E:E)
- Top-5 Partner nach Empfehlungen (LARGE/INDEX-Formel)
- Empfehlungen diesen Monat: =COUNTIFS mit Datumsfilter

Layout:
- Große Kennzahlen oben (Schriftgröße 24, fett)
- DW24-Farbschema: #1a1a2e (Dunkel), #ff8c00 (Orange), #ffffff (Weiß)
- Keine Eingabefelder — nur Formeln und Verweise

---

## TEIL 2: Formular auf Landingpage → Google Sheets Anbindung

### Variante A: Google Apps Script Web App (empfohlen)

Erstelle ein Google Apps Script das als Web App deployed wird und POST-Requests
vom Anmeldeformular entgegennimmt.

#### Apps Script Code (doPost):

```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById('SHEET_ID').getSheetByName('Partner');
    var data = JSON.parse(e.postData.contents);
    
    // Partner-ID generieren
    var lastRow = sheet.getLastRow();
    var vorname = data.vorname.toUpperCase().substring(0, 4);
    var nr = String(lastRow).padStart(2, '0');
    var partnerId = 'DW24-' + vorname + nr;
    
    // Zeile schreiben
    sheet.appendRow([
      partnerId,           // A: Partner-ID
      data.vorname,        // B: Vorname
      data.nachname,       // C: Nachname
      data.email,          // D: E-Mail
      data.telefon || '',  // E: Telefon
      partnerId,           // F: Empfehlungscode (= Partner-ID)
      'Aktiv',             // G: Status
      new Date(),          // H: Registrierung am
      '',                  // I: Double-Opt-In (später)
      data.dse_version || 'v1.0',  // J: DSE-Version
      data.tb_version || 'v1.0',   // K: TB-Version
      data.ip || '',       // L: Consent-IP
    ]);
    
    // Antwort mit Empfehlungscode
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        partnerId: partnerId,
        empfehlungscode: partnerId
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

#### Deployment:
1. Google Sheets öffnen → Erweiterungen → Apps Script
2. Code einfügen
3. Bereitstellen → Als Web-App bereitstellen
4. Zugriff: "Jeder" (damit das Formular ohne Auth darauf zugreifen kann)
5. Web-App-URL kopieren

#### Frontend-Anbindung (Landingpage):

Im Anmeldeformular auf empfehlung.digitalwerk24.com den Submit-Handler anpassen:

```javascript
async function handleSubmit(e) {
  e.preventDefault();
  
  const formData = {
    vorname: document.getElementById('vorname').value,
    nachname: document.getElementById('nachname').value,
    email: document.getElementById('email').value,
    telefon: document.getElementById('telefon').value,
    dse_version: 'v1.0',
    tb_version: 'v1.0',
    ip: '' // Optional: über Server-Side ermitteln
  };
  
  try {
    const response = await fetch('APPS_SCRIPT_WEB_APP_URL', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Erfolgsseite zeigen mit Empfehlungscode
      showSuccess(result.empfehlungscode);
      // Double-Opt-In E-Mail triggern (separater Schritt)
    } else {
      showError('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
    }
  } catch (error) {
    showError('Verbindungsfehler. Bitte versuche es erneut.');
  }
}
```

### Variante B: Google Forms Embed (einfachere Alternative)

Falls die Custom-Anbindung zu aufwändig ist:
1. Google Formular erstellen mit den Feldern Vorname, Nachname, E-Mail, Telefon
2. Formular-Antworten mit dem Google Sheet verknüpfen
3. Apps Script Trigger: Bei neuer Antwort automatisch Partner-ID generieren
4. Nachteil: Weniger Kontrolle über Design, Formular sieht nach Google aus

**Empfehlung: Variante A** — passt besser zum DW24-Design der Landingpage.

---

## TEIL 3: DSGVO-Anforderungen für das Sheet

### Consent-Dokumentation
Jede Registrierung muss dokumentieren:
- Zeitstempel (Spalte H)
- IP-Adresse (Spalte L)
- Version der DSE die zum Zeitpunkt galt (Spalte J)
- Version der Teilnahmebedingungen (Spalte K)

### Löschkonzept
- Partner kündigt → Status auf "Gekündigt", Daten nach 6 Monaten löschen
  (außer steuerrechtliche Aufbewahrung für Auszahlungen: 10 Jahre §147 AO)
- Auszahlungsdaten: 10 Jahre aufbewahren (steuerliche Pflicht)
- Empfehlungsdaten ohne Abschluss: 12 Monate nach letzter Aktivität löschen

### Zugriffsschutz
- Sheet nur für Manuel + autorisierte DW24-Mitarbeiter freigeben
- Sensible Spalten (IBAN, PayPal, Steuernr.) standardmäßig ausblenden
- Google Sheet Audit-Log aktivieren (wer hat wann was geändert)
- Blattschutz für Dashboard und Formelspalten (versehentliches Überschreiben verhindern)

### Double-Opt-In Flow
1. Partner füllt Formular aus → Daten landen im Sheet mit leerem "Double-Opt-In am"
2. Bestätigungsmail wird gesendet (über Apps Script oder externen E-Mail-Service)
3. Partner klickt Bestätigungslink → Apps Script setzt Datum in Spalte I
4. Erst dann ist der Partner "aktiv" und erhält seinen Empfehlungscode

---

## TEIL 4: Nächste Schritte / Offene Aufgaben

- [ ] XLSX-Template erstellen und in Google Drive hochladen
- [ ] Google Apps Script einrichten und als Web App deployen
- [ ] Landingpage-Formular mit Apps Script URL verbinden
- [ ] Double-Opt-In E-Mail-Flow einrichten (Apps Script + Gmail oder externer Service)
- [ ] Teilnahmebedingungen erstellen (separates Dokument)
- [ ] Datenschutzerklärung für empfehlung.digitalwerk24.com erstellen
- [ ] Sheet mit Beispieldaten testen
- [ ] Blattschutz und Zugriffsrechte konfigurieren
- [ ] Consent-Logging testen (IP, DSE-Version, TB-Version)

---

## Technische Hinweise für Claude Code

- XLSX erstellen mit openpyxl (Formeln, Formatierung, Dropdowns, bedingte Formatierung)
- DW24-Farben: Dunkelblau #1a1a2e, Orange #ff8c00, Weiß #ffffff
- Alle berechneten Felder als Excel-Formeln, NICHT als hardcoded Werte
- Deutsche Formelnotation nicht nötig — openpyxl nutzt englische Formelnamen
- Nach Erstellung: recalc.py laufen lassen für Formelvalidierung
- Sheet-Namen ohne Sonderzeichen (Partner, Empfehlungen, Auszahlungen, Dashboard)

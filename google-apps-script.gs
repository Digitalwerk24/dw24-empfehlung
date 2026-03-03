/**
 * DW24 Empfehlungsprogramm – Google Apps Script
 *
 * Dieses Script empfängt POST-Requests vom Anmeldeformular auf
 * empfehlung.digitalwerk24.com und schreibt die Daten ins Google Sheet.
 *
 * INSTALLATION:
 * 1. Google Sheet aus der XLSX-Datei erstellen (hochladen → mit Google Tabellen öffnen)
 * 2. Im Sheet: Erweiterungen → Apps Script
 * 3. Diesen gesamten Code einfügen (alten Code löschen)
 * 4. Die SHEET_ID unten durch die echte Sheet-ID ersetzen
 *    (Sheet-ID = der lange String in der URL: docs.google.com/spreadsheets/d/SHEET_ID/edit)
 * 5. Bereitstellen → Neue Bereitstellung
 *    - Typ: Web-App
 *    - Ausführen als: Ich (hello@digitalwerk24.com)
 *    - Zugriff: Jeder
 * 6. Web-App-URL kopieren und in index.html bei APPS_SCRIPT_URL einfügen
 */

// ===== KONFIGURATION =====
const SHEET_ID = 'HIER_SHEET_ID_EINFUEGEN'; // <-- Sheet-ID hier einfügen!

/**
 * POST-Endpoint: Empfängt Formulardaten und schreibt sie ins Partner-Blatt
 */
function doPost(e) {
  try {
    // CORS Headers
    var output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    // Daten aus dem Request parsen
    var data = JSON.parse(e.postData.contents);

    // Sheet öffnen
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Partner');

    // Prüfen ob E-Mail bereits existiert (Duplikat-Schutz)
    var emailColumn = sheet.getRange('D:D').getValues();
    for (var i = 1; i < emailColumn.length; i++) {
      if (emailColumn[i][0].toString().toLowerCase() === data.email.toLowerCase()) {
        output.setContent(JSON.stringify({
          success: false,
          error: 'duplicate',
          message: 'Diese E-Mail-Adresse ist bereits registriert.'
        }));
        return output;
      }
    }

    // Partner-ID generieren: DW24-[VORNAME max 4 Zeichen][Laufende Nr]
    var lastRow = sheet.getLastRow();
    var vorname = data.vorname.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);
    // Mindestens 2 Buchstaben, sonst mit X auffüllen
    while (vorname.length < 2) {
      vorname += 'X';
    }
    var nr = String(lastRow).padStart(2, '0');
    var partnerId = 'DW24-' + vorname + nr;

    // Prüfen ob Partner-ID schon existiert, ggf. Nummer erhöhen
    var idColumn = sheet.getRange('A:A').getValues();
    var idExists = true;
    var counter = lastRow;
    while (idExists) {
      idExists = false;
      for (var j = 1; j < idColumn.length; j++) {
        if (idColumn[j][0] === partnerId) {
          counter++;
          nr = String(counter).padStart(2, '0');
          partnerId = 'DW24-' + vorname + nr;
          idExists = true;
          break;
        }
      }
    }

    // Neue Zeile ins Sheet schreiben
    sheet.appendRow([
      partnerId,                        // A: Partner-ID
      data.vorname,                     // B: Vorname
      data.nachname,                    // C: Nachname
      data.email,                       // D: E-Mail
      data.telefon || '',               // E: Telefon
      partnerId,                        // F: Empfehlungscode (= Partner-ID)
      'Aktiv',                          // G: Status
      new Date(),                       // H: Registrierung am
      '',                               // I: Double-Opt-In am (wird später gesetzt)
      data.dse_version || 'v1.0',       // J: DSE-Version
      data.tb_version || 'v1.0',        // K: TB-Version
      data.consent_ip || '',            // L: Consent-IP
    ]);

    // Formeln in die berechneten Spalten der neuen Zeile einfügen
    var newRow = sheet.getLastRow();
    // M: Anzahl Empfehlungen
    sheet.getRange(newRow, 13).setFormula('=COUNTIF(Empfehlungen!B:B,F' + newRow + ')');
    // N: Davon abgeschlossen
    sheet.getRange(newRow, 14).setFormula('=COUNTIFS(Empfehlungen!B:B,F' + newRow + ',Empfehlungen!J:J,"Abgeschlossen")');
    // O: Offene Provision
    sheet.getRange(newRow, 15).setFormula('=COUNTIFS(Empfehlungen!B:B,F' + newRow + ',Empfehlungen!M:M,"Ja",Empfehlungen!N:N,"Nein")*199');
    // P: Ausgezahlte Provision
    sheet.getRange(newRow, 16).setFormula('=SUMPRODUCT((Auszahlungen!B:B=F' + newRow + ')*Auszahlungen!E:E)');
    // Q: Gesamt-Provision
    sheet.getRange(newRow, 17).setFormula('=O' + newRow + '+P' + newRow);

    // Währungsformat für Provisions-Spalten
    sheet.getRange(newRow, 15, 1, 3).setNumberFormat('#,##0.00 €');

    // Erfolg zurückgeben mit Partner-ID
    output.setContent(JSON.stringify({
      success: true,
      partnerId: partnerId,
      empfehlungscode: partnerId,
      message: 'Registrierung erfolgreich!'
    }));
    return output;

  } catch (error) {
    // Fehler loggen und zurückgeben
    Logger.log('Fehler bei Partner-Registrierung: ' + error.message);
    var errorOutput = ContentService.createTextOutput();
    errorOutput.setMimeType(ContentService.MimeType.JSON);
    errorOutput.setContent(JSON.stringify({
      success: false,
      error: 'server_error',
      message: 'Registrierung fehlgeschlagen: ' + error.message
    }));
    return errorOutput;
  }
}

/**
 * GET-Endpoint: Für Tests und Health-Check
 */
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify({
    status: 'ok',
    service: 'DW24 Empfehlungsprogramm',
    version: '1.0',
    timestamp: new Date().toISOString()
  }));
  return output;
}

/**
 * Test-Funktion: Kann direkt im Script-Editor ausgeführt werden
 */
function testDoPost() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        vorname: 'Test',
        nachname: 'Partner',
        email: 'test@example.com',
        telefon: '+49 170 0000000',
        dse_version: 'v1.0',
        tb_version: 'v1.0',
        consent_ip: '127.0.0.1'
      })
    }
  };

  var result = doPost(testData);
  Logger.log(result.getContent());
}

/**
 * DW24 Empfehlungsprogramm – Google Apps Script (v2.0 mit Double-Opt-In)
 *
 * Funktionen:
 * - doPost(e): Empfaengt Formulardaten, schreibt Partner ins Sheet, sendet DOI-Mail
 * - doGet(e): Health-Check + Double-Opt-In Bestaetigung
 * - sendDoubleOptIn(): Sendet Bestaetigungsmail mit Link
 * - handleConfirmation(): Verarbeitet DOI-Bestaetigung, zeigt Erfolgsseite mit Code
 * - setupSheets(): Erstellt alle 4 Blaetter mit Headern (einmalig ausfuehren!)
 *
 * DEPLOYMENT:
 * 1. Bereitstellen → Neue Bereitstellung → Web-App
 * 2. Ausfuehren als: Ich (hello@digitalwerk24.com)
 * 3. Zugriff: Jeder
 * 4. WICHTIG: Nach Code-Aenderungen immer NEUE Bereitstellung erstellen!
 */

// ===== KONFIGURATION =====
const SHEET_ID = '1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs';

/**
 * POST-Endpoint: Empfaengt Formulardaten und schreibt sie ins Partner-Blatt
 */
function doPost(e) {
  try {
    var output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName('Partner');

    // Pruefen ob E-Mail bereits existiert (Duplikat-Schutz)
    var emailColumn = sheet.getRange('D2:D' + Math.max(sheet.getLastRow(), 2)).getValues();
    for (var i = 0; i < emailColumn.length; i++) {
      if (emailColumn[i][0].toString().toLowerCase().trim() === data.email.toLowerCase().trim()) {
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
    while (vorname.length < 2) {
      vorname += 'X';
    }
    var nr = String(lastRow).padStart(2, '0');
    var partnerId = 'DW24-' + vorname + nr;

    // Pruefen ob Partner-ID schon existiert, ggf. Nummer erhoehen
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

    // DOI-Token generieren
    var doiToken = Utilities.getUuid();

    // Neue Zeile ins Sheet schreiben
    sheet.appendRow([
      partnerId,                        // A: Partner-ID
      data.vorname,                     // B: Vorname
      data.nachname,                    // C: Nachname
      data.email.toLowerCase().trim(),  // D: E-Mail
      data.telefon || '',               // E: Telefon
      partnerId,                        // F: Empfehlungscode (= Partner-ID)
      'Aktiv',                          // G: Status
      new Date(),                       // H: Registrierung am
      '',                               // I: Double-Opt-In am (wird nach Bestaetigung gesetzt)
      data.dse_version || 'v1.0',       // J: DSE-Version
      data.tb_version || 'v1.0',        // K: TB-Version
      data.consent_ip || '',            // L: Consent-IP
      '', '', '', '', '',               // M-Q: Formeln werden unten gesetzt
      '', '', '',                       // R-T: IBAN, PayPal, Steuernr (leer)
      'DOI-TOKEN:' + doiToken           // U: Notizen (temporaer fuer DOI-Token)
    ]);

    // Formeln in die berechneten Spalten der neuen Zeile einfuegen
    var newRow = sheet.getLastRow();
    sheet.getRange(newRow, 13).setFormula('=COUNTIF(Empfehlungen!B:B,F' + newRow + ')');
    sheet.getRange(newRow, 14).setFormula('=COUNTIFS(Empfehlungen!B:B,F' + newRow + ',Empfehlungen!J:J,"Abgeschlossen")');
    sheet.getRange(newRow, 15).setFormula('=COUNTIFS(Empfehlungen!B:B,F' + newRow + ',Empfehlungen!M:M,"Ja",Empfehlungen!N:N,"Nein")*199');
    sheet.getRange(newRow, 16).setFormula('=SUMPRODUCT((Auszahlungen!B:B=F' + newRow + ')*Auszahlungen!E:E)');
    sheet.getRange(newRow, 17).setFormula('=O' + newRow + '+P' + newRow);
    sheet.getRange(newRow, 15, 1, 3).setNumberFormat('#,##0.00 €');

    // Double-Opt-In E-Mail senden
    try {
      sendDoubleOptIn(data.email.toLowerCase().trim(), data.vorname, partnerId, doiToken);
    } catch (mailError) {
      Logger.log('DOI-Mail Fehler: ' + mailError.message);
      // Formular trotzdem als Erfolg melden — Partner kann erneut angefordert werden
    }

    output.setContent(JSON.stringify({
      success: true,
      partnerId: partnerId,
      empfehlungscode: partnerId,
      message: 'Registrierung erfolgreich. Bitte E-Mail bestaetigen.'
    }));
    return output;

  } catch (error) {
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
 * Double-Opt-In E-Mail senden
 */
function sendDoubleOptIn(email, vorname, partnerId, token) {
  var confirmUrl = ScriptApp.getService().getUrl()
    + '?action=confirm&token=' + token
    + '&email=' + encodeURIComponent(email);

  var subject = 'Digitalwerk24 – Bitte bestaetige deine Anmeldung';

  var htmlBody = '<!DOCTYPE html>'
    + '<html><head><meta charset="utf-8"></head>'
    + '<body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f9fafb;">'
    + '<div style="max-width:600px;margin:0 auto;padding:20px;">'
    // Header
    + '<div style="text-align:center;padding:24px 0;border-bottom:3px solid #F97316;">'
    + '<h1 style="color:#1E293B;font-size:24px;margin:0;">Digitalwerk24</h1>'
    + '<p style="color:#F97316;font-size:14px;margin:4px 0 0;">Empfehlungsprogramm</p>'
    + '</div>'
    // Body
    + '<div style="padding:30px 0;">'
    + '<p style="font-size:16px;color:#333;">Hallo ' + vorname + ',</p>'
    + '<p style="font-size:16px;color:#333;line-height:1.6;">'
    + 'vielen Dank fuer deine Anmeldung zum Empfehlungsprogramm!<br>'
    + 'Bitte bestaetige deine E-Mail-Adresse mit einem Klick:</p>'
    + '<div style="text-align:center;padding:24px 0;">'
    + '<a href="' + confirmUrl + '" '
    + 'style="background:#F97316;color:#fff;padding:16px 36px;border-radius:50px;'
    + 'text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">'
    + 'E-Mail bestaetigen &rarr;</a></div>'
    + '<p style="font-size:14px;color:#666;line-height:1.6;">'
    + 'Nach der Bestaetigung erhaeltst du deinen persoenlichen Empfehlungscode '
    + 'und kannst sofort loslegen.</p>'
    + '</div>'
    // Footer
    + '<div style="border-top:1px solid #eee;padding:20px 0;font-size:12px;color:#999;">'
    + '<p>Digitalwerk24 | Revis-1 LLC<br>'
    + '2645 Executive Park Dr, Weston, FL 33331, USA<br>'
    + 'partner@digitalwerk24.com</p>'
    + '<p>Du erhaeltst diese E-Mail weil du dich auf empfehlung.digitalwerk24.com '
    + 'angemeldet hast. Falls nicht, kannst du diese E-Mail ignorieren.</p>'
    + '</div></div></body></html>';

  GmailApp.sendEmail(email, subject,
    'Bitte bestaetige deine Anmeldung: ' + confirmUrl,
    {
      htmlBody: htmlBody,
      name: 'Digitalwerk24 Empfehlungsprogramm',
      replyTo: 'partner@digitalwerk24.com'
    }
  );
}

/**
 * GET-Endpoint: Health-Check + Double-Opt-In Bestaetigung
 */
function doGet(e) {
  // DOI-Bestaetigung pruefen
  if (e && e.parameter && e.parameter.action === 'confirm'
      && e.parameter.token && e.parameter.email) {
    return handleConfirmation(e.parameter.token, e.parameter.email);
  }

  // Health-Check
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify({
    status: 'ok',
    service: 'DW24 Empfehlungsprogramm',
    version: '2.0',
    timestamp: new Date().toISOString()
  }));
  return output;
}

/**
 * Double-Opt-In Bestaetigung verarbeiten
 */
function handleConfirmation(token, email) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Partner');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    // Spalte D (Index 3) = E-Mail, Spalte U (Index 20) = Notizen mit DOI-Token
    if (data[i][3].toString().toLowerCase().trim() === email.toLowerCase().trim()
        && data[i][20] === 'DOI-TOKEN:' + token) {

      // Double-Opt-In Datum setzen (Spalte I, Index 8)
      sheet.getRange(i + 1, 9).setValue(new Date());
      // Token entfernen, DOI-Vermerk setzen
      sheet.getRange(i + 1, 21).setValue('DOI bestaetigt am ' + new Date().toLocaleDateString('de-DE'));

      var partnerId = data[i][0]; // Spalte A
      var vorname = data[i][1];   // Spalte B

      // Erfolgsseite mit Partner-Code anzeigen
      var html = '<!DOCTYPE html>'
        + '<html lang="de"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>Bestaetigt! | Digitalwerk24 Empfehlungsprogramm</title>'
        + '<style>'
        + 'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;'
        + 'text-align:center;padding:40px 20px;background:#F8FAFC;margin:0;}'
        + '.card{max-width:500px;margin:0 auto;background:#fff;padding:48px 32px;'
        + 'border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.08);}'
        + '.icon{font-size:56px;margin-bottom:16px;}'
        + 'h1{color:#1E293B;font-size:28px;margin:0 0 12px;}'
        + '.subtitle{color:#64748B;font-size:16px;line-height:1.6;margin:0 0 24px;}'
        + '.code-box{background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border:2px dashed #F97316;'
        + 'border-radius:16px;padding:24px;margin:24px 0;}'
        + '.code-label{display:block;font-size:13px;color:#64748B;text-transform:uppercase;'
        + 'letter-spacing:1px;font-weight:600;margin-bottom:8px;}'
        + '.code{font-size:2.2rem;font-weight:900;color:#F97316;letter-spacing:3px;'
        + 'font-family:"Courier New",monospace;}'
        + '.info{background:#F1F5F9;border-radius:12px;padding:20px;margin-top:24px;'
        + 'text-align:left;font-size:14px;color:#64748B;line-height:1.7;}'
        + '.info strong{color:#1E293B;}'
        + '.btn{display:inline-block;margin-top:24px;background:linear-gradient(135deg,#F97316,#FB923C);'
        + 'color:#fff;padding:14px 32px;border-radius:50px;text-decoration:none;'
        + 'font-weight:700;font-size:16px;}'
        + '.btn:hover{opacity:0.9;}'
        + '</style></head>'
        + '<body><div class="card">'
        + '<div class="icon">&#127881;</div>'
        + '<h1>E-Mail bestaetigt!</h1>'
        + '<p class="subtitle">Hallo ' + vorname + ', dein Konto ist jetzt aktiv. '
        + 'Hier ist dein persoenlicher Empfehlungscode:</p>'
        + '<div class="code-box">'
        + '<span class="code-label">Dein Empfehlungscode:</span>'
        + '<span class="code">' + partnerId + '</span>'
        + '</div>'
        + '<div class="info">'
        + '<p>&#128161; <strong>So geht\'s weiter:</strong></p>'
        + '<p>Gib diesen Code an Handwerker oder Existenzgruender in deinem Umfeld weiter. '
        + 'Sobald ein Neukunde mit deinem Code bei uns bucht und bezahlt hat, erhaeltst du '
        + '<strong style="color:#F97316;">199&euro; Provision</strong>.</p>'
        + '</div>'
        + '<a href="https://empfehlung.digitalwerk24.com" class="btn">'
        + 'Zurueck zur Startseite</a>'
        + '</div></body></html>';

      return HtmlService.createHtmlOutput(html);
    }
  }

  // Token ungueltig oder bereits verwendet
  var errorHtml = '<!DOCTYPE html>'
    + '<html lang="de"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Link ungueltig | Digitalwerk24</title></head>'
    + '<body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;background:#F8FAFC;">'
    + '<div style="max-width:500px;margin:0 auto;background:#fff;padding:48px 32px;border-radius:20px;'
    + 'box-shadow:0 4px 24px rgba(0,0,0,0.08);">'
    + '<div style="font-size:48px;margin-bottom:16px;">&#9888;&#65039;</div>'
    + '<h2 style="color:#1E293B;">Link ungueltig oder bereits verwendet</h2>'
    + '<p style="color:#64748B;line-height:1.6;">Dieser Bestaetigungslink ist nicht mehr gueltig. '
    + 'Moeglicherweise hast du deine E-Mail bereits bestaetigt.</p>'
    + '<a href="https://empfehlung.digitalwerk24.com" '
    + 'style="display:inline-block;margin-top:20px;background:#F97316;color:#fff;'
    + 'padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:bold;">'
    + 'Zur Startseite</a></div></body></html>';

  return HtmlService.createHtmlOutput(errorHtml);
}

/**
 * Setup: Erstellt alle 4 Blaetter mit Headern (einmalig ausfuehren!)
 */
function setupSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Erstes Blatt umbenennen zu "Partner"
  var sheet1 = ss.getSheets()[0];
  sheet1.setName('Partner');

  // Partner-Header
  var partnerHeaders = ['Partner-ID','Vorname','Nachname','E-Mail','Telefon','Empfehlungscode','Status','Registrierung am','Double-Opt-In am','DSE-Version','TB-Version','Consent-IP','Anzahl Empfehlungen','Davon abgeschlossen','Offene Provision (EUR)','Ausgezahlte Prov. (EUR)','Gesamt-Provision (EUR)','IBAN','PayPal','Steuernr./USt-ID','Notizen'];
  sheet1.getRange(1, 1, 1, partnerHeaders.length).setValues([partnerHeaders]);
  sheet1.getRange(1, 1, 1, partnerHeaders.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  sheet1.setFrozenRows(1);

  // Status-Dropdown fuer Partner (Spalte G)
  var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(['Aktiv','Pausiert','Gekuendigt']).build();
  sheet1.getRange('G2:G1000').setDataValidation(statusRule);

  // Empfehlungen-Blatt
  var sheet2 = ss.insertSheet('Empfehlungen');
  var empHeaders = ['Empfehlungs-ID','Empfehlungscode','Partner-Name','Empfohlener Name','Empfohlene Firma','Empfohlene E-Mail','Empfohlenes Telefon','Branche/Gewerk','Empfohlen am','Status','DW24-Auftragswert (EUR)','Kunde bezahlt am','Provision faellig','Provision ausgezahlt','Notizen'];
  sheet2.getRange(1, 1, 1, empHeaders.length).setValues([empHeaders]);
  sheet2.getRange(1, 1, 1, empHeaders.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  sheet2.setFrozenRows(1);

  var empStatusRule = SpreadsheetApp.newDataValidation().requireValueInList(['Neu','Kontaktiert','Angebot gesendet','Abgeschlossen','Abgelehnt']).build();
  sheet2.getRange('J2:J1000').setDataValidation(empStatusRule);
  var jaNeinRule = SpreadsheetApp.newDataValidation().requireValueInList(['Ja','Nein']).build();
  sheet2.getRange('N2:N1000').setDataValidation(jaNeinRule);

  // Auszahlungen-Blatt
  var sheet3 = ss.insertSheet('Auszahlungen');
  var ausHeaders = ['Auszahlungs-ID','Empfehlungscode','Partner-Name','Empfehlungs-ID','Betrag (EUR)','Auszahlungsdatum','Zahlungsmethode','Referenz/Buchungsnr.','Status','Notizen'];
  sheet3.getRange(1, 1, 1, ausHeaders.length).setValues([ausHeaders]);
  sheet3.getRange(1, 1, 1, ausHeaders.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  sheet3.setFrozenRows(1);

  var zahlRule = SpreadsheetApp.newDataValidation().requireValueInList(['Ueberweisung','PayPal']).build();
  sheet3.getRange('G2:G1000').setDataValidation(zahlRule);
  var ausStatusRule = SpreadsheetApp.newDataValidation().requireValueInList(['Offen','Angewiesen','Bestaetigt']).build();
  sheet3.getRange('I2:I1000').setDataValidation(ausStatusRule);

  // Dashboard-Blatt
  var sheet4 = ss.insertSheet('Dashboard');
  sheet4.getRange('A1').setValue('DW24 Empfehlungsprogramm – Dashboard').setFontSize(16).setFontWeight('bold');
  var labels = [['Aktive Partner'],['Gesamtzahl Empfehlungen'],['Davon abgeschlossen'],['Conversion-Rate'],['Offene Provisionen (EUR)'],['Ausgezahlte Provisionen (EUR)'],['Empfehlungen diesen Monat']];
  sheet4.getRange('A3:A9').setValues(labels).setFontSize(12).setFontWeight('bold');

  sheet4.getRange('B3').setFormula('=COUNTIF(Partner!G:G,"Aktiv")');
  sheet4.getRange('B4').setFormula('=COUNTA(Empfehlungen!A:A)-1');
  sheet4.getRange('B5').setFormula('=COUNTIF(Empfehlungen!J:J,"Abgeschlossen")');
  sheet4.getRange('B6').setFormula('=IF(B4>0,B5/B4,0)');
  sheet4.getRange('B6').setNumberFormat('0.0%');
  sheet4.getRange('B7').setFormula('=COUNTIFS(Empfehlungen!M:M,"Ja",Empfehlungen!N:N,"Nein")*199');
  sheet4.getRange('B8').setFormula('=SUM(Auszahlungen!E:E)');
  sheet4.getRange('B9').setFormula('=COUNTIFS(Empfehlungen!I:I,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),Empfehlungen!I:I,"<="&EOMONTH(TODAY(),0))');

  sheet4.getRange('B3:B9').setFontSize(18).setFontWeight('bold').setFontColor('#FF8C00');
  sheet4.getRange('B7:B8').setNumberFormat('#,##0.00 €');
  sheet4.setColumnWidth(1, 280);
  sheet4.setColumnWidth(2, 180);

  Logger.log('Setup abgeschlossen! 4 Blaetter erstellt.');
}

/**
 * Test-Funktion
 */
function testDoPost() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        vorname: 'Test',
        nachname: 'Partner',
        email: 'test' + Date.now() + '@example.com',
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

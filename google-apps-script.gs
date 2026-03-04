/**
 * DW24 Empfehlungsprogramm – Google Apps Script (v4.0 mit Partner-Dashboard)
 *
 * Funktionen:
 * - doPost(e): Zentraler POST-Endpoint mit Action-Routing:
 *   → action=register (oder kein action): Partner-Registrierung + DOI-Mail
 *   → action=login: Partner-Login (E-Mail + Empfehlungscode), liefert Dashboard-Daten
 *   → action=saveBankData: Bankdaten speichern/aktualisieren
 * - doGet(e): Health-Check + Double-Opt-In Bestaetigung
 * - sendDoubleOptIn(): Sendet Bestaetigungsmail mit Link
 * - handleConfirmation(): Verarbeitet DOI-Bestaetigung, zeigt Erfolgsseite mit Code
 * - handleLogin(): Validiert Partner-Credentials, gibt Dashboard-Daten zurueck
 * - handleSaveBankData(): Speichert Bankdaten aus dem Partner-Dashboard
 * - onEditTrigger(e): Erkennt Zahlungsdatum in Empfehlungen, erstellt Gmail-Entwurf
 * - createProvisionDraft(): Erstellt Provisions-Mail als Gmail-Entwurf
 * - onFormSubmit(e): Uebertraegt Bankdaten aus Google Form ins Partner-Sheet
 * - setupSheets(): Erstellt alle 4 Blaetter mit Headern (einmalig ausfuehren!)
 *
 * DEPLOYMENT:
 * 1. Bereitstellen → Neue Bereitstellung → Web-App
 * 2. Ausfuehren als: Ich (hello@digitalwerk24.com)
 * 3. Zugriff: Jeder
 * 4. WICHTIG: Nach Code-Aenderungen immer NEUE Bereitstellung erstellen!
 *
 * TRIGGER (manuell einrichten):
 * - onEditTrigger: Aus Tabelle → Bei Bearbeitung (installierbarer Trigger!)
 * - onFormSubmit: Aus Tabelle → Beim Absenden des Formulars
 */

// ===== KONFIGURATION =====
const SHEET_ID = '1wgmiMOzZ1epTolNfnc60iQG4Su0qTLEyi0jYKYN_2cs';
const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSd9WOmH_foMe6oDW3XcUjpcX3n97x1QoG5qOIFvjYWkFagVUQ/viewform';
const FORM_ENTRY_EMPFEHLUNGSCODE = '1708813850';

// ===== HILFSFUNKTION: JSON-Antwort erstellen =====
function jsonResponse(obj) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(obj));
  return output;
}

/**
 * POST-Endpoint: Zentrales Routing fuer alle POST-Anfragen
 * Unterstuetzte Actions: register, login, saveBankData
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // Action-Routing: je nach action-Feld die richtige Funktion aufrufen
    var action = (data.action || 'register').toLowerCase();

    switch (action) {
      case 'login':
        return handleLogin(data);
      case 'savebankdata':
        return handleSaveBankData(data);
      case 'register':
      default:
        return handleRegistration(data);
    }

  } catch (error) {
    Logger.log('DW24 doPost Fehler: ' + error.message);
    return jsonResponse({
      success: false,
      error: 'server_error',
      message: 'Anfrage fehlgeschlagen: ' + error.message
    });
  }
}

// ============================================================
// ACTION: Partner-Registrierung (bestehende Funktion, refactored)
// ============================================================

/**
 * Partner-Registrierung: Schreibt neuen Partner ins Sheet + sendet DOI-Mail
 */
function handleRegistration(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Partner');

  // Pruefen ob E-Mail bereits existiert (Duplikat-Schutz)
  var emailColumn = sheet.getRange('D2:D' + Math.max(sheet.getLastRow(), 2)).getValues();
  for (var i = 0; i < emailColumn.length; i++) {
    if (emailColumn[i][0].toString().toLowerCase().trim() === data.email.toLowerCase().trim()) {
      return jsonResponse({
        success: false,
        error: 'duplicate',
        message: 'Diese E-Mail-Adresse ist bereits registriert.'
      });
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

  return jsonResponse({
    success: true,
    partnerId: partnerId,
    empfehlungscode: partnerId,
    message: 'Registrierung erfolgreich. Bitte E-Mail bestaetigen.'
  });
}

// ============================================================
// ACTION: Partner-Login (NEU in v4.0)
// ============================================================

/**
 * Partner-Login: Validiert E-Mail + Empfehlungscode, liefert Dashboard-Daten
 * Gibt Partner-Infos, Empfehlungen und Bankdaten-Status zurueck
 */
function handleLogin(data) {
  var email = (data.email || '').toLowerCase().trim();
  var code = (data.code || '').toUpperCase().trim();

  if (!email || !code) {
    return jsonResponse({
      success: false,
      message: 'E-Mail und Empfehlungscode sind erforderlich.'
    });
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var partnerSheet = ss.getSheetByName('Partner');
  var partnerData = partnerSheet.getDataRange().getValues();

  // Partner suchen: E-Mail (Spalte D, Index 3) + Empfehlungscode (Spalte F, Index 5)
  var partnerRow = -1;
  for (var i = 1; i < partnerData.length; i++) {
    var rowEmail = partnerData[i][3].toString().toLowerCase().trim();
    var rowCode = partnerData[i][5].toString().toUpperCase().trim();

    if (rowEmail === email && rowCode === code) {
      partnerRow = i;
      break;
    }
  }

  if (partnerRow === -1) {
    return jsonResponse({
      success: false,
      message: 'E-Mail oder Empfehlungscode stimmen nicht ueberein.'
    });
  }

  var partner = partnerData[partnerRow];

  // Pruefen ob DOI bestaetigt wurde (Spalte I, Index 8)
  if (!partner[8] || partner[8] === '') {
    return jsonResponse({
      success: false,
      message: 'Bitte bestaetige zuerst deine E-Mail-Adresse ueber den Link in der Bestaetigungsmail.'
    });
  }

  // Empfehlungen des Partners laden
  var empfehlungen = [];
  var empSheet = ss.getSheetByName('Empfehlungen');
  if (empSheet) {
    var empData = empSheet.getDataRange().getValues();
    for (var j = 1; j < empData.length; j++) {
      // Spalte B (Index 1) = Empfehlungscode
      if (empData[j][1].toString().toUpperCase().trim() === code) {
        empfehlungen.push({
          name: empData[j][3] || '',                 // D: Empfohlener Name
          firma: empData[j][4] || '',                // E: Empfohlene Firma
          branche: empData[j][7] || '',              // H: Branche/Gewerk
          datum: empData[j][8] ? empData[j][8].toISOString ? empData[j][8].toISOString() : empData[j][8].toString() : '',  // I: Empfohlen am
          status: empData[j][9] || 'Neu',            // J: Status
          provisionFaellig: empData[j][12] || '',    // M: Provision faellig
          provisionAusgezahlt: empData[j][13] || ''  // N: Provision ausgezahlt
        });
      }
    }
  }

  // Auszahlungen des Partners laden
  var ausgezahlt = 0;
  var auszahlungsSheet = ss.getSheetByName('Auszahlungen');
  if (auszahlungsSheet) {
    var ausData = auszahlungsSheet.getDataRange().getValues();
    for (var k = 1; k < ausData.length; k++) {
      // Spalte B (Index 1) = Empfehlungscode
      if (ausData[k][1].toString().toUpperCase().trim() === code) {
        var betrag = parseFloat(ausData[k][4]) || 0; // Spalte E (Index 4) = Betrag
        if (ausData[k][8] === 'Bestaetigt' || ausData[k][8] === 'Ausgezahlt') {
          ausgezahlt += betrag;
        }
      }
    }
  }

  // Notizen parsen fuer Adresse und Art
  var notizen = partner[20] || '';
  var adresse = '';
  var art = '';
  var bic = '';

  // Adresse, Art und BIC aus Notizen extrahieren (Format: "key: value")
  var adresseMatch = notizen.match(/Adresse:\s*([^|]+)/);
  if (adresseMatch) adresse = adresseMatch[1].trim();
  var artMatch = notizen.match(/(Privat|Gewerblich)/i);
  if (artMatch) art = artMatch[1];
  var bicMatch = notizen.match(/BIC:\s*([^\s|]+)/);
  if (bicMatch) bic = bicMatch[1].trim();

  // Antwort mit allen Dashboard-Daten
  return jsonResponse({
    success: true,
    data: {
      vorname: partner[1],                          // B: Vorname
      nachname: partner[2],                         // C: Nachname
      email: partner[3],                            // D: E-Mail
      telefon: partner[4],                          // E: Telefon
      empfehlungscode: partner[5],                  // F: Empfehlungscode
      status: partner[6],                           // G: Status
      registriertAm: partner[7] ? partner[7].toISOString ? partner[7].toISOString() : partner[7].toString() : '',
      doiAm: partner[8] ? partner[8].toISOString ? partner[8].toISOString() : partner[8].toString() : '',
      anzahlEmpfehlungen: parseInt(partner[12]) || 0,   // M: Anzahl Empfehlungen
      abgeschlosseneEmpfehlungen: parseInt(partner[13]) || 0, // N: Davon abgeschlossen
      iban: partner[17] || '',                      // R: IBAN
      paypal: partner[18] || '',                    // S: PayPal
      steuernr: partner[19] || '',                  // T: Steuernr
      bic: bic,
      adresse: adresse,
      art: art,
      ausgezahlt: ausgezahlt,
      empfehlungen: empfehlungen
    }
  });
}

// ============================================================
// ACTION: Bankdaten speichern (NEU in v4.0)
// ============================================================

/**
 * Bankdaten speichern/aktualisieren: Wird vom Partner-Dashboard aufgerufen
 * Validiert Partner zuerst per E-Mail + Code, dann speichert Bankdaten
 */
function handleSaveBankData(data) {
  var email = (data.email || '').toLowerCase().trim();
  var code = (data.code || '').toUpperCase().trim();

  if (!email || !code) {
    return jsonResponse({
      success: false,
      message: 'Authentifizierung fehlgeschlagen.'
    });
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Partner');
  var partnerData = sheet.getDataRange().getValues();

  // Partner finden und validieren
  var partnerRow = -1;
  for (var i = 1; i < partnerData.length; i++) {
    var rowEmail = partnerData[i][3].toString().toLowerCase().trim();
    var rowCode = partnerData[i][5].toString().toUpperCase().trim();

    if (rowEmail === email && rowCode === code) {
      partnerRow = i;
      break;
    }
  }

  if (partnerRow === -1) {
    return jsonResponse({
      success: false,
      message: 'Partner nicht gefunden oder Zugangsdaten ungueltig.'
    });
  }

  // Bankdaten in die entsprechenden Spalten schreiben
  var iban = (data.iban || '').trim();
  var paypal = (data.paypal || '').trim();
  var steuernr = (data.steuernr || '').trim();
  var methode = data.methode || '';
  var adresse = (data.adresse || '').trim();
  var art = data.art || '';
  var bic = (data.bic || '').trim();

  // IBAN oder PayPal je nach Methode setzen
  if (methode === 'Ueberweisung') {
    sheet.getRange(partnerRow + 1, 18).setValue(iban);     // Spalte R: IBAN
    // PayPal nicht loeschen falls vorhanden
  } else if (methode === 'PayPal') {
    sheet.getRange(partnerRow + 1, 19).setValue(paypal);   // Spalte S: PayPal
    // IBAN nicht loeschen falls vorhanden
  }

  // Steuernummer aktualisieren
  if (steuernr) {
    sheet.getRange(partnerRow + 1, 20).setValue(steuernr); // Spalte T: Steuernr
  }

  // Notizen aktualisieren (Bankdaten-Infos anhaengen)
  var bankInfo = 'Bankdaten via Dashboard aktualisiert am ' + new Date().toLocaleDateString('de-DE')
    + ' | Methode: ' + methode
    + ' | ' + art
    + ' | Adresse: ' + adresse;
  if (bic) bankInfo += ' | BIC: ' + bic;

  var existingNote = partnerData[partnerRow][20] || '';
  // DOI-Vermerk beibehalten, Bankdaten-Infos ersetzen/anhaengen
  var doiPart = '';
  if (existingNote.indexOf('DOI bestaetigt') > -1) {
    var doiMatch = existingNote.match(/(DOI bestaetigt[^|]*)/);
    if (doiMatch) doiPart = doiMatch[1].trim();
  }
  var newNote = doiPart ? doiPart + ' | ' + bankInfo : bankInfo;
  sheet.getRange(partnerRow + 1, 21).setValue(newNote); // Spalte U: Notizen

  Logger.log('DW24: Bankdaten via Dashboard aktualisiert fuer ' + code);

  return jsonResponse({
    success: true,
    message: 'Bankdaten erfolgreich gespeichert.'
  });
}

// ============================================================
// Double-Opt-In System
// ============================================================

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
  return jsonResponse({
    status: 'ok',
    service: 'DW24 Empfehlungsprogramm',
    version: '4.0',
    timestamp: new Date().toISOString()
  });
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

      // Erfolgsseite mit Partner-Code und Link zum Dashboard anzeigen
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
        + 'font-weight:700;font-size:16px;margin-right:8px;}'
        + '.btn:hover{opacity:0.9;}'
        + '.btn-outline{display:inline-block;margin-top:12px;background:transparent;'
        + 'color:#F97316;padding:12px 28px;border-radius:50px;text-decoration:none;'
        + 'font-weight:600;font-size:14px;border:2px solid #F97316;}'
        + '.btn-outline:hover{background:#FFF7ED;}'
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
        + '<a href="https://empfehlung.digitalwerk24.com/partner" class="btn">'
        + 'Zum Partner-Dashboard &rarr;</a><br>'
        + '<a href="https://empfehlung.digitalwerk24.com" class="btn-outline">'
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

// ============================================================
// DW24-EP-011: Auszahlungs-Workflow
// ============================================================

/**
 * onEdit-Trigger: Erkennt wenn "Kunde bezahlt am" (Spalte L) eingetragen wird
 * WICHTIG: Muss als INSTALLIERBARER Trigger eingerichtet werden!
 * → Apps Script → Trigger → Trigger hinzufuegen → onEditTrigger → Bei Bearbeitung
 */
function onEditTrigger(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;

  // Nur auf Blatt "Empfehlungen", Spalte L (12) reagieren
  if (sheet.getName() !== 'Empfehlungen' || range.getColumn() !== 12) return;

  // Pruefen ob Wert eingetragen wurde (nicht geloescht)
  if (!e.value || e.value === '') return;

  var row = range.getRow();

  // Daten aus der Zeile lesen
  var empfehlungId = sheet.getRange(row, 1).getValue();   // A: Empfehlungs-ID
  var partnerCode = sheet.getRange(row, 2).getValue();     // B: Empfehlungscode
  var partnerName = sheet.getRange(row, 3).getValue();     // C: Partner-Name
  var empfohlenerName = sheet.getRange(row, 4).getValue(); // D: Empfohlener Name
  var provisionAusgezahlt = sheet.getRange(row, 14).getValue(); // N: bereits ausgezahlt?

  // Nur wenn Provision noch nicht ausgezahlt
  if (provisionAusgezahlt === 'Ja') return;

  // Spalte M (Provision faellig) auf "Ja" setzen
  sheet.getRange(row, 13).setValue('Ja');

  // Partner-E-Mail aus Partner-Sheet holen
  var partnerSheet = e.source.getSheetByName('Partner');
  var partnerData = partnerSheet.getDataRange().getValues();
  var partnerEmail = '';
  var partnerVorname = '';

  for (var i = 1; i < partnerData.length; i++) {
    if (partnerData[i][5] === partnerCode) { // Spalte F = Empfehlungscode
      partnerEmail = partnerData[i][3];      // Spalte D = E-Mail
      partnerVorname = partnerData[i][1];    // Spalte B = Vorname
      break;
    }
  }

  if (!partnerEmail) {
    Logger.log('DW24: Keine E-Mail gefunden fuer Partner ' + partnerCode);
    return;
  }

  // Pruefen ob Partner bereits Bankdaten hinterlegt hat
  var hatBankdaten = false;
  for (var i = 1; i < partnerData.length; i++) {
    if (partnerData[i][5] === partnerCode) {
      hatBankdaten = (partnerData[i][17] !== '' || partnerData[i][18] !== '');
      // Spalte R (IBAN) oder S (PayPal)
      break;
    }
  }

  // Gmail-Entwurf erstellen
  createProvisionDraft(partnerEmail, partnerVorname, partnerCode, empfohlenerName, hatBankdaten);

  // Info-Markierung im Sheet
  sheet.getRange(row, 15).setNote('Mail-Entwurf erstellt am ' + new Date().toLocaleDateString('de-DE'));
}

/**
 * Gmail-Entwurf fuer Provisions-Benachrichtigung erstellen
 * Manuel prueft und sendet den Entwurf manuell aus Gmail
 */
function createProvisionDraft(email, vorname, partnerCode, empfohlenerName, hatBankdaten) {

  var formUrlWithCode = GOOGLE_FORM_URL
    + '?usp=pp_url&entry.' + FORM_ENTRY_EMPFEHLUNGSCODE + '=' + encodeURIComponent(partnerCode);

  var bankdatenBlock = '';
  if (!hatBankdaten) {
    bankdatenBlock = '<div style="background:#FFF8F0;border:2px solid #FF8C00;border-radius:8px;padding:20px;margin:20px 0;">'
      + '<p style="font-size:16px;font-weight:bold;color:#1A1A2E;margin:0 0 8px;">Bankdaten benoetigt</p>'
      + '<p style="font-size:14px;color:#333;margin:0 0 16px;">'
      + 'Damit wir dir die Provision ueberweisen koennen, brauchen wir einmalig '
      + 'deine Zahlungsdaten. Du kannst sie entweder ueber dein Partner-Dashboard oder das Formular einreichen:</p>'
      + '<a href="https://empfehlung.digitalwerk24.com/partner" '
      + 'style="background:#F97316;color:#fff;padding:12px 24px;border-radius:8px;'
      + 'text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;margin-right:8px;">'
      + 'Partner-Dashboard &rarr;</a>'
      + '<a href="' + formUrlWithCode + '" '
      + 'style="background:#FF8C00;color:#fff;padding:12px 24px;border-radius:8px;'
      + 'text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">'
      + 'Formular ausfuellen &rarr;</a>'
      + '<p style="font-size:12px;color:#666;margin:12px 0 0;">'
      + 'Deine Daten werden verschluesselt uebertragen und ausschliesslich fuer die '
      + 'Auszahlung verwendet.</p></div>';
  } else {
    bankdatenBlock = '<p style="font-size:14px;color:#065F46;background:#D1FAE5;padding:12px 16px;border-radius:8px;">'
      + '&#10004; Deine Bankdaten liegen uns bereits vor. Die Auszahlung erfolgt in den '
      + 'naechsten Werktagen.</p>';
  }

  var subject = 'Deine 199\u20AC Provision ist faellig! | Digitalwerk24';

  var htmlBody = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">'
    + '<div style="text-align:center;padding:20px 0;border-bottom:3px solid #FF8C00;">'
    + '<h1 style="color:#1A1A2E;font-size:24px;margin:0;">Digitalwerk24</h1>'
    + '<p style="color:#FF8C00;font-size:14px;margin:4px 0 0;">Empfehlungsprogramm</p></div>'
    + '<div style="padding:30px 0;">'
    + '<p style="font-size:16px;color:#333;">Hallo ' + vorname + ',</p>'
    + '<p style="font-size:16px;color:#333;line-height:1.6;">'
    + 'grossartige Neuigkeiten! Deine Empfehlung <strong>' + empfohlenerName + '</strong> '
    + 'hat einen Auftrag bei uns abgeschlossen und bezahlt.</p>'
    + '<div style="background:#1A1A2E;border-radius:8px;padding:24px;text-align:center;margin:20px 0;">'
    + '<p style="color:#ccc;font-size:14px;margin:0 0 8px;">Deine Provision</p>'
    + '<p style="color:#FF8C00;font-size:42px;font-weight:bold;margin:0;">199,00 \u20AC</p>'
    + '<p style="color:#ccc;font-size:12px;margin:8px 0 0;">Empfehlungscode: ' + partnerCode + '</p></div>'
    + bankdatenBlock
    + '<p style="font-size:14px;color:#333;line-height:1.6;">'
    + 'Vielen Dank fuer deine Empfehlung! Weiter so &mdash; fuer jede weitere erfolgreiche '
    + 'Empfehlung erhaeltst du erneut 199\u20AC.</p></div>'
    + '<div style="border-top:1px solid #eee;padding:20px 0;font-size:12px;color:#999;">'
    + '<p>Digitalwerk24 | Revis-1 LLC<br>'
    + '2645 Executive Park Dr, Weston, FL 33331, USA<br>'
    + 'hello@digitalwerk24.com</p></div></div>';

  // ENTWURF erstellen (nicht senden!)
  GmailApp.createDraft(email, subject,
    'Deine 199 EUR Provision ist faellig! Empfehlung: ' + empfohlenerName,
    {
      htmlBody: htmlBody,
      name: 'Digitalwerk24 Empfehlungsprogramm',
      replyTo: 'hello@digitalwerk24.com'
    }
  );

  Logger.log('DW24: Mail-Entwurf erstellt fuer ' + email + ' (Partner: ' + partnerCode + ')');
}

/**
 * Form-Submit-Trigger: Bankdaten aus Google Form ins Partner-Sheet uebernehmen
 * WICHTIG: Als Trigger einrichten → Aus Tabelle → Beim Absenden des Formulars
 */
function onFormSubmit(e) {
  try {
    var responses = e.namedValues;

    var partnerCode = responses['Empfehlungscode'][0].trim();
    var auszahlungsmethode = responses['Auszahlungsmethode'][0];
    var iban = responses['IBAN'] ? responses['IBAN'][0].trim() : '';
    var paypal = responses['PayPal E-Mail'] ? responses['PayPal E-Mail'][0].trim() : '';
    var steuernr = responses['Steuernummer oder USt-ID'] ? responses['Steuernummer oder USt-ID'][0].trim() : '';
    var adresse = responses['Rechnungsadresse'] ? responses['Rechnungsadresse'][0].trim() : '';
    var gewerblich = responses['Gewerblich oder Privat?'][0];

    // Partner im Sheet finden und Bankdaten eintragen
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Partner');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][5] === partnerCode) { // Spalte F = Empfehlungscode
        sheet.getRange(i + 1, 18).setValue(iban);      // Spalte R: IBAN
        sheet.getRange(i + 1, 19).setValue(paypal);     // Spalte S: PayPal
        sheet.getRange(i + 1, 20).setValue(steuernr);   // Spalte T: Steuernr

        // Bestehende Notizen nicht ueberschreiben, sondern ergaenzen
        var existingNote = data[i][20] || '';
        var bankInfo = 'Bankdaten erhalten am ' + new Date().toLocaleDateString('de-DE')
          + ' | ' + gewerblich
          + ' | ' + auszahlungsmethode
          + ' | Adresse: ' + adresse;
        var newNote = existingNote ? existingNote + ' | ' + bankInfo : bankInfo;
        sheet.getRange(i + 1, 21).setValue(newNote); // Spalte U: Notizen

        Logger.log('DW24: Bankdaten eingetragen fuer ' + partnerCode);
        break;
      }
    }
  } catch (error) {
    Logger.log('DW24: Fehler bei Bankdaten-Uebernahme: ' + error.message);
  }
}

// ============================================================
// Setup & Test-Funktionen
// ============================================================

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

/**
 * Trigger programmatisch einrichten (einmalig ausfuehren!)
 * Da das Projekt nicht an die Tabelle gebunden ist, muessen Trigger per Code erstellt werden.
 */
function setupTriggers() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Bestehende Trigger dieser Funktionen loeschen (Duplikate vermeiden)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var funcName = triggers[i].getHandlerFunction();
    if (funcName === 'onEditTrigger' || funcName === 'onFormSubmit') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log('Bestehenden Trigger geloescht: ' + funcName);
    }
  }

  // Trigger 1: onEditTrigger – bei Bearbeitung der Tabelle
  ScriptApp.newTrigger('onEditTrigger')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  Logger.log('Trigger erstellt: onEditTrigger (bei Bearbeitung)');

  // Trigger 2: onFormSubmit – beim Absenden des Google Forms
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  Logger.log('Trigger erstellt: onFormSubmit (bei Formularantwort)');

  Logger.log('=== Beide Trigger erfolgreich eingerichtet! ===');
}

/**
 * DW24 Empfehlungsprogramm – Google Apps Script (v5.0 mit HubSpot CRM Integration)
 *
 * Funktionen:
 * - doPost(e): Zentraler POST-Endpoint mit Action-Routing:
 *   → action=register (oder kein action): Partner-Registrierung + DOI-Mail
 *   → action=login: Partner-Login (E-Mail + Empfehlungscode), liefert Dashboard-Daten
 *   → action=saveBankData: Bankdaten speichern/aktualisieren
 *   → action=forgotCode: Empfehlungscode per E-Mail erneut zusenden
 *   → action=submitReferral: Empfehlung vom Partner eintragen (v4.2)
 *   → action=editReferral: Empfehlung bearbeiten (NEU in v4.3)
 *   → action=uploadGewerbeanmeldung: Gewerbeanmeldung hochladen (NEU in v4.5)
 * - doGet(e): Health-Check + Double-Opt-In Bestaetigung
 * - sendDoubleOptIn(): Sendet Bestaetigungsmail mit Link
 * - handleConfirmation(): Verarbeitet DOI-Bestaetigung, zeigt Erfolgsseite mit Code
 * - handleLogin(): Validiert Partner-Credentials, gibt Dashboard-Daten inkl. PE-Details zurueck
 * - handleSaveBankData(): Speichert Bankdaten aus dem Partner-Dashboard
 * - handleForgotCode(): Sendet Empfehlungscode per E-Mail erneut zu
 * - handleSubmitReferral(): Partner traegt eigene Empfehlung ein (v4.2)
 * - handleEditReferral(): Partner bearbeitet bestehende Empfehlung (NEU in v4.3)
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

// ===== HUBSPOT CRM INTEGRATION (v5.0) =====
var HUBSPOT_TOKEN = PropertiesService.getScriptProperties().getProperty('HUBSPOT_TOKEN'); // Im Apps Script Editor unter Projekteinstellungen → Script-Eigenschaften setzen
var HUBSPOT_API = 'https://api.hubapi.com';

// ===== HUBSPOT FUNKTIONEN =====

/**
 * HubSpot Kontakt erstellen (Typ: Partner)
 * Wird bei Partner-Registrierung aufgerufen
 */
function createHubSpotContact(partnerData) {
  try {
    var url = HUBSPOT_API + '/crm/v3/objects/contacts';
    var properties = {
      'firstname': partnerData.vorname || '',
      'lastname': partnerData.nachname || '',
      'email': partnerData.email,
      'phone': partnerData.telefon || '',
      'kontakttyp': 'Partner',
      'partner_code': partnerData.partnerId || '',
      'partner_status': 'pending',
      'lead_quelle': 'Empfehlungsprogramm',
      'registrierungsdatum_partner': new Date().toISOString().split('T')[0],
      'hubspot_owner_id': '89219995'
    };
    if (partnerData.steuernummer) properties['steuernummer'] = partnerData.steuernummer;

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN },
      payload: JSON.stringify({ properties: properties }),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var responseBody = JSON.parse(response.getContentText());

    Logger.log('HubSpot createContact (' + statusCode + '): ' + JSON.stringify(responseBody));

    if (statusCode === 201) {
      return { success: true, hubspotId: responseBody.id };
    } else if (statusCode === 409) {
      // Duplikat — Kontakt existieren bereits, aktualisieren
      var existingId = responseBody.message.match(/Existing ID: (\d+)/);
      if (existingId && existingId[1]) {
        return updateHubSpotContact(existingId[1], properties);
      }
      return { success: true, message: 'Kontakt existiert bereits' };
    } else {
      return { success: false, error: 'HubSpot API Fehler ' + statusCode };
    }
  } catch (error) {
    Logger.log('HubSpot createContact Fehler: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Bestehenden HubSpot Kontakt aktualisieren
 */
function updateHubSpotContact(contactId, properties) {
  try {
    var url = HUBSPOT_API + '/crm/v3/objects/contacts/' + contactId;
    var updateProps = {};
    for (var key in properties) {
      if (key !== 'email') updateProps[key] = properties[key];
    }

    var options = {
      method: 'patch',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN },
      payload: JSON.stringify({ properties: updateProps }),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    Logger.log('HubSpot updateContact (' + statusCode + ')');

    return { success: statusCode === 200, hubspotId: contactId };
  } catch (error) {
    Logger.log('HubSpot updateContact Fehler: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Partner-Status in HubSpot auf "active" setzen (nach DOI-Bestätigung)
 */
function updateHubSpotPartnerStatus(email) {
  try {
    // Kontakt per E-Mail suchen
    var searchUrl = HUBSPOT_API + '/crm/v3/objects/contacts/search';
    var searchOptions = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN },
      payload: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
        properties: ['email', 'partner_status']
      }),
      muteHttpExceptions: true
    };

    var searchResponse = UrlFetchApp.fetch(searchUrl, searchOptions);
    var searchResult = JSON.parse(searchResponse.getContentText());

    if (searchResult.total > 0) {
      var contactId = searchResult.results[0].id;
      var updateUrl = HUBSPOT_API + '/crm/v3/objects/contacts/' + contactId;
      var updateOptions = {
        method: 'patch',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN },
        payload: JSON.stringify({ properties: { 'partner_status': 'active' } }),
        muteHttpExceptions: true
      };

      var updateResponse = UrlFetchApp.fetch(updateUrl, updateOptions);
      Logger.log('HubSpot Partner-Status update (' + updateResponse.getResponseCode() + ') fuer: ' + email);
      return { success: updateResponse.getResponseCode() === 200 };
    } else {
      Logger.log('HubSpot: Kein Kontakt gefunden fuer: ' + email);
      return { success: false, error: 'Kontakt nicht gefunden' };
    }
  } catch (error) {
    Logger.log('HubSpot updatePartnerStatus Fehler: ' + error.message);
    return { success: false, error: error.message };
  }
}

// ===== HILFSFUNKTION: JSON-Antwort erstellen =====
function jsonResponse(obj) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify(obj));
  return output;
}

// Sicherheit: HTML-Sonderzeichen escapen (gegen HTML-Injection in E-Mails)
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
      case 'forgotcode':
        return handleForgotCode(data);
      case 'submitreferral':
        return handleSubmitReferral(data);
      case 'editreferral':
        return handleEditReferral(data);
      case 'uploadgewerbeanmeldung':
        return handleUploadGewerbeanmeldung(data);
      case 'updateprofile':
        return handleUpdateProfile(data);
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
    data.dse_version || 'v2.1',       // J: DSE-Version
    data.tb_version || 'v1.1',        // K: TB-Version
    data.consent_ip || '',            // L: Consent-IP
    '', '', '', '', '',               // M-Q: Formeln werden unten gesetzt
    '', '',                           // R-S: IBAN, PayPal (leer)
    data.steuernummer || '',          // T: Steuernr./USt-ID (bei Registrierung erfasst)
    'DOI-TOKEN:' + doiToken,          // U: Notizen (temporaer fuer DOI-Token)
    data.firma || ''                  // V: Firma / Unternehmen (NEU)
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

  // HubSpot Kontakt anlegen (non-blocking, Fehler werden geloggt)
  try {
    createHubSpotContact({
      vorname: data.vorname,
      nachname: data.nachname,
      email: data.email.toLowerCase().trim(),
      telefon: data.telefon || '',
      partnerId: partnerId,
      steuernummer: data.steuernummer || ''
    });
  } catch (hsError) {
    Logger.log('HubSpot-Eintrag Fehler: ' + hsError.message);
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

  // Empfehlungen des Partners laden (aus Empfehlungen-Sheet fuer Status/Provision)
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
          provisionAusgezahlt: empData[j][13] || '', // N: Provision ausgezahlt
          empNotizen: empData[j][14] || ''           // O: Notizen (enthaelt PE-ID)
        });
      }
    }
  }

  // Detail-Daten aus Partner-Empfehlungen-Sheet anreichern (fuer Bearbeitung)
  var peSheet = ss.getSheetByName('Partner-Empfehlungen');
  if (peSheet && peSheet.getLastRow() > 1 && empfehlungen.length > 0) {
    var peData = peSheet.getDataRange().getValues();
    for (var e = 0; e < empfehlungen.length; e++) {
      for (var p = 1; p < peData.length; p++) {
        if (peData[p][1].toString().toUpperCase().trim() === code) {
          var peName = ((peData[p][3] || '') + ' ' + (peData[p][4] || '')).trim();
          // Matching ueber Name ODER PE-ID in Notizen
          var peId = peData[p][0] || '';
          var matchByNote = empfehlungen[e].empNotizen && empfehlungen[e].empNotizen.indexOf(peId) > -1;
          var matchByName = peName === empfehlungen[e].name;
          if (matchByNote || matchByName) {
            empfehlungen[e].peId = peId;
            empfehlungen[e].refVorname = peData[p][3] || '';
            empfehlungen[e].refNachname = peData[p][4] || '';
            empfehlungen[e].refFirma = peData[p][5] || '';
            empfehlungen[e].refTelefon = peData[p][6] || '';
            empfehlungen[e].refEmail = peData[p][7] || '';
            empfehlungen[e].refAdresse = peData[p][8] || '';
            break;
          }
        }
      }
      // empNotizen nicht an Frontend zurueckgeben
      delete empfehlungen[e].empNotizen;
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
      firma: partner[21] || '',                     // V: Firma (NEU)
      gewerbeanmeldungUrl: partner[22] || '',       // W: Gewerbeanmeldung Drive-URL (NEU v4.5)
      gewerbeanmeldungDatum: partner[23] || '',     // X: Gewerbeanmeldung Upload-Datum (NEU v4.5)
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
  var steuernr = (data.steuernr || '').trim();
  var methode = data.methode || 'Ueberweisung';
  var adresse = (data.adresse || '').trim();
  var art = data.art || '';
  var bic = (data.bic || '').trim();

  // IBAN setzen
  if (iban) {
    sheet.getRange(partnerRow + 1, 18).setValue(iban);     // Spalte R: IBAN
  }

  // Steuernummer aktualisieren
  if (steuernr) {
    sheet.getRange(partnerRow + 1, 20).setValue(steuernr); // Spalte T: Steuernr
  }

  // Firma aktualisieren (falls uebergeben)
  var firma = (data.firma || '').trim();
  if (firma) {
    sheet.getRange(partnerRow + 1, 22).setValue(firma); // Spalte V: Firma
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

  // HubSpot-Sync: Bankdaten-relevante Felder aktualisieren (non-blocking)
  try {
    syncPartnerToHubSpot(email, {
      'steuernummer': steuernr,
      'betrieb_branche': firma
    });
  } catch (hubspotError) {
    Logger.log('HubSpot Sync nach Bankdaten-Update fehlgeschlagen: ' + hubspotError.message);
  }

  return jsonResponse({
    success: true,
    message: 'Bankdaten erfolgreich gespeichert.'
  });
}

// ============================================================
// ACTION: Profildaten aktualisieren (NEU in v5.3)
// ============================================================

/**
 * Profildaten aktualisieren: Wird vom Partner-Dashboard aufgerufen
 * Aktualisiert Vorname, Nachname, Telefon, Firma, Steuernummer im Sheet + HubSpot
 */
function handleUpdateProfile(data) {
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

  // Felder aktualisieren
  var vorname = (data.vorname || '').trim();
  var nachname = (data.nachname || '').trim();
  var telefon = (data.telefon || '').trim();
  var firma = (data.firma || '').trim();
  var steuernr = (data.steuernr || '').trim();

  if (!vorname || !nachname) {
    return jsonResponse({
      success: false,
      message: 'Vorname und Nachname sind Pflichtfelder.'
    });
  }

  // Sheet aktualisieren
  sheet.getRange(partnerRow + 1, 2).setValue(vorname);    // Spalte B: Vorname
  sheet.getRange(partnerRow + 1, 3).setValue(nachname);   // Spalte C: Nachname
  sheet.getRange(partnerRow + 1, 5).setValue(telefon);    // Spalte E: Telefon
  if (firma) sheet.getRange(partnerRow + 1, 22).setValue(firma);      // Spalte V: Firma
  if (steuernr) sheet.getRange(partnerRow + 1, 20).setValue(steuernr); // Spalte T: Steuernr

  Logger.log('DW24: Profildaten via Dashboard aktualisiert fuer ' + code);

  // HubSpot-Sync (non-blocking)
  try {
    syncPartnerToHubSpot(email, {
      'firstname': vorname,
      'lastname': nachname,
      'phone': telefon,
      'steuernummer': steuernr
    });
  } catch (hubspotError) {
    Logger.log('HubSpot Sync nach Profil-Update fehlgeschlagen: ' + hubspotError.message);
  }

  return jsonResponse({
    success: true,
    message: 'Profildaten erfolgreich aktualisiert.'
  });
}

/**
 * Partner-Daten in HubSpot synchronisieren (per E-Mail-Suche)
 * Wird bei Profil- und Bankdaten-Aenderungen aufgerufen
 */
function syncPartnerToHubSpot(email, properties) {
  // Kontakt per E-Mail in HubSpot suchen
  var searchUrl = HUBSPOT_API + '/crm/v3/objects/contacts/search';
  var searchOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN },
    payload: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: ['email']
    }),
    muteHttpExceptions: true
  };

  var searchResponse = UrlFetchApp.fetch(searchUrl, searchOptions);
  var searchResult = JSON.parse(searchResponse.getContentText());

  if (searchResult.total > 0) {
    var contactId = searchResult.results[0].id;
    var updateResult = updateHubSpotContact(contactId, properties);
    Logger.log('HubSpot Sync fuer ' + email + ': ' + JSON.stringify(updateResult));
    return updateResult;
  } else {
    Logger.log('HubSpot Sync: Kein Kontakt fuer ' + email + ' gefunden.');
    return { success: false, message: 'Kontakt nicht gefunden' };
  }
}

// ============================================================
// ACTION: Gewerbeanmeldung hochladen (NEU in v4.5)
// ============================================================

/**
 * Gewerbeanmeldung-Upload: Partner laedt Gewerbeanmeldung als PDF/Bild hoch
 * Datei wird in Google Drive gespeichert und im Partner-Sheet verlinkt
 * Erstellt Gmail-Entwurf als Benachrichtigung fuer Manuel
 */
function handleUploadGewerbeanmeldung(data) {
  var email = (data.email || '').toLowerCase().trim();
  var code = (data.code || '').toUpperCase().trim();

  if (!email || !code) {
    return jsonResponse({
      success: false,
      message: 'Authentifizierung fehlgeschlagen.'
    });
  }

  var filename = (data.filename || '').trim();
  var fileContent = (data.fileContent || '').trim();
  var mimeType = (data.mimeType || '').trim();

  // Validierung: Pflichtfelder
  if (!filename || !fileContent || !mimeType) {
    return jsonResponse({
      success: false,
      message: 'Bitte waehle eine Datei zum Hochladen aus.'
    });
  }

  // Validierung: Erlaubte Dateitypen
  var allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (allowedTypes.indexOf(mimeType) === -1) {
    return jsonResponse({
      success: false,
      message: 'Nur PDF-, PNG- und JPG-Dateien sind erlaubt.'
    });
  }

  // Sicherheit: Dateigroesse pruefen (max 5 MB als Base64 = ca. 6.67 MB String)
  var MAX_BASE64_LENGTH = 7 * 1024 * 1024; // 7 MB Base64-String-Limit
  if (fileContent.length > MAX_BASE64_LENGTH) {
    return jsonResponse({
      success: false,
      message: 'Die Datei ist zu gross. Maximal 5 MB erlaubt.'
    });
  }

  // Partner finden und validieren
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Partner');
  var partnerData = sheet.getDataRange().getValues();

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

  var partner = partnerData[partnerRow];
  var vorname = partner[1] || '';
  var nachname = partner[2] || '';
  var partnerCode = partner[5] || '';

  try {
    // Base64-Daten extrahieren (DataURL Format: data:mimetype;base64,XXXX)
    var base64Data = fileContent;
    if (base64Data.indexOf(',') > -1) {
      base64Data = base64Data.split(',')[1];
    }

    // Dateiendung ermitteln
    var ext = 'pdf';
    if (mimeType === 'image/png') ext = 'png';
    else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') ext = 'jpg';

    // Dateiname: Gewerbeanmeldung_DW24-CODE_DATUM.ext
    var datum = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    var driveFilename = 'Gewerbeanmeldung_' + partnerCode + '_' + datum + '.' + ext;

    // Google Drive Ordner finden oder erstellen
    var rootFolder = DriveApp.getRootFolder();
    var mainFolders = rootFolder.getFoldersByName('DW24-Gewerbeanmeldungen');
    var mainFolder;
    if (mainFolders.hasNext()) {
      mainFolder = mainFolders.next();
    } else {
      mainFolder = rootFolder.createFolder('DW24-Gewerbeanmeldungen');
    }

    // Alte Gewerbeanmeldung loeschen falls vorhanden
    var existingFiles = mainFolder.getFilesByName('Gewerbeanmeldung_' + partnerCode);
    // Suche nach allen Dateien die mit diesem Praefix beginnen
    var allFiles = mainFolder.getFiles();
    while (allFiles.hasNext()) {
      var existingFile = allFiles.next();
      if (existingFile.getName().indexOf('Gewerbeanmeldung_' + partnerCode + '_') === 0) {
        existingFile.setTrashed(true);
      }
    }

    // Neue Datei erstellen
    var blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      mimeType,
      driveFilename
    );
    var file = mainFolder.createFile(blob);
    var fileUrl = file.getUrl();
    var fileId = file.getId();

    // Partner-Sheet aktualisieren: Spalte W (23) = Drive-URL, Spalte X (24) = Datum
    sheet.getRange(partnerRow + 1, 23).setValue(fileUrl);  // Spalte W: Gewerbeanmeldung Drive-URL
    sheet.getRange(partnerRow + 1, 24).setValue(new Date().toLocaleDateString('de-DE') + ' ' + new Date().toLocaleTimeString('de-DE')); // Spalte X: Upload-Datum

    // Gmail-Entwurf erstellen fuer Manuel (alle User-Daten HTML-escaped)
    var safeVorname = escapeHtml(vorname);
    var safeNachname = escapeHtml(nachname);
    var safeEmail = escapeHtml(email);
    var safeCode = escapeHtml(partnerCode);
    var safeDriveFilename = escapeHtml(driveFilename);

    var subject = 'Neue Gewerbeanmeldung: ' + escapeHtml(vorname) + ' ' + escapeHtml(nachname) + ' (' + escapeHtml(partnerCode) + ')';
    var htmlBody = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">'
      + '<div style="text-align:center;padding:20px 0;border-bottom:3px solid #FF8C00;">'
      + '<h1 style="color:#1A1A2E;font-size:24px;margin:0;">Digitalwerk24</h1>'
      + '<p style="color:#FF8C00;font-size:14px;margin:4px 0 0;">Empfehlungsprogramm – Gewerbeanmeldung</p></div>'
      + '<div style="padding:30px 0;">'
      + '<p style="font-size:16px;color:#333;">Neue Gewerbeanmeldung hochgeladen:</p>'
      + '<table style="width:100%;border-collapse:collapse;margin:16px 0;">'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;width:140px;">Partner:</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">' + safeVorname + ' ' + safeNachname + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Empfehlungscode:</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">' + safeCode + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">E-Mail:</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;">' + safeEmail + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Dateiname:</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;">' + safeDriveFilename + '</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Hochgeladen am:</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;">' + datum + '</td></tr>'
      + '</table>'
      + '<a href="' + escapeHtml(fileUrl) + '" '
      + 'style="background:#F97316;color:#fff;padding:12px 24px;border-radius:8px;'
      + 'text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">'
      + 'Gewerbeanmeldung in Drive oeffnen &rarr;</a>'
      + '</div>'
      + '<div style="border-top:1px solid #eee;padding:20px 0;font-size:12px;color:#999;">'
      + '<p>Automatisch erstellt vom DW24 Empfehlungsprogramm</p></div></div>';

    GmailApp.createDraft('hello@digitalwerk24.com', subject,
      'Neue Gewerbeanmeldung von ' + escapeHtml(vorname) + ' ' + escapeHtml(nachname) + ' (' + escapeHtml(partnerCode) + ')',
      {
        htmlBody: htmlBody,
        name: 'Digitalwerk24 System',
        replyTo: email
      }
    );

    // HubSpot: Gewerbeanmeldung-URL beim Partner-Kontakt speichern (non-blocking)
    try {
      var searchUrl = HUBSPOT_API + '/crm/v3/objects/contacts/search';
      var searchPayload = {
        filterGroups: [{
          filters: [{ propertyName: 'email', operator: 'EQ', value: email }]
        }],
        properties: ['email']
      };
      var searchResp = UrlFetchApp.fetch(searchUrl, {
        method: 'post',
        contentType: 'application/json',
        headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN },
        payload: JSON.stringify(searchPayload),
        muteHttpExceptions: true
      });
      var searchData = JSON.parse(searchResp.getContentText());
      if (searchData.total > 0) {
        var contactId = searchData.results[0].id;
        var updateUrl = HUBSPOT_API + '/crm/v3/objects/contacts/' + contactId;
        UrlFetchApp.fetch(updateUrl, {
          method: 'patch',
          contentType: 'application/json',
          headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN },
          payload: JSON.stringify({ properties: { gewerbeanmeldung_url: fileUrl } }),
          muteHttpExceptions: true
        });
        Logger.log('DW24: HubSpot Gewerbeanmeldung-URL gesetzt fuer Kontakt ' + contactId);
      }
    } catch (hubspotError) {
      Logger.log('DW24: HubSpot Update fehlgeschlagen (non-blocking): ' + hubspotError.message);
    }

    Logger.log('DW24: Gewerbeanmeldung hochgeladen fuer ' + partnerCode + ' → ' + fileUrl);

    return jsonResponse({
      success: true,
      message: 'Gewerbeanmeldung erfolgreich hochgeladen.',
      fileUrl: fileUrl
    });

  } catch (uploadError) {
    // Sicherheit: Nur generische Fehlermeldung an Client, Details nur ins Log
    Logger.log('DW24: Gewerbeanmeldung Upload-Fehler fuer ' + code + ': ' + uploadError.message);
    return jsonResponse({
      success: false,
      message: 'Fehler beim Hochladen. Bitte versuche es erneut oder kontaktiere uns.'
    });
  }
}

// ============================================================
// ACTION: Code vergessen (NEU in v4.1)
// ============================================================

/**
 * Code vergessen: Sucht Partner anhand E-Mail und sendet Empfehlungscode erneut zu
 * Nur fuer bereits bestaetigte Partner (DOI abgeschlossen)
 */
function handleForgotCode(data) {
  var email = (data.email || '').toLowerCase().trim();

  if (!email) {
    return jsonResponse({
      success: false,
      message: 'Bitte gib deine E-Mail-Adresse ein.'
    });
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Partner');
  var partnerData = sheet.getDataRange().getValues();

  // Partner anhand E-Mail suchen (Spalte D, Index 3)
  var partnerRow = -1;
  for (var i = 1; i < partnerData.length; i++) {
    if (partnerData[i][3].toString().toLowerCase().trim() === email) {
      partnerRow = i;
      break;
    }
  }

  if (partnerRow === -1) {
    return jsonResponse({
      success: false,
      message: 'Es wurde kein Partner mit dieser E-Mail-Adresse gefunden.'
    });
  }

  var partner = partnerData[partnerRow];
  var vorname = partner[1];           // Spalte B: Vorname
  var empfehlungscode = partner[5];   // Spalte F: Empfehlungscode

  // E-Mail mit dem Empfehlungscode senden
  try {
    var subject = 'Dein Empfehlungscode | Digitalwerk24';

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
      + '<p style="font-size:16px;color:#333;">Hallo ' + escapeHtml(vorname) + ',</p>'
      + '<p style="font-size:16px;color:#333;line-height:1.6;">'
      + 'du hast deinen Empfehlungscode angefordert. Hier ist er:</p>'
      + '<div style="background:linear-gradient(135deg,#FFF7ED,#FFEDD5);border:2px dashed #F97316;'
      + 'border-radius:16px;padding:24px;margin:24px 0;text-align:center;">'
      + '<span style="display:block;font-size:13px;color:#64748B;text-transform:uppercase;'
      + 'letter-spacing:1px;font-weight:600;margin-bottom:8px;">Dein Empfehlungscode:</span>'
      + '<span style="font-size:2rem;font-weight:900;color:#F97316;letter-spacing:3px;'
      + 'font-family:Courier New,monospace;">' + escapeHtml(empfehlungscode) + '</span>'
      + '</div>'
      + '<p style="font-size:14px;color:#666;line-height:1.6;">'
      + 'Mit diesem Code und deiner E-Mail-Adresse kannst du dich jederzeit in dein '
      + '<a href="https://empfehlung.digitalwerk24.com/partner" style="color:#F97316;">Partner-Dashboard</a> einloggen.</p>'
      + '</div>'
      // Footer
      + '<div style="border-top:1px solid #eee;padding:20px 0;font-size:12px;color:#999;">'
      + '<p>Digitalwerk24 | Revis-1 LLC<br>'
      + '2645 Executive Park Dr, Weston, FL 33331, USA<br>'
      + 'partner@digitalwerk24.com</p>'
      + '<p>Du erhaeltst diese E-Mail weil du deinen Empfehlungscode angefordert hast. '
      + 'Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>'
      + '</div></div></body></html>';

    GmailApp.sendEmail(email, subject,
      'Dein Empfehlungscode: ' + empfehlungscode + ' – Login: https://empfehlung.digitalwerk24.com/partner',
      {
        htmlBody: htmlBody,
        name: 'Digitalwerk24 Empfehlungsprogramm',
        replyTo: 'partner@digitalwerk24.com'
      }
    );

    Logger.log('DW24: Empfehlungscode erneut gesendet an ' + email + ' (' + empfehlungscode + ')');

    return jsonResponse({
      success: true,
      message: 'Dein Empfehlungscode wurde an deine E-Mail-Adresse gesendet.'
    });

  } catch (mailError) {
    Logger.log('DW24: Fehler beim Code-Versand an ' + email + ': ' + mailError.message);
    return jsonResponse({
      success: false,
      message: 'E-Mail konnte nicht gesendet werden. Bitte kontaktiere partner@digitalwerk24.com.'
    });
  }
}

// ============================================================
// ACTION: Empfehlung eintragen (NEU in v4.2)
// ============================================================

/**
 * Partner traegt eine neue Empfehlung ueber das Dashboard ein.
 * Schreibt in "Partner-Empfehlungen" (Detail-Sheet) UND "Empfehlungen" (Workflow-Sheet).
 */
function handleSubmitReferral(data) {
  var email = (data.email || '').toLowerCase().trim();
  var code = (data.code || '').toUpperCase().trim();

  if (!email || !code) {
    return jsonResponse({
      success: false,
      message: 'Authentifizierung fehlgeschlagen.'
    });
  }

  // Pflichtfelder pruefen
  var refVorname = (data.refVorname || '').trim();
  var refNachname = (data.refNachname || '').trim();

  if (!refVorname || !refNachname) {
    return jsonResponse({
      success: false,
      message: 'Bitte mindestens Vorname und Nachname angeben.'
    });
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var partnerSheet = ss.getSheetByName('Partner');
  var partnerData = partnerSheet.getDataRange().getValues();

  // Partner finden und validieren
  var partnerRow = -1;
  var partnerName = '';
  for (var i = 1; i < partnerData.length; i++) {
    var rowEmail = partnerData[i][3].toString().toLowerCase().trim();
    var rowCode = partnerData[i][5].toString().toUpperCase().trim();

    if (rowEmail === email && rowCode === code) {
      partnerRow = i;
      partnerName = partnerData[i][1] + ' ' + partnerData[i][2]; // Vorname + Nachname
      break;
    }
  }

  if (partnerRow === -1) {
    return jsonResponse({
      success: false,
      message: 'Partner nicht gefunden oder Zugangsdaten ungueltig.'
    });
  }

  // Empfehlungsdaten zusammenstellen
  var refFirma = (data.refFirma || '').trim();
  var refTelefon = (data.refTelefon || '').trim();
  var refEmail = (data.refEmail || '').trim();
  var refAdresse = (data.refAdresse || '').trim();
  var refBranche = (data.refBranche || '').trim();
  var vollName = refVorname + ' ' + refNachname;
  var jetzt = new Date();

  // 1. In "Partner-Empfehlungen" Sheet schreiben (Detail-Liste zum Nachfassen)
  var peSheet = ss.getSheetByName('Partner-Empfehlungen');
  if (!peSheet) {
    // Sheet erstellen falls noch nicht vorhanden
    peSheet = ss.insertSheet('Partner-Empfehlungen');
    var peHeaders = ['ID', 'Empfehlungscode', 'Partner-Name', 'Vorname', 'Nachname', 'Firma', 'Telefon', 'E-Mail', 'Adresse', 'Branche/Gewerk', 'Eingereicht am', 'Status', 'Notizen'];
    peSheet.getRange(1, 1, 1, peHeaders.length).setValues([peHeaders]);
    peSheet.getRange(1, 1, 1, peHeaders.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    peSheet.setFrozenRows(1);

    // Status-Dropdown
    var peStatusRule = SpreadsheetApp.newDataValidation().requireValueInList(['Neu', 'Kontaktiert', 'In Bearbeitung', 'Abgeschlossen', 'Abgelehnt']).build();
    peSheet.getRange('L2:L1000').setDataValidation(peStatusRule);
  }

  // ID generieren: PE-001, PE-002, etc.
  var peLastRow = peSheet.getLastRow();
  var peNr = String(peLastRow).padStart(3, '0');
  var peId = 'PE-' + peNr;

  peSheet.appendRow([
    peId,                 // A: ID
    code,                 // B: Empfehlungscode
    partnerName,          // C: Partner-Name
    refVorname,           // D: Vorname
    refNachname,          // E: Nachname
    refFirma,             // F: Firma
    refTelefon,           // G: Telefon
    refEmail,             // H: E-Mail
    refAdresse,           // I: Adresse
    refBranche,           // J: Branche/Gewerk
    jetzt,                // K: Eingereicht am
    'Neu',                // L: Status
    'Vom Partner eingereicht'  // M: Notizen
  ]);

  // 2. In "Empfehlungen" Sheet schreiben (Workflow-Sheet fuer Provisionen)
  var empSheet = ss.getSheetByName('Empfehlungen');
  if (empSheet) {
    var empLastRow = empSheet.getLastRow();
    var empNr = String(empLastRow).padStart(3, '0');
    var empId = 'EMP-' + empNr;

    empSheet.appendRow([
      empId,                  // A: Empfehlungs-ID
      code,                   // B: Empfehlungscode
      partnerName,            // C: Partner-Name
      vollName,               // D: Empfohlener Name
      refFirma || refEmail,   // E: Empfohlene Firma/E-Mail
      refEmail,               // F: Empfohlene E-Mail
      refTelefon,             // G: Empfohlenes Telefon
      refBranche,             // H: Branche/Gewerk
      jetzt,                  // I: Empfohlen am
      'Neu',                  // J: Status
      '',                     // K: DW24-Auftragswert
      '',                     // L: Kunde bezahlt am
      '',                     // M: Provision faellig
      'Nein',                 // N: Provision ausgezahlt
      'Vom Partner eingereicht (PE-' + peNr + ') | Adresse: ' + refAdresse  // O: Notizen
    ]);
  }

  Logger.log('DW24: Neue Empfehlung von ' + code + ': ' + vollName + ' (' + peId + ')');

  return jsonResponse({
    success: true,
    referralId: peId,
    message: 'Empfehlung erfolgreich eingetragen! Wir kuemmern uns um den Rest.'
  });
}

// ============================================================
// ACTION: Empfehlung bearbeiten (NEU in v4.3)
// ============================================================

/**
 * Partner bearbeitet eine bestehende Empfehlung ueber das Dashboard.
 * Aktualisiert "Partner-Empfehlungen" (Detail-Sheet) UND "Empfehlungen" (Workflow-Sheet).
 */
function handleEditReferral(data) {
  var email = (data.email || '').toLowerCase().trim();
  var code = (data.code || '').toUpperCase().trim();
  var peId = (data.peId || '').trim();

  if (!email || !code || !peId) {
    return jsonResponse({
      success: false,
      message: 'Authentifizierung fehlgeschlagen.'
    });
  }

  // Pflichtfelder pruefen
  var refVorname = (data.refVorname || '').trim();
  var refNachname = (data.refNachname || '').trim();

  if (!refVorname || !refNachname) {
    return jsonResponse({
      success: false,
      message: 'Bitte mindestens Vorname und Nachname angeben.'
    });
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Partner validieren
  var partnerSheet = ss.getSheetByName('Partner');
  var partnerData = partnerSheet.getDataRange().getValues();
  var partnerFound = false;
  for (var i = 1; i < partnerData.length; i++) {
    var rowEmail = partnerData[i][3].toString().toLowerCase().trim();
    var rowCode = partnerData[i][5].toString().toUpperCase().trim();
    if (rowEmail === email && rowCode === code) {
      partnerFound = true;
      break;
    }
  }

  if (!partnerFound) {
    return jsonResponse({
      success: false,
      message: 'Partner nicht gefunden oder Zugangsdaten ungueltig.'
    });
  }

  // Partner-Empfehlungen Sheet: Zeile finden
  var peSheet = ss.getSheetByName('Partner-Empfehlungen');
  if (!peSheet) {
    return jsonResponse({
      success: false,
      message: 'Empfehlungsdaten nicht gefunden.'
    });
  }

  var peData = peSheet.getDataRange().getValues();
  var peRow = -1;
  var oldName = '';
  for (var j = 1; j < peData.length; j++) {
    if (peData[j][0].toString().trim() === peId && peData[j][1].toString().toUpperCase().trim() === code) {
      peRow = j;
      oldName = ((peData[j][3] || '') + ' ' + (peData[j][4] || '')).trim();
      break;
    }
  }

  if (peRow === -1) {
    return jsonResponse({
      success: false,
      message: 'Empfehlung nicht gefunden oder gehoert nicht zu diesem Partner.'
    });
  }

  // Neue Daten zusammenstellen
  var refFirma = (data.refFirma || '').trim();
  var refTelefon = (data.refTelefon || '').trim();
  var refEmail = (data.refEmail || '').trim();
  var refAdresse = (data.refAdresse || '').trim();
  var refBranche = (data.refBranche || '').trim();
  var vollName = refVorname + ' ' + refNachname;

  // Partner-Empfehlungen aktualisieren (Spalten D-J)
  peSheet.getRange(peRow + 1, 4).setValue(refVorname);    // D: Vorname
  peSheet.getRange(peRow + 1, 5).setValue(refNachname);   // E: Nachname
  peSheet.getRange(peRow + 1, 6).setValue(refFirma);      // F: Firma
  peSheet.getRange(peRow + 1, 7).setValue(refTelefon);    // G: Telefon
  peSheet.getRange(peRow + 1, 8).setValue(refEmail);      // H: E-Mail
  peSheet.getRange(peRow + 1, 9).setValue(refAdresse);    // I: Adresse
  peSheet.getRange(peRow + 1, 10).setValue(refBranche);   // J: Branche/Gewerk

  // Notizen aktualisieren
  var existingNote = peData[peRow][12] || '';
  var updateNote = existingNote + ' | Bearbeitet am ' + new Date().toLocaleDateString('de-DE');
  peSheet.getRange(peRow + 1, 13).setValue(updateNote);

  // Empfehlungen-Sheet auch aktualisieren (Matching ueber PE-ID in Notizen oder Name)
  var empSheet = ss.getSheetByName('Empfehlungen');
  if (empSheet) {
    var empData = empSheet.getDataRange().getValues();
    for (var k = 1; k < empData.length; k++) {
      if (empData[k][1].toString().toUpperCase().trim() === code) {
        var empNotizen = (empData[k][14] || '').toString();
        if (empNotizen.indexOf(peId) > -1 || empData[k][3].toString().trim() === oldName) {
          empSheet.getRange(k + 1, 4).setValue(vollName);               // D: Empfohlener Name
          empSheet.getRange(k + 1, 5).setValue(refFirma || refEmail);   // E: Empfohlene Firma/E-Mail
          empSheet.getRange(k + 1, 6).setValue(refEmail);               // F: E-Mail
          empSheet.getRange(k + 1, 7).setValue(refTelefon);             // G: Telefon
          empSheet.getRange(k + 1, 8).setValue(refBranche);             // H: Branche
          // Notizen aktualisieren
          var empNote = empData[k][14] || '';
          empNote += ' | Bearbeitet am ' + new Date().toLocaleDateString('de-DE') + ' | Adresse: ' + refAdresse;
          empSheet.getRange(k + 1, 15).setValue(empNote);
          break;
        }
      }
    }
  }

  Logger.log('DW24: Empfehlung bearbeitet von ' + code + ': ' + vollName + ' (' + peId + ')');

  return jsonResponse({
    success: true,
    message: 'Empfehlung erfolgreich aktualisiert!'
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
    + '<p style="font-size:16px;color:#333;">Hallo ' + escapeHtml(vorname) + ',</p>'
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
    version: '4.2',
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

      // HubSpot Partner-Status auf "active" setzen
      try {
        updateHubSpotPartnerStatus(email);
      } catch (hsError) {
        Logger.log('HubSpot Partner-Status Update Fehler: ' + hsError.message);
      }

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
        + '<p class="subtitle">Hallo ' + escapeHtml(vorname) + ', dein Konto ist jetzt aktiv. '
        + 'Hier ist dein persoenlicher Empfehlungscode:</p>'
        + '<div class="code-box">'
        + '<span class="code-label">Dein Empfehlungscode:</span>'
        + '<span class="code">' + escapeHtml(partnerId) + '</span>'
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
    + '<p style="font-size:16px;color:#333;">Hallo ' + escapeHtml(vorname) + ',</p>'
    + '<p style="font-size:16px;color:#333;line-height:1.6;">'
    + 'grossartige Neuigkeiten! Deine Empfehlung <strong>' + escapeHtml(empfohlenerName) + '</strong> '
    + 'hat einen Auftrag bei uns abgeschlossen und bezahlt.</p>'
    + '<div style="background:#1A1A2E;border-radius:8px;padding:24px;text-align:center;margin:20px 0;">'
    + '<p style="color:#ccc;font-size:14px;margin:0 0 8px;">Deine Provision</p>'
    + '<p style="color:#FF8C00;font-size:42px;font-weight:bold;margin:0;">199,00 \u20AC</p>'
    + '<p style="color:#ccc;font-size:12px;margin:8px 0 0;">Empfehlungscode: ' + escapeHtml(partnerCode) + '</p></div>'
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

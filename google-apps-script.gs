/**
 * Krishal & Jayakshi — RSVP backend.
 *
 * Runs inside a Google Sheet (Extensions → Apps Script) and does two jobs:
 *   doPost — the website sends an RSVP here, it gets appended as a new row.
 *   doGet  — the website Dashboard reads the responses back, but ONLY when the
 *            correct passcode is supplied.
 *
 * The passcode lives here, on the server side, and NEVER in the website's
 * JavaScript. A guest viewing the page source sees the address of this script
 * but no working key, so they cannot pull the guest list out of it.
 *
 * Setup instructions are in README.md.
 */

// Change this to whatever you like — then redeploy (Deploy → Manage
// deployments → pencil → Version: New version). It is never sent to the
// website; the website only ever sends it here to be checked.
const SECRET_KEY = 'KJ1712';

// The tab inside the spreadsheet that rows are written to.
const SHEET_NAME = 'RSVPs';

const HEADERS = ['Timestamp', 'Name', 'Attending', 'Guests', 'Message'];


/** Receives an RSVP from the website and appends it as a row. */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getSheet_();

    const attending = data.attending === 'yes' ? 'Yes' : 'No';
    // Anyone who declines is recorded with 0 guests.
    const guests = data.attending === 'yes' ? Number(data.guests) || 1 : 0;

    sheet.appendRow([
      data.timestamp ? new Date(data.timestamp) : new Date(),
      String(data.name || '').slice(0, 200),
      attending,
      guests,
      String(data.message || '').slice(0, 1000)
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}


/**
 * Returns every RSVP as JSON — but only to a caller that knows the passcode.
 * Without it (or with the wrong one) this gives away nothing at all.
 */
function doGet(e) {
  const key = (e && e.parameter && e.parameter.key) || '';

  if (key !== SECRET_KEY) {
    return json_({ ok: false, error: 'Unauthorized' });
  }

  try {
    const sheet = getSheet_();
    const values = sheet.getDataRange().getValues();
    values.shift(); // drop the header row

    const records = values
      .filter(function (row) { return row[1]; }) // skip blank rows
      .map(function (row) {
        return {
          timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
          name: String(row[1]),
          attending: String(row[2]).toLowerCase() === 'yes' ? 'yes' : 'no',
          guests: Number(row[3]) || 0,
          message: String(row[4] || '')
        };
      });

    return json_({ ok: true, records: records });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}


/** Gets the RSVP tab, creating it with headers on first use. */
function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}


function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

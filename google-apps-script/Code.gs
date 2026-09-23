const SHEET_ID = "1K9uhpAHbZq7HeAXfua2wIkEEsSq5dqSF-rerDsrwmKs";

function doGet(e) {
  const query = String(e?.parameter?.q || "").trim();
  const all = String(e?.parameter?.all || "") === "1";

  try {
    const results = all ? getAllKnowledge() : searchKnowledge(query);

    return sendJSON({
      success: true,
      results
    });
  } catch (error) {
    return sendJSON({
      success: false,
      error: String(error?.message || error),
      results: []
    });
  }
}

function getAllKnowledge() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const results = [];

  spreadsheet.getSheets().forEach(function(sheet) {
    const values = sheet.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return;

    const headers = values[0];

    for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
      const row = values[rowIndex];
      const data = {};

      headers.forEach(function(header, columnIndex) {
        const key = String(header || "").trim();
        if (key) {
          data[key] = String(row[columnIndex] || "").trim();
        }
      });

      const hasContent = Object.values(data).some(function(value) {
        return value !== "";
      });

      if (hasContent) {
        results.push({
          sheet: sheet.getName(),
          data
        });
      }
    }
  });

  return results;
}

function searchKnowledge(query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return getAllKnowledge();

  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const ranked = [];

  spreadsheet.getSheets().forEach(function(sheet) {
    const values = sheet.getDataRange().getDisplayValues();
    if (!values || values.length < 2) return;

    const headers = values[0];

    for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
      const row = values[rowIndex];
      const data = {};
      let searchableText = "";

      headers.forEach(function(header, columnIndex) {
        const key = String(header || "").trim();
        const value = String(row[columnIndex] || "").trim();

        if (key) {
          data[key] = value;
          searchableText += " " + key + " " + value;
        }
      });

      const score = scoreText(searchableText, normalizedQuery);

      if (score > 0) {
        ranked.push({
          sheet: sheet.getName(),
          data,
          score
        });
      }
    }
  });

  ranked.sort(function(a, b) {
    return b.score - a.score;
  });

  return ranked.slice(0, 10).map(function(item) {
    return {
      sheet: item.sheet,
      data: item.data
    };
  });
}

function scoreText(text, query) {
  const source = normalize(text);
  const words = query.split(/\s+/).filter(function(word) {
    return word.length > 2;
  });

  let score = source.indexOf(query) >= 0 ? 5 : 0;

  words.forEach(function(word) {
    if (source.indexOf(word) >= 0) {
      score += 1;
    }
  });

  return score;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}₹\s.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sendJSON(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

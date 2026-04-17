function seedDeals() {
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId_());
  const sheet =
    spreadsheet.getSheetByName(CONFIG.DEALS_SHEET_NAME) ||
    spreadsheet.insertSheet(CONFIG.DEALS_SHEET_NAME);

  const fromDate = "2026-01-01";
  const toDate = "2027-01-01";
  const perPage = CONFIG.DEFAULT_PER_PAGE;

  const headers = [
    "deal_id",
    "stage_id",
    "pipeline_id",
    "deal_name",
    "value",
    "currency",
    "owner_id",
    "created_at",
    "last_stage_change_at",
    "estimated_close_date",
    "hot",
    "customized_win_likelihood"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  const lastRow = sheet.getLastRow();
  const idToRow = new Map();

  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i][0];
      if (id !== "" && id != null) {
        idToRow.set(String(id), i + 2);
      }
    }
  }

  const seenDealIds = new Set();
  const seenCursors = new Set();

  let cursor = null;
  let inserts = 0;
  let updates = 0;

  while (true) {
    const payload = {
      items: [{
        data: {
          query: {
            projection: [
              { name: "id" },
              { name: "name" },
              { name: "currency" },
              { name: "decimal_value" },
              { name: "hot" },
              { name: "added_at" },
              { name: "last_stage_change_at" },
              { name: "estimated_close_date" },
              { name: "stage" },
              { name: "pipeline" },
              { name: "owner" }
            ],
            filter: {
              and: [{
                filter: {
                  attribute: { name: "added_at" },
                  parameter: {
                    range: {
                      gte: fromDate,
                      lt: toDate
                    }
                  }
                }
              }]
            },
            sort: [
              { attribute: { name: "added_at" }, order: "ascending" },
              { attribute: { name: "id" }, order: "ascending" }
            ]
          },
          per_page: perPage,
          hits: true,
          ...(cursor ? { cursor } : {})
        }
      }]
    };

    const responseJson = apiRequestV3_("/v3/deals/search", payload);
    const first = responseJson.items && responseJson.items[0] ? responseJson.items[0] : null;

    if (!first || first.successful === false) {
      throw new Error("Invalid response received while seeding deals");
    }

    const items = first.items || [];
    if (!items.length) {
      break;
    }

    for (const item of items) {
      const deal = item.data || {};
      const dealId = deal.id != null ? String(deal.id) : "";

      if (!dealId) {
        continue;
      }

      if (seenDealIds.has(dealId)) {
        continue;
      }
      seenDealIds.add(dealId);

      const stageId = deal.stage && typeof deal.stage === "object" ? (deal.stage.id ?? "") : "";
      const pipelineId = deal.pipeline && typeof deal.pipeline === "object" ? (deal.pipeline.id ?? "") : "";
      const ownerId = deal.owner && typeof deal.owner === "object" ? (deal.owner.id ?? "") : "";

      const rowValues = [
        dealId,
        stageId,
        pipelineId,
        deal.name ?? "",
        deal.decimal_value ?? "",
        deal.currency ?? "",
        ownerId,
        deal.added_at ?? "",
        deal.last_stage_change_at ?? "",
        deal.estimated_close_date ?? "",
        typeof deal.hot === "boolean" ? deal.hot : "",
        ""
      ];

      const existingRow = idToRow.get(dealId);

      if (existingRow) {
        sheet.getRange(existingRow, 1, 1, headers.length).setValues([rowValues]);
        updates++;
      } else {
        const newRow = sheet.getLastRow() + 1;
        sheet.getRange(newRow, 1, 1, headers.length).setValues([rowValues]);
        idToRow.set(dealId, newRow);
        inserts++;
      }
    }

    const nextCursor =
      first.meta && first.meta.cursor
        ? first.meta.cursor
        : first.meta && first.meta.links && first.meta.links.next_page
          ? first.meta.links.next_page
          : null;

    if (!nextCursor) {
      break;
    }

    if (seenCursors.has(nextCursor)) {
      break;
    }

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  ensureDealFormulas_(sheet);

  Logger.log(
    `Seed completed. Unique deals: ${seenDealIds.size}. Updates: ${updates}. Inserts: ${inserts}`
  );
}

function ensureDealFormulas_(sheet) {
  if (sheet.getLastRow() < 2) {
    return;
  }

  if (!sheet.getRange("M2").getFormula()) {
    sheet.getRange("M2").setFormula(
      '=ARRAYFORMULA(IF(A2:A="","",VLOOKUP(B2:B,Stages!A:B,2,FALSE)))'
    );
  }

  if (!sheet.getRange("N2").getFormula()) {
    sheet.getRange("N2").setFormula(
      '=ARRAYFORMULA(IF(A2:A="","",VLOOKUP(G2:G,Users!A:B,2,FALSE)))'
    );
  }

  if (!sheet.getRange("O2").getFormula()) {
    sheet.getRange("O2").setFormula(
      '=ARRAYFORMULA(IF(A2:A="","",VLOOKUP(G2:G,Users!A:H,8,FALSE)))'
    );
  }

  if (!sheet.getRange("P2").getFormula()) {
    sheet.getRange("P2").setFormula(
      '=ARRAYFORMULA(IF(A2:A="","",TEXT(DATEVALUE(LEFT(H2:H,10)),"mmmm")))'
    );
  }

  if (!sheet.getRange("Q2").getFormula()) {
    sheet.getRange("Q2").setFormula(
      '=ARRAYFORMULA(IF(A2:A="","",YEAR(DATEVALUE(LEFT(H2:H,10)))))'
    );
  }
}
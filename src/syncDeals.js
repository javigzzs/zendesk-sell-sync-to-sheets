function syncDeals() {
  const startedAt = Date.now();
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId_());
  const sheet = spreadsheet.getSheetByName(CONFIG.DEALS_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet not found: ${CONFIG.DEALS_SHEET_NAME}`);
  }

  const cache = buildDealsCache_(sheet);
  const props = PropertiesService.getScriptProperties();

  let sessionId = props.getProperty(CONFIG.PROP_SESSION);

  if (!sessionId) {
    const startResponse = apiRequest_("POST", "/v2/sync/start");
    if (startResponse.getResponseCode() === 204) {
      return;
    }

    const startJson = parseJsonResponse_(startResponse);
    sessionId = startJson.data.id;
    props.setProperty(CONFIG.PROP_SESSION, sessionId);
  }

  while (true) {
    if (Date.now() - startedAt > CONFIG.TIME_BUDGET_MS) {
      scheduleResume_();
      return;
    }

    const queueResponse = apiRequest_("GET", `/v2/sync/${sessionId}/queues/main`);
    if (queueResponse.getResponseCode() === 204) {
      break;
    }

    const queueJson = parseJsonResponse_(queueResponse);
    const items = queueJson.items || [];

    if (!items.length) {
      break;
    }

    const ackKeys = [];
    const writes = [];

    for (const item of items) {
      if (item.meta && item.meta.sync && item.meta.sync.ack_key) {
        ackKeys.push(item.meta.sync.ack_key);
      }

      if (!item.meta || item.meta.type !== "deal") {
        continue;
      }

      const deal = item.data;
      if (!deal || !deal.id || !deal.created_at) {
        continue;
      }

      if (deal.created_at < CONFIG.MIN_CREATED_AT) {
        continue;
      }

      const row = cache.idToRow.get(String(deal.id));
      if (!row) {
        continue;
      }

      const previousStage = cache.stageByRow[row];
      const previousStageDate = cache.lastStageByRow[row];

      if (String(previousStage) !== String(deal.stage_id)) {
        writes.push({
          row: row,
          previousStage: previousStage,
          previousStageDate: previousStageDate,
          values: [
            deal.id,
            deal.stage_id,
            deal.pipeline_id || "",
            deal.name || "",
            deal.value || "",
            deal.currency || "",
            deal.owner_id || "",
            deal.created_at,
            deal.last_stage_change_at || "",
            deal.estimated_close_date || "",
            deal.hot ?? "",
            ""
          ]
        });

        cache.stageByRow[row] = deal.stage_id;
        cache.lastStageByRow[row] = deal.last_stage_change_at || "";
      }
    }

    applyDealWrites_(sheet, writes);

    if (ackKeys.length) {
      apiRequest_("POST", "/v2/sync/ack", {
        data: {
          ack_keys: ackKeys
        }
      });
    }

    if (queueJson.meta && queueJson.meta.count_left === 0) {
      break;
    }
  }

  props.deleteProperty(CONFIG.PROP_SESSION);
  cleanupResumeTrigger_();
}

function buildDealsCache_(sheet) {
  const lastRow = sheet.getLastRow();
  const idToRow = new Map();
  const stageByRow = {};
  const lastStageByRow = {};

  if (lastRow < 2) {
    return { idToRow, stageByRow, lastStageByRow };
  }

  const ids = sheet.getRange(2, CONFIG.COL_DEAL_ID, lastRow - 1, 1).getValues();
  const stages = sheet.getRange(2, CONFIG.COL_STAGE_ID, lastRow - 1, 1).getValues();
  const dates = sheet.getRange(2, CONFIG.COL_LAST_STAGE_CHANGE, lastRow - 1, 1).getValues();

  ids.forEach((rowValue, index) => {
    if (rowValue[0]) {
      const row = index + 2;
      idToRow.set(String(rowValue[0]), row);
      stageByRow[row] = stages[index][0];
      lastStageByRow[row] = dates[index][0];
    }
  });

  return { idToRow, stageByRow, lastStageByRow };
}

function applyDealWrites_(sheet, writes) {
  for (const write of writes) {
    sheet.getRange(write.row, 1, 1, 12).setValues([write.values]);
    sheet.getRange(write.row, CONFIG.COL_PREV_STAGE_ID).setValue(write.previousStage);
    sheet.getRange(write.row, CONFIG.COL_PREV_LAST_STAGE_CHANGE).setValue(write.previousStageDate);
  }
}

function scheduleResume_() {
  const props = PropertiesService.getScriptProperties();
  const existingTriggerId = props.getProperty(CONFIG.PROP_RESUME_TRIGGER_ID);

  if (existingTriggerId) {
    return;
  }

  const trigger = ScriptApp.newTrigger("syncDeals")
    .timeBased()
    .after(60 * 1000)
    .create();

  props.setProperty(CONFIG.PROP_RESUME_TRIGGER_ID, trigger.getUniqueId());
}

function cleanupResumeTrigger_() {
  const props = PropertiesService.getScriptProperties();
  const triggerId = props.getProperty(CONFIG.PROP_RESUME_TRIGGER_ID);

  if (!triggerId) {
    return;
  }

  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getUniqueId && trigger.getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  props.deleteProperty(CONFIG.PROP_RESUME_TRIGGER_ID);
}
const CONFIG = {
  BASE_URL: "https://api.getbase.com",

  DEALS_SHEET_NAME: "Deals",
  USERS_SHEET_NAME: "Users",

  MIN_CREATED_AT: "2026-01-01T00:00:00Z",

  COL_DEAL_ID: 1,
  COL_STAGE_ID: 2,
  COL_PIPELINE_ID: 3,
  COL_DEAL_NAME: 4,
  COL_VALUE: 5,
  COL_CURRENCY: 6,
  COL_OWNER_ID: 7,
  COL_CREATED_AT: 8,
  COL_LAST_STAGE_CHANGE: 9,
  COL_EST_CLOSE: 10,
  COL_HOT: 11,
  COL_CWL: 12,

  COL_PREV_STAGE_ID: 18,
  COL_PREV_LAST_STAGE_CHANGE: 19,

  TIME_BUDGET_MS: 5.2 * 60 * 1000,
  PROP_SESSION: "SYNC_SESSION",
  PROP_RESUME_TRIGGER_ID: "SYNC_RESUME_TRIGGER_ID",

  DEFAULT_PER_PAGE: 200
};

function getRequiredProperty_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`Missing required Script Property: ${key}`);
  }
  return value;
}

function getAccessToken_() {
  return getRequiredProperty_("ACCESS_TOKEN");
}

function getDeviceUuid_() {
  return getRequiredProperty_("DEVICE_UUID");
}

function getSpreadsheetId_() {
  return getRequiredProperty_("SPREADSHEET_ID");
}
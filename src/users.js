function syncUsers() {
  const spreadsheet = SpreadsheetApp.openById(getSpreadsheetId_());
  const sheet =
    spreadsheet.getSheetByName(CONFIG.USERS_SHEET_NAME) ||
    spreadsheet.insertSheet(CONFIG.USERS_SHEET_NAME);

  sheet.clearContents();

  const headers = [
    "owner_id",
    "nombre",
    "email",
    "status",
    "role",
    "team_name",
    "group_id",
    "group_name",
    "reports_to",
    "created_at",
    "updated_at"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  let page = 1;
  let writeRow = 2;

  while (true) {
    const response = UrlFetchApp.fetch(
      `${CONFIG.BASE_URL}/v2/users?page=${page}&per_page=100`,
      {
        method: "get",
        muteHttpExceptions: true,
        headers: {
          Authorization: "Bearer " + getAccessToken_(),
          Accept: "application/json"
        }
      }
    );

    const json = parseJsonResponse_(response);
    const users = json.items || [];

    if (!users.length) {
      break;
    }

    const rows = users.map(user => {
      const data = user.data || {};
      const group = data.group && typeof data.group === "object" ? data.group : null;

      return [
        data.id || "",
        data.name || "",
        data.email || "",
        data.status || "",
        data.role || "",
        data.team_name || "",
        group?.id ?? "",
        group?.name ?? "",
        data.reports_to ?? "",
        data.created_at || "",
        data.updated_at || ""
      ];
    });

    sheet.getRange(writeRow, 1, rows.length, headers.length).setValues(rows);
    writeRow += rows.length;
    page++;
  }
}
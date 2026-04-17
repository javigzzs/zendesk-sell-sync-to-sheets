function apiRequest_(method, path, body) {
  const options = {
    method: method,
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + getAccessToken_(),
      "X-Basecrm-Device-UUID": getDeviceUuid_(),
      Accept: "application/json"
    }
  };

  if (body) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(body);
  }

  return UrlFetchApp.fetch(CONFIG.BASE_URL + path, options);
}

function apiRequestV3_(path, body) {
  const response = UrlFetchApp.fetch(CONFIG.BASE_URL + path, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    headers: {
      Authorization: "Bearer " + getAccessToken_(),
      Accept: "application/json"
    },
    payload: JSON.stringify(body)
  });

  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code >= 400) {
    throw new Error(`API error ${code}: ${text}`);
  }

  return JSON.parse(text);
}

function parseJsonResponse_(response) {
  const code = response.getResponseCode();
  const text = response.getContentText();

  if (code >= 400) {
    throw new Error(`API error ${code}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}
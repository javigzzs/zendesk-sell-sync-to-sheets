# Zendesk Sell Sync to Google Sheets

This project started as a practical solution to a real problem: keeping CRM data updated in Google Sheets without constantly reloading everything.

It uses Google Apps Script to connect with the Zendesk Sell API and keep deal and user data in sync, making it easier to analyze pipeline performance directly from Sheets or BI tools.

---

## What this project does

There are three main workflows:

- **seedDeals()**
  - Performs an initial load of deals into the sheet
  - Uses the Zendesk Sell search API
  - Avoids duplicates and supports pagination

- **syncDeals()**
  - Incrementally updates deals using the sync API
  - Only updates rows when something relevant changes (like stage)
  - Handles execution limits using triggers and session state

- **syncUsers()**
  - Loads CRM users into a separate sheet
  - Useful for lookups and enriching deal data

---

## Why I built this

In many teams, reporting depends on having CRM data in spreadsheets.

The usual approach is to reload everything constantly, which is slow, inefficient, and hard to maintain.

This project focuses on:
- updating only what changed  
- reducing unnecessary API calls  
- keeping Sheets usable as a lightweight data layer  

---

## Key features

- Incremental sync (not full reload)
- Session-based pagination using Zendesk Sell sync API
- Resume execution with time-based triggers (Apps Script limit workaround)
- In-memory caching to avoid unnecessary reads
- Selective updates based on deal changes
- Initial seeding + ongoing sync design

---

## Important note (compatibility)

This project was built based on a specific Zendesk Sell setup.

Depending on your account configuration, it **may not work out-of-the-box**, especially if:

- you have different pipelines or stages  
- you use custom fields  
- your schema differs from the one used here  

You may need to adjust:
- field mappings  
- sheet structure  
- API projections  

---

## Note on development process

Some parts of this project were refined with the help of AI tools during development.

The final structure, field mapping decisions, cleanup, and integration were adapted manually based on a real business use case.

---

## Project structure
src/
  config.js
  api.js
  syncDeals.js
  seedDeals.js
  users.js


---

## Setup

### 1. Create your Google Sheet

At minimum:

- `Deals`
- `Users`

Optional (for formulas):
- `Stages`

---

### 2. Configure Script Properties

In Apps Script:

**Project Settings → Script Properties**

Add:

- `ACCESS_TOKEN`
- `DEVICE_UUID`
- `SPREADSHEET_ID`

---

### 3. Run functions

Recommended order:

1. `syncUsers()`
2. `seedDeals()`
3. `syncDeals()`

---

## Example use cases

- Sales pipeline tracking  
- Stage movement analysis  
- CRM reporting in Google Sheets  
- Data source for Power BI or dashboards  

---

## Skills demonstrated

- Google Apps Script
- JavaScript
- REST API integration
- Incremental data sync design
- Handling API pagination
- Managing execution limits
- Data pipeline thinking (even in lightweight environments)

---

## Final note

This is not meant to be a plug-and-play product, but rather a practical example of how to build a lightweight data sync pipeline between a CRM and Google Sheets.

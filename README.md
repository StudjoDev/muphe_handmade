# MUPHÉ Handmade 沐菲

Static ecommerce prototype for MUPHÉ Handmade, centered on scene-based crystal shopping.

## Preview

Open `index.html` directly or serve the folder with any static server.

```powershell
python -m http.server 5173
```

Then visit `http://localhost:5173`.

## Lightweight launch backend

This site stays static. Orders and crystal consultations are submitted with a standard HTML `POST` to a Google Apps Script Web App, which writes to Google Sheets and emails the owner.

Before launch:

1. Deploy `crystal-survey/google-apps-script/*.gs` as a Google Apps Script Web App.
2. Set `SPREADSHEET_ID` and `OWNER_EMAIL` in `crystal-survey/google-apps-script/Config.gs`.
3. Replace `GOOGLE_APPS_SCRIPT_WEB_APP_URL` in `app.js` and `crystal-survey/frontend/crystal-form.html` with the deployed Web App URL.

## Bracelet profile / QR operations

After an order or consultation is fulfilled, each bracelet can receive a public profile URL and printed QR small card. The operational workflow is documented in [`crystal-survey/bracelet-profile-qr-workflow.md`](crystal-survey/bracelet-profile-qr-workflow.md), covering:

- Google Sheet columns for `諮詢紀錄`, `Orders`, and the `手鍊檔案` profile sheet.
- Apps Script deployment expectations for public profile URLs.
- QR generation and small-card print proofing.
- Privacy rules that keep customer PII out of QR URLs and public profile pages.
- Acceptance checks before packing a bracelet with its card.

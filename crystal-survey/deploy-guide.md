# 水晶能量諮詢系統 — 完整部署指南

> 本指南涵蓋「水晶能量諮詢系統」從零開始的完整部署流程，包含 Google Sheets、CSV 統一紀錄、Apps Script、LINE Messaging API、Web App 部署、手鍊檔案 QR 小卡及測試驗證。

---

## 目錄

1. [一、Google Sheets 建立](#一google-sheets-建立)
2. [二、Google Apps Script 專案建立](#二google-apps-script-專案建立)
3. [三、LINE Messaging API 設定](#三line-messaging-api-設定)
4. [四、Web App 部署](#四web-app-部署)
5. [五、Google Forms 設定（選用）](#五google-forms-設定選用)
6. [六、LINE 圖文選單設定](#六line-圖文選單設定)
7. [七、測試驗證](#七測試驗證)
8. [八、手鍊檔案與 QR 小卡作業](#八手鍊檔案與-qr-小卡作業)
9. [九、常見問題排解](#九常見問題排解)

---

## 一、Google Sheets 建立

### 步驟 1：建立新的 Google 試算表

1. 前往 [Google Sheets](https://sheets.google.com/)
2. 點選 **「+」空白試算表**
3. 將試算表名稱更改為：**水晶諮詢資料庫**

### 步驟 2：建立工作表分頁

1. 在底部的工作表分頁上 **雙擊**，將預設分頁名稱改為：**諮詢紀錄**

### 步驟 3：設定欄位標題

在第 1 列（Row 1）依序輸入以下欄位標題：

| 欄位 | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q |
|------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 標題 | 時間戳記 | 客人姓名 | 聯絡方式 | 性別 | 出生日期 | 出生時間 | 配戴習慣 | 淨手圍 | 偏好色系 | 期望目標 | 分析方法 | 目標脈輪 | 狀態描述 | 預算範圍 | AI初步推薦 | 處理狀態 | 備註紀錄 |

> 💡 **建議格式化**：選取第 1 列，設定粗體、背景色（例如淺紫色），並凍結第 1 列方便日後瀏覽。

### 步驟 4：取得 Spreadsheet ID

1. 查看瀏覽器網址列，URL 格式如下：
   ```
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```
2. 複製 `{SPREADSHEET_ID}` 部分（一串英數字元）
3. **妥善保存此 ID**，後續設定 Apps Script 時需要使用

**範例 URL：**
```
https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       這段就是 Spreadsheet ID
```

### 步驟 5：（選用）設定欄位格式

建議對特定欄位設定資料格式：

| 欄位       | 建議格式                              |
|-----------|--------------------------------------|
| A（時間戳記）| 日期時間格式：`yyyy/MM/dd HH:mm:ss`   |
| E（淨手圍） | 數字格式，小數點 1 位                   |
| P（處理狀態）| 建立下拉選單：待處理、處理中、已完成、已取消 |

### 步驟 6：（選用）建立手鍊檔案分頁

若要啟用「每條手鍊一個 QR profile」的小卡流程，請在同一份 Google Sheets 新增 **手鍊檔案** 分頁。此分頁只放公開 profile 所需的整理後內容，不要把客人聯絡方式、生日、地址、付款或出貨資料放進公開欄位。

完整欄位、QR 產生、印製與隱私規則請參考：[`bracelet-profile-qr-workflow.md`](bracelet-profile-qr-workflow.md)。

---

## 二、Google Apps Script 專案建立

### 步驟 1：開啟 Apps Script 編輯器

1. 在 Google Sheets **「水晶諮詢資料庫」** 中
2. 點選上方選單 **「擴充功能」** → **「Apps Script」**
3. 系統會開啟 Apps Script 編輯器，預設會有一個 `程式碼.gs`（或 `Code.gs`）檔案

### 步驟 2：建立檔案架構

需要建立以下 5 個檔案：

| 檔案名稱             | 用途                       |
|---------------------|---------------------------|
| `appsscript.json`   | 專案 manifest、時區、Web App 與授權範圍 |
| `Config.gs`         | 設定檔（API 金鑰、ID 等）    |
| `Recommendation.gs` | AI 水晶推薦邏輯              |
| `Notification.gs`   | LINE 通知功能               |
| `Code.gs`           | 主程式（Web App 入口點）     |

**建立檔案步驟：**

1. 在左側檔案列表中，點選 **「+」** 按鈕
2. 選擇 **「指令碼」**
3. 輸入檔案名稱（不需要輸入 `.gs` 副檔名）
4. 重複以上步驟，直到建立所有 5 個檔案

### 步驟 3：貼上程式碼

將每個檔案的程式碼貼入對應的 Apps Script 檔案中：

1. **appsscript.json**：貼上 manifest 設定
2. **Config.gs**：貼上設定檔程式碼
3. **Recommendation.gs**：貼上 AI 推薦邏輯程式碼
4. **Notification.gs**：貼上 LINE 通知程式碼
5. **Code.gs**：貼上主程式程式碼

### 步驟 4：更新 Config.gs 設定

開啟 `Config.gs`，更新以下設定值：

```javascript
// ===== 必要設定 =====

// Google Sheets 設定
const SPREADSHEET_ID = '你的_SPREADSHEET_ID';    // 步驟一取得的 ID
const SHEET_NAME = '諮詢紀錄';                    // 工作表名稱

// CSV 統一紀錄設定
const CSV_MIRROR_ENABLED = true;
const CSV_FILE_NAME = 'muphe_crystal_consultation_records.csv';
const CSV_FOLDER_ID = '';                         // 留空會放在 Google Drive 根目錄

// LINE Messaging API 設定（取代已停用的 LINE Notify）
const LINE_CHANNEL_ACCESS_TOKEN = '你的_CHANNEL_ACCESS_TOKEN';  // 步驟三取得
const LINE_TARGET_ID = '你的_USER_ID_或_GROUP_ID';               // 接收通知的對象

// ===== 選用設定 =====

// Gemini API 設定（如使用 AI 推薦功能）
const GEMINI_API_KEY = '你的_GEMINI_API_KEY';     // 從 Google AI Studio 取得
```

> ⚠️ **重要**：請務必將上方的佔位字串替換為您的實際值！
>
> 💡 CSV 會在每次表單送出後，自動把「諮詢紀錄」工作表完整同步到同一份 `muphe_crystal_consultation_records.csv`。如果想放在指定資料夾，請把 Google Drive 資料夾 ID 填入 `CSV_FOLDER_ID`。

### 步驟 5：儲存專案

1. 點選 **「Ctrl + S」**（或 **「Cmd + S」**）儲存所有檔案
2. 或點選工具列的 💾 儲存圖示

---

## 三、LINE Messaging API 設定

> ⚠️ **重要提醒**：LINE Notify 已於 **2025 年 3 月 31 日正式停止服務**。本系統使用 **LINE Messaging API 的 Push Message** 功能來發送通知，作為 LINE Notify 的替代方案。

### 步驟 1：登入 LINE Developers Console

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 使用您的 LINE 帳號登入
3. 如果是首次使用，需要同意開發者條款

### 步驟 2：建立 Provider（如尚未建立）

1. 在首頁點選 **「Create a new provider」**
2. 輸入 Provider 名稱（例如：`水晶能量工作室`）
3. 點選 **「Create」**

> 💡 Provider 是一個組織或個人的容器，可以包含多個 Channel。如果您已有 Provider，可跳過此步驟。

### 步驟 3：建立 Messaging API Channel

1. 在 Provider 頁面中，點選 **「Create a Messaging API channel」**
2. 填寫以下資訊：

| 欄位                    | 範例值                        |
|------------------------|------------------------------|
| Channel type           | Messaging API（自動選定）      |
| Provider               | 選擇您的 Provider             |
| Company or owner's…    | 依實際情況填寫                 |
| Channel icon           | 上傳水晶相關圖示               |
| Channel name           | 水晶能量諮詢                   |
| Channel description    | 水晶能量諮詢系統通知            |
| Category               | 選擇適合的分類                 |
| Subcategory            | 選擇適合的子分類               |
| Email address          | 您的聯絡電子郵件               |

3. 勾選同意條款
4. 點選 **「Create」**

### 步驟 4：發行 Channel Access Token（長效型）

1. 進入剛建立的 Channel 頁面
2. 點選 **「Messaging API」** 分頁
3. 捲動到頁面底部的 **「Channel access token (long-lived)」** 區塊
4. 點選 **「Issue」** 按鈕
5. **複製並妥善保存此 Token**

> ⚠️ **安全警告**：Channel Access Token 等同於您帳號的密碼，切勿公開分享或上傳至公開的程式碼儲存庫！

### 步驟 5：取得您的 User ID 或 Group ID

#### 方法 A：取得個人 User ID（推薦用於個人接收通知）

1. 在 LINE Developers Console 中，進入您的 Channel
2. 點選 **「Basic settings」** 分頁
3. 捲動到頁面底部的 **「Your user ID」** 區塊
4. 複製顯示的 User ID（格式為 `U` 開頭的 33 字元字串）

**User ID 格式範例：**
```
Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 方法 B：取得 Group ID（用於群組接收通知）

如果您希望將通知發送到 LINE 群組：

1. 先將機器人（Bot）加入目標群組
2. 在 Apps Script 中建立一個 Webhook 接收端點來擷取 Group ID：

```javascript
/**
 * 用於擷取 Group ID 的暫時 Webhook 處理函式
 * 取得 Group ID 後請移除此函式
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const events = data.events;
  
  events.forEach(function(event) {
    if (event.source.type === 'group') {
      // 將 Group ID 記錄在日誌中
      Logger.log('Group ID: ' + event.source.groupId);
      
      // 也可以寫入試算表方便查看
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      sheet.appendRow(['Group ID', event.source.groupId, new Date()]);
    }
  });
  
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok' })
  ).setMimeType(ContentService.MimeType.JSON);
}
```

3. 部署為 Web App（詳見步驟四）
4. 將 Web App URL 設定為 LINE Channel 的 Webhook URL：
   - 在 LINE Developers Console → Messaging API 分頁
   - **Webhook URL** 欄位貼上 Web App URL
   - 開啟 **「Use webhook」**
5. 在群組中發送任意訊息
6. 回到 Apps Script，查看執行記錄或試算表中的 Group ID
7. 複製 Group ID（格式為 `C` 開頭的 33 字元字串）

**Group ID 格式範例：**
```
Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 步驟 6：更新 Config.gs

將取得的 Channel Access Token 和目標 ID 填入 `Config.gs`：

```javascript
const LINE_CHANNEL_ACCESS_TOKEN = '你剛複製的_Channel_Access_Token';
const LINE_TARGET_ID = '你的_User_ID_或_Group_ID';
```

### 步驟 7：驗證 LINE Messaging API 設定

在 Apps Script 中執行以下測試函式，確認設定正確：

```javascript
/**
 * 測試 LINE Messaging API 是否正常運作
 */
function testLineMessage() {
  const url = 'https://api.line.me/v2/bot/message/push';
  
  const payload = {
    to: LINE_TARGET_ID,
    messages: [
      {
        type: 'text',
        text: '✅ LINE Messaging API 設定成功！\n水晶能量諮詢系統通知功能已就緒。'
      }
    ]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  Logger.log('Status: ' + response.getResponseCode());
  Logger.log('Response: ' + response.getContentText());
}
```

執行後，您的 LINE 應該會收到測試訊息。

---

## 四、Web App 部署

### 步驟 1：開啟部署設定

1. 在 Apps Script 編輯器中
2. 點選右上角的 **「部署」** → **「新增部署作業」**

### 步驟 2：設定部署類型

1. 點選 **「類型」** 旁的齒輪圖示 ⚙️
2. 選擇 **「網頁應用程式」**

### 步驟 3：填寫部署設定

| 欄位                | 設定值                    |
|---------------------|--------------------------|
| 說明                 | 水晶能量諮詢系統 v1.0      |
| 執行身分             | **我自己**（Me）           |
| 誰可以存取           | **所有人**（Anyone）       |

> 💡 **「執行身分」設為「我自己」**：表示 Web App 會以您的 Google 帳號權限執行，可以存取您的試算表和其他 Google 服務。
>
> 💡 **「誰可以存取」設為「所有人」**：表示任何人都可以透過 URL 存取此 Web App，不需要 Google 帳號登入。這是必要的，因為使用者需要透過 LINE 或網頁表單提交資料。

### 步驟 4：完成部署

1. 點選 **「部署」**
2. 系統可能會要求授權，請依指示完成授權
3. 部署完成後，會顯示 **Web App URL**
4. **複製此 URL**

**Web App URL 格式範例：**
```
https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
```

> ⚠️ **務必複製此 URL！** 後續設定 HTML 表單和 LINE 圖文選單時都需要使用。

### 步驟 5：更新 HTML 表單的 POST URL

如果您使用 GitHub Pages 上的 `crystal-survey/frontend/crystal-form.html`，請將檔案中的 Apps Script 提交網址改成部署完成後取得的 Web App URL：

```javascript
const SUBMIT_URL = 'https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec';
```

> ⚠️ 若仍保留 `GOOGLE_APPS_SCRIPT_WEB_APP_URL` 佔位字串，正式網頁會顯示「表單收件網址尚未設定」，避免使用者誤以為資料已送出。

### 更新部署（日後修改程式碼時）

當您修改了 Apps Script 程式碼後，需要重新部署：

1. 點選 **「部署」** → **「管理部署作業」**
2. 點選右上角的 ✏️ 編輯圖示
3. 在 **「版本」** 欄位選擇 **「新版本」**
4. 點選 **「部署」**

> ⚠️ **重要**：如果只選擇現有版本而不建立新版本，修改將不會生效！每次修改程式碼後，必須建立「新版本」才能更新已部署的 Web App。

---

## 五、Google Forms 設定（選用）

除了自訂的 HTML 表單之外，您也可以使用 Google Forms 作為替代或補充的資料收集方式。

### 詳細設定步驟

請參考獨立的設定指南：

📄 **[Google Forms 諮詢表單設定指南](google-form/form-setup.md)**

### 快速摘要

1. **建立 Google Form**：建立含 8 個欄位的諮詢表單
2. **連結 Google Sheets**：將表單回應連結至「水晶諮詢資料庫」
3. **設定觸發器**：建立 `onFormSubmit` 觸發器，自動處理新的表單回應
4. **取得表單連結**：複製表單的分享連結，可用於 LINE 圖文選單

### onFormSubmit 觸發器設定重點

| 項目               | 設定值              |
|--------------------|---------------------|
| 執行函式            | `onFormSubmit`       |
| 部署作業            | `Head`               |
| 活動來源            | 從試算表             |
| 活動類型            | 提交表單時            |

---

## 六、LINE 圖文選單設定

### 詳細設定步驟

請參考獨立的設定指南：

📄 **[LINE 圖文選單設定指南](line-config/rich-menu-setup.md)**

### 快速摘要

1. **設計圖片**：製作 2500×1686 的 6 格圖文選單圖片
2. **建立選單**：透過 LINE Official Account Manager 或 API 建立
3. **設定動作**：6 個區域分別對應不同功能
4. **更新 URL**：將「填寫諮詢單」的連結設為 Web App URL

### 更新 Rich Menu JSON

開啟 `line-config/rich-menu.json`，將第一個區域的 URI 替換為您的 Web App URL：

```json
{
  "action": {
    "type": "uri",
    "label": "📝 填寫諮詢單",
    "uri": "https://script.google.com/macros/s/AKfycbx.../exec"
  }
}
```

> ⚠️ 將 `GOOGLE_APPS_SCRIPT_WEB_APP_URL` 替換為步驟四取得的實際 Web App URL。

---

## 七、測試驗證

完成所有設定後，請依照以下清單逐一測試：

### 測試 1：HTML 表單提交

1. 開啟 HTML 諮詢表單（或 Web App URL）
2. 填寫所有欄位並提交
3. 確認：
   - [ ] 表單提交成功，顯示感謝頁面
   - [ ] 無 CORS 或重導向錯誤

### 測試 2：Google Sheets 資料驗證

1. 開啟 **「水晶諮詢資料庫」** Google Sheets
2. 切換至 **「諮詢紀錄」** 工作表
3. 確認：
	   - [ ] 新資料已出現在最後一列
	   - [ ] 時間戳記正確
	   - [ ] 各欄位資料與表單填寫內容一致
	   - [ ] 處理狀態預設為「未處理」

### 測試 3：CSV 統一紀錄驗證

1. 開啟 Google Drive，找到 `muphe_crystal_consultation_records.csv`
2. 確認：
   - [ ] CSV 檔案已建立
   - [ ] 最新提交資料已出現在 CSV 最後一列
   - [ ] CSV 欄位順序與 Google Sheets 標題列一致
   - [ ] 若設定 `CSV_FOLDER_ID`，CSV 檔案位於指定資料夾

### 測試 4：AI 推薦自動填入

1. 查看剛提交的資料列
2. 確認：
	   - [ ] O 欄（AI初步推薦）已自動填入推薦內容
	   - [ ] 推薦內容合理且與填寫的偏好相符
	   - [ ] 如使用 Gemini API，確認未超出 API 配額

### 測試 5：LINE 通知接收

1. 開啟 LINE 應用程式
2. 確認：
	   - [ ] 收到來自 Bot 的通知訊息
	   - [ ] 通知包含客人姓名和諮詢摘要
	   - [ ] 通知格式正確、可讀

### 測試 6：Google Form 提交（如使用）

1. 開啟 Google Form 預覽或連結
2. 填寫測試資料並提交
3. 確認：
	   - [ ] Google Sheets 中出現新資料
	   - [ ] CSV 統一紀錄檔同步更新
	   - [ ] `onFormSubmit` 觸發器正常執行
	   - [ ] AI 推薦和 LINE 通知功能正常

### 測試 7：LINE 圖文選單功能

1. 在 LINE 中開啟官方帳號的聊天室
2. 確認：
   - [ ] 圖文選單自動顯示
   - [ ] 「填寫諮詢單」按鈕可開啟表單頁面
   - [ ] 其他按鈕可正確發送對應文字訊息

---

## 💡 本地模擬測試與調試

本系統內建了極為強大的**本地全流程測試與調試機制**。當您在本地運行系統時，前端表單會自動識別並將數據提交給本地的 Mock 伺服器，讓您免於頻繁部署 Apps Script，就能 100% 調試前端表單、AI 水晶分析推薦及 LINE 模擬通知。

### 步驟 1：啟動本地伺服器
1. 打開終端機（Terminal）並切換至項目根目錄。
2. 執行啟動腳本：
   ```bash
   ./start-assistant.command
   ```
   *該腳本將自動啟動本地 Node.js 伺服器（監聽 `127.0.0.1:8010`），並同步啟動 Ollama 服務。*

### 步驟 2：訪問並填寫本地諮詢表單
1. 在瀏覽器中打開：`http://127.0.0.1:8010/crystal-system/frontend/crystal-form.html`。
2. 填寫諮詢資料（包含姓名、手圍、偏好色系與目標描述等），並點選 **「送出諮詢表單」**。

### 步驟 3：觀察本地測試結果
- **前端實時 AI 推薦**：提交成功後，頁面將噴灑五彩紙花慶祝，並在底部即時展開 **「您的專屬水晶能量初步評估」** 玻璃擬態卡片，直接顯示 AI 生成的水晶報告！
- **本地數據庫記錄**：諮詢資料與 AI 推薦將自動以 JSON 格式保存至根目錄下的 `tmp/crystal_submissions.json` 檔案中，供您隨時查看。
- **本地 Ollama AI 運作**：若本地啟動了 Ollama（預設使用 `qwen2.5:1.5b`），本地伺服器將使用該大語言模型進行水晶分析；若 Ollama 未就緒，則自動降級（Fallback）使用與雲端一致的關鍵字規則匹配引擎。
- **模擬 LINE 推播通知**：本地伺服器將格式化後的 LINE 訊息即時列印在終端機（Cwd Terminal）及日誌 `/tmp/interview-server.log` 中。您無需配置 LINE 認證，即可調試通知的排版美觀度。

---

## 八、手鍊檔案與 QR 小卡作業

手鍊檔案流程用於出貨或交付前，將每條手鍊整理成一個可由 QR 小卡開啟的公開 profile。公開 profile 只顯示晶種、手鍊名稱、情境、配戴提醒、淨化保養與一般儀式文字；客人姓名、聯絡方式、生日、地址、預算、付款、出貨、內部備註都不得出現在 QR URL 或公開頁。

詳細操作文件：[`bracelet-profile-qr-workflow.md`](bracelet-profile-qr-workflow.md)

### 快速摘要

1. 在 Google Sheets 新增 **手鍊檔案** 分頁，欄位依程式的 `BRACELET_PROFILE_HEADER_ROW` 建立，包含 `建立時間`、`查詢碼`、`查詢Token`、`是否公開`、`手鍊名稱`、`場景`、`水晶配置`、`配戴指南`、`保養說明`、`日常儀式`、`店主小語` 等。
2. QR 公開頁 URL 應使用不含個資的 token，例如 `https://studjodev.github.io/muphe_handmade/bracelet.html?token={查詢Token}`。不可使用 row number、電話、Email、姓名、訂單編號作為公開識別碼。
3. 只有 `是否公開 = 公開` 或 `已公開` 且顧客同意的資料列可以產生 QR 小卡。
4. QR code 內容只放公開頁 URL，代碼則印在小卡上作為手動輸入備援。產生 QR 後先在手機相機與 LINE 掃描器測試。
5. 小卡建議使用名片尺寸或印刷廠模板，QR 實際寬度至少 22mm，並保留完整 quiet zone。
6. 印製樣張後，掃描第一張、最後一張、隨機一張；入包裝前再掃一次，確認手鍊名稱與實體手鍊一致。
7. 顧客撤回或要求刪除時，將 `是否公開` 改為空白或停用，並移除公開內容。

---

## 九、常見問題排解

### 問題 1：CORS 錯誤

**現象**：在瀏覽器控制台看到 CORS（跨來源資源共享）錯誤。

**原因**：前端直接向 Apps Script Web App 發送 AJAX 請求時，可能遇到 CORS 限制。

> 手鍊檔案查詢頁已內建 JSONP fallback，對應 Apps Script 的 `?action=braceletProfile&callback=...` 回應。若只是在 `bracelet.html` 查詢手鍊檔案，不需要額外設定 CORS header。

**解決方案**：

1. **方法 A：使用表單重導向（推薦）**
   ```html
   <!-- 直接用 form action 提交，不使用 AJAX -->
   <form action="WEB_APP_URL" method="POST" target="_blank">
     <!-- 欄位 -->
   </form>
   ```

2. **方法 B：在 Apps Script 中處理 CORS**
   ```javascript
   function doPost(e) {
     // 處理邏輯...
     
     // 回傳 JSON 並設定 CORS 標頭
     return ContentService
       .createTextOutput(JSON.stringify({ status: 'success' }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

3. **方法 C：使用 `mode: 'no-cors'`（注意限制）**
   ```javascript
   fetch(WEB_APP_URL, {
     method: 'POST',
     mode: 'no-cors',  // 注意：無法讀取回應內容
     body: formData
   });
   ```

> 💡 **建議**：Google Apps Script Web App 的 302 重導向行為是 CORS 問題的主因。使用 `mode: 'no-cors'` 或表單直接提交可以避開此問題。

---

### 問題 2：302 重導向處理

**現象**：使用 `fetch()` 發送請求時，收到 302 重導向而非預期的回應。

**原因**：Google Apps Script 的 Web App URL 會先進行 302 重導向到實際的執行 URL。

**解決方案**：

```javascript
// 方法 1：使用 redirect: 'follow'（預設行為）
fetch(WEB_APP_URL, {
  method: 'POST',
  redirect: 'follow',  // 自動跟隨重導向
  body: formData
});

// 方法 2：使用 no-cors 模式（推薦）
fetch(WEB_APP_URL, {
  method: 'POST',
  mode: 'no-cors',
  body: formData
}).then(() => {
  // 提交成功（但無法讀取回應）
  alert('提交成功！');
});
```

---

### 問題 3：LINE Messaging API 錯誤代碼

常見的 LINE API 錯誤代碼及解決方式：

| HTTP 狀態碼 | 錯誤說明                  | 解決方式                                      |
|------------|--------------------------|----------------------------------------------|
| 400        | Bad Request              | 檢查 JSON 格式是否正確，必填欄位是否齊全           |
| 401        | Unauthorized             | Channel Access Token 無效或過期，請重新發行       |
| 403        | Forbidden                | 帳號可能被封鎖，或機器人未被加入群組                |
| 429        | Too Many Requests        | 超過 API 呼叫頻率限制，請稍後再試                 |
| 500        | Internal Server Error    | LINE 伺服器錯誤，請稍後再試                      |

**Push Message API 特定錯誤：**

| 錯誤訊息                           | 說明                        | 解決方式                      |
|-----------------------------------|-----------------------------|------------------------------|
| `Invalid reply token`             | 回覆 Token 無效              | Push Message 不需要 reply token |
| `The request body has X error(s)` | 請求內容格式錯誤              | 檢查 messages 陣列格式         |
| `The property, 'to', is invalid`  | 目標 ID 無效                 | 確認 User ID 或 Group ID 正確  |

**在 Apps Script 中檢查錯誤：**

```javascript
function sendLineMessage(message) {
  const url = 'https://api.line.me/v2/bot/message/push';
  
  const payload = {
    to: LINE_TARGET_ID,
    messages: [{ type: 'text', text: message }]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true  // 重要：不要拋出例外，讓我們自行處理
  };
  
  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  
  if (statusCode !== 200) {
    Logger.log('LINE API 錯誤！');
    Logger.log('狀態碼：' + statusCode);
    Logger.log('回應內容：' + response.getContentText());
    return false;
  }
  
  Logger.log('LINE 訊息發送成功！');
  return true;
}
```

---

### 問題 4：Google Apps Script 權限問題

**現象**：執行腳本時出現「Authorization required」或「You do not have permission」錯誤。

**解決方案**：

1. **首次授權**：
   - 在 Apps Script 編輯器中直接執行任一函式
   - 系統會彈出授權對話框
   - 依序點選：**「審查權限」** → **選擇帳號** → **「進階」** → **「前往（不安全）」** → **「允許」**

2. **重新授權**（當程式碼新增了新的 Google 服務存取時）：
   - 點選 **「部署」** → **「管理部署作業」**
   - 編輯現有部署，建立 **「新版本」**
   - 重新部署會觸發新的授權流程

3. **常見需要的權限範圍**：

| 權限                                    | 用途                    |
|-----------------------------------------|------------------------|
| `https://www.googleapis.com/auth/spreadsheets` | 讀寫 Google Sheets     |
| `https://www.googleapis.com/auth/drive` | 建立與更新 CSV 紀錄檔 |
| `https://www.googleapis.com/auth/script.external_request` | 呼叫外部 API（LINE 等）|
| `https://www.googleapis.com/auth/forms`  | 存取 Google Forms      |

---

### 問題 5：Web App 更新後未生效

**現象**：修改了程式碼但 Web App 行為沒有改變。

**原因**：沒有建立新版本就重新部署。

**解決方案**：

1. **「部署」** → **「管理部署作業」**
2. 點選 ✏️ 編輯圖示
3. **「版本」** 欄位務必選擇 **「新版本」**
4. 點選 **「部署」**
5. Web App URL 保持不變，但內容已更新

> ⚠️ 僅修改程式碼並儲存是 **不夠的**，必須建立新版本部署才會生效。

---

### 問題 6：Gemini API 相關問題

| 問題                    | 可能原因                     | 解決方式                           |
|------------------------|-----------------------------|------------------------------------|
| API 回應為空             | API Key 無效                 | 重新從 Google AI Studio 取得 Key    |
| 超過速率限制              | 短時間內太多請求              | 加入延遲或使用佇列機制               |
| 回應內容不理想            | Prompt 不夠精確              | 調整 Recommendation.gs 中的提示詞    |
| `UrlFetchApp` 逾時      | API 回應時間過長              | 增加 `timeout` 設定或簡化 prompt    |

---

### 問題 7：時區問題

**現象**：時間戳記顯示的時間與實際時間不同。

**解決方案**：

1. 在 Apps Script 中設定時區：
   - 點選左側 ⚙️ **「專案設定」**
   - 找到 **「時區」** 設定
   - 選擇 **「(GMT+08:00) 台北」**（Asia/Taipei）

2. 在程式碼中格式化時間：
   ```javascript
   const timestamp = Utilities.formatDate(
     new Date(),
     'Asia/Taipei',
     'yyyy/MM/dd HH:mm:ss'
   );
   ```

---

## 部署檢查清單

完成部署後，請確認以下項目全部打勾：

### Google 相關
- [ ] Google Sheets「水晶諮詢資料庫」已建立
- [ ] 「諮詢紀錄」工作表已建立，含 17 個欄位標題
- [ ] 如啟用手鍊 profile，「手鍊檔案」工作表已建立，含程式定義的 A 到 V 欄位
- [ ] Spreadsheet ID 已複製並填入 Config.gs
- [ ] Apps Script 5 個檔案已建立並貼上程式碼
- [ ] Config.gs 中的設定值已更新
- [ ] Web App 已部署，URL 已複製
- [ ] CSV 檔案已建立並可在 Google Drive 中找到

### LINE 相關
- [ ] LINE Developers Console 已建立 Messaging API Channel
- [ ] Channel Access Token 已發行並填入 Config.gs
- [ ] User ID 或 Group ID 已取得並填入 Config.gs
- [ ] 測試 LINE 訊息可正常接收
- [ ] 圖文選單已建立並設為預設
- [ ] 圖文選單的「填寫諮詢單」URL 已更新

### Google Forms（選用）
- [ ] Google Form 已建立，含 8 個欄位
- [ ] 表單已連結至 Google Sheets
- [ ] onFormSubmit 觸發器已設定
- [ ] 測試表單提交可正常運作

### 功能驗證
- [ ] 表單提交 → Sheets 寫入正常
- [ ] 表單提交 → CSV 統一紀錄同步正常
- [ ] AI 推薦自動生成正常
- [ ] LINE 通知接收正常
- [ ] 圖文選單各按鈕功能正常
- [ ] 手鍊 profile URL 只顯示公開內容，不含客資、地址、付款、出貨或內部備註
- [ ] QR code 只包含公開 profile URL，手機相機與 LINE 掃描器都能開啟
- [ ] 小卡樣張已掃碼驗證，入包裝前已再次確認對應正確手鍊
- [ ] 顧客撤回或刪除請求可透過清空或停用 `是否公開` 停用公開頁

---

> 📌 **部署完成後**，建議定期檢查 Apps Script 的 **「執行項目」** 頁面，監控是否有執行錯誤。路徑：Apps Script 編輯器 → 左側 **「執行項目」** 圖示。

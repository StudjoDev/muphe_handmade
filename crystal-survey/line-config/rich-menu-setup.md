# LINE 圖文選單（Rich Menu）設定指南

> 本指南說明如何為「水晶能量諮詢系統」建立 LINE 官方帳號的圖文選單，包含 GUI 操作與 API 兩種方式。

---

## 目錄

1. [LINE Official Account Manager 操作步驟](#一line-official-account-manager-操作步驟)
2. [圖文選單圖片設計規範](#二圖文選單圖片設計規範)
3. [API 方式建立圖文選單](#三api-方式建立圖文選單)
4. [圖片設計建議](#四圖片設計建議)
5. [注意事項](#五注意事項)

---

## 一、LINE Official Account Manager 操作步驟

透過 LINE 官方帳號管理後台（GUI 方式）建立圖文選單：

### 步驟 1：登入管理後台

1. 前往 [LINE Official Account Manager](https://manager.line.biz/)
2. 使用您的 LINE 帳號登入
3. 選擇您要設定的官方帳號

### 步驟 2：進入圖文選單設定

1. 在左側選單中，點選 **「聊天室相關」**
2. 點選 **「圖文選單」**
3. 點選右上角 **「建立」** 按鈕

### 步驟 3：基本設定

| 欄位       | 設定值                          |
|------------|--------------------------------|
| 標題       | 水晶能量選單（管理用，使用者不會看到） |
| 使用期間   | 設定起始日期與結束日期（建議設長期）   |
| 選單列文字 | ✨ 水晶能量選單                   |
| 預設顯示   | 開啟（使用者進入聊天室時自動顯示）    |

### 步驟 4：選擇版型

1. 點選 **「選擇版型」**
2. 選擇 **大型（2 列 × 3 欄 = 6 格）** 的版型
3. 確認選擇

### 步驟 5：設定各區域動作

依照以下表格設定每個區域：

| 區域位置 | 圖示 + 文字        | 動作類型    | 動作內容                          |
|----------|-------------------|------------|-----------------------------------|
| 左上     | 📝 填寫諮詢單      | **連結**    | 貼上 Google Apps Script Web App URL |
| 中上     | 💎 水晶介紹        | **文字**    | `水晶介紹`                         |
| 右上     | 📞 聯繫客服        | **文字**    | `聯繫客服`                         |
| 左下     | 🎉 最新活動        | **文字**    | `最新活動`                         |
| 中下     | 📖 品牌故事        | **文字**    | `品牌故事`                         |
| 右下     | ❓ 常見問題        | **文字**    | `常見問題`                         |

### 步驟 6：上傳背景圖片

1. 點選 **「上傳背景圖片」**
2. 選擇已設計好的圖文選單圖片（規範詳見下一節）
3. 預覽確認無誤

### 步驟 7：儲存並發佈

1. 點選右上角 **「儲存」**
2. 確認圖文選單已啟用

---

## 二、圖文選單圖片設計規範

### 尺寸要求

| 項目        | 規格                    |
|-------------|------------------------|
| 建議尺寸     | **2500 × 1686 像素**    |
| 檔案格式     | JPEG 或 PNG             |
| 檔案大小上限 | **1 MB**                |
| 色彩模式     | RGB                     |

### 可用尺寸選項

LINE 圖文選單支援以下尺寸（寬 × 高）：

| 尺寸            | 類型     | 說明                |
|----------------|----------|---------------------|
| 2500 × 1686    | 全尺寸   | 2 列版型（本系統使用）|
| 2500 × 843     | 半尺寸   | 1 列版型             |
| 1200 × 810     | 精簡全尺寸| 2 列版型（較小）      |
| 1200 × 405     | 精簡半尺寸| 1 列版型（較小）      |

> ⚠️ **重要**：請務必使用上述指定尺寸，否則上傳時會出錯。

### 圖片切割參考（2500 × 1686，6 格佈局）

```
┌──────────────┬──────────────┬──────────────┐
│              │              │              │
│   左上格      │   中上格      │   右上格      │
│  (833×843)   │  (834×843)   │  (833×843)   │
│              │              │              │
├──────────────┼──────────────┼──────────────┤
│              │              │              │
│   左下格      │   中下格      │   右下格      │
│  (833×843)   │  (834×843)   │  (833×843)   │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

> 💡 中間欄寬度為 834px（因為 2500 ÷ 3 ≈ 833.33，中欄多 1px 補齊）。

---

## 三、API 方式建立圖文選單

如果您希望透過 API 方式建立圖文選單，請依照以下步驟操作。

### 前置準備

- 確認已取得 **Channel Access Token**（長效型）
- 準備好圖文選單圖片檔案（符合設計規範）
- 準備好 `rich-menu.json` 設定檔

### 步驟 1：建立圖文選單物件

使用 `POST` 請求建立圖文選單：

```bash
curl -X POST https://api.line.me/v2/bot/richmenu \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {CHANNEL_ACCESS_TOKEN}' \
  -d '{
    "size": {
      "width": 2500,
      "height": 1686
    },
    "selected": true,
    "name": "Crystal Energy Consultation Menu",
    "chatBarText": "✨ 水晶能量選單",
    "areas": [
      {
        "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
        "action": {
          "type": "uri",
          "label": "📝 填寫諮詢單",
          "uri": "GOOGLE_APPS_SCRIPT_WEB_APP_URL"
        }
      },
      {
        "bounds": { "x": 833, "y": 0, "width": 834, "height": 843 },
        "action": {
          "type": "message",
          "label": "💎 水晶介紹",
          "text": "水晶介紹"
        }
      },
      {
        "bounds": { "x": 1667, "y": 0, "width": 833, "height": 843 },
        "action": {
          "type": "message",
          "label": "📞 聯繫客服",
          "text": "聯繫客服"
        }
      },
      {
        "bounds": { "x": 0, "y": 843, "width": 833, "height": 843 },
        "action": {
          "type": "message",
          "label": "🎉 最新活動",
          "text": "最新活動"
        }
      },
      {
        "bounds": { "x": 833, "y": 843, "width": 834, "height": 843 },
        "action": {
          "type": "message",
          "label": "📖 品牌故事",
          "text": "品牌故事"
        }
      },
      {
        "bounds": { "x": 1667, "y": 843, "width": 833, "height": 843 },
        "action": {
          "type": "message",
          "label": "❓ 常見問題",
          "text": "常見問題"
        }
      }
    ]
  }'
```

**成功回應範例：**

```json
{
  "richMenuId": "richmenu-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

> 📌 請記下回傳的 `richMenuId`，後續步驟會用到。

### 步驟 2：上傳圖文選單圖片

將設計好的圖片上傳至剛建立的圖文選單：

```bash
curl -X POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content \
  -H 'Authorization: Bearer {CHANNEL_ACCESS_TOKEN}' \
  -H 'Content-Type: image/png' \
  --data-binary @rich-menu-image.png
```

> ⚠️ 請將 `{richMenuId}` 替換為步驟 1 取得的 ID，`rich-menu-image.png` 替換為您的圖片檔名。

**支援的 Content-Type：**
- `image/jpeg`
- `image/png`

### 步驟 3：設定為預設圖文選單

將此圖文選單設定為所有使用者的預設選單：

```bash
curl -X POST https://api.line.me/v2/bot/user/all/richmenu/{richMenuId} \
  -H 'Authorization: Bearer {CHANNEL_ACCESS_TOKEN}'
```

**成功回應：** HTTP 200 OK（空回應）

### 驗證圖文選單

確認圖文選單已正確建立：

```bash
# 取得所有圖文選單列表
curl -X GET https://api.line.me/v2/bot/richmenu/list \
  -H 'Authorization: Bearer {CHANNEL_ACCESS_TOKEN}'

# 取得預設圖文選單
curl -X GET https://api.line.me/v2/bot/user/all/richmenu \
  -H 'Authorization: Bearer {CHANNEL_ACCESS_TOKEN}'
```

### 刪除圖文選單（如需重建）

```bash
# 先取消預設設定
curl -X DELETE https://api.line.me/v2/bot/user/all/richmenu \
  -H 'Authorization: Bearer {CHANNEL_ACCESS_TOKEN}'

# 刪除圖文選單
curl -X DELETE https://api.line.me/v2/bot/richmenu/{richMenuId} \
  -H 'Authorization: Bearer {CHANNEL_ACCESS_TOKEN}'
```

---

## 四、圖片設計建議

### 6 格佈局設計參考

建議每格包含以下元素：

| 格位   | 圖示   | 文字         | 建議配色       | 設計說明                     |
|--------|--------|-------------|---------------|------------------------------|
| 左上   | 📝     | 填寫諮詢單   | 淺紫色/薰衣草  | 主要 CTA，建議使用最醒目的設計  |
| 中上   | 💎     | 水晶介紹     | 水晶藍/透明感  | 展示水晶的光澤質感             |
| 右上   | 📞     | 聯繫客服     | 柔和綠色       | 使用溫暖友善的設計風格          |
| 左下   | 🎉     | 最新活動     | 金色/橙色      | 活潑熱鬧的風格                 |
| 中下   | 📖     | 品牌故事     | 深紫色/神秘感  | 優雅沉穩的設計                 |
| 右下   | ❓     | 常見問題     | 灰藍色         | 簡潔清晰的設計                 |

### 設計原則

1. **整體風格統一**：建議採用水晶/礦石的視覺元素，搭配神秘感的紫色漸層
2. **文字清晰可讀**：每格文字建議使用白色或亮色，搭配半透明深色底板增加辨識度
3. **圖示醒目**：使用簡潔的圖示，避免過於複雜的圖案
4. **重點突出**：「填寫諮詢單」為最重要的按鈕，建議用最顯眼的顏色或設計
5. **邊線分隔**：各格之間建議使用細線或漸層過渡，增加視覺層次

### 設計工具推薦

| 工具名稱    | 費用  | 適用場景               |
|------------|-------|----------------------|
| Canva      | 免費版 | 快速設計，有豐富模板     |
| Figma      | 免費版 | 精細設計，適合設計師     |
| Adobe XD   | 付費  | 專業 UI 設計           |
| PowerPoint | 已有  | 簡單快速的替代方案       |

---

## 五、注意事項

### API 建立 vs. 管理後台建立

> ⚠️ **重要差異**：透過 API 建立的圖文選單，**無法**在 LINE Official Account Manager（管理後台）中編輯或查看。反之亦然。兩種方式建立的圖文選單是完全獨立的。

| 項目              | 管理後台建立       | API 建立              |
|-------------------|------------------|-----------------------|
| 編輯方式           | GUI 介面編輯      | 需透過 API 修改        |
| 可視性             | 後台可見          | 後台不可見             |
| 彈性              | 有版型限制         | 完全自訂座標           |
| 適用場景           | 快速設定          | 程式化管理、進階需求    |
| 個人化選單         | 不支援            | 支援（可針對不同使用者） |

### 其他注意事項

1. **圖文選單優先權**：如果同時存在 API 建立和管理後台建立的圖文選單，API 建立的會覆蓋管理後台的設定

2. **Channel Access Token 安全性**：
   - 切勿將 Token 直接寫在前端程式碼中
   - 建議使用環境變數管理 Token
   - 如 Token 洩漏，請立即重新發行

3. **圖片快取**：LINE 會快取圖文選單圖片，如果更新圖片後使用者端未更新，可能需要等待一段時間或重新追蹤帳號

4. **測試建議**：
   - 建議先在測試帳號上建立圖文選單
   - 確認所有連結和動作都正常運作
   - 在不同裝置（iOS / Android）上測試顯示效果

5. **URI 動作注意**：
   - `uri` 類型的動作網址必須使用 `https://` 開頭
   - Google Apps Script Web App URL 預設就是 HTTPS，可直接使用

---

## 附錄：快速指令參考

```bash
# === 完整流程一鍵指令 ===

# 變數設定（請替換為您的值）
TOKEN="你的_CHANNEL_ACCESS_TOKEN"
WEBAPP_URL="你的_GOOGLE_APPS_SCRIPT_WEB_APP_URL"

# 1. 建立圖文選單（請先將 rich-menu.json 中的 URL 替換好）
RICH_MENU_ID=$(curl -s -X POST https://api.line.me/v2/bot/richmenu \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d @rich-menu.json | python3 -c "import sys,json; print(json.load(sys.stdin)['richMenuId'])")

echo "Rich Menu ID: ${RICH_MENU_ID}"

# 2. 上傳圖片
curl -X POST "https://api-data.line.me/v2/bot/richmenu/${RICH_MENU_ID}/content" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: image/png' \
  --data-binary @rich-menu-image.png

# 3. 設定為預設
curl -X POST "https://api.line.me/v2/bot/user/all/richmenu/${RICH_MENU_ID}" \
  -H "Authorization: Bearer ${TOKEN}"

echo "✅ 圖文選單設定完成！"
```

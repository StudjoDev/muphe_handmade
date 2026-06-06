/**
 * ============================================================
 *  水晶能量專屬諮詢系統 — 主程式入口
 *  Crystal Energy Consultation System — Main Application
 * ============================================================
 *  說明：
 *  此為系統核心程式，負責處理所有資料入口（HTML5 表單 POST、
 *  Google Forms 觸發器），並串連推薦引擎與通知模組。
 * 
 *  架構：
 *  HTML5 表單 → doPost() → processSubmission() → writeToSheet()
 *                                                → generateRecommendation()
 *                                                → sendConsultationNotification()
 * 
 *  Google Form → onFormSubmit() → processSubmission() → (同上)
 * ============================================================
 */

// ============================
// 🌐 Web App 入口點
// ============================

/**
 * HTTP GET 請求處理
 * 當使用者透過瀏覽器訪問 Web App URL 時，返回 HTML 表單頁面
 * @param {Object} e - HTTP GET 事件物件
 * @returns {HtmlOutput} HTML 表單頁面
 */
function doGet(e) {
  try {
    // 嘗試載入外部 HTML 模板
    const htmlOutput = HtmlService.createHtmlOutputFromFile('crystal-form')
      .setTitle('✨ 水晶能量專屬諮詢')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
    
    return htmlOutput;

  } catch (error) {
    console.error('【doGet 錯誤】' + error.toString());
    // 若 HTML 模板不存在，返回簡易錯誤頁面
    return HtmlService.createHtmlOutput(
      '<h1>系統維護中</h1><p>請稍後再試，或聯繫客服。</p>'
    );
  }
}

/**
 * HTTP POST 請求處理
 * 接收 HTML5 表單或外部 Webhook 的 POST 資料
 * @param {Object} e - HTTP POST 事件物件
 * @returns {TextOutput} JSON 格式的回應
 */
function doPost(e) {
  try {
    let formData = {};

    // 根據 Content-Type 解析資料
    if (e.postData && e.postData.type === 'application/json') {
      // JSON 格式（來自 HTML5 表單的 fetch POST）
      formData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      // URL-encoded 格式（來自傳統表單 POST）
      formData = e.parameter;
    } else {
      throw new Error('無法解析的請求格式');
    }

    // 統一處理提交資料
    const result = processSubmission(formData);

    // 回傳成功回應（JSON 格式）
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: '諮詢表單已成功送出！',
        data: {
          name: formData.name || '',
          recommendation: result.recommendation || ''
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('【doPost 錯誤】' + error.toString());

    // 回傳錯誤回應
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: '提交失敗，請稍後再試。',
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================
// 📋 Google Forms 觸發器
// ============================

/**
 * Google Forms 表單提交觸發器
 * 需在 Apps Script 中設定觸發器：
 *   觸發器 → 新增觸發器 → onFormSubmit → 來自試算表 → 提交表單時
 * 
 * @param {Object} e - Google Forms 提交事件物件
 */
function onFormSubmit(e) {
  try {
    // Google Forms 的事件物件結構
    const responses = e.namedValues || {};
    const range = e.range;

    // 將 Google Forms 的 namedValues 轉換為統一格式
    const formData = {
      name: getFirstValue(responses['客人姓名']),
      contact: getFirstValue(responses['聯絡方式']),
      gender: getFirstValue(responses['性別']),
      birthDate: getFirstValue(responses['出生日期']),
      birthTime: getFirstValue(responses['出生時間']),
      preference: getFirstValue(responses['配戴習慣']) || '手鏈/手環',
      wristSize: getFirstValue(responses['淨手圍']),
      colorPreference: getArrayValue(responses['偏好色系']),
      energyGoal: getArrayValue(responses['期望目標']),
      calculationMethod: getArrayValue(responses['分析方法']),
      targetChakra: getArrayValue(responses['目標脈輪']),
      description: getFirstValue(responses['狀態描述']),
      budget: getFirstValue(responses['預算範圍'])
    };

    // 取得此筆資料所在的列號
    const row = range ? range.getRow() : null;

    // 若是由 Google Form 觸發，資料已自動寫入前面的欄位
    // 我們只需要補填 AI推薦、處理狀態 等欄位
    if (row) {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      
      // 產生 AI 推薦
      const recommendation = generateRecommendation(formData);
      
      // 寫入 AI 推薦欄位
      sheet.getRange(row, COLUMNS.AI_RECOMMENDATION).setValue(recommendation);
      
      // 寫入預設處理狀態
      sheet.getRange(row, COLUMNS.STATUS).setValue(DEFAULT_STATUS);
      
      // 寫入空白備註
      sheet.getRange(row, COLUMNS.NOTES).setValue('');

      // 發送 LINE 通知
      sendConsultationNotification({
        name: formData.name,
        gender: formData.gender,
        energyGoal: formData.energyGoal,
        budget: formData.budget,
        recommendation: recommendation
      });

      console.log('【Google Form 觸發】✅ 已處理第 ' + row + ' 列資料');
    } else {
      // 若無法取得列號，使用完整寫入流程
      processSubmission(formData);
    }

  } catch (error) {
    console.error('【onFormSubmit 錯誤】' + error.toString());
    // 錯誤不中斷，確保 Google Form 的資料已寫入
  }
}

// ============================
// 🔧 核心處理邏輯
// ============================

/**
 * 統一處理表單提交
 * 此函數為所有資料入口的共用處理邏輯
 * @param {Object} data - 表單資料物件
 * @returns {Object} 處理結果
 */
function processSubmission(data) {
  try {
    // 步驟 1：取得試算表
    const sheet = getOrCreateSheet();

    // 步驟 2：準備資料列
    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm:ss'
    );

    // 步驟 3：產生 AI 推薦
    const recommendation = generateRecommendation(data);

    // 格式化可能為陣列的欄位為逗號分隔字串以寫入試算表
    const colorPreferenceStr = Array.isArray(data.colorPreference) ? data.colorPreference.join(', ') : (data.colorPreference || '');
    const energyGoalStr = Array.isArray(data.energyGoal) ? data.energyGoal.join(', ') : (data.energyGoal || '');
    const calculationMethodStr = Array.isArray(data.calculationMethod) ? data.calculationMethod.join(', ') : (data.calculationMethod || '');
    const targetChakraStr = Array.isArray(data.targetChakra) ? data.targetChakra.join(', ') : (data.targetChakra || '');

    // 步驟 4：組建 17 欄資料列
    const rowData = [
      timestamp,                              // 1. A 欄 — 時間戳記
      data.name || '',                        // 2. B 欄 — 客人姓名
      data.contact || '',                     // 3. C 欄 — 聯絡方式
      data.gender || '',                      // 4. D 欄 — 性別
      data.birthDate || '',                   // 5. E 欄 — 出生日期
      data.birthTime || '',                   // 6. F 欄 — 出生時間
      data.preference || '手鏈/手環',          // 7. G 欄 — 配戴習慣
      data.wristSize || '',                   // 8. H 欄 — 淨手圍
      colorPreferenceStr,                     // 9. I 欄 — 偏好色系
      energyGoalStr,                          // 10. J 欄 — 期望目標
      calculationMethodStr,                   // 11. K 欄 — 分析方法
      targetChakraStr,                        // 12. L 欄 — 目標脈輪
      data.description || '',                 // 13. M 欄 — 狀態描述
      data.budget || '',                      // 14. N 欄 — 預算範圍
      recommendation,                         // 15. O 欄 — AI初步推薦（自動）
      DEFAULT_STATUS,                         // 16. P 欄 — 處理狀態（預設「未處理」）
      ''                                      // 17. Q 欄 — 備註紀錄（空白）
    ];

    // 步驟 5：寫入試算表（先確保資料寫入成功）
    sheet.appendRow(rowData);
    console.log('【資料寫入】✅ 已寫入新資料：' + data.name);

    // 步驟 6：發送 LINE 通知（失敗不影響資料寫入）
    try {
      sendConsultationNotification({
        name: data.name,
        gender: data.gender,
        energyGoal: energyGoalStr,
        budget: data.budget,
        recommendation: recommendation
      });
    } catch (notifyError) {
      console.error('【通知發送失敗】' + notifyError.toString());
      // 通知失敗不影響主流程
    }

    return {
      success: true,
      recommendation: recommendation
    };

  } catch (error) {
    console.error('【processSubmission 錯誤】' + error.toString());
    throw error;
  }
}

// ============================
// 🛠️ 輔助函數
// ============================

/**
 * 取得或建立工作表
 * 若指定的工作表不存在，自動建立並寫入標題列
 * @returns {Sheet} Google Sheets 工作表物件
 */
function getOrCreateSheet() {
  try {
    let spreadsheet;

    // 嘗試透過 ID 開啟試算表
    if (SPREADSHEET_ID && SPREADSHEET_ID !== '在此貼上您的試算表ID') {
      spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    } else {
      // 若未設定 ID，使用目前綁定的試算表
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (!spreadsheet) {
      throw new Error('無法開啟試算表，請確認 SPREADSHEET_ID 設定正確');
    }

    // 取得指定工作表
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    // 若工作表不存在，自動建立
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // 寫入標題列
      sheet.getRange(1, 1, 1, HEADER_ROW.length).setValues([HEADER_ROW]);
      // 設定標題列格式（粗體、背景色）
      const headerRange = sheet.getRange(1, 1, 1, HEADER_ROW.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8D5F5');
      headerRange.setHorizontalAlignment('center');
      // 凍結標題列
      sheet.setFrozenRows(1);
      // 設定欄寬
      sheet.setColumnWidth(COLUMNS.TIMESTAMP, 150);
      sheet.setColumnWidth(COLUMNS.NAME, 100);
      sheet.setColumnWidth(COLUMNS.CONTACT, 120);
      sheet.setColumnWidth(COLUMNS.GENDER, 90);
      sheet.setColumnWidth(COLUMNS.BIRTH_DATE, 120);
      sheet.setColumnWidth(COLUMNS.BIRTH_TIME, 80);
      sheet.setColumnWidth(COLUMNS.PREFERENCE, 100);
      sheet.setColumnWidth(COLUMNS.WRIST_SIZE, 80);
      sheet.setColumnWidth(COLUMNS.COLOR_PREFERENCE, 150);
      sheet.setColumnWidth(COLUMNS.ENERGY_GOAL, 180);
      sheet.setColumnWidth(COLUMNS.CALCULATION_METHOD, 150);
      sheet.setColumnWidth(COLUMNS.TARGET_CHAKRA, 180);
      sheet.setColumnWidth(COLUMNS.DESCRIPTION, 250);
      sheet.setColumnWidth(COLUMNS.BUDGET, 120);
      sheet.setColumnWidth(COLUMNS.AI_RECOMMENDATION, 400);
      sheet.setColumnWidth(COLUMNS.STATUS, 100);
      sheet.setColumnWidth(COLUMNS.NOTES, 200);
      console.log('【工作表】✅ 已自動建立工作表：' + SHEET_NAME);
    }

    return sheet;

  } catch (error) {
    console.error('【getOrCreateSheet 錯誤】' + error.toString());
    throw error;
  }
}

/**
 * 從 Google Forms namedValues 取得第一個值
 * namedValues 的每個欄位都是陣列，取第一個元素
 * @param {Array|string} value - namedValues 中的值
 * @returns {string} 第一個值
 */
function getFirstValue(value) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

/**
 * 從 Google Forms namedValues 取得陣列值並合併
 * 用於多選欄位（如偏好色系、期望目標）
 * @param {Array|string} value - namedValues 中的值
 * @returns {string} 以「, 」合併的字串
 */
function getArrayValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value || '';
}

// ============================
// 🔄 手動操作函數
// ============================

/**
 * 手動初始化試算表
 * 用於首次部署時建立工作表與標題列
 */
function initializeSheet() {
  try {
    const sheet = getOrCreateSheet();
    console.log('✅ 試算表初始化完成！');
    console.log('  工作表名稱：' + sheet.getName());
    console.log('  欄位數量：' + HEADER_ROW.length);
    
    // 顯示試算表 URL
    const spreadsheet = sheet.getParent();
    console.log('  試算表網址：' + spreadsheet.getUrl());
  } catch (error) {
    console.error('❌ 初始化失敗：' + error.toString());
  }
}

/**
 * 手動重新處理所有未推薦的資料
 * 遍歷試算表中 AI 推薦欄位為空的列，重新產生推薦
 */
function reprocessAllRecommendations() {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      console.log('試算表中沒有資料需要處理');
      return;
    }

    let processedCount = 0;

    for (let row = 2; row <= lastRow; row++) {
      const aiRecommendation = sheet.getRange(row, COLUMNS.AI_RECOMMENDATION).getValue();
      
      // 若 AI 推薦欄位為空，重新產生
      if (!aiRecommendation || aiRecommendation.toString().trim() === '') {
        const rowData = {
          name: sheet.getRange(row, COLUMNS.NAME).getValue(),
          gender: sheet.getRange(row, COLUMNS.GENDER).getValue(),
          birthDate: sheet.getRange(row, COLUMNS.BIRTH_DATE).getValue(),
          birthTime: sheet.getRange(row, COLUMNS.BIRTH_TIME).getValue(),
          preference: sheet.getRange(row, COLUMNS.PREFERENCE).getValue() || '手鏈/手環',
          wristSize: sheet.getRange(row, COLUMNS.WRIST_SIZE).getValue(),
          colorPreference: sheet.getRange(row, COLUMNS.COLOR_PREFERENCE).getValue(),
          energyGoal: sheet.getRange(row, COLUMNS.ENERGY_GOAL).getValue(),
          calculationMethod: sheet.getRange(row, COLUMNS.CALCULATION_METHOD).getValue(),
          targetChakra: sheet.getRange(row, COLUMNS.TARGET_CHAKRA).getValue(),
          description: sheet.getRange(row, COLUMNS.DESCRIPTION).getValue(),
          budget: sheet.getRange(row, COLUMNS.BUDGET).getValue()
        };
        const recommendation = generateRecommendation(rowData);
        sheet.getRange(row, COLUMNS.AI_RECOMMENDATION).setValue(recommendation);
        processedCount++;
      }
    }

    console.log('✅ 重新處理完成！共處理 ' + processedCount + ' 筆資料');

  } catch (error) {
    console.error('❌ 重新處理失敗：' + error.toString());
  }
}

/**
 * 設定 Google Forms 觸發器
 * 在 Apps Script 編輯器中執行此函數，自動建立 onFormSubmit 觸發器
 */
function setupFormTrigger() {
  try {
    // 先移除所有舊的 onFormSubmit 觸發器
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
        console.log('已移除舊的觸發器');
      }
    });

    // 建立新的觸發器
    ScriptApp.newTrigger('onFormSubmit')
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onFormSubmit()
      .create();

    console.log('✅ Google Forms 觸發器已建立！');
    console.log('  觸發函數：onFormSubmit');
    console.log('  觸發條件：表單提交時');

  } catch (error) {
    console.error('❌ 觸發器建立失敗：' + error.toString());
  }
}

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
 *                                                → syncCsvMirror()
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
 * @returns {HtmlOutput} HTML 格式的回應頁
 */
function doPost(e) {
  try {
    const payload = parseIncomingPayload(e);

    if (isHoneypotSubmission(e, payload)) {
      return renderSubmissionPage({
        title: '資料已收到',
        headline: '表單已送出',
        message: '感謝您的填寫，我們會盡快處理。'
      });
    }

    if (payload.type === 'order') {
      const orderResult = processOrder(payload);
      return renderSubmissionPage({
        title: '訂單已送出',
        headline: '訂單已送出',
        message: '訂單編號：' + orderResult.orderId + '。店主會依照商品、手圍與配送需求與您聯繫確認付款方式。',
        reference: orderResult.orderId
      });
    }

    const consultationResult = processSubmission(payload);
    return renderSubmissionPage({
      title: '諮詢表單已送出',
      headline: '諮詢表單已送出',
      message: '感謝您的信任，我們已收到資料並會盡快與您聯繫。',
      reference: consultationResult.name || ''
    });

  } catch (error) {
    console.error('【doPost 錯誤】' + error.toString());

    return renderSubmissionPage({
      title: '提交失敗',
      headline: '提交失敗',
      message: '系統目前無法完成送出，請稍後再試或直接聯繫店主。',
      isError: true
    });
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

      // 同步更新 CSV 備份（失敗不影響已寫入的 Google Sheet 資料）
      try {
        SpreadsheetApp.flush();
        const csvUrl = syncCsvMirrorWithLock(sheet);
        if (csvUrl) {
          console.log('【CSV 同步】✅ 已更新：' + csvUrl);
        }
      } catch (csvError) {
        console.error('【CSV 同步失敗】' + csvError.toString());
      }

      // 發送 Email 通知
      sendOwnerEmail(
        '[MUPHÉ] 新諮詢 - ' + (formData.name || '未填姓名'),
        formatConsultationEmailBody(formData, recommendation, sheet.getParent().getUrl())
      );

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
  return processConsultation(data);
}

/**
 * 處理諮詢表單提交
 * @param {Object} data - 諮詢資料
 * @returns {Object} 處理結果
 */
function processConsultation(data) {
  try {
    // 步驟 1：取得試算表
    const sheet = getOrCreateSheet(SHEET_NAME, HEADER_ROW, getConsultationColumnWidths());

    // 步驟 2：準備資料列
    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm:ss'
    );

    // 步驟 3：產生規則推薦；若 GEMINI_API_KEY 留空，Recommendation.gs 會自動使用本地規則
    const recommendation = generateRecommendation(data);

    // 格式化可能為陣列的欄位為逗號分隔字串以寫入試算表
    const colorPreferenceStr = normalizeListValue(data.colorPreference);
    const energyGoalStr = normalizeListValue(data.energyGoal);
    const calculationMethodStr = normalizeListValue(data.calculationMethod);
    const targetChakraStr = normalizeListValue(data.targetChakra);

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

    // 步驟 5：寫入試算表；CSV mirror 預設停用以降低 Drive 操作量
    const csvUrl = withScriptLock(function() {
      sheet.appendRow(rowData);
      SpreadsheetApp.flush();
      try {
        return syncCsvMirrorFromSheet(sheet);
      } catch (csvError) {
        console.error('【CSV 同步失敗】' + csvError.toString());
        return '';
      }
    });
    console.log('【資料寫入】✅ 已寫入新資料：' + data.name);
    if (csvUrl) {
      console.log('【CSV 同步】✅ 已更新：' + csvUrl);
    }

    // 步驟 6：發送 Email 通知（失敗不影響資料寫入）
    try {
      sendOwnerEmail(
        '[MUPHÉ] 新諮詢 - ' + (data.name || '未填姓名'),
        formatConsultationEmailBody(data, recommendation, sheet.getParent().getUrl())
      );
    } catch (notifyError) {
      console.error('【通知發送失敗】' + notifyError.toString());
      // 通知失敗不影響主流程
    }

    return {
      success: true,
      recommendation: recommendation,
      csvUrl: csvUrl || '',
      name: data.name || ''
    };

  } catch (error) {
    console.error('【processConsultation 錯誤】' + error.toString());
    throw error;
  }
}

/**
 * 處理購物車訂單
 * @param {Object} payload - 訂單 payload
 * @returns {Object} 處理結果
 */
function processOrder(payload) {
  try {
    const customer = payload.customer || {};
    const items = normalizeOrderItems(payload.items || []);

    if (!customer.name || !customer.contact) {
      throw new Error('訂單缺少姓名或聯絡方式');
    }

    if (!items.length) {
      throw new Error('訂單沒有商品');
    }

    const sheet = getOrCreateSheet(ORDER_SHEET_NAME, ORDER_HEADER_ROW, getOrderColumnWidths());
    const timestamp = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm:ss'
    );
    const subtotal = calculateOrderSubtotal(items);
    const totalQty = items.reduce(function(sum, item) {
      return sum + item.qty;
    }, 0);

    const result = withScriptLock(function() {
      const orderId = generateOrderId(sheet);
      const rowData = [
        timestamp,
        orderId,
        customer.name || '',
        customer.contact || '',
        formatDeliveryMethod(customer.deliveryMethod),
        customer.address || '',
        customer.note || '',
        formatOrderItems(items),
        totalQty,
        subtotal,
        payload.currency || 'TWD',
        payload.source || 'site-cart',
        DEFAULT_STATUS,
        '未付款',
        '未出貨',
        '',
        JSON.stringify(payload)
      ];

      sheet.appendRow(rowData);
      SpreadsheetApp.flush();

      return {
        orderId: orderId,
        sheetUrl: sheet.getParent().getUrl()
      };
    });

    try {
      sendOwnerEmail(
        '[MUPHÉ] 新訂單 ' + result.orderId + ' - ' + customer.name,
        formatOrderEmailBody(result.orderId, customer, items, subtotal, result.sheetUrl)
      );
    } catch (notifyError) {
      console.error('【訂單通知發送失敗】' + notifyError.toString());
    }

    console.log('【訂單寫入】✅ 已寫入訂單：' + result.orderId);
    return {
      success: true,
      orderId: result.orderId,
      sheetUrl: result.sheetUrl
    };

  } catch (error) {
    console.error('【processOrder 錯誤】' + error.toString());
    throw error;
  }
}

/**
 * 解析 Apps Script Web App 收到的 payload。
 * 支援標準 form POST 的 payload hidden field，也保留 JSON body 相容性。
 * @param {Object} e - Web App 事件
 * @returns {Object} payload
 */
function parseIncomingPayload(e) {
  let payload = null;

  if (e && e.parameter && e.parameter.payload) {
    payload = JSON.parse(e.parameter.payload);
  } else if (e && e.postData && e.postData.contents) {
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      if (e.parameter && Object.keys(e.parameter).length > 0) {
        payload = Object.assign({}, e.parameter);
      }
    }
  } else if (e && e.parameter && Object.keys(e.parameter).length > 0) {
    payload = Object.assign({}, e.parameter);
  }

  if (!payload) {
    throw new Error('無法解析的請求格式');
  }

  if (!payload.type) {
    payload.type = 'consultation';
  }

  return payload;
}

/**
 * honeypot 防垃圾提交；命中時不寫入資料。
 * @param {Object} e - Web App 事件
 * @param {Object} payload - 解析後 payload
 * @returns {boolean} 是否命中 honeypot
 */
function isHoneypotSubmission(e, payload) {
  const fieldValue = e && e.parameter ? e.parameter.website : '';
  return Boolean(fieldValue || (payload && payload.website));
}

/**
 * 統一渲染 Web App 回應頁。
 * @param {Object} options - 頁面設定
 * @returns {HtmlOutput} HTML 回應
 */
function renderSubmissionPage(options) {
  const returnUrl = (
    typeof STORE_SITE_URL !== 'undefined' &&
    STORE_SITE_URL &&
    STORE_SITE_URL.indexOf('your-domain.example') === -1
  ) ? STORE_SITE_URL : '';

  const returnLink = returnUrl
    ? '<a href="' + escapeHtml(returnUrl) + '">返回 MUPHÉ Handmade</a>'
    : '<p class="hint">您可以關閉此頁，回到原本的網站視窗。</p>';

  const html = [
    '<!doctype html>',
    '<html lang="zh-Hant">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(options.title || 'MUPHÉ Handmade') + '</title>',
    '<style>',
    'body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f0e4;color:#241a2b;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.7;padding:24px;}',
    '.card{width:min(100%,560px);background:#fffaf0;border:1px solid rgba(36,26,43,.12);border-radius:8px;box-shadow:0 22px 70px rgba(36,26,43,.14);padding:34px;text-align:center;}',
    '.mark{font-size:42px;margin-bottom:10px;}',
    'h1{font-size:2rem;line-height:1.2;margin:0 0 14px;}',
    'p{color:#756c76;margin:0 0 18px;}',
    'a{align-items:center;background:#4b2d5f;border-radius:999px;color:#fffaf0;display:inline-flex;font-weight:900;justify-content:center;min-height:48px;padding:0 22px;text-decoration:none;}',
    '.error a{background:#8b403b;}',
    '.hint{font-size:.92rem;margin-bottom:0;}',
    '</style>',
    '</head>',
    '<body>',
    '<main class="card ' + (options.isError ? 'error' : '') + '">',
    '<div class="mark">' + (options.isError ? '!' : 'OK') + '</div>',
    '<h1>' + escapeHtml(options.headline || options.title || '') + '</h1>',
    '<p>' + escapeHtml(options.message || '') + '</p>',
    returnLink,
    '</main>',
    '</body>',
    '</html>'
  ].join('');

  return HtmlService
    .createHtmlOutput(html)
    .setTitle(options.title || 'MUPHÉ Handmade')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

/**
 * HTML 轉義。
 * @param {*} value - 任意值
 * @returns {string} 安全文字
 */
function escapeHtml(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 陣列或字串統一成逗號分隔字串。
 * @param {Array|string} value - 欄位值
 * @returns {string} 格式化字串
 */
function normalizeListValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return value || '';
}

/**
 * 訂單品項標準化。
 * @param {Array} items - 原始訂單品項
 * @returns {Array} 標準化品項
 */
function normalizeOrderItems(items) {
  return items
    .map(function(item) {
      return {
        id: item.id || '',
        name: item.name || '',
        scene: item.scene || '',
        color: item.color || '',
        price: Math.max(0, Number(item.price) || 0),
        qty: Math.max(1, Number(item.qty) || 1),
        wristSize: item.wristSize || ''
      };
    })
    .filter(function(item) {
      return item.id && item.name;
    });
}

/**
 * 計算訂單小計。
 * @param {Array} items - 標準化品項
 * @returns {number} 小計
 */
function calculateOrderSubtotal(items) {
  return items.reduce(function(sum, item) {
    return sum + item.price * item.qty;
  }, 0);
}

/**
 * 交付方式顯示文字。
 * @param {string} value - deliveryMethod
 * @returns {string} 顯示文字
 */
function formatDeliveryMethod(value) {
  const labels = {
    shipping: '宅配 / 店到店',
    meetup: '面交',
    undecided: '先與我確認'
  };
  return labels[value] || labels.undecided;
}

/**
 * 商品摘要文字。
 * @param {Array} items - 標準化品項
 * @returns {string} 摘要
 */
function formatOrderItems(items) {
  return items.map(function(item) {
    return [
      item.qty + ' x ' + item.name,
      '手圍 ' + (item.wristSize || '未填') + ' cm',
      item.scene,
      item.color,
      'NT$' + item.price
    ].join(' / ');
  }).join('\n');
}

/**
 * 產生當日流水訂單編號。
 * @param {Sheet} sheet - 訂單工作表
 * @returns {string} 訂單編號
 */
function generateOrderId(sheet) {
  const dateText = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const prefix = 'MUPHE-' + dateText + '-';
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return prefix + '0001';
  }

  const orderIds = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
  const todayCount = orderIds.filter(function(row) {
    return String(row[0] || '').indexOf(prefix) === 0;
  }).length;

  return prefix + Utilities.formatString('%04d', todayCount + 1);
}

/**
 * 訂單 Email 內容。
 */
function formatOrderEmailBody(orderId, customer, items, subtotal, sheetUrl) {
  return [
    '新訂單通知',
    '',
    '訂單編號：' + orderId,
    '客人姓名：' + (customer.name || ''),
    '聯絡方式：' + (customer.contact || ''),
    '交付方式：' + formatDeliveryMethod(customer.deliveryMethod),
    '地址或面交備註：' + (customer.address || '未填'),
    '訂單備註：' + (customer.note || '未填'),
    '',
    '商品明細：',
    formatOrderItems(items),
    '',
    '小計：NT$' + subtotal,
    '',
    'Google Sheet：' + sheetUrl
  ].join('\n');
}

/**
 * 諮詢 Email 內容。
 */
function formatConsultationEmailBody(data, recommendation, sheetUrl) {
  return [
    '新諮詢通知',
    '',
    '客人姓名：' + (data.name || ''),
    '聯絡方式：' + (data.contact || ''),
    '性別：' + (data.gender || '未填'),
    '生日：' + (data.birthDate || '未填') + ' ' + (data.birthTime || ''),
    '淨手圍：' + (data.wristSize || '未填'),
    '偏好色系：' + normalizeListValue(data.colorPreference),
    '期望目標：' + normalizeListValue(data.energyGoal),
    '分析方法：' + normalizeListValue(data.calculationMethod),
    '目標脈輪：' + normalizeListValue(data.targetChakra),
    '預算範圍：' + (data.budget || '未填'),
    '',
    '狀態描述：',
    data.description || '未填',
    '',
    '規則推薦：',
    recommendation || '未產生',
    '',
    'Google Sheet：' + sheetUrl
  ].join('\n');
}

/**
 * 諮詢工作表欄寬。
 */
function getConsultationColumnWidths() {
  const widths = {};
  widths[COLUMNS.TIMESTAMP] = 150;
  widths[COLUMNS.NAME] = 100;
  widths[COLUMNS.CONTACT] = 140;
  widths[COLUMNS.GENDER] = 90;
  widths[COLUMNS.BIRTH_DATE] = 120;
  widths[COLUMNS.BIRTH_TIME] = 80;
  widths[COLUMNS.PREFERENCE] = 100;
  widths[COLUMNS.WRIST_SIZE] = 80;
  widths[COLUMNS.COLOR_PREFERENCE] = 150;
  widths[COLUMNS.ENERGY_GOAL] = 180;
  widths[COLUMNS.CALCULATION_METHOD] = 150;
  widths[COLUMNS.TARGET_CHAKRA] = 180;
  widths[COLUMNS.DESCRIPTION] = 250;
  widths[COLUMNS.BUDGET] = 120;
  widths[COLUMNS.AI_RECOMMENDATION] = 400;
  widths[COLUMNS.STATUS] = 100;
  widths[COLUMNS.NOTES] = 200;
  return widths;
}

/**
 * 訂單工作表欄寬。
 */
function getOrderColumnWidths() {
  return {
    1: 150,
    2: 190,
    3: 110,
    4: 160,
    5: 120,
    6: 220,
    7: 220,
    8: 380,
    9: 90,
    10: 100,
    11: 70,
    12: 100,
    13: 100,
    14: 100,
    15: 100,
    16: 220,
    17: 420
  };
}

// ============================
// 🛠️ 輔助函數
// ============================

/**
 * 取得或建立工作表
 * 若指定的工作表不存在，自動建立並寫入標題列
 * @param {string} sheetName - 工作表名稱
 * @param {Array} headerRow - 標題列
 * @param {Object} columnWidths - 欄寬設定
 * @returns {Sheet} Google Sheets 工作表物件
 */
function getOrCreateSheet(sheetName, headerRow, columnWidths) {
  try {
    let spreadsheet;
    const targetSheetName = sheetName || SHEET_NAME;
    const headers = headerRow || HEADER_ROW;
    const widths = columnWidths || getConsultationColumnWidths();

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
    let sheet = spreadsheet.getSheetByName(targetSheetName);

    // 若工作表不存在，自動建立
    if (!sheet) {
      sheet = spreadsheet.insertSheet(targetSheetName);
      // 寫入標題列
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // 設定標題列格式（粗體、背景色）
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#E8D5F5');
      headerRange.setHorizontalAlignment('center');
      // 凍結標題列
      sheet.setFrozenRows(1);
      // 設定欄寬
      Object.keys(widths).forEach(function(columnIndex) {
        sheet.setColumnWidth(Number(columnIndex), widths[columnIndex]);
      });
      console.log('【工作表】✅ 已自動建立工作表：' + targetSheetName);
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

/**
 * 使用 Script Lock 保護寫入流程，避免多人同時送出時 CSV 同步互相覆蓋
 * @param {Function} callback - 需要在鎖內執行的函數
 * @returns {*} callback 的回傳值
 */
function withScriptLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

/**
 * 在尚未持有鎖時，同步更新 CSV 紀錄檔
 * @param {Sheet} sheet - 來源工作表
 * @returns {string} CSV 檔案網址；若停用則回傳空字串
 */
function syncCsvMirrorWithLock(sheet) {
  return withScriptLock(function() {
    SpreadsheetApp.flush();
    return syncCsvMirrorFromSheet(sheet);
  });
}

/**
 * 將目前工作表全部內容輸出成同一份 CSV 檔案
 * @param {Sheet} sheet - 來源工作表
 * @returns {string} CSV 檔案網址；若停用則回傳空字串
 */
function syncCsvMirrorFromSheet(sheet) {
  if (typeof CSV_MIRROR_ENABLED !== 'undefined' && CSV_MIRROR_ENABLED === false) {
    return '';
  }

  const values = sheet.getDataRange().getDisplayValues();
  const csvContent = values
    .map(function(row) {
      return row.map(csvEscape).join(',');
    })
    .join('\r\n') + '\r\n';

  const csvFile = getOrCreateCsvFile();
  csvFile.setContent(csvContent);
  return csvFile.getUrl();
}

/**
 * 取得或建立 CSV 紀錄檔
 * @returns {File} Google Drive 檔案
 */
function getOrCreateCsvFile() {
  const folder = getCsvFolder();
  const files = folder.getFilesByName(CSV_FILE_NAME);

  if (files.hasNext()) {
    return files.next();
  }

  return folder.createFile(CSV_FILE_NAME, '', 'text/csv');
}

/**
 * 取得 CSV 存放資料夾；未設定時使用雲端硬碟根目錄
 * @returns {Folder} Google Drive 資料夾
 */
function getCsvFolder() {
  const folderId = typeof CSV_FOLDER_ID === 'undefined' ? '' : String(CSV_FOLDER_ID || '').trim();
  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }
  return DriveApp.getRootFolder();
}

/**
 * CSV 欄位轉義，確保逗號、換行、雙引號可正確匯出
 * @param {*} value - 欄位值
 * @returns {string} CSV 安全字串
 */
function csvEscape(value) {
  const text = value === null || typeof value === 'undefined' ? '' : String(value);
  if (/[",\r\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
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
    const orderSheet = getOrCreateSheet(ORDER_SHEET_NAME, ORDER_HEADER_ROW, getOrderColumnWidths());
    const csvUrl = syncCsvMirrorWithLock(sheet);
    console.log('✅ 試算表初始化完成！');
    console.log('  諮詢工作表名稱：' + sheet.getName());
    console.log('  訂單工作表名稱：' + orderSheet.getName());
    console.log('  諮詢欄位數量：' + HEADER_ROW.length);
    console.log('  訂單欄位數量：' + ORDER_HEADER_ROW.length);
    
    // 顯示試算表 URL
    const spreadsheet = sheet.getParent();
    console.log('  試算表網址：' + spreadsheet.getUrl());
    if (csvUrl) {
      console.log('  CSV 紀錄檔網址：' + csvUrl);
    }
  } catch (error) {
    console.error('❌ 初始化失敗：' + error.toString());
  }
}

/**
 * 手動重建 CSV 紀錄檔
 * 用於首次設定 CSV，或手動修改試算表資料後重新同步
 */
function rebuildCsvMirror() {
  try {
    const sheet = getOrCreateSheet();
    const csvUrl = syncCsvMirrorWithLock(sheet);
    if (csvUrl) {
      console.log('✅ CSV 紀錄檔已重建：' + csvUrl);
    } else {
      console.log('CSV 同步目前已停用');
    }
  } catch (error) {
    console.error('❌ CSV 重建失敗：' + error.toString());
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

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
    const action = normalizeRequestAction(getRequestParameter(e, 'action'));
    if (action === 'braceletprofile') {
      return handleBraceletProfileLookup(e);
    }
    if (action === 'forgotbraceletcode') {
      return handleForgotBraceletCodeLookup(e);
    }

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

    const action = normalizeRequestAction(payload.action || payload.type);
    if (action === 'designbraceletselection' || action === 'savedesignbraceletselection') {
      try {
        const selectionResult = saveDesignBraceletSelection(payload);
        return renderSubmissionPage({
          title: '已儲存手鍊選擇',
          headline: '已儲存手鍊選擇',
          message: '已將您的手鍊 A/B/C 選擇寫入後台紀錄。',
          reference: selectionResult.accessCode || '',
          postMessagePayload: {
            app: 'muphe-submission',
            type: 'designSelection',
            success: true,
            message: '已儲存，沐菲會依照您的選擇安排後續設計。',
            accessCode: selectionResult.accessCode || '',
            designBracelets: selectionResult.designBracelets || ''
          }
        });
      } catch (selectionError) {
        console.error('【手鍊選擇儲存失敗】' + selectionError.toString());
        return renderSubmissionPage({
          title: '手鍊選擇儲存失敗',
          headline: '手鍊選擇儲存失敗',
          message: selectionError.message || '目前無法儲存手鍊選擇，請稍後再試。',
          isError: true,
          postMessagePayload: {
            app: 'muphe-submission',
            type: 'designSelection',
            success: false,
            message: selectionError.message || '目前無法儲存手鍊選擇，請稍後再試。'
          }
        });
      }
    }

    const consultationResult = processSubmission(payload);
    return renderSubmissionPage({
      title: '諮詢表單已送出',
      headline: '諮詢表單已送出',
      message: consultationResult.accessCode
        ? '感謝您的信任，我們已收到資料並已產生您的分析表密碼。'
        : '感謝您的信任，我們已收到資料並會盡快與您聯繫。',
      reference: consultationResult.accessCode || consultationResult.name || '',
      postMessagePayload: {
        app: 'muphe-submission',
        type: 'consultation',
        success: true,
        recommendation: consultationResult.recommendation || '',
        accessCode: consultationResult.accessCode || '',
        profileUrl: consultationResult.profileUrl || '',
        displayName: consultationResult.name || ''
      }
    });

  } catch (error) {
    console.error('【doPost 錯誤】' + error.toString());

    return renderSubmissionPage({
      title: '提交失敗',
      headline: '提交失敗',
      message: '系統目前無法完成送出，請稍後再試或直接聯繫店主。',
      isError: true,
      postMessagePayload: {
        app: 'muphe-submission',
        type: 'submission',
        success: false,
        message: '系統目前無法完成送出，請稍後再試或直接聯繫店主。'
      }
    });
  }
}

// ============================
// 🔎 手鍊公開檔案 API
// ============================

/**
 * 手鍊公開檔案查詢入口。
 * 支援 ?action=braceletProfile&code=... 或 ?action=braceletProfile&token=...
 * @param {Object} e - HTTP GET 事件物件
 * @returns {TextOutput} JSON 或 JSONP 文字回應
 */
function handleBraceletProfileLookup(e) {
  try {
    const accessCode = normalizeBraceletAccessCode(getRequestParameter(e, 'code'));
    const accessToken = normalizeBraceletAccessToken(getRequestParameter(e, 'token'));

    if (!accessCode && !accessToken) {
      return createJsonTextOutput(e, {
        success: false,
        error: {
          code: 'missing_lookup',
          message: '請提供 code 或 token 查詢手鍊檔案'
        }
      });
    }

    if (!isBraceletLookupLengthAllowed(accessCode, accessToken)) {
      return createJsonTextOutput(e, {
        success: false,
        error: {
          code: 'invalid_lookup',
          message: '查詢碼或 token 格式不正確'
        }
      });
    }

    const profile = findPublishedBraceletProfile(accessCode, accessToken);
    if (!profile) {
      return createJsonTextOutput(e, {
        success: false,
        error: {
          code: 'not_found',
          message: '找不到已公開的手鍊檔案'
        }
      });
    }

    return createJsonTextOutput(e, {
      success: true,
      data: profile,
      retrievedAt: formatApiTimestamp(new Date())
    });

  } catch (error) {
    console.error('【手鍊檔案查詢錯誤】' + error.toString());
    return createJsonTextOutput(e, {
      success: false,
      error: {
        code: 'server_error',
        message: '系統目前無法查詢手鍊檔案'
      }
    });
  }
}

/**
 * 忘記分析表密碼查詢入口。
 * 使用姓名與生日比對諮詢紀錄，只回傳查詢碼，不回傳生日、聯絡方式或其他個資。
 * @param {Object} e - HTTP GET 事件物件
 * @returns {TextOutput} JSON 或 JSONP 文字回應
 */
function handleForgotBraceletCodeLookup(e) {
  try {
    const name = getRequestParameter(e, 'name');
    const birthDate = getRequestParameter(e, 'birthDate');

    if (!normalizeCustomerLookupName(name) || !normalizeLookupBirthDate(birthDate)) {
      return createJsonTextOutput(e, {
        success: false,
        error: {
          code: 'missing_identity',
          message: '請輸入姓名與生日'
        }
      });
    }

    const credential = findBraceletAccessCodeByCustomerIdentity(name, birthDate);
    if (!credential) {
      return createJsonTextOutput(e, {
        success: false,
        error: {
          code: 'not_found',
          message: '找不到符合的分析表密碼，請確認姓名與生日是否與表單相同。'
        }
      });
    }

    return createJsonTextOutput(e, {
      success: true,
      data: {
        accessCode: credential.accessCode,
        profileUrl: credential.profileUrl
      },
      retrievedAt: formatApiTimestamp(new Date())
    });

  } catch (error) {
    console.error('【忘記分析表密碼查詢錯誤】' + error.toString());
    return createJsonTextOutput(e, {
      success: false,
      error: {
        code: 'server_error',
        message: '系統目前無法找回分析表密碼'
      }
    });
  }
}

/**
 * 從手鍊檔案工作表查詢已公開的手鍊檔案。
 * 未公開或不存在的資料都回傳 null，避免對外洩漏狀態。
 * @param {string} accessCode - 正規化後的查詢碼
 * @param {string} accessToken - 正規化後的 token
 * @returns {Object|null} 公開檔案資料
 */
function findPublishedBraceletProfile(accessCode, accessToken) {
  const sheet = getOrCreateSheet(
    BRACELET_PROFILE_SHEET_NAME,
    BRACELET_PROFILE_HEADER_ROW,
    getBraceletProfileColumnWidths()
  );
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return null;
  }

  const rows = sheet
    .getRange(2, 1, lastRow - 1, BRACELET_PROFILE_HEADER_ROW.length)
    .getDisplayValues();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!isBraceletProfilePublished(row)) {
      continue;
    }

    const rowCode = normalizeBraceletAccessCode(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.ACCESS_CODE));
    const rowToken = normalizeBraceletAccessToken(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.ACCESS_TOKEN));
    const isCodeMatch = Boolean(accessCode && rowCode && rowCode === accessCode);
    const isTokenMatch = Boolean(accessToken && rowToken && rowToken === accessToken);

    if (isCodeMatch || isTokenMatch) {
      return buildPublicBraceletProfile(row);
    }
  }

  return null;
}

/**
 * 使用姓名與生日找回由諮詢表單建立的個人分析表查詢碼。
 * @param {*} name - 使用者輸入姓名
 * @param {*} birthDate - 使用者輸入生日
 * @returns {Object|null} 查詢憑證
 */
function findBraceletAccessCodeByCustomerIdentity(name, birthDate) {
  const normalizedName = normalizeCustomerLookupName(name);
  const normalizedBirthDate = normalizeLookupBirthDate(birthDate);
  if (!normalizedName || !normalizedBirthDate) {
    return null;
  }

  const consultationSheet = getOrCreateSheet(SHEET_NAME, HEADER_ROW, getConsultationColumnWidths());
  const consultationLastRow = consultationSheet.getLastRow();
  if (consultationLastRow <= 1) {
    return null;
  }

  const consultationRows = consultationSheet
    .getRange(2, 1, consultationLastRow - 1, HEADER_ROW.length)
    .getDisplayValues();

  const profileSheet = getOrCreateSheet(
    BRACELET_PROFILE_SHEET_NAME,
    BRACELET_PROFILE_HEADER_ROW,
    getBraceletProfileColumnWidths()
  );
  const profileLastRow = profileSheet.getLastRow();
  if (profileLastRow <= 1) {
    return null;
  }

  const profileRows = profileSheet
    .getRange(2, 1, profileLastRow - 1, BRACELET_PROFILE_HEADER_ROW.length)
    .getDisplayValues();

  for (let i = consultationRows.length - 1; i >= 0; i--) {
    const row = consultationRows[i];
    const rowName = normalizeCustomerLookupName(row[COLUMNS.NAME - 1]);
    const rowBirthDate = normalizeLookupBirthDate(row[COLUMNS.BIRTH_DATE - 1]);

    if (rowName !== normalizedName || rowBirthDate !== normalizedBirthDate) {
      continue;
    }

    const consultationRowNumber = i + 2;
    const credential = findPublishedBraceletCredentialByConsultationRow(profileRows, consultationRowNumber);
    if (credential) {
      return credential;
    }
  }

  return null;
}

/**
 * 從個人分析表列中，依諮詢紀錄列號找出查詢碼。
 * @param {Array[]} profileRows - 手鍊檔案工作表資料列
 * @param {number} consultationRowNumber - 諮詢紀錄列號
 * @returns {Object|null} 查詢憑證
 */
function findPublishedBraceletCredentialByConsultationRow(profileRows, consultationRowNumber) {
  const rowNumberText = String(consultationRowNumber);

  for (let i = profileRows.length - 1; i >= 0; i--) {
    const row = profileRows[i];
    if (!isBraceletProfilePublished(row)) {
      continue;
    }

    const internalNotes = getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.INTERNAL_NOTES);
    if (!doesInternalNoteReferenceConsultationRow(internalNotes, rowNumberText)) {
      continue;
    }

    const accessCode = getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.ACCESS_CODE);
    if (!accessCode) {
      continue;
    }

    return {
      accessCode: accessCode,
      profileId: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.PROFILE_ID),
      profileUrl: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.PRODUCT_URL)
    };
  }

  return null;
}

/**
 * 判斷手鍊檔案內部備註是否指向指定諮詢紀錄列號。
 * @param {*} internalNotes - 內部備註
 * @param {string} rowNumberText - 列號文字
 * @returns {boolean} 是否匹配
 */
function doesInternalNoteReferenceConsultationRow(internalNotes, rowNumberText) {
  const text = normalizeHalfWidthText(internalNotes);
  const pattern = new RegExp('諮詢紀錄列號\\s*' + rowNumberText + '(?![0-9])');
  return pattern.test(text);
}

/**
 * 將完整工作表列轉成對外安全的公開手鍊檔案。
 * 不輸出 token、聯絡方式、地址、生日、生時或內部備註。
 * @param {Array} row - 工作表列資料
 * @returns {Object} 對外公開資料
 */
function buildPublicBraceletProfile(row) {
  const scene = getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.SCENE);
  return {
    profileId: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.PROFILE_ID),
    profileType: /水晶諮詢(?:圖卡|分析表)/.test(scene) ? 'consultationCard' : 'braceletProfile',
    displayName: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.DISPLAY_NAME),
    braceletName: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.BRACELET_NAME),
    scene: scene,
    summary: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.SUMMARY),
    crystals: splitPublicListValue(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.CRYSTALS)),
    energyFocus: splitPublicListValue(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.ENERGY_FOCUS)),
    chakraFocus: splitPublicListValue(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.CHAKRA_FOCUS)),
    designNotes: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.DESIGN_NOTES),
    wearingGuide: splitPublicListValue(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.WEARING_GUIDE)),
    careInstructions: splitPublicListValue(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.CARE_INSTRUCTIONS)),
    ritual: splitPublicListValue(getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.RITUAL_TEXT)),
    makerNote: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.MAKER_NOTE),
    imageUrl: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.IMAGE_URL),
    productUrl: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.PRODUCT_URL),
    publishedAt: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.PUBLISHED_AT),
    updatedAt: getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.UPDATED_AT)
  };
}

/**
 * 產生一組可填入手鍊檔案工作表的檔案 ID、查詢碼與 token。
 * 在 Apps Script 編輯器中手動執行，或由後台操作流程呼叫。
 * @returns {Object} 新憑證
 */
function generateBraceletProfileCredentials() {
  const sheet = getOrCreateSheet(
    BRACELET_PROFILE_SHEET_NAME,
    BRACELET_PROFILE_HEADER_ROW,
    getBraceletProfileColumnWidths()
  );

  return withScriptLock(function() {
    return {
      profileId: generateBraceletProfileId(),
      accessCode: generateBraceletProfileAccessCode(sheet),
      accessToken: generateBraceletProfileAccessToken()
    };
  });
}

/**
 * 產生手鍊檔案 ID。
 * @returns {string} 檔案 ID
 */
function generateBraceletProfileId() {
  const token = Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase();
  return 'BP-' + token;
}

/**
 * 產生不易混淆且不與現有資料重複的短查詢碼。
 * @param {Sheet} sheet - 手鍊檔案工作表
 * @returns {string} 查詢碼
 */
function generateBraceletProfileAccessCode(sheet) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = 'MUPHE-' + generateReadableCodeSegment(4) + '-' + generateReadableCodeSegment(4);
    if (!braceletAccessCodeExists(sheet, code)) {
      return code;
    }
  }

  return 'MUPHE-' + generateReadableCodeSegment(4) + '-' + generateReadableCodeSegment(6);
}

/**
 * 產生高熵 token，適合放入 QR URL。
 * @returns {string} token
 */
function generateBraceletProfileAccessToken() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
}

/**
 * 產生分析評估紀錄 ID。
 * @returns {string} 評估 ID
 */
function generateAnalysisEvaluationId() {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const randomPart = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
  return 'EVAL-' + timestamp + '-' + randomPart;
}

/**
 * 由諮詢表單自動建立一份可用密碼查詢的個人水晶分析表。
 * 對外內容只保留名字與推薦方向，不寫入聯絡方式、生日、性別、手圍或預算。
 * @param {Object} data - 諮詢表單資料
 * @param {string} recommendation - AI/規則初步推薦
 * @param {string} timestamp - 建立時間
 * @param {number} consultationRow - 諮詢紀錄列號
 * @returns {Object} 查詢憑證與公開網址
 */
function appendConsultationCardProfile(data, recommendation, timestamp, consultationRow) {
  const profileSheet = getOrCreateSheet(
    BRACELET_PROFILE_SHEET_NAME,
    BRACELET_PROFILE_HEADER_ROW,
    getBraceletProfileColumnWidths()
  );
  const profileId = generateBraceletProfileId();
  const accessCode = generateBraceletProfileAccessCode(profileSheet);
  const accessToken = generateBraceletProfileAccessToken();
  const publicFields = buildConsultationCardPublicFields(data, recommendation, accessCode);
  const profileUrl = getBraceletProfileUrl(accessCode);
  const archiveResult = archiveConsultationCardProfile({
    profileId: profileId,
    accessCode: accessCode,
    profileUrl: profileUrl,
    createdAt: timestamp,
    publicFields: publicFields
  });
  const archiveNote = archiveResult && archiveResult.fileUrl
    ? '；分析表歸檔：' + archiveResult.fileUrl
    : '';

  const rowData = [
    timestamp,
    timestamp,
    profileId,
    accessCode,
    accessToken,
    '公開',
    publicFields.displayName,
    publicFields.braceletName,
    publicFields.scene,
    publicFields.summary,
    publicFields.crystals.join('\n'),
    publicFields.energyFocus.join('\n'),
    publicFields.chakraFocus.join('\n'),
    publicFields.designNotes,
    publicFields.wearingGuide.join('\n'),
    publicFields.careInstructions.join('\n'),
    publicFields.ritual.join('\n'),
    publicFields.makerNote,
    '',
    profileUrl,
    timestamp,
    '由諮詢表單自動生成；諮詢紀錄列號 ' + consultationRow + '；公開分析表已排除聯絡方式、生日、性別、手圍與預算。' + archiveNote
  ];

  profileSheet.appendRow(rowData);

  return {
    profileId: profileId,
    accessCode: accessCode,
    accessToken: accessToken,
    profileUrl: profileUrl,
    archiveFileUrl: archiveResult ? archiveResult.fileUrl : ''
  };
}

/**
 * 保存最初「您的專屬水晶能量初步評估」全文，供後台用查詢碼追查。
 * @param {Object} data - 諮詢表單資料
 * @param {string} recommendation - AI/規則初步推薦全文
 * @param {string} timestamp - 建立時間
 * @param {number} consultationRow - 諮詢紀錄列號
 * @param {Object} profileResult - 個人分析表建立結果
 * @returns {Object} 分析評估紀錄資訊
 */
function appendAnalysisEvaluationRecord(data, recommendation, timestamp, consultationRow, profileResult) {
  const evaluationSheet = getOrCreateSheet(
    ANALYSIS_EVALUATION_SHEET_NAME,
    ANALYSIS_EVALUATION_HEADER_ROW,
    getAnalysisEvaluationColumnWidths()
  );
  const evaluationId = generateAnalysisEvaluationId();
  const accessCode = profileResult && profileResult.accessCode ? profileResult.accessCode : '';
  const profileId = profileResult && profileResult.profileId ? profileResult.profileId : '';
  const profileUrl = profileResult && profileResult.profileUrl ? profileResult.profileUrl : '';

  const rowData = [
    timestamp,
    timestamp,
    evaluationId,
    accessCode,
    profileId,
    data.name || '',
    data.contact || '',
    data.gender || '',
    data.birthDate || '',
    data.birthTime || '',
    normalizeListValue(data.calculationMethod),
    normalizeListValue(data.energyGoal),
    normalizeListValue(data.targetChakra),
    normalizeListValue(data.colorPreference),
    data.wristSize || '',
    data.budget || '',
    data.description || '',
    recommendation || '',
    profileUrl,
    consultationRow || '',
    '由諮詢表單自動保存；與手鍊檔案共用查詢碼。',
    normalizeDesignBraceletSelection(data.designBraceletSelection || data.designBracelets)
  ];

  evaluationSheet.appendRow(rowData);

  return {
    evaluationId: evaluationId,
    accessCode: accessCode,
    rowNumber: evaluationSheet.getLastRow()
  };
}

/**
 * 將既有「分析評估表」全文回填到「手鍊檔案」公開摘要欄。
 * 讓舊的分析表密碼也能顯示完整「您的專屬水晶能量初步評估」內容。
 * @returns {Object} 回填結果
 */
function backfillConsultationAnalysisSheets() {
  return withScriptLock(function() {
    const profileSheet = getOrCreateSheet(
      BRACELET_PROFILE_SHEET_NAME,
      BRACELET_PROFILE_HEADER_ROW,
      getBraceletProfileColumnWidths()
    );
    const evaluationSheet = getOrCreateSheet(
      ANALYSIS_EVALUATION_SHEET_NAME,
      ANALYSIS_EVALUATION_HEADER_ROW,
      getAnalysisEvaluationColumnWidths()
    );
    const evaluationLastRow = evaluationSheet.getLastRow();
    const profileLastRow = profileSheet.getLastRow();
    const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
    const recommendationByCode = {};
    let scannedEvaluations = 0;
    let updatedProfiles = 0;

    if (evaluationLastRow > 1) {
      const evaluationValues = evaluationSheet.getRange(2, 1, evaluationLastRow - 1, ANALYSIS_EVALUATION_HEADER_ROW.length).getValues();
      evaluationValues.forEach(function(row) {
        const accessCode = normalizeBraceletAccessCode(row[ANALYSIS_EVALUATION_COLUMNS.ACCESS_CODE - 1] || '');
        const recommendation = row[ANALYSIS_EVALUATION_COLUMNS.RECOMMENDATION_TEXT - 1] || '';
        if (accessCode && recommendation) {
          recommendationByCode[accessCode] = recommendation;
          scannedEvaluations += 1;
        }
      });
    }

    if (profileLastRow > 1) {
      const profileValues = profileSheet.getRange(2, 1, profileLastRow - 1, BRACELET_PROFILE_HEADER_ROW.length).getValues();
      profileValues.forEach(function(row, index) {
        const rowNumber = index + 2;
        const accessCode = normalizeBraceletAccessCode(row[BRACELET_PROFILE_COLUMNS.ACCESS_CODE - 1] || '');
        const recommendation = recommendationByCode[accessCode];

        if (!accessCode || !recommendation) {
          return;
        }

        const fullAnalysis = buildPublicAnalysisReportText(recommendation);
        if (!fullAnalysis) {
          return;
        }

        const currentSummary = String(row[BRACELET_PROFILE_COLUMNS.SUMMARY - 1] || '').trim();
        const currentScene = String(row[BRACELET_PROFILE_COLUMNS.SCENE - 1] || '').trim();
        const currentName = String(row[BRACELET_PROFILE_COLUMNS.BRACELET_NAME - 1] || '').trim();

        profileSheet.getRange(rowNumber, BRACELET_PROFILE_COLUMNS.SUMMARY).setValue(fullAnalysis);
        if (/水晶諮詢圖卡/.test(currentScene)) {
          profileSheet.getRange(rowNumber, BRACELET_PROFILE_COLUMNS.SCENE).setValue('水晶諮詢分析表');
        }
        if (/水晶狀態圖卡/.test(currentName)) {
          profileSheet.getRange(rowNumber, BRACELET_PROFILE_COLUMNS.BRACELET_NAME).setValue(currentName.replace(/水晶狀態圖卡/g, '水晶狀態分析表'));
        }
        profileSheet.getRange(rowNumber, BRACELET_PROFILE_COLUMNS.UPDATED_AT).setValue(updatedAt);

        if (currentSummary !== fullAnalysis) {
          updatedProfiles += 1;
        }
      });
    }

    SpreadsheetApp.flush();

    return {
      scannedEvaluations: scannedEvaluations,
      updatedProfiles: updatedProfiles
    };
  });
}

/**
 * 儲存客戶看完分析結果後選擇的手鍊 A/B/C。
 * 使用分析表密碼回寫同一筆諮詢主表與分析評估表，方便後台製作手鍊。
 * @param {Object} payload - 前端結果頁送出的選擇資料
 * @returns {Object} 儲存結果
 */
function saveDesignBraceletSelection(payload) {
  const accessCodeRaw = payload.accessCode || payload.profileCode || payload.code || '';
  const normalizedAccessCode = normalizeBraceletAccessCode(accessCodeRaw);
  const designBracelets = normalizeDesignBraceletSelection(payload.designBraceletSelection || payload.designBracelets);

  if (!normalizedAccessCode) {
    throw new Error('缺少分析表密碼，無法儲存手鍊選擇。');
  }

  if (!designBracelets) {
    throw new Error('請至少選擇一款想設計的手鍊。');
  }

  return withScriptLock(function() {
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
    const consultationSheet = getOrCreateSheet(SHEET_NAME, HEADER_ROW, getConsultationColumnWidths());
    const evaluationSheet = getOrCreateSheet(
      ANALYSIS_EVALUATION_SHEET_NAME,
      ANALYSIS_EVALUATION_HEADER_ROW,
      getAnalysisEvaluationColumnWidths()
    );
    const match = findAnalysisEvaluationRowByAccessCode(evaluationSheet, normalizedAccessCode);

    if (!match) {
      throw new Error('找不到對應的分析表密碼，請確認密碼是否正確。');
    }

    evaluationSheet.getRange(match.rowNumber, ANALYSIS_EVALUATION_COLUMNS.UPDATED_AT).setValue(timestamp);
    evaluationSheet.getRange(match.rowNumber, ANALYSIS_EVALUATION_COLUMNS.DESIGN_BRACELETS).setValue(designBracelets);

    if (match.consultationRow && match.consultationRow > 1) {
      consultationSheet.getRange(match.consultationRow, COLUMNS.DESIGN_BRACELETS).setValue(designBracelets);
    }

    SpreadsheetApp.flush();
    syncCsvMirrorFromSheet(consultationSheet);

    return {
      success: true,
      accessCode: match.displayAccessCode || accessCodeRaw,
      designBracelets: designBracelets,
      analysisEvaluationRow: match.rowNumber,
      consultationRow: match.consultationRow || ''
    };
  });
}

/**
 * 依分析表密碼找出分析評估表資料列。
 * @param {Sheet} evaluationSheet - 分析評估表
 * @param {string} normalizedAccessCode - 正規化後密碼
 * @returns {Object|null} 命中的資料列資訊
 */
function findAnalysisEvaluationRowByAccessCode(evaluationSheet, normalizedAccessCode) {
  const lastRow = evaluationSheet.getLastRow();
  if (lastRow <= 1) {
    return null;
  }

  const values = evaluationSheet
    .getRange(2, 1, lastRow - 1, ANALYSIS_EVALUATION_HEADER_ROW.length)
    .getDisplayValues();

  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i];
    const rowAccessCode = row[ANALYSIS_EVALUATION_COLUMNS.ACCESS_CODE - 1];
    if (normalizeBraceletAccessCode(rowAccessCode) !== normalizedAccessCode) {
      continue;
    }

    const consultationRow = parseInt(row[ANALYSIS_EVALUATION_COLUMNS.CONSULTATION_ROW - 1], 10);
    return {
      rowNumber: i + 2,
      displayAccessCode: rowAccessCode,
      consultationRow: isNaN(consultationRow) ? 0 : consultationRow
    };
  }

  return null;
}

/**
 * 將前端 A/B/C 選擇正規化成後台固定文字，避免人工輸入格式不同。
 * @param {Array|string} value - 選擇資料
 * @returns {string} 逗號分隔的固定選項
 */
function normalizeDesignBraceletSelection(value) {
  const optionMap = {
    A: '手鍊 A — 主命宮能量手鍊',
    B: '手鍊 B — 心靈平衡療癒手鍊',
    C: '手鍊 C — 流年幸運守護手鍊'
  };
  const items = Array.isArray(value)
    ? value
    : String(value || '').split(/\r?\n|[,，;；]+/);
  const selected = {};

  items.forEach(function(item) {
    const text = normalizeHalfWidthText(item).trim();
    if (!text) {
      return;
    }

    const match = text.match(/(?:手鍊\s*)?([ABC])(?:\s|$|—|-|－)/i) || text.match(/^([ABC])$/i);
    if (match && optionMap[match[1].toUpperCase()]) {
      selected[match[1].toUpperCase()] = true;
    }
  });

  return ['A', 'B', 'C']
    .filter(function(code) {
      return selected[code];
    })
    .map(function(code) {
      return optionMap[code];
    })
    .join(', ');
}

/**
 * 依「水晶成本」資料夾中的價牌照片整理出的初始成本資料。
 * 辨識狀態為「待核對」的列，代表照片字樣或品名較小，建議店主在後台再確認一次。
 * @returns {Array[]} 水晶成本資料列
 */
function getDefaultCrystalCostRows() {
  return [
    ['天眼石', 9, 15, 'TWD', '黑色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['黑曜石', 16, 50, 'TWD', '黑色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['黑曜石', 12, 35, 'TWD', '黑色', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['黑曜石', 8, 15, 'TWD', '黑色', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['黑曜石', 6, 10, 'TWD', '黑色', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['瑪瑙', 12, 35, 'TWD', '黑色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['一線天珠', 8, 15, 'TWD', '黑白', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['一線天珠', 6, 10, 'TWD', '黑白', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['天眼天珠', 8, 20, 'TWD', '紅白', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['天眼天珠', 6, 10, 'TWD', '紅白', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['紅虎眼', 10, 20, 'TWD', '紅色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['紅虎眼', 8, 15, 'TWD', '紅色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['孔雀藍虎眼', 10, 20, 'TWD', '藍色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['孔雀藍虎眼', 8, 15, 'TWD', '藍色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['孔雀藍虎眼', 6, 10, 'TWD', '藍色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['黃虎眼', 10, 20, 'TWD', '黃金色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['黃虎眼', 8, 15, 'TWD', '黃金色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['黃虎眼', 6, 10, 'TWD', '黃金色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['紅兔髮', 8, 15, 'TWD', '紅色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],
    ['紅兔髮', 6, 10, 'TWD', '紅色', 'LINE_NOTE_260705_1.jpg', '已辨識', ''],

    ['白水晶', 10, 20, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['白水晶', 6, 15, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['白松石', 12, 30, 'TWD', '白色', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['白松石', 10, 20, 'TWD', '白色', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['白松石', 8, 10, 'TWD', '白色', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['白佛眼', 6, 10, 'TWD', '白色', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['蛋白石', 12, 35, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['蛋白石', 8, 15, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['蛋白石', 6, 10, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['純淨白水晶', 10, 25, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['純淨白水晶', 8, 20, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],
    ['純淨白水晶', 6, 10, 'TWD', '白色透明', 'LINE_NOTE_260705_2.jpg', '已辨識', ''],

    ['水紋藍瑪瑙', 10, 20, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['水紋藍瑪瑙', 8, 15, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['土耳其石', 10, 15, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['土耳其石', 8, 10, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['土耳其石', 6, 5, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['青金石', 10, 25, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['青金石', 8, 20, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['青金石', 6, 15, 'TWD', '藍色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['夢幻紫水晶', 10, 20, 'TWD', '紫色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['夢幻紫水晶', 8, 15, 'TWD', '紫色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['夢幻紫水晶', 6, 10, 'TWD', '紫色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['純淨紫水晶', 10, 25, 'TWD', '紫色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],
    ['純淨紫水晶', 8, 25, 'TWD', '紫色', 'LINE_NOTE_260705_3.jpg', '待核對', '價牌看起來為 25 元，建議核對。'],
    ['純淨紫水晶', 6, 15, 'TWD', '紫色', 'LINE_NOTE_260705_3.jpg', '已辨識', ''],

    ['草莓晶', 10, 20, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['草莓晶', 8, 15, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['草莓晶', 6, 10, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅白玉髓', 10, 20, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅白玉髓', 8, 15, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅白玉髓', 6, 10, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['粉水晶', 10, 20, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '待核對', '照片字樣較淡，建議核對。'],
    ['粉水晶', 8, 15, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '待核對', '照片字樣較淡，建議核對。'],
    ['粉水晶', 6, 10, 'TWD', '粉色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['西瓜晶', 10, 15, 'TWD', '橙色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['西瓜晶', 8, 10, 'TWD', '橙色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['西瓜晶', 6, 5, 'TWD', '橙色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅瑪瑙', 10, 20, 'TWD', '紅色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅瑪瑙', 8, 15, 'TWD', '紅色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅瑪瑙', 6, 10, 'TWD', '紅色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅瑪瑙', 5, 8, 'TWD', '紅色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅瑪瑙', 4, 5, 'TWD', '紅色', 'LINE_NOTE_260705_4.jpg', '已辨識', ''],
    ['紅紋石', 10, 20, 'TWD', '紅色', 'LINE_NOTE_260705_4.jpg', '待核對', '右上紅色系價牌字樣較小。'],
    ['紅紋石', 8, 15, 'TWD', '紅色', 'LINE_NOTE_260705_4.jpg', '待核對', '右上紅色系價牌字樣較小。'],

    ['太陽石', 9, 20, 'TWD', '橙色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['太陽石', 6, 15, 'TWD', '橙色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['黃玉', 10, 20, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['黃玉', 8, 15, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['黃玉', 6, 10, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['黃瑪瑙', 12, 30, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['黃瑪瑙', 8, 15, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['黃瑪瑙', 6, 10, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['黃瑪瑙', 4, 5, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['檸檬鈦水晶', 10, 30, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '待核對', '品名字樣較小，先依照片辨識建檔。'],
    ['檸檬鈦水晶', 8, 25, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '待核對', '品名字樣較小，先依照片辨識建檔。'],
    ['檸檬鈦水晶', 6, 20, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '待核對', '品名字樣較小，先依照片辨識建檔。'],
    ['刻面黃水晶', 10, 25, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['刻面黃水晶', 8, 20, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['刻面黃水晶', 6, 15, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '已辨識', ''],
    ['透明黃水晶', 10, 25, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '待核對', '照片中品名疑似透明黃水晶。'],
    ['透明黃水晶', 8, 20, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '待核對', '照片中品名疑似透明黃水晶。'],
    ['透明黃水晶', 6, 15, 'TWD', '黃金色', 'LINE_NOTE_260705_5.jpg', '待核對', '照片中品名疑似透明黃水晶。'],

    ['翡翠玉', 10, 20, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['翡翠玉', 8, 15, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['翡翠玉', 6, 10, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠瑪瑙', 10, 20, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠瑪瑙', 8, 15, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠瑪瑙', 6, 10, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠髮晶', 10, 25, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠髮晶', 8, 20, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠髮晶', 6, 15, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠螢石', 10, 25, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠螢石', 8, 20, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠螢石', 6, 15, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠玉', 10, 20, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠玉', 8, 15, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', ''],
    ['綠玉', 6, 10, 'TWD', '綠色', 'LINE_NOTE_260705_6.jpg', '已辨識', '']
  ];
}

/**
 * 建立或更新後台「水晶成本」分頁。
 * @returns {Object} 匯入結果
 */
function initializeCrystalCostSheet() {
  const sheet = getOrCreateSheet(CRYSTAL_COST_SHEET_NAME, CRYSTAL_COST_HEADER_ROW, getCrystalCostColumnWidths());
  const rows = getDefaultCrystalCostRows();
  const updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
  const values = rows.map(function(row) {
    return row.concat([updatedAt]);
  });

  withScriptLock(function() {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, CRYSTAL_COST_HEADER_ROW.length).clearContent();
    }
    if (values.length) {
      sheet.getRange(2, 1, values.length, CRYSTAL_COST_HEADER_ROW.length).setValues(values);
      sheet.getRange(2, CRYSTAL_COST_COLUMNS.UNIT_COST, values.length, 1).setNumberFormat('$#,##0');
    }
    sheet.getRange(1, 1, 1, CRYSTAL_COST_HEADER_ROW.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    if (sheet.getFilter()) {
      sheet.getFilter().remove();
    }
    sheet.getRange(1, 1, Math.max(values.length + 1, 2), CRYSTAL_COST_HEADER_ROW.length).createFilter();
    SpreadsheetApp.flush();
  });

  console.log('✅ 水晶成本分頁已更新，共 ' + rows.length + ' 筆。');
  return {
    sheetName: CRYSTAL_COST_SHEET_NAME,
    rowCount: rows.length,
    url: sheet.getParent().getUrl()
  };
}

/**
 * 手動回補既有諮詢紀錄到分析評估表。
 * 會依手鍊檔案內部備註中的諮詢紀錄列號，找出同一筆資料的查詢碼。
 * @returns {Object} 回補結果
 */
function backfillAnalysisEvaluationSheet() {
  return withScriptLock(function() {
    const consultationSheet = getOrCreateSheet(SHEET_NAME, HEADER_ROW, getConsultationColumnWidths());
    const profileSheet = getOrCreateSheet(
      BRACELET_PROFILE_SHEET_NAME,
      BRACELET_PROFILE_HEADER_ROW,
      getBraceletProfileColumnWidths()
    );
    const evaluationSheet = getOrCreateSheet(
      ANALYSIS_EVALUATION_SHEET_NAME,
      ANALYSIS_EVALUATION_HEADER_ROW,
      getAnalysisEvaluationColumnWidths()
    );
    const existingAccessCodes = {};
    const evaluationLastRow = evaluationSheet.getLastRow();

    if (evaluationLastRow > 1) {
      const existingRows = evaluationSheet
        .getRange(2, ANALYSIS_EVALUATION_COLUMNS.ACCESS_CODE, evaluationLastRow - 1, 1)
        .getDisplayValues();
      existingRows.forEach(function(row) {
        const accessCode = normalizeBraceletAccessCode(row[0]);
        if (accessCode) {
          existingAccessCodes[accessCode] = true;
        }
      });
    }

    const consultationLastRow = consultationSheet.getLastRow();
    if (consultationLastRow <= 1) {
      return {
        createdCount: 0,
        skippedCount: 0,
        message: '沒有可回補的諮詢紀錄'
      };
    }

    const consultationRows = consultationSheet
      .getRange(2, 1, consultationLastRow - 1, HEADER_ROW.length)
      .getDisplayValues();
    const profileLastRow = profileSheet.getLastRow();
    const profileRows = profileLastRow > 1
      ? profileSheet.getRange(2, 1, profileLastRow - 1, BRACELET_PROFILE_HEADER_ROW.length).getDisplayValues()
      : [];
    let createdCount = 0;
    let skippedCount = 0;

    consultationRows.forEach(function(row, index) {
      const consultationRowNumber = index + 2;
      const recommendation = row[COLUMNS.AI_RECOMMENDATION - 1] || '';
      const timestamp = row[COLUMNS.TIMESTAMP - 1] || '';
      const credential = findPublishedBraceletCredentialByConsultationRow(profileRows, consultationRowNumber);
      const accessCode = credential ? normalizeBraceletAccessCode(credential.accessCode) : '';

      if (!recommendation || !accessCode || existingAccessCodes[accessCode]) {
        skippedCount++;
        return;
      }

      appendAnalysisEvaluationRecord(
        {
          name: row[COLUMNS.NAME - 1] || '',
          contact: row[COLUMNS.CONTACT - 1] || '',
          gender: row[COLUMNS.GENDER - 1] || '',
          birthDate: row[COLUMNS.BIRTH_DATE - 1] || '',
          birthTime: row[COLUMNS.BIRTH_TIME - 1] || '',
          wristSize: row[COLUMNS.WRIST_SIZE - 1] || '',
          colorPreference: row[COLUMNS.COLOR_PREFERENCE - 1] || '',
          energyGoal: row[COLUMNS.ENERGY_GOAL - 1] || '',
          calculationMethod: row[COLUMNS.CALCULATION_METHOD - 1] || '',
          targetChakra: row[COLUMNS.TARGET_CHAKRA - 1] || '',
          description: row[COLUMNS.DESCRIPTION - 1] || '',
          budget: row[COLUMNS.BUDGET - 1] || ''
        },
        recommendation,
        timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss'),
        consultationRowNumber,
        credential
      );
      existingAccessCodes[accessCode] = true;
      createdCount++;
    });

    SpreadsheetApp.flush();
    console.log('【分析評估表回補】✅ 新增 ' + createdCount + ' 筆，略過 ' + skippedCount + ' 筆');

    return {
      createdCount: createdCount,
      skippedCount: skippedCount,
      sheetName: evaluationSheet.getName()
    };
  });
}

/**
 * 將客戶個人分析表保存到後台 Google Drive 資料夾。
 * 保存內容只包含個人分析表資料，不含聯絡方式、生日、性別、手圍或預算。
 * @param {Object} options - 分析表歸檔資料
 * @returns {Object|null} 歸檔結果
 */
function archiveConsultationCardProfile(options) {
  try {
    if (typeof CONSULTATION_CARD_ARCHIVE_ENABLED !== 'undefined' && CONSULTATION_CARD_ARCHIVE_ENABLED === false) {
      return null;
    }

    const folder = getConsultationCardArchiveFolder();
    const fileName = buildConsultationCardArchiveFileName(options);
    const html = buildConsultationCardArchiveHtml(options);
    const file = folder.createFile(fileName, html, MimeType.HTML);
    file.setDescription('MUPHÉ 客戶水晶分析表歸檔。此檔案只含個人分析表資料，不含聯絡方式、生日、性別、手圍或預算。');

    return {
      fileId: file.getId(),
      fileUrl: file.getUrl()
    };
  } catch (error) {
    console.error('【分析表歸檔失敗】' + error.toString());
    return null;
  }
}

/**
 * 取得或建立客戶分析表歸檔資料夾。
 * @returns {Folder} Google Drive 資料夾
 */
function getConsultationCardArchiveFolder() {
  const folderId = typeof CONSULTATION_CARD_FOLDER_ID === 'undefined'
    ? ''
    : String(CONSULTATION_CARD_FOLDER_ID || '').trim();

  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }

  const folderName = (
    typeof CONSULTATION_CARD_FOLDER_NAME === 'undefined' ||
    !String(CONSULTATION_CARD_FOLDER_NAME || '').trim()
  )
    ? 'MUPHÉ 客戶水晶分析表'
    : String(CONSULTATION_CARD_FOLDER_NAME).trim();
  const folders = DriveApp.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  }

  return DriveApp.createFolder(folderName);
}

function buildConsultationCardArchiveFileName(options) {
  const publicFields = options.publicFields || {};
  const displayName = sanitizeDriveFileName(publicFields.displayName || '客戶');
  const accessCode = sanitizeDriveFileName(options.accessCode || options.profileId || 'ANALYSIS');
  return accessCode + '_' + displayName + '_水晶分析表.html';
}

function sanitizeDriveFileName(value) {
  const text = String(value || '').trim().replace(/[\\/:*?"<>|#%{}~&]/g, '-');
  return text.substring(0, 80) || 'card';
}

function buildConsultationCardArchiveHtml(options) {
  const publicFields = options.publicFields || {};
  const title = publicFields.braceletName || '水晶狀態分析表';
  const crystals = publicFields.crystals || [];
  const energyFocus = publicFields.energyFocus || [];
  const chakraFocus = publicFields.chakraFocus || [];
  const calculationNotes = splitPublicListValue(publicFields.designNotes || '');
  const wearingGuide = publicFields.wearingGuide || [];
  const careInstructions = publicFields.careInstructions || [];
  const ritual = publicFields.ritual || [];
  const makerNote = publicFields.makerNote ? [publicFields.makerNote] : [];

  return [
    '<!doctype html>',
    '<html lang="zh-Hant">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex">',
    '<title>' + escapeHtml(title) + '</title>',
    '<style>',
    'body{margin:0;background:#f7f0e4;color:#241a2b;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.75;padding:24px;}',
    '.card{background:#fffaf0;border:1px solid rgba(36,26,43,.12);border-radius:8px;box-shadow:0 22px 70px rgba(36,26,43,.14);margin:0 auto;max-width:760px;padding:34px;}',
    '.brand{color:#1f6f67;font-weight:900;margin:0 0 18px;}',
    'h1{font-size:clamp(2rem,7vw,3.2rem);line-height:1.08;margin:0 0 10px;}',
    'h2{font-size:1.15rem;margin:0 0 10px;}',
    'section{border-top:1px solid rgba(36,26,43,.12);padding-top:18px;margin-top:18px;}',
    'p{color:#756c76;margin:0;}',
    '.report{display:grid;gap:12px;}',
    '.report h3{color:#4b2d5f;font-size:1.05rem;margin:0;}',
    '.report p{white-space:pre-wrap;}',
    'ul{color:#756c76;margin:0;padding-left:1.2em;}',
    '.tags{display:flex;flex-wrap:wrap;gap:8px;}',
    '.tags span{border:1px solid rgba(75,45,95,.2);border-radius:999px;color:#4b2d5f;font-weight:800;padding:6px 10px;}',
    '.code{background:#241a2b;border-radius:8px;color:#fffaf0;display:inline-block;font-weight:900;margin-top:12px;padding:8px 12px;}',
    '</style>',
    '</head>',
    '<body>',
    '<main class="card">',
    '<p class="brand">MUPHÉ Handmade 沐菲手作水晶</p>',
    '<h1>' + escapeHtml(title) + '</h1>',
    '<p class="code">分析表密碼：' + escapeHtml(options.accessCode || '') + '</p>',
    options.profileUrl ? '<p style="margin-top:10px;">查詢連結：' + escapeHtml(options.profileUrl) + '</p>' : '',
    renderArchiveSection('您的專屬水晶能量初步評估', renderArchiveReport(publicFields.summary)),
    publicFields.summary ? '' : renderArchiveSection('目前最需要照顧的狀態', renderArchiveTags(energyFocus.concat(chakraFocus))),
    publicFields.summary ? '' : renderArchiveSection('沐菲初步推薦方向', renderArchiveList(crystals)),
    publicFields.summary ? '' : renderArchiveSection('計算方式', renderArchiveList(calculationNotes)),
    renderArchiveSection('配戴與日常提醒', renderArchiveList(wearingGuide)),
    renderArchiveSection('保養與淨化', renderArchiveList(careInstructions)),
    renderArchiveSection('小儀式', renderArchiveList(ritual)),
    renderArchiveSection('沐菲貼心語', renderArchiveList(makerNote)),
    '</main>',
    '</body>',
    '</html>'
  ].join('');
}

function renderArchiveReport(text) {
  const report = String(text || '').trim();
  if (!report) {
    return '';
  }

  return '<div class="report">' + report
    .split(/\n{2,}/)
    .map(function(block) {
      const cleanBlock = block.trim();
      if (!cleanBlock) {
        return '';
      }
      if (/^(?:🔮|📿|🧘|💬)\s*【[^】]+】/.test(cleanBlock)) {
        const lines = cleanBlock.split(/\n/);
        return '<div><h3>' + escapeHtml(lines.shift()) + '</h3>' + (lines.length ? '<p>' + escapeHtml(lines.join('\n')) + '</p>' : '') + '</div>';
      }
      return '<p>' + escapeHtml(cleanBlock) + '</p>';
    })
    .join('') + '</div>';
}

function renderArchiveSection(title, bodyHtml) {
  if (!bodyHtml) {
    return '';
  }

  return '<section><h2>' + escapeHtml(title) + '</h2>' + bodyHtml + '</section>';
}

function renderArchiveList(items) {
  if (!items || !items.length) {
    return '';
  }

  return '<ul>' + items.map(function(item) {
    return '<li>' + escapeHtml(item) + '</li>';
  }).join('') + '</ul>';
}

function renderArchiveTags(items) {
  if (!items || !items.length) {
    return '';
  }

  return '<div class="tags">' + items.map(function(item) {
    return '<span>' + escapeHtml(item) + '</span>';
  }).join('') + '</div>';
}

/**
 * 整理諮詢分析表的公開欄位。
 * @param {Object} data - 諮詢表單資料
 * @param {string} recommendation - AI/規則初步推薦
 * @param {string} accessCode - 查詢密碼
 * @returns {Object} 公開欄位
 */
function buildConsultationCardPublicFields(data, recommendation, accessCode) {
  const displayName = sanitizePublicDisplayName(data && data.name);
  const themes = deriveConsultationThemes(data, recommendation);
  const crystalItems = extractPublicCrystalItems(recommendation);
  const calculationNotes = buildPublicCalculationNotes(data);
  const firstTheme = themes[0] || '能量平衡';
  const secondTheme = themes[1] || '情緒安定';

  return {
    displayName: displayName,
    braceletName: (displayName ? displayName : '你') + '的水晶狀態分析表',
    scene: '水晶諮詢分析表',
    summary: buildPublicAnalysisReportText(recommendation),
    crystals: crystalItems,
    energyFocus: themes,
    chakraFocus: buildPublicChakraFocus(data),
    designNotes: calculationNotes.join('\n'),
    wearingGuide: [
      '需要面對' + firstTheme + '相關場景時，先深呼吸三次，再把手鍊戴上，提醒自己把注意力收回身上。',
      '若今天特別疲憊，睡前可把手鍊放在掌心 30 秒，對自己說一句「我允許自己慢慢放鬆」。',
      '後續討論客製時，可直接提供這組分析表密碼：' + accessCode
    ],
    careInstructions: [
      '日常避免碰撞、泡水、香水與清潔劑。',
      '可用白水晶碎石、月光或靜置方式做溫和淨化。',
      '若配戴後想調整色系或能量方向，歡迎再與沐菲討論。'
    ],
    ritual: [
      '今天出門前，選一個想切換的狀態，讓手鍊成為提醒自己的小錨點。',
      '遇到人際或情緒拉扯時，摸一下珠子，先問自己：「我現在真正需要的是什麼？」'
    ],
    makerNote: getCaringMessage(normalizeListValue(data && data.energyGoal))
  };
}

function buildPublicAnalysisReportText(recommendation) {
  const report = sanitizePublicAnalysisText(recommendation);
  if (report) {
    return report;
  }

  return '🔮 【多維度精密能量評估報告】\n沐菲已收到你的狀態資料，會依照你填寫的目標、色系與能量分析模組，整理適合後續客製討論的水晶方向。\n\n💬 【暖心陪伴語】\n每一次想更了解自己，都是一個很溫柔的開始。';
}

function sanitizePublicAnalysisText(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value)
    .replace(/（本地規則\s*Fallback\s*生成）/g, '')
    .replace(/\(本地規則\s*Fallback\s*生成\)/g, '')
    .replace(/【基本資料】[:：][^\n]*(?:\n|$)/g, '')
    .replace(/-\s*淨手圍為[^\n]*/g, '- 手鍊會依你提供的尺寸精準定制穿線。')
    .split(/\r?\n/)
    .map(function(line) {
      return sanitizePublicText(line).trim();
    })
    .filter(function(line) {
      return line !== '';
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 依客戶勾選的分析模組，建立公開可看的計算說明。
 * 不公開完整生日，只顯示必要的推算結果、判定方式與對應晶種。
 * @param {Object} data - 諮詢表單資料
 * @returns {Array<string>} 公開計算說明
 */
function buildPublicCalculationNotes(data) {
  const notes = [];

  if (isCalculationMethodEnabled(data, '生命靈數')) {
    notes.push(buildPublicLifePathCalculationNote(data));
  }

  if (isCalculationMethodEnabled(data, '生辰五行')) {
    notes.push(buildPublicFiveElementsCalculationNote(data));
  }

  if (isCalculationMethodEnabled(data, '脈輪能量')) {
    notes.push(buildPublicChakraCalculationNote(data));
  }

  if (isCalculationMethodEnabled(data, '星座生肖')) {
    notes.push(buildPublicZodiacCalculationNote(data));
  }

  if (!notes.length) {
    notes.push('建議先從最想被照顧的狀態出發，再由沐菲依色系、晶種能量與配戴習慣微調成真正適合你的客製手鍊。');
  }

  return notes.filter(Boolean);
}

function isCalculationMethodEnabled(data, methodName) {
  const value = data && data.calculationMethod;
  if (Array.isArray(value)) {
    return value.indexOf(methodName) !== -1;
  }
  return String(value || '').indexOf(methodName) !== -1;
}

function buildPublicLifePathCalculationNote(data) {
  const lifePath = calculatePublicLifePath(data && data.birthDate);

  if (!lifePath) {
    return '生命靈數：尚未取得有效日期，先以你填寫的狀態需求與其他分析方式整理水晶方向。';
  }

  const crystalInfo = getLifePathCrystalInfo(lifePath.number);
  return '生命靈數：以表單日期數字逐位相加，總和 ' + lifePath.firstSum + '，化約 ' + lifePath.reductionText + '，得到生命靈數 ' + lifePath.number + '。推薦水晶：' + crystalInfo.name + '，' + crystalInfo.desc + '。';
}

function buildPublicFiveElementsCalculationNote(data) {
  const birthDate = data && data.birthDate;
  const fiveElements = getPublicFiveElements(birthDate);

  if (!birthDate) {
    return '生辰五行：尚未取得有效日期，先以整體能量平衡整理五行方向。推薦水晶：白水晶、茶晶，協助穩定與淨化。';
  }

  const crystalInfo = getFiveElementCrystalInfo(fiveElements.deficiency);
  return '生辰五行：依表單日期判定出生季節，不公開完整生日，判定為' + fiveElements.season + '能量，建議補' + fiveElements.deficiency + '。推薦水晶：' + crystalInfo.name + '，' + crystalInfo.desc + '。';
}

function buildPublicChakraCalculationNote(data) {
  const chakras = splitPublicListValue(normalizeListValue(data && data.targetChakra))
    .map(sanitizePublicText)
    .filter(Boolean);

  if (!chakras.length) {
    const crystalInfo = getChakraCrystalInfo('');
    return '脈輪能量：未勾選特定脈輪，先以整體身心能量調和為主。推薦水晶：' + crystalInfo.name + '，' + crystalInfo.desc + '。';
  }

  const pairs = chakras.slice(0, 4).map(function(chakra) {
    const crystalInfo = getChakraCrystalInfo(chakra);
    return chakra + '對應' + crystalInfo.name;
  });

  return '脈輪能量：依你勾選的脈輪需求整理後天調和方向，' + pairs.join('，') + '。';
}

function buildPublicZodiacCalculationNote(data) {
  const birthDate = data && data.birthDate;

  if (!birthDate) {
    return '星座生肖：尚未取得有效日期，先以白水晶作為整體守護與能量放大。';
  }

  const zodiacSign = getPublicZodiacSign(birthDate);
  const chineseZodiac = getPublicChineseZodiac(birthDate);
  const zodiacCrystal = getZodiacCrystalInfo(zodiacSign);
  const chineseCrystal = getChineseZodiacCrystalInfo(chineseZodiac);

  return '星座生肖：依表單日期推算星座與生肖，不公開出生年月日，西方星座為' + zodiacSign + '，對應幸運石' + zodiacCrystal + '，東方生肖為' + chineseZodiac + '，對應守護晶' + chineseCrystal + '。';
}

function calculatePublicLifePath(birthDateStr) {
  const clean = String(birthDateStr || '').replace(/[^0-9]/g, '');
  if (!clean) {
    return null;
  }

  let sum = 0;
  for (let i = 0; i < clean.length; i++) {
    sum += parseInt(clean[i], 10);
  }

  const firstSum = sum;
  const reductions = [];
  while (sum > 9) {
    const digits = String(sum).split('');
    const nextSum = digits.reduce(function(total, digit) {
      return total + parseInt(digit, 10);
    }, 0);
    reductions.push(digits.join('+') + '=' + nextSum);
    sum = nextSum;
  }

  return {
    number: sum,
    firstSum: firstSum,
    reductionText: reductions.length ? reductions.join(' -> ') : '已是個位數',
  };
}

function getLifePathCrystalInfo(number) {
  const map = {
    1: { name: '黑曜石、黑髮晶', desc: '補充海底輪能量，增強踏實感與開創魄力' },
    2: { name: '橙月光石、太陽石', desc: '疏通臍輪，增添情緒包容力與協調溫和氣場' },
    3: { name: '黃水晶、金髮晶', desc: '補足太陽神經叢，提振思維邏輯與積極社交創造力' },
    4: { name: '綠幽靈、葡萄石', desc: '滋養心輪，帶來務實安穩的能量與事業正財緣' },
    5: { name: '海藍寶、天河石', desc: '強化喉輪，使言語表達流暢、緩解緊繃情緒' },
    6: { name: '粉水晶、草莓晶', desc: '敞開心輪，招來良緣，學會善待與療癒自己' },
    7: { name: '青金石、紫水晶', desc: '開啟眉心輪，明晰直覺，消除思慮過多的焦慮' },
    8: { name: '鈦晶、金太陽石', desc: '振奮太陽神經叢與海底輪，帶來決策霸氣與財富格局' },
    9: { name: '白水晶、舒俱徠石', desc: '激發頂輪高維能量，放大整體磁場與靈性感知' }
  };

  return map[number] || { name: '白水晶', desc: '協助淨化與放大整體能量' };
}

function getPublicFiveElements(birthDateStr) {
  if (typeof calculateFiveElements === 'function') {
    return calculateFiveElements(birthDateStr);
  }

  const month = parseInt(String(birthDateStr || '').split('-')[1], 10);
  if (month >= 2 && month <= 4) {
    return { season: '春季', deficiency: '金、土' };
  }
  if (month >= 5 && month <= 7) {
    return { season: '夏季', deficiency: '水、金' };
  }
  if (month >= 8 && month <= 10) {
    return { season: '秋季', deficiency: '木、火' };
  }
  return { season: '冬季', deficiency: '火、土' };
}

function getFiveElementCrystalInfo(deficiency) {
  const map = {
    '金、土': { name: '白水晶(金) + 黃水晶(土)', desc: '以土生金，補充先天缺失，穩固財庫與事業底氣' },
    '水、金': { name: '海藍寶(水) + 白水晶(金)', desc: '金生水起，消除燥熱火氣，化解工作與溝通阻礙' },
    '木、火': { name: '綠幽靈(木) + 金太陽石(火)', desc: '木生火旺，增強正財運勢與工作執行魄力' },
    '火、土': { name: '紅紋石(火) + 茶晶(土)', desc: '火生土燥，帶來溫暖活力與踏實守財能量' }
  };

  return map[deficiency] || { name: '白水晶 + 茶晶', desc: '協助淨化、穩定與整體能量調和' };
}

function getChakraCrystalInfo(chakra) {
  const map = {
    '海底輪': { name: '黑曜石、茶晶', desc: '提供腳踏實地的穩定感與防護力' },
    '臍輪': { name: '橙月光石、太陽石', desc: '平衡情緒流動、人際互動與日常喜悅感' },
    '太陽神經叢': { name: '黃水晶、金髮晶', desc: '提升自信、意志力與行動能量' },
    '心輪': { name: '粉水晶、葡萄石', desc: '打開心房，協助愛自己、修復關係與柔和人緣' },
    '喉輪': { name: '海藍寶、天河石', desc: '支援溝通表達、說服力與思緒安定' },
    '眉心輪': { name: '青金石、紫水晶', desc: '幫助冷靜判斷、直覺覺察與專注思考' },
    '頂輪': { name: '白水晶、紫水晶', desc: '協助淨化磁場、放大智慧與高頻覺察' }
  };

  return map[chakra] || { name: '白水晶、茶晶', desc: '全維度身心能量調和' };
}

function getPublicZodiacSign(birthDateStr) {
  if (typeof calculateZodiacSign === 'function') {
    return calculateZodiacSign(birthDateStr);
  }
  return '雙魚座';
}

function getPublicChineseZodiac(birthDateStr) {
  if (typeof calculateChineseZodiac === 'function') {
    return calculateChineseZodiac(birthDateStr);
  }
  return '龍';
}

function getZodiacCrystalInfo(zodiacSign) {
  const map = {
    '牡羊座': '太陽石',
    '金牛座': '葡萄石',
    '雙子座': '天河石',
    '巨蟹座': '月光石',
    '獅子座': '鈦晶',
    '處女座': '紫水晶',
    '天秤座': '金髮晶',
    '天蠍座': '拉長石',
    '射手座': '青金石',
    '摩羯座': '茶晶',
    '水瓶座': '拉長石',
    '雙魚座': '海藍寶'
  };

  return map[zodiacSign] || '白水晶';
}

function getChineseZodiacCrystalInfo(chineseZodiac) {
  const map = {
    '鼠': '白水晶',
    '牛': '黃水晶',
    '虎': '綠幽靈',
    '兔': '藍砂石',
    '龍': '紅紋石',
    '蛇': '綠髮晶',
    '馬': '金太陽石',
    '羊': '紫水晶',
    '猴': '白水晶',
    '雞': '金髮晶',
    '狗': '茶晶',
    '豬': '藍碧璽'
  };

  return map[chineseZodiac] || '茶晶';
}

/**
 * 推出個人分析表的狀態主題。
 * @param {Object} data - 諮詢表單資料
 * @param {string} recommendation - AI/規則初步推薦
 * @returns {Array<string>} 主題
 */
function deriveConsultationThemes(data, recommendation) {
  const text = [
    normalizeListValue(data && data.energyGoal),
    data && data.description,
    normalizeListValue(data && data.targetChakra),
    recommendation
  ].join(' ');
  const themes = [];

  addThemeIfMatch(themes, text, /防小人|小人|界線|拒絕|負能量|守護|防護/, '界線守護');
  addThemeIfMatch(themes, text, /焦慮|失眠|睡|放鬆|沉澱|關機|安定|穩定/, '情緒安定');
  addThemeIfMatch(themes, text, /人際|關係|桃花|溝通|柔和|包容|心輪/, '人際柔和');
  addThemeIfMatch(themes, text, /職場|工作|事業|財|貴人|上台|自信/, '職場穩定');
  addThemeIfMatch(themes, text, /專注|考試|簡報|腦袋|思緒|清醒/, '專注清理');

  if (!themes.length) {
    themes.push('能量平衡', '情緒安定');
  }

  return themes.slice(0, 4);
}

function addThemeIfMatch(themes, text, regex, label) {
  if (regex.test(text) && themes.indexOf(label) === -1) {
    themes.push(label);
  }
}

/**
 * 取出公開可看的晶種搭配，不輸出原始個資段落。
 * @param {string} recommendation - AI/規則初步推薦
 * @returns {Array<string>} 晶種搭配
 */
function extractPublicCrystalItems(recommendation) {
  const text = String(recommendation || '');
  const items = [];
  const blockRegex = /【手[鍊鏈]\s*([^】]+)】([\s\S]*?)(?=\s*📿\s*【手[鍊鏈]|\s*🧘|\s*💬|$)/g;
  let match;

  while ((match = blockRegex.exec(text)) !== null && items.length < 3) {
    const title = sanitizePublicText(match[1])
      .replace(/^[A-ZＡ-Ｚ0-9一二三四五六七八九十]+\s*[—\-－]\s*/, '')
      .trim();
    const block = match[2] || '';
    const crystalMatch = block.match(/【水晶搭配】[:：]\s*([^\n【]+)/);
    const crystals = crystalMatch ? sanitizePublicText(crystalMatch[1]) : '';

    if (title && crystals) {
      items.push(clipPublicText(title + '：' + crystals, 120));
    }
  }

  if (!items.length) {
    const lineRegex = /【水晶搭配】[:：]\s*([^\n【]+)/g;
    while ((match = lineRegex.exec(text)) !== null && items.length < 3) {
      const crystals = sanitizePublicText(match[1]);
      if (crystals) {
        items.push(clipPublicText('推薦晶種：' + crystals, 120));
      }
    }
  }

  if (!items.length) {
    items.push('客製晶種搭配：由沐菲依你目前狀態整理最適合的水晶組合');
  }

  return items;
}

function buildPublicChakraFocus(data) {
  const values = splitPublicListValue(normalizeListValue(data && data.targetChakra))
    .map(sanitizePublicText)
    .filter(Boolean);
  return values.slice(0, 3);
}

/**
 * 建立可分享的手鍊檔案網址。
 * @param {string} accessCode - 查詢密碼
 * @returns {string} 網址
 */
function getBraceletProfileUrl(accessCode) {
  const storeUrl = String(typeof STORE_SITE_URL === 'undefined' ? '' : STORE_SITE_URL || '').trim();
  if (!storeUrl) {
    return '';
  }

  const cleanBase = storeUrl
    .replace(/[?#].*$/, '')
    .replace(/index\.html$/i, '')
    .replace(/\/?$/, '/');
  return cleanBase + 'bracelet.html?code=' + encodeURIComponent(accessCode);
}

function sanitizePublicDisplayName(value) {
  return clipPublicText(sanitizePublicText(value).replace(/\s+/g, ''), 24);
}

/**
 * 移除個人分析表不應出現的個資片段。
 * @param {*} value - 原始文字
 * @returns {string} 清理後文字
 */
function sanitizePublicText(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
    .replace(/(\+?886[-\s]?)?0?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/g, '')
    .replace(/\b\d{4}[\/.-]\d{1,2}[\/.-]\d{1,2}\b/g, '')
    .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, '')
    .replace(/(聯絡方式|生日|出生日期|出生時間|性別|淨手圍|手圍|預算範圍|預算)[:：][^；。\n]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function clipPublicText(value, maxLength) {
  const text = String(value || '').trim();
  if (!maxLength || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 1).trim() + '…';
}

/**
 * 檢查查詢碼是否已存在。
 * @param {Sheet} sheet - 手鍊檔案工作表
 * @param {string} accessCode - 查詢碼
 * @returns {boolean} 是否存在
 */
function braceletAccessCodeExists(sheet, accessCode) {
  const normalizedCode = normalizeBraceletAccessCode(accessCode);
  const lastRow = sheet.getLastRow();
  if (!normalizedCode || lastRow <= 1) {
    return false;
  }

  const values = sheet
    .getRange(2, BRACELET_PROFILE_COLUMNS.ACCESS_CODE, lastRow - 1, 1)
    .getDisplayValues();

  return values.some(function(row) {
    return normalizeBraceletAccessCode(row[0]) === normalizedCode;
  });
}

/**
 * 產生一段容易人工讀取的短碼，排除 I/O/1/0 等易混淆字元。
 * @param {number} length - 長度
 * @returns {string} 短碼片段
 */
function generateReadableCodeSegment(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let segment = '';
  for (let i = 0; i < length; i++) {
    segment += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return segment;
}

/**
 * 正規化 action 參數。
 * @param {*} value - 原始 action
 * @returns {string} 正規化 action
 */
function normalizeRequestAction(value) {
  return normalizeHalfWidthText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * 正規化手鍊查詢碼；忽略大小寫、空白與連字號等分隔符。
 * @param {*} value - 原始查詢碼
 * @returns {string} 正規化查詢碼
 */
function normalizeBraceletAccessCode(value) {
  return normalizeHalfWidthText(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * 正規化 token；保留大小寫，只移除意外輸入的空白。
 * @param {*} value - 原始 token
 * @returns {string} 正規化 token
 */
function normalizeBraceletAccessToken(value) {
  return normalizeHalfWidthText(value).trim().replace(/\s+/g, '');
}

/**
 * 正規化找回密碼用姓名；忽略空白與大小寫。
 * @param {*} value - 原始姓名
 * @returns {string} 正規化姓名
 */
function normalizeCustomerLookupName(value) {
  return normalizeHalfWidthText(value).trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * 正規化找回密碼用生日；只保留年月日 8 碼。
 * @param {*} value - 原始生日
 * @returns {string} yyyyMMdd
 */
function normalizeLookupBirthDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyyMMdd');
  }

  const text = normalizeHalfWidthText(value).trim();
  const digits = text.replace(/[^0-9]/g, '');
  if (digits.length === 8) {
    return digits;
  }

  const parsedDate = new Date(text);
  if (!isNaN(parsedDate.getTime())) {
    return Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), 'yyyyMMdd');
  }

  return '';
}

/**
 * 將全形英數符號轉成半形，讓人工輸入的查詢碼更穩定。
 * @param {*} value - 原始文字
 * @returns {string} 半形文字
 */
function normalizeHalfWidthText(value) {
  return String(value === null || typeof value === 'undefined' ? '' : value)
    .replace(/[！-～]/g, function(character) {
      return String.fromCharCode(character.charCodeAt(0) - 0xFEE0);
    })
    .replace(/　/g, ' ');
}

/**
 * 限制查詢字串長度，避免異常長輸入造成不必要處理。
 * @param {string} accessCode - 正規化查詢碼
 * @param {string} accessToken - 正規化 token
 * @returns {boolean} 是否允許
 */
function isBraceletLookupLengthAllowed(accessCode, accessToken) {
  return (!accessCode || accessCode.length <= 64) && (!accessToken || accessToken.length <= 128);
}

/**
 * 判斷手鍊檔案是否公開。
 * @param {Array} row - 工作表列資料
 * @returns {boolean} 是否公開
 */
function isBraceletProfilePublished(row) {
  const value = getBraceletProfileCell(row, BRACELET_PROFILE_COLUMNS.PUBLISHED).toLowerCase();
  return [
    '1',
    'true',
    'yes',
    'y',
    'published',
    'publish',
    '公開',
    '已公開',
    '已發布',
    '上架'
  ].indexOf(value) !== -1;
}

/**
 * 取得手鍊檔案欄位文字。
 * @param {Array} row - 工作表列資料
 * @param {number} columnIndex - 1-indexed 欄位位置
 * @returns {string} 欄位文字
 */
function getBraceletProfileCell(row, columnIndex) {
  return String(row[columnIndex - 1] || '').trim();
}

/**
 * 將公開列表欄位轉成陣列。
 * @param {string} value - 原始欄位文字
 * @returns {Array} 清理後列表
 */
function splitPublicListValue(value) {
  const text = String(value || '').trim();
  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n|[,，、;；]/)
    .map(function(item) {
      return item.trim();
    })
    .filter(function(item) {
      return item !== '';
    });
}

/**
 * 建立 JSON 或 JSONP TextOutput。
 * Apps Script ContentService 無法設定自訂 CORS header；JSONP callback 可支援跨網域瀏覽器讀取。
 * @param {Object} e - Web App 事件
 * @param {Object} payload - 回應內容
 * @returns {TextOutput} 文字回應
 */
function createJsonTextOutput(e, payload) {
  const callback = getRequestParameter(e, 'callback') || getRequestParameter(e, 'jsonp');
  if (callback) {
    const safeCallback = normalizeJsonpCallback(callback);
    if (!safeCallback) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: {
            code: 'invalid_callback',
            message: 'JSONP callback 名稱不正確'
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(safeCallback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * JSONP callback 名稱白名單驗證。
 * @param {*} value - 原始 callback
 * @returns {string} 合法 callback；不合法回傳空字串
 */
function normalizeJsonpCallback(value) {
  const callback = String(value || '').trim();
  if (/^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback)) {
    return callback;
  }
  return '';
}

/**
 * 取得單一請求參數。
 * @param {Object} e - Web App 事件
 * @param {string} name - 參數名稱
 * @returns {string} 參數值
 */
function getRequestParameter(e, name) {
  if (!e || !e.parameter || typeof e.parameter[name] === 'undefined') {
    return '';
  }

  const value = e.parameter[name];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

/**
 * API 時間格式。
 * @param {Date} date - 日期
 * @returns {string} 格式化時間
 */
function formatApiTimestamp(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
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
      preference: getFirstValue(responses['配戴習慣']) || '手鍊/手環',
      wristSize: getFirstValue(responses['淨手圍']),
      colorPreference: getArrayValue(responses['偏好色系']),
      energyGoal: getArrayValue(responses['期望目標']),
      calculationMethod: getArrayValue(responses['分析方法']),
      targetChakra: getArrayValue(responses['目標脈輪']),
      designBraceletSelection: getArrayValue(responses['想設計手鍊']),
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
    const designBraceletSelectionStr = normalizeDesignBraceletSelection(data.designBraceletSelection || data.designBracelets);

    // 步驟 4：組建資料列
    const rowData = [
      timestamp,                              // 1. A 欄 — 時間戳記
      data.name || '',                        // 2. B 欄 — 客人姓名
      data.contact || '',                     // 3. C 欄 — 聯絡方式
      data.gender || '',                      // 4. D 欄 — 性別
      data.birthDate || '',                   // 5. E 欄 — 出生日期
      data.birthTime || '',                   // 6. F 欄 — 出生時間
      data.preference || '手鍊/手環',          // 7. G 欄 — 配戴習慣
      data.wristSize || '',                   // 8. H 欄 — 淨手圍
      colorPreferenceStr,                     // 9. I 欄 — 偏好色系
      energyGoalStr,                          // 10. J 欄 — 期望目標
      calculationMethodStr,                   // 11. K 欄 — 分析方法
      targetChakraStr,                        // 12. L 欄 — 目標脈輪
      data.description || '',                 // 13. M 欄 — 狀態描述
      data.budget || '',                      // 14. N 欄 — 預算範圍
      recommendation,                         // 15. O 欄 — AI初步推薦（自動）
      DEFAULT_STATUS,                         // 16. P 欄 — 處理狀態（預設「未處理」）
      '',                                     // 17. Q 欄 — 備註紀錄（空白）
      designBraceletSelectionStr              // 18. R 欄 — 想設計手鍊
    ];

    // 步驟 5：寫入試算表與個人分析表；CSV mirror 預設停用以降低 Drive 操作量
    const writeResult = withScriptLock(function() {
      sheet.appendRow(rowData);
      const consultationRow = sheet.getLastRow();
      const profileResult = appendConsultationCardProfile(data, recommendation, timestamp, consultationRow);
      const evaluationResult = appendAnalysisEvaluationRecord(data, recommendation, timestamp, consultationRow, profileResult);
      try {
        SpreadsheetApp.flush();
        return {
          csvUrl: syncCsvMirrorFromSheet(sheet),
          profile: profileResult,
          evaluation: evaluationResult
        };
      } catch (csvError) {
        console.error('【CSV 同步失敗】' + csvError.toString());
        return {
          csvUrl: '',
          profile: profileResult,
          evaluation: evaluationResult
        };
      }
    });
    console.log('【資料寫入】✅ 已寫入新資料：' + data.name);
    if (writeResult.csvUrl) {
      console.log('【CSV 同步】✅ 已更新：' + writeResult.csvUrl);
    }
    if (writeResult.profile && writeResult.profile.accessCode) {
      console.log('【個人分析表】✅ 已建立查詢密碼：' + writeResult.profile.accessCode);
    }
    if (writeResult.evaluation && writeResult.evaluation.accessCode) {
      console.log('【分析評估表】✅ 已保存初步評估全文：' + writeResult.evaluation.accessCode);
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
      csvUrl: writeResult.csvUrl || '',
      name: data.name || '',
      accessCode: writeResult.profile ? writeResult.profile.accessCode : '',
      profileUrl: writeResult.profile ? writeResult.profile.profileUrl : ''
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
  const postMessagePayload = options.postMessagePayload || {
    app: 'muphe-submission',
    type: 'submission',
    success: !options.isError,
    message: options.message || '',
    reference: options.reference || ''
  };
  const postMessageJson = JSON.stringify(postMessagePayload).replace(/</g, '\\u003c');
  const postMessageScript = [
    '<script>',
    '(function(){',
    'var payload=' + postMessageJson + ';',
    'try{',
    'if(window.parent&&window.parent!==window){window.parent.postMessage(payload,"*");}',
    'if(window.top&&window.top!==window){window.top.postMessage(payload,"*");}',
    'if(window.opener){window.opener.postMessage(payload,"*");}',
    '}catch(error){}',
    '})();',
    '<\/script>'
  ].join('');

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
    postMessageScript,
    '</body>',
    '</html>'
  ].join('');

  return HtmlService
    .createHtmlOutput(html)
    .setTitle(options.title || 'MUPHÉ Handmade')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
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
  widths[COLUMNS.DESIGN_BRACELETS] = 260;
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

/**
 * 手鍊公開檔案工作表欄寬。
 */
function getBraceletProfileColumnWidths() {
  const widths = {};
  widths[BRACELET_PROFILE_COLUMNS.CREATED_AT] = 150;
  widths[BRACELET_PROFILE_COLUMNS.UPDATED_AT] = 150;
  widths[BRACELET_PROFILE_COLUMNS.PROFILE_ID] = 150;
  widths[BRACELET_PROFILE_COLUMNS.ACCESS_CODE] = 150;
  widths[BRACELET_PROFILE_COLUMNS.ACCESS_TOKEN] = 320;
  widths[BRACELET_PROFILE_COLUMNS.PUBLISHED] = 90;
  widths[BRACELET_PROFILE_COLUMNS.DISPLAY_NAME] = 140;
  widths[BRACELET_PROFILE_COLUMNS.BRACELET_NAME] = 160;
  widths[BRACELET_PROFILE_COLUMNS.SCENE] = 140;
  widths[BRACELET_PROFILE_COLUMNS.SUMMARY] = 280;
  widths[BRACELET_PROFILE_COLUMNS.CRYSTALS] = 220;
  widths[BRACELET_PROFILE_COLUMNS.ENERGY_FOCUS] = 220;
  widths[BRACELET_PROFILE_COLUMNS.CHAKRA_FOCUS] = 180;
  widths[BRACELET_PROFILE_COLUMNS.DESIGN_NOTES] = 320;
  widths[BRACELET_PROFILE_COLUMNS.WEARING_GUIDE] = 260;
  widths[BRACELET_PROFILE_COLUMNS.CARE_INSTRUCTIONS] = 260;
  widths[BRACELET_PROFILE_COLUMNS.RITUAL_TEXT] = 260;
  widths[BRACELET_PROFILE_COLUMNS.MAKER_NOTE] = 260;
  widths[BRACELET_PROFILE_COLUMNS.IMAGE_URL] = 260;
  widths[BRACELET_PROFILE_COLUMNS.PRODUCT_URL] = 260;
  widths[BRACELET_PROFILE_COLUMNS.PUBLISHED_AT] = 150;
  widths[BRACELET_PROFILE_COLUMNS.INTERNAL_NOTES] = 260;
  return widths;
}

/**
 * 分析評估表工作表欄寬。
 */
function getAnalysisEvaluationColumnWidths() {
  const widths = {};
  widths[ANALYSIS_EVALUATION_COLUMNS.CREATED_AT] = 150;
  widths[ANALYSIS_EVALUATION_COLUMNS.UPDATED_AT] = 150;
  widths[ANALYSIS_EVALUATION_COLUMNS.EVALUATION_ID] = 210;
  widths[ANALYSIS_EVALUATION_COLUMNS.ACCESS_CODE] = 150;
  widths[ANALYSIS_EVALUATION_COLUMNS.PROFILE_ID] = 150;
  widths[ANALYSIS_EVALUATION_COLUMNS.CUSTOMER_NAME] = 120;
  widths[ANALYSIS_EVALUATION_COLUMNS.CONTACT] = 180;
  widths[ANALYSIS_EVALUATION_COLUMNS.GENDER] = 90;
  widths[ANALYSIS_EVALUATION_COLUMNS.BIRTH_DATE] = 120;
  widths[ANALYSIS_EVALUATION_COLUMNS.BIRTH_TIME] = 120;
  widths[ANALYSIS_EVALUATION_COLUMNS.CALCULATION_METHOD] = 220;
  widths[ANALYSIS_EVALUATION_COLUMNS.ENERGY_GOAL] = 240;
  widths[ANALYSIS_EVALUATION_COLUMNS.TARGET_CHAKRA] = 180;
  widths[ANALYSIS_EVALUATION_COLUMNS.COLOR_PREFERENCE] = 180;
  widths[ANALYSIS_EVALUATION_COLUMNS.WRIST_SIZE] = 110;
  widths[ANALYSIS_EVALUATION_COLUMNS.BUDGET] = 120;
  widths[ANALYSIS_EVALUATION_COLUMNS.DESCRIPTION] = 320;
  widths[ANALYSIS_EVALUATION_COLUMNS.RECOMMENDATION_TEXT] = 520;
  widths[ANALYSIS_EVALUATION_COLUMNS.PROFILE_URL] = 260;
  widths[ANALYSIS_EVALUATION_COLUMNS.CONSULTATION_ROW] = 120;
  widths[ANALYSIS_EVALUATION_COLUMNS.INTERNAL_NOTES] = 260;
  widths[ANALYSIS_EVALUATION_COLUMNS.DESIGN_BRACELETS] = 260;
  return widths;
}

/**
 * 水晶成本工作表欄寬。
 */
function getCrystalCostColumnWidths() {
  const widths = {};
  widths[CRYSTAL_COST_COLUMNS.CRYSTAL_NAME] = 150;
  widths[CRYSTAL_COST_COLUMNS.SIZE_MM] = 90;
  widths[CRYSTAL_COST_COLUMNS.UNIT_COST] = 110;
  widths[CRYSTAL_COST_COLUMNS.CURRENCY] = 70;
  widths[CRYSTAL_COST_COLUMNS.COLOR_FAMILY] = 100;
  widths[CRYSTAL_COST_COLUMNS.SOURCE_IMAGE] = 190;
  widths[CRYSTAL_COST_COLUMNS.VERIFY_STATUS] = 110;
  widths[CRYSTAL_COST_COLUMNS.NOTES] = 300;
  widths[CRYSTAL_COST_COLUMNS.UPDATED_AT] = 150;
  return widths;
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
    } else {
      const lastColumn = sheet.getLastColumn();
      if (lastColumn < headers.length) {
        const missingHeaders = headers.slice(lastColumn);
        sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
        const appendedHeaderRange = sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length);
        appendedHeaderRange.setFontWeight('bold');
        appendedHeaderRange.setBackground('#E8D5F5');
        appendedHeaderRange.setHorizontalAlignment('center');
        Object.keys(widths).forEach(function(columnIndex) {
          if (Number(columnIndex) > lastColumn) {
            sheet.setColumnWidth(Number(columnIndex), widths[columnIndex]);
          }
        });
        console.log('【工作表】✅ 已補上新增欄位：' + targetSheetName + '，新增 ' + missingHeaders.join('、'));
      }
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
    const braceletProfileSheet = getOrCreateSheet(
      BRACELET_PROFILE_SHEET_NAME,
      BRACELET_PROFILE_HEADER_ROW,
      getBraceletProfileColumnWidths()
    );
    const analysisEvaluationSheet = getOrCreateSheet(
      ANALYSIS_EVALUATION_SHEET_NAME,
      ANALYSIS_EVALUATION_HEADER_ROW,
      getAnalysisEvaluationColumnWidths()
    );
    const crystalCostResult = initializeCrystalCostSheet();
    const csvUrl = syncCsvMirrorWithLock(sheet);
    console.log('✅ 試算表初始化完成！');
    console.log('  諮詢工作表名稱：' + sheet.getName());
    console.log('  訂單工作表名稱：' + orderSheet.getName());
    console.log('  手鍊公開檔案工作表名稱：' + braceletProfileSheet.getName());
    console.log('  分析評估表工作表名稱：' + analysisEvaluationSheet.getName());
    console.log('  水晶成本工作表名稱：' + crystalCostResult.sheetName + '，資料筆數：' + crystalCostResult.rowCount);
    console.log('  諮詢欄位數量：' + HEADER_ROW.length);
    console.log('  訂單欄位數量：' + ORDER_HEADER_ROW.length);
    console.log('  手鍊公開檔案欄位數量：' + BRACELET_PROFILE_HEADER_ROW.length);
    console.log('  分析評估表欄位數量：' + ANALYSIS_EVALUATION_HEADER_ROW.length);
    console.log('  水晶成本欄位數量：' + CRYSTAL_COST_HEADER_ROW.length);
    
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
          preference: sheet.getRange(row, COLUMNS.PREFERENCE).getValue() || '手鍊/手環',
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

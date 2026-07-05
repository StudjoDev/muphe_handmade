/**
 * ============================================================
 *  水晶能量專屬諮詢系統 — 全域設定檔
 *  Crystal Energy Consultation System — Configuration
 * ============================================================
 *  說明：
 *  此檔案集中管理所有系統設定，包含 Google Sheets ID、
 *  LINE Messaging API 認證資訊等。部署前請務必更新以下設定值。
 * ============================================================
 */

// ============================
// 📊 Google Sheets 設定
// ============================

/** Google 試算表 ID（從試算表網址中取得） */
const SPREADSHEET_ID = '11SDppP_22QDU2ZvgcouUwVyraRlgwdvhaCOrruvcp1I';

/** 工作表名稱（試算表下方的分頁名稱） */
const SHEET_NAME = '諮詢紀錄';

/** 訂單工作表名稱 */
const ORDER_SHEET_NAME = 'Orders';

/** 手鍊公開檔案工作表名稱 */
const BRACELET_PROFILE_SHEET_NAME = '手鍊檔案';

/** 分析評估全文工作表名稱 */
const ANALYSIS_EVALUATION_SHEET_NAME = '分析評估表';

/** 水晶成本工作表名稱 */
const CRYSTAL_COST_SHEET_NAME = '水晶成本';

/** 是否將每張客戶個人圖卡同步保存到 Google Drive 後台資料夾 */
const CONSULTATION_CARD_ARCHIVE_ENABLED = true;

/**
 * 客戶圖卡 Google Drive 資料夾 ID
 * - 留空：自動建立或使用同名資料夾
 * - 填入資料夾 ID：保存到指定後台資料夾
 */
const CONSULTATION_CARD_FOLDER_ID = '';

/** 自動建立資料夾時使用的名稱 */
const CONSULTATION_CARD_FOLDER_NAME = 'MUPHÉ 客戶水晶圖卡';

/** 店主通知 Email；留空時嘗試使用 Apps Script 執行帳號 Email */
const OWNER_EMAIL = 'muphe.handmade@gmail.com';

/** 成功頁返回網站的網址 */
const STORE_SITE_URL = 'https://studjodev.github.io/muphe_handmade/index.html';

// ============================
// 🧾 CSV 備份設定
// ============================

/** 是否在每次送出後，同步更新同一份 CSV 紀錄檔 */
const CSV_MIRROR_ENABLED = false;

/** CSV 檔案名稱（會在 Google Drive 中建立或更新同名檔案） */
const CSV_FILE_NAME = 'muphe_crystal_consultation_records.csv';

/**
 * CSV 存放資料夾 ID
 * - 留空：建立在 Apps Script 執行帳號的 Google Drive 根目錄
 * - 填入資料夾 ID：建立在指定資料夾中
 */
const CSV_FOLDER_ID = '';

// ============================
// 💬 LINE Messaging API 設定
// （LINE Notify 已於 2025/3/31 停止服務，改用 Messaging API）
// ============================

/** LINE Channel Access Token（從 LINE Developers Console 取得） */
const LINE_CHANNEL_ACCESS_TOKEN = '在此貼上您的Channel Access Token';

/**
 * LINE 通知目標 ID
 * - 若要通知個人：填入 User ID（U 開頭的字串）
 * - 若要通知群組：填入 Group ID（C 開頭的字串）
 * 可在 LINE Developers Console → Channel → Basic settings 找到 User ID
 */
const LINE_NOTIFY_TARGET_ID = '在此貼上您的User ID或Group ID';

/** LINE Messaging API Push Message 端點 */
const LINE_PUSH_API_URL = 'https://api.line.me/v2/bot/message/push';

// ============================
// 🤖 Gemini API 設定
// ============================

/** Gemini API Key（從 Google AI Studio 取得） */
const GEMINI_API_KEY = '';

/** Gemini API 模型端點 */
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ============================
// ⚙️ 系統預設值
// ============================

/** 新資料預設處理狀態 */
const DEFAULT_STATUS = '未處理';

/** 各欄位在試算表中的位置（1-indexed） */
const COLUMNS = {
  TIMESTAMP: 1,         // A 欄 — 時間戳記
  NAME: 2,              // B 欄 — 客人姓名
  CONTACT: 3,           // C 欄 — 聯絡方式
  GENDER: 4,            // D 欄 — 性別
  BIRTH_DATE: 5,        // E 欄 — 出生日期
  BIRTH_TIME: 6,        // F 欄 — 出生時間
  PREFERENCE: 7,        // G 欄 — 配戴習慣
  WRIST_SIZE: 8,        // H 欄 — 淨手圍
  COLOR_PREFERENCE: 9,  // I 欄 — 偏好色系
  ENERGY_GOAL: 10,      // J 欄 — 期望目標
  CALCULATION_METHOD: 11, // K 欄 — 分析方法
  TARGET_CHAKRA: 12,    // L 欄 — 目標脈輪
  DESCRIPTION: 13,      // M 欄 — 狀態描述
  BUDGET: 14,           // N 欄 — 預算範圍
  AI_RECOMMENDATION: 15,// O 欄 — AI初步推薦（自動產生）
  STATUS: 16,           // P 欄 — 處理狀態
  NOTES: 17,            // Q 欄 — 備註紀錄
  DESIGN_BRACELETS: 18  // R 欄 — 想設計手鍊
};

/** 試算表標題列（第一列的欄位名稱） */
const HEADER_ROW = [
  '時間戳記',
  '客人姓名',
  '聯絡方式',
  '性別',
  '出生日期',
  '出生時間',
  '配戴習慣',
  '淨手圍',
  '偏好色系',
  '期望目標',
  '分析方法',
  '目標脈輪',
  '狀態描述',
  '預算範圍',
  'AI初步推薦',
  '處理狀態',
  '備註紀錄',
  '想設計手鍊'
];

/** 訂單工作表標題列 */
const ORDER_HEADER_ROW = [
  '時間戳記',
  '訂單編號',
  '客人姓名',
  '聯絡方式',
  '交付方式',
  '地址或面交備註',
  '訂單備註',
  '商品明細',
  '商品數量',
  '小計',
  '幣別',
  '來源',
  '處理狀態',
  '付款狀態',
  '出貨狀態',
  '後台備註',
  '原始Payload'
];

/** 手鍊公開檔案欄位在試算表中的位置（1-indexed） */
const BRACELET_PROFILE_COLUMNS = {
  CREATED_AT: 1,        // A 欄 — 建立時間
  UPDATED_AT: 2,        // B 欄 — 更新時間
  PROFILE_ID: 3,        // C 欄 — 檔案 ID
  ACCESS_CODE: 4,       // D 欄 — QR/短碼查詢碼
  ACCESS_TOKEN: 5,      // E 欄 — QR token
  PUBLISHED: 6,         // F 欄 — 是否公開
  DISPLAY_NAME: 7,      // G 欄 — 公開顯示名稱
  BRACELET_NAME: 8,     // H 欄 — 手鍊名稱
  SCENE: 9,             // I 欄 — 場景
  SUMMARY: 10,          // J 欄 — 公開摘要
  CRYSTALS: 11,         // K 欄 — 水晶配置
  ENERGY_FOCUS: 12,     // L 欄 — 能量主題
  CHAKRA_FOCUS: 13,     // M 欄 — 脈輪主題
  DESIGN_NOTES: 14,     // N 欄 — 設計說明
  WEARING_GUIDE: 15,    // O 欄 — 配戴指南
  CARE_INSTRUCTIONS: 16,// P 欄 — 保養說明
  RITUAL_TEXT: 17,      // Q 欄 — 日常儀式
  MAKER_NOTE: 18,       // R 欄 — 店主小語
  IMAGE_URL: 19,        // S 欄 — 圖片網址
  PRODUCT_URL: 20,      // T 欄 — 商品或公開頁網址
  PUBLISHED_AT: 21,     // U 欄 — 公開時間
  INTERNAL_NOTES: 22    // V 欄 — 內部備註（不對外輸出）
};

/** 手鍊公開檔案工作表標題列 */
const BRACELET_PROFILE_HEADER_ROW = [
  '建立時間',
  '更新時間',
  '檔案ID',
  '查詢碼',
  '查詢Token',
  '是否公開',
  '公開顯示名稱',
  '手鍊名稱',
  '場景',
  '公開摘要',
  '水晶配置',
  '能量主題',
  '脈輪主題',
  '設計說明',
  '配戴指南',
  '保養說明',
  '日常儀式',
  '店主小語',
  '圖片網址',
  '商品或公開頁網址',
  '公開時間',
  '內部備註'
];

/** 分析評估表欄位在試算表中的位置（1-indexed） */
const ANALYSIS_EVALUATION_COLUMNS = {
  CREATED_AT: 1,          // A 欄 — 建立時間
  UPDATED_AT: 2,          // B 欄 — 更新時間
  EVALUATION_ID: 3,       // C 欄 — 評估 ID
  ACCESS_CODE: 4,         // D 欄 — 手鍊檔案查詢碼
  PROFILE_ID: 5,          // E 欄 — 個人圖卡 ID
  CUSTOMER_NAME: 6,       // F 欄 — 客人姓名
  CONTACT: 7,             // G 欄 — 聯絡方式
  GENDER: 8,              // H 欄 — 性別
  BIRTH_DATE: 9,          // I 欄 — 出生日期
  BIRTH_TIME: 10,         // J 欄 — 出生時間
  CALCULATION_METHOD: 11, // K 欄 — 能量分析模組
  ENERGY_GOAL: 12,        // L 欄 — 期望目標
  TARGET_CHAKRA: 13,      // M 欄 — 目標脈輪
  COLOR_PREFERENCE: 14,   // N 欄 — 偏好色系
  WRIST_SIZE: 15,         // O 欄 — 淨手圍
  BUDGET: 16,             // P 欄 — 預算範圍
  DESCRIPTION: 17,        // Q 欄 — 狀態描述
  RECOMMENDATION_TEXT: 18,// R 欄 — 水晶能量初步評估全文
  PROFILE_URL: 19,        // S 欄 — 個人圖卡連結
  CONSULTATION_ROW: 20,   // T 欄 — 諮詢紀錄列號
  INTERNAL_NOTES: 21,     // U 欄 — 內部備註
  DESIGN_BRACELETS: 22    // V 欄 — 想設計手鍊
};

/** 分析評估表標題列 */
const ANALYSIS_EVALUATION_HEADER_ROW = [
  '建立時間',
  '更新時間',
  '評估ID',
  '查詢碼',
  '個人圖卡ID',
  '客人姓名',
  '聯絡方式',
  '性別',
  '出生日期',
  '出生時間',
  '能量分析模組',
  '期望目標',
  '目標脈輪',
  '偏好色系',
  '淨手圍',
  '預算範圍',
  '狀態描述',
  '水晶能量初步評估全文',
  '個人圖卡連結',
  '諮詢紀錄列號',
  '內部備註',
  '想設計手鍊'
];

/** 水晶成本工作表欄位在試算表中的位置（1-indexed） */
const CRYSTAL_COST_COLUMNS = {
  CRYSTAL_NAME: 1,       // A 欄 — 水晶名稱
  SIZE_MM: 2,            // B 欄 — 尺寸 mm
  UNIT_COST: 3,          // C 欄 — 單顆成本
  CURRENCY: 4,           // D 欄 — 幣別
  COLOR_FAMILY: 5,       // E 欄 — 色系
  SOURCE_IMAGE: 6,       // F 欄 — 來源圖片
  VERIFY_STATUS: 7,      // G 欄 — 辨識狀態
  NOTES: 8,              // H 欄 — 備註
  UPDATED_AT: 9          // I 欄 — 更新時間
};

/** 水晶成本工作表標題列 */
const CRYSTAL_COST_HEADER_ROW = [
  '水晶名稱',
  '尺寸mm',
  '單顆成本',
  '幣別',
  '色系',
  '來源圖片',
  '辨識狀態',
  '備註',
  '更新時間'
];

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
const SPREADSHEET_ID = '在此貼上您的試算表ID';

/** 工作表名稱（試算表下方的分頁名稱） */
const SHEET_NAME = '諮詢紀錄';

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
const GEMINI_API_KEY = '在此貼上您的GEMINI_API_KEY';

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
  NOTES: 17             // Q 欄 — 備註紀錄
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
  '備註紀錄'
];

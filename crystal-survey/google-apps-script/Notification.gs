/**
 * ============================================================
 *  水晶能量專屬諮詢系統 — LINE 通知模組
 *  Crystal Energy Consultation System — LINE Notification Module
 * ============================================================
 *  說明：
 *  透過 LINE Messaging API Push Message 發送即時通知。
 *  注意：LINE Notify 已於 2025/3/31 停止服務，
 *  本系統採用 LINE Messaging API 作為替代方案。
 * ============================================================
 */

/**
 * 發送 LINE 推播通知
 * 使用 LINE Messaging API 的 Push Message 功能
 * @param {string} message - 要發送的通知訊息
 * @returns {boolean} 發送是否成功
 */
function sendLinePushMessage(message) {
  try {
    // 驗證設定是否完成
    if (!LINE_CHANNEL_ACCESS_TOKEN || LINE_CHANNEL_ACCESS_TOKEN === '在此貼上您的Channel Access Token') {
      console.warn('【LINE 通知】Channel Access Token 尚未設定，跳過通知發送');
      return false;
    }

    if (!LINE_NOTIFY_TARGET_ID || LINE_NOTIFY_TARGET_ID === '在此貼上您的User ID或Group ID') {
      console.warn('【LINE 通知】通知目標 ID 尚未設定，跳過通知發送');
      return false;
    }

    // 組建 LINE Messaging API Push Message 請求
    const payload = {
      to: LINE_NOTIFY_TARGET_ID,
      messages: [
        {
          type: 'text',
          text: message
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
      muteHttpExceptions: true  // 避免 HTTP 錯誤中斷執行
    };

    // 發送請求
    const response = UrlFetchApp.fetch(LINE_PUSH_API_URL, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      console.log('【LINE 通知】✅ 通知發送成功');
      return true;
    } else {
      const responseBody = response.getContentText();
      console.error('【LINE 通知】❌ 發送失敗，HTTP ' + responseCode + '：' + responseBody);
      return false;
    }

  } catch (error) {
    // 捕捉所有錯誤，確保通知失敗不會中斷主流程
    console.error('【LINE 通知】❌ 發送例外：' + error.toString());
    return false;
  }
}

/**
 * 格式化諮詢通知訊息
 * @param {Object} data - 客人的諮詢資料
 * @param {string} data.name - 客人姓名
 * @param {string} data.gender - 性別
 * @param {string} data.energyGoal - 期望目標
 * @param {string} data.budget - 預算範圍
 * @param {string} data.recommendation - AI 初步推薦結果
 * @returns {string} 格式化後的通知訊息
 */
function formatNotificationMessage(data) {
  try {
    const message = [
      '🔔 新進水晶諮詢通知！',
      '━━━━━━━━━━━━━━━',
      '👤 顧客姓名：' + (data.name || '未填寫'),
      '⚧ 性別：' + (data.gender || '未填寫'),
      '🎯 期望目標：' + (data.energyGoal || '未填寫'),
      '💰 預算範圍：' + (data.budget || '未填寫'),
      '💎 系統初步推薦：' + (data.recommendation || '處理中'),
      '━━━━━━━━━━━━━━━',
      '📋 請盡速至後台處理。'
    ].join('\n');

    return message;

  } catch (error) {
    console.error('【訊息格式化錯誤】' + error.toString());
    return '🔔 新進水晶諮詢通知！\n（訊息格式化失敗，請至後台查看詳情）';
  }
}

/**
 * 發送諮詢通知的統一入口
 * 格式化訊息後發送 LINE 推播
 * @param {Object} data - 客人的諮詢資料
 * @returns {boolean} 發送是否成功
 */
function sendConsultationNotification(data) {
  try {
    const message = formatNotificationMessage(data);
    return sendLinePushMessage(message);
  } catch (error) {
    console.error('【通知流程錯誤】' + error.toString());
    return false;
  }
}

/**
 * 取得店主通知 Email。
 * OWNER_EMAIL 留空時，嘗試使用 Apps Script 執行帳號 Email。
 * @returns {string} 收件 Email
 */
function getOwnerNotificationEmail() {
  if (typeof OWNER_EMAIL !== 'undefined' && OWNER_EMAIL && OWNER_EMAIL !== '在此貼上收件Email') {
    return OWNER_EMAIL;
  }

  try {
    return Session.getEffectiveUser().getEmail() || '';
  } catch (error) {
    console.warn('【Email 通知】無法取得執行帳號 Email：' + error.toString());
    return '';
  }
}

/**
 * 寄送店主 Email 通知。
 * @param {string} subject - Email 主旨
 * @param {string} body - 純文字內容
 * @returns {boolean} 是否寄送成功
 */
function sendOwnerEmail(subject, body) {
  try {
    const recipient = getOwnerNotificationEmail();
    if (!recipient) {
      console.warn('【Email 通知】OWNER_EMAIL 尚未設定，跳過通知發送');
      return false;
    }

    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      body: body,
      name: 'MUPHÉ Handmade'
    });

    console.log('【Email 通知】✅ 已寄送至：' + recipient);
    return true;
  } catch (error) {
    console.error('【Email 通知】❌ 發送失敗：' + error.toString());
    return false;
  }
}

/**
 * 測試通知功能（開發用）
 * 在 Apps Script 編輯器中直接執行此函數以測試 LINE 通知
 */
function testNotification() {
  const testData = {
    name: '測試客人',
    energyGoal: '招正財/事業運, 桃花與人緣',
    budget: '$3,000-$5,000',
    recommendation: '【招正財/事業運＋桃花與人緣】綠幽靈、綠髮晶、葡萄石、粉晶、草莓晶、紅紋石、拉長石'
  };

  const success = sendConsultationNotification(testData);
  
  if (success) {
    console.log('✅ 測試通知發送成功！請檢查 LINE 是否收到訊息。');
  } else {
    console.log('❌ 測試通知發送失敗。請檢查以下設定：');
    console.log('  1. LINE_CHANNEL_ACCESS_TOKEN 是否已填入正確的 Token');
    console.log('  2. LINE_NOTIFY_TARGET_ID 是否已填入正確的 User ID 或 Group ID');
    console.log('  3. LINE 官方帳號是否已啟用 Messaging API');
  }
}

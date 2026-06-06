/**
 * ============================================================
 *  水晶能量專屬諮詢系統 — 水晶推薦邏輯模組
 *  Crystal Energy Consultation System — Recommendation Engine
 * ============================================================
 *  說明：
 *  1. 實作了多維度神祕學計算公式：包含生命靈數、生辰五行季節、西方星座與東方生肖。
 *  2. 基於計算出的參數，優先調用 Gemini API 進行專業、溫暖的個人化水晶評估，
 *     並客製化設計三款水晶手鏈（主命宮能量手鏈、心靈平衡療癒手鏈、流年幸運守護手鏈）。
 *  3. 在生成的報告中，會列出詳細的計算式與公式過程。
 *  4. 若 Gemini 呼叫失敗或金鑰未填，自動無縫降級至本地的公式 Fallback 引擎，確保服務不中斷。
 * ============================================================
 */

/**
 * 水晶推薦規則對照表（用於本地 Fallback 邏輯與參考）
 */
const RECOMMENDATION_RULES = [
  { category: '招正財/事業運', keywords: ['招正財', '事業運', '正財', '事業'], crystals: ['綠幽靈', '綠髮晶', '葡萄石'] },
  { category: '招偏財/業績/守財', keywords: ['招偏財', '業績', '守財', '偏財'], crystals: ['鈦晶', '黃水晶', '金髮晶', '太陽石'] },
  { category: '桃花與人緣', keywords: ['桃花', '人緣'], crystals: ['粉晶', '草莓晶', '紅紋石', '拉長石'] },
  { category: '感情與婚姻', keywords: ['感情', '婚姻'], crystals: ['粉晶', '草莓晶', '紅紋石', '拉長石'] },
  { category: '避邪與防小人', keywords: ['避邪', '防小人', '擋煞'], crystals: ['黑曜石', '黑髮晶', '黑鈦晶', '茶晶'] },
  { category: '健康與心靈療癒', keywords: ['健康', '心靈', '療癒', '舒壓'], crystals: ['紫水晶', '白水晶', '月光石'] },
  { category: '智慧與專注力', keywords: ['智慧', '專注', '考試', '學業'], crystals: ['紫水晶', '白水晶', '月光石'] }
];

/**
 * 根據期望目標或完整資料產生水晶推薦
 * @param {Object|string} dataOrGoal - 客人填寫的諮詢資料對象，或單一期望目標字串
 * @returns {string} 推薦水晶分析或推薦結果
 */
function generateRecommendation(dataOrGoal) {
  let name = '';
  let gender = '';
  let preference = '';
  let wristSize = '';
  let colorPreference = '';
  let energyGoal = '';
  let description = '';
  let budget = '';
  let birthDate = '';
  let birthTime = '';
  let calculationMethod = '';
  let targetChakra = '';

  // 解析輸入參數，支援向下相容
  if (dataOrGoal && typeof dataOrGoal === 'object') {
    name = dataOrGoal.name || '';
    gender = dataOrGoal.gender || '';
    preference = dataOrGoal.preference || '手鏈/手環';
    wristSize = dataOrGoal.wristSize || '';
    colorPreference = Array.isArray(dataOrGoal.colorPreference) 
      ? dataOrGoal.colorPreference.join(', ') 
      : (dataOrGoal.colorPreference || '');
    energyGoal = Array.isArray(dataOrGoal.energyGoal) 
      ? dataOrGoal.energyGoal.join(', ') 
      : (dataOrGoal.energyGoal || '');
    description = dataOrGoal.description || '';
    budget = dataOrGoal.budget || '';
    birthDate = dataOrGoal.birthDate || '';
    birthTime = dataOrGoal.birthTime || '';
    calculationMethod = Array.isArray(dataOrGoal.calculationMethod)
      ? dataOrGoal.calculationMethod.join(', ')
      : (dataOrGoal.calculationMethod || '');
    targetChakra = Array.isArray(dataOrGoal.targetChakra)
      ? dataOrGoal.targetChakra.join(', ')
      : (dataOrGoal.targetChakra || '');
  } else {
    energyGoal = dataOrGoal || '';
  }

  // 1. 嘗試使用 Gemini API 進行推薦
  if (typeof GEMINI_API_KEY !== 'undefined' && GEMINI_API_KEY && GEMINI_API_KEY !== '在此貼上您的GEMINI_API_KEY') {
    try {
      const prompt = buildGeminiPrompt(name, gender, preference, wristSize, colorPreference, energyGoal, description, budget, birthDate, birthTime, calculationMethod, targetChakra);
      console.log('【推薦引擎】🔮 正在呼叫 Gemini API 進行水晶能量諮詢生成...');
      let recommendation = callGeminiAPI(prompt);
      if (recommendation && recommendation.trim() !== '') {
        recommendation = recommendation.trim();
        recommendation = recommendation.replace(/以上為您量身推薦的水晶種類.*/g, '').trim();
        recommendation = recommendation.replace(/💬 【暖心陪伴語】[\s\S]*/g, '').trim();
        
        const caringMsg = getCaringMessage(energyGoal);
        const ctaMsg = '\n\n✨ 以上為您量身推薦的水晶種類，歡迎聯絡我們進行專業100%專屬客製化手鏈設計！';
        
        return recommendation + '\n\n💬 【暖心陪伴語】\n' + caringMsg + ctaMsg;
      }
    } catch (error) {
      console.error('【推薦引擎】⚠️ Gemini 呼叫失敗，將降級使用本地公式規則引擎。錯誤訊息：' + error.toString());
    }
  } else {
    console.log('【推薦引擎】ℹ️ Gemini API 金鑰未設定，自動使用本地公式對照表生成推薦。');
  }

  // 2. Fallback：使用本地精密公式規則匹配
  return generateRuleBasedRecommendation({
    name, gender, preference, wristSize, colorPreference, energyGoal, description, budget, birthDate, birthTime, calculationMethod, targetChakra
  });
}

/**
 * 根據生日計算生命靈數及詳細相加過程
 * @param {string} birthDateStr - YYYY-MM-DD
 */
function calculateLifePathNumber(birthDateStr) {
  if (!birthDateStr) {
    return { number: 9, formula: '無生日資料，使用預設值' };
  }
  const clean = birthDateStr.replace(/[^0-9]/g, '');
  let sum = 0;
  const parts = [];
  for (let i = 0; i < clean.length; i++) {
    sum += parseInt(clean[i], 10);
    parts.push(clean[i]);
  }
  const firstSum = sum;
  const firstFormula = parts.join('+') + ' = ' + firstSum;
  
  while (sum > 9) {
    const digits = sum.toString();
    sum = parseInt(digits[0], 10) + parseInt(digits[1], 10);
  }
  
  const finalFormula = firstSum > 9 
    ? firstFormula + ' -> ' + firstSum.toString()[0] + '+' + firstSum.toString()[1] + ' = ' + sum
    : firstFormula;
     
  return {
    number: sum,
    formula: finalFormula
  };
}

/**
 * 根據生日國曆月份計算出生季節與五行缺失
 * @param {string} birthDateStr - YYYY-MM-DD
 */
function calculateFiveElements(birthDateStr) {
  if (!birthDateStr) {
    return { season: '未提供', deficiency: '火、土', formula: '無生日資料' };
  }
  const month = parseInt(birthDateStr.split('-')[1], 10);
  
  let season = '';
  let deficiency = '';
  let formula = '';
  
  if (month >= 2 && month <= 4) {
    season = '春季';
    deficiency = '金、土';
    formula = '春季生木旺，木盛土崩金絕，最缺「金、土」';
  } else if (month >= 5 && month <= 7) {
    season = '夏季';
    deficiency = '水、金';
    formula = '夏季生火旺，火盛水乾金熔，最缺「水、金」';
  } else if (month >= 8 && month <= 10) {
    season = '秋季';
    deficiency = '木、火';
    formula = '秋季生金旺，金盛木折火熄，最缺「木、火」';
  } else {
    season = '冬季';
    deficiency = '火、土';
    formula = '冬季生水旺，水盛火熄土凍，最缺「火、土」';
  }
  
  return {
    season: season,
    deficiency: deficiency,
    formula: formula
  };
}

/**
 * 根據生日計算西方星座
 */
function calculateZodiacSign(birthDateStr) {
  if (!birthDateStr) return '雙魚座';
  const parts = birthDateStr.split('-');
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '牡羊座';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '雙子座';
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '獅子座';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '處女座';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蠍座';
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
  return '雙魚座';
}

/**
 * 根據生肖計算生肖
 */
function calculateChineseZodiac(birthDateStr) {
  if (!birthDateStr) return '龍';
  const year = parseInt(birthDateStr.split('-')[0], 10);
  const animals = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
  const index = (year - 1900) % 12;
  return animals[index >= 0 ? index : index + 12];
}

/**
 * 本地公式 Fallback 推薦引擎實作
 */
function generateRuleBasedRecommendation(data) {
  const name = data.name || '';
  const gender = data.gender || '未提供';
  const wristSize = data.wristSize || '';
  const birthDate = data.birthDate || '';
  const targetChakra = data.targetChakra || '';

  const lifePath = calculateLifePathNumber(birthDate);
  const fiveElements = calculateFiveElements(birthDate);
  const zodiacSign = calculateZodiacSign(birthDate);
  const chineseZodiac = calculateChineseZodiac(birthDate);

  // 1. 生命靈數對應
  const lpCrystals = {
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

  // 2. 五行缺失對應
  const elemCrystals = {
    '金、土': { name: '白水晶(金) + 黃水晶(土)', desc: '以土生金，補充先天缺失，穩固財庫與事業底氣' },
    '水、金': { name: '海藍寶(水) + 白水晶(金)', desc: '金生水起，消除燥熱火氣，化解工作與溝通阻礙' },
    '木、火': { name: '綠幽靈(木) + 金太陽石(火)', desc: '木生火旺，增強正財運勢與工作執行魄力，掃除疲憊' },
    '火、土': { name: '紅紋石(火) + 茶晶(土)', desc: '火生土燥，驅散冬日嚴寒，帶來溫暖活力與踏實守財能量' }
  };

  const lpInfo = lpCrystals[lifePath.number] || { name: '白水晶', desc: '淨化磁場' };
  const elemInfo = elemCrystals[fiveElements.deficiency] || { name: '茶晶', desc: '沉穩踏實' };

  // 手鏈 A
  const braceletA = [
    '📿 【手鏈 A — 主命宮能量手鏈】',
    '【計算式】：生命靈數 ' + lifePath.formula + '；出生季節 ' + fiveElements.season + ' -> 補 ' + fiveElements.deficiency,
    '【水晶搭配】：' + lpInfo.name + ' 與 ' + elemInfo.name,
    '【能量解說】：本款手鏈專為您的先天命格定制。融合了您生命靈數 ' + lifePath.number + ' 號人的專屬能量水晶（' + lpInfo.desc + '），搭配您生辰五行最缺乏的元素進行平衡調和（' + elemInfo.desc + '），全方位穩固並充實您先天的能量場。'
  ].join('\n');

  // 3. 脈輪對應
  const chakraCrystals = {
    '海底輪': { name: '黑曜石、茶晶', desc: '強力避邪防小人，排除體內濁氣與晦氣，提供腳踏實地的穩定感' },
    '臍輪': { name: '橙月光石、太陽石', desc: '平衡人際交往，舒緩自我焦慮，平衡日常喜悅情緒' },
    '太陽神經叢': { name: '黃水晶、金髮晶', desc: '大幅提升自信、意志力與膽識，增強求財能量' },
    '心輪': { name: '粉水晶、葡萄石', desc: '打開心房以愛包容，擴展招財人緣，並帶來心肺療癒' },
    '喉輪': { name: '海藍寶、天河石', desc: '大幅提振溝通表達力、說服力，平定思維焦躁不安' },
    '眉心輪': { name: '青金石、紫水晶', desc: '保持思緒冷靜，喚醒冥想直覺力，有助於理性思索與學業考運' },
    '頂輪': { name: '白水晶、紫水晶', desc: '淨化與重組全身磁場，打通頂輪，引入高維的慈悲與智慧' }
  };

  const primaryChakra = targetChakra ? targetChakra.split(', ')[0] : '心輪';
  const chakraInfo = chakraCrystals[primaryChakra] || { name: '白水晶、茶晶', desc: '全維度身心能量調和' };

  // 手鏈 B
  const braceletB = [
    '📿 【手鏈 B — 心靈平衡療癒手鏈】',
    '【設計公式】：基於您目前最需要調和的脈輪（' + primaryChakra + '）後天客製',
    '【水晶搭配】：' + chakraInfo.name,
    '【能量解說】：專門針對您的後天能量缺口進行修復。透過 ' + chakraInfo.name + ' 與特定脈輪進行頻率共振（' + chakraInfo.desc + '），協助您消除負面心結，重塑身心靈流動的和諧。'
  ].join('\n');

  // 4. 星座生肖對應
  const zodiacCrystals = {
    '牡羊座': '太陽石', '金牛座': '葡萄石', '雙子座': '天河石', '巨蟹座': '月光石',
    '獅子座': '鈦晶', '處女座': '紫水晶', '天秤座': '金髮晶', '天蠍座': '拉長石',
    '射手座': '青金石', '摩羯座': '茶晶', '水瓶座': '拉長石', '雙魚座': '海藍寶'
  };

  const chineseZodiacCrystals = {
    '鼠': '白水晶', '牛': '黃水晶', '虎': '綠幽靈', '兔': '藍砂石',
    '龍': '紅紋石', '蛇': '綠髮晶', '馬': '金太陽石', '羊': '紫水晶',
    '猴': '白水晶', '雞': '金髮晶', '狗': '茶晶', '豬': '藍碧璽'
  };

  const zodCrystal = zodiacCrystals[zodiacSign] || '白水晶';
  const czodCrystal = chineseZodiacCrystals[chineseZodiac] || '茶晶';

  // 手鏈 C
  const braceletC = [
    '📿 【手鏈 C — 流年幸運守護手鏈】',
    '【設計公式】：基於您的西方星座（' + zodiacSign + '）與東方生肖（' + chineseZodiac + '年）雙重幸運神護持',
    '【水晶搭配】：' + zodCrystal + ' 配搭 ' + czodCrystal,
    '【能量解說】：本款手鏈為您的流年幸運守護手鏈。融合西方星座之幸運石（' + zodCrystal + '）與東方生肖之流年避邪防小人幸運石（' + czodCrystal + '），共同交織出極佳的氣場防護，為您招徠各方善緣與貴人運勢。'
  ].join('\n');

  // 總報告組合
  const caringMsg = getCaringMessage(data.energyGoal);

  const fullReport = [
    '🔮 【多維度精密能量評估報告（本地規則 Fallback 生成）】',
    '親愛的 ' + (name || '貴賓') + '，根據我們精密分析您的國曆生日等神祕學數據，為您量身配置以下三款專屬水晶手鏈：',
    '【基本資料】：性別 ' + gender + '；專屬品項 手鏈/手環；淨手圍 ' + (wristSize ? wristSize + ' cm' : '未提供'),
    '',
    braceletA,
    '',
    braceletB,
    '',
    braceletC,
    '',
    '🧘 【配戴與消磁儀式建議】',
    '- 淨手圍為 ' + (wristSize ? wristSize + ' cm' : '15-16 cm') + '，手鏈將依此手圍為您精準定制穿線。',
    '- 建議左手配戴「手鏈 A」與「手鏈 C」用以吸納先天本命與幸運守護能量。',
    '- 若「手鏈 B」包含避邪排除類水晶（如茶晶、黑曜石），請配戴在右手以利排出濁氣與負能量。',
    '- 收到水晶後，請置於白水晶碎石中進行 4 小時以上消磁，並虔誠設定您的祈願意圖。',
    '',
    '💬 【暖心陪伴語】',
    caringMsg,
    '',
    '✨ 以上為您量身推薦的水晶種類，歡迎聯絡我們進行專業100%專屬客製化手鏈設計！'
  ].join('\n');

  return fullReport;
}

/**
 * 組建發送給 Gemini 的 Prompt
 */
function buildGeminiPrompt(name, gender, preference, wristSize, colorPreference, energyGoal, description, budget, birthDate, birthTime, calculationMethod, targetChakra) {
  const lifePath = calculateLifePathNumber(birthDate);
  const fiveElements = calculateFiveElements(birthDate);
  const zodiacSign = calculateZodiacSign(birthDate);
  const chineseZodiac = calculateChineseZodiac(birthDate);

  return [
    '你是一位精通西方占星術、東方生辰八字五行、印度脈輪能量學與希伯來生命靈數學的專業溫暖水晶能量諮詢師。',
    '請根據以下顧客的個人資料與神秘學計算參數，為他進行極具專業度與信服力的水晶能量評估，並量身客製化打造三款獨一無二的水晶手鏈。',
    '',
    '【顧客諮詢與計算參數】',
    '- 顧客姓名：' + (name || '未填寫'),
    '- 性別：' + (gender || '未提供'),
    '- 生日：' + (birthDate || '未提供') + ' ' + (birthTime || ''),
    '- 專屬品項：' + (preference || '手鏈/手環'),
    '- 淨手圍：' + (wristSize ? wristSize + ' cm' : '未提供'),
    '- 偏好色系：' + (colorPreference || '不限'),
    '- 期望改善目標：' + (energyGoal || '未填寫'),
    '- 自評需平衡脈輪：' + (targetChakra || '未勾選'),
    '- 目前狀態/困擾描述：' + (description || '無特別描述'),
    '- 預算範圍：' + (budget || '不限預算'),
    '- 啟用的分析模組：' + (calculationMethod || '全部啟用'),
    '',
    '【神秘學精準計算結果】',
    '- 生命靈數：' + lifePath.number + ' 號人 (計算式：' + lifePath.formula + ')',
    '- 生辰五行季節：' + fiveElements.season + ' 出生 (判定式：' + fiveElements.formula + ') -> 五行調和最缺乏：' + fiveElements.deficiency,
    '- 西方星座：' + zodiacSign,
    '- 東方生肖：' + chineseZodiac + '年',
    '',
    '【回覆規範與結構】',
    '請以溫暖、專業且極具說服力的筆調，撰寫一份 500-600 字的精緻能量報告。',
    '報告必須使用清晰的換行與 Emoji，不可使用 Markdown 語法（例如 ** 或 ##），以便在 Google 試算表儲存格與前端頁面中完美排版呈現。',
    '請嚴格遵守以下五段式結構：',
    '',
    '🔮 第一段：【多維度能量分析】',
    '綜合分析顧客的生命靈數性格特質、生辰五行衰旺、自評脈輪阻滯及星座生肖的流年運勢，寫明您的專業診斷，給予真誠的同理與能量引導。',
    '',
    '📿 第二段：【手鏈 A — 主命宮能量手鏈】',
    '【設計公式】：基於「生命靈數 ' + lifePath.number + ' 號」與「生辰五行缺 ' + fiveElements.deficiency + '」的先天調和設計。',
    '詳細說明此款手鏈選用的 2-3 種主水晶（必須考量偏好色系與預算），解釋其如何補充先天缺失並注入主命宮能量。請在此行寫出：『【計算式】：生命靈數 ' + lifePath.formula + '；出生季節 ' + fiveElements.season + ' -> 補 ' + fiveElements.deficiency + '』。',
    '',
    '📿 第三段：【手鏈 B — 心靈平衡療癒手鏈】',
    '【設計公式】：基於顧客勾選的脈輪能量缺口（' + (targetChakra || '心輪/海底輪') + '）後天調和設計。',
    '詳細說明此款手鏈選用的 2-3 種療癒水晶，說明其如何針對當前的情緒壓力、失眠或焦慮進行脈輪疏通，平衡後天心靈流動。',
    '',
    '📿 第四段：【手鏈 C — 流年幸運守護手鏈】',
    '【設計公式】：基於「星座：' + zodiacSign + '」與「生肖：' + chineseZodiac + '」的雙重幸運物守護設計。',
    '詳細說明此款手鏈選用的 2-3 種守護水晶，解釋其如何增強流年運氣、辟邪擋煞、防小人並招來貴人緣。',
    '',
    '🧘 第五段：【配戴與消磁儀式建議】',
    '根據手圍（' + (wristSize ? wristSize + ' cm' : '15-16 cm') + '）提供配戴建議，並給予專屬的淨化消磁日常心靈功課建議。'
  ].join('\n');
}

/**
 * 呼叫 Gemini API 獲取生成內容
 */
function callGeminiAPI(prompt) {
  const url = GEMINI_API_URL + '?key=' + GEMINI_API_KEY;
  
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode === 200) {
    const json = JSON.parse(responseText);
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts[0]) {
      return json.candidates[0].content.parts[0].text;
    }
    throw new Error('Gemini API 回傳格式不符合預期');
  } else {
    throw new Error('HTTP ' + responseCode + '：' + responseText);
  }
}


/**
 * 依據顧客期望目標（點擊需求）匹配專屬的關懷問候短句（10 種交互）
 * @param {string} energyGoalStr - 逗號分隔的期望改善目標
 * @returns {string} 溫暖關懷語句
 */
function getCaringMessage(energyGoalStr) {
  const goals = energyGoalStr ? energyGoalStr.split(', ') : [];
  
  const messages = {
    '避邪與防小人': '💖 辛苦了，最近職場或生活上是不是遇到一些紛紛擾擾，讓你的心有些疲憊呢？請相信這只是一時的考驗，有力量的避邪水晶會幫你擋下那些不屬於你的負能量，還你一片清淨。',
    '招正財/事業運': '💖 最近在工作上是不是背負了很大的期許與責任，面臨重要的衝刺期呢？你一直以來都非常拼命，真的辛苦了！請記得在努力的同時也要適度深呼吸，讓事業晶石默默支持你的每一步前行。',
    '招偏財/業績/守財': '💖 看著你每天為夢想與理想忙碌奔波，真的非常令人敬佩！難免會有些收穫與付出不成正比的焦慮感吧？辛苦你了。願豐盛的招財晶石能為你的磁場注入滿滿財氣與安穩感。',
    '桃花與人緣': '💖 有時候，渴望能被深度傾聽、渴望被溫柔相待的心情，是不是讓你想起時有些孤單呢？你本來就是個溫暖又值得被愛的人。讓粉晶悄悄撫平那些小焦慮，為你引來生命中的良緣。',
    '感情與婚姻': '💖 在經營感情的路上，是不是偶爾也會感到有些迷茫，或在照顧伴侶感受的同時，忘記了要好好疼愛自己？辛苦了。請記得，你的溫柔與付出，值得最美麗的幸福與呵護。',
    '健康與心靈療癒': '💖 最近身體與心靈是不是感覺累積了太多的疲憊與壓力，讓你有些喘不過氣呢？真的辛苦你了。該是時候讓自己好好放鬆、好好睡個好覺了。願療癒晶石如溫柔羽毛撫平一切焦躁。',
    '智慧與專注力': '💖 面對繁雜的決策與即將到來的考驗，是不是讓你的大腦有些超載、思緒打結呢？辛苦你了。給大腦一點休息的空檔吧！願純淨的智慧晶石能為你點亮靈感，重回清明與平靜。',
    '通用': '💖 無論你此刻正面臨著什麼樣的生命課題，都想溫柔地對你說一聲：你已經做得很好了。每一顆水晶都是大地的恩賜，像溫暖的擁抱般，默默陪伴著你度過每個高低起伏。',
    '多重目標_事業財運': '💖 追逐理想與財富的道路有時是孤單的，但你展現了無比的勇氣與執行力。辛苦了！請讓這股源自大地的能量成為你最穩固的靠山，陪伴你創造屬於你的豐盛人生。',
    '多重目標_心靈人際': '💖 人與人之間的連結是一門美麗卻不容易的課。在照顧別人的同時，請別忘了把這份溫柔也留給自己。願水晶的純淨光芒能照亮你內心深處，陪你找回最初的喜悅與安寧。'
  };

  if (goals.includes('避邪與防小人')) {
    return messages['避邪與防小人'];
  } else if (goals.includes('健康與心靈療癒')) {
    return messages['健康與心靈療癒'];
  } else if (goals.includes('招正財/事業運') && goals.includes('招偏財/業績/守財')) {
    return messages['多重目標_事業財運'];
  } else if (goals.includes('招正財/事業運')) {
    return messages['招正財/事業運'];
  } else if (goals.includes('招偏財/業績/守財')) {
    return messages['招偏財/業績/守財'];
  } else if (goals.includes('桃花與人緣') && goals.includes('健康與心靈療癒')) {
    return messages['多重目標_心靈人際'];
  } else if (goals.includes('桃花與人緣')) {
    return messages['桃花與人緣'];
  } else if (goals.includes('感情與婚姻')) {
    return messages['感情與婚姻'];
  } else if (goals.includes('智慧與專注力')) {
    return messages['智慧與專注力'];
  } else {
    return messages['通用'];
  }
}

/**
 * 測試推薦引擎（開發用）
 * 在 Apps Script 編輯器中直接執行此函數以驗證推薦邏輯
 */
function testRecommendation() {
  console.log('=== 測試多維度精密客製化推薦 ===');
  const testObject = {
    name: '林阿真',
    gender: '女性',
    birthDate: '2001-11-25',
    birthTime: '15:30',
    preference: '手鏈/手環',
    wristSize: '15.0',
    colorPreference: ['粉紅色系', '紫色系'],
    energyGoal: ['桃花與人緣', '健康與心靈療癒'],
    targetChakra: ['心輪', '眉心輪'],
    calculationMethod: ['生命靈數', '生辰五行', '脈輪能量', '星座生肖'],
    description: '最近感到壓力比較大，希望能增加好人緣，順便釋放焦慮情緒',
    budget: '$1,000-$3,000'
  };

  const resultObj = generateRecommendation(testObject);
  console.log('推薦結果：\n' + resultObj);
}

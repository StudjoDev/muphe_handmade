/**
 * ============================================================
 *  水晶能量專屬諮詢系統 — 水晶推薦邏輯模組
 *  Crystal Energy Consultation System — Recommendation Engine
 * ============================================================
 *  說明：
 *  1. 實作了多維度神祕學分析模組：包含生命靈數、生辰五行季節、西方星座與東方生肖。
 *  2. 基於計算出的參數，優先調用 Gemini API 進行專業、溫暖的個人化水晶評估，
 *     並客製化設計三款水晶手鍊（主命宮能量手鍊、心靈平衡療癒手鍊、流年幸運守護手鍊）。
 *  3. 在生成的報告中，會列出詳細的分析模組與計算過程。
 *  4. 若 Gemini 呼叫失敗或金鑰未填，自動無縫降級至本地分析模組引擎，確保服務不中斷。
 * ============================================================
 */

/**
 * 水晶推薦規則對照表（用於本地分析模組邏輯與參考）
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
    preference = dataOrGoal.preference || '手鍊/手環';
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
        const ctaMsg = '\n\n✨ 以上為您量身推薦的水晶種類，歡迎聯絡我們進行專業100%專屬客製化手鍊設計！';
        
        return recommendation + '\n\n💬 【暖心陪伴語】\n' + caringMsg + ctaMsg;
      }
    } catch (error) {
      console.error('【推薦引擎】⚠️ Gemini 呼叫失敗，將降級使用本地分析模組規則引擎。錯誤訊息：' + error.toString());
    }
  } else {
    console.log('【推薦引擎】ℹ️ Gemini API 金鑰未設定，自動使用本地分析模組生成推薦。');
  }

  // 2. 使用本地精密分析模組規則匹配
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

  const reductionSteps = [];
  while (sum > 9) {
    const digits = sum.toString().split('');
    const nextSum = digits.reduce(function(total, digit) {
      return total + parseInt(digit, 10);
    }, 0);
    reductionSteps.push(digits.join('+') + ' = ' + nextSum);
    sum = nextSum;
  }

  const finalFormula = [firstFormula].concat(reductionSteps).join(' -> ');
     
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
 * 將表單多選或文字欄位轉成可比對的字串。
 */
function normalizeRuleInput(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value || '').trim();
}

/**
 * 拆解逗號、頓號與分號分隔的選項，保留選項內的斜線文字。
 */
function splitSelectionList(value) {
  return normalizeRuleInput(value)
    .split(/[，,、；;]+/)
    .map(function(item) {
      return item.trim();
    })
    .filter(function(item) {
      return item !== '';
    });
}

function textContainsAny(text, keywords) {
  for (let i = 0; i < keywords.length; i++) {
    if (text.indexOf(keywords[i]) !== -1) {
      return true;
    }
  }
  return false;
}

function countKeywordMatches(text, keywords) {
  let score = 0;
  for (let i = 0; i < keywords.length; i++) {
    if (text.indexOf(keywords[i]) !== -1) {
      score++;
    }
  }
  return score;
}

/**
 * 依客戶偏好色系選擇一顆色系調和晶，讓外觀偏好也能影響晶種。
 */
function resolveColorPreferenceInfo(colorPreference) {
  const selections = splitSelectionList(colorPreference).filter(function(item) {
    return item !== '不限';
  });
  if (!selections.length) {
    return null;
  }

  const colorRules = [
    { label: '紅色', keywords: ['紅色', '紅色系', '紅紋', '酒紅'], name: '紅紋石', desc: '以紅色暖流補充心力與熱情，適合需要愛、勇氣與重新啟動行動感的狀態' },
    { label: '橙色', keywords: ['橙色', '橘色', '橙色系', '橘色系'], name: '橙月光石', desc: '以橙色柔光平衡情緒與人際流動，讓作品更有溫暖、創造力與喜悅感' },
    { label: '黃金色', keywords: ['黃金色', '黃金色系', '黃色', '黃色系', '金色', '金色系'], name: '黃水晶', desc: '以明亮黃金能量提振自信與行動力，讓作品更聚焦財氣、舞台感與執行魄力' },
    { label: '綠色', keywords: ['綠色', '綠色系'], name: '綠幽靈', desc: '以綠色生命力連結心輪與正財事業感，讓作品更有成長、修復與行動支撐' },
    { label: '藍色', keywords: ['藍色', '藍色系', '海藍'], name: '海藍寶', desc: '以藍色清澈頻率支持溝通與安定，讓作品更適合表達、冷靜與情緒降溫' },
    { label: '紫色', keywords: ['紫色', '紫色系'], name: '紫水晶', desc: '以紫色沉靜頻率協助安定思緒，讓作品更適合睡前關機、靜心與智慧沉澱' },
    { label: '粉色', keywords: ['粉色', '粉紅', '粉紅色系', '粉晶', '玫瑰'], name: '粉水晶', desc: '以柔和粉色能量照顧愛與安全感，讓作品更貼近溫柔、人緣與自我接納的需求' },
    { label: '木質', keywords: ['木質', '木色', '木頭', '木紋'], name: '茶晶', desc: '以木質沉穩感連結落地與日常節奏，讓作品更溫潤、耐看且有穩定守護感' },
    { label: '黑色', keywords: ['黑色', '黑色系'], name: '黑曜石', desc: '以深色防護頻率建立界線，讓作品更適合擋煞、防小人與排除外界干擾' },
    { label: '白色透明', keywords: ['白色透明', '透明/白色系', '透明', '白色', '白色系'], name: '白水晶', desc: '以清透淨化能量放大整體配置，讓作品更乾淨、百搭且容易回到清明狀態' }
  ];

  for (let i = 0; i < selections.length; i++) {
    for (let j = 0; j < colorRules.length; j++) {
      if (textContainsAny(selections[i], colorRules[j].keywords)) {
        return colorRules[j];
      }
    }
  }

  return null;
}

const STATE_NEED_RULES = [
  {
    label: '界線防護',
    priority: 1,
    keywords: ['避邪與防小人', '避邪', '防小人', '小人', '擋煞', '負能量', '界線', '拒絕', '消耗', '情緒勒索', '主管', '職場壓力', '被干擾', '壓迫'],
    name: '黑曜石、茶晶',
    desc: '協助建立心理界線，過濾外界干擾，讓你在高壓人際或職場消耗中保有穩定底氣',
    advisor: '目前要先把界線與安全感立起來，後續的感情、人緣或事業能量才不會被外界消耗拖走。'
  },
  {
    label: '放鬆睡眠與情緒安定',
    priority: 2,
    keywords: ['健康與心靈療癒', '健康', '心靈', '療癒', '舒壓', '焦慮', '失眠', '睡', '累', '疲憊', '緊繃', '壓力', '放鬆', '關機', '低潮', '煩躁', '停不下來'],
    name: '紫水晶、月光石',
    desc: '協助沉澱過度運轉的思緒，安撫焦慮與睡前緊繃，讓身心進入較柔和的休息節奏',
    advisor: '如果身心已經長時間緊繃，系統會先把安定與睡眠放在前面，讓能量有恢復空間。'
  },
  {
    label: '專注與思緒清明',
    priority: 3,
    keywords: ['智慧與專注力', '智慧', '專注', '考試', '學業', '分心', '腦袋', '思緒', '混亂', '決策', '讀書', '效率', '清醒', '簡報準備'],
    name: '白水晶、螢石',
    desc: '協助清理雜訊、整理思緒與穩定注意力，適合需要讀書、決策或高密度工作的階段',
    advisor: '當文字裡出現腦袋混亂、分心或決策壓力，系統會補上清明與排序感，而不是只看表面目標。'
  },
  {
    label: '感情與人緣修復',
    priority: 4,
    keywords: ['桃花與人緣', '感情與婚姻', '桃花', '人緣', '感情', '婚姻', '戀愛', '心碎', '安全感', '愛自己', '孤單', '自我懷疑', '被愛', '關係'],
    name: '粉水晶、草莓晶',
    desc: '柔化情緒防衛，照顧自我價值感與親密關係需求，讓人際連結更自然流動',
    advisor: '這裡不是只看桃花，而是先照顧自我價值感，讓關係能從比較安穩的位置重新流動。'
  },
  {
    label: '財運與事業推進',
    priority: 5,
    keywords: ['招正財/事業運', '招偏財/業績/守財', '正財', '偏財', '財', '事業', '業績', '守財', '收入', '客戶', '創業', '銷售', '工作機會'],
    name: '綠幽靈、黃水晶',
    desc: '把注意力拉回實際行動與資源累積，協助事業推進、財務穩定與機會辨識',
    advisor: '事業與財運會被拆成穩定累積與行動推進，不會只用單一招財晶種帶過。'
  },
  {
    label: '表達溝通',
    priority: 6,
    keywords: ['溝通', '表達', '說話', '上台', '面試', '簡報', '開會', '喉嚨', '說服', '談判'],
    name: '海藍寶、青金石',
    desc: '支援溫和但清楚的表達，讓你在會議、簡報或重要對話中更能說出真實想法',
    advisor: '若需求牽涉上台、面試或重要對話，系統會把喉輪與眉心輪一起納入判讀。'
  },
  {
    label: '自信展現',
    priority: 7,
    keywords: ['自信', '勇氣', '舞台', '發光', '展現', '行動力', '膽怯', '害怕', '被看見', '表現'],
    name: '太陽石、金髮晶',
    desc: '補足面對挑戰時的亮度與膽識，協助你在需要被看見的場合更穩定地展現自己',
    advisor: '自信展現會和財運、表達分開處理，避免每個想發光的需求都被判成同一種招財方向。'
  }
];

function copyStateRuleWithScore(rule, score, keywordHits) {
  return {
    label: rule.label,
    priority: rule.priority,
    keywords: rule.keywords,
    name: rule.name,
    desc: rule.desc,
    advisor: rule.advisor,
    score: score,
    keywordHits: keywordHits
  };
}

function analyzeStateNeeds(description, energyGoal) {
  const descriptionText = normalizeRuleInput(description);
  const goalSelections = splitSelectionList(energyGoal);
  const text = (descriptionText + ' ' + normalizeRuleInput(energyGoal)).trim();
  if (!text) {
    return { primary: null, secondary: [], matches: [], summary: '未填寫明確狀態描述，先以生日、色系與勾選目標作為主要分析依據。' };
  }

  const scored = [];
  for (let i = 0; i < STATE_NEED_RULES.length; i++) {
    const rule = STATE_NEED_RULES[i];
    const descriptionHits = countKeywordMatches(descriptionText, rule.keywords);
    let goalHits = 0;
    for (let j = 0; j < goalSelections.length; j++) {
      if (textContainsAny(goalSelections[j], rule.keywords)) {
        goalHits++;
      }
    }
    const keywordHits = descriptionHits + goalHits;
    if (!keywordHits) {
      continue;
    }
    const urgencyBonus = rule.priority <= 2 ? 1.5 : (rule.priority === 3 ? 0.75 : 0);
    const totalScore = descriptionHits * 2.5 + goalHits * 1.25 + urgencyBonus;
    scored.push(copyStateRuleWithScore(rule, totalScore, keywordHits));
  }

  scored.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.priority - b.priority;
  });

  const primary = scored.length ? scored[0] : null;
  const secondary = scored.slice(1, 3);
  return {
    primary: primary,
    secondary: secondary,
    matches: scored.slice(0, 4),
    summary: formatStatePrioritySummary({ primary: primary, secondary: secondary, matches: scored.slice(0, 4) })
  };
}

/**
 * 從狀態描述與期望目標判斷目前最需要被支援的生活狀態。
 */
function resolveStateNeedInfo(description, energyGoal) {
  return analyzeStateNeeds(description, energyGoal).primary;
}

function formatStatePrioritySummary(analysis) {
  if (!analysis || !analysis.primary) {
    return '未填寫明確狀態描述，先以生日、色系與勾選目標作為主要分析依據。';
  }
  const primary = analysis.primary;
  const secondaryLabels = (analysis.secondary || []).map(function(item) {
    return item.label;
  });
  const secondaryText = secondaryLabels.length ? '，再輔助照顧「' + secondaryLabels.join('、') + '」' : '';
  return '系統優先判讀為「' + primary.label + '」' + secondaryText + '。' + primary.advisor;
}

function getStateCrystalNames(analysis, maxRules) {
  if (!analysis || !analysis.matches || !analysis.matches.length) {
    return '';
  }
  const groups = [];
  const count = maxRules || 2;
  for (let i = 0; i < analysis.matches.length && i < count; i++) {
    groups.push(analysis.matches[i].name);
  }
  return mergeCrystalGroups(groups);
}

/**
 * 合併多組晶種文字並移除重複項。
 */
function mergeCrystalGroups(groups) {
  const items = [];
  const seen = {};

  for (let i = 0; i < groups.length; i++) {
    if (!groups[i]) {
      continue;
    }
    const parts = String(groups[i])
      .split(/\s*(?:、|，|,|\+|與|配搭|和)\s*/)
      .map(function(item) {
        return item.trim();
      })
      .filter(function(item) {
        return item !== '';
      });

    for (let j = 0; j < parts.length; j++) {
      const key = parts[j].replace(/[（(].*?[）)]/g, '').trim();
      if (key && !seen[key]) {
        items.push(parts[j]);
        seen[key] = true;
      }
    }
  }

  return items.join('、');
}

const CRYSTAL_SCORING_DATABASE = [
  { name: '白水晶', colors: ['白色透明', '透明', '白色', '白色系'], chakras: ['頂輪', '眉心輪'], goals: ['智慧與專注力', '健康與心靈療癒'], states: ['專注與思緒清明', '放鬆睡眠與情緒安定'], lifePaths: [9], elements: ['金、土', '水、金'], zodiac: [], chinese: ['鼠', '猴'], budgetLevels: [1, 2, 3, 4, 5], desc: '淨化與放大整體能量，讓思緒回到清明狀態' },
  { name: '紫水晶', colors: ['紫色', '紫色系'], chakras: ['頂輪', '眉心輪'], goals: ['健康與心靈療癒', '智慧與專注力'], states: ['放鬆睡眠與情緒安定', '專注與思緒清明'], lifePaths: [7], elements: [], zodiac: ['處女座'], chinese: ['羊'], budgetLevels: [1, 2, 3, 4, 5], desc: '安定思緒、沉澱焦躁，適合睡前關機與智慧整理' },
  { name: '粉水晶', colors: ['粉色', '粉紅', '粉紅色系'], chakras: ['心輪'], goals: ['桃花與人緣', '感情與婚姻'], states: ['感情與人緣修復'], lifePaths: [6], elements: [], zodiac: [], chinese: [], budgetLevels: [1, 2, 3, 4, 5], desc: '照顧愛與安全感，支援自我接納、人緣與關係修復' },
  { name: '草莓晶', colors: ['粉色', '紅色'], chakras: ['心輪'], goals: ['桃花與人緣', '感情與婚姻'], states: ['感情與人緣修復', '自信展現'], lifePaths: [6], elements: [], zodiac: [], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '提升柔和吸引力與人際甜度，適合想被善待與被看見的階段' },
  { name: '紅紋石', colors: ['紅色', '粉色'], chakras: ['心輪'], goals: ['感情與婚姻', '桃花與人緣', '健康與心靈療癒'], states: ['感情與人緣修復', '自信展現'], lifePaths: [], elements: ['火、土'], zodiac: [], chinese: ['龍'], budgetLevels: [2, 3, 4, 5], desc: '補充熱情、心力與被愛感，適合感情修復與重新啟動行動' },
  { name: '月光石', colors: ['白色透明', '橙色', '粉色'], chakras: ['臍輪', '心輪'], goals: ['健康與心靈療癒', '感情與婚姻'], states: ['放鬆睡眠與情緒安定', '感情與人緣修復'], lifePaths: [], elements: [], zodiac: ['巨蟹座'], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '安撫情緒起伏，支援柔軟、睡眠與內在安全感' },
  { name: '橙月光石', colors: ['橙色', '橘色'], chakras: ['臍輪'], goals: ['桃花與人緣', '健康與心靈療癒'], states: ['感情與人緣修復', '放鬆睡眠與情緒安定'], lifePaths: [2], elements: [], zodiac: [], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '讓情緒與人際流動回到溫暖節奏，適合敏感、需要被接住的狀態' },
  { name: '太陽石', colors: ['橙色', '黃金色', '金色'], chakras: ['太陽神經叢', '臍輪'], goals: ['招偏財/業績/守財', '招正財/事業運'], states: ['自信展現', '財運與事業推進'], lifePaths: [2], elements: [], zodiac: ['牡羊座'], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '補充亮度、勇氣與舞台感，讓行動更有熱度' },
  { name: '金太陽石', colors: ['黃金色', '金色', '橙色'], chakras: ['太陽神經叢'], goals: ['招正財/事業運', '招偏財/業績/守財'], states: ['自信展現', '財運與事業推進'], lifePaths: [8], elements: ['木、火'], zodiac: [], chinese: ['馬'], budgetLevels: [2, 3, 4, 5], desc: '推動執行魄力與財運亮度，適合需要發光與衝刺的階段' },
  { name: '黃水晶', colors: ['黃金色', '黃色', '金色'], chakras: ['太陽神經叢'], goals: ['招正財/事業運', '招偏財/業績/守財'], states: ['財運與事業推進', '自信展現'], lifePaths: [3], elements: ['金、土'], zodiac: [], chinese: ['牛'], budgetLevels: [1, 2, 3, 4, 5], desc: '聚焦財氣、自信與行動力，適合事業推進與資源累積' },
  { name: '金髮晶', colors: ['黃金色', '金色'], chakras: ['太陽神經叢'], goals: ['招偏財/業績/守財', '招正財/事業運'], states: ['財運與事業推進', '自信展現'], lifePaths: [3], elements: [], zodiac: ['天秤座'], chinese: ['雞'], budgetLevels: [3, 4, 5], desc: '提升財運磁場與決策膽識，適合需要衝業績與被看見的時刻' },
  { name: '鈦晶', colors: ['黃金色', '黑色'], chakras: ['太陽神經叢', '海底輪'], goals: ['招偏財/業績/守財', '招正財/事業運'], states: ['財運與事業推進', '自信展現'], lifePaths: [8], elements: [], zodiac: ['獅子座'], chinese: [], budgetLevels: [4, 5], desc: '強化企圖心、財富格局與抗壓氣勢，適合高強度目標' },
  { name: '綠幽靈', colors: ['綠色', '木質'], chakras: ['心輪'], goals: ['招正財/事業運'], states: ['財運與事業推進', '感情與人緣修復'], lifePaths: [4], elements: ['木、火'], zodiac: ['金牛座'], chinese: ['虎'], budgetLevels: [2, 3, 4, 5], desc: '連結事業成長與心輪修復，適合正財、穩定發展與長期累積' },
  { name: '葡萄石', colors: ['綠色'], chakras: ['心輪'], goals: ['招正財/事業運', '健康與心靈療癒'], states: ['感情與人緣修復', '放鬆睡眠與情緒安定'], lifePaths: [4], elements: [], zodiac: ['金牛座'], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '柔和修復心輪與壓力，讓財務、人緣與療癒感更平衡' },
  { name: '綠髮晶', colors: ['綠色'], chakras: ['心輪', '太陽神經叢'], goals: ['招正財/事業運'], states: ['財運與事業推進'], lifePaths: [], elements: [], zodiac: [], chinese: ['蛇'], budgetLevels: [3, 4, 5], desc: '支援正財與事業拓展，適合想累積成果與提高行動續航' },
  { name: '海藍寶', colors: ['藍色'], chakras: ['喉輪'], goals: ['智慧與專注力', '健康與心靈療癒'], states: ['表達溝通', '放鬆睡眠與情緒安定'], lifePaths: [5], elements: ['水、金'], zodiac: ['雙魚座'], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '讓表達更溫和清楚，也能替焦躁情緒降溫' },
  { name: '天河石', colors: ['藍色', '綠色'], chakras: ['喉輪', '心輪'], goals: ['智慧與專注力', '健康與心靈療癒'], states: ['表達溝通', '放鬆睡眠與情緒安定'], lifePaths: [5], elements: [], zodiac: ['雙子座'], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '平衡理性表達與情緒壓力，適合需要說清楚又保持柔和的場景' },
  { name: '青金石', colors: ['藍色'], chakras: ['眉心輪', '喉輪'], goals: ['智慧與專注力'], states: ['專注與思緒清明', '表達溝通'], lifePaths: [7], elements: [], zodiac: ['射手座'], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '支援洞察、判斷與清楚表達，適合決策、考試與簡報' },
  { name: '螢石', colors: ['紫色', '綠色', '白色透明'], chakras: ['眉心輪'], goals: ['智慧與專注力'], states: ['專注與思緒清明'], lifePaths: [], elements: [], zodiac: [], chinese: [], budgetLevels: [1, 2, 3, 4, 5], desc: '整理混亂資訊與專注力，適合腦袋打結、需要清楚排序時' },
  { name: '黑曜石', colors: ['黑色'], chakras: ['海底輪'], goals: ['避邪與防小人'], states: ['界線防護'], lifePaths: [1], elements: [], zodiac: [], chinese: [], budgetLevels: [1, 2, 3, 4, 5], desc: '建立界線與防護，排除不必要消耗與外界干擾' },
  { name: '黑髮晶', colors: ['黑色'], chakras: ['海底輪'], goals: ['避邪與防小人'], states: ['界線防護'], lifePaths: [1], elements: [], zodiac: [], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '強化防護、穩定與抗干擾力，適合職場界線與外界雜訊' },
  { name: '黑鈦晶', colors: ['黑色', '黃金色'], chakras: ['海底輪', '太陽神經叢'], goals: ['避邪與防小人', '招偏財/業績/守財'], states: ['界線防護', '財運與事業推進'], lifePaths: [], elements: [], zodiac: [], chinese: [], budgetLevels: [4, 5], desc: '同時具備防護與財氣推進感，適合高壓環境下守住氣場' },
  { name: '茶晶', colors: ['木質', '黑色'], chakras: ['海底輪'], goals: ['避邪與防小人', '招偏財/業績/守財'], states: ['界線防護', '放鬆睡眠與情緒安定'], lifePaths: [], elements: ['火、土'], zodiac: ['摩羯座'], chinese: ['狗'], budgetLevels: [1, 2, 3, 4, 5], desc: '讓能量落地、穩住節奏，適合疲憊、防護與守財' },
  { name: '拉長石', colors: ['藍色', '黑色', '白色透明'], chakras: ['眉心輪', '頂輪'], goals: ['桃花與人緣', '避邪與防小人', '健康與心靈療癒'], states: ['界線防護', '感情與人緣修復', '專注與思緒清明'], lifePaths: [], elements: [], zodiac: ['天蠍座', '水瓶座'], chinese: [], budgetLevels: [2, 3, 4, 5], desc: '守護敏感能量與直覺，適合需要防護、轉化與內在洞察時' },
  { name: '藍砂石', colors: ['藍色', '黑色'], chakras: ['眉心輪'], goals: ['智慧與專注力', '避邪與防小人'], states: ['專注與思緒清明', '界線防護'], lifePaths: [], elements: [], zodiac: [], chinese: ['兔'], budgetLevels: [1, 2, 3, 4, 5], desc: '穩定思緒與夜間能量，適合想安定、收束注意力的時候' },
  { name: '藍碧璽', colors: ['藍色'], chakras: ['喉輪', '眉心輪'], goals: ['智慧與專注力', '健康與心靈療癒'], states: ['表達溝通', '專注與思緒清明'], lifePaths: [], elements: [], zodiac: [], chinese: ['豬'], budgetLevels: [5], desc: '支援深度溝通、直覺與精細思考，適合高預算的精緻配置' },
  { name: '舒俱徠石', colors: ['紫色'], chakras: ['頂輪', '心輪'], goals: ['健康與心靈療癒'], states: ['放鬆睡眠與情緒安定', '感情與人緣修復'], lifePaths: [9], elements: [], zodiac: [], chinese: [], budgetLevels: [5], desc: '照顧深層療癒與高頻安定，適合需要強力心靈支持的高預算配置' }
];

function getBudgetLevel(budget) {
  const text = normalizeRuleInput(budget);
  if (!text || text.indexOf('不限') !== -1) return 0;
  if (/10,?000以上/.test(text)) return 5;
  if (/5,?000.*10,?000/.test(text)) return 4;
  if (/3,?000.*5,?000/.test(text)) return 3;
  if (/1,?000.*3,?000/.test(text)) return 2;
  if (/1,?000以下/.test(text)) return 1;
  return 0;
}

function listContainsAny(list, values) {
  if (!list || !values || !list.length || !values.length) return false;
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < values.length; j++) {
      if (list[i] === values[j] || list[i].indexOf(values[j]) !== -1 || values[j].indexOf(list[i]) !== -1) {
        return true;
      }
    }
  }
  return false;
}

function normalizeCrystalName(name) {
  return String(name || '').replace(/[（(].*?[）)]/g, '').trim();
}

function parseCrystalNames(value) {
  return String(value || '')
    .split(/\s*(?:、|，|,|\+|與|配搭|和)\s*/)
    .map(normalizeCrystalName)
    .filter(function(item) {
      return item !== '';
    });
}

function getCrystalRecord(name) {
  const normalized = normalizeCrystalName(name);
  for (let i = 0; i < CRYSTAL_SCORING_DATABASE.length; i++) {
    if (CRYSTAL_SCORING_DATABASE[i].name === normalized) {
      return CRYSTAL_SCORING_DATABASE[i];
    }
  }
  return {
    name: normalized,
    colors: [],
    chakras: [],
    goals: [],
    states: [],
    lifePaths: [],
    elements: [],
    zodiac: [],
    chinese: [],
    budgetLevels: [1, 2, 3, 4, 5],
    desc: '作為整體能量配置的補充晶種'
  };
}

function addScore(scoreObj, points, reason) {
  if (points === 0) return;
  scoreObj.score += points;
  if (points > 0 && reason) {
    scoreObj.reasons.push(reason);
  }
}

function scoreCrystalForRole(crystal, context, role) {
  const result = {
    name: crystal.name,
    crystal: crystal,
    score: 0,
    reasons: []
  };

  const roleWeights = {
    core: { life: 6, element: 5, color: 3, goal: 1, state: 1, chakra: 1, zodiac: 0, chinese: 0, budget: 1 },
    healing: { life: 1, element: 0, color: 2, goal: 3, state: 5, chakra: 5, zodiac: 0, chinese: 0, budget: 1 },
    guardian: { life: 0, element: 1, color: 1, goal: 2, state: 2, chakra: 0, zodiac: 5, chinese: 4, budget: 1 }
  };
  const weights = roleWeights[role] || roleWeights.core;

  if (crystal.lifePaths && crystal.lifePaths.indexOf(context.lifePath.number) !== -1) {
    addScore(result, weights.life, '生命靈數 ' + context.lifePath.number);
  }
  if (crystal.elements && crystal.elements.indexOf(context.fiveElements.deficiency) !== -1) {
    addScore(result, weights.element, '五行補 ' + context.fiveElements.deficiency);
  }
  if (listContainsAny(crystal.colors, context.colorSelections)) {
    addScore(result, weights.color, '偏好色系');
  }
  if (listContainsAny(crystal.goals, context.goalSelections)) {
    addScore(result, weights.goal, '期望目標');
  }
  if (context.stateAnalysis && context.stateAnalysis.matches && context.stateAnalysis.matches.length) {
    for (let i = 0; i < context.stateAnalysis.matches.length; i++) {
      const stateMatch = context.stateAnalysis.matches[i];
      if (crystal.states && crystal.states.indexOf(stateMatch.label) !== -1) {
        const statePoints = i === 0 ? weights.state : Math.max(1, Math.round(weights.state * 0.6));
        addScore(result, statePoints, i === 0 ? '主要狀態：' + stateMatch.label : '次要狀態：' + stateMatch.label);
      }
    }
  } else if (context.stateInfo && crystal.states && crystal.states.indexOf(context.stateInfo.label) !== -1) {
    addScore(result, weights.state, '狀態描述');
  }
  if (listContainsAny(crystal.chakras, context.chakraSelections)) {
    addScore(result, weights.chakra, '脈輪能量');
  }
  if (crystal.zodiac && crystal.zodiac.indexOf(context.zodiacSign) !== -1) {
    addScore(result, weights.zodiac, context.zodiacSign);
  }
  if (crystal.chinese && crystal.chinese.indexOf(context.chineseZodiac) !== -1) {
    addScore(result, weights.chinese, context.chineseZodiac + '年');
  }

  if (context.budgetLevel && crystal.budgetLevels && crystal.budgetLevels.length) {
    if (crystal.budgetLevels.indexOf(context.budgetLevel) !== -1) {
      addScore(result, weights.budget, '預算適配');
    } else if (Math.min.apply(null, crystal.budgetLevels) > context.budgetLevel) {
      addScore(result, -2, '');
    }
  }

  return result;
}

function createCrystalNameMap(value) {
  const map = {};
  if (!value) {
    return map;
  }
  const names = Array.isArray(value)
    ? value.map(function(item) {
        return item && item.name ? item.name : item;
      })
    : parseCrystalNames(value);
  for (let i = 0; i < names.length; i++) {
    const key = normalizeCrystalName(names[i]);
    if (key) {
      map[key] = true;
    }
  }
  return map;
}

function selectScoredCrystals(context, role, limit, fallbackNames, excludedNames) {
  const excluded = createCrystalNameMap(excludedNames);
  const scored = CRYSTAL_SCORING_DATABASE
    .map(function(crystal, index) {
      const result = scoreCrystalForRole(crystal, context, role);
      result.index = index;
      return result;
    })
    .filter(function(item) {
      return item.score > 0;
    })
    .sort(function(a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });

  const selected = [];
  const seen = {};
  for (let pass = 0; pass < 2 && selected.length < limit; pass++) {
    for (let i = 0; i < scored.length && selected.length < limit; i++) {
      const key = normalizeCrystalName(scored[i].name);
      const isExcluded = !!excluded[key];
      if (!seen[key] && (pass === 1 || !isExcluded)) {
        const item = scored[i];
        if (isExcluded) {
          item.reasons = item.reasons.concat(['跨組關鍵補位']);
        }
        selected.push(item);
        seen[key] = true;
      }
    }
  }

  const fallbacks = parseCrystalNames(fallbackNames || '');
  for (let pass = 0; pass < 2 && selected.length < limit; pass++) {
    for (let j = 0; j < fallbacks.length && selected.length < limit; j++) {
      const fallbackKey = normalizeCrystalName(fallbacks[j]);
      const isExcluded = !!excluded[fallbackKey];
      if (!seen[fallbackKey] && (pass === 1 || !isExcluded)) {
        selected.push({
          name: fallbackKey,
          crystal: getCrystalRecord(fallbackKey),
          score: 0,
          reasons: [isExcluded ? '跨組關鍵補位' : '基礎配置']
        });
        seen[fallbackKey] = true;
      }
    }
  }

  return selected;
}

function formatSelectedCrystalNames(selected) {
  return selected.map(function(item) {
    return item.name;
  }).join('、');
}

function chooseRequiredCrystalNames(requiredNames, avoidedNames) {
  const required = parseCrystalNames(requiredNames || '');
  if (!required.length) {
    return '';
  }
  const avoided = createCrystalNameMap(avoidedNames);
  const fresh = [];
  for (let i = 0; i < required.length; i++) {
    const key = normalizeCrystalName(required[i]);
    if (key && !avoided[key]) {
      fresh.push(key);
    }
  }
  return (fresh.length ? fresh : [required[0]]).join('、');
}

function summarizeScoredSelection(selected) {
  return selected.slice(0, 4).map(function(item) {
    const reasons = item.reasons.length ? item.reasons.slice(0, 3).join('、') : '整體平衡';
    return item.name + '（' + reasons + '）';
  }).join('；');
}

function ensureSelectedCrystals(selected, requiredNames, reason, limit) {
  const updated = selected.slice();
  const seen = {};
  for (let i = 0; i < updated.length; i++) {
    seen[normalizeCrystalName(updated[i].name)] = true;
  }

  const required = parseCrystalNames(requiredNames || '');
  const requiredMap = {};
  for (let i = 0; i < required.length; i++) {
    requiredMap[normalizeCrystalName(required[i])] = true;
  }
  let replaceCursor = limit - 1;

  for (let j = 0; j < required.length; j++) {
    const key = normalizeCrystalName(required[j]);
    if (!key || seen[key]) {
      continue;
    }
    const item = {
      name: key,
      crystal: getCrystalRecord(key),
      score: 0,
      reasons: [reason || '指定模組']
    };
    if (updated.length < limit) {
      updated.push(item);
    } else {
      while (replaceCursor >= 0 && requiredMap[normalizeCrystalName(updated[replaceCursor].name)]) {
        replaceCursor--;
      }
      const targetIndex = replaceCursor >= 0 ? replaceCursor : limit - 1;
      delete seen[normalizeCrystalName(updated[targetIndex].name)];
      updated[targetIndex] = item;
      replaceCursor = targetIndex - 1;
    }
    seen[key] = true;
  }

  return updated;
}

function findCrystalNameByField(field, value) {
  if (!value) return '';
  for (let i = 0; i < CRYSTAL_SCORING_DATABASE.length; i++) {
    const values = CRYSTAL_SCORING_DATABASE[i][field] || [];
    if (values.indexOf(value) !== -1) {
      return CRYSTAL_SCORING_DATABASE[i].name;
    }
  }
  return '';
}

/**
 * 本地分析模組推薦引擎實作
 */
function generateRuleBasedRecommendation(data) {
  const name = data.name || '';
  const gender = data.gender || '未提供';
  const wristSize = data.wristSize || '';
  const birthDate = data.birthDate || '';
  const targetChakra = data.targetChakra || '';
  const colorPreference = data.colorPreference || '';
  const energyGoal = data.energyGoal || '';
  const description = data.description || '';
  const budget = data.budget || '';

  const lifePath = calculateLifePathNumber(birthDate);
  const fiveElements = calculateFiveElements(birthDate);
  const zodiacSign = calculateZodiacSign(birthDate);
  const chineseZodiac = calculateChineseZodiac(birthDate);
  const colorInfo = resolveColorPreferenceInfo(colorPreference);
  const stateAnalysis = analyzeStateNeeds(description, energyGoal);
  const stateInfo = stateAnalysis.primary;
  const colorSelections = splitSelectionList(colorPreference).filter(function(item) {
    return item !== '不限';
  });
  const goalSelections = splitSelectionList(energyGoal);
  const chakraSelections = splitSelectionList(targetChakra);
  const primaryChakra = chakraSelections.length ? chakraSelections[0] : '心輪';

  const context = {
    lifePath: lifePath,
    fiveElements: fiveElements,
    zodiacSign: zodiacSign,
    chineseZodiac: chineseZodiac,
    colorSelections: colorSelections,
    goalSelections: goalSelections,
    chakraSelections: chakraSelections.length ? chakraSelections : [primaryChakra],
    stateInfo: stateInfo,
    stateAnalysis: stateAnalysis,
    budgetLevel: getBudgetLevel(budget)
  };

  let braceletASelection = selectScoredCrystals(
    context,
    'core',
    4,
    colorInfo ? colorInfo.name : '白水晶、茶晶'
  );
  braceletASelection = ensureSelectedCrystals(braceletASelection, colorInfo ? colorInfo.name : '', '偏好色系', 4);
  const braceletANames = formatSelectedCrystalNames(braceletASelection);

  const stateCrystalNames = stateInfo ? getStateCrystalNames(stateAnalysis, 2) : '粉水晶、葡萄石';
  const braceletBRequiredNames = chooseRequiredCrystalNames(stateCrystalNames, braceletANames);
  let braceletBSelection = selectScoredCrystals(
    context,
    'healing',
    4,
    stateCrystalNames,
    braceletANames
  );
  braceletBSelection = ensureSelectedCrystals(braceletBSelection, braceletBRequiredNames, '狀態描述', 4);
  const braceletBNames = formatSelectedCrystalNames(braceletBSelection);
  const usedBeforeC = mergeCrystalGroups([braceletANames, braceletBNames]);

  const zodiacCrystalName = findCrystalNameByField('zodiac', zodiacSign);
  const chineseZodiacCrystalName = findCrystalNameByField('chinese', chineseZodiac);
  const guardianRequiredNames = chooseRequiredCrystalNames(mergeCrystalGroups([zodiacCrystalName, chineseZodiacCrystalName]), usedBeforeC);
  let braceletCSelection = selectScoredCrystals(
    context,
    'guardian',
    3,
    '拉長石、紫水晶、白水晶',
    usedBeforeC
  );
  braceletCSelection = ensureSelectedCrystals(braceletCSelection, guardianRequiredNames, '星座生肖', 3);

  const braceletACrystals = braceletANames;
  const braceletBCrystals = braceletBNames;
  const braceletCCrystals = formatSelectedCrystalNames(braceletCSelection);
  const statePrioritySummary = formatStatePrioritySummary(stateAnalysis);

  // 手鍊 A
  const braceletA = [
    '📿 【手鍊 A — 主命宮能量手鍊】',
    '【分析模組】：生命靈數 ' + lifePath.formula + '；出生季節 ' + fiveElements.season + ' -> 補 ' + fiveElements.deficiency,
    '【色系調和】：' + (colorInfo ? '依偏好色系「' + colorInfo.label + '」加入 ' + colorInfo.name + '（' + colorInfo.desc + '）' : '未指定偏好色系，先以命格與五行平衡為主'),
    '【水晶搭配】：' + braceletACrystals,
    '【評分摘要】：' + summarizeScoredSelection(braceletASelection),
    '【能量解說】：本款手鍊以先天命格為主軸，系統會同時讀取生命靈數、出生季節五行缺口、偏好色系與預算範圍，從水晶資料庫中加權挑選最能穩固底氣的晶種。' + (colorInfo ? '其中「' + colorInfo.label + '」會提高同色系晶種分數，讓能量方向與外觀感受更貼近您的直覺喜好。' : '') + '這組配置負責替整體能量場打底，讓後續客製設計更有核心方向。'
  ].join('\n');

  // 手鍊 B
  const braceletB = [
    '📿 【手鍊 B — 心靈平衡療癒手鍊】',
    '【分析模組】：基於您目前最需要調和的脈輪（' + primaryChakra + '）' + (stateInfo ? '，並結合狀態描述判讀出的「' + stateInfo.label + '」需求' : '') + '後天客製',
    '【狀態判讀】：' + statePrioritySummary + (stateInfo ? ' 建議以 ' + stateCrystalNames + ' 作為後天狀態修復的主軸。' : ''),
    '【水晶搭配】：' + braceletBCrystals,
    '【評分摘要】：' + summarizeScoredSelection(braceletBSelection),
    '【能量解說】：本款手鍊以後天狀態修復為主軸，系統會優先提高目標脈輪、期望目標與狀態描述命中的晶種分數。若文字中出現焦慮、失眠、職場消耗、感情受傷、專注困難等訊號，推薦會自動轉向對應的療癒、防護、安定或清明晶種，讓分析更貼近當下真正需要被照顧的狀態。'
  ].join('\n');

  // 手鍊 C
  const braceletC = [
    '📿 【手鍊 C — 流年幸運守護手鍊】',
    '【分析模組】：基於您的西方星座（' + zodiacSign + '）與東方生肖（' + chineseZodiac + '年）雙重幸運神護持',
    '【水晶搭配】：' + braceletCCrystals,
    '【評分摘要】：' + summarizeScoredSelection(braceletCSelection),
    '【能量解說】：本款手鍊以流年守護與外在機會為主軸，系統會提高星座、生肖、避邪防護、貴人緣與年度狀態相關晶種分數。它不是只看單一星座幸運石，而是把星座生肖與您填寫的目標一起加權，形成更適合日常角色切換的守護方向。'
  ].join('\n');

  // 總報告組合
  const caringMsg = getCaringMessage(data.energyGoal);

  const fullReport = [
    '🔮 【多維度精密能量評估報告】',
    '親愛的 ' + (name || '貴賓') + '，根據我們精密分析您的國曆生日等神祕學數據，為您量身配置以下三款專屬水晶手鍊：',
    '【基本資料】：性別 ' + gender + '；專屬品項 手鍊/手環；淨手圍 ' + (wristSize ? wristSize + ' cm' : '未提供'),
    '【狀態優先】：' + statePrioritySummary,
    '',
    braceletA,
    '',
    braceletB,
    '',
    braceletC,
    '',
    '🧘 【配戴與消磁儀式建議】',
    '- 淨手圍為 ' + (wristSize ? wristSize + ' cm' : '15-16 cm') + '，手鍊將依此手圍為您精準定制穿線。',
    '- 建議左手配戴「手鍊 A」與「手鍊 C」用以吸納先天本命與幸運守護能量。',
    '- 若「手鍊 B」包含避邪排除類水晶（如茶晶、黑曜石），請配戴在右手以利排出濁氣與負能量。',
    '- 收到水晶後，請置於白水晶碎石中進行 4 小時以上消磁，並虔誠設定您的祈願意圖。',
    '',
    '💬 【暖心陪伴語】',
    caringMsg,
    '',
    '✨ 以上為您量身推薦的水晶種類，歡迎聯絡我們進行專業100%專屬客製化手鍊設計！'
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
    '請根據以下顧客的個人資料與神秘學計算參數，為他進行極具專業度與信服力的水晶能量評估，並量身客製化打造三款獨一無二的水晶手鍊。',
    '',
    '【顧客諮詢與計算參數】',
    '- 顧客姓名：' + (name || '未填寫'),
    '- 性別：' + (gender || '未提供'),
    '- 生日：' + (birthDate || '未提供') + ' ' + (birthTime || ''),
    '- 專屬品項：' + (preference || '手鍊/手環'),
    '- 淨手圍：' + (wristSize ? wristSize + ' cm' : '未提供'),
    '- 偏好色系：' + (colorPreference || '不限'),
    '- 期望改善目標：' + (energyGoal || '未填寫'),
    '- 自評需平衡脈輪：' + (targetChakra || '未勾選'),
    '- 目前狀態/困擾描述：' + (description || '無特別描述'),
    '- 預算範圍：' + (budget || '不限預算'),
    '- 啟用的分析模組：' + (calculationMethod || '全部啟用'),
    '',
    '【神秘學精準計算結果】',
    '- 生命靈數：' + lifePath.number + ' 號人 (分析模組：' + lifePath.formula + ')',
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
    '📿 第二段：【手鍊 A — 主命宮能量手鍊】',
    '【分析模組】：基於「生命靈數 ' + lifePath.number + ' 號」與「生辰五行缺 ' + fiveElements.deficiency + '」的先天調和設計。',
    '詳細說明此款手鍊選用的 2-3 種主水晶（必須考量偏好色系與預算），解釋其如何補充先天缺失並注入主命宮能量。請在此行寫出：『【分析模組】：生命靈數 ' + lifePath.formula + '；出生季節 ' + fiveElements.season + ' -> 補 ' + fiveElements.deficiency + '』。',
    '',
    '📿 第三段：【手鍊 B — 心靈平衡療癒手鍊】',
    '【分析模組】：基於顧客勾選的脈輪能量缺口（' + (targetChakra || '心輪/海底輪') + '）後天調和設計。',
    '詳細說明此款手鍊選用的 2-3 種療癒水晶，說明其如何針對當前的情緒壓力、失眠或焦慮進行脈輪疏通，平衡後天心靈流動。',
    '',
    '📿 第四段：【手鍊 C — 流年幸運守護手鍊】',
    '【分析模組】：基於「星座：' + zodiacSign + '」與「生肖：' + chineseZodiac + '」的雙重幸運物守護設計。',
    '詳細說明此款手鍊選用的 2-3 種守護水晶，解釋其如何增強流年運氣、辟邪擋煞、防小人並招來貴人緣。',
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
  console.log('=== 測試多維度精密能量客製分析模組 ===');
  const testObject = {
    name: '林阿真',
    gender: '女性',
    birthDate: '2001-11-25',
    birthTime: '15:30',
    preference: '手鍊/手環',
    wristSize: '15.0',
    colorPreference: ['粉色', '紫色'],
    energyGoal: ['桃花與人緣', '健康與心靈療癒'],
    targetChakra: ['心輪', '眉心輪'],
    calculationMethod: ['生命靈數', '生辰五行', '脈輪能量', '星座生肖'],
    description: '最近感到壓力比較大，希望能增加好人緣，順便釋放焦慮情緒',
    budget: '$1,000-$3,000'
  };

  const resultObj = generateRecommendation(testObject);
  console.log('推薦結果：\n' + resultObj);
}

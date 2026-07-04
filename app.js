const scenes = [
  {
    name: "職場防小人",
    cue: "界線清楚，拒絕消耗",
    color: "#4b2d5f",
  },
  {
    name: "上台發光",
    cue: "簡報、面試、被看見",
    color: "#b78b3e",
  },
  {
    name: "深度關機沉睡",
    cue: "睡前把腦袋轉慢",
    color: "#223f68",
  },
  {
    name: "人際柔和",
    cue: "好好說話，不硬碰硬",
    color: "#c77a74",
  },
  {
    name: "財運行動",
    cue: "想賺錢，也願意動起來",
    color: "#1f6f67",
  },
  {
    name: "戀愛自信",
    cue: "心動但不失去自己",
    color: "#a05f87",
  },
  {
    name: "情緒穩定",
    cue: "先穩住，再處理世界",
    color: "#6f8165",
  },
];

const products = [
  {
    id: "work-shield",
    name: "無敵拒絕職場小人款",
    scene: "職場防小人",
    type: "客制手鍊",
    color: "黑紫透",
    price: 2200,
    custom: true,
    crystals: "黑曜石、白水晶、紫水晶、茶晶",
    effect: "界線、防護、專注",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合總是被臨時塞事、需要練習拒絕的人。",
    moment: "開會、協調、進辦公室前配戴，提醒自己把界線放回身上。",
    care: "以白水晶碎石或靜置淨化，避免長時間泡水。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#21172b", "#5d3c72", "#f5f0e8", "#6b4f3f"],
  },
  {
    id: "meeting-soft",
    name: "會議不爆炸溝通款",
    scene: "職場防小人",
    type: "客制手鍊",
    color: "藍白灰",
    price: 1880,
    custom: true,
    crystals: "海藍寶、白水晶、灰月光、拉長石",
    effect: "溝通、冷靜、降低火氣",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合一開會就想翻白眼，但還是需要把話說漂亮的人。",
    moment: "會議、談合作、回覆訊息前配戴，讓語氣先降溫。",
    care: "以月光或白水晶淨化，避免強烈日曬。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#93b6c7", "#eff4f1", "#7d858a", "#596d76"],
  },
  {
    id: "stage-mercury",
    name: "水星溝通爆棚款",
    scene: "上台發光",
    type: "客制手鍊",
    color: "藍金白",
    price: 1980,
    custom: true,
    crystals: "青金石、黃水晶、白水晶、藍紋瑪瑙",
    effect: "表達、自信、思路清楚",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合需要上台簡報、面試或把想法講到重點的人。",
    moment: "上台前 15 分鐘配戴，搭配三次深呼吸整理說話節奏。",
    care: "以白水晶碎石淨化，避免碰撞造成表面刮痕。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#1f3f78", "#d8a63f", "#f9f6ec", "#6b90bb"],
  },
  {
    id: "spotlight",
    name: "上台簡報發光款",
    scene: "上台發光",
    type: "客制手鍊",
    color: "金白透",
    price: 1880,
    custom: true,
    crystals: "黃水晶、太陽石、白水晶、金髮晶",
    effect: "亮度、行動、舞台感",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合已經準備好內容，只差一點氣場的人。",
    moment: "面試、發表、直播或需要被看見的當天配戴。",
    care: "以乾布擦拭，避免長時間曝曬讓配件加速氧化。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#d8a63f", "#f8efe0", "#c77841", "#fff9e7"],
  },
  {
    id: "deep-sleep",
    name: "靈魂深度關機沉睡款",
    scene: "深度關機沉睡",
    type: "客制手鍊",
    color: "紫藍黑",
    price: 1980,
    custom: true,
    crystals: "紫水晶、黑碧璽、月光石、白水晶",
    effect: "睡眠、放鬆、停止過度思考",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合睡前腦袋轉不停、越累越難睡的人。",
    moment: "睡前一小時配戴或放在床邊，搭配不滑手機的關機儀式。",
    care: "以白水晶或月光淨化，睡覺時可放床邊避免壓到彈力線。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#5d3c72", "#16151e", "#b8bfd1", "#eef3f4"],
  },
  {
    id: "mind-empty",
    name: "睡前清空腦袋款",
    scene: "深度關機沉睡",
    type: "客制手鍊",
    color: "灰白藍",
    price: 1780,
    custom: true,
    crystals: "灰月光、藍紋瑪瑙、白水晶、煙晶",
    effect: "沉澱、安定、減少內耗",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合白天吸收太多訊息，晚上還在腦內開會的人。",
    moment: "洗澡後或睡前閱讀時配戴，把一天慢慢收掉。",
    care: "以乾布擦拭，避免泡澡或睡眠翻身時拉扯。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#9ba3a7", "#9bb3cc", "#f5f6f2", "#594f4b"],
  },
  {
    id: "soft-talk",
    name: "人際柔光不硬碰款",
    scene: "人際柔和",
    type: "客制手鍊",
    color: "粉白綠",
    price: 1780,
    custom: true,
    crystals: "粉晶、葡萄石、白水晶、草莓晶",
    effect: "柔和、人緣、接住情緒",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合容易把話說太直，但心裡其實沒有惡意的人。",
    moment: "聚會、家人溝通、約會前配戴，讓表達多一點溫度。",
    care: "粉晶避免長時間強光直曬，以白水晶碎石淨化。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#f0c4ca", "#d8e5cf", "#fff7f6", "#c67b80"],
  },
  {
    id: "social-ease",
    name: "社交不耗電補氣款",
    scene: "人際柔和",
    type: "客制手鍊",
    color: "綠白金",
    price: 1880,
    custom: true,
    crystals: "東陵玉、白水晶、黃水晶、橄欖石",
    effect: "輕盈、人緣、回復活力",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合需要社交，但回家常常像電量歸零的人。",
    moment: "聚餐、展覽、活動日配戴，提醒自己保持舒服距離。",
    care: "避免劇烈碰撞，配戴後以軟布擦拭汗水。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#7d9a72", "#f6f3e9", "#d8a63f", "#b5c776"],
  },
  {
    id: "money-action",
    name: "財運行動不卡關款",
    scene: "財運行動",
    type: "客制手鍊",
    color: "綠金黑",
    price: 2200,
    custom: true,
    crystals: "綠幽靈、黃水晶、黑曜石、虎眼石",
    effect: "行動、財運、決策",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合想賺錢，但需要把想法變成動作的人。",
    moment: "談案、上架商品、記帳、定價和做決策時配戴。",
    care: "以白水晶碎石淨化，避免長時間泡水。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#2b7a58", "#d8a63f", "#16151e", "#8b6b35"],
  },
  {
    id: "market-sense",
    name: "低買高賣洞察款",
    scene: "財運行動",
    type: "客制手鍊",
    color: "茶金綠",
    price: 1980,
    custom: true,
    crystals: "茶晶、綠幽靈、黃水晶、白水晶",
    effect: "洞察、穩定、商業直覺",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合正在練習看市場、抓需求、抓價格的人。",
    moment: "選品、談價、做社群內容和盤點成本時配戴。",
    care: "以乾布擦拭，收納時避免和硬物摩擦。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#6b4f3f", "#2b7a58", "#d8a63f", "#f6f1e8"],
  },
  {
    id: "love-self",
    name: "不內耗自信戀愛款",
    scene: "戀愛自信",
    type: "客制手鍊",
    color: "粉紫白",
    price: 1880,
    custom: true,
    crystals: "粉晶、紫水晶、白水晶、草莓晶",
    effect: "自愛、魅力、穩住界線",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合想靠近愛，但不想把自己弄丟的人。",
    moment: "約會、曖昧聊天、整理感情狀態時配戴。",
    care: "粉晶避免長時間強烈日照，日常以軟布擦拭。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#efb7c6", "#7b4e8c", "#fff5f7", "#c95f8f"],
  },
  {
    id: "no-dizzy",
    name: "心動不暈船款",
    scene: "戀愛自信",
    type: "客制手鍊",
    color: "粉黑透",
    price: 1780,
    custom: true,
    crystals: "粉晶、黑曜石、白水晶、月光石",
    effect: "心動、清醒、守住節奏",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合一暈船就忘記自己原本生活的人。",
    moment: "約會前、等訊息時、想過度解讀對方時配戴。",
    care: "以白水晶碎石淨化，避免拉扯彈力線。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#f0c4ca", "#16151e", "#f8f7f2", "#b8bfd1"],
  },
  {
    id: "steady-breath",
    name: "情緒穩定呼吸款",
    scene: "情緒穩定",
    type: "客制手鍊",
    color: "綠灰白",
    price: 1680,
    custom: true,
    crystals: "綠螢石、白水晶、灰月光、煙晶",
    effect: "安定、呼吸、整理情緒",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合一緊張就胸口卡住，需要先把自己穩回來的人。",
    moment: "通勤、考試前、情緒上來時配戴，摸到珠子就做一次呼吸。",
    care: "避免碰撞和泡水，綠螢石較需溫柔收納。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#83a98c", "#f6f4ed", "#9ba3a7", "#665d58"],
  },
  {
    id: "exam-focus",
    name: "考前先穩住款",
    scene: "情緒穩定",
    type: "客制手鍊",
    color: "藍紫白",
    price: 1780,
    custom: true,
    crystals: "紫水晶、藍紋瑪瑙、白水晶、螢石",
    effect: "專注、穩定、記憶整理",
    size: "依你提供的手圍客製，彈力線與珠徑可微調",
    fit: "適合考前緊張、讀很多但需要穩定輸出的人。",
    moment: "讀書、考前、交報告前配戴，提醒自己先穩再寫。",
    care: "以白水晶碎石淨化，避免螢石長時間曝曬。",
    pack: "手鍊、絨布袋、場景小卡、保養卡。",
    palette: ["#5d3c72", "#93b6c7", "#f6f3ed", "#7d9a72"],
  },
];

const WEB_APP_URL_PLACEHOLDER = "GOOGLE_APPS_SCRIPT_WEB_APP_URL";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby3nWx_LCW3fM5FonV_5BoOiKT6_19GR8L7D4EUqD0b_a4EekZmjwZiDzXNgjWarmgT/exec";
const DEFAULT_WRIST_SIZE = "15.5";

window.MUPHE_WEB_APP_URL_PLACEHOLDER = WEB_APP_URL_PLACEHOLDER;
window.MUPHE_WEB_APP_URL = WEB_APP_URL;

const state = {
  filters: {
    scene: "全部",
    color: "全部",
  },
  cart: [],
};

const CART_ENABLED = false;

const currency = new Intl.NumberFormat("zh-TW", {
  style: "currency",
  currency: "TWD",
  maximumFractionDigits: 0,
});

const sceneGrid = document.querySelector("[data-scene-grid]");
const productGrid = document.querySelector("[data-product-grid]");
const resultCount = document.querySelector("[data-result-count]");
const productDrawer = document.querySelector("[data-product-drawer]");
const productDetail = document.querySelector("[data-product-detail]");
const cartDrawer = document.querySelector("[data-cart-drawer]");
const cartCount = document.querySelector("[data-cart-count]");
const cartItems = document.querySelector("[data-cart-items]");
const cartTotal = document.querySelector("[data-cart-total]");
const orderForm = document.querySelector("[data-order-form]");
const orderPayload = document.querySelector("[data-order-payload]");
const orderSubmit = document.querySelector("[data-order-submit]");
const orderError = document.querySelector("[data-order-error]");
const mobileNav = document.querySelector("[data-mobile-nav]");

function makeProductImage(product, detail = false) {
  return `
    <img
      class="${detail ? "detail-product-photo" : "product-photo"}"
      src="assets/products/${product.id}.webp"
      alt="${product.name} 商品照"
      loading="${detail ? "eager" : "lazy"}"
    />
  `;
}

function renderScenes() {
  sceneGrid.innerHTML = scenes
    .map(
      (scene) => `
        <button class="scene-tile ${state.filters.scene === scene.name ? "is-active" : ""}"
          type="button"
          style="--scene-color:${scene.color}"
          data-scene="${scene.name}">
          <strong>${scene.name}</strong>
          <span>${scene.cue}</span>
        </button>
      `,
    )
    .join("");
}

function uniqueValues(key) {
  return [...new Set(products.map((product) => product[key]))];
}

function populateFilters() {
  const sceneSelect = document.querySelector('[data-filter="scene"]');
  const colorSelect = document.querySelector('[data-filter="color"]');

  sceneSelect.insertAdjacentHTML(
    "beforeend",
    scenes.map((scene) => `<option value="${scene.name}">${scene.name}</option>`).join(""),
  );
  colorSelect.insertAdjacentHTML(
    "beforeend",
    uniqueValues("color").map((color) => `<option value="${color}">${color}</option>`).join(""),
  );
}

function getFilteredProducts() {
  return products.filter((product) => {
    const sceneMatch = state.filters.scene === "全部" || product.scene === state.filters.scene;
    const colorMatch = state.filters.color === "全部" || product.color === state.filters.color;

    return sceneMatch && colorMatch;
  });
}

function renderProducts() {
  const filteredProducts = getFilteredProducts();
  resultCount.textContent = `目前顯示 ${filteredProducts.length} 款商品`;

  productGrid.innerHTML = filteredProducts
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-visual">
            ${makeProductImage(product)}
          </div>
          <div class="product-body">
            <div class="product-meta">
              <span class="product-scene">${product.scene}</span>
              <span class="product-price">${currency.format(product.price)}</span>
            </div>
            <h3>${product.name}</h3>
            <p>${product.fit}</p>
            <div class="product-tags">
              <span>${product.color}</span>
              <span>可客製</span>
            </div>
            <div class="product-actions ${CART_ENABLED ? "" : "product-actions-single"}">
              <button class="quick-view-button" type="button" data-open-product="${product.id}">
                看詳情
              </button>
              ${
                CART_ENABLED
                  ? `<button class="add-button" type="button" data-add-cart="${product.id}">
                      加入購物車
                    </button>`
                  : ""
              }
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

function syncFilterControls() {
  document.querySelector('[data-filter="scene"]').value = state.filters.scene;
  document.querySelector('[data-filter="color"]').value = state.filters.color;
}

function updateFilter(key, value) {
  state.filters[key] = value;
  syncFilterControls();
  renderScenes();
  renderProducts();
}

function openDrawer(drawer) {
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeDrawer(drawer) {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".drawer.is-open")) {
    document.body.classList.remove("drawer-open");
  }
}

function findProduct(id) {
  return products.find((product) => product.id === id);
}

function getWebAppUrl() {
  if (!WEB_APP_URL || WEB_APP_URL === WEB_APP_URL_PLACEHOLDER) {
    return "";
  }

  return WEB_APP_URL;
}

function renderProductDetail(product) {
  productDetail.innerHTML = `
    <div class="detail-visual">${makeProductImage(product, true)}</div>
    <div class="detail-content">
      <span class="product-scene">${product.scene}</span>
      <h2>${product.name}</h2>
      <p class="price-line">${currency.format(product.price)}</p>
      <div class="detail-grid">
        <div class="detail-row">
          <strong>適合誰</strong>
          <p>${product.fit}</p>
        </div>
        <div class="detail-row">
          <strong>使用情境</strong>
          <p>${product.moment}</p>
        </div>
        <div class="detail-row">
          <strong>晶種組成</strong>
          <p>${product.crystals}</p>
        </div>
        <div class="detail-row">
          <strong>客製手圍</strong>
          <p>${product.size}</p>
        </div>
        <div class="detail-row">
          <strong>淨化保養</strong>
          <p>${product.care}</p>
        </div>
        <div class="detail-row">
          <strong>包裝內容</strong>
          <p>${product.pack}</p>
        </div>
      </div>
      ${
        CART_ENABLED
          ? `<button class="detail-add-button" type="button" data-add-cart="${product.id}">
              加入購物車
            </button>`
          : ""
      }
    </div>
  `;
}

function openProduct(id) {
  const product = findProduct(id);
  if (!product) return;

  renderProductDetail(product);
  openDrawer(productDrawer);
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product) return;

  const item = state.cart.find((cartItem) => cartItem.id === id);
  if (item) {
    item.qty += 1;
  } else {
    state.cart.push({ id, qty: 1, wristSize: DEFAULT_WRIST_SIZE });
  }

  renderCart();
}

function changeQty(id, delta) {
  const item = state.cart.find((cartItem) => cartItem.id === id);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    state.cart = state.cart.filter((cartItem) => cartItem.id !== id);
  }

  renderCart();
}

function updateWristSize(id, value) {
  const item = state.cart.find((cartItem) => cartItem.id === id);
  if (!item) return;

  item.wristSize = value || DEFAULT_WRIST_SIZE;
}

function getCartTotal() {
  return state.cart.reduce((sum, item) => {
    const product = findProduct(item.id);
    return product ? sum + product.price * item.qty : sum;
  }, 0);
}

function renderCart() {
  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = getCartTotal();

  cartCount.textContent = totalQty;
  cartTotal.textContent = currency.format(totalPrice);
  orderSubmit.disabled = !state.cart.length;

  if (!state.cart.length) {
    cartItems.innerHTML = `<p class="cart-empty">購物車目前是空的。從場景選一款今天需要的狀態裝備。</p>`;
    return;
  }

  cartItems.innerHTML = state.cart
    .map((item) => {
      const product = findProduct(item.id);
      if (!product) return "";

      const wristSize = item.wristSize || DEFAULT_WRIST_SIZE;

      return `
        <div class="cart-item">
          <div class="cart-item-main">
            <strong>${product.name}</strong>
            <span>${currency.format(product.price)} · ${product.scene}</span>
            <label>
              手圍
              <input
                type="number"
                min="13"
                max="20"
                step="0.5"
                value="${wristSize}"
                data-wrist="${product.id}"
                aria-label="${product.name} 手圍"
              />
              cm
            </label>
          </div>
          <div class="qty-controls">
            <button type="button" aria-label="減少 ${product.name} 數量" data-qty="${product.id}" data-delta="-1">-</button>
            <b>${item.qty}</b>
            <button type="button" aria-label="增加 ${product.name} 數量" data-qty="${product.id}" data-delta="1">+</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function showOrderError(message) {
  orderError.textContent = message;
  orderError.hidden = false;
}

function hideOrderError() {
  orderError.textContent = "";
  orderError.hidden = true;
}

function buildOrderPayload() {
  const formData = new FormData(orderForm);
  const items = state.cart
    .map((item) => {
      const product = findProduct(item.id);
      if (!product) return null;

      return {
        id: product.id,
        name: product.name,
        scene: product.scene,
        color: product.color,
        price: product.price,
        qty: item.qty,
        wristSize: item.wristSize || DEFAULT_WRIST_SIZE,
      };
    })
    .filter(Boolean);

  return {
    type: "order",
    customer: {
      name: String(formData.get("customerName") || "").trim(),
      contact: String(formData.get("customerContact") || "").trim(),
      deliveryMethod: String(formData.get("deliveryMethod") || "undecided"),
      address: String(formData.get("address") || "").trim(),
      note: String(formData.get("note") || "").trim(),
    },
    items,
    subtotal: getCartTotal(),
    currency: "TWD",
    source: "site-cart",
    submittedAt: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
  };
}

function submitOrder(event) {
  event.preventDefault();
  hideOrderError();

  if (!state.cart.length) {
    showOrderError("購物車目前是空的，請先選擇商品。");
    return;
  }

  if (!orderForm.reportValidity()) {
    return;
  }

  const webAppUrl = getWebAppUrl();
  if (!webAppUrl) {
    showOrderError("訂單收件網址尚未設定，請先部署 Google Apps Script Web App 並更新 WEB_APP_URL。");
    return;
  }

  const honeypot = orderForm.querySelector('[name="website"]');
  if (honeypot && honeypot.value) {
    return;
  }

  orderPayload.value = JSON.stringify(buildOrderPayload());
  orderForm.action = webAppUrl;
  HTMLFormElement.prototype.submit.call(orderForm);
}

function resetFilters() {
  state.filters = {
    scene: "全部",
    color: "全部",
  };
  syncFilterControls();
  renderScenes();
  renderProducts();
}

function closeMobileNav() {
  mobileNav.classList.remove("is-open");
}

const hasShopExperience =
  sceneGrid &&
  productGrid &&
  resultCount &&
  productDrawer &&
  productDetail &&
  cartDrawer &&
  cartCount &&
  cartItems &&
  cartTotal &&
  orderForm &&
  orderPayload &&
  orderSubmit &&
  orderError &&
  mobileNav;

if (hasShopExperience) {
  document.addEventListener("click", (event) => {
    const sceneButton = event.target.closest("[data-scene]");
    const heroScene = event.target.closest("[data-hero-scene]");
    const productButton = event.target.closest("[data-open-product]");
    const addButton = event.target.closest("[data-add-cart]");
    const qtyButton = event.target.closest("[data-qty]");

    if (sceneButton) {
      updateFilter("scene", sceneButton.dataset.scene);
      document.querySelector("#shop").scrollIntoView({ behavior: "smooth" });
    }

    if (heroScene) {
      updateFilter("scene", heroScene.dataset.heroScene);
    }

    if (productButton) {
      openProduct(productButton.dataset.openProduct);
    }

    if (addButton) {
      addToCart(addButton.dataset.addCart);
      closeDrawer(productDrawer);
      openDrawer(cartDrawer);
    }

    if (qtyButton) {
      changeQty(qtyButton.dataset.qty, Number(qtyButton.dataset.delta));
    }

    if (event.target.matches("[data-reset-filters]")) {
      resetFilters();
    }

    if (event.target.closest("[data-product-close]")) {
      closeDrawer(productDrawer);
    }

    if (event.target.closest("[data-cart-open]")) {
      openDrawer(cartDrawer);
    }

    if (event.target.closest("[data-cart-close]")) {
      closeDrawer(cartDrawer);
    }

    if (event.target.matches("[data-menu-toggle]") || event.target.closest("[data-menu-toggle]")) {
      mobileNav.classList.toggle("is-open");
    }

    if (event.target.closest(".mobile-nav a")) {
      closeMobileNav();
    }

    if (event.target === productDrawer) {
      closeDrawer(productDrawer);
    }

    if (event.target === cartDrawer) {
      closeDrawer(cartDrawer);
    }
  });

  document.addEventListener("change", (event) => {
    const filter = event.target.closest("[data-filter]");

    if (filter) {
      updateFilter(filter.dataset.filter, filter.value);
    }
  });

  document.addEventListener("input", (event) => {
    const wristInput = event.target.closest("[data-wrist]");

    if (wristInput) {
      updateWristSize(wristInput.dataset.wrist, wristInput.value);
    }

    if (event.target.closest(".order-form")) {
      hideOrderError();
    }
  });

  orderForm.addEventListener("submit", submitOrder);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer(productDrawer);
      closeDrawer(cartDrawer);
      closeMobileNav();
    }
  });

  populateFilters();
  syncFilterControls();
  renderScenes();
  renderProducts();
  renderCart();
}

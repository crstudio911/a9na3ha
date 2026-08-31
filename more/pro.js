const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxaNnCCwXvv5qCt-go5hTBh7lUrkeuEOmnQsbtYgmNo1tBwKFDMEiDjf8YNnCCj_IWV/exec",
  SESSION_KEY: "asn3_session"
};

const WHATSAPP_NUMBER = "201274277202";

const PRICES = {
  pro: 250,
  vip: 400,
  mcvip: 1000
};

const INFO_DETAILS = {
  proTemplate: {
    title: "صناعة قالب خاص بيك",
    text: "تقدر تطلب أي حاجة تحتاجها (ملزمة - كتاب - امتحان - مذكرة) وفريق الدعم يصنع لك الطلب ويبعته لك، الميزة دي متاحة مرة واحدة فقط خلال مدة الاشتراك."
  },
  proPriority: {
    title: "أولوية تحقيق الرغبات",
    text: "لو حصل أي تحديث أو تعديل جديد على المنصة، رأيك وطلبك بيبقى ليه الأولوية والاهتمام قبل غيرك."
  },
  vipTemplate: {
    title: "صناعة قالب خاص بيك",
    text: "تقدر تطلب أي حاجة تحتاجها (ملزمة - كتاب - امتحان - مذكرة) وفريق الدعم يبدأ في تنفيذ طلبك بأعلى أولوية ويبعته لك بالكامل."
  },
  vipPriority: {
    title: "أولوية قصوى لتحقيق الرغبات",
    text: "رأيك وطلبك بيبقى في مقدمة الأولويات عند أي تحديث أو تعديل جديد يحصل على المنصة."
  },
  mcDiscount: {
    title: "خصم 70% على خدمات MC",
    text: "بصفتك مشترك MCVIP بتحصل على خصم 70% على كل خدمات ومنتجات MC وخدمات MC_Ai."
  }
};

const PLANS_DATA = [
  {
    id: "pro",
    name: "Pro",
    theme: "plan-pro",
    ribbon: "",
    features: [
      { text: "دعم فني سريع", icon: "fa-solid fa-headset" },
      { text: "صناعة قالب خاص بيك من فريق الدعم", icon: "fa-solid fa-drafting-compass", info: "proTemplate" },
      { text: "استخدام ميزة محو الخلفية 10 مرات بدون مشاهدة إعلان", icon: "fa-solid fa-eraser" },
      { text: "استخدام ميزة الكتابة بالصوت بدون إعلانات", icon: "fa-solid fa-microphone" },
      { text: "إزالة الإعلانات من المنصة بالكامل", icon: "fa-solid fa-ban" },
      { text: "أولوية تحقيق الرغبات داخل المنصة", icon: "fa-solid fa-star", info: "proPriority" }
    ]
  },
  {
    id: "vip",
    name: "VIP",
    theme: "plan-vip",
    ribbon: "الأكثر طلبًا",
    features: [
      { text: "دعم فني فوري على مدار الساعة", icon: "fa-solid fa-bolt" },
      { text: "صناعة قالب خاص بيك من فريق الدعم بأعلى أولوية", icon: "fa-solid fa-drafting-compass", info: "vipTemplate" },
      { text: "استخدام ميزة محو الخلفية بدون حد أقصى وبدون إعلانات", icon: "fa-solid fa-eraser" },
      { text: "استخدام ميزة الكتابة بالصوت بدون إعلانات", icon: "fa-solid fa-microphone" },
      { text: "إزالة الإعلانات من المنصة بالكامل", icon: "fa-solid fa-ban" },
      { text: "أولوية قصوى لتحقيق الرغبات داخل المنصة", icon: "fa-solid fa-star", info: "vipPriority" },
      { text: "شكل مخصوص ليك عند تنزيل المنشورات", icon: "fa-solid fa-crown" }
    ]
  },
  {
    id: "mcvip",
    name: "MCVIP",
    theme: "plan-mcvip",
    ribbon: "الأعلى تميزًا",
    features: [
      { text: "دعم فني فوري على مدار الساعة", icon: "fa-solid fa-bolt" },
      { text: "صناعة قالب خاص بيك من فريق الدعم بأعلى أولوية", icon: "fa-solid fa-drafting-compass", info: "vipTemplate" },
      { text: "استخدام ميزة محو الخلفية بدون حد أقصى وبدون إعلانات", icon: "fa-solid fa-eraser" },
      { text: "استخدام ميزة الكتابة بالصوت بدون إعلانات", icon: "fa-solid fa-microphone" },
      { text: "إزالة الإعلانات من المنصة بالكامل", icon: "fa-solid fa-ban" },
      { text: "أولوية قصوى لتحقيق الرغبات داخل المنصة", icon: "fa-solid fa-star", info: "vipPriority" },
      { text: "شكل مخصوص ليك عند تنزيل المنشورات", icon: "fa-solid fa-crown" },
      { text: "خصم 70% على كل خدمات ومنتجات MC وخدمات MC_Ai", icon: "fa-solid fa-percent", info: "mcDiscount" }
    ]
  }
];

function getSession(){
  try{ return JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY)); }
  catch(e){ return null; }
}

function clearSession(){
  localStorage.removeItem(CONFIG.SESSION_KEY);
}

function goToLogin(){
  window.location.href = "../login/info.html";
}

let currentUser = null;
let chargeAmount = 0;
let lastPurchasedPlanId = null;

async function callApi(payload){
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function checkSession(){
  const session = getSession();
  if(!session || !session.token || new Date(session.expiresAt).getTime() < Date.now()){
    clearSession();
    goToLogin();
    return;
  }
  try{
    const data = await callApi({ action: "checkSession", token: session.token });
    if(!data.ok){
      clearSession();
      goToLogin();
      return;
    }
    currentUser = data.user;
    onSessionReady(data.user);
  }catch(e){
    document.getElementById("sessionLoader").innerHTML =
      '<p>تعذر الاتصال بالخادم، حاول تحديث الصفحة</p>';
  }
}

function onSessionReady(user){
  document.getElementById("sessionLoader").classList.add("hidden");

  if(user.rule === "close"){
    document.getElementById("closedMessage").textContent = user.now || "حسابك موقوف حاليًا";
    document.getElementById("closedScreen").classList.remove("hidden");
    return;
  }

  document.getElementById("app").classList.remove("hidden");
  updateBalanceDisplay();
  renderPlans();
}

function updateBalanceDisplay(){
  const cash = Number(currentUser && currentUser.cash ? currentUser.cash : 0);
  document.getElementById("balanceValue").textContent = cash + " ج.م";
}

function formatDate(value){
  const d = new Date(value);
  if(isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("ar-EG", { year:"numeric", month:"long", day:"numeric" });
}

function renderPlans(){
  const grid = document.getElementById("plansGrid");
  grid.innerHTML = "";

  PLANS_DATA.forEach(plan => {
    const card = document.createElement("div");
    card.className = "plan-card " + plan.theme;

    const featuresHtml = plan.features.map(f => {
      const infoBtn = f.info ? `<button class="info-btn" data-info="${f.info}">i</button>` : "";
      return `
        <li class="feature-item">
          <span class="feature-icon"><i class="${f.icon}"></i></span>
          <span class="feature-text">${f.text}</span>
          ${infoBtn}
        </li>
      `;
    }).join("");

    card.innerHTML = `
      ${plan.ribbon ? `<span class="plan-ribbon">${plan.ribbon}</span>` : ""}
      <h3 class="plan-name">${plan.name}</h3>
      <p class="plan-duration">اشتراك شهري - يتجدد يدويًا</p>
      <div class="plan-price">
        <span class="price-amount">${PRICES[plan.id]}</span>
        <span class="price-currency">ج.م</span>
        <span class="price-period">/ شهر</span>
      </div>
      <ul class="plan-features">${featuresHtml}</ul>
      <button class="plan-subscribe-btn" data-plan="${plan.id}">اشترك الآن</button>
    `;

    grid.appendChild(card);
  });

  grid.querySelectorAll(".plan-subscribe-btn").forEach(btn => {
    btn.addEventListener("click", () => subscribeToPlan(btn.dataset.plan, btn));
  });

  grid.querySelectorAll(".info-btn").forEach(btn => {
    btn.addEventListener("click", () => openInfoModal(btn.dataset.info));
  });
}

function openInfoModal(key){
  const detail = INFO_DETAILS[key];
  if(!detail) return;
  document.getElementById("infoModalTitle").textContent = detail.title;
  document.getElementById("infoModalText").textContent = detail.text;
  document.getElementById("infoModal").classList.remove("hidden");
}

function closeInfoModal(){
  document.getElementById("infoModal").classList.add("hidden");
}

function openInsufficientModal(cash, needed){
  document.getElementById("insufficientText").textContent =
    `رصيدك الحالي ${cash} ج.م، ومحتاج ${needed} ج.م علشان تشترك في الباقة دي، اشحن رصيدك وكمّل`;
  chargeAmount = Math.max(needed - cash, 10);
  document.getElementById("insufficientModal").classList.remove("hidden");
}

function closeInsufficientModal(){
  document.getElementById("insufficientModal").classList.add("hidden");
}

function setActiveView(id){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function subscribeToPlan(planId, btn){
  const session = getSession();
  if(!session || !session.token){
    goToLogin();
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "جارِ التحقق من الرصيد...";

  try{
    const data = await callApi({ action: "purchasePlan", token: session.token, planId: planId });

    if(!data.ok){
      if(typeof data.cash === "number" && typeof data.needed === "number"){
        openInsufficientModal(data.cash, data.needed);
      }else{
        alert(data.message || "تعذر إتمام الاشتراك، حاول مرة أخرى");
      }
      return;
    }

    currentUser.cash = data.cash;
    currentUser.rule = data.rule;
    lastPurchasedPlanId = planId;
    updateBalanceDisplay();
    buildSubscribeInvoice(planId, data);
    setActiveView("view-subscribe-result");
  }catch(e){
    alert("تعذر الاتصال بالخادم، حاول مرة أخرى");
  }finally{
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function buildSubscribeInvoice(planId, data){
  const plan = PLANS_DATA.find(p => p.id === planId);

  document.getElementById("subInvDate").textContent = formatDate(new Date());
  const avatarEl = document.getElementById("subInvAvatar");
  avatarEl.crossOrigin = "anonymous";
  avatarEl.src = currentUser.imgProUrl || "../img/pro1.png";
  document.getElementById("subInvName").textContent = currentUser.name;
  document.getElementById("subInvId").textContent = currentUser.id;
  document.getElementById("subInvPlan").textContent = plan.name;
  document.getElementById("subInvExpiry").textContent = formatDate(data.expiresAt);
  document.getElementById("subInvTotal").textContent = PRICES[planId] + " ج.م";
}

function openChargeAmountView(){
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  document.getElementById("customAmount").value = chargeAmount > 0 ? chargeAmount : "";
  document.getElementById("amountError").classList.add("hidden");
  setActiveView("view-charge-amount");
}

function setupChargeAmount(){
  document.getElementById("amountChips").querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      document.getElementById("customAmount").value = chip.dataset.amount;
    });
  });

  document.getElementById("customAmount").addEventListener("input", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  });

  document.getElementById("continueChargeBtn").addEventListener("click", () => {
    const amount = Number(document.getElementById("customAmount").value);
    if(!amount || amount < 10){
      document.getElementById("amountError").classList.remove("hidden");
      return;
    }
    chargeAmount = amount;
    document.getElementById("transferSummary").textContent =
      `هتشحن رصيدك بمبلغ ${chargeAmount} ج.م`;
    setActiveView("view-charge-transfer");
  });
}

function buildChargeInvoice(){
  document.getElementById("chargeInvDate").textContent = formatDate(new Date());
  const avatarEl = document.getElementById("chargeInvAvatar");
  avatarEl.crossOrigin = "anonymous";
  avatarEl.src = currentUser.imgProUrl || "../img/pro1.png";
  document.getElementById("chargeInvName").textContent = currentUser.name;
  document.getElementById("chargeInvId").textContent = currentUser.id;
  document.getElementById("chargeInvTotal").textContent = chargeAmount + " ج.م";

  const message = `مرحبًا، أرفقت فاتورة شحن رصيد بمبلغ ${chargeAmount} ج.م على منصة أصنـعها`;
  document.getElementById("chargeWhatsappBtn").href =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

async function downloadInvoiceCard(cardId, filename, btn){
  const card = document.getElementById(cardId);
  btn.disabled = true;
  try{
    const canvas = await html2canvas(card, { backgroundColor: "#0b1120", scale: 2, useCORS: true });
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }catch(e){
    alert("تعذر إنشاء صورة الفاتورة، حاول مرة أخرى");
  }finally{
    btn.disabled = false;
  }
}

function setupNavigation(){
  document.getElementById("openChargeBtn").addEventListener("click", openChargeAmountView);

  document.getElementById("backToPlansFromAmountBtn").addEventListener("click", () => {
    setActiveView("view-plans");
  });

  document.getElementById("backToAmountBtn").addEventListener("click", () => {
    setActiveView("view-charge-amount");
  });

  document.getElementById("confirmTransferBtn").addEventListener("click", () => {
    buildChargeInvoice();
    setActiveView("view-charge-invoice");
  });

  document.getElementById("backToChargeTransferBtn").addEventListener("click", () => {
    setActiveView("view-charge-transfer");
  });

  document.getElementById("downloadChargeInvoiceBtn").addEventListener("click", e => {
    downloadInvoiceCard("chargeInvoiceCard", "فاتورة-شحن-رصيد-اصنعها.png", e.currentTarget);
  });

  document.getElementById("downloadSubInvoiceBtn").addEventListener("click", e => {
    const planName = lastPurchasedPlanId ? lastPurchasedPlanId : "اشتراك";
    downloadInvoiceCard("subInvoiceCard", "فاتورة-" + planName + "-اصنعها.png", e.currentTarget);
  });

  document.getElementById("backToPlansFromSubBtn").addEventListener("click", () => {
    renderPlans();
    setActiveView("view-plans");
  });

  document.getElementById("infoModalClose").addEventListener("click", closeInfoModal);
  document.getElementById("infoModal").addEventListener("click", e => {
    if(e.target.id === "infoModal") closeInfoModal();
  });

  document.getElementById("insufficientModalClose").addEventListener("click", closeInsufficientModal);
  document.getElementById("insufficientModal").addEventListener("click", e => {
    if(e.target.id === "insufficientModal") closeInsufficientModal();
  });

  document.getElementById("insufficientChargeBtn").addEventListener("click", () => {
    closeInsufficientModal();
    openChargeAmountView();
  });

  setupChargeAmount();
}

function runBackgroundCanvas(){
  const canvas = document.getElementById("bgCanvas");
  const ctx = canvas.getContext("2d");
  let w, h;

  const blobs = Array.from({ length: 7 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    r: 200 + Math.random() * 260,
    vx: (Math.random() - 0.5) * 0.0005,
    vy: (Math.random() - 0.5) * 0.0005,
    dark: i % 3 === 0
  }));

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function tick(){
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, 0, w, h);

    for(const b of blobs){
      b.x += b.vx;
      b.y += b.vy;
      if(b.x < 0 || b.x > 1) b.vx *= -1;
      if(b.y < 0 || b.y > 1) b.vy *= -1;
      const cx = b.x * w;
      const cy = b.y * h;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
      if(b.dark){
        gradient.addColorStop(0, "rgba(4,6,12,.9)");
        gradient.addColorStop(1, "rgba(4,6,12,0)");
      }else{
        gradient.addColorStop(0, "rgba(46,111,242,.22)");
        gradient.addColorStop(1, "rgba(46,111,242,0)");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  tick();
}

document.addEventListener("DOMContentLoaded", () => {
  runBackgroundCanvas();
  setupNavigation();
  checkSession();
});


//=======================BdaCODE,ElAssist=====================

(function () {
  "use strict";

  if (window.__A9NA_CHAT_WIDGET_LOADED__) return;
  window.__A9NA_CHAT_WIDGET_LOADED__ = true;

  var CFG = {
    whatsappNumber: "201274277202",           
    howToVideoUrl: "http://127.0.0.1:8080/more/how.html", 
    brandName: "مساعد أصنعها",
    position: "right",                        
    firstOpenDelayTyping: 550,                 
    storageKey: "a9na_chat_state_v1"           
  };

  var css = "" +
  "#a9na-chat-launcher{position:fixed;" + (CFG.position === "left" ? "left:22px;" : "right:22px;") + "bottom:22px;width:54px;height:54px;border-radius:50%;" +
    "background:linear-gradient(145deg,var(--gold-light,#eccf7d),var(--gold,#c8a03a));box-shadow:0 14px 34px -8px rgba(0,0,0,.55),0 0 0 4px rgba(200,160,58,.12);" +
    "display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;border:none;transition:transform .25s var(--ease,cubic-bezier(.22,1,.36,1)),box-shadow .25s;}" +
  "#a9na-chat-launcher:hover{transform:translateY(-3px) scale(1.05);box-shadow:0 18px 40px -8px rgba(0,0,0,.6),0 0 0 6px rgba(200,160,58,.16);}" +
  "#a9na-chat-launcher svg{width:24px;height:24px;fill:#0b1622;transition:transform .35s var(--ease,cubic-bezier(.22,1,.36,1));}" +
  "#a9na-chat-launcher.open svg{transform:rotate(90deg) scale(.001);opacity:0;position:absolute;}" +
  "#a9na-chat-launcher .a9na-close-ic{position:absolute;width:24px;height:24px;fill:#0b1622;opacity:0;transform:rotate(-90deg) scale(.001);transition:transform .35s var(--ease,cubic-bezier(.22,1,.36,1)),opacity .2s;}" +
  "#a9na-chat-launcher.open .a9na-close-ic{opacity:1;transform:rotate(0) scale(1);}" +
  "#a9na-chat-launcher .a9na-ping{position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(200,160,58,.55);animation:a9naPing 2.2s ease-out infinite;}" +
  "#a9na-chat-launcher .a9na-badge{position:absolute;top:-4px;" + (CFG.position === "left" ? "right:-4px;" : "left:-4px;") + "min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#e3453b;color:#fff;font:700 11px/20px 'Tajawal',sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.4);}" +
  "@keyframes a9naPing{0%{transform:scale(.9);opacity:.7}70%{transform:scale(1.35);opacity:0}100%{opacity:0}}" +

  "#a9na-chat-window{position:fixed;" + (CFG.position === "left" ? "left:22px;" : "right:22px;") + "bottom:92px;width:300px;max-width:90vw;height:400px;max-height:65vh;" +
    "background:var(--ink-900,#0b1622);border:1px solid var(--paper-line,rgba(244,238,219,.12));border-radius:var(--radius-lg,24px);overflow:hidden;" +
    "box-shadow:var(--shadow-soft,0 24px 70px -20px rgba(3,7,13,.75));display:flex;flex-direction:column;z-index:999998;" +
    "opacity:0;transform:translateY(18px) scale(.97);pointer-events:none;transition:opacity .28s var(--ease-out,cubic-bezier(.16,1,.3,1)),transform .28s var(--ease-out,cubic-bezier(.16,1,.3,1));" +
    "font-family:'Tajawal',sans-serif;direction:rtl;}" +
  "#a9na-chat-window.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto;}" +

  "#a9na-chat-header{display:flex;align-items:center;gap:12px;padding:16px 18px;background:linear-gradient(180deg,var(--ink-850,#0f1c2b),var(--ink-800,#132639));border-bottom:1px solid var(--paper-line,rgba(244,238,219,.1));flex-shrink:0;}" +
  "#a9na-chat-header .a9na-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(145deg,var(--gold-light,#eccf7d),var(--gold,#c8a03a));display:flex;align-items:center;justify-content:center;flex-shrink:0;}" +
  "#a9na-chat-header .a9na-avatar svg{width:20px;height:20px;fill:#0b1622;}" +
  "#a9na-chat-header .a9na-title{flex:1;min-width:0;}" +
  "#a9na-chat-header .a9na-title b{display:block;color:var(--paper,#f4eedb);font-size:15px;font-weight:700;}" +
  "#a9na-chat-header .a9na-title span{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--teal-light,#5aa39d);margin-top:2px;}" +
  "#a9na-chat-header .a9na-title span::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--teal-light,#5aa39d);box-shadow:0 0 6px var(--teal-light,#5aa39d);}" +
  "#a9na-chat-header .a9na-home-btn,#a9na-chat-header .a9na-close-btn{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:transparent;color:var(--text-dim,#9fb0c3);transition:background .2s,color .2s;flex-shrink:0;}" +
  "#a9na-chat-header .a9na-home-btn:hover,#a9na-chat-header .a9na-close-btn:hover{background:rgba(244,238,219,.08);color:var(--paper,#f4eedb);}" +
  "#a9na-chat-header .a9na-home-btn svg,#a9na-chat-header .a9na-close-btn svg{width:16px;height:16px;fill:currentColor;}" +

  "#a9na-chat-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}" +
  "#a9na-chat-body::-webkit-scrollbar{width:6px;}#a9na-chat-body::-webkit-scrollbar-thumb{background:var(--ink-600,#28455e);border-radius:6px;}" +

  ".a9na-row{display:flex;gap:8px;max-width:92%;animation:a9naIn .28s var(--ease-out,cubic-bezier(.16,1,.3,1));}" +
  "@keyframes a9naIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}" +
  ".a9na-row.bot{align-self:flex-start;}" +
  ".a9na-row.user{align-self:flex-end;flex-direction:row-reverse;}" +
  ".a9na-row .a9na-mini-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(145deg,var(--gold-light,#eccf7d),var(--gold,#c8a03a));flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:2px;}" +
  ".a9na-row .a9na-mini-avatar svg{width:13px;height:13px;fill:#0b1622;}" +
  ".a9na-bubble{padding:11px 14px;border-radius:16px;font-size:13.5px;line-height:1.8;white-space:pre-wrap;word-break:break-word;box-shadow:0 4px 14px -4px rgba(0,0,0,.35);display:flex;align-items:flex-start;gap:8px;}" +
  ".a9na-bubble-icon{flex-shrink:0;margin-top:2px;}" +
  ".a9na-bubble-icon svg{width:15px;height:15px;fill:var(--gold-light,#eccf7d);display:block;}" +
  ".a9na-row.user .a9na-bubble-icon svg{fill:#fff;}" +
  ".a9na-row.bot .a9na-bubble{background:var(--ink-800,#132639);color:var(--text,#ece7d8);border-bottom-right-radius:4px;border:1px solid var(--paper-line,rgba(244,238,219,.08));}" +
  ".a9na-row.user .a9na-bubble{background:linear-gradient(135deg,var(--teal,#2f6f6b),var(--teal-light,#5aa39d));color:#fff;border-bottom-left-radius:4px;}" +

  ".a9na-typing{align-self:flex-start;display:flex;gap:4px;padding:12px 16px;background:var(--ink-800,#132639);border-radius:16px;border-bottom-right-radius:4px;border:1px solid var(--paper-line,rgba(244,238,219,.08));width:fit-content;}" +
  ".a9na-typing span{width:6px;height:6px;border-radius:50%;background:var(--text-dim,#9fb0c3);animation:a9naBlink 1.2s infinite ease-in-out;}" +
  ".a9na-typing span:nth-child(2){animation-delay:.18s}.a9na-typing span:nth-child(3){animation-delay:.36s}" +
  "@keyframes a9naBlink{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}" +

  ".a9na-chips{display:flex;flex-direction:column;gap:8px;align-self:flex-start;max-width:92%;margin-top:2px;}" +
  ".a9na-chip{text-align:right;padding:10px 14px;border-radius:12px;background:var(--ink-850,#0f1c2b);border:1px solid var(--gold-dim,#8a6f2a);color:var(--gold-light,#eccf7d);font-size:13px;font-weight:700;cursor:pointer;transition:background .2s,transform .15s;display:flex;align-items:center;gap:8px;}" +
  ".a9na-chip:hover{background:rgba(200,160,58,.14);transform:translateX(-2px);}" +
  ".a9na-chip svg{width:15px;height:15px;fill:currentColor;flex-shrink:0;}" +

  ".a9na-link-card{align-self:flex-start;max-width:92%;display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--ink-800,#132639);border:1px solid var(--paper-line,rgba(244,238,219,.1));border-radius:14px;text-decoration:none;transition:border-color .2s,background .2s;}" +
  ".a9na-link-card:hover{border-color:var(--gold,#c8a03a);background:rgba(200,160,58,.08);}" +
  ".a9na-link-card .a9na-link-ic{width:34px;height:34px;border-radius:10px;background:linear-gradient(145deg,var(--teal-light,#5aa39d),var(--teal,#2f6f6b));display:flex;align-items:center;justify-content:center;flex-shrink:0;}" +
  ".a9na-link-card .a9na-link-ic svg{width:16px;height:16px;fill:#fff;}" +
  ".a9na-link-card b{display:block;font-size:13px;color:var(--paper,#f4eedb);}" +
  ".a9na-link-card span{display:block;font-size:11px;color:var(--text-faint,#5f7188);margin-top:2px;}" +

  ".a9na-back-btn{align-self:flex-start;display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:transparent;border:1px solid var(--paper-line,rgba(244,238,219,.14));color:var(--text-dim,#9fb0c3);font-size:12.5px;font-weight:700;cursor:pointer;transition:background .2s,color .2s;margin-top:2px;}" +
  ".a9na-back-btn:hover{background:rgba(244,238,219,.06);color:var(--paper,#f4eedb);}" +
  ".a9na-back-btn svg{width:12px;height:12px;fill:currentColor;}" +

  "#a9na-chat-footer{border-top:1px solid var(--paper-line,rgba(244,238,219,.1));padding:10px;display:none;gap:8px;flex-shrink:0;background:var(--ink-850,#0f1c2b);}" +
  "#a9na-chat-footer.active{display:flex;}" +
  "#a9na-chat-input{flex:1;resize:none;max-height:70px;background:var(--ink-800,#132639);border:1px solid var(--paper-line,rgba(244,238,219,.12));border-radius:12px;padding:10px 12px;color:var(--text,#ece7d8);font:400 13.5px/1.6 'Tajawal',sans-serif;outline:none;transition:border-color .2s;}" +
  "#a9na-chat-input:focus{border-color:var(--gold,#c8a03a);}" +
  "#a9na-chat-input::placeholder{color:var(--text-faint,#5f7188);}" +
  "#a9na-chat-send{width:40px;height:40px;border-radius:12px;background:linear-gradient(145deg,var(--gold-light,#eccf7d),var(--gold,#c8a03a));display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s;}" +
  "#a9na-chat-send:hover{transform:scale(1.06);}" +
  "#a9na-chat-send:active{transform:scale(.94);}" +
  "#a9na-chat-send svg{width:17px;height:17px;fill:#0b1622;}" +
  "#a9na-chat-send:disabled{opacity:.45;pointer-events:none;}" +

  "@media (max-width:420px){#a9na-chat-window{width:92vw;height:68vh;bottom:84px;" + (CFG.position === "left" ? "left:4vw;" : "right:4vw;") + "}}";

  var styleTag = document.createElement("style");
  styleTag.id = "a9na-chat-style";
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  var ICONS = {
    chat: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.05 4.57 2.78 6.19-.15 1.29-.7 2.6-1.68 3.53a.5.5 0 00.4.85c1.83-.15 3.6-.85 5.06-1.87.78.16 1.6.24 2.44.24 5.52 0 10-4.03 10-9S17.52 2 12 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12 5.7 16.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3z"/></svg>',
    bot: '<svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h3a3 3 0 013 3v6a3 3 0 01-3 3H8a3 3 0 01-3-3v-6a3 3 0 013-3h3V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM8 12a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm8 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>',
    idea: '<svg viewBox="0 0 24 24"><path d="M9 21h6v-1H9v1zm3-19a7 7 0 00-4 12.74c.6.44 1 1.16 1 1.96v.3h6v-.3c0-.8.4-1.52 1-1.96A7 7 0 0012 2z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    support: '<svg viewBox="0 0 24 24"><path d="M12 2a9 9 0 00-9 9v5a3 3 0 003 3h1v-7H5v-1a7 7 0 0114 0v1h-2v7h1a3 3 0 003-3v-5a9 9 0 00-9-9z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l4.88-4.88a1 1 0 10-1.42-1.41l-6.59 6.6a1 1 0 000 1.4l6.59 6.6a1 1 0 001.42-1.41L7.83 13H20a1 1 0 000-2z"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M3.4 20.6l17.7-8.3a1 1 0 000-1.8L3.4 2.2a1 1 0 00-1.4 1.1L4.3 11l-2.3 7.7a1 1 0 001.4 1.1z"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M3.9 12a5 5 0 015-5h3v2h-3a3 3 0 000 6h3v2h-3a5 5 0 01-5-5zm7-1h2v2h-2v-2zm3-4h3a5 5 0 010 10h-3v-2h3a3 3 0 000-6h-3V7z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3.5v5.3c0 5-3.4 9.2-8 10.7-4.6-1.5-8-5.7-8-10.7V5.5L12 2zm-1.2 13.4l6-6-1.4-1.4-4.6 4.6-2-2-1.4 1.4 3.4 3.4z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.4l4 2.4-.75 1.25L11 13.5V6h1.5v6.4z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M9.5 16.6L5.4 12.5l-1.4 1.4 5.5 5.5 11-11-1.4-1.4z"/></svg>'
  };

  var launcher = document.createElement("button");
  launcher.id = "a9na-chat-launcher";
  launcher.setAttribute("aria-label", "افتح المساعد الذكي");
  launcher.innerHTML =
    '<svg class="a9na-chat-ic" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.03 2 11c0 2.4 1.05 4.57 2.78 6.19-.15 1.29-.7 2.6-1.68 3.53a.5.5 0 00.4.85c1.83-.15 3.6-.85 5.06-1.87.78.16 1.6.24 2.44.24 5.52 0 10-4.03 10-9S17.52 2 12 2z"/></svg>' +
    '<svg class="a9na-close-ic" viewBox="0 0 24 24"><path d="M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12 5.7 16.89a1 1 0 101.41 1.41L12 13.41l4.89 4.89a1 1 0 001.41-1.41L13.41 12l4.89-4.89a1 1 0 000-1.4z"/></svg>' +
    '<span class="a9na-ping"></span>' +
    '<span class="a9na-badge" id="a9na-badge">1</span>';
  document.body.appendChild(launcher);

  var win = document.createElement("div");
  win.id = "a9na-chat-window";
  win.innerHTML =
    '<div id="a9na-chat-header">' +
      '<div class="a9na-avatar">' + ICONS.bot + '</div>' +
      '<div class="a9na-title"><b>' + CFG.brandName + '</b><span>متصل الآن</span></div>' +
      '<button class="a9na-home-btn" id="a9na-home-btn" title="القائمة الرئيسية">' + ICONS.home + '</button>' +
      '<button class="a9na-close-btn" id="a9na-close-btn" title="إغلاق">' + ICONS.close + '</button>' +
    '</div>' +
    '<div id="a9na-chat-body"></div>' +
    '<div id="a9na-chat-footer">' +
      '<textarea id="a9na-chat-input" rows="1" placeholder="اكتب رسالتك هنا..."></textarea>' +
      '<button id="a9na-chat-send" disabled>' + ICONS.send + '</button>' +
    '</div>';
  document.body.appendChild(win);

  var body = win.querySelector("#a9na-chat-body");
  var footer = win.querySelector("#a9na-chat-footer");
  var input = win.querySelector("#a9na-chat-input");
  var sendBtn = win.querySelector("#a9na-chat-send");
  var badge = launcher.querySelector("#a9na-badge");

  var state = { mode: "root", opened: false }; 

  function scrollDown() {
    body.scrollTop = body.scrollHeight + 200;
  }

  function addBotBubble(text, cb, iconKey) {
    var typing = document.createElement("div");
    typing.className = "a9na-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(typing);
    scrollDown();
    setTimeout(function () {
      typing.remove();
      var row = document.createElement("div");
      row.className = "a9na-row bot";
      row.innerHTML = '<div class="a9na-mini-avatar">' + ICONS.bot + '</div><div class="a9na-bubble"></div>';
      var bubble = row.querySelector(".a9na-bubble");
      if (iconKey && ICONS[iconKey]) {
        var icWrap = document.createElement("span");
        icWrap.className = "a9na-bubble-icon";
        icWrap.innerHTML = ICONS[iconKey];
        bubble.appendChild(icWrap);
      }
      var textSpan = document.createElement("span");
      textSpan.textContent = text;
      bubble.appendChild(textSpan);
      body.appendChild(row);
      scrollDown();
      if (cb) cb();
    }, CFG.firstOpenDelayTyping + Math.random() * 300);
  }

  function addUserBubble(text) {
    var row = document.createElement("div");
    row.className = "a9na-row user";
    row.innerHTML = '<div class="a9na-bubble"></div>';
    row.querySelector(".a9na-bubble").textContent = text;
    body.appendChild(row);
    scrollDown();
  }

  function addChips(options) {
    var wrap = document.createElement("div");
    wrap.className = "a9na-chips";
    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "a9na-chip";
      btn.innerHTML = opt.icon + "<span>" + opt.label + "</span>";
      btn.addEventListener("click", function () {
        wrap.remove();
        addUserBubble(opt.label);
        opt.onClick();
      });
      wrap.appendChild(btn);
    });
    body.appendChild(wrap);
    scrollDown();
  }

  function addLinkCard(url, title, subtitle) {
    var a = document.createElement("a");
    a.className = "a9na-link-card";
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML =
      '<div class="a9na-link-ic">' + ICONS.play + '</div>' +
      '<div><b>' + title + '</b><span>' + subtitle + '</span></div>';
    body.appendChild(a);
    scrollDown();
  }

  function addBackButton(label, onClick) {
    var btn = document.createElement("button");
    btn.className = "a9na-back-btn";
    btn.innerHTML = ICONS.back + "<span>" + label + "</span>";
    btn.addEventListener("click", function () {
      btn.remove();
      onClick();
    });
    body.appendChild(btn);
    scrollDown();
  }

  function clearChipsAndInputs() {
    body.querySelectorAll(".a9na-chips, .a9na-back-btn").forEach(function (el) { el.remove(); });
  }

  function setFooter(active, placeholder) {
    if (active) {
      footer.classList.add("active");
      input.placeholder = placeholder || "اكتب رسالتك هنا...";
      input.value = "";
      sendBtn.disabled = true;
      setTimeout(function () { input.focus(); }, 50);
    } else {
      footer.classList.remove("active");
    }
  }

  function openWhatsApp(message) {
    var url = "https://wa.me/" + CFG.whatsappNumber + "?text=" + encodeURIComponent(message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function showRootMenu(withGreeting) {
    state.mode = "root";
    setFooter(false);
    clearChipsAndInputs();
    var options = [
      { label: "اقتراح لتطوير المنصة", icon: ICONS.idea, onClick: startSuggestFlow },
      { label: "طريقة الاستخدام", icon: ICONS.play, onClick: startHowToFlow },
      { label: "التواصل مع الدعم الفني", icon: ICONS.support, onClick: startSupportFlow }
    ];
    if (withGreeting) {
      addBotBubble("اهلا بك سيدي، انا هنا عشان اساعدك، بس خليك عارف:", function () {
        addBotBubble("مقدرش اقولك بيانات داخل حسابك، ولا اي معلومات شخصية، ولا انفذ اي حاجة جوه حسابك.", function () {
          addBotBubble("ايه هو استفسارك؟ او اقدر اساعدك ازاي؟", function () {
            addChips(options);
          });
        }, "shield");
      });
    } else {
      addBotBubble("تمام، رجعناك للقائمة الرئيسية. اختار من الاسئلة تحت:", function () {
        addChips(options);
      });
    }
  }

  function startSuggestFlow() {
    state.mode = "suggest";
    addBotBubble("تمام، اكتب اقتراحك هنا والفريق بكل سرور هيشوفه ويتواصل معاك.", function () {
      setFooter(true, "اكتب اقتراحك هنا...");
      addBackButton("رجوع للقائمة الرئيسية", function () { showRootMenu(false); });
    }, "idea");
  }

  function startHowToFlow() {
    state.mode = "howto";
    setFooter(false);
    addBotBubble("يمكنك استخدام الرابط ده لمشاهدة فيديو طريقة الاستخدام:", function () {
      addLinkCard(CFG.howToVideoUrl, "فيديو طريقة الاستخدام", "هيفتح في تبويب جديد");
      addBackButton("رجوع", function () { showRootMenu(false); });
    }, "play");
  }

  function startSupportFlow() {
    state.mode = "support";
    addBotBubble("انا هنا لمساعدتك، اكتب لي ما تحتاج.", function () {
      addBotBubble("ملحوظة: قد يستغرق الرد بعض الوقت من فريق الدعم.", function () {
        setFooter(true, "اكتب طلبك هنا...");
        addBackButton("رجوع للقائمة الرئيسية", function () { showRootMenu(false); });
      }, "clock");
    }, "support");
  }

  function handleSend() {
    var text = input.value.trim();
    if (!text) return;
    var mode = state.mode;
    addUserBubble(text);
    input.value = "";
    sendBtn.disabled = true;
    setFooter(false);
    clearChipsAndInputs();

    var waMessage = "";
    if (mode === "suggest") {
      waMessage = "اهلا عندي اقتراح :\n" + text + "\nوشكرا";
    } else if (mode === "support") {
      waMessage = "اهلا\nعايز اتواصل مع الدعم الفني\n" + text + "\nوشكرا";
    }

    addBotBubble("تمام، تم تجهيز رسالتك، جاري تحويلك للواتساب عشان نكمل معاك هناك.", function () {
      setTimeout(function () {
        openWhatsApp(waMessage);
        showRootMenu(false);
      }, 700);
    }, "check");
  }


  input.addEventListener("input", function () {
    sendBtn.disabled = input.value.trim().length === 0;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 70) + "px";
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) handleSend();
    }
  });
  sendBtn.addEventListener("click", handleSend);

  win.querySelector("#a9na-close-btn").addEventListener("click", function () { toggleWindow(false); });
  win.querySelector("#a9na-home-btn").addEventListener("click", function () { showRootMenu(false); });

  function toggleWindow(force) {
    var willOpen = typeof force === "boolean" ? force : !win.classList.contains("open");
    win.classList.toggle("open", willOpen);
    launcher.classList.toggle("open", willOpen);
    if (willOpen) {
      if (badge) { badge.remove(); badge = null; }
      if (!state.opened) {
        state.opened = true;
        showRootMenu(true);
      }
    }
  }

  launcher.addEventListener("click", function () { toggleWindow(); });

  win.addEventListener("click", function (e) { e.stopPropagation(); });

  document.addEventListener("click", function (e) {
    if (!win.classList.contains("open")) return;
    if (win.contains(e.target) || launcher.contains(e.target)) return;
    toggleWindow(false);
  });
})();


//===========5LSCODE,ElAssist==============================
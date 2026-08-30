const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzA0rEosIhYcxog3t81iHIvPJ1v0nb9PFDqklnPO1ROK4J8h6LLtiePK9sQN5KD2qMk/exec",
  SESSION_KEY: "asn3_session"
};

const roleLabels = { normal: "", pro: "مميز", vip: "فائق", own: "المالك" };

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

async function callApi(payload){
  const session = getSession();
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, token: session ? session.token : null })
  });
  return res.json();
}

let currentUser = null;

async function checkSession(){
  const session = getSession();
  if(!session || !session.token || new Date(session.expiresAt).getTime() < Date.now()){
    clearSession();
    goToLogin();
    return;
  }
  try{
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "checkSession", token: session.token })
    });
    const data = await res.json();
    if(!data.ok){
      clearSession();
      goToLogin();
      return;
    }
    currentUser = data.user;
    renderUser(data.user);
  }catch(e){
    document.getElementById("sessionLoader").innerHTML =
      '<p>تعذر الاتصال بالخادم، حاول تحديث الصفحة</p>';
  }
}

function renderUser(user){
  document.getElementById("sessionLoader").classList.add("hidden");

  if(user.rule === "close"){
    document.getElementById("closedMessage").textContent = user.now || "حسابك موقوف حاليًا";
    document.getElementById("closedScreen").classList.remove("hidden");
    return;
  }

  document.getElementById("app").classList.remove("hidden");

  const avatar = user.imgProUrl || "../img/pro1.png";
  document.getElementById("userAvatar").src = avatar;
  document.getElementById("composerAvatar").src = avatar;
  document.getElementById("userName").textContent = user.name;
  document.getElementById("userName").className = "user-name role-" + user.rule;
  document.getElementById("avatarRing").className = "avatar-ring role-" + user.rule;
  document.getElementById("ownBadge").classList.toggle("hidden", user.rule !== "own");

  const badge = document.getElementById("userBadge");
  const label = roleLabels[user.rule] || "";
  if(label){
    badge.textContent = label;
    badge.classList.remove("hidden");
  }else{
    badge.classList.add("hidden");
  }

  document.getElementById("userCash").textContent = user.cash ?? 0;

  document.getElementById("ovName").textContent = user.name;
  document.getElementById("ovEmail").textContent = user.email || "غير مضاف";
  document.getElementById("ovRule").textContent = label || "عادي";
  document.getElementById("ovCash").textContent = (user.cash ?? 0) + " ج.م";
  document.getElementById("ovJoin").textContent = formatDate(user.inDate);
  document.getElementById("ovLastUse").textContent = formatDate(user.lastUseDate);
}

function formatDate(value){
  if(!value) return "--";
  const d = new Date(value);
  if(isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("ar-EG", { year:"numeric", month:"long", day:"numeric" });
}

const whatsappChannels = [
  {
    title: "MC",
    description: "هي قناة MC الرسمية الرئيسية",
    image: "../img/mclogo.png",
    link: "https://whatsapp.com/channel/0029VbDZFfaK5cDNUR2tOd2U"
  },
  {
    title: "MC_Ai",
    description: "الصفحة الرسميه لـ MC Ai لبيع اشتراكات لأغلب منصات الذكاء الاصطناعي",
    image: "../img/mcailogo.png",
    link: "https://whatsapp.com/channel/0029VbDkgRsC1Fu379GB610M"
  }
];

function renderWhatsappChannels(){
  const list = document.getElementById("waChannelsList");
  list.innerHTML = "";
  whatsappChannels.forEach(channel => {
    const card = document.createElement("div");
    card.className = "wa-channel-card";
    const hasLink = !!channel.link;
    card.innerHTML = `
      <img class="wa-channel-image" src="${channel.image}" alt="${escapeHtml(channel.title)}">
      <div class="wa-channel-title">انضم لقناة: ${escapeHtml(channel.title)}</div>
      <p class="wa-channel-desc">${escapeHtml(channel.description)}</p>
      <a class="wa-channel-join ${hasLink ? "" : "disabled"}" href="${hasLink ? channel.link : "#"}" target="_blank" rel="noopener">
        ${hasLink ? "انضم الآن" : "قريبًا"}
      </a>
    `;
    list.appendChild(card);
  });
}

function setupWhatsappModal(){
  const modal = document.getElementById("whatsappModal");
  document.getElementById("whatsappBtn").addEventListener("click", () => {
    renderWhatsappChannels();
    modal.classList.remove("hidden");
  });
  document.getElementById("waModalClose").addEventListener("click", () => {
    modal.classList.add("hidden");
  });
  modal.addEventListener("click", e => {
    if(e.target === modal) modal.classList.add("hidden");
  });
}

let infoMessageText = "";

async function loadInfoMessage(){
  try{
    const result = await callApi({ action: "getMessage" });
    if(result.ok && result.text){
      infoMessageText = result.text;
      document.getElementById("infoMessageText").textContent = infoMessageText;
      updateInfoMessageVisibility();
    }
  }catch(e){}
}

function updateInfoMessageVisibility(){
  const activeTabBtn = document.querySelector(".tab-btn.active");
  const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : "overview";
  const banner = document.getElementById("infoMessageBanner");
  if(infoMessageText && activeTab !== "posts"){
    banner.classList.remove("hidden");
  }else{
    banner.classList.add("hidden");
  }
}

function setupLogout(){
  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearSession();
    goToLogin();
  });
}

function runBackgroundCanvas(){
  const canvas = document.getElementById("bgCanvas");
  const ctx = canvas.getContext("2d");
  let w, h;

  const blobs = Array.from({ length: 5 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 180 + Math.random() * 220,
    vx: (Math.random() - 0.5) * 0.0006,
    vy: (Math.random() - 0.5) * 0.0006,
    hue: Math.random() > 0.5 ? "94,161,255" : "87,224,208"
  }));

  function resize(){
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function tick(){
    ctx.clearRect(0, 0, w, h);
    for(const b of blobs){
      b.x += b.vx;
      b.y += b.vy;
      if(b.x < 0 || b.x > 1) b.vx *= -1;
      if(b.y < 0 || b.y > 1) b.vy *= -1;
      const cx = b.x * w;
      const cy = b.y * h;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
      gradient.addColorStop(0, `rgba(${b.hue},0.14)`);
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  tick();
}

function setupTabs(){
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if(btn.dataset.tab === "posts") loadPosts();
      if(btn.dataset.tab === "storage") refreshStorageStatus();
      updateInfoMessageVisibility();
    });
  });
}

let pendingPostImageBase64 = null;

function setupComposer(){
  const fileInput = document.getElementById("postImageInput");
  const label = document.getElementById("attachLabel");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if(!file) return;
    if(file.size > 3 * 1024 * 1024){
      showComposerMessage("حجم الصورة كبير جدًا، الحد الأقصى 3 ميجابايت");
      fileInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pendingPostImageBase64 = reader.result.split(",")[1];
      label.textContent = "تم اختيار: " + file.name;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("publishBtn").addEventListener("click", async () => {
    const caption = document.getElementById("postCaption").value.trim();
    if(!caption && !pendingPostImageBase64){
      showComposerMessage("اكتب حاجة أو اختار صورة قبل النشر");
      return;
    }
    const btn = document.getElementById("publishBtn");
    btn.disabled = true;
    showComposerMessage("جاري النشر...");
    try{
      const result = await callApi({ action: "createPost", caption, imageBase64: pendingPostImageBase64 });
      if(result.ok){
        pendingPostImageBase64 = null;
        document.getElementById("postCaption").value = "";
        label.textContent = "إضافة صورة";
        fileInput.value = "";
        showComposerMessage("");
        loadPosts();
      }else{
        showComposerMessage(result.message || "تعذر النشر");
      }
    }catch(e){
      showComposerMessage("تعذر الاتصال بالخادم");
    }finally{
      btn.disabled = false;
    }
  });
}

function showComposerMessage(text){
  document.getElementById("composerMessage").textContent = text;
}

function getLikedPosts(){
  try{ return JSON.parse(localStorage.getItem("asn3_liked_posts") || "[]"); }
  catch(e){ return []; }
}

function markPostLiked(postId){
  const liked = getLikedPosts();
  liked.push(postId);
  localStorage.setItem("asn3_liked_posts", JSON.stringify(liked));
}

async function loadPosts(){
  const feed = document.getElementById("postsFeed");
  feed.innerHTML = '<p class="feed-empty">جاري التحميل...</p>';
  try{
    const result = await callApi({ action: "listPosts" });
    if(!result.ok || !result.posts.length){
      feed.innerHTML = '<p class="feed-empty">لسه مفيش منشورات، كن أول من ينشر</p>';
      return;
    }
    const liked = getLikedPosts();
    feed.innerHTML = "";
    result.posts.forEach(post => feed.appendChild(renderPostCard(post, liked)));
  }catch(e){
    feed.innerHTML = '<p class="feed-empty">تعذر تحميل المنشورات</p>';
  }
}

function renderPostCard(post, liked){
  const card = document.createElement("div");
  card.className = "post-card";

  const isLiked = liked.includes(post.id);
  const roleLabel = roleLabels[post.rule] || "";

  card.innerHTML = `
    <div class="post-head">
      <span class="avatar-ring role-${post.rule}">
        <img src="${post.avatar || '../img/pro1.png'}" alt="">
      </span>
      <div>
        <div class="post-name-row">
          <span class="post-name role-${post.rule}">${escapeHtml(post.name)}</span>
          ${post.rule === "own" ? '<img class="own-badge-inline" src="../img/abro.png" alt="">' : ""}
        </div>
        ${roleLabel ? `<span class="post-role">${roleLabel}</span>` : ""}
      </div>
    </div>
    ${post.imageUrl ? `<img class="post-image" src="${post.imageUrl}" alt="">` : ""}
    ${post.caption ? `<p class="post-caption">${escapeHtml(post.caption)}</p>` : ""}
    <div class="post-actions">
      <button class="post-action-btn like-btn ${isLiked ? "liked" : ""}" data-id="${post.id}">
        <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5c2 0 3.5 1.2 4.5 2.6C12 6.2 13.5 5 15.5 5 19 5 21.5 8.5 19.5 12.5 17 16.65 12 21 12 21Z"/></svg>
        <span class="like-count">${post.likes || 0}</span>
      </button>
      <button class="post-action-btn comment-toggle-btn">
        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5A8.5 8.5 0 1 1 21 11.5Z"/></svg>
        <span>${post.comments.length} تعليق</span>
      </button>
    </div>
    <div class="comments-box hidden"></div>
  `;

  const likeBtn = card.querySelector(".like-btn");
  likeBtn.addEventListener("click", async () => {
    if(likeBtn.classList.contains("liked")) return;
    likeBtn.classList.add("liked");
    const countEl = likeBtn.querySelector(".like-count");
    countEl.textContent = Number(countEl.textContent) + 1;
    markPostLiked(post.id);
    try{
      await callApi({ action: "likePost", postId: post.id });
    }catch(e){}
  });

  const commentsBox = card.querySelector(".comments-box");
  card.querySelector(".comment-toggle-btn").addEventListener("click", () => {
    commentsBox.classList.toggle("hidden");
    if(!commentsBox.dataset.rendered){
      commentsBox.dataset.rendered = "1";
      renderComments(commentsBox, post);
    }
  });

  return card;
}

function renderComments(container, post){
  container.innerHTML = "";
  post.comments.forEach(c => {
    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
      <img class="comment-avatar" src="${c.avatar || '../img/pro1.png'}" alt="">
      <div class="comment-bubble">
        <span class="comment-author">${escapeHtml(c.name)}</span>${escapeHtml(c.text)}
      </div>
    `;
    container.appendChild(item);
  });

  const form = document.createElement("div");
  form.className = "comment-form";
  form.innerHTML = `
    <input type="text" maxlength="300" placeholder="اكتب تعليق...">
    <button>إرسال</button>
  `;
  const input = form.querySelector("input");
  const btn = form.querySelector("button");
  btn.addEventListener("click", async () => {
    const text = input.value.trim();
    if(!text) return;
    btn.disabled = true;
    try{
      const result = await callApi({ action: "commentPost", postId: post.id, text });
      if(result.ok){
        input.value = "";
        post.comments = result.comments;
        renderComments(container, post);
        container.appendChild(form);
        input.focus();
      }
    }catch(e){}
    btn.disabled = false;
  });
  container.appendChild(form);
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

const DB_NAME = "asn3_storage";
const STORE_NAME = "handles";
const ROOT_KEY = "rootHandle";

function openHandleDb(){
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key){
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value){
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let dataDirHandle = null;
let storageIsActive = false;

function setStorageStatus(state, text){
  const dot = document.getElementById("storageDot");
  dot.className = "storage-dot" + (state ? " " + state : "");
  document.getElementById("storageStatusText").textContent = text;
}

async function resolveStorageState(){
  if(!("showDirectoryPicker" in window)){
    return { supported:false, hasHandle:false, granted:false, handle:null };
  }
  const rootHandle = await idbGet(ROOT_KEY);
  if(!rootHandle){
    return { supported:true, hasHandle:false, granted:false, handle:null };
  }
  const permission = await rootHandle.queryPermission({ mode:"readwrite" });
  return { supported:true, hasHandle:true, granted: permission === "granted", handle: rootHandle };
}

async function refreshStorageStatus(){
  const state = await resolveStorageState();

  if(!state.supported){
    document.getElementById("storageUnsupported").classList.remove("hidden");
    document.getElementById("connectStorageBtn").classList.add("hidden");
    setStorageStatus("error", "غير مدعوم");
    updateBanner(false);
    return;
  }

  if(!state.hasHandle){
    setStorageStatus("", "غير متصل");
    document.getElementById("clearStorageBtn").classList.add("hidden");
    updateBanner(false);
    return;
  }

  if(!state.granted){
    setStorageStatus("", "محتاج إذن الوصول تاني");
    document.getElementById("clearStorageBtn").classList.add("hidden");
    updateBanner(false);
    return;
  }

  dataDirHandle = await state.handle.getDirectoryHandle("data", { create: true });
  setStorageStatus("active", "نشط • " + state.handle.name);
  document.getElementById("clearStorageBtn").classList.remove("hidden");
  updateBanner(true);
}

function updateBanner(active){
  storageIsActive = active;
  document.getElementById("storageBanner").classList.toggle("hidden", active);
}

async function connectStorageFlow(){
  try{
    const rootHandle = await window.showDirectoryPicker();
    const permission = await rootHandle.requestPermission({ mode: "readwrite" });
    if(permission !== "granted"){
      setStorageStatus("error", "تم رفض الإذن");
      updateBanner(false);
      return;
    }
    await idbSet(ROOT_KEY, rootHandle);
    dataDirHandle = await rootHandle.getDirectoryHandle("data", { create: true });
    setStorageStatus("active", "نشط • " + rootHandle.name);
    document.getElementById("clearStorageBtn").classList.remove("hidden");
    updateBanner(true);
  }catch(e){
    setStorageStatus("error", "لم يتم اختيار مجلد");
    updateBanner(false);
  }
}

async function reconnectStorageFlow(){
  const state = await resolveStorageState();
  if(state.hasHandle && !state.granted){
    const permission = await state.handle.requestPermission({ mode: "readwrite" });
    if(permission === "granted"){
      await refreshStorageStatus();
      return;
    }
  }
  await connectStorageFlow();
}

function setupStorage(){
  document.getElementById("connectStorageBtn").addEventListener("click", connectStorageFlow);
  document.getElementById("bannerReconnectBtn").addEventListener("click", reconnectStorageFlow);

  document.getElementById("clearStorageBtn").addEventListener("click", async () => {
    if(!dataDirHandle) return;
    if(!confirm("هل أنت متأكد إنك عايز تمسح كل البيانات المحفوظة؟")) return;
    for await (const name of dataDirHandle.keys()){
      await dataDirHandle.removeEntry(name, { recursive: true });
    }
    alert("تم مسح البيانات");
  });

  document.getElementById("newProjectCard").addEventListener("click", e => {
    if(!storageIsActive){
      e.preventDefault();
      document.querySelector('.tab-btn[data-tab="storage"]').click();
      document.getElementById("storageBanner").classList.remove("hidden");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  runBackgroundCanvas();
  setupLogout();
  setupTabs();
  setupComposer();
  setupStorage();
  setupWhatsappModal();
  checkSession().then(() => {
    if(currentUser) loadInfoMessage();
  });
  refreshStorageStatus();
});

//=======================BdaCODE,ElAssist=====================

(function () {
  "use strict";

  if (window.__A9NA_CHAT_WIDGET_LOADED__) return;
  window.__A9NA_CHAT_WIDGET_LOADED__ = true;

  var CFG = {
    whatsappNumber: "201274277202",           
    howToVideoUrl: "../more/how.html", 
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
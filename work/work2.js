const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxXiL3TWWo4U3-12kpH5PKR8Vcl4CqIp09FMZeQwf1pK6-OC1fRwllRn-znJRpeWu3r/exec",
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
    body: JSON.stringify(Object.assign({}, payload, { token: session ? session.token : null }))
  });
  return res.json();
}

async function checkSession(){
  const session = getSession();
  if(!session || !session.token || new Date(session.expiresAt).getTime() < Date.now()){
    clearSession();
    goToLogin();
    return false;
  }
  try{
    const result = await callApi({ action: "checkSession", token: session.token });
    if(!result.ok){
      clearSession();
      goToLogin();
      return false;
    }
    if(result.user.rule === "close"){
      window.location.href = "../main/main.html";
      return false;
    }
    renderUser(result.user);
    document.getElementById("sessionLoader").classList.add("hidden");
    return true;
  }catch(e){
    document.getElementById("sessionLoader").innerHTML = "<p>تعذر الاتصال</p>";
    return false;
  }
}

function renderUser(user){
  const avatar = user.imgProUrl || "../img/pro1.png";
  document.getElementById("userAvatar").src = avatar;
  document.getElementById("userName").textContent = user.name;
  document.getElementById("userName").className = "user-name role-" + user.rule;
  const ring = document.getElementById("avatarRing");
  if(ring) ring.className = "avatar-ring role-" + user.rule;
  const ownBadge = document.getElementById("ownBadge");
  if(ownBadge) ownBadge.classList.toggle("hidden", user.rule !== "own");

  const badge = document.getElementById("userBadge");
  if(badge){
    const label = roleLabels[user.rule] || "";
    if(label){
      badge.textContent = label;
      badge.classList.remove("hidden");
    }else{
      badge.classList.add("hidden");
    }
  }
}

const DB_NAME = "asn3_storage";
const STORE_NAME = "handles";
const ROOT_KEY = "rootHandle";

function openHandleDb(){
  return new Promise(function(resolve, reject){
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function(){ req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = function(){ resolve(req.result); };
    req.onerror = function(){ reject(req.error); };
  });
}

async function idbGet(key){
  const db = await openHandleDb();
  return new Promise(function(resolve, reject){
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = function(){ resolve(req.result || null); };
    req.onerror = function(){ reject(req.error); };
  });
}

let dataDirHandle = null;
let projectDirHandle = null;
let projectFileHandle = null;
let projectData = null;
let projectId = null;

async function ensureStorageActive(){
  if(!("showDirectoryPicker" in window)) return false;
  const rootHandle = await idbGet(ROOT_KEY);
  if(!rootHandle) return false;
  const permission = await rootHandle.queryPermission({ mode: "readwrite" });
  if(permission !== "granted") return false;
  dataDirHandle = await rootHandle.getDirectoryHandle("data", { create: true });
  return true;
}

async function loadProject(){
  projectId = localStorage.getItem("asn3_open_project_id");
  if(!projectId){
    window.location.href = "work.html";
    return false;
  }
  try{
    projectDirHandle = await dataDirHandle.getDirectoryHandle(projectId);
    projectFileHandle = await projectDirHandle.getFileHandle("project.json");
    const file = await projectFileHandle.getFile();
    const text = await file.text();
    projectData = JSON.parse(text);
    if(!projectData.sheets || !projectData.sheets.length){
      projectData.sheets = [{ id: "s1", elements: [] }];
    }
    if(!projectData.sheetWidth) projectData.sheetWidth = 794;
    if(!projectData.sheetHeight) projectData.sheetHeight = 1123;
    if(projectData.activeSheetIndex === undefined) projectData.activeSheetIndex = 0;

    document.getElementById("projectTitle").textContent = projectData.meta.name;
    return true;
  }catch(e){
    window.location.href = "work.html";
    return false;
  }
}

function activeSheet(){
  const idx = projectData.activeSheetIndex || 0;
  return projectData.sheets[idx] || projectData.sheets[0];
}

let saveTimer = null;
let saveInFlight = false;

function setSaveStatus(state, text){
  const el = document.getElementById("saveStatus");
  el.className = "save-status-pill" + (state ? " " + state : "");
  document.getElementById("saveStatusText").textContent = text;
}

function markDirty(){
  projectData.meta.updatedAt = new Date().toISOString();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(performSave, 700);
}

async function performSave(){
  if(saveInFlight) return;
  saveInFlight = true;
  setSaveStatus("saving", "جاري الحفظ");
  try{
    const writable = await projectFileHandle.createWritable();
    await writable.write(JSON.stringify(projectData));
    await writable.close();
    setSaveStatus("saved", "تم الحفظ");
  }catch(e){
    setSaveStatus("error", "خطأ في الحفظ");
  }finally{
    saveInFlight = false;
  }
}

function forceSave(){
  clearTimeout(saveTimer);
  performSave();
}

const undoStack = [];
const redoStack = [];

function pushUndoState(){
  undoStack.push(JSON.stringify(projectData.sheets));
  if(undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
  updateHistoryBtns();
}

function updateHistoryBtns(){
  document.getElementById("undoBtn").disabled = undoStack.length === 0;
  document.getElementById("redoBtn").disabled = redoStack.length === 0;
}

function performUndo(){
  if(!undoStack.length) return;
  redoStack.push(JSON.stringify(projectData.sheets));
  projectData.sheets = JSON.parse(undoStack.pop());
  selectedElId = null;
  renderAllSheets();
  deselectElement();
  markDirty();
  updateHistoryBtns();
}

function performRedo(){
  if(!redoStack.length) return;
  undoStack.push(JSON.stringify(projectData.sheets));
  projectData.sheets = JSON.parse(redoStack.pop());
  selectedElId = null;
  renderAllSheets();
  deselectElement();
  markDirty();
  updateHistoryBtns();
}
let currentZoom = 1;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 2.0;

function applyZoom(z){
  currentZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  document.getElementById("canvasScaler").style.transform = "scale(" + currentZoom + ")";
  const pct = Math.round(currentZoom * 100);
  document.getElementById("zoomLabel").textContent = pct + "%";
  document.getElementById("zoomSlider").value = pct;
}

function zoomIn(){
  applyZoom(currentZoom + 0.1);
}

function zoomOut(){
  applyZoom(currentZoom - 0.1);
}

function zoomFit(){
  const stage = document.getElementById("canvasArea");
  const availW = stage.clientWidth - 80;
  const availH = stage.clientHeight - 80;
  const sheetW = projectData.sheetWidth || 794;
  const sheetH = projectData.sheetHeight || 1123;
  const fitRatio = Math.min(availW / sheetW, availH / sheetH);
  applyZoom(Math.max(ZOOM_MIN, Math.min(1.0, Math.round(fitRatio * 20) / 20)));
}

function setupZoomControls(){
  document.getElementById("zoomInBtn").addEventListener("click", zoomIn);
  document.getElementById("zoomOutBtn").addEventListener("click", zoomOut);
  document.getElementById("zoomFitBtn").addEventListener("click", zoomFit);

  document.getElementById("zoomSlider").addEventListener("input", function(e){
    applyZoom(Number(e.target.value) / 100);
  });

  document.getElementById("canvasArea").addEventListener("wheel", function(e){
    if(e.ctrlKey || e.metaKey){
      e.preventDefault();
      e.deltaY < 0 ? zoomIn() : zoomOut();
    }
  }, { passive: false });
}

const fontFamilies = [
  "Alegreya Sans SC","Alexandria","Alkalami","Amiri Quran","Amiri","Anek Telugu","Archivo Black",
  "Aref Ruqaa Ink","Aref Ruqaa","Badeen Display","Bebas Neue","Beiruti","Betania Patmos",
  "Bitcount Grid Double","Black Ops One","Blaka","Blaka Hollow","Blaka Ink","Bungee","Bungee Tint",
  "Butcherman","Butterfly Kids","Bytesized","Caacupe One","Cairo Play","Cardo","Cascadia Code",
  "Cascadia Mono","Caveat","Changa","Cinzel","Crimson Text","Dancing Script","El Messiri",
  "Estonia","Exo 2","Explora","Fira Sans","Fjalla One","Frank Ruhl Libre","Gilda Display",
  "Google Sans Flex","Gravitas One","Great Vibes","Gulzar","Heebo","Inspiration","Jaini Purva",
  "Katibeh","Kings","Kufam","Lalezar","Langar","Lateef","Lemonada","Libertinus Keyboard",
  "Libre Baskerville","Lilita One","Lobster","Lobster Two","Long Cang","Mada","Marcellus",
  "Marhey","Markazi Text","Mirza","Modak","Montserrat","Mrs Sheppards","Nanum Myeongjo",
  "Noto Color Emoji","Noto Emoji","Noto Nastaliq Urdu","Noto Sans Arabic","Noto Sans Cypro Minoan",
  "Noto Sans Mono","Noto Serif Display","Noto Serif","Oi","Open Sans","Orbitron","Oswald",
  "Pacifico","Permanent Marker","Playfair Display","Playpen Sans Arabic","Playwrite BR Guides",
  "Poppins","Press Start 2P","Qahiri","Quantico","Rakkas","Ramabhadra","Reem Kufi Fun",
  "Reem Kufi Ink","Reem Kufi","Righteous","Roboto Condensed","Roboto","Rock 3D","Rubik Burned",
  "Rubik Spray Paint","Ruwudu","Saira Condensed","Satisfy","Scheherazade New","Share Tech",
  "Slackside One","Smooch Sans","Spectral","Splash","Taviraj","Titan One","Unbounded","Yesteryear","Zain"
];

const DEFAULT_FONT = "Tajawal";

const presetDefaults = {
  heading: { text: "إضافة عنوان رئيسي", fontSize: 44, fontWeight: "800", width: 440, lineHeight: 1.2 },
  subheading: { text: "إضافة عنوان فرعي", fontSize: 26, fontWeight: "600", width: 360, lineHeight: 1.3 },
  small: { text: "إضافة نص تكميلي صغير", fontSize: 16, fontWeight: "400", width: 280, lineHeight: 1.5 }
};

let selectedElId = null;
let selectedSheetIndex = 0;

function createElementId(){
  return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function updatePageNavStatus(){
  const dropdown = document.getElementById("pageSelectDropdown");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const total = projectData.sheets.length;
  const curr = projectData.activeSheetIndex || 0;

  if(dropdown){
    dropdown.innerHTML = "";
    for(let i = 0; i < total; i++){
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = "صفحة " + (i + 1) + " من " + total;
      if(i === curr) opt.selected = true;
      dropdown.appendChild(opt);
    }
  }

  if(prevBtn) prevBtn.disabled = curr <= 0;
  if(nextBtn) nextBtn.disabled = curr >= total - 1;
}

function goToPage(index){
  const total = projectData.sheets.length;
  const targetIndex = Math.max(0, Math.min(total - 1, index));
  projectData.activeSheetIndex = targetIndex;
  updatePageNavStatus();
  refreshLayersPanel();

  const wrappers = document.querySelectorAll(".sheet-wrapper");
  if(wrappers[targetIndex]){
    wrappers[targetIndex].scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function setupPageNavCluster(){
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const dropdown = document.getElementById("pageSelectDropdown");

  if(prevBtn){
    prevBtn.addEventListener("click", function(){
      goToPage((projectData.activeSheetIndex || 0) - 1);
    });
  }

  if(nextBtn){
    nextBtn.addEventListener("click", function(){
      goToPage((projectData.activeSheetIndex || 0) + 1);
    });
  }

  if(dropdown){
    dropdown.addEventListener("change", function(e){
      goToPage(Number(e.target.value));
    });
  }
}

function addNewPage(){
  pushUndoState();
  const newSheet = { id: createElementId(), elements: [] };
  projectData.sheets.push(newSheet);
  projectData.activeSheetIndex = projectData.sheets.length - 1;
  renderAllSheets();
  markDirty();
  updatePageNavStatus();
  setTimeout(function(){
    goToPage(projectData.sheets.length - 1);
  }, 100);
}

function duplicateSheet(index){
  pushUndoState();
  const src = projectData.sheets[index];
  if(!src) return;
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = createElementId();
  clone.elements.forEach(function(el){ el.id = createElementId(); });
  projectData.sheets.splice(index + 1, 0, clone);
  projectData.activeSheetIndex = index + 1;
  renderAllSheets();
  markDirty();
  updatePageNavStatus();
  setTimeout(function(){ goToPage(index + 1); }, 100);
}

function deleteSheet(index){
  if(projectData.sheets.length <= 1) return;
  pushUndoState();
  projectData.sheets.splice(index, 1);
  projectData.activeSheetIndex = Math.max(0, index - 1);
  selectedElId = null;
  deselectElement();
  renderAllSheets();
  markDirty();
  updatePageNavStatus();
}

function addTextElement(kind, posX, posY, targetSheetIndex){
  pushUndoState();
  const sIdx = targetSheetIndex !== undefined ? targetSheetIndex : (projectData.activeSheetIndex || 0);
  const targetSheet = projectData.sheets[sIdx] || projectData.sheets[0];
  const preset = presetDefaults[kind] || presetDefaults.heading;
  const sheetW = projectData.sheetWidth || 794;
  const defaultX = (sheetW - preset.width) / 2;
  const defaultY = 140 + (targetSheet.elements.length % 7) * 45;

  const el = {
    id: createElementId(),
    kind: kind,
    text: preset.text,
    x: posX !== undefined ? posX : Math.max(40, defaultX),
    y: posY !== undefined ? posY : defaultY,
    width: preset.width,
    fontSize: preset.fontSize,
    fontFamily: DEFAULT_FONT,
    fontWeight: preset.fontWeight,
    italic: false,
    underline: false,
    color: "#111111",
    align: "center",
    lineHeight: preset.lineHeight,
    opacity: 1
  };
  targetSheet.elements.push(el);
  projectData.activeSheetIndex = sIdx;
  renderAllSheets();
  selectElement(el.id, sIdx);
  markDirty();
  updatePageNavStatus();
}

function renderAllSheets(){
  const container = document.getElementById("pagesContainer");
  container.innerHTML = "";
  const total = projectData.sheets.length;
  const sheetW = projectData.sheetWidth || 794;
  const sheetH = projectData.sheetHeight || 1123;

  projectData.sheets.forEach(function(sheetData, sIdx){
    const wrapper = document.createElement("div");
    wrapper.className = "sheet-wrapper";
    wrapper.dataset.sheetIndex = sIdx;

    const header = document.createElement("div");
    header.className = "sheet-header-pill";
    header.style.width = sheetW + "px";
    header.innerHTML = '<span class="sheet-page-label">صفحة ' + (sIdx + 1) + " من " + total + "</span>" +
      '<div class="sheet-page-actions">' +
      '<button class="page-action-btn" data-action="duplicate-page" data-idx="' + sIdx + '" title="تكرار الصفحة"><i><svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></i></button>' +
      (total > 1 ? '<button class="page-action-btn danger" data-action="delete-page" data-idx="' + sIdx + '" title="حذف الصفحة"><i><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></i></button>' : "") +
      "</div>";
    wrapper.appendChild(header);

    const sheetNode = document.createElement("div");
    sheetNode.className = "sheet a4-sheet";
    sheetNode.id = "sheet-" + sheetData.id;
    sheetNode.dataset.sheetIndex = sIdx;
    sheetNode.style.width = sheetW + "px";
    sheetNode.style.height = sheetH + "px";

    const overlay = document.createElement("div");
    overlay.className = "sheet-drop-overlay hidden";
    overlay.innerHTML = '<div class="drop-indicator-box"><i><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></i><span>أفلت النص في صفحة ' + (sIdx + 1) + "</span></div>";
    sheetNode.appendChild(overlay);

    sheetData.elements.forEach(function(el){
      sheetNode.appendChild(buildElementNode(el, sIdx));
    });

    wrapper.appendChild(sheetNode);
    container.appendChild(wrapper);

    attachSheetDropEvents(sheetNode, sIdx);
  });

  document.querySelectorAll("[data-action='duplicate-page']").forEach(function(btn){
    btn.addEventListener("click", function(){ duplicateSheet(Number(btn.dataset.idx)); });
  });
  document.querySelectorAll("[data-action='delete-page']").forEach(function(btn){
    btn.addEventListener("click", function(){ deleteSheet(Number(btn.dataset.idx)); });
  });

  updatePageNavStatus();
  refreshLayersPanel();
}
function buildElementNode(elData, sIdx){
  const node = document.createElement("div");
  node.className = "el" + (selectedElId === elData.id ? " selected" : "");
  node.dataset.id = elData.id;
  node.dataset.sheetIndex = sIdx;
  applyElStyle(node, elData);

  const textBox = document.createElement("div");
  textBox.className = "el-text-box";
  textBox.contentEditable = "false";
  textBox.innerText = elData.text;
  node.appendChild(textBox);

  const controls = document.createElement("div");
  controls.className = "el-transform-controls";
  controls.innerHTML = '<span class="resize-handle resize-tl" data-corner="tl"></span>' +
    '<span class="resize-handle resize-tr" data-corner="tr"></span>' +
    '<span class="resize-handle resize-bl" data-corner="bl"></span>' +
    '<span class="resize-handle resize-br" data-corner="br"></span>' +
    '<span class="resize-pill-e"></span>' +
    '<span class="resize-pill-w"></span>';
  node.appendChild(controls);

  attachElementEvents(node, textBox, elData, sIdx);
  return node;
}

function applyElStyle(node, elData){
  node.style.left = elData.x + "px";
  node.style.top = elData.y + "px";
  node.style.width = elData.width + "px";
  node.style.fontSize = elData.fontSize + "px";
  node.style.fontFamily = "'" + elData.fontFamily + "', sans-serif";
  node.style.fontWeight = elData.fontWeight;
  node.style.fontStyle = elData.italic ? "italic" : "normal";
  node.style.textDecoration = elData.underline ? "underline" : "none";
  node.style.color = elData.color;
  node.style.textAlign = elData.align;
  node.style.lineHeight = elData.lineHeight || 1.3;
  node.style.opacity = elData.opacity !== undefined ? elData.opacity : 1;
}

function getElData(id){
  for(let i = 0; i < projectData.sheets.length; i++){
    const found = projectData.sheets[i].elements.find(function(e){ return e.id === id; });
    if(found) return { el: found, sheetIndex: i };
  }
  return null;
}

function getActiveSheetElements(){
  const idx = projectData.activeSheetIndex || 0;
  return projectData.sheets[idx] ? projectData.sheets[idx].elements : [];
}

function attachElementEvents(node, textBox, elData, sIdx){
  let dragging = false;
  let dragStartX = 0, dragStartY = 0, startLeft = 0, startTop = 0;
  let moved = false;

  node.addEventListener("mousedown", function(e){
    if(e.target.closest(".resize-handle") || e.target.closest(".resize-pill-e") || e.target.closest(".resize-pill-w")) return;
    if(textBox.contentEditable === "true") return;

    selectElement(elData.id, sIdx);
    dragging = true;
    moved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    startLeft = elData.x;
    startTop = elData.y;
    e.stopPropagation();
  });

  document.addEventListener("mousemove", function(e){
    if(!dragging) return;
    const dx = (e.clientX - dragStartX) / currentZoom;
    const dy = (e.clientY - dragStartY) / currentZoom;
    if(Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    elData.x = Math.max(0, startLeft + dx);
    elData.y = Math.max(0, startTop + dy);
    node.style.left = elData.x + "px";
    node.style.top = elData.y + "px";
  });

  document.addEventListener("mouseup", function(){
    if(dragging){
      if(moved){ pushUndoState(); markDirty(); }
      dragging = false;
    }
  });

  textBox.addEventListener("input", function(){
    elData.text = textBox.innerText;
    markDirty();
    refreshLayersPanel();
  });

  node.addEventListener("dblclick", function(e){
    e.stopPropagation();
    node.classList.add("editing");
    textBox.contentEditable = "true";
    textBox.focus();
    placeCaretAtEnd(textBox);
  });

  textBox.addEventListener("blur", function(){
    node.classList.remove("editing");
    textBox.contentEditable = "false";
    const newText = textBox.innerText.trim();
    if(newText){
      elData.text = newText;
      pushUndoState();
      markDirty();
      refreshLayersPanel();
    }
  });

  node.querySelectorAll(".resize-handle").forEach(function(handle){
    let resizing = false;
    let rStartX = 0, rStartW = 0, rStartSize = 0;

    handle.addEventListener("mousedown", function(e){
      e.stopPropagation();
      e.preventDefault();
      resizing = true;
      rStartX = e.clientX;
      rStartW = elData.width;
      rStartSize = elData.fontSize;
    });

    document.addEventListener("mousemove", function(e){
      if(!resizing) return;
      const dx = (e.clientX - rStartX) / currentZoom;
      const corner = handle.dataset.corner;
      const factor = (corner === "br" || corner === "tr") ? -dx : dx;
      const newWidth = Math.max(50, rStartW + factor);
      const ratio = newWidth / rStartW;
      const newFontSize = Math.max(10, Math.min(300, Math.round(rStartSize * ratio)));

      elData.width = newWidth;
      elData.fontSize = newFontSize;
      node.style.width = newWidth + "px";
      node.style.fontSize = newFontSize + "px";

      const sizeInput = document.getElementById("fontSizeInput");
      if(sizeInput) sizeInput.value = newFontSize;
    });

    document.addEventListener("mouseup", function(){
      if(resizing){
        resizing = false;
        pushUndoState();
        markDirty();
      }
    });
  });

  const sideHandles = [node.querySelector(".resize-pill-e"), node.querySelector(".resize-pill-w")];
  sideHandles.forEach(function(pill){
    if(!pill) return;
    let resizingPill = false;
    let pStartX = 0, pStartW = 0;

    pill.addEventListener("mousedown", function(e){
      e.stopPropagation();
      e.preventDefault();
      resizingPill = true;
      pStartX = e.clientX;
      pStartW = elData.width;
    });

    document.addEventListener("mousemove", function(e){
      if(!resizingPill) return;
      const dx = (e.clientX - pStartX) / currentZoom;
      const factor = pill.classList.contains("resize-pill-e") ? -dx : dx;
      elData.width = Math.max(40, pStartW + factor * 2);
      node.style.width = elData.width + "px";
    });

    document.addEventListener("mouseup", function(){
      if(resizingPill){
        resizingPill = false;
        pushUndoState();
        markDirty();
      }
    });
  });
}

function placeCaretAtEnd(node){
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function selectElement(id, sIdx){
  selectedElId = id;
  selectedSheetIndex = sIdx !== undefined ? sIdx : (projectData.activeSheetIndex || 0);
  projectData.activeSheetIndex = selectedSheetIndex;
  updatePageNavStatus();

  document.querySelectorAll(".el").forEach(function(n){
    n.classList.toggle("selected", n.dataset.id === id);
  });

  const res = getElData(id);
  if(!res) return;
  syncFloatingContextBar(res.el);
  refreshLayersPanel();
}

function deselectElement(){
  selectedElId = null;
  document.querySelectorAll(".el").forEach(function(n){
    n.classList.remove("selected");
    n.classList.remove("editing");
    const tb = n.querySelector(".el-text-box");
    if(tb) tb.contentEditable = "false";
  });
  document.getElementById("floatingContextBar").classList.add("hidden");
  refreshLayersPanel();
}

function syncFloatingContextBar(data){
  const bar = document.getElementById("floatingContextBar");
  bar.classList.remove("hidden");

  document.getElementById("currentFontLabel").textContent = data.fontFamily;
  document.getElementById("currentFontLabel").style.fontFamily = "'" + data.fontFamily + "', sans-serif";
  document.getElementById("fontSizeInput").value = data.fontSize;
  document.getElementById("colorInput").value = data.color;
  document.getElementById("textColorBar").style.background = data.color;
  document.getElementById("lineHeightInput").value = data.lineHeight || 1.3;
  document.getElementById("opacityInput").value = Math.round((data.opacity !== undefined ? data.opacity : 1) * 100);
  document.getElementById("opacityLabel").textContent = Math.round((data.opacity !== undefined ? data.opacity : 1) * 100) + "%";

  document.getElementById("alignRightBtn").classList.toggle("active", data.align === "right");
  document.getElementById("alignCenterBtn").classList.toggle("active", data.align === "center");
  document.getElementById("alignLeftBtn").classList.toggle("active", data.align === "left");

  document.getElementById("boldBtn").classList.toggle("active", data.fontWeight === "700" || data.fontWeight === "800");
  document.getElementById("italicBtn").classList.toggle("active", !!data.italic);
  document.getElementById("underlineBtn").classList.toggle("active", !!data.underline);
}

function applyToSelected(mutator){
  if(!selectedElId) return;
  const res = getElData(selectedElId);
  if(!res) return;
  mutator(res.el);
  const node = document.querySelector('.el[data-id="' + selectedElId + '"]');
  if(node) applyElStyle(node, res.el);
  markDirty();
}

function changeLayerOrder(id, fn){
  if(!id) return;
  const res = getElData(id);
  if(!res) return;
  pushUndoState();
  const els = projectData.sheets[res.sheetIndex].elements;
  const idx = els.findIndex(function(e){ return e.id === id; });
  if(idx === -1) return;
  fn(els, idx);
  renderAllSheets();
  selectElement(id, res.sheetIndex);
  markDirty();
}

function bringForward(){
  changeLayerOrder(selectedElId, function(els, idx){
    if(idx < els.length - 1){
      const tmp = els[idx];
      els[idx] = els[idx + 1];
      els[idx + 1] = tmp;
    }
  });
}

function sendBackward(){
  changeLayerOrder(selectedElId, function(els, idx){
    if(idx > 0){
      const tmp = els[idx];
      els[idx] = els[idx - 1];
      els[idx - 1] = tmp;
    }
  });
}

function bringToFront(){
  changeLayerOrder(selectedElId, function(els, idx){
    const el = els.splice(idx, 1)[0];
    els.push(el);
  });
}

function sendToBack(){
  changeLayerOrder(selectedElId, function(els, idx){
    const el = els.splice(idx, 1)[0];
    els.unshift(el);
  });
}

function deleteSelectedElement(){
  if(!selectedElId) return;
  pushUndoState();
  for(let i = 0; i < projectData.sheets.length; i++){
    projectData.sheets[i].elements = projectData.sheets[i].elements.filter(function(e){ return e.id !== selectedElId; });
  }
  deselectElement();
  renderAllSheets();
  markDirty();
}

function duplicateSelectedElement(){
  if(!selectedElId) return;
  pushUndoState();
  const res = getElData(selectedElId);
  if(!res) return;
  const copy = JSON.parse(JSON.stringify(res.el));
  copy.id = createElementId();
  copy.x += 24;
  copy.y += 24;
  projectData.sheets[res.sheetIndex].elements.push(copy);
  renderAllSheets();
  selectElement(copy.id, res.sheetIndex);
  markDirty();
}

function refreshLayersPanel(){
  const list = document.getElementById("layersList");
  if(!list) return;
  const els = getActiveSheetElements();
  if(!els.length){
    list.innerHTML = '<div class="layers-empty">لا توجد عناصر في هذه الصفحة</div>';
    return;
  }
  list.innerHTML = "";
  const reversed = els.slice().reverse();

  reversed.forEach(function(el){
    const card = document.createElement("div");
    card.className = "layer-card" + (selectedElId === el.id ? " active" : "");
    card.dataset.id = el.id;
    const preview = el.text ? (el.text.slice(0, 26) + (el.text.length > 26 ? "..." : "")) : "عنصر";

    card.innerHTML = '<div class="layer-card-left">' +
      '<span class="layer-icon"><i><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg></i></span>' +
      '<span class="layer-text-preview">' + preview + "</span>" +
      "</div>" +
      '<div class="layer-card-actions">' +
      '<button class="layer-mini-btn" data-la="up" data-id="' + el.id + '" title="تقديم للأمام"><i><svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></i></button>' +
      '<button class="layer-mini-btn" data-la="down" data-id="' + el.id + '" title="تأخير للخلف"><i><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></i></button>' +
      '<button class="layer-mini-btn danger" data-la="del" data-id="' + el.id + '" title="حذف"><i><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></i></button>' +
      "</div>";

    card.addEventListener("click", function(e){
      if(e.target.closest(".layer-mini-btn")) return;
      selectElement(el.id, projectData.activeSheetIndex || 0);
    });

    list.appendChild(card);
  });

  list.querySelectorAll("[data-la]").forEach(function(btn){
    btn.addEventListener("click", function(e){
      e.stopPropagation();
      const id = btn.dataset.id;
      const action = btn.dataset.la;
      selectedElId = id;
      if(action === "up") bringForward();
      else if(action === "down") sendBackward();
      else if(action === "del") deleteSelectedElement();
    });
  });
}

function setupLayersPanel(){
  document.getElementById("panelBringForwardBtn").addEventListener("click", bringForward);
  document.getElementById("panelSendBackwardBtn").addEventListener("click", sendBackward);
  document.getElementById("panelBringToFrontBtn").addEventListener("click", bringToFront);
  document.getElementById("panelSendToBackBtn").addEventListener("click", sendToBack);
}
function setupContextBarControls(){
  document.getElementById("fontSizeInput").addEventListener("input", function(e){
    applyToSelected(function(d){ d.fontSize = Number(e.target.value) || d.fontSize; });
  });

  document.getElementById("fontSizeDown").addEventListener("click", function(){
    const inp = document.getElementById("fontSizeInput");
    const v = Math.max(8, (Number(inp.value) || 16) - 2);
    inp.value = v;
    applyToSelected(function(d){ d.fontSize = v; });
  });

  document.getElementById("fontSizeUp").addEventListener("click", function(){
    const inp = document.getElementById("fontSizeInput");
    const v = Math.min(400, (Number(inp.value) || 16) + 2);
    inp.value = v;
    applyToSelected(function(d){ d.fontSize = v; });
  });

  document.getElementById("colorInput").addEventListener("input", function(e){
    const col = e.target.value;
    document.getElementById("textColorBar").style.background = col;
    applyToSelected(function(d){ d.color = col; });
  });

  document.getElementById("boldBtn").addEventListener("click", function(){
    applyToSelected(function(d){ d.fontWeight = (d.fontWeight === "700" || d.fontWeight === "800") ? "400" : "700"; });
    const res = getElData(selectedElId);
    if(res) document.getElementById("boldBtn").classList.toggle("active", res.el.fontWeight === "700" || res.el.fontWeight === "800");
  });

  document.getElementById("italicBtn").addEventListener("click", function(){
    applyToSelected(function(d){ d.italic = !d.italic; });
    const res = getElData(selectedElId);
    if(res) document.getElementById("italicBtn").classList.toggle("active", !!res.el.italic);
  });

  document.getElementById("underlineBtn").addEventListener("click", function(){
    applyToSelected(function(d){ d.underline = !d.underline; });
    const res = getElData(selectedElId);
    if(res) document.getElementById("underlineBtn").classList.toggle("active", !!res.el.underline);
  });

  document.getElementById("alignRightBtn").addEventListener("click", function(){
    applyToSelected(function(d){ d.align = "right"; });
    syncAlignButtons("right");
  });

  document.getElementById("alignCenterBtn").addEventListener("click", function(){
    applyToSelected(function(d){ d.align = "center"; });
    syncAlignButtons("center");
  });

  document.getElementById("alignLeftBtn").addEventListener("click", function(){
    applyToSelected(function(d){ d.align = "left"; });
    syncAlignButtons("left");
  });

  document.getElementById("spacingBtn").addEventListener("click", function(e){
    e.stopPropagation();
    document.getElementById("spacingPopover").classList.toggle("hidden");
    document.getElementById("opacityPopover").classList.add("hidden");
    document.getElementById("arrangeLayerPopover").classList.add("hidden");
  });

  document.getElementById("lineHeightInput").addEventListener("input", function(e){
    const v = parseFloat(e.target.value) || 1.3;
    applyToSelected(function(d){ d.lineHeight = v; });
  });

  document.getElementById("opacityBtn").addEventListener("click", function(e){
    e.stopPropagation();
    document.getElementById("opacityPopover").classList.toggle("hidden");
    document.getElementById("spacingPopover").classList.add("hidden");
    document.getElementById("arrangeLayerPopover").classList.add("hidden");
  });

  document.getElementById("opacityInput").addEventListener("input", function(e){
    const val = Number(e.target.value);
    document.getElementById("opacityLabel").textContent = val + "%";
    applyToSelected(function(d){ d.opacity = val / 100; });
  });

  document.getElementById("arrangeLayerBtn").addEventListener("click", function(e){
    e.stopPropagation();
    document.getElementById("arrangeLayerPopover").classList.toggle("hidden");
    document.getElementById("spacingPopover").classList.add("hidden");
    document.getElementById("opacityPopover").classList.add("hidden");
  });

  document.getElementById("btnBringForward").addEventListener("click", function(){
    bringForward();
    document.getElementById("arrangeLayerPopover").classList.add("hidden");
  });

  document.getElementById("btnSendBackward").addEventListener("click", function(){
    sendBackward();
    document.getElementById("arrangeLayerPopover").classList.add("hidden");
  });

  document.getElementById("btnBringToFront").addEventListener("click", function(){
    bringToFront();
    document.getElementById("arrangeLayerPopover").classList.add("hidden");
  });

  document.getElementById("btnSendToBack").addEventListener("click", function(){
    sendToBack();
    document.getElementById("arrangeLayerPopover").classList.add("hidden");
  });

  document.getElementById("duplicateElBtn").addEventListener("click", duplicateSelectedElement);
  document.getElementById("deleteElBtn").addEventListener("click", deleteSelectedElement);

  document.addEventListener("click", function(e){
    if(!e.target.closest(".context-popover-wrap")){
      document.getElementById("spacingPopover").classList.add("hidden");
      document.getElementById("opacityPopover").classList.add("hidden");
      document.getElementById("arrangeLayerPopover").classList.add("hidden");
    }
  });
}

function syncAlignButtons(align){
  document.getElementById("alignRightBtn").classList.toggle("active", align === "right");
  document.getElementById("alignCenterBtn").classList.toggle("active", align === "center");
  document.getElementById("alignLeftBtn").classList.toggle("active", align === "left");
}

function attachSheetDropEvents(sheetNode, sIdx){
  const overlay = sheetNode.querySelector(".sheet-drop-overlay");

  sheetNode.addEventListener("dragenter", function(e){
    e.preventDefault();
    if(overlay) overlay.classList.remove("hidden");
  });

  sheetNode.addEventListener("dragover", function(e){
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  sheetNode.addEventListener("dragleave", function(e){
    if(!sheetNode.contains(e.relatedTarget) && overlay){
      overlay.classList.add("hidden");
    }
  });

  sheetNode.addEventListener("drop", function(e){
    e.preventDefault();
    if(overlay) overlay.classList.add("hidden");
    const kind = e.dataTransfer.getData("text/plain");
    if(!kind) return;

    const rect = sheetNode.getBoundingClientRect();
    const preset = presetDefaults[kind] || presetDefaults.heading;
    const dropX = (e.clientX - rect.left) / currentZoom - (preset.width / 2);
    const dropY = (e.clientY - rect.top) / currentZoom - 20;

    const sheetW = projectData.sheetWidth || 794;
    const sheetH = projectData.sheetHeight || 1123;
    const finalX = Math.max(10, Math.min(sheetW - preset.width - 10, dropX));
    const finalY = Math.max(10, Math.min(sheetH - 60, dropY));

    addTextElement(kind, Math.round(finalX), Math.round(finalY), sIdx);
  });
}

function setupDragAndDrop(){
  document.querySelectorAll(".draggable-preset").forEach(function(card){
    card.addEventListener("dragstart", function(e){
      e.dataTransfer.setData("text/plain", card.dataset.kind);
      e.dataTransfer.effectAllowed = "copy";
    });

    card.addEventListener("click", function(){
      addTextElement(card.dataset.kind);
    });
  });
}

function setupSidebarNav(){
  const railBtns = document.querySelectorAll(".rail-item-btn");
  const panel = document.getElementById("toolPanel");
  const secTemplates = document.getElementById("templatesSection");
  const secText = document.getElementById("textToolSection");
  const secLayers = document.getElementById("layersSection");

  function openSection(tool){
    panel.classList.remove("collapsed");
    railBtns.forEach(function(b){ b.classList.toggle("active", b.dataset.tool === tool); });
    secTemplates.classList.toggle("hidden", tool !== "templates");
    secText.classList.toggle("hidden", tool !== "text");
    secLayers.classList.toggle("hidden", tool !== "layers");
    if(tool === "layers") refreshLayersPanel();
  }

  railBtns.forEach(function(btn){
    btn.addEventListener("click", function(){
      const tool = btn.dataset.tool;
      if(btn.classList.contains("active") && !panel.classList.contains("collapsed")){
        panel.classList.add("collapsed");
        btn.classList.remove("active");
      }else{
        openSection(tool);
      }
    });
  });

  const closeBtns = [
    document.getElementById("closePanelBtn"),
    document.getElementById("closePanelBtn2"),
    document.getElementById("closePanelBtn3")
  ];
  closeBtns.forEach(function(btn){
    if(btn){
      btn.addEventListener("click", function(){
        panel.classList.add("collapsed");
        railBtns.forEach(function(b){ b.classList.remove("active"); });
      });
    }
  });
}

async function loadTemplates(){
  const list = document.getElementById("templatesList");
  try{
    const res = await fetch("../tem/manifest.json");
    if(!res.ok) throw new Error();
    const templates = await res.json();
    if(!Array.isArray(templates) || !templates.length) throw new Error();
    list.innerHTML = "";
    templates.forEach(function(tpl){
      const card = document.createElement("div");
      card.className = "template-card";
      card.innerHTML = '<i><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></i><span>' + (tpl.name || "قالب") + "</span>";
      card.addEventListener("click", function(){ applyTemplate(tpl); });
      list.appendChild(card);
    });
  }catch(e){
    list.innerHTML = '<div class="template-placeholder">لا توجد قوالب متاحة حاليًا</div>';
  }
}

async function applyTemplate(tpl){
  if(!tpl.file) return;
  if(activeSheet().elements.length && !confirm("سيتم استبدال محتوى الورقة الحالية بالقالب، متابعة؟")) return;
  try{
    pushUndoState();
    const res = await fetch("../tem/" + tpl.file);
    const data = await res.json();
    activeSheet().elements = (data.elements || []).map(function(el){ return Object.assign({}, el, { id: createElementId() }); });
    renderAllSheets();
    markDirty();
  }catch(e){
    alert("تعذر تحميل القالب");
  }
}

function setupFontModal(){
  const modal = document.getElementById("fontModal");
  const listEl = document.getElementById("fontList");
  const searchInput = document.getElementById("fontSearchInput");

  function renderFontList(filter){
    listEl.innerHTML = "";
    const term = (filter || "").toLowerCase();
    const all = [DEFAULT_FONT].concat(fontFamilies);
    const current = selectedElId ? (getElData(selectedElId) ? getElData(selectedElId).el.fontFamily : null) : null;

    all.filter(function(f){ return f.toLowerCase().includes(term); }).forEach(function(font){
      const item = document.createElement("div");
      item.className = "font-option" + (font === current ? " active" : "");
      item.innerHTML = '<div class="font-option-name">' + font + '</div><div class="font-option-sample" style="font-family:\'' + font + '\', sans-serif"><span>Sample</span><span>نموذج</span></div>';
      item.addEventListener("click", function(){
        applyToSelected(function(d){ d.fontFamily = font; });
        document.getElementById("currentFontLabel").textContent = font;
        document.getElementById("currentFontLabel").style.fontFamily = "'" + font + "', sans-serif";
        modal.classList.add("hidden");
      });
      listEl.appendChild(item);
    });
  }

  document.getElementById("fontPickerBtn").addEventListener("click", function(){
    searchInput.value = "";
    renderFontList("");
    modal.classList.remove("hidden");
  });

  document.getElementById("closeFontModal").addEventListener("click", function(){ modal.classList.add("hidden"); });
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.classList.add("hidden"); });
  searchInput.addEventListener("input", function(){ renderFontList(searchInput.value); });
}

function setupFileInfoModal(){
  const modal = document.getElementById("fileInfoModal");
  document.getElementById("fileMenuBtn").addEventListener("click", function(){
    let totalElements = 0;
    projectData.sheets.forEach(function(s){ totalElements += s.elements.length; });
    const sheetW = projectData.sheetWidth || 794;
    const sheetH = projectData.sheetHeight || 1123;
    const dataSizeKb = (JSON.stringify(projectData).length / 1024).toFixed(1);

    document.getElementById("infoProjName").textContent = projectData.meta.name || "--";
    document.getElementById("infoProjType").textContent = projectData.meta.type || "مشروع عام";
    document.getElementById("infoPageCount").textContent = projectData.sheets.length;
    document.getElementById("infoElCount").textContent = totalElements;
    document.getElementById("infoSheetSize").textContent = sheetW + " × " + sheetH + " px";
    document.getElementById("infoCreateDate").textContent = projectData.meta.createdAt ? new Date(projectData.meta.createdAt).toLocaleString("ar-EG") : "--";
    document.getElementById("infoUpdateDate").textContent = projectData.meta.updatedAt ? new Date(projectData.meta.updatedAt).toLocaleString("ar-EG") : "--";
    document.getElementById("infoDataSize").textContent = dataSizeKb + " KB";

    modal.classList.remove("hidden");
  });

  document.getElementById("closeFileInfoModal").addEventListener("click", function(){ modal.classList.add("hidden"); });
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.classList.add("hidden"); });
}

function setupResizeModal(){
  const modal = document.getElementById("resizeModal");
  const wInput = document.getElementById("customWidthInput");
  const hInput = document.getElementById("customHeightInput");
  const presetBtns = document.querySelectorAll(".size-preset-btn");

  document.getElementById("resizeMenuBtn").addEventListener("click", function(){
    wInput.value = projectData.sheetWidth || 794;
    hInput.value = projectData.sheetHeight || 1123;
    presetBtns.forEach(function(b){
      const match = Number(b.dataset.w) === (projectData.sheetWidth || 794) && Number(b.dataset.h) === (projectData.sheetHeight || 1123);
      b.classList.toggle("active", match);
    });
    modal.classList.remove("hidden");
  });

  presetBtns.forEach(function(pBtn){
    pBtn.addEventListener("click", function(){
      presetBtns.forEach(function(b){ b.classList.remove("active"); });
      pBtn.classList.add("active");
      wInput.value = pBtn.dataset.w;
      hInput.value = pBtn.dataset.h;
    });
  });

  document.getElementById("applyResizeBtn").addEventListener("click", function(){
    const nw = Math.max(200, Math.min(4000, Number(wInput.value) || 794));
    const nh = Math.max(200, Math.min(4000, Number(hInput.value) || 1123));
    pushUndoState();
    projectData.sheetWidth = nw;
    projectData.sheetHeight = nh;
    renderAllSheets();
    markDirty();
    modal.classList.add("hidden");
    setTimeout(zoomFit, 100);
  });

  document.getElementById("closeResizeModal").addEventListener("click", function(){ modal.classList.add("hidden"); });
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.classList.add("hidden"); });
}

function setupExportModal(){
  const modal = document.getElementById("exportModal");
  const openBtn = document.getElementById("exportPdfBtn");
  const closeBtn = document.getElementById("closeExportModal");
  const confirmBtn = document.getElementById("confirmExportBtn");
  const progressBox = document.getElementById("exportProgress");
  const statusText = document.getElementById("exportStatusText");

  openBtn.addEventListener("click", function(){
    document.getElementById("exportPageCountLabel").textContent = projectData.sheets.length;
    document.getElementById("exportSizeLabel").textContent = (projectData.sheetWidth || 794) + " × " + (projectData.sheetHeight || 1123) + " px";
    progressBox.classList.add("hidden");
    confirmBtn.disabled = false;
    modal.classList.remove("hidden");
  });

  closeBtn.addEventListener("click", function(){ modal.classList.add("hidden"); });
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.classList.add("hidden"); });

  confirmBtn.addEventListener("click", async function(){
    confirmBtn.disabled = true;
    progressBox.classList.remove("hidden");
    statusText.textContent = "جاري تحضير ملف PDF وحفظه على جهازك...";

    deselectElement();
    const sheetW = projectData.sheetWidth || 794;
    const sheetH = projectData.sheetHeight || 1123;
    const orientation = sheetW > sheetH ? "l" : "p";
    const filename = (projectData.meta.name || "تصميم_اصنعها").replace(/[\\/:*?"<>|]/g, "_") + ".pdf";

    try{
      let fileHandle = null;
      if("showSaveFilePicker" in window){
        try{
          fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: "PDF Document",
              accept: { "application/pdf": [".pdf"] }
            }]
          });
        }catch(pickerErr){
          progressBox.classList.add("hidden");
          confirmBtn.disabled = false;
          return;
        }
      }

      const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
      if(!jsPDF || !window.html2canvas){
        throw new Error();
      }

      const pdf = new jsPDF({
        orientation: orientation,
        unit: "px",
        format: [sheetW, sheetH],
        hotfixes: ["px_scaling"]
      });

      const sheetWrappers = document.querySelectorAll(".sheet.a4-sheet");
      for(let i = 0; i < sheetWrappers.length; i++){
        statusText.textContent = "جاري معالجة صفحة " + (i + 1) + " من " + sheetWrappers.length + "...";
        const node = sheetWrappers[i];
        const canvas = await window.html2canvas(node, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        if(i > 0){
          pdf.addPage([sheetW, sheetH], orientation);
        }
        pdf.addImage(imgData, "JPEG", 0, 0, sheetW, sheetH);
      }

      statusText.textContent = "جاري كتابة الملف إلى جهازك...";

      if(fileHandle){
        const pdfArrayBuffer = pdf.output("arraybuffer");
        const writable = await fileHandle.createWritable();
        await writable.write(pdfArrayBuffer);
        await writable.close();
      }else{
        pdf.save(filename);
      }

      statusText.textContent = "تم التصدير بنجاح!";
      setTimeout(function(){
        modal.classList.add("hidden");
        progressBox.classList.add("hidden");
        confirmBtn.disabled = false;
      }, 800);

    }catch(err){
      statusText.textContent = "حدث خطأ أثناء تصدير PDF";
      setTimeout(function(){
        confirmBtn.disabled = false;
        progressBox.classList.add("hidden");
      }, 2000);
    }
  });
}

function isMatchKey(e, char, codeKey, keyCodeNum){
  const k = e.key ? e.key.toLowerCase() : "";
  return k === char || e.code === codeKey || e.keyCode === keyCodeNum || e.which === keyCodeNum;
}

function setupKeyboardShortcuts(){
  window.addEventListener("keydown", function(e){
    const ctrl = e.ctrlKey || e.metaKey;
    const active = document.activeElement;
    const isEditing = active && active.classList && (active.classList.contains("el-text-box") || active.classList.contains("el")) && active.contentEditable === "true";
    const inInput = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");

    if(ctrl && isMatchKey(e, "s", "KeyS", 83)){
      e.preventDefault();
      e.stopImmediatePropagation();
      forceSave();
      return;
    }

    if(ctrl && isMatchKey(e, "d", "KeyD", 68)){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(selectedElId && !isEditing) duplicateSelectedElement();
      return;
    }

    if(ctrl && isMatchKey(e, "z", "KeyZ", 90) && !e.shiftKey){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!isEditing) performUndo();
      return;
    }

    if(ctrl && (isMatchKey(e, "y", "KeyY", 89) || (isMatchKey(e, "z", "KeyZ", 90) && e.shiftKey))){
      e.preventDefault();
      e.stopImmediatePropagation();
      if(!isEditing) performRedo();
      return;
    }

    if(ctrl && isMatchKey(e, "b", "KeyB", 66) && selectedElId && !isEditing){
      e.preventDefault();
      e.stopImmediatePropagation();
      document.getElementById("boldBtn").click();
      return;
    }

    if(ctrl && isMatchKey(e, "i", "KeyI", 73) && selectedElId && !isEditing){
      e.preventDefault();
      e.stopImmediatePropagation();
      document.getElementById("italicBtn").click();
      return;
    }

    if(ctrl && isMatchKey(e, "u", "KeyU", 85) && selectedElId && !isEditing){
      e.preventDefault();
      e.stopImmediatePropagation();
      document.getElementById("underlineBtn").click();
      return;
    }

    if(ctrl && (e.key === "=" || e.key === "+" || e.code === "Equal" || e.code === "NumpadAdd")){
      e.preventDefault();
      zoomIn();
      return;
    }

    if(ctrl && (e.key === "-" || e.code === "Minus" || e.code === "NumpadSubtract")){
      e.preventDefault();
      zoomOut();
      return;
    }

    if(ctrl && (e.key === "0" || e.code === "Digit0" || e.code === "Numpad0")){
      e.preventDefault();
      applyZoom(1);
      return;
    }

    if(isEditing || inInput) return;

    if((e.key === "Delete" || e.key === "Backspace" || e.code === "Delete" || e.code === "Backspace") && selectedElId){
      e.preventDefault();
      deleteSelectedElement();
      return;
    }

    if(e.key === "Escape" && selectedElId){
      deselectElement();
      return;
    }
  }, true);

  document.addEventListener("click", function(e){
    if(!e.target.closest(".el") && !e.target.closest(".floating-context-bar") && !e.target.closest(".canva-sidebar-panel") && !e.target.closest(".font-modal-box") && !e.target.closest(".modal-box")){
      deselectElement();
    }
  });

  document.getElementById("undoBtn").addEventListener("click", performUndo);
  document.getElementById("redoBtn").addEventListener("click", performRedo);
  document.getElementById("addNewPageBtn").addEventListener("click", addNewPage);
}

document.addEventListener("DOMContentLoaded", async function(){
  const sessionOk = await checkSession();
  if(!sessionOk) return;

  const active = await ensureStorageActive();
  if(!active){
    document.getElementById("storageGate").classList.remove("hidden");
    return;
  }

  const loaded = await loadProject();
  if(!loaded) return;

  document.getElementById("app").classList.remove("hidden");
  setSaveStatus("", "تم الحفظ");

  renderAllSheets();
  setupDragAndDrop();
  setupContextBarControls();
  setupSidebarNav();
  setupFontModal();
  setupFileInfoModal();
  setupResizeModal();
  setupExportModal();
  setupKeyboardShortcuts();
  setupZoomControls();
  setupLayersPanel();
  setupPageNavCluster();
  loadTemplates();
  updateHistoryBtns();

  setTimeout(zoomFit, 150);
});

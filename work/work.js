const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbxXiL3TWWo4U3-12kpH5PKR8Vcl4CqIp09FMZeQwf1pK6-OC1fRwllRn-znJRpeWu3r/exec",
  SESSION_KEY: "asn3_session"
};

const roleLabels = { normal: "", pro: "مميز", vip: "فائق", own: "المالك" };

const typeMeta = {
  exam: { label: "امتحان", icon: '<path d="M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>' },
  workbook: { label: "ملزمة", icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"/>' },
  note: { label: "مذكرة", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"/><path d="M14 2v6h6M9 13h6m-6 4h4"/>' },
  book: { label: "كتاب", icon: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z"/>' },
  other: { label: "أخرى", icon: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>' }
};

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
    document.getElementById("sessionLoader").innerHTML = "<p>تعذر الاتصال بالخادم</p>";
    return false;
  }
}

function renderUser(user){
  const avatar = user.imgProUrl || "../img/pro1.png";
  document.getElementById("userAvatar").src = avatar;
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
}

function runBackgroundCanvas(){
  const canvas = document.getElementById("bgCanvas");
  const ctx = canvas.getContext("2d");
  let w, h;
  const blobs = Array.from({ length: 4 }, function(){
    return {
      x: Math.random(), y: Math.random(),
      r: 160 + Math.random() * 200,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0006,
      hue: Math.random() > 0.5 ? "94,161,255" : "87,224,208"
    };
  });
  function resize(){ w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
  function tick(){
    ctx.clearRect(0, 0, w, h);
    for(let i = 0; i < blobs.length; i++){
      const b = blobs[i];
      b.x += b.vx; b.y += b.vy;
      if(b.x < 0 || b.x > 1) b.vx *= -1;
      if(b.y < 0 || b.y > 1) b.vy *= -1;
      const cx = b.x * w, cy = b.y * h;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
      gradient.addColorStop(0, "rgba(" + b.hue + ",0.14)");
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

const DB_NAME = "asn3_storage";
const STORE_NAME = "handles";
const ROOT_KEY = "rootHandle";

function openHandleDb(){
  return new Promise(function(resolve, reject){
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = function(){ request.result.createObjectStore(STORE_NAME); };
    request.onsuccess = function(){ resolve(request.result); };
    request.onerror = function(){ reject(request.error); };
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

async function ensureStorageActive(){
  if(!("showDirectoryPicker" in window)) return false;
  const rootHandle = await idbGet(ROOT_KEY);
  if(!rootHandle) return false;
  const permission = await rootHandle.queryPermission({ mode: "readwrite" });
  if(permission !== "granted") return false;
  dataDirHandle = await rootHandle.getDirectoryHandle("data", { create: true });
  return true;
}

async function listProjects(){
  const projects = [];
  for await (const [name, handle] of dataDirHandle.entries()){
    if(handle.kind !== "directory") continue;
    try{
      const fileHandle = await handle.getFileHandle("project.json");
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      projects.push({ id: name, meta: data.meta });
    }catch(e){}
  }
  projects.sort(function(a, b){
    return new Date(b.meta.updatedAt || b.meta.createdAt) - new Date(a.meta.updatedAt || a.meta.createdAt);
  });
  return projects;
}

function renderProjects(projects){
  const grid = document.getElementById("projectsGrid");
  const empty = document.getElementById("projectsEmpty");
  grid.innerHTML = "";
  if(!projects.length){
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  projects.forEach(function(project){
    const meta = typeMeta[project.meta.type] || typeMeta.other;
    const card = document.createElement("div");
    card.className = "project-card";
    card.innerHTML = `
      <div class="project-icon"><i><svg viewBox="0 0 24 24">${meta.icon}</svg></i></div>
      <div class="project-name">${escapeHtml(project.meta.name)}</div>
      <div class="project-meta">${meta.label} • ${formatDate(project.meta.updatedAt || project.meta.createdAt)}</div>
    `;
    card.addEventListener("click", function(){ openProject(project.id); });
    grid.appendChild(card);
  });
}

function openProject(id){
  localStorage.setItem("asn3_open_project_id", id);
  window.location.href = "work2.html";
}

function formatDate(value){
  if(!value) return "--";
  const d = new Date(value);
  if(isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(str){
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function slugify(){
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function setupNewProjectModal(){
  const modal = document.getElementById("newProjectModal");
  const nameInput = document.getElementById("projectNameInput");
  const typeButtons = document.querySelectorAll(".type-btn");
  const confirmBtn = document.getElementById("confirmNewProjectBtn");
  let selectedType = null;

  function refreshConfirmState(){
    confirmBtn.disabled = !(nameInput.value.trim().length >= 2 && selectedType);
  }

  document.getElementById("newProjectBtn").addEventListener("click", function(){
    nameInput.value = "";
    selectedType = null;
    typeButtons.forEach(function(b){ b.classList.remove("selected"); });
    document.getElementById("newProjectMessage").textContent = "";
    refreshConfirmState();
    modal.classList.remove("hidden");
  });

  document.getElementById("closeNewProjectModal").addEventListener("click", function(){ modal.classList.add("hidden"); });
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.classList.add("hidden"); });

  nameInput.addEventListener("input", refreshConfirmState);

  typeButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      typeButtons.forEach(function(b){ b.classList.remove("selected"); });
      btn.classList.add("selected");
      selectedType = btn.dataset.type;
      refreshConfirmState();
    });
  });

  confirmBtn.addEventListener("click", async function(){
    const name = nameInput.value.trim();
    if(name.length < 2 || !selectedType) return;

    modal.classList.add("hidden");
    document.getElementById("overlayStatusText").textContent = "جاري إنشاء المشروع...";
    document.getElementById("creatingOverlay").classList.remove("hidden");

    try{
      const id = slugify();
      const projectDir = await dataDirHandle.getDirectoryHandle(id, { create: true });
      const now = new Date().toISOString();
      const projectData = {
        meta: { id: id, name: name, type: selectedType, createdAt: now, updatedAt: now },
        sheets: [{ id: "s1", elements: [] }],
        activeSheetIndex: 0
      };
      const fileHandle = await projectDir.getFileHandle("project.json", { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(projectData));
      await writable.close();

      setTimeout(function(){ openProject(id); }, 500);
    }catch(e){
      document.getElementById("creatingOverlay").classList.add("hidden");
      alert("تعذر إنشاء المشروع، تأكد من صلاحيات التخزين");
    }
  });
}

function setupImportModal(){
  const modal = document.getElementById("importProjectModal");
  const openBtn = document.getElementById("importProjectBtn");
  const closeBtn = document.getElementById("closeImportModal");
  const byFolderBtn = document.getElementById("importByFolderBtn");
  const fileInput = document.getElementById("importFileInput");
  const msg = document.getElementById("importMessage");

  openBtn.addEventListener("click", function(){
    msg.textContent = "";
    modal.classList.remove("hidden");
  });

  closeBtn.addEventListener("click", function(){ modal.classList.add("hidden"); });
  modal.addEventListener("click", function(e){ if(e.target === modal) modal.classList.add("hidden"); });

  byFolderBtn.addEventListener("click", async function(){
    if(!("showDirectoryPicker" in window)){
      msg.textContent = "المتصفح لا يدعم اختيار المجلدات مباشرة، يمكنك اختيار ملف project.json بالأسفل";
      return;
    }
    try{
      const chosenDir = await window.showDirectoryPicker();
      const projectFile = await chosenDir.getFileHandle("project.json");
      const file = await projectFile.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);

      if(!parsed.meta || !parsed.sheets){
        throw new Error("ملف المشروع غير صالح");
      }

      modal.classList.add("hidden");
      document.getElementById("overlayStatusText").textContent = "جاري استيراد وتحميل المشروع...";
      document.getElementById("creatingOverlay").classList.remove("hidden");

      const id = slugify();
      parsed.meta.id = id;
      parsed.meta.updatedAt = new Date().toISOString();

      const newDir = await dataDirHandle.getDirectoryHandle(id, { create: true });
      const newFile = await newDir.getFileHandle("project.json", { create: true });
      const writable = await newFile.createWritable();
      await writable.write(JSON.stringify(parsed));
      await writable.close();

      setTimeout(function(){ openProject(id); }, 500);
    }catch(err){
      if(err.name !== "AbortError"){
        msg.textContent = "تعذر تحميل المجلد، تأكد من وجود ملف project.json سليم بداخله";
      }
    }
  });

  fileInput.addEventListener("change", async function(e){
    const file = e.target.files[0];
    if(!file) return;

    try{
      const text = await file.text();
      const parsed = JSON.parse(text);

      if(!parsed.meta || !parsed.sheets){
        throw new Error("ملف غير صالح");
      }

      modal.classList.add("hidden");
      document.getElementById("overlayStatusText").textContent = "جاري استيراد المشروع...";
      document.getElementById("creatingOverlay").classList.remove("hidden");

      const id = slugify();
      parsed.meta.id = id;
      parsed.meta.updatedAt = new Date().toISOString();

      const newDir = await dataDirHandle.getDirectoryHandle(id, { create: true });
      const newFile = await newDir.getFileHandle("project.json", { create: true });
      const writable = await newFile.createWritable();
      await writable.write(JSON.stringify(parsed));
      await writable.close();

      setTimeout(function(){ openProject(id); }, 500);
    }catch(err){
      msg.textContent = "ملف project.json غير صالح أو تالف";
    }
  });
}

document.addEventListener("DOMContentLoaded", async function(){
  runBackgroundCanvas();
  const sessionOk = await checkSession();
  if(!sessionOk) return;

  const active = await ensureStorageActive();
  if(!active){
    document.getElementById("storageGate").classList.remove("hidden");
    return;
  }

  document.getElementById("app").classList.remove("hidden");
  setupNewProjectModal();
  setupImportModal();
  const projects = await listProjects();
  renderProjects(projects);
});
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DB_KEY = "yapi360-workspace-v4";
const SESSION_KEY = "yapi360-session-v4";
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

const emptyDb = () => ({
  version: 4,
  company: null,
  users: [],
  records: {},
  audit: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

const state = {
  db: loadDb(),
  page: "dashboard",
  user: null,
  editId: null,
  sort: { field: "", direction: 1 }
};

function loadDb() {
  try {
    const saved = JSON.parse(localStorage.getItem(DB_KEY));
    return saved?.version === 4 ? saved : emptyDb();
  } catch {
    return emptyDb();
  }
}

function persist() {
  state.db.updatedAt = new Date().toISOString();
  localStorage.setItem(DB_KEY, JSON.stringify(state.db));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value + (value.length === 10 ? "T00:00:00" : "")).toLocaleDateString("tr-TR");
}

function records(key) {
  return state.db.records[key] || [];
}

function canEdit() {
  return state.user && state.user.role !== "Görüntüleme" && state.user.status === "Aktif";
}

function audit(action, detail = "") {
  state.db.audit.unshift({
    id: uid(),
    at: new Date().toISOString(),
    user: state.user?.name || "Sistem",
    action,
    detail
  });
  state.db.audit = state.db.audit.slice(0, 500);
}

function setAuthMode() {
  const setup = !state.db.company || state.db.users.length === 0;
  $("#setupFields").hidden = !setup;
  $("#companyName").required = setup;
  $("#fullName").required = setup;
  $("#authSubtitle").textContent = setup ? "Firma çalışma alanınızı oluşturun." : state.db.company.name + " çalışma alanına giriş yapın.";
  $("#authSubmit").textContent = setup ? "Çalışma Alanını Oluştur" : "Giriş Yap";
  $("#password").autocomplete = setup ? "new-password" : "current-password";
}

async function handleAuth(event) {
  event.preventDefault();
  $("#authError").textContent = "";
  const email = $("#email").value.trim().toLocaleLowerCase("tr");
  const password = $("#password").value;
  const setup = !state.db.company || state.db.users.length === 0;

  if (setup) {
    const companyName = $("#companyName").value.trim();
    const fullName = $("#fullName").value.trim();
    if (!companyName || !fullName || password.length < 6) {
      $("#authError").textContent = "Firma, yönetici ve en az 6 karakterli şifre zorunludur.";
      return;
    }
    const user = { id: uid(), name: fullName, email, role: "Admin", status: "Aktif", passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
    state.db.company = { id: uid(), name: companyName, email, currency: "TRY" };
    state.db.users = [user];
    state.user = user;
    audit("Çalışma alanı oluşturuldu", companyName);
    persist();
  } else {
    const user = state.db.users.find(item => item.email.toLocaleLowerCase("tr") === email && item.status === "Aktif");
    if (!user || user.passwordHash !== await hashPassword(password)) {
      $("#authError").textContent = "E-posta veya şifre hatalı.";
      return;
    }
    state.user = user;
    audit("Oturum açıldı");
    persist();
  }

  sessionStorage.setItem(SESSION_KEY, state.user.id);
  showApp();
}

function resumeSession() {
  const userId = sessionStorage.getItem(SESSION_KEY);
  const user = state.db.users.find(item => item.id === userId && item.status === "Aktif");
  if (!user) return false;
  state.user = user;
  showApp();
  return true;
}

function showApp() {
  $("#auth").hidden = true;
  $("#app").hidden = false;
  $("#sideCompany").textContent = state.db.company.name;
  $("#userChip").textContent = state.user.name + " · " + state.user.role;
  renderNav();
  navigate(location.hash.slice(1) || "dashboard");
}

function logout() {
  audit("Oturum kapatıldı");
  persist();
  sessionStorage.removeItem(SESSION_KEY);
  location.hash = "";
  location.reload();
}

function renderNav() {
  $("#nav").innerHTML = window.YAPI360_NAV.map(group => `
    <div class="nav-group">
      <span class="nav-label">${group.label}</span>
      ${group.items.map(key => {
        const section = window.YAPI360_SECTIONS[key];
        return `<button class="nav-item" data-page="${key}"><span class="nav-icon">${section.icon}</span><span>${section.title}</span></button>`;
      }).join("")}
    </div>
  `).join("");
}

function navigate(page) {
  if (!window.YAPI360_SECTIONS[page]) page = "dashboard";
  state.page = page;
  state.sort = { field: "", direction: 1 };
  history.replaceState(null, "", "#" + page);
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  const section = window.YAPI360_SECTIONS[page];
  $("#pageTitle").textContent = section.title;
  $("#pageDescription").textContent = section.description;
  closeSidebar();
  renderPage();
}

function renderPage() {
  const section = window.YAPI360_SECTIONS[state.page];
  const special = section.special;
  if (special === "dashboard") $("#content").innerHTML = renderDashboard();
  else if (special === "contactLedger") $("#content").innerHTML = renderContactLedger();
  else if (special === "staffLedger") $("#content").innerHTML = renderStaffLedger();
  else if (special === "costAnalysis") $("#content").innerHTML = renderCostAnalysis();
  else if (special === "settings") $("#content").innerHTML = renderSettings();
  else if (special === "audit") $("#content").innerHTML = renderAudit();
  else if (special === "users") $("#content").innerHTML = renderList(section, state.db.users);
  else $("#content").innerHTML = renderList(section, records(state.page));
  bindPage();
}

function derivedCash() {
  const manual = records("cash").map(item => ({ ...item, source: "Manuel" }));
  const purchases = records("purchases")
    .filter(item => item.paymentStatus === "Ödendi")
    .map(item => ({ id: "purchase-" + item.id, date: item.date, type: "Gider", category: "Satın Alma", description: item.supplier + " · " + item.item, amount: item.amount, source: "Alış", automatic: true }));
  const sales = records("sales")
    .filter(item => number(item.collected) > 0)
    .map(item => ({ id: "sale-" + item.id, date: item.date, type: "Gelir", category: "Tahsilat", description: item.customer + " · " + item.unit, amount: item.collected, source: "Satış", automatic: true }));
  return [...manual, ...purchases, ...sales].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function totals() {
  const cash = derivedCash();
  const income = cash.filter(item => item.type === "Gelir").reduce((sum, item) => sum + number(item.amount), 0);
  const expense = cash.filter(item => item.type === "Gider").reduce((sum, item) => sum + number(item.amount), 0);
  const salesTotal = records("sales").reduce((sum, item) => sum + number(item.total), 0);
  const collected = records("sales").reduce((sum, item) => sum + number(item.collected), 0);
  return { income, expense, balance: income - expense, salesTotal, collected };
}

function renderDashboard() {
  const result = totals();
  const projects = records("projects");
  const activeProjects = projects.filter(item => item.status === "Aktif");
  const avgProgress = activeProjects.length ? Math.round(activeProjects.reduce((sum, item) => sum + number(item.progress), 0) / activeProjects.length) : 0;
  const lowStock = records("inventory").filter(item => item.type === "Malzeme" && number(item.onHand) <= number(item.critical));
  const recent = state.db.audit.slice(0, 5);
  return `
    <div class="grid">
      <article class="stat"><small>KASA BAKİYESİ</small><strong>${money.format(result.balance)}</strong><em>${result.balance >= 0 ? "Pozitif nakit" : "Nakit açığı"}</em></article>
      <article class="stat"><small>TOPLAM SATIŞ</small><strong>${money.format(result.salesTotal)}</strong><em>${money.format(result.collected)} tahsil edildi</em></article>
      <article class="stat"><small>AKTİF PROJE</small><strong>${activeProjects.length}</strong><em>Ortalama %${avgProgress} ilerleme</em></article>
      <article class="stat"><small>KRİTİK STOK</small><strong>${lowStock.length}</strong><em>${lowStock.length ? "Kontrol gerekiyor" : "Stoklar yeterli"}</em></article>
    </div>
    <div class="panels">
      <section class="panel">
        <div class="panel-head"><h3>Proje Durumu</h3><button class="btn ghost small" data-go="projects">Projeleri Aç</button></div>
        ${projects.length ? projects.slice(0, 6).map(item => `<div class="row"><div class="row-main"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.location || "Konum girilmedi")}</small><div class="progress"><span style="width:${Math.min(100, number(item.progress))}%"></span></div></div><span class="badge">% ${number(item.progress)}</span></div>`).join("") : emptyMessage("İlk projenizi ekleyerek yönetim panelini kullanmaya başlayın.")}
      </section>
      <section class="panel">
        <div class="panel-head"><h3>Son İşlemler</h3><button class="btn ghost small" data-go="audit">Tümü</button></div>
        ${recent.length ? recent.map(item => `<div class="row"><div class="row-main"><strong>${escapeHtml(item.action)}</strong><small>${escapeHtml(item.user)} · ${new Date(item.at).toLocaleString("tr-TR")}</small></div></div>`).join("") : emptyMessage("Henüz işlem kaydı yok.")}
      </section>
    </div>
  `;
}

function tableFields(section) {
  return (section.fields || []).filter(field => field.table !== false);
}

function renderList(section, sourceRows) {
  const rows = state.page === "cash" ? derivedCash() : sourceRows;
  const addAllowed = canEdit() && state.page !== "cash" || canEdit();
  return `
    ${state.page === "cash" ? '<div class="callout">Ödenmiş alışlar ve satış tahsilatları kasa hareketlerine otomatik yansır. Manuel hareket de ekleyebilirsiniz.</div>' : ""}
    <div class="toolbar">
      <input class="input search" id="search" placeholder="${section.title} içinde ara…">
      ${addAllowed ? '<button class="btn gold" id="addRecord">+ Yeni Kayıt</button>' : ""}
      <button class="btn ghost" id="exportCsv">CSV Dışa Aktar</button>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr>
      ${tableFields(section).map(field => `<th><button class="sort" data-sort="${field.name}">${field.label} ↕</button></th>`).join("")}
      <th>İşlem</th>
    </tr></thead><tbody id="tableBody"></tbody></table></div>
  `;
}

function renderRows(query = "") {
  const section = window.YAPI360_SECTIONS[state.page];
  const fields = tableFields(section);
  const source = state.page === "users" ? state.db.users : state.page === "cash" ? derivedCash() : records(state.page);
  let rows = source.filter(row => fields.some(field => String(row[field.name] ?? "").toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))));
  if (state.sort.field) rows = [...rows].sort((a, b) => String(a[state.sort.field] ?? "").localeCompare(String(b[state.sort.field] ?? ""), "tr", { numeric: true }) * state.sort.direction);
  $("#tableBody").innerHTML = rows.length ? rows.map(row => `
    <tr>
      ${fields.map(field => `<td>${formatCell(field, row[field.name], row)}</td>`).join("")}
      <td><div class="actions">
        ${canEdit() && !row.automatic ? `<button class="btn ghost small" data-edit="${row.id}">Düzenle</button><button class="btn danger small" data-delete="${row.id}">Sil</button>` : '<span class="badge info">Otomatik</span>'}
      </div></td>
    </tr>
  `).join("") : `<tr><td colspan="${fields.length + 1}">${emptyMessage("Henüz kayıt yok. Yeni kayıt ekleyerek başlayın.")}</td></tr>`;
}

function formatCell(field, value, row) {
  if (field.type === "number") return moneyField(field.name) ? money.format(number(value)) : escapeHtml(value ?? "0");
  if (field.type === "date") return formatDate(value);
  if (["status", "paymentStatus", "type"].includes(field.name)) {
    const style = /Gecikme|Kritik|Arızalı|Karşılıksız|Ödenmedi/.test(value) ? "danger" : /Bekliyor|Kısmi|Bakımda|Portföyde/.test(value) ? "warning" : "";
    return `<span class="badge ${style}">${escapeHtml(value || "—")}</span>`;
  }
  return escapeHtml(value || "—");
}

function moneyField(name) {
  return ["budget", "contractAmount", "paid", "amount", "total", "collected", "openingBalance", "monthlySalary", "advance"].includes(name);
}

function contactSummary() {
  const map = new Map();
  const ensure = name => {
    const key = name || "Tanımsız";
    if (!map.has(key)) map.set(key, { name: key, sales: 0, purchases: 0, collected: 0, opening: 0 });
    return map.get(key);
  };
  records("contacts").forEach(item => ensure(item.name).opening += number(item.openingBalance));
  records("purchases").forEach(item => ensure(item.supplier).purchases += number(item.amount));
  records("sales").forEach(item => { const row = ensure(item.customer); row.sales += number(item.total); row.collected += number(item.collected); });
  return [...map.values()].map(row => ({ ...row, balance: row.opening + row.sales - row.collected - row.purchases }));
}

function renderContactLedger() {
  const rows = contactSummary();
  return reportTable(["Cari", "Satış / Borç", "Tahsilat", "Alış / Alacak", "Net Bakiye"], rows.map(row => [row.name, money.format(row.sales), money.format(row.collected), money.format(row.purchases), money.format(row.balance)]), "Alış ve satış kayıtları cariye göre otomatik birleştirilir.");
}

function renderStaffLedger() {
  const rows = records("staff").map(item => [item.name, item.role, money.format(number(item.monthlySalary)), money.format(number(item.advance)), money.format(number(item.monthlySalary) - number(item.advance))]);
  return reportTable(["Personel", "Görev", "Aylık Ücret", "Avans", "Net Hakediş"], rows, "Personel kartındaki ücret ve avans değerlerinden hesaplanır.");
}

function renderCostAnalysis() {
  const rows = records("projects").map(project => {
    const actual = records("purchases").filter(item => item.project === project.name).reduce((sum, item) => sum + number(item.amount), 0);
    const budget = number(project.budget);
    const ratio = budget ? Math.round(actual / budget * 100) : 0;
    return [project.name, money.format(budget), money.format(actual), money.format(budget - actual), "% " + ratio];
  });
  return reportTable(["Proje", "Bütçe", "Gerçekleşen Alış", "Kalan Bütçe", "Kullanım"], rows, "Alış işlemlerindeki proje alanı ile proje bütçesi karşılaştırılır.");
}

function reportTable(columns, rows, note) {
  return `<div class="callout">${note}</div><div class="table-wrap"><table class="table"><thead><tr>${columns.map(item => `<th>${item}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">${emptyMessage("Sonuç oluşturmak için ilişkili kayıt ekleyin.")}</td></tr>`}</tbody></table></div>`;
}

function renderSettings() {
  const company = state.db.company;
  return `
    <form class="panel" id="settingsForm">
      <h3>Firma Profili</h3>
      <div class="form-grid">
        <div class="field"><label>Firma adı</label><input class="input" name="name" value="${escapeHtml(company.name)}" required></div>
        <div class="field"><label>Bildirim e-postası</label><input class="input" name="email" type="email" value="${escapeHtml(company.email)}" required></div>
        <div class="field"><label>Para birimi</label><select class="select" name="currency"><option value="TRY" ${company.currency === "TRY" ? "selected" : ""}>TRY — Türk Lirası</option><option value="USD" ${company.currency === "USD" ? "selected" : ""}>USD — ABD Doları</option><option value="EUR" ${company.currency === "EUR" ? "selected" : ""}>EUR — Euro</option></select></div>
        <div class="field"><label>Çalışma alanı sürümü</label><input class="input" value="4.0.0" disabled></div>
      </div>
      ${canEdit() ? '<button class="btn" type="submit">Firma Bilgilerini Kaydet</button>' : ""}
    </form>
    <section class="panel" style="margin-top:16px">
      <div class="panel-head"><h3>Veri Yönetimi</h3><span class="badge">Bu cihazda</span></div>
      <div class="toolbar"><button class="btn ghost" id="backupData">JSON Yedeği İndir</button><label class="btn ghost" for="restoreData">Yedekten Geri Yükle</label><input id="restoreData" type="file" accept="application/json" hidden></div>
    </section>
  `;
}

function renderAudit() {
  const rows = state.db.audit;
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Tarih</th><th>Kullanıcı</th><th>İşlem</th><th>Ayrıntı</th></tr></thead><tbody>${rows.length ? rows.map(item => `<tr><td>${new Date(item.at).toLocaleString("tr-TR")}</td><td>${escapeHtml(item.user)}</td><td>${escapeHtml(item.action)}</td><td>${escapeHtml(item.detail || "—")}</td></tr>`).join("") : `<tr><td colspan="4">${emptyMessage("İşlem geçmişi boş.")}</td></tr>`}</tbody></table></div>`;
}

function emptyMessage(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function bindPage() {
  $$("[data-go]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.go)));
  const section = window.YAPI360_SECTIONS[state.page];
  if (!section.fields) {
    if (state.page === "settings") {
      $("#settingsForm")?.addEventListener("submit", saveSettings);
      $("#backupData")?.addEventListener("click", backupData);
      $("#restoreData")?.addEventListener("change", restoreData);
    }
    return;
  }
  renderRows();
  $("#search").addEventListener("input", event => renderRows(event.target.value));
  $("#addRecord")?.addEventListener("click", () => openModal());
  $("#exportCsv").addEventListener("click", exportCsv);
  $$("[data-sort]").forEach(button => button.addEventListener("click", () => {
    const field = button.dataset.sort;
    state.sort.direction = state.sort.field === field ? -state.sort.direction : 1;
    state.sort.field = field;
    renderRows($("#search").value);
  }));
  $("#tableBody").addEventListener("click", event => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    if (edit) openModal(edit.dataset.edit);
    if (remove) deleteRecord(remove.dataset.delete);
  });
}

function fieldInput(field, value = "") {
  if (field.type === "select") return `<select class="select" id="field-${field.name}" name="${field.name}" required>${field.options.map(option => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select>`;
  const min = field.type === "number" ? ' min="0" step="0.01"' : "";
  const required = field.name === "password" && state.editId ? "" : " required";
  return `<input class="input" id="field-${field.name}" name="${field.name}" type="${field.type}" value="${escapeHtml(value)}"${min}${required}>`;
}

function openModal(id = null) {
  const section = window.YAPI360_SECTIONS[state.page];
  const source = state.page === "users" ? state.db.users : records(state.page);
  const row = source.find(item => item.id === id) || {};
  state.editId = id;
  $("#modalTitle").textContent = section.title + (id ? " — Düzenle" : " — Yeni Kayıt");
  $("#recordFields").innerHTML = section.fields.map(field => `<div class="field"><label for="field-${field.name}">${field.label}</label>${fieldInput(field, field.name === "password" ? "" : row[field.name] ?? "")}</div>`).join("");
  $("#recordModal").classList.add("open");
}

async function saveRecord(event) {
  event.preventDefault();
  const section = window.YAPI360_SECTIONS[state.page];
  const data = Object.fromEntries(new FormData(event.target));
  const target = state.page === "users" ? state.db.users : (state.db.records[state.page] ||= []);
  let row = target.find(item => item.id === state.editId);
  const wasEdit = Boolean(row);

  if (state.page === "users") {
    data.email = data.email.toLocaleLowerCase("tr");
    if (target.some(item => item.email === data.email && item.id !== state.editId)) return toast("Bu e-posta zaten kayıtlı.");
    if (data.password) data.passwordHash = await hashPassword(data.password);
    delete data.password;
  }

  if (row) {
    const passwordHash = row.passwordHash;
    Object.assign(row, data, { updatedAt: new Date().toISOString() });
    if (state.page === "users" && !data.passwordHash) row.passwordHash = passwordHash;
    audit("Kayıt güncellendi", section.title + " · " + recordName(row));
  } else {
    row = { id: uid(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    target.push(row);
    audit("Yeni kayıt eklendi", section.title + " · " + recordName(row));
  }
  persist();
  closeModal();
  renderPage();
  toast(wasEdit ? "Kayıt güncellendi." : "Kayıt eklendi.");
}

function recordName(row) {
  return row.name || row.number || row.description || row.customer || row.supplier || row.email || "Kayıt";
}

function deleteRecord(id) {
  if (!confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) return;
  const target = state.page === "users" ? state.db.users : (state.db.records[state.page] ||= []);
  const index = target.findIndex(item => item.id === id);
  if (index < 0) return;
  if (state.page === "users" && target[index].id === state.user.id) return toast("Aktif kullanıcı kendi hesabını silemez.");
  const [removed] = target.splice(index, 1);
  audit("Kayıt silindi", window.YAPI360_SECTIONS[state.page].title + " · " + recordName(removed));
  persist();
  renderPage();
  toast("Kayıt silindi.");
}

function closeModal() {
  $("#recordModal").classList.remove("open");
  $("#recordForm").reset();
  state.editId = null;
}

function saveSettings(event) {
  event.preventDefault();
  Object.assign(state.db.company, Object.fromEntries(new FormData(event.target)));
  audit("Firma ayarları güncellendi", state.db.company.name);
  persist();
  $("#sideCompany").textContent = state.db.company.name;
  toast("Firma bilgileri kaydedildi.");
}

function exportCsv() {
  const section = window.YAPI360_SECTIONS[state.page];
  const fields = tableFields(section);
  const source = state.page === "users" ? state.db.users : state.page === "cash" ? derivedCash() : records(state.page);
  const csv = [fields.map(field => field.label), ...source.map(row => fields.map(field => row[field.name] ?? ""))]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
  downloadFile("yapi360-" + state.page + ".csv", "\ufeff" + csv, "text/csv");
  toast("CSV dosyası hazırlandı.");
}

function backupData() {
  downloadFile("yapi360-yedek-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(state.db, null, 2), "application/json");
  audit("Veri yedeği indirildi");
  persist();
}

async function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const db = JSON.parse(await file.text());
    if (db.version !== 4 || !db.company || !Array.isArray(db.users)) throw new Error("Geçersiz");
    state.db = db;
    audit("Veriler yedekten geri yüklendi");
    persist();
    location.reload();
  } catch {
    toast("Bu dosya geçerli bir Yapı360 v4 yedeği değil.");
  }
}

function downloadFile(name, content, type) {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([content], { type }));
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2400);
}

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sideBackdrop").style.display = "block";
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sideBackdrop").style.display = "";
}

let deferredPrompt;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  $("#installBtn").style.display = "inline-flex";
});

$("#installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("#installBtn").style.display = "none";
});

$("#authForm").addEventListener("submit", handleAuth);
$("#nav").addEventListener("click", event => {
  const item = event.target.closest("[data-page]");
  if (item) navigate(item.dataset.page);
});
$("#logoutBtn").addEventListener("click", logout);
$("#menuToggle").addEventListener("click", openSidebar);
$("#sideClose").addEventListener("click", closeSidebar);
$("#sideBackdrop").addEventListener("click", closeSidebar);
$("#recordForm").addEventListener("submit", saveRecord);
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
$("#recordModal").addEventListener("click", event => { if (event.target.id === "recordModal") closeModal(); });
window.addEventListener("hashchange", () => { if (state.user) navigate(location.hash.slice(1)); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const registration = await navigator.serviceWorker.register("./sw.js?v=4.0.0", { updateViaCache: "none" });
    registration.update();
  });
}

setAuthMode();
resumeSession();

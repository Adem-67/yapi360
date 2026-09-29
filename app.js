const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const DB_KEY = "yapi360-workspace-v4";
const SESSION_KEY = "yapi360-session-v4";
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const CASH_TRANSACTION_TYPES = ["Ödeme", "Tahsilat", "Borç Dekontu", "Alacak Dekontu", "Maaş Ödeme", "Avans Ödeme", "Çek Tahsilat", "Çek Ödeme", "Senet Tahsilat", "Senet Ödeme"];
const CASH_IN = new Set(["Tahsilat"]);
const CASH_OUT = new Set(["Ödeme", "Maaş Ödeme", "Avans Ödeme"]);
const CONTACT_TYPES = new Set(["Ödeme", "Tahsilat", "Borç Dekontu", "Alacak Dekontu", "Çek Tahsilat", "Çek Ödeme", "Senet Tahsilat", "Senet Ödeme"]);
const STAFF_TYPES = new Set(["Maaş Ödeme", "Avans Ödeme"]);
const COLLECTION_INSTRUMENT_TYPES = new Set(["Çek Tahsilat", "Senet Tahsilat"]);
const PAYMENT_INSTRUMENT_TYPES = new Set(["Çek Ödeme", "Senet Ödeme"]);
const UNIQUE_NAME_PAGES = new Set(["contacts", "projects", "sites", "staff", "inventory"]);
const STAFF_DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
const MAX_STAFF_DOCUMENT_BYTES = 1500000;
const MAX_STAFF_DOCUMENT_TOTAL_BYTES = 2500000;
const REFERENCE_FIELDS = {
  contacts: { contracts: ["party"], subcontractors: ["name"], progress: ["subcontractor"], purchases: ["supplier"], sales: ["customer"], checks: ["party"], inventory: ["supplier"], warehouse: ["sourceName", "subcontractor"] },
  projects: { contracts: ["project"], sites: ["project"], subcontractors: ["project"], progress: ["project"], purchases: ["project"], sales: ["project"], warehouse: ["project"], staff_assignments: ["project"], timesheets: ["project"] },
  sites: { assets: ["site"], warehouse: ["site"], staff_assignments: ["site"], timesheets: ["site"] },
  staff: { sites: ["manager"], assets: ["assignedTo"], warehouse: ["dispatchedBy"], staff_assignments: ["staffName"] },
  inventory: { purchases: ["item"], warehouse: ["itemName"] },
  subcontractors: { warehouse: ["subcontractor"] }
};

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
  staffDraft: null,
  sort: { field: "", direction: 1 },
  timesheetPeriod: new Date().toISOString().slice(0, 7),
  timesheetDate: new Date().toISOString().slice(0, 10)
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
  else if (special === "staffAssignmentReport") $("#content").innerHTML = renderStaffAssignmentReport();
  else if (special === "costAnalysis") $("#content").innerHTML = renderCostAnalysis();
  else if (special === "warehouseReport") $("#content").innerHTML = renderWarehouseReport();
  else if (special === "timesheets") $("#content").innerHTML = renderTimesheets();
  else if (special === "settings") $("#content").innerHTML = renderSettings();
  else if (special === "audit") $("#content").innerHTML = renderAudit();
  else if (special === "users") $("#content").innerHTML = renderList(section, state.db.users);
  else $("#content").innerHTML = renderList(section, records(state.page));
  bindPage();
}

function derivedCash() {
  const manual = records("cash").map(item => ({
    ...item,
    transactionType: item.transactionType || (item.type === "Gelir" ? "Tahsilat" : "Ödeme"),
    relatedName: item.relatedName || item.category || "Geçmiş kayıt",
    referenceNo: item.referenceNo || "ESKİ KAYIT",
    direction: item.direction || (item.type === "Gelir" ? "in" : "out"),
    affectsCash: item.affectsCash ?? true,
    source: "İşlem"
  }));
  const purchases = records("purchases")
    .filter(item => item.paymentStatus === "Ödendi" && !records("cash").some(movement => movement.sourceRecordId === item.id))
    .map(item => ({ id: "purchase-" + item.id, date: item.date, transactionType: "Ödeme", relatedName: item.supplier, referenceNo: "ALIŞ", description: item.item, amount: item.amount, direction: "out", affectsCash: true, source: "Alış", automatic: true }));
  const sales = records("sales").map(item => {
    const linked = records("cash").filter(movement => movement.sourceRecordId === item.id && ["Tahsilat", "Çek Tahsilat", "Senet Tahsilat"].includes(movement.transactionType)).reduce((sum, movement) => sum + number(movement.amount), 0);
    return { item, residual: Math.max(0, number(item.collected) - linked) };
  })
    .filter(entry => entry.residual > 0)
    .map(entry => ({ id: "sale-" + entry.item.id, date: entry.item.date, transactionType: "Tahsilat", relatedName: entry.item.customer, referenceNo: "SATIŞ", description: entry.item.unit, amount: entry.residual, direction: "in", affectsCash: true, source: "Satış", automatic: true }));
  return [...manual, ...purchases, ...sales].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function totals() {
  const cash = derivedCash().filter(item => item.affectsCash !== false);
  const income = cash.filter(item => item.direction === "in").reduce((sum, item) => sum + number(item.amount), 0);
  const expense = cash.filter(item => item.direction === "out").reduce((sum, item) => sum + number(item.amount), 0);
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
    ${state.page === "cash" ? '<div class="callout">İşlem tipine göre cari, personel veya çek/senet kaydı seçilir. Dekont ve ciro hareketleri cari sonucu etkiler ancak nakit bakiyesini değiştirmez.</div>' : ""}
    ${state.page === "staff" ? '<div class="callout">Personel kartı iletişim, adres, fotoğraf ve özlük evraklarını tutar. Avans yalnızca Kasa & Finans Hareketleri üzerinden kaydedilir; çalışma yeri Personel Görevlendirme sekmesinden yönetilir.</div>' : ""}
    ${state.page === "warehouse" ? '<div class="callout">Malzeme alışları ana depoya otomatik giriş oluşturur. Yeni sevkiyatlarda önce proje, ardından o projeye bağlı şantiye ve sevk eden personel seçilir.</div>' : ""}
    ${state.page === "warehouse" ? renderWarehouseStockOverview() : ""}
    <div class="toolbar">
      <input class="input search" id="search" placeholder="${section.title} içinde ara…">
      ${addAllowed ? `<button class="btn gold" id="addRecord">${state.page === "warehouse" ? "+ Yeni Sevkiyat" : "+ Yeni Kayıt"}</button>` : ""}
      <button class="btn ghost" id="exportCsv">CSV Dışa Aktar</button>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr>
      ${tableFields(section).map(field => `<th><button class="sort" data-sort="${field.name}">${field.label} ↕</button></th>`).join("")}
      <th>İşlem</th>
    </tr></thead><tbody id="tableBody"></tbody></table></div>
  `;
}

function renderWarehouseStockOverview() {
  const items = records("inventory").filter(item => item.type === "Malzeme");
  if (!items.length) return "";
  return `<div class="warehouse-stock-grid">${items.map(item => {
    const critical = number(item.onHand) <= number(item.critical);
    return `<article class="warehouse-stock ${critical ? "critical" : ""}"><small>ANA DEPO</small><strong>${escapeHtml(item.name)}</strong><span>${number(item.onHand).toLocaleString("tr-TR")} ${escapeHtml(item.unit || "")}</span>${critical ? "<em>Kritik seviye</em>" : ""}</article>`;
  }).join("")}</div>`;
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
        ${canEdit() && !row.automatic ? `${state.page === "cash" ? "" : `<button class="btn ghost small" data-edit="${row.id}">Düzenle</button>`}<button class="btn danger small" data-delete="${row.id}">Sil</button>` : '<span class="badge info">Otomatik</span>'}
      </div></td>
    </tr>
  `).join("") : `<tr><td colspan="${fields.length + 1}">${emptyMessage("Henüz kayıt yok. Yeni kayıt ekleyerek başlayın.")}</td></tr>`;
}

function formatCell(field, value, row) {
  if (field.type === "staffPhoto") {
    return value?.dataUrl && /^data:image\/(jpeg|png|webp);base64,/.test(value.dataUrl)
      ? `<img class="staff-table-photo" src="${value.dataUrl}" alt="${escapeHtml(row.name || "Personel")} fotoğrafı">`
      : '<span class="staff-photo-placeholder small">♟</span>';
  }
  if (field.type === "staffDocuments") {
    const documents = [row.entryDocument, row.exitDocument, ...(Array.isArray(row.documents) ? row.documents : [])].filter(Boolean);
    const complete = row.entryDocument && (row.status !== "Ayrıldı" || row.exitDocument);
    return `<span class="badge ${complete ? "" : "warning"}">${documents.length} evrak${complete ? "" : " · eksik"}</span>`;
  }
  if (field.type === "number") return moneyField(field.name) ? money.format(number(value)) : escapeHtml(value ?? "0");
  if (field.type === "date") return formatDate(value);
  if (["status", "paymentStatus", "type", "transactionType", "movementType"].includes(field.name)) {
    const style = /Gecikme|Kritik|Arızalı|Karşılıksız|Ödenmedi/.test(value) ? "danger" : /Bekliyor|Kısmi|Bakımda|Portföyde/.test(value) ? "warning" : "";
    return `<span class="badge ${style}">${escapeHtml(value || "—")}</span>`;
  }
  return escapeHtml(value || "—");
}

function moneyField(name) {
  return ["budget", "contractAmount", "paid", "amount", "total", "collected", "openingBalance", "monthlySalary"].includes(name);
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
  records("cash").forEach(item => {
    if (!item.contactName) return;
    const row = ensure(item.contactName);
    const amount = number(item.amount);
    if (["Tahsilat", "Çek Tahsilat", "Senet Tahsilat"].includes(item.transactionType) && !item.sourceRecordId) row.collected += amount;
    if (item.transactionType === "Alacak Dekontu") row.collected += amount;
    if (["Ödeme", "Çek Ödeme", "Senet Ödeme"].includes(item.transactionType)) row.purchases -= amount;
    if (item.transactionType === "Borç Dekontu") row.sales += amount;
  });
  return [...map.values()].map(row => ({ ...row, balance: row.opening + row.sales - row.collected - row.purchases }));
}

function renderContactLedger() {
  const rows = contactSummary();
  return reportTable(["Cari", "Satış / Borç", "Tahsilat", "Alış / Alacak", "Net Bakiye"], rows.map(row => [row.name, money.format(row.sales), money.format(row.collected), money.format(row.purchases), money.format(row.balance)]), "Alış ve satış kayıtları cariye göre otomatik birleştirilir.");
}

function renderStaffLedger() {
  const rows = records("staff").map(item => {
    const movements = records("cash").filter(movement => movement.staffId === item.id);
    const salaryPaid = movements.filter(movement => movement.transactionType === "Maaş Ödeme").reduce((sum, movement) => sum + number(movement.amount), 0);
    const advancePaid = movements.filter(movement => movement.transactionType === "Avans Ödeme").reduce((sum, movement) => sum + number(movement.amount), 0);
    return [item.name, item.role, money.format(number(item.monthlySalary)), money.format(salaryPaid), money.format(advancePaid), money.format(number(item.monthlySalary) - salaryPaid - advancePaid)];
  });
  return reportTable(["Personel", "Görev", "Aylık Ücret", "Maaş Ödemesi", "Avans", "Kalan"], rows, "Maaş ve avans tutarları yalnızca Kasa & Finans Hareketleri kayıtlarından hesaplanır.");
}

function renderStaffAssignmentReport() {
  const rows = [...records("staff_assignments")].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
  return reportTable(
    ["Personel", "Proje", "Şantiye", "Görev / Ekip", "Başlangıç", "Bitiş", "Durum"],
    rows.map(item => [item.staffName, item.project, item.site, item.duty, formatDate(item.startDate), formatDate(item.endDate), item.status]),
    "Personel kartı bağımsızdır; proje ve şantiye çalışma geçmişi tarih aralıklı görevlendirme kayıtlarından oluşur."
  );
}

function timesheetPeriodBounds(period) {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { min: period + "-01", max: period + "-" + String(lastDay).padStart(2, "0") };
}

function timesheetOption(value, current, label = value) {
  return `<option value="${value}" ${String(value) === String(current) ? "selected" : ""}>${label}</option>`;
}

function assignmentActiveOnDate(assignment, date) {
  return assignment.startDate <= date && (!assignment.endDate || assignment.endDate >= date);
}

function staffAssignmentsOnDate(staffId, date) {
  return records("staff_assignments").filter(item => item.staffId === staffId && assignmentActiveOnDate(item, date));
}

function timesheetAssignmentOptions(person, date, entry) {
  const assignments = staffAssignmentsOnDate(person.id, date);
  const selected = entry.assignmentId || (assignments.length === 1 ? assignments[0].id : "");
  const legacy = entry.assignmentId && !assignments.some(item => item.id === entry.assignmentId)
    ? `<option value="${entry.assignmentId}" selected>${escapeHtml((entry.project || "Eski proje") + " · " + (entry.site || "Eski şantiye"))}</option>` : "";
  const options = assignments.map(item => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.project + " · " + item.site + (item.duty ? " · " + item.duty : ""))}</option>`).join("");
  return `<option value="" ${selected ? "" : "selected"}>Görevlendirme yok</option>${legacy}${options}`;
}

function renderTimesheets() {
  const period = state.timesheetPeriod;
  const bounds = timesheetPeriodBounds(period);
  if (!state.timesheetDate.startsWith(period)) state.timesheetDate = bounds.min;
  const date = state.timesheetDate;
  const staff = records("staff").filter(item => item.status !== "Ayrıldı");
  const dayEntries = records("timesheets").filter(item => item.date === date);
  const periodEntries = records("timesheets").filter(item => item.period === period || item.date?.startsWith(period));
  const entryByStaff = new Map(dayEntries.map(item => [item.staffId, item]));
  const dailyRows = staff.map(person => {
    const entry = entryByStaff.get(person.id) || {};
    const multiplier = entry.wageMultiplier ?? "0";
    const dailyAmount = number(person.monthlySalary) / 30 * number(multiplier);
    return `<tr data-staff-id="${person.id}">
      <td><strong>${escapeHtml(person.name)}</strong><small class="cell-note">${escapeHtml(person.role || "—")}</small></td>
      <td><select class="select compact assignment-select" data-timesheet-assignment>${timesheetAssignmentOptions(person, date, entry)}</select></td>
      <td><select class="select compact" data-timesheet-status>
        ${timesheetOption("", entry.status || "", "Seçilmedi")}
        ${timesheetOption("Tam Gün", entry.status)}
        ${timesheetOption("Yarım Gün", entry.status)}
        ${timesheetOption("İzinli", entry.status)}
      </select></td>
      <td><select class="select compact" data-timesheet-wage>
        ${timesheetOption("0", multiplier, "0 yevmiye")}
        ${timesheetOption("0.5", multiplier, "0,5 yevmiye")}
        ${timesheetOption("1", multiplier, "1 yevmiye")}
        ${timesheetOption("1.5", multiplier, "1,5 yevmiye")}
        ${timesheetOption("2", multiplier, "2 yevmiye")}
      </select></td>
      <td data-day-amount>${money.format(dailyAmount)}</td>
      <td><input class="input compact" data-timesheet-note value="${escapeHtml(entry.note || "")}" placeholder="Açıklama"></td>
    </tr>`;
  }).join("");

  const summaryRows = records("staff").map(person => {
    const entries = periodEntries.filter(item => item.staffId === person.id);
    if (!entries.length) return "";
    const full = entries.filter(item => item.status === "Tam Gün").length;
    const half = entries.filter(item => item.status === "Yarım Gün").length;
    const leave = entries.filter(item => item.status === "İzinli").length;
    const wages = entries.reduce((sum, item) => sum + number(item.wageMultiplier), 0);
    const amount = number(person.monthlySalary) / 30 * wages;
    const sites = [...new Set(entries.map(item => item.site).filter(Boolean))].join(", ") || "—";
    return `<tr><td>${escapeHtml(person.name)}</td><td>${escapeHtml(sites)}</td><td>${full}</td><td>${half}</td><td>${leave}</td><td>${wages.toLocaleString("tr-TR")}</td><td>${money.format(amount)}</td></tr>`;
  }).filter(Boolean).join("");

  return `
    <div class="callout">Puantajdaki proje ve şantiye seçenekleri, seçilen tarihte geçerli personel görevlendirmelerinden gelir. Çalışılan günlerde görevlendirme seçimi zorunludur; izin kaydı görevlendirmesiz tutulabilir.</div>
    <div class="timesheet-toolbar panel">
      <div class="field"><label for="timesheetPeriod">Dönem</label><input class="input" id="timesheetPeriod" type="month" value="${period}"></div>
      <div class="field"><label for="timesheetDate">Puantaj günü</label><input class="input" id="timesheetDate" type="date" min="${bounds.min}" max="${bounds.max}" value="${date}"></div>
      <div class="timesheet-actions">${canEdit() ? '<button class="btn gold" id="saveTimesheetDay">Günü Kaydet</button>' : ""}<button class="btn ghost" id="exportTimesheet">Dönem CSV</button></div>
    </div>
    <div class="table-wrap"><table class="table timesheet-table"><thead><tr><th>Personel</th><th>Görevlendirme / Şantiye</th><th>Çalışma</th><th>Yevmiye</th><th>Günlük Tutar</th><th>Açıklama</th></tr></thead><tbody id="timesheetRows">
      ${dailyRows || `<tr><td colspan="6">${emptyMessage("Puantaj oluşturmak için önce aktif personel kaydı ekleyin.")}</td></tr>`}
    </tbody></table></div>
    <div class="panel timesheet-summary"><div class="panel-head"><h3>${escapeHtml(period)} Dönem Özeti</h3><span class="badge info">${periodEntries.length} günlük kayıt</span></div>
      <div class="table-wrap embedded"><table class="table"><thead><tr><th>Personel</th><th>Çalışılan Şantiyeler</th><th>Tam Gün</th><th>Yarım Gün</th><th>İzinli</th><th>Yevmiye</th><th>Hesaplanan</th></tr></thead><tbody>${summaryRows || '<tr><td colspan="7" class="empty">Bu dönemde kayıt yok.</td></tr>'}</tbody></table></div>
    </div>`;
}

function bindTimesheetPage() {
  $("#timesheetPeriod")?.addEventListener("change", event => {
    state.timesheetPeriod = event.target.value;
    state.timesheetDate = event.target.value + "-01";
    renderPage();
  });
  $("#timesheetDate")?.addEventListener("change", event => {
    state.timesheetDate = event.target.value;
    state.timesheetPeriod = event.target.value.slice(0, 7);
    renderPage();
  });
  $$("#timesheetRows [data-timesheet-status]").forEach(select => select.addEventListener("change", event => {
    const row = event.target.closest("tr");
    const defaults = { "Tam Gün": "1", "Yarım Gün": "0.5", "İzinli": "0", "": "0" };
    row.querySelector("[data-timesheet-wage]").value = defaults[event.target.value];
    updateTimesheetRowAmount(row);
  }));
  $$("#timesheetRows [data-timesheet-wage]").forEach(select => select.addEventListener("change", event => updateTimesheetRowAmount(event.target.closest("tr"))));
  $("#saveTimesheetDay")?.addEventListener("click", saveTimesheetDay);
  $("#exportTimesheet")?.addEventListener("click", exportTimesheetCsv);
}

function updateTimesheetRowAmount(row) {
  const person = records("staff").find(item => item.id === row.dataset.staffId);
  const multiplier = number(row.querySelector("[data-timesheet-wage]").value);
  row.querySelector("[data-day-amount]").textContent = money.format(number(person?.monthlySalary) / 30 * multiplier);
}

function saveTimesheetDay() {
  const target = state.db.records.timesheets ||= [];
  const rows = $$("#timesheetRows tr[data-staff-id]");
  const invalidRow = rows.find(row => {
    const status = row.querySelector("[data-timesheet-status]").value;
    return ["Tam Gün", "Yarım Gün"].includes(status) && !row.querySelector("[data-timesheet-assignment]").value;
  });
  if (invalidRow) {
    const person = records("staff").find(item => item.id === invalidRow.dataset.staffId);
    return toast(`${person?.name || "Personel"} için bu tarihte geçerli görevlendirme seçmelisiniz.`);
  }

  rows.forEach(row => {
    const staffId = row.dataset.staffId;
    const person = records("staff").find(item => item.id === staffId);
    const status = row.querySelector("[data-timesheet-status]").value;
    const assignmentId = row.querySelector("[data-timesheet-assignment]").value;
    const assignment = records("staff_assignments").find(item => item.id === assignmentId);
    const existingIndex = target.findIndex(item => item.date === state.timesheetDate && item.staffId === staffId);
    if (!status) {
      if (existingIndex >= 0) target.splice(existingIndex, 1);
      return;
    }
    const entry = {
      id: existingIndex >= 0 ? target[existingIndex].id : uid(),
      period: state.timesheetPeriod,
      date: state.timesheetDate,
      staffId,
      staffName: person.name,
      assignmentId: assignment?.id || "",
      projectId: assignment?.projectId || "",
      project: assignment?.project || "",
      siteId: assignment?.siteId || "",
      site: assignment?.site || "",
      status,
      wageMultiplier: row.querySelector("[data-timesheet-wage]").value,
      note: row.querySelector("[data-timesheet-note]").value.trim(),
      createdAt: existingIndex >= 0 ? target[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (existingIndex >= 0) target[existingIndex] = entry;
    else target.push(entry);
  });
  audit("Puantaj günü kaydedildi", state.timesheetDate);
  persist();
  renderPage();
  toast("Puantaj günü kaydedildi.");
}

function exportTimesheetCsv() {
  const rows = records("timesheets").filter(item => item.period === state.timesheetPeriod || item.date?.startsWith(state.timesheetPeriod));
  const csv = [["Dönem", "Tarih", "Personel", "Proje", "Şantiye", "Durum", "Yevmiye", "Açıklama"], ...rows.map(item => [item.period, item.date, item.staffName, item.project || "", item.site || "", item.status, item.wageMultiplier, item.note || ""])]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n");
  downloadFile("yapi360-puantaj-" + state.timesheetPeriod + ".csv", "\ufeff" + csv, "text/csv");
  toast("Puantaj dönem dosyası hazırlandı.");
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

function renderWarehouseReport() {
  const groups = new Map();
  records("warehouse").filter(item => item.movementType === "Sevk").forEach(item => {
    const usageType = item.usageType || "Firma Kullanımı";
    const subcontractor = item.subcontractor || "—";
    const key = [item.project, item.site, usageType, subcontractor, item.itemName, item.unit].join("|");
    if (!groups.has(key)) groups.set(key, { project: item.project, site: item.site, usageType, subcontractor, itemName: item.itemName, unit: item.unit, quantity: 0, dispatches: 0, staff: new Set() });
    const row = groups.get(key);
    row.quantity += number(item.quantity);
    row.dispatches += 1;
    if (item.dispatchedBy) row.staff.add(item.dispatchedBy);
  });
  const rows = [...groups.values()].sort((a, b) => (a.project + a.site + a.itemName).localeCompare(b.project + b.site + b.itemName, "tr"));
  return reportTable(
    ["Proje", "Şantiye", "Kullanım", "Taşeron", "Malzeme", "Toplam Miktar", "Sevk Sayısı", "Sevk Edenler"],
    rows.map(item => [item.project, item.site, item.usageType, item.subcontractor, item.itemName, item.quantity.toLocaleString("tr-TR") + " " + (item.unit || ""), item.dispatches, [...item.staff].join(", ") || "—"]),
    "Ana depo sevkleri firma kullanımı ve taşerona verilen malzeme olarak proje, şantiye ve malzeme bazında birleştirilir."
  );
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
        <div class="field"><label>Çalışma alanı sürümü</label><input class="input" value="4.6.0" disabled></div>
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
    if (state.page === "timesheets") bindTimesheetPage();
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
}

function fieldInput(field, value = "") {
  if (field.type === "select") return `<select class="select" id="field-${field.name}" name="${field.name}" required>${field.options.map(option => `<option ${option === value ? "selected" : ""}>${option}</option>`).join("")}</select>`;
  if (field.type === "relation") {
    const items = records(field.source);
    const values = items.map(item => item.name);
    const legacy = value && !values.includes(value) ? `<option value="${escapeHtml(value)}" selected>${escapeHtml(value)} · eski kayıt</option>` : "";
    const placeholder = field.optional ? '<option value="">Seçim yok</option>' : `<option value="" disabled ${value ? "" : "selected"}>Önce ilgili kaydı tanımlayın</option>`;
    const options = items.map(item => `<option value="${escapeHtml(item.name)}" ${item.name === value ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
    return `<select class="select" id="field-${field.name}" name="${field.name}" ${field.optional ? "" : "required"}>${placeholder}${legacy}${options}</select>`;
  }
  const min = field.type === "number" ? ' min="0" step="0.01"' : "";
  const required = field.name === "password" && state.editId ? "" : " required";
  return `<input class="input" id="field-${field.name}" name="${field.name}" type="${field.type}" value="${escapeHtml(value)}"${min}${required}>`;
}

function optionList(items, selected, label, emptyLabel, optional = false) {
  const first = optional ? '<option value="">Bağlantı yok</option>' : `<option value="" disabled ${selected ? "" : "selected"}>${emptyLabel}</option>`;
  return first + items.map(item => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(label(item))}</option>`).join("");
}

function eligibleInstruments(transactionType) {
  const kind = transactionType.startsWith("Çek") ? "Çek" : "Senet";
  return records("checks").filter(item => item.type.includes(kind) && item.type.startsWith("Alınan") && ["Portföyde", "Tahsil Edildi"].includes(item.status));
}

function sourceRecords(transactionType) {
  if (["Tahsilat", "Çek Tahsilat", "Senet Tahsilat"].includes(transactionType)) {
    return records("sales").filter(item => number(item.total) > number(item.collected));
  }
  if (["Ödeme", "Çek Ödeme", "Senet Ödeme"].includes(transactionType)) {
    return records("purchases").filter(item => item.paymentStatus !== "Ödendi" && number(item.amount) > number(item.paidAmount));
  }
  return [];
}

function cashRelationFields(transactionType, row = {}) {
  const contacts = records("contacts");
  const staff = records("staff");
  const sources = sourceRecords(transactionType);
  let html = "";

  if (CONTACT_TYPES.has(transactionType)) {
    html += `<div class="field"><label for="field-contactId">Cari kayıt</label><select class="select" id="field-contactId" name="contactId" required>${optionList(contacts, row.contactId, item => item.name + " · " + item.type, "Önce cari tanımlayın")}</select></div>`;
  }
  if (STAFF_TYPES.has(transactionType)) {
    html += `<div class="field"><label for="field-staffId">Personel kayıt</label><select class="select" id="field-staffId" name="staffId" required>${optionList(staff, row.staffId, item => item.name + " · " + item.role, "Önce personel tanımlayın")}</select></div>`;
  }
  if (["Ödeme", "Tahsilat", "Çek Tahsilat", "Çek Ödeme", "Senet Tahsilat", "Senet Ödeme"].includes(transactionType)) {
    const payment = ["Ödeme", "Çek Ödeme", "Senet Ödeme"].includes(transactionType);
    html += `<div class="field"><label for="field-sourceRecordId">Bağlı ${payment ? "alış" : "satış"} kaydı</label><select class="select" id="field-sourceRecordId" name="sourceRecordId">${optionList(sources, row.sourceRecordId, item => payment ? item.supplier + " · " + item.item + " · Kalan " + money.format(number(item.amount) - number(item.paidAmount)) : item.customer + " · " + item.unit + " · Kalan " + money.format(number(item.total) - number(item.collected)), "Bağlamadan kaydet", true)}</select></div>`;
  }
  if (COLLECTION_INSTRUMENT_TYPES.has(transactionType)) {
    html += `
      <div class="field"><label for="field-instrumentNumber">Belge no</label><input class="input" id="field-instrumentNumber" name="instrumentNumber" value="${escapeHtml(row.instrumentNumber || "")}" required></div>
      <div class="field"><label for="field-instrumentBank">Banka / düzenleyen</label><input class="input" id="field-instrumentBank" name="instrumentBank" value="${escapeHtml(row.instrumentBank || "")}" required></div>
      <div class="field"><label for="field-dueDate">Vade tarihi</label><input class="input" id="field-dueDate" name="dueDate" type="date" value="${escapeHtml(row.dueDate || "")}" required></div>`;
  }
  if (PAYMENT_INSTRUMENT_TYPES.has(transactionType)) {
    const instruments = eligibleInstruments(transactionType);
    html += `<div class="field"><label for="field-instrumentId">Portföy kaydı</label><select class="select" id="field-instrumentId" name="instrumentId" required>${optionList(instruments, row.instrumentId, item => item.number + " · " + item.party + " · " + money.format(number(item.amount)) + " · " + item.status, "Uygun çek/senet kaydı yok")}</select></div>`;
  }
  return html;
}

function bindCashRelations(transactionType) {
  $("#field-sourceRecordId")?.addEventListener("change", event => {
    const source = sourceRecords(transactionType).find(item => item.id === event.target.value);
    if (!source) return;
    const payment = ["Ödeme", "Çek Ödeme", "Senet Ödeme"].includes(transactionType);
    const relatedName = payment ? source.supplier : source.customer;
    const contact = records("contacts").find(item => item.name === relatedName);
    if (contact && $("#field-contactId")) $("#field-contactId").value = contact.id;
    if (!PAYMENT_INSTRUMENT_TYPES.has(transactionType)) {
      $("#field-amount").value = payment ? Math.max(0, number(source.amount) - number(source.paidAmount)) : Math.max(0, number(source.total) - number(source.collected));
    }
  });
  $("#field-instrumentId")?.addEventListener("change", event => {
    const instrument = records("checks").find(item => item.id === event.target.value);
    if (instrument) $("#field-amount").value = number(instrument.amount);
  });
}

function openCashModal(id = null) {
  const row = records("cash").find(item => item.id === id) || {};
  const transactionType = row.transactionType || CASH_TRANSACTION_TYPES[0];
  state.editId = id;
  $("#modalTitle").textContent = "Kasa & Finans Hareketleri — Yeni İşlem";
  $("#recordFields").innerHTML = `
    <div class="field"><label for="field-transactionType">İşlem tipi</label><select class="select" id="field-transactionType" name="transactionType" required>${CASH_TRANSACTION_TYPES.map(type => `<option ${type === transactionType ? "selected" : ""}>${type}</option>`).join("")}</select></div>
    <div class="field"><label for="field-date">İşlem tarihi</label><input class="input" id="field-date" name="date" type="date" value="${escapeHtml(row.date || new Date().toISOString().slice(0, 10))}" required></div>
    <div id="cashRelationFields" class="form-grid relation-grid">${cashRelationFields(transactionType, row)}</div>
    <div class="field"><label for="field-amount">Tutar</label><input class="input" id="field-amount" name="amount" type="number" min="0.01" step="0.01" value="${escapeHtml(row.amount || "")}" required></div>
    <div class="field"><label for="field-description">Açıklama</label><input class="input" id="field-description" name="description" value="${escapeHtml(row.description || "")}" required></div>`;
  $("#field-transactionType").addEventListener("change", event => {
    $("#cashRelationFields").innerHTML = cashRelationFields(event.target.value);
    bindCashRelations(event.target.value);
  });
  bindCashRelations(transactionType);
  $("#recordModal").classList.add("open");
}

function warehouseSites(projectId) {
  const project = records("projects").find(item => item.id === projectId);
  return project ? records("sites").filter(item => item.project === project.name) : [];
}

function warehouseSiteOptions(projectId, selected = "") {
  return optionList(warehouseSites(projectId), selected, item => item.name, "Önce projeye bağlı şantiye tanımlayın");
}

function warehouseSubcontractors(projectId) {
  const project = records("projects").find(item => item.id === projectId);
  return project ? records("subcontractors").filter(item => item.project === project.name && item.materialProvision === "Firma Sağlar") : [];
}

function warehouseSubcontractorOptions(projectId) {
  return optionList(warehouseSubcontractors(projectId), "", item => item.name + " · " + item.specialty, "Bu projede firma malzemeli taşeron anlaşması yok");
}

function updateWarehouseStockHint() {
  const item = records("inventory").find(entry => entry.id === $("#field-itemId")?.value);
  const quantity = $("#field-quantity");
  if (quantity) quantity.max = item ? number(item.onHand) : "";
  if ($("#warehouseStockHint")) $("#warehouseStockHint").textContent = item ? `Ana depo kullanılabilir: ${number(item.onHand).toLocaleString("tr-TR")} ${item.unit || ""}` : "Önce malzeme seçin.";
}

function bindWarehouseRelations() {
  $("#field-projectId")?.addEventListener("change", event => {
    $("#field-siteId").innerHTML = warehouseSiteOptions(event.target.value);
    if ($("#field-subcontractorId")) $("#field-subcontractorId").innerHTML = warehouseSubcontractorOptions(event.target.value);
  });
  $("#field-usageType")?.addEventListener("change", refreshWarehouseDestinationOptions);
  $("#field-itemId")?.addEventListener("change", updateWarehouseStockHint);
  refreshWarehouseDestinationOptions();
  updateWarehouseStockHint();
}

function refreshWarehouseDestinationOptions() {
  const contractor = $("#field-usageType")?.value === "Taşerona Malzeme";
  const field = $("#warehouseSubcontractorField");
  const select = $("#field-subcontractorId");
  if (!field || !select) return;
  field.hidden = !contractor;
  select.required = contractor;
  if (contractor) select.innerHTML = warehouseSubcontractorOptions($("#field-projectId")?.value || "");
  else select.value = "";
}

function openWarehouseModal() {
  const availableItems = records("inventory").filter(item => item.type === "Malzeme" && number(item.onHand) > 0);
  const projects = records("projects");
  const staff = records("staff").filter(item => item.status !== "Ayrıldı");
  state.editId = null;
  $("#modalTitle").textContent = "Ana Depo — Yeni Sevkiyat";
  $("#recordFields").innerHTML = `
    <div class="field"><label for="field-date">Sevk tarihi</label><input class="input" id="field-date" name="date" type="date" value="${new Date().toISOString().slice(0, 10)}" required></div>
    <div class="field"><label for="field-itemId">Ana depo malzemesi</label><select class="select" id="field-itemId" name="itemId" required>${optionList(availableItems, "", item => item.name + " · " + number(item.onHand).toLocaleString("tr-TR") + " " + (item.unit || ""), "Sevk edilebilir malzeme yok")}</select><small class="field-note" id="warehouseStockHint">Önce malzeme seçin.</small></div>
    <div class="field"><label for="field-usageType">Kullanım türü</label><select class="select" id="field-usageType" name="usageType" required><option>Firma Kullanımı</option><option>Taşerona Malzeme</option></select></div>
    <div class="field"><label for="field-projectId">Proje</label><select class="select" id="field-projectId" name="projectId" required>${optionList(projects, "", item => item.name, "Önce proje tanımlayın")}</select></div>
    <div class="field"><label for="field-siteId">Şantiye</label><select class="select" id="field-siteId" name="siteId" required>${warehouseSiteOptions("")}</select></div>
    <div class="field" id="warehouseSubcontractorField" hidden><label for="field-subcontractorId">Taşeron anlaşması</label><select class="select" id="field-subcontractorId" name="subcontractorId">${warehouseSubcontractorOptions("")}</select></div>
    <div class="field"><label for="field-staffId">Sevk eden personel</label><select class="select" id="field-staffId" name="staffId" required>${optionList(staff, "", item => item.name + " · " + item.role, "Önce aktif personel tanımlayın")}</select></div>
    <div class="field"><label for="field-quantity">Sevk miktarı</label><input class="input" id="field-quantity" name="quantity" type="number" min="0.01" step="0.01" required></div>
    <div class="field"><label for="field-note">Açıklama</label><input class="input" id="field-note" name="note" placeholder="İrsaliye, araç veya teslim notu"></div>`;
  bindWarehouseRelations();
  $("#recordModal").classList.add("open");
}

function staffFileSize(size = 0) {
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 0 }) + " KB";
  return (size / 1024 / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " MB";
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Fotoğraf açılamadı.")); };
    image.src = url;
  });
}

async function createStaffPhoto(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Fotoğraf JPG, PNG veya WebP biçiminde olmalıdır.");
  const image = await loadImageFile(file);
  const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  const size = Math.ceil((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
  return { id: uid(), name: file.name.replace(/\.[^.]+$/, "") + ".jpg", type: "image/jpeg", size, dataUrl, addedAt: new Date().toISOString() };
}

async function createStaffDocument(file) {
  const extensionAllowed = /\.(pdf|jpe?g|png|webp|docx?)$/i.test(file.name);
  if (!STAFF_DOCUMENT_TYPES.has(file.type) && !extensionAllowed) throw new Error("Evrak PDF, JPG, PNG, WebP, DOC veya DOCX biçiminde olmalıdır.");
  if (file.size > MAX_STAFF_DOCUMENT_BYTES) throw new Error(`${file.name} en fazla ${staffFileSize(MAX_STAFF_DOCUMENT_BYTES)} olabilir.`);
  return { id: uid(), name: file.name, type: file.type || "application/octet-stream", size: file.size, dataUrl: await readFileDataUrl(file), addedAt: new Date().toISOString() };
}

function staffDocumentBytes(draft = state.staffDraft) {
  if (!draft) return 0;
  return [draft.entryDocument, draft.exitDocument, ...(draft.documents || [])].filter(Boolean).reduce((sum, file) => sum + number(file.size), 0);
}

function staffDraftAttachment(slot, index) {
  if (!state.staffDraft) return null;
  return slot === "documents" ? state.staffDraft.documents[index] : state.staffDraft[slot];
}

function staffAttachmentCard(file, slot, index = 0) {
  if (!file) return '<span class="staff-file-empty">Henüz dosya eklenmedi.</span>';
  return `<article class="staff-file-card"><span class="staff-file-icon">▤</span><div><strong>${escapeHtml(file.name)}</strong><small>${staffFileSize(file.size)}</small></div><button class="btn ghost small" type="button" data-staff-file-download="${slot}" data-file-index="${index}">İndir</button><button class="btn danger small" type="button" data-staff-file-remove="${slot}" data-file-index="${index}">Kaldır</button></article>`;
}

function renderStaffDraftFiles() {
  const draft = state.staffDraft;
  if (!draft) return;
  const photoPreview = $("#staffPhotoPreview");
  if (photoPreview) {
    if (draft.photo?.dataUrl && /^data:image\/(jpeg|png|webp);base64,/.test(draft.photo.dataUrl)) {
      photoPreview.innerHTML = '<img alt="Personel fotoğrafı">';
      photoPreview.querySelector("img").src = draft.photo.dataUrl;
    } else photoPreview.innerHTML = '<span>♟</span><small>Fotoğraf yok</small>';
  }
  if ($("#staffPhotoRemove")) $("#staffPhotoRemove").hidden = !draft.photo;
  if ($("#staffEntryDocument")) $("#staffEntryDocument").innerHTML = staffAttachmentCard(draft.entryDocument, "entryDocument");
  if ($("#staffExitDocument")) $("#staffExitDocument").innerHTML = staffAttachmentCard(draft.exitDocument, "exitDocument");
  if ($("#staffExtraDocuments")) $("#staffExtraDocuments").innerHTML = draft.documents.length
    ? draft.documents.map((file, index) => staffAttachmentCard(file, "documents", index)).join("")
    : '<span class="staff-file-empty">Ek personel evrakı bulunmuyor.</span>';
  if ($("#staffDocumentUsage")) $("#staffDocumentUsage").textContent = `${staffFileSize(staffDocumentBytes(draft))} / ${staffFileSize(MAX_STAFF_DOCUMENT_TOTAL_BYTES)}`;
}

function updateStaffExitFields() {
  const separated = $("#field-status")?.value === "Ayrıldı";
  if ($("#staffExitSection")) $("#staffExitSection").hidden = !separated;
  if ($("#field-exitDate")) $("#field-exitDate").required = separated;
}

async function setStaffDocument(slot, file) {
  const document = await createStaffDocument(file);
  const previous = state.staffDraft[slot];
  state.staffDraft[slot] = document;
  if (staffDocumentBytes() > MAX_STAFF_DOCUMENT_TOTAL_BYTES) {
    state.staffDraft[slot] = previous;
    throw new Error(`Personel evraklarının toplamı ${staffFileSize(MAX_STAFF_DOCUMENT_TOTAL_BYTES)} sınırını aşamaz.`);
  }
  renderStaffDraftFiles();
}

function bindStaffFileInput(selector, handler) {
  $(selector)?.addEventListener("change", async event => {
    const files = [...event.target.files];
    event.target.value = "";
    if (!files.length) return;
    try { await handler(files); } catch (error) { toast(error.message); }
  });
}

function bindStaffForm() {
  bindStaffFileInput("#staffPhotoCamera", async ([file]) => { state.staffDraft.photo = await createStaffPhoto(file); renderStaffDraftFiles(); });
  bindStaffFileInput("#staffPhotoFile", async ([file]) => { state.staffDraft.photo = await createStaffPhoto(file); renderStaffDraftFiles(); });
  bindStaffFileInput("#staffEntryFile", async ([file]) => setStaffDocument("entryDocument", file));
  bindStaffFileInput("#staffExitFile", async ([file]) => setStaffDocument("exitDocument", file));
  bindStaffFileInput("#staffExtraFiles", async files => {
    const additions = await Promise.all(files.map(createStaffDocument));
    if (staffDocumentBytes() + additions.reduce((sum, file) => sum + file.size, 0) > MAX_STAFF_DOCUMENT_TOTAL_BYTES) throw new Error(`Personel evraklarının toplamı ${staffFileSize(MAX_STAFF_DOCUMENT_TOTAL_BYTES)} sınırını aşamaz.`);
    state.staffDraft.documents.push(...additions);
    renderStaffDraftFiles();
  });
  $("#staffPhotoRemove")?.addEventListener("click", () => { state.staffDraft.photo = null; renderStaffDraftFiles(); });
  $("#field-status")?.addEventListener("change", updateStaffExitFields);
  $("#recordFields").onclick = event => {
    const download = event.target.closest("[data-staff-file-download]");
    const remove = event.target.closest("[data-staff-file-remove]");
    if (download) {
      const file = staffDraftAttachment(download.dataset.staffFileDownload, number(download.dataset.fileIndex));
      if (file?.dataUrl) {
        const anchor = document.createElement("a");
        anchor.href = file.dataUrl;
        anchor.download = file.name;
        anchor.click();
      }
    }
    if (remove) {
      const slot = remove.dataset.staffFileRemove;
      const index = number(remove.dataset.fileIndex);
      if (slot === "documents") state.staffDraft.documents.splice(index, 1);
      else state.staffDraft[slot] = null;
      renderStaffDraftFiles();
    }
  };
  updateStaffExitFields();
  renderStaffDraftFiles();
}

function openStaffModal(id = null) {
  const row = records("staff").find(item => item.id === id) || {};
  state.editId = id;
  state.staffDraft = {
    photo: row.photo || null,
    entryDocument: row.entryDocument || null,
    exitDocument: row.exitDocument || null,
    documents: Array.isArray(row.documents) ? [...row.documents] : []
  };
  $("#recordModal").classList.add("staff-modal");
  $("#modalTitle").textContent = "Personel Kartı" + (id ? " — Düzenle" : " — Yeni Kayıt");
  $("#recordFields").innerHTML = `
    <section class="staff-profile-editor full-field">
      <div class="staff-photo-frame" id="staffPhotoPreview"></div>
      <div class="staff-photo-actions"><strong>Personel fotoğrafı</strong><small>Mobil cihazda kamerayı kullanabilir veya mevcut bir fotoğraf seçebilirsiniz.</small><div class="actions"><label class="btn ghost small" for="staffPhotoCamera">Kameradan Çek</label><input id="staffPhotoCamera" type="file" accept="image/jpeg,image/png,image/webp" capture="user" hidden><label class="btn ghost small" for="staffPhotoFile">Dosyadan Seç</label><input id="staffPhotoFile" type="file" accept="image/jpeg,image/png,image/webp" hidden><button class="btn danger small" id="staffPhotoRemove" type="button">Kaldır</button></div></div>
    </section>
    <div class="field"><label for="field-name">Ad soyad</label><input class="input" id="field-name" name="name" value="${escapeHtml(row.name || "")}" required></div>
    <div class="field"><label for="field-role">Görev</label><input class="input" id="field-role" name="role" value="${escapeHtml(row.role || "")}" required></div>
    <div class="field"><label for="field-phone">Telefon</label><input class="input" id="field-phone" name="phone" type="tel" value="${escapeHtml(row.phone || "")}" required></div>
    <div class="field"><label for="field-email">E-posta</label><input class="input" id="field-email" name="email" type="email" value="${escapeHtml(row.email || "")}"></div>
    <div class="field full-field"><label for="field-address">Adres</label><textarea class="input staff-address" id="field-address" name="address" rows="3" required>${escapeHtml(row.address || "")}</textarea></div>
    <div class="field"><label for="field-hireDate">İşe giriş tarihi</label><input class="input" id="field-hireDate" name="hireDate" type="date" value="${escapeHtml(row.hireDate || "")}" required></div>
    <div class="field"><label for="field-monthlySalary">Aylık ücret</label><input class="input" id="field-monthlySalary" name="monthlySalary" type="number" min="0" step="0.01" value="${escapeHtml(row.monthlySalary || "")}" required></div>
    <div class="field"><label for="field-status">Durum</label><select class="select" id="field-status" name="status" required><option ${row.status === "Aktif" || !row.status ? "selected" : ""}>Aktif</option><option ${row.status === "İzinli" ? "selected" : ""}>İzinli</option><option ${row.status === "Ayrıldı" ? "selected" : ""}>Ayrıldı</option></select></div>
    <section class="staff-document-section full-field"><div class="staff-section-head"><div><strong>İşe giriş evrakı</strong><small>Personel kaydı için zorunludur.</small></div><label class="btn ghost small" for="staffEntryFile">Dosya Seç</label><input id="staffEntryFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden></div><div id="staffEntryDocument"></div></section>
    <section class="staff-document-section full-field" id="staffExitSection" hidden><div class="staff-section-head"><div><strong>İşten çıkış evrakı</strong><small>Personel “Ayrıldı” durumuna geçtiğinde tarih ve evrak zorunludur.</small></div><label class="btn ghost small" for="staffExitFile">Dosya Seç</label><input id="staffExitFile" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden></div><div class="field"><label for="field-exitDate">İşten çıkış tarihi</label><input class="input" id="field-exitDate" name="exitDate" type="date" value="${escapeHtml(row.exitDate || "")}"></div><div id="staffExitDocument"></div></section>
    <section class="staff-document-section full-field"><div class="staff-section-head"><div><strong>Diğer personel dosyaları</strong><small>Kimlik, sözleşme, sertifika ve benzeri evraklar. Dosya başına en fazla ${staffFileSize(MAX_STAFF_DOCUMENT_BYTES)}.</small></div><label class="btn ghost small" for="staffExtraFiles">Dosya Ekle</label><input id="staffExtraFiles" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" multiple hidden></div><div id="staffExtraDocuments" class="staff-file-list"></div><small class="staff-storage-note">Evrak kullanımı: <strong id="staffDocumentUsage"></strong></small></section>`;
  bindStaffForm();
  $("#recordModal").classList.add("open");
}

function openStaffAssignmentModal(id = null) {
  const row = records("staff_assignments").find(item => item.id === id) || {};
  const staff = records("staff");
  const projects = records("projects");
  const selectedProjectId = row.projectId || projects.find(item => item.name === row.project)?.id || "";
  state.editId = id;
  $("#modalTitle").textContent = "Personel Görevlendirme" + (id ? " — Düzenle" : " — Yeni Kayıt");
  $("#recordFields").innerHTML = `
    <div class="field"><label for="field-staffId">Personel</label><select class="select" id="field-staffId" name="staffId" required>${optionList(staff, row.staffId, item => item.name + " · " + item.role, "Önce personel tanımlayın")}</select></div>
    <div class="field"><label for="field-projectId">Proje</label><select class="select" id="field-projectId" name="projectId" required>${optionList(projects, selectedProjectId, item => item.name, "Önce proje tanımlayın")}</select></div>
    <div class="field"><label for="field-siteId">Şantiye</label><select class="select" id="field-siteId" name="siteId" required>${warehouseSiteOptions(selectedProjectId, row.siteId)}</select></div>
    <div class="field"><label for="field-duty">Görev / ekip</label><input class="input" id="field-duty" name="duty" value="${escapeHtml(row.duty || "")}" required></div>
    <div class="field"><label for="field-startDate">Başlangıç tarihi</label><input class="input" id="field-startDate" name="startDate" type="date" value="${escapeHtml(row.startDate || new Date().toISOString().slice(0, 10))}" required></div>
    <div class="field"><label for="field-endDate">Bitiş tarihi</label><input class="input" id="field-endDate" name="endDate" type="date" value="${escapeHtml(row.endDate || "")}"></div>
    <div class="field"><label for="field-status">Durum</label><select class="select" id="field-status" name="status" required><option ${row.status !== "Tamamlandı" ? "selected" : ""}>Aktif</option><option ${row.status === "Tamamlandı" ? "selected" : ""}>Tamamlandı</option></select></div>`;
  $("#field-projectId").addEventListener("change", event => { $("#field-siteId").innerHTML = warehouseSiteOptions(event.target.value); });
  $("#recordModal").classList.add("open");
}

function openModal(id = null) {
  const section = window.YAPI360_SECTIONS[state.page];
  if (section.specialForm === "cash") return openCashModal(id);
  if (section.specialForm === "warehouse") return openWarehouseModal();
  if (section.specialForm === "staff") return openStaffModal(id);
  if (section.specialForm === "staffAssignment") return openStaffAssignmentModal(id);
  const source = state.page === "users" ? state.db.users : records(state.page);
  const row = source.find(item => item.id === id) || {};
  state.editId = id;
  $("#modalTitle").textContent = section.title + (id ? " — Düzenle" : " — Yeni Kayıt");
  $("#recordFields").innerHTML = section.fields.map(field => `<div class="field"><label for="field-${field.name}">${field.label}</label>${fieldInput(field, field.name === "password" ? "" : row[field.name] ?? "")}</div>`).join("");
  $("#recordModal").classList.add("open");
}

function updateNamedReferences(page, id, oldName, newName) {
  const mapping = REFERENCE_FIELDS[page] || {};
  Object.entries(mapping).forEach(([targetPage, fields]) => {
    records(targetPage).forEach(item => {
      let changed = false;
      fields.forEach(field => {
        if (item[field] === oldName) {
          item[field] = newName;
          changed = true;
        }
      });
      if (changed) item.updatedAt = new Date().toISOString();
    });
  });
  if (page === "contacts") {
    records("cash").forEach(item => {
      if (item.contactId === id || item.contactName === oldName) {
        item.contactName = newName;
        if (item.relatedName === oldName) item.relatedName = newName;
        item.updatedAt = new Date().toISOString();
      }
    });
  }
  if (page === "staff") {
    records("timesheets").forEach(item => {
      if (item.staffId === id) {
        item.staffName = newName;
        item.updatedAt = new Date().toISOString();
      }
    });
    records("cash").forEach(item => {
      if (item.staffId === id) {
        item.staffName = newName;
        if (item.relatedName === oldName) item.relatedName = newName;
        item.updatedAt = new Date().toISOString();
      }
    });
  }
}

function referenceCount(page, row) {
  const mapping = REFERENCE_FIELDS[page] || {};
  let count = Object.entries(mapping).reduce((total, [targetPage, fields]) => total + records(targetPage).filter(item => fields.some(field => item[field] === row.name)).length, 0);
  if (page === "contacts") count += records("cash").filter(item => item.contactId === row.id || item.contactName === row.name).length;
  if (page === "staff") {
    count += records("timesheets").filter(item => item.staffId === row.id).length;
    count += records("cash").filter(item => item.staffId === row.id).length;
  }
  if (["purchases", "sales"].includes(page)) count += records("cash").filter(item => item.sourceRecordId === row.id).length;
  if (page === "checks") count += records("cash").filter(item => item.instrumentId === row.id || item.createdInstrumentId === row.id).length;
  if (page === "staff_assignments") count += records("timesheets").filter(item => item.assignmentId === row.id).length;
  return count;
}

function purchaseWarehouseMovement(purchase) {
  if (!purchase) return undefined;
  return records("warehouse").find(item => item.purchaseId === purchase.id || (purchase.warehouseMovementId && item.id === purchase.warehouseMovementId));
}

function purchaseInventoryError(previous, data) {
  const nextItem = records("inventory").find(item => item.name === data.item);
  if (!nextItem) return "Alış için tanımlı bir stok veya hizmet seçmelisiniz.";
  const movement = purchaseWarehouseMovement(previous);
  if (!movement) return "";
  const oldItem = records("inventory").find(item => item.id === movement.itemId) || records("inventory").find(item => item.name === movement.itemName);
  if (!oldItem) return "Alışa bağlı ana depo malzeme kartı bulunamadı.";
  const oldQuantity = number(movement.quantity);
  const nextQuantity = nextItem.type === "Malzeme" ? number(data.quantity) : 0;
  if (oldItem.id === nextItem.id) {
    const reduction = oldQuantity - nextQuantity;
    if (reduction > number(oldItem.onHand)) return "Bu alış miktarı azaltılamaz; malzemenin bir bölümü ana depodan sevk edilmiş.";
  } else if (oldQuantity > number(oldItem.onHand)) {
    return "Alış malzemesi değiştirilemez; mevcut girişin bir bölümü ana depodan sevk edilmiş.";
  }
  return "";
}

function syncPurchaseInventory(purchase, previous = null) {
  const warehouse = state.db.records.warehouse ||= [];
  let movement = purchaseWarehouseMovement(previous || purchase);
  const item = records("inventory").find(entry => entry.name === purchase.item);
  const isMaterial = item?.type === "Malzeme";
  const quantity = isMaterial ? number(purchase.quantity) : 0;

  if (!movement && !isMaterial) return;
  if (!movement && isMaterial) {
    item.onHand = number(item.onHand) + quantity;
    item.updatedAt = new Date().toISOString();
    movement = {
      id: uid(), purchaseId: purchase.id, date: purchase.date, movementType: "Giriş", itemId: item.id, itemName: item.name,
      quantity: purchase.quantity, unit: item.unit || "", sourceName: purchase.supplier, usageType: "Ana Depo Girişi", project: "", site: "", subcontractor: "", dispatchedBy: "Satın alma",
      note: "Alış kaydı ile ana depo girişi", automatic: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    warehouse.push(movement);
    purchase.warehouseMovementId = movement.id;
    audit("Ana depo girişi oluştu", item.name + " · " + quantity.toLocaleString("tr-TR") + " " + (item.unit || ""));
    return;
  }

  const oldItem = records("inventory").find(entry => entry.id === movement.itemId) || records("inventory").find(entry => entry.name === movement.itemName);
  const oldQuantity = number(movement.quantity);
  if (!isMaterial) {
    if (oldItem) {
      oldItem.onHand = Math.max(0, number(oldItem.onHand) - oldQuantity);
      oldItem.updatedAt = new Date().toISOString();
    }
    warehouse.splice(warehouse.indexOf(movement), 1);
    delete purchase.warehouseMovementId;
    return;
  }

  if (oldItem?.id === item.id) {
    item.onHand = number(item.onHand) + quantity - oldQuantity;
  } else {
    if (oldItem) {
      oldItem.onHand = Math.max(0, number(oldItem.onHand) - oldQuantity);
      oldItem.updatedAt = new Date().toISOString();
    }
    item.onHand = number(item.onHand) + quantity;
  }
  item.updatedAt = new Date().toISOString();
  Object.assign(movement, {
    purchaseId: purchase.id, date: purchase.date, itemId: item.id, itemName: item.name, quantity: purchase.quantity,
    unit: item.unit || "", sourceName: purchase.supplier, note: "Alış kaydı ile ana depo girişi", automatic: true,
    updatedAt: new Date().toISOString()
  });
  purchase.warehouseMovementId = movement.id;
}

function canReversePurchaseInventory(purchase) {
  const movement = purchaseWarehouseMovement(purchase);
  if (!movement) return true;
  const item = records("inventory").find(entry => entry.id === movement.itemId) || records("inventory").find(entry => entry.name === movement.itemName);
  return item && number(item.onHand) >= number(movement.quantity);
}

function reversePurchaseInventory(purchase) {
  const warehouse = state.db.records.warehouse ||= [];
  const movement = purchaseWarehouseMovement(purchase);
  if (!movement) return;
  const item = records("inventory").find(entry => entry.id === movement.itemId) || records("inventory").find(entry => entry.name === movement.itemName);
  if (item) {
    item.onHand = Math.max(0, number(item.onHand) - number(movement.quantity));
    item.updatedAt = new Date().toISOString();
  }
  warehouse.splice(warehouse.indexOf(movement), 1);
}

function saveStaffRecord(data) {
  const target = state.db.records.staff ||= [];
  let row = target.find(item => item.id === state.editId);
  const wasEdit = Boolean(row);
  const previousRow = row ? { ...row, documents: [...(row.documents || [])] } : null;
  const previousName = row?.name;
  const previousStatus = row?.status;
  const name = data.name.trim();
  if (target.some(item => item.id !== state.editId && item.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"))) return toast("Bu adla daha önce bir personel kaydı oluşturulmuş.");
  if (!state.staffDraft?.entryDocument) return toast("Personel kaydı için işe giriş evrakı eklemelisiniz.");
  if (data.status === "Ayrıldı" && !data.exitDate) return toast("Ayrılan personel için işten çıkış tarihi zorunludur.");
  if (data.status === "Ayrıldı" && !state.staffDraft.exitDocument) return toast("Ayrılan personel için işten çıkış evrakı eklemelisiniz.");
  if (data.exitDate && data.hireDate && data.exitDate < data.hireDate) return toast("İşten çıkış tarihi işe giriş tarihinden önce olamaz.");
  if (staffDocumentBytes() > MAX_STAFF_DOCUMENT_TOTAL_BYTES) return toast("Personel evraklarının toplam boyutu sınırı aşıyor.");

  const profile = {
    name,
    role: data.role.trim(),
    phone: data.phone.trim(),
    email: data.email.trim().toLocaleLowerCase("tr"),
    address: data.address.trim(),
    hireDate: data.hireDate,
    monthlySalary: data.monthlySalary,
    status: data.status,
    exitDate: data.status === "Ayrıldı" ? data.exitDate : (row?.exitDate || ""),
    photo: state.staffDraft.photo,
    entryDocument: state.staffDraft.entryDocument,
    exitDocument: state.staffDraft.exitDocument,
    documents: state.staffDraft.documents,
    updatedAt: new Date().toISOString()
  };
  if (row) {
    if (previousName && previousName !== name) updateNamedReferences("staff", row.id, previousName, name);
    Object.assign(row, profile);
    delete row.advance;
  } else {
    row = { id: uid(), ...profile, createdAt: new Date().toISOString() };
    target.push(row);
  }
  const action = previousStatus !== "Ayrıldı" && data.status === "Ayrıldı"
    ? "Personel işten ayrıldı"
    : wasEdit ? "Personel kartı güncellendi" : "Personel kartı oluşturuldu";
  audit(action, name);
  try {
    persist();
  } catch {
    state.db.audit.shift();
    if (!wasEdit) target.splice(target.indexOf(row), 1);
    else {
      Object.keys(row).forEach(key => delete row[key]);
      Object.assign(row, previousRow);
      if (previousName !== name) updateNamedReferences("staff", row.id, name, previousName);
    }
    return toast("Dosyalar bu cihazın yerel saklama sınırını aştı. Daha küçük dosyalar seçin.");
  }
  closeModal();
  renderPage();
  toast(wasEdit ? "Personel kartı güncellendi." : "Personel kartı oluşturuldu.");
}

async function saveRecord(event) {
  event.preventDefault();
  const section = window.YAPI360_SECTIONS[state.page];
  const data = Object.fromEntries(new FormData(event.target));
  if (section.specialForm === "cash") return saveCashRecord(data);
  if (section.specialForm === "warehouse") return saveWarehouseRecord(data);
  if (section.specialForm === "staff") return saveStaffRecord(data);
  if (section.specialForm === "staffAssignment") return saveStaffAssignment(data);
  const target = state.page === "users" ? state.db.users : (state.db.records[state.page] ||= []);
  let row = target.find(item => item.id === state.editId);
  const wasEdit = Boolean(row);
  const previousRow = row ? { ...row } : null;

  if (UNIQUE_NAME_PAGES.has(state.page) && data.name && target.some(item => item.name.toLocaleLowerCase("tr") === data.name.toLocaleLowerCase("tr") && item.id !== state.editId)) {
    return toast("Bu adla daha önce bir kayıt oluşturulmuş.");
  }

  if (state.page === "users") {
    data.email = data.email.toLocaleLowerCase("tr");
    if (target.some(item => item.email === data.email && item.id !== state.editId)) return toast("Bu e-posta zaten kayıtlı.");
    if (data.password) data.passwordHash = await hashPassword(data.password);
    delete data.password;
  }
  if (state.page === "purchases") {
    const inventoryError = purchaseInventoryError(previousRow, data);
    if (inventoryError) return toast(inventoryError);
  }
  if (state.page === "sites" && data.plannedEndDate < data.setupDate) {
    return toast("Planlanan bitiş tarihi şantiye kurulum tarihinden önce olamaz.");
  }

  if (row) {
    const passwordHash = row.passwordHash;
    const previousName = row.name;
    if (previousName && data.name && previousName !== data.name) updateNamedReferences(state.page, row.id, previousName, data.name);
    Object.assign(row, data, { updatedAt: new Date().toISOString() });
    if (state.page === "users" && !data.passwordHash) row.passwordHash = passwordHash;
    audit("Kayıt güncellendi", section.title + " · " + recordName(row));
  } else {
    row = { id: uid(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    target.push(row);
    audit("Yeni kayıt eklendi", section.title + " · " + recordName(row));
  }
  if (state.page === "purchases") syncPurchaseInventory(row, previousRow);
  persist();
  closeModal();
  renderPage();
  toast(wasEdit ? "Kayıt güncellendi." : "Kayıt eklendi.");
}

function assignmentRangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  const firstMax = firstEnd || "9999-12-31";
  const secondMax = secondEnd || "9999-12-31";
  return firstStart <= secondMax && secondStart <= firstMax;
}

function saveStaffAssignment(data) {
  const staff = records("staff").find(item => item.id === data.staffId);
  const project = records("projects").find(item => item.id === data.projectId);
  const site = records("sites").find(item => item.id === data.siteId);
  if (!staff || !project || !site || site.project !== project.name) return toast("Personel, proje ve projeye bağlı şantiye seçmelisiniz.");
  if (data.endDate && data.endDate < data.startDate) return toast("Bitiş tarihi başlangıç tarihinden önce olamaz.");
  if (data.status === "Tamamlandı" && !data.endDate) return toast("Tamamlanan görevlendirme için bitiş tarihi zorunludur.");

  const target = state.db.records.staff_assignments ||= [];
  if (target.some(item => item.id !== state.editId && item.staffId === staff.id && item.siteId === site.id && assignmentRangesOverlap(data.startDate, data.endDate, item.startDate, item.endDate))) {
    return toast("Bu personelin aynı şantiyede çakışan bir görevlendirmesi var.");
  }
  const linkedTimesheets = records("timesheets").filter(item => item.assignmentId === state.editId);
  if (linkedTimesheets.some(item => item.date < data.startDate || (data.endDate && item.date > data.endDate))) {
    return toast("Tarih aralığı bu görevlendirmeye bağlı puantaj kayıtlarını dışarıda bırakamaz.");
  }

  let row = target.find(item => item.id === state.editId);
  const wasEdit = Boolean(row);
  const assignment = {
    staffId: staff.id,
    staffName: staff.name,
    projectId: project.id,
    project: project.name,
    siteId: site.id,
    site: site.name,
    duty: data.duty,
    startDate: data.startDate,
    endDate: data.endDate || "",
    status: data.status,
    updatedAt: new Date().toISOString()
  };
  if (row) Object.assign(row, assignment);
  else {
    row = { id: uid(), ...assignment, createdAt: new Date().toISOString() };
    target.push(row);
  }
  linkedTimesheets.forEach(item => {
    Object.assign(item, { staffId: staff.id, staffName: staff.name, projectId: project.id, project: project.name, siteId: site.id, site: site.name, updatedAt: new Date().toISOString() });
  });
  audit(wasEdit ? "Personel görevlendirmesi güncellendi" : "Personel görevlendirmesi eklendi", staff.name + " · " + project.name + " / " + site.name);
  persist();
  closeModal();
  renderPage();
  toast(wasEdit ? "Görevlendirme güncellendi." : "Görevlendirme eklendi.");
}

function saveCashRecord(data) {
  const transactionType = data.transactionType;
  const contact = records("contacts").find(item => item.id === data.contactId);
  const staff = records("staff").find(item => item.id === data.staffId);
  if (CONTACT_TYPES.has(transactionType) && !contact) return toast("Bu işlem için tanımlı bir cari seçmelisiniz.");
  if (STAFF_TYPES.has(transactionType) && !staff) return toast("Bu işlem için tanımlı bir personel seçmelisiniz.");

  let instrument = null;
  if (PAYMENT_INSTRUMENT_TYPES.has(transactionType)) {
    instrument = eligibleInstruments(transactionType).find(item => item.id === data.instrumentId);
    if (!instrument) return toast("Ödemeye uygun portföy kaydı seçmelisiniz.");
    data.amount = instrument.amount;
    data.referenceNo = instrument.number;
    data.instrumentId = instrument.id;
  }

  if (number(data.amount) <= 0) return toast("İşlem tutarı sıfırdan büyük olmalıdır.");
  const source = [...records("purchases"), ...records("sales")].find(item => item.id === data.sourceRecordId);
  const isPayment = ["Ödeme", "Çek Ödeme", "Senet Ödeme"].includes(transactionType);
  const isCollection = ["Tahsilat", "Çek Tahsilat", "Senet Tahsilat"].includes(transactionType);
  if (source) {
    const sourceName = isPayment ? source.supplier : source.customer;
    const remaining = isPayment ? number(source.amount) - number(source.paidAmount) : number(source.total) - number(source.collected);
    if (sourceName !== contact?.name) return toast("Bağlı kayıt ile seçilen cari uyuşmuyor.");
    if (number(data.amount) > remaining) return toast("İşlem tutarı bağlı kaydın kalan tutarını aşamaz.");
  }

  if (COLLECTION_INSTRUMENT_TYPES.has(transactionType)) {
    const instrumentType = transactionType.startsWith("Çek") ? "Alınan Çek" : "Alınan Senet";
    if (records("checks").some(item => item.type === instrumentType && item.number === data.instrumentNumber)) {
      return toast("Bu belge numarası daha önce kaydedilmiş.");
    }
    instrument = {
      id: uid(),
      type: instrumentType,
      number: data.instrumentNumber,
      party: contact.name,
      bank: data.instrumentBank,
      dueDate: data.dueDate,
      amount: data.amount,
      status: "Tahsil Edildi",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    (state.db.records.checks ||= []).push(instrument);
    data.createdInstrumentId = instrument.id;
    data.instrumentId = instrument.id;
    data.referenceNo = instrument.number;
  }

  const previousInstrumentStatus = PAYMENT_INSTRUMENT_TYPES.has(transactionType) ? instrument.status : "";
  if (PAYMENT_INSTRUMENT_TYPES.has(transactionType)) {
    instrument.status = "Ciro Edildi";
    instrument.endorsedTo = contact.name;
    instrument.updatedAt = new Date().toISOString();
  }

  if (source && isPayment) {
    source.paidAmount = number(source.paidAmount) + number(data.amount);
    source.paymentStatus = source.paidAmount >= number(source.amount) ? "Ödendi" : "Kısmi";
    source.updatedAt = new Date().toISOString();
  }
  if (source && isCollection) {
    source.collected = Math.min(number(source.total), number(source.collected) + number(data.amount));
    source.status = source.collected >= number(source.total) ? "Tamamlandı" : "Devam Ediyor";
    source.updatedAt = new Date().toISOString();
  }

  const movement = {
    id: uid(),
    date: data.date,
    transactionType,
    contactId: contact?.id || "",
    contactName: contact?.name || "",
    staffId: staff?.id || "",
    staffName: staff?.name || "",
    relatedName: contact?.name || staff?.name || "—",
    sourceRecordId: data.sourceRecordId || "",
    instrumentId: data.instrumentId || "",
    createdInstrumentId: data.createdInstrumentId || "",
    previousInstrumentStatus,
    referenceNo: data.referenceNo || "FİŞ-" + Date.now().toString().slice(-8),
    amount: data.amount,
    description: data.description,
    direction: CASH_IN.has(transactionType) ? "in" : CASH_OUT.has(transactionType) ? "out" : "neutral",
    affectsCash: CASH_IN.has(transactionType) || CASH_OUT.has(transactionType),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  (state.db.records.cash ||= []).push(movement);
  audit("Finans işlemi eklendi", transactionType + " · " + movement.relatedName + " · " + money.format(number(movement.amount)));
  persist();
  closeModal();
  renderPage();
  toast(transactionType + " kaydedildi.");
}

function saveWarehouseRecord(data) {
  const item = records("inventory").find(entry => entry.id === data.itemId && entry.type === "Malzeme");
  const project = records("projects").find(entry => entry.id === data.projectId);
  const site = records("sites").find(entry => entry.id === data.siteId);
  const staff = records("staff").find(entry => entry.id === data.staffId && entry.status !== "Ayrıldı");
  const contractorDelivery = data.usageType === "Taşerona Malzeme";
  const subcontractor = contractorDelivery ? records("subcontractors").find(entry => entry.id === data.subcontractorId && entry.project === project?.name && entry.materialProvision === "Firma Sağlar") : null;
  const quantity = number(data.quantity);
  if (!item) return toast("Ana depodan geçerli bir malzeme seçmelisiniz.");
  if (!project || !site || site.project !== project.name) return toast("Seçilen şantiye bu projeye bağlı değil.");
  if (!staff) return toast("Sevk eden aktif personeli seçmelisiniz.");
  if (contractorDelivery && !subcontractor) return toast("Bu proje için malzemesi firma tarafından sağlanan taşeron anlaşmasını seçmelisiniz.");
  if (quantity <= 0 || quantity > number(item.onHand)) return toast("Sevk miktarı ana depo stok miktarını aşamaz.");

  item.onHand = number(item.onHand) - quantity;
  item.updatedAt = new Date().toISOString();
  const movement = {
    id: uid(),
    date: data.date,
    movementType: "Sevk",
    itemId: item.id,
    itemName: item.name,
    quantity: data.quantity,
    unit: item.unit || "",
    sourceName: "Ana Depo",
    usageType: contractorDelivery ? "Taşerona Malzeme" : "Firma Kullanımı",
    projectId: project.id,
    project: project.name,
    siteId: site.id,
    site: site.name,
    staffId: staff.id,
    dispatchedBy: staff.name,
    subcontractorId: subcontractor?.id || "",
    subcontractor: subcontractor?.name || "",
    note: data.note || "Proje / şantiye sevki",
    automatic: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  (state.db.records.warehouse ||= []).push(movement);
  audit("Ana depodan sevk yapıldı", item.name + " · " + project.name + " / " + site.name + (subcontractor ? " · " + subcontractor.name : "") + " · " + quantity.toLocaleString("tr-TR") + " " + (item.unit || ""));
  persist();
  closeModal();
  renderPage();
  toast("Malzeme sevki kaydedildi.");
}

function reverseCashMovement(movement) {
  if (movement.createdInstrumentId) {
    const instruments = state.db.records.checks ||= [];
    const createdIndex = instruments.findIndex(item => item.id === movement.createdInstrumentId);
    if (createdIndex >= 0) instruments.splice(createdIndex, 1);
  } else if (movement.instrumentId && PAYMENT_INSTRUMENT_TYPES.has(movement.transactionType)) {
    const instrument = records("checks").find(item => item.id === movement.instrumentId);
    if (instrument) {
      instrument.status = movement.previousInstrumentStatus || "Tahsil Edildi";
      delete instrument.endorsedTo;
      instrument.updatedAt = new Date().toISOString();
    }
  }

  if (!movement.sourceRecordId) return;
  const source = [...records("purchases"), ...records("sales")].find(item => item.id === movement.sourceRecordId);
  if (!source) return;
  if (["Ödeme", "Çek Ödeme", "Senet Ödeme"].includes(movement.transactionType)) {
    source.paidAmount = Math.max(0, number(source.paidAmount) - number(movement.amount));
    source.paymentStatus = source.paidAmount <= 0 ? "Ödenmedi" : source.paidAmount >= number(source.amount) ? "Ödendi" : "Kısmi";
  }
  if (["Tahsilat", "Çek Tahsilat", "Senet Tahsilat"].includes(movement.transactionType)) {
    source.collected = Math.max(0, number(source.collected) - number(movement.amount));
    source.status = source.collected >= number(source.total) ? "Tamamlandı" : "Devam Ediyor";
  }
  source.updatedAt = new Date().toISOString();
}

function reverseWarehouseMovement(movement) {
  if (movement.movementType !== "Sevk") return;
  const item = records("inventory").find(entry => entry.id === movement.itemId) || records("inventory").find(entry => entry.name === movement.itemName);
  if (item) {
    item.onHand = number(item.onHand) + number(movement.quantity);
    item.updatedAt = new Date().toISOString();
  }
}

function recordName(row) {
  return row.name || row.staffName || row.itemName || row.number || row.description || row.customer || row.supplier || row.email || "Kayıt";
}

function deleteRecord(id) {
  const target = state.page === "users" ? state.db.users : (state.db.records[state.page] ||= []);
  const index = target.findIndex(item => item.id === id);
  if (index < 0) return;
  if (state.page === "users" && target[index].id === state.user.id) return toast("Aktif kullanıcı kendi hesabını silemez.");
  const references = referenceCount(state.page, target[index]);
  if (references) return toast(`Bu kayıt ${references} işlemde kullanıldığı için silinemez.`);
  if (state.page === "purchases" && !canReversePurchaseInventory(target[index])) return toast("Bu alış silinemez; malzemenin bir bölümü ana depodan sevk edilmiş.");
  if (!confirm("Bu kaydı kalıcı olarak silmek istediğinize emin misiniz?")) return;
  if (state.page === "cash") reverseCashMovement(target[index]);
  if (state.page === "warehouse") reverseWarehouseMovement(target[index]);
  if (state.page === "purchases") reversePurchaseInventory(target[index]);
  const [removed] = target.splice(index, 1);
  audit("Kayıt silindi", window.YAPI360_SECTIONS[state.page].title + " · " + recordName(removed));
  persist();
  renderPage();
  toast("Kayıt silindi.");
}

function closeModal() {
  $("#recordModal").classList.remove("open");
  $("#recordModal").classList.remove("staff-modal");
  $("#recordFields").onclick = null;
  $("#recordForm").reset();
  state.editId = null;
  state.staffDraft = null;
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
  const exportValue = (field, row) => {
    if (field.type === "staffPhoto") return row.photo?.name || "";
    if (field.type === "staffDocuments") return [row.entryDocument?.name, row.exitDocument?.name, ...(row.documents || []).map(file => file.name)].filter(Boolean).join(" | ");
    return row[field.name] ?? "";
  };
  const csv = [fields.map(field => field.label), ...source.map(row => fields.map(field => exportValue(field, row)))]
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
$("#content").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit]");
  const remove = event.target.closest("[data-delete]");
  if (edit) openModal(edit.dataset.edit);
  if (remove) deleteRecord(remove.dataset.delete);
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
    const registration = await navigator.serviceWorker.register("./sw.js?v=4.6.0", { updateViaCache: "none" });
    registration.update();
  });
}

setAuthMode();
resumeSession();

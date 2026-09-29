import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const html = read("index.html");
const app = read("app.js");
const data = read("data.js");
const sw = read("sw.js");
const manifest = JSON.parse(read("manifest.webmanifest"));

for (const [name, source] of Object.entries({ "app.js": app, "data.js": data, "sw.js": sw })) {
  try {
    new Function(source);
  } catch (error) {
    throw new Error(`${name} sözdizimi hatası: ${error.message}`);
  }
}

const requiredIds = ["auth", "authForm", "app", "sidebar", "nav", "content", "recordModal", "recordForm", "toast"];
for (const id of requiredIds) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Eksik DOM kimliği: ${id}`);
}

for (const asset of ["styles.css?v=4.9.0", "data.js?v=4.9.0", "app.js?v=4.9.0", "manifest.webmanifest?v=4.9.0"]) {
  if (!html.includes(asset)) throw new Error(`Eksik sürümlü varlık: ${asset}`);
}
if (!sw.includes('yapi360-v4.9.0')) throw new Error("Servis çalışanı önbellek sürümü güncel değil.");

if (manifest.start_url !== "./" || manifest.scope !== "./") throw new Error("PWA kapsamı GitHub Pages alt diziniyle uyumlu değil.");
if (!app.includes('$$("[data-go]")')) throw new Error("Dashboard yönlendirme seçicisi çoğul değil.");
if (app.includes("admin@yapi360.demo")) throw new Error("Demo hesabı uygulama kodunda kalmış.");
for (const type of ["Ödeme", "Tahsilat", "Borç Dekontu", "Alacak Dekontu", "Maaş Ödeme", "Avans Ödeme", "Çek Tahsilat", "Çek Ödeme", "Senet Tahsilat", "Senet Ödeme"]) {
  if (!app.includes(`"${type}"`)) throw new Error(`Eksik finans işlem tipi: ${type}`);
}
if (!app.includes("reverseCashMovement")) throw new Error("Finans işlemi geri alma ilişkisi eksik.");
if (!data.includes('timesheets') || !app.includes("saveTimesheetDay")) throw new Error("Puantaj modülü eksik.");
if (!data.includes('staff_assignments') || !app.includes("saveStaffAssignment") || !app.includes("timesheetAssignmentOptions")) throw new Error("Dönemsel personel görevlendirme ilişkisi eksik.");
if (!app.includes("openStaffModal") || !app.includes("createStaffPhoto") || !app.includes("entryDocument") || !app.includes("exitDocument")) throw new Error("Personel özlük dosyası ve evrak akışı eksik.");
if (data.includes('f("advance", "Avans"')) throw new Error("Personel kartında avans alanı kalmış; avans yalnızca kasa hareketinde tutulmalıdır.");
if (!data.includes('f("setupDate", "Şantiye kurulum tarihi", "date")') || !data.includes('f("plannedEndDate", "Planlanan bitiş tarihi", "date")')) throw new Error("Şantiye kurulum ve planlanan bitiş tarihleri eksik.");
if (data.includes('f("planned", "Planlanan (%)"') || data.includes('f("actual", "Gerçekleşen (%)"')) throw new Error("Şantiye kartında elle girilen ilerleme yüzdeleri kalmış.");
if (!data.includes('specialForm: "contract"') || !app.includes("openContractModal") || !app.includes("saveContractRecord")) throw new Error("Sözleşme tarih ve dosya formu eksik.");
if (!data.includes('specialForm: "progress"') || !data.includes('"progressDocuments"') || !app.includes("openProgressModal") || !app.includes("saveProgressRecord")) throw new Error("Hakediş dosya formu eksik.");
if (!app.includes('records("progress").filter(item => ["Onaylandı", "Ödendi"].includes(item.status))')) throw new Error("Onaylı hakediş-cari alacak ilişkisi eksik.");
if (!app.includes("nextProgressNumber") || !app.includes("Sistem tarafından otomatik verilir.")) throw new Error("Otomatik hakediş numarası eksik.");
for (const metric of ["PLANLANAN PROJE MALİYETİ", "AKTİF SÖZLEŞME TUTARI", "TOPLAM HAKEDİŞ", "MEVCUT STOK DEĞERİ", "KASA BAKİYESİ", "ALACAK BAKİYESİ", "ÖDENECEK ÇEK / SENET", "TAHSİL EDİLECEK ÇEK / SENET"]) {
  if (!app.includes(metric)) throw new Error(`Yönetim paneli göstergesi eksik: ${metric}`);
}
if (!data.includes('specialForm: "subcontractor"') || !app.includes("subcontractorContractOptions") || !app.includes("saveSubcontractorRecord")) throw new Error("Taşeron-sözleşme seçim ilişkisi eksik.");
if (!app.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) throw new Error("Excel dosya desteği eksik.");
if (manifest.name !== "Yapı360" || !html.includes("<title>İnşaat Yönetim Platformu</title>")) throw new Error("PWA pencere başlığı tekilleştirilmemiş.");
if (!data.includes('"relation"')) throw new Error("Tanımlı kayıt seçimleri eksik.");
if (!data.includes('warehouse_report') || !app.includes("saveWarehouseRecord") || !app.includes("syncPurchaseInventory")) throw new Error("Ana depo ve sevkiyat ilişkisi eksik.");
if (!app.includes("Taşerona Malzeme") || !data.includes("materialProvision")) throw new Error("Taşeron malzeme akışı eksik.");

console.log("Yapı360 doğrulaması başarılı: JS, PWA, DOM ve demo temizliği.");

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

for (const asset of ["styles.css?v=4.16.0", "data.js?v=4.16.0", "app.js?v=4.16.0", "manifest.webmanifest?v=4.16.0"]) {
  if (!html.includes(asset)) throw new Error(`Eksik sürümlü varlık: ${asset}`);
}
if (!sw.includes('yapi360-v4.16.0')) throw new Error("Servis çalışanı önbellek sürümü güncel değil.");

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
for (const workGroup of ["Kaba İşler · Beton", "Kaba İşler · Demir", "Kaba İşler · Kalıp", "Kaba İşler · Duvar", "İnce İşler · Sıva / Boya", "Mekanik Tesisat", "Elektrik Tesisat"]) {
  if (!app.includes(`"${workGroup}"`)) throw new Error(`Hakediş iş grubu eksik: ${workGroup}`);
}
if (!app.includes("progressPreviousQuantity") || !app.includes("progressTotals") || !app.includes("contractQuantity") || !app.includes("deductionAmount") || !app.includes("netPayable")) throw new Error("Hakediş metraj, kümülatif miktar, kesinti veya net ödeme hesabı eksik.");
for (const deduction of ["KDV Tevkifatı", "Stopaj", "Kesin Teminat", "Avans", "Malzeme", "Tutanak / Ceza", "SGK / İşçilik"]) {
  if (!app.includes(`"${deduction}"`)) throw new Error(`Hakediş kesinti türü eksik: ${deduction}`);
}
if (!app.includes('records("progress").filter(item => ["Onaylandı", "Ödendi"].includes(item.status))')) throw new Error("Onaylı hakediş-cari alacak ilişkisi eksik.");
if (!app.includes("nextProgressNumber") || !app.includes("Sistem tarafından otomatik verilir.")) throw new Error("Otomatik hakediş numarası eksik.");
if (!app.includes('sourceType: "progress"') || !app.includes("Bağlı ${payment ? \"alış / hakediş\" : \"satış\"} kaydı") || !app.includes('source.status = source.paidAmount >= number(source.amount) ? "Ödendi" : "Onaylandı"')) throw new Error("Taşeron hakediş-kasa ödeme ilişkisi eksik.");
for (const metric of ["PLANLANAN PROJE MALİYETİ", "AKTİF SÖZLEŞME TUTARI", "TOPLAM HAKEDİŞ", "MEVCUT STOK DEĞERİ", "KASA BAKİYESİ", "ALACAK BAKİYESİ", "ÖDENECEK ÇEK / SENET", "TAHSİL EDİLECEK ÇEK / SENET"]) {
  if (!app.includes(metric)) throw new Error(`Yönetim paneli göstergesi eksik: ${metric}`);
}
if (!data.includes('bank_accounts') || !app.includes("cashAccountField") || !app.includes("bankAccountBalance") || !app.includes("BANKA BAKİYESİ")) throw new Error("Banka hesabı ve kasa/banka ayrımı eksik.");
if (!app.includes("Kendi Çekimiz") || !app.includes("ownCheckPayment") || !app.includes('origin: "Kendi Çekimiz"') || !data.includes('f("origin", "Belge kaynağı"')) throw new Error("Kendi çekimizle ödeme akışı eksik.");
if (!app.includes("contactLedgerEntries") || !app.includes("contactLedgerStart") || !app.includes("contactLedgerEnd") || !app.includes("printContactLedger") || !app.includes("exportContactLedgerCsv")) throw new Error("Cari tarih aralıklı ekstre, yazdırma veya dışa aktarma akışı eksik.");
if (!app.includes("Borç / Alacak Raporu") || !app.includes("renderContactBalanceReport") || !app.includes("DİP TOPLAM")) throw new Error("Cari borçlu/alacaklı sekmesi veya dip toplamı eksik.");
if (!app.includes("contactBalanceFilter") || !app.includes("Yalnızca Borçlu Cariler") || !app.includes("Yalnızca Alacaklı Cariler") || !app.includes("exportContactBalanceReportCsv")) throw new Error("Cari borç/alacak raporu filtresi veya dışa aktarma özelliği eksik.");
if (!data.includes('f("balance", "Bakiye", "number", { form: false })') || !app.includes("contactRowsWithBalances") || !app.includes("printContactList")) throw new Error("Cari listesi otomatik bakiye veya yazdırma özelliği eksik.");
if (data.includes('f("taxId", "Vergi / TC no"), f("openingBalance", "Açılış bakiyesi", "number")')) throw new Error("Cari kartında açılış bakiyesi alanı kalmış.");
if (!data.includes('specialForm: "subcontractor"') || !app.includes("subcontractorContractOptions") || !app.includes("saveSubcontractorRecord")) throw new Error("Taşeron-sözleşme seçim ilişkisi eksik.");
if (!app.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) throw new Error("Excel dosya desteği eksik.");
if (manifest.name !== "Yapı360" || !html.includes("<title>İnşaat Yönetim Platformu</title>")) throw new Error("PWA pencere başlığı tekilleştirilmemiş.");
if (!data.includes('"relation"')) throw new Error("Tanımlı kayıt seçimleri eksik.");
if (!data.includes('warehouse_report') || !app.includes("saveWarehouseRecord") || !app.includes("syncPurchaseInventory")) throw new Error("Ana depo ve sevkiyat ilişkisi eksik.");
if (!app.includes("Taşerona Malzeme") || !data.includes("materialProvision")) throw new Error("Taşeron malzeme akışı eksik.");
if (!data.includes('procurement_admin') || !data.includes('purchase_requests') || !data.includes('supplier_quotes') || !data.includes('purchase_orders') || !data.includes('administrative_tasks')) throw new Error("Satınalma ve idari işler modülleri eksik.");
if (!app.includes("openPurchaseRequestModal") || !app.includes("savePurchaseRequest") || !app.includes("saveSupplierQuote") || !app.includes("savePurchaseOrder") || !app.includes("saveAdministrativeTask")) throw new Error("Satınalma ve idari işler formları eksik.");
if (!app.includes("syncPurchaseOrderReceipt") || !app.includes("purchaseOrderId") || !app.includes("alış ve depo girişi oluşturuldu")) throw new Error("Sipariş teslimi ile alış/ana depo bağlantısı eksik.");
if (!app.includes("nav-group-toggle") || !app.includes("closeNavMenus") || !html.includes('aria-label="Üst ana menü"')) throw new Error("Üst ana sekme ve açılır menü yapısı eksik.");

console.log("Yapı360 doğrulaması başarılı: JS, PWA, DOM ve demo temizliği.");

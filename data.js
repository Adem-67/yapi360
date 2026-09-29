window.YAPI360_NAV = [
  { label: "GENEL", items: ["dashboard"] },
  { label: "PROJE & ŞANTİYE", items: ["projects", "contracts", "sites", "subcontractors", "progress"] },
  { label: "FİNANS", items: ["cash", "bank_accounts", "purchases", "sales", "checks"] },
  { label: "OPERASYON", items: ["contacts", "staff", "staff_assignments", "timesheets", "inventory", "warehouse", "assets", "categories"] },
  { label: "RAPORLAR", items: ["contact_ledger", "staff_ledger", "staff_assignment_report", "cost_analysis", "warehouse_report"] },
  { label: "YÖNETİM", items: ["users", "settings", "audit"] }
];

const f = (name, label, type = "text", extra = {}) => ({ name, label, type, ...extra });

window.YAPI360_SECTIONS = {
  dashboard: { title: "Yönetim Paneli", icon: "▦", description: "Finans, proje ve operasyon sonuçlarının canlı özeti.", special: "dashboard" },
  projects: {
    title: "Projeler", icon: "▣", description: "Bütçe, süre ve fiziksel ilerleme takibi.",
    fields: [f("name", "Proje adı"), f("location", "Konum"), f("budget", "Bütçe", "number"), f("progress", "İlerleme (%)", "number"), f("status", "Durum", "select", { options: ["Planlama", "Aktif", "Tamamlandı", "Beklemede"] })]
  },
  contracts: {
    title: "Sözleşmeler", icon: "▤", description: "Tarih aralığı ve dosyalarıyla arsa sahibi, taşeron, satış ve tedarik sözleşmeleri.", specialForm: "contract",
    fields: [f("name", "Sözleşme"), f("party", "Taraf / cari", "relation", { source: "contacts" }), f("project", "Proje", "relation", { source: "projects" }), f("startDate", "Başlangıç", "date"), f("endDate", "Bitiş", "date"), f("status", "Durum", "select", { options: ["Taslak", "Onay Bekliyor", "İmzalandı", "Sona Erdi"] }), f("documents", "Dosyalar", "contractDocuments")]
  },
  sites: {
    title: "Şantiyeler", icon: "◓", description: "Projeye bağlı şantiye, sorumlu ve planlanan çalışma tarihleri.",
    fields: [f("name", "Şantiye / iş kalemi"), f("project", "Proje", "relation", { source: "projects" }), f("manager", "Sorumlu", "relation", { source: "staff" }), f("setupDate", "Şantiye kurulum tarihi", "date"), f("plannedEndDate", "Planlanan bitiş tarihi", "date")]
  },
  subcontractors: {
    title: "Taşeronlar", icon: "▧", description: "Cariyle eşleşen sözleşme, proje, uzmanlık ve bakiye takibi.", specialForm: "subcontractor",
    fields: [f("name", "Firma / cari", "relation", { source: "contacts" }), f("contract", "Sözleşme"), f("specialty", "Uzmanlık"), f("project", "Proje", "relation", { source: "projects" }), f("materialProvision", "Malzeme sorumluluğu", "select", { options: ["Taşeron Sağlar", "Firma Sağlar"] }), f("contractAmount", "Sözleşme tutarı", "number"), f("paid", "Ödenen", "number")]
  },
  progress: {
    title: "Hakedişler", icon: "₺", description: "Dosyalarıyla birlikte hakediş hazırlama, onay ve ödeme akışı.", specialForm: "progress",
    fields: [f("number", "Hakediş no"), f("subcontractor", "Taşeron / cari", "relation", { source: "contacts" }), f("project", "Proje", "relation", { source: "projects" }), f("amount", "Tutar", "number"), f("paidAmount", "Ödenen", "number"), f("status", "Durum", "select", { options: ["Taslak", "Onay Bekliyor", "Onaylandı", "Ödendi"] }), f("documents", "Dosyalar", "progressDocuments")]
  },
  cash: {
    title: "Kasa & Finans Hareketleri", icon: "↻", description: "Nakit, dekont, personel, çek ve senet işlemlerinin ilişkili kayıtları.",
    specialForm: "cash",
    fields: [f("date", "Tarih", "date"), f("transactionType", "İşlem tipi"), f("relatedName", "İlişkili kayıt"), f("accountName", "Kasa / banka hesabı"), f("referenceNo", "Belge / referans"), f("amount", "Tutar", "number"), f("description", "Açıklama")]
  },
  bank_accounts: {
    title: "Banka Hesapları", icon: "▥", description: "Banka hesapları, IBAN bilgileri ve hareketlerden hesaplanan güncel bakiyeler.",
    fields: [f("name", "Hesap adı"), f("bank", "Banka"), f("iban", "IBAN"), f("openingBalance", "Açılış bakiyesi", "number"), f("currentBalance", "Güncel bakiye", "number", { form: false }), f("status", "Durum", "select", { options: ["Aktif", "Pasif"] })]
  },
  purchases: {
    title: "Alış İşlemleri", icon: "🛒", description: "Tedarikçi, proje ve stokla ilişkili alış kayıtları.",
    fields: [f("date", "Tarih", "date"), f("supplier", "Tedarikçi / cari", "relation", { source: "contacts" }), f("project", "İlgili proje", "relation", { source: "projects", optional: true }), f("item", "Stok / hizmet", "relation", { source: "inventory" }), f("quantity", "Miktar", "number"), f("amount", "Toplam tutar", "number"), f("paymentStatus", "Ödeme", "select", { options: ["Ödenmedi", "Kısmi", "Ödendi"] })]
  },
  sales: {
    title: "Satış & Tahsilat", icon: "▣", description: "Müşteri satışı, tahsilat ve kalan bakiye takibi.",
    fields: [f("date", "Tarih", "date"), f("customer", "Müşteri / cari", "relation", { source: "contacts" }), f("project", "Proje", "relation", { source: "projects" }), f("unit", "Bağımsız bölüm / hizmet"), f("total", "Satış bedeli", "number"), f("collected", "Tahsil edilen", "number"), f("status", "Durum", "select", { options: ["Teklif", "Sözleşme", "Devam Ediyor", "Tamamlandı", "Gecikme"] })]
  },
  checks: {
    title: "Çek / Senet", icon: "▭", description: "Alınan ve verilen çek-senet vade takibi.",
    fields: [f("type", "Tür", "select", { options: ["Alınan Çek", "Verilen Çek", "Alınan Senet", "Verilen Senet"] }), f("origin", "Belge kaynağı", "select", { options: ["Cari Belgesi", "Kendi Çekimiz"] }), f("number", "Belge no"), f("party", "Cari", "relation", { source: "contacts" }), f("bank", "Banka / düzenleyen"), f("dueDate", "Vade", "date"), f("amount", "Tutar", "number"), f("status", "Durum", "select", { options: ["Portföyde", "Tahsil Edildi", "Ciro Edildi", "Ödendi", "Karşılıksız", "İade"] })]
  },
  contacts: {
    title: "Cariler", icon: "▥", description: "Müşteri, tedarikçi ve taşeron cari kartları.",
    fields: [f("name", "Cari adı"), f("type", "Tür", "select", { options: ["Müşteri", "Tedarikçi", "Taşeron", "Arsa Sahibi"] }), f("phone", "Telefon", "tel"), f("taxId", "Vergi / TC no"), f("openingBalance", "Açılış bakiyesi", "number")]
  },
  staff: {
    title: "Personeller", icon: "♟", description: "Personel özlük, iletişim, adres ve işe giriş/çıkış evrakları.", specialForm: "staff",
    fields: [
      f("photo", "Fotoğraf", "staffPhoto"), f("name", "Ad soyad"), f("role", "Görev"), f("phone", "Telefon", "tel"),
      f("email", "E-posta", "email", { table: false }), f("address", "Adres", "textarea", { table: false }),
      f("hireDate", "İşe giriş", "date"), f("monthlySalary", "Aylık ücret", "number"),
      f("status", "Durum", "select", { options: ["Aktif", "İzinli", "Ayrıldı"] }),
      f("documents", "Özlük evrakları", "staffDocuments")
    ]
  },
  staff_assignments: {
    title: "Personel Görevlendirme", icon: "⇄", description: "Personelin proje ve şantiye görevlendirmelerini tarih aralığıyla izleyin.", specialForm: "staffAssignment",
    fields: [f("staffName", "Personel"), f("project", "Proje"), f("site", "Şantiye"), f("duty", "Görev / ekip"), f("startDate", "Başlangıç", "date"), f("endDate", "Bitiş", "date"), f("status", "Durum")]
  },
  timesheets: { title: "Puantaj Planı", icon: "◫", description: "Günlük çalışma durumu, yevmiye çarpanı ve aylık dönem toplamları.", special: "timesheets" },
  inventory: {
    title: "Stoklar / Hizmetler", icon: "▦", description: "Malzeme ve hizmet kartları, kritik stok kontrolü.",
    fields: [f("name", "Stok / hizmet"), f("type", "Tür", "select", { options: ["Malzeme", "Hizmet"] }), f("supplier", "Varsayılan tedarikçi / cari", "relation", { source: "contacts", optional: true }), f("category", "Kategori"), f("unit", "Birim"), f("onHand", "Ana depo miktarı", "number"), f("critical", "Kritik seviye", "number")]
  },
  warehouse: {
    title: "Ana Depo & Sevkiyat", icon: "▦", description: "Alışlardan oluşan ana depo girişleri ile proje ve şantiye sevkleri.", specialForm: "warehouse",
    fields: [f("date", "Tarih", "date"), f("movementType", "Hareket"), f("itemName", "Malzeme"), f("quantity", "Miktar", "number"), f("unit", "Birim"), f("usageType", "Kullanım"), f("project", "Proje"), f("site", "Şantiye"), f("subcontractor", "Taşeron"), f("dispatchedBy", "Sevk eden"), f("note", "Açıklama")]
  },
  assets: {
    title: "Demirbaş Takibi", icon: "⚒", description: "Makine, araç ve ekipmanın zimmet ve bakım durumu.",
    fields: [f("name", "Demirbaş"), f("serial", "Seri / plaka"), f("site", "Konum / şantiye", "relation", { source: "sites", optional: true }), f("assignedTo", "Zimmetli", "relation", { source: "staff", optional: true }), f("nextMaintenance", "Sonraki bakım", "date"), f("status", "Durum", "select", { options: ["Aktif", "Bakımda", "Arızalı", "Hurda"] })]
  },
  categories: {
    title: "Kategoriler", icon: "◆", description: "Finans, stok ve operasyon sınıflandırmaları.",
    fields: [f("name", "Kategori"), f("group", "Grup", "select", { options: ["Gelir", "Gider", "Stok", "Hizmet", "Demirbaş"] }), f("code", "Kod"), f("status", "Durum", "select", { options: ["Aktif", "Pasif"] })]
  },
  contact_ledger: { title: "Cari Hesap Hareketleri", icon: "▤", description: "Alış, satış ve tahsilatlardan oluşan cari sonuçları.", special: "contactLedger" },
  staff_ledger: { title: "Personel Hesap Hareketleri", icon: "▥", description: "Ücret ve avans sonuçlarının personel bazında görünümü.", special: "staffLedger" },
  staff_assignment_report: { title: "Personel Şantiye Raporu", icon: "⇄", description: "Personelin dönemsel proje ve şantiye görevlendirme geçmişi.", special: "staffAssignmentReport" },
  cost_analysis: { title: "Maliyet Analizi", icon: "◔", description: "Proje bütçesi ile gerçekleşen alış maliyetinin karşılaştırması.", special: "costAnalysis" },
  warehouse_report: { title: "Proje / Şantiye Sevk Raporu", icon: "▥", description: "Ana depodan proje ve şantiyelere gönderilen malzemelerin özeti.", special: "warehouseReport" },
  users: {
    title: "Kullanıcı Yönetimi", icon: "♙", description: "Firma kullanıcıları, roller ve erişim durumu.", special: "users",
    fields: [f("name", "Ad soyad"), f("email", "E-posta", "email"), f("role", "Rol", "select", { options: ["Admin", "Yönetici", "Muhasebe", "Satış", "Şantiye", "Görüntüleme"] }), f("status", "Durum", "select", { options: ["Aktif", "Pasif"] }), f("password", "Geçici şifre", "password", { table: false })]
  },
  settings: { title: "Firma Ayarları", icon: "⚙", description: "Firma profili, veri yedeği ve çalışma alanı tercihleri.", special: "settings" },
  audit: { title: "İşlem Geçmişi", icon: "◴", description: "Kullanıcı ve kayıt işlemlerinin izlenebilir geçmişi.", special: "audit" }
};

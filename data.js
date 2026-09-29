window.YAPI360_NAV = [
  { label: "GENEL", items: ["dashboard"] },
  { label: "PROJE & ŞANTİYE", items: ["projects", "contracts", "sites", "subcontractors", "progress"] },
  { label: "FİNANS", items: ["cash", "purchases", "sales", "checks"] },
  { label: "OPERASYON", items: ["contacts", "staff", "inventory", "assets", "categories"] },
  { label: "RAPORLAR", items: ["contact_ledger", "staff_ledger", "cost_analysis"] },
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
    title: "Sözleşmeler", icon: "▤", description: "Arsa sahibi, taşeron, satış ve tedarik sözleşmeleri.",
    fields: [f("name", "Sözleşme"), f("party", "Taraf"), f("project", "Proje"), f("date", "Tarih", "date"), f("status", "Durum", "select", { options: ["Taslak", "Onay Bekliyor", "İmzalandı", "Sona Erdi"] })]
  },
  sites: {
    title: "Şantiyeler", icon: "◓", description: "Şantiye iş kalemleri ve plan-gerçekleşen ilerleme.",
    fields: [f("name", "Şantiye / iş kalemi"), f("project", "Proje"), f("manager", "Sorumlu"), f("planned", "Planlanan (%)", "number"), f("actual", "Gerçekleşen (%)", "number")]
  },
  subcontractors: {
    title: "Taşeronlar", icon: "▧", description: "Taşeron sözleşmesi, uzmanlık ve bakiye takibi.",
    fields: [f("name", "Firma"), f("specialty", "Uzmanlık"), f("project", "Proje"), f("contractAmount", "Sözleşme tutarı", "number"), f("paid", "Ödenen", "number")]
  },
  progress: {
    title: "Hakedişler", icon: "₺", description: "Hakediş hazırlama, onay ve ödeme akışı.",
    fields: [f("number", "Hakediş no"), f("subcontractor", "Taşeron"), f("project", "Proje"), f("amount", "Tutar", "number"), f("status", "Durum", "select", { options: ["Taslak", "Onay Bekliyor", "Onaylandı", "Ödendi"] })]
  },
  cash: {
    title: "Kasa Hareketleri", icon: "↻", description: "Manuel ve işlemlerden otomatik oluşan para hareketleri.",
    fields: [f("date", "Tarih", "date"), f("type", "Tür", "select", { options: ["Gelir", "Gider"] }), f("category", "Kategori"), f("description", "Açıklama"), f("amount", "Tutar", "number")]
  },
  purchases: {
    title: "Alış İşlemleri", icon: "🛒", description: "Tedarikçi, proje ve stokla ilişkili alış kayıtları.",
    fields: [f("date", "Tarih", "date"), f("supplier", "Tedarikçi / cari"), f("project", "Proje"), f("item", "Stok / hizmet"), f("quantity", "Miktar", "number"), f("amount", "Toplam tutar", "number"), f("paymentStatus", "Ödeme", "select", { options: ["Ödenmedi", "Kısmi", "Ödendi"] })]
  },
  sales: {
    title: "Satış & Tahsilat", icon: "▣", description: "Müşteri satışı, tahsilat ve kalan bakiye takibi.",
    fields: [f("date", "Tarih", "date"), f("customer", "Müşteri / cari"), f("project", "Proje"), f("unit", "Bağımsız bölüm / hizmet"), f("total", "Satış bedeli", "number"), f("collected", "Tahsil edilen", "number"), f("status", "Durum", "select", { options: ["Teklif", "Sözleşme", "Devam Ediyor", "Tamamlandı", "Gecikme"] })]
  },
  checks: {
    title: "Çek / Senet", icon: "▭", description: "Alınan ve verilen çek-senet vade takibi.",
    fields: [f("type", "Tür", "select", { options: ["Alınan Çek", "Verilen Çek", "Alınan Senet", "Verilen Senet"] }), f("party", "Cari"), f("dueDate", "Vade", "date"), f("amount", "Tutar", "number"), f("status", "Durum", "select", { options: ["Portföyde", "Tahsil Edildi", "Ödendi", "Karşılıksız", "İade"] })]
  },
  contacts: {
    title: "Cariler", icon: "▥", description: "Müşteri, tedarikçi ve taşeron cari kartları.",
    fields: [f("name", "Cari adı"), f("type", "Tür", "select", { options: ["Müşteri", "Tedarikçi", "Taşeron", "Arsa Sahibi"] }), f("phone", "Telefon", "tel"), f("taxId", "Vergi / TC no"), f("openingBalance", "Açılış bakiyesi", "number")]
  },
  staff: {
    title: "Personeller", icon: "♟", description: "Personel, görev, maaş ve avans takibi.",
    fields: [f("name", "Ad soyad"), f("role", "Görev"), f("site", "Şantiye"), f("monthlySalary", "Aylık ücret", "number"), f("advance", "Avans", "number"), f("status", "Durum", "select", { options: ["Aktif", "İzinli", "Ayrıldı"] })]
  },
  inventory: {
    title: "Stoklar / Hizmetler", icon: "▦", description: "Malzeme ve hizmet kartları, kritik stok kontrolü.",
    fields: [f("name", "Stok / hizmet"), f("type", "Tür", "select", { options: ["Malzeme", "Hizmet"] }), f("category", "Kategori"), f("unit", "Birim"), f("onHand", "Mevcut", "number"), f("critical", "Kritik seviye", "number")]
  },
  assets: {
    title: "Demirbaş Takibi", icon: "⚒", description: "Makine, araç ve ekipmanın zimmet ve bakım durumu.",
    fields: [f("name", "Demirbaş"), f("serial", "Seri / plaka"), f("site", "Konum / şantiye"), f("assignedTo", "Zimmetli"), f("nextMaintenance", "Sonraki bakım", "date"), f("status", "Durum", "select", { options: ["Aktif", "Bakımda", "Arızalı", "Hurda"] })]
  },
  categories: {
    title: "Kategoriler", icon: "◆", description: "Finans, stok ve operasyon sınıflandırmaları.",
    fields: [f("name", "Kategori"), f("group", "Grup", "select", { options: ["Gelir", "Gider", "Stok", "Hizmet", "Demirbaş"] }), f("code", "Kod"), f("status", "Durum", "select", { options: ["Aktif", "Pasif"] })]
  },
  contact_ledger: { title: "Cari Hesap Hareketleri", icon: "▤", description: "Alış, satış ve tahsilatlardan oluşan cari sonuçları.", special: "contactLedger" },
  staff_ledger: { title: "Personel Hesap Hareketleri", icon: "▥", description: "Ücret ve avans sonuçlarının personel bazında görünümü.", special: "staffLedger" },
  cost_analysis: { title: "Maliyet Analizi", icon: "◔", description: "Proje bütçesi ile gerçekleşen alış maliyetinin karşılaştırması.", special: "costAnalysis" },
  users: {
    title: "Kullanıcı Yönetimi", icon: "♙", description: "Firma kullanıcıları, roller ve erişim durumu.", special: "users",
    fields: [f("name", "Ad soyad"), f("email", "E-posta", "email"), f("role", "Rol", "select", { options: ["Admin", "Yönetici", "Muhasebe", "Satış", "Şantiye", "Görüntüleme"] }), f("status", "Durum", "select", { options: ["Aktif", "Pasif"] }), f("password", "Geçici şifre", "password", { table: false })]
  },
  settings: { title: "Firma Ayarları", icon: "⚙", description: "Firma profili, veri yedeği ve çalışma alanı tercihleri.", special: "settings" },
  audit: { title: "İşlem Geçmişi", icon: "◴", description: "Kullanıcı ve kayıt işlemlerinin izlenebilir geçmişi.", special: "audit" }
};

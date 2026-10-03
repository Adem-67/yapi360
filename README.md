# Yapı360 v4.17

İnşaat firmaları için proje, şantiye, finans, cari, stok, personel ve satış süreçlerini ilişkilendiren PWA çalışma alanı.

## İlk kurulum

İlk açılışta sabit demo hesabı kullanılmaz. Firma adı, yönetici adı, e-posta ve en az 6 karakterli şifre ile çalışma alanı oluşturulur. Parola tarayıcıda SHA-256 özeti olarak tutulur.

> v4 yerel çalışma alanı sürümüdür. Veriler yalnızca kullanılan tarayıcıda saklanır. Gerçek çok kullanıcılı üretim kullanımı için API, sunucu tarafı oturum yönetimi ve merkezi veritabanı gerekir.

## İşlem-sonuç ilişkileri

- Ödenmiş alış işlemi → kasa gideri + proje maliyet analizi + cari hesap sonucu
- Satış ve tahsilat → kasa geliri + müşteri cari bakiyesi
- Ödeme/tahsilat → isteğe bağlı alış/satış bağlantısı + kalan tutarın otomatik güncellenmesi
- Çek/senet tahsilatı → portföy kaydı + satış ve cari bakiyesinin güncellenmesi
- Çek/senet ödemesi → uygun müşteri çek/senet listesinden seçim + ciro + tedarikçi bakiyesinin güncellenmesi
- Borç/alacak dekontu → nakdi etkilemeden cari hesap bakiyesinin güncellenmesi
- Personel maaş ve avans ödemeleri → yalnızca kasa hareketlerinden personel hesap sonucu
- Personel özlük kartı → iletişim + adres + kamera/dosya fotoğrafı + işe giriş/çıkış evrakı
- Proje bütçesi + projeye bağlı alışlar → bütçe kullanım oranı
- Kritik seviye altındaki stok → yönetim paneli uyarısı
- Cari, proje, şantiye, personel ve stok bağlantıları → önceden tanımlı kayıtlardan seçim
- Bağımsız personel kartı → tarih aralıklı proje/şantiye görevlendirmesi + personel çalışma yeri geçmişi
- Şantiye kartı → proje + sorumlu + kurulum tarihi + planlanan bitiş tarihi
- Sözleşme kartı → başlangıç/bitiş tarihi + PDF, görsel, Word ve Excel dosyaları
- Taşeron kartı → seçilen taşeron cariye ait sözleşmeler + sözleşmeden otomatik proje eşleştirmesi
- Hakediş kartı → proje, şantiye, sözleşme ve dönem bağlantısı + çoklu PDF, görsel, Word ve Excel dosyası
- Hakediş iş kalemleri → demir, kalıp, beton, duvar ve hafriyat dahil kaba işler; ince işler, mekanik, elektrik, altyapı ve ilave işler
- Hakediş hesabı → poz kodu + sözleşme miktarı + önceki/bu dönem/kümülatif metraj + birim fiyat + brüt/KDV/kesinti/net ödenecek
- Hakediş kesintileri → KDV tevkifatı, stopaj, teminat, avans, malzeme, tutanak, konaklama, yemek, SGK/işçilik ve taşeron adına ödeme
- Hakediş numarası → yıl bazlı, sıralı ve sistem tarafından otomatik oluşturulan `HKD-YYYY-0001` biçimi
- Hakediş durumu → “Taslak” ve “Onay Bekliyor” bakiyeyi etkilemez; “Onaylandı” ve “Ödendi” cari hesaba yansır
- Hakediş ödemesi → Kasa & Finans Hareketleri’nde taşeron seçildikten sonra yalnızca o carinin onaylı ve bakiyesi kalan hakedişleri listelenir
- Bağlı hakediş ödemesi → kalan tutarı otomatik getirir; kısmi ödemede bakiyeyi azaltır, tam ödemede hakedişi otomatik “Ödendi” yapar
- Banka hesabı → hesap adı, banka, IBAN, açılış bakiyesi ve hareketlerden hesaplanan güncel bakiye
- Kasa/banka seçimi → ödeme, tahsilat, maaş ve avans hareketleri yalnızca seçilen nakit kasa veya banka hesabının bakiyesini etkiler
- Kendi çekimizle ödeme → portföy çeki yoksa çek no, firma banka hesabı ve vade girilerek verilen çek oluşturulur; cari ödeme gerçekleşir ve belge “Kendi Çekimiz” olarak raporlanır
- Yönetim paneli → planlanan proje maliyeti, aktif sözleşmeler, onaylı hakedişler, stok değeri, kasa, banka, cari alacak ve açık çek/senet toplamları
- Cari ekstre → cari ve tarih aralığı seçimi, devreden/dönem/kapanış bakiyesi, yazdırma-PDF ve Excel uyumlu CSV
- Borç / alacak raporu → tümü/borçlu/alacaklı seçimi, ayrı toplamlar, net dip toplam farkı ve seçili raporu CSV dışa aktarma
- Cari listesi → hareketlerden otomatik bakiye, bakiyeli CSV dışa aktarma ve yazdırma/PDF görünümü
- Günlük puantaj → tarihte geçerli görevlendirmeden proje/şantiye seçimi + tam gün, yarım gün, izinli + 0–2 yevmiye çarpanı + aylık dönem özeti
- Malzeme alışı → otomatik ana depo girişi ve stok artışı
- Ana depo sevki → proje + projeye bağlı şantiye + sevk eden personel + stok düşümü
- Taşeron malzeme çıkışı → “Firma Sağlar” anlaşması seçimi ve taşeron bazlı teslim raporu
- Satınalma & İdari İşler → proje/şantiye/personel/stok bağlantılı talep, talebe bağlı tedarikçi teklifleri ve onaylı tekliften sipariş
- Sipariş teslimi → otomatik Alış İşlemi kaydı ve malzemede otomatik ana depo girişi
- İdari görevler → ruhsat, sigorta, abonelik, resmi yazışma, ofis, araç ve bakım işlerini proje/şantiye/sorumlu/son tarih ile takip

## Modüller

- Projeler, sözleşmeler, şantiyeler, taşeronlar, hakedişler
- Kasa, alış, satış-tahsilat, çek-senet
- Cariler, iletişim/adres ve özlük evraklı bağımsız personel kartları, stok-hizmetler, demirbaşlar, kategoriler
- Zorunlu işe giriş evrakı; ayrılışta zorunlu çıkış tarihi ve çıkış evrakı; ek personel dosyaları
- Dönemsel personel görevlendirme, şantiye çalışma geçmişi ve tarih filtreli puantaj
- Aylık puantaj özeti ve CSV dışa aktarma
- Ana depo hareketleri ile proje/şantiye/taşeron sevk raporu
- Satınalma talepleri, tedarikçi teklifleri, satınalma siparişleri ve idari işler çalışma alanı
- Cari hesap, personel hesap ve maliyet raporları
- Kullanıcı/rol yönetimi, firma ayarları, işlem geçmişi, JSON yedekleme

## Yerel çalıştırma

```bash
npx serve .
```

## Doğrulama

```bash
node scripts/validate.mjs
```

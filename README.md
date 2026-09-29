# Yapı360 v4.5

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
- Günlük puantaj → tarihte geçerli görevlendirmeden proje/şantiye seçimi + tam gün, yarım gün, izinli + 0–2 yevmiye çarpanı + aylık dönem özeti
- Malzeme alışı → otomatik ana depo girişi ve stok artışı
- Ana depo sevki → proje + projeye bağlı şantiye + sevk eden personel + stok düşümü
- Taşeron malzeme çıkışı → “Firma Sağlar” anlaşması seçimi ve taşeron bazlı teslim raporu

## Modüller

- Projeler, sözleşmeler, şantiyeler, taşeronlar, hakedişler
- Kasa, alış, satış-tahsilat, çek-senet
- Cariler, iletişim/adres ve özlük evraklı bağımsız personel kartları, stok-hizmetler, demirbaşlar, kategoriler
- Zorunlu işe giriş evrakı; ayrılışta zorunlu çıkış tarihi ve çıkış evrakı; ek personel dosyaları
- Dönemsel personel görevlendirme, şantiye çalışma geçmişi ve tarih filtreli puantaj
- Aylık puantaj özeti ve CSV dışa aktarma
- Ana depo hareketleri ile proje/şantiye/taşeron sevk raporu
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

# Yapı360 v4

İnşaat firmaları için proje, şantiye, finans, cari, stok, personel ve satış süreçlerini ilişkilendiren PWA çalışma alanı.

## İlk kurulum

İlk açılışta sabit demo hesabı kullanılmaz. Firma adı, yönetici adı, e-posta ve en az 6 karakterli şifre ile çalışma alanı oluşturulur. Parola tarayıcıda SHA-256 özeti olarak tutulur.

> v4 yerel çalışma alanı sürümüdür. Veriler yalnızca kullanılan tarayıcıda saklanır. Gerçek çok kullanıcılı üretim kullanımı için API, sunucu tarafı oturum yönetimi ve merkezi veritabanı gerekir.

## İşlem-sonuç ilişkileri

- Ödenmiş alış işlemi → kasa gideri + proje maliyet analizi + cari hesap sonucu
- Satış ve tahsilat → kasa geliri + müşteri cari bakiyesi
- Personel ücret ve avans → personel hesap hareketi sonucu
- Proje bütçesi + projeye bağlı alışlar → bütçe kullanım oranı
- Kritik seviye altındaki stok → yönetim paneli uyarısı

## Modüller

- Projeler, sözleşmeler, şantiyeler, taşeronlar, hakedişler
- Kasa, alış, satış-tahsilat, çek-senet
- Cariler, personeller, stok-hizmetler, demirbaşlar, kategoriler
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

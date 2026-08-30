# Yapı360

İnşaat firmaları için proje, sözleşme, şantiye, taşeron, hakediş, satın alma, stok, bağımsız bölüm, CRM, satış ve tahsilat yönetimi sunan modüler PWA prototipi.

## Demo giriş

- E-posta: `admin@yapi360.demo`
- Şifre: `123456`

## Yapı

- `index.html`: erişilebilir uygulama kabuğu
- `styles.css`: responsive tasarım sistemi
- `data.js`: modül tanımları ve örnek veriler
- `app.js`: navigasyon, oturum, CRUD, arama ve CSV dışa aktarma
- `manifest.webmanifest` / `sw.js`: PWA ve çevrimdışı çalışma

## Yerel çalıştırma

Service Worker güvenli origin gerektirdiği için dosyayı çift tıklamak yerine statik bir HTTP sunucusu kullanın:

```bash
npx serve .
```

Ardından tarayıcıda gösterilen yerel adresi açın.

## Özellikler

Tüm sol menü sekmeleri işlevseldir. Demo verileri korunur; eklenen kayıtlar tarayıcıdaki `localStorage` alanında saklanır. Liste araması, yeni kayıt, kullanıcı kaydı silme, CSV dışa aktarma, PWA kurulum ve çevrimdışı uygulama kabuğu desteklenir.

> Bu sürüm profesyonel ön yüz prototipidir. Üretim kullanımı için kimlik doğrulama, yetkilendirme ve kalıcı veriler sunucu tarafına taşınmalıdır.

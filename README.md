# IT Demirbaş ve Zimmet Yönetim Sistemi

Kurumdaki bilişim donanımlarının (bilgisayar, monitör, sunucu vb.) envanterini tutan; cihazların kimde olduğunu, personele teslim ve iade süreçlerini, arıza kayıtlarını ve tüm işlem geçmişini yöneten full-stack web uygulaması.

*Yapay Zekâ ve Dijital Dönüşüm Koordinatörlüğü — Aday Mühendis Değerlendirme Projesi.* Gereksinimler: [PRD.md](./PRD.md) · Görev listesi ve aşama notları: [task.md](./task.md)

![Genel bakış](docs/screenshots/02-genel-bakis.png)

## Özellikler

**Zorunlu kapsam (PRD §4.1)**
- JWT ile giriş/çıkış; parolalar bcrypt ile özetlenir; token httpOnly cookie'de tutulur.
- Rol tabanlı yetki (Yönetici / Personel): her kontrol backend middleware'inde yapılır, arayüz yalnızca görünürlüğü yönetir.
- Kullanıcı yönetimi: ekle, düzenle, pasife al, sil (geçmişi yoksa), parola sıfırla, departmanlar.
- Envanter: cihaz ekle/düzenle/pasife al/sil, otomatik benzersiz kod (`IT-2026-000042`) ve QR kod (PNG/SVG, etiket yazdırma).
- Zimmet: teslim ve iade. Aynı cihaz aynı anda iki kişiye zimmetlenemez; bu kural üç katmanda korunur (servis kontrolü, satır kilidi, veritabanı partial unique index). İade edilen cihaz depoya döner ve yeniden zimmetlenebilir.
- Dashboard: toplam / zimmetli / depoda / arızalı cihaz sayıları. Her açılışta veritabanından canlı hesaplanır.
- Tüm listelerde arama, filtre (durum, kategori, departman, kullanıcı), sıralama ve sayfalama.
- Responsive arayüz (mobilde tablolar karta dönüşür), anlık bildirimler (toast).
- Personel yalnızca kendi zimmetlerini ve kendi üzerindeki cihazın detayını/QR'ını görür.

**Farklılaştırıcı kapsam (PRD §4.2)**
- Akıllı kontrol merkezi: garantisi yaklaşan, uzun süredir depoda/arızalı cihazlar ve çelişkili/eksik kayıtlar için uyarılar. Hepsi veritabanından anlık üretilir.
- Cihaz zaman çizelgesi: ekleme, düzenleme, durum değişikliği, zimmet, iade ve bakım olayları, kimin yaptığı ve tarihiyle birlikte. İşlem geçmişi değiştirilemez; veritabanı trigger'ı UPDATE ve DELETE'i reddeder.
- Arıza ve bakım: kayıt açma, işleme alma, çözüm notuyla kapatma; cihaz başına çoklu kayıt.
- Raporlar: envanter ve zimmet raporları, filtreli CSV (Excel'de doğrudan açılır); tarayıcıdan yazdır / PDF.

## Teknolojiler

| Katman | Seçim |
|--------|-------|
| Frontend | React 19, Vite 6, Tailwind CSS 4 (harici UI/router kütüphanesi yok) |
| Backend | Node.js 22, Express 5, zod (doğrulama), helmet, express-rate-limit, qrcode |
| Veritabanı | PostgreSQL 16 (pg_trgm ile arama indeksi) |
| Kimlik | JWT (HS256) + bcrypt |
| Dağıtım | Docker Compose: `db` (postgres) + `api` (Node) + `web` (nginx: arayüz + `/api` ters vekil) |

```mermaid
flowchart LR
  B[Tarayıcı] -->|http://localhost:8080| W[web: nginx<br/>React derlemesi]
  W -->|/api/*| A[api: Express 5<br/>JWT, RBAC, iş kuralları]
  A --> D[(db: PostgreSQL 16)]
```

## Hızlı başlangıç (Docker)

Gereken tek şey [Docker Desktop](https://www.docker.com/products/docker-desktop/) (veya Docker Engine + Compose v2).

```bash
docker compose up --build
```

Ardından tarayıcıda **http://localhost:8080** adresini açın. İlk açılışta API, veritabanı tablolarını kendisi oluşturur ve örnek veriyi yükler. Bu adımlar her açılışta güvenle tekrar çalışır, mevcut veri bozulmaz.

| Hesap | E-posta | Parola |
|-------|---------|--------|
| Yönetici | `admin@kurum.local` | `Admin12345` |
| Örnek personel | `ayse.yilmaz@kurum.local` (diğerleri: `mehmet.kaya`, `zeynep.demir`, `emre.celik`, …`@kurum.local`) | `Personel123` |

`.env` dosyası **isteğe bağlıdır**; yoksa yukarıdaki varsayılanlarla çalışır. Gerçek kullanım için:

```bash
cp .env.example .env    # değerleri değiştirin (özellikle parolalar ve JWT_SECRET)
docker compose up --build -d
```

Durdurmak: `docker compose down` · Veritabanını da silmek: `docker compose down -v`

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|-----------|----------|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `zimmet` / `zimmet` / `zimmet-local-dev` | Veritabanı. Port dışarı açılmaz. |
| `JWT_SECRET` | *(boş)* | ≥ 32 karakter. Boşsa API her açılışta rastgele bir anahtar üretir: güvenlidir ama yeniden başlatmada oturumlar kapanır. Kısa değer verilirse API başlamaz. |
| `JWT_EXPIRES_IN` | `8h` | Oturum süresi (`30m`, `8h`, `1d`). |
| `APP_BASE_URL` | `http://localhost:8080` | QR kodların içine yazılan adres; uygulamaya hangi adresten erişiliyorsa o. |
| `COOKIE_SECURE` | `false` | HTTPS arkasında `true` yapın. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | `admin@kurum.local` / `Admin12345` / `Sistem Yöneticisi` | Hiç aktif yönetici yoksa oluşturulur. |
| `SEED_DEMO_DATA` | `true` | Boş veritabanına örnek departman, personel, cihaz ve zimmet yükler. |
| `ALERT_WARRANTY_DAYS` / `ALERT_IDLE_DAYS` / `ALERT_DEFECTIVE_DAYS` | `60` / `90` / `30` | Uyarı eşikleri (gün). |
| `REPORT_TIMEZONE` | `Europe/Istanbul` | CSV raporlarındaki saatler. |
| `WEB_PORT` | `8080` | Uygulamanın açılacağı port. |

## Docker olmadan geliştirme

Node.js 20+ ve çalışan bir PostgreSQL gerekir.

```bash
# Backend
cd backend
cp .env.example .env          # DATABASE_URL ve JWT_SECRET'ı düzenleyin
# Veritabanı için: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
npm install
npm run setup                 # migration + seed
npm run dev                   # http://localhost:3000

# Frontend (ayrı terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (/api istekleri 3000'e aktarılır)
```

## Güvenlik ve oturum stratejisi

- **Token saklama:** Web istemcisinde JWT, `httpOnly; SameSite=Strict` cookie'de durur. JavaScript token'a erişemez, bu yüzden XSS ile çalınamaz. Mobil/API istemcileri girişte `issueToken: true` gönderip token'ı `Authorization: Bearer` başlığıyla kullanabilir.
- **Çıkış ve iptal:** Logout cookie'yi siler. Ayrıca her kullanıcının bir `token_version` değeri var; parola sıfırlama, pasife alma ve rol değişikliği bu değeri artırır. Böylece o kullanıcının tüm eski token'ları anında geçersiz olur; ayrı bir kara listeye gerek kalmaz. Rol bilgisi her istekte token'dan değil veritabanından okunur.
- **CSRF:** SameSite=Strict + yalnızca `application/json` gövde kabulü (aksi `415`).
- **Girdi:** Tüm sorgular parametreli; sıralama alanları beyaz listeli; gövde ve sorgu parametreleri zod ile doğrulanır, şemada olmayan alanlar atılır (mass assignment koruması).
- **Diğer:** Girişte rate limit (15 dakikada 10 başarısız deneme / IP), hatalı girişte e-postanın var olup olmadığı belli edilmez, yanıtlarda parola özeti yok, log'larda gövde/cookie/Authorization yok, işlem geçmişine parola yazılmaz.

Ayrıntılar: [docs/SECURITY.md](docs/SECURITY.md) · Yetki haritası: [docs/PERMISSIONS.md](docs/PERMISSIONS.md)

## Testler

Backend'de 60 entegrasyon testi var (`backend/test/`); testler gerçek bir PostgreSQL veritabanına karşı çalışır. **Test veritabanının adı `_test` ile bitmelidir**, çünkü testler her dosyada veritabanını sıfırlar.

```bash
# Veritabanını yerelden erişilebilir başlat ve test veritabanını oluştur
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
docker compose exec db createdb -U zimmet zimmet_test

cd backend && npm install
TEST_DATABASE_URL=postgres://zimmet:zimmet-local-dev@localhost:5432/zimmet_test npm test
```

PRD §7 kabul kriterlerinin karşılıkları:

| Kriter | Test |
|--------|------|
| Yetki ihlali engeli | `users.test.js`, `assets.test.js`, `assignments.test.js`: personel tüm yönetici uçlarında 403 alıyor, başkasının cihazında 404 |
| Mükerrer kayıt koruması | `assets.test.js`: aynı seri no (büyük/küçük harf farkı dahil) ve aynı cihaz kodu reddediliyor |
| Çakışan zimmet engeli | `assignments.test.js`: aynı cihaza 8 eşzamanlı istekten yalnızca 1'i başarılı |
| Veri tutarlılığı | `dashboard.test.js`: her işlemden sonra dashboard sayıları doğrudan SQL sayımıyla birebir aynı |
| Eksiksiz kurulum | `docker compose up --build`: migration ve seed açılışta otomatik çalışır |

## Proje yapısı

```
.
├── backend/
│   ├── src/
│   │   ├── migrations/     001–004 SQL (sırayla, bir kez uygulanır)
│   │   ├── routes/         auth, users, departments, assets, assignments, me,
│   │   │                   audit-logs, dashboard, alerts, maintenance, reports
│   │   ├── services/       zimmet iş kuralları, uyarı kuralları, cihaz kodu
│   │   ├── middleware/     authenticate, requireRole, validate, errorHandler
│   │   └── scripts/        migrate.js, seed.js
│   └── test/               node:test entegrasyon testleri
├── frontend/
│   ├── src/pages/          ekranlar
│   ├── src/components/     Layout, tablo, modal, zimmet pencereleri, zaman çizelgesi…
│   └── nginx.conf          üretimde arayüz + /api ters vekil
├── docs/                   ERD, API, yetki haritası, güvenlik, ekran görüntüleri
└── docker-compose.yml
```

Klasör yapısı: monorepo aracı kullanılmadı. `backend/` ve `frontend/` kendi `package.json` dosyalarıyla bağımsız kurulur ve ayrı Docker imajı olarak derlenir.

## Tasarım dokümanları

- [docs/ERD.md](docs/ERD.md): veri modeli, durum makinesi, kısıtlar, indeksler
- [docs/API.md](docs/API.md): tüm uç noktalar, hata kodları, filtre parametreleri
- [docs/PERMISSIONS.md](docs/PERMISSIONS.md): rol × ekran × API yetki haritası
- [docs/SECURITY.md](docs/SECURITY.md): parola, JWT, girdi ve log güvenliği

## Ekran görüntüleri

| | |
|---|---|
| ![Giriş](docs/screenshots/01-giris.png) | ![Cihazlar](docs/screenshots/03-cihazlar.png) |
| ![Zimmetler](docs/screenshots/04-zimmetler.png) | ![Uyarılar](docs/screenshots/05-uyarilar.png) |
| ![İşlem geçmişi](docs/screenshots/06-islem-gecmisi.png) | ![Zimmetlerim (mobil)](docs/screenshots/07-zimmetlerim-mobil.png) |

## Bilinen notlar

- Depoda `package-lock.json` bulunmuyor (proje, paket kayıt sunucusuna erişimi olmayan bir ortamda yazıldı). İlk `npm install` sonrasında oluşan `package-lock.json` dosyalarını commit etmeniz, sürümleri sabitlemek için önerilir. Dockerfile'lar lock dosyası varsa otomatik olarak `npm ci` kullanır.
- PDF raporu ayrı bir kütüphaneyle değil, rapor sayfasının yazdırma görünümü ve tarayıcının "PDF olarak kaydet" seçeneğiyle alınır.
- Mobil uygulama (PRD §4.3, opsiyonel Faz 3) bu teslimatta yok. API buna hazırdır: Bearer token desteği var ve QR kodu `/assets/code/:kod` adresine çözülür.

# IT Demirbaş ve Zimmet Yönetim Sistemi — Görev Listesi

**Kaynak:** [PRD.md](./PRD.md)  
**Teknoloji:** React, Node.js/Express, PostgreSQL, JWT, Docker Compose (mobil opsiyonel)

---

## Çalışma kuralları

- [ ] Projeyi tek seferde değil, aşama aşama geliştir.
- [ ] Her aşamaya başlamadan önce yapılacakları ve etkilenecek dosyaları netleştir.
- [ ] Yetkilendirme yalnızca arayüzde değil, backend middleware ile doğrulansın.
- [ ] Aşama 1 (tasarım) onaylanmadan uygulama koduna geçilmesin.
- [ ] Her aşama sonunda: **Tamamlanan / Kalan / Sıradaki adım** notu düş.

---

## PRD zorunlu gereksinim kontrol listesi (Faz 1)

PRD §4.1 — tamamlandıkça işaretle:

- [x] Login / Logout
- [x] JWT oturum yönetimi; parolalar bcrypt/hash ile saklanır
- [ ] Responsive arayüz (masaüstü, tablet, mobil)
- [ ] Listelerde sayfalama, arama, sıralama
- [x] Toast / Snackbar bildirimleri
- [x] Admin: kullanıcı ekle / düzenle / sil veya pasife al / şifre yönetimi
- [ ] Dashboard: toplam cihaz, arızalı, boşta (depoda) — gerçek veri
- [x] Cihaz CRUD (marka, model, seri no, alım tarihi vb.)
- [x] Otomatik benzersiz QR kod / barkod
- [x] Zimmet teslim ve iade; geçmiş kayıtlar korunur
- [x] İş kuralı: aynı cihaz aynı anda iki aktif zimmette olamaz
- [x] İade sonrası cihaz IN_STOCK (boşta/depoda) ve yeniden zimmetlenebilir
- [x] Filtre: durum (ACTIVE, DEFECTIVE, IN_STOCK), departman, kullanıcı
- [x] Personel: sadece kendi zimmetleri ve yetkili cihaz detayı

---

## Veri modeli hızlı referans (PRD §5.2)

| Tablo | Önemli alanlar |
|--------|----------------|
| Users | role (ADMIN/USER), department_id, password_hash, is_active |
| Departments | name |
| Assets | asset_code (unique/QR), serial_number (unique), status, warranty_end_date |
| Assignments | asset_id, user_id, assigned_by, assigned_at, returned_at |
| AuditLogs | action_type, entity_type, entity_id, user_id, timestamp |
| MaintenanceRecords | (Faz 2) asset_id, issue_description, status, solution_note |

---

## Önerilen ekranlar

- [x] Giriş
- [ ] Admin dashboard
- [x] Cihaz listesi (arama, filtre, sayfalama)
- [x] Cihaz ekle / düzenle
- [x] Cihaz detay (QR + geçmiş)
- [x] Kullanıcı listesi ve düzenleme (Admin)
- [x] Zimmet teslim
- [x] Zimmet iade
- [x] Personel — zimmetlerim
- [x] İşlem geçmişi / audit (Admin)
- [ ] (Faz 2) Uyarı merkezi, bakım, raporlama

---

## Aşama 1 — Analiz, tasarım ve ERD

**Tamamlanma ölçütü:** ERD ve API listesi onaylanmadan kod yazımına geçilmez.

### Gereksinim ve roller

- [x] PRD §4.1 maddelerini yukarıdaki checklist ile eşleştir; eksik madde bırakma
- [x] PRD §3 yetki matrisini ekran + API izin haritasına dönüştür (Admin / USER)

### Veritabanı

- [x] ERD çiz (Users, Departments, Assets, Assignments, AuditLogs)
- [x] Foreign key ve indeks planı
- [x] Unique: `Assets.asset_code`, `Assets.serial_number`
- [x] Assets.status enum: ACTIVE, DEFECTIVE, IN_STOCK
- [x] Aktif zimmet kuralı: asset başına en fazla bir `returned_at IS NULL` (constraint veya transaction + unique partial index)
- [x] MaintenanceRecords tablosunu Faz 2 için taslakta bırak

### API tasarımı

- [x] Auth: login, logout, me (JWT)
- [x] Users CRUD + şifre güncelleme (Admin)
- [x] Departments list/create (gerekirse)
- [x] Assets CRUD + list (pagination, search, sort, filter)
- [x] Assignments: assign, return, history
- [x] Dashboard: stats (counts)
- [x] AuditLogs: list (filtre)
- [x] QR: asset_code veya id ile public/authorized lookup

### Güvenlik planı

- [x] JWT süresi, secret env’de
- [x] `authenticate` + `requireRole('ADMIN')` middleware listesi
- [x] Şifre ve token’ların log/commit’e girmemesi

**Test notu:** Tasarım dokümanı PRD §7 ile uyumlu mu kontrol et.

---

## Aşama 2 — Proje kurulumu ve sağlık kontrolü

**Tamamlanma ölçütü:** Frontend ve backend yerelde çalışır; veritabanı bağlantısı doğrulanır.

- [x] Klasör yapısı: `frontend/` + `backend/` (veya monorepo — seçimi README’de yaz)
- [x] Backend: Express, PostgreSQL bağlantısı
- [x] Frontend: Vite + React; Tailwind veya Bootstrap
- [x] `.env.example`, `.gitignore` (`.env`, node_modules, build)
- [x] `GET /health` (isteğe bağlı DB ping)
- [x] Git deposu başlat
- [x] Docker Compose: PostgreSQL servisi (api/web Aşama 8’de tamamlanır)
- [x] README iskeleti (kurulum başlıkları)

**Test notu:** `health` 200; FE dev server açılır; DB migration/connection hatasız.

---

## Aşama 3 — Auth ve kullanıcı yönetimi

**Tamamlanma ölçütü:** Yetkisiz kullanıcı korunan API’lere erişemez; roller test edilir.

### Backend

- [x] Migration: Users, Departments
- [x] Seed: en az bir ADMIN kullanıcı
- [x] Login → JWT; logout (client + opsiyonel blacklist yoksa dokümante et)
- [x] bcrypt ile password_hash
- [x] Middleware: authenticate, requireAdmin
- [x] Admin: kullanıcı listele, oluştur, güncelle, pasifle/sil, şifre sıfırla

### Frontend

- [x] Login / Logout sayfası
- [x] Token saklama stratejisi (header veya httpOnly cookie — dokümante)
- [x] Korunan route’lar; Admin-only sayfalar
- [x] Kullanıcı yönetim paneli (rol, departman, aktif)
- [x] Hata/başarı toast

**Test notu (PRD §7):** Standart USER admin endpoint’lerinde 403; hatalı parola ile giriş reddedilir.

---

## Aşama 4 — Envanter ve QR kod

**Tamamlanma ölçütü:** Cihaz kayıtları kalıcı; mükerrer seri/kod engellenir.

### Backend

- [x] Assets CRUD; pasife alma (`is_active`)
- [x] Otomatik `asset_code` üretimi
- [x] QR üretimi (görsel veya `/assets/by-code/:code` URL)
- [x] Liste: pagination, search, sort
- [x] Filtre: status, department, kullanıcı (zimmet ilişkisi)

### Frontend

- [x] Cihaz listesi tablosu
- [x] Ekle / düzenle formu + client validasyon
- [x] Cihaz detay + QR gösterimi
- [x] Sadece Admin envanter CRUD

**Test notu (PRD §7):** Aynı seri no veya asset_code ile ikinci kayıt reddedilir; QR doğru cihaza gider.

---

## Aşama 5 — Zimmet ve log altyapısı

**Tamamlanma ölçütü:** Çakışan aktif zimmet oluşturulamaz; teslim/iade geçmişi korunur.

### Backend

- [x] Assign: uygun status (ör. IN_STOCK), `assigned_by`, `assigned_at`
- [x] Return: `returned_at`, asset → IN_STOCK
- [x] Aktif zimmet çakışması engeli
- [x] AuditLogs: assign, return, asset/user değişiklikleri
- [x] Geçmiş sorguları; audit silme/güncelleme API’si yok

### Frontend

- [x] Zimmet teslim ekranı (cihaz + personel)
- [x] İade akışı (listeden veya detaydan)
- [x] Personel: Zimmetlerim
- [x] Personel: yetkili cihaz detayı

**Test notu (PRD §7):** Aktif zimmetli cihaz iade alınmadan başkasına verilemez; iade sonrası yeniden zimmet mümkün; geçmiş korunur.

---

## Aşama 6 — Dashboard ve responsive UI

**Tamamlanma ölçütü:** İstatistikler DB ile tutarlı; arayüz mobil/tablet/masaüstünde kullanılabilir.

- [ ] Dashboard API: COUNT toplam, DEFECTIVE, IN_STOCK (gerçek sorgular)
- [ ] Admin dashboard kartları
- [ ] Ana layout: navigasyon, mobil menü
- [ ] Responsive tablolar ve formlar
- [ ] Global toast/snackbar; loading ve empty state
- [ ] Tüm listelerde pagination + arama tutarlılığı

**Test notu (PRD §7):** Dashboard sayıları DB ile birebir; arama + filtre + sayfalama birlikte çalışır.

---

## Aşama 7 — İleri özellikler ve testler (Faz 2)

**Tamamlanma ölçütü:** Her ek özellik gerçek veriyle çalışır; PRD §7 senaryoları geçer.

### Akıllı demirbaş kontrol merkezi (PRD §4.2)

- [ ] Garanti süresi yaklaşan cihazlar (`warranty_end_date`)
- [ ] Uzun süredir IN_STOCK cihazlar
- [ ] Eksik / çelişkili kayıt uyarıları
- [ ] Uyarıdan cihaz detayına geçiş
- [ ] Uyarılar sabit/sahte değil, DB’den üretilir

### Detaylı cihaz zaman çizelgesi

- [ ] Audit + assignment birleşik kronoloji UI
- [ ] İşlemi yapan kullanıcı ve tarih görünür
- [ ] Geçmiş kayıtlar kullanıcı CRUD ile değiştirilemez

### Arıza ve bakım

- [ ] MaintenanceRecords migration
- [ ] Arıza oluştur, durum güncelle, çözüm notu, kapat
- [ ] Cihaz başına birden fazla arıza kaydı
- [ ] Cihaz detayda bakım geçmişi

### Raporlama

- [ ] Filtre: durum, departman, tarih aralığı
- [ ] CSV dışa aktarma
- [ ] (Opsiyonel) PDF export

### Test paketi

- [ ] PRD §7 — yetki ihlali engeli
- [ ] PRD §7 — mükerrer kayıt koruması
- [ ] PRD §7 — çakışan zimmet engeli
- [ ] PRD §7 — veri tutarlılığı (dashboard)
- [ ] Geçersiz/eksik form backend’de reddedilir
- [ ] Gizli bilgiler log ve repoda yok

---

## Aşama 8 — Teslimat

**Tamamlanma ölçütü:** Sıfır ortamda `docker-compose up` ile sistem ayağa kalkar; README yeterli.

- [ ] README: proje özeti, tech stack, kurulum, env değişkenleri, seed admin
- [ ] Ekran görüntüleri
- [ ] Docker Compose: postgres + api + frontend (veya nginx)
- [ ] `docker-compose up` uçtan uca doğrula (PRD §7)
- [ ] Public GitHub/GitLab; `.env` commit edilmemiş
- [ ] Zorunlu PRD checklist’inin tamamı işaretli

---

## Aşama 9 — Mobil uygulama (opsiyonel / Faz 3)

**Tamamlanma ölçütü:** Web backend API ile entegre; zorunlu web kapsamı bitmiş olmalı.

- [ ] React Native veya Flutter proje seçimi ve kurulum
- [ ] JWT ile mobil login
- [ ] Kamera ile QR okuma → cihaz detay
- [ ] Saha: teslim / iade / arıza bildirimi (yetkili kullanıcı)
- [ ] Personel: kişisel zimmet listesi

---

## Kabul testleri özeti (PRD §7)

| Senaryo | İlgili aşama |
|---------|----------------|
| Standart kullanıcı Admin API → erişemez | 3 |
| Hatalı parola → giriş yok | 3 |
| Aynı seri no / cihaz kodu → ikinci kayıt yok | 4 |
| Aktif zimmet varken başkasına zimmet yok | 5 |
| İade sonrası yeniden zimmet | 5 |
| Geçmiş teslim/iade korunur | 5 |
| Dashboard sayıları = DB | 6 |
| Arama + filtre + sayfalama | 4, 6 |
| Backend form validasyonu | 3–5 |
| QR doğru cihaz | 4 |
| docker-compose eksiksiz kurulum | 8 |
| Şifre/token sızıntısı yok | 2, 3, 8 |

---

## Aşama ilerleme notları

Her aşama bittiğinde doldur:

### Aşama 1

- **Tamamlanan:** `docs/ERD.md` (Mermaid ERD, durum makinesi, FK/indeks planı), `docs/schema.sql` (PostgreSQL 16'da kurulup kısıtlar test edildi: mükerrer seri no/e-posta, çakışan zimmet, iade sonrası yeniden zimmet, audit log değiştirilemezliği), `docs/API.md`, `docs/PERMISSIONS.md`, `docs/SECURITY.md`
- **Kalan:** Tasarım onayı (veya revizyon)
- **Sıradaki adım:** Aşama 2 ✓ (tasarım onaylandı)

### Aşama 2

- **Tamamlanan:** `backend/` (Express 5, pg havuzu, transaction yardımcısı, bağımlılıksız migration aracı, merkezi hata yönetimi, `GET /health` + DB ping), `frontend/` (Vite + React 19 + Tailwind v4, tasarım belirteçleri, bağımlılıksız router, API istemcisi, toast), `.env.example` (kök + backend), `.gitignore`, `docker-compose.yml` (postgres), README iskeleti, git deposu. Seçim: ayrı `backend/` + `frontend/` klasörleri (README'de yazıyor).
- **Doğrulama:** `/health` → 200 `{status:ok, db:ok}`; bilinmeyen yol → JSON 404; 32 karakterden kısa `JWT_SECRET` ile API başlamıyor.
- **Kalan:** —
- **Sıradaki adım:** Aşama 3 — Auth ve kullanıcı yönetimi

### Aşama 3

- **Tamamlanan:** Migration'lar (`001` kullanıcı/departman/audit, `002` cihaz, `003` zimmet — Aşama 1'de onaylanan şemanın tamamı; kullanıcı silme/pasife alma kuralları zimmet tablosuna baktığı için birlikte eklendi), seed (admin + isteğe bağlı örnek veri), JWT login/logout/me, httpOnly + SameSite=Strict cookie, mobil için `issueToken`, `token_version` ile anında oturum iptali, `authenticate` / `requireAdmin` / `requireJsonBody` / login rate limit, kullanıcı ve departman API'leri (arama, filtre, sıralama, sayfalama), son yönetici ve kendini değiştirme korumaları. Arayüz: giriş, kenar menülü layout (mobil açılır menü), Personel ve Departmanlar sayfaları, toast, 403/404 sayfaları.
- **Token stratejisi:** Web'de token httpOnly cookie'de (JS erişemez); logout cookie'yi siler; şifre sıfırlama / pasife alma / rol değişimi `token_version`'ı artırıp tüm eski token'ları geçersiz kılar (blacklist gerekmez). Ayrıntı: `docs/SECURITY.md`.
- **Doğrulama:** 23 otomatik test geçti (standart kullanıcı tüm admin uçlarında 403, hatalı parola 401, rate limit 429, CSRF 415, SQL enjeksiyon denemesi, mükerrer e-posta 409 vb.). Ekran görüntüleri masaüstü + mobilde alındı.
- **Kalan:** —
- **Sıradaki adım:** Aşama 4 — Envanter ve QR kod

### Aşama 4

- **Tamamlanan:** Cihaz CRUD + pasife alma, durum değişikliği (Arızalı ↔ Depoda; `ACTIVE` yalnızca zimmetle oluşur), `IT-YYYY-NNNNNN` kod üretimi (sequence), QR (PNG/SVG, indirme, içerik `APP_BASE_URL/assets/code/<kod>`), liste: arama (kod/seri/marka/model/kişi) + çoklu durum + kategori + departman + kullanıcı + aktiflik filtresi, beyaz listeli sıralama, sayfalama. Personel yalnızca kendi zimmetindeki cihazı görür (diğerleri 404, yönetici notu gizli). Arayüz: cihaz listesi (mobilde kart), ekle/düzenle formu (istemci doğrulaması), cihaz detayı (kimde, bilgiler, QR, etiket yazdırma, işlem menüsü), `/assets/code/:kod` QR hedefi.
- **Karar:** Seri numaraları büyük harfe çevrilerek saklanır; böylece `abc-123` ve `ABC-123` aynı cihaz sayılır.
- **Doğrulama:** 11 yeni test (mükerrer seri no/kod 409, form doğrulaması, arama+filtre+sayfalama, departman/kullanıcı filtresi, personel yetki sınırı, QR → doğru cihaz) — toplam 34 test geçti.
- **Kalan:** —
- **Sıradaki adım:** Aşama 5 — Zimmet ve log altyapısı

### Aşama 5

- **Tamamlanan:** Zimmet teslim (cihaz satır kilidi + IN_STOCK kontrolü + partial unique index; pasif kullanıcı/cihaz reddi), iade (sağlam → IN_STOCK, arızalı → DEFECTIVE), zimmet listesi (aktif/iade/tümü, arama, departman, tarih aralığı), `/api/me/assignments` (sorgu her zaman giriş yapan kullanıcıya sabit), cihaz zimmet geçmişi ve zaman çizelgesi, işlem geçmişi API'si (yalnızca okuma). Zimmet kayıtları ve audit log'lar DB trigger'larıyla korunuyor (silinemez; iade dışında değiştirilemez). Arayüz: Zimmetler sayfası, Zimmetle / İade al pencereleri (aranabilir cihaz ve personel seçimi), Zimmetlerim, İşlem geçmişi, cihaz detayında zimmet geçmişi + zaman çizelgesi.
- **Doğrulama:** 10 yeni test — aynı cihaza 8 eşzamanlı zimmet isteğinden yalnızca 1'i başarılı; iade sonrası yeniden zimmet; geçmiş korunuyor; personel 403 / IDOR koruması; audit ve zimmet kayıtları SQL ile bile silinemiyor. Toplam 44 test geçti. Arayüzde uçtan uca zimmet → iade akışı denendi.
- **Kalan:** —
- **Sıradaki adım:** Aşama 6 — Dashboard ve responsive UI

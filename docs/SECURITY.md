# Güvenlik Planı — Aşama 1

## 1. Parolalar

- `bcrypt` (Node: `bcryptjs`), **cost = 12**. Veritabanında yalnızca `password_hash` tutulur.
- Politika: en az 8 karakter, en az bir harf ve bir rakam. Backend'de doğrulanır (frontend sadece ön kontrol).
- Login'de kullanıcı bulunamasa bile sahte bir hash ile `bcrypt.compare` çalıştırılır → yanıt süresinden e-posta varlığı anlaşılmaz.
- Hata mesajı her durumda aynıdır: "E-posta veya parola hatalı".

## 2. JWT

| Ayar | Değer |
|------|-------|
| Algoritma | `HS256` (doğrulamada algoritma sabitlenir, `none` kabul edilmez) |
| Secret | `JWT_SECRET` ortam değişkeni, ≥ 32 karakter; tanımsız/kısaysa uygulama **başlamaz** |
| Süre | `JWT_EXPIRES_IN`, varsayılan `8h` (bir mesai günü) |
| Payload | `{ sub: userId, role, tv: token_version }` — kişisel veri yok |

**Taşıma:**
- **Web:** Token `httpOnly; Secure (prod); SameSite=Strict; Path=/` cookie'de. JavaScript erişemez → XSS ile token çalınamaz. Frontend ve API aynı origin'den sunulur (dev'de Vite proxy, prod'da nginx), bu yüzden CORS gerekmez.
- **Mobil (Faz 3) / API istemcileri:** Login yanıtındaki `token` alanı `Authorization: Bearer` ile gönderilir. `authenticate` önce başlığa, sonra cookie'ye bakar.
- **CSRF:** `SameSite=Strict` + API yalnızca `application/json` gövde kabul eder (form-POST ile tetiklenemez).

**Oturum iptali (logout & token geçersizleştirme):**
- Logout cookie'yi siler.
- Blacklist tutulmaz; bunun yerine `users.token_version` kullanılır. Şifre sıfırlama, pasife alma ve rol değişikliğinde sürüm artırılır → o kullanıcının tüm eski token'ları bir sonraki istekte `401` olur.
- Her istekte kullanıcı DB'den okunur (`is_active`, `role`, `token_version`). Ek maliyet tek bir PK sorgusu; karşılığında anında iptal ve güncel rol kontrolü.
- Bilinen sınır: Bearer kullanan istemcide logout yalnızca istemci tarafında token'ı silmektir; token süresi dolana kadar geçerlidir (bu README'de belirtilecek).

## 3. Middleware listesi

`helmet` (güvenlik başlıkları) → `express.json({ limit: '100kb' })` → `cookieParser` → route bazında: `loginRateLimit`, `authenticate`, `requireRole('ADMIN')`, `canViewAsset`, `validate(zodSchema)` → merkezi `errorHandler`.

Ayrıntılı uç-middleware eşleşmesi: [PERMISSIONS.md](./PERMISSIONS.md).

## 4. Girdi güvenliği

- Tüm SQL sorguları parametreli (`pg` `$1, $2`). Sıralama alanları **beyaz liste** ile seçilir; kullanıcı girdisi asla SQL'e string olarak eklenmez.
- Tüm gövde ve query parametreleri `zod` şemalarıyla doğrulanır; bilinmeyen alanlar atılır (`strip`), böylece `role`, `asset_code`, `status` gibi alanlar yanlış uçtan değiştirilemez (mass assignment koruması).
- `id` parametreleri pozitif tamsayı olarak doğrulanır.

## 5. Gizli bilgilerin log ve repoya girmemesi

- `.env` `.gitignore`'da; repoda yalnızca `.env.example` (sahte değerlerle).
- Seed admin parolası `SEED_ADMIN_PASSWORD` env'den okunur; tanımsızsa geliştirme ortamında rastgele üretilip **yalnızca bir kez** konsola yazılır, prod'da seed başarısız olur.
- HTTP istek logları (`morgan`) gövde içermez; `Authorization` ve `Cookie` başlıkları loglanmaz.
- `errorHandler` 500 hatalarında stack trace'i istemciye dönmez; sunucu logunda tutar.
- Audit log `details` alanına parola/hash/token yazılmaz (servis katmanında `sanitize` yardımcı fonksiyonu).
- API yanıtlarında `password_hash` ve `token_version` hiçbir zaman dönmez (SELECT'lerde açık sütun listesi).

## 6. Diğer

- Login rate limit: IP başına 15 dakikada 10 başarısız deneme (`express-rate-limit`).
- Docker'da API konteyneri root olmayan kullanıcıyla çalışır; PostgreSQL portu yalnızca iç ağda açık (Aşama 8).
- QR kod içeriği yalnızca bir URL'dir; kimlik bilgisi içermez. URL açıldığında normal oturum + yetki kontrolü uygulanır.

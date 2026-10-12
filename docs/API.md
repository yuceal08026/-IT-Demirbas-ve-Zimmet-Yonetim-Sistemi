# REST API Tasarımı — Aşama 1

Temel yol: `/api` · Biçim: JSON (`Content-Type: application/json`) · Kimlik: JWT (bkz. [SECURITY.md](./SECURITY.md))

Yetki kısaltmaları: **Herkes** = giriş yapmamış dahil · **Auth** = giriş yapmış her kullanıcı · **Admin** = `role=ADMIN` · **Sahip** = cihazın aktif zimmet sahibi.

## 0. Ortak kurallar

### Sayfalı liste yanıtı
```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
}
```
Ortak sorgu parametreleri: `page` (≥1, varsayılan 1), `limit` (1–100, varsayılan 20), `search`, `sort` (izinli alan listesi — beyaz liste dışı değer `400`), `order` (`asc` | `desc`).

### Hata yanıtı
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Seri numarası zorunludur", "details": [{ "field": "serial_number", "message": "..." }] } }
```

| HTTP | `code` | Ne zaman |
|------|--------|----------|
| 400 | `VALIDATION_ERROR` | Eksik/geçersiz alan, beyaz liste dışı sıralama alanı |
| 401 | `UNAUTHENTICATED` | Token yok, süresi dolmuş, geçersiz, kullanıcı pasif |
| 401 | `INVALID_CREDENTIALS` | Hatalı e-posta/parola (hangisinin yanlış olduğu söylenmez) |
| 403 | `FORBIDDEN` | Rol yetersiz (USER → Admin endpoint) |
| 404 | `NOT_FOUND` | Kayıt yok **veya** USER'ın görme yetkisi olmayan cihaz (varlık bilgisi sızdırılmaz) |
| 409 | `DUPLICATE_SERIAL_NUMBER`, `DUPLICATE_ASSET_CODE`, `DUPLICATE_EMAIL`, `DUPLICATE_DEPARTMENT` | Benzersizlik ihlali |
| 409 | `ASSET_ALREADY_ASSIGNED` | Aktif zimmetli cihaza yeni zimmet |
| 409 | `ASSET_NOT_AVAILABLE` | Cihaz `IN_STOCK` değil veya pasif |
| 409 | `USER_INACTIVE` | Pasif kullanıcıya zimmet |
| 409 | `ASSIGNMENT_ALREADY_RETURNED` | Zaten iade edilmiş zimmet |
| 409 | `HAS_ACTIVE_ASSIGNMENTS` | Zimmetli cihaz/kullanıcıyı silme, pasife alma, durum değiştirme |
| 409 | `HAS_HISTORY` | Geçmişi olan kaydı fiziksel silme (pasife alma önerilir) |
| 409 | `CANNOT_MODIFY_SELF` | Admin'in kendini silmesi / pasife alması / rolünü düşürmesi |
| 429 | `TOO_MANY_REQUESTS` | Login rate limit |
| 500 | `INTERNAL_ERROR` | Beklenmeyen hata (ayrıntı istemciye dönülmez) |

---

## 1. Sağlık kontrolü

| Metot | Yol | Yetki | Açıklama |
|-------|-----|-------|----------|
| GET | `/health` | Herkes | `200 {"status":"ok","db":"ok"}`; DB erişilemezse `503 {"status":"degraded","db":"down"}` |

## 2. Kimlik doğrulama — `/api/auth`

| Metot | Yol | Yetki | Gövde / Yanıt |
|-------|-----|-------|---------------|
| POST | `/api/auth/login` | Herkes (rate limited) | `{email, password}` → `200 {user, token, expiresIn}` + `httpOnly` cookie. Pasif kullanıcı → `401 INVALID_CREDENTIALS` |
| POST | `/api/auth/logout` | Auth | Cookie temizlenir → `204` |
| GET | `/api/auth/me` | Auth | `{id, ad_soyad, email, role, department}` |

`user` nesnesi hiçbir yanıtta `password_hash` veya `token_version` içermez.

## 3. Kullanıcılar — `/api/users` (tamamı **Admin**)

| Metot | Yol | Açıklama |
|-------|-----|----------|
| GET | `/api/users` | Liste. Filtre: `role`, `department_id`, `is_active`; `search` (ad, e-posta); `sort` ∈ `ad_soyad, email, created_at, role`. Her satırda `active_assignment_count` |
| GET | `/api/users/:id` | Detay + departman |
| POST | `/api/users` | `{ad_soyad, email, password, role, department_id?}` → `201` |
| PATCH | `/api/users/:id` | `{ad_soyad?, email?, role?, department_id?, is_active?}`. Pasife alma: aktif zimmeti varsa `409 HAS_ACTIVE_ASSIGNMENTS`; pasife alma ve rol değişikliği `token_version`'ı artırır (oturumlar düşer) |
| PATCH | `/api/users/:id/password` | `{password}` → `204`; `token_version++` |
| DELETE | `/api/users/:id` | Zimmet geçmişi yoksa fiziksel silme `204`; varsa `409 HAS_HISTORY` (arayüz "Pasife al" önerir) |

Doğrulama: `email` geçerli biçim; `password` ≥ 8 karakter, en az bir harf ve bir rakam; `role` ∈ `ADMIN|USER`.

## 4. Departmanlar — `/api/departments`

| Metot | Yol | Yetki | Açıklama |
|-------|-----|-------|----------|
| GET | `/api/departments` | Admin | Tüm departmanlar + `user_count` (sayfasız; küçük liste) |
| POST | `/api/departments` | Admin | `{name}` → `201` |
| PATCH | `/api/departments/:id` | Admin | `{name}` |
| DELETE | `/api/departments/:id` | Admin | Kullanıcısı varsa `409` |

## 5. Cihazlar (envanter) — `/api/assets`

| Metot | Yol | Yetki | Açıklama |
|-------|-----|-------|----------|
| GET | `/api/assets` | Admin | Liste (aşağıya bakınız) |
| GET | `/api/assets/:id` | Admin, Sahip | Detay + `current_assignment` (kişi, departman, tarih) |
| GET | `/api/assets/by-code/:code` | Admin, Sahip | QR okutma sonrası arama; yanıt `/:id` ile aynı |
| GET | `/api/assets/:id/qr` | Admin, Sahip | `?format=png` (varsayılan) veya `svg`; içerik `${APP_BASE_URL}/assets/code/{asset_code}` |
| GET | `/api/assets/:id/assignments` | Admin | Cihazın tüm zimmet geçmişi (yeni→eski) |
| GET | `/api/assets/:id/history` | Admin | Cihazın audit log kronolojisi |
| POST | `/api/assets` | Admin | `{category, brand, model, serial_number, purchase_date?, warranty_end_date?, notes?}` → `201`; `asset_code` sunucuda üretilir, istemciden gelirse yok sayılır; `status=IN_STOCK` |
| PATCH | `/api/assets/:id` | Admin | Düzenlenebilir: `category, brand, model, serial_number, purchase_date, warranty_end_date, notes, is_active`. `asset_code` ve `status` bu uçla değişmez. Zimmetli cihaz pasife alınamaz (`409`) |
| PATCH | `/api/assets/:id/status` | Admin | `{status: "DEFECTIVE" \| "IN_STOCK", note?}`. `ACTIVE` verilemez (`400`); zimmetli cihazda `409 HAS_ACTIVE_ASSIGNMENTS` |
| DELETE | `/api/assets/:id` | Admin | Zimmet geçmişi yoksa fiziksel silme; varsa `409 HAS_HISTORY` |

**Liste parametreleri (`GET /api/assets`):**

| Parametre | Değer | Davranış |
|-----------|-------|----------|
| `search` | metin | `asset_code`, `serial_number`, `brand`, `model` içinde `ILIKE` |
| `status` | `ACTIVE` \| `DEFECTIVE` \| `IN_STOCK` (virgülle çoklu) | Durum filtresi |
| `category` | metin | Kategori eşitliği |
| `department_id` | int | Aktif zimmet sahibinin departmanı |
| `user_id` | int | Aktif zimmet sahibi |
| `is_active` | `true` \| `false` \| `all` | Varsayılan `true` |
| `sort` | `asset_code, brand, model, category, status, purchase_date, warranty_end_date, created_at` | Varsayılan `created_at desc` |

Her satır: cihaz alanları + `assigned_user: {id, ad_soyad, department} | null`.

## 6. Zimmet — `/api/assignments`

| Metot | Yol | Yetki | Açıklama |
|-------|-----|-------|----------|
| POST | `/api/assignments` | Admin | `{asset_id, user_id, note?}` → `201`. Transaction: cihaz satırı `FOR UPDATE` kilitlenir → `IN_STOCK` ve aktif mi → kullanıcı aktif mi → insert → `status=ACTIVE` → audit `ASSIGN` |
| POST | `/api/assignments/:id/return` | Admin | `{return_note?, condition?: "IN_STOCK" \| "DEFECTIVE"}` (varsayılan `IN_STOCK`) → `200`. `returned_at=now()`, `returned_by`, cihaz durumu güncellenir, audit `RETURN` |
| GET | `/api/assignments` | Admin | Liste. Filtre: `active` (`true\|false`), `user_id`, `asset_id`, `department_id`, `from`, `to`; `search` (cihaz kodu, seri no, personel adı); `sort` ∈ `assigned_at, returned_at` |
| GET | `/api/me/assignments` | Auth | Giriş yapan kullanıcının zimmetleri. `?active=true` (varsayılan) / `false` / `all`; sayfalı |

Zimmet kayıtları için **güncelleme/silme ucu yoktur**; tek değişiklik iade işlemidir.

## 7. Dashboard — `/api/dashboard`

| Metot | Yol | Yetki | Yanıt |
|-------|-----|-------|-------|
| GET | `/api/dashboard/stats` | Admin | `{ total, active, defective, in_stock, inactive, users: {total, active} }` |

Tanımlar (PRD §7 veri tutarlılığı): her istekte canlı `COUNT` sorgusu, önbellek yok.
- `total` = `COUNT(*) WHERE is_active`
- `defective` / `in_stock` / `active` = aynı küme içinde `status` bazında `COUNT(*) FILTER (...)`
- `inactive` = pasife alınmış cihazlar (toplamın dışında)
- Garanti: `total = active + defective + in_stock`

## 8. Audit log — `/api/audit-logs`

| Metot | Yol | Yetki | Açıklama |
|-------|-----|-------|----------|
| GET | `/api/audit-logs` | Admin | Filtre: `entity_type`, `entity_id`, `user_id`, `action_type`, `from`, `to`; sayfalı; varsayılan `timestamp desc` |

Yalnızca okuma. POST/PATCH/DELETE yok; DB trigger'ı da değişikliği engeller.

**`action_type` sözlüğü:** `LOGIN`, `LOGIN_FAILED`, `USER_CREATE`, `USER_UPDATE`, `USER_PASSWORD_RESET`, `USER_DEACTIVATE`, `USER_ACTIVATE`, `USER_DELETE`, `DEPARTMENT_CREATE`, `DEPARTMENT_UPDATE`, `DEPARTMENT_DELETE`, `ASSET_CREATE`, `ASSET_UPDATE`, `ASSET_STATUS_CHANGE`, `ASSET_DEACTIVATE`, `ASSET_ACTIVATE`, `ASSET_DELETE`, `ASSIGN`, `RETURN`.
`details` alanı değişen alanların önceki/sonraki değerlerini ve ilgili adların anlık görüntüsünü içerir; parola veya hash **asla** yazılmaz.

## 9. Faz 2 (Aşama 7'de detaylandırılacak — yer tutucu)

| Metot | Yol | Yetki |
|-------|-----|-------|
| GET | `/api/alerts` (garanti yaklaşan, uzun süre depoda, tutarsız kayıt) | Admin |
| GET/POST | `/api/assets/:id/maintenance` | Admin |
| PATCH | `/api/maintenance/:id` | Admin |
| GET | `/api/reports/assets.csv`, `/api/reports/assignments.csv` | Admin |

## 10. PRD §7 kabul kriterleri ↔ API

| Kriter | Nasıl karşılanıyor |
|--------|--------------------|
| Yetki ihlali engeli | Tüm `/api/users`, `/api/departments`, `/api/dashboard`, `/api/audit-logs`, envanter yazma ve zimmet uçlarında `requireRole('ADMIN')` → `403` |
| Mükerrer kayıt | `UNIQUE(serial_number)`, `UNIQUE(asset_code)` → `409 DUPLICATE_*` |
| Çakışan zimmet | Servis kontrolü + `FOR UPDATE` kilit + partial unique index → `409 ASSET_ALREADY_ASSIGNED` |
| Veri tutarlılığı | `/api/dashboard/stats` canlı `COUNT` |
| Eksiksiz kurulum | Aşama 8: `docker compose up` migration + seed'i otomatik çalıştırır |

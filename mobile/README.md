# Zimmet Saha — mobil istemci (PRD §4.3, Faz 3)

Expo (React Native) ile yazılmış küçük bir saha uygulaması. Web sistemiyle aynı API'yi kullanır; ayrı bir backend yoktur.

| PRD isteri | Karşılığı |
|------------|-----------|
| Güvenli giriş | `POST /api/auth/login` + `issueToken: true` → JWT, `Authorization: Bearer` ile taşınır. Token cihazın güvenli deposunda (iOS Keychain / Android Keystore, `expo-secure-store`) saklanır; parola saklanmaz. Sunucu oturumu iptal ederse (parola değişikliği, pasife alma, rol değişikliği → `token_version`) ilk istekte `401` gelir ve uygulama girişe döner. |
| QR okuma | `expo-camera` ile etiketteki QR okunur; QR içindeki `…/assets/code/IT-2026-000042` adresinden kod çıkarılıp `GET /api/assets/by-code/:kod` çağrılır. Kamera izni yoksa kod elle girilebilir. |
| Hızlı işlemler | Yönetici için cihaz ekranında **Teslim et** (personel arama + not), **Geri kabul et** (sağlam/arızalı), **Arıza bildir** (bakım kaydı). |
| Kişisel zimmet ekranı | **Zimmetlerim** sekmesi: `GET /api/me/assignments`. |

Yetki backend'de kontrol edilir; uygulama yalnızca görünürlüğü yönetir. Personel başkasının cihazını okuttuğunda API `404` döner ve uygulama "bulunamadı veya görme yetkiniz yok" der (cihazın varlığı sızdırılmaz). Hızlı işlemler mevcut yetki modeline uygun olarak yalnızca yöneticide görünür.

## Çalıştırma

Gerekenler: Node.js 22+, telefonda **Expo Go** uygulaması (App Store / Google Play), çalışan web sistemi (`docker compose up -d`).

```bash
cd mobile
npm install
npx expo install --fix      # paket sürümlerini kurulu Expo SDK'sına göre hizalar
npx expo start
```

Terminalde çıkan QR kodu telefonla okutun (Android: Expo Go içinden, iOS: kamera uygulamasıyla).

> Expo Go "Project is incompatible with this version of Expo Go" derse projeyi telefondaki Expo Go'nun SDK sürümüne yükseltin:
> `npx expo install expo@latest && npx expo install --fix`

**Giriş ekranındaki sunucu adresi:** Bilgisayarınızın yerel ağ IP'si ve web portu, örneğin `http://192.168.1.20:8080`.
`localhost` yazmayın; telefonda `localhost` telefonun kendisidir. IP'yi bulmak için Windows'ta `ipconfig`, macOS/Linux'ta `ipconfig getifaddr en0` / `hostname -I`.
Telefon ve bilgisayar aynı Wi-Fi ağında olmalı; bağlanamıyorsa bilgisayarın güvenlik duvarında 8080 portuna izin verin.

QR kodların telefonda doğru açılması için `.env` içindeki `APP_BASE_URL` değerini de aynı adres yapmanız önerilir (etiket basılmadan önce). Uygulama yalnızca adresteki `/assets/code/<kod>` kısmını kullandığı için `localhost` ile basılmış etiketler de okunur.

## Testler

```bash
cd mobile && npm test      # QR kodu çözme, sunucu adresi, Bearer başlığı, 401'de çıkış (cihaz gerekmez)
```

## Yapı

```
mobile/
├── App.js                   gezinme: giriş → Zimmetlerim / QR okut → cihaz detayı
├── src/api.js               fetch + Bearer token, hata kodları
├── src/session.js           SecureStore'da oturum
├── src/qr.js                saf yardımcılar (QR → cihaz kodu, adres normalleştirme)
├── src/ui.js                ortak bileşenler ve stiller
└── src/screens/             LoginScreen, MyAssetsScreen, ScanScreen, AssetScreen
```

Bilinçli sadelik: navigasyon kütüphanesi yok (web istemcisindeki küçük router gibi), TypeScript yok. Üretim dağıtımı (EAS Build, HTTPS zorunluluğu, sertifika sabitleme) bu teslimatın kapsamı dışında.

/**
 * Test ortamı. Bu dosya her test dosyasında İLK import olmalıdır; config modülü
 * yüklenmeden önce ortam değişkenlerini ayarlar.
 *
 * Gerekli: TEST_DATABASE_URL — adı "_test" ile biten, silinmesinde sakınca olmayan bir veritabanı.
 *   örn. postgres://zimmet:parola@localhost:5432/zimmet_test
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-'.padEnd(48, 'x');
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';
process.env.APP_BASE_URL = 'http://zimmet.test';
process.env.SEED_ADMIN_EMAIL = 'admin@test.local';
process.env.SEED_ADMIN_PASSWORD = 'Admin12345';
process.env.SEED_ADMIN_NAME = 'Test Yönetici';
process.env.SEED_DEMO_DATA = 'false';
process.env.LOGIN_RATE_LIMIT_MAX = '5';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL tanımlı değil (bkz. README › Testler).');
}
const dbName = new URL(process.env.TEST_DATABASE_URL).pathname.slice(1);
if (!dbName.endsWith('_test')) {
  throw new Error(`Güvenlik: test veritabanı adı "_test" ile bitmeli (şu an: ${dbName}). Testler veritabanını siler.`);
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

import 'dotenv/config';
import crypto from 'node:crypto';

/**
 * Tüm ortam değişkenleri tek yerden okunur ve doğrulanır.
 * Eksik/zayıf gizli anahtar varsa uygulama hiç başlamaz (fail fast).
 */

const env = process.env;

function buildDatabaseUrl() {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const user = env.POSTGRES_USER || 'zimmet';
  const password = encodeURIComponent(env.POSTGRES_PASSWORD || '');
  const host = env.POSTGRES_HOST || 'localhost';
  const port = env.POSTGRES_PORT || '5432';
  const db = env.POSTGRES_DB || 'zimmet';
  return `postgres://${user}:${password}@${host}:${port}/${db}`;
}

const nodeEnv = env.NODE_ENV || 'development';

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(env.PORT || 3000),
  databaseUrl: buildDatabaseUrl(),
  jwt: {
    secret: env.JWT_SECRET || '',
    expiresIn: env.JWT_EXPIRES_IN || '8h',
  },
  cookieName: 'zimmet_token',
  // Cookie'yi yalnızca HTTPS üzerinden göndermek için COOKIE_SECURE=true yapın.
  cookieSecure: env.COOKIE_SECURE === 'true',
  appBaseUrl: (env.APP_BASE_URL || 'http://localhost:8080').replace(/\/+$/, ''),
  bcryptRounds: Number(env.BCRYPT_ROUNDS || 12),
  loginRateLimit: {
    windowMs: 15 * 60 * 1000,
    max: Number(env.LOGIN_RATE_LIMIT_MAX || 10),
  },
};

export function assertSecurityConfig() {
  // JWT_SECRET hiç verilmemişse sabit bir varsayılan yerine rastgele anahtar üretilir:
  // sistem sıfır kurulumda da güvenli çalışır; tek bedeli, API yeniden başlayınca oturumların düşmesidir.
  if (!config.jwt.secret) {
    config.jwt.secret = crypto.randomBytes(48).toString('hex');
    console.warn('[config] JWT_SECRET tanımlı değil; bu çalıştırma için rastgele bir anahtar üretildi. '
      + 'Yeniden başlatmada oturumlar kapanır. Kalıcı bir anahtar için .env dosyasında JWT_SECRET tanımlayın.');
  }
  if (config.jwt.secret.length < 32) {
    throw new Error(
      'JWT_SECRET 32 karakterden kısa. Daha uzun bir değer kullanın (bkz. .env.example).',
    );
  }
  if (!/^\d+\s*[smhd]?$/i.test(String(config.jwt.expiresIn).trim())) {
    throw new Error('JWT_EXPIRES_IN geçersiz. Örnek değerler: 30m, 8h, 1d');
  }
}

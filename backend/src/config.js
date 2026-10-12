import 'dotenv/config';

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
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    throw new Error(
      'JWT_SECRET tanımlı değil veya 32 karakterden kısa. .env dosyasını kontrol edin (bkz. .env.example).',
    );
  }
}
